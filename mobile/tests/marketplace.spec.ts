import { test, expect, selectCard, technicalError } from "./fixtures";
import type { Page } from "@playwright/test";

const input = { destination_card_id: "hdfc_regalia", amount: 20000 };
async function marketplace(page: Page, amount = "20000") {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore fictional Marketplace", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Optimize", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("offer-cedar_transfer")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Marketplace amount", exact: true })
    .fill(amount);
  await page
    .getByRole("button", { name: "Compare fictional offers", exact: true })
    .click();
  await expect(page.getByTestId("offer-cedar_transfer")).toBeVisible();
}

test("fictional catalog, quote economics, ranking and stable protection responses", async ({
  request,
}) => {
  const catalog = await (await request.get("/api/offers")).json();
  expect(
    catalog.filter(
      (o: { offer_type: string }) => o.offer_type === "balance_transfer",
    ).length,
  ).toBeGreaterThanOrEqual(3);
  expect(
    catalog.filter(
      (o: { offer_type: string }) => o.offer_type === "refinancing",
    ).length,
  ).toBeGreaterThanOrEqual(3);
  expect(
    catalog.every(
      (o: { provider_name: string; simulated: boolean }) =>
        o.provider_name.startsWith("Demo ") && o.simulated,
    ),
  ).toBe(true);
  const detail = await request.get("/api/offers/cedar_transfer");
  expect(detail.status()).toBe(200);
  expect((await detail.json()).headline).toBe("Cedar Clear Transfer");
  const unknown = await request.get("/api/offers/missing");
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).detail.code).toBe("OFFER_NOT_FOUND");
  const response = await request.post("/api/offers/quote", { data: input });
  expect(response.status()).toBe(200);
  const body = await response.json();
  const eligible = body.quotes.filter(
    (q: { eligible: boolean; offer: { offer_type: string } }) =>
      q.eligible && q.offer.offer_type === "balance_transfer",
  );
  expect(
    eligible.map(
      (q: { estimated_total_cost: number }) => q.estimated_total_cost,
    ),
  ).toEqual([20300, 20600]);
  expect(eligible.map((q: { rank: number }) => q.rank)).toEqual([1, 2]);
  expect(body.baseline.estimated_total_cost).toBe(20700);
  expect(eligible[0].estimated_savings).toBe(400);
  expect(body.best_offer_ids.balance_transfer).toBe("cedar_transfer");
  const inactive = body.quotes.find(
    (q: { offer: { id: string } }) => q.offer.id === "paper_inactive",
  );
  expect(inactive.rank).toBeNull();
  expect(
    inactive.blocking_reasons.map((r: { code: string }) => r.code),
  ).toContain("OFFER_INACTIVE");
  for (const extra of [
    { amount: 0 },
    { amount: -1 },
    { amount: 0.001 },
    { estimated_fee: 0 },
    { portfolio_exposure: 0 },
    { partner_payout: 100000 },
  ]) {
    expect(
      (
        await request.post("/api/offers/quote", {
          data: { ...input, ...extra },
        })
      ).status(),
    ).toBe(422);
  }
  const invalidCard = await request.post("/api/offers/quote", {
    data: { ...input, destination_card_id: "missing" },
  });
  expect(invalidCard.status()).toBe(404);
});

