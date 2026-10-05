import {
  OCCUPANCY_RESERVATION_STATUSES,
  TRANSACTION_TYPES,
  dateRangeQuerySchema,
  eachDay,
  isNightWithinStay,
  multiplyMinor,
  nightsWithinWindow,
  percentage,
  resolveDateRange,
} from '@homestay/shared';
import { ValidationError } from '../core/errors.js';
import { validate } from '../core/validate.js';

/** Resolves and validates a dashboard/report date window. */
export function resolveWindow(query, clock) {
  const q = validate(dateRangeQuerySchema, query);
  const today = clock.today();
  try {
    return { ...resolveDateRange(q, today), today, propertyId: q.propertyId };
  } catch (error) {
    throw new ValidationError([{ code: 'INVALID_FIELD', field: 'range', message: error.message }]);
  }
}

/** Loads all records, optionally scoped to a single property. */
export function scopeData(repositories, propertyId) {
  const inScope = (item) => !propertyId || item.propertyId === propertyId;
  return {
    properties: repositories.properties.getAll().filter((p) => !propertyId || p.id === propertyId),
    rooms: repositories.rooms.getAll().filter(inScope),
    reservations: repositories.reservations.getAll().filter(inScope),
    payments: repositories.payments.getAll().filter(inScope),
    housekeeping: repositories.housekeeping.getAll().filter(inScope),
    maintenance: repositories.maintenance.getAll().filter(inScope),
  };
}

export const isOccupancyReservation = (reservation) => OCCUPANCY_RESERVATION_STATUSES.includes(reservation.status);

/** Sold room nights and room revenue (integer minor units) inside a window. */
export function soldNights(reservations, from, to) {
  let nights = 0;
  let revenueMinor = 0;
  for (const reservation of reservations) {
    if (!isOccupancyReservation(reservation)) continue;
    const count = nightsWithinWindow(reservation.checkIn, reservation.checkOut, from, to);
    nights += count;
    revenueMinor += multiplyMinor(reservation.nightlyRateMinor, count);
  }
  return { nights, revenueMinor };
}

export function cashflow(payments, from, to, dateOf) {
  let paymentsMinor = 0;
  let refundsMinor = 0;
  let count = 0;
  for (const payment of payments) {
    const date = dateOf(payment.receivedAt);
    if (date < from || date > to) continue;
    count += 1;
    if (payment.type === TRANSACTION_TYPES.REFUND) refundsMinor += payment.amountMinor;
    else paymentsMinor += payment.amountMinor;
  }
  return { paymentsMinor, refundsMinor, netMinor: paymentsMinor - refundsMinor, count };
}

/** Daily revenue / occupancy / booking series for charts. */
export function dailySeries({ from, to, rooms, reservations, payments, dateOf }) {
  const activeRooms = rooms.filter((room) => room.active).length;
  const revenueByDay = new Map();
  for (const payment of payments) {
    const date = dateOf(payment.receivedAt);
    if (date < from || date > to) continue;
    const signed = payment.type === TRANSACTION_TYPES.REFUND ? -payment.amountMinor : payment.amountMinor;
    revenueByDay.set(date, (revenueByDay.get(date) ?? 0) + signed);
  }
  const bookingsByDay = new Map();
  for (const reservation of reservations) {
    const date = dateOf(reservation.createdAt);
    bookingsByDay.set(date, (bookingsByDay.get(date) ?? 0) + 1);
  }
  const occupancyReservations = reservations.filter(isOccupancyReservation);
  return eachDay(from, to).map((date) => {
    const occupied = occupancyReservations.filter((r) => isNightWithinStay(date, r.checkIn, r.checkOut)).length;
    return {
      date,
      revenueMinor: revenueByDay.get(date) ?? 0,
      occupiedRooms: occupied,
      occupancyRate: percentage(occupied, activeRooms),
      reservations: bookingsByDay.get(date) ?? 0,
      arrivals: reservations.filter((r) => r.checkIn === date && r.status !== 'cancelled').length,
    };
  });
}

export function countBy(items, key, keys = []) {
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : item[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count }));
}
