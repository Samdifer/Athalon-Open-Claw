import { test, expect } from "@playwright/test";
import path from "path";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

test.describe("Wave 8: Quote conversion regression", () => {
  test("converted quote remains discoverable in billing and carries CONVERTED status", async ({
    page,
  }) => {
    await page.goto("/billing/quotes", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const search = page.getByLabel("Search quotes by number");
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.fill("E2E-Q-CONV-001");

    const row = page
      .getByRole("link", {
        name: /Quote E2E-Q-CONV-001/i,
      })
      .first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText("CONVERTED");
    await row.click();

    await expect(page.getByRole("heading", { name: "E2E-Q-CONV-001" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("CONVERTED").first()).toBeVisible();
  });
});

