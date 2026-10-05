import { loadConfig } from './config/env.js';
import { createClock } from './core/clock.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { MemoryStorageProvider, assertStorageProvider } from './storage/MemoryStorageProvider.js';

/**
 * Composition root. Builds storage -> repositories -> services.
 *
 * To introduce another storage provider later (PostgreSQL, MongoDB, Redis...)
 * pass a different `storage` implementation that satisfies the provider
 * contract; repositories and services remain unchanged.
 */
export function createContainer({ config = loadConfig(), storage = new MemoryStorageProvider(), clock, seedGenerator } = {}) {
  assertStorageProvider(storage);
  const repositories = createRepositories(storage);
  const resolvedClock =
    clock ?? createClock({ getTimeZone: () => repositories.settings.get()?.timezone ?? config.DEMO_TIMEZONE });
  const services = createServices({ storage, repositories, clock: resolvedClock, config, seedGenerator });
  services.demo.ensureSeeded();
  return { config, storage, repositories, clock: resolvedClock, services };
}

let singleton = null;

/**
 * Per-instance singleton. On Vercel each serverless instance gets its own
 * module scope, so this is created (and seeded) once per cold start and reused
 * across warm invocations of the same instance.
 */
export function getContainer() {
  if (!singleton) singleton = createContainer();
  return singleton;
}
