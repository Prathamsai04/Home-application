import { describe, expect, it } from 'vitest';
import { BLOCKING_RESERVATION_STATUSES, rangesOverlap } from '@homestay/shared';
import { generateSeedData } from '../src/index.js';

const anchorDate = '2026-03-15';
const data = generateSeedData({ anchorDate, password: 'Password123!' });
const { collections } = data;

describe('seed data generator', () => {
  it('is deterministic for the same anchor date', () => {
    const again = generateSeedData({ anchorDate, password: 'Password123!' });
    expect(again).toEqual(data);
  });

  it('meets the minimum dataset sizes', () => {
    expect(collections.properties.length).toBeGreaterThanOrEqual(3);
    expect(collections.rooms.length).toBeGreaterThanOrEqual(12);
    expect(collections.guests.length).toBeGreaterThanOrEqual(15);
    expect(collections.reservations.length).toBeGreaterThanOrEqual(20);
    expect(collections.users.map((u) => u.email)).toEqual(
      expect.arrayContaining(['owner@homestay.demo', 'manager@homestay.demo', 'staff@homestay.demo']),
    );
  });

  it('covers multiple statuses across operational modules', () => {
    const statuses = (items) => new Set(items.map((item) => item.status));
    expect(statuses(collections.reservations).size).toBeGreaterThanOrEqual(5);
    expect(statuses(collections.housekeepingTasks).size).toBe(3);
    expect(statuses(collections.maintenanceRequests).size).toBe(4);
    expect(new Set(collections.payments.map((p) => p.type))).toEqual(new Set(['payment', 'refund']));
  });

  it('never double books a room', () => {
    const blocking = collections.reservations.filter((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status));
    for (const a of blocking) {
      for (const b of blocking) {
        if (a.id !== b.id && a.roomId === b.roomId) {
          expect(rangesOverlap(a.checkIn, a.checkOut, b.checkIn, b.checkOut)).toBe(false);
        }
      }
    }
  });

  it('stores money as integer minor units and never stores card numbers', () => {
    for (const payment of collections.payments) {
      expect(Number.isSafeInteger(payment.amountMinor)).toBe(true);
      expect(payment.amountMinor).toBeGreaterThan(0);
      expect(payment.cardNumber).toBeUndefined();
    }
  });

  it('produces activity for today so dashboards are populated', () => {
    expect(collections.reservations.some((r) => r.checkIn === anchorDate)).toBe(true);
    expect(collections.reservations.some((r) => r.status === 'checked_in')).toBe(true);
  });
});
