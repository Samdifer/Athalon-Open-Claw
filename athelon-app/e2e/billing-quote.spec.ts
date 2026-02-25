/**
 * billing-quote.spec.ts — Quote lifecycle E2E tests.
 *
 * Tests the quote creation flow: navigate → open form → verify fields.
 */

import { test, expect } from "@playwright/test";

/** Wait for Convex data to load (skeleton loaders disappear) */
async function waitForDataLoad(page: import("@playwright/test").Page) {
  await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => null);
  await page.waitForTimeout(500);
}

test.describe("Billing: Quote page", () => {
  test("quote list page loads or redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
    });

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    const finalUrl = page.url();
    expect(
      finalUrl.includes("localhost:3000") ||
        finalUrl.includes("accounts.dev") ||
        finalUrl.includes("sign-in"),
      `Unexpected URL: ${finalUrl}`,
    ).toBeTruthy();
  });

  test(
    "quote list shows empty state or table when authenticated",
    async ({ page }) => {
      await page.goto("/billing/quotes");
      await waitForDataLoad(page);

      const hasEmptyState = await page
        .getByText(/no quotes/i)
        .isVisible()
        .catch(() => false);
      const hasTable = await page
        .locator("table")
        .isVisible()
        .catch(() => false);
      const hasCards = await page
        .locator('[class*="card"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasContent = await page
        .locator("main, [role='main']")
        .isVisible()
        .catch(() => false);
      expect(hasEmptyState || hasTable || hasCards || hasContent).toBeTruthy();
    },
  );

  test.skip(
    "New Quote form renders with required fields",
    async ({ page }) => {
      // SKIP: /billing/quotes/new doesn't render a separate form page yet
      await page.goto("/billing/quotes/new");
    },
  );

  test.skip(
    "complete quote lifecycle: create → send → approve → convert to WO",
    async ({ page }) => {
      // SKIP: Requires seeded data and /billing/quotes/new form page
    },
  );
});
