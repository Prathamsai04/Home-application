import {
  HOUSEKEEPING_STATUS,
  MAINTENANCE_STATUS,
  PROPERTY_STATUS,
  RESERVATION_STATUS,
  ROOM_STATUS,
  diffDays,
  isNightWithinStay,
  multiplyMinor,
} from '@homestay/shared';
import { BusinessRuleError, ConflictError } from '../core/errors.js';
import { indexById } from './helpers.js';

const STATUS_REASONS = {
  [ROOM_STATUS.MAINTENANCE]: 'Blocked by an open maintenance request or out of service',
  [ROOM_STATUS.OCCUPIED]: 'Guest is checked in',
  [ROOM_STATUS.CLEANING]: 'Housekeeping task due',
  [ROOM_STATUS.RESERVED]: 'Arrival expected today',
  [ROOM_STATUS.AVAILABLE]: 'Ready for guests',
};

/**
 * Derives room status and booking availability dynamically from reservations,
 * maintenance requests, housekeeping tasks and current occupancy. Room status
 * is never stored; it is always calculated.
 */
export class AvailabilityService {
  constructor({ repositories, clock }) {
    this.repositories = repositories;
    this.clock = clock;
  }

  buildContext() {
    const today = this.clock.today();
    const maintenanceRoomIds = new Set(
      this.repositories.maintenance
        .getAll()
        .filter((request) => request.blocksRoom && request.status !== MAINTENANCE_STATUS.RESOLVED)
        .map((request) => request.roomId),
    );
    const reservations = this.repositories.reservations.getAll();
    const occupiedRoomIds = new Set(
      reservations.filter((r) => r.status === RESERVATION_STATUS.CHECKED_IN).map((r) => r.roomId),
    );
    const reservedRoomIds = new Set(
      reservations
        .filter(
          (r) =>
            [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED].includes(r.status) &&
            isNightWithinStay(today, r.checkIn, r.checkOut),
        )
        .map((r) => r.roomId),
    );
    const cleaningRoomIds = new Set(
      this.repositories.housekeeping
        .getAll()
        .filter((task) => task.status !== HOUSEKEEPING_STATUS.COMPLETED && task.dueDate <= today)
        .map((task) => task.roomId),
    );
    return { today, maintenanceRoomIds, occupiedRoomIds, reservedRoomIds, cleaningRoomIds };
  }

  statusOf(room, context = this.buildContext()) {
    if (!room.active || context.maintenanceRoomIds.has(room.id)) return ROOM_STATUS.MAINTENANCE;
    if (context.occupiedRoomIds.has(room.id)) return ROOM_STATUS.OCCUPIED;
    if (context.cleaningRoomIds.has(room.id)) return ROOM_STATUS.CLEANING;
    if (context.reservedRoomIds.has(room.id)) return ROOM_STATUS.RESERVED;
    return ROOM_STATUS.AVAILABLE;
  }

  withStatus(rooms, context = this.buildContext()) {
    return rooms.map((room) => {
      const status = this.statusOf(room, context);
      return { ...room, status, statusReason: STATUS_REASONS[status] };
    });
  }

  findBlockingMaintenance(roomId) {
    return this.repositories.maintenance.findOne(
      (request) => request.roomId === roomId && request.blocksRoom && request.status !== MAINTENANCE_STATUS.RESOLVED,
    );
  }

  /** Throws when the room cannot be booked for [checkIn, checkOut). */
  assertRoomBookable({ room, property, checkIn, checkOut, excludeReservationId, checkMaintenance = true }) {
    if (property && property.status !== PROPERTY_STATUS.ACTIVE) {
      throw new BusinessRuleError('This property is not accepting bookings', 'roomId');
    }
    if (!room.active) {
      throw new BusinessRuleError('This room is out of service and cannot be booked', 'roomId');
    }
    if (checkMaintenance) {
      const maintenance = this.findBlockingMaintenance(room.id);
      if (maintenance) {
        throw new BusinessRuleError(`Room is under maintenance (${maintenance.title}) and cannot be booked`, 'roomId');
      }
    }
    const conflicts = this.repositories.reservations.findOverlapping(room.id, checkIn, checkOut, excludeReservationId);
    if (conflicts.length) {
      const [first] = conflicts.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      throw new ConflictError(
        `Room ${room.number} is already booked from ${first.checkIn} to ${first.checkOut} (${first.code})`,
        'roomId',
      );
    }
  }

  /** Rooms bookable for the requested stay. */
  search({ propertyId, checkIn, checkOut, guests = 1, excludeReservationId }) {
    const properties = indexById(this.repositories.properties.getAll());
    const nights = diffDays(checkIn, checkOut);
    const blockedByMaintenance = new Set(
      this.repositories.maintenance
        .getAll()
        .filter((request) => request.blocksRoom && request.status !== MAINTENANCE_STATUS.RESOLVED)
        .map((request) => request.roomId),
    );
    return this.repositories.rooms
      .getAll()
      .filter((room) => {
        const property = properties.get(room.propertyId);
        if (!property || property.status !== PROPERTY_STATUS.ACTIVE) return false;
        if (propertyId && room.propertyId !== propertyId) return false;
        if (!room.active || room.capacity < guests || blockedByMaintenance.has(room.id)) return false;
        return this.repositories.reservations.findOverlapping(room.id, checkIn, checkOut, excludeReservationId).length === 0;
      })
      .sort((a, b) => a.propertyId.localeCompare(b.propertyId) || a.number.localeCompare(b.number, 'en', { numeric: true }))
      .map((room) => ({
        ...room,
        propertyName: properties.get(room.propertyId)?.name,
        nights,
        estimatedTotalMinor: multiplyMinor(room.baseRateMinor, nights),
      }));
  }
}
