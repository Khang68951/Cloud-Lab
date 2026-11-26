import { expect, test, type Page } from '@playwright/test';

async function fresh(page: Page) {
  await page.request.put('/api/settings', { data: { locale: 'vi', theme: 'light' } });
  await page.request.delete('/api/progress');
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('keep-storage')) localStorage.clear();
  });
}

const money = async (page: Page) => {
  const text = (await page.getByTestId('lab-total').textContent()) ?? '';
  // Vietnamese format: "1.406,32 US$" (dot = thousands, comma = decimals).
  return Number(text.replace(/[^0-9,]/g, '').replace(',', '.'));
};

/** Drag from one node's right handle to another node's left handle. */
async function connect(page: Page, from: string, to: string) {
  const src = page.locator(`.react-flow__node[data-id="${from}"]`);
  const dst = page.locator(`.react-flow__node[data-id="${to}"]`);
  await src.hover();
  const a = await src.locator('.react-flow__handle[data-handleid="r"]').boundingBox();
  await dst.hover();
  const b = await dst.locator('.react-flow__handle[data-handleid="l"]').boundingBox();
  if (!a || !b) throw new Error('handles not found');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => fresh(page));

test('first visit opens the 3-tier template with a live price panel', async ({ page }) => {
  await page.goto('/cloud/lab');
  await expect(page.locator('.react-flow__node')).toHaveCount(8);
  await expect(page.getByTestId('lab-total')).toContainText('$');
  expect(await money(page)).toBeGreaterThan(100);
  await expect(page.getByRole('tab', { name: 'Chi phí' })).toHaveAttribute('data-state', 'active');
});

test('drag a service from the palette onto the canvas and the cost updates', async ({ page }) => {
  await page.goto('/cloud/lab');
  const before = await money(page);
  await page.locator('[data-service="nat"]').dragTo(page.getByTestId('lab-canvas'), { targetPosition: { x: 300, y: 380 } });
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  // A NAT Gateway costs ~$33/month just to exist.
  await expect.poll(() => money(page)).toBeGreaterThan(before + 30);
  // Selecting it opens its config with the "when to use" guide.
  await expect(page.getByRole('tab', { name: 'Cấu hình' })).toHaveAttribute('data-state', 'active');
  await expect(page.getByText('Khi nào KHÔNG nên dùng')).toBeVisible();
});

