import { all, call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { entitiesChanged, refreshAll } from '../app/syncActions';
import { showToast } from '../features/ui/uiSlice';
import { callApi, cleanParams } from './sagaHelpers';

/**
 * Builds the saga for a CRUD feature slice.
 *
 * - api: { list, get, create, update, remove }
 * - customActions: { [name]: { call: (id, data) => Promise, message } } dispatched via runAction
 * - affects: other modules to refresh after a successful mutation
 * - dependsOn: modules whose changes should refresh this module
 */
export function createCrudSaga({ slice, api, label, affects = [], dependsOn = [], customActions = {}, extraWatchers = [], messages = {} }) {
  const actions = slice.actions;
  const selectState = (state) => state[slice.name];

  function* loadList() {
    const { query } = yield select(selectState);
    try {
      const response = yield call(callApi, api.list, cleanParams(query));
      yield put(actions.fetchListSuccess({ items: response.data, pagination: response.meta?.pagination, meta: response.meta }));
    } catch (error) {
      yield put(actions.fetchListFailure(error.message));
    }
  }

  function* loadOne({ payload: id }) {
    try {
      const response = yield call(callApi, api.get, id);
      yield put(actions.fetchOneSuccess(response.data));
    } catch (error) {
      yield put(actions.fetchOneFailure(error.message));
    }
  }

  function* mutate(actionName, fn, args, successMessage) {
    try {
      const response = yield call(callApi, fn, ...args);
      yield put(actions.mutationSuccess({ action: actionName, data: response.data }));
      if (successMessage) yield put(showToast({ type: 'success', message: successMessage }));
      yield put(entitiesChanged([slice.name, ...affects]));
    } catch (error) {
      yield put(actions.mutationFailure({ action: actionName, error }));
      yield put(showToast({ type: 'error', message: error.message }));
    }
  }

  function* refresh() {
    const state = yield select(selectState);
    if (state.status !== 'idle') yield call(loadList);
    if (state.current?.id) yield call(loadOne, { payload: state.current.id });
  }

  function* onEntitiesChanged({ payload: modules }) {
    if (modules.some((module) => module === slice.name || dependsOn.includes(module))) yield call(refresh);
  }

  return function* crudSaga() {
    yield all([
      takeLatest([actions.fetchList.type, actions.setQuery.type, actions.resetQuery.type], loadList),
      takeLatest(actions.fetchOne.type, loadOne),
      takeEvery(actions.create.type, ({ payload }) => mutate('create', api.create, [payload], messages.create ?? `${label} created`)),
      takeEvery(actions.update.type, ({ payload }) =>
        mutate('update', api.update, [payload.id, payload.data], messages.update ?? `${label} updated`),
      ),
      takeEvery(actions.remove.type, ({ payload }) => mutate('remove', api.remove, [payload], messages.remove ?? `${label} deleted`)),
      takeEvery(actions.runAction.type, function* runAction({ payload }) {
        const definition = customActions[payload.action];
        if (!definition) return;
        yield call(mutate, payload.action, definition.call, [payload.id, payload.data], definition.message);
      }),
      takeEvery(entitiesChanged.type, onEntitiesChanged),
      takeEvery(refreshAll.type, refresh),
      ...extraWatchers.map((watcher) => call(watcher)),
    ]);
  };
}
