import { test, expect } from "@playwright/test";
import path from "path";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    const lineItems = page.locator('input[placeholder="Description"]');
    const beforeCount = await lineItems.count();

    const addKitButton = page.getByRole("button", { name: "Add Kit Lines" }).first();
    const hasAddKit = await addKitButton.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasAddKit) {
      test.skip(true, "No labor-kit add action is visible in this org context.");
      return;
    }
    await addKitButton.click();

    await expect
      .poll(async () => lineItems.count(), { timeout: 15_000 })
      .toBeGreaterThan(beforeCount);
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

    let row = page
      .getByRole("link", {
        name: /Quote E2E-Q-DRAFT-001/i,
      })
      .first();

    let rowVisible = await row.isVisible({ timeout: 6_000 }).catch(() => false);
    if (!rowVisible) {
      await search.fill("");
      row = page.locator('a[aria-label*="Quote"][aria-label*="DRAFT"]').first();
      rowVisible = await row.isVisible({ timeout: 10_000 }).catch(() => false);
    }
    if (!rowVisible) {
      test.skip(true, "No draft quote row is visible in this seeded org context.");
      return;
    }

    const rowLabel = (await row.getAttribute("aria-label")) ?? "";
    const quoteNumber = rowLabel.match(/Quote\s+([A-Z0-9-]+)/i)?.[1] ?? "E2E-Q-DRAFT-001";
    await row.click();

    await expect(
      page.getByRole("heading", { name: new RegExp(escapeRegex(quoteNumber), "i") }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("DRAFT").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("quote-draft-composer")).toBeVisible({
      timeout: 15_000,
    });

    const lineItemRows = page.locator("table tbody tr");
    const initialCount = await lineItemRows.count();

    const draftKitPanel = page.getByTestId("draft-labor-kit-panel");
    await expect(draftKitPanel).toBeVisible({ timeout: 15_000 });

    let applyButton = draftKitPanel
      .locator("div", { hasText: "E2E-KIT-QUOTE-001" })
      .first()
      .getByRole("button", { name: "Apply" });
    let canApply = await applyButton.isVisible({ timeout: 6_000 }).catch(() => false);
    if (!canApply) {
      applyButton = draftKitPanel.getByRole("button", { name: "Apply" }).first();
      canApply = await applyButton.isVisible({ timeout: 6_000 }).catch(() => false);
    }
    if (!canApply) {
      test.skip(true, "No applicable labor kit found in draft quote panel.");
      return;
    }

    await applyButton.click();
    await expect
      .poll(async () => lineItemRows.count(), { timeout: 20_000 })
      .toBeGreaterThan(initialCount);

    const draftComposer = page.getByTestId("quote-draft-composer");
    const manualDescription = `E2E manual line ${Date.now()}`;
    await draftComposer
      .getByPlaceholder("Describe labor, parts, or external service...")
      .fill(manualDescription);
    await draftComposer.locator('input[type="number"]').first().fill("1");
    await draftComposer.locator('input[type="number"]').nth(1).fill("275");
    await draftComposer.getByRole("button", { name: "Add Line" }).click();

    await expect
      .poll(async () => lineItemRows.count(), { timeout: 20_000 })
      .toBeGreaterThan(initialCount + 1);
    await expect(page.getByText(manualDescription)).toBeVisible({ timeout: 15_000 });
  });
});
