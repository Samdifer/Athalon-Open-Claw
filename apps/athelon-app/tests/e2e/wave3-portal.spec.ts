import { test, expect } from "@playwright/test";

const PORTAL_PAGES = [
  { path: "/portal", label: "Portal Dashboard" },
  { path: "/portal/work-orders", label: "Portal Work Orders" },
  { path: "/portal/quotes", label: "Portal Quotes" },
  { path: "/portal/invoices", label: "Portal Invoices" },
  { path: "/portal/fleet", label: "Portal Fleet" },
];

test.describe("Customer Portal", () => {
  for (const { path, label } of PORTAL_PAGES) {
    test(`${label} page loads`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Portal pages may show different content based on customer context
      const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (resp) expect(resp.status()).toBeLessThan(500);
      // Should have some visible content
      await expect(page.locator("body")).not.toBeEmpty();
    });
  }
});
