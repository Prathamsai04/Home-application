import { paymentsApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { paymentsActions } from './paymentsSlice';

export default createCrudSaga({
  slice: { name: 'payments', actions: paymentsActions },
  api: { ...paymentsApi, remove: () => Promise.reject({ message: 'Payments are immutable ledger entries' }) },
  label: 'Payment',
  affects: ['reservations', 'dashboard', 'notifications', 'lookups', 'guests'],
  dependsOn: ['reservations'],
  customActions: {
    refund: { call: (id, data) => paymentsApi.refund(data), message: 'Refund recorded' },
  },
  messages: { create: 'Payment recorded', update: 'Payment details updated' },
});
