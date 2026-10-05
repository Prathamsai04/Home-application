import { reservationsApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { reservationsActions } from './reservationsSlice';

export default createCrudSaga({
  slice: { name: 'reservations', actions: reservationsActions },
  api: reservationsApi,
  label: 'Reservation',
  affects: ['rooms', 'payments', 'dashboard', 'housekeeping', 'notifications', 'lookups', 'guests', 'properties'],
  dependsOn: ['payments', 'guests', 'rooms'],
  customActions: {
    confirm: { call: (id) => reservationsApi.confirm(id), message: 'Reservation confirmed' },
    cancel: { call: (id, data) => reservationsApi.cancel(id, data), message: 'Reservation cancelled' },
    checkIn: { call: (id) => reservationsApi.checkIn(id), message: 'Guest checked in' },
    checkOut: { call: (id) => reservationsApi.checkOut(id), message: 'Guest checked out' },
    noShow: { call: (id) => reservationsApi.noShow(id), message: 'Marked as no-show' },
  },
});
