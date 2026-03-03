import type { Page } from "@playwright/test";

const TEST_EMAIL =
  process.env.PLAYWRIGHT_TEST_EMAIL ?? "athelon.e2e+clerk_test@gmail.com";
const TEST_PASSWORD =
  process.env.PLAYWRIGHT_TEST_PASSWORD ?? "ClerkTest123!";
const TEST_OTP = "424242";

function needsAuth(url: string): boolean {
  return url.includes("sign-in") || url.includes("accounts.dev");
}

async function isAuthScreen(page: Page): Promise<boolean> {
  if (needsAuth(page.url())) return true;
  const emailVisible = await page
    .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (emailVisible) return true;
  const signInHeadingVisible = await page
    .getByRole("heading", { name: /sign in/i })
    .first()
    .isVisible()
    .catch(() => false);
  return signInHeadingVisible;
}

async function waitForRouteState(page: Page): Promise<"auth" | "app" | "unknown"> {
  for (let i = 0; i < 10; i++) {
    if (await isAuthScreen(page)) return "auth";
    const hasAppShell = await page
      .locator("main, [role='main'], [data-sidebar='sidebar']")
      .first()
      .isVisible()
      .catch(() => false);
    if (hasAppShell) return "app";
    await page.waitForTimeout(400);
  }
  return "unknown";
}

async function clickContinue(page: Page) {
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

export async function ensureClerkAuthenticated(
  page: Page,
  targetPath: string,
): Promise<void> {
  await page.goto(targetPath, { waitUntil: "domcontentloaded" }).catch(() => null);
  let routeState = await waitForRouteState(page);

  if (routeState === "app") return;
  if (routeState === "unknown") {
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => null);
    routeState = await waitForRouteState(page);
    if (routeState === "app") return;
  }
  if (routeState !== "auth") {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" }).catch(() => null);
    routeState = await waitForRouteState(page);
    if (routeState !== "auth") {
      throw new Error(`Unable to resolve auth route state. Current URL: ${page.url()}`);
    }
  }

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
    if (!needsAuth(page.url())) break;

    const body = (await page.locator("body").innerText().catch(() => ""))
      .toLowerCase();

    const noAccount =
      body.includes("find your account") || body.includes("no account");
    const hasPassword = body.includes("password");
    const needsCode =
      body.includes("check your email") ||
      body.includes("verification") ||
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
      await page.waitForTimeout(1200);
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

  if (needsAuth(page.url())) {
    throw new Error("Failed to establish Clerk authenticated session.");
  }

  await page.goto(targetPath, { waitUntil: "domcontentloaded" });
}
