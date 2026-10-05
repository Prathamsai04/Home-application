export const ROLES = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF: 'staff',
});

export const RESERVATION_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
});

/** Reservation statuses that hold inventory and therefore block a room. */
export const BLOCKING_RESERVATION_STATUSES = Object.freeze([
  RESERVATION_STATUS.PENDING,
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.CHECKED_IN,
]);

/** Reservation statuses that count as sold room nights for occupancy. */
export const OCCUPANCY_RESERVATION_STATUSES = Object.freeze([
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.CHECKED_IN,
  RESERVATION_STATUS.CHECKED_OUT,
]);

export const RESERVATION_SOURCES = Object.freeze(['direct', 'website', 'airbnb', 'booking_com', 'walk_in', 'phone']);

export const ROOM_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
});

export const ROOM_TYPES = Object.freeze(['single', 'double', 'deluxe', 'suite', 'family', 'cottage']);

export const PROPERTY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  UPI: 'upi',
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  REFUNDED: 'refunded',
});

export const TRANSACTION_TYPES = Object.freeze({
  PAYMENT: 'payment',
  REFUND: 'refund',
});

export const PRIORITIES = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

export const PRIORITY_ORDER = Object.freeze({ low: 1, medium: 2, high: 3, urgent: 4 });

export const HOUSEKEEPING_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
});

export const HOUSEKEEPING_TYPES = Object.freeze([
  'checkout_clean',
  'daily_service',
  'deep_clean',
  'linen_change',
  'inspection',
]);

export const MAINTENANCE_STATUS = Object.freeze({
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
});

export const MAINTENANCE_CATEGORIES = Object.freeze([
  'plumbing',
  'electrical',
  'hvac',
  'furniture',
  'appliance',
  'internet',
  'other',
]);

export const NOTIFICATION_SEVERITY = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  CRITICAL: 'critical',
});

export const CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP']);

export const DASHBOARD_RANGES = Object.freeze(['today', '7d', '30d', 'custom']);

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
});

export const DEMO_USERS_PASSWORD = 'Password123!';

const LABEL_OVERRIDES = {
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  no_show: 'No Show',
  partially_paid: 'Partially Paid',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  booking_com: 'Booking.com',
  walk_in: 'Walk-in',
  in_progress: 'In Progress',
  hvac: 'HVAC',
  checkout_clean: 'Checkout Clean',
  daily_service: 'Daily Service',
  deep_clean: 'Deep Clean',
  linen_change: 'Linen Change',
};

/** Converts a machine value such as `checked_in` into a human label. */
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '';
  const key = String(value);
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
