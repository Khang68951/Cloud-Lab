import { defineConfig } from '@playwright/test';

const PORT = 8788;

/**
 * End-to-end tests run against the production build served by the API, on a
 * separate port with a throwaway database (your real progress is untouched).
 * Uses the Microsoft Edge already installed on Windows — no browser download.
 *
 *   npm run build && npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    env: { PORT: String(PORT), DB_PATH: 'data/e2e.db' },
    timeout: 60_000,
  },
});
