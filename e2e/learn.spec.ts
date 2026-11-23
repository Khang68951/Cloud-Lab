import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.request.put('/api/settings', { data: { locale: 'vi', theme: 'light' } });
  await page.request.delete('/api/progress');
  await page.addInitScript(() => localStorage.clear());
});

test('lesson renders MDX content, a widget and graded exercises', async ({ page }) => {
  await page.goto('/learn/aws/compute/choosing-compute');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('EC2, Fargate hay Lambda');
  // Service comparison cards come from the catalog.
  await expect(page.getByRole('heading', { name: 'Lambda', level: 4 })).toBeVisible();
  // Interactive cost crossover widget.
  await expect(page.getByText('Chi phí mỗi tháng theo lưu lượng')).toBeVisible();

  // Answer the first quiz correctly.
  const quiz = page.locator('[data-exercise="aws.compute.choose-batch-long"]');
  await quiz.getByRole('radio', { name: /ECS trên Fargate/ }).click();
  await quiz.getByRole('button', { name: 'Kiểm tra' }).click();
  await expect(quiz.getByText('Chính xác!')).toBeVisible();

  // Estimation accepts Vietnamese decimal comma.
  const est = page.locator('[data-exercise="aws.compute.lambda-cost"]');
  await est.getByRole('textbox').fill('10,6');
  await est.getByRole('button', { name: 'Kiểm tra' }).click();
  await expect(est.getByText(/Chính xác/)).toBeVisible();

  await expect
    .poll(async () => (await (await page.request.get('/api/progress')).json()).exercises.filter((e: { passed: boolean }) => e.passed).length)
    .toBe(2);
});

test('mark a lesson done and see progress on the track page', async ({ page }) => {
  await page.goto('/learn/aws/foundations/regions-azs');
  await page.getByRole('button', { name: 'Đánh dấu đã học xong' }).click();
  await expect(page.getByText('Đã học').first()).toBeVisible();
  await page.goto('/learn/aws');
  await expect(page.getByRole('button', { name: 'Tiếp tục' }).or(page.getByRole('link', { name: 'Tiếp tục' }))).toBeVisible();
  await expect(page.getByText('1/21')).toBeVisible();
});

test('english lesson and practice page filters', async ({ page }) => {
  await page.request.put('/api/settings', { data: { locale: 'en' } });
  await page.goto('/learn/aws/networking/nat-cost-trap');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The NAT Gateway cost trap');
  await page.goto('/practice');
  await page.getByRole('radio', { name: 'Estimation' }).click();
  await expect(page.locator('[data-exercise]').first()).toBeVisible();
  const kinds = await page.locator('[data-exercise]').evaluateAll((els) => els.map((e) => e.getAttribute('data-exercise')));
  expect(kinds.length).toBeGreaterThan(5);
});

test('service explorer compares services', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('button', { name: 'So sánh' }).first().click();
  await expect(page.getByText(/So sánh 1 dịch vụ/)).toBeVisible();
});
