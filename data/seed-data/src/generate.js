import {
  HOUSEKEEPING_STATUS,
  PAYMENT_METHODS,
  RESERVATION_SOURCES,
  RESERVATION_STATUS,
  TRANSACTION_TYPES,
  addDays,
  divideMinor,
  formatMoney,
  multiplyMinor,
} from '@homestay/shared';
import { createRandom } from './random.js';
import {
  BLOCKED_ROOM_IDS,
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  GUESTS,
  MAINTENANCE_REQUESTS,
  PROPERTIES,
  ROOM_TEMPLATES,
  SEED_VERSION,
  USERS,
} from './catalog.js';

const pad = (value, size = 3) => String(value).padStart(size, '0');
const stamp = (date, hour = 4, minute = 30) => `${date}T${pad(hour, 2)}:${pad(minute, 2)}:00.000Z`;
const minDate = (a, b) => (a < b ? a : b);

function buildProperties(anchorDate) {
  return PROPERTIES.map((property, index) => ({
    ...property,
    address: { ...property.address },
    amenities: [...property.amenities],
    status: 'active',
    createdAt: stamp(addDays(anchorDate, -720 + index * 60)),
    updatedAt: stamp(addDays(anchorDate, -30 - index)),
  }));
}

function buildRooms(anchorDate) {
  const rooms = [];
  let counter = 1;
  for (const property of PROPERTIES) {
    for (const [number, name, type, capacity, floor, rate, amenities] of ROOM_TEMPLATES[property.id]) {
      rooms.push({
        id: `room_${pad(counter)}`,
        propertyId: property.id,
        number,
        name,
        type,
        capacity,
        floor,
        baseRateMinor: rate,
        amenities: [...amenities],
        active: true,
        description: `${name} at ${property.name}.`,
        createdAt: stamp(addDays(anchorDate, -700 + counter)),
        updatedAt: stamp(addDays(anchorDate, -45)),
      });
      counter += 1;
    }
  }
  return rooms;
}

function buildGuests(anchorDate, random) {
  return GUESTS.map(([firstName, lastName, nationality, phone, city, vip], index) => ({
    id: `guest_${pad(index + 1)}`,
    firstName,
    lastName,
    email: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
    phone,
    nationality,
    idType: nationality === 'India' ? 'national_id' : 'passport',
    idNumberLast4: random.digits(4),
    city,
    notes: vip ? 'Returning guest. Prefers a quiet room and early breakfast.' : '',
    vip,
    createdAt: stamp(addDays(anchorDate, -400 + index * 7)),
    updatedAt: stamp(addDays(anchorDate, -60 + index)),
  }));
}

function buildUsers(anchorDate, password) {
  return USERS.map((user, index) => ({
    ...user,
    active: true,
    password,
    lastLoginAt: null,
    createdAt: stamp(addDays(anchorDate, -730 + index * 30)),
    updatedAt: stamp(addDays(anchorDate, -90)),
  }));
}

function decideStatus(checkIn, checkOut, anchorDate, random) {
  const roll = random.next();
  if (checkOut < anchorDate) {
    if (roll < 0.08) return RESERVATION_STATUS.CANCELLED;
    if (roll < 0.12) return RESERVATION_STATUS.NO_SHOW;
    return RESERVATION_STATUS.CHECKED_OUT;
  }
  if (checkOut === anchorDate) {
    return roll < 0.5 ? RESERVATION_STATUS.CHECKED_IN : RESERVATION_STATUS.CHECKED_OUT;
  }
  if (checkIn === anchorDate) {
    return roll < 0.5 ? RESERVATION_STATUS.CONFIRMED : RESERVATION_STATUS.CHECKED_IN;
  }
  if (checkIn < anchorDate) return RESERVATION_STATUS.CHECKED_IN;
  if (roll < 0.1) return RESERVATION_STATUS.CANCELLED;
  if (roll < 0.3) return RESERVATION_STATUS.PENDING;
  return RESERVATION_STATUS.CONFIRMED;
}

