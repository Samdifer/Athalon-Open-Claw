import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// Load .env.local so PLAYWRIGHT_TEST_EMAIL etc. are available
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const AUTH_FILE = path.join(__dirname, "playwright/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "html",
  globalSetup: require.resolve("./e2e/global-setup"),
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ── 1. Unauthenticated smoke tests — no auth required ───────────────────
    {
      name: "chromium",
      testMatch: /smoke(?:-full)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // ── 2. Authenticated tests — use storage state from globalSetup ─────────
    {
      name: "chromium-authenticated",
      testIgnore: /auth\.setup\.ts|smoke(?:-full)?\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
