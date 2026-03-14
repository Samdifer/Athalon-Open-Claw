import { promises as fs } from "node:fs";
import { test, expect } from "@playwright/test";

test.describe("Parts Bulk Upload", () => {
  test("imports a batch and shows it in the issue queue", async ({ page }, testInfo) => {
    const runId = `PW-BULK-${Date.now()}`;
    const batchLabel = `${runId.toLowerCase()}-batch`;
    const csvPath = testInfo.outputPath(`parts-upload-${runId}.csv`);
    const csv = [
      "Part Number,Part Name,Condition,Supplier,Qty On Hand",
      `${runId}-A,Playwright Uploaded Part A,new,Playwright Vendor,3`,
      `${runId}-B,Playwright Uploaded Part B,serviceable,Playwright Vendor,1`,
    ].join("\n");

    await fs.writeFile(csvPath, csv, "utf8");

    await page.goto("/parts/upload", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /bulk parts upload/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByLabel(/Batch Label/i).fill(batchLabel);
    await expect(
      page.getByRole("button", { name: /Continue — Map Columns/i }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /Continue — Map Columns/i }).click();

    await expect(page.getByText(/Map your spreadsheet columns/i)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /Continue — Validate/i }).click();

    await expect(page.getByText(/Duplicate Detection/i)).toBeVisible({
      timeout: 15_000,
    });

    const commitButton = page.getByRole("button", { name: /Commit \(2 parts\)/i });
    await expect(commitButton).toBeVisible({ timeout: 15_000 });
    await commitButton.click();

    await expect(
      page.getByRole("tab", { name: /Successfully Added \(2\)/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`${runId}-A`)).toBeVisible();
    await expect(page.getByText(`${runId}-B`)).toBeVisible();

    await page.getByRole("link", { name: /View Issue Queue/i }).click();
    await expect(page).toHaveURL(/\/parts\/upload\/issues$/);

    const batchButton = page.getByRole("button", { name: new RegExp(batchLabel, "i") });
    await expect(batchButton).toBeVisible({ timeout: 15_000 });
    await batchButton.click();

    await expect(page.getByRole("heading", { name: new RegExp(batchLabel, "i") })).toBeVisible();
    await expect(page.getByText(/Total issues: 0/i)).toBeVisible();
    await expect(
      page.getByText(/No issues in this batch — all rows were processed successfully/i),
    ).toBeVisible();
  });
});
