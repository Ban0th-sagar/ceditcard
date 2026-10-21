import { test, expect } from "@playwright/test";

test("capture Relay Phase 4 demo output", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "demo-output/01-home.png", fullPage: true });

  await page.getByRole("tab", { name: "Optimize", exact: true }).click();
  await expect(page.getByText("Find a clearer route.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "demo-output/02-optimize.png", fullPage: true });

  await page
    .getByRole("button", { name: "Check eligibility & optimize", exact: true })
    .click();
  await expect(page.getByText("Route analysis", { exact: true })).toBeVisible();
  await page.screenshot({ path: "demo-output/03-route-analysis.png", fullPage: true });

  await page
    .getByTestId("route-card_to_card")
    .getByRole("button", {
      name: "Select Eligible Card-to-Card Route",
      exact: true,
    })
    .click();
  await expect(page.getByText("Confirm simulation", { exact: true })).toBeVisible();
  await page.screenshot({ path: "demo-output/04-confirmation.png", fullPage: true });

  await page.getByRole("button", { name: "Simulate Route", exact: true }).click();
  await expect(page.getByTestId("transaction-status")).toHaveText("CREATED");
  await page.screenshot({ path: "demo-output/05-transaction-created.png", fullPage: true });

  for (const status of [
    "ELIGIBILITY_CHECK",
    "ELIGIBLE",
    "AUTHORIZED",
    "PROCESSING",
    "SIMULATED_SETTLED",
  ]) {
    await page.getByRole("button", { name: "Advance simulation", exact: true }).click();
    await expect(page.getByTestId("transaction-status")).toHaveText(status);
  }
  await page.screenshot({ path: "demo-output/06-simulated-settled.png", fullPage: true });

  await page.getByRole("button", { name: "View in Activity", exact: true }).click();
  await expect(page.getByText("Simulated transactions", { exact: true })).toBeVisible();
  await page.screenshot({ path: "demo-output/07-activity.png", fullPage: true });
});
