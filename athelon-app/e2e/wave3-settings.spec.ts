import { test, expect } from "@playwright/test";

const SETTINGS_PAGES = [
  { path: "/settings/shop", label: "Shop Settings" },
  { path: "/settings/users", label: "User Management" },
  { path: "/settings/notifications", label: "Notifications" },
  { path: "/settings/locations", label: "Locations" },
  { path: "/settings/import", label: "Import" },
  { path: "/settings/email-log", label: "Email Log" },
  { path: "/settings/quickbooks", label: "QuickBooks" },
];

test.describe("Settings", () => {
  for (const { path, label } of SETTINGS_PAGES) {
    test(`${label} page loads`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
