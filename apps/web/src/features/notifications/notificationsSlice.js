import { createCrudSlice } from '../../lib/createCrudSlice';

const notificationsSlice = createCrudSlice({
  name: 'notifications',
  initialQuery: { sortBy: 'createdAt', sortOrder: 'desc', unreadOnly: '', severity: '' },
});

export const notificationsActions = notificationsSlice.actions;
export const selectNotifications = (state) => state.notifications;
export default notificationsSlice.reducer;
