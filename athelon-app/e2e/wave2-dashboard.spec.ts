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

  test("has navigation links", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    const links = page.locator("a[href]");
    const count = await links.count();
    expect(count).toBeGreaterThan(5);
  });

  test("page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    const real = errors.filter((e) => !e.includes("ResizeObserver") && !e.includes("network") && !e.includes("Failed to fetch"));
    expect(real).toHaveLength(0);
  });
});
