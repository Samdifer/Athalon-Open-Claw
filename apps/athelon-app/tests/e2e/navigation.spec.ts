import { test, expect } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";

test.describe("Navigation", () => {
  test("command palette result navigates to fleet detail", async ({ page }) => {
    await page.goto("/dashboard");
    await ensureClerkAuthenticated(page, "/dashboard");

    await page.getByRole("button", { name: /open search palette/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("option", { name: "N192AK Cessna 172S" }).click();
    await expect(page).toHaveURL(/\/fleet\/N192AK$/);
  });
});
