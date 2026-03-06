import { expect, test } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";

async function waitForLoad(page: import("@playwright/test").Page) {
  await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .first()
    .waitFor({ state: "hidden", timeout: 12_000 })
    .catch(() => null);
  await page.waitForTimeout(300);
}

test.describe("Wave 13 — Lead Workspace + Turnover", () => {
  test("lead workspace route renders assignment and turnover sections", async ({ page }) => {
    await page.goto("/work-orders/lead");
    await ensureClerkAuthenticated(page, "/work-orders/lead");
    await waitForLoad(page);

    const accessDenied = await page
      .getByText(/Lead Workspace Access Required/i)
      .isVisible()
      .catch(() => false);
    if (accessDenied) {
      test.skip(true, "Authenticated role does not have lead workspace access.");
    }

    await expect(
      page.getByRole("heading", { name: /Lead Workspace/i }),
    ).toBeVisible();
    await expect(page.getByText(/Work Order Ownership/i).first()).toBeVisible();
    await page.getByRole("tab", { name: /Turnover Report/i }).click();
    await expect(page.getByTestId("turnover-editor")).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit/i })).toBeVisible();
  });

  test("work orders list exposes lead workspace quick link", async ({ page }) => {
    await page.goto("/work-orders");
    await ensureClerkAuthenticated(page, "/work-orders");
    await waitForLoad(page);

    await expect(page.getByRole("link", { name: /^Lead$/i })).toBeVisible();
  });
});
