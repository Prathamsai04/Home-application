import { createSlice } from '@reduxjs/toolkit';
import { all, call, put, takeLatest } from 'redux-saga/effects';
import { settingsApi } from '../../api/endpoints';
import { entitiesChanged, refreshAll } from '../../app/syncActions';
import { callApi, toFieldErrors } from '../../lib/sagaHelpers';
import { showToast } from '../ui/uiSlice';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { data: null, status: 'idle', error: null, saving: false, saveStatus: 'idle', fieldErrors: {} },
  reducers: {
    fetchSettings(state) {
      state.status = 'loading';
    },
    settingsLoaded(state, { payload }) {
      state.status = 'succeeded';
      state.data = payload;
    },
    settingsFailed(state, { payload }) {
      state.status = 'failed';
      state.error = payload;
    },
    saveSettings(state) {
      state.saving = true;
      state.saveStatus = 'pending';
      state.fieldErrors = {};
    },
    saveSucceeded(state, { payload }) {
      state.saving = false;
      state.saveStatus = 'succeeded';
      state.data = payload;
    },
    saveFailed(state, { payload }) {
      state.saving = false;
      state.saveStatus = 'failed';
      state.fieldErrors = payload;
    },
  },
});

export const settingsActions = settingsSlice.actions;
export default settingsSlice.reducer;

function* loadSettings() {
  try {
    const response = yield call(callApi, settingsApi.get);
    yield put(settingsActions.settingsLoaded(response.data));
  } catch (error) {
    yield put(settingsActions.settingsFailed(error.message));
  }
}

function* saveSettings({ payload }) {
  try {
    const response = yield call(callApi, settingsApi.update, payload);
    yield put(settingsActions.saveSucceeded(response.data));
    yield put(showToast({ type: 'success', message: 'Settings saved' }));
    yield put(entitiesChanged(['settings']));
  } catch (error) {
    yield put(settingsActions.saveFailed(toFieldErrors(error.errors)));
    yield put(showToast({ type: 'error', message: error.message }));
  }
}

export function* settingsSaga() {
  yield all([
    takeLatest([settingsActions.fetchSettings.type, refreshAll.type], loadSettings),
    takeLatest(settingsActions.saveSettings.type, saveSettings),
  ]);
}
