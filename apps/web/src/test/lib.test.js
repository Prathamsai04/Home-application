import { describe, expect, it } from 'vitest';
import { toCsv } from '../lib/csv';
import { compact, joinList, splitList } from '../lib/forms';
import { formatDate, formatPercent, initials, timeAgo } from '../lib/format';
import { estimateStay } from '../lib/stay';
import { cleanParams, toFieldErrors } from '../lib/sagaHelpers';

describe('estimateStay', () => {
  it('calculates nights and totals with integer arithmetic', () => {
    expect(estimateStay({ checkIn: '2026-03-01', checkOut: '2026-03-04', nightlyRate: '1000.10' })).toEqual({
      nights: 3,
      rateMinor: 100010,
      totalMinor: 300030,
    });
  });

  it('falls back to the room rate and rejects invalid ranges', () => {
    expect(estimateStay({ checkIn: '2026-03-01', checkOut: '2026-03-02', fallbackRateMinor: 350000 }).totalMinor).toBe(350000);
    expect(estimateStay({ checkIn: '2026-03-02', checkOut: '2026-03-01' })).toBeNull();
    expect(estimateStay({ checkIn: '2026-03-01', checkOut: '2026-03-03' })).toEqual({ nights: 2, rateMinor: null, totalMinor: null });
  });
});

describe('csv export', () => {
  it('escapes delimiters and neutralises formula injection', () => {
    const csv = toCsv([{ name: 'Smith, "Jo"', note: '=SUM(A1)' }], [
      { header: 'Name', value: (r) => r.name },
      { header: 'Note', value: (r) => r.note },
    ]);
    expect(csv).toBe('Name,Note\n"Smith, ""Jo""",\'=SUM(A1)');
  });
});

describe('helpers', () => {
  it('formats values', () => {
    expect(formatDate('2026-03-05')).toMatch(/5 Mar 2026/);
    expect(formatDate(null)).toBe('—');
    expect(formatPercent(40.66)).toBe('40.7%');
    expect(initials('Aarav Mehta')).toBe('AM');
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
  });

  it('handles list inputs and params', () => {
    expect(splitList(' Wi-Fi, Pool ,, ')).toEqual(['Wi-Fi', 'Pool']);
    expect(joinList(['a', 'b'])).toBe('a, b');
    expect(compact({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(cleanParams({ a: '', b: 0, c: null, d: 'x' })).toEqual({ b: 0, d: 'x' });
    expect(toFieldErrors([{ field: 'email', message: 'Taken' }, { message: 'General' }])).toEqual({ email: 'Taken' });
  });
});
