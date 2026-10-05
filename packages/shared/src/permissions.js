import { ROLES } from './constants.js';

const { OWNER, MANAGER, STAFF } = ROLES;
const ALL = [OWNER, MANAGER, STAFF];
const LEADERSHIP = [OWNER, MANAGER];

/**
 * Role based access control matrix shared by the API (authorization middleware)
 * and the web app (role-aware navigation and action visibility).
 */
export const PERMISSIONS = Object.freeze({
  'dashboard:view': ALL,

  'properties:view': ALL,
  'properties:manage': LEADERSHIP,
  'properties:delete': [OWNER],

  'rooms:view': ALL,
  'rooms:manage': LEADERSHIP,
  'rooms:delete': LEADERSHIP,

  'guests:view': ALL,
  'guests:manage': ALL,
  'guests:delete': LEADERSHIP,

  'reservations:view': ALL,
  'reservations:manage': ALL,
  'reservations:operate': ALL,

  'payments:view': LEADERSHIP,
  'payments:manage': LEADERSHIP,

  'housekeeping:view': ALL,
  'housekeeping:manage': LEADERSHIP,
  'housekeeping:operate': ALL,

  'maintenance:view': ALL,
  'maintenance:create': ALL,
  'maintenance:manage': LEADERSHIP,
  'maintenance:operate': ALL,

  'reports:view': LEADERSHIP,

  'notifications:view': ALL,
  'notifications:broadcast': LEADERSHIP,

  'settings:view': ALL,
  'settings:manage': [OWNER],

  'users:view': LEADERSHIP,
  'users:manage': [OWNER],

  'demo:manage': LEADERSHIP,
});

export function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function permissionsForRole(role) {
  return Object.keys(PERMISSIONS).filter((permission) => can(role, permission));
}
