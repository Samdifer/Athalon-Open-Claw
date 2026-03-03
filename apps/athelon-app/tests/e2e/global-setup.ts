/**
 * Playwright global setup for persona-based Clerk auth states.
 *
 * Generates:
 * - playwright/.auth/unlinked-user.json
 * - playwright/.auth/empty-org-admin.json
 * - playwright/.auth/seeded-admin.json
 * - playwright/.auth/user.json (alias of seeded-admin for legacy suites)
 *
 * Setup is strict/fail-fast:
 * - No stale auth files are reused.
 * - Storage state is written only after authenticated verification succeeds.
 * - Any persona auth failure aborts the run.
 */

import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const AUTH_DIR = path.join(__dirname, "../playwright/.auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");
const UNLINKED_AUTH_FILE = path.join(AUTH_DIR, "unlinked-user.json");
const EMPTY_ORG_AUTH_FILE = path.join(AUTH_DIR, "empty-org-admin.json");
const SEEDED_AUTH_FILE = path.join(AUTH_DIR, "seeded-admin.json");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TEST_OTP = "424242";
const DEFAULT_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "ClerkTest123!";
const PLAYWRIGHT_UNLINKED_EMAIL = process.env.PLAYWRIGHT_UNLINKED_EMAIL;
const PLAYWRIGHT_EMPTY_ORG_EMAIL = process.env.PLAYWRIGHT_EMPTY_ORG_EMAIL;
const PLAYWRIGHT_SEEDED_EMAIL = process.env.PLAYWRIGHT_SEEDED_EMAIL;

type Persona = {
  key: "unlinked" | "empty-org" | "seeded";
  label: string;
  email: string;
  userId?: string;
  outFile: string;
};

const personas: Persona[] = [
  {
    key: "unlinked",
    label: "Unlinked user",
    email: PLAYWRIGHT_UNLINKED_EMAIL ?? "",
    userId: process.env.PLAYWRIGHT_UNLINKED_USER_ID,
    outFile: UNLINKED_AUTH_FILE,
  },
  {
    key: "empty-org",
    label: "Empty-org admin",
    email: PLAYWRIGHT_EMPTY_ORG_EMAIL ?? "",
    userId: process.env.PLAYWRIGHT_EMPTY_ORG_USER_ID,
    outFile: EMPTY_ORG_AUTH_FILE,
  },
  {
    key: "seeded",
    label: "Seeded admin",
    email: PLAYWRIGHT_SEEDED_EMAIL ?? "",
    userId: process.env.PLAYWRIGHT_SEEDED_USER_ID ?? process.env.PLAYWRIGHT_TEST_USER_ID,
    outFile: SEEDED_AUTH_FILE,
  },
];

interface ClerkUser {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
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
    `/users?limit=100&email_address[]=${encodeURIComponent(email)}`,
  );
  const target = email.trim().toLowerCase();
  return (
    users.find((user) =>
      (user.email_addresses ?? []).some(
        (address) => address.email_address?.trim().toLowerCase() === target,
      ),
    ) ?? null
  );
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

async function resolveUserId(persona: Persona): Promise<string> {
  if (persona.userId) return persona.userId;

  const existing = await findUserByEmail(persona.email);
  if (existing) {
    await ensureUserPassword(existing.id, DEFAULT_PASSWORD).catch((err) => {
      console.warn(
        `Could not refresh password for Clerk user ${existing.id} (${persona.email}):`,
        err,
      );
    });
    return existing.id;
  }

  const created = await createTestUser(persona.email, DEFAULT_PASSWORD);
  return created.id;
}

async function createSignInTokenUrl(userId: string): Promise<string> {
  const result = await clerkBAPI<{ url?: string }>("POST", "/sign_in_tokens", {
    user_id: userId,
  });
  if (!result.url) {
    throw new Error(`Clerk sign_in_tokens response missing url for user ${userId}`);
  }
  return result.url;
}

function looksLikeAuthUrl(url: string): boolean {
  return (
    url.includes("sign-in") ||
    url.includes("accounts.dev") ||
    url.includes("factor")
  );
}

async function isAuthenticatedAtApp(page: Page): Promise<boolean> {
  if (looksLikeAuthUrl(page.url())) return false;
  const emailVisible = await page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first()
    .isVisible()
    .catch(() => false);
  return !emailVisible;
}

