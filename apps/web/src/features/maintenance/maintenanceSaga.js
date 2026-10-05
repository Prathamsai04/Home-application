import { maintenanceApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { maintenanceActions } from './maintenanceSlice';

export default createCrudSaga({
  slice: { name: 'maintenance', actions: maintenanceActions },
  api: maintenanceApi,
  label: 'Maintenance request',
  affects: ['rooms', 'dashboard', 'notifications', 'properties'],
  dependsOn: ['users'],
  customActions: {
    assign: { call: (id, data) => maintenanceApi.assign(id, data), message: 'Request assigned' },
    start: { call: (id) => maintenanceApi.start(id), message: 'Work started' },
    resolve: { call: (id, data) => maintenanceApi.resolve(id, data), message: 'Request resolved' },
  },
});
