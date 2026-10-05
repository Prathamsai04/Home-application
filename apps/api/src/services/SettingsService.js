import { settingsUpdateSchema } from '@homestay/shared';
import { validate } from '../core/validate.js';

export class SettingsService {
  constructor({ repositories, clock, activity }) {
    this.settings = repositories.settings;
    this.clock = clock;
    this.activity = activity;
  }

  get() {
    return this.settings.get();
  }

  update(payload, actor) {
    const input = validate(settingsUpdateSchema, payload);
    const saved = this.settings.save({ ...this.settings.get(), ...input, updatedAt: this.clock.nowIso() });
    this.activity.log({
      action: 'settings.updated',
      entityType: 'settings',
      entityId: 'settings',
      message: `Business settings updated (${Object.keys(input).join(', ') || 'no changes'})`,
      actor,
    });
    return saved;
  }
}
