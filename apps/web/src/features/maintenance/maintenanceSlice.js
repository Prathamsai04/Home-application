import { createCrudSlice } from '../../lib/createCrudSlice';

const maintenanceSlice = createCrudSlice({
  name: 'maintenance',
  initialQuery: { sortBy: 'reportedAt', sortOrder: 'desc', status: '', priority: '', category: '', propertyId: '' },
});

export const maintenanceActions = maintenanceSlice.actions;
export const selectMaintenance = (state) => state.maintenance;
export default maintenanceSlice.reducer;
