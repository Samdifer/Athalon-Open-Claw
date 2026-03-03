import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs/promises";

const SEEDED_AUTH_FILE = path.join(__dirname, "../playwright/.auth/seeded-admin.json");

const MODULE_CRITICAL_PATHS = [
  { slug: "dashboard", path: "/dashboard" },
  { slug: "fleet", path: "/fleet" },
  { slug: "work-orders", path: "/work-orders" },
  { slug: "parts", path: "/parts" },
  { slug: "billing-invoices", path: "/billing/invoices" },
  { slug: "scheduling", path: "/scheduling" },
  { slug: "personnel", path: "/personnel" },
  { slug: "compliance", path: "/compliance" },
  { slug: "squawks", path: "/squawks" },
  { slug: "reports", path: "/reports" },
  { slug: "settings-shop", path: "/settings/shop" },
];

const ARTIFACT_ROOT = path.resolve(__dirname, "../artifacts/wave5-critical-path");
const SCREENSHOT_DIR = path.join(ARTIFACT_ROOT, "screenshots");
const VIDEO_DIR = path.join(ARTIFACT_ROOT, "videos");

test.use({
  storageState: SEEDED_AUTH_FILE,
  video: "on",
});
test.setTimeout(180_000);

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await fs.mkdir(VIDEO_DIR, { recursive: true });
});

for (const moduleRoute of MODULE_CRITICAL_PATHS) {
  test(`capture artifacts for ${moduleRoute.path}`, async ({ page }) => {
    const video = page.video();

    await page.goto(moduleRoute.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1_000);

    const isLoadingVisible = await page
      .getByTestId("page-loading-state")
      .first()
      .isVisible()
      .catch(() => false);
    if (isLoadingVisible) {
      await page
        .getByTestId("page-loading-state")
        .first()
        .waitFor({ state: "hidden", timeout: 5_000 })
        .catch(() => null);
    }

    const finalUrl = page.url();
    expect(
      finalUrl.includes("/sign-in") || finalUrl.includes("accounts.dev"),
      `${moduleRoute.path} unexpectedly redirected to auth (${finalUrl})`,
    ).toBeFalsy();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${moduleRoute.slug}.png`),
      fullPage: true,
    });

    await page.close();

    if (video) {
      const savedVideoPath = await video.path();
      await fs.copyFile(savedVideoPath, path.join(VIDEO_DIR, `${moduleRoute.slug}.webm`));
    }
  });
}
