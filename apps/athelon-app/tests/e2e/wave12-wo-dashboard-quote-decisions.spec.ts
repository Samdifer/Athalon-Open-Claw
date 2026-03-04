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

test.describe("Wave 12 — WO Dashboard + Quote Line Decisions", () => {
  test("work order dashboard route renders KPI surfaces", async ({ page }) => {
    await page.goto("/work-orders/dashboard");
    await ensureClerkAuthenticated(page, "/work-orders/dashboard");
    await waitForLoad(page);

    await expect(
      page.getByRole("heading", { name: /Work Order Dashboard/i }),
    ).toBeVisible();

    await expect(page.getByText(/Active Work Orders/i).first()).toBeVisible();
    await expect(page.getByText(/Portfolio WIP/i).first()).toBeVisible();
  });

  test("quote detail exposes line-item category + customer decision columns", async ({ page }) => {
    await page.goto("/billing/quotes");
    await ensureClerkAuthenticated(page, "/billing/quotes");
    await waitForLoad(page);

    const quoteLinks = page.locator('a[href^="/billing/quotes/"]');
    const linkCount = await quoteLinks.count();
    let chosenLinkIndex = -1;
    for (let i = 0; i < linkCount; i += 1) {
      const href = await quoteLinks.nth(i).getAttribute("href");
      if (href && !href.endsWith("/new")) {
        chosenLinkIndex = i;
        break;
      }
    }
    if (chosenLinkIndex < 0) {
      test.skip(true, "No quote records available in seeded org.");
    }
    await quoteLinks.nth(chosenLinkIndex).click();
    await waitForLoad(page);

    const emptyLineItems = await page
      .getByText(/No line items on this quote/i)
      .isVisible()
      .catch(() => false);
    if (emptyLineItems) {
      test.skip(true, "Selected quote has no line items.");
    }

    await expect(page.getByRole("columnheader", { name: /Category/i })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Customer Decision/i }),
    ).toBeVisible();
  });
});
