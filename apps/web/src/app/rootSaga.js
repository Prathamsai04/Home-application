import { all, fork } from 'redux-saga/effects';
import authSaga from '../features/auth/authSaga';
import { dashboardSaga } from '../features/dashboard/dashboardSlice';
import demoSaga from '../features/demo/demoSaga';
import guestsSaga from '../features/guests/guestsSaga';
import housekeepingSaga from '../features/housekeeping/housekeepingSaga';
import { lookupsSaga } from '../features/lookups/lookupsSlice';
import maintenanceSaga from '../features/maintenance/maintenanceSaga';
import notificationsSaga from '../features/notifications/notificationsSaga';
import paymentsSaga from '../features/payments/paymentsSaga';
import propertiesSaga from '../features/properties/propertiesSaga';
import { reportsSaga } from '../features/reports/reportsSlice';
import reservationsSaga from '../features/reservations/reservationsSaga';
import roomsSaga from '../features/rooms/roomsSaga';
import { settingsSaga } from '../features/settings/settingsSlice';
import usersSaga from '../features/users/usersSaga';

export default function* rootSaga() {
  yield all(
    [
      authSaga,
      demoSaga,
      lookupsSaga,
      dashboardSaga,
      reportsSaga,
      settingsSaga,
      propertiesSaga,
      roomsSaga,
      guestsSaga,
      reservationsSaga,
      paymentsSaga,
      housekeepingSaga,
      maintenanceSaga,
      notificationsSaga,
      usersSaga,
    ].map((saga) => fork(saga)),
  );
}
