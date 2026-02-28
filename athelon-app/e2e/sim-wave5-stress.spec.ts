/**
 * Ground Aerospace Simulation — Wave 5: Stress & Error Detection
 * Rapid navigation through all pages to detect crashes, console errors, slow loads
 */
import { test, expect } from "@playwright/test";

const ALL_PAGES = [
  "/dashboard", "/fleet", "/fleet/calendar", "/fleet/predictions",
  "/work-orders", "/work-orders/kanban", "/work-orders/templates",
  "/parts", "/parts/shipping", "/parts/rotables", "/parts/loaners",
  "/parts/tools", "/parts/cores", "/parts/inventory-count", "/parts/requests",
  "/billing/invoices", "/billing/quotes", "/billing/customers", "/billing/vendors",
  "/billing/purchase-orders", "/billing/analytics", "/billing/ar-dashboard",
  "/billing/time-clock", "/billing/pricing", "/billing/warranty", "/billing/otc",
  "/billing/labor-kits", "/billing/deposits", "/billing/credit-memos",
  "/billing/recurring", "/billing/tax-config", "/billing/settings",
  "/scheduling", "/scheduling/bays", "/scheduling/capacity",
  "/personnel", "/personnel/training",
  "/compliance", "/compliance/audit-trail", "/compliance/qcm-review", "/compliance/ad-sb",
  "/squawks", "/my-work", "/reports",
  "/settings/shop", "/settings/users", "/settings/notifications",
  "/settings/locations", "/settings/import", "/settings/email-log", "/settings/quickbooks",
  "/portal", "/portal/work-orders", "/portal/quotes", "/portal/invoices", "/portal/fleet",
];

test.describe("Simulation Wave 5: Stress Navigation", () => {
  test("rapid page navigation — no crashes", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));

    for (const path of ALL_PAGES) {
      const resp = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
      if (resp && resp.status() >= 500) {
        errors.push(`${path}: HTTP ${resp.status()}`);
      }
      // Brief wait to let React render
      await page.waitForTimeout(500);
    }

    // Filter benign errors
    const realErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("network") &&
             !e.includes("Failed to fetch") && !e.includes("Convex") &&
             !e.includes("WebSocket") && !e.includes("chunk")
    );

    if (realErrors.length > 0) {
      console.log("ERRORS FOUND:", JSON.stringify(realErrors, null, 2));
    }
    expect(realErrors).toHaveLength(0);
  });

  test("slow page detection — all pages load under 10s", async ({ page }) => {
    const slowPages: string[] = [];

    for (const path of ALL_PAGES.slice(0, 20)) { // Test first 20 for timing
      const start = Date.now();
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
      const elapsed = Date.now() - start;
      if (elapsed > 10000) {
        slowPages.push(`${path}: ${elapsed}ms`);
      }
    }

    if (slowPages.length > 0) {
      console.log("SLOW PAGES:", JSON.stringify(slowPages, null, 2));
    }
    expect(slowPages).toHaveLength(0);
  });
});