test('undo removes the added node', async ({ page }) => {
  await page.goto('/cloud/lab');
  await page.locator('[data-service="sqs"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(8);
});

test('chaos: the 3-tier template survives losing an AZ', async ({ page }) => {
  await page.goto('/cloud/lab');
  await page.getByRole('button', { name: 'Chaos' }).click();
  await page.getByRole('menuitemcheckbox', { name: /Sập AZ-a/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/Hệ thống vẫn sống/)).toBeVisible();
});

test('challenge: build the static site by connecting nodes and pass', async ({ page }) => {
  await page.goto('/cloud/lab/challenge/aws.lab.static-site');
  await expect(page.getByTestId('requirements').locator('[data-passed="false"]').first()).toBeVisible();

  await page.locator('[data-service="cloudfront"]').click();
  await page.locator('[data-service="s3"]').click();
  const ids = await page.locator('.react-flow__node').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')!));
  const cdn = ids.find((i) => i.startsWith('cloudfront'))!;
  const s3 = ids.find((i) => i.startsWith('s3'))!;

  // Lay the two new nodes out so their handles don't overlap.
  await page.getByRole('button', { name: 'fit view' }).click().catch(() => {});
  await connect(page, 'users', cdn);
  await connect(page, cdn, s3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);

  await page.getByRole('tab', { name: 'Đề bài' }).click();
  await expect(page.getByTestId('requirements').locator('[data-passed="false"]')).toHaveCount(0);
  await page.getByTestId('submit-challenge').click();
  await expect(page.getByRole('status').filter({ hasText: 'Đạt!' }).first()).toBeVisible();

  const progress = await (await page.request.get('/api/progress')).json();
  expect(progress.exercises).toEqual([expect.objectContaining({ exerciseId: 'aws.lab.static-site', passed: true })]);

  // Passing offers a way straight back to the lesson's result card.
  await page.getByTestId('back-to-lesson').click();
  await expect(page).toHaveURL(/\/learn\/[^#]+#ex-aws\.lab\.static-site$/);
  const card = page.locator('[id="ex-aws.lab.static-site"]');
  await expect(card).toBeInViewport();
  await expect(card.getByText('Đã đạt').first()).toBeVisible();
});

test('palette: "See all" opens a dialog with every service of the category', async ({ page }) => {
  await page.goto('/cloud/lab');
  await expect(page.locator('[data-service="msk"]')).toHaveCount(0);
  await page.getByTestId('palette-all-messaging').click();
  const browser = page.getByTestId('palette-browser');
  await expect(browser).toBeVisible();
  // Switch category inside the dialog, then pick a service.
  await browser.getByRole('tab', { name: 'AI & machine learning' }).click();
  await browser.locator('[data-pick="bedrock"]').click();
  await expect(browser).toBeHidden();
  await expect(page.locator('.react-flow__node[data-id^="bedrock"]')).toHaveCount(1);
  // Edges animate their traffic direction with moving dots.
  await expect(page.locator('.lab-flow-dot').first()).toBeAttached();
});

test('saves a design to the database and reopens it', async ({ page }) => {
  await page.goto('/cloud/lab');
  await page.getByRole('textbox', { name: 'Tên thiết kế' }).fill('E2E design');
  await page.getByTestId('lab-save').click();
  await expect(page.getByText('Đã lưu "E2E design"')).toBeVisible();
  await page.getByRole('button', { name: 'Mở', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('E2E design').first()).toBeVisible();
});

test('chaos: SQS holds back a ×10 spike and shows the backlog', async ({ page }) => {
  const nodes = [['u', 'users'], ['api', 'apigw'], ['fn', 'lambda'], ['q', 'sqs'], ['w', 'lambda'], ['db', 'rds']].map(([id, service], i) => ({
    id,
    service,
    x: i * 230,
    y: 0,
    // The worker writes to RDS, so it must be attached to the VPC.
    config: id === 'w' ? { subnet: 'private' } : {},
  }));
  const edges = ['u>api', 'api>fn', 'fn>q', 'q>w', 'w>db'].map((e) => ({ id: e, source: e.split('>')[0], target: e.split('>')[1] }));
  const draft = {
    title: 'queue',
    designId: null,
    design: { nodes, edges, scenario: { rps: 300, peakMultiplier: 3, readRatio: 0, payloadKB: 5, region: 'us-east-1' } },
  };
  await page.addInitScript((d) => localStorage.setItem('cloudlab.lab.draft', d), JSON.stringify(draft));
  await page.goto('/cloud/lab');
  await expect(page.locator('.react-flow__node[data-id="q"]')).toBeVisible();
  await expect(page.getByTestId('queue-backlog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Chaos' }).click();
  await page.getByRole('menuitemcheckbox', { name: /Traffic ×10/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.react-flow__node[data-id="q"]').getByTestId('queue-backlog')).toBeVisible();
  await expect(page.locator('.react-flow__node[data-id="db"] [data-status]')).not.toHaveAttribute('data-status', 'saturated');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
});

test('challenge: optimisation requirements stay hidden until a hint reveals them', async ({ page }) => {
  await page.goto('/cloud/lab/challenge/aws.messaging.flash-sale');
  const reqs = page.getByTestId('requirements');
  await expect(reqs).toBeVisible();
  await expect(reqs).not.toContainText(/queue/i);
  await expect(page.getByTestId('hidden-requirements')).toBeVisible();
  if (process.env.SHOT) await page.locator('[data-testid="requirements"]').locator('..').screenshot({ path: process.env.SHOT.replace('.png', '-before.png') });

  await page.getByRole('button', { name: /Xem gợi ý 1/ }).click();
  await expect(reqs).toContainText(/Tối ưu/);
  if (process.env.SHOT) await page.locator('[data-testid="requirements"]').locator('..').screenshot({ path: process.env.SHOT.replace('.png', '-after.png') });
});

test('network view: nodes show their subnet, and moving the DB to a public subnet is flagged', async ({ page }) => {
  await page.goto('/cloud/lab');
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
  await expect(node('lb').getByTestId('zone-chip')).toContainText('Public');
  await expect(node('app').getByTestId('zone-chip')).toContainText('Private');
  await expect(node('db').getByTestId('zone-chip')).toContainText('Private');
  await expect(page.getByTestId('frame-vpc')).toBeVisible();
  await expect(page.getByTestId('frame-public')).toBeVisible();
  await expect(page.getByTestId('frame-private')).toBeVisible();
  await page.screenshot({ path: 'test-results/network-view.png' });

  await node('db').click();
  await page.getByTestId('subnet-select').selectOption('public');
  await expect(node('db').getByTestId('zone-chip')).toContainText('Public');
  await page.getByRole('tab', { name: /Đánh giá/ }).click();
  await expect(page.getByText(/đang nằm trong public subnet/)).toBeVisible();

  await page.getByTestId('network-view-toggle').click();
  await expect(page.getByTestId('frame-vpc')).toHaveCount(0);
});

test('network: a security group rule that names the wrong source blocks the connection', async ({ page }) => {
  await page.goto('/cloud/lab');
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
  await expect(node('db').getByTestId('zone-chip')).toContainText('10.0.2.');
  await expect(page.getByTestId('edge-blocked')).toHaveCount(0);

  await node('db').click();
  // Default rule: PostgreSQL from the whole VPC. Point it at the load balancer's SG instead.
  await page.getByTestId('sg-source').selectOption({ label: 'sg-alb' });
  await expect(page.getByTestId('edge-blocked')).toHaveCount(1);
  await expect(page.getByTestId('edge-blocked')).toContainText('SG chặn');
  await expect(page.getByTestId('incoming')).toContainText('Security group của RDS không có rule inbound');

  // Name the app tier's SG: the connection works again.
  await page.getByTestId('sg-source').selectOption({ label: 'sg-web-api' });
  await expect(page.getByTestId('edge-blocked')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/network-sg.png', fullPage: false });
});

test('network: users cannot reach an instance in a private subnet', async ({ page }) => {
  await page.goto('/cloud/lab');
  const node = (id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
  await node('app').click();
  await page.getByRole('tab', { name: 'Chi phí' }).click();
  await connect(page, 'users', 'app');
  await expect(page.getByTestId('edge-blocked')).toContainText('Không có route');
  await page.screenshot({ path: 'test-results/network-route.png' });
});
