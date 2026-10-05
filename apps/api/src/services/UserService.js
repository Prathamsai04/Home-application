import {
  HOUSEKEEPING_STATUS,
  MAINTENANCE_STATUS,
  ROLES,
  userCreateSchema,
  userQuerySchema,
  userUpdateSchema,
} from '@homestay/shared';
import { BusinessRuleError, ConflictError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId, hashPassword } from '../core/security.js';
import { validate } from '../core/validate.js';
import { sanitizeUser } from './helpers.js';

export class UserService {
  constructor({ repositories, clock, activity }) {
    this.repositories = repositories;
    this.users = repositories.users;
    this.clock = clock;
    this.activity = activity;
  }

  #require(id) {
    const user = this.users.getById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  #activeOwners() {
    return this.users.findWhere((user) => user.role === ROLES.OWNER && user.active);
  }

  list(query) {
    const q = validate(userQuerySchema, query);
    const items = this.users.getAll().map(sanitizeUser);
    return applyQuery(items, {
      ...q,
      searchFields: ['name', 'email', 'jobTitle', 'phone'],
      filters: { role: q.role, active: q.active },
      sortFields: { name: 'name', email: 'email', role: 'role', createdAt: 'createdAt', lastLoginAt: 'lastLoginAt' },
      defaultSort: { field: 'name', order: 'asc' },
    });
  }

  get(id) {
    return sanitizeUser(this.#require(id));
  }

  create(payload, actor) {
    const { password, ...input } = validate(userCreateSchema, payload);
    if (this.users.findByEmail(input.email)) throw new ConflictError('A user with this email already exists', 'email');
    const now = this.clock.nowIso();
    const user = this.users.create({
      id: generateId('user'),
      phone: '',
      jobTitle: '',
      active: true,
      ...input,
      passwordHash: hashPassword(password),
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      message: `User ${user.name} (${user.role}) created`,
      actor,
    });
    return sanitizeUser(user);
  }

  update(id, payload, actor) {
    const existing = this.#require(id);
    const { password, ...input } = validate(userUpdateSchema, payload);
    if (input.email && input.email !== existing.email && this.users.findByEmail(input.email)) {
      throw new ConflictError('A user with this email already exists', 'email');
    }
    if (id === actor?.id && input.active === false) {
      throw new BusinessRuleError('You cannot deactivate your own account', 'active');
    }
    const losesOwnership =
      existing.role === ROLES.OWNER &&
      existing.active &&
      ((input.role && input.role !== ROLES.OWNER) || input.active === false);
    if (losesOwnership && this.#activeOwners().length <= 1) {
      throw new BusinessRuleError('At least one active owner is required', 'role');
    }
    const patch = { ...input, updatedAt: this.clock.nowIso() };
    if (password) patch.passwordHash = hashPassword(password);
    const user = this.users.update(id, patch);
    this.activity.log({
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      message: `User ${user.name} updated`,
      actor,
    });
    return sanitizeUser(user);
  }

  delete(id, actor) {
    const existing = this.#require(id);
    if (id === actor?.id) throw new BusinessRuleError('You cannot delete your own account');
    if (existing.role === ROLES.OWNER && existing.active && this.#activeOwners().length <= 1) {
      throw new BusinessRuleError('At least one active owner is required');
    }
    this.users.delete(id);

    const now = this.clock.nowIso();
    this.repositories.housekeeping
      .findWhere((task) => task.assignedTo === id && task.status !== HOUSEKEEPING_STATUS.COMPLETED)
      .forEach((task) => this.repositories.housekeeping.update(task.id, { assignedTo: null, assignedAt: null, updatedAt: now }));
    this.repositories.maintenance
      .findWhere((request) => request.assignedTo === id && request.status !== MAINTENANCE_STATUS.RESOLVED)
      .forEach((request) =>
        this.repositories.maintenance.update(request.id, {
          assignedTo: null,
          assignedAt: null,
          status: request.status === MAINTENANCE_STATUS.ASSIGNED ? MAINTENANCE_STATUS.OPEN : request.status,
          updatedAt: now,
        }),
      );

    this.activity.log({
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      message: `User ${existing.name} deleted`,
      actor,
    });
    return { id };
  }
}