async function verifyAuthenticatedAtApp(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(1000);
  return isAuthenticatedAtApp(page);
}

async function clickContinue(page: Page): Promise<boolean> {
  const candidates = [
    page.getByRole("button", { name: "Continue", exact: true }).first(),
    page.locator('button:has-text("Continue")').last(),
  ];

  for (const candidate of candidates) {
    if ((await candidate.count().catch(() => 0)) === 0) continue;

    for (let i = 0; i < 20; i++) {
      const disabled = await candidate.isDisabled().catch(() => true);
      if (!disabled) {
        await candidate.click({ timeout: 5_000 });
        return true;
      }

      // Clerk can auto-advance while the current button remains disabled.
      if (await isAuthenticatedAtApp(page)) return true;
      await page.waitForTimeout(250);
    }
  }

  return false;
}

async function fillOtp(page: Page) {
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

async function uiSignInOrSignUp(page: Page, email: string) {
  await page.goto(`${BASE_URL}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForURL(/sign-in|accounts\.dev/, { timeout: 30_000 }).catch(() => null);

  const emailInput = page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.fill(email);
  const initialPassword = page.locator('input[type="password"]').first();
  if ((await initialPassword.count()) > 0) {
    const initialEditable = await initialPassword.isEditable().catch(() => false);
    if (initialEditable) {
      await initialPassword.fill(DEFAULT_PASSWORD);
    }
  }
  const initialContinue = await clickContinue(page);
  if (!initialContinue && !(await isAuthenticatedAtApp(page))) {
    throw new Error("Unable to submit Clerk sign-in form after entering email.");
  }
  await page.waitForTimeout(1200);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (await isAuthenticatedAtApp(page)) return;

    const bodyText = (await page.locator("body").innerText().catch(() => ""))
      .toLowerCase();

    const onSignUpRoute = page.url().includes("sign-up");
    const hasSignUpFields = await page
      .locator('input[name="firstName"], input[name="lastName"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasPasswordField = await page
      .locator('input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasOtpField = await page
      .locator(
        '[data-otp-input], [data-otp-root], input[name*="code"], input[inputmode="numeric"]',
      )
      .first()
      .isVisible()
      .catch(() => false);
    const explicitNoAccount =
      bodyText.includes("no account found") ||
      bodyText.includes("couldn't find your account") ||
      bodyText.includes("create your account");
    const needsCode =
      hasOtpField ||
      bodyText.includes("check your email") ||
      bodyText.includes("verification") ||
      page.url().includes("factor");

    if (hasPasswordField && !onSignUpRoute && !hasSignUpFields) {
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
      const editable = await passwordInput.isEditable().catch(() => false);
      if (editable) {
        await passwordInput.fill(DEFAULT_PASSWORD);
      }
      const passwordContinue = await clickContinue(page);
      if (!passwordContinue && !(await isAuthenticatedAtApp(page))) {
        throw new Error("Unable to submit Clerk password step.");
      }
      await page.waitForTimeout(1200);
      continue;
    }

    if (needsCode) {
      await fillOtp(page);
      await page.waitForTimeout(1200);
      continue;
    }

    if (onSignUpRoute || hasSignUpFields || explicitNoAccount) {
      if (!onSignUpRoute) {
        await page.getByRole("link", { name: /sign up/i }).click();
        await page.waitForURL(/sign-up|accounts\.dev/, { timeout: 20_000 });
        await page.waitForTimeout(500);
      }

      const firstName = page.locator('input[name="firstName"]').first();
      if (await firstName.count()) await firstName.fill("E2E");
      const lastName = page.locator('input[name="lastName"]').first();
      if (await lastName.count()) await lastName.fill("Tester");

      const signUpEmail = page
        .locator('input[name="emailAddress"], input[type="email"]')
        .first();
      await signUpEmail.fill(email);

      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.count()) {
        await passwordInput.fill(DEFAULT_PASSWORD);
      }

      const humanCheckVisible = await page
        .locator("text=Verify you are human")
        .first()
        .isVisible()
        .catch(() => false);
      if (humanCheckVisible) {
        throw new Error(
          "Clerk sign-up requires human verification. Configure PLAYWRIGHT_UNLINKED_EMAIL for an existing account.",
        );
      }

      const signUpContinue = await clickContinue(page);
      if (!signUpContinue && !(await isAuthenticatedAtApp(page))) {
        throw new Error("Unable to submit Clerk sign-up form.");
      }
      await page.waitForTimeout(1400);
      continue;
    }

    await page.waitForTimeout(800);
  }

  if (!(await isAuthenticatedAtApp(page))) {
    throw new Error(`UI auth flow did not complete. Final URL: ${page.url()}`);
  }
}

async function completeOnboardingIfNeeded(page: Page, persona: Persona): Promise<void> {
  if (!page.url().includes("/onboarding")) return;

  const organizationName = `E2E ${persona.key} Org ${Date.now()}`;
  await page.getByLabel(/organization name/i).fill(organizationName);
  await page.getByLabel(/your legal name/i).fill(`E2E ${persona.key} Admin`);
  await page.getByLabel(/country/i).fill("US");
  await page.getByLabel(/state/i).fill("CO");
  await page.getByLabel(/city/i).fill("Denver");

  await page.getByRole("button", { name: /complete setup/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
}

async function createPersonaStorageState(persona: Persona): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    let authenticated = false;
    const userId = await resolveUserId(persona);
    console.log(`[${persona.key}] resolved Clerk user: ${userId}`);

    for (let attempt = 1; attempt <= 3 && !authenticated; attempt++) {
      try {
        const signInUrl = await createSignInTokenUrl(userId);
        console.log(`[${persona.key}] attempting sign-in token flow (attempt ${attempt}/3)`);
        const tokenUrlWithRedirect = `${signInUrl}&redirect_url=${encodeURIComponent(
          `${BASE_URL}/dashboard`,
        )}`;
        await page.goto(tokenUrlWithRedirect, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await page.waitForTimeout(2000);
        authenticated = await verifyAuthenticatedAtApp(page);
        console.log(
          `[${persona.key}] token flow result: ${authenticated ? "authenticated" : "not authenticated"} (${page.url()})`,
        );
      } catch (err) {
        console.warn(`[${persona.key}] sign-in token flow error (attempt ${attempt}/3):`, err);
      }
    }

    if (!authenticated) {
      console.log(`[${persona.key}] attempting UI auth fallback`);
      await uiSignInOrSignUp(page, persona.email);
      authenticated = await verifyAuthenticatedAtApp(page);
      console.log(
        `[${persona.key}] UI fallback result: ${authenticated ? "authenticated" : "not authenticated"} (${page.url()})`,
      );
    }

    if (!authenticated) {
      throw new Error(
        `[${persona.key}] failed auth verification. Final URL: ${page.url()}`,
      );
    }

    if (persona.key !== "unlinked") {
      await completeOnboardingIfNeeded(page, persona);
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
    }

    await context.storageState({ path: persona.outFile });
    console.log(`[${persona.key}] auth state saved to ${persona.outFile}`);
    console.log(`[${persona.key}] auth verification URL: ${page.url()}`);
  } catch (err) {
    await page
      .screenshot({
        path: path.join(__dirname, `../playwright/global-setup-${persona.key}-error.png`),
      })
      .catch(() => null);
    throw err;
  } finally {
    await browser.close();
  }
}

async function globalSetup() {
  if (!PLAYWRIGHT_UNLINKED_EMAIL || !PLAYWRIGHT_EMPTY_ORG_EMAIL || !PLAYWRIGHT_SEEDED_EMAIL) {
    throw new Error(
      "Missing required persona env vars. Set PLAYWRIGHT_UNLINKED_EMAIL, PLAYWRIGHT_EMPTY_ORG_EMAIL, and PLAYWRIGHT_SEEDED_EMAIL in .env.local.",
    );
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  for (const file of [AUTH_FILE, UNLINKED_AUTH_FILE, EMPTY_ORG_AUTH_FILE, SEEDED_AUTH_FILE]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  console.log("Global setup: persona auth bootstrap");
  console.log(`Base URL: ${BASE_URL}`);

  for (const persona of personas) {
    if (!persona.email?.trim()) {
      throw new Error(`[${persona.key}] missing email configuration`);
    }
    console.log(`Authenticating ${persona.label}: ${persona.email}`);
    await createPersonaStorageState(persona);
  }

  fs.copyFileSync(SEEDED_AUTH_FILE, AUTH_FILE);
  console.log(`Legacy auth alias written: ${AUTH_FILE} -> ${SEEDED_AUTH_FILE}`);
}

export default globalSetup;
