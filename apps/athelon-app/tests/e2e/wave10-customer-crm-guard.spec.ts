/**
 * wave10-customer-crm-guard.spec.ts
 *
 * WRL-focused guard suite for customer/company CRM intake and tracking.
 * Covers create, duplicate guard, profile update, notes, and active/inactive
 * customer selector behavior in dependent workflow routes.
 */

import { test, expect, type Page } from "@playwright/test";

async function openCustomersPage(page: Page) {
  await page.goto("/billing/customers", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Customers/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function createCustomer(
  page: Page,
  input: { name: string; companyName: string; email: string },
) {
  await openCustomersPage(page);
  await page.getByRole("button", { name: /Add Customer/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await dialog.locator("#cust-name").fill(input.name);
  await dialog.locator("#cust-company").fill(input.companyName);
  await dialog.locator("#cust-email").fill(input.email);
  await dialog.locator("#cust-terms-days").fill("30");
  await dialog.getByRole("button", { name: /^Create Customer$/i }).click();

  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

async function openCustomerDetailFromList(page: Page, customerName: string) {
  const searchInput = page.getByLabel("Search customers");
  await searchInput.fill(customerName);

  const row = page
    .locator("tr")
    .filter({ hasText: customerName })
    .first();
  const card = page
    .locator("div[class*='cursor-pointer']")
    .filter({ hasText: customerName })
    .first();

  const rowVisible = await row.isVisible({ timeout: 5_000 }).catch(() => false);
  if (rowVisible) {
    await row.click();
  } else {
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
  }

  await expect(
    page.getByRole("heading", { name: customerName }).first(),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Customer CRM Guard (WRL)", () => {
  test("create customer, update profile, and append customer note", async ({ page }) => {
    const unique = Date.now();
    const customerName = `WRL CRM ${unique}`;
    const companyName = `WRL Company ${unique}`;
    const email = `wrl.crm.${unique}@example.com`;
    const noteText = `CRM note ${unique}`;

    await createCustomer(page, { name: customerName, companyName, email });
    await openCustomerDetailFromList(page, customerName);

    await page.locator("#detail-phone").fill("+1 555-1212");
    await page.locator("#detail-terms-days").fill("45");
    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.locator("body")).toContainText("Customer updated", {
      timeout: 10_000,
    });

    await page.getByRole("tab", { name: /^Notes$/i }).click();
    await page.getByPlaceholder("Add a note...").fill(noteText);
    await page.getByRole("button", { name: /^Add Note$/i }).click();

    await expect(page.locator("body")).toContainText(noteText, {
      timeout: 10_000,
    });
  });

  test("duplicate customer intake is blocked with deterministic error", async ({ page }) => {
    const unique = Date.now();
    const customerName = `WRL Duplicate ${unique}`;
    const companyName = `WRL Duplicate Co ${unique}`;
    const email = `wrl.dup.${unique}@example.com`;

    await createCustomer(page, { name: customerName, companyName, email });
    await openCustomersPage(page);
    await page.getByRole("button", { name: /Add Customer/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.locator("#cust-name").fill(customerName);
    await dialog.locator("#cust-company").fill(companyName);
    await dialog.locator("#cust-email").fill(email);
    await dialog.getByRole("button", { name: /^Create Customer$/i }).click();

    await expect(page.locator("body")).toContainText("DUPLICATE_CUSTOMER", {
      timeout: 10_000,
    });
    await expect(dialog).toBeVisible();
  });

  test("deactivated customer is excluded from New Work Order customer selector", async ({
    page,
  }) => {
    const unique = Date.now();
    const customerName = `WRL Inactive ${unique}`;
    const companyName = `WRL Inactive Co ${unique}`;
    const email = `wrl.inactive.${unique}@example.com`;

    await createCustomer(page, { name: customerName, companyName, email });

    await page.goto("/work-orders/new", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /New Work Order/i }),
    ).toBeVisible({ timeout: 15_000 });

    const emptyState = page
      .locator("text=No customers yet. Add customers in Billing → Customers.")
      .first();
    const hasNoCustomers = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasNoCustomers) {
      test.skip(true, "No active customers are available in this org.");
      return;
    }

    await page.locator("#customer").click();
    await expect(
      page.locator("[role='option']").filter({ hasText: customerName }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");

    await openCustomersPage(page);
    await openCustomerDetailFromList(page, customerName);
    await page.getByRole("button", { name: /^Deactivate$/i }).click();
    await expect(page.locator("body")).toContainText("Customer deactivated", {
      timeout: 10_000,
    });

    await page.goto("/work-orders/new", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /New Work Order/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.locator("#customer").click();
    await expect(
      page.locator("[role='option']").filter({ hasText: customerName }),
    ).toHaveCount(0);
  });
});

