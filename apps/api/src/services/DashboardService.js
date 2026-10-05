import {
  BLOCKING_RESERVATION_STATUSES,
  RESERVATION_STATUS,
  ROOM_STATUS,
  addDays,
  diffDays,
  divideMinor,
  percentage,
} from '@homestay/shared';
import { guestFullName, indexById } from './helpers.js';
import { computePaymentSummary, groupTransactions } from './paymentMath.js';
import { cashflow, dailySeries, resolveWindow, scopeData, soldNights } from './analytics.js';

const { PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT } = RESERVATION_STATUS;

/** All dashboard metrics are calculated from live repository data on every request. */
export class DashboardService {
  constructor({ repositories, clock, availability, activity }) {
    this.repositories = repositories;
    this.clock = clock;
    this.availability = availability;
    this.activity = activity;
  }

  getOverview(query) {
    const window = resolveWindow(query, this.clock);
    const { from, to, today, propertyId } = window;
    const data = scopeData(this.repositories, propertyId);
    const dateOf = (instant) => this.clock.dateOf(instant);
    const settings = this.repositories.settings.get();
    const guests = indexById(this.repositories.guests.getAll());
    const rooms = indexById(this.repositories.rooms.getAll());
    const properties = indexById(this.repositories.properties.getAll());
    const transactions = groupTransactions(data.payments);

    const activeRooms = data.rooms.filter((room) => room.active);
    const days = diffDays(from, to) + 1;
    const sold = soldNights(data.reservations, from, to);
    const money = cashflow(data.payments, from, to, dateOf);
    const roomStatuses = this.availability.withStatus(data.rooms);
    const statusCounts = Object.values(ROOM_STATUS).map((status) => ({
      status,
      count: roomStatuses.filter((room) => room.status === status).length,
    }));
    const occupiedToday = roomStatuses.filter((room) => room.status === ROOM_STATUS.OCCUPIED).length;

    const describe = (reservation) => ({
      id: reservation.id,
      code: reservation.code,
      guestName: guestFullName(guests.get(reservation.guestId)),
      roomNumber: rooms.get(reservation.roomId)?.number ?? '—',
      propertyName: properties.get(reservation.propertyId)?.name ?? '—',
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights: reservation.nights,
      status: reservation.status,
      totalAmountMinor: reservation.totalAmountMinor,
      paymentStatus: computePaymentSummary(reservation, transactions.get(reservation.id) ?? []).status,
    });

    const arrivals = data.reservations.filter(
      (r) => r.checkIn === today && [PENDING, CONFIRMED, CHECKED_IN].includes(r.status),
    );
    const departures = data.reservations.filter(
      (r) => r.checkOut === today && [CHECKED_IN, CHECKED_OUT].includes(r.status),
    );
    const active = data.reservations.filter(
      (r) => BLOCKING_RESERVATION_STATUSES.includes(r.status) && r.checkOut >= today,
    );
    const outstandingBalanceMinor = active.reduce(
      (total, r) => total + computePaymentSummary(r, transactions.get(r.id) ?? []).balanceMinor,
      0,
    );
    const upcoming = data.reservations
      .filter((r) => [PENDING, CONFIRMED].includes(r.status) && r.checkIn > today && r.checkIn <= addDays(today, 14))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, 8)
      .map(describe);

    const propertyPerformance = data.properties.map((property) => {
      const ownRooms = activeRooms.filter((room) => room.propertyId === property.id);
      const ownReservations = data.reservations.filter((r) => r.propertyId === property.id);
      const ownSold = soldNights(ownReservations, from, to);
      return {
        propertyId: property.id,
        name: property.name,
        rooms: ownRooms.length,
        occupiedToday: roomStatuses.filter((room) => room.propertyId === property.id && room.status === ROOM_STATUS.OCCUPIED).length,
        occupancyRate: percentage(ownSold.nights, ownRooms.length * days),
        revenueMinor: cashflow(data.payments.filter((p) => p.propertyId === property.id), from, to, dateOf).netMinor,
      };
    });

    return {
      range: window,
      currency: settings?.currency ?? 'INR',
      kpis: {
        totalRevenueMinor: money.netMinor,
        grossPaymentsMinor: money.paymentsMinor,
        refundsMinor: money.refundsMinor,
        occupancyRate: percentage(sold.nights, activeRooms.length * days),
        soldRoomNights: sold.nights,
        availableRoomNights: activeRooms.length * days,
        averageDailyRateMinor: divideMinor(sold.revenueMinor, sold.nights),
        activeReservations: active.length,
        inHouseGuests: data.reservations.filter((r) => r.status === CHECKED_IN).length,
        todaysCheckIns: arrivals.length,
        pendingArrivals: arrivals.filter((r) => r.status !== CHECKED_IN).length,
        todaysCheckOuts: departures.length,
        pendingDepartures: departures.filter((r) => r.status === CHECKED_IN).length,
        propertyCount: data.properties.length,
        roomCount: data.rooms.length,
        roomUtilizationRate: percentage(occupiedToday, activeRooms.length),
        outstandingBalanceMinor,
      },
      roomStatus: statusCounts,
      propertyPerformance,
      todaysArrivals: arrivals.map(describe),
      todaysDepartures: departures.map(describe),
      upcomingReservations: upcoming,
      recentActivity: this.activity.recent(10),
      series: dailySeries({ from, to, rooms: data.rooms, reservations: data.reservations, payments: data.payments, dateOf }),
    };
  }
}
