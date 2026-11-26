import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.ts';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

/**
 * Move a database file (and its WAL/SHM side files) to a new name, once:
 * only when the old one exists and the new one does not. Keeps progress when
 * the app or its data file is renamed.
 */
export function adoptLegacyDb(legacy: string, path: string): boolean {
  if (path === ':memory:' || existsSync(path) || !existsSync(legacy)) return false;
  mkdirSync(dirname(path), { recursive: true });
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(legacy + suffix)) renameSync(legacy + suffix, path + suffix);
  }
  return true;
}

/**
 * Open (or create) the SQLite database and bring it up to date.
 * Pass ':memory:' for tests.
 */
export function createDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}
