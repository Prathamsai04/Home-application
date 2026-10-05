import { createCrudSlice } from '../../lib/createCrudSlice';

const housekeepingSlice = createCrudSlice({
  name: 'housekeeping',
  initialQuery: { sortBy: 'dueDate', status: '', priority: '', propertyId: '', assignedTo: '' },
});

export const housekeepingActions = housekeepingSlice.actions;
export const selectHousekeeping = (state) => state.housekeeping;
export default housekeepingSlice.reducer;
