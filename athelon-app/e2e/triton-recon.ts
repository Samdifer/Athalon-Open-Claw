/**
 * triton-recon.ts — Focused AD search feature discovery for tritonaviationdata.com
 *
 * Logs in, visits AD-related pages only (no crawling), captures screenshots + text,
 * and generates a markdown report. Uses a single browser tab throughout.
 *
 * Run with:
 *   npx tsx e2e/triton-recon.ts --email "you@example.com" --password "yourpass"
 *
 * Or via env vars:
 *   TRITON_EMAIL="..." TRITON_PASSWORD="..." npx tsx e2e/triton-recon.ts
 */
import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = "https://tritonaviationdata.com";
const B_URL = "https://b.tritonaviationdata.com";
const OUTPUT_DIR = path.join(__dirname, "../artifacts/triton-recon");

// Focused list of AD-related pages to visit (no crawling)
const AD_PAGES = [
  { url: `${BASE_URL}/html/access.html`, label: "Subscriber Dashboard" },
  { url: `${B_URL}/subscribers/makemodel.php/`, label: "Make/Model AD Search" },
  { url: `${B_URL}/subscribers/appliance_ads.php`, label: "Appliance AD Search" },
  { url: `${B_URL}/subscribers/singlead.php`, label: "Single AD Lookup" },
  { url: `${B_URL}/subscribers/fullsearch.php`, label: "Full Text AD Search" },
  { url: `${BASE_URL}/data/small_ads.php3`, label: "Old AD Search Tools" },
  { url: `${B_URL}/subscribers/profile.php`, label: "Aircraft Profiles" },
  { url: `${BASE_URL}/features/stcsearch.php`, label: "STC Search" },
  { url: `${BASE_URL}/data/Type_Cert.htm`, label: "Type Certificates" },
  { url: `${BASE_URL}/data/Forms/Forms2.htm`, label: "FAA Forms" },
  { url: `${BASE_URL}/data/advc_mlst2.htm`, label: "Advisory Circulars" },
];

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
function parseArgs(): { email: string; password: string } {
  const args = process.argv.slice(2);
  let email = process.env.TRITON_EMAIL ?? "";
  let password = process.env.TRITON_PASSWORD ?? "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) email = args[++i];
    if (args[i] === "--password" && args[i + 1]) password = args[++i];
  }

  if (!email || !password) {
    console.error(
      "Usage: npx tsx e2e/triton-recon.ts --email <email> --password <password>\n" +
        "   Or: TRITON_EMAIL=... TRITON_PASSWORD=... npx tsx e2e/triton-recon.ts"
    );
    process.exit(1);
  }
  return { email, password };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PageCapture {
  url: string;
  label: string;
  screenshotFile: string;
  title: string;
  textContent: string;
  forms: FormInfo[];
  buttons: string[];
  navLinks: LinkInfo[];
  tables: TableInfo[];
  selectOptions: SelectInfo[];
  notes: string[];
  error?: string;
}

interface LinkInfo {
  text: string;
  href: string;
}

interface FormInfo {
  action: string;
  fields: string[];
}

interface TableInfo {
  headers: string[];
  rowCount: number;
}

interface SelectInfo {
  name: string;
  label: string;
  optionCount: number;
  sampleOptions: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Random delay between 2000–5000ms */
async function randomDelay(page: Page): Promise<void> {
  const ms = 2000 + Math.floor(Math.random() * 3000);
  console.log(`  ⏳ Waiting ${(ms / 1000).toFixed(1)}s...`);
  await page.waitForTimeout(ms);
}

/** Sanitize a URL into a safe filename */
function urlToFilename(url: string): string {
  return url
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/** Extract visible text, forms, buttons, tables, selects, and links from a page */
async function capturePage(page: Page, label: string): Promise<PageCapture> {
  const url = page.url();
  const title = await page.title();

  // Get visible text content
  const textContent = await page.evaluate(() => {
    const body = document.body;
    if (!body) return "";
    const clone = body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
    return clone.innerText?.substring(0, 15000) ?? "";
  });

  // Get all forms and their fields
  const forms: FormInfo[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("form")).map((form) => ({
      action: form.action || "(no action)",
      fields: Array.from(form.querySelectorAll("input, select, textarea")).map((el) => {
        const input = el as HTMLInputElement;
        const type = input.type || el.tagName.toLowerCase();
        const name = input.name || input.id || "(unnamed)";
        const placeholder = input.placeholder || "";
        return `${type}: ${name}${placeholder ? ` [${placeholder}]` : ""}`;
      }),
    }));
  });

