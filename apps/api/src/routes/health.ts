import { Hono } from 'hono';

const startedAt = Date.now();

export function healthRoutes() {
  return new Hono().get('/', (c) =>
    c.json({ status: 'ok' as const, uptimeMs: Date.now() - startedAt, version: '0.1.0' }),
  );
}
