import {
  BLOCKING_RESERVATION_STATUSES,
  RESERVATION_STATUS,
  guestCreateSchema,
  guestQuerySchema,
  guestUpdateSchema,
  sumMinor,
} from '@homestay/shared';
import { ConflictError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { guestFullName, indexById } from './helpers.js';
import { computePaymentSummary } from './paymentMath.js';

export class GuestService {
  constructor({ repositories, clock, activity }) {
    this.repositories = repositories;
    this.guests = repositories.guests;
    this.clock = clock;
    this.activity = activity;
  }

  list(query) {
    const q = validate(guestQuerySchema, query);
    const reservations = this.repositories.reservations.getAll();
    const stats = new Map();
    for (const reservation of reservations) {
      const current = stats.get(reservation.guestId) ?? { count: 0, lastStay: null };
      current.count += 1;
      if (reservation.status === RESERVATION_STATUS.CHECKED_OUT && (!current.lastStay || reservation.checkOut > current.lastStay)) {
        current.lastStay = reservation.checkOut;
      }
      stats.set(reservation.guestId, current);
    }
    const items = this.guests.getAll().map((guest) => ({
      ...guest,
      fullName: guestFullName(guest),
      reservationCount: stats.get(guest.id)?.count ?? 0,
      lastStay: stats.get(guest.id)?.lastStay ?? null,
    }));
    return applyQuery(items, {
      ...q,
      searchFields: ['fullName', 'email', 'phone', 'city', 'nationality'],
      filters: {
        vip: q.vip,
        nationality: q.nationality ? (g) => g.nationality.toLowerCase() === q.nationality.toLowerCase() : undefined,
      },
      sortFields: {
        name: 'fullName',
        email: 'email',
        nationality: 'nationality',
        reservationCount: 'reservationCount',
        lastStay: 'lastStay',
        createdAt: 'createdAt',
      },
      defaultSort: { field: 'name', order: 'asc' },
    });
  }

  get(id) {
    const guest = this.guests.getById(id);
    if (!guest) throw new NotFoundError('Guest');
    const rooms = indexById(this.repositories.rooms.getAll());
    const properties = indexById(this.repositories.properties.getAll());
    const transactions = this.repositories.payments.getAll();
    const reservations = this.repositories.reservations
      .findByGuest(id)
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
      .map((reservation) => ({
        ...reservation,
        roomNumber: rooms.get(reservation.roomId)?.number ?? '—',
        propertyName: properties.get(reservation.propertyId)?.name ?? '—',
        payment: computePaymentSummary(reservation, transactions),
      }));
    return {
      ...guest,
      fullName: guestFullName(guest),
      reservations,
      lifetimeValueMinor: sumMinor(reservations.map((r) => r.payment.netPaidMinor)),
    };
  }

  create(payload, actor) {
    const input = validate(guestCreateSchema, payload);
    if (this.guests.findByEmail(input.email)) {
      throw new ConflictError('A guest with this email already exists', 'email');
    }
    const now = this.clock.nowIso();
    const guest = this.guests.create({
      id: generateId('guest'),
      vip: false,
      idNumberLast4: '',
      city: '',
      notes: '',
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'guest.created',
      entityType: 'guest',
      entityId: guest.id,
      message: `Guest ${guestFullName(guest)} added`,
      actor,
    });
    return guest;
  }

  update(id, payload, actor) {
    const existing = this.guests.getById(id);
    if (!existing) throw new NotFoundError('Guest');
    const input = validate(guestUpdateSchema, payload);
    if (input.email && input.email !== existing.email && this.guests.findByEmail(input.email)) {
      throw new ConflictError('A guest with this email already exists', 'email');
    }
    const guest = this.guests.update(id, { ...input, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'guest.updated',
      entityType: 'guest',
      entityId: id,
      message: `Guest ${guestFullName(guest)} updated`,
      actor,
    });
    return guest;
  }

  delete(id, actor) {
    const existing = this.guests.getById(id);
    if (!existing) throw new NotFoundError('Guest');
    const active = this.repositories.reservations
      .findByGuest(id)
      .filter((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status));
    if (active.length) {
      throw new ConflictError('Guests with active or upcoming reservations cannot be deleted');
    }
    this.guests.delete(id);
    this.activity.log({
      action: 'guest.deleted',
      entityType: 'guest',
      entityId: id,
      message: `Guest ${guestFullName(existing)} deleted`,
      actor,
    });
    return { id };
  }
}
