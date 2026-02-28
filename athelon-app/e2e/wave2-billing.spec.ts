import { test, expect } from "@playwright/test";

const BILLING_PAGES = [
  { path: "/billing/invoices", label: "Invoices" },
  { path: "/billing/invoices/new", label: "New Invoice" },
  { path: "/billing/quotes", label: "Quotes" },
  { path: "/billing/quotes/new", label: "New Quote" },
  { path: "/billing/vendors", label: "Vendors" },
  { path: "/billing/purchase-orders", label: "Purchase Orders" },
  { path: "/billing/analytics", label: "Analytics" },
  { path: "/billing/time-clock", label: "Time Clock" },
  { path: "/billing/pricing", label: "Pricing" },
  { path: "/billing/warranty", label: "Warranty" },
  { path: "/billing/otc", label: "Counter Sales" },
  { path: "/billing/labor-kits", label: "Labor Kits" },
  { path: "/billing/ar-dashboard", label: "AR Dashboard" },
  { path: "/billing/tax-config", label: "Tax Config" },
];

test.describe("Billing Module", () => {
  for (const { path, label } of BILLING_PAGES) {
    test(`${label} page loads with content`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
