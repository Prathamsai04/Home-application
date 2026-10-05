import { createCrudSlice } from '../../lib/createCrudSlice';

const propertiesSlice = createCrudSlice({
  name: 'properties',
  initialQuery: { sortBy: 'name', pageSize: 9 },
});

export const propertiesActions = propertiesSlice.actions;
export const selectProperties = (state) => state.properties;
export default propertiesSlice.reducer;
