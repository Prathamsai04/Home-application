import { createSlice } from '@reduxjs/toolkit';
import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { lookupsApi } from '../../api/endpoints';
import { entitiesChanged, refreshAll, sessionReady } from '../../app/syncActions';
import { callApi } from '../../lib/sagaHelpers';

const empty = {
  properties: [],
  rooms: [],
  guests: [],
  staff: [],
  billableReservations: [],
  settings: { currency: 'INR', timezone: 'Asia/Kolkata', businessName: 'Homestay' },
};

const lookupsSlice = createSlice({
  name: 'lookups',
  initialState: { data: empty, status: 'idle', error: null },
  reducers: {
    fetchLookups(state) {
      state.status = 'loading';
    },
    lookupsLoaded(state, { payload }) {
      state.status = 'succeeded';
      state.data = payload;
    },
    lookupsFailed(state, { payload }) {
      state.status = 'failed';
      state.error = payload;
    },
  },
});

export const lookupsActions = lookupsSlice.actions;
export const selectLookups = (state) => state.lookups.data;
export const selectCurrency = (state) => state.lookups.data.settings?.currency ?? 'INR';
export default lookupsSlice.reducer;

const RELATED = ['lookups', 'properties', 'rooms', 'guests', 'users', 'settings', 'reservations', 'payments'];

function* loadLookups() {
  try {
    const response = yield call(callApi, lookupsApi.get);
    yield put(lookupsActions.lookupsLoaded(response.data));
  } catch (error) {
    yield put(lookupsActions.lookupsFailed(error.message));
  }
}

export function* lookupsSaga() {
  yield all([
    takeLatest([lookupsActions.fetchLookups.type, sessionReady.type, refreshAll.type], loadLookups),
    takeEvery(entitiesChanged.type, function* onChange({ payload }) {
      if (payload.some((module) => RELATED.includes(module))) yield call(loadLookups);
    }),
  ]);
}
