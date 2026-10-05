import supertest from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { addDays } from '@homestay/shared';
import { FUTURE, TODAY, buildApp, freeRoom, loginAs } from './helpers/context.js';

let request;
let container;
let ownerToken;

beforeEach(async () => {
  const built = buildApp();
  container = built.container;
  request = supertest(built.app);
  ownerToken = await loginAs(request);
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('API conventions', () => {
  it('returns the standard envelope with a correlation id', async () => {
    const res = await request.get('/api/v1/health').set('X-Correlation-Id', 'test-correlation-1');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe('test-correlation-1');
    expect(res.body).toMatchObject({ success: true, errors: [], meta: { correlationId: 'test-correlation-1' } });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns structured 404s without stack traces', async () => {
    const res = await request.get('/api/v1/nope').set(auth(ownerToken));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe('NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });

  it('rejects malformed JSON', async () => {
    const res = await request.post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].code).toBe('INVALID_JSON');
  });

  it('sanitizes HTML from input', async () => {
    const res = await request
      .post('/api/v1/guests')
      .set(auth(ownerToken))
      .send({
        firstName: '<script>alert(1)</script>Mia',
        lastName: 'Lee',
        email: 'mia.lee@example.com',
        phone: '+65 9123 4567',
        nationality: 'Singapore',
        idType: 'passport',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.firstName).toBe('alert(1)Mia');
  });

  it('enforces rate limits', async () => {
    const { createApp } = await import('../src/app.js');
    const limited = supertest(createApp({ container, limits: { max: 2 } }));
    await limited.get('/api/v1/health');
    await limited.get('/api/v1/health');
    const res = await limited.get('/api/v1/health');
    expect(res.status).toBe(429);
    expect(res.body.errors[0].code).toBe('RATE_LIMITED');
  });
});

describe('Authentication API', () => {
  it('logs in with demo credentials', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: 'manager@homestay.demo', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: 'manager', email: 'manager@homestay.demo' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.token).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: 'owner@homestay.demo', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.errors[0].message).toBe('Invalid email or password');
  });

  it('validates login payloads', async () => {
    const res = await request.post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('protects routes and resolves the session', async () => {
    expect((await request.get('/api/v1/properties')).status).toBe(401);
    expect((await request.get('/api/v1/properties').set(auth('forged.token'))).status).toBe(401);
    const me = await request.get('/api/v1/auth/me').set(auth(ownerToken));
    expect(me.body.data.email).toBe('owner@homestay.demo');
    expect((await request.post('/api/v1/auth/logout').set(auth(ownerToken))).status).toBe(200);
  });

  it('enforces role permissions', async () => {
    const staffToken = await loginAs(request, 'staff@homestay.demo');
    expect((await request.get('/api/v1/payments').set(auth(staffToken))).status).toBe(403);
    expect((await request.get('/api/v1/reports/revenue').set(auth(staffToken))).status).toBe(403);
    expect((await request.delete('/api/v1/properties/prop_001').set(auth(staffToken))).status).toBe(403);
    expect((await request.get('/api/v1/reservations').set(auth(staffToken))).status).toBe(200);
  });
});

describe('Catalog endpoints', () => {
  it('performs property CRUD', async () => {
    const created = await request
      .post('/api/v1/properties')
      .set(auth(ownerToken))
      .send({
        name: 'Riverbend Homestay',
        code: 'RBH',
        address: { line1: '9 River Lane', city: 'Rishikesh', state: 'Uttarakhand', country: 'India', postalCode: '249201' },
        phone: '+91 98000 22222',
        email: 'riverbend@homestay.demo',
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const updated = await request.patch(`/api/v1/properties/${id}`).set(auth(ownerToken)).send({ name: 'Riverbend Lodge' });
    expect(updated.body.data.name).toBe('Riverbend Lodge');
    const list = await request.get('/api/v1/properties?search=riverbend').set(auth(ownerToken));
    expect(list.body.meta.pagination.total).toBe(1);
    expect((await request.delete(`/api/v1/properties/${id}`).set(auth(ownerToken))).status).toBe(200);
    expect((await request.get(`/api/v1/properties/${id}`).set(auth(ownerToken))).status).toBe(404);
  });

  it('performs room CRUD and returns validation errors', async () => {
    const invalid = await request.post('/api/v1/rooms').set(auth(ownerToken)).send({ propertyId: 'prop_001', number: '!!', capacity: 0 });
    expect(invalid.status).toBe(422);
    expect(invalid.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['number', 'capacity', 'baseRate']));

    const created = await request
      .post('/api/v1/rooms')
      .set(auth(ownerToken))
      .send({ propertyId: 'prop_003', number: '301', name: 'Loft', type: 'suite', capacity: 3, baseRate: '5500' });
    expect(created.status).toBe(201);
    expect(created.body.data.baseRateMinor).toBe(550000);
    const updated = await request.patch(`/api/v1/rooms/${created.body.data.id}`).set(auth(ownerToken)).send({ name: 'Sky Loft' });
    expect(updated.body.data.name).toBe('Sky Loft');
    expect((await request.delete(`/api/v1/rooms/${created.body.data.id}`).set(auth(ownerToken))).status).toBe(200);
  });

  it('filters rooms by derived status and searches availability', async () => {
    const res = await request.get('/api/v1/rooms?status=maintenance').set(auth(ownerToken));
    expect(res.body.data.every((r) => r.status === 'maintenance')).toBe(true);
    const availability = await request
      .get(`/api/v1/rooms/availability?checkIn=${FUTURE}&checkOut=${addDays(FUTURE, 2)}&guests=4`)
      .set(auth(ownerToken));
    expect(availability.status).toBe(200);
    expect(availability.body.data.every((r) => r.capacity >= 4)).toBe(true);
    expect(availability.body.data.some((r) => r.id === 'room_008')).toBe(false);
  });

  it('performs guest CRUD', async () => {
    const created = await request.post('/api/v1/guests').set(auth(ownerToken)).send({
      firstName: 'Kenji',
      lastName: 'Sato',
      email: 'kenji.sato@example.com',
      phone: '+81 90 5555 1234',
      nationality: 'Japan',
      idType: 'passport',
    });
    expect(created.status).toBe(201);
    const duplicate = await request.post('/api/v1/guests').set(auth(ownerToken)).send({ ...created.body.data, id: undefined });
    expect(duplicate.status).toBe(409);
    const updated = await request.patch(`/api/v1/guests/${created.body.data.id}`).set(auth(ownerToken)).send({ vip: true });
    expect(updated.body.data.vip).toBe(true);
    expect((await request.delete(`/api/v1/guests/${created.body.data.id}`).set(auth(ownerToken))).status).toBe(200);
  });
});

describe('Reservation and payment endpoints', () => {
  it('runs the full booking lifecycle', async () => {
    const room = freeRoom(container, TODAY, addDays(TODAY, 2), 2);
    const created = await request
      .post('/api/v1/reservations')
      .set(auth(ownerToken))
      .send({ roomId: room.id, guestId: 'guest_002', checkIn: TODAY, checkOut: addDays(TODAY, 2), adults: 2 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const conflict = await request
      .post('/api/v1/reservations')
      .set(auth(ownerToken))
      .send({ roomId: room.id, guestId: 'guest_003', checkIn: addDays(TODAY, 1), checkOut: addDays(TODAY, 3), adults: 1 });
    expect(conflict.status).toBe(409);
    expect(conflict.body.errors[0].field).toBe('roomId');

    const payment = await request
      .post('/api/v1/payments')
      .set(auth(ownerToken))
      .send({ reservationId: id, amount: '500.50', method: 'upi', reference: 'UPI998877665544' });
    expect(payment.status).toBe(201);
    expect(payment.body.data.summary.status).toBe('partially_paid');

    const staffToken = await loginAs(request, 'staff@homestay.demo');
    const checkedIn = await request.post(`/api/v1/reservations/${id}/check-in`).set(auth(staffToken));
    expect(checkedIn.body.data.status).toBe('checked_in');
    const cancel = await request.post(`/api/v1/reservations/${id}/cancel`).set(auth(ownerToken)).send({});
    expect(cancel.status).toBe(422);
    expect(cancel.body.errors[0].code).toBe('BUSINESS_RULE_VIOLATION');
    const checkedOut = await request.post(`/api/v1/reservations/${id}/check-out`).set(auth(staffToken));
    expect(checkedOut.body.data.status).toBe('checked_out');

    const refund = await request
      .post('/api/v1/payments/refunds')
      .set(auth(ownerToken))
      .send({ reservationId: id, amount: '100', method: 'upi', reason: 'Service recovery' });
    expect(refund.status).toBe(201);
    const summary = await request.get(`/api/v1/payments/summary/${id}`).set(auth(ownerToken));
    expect(summary.body.data).toMatchObject({ paidMinor: 50050, refundedMinor: 10000, netPaidMinor: 40050 });
  });

  it('updates and cancels a reservation', async () => {
    const room = freeRoom(container, FUTURE, addDays(FUTURE, 5), 1);
    const created = await request
      .post('/api/v1/reservations')
      .set(auth(ownerToken))
      .send({ roomId: room.id, guestId: 'guest_004', checkIn: FUTURE, checkOut: addDays(FUTURE, 2), adults: 1 });
    const id = created.body.data.id;
    const updated = await request.patch(`/api/v1/reservations/${id}`).set(auth(ownerToken)).send({ checkOut: addDays(FUTURE, 5) });
    expect(updated.body.data.nights).toBe(5);
    const invalid = await request.patch(`/api/v1/reservations/${id}`).set(auth(ownerToken)).send({ checkIn: FUTURE, checkOut: FUTURE });
    expect(invalid.status).toBe(422);
    const cancelled = await request.post(`/api/v1/reservations/${id}/cancel`).set(auth(ownerToken)).send({ reason: 'Weather' });
    expect(cancelled.body.data).toMatchObject({ status: 'cancelled', cancellationReason: 'Weather' });
  });

  it('lists reservations with filters, sorting and pagination', async () => {
    const res = await request.get('/api/v1/reservations?status=confirmed&sortBy=checkIn&sortOrder=asc&pageSize=5&page=2').set(auth(ownerToken));
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toMatchObject({ page: 2, pageSize: 5 });
    const dates = res.body.data.map((r) => r.checkIn);
    expect([...dates].sort()).toEqual(dates);
    const bad = await request.get('/api/v1/reservations?status=bogus').set(auth(ownerToken));
    expect(bad.status).toBe(422);
  });
});

describe('Operations, dashboard and admin endpoints', () => {
  it('handles housekeeping assignment and completion', async () => {
    const created = await request
      .post('/api/v1/housekeeping')
      .set(auth(ownerToken))
      .send({ roomId: 'room_004', type: 'linen_change', priority: 'low', dueDate: TODAY });
    const id = created.body.data.id;
    const assigned = await request.post(`/api/v1/housekeeping/${id}/assign`).set(auth(ownerToken)).send({ assigneeId: 'user_004' });
    expect(assigned.body.data.assigneeName).toBe('Meera Iyer');
    const staffToken = await loginAs(request, 'staff@homestay.demo');
    expect((await request.post(`/api/v1/housekeeping/${id}/start`).set(auth(staffToken))).body.data.status).toBe('in_progress');
    expect((await request.post(`/api/v1/housekeeping/${id}/complete`).set(auth(staffToken)).send({})).body.data.status).toBe('completed');
  });

  it('handles maintenance assignment and resolution', async () => {
    const staffToken = await loginAs(request, 'staff@homestay.demo');
    const created = await request
      .post('/api/v1/maintenance')
      .set(auth(staffToken))
      .send({ roomId: 'room_006', title: 'TV remote missing', category: 'appliance', priority: 'low' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await request.post(`/api/v1/maintenance/${id}/assign`).set(auth(staffToken)).send({ assigneeId: 'user_005' })).status).toBe(403);
    await request.post(`/api/v1/maintenance/${id}/assign`).set(auth(ownerToken)).send({ assigneeId: 'user_005' });
    const resolved = await request.post(`/api/v1/maintenance/${id}/resolve`).set(auth(staffToken)).send({ resolutionNotes: 'Replaced' });
    expect(resolved.body.data.status).toBe('resolved');
  });

  it('serves the dashboard and validates ranges', async () => {
    const res = await request.get('/api/v1/dashboard?range=7d').set(auth(ownerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.series).toHaveLength(7);
    expect(res.body.data.kpis.propertyCount).toBe(3);
    const bad = await request.get('/api/v1/dashboard?range=custom&from=2026-03-10').set(auth(ownerToken));
    expect(bad.status).toBe(422);
  });

  it('manages notifications per user', async () => {
    const list = await request.get('/api/v1/notifications').set(auth(ownerToken));
    const unread = list.body.meta.unreadCount;
    expect(unread).toBeGreaterThan(0);
    await request.patch(`/api/v1/notifications/${list.body.data[0].id}/read`).set(auth(ownerToken));
    const after = await request.get('/api/v1/notifications').set(auth(ownerToken));
    expect(after.body.meta.unreadCount).toBe(unread - 1);
    await request.post('/api/v1/notifications/read-all').set(auth(ownerToken));
    expect((await request.get('/api/v1/notifications').set(auth(ownerToken))).body.meta.unreadCount).toBe(0);
    const broadcast = await request
      .post('/api/v1/notifications')
      .set(auth(ownerToken))
      .send({ title: 'Team meeting', message: '5pm today', severity: 'info', roles: ['staff'] });
    expect(broadcast.status).toBe(201);
  });

  it('updates settings (owner only)', async () => {
    const managerToken = await loginAs(request, 'manager@homestay.demo');
    expect((await request.patch('/api/v1/settings').set(auth(managerToken)).send({ businessName: 'X' })).status).toBe(403);
    const res = await request.patch('/api/v1/settings').set(auth(ownerToken)).send({ businessName: 'Hill & Coast Stays' });
    expect(res.body.data.businessName).toBe('Hill & Coast Stays');
    expect((await request.patch('/api/v1/settings').set(auth(ownerToken)).send({ timezone: 'Mars/Base' })).status).toBe(422);
  });

  it('manages users', async () => {
    const created = await request
      .post('/api/v1/users')
      .set(auth(ownerToken))
      .send({ name: 'Leela Shah', email: 'leela@homestay.demo', role: 'staff', password: 'Welcome123' });
    expect(created.status).toBe(201);
    expect(created.body.data.passwordHash).toBeUndefined();
    const weak = await request.post('/api/v1/users').set(auth(ownerToken)).send({ name: 'X', email: 'x@homestay.demo', role: 'staff', password: 'weak' });
    expect(weak.status).toBe(422);
    expect((await request.delete(`/api/v1/users/${created.body.data.id}`).set(auth(ownerToken))).status).toBe(200);
  });

  it('exposes demo status publicly and restricts reset', async () => {
    const status = await request.get('/api/v1/demo/status');
    expect(status.body.data).toMatchObject({ mode: 'demo', persistence: 'ephemeral', storageProvider: 'memory' });
    const staffToken = await loginAs(request, 'staff@homestay.demo');
    expect((await request.post('/api/v1/demo/reset').set(auth(staffToken))).status).toBe(403);
    const reset = await request.post('/api/v1/demo/reset').set(auth(ownerToken));
    expect(reset.body.data.resetCount).toBe(1);
  });
});
