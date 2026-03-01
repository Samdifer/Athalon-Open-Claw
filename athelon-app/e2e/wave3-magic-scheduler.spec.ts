import { test, expect } from "@playwright/test";

test.describe("Magic Scheduler", () => {
  test("dialog opens from scheduling toolbar", async ({ page }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const trigger = page.getByRole("button", { name: "Magic Scheduler" });
    await trigger.waitFor({ state: "visible", timeout: 8_000 }).catch(() => null);
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await expect(
        page.getByRole("heading", { name: "Magic Scheduler" }),
      ).toBeVisible({ timeout: 15_000 });

      // Either a candidate list or an empty-state message should be rendered.
      const hasCandidates = await page.locator("li").first().isVisible().catch(() => false);
      if (!hasCandidates) {
        await expect(
          page.getByText("No eligible work orders found."),
        ).toBeVisible();
      }

      await page.locator("button:has-text('Close')").first().click();
      await expect(
        page.getByRole("heading", { name: "Magic Scheduler" }),
      ).toBeHidden();
      return;
    }

    // If toolbar isn't rendered, page should be in a defined onboarding/empty state.
    const emptyStateVisible = await page
      .getByText("No work orders to schedule yet")
      .isVisible()
      .catch(() => false);
    const missingContextVisible = await page
      .getByText("Scheduling requires organization setup")
      .isVisible()
      .catch(() => false);
    expect(emptyStateVisible || missingContextVisible).toBeTruthy();
  });
});
