/**
 * billing-invoice.spec.ts — Invoice page E2E tests.
 *
 * Verifies the invoice list, new invoice form, and status filter tabs.
 */

import { test, expect } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";

/** Wait for Convex data to load (skeleton loaders disappear) */
async function waitForDataLoad(page: import("@playwright/test").Page) {
  await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => null);
  await page.waitForTimeout(500);
}

test.describe("Billing: Invoice page", () => {
  test("invoice list page loads or redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/billing/invoices", {
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
    "invoice list shows status filter tabs when authenticated",
    async ({ page }) => {
      await page.goto("/billing/invoices");
      await ensureClerkAuthenticated(page, "/billing/invoices");
      await waitForDataLoad(page);

      // Status filter tabs should be present
      const tabLabels = ["All", "Draft", "Sent", "Partial", "Paid", "Void"];
      for (const label of tabLabels) {
        const tab = page.getByRole("tab", { name: new RegExp(label, "i") });
        await expect(tab).toBeVisible({ timeout: 10_000 });
      }

      // The page content area should exist (main element or any content container)
      await expect(
        page
          .locator("main, [role='main']")
          .or(page.locator('[class*="container"], [class*="content"]').first()),
      ).toBeVisible({ timeout: 10_000 });
    },
  );

  test.skip("New Invoice form renders with required fields", async ({ page }) => {
    // SKIP: /billing/invoices/new route doesn't render a separate form page yet
    // The app uses modal/drawer for new invoice creation from the list page
    await page.goto("/billing/invoices/new");
    await waitForDataLoad(page);

    // Customer select (try multiple selectors)
    await expect(
      page
        .getByRole("combobox", { name: /customer/i })
        .or(page.getByLabel(/customer/i))
        .or(page.locator('select[name*="customer" i], [data-testid*="customer"]')),
    ).toBeVisible({ timeout: 10_000 });

    // Create / Save button
    await expect(
      page.getByRole("button", { name: /create|save|submit/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test.skip(
    "invoice detail page renders for existing invoice",
    async ({ page }) => {
      // Requires seeded invoice data — placeholder test
    },
  );

  test.skip(
    "PARTIAL status badge appears after partial payment",
    async ({ page }) => {
      // Requires live backend with a SENT invoice — placeholder test
    },
  );
});
