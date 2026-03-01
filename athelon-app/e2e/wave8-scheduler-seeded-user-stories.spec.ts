import { test, expect } from "@playwright/test";
import path from "path";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

test.describe("Wave 8: Seeded scheduler user stories", () => {
  test("planner sees converted quote continuity in Magic Scheduler", async ({
    page,
  }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await expect(
      page.getByRole("button", { name: "Magic Scheduler" }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Magic Scheduler" }).click();

    await expect(
      page.getByRole("heading", { name: "Magic Scheduler" }),
    ).toBeVisible({ timeout: 15_000 });

    const convertedRow = page.locator("li", { hasText: "E2E-WO-CONV-001" }).first();
    await convertedRow.scrollIntoViewIfNeeded();
    await expect(convertedRow).toBeVisible({ timeout: 15_000 });
    await expect(convertedRow).toContainText("E2E-Q-CONV-001");

    await page.locator("button:has-text('Close')").first().click();
    await expect(
      page.getByRole("heading", { name: "Magic Scheduler" }),
    ).toBeHidden();
  });

  test("legacy scheduled work orders are backfilled into planner lanes with quote links", async ({
    page,
  }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const directBar = page.locator('[title*="E2E-WO-DIRECT-001"]').first();
    await directBar.scrollIntoViewIfNeeded();
    await expect(directBar).toBeVisible({ timeout: 20_000 });
    await expect(directBar).toHaveAttribute(
      "title",
      /E2E-WO-DIRECT-001[\s\S]*E2E-Q-DIRECT-001/,
    );

    const convertedBar = page.locator('[title*="E2E-WO-CONV-001"]').first();
    await convertedBar.scrollIntoViewIfNeeded();
    await expect(convertedBar).toBeVisible({ timeout: 20_000 });
    await expect(convertedBar).toHaveAttribute(
      "title",
      /E2E-WO-CONV-001[\s\S]*E2E-Q-CONV-001/,
    );
  });

  test("scheduler shows docked daily P&L + capacity visuals and supports panel popout", async ({
    page,
  }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await expect(page.getByTestId("daily-pnl-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("capacity-forecaster-panel")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Pop out daily P&L" }).click();
    await expect(page.locator('button[title="Stow Tray"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('button[title="Stow Tray"]').first().click();
    await expect(page.getByTestId("daily-pnl-panel")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Pop out capacity forecaster" }).click();
    await expect(page.locator('button[title="Stow Tray"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('button[title="Stow Tray"]').first().click();
    await expect(page.getByTestId("capacity-forecaster-panel")).toBeVisible({ timeout: 15_000 });
  });

  test("timeline scrolling stays synchronized between gantt, daily P&L, and capacity panels", async ({
    page,
  }) => {
    await page.goto("/scheduling", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    const ganttScroll = page.getByTestId("gantt-timeline-scroll");
    const pnlScroll = page.getByTestId("daily-pnl-timeline-scroll");
    const capacityScroll = page.getByTestId("capacity-forecaster-timeline-scroll");

    await expect(ganttScroll).toBeVisible({ timeout: 20_000 });
    await expect(pnlScroll).toBeVisible({ timeout: 20_000 });
    await expect(capacityScroll).toBeVisible({ timeout: 20_000 });

    await ganttScroll.evaluate((node) => {
      node.scrollLeft = 720;
      node.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await page.waitForTimeout(250);

    const [ganttLeft, pnlLeft, capacityLeft] = await Promise.all([
      ganttScroll.evaluate((node) => node.scrollLeft),
      pnlScroll.evaluate((node) => node.scrollLeft),
      capacityScroll.evaluate((node) => node.scrollLeft),
    ]);

    expect(Math.abs(pnlLeft - ganttLeft)).toBeLessThan(4);
    expect(Math.abs(capacityLeft - ganttLeft)).toBeLessThan(4);
  });

  test("financial planning assumptions save and reload on seeded planner workload", async ({
    page,
  }) => {
    await page.goto("/scheduling/financial-planning", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    await expect(
      page.getByRole("heading", { name: "Planning Financials" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Active Projects")).toBeVisible({ timeout: 10_000 });

    const shopRateInput = page
      .locator('div:has(label:has-text("Default Shop Rate")) input')
      .first();
    await shopRateInput.fill("177");
    await page.getByRole("button", { name: "Save Assumptions" }).click();

    await expect(page.getByText("Planning financial settings saved")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(shopRateInput).toHaveValue("177", { timeout: 15_000 });
  });
});
