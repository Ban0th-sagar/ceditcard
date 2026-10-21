import { test, expect, Page } from "@playwright/test";

const demo = {
  source_card_id: "icici_amazon",
  destination_card_id: "hdfc_regalia",
  amount: 10000,
  route_id: "card_to_card",
};
async function confirmation(page: Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await page
    .getByRole("button", { name: "Check eligibility & optimize", exact: true })
    .click();
  await page
    .getByTestId("route-card_to_card")
    .getByRole("button", {
      name: "Select Eligible Card-to-Card Route",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Confirm simulation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No money moved", { exact: true })).toBeVisible();
  await expect(
    page.getByText("No bank/network/issuer integration.", { exact: false }),
  ).toBeVisible();
}
async function create(page: Page) {
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/transactions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Simulate Route", exact: true })
    .click();
  const response = await pending;
  expect(response.status()).toBe(201);
  const transaction = await response.json();
  expect(response.request().postDataJSON()).toEqual({
    ...demo,
    demo_outcome: transaction.demo_outcome,
  });
  await expect(page.getByTestId("transaction-status")).toHaveText("CREATED");
  return transaction;
}

test("eligible route confirmation, full settlement timeline, Activity and reload", async ({
  page,
  request,
}) => {
  await confirmation(page);
  await expect(page.getByText("₹10,125", { exact: true })).toBeVisible();
  await expect(page.getByText("₹125", { exact: true })).toBeVisible();
  const tx = await create(page);
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
  await expect(
    page.getByRole("button", { name: "Advance simulation", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancel simulation", exact: true }),
  ).toHaveCount(0);
  const saved = await (await request.get(`/api/transactions/${tx.id}`)).json();
  expect(saved.history.map((e: { status: string }) => e.status)).toEqual([
    "CREATED",
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
    "SIMULATED_SETTLED",
  ]);
  expect(saved.quoted_total_cost).toBe(10125);
  expect(saved.simulated).toBe(true);
  await page
    .getByRole("button", { name: "View in Activity", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Open simulation ${tx.id}`, exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "SIMULATED_SETTLED",
  );
  await expect(page.getByText("No money moved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await page
    .getByRole("button", { name: `Open simulation ${tx.id}`, exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "SIMULATED_SETTLED",
  );
});

test("pre-processing cancellation is visible in Activity and terminal", async ({
  page,
  request,
}) => {
  await confirmation(page);
  const tx = await create(page);
  await page
    .getByRole("button", { name: "Cancel simulation", exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText("CANCELLED");
  await expect(
    page.getByRole("button", { name: "Advance simulation", exact: true }),
  ).toHaveCount(0);
  const rejected = await request.post(`/api/transactions/${tx.id}/advance`, {
    data: { expected_status: "CANCELLED" },
  });
  expect(rejected.status()).toBe(409);
  expect((await rejected.json()).detail.code).toBe("INVALID_TRANSITION");
  await page
    .getByRole("button", { name: "View in Activity", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Open simulation ${tx.id}`, exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText("CANCELLED");
});

test("deterministic failure occurs only at processing and explains recovery", async ({
  page,
}) => {
  await confirmation(page);
  await page
    .getByRole("radio", { name: "Fail at processing demo", exact: true })
    .click();
  const tx = await create(page);
  expect(tx.demo_outcome).toBe("fail_processing");
  for (const status of [
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
    "FAILED",
  ]) {
    await page
      .getByRole("button", { name: "Advance simulation", exact: true })
      .click();
    await expect(page.getByTestId("transaction-status")).toHaveText(status);
  }
  await expect(
    page.getByText("DEMO_PROCESSING_FAILURE", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No money moved. Return to Optimize for a fresh quote and choose Success demo to retry.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Advance simulation", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "View in Activity", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Open simulation ${tx.id}`, exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText("FAILED");
});

test("API integrity, ineligible protection, stale/invalid transitions and fallback", async ({
  request,
}) => {
  const blocked = await request.post("/api/transactions", {
    data: { ...demo, source_card_id: "axis_ace" },
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).detail.code).toBe("ROUTE_INELIGIBLE");
  for (const extra of [
    { eligible: true },
    { quoted_fee: 0 },
    { quoted_total_cost: 1 },
    { status: "SIMULATED_SETTLED" },
  ]) {
    expect(
      (
        await request.post("/api/transactions", { data: { ...demo, ...extra } })
      ).status(),
    ).toBe(422);
  }
  for (const amount of [0, -1, 0.001]) {
    const invalid = await request.post("/api/transactions", {
      data: { ...demo, amount },
    });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).detail.code).toBe("INVALID_AMOUNT");
  }
  expect(
    (
      await request.post("/api/transactions", {
        data: { ...demo, destination_card_id: demo.source_card_id },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/transactions", {
        data: { ...demo, source_card_id: "missing" },
      })
    ).status(),
  ).toBe(404);
  const created = await request.post("/api/transactions", {
    data: { ...demo, source_card_id: "axis_ace", route_id: "refinancing" },
  });
  expect(created.status()).toBe(201);
  const tx = await created.json();
  expect(tx.quoted_total_cost).toBe(10320);
  const skip = await request.post(`/api/transactions/${tx.id}/advance`, {
    data: { expected_status: "CREATED", target_status: "SIMULATED_SETTLED" },
  });
  expect(skip.status()).toBe(409);
  expect((await skip.json()).detail.code).toBe("INVALID_TRANSITION");
  const original = await (
    await request.get(`/api/transactions/${tx.id}`)
  ).json();
  expect(original.history).toHaveLength(1);
  expect(original.status).toBe("CREATED");
  expect(
    (
      await request.post(`/api/transactions/${tx.id}/advance`, {
        data: { expected_status: "CREATED" },
      })
    ).status(),
  ).toBe(200);
  const stale = await request.post(`/api/transactions/${tx.id}/advance`, {
    data: { expected_status: "CREATED" },
  });
  expect(stale.status()).toBe(409);
  expect((await stale.json()).detail.code).toBe("STALE_TRANSACTION_STATE");
  const listed = await (await request.get("/api/transactions")).json();
  expect(listed.some((item: { id: string }) => item.id === tx.id)).toBe(true);
  const unknown = await request.get("/api/transactions/not-found");
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).detail.code).toBe("TRANSACTION_NOT_FOUND");
});

test("blocked Card-to-Card cannot be selected but fallback remains selectable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await page
    .getByRole("radio", { name: "source: Axis ACE", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Check eligibility & optimize", exact: true })
    .click();
  await expect(
    page.getByTestId("route-card_to_card").getByRole("button", {
      name: "Select Eligible Card-to-Card Route",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select Refinancing", exact: true })
    .click();
  await expect(
    page.getByText("Confirm simulation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("₹10,320", { exact: true })).toBeVisible();
  await expect(page.getByText("No money moved", { exact: true })).toBeVisible();
});

test("rejected backend recheck stays on confirmation and can retry", async ({
  page,
}) => {
  await confirmation(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/transactions", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await pending;
    await route.fulfill({
      status: 409,
      json: {
        detail: {
          code: "ROUTE_INELIGIBLE",
          message:
            "The backend recheck blocked this simulated route. No transaction was created.",
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Simulate Route", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Home", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Creating simulation…", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText("ROUTE_INELIGIBLE");
  await expect(
    page.getByText("Confirm simulation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("transaction-status")).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Home", exact: true }),
  ).toBeEnabled();
  await page.unroute("**/api/transactions");
  await create(page);
});
