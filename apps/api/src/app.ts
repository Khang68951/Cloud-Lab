import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from './db/client.ts';
import { healthRoutes } from './routes/health.ts';
import { dataRoutes } from './routes/data.ts';
import { designRoutes } from './routes/designs.ts';
import { progressRoutes } from './routes/progress.ts';
import { settingsRoutes } from './routes/settings.ts';

export interface AppDeps {
  db: Db;
}

/**
 * Build the API. Each feature is a route module mounted under /api/<feature>.
 * Phase 1+ adds: progress, exercises, mastery, designs, labs, review, ai, data.
 *
 * Routes must stay chained (`.route().route()`) so `AppType` carries every
 * endpoint's types to the web app's typed client.
 */
export function createApp({ db }: AppDeps) {
  const app = new Hono()
    .basePath('/api')
    .route('/health', healthRoutes())
    .route('/settings', settingsRoutes(db))
    .route('/progress', progressRoutes(db))
    .route('/designs', designRoutes(db))
    .route('/data', dataRoutes(db));

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `No route ${c.req.method} ${c.req.path}` } }, 404));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: { code: 'HTTP_ERROR', message: err.message } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
