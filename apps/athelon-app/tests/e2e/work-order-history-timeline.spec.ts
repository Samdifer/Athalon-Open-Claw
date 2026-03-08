import fs from "fs";
import path from "path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";
import { findFirstEditableWorkOrder } from "./helpers/workOrderRoutes";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);
const TECH_PIN = process.env.PLAYWRIGHT_TEST_TECH_PIN ?? "4242";
const SHOULD_CAPTURE_ARTIFACTS =
  process.env.HISTORY_TIMELINE_CAPTURE_ARTIFACTS === "1";
const ARTIFACT_ROOT = path.resolve(
  __dirname,
  "../../output/playwright/history-timeline",
);

test.use({ storageState: SEEDED_AUTH_FILE });

function makeStamp() {
  return `${Date.now()}`;
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");
}

async function waitForLoad(page: Page) {
  await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .first()
    .waitFor({ state: "hidden", timeout: 12_000 })
    .catch(() => null);
  await page.waitForTimeout(300);
}

async function maybeCapture(
  page: Page,
  artifactDir: string,
  name: string,
): Promise<void> {
  if (!SHOULD_CAPTURE_ARTIFACTS) return;
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({
    path: path.join(artifactDir, `${sanitizeFilePart(name)}.png`),
    fullPage: true,
  });
}

async function selectFirstAircraft(page: Page) {
  const trigger = page.locator("#aircraft").first();
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();

  const firstOption = page.locator("[role='option']").first();
  await expect(firstOption).toBeVisible({ timeout: 5_000 });
  await firstOption.click();
}

async function selectOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
) {
  await trigger.click();
  const option = page.getByRole("option", { name: optionName }).first();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
}

async function submitInlineEntry(textarea: Locator, text: string) {
  await textarea.fill(text);
  const composer = textarea.locator(
    "xpath=ancestor::div[contains(@class,'flex')][1]",
  );
  await composer.locator("button").click();
}

async function handleOptionalTrainingWarning(page: Page) {
  const continueButton = page.getByRole("button", {
    name: /Continue Sign-Off/i,
  });
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
}

async function createDraftWorkOrder(
  page: Page,
  description: string,
): Promise<string> {
  await page.goto("/work-orders/new", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await ensureClerkAuthenticated(page, "/work-orders/new");
  await expect(
    page.getByRole("heading", { name: /New Work Order/i }),
  ).toBeVisible({ timeout: 15_000 });

  await page.locator("#description").fill(description);
  await selectFirstAircraft(page);
  await page
    .locator("button[type='submit']")
    .filter({ hasText: /Create Work Order/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/work-orders\/[^/]+$/, {
    timeout: 20_000,
  });
  return page.url().match(/\/work-orders\/([^/]+)$/)?.[1] ?? "";
}

async function openNotesAndActivityTab(page: Page) {
  await page.getByRole("tab", { name: /Notes & Activity/i }).click();
  await expect(page.getByText(/Work Order Activity/i)).toBeVisible({
    timeout: 10_000,
  });
}

async function createTaskCard(
  page: Page,
  workOrderId: string,
  taskCardNumber: string,
  taskTitle: string,
  stepDescription: string,
) {
  await page.goto(`/work-orders/${workOrderId}/tasks/new`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /New Work Card/i }),
  ).toBeVisible({ timeout: 15_000 });

  await page.locator("#tcNumber").fill(taskCardNumber);
  await page.locator("#title").fill(taskTitle);
  await page.locator("#approvedData").fill("AMM 05-20-00 Rev 9");
  await page
    .locator("label:has-text('Step description')")
    .locator("xpath=following-sibling::*[1]")
    .fill(stepDescription);
  await page.getByRole("button", { name: /Create Work Card/i }).click();

  await expect(page).toHaveURL(
    new RegExp(`/work-orders/${workOrderId}/tasks/[^/]+$`),
    { timeout: 20_000 },
  );
}

