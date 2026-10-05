import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '@homestay/shared';
import { FUTURE, MANAGER, OWNER, STAFF, TODAY, buildContainer, createBooking } from './helpers/context.js';

let container;
let services;

beforeEach(() => {
  container = buildContainer();
  services = container.services;
});

describe('HousekeepingService', () => {
  const newTask = () =>
    services.housekeeping.create({ roomId: 'room_001', type: 'deep_clean', priority: 'high', dueDate: TODAY }, MANAGER);

  it('creates tasks as pending and derives the property', () => {
    const task = newTask();
    expect(task).toMatchObject({ status: 'pending', propertyId: 'prop_001', assignedTo: null });
  });

  it('assigns tasks to active staff only', () => {
    const task = newTask();
    const assigned = services.housekeeping.assign(task.id, { assigneeId: 'user_004' }, MANAGER);
    expect(assigned.assigneeName).toBe('Meera Iyer');
    expect(() => services.housekeeping.assign(task.id, { assigneeId: 'user_missing' }, MANAGER)).toThrow(/active team member/);
  });

  it('tracks start and completion', () => {
    const task = newTask();
    const started = services.housekeeping.start(task.id, STAFF);
    expect(started.status).toBe('in_progress');
    expect(started.assignedTo).toBe(STAFF.id);
    expect(() => services.housekeeping.start(task.id, STAFF)).toThrow(/Only pending/);
    const completed = services.housekeeping.complete(task.id, { notes: 'Done' }, STAFF);
    expect(completed).toMatchObject({ status: 'completed', notes: 'Done' });
    expect(completed.completedAt).toBeTruthy();
    expect(() => services.housekeeping.complete(task.id, {}, STAFF)).toThrow(/already completed/);
    expect(() => services.housekeeping.update(task.id, { priority: 'low' }, MANAGER)).toThrow(/Completed tasks/);
    expect(services.housekeeping.reopen(task.id, MANAGER).status).toBe('pending');
  });

  it('marks the room as cleaning until the task completes', () => {
    const roomId = 'room_009';
    const before = services.rooms.get(roomId).status;
    const task = services.housekeeping.create({ roomId, type: 'inspection', dueDate: TODAY }, MANAGER);
    if (before === 'available' || before === 'reserved') {
      expect(services.rooms.get(roomId).status).toBe('cleaning');
    }
    services.housekeeping.complete(task.id, {}, STAFF);
    expect(services.rooms.get(roomId).status).not.toBe('cleaning');
  });

  it('updates and deletes tasks', () => {
    const task = newTask();
    expect(services.housekeeping.update(task.id, { priority: 'urgent' }, MANAGER).priority).toBe('urgent');
    expect(services.housekeeping.delete(task.id, MANAGER)).toEqual({ id: task.id });
  });
});

describe('MaintenanceService', () => {
  const report = (overrides = {}) =>
    services.maintenance.create(
      { roomId: 'room_011', title: 'Broken window latch', category: 'furniture', priority: 'urgent', blocksRoom: true, ...overrides },
      STAFF,
    );

  it('creates open requests and notifies for urgent issues', () => {
    const before = container.repositories.notifications.count();
    const request = report();
    expect(request).toMatchObject({ status: 'open', reporterName: 'Rohan Das' });
    expect(container.repositories.notifications.count()).toBe(before + 1);
  });

  it('requires assignment before work starts or resolves', () => {
    const request = report();
    expect(() => services.maintenance.start(request.id, STAFF)).toThrow(/Assign the request/);
    expect(() => services.maintenance.resolve(request.id, { resolutionNotes: 'x' }, STAFF)).toThrow(/Assign the request/);
    const assigned = services.maintenance.assign(request.id, { assigneeId: 'user_005' }, MANAGER);
    expect(assigned).toMatchObject({ status: 'assigned', assigneeName: 'Kabir Singh' });
    expect(services.maintenance.start(request.id, STAFF).status).toBe('in_progress');
    const resolved = services.maintenance.resolve(request.id, { resolutionNotes: 'Latch replaced' }, STAFF);
    expect(resolved).toMatchObject({ status: 'resolved', resolutionNotes: 'Latch replaced' });
    expect(() => services.maintenance.update(request.id, { title: 'x' }, MANAGER)).toThrow(/Resolved requests/);
  });

  it('blocks bookings while open and releases the room when resolved', () => {
    const request = report();
    const stay = { roomId: 'room_011', checkIn: addDays(FUTURE, 20), checkOut: addDays(FUTURE, 22), adults: 1 };
    expect(() => createBooking(container, stay)).toThrow(/under maintenance/);
    expect(services.rooms.get('room_011').status).toBe('maintenance');
    services.maintenance.assign(request.id, { assigneeId: 'user_005' }, MANAGER);
    services.maintenance.resolve(request.id, { resolutionNotes: 'Fixed' }, STAFF);
    expect(createBooking(container, stay).status).toBe('confirmed');
  });

  it('requires resolution notes', () => {
    const request = report();
    services.maintenance.assign(request.id, { assigneeId: 'user_005' }, MANAGER);
    expect(() => services.maintenance.resolve(request.id, {}, STAFF)).toThrow(/Validation failed/);
  });
});

