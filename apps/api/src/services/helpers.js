import { ROLES } from '@homestay/shared';

export function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

export function guestFullName(guest) {
  return guest ? `${guest.firstName} ${guest.lastName}` : 'Deleted guest';
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, password, ...safe } = user;
  return safe;
}

export function actorName(actor) {
  return actor?.name ?? 'System';
}

export const ALL_ROLES = Object.values(ROLES);

/** Copies only defined keys from `source`, used to build partial updates. */
export function pickDefined(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}
