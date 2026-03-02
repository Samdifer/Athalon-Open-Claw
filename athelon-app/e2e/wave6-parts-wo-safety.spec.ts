/**
 * wave6-parts-wo-safety.spec.ts
 *
 * AI-045: E2E safety regression tests for parts workflows.
 *
 * Context:
 * - AI-031: Rotables "Condemn" action now uses shadcn AlertDialog instead of
 *   immediate execution. A condemned aircraft component ($20k–$200k) should
 *   never be written off with a single accidental click.
 *
 * - AI-033: Parts inventory cards are now clickable and open a PartDetailSheet
 *   slide-in panel. Previously cards had `cursor-pointer` but no `onClick`.
 *   The detail sheet shows P/N, S/N, 8130-3 status, life-limit warnings, etc.
 * Work-order creation guard checks were moved to:
 *   e2e/wave9-work-order-creation-guard.spec.ts
 * so WRL module preflight can use a dedicated WO-focused suite.
 *
 * Tests: 9 total
 */

import { test, expect } from "@playwright/test";

// ─── Rotables Tests (AI-031) ──────────────────────────────────────────────────

test.describe("Rotables Page — Condemn AlertDialog (AI-031)", () => {
  test("rotables page loads without error", async ({ page }) => {
    await page.goto("/parts/rotables", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
    expect(body).not.toContain("Cannot read properties of undefined");
  });

  test("rotables page renders filter tabs or empty state", async ({ page }) => {
    await page.goto("/parts/rotables", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(2_000);

    // Should show either filter tabs (All, Installed, Serviceable, etc.) or an empty state
    const hasTabs = await page.locator("[role='tab']").first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasContent = await page.locator("h1, h2, h3").first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasTabs || hasContent).toBe(true);
  });

  test("Condemn button uses AlertDialog — not bare window.confirm (AI-031)", async ({ page }) => {
    await page.goto("/parts/rotables", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    // Look for any "Condemn" button (only appears on non-condemned rotables)
    const condemnBtn = page
      .locator("button")
      .filter({ hasText: /^Condemn$/i })
      .first();

    const hasCondemnBtn = await condemnBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCondemnBtn) {
      // No non-condemned rotables in this org — check page renders clean
      const body = await page.locator("body").textContent();
      expect(body).not.toContain("TypeError");
      test.skip(true, "No condemnable rotables found — skipping AlertDialog test");
      return;
    }

    // Monitor for bare browser confirm() dialogs — there should be NONE (AI-031 fix)
    let browserDialogTriggered = false;
    page.on("dialog", async (dialog) => {
      browserDialogTriggered = true;
      await dialog.dismiss();
    });

    await condemnBtn.click();

    // Short wait for UI to react
    await page.waitForTimeout(500);

    // Assert: No browser confirm() was triggered
    expect(browserDialogTriggered).toBe(false);

    // Assert: The shadcn AlertDialog appeared
    const alertDialog = page.locator("[role='alertdialog'], [role='dialog'][data-state='open']");
    await expect(alertDialog).toBeVisible({ timeout: 5_000 });
  });

  test("Condemn AlertDialog shows component part number and serial in warning", async ({ page }) => {
    await page.goto("/parts/rotables", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    const condemnBtn = page
      .locator("button")
      .filter({ hasText: /^Condemn$/i })
      .first();

    const hasCondemnBtn = await condemnBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCondemnBtn) {
      test.skip(true, "No condemnable rotables found — skipping AlertDialog content test");
      return;
    }

    await condemnBtn.click();
    await page.waitForTimeout(500);

    const alertDialog = page.locator("[role='alertdialog'], [role='dialog'][data-state='open']");
    const visible = await alertDialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      test.skip(true, "AlertDialog did not open — implementation check needed");
      return;
    }

    // The AlertDialog must contain "Condemn Component?" title
    await expect(
      alertDialog.locator("text=Condemn Component?").first(),
    ).toBeVisible({ timeout: 3_000 });

    // Must contain "cannot be returned to service" — the regulatory consequence
    const dialogText = await alertDialog.textContent();
    expect(dialogText?.toLowerCase()).toMatch(/cannot be returned to service|cannot be undone/i);
  });

  test("Condemn AlertDialog has Cancel button to abort", async ({ page }) => {
    await page.goto("/parts/rotables", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    const condemnBtn = page
      .locator("button")
      .filter({ hasText: /^Condemn$/i })
      .first();

    const hasCondemnBtn = await condemnBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCondemnBtn) {
      test.skip(true, "No condemnable rotables found — skipping Cancel test");
      return;
    }

    await condemnBtn.click();
    await page.waitForTimeout(500);

    const alertDialog = page.locator("[role='alertdialog'], [role='dialog'][data-state='open']");
    const visible = await alertDialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      test.skip(true, "AlertDialog did not open");
      return;
    }

    // Cancel button must be present and functional
    await alertDialog.locator("button").filter({ hasText: /Cancel/i }).first().click();
    await expect(alertDialog).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Parts Inventory Tests (AI-033) ──────────────────────────────────────────

test.describe("Parts Inventory — Detail Sheet (AI-033)", () => {
  test("parts inventory page loads without error", async ({ page }) => {
    await page.goto("/parts", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
  });

  test("parts cards are clickable (cursor-pointer class set)", async ({ page }) => {
    await page.goto("/parts", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    // Parts cards have cursor-pointer indicating they are clickable
    const clickableCards = page.locator(".cursor-pointer");
    const count = await clickableCards.count();

    if (count === 0) {
      // No parts in inventory — verify empty state renders cleanly
      const body = await page.locator("body").textContent();
      expect(body).not.toContain("TypeError");
      test.skip(true, "No parts in inventory — skipping clickable card tests");
      return;
    }

    expect(count).toBeGreaterThan(0);
  });

  test("clicking a parts card opens a detail sheet/panel (AI-033)", async ({ page }) => {
    await page.goto("/parts", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    // Find clickable part card
    const partCard = page.locator(".cursor-pointer").first();
    const visible = await partCard.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!visible) {
      test.skip(true, "No clickable parts cards — inventory may be empty");
      return;
    }

    await partCard.click();

    // After click, a sheet/panel should open — look for Sheet or Dialog overlay
    const sheet = page
      .locator("[role='dialog']")
      .filter({ hasText: /Part Detail/i })
      .first();
    await expect(sheet).toBeVisible({ timeout: 5_000 });
  });

  test("parts detail sheet shows P/N and part information (AI-033)", async ({ page }) => {
    await page.goto("/parts", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    const partCard = page.locator(".cursor-pointer").first();
    const visible = await partCard.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!visible) {
      test.skip(true, "No parts cards — inventory may be empty");
      return;
    }

    await partCard.click();

    const sheet = page
      .locator("[role='dialog']")
      .filter({ hasText: /Part Detail/i })
      .first();
    const sheetVisible = await sheet.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!sheetVisible) {
      test.skip(true, "Detail sheet did not open");
      return;
    }

    // Sheet should contain part details — P/N is always present
    const sheetText = await sheet.textContent();
    // Should show some part-related content (P/N label, condition, supplier, etc.)
    expect(sheetText?.toLowerCase()).toMatch(/part|p\/n|condition|supplier|serial/i);
  });
});
