import { housekeepingApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { housekeepingActions } from './housekeepingSlice';

export default createCrudSaga({
  slice: { name: 'housekeeping', actions: housekeepingActions },
  api: housekeepingApi,
  label: 'Task',
  affects: ['rooms', 'dashboard', 'properties'],
  dependsOn: ['reservations', 'users'],
  customActions: {
    assign: { call: (id, data) => housekeepingApi.assign(id, data), message: 'Task assigned' },
    start: { call: (id) => housekeepingApi.start(id), message: 'Task started' },
    complete: { call: (id, data) => housekeepingApi.complete(id, data), message: 'Task completed' },
    reopen: { call: (id) => housekeepingApi.reopen(id), message: 'Task reopened' },
  },
});
