import { createCrudSlice } from '../../lib/createCrudSlice';

const paymentsSlice = createCrudSlice({
  name: 'payments',
  initialQuery: {
    sortBy: 'receivedAt',
    sortOrder: 'desc',
    type: '',
    method: '',
    propertyId: '',
    from: '',
    to: '',
  },
});

export const paymentsActions = paymentsSlice.actions;
export const selectPayments = (state) => state.payments;
export default paymentsSlice.reducer;
