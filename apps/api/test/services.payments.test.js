import { beforeEach, describe, expect, it } from 'vitest';
import { computePaymentSummary } from '../src/services/paymentMath.js';
import { OWNER, buildContainer, createBooking } from './helpers/context.js';

describe('computePaymentSummary', () => {
  const reservation = { id: 'r1', status: 'confirmed', totalAmountMinor: 1000000 };
  const tx = (type, amountMinor) => ({ reservationId: 'r1', type, amountMinor });

  it('derives unpaid, partially paid and paid', () => {
    expect(computePaymentSummary(reservation, []).status).toBe('unpaid');
    const partial = computePaymentSummary(reservation, [tx('payment', 250000)]);
    expect(partial).toMatchObject({ status: 'partially_paid', balanceMinor: 750000, netPaidMinor: 250000 });
    const paid = computePaymentSummary(reservation, [tx('payment', 250000), tx('payment', 750000)]);
    expect(paid).toMatchObject({ status: 'paid', balanceMinor: 0 });
  });

  it('derives refunded when everything paid has been returned', () => {
    const summary = computePaymentSummary({ ...reservation, status: 'cancelled' }, [tx('payment', 300000), tx('refund', 300000)]);
    expect(summary).toMatchObject({ status: 'refunded', netPaidMinor: 0, balanceMinor: 0, refundableMinor: 0 });
  });

  it('treats partial refunds as partially paid for open reservations', () => {
    const summary = computePaymentSummary(reservation, [tx('payment', 1000000), tx('refund', 100000)]);
    expect(summary).toMatchObject({ status: 'partially_paid', balanceMinor: 100000, refundableMinor: 900000 });
  });

  it('owes nothing further on cancelled reservations with a retained deposit', () => {
    const summary = computePaymentSummary({ ...reservation, status: 'cancelled' }, [tx('payment', 200000)]);
    expect(summary).toMatchObject({ status: 'paid', balanceMinor: 0 });
  });

  it('uses exact integer arithmetic', () => {
    const summary = computePaymentSummary({ ...reservation, totalAmountMinor: 30 }, [tx('payment', 10), tx('payment', 20)]);
    expect(summary.status).toBe('paid');
    expect(summary.netPaidMinor).toBe(30);
  });
});

describe('PaymentService', () => {
  let container;
  let services;
  let reservation;

  beforeEach(() => {
    container = buildContainer();
    services = container.services;
    reservation = createBooking(container, { nightlyRate: '1000.10' });
  });

  it('records partial payments and recalculates status', () => {
    const { payment, summary } = services.payments.recordPayment(
      { reservationId: reservation.id, amount: '1000.10', method: 'upi', reference: 'UPI123456789012' },
      OWNER,
    );
    expect(payment.amountMinor).toBe(100010);
    expect(summary).toMatchObject({ status: 'partially_paid', balanceMinor: 200020 });
    const final = services.payments.recordPayment({ reservationId: reservation.id, amount: '2000.20', method: 'cash' }, OWNER);
    expect(final.summary.status).toBe('paid');
  });

  it('prevents overpayment', () => {
    expect(() =>
      services.payments.recordPayment({ reservationId: reservation.id, amount: '999999', method: 'cash' }, OWNER),
    ).toThrow(/exceeds the outstanding balance/);
  });

  it('only stores the last four card digits and rejects card numbers', () => {
    const { payment } = services.payments.recordPayment(
      { reservationId: reservation.id, amount: '100', method: 'card', cardLast4: '4242', reference: 'AUTH-1' },
      OWNER,
    );
    expect(payment.cardLast4).toBe('4242');
    expect(payment).not.toHaveProperty('cardNumber');
    expect(() =>
      services.payments.recordPayment(
        { reservationId: reservation.id, amount: '100', method: 'card', reference: '4111 1111 1111 1111' },
        OWNER,
      ),
    ).toThrow(/Validation failed/);
  });

  it('issues refunds up to the net paid amount', () => {
    expect(() =>
      services.payments.recordRefund({ reservationId: reservation.id, amount: '10', method: 'cash', reason: 'Goodwill' }, OWNER),
    ).toThrow(/no payments available/);
    services.payments.recordPayment({ reservationId: reservation.id, amount: '500', method: 'bank_transfer' }, OWNER);
    expect(() =>
      services.payments.recordRefund({ reservationId: reservation.id, amount: '600', method: 'cash', reason: 'Too much' }, OWNER),
    ).toThrow(/cannot exceed/);
    services.payments.recordRefund({ reservationId: reservation.id, amount: '200', method: 'cash', reason: 'Partial refund' }, OWNER);
    expect(services.payments.summary(reservation.id)).toMatchObject({ netPaidMinor: 30000, status: 'partially_paid' });

    services.reservations.cancel(reservation.id, { reason: 'Guest cancelled' }, OWNER);
    const { summary } = services.payments.recordRefund(
      { reservationId: reservation.id, amount: '300', method: 'cash', reason: 'Cancellation refund' },
      OWNER,
    );
    expect(summary.status).toBe('refunded');
  });

  it('blocks payments for cancelled reservations', () => {
    services.reservations.cancel(reservation.id, {}, OWNER);
    expect(() =>
      services.payments.recordPayment({ reservationId: reservation.id, amount: '10', method: 'cash' }, OWNER),
    ).toThrow(/cancelled or no-show/);
  });

  it('only allows editing reference and notes', () => {
    const { payment } = services.payments.recordPayment({ reservationId: reservation.id, amount: '10', method: 'cash' }, OWNER);
    const updated = services.payments.update(payment.id, { notes: 'Receipt #22', amountMinor: 1 }, OWNER);
    expect(updated.notes).toBe('Receipt #22');
    expect(updated.amountMinor).toBe(1000);
  });

  it('lists the ledger with totals', () => {
    const result = services.payments.list({ pageSize: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.totals.netMinor).toBe(result.totals.paymentsMinor - result.totals.refundsMinor);
  });
});
