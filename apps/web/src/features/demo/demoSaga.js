import { all, call, delay, put, race, select, take, takeLatest } from 'redux-saga/effects';
import { demoApi } from '../../api/endpoints';
import { refreshAll, sessionReady } from '../../app/syncActions';
import { callApi } from '../../lib/sagaHelpers';
import { authActions } from '../auth/authSlice';
import { showToast } from '../ui/uiSlice';
import { demoActions } from './demoSlice';

const POLL_INTERVAL_MS = 60_000;

/**
 * Loads seed status and detects serverless instance changes. When a request is
 * served by an instance whose seed differs from the one we last saw (new cold
 * start or another user's reset), the UI is told that data was restored.
 */
export function* loadDemoStatus() {
  const previous = yield select((state) => state.demo);
  try {
    const response = yield call(demoApi.status);
    const status = response.data;
    const before = previous.status;
    const seedChanged = before && status.seededAt !== before.seededAt;
    const unseenInstance = before && !previous.knownInstances.includes(status.instanceId);
    yield put(demoActions.statusLoaded(status));
    if (seedChanged && unseenInstance) {
      const message = 'You are now served by a fresh demo instance. Data has been restored from the seed.';
      yield put(demoActions.setNotice(message));
      yield put(showToast({ type: 'info', message }));
      yield put(refreshAll());
    }
  } catch (error) {
    yield put(demoActions.statusFailed(error.message ?? 'Unable to load demo status'));
  }
}

function* pollDemoStatus() {
  while (true) {
    yield call(loadDemoStatus);
    const { stop } = yield race({
      tick: delay(POLL_INTERVAL_MS),
      stop: take([authActions.logout.type, authActions.sessionExpired.type]),
    });
    if (stop) return;
  }
}

function* runDemoAction(kind) {
  try {
    const response = yield call(callApi, kind === 'reset' ? demoApi.reset : demoApi.reload);
    yield put(demoActions.statusLoaded(response.data));
    yield put(demoActions.setNotice(null));
    yield put(
      showToast({
        type: 'success',
        message: kind === 'reset' ? 'Demo data reset to the original seed.' : 'Seed data reloaded for today.',
      }),
    );
    yield put(refreshAll());
  } catch (error) {
    yield put(showToast({ type: 'error', message: error.message }));
  } finally {
    yield put(demoActions.actionFinished());
  }
}

export default function* demoSaga() {
  yield all([
    takeLatest(demoActions.fetchStatus.type, loadDemoStatus),
    takeLatest(sessionReady.type, pollDemoStatus),
    takeLatest(demoActions.resetRequest.type, () => runDemoAction('reset')),
    takeLatest(demoActions.reloadRequest.type, () => runDemoAction('reload')),
  ]);
}
