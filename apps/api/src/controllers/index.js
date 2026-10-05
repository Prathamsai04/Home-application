import { sendPage, sendSuccess } from '../core/response.js';

/**
 * Controllers translate HTTP <-> service calls. They contain no business logic
 * and never touch repositories or storage.
 */
export function crudController(serviceName) {
  const service = (req) => req.services[serviceName];
  return {
    list: (req, res) => sendPage(res, service(req).list(req.query)),
    get: (req, res) => sendSuccess(res, service(req).get(req.params.id)),
    create: (req, res) => sendSuccess(res, service(req).create(req.body, req.user), { status: 201 }),
    update: (req, res) => sendSuccess(res, service(req).update(req.params.id, req.body, req.user)),
    remove: (req, res) => sendSuccess(res, service(req).delete(req.params.id, req.user)),
  };
}

export const authController = {
  login: (req, res) => sendSuccess(res, req.services.auth.login(req.body)),
  logout: (req, res) => sendSuccess(res, { loggedOut: true }),
  me: (req, res) => sendSuccess(res, req.services.auth.me(req.user)),
};

export const demoController = {
  status: (req, res) => sendSuccess(res, req.services.demo.status()),
  reset: (req, res) => sendSuccess(res, req.services.demo.reset(req.user)),
  reload: (req, res) => sendSuccess(res, req.services.demo.reload(req.user)),
};

export const propertyController = crudController('properties');

export const roomController = {
  ...crudController('rooms'),
  availability: (req, res) => sendSuccess(res, req.services.rooms.availabilitySearch(req.query)),
};

export const guestController = crudController('guests');

export const reservationController = {
  ...crudController('reservations'),
  confirm: (req, res) => sendSuccess(res, req.services.reservations.confirm(req.params.id, req.user)),
  cancel: (req, res) => sendSuccess(res, req.services.reservations.cancel(req.params.id, req.body, req.user)),
  checkIn: (req, res) => sendSuccess(res, req.services.reservations.checkIn(req.params.id, req.user)),
  checkOut: (req, res) => sendSuccess(res, req.services.reservations.checkOut(req.params.id, req.user)),
  noShow: (req, res) => sendSuccess(res, req.services.reservations.markNoShow(req.params.id, req.user)),
};

export const paymentController = {
  list: (req, res) => {
    const result = req.services.payments.list(req.query);
    sendPage(res, result, { totals: result.totals });
  },
  get: (req, res) => sendSuccess(res, req.services.payments.get(req.params.id)),
  create: (req, res) => sendSuccess(res, req.services.payments.recordPayment(req.body, req.user), { status: 201 }),
  refund: (req, res) => sendSuccess(res, req.services.payments.recordRefund(req.body, req.user), { status: 201 }),
  update: (req, res) => sendSuccess(res, req.services.payments.update(req.params.id, req.body, req.user)),
  summary: (req, res) => sendSuccess(res, req.services.payments.summary(req.params.reservationId)),
};

export const housekeepingController = {
  ...crudController('housekeeping'),
  assign: (req, res) => sendSuccess(res, req.services.housekeeping.assign(req.params.id, req.body, req.user)),
  start: (req, res) => sendSuccess(res, req.services.housekeeping.start(req.params.id, req.user)),
  complete: (req, res) => sendSuccess(res, req.services.housekeeping.complete(req.params.id, req.body, req.user)),
  reopen: (req, res) => sendSuccess(res, req.services.housekeeping.reopen(req.params.id, req.user)),
};

export const maintenanceController = {
  ...crudController('maintenance'),
  assign: (req, res) => sendSuccess(res, req.services.maintenance.assign(req.params.id, req.body, req.user)),
  start: (req, res) => sendSuccess(res, req.services.maintenance.start(req.params.id, req.user)),
  resolve: (req, res) => sendSuccess(res, req.services.maintenance.resolve(req.params.id, req.body, req.user)),
};

export const notificationController = {
  list: (req, res) => {
    const result = req.services.notifications.list(req.user, req.query);
    sendPage(res, result, { unreadCount: result.unreadCount });
  },
  markRead: (req, res) => sendSuccess(res, req.services.notifications.markRead(req.params.id, req.user)),
  markAllRead: (req, res) => sendSuccess(res, req.services.notifications.markAllRead(req.user)),
  dismiss: (req, res) => sendSuccess(res, req.services.notifications.dismiss(req.params.id, req.user)),
  broadcast: (req, res) => sendSuccess(res, req.services.notifications.broadcast(req.body, req.user), { status: 201 }),
};

export const settingsController = {
  get: (req, res) => sendSuccess(res, req.services.settings.get()),
  update: (req, res) => sendSuccess(res, req.services.settings.update(req.body, req.user)),
};

export const userController = crudController('users');

export const dashboardController = {
  overview: (req, res) => sendSuccess(res, req.services.dashboard.getOverview(req.query)),
};

export const reportController = {
  occupancy: (req, res) => sendSuccess(res, req.services.reports.occupancy(req.query)),
  revenue: (req, res) => sendSuccess(res, req.services.reports.revenue(req.query)),
  reservations: (req, res) => sendSuccess(res, req.services.reports.reservations(req.query)),
  operations: (req, res) => sendSuccess(res, req.services.reports.operations(req.query)),
};

export const lookupController = {
  get: (req, res) => sendSuccess(res, req.services.lookups.get()),
};