function buildReservations(anchorDate, rooms, guests, random) {
  const reservations = [];
  let sequence = 1;
  for (const room of rooms) {
    const blocked = BLOCKED_ROOM_IDS.includes(room.id);
    const horizon = blocked ? addDays(anchorDate, -3) : addDays(anchorDate, 32);
    let cursor = addDays(anchorDate, -40 + random.int(0, 4));
    while (cursor < horizon) {
      const nights = random.int(1, 5);
      const checkIn = cursor;
      const checkOut = addDays(checkIn, nights);
      if (blocked && checkOut > horizon) break;
      const guest = random.pick(guests);
      const status = decideStatus(checkIn, checkOut, anchorDate, random);
      const discounted = random.chance(0.2);
      const nightlyRateMinor = discounted
        ? multiplyMinor(divideMinor(room.baseRateMinor, 10), 9)
        : room.baseRateMinor;
      const rawCreated = addDays(checkIn, -random.int(2, 30));
      const createdDate = rawCreated > anchorDate ? addDays(anchorDate, -random.int(1, 20)) : rawCreated;
      const createdAt = stamp(createdDate, random.int(3, 12), random.int(0, 59));
      const adults = Math.min(room.capacity, random.int(1, 2));
      const children = room.capacity - adults > 0 && random.chance(0.3) ? 1 : 0;

      const reservation = {
        id: `res_${pad(sequence)}`,
        code: `HS-${1000 + sequence}`,
        propertyId: room.propertyId,
        roomId: room.id,
        guestId: guest.id,
        checkIn,
        checkOut,
        nights,
        adults,
        children,
        status,
        source: random.pick(RESERVATION_SOURCES),
        nightlyRateMinor,
        totalAmountMinor: multiplyMinor(nightlyRateMinor, nights),
        notes: discounted ? '10% loyalty discount applied.' : '',
        specialRequests: random.chance(0.25) ? random.pick(['Late check-in', 'Airport pickup', 'Extra pillows', 'Vegetarian breakfast', 'Ground floor preferred']) : '',
        createdAt,
        updatedAt: createdAt,
        checkedInAt: null,
        checkedOutAt: null,
        cancelledAt: null,
        cancellationReason: '',
        createdBy: random.pick(['user_001', 'user_002', 'user_003']),
      };

      if ([RESERVATION_STATUS.CHECKED_IN, RESERVATION_STATUS.CHECKED_OUT].includes(status)) {
        reservation.checkedInAt = stamp(checkIn, 9, 0);
      }
      if (status === RESERVATION_STATUS.CHECKED_OUT) {
        reservation.checkedOutAt = stamp(checkOut, 5, 15);
      }
      if (status === RESERVATION_STATUS.CANCELLED) {
        reservation.cancelledAt = stamp(minDate(addDays(createdDate, 1), anchorDate), 1, 0);
        reservation.cancellationReason = random.pick(['Change of travel plans', 'Flight cancelled', 'Booked elsewhere']);
      }
      reservation.updatedAt = reservation.checkedOutAt ?? reservation.cancelledAt ?? reservation.checkedInAt ?? createdAt;

      reservations.push(reservation);
      sequence += 1;
      cursor = addDays(checkOut, random.int(0, 6));
    }
  }
  return reservations;
}

function paymentReference(method, random) {
  switch (method) {
    case PAYMENT_METHODS.UPI:
      return `UPI${random.digits(12)}`;
    case PAYMENT_METHODS.CARD:
      return `AUTH-${random.digits(6)}`;
    case PAYMENT_METHODS.BANK_TRANSFER:
      return `NEFT${random.digits(10)}`;
    default:
      return '';
  }
}

