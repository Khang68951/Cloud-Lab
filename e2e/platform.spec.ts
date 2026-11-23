import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.request.put('/api/settings', { data: { locale: 'vi', theme: 'light', displayName: '' } });
  await page.request.delete('/api/progress');
  await page.addInitScript(() => localStorage.clear());
});

test('roadmap shows 5 stages, 12 courses and recommends Core first', async ({ page }) => {
  await page.goto('/roadmap');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lộ trình học');
  await expect(page.locator('[data-stage]')).toHaveCount(5);
  await expect(page.locator('[data-course]')).toHaveCount(12);
  await expect(page.locator('[data-course="aws"]')).toContainText('Nên học tiếp');
  await page.getByRole('link', { name: /Học tiếp: AWS Core/ }).click();
  await expect(page).toHaveURL(/\/learn\/aws\/foundations\/lab-tour$/);
});

test('course page shows outcomes and a soft prerequisite warning', async ({ page }) => {
  await page.goto('/learn/aws-serverless');
  await expect(page.getByText('Học xong bạn sẽ làm được')).toBeVisible();
  await expect(page.getByText('Nên học trước các khoá sau (không bắt buộc):')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Compute & Container' })).toBeVisible();
});

test('Ctrl+K search finds a lesson and opens it (accent-insensitive)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // shortcut listener is attached
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Tìm kiếm' });
  await input.fill('bay chi phi nat');
  await expect(page.getByRole('option').first()).toContainText('Bẫy chi phí NAT Gateway');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/learn\/aws\/networking\/nat-cost-trap$/);
});

test('glossary filters and deep links to a term', async ({ page }) => {
  await page.goto('/glossary#term-vpc-endpoint');
  await expect(page.locator('#term-vpc-endpoint')).toBeInViewport();
  await page.getByRole('searchbox').fill('idempot');
  await expect(page.locator('dl > div')).toHaveCount(1);
});

test('lesson shows the course outline on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn/aws/compute/choosing-compute');
  const outline = page.getByRole('navigation', { name: 'Mục lục khoá học' });
  await expect(outline).toBeVisible();
  await expect(outline.locator('[aria-current="page"]')).toContainText('EC2, Fargate hay Lambda');
});

test('certificate explains what is still missing', async ({ page }) => {
  await page.goto('/learn/aws/certificate');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chưa hoàn thành khoá học');
  await expect(page.getByText(/Học xong mọi bài \(0\/21\)/)).toBeVisible();
});

test('settings: display name, export → reset → import restores progress', async ({ page }) => {
  await page.request.put('/api/progress/lessons/aws/foundations/lab-tour');
  await page.goto('/settings');
  const name = page.getByRole('textbox', { name: 'Tên hiển thị' });
  await name.fill('Học viên E2E');
  await name.blur();
  await expect.poll(async () => (await (await page.request.get('/api/settings')).json()).displayName).toBe('Học viên E2E');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất dữ liệu (JSON)' }).click();
  const file = await (await download).path();

  page.on('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Đặt lại tiến độ' }).click();
  await expect.poll(async () => (await (await page.request.get('/api/progress')).json()).lessons.length).toBe(0);

  await page.getByTestId('import-file').setInputFiles(file!);
  await expect.poll(async () => (await (await page.request.get('/api/progress')).json()).lessons.length).toBe(1);
});

test('practice can be filtered by course', async ({ page }) => {
  await page.goto('/practice');
  await page.getByRole('combobox', { name: 'Khoá học' }).selectOption('aws');
  await expect(page.locator('[data-exercise]').first()).toBeVisible();
});

test('menu has no unfinished features', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav.getByRole('link')).toHaveText(['Trang chủ', 'Lộ trình', 'Khoá học', 'Glossary', 'Lab kiến trúc', 'Luyện tập', 'Service Explorer', 'Cài đặt']);
});
