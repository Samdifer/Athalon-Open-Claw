/**
 * visual-qa.ts — Automated visual QA: screenshots + console error capture for every page
 * Run with: npx tsx e2e/visual-qa.ts
 */
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "../playwright/visual-qa");
const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");

const PAGES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/fleet", label: "Fleet List" },
  { path: "/work-orders", label: "Work Orders List" },
  { path: "/work-orders/new", label: "Work Order New" },
  { path: "/parts", label: "Parts List" },
  { path: "/parts/new", label: "Parts New" },
  { path: "/parts/requests", label: "Parts Requests" },
  { path: "/billing/quotes", label: "Billing Quotes" },
  { path: "/billing/quotes/new", label: "Quote New" },
  { path: "/billing/invoices", label: "Billing Invoices" },
  { path: "/billing/invoices/new", label: "Invoice New" },
  { path: "/billing/purchase-orders", label: "Billing POs" },
  { path: "/billing/purchase-orders/new", label: "PO New" },
  { path: "/billing/time-clock", label: "Time Clock" },
  { path: "/billing/vendors", label: "Vendors List" },
  { path: "/billing/vendors/new", label: "Vendor New" },
  { path: "/billing/pricing", label: "Pricing" },
  { path: "/billing/analytics", label: "Analytics" },
  { path: "/personnel", label: "Personnel" },
  { path: "/compliance", label: "Compliance" },
  { path: "/compliance/audit-trail", label: "Audit Trail" },
  { path: "/squawks", label: "Squawks" },
  { path: "/settings/shop", label: "Settings Shop" },
];

interface PageResult {
  path: string;
  label: string;
  status: "ok" | "issue" | "broken";
  httpStatus: number;
  finalUrl: string;
  consoleErrors: string[];
  screenshotFile: string;
  loadTimeMs: number;
  notes: string[];
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });

  const results: PageResult[] = [];

  for (const { path: pagePath, label } of PAGES) {
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const notes: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text().substring(0, 200));
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`PAGE ERROR: ${err.message.substring(0, 200)}`);
    });

    const start = Date.now();
    let httpStatus = 0;
    let status: "ok" | "issue" | "broken" = "ok";

    try {
      const response = await page.goto(`${BASE_URL}${pagePath}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      httpStatus = response?.status() ?? 0;

      // Wait for content to render
      await page.waitForTimeout(2000);

      const finalUrl = page.url();

      // Check if redirected to sign-in (auth issue)
      if (finalUrl.includes("sign-in") || finalUrl.includes("accounts.dev")) {
        status = "issue";
        notes.push("Redirected to sign-in — auth cookies may not be working for this route");
      }

      // Check for error boundaries
      const errorBoundary = await page.locator("text=Something went wrong").isVisible().catch(() => false);
      if (errorBoundary) {
        status = "broken";
        notes.push("Error boundary triggered — component crash detected");
      }

      // Check for empty main content
      const mainContent = await page.locator("main").innerHTML().catch(() => "");
      if (mainContent.length < 50) {
        notes.push("Main content area appears empty or minimal");
      }

      // Check for loading skeletons still visible after 2s
      const skeletonVisible = await page.locator('[class*="skeleton"], [class*="animate-pulse"]').first().isVisible().catch(() => false);
      if (skeletonVisible) {
        notes.push("Loading skeleton still visible after 2s — slow data fetch or stuck loading state");
      }

      // Check sidebar exists
      const sidebarVisible = await page.locator("nav, aside, [class*='sidebar']").first().isVisible().catch(() => false);
      if (!sidebarVisible && !finalUrl.includes("sign-in")) {
        notes.push("No sidebar/nav detected — layout may be broken");
      }

      // Screenshot
      const screenshotFile = `${label.replace(/\s+/g, "-").toLowerCase()}.png`;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, screenshotFile),
        fullPage: true,
      });

      if (httpStatus >= 500) status = "broken";
      else if (consoleErrors.length > 0) status = "issue";

      results.push({
        path: pagePath,
        label,
        status,
        httpStatus,
        finalUrl,
        consoleErrors,
        screenshotFile,
        loadTimeMs: Date.now() - start,
        notes,
      });
    } catch (err: any) {
      results.push({
        path: pagePath,
        label,
        status: "broken",
        httpStatus,
        finalUrl: "",
        consoleErrors: [err.message?.substring(0, 200) ?? "Unknown error"],
        screenshotFile: "",
        loadTimeMs: Date.now() - start,
        notes: ["Page failed to load entirely"],
      });
    }

    await page.close();
    console.log(`[${status === "ok" ? "✅" : status === "issue" ? "⚠️" : "❌"}] ${label} (${pagePath}) — ${Date.now() - start}ms`);
  }

  await browser.close();

  // Generate report
  let report = `# QA Visual & Browser Report — Athelon MVP\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Total Pages:** ${results.length}\n`;
  report += `**OK:** ${results.filter(r => r.status === "ok").length} | **Issues:** ${results.filter(r => r.status === "issue").length} | **Broken:** ${results.filter(r => r.status === "broken").length}\n\n`;
  report += `---\n\n`;

  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "issue" ? "⚠️" : "❌";
    report += `### ${icon} ${r.label} — \`${r.path}\`\n`;
    report += `- **HTTP:** ${r.httpStatus} | **Load:** ${r.loadTimeMs}ms\n`;
    report += `- **Final URL:** ${r.finalUrl}\n`;
    if (r.consoleErrors.length > 0) {
      report += `- **Console Errors:**\n`;
      for (const e of r.consoleErrors) {
        report += `  - \`${e}\`\n`;
      }
    }
    if (r.notes.length > 0) {
      report += `- **Notes:**\n`;
      for (const n of r.notes) {
        report += `  - ${n}\n`;
      }
    }
    report += `\n`;
  }

  fs.writeFileSync(
    path.join(__dirname, "../QA-WAVE2-BROWSER-REPORT.md"),
    report
  );
  console.log(`\n📝 Report written to QA-WAVE2-BROWSER-REPORT.md`);
}

run().catch(console.error);