function buildPayments(anchorDate, reservations, random) {
  const payments = [];
  let sequence = 1;
  const methods = Object.values(PAYMENT_METHODS);

  const add = (reservation, type, amountMinor, date, extra = {}) => {
    if (amountMinor <= 0) return;
    const method = extra.method ?? random.pick(methods);
    const day = minDate(date, anchorDate);
    const hour = day === anchorDate ? random.int(0, 2) : random.int(3, 12);
    payments.push({
      id: `pay_${pad(sequence)}`,
      reservationId: reservation.id,
      propertyId: reservation.propertyId,
      type,
      amountMinor,
      method,
      reference: paymentReference(method, random),
      cardLast4: method === PAYMENT_METHODS.CARD ? random.digits(4) : null,
      notes: extra.notes ?? '',
      receivedAt: stamp(day, hour, random.int(0, 59)),
      recordedBy: random.pick(['user_001', 'user_002']),
      createdAt: stamp(day, hour, 59),
    });
    sequence += 1;
  };

  for (const reservation of reservations) {
    const total = reservation.totalAmountMinor;
    const createdDate = reservation.createdAt.slice(0, 10);
    const depositPct = random.pick([20, 30, 50]);
    const deposit = multiplyMinor(divideMinor(total, 100), depositPct);

    switch (reservation.status) {
      case RESERVATION_STATUS.CHECKED_OUT: {
        if (random.chance(0.15)) {
          add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Advance deposit' });
        } else if (random.chance(0.5)) {
          add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Advance deposit' });
          add(reservation, TRANSACTION_TYPES.PAYMENT, total - deposit, reservation.checkOut, { notes: 'Balance at checkout' });
        } else {
          add(reservation, TRANSACTION_TYPES.PAYMENT, total, reservation.checkOut, { notes: 'Full settlement' });
        }
        break;
      }
      case RESERVATION_STATUS.CHECKED_IN: {
        if (random.chance(0.5)) {
          add(reservation, TRANSACTION_TYPES.PAYMENT, total, reservation.checkIn, { notes: 'Paid at check-in' });
        } else {
          add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Advance deposit' });
        }
        break;
      }
      case RESERVATION_STATUS.CONFIRMED: {
        if (random.chance(0.55)) {
          add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Advance deposit' });
        }
        break;
      }
      case RESERVATION_STATUS.CANCELLED: {
        if (random.chance(0.6)) {
          add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Advance deposit' });
          if (random.chance(0.7)) {
            add(reservation, TRANSACTION_TYPES.REFUND, deposit, reservation.cancelledAt.slice(0, 10), {
              notes: 'Refund on cancellation',
            });
          }
        }
        break;
      }
      case RESERVATION_STATUS.NO_SHOW: {
        add(reservation, TRANSACTION_TYPES.PAYMENT, deposit, createdDate, { notes: 'Retained no-show deposit' });
        break;
      }
      default:
        break;
    }
  }
  return payments;
}

function buildHousekeeping(anchorDate, rooms, reservations) {
  const tasks = [];
  let sequence = 1;
  const add = (task) => {
    const createdDate = minDate(addDays(task.dueDate, -1), anchorDate);
    tasks.push({
      id: `hk_${pad(sequence)}`,
      notes: '',
      startedAt: null,
      completedAt: null,
      createdBy: 'user_002',
      createdAt: stamp(createdDate, 2, 0),
      updatedAt: stamp(createdDate, 2, 0),
      ...task,
    });
    sequence += 1;
  };

  const recentCheckouts = reservations
    .filter((r) => r.status === RESERVATION_STATUS.CHECKED_OUT && r.checkOut >= addDays(anchorDate, -3))
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  recentCheckouts.forEach((reservation, index) => {
    const isToday = reservation.checkOut === anchorDate;
    const status = !isToday
      ? HOUSEKEEPING_STATUS.COMPLETED
      : index % 2 === 0
        ? HOUSEKEEPING_STATUS.PENDING
        : HOUSEKEEPING_STATUS.IN_PROGRESS;
    add({
      propertyId: reservation.propertyId,
      roomId: reservation.roomId,
      type: 'checkout_clean',
      priority: isToday ? 'high' : 'medium',
      status,
      dueDate: reservation.checkOut,
      assignedTo: status === HOUSEKEEPING_STATUS.PENDING && index % 4 === 0 ? null : 'user_004',
      reservationId: reservation.id,
      startedAt: status !== HOUSEKEEPING_STATUS.PENDING ? stamp(reservation.checkOut, 6, 0) : null,
      completedAt: status === HOUSEKEEPING_STATUS.COMPLETED ? stamp(reservation.checkOut, 7, 30) : null,
      notes: status === HOUSEKEEPING_STATUS.COMPLETED ? 'Room inspected and ready.' : '',
    });
  });

  reservations
    .filter((r) => r.status === RESERVATION_STATUS.CHECKED_IN && r.checkIn < anchorDate)
    .slice(0, 4)
    .forEach((reservation, index) => {
      add({
        propertyId: reservation.propertyId,
        roomId: reservation.roomId,
        type: 'daily_service',
        priority: 'medium',
        status: index === 0 ? HOUSEKEEPING_STATUS.IN_PROGRESS : HOUSEKEEPING_STATUS.PENDING,
        dueDate: anchorDate,
        assignedTo: index % 2 === 0 ? 'user_004' : 'user_003',
        reservationId: reservation.id,
        startedAt: index === 0 ? stamp(anchorDate, 4, 0) : null,
      });
    });

  const scheduled = [
    ['room_001', 'deep_clean', 'low', 2, 'user_004'],
    ['room_006', 'deep_clean', 'medium', 4, null],
    ['room_013', 'linen_change', 'low', 3, 'user_004'],
    ['room_009', 'inspection', 'medium', 1, 'user_003'],
    ['room_015', 'inspection', 'low', 6, null],
  ];
  for (const [roomId, type, priority, inDays, assignedTo] of scheduled) {
    const room = rooms.find((r) => r.id === roomId);
    add({
      propertyId: room.propertyId,
      roomId,
      type,
      priority,
      status: HOUSEKEEPING_STATUS.PENDING,
      dueDate: addDays(anchorDate, inDays),
      assignedTo,
      reservationId: null,
    });
  }

  const history = [
    ['room_004', 'deep_clean', -6],
    ['room_011', 'linen_change', -5],
    ['room_002', 'inspection', -8],
  ];
  for (const [roomId, type, daysAgo] of history) {
    const room = rooms.find((r) => r.id === roomId);
    const dueDate = addDays(anchorDate, daysAgo);
    add({
      propertyId: room.propertyId,
      roomId,
      type,
      priority: 'low',
      status: HOUSEKEEPING_STATUS.COMPLETED,
      dueDate,
      assignedTo: 'user_004',
      reservationId: null,
      startedAt: stamp(dueDate, 5, 0),
      completedAt: stamp(dueDate, 8, 0),
      notes: 'Completed as scheduled.',
    });
  }
  return tasks;
}