describe('UserService', () => {
  it('protects the last active owner and self-deactivation', () => {
    expect(() => services.users.update('user_001', { role: 'manager' }, MANAGER)).toThrow(/active owner/);
    expect(() => services.users.update('user_001', { active: false }, OWNER)).toThrow(/your own account/);
    expect(() => services.users.delete('user_001', OWNER)).toThrow(/your own account/);
  });

  it('creates users with hashed passwords and never returns the hash', () => {
    const user = services.users.create(
      { name: 'Asha Rao', email: 'asha@homestay.demo', role: 'staff', password: 'Secret123' },
      OWNER,
    );
    expect(user).not.toHaveProperty('passwordHash');
    expect(container.repositories.users.getById(user.id).passwordHash).toMatch(/^scrypt\$/);
    expect(services.auth.login({ email: 'asha@homestay.demo', password: 'Secret123' }).user.id).toBe(user.id);
  });

  it('unassigns open work when a user is deleted', () => {
    services.users.delete('user_005', OWNER);
    const open = container.repositories.maintenance.findWhere((m) => m.assignedTo === 'user_005' && m.status !== 'resolved');
    expect(open).toHaveLength(0);
  });
});

describe('DashboardService and ReportService', () => {
  it('calculates metrics from live data', () => {
    const before = services.dashboard.getOverview({ range: '7d' });
    expect(before.kpis.propertyCount).toBe(3);
    expect(before.series).toHaveLength(7);
    expect(before.range).toMatchObject({ from: addDays(TODAY, -6), to: TODAY });

    const reservation = createBooking(container, { checkIn: TODAY, checkOut: addDays(TODAY, 2) });
    services.payments.recordPayment({ reservationId: reservation.id, amount: '100', method: 'cash' }, OWNER);
    const after = services.dashboard.getOverview({ range: 'today' });
    expect(after.kpis.todaysCheckIns).toBe(services.dashboard.getOverview({ range: 'today' }).kpis.todaysCheckIns);
    const revenueBefore = services.dashboard.getOverview({ range: 'today' }).kpis.totalRevenueMinor;
    services.payments.recordPayment({ reservationId: reservation.id, amount: '50', method: 'upi' }, OWNER);
    expect(services.dashboard.getOverview({ range: 'today' }).kpis.totalRevenueMinor).toBe(revenueBefore + 5000);
  });

  it('supports custom ranges and validates them', () => {
    const custom = services.dashboard.getOverview({ range: 'custom', from: '2026-03-01', to: '2026-03-10' });
    expect(custom.series).toHaveLength(10);
    expect(() => services.dashboard.getOverview({ range: 'custom', from: '2026-03-10', to: '2026-03-01' })).toThrow(/Validation failed/);
  });

  it('filters by property', () => {
    const scoped = services.dashboard.getOverview({ range: '30d', propertyId: 'prop_002' });
    expect(scoped.kpis.propertyCount).toBe(1);
    expect(scoped.kpis.roomCount).toBe(5);
  });

  it('produces consistent reports', () => {
    const occupancy = services.reports.occupancy({ range: '30d' });
    expect(occupancy.rows).toHaveLength(3);
    expect(occupancy.totals.soldRoomNights).toBe(occupancy.rows.reduce((t, r) => t + r.soldRoomNights, 0));
    const revenue = services.reports.revenue({ range: '30d' });
    expect(revenue.totals.netMinor).toBe(revenue.byMethod.reduce((t, m) => t + m.netMinor, 0));
    const reservations = services.reports.reservations({ range: '30d' });
    expect(reservations.byStatus.reduce((t, s) => t + s.count, 0)).toBe(reservations.totals.reservations);
    const operations = services.reports.operations({ range: '30d' });
    expect(operations.maintenance.openBlocking).toBeGreaterThanOrEqual(2);
  });
});

describe('DemoService', () => {
  it('resets in-memory changes back to the seed', () => {
    services.properties.update('prop_001', { name: 'Changed' }, OWNER);
    const status = services.demo.reset(OWNER);
    expect(status.resetCount).toBe(1);
    expect(status.seedReason).toBe('reset');
    expect(container.repositories.properties.getById('prop_001').name).toBe('Misty Hills Retreat');
  });

  it('reloads seed data anchored to today', () => {
    const status = services.demo.reload(OWNER);
    expect(status.anchorDate).toBe(TODAY);
    expect(status.counts.reservations).toBeGreaterThanOrEqual(20);
  });
});
