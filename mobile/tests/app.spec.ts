import { test, expect } from '@playwright/test';

test('portfolio, eligible route, fallback and return to portfolio', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('₹69,550', { exact: true })).toBeVisible();
  await expect(page.getByText('NEXT DUE · MOCK CARD', { exact: true })).toBeVisible();
  await page.getByText('Optimize my credit', { exact: true }).click();
  await page.getByText('Check eligibility & optimize', { exact: true }).click();
  await expect(page.getByText('Route analysis', { exact: true })).toBeVisible();
  await expect(page.getByText('PASS', { exact: true })).toHaveCount(6);
  for (const label of ['Eligible Card-to-Card Route', 'Balance Transfer', 'Normal Repayment', 'Refinancing']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('SIMULATION COMPLETE · NO MONEY MOVED', { exact: true })).toBeVisible();
  await expect(page.getByText('Estimated total: ₹10,125', { exact: true })).toBeVisible();
  await page.getByText('‹ Change route', { exact: true }).click();
  await page.getByText('Axis ACE', { exact: true }).first().click();
  await page.getByText('Check eligibility & optimize', { exact: true }).click();
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Estimated total: ₹10,320', { exact: true })).toBeVisible();
  await page.getByText('Back to portfolio', { exact: true }).click();
  await expect(page.getByText('₹69,550', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('API contract and invalid input', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe('ok');
  const cards = await request.get('/api/cards');
  expect(await cards.json()).toHaveLength(4);
  const portfolio = await request.get('/api/portfolio');
  expect((await portfolio.json()).next_due.id).toBe('hdfc_regalia');
  const data = { source_card_id: 'icici_amazon', destination_card_id: 'hdfc_regalia', amount: 10000 };
  const eligible = await request.post('/api/transfers/eligibility', { data });
  expect(await eligible.json()).toMatchObject({ eligible: true });
  const failed = await request.post('/api/transfers/eligibility', { data: { ...data, source_card_id: 'axis_ace' } });
  expect(await failed.json()).toMatchObject({ eligible: false });
  for (const amount of [0, -1]) {
    expect((await request.post('/api/optimize', { data: { ...data, amount } })).status()).toBe(422);
  }
  expect((await request.post('/api/optimize', { data: { ...data, source_card_id: 'missing' } })).status()).toBe(404);
});

test('invalid amount stays on input screen', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Optimize my credit', { exact: true }).click();
  await page.getByPlaceholder('10000').fill('0');
  await page.getByText('Check eligibility & optimize', { exact: true }).click();
  await expect(page.getByText('Enter a valid amount.', { exact: true })).toBeVisible();
});
