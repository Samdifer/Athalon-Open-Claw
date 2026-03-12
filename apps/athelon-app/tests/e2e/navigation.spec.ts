import { test, expect } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";

test.describe("Navigation", () => {
  test("command palette result navigates to fleet detail", async ({ page }) => {
    await page.goto("/dashboard");
    await ensureClerkAuthenticated(page, "/dashboard");

    const welcomeEnter = page.getByRole("button", { name: /^enter$/i });
    await welcomeEnter.click({ timeout: 5_000 }).catch(() => null);
    await expect(welcomeEnter).toBeHidden({ timeout: 5_000 }).catch(() => null);

    await page.getByRole("button", { name: /open search palette/i }).click();
    const commandInput = page.getByPlaceholder(
      "Search work orders, aircraft, parts...",
    );
    await expect(commandInput).toBeVisible({ timeout: 10_000 });
    await commandInput.fill("Cessna 172S");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/fleet\/N192AK$/);
  });
});
