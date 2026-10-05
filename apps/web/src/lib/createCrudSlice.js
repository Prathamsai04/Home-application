import { createSlice } from '@reduxjs/toolkit';
import { toFieldErrors } from './sagaHelpers';

export const idleMutation = { status: 'idle', action: null, targetId: null, error: null, fieldErrors: {}, result: null };

const pending = (action, targetId = null) => ({ ...idleMutation, status: 'pending', action, targetId });

/**
 * Builds a feature slice with a uniform shape for list, detail and mutation
 * state. Async work for every action lives in the matching saga.
 */
export function createCrudSlice({ name, initialQuery = {}, extraState = {}, reducers = {} }) {
  const initialState = {
    items: [],
    pagination: { page: 1, pageSize: initialQuery.pageSize ?? 10, total: 0, totalPages: 1 },
    meta: {},
    query: { page: 1, pageSize: 10, search: '', sortBy: '', sortOrder: 'asc', ...initialQuery },
    status: 'idle',
    error: null,
    current: null,
    currentStatus: 'idle',
    currentError: null,
    mutation: idleMutation,
    ...extraState,
  };

  return createSlice({
    name,
    initialState,
    reducers: {
      fetchList(state) {
        state.status = 'loading';
        state.error = null;
      },
      fetchListSuccess(state, { payload }) {
        state.status = 'succeeded';
        state.items = payload.items;
        state.pagination = payload.pagination ?? state.pagination;
        state.meta = payload.meta ?? {};
      },
      fetchListFailure(state, { payload }) {
        state.status = 'failed';
        state.error = payload;
      },
      setQuery(state, { payload }) {
        const resetPage = !Object.prototype.hasOwnProperty.call(payload, 'page');
        state.query = { ...state.query, ...payload, ...(resetPage ? { page: 1 } : {}) };
        state.status = 'loading';
      },
      resetQuery(state) {
        state.query = initialState.query;
        state.status = 'loading';
      },
      fetchOne(state, { payload }) {
        state.currentStatus = 'loading';
        state.currentError = null;
        if (state.current?.id !== payload) state.current = null;
      },
      fetchOneSuccess(state, { payload }) {
        state.currentStatus = 'succeeded';
        state.current = payload;
      },
      fetchOneFailure(state, { payload }) {
        state.currentStatus = 'failed';
        state.currentError = payload;
      },
      clearCurrent(state) {
        state.current = null;
        state.currentStatus = 'idle';
        state.currentError = null;
      },
      create(state) {
        state.mutation = pending('create');
      },
      update(state, { payload }) {
        state.mutation = pending('update', payload?.id);
      },
      remove(state, { payload }) {
        state.mutation = pending('remove', payload);
      },
      runAction(state, { payload }) {
        state.mutation = pending(payload.action, payload.id);
      },
      mutationSuccess(state, { payload }) {
        state.mutation = { ...idleMutation, status: 'succeeded', action: payload.action, targetId: state.mutation.targetId, result: payload.data };
        if (payload.action === 'remove' && state.current?.id === payload.data?.id) state.current = null;
      },
      mutationFailure(state, { payload }) {
        state.mutation = {
          ...idleMutation,
          status: 'failed',
          action: payload.action,
          targetId: state.mutation.targetId,
          error: payload.error.message,
          fieldErrors: toFieldErrors(payload.error.errors),
        };
      },
      resetMutation(state) {
        state.mutation = idleMutation;
      },
      ...reducers,
    },
  });
}
