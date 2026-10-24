// Captures the real running demo; no mocked financial responses or state.
const { chromium, expect } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs");
const base = process.env.RELAY_DEMO_BASE_URL || "http://127.0.0.1:8000";
const out = path.resolve(__dirname, "../../docs/previews/cheq-demo");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  );
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      timezoneId: "Asia/Kolkata",
    });
    const button = (name) => page.getByRole("button", { name, exact: true });
    const shot = (name) =>
      page.screenshot({ path: path.join(out, `${name}.png`) });
    await page.goto(base);
    await button("Sign In").waitFor();
    await shot("01-login");
    await button("Autofill demo credentials").click();
    await button("Sign In").click();
    await page.getByText("YOUR CREDIT", { exact: true }).waitFor();
    await shot("02-home");
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await button("CheQ Demo").click();
    await shot("03-optimize");
    await button("Find Best Route").click();
    await page.getByText("Route analysis", { exact: true }).waitFor();
    await button("Why this recommendation?").click();
    await shot("04-route-analysis");
    await button("View Eligible Card-to-Card Route details").click();
    await shot("05-route-details");
    await button("Select Eligible Card-to-Card Route").click();
    await page.getByText("Confirm simulation", { exact: true }).waitFor();
    await shot("08-confirmation");
    const createdResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/transactions") &&
        r.request().method() === "POST",
    );
    await button("Simulate Route").click();
    const tx = await (await createdResponse).json();
    await button("Auto Demo").click();
    await expect(page.getByTestId("transaction-status")).toHaveText(
      "SIMULATED_SETTLED",
      { timeout: 15000 },
    );
    await page
      .getByRole("tablist")
      .evaluate((el) => el.previousElementSibling.scrollTo(0, 0));
    await shot("09-simulated-settled");
    await button("View in Activity").click();
    await button(`Open simulation ${tx.id}`).waitFor();
    await shot("10-activity");
    await page.getByRole("tab", { name: "Optimize", exact: true }).click();
    await button("Choose source card").click();
    await page
      .getByRole("radio", { name: "source: Axis ACE", exact: true })
      .click();
    await button("Find Best Route").click();
    await expect(
      page.getByText("Estimated total: ₹10,320", { exact: true }),
    ).toBeVisible();
    await shot("11-axis-blocked");
    await button("Open Marketplace")
      .count()
      .then(async (count) => {
        if (count) await button("Open Marketplace").click();
        else await button("Browse Balance Transfer offers").click();
      });
    await page.getByTestId("offer-cedar_transfer").waitFor();
    await page
      .getByRole("textbox", { name: "Marketplace amount", exact: true })
      .fill("20000");
    await button("Compare fictional offers").click();
    const card = page.getByTestId("offer-cedar_transfer");
    await card.waitFor();
    await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await shot("06-marketplace");
    await button("Details: Cedar Clear Transfer").click();
    await shot("07-offer-details");
    await page.setViewportSize({ width: 430, height: 932 });
    await page.getByRole("tab", { name: "Home", exact: true }).click();
    await shot("12-home-430");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await shot("13-desktop-frame");
    console.log(`Captured 13 running-app previews in ${out}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
