import { z } from 'zod';
import {
  DASHBOARD_RANGES,
  HOUSEKEEPING_STATUS,
  HOUSEKEEPING_TYPES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUS,
  NOTIFICATION_SEVERITY,
  PAYMENT_METHODS,
  PRIORITIES,
  RESERVATION_SOURCES,
  RESERVATION_STATUS,
  ROLES,
  TRANSACTION_TYPES,
} from '../constants.js';
import {
  idSchema,
  isoDateSchema,
  listQueryShape,
  optionalText,
  positiveMoneyInputSchema,
  queryBooleanSchema,
  requiredText,
} from './common.js';

/* ------------------------------- Reservations ------------------------------ */

const checkOutAfterCheckIn = {
  message: 'Check-out must be after check-in',
  path: ['checkOut'],
};

export const reservationShape = {
  roomId: idSchema,
  guestId: idSchema,
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  adults: z.coerce.number().int().min(1, 'At least one adult is required').max(12),
  children: z.coerce.number().int().min(0).max(12),
  source: z.enum(RESERVATION_SOURCES),
  nightlyRate: positiveMoneyInputSchema.optional(),
  notes: optionalText(1000),
  specialRequests: optionalText(500),
};

export const reservationCreateSchema = z
  .object({
    ...reservationShape,
    children: reservationShape.children.optional(),
    source: reservationShape.source.optional(),
    status: z.enum([RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED]).optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, checkOutAfterCheckIn);

export const reservationUpdateSchema = z
  .object(reservationShape)
  .partial()
  .refine((data) => !(data.checkIn && data.checkOut) || data.checkOut > data.checkIn, checkOutAfterCheckIn);

export const reservationCancelSchema = z.object({
  reason: optionalText(300),
});

export const reservationQuerySchema = z.object({
  ...listQueryShape,
  status: z.enum(Object.values(RESERVATION_STATUS)).optional(),
  propertyId: idSchema.optional(),
  roomId: idSchema.optional(),
  guestId: idSchema.optional(),
  source: z.enum(RESERVATION_SOURCES).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const availabilityQuerySchema = z
  .object({
    propertyId: idSchema.optional(),
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(12).default(1),
    excludeReservationId: idSchema.optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, checkOutAfterCheckIn);

/* --------------------------------- Payments -------------------------------- */

/** Luhn check used to reject anything that looks like a full card number. */
export function looksLikeCardNumber(value) {
  const digits = String(value ?? '').replace(/[\s-]/g, '');
  const candidates = digits.match(/\d{13,19}/g) ?? [];
  return candidates.some((candidate) => {
    let sum = 0;
    let double = false;
    for (let i = candidate.length - 1; i >= 0; i -= 1) {
      let digit = Number(candidate[i]);
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    return sum % 10 === 0;
  });
}

const safeReference = optionalText(60).refine(
  (value) => !value || !looksLikeCardNumber(value),
  'Never enter full card or bank account numbers',
);

const safeNotes = optionalText(500).refine(
  (value) => !value || !looksLikeCardNumber(value),
  'Never enter full card or bank account numbers',
);

export const paymentCreateSchema = z.object({
  reservationId: idSchema,
  amount: positiveMoneyInputSchema,
  method: z.enum(Object.values(PAYMENT_METHODS)),
  reference: safeReference,
  cardLast4: z.string().trim().regex(/^\d{4}$/, 'Enter only the last 4 digits').optional(),
  notes: safeNotes,
});

export const refundCreateSchema = z.object({
  reservationId: idSchema,
  amount: positiveMoneyInputSchema,
  method: z.enum(Object.values(PAYMENT_METHODS)),
  reason: requiredText('Refund reason', 300),
  reference: safeReference,
});

export const paymentUpdateSchema = z.object({
  reference: safeReference,
  notes: safeNotes,
});

export const paymentQuerySchema = z.object({
  ...listQueryShape,
  reservationId: idSchema.optional(),
  method: z.enum(Object.values(PAYMENT_METHODS)).optional(),
  type: z.enum(Object.values(TRANSACTION_TYPES)).optional(),
  propertyId: idSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/* ------------------------------- Housekeeping ------------------------------ */

const housekeepingShape = {
  roomId: idSchema,
  type: z.enum(HOUSEKEEPING_TYPES),
  priority: z.enum(Object.values(PRIORITIES)),
  dueDate: isoDateSchema,
  assignedTo: idSchema.nullable().optional(),
  notes: optionalText(500),
};

export const housekeepingCreateSchema = z.object({
  ...housekeepingShape,
  priority: housekeepingShape.priority.optional(),
});

export const housekeepingUpdateSchema = z.object(housekeepingShape).partial();

export const housekeepingQuerySchema = z.object({
  ...listQueryShape,
  status: z.enum(Object.values(HOUSEKEEPING_STATUS)).optional(),
  priority: z.enum(Object.values(PRIORITIES)).optional(),
  propertyId: idSchema.optional(),
  roomId: idSchema.optional(),
  assignedTo: idSchema.optional(),
});

export const assignSchema = z.object({
  assigneeId: idSchema,
});

export const completeTaskSchema = z.object({
  notes: optionalText(500),
});

/* ------------------------------- Maintenance ------------------------------- */

const maintenanceShape = {
  roomId: idSchema,
  title: requiredText('Title', 120),
  description: optionalText(1000),
  category: z.enum(MAINTENANCE_CATEGORIES),
  priority: z.enum(Object.values(PRIORITIES)),
  blocksRoom: z.boolean(),
};

export const maintenanceCreateSchema = z.object({
  ...maintenanceShape,
  priority: maintenanceShape.priority.optional(),
  blocksRoom: maintenanceShape.blocksRoom.optional(),
});

export const maintenanceUpdateSchema = z.object(maintenanceShape).partial();

export const maintenanceResolveSchema = z.object({
  resolutionNotes: requiredText('Resolution notes', 500),
});

export const maintenanceQuerySchema = z.object({
  ...listQueryShape,
  status: z.enum(Object.values(MAINTENANCE_STATUS)).optional(),
  priority: z.enum(Object.values(PRIORITIES)).optional(),
  category: z.enum(MAINTENANCE_CATEGORIES).optional(),
  propertyId: idSchema.optional(),
  roomId: idSchema.optional(),
});

/* ------------------------------ Notifications ------------------------------ */

export const notificationBroadcastSchema = z.object({
  title: requiredText('Title', 100),
  message: requiredText('Message', 500),
  severity: z.enum(Object.values(NOTIFICATION_SEVERITY)),
  roles: z.array(z.enum(Object.values(ROLES))).min(1, 'Select at least one audience'),
});

export const notificationQuerySchema = z.object({
  ...listQueryShape,
  unreadOnly: queryBooleanSchema.optional(),
  severity: z.enum(Object.values(NOTIFICATION_SEVERITY)).optional(),
});

/* ---------------------------- Dashboard / Reports -------------------------- */

export const dateRangeQuerySchema = z.object({
  range: z.enum(DASHBOARD_RANGES).default('30d'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  propertyId: idSchema.optional(),
});
