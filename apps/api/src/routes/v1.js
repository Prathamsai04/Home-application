import { Router } from 'express';
import {
  authController,
  dashboardController,
  demoController,
  guestController,
  housekeepingController,
  lookupController,
  maintenanceController,
  notificationController,
  paymentController,
  propertyController,
  reportController,
  reservationController,
  roomController,
  settingsController,
  userController,
} from '../controllers/index.js';
import { authenticate, authorize, rateLimit } from '../middleware/index.js';
import { sendSuccess } from '../core/response.js';

function crud(router, path, controller, { view, manage, remove }) {
  router.get(path, authorize(view), controller.list);
  router.post(path, authorize(manage), controller.create);
  router.get(`${path}/:id`, authorize(view), controller.get);
  router.patch(`${path}/:id`, authorize(manage), controller.update);
  router.put(`${path}/:id`, authorize(manage), controller.update);
  router.delete(`${path}/:id`, authorize(remove), controller.remove);
}

export function createV1Router(config, limits = {}) {
  const router = Router();
  const authLimiter = rateLimit({
    name: 'auth',
    windowMs: limits.windowMs ?? config.RATE_LIMIT_WINDOW_MS,
    max: limits.authMax ?? config.AUTH_RATE_LIMIT_MAX,
  });

  /* ------------------------------- Public ------------------------------- */
  router.get('/health', (req, res) =>
    sendSuccess(res, { status: 'ok', service: 'homestay-api', version: 'v1', time: new Date().toISOString() }),
  );
  router.post('/auth/login', authLimiter, authController.login);
  router.get('/demo/status', demoController.status);

  /* ---------------------------- Authenticated --------------------------- */
  router.use(authenticate);

  router.post('/auth/logout', authController.logout);
  router.get('/auth/me', authController.me);

  router.post('/demo/reset', authorize('demo:manage'), demoController.reset);
  router.post('/demo/reload', authorize('demo:manage'), demoController.reload);

  router.get('/lookups', lookupController.get);
  router.get('/dashboard', authorize('dashboard:view'), dashboardController.overview);

  crud(router, '/properties', propertyController, {
    view: 'properties:view',
    manage: 'properties:manage',
    remove: 'properties:delete',
  });

  router.get('/rooms/availability', authorize('rooms:view'), roomController.availability);
  crud(router, '/rooms', roomController, { view: 'rooms:view', manage: 'rooms:manage', remove: 'rooms:delete' });

  crud(router, '/guests', guestController, { view: 'guests:view', manage: 'guests:manage', remove: 'guests:delete' });

  router.get('/reservations', authorize('reservations:view'), reservationController.list);
  router.post('/reservations', authorize('reservations:manage'), reservationController.create);
  router.get('/reservations/:id', authorize('reservations:view'), reservationController.get);
  router.patch('/reservations/:id', authorize('reservations:manage'), reservationController.update);
  router.put('/reservations/:id', authorize('reservations:manage'), reservationController.update);
  router.post('/reservations/:id/confirm', authorize('reservations:manage'), reservationController.confirm);
  router.post('/reservations/:id/cancel', authorize('reservations:manage'), reservationController.cancel);
  router.post('/reservations/:id/check-in', authorize('reservations:operate'), reservationController.checkIn);
  router.post('/reservations/:id/check-out', authorize('reservations:operate'), reservationController.checkOut);
  router.post('/reservations/:id/no-show', authorize('reservations:manage'), reservationController.noShow);

  router.get('/payments', authorize('payments:view'), paymentController.list);
  router.post('/payments', authorize('payments:manage'), paymentController.create);
  router.post('/payments/refunds', authorize('payments:manage'), paymentController.refund);
  router.get('/payments/summary/:reservationId', authorize('payments:view'), paymentController.summary);
  router.get('/payments/:id', authorize('payments:view'), paymentController.get);
  router.patch('/payments/:id', authorize('payments:manage'), paymentController.update);

  crud(router, '/housekeeping', housekeepingController, {
    view: 'housekeeping:view',
    manage: 'housekeeping:manage',
    remove: 'housekeeping:manage',
  });
  router.post('/housekeeping/:id/assign', authorize('housekeeping:manage'), housekeepingController.assign);
  router.post('/housekeeping/:id/start', authorize('housekeeping:operate'), housekeepingController.start);
  router.post('/housekeeping/:id/complete', authorize('housekeeping:operate'), housekeepingController.complete);
  router.post('/housekeeping/:id/reopen', authorize('housekeeping:manage'), housekeepingController.reopen);

  router.get('/maintenance', authorize('maintenance:view'), maintenanceController.list);
  router.post('/maintenance', authorize('maintenance:create'), maintenanceController.create);
  router.get('/maintenance/:id', authorize('maintenance:view'), maintenanceController.get);
  router.patch('/maintenance/:id', authorize('maintenance:manage'), maintenanceController.update);
  router.put('/maintenance/:id', authorize('maintenance:manage'), maintenanceController.update);
  router.delete('/maintenance/:id', authorize('maintenance:manage'), maintenanceController.remove);
  router.post('/maintenance/:id/assign', authorize('maintenance:manage'), maintenanceController.assign);
  router.post('/maintenance/:id/start', authorize('maintenance:operate'), maintenanceController.start);
  router.post('/maintenance/:id/resolve', authorize('maintenance:operate'), maintenanceController.resolve);

  router.get('/notifications', authorize('notifications:view'), notificationController.list);
  router.post('/notifications', authorize('notifications:broadcast'), notificationController.broadcast);
  router.post('/notifications/read-all', authorize('notifications:view'), notificationController.markAllRead);
  router.patch('/notifications/:id/read', authorize('notifications:view'), notificationController.markRead);
  router.delete('/notifications/:id', authorize('notifications:view'), notificationController.dismiss);

  router.get('/settings', authorize('settings:view'), settingsController.get);
  router.patch('/settings', authorize('settings:manage'), settingsController.update);
  router.put('/settings', authorize('settings:manage'), settingsController.update);

  crud(router, '/users', userController, { view: 'users:view', manage: 'users:manage', remove: 'users:manage' });

  router.get('/reports/occupancy', authorize('reports:view'), reportController.occupancy);
  router.get('/reports/revenue', authorize('reports:view'), reportController.revenue);
  router.get('/reports/reservations', authorize('reports:view'), reportController.reservations);
  router.get('/reports/operations', authorize('reports:view'), reportController.operations);

  return router;
}
