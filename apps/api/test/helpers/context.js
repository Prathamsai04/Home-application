import { addDays } from '@homestay/shared';
import { loadConfig } from '../../src/config/env.js';
import { createClock } from '../../src/core/clock.js';
import { createContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { MemoryStorageProvider } from '../../src/storage/MemoryStorageProvider.js';

export const FIXED_NOW = '2026-03-15T06:30:00.000Z';
export const TODAY = '2026-03-15';
/** A date window beyond the seeded horizon so test bookings never collide with seed data. */
export const FUTURE = addDays(TODAY, 90);

export const OWNER = { id: 'user_001', name: 'Aarav Mehta', email: 'owner@homestay.demo', role: 'owner' };
export const MANAGER = { id: 'user_002', name: 'Priya Nair', email: 'manager@homestay.demo', role: 'manager' };
export const STAFF = { id: 'user_003', name: 'Rohan Das', email: 'staff@homestay.demo', role: 'staff' };

export function buildContainer({ now = FIXED_NOW } = {}) {
  const config = loadConfig({ NODE_ENV: 'test' });
  const clock = createClock({ fixedNow: now, getTimeZone: () => 'Asia/Kolkata' });
  return createContainer({ config, clock, storage: new MemoryStorageProvider() });
}

export function buildApp(container = buildContainer()) {
  return { container, app: createApp({ container, limits: { max: 10_000, authMax: 10_000 } }) };
}

/** Room that is active, not blocked by maintenance and free for the given stay. */
export function freeRoom(container, checkIn, checkOut, minCapacity = 1) {
  const { repositories, services } = container;
  return repositories.rooms
    .getAll()
    .find(
      (room) =>
        room.active &&
        room.capacity >= minCapacity &&
        !services.availability.findBlockingMaintenance(room.id) &&
        repositories.reservations.findOverlapping(room.id, checkIn, checkOut).length === 0,
    );
}

export function createBooking(container, overrides = {}, actor = OWNER) {
  const checkIn = overrides.checkIn ?? FUTURE;
  const checkOut = overrides.checkOut ?? addDays(checkIn, 3);
  const room = overrides.roomId ? { id: overrides.roomId } : freeRoom(container, checkIn, checkOut, 2);
  return container.services.reservations.create(
    { roomId: room.id, guestId: 'guest_001', checkIn, checkOut, adults: 2, ...overrides },
    actor,
  );
}

export async function loginAs(request, email = 'owner@homestay.demo') {
  const response = await request.post('/api/v1/auth/login').send({ email, password: 'Password123!' });
  return response.body.data.token;
}
