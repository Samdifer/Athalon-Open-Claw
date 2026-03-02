import { test, expect, type Locator, type Page } from "@playwright/test";

const ROUTE = "/billing/time-clock";

async function openTimeClockPage(page: Page) {
  await page.goto(ROUTE, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Time Clock/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function openClockInDialog(page: Page): Promise<Locator> {
  await openTimeClockPage(page);
  await page.getByRole("button", { name: /^Clock In$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe("Time Clock Page — UI Structure (AI-061)", () => {
  test("time clock page loads without runtime errors", async ({ page }) => {
    await openTimeClockPage(page);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
    expect(body).not.toContain("Cannot read properties of undefined");
  });

  test("Clock In button is present in the page header", async ({ page }) => {
    await openTimeClockPage(page);
    await expect(page.getByRole("button", { name: /^Clock In$/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Search technician input is visible and writable", async ({ page }) => {
    await openTimeClockPage(page);
    const searchInput = page.getByPlaceholder("Search technician...");
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill("smith");
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue("smith");

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
  });
});

test.describe("Time Clock — Clock In Dialog (AI-061)", () => {
  test("Clock In dialog opens from header action", async ({ page }) => {
    const dialog = await openClockInDialog(page);
    await expect(dialog.getByRole("heading", { name: /^Clock In$/i })).toBeVisible();
  });

  test("dialog contains technician selector", async ({ page }) => {
    const dialog = await openClockInDialog(page);
    await expect(dialog.getByText(/Technician \*/i)).toBeVisible();
    await expect(dialog.locator("[role='combobox']").first()).toBeVisible();
  });

  test("dialog contains context and work-order controls", async ({ page }) => {
    const dialog = await openClockInDialog(page);
    await expect(dialog.getByText(/Context \*/i)).toBeVisible();
    await expect(dialog.getByText(/Work Order \*/i)).toBeVisible();
  });

  test("dialog contains optional notes field", async ({ page }) => {
    const dialog = await openClockInDialog(page);
    await expect(dialog.getByPlaceholder("Work notes...")).toBeVisible();
  });

  test("dialog closes via Escape without crashing page", async ({ page }) => {
    const dialog = await openClockInDialog(page);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
  });
});

test.describe("Time Clock — Double Clock-In Guard (AI-061)", () => {
  test("active-timer warning appears only when an active technician is selected", async ({ page }) => {
    await openTimeClockPage(page);

    const hasActiveTimers = await page
      .getByText(/Active Timers \(\d+\)/i)
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    const dialog = await openClockInDialog(page);
    const techSelect = dialog.locator("[role='combobox']").first();
    await techSelect.click();

    const techOptions = page.locator("[role='option']");
    const optionCount = await techOptions.count();
    expect(optionCount).toBeGreaterThan(0);

    let warningSeen = false;
    const warning = dialog.getByText(/Technician already has an active timer/i);
    const attempts = Math.min(optionCount, 12);

    for (let i = 0; i < attempts; i++) {
      await techOptions.nth(i).click();
      const visible = await warning.isVisible({ timeout: 800 }).catch(() => false);
      if (visible) {
        warningSeen = true;
        break;
      }
      if (i < attempts - 1) {
        await techSelect.click();
      }
    }

    if (hasActiveTimers) {
      expect(warningSeen).toBe(true);
      await expect(warning).toBeVisible();
      await expect(dialog).toContainText(/since/i);
    } else {
      expect(warningSeen).toBe(false);
    }
  });
});
