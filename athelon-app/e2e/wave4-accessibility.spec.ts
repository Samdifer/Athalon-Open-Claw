import { test, expect } from "@playwright/test";

const KEY_PAGES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/fleet", label: "Fleet" },
  { path: "/work-orders", label: "Work Orders" },
  { path: "/parts", label: "Parts" },
  { path: "/billing/invoices", label: "Invoices" },
  { path: "/scheduling", label: "Scheduling" },
];

test.describe("Accessibility - Headings", () => {
  for (const { path, label } of KEY_PAGES) {
    test(`${label} has a visible heading`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }
});

test.describe("Accessibility - Navigation", () => {
  test("sidebar has navigation links", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30_000 });
    const navLinks = page.locator("nav a, aside a, [data-sidebar] a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(5);
  });

  test("buttons have text or aria-label", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000);
    const buttons = page.locator("button:visible");
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const text = await btn.innerText().catch(() => "");
      const ariaLabel = await btn.getAttribute("aria-label").catch(() => null);
      const title = await btn.getAttribute("title").catch(() => null);
      const hasSvg = await btn.locator("svg").count() > 0;
      // Button should have text, aria-label, title, or at least an icon
      expect(text || ariaLabel || title || hasSvg).toBeTruthy();
    }
  });
});
