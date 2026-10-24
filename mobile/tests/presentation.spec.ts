import { test, expect, selectCard, technicalError } from "./fixtures";
import type { Page } from "@playwright/test";
async function createDemo(page: Page, failed = false) {
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "CheQ Demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Select Eligible Card-to-Card Route",
      exact: true,
    })
    .click();
  if (failed)
    await page
      .getByRole("radio", { name: "Fail at processing demo", exact: true })
      .click();
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/transactions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Simulate Route", exact: true })
    .click();
  const tx = await (await pending).json();
  await expect(page.getByTestId("transaction-status")).toHaveText("CREATED");
  return tx;
}

test("CheQ reset restores the presentation inputs without changing financial rules", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await selectCard(page, "source", "Axis ACE");
  await selectCard(page, "destination", "ICICI Amazon Pay");
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("5000");
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByRole("button", { name: "CheQ Demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose source card", exact: true }),
  ).toContainText("ICICI Amazon Pay");
  await expect(
    page.getByRole("button", { name: "Choose destination card", exact: true }),
  ).toContainText("HDFC Regalia");
  await expect(
    page.getByRole("textbox", { name: "Amount", exact: true }),
  ).toHaveValue("10000");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find Best Route", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total: ₹10,125", { exact: true }),
  ).toBeVisible();
});

test("Auto Demo advances every state through backend APIs and Activity", async ({
  page,
  request,
}) => {
  const tx = await createDemo(page);
  const expectedStates: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(`/api/transactions/${tx.id}/advance`))
      expectedStates.push(r.postDataJSON().expected_status);
  });
  await page.getByRole("button", { name: "Auto Demo", exact: true }).click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "SIMULATED_SETTLED",
    { timeout: 15000 },
  );
  expect(expectedStates).toEqual([
    "CREATED",
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
  ]);
  const saved = await (await request.get(`/api/transactions/${tx.id}`)).json();
  expect(saved.history.map((e: { status: string }) => e.status)).toEqual([
    "CREATED",
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
    "SIMULATED_SETTLED",
  ]);
  await expect(
    page.getByText("SIMULATED SETTLED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No money moved", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "View in Activity", exact: true })
    .click();
  await expect(
    page.getByText("Your demo simulations", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Open simulation ${tx.id}`, exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "SIMULATED_SETTLED",
  );
});

test("Manual mode and navigation stop future automatic requests", async ({
  page,
  request,
}) => {
  const tx = await createDemo(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Auto Demo", exact: true }).click();
  await page.getByRole("button", { name: "Manual mode", exact: true }).click();
  await page.clock.runFor(5000);
  expect(
    (await (await request.get(`/api/transactions/${tx.id}`)).json()).status,
  ).toBe("CREATED");
  await page
    .getByRole("button", { name: "Advance simulation", exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "ELIGIBILITY_CHECK",
  );
  await page.getByRole("button", { name: "Auto Demo", exact: true }).click();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page.clock.runFor(5000);
  expect(
    (await (await request.get(`/api/transactions/${tx.id}`)).json()).status,
  ).toBe("ELIGIBILITY_CHECK");
});

test("Auto Demo follows deterministic backend failure", async ({
  page,
  request,
}) => {
  const tx = await createDemo(page, true);
  await page.getByRole("button", { name: "Auto Demo", exact: true }).click();
  await expect(page.getByTestId("transaction-status")).toHaveText("FAILED", {
    timeout: 15000,
  });
  expect(
    (await (await request.get(`/api/transactions/${tx.id}`)).json())
      .failure_code,
  ).toBe("DEMO_PROCESSING_FAILURE");
  await expect(
    page.getByText("DEMO_PROCESSING_FAILURE", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Auto Demo", exact: true }),
  ).toHaveCount(0);
});

test("Auto Demo stops on a stale response and refresh enables manual recovery", async ({
  page,
}) => {
  const tx = await createDemo(page);
  let advances = 0;
  await page.route(`**/api/transactions/${tx.id}/advance`, (route) => {
    advances++;
    return route.fulfill({
      status: 409,
      json: {
        detail: {
          code: "STALE_TRANSACTION_STATE",
          message: "The simulation changed.",
        },
      },
    });
  });
  await page.clock.install();
  await page.getByRole("button", { name: "Auto Demo", exact: true }).click();
  await page.clock.runFor(700);
  await expect(page.getByRole("alert")).toContainText("Refresh");
  await technicalError(page, "STALE_TRANSACTION_STATE");
  await page.clock.runFor(5000);
  expect(advances).toBe(1);
  await page.unroute(`**/api/transactions/${tx.id}/advance`);
  await page
    .getByRole("button", { name: "Refresh timeline", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Advance simulation", exact: true })
    .click();
  await expect(page.getByTestId("transaction-status")).toHaveText(
    "ELIGIBILITY_CHECK",
  );
});

for (const size of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1280, height: 1000 },
]) {
  test(`presentation frame and core controls at ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Optimize My Credit", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByRole("tab", { name: "Optimize", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Choose source card", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Find Best Route", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    const box = await page.getByRole("tablist").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(460);
    expect(Math.abs(box!.x + box!.width / 2 - size.width / 2)).toBeLessThan(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
}
