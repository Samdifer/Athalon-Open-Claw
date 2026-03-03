/**
 * smoke-all-routes.spec.ts — Comprehensive smoke tests for ALL Athelon app routes.
 * Wave 1: Verifies every route responds without 500 errors.
 */
import { test, expect } from "@playwright/test";
import { INTERNAL_ROUTE_MANIFEST } from "./route-manifest.internal";

function isAliveUrl(url: string): boolean {
  return (
    url.includes("localhost:3000") ||
    url.includes("sign-in") ||
    url.includes("accounts.dev") ||
    url.includes("clerk")
  );
}

async function smokeCheck(page: import("@playwright/test").Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (response) {
    expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(500);
  }
  const finalUrl = page.url();
  expect(isAliveUrl(finalUrl), `${path} → unexpected redirect to: ${finalUrl}`).toBeTruthy();
}

const ALL_ROUTES = [
  { path: "/", label: "Root" },
  ...INTERNAL_ROUTE_MANIFEST,

  // Customer Portal
  { path: "/portal", label: "Portal Dashboard" },
  { path: "/portal/work-orders", label: "Portal Work Orders" },
  { path: "/portal/quotes", label: "Portal Quotes" },
  { path: "/portal/invoices", label: "Portal Invoices" },
  { path: "/portal/fleet", label: "Portal Fleet" },

  // Auth
  { path: "/sign-in", label: "Sign In" },
  { path: "/sign-up", label: "Sign Up" },
];

test.describe("Wave 1: All Routes Smoke Test", () => {
  for (const { path, label } of ALL_ROUTES) {
    test(`[${label}] ${path}`, async ({ page }) => {
      await smokeCheck(page, path);
    });
  }
});
