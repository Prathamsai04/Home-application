import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import handler from '../../../api/index.js';
import { loadConfig } from '../src/config/env.js';

describe('Vercel serverless entry (api/index.js)', () => {
  const request = supertest(handler);

  it('serves the API from a lazily seeded per-instance container', async () => {
    const health = await request.get('/api/v1/health');
    expect(health.status).toBe(200);
    const status = await request.get('/api/v1/demo/status');
    expect(status.body.data).toMatchObject({ mode: 'demo', persistence: 'ephemeral' });
    expect(status.body.data.counts.reservations).toBeGreaterThanOrEqual(20);
  });

  it('keeps the same instance across warm invocations', async () => {
    const first = await request.get('/api/v1/demo/status');
    const second = await request.get('/api/v1/demo/status');
    expect(second.body.data.instanceId).toBe(first.body.data.instanceId);
  });

  it('issues tokens that remain valid on any instance (stateless auth)', async () => {
    const login = await request.post('/api/v1/auth/login').send({ email: 'staff@homestay.demo', password: 'Password123!' });
    const { buildApp } = await import('./helpers/context.js');
    const otherInstance = supertest(buildApp().app);
    const me = await otherInstance.get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe('staff');
  });
});

describe('environment validation', () => {
  it('applies safe defaults and treats blanks as unset', () => {
    const config = loadConfig({ AUTH_TOKEN_SECRET: '', CORS_ORIGIN: 'https://a.example, https://b.example' });
    expect(config.usingDemoSecret).toBe(true);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.DEMO_TIMEZONE).toBe('Asia/Kolkata');
  });

  it('fails fast on invalid configuration', () => {
    expect(() => loadConfig({ AUTH_TOKEN_SECRET: 'short' })).toThrow(/AUTH_TOKEN_SECRET/);
    expect(() => loadConfig({ DEMO_TIMEZONE: 'Not/AZone' })).toThrow(/DEMO_TIMEZONE/);
  });
});
