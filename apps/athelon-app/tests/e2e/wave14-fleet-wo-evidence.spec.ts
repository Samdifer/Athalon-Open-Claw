import { expect, test } from "@playwright/test";
import { ensureClerkAuthenticated } from "./helpers/clerkAuth";

async function waitForLoad(page: import("@playwright/test").Page) {
  await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .first()
    .waitFor({ state: "hidden", timeout: 12_000 })
    .catch(() => null);
  await page.waitForTimeout(300);
}

async function openFirstWorkOrderDetail(page: import("@playwright/test").Page): Promise<boolean> {
  const links = page.locator('a[href^="/work-orders/"]');
  const count = await links.count();

  for (let i = 0; i < count; i += 1) {
    const href = await links.nth(i).getAttribute("href");
    if (!href) continue;
    const valid = /^\/work-orders\/[A-Za-z0-9]+$/.test(href);
    if (!valid) continue;
    const slug = href.replace("/work-orders/", "");
    if (["new", "kanban", "dashboard", "lead", "handoff", "templates"].includes(slug)) {
      continue;
    }
    await page.goto(href);
    return true;
  }

  return false;
}

test.describe("Wave 14 — Fleet/WO Views + Evidence Hub", () => {
  test("fleet page supports list/tile/truncated modes", async ({ page }) => {
    await page.goto("/fleet");
    await ensureClerkAuthenticated(page, "/fleet");
    await waitForLoad(page);

    await expect(page.getByRole("heading", { name: /Fleet/i })).toBeVisible();

    const noAircraft = await page
      .getByText(/No aircraft in your fleet/i)
      .isVisible()
      .catch(() => false);
    if (noAircraft) {
      test.skip(true, "No aircraft records available in seeded org.");
    }

    await page.getByTestId("fleet-view-tiles").click();
    await expect(page.getByTestId("fleet-view-tiles-container")).toBeVisible();

    await page.getByTestId("fleet-view-truncated").click();
    await expect(page.getByTestId("fleet-view-truncated-container")).toBeVisible();

    await page.getByTestId("fleet-view-list").click();
    await expect(page.getByTestId("fleet-view-list-container")).toBeVisible();
  });

  test("work orders page supports list/tile/truncated modes", async ({ page }) => {
    await page.goto("/work-orders");
    await ensureClerkAuthenticated(page, "/work-orders");
    await waitForLoad(page);

    await expect(page.getByRole("heading", { name: /Work Orders/i })).toBeVisible();

    const noWorkOrders = await page
      .getByText(/No work orders yet/i)
      .isVisible()
      .catch(() => false);
    if (noWorkOrders) {
      test.skip(true, "No work orders available in seeded org.");
    }

    await page.getByTestId("wo-view-tiles").click();
    await expect(page.getByTestId("wo-view-tiles-container")).toBeVisible();

    await page.getByTestId("wo-view-truncated").click();
    await expect(page.getByTestId("wo-view-truncated-container")).toBeVisible();

    await page.getByTestId("wo-view-list").click();
    await expect(page.getByTestId("wo-view-list-container")).toBeVisible();
  });

  test("work-order detail exposes in-dock and RTS evidence hub", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/work-orders");
    await ensureClerkAuthenticated(page, "/work-orders");
    await waitForLoad(page);

    const opened = await openFirstWorkOrderDetail(page);
    if (!opened) {
      test.skip(true, "No work-order detail routes available in seeded org.");
    }

    await ensureClerkAuthenticated(page, page.url());
    await waitForLoad(page);

    await page.getByRole("tab", { name: /Compliance/i }).click();
    await page.getByRole("button", { name: /RTS Evidence & Media/i }).click();
    await expect(page.getByTestId("wo-evidence-tab")).toBeVisible();
    await expect(page.getByText(/In-dock Evidence/i)).toBeVisible();
    await expect(page.getByText(/Return-to-Service Evidence/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Upload$/i }).first()).toBeVisible();
  });
});
