import { BLOCKING_RESERVATION_STATUSES, rangesOverlap } from '@homestay/shared';
import { BaseRepository } from './BaseRepository.js';

export class PropertyRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'properties');
  }

  findByCode(code) {
    return this.findOne((property) => property.code === code);
  }
}

export class RoomRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'rooms');
  }

  findByProperty(propertyId) {
    return this.findWhere((room) => room.propertyId === propertyId);
  }

  findByNumber(propertyId, number) {
    return this.findOne((room) => room.propertyId === propertyId && room.number.toLowerCase() === number.toLowerCase());
  }
}

export class GuestRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'guests');
  }

  findByEmail(email) {
    return this.findOne((guest) => guest.email === email);
  }
}

export class ReservationRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'reservations');
  }

  findByRoom(roomId) {
    return this.findWhere((reservation) => reservation.roomId === roomId);
  }

  findByGuest(guestId) {
    return this.findWhere((reservation) => reservation.guestId === guestId);
  }

  /** Inventory-holding reservations for a room that overlap [checkIn, checkOut). */
  findOverlapping(roomId, checkIn, checkOut, excludeId) {
    return this.findWhere(
      (reservation) =>
        reservation.roomId === roomId &&
        reservation.id !== excludeId &&
        BLOCKING_RESERVATION_STATUSES.includes(reservation.status) &&
        rangesOverlap(reservation.checkIn, reservation.checkOut, checkIn, checkOut),
    );
  }
}

export class PaymentRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'payments');
  }

  findByReservation(reservationId) {
    return this.findWhere((payment) => payment.reservationId === reservationId);
  }
}

export class HousekeepingRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'housekeepingTasks');
  }

  findByRoom(roomId) {
    return this.findWhere((task) => task.roomId === roomId);
  }
}

export class MaintenanceRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'maintenanceRequests');
  }

  findByRoom(roomId) {
    return this.findWhere((request) => request.roomId === roomId);
  }
}

export class UserRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'users');
  }

  findByEmail(email) {
    return this.findOne((user) => user.email === String(email).toLowerCase());
  }
}

export class NotificationRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'notifications');
  }

  findForRole(role) {
    return this.findWhere((notification) => notification.roles.includes(role));
  }
}

export class ActivityRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'activities');
  }

  getRecent(limit = 10) {
    return this.getAll()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export class SettingsRepository {
  constructor(storage) {
    this.storage = storage;
    this.key = 'settings';
  }

  get() {
    return this.storage.getDocument(this.key);
  }

  save(settings) {
    return this.storage.setDocument(this.key, settings);
  }
}

export class DemoMetaRepository {
  constructor(storage) {
    this.storage = storage;
    this.key = 'demoMeta';
  }

  get() {
    return this.storage.getDocument(this.key);
  }

  save(meta) {
    return this.storage.setDocument(this.key, meta);
  }
}

export function createRepositories(storage) {
  return {
    properties: new PropertyRepository(storage),
    rooms: new RoomRepository(storage),
    guests: new GuestRepository(storage),
    reservations: new ReservationRepository(storage),
    payments: new PaymentRepository(storage),
    housekeeping: new HousekeepingRepository(storage),
    maintenance: new MaintenanceRepository(storage),
    users: new UserRepository(storage),
    notifications: new NotificationRepository(storage),
    activities: new ActivityRepository(storage),
    settings: new SettingsRepository(storage),
    demoMeta: new DemoMetaRepository(storage),
  };
}
