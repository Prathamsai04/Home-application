import { z } from 'zod';
import { isIsoDate, isValidTimeZone } from '../dates.js';
import { isValidMoneyInput } from '../money.js';
import { PAGINATION } from '../constants.js';

export const idSchema = z.string({ error: 'Please make a selection' }).trim().min(1, 'Please make a selection').max(64);

export const requiredText = (label, max = 120) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

export const optionalText = (max = 500) => z.string().trim().max(max, `Must be at most ${max} characters`).optional();

export const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(160)
  .email('Enter a valid email address');

export const phoneSchema = z
  .string({ error: 'Phone is required' })
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,19}$/, 'Enter a valid phone number');

export const isoDateSchema = z
  .string({ error: 'Date is required' })
  .trim()
  .refine(isIsoDate, 'Enter a valid date (YYYY-MM-DD)');

export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h time HH:mm');

export const timeZoneSchema = z.string().trim().refine(isValidTimeZone, 'Unknown time zone');

/** Accepts "1500", "1,500.50" or 1500.5 and normalises it to a decimal string. */
export const moneyInputSchema = z
  .union([z.string(), z.number()], { error: 'Amount is required' })
  .transform((value) => String(value).trim().replace(/,/g, ''))
  .refine(isValidMoneyInput, 'Enter a valid amount with up to 2 decimal places');

export const positiveMoneyInputSchema = moneyInputSchema.refine(
  (value) => /[1-9]/.test(value),
  'Amount must be greater than zero',
);

export const queryBooleanSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

export const listQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().trim().max(40).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
};

export const listQuerySchema = z.object(listQueryShape);
