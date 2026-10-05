import { randomUUID } from 'node:crypto';
import { DEMO_USERS_PASSWORD } from '@homestay/shared';
import { generateSeedData } from '@homestay/seed-data';
import { hashPassword } from '../core/security.js';

/**
 * Owns the lifecycle of the seeded in-memory dataset.
 *
 * Serverless behaviour: every function instance calls `ensureSeeded()` lazily
 * on its first request (cold start). Because the generator is deterministic and
 * anchored to the business date, all instances start from identical data. The
 * `instanceId` and `seededAt` values let clients detect when they are served by
 * a fresh instance whose memory no longer contains earlier changes.
 */
export class DemoService {
  constructor({ storage, repositories, clock, seedGenerator = generateSeedData }) {
    this.storage = storage;
    this.repositories = repositories;
    this.clock = clock;
    this.seedGenerator = seedGenerator;
    this.instanceId = randomUUID().slice(0, 8);
    this.instanceStartedAt = clock.nowIso();
    this.resetCount = 0;
  }

  ensureSeeded() {
    if (!this.repositories.demoMeta.get()) this.#seed('cold_start', this.clock.today());
    return this.status();
  }

  /** Discards every change and restores the original seed snapshot (same anchor date). */
  reset(actor) {
    const anchorDate = this.repositories.demoMeta.get()?.anchorDate ?? this.clock.today();
    this.resetCount += 1;
    this.#seed('reset', anchorDate, actor);
    return this.status();
  }

  /** Regenerates the seed anchored to today so arrivals/departures align with the current date. */
  reload(actor) {
    this.resetCount += 1;
    this.#seed('reload', this.clock.today(), actor);
    return this.status();
  }

  status() {
    const meta = this.repositories.demoMeta.get();
    const counts = {
      properties: this.repositories.properties.count(),
      rooms: this.repositories.rooms.count(),
      guests: this.repositories.guests.count(),
      reservations: this.repositories.reservations.count(),
      payments: this.repositories.payments.count(),
      housekeepingTasks: this.repositories.housekeeping.count(),
      maintenanceRequests: this.repositories.maintenance.count(),
      users: this.repositories.users.count(),
    };
    return {
      mode: 'demo',
      storageProvider: this.storage.name,
      persistence: 'ephemeral',
      instanceId: this.instanceId,
      instanceStartedAt: this.instanceStartedAt,
      resetCount: this.resetCount,
      today: this.clock.today(),
      serverTime: this.clock.nowIso(),
      ...meta,
      counts,
    };
  }

  #seed(reason, anchorDate, actor) {
    const data = this.seedGenerator({ anchorDate, password: DEMO_USERS_PASSWORD });
    const users = data.collections.users.map(({ password, ...user }) => ({
      ...user,
      passwordHash: hashPassword(password, `seed-${user.id}`),
    }));
    this.storage.replaceAll({
      collections: { ...data.collections, users },
      documents: { ...data.documents },
    });
    this.repositories.demoMeta.save({
      seedVersion: data.meta.seedVersion,
      seed: data.meta.seed,
      anchorDate: data.meta.anchorDate,
      seededAt: this.clock.nowIso(),
      seedReason: reason,
      seededBy: actor?.name ?? 'system',
    });
  }
}
