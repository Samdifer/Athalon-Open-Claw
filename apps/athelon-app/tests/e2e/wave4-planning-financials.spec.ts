import { test, expect } from "@playwright/test";

test.describe("Planning Financials", () => {
  test("financial planning page loads", async ({ page }) => {
    await page.goto("/scheduling/financial-planning", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: "Planning Financials" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByRole("button", { name: "Save Assumptions" }),
    ).toBeVisible({ timeout: 15_000 });
  });
});

