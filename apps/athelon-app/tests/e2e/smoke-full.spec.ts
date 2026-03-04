/**
 * smoke-full.spec.ts — Full navigation smoke tests for ALL Athelon app pages.
 *
 * Tests verify that every route responds without a 500-level server error.
 * Since the app requires Clerk authentication, unauthenticated requests will
 * redirect to /sign-in — this is accepted as a valid "page is alive" signal.
 *
 * For dynamic routes like /work-orders/[id], we use a placeholder ID and accept
 * any response short of a 500 error (404 is fine — it means the route works).
 */

import { test, expect } from "@playwright/test";

// ─── Helper ─────────────────────────────────────────────────────────────────

type RouteEntry = { path: string; label: string };

function isAliveUrl(url: string): boolean {
  return (
    url.includes("localhost:3000") ||
    url.includes("sign-in") ||
    url.includes("accounts.dev") ||
    url.includes("clerk")
  );
}

async function smokeCheck(
  page: import("@playwright/test").Page,
  path: string,
) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });

  // No 5xx errors
  if (response) {
    expect(response.status(), `${path} returned HTTP ${response.status()}`).toBeLessThan(500);
  }

  // URL should remain on app domain or Clerk auth — not a crash page
  const finalUrl = page.url();
  expect(
    isAliveUrl(finalUrl),
    `${path} → unexpected redirect to: ${finalUrl}`,
  ).toBeTruthy();
}

// ─── Route Groups ────────────────────────────────────────────────────────────

const MODULE_ROUTES: RouteEntry[] = [
  // Root
  { path: "/", label: "Root redirect" },

  // Dashboard
  { path: "/dashboard", label: "Dashboard" },

  // Fleet
  { path: "/fleet", label: "Fleet list" },
  { path: "/fleet/N12345", label: "Fleet detail (placeholder tail)" },

  // Work Orders
  { path: "/work-orders", label: "Work Orders list" },
  { path: "/work-orders/new", label: "Work Orders new" },
  { path: "/work-orders/placeholder_id_000", label: "Work Order detail (placeholder)" },
  { path: "/work-orders/placeholder_id_000/tasks/new", label: "Work Order task new (placeholder)" },
  { path: "/work-orders/placeholder_id_000/tasks/placeholder_card_000", label: "Work Order task detail (placeholder)" },
  { path: "/work-orders/placeholder_id_000/records", label: "Work Order records (placeholder)" },
  { path: "/work-orders/placeholder_id_000/rts", label: "Work Order RTS (placeholder)" },
  { path: "/work-orders/placeholder_id_000/signature", label: "Work Order signature (placeholder)" },
  { path: "/work-orders/templates", label: "Work Order templates" },

  // Parts
  { path: "/parts", label: "Parts list" },
  { path: "/parts/new", label: "Parts new" },
  { path: "/parts/requests", label: "Parts requests" },

  // Billing
  { path: "/billing/customers", label: "Billing customers list" },
  { path: "/billing/customers/placeholder_id_000", label: "Billing customer detail (placeholder)" },
  { path: "/billing/quotes", label: "Billing quotes list" },
  { path: "/billing/quotes/new", label: "Billing quote new" },
  { path: "/billing/quotes/placeholder_id_000", label: "Billing quote detail (placeholder)" },
  { path: "/billing/invoices", label: "Billing invoices list" },
  { path: "/billing/invoices/new", label: "Billing invoice new" },
  { path: "/billing/invoices/placeholder_id_000", label: "Billing invoice detail (placeholder)" },
  { path: "/billing/purchase-orders", label: "Billing POs list" },
  { path: "/billing/purchase-orders/new", label: "Billing PO new" },
  { path: "/billing/purchase-orders/placeholder_id_000", label: "Billing PO detail (placeholder)" },
  { path: "/billing/time-clock", label: "Billing time clock" },
  { path: "/billing/vendors", label: "Billing vendors list" },
  { path: "/billing/vendors/new", label: "Billing vendor new" },
  { path: "/billing/vendors/placeholder_id_000", label: "Billing vendor detail (placeholder)" },
  { path: "/billing/pricing", label: "Billing pricing" },
  { path: "/billing/analytics", label: "Billing analytics" },
  { path: "/billing/ar-dashboard", label: "Billing AR dashboard" },
  { path: "/billing/time-approval", label: "Billing time approval" },
  { path: "/billing/deposits", label: "Billing deposits" },
  { path: "/billing/credit-memos", label: "Billing credit memos" },
  { path: "/billing/recurring", label: "Billing recurring templates" },
  { path: "/billing/tax-config", label: "Billing tax config" },
  { path: "/billing/settings", label: "Billing settings" },

  // Personnel
  { path: "/personnel", label: "Personnel" },

  // Compliance
  { path: "/compliance", label: "Compliance" },
  { path: "/compliance/audit-trail", label: "Compliance audit trail" },
  { path: "/compliance/certificates", label: "Compliance certificates alias" },

  // Squawks
  { path: "/squawks", label: "Squawks" },

  // Settings
  { path: "/settings/shop", label: "Settings shop" },

  // Scheduling
  { path: "/scheduling", label: "Scheduling gantt" },
  { path: "/scheduling/bays", label: "Scheduling bays" },
  { path: "/scheduling/capacity", label: "Scheduling capacity" },
  { path: "/scheduling/financial-planning", label: "Scheduling financial planning" },
  { path: "/scheduling/quotes", label: "Scheduling quote workspace" },

  // Technician MVP (new pages)
  { path: "/my-work", label: "My Work (tech view)" },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Smoke: All app pages respond without 500 errors", () => {
  for (const { path, label } of MODULE_ROUTES) {
    test(`[${label}] ${path}`, async ({ page }) => {
      await smokeCheck(page, path);
    });
  }
});
