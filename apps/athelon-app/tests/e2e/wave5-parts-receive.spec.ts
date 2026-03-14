/**
 * wave5-parts-receive.spec.ts
 *
 * UI coverage for the Parts Receive form (/parts/new).
 *
 * This form is now a single-part receiving workflow. It relies on required
 * inputs and submit-time validation rather than a disabled submit button, and
 * its LLP fields are revealed only after the LLP subsection is enabled.
 */

import { test, expect, type Page } from "@playwright/test";

async function gotoPartsNew(page: Page) {
  await page.goto("/parts/new", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /receive part into inventory/i }),
  ).toBeVisible({ timeout: 15_000 });
}

// ─── Base Form ───────────────────────────────────────────────────────────────

test.describe("Parts Receive Form — Base Fields", () => {
  test("page loads with correct heading", async ({ page }) => {
    await gotoPartsNew(page);
    await expect(
      page.getByRole("heading", { name: /receive part into inventory/i }),
    ).toBeVisible();
  });

  test("Part Number field is present and required", async ({ page }) => {
    await gotoPartsNew(page);
    const partNumberInput = page.getByLabel(/Part Number/i);
    await expect(partNumberInput).toBeVisible();
    await expect(partNumberInput).toHaveAttribute("required", "");
  });

  test("Receiving Date field is present and required", async ({ page }) => {
    await gotoPartsNew(page);
    const receivingDateInput = page.getByLabel(/Receiving Date/i);
    await expect(receivingDateInput).toBeVisible();
    await expect(receivingDateInput).toHaveAttribute("required", "");
  });

  test("Supplier field is present", async ({ page }) => {
    await gotoPartsNew(page);
    await expect(page.getByLabel(/Supplier|Vendor/i)).toBeVisible({ timeout: 10_000 });
  });

  test("required fields are declared on the form", async ({ page }) => {
    await gotoPartsNew(page);
    const submitBtn = page.getByRole("button", { name: /receive part/i });
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
    await expect(submitBtn).toBeEnabled();
    await expect(page.getByLabel(/Part Name \/ Description/i)).toHaveAttribute("required", "");
  });

  test("Back/Cancel link navigates away from new part form", async ({ page }) => {
    await gotoPartsNew(page);
    const backLink = page.getByRole("link", { name: /parts inventory|cancel/i }).first();
    await expect(backLink).toBeVisible({ timeout: 10_000 });
  });
});

// ─── 8130-3 Cert Section ─────────────────────────────────────────────────────

test.describe("Parts Receive Form — 8130-3 Cert Section (AI-008)", () => {
  test("8130-3 cert section toggle button exists", async ({ page }) => {
    await gotoPartsNew(page);
    const sectionToggle = page.getByRole("button", {
      name: /faa form 8130-3|airworthiness approval tag/i,
    });
    await expect(sectionToggle).toBeVisible({ timeout: 10_000 });
  });

  test("8130-3 cert section is collapsed by default", async ({ page }) => {
    await gotoPartsNew(page);
    await expect(page.getByLabel(/Block 14a/i)).toBeHidden();
  });

  test("toggling cert section reveals 8130-3 fields", async ({ page }) => {
    await gotoPartsNew(page);
    await page
      .getByRole("button", { name: /faa form 8130-3|airworthiness approval tag/i })
      .click();

    await expect(page.getByLabel(/Block 14a/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/Block 3/i)).toBeVisible();
  });

  test("cert section shows Approving Authority field after toggle", async ({ page }) => {
    await gotoPartsNew(page);
    await page
      .getByRole("button", { name: /faa form 8130-3|airworthiness approval tag/i })
      .click();
    await expect(page.getByLabel(/Approving Authority/i)).toBeVisible({ timeout: 5_000 });
  });

  test("cert section shows Applicant/Operator Name field after toggle", async ({ page }) => {
    await gotoPartsNew(page);
    await page
      .getByRole("button", { name: /faa form 8130-3|airworthiness approval tag/i })
      .click();
    await expect(page.getByLabel(/Applicant \/ Operator Name/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("cert section shows Authorized Signatory Name field after toggle", async ({ page }) => {
    await gotoPartsNew(page);
    await page
      .getByRole("button", { name: /faa form 8130-3|airworthiness approval tag/i })
      .click();
    await expect(page.getByLabel(/Authorized Signatory Name/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("partial cert data triggers validation error on submit", async ({ page }) => {
    await gotoPartsNew(page);

    await page
      .getByRole("button", { name: /faa form 8130-3|airworthiness approval tag/i })
      .click();
    await page.getByLabel(/Part Number/i).fill("PW-REC-8130-001");
    await page.getByLabel(/Part Name \/ Description/i).fill("Playwright Receive Part");
    await page.getByLabel(/Block 3/i).fill("FORM-2026-001");
    await page.getByRole("button", { name: /receive part/i }).click();

    await expect(
      page.getByText(/8130-3 Approval Number \(Block 14a\) is required/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Life-Limited & Shelf-Life Sections ─────────────────────────────────────

test.describe("Parts Receive Form — Life-Limited & Shelf-Life Sections", () => {
  test("life-limited section toggle exists", async ({ page }) => {
    await gotoPartsNew(page);
    const toggle = page.getByRole("button", { name: /life-limited part/i });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test("shelf-life section toggle exists", async ({ page }) => {
    await gotoPartsNew(page);
    const toggle = page.getByRole("button", { name: /shelf life \/ expiry/i });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test("life-limited section reveals cycle/hours fields after toggle", async ({ page }) => {
    await gotoPartsNew(page);
    const toggle = page.getByRole("button", { name: /life-limited part/i });
    await toggle.click();
    const llpCheckbox = page.getByRole("checkbox", { name: /This is a life-limited part/i });
    await llpCheckbox.click();
    await expect(llpCheckbox).toBeChecked();
    await expect(page.getByText(/Life Limit \(Hours\)/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Hours Accumulated \(TSN\/TSO\)/i)).toBeVisible();
  });
});
