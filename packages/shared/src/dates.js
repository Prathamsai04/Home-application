/**
 * Calendar date helpers. Dates are ISO strings in the form YYYY-MM-DD and are
 * manipulated in UTC so that results never depend on the host time zone.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toUtcDate(isoDate) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  return toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * DAY_MS));
}

/** Number of days from `from` to `to` (to - from). */
export function diffDays(from, to) {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / DAY_MS);
}

/** Inclusive list of ISO dates between from and to. */
export function eachDay(from, to) {
  const days = [];
  for (let current = from; current <= to; current = addDays(current, 1)) {
    days.push(current);
  }
  return days;
}

export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Calendar date (YYYY-MM-DD) of an instant in the given IANA time zone. */
export function dateInTimeZone(instant, timeZone = 'UTC') {
  const date = instant instanceof Date ? instant : new Date(instant);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** End-exclusive interval overlap: [aStart, aEnd) intersects [bStart, bEnd). */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** Booking rule: a stay occupies `date` when check_in <= date < check_out. */
export function isNightWithinStay(date, checkIn, checkOut) {
  return checkIn <= date && date < checkOut;
}

/** Number of nights of a stay that fall inside the inclusive [from, to] window. */
export function nightsWithinWindow(checkIn, checkOut, from, to) {
  const start = checkIn > from ? checkIn : from;
  const endExclusive = checkOut < addDays(to, 1) ? checkOut : addDays(to, 1);
  return Math.max(0, diffDays(start, endExclusive));
}

/** Resolves dashboard/report presets into an inclusive date window. */
export function resolveDateRange({ range = '30d', from, to } = {}, today) {
  switch (range) {
    case 'today':
      return { range, from: today, to: today };
    case '7d':
      return { range, from: addDays(today, -6), to: today };
    case 'custom': {
      if (!isIsoDate(from) || !isIsoDate(to)) {
        throw new RangeError('Custom range requires valid from and to dates');
      }
      if (from > to) throw new RangeError('Range start must be before range end');
      if (diffDays(from, to) > 366) throw new RangeError('Custom range cannot exceed 366 days');
      return { range, from, to };
    }
    case '30d':
    default:
      return { range: '30d', from: addDays(today, -29), to: today };
  }
}
