import { createCrudSlice } from '../../lib/createCrudSlice';

const reservationsSlice = createCrudSlice({
  name: 'reservations',
  initialQuery: {
    sortBy: 'checkIn',
    sortOrder: 'desc',
    status: '',
    propertyId: '',
    source: '',
    from: '',
    to: '',
  },
});

export const reservationsActions = reservationsSlice.actions;
export const selectReservations = (state) => state.reservations;
export default reservationsSlice.reducer;
