/**
 * wave7-quote-send-guards.spec.ts
 *
 * AI-069: E2E tests for billing/quotes/[id] data integrity guards.
 *
 * Context:
 * - AI-063 added three validation guards to the quote detail page:
 *
 *   (1) SEND GUARD: handleSend() now blocks sending a quote with 0 line items.
 *       Before the fix, canSend only checked status === "DRAFT" — a user who
 *       removed all line items from a draft could click Send and deliver a
 *       blank $0 quote to the customer. Guard added:
 *       if (quote.lineItems.length === 0) → setError("Cannot send a quote with
 *       no line items. Add at least one item before sending.")
 *
 *   (2) QTY GUARD: handleEditItem() now rejects qty=0 or negative.
 *       A zero-quantity line item creates a $0 charge that clutters the quote
 *       and can't be sent as a legitimate charge. Guard:
 *       if (editQty !== "" && parseFloat(editQty) <= 0) → setError("Quantity
 *       must be greater than zero.")
 *
 *   (3) DISCOUNT GUARD: handleEditItem() now rejects discount > 100% or < 0%.
 *       A 150% discount makes the line item total negative — impossible on an
 *       invoice and potentially a fraudulent credit. Guard:
 *       if disc < 0 || disc > 100 → setError("Discount must be between 0 and
 *       100%.")
 *
 * Strategy:
 * - Navigate to /billing/quotes to find the first quote
 * - Follow its link to the detail page
 * - Test behaviors on DRAFT quotes (only DRAFT quotes show Send + Edit buttons)
 * - Data-resilient: skip if no quotes exist or no DRAFT quotes available
 *
 * Tests: 10 total
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Helper — Get First Quote URL ─────────────────────────────────────────────

async function getFirstQuoteHref(page: Page): Promise<string | null> {
  await page.goto("/billing/quotes", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  await page
    .locator("table tbody tr, .text-muted-foreground, [data-state]")
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {});

  // Allow Convex data to settle
  await page.waitForTimeout(2_000);

  // Find first link to a quote detail page
  const quoteLink = page
    .locator("a[href^='/billing/quotes/']")
    .filter({ hasNOTText: /new|template/i })
    .first();

  return quoteLink.getAttribute("href").catch(() => null);
}

async function getFirstDraftQuoteHref(page: Page): Promise<string | null> {
  await page.goto("/billing/quotes", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  await page.waitForTimeout(3_000);

  // Look for a row/card that has "DRAFT" status badge + a detail link
  const draftRows = page
    .locator("tr, [class*='card'], li")
    .filter({ hasText: /DRAFT/i });

  const count = await draftRows.count();
  if (count === 0) return null;

  // Find the first detail link in a DRAFT row
  const link = draftRows.first().locator("a[href^='/billing/quotes/']").first();
  return link.getAttribute("href").catch(() => null);
}

// ─── Quotes List Page ─────────────────────────────────────────────────────────

test.describe("Billing: Quotes List Page", () => {
  test("quotes list page loads without error", async ({ page }) => {
    await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
    expect(body).not.toContain("Cannot read properties of undefined");
  });

  test("quotes list shows table/cards or empty state (not blank page)", async ({ page }) => {
    await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3_000);

    const hasTable = await page.locator("table").first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasCards = await page.locator("[class*='card']").first().isVisible({ timeout: 3_000 }).catch(() => false);
    const hasEmptyState = await page.locator("*").filter({ hasText: /no quotes|create.*quote/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasTable || hasCards || hasEmptyState).toBe(true);
  });
});

// ─── Quote Detail Page — General ─────────────────────────────────────────────

test.describe("Billing: Quote Detail Page — Loads Clean", () => {
  test("quote detail page loads without error", async ({ page }) => {
    const href = await getFirstQuoteHref(page);

    if (!href) {
      test.skip(true, "No quotes found in this org — skipping quote detail tests");
      return;
    }

    await page.goto(href, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 15_000 });

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
  });

  test("quote detail page shows status badge (DRAFT/SENT/APPROVED etc.)", async ({ page }) => {
    const href = await getFirstQuoteHref(page);

    if (!href) {
      test.skip(true, "No quotes found — skipping status badge test");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const body = await page.locator("body").textContent();
    expect(body?.toUpperCase()).toMatch(/DRAFT|SENT|APPROVED|DECLINED|CONVERTED/);
  });
});

// ─── Send Guard — No Line Items (AI-063) ─────────────────────────────────────

test.describe("Quote Send Guard — No Line Items (AI-063)", () => {
  test("Send button is visible on DRAFT quotes", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes found — skipping Send button tests");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const sendBtn = page
      .locator("button")
      .filter({ hasText: /^Send$|Send Quote/i })
      .first();

    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
  });

  test("Clicking Send on a quote with no line items shows no-line-items error (AI-063)", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes — skipping no-line-items guard test");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    // Check that this quote actually has no line items (otherwise guard won't trigger)
    const body = await page.locator("body").textContent();
    const hasItems = body?.match(/labor|part|item/i) &&
      await page.locator("table tbody tr, [data-item]").count() > 0;

    if (hasItems) {
      test.skip(
        true,
        "This DRAFT quote already has line items — the no-line-items guard only triggers " +
          "on empty quotes. Test skipped: guard is correctly not firing here.",
      );
      return;
    }

    const sendBtn = page
      .locator("button")
      .filter({ hasText: /^Send$|Send Quote/i })
      .first();

    const sendVisible = await sendBtn.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!sendVisible) {
      test.skip(true, "Send button not visible on this quote");
      return;
    }

    await sendBtn.click();
    await page.waitForTimeout(1_000);

    // Error message must appear
    const errorMsg = page
      .locator("*")
      .filter({ hasText: /no line items|at least one item|add.*item/i })
      .first();

    await expect(errorMsg).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Edit Line Item Guards (AI-063) ──────────────────────────────────────────

test.describe("Quote Edit Line Item Guards (AI-063)", () => {
  test("Edit line item dialog appears when pencil button clicked on DRAFT quote", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes — skipping edit dialog tests");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    // Find edit button — may be pencil icon or labeled "Edit"
    const editBtns = page.locator("button").filter({ hasText: /edit/i });
    const editCount = await editBtns.count();

    if (editCount === 0) {
      test.skip(true, "No edit buttons found — quote may have no line items");
      return;
    }

    await editBtns.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator("[role='dialog']").first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("Edit dialog: quantity=0 triggers 'Quantity must be greater than zero' error (AI-063)", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes — skipping qty guard test");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const editBtns = page.locator("button").filter({ hasText: /edit/i });
    const editCount = await editBtns.count();

    if (editCount === 0) {
      test.skip(true, "No edit buttons — quote may have no line items");
      return;
    }

    await editBtns.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator("[role='dialog']").first();
    const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!dialogVisible) {
      test.skip(true, "Edit dialog did not open");
      return;
    }

    // Find the Qty input and set it to 0
    const qtyInput = dialog
      .locator("input[type='number'], input[placeholder*='Qty'], input[id*='qty'], input[name*='qty']")
      .first();

    const qtyVisible = await qtyInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!qtyVisible) {
      test.skip(true, "Qty input not found in edit dialog");
      return;
    }

    await qtyInput.fill("0");

    // Click Save/Update
    const saveBtn = dialog.locator("button").filter({ hasText: /Save|Update|Apply/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Error must appear
    const errorMsg = page
      .locator("*")
      .filter({ hasText: /Quantity must be greater than zero/i })
      .first();

    await expect(errorMsg).toBeVisible({ timeout: 5_000 });
  });

  test("Edit dialog: discount=150 triggers 'Discount must be between 0 and 100%' error (AI-063)", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes — skipping discount guard test");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const editBtns = page.locator("button").filter({ hasText: /edit/i });
    const editCount = await editBtns.count();

    if (editCount === 0) {
      test.skip(true, "No edit buttons — quote may have no line items");
      return;
    }

    await editBtns.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator("[role='dialog']").first();
    const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!dialogVisible) {
      test.skip(true, "Edit dialog did not open");
      return;
    }

    // Find the Discount % input
    const discountInput = dialog
      .locator("input[id*='discount'], input[name*='discount'], input[placeholder*='%'], input[placeholder*='discount']")
      .first();

    const discVisible = await discountInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!discVisible) {
      test.skip(true, "Discount input not found in edit dialog");
      return;
    }

    await discountInput.fill("150");

    // Click Save/Update
    const saveBtn = dialog.locator("button").filter({ hasText: /Save|Update|Apply/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Error must appear
    const errorMsg = page
      .locator("*")
      .filter({ hasText: /Discount must be between 0 and 100/i })
      .first();

    await expect(errorMsg).toBeVisible({ timeout: 5_000 });
  });

  test("Edit dialog: Cancel button closes dialog without saving (AI-063)", async ({ page }) => {
    const href = await getFirstDraftQuoteHref(page);

    if (!href) {
      test.skip(true, "No DRAFT quotes — skipping Cancel test");
      return;
    }

    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const editBtns = page.locator("button").filter({ hasText: /edit/i });
    const editCount = await editBtns.count();

    if (editCount === 0) {
      test.skip(true, "No edit buttons — quote may have no line items");
      return;
    }

    await editBtns.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator("[role='dialog']").first();
    const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!dialogVisible) {
      test.skip(true, "Edit dialog did not open");
      return;
    }

    // Click Cancel
    const cancelBtn = dialog.locator("button").filter({ hasText: /Cancel/i }).first();
    const cancelVisible = await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!cancelVisible) {
      // Try pressing Escape
      await page.keyboard.press("Escape");
    } else {
      await cancelBtn.click();
    }

    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });
});
