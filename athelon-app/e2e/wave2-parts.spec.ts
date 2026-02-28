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
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test("shipping page has tabs", async ({ page }) => {
    await page.goto("/parts/shipping", { waitUntil: "domcontentloaded", timeout: 30_000 });
    const tabs = page.locator("[role='tablist'], [class*='Tabs']");
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
  });

  test("rotables page has status filters", async ({ page }) => {
    await page.goto("/parts/rotables", { waitUntil: "domcontentloaded", timeout: 30_000 });
    const tabs = page.locator("[role='tablist'], [class*='Tabs']");
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
  });

  test("loaners page has summary cards", async ({ page }) => {
    await page.goto("/parts/loaners", { waitUntil: "domcontentloaded", timeout: 30_000 });
    const cards = page.locator("[class*='card'], [class*='Card']");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });
});
