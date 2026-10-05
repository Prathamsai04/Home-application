import {
  MAINTENANCE_STATUS,
  NOTIFICATION_SEVERITY,
  PRIORITY_ORDER,
  assignSchema,
  maintenanceCreateSchema,
  maintenanceQuerySchema,
  maintenanceResolveSchema,
  maintenanceUpdateSchema,
} from '@homestay/shared';
import { BusinessRuleError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { indexById } from './helpers.js';

const { OPEN, ASSIGNED, IN_PROGRESS, RESOLVED } = MAINTENANCE_STATUS;

export class MaintenanceService {
  constructor({ repositories, clock, activity }) {
    this.repositories = repositories;
    this.requests = repositories.maintenance;
    this.clock = clock;
    this.activity = activity;
  }

  #lookups() {
    return {
      rooms: indexById(this.repositories.rooms.getAll()),
      properties: indexById(this.repositories.properties.getAll()),
      users: indexById(this.repositories.users.getAll()),
    };
  }

  #enrich(request, lookups) {
    return {
      ...request,
      roomNumber: lookups.rooms.get(request.roomId)?.number ?? '—',
      propertyName: lookups.properties.get(request.propertyId)?.name ?? '—',
      assigneeName: request.assignedTo ? (lookups.users.get(request.assignedTo)?.name ?? 'Former staff') : null,
      reporterName: lookups.users.get(request.reportedBy)?.name ?? 'System',
      priorityRank: PRIORITY_ORDER[request.priority] ?? 0,
    };
  }

  #require(id) {
    const request = this.requests.getById(id);
    if (!request) throw new NotFoundError('Maintenance request');
    return request;
  }

  #requireAssignee(userId) {
    const user = this.repositories.users.getById(userId);
    if (!user || !user.active) throw new BusinessRuleError('Assignee must be an active team member', 'assigneeId');
    return user;
  }

  list(query) {
    const q = validate(maintenanceQuerySchema, query);
    const lookups = this.#lookups();
    const items = this.requests.getAll().map((request) => this.#enrich(request, lookups));
    return applyQuery(items, {
      ...q,
      searchFields: ['title', 'description', 'roomNumber', 'propertyName', 'category', 'assigneeName'],
      filters: {
        status: q.status,
        priority: q.priority,
        category: q.category,
        propertyId: q.propertyId,
        roomId: q.roomId,
      },
      sortFields: {
        reportedAt: 'reportedAt',
        priority: 'priorityRank',
        status: 'status',
        title: 'title',
        roomNumber: 'roomNumber',
      },
      defaultSort: { field: 'reportedAt', order: 'desc' },
    });
  }

  get(id) {
    return this.#enrich(this.#require(id), this.#lookups());
  }

  create(payload, actor) {
    const input = validate(maintenanceCreateSchema, payload);
    const room = this.repositories.rooms.getById(input.roomId);
    if (!room) throw new BusinessRuleError('Selected room does not exist', 'roomId');
    const now = this.clock.nowIso();
    const request = this.requests.create({
      id: generateId('mnt'),
      propertyId: room.propertyId,
      roomId: room.id,
      title: input.title,
      description: input.description ?? '',
      category: input.category,
      priority: input.priority ?? 'medium',
      blocksRoom: input.blocksRoom ?? false,
      status: OPEN,
      assignedTo: null,
      reportedBy: actor?.id ?? null,
      reportedAt: now,
      assignedAt: null,
      startedAt: null,
      resolvedAt: null,
      resolutionNotes: '',
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'maintenance.created',
      entityType: 'maintenance',
      entityId: request.id,
      message: `Maintenance reported for room ${room.number}: ${request.title}`,
      actor,
    });
    const settings = this.repositories.settings.get();
    if (settings?.notifyOnMaintenance && (request.blocksRoom || ['high', 'urgent'].includes(request.priority))) {
      this.activity.notify({
        type: 'maintenance',
        title: request.priority === 'urgent' ? 'Urgent maintenance reported' : 'Maintenance reported',
        message: `Room ${room.number}: ${request.title}${request.blocksRoom ? ' (room blocked for bookings)' : ''}`,
        severity: request.priority === 'urgent' ? NOTIFICATION_SEVERITY.CRITICAL : NOTIFICATION_SEVERITY.WARNING,
        link: '/maintenance',
      });
    }
    return this.get(request.id);
  }

  update(id, payload, actor) {
    const existing = this.#require(id);
    if (existing.status === RESOLVED) throw new BusinessRuleError('Resolved requests cannot be edited');
    const input = validate(maintenanceUpdateSchema, payload);
    const patch = { ...input, updatedAt: this.clock.nowIso() };
    if (input.roomId) {
      const room = this.repositories.rooms.getById(input.roomId);
      if (!room) throw new BusinessRuleError('Selected room does not exist', 'roomId');
      patch.propertyId = room.propertyId;
    }
    this.requests.update(id, patch);
    this.activity.log({
      action: 'maintenance.updated',
      entityType: 'maintenance',
      entityId: id,
      message: `Maintenance request "${input.title ?? existing.title}" updated`,
      actor,
    });
    return this.get(id);
  }

  delete(id, actor) {
    const existing = this.#require(id);
    this.requests.delete(id);
    this.activity.log({
      action: 'maintenance.deleted',
      entityType: 'maintenance',
      entityId: id,
      message: `Maintenance request "${existing.title}" deleted`,
      actor,
    });
    return { id };
  }

  assign(id, payload, actor) {
    const { assigneeId } = validate(assignSchema, payload);
    const request = this.#require(id);
    if (request.status === RESOLVED) throw new BusinessRuleError('Resolved requests cannot be reassigned');
    const assignee = this.#requireAssignee(assigneeId);
    const now = this.clock.nowIso();
    this.requests.update(id, {
      assignedTo: assigneeId,
      assignedAt: now,
      status: request.status === IN_PROGRESS ? IN_PROGRESS : ASSIGNED,
      updatedAt: now,
    });
    this.activity.log({
      action: 'maintenance.assigned',
      entityType: 'maintenance',
      entityId: id,
      message: `"${request.title}" assigned to ${assignee.name}`,
      actor,
    });
    return this.get(id);
  }

  start(id, actor) {
    const request = this.#require(id);
    if (request.status === OPEN) throw new BusinessRuleError('Assign the request before starting work');
    if (request.status !== ASSIGNED) throw new BusinessRuleError('Only assigned requests can be started');
    const now = this.clock.nowIso();
    this.requests.update(id, { status: IN_PROGRESS, startedAt: now, updatedAt: now });
    this.activity.log({
      action: 'maintenance.started',
      entityType: 'maintenance',
      entityId: id,
      message: `Work started on "${request.title}"`,
      actor,
    });
    return this.get(id);
  }

  resolve(id, payload, actor) {
    const { resolutionNotes } = validate(maintenanceResolveSchema, payload);
    const request = this.#require(id);
    if (request.status === OPEN) throw new BusinessRuleError('Assign the request before resolving it');
    if (request.status === RESOLVED) throw new BusinessRuleError('Request is already resolved');
    const now = this.clock.nowIso();
    this.requests.update(id, {
      status: RESOLVED,
      resolvedAt: now,
      startedAt: request.startedAt ?? now,
      resolutionNotes,
      updatedAt: now,
    });
    this.activity.log({
      action: 'maintenance.resolved',
      entityType: 'maintenance',
      entityId: id,
      message: `"${request.title}" resolved${request.blocksRoom ? ' - room available for booking again' : ''}`,
      actor,
    });
    return this.get(id);
  }
}
