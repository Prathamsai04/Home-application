import { all, call, put, takeLatest } from 'redux-saga/effects';
import { authApi } from '../../api/endpoints';
import { sessionReady } from '../../app/syncActions';
import { clearSession, loadSession, saveSession } from '../../lib/session';
import { callApi, toFieldErrors } from '../../lib/sagaHelpers';
import { showToast } from '../ui/uiSlice';
import { authActions } from './authSlice';

export function* loginSaga({ payload }) {
  try {
    const response = yield call(authApi.login, payload);
    const session = response.data;
    saveSession(session);
    yield put(authActions.loginSuccess(session));
    yield put(showToast({ type: 'success', message: `Welcome back, ${session.user.name.split(' ')[0]}!` }));
  } catch (error) {
    yield put(
      authActions.loginFailure({
        message: error.message ?? 'Unable to sign in',
        fieldErrors: toFieldErrors(error.errors),
      }),
    );
  }
}

function* logoutSaga() {
  try {
    yield call(authApi.logout);
  } catch {
    // Tokens are stateless; a failed logout call does not affect the local sign-out.
  }
  clearSession();
}

function* sessionExpiredSaga() {
  clearSession();
  yield put(showToast({ type: 'warning', message: 'Your session has expired. Please sign in again.' }));
}

/** Refreshes the stored profile (role or name may have changed on the server). */
function* refreshProfileSaga() {
  try {
    const response = yield call(callApi, authApi.me);
    yield put(authActions.profileLoaded(response.data));
    const session = loadSession();
    if (session) saveSession({ ...session, user: response.data });
  } catch {
    // callApi already handles 401; other failures keep the cached profile.
  }
}

export default function* authSaga() {
  yield all([
    takeLatest(authActions.loginRequest.type, loginSaga),
    takeLatest(authActions.logout.type, logoutSaga),
    takeLatest(authActions.sessionExpired.type, sessionExpiredSaga),
    takeLatest(sessionReady.type, refreshProfileSaga),
  ]);
}
