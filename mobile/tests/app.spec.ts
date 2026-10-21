import { test, expect } from '@playwright/test';

test('portfolio, eligible route, fallback and return to portfolio', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('₹69,550', { exact: true })).toBeVisible();
  await expect(page.getByText('NEXT DUE · MOCK CARD', { exact: true })).toBeVisible();
  await page.getByText('Optimize My Credit', { exact: true }).click();
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
  await page.getByText('Optimize My Credit', { exact: true }).click();
  await page.getByPlaceholder('10000').fill('0');
  await page.getByText('Check eligibility & optimize', { exact: true }).click();
  await expect(page.getByText('Enter a valid amount.', { exact: true })).toBeVisible();
});

test("Phase 2 tabs, all cards, card details and simulation profile", async ({
  page,
  request,
}) => {
  const cards = await (await request.get("/api/cards")).json();
  await page.goto("/");
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
  for (const card of cards) {
    await expect(
      page.getByRole("button", {
        name: `View ${card.issuer} ${card.name}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  for (const label of ["Home", "Cards", "Optimize", "Activity", "Profile"]) {
    await expect(
      page.getByRole("tab", { name: label, exact: true }),
    ).toBeInViewport();
  }
  await page.screenshot({ path: "test-results/phase2-home.png" });
  await page.getByRole("tab", { name: "Cards", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  for (const card of cards) {
    await page
      .getByRole("button", {
        name: `View ${card.issuer} ${card.name}`,
        exact: true,
      })
      .click();
    await expect(page.getByText("Card details", { exact: true })).toBeVisible();
    await expect(page.getByText(card.name, { exact: true })).toBeVisible();
    await expect(page.getByText(card.due_date, { exact: true })).toBeVisible();
    await expect(
      page.getByText("ILLUSTRATIVE / SIMULATED", { exact: true }),
    ).toBeVisible();
    for (const label of [
      "Outstanding balance",
      "Available credit",
      "Total limit",
      "Utilization",
      "Minimum due",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await page
      .getByRole("button", { name: "‹ Back to cards", exact: true })
      .click();
  }
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await expect(
    page.getByText("No checks yet.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulated route completed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(
    page.getByText("Simulation Mode", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Alex / Demo user", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No live bank, card, or network integrations are connected.",
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await expect(
    page.getByText("Find a clearer route.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
});

test("recommendation explanation and live simulated session activity", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await page
    .getByRole("button", { name: "Check eligibility & optimize", exact: true })
    .click();
  const why = page.getByRole("button", {
    name: "Why this recommendation?",
    exact: true,
  });
  await why.click();
  await expect(why).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("recommendation-explanation")).toContainText(
    "lowest-total-cost eligible route",
  );
  await page.screenshot({ path: "test-results/phase2-results.png" });
  await why.click();
  await expect(page.getByTestId("recommendation-explanation")).toHaveCount(0);
  await page
    .getByRole("button", { name: "‹ Change route", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "source: Axis ACE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check eligibility & optimize", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total: ₹10,320", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await expect(
    page.getByText("Optimization checked", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Route not eligible", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Axis → HDFC: Card-to-Card unavailable; Refinancing recommended. No payment.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("portfolio network failure can retry and empty cards have a refresh action", async ({
  page,
}) => {
  await page.route("**/api/cards", (route) =>
    route.fulfill({ status: 503, json: { detail: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(
    page.getByText("A moment to reconnect.", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/cards");
  await page
    .getByRole("button", { name: "Retry loading portfolio", exact: true })
    .click();
  await expect(page.getByText("₹69,550", { exact: true })).toBeVisible();
  await page.route("**/api/cards", (route) => route.fulfill({ json: [] }));
  await page.reload();
  await expect(page.getByText("A fresh start.", { exact: true })).toBeVisible();
  await page.unroute("**/api/cards");
  await page
    .getByRole("button", { name: "Refresh portfolio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View ICICI Amazon Pay", exact: true }),
  ).toBeVisible();
});
