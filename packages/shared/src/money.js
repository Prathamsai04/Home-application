/**
 * Decimal-safe money utilities.
 *
 * All monetary values are stored and calculated as integer minor units
 * (paise / cents). Decimal input is parsed with string operations and never
 * through floating point arithmetic.
 */

export const MONEY_PATTERN = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

function assertMinor(value, label = 'amount') {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be an integer number of minor units`);
  }
}

export function isValidMoneyInput(value) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim().replace(/,/g, '');
  return MONEY_PATTERN.test(str);
}

/** Parses "1,500.5" / "1500.50" / 1500 into integer minor units (150050). */
export function toMinorUnits(value) {
  const str = String(value ?? '').trim().replace(/,/g, '');
  const match = MONEY_PATTERN.exec(str);
  if (!match) {
    throw new RangeError('Invalid monetary amount. Use up to 2 decimal places.');
  }
  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);
  const result = major * 100 + minor;
  assertMinor(result);
  return result;
}

/** Converts minor units into a plain decimal string, e.g. 150050 -> "1500.50". */
export function fromMinorUnits(minor) {
  assertMinor(minor);
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const cents = abs % 100;
  const major = (abs - cents) / 100;
  return `${sign}${major}.${String(cents).padStart(2, '0')}`;
}

export function sumMinor(values) {
  return values.reduce((total, value) => {
    assertMinor(value);
    return total + value;
  }, 0);
}

export function multiplyMinor(minor, quantity) {
  assertMinor(minor);
  if (!Number.isSafeInteger(quantity)) throw new RangeError('quantity must be an integer');
  const result = minor * quantity;
  assertMinor(result, 'result');
  return result;
}

/** Integer division with half-up rounding, without floating point arithmetic. */
export function divideMinor(minor, divisor) {
  assertMinor(minor);
  if (!Number.isSafeInteger(divisor) || divisor === 0) return 0;
  const negative = minor < 0 !== divisor < 0;
  const a = Math.abs(minor);
  const b = Math.abs(divisor);
  const remainder = a % b;
  let quotient = (a - remainder) / b;
  if (remainder * 2 >= b) quotient += 1;
  return negative ? -quotient : quotient;
}

const formatterCache = new Map();

function getFormatter(currency, locale) {
  const key = `${locale}|${currency}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    );
  }
  return formatterCache.get(key);
}

/** Formats minor units for display, e.g. 150050 -> "₹1,500.50". */
export function formatMoney(minor, currency = 'INR', locale = 'en-IN') {
  const value = Number.isSafeInteger(minor) ? minor : 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const cents = abs % 100;
  const major = (abs - cents) / 100;
  const parts = getFormatter(currency, locale).formatToParts(major);
  const lastIntegerIndex = parts.findLastIndex((part) => part.type === 'integer');
  let output = '';
  parts.forEach((part, index) => {
    output += part.value;
    if (index === lastIntegerIndex) output += `.${String(cents).padStart(2, '0')}`;
  });
  return `${sign}${output}`;
}

/** Non-financial percentage helper used for occupancy style ratios. */
export function percentage(numerator, denominator, decimals = 1) {
  if (!denominator) return 0;
  const factor = 10 ** decimals;
  return Math.round((numerator / denominator) * 100 * factor) / factor;
}
