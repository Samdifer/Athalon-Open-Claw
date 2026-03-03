/**
 * auth.setup.ts — Playwright authentication setup
 *
 * Creates or signs in a Clerk test user using the +clerk_test email subaddress.
 * In Clerk dev/test mode, the verification code is always 424242.
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

export const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");
const TEST_CODE = "424242";
const TEST_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL ?? "athelon.e2e+clerk_test@gmail.com";
const TEST_PASSWORD =
  process.env.PLAYWRIGHT_TEST_PASSWORD ?? "ClerkTest123!";

async function fillOtp(page: import("@playwright/test").Page, code: string) {
  await page.waitForTimeout(500);
  // Click the first OTP input box and type the full code via keyboard
  const otpContainer = page.locator('[data-otp-input], [data-otp-root], .cl-otpCodeFieldInput, form input').first();
  await otpContainer.click();
  await page.keyboard.type(code, { delay: 50 });
}

setup.setTimeout(120_000);
setup("create or authenticate Clerk test user", async ({ page }) => {
  const email = TEST_EMAIL;

  // Navigate — Clerk redirects to sign-in
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/sign-in|accounts\.dev/, { timeout: 15_000 });

  // Fill email
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await emailInput.fill(email);

  // Click Continue and wait for URL/DOM to change
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes("clerk") && r.request().method() === "POST", { timeout: 8_000 }).catch(() => null),
    page.getByRole("button", { name: "Continue", exact: true }).click(),
  ]);
  await page.waitForTimeout(1500);

  // Detect which state we're in by checking for OTP inputs or error
  const currentUrl = page.url();
  const pageText = await page.locator("body").innerText().catch(() => "");
  const hasOtp = pageText.toLowerCase().includes("check your email") || pageText.toLowerCase().includes("verify");
  const noAccount = pageText.toLowerCase().includes("find your account") || pageText.toLowerCase().includes("no account");
  const hasPassword = pageText.toLowerCase().includes("enter your password");

  console.log("Page state:", { hasOtp, noAccount, hasPassword, url: currentUrl.substring(0, 80) });

  if (noAccount) {
    // ── Sign Up — account doesn't exist, create it ───────────────────────────
    console.log("Account not found — signing up...");
    await page.getByRole("link", { name: /sign up/i }).click();
    await page.waitForURL(/sign-up/, { timeout: 10_000 });
    await page.waitForTimeout(500);

    // Fill each field individually by label
    const firstName = page.locator('input[name="firstName"]');
    if (await firstName.count() > 0) await firstName.fill("Test");

    const lastName = page.locator('input[name="lastName"]');
    if (await lastName.count() > 0) await lastName.fill("User");

    const signupEmail = page.locator('input[name="emailAddress"], input[type="email"]').first();
    await signupEmail.fill(email);

    const password = page.locator('input[type="password"]').first();
    if (await password.count() > 0) {
      await password.fill(TEST_PASSWORD);
    }

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForTimeout(2000);

    // May need OTP verification after sign-up
    const postSignupText = await page.locator("body").innerText().catch(() => "");
    if (postSignupText.toLowerCase().includes("verify") || postSignupText.toLowerCase().includes("check")) {
      console.log("OTP verification required after sign-up...");
      await fillOtp(page, TEST_CODE);
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }

  } else if (hasPassword) {
    // ── Sign In with password ─────────────────────────────────────────────────
    console.log("Password screen — filling password...");
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.waitFor({ state: "visible", timeout: 5_000 });
    await pwInput.fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

  } else if (hasOtp) {
    // ── Sign In with OTP (email code) ─────────────────────────────────────────
    console.log("OTP screen — entering 424242...");
    await fillOtp(page, TEST_CODE);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

  } else {
    console.log("Unknown state — page text:", pageText.substring(0, 300));
    throw new Error("Unexpected Clerk state after Continue click");
  }

  // Handle factor-two device verification (new device check) — also uses 424242
  await page.waitForTimeout(1500);
  if (page.url().includes("factor-two") || (await page.locator("text=Check your email").isVisible().catch(() => false))) {
    console.log("Factor-two verification — entering 424242...");
    await fillOtp(page, TEST_CODE);
    await page.waitForTimeout(500);
    // OTP may auto-submit after 6 digits — only click Continue if still on Clerk
    if (page.url().includes("accounts.dev") || page.url().includes("sign-in")) {
      await page.getByRole("button", { name: "Continue", exact: true }).click().catch(() => null);
    }
  }

  // Wait for authenticated redirect
  await page.waitForURL(/localhost:3000/, { timeout: 60_000 });

  // Save session immediately
  await page.context().storageState({ path: AUTH_FILE });
  console.log("✅ Session saved for", email, "at", page.url());
});
