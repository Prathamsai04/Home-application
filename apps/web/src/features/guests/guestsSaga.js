import { guestsApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { guestsActions } from './guestsSlice';

export default createCrudSaga({
  slice: { name: 'guests', actions: guestsActions },
  api: guestsApi,
  label: 'Guest',
  affects: ['lookups', 'reservations'],
  dependsOn: ['reservations', 'payments'],
  customActions: {},
});
