import { createSlice } from '@reduxjs/toolkit';
import { all, call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { dashboardApi } from '../../api/endpoints';
import { entitiesChanged, refreshAll } from '../../app/syncActions';
import { callApi, cleanParams } from '../../lib/sagaHelpers';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    filters: { range: '30d', from: '', to: '', propertyId: '' },
    data: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    fetchDashboard(state) {
      state.status = 'loading';
      state.error = null;
    },
    setFilters(state, { payload }) {
      state.filters = { ...state.filters, ...payload };
    },
    dashboardLoaded(state, { payload }) {
      state.status = 'succeeded';
      state.data = payload;
    },
    dashboardFailed(state, { payload }) {
      state.status = 'failed';
      state.error = payload;
    },
  },
});

export const dashboardActions = dashboardSlice.actions;
export default dashboardSlice.reducer;

/** Custom ranges are only requested once both dates are present. */
export function isFilterComplete(filters) {
  return filters.range !== 'custom' || Boolean(filters.from && filters.to && filters.from <= filters.to);
}

export function* loadDashboard() {
  const filters = yield select((state) => state.dashboard.filters);
  if (!isFilterComplete(filters)) return;
  const params = filters.range === 'custom' ? filters : { ...filters, from: '', to: '' };
  try {
    const response = yield call(callApi, dashboardApi.overview, cleanParams(params));
    yield put(dashboardActions.dashboardLoaded(response.data));
  } catch (error) {
    yield put(dashboardActions.dashboardFailed(error.message));
  }
}

function* refreshIfLoaded() {
  const status = yield select((state) => state.dashboard.status);
  if (status !== 'idle') yield call(loadDashboard);
}

export function* dashboardSaga() {
  yield all([
    takeLatest([dashboardActions.fetchDashboard.type, dashboardActions.setFilters.type], loadDashboard),
    takeEvery([entitiesChanged.type, refreshAll.type], refreshIfLoaded),
  ]);
}
