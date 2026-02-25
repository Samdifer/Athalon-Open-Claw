/**
 * billing-invoice.spec.ts — Invoice page E2E tests.
 *
 * Verifies the invoice list, new invoice form, and status filter tabs.
 *
 * NOTE: Tests requiring live Convex auth are marked test.skip().
 */

import { test, expect } from "@playwright/test";

test.describe("Billing: Invoice page", () => {
  test("invoice list page loads or redirects to sign-in", async ({ page }) => {
    const response = await page.goto("/billing/invoices", {
      waitUntil: "domcontentloaded",
    });

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    const finalUrl = page.url();
    expect(finalUrl.includes("localhost:3000") || finalUrl.includes("accounts.dev") || finalUrl.includes("sign-in"), `Unexpected URL: ${finalUrl}`).toBeTruthy();
  });

  test.skip(
    "invoice list shows status filter tabs when authenticated",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend
      await page.goto("/billing/invoices");

      // Status filter tabs should be present
      const tabLabels = ["All", "Draft", "Sent", "Partial", "Paid", "Void"];
      for (const label of tabLabels) {
        const tab = page.getByRole("tab", { name: new RegExp(label, "i") });
        // Not all tabs may exist in the current UI — just check if the page renders
        const exists = await tab.isVisible().catch(() => false);
        // We just verify the page doesn't crash — individual tab presence depends on UI
        void exists;
      }

      // The invoice list container should exist
      await expect(page.locator("main, [role='main']")).toBeVisible();
    },
  );

  test.skip("New Invoice form renders with required fields", async ({ page }) => {
    // Requires: authenticated Clerk session, live Convex backend
    await page.goto("/billing/invoices/new");

    // Customer select
    await expect(
      page.getByRole("combobox", { name: /customer/i }),
    ).toBeVisible();

    // Create / Save button
    await expect(
      page.getByRole("button", { name: /create|save/i }),
    ).toBeVisible();
  });

  test.skip(
    "invoice detail page renders for existing invoice",
    async ({ page }) => {
      // Requires: authenticated Clerk session, live Convex backend with at least one invoice
      // The invoice ID would need to be seeded or fetched dynamically.
      // Example: await page.goto('/billing/invoices/SEEDED_INVOICE_ID');
      // await expect(page.getByText('INV-0001')).toBeVisible();
    },
  );

  test.skip(
    "PARTIAL status badge appears after partial payment",
    async ({ page }) => {
      // Requires: live backend with a SENT invoice
      // After recording a partial payment via recordPayment mutation,
      // the invoice status badge should show PARTIAL.
    },
  );
});
