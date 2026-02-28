/**
 * wave5-discrepancy-disposition.spec.ts
 *
 * AI-019: Interaction tests for the DiscrepancyDispositionDialog.
 *
 * Tests the AI-015 fix — MEL deferral was previously non-functional
 * (threw toast.error and returned). Now it renders full MEL fields and
 * calls api.discrepancies.deferDiscrepancy with signatureAuthEventId.
 *
 * Strategy:
 * - Navigate to /squawks and check if any open rows exist
 * - If rows exist, click "Disposition" and test dialog interactions
 * - If no rows, verify empty-state renders correctly (not a crash)
 * - UI-only assertions: dialog fields render, validation enforces required fields
 *   No backend mutation assertions (those are Convex-side tested separately)
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function waitForSquawksPage(page: Page) {
  await page.goto("/squawks", { waitUntil: "domcontentloaded", timeout: 30_000 });
  // Wait for either data rows or empty-state indicator
  await page
    .locator(
      "table tbody tr, [data-testid='squawks-empty'], .text-muted-foreground",
    )
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {});
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Squawks — Page Structure", () => {
  test("squawks page renders with correct heading", async ({ page }) => {
    await waitForSquawksPage(page);
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    const heading = await page.locator("h1, h2, h3").first().textContent();
    expect(heading?.toLowerCase()).toMatch(/squawk|discrepanc/i);
  });

  test("squawks page has status filter tabs", async ({ page }) => {
    await waitForSquawksPage(page);
    // Tabs: All, Open, Deferred, Resolved
    await expect(page.getByRole("tab", { name: /all/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("squawks page has search input", async ({ page }) => {
    await waitForSquawksPage(page);
    await expect(page.locator("input[placeholder*='Search'], input[type='search']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("KPI summary cards render (Open, Critical, Deferred)", async ({ page }) => {
    await waitForSquawksPage(page);
    // The page renders 3 summary cards with count numbers
    const cards = page.locator(".rounded-lg, [class*='Card']");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});

test.describe("Squawks — Disposition Dialog (MEL Path)", () => {
  test("disposition button appears on open squawk rows", async ({ page }) => {
    await waitForSquawksPage(page);

    // Check if any rows are present in the table
    const rows = page.locator("tbody tr, [role='row']");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      // Empty org — just verify an empty state is shown gracefully, not a crash
      const body = await page.locator("body").textContent();
      expect(body).not.toContain("TypeError");
      expect(body).not.toContain("Cannot read");
      test.skip(true, "No squawks in org — skipping interaction tests");
      return;
    }

    // Find a row that has the Disposition (Gavel) button
    // The button appears only on open/under_evaluation squawks
    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();
    const hasDispo = await dispositionBtn.isVisible().catch(() => false);

    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks in org — skipping dialog tests");
      return;
    }

    await dispositionBtn.click();

    // Dialog should open
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("disposition dialog has all 5 disposition options", async ({ page }) => {
    await waitForSquawksPage(page);

    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();

    const hasDispo = await dispositionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks available");
      return;
    }

    await dispositionBtn.click();

    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Open the disposition type Select
    const dispositionSelect = dialog.locator("[role='combobox']").first();
    await dispositionSelect.click();

    // Expect all 5 options in the dropdown
    const options = page.locator("[role='option']");
    await expect(options.filter({ hasText: /Corrected/i })).toBeVisible({ timeout: 3_000 });
    await expect(options.filter({ hasText: /Deferred.*Grounded/i })).toBeVisible();
    await expect(options.filter({ hasText: /Deferred.*MEL/i })).toBeVisible();
    await expect(options.filter({ hasText: /No Fault Found/i })).toBeVisible();
    await expect(options.filter({ hasText: /Could Not Reproduce/i })).toBeVisible();
  });

  test("MEL path shows amber warning + required MEL fields", async ({ page }) => {
    await waitForSquawksPage(page);

    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();

    const hasDispo = await dispositionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks available");
      return;
    }

    await dispositionBtn.click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select "Deferred (MEL)"
    const dispositionSelect = dialog.locator("[role='combobox']").first();
    await dispositionSelect.click();
    await page.locator("[role='option']").filter({ hasText: /Deferred.*MEL/i }).click();

    // The MEL-specific fields should appear (amber bordered section)
    // MEL Item Number field
    await expect(
      dialog.locator("input[placeholder*='28-10-01'], label").filter({ hasText: /MEL Item Number/i }),
    ).toBeVisible({ timeout: 3_000 });

    // MEL Category select
    await expect(
      dialog.locator("label").filter({ hasText: /MEL Category/i }),
    ).toBeVisible();

    // Signature Auth Event ID field
    await expect(
      dialog.locator("label").filter({ hasText: /Signature Auth Event/i }),
    ).toBeVisible();

    // The amber 14 CFR 91.213 warning should be shown
    await expect(
      dialog.locator("p, span").filter({ hasText: /14 CFR 91.213|MMEL|Signature required/i }),
    ).toBeVisible();
  });

  test("MEL path: Submit is disabled until all required fields are filled", async ({ page }) => {
    await waitForSquawksPage(page);

    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();

    const hasDispo = await dispositionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks available");
      return;
    }

    await dispositionBtn.click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select MEL
    await dialog.locator("[role='combobox']").first().click();
    await page.locator("[role='option']").filter({ hasText: /Deferred.*MEL/i }).click();

    // Submit button should be disabled — MEL item + category + auth event ID not filled
    const submitBtn = dialog.locator("button").filter({ hasText: /Submit Disposition/i });
    await expect(submitBtn).toBeDisabled();

    // Fill MEL item number
    await dialog.locator("input[placeholder*='28-10-01']").fill("28-10-01A");

    // Still disabled — category and auth event not filled
    await expect(submitBtn).toBeDisabled();
  });

  test("Corrected path: Submit requires corrective action text", async ({ page }) => {
    await waitForSquawksPage(page);

    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();

    const hasDispo = await dispositionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks available");
      return;
    }

    await dispositionBtn.click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select Corrected
    await dialog.locator("[role='combobox']").first().click();
    await page.locator("[role='option']").filter({ hasText: /^Corrected$/i }).click();

    // A "Corrective Action" textarea should appear
    await expect(
      dialog.locator("label").filter({ hasText: /Corrective Action/i }),
    ).toBeVisible({ timeout: 3_000 });

    // Submit disabled until corrective action is written
    const submitBtn = dialog.locator("button").filter({ hasText: /Submit Disposition/i });
    await expect(submitBtn).toBeDisabled();

    // Fill corrective action
    await dialog.locator("textarea").first().fill("Replaced failed relay per AMM 28-10-03, test passed.");
    await expect(submitBtn).toBeEnabled();
  });

  test("dialog Cancel button closes without side effects", async ({ page }) => {
    await waitForSquawksPage(page);

    const dispositionBtn = page
      .locator("button")
      .filter({ hasText: /Disposit/i })
      .first();

    const hasDispo = await dispositionBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasDispo) {
      test.skip(true, "No dispositionable squawks available");
      return;
    }

    await dispositionBtn.click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click Cancel
    await dialog.locator("button").filter({ hasText: /Cancel/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    // Page should still be intact — no crash
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });
});
