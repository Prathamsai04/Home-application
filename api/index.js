/**
 * Vercel Serverless Function entry point.
 *
 * Every request under /api/* is rewritten here (see vercel.json). The Express
 * application is created once per function instance (cold start) and reused for
 * warm invocations. The in-memory store is seeded lazily and deterministically
 * on first use, so every new instance starts from an identical dataset.
 */
import { createApp } from '../apps/api/src/app.js';

const app = createApp();

export default app;
