import { test, expect } from "@playwright/test";
import path from "path";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

test.describe("Wave 8: Quote labor kit user stories", () => {
  test("estimator can pull seeded labor kit lines into new quote builder", async ({
    page,
  }) => {
    await page.goto("/billing/quotes/new", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await expect(page.getByRole("heading", { name: "New Quote" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Labor Kits").first()).toBeVisible({
      timeout: 15_000,
    });

    const search = page.getByPlaceholder(
      "Search kits by name, ATA chapter, or aircraft type",
    );
    await search.fill("E2E-KIT-QUOTE-001");

    const addKitButton = page.getByRole("button", { name: "Add Kit Lines" }).first();
    await expect(addKitButton).toBeVisible({ timeout: 15_000 });
    await addKitButton.click();

    await expect(
      page.locator('input[value*="E2E-KIT-QUOTE-001"]').first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("service writer can apply labor kit + add manual line on seeded draft quote", async ({
    page,
  }) => {
    await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const search = page.getByLabel("Search quotes by number");
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.fill("E2E-Q-DRAFT-001");

    const row = page
      .getByRole("link", {
        name: /Quote E2E-Q-DRAFT-001/i,
      })
      .first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();

    await expect(page.getByRole("heading", { name: "E2E-Q-DRAFT-001" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("DRAFT").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("quote-draft-composer")).toBeVisible({
      timeout: 15_000,
    });

    const lineItemRows = page.locator("table tbody tr");
    const initialCount = await lineItemRows.count();

    const draftKitPanel = page.getByTestId("draft-labor-kit-panel");
    const kitRow = draftKitPanel.locator("div", { hasText: "E2E-KIT-QUOTE-001" }).first();
    await expect(kitRow).toBeVisible({ timeout: 15_000 });
    await kitRow.getByRole("button", { name: "Apply" }).click();

    await expect(lineItemRows).toHaveCount(initialCount + 4, { timeout: 20_000 });

    const draftComposer = page.getByTestId("quote-draft-composer");
    const manualDescription = `E2E manual line ${Date.now()}`;
    await draftComposer
      .getByPlaceholder("Describe labor, parts, or external service...")
      .fill(manualDescription);
    await draftComposer.locator('input[type="number"]').first().fill("1");
    await draftComposer.locator('input[type="number"]').nth(1).fill("275");
    await draftComposer.getByRole("button", { name: "Add Line" }).click();

    await expect(lineItemRows).toHaveCount(initialCount + 5, { timeout: 20_000 });
    await expect(page.getByText(manualDescription)).toBeVisible({ timeout: 15_000 });
  });
});
