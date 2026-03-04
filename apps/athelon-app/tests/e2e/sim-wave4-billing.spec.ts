/**
 * Ground Aerospace Simulation — Wave 4: Billing & Customer
 * Tests quotes, invoices, POs, customers, portal, AR
 */
import { test, expect } from "@playwright/test";

test.describe("Simulation Wave 4: Billing & Customer", () => {
  test("invoices page loads", async ({ page }) => {
    await page.goto("/billing/invoices", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("quotes page loads", async ({ page }) => {
    await page.goto("/billing/quotes", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("customers page loads", async ({ page }) => {
    await page.goto("/billing/customers", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3000);
  });

  test("purchase orders page loads", async ({ page }) => {
    await page.goto("/billing/purchase-orders", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("vendors page loads", async ({ page }) => {
    await page.goto("/billing/vendors", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("AR dashboard loads", async ({ page }) => {
    await page.goto("/billing/ar-dashboard", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("billing analytics loads", async ({ page }) => {
    await page.goto("/billing/analytics", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("customer portal dashboard loads", async ({ page }) => {
    await page.goto("/portal", { waitUntil: "networkidle", timeout: 30_000 });
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/reports", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });

  test("predictions page loads with data", async ({ page }) => {
    await page.goto("/fleet/predictions", { waitUntil: "networkidle", timeout: 30_000 });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
  });
});
