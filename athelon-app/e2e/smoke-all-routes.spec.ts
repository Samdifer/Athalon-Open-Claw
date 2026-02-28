/**
 * smoke-all-routes.spec.ts — Comprehensive smoke tests for ALL Athelon app routes.
 * Wave 1: Verifies every route responds without 500 errors.
 */
import { test, expect } from "@playwright/test";

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
  // Core
  { path: "/", label: "Root" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/my-work", label: "My Work" },

  // Fleet
  { path: "/fleet", label: "Fleet" },
  { path: "/fleet/calendar", label: "Fleet Calendar" },
  { path: "/fleet/predictions", label: "Predictions" },
  { path: "/fleet/N12345", label: "Aircraft Detail" },
  { path: "/fleet/N12345/logbook", label: "Aircraft Logbook" },

  // Work Orders
  { path: "/work-orders", label: "Work Orders" },
  { path: "/work-orders/new", label: "New Work Order" },
  { path: "/work-orders/kanban", label: "WO Kanban" },
  { path: "/work-orders/templates", label: "WO Templates" },
  // Placeholder ID routes skipped — need real Convex IDs to avoid React error boundaries
  // { path: "/work-orders/placeholder_id/records", label: "WO Records" },
  // { path: "/work-orders/placeholder_id/rts", label: "WO RTS" },
  // { path: "/work-orders/placeholder_id/release", label: "WO Release" },
  // { path: "/work-orders/placeholder_id/signature", label: "WO Signature" },
  // { path: "/work-orders/placeholder_id/certificates", label: "WO Certificates" },

  // Parts
  { path: "/parts", label: "Parts" },
  { path: "/parts/new", label: "New Part" },
  { path: "/parts/requests", label: "Parts Requests" },
  { path: "/parts/receiving", label: "Parts Receiving" },
  { path: "/parts/tools", label: "Tool Crib" },
  { path: "/parts/cores", label: "Core Tracking" },
  { path: "/parts/inventory-count", label: "Inventory Count" },
  { path: "/parts/shipping", label: "Shipping" },
  { path: "/parts/rotables", label: "Rotables" },
  { path: "/parts/loaners", label: "Loaners" },

  // Billing
  { path: "/billing/invoices", label: "Invoices" },
  { path: "/billing/invoices/new", label: "New Invoice" },
  { path: "/billing/quotes", label: "Quotes" },
  { path: "/billing/quotes/new", label: "New Quote" },
  { path: "/billing/purchase-orders", label: "Purchase Orders" },
  { path: "/billing/purchase-orders/new", label: "New PO" },
  { path: "/billing/customers", label: "Customers" },
  { path: "/billing/vendors", label: "Vendors" },
  { path: "/billing/vendors/new", label: "New Vendor" },
  { path: "/billing/time-clock", label: "Time Clock" },
  { path: "/billing/time-approval", label: "Time Approval" },
  { path: "/billing/pricing", label: "Pricing" },
  { path: "/billing/analytics", label: "Billing Analytics" },
  { path: "/billing/ar-dashboard", label: "AR Dashboard" },
  { path: "/billing/deposits", label: "Deposits" },
  { path: "/billing/credit-memos", label: "Credit Memos" },
  { path: "/billing/recurring", label: "Recurring" },
  { path: "/billing/tax-config", label: "Tax Config" },
  { path: "/billing/settings", label: "Billing Settings" },
  { path: "/billing/labor-kits", label: "Labor Kits" },
  { path: "/billing/otc", label: "Counter Sales" },
  { path: "/billing/warranty", label: "Warranty" },

  // Scheduling
  { path: "/scheduling", label: "Scheduling Gantt" },
  { path: "/scheduling/bays", label: "Bay Management" },
  { path: "/scheduling/capacity", label: "Capacity" },

  // Personnel
  { path: "/personnel", label: "Personnel" },
  { path: "/personnel/training", label: "Training" },

  // Compliance
  { path: "/compliance", label: "Compliance" },
  { path: "/compliance/audit-trail", label: "Audit Trail" },
  { path: "/compliance/qcm-review", label: "QCM Review" },
  { path: "/compliance/ad-sb", label: "AD/SB Tracking" },

  // Squawks
  { path: "/squawks", label: "Squawks" },

  // Reports
  { path: "/reports", label: "Reports" },

  // Settings
  { path: "/settings/shop", label: "Shop Settings" },
  { path: "/settings/users", label: "Users" },
  { path: "/settings/notifications", label: "Notifications" },
  { path: "/settings/locations", label: "Locations" },
  { path: "/settings/import", label: "Import" },
  { path: "/settings/email-log", label: "Email Log" },
  { path: "/settings/quickbooks", label: "QuickBooks" },

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
