import { createAction } from '@reduxjs/toolkit';

/** Dispatched after successful mutations so dependent modules can refresh. */
export const entitiesChanged = createAction('sync/entitiesChanged', (modules) => ({ payload: modules }));

/** Forces every loaded module to refetch (e.g. after a demo reset). */
export const refreshAll = createAction('sync/refreshAll');

/** Dispatched once the app has an authenticated session (login or restored). */
export const sessionReady = createAction('sync/sessionReady');
