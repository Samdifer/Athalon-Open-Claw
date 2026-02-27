/**
 * Playwright global setup for Clerk-authenticated E2E projects.
 *
 * Uses Clerk default testing values in dev mode:
 * - Email with `+clerk_test` subaddress
 * - OTP code: 424242
 *
 * If a test user already exists, it signs in.
 * If not, it signs up and verifies with 424242.
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Clerk default dev testing values
const TEST_OTP = "424242";
const TEST_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL ?? "athelon.e2e+clerk_test@gmail.com";
const TEST_PASSWORD =
  process.env.PLAYWRIGHT_TEST_PASSWORD ?? "ClerkTest123!";
const TEST_USER_ID = process.env.PLAYWRIGHT_TEST_USER_ID;

interface ClerkUser {
  id: string;
}

function clerkBAPI<T = unknown>(
  method: string,
  apiPath: string,
  body?: object,
): Promise<T> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY not set");

  return new Promise<T>((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "api.clerk.com",
        path: `/v1${apiPath}`,
        method,
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status >= 400) {
            reject(
              new Error(
                `Clerk BAPI ${method} ${apiPath} failed (${status}): ${raw}`,
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            resolve(raw as unknown as T);
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function findUserByEmail(email: string): Promise<ClerkUser | null> {
  const users = await clerkBAPI<ClerkUser[]>(
    "GET",
    `/users?limit=1&email_address[]=${encodeURIComponent(email)}`,
  );
  return users[0] ?? null;
}

async function createTestUser(email: string, password: string): Promise<ClerkUser> {
  return clerkBAPI<ClerkUser>("POST", "/users", {
    email_address: [email],
    password,
    first_name: "E2E",
    last_name: "Tester",
    skip_password_checks: true,
  });
}

async function ensureUserPassword(userId: string, password: string): Promise<void> {
  await clerkBAPI("PATCH", `/users/${userId}`, {
    password,
    skip_password_checks: true,
  });
}

async function resolveTestUserId(): Promise<string> {
  if (TEST_USER_ID) return TEST_USER_ID;

  const existing = await findUserByEmail(TEST_EMAIL);
  if (existing) {
    await ensureUserPassword(existing.id, TEST_PASSWORD).catch((err) => {
      console.warn(`Could not refresh password for Clerk user ${existing.id}:`, err);
    });
    return existing.id;
  }

  const created = await createTestUser(TEST_EMAIL, TEST_PASSWORD);
  return created.id;
}

async function createSignInTokenUrl(userId: string): Promise<string> {
  const result = await clerkBAPI<{ url?: string }>("POST", "/sign_in_tokens", {
    user_id: userId,
  });
  if (!result.url) {
    throw new Error(
      `Clerk sign_in_tokens response missing url for user ${userId}`,
    );
  }
  return result.url;
}

async function isAuthenticatedAtApp(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const url = page.url();
  if (url.includes("sign-in") || url.includes("accounts.dev") || url.includes("factor")) {
    return false;
  }
  const emailVisible = await page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first()
    .isVisible()
    .catch(() => false);
  return !emailVisible;
}

async function verifyAuthenticatedAtDashboard(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  await page.goto(`${BASE_URL}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(1000);
  return isAuthenticatedAtApp(page);
}

async function clickContinue(page: import("@playwright/test").Page) {
  const exactContinue = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  if ((await exactContinue.count()) > 0) {
    await exactContinue.first().click();
    return;
  }
  await page.locator('button:has-text("Continue")').last().click();
}

async function fillOtp(page: import("@playwright/test").Page) {
  const otpTarget = page
    .locator(
      '[data-otp-input], [data-otp-root], input[name*="code"], input[inputmode="numeric"]',
    )
    .first();
  await otpTarget.click({ force: true, timeout: 10_000 }).catch(() => null);
  await page.keyboard.type(TEST_OTP, { delay: 70 });
  await page.waitForTimeout(600);
  await clickContinue(page).catch(() => null);
}

async function uiSignInOrSignUp(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForURL(/sign-in|accounts\.dev/, { timeout: 30_000 }).catch(() => null);

  const emailInput = page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.fill(TEST_EMAIL);
  const initialPassword = page.locator('input[type="password"]').first();
  if ((await initialPassword.count()) > 0) {
    await initialPassword.fill(TEST_PASSWORD);
  }
  await clickContinue(page);
  await page.waitForTimeout(1200);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (await isAuthenticatedAtApp(page)) return;

    const bodyText = (await page.locator("body").innerText().catch(() => ""))
      .toLowerCase();

    const noAccount =
      bodyText.includes("find your account") || bodyText.includes("no account");
    const hasPassword = bodyText.includes("password");
    const needsCode =
      bodyText.includes("check your email") ||
      bodyText.includes("verification") ||
      page.url().includes("factor");

    if (noAccount) {
      await page.getByRole("link", { name: /sign up/i }).click();
      await page.waitForURL(/sign-up|accounts\.dev/, { timeout: 20_000 });
      await page.waitForTimeout(500);

      const firstName = page.locator('input[name="firstName"]').first();
      if (await firstName.count()) await firstName.fill("E2E");
      const lastName = page.locator('input[name="lastName"]').first();
      if (await lastName.count()) await lastName.fill("Tester");

      const signUpEmail = page
        .locator('input[name="emailAddress"], input[type="email"]')
        .first();
      await signUpEmail.fill(TEST_EMAIL);

      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.count()) {
        await passwordInput.fill(TEST_PASSWORD);
      }
      await clickContinue(page);
      await page.waitForTimeout(1400);
      continue;
    }

    if (hasPassword) {
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
      await passwordInput.fill(TEST_PASSWORD);
      await clickContinue(page);
      await page.waitForTimeout(1200);
      continue;
    }

    if (needsCode) {
      await fillOtp(page);
      await page.waitForTimeout(1200);
      continue;
    }

    await page.waitForTimeout(800);
  }
}

async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  console.log("🔐 Global setup: Clerk default testing auth bootstrap");
  console.log("Using test email:", TEST_EMAIL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    let authenticated = false;

    // Preferred path: bootstrap via Clerk BAPI + sign-in token (no OTP throttling).
    try {
      const userId = await resolveTestUserId();
      const signInUrl = await createSignInTokenUrl(userId);
      await page.goto(signInUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page.waitForTimeout(2500);
      authenticated = await verifyAuthenticatedAtDashboard(page);
    } catch (err) {
      console.warn("Sign-in token bootstrap failed, falling back to UI flow:", err);
    }

    // Fallback path for environments where BAPI bootstrap fails.
    if (!authenticated) {
      try {
        await uiSignInOrSignUp(page);
        authenticated = await verifyAuthenticatedAtDashboard(page);
      } catch (err) {
        console.warn("UI fallback auth failed:", err);
      }
    }

    await context.storageState({ path: AUTH_FILE });
    console.log("✅ Saved storage state to", AUTH_FILE);
    console.log("Auth verification URL:", page.url());

    if (!authenticated) {
      console.warn(
        "⚠️  Could not verify authenticated app session. " +
          "Check Clerk app auth settings and test user credentials.",
      );
    }
  } catch (err) {
    await page
      .screenshot({
        path: path.join(__dirname, "../playwright/global-setup-error.png"),
      })
      .catch(() => null);
    throw err;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
