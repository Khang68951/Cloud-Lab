/**
 * Capture screenshots of key pages in both themes for a visual check.
 *   PORT=8790 DB_PATH=data/shots.db npm start   (in another terminal)
 *   npx tsx scripts/screenshots.ts http://127.0.0.1:8790 <output-dir>
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [base = 'http://127.0.0.1:8790', out = 'test-results/screenshots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const shots: [name: string, path: string, theme: 'light' | 'dark', lang: 'vi' | 'en', w: number, h: number][] = [
  ['home-light-vi', '/', 'light', 'vi', 1366, 1700],
  ['roadmap-dark-vi', '/roadmap', 'dark', 'vi', 1440, 1100],
  ['catalog-light-en', '/learn', 'light', 'en', 1366, 1700],
  ['course-sysdesign-dark-vi', '/learn/aws-system-design', 'dark', 'vi', 1366, 1400],
  ['lesson-chat-light-en', '/learn/aws-system-design/systems/chat-app', 'light', 'en', 1440, 2400],
  ['lesson-outline-light-vi', '/learn/aws/compute/choosing-compute', 'light', 'vi', 1440, 1000],
  ['glossary-dark-en', '/glossary', 'dark', 'en', 1366, 900],
  ['settings-light-vi', '/settings', 'light', 'vi', 1366, 1300],
  ['certificate-light-vi', '/learn/aws/certificate', 'light', 'vi', 1366, 700],
  ['roadmap-mobile-dark-vi', '/roadmap', 'dark', 'vi', 390, 1400],
  ['lab-light-vi', '/lab?template=three-tier', 'light', 'vi', 1440, 900],
];

const browser = await chromium.launch({ channel: 'msedge' });
for (const [name, path, theme, lang, w, h] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.addInitScript(
    ([t, l]) => {
      localStorage.setItem('learninglab.theme', t!);
      localStorage.setItem('learninglab.locale', l!);
    },
    [theme, lang],
  );
  await page.goto(base + path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
  console.log('✓', name);
}
await browser.close();
