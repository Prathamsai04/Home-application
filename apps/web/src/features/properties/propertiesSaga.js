import { propertiesApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { propertiesActions } from './propertiesSlice';

export default createCrudSaga({
  slice: { name: 'properties', actions: propertiesActions },
  api: propertiesApi,
  label: 'Property',
  affects: ['rooms', 'dashboard', 'lookups'],
  dependsOn: ['rooms', 'reservations', 'maintenance'],
  customActions: {},
});
