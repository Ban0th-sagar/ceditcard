import { test as base, expect, Page } from "@playwright/test";
export { expect };
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Autofill demo credentials", exact: true })
      .click();
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByText(/^Good (morning|afternoon|evening), Alex$/),
    ).toBeVisible();
    await use(page);
  },
});
export async function selectCard(
  page: Page,
  purpose: "source" | "destination",
  name: string,
) {
  await page
    .getByRole("button", { name: `Choose ${purpose} card`, exact: true })
    .click();
  await page
    .getByRole("radio", { name: `${purpose}: ${name}`, exact: true })
    .click();
}
export async function technicalError(page: Page, expected: string) {
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Show technical details", exact: true })
    .click();
  if (expected.includes(":"))
    await expect(page.getByTestId("error-technical-details")).toHaveText(
      expected,
    );
  else
    await expect(page.getByTestId("error-technical-details")).toContainText(
      expected,
    );
}
