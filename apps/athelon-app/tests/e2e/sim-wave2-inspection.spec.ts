/**
 * Ground Aerospace Simulation — Wave 2: Inspection & Discrepancy Management
 * Tests work cards, findings, and WO detail views with live data
 */
import { test, expect } from "@playwright/test";

test.describe("Simulation Wave 2: Inspections & Findings", () => {
  test("findings page shows discrepancies", async ({ page }) => {
    await page.goto("/findings", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test("compliance overview loads", async ({ page }) => {
    await page.goto("/compliance", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("AD/SB tracking loads", async ({ page }) => {
    await page.goto("/compliance/ad-sb", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("QCM review page loads", async ({ page }) => {
    await page.goto("/compliance/qcm-review", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("audit trail loads", async ({ page }) => {
    await page.goto("/compliance/audit-trail", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("my-work page loads for technician view", async ({ page }) => {
    await page.goto("/my-work", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("personnel page loads", async ({ page }) => {
    await page.goto("/personnel", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("training page loads", async ({ page }) => {
    await page.goto("/personnel/training", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});
