import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const env = {
  port: Number(process.env.PORT ?? 8787),
  /** Bind to localhost only: CloudLab is a personal, local app. */
  host: process.env.HOST ?? '127.0.0.1',
  dbPath: process.env.DB_PATH ?? resolve(REPO_ROOT, 'data/cloudlab.db'),
  /** Built web app, served by the API in `npm start` (single-process mode). */
  webDist: resolve(REPO_ROOT, 'apps/web/dist'),
};
