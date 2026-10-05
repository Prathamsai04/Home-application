import { RESERVATION_STATUS } from '@homestay/shared';
import { guestFullName, indexById } from './helpers.js';
import { computePaymentSummary, groupTransactions } from './paymentMath.js';

/** Lightweight option lists for form dropdowns (avoids paging through full lists). */
export class LookupService {
  constructor({ repositories }) {
    this.repositories = repositories;
  }

  /** Reservations that still have an outstanding balance or refundable amount. */
  #billableReservations() {
    const guests = indexById(this.repositories.guests.getAll());
    const transactions = groupTransactions(this.repositories.payments.getAll());
    return this.repositories.reservations
      .getAll()
      .map((reservation) => ({
        reservation,
        summary: computePaymentSummary(reservation, transactions.get(reservation.id) ?? []),
      }))
      .filter(({ reservation, summary }) =>
        summary.balanceMinor > 0 || (summary.refundableMinor > 0 && reservation.status === RESERVATION_STATUS.CANCELLED),
      )
      .sort((a, b) => b.reservation.checkIn.localeCompare(a.reservation.checkIn))
      .map(({ reservation, summary }) => ({
        id: reservation.id,
        code: reservation.code,
        guestName: guestFullName(guests.get(reservation.guestId)),
        status: reservation.status,
        checkIn: reservation.checkIn,
        balanceMinor: summary.balanceMinor,
        refundableMinor: summary.refundableMinor,
      }));
  }

  get() {
    const properties = this.repositories.properties.getAll().sort((a, b) => a.name.localeCompare(b.name));
    const propertyNames = new Map(properties.map((p) => [p.id, p.name]));
    const settings = this.repositories.settings.get();
    return {
      properties: properties.map(({ id, name, code, status }) => ({ id, name, code, status })),
      rooms: this.repositories.rooms
        .getAll()
        .sort((a, b) => a.propertyId.localeCompare(b.propertyId) || a.number.localeCompare(b.number, 'en', { numeric: true }))
        .map(({ id, propertyId, number, name, capacity, baseRateMinor, active, type }) => ({
          id,
          propertyId,
          number,
          name,
          type,
          capacity,
          baseRateMinor,
          active,
          label: `${propertyNames.get(propertyId) ?? 'Property'} · ${number} ${name}`,
        })),
      guests: this.repositories.guests
        .getAll()
        .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b)))
        .map((guest) => ({ id: guest.id, name: guestFullName(guest), email: guest.email, vip: guest.vip })),
      staff: this.repositories.users
        .getAll()
        .filter((user) => user.active)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, name, role, jobTitle }) => ({ id, name, role, jobTitle })),
      billableReservations: this.#billableReservations(),
      settings: {
        currency: settings?.currency ?? 'INR',
        timezone: settings?.timezone ?? 'UTC',
        businessName: settings?.businessName ?? 'Homestay',
      },
    };
  }
}
