import { z } from 'zod';
import { isValidTimeZone } from '@homestay/shared';

const DEMO_SECRET = 'homestay-demo-signing-secret-not-for-production-use';

const blankToUndefined = (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.preprocess(blankToUndefined, z.enum(['development', 'test', 'production']).default('development')),
  AUTH_TOKEN_SECRET: z.preprocess(
    blankToUndefined,
    z.string().min(32, 'AUTH_TOKEN_SECRET must be at least 32 characters').default(DEMO_SECRET),
  ),
  AUTH_TOKEN_TTL_SECONDS: z.preprocess(blankToUndefined, z.coerce.number().int().min(300).max(604800).default(43200)),
  CORS_ORIGIN: z.preprocess(blankToUndefined, z.string().default('*')),
  RATE_LIMIT_WINDOW_MS: z.preprocess(blankToUndefined, z.coerce.number().int().min(1000).max(3_600_000).default(60_000)),
  RATE_LIMIT_MAX: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100_000).default(300)),
  AUTH_RATE_LIMIT_MAX: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(10_000).default(20)),
  DEMO_TIMEZONE: z.preprocess(
    blankToUndefined,
    z.string().default('Asia/Kolkata').refine(isValidTimeZone, 'DEMO_TIMEZONE must be a valid IANA time zone'),
  ),
});

/**
 * Validates environment variables at startup. Invalid configuration fails fast
 * with a readable message instead of surfacing as runtime errors later.
 */
export function loadConfig(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration - ${details}`);
  }
  const config = result.data;
  return Object.freeze({
    ...config,
    usingDemoSecret: config.AUTH_TOKEN_SECRET === DEMO_SECRET,
    corsOrigins:
      config.CORS_ORIGIN.trim() === '*'
        ? '*'
        : config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  });
}
