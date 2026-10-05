import {
  BLOCKING_RESERVATION_STATUSES,
  HOUSEKEEPING_STATUS,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUS,
  PAYMENT_METHODS,
  PRIORITIES,
  RESERVATION_SOURCES,
  RESERVATION_STATUS,
  TRANSACTION_TYPES,
  diffDays,
  divideMinor,
  percentage,
} from '@homestay/shared';
import { computePaymentSummary, groupTransactions } from './paymentMath.js';
import { cashflow, countBy, dailySeries, resolveWindow, scopeData, soldNights } from './analytics.js';

export class ReportService {
  constructor({ repositories, clock }) {
    this.repositories = repositories;
    this.clock = clock;
  }

  #context(query) {
    const window = resolveWindow(query, this.clock);
    const data = scopeData(this.repositories, window.propertyId);
    const dateOf = (instant) => this.clock.dateOf(instant);
    const currency = this.repositories.settings.get()?.currency ?? 'INR';
    return { window, data, dateOf, currency, days: diffDays(window.from, window.to) + 1 };
  }

  occupancy(query) {
    const { window, data, dateOf, currency, days } = this.#context(query);
    const rows = data.properties.map((property) => {
      const rooms = data.rooms.filter((room) => room.propertyId === property.id && room.active);
      const sold = soldNights(data.reservations.filter((r) => r.propertyId === property.id), window.from, window.to);
      const available = rooms.length * days;
      return {
        propertyId: property.id,
        name: property.name,
        rooms: rooms.length,
        availableRoomNights: available,
        soldRoomNights: sold.nights,
        occupancyRate: percentage(sold.nights, available),
        roomRevenueMinor: sold.revenueMinor,
        adrMinor: divideMinor(sold.revenueMinor, sold.nights),
        revparMinor: divideMinor(sold.revenueMinor, available),
      };
    });
    const totalAvailable = rows.reduce((t, r) => t + r.availableRoomNights, 0);
    const total = soldNights(data.reservations, window.from, window.to);
    return {
      range: window,
      currency,
      rows,
      totals: {
        availableRoomNights: totalAvailable,
        soldRoomNights: total.nights,
        occupancyRate: percentage(total.nights, totalAvailable),
        roomRevenueMinor: total.revenueMinor,
        adrMinor: divideMinor(total.revenueMinor, total.nights),
        revparMinor: divideMinor(total.revenueMinor, totalAvailable),
      },
      series: dailySeries({ ...window, rooms: data.rooms, reservations: data.reservations, payments: data.payments, dateOf }),
    };
  }

  revenue(query) {
    const { window, data, dateOf, currency } = this.#context(query);
    const inWindow = data.payments.filter((p) => {
      const date = dateOf(p.receivedAt);
      return date >= window.from && date <= window.to;
    });
    const byMethod = Object.values(PAYMENT_METHODS).map((method) => {
      const flow = cashflow(inWindow.filter((p) => p.method === method), window.from, window.to, dateOf);
      return { method, ...flow };
    });
    const byProperty = data.properties.map((property) => ({
      propertyId: property.id,
      name: property.name,
      ...cashflow(inWindow.filter((p) => p.propertyId === property.id), window.from, window.to, dateOf),
    }));
    const transactions = groupTransactions(data.payments);
    const outstandingMinor = data.reservations
      .filter((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status) || r.status === RESERVATION_STATUS.CHECKED_OUT)
      .filter((r) => r.checkIn <= window.to && r.checkOut > window.from)
      .reduce((total, r) => total + computePaymentSummary(r, transactions.get(r.id) ?? []).balanceMinor, 0);
    const totals = cashflow(inWindow, window.from, window.to, dateOf);
    return {
      range: window,
      currency,
      totals: { ...totals, outstandingMinor, refundCount: inWindow.filter((p) => p.type === TRANSACTION_TYPES.REFUND).length },
      byMethod,
      byProperty,
      series: dailySeries({ ...window, rooms: data.rooms, reservations: data.reservations, payments: data.payments, dateOf }).map(
        ({ date, revenueMinor }) => ({ date, revenueMinor }),
      ),
    };
  }

  reservations(query) {
    const { window, data, currency } = this.#context(query);
    const scoped = data.reservations.filter((r) => r.checkIn >= window.from && r.checkIn <= window.to);
    const stays = scoped.filter((r) => r.status !== RESERVATION_STATUS.CANCELLED);
    const totalNights = stays.reduce((t, r) => t + r.nights, 0);
    const leadDays = scoped.reduce((t, r) => t + Math.max(0, diffDays(r.createdAt.slice(0, 10), r.checkIn)), 0);
    const cancelled = scoped.filter((r) => r.status === RESERVATION_STATUS.CANCELLED).length;
    return {
      range: window,
      currency,
      totals: {
        reservations: scoped.length,
        bookedValueMinor: stays.reduce((t, r) => t + r.totalAmountMinor, 0),
        averageLengthOfStay: stays.length ? Math.round((totalNights / stays.length) * 10) / 10 : 0,
        averageLeadTimeDays: scoped.length ? Math.round((leadDays / scoped.length) * 10) / 10 : 0,
        cancellationRate: percentage(cancelled, scoped.length),
        noShowRate: percentage(scoped.filter((r) => r.status === RESERVATION_STATUS.NO_SHOW).length, scoped.length),
      },
      byStatus: countBy(scoped, 'status', Object.values(RESERVATION_STATUS)),
      bySource: countBy(scoped, 'source', RESERVATION_SOURCES),
      byProperty: data.properties.map((property) => ({
        propertyId: property.id,
        name: property.name,
        count: scoped.filter((r) => r.propertyId === property.id).length,
      })),
    };
  }

  operations(query) {
    const { window, data, dateOf } = this.#context(query);
    const today = window.today;
    const inRange = (instant) => instant && dateOf(instant) >= window.from && dateOf(instant) <= window.to;
    const resolved = data.maintenance.filter((m) => m.status === MAINTENANCE_STATUS.RESOLVED && inRange(m.resolvedAt));
    const resolutionHours = resolved.map((m) => (new Date(m.resolvedAt) - new Date(m.reportedAt)) / 3_600_000);
    return {
      range: window,
      housekeeping: {
        byStatus: countBy(data.housekeeping, 'status', Object.values(HOUSEKEEPING_STATUS)),
        byPriority: countBy(data.housekeeping, 'priority', Object.values(PRIORITIES)),
        completedInRange: data.housekeeping.filter((t) => t.status === HOUSEKEEPING_STATUS.COMPLETED && inRange(t.completedAt)).length,
        overdue: data.housekeeping.filter((t) => t.status !== HOUSEKEEPING_STATUS.COMPLETED && t.dueDate < today).length,
        open: data.housekeeping.filter((t) => t.status !== HOUSEKEEPING_STATUS.COMPLETED).length,
      },
      maintenance: {
        byStatus: countBy(data.maintenance, 'status', Object.values(MAINTENANCE_STATUS)),
        byPriority: countBy(data.maintenance, 'priority', Object.values(PRIORITIES)),
        byCategory: countBy(data.maintenance, 'category', MAINTENANCE_CATEGORIES),
        openBlocking: data.maintenance.filter((m) => m.blocksRoom && m.status !== MAINTENANCE_STATUS.RESOLVED).length,
        resolvedInRange: resolved.length,
        averageResolutionHours: resolutionHours.length
          ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
          : 0,
      },
    };
  }
}
