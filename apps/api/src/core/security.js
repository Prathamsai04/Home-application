import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export function generateId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

const base64url = (input) => Buffer.from(input).toString('base64url');

/** Creates a compact HMAC-SHA256 signed token (stateless, works across instances). */
export function signToken(payload, secret, ttlSeconds, nowMs = Date.now()) {
  const issuedAt = Math.floor(nowMs / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: issuedAt, exp: issuedAt + ttlSeconds }));
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/** Verifies signature and expiry. Returns the payload or null. */
export function verifyToken(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}

const hashCache = new Map();

/** scrypt password hash in the form `scrypt$<salt>$<hash>`. */
export function hashPassword(password, salt = randomUUID()) {
  const cacheKey = `${salt}\u0000${password}`;
  if (hashCache.has(cacheKey)) return hashCache.get(cacheKey);
  const hash = scryptSync(password, salt, 32).toString('base64url');
  const encoded = `scrypt$${salt}$${hash}`;
  hashCache.set(cacheKey, encoded);
  return encoded;
}

export function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const [scheme, salt, hash] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(String(password), salt, 32);
  const stored = Buffer.from(hash, 'base64url');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}
