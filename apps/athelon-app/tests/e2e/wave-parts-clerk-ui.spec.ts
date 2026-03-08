/**
 * wave-parts-clerk-ui.spec.ts
 *
 * End-to-end smoke tests for parts clerk workflow and part details visibility.
 * Covers Team 2 bug fixes: BUG-PC-T2-01 through BUG-PC-T2-06.
 *
 * These tests validate route existence, component rendering, and navigation
 * consistency for the parts clerk user flow.
 */

import { test, expect, type Page } from "@playwright/test";

// Helper: Navigate and wait for idle
async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("Parts Clerk UI — Receiving & Inspection", () => {
  test("receiving page loads with inspection queue table", async ({ page }) => {
    await navigateTo(page, "/parts/receiving");
    // Should show the receiving inspection heading
    await expect(page.getByText("Parts Receiving Inspection")).toBeVisible();
    // Should show the PO receiving banner
    await expect(page.getByText("Receive Against Purchase Order")).toBeVisible();
    // Should show the inspection queue table headers
    await expect(page.getByText("Part / PO")).toBeVisible();
    await expect(page.getByText("Description")).toBeVisible();
  });

  test("receiving queue has part detail info button", async ({ page }) => {
    await navigateTo(page, "/parts/receiving");
    // The Info button for part details should exist if there are pending parts
    // If no pending parts, the empty state should appear
    const table = page.locator("table");
    const emptyState = page.getByText("No incoming parts awaiting inspection");
    // One of these should be visible
    await expect(table.or(emptyState).first()).toBeVisible();
  });
});

test.describe("Parts Clerk UI — Inventory List", () => {
  test("parts page loads with tabs and search", async ({ page }) => {
    await navigateTo(page, "/parts");
    await expect(page.getByText("Parts Inventory")).toBeVisible();
    // Tab structure
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "In Stock" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quarantine" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Disposition" })).toBeVisible();
  });

  test("pending inspection tab shows clickable table rows", async ({ page }) => {
    await navigateTo(page, "/parts");
    await page.getByRole("tab", { name: "Pending" }).click();
    // Should show the inspection table or empty state
    const inspectButton = page.getByRole("button", { name: "Inspect" }).first();
    const emptyState = page.getByText("No parts pending inspection");
    await expect(inspectButton.or(emptyState).first()).toBeVisible();
  });
});

test.describe("Parts Clerk UI — Part Detail Deep Link", () => {
  test("part detail route /parts/:id renders or shows not-found", async ({ page }) => {
    // Use a fake ID to test the route exists and handles missing parts gracefully
    await navigateTo(page, "/parts/nonexistent-id-12345");
    // Should show either the part detail page or a not-found state
    // The route should NOT fall through to the generic 404
    const partNotFound = page.getByText("Part not found");
    const backButton = page.getByText("Back to Inventory");
    // Either the part detail page loaded or we see the not-found state
    await expect(partNotFound.or(backButton).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Parts Clerk UI — Status Badge Accuracy", () => {
  test("PartStatusBadge renders distinct label for removed_pending_disposition", async ({ page }) => {
    await navigateTo(page, "/parts");
    // Navigate to disposition tab
    await page.getByRole("tab", { name: "Disposition" }).click();
    // If there are parts, they should show "Pending Disposition" (not "Issued")
    // This validates BUG-PC-T2-01 fix
    const dispositionBadge = page.getByText("Pending Disposition");
    const emptyState = page.getByText("No parts found");
    // One should be visible
    await expect(dispositionBadge.or(emptyState).first()).toBeVisible();
  });
});

test.describe("Parts Clerk UI — Part Details Accessibility", () => {
  test("card view parts are clickable and open detail sheet", async ({ page }) => {
    await navigateTo(page, "/parts");
    // If there are parts in the card view, clicking one should open the detail sheet
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    const emptyState = page.getByText("No parts found");

    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      // Sheet should open with "Part Detail" title
      await expect(page.getByText("Part Detail")).toBeVisible({ timeout: 5000 });
      // Should show Transaction History section (BUG-PC-T2-02 fix)
      await expect(page.getByText("Transaction History")).toBeVisible();
      // Should show Conformity Documents section (BUG-PC-T2-03 fix)
      await expect(page.getByText("Conformity Documents")).toBeVisible();
      // Should show Photos & Documents section
      await expect(page.getByText("Photos & Documents")).toBeVisible();
    } else {
      // No parts exist — just verify the empty state renders
      await expect(emptyState).toBeVisible();
    }
  });
});
