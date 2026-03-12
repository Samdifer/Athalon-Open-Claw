import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);
const SEEDED_AUTH_STATE = JSON.parse(fs.readFileSync(SEEDED_AUTH_FILE, "utf8"));
const APP_ROOT = path.resolve(__dirname, "..");

test.use({ storageState: SEEDED_AUTH_STATE });

async function openScheduling(
  page: import("@playwright/test").Page,
  options?: { resetOnboarding?: boolean; dismissOnboarding?: boolean },
) {
  await page.goto("/scheduling", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });

  await page.evaluate(({ resetOnboarding = false }) => {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith("athelon:selected-location:")) {
        window.localStorage.setItem(key, "all");
      }
      if (resetOnboarding && key.startsWith("athelon:scheduling:onboarding:")) {
        window.localStorage.removeItem(key);
      }
    }
  }, { resetOnboarding: options?.resetOnboarding ?? false });

  await page.reload({ waitUntil: "domcontentloaded" });

  if (options?.dismissOnboarding) {
    const skipOnboarding = page.getByTestId("onboarding-skip-banner");
    try {
      await expect(skipOnboarding).toBeVisible({ timeout: 4_000 });
      await skipOnboarding.click();
    } catch {
      // Banner may not exist if onboarding is already completed/skipped.
    }
  }
}

async function openCapacity(page: import("@playwright/test").Page) {
  await page.goto("/scheduling/capacity", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.evaluate(() => {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith("athelon:selected-location:")) {
        window.localStorage.setItem(key, "all");
      }
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function waitForSchedulerHydration(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("gantt-timeline-scroll")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_250);
}

async function getScheduledBarCount(page: import("@playwright/test").Page) {
  const bars = page.locator('[data-testid^="gantt-bar-"]');
  await waitForSchedulerHydration(page);
  try {
    await expect(bars.first()).toBeVisible({ timeout: 12_000 });
  } catch {
    // Allow caller to decide whether to skip/fail if no bars are present.
  }
  return bars.count();
}

async function dispatchBacklogDropToLane(
  page: import("@playwright/test").Page,
  args: {
    workOrderId: string;
    laneTestId: string;
    clientX: number;
    clientY: number;
  },
) {
  return page.evaluate(
    ({ workOrderId, laneTestId, clientX, clientY }) => {
      const target = document.querySelector(`[data-testid="${laneTestId}"]`);
      if (!target) {
        return { ok: false, reason: "missing-target" };
      }

      const dataTransfer = new DataTransfer();
      const payload = JSON.stringify({ workOrderId });
      dataTransfer.setData("application/x-athelon-work-order", payload);
      dataTransfer.setData("text/plain", payload);

      target.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX,
          clientY,
        }),
      );
      target.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX,
          clientY,
        }),
      );

      return { ok: true };
    },
    args,
  );
}

