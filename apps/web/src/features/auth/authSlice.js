import { createSlice } from '@reduxjs/toolkit';
import { loadSession } from '../../lib/session';

function initialAuthState() {
  const session = typeof window !== 'undefined' ? loadSession() : null;
  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    expiresAt: session?.expiresAt ?? null,
    status: 'idle',
    error: null,
    signedOut: false,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    loginRequest(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginSuccess(state, { payload }) {
      state.status = 'succeeded';
      state.user = payload.user;
      state.token = payload.token;
      state.expiresAt = payload.expiresAt;
      state.error = null;
      state.signedOut = false;
    },
    loginFailure(state, { payload }) {
      state.status = 'failed';
      state.error = payload;
    },
    profileLoaded(state, { payload }) {
      state.user = payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.expiresAt = null;
      state.status = 'idle';
      state.error = null;
      state.signedOut = true;
    },
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.expiresAt = null;
      state.status = 'idle';
      state.error = 'Your session has expired. Please sign in again.';
    },
  },
});

export const authActions = authSlice.actions;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.token && state.auth.user);
export default authSlice.reducer;
