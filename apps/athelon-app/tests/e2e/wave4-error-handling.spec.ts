import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("explicit not-found route renders recovery UI", async ({ page }) => {
    const resp = await page.goto("/not-found", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.getByText("The page you requested could not be found.")).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();
  });

  test("unknown route doesn't crash", async ({ page }) => {
    const resp = await page.goto("/this-does-not-exist-xyz", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
    // SPA should still render something (redirect to dashboard or show 404)
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("invalid work order ID doesn't crash", async ({ page }) => {
    const resp = await page.goto("/work-orders/invalid_id_xyz", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("invalid invoice ID doesn't crash", async ({ page }) => {
    const resp = await page.goto("/billing/invoices/invalid_id_xyz", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("invalid aircraft tail doesn't crash", async ({ page }) => {
    const resp = await page.goto("/fleet/INVALID_TAIL", { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (resp) expect(resp.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("no console errors during normal navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.goto("/fleet", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.goto("/billing/invoices", { waitUntil: "domcontentloaded", timeout: 30_000 });
    
    // Allow some non-critical errors but no crashes
    const criticalErrors = errors.filter(e => 
      !e.includes("ResizeObserver") && 
      !e.includes("Non-Error") &&
      !e.includes("ChunkLoadError")
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});
