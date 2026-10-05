import { createCrudSlice } from '../../lib/createCrudSlice';

const usersSlice = createCrudSlice({
  name: 'users',
  initialQuery: { sortBy: 'name' },
});

export const usersActions = usersSlice.actions;
export const selectUsers = (state) => state.users;
export default usersSlice.reducer;