test("Marketplace ranks transfer offers and details explain costs and rules", async ({
  page,
  request,
}) => {
  await marketplace(page);
  const cards = page.locator('[data-testid^="offer-"]');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toHaveAttribute(
    "data-testid",
    "offer-cedar_transfer",
  );
  await expect(cards.nth(1)).toHaveAttribute(
    "data-testid",
    "offer-birch_transfer",
  );
  const cedar = page.getByTestId("offer-cedar_transfer");
  await expect(cedar.getByText("₹20,300", { exact: true })).toBeVisible();
  await expect(
    cedar.getByText("Eligible · Rank 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("offer-birch_transfer")
      .getByText("₹20,600", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("offer-ember_transfer")).toContainText(
    "BELOW_OFFER_MINIMUM",
  );
  await cedar
    .getByRole("button", {
      name: "Why this offer? Cedar Clear Transfer",
      exact: true,
    })
    .click();
  const body = await (
    await request.post("/api/offers/quote", { data: input })
  ).json();
  const quote = body.quotes.find(
    (q: { offer: { id: string } }) => q.offer.id === "cedar_transfer",
  );
  await expect(page.getByTestId("why-cedar_transfer")).toHaveText(
    quote.ranking_explanation,
  );
  await cedar
    .getByRole("button", { name: "Details: Cedar Clear Transfer", exact: true })
    .click();
  await expect(page.getByText("Offer Details", { exact: true })).toBeVisible();
  await expect(page.getByText("Baseline total", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Passed · BELOW_OFFER_MINIMUM", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Assumptions & warnings", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(quote.disclaimer, { exact: true })).toBeVisible();
});

test("selected offer reuses simulation flow and persists offer context in Activity", async ({
  page,
  request,
}) => {
  await marketplace(page);
  await page
    .getByRole("button", {
      name: "Select offer: Cedar Clear Transfer",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Confirm simulation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("SELECTED FICTIONAL OFFER", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No money moved", { exact: true })).toBeVisible();
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/transactions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Simulate Route", exact: true })
    .click();
  const createdResponse = await pending;
  expect(createdResponse.status()).toBe(201);
  expect(createdResponse.request().postDataJSON()).toEqual({
    source_card_id: "icici_amazon",
    ...input,
    route_id: "balance_transfer",
    offer_id: "cedar_transfer",
    offer_tenure_months: 6,
    demo_outcome: "success",
  });
  const created = await createdResponse.json();
  expect(created.quoted_total_cost).toBe(20300);
  expect(created.offer_quote_snapshot.offer.id).toBe("cedar_transfer");
  for (const status of [
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
    "SIMULATED_SETTLED",
  ]) {
    await page
      .getByRole("button", { name: "Advance simulation", exact: true })
      .click();
    await expect(page.getByTestId("transaction-status")).toHaveText(status);
  }
  await page
    .getByRole("button", { name: "View in Activity", exact: true })
    .click();
  await expect(
    page
      .getByTestId(`simulation-${created.id}`)
      .getByText("Demo Cedar Studio · Cedar Clear Transfer · ₹20,000", {
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Open simulation ${created.id}`, exact: true })
    .click();
  await expect(
    page.getByText("STORED FICTIONAL OFFER", { exact: true }),
  ).toBeVisible();
  const stored = await (
    await request.get(`/api/transactions/${created.id}`)
  ).json();
  expect(stored.offer_tenure_months).toBe(6);
  expect(stored.offer_quote_snapshot.monthly_payment_estimate).toBe(3383.33);
});

test("refinancing, tenure change, ineligible and inactive offers are explicit", async ({
  page,
}) => {
  await marketplace(page, "10000");
  await page
    .getByRole("tab", { name: "Refinancing offers", exact: true })
    .click();
  await expect(
    page
      .getByTestId("offer-quartz_refinance")
      .getByText("Monthly estimate", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("offer-lumen_refinance")
      .getByText("12 months", { exact: true }),
  ).toBeVisible();
  const inactive = page.getByTestId("offer-paper_inactive");
  await expect(
    inactive.getByText("Inactive fictional offer", { exact: true }),
  ).toBeVisible();
  await expect(inactive).toContainText("OFFER_INACTIVE");
  await expect(
    inactive.getByRole("button", {
      name: "Select offer: Paper Archived Demo",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByTestId("offer-moss_refinance")).toContainText(
    "BELOW_OFFER_MINIMUM",
  );
  await page.getByRole("button", { name: "12 months", exact: true }).click();
  await page
    .getByRole("button", { name: "Compare fictional offers", exact: true })
    .click();
  await expect(
    page
      .getByTestId("offer-lumen_refinance")
      .getByText("Eligible · Rank 1", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Details: Paper Archived Demo", exact: true })
    .click();
  await expect(
    page.getByText("Blocked · OFFER_INACTIVE", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Lower monthly payment can mean longer repayment time.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("route references and direct offer transaction protections", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await expect(page.getByTestId("route-balance_transfer")).toContainText(
    "Best fictional marketplace quote",
  );
  await page
    .getByRole("button", {
      name: "Browse Balance Transfer offers",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Fictional Marketplace", { exact: true }),
  ).toBeVisible();
  const transaction = {
    source_card_id: "icici_amazon",
    ...input,
    route_id: "balance_transfer",
    offer_id: "cedar_transfer",
    offer_tenure_months: 6,
  };
  for (const override of [
    { amount: 4999 },
    { amount: 50001 },
    { route_id: "refinancing" },
    { offer_id: "paper_inactive", route_id: "refinancing" },
  ]) {
    const blocked = await request.post("/api/transactions", {
      data: { ...transaction, ...override },
    });
    expect(blocked.status()).toBe(409);
    expect(["OFFER_INELIGIBLE", "OFFER_ROUTE_MISMATCH"]).toContain(
      (await blocked.json()).detail.code,
    );
  }
  const unknown = await request.post("/api/transactions", {
    data: { ...transaction, offer_id: "missing" },
  });
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).detail.code).toBe("OFFER_NOT_FOUND");
  expect(
    (
      await request.post("/api/transactions", {
        data: { ...transaction, quoted_total_cost: 1 },
      })
    ).status(),
  ).toBe(422);
});

test("Marketplace errors can retry and invalid amounts remain clean", async ({
  page,
}) => {
  await page.route("**/api/offers/quote", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "Fictional offers temporarily unavailable." },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore fictional Marketplace", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Fictional offers temporarily unavailable.",
  );
  await page.unroute("**/api/offers/quote");
  await page
    .getByRole("button", { name: "Compare fictional offers", exact: true })
    .click();
  await expect(page.getByTestId("offer-cedar_transfer")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Marketplace amount", exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Compare fictional offers", exact: true })
    .click();
  await technicalError(page, "INVALID_AMOUNT");
});
