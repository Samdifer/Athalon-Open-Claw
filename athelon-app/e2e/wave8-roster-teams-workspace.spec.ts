import { test, expect } from "@playwright/test";
import path from "path";
import { execSync } from "child_process";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);
const APP_ROOT = path.resolve(__dirname, "..");

test.use({ storageState: SEEDED_AUTH_FILE });

async function normalizeLocationSelection(
  page: import("@playwright/test").Page,
) {
  await page.evaluate(() => {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith("athelon:selected-location:")) {
        window.localStorage.setItem(key, "all");
      }
    }
  });
}

async function openRosterWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/scheduling/roster", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await normalizeLocationSelection(page);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("roster-workspace-page")).toBeVisible({ timeout: 20_000 });

  const enableButton = page.getByRole("button", { name: "Enable Workspace" });
  if (await enableButton.isVisible().catch(() => false)) {
    await enableButton.click();
  }

  await expect(page.getByTestId("roster-workspace")).toBeVisible({ timeout: 20_000 });
}

function formatDateKeyFromOffset(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test.describe("Wave 8: Roster & teams workspace", () => {
  test.beforeAll(() => {
    execSync("npm run seed:e2e:scheduler-stories", {
      cwd: APP_ROOT,
      stdio: "pipe",
      env: process.env,
    });
  });

  test("workspace route renders command tabs", async ({ page }) => {
    await openRosterWorkspace(page);

    await expect(page.getByRole("tab", { name: "Roster" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Teams" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Shifts" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Holidays" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Analysis" })).toBeVisible();
  });

  test("team CRUD works for seeded roster workspace", async ({ page }) => {
    await openRosterWorkspace(page);
    await page.getByRole("tab", { name: "Teams" }).click();

    const teamName = `E2E Team ${Date.now()}`;
    await page.getByTestId("roster-team-name-input").fill(teamName);
    await page.getByTestId("roster-team-create-button").click();
    await expect(page.getByText("Roster team created")).toBeVisible({ timeout: 15_000 });

    const teamRow = page
      .locator('[data-testid^="roster-team-row-"]')
      .filter({ hasText: teamName })
      .first();
    await expect(teamRow).toBeVisible({ timeout: 15_000 });
    await teamRow.getByRole("button", { name: "Delete" }).click();
    await expect(teamRow).toBeHidden({ timeout: 15_000 });
  });

  test("shift CRUD works for seeded roster workspace", async ({ page }) => {
    await openRosterWorkspace(page);
    await page.getByRole("tab", { name: "Shifts" }).click();

    const shiftName = `E2E Shift ${Date.now()}`;
    await page.getByTestId("roster-shift-name-input").fill(shiftName);
    await page.getByTestId("roster-shift-create-button").click();
    await expect(page.getByText("Shift created")).toBeVisible({ timeout: 15_000 });

    const shiftRow = page
      .locator('[data-testid^="roster-shift-row-"]')
      .filter({ hasText: shiftName })
      .first();
    await expect(shiftRow).toBeVisible({ timeout: 15_000 });
    await shiftRow.getByRole("button", { name: "Delete" }).click();
    await expect(shiftRow).toBeHidden({ timeout: 15_000 });
  });

  test("holiday CRUD works for seeded roster workspace", async ({ page }) => {
    await openRosterWorkspace(page);
    await page.getByRole("tab", { name: "Holidays" }).click();

    const holidayName = `E2E Holiday ${Date.now()}`;
    await page
      .getByTestId("roster-holiday-date-input")
      .fill(formatDateKeyFromOffset(35 + Math.floor(Math.random() * 50)));
    await page.getByTestId("roster-holiday-name-input").fill(holidayName);
    await page.getByTestId("roster-holiday-create-button").click();

    const holidayRow = page
      .locator('[data-testid^="roster-holiday-row-"]')
      .filter({ hasText: holidayName })
      .first();
    await expect(holidayRow).toBeVisible({ timeout: 15_000 });
    await holidayRow.getByRole("button", { name: "Delete" }).click();
    await expect(holidayRow).toBeHidden({ timeout: 15_000 });
  });

  test("scheduler board popout renders full roster workspace", async ({ page }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await normalizeLocationSelection(page);
    await page.reload({ waitUntil: "domcontentloaded" });

    await page.getByTestId("toggle-roster-panel").click();
    await expect(page.getByTestId("roster-panel")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Pop out roster" }).click();
    await expect(page.getByTestId("roster-workspace")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Stow Tray" }).click();
  });
});
