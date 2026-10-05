import { usersApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { usersActions } from './usersSlice';

export default createCrudSaga({
  slice: { name: 'users', actions: usersActions },
  api: usersApi,
  label: 'User',
  affects: ['lookups', 'housekeeping', 'maintenance'],
  dependsOn: [],
  customActions: {},
});
