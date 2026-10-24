import { test, expect, selectCard, technicalError } from "./fixtures";
const demo = {
  source_card_id: "icici_amazon",
  destination_card_id: "hdfc_regalia",
  amount: 10000,
};

test("quote contract, capability matrix and invalid request codes", async ({
  request,
}) => {
  const response = await request.post("/api/routes/quote", { data: demo });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.simulated).toBe(true);
  expect(body.schema_version).toBe("1.0");
  expect(body.source.id).toBe(demo.source_card_id);
  expect(body.destination.id).toBe(demo.destination_card_id);
  expect(body.amount).toBe(10000);
  expect(body.routes.map((r: { id: string }) => r.id)).toEqual([
    "card_to_card",
    "balance_transfer",
    "normal_repayment",
    "refinancing",
  ]);
  expect(body.recommended_route_id).toBe("card_to_card");
  expect(body.recommendation.estimated_total_cost).toBe(10125);
  for (const route of body.routes) {
    expect(route.checks.length).toBeGreaterThan(0);
    expect(route.eligible).toBe(
      route.checks.every((c: { passed: boolean }) => c.passed),
    );
    expect(route.eligibility_status).toBe(
      route.eligible ? "eligible" : "ineligible",
    );
    expect(route.processing_time_label).toContain("Simulated");
    expect(route.simulated).toBe(true);
    expect(route.assumptions.length).toBeGreaterThan(0);
    expect(route.disclaimer).toContain(
      "Not proof of real issuer/network support",
    );
  }
  for (const amount of [0, -1, 0.001, null, true, "10000", 1000000001]) {
    const invalid = await request.post("/api/routes/quote", {
      data: { ...demo, amount },
    });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).detail.code).toBe("INVALID_AMOUNT");
  }
  const missing = await request.post("/api/routes/quote", {
    data: { ...demo, source_card_id: "unknown" },
  });
  expect(missing.status()).toBe(404);
  expect((await missing.json()).detail.code).toBe("CARD_NOT_FOUND");
  const malformed = await request.post("/api/routes/quote", { data: {} });
  expect(malformed.status()).toBe(422);
  expect((await malformed.json()).detail.code).toBe("INVALID_REQUEST");
  const caps = await (await request.get("/api/routes/capabilities")).json();
  expect(caps.simulated).toBe(true);
  expect(caps.supported_card_pairs).toContainEqual({
    source_card_id: demo.source_card_id,
    destination_card_id: demo.destination_card_id,
  });
  expect(caps.card_to_card_limit).toBe(25000);
});

test("API fallback, same-card and excessive balance behavior", async ({
  request,
}) => {
  const failed = await (
    await request.post("/api/routes/quote", {
      data: { ...demo, source_card_id: "axis_ace" },
    })
  ).json();
  expect(failed.routes[0].eligible).toBe(false);
  expect(
    failed.routes[0].blocking_reasons.map((r: { code: string }) => r.code),
  ).toContain("SOURCE_PROGRAM_DISABLED");
  expect(
    failed.routes.slice(1).every((r: { eligible: boolean }) => r.eligible),
  ).toBe(true);
  expect(failed.recommended_route_id).toBe("refinancing");
  expect(failed.recommendation.estimated_total_cost).toBe(10320);
  expect(failed.recommendation_explanation).toContain(
    "SOURCE_PROGRAM_DISABLED",
  );
  for (const data of [
    { ...demo, destination_card_id: demo.source_card_id },
    { ...demo, amount: 150000 },
  ]) {
    const blocked = await (
      await request.post("/api/routes/quote", { data })
    ).json();
    expect(blocked.routes).toHaveLength(4);
    expect(
      blocked.routes.every((r: { eligible: boolean }) => !r.eligible),
    ).toBe(true);
    expect(blocked.recommended_route_id).toBeNull();
    expect(blocked.recommendation).toBeNull();
    expect(blocked.recommendation_explanation).toContain(
      "No simulated route is eligible",
    );
    const codes = blocked.routes[0].blocking_reasons.map(
      (r: { code: string }) => r.code,
    );
    if (data.amount === 150000) {
      expect(codes).toContain("EXCEEDS_OUTSTANDING");
      expect(codes).toContain("INSUFFICIENT_SOURCE_LIMIT");
    } else expect(codes).toContain("DIFFERENT_CARDS_REQUIRED");
  }
});

test("all four route details and backend rationale are inspectable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/routes/quote") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  const quote = await (await pending).json();
  await page
    .getByRole("button", { name: "Why this recommendation?", exact: true })
    .click();
  await expect(page.getByTestId("recommendation-explanation")).toHaveText(
    quote.recommendation_explanation,
  );
  for (const route of quote.routes) {
    const card = page.getByTestId(`route-${route.id}`);
    await expect(
      card.getByText(route.processing_time_label, { exact: true }),
    ).toBeVisible();
    await expect(card.getByText("Eligible", { exact: true })).toBeVisible();
    await card
      .getByRole("button", {
        name: `View ${route.display_name} details`,
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Route Details", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(route.route_type, { exact: true }),
    ).toBeVisible();
    for (const check of route.checks)
      await expect(
        page.getByText(`Passed · ${check.code}`, { exact: true }),
      ).toBeVisible();
    await expect(
      page.getByText(route.disclaimer, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Trade-offs & assumptions", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "‹ Back to comparison", exact: true })
      .click();
  }
});

test("Axis blockers, fallback details and same-card UI feedback", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await selectCard(page, "source", "Axis ACE");
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  const blocked = page.getByTestId("route-card_to_card");
  await expect(
    blocked.getByText("Not eligible", { exact: true }),
  ).toBeVisible();
  await expect(
    blocked.getByText("SOURCE_PROGRAM_DISABLED:", { exact: false }),
  ).toBeVisible();
  await blocked
    .getByRole("button", {
      name: "View Eligible Card-to-Card Route details",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Blocked · SOURCE_PROGRAM_DISABLED", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "‹ Back to comparison", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View Refinancing details", exact: true })
    .click();
  await expect(
    page.getByText("SIMULATED · ELIGIBLE", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "‹ Back to comparison", exact: true })
    .click();
  await page
    .getByRole("button", { name: "‹ Change route", exact: true })
    .click();
  await selectCard(page, "source", "ICICI Amazon Pay");
  await selectCard(page, "destination", "ICICI Amazon Pay");
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await expect(
    page.getByText("No eligible route", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not eligible", { exact: true })).toHaveCount(4);
  await expect(page.getByTestId("route-card_to_card")).toContainText(
    "DIFFERENT_CARDS_REQUIRED",
  );
});

test("structured API errors can be retried", async ({ page }) => {
  await page.route("**/api/routes/quote", (route) =>
    route.fulfill({
      status: 404,
      json: {
        detail: {
          code: "CARD_NOT_FOUND",
          message: "The selected mock card was not found.",
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await technicalError(
    page,
    "CARD_NOT_FOUND: The selected mock card was not found.",
  );
  await page.unroute("**/api/routes/quote");
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total: ₹10,125", { exact: true }),
  ).toBeVisible();
});