test.describe("Wave 8: Seeded scheduler user stories", () => {
  test.beforeAll(() => {
    execSync("npm run seed:e2e:scheduler-stories", {
      cwd: APP_ROOT,
      stdio: "pipe",
      env: process.env,
    });
  });

  test("backlog work orders can be dropped onto a bay lane to create assignments", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });
    await waitForSchedulerHydration(page);

    const unscheduledButton = page
      .locator("button")
      .filter({ hasText: /unscheduled/i })
      .first();
    try {
      await expect(unscheduledButton).toBeVisible({ timeout: 8_000 });
    } catch {
      test.skip(true, "Seeded org has no unscheduled work orders.");
    }

    await unscheduledButton.click();
    const initialUnscheduledCount = Number(
      ((await unscheduledButton.innerText()).match(/\d+/)?.[0] ?? "0"),
    );

    const firstBacklogCard = page
      .locator('[data-testid^="backlog-card-"]')
      .filter({ hasText: "E2E-WO-UNSCHED-001" })
      .first();
    const hasSeededBacklogCard = await firstBacklogCard.isVisible({ timeout: 15_000 }).catch(
      () => false,
    );
    if (!hasSeededBacklogCard) {
      test.skip(true, "Seeded backlog work order fixture E2E-WO-UNSCHED-001 is not available.");
    }

    const cardLabel = await firstBacklogCard
      .locator("span.font-mono.font-semibold")
      .first()
      .innerText();
    const workOrderId =
      (await firstBacklogCard.getAttribute("data-testid"))?.replace("backlog-card-", "") ?? "";
    expect(workOrderId).toBeTruthy();

    const targetLanes = page.locator('[data-testid^="gantt-lane-"]');
    const laneCount = await targetLanes.count();
    let scheduled = false;

    for (let i = 0; i < laneCount; i += 1) {
      const lane = targetLanes.nth(i);
      const laneBox = await lane.boundingBox();
      const laneTestId = await lane.getAttribute("data-testid");
      if (!laneBox || !laneTestId) {
        continue;
      }

      await dispatchBacklogDropToLane(page, {
        workOrderId,
        laneTestId,
        clientX: laneBox.x + Math.min(40, laneBox.width / 2),
        clientY: laneBox.y + laneBox.height / 2,
      });

      const scheduledToastVisible = await page
        .getByText("Work order scheduled")
        .isVisible({ timeout: 2_500 })
        .catch(() => false);
      const scheduledBarVisible = await page
        .locator(`[title*="${cardLabel}"]`)
        .first()
        .isVisible({ timeout: 2_500 })
        .catch(() => false);
      const currentUnscheduledCount = Number(
        ((await unscheduledButton.innerText().catch(() => "")).match(/\d+/)?.[0] ?? "0"),
      );

      if (
        scheduledToastVisible ||
        scheduledBarVisible ||
        currentUnscheduledCount < initialUnscheduledCount
      ) {
        scheduled = true;
        break;
      }
    }

    expect(scheduled).toBe(true);
    await expect(unscheduledButton).not.toContainText(`${initialUnscheduledCount}`);
  });

  test("bay row reorder controls update persisted board ordering", async ({ page }) => {
    await openScheduling(page, { dismissOnboarding: true });

    const rowLabels = page.locator('[data-testid^="gantt-row-label-"]');
    if ((await rowLabels.count()) < 2) {
      await page.goto("/scheduling/bays", {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await expect(
        page.getByRole("heading", { name: "Hangar Bays" }),
      ).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: "Add Bay" }).click();
      await page.getByLabel("Name").fill(`E2E Bay ${Date.now()}`);
      await page.getByRole("button", { name: "Create" }).click();
      await expect(page.getByText("Bay created")).toBeVisible({ timeout: 15_000 });

      await page.goto("/scheduling", {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await openScheduling(page, { dismissOnboarding: true });
    }

    await expect(rowLabels.nth(1)).toBeVisible({ timeout: 20_000 });

    const firstRowLabelBefore = (await rowLabels.nth(0).innerText()).split("\n")[0].trim();
    const secondRowLabelBefore = (await rowLabels.nth(1).innerText()).split("\n")[0].trim();

    await page.locator('[data-testid^="bay-row-down-"]').first().click();
    await expect(page.getByText("Bay order updated")).toBeVisible({ timeout: 10_000 });
    await expect(rowLabels.nth(0)).toContainText(secondRowLabelBefore, { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(rowLabels.nth(0)).toContainText(secondRowLabelBefore, { timeout: 20_000 });
    await expect(rowLabels.nth(1)).toContainText(firstRowLabelBefore, { timeout: 20_000 });
  });

  test("scheduler graveyard supports archive and restore flows", async ({ page }) => {
    await openScheduling(page, { dismissOnboarding: true });
    const scheduledBarCount = await getScheduledBarCount(page);
    if (scheduledBarCount === 0) {
      test.skip(true, "No scheduled bars are currently visible to archive.");
    }

    const archiveButton = page.locator('[data-testid^="archive-assignment-"]').first();
    await expect(archiveButton).toBeVisible({ timeout: 12_000 });

    const archiveLabel = (await archiveButton.getAttribute("aria-label")) ?? "";
    const archivedWoNumber = archiveLabel.replace(/^Archive\s+/, "").trim();

    await archiveButton.click();
    await expect(page.getByText("Assignment archived")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Graveyard/i }).click();
    await expect(
      page.getByRole("dialog", { name: /Graveyard|Archived Assignments/i }),
    ).toBeVisible({ timeout: 15_000 });

    const archivedRow = archivedWoNumber
      ? page.locator("li", { hasText: archivedWoNumber }).first()
      : page.locator('[data-testid^="graveyard-item-"]').first();
    await expect(archivedRow).toBeVisible({ timeout: 15_000 });

    await archivedRow.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Assignment restored")).toBeVisible({ timeout: 15_000 });
  });

  test("scheduler supports fullscreen route mode and exit", async ({ page }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await page.getByTestId("scheduling-enter-fullscreen").click();
    await expect(page.getByTestId("scheduling-exit-fullscreen")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/scheduling\?view=fullscreen/);

    await page.getByTestId("scheduling-exit-fullscreen").click();
    await expect(page.getByTestId("scheduling-enter-fullscreen")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/view=fullscreen/);
  });

  test("location switching updates scheduler scope and persists across reload", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    const trigger = page.getByTestId("location-switcher-trigger");
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();

    const options = page.locator('[data-testid^="location-switcher-option-"]');
    const optionCount = await options.count();
    if (optionCount < 2) {
      test.skip(true, "No scoped location options available to validate switching.");
    }

    const firstScopedOption = options.nth(1);
    const scopedLocationLabel = (await firstScopedOption.innerText()).trim().split("\n")[0] ?? "";
    await firstScopedOption.click();

    await expect(trigger).toContainText(scopedLocationLabel, { timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(trigger).toContainText(scopedLocationLabel, { timeout: 15_000 });
  });

  test("scheduler toggles analytics and roster panels and supports popout", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await page.getByTestId("toggle-analytics-panel").click();
    await expect(page.getByTestId("analytics-panel")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Pop out analytics" }).click();
    await expect(page.getByRole("button", { name: "Stow Tray" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Stow Tray" }).click();

    await page.getByTestId("toggle-roster-panel").click();
    await expect(page.getByTestId("roster-panel")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Pop out roster" }).click();
    await expect(page.getByRole("button", { name: "Stow Tray" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Stow Tray" }).click();
  });

  test("scheduler command center supports quick configuration and financial saves", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await page.getByTestId("toggle-command-center").click();
    await expect(
      page.getByRole("heading", { name: "Scheduling Command Center" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("command-center-tab-configuration").click();
    const capacityBufferInput = page.getByLabel("Capacity Buffer %");
    await capacityBufferInput.fill("18");
    await page.getByTestId("command-center-save-scheduling").click();
    await expect(page.getByText("Scheduling settings saved")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("command-center-tab-financial").click();
    const shopRateInput = page.getByLabel("Default Shop Rate");
    await shopRateInput.fill("189");
    await page.getByTestId("command-center-save-financial").click();
    await expect(
      page.getByText("Command center financial settings saved"),
    ).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Scheduling Command Center" }),
    ).toBeHidden({ timeout: 15_000 });
  });

  test("command center inline technician edits enforce blocked validations and save", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await page.getByTestId("toggle-command-center").click();
    await expect(
      page.getByRole("heading", { name: "Scheduling Command Center" }),
    ).toBeVisible({ timeout: 15_000 });

    const editShiftButtons = page.getByRole("button", { name: "Edit Shift" });
    if ((await editShiftButtons.count()) === 0) {
      test.skip(true, "No editable technician records are available in seeded org.");
    }

    await editShiftButtons.first().click();

    const startHourInput = page.getByLabel("Start Hour").first();
    const endHourInput = page.getByLabel("End Hour").first();
    await startHourInput.fill("16");
    await endHourInput.fill("15");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Shift end hour must be after start hour")).toBeVisible({
      timeout: 10_000,
    });

    await startHourInput.fill("6");
    await endHourInput.fill("14");
    await page.getByLabel("Efficiency").first().fill("1.05");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Technician shift updated")).toBeVisible({ timeout: 15_000 });
  });

  test("scheduler first-run onboarding supports setup defaults and completion", async ({
    page,
  }) => {
    await openScheduling(page, { resetOnboarding: true });
    await waitForSchedulerHydration(page);

    const onboardingBanner = page.getByTestId("scheduling-onboarding-banner");
    await expect(onboardingBanner).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("onboarding-run-setup").click();
    await expect(page.getByTestId("scheduling-onboarding-dialog")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Capacity Buffer %").fill("19");
    await page.getByLabel("Default Shop Rate").fill("185");
    await page.getByTestId("onboarding-apply-defaults").click();
    await expect(page.getByText("Scheduling onboarding defaults applied")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("onboarding-complete").click();
    await expect(onboardingBanner).toBeHidden({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("scheduling-onboarding-banner")).toBeHidden({
      timeout: 15_000,
    });
  });

  test("scheduler quote workspace opens embedded quote flow from board selection", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });
    const scheduledBarCount = await getScheduledBarCount(page);
    if (scheduledBarCount === 0) {
      test.skip(true, "No scheduled bars are currently visible for quote workspace.");
    }

    const firstBar = page.locator('[data-testid^="gantt-bar-"]').first();
    await expect(firstBar).toBeVisible({ timeout: 12_000 });

    const barTitle = (await firstBar.getAttribute("title")) ?? "";
    const woNumber = barTitle.split("—")[0]?.trim() ?? "";

    await page.getByTestId("toggle-magic-selection-mode").click();
    await firstBar.click();

    await page.getByTestId("toggle-quote-workspace").click();
    await expect(page.getByTestId("quote-workspace-dialog")).toBeVisible({
      timeout: 20_000,
    });
    const quoteIframe = page.getByTestId("quote-workspace-iframe");
    await expect(quoteIframe).toBeVisible({ timeout: 20_000 });
    const iframeSrc = (await quoteIframe.getAttribute("src")) ?? "";
    expect(iframeSrc).toContain("/sales/quotes/");

    if (woNumber.length > 0) {
      await expect(page.getByText(woNumber).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("scheduler edit mode supports distribute and block day controls", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });
    const scheduledBarCount = await getScheduledBarCount(page);
    if (scheduledBarCount === 0) {
      test.skip(true, "No scheduled bars are currently visible to edit.");
    }

    const bars = page.locator('[data-testid^="gantt-bar-"]');
    await expect(bars.first()).toBeVisible({ timeout: 12_000 });

    await page.getByTestId("toggle-schedule-edit-mode").click();
    await expect(page.getByTestId("gantt-edit-mode-banner")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("schedule-edit-tool-distribute").click();
    const firstDaySegment = page.locator('[data-testid^="gantt-day-segment-"]').first();
    await expect(firstDaySegment).toBeVisible({ timeout: 15_000 });
    await firstDaySegment.click();
    await expect(
      page.getByText(
        /Day model updated \(effort redistributed\)|No distributable effort available for this assignment/i,
      ),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("schedule-edit-tool-block").click();
    await firstDaySegment.click();
    await expect(
      page.getByText(
        /Day model updated \(block toggle\)|At least one active work day is required/i,
      ),
    ).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("gantt-edit-mode-banner")).toBeHidden({
      timeout: 15_000,
    });
  });

  test("edit mode blocks direct assignment interactions with visible feedback", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });
    await waitForSchedulerHydration(page);

    const unscheduledButton = page
      .locator("button")
      .filter({ hasText: /unscheduled/i })
      .first();
    try {
      await expect(unscheduledButton).toBeVisible({ timeout: 8_000 });
    } catch {
      test.skip(true, "Seeded org has no unscheduled work orders.");
    }

    await page.getByTestId("toggle-schedule-edit-mode").click();
    await expect(page.getByTestId("gantt-edit-mode-banner")).toBeVisible({ timeout: 10_000 });

    await unscheduledButton.click();
    const firstBacklogCard = page.locator('[data-testid^="backlog-card-"]').first();
    const targetLane = page.locator('[data-testid^="gantt-lane-"]').first();
    await expect(firstBacklogCard).toBeVisible({ timeout: 10_000 });
    await expect(targetLane).toBeVisible({ timeout: 10_000 });

    const laneBox = await targetLane.boundingBox();
    if (!laneBox) {
      test.skip(true, "Could not resolve lane bounds for blocked drop test.");
    }

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await firstBacklogCard.dispatchEvent("dragstart", { dataTransfer });
    await targetLane.dispatchEvent("dragover", {
      dataTransfer,
      clientX: laneBox!.x + 8,
      clientY: laneBox!.y + laneBox!.height / 2,
    });
    await targetLane.dispatchEvent("drop", {
      dataTransfer,
      clientX: laneBox!.x + 8,
      clientY: laneBox!.y + laneBox!.height / 2,
    });

    await expect(page.getByTestId("gantt-blocked-action-banner")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("scheduler board-native magic selection carries into magic scheduler dialog", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });
    const scheduledBarCount = await getScheduledBarCount(page);
    if (scheduledBarCount === 0) {
      test.skip(true, "No scheduled bars are currently visible for board selection.");
    }

    const firstBar = page.locator('[data-testid^="gantt-bar-"]').first();
    await expect(firstBar).toBeVisible({ timeout: 12_000 });

    const barTitle = (await firstBar.getAttribute("title")) ?? "";
    const woNumber = barTitle.split("—")[0]?.trim() ?? "";

    await page.getByTestId("toggle-magic-selection-mode").click();
    await firstBar.click();
    await expect(firstBar).toHaveAttribute("data-magic-selected", "true");

    await page.getByRole("button", { name: "Magic Scheduler" }).click();
    await expect(page.getByRole("heading", { name: "Magic Scheduler" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("magic-selected-count")).toContainText("1 selected.");

    if (woNumber.length > 0) {
      await expect(page.getByLabel(`Select ${woNumber}`).first()).toBeChecked({
        timeout: 15_000,
      });
    }
  });

  test("planner sees converted quote continuity in Magic Scheduler", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await expect(
      page.getByRole("button", { name: "Magic Scheduler" }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Magic Scheduler" }).click();

    await expect(
      page.getByRole("heading", { name: "Magic Scheduler" }),
    ).toBeVisible({ timeout: 15_000 });

    const magicDialog = page.getByRole("dialog", { name: "Magic Scheduler" });
    const convertedRow = magicDialog.locator("li", { hasText: "E2E-WO-CONV-001" }).first();
    if ((await convertedRow.count()) > 0) {
      await expect(convertedRow).toBeVisible({ timeout: 15_000 });
      await expect(convertedRow).toContainText("E2E-Q-CONV-001");
    } else {
      const continuityRow = magicDialog
        .locator("li")
        .filter({ hasText: /WO-/i })
        .filter({ hasText: /Q-/i })
        .first();
      await expect(continuityRow).toBeVisible({ timeout: 15_000 });
      await expect(continuityRow).toContainText(/Q-/i);
    }

    await page.locator("button:has-text('Close')").first().click();
    await expect(
      page.getByRole("heading", { name: "Magic Scheduler" }),
    ).toBeHidden();
  });

  test("legacy scheduled work orders are backfilled into planner lanes with quote links", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    const directBar = page.locator('[title*="E2E-WO-DIRECT-001"]').first();
    const convertedBar = page.locator('[title*="E2E-WO-CONV-001"]').first();
    const hasStoryBars = (await directBar.count()) > 0 && (await convertedBar.count()) > 0;
    if (hasStoryBars) {
      await expect(directBar).toBeVisible({ timeout: 20_000 });
      await expect(directBar).toHaveAttribute(
        "title",
        /E2E-WO-DIRECT-001[\s\S]*E2E-Q-DIRECT-001/,
      );

      await expect(convertedBar).toBeVisible({ timeout: 20_000 });
      await expect(convertedBar).toHaveAttribute(
        "title",
        /E2E-WO-CONV-001[\s\S]*E2E-Q-CONV-001/,
      );
    } else {
      const quoteLinkedBar = page.locator('[data-testid^="gantt-bar-"][title*="Q-"]').first();
      await expect(quoteLinkedBar).toBeVisible({ timeout: 20_000 });
      await expect(quoteLinkedBar).toHaveAttribute("title", /WO-[\s\S]*Q-/);
    }
  });

  test("scheduler keeps docked daily P&L and no longer renders docked capacity panel", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    await expect(page.getByTestId("daily-pnl-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("capacity-forecaster-panel")).toHaveCount(0);

    await page.getByRole("button", { name: "Pop out daily P&L" }).click();
    await expect(page.locator('button[title="Stow Tray"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('button[title="Stow Tray"]').first().click();
    await expect(page.getByTestId("daily-pnl-panel")).toBeVisible({ timeout: 15_000 });
  });

  test("timeline scrolling stays synchronized between gantt and daily P&L panels", async ({
    page,
  }) => {
    await openScheduling(page, { dismissOnboarding: true });

    const ganttScroll = page.getByTestId("gantt-timeline-scroll");
    const pnlScroll = page.getByTestId("daily-pnl-timeline-scroll");

    await expect(ganttScroll).toBeVisible({ timeout: 20_000 });
    await expect(pnlScroll).toBeVisible({ timeout: 20_000 });

    await ganttScroll.evaluate((node) => {
      node.scrollLeft = 720;
      node.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await page.waitForTimeout(250);

    const [ganttLeft, pnlLeft] = await Promise.all([
      ganttScroll.evaluate((node) => node.scrollLeft),
      pnlScroll.evaluate((node) => node.scrollLeft),
    ]);

    expect(Math.abs(pnlLeft - ganttLeft)).toBeLessThan(4);
    await expect(page.getByTestId("capacity-forecaster-timeline-scroll")).toHaveCount(0);
  });

  test("capacity page renders standalone forecaster and persists scheduling defaults", async ({
    page,
  }) => {
    await openCapacity(page);

    await expect(
      page.getByRole("heading", { name: "Capacity Planning" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("capacity-forecaster-panel")).toBeVisible({
      timeout: 20_000,
    });

    const rangeButton = page.getByRole("button", { name: "60d" });
    await rangeButton.click();
    await expect(rangeButton).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "week" }).click();
    await page.getByRole("button", { name: "Today" }).click();

    const bufferInput = page.getByLabel("Capacity Buffer %");
    const startHourInput = page.getByLabel("Default Start Hour");
    const endHourInput = page.getByLabel("Default End Hour");
    const defaultEfficiencyInput = page.getByLabel("Default Efficiency");

    await bufferInput.fill("21");
    await startHourInput.fill("6");
    await endHourInput.fill("16");
    await defaultEfficiencyInput.fill("1.1");
    await page.getByTestId("capacity-save-scheduling-settings").click();

    await expect(page.getByText("Scheduling settings saved")).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(bufferInput).toHaveValue("21", { timeout: 20_000 });
    await expect(startHourInput).toHaveValue("6", { timeout: 20_000 });
    await expect(endHourInput).toHaveValue("16", { timeout: 20_000 });
    await expect(defaultEfficiencyInput).toHaveValue("1.1", { timeout: 20_000 });
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
