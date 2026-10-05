import { createSlice } from '@reduxjs/toolkit';

const demoSlice = createSlice({
  name: 'demo',
  initialState: {
    status: null,
    loading: false,
    pendingAction: null,
    error: null,
    knownInstances: [],
    notice: null,
  },
  reducers: {
    fetchStatus(state) {
      state.loading = true;
    },
    statusLoaded(state, { payload }) {
      state.loading = false;
      state.status = payload;
      state.error = null;
      if (payload?.instanceId && !state.knownInstances.includes(payload.instanceId)) {
        state.knownInstances.push(payload.instanceId);
      }
    },
    statusFailed(state, { payload }) {
      state.loading = false;
      state.error = payload;
    },
    resetRequest(state) {
      state.pendingAction = 'reset';
    },
    reloadRequest(state) {
      state.pendingAction = 'reload';
    },
    actionFinished(state) {
      state.pendingAction = null;
    },
    setNotice(state, { payload }) {
      state.notice = payload;
    },
  },
});

export const demoActions = demoSlice.actions;
export default demoSlice.reducer;
