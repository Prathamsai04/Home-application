import { combineReducers, configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import authReducer, { authActions } from '../features/auth/authSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import demoReducer from '../features/demo/demoSlice';
import guestsReducer from '../features/guests/guestsSlice';
import housekeepingReducer from '../features/housekeeping/housekeepingSlice';
import lookupsReducer from '../features/lookups/lookupsSlice';
import maintenanceReducer from '../features/maintenance/maintenanceSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import paymentsReducer from '../features/payments/paymentsSlice';
import propertiesReducer from '../features/properties/propertiesSlice';
import reportsReducer from '../features/reports/reportsSlice';
import reservationsReducer from '../features/reservations/reservationsSlice';
import roomsReducer from '../features/rooms/roomsSlice';
import settingsReducer from '../features/settings/settingsSlice';
import uiReducer from '../features/ui/uiSlice';
import usersReducer from '../features/users/usersSlice';
import rootSaga from './rootSaga';

const appReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  demo: demoReducer,
  lookups: lookupsReducer,
  dashboard: dashboardReducer,
  reports: reportsReducer,
  settings: settingsReducer,
  properties: propertiesReducer,
  rooms: roomsReducer,
  guests: guestsReducer,
  reservations: reservationsReducer,
  payments: paymentsReducer,
  housekeeping: housekeepingReducer,
  maintenance: maintenanceReducer,
  notifications: notificationsReducer,
  users: usersReducer,
});

/** Clears all cached business data on logout / expiry; keeps toasts and demo status. */
export function rootReducer(state, action) {
  if (action.type === authActions.logout.type || action.type === authActions.sessionExpired.type) {
    const preserved = state ? { ui: state.ui, demo: state.demo } : undefined;
    return appReducer(preserved, action);
  }
  return appReducer(state, action);
}

export function createAppStore(preloadedState) {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
  });
  sagaMiddleware.run(rootSaga);
  return store;
}
