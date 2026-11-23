import { settingsSchema, type Settings, type SettingsPatch } from '@cloudlab/shared';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { settings as settingsTable } from '../db/schema.ts';

/**
 * Read all settings, merged over defaults. A stored value that no longer
 * matches the schema (e.g. after a schema change) is ignored rather than
 * breaking the app.
 */
export function getSettings(db: Db): Settings {
  const rows = db.select().from(settingsTable).all();
  const raw: Record<string, unknown> = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const first = settingsSchema.safeParse(raw);
  if (first.success) return first.data;

  const badKeys = new Set(first.error.issues.map((i) => String(i.path[0])));
  for (const key of badKeys) delete raw[key];
  return settingsSchema.parse(raw);
}

export function updateSettings(db: Db, patch: SettingsPatch): Settings {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  db.transaction((tx) => {
    for (const [key, value] of entries) {
      tx.insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value, updatedAt: sql`(unixepoch('subsec') * 1000)` },
        })
        .run();
    }
  });
  return getSettings(db);
}
