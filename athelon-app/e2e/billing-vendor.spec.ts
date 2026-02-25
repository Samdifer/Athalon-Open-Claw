/**
 * billing-vendor.spec.ts — Vendor management page E2E tests.
 *
 * Verifies the vendor list page loads and the new vendor form is accessible.
 *
 * NOTE: Tests requiring live Convex auth are marked test.skip().
 */

import { test, expect } from "@playwright/test";

test.describe("Billing: Vendor page", () => {
  test("vendor list page loads or redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/billing/vendors", {
      waitUntil: "domcontentloaded",
    });

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    const finalUrl = page.url();
    expect(finalUrl.includes("localhost:3000") || finalUrl.includes("accounts.dev") || finalUrl.includes("sign-in"), `Unexpected URL: ${finalUrl}`).toBeTruthy();
  });

  test.skip(
    "vendor list shows content or empty state when authenticated",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend
      await page.goto("/billing/vendors");

      // Page should show either a vendor list or an empty state
      const hasTable = await page
        .locator("table")
        .isVisible()
        .catch(() => false);
      const hasEmptyState = await page
        .getByText(/no vendor/i)
        .isVisible()
        .catch(() => false);
      expect(hasTable || hasEmptyState).toBeTruthy();
    },
  );

  test.skip(
    "New Vendor button is visible and opens form",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend
      await page.goto("/billing/vendors");

      const newBtn = page.getByRole("button", { name: /new vendor/i });
      await expect(newBtn).toBeVisible();
      await newBtn.click();

      // Form should appear (dialog or page)
      await expect(
        page.getByRole("heading", { name: /new vendor|add vendor/i }),
      ).toBeVisible({ timeout: 5000 });
    },
  );

  test.skip("New Vendor form has required fields", async ({ page }) => {
    // Requires: authenticated Clerk session, live Convex backend
    await page.goto("/billing/vendors");
    await page.getByRole("button", { name: /new vendor/i }).click();

    // Vendor name field
    await expect(
      page.getByLabel(/vendor name|name/i),
    ).toBeVisible();

    // Vendor type select
    await expect(
      page.getByRole("combobox", { name: /type/i }),
    ).toBeVisible();

    // Save / Create button
    await expect(
      page.getByRole("button", { name: /save|create|add/i }),
    ).toBeVisible();
  });

  test.skip(
    "vendor approval flow: create → approve via DOM/QCM",
    async ({ page }) => {
      // Requires: authenticated session as DOM or QCM role
      // Step 1: Create vendor (starts unapproved / isApproved: false)
      // Step 2: Approve vendor — sets isApproved: true
      // Step 3: Verify vendor appears in approved vendor list
    },
  );
});
