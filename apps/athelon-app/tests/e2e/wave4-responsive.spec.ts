import { test, expect } from "@playwright/test";

test.describe("Mobile responsiveness (375x667)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("dashboard renders on mobile", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("billing invoices readable on mobile", async ({ page }) => {
    await page.goto("/billing/invoices", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("parts page readable on mobile", async ({ page }) => {
    await page.goto("/parts", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("work orders readable on mobile", async ({ page }) => {
    await page.goto("/work-orders", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Tablet responsiveness (768x1024)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("dashboard renders on tablet", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("billing renders on tablet", async ({ page }) => {
    await page.goto("/billing/invoices", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("scheduling renders on tablet", async ({ page }) => {
    await page.goto("/scheduling", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});
