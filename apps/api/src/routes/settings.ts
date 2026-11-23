import { settingsPatchSchema } from '@cloudlab/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Db } from '../db/client.ts';
import { getSettings, updateSettings } from '../services/settings.ts';

export function settingsRoutes(db: Db) {
  return new Hono()
    .get('/', (c) => c.json(getSettings(db)))
    .put('/', zValidator('json', settingsPatchSchema), (c) => c.json(updateSettings(db, c.req.valid('json'))));
}
