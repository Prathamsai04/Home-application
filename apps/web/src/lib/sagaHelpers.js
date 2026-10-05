import { call, put } from 'redux-saga/effects';
import { authActions } from '../features/auth/authSlice';

/**
 * Calls an API function and normalises failures. A 401 from any protected
 * endpoint ends the session globally.
 */
export function* callApi(fn, ...args) {
  try {
    return yield call(fn, ...args);
  } catch (error) {
    const plain = {
      message: error?.message ?? 'Request failed',
      status: error?.status ?? 0,
      errors: error?.errors ?? [],
    };
    if (plain.status === 401) yield put(authActions.sessionExpired());
    throw plain;
  }
}

/** Removes empty values so they are not sent as query parameters. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  );
}

/** Converts API error items into a { field: message } map for forms. */
export function toFieldErrors(errors = []) {
  return errors.reduce((acc, error) => {
    if (error.field && !acc[error.field]) acc[error.field] = error.message;
    return acc;
  }, {});
}