async function signCurrentStep(
  page: Page,
  stepDescription: string,
  stepNote: string,
) {
  const stepRow = page
    .getByLabel("Task steps")
    .locator("div.py-3")
    .filter({
      has: page.locator("p").filter({ hasText: stepDescription }),
    })
    .first();

  await expect(stepRow).toBeVisible({ timeout: 10_000 });
  await stepRow.getByRole("button", { name: /^Sign\b/i }).click();
  await expect(
    page.getByRole("heading", { name: /Sign Step 1/i }),
  ).toBeVisible({ timeout: 5_000 });

  await page.getByLabel(/Approved Data Reference/i).fill("AMM 05-20-00 Rev 9");
  await page.getByLabel(/^Notes/i).fill(stepNote);
  await page.getByLabel(/Re-enter PIN to authorize signature/i).fill(TECH_PIN);
  await page.getByRole("button", { name: /^Sign Step$/i }).click();
  await handleOptionalTrainingWarning(page);

  await expect(
    page.getByRole("heading", { name: /Sign Step 1/i }),
  ).not.toBeVisible({ timeout: 20_000 });
}

async function signCurrentCard(page: Page, statement: string) {
  await page.getByRole("button", { name: /^Sign Card$/i }).click();
  await expect(
    page.getByRole("heading", { name: /Sign Work Card/i }),
  ).toBeVisible({ timeout: 5_000 });

  await page.getByLabel(/Return-to-Service Statement/i).fill(statement);
  await page.getByLabel(/Re-enter PIN/i).fill(TECH_PIN);
  await page.getByRole("button", { name: /Sign & Lock Card/i }).click();
  await handleOptionalTrainingWarning(page);

  await expect(page.getByText(/Work Card Signed & Complete/i)).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("History timeline playback", () => {
  test("seeded admin can replay work-order, task-card, and finding history", async ({
    page,
  }, testInfo) => {
    test.slow();
    test.setTimeout(180_000);

    const stamp = makeStamp();
    const artifactDir = path.join(
      ARTIFACT_ROOT,
      sanitizeFilePart(`${testInfo.title}-${stamp}`),
    );
    const draftWorkOrderDescription = `History draft work order ${stamp}`;
    const taskCardNumber = `HIST-TC-${stamp}`;
    const taskTitle = `History validation card ${stamp}`;
    const stepDescription = `History validation step ${stamp}`;
    const taskWriteUpV1 = `History task write-up ${stamp} v1`;
    const taskWriteUpV2 = `History task write-up ${stamp} v2`;
    const handoffNote = `History handoff ${stamp}`;
    const stepNote = `History step sign-off ${stamp}`;
    const rtsStatement =
      `I certify the work identified in history validation ${stamp} was completed in accordance with approved data and is approved for return to service.`;
    const findingDescriptionV1 = `History finding ${stamp} v1`;
    const findingDescriptionV2 = `History finding ${stamp} v2`;
    const correctiveAction = `History corrective action ${stamp}`;

    await test.step("Create a draft work order and verify work-order history", async () => {
      const createdWorkOrderId = await createDraftWorkOrder(
        page,
        draftWorkOrderDescription,
      );
      expect(createdWorkOrderId).toBeTruthy();

      await waitForLoad(page);
      await openNotesAndActivityTab(page);
      await maybeCapture(page, artifactDir, "01-draft-wo-notes-activity");

      const workOrderTimeline = page.getByTestId("work-order-activity-timeline");
      await expect(workOrderTimeline).toContainText("Created");
      await expect(workOrderTimeline).toContainText(draftWorkOrderDescription);
      await expect(workOrderTimeline).toContainText("Evan Harrow");
      await expect(workOrderTimeline).toContainText("Description");
      await expect(workOrderTimeline).toContainText("To:");
    });

    await test.step("Create task-card history on an editable seeded work order", async () => {
      await ensureClerkAuthenticated(page, "/work-orders");
      const editableWorkOrder = await findFirstEditableWorkOrder(page);

      await page.goto(editableWorkOrder.href, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await waitForLoad(page);

      await createTaskCard(
        page,
        editableWorkOrder.id,
        taskCardNumber,
        taskTitle,
        stepDescription,
      );
      await waitForLoad(page);

      await submitInlineEntry(
        page.getByPlaceholder("Add finding entry").first(),
        taskWriteUpV1,
      );
      await page.waitForTimeout(250);
      await submitInlineEntry(
        page.getByPlaceholder("Add finding entry").first(),
        taskWriteUpV2,
      );
      await page.waitForTimeout(250);

      await page.getByPlaceholder("Add a shift handoff note...").fill(handoffNote);
      await page.getByRole("button", { name: /Submit handoff note/i }).click();
      await page.waitForTimeout(250);

      await signCurrentStep(page, stepDescription, stepNote);
      await page.waitForTimeout(250);
      await signCurrentCard(page, rtsStatement);
      await waitForLoad(page);
      await maybeCapture(page, artifactDir, "02-task-history");

      const taskTimeline = page.getByTestId("task-history-timeline");
      await expect(taskTimeline).toContainText("Created");
      await expect(taskTimeline).toContainText("Task Discrepancy Summary Updated");
      await expect(taskTimeline).toContainText("Shift Handoff Notes Updated");
      await expect(taskTimeline).toContainText("Technician Sign-Off Recorded");
      await expect(taskTimeline).toContainText("Sign-Off Recorded");
      await expect(taskTimeline).toContainText("Return-to-Service Statement");
      await expect(taskTimeline).toContainText(taskWriteUpV1);
      await expect(taskTimeline).toContainText(taskWriteUpV2);
      await expect(taskTimeline).toContainText("From:");
      await expect(taskTimeline).toContainText("To:");
      await expect(taskTimeline).toContainText("Evan Harrow");
    });

    await test.step("Create finding history and verify finding timeline", async () => {
      const taskUrlMatch = page.url().match(
        /\/work-orders\/([^/]+)\/tasks\/([^/]+)$/,
      );
      const workOrderId = taskUrlMatch?.[1];
      expect(workOrderId).toBeTruthy();

      await page.goto(`/work-orders/${workOrderId}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await waitForLoad(page);

      await page.getByRole("button", { name: /^Log Finding$/i }).click();
      await expect(
        page.getByRole("heading", { name: /Log Finding/i }),
      ).toBeVisible({ timeout: 5_000 });

      await page.locator("#sq-description").fill(findingDescriptionV1);
      await selectOption(
        page,
        page.locator("#sq-found-during"),
        /Annual Inspection/i,
      );
      await page.getByRole("button", { name: /^Log Finding$/i }).click();

      const findingLink = page
        .locator(`a[href^="/work-orders/${workOrderId}/findings/"]`)
        .filter({ hasText: findingDescriptionV1 })
        .first();
      await expect(findingLink).toBeVisible({ timeout: 20_000 });
      await findingLink.click();
      await waitForLoad(page);

      await submitInlineEntry(
        page.getByPlaceholder("Add finding entry").first(),
        findingDescriptionV2,
      );
      await page.waitForTimeout(250);
      await submitInlineEntry(
        page.getByPlaceholder("Add corrective action entry").first(),
        correctiveAction,
      );
      await waitForLoad(page);
      await maybeCapture(page, artifactDir, "03-finding-history");

      const findingTimeline = page.getByTestId("finding-history-timeline");
      await expect(findingTimeline).toContainText("Created");
      await expect(findingTimeline).toContainText("Description Updated");
      await expect(findingTimeline).toContainText("Corrective Action Updated");
      await expect(findingTimeline).toContainText(findingDescriptionV1);
      await expect(findingTimeline).toContainText(findingDescriptionV2);
      await expect(findingTimeline).toContainText(correctiveAction);
      await expect(findingTimeline).toContainText("From:");
      await expect(findingTimeline).toContainText("To:");
      await expect(findingTimeline).toContainText("Evan Harrow");
    });

    await test.step("Verify the aggregated work-order timeline orders new events first", async () => {
      const findingUrlMatch = page.url().match(
        /\/work-orders\/([^/]+)\/findings\/([^/]+)$/,
      );
      const workOrderId = findingUrlMatch?.[1];
      expect(workOrderId).toBeTruthy();

      await page.goto(`/work-orders/${workOrderId}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await waitForLoad(page);
      await openNotesAndActivityTab(page);
      await maybeCapture(page, artifactDir, "04-aggregated-work-order-history");

      const workOrderTimeline = page.getByTestId("work-order-activity-timeline");
      const firstItem = page
        .getByTestId("work-order-activity-timeline-item")
        .first();

      await expect(firstItem).toContainText("Corrective Action Updated");
      await expect(workOrderTimeline).toContainText(taskCardNumber);
      await expect(workOrderTimeline).toContainText("Step 1");
      await expect(workOrderTimeline).toContainText(correctiveAction);
      await expect(workOrderTimeline).toContainText(findingDescriptionV2);
      await expect(workOrderTimeline).toContainText("Evan Harrow");
    });
  });
});
