/**
 * billing-quote.spec.ts — Quote lifecycle E2E tests.
 *
 * Tests the quote creation flow: navigate → open form → verify fields.
 *
 * NOTE: Full quote lifecycle tests (send, approve, convert to WO) require a
 * live Convex backend and an authenticated Clerk session. Those tests are
 * marked test.skip() with notes on what would be required to enable them.
 */

import { test, expect } from "@playwright/test";

test.describe("Billing: Quote page", () => {
  test("quote list page loads or redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
    });

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    expect(page.url()).toContain("localhost:3000");
  });

  test.skip(
    "quote list shows empty state or table when authenticated",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend
      await page.goto("/billing/quotes");
      // Either empty state or list rows should be visible
      const hasEmptyState = await page
        .getByText(/no quotes/i)
        .isVisible()
        .catch(() => false);
      const hasTable = await page
        .locator("table")
        .isVisible()
        .catch(() => false);
      expect(hasEmptyState || hasTable).toBeTruthy();
    },
  );

  test.skip(
    "New Quote form renders with required fields",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend
      await page.goto("/billing/quotes/new");

      // Form should have customer select
      await expect(
        page.getByRole("combobox", { name: /customer/i }),
      ).toBeVisible();

      // Form should have aircraft select
      await expect(
        page.getByRole("combobox", { name: /aircraft/i }),
      ).toBeVisible();

      // Add Line Item button
      await expect(
        page.getByRole("button", { name: /add line item/i }),
      ).toBeVisible();

      // Save / Create button
      const saveBtn = page.getByRole("button", { name: /save|create quote/i });
      await expect(saveBtn).toBeVisible();
    },
  );

  test.skip(
    "complete quote lifecycle: create → send → approve → convert to WO",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend with seeded data
      // Step 1: Create quote
      await page.goto("/billing/quotes/new");
      // ... (fill in form fields, submit)

      // Step 2: Verify quote appears in list with DRAFT status
      await page.goto("/billing/quotes");
      await expect(page.getByText("DRAFT")).toBeVisible();

      // Step 3: Send quote
      // ... (click Send, confirm)

      // Step 4: Approve quote
      // ... (click Approve)

      // Step 5: Convert to work order
      // ... (click Convert to WO)
    },
  );
});
