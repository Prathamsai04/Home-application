import { NOTIFICATION_SEVERITY } from '@homestay/shared';
import { generateId } from '../core/security.js';
import { ALL_ROLES, actorName } from './helpers.js';

const MAX_ACTIVITIES = 500;
const MAX_NOTIFICATIONS = 200;

/** Records the audit trail (recent activity) and in-app notifications. */
export class ActivityService {
  constructor({ repositories, clock }) {
    this.activities = repositories.activities;
    this.notifications = repositories.notifications;
    this.clock = clock;
  }

  log({ action, entityType, entityId, message, actor }) {
    const activity = this.activities.create({
      id: generateId('act'),
      action,
      entityType,
      entityId,
      message,
      actorName: actorName(actor),
      createdAt: this.clock.nowIso(),
    });
    this.#trim(this.activities, MAX_ACTIVITIES);
    return activity;
  }

  notify({ type = 'system', title, message, severity = NOTIFICATION_SEVERITY.INFO, roles = ALL_ROLES, link = '/' }) {
    const notification = this.notifications.create({
      id: generateId('ntf'),
      type,
      title,
      message,
      severity,
      roles,
      link,
      readBy: [],
      dismissedBy: [],
      createdAt: this.clock.nowIso(),
    });
    this.#trim(this.notifications, MAX_NOTIFICATIONS);
    return notification;
  }

  recent(limit = 10) {
    return this.activities.getRecent(limit);
  }

  #trim(repository, max) {
    if (repository.count() <= max) return;
    const overflow = repository
      .getAll()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, repository.count() - max);
    overflow.forEach((record) => repository.delete(record.id));
  }
}
