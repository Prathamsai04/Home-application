import { createCrudSlice } from '../../lib/createCrudSlice';

const roomsSlice = createCrudSlice({
  name: 'rooms',
  initialQuery: { sortBy: 'propertyName', propertyId: '', type: '', status: '' },
  extraState: { availability: { status: 'idle', items: [], params: null, error: null } },
  reducers: {
    searchAvailability(state, { payload }) {
      state.availability = { status: 'loading', items: state.availability.items, params: payload, error: null };
    },
    availabilityLoaded(state, { payload }) {
      state.availability.status = 'succeeded';
      state.availability.items = payload;
    },
    availabilityFailed(state, { payload }) {
      state.availability.status = 'failed';
      state.availability.error = payload;
      state.availability.items = [];
    },
    clearAvailability(state) {
      state.availability = { status: 'idle', items: [], params: null, error: null };
    },
  },
});

export const roomsActions = roomsSlice.actions;
export const selectRooms = (state) => state.rooms;
export default roomsSlice.reducer;
