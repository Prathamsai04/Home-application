import { loginSchema } from '@homestay/shared';
import { UnauthorizedError } from '../core/errors.js';
import { signToken, verifyPassword, verifyToken } from '../core/security.js';
import { validate } from '../core/validate.js';
import { sanitizeUser } from './helpers.js';

/** Mock authentication with stateless signed tokens (no external identity provider). */
export class AuthService {
  constructor({ repositories, clock, config, activity }) {
    this.users = repositories.users;
    this.clock = clock;
    this.config = config;
    this.activity = activity;
  }

  login(payload) {
    const { email, password } = validate(loginSchema, payload);
    const user = this.users.findByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.active) throw new UnauthorizedError('This account has been deactivated');

    const updated = this.users.update(user.id, { lastLoginAt: this.clock.nowIso() });
    const token = signToken(
      { sub: user.id, role: user.role, name: user.name, email: user.email },
      this.config.AUTH_TOKEN_SECRET,
      this.config.AUTH_TOKEN_TTL_SECONDS,
    );
    const expiresAt = new Date(Date.now() + this.config.AUTH_TOKEN_TTL_SECONDS * 1000).toISOString();
    this.activity.log({
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      message: `${user.name} signed in`,
      actor: user,
    });
    return { token, expiresAt, user: sanitizeUser(updated) };
  }

  /**
   * Resolves the session principal. Tokens are self-contained so they remain
   * valid on any serverless instance; if the user exists in this instance's
   * store, its current role and active flag take precedence.
   */
  authenticate(token) {
    const payload = verifyToken(token, this.config.AUTH_TOKEN_SECRET);
    if (!payload) throw new UnauthorizedError('Your session has expired. Please sign in again.');
    const stored = this.users.getById(payload.sub);
    if (stored && !stored.active) throw new UnauthorizedError('This account has been deactivated');
    return stored
      ? { id: stored.id, name: stored.name, email: stored.email, role: stored.role }
      : { id: payload.sub, name: payload.name, email: payload.email, role: payload.role };
  }

  me(principal) {
    const stored = this.users.getById(principal.id);
    return stored ? sanitizeUser(stored) : { ...principal, active: true };
  }
}
