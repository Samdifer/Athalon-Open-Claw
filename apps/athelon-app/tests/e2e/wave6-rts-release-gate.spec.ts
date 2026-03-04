import { test, expect, type Page } from "@playwright/test";

const RESERVED_SEGMENTS = new Set(["new", "kanban", "templates", "signature", "rts", "release"]);
const CONVEX_ID_RE = /^[A-Za-z0-9]{10,}$/;

function isConvexIdLike(value: string): boolean {
  return CONVEX_ID_RE.test(value);
}

async function openWorkOrdersList(page: Page) {
  await page.goto("/work-orders", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Work Orders/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function getFirstWoIdFromList(page: Page): Promise<string | null> {
  await openWorkOrdersList(page);

  const rowLinks = page.locator("table tbody a[href^='/work-orders/']");
  const rowCount = await rowLinks.count();
  for (let i = 0; i < rowCount; i++) {
    const href = await rowLinks.nth(i).getAttribute("href");
    const match = href?.match(/^\/work-orders\/([^/]+)/);
    const id = match?.[1];
    if (id && !RESERVED_SEGMENTS.has(id.toLowerCase()) && isConvexIdLike(id)) {
      return id;
    }
  }

  return null;
}

async function createWorkOrderForReleaseCoverage(page: Page): Promise<string | null> {
  await page.goto("/work-orders/new", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /New Work Order/i })).toBeVisible({
    timeout: 15_000,
  });

  const noAircraft = page
    .locator("text=No aircraft registered. Add aircraft in Fleet first.")
    .first();
  if (await noAircraft.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return null;
  }

  const aircraftSelect = page.locator("#aircraft");
  await expect(aircraftSelect).toBeVisible({ timeout: 10_000 });
  await aircraftSelect.click();
  const aircraftListbox = page.locator("[role='listbox']").last();
  const firstAircraftOption = aircraftListbox.locator("[role='option']").first();
  await expect(firstAircraftOption).toBeVisible({ timeout: 5_000 });
  await firstAircraftOption.click();

  await page.locator("#description").fill(`WRL RTS gate seed ${Date.now()}`);
  const createButton = page.getByRole("button", { name: /Create Work Order/i });
  await expect(createButton).toBeEnabled({ timeout: 8_000 });
  await createButton.click();

  await expect(page).not.toHaveURL(/\/work-orders\/new$/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/work-orders\/[^/]+$/, { timeout: 20_000 });
  const match = page.url().match(/\/work-orders\/([^/]+)$/);
  const id = match?.[1] ?? null;
  if (!id || RESERVED_SEGMENTS.has(id.toLowerCase())) {
    return null;
  }
  return id;
}

async function resolveCanonicalWorkOrderId(page: Page, workOrderRef: string): Promise<string | null> {
  if (isConvexIdLike(workOrderRef)) {
    return workOrderRef;
  }

  await page.goto(`/work-orders/${workOrderRef}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const candidateLinks = page.locator(
    "a[href*='/release'], a[href*='/tasks/new'], a[href*='/records'], a[href*='/rts']",
  );
  const count = await candidateLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await candidateLinks.nth(i).getAttribute("href");
    const match = href?.match(/^\/work-orders\/([^/]+)\//);
    const candidate = match?.[1];
    if (candidate && isConvexIdLike(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function ensureWorkOrderId(page: Page): Promise<string> {
  const createdRef = await createWorkOrderForReleaseCoverage(page);
  if (createdRef) {
    const resolved = await resolveCanonicalWorkOrderId(page, createdRef);
    if (resolved) return resolved;
  }

  const existing = await getFirstWoIdFromList(page);
  if (existing) return existing;

  throw new Error(
    "Unable to run RTS/release assertions: no existing work orders and no aircraft available to create one.",
  );
}

async function openReleasePage(page: Page, woId: string) {
  await page.goto(`/work-orders/${woId}/release`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /Release Aircraft to Customer/i }),
  ).toBeVisible({ timeout: 20_000 });
}

async function getReleaseGateState(page: Page) {
  const hasBlocker = await page
    .getByText(/Return-to-Service Not Authorized/i)
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  const hasAuthorizedState = await page
    .getByText(/Return-to-Service authorized/i)
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  expect(hasBlocker || hasAuthorizedState).toBe(true);
  return { hasBlocker, hasAuthorizedState };
}

test.describe("Work Order Release Page — RTS Gate (AI-025)", () => {
  test("work orders list page renders without runtime errors", async ({ page }) => {
    await openWorkOrdersList(page);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("TypeError");
    expect(body).not.toContain("Cannot read properties of undefined");
  });

  test("release page loads for a deterministic work order", async ({ page }) => {
    const woId = await ensureWorkOrderId(page);
    await openReleasePage(page, woId);
  });

  test("RTS gate always renders either blocking or authorized state", async ({ page }) => {
    const woId = await ensureWorkOrderId(page);
    await openReleasePage(page, woId);

    const { hasBlocker, hasAuthorizedState } = await getReleaseGateState(page);
    const bodyText = await page.locator("body").textContent();

    if (hasBlocker) {
      expect(bodyText).toMatch(/14 CFR|Part 145/i);
    }
    if (hasAuthorizedState) {
      expect(bodyText).toMatch(/airworthy/i);
    }
  });

  test("release flow never routes operators to /signature", async ({ page }) => {
    const woId = await ensureWorkOrderId(page);
    await openReleasePage(page, woId);

    const { hasBlocker } = await getReleaseGateState(page);
    const signatureLinks = page.locator(`a[href='/work-orders/${woId}/signature']`);
    await expect(signatureLinks).toHaveCount(0);

    if (hasBlocker) {
      const rtsLink = page
        .getByRole("link", { name: /Go to RTS Authorization/i })
        .first();
      await expect(rtsLink).toBeVisible({ timeout: 5_000 });
      await expect(rtsLink).toHaveAttribute("href", `/work-orders/${woId}/rts`);
    }
  });

  test("release button enforces RTS + required total-time gate", async ({ page }) => {
    const woId = await ensureWorkOrderId(page);
    await openReleasePage(page, woId);

    const { hasBlocker } = await getReleaseGateState(page);
    const releaseButton = page.getByRole("button", {
      name: /^Release Aircraft to Customer$/i,
    });
    const totalTimeInput = page.locator("input[type='number']").first();

    await expect(totalTimeInput).toBeVisible({ timeout: 8_000 });
    await expect(releaseButton).toBeDisabled();

    await totalTimeInput.fill("1234.5");

    if (hasBlocker) {
      await expect(releaseButton).toBeDisabled();
    } else {
      await expect(releaseButton).toBeEnabled();
    }
  });
});
