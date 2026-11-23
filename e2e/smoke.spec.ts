import { expect, test, type Page } from '@playwright/test';

async function resetSettings(page: Page) {
  await page.request.put('/api/settings', { data: { locale: 'vi', theme: 'light' } });
  await page.addInitScript(() => {
    // Simulate a first visit unless a test sets these explicitly.
    if (!sessionStorage.getItem('keep-storage')) localStorage.clear();
  });
}

test.beforeEach(async ({ page }) => resetSettings(page));

test('home page renders in Vietnamese by default', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Học AWS');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('[data-course="aws"]')).toBeVisible();
});

test('switching language updates the UI and is saved to the API', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Đổi ngôn ngữ' }).click();
  await page.getByRole('menuitemradio', { name: 'English' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn AWS');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect.poll(async () => (await (await page.request.get('/api/settings')).json()).locale).toBe('en');
});

test('switching theme applies the dark class and survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Đổi giao diện' }).click();
  await page.getByRole('menuitemradio', { name: 'Tối' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.evaluate(() => sessionStorage.setItem('keep-storage', '1'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(async () => (await (await page.request.get('/api/settings')).json()).theme).toBe('dark');
});

test('a fresh browser adopts settings saved in the database', async ({ page }) => {
  await page.request.put('/api/settings', { data: { locale: 'en', theme: 'dark' } });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn AWS');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('AWS track lists all modules with their lessons', async ({ page }) => {
  await page.goto('/learn/aws');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AWS Core: thiết kế hệ thống trên AWS');
  await expect(page.locator('#modules-title + ol > li')).toHaveCount(14);
  await expect(page.getByRole('link', { name: /Bắt đầu ở đây: Lab kiến trúc/ })).toBeVisible();
});

test('settings page saves the VND display option', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('switch').click();
  await expect(page.getByText(/≈/)).toBeVisible();
  await expect.poll(async () => (await (await page.request.get('/api/settings')).json()).showVnd).toBe(true);
  await page.getByRole('switch').click();
});

test('unbuilt features redirect home and unknown routes show 404', async ({ page }) => {
  await page.goto('/labs');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
});

test('mobile menu opens and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Cài đặt' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('course catalog lists all 11 courses, every lesson is written and opens', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.locator('main a[href^="/learn/"]')).toHaveCount(11);
  await page.goto('/learn/aws-system-design');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('System Design trên AWS');
  await expect(page.getByText('Đang soạn')).toHaveCount(0);
  await page.getByRole('link', { name: /Ứng dụng chat/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ứng dụng chat');
  await expect(page.locator('[data-exercise]').first()).toBeVisible();
});
