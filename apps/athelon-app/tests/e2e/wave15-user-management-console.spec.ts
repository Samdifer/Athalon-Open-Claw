import { expect, test } from "@playwright/test";
import path from "path";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

test.describe("Wave 15 — User Management Console", () => {
  test("settings users page exposes the new admin tabs", async ({ page }) => {
    await page.goto("/settings/users", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: "Users & Access" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: "Accounts" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Profile Mapping" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Access Control" }),
    ).toBeVisible();
  });

  test("personnel page keeps profile management in roster and removes the roles tab", async ({
    page,
  }) => {
    await page.goto("/personnel", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: "Personnel Command" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "New Profile" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roster" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Teams & Shifts" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Holidays" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Analysis" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Roles" }),
    ).toHaveCount(0);
  });
});
