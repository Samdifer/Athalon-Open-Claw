import { test, expect } from "@playwright/test";

test.describe("Work Orders", () => {
  test("WO list page loads", async ({ page }) => {
    await page.goto("/work-orders", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("WO kanban board loads with columns", async ({ page }) => {
    await page.goto("/work-orders/kanban", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("WO templates page loads", async ({ page }) => {
    await page.goto("/work-orders/templates", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("New Work Order form loads", async ({ page }) => {
    await page.goto("/work-orders/new", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});
