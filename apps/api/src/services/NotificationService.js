import { notificationBroadcastSchema, notificationQuerySchema } from '@homestay/shared';
import { NotFoundError } from '../core/errors.js';
import { applyQuery } from '../core/query.js';
import { validate } from '../core/validate.js';

export class NotificationService {
  constructor({ repositories, activity }) {
    this.notifications = repositories.notifications;
    this.activity = activity;
  }

  #visible(user) {
    return this.notifications
      .findForRole(user.role)
      .filter((notification) => !notification.dismissedBy.includes(user.id))
      .map(({ readBy, dismissedBy, ...notification }) => ({ ...notification, read: readBy.includes(user.id) }));
  }

  #requireVisible(id, user) {
    const notification = this.notifications.getById(id);
    if (!notification || !notification.roles.includes(user.role) || notification.dismissedBy.includes(user.id)) {
      throw new NotFoundError('Notification');
    }
    return notification;
  }

  list(user, query) {
    const q = validate(notificationQuerySchema, query);
    const visible = this.#visible(user);
    const result = applyQuery(visible, {
      ...q,
      searchFields: ['title', 'message', 'type'],
      filters: { severity: q.severity, read: q.unreadOnly ? (n) => !n.read : undefined },
      sortFields: { createdAt: 'createdAt', severity: 'severity', title: 'title' },
      defaultSort: { field: 'createdAt', order: 'desc' },
    });
    return { ...result, unreadCount: visible.filter((n) => !n.read).length };
  }

  markRead(id, user) {
    const notification = this.#requireVisible(id, user);
    if (!notification.readBy.includes(user.id)) {
      this.notifications.update(id, { readBy: [...notification.readBy, user.id] });
    }
    return { id, read: true };
  }

  markAllRead(user) {
    let updated = 0;
    for (const notification of this.notifications.findForRole(user.role)) {
      if (!notification.readBy.includes(user.id)) {
        this.notifications.update(notification.id, { readBy: [...notification.readBy, user.id] });
        updated += 1;
      }
    }
    return { updated };
  }

  dismiss(id, user) {
    const notification = this.#requireVisible(id, user);
    this.notifications.update(id, { dismissedBy: [...notification.dismissedBy, user.id] });
    return { id };
  }

  broadcast(payload, actor) {
    const input = validate(notificationBroadcastSchema, payload);
    const notification = this.activity.notify({ type: 'announcement', link: '/notifications', ...input });
    this.activity.log({
      action: 'notification.broadcast',
      entityType: 'notification',
      entityId: notification.id,
      message: `Announcement sent: ${input.title}`,
      actor,
    });
    return notification;
  }
}
