import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '@homestay/shared';
import { FUTURE, OWNER, STAFF, TODAY, buildContainer, createBooking, freeRoom } from './helpers/context.js';

let container;
let services;

beforeEach(() => {
  container = buildContainer();
  services = container.services;
});

describe('ReservationService - create', () => {
  it('creates a confirmed reservation with integer totals', () => {
    const reservation = createBooking(container, { nightlyRate: '2500.25' });
    expect(reservation.status).toBe('confirmed');
    expect(reservation.nights).toBe(3);
    expect(reservation.totalAmountMinor).toBe(750075);
    expect(reservation.payment.status).toBe('unpaid');
    expect(reservation.code).toMatch(/^HS-\d+$/);
  });

  it('defaults the nightly rate to the room base rate', () => {
    const reservation = createBooking(container);
    const room = container.repositories.rooms.getById(reservation.roomId);
    expect(reservation.nightlyRateMinor).toBe(room.baseRateMinor);
  });

  it('rejects check-out on or before check-in', () => {
    expect(() => createBooking(container, { checkIn: FUTURE, checkOut: FUTURE })).toThrow(/Validation failed/);
  });

  it('rejects check-in dates in the past', () => {
    expect(() => createBooking(container, { checkIn: addDays(TODAY, -1), checkOut: addDays(TODAY, 2) })).toThrow(/past/);
  });

  it('prevents double booking of the same room', () => {
    const first = createBooking(container);
    expect(() =>
      createBooking(container, { roomId: first.roomId, checkIn: addDays(FUTURE, 2), checkOut: addDays(FUTURE, 5) }),
    ).toThrow(/already booked/);
  });

  it('allows back-to-back stays because checkout is exclusive', () => {
    const first = createBooking(container);
    const second = createBooking(container, { roomId: first.roomId, checkIn: first.checkOut, checkOut: addDays(first.checkOut, 2) });
    expect(second.roomId).toBe(first.roomId);
  });

  it('frees inventory when a reservation is cancelled', () => {
    const first = createBooking(container);
    services.reservations.cancel(first.id, { reason: 'Plans changed' }, OWNER);
    const rebooked = createBooking(container, { roomId: first.roomId });
    expect(rebooked.status).toBe('confirmed');
  });

  it('blocks rooms under maintenance', () => {
    expect(() => createBooking(container, { roomId: 'room_008' })).toThrow(/under maintenance/);
  });

  it('enforces room capacity', () => {
    const room = freeRoom(container, FUTURE, addDays(FUTURE, 2));
    expect(() => createBooking(container, { roomId: room.id, adults: room.capacity + 1 })).toThrow(/accommodates at most/);
  });
});

describe('ReservationService - update', () => {
  it('revalidates conflicts when dates change', () => {
    const first = createBooking(container);
    const second = createBooking(container, { roomId: first.roomId, checkIn: first.checkOut, checkOut: addDays(first.checkOut, 2) });
    expect(() => services.reservations.update(second.id, { checkIn: addDays(first.checkOut, -1) }, OWNER)).toThrow(/already booked/);
    const moved = services.reservations.update(second.id, { checkOut: addDays(first.checkOut, 4) }, OWNER);
    expect(moved.nights).toBe(4);
    expect(moved.totalAmountMinor).toBe(moved.nightlyRateMinor * 4);
  });

  it('does not conflict with itself when extending', () => {
    const reservation = createBooking(container);
    const updated = services.reservations.update(reservation.id, { checkOut: addDays(reservation.checkOut, 1) }, OWNER);
    expect(updated.nights).toBe(4);
  });

  it('re-prices when moving to another room', () => {
    const reservation = createBooking(container);
    const other = container.repositories.rooms
      .getAll()
      .find((r) => r.id !== reservation.roomId && r.capacity >= 2 && !services.availability.findBlockingMaintenance(r.id)
        && container.repositories.reservations.findOverlapping(r.id, reservation.checkIn, reservation.checkOut).length === 0);
    const moved = services.reservations.update(reservation.id, { roomId: other.id }, OWNER);
    expect(moved.roomId).toBe(other.id);
    expect(moved.nightlyRateMinor).toBe(other.baseRateMinor);
  });

  it('refuses edits to closed reservations', () => {
    const reservation = createBooking(container);
    services.reservations.cancel(reservation.id, {}, OWNER);
    expect(() => services.reservations.update(reservation.id, { notes: 'x' }, OWNER)).toThrow(/can be modified/);
  });
});

describe('ReservationService - lifecycle', () => {
  it('confirms pending reservations only', () => {
    const pending = createBooking(container, { status: 'pending' });
    expect(services.reservations.confirm(pending.id, OWNER).status).toBe('confirmed');
    expect(() => services.reservations.confirm(pending.id, OWNER)).toThrow(/Only pending/);
  });

  it('checks in only confirmed reservations on/after arrival', () => {
    const future = createBooking(container);
    expect(() => services.reservations.checkIn(future.id, STAFF)).toThrow(/opens on the arrival date/);

    const today = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 2) });
    const checkedIn = services.reservations.checkIn(today.id, STAFF);
    expect(checkedIn.status).toBe('checked_in');
    expect(checkedIn.checkedInAt).toBeTruthy();

    const pending = createBooking(container, { status: 'pending', checkIn: TODAY, checkOut: addDays(TODAY, 1) });
    expect(() => services.reservations.checkIn(pending.id, STAFF)).toThrow(/Only confirmed/);
  });

  it('checks out only active stays and creates a cleaning task', () => {
    const reservation = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 2) });
    expect(() => services.reservations.checkOut(reservation.id, STAFF)).toThrow(/Only checked-in/);
    services.reservations.checkIn(reservation.id, STAFF);
    const before = container.repositories.housekeeping.count();
    const checkedOut = services.reservations.checkOut(reservation.id, STAFF);
    expect(checkedOut.status).toBe('checked_out');
    expect(container.repositories.housekeeping.count()).toBe(before + 1);
    const room = services.rooms.get(reservation.roomId);
    expect(room.status).toBe('cleaning');
  });

  it('cancels only pending or confirmed reservations', () => {
    const reservation = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 1) });
    services.reservations.checkIn(reservation.id, STAFF);
    expect(() => services.reservations.cancel(reservation.id, {}, OWNER)).toThrow(/Only pending or confirmed/);
  });

  it('marks no-shows on or after arrival only', () => {
    const future = createBooking(container);
    expect(() => services.reservations.markNoShow(future.id, OWNER)).toThrow(/on or after/);
    const today = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 1) });
    expect(services.reservations.markNoShow(today.id, OWNER).status).toBe('no_show');
  });

  it('exposes allowed actions per status', () => {
    const today = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 1) });
    expect(services.reservations.get(today.id).allowedActions).toEqual(
      expect.arrayContaining(['edit', 'check_in', 'cancel', 'no_show']),
    );
  });

  it('lists with filters, search and pagination', () => {
    const result = services.reservations.list({ status: 'checked_in', pageSize: 5, sortBy: 'checkIn', sortOrder: 'asc' });
    expect(result.items.every((r) => r.status === 'checked_in')).toBe(true);
    expect(result.pagination.pageSize).toBe(5);
    const byCode = services.reservations.list({ search: 'HS-1001' });
    expect(byCode.items[0].code).toBe('HS-1001');
  });
});
