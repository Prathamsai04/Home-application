import { createCrudSlice } from '../../lib/createCrudSlice';

const guestsSlice = createCrudSlice({
  name: 'guests',
  initialQuery: { sortBy: 'name' },
});

export const guestsActions = guestsSlice.actions;
export const selectGuests = (state) => state.guests;
export default guestsSlice.reducer;
