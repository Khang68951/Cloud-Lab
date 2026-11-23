import { DEFAULT_SETTINGS } from '@cloudlab/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { createDb } from './db/client.ts';
import { settings as settingsTable } from './db/schema.ts';

function setup() {
  const db = createDb(':memory:');
  return { db, app: createApp({ db }) };
}

describe('api', () => {
  it('reports health', async () => {
    const { app } = setup();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('returns default settings on a fresh database', async () => {
    const { app } = setup();
    const res = await app.request('/api/settings');
    expect(await res.json()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a partial update and keeps other defaults', async () => {
    const { app } = setup();
    const put = await app.request('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en', theme: 'dark' }),
    });
    expect(put.status).toBe(200);

    const res = await app.request('/api/settings');
    expect(await res.json()).toEqual({ ...DEFAULT_SETTINGS, locale: 'en', theme: 'dark' });
  });

  it('rejects invalid values', async () => {
    const { app } = setup();
    const res = await app.request('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'purple' }),
    });
    expect(res.status).toBe(400);
  });

  it('ignores a corrupted stored value instead of failing', async () => {
    const { db, app } = setup();
    db.insert(settingsTable).values({ key: 'theme', value: 'purple' }).run();
    db.insert(settingsTable).values({ key: 'locale', value: 'en' }).run();
    const res = await app.request('/api/settings');
    expect(await res.json()).toEqual({ ...DEFAULT_SETTINGS, locale: 'en' });
  });

  it('returns JSON 404 for unknown routes', async () => {
    const { app } = setup();
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
