import {
  HOUSEKEEPING_STATUS,
  PRIORITY_ORDER,
  housekeepingCreateSchema,
  housekeepingQuerySchema,
  housekeepingUpdateSchema,
  assignSchema,
  completeTaskSchema,
  humanize,
} from '@homestay/shared';
import { BusinessRuleError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { indexById } from './helpers.js';

const { PENDING, IN_PROGRESS, COMPLETED } = HOUSEKEEPING_STATUS;

export class HousekeepingService {
  constructor({ repositories, clock, activity }) {
    this.repositories = repositories;
    this.tasks = repositories.housekeeping;
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

  #enrich(task, lookups) {
    const today = this.clock.today();
    return {
      ...task,
      roomNumber: lookups.rooms.get(task.roomId)?.number ?? '—',
      propertyName: lookups.properties.get(task.propertyId)?.name ?? '—',
      assigneeName: task.assignedTo ? (lookups.users.get(task.assignedTo)?.name ?? 'Former staff') : null,
      overdue: task.status !== COMPLETED && task.dueDate < today,
      priorityRank: PRIORITY_ORDER[task.priority] ?? 0,
    };
  }

  #requireTask(id) {
    const task = this.tasks.getById(id);
    if (!task) throw new NotFoundError('Housekeeping task');
    return task;
  }

  #requireAssignee(userId) {
    const user = this.repositories.users.getById(userId);
    if (!user || !user.active) throw new BusinessRuleError('Assignee must be an active team member', 'assigneeId');
    return user;
  }

  #requireRoom(roomId) {
    const room = this.repositories.rooms.getById(roomId);
    if (!room) throw new BusinessRuleError('Selected room does not exist', 'roomId');
    return room;
  }

  list(query) {
    const q = validate(housekeepingQuerySchema, query);
    const lookups = this.#lookups();
    const items = this.tasks.getAll().map((task) => this.#enrich(task, lookups));
    return applyQuery(items, {
      ...q,
      searchFields: ['roomNumber', 'propertyName', 'type', 'assigneeName', 'notes'],
      filters: {
        status: q.status,
        priority: q.priority,
        propertyId: q.propertyId,
        roomId: q.roomId,
        assignedTo: q.assignedTo,
      },
      sortFields: {
        dueDate: 'dueDate',
        priority: 'priorityRank',
        status: 'status',
        roomNumber: 'roomNumber',
        createdAt: 'createdAt',
        type: 'type',
      },
      defaultSort: { field: 'dueDate', order: 'asc' },
    });
  }

  get(id) {
    return this.#enrich(this.#requireTask(id), this.#lookups());
  }

  create(payload, actor) {
    const input = validate(housekeepingCreateSchema, payload);
    const room = this.#requireRoom(input.roomId);
    if (input.assignedTo) this.#requireAssignee(input.assignedTo);
    const now = this.clock.nowIso();
    const task = this.tasks.create({
      id: generateId('hk'),
      propertyId: room.propertyId,
      roomId: room.id,
      reservationId: null,
      type: input.type,
      priority: input.priority ?? 'medium',
      status: PENDING,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo ?? null,
      assignedAt: input.assignedTo ? now : null,
      notes: input.notes ?? '',
      startedAt: null,
      completedAt: null,
      createdBy: actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'housekeeping.created',
      entityType: 'housekeeping',
      entityId: task.id,
      message: `${humanize(task.type)} task created for room ${room.number}`,
      actor,
    });
    return this.get(task.id);
  }

  update(id, payload, actor) {
    const existing = this.#requireTask(id);
    if (existing.status === COMPLETED) throw new BusinessRuleError('Completed tasks cannot be edited. Reopen the task first.');
    const input = validate(housekeepingUpdateSchema, payload);
    const patch = { ...input, updatedAt: this.clock.nowIso() };
    if (input.roomId) patch.propertyId = this.#requireRoom(input.roomId).propertyId;
    if (input.assignedTo) this.#requireAssignee(input.assignedTo);
    if (input.assignedTo !== undefined && input.assignedTo !== existing.assignedTo) {
      patch.assignedAt = input.assignedTo ? this.clock.nowIso() : null;
    }
    this.tasks.update(id, patch);
    this.activity.log({
      action: 'housekeeping.updated',
      entityType: 'housekeeping',
      entityId: id,
      message: `Housekeeping task updated`,
      actor,
    });
    return this.get(id);
  }

  delete(id, actor) {
    const existing = this.#requireTask(id);
    this.tasks.delete(id);
    this.activity.log({
      action: 'housekeeping.deleted',
      entityType: 'housekeeping',
      entityId: id,
      message: `${humanize(existing.type)} task deleted`,
      actor,
    });
    return { id };
  }

  assign(id, payload, actor) {
    const { assigneeId } = validate(assignSchema, payload);
    const task = this.#requireTask(id);
    if (task.status === COMPLETED) throw new BusinessRuleError('Completed tasks cannot be reassigned');
    const assignee = this.#requireAssignee(assigneeId);
    const now = this.clock.nowIso();
    this.tasks.update(id, { assignedTo: assigneeId, assignedAt: now, updatedAt: now });
    this.activity.log({
      action: 'housekeeping.assigned',
      entityType: 'housekeeping',
      entityId: id,
      message: `${humanize(task.type)} task assigned to ${assignee.name}`,
      actor,
    });
    return this.get(id);
  }

  start(id, actor) {
    const task = this.#requireTask(id);
    if (task.status !== PENDING) throw new BusinessRuleError('Only pending tasks can be started');
    const now = this.clock.nowIso();
    this.tasks.update(id, {
      status: IN_PROGRESS,
      startedAt: now,
      assignedTo: task.assignedTo ?? actor?.id ?? null,
      assignedAt: task.assignedAt ?? now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'housekeeping.started',
      entityType: 'housekeeping',
      entityId: id,
      message: `${humanize(task.type)} task started`,
      actor,
    });
    return this.get(id);
  }

  complete(id, payload, actor) {
    const { notes } = validate(completeTaskSchema, payload);
    const task = this.#requireTask(id);
    if (task.status === COMPLETED) throw new BusinessRuleError('Task is already completed');
    const now = this.clock.nowIso();
    this.tasks.update(id, {
      status: COMPLETED,
      startedAt: task.startedAt ?? now,
      completedAt: now,
      completedBy: actor?.id ?? null,
      assignedTo: task.assignedTo ?? actor?.id ?? null,
      notes: notes ?? task.notes,
      updatedAt: now,
    });
    const room = this.repositories.rooms.getById(task.roomId);
    this.activity.log({
      action: 'housekeeping.completed',
      entityType: 'housekeeping',
      entityId: id,
      message: `${humanize(task.type)} completed for room ${room?.number ?? ''}`.trim(),
      actor,
    });
    return this.get(id);
  }

  reopen(id, actor) {
    const task = this.#requireTask(id);
    if (task.status !== COMPLETED) throw new BusinessRuleError('Only completed tasks can be reopened');
    this.tasks.update(id, { status: PENDING, startedAt: null, completedAt: null, completedBy: null, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'housekeeping.reopened',
      entityType: 'housekeeping',
      entityId: id,
      message: `${humanize(task.type)} task reopened`,
      actor,
    });
    return this.get(id);
  }
}