function buildMaintenance(anchorDate, rooms) {
  return MAINTENANCE_REQUESTS.map(
    ([roomId, title, category, priority, status, blocksRoom, daysAgo, assignedTo, description], index) => {
      const room = rooms.find((r) => r.id === roomId);
      const reportedDate = addDays(anchorDate, -daysAgo);
      const resolvedDate = minDate(addDays(reportedDate, 2), anchorDate);
      return {
        id: `mnt_${pad(index + 1)}`,
        propertyId: room.propertyId,
        roomId,
        title,
        description,
        category,
        priority,
        status,
        blocksRoom,
        assignedTo,
        reportedBy: index % 2 === 0 ? 'user_003' : 'user_004',
        reportedAt: stamp(reportedDate, 3, 15),
        assignedAt: assignedTo ? stamp(reportedDate, 4, 0) : null,
        startedAt: ['in_progress', 'resolved'].includes(status) ? stamp(reportedDate, 6, 0) : null,
        resolvedAt: status === 'resolved' ? stamp(resolvedDate, 10, 0) : null,
        resolutionNotes: status === 'resolved' ? 'Issue fixed and verified with a test run.' : '',
        createdAt: stamp(reportedDate, 3, 15),
        updatedAt: stamp(status === 'resolved' ? resolvedDate : reportedDate, 10, 0),
      };
    },
  );
}

function buildActivities(reservations, payments, guests, currency) {
  const guestName = (id) => {
    const guest = guests.find((g) => g.id === id);
    return guest ? `${guest.firstName} ${guest.lastName}` : 'Guest';
  };
  const events = [];
  for (const reservation of reservations) {
    events.push({
      action: 'reservation.created',
      entityType: 'reservation',
      entityId: reservation.id,
      message: `Reservation ${reservation.code} created for ${guestName(reservation.guestId)}`,
      actorName: 'Priya Nair',
      createdAt: reservation.createdAt,
    });
    if (reservation.checkedInAt) {
      events.push({
        action: 'reservation.checked_in',
        entityType: 'reservation',
        entityId: reservation.id,
        message: `${guestName(reservation.guestId)} checked in (${reservation.code})`,
        actorName: 'Rohan Das',
        createdAt: reservation.checkedInAt,
      });
    }
    if (reservation.checkedOutAt) {
      events.push({
        action: 'reservation.checked_out',
        entityType: 'reservation',
        entityId: reservation.id,
        message: `${guestName(reservation.guestId)} checked out (${reservation.code})`,
        actorName: 'Rohan Das',
        createdAt: reservation.checkedOutAt,
      });
    }
  }
  for (const payment of payments) {
    const reservation = reservations.find((r) => r.id === payment.reservationId);
    events.push({
      action: payment.type === 'refund' ? 'payment.refunded' : 'payment.received',
      entityType: 'payment',
      entityId: payment.id,
      message: `${payment.type === 'refund' ? 'Refund issued' : 'Payment received'}: ${formatMoney(payment.amountMinor, currency)} for ${reservation.code}`,
      actorName: 'Priya Nair',
      createdAt: payment.receivedAt,
    });
  }
  return events
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map((event, index) => ({ id: `act_${pad(index + 1)}`, ...event }));
}

