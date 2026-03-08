import { test, expect } from "@playwright/test";
import path from "path";

const UNLINKED_AUTH_FILE = path.join(__dirname, "../playwright/.auth/unlinked-user.json");

test.use({ storageState: UNLINKED_AUTH_FILE });
test.describe.configure({ mode: "serial" });

test("unlinked user is routed to onboarding from internal route", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  if (page.url().endsWith("/dashboard")) {
    test.skip(true, "Persona already bootstrapped; no onboarding redirect expected.");
  }
  await page.waitForURL(/\/onboarding$/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("onboarding bootstrap completes and routes user to dashboard", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });

  if (page.url().includes("/dashboard")) {
    test.skip(true, "Persona already bootstrapped; onboarding form not available.");
  }

  await page.getByLabel(/organization name/i).fill(`E2E Bootstrap Org ${Date.now()}`);
  await page.getByLabel(/your legal name/i).fill("E2E Bootstrap Admin");
  await page.getByLabel(/country/i).fill("US");
  await page.getByLabel(/state/i).fill("CO");
  await page.getByLabel(/city/i).fill("Denver");
  await page.getByRole("combobox", { name: /timezone/i }).click();
  await page.getByRole("option", { name: /mountain \(mt\) - america\/denver/i }).click();

  await page.getByRole("button", { name: /complete setup/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25_000 });
});
