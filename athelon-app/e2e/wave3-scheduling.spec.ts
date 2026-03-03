import { test, expect } from "@playwright/test";

test.describe("Scheduling", () => {
  test("Gantt page loads", async ({ page }) => {
    await page.goto("/scheduling", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("bay management loads", async ({ page }) => {
    await page.goto("/scheduling/bays", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("capacity page loads", async ({ page }) => {
    await page.goto("/scheduling/capacity", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("roster workspace page loads", async ({ page }) => {
    await page.goto("/scheduling/roster", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.getByTestId("roster-workspace-page")).toBeVisible({ timeout: 15_000 });
  });

  test("quote workspace page loads", async ({ page }) => {
    await page.goto("/scheduling/quotes", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page.getByTestId("quote-workspace-shell")).toBeVisible({
      timeout: 15_000,
    });
  });
});