function buildNotifications(anchorDate, reservations, maintenance) {
  const arrivals = reservations.filter(
    (r) => r.checkIn === anchorDate && r.status === RESERVATION_STATUS.CONFIRMED,
  ).length;
  const urgent = maintenance.find((m) => m.priority === 'urgent' && m.status !== 'resolved');
  const notifications = [
    {
      type: 'system',
      title: 'Welcome to the Homestay demo',
      message: 'You are exploring seeded in-memory data. Feel free to create, edit and delete records.',
      severity: 'info',
      roles: ['owner', 'manager', 'staff'],
      link: '/',
      createdAt: stamp(anchorDate, 0, 5),
    },
    {
      type: 'reservation',
      title: 'Arrivals today',
      message: `${arrivals} confirmed arrival(s) are scheduled for today.`,
      severity: 'info',
      roles: ['owner', 'manager', 'staff'],
      link: '/reservations',
      createdAt: stamp(anchorDate, 0, 30),
    },
    {
      type: 'housekeeping',
      title: 'Checkout cleaning queue',
      message: 'Rooms vacated today need cleaning before the next arrival.',
      severity: 'warning',
      roles: ['manager', 'staff'],
      link: '/housekeeping',
      createdAt: stamp(anchorDate, 1, 0),
    },
    {
      type: 'payment',
      title: 'Outstanding balances',
      message: 'Several in-house guests have unpaid balances. Review the payments ledger.',
      severity: 'warning',
      roles: ['owner', 'manager'],
      link: '/payments',
      createdAt: stamp(addDays(anchorDate, -1), 12, 0),
    },
  ];
  if (urgent) {
    notifications.push({
      type: 'maintenance',
      title: 'Urgent maintenance reported',
      message: `${urgent.title} - room blocked for bookings until resolved.`,
      severity: 'critical',
      roles: ['owner', 'manager', 'staff'],
      link: '/maintenance',
      createdAt: urgent.reportedAt,
    });
  }
  notifications.push({
    type: 'report',
    title: 'Monthly report ready',
    message: 'Revenue and occupancy reports for the last 30 days are available.',
    severity: 'success',
    roles: ['owner'],
    link: '/reports',
    createdAt: stamp(addDays(anchorDate, -2), 3, 0),
  });
  return notifications.map((notification, index) => ({
    id: `ntf_${pad(index + 1)}`,
    readBy: [],
    dismissedBy: [],
    ...notification,
  }));
}

/**
 * Generates the complete demo dataset relative to `anchorDate` (the business
 * "today"). The output is fully deterministic for a given anchor and seed.
 */
export function generateSeedData({ anchorDate, seed = DEFAULT_SEED, password }) {
  if (!anchorDate) throw new Error('generateSeedData requires an anchorDate');
  const random = createRandom(seed);
  const properties = buildProperties(anchorDate);
  const rooms = buildRooms(anchorDate);
  const guests = buildGuests(anchorDate, random);
  const users = buildUsers(anchorDate, password);
  const reservations = buildReservations(anchorDate, rooms, guests, random);
  const payments = buildPayments(anchorDate, reservations, random);
  const housekeepingTasks = buildHousekeeping(anchorDate, rooms, reservations);
  const maintenanceRequests = buildMaintenance(anchorDate, rooms);
  const settings = { ...DEFAULT_SETTINGS };
  const activities = buildActivities(reservations, payments, guests, settings.currency);
  const notifications = buildNotifications(anchorDate, reservations, maintenanceRequests);

  return {
    meta: { seedVersion: SEED_VERSION, seed, anchorDate },
    collections: {
      properties,
      rooms,
      guests,
      users,
      reservations,
      payments,
      housekeepingTasks,
      maintenanceRequests,
      notifications,
      activities,
    },
    documents: { settings },
  };
}
