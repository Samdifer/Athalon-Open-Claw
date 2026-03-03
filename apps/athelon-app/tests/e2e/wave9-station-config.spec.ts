import { expect, test } from "@playwright/test";

function isoDateFromToday(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test.describe("Station Config", () => {
  test("persists facilities, aircraft, stages, and scheduling overlays", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const locationName = `E2E Station ${suffix}`;
    const locationCode = `E2E${suffix.slice(-3)}`;
    const bayOne = `E2E Bay A ${suffix}`;
    const bayTwo = `E2E Bay B ${suffix}`;
    const aircraftMake = `E2E Make ${suffix}`;
    const aircraftModel = `E2E Model ${suffix}`;
    const stageLabel = `E2E Intake ${suffix}`;
    const cursorLabel = `E2E Cursor ${suffix}`;

    await page.goto("/settings/station-config", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await expect(
      page.getByRole("heading", { name: "Station Configuration" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Add Location" }).click();
    await page.getByPlaceholder("Main Hangar").fill(locationName);
    await page.getByPlaceholder("MH01").fill(locationCode);
    await page.getByRole("button", { name: "Create Location" }).click();

    await expect(page.getByText(locationName)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add Bay" }).first().click();
    const firstBayDialog = page.getByRole("dialog").filter({ hasText: "Add Bay" });
    await expect(firstBayDialog).toBeVisible({ timeout: 10_000 });
    await firstBayDialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: locationName }).click();
    await firstBayDialog.getByPlaceholder("Bay 1").fill(bayOne);
    await firstBayDialog.getByRole("button", { name: "Add Bay" }).click();
    await expect(page.getByText(bayOne)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add Bay" }).first().click();
    const secondBayDialog = page.getByRole("dialog").filter({ hasText: "Add Bay" });
    await expect(secondBayDialog).toBeVisible({ timeout: 10_000 });
    await secondBayDialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: locationName }).click();
    await secondBayDialog.getByPlaceholder("Bay 1").fill(bayTwo);
    await secondBayDialog.getByRole("button", { name: "Add Bay" }).click();
    await expect(page.getByText(bayTwo)).toBeVisible({ timeout: 15_000 });

    const bayTwoTile = page.locator(`text=${bayTwo}`).first();
    const bayOneTile = page.locator(`text=${bayOne}`).first();
    if ((await bayTwoTile.count()) > 0 && (await bayOneTile.count()) > 0) {
      await bayTwoTile.dragTo(bayOneTile);
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(locationName)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(bayOne)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(bayTwo)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Supported Aircraft" }).click();

    const locationSelect = page.locator("label", { hasText: "Location" }).locator("..")
      .getByRole("combobox")
      .first();
    await locationSelect.click();
    await page.getByRole("option", { name: locationName }).click();

    await page.getByRole("button", { name: "Add Manually" }).click();
    await page.getByPlaceholder("e.g. Cessna").fill(aircraftMake);
    await page.getByPlaceholder("e.g. 172").fill(aircraftModel);
    await page.getByRole("button", { name: "Add Aircraft Type" }).click();
    await expect(
      page.getByText(`${aircraftMake} ${aircraftModel}`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Supported Aircraft" }).click();
    await locationSelect.click();
    await page.getByRole("option", { name: locationName }).click();
    await expect(
      page.getByText(`${aircraftMake} ${aircraftModel}`, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const aircraftRow = page.locator("tr").filter({ hasText: `${aircraftMake} ${aircraftModel}` }).first();
    if ((await aircraftRow.count()) > 0) {
      await aircraftRow.getByRole("button").click();
      await expect(page.getByText(`${aircraftMake} ${aircraftModel}`)).not.toBeVisible({ timeout: 15_000 });
    }

    await page.getByRole("tab", { name: "Work Stages" }).click();
    const stageInput = page.getByPlaceholder("Stage name").first();
    await stageInput.fill(stageLabel);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Work stages saved")).toBeVisible({ timeout: 15_000 });

    await page.goto("/work-orders", { waitUntil: "domcontentloaded", timeout: 45_000 });
    const firstWorkOrderLink = page
      .locator('a[href^="/work-orders/"]')
      .filter({ hasText: /WO-/ })
      .first();
    if ((await firstWorkOrderLink.count()) > 0) {
      await firstWorkOrderLink.click();
      await expect(page.getByText(stageLabel)).toBeVisible({ timeout: 20_000 });
    }

    await page.goto("/settings/station-config", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByRole("tab", { name: "Scheduling" }).click();

    await page.getByRole("button", { name: "Add Holiday" }).click();
    const holidayRows = page.locator('input[type="date"]');
    const holidayIndex = (await holidayRows.count()) - 1;
    await holidayRows.nth(holidayIndex).fill(isoDateFromToday(3));
    await page.locator('input[placeholder="Holiday name"]').nth(holidayIndex).fill(`E2E Holiday ${suffix}`);

    await page.getByRole("button", { name: "Add Cursor" }).click();
    const cursorLabelInputs = page.locator('input[placeholder="Cursor label"]');
    const cursorInputIndex = (await cursorLabelInputs.count()) - 1;
    await cursorLabelInputs.nth(cursorInputIndex).fill(cursorLabel);

    await page.getByRole("button", { name: "Save Preferences" }).click();
    await expect(page.getByText("Scheduling preferences saved")).toBeVisible({ timeout: 20_000 });

    await page.goto("/scheduling/capacity", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.getByTestId("capacity-forecaster-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".pattern-diagonal-lines").first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/scheduling", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.getByTestId("daily-pnl-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".pattern-diagonal-lines").first()).toBeVisible({ timeout: 20_000 });
  });
});
