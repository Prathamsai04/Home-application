import {
  PROPERTY_STATUS,
  propertyCreateSchema,
  propertyQuerySchema,
  propertyUpdateSchema,
} from '@homestay/shared';
import { ConflictError, NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { generateId } from '../core/security.js';
import { validate } from '../core/validate.js';

export class PropertyService {
  constructor({ repositories, clock, activity, availability }) {
    this.properties = repositories.properties;
    this.rooms = repositories.rooms;
    this.clock = clock;
    this.activity = activity;
    this.availability = availability;
  }

  #withStats(property, rooms, context) {
    const own = rooms.filter((room) => room.propertyId === property.id);
    const statuses = this.availability.withStatus(own, context);
    return {
      ...property,
      roomCount: own.length,
      occupiedRooms: statuses.filter((room) => room.status === 'occupied').length,
      availableRooms: statuses.filter((room) => room.status === 'available').length,
    };
  }

  list(query) {
    const q = validate(propertyQuerySchema, query);
    const rooms = this.rooms.getAll();
    const context = this.availability.buildContext();
    const items = this.properties.getAll().map((property) => this.#withStats(property, rooms, context));
    return applyQuery(items, {
      ...q,
      searchFields: ['name', 'code', 'address.city', 'address.state', 'email'],
      filters: {
        status: q.status,
        city: q.city ? (p) => p.address.city.toLowerCase() === q.city.toLowerCase() : undefined,
      },
      sortFields: { name: 'name', code: 'code', city: 'address.city', roomCount: 'roomCount', createdAt: 'createdAt', status: 'status' },
      defaultSort: { field: 'name', order: 'asc' },
    });
  }

  get(id) {
    const property = this.properties.getById(id);
    if (!property) throw new NotFoundError('Property');
    const rooms = this.rooms.getAll();
    const context = this.availability.buildContext();
    return {
      ...this.#withStats(property, rooms, context),
      rooms: this.availability.withStatus(rooms.filter((room) => room.propertyId === id), context),
    };
  }

  create(payload, actor) {
    const input = validate(propertyCreateSchema, payload);
    if (this.properties.findByCode(input.code)) {
      throw new ConflictError(`Property code ${input.code} is already in use`, 'code');
    }
    const now = this.clock.nowIso();
    const property = this.properties.create({
      id: generateId('prop'),
      description: '',
      amenities: [],
      status: PROPERTY_STATUS.ACTIVE,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    this.activity.log({
      action: 'property.created',
      entityType: 'property',
      entityId: property.id,
      message: `Property ${property.name} created`,
      actor,
    });
    return property;
  }

  update(id, payload, actor) {
    const existing = this.properties.getById(id);
    if (!existing) throw new NotFoundError('Property');
    const input = validate(propertyUpdateSchema, payload);
    if (input.code && input.code !== existing.code && this.properties.findByCode(input.code)) {
      throw new ConflictError(`Property code ${input.code} is already in use`, 'code');
    }
    const property = this.properties.update(id, { ...input, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'property.updated',
      entityType: 'property',
      entityId: id,
      message: `Property ${property.name} updated`,
      actor,
    });
    return property;
  }

  delete(id, actor) {
    const existing = this.properties.getById(id);
    if (!existing) throw new NotFoundError('Property');
    if (this.rooms.findByProperty(id).length > 0) {
      throw new ConflictError('This property still has rooms. Delete its rooms first.');
    }
    this.properties.delete(id);
    this.activity.log({
      action: 'property.deleted',
      entityType: 'property',
      entityId: id,
      message: `Property ${existing.name} deleted`,
      actor,
    });
    return { id };
  }
}
