import { test, expect } from "@playwright/test";

test("splash, wrong login, autofill and local demo access", async ({
  page,
}) => {
  const financialRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) financialRequests.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByText("Intelligent credit routing.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("demo@relay.app");
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("wrong-demo-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("do not match this demo");
  expect(financialRequests).toEqual([]);
  await expect(
    page.getByText(
      "Demo access only — no real financial account is connected.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Autofill demo credentials", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toHaveValue("demo@relay.app");
  await expect(
    page.getByRole("textbox", { name: "Password", exact: true }),
  ).toHaveValue("Relay@123");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByText("YOUR CREDIT", { exact: true })).toBeVisible();
});

test("demo session survives reload and Logout removes local access", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Autofill demo credentials", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByText("YOUR CREDIT", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("YOUR CREDIT", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(page.getByText("0.6 Demo", { exact: true })).toBeVisible();
  await expect(page.getByText("Phase 2 UI", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("relay.demoAccess")),
  ).toBeNull();
});

for (const [iso, greeting] of [
  ["2026-10-24T04:00:00Z", "Good morning, Alex"],
  ["2026-10-24T09:00:00Z", "Good afternoon, Alex"],
  ["2026-10-24T15:00:00Z", "Good evening, Alex"],
]) {
  test(`greeting uses device local time: ${greeting}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Kolkata" });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(iso) });
    await page.goto("/");
    await page.clock.runFor(450);
    await page
      .getByRole("button", { name: "Autofill demo credentials", exact: true })
      .click();
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText(greeting, { exact: true })).toBeVisible();
    await context.close();
  });
}
