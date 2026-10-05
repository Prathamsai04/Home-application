import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { getContainer } from './container.js';
import {
  attachContainer,
  correlationId,
  errorHandler,
  noStore,
  notFound,
  rateLimit,
  sanitizeInput,
} from './middleware/index.js';
import { createV1Router } from './routes/v1.js';

/**
 * Builds the Express application.
 *
 * @param {object} [options]
 * @param {object} [options.container] Inject a container (tests). Defaults to the per-instance singleton.
 * @param {object} [options.limits] Override rate limits ({ windowMs, max, authMax }).
 */
export function createApp({ container, limits = {} } = {}) {
  const resolveContainer = container ? () => container : getContainer;
  const { config } = resolveContainer();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.set('query parser', 'extended');

  app.use(correlationId);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigins === '*' ? true : config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
      exposedHeaders: ['X-Correlation-Id', 'RateLimit-Remaining'],
      maxAge: 600,
    }),
  );
  app.use(noStore);
  app.use(
    rateLimit({
      name: 'global',
      windowMs: limits.windowMs ?? config.RATE_LIMIT_WINDOW_MS,
      max: limits.max ?? config.RATE_LIMIT_MAX,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeInput);
  app.use(attachContainer(resolveContainer));

  app.use('/api/v1', createV1Router(config, limits));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
