import { test, expect } from "@playwright/test";

const PARTS_PAGES = [
  { path: "/parts", label: "Parts List" },
  { path: "/parts/requests", label: "Parts Requests" },
  { path: "/parts/receiving", label: "Receiving" },
  { path: "/parts/shipping", label: "Shipping" },
  { path: "/parts/rotables", label: "Rotables" },
  { path: "/parts/loaners", label: "Loaners" },
  { path: "/parts/tools", label: "Tool Crib" },
  { path: "/parts/cores", label: "Core Tracking" },
  { path: "/parts/inventory-count", label: "Inventory Count" },
];

test.describe("Parts Module", () => {
  for (const { path, label } of PARTS_PAGES) {
    test(`${label} page loads with content`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test("shipping page has tab triggers", async ({ page }) => {
    await page.goto("/parts/shipping", { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    // TabsTrigger renders as button with data-state
    const tabs = page.locator("button[role='tab'], [data-state='active'], button:has-text('All')");
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
  });

  test("rotables page has status filter tabs", async ({ page }) => {
    await page.goto("/parts/rotables", { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    const tabs = page.locator("button[role='tab'], [data-state='active'], button:has-text('All')");
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
  });

  test("loaners page has visible content", async ({ page }) => {
    await page.goto("/parts/loaners", { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    // Look for summary cards or any card-like content
    const content = page.locator("h1, h2, h3, [class*='card'], [class*='Card'], p");
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });
});
