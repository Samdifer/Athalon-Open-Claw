import { test, expect } from "@playwright/test";

const COMPLIANCE_PAGES = [
  { path: "/compliance", label: "Compliance Overview" },
  { path: "/compliance/audit-trail", label: "Audit Trail" },
  { path: "/compliance/qcm-review", label: "QCM Review" },
  { path: "/compliance/ad-sb", label: "AD/SB Tracking" },
];

test.describe("Compliance", () => {
  for (const { path, label } of COMPLIANCE_PAGES) {
    test(`${label} page loads`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
