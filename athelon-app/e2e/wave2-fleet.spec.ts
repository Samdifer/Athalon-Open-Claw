import { test, expect } from "@playwright/test";

test.describe("Fleet Module", () => {
  test("fleet page loads", async ({ page }) => {
    await page.goto("/fleet", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("fleet calendar loads", async ({ page }) => {
    await page.goto("/fleet/calendar", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("predictions page loads", async ({ page }) => {
    await page.goto("/fleet/predictions", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("aircraft detail handles missing tail", async ({ page }) => {
    const resp = await page.goto("/fleet/N99999", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
  });
});
