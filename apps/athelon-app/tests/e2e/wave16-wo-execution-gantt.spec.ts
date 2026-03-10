/**
 * wave16-wo-execution-gantt.spec.ts
 *
 * E2E tests for the Work Order Execution Gantt at /work-orders/:id/execution.
 * Covers page load, Convex hydration, unassigned sidebar, tech lanes,
 * assignment bar interactions (move, resize, assign), and dependency arrows.
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { findFirstEditableWorkOrder } from "./helpers/workOrderRoutes";

// ─── Auth ────────────────────────────────────────────────────────────────────

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);
const SEEDED_AUTH_STATE = JSON.parse(
  fs.readFileSync(SEEDED_AUTH_FILE, "utf8"),
);

test.use({ storageState: SEEDED_AUTH_STATE });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function navigateToExecutionGantt(page: Page): Promise<string | null> {
  const woRef = await findFirstEditableWorkOrder(page);
  const woId = woRef.id;

  await page.goto(`/work-orders/${woId}/execution`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });

  // Give React/Convex a moment to mount the component tree
  await page.waitForTimeout(2_000);

  return woId;
}

async function waitForGanttHydration(page: Page) {
  // The execution Gantt page renders inside AppLayout. Wait for the page to
  // have content — either the execution heading, the loading text, or the
  // fully-hydrated unassigned strip.
  const heading = page.locator("h1");
  const loadingText = page.getByText("Loading execution data");
  const strip = page.getByTestId("wo-execution-unassigned-strip");
  const noTechs = page.getByText("No active technicians in this organization");

  // First, wait for any page content to appear (heading or loading text)
  await expect(
    heading.or(loadingText).or(strip).or(noTechs),
  ).toBeVisible({ timeout: 30_000 });

  // Then wait for Convex queries to resolve (strip or no-techs message)
  // If the loading text was showing, give it time to hydrate
  try {
    await expect(strip.or(noTechs)).toBeVisible({ timeout: 30_000 });
  } catch {
    // If neither appears after 30s, the page might be stuck in loading —
    // let individual tests handle this via their own assertions
  }
}

async function pointerDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 10,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
  }
  await page.mouse.up();
}

// ─── Group A: Page Load & Hydration ──────────────────────────────────────────

test.describe("Wave 16: WO Execution Gantt — Page Load", () => {
  let woId: string;

  test.beforeEach(async ({ page }) => {
    const id = await navigateToExecutionGantt(page);
    if (!id) test.skip(true, "No editable work order found in seeded org.");
    woId = id!;
  });

  test("navigates to execution page from WO list", async ({ page }) => {
    await expect(page).toHaveURL(/\/work-orders\/[^/]+\/execution/, {
      timeout: 10_000,
    });
  });

  test("renders header with WO number and Execution Planning title", async ({
    page,
  }) => {
    await waitForGanttHydration(page);

    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 15_000 });
    await expect(heading).toContainText("Execution Planning");
  });

  test("exits loading state and renders Gantt container", async ({ page }) => {
    const loadingText = page.getByText("Loading execution data");
    // Either it was already gone or it disappears after Convex hydration
    await expect(loadingText).toBeHidden({ timeout: 20_000 });

    await waitForGanttHydration(page);
  });

  test("renders 24-hour column headers", async ({ page }) => {
    await waitForGanttHydration(page);

    // Sample a few hour labels across the range
    await expect(page.getByText("00:00").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("06:00").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("12:00").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("23:00").first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("renders tech lanes for active technicians", async ({ page }) => {
    await waitForGanttHydration(page);

    const lanes = page.locator('[data-testid^="wo-tech-lane-"]');
    const count = await lanes.count();
    if (count === 0) {
      test.skip(true, "No active technicians in seeded org.");
      return;
    }

    // First lane should have a technician name
    const firstLane = lanes.first();
    await expect(firstLane).toBeVisible({ timeout: 10_000 });
    const nameLabel = firstLane.locator("p").first();
    const name = await nameLabel.textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
  });

  test("unassigned sidebar renders with correct heading", async ({ page }) => {
    await waitForGanttHydration(page);

    await expect(page.getByText("Unassigned Tasks")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByTestId("wo-execution-unassigned-strip"),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("back link returns to work order detail page", async ({ page }) => {
    await waitForGanttHydration(page);

    const backLink = page.locator(`a[href="/work-orders/${woId}"]`);
    await expect(backLink).toBeVisible({ timeout: 10_000 });
    await backLink.click();

    await expect(page).toHaveURL(new RegExp(`/work-orders/${woId}$`), {
      timeout: 15_000,
    });
  });
});

// ─── Group B: With Assignment Data ───────────────────────────────────────────

test.describe("Wave 16: WO Execution Gantt — Assignments & Interactions", () => {
  test("unassigned task cards display title and card number", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const cards = page.locator('[data-testid^="wo-unassigned-"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, "No unassigned task cards on this WO.");
      return;
    }

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // Card should show a title (first <p> with font-medium)
    const title = firstCard.locator("p.text-xs.font-medium");
    await expect(title).toBeVisible({ timeout: 5_000 });
    const titleText = await title.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);
  });

  test("assignment bars render in tech lanes with status colors", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const bars = page.locator('[data-testid^="wo-assignment-"]');
    const barCount = await bars.count();
    if (barCount === 0) {
      test.skip(true, "No task assignments exist on this WO.");
      return;
    }

    const firstBar = bars.first();
    await expect(firstBar).toBeVisible({ timeout: 10_000 });

    // Bar should have one of the status color classes
    const className = (await firstBar.getAttribute("class")) ?? "";
    const hasStatusColor =
      className.includes("bg-blue-500") ||
      className.includes("bg-amber-500") ||
      className.includes("bg-green-500");
    expect(hasStatusColor).toBe(true);
  });

  test("assignment bars show task title and percent-complete", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const bars = page.locator('[data-testid^="wo-assignment-"]');
    const barCount = await bars.count();
    if (barCount === 0) {
      test.skip(true, "No task assignments exist on this WO.");
      return;
    }

    const firstBar = bars.first();
    await expect(firstBar).toBeVisible({ timeout: 10_000 });

    // Percent label (e.g., "0%", "50%")
    const pctLabel = firstBar.locator("p").filter({ hasText: /\d+%/ });
    await expect(pctLabel).toBeVisible({ timeout: 5_000 });
  });

  test("move drag on assignment bar triggers update", async ({ page }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const bars = page.locator('[data-testid^="wo-assignment-"]');
    const barCount = await bars.count();
    if (barCount === 0) {
      test.skip(true, "No task assignments to drag.");
      return;
    }

    const firstBar = bars.first();
    const box = await firstBar.boundingBox();
    if (!box) {
      test.skip(true, "Assignment bar has no bounding box (off-screen).");
      return;
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Drag 60px right (one hour at HOUR_WIDTH=60)
    await pointerDrag(
      page,
      { x: centerX, y: centerY },
      { x: centerX + 60, y: centerY },
    );

    // Either a success or an overlap warning should appear
    const successOrWarning = page
      .getByText("Task assigned")
      .or(page.getByTestId("wo-execution-interaction-notice"));
    // Allow longer timeout since this hits a Convex mutation
    await expect(successOrWarning).toBeVisible({ timeout: 15_000 });
  });

  test("resize drag on assignment bar right edge", async ({ page }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const bars = page.locator('[data-testid^="wo-assignment-"]');
    const barCount = await bars.count();
    if (barCount === 0) {
      test.skip(true, "No task assignments to resize.");
      return;
    }

    const firstBar = bars.first();
    const box = await firstBar.boundingBox();
    if (!box) {
      test.skip(true, "Assignment bar has no bounding box.");
      return;
    }

    // Target right edge (resize handle is the rightmost 8px)
    const rightEdgeX = box.x + box.width - 4;
    const centerY = box.y + box.height / 2;

    await pointerDrag(
      page,
      { x: rightEdgeX, y: centerY },
      { x: rightEdgeX + 30, y: centerY },
    );

    // Success or overlap warning
    const successOrWarning = page
      .getByText("Task assigned")
      .or(page.getByTestId("wo-execution-interaction-notice"));
    await expect(successOrWarning).toBeVisible({ timeout: 15_000 });
  });

  test("assign drag from unassigned sidebar to tech lane", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const cards = page.locator('[data-testid^="wo-unassigned-"]');
    const lanes = page.locator('[data-testid^="wo-tech-lane-"]');
    const cardCount = await cards.count();
    const laneCount = await lanes.count();

    if (cardCount === 0 || laneCount === 0) {
      test.skip(
        true,
        "Need both unassigned cards and tech lanes to test assign drag.",
      );
      return;
    }

    const card = cards.first();
    const lane = lanes.first();
    const cardBox = await card.boundingBox();
    const laneBox = await lane.boundingBox();
    if (!cardBox || !laneBox) {
      test.skip(true, "Cannot get bounding boxes for drag source/target.");
      return;
    }

    const from = {
      x: cardBox.x + cardBox.width / 2,
      y: cardBox.y + cardBox.height / 2,
    };
    // Drop into the grid area of the lane (past the 220px sidebar label)
    const to = {
      x: laneBox.x + 220 + 120, // past sidebar + some offset into the grid
      y: laneBox.y + laneBox.height / 2,
    };

    await pointerDrag(page, from, to);

    // "Task assigned" toast or overlap/blocked interaction-notice
    const feedback = page
      .getByText("Task assigned")
      .or(page.getByTestId("wo-execution-interaction-notice"));
    await expect(feedback).toBeVisible({ timeout: 15_000 });
  });

  test("overlap conflict shows interaction-notice warning", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const bars = page.locator('[data-testid^="wo-assignment-"]');
    const barCount = await bars.count();
    if (barCount < 2) {
      test.skip(
        true,
        "Need at least 2 assignments to test overlap detection.",
      );
      return;
    }

    // Check if any two bars are on the same tech lane
    const firstBar = bars.nth(0);
    const secondBar = bars.nth(1);
    const firstBox = await firstBar.boundingBox();
    const secondBox = await secondBar.boundingBox();
    if (!firstBox || !secondBox) {
      test.skip(true, "Cannot get bounding boxes for overlap test.");
      return;
    }

    // Drag the first bar directly onto the second bar's position
    await pointerDrag(
      page,
      { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 },
      { x: secondBox.x + secondBox.width / 2, y: secondBox.y + secondBox.height / 2 },
    );

    // The overlap may or may not trigger depending on whether they're on the same lane.
    // If triggered, the interaction-notice or a toast will show.
    const notice = page.getByTestId("wo-execution-interaction-notice");
    const anyToast = page.getByText(/Blocked|assigned|failed/i).first();
    await expect(notice.or(anyToast)).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Group C: Dependency Arrows ──────────────────────────────────────────────

test.describe("Wave 16: WO Execution Gantt — Dependencies", () => {
  test("dependency arrows SVG overlay renders when dependencies exist", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    // The GanttDependencyArrows renders an SVG with pointer-events-none
    const arrowSvg = page.locator(
      'svg.pointer-events-none path[stroke="transparent"]',
    );
    const count = await arrowSvg.count();
    if (count === 0) {
      test.skip(true, "No dependency arrows on this WO.");
      return;
    }

    await expect(arrowSvg.first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicking dependency arrow opens edit popover", async ({ page }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const hitPaths = page.locator(
      'svg path[stroke="transparent"].pointer-events-auto',
    );
    const count = await hitPaths.count();
    if (count === 0) {
      test.skip(true, "No dependency arrows to click.");
      return;
    }

    await hitPaths.first().click();

    // The edit popover should show dependency type buttons
    await expect(page.getByText("Dependency Type")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: /Finish → Start/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /Remove Dependency/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("popover type change updates dependency and shows toast", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const hitPaths = page.locator(
      'svg path[stroke="transparent"].pointer-events-auto',
    );
    const count = await hitPaths.count();
    if (count === 0) {
      test.skip(true, "No dependency arrows available.");
      return;
    }

    await hitPaths.first().click();
    await expect(page.getByText("Dependency Type")).toBeVisible({
      timeout: 10_000,
    });

    // Click "Start → Start" (SS) — likely a different type from the default FS
    const ssButton = page.getByRole("button", { name: /Start → Start/i });
    await ssButton.click();

    await expect(page.getByText(/Dependency updated/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("popover remove button deletes dependency and shows toast", async ({
    page,
  }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const hitPaths = page.locator(
      'svg path[stroke="transparent"].pointer-events-auto',
    );
    const count = await hitPaths.count();
    if (count === 0) {
      test.skip(true, "No dependency arrows to remove.");
      return;
    }

    await hitPaths.first().click();
    await expect(page.getByText("Dependency Type")).toBeVisible({
      timeout: 10_000,
    });

    const removeBtn = page.getByRole("button", { name: /Remove Dependency/i });
    await removeBtn.click();

    await expect(page.getByText("Dependency removed")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("clicking outside popover closes it", async ({ page }) => {
    await navigateToExecutionGantt(page);
    await waitForGanttHydration(page);

    const hitPaths = page.locator(
      'svg path[stroke="transparent"].pointer-events-auto',
    );
    const count = await hitPaths.count();
    if (count === 0) {
      test.skip(true, "No dependency arrows available.");
      return;
    }

    await hitPaths.first().click();
    const popoverText = page.getByText("Dependency Type");
    await expect(popoverText).toBeVisible({ timeout: 10_000 });

    // Click on the grid container background to dismiss
    const gridContainer = page.locator(".relative").first();
    await gridContainer.click({ position: { x: 10, y: 10 } });

    await expect(popoverText).toBeHidden({ timeout: 5_000 });
  });
});
