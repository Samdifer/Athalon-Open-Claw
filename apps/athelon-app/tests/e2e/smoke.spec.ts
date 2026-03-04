/**
 * smoke.spec.ts — Navigation smoke tests for Athelon billing pages.
 *
 * These tests verify that the app starts, pages respond (200 / redirect to
 * sign-in), and that no hard crashes occur during navigation.
 *
 * NOTE: This is a Convex app secured with Clerk authentication. Unauthenticated
 * requests are redirected to /sign-in. These tests are written to accept that
 * redirect as a valid "app is alive" signal. Tests that require live Convex auth
 * are marked test.skip() with an explanatory comment.
 */

import { test, expect } from "@playwright/test";

const BILLING_PAGES = [
  "/billing/quotes",
  "/billing/invoices",
  "/billing/purchase-orders",
  "/billing/time-clock",
  "/billing/vendors",
  "/billing/pricing",
  "/billing/analytics",
];

test.describe("Smoke: App starts and billing pages respond", () => {
  test("app root loads (or redirects to sign-in)", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    // Either loaded OK or redirected to sign-in — both indicate the server is up
    const url = page.url();
    expect(
      url.includes("localhost:3000") || url.includes("sign-in"),
      `Expected app URL, got: ${url}`,
    ).toBeTruthy();
    // Should not be a 5xx error
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  for (const path of BILLING_PAGES) {
    test(`billing page ${path} — responds without 500 error`, async ({
      page,
    }) => {
      const response = await page.goto(path, {
        waitUntil: "domcontentloaded",
      });

      // Accept sign-in redirect (Clerk auth) or a successful page load.
      // Reject only server errors (5xx).
      if (response) {
        expect(
          response.status(),
          `${path} returned ${response.status()}`,
        ).toBeLessThan(500);
      }

      // Accept: app domain OR Clerk sign-in redirect (both mean the app is alive)
      const finalUrl = page.url();
      expect(
        finalUrl.includes("localhost:3000") || finalUrl.includes("clerk") || finalUrl.includes("accounts.dev") || finalUrl.includes("sign-in"),
        `Unexpected redirect — expected app or Clerk auth, got: ${finalUrl}`,
      ).toBeTruthy();
    });
  }

  test.skip(
    "sidebar contains Billing nav section (requires authenticated session)",
    async ({ page }) => {
      // NOTE: Requires a live Clerk session + Convex connection.
      // To test this in CI: set PLAYWRIGHT_AUTH_COOKIE or use a test account.
      await page.goto("/");
      await expect(page.getByText("Billing")).toBeVisible();
    },
  );

  test.skip(
    "billing pages show headings when authenticated",
    async ({ page }) => {
      // NOTE: Requires live Convex auth.
      // Each billing page should render its main heading when logged in.
      await page.goto("/billing/quotes");
      await expect(page.getByRole("heading", { name: /quote/i })).toBeVisible();
    },
  );
});
