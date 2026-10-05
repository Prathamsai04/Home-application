import { request } from './client';

const get = (url, params) => request({ url, method: 'get', params });
const post = (url, data = {}) => request({ url, method: 'post', data });
const patch = (url, data = {}) => request({ url, method: 'patch', data });
const del = (url) => request({ url, method: 'delete' });

const crud = (path) => ({
  list: (params) => get(path, params),
  get: (id) => get(`${path}/${id}`),
  create: (data) => post(path, data),
  update: (id, data) => patch(`${path}/${id}`, data),
  remove: (id) => del(`${path}/${id}`),
});

const action = (path, name) => (id, data) => post(`${path}/${id}/${name}`, data ?? {});

export const authApi = {
  login: (credentials) => post('/auth/login', credentials),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
};

export const demoApi = {
  status: () => get('/demo/status'),
  reset: () => post('/demo/reset'),
  reload: () => post('/demo/reload'),
};

export const lookupsApi = { get: () => get('/lookups') };

export const dashboardApi = { overview: (params) => get('/dashboard', params) };

export const reportsApi = { get: (type, params) => get(`/reports/${type}`, params) };

export const propertiesApi = crud('/properties');

export const roomsApi = {
  ...crud('/rooms'),
  availability: (params) => get('/rooms/availability', params),
};

export const guestsApi = crud('/guests');

export const reservationsApi = {
  ...crud('/reservations'),
  confirm: action('/reservations', 'confirm'),
  cancel: action('/reservations', 'cancel'),
  checkIn: action('/reservations', 'check-in'),
  checkOut: action('/reservations', 'check-out'),
  noShow: action('/reservations', 'no-show'),
};

export const paymentsApi = {
  list: (params) => get('/payments', params),
  get: (id) => get(`/payments/${id}`),
  create: (data) => post('/payments', data),
  refund: (data) => post('/payments/refunds', data),
  update: (id, data) => patch(`/payments/${id}`, data),
  summary: (reservationId) => get(`/payments/summary/${reservationId}`),
};

export const housekeepingApi = {
  ...crud('/housekeeping'),
  assign: action('/housekeeping', 'assign'),
  start: action('/housekeeping', 'start'),
  complete: action('/housekeeping', 'complete'),
  reopen: action('/housekeeping', 'reopen'),
};

export const maintenanceApi = {
  ...crud('/maintenance'),
  assign: action('/maintenance', 'assign'),
  start: action('/maintenance', 'start'),
  resolve: action('/maintenance', 'resolve'),
};

export const notificationsApi = {
  list: (params) => get('/notifications', params),
  create: (data) => post('/notifications', data),
  markRead: (id) => patch(`/notifications/${id}/read`),
  markAllRead: () => post('/notifications/read-all'),
  remove: (id) => del(`/notifications/${id}`),
};

export const settingsApi = {
  get: () => get('/settings'),
  update: (data) => patch('/settings', data),
};

export const usersApi = crud('/users');
