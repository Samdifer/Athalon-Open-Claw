import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const SEEDED_AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/seeded-admin.json");

test.use({ storageState: SEEDED_AUTH_FILE });

function isAliveUrl(url: string): boolean {
  return (
    url.includes("localhost:3000") ||
    url.includes("sign-in") ||
    url.includes("accounts.dev") ||
    url.includes("clerk")
  );
}

async function smokeCheck(page: import("@playwright/test").Page, routePath: string) {
  const response = await page.goto(routePath, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  if (response) {
    expect(response.status(), `${routePath} returned HTTP ${response.status()}`).toBeLessThan(500);
  }

  const finalUrl = page.url();
  expect(isAliveUrl(finalUrl), `${routePath} redirected unexpectedly to ${finalUrl}`).toBeTruthy();
}

test.describe("TEAM-Q closeout remediation smoke", () => {
  test("route smoke: /personnel/:id/training", async ({ page }) => {
    await smokeCheck(page, "/personnel/e2e-tech/training");
  });

  test("route smoke: /parts/alerts + /work-orders/handoff", async ({ page }) => {
    await smokeCheck(page, "/parts/alerts");
    await smokeCheck(page, "/work-orders/handoff");
  });

  test("route smoke: /fleet/calendar", async ({ page }) => {
    await smokeCheck(page, "/fleet/calendar");
  });

  test("PWA registration bootstrap remains wired", async () => {
    const registrationSource = fs.readFileSync(
      path.resolve(__dirname, "../../src/bootstrap/registerServiceWorker.ts"),
      "utf8",
    );

    expect(registrationSource).toContain("registerSW(");
    expect(registrationSource).toContain("import.meta.env.PROD");
    expect(registrationSource).toContain("immediate: true");
  });

  test("PWA build artifacts are generated", async () => {
    const distDir = path.resolve(__dirname, "../../dist");
    const manifestPath = path.join(distDir, "manifest.webmanifest");
    const swPath = path.join(distDir, "sw.js");

    expect(fs.existsSync(manifestPath), "manifest.webmanifest should exist after vite build").toBeTruthy();
    expect(fs.existsSync(swPath), "sw.js should exist after vite build").toBeTruthy();

    const manifestRaw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw) as {
      name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src?: string }>;
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect((manifest.start_url ?? "").startsWith("/")).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect((manifest.icons?.length ?? 0) > 0).toBeTruthy();
  });
});
