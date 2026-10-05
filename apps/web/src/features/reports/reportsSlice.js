import { createSlice } from '@reduxjs/toolkit';
import { all, call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { reportsApi } from '../../api/endpoints';
import { refreshAll } from '../../app/syncActions';
import { callApi, cleanParams } from '../../lib/sagaHelpers';
import { isFilterComplete } from '../dashboard/dashboardSlice';

export const REPORT_TYPES = ['occupancy', 'revenue', 'reservations', 'operations'];

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    activeType: 'occupancy',
    filters: { range: '30d', from: '', to: '', propertyId: '' },
    data: {},
    status: 'idle',
    error: null,
  },
  reducers: {
    setActiveType(state, { payload }) {
      state.activeType = payload;
    },
    setFilters(state, { payload }) {
      state.filters = { ...state.filters, ...payload };
    },
    fetchReport(state) {
      state.status = 'loading';
      state.error = null;
    },
    reportLoaded(state, { payload }) {
      state.status = 'succeeded';
      state.data[payload.type] = payload.data;
    },
    reportFailed(state, { payload }) {
      state.status = 'failed';
      state.error = payload;
    },
  },
});

export const reportsActions = reportsSlice.actions;
export default reportsSlice.reducer;

export function* loadReport() {
  const { activeType, filters } = yield select((state) => state.reports);
  if (!isFilterComplete(filters)) return;
  const params = filters.range === 'custom' ? filters : { ...filters, from: '', to: '' };
  try {
    const response = yield call(callApi, reportsApi.get, activeType, cleanParams(params));
    yield put(reportsActions.reportLoaded({ type: activeType, data: response.data }));
  } catch (error) {
    yield put(reportsActions.reportFailed(error.message));
  }
}

function* refreshIfLoaded() {
  const status = yield select((state) => state.reports.status);
  if (status !== 'idle') yield call(loadReport);
}

export function* reportsSaga() {
  yield all([
    takeLatest(
      [reportsActions.fetchReport.type, reportsActions.setFilters.type, reportsActions.setActiveType.type],
      loadReport,
    ),
    takeEvery(refreshAll.type, refreshIfLoaded),
  ]);
}
