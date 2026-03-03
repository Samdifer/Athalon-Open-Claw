import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads with heading", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows summary cards", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    const cards = page.locator("[class*='card'], [class*='Card']");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("has navigation links in sidebar", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    // Wait for sidebar to hydrate — Links render as <a> tags
    await page.waitForTimeout(3000);
    const links = page.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThan(3);
  });

  test("page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(3000);
    const real = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("network") &&
             !e.includes("Failed to fetch") && !e.includes("Convex") &&
             !e.includes("WebSocket")
    );
    expect(real).toHaveLength(0);
  });
});
