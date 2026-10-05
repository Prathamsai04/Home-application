import { randomUUID } from 'node:crypto';
import { can } from '@homestay/shared';
import { AppError, ForbiddenError, NotFoundError, RateLimitError, UnauthorizedError } from '../core/errors.js';
import { sendError } from '../core/response.js';

const CORRELATION_ID = /^[A-Za-z0-9._-]{8,64}$/;

export function correlationId(req, res, next) {
  const incoming = req.get('x-correlation-id');
  const id = incoming && CORRELATION_ID.test(incoming) ? incoming : randomUUID();
  res.locals.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}

export function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<\/?[a-zA-Z][^>]*>/g;

export function sanitizeValue(value, depth = 0) {
  if (depth > 10) return undefined;
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '').replace(HTML_TAGS, '');
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => sanitizeValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, inner] of Object.entries(value)) {
      if (!FORBIDDEN_KEYS.has(key)) clean[key] = sanitizeValue(inner, depth + 1);
    }
    return clean;
  }
  return value;
}

/** Strips HTML tags, control characters and prototype-pollution keys from input. */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  const query = sanitizeValue({ ...req.query });
  Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true });
  next();
}

/**
 * Fixed-window rate limiter keyed by client IP. State is per serverless
 * instance (no shared store), which is an accepted trade-off for the demo.
 */
export function rateLimit({ windowMs, max, name = 'global' }) {
  const hits = new Map();
  let lastSweep = Date.now();
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
      lastSweep = now;
    }
    const key = `${name}:${req.ip ?? 'unknown'}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil((entry.resetAt - now) / 1000)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new RateLimitError());
    }
    return next();
  };
}

export function attachContainer(resolveContainer) {
  return (req, res, next) => {
    const container = resolveContainer();
    req.services = container.services;
    next();
  };
}

export function authenticate(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new UnauthorizedError());
  req.user = req.services.auth.authenticate(token);
  return next();
}

export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!can(req.user.role, permission)) return next(new ForbiddenError());
    return next();
  };
}

export function notFound(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return sendError(res, err.status, err.errors);
  }
  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 400, [{ code: 'INVALID_JSON', message: 'Request body is not valid JSON' }]);
  }
  if (err?.type === 'entity.too.large') {
    return sendError(res, 413, [{ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }]);
  }
  console.error(`[${res.locals.correlationId}] Unhandled error:`, err);
  return sendError(res, 500, [{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' }]);
}
