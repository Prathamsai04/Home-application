import {
  NOTIFICATION_SEVERITY,
  PAYMENT_METHODS,
  RESERVATION_STATUS,
  TRANSACTION_TYPES,
  formatMoney,
  paymentCreateSchema,
  paymentQuerySchema,
  paymentUpdateSchema,
  refundCreateSchema,
  toMinorUnits,
} from '@homestay/shared';
import { BusinessRuleError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { guestFullName, indexById } from './helpers.js';
import { computePaymentSummary } from './paymentMath.js';

/**
 * Payment ledger. Transactions are append-only (payments and refunds); the
 * reservation payment status is derived from them and never edited manually.
 * Only the last four card digits may be stored - never full card numbers, CVV
 * or bank credentials.
 */
export class PaymentService {
  constructor({ repositories, clock, activity }) {
    this.repositories = repositories;
    this.payments = repositories.payments;
    this.clock = clock;
    this.activity = activity;
  }

  #currency() {
    return this.repositories.settings.get()?.currency ?? 'INR';
  }

  #enrich(transaction, lookups) {
    const reservation = lookups.reservations.get(transaction.reservationId);
    const guest = reservation ? lookups.guests.get(reservation.guestId) : null;
    return {
      ...transaction,
      reservationCode: reservation?.code ?? '—',
      guestName: guestFullName(guest),
      propertyName: lookups.properties.get(transaction.propertyId)?.name ?? '—',
      receivedDate: this.clock.dateOf(transaction.receivedAt),
      recordedByName: lookups.users.get(transaction.recordedBy)?.name ?? 'System',
    };
  }

  #lookups() {
    return {
      reservations: indexById(this.repositories.reservations.getAll()),
      guests: indexById(this.repositories.guests.getAll()),
      properties: indexById(this.repositories.properties.getAll()),
      users: indexById(this.repositories.users.getAll()),
    };
  }

  list(query) {
    const q = validate(paymentQuerySchema, query);
    const lookups = this.#lookups();
    const items = this.payments.getAll().map((t) => this.#enrich(t, lookups));
    const result = applyQuery(items, {
      ...q,
      searchFields: ['reference', 'reservationCode', 'guestName', 'notes', 'propertyName'],
      filters: {
        reservationId: q.reservationId,
        method: q.method,
        type: q.type,
        propertyId: q.propertyId,
        window:
          q.from || q.to
            ? (t) => (!q.from || t.receivedDate >= q.from) && (!q.to || t.receivedDate <= q.to)
            : undefined,
      },
      sortFields: {
        receivedAt: 'receivedAt',
        amount: 'amountMinor',
        method: 'method',
        type: 'type',
        reservationCode: 'reservationCode',
        guestName: 'guestName',
      },
      defaultSort: { field: 'receivedAt', order: 'desc' },
    });
    const sum = (type) =>
      result.filtered.filter((t) => t.type === type).reduce((total, t) => total + t.amountMinor, 0);
    const paymentsMinor = sum(TRANSACTION_TYPES.PAYMENT);
    const refundsMinor = sum(TRANSACTION_TYPES.REFUND);
    return { ...result, totals: { paymentsMinor, refundsMinor, netMinor: paymentsMinor - refundsMinor } };
  }

  get(id) {
    const transaction = this.payments.getById(id);
    if (!transaction) throw new NotFoundError('Payment');
    return this.#enrich(transaction, this.#lookups());
  }

  summary(reservationId) {
    const reservation = this.repositories.reservations.getById(reservationId);
    if (!reservation) throw new NotFoundError('Reservation');
    const transactions = this.payments.findByReservation(reservationId);
    return { reservationId, code: reservation.code, ...computePaymentSummary(reservation, transactions) };
  }

  #loadReservation(reservationId) {
    const reservation = this.repositories.reservations.getById(reservationId);
    if (!reservation) throw new BusinessRuleError('Reservation not found', 'reservationId');
    return reservation;
  }

  recordPayment(payload, actor) {
    const input = validate(paymentCreateSchema, payload);
    const reservation = this.#loadReservation(input.reservationId);
    if ([RESERVATION_STATUS.CANCELLED, RESERVATION_STATUS.NO_SHOW].includes(reservation.status)) {
      throw new BusinessRuleError('Payments cannot be recorded for cancelled or no-show reservations');
    }
    const amountMinor = toMinorUnits(input.amount);
    const before = computePaymentSummary(reservation, this.payments.findByReservation(reservation.id));
    if (amountMinor > before.balanceMinor) {
      throw new BusinessRuleError(
        `Amount exceeds the outstanding balance of ${formatMoney(before.balanceMinor, this.#currency())}`,
        'amount',
      );
    }
    const now = this.clock.nowIso();
    const payment = this.payments.create({
      id: generateId('pay'),
      reservationId: reservation.id,
      propertyId: reservation.propertyId,
      type: TRANSACTION_TYPES.PAYMENT,
      amountMinor,
      method: input.method,
      reference: input.reference ?? '',
      cardLast4: input.method === PAYMENT_METHODS.CARD ? (input.cardLast4 ?? null) : null,
      notes: input.notes ?? '',
      receivedAt: now,
      recordedBy: actor?.id ?? null,
      createdAt: now,
    });
    const message = `Payment received: ${formatMoney(amountMinor, this.#currency())} for ${reservation.code}`;
    this.activity.log({ action: 'payment.received', entityType: 'payment', entityId: payment.id, message, actor });
    if (this.repositories.settings.get()?.notifyOnPayment) {
      this.activity.notify({
        type: 'payment',
        title: 'Payment received',
        message,
        severity: NOTIFICATION_SEVERITY.SUCCESS,
        roles: ['owner', 'manager'],
        link: `/reservations/${reservation.id}`,
      });
    }
    return { payment: this.get(payment.id), summary: this.summary(reservation.id) };
  }

  recordRefund(payload, actor) {
    const input = validate(refundCreateSchema, payload);
    const reservation = this.#loadReservation(input.reservationId);
    const amountMinor = toMinorUnits(input.amount);
    const before = computePaymentSummary(reservation, this.payments.findByReservation(reservation.id));
    if (before.refundableMinor === 0) {
      throw new BusinessRuleError('There are no payments available to refund for this reservation');
    }
    if (amountMinor > before.refundableMinor) {
      throw new BusinessRuleError(
        `Refund cannot exceed the net amount paid (${formatMoney(before.refundableMinor, this.#currency())})`,
        'amount',
      );
    }
    const now = this.clock.nowIso();
    const refund = this.payments.create({
      id: generateId('pay'),
      reservationId: reservation.id,
      propertyId: reservation.propertyId,
      type: TRANSACTION_TYPES.REFUND,
      amountMinor,
      method: input.method,
      reference: input.reference ?? '',
      cardLast4: null,
      notes: input.reason,
      receivedAt: now,
      recordedBy: actor?.id ?? null,
      createdAt: now,
    });
    const message = `Refund issued: ${formatMoney(amountMinor, this.#currency())} for ${reservation.code}`;
    this.activity.log({ action: 'payment.refunded', entityType: 'payment', entityId: refund.id, message, actor });
    this.activity.notify({
      type: 'payment',
      title: 'Refund issued',
      message,
      severity: NOTIFICATION_SEVERITY.WARNING,
      roles: ['owner', 'manager'],
      link: `/reservations/${reservation.id}`,
    });
    return { payment: this.get(refund.id), summary: this.summary(reservation.id) };
  }

  update(id, payload, actor) {
    const existing = this.payments.getById(id);
    if (!existing) throw new NotFoundError('Payment');
    const input = validate(paymentUpdateSchema, payload);
    const patch = {};
    if (input.reference !== undefined) patch.reference = input.reference;
    if (input.notes !== undefined) patch.notes = input.notes;
    this.payments.update(id, patch);
    this.activity.log({
      action: 'payment.updated',
      entityType: 'payment',
      entityId: id,
      message: `Payment ${id} details updated`,
      actor,
    });
    return this.get(id);
  }
}
