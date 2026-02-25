/**
 * global-setup.ts — Playwright global setup for Clerk authentication
 *
 * Strategy: Bypass Clerk's browser-based handshake entirely by injecting
 * session cookies directly from Clerk's Backend API.
 *
 * Clerk's middleware checks for 3 cookies on the app domain:
 *   1. __session        — Valid Clerk session JWT
 *   2. __client_uat     — Unix seconds (≤ JWT iat) indicating last session update
 *   3. __clerk_db_jwt   — Dev browser token (any non-empty string bypasses
 *                         DevBrowserMissing handshake trigger in dev mode)
 *
 * With all three present and valid, clerkMiddleware calls verifyToken()
 * directly and returns SignedIn — no handshake loop.
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");
const BASE_URL = "http://localhost:3000";
const USER_ID = "user_3A9AJl5UKtXswySMSZXcYwQj5ld"; // sam.sandifer1+clerk_test@gmail.com

// ─── Clerk BAPI helper ──────────────────────────────────────────────────────
function clerkBAPI<T = unknown>(
  method: string,
  apiPath: string,
  body?: object
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
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            resolve(raw as unknown as T);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

interface Session {
  id: string;
  status: string;
  expire_at: number;
}

interface TokenResult {
  jwt?: string;
}

// ─── Get or refresh session JWT ───────────────────────────────────────────────
async function getSessionJwt(): Promise<{ jwt: string; iat: number }> {
  // 1) Try existing active sessions
  const sessions = await clerkBAPI<Session[]>(
    "GET",
    `/sessions?user_id=${USER_ID}&status=active&limit=5`
  );

  let sessionId: string | null = null;
  if (Array.isArray(sessions) && sessions.length > 0) {
    sessionId = sessions[0].id;
    console.log("Using existing session:", sessionId);
  } else {
    // 2) No session — create one via sign-in token (ticket)
    console.log("No active session — creating sign-in ticket...");
    const ticket = await clerkBAPI<{ url?: string }>(
      "POST",
      "/sign_in_tokens",
      { user_id: USER_ID }
    );
    if (!ticket.url) throw new Error("Could not create sign-in ticket");

    // Navigate to ticket URL to establish a session server-side
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const pg = await ctx.newPage();
    await pg.goto(ticket.url, { timeout: 30_000 });
    await pg.waitForTimeout(3000);
    await browser.close();

    // Retry sessions
    const sessions2 = await clerkBAPI<Session[]>(
      "GET",
      `/sessions?user_id=${USER_ID}&status=active&limit=5`
    );
    if (!Array.isArray(sessions2) || sessions2.length === 0) {
      throw new Error("Still no active sessions after ticket flow");
    }
    sessionId = sessions2[0].id;
    console.log("New session:", sessionId);
  }

  // 3) Exchange session for a 1-hour JWT (default is 60s which is too short for tests)
  const result = await clerkBAPI<TokenResult>(
    "POST",
    `/sessions/${sessionId}/tokens`,
    { expires_in_seconds: 3600 }
  );
  if (!result.jwt) throw new Error("No JWT in token response: " + JSON.stringify(result));

  // Decode iat from JWT payload (base64url)
  const [, payloadB64] = result.jwt.split(".");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  console.log(
    "JWT obtained — iat:",
    payload.iat,
    "exp:",
    payload.exp,
    "sub:",
    payload.sub
  );

  return { jwt: result.jwt, iat: payload.iat as number };
}

// ─── Main global setup ────────────────────────────────────────────────────────
async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  console.log("🔐 Global setup: injecting Clerk session cookies");

  const { jwt, iat } = await getSessionJwt();

  // Launch browser and inject cookies on localhost
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // First do a quick visit so the domain exists in the cookie jar
    // (cookies can only be set for domains the browser has visited)
    await page.goto(BASE_URL + "/", {
      waitUntil: "commit",
      timeout: 15_000,
    }).catch(() => null); // ignore redirect

    // Inject all 3 cookies that Clerk's middleware looks for
    const cookieExpiry = iat + 3600; // 1h from now (beyond JWT exp is fine for this)
    await context.addCookies([
      {
        name: "__session",
        value: jwt,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        expires: cookieExpiry,
      },
      {
        name: "__client_uat",
        // Must be ≤ JWT iat so the middleware doesn't trigger a handshake
        // Clerk checks: if (iat < clientUat) → handshake needed
        value: String(iat),
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Strict",
        expires: cookieExpiry,
      },
      {
        name: "__clerk_db_jwt",
        // Any non-empty value satisfies the DevBrowserMissing check.
        // This cookie is only USED (not validated) if a handshake is needed,
        // which it won't be since we have a valid session.
        value: "dev-bypass",
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
        expires: cookieExpiry,
      },
    ]);

    // Also set the suffixed variants (Clerk uses suffix from publishable key)
    // The suffix "ZAUr49H1" comes from the app's Clerk instance
    const suffix = "ZAUr49H1";
    await context.addCookies([
      {
        name: `__client_uat_${suffix}`,
        value: String(iat),
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Strict" as const,
        expires: cookieExpiry,
      },
      {
        name: `__clerk_db_jwt_${suffix}`,
        value: "dev-bypass",
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
        expires: cookieExpiry,
      },
    ]);

    // Save storage state BEFORE navigating to the app — this prevents
    // Clerk's client-side JS from overwriting __client_uat to 0
    await context.storageState({ path: AUTH_FILE });
    console.log("✅ Auth state saved (pre-navigation) to", AUTH_FILE);

    // Verify the cookies work by navigating
    console.log("Verifying cookies by navigating to dashboard...");
    await page.goto(BASE_URL + "/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);

    await page
      .screenshot({
        path: path.join(__dirname, "../playwright/global-setup-final.png"),
      })
      .catch(() => null);

    if (finalUrl.includes("accounts.dev") || finalUrl.includes("sign-in")) {
      console.warn("⚠️  Cookie injection didn't work on verification, but state was saved pre-navigation");
    } else {
      console.log("✅ Authenticated at:", finalUrl);
    }
  } catch (err) {
    await page
      .screenshot({
        path: path.join(__dirname, "../playwright/global-setup-error.png"),
      })
      .catch(() => null);
    console.error("Global setup failed:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

// ─── UI fallback (password + OTP) ────────────────────────────────────────────
async function uiFallbackSignIn(page: import("@playwright/test").Page) {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;
  const OTP = "424242";

  await page.goto("https://ideal-airedale-92.accounts.dev/sign-in", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const emailInput = page
    .locator('input[name="identifier"], input[type="email"]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForTimeout(2000);

  const text = await page.locator("body").innerText().catch(() => "");
  if (text.toLowerCase().includes("password")) {
    const pw = page.locator('input[type="password"]').first();
    await pw.fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForTimeout(2000);
  }

  // MFA / factor-two
  const text2 = await page.locator("body").innerText().catch(() => "");
  if (
    text2.toLowerCase().includes("check") ||
    text2.toLowerCase().includes("verify") ||
    page.url().includes("factor")
  ) {
    const otpInput = page.locator("input[data-input-otp]").first();
    await otpInput.click({ force: true, timeout: 5000 }).catch(() => null);
    await page.keyboard.type(OTP, { delay: 80 });
    await page.waitForTimeout(2000);
  }

  await page.waitForURL(/localhost:3000\/(?!.*sign-in)/, { timeout: 300_000 });
  console.log("✅ UI fallback succeeded:", page.url());
}

export default globalSetup;
