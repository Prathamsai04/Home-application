import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  eachDay,
  isIsoDate,
  isNightWithinStay,
  nightsWithinWindow,
  rangesOverlap,
  resolveDateRange,
} from '../src/dates.js';
import { can } from '../src/permissions.js';
import { looksLikeCardNumber, reservationCreateSchema } from '../src/schemas/operations.js';
import { humanize } from '../src/constants.js';

describe('date utilities', () => {
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026/02/01')).toBe(false);
  });

  it('adds and diffs days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(diffDays('2026-03-01', '2026-03-05')).toBe(4);
    expect(eachDay('2026-03-01', '2026-03-03')).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
  });

  it('treats checkout as exclusive', () => {
    expect(isNightWithinStay('2026-03-04', '2026-03-01', '2026-03-05')).toBe(true);
    expect(isNightWithinStay('2026-03-05', '2026-03-01', '2026-03-05')).toBe(false);
    expect(rangesOverlap('2026-03-01', '2026-03-05', '2026-03-05', '2026-03-07')).toBe(false);
    expect(rangesOverlap('2026-03-01', '2026-03-05', '2026-03-04', '2026-03-07')).toBe(true);
  });

  it('counts nights inside a window', () => {
    expect(nightsWithinWindow('2026-03-01', '2026-03-10', '2026-03-05', '2026-03-06')).toBe(2);
    expect(nightsWithinWindow('2026-03-01', '2026-03-03', '2026-03-05', '2026-03-06')).toBe(0);
  });

  it('resolves range presets', () => {
    expect(resolveDateRange({ range: '7d' }, '2026-03-10')).toEqual({ range: '7d', from: '2026-03-04', to: '2026-03-10' });
    expect(resolveDateRange({ range: 'today' }, '2026-03-10')).toEqual({ range: 'today', from: '2026-03-10', to: '2026-03-10' });
    expect(() => resolveDateRange({ range: 'custom', from: '2026-03-10', to: '2026-03-01' }, '2026-03-10')).toThrow();
  });
});

describe('permissions', () => {
  it('applies the role matrix', () => {
    expect(can('owner', 'users:manage')).toBe(true);
    expect(can('manager', 'users:manage')).toBe(false);
    expect(can('staff', 'payments:view')).toBe(false);
    expect(can('staff', 'reservations:operate')).toBe(true);
    expect(can('staff', 'unknown:permission')).toBe(false);
  });
});

describe('schemas', () => {
  it('rejects reservations whose check-out is not after check-in', () => {
    const result = reservationCreateSchema.safeParse({
      roomId: 'room_001',
      guestId: 'guest_001',
      checkIn: '2026-03-10',
      checkOut: '2026-03-10',
      adults: 2,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['checkOut']);
  });

  it('detects card numbers with the Luhn algorithm', () => {
    expect(looksLikeCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(looksLikeCardNumber('UPI-412345678901')).toBe(false);
  });

  it('humanizes enum values', () => {
    expect(humanize('checked_in')).toBe('Checked In');
    expect(humanize('partially_paid')).toBe('Partially Paid');
    expect(humanize('suite')).toBe('Suite');
  });
});
