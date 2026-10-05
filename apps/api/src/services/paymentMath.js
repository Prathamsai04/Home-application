import { PAYMENT_STATUS, RESERVATION_STATUS, TRANSACTION_TYPES, sumMinor } from '@homestay/shared';

const CLOSED_STATUSES = [RESERVATION_STATUS.CANCELLED, RESERVATION_STATUS.NO_SHOW];

/**
 * Pure, integer-only calculation of a reservation's payment position. The
 * payment status is always derived here and can never be set manually.
 */
export function computePaymentSummary(reservation, transactions) {
  const relevant = transactions.filter((t) => t.reservationId === reservation.id);
  const paidMinor = sumMinor(relevant.filter((t) => t.type === TRANSACTION_TYPES.PAYMENT).map((t) => t.amountMinor));
  const refundedMinor = sumMinor(relevant.filter((t) => t.type === TRANSACTION_TYPES.REFUND).map((t) => t.amountMinor));
  const netPaidMinor = paidMinor - refundedMinor;
  const totalMinor = reservation.totalAmountMinor;
  const closed = CLOSED_STATUSES.includes(reservation.status);
  const chargeableMinor = closed ? Math.max(netPaidMinor, 0) : totalMinor;

  let status;
  if (refundedMinor > 0 && netPaidMinor <= 0) status = PAYMENT_STATUS.REFUNDED;
  else if (netPaidMinor <= 0) status = PAYMENT_STATUS.UNPAID;
  else if (netPaidMinor < chargeableMinor) status = PAYMENT_STATUS.PARTIALLY_PAID;
  else status = PAYMENT_STATUS.PAID;

  return {
    totalMinor,
    paidMinor,
    refundedMinor,
    netPaidMinor,
    balanceMinor: Math.max(chargeableMinor - netPaidMinor, 0),
    refundableMinor: Math.max(netPaidMinor, 0),
    overpaidMinor: closed ? 0 : Math.max(netPaidMinor - totalMinor, 0),
    status,
    transactionCount: relevant.length,
  };
}

/** Builds a reservationId -> transactions map to summarise many reservations efficiently. */
export function groupTransactions(transactions) {
  const map = new Map();
  for (const transaction of transactions) {
    if (!map.has(transaction.reservationId)) map.set(transaction.reservationId, []);
    map.get(transaction.reservationId).push(transaction);
  }
  return map;
}
