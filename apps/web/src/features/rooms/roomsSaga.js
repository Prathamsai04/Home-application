import { call, put, takeLatest } from 'redux-saga/effects';
import { roomsApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { callApi, cleanParams } from '../../lib/sagaHelpers';
import { roomsActions } from './roomsSlice';

export function* searchAvailabilitySaga({ payload }) {
  try {
    const response = yield call(callApi, roomsApi.availability, cleanParams(payload));
    yield put(roomsActions.availabilityLoaded(response.data));
  } catch (error) {
    yield put(roomsActions.availabilityFailed(error.message));
  }
}

function* watchAvailability() {
  yield takeLatest(roomsActions.searchAvailability.type, searchAvailabilitySaga);
}

export default createCrudSaga({
  slice: { name: 'rooms', actions: roomsActions },
  api: roomsApi,
  label: 'Room',
  affects: ['lookups', 'properties', 'dashboard'],
  dependsOn: ['properties', 'reservations', 'housekeeping', 'maintenance'],
  extraWatchers: [watchAvailability],
});
