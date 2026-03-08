import { expect, type Page } from "@playwright/test";

const RESERVED_WORK_ORDER_SEGMENTS = new Set([
  "new",
  "kanban",
  "templates",
  "lead",
  "handoff",
  "dashboard",
  "signature",
  "rts",
  "release",
]);

const EDITABLE_STATUS_RE =
  /\bIn Progress\b|\bOpen\b|\bOpen Discrepancies\b|\bPending Inspection\b/i;

export type WorkOrderRouteRef = {
  id: string;
  href: string;
  rowText: string;
};

function extractWorkOrderIdFromHref(href: string | null): string | null {
  const match = href?.match(/^\/work-orders\/([^/]+)$/);
  const candidate = match?.[1] ?? null;
  if (!candidate) return null;
  if (RESERVED_WORK_ORDER_SEGMENTS.has(candidate.toLowerCase())) return null;
  return candidate;
}

export async function openWorkOrdersListInListView(page: Page): Promise<void> {
  await page.goto("/work-orders", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /Work Orders/i }),
  ).toBeVisible({ timeout: 15_000 });

  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
}

export async function findFirstEditableWorkOrder(
  page: Page,
): Promise<WorkOrderRouteRef> {
  await openWorkOrdersListInListView(page);

  const rowLinks = page.locator("main a[href^='/work-orders/']");
  const count = await rowLinks.count();

  for (let i = 0; i < count; i += 1) {
    const link = rowLinks.nth(i);
    const href = await link.getAttribute("href");
    const id = extractWorkOrderIdFromHref(href);
    if (!id) continue;

    const rowText = ((await link.innerText().catch(() => "")) ?? "").trim();
    if (!EDITABLE_STATUS_RE.test(rowText)) continue;

    return {
      id,
      href: href!,
      rowText,
    };
  }

  throw new Error(
    "No editable work order row was found in the work-orders table.",
  );
}
