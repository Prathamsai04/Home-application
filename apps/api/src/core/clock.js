import { dateInTimeZone } from '@homestay/shared';

/**
 * Clock abstraction so business rules depending on "today" are deterministic
 * in tests. `getTimeZone` is resolved on every call so settings changes apply.
 */
export function createClock({ getTimeZone = () => 'UTC', fixedNow } = {}) {
  const now = () => (fixedNow ? new Date(fixedNow) : new Date());
  return {
    now,
    nowIso: () => now().toISOString(),
    timeZone: () => getTimeZone(),
    today: () => dateInTimeZone(now(), getTimeZone()),
    dateOf: (instant) => dateInTimeZone(instant, getTimeZone()),
  };
}