  // Get all buttons
  const buttons: string[] = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(
        "button, input[type='submit'], input[type='button'], a.btn, a.button"
      )
    )
      .map(
        (el) =>
          (el as HTMLElement).innerText?.trim() ||
          (el as HTMLInputElement).value ||
          ""
      )
      .filter((t) => t.length > 0 && t.length < 100);
  });

  // Get navigation links
  const navLinks: LinkInfo[] = await page.evaluate(() => {
    const links: { text: string; href: string }[] = [];
    document.querySelectorAll("a[href]").forEach((el) => {
      const a = el as HTMLAnchorElement;
      const text = a.innerText?.trim();
      const href = a.getAttribute("href") ?? "";
      if (text && href && text.length < 100) {
        links.push({ text, href });
      }
    });
    const seen = new Set<string>();
    return links.filter((l) => {
      const key = l.href;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  // Get tables info
  const tables: TableInfo[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table")).map((table) => {
      const headers = Array.from(table.querySelectorAll("th")).map(
        (th) => (th as HTMLElement).innerText?.trim() ?? ""
      );
      const rowCount = table.querySelectorAll("tbody tr, tr").length;
      return { headers, rowCount };
    });
  });

  // Get select dropdowns with their options (important for AD search forms)
  const selectOptions: SelectInfo[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("select")).map((sel) => {
      const options = Array.from(sel.options).map((o) => o.text?.trim() ?? "");
      const labelEl = sel.labels?.[0];
      return {
        name: sel.name || sel.id || "(unnamed)",
        label: labelEl?.innerText?.trim() ?? "",
        optionCount: options.length,
        sampleOptions: options.slice(0, 20), // first 20 options as sample
      };
    });
  });

  // Take screenshot
  const screenshotFile = `${urlToFilename(url)}.png`;
  await page.screenshot({
    path: path.join(OUTPUT_DIR, screenshotFile),
    fullPage: true,
  });

  return {
    url,
    label,
    screenshotFile,
    title,
    textContent,
    forms,
    buttons,
    navLinks,
    tables,
    selectOptions,
    notes: [],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  const { email, password } = parseArgs();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🚀 Launching browser (headed mode)...");
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const results: PageCapture[] = [];

  // ── Single page for the entire session ──────────────────────────────
  const page = await context.newPage();

  // ── Step 1: Login ──────────────────────────────────────────────────────
  console.log("🔐 Navigating to login page...");

  await page.goto(`${BASE_URL}/login.php`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);

  // Capture login page
  console.log("📸 Capturing login page...");
  const loginCapture = await capturePage(page, "Login Page");
  results.push(loginCapture);

  // Fill login form
  console.log("🔑 Attempting login...");
  try {
    const emailField = page
      .locator('input[type="email"]')
      .or(page.locator('input[name="email"]'))
      .or(page.locator('input[name="username"]'))
      .or(page.locator('input[name="user"]'))
      .or(page.locator('input[type="text"]').first());

    await emailField.first().fill(email);

    const passwordField = page.locator('input[type="password"]');
    await passwordField.first().fill(password);

    const submitBtn = page
      .locator('button[type="submit"]')
      .or(page.locator('input[type="submit"]'))
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('button:has-text("Sign In")'))
      .or(page.locator('input[value="Login"]'));

    await submitBtn.first().click();

    // Wait for navigation after login
    await page
      .waitForNavigation({ waitUntil: "networkidle", timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(3000);

    const postLoginUrl = page.url();
    console.log(`✅ Post-login URL: ${postLoginUrl}`);

    if (postLoginUrl.includes("login")) {
      console.log(
        "⚠️  Still on login page — check the browser window for CAPTCHA or errors."
      );
      console.log("   Pausing 45s for manual intervention...");
      await page.waitForTimeout(45000);
    }
  } catch (err: any) {
    console.log(`⚠️  Auto-login failed: ${err.message}`);
    console.log(
      "   Please log in manually in the browser window. Waiting 60s..."
    );
    await page.waitForTimeout(60000);
  }

  // ── Step 2: Capture post-login landing page ────────────────────────────
  console.log("📸 Capturing post-login landing page...");
  const landingCapture = await capturePage(page, "Subscriber Dashboard (post-login)");
  results.push(landingCapture);

  // ── Step 3: Visit each AD-related page (same tab, random delays) ──────
  console.log(`\n📡 Visiting ${AD_PAGES.length} AD-related pages...\n`);

  for (const { url, label } of AD_PAGES) {
    // Random delay between pages (2–5 seconds)
    await randomDelay(page);

    console.log(`  📄 ${label} — ${url}`);

    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 25000,
      });

      // Extra settle time after page load
      await page.waitForTimeout(1500);

      const httpStatus = response?.status() ?? 0;

      // Check if session was lost
      if (page.url().includes("login.php") && !url.includes("login.php")) {
        console.log(`  ⚠️  Redirected to login — session lost`);
        results.push({
          url,
          label,
          screenshotFile: "",
          title: "",
          textContent: "",
          forms: [],
          buttons: [],
          navLinks: [],
          tables: [],
          selectOptions: [],
          notes: ["Redirected to login — session expired"],
        });

        // Try to re-login
        console.log("  🔄 Attempting re-login...");
        try {
          const emailField = page
            .locator('input[type="email"]')
            .or(page.locator('input[name="email"]'))
            .or(page.locator('input[name="username"]'))
            .or(page.locator('input[type="text"]').first());
          await emailField.first().fill(email);
          await page.locator('input[type="password"]').first().fill(password);
          await page
            .locator('button[type="submit"]')
            .or(page.locator('input[type="submit"]'))
            .or(page.locator('input[value="Login"]'))
            .first()
            .click();
          await page
            .waitForNavigation({ waitUntil: "networkidle", timeout: 15000 })
            .catch(() => {});
          await page.waitForTimeout(3000);
          console.log(`  ✅ Re-logged in at: ${page.url()}`);
        } catch {
          console.log("  ❌ Re-login failed. Continuing...");
        }
        continue;
      }

      const capture = await capturePage(page, label);

      if (httpStatus >= 400) {
        capture.notes.push(`HTTP ${httpStatus} — error response`);
      }

      results.push(capture);
      console.log(`  ✅ Captured (${capture.forms.length} forms, ${capture.tables.length} tables, ${capture.selectOptions.length} selects)`);
    } catch (err: any) {
      console.log(`  ❌ Failed: ${err.message?.substring(0, 100)}`);
      results.push({
        url,
        label,
        screenshotFile: "",
        title: "",
        textContent: "",
        forms: [],
        buttons: [],
        navLinks: [],
        tables: [],
        selectOptions: [],
        notes: [`Failed to load: ${err.message?.substring(0, 200)}`],
        error: err.message,
      });
    }
  }

  await page.close();
  await browser.close();

  // ── Step 4: Generate markdown report ──────────────────────────────────
  console.log("\n📝 Generating report...");

  let report = `# Triton Aviation Data — AD Search Feature Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Source:** ${BASE_URL}\n`;
  report += `**Pages Captured:** ${results.length}\n`;
  report += `**Focus:** Airworthiness Directive (AD) search and compliance features\n\n`;
  report += `---\n\n`;

  // Table of contents
  report += `## Table of Contents\n\n`;
  for (const r of results) {
    const anchor = r.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    report += `- [${r.label}](#${anchor})\n`;
  }
  report += `\n---\n\n`;

  // Detailed per-page sections
  for (const r of results) {
    report += `## ${r.label}\n\n`;
    report += `- **URL:** ${r.url}\n`;
    report += `- **Page Title:** ${r.title}\n`;
    if (r.screenshotFile) {
      report += `- **Screenshot:** [${r.screenshotFile}](./${r.screenshotFile})\n`;
    }
    report += `\n`;

    if (r.notes.length > 0) {
      report += `### Notes\n`;
      for (const n of r.notes) {
        report += `- ${n}\n`;
      }
      report += `\n`;
    }

    if (r.error) {
      report += `### Error\n\`\`\`\n${r.error}\n\`\`\`\n\n`;
    }

    // Page text (trimmed)
    if (r.textContent) {
      report += `### Page Content\n`;
      report += `\`\`\`\n${r.textContent.substring(0, 5000)}\n\`\`\`\n\n`;
    }

    // Forms
    if (r.forms.length > 0) {
      report += `### Forms Found (${r.forms.length})\n`;
      for (const f of r.forms) {
        report += `- **Action:** \`${f.action}\`\n`;
        for (const field of f.fields) {
          report += `  - ${field}\n`;
        }
      }
      report += `\n`;
    }

    // Select dropdowns (critical for AD search interface)
    if (r.selectOptions.length > 0) {
      report += `### Dropdown Selects (${r.selectOptions.length})\n`;
      for (const s of r.selectOptions) {
        report += `- **${s.name}**${s.label ? ` (${s.label})` : ""} — ${s.optionCount} options\n`;
        if (s.sampleOptions.length > 0) {
          report += `  - Sample: ${s.sampleOptions.slice(0, 10).join(", ")}${s.optionCount > 10 ? ", ..." : ""}\n`;
        }
      }
      report += `\n`;
    }

    // Buttons
    if (r.buttons.length > 0) {
      report += `### Buttons / Actions\n`;
      for (const b of r.buttons) {
        report += `- ${b}\n`;
      }
      report += `\n`;
    }

    // Tables
    if (r.tables.length > 0) {
      report += `### Tables Found (${r.tables.length})\n`;
      for (const t of r.tables) {
        report += `- **Headers:** ${t.headers.join(" | ") || "(none)"} — **Rows:** ${t.rowCount}\n`;
      }
      report += `\n`;
    }

    // Navigation links discovered
    if (r.navLinks.length > 0) {
      report += `### Links Discovered (${r.navLinks.length})\n`;
      for (const l of r.navLinks) {
        report += `- [${l.text}](${l.href})\n`;
      }
      report += `\n`;
    }

    report += `---\n\n`;
  }

  // Summary
  report += `## Feature Summary\n\n`;

  report += `### All Search Forms\n`;
  const allForms = results.flatMap((r) =>
    r.forms.map(
      (f) =>
        `${r.label}: ${f.fields.map((fld) => fld.split(":")[1]?.trim() ?? fld).join(", ")}`
    )
  );
  for (const f of [...new Set(allForms)]) {
    report += `- ${f}\n`;
  }

  report += `\n### All Dropdown Selects\n`;
  for (const r of results) {
    for (const s of r.selectOptions) {
      report += `- **${r.label}** → ${s.name}: ${s.optionCount} options\n`;
    }
  }

  report += `\n### All Buttons/Actions\n`;
  const allButtons = [...new Set(results.flatMap((r) => r.buttons))];
  for (const b of allButtons) {
    report += `- ${b}\n`;
  }

  report += `\n### Pages Visited\n`;
  for (const r of results) {
    const status = r.error ? "❌" : r.notes.some((n) => n.includes("session")) ? "⚠️" : "✅";
    report += `- ${status} ${r.label} — \`${r.url}\`\n`;
  }

  const reportPath = path.join(OUTPUT_DIR, "TRITON-FEATURES.md");
  fs.writeFileSync(reportPath, report);

  console.log(`\n✅ Done! Report written to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${OUTPUT_DIR}/`);
  console.log(`📄 Pages captured: ${results.length}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
