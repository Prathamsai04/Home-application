import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { can, formatMoney } from '@homestay/shared';
import { selectCurrency } from '../features/lookups/lookupsSlice';

/** Returns a permission checker bound to the signed-in user's role. */
export function usePermission() {
  const role = useSelector((state) => state.auth.user?.role);
  return useCallback((permission) => can(role, permission), [role]);
}

/** Returns a money formatter bound to the business currency setting. */
export function useMoney() {
  const currency = useSelector(selectCurrency);
  return useCallback((minor) => formatMoney(minor ?? 0, currency), [currency]);
}

/**
 * Runs `onSuccess` once when the given slice finishes one of `actions`
 * successfully, then resets the mutation state.
 */
export function useMutationSuccess(sliceName, resetAction, actions, onSuccess) {
  const dispatch = useDispatch();
  const mutation = useSelector((state) => state[sliceName].mutation);
  const callbackRef = useRef(onSuccess);
  callbackRef.current = onSuccess;
  const key = actions.join('|');

  useEffect(() => {
    if (mutation.status === 'succeeded' && key.split('|').includes(mutation.action)) {
      callbackRef.current?.(mutation.result, mutation.action);
      dispatch(resetAction());
    }
  }, [mutation, key, dispatch, resetAction]);

  return mutation;
}

/** Pushes server-side field errors into react-hook-form. */
export function useServerErrors(fieldErrors, setError) {
  useEffect(() => {
    Object.entries(fieldErrors ?? {}).forEach(([field, message]) => setError(field, { type: 'server', message }));
  }, [fieldErrors, setError]);
}
