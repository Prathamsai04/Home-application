import { z } from 'zod';
import {
  CURRENCIES,
  PROPERTY_STATUS,
  ROLES,
  ROOM_STATUS,
  ROOM_TYPES,
} from '../constants.js';
import {
  emailSchema,
  idSchema,
  listQueryShape,
  optionalText,
  phoneSchema,
  positiveMoneyInputSchema,
  queryBooleanSchema,
  requiredText,
  timeSchema,
  timeZoneSchema,
} from './common.js';

/* ---------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
});

/* -------------------------------- Properties ------------------------------- */

const addressSchema = z.object({
  line1: requiredText('Address line', 160),
  city: requiredText('City', 80),
  state: requiredText('State', 80),
  country: requiredText('Country', 80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,12}$/, 'Enter a valid postal code'),
});

export const propertyBaseSchema = z.object({
  name: requiredText('Property name', 120),
  code: z
    .string({ error: 'Code is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, 'Code must be 2-6 letters or digits'),
  description: optionalText(1000),
  address: addressSchema,
  phone: phoneSchema,
  email: emailSchema,
  checkInTime: timeSchema,
  checkOutTime: timeSchema,
  status: z.enum(Object.values(PROPERTY_STATUS)),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30),
});

export const propertyCreateSchema = propertyBaseSchema.extend({
  description: optionalText(1000),
  status: z.enum(Object.values(PROPERTY_STATUS)).optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  checkInTime: timeSchema.optional(),
  checkOutTime: timeSchema.optional(),
});

export const propertyUpdateSchema = propertyBaseSchema.partial();

export const propertyQuerySchema = z.object({
  ...listQueryShape,
  status: z.enum(Object.values(PROPERTY_STATUS)).optional(),
  city: z.string().trim().max(80).optional(),
});

/* ---------------------------------- Rooms ---------------------------------- */

export const roomBaseSchema = z.object({
  propertyId: idSchema,
  number: z.string({ error: 'Room number is required' }).trim().regex(/^[A-Za-z0-9-]{1,10}$/, 'Use 1-10 letters, digits or dashes'),
  name: requiredText('Room name', 80),
  type: z.enum(ROOM_TYPES),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(12, 'Capacity cannot exceed 12'),
  floor: z.coerce.number().int().min(0).max(50),
  baseRate: positiveMoneyInputSchema,
  amenities: z.array(z.string().trim().min(1).max(40)).max(30),
  active: z.boolean(),
  description: optionalText(500),
});

export const roomCreateSchema = roomBaseSchema.extend({
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  active: z.boolean().optional(),
  floor: z.coerce.number().int().min(0).max(50).optional(),
});

export const roomUpdateSchema = roomBaseSchema.partial();

export const roomQuerySchema = z.object({
  ...listQueryShape,
  propertyId: idSchema.optional(),
  type: z.enum(ROOM_TYPES).optional(),
  status: z.enum(Object.values(ROOM_STATUS)).optional(),
});

/* ---------------------------------- Guests --------------------------------- */

export const guestBaseSchema = z.object({
  firstName: requiredText('First name', 60),
  lastName: requiredText('Last name', 60),
  email: emailSchema,
  phone: phoneSchema,
  nationality: requiredText('Nationality', 60),
  idType: z.enum(['passport', 'national_id', 'driving_license', 'other']),
  idNumberLast4: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{0,4}$/, 'Store at most the last 4 characters of the ID')
    .optional(),
  city: optionalText(80),
  notes: optionalText(1000),
  vip: z.boolean(),
});

export const guestCreateSchema = guestBaseSchema.extend({
  vip: z.boolean().optional(),
});

export const guestUpdateSchema = guestBaseSchema.partial();

export const guestQuerySchema = z.object({
  ...listQueryShape,
  vip: queryBooleanSchema.optional(),
  nationality: z.string().trim().max(60).optional(),
});

/* ---------------------------------- Users ---------------------------------- */

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[0-9]/, 'Password needs a digit');

export const userBaseSchema = z.object({
  name: requiredText('Name', 80),
  email: emailSchema,
  role: z.enum(Object.values(ROLES)),
  phone: phoneSchema.optional(),
  jobTitle: optionalText(80),
  active: z.boolean(),
  password: passwordSchema,
});

export const userCreateSchema = userBaseSchema.extend({
  active: z.boolean().optional(),
});

export const userUpdateSchema = userBaseSchema.partial();

export const userQuerySchema = z.object({
  ...listQueryShape,
  role: z.enum(Object.values(ROLES)).optional(),
  active: queryBooleanSchema.optional(),
});

/* --------------------------------- Settings -------------------------------- */

export const settingsSchema = z.object({
  businessName: requiredText('Business name', 120),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  currency: z.enum(CURRENCIES),
  timezone: timeZoneSchema,
  defaultCheckInTime: timeSchema,
  defaultCheckOutTime: timeSchema,
  autoCreateCheckoutTask: z.boolean(),
  notifyOnNewReservation: z.boolean(),
  notifyOnMaintenance: z.boolean(),
  notifyOnPayment: z.boolean(),
});

export const settingsUpdateSchema = settingsSchema.partial();
