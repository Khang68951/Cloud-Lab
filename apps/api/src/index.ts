import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApp } from './app.ts';
import { adoptLegacyDb, createDb } from './db/client.ts';
import { env } from './env.ts';

// The default data file was renamed (cloudlab.db → learninglab.db): keep existing progress.
if (!process.env.DB_PATH && adoptLegacyDb(env.legacyDbPath, env.dbPath)) {
  console.log(`Moved ${env.legacyDbPath} → ${env.dbPath}`);
}
const db = createDb(env.dbPath);
const api = createApp({ db });

const server = new Hono().route('/', api);

// Single-process mode (`npm run build && npm start`): also serve the built SPA.
if (existsSync(env.webDist)) {
  const indexHtml = readFileSync(resolve(env.webDist, 'index.html'), 'utf8');
  server.use('/*', serveStatic({ root: env.webDist }));
  server.get('*', (c) => c.html(indexHtml)); // SPA fallback for client-side routes
}

serve({ fetch: server.fetch, port: env.port, hostname: env.host }, (info) => {
  console.log(`Learning Lab API  → http://${info.address}:${info.port}/api/health`);
  console.log(`Database      → ${env.dbPath}`);
});
