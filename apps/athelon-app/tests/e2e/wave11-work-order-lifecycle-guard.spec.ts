/**
 * wave11-work-order-lifecycle-guard.spec.ts
 *
 * Deterministic WRL lifecycle chain guard.
 * Covers: detail -> task path -> records -> RTS -> release in one suite.
 */

import { test, expect, type Page } from "@playwright/test";

const RESERVED_SEGMENTS = new Set(["new", "kanban", "templates", "signature", "rts", "release"]);
const CONVEX_ID_RE = /^[A-Za-z0-9]{10,}$/;

function isConvexIdLike(value: string): boolean {
  return CONVEX_ID_RE.test(value);
}

async function getFirstWorkOrderRef(page: Page): Promise<string | null> {
  await page.goto("/work-orders", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Work Orders/i })).toBeVisible({
    timeout: 15_000,
  });

  const rowLinks = page.locator("table tbody a[href^='/work-orders/']");
  const count = await rowLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await rowLinks.nth(i).getAttribute("href");
    const match = href?.match(/^\/work-orders\/([^/]+)/);
    const ref = match?.[1];
    if (ref && !RESERVED_SEGMENTS.has(ref.toLowerCase())) {
      return ref;
    }
  }

  return null;
}

async function createWorkOrderFallback(page: Page): Promise<string | null> {
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
  await aircraftSelect.click();
  const listbox = page.locator("[role='listbox']").last();
  const firstOption = listbox.locator("[role='option']").first();
  await expect(firstOption).toBeVisible({ timeout: 5_000 });
  await firstOption.click();

  await page.locator("#description").fill(`WRL lifecycle route guard ${Date.now()}`);
  const createButton = page.getByRole("button", { name: /Create Work Order/i });
  await expect(createButton).toBeEnabled({ timeout: 8_000 });
  await createButton.click();

  await expect(page).not.toHaveURL(/\/work-orders\/new$/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/work-orders\/[^/]+$/, { timeout: 20_000 });

  const match = page.url().match(/\/work-orders\/([^/]+)$/);
  const ref = match?.[1] ?? null;
  if (!ref || RESERVED_SEGMENTS.has(ref.toLowerCase())) {
    return null;
  }
  return ref;
}

async function ensureWorkOrderRef(page: Page): Promise<string> {
  const existing = await getFirstWorkOrderRef(page);
  if (existing) return existing;

  const created = await createWorkOrderFallback(page);
  if (created) return created;

  throw new Error(
    "Unable to run lifecycle route guard: no existing work order and no aircraft available to create one.",
  );
}

async function resolveCanonicalWorkOrderId(page: Page, workOrderRef: string): Promise<string> {
  if (isConvexIdLike(workOrderRef)) {
    return workOrderRef;
  }

  await page.goto(`/work-orders/${workOrderRef}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const candidateLinks = page.locator(
    "a[href*='/tasks/new'], a[href*='/records'], a[href*='/release'], a[href*='/rts']",
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

  throw new Error(`Could not resolve canonical work-order ID from ref "${workOrderRef}".`);
}

test.describe("Work Order Lifecycle Guard (WRL)", () => {
  test("detail to task/records/rts/release chain stays routable and gated", async ({ page }) => {
    const workOrderRef = await ensureWorkOrderRef(page);
    const workOrderId = await resolveCanonicalWorkOrderId(page, workOrderRef);

    await page.goto(`/work-orders/${workOrderId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const addTaskLink = page.getByRole("link", { name: /Add Task Card/i }).first();
    await expect(addTaskLink).toBeVisible({ timeout: 15_000 });
    const addTaskHref = await addTaskLink.getAttribute("href");
    expect(addTaskHref).toMatch(new RegExp(`^/work-orders/${workOrderId}/tasks/new$`));

    await addTaskLink.click();
    const taskCreateFormVisible = await page
      .getByRole("heading", { name: /New (Task|Work) Card/i })
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (taskCreateFormVisible) {
      await expect(page.locator("label:has-text('Step description')").first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Create Task Card/i })).toBeVisible();
    } else {
      await expect(page.getByText(/Cannot add (task|work) cards?/i)).toBeVisible();
    }

    await page.goto(`/work-orders/${workOrderId}/records`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: /Maintenance Records/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(`/work-orders/${workOrderId}/rts`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle");
    const rtsHeadingVisible = await page
      .getByRole("heading", { name: /Return to Service Authorization/i })
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    const rtsAlreadyVisible = await page
      .getByText(/Return-to-Service Already Authorized/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(rtsHeadingVisible || rtsAlreadyVisible).toBe(true);

    await page.goto(`/work-orders/${workOrderId}/release`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /Release Aircraft to Customer/i }),
    ).toBeVisible({ timeout: 20_000 });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(
      /Return-to-Service Not Authorized|Return-to-Service authorized/i,
    );
  });
});
