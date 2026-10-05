import {
  BLOCKING_RESERVATION_STATUSES,
  MAINTENANCE_STATUS,
  availabilityQuerySchema,
  roomCreateSchema,
  roomQuerySchema,
  roomUpdateSchema,
  toMinorUnits,
} from '@homestay/shared';
import { ConflictError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';
import { guestFullName, indexById } from './helpers.js';

export class RoomService {
  constructor({ repositories, clock, activity, availability }) {
    this.repositories = repositories;
    this.rooms = repositories.rooms;
    this.properties = repositories.properties;
    this.clock = clock;
    this.activity = activity;
    this.availability = availability;
  }

  list(query) {
    const q = validate(roomQuerySchema, query);
    const properties = indexById(this.properties.getAll());
    const items = this.availability.withStatus(this.rooms.getAll()).map((room) => ({
      ...room,
      propertyName: properties.get(room.propertyId)?.name ?? 'Unknown property',
    }));
    return applyQuery(items, {
      ...q,
      searchFields: ['number', 'name', 'type', 'propertyName'],
      filters: { propertyId: q.propertyId, type: q.type, status: q.status },
      sortFields: {
        number: 'number',
        name: 'name',
        type: 'type',
        capacity: 'capacity',
        baseRate: 'baseRateMinor',
        status: 'status',
        propertyName: 'propertyName',
      },
      defaultSort: { field: 'propertyName', order: 'asc' },
    });
  }

  get(id) {
    const room = this.rooms.getById(id);
    if (!room) throw new NotFoundError('Room');
    const today = this.clock.today();
    const guests = indexById(this.repositories.guests.getAll());
    const [withStatus] = this.availability.withStatus([room]);
    const upcoming = this.repositories.reservations
      .findByRoom(id)
      .filter((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status) && r.checkOut >= today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, 10)
      .map((r) => ({ ...r, guestName: guestFullName(guests.get(r.guestId)) }));
    const maintenance = this.repositories.maintenance
      .findByRoom(id)
      .filter((request) => request.status !== MAINTENANCE_STATUS.RESOLVED);
    return {
      ...withStatus,
      property: this.properties.getById(room.propertyId),
      upcomingReservations: upcoming,
      openMaintenance: maintenance,
    };
  }

  availabilitySearch(query) {
    const q = validate(availabilityQuerySchema, query);
    return this.availability.search(q);
  }

  create(payload, actor) {
    const { baseRate, ...input } = validate(roomCreateSchema, payload);
    const property = this.properties.getById(input.propertyId);
    if (!property) throw new NotFoundError('Property');
    if (this.rooms.findByNumber(input.propertyId, input.number)) {
      throw new ConflictError(`Room ${input.number} already exists at ${property.name}`, 'number');
    }
    const now = this.clock.nowIso();
    const room = this.rooms.create({
      id: generateId('room'),
      amenities: [],
      active: true,
      floor: 0,
      description: '',
      ...input,
      baseRateMinor: toMinorUnits(baseRate),
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'room.created',
      entityType: 'room',
      entityId: room.id,
      message: `Room ${room.number} added to ${property.name}`,
      actor,
    });
    return this.availability.withStatus([room])[0];
  }

  update(id, payload, actor) {
    const existing = this.rooms.getById(id);
    if (!existing) throw new NotFoundError('Room');
    const { baseRate, ...input } = validate(roomUpdateSchema, payload);
    const propertyId = input.propertyId ?? existing.propertyId;
    const property = this.properties.getById(propertyId);
    if (!property) throw new NotFoundError('Property');
    const number = input.number ?? existing.number;
    const duplicate = this.rooms.findByNumber(propertyId, number);
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(`Room ${number} already exists at ${property.name}`, 'number');
    }
    if (input.propertyId && input.propertyId !== existing.propertyId) {
      const hasActive = this.repositories.reservations
        .findByRoom(id)
        .some((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status));
      if (hasActive) {
        throw new ConflictError('Rooms with active or upcoming reservations cannot move to another property', 'propertyId');
      }
    }
    const patch = { ...input, updatedAt: this.clock.nowIso() };
    if (baseRate !== undefined) patch.baseRateMinor = toMinorUnits(baseRate);
    const room = this.rooms.update(id, patch);
    this.activity.log({
      action: 'room.updated',
      entityType: 'room',
      entityId: id,
      message: `Room ${room.number} at ${property.name} updated`,
      actor,
    });
    return this.availability.withStatus([room])[0];
  }

  delete(id, actor) {
    const existing = this.rooms.getById(id);
    if (!existing) throw new NotFoundError('Room');
    const blocking = this.repositories.reservations
      .findByRoom(id)
      .filter((r) => BLOCKING_RESERVATION_STATUSES.includes(r.status));
    if (blocking.length) {
      throw new ConflictError(`Room has ${blocking.length} active or upcoming reservation(s). Cancel or move them first.`);
    }
    this.rooms.delete(id);
    this.activity.log({
      action: 'room.deleted',
      entityType: 'room',
      entityId: id,
      message: `Room ${existing.number} deleted`,
      actor,
    });
    return { id };
  }
}
