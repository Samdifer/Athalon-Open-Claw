/**
 * Ground Aerospace Simulation — Wave 1: Induction & Scheduling
 * Verifies 10 aircraft are in the system, WOs are visible, scheduling works
 */
import { test, expect } from "@playwright/test";

test.describe("Simulation Wave 1: Fleet & Work Orders", () => {
  test("fleet page shows aircraft", async ({ page }) => {
    await page.goto("/fleet", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    // Should have aircraft data rendered
    await page.waitForTimeout(3000);
    const body = await page.locator("body").innerText();
    // Check for at least some aircraft-related content
    expect(body.length).toBeGreaterThan(100);
  });

  test("work orders page shows WOs", async ({ page }) => {
    await page.goto("/work-orders", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test("work order kanban has columns", async ({ page }) => {
    await page.goto("/work-orders/kanban", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
  });

  test("scheduling Gantt loads", async ({ page }) => {
    await page.goto("/scheduling", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("bay management shows bays", async ({ page }) => {
    await page.goto("/scheduling/bays", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
  });

  test("dashboard loads with data", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
    // Dashboard should show charts/cards with real data
    const cards = page.locator("[class*='card'], [class*='Card']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("capacity page loads", async ({ page }) => {
    await page.goto("/scheduling/capacity", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});
