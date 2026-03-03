/**
 * wave9-work-order-creation-guard.spec.ts
 *
 * WRL-focused guard suite for new work order creation workflow.
 * Scope intentionally excludes parts/compliance domains to keep module
 * readiness signals clean and attributable.
 */

import { test, expect, type Page } from "@playwright/test";

async function openNewWorkOrderPage(page: Page) {
  await page.goto("/work-orders/new", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /New Work Order/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function selectFirstAircraftOrSkip(page: Page) {
  const emptyState = page
    .locator("text=No aircraft registered. Add aircraft in Fleet first.")
    .first();
  const hasEmptyState = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
  if (hasEmptyState) {
    test.skip(true, "No aircraft in org, cannot execute positive creation flow.");
    return false;
  }

  const trigger = page.locator("#aircraft").first();
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();

  const firstOption = page.locator("[role='option']").first();
  const optionVisible = await firstOption.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!optionVisible) {
    test.skip(true, "Aircraft options are not available.");
    return false;
  }

  await firstOption.click();
  return true;
}

test.describe("Work Order Creation Guard (WRL)", () => {
  test("new work order page loads and shows draft-create context", async ({ page }) => {
    await openNewWorkOrderPage(page);
    await expect(page.locator("text=Creates a work order in Draft status").first()).toBeVisible();
  });

  test("work order number is auto-generated and not an editable input", async ({ page }) => {
    await openNewWorkOrderPage(page);

    await expect(page.locator("text=Work Order Number").first()).toBeVisible();
    await expect(page.locator("text=Auto-generated on create").first()).toBeVisible();

    const editableWoNumberInput = page.locator("input#workOrderNumber, input[name='workOrderNumber']");
    await expect(editableWoNumberInput).toHaveCount(0);
  });

  test("submit stays disabled until required fields are complete", async ({ page }) => {
    await openNewWorkOrderPage(page);

    const createButton = page
      .locator("button[type='submit']")
      .filter({ hasText: /Create Work Order/i })
      .first();
    await expect(createButton).toBeDisabled();

    await page.locator("#description").fill("WRL guard test description");
    await expect(createButton).toBeDisabled();

    const selected = await selectFirstAircraftOrSkip(page);
    if (!selected) return;

    await expect(createButton).toBeEnabled();
  });

  test("cancel returns to work orders list without submit", async ({ page }) => {
    await openNewWorkOrderPage(page);
    await page.getByRole("link", { name: /^Cancel$/i }).click();
    await expect(page).toHaveURL(/\/work-orders$/);
  });

  test("successful create navigates to a work order detail route", async ({ page }) => {
    await openNewWorkOrderPage(page);

    await page.locator("#description").fill(
      `WRL automated create ${new Date().toISOString()}`,
    );
    const selected = await selectFirstAircraftOrSkip(page);
    if (!selected) return;

    await page
      .locator("button[type='submit']")
      .filter({ hasText: /Create Work Order/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/work-orders\/[^/]+$/, { timeout: 20_000 });
  });
});

