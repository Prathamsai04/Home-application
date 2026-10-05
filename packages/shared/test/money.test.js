import { describe, expect, it } from 'vitest';
import {
  divideMinor,
  formatMoney,
  fromMinorUnits,
  isValidMoneyInput,
  multiplyMinor,
  sumMinor,
  toMinorUnits,
} from '../src/money.js';

describe('money utilities', () => {
  it('parses decimal strings into integer minor units without float errors', () => {
    expect(toMinorUnits('1500')).toBe(150000);
    expect(toMinorUnits('1,500.5')).toBe(150050);
    expect(toMinorUnits('0.10')).toBe(10);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits('0.29')).toBe(29);
  });

  it('rejects invalid inputs', () => {
    expect(() => toMinorUnits('abc')).toThrow(RangeError);
    expect(() => toMinorUnits('10.123')).toThrow(RangeError);
    expect(() => toMinorUnits(0.1 + 0.2)).toThrow(RangeError);
    expect(isValidMoneyInput('-5')).toBe(false);
    expect(isValidMoneyInput('12.5')).toBe(true);
  });

  it('round trips to decimal strings', () => {
    expect(fromMinorUnits(150050)).toBe('1500.50');
    expect(fromMinorUnits(5)).toBe('0.05');
    expect(fromMinorUnits(-2500)).toBe('-25.00');
  });

  it('sums, multiplies and divides using integer arithmetic', () => {
    expect(sumMinor([10, 20, 1])).toBe(31);
    expect(multiplyMinor(250050, 3)).toBe(750150);
    expect(divideMinor(1000, 3)).toBe(333);
    expect(divideMinor(1001, 2)).toBe(501);
    expect(divideMinor(100, 0)).toBe(0);
    expect(() => sumMinor([1.5])).toThrow(RangeError);
  });

  it('formats currency values', () => {
    expect(formatMoney(150050, 'INR', 'en-IN')).toBe('₹1,500.50');
    expect(formatMoney(12345678, 'USD', 'en-US')).toBe('$123,456.78');
    expect(formatMoney(-500, 'USD', 'en-US')).toBe('-$5.00');
  });
});
