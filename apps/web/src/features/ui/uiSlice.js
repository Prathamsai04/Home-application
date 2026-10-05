import { createSlice, nanoid } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [], sidebarOpen: false },
  reducers: {
    showToast: {
      reducer(state, { payload }) {
        state.toasts.push(payload);
        if (state.toasts.length > 5) state.toasts.shift();
      },
      prepare({ type = 'info', message, title }) {
        return { payload: { id: nanoid(), type, message, title } };
      },
    },
    dismissToast(state, { payload }) {
      state.toasts = state.toasts.filter((toast) => toast.id !== payload);
    },
    setSidebarOpen(state, { payload }) {
      state.sidebarOpen = payload;
    },
  },
});

export const { showToast, dismissToast, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
