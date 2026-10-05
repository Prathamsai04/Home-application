import { beforeEach, describe, expect, it } from 'vitest';
import { OWNER, buildContainer } from './helpers/context.js';

let container;
let services;

beforeEach(() => {
  container = buildContainer();
  services = container.services;
});

const propertyInput = {
  name: 'Lakeview Cottage',
  code: 'lvc',
  address: { line1: '1 Lake Road', city: 'Nainital', state: 'Uttarakhand', country: 'India', postalCode: '263001' },
  phone: '+91 98000 11111',
  email: 'lakeview@homestay.demo',
};

describe('PropertyService', () => {
  it('creates a property with defaults and normalised code', () => {
    const property = services.properties.create(propertyInput, OWNER);
    expect(property.code).toBe('LVC');
    expect(property.status).toBe('active');
    expect(property.checkInTime).toBe('14:00');
    expect(services.properties.get(property.id).roomCount).toBe(0);
  });

  it('rejects duplicate codes and invalid input', () => {
    expect(() => services.properties.create({ ...propertyInput, code: 'MHR' }, OWNER)).toThrow(/already in use/);
    expect(() => services.properties.create({ ...propertyInput, email: 'bad' }, OWNER)).toThrow(/Validation failed/);
  });

  it('updates a property', () => {
    const updated = services.properties.update('prop_001', { name: 'Misty Hills Estate', status: 'inactive' }, OWNER);
    expect(updated.name).toBe('Misty Hills Estate');
    expect(updated.status).toBe('inactive');
  });

  it('deletes only properties without rooms', () => {
    expect(() => services.properties.delete('prop_001', OWNER)).toThrow(/still has rooms/);
    const property = services.properties.create(propertyInput, OWNER);
    expect(services.properties.delete(property.id, OWNER)).toEqual({ id: property.id });
    expect(() => services.properties.get(property.id)).toThrow(/not found/);
  });

  it('lists with search and sorting', () => {
    const result = services.properties.list({ search: 'goa', sortBy: 'name' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe('CBH');
  });
});

describe('RoomService', () => {
  const roomInput = { propertyId: 'prop_001', number: '301', name: 'Attic Room', type: 'double', capacity: 2, floor: 3, baseRate: '2999.50' };

  it('creates rooms storing the rate in minor units', () => {
    const room = services.rooms.create(roomInput, OWNER);
    expect(room.baseRateMinor).toBe(299950);
    expect(room.status).toBe('available');
  });

  it('prevents duplicate room numbers within a property', () => {
    expect(() => services.rooms.create({ ...roomInput, number: '101' }, OWNER)).toThrow(/already exists/);
    expect(services.rooms.create({ ...roomInput, propertyId: 'prop_002', number: '301' }, OWNER).number).toBe('301');
  });

  it('updates a room', () => {
    const room = services.rooms.create(roomInput, OWNER);
    const updated = services.rooms.update(room.id, { baseRate: '3100', capacity: 3 }, OWNER);
    expect(updated.baseRateMinor).toBe(310000);
    expect(updated.capacity).toBe(3);
  });

  it('deletes rooms without active reservations but protects booked rooms', () => {
    const room = services.rooms.create(roomInput, OWNER);
    expect(services.rooms.delete(room.id, OWNER)).toEqual({ id: room.id });
    const booked = container.repositories.reservations.getAll().find((r) => r.status === 'confirmed');
    expect(() => services.rooms.delete(booked.roomId, OWNER)).toThrow(/active or upcoming/);
  });

  it('derives statuses dynamically', () => {
    const statuses = new Set(services.rooms.list({ pageSize: 100 }).items.map((r) => r.status));
    expect(statuses.has('maintenance')).toBe(true);
    expect(statuses.has('occupied')).toBe(true);
    const deactivated = services.rooms.update('room_001', { active: false }, OWNER);
    expect(deactivated.status).toBe('maintenance');
  });
});

describe('GuestService', () => {
  const guestInput = {
    firstName: 'Riya',
    lastName: 'Bose',
    email: 'Riya.Bose@Example.com',
    phone: '+91 98300 12345',
    nationality: 'India',
    idType: 'passport',
  };

  it('creates guests with normalised email', () => {
    const guest = services.guests.create(guestInput, OWNER);
    expect(guest.email).toBe('riya.bose@example.com');
    expect(guest.vip).toBe(false);
  });

  it('rejects duplicate emails', () => {
    services.guests.create(guestInput, OWNER);
    expect(() => services.guests.create(guestInput, OWNER)).toThrow(/already exists/);
  });

  it('updates guests', () => {
    const guest = services.guests.create(guestInput, OWNER);
    expect(services.guests.update(guest.id, { vip: true, city: 'Kolkata' }, OWNER)).toMatchObject({ vip: true, city: 'Kolkata' });
  });

  it('deletes guests unless they have active reservations', () => {
    const guest = services.guests.create(guestInput, OWNER);
    expect(services.guests.delete(guest.id, OWNER)).toEqual({ id: guest.id });
    const activeGuest = container.repositories.reservations.getAll().find((r) => r.status === 'checked_in').guestId;
    expect(() => services.guests.delete(activeGuest, OWNER)).toThrow(/cannot be deleted/);
  });

  it('returns stay history with lifetime value', () => {
    const detail = services.guests.get('guest_001');
    expect(Array.isArray(detail.reservations)).toBe(true);
    expect(Number.isSafeInteger(detail.lifetimeValueMinor)).toBe(true);
  });
});
