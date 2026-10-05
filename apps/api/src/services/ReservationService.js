import {
  HOUSEKEEPING_STATUS,
  NOTIFICATION_SEVERITY,
  RESERVATION_STATUS,
  diffDays,
  formatMoney,
  multiplyMinor,
  reservationCancelSchema,
  reservationCreateSchema,
  reservationQuerySchema,
  reservationUpdateSchema,
  toMinorUnits,
} from '@homestay/shared';
import { BusinessRuleError, NotFoundError, ValidationError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { guestFullName, indexById } from './helpers.js';
import { computePaymentSummary, groupTransactions } from './paymentMath.js';

const { PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW } = RESERVATION_STATUS;
const IN_HOUSE_EDITABLE_FIELDS = ['checkOut', 'notes', 'specialRequests', 'adults', 'children'];

export class ReservationService {
  constructor({ repositories, clock, activity, availability }) {
    this.repositories = repositories;
    this.reservations = repositories.reservations;
    this.clock = clock;
    this.activity = activity;
    this.availability = availability;
  }

  #lookups() {
    return {
      guests: indexById(this.repositories.guests.getAll()),
      rooms: indexById(this.repositories.rooms.getAll()),
      properties: indexById(this.repositories.properties.getAll()),
      transactions: groupTransactions(this.repositories.payments.getAll()),
    };
  }

  #enrich(reservation, lookups) {
    const guest = lookups.guests.get(reservation.guestId);
    const room = lookups.rooms.get(reservation.roomId);
    return {
      ...reservation,
      guestName: guestFullName(guest),
      guestEmail: guest?.email ?? '',
      roomNumber: room?.number ?? '—',
      roomName: room?.name ?? 'Deleted room',
      propertyName: lookups.properties.get(reservation.propertyId)?.name ?? 'Unknown property',
      payment: computePaymentSummary(reservation, lookups.transactions.get(reservation.id) ?? []),
    };
  }

  #currency() {
    return this.repositories.settings.get()?.currency ?? 'INR';
  }

  list(query) {
    const q = validate(reservationQuerySchema, query);
    const lookups = this.#lookups();
    const items = this.reservations.getAll().map((r) => this.#enrich(r, lookups));
    return applyQuery(items, {
      ...q,
      searchFields: ['code', 'guestName', 'guestEmail', 'roomNumber', 'propertyName'],
      filters: {
        status: q.status,
        propertyId: q.propertyId,
        roomId: q.roomId,
        guestId: q.guestId,
        source: q.source,
        window:
          q.from || q.to
            ? (r) => (!q.to || r.checkIn <= q.to) && (!q.from || r.checkOut > q.from)
            : undefined,
      },
      sortFields: {
        code: 'code',
        checkIn: 'checkIn',
        checkOut: 'checkOut',
        guestName: 'guestName',
        status: 'status',
        totalAmount: 'totalAmountMinor',
        createdAt: 'createdAt',
        propertyName: 'propertyName',
      },
      defaultSort: { field: 'checkIn', order: 'desc' },
    });
  }

  get(id) {
    const reservation = this.reservations.getById(id);
    if (!reservation) throw new NotFoundError('Reservation');
    const lookups = this.#lookups();
    const transactions = (lookups.transactions.get(id) ?? []).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return {
      ...this.#enrich(reservation, lookups),
      guest: lookups.guests.get(reservation.guestId) ?? null,
      room: lookups.rooms.get(reservation.roomId) ?? null,
      property: lookups.properties.get(reservation.propertyId) ?? null,
      transactions,
      allowedActions: this.allowedActions(reservation),
    };
  }

  allowedActions(reservation) {
    const today = this.clock.today();
    const actions = [];
    if ([PENDING, CONFIRMED, CHECKED_IN].includes(reservation.status)) actions.push('edit');
    if (reservation.status === PENDING) actions.push('confirm');
    if (reservation.status === CONFIRMED && reservation.checkIn <= today && today < reservation.checkOut) {
      actions.push('check_in');
    }
    if (reservation.status === CHECKED_IN) actions.push('check_out');
    if ([PENDING, CONFIRMED].includes(reservation.status)) actions.push('cancel');
    if ([PENDING, CONFIRMED].includes(reservation.status) && reservation.checkIn <= today) actions.push('no_show');
    return actions;
  }

  #loadRoomContext(roomId) {
    const room = this.repositories.rooms.getById(roomId);
    if (!room) throw new BusinessRuleError('Selected room does not exist', 'roomId');
    const property = this.repositories.properties.getById(room.propertyId);
    return { room, property };
  }

  #assertGuest(guestId) {
    if (!this.repositories.guests.getById(guestId)) {
      throw new BusinessRuleError('Selected guest does not exist', 'guestId');
    }
  }

  #assertCapacity(room, adults, children) {
    if (adults + children > room.capacity) {
      throw new BusinessRuleError(`Room ${room.number} accommodates at most ${room.capacity} guest(s)`, 'adults');
    }
  }

  #nextCode() {
    const max = this.reservations
      .getAll()
      .map((r) => Number.parseInt(String(r.code).replace(/\D/g, ''), 10))
      .filter(Number.isFinite)
      .reduce((a, b) => Math.max(a, b), 1000);
    return `HS-${max + 1}`;
  }

  create(payload, actor) {
    const input = validate(reservationCreateSchema, payload);
    const today = this.clock.today();
    if (input.checkIn < today) {
      throw new BusinessRuleError('Check-in date cannot be in the past', 'checkIn');
    }
    const { room, property } = this.#loadRoomContext(input.roomId);
    this.#assertGuest(input.guestId);
    const children = input.children ?? 0;
    this.#assertCapacity(room, input.adults, children);
    this.availability.assertRoomBookable({ room, property, checkIn: input.checkIn, checkOut: input.checkOut });

    const nights = diffDays(input.checkIn, input.checkOut);
    const nightlyRateMinor = input.nightlyRate ? toMinorUnits(input.nightlyRate) : room.baseRateMinor;
    const now = this.clock.nowIso();
    const reservation = this.reservations.create({
      id: generateId('res'),
      code: this.#nextCode(),
      propertyId: room.propertyId,
      roomId: room.id,
      guestId: input.guestId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      adults: input.adults,
      children,
      status: input.status ?? CONFIRMED,
      source: input.source ?? 'direct',
      nightlyRateMinor,
      totalAmountMinor: multiplyMinor(nightlyRateMinor, nights),
      notes: input.notes ?? '',
      specialRequests: input.specialRequests ?? '',
      createdAt: now,
      updatedAt: now,
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      cancellationReason: '',
      createdBy: actor?.id ?? null,
    });

    const guest = this.repositories.guests.getById(input.guestId);
    this.activity.log({
      action: 'reservation.created',
      entityType: 'reservation',
      entityId: reservation.id,
      message: `Reservation ${reservation.code} created for ${guestFullName(guest)}`,
      actor,
    });
    if (this.repositories.settings.get()?.notifyOnNewReservation) {
      this.activity.notify({
        type: 'reservation',
        title: 'New reservation',
        message: `${reservation.code}: ${guestFullName(guest)} · Room ${room.number}, ${reservation.checkIn} → ${reservation.checkOut} (${formatMoney(reservation.totalAmountMinor, this.#currency())})`,
        severity: NOTIFICATION_SEVERITY.SUCCESS,
        link: `/reservations/${reservation.id}`,
      });
    }
    return this.get(reservation.id);
  }

  update(id, payload, actor) {
    const existing = this.reservations.getById(id);
    if (!existing) throw new NotFoundError('Reservation');
    if (![PENDING, CONFIRMED, CHECKED_IN].includes(existing.status)) {
      throw new BusinessRuleError('Only pending, confirmed or in-house reservations can be modified');
    }
    const input = validate(reservationUpdateSchema, payload);
    const today = this.clock.today();

    if (existing.status === CHECKED_IN) {
      const locked = Object.keys(input).filter(
        (key) => !IN_HOUSE_EDITABLE_FIELDS.includes(key) && input[key] !== undefined && input[key] !== existing[key],
      );
      if (locked.length) {
        throw new BusinessRuleError(`After check-in only the check-out date, guests and notes can change (${locked.join(', ')})`);
      }
    }

    const next = {
      roomId: input.roomId ?? existing.roomId,
      guestId: input.guestId ?? existing.guestId,
      checkIn: input.checkIn ?? existing.checkIn,
      checkOut: input.checkOut ?? existing.checkOut,
      adults: input.adults ?? existing.adults,
      children: input.children ?? existing.children,
    };
    if (next.checkOut <= next.checkIn) {
      throw new ValidationError([{ code: 'INVALID_FIELD', field: 'checkOut', message: 'Check-out must be after check-in' }]);
    }
    if (existing.status !== CHECKED_IN && input.checkIn && input.checkIn !== existing.checkIn && input.checkIn < today) {
      throw new BusinessRuleError('Check-in date cannot be moved into the past', 'checkIn');
    }
    if (existing.status === CHECKED_IN && next.checkOut < today) {
      throw new BusinessRuleError('Check-out date cannot be in the past for an in-house guest', 'checkOut');
    }
    if (next.guestId !== existing.guestId) this.#assertGuest(next.guestId);

    const { room, property } = this.#loadRoomContext(next.roomId);
    this.#assertCapacity(room, next.adults, next.children);

    const roomChanged = next.roomId !== existing.roomId;
    const datesChanged = next.checkIn !== existing.checkIn || next.checkOut !== existing.checkOut;
    if (roomChanged || datesChanged) {
      this.availability.assertRoomBookable({
        room,
        property: roomChanged ? property : null,
        checkIn: next.checkIn,
        checkOut: next.checkOut,
        excludeReservationId: id,
        checkMaintenance: roomChanged,
      });
    }

    let nightlyRateMinor = existing.nightlyRateMinor;
    if (input.nightlyRate) nightlyRateMinor = toMinorUnits(input.nightlyRate);
    else if (roomChanged) nightlyRateMinor = room.baseRateMinor;
    const nights = diffDays(next.checkIn, next.checkOut);

    this.reservations.update(id, {
      ...next,
      propertyId: room.propertyId,
      source: input.source ?? existing.source,
      notes: input.notes ?? existing.notes,
      specialRequests: input.specialRequests ?? existing.specialRequests,
      nights,
      nightlyRateMinor,
      totalAmountMinor: multiplyMinor(nightlyRateMinor, nights),
      updatedAt: this.clock.nowIso(),
    });
    this.activity.log({
      action: 'reservation.updated',
      entityType: 'reservation',
      entityId: id,
      message: `Reservation ${existing.code} updated`,
      actor,
    });
    return this.get(id);
  }

  #transition(id, allowedFrom, errorMessage) {
    const reservation = this.reservations.getById(id);
    if (!reservation) throw new NotFoundError('Reservation');
    if (!allowedFrom.includes(reservation.status)) throw new BusinessRuleError(errorMessage);
    return reservation;
  }

  confirm(id, actor) {
    const reservation = this.#transition(id, [PENDING], 'Only pending reservations can be confirmed');
    this.reservations.update(id, { status: CONFIRMED, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'reservation.confirmed',
      entityType: 'reservation',
      entityId: id,
      message: `Reservation ${reservation.code} confirmed`,
      actor,
    });
    return this.get(id);
  }

  cancel(id, payload, actor) {
    const { reason } = validate(reservationCancelSchema, payload);
    const reservation = this.#transition(id, [PENDING, CONFIRMED], 'Only pending or confirmed reservations can be cancelled');
    const now = this.clock.nowIso();
    this.reservations.update(id, {
      status: CANCELLED,
      cancelledAt: now,
      cancellationReason: reason ?? '',
      updatedAt: now,
    });
    this.activity.log({
      action: 'reservation.cancelled',
      entityType: 'reservation',
      entityId: id,
      message: `Reservation ${reservation.code} cancelled${reason ? `: ${reason}` : ''}`,
      actor,
    });
    return this.get(id);
  }

  checkIn(id, actor) {
    const reservation = this.#transition(id, [CONFIRMED], 'Only confirmed reservations can be checked in');
    const today = this.clock.today();
    if (today < reservation.checkIn) {
      throw new BusinessRuleError(`Check-in opens on the arrival date (${reservation.checkIn})`);
    }
    if (today >= reservation.checkOut) {
      throw new BusinessRuleError('The stay period has ended. Mark the reservation as a no-show instead.');
    }
    const occupant = this.reservations.findOne(
      (r) => r.roomId === reservation.roomId && r.status === CHECKED_IN && r.id !== id,
    );
    if (occupant) {
      throw new BusinessRuleError(`Room is still occupied by reservation ${occupant.code}. Check that guest out first.`);
    }
    const maintenance = this.availability.findBlockingMaintenance(reservation.roomId);
    if (maintenance) {
      throw new BusinessRuleError(`Room is under maintenance (${maintenance.title}). Move the reservation to another room.`);
    }
    const now = this.clock.nowIso();
    this.reservations.update(id, { status: CHECKED_IN, checkedInAt: now, updatedAt: now });
    const guest = this.repositories.guests.getById(reservation.guestId);
    this.activity.log({
      action: 'reservation.checked_in',
      entityType: 'reservation',
      entityId: id,
      message: `${guestFullName(guest)} checked in (${reservation.code})`,
      actor,
    });
    return this.get(id);
  }

  checkOut(id, actor) {
    const reservation = this.#transition(id, [CHECKED_IN], 'Only checked-in reservations can be checked out');
    const now = this.clock.nowIso();
    const today = this.clock.today();
    this.reservations.update(id, { status: CHECKED_OUT, checkedOutAt: now, updatedAt: now });
    const guest = this.repositories.guests.getById(reservation.guestId);
    this.activity.log({
      action: 'reservation.checked_out',
      entityType: 'reservation',
      entityId: id,
      message: `${guestFullName(guest)} checked out (${reservation.code})`,
      actor,
    });

    if (this.repositories.settings.get()?.autoCreateCheckoutTask) {
      this.repositories.housekeeping.create({
        id: generateId('hk'),
        propertyId: reservation.propertyId,
        roomId: reservation.roomId,
        reservationId: id,
        type: 'checkout_clean',
        priority: 'high',
        status: HOUSEKEEPING_STATUS.PENDING,
        dueDate: today,
        assignedTo: null,
        notes: `Auto-created after checkout of ${reservation.code}`,
        startedAt: null,
        completedAt: null,
        createdBy: actor?.id ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const summary = computePaymentSummary(reservation, this.repositories.payments.findByReservation(id));
    if (summary.balanceMinor > 0) {
      this.activity.notify({
        type: 'payment',
        title: 'Checked out with balance due',
        message: `${reservation.code} has an outstanding balance of ${formatMoney(summary.balanceMinor, this.#currency())}`,
        severity: NOTIFICATION_SEVERITY.WARNING,
        roles: ['owner', 'manager'],
        link: `/reservations/${id}`,
      });
    }
    return this.get(id);
  }

  markNoShow(id, actor) {
    const reservation = this.#transition(id, [PENDING, CONFIRMED], 'Only pending or confirmed reservations can be marked as no-show');
    if (this.clock.today() < reservation.checkIn) {
      throw new BusinessRuleError('A reservation can only be marked as no-show on or after the arrival date');
    }
    this.reservations.update(id, { status: NO_SHOW, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'reservation.no_show',
      entityType: 'reservation',
      entityId: id,
      message: `Reservation ${reservation.code} marked as no-show`,
      actor,
    });
    return this.get(id);
  }
}
