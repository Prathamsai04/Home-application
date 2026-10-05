import { notificationsApi } from '../../api/endpoints';
import { createCrudSaga } from '../../lib/createCrudSaga';
import { notificationsActions } from './notificationsSlice';

export default createCrudSaga({
  slice: { name: 'notifications', actions: notificationsActions },
  api: notificationsApi,
  label: 'Announcement',
  affects: [],
  dependsOn: ['reservations', 'payments', 'maintenance'],
  customActions: {
    markRead: { call: (id) => notificationsApi.markRead(id) },
    markAllRead: { call: () => notificationsApi.markAllRead(), message: 'All notifications marked as read' },
  },
  messages: { create: 'Announcement sent', remove: 'Notification dismissed' },
});
