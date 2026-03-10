#!/usr/bin/env npx tsx
/**
 * Website Discovery Script for Part 145 & Part 135 Prospects
 *
 * Reads the Part 145 and Part 135 data files, identifies entries with null websites,
 * and outputs search queries + email-domain hints for website discovery.
 *
 * Workflow:
 * 1. Run this script to generate a discovery queue (JSON)
 * 2. Use Claude Code's WebSearch tool (or manual Google) to find websites
 * 3. Save results to a results JSON file
 * 4. Run this script with --merge to update the data files
 *
 * Usage:
 *   npx tsx discover-websites.ts                    # Generate discovery queue
 *   npx tsx discover-websites.ts --merge results.json  # Merge results back
 *   npx tsx discover-websites.ts --stats            # Show coverage stats
 */

import * as fs from "fs";
import * as path from "path";

const APP_DATA_DIR = path.resolve(
  __dirname,
  "../../../apps/athelon-app/src/shared/data"
);
const PART145_PATH = path.join(APP_DATA_DIR, "coloradoPart145Research.ts");
const PART135_PATH = path.join(APP_DATA_DIR, "part135Operators.ts");

type DiscoveryEntry = {
  dataset: "part145" | "part135";
  entityId: string;
  legalName: string;
  dbaName?: string | null;
  city: string;
  state: string;
  emailDomainHint: string | null;
  searchQuery: string;
  outreachTier?: "A" | "B" | "C";
  faaDistrictOffice?: string;
  fleetSize?: number;
};

type DiscoveryResult = {
  entityId: string;
  dataset: "part145" | "part135";
  website: string | null;
  confidence: "high" | "medium" | "low";
  source: string;
};

type Part145Record = {
  entityId: string;
  legalName: string;
  dbaName?: string | null;
  city: string;
  state: string;
  email?: string | null;
  website?: string | null;
};

type Part135Record = {
  entityId: string;
  legalName: string;
  faaDistrictOffice: string;
  fleetSize: number;
  outreachTier: "A" | "B" | "C";
  website?: string | null;
};

type QueueOptions = {
  dataset?: "part145" | "part135";
  tiers: Set<"A" | "B" | "C">;
  limit?: number;
};

function extractEmailDomain(email: string | null): string | null {
  if (!email) return null;
  const domain = email.split("@")[1];
  if (!domain) return null;
  // Skip generic email providers
  const generic = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "aol.com",
    "msn.com",
    "earthlink.net",
    "outlook.com",
    "icloud.com",
    "comcast.net",
  ];
  if (generic.includes(domain.toLowerCase())) return null;
  return domain.toLowerCase();
}

function readTsDataArray(filePath: string, exportName: string): unknown[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const patterns = [
    new RegExp(
      `export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*\\])\\s+as\\s+[A-Za-z0-9_\\[\\]<>]+\\s*;`,
      "m"
    ),
    new RegExp(
      `export const ${exportName}[^=]*=\\s*(\\[[\\s\\S]*\\]);`,
      "m"
    ),
  ];
  const match = patterns
    .map((pattern) => content.match(pattern))
    .find(Boolean);
  if (!match) {
    throw new Error(
      `Could not find export "${exportName}" in ${filePath}`
    );
  }
  return JSON.parse(match[1]);
}

function writeTsDataArray(
  filePath: string,
  exportName: string,
  data: unknown[]
): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const replacement = JSON.stringify(data, null, 2);
  const pattern = new RegExp(
    `(export const ${exportName}[^=]*=\\s*)(\\[[\\s\\S]*\\])(\\s+as\\s+[A-Za-z0-9_\\[\\]<>]+)?;`,
    "m"
  );
  if (!pattern.test(content)) {
    throw new Error(`Could not rewrite export "${exportName}" in ${filePath}`);
  }
  const updated = content.replace(
    pattern,
    (_match, prefix: string, _array: string, suffix?: string) =>
      `${prefix}${replacement}${suffix ?? ""};`
  );
  fs.writeFileSync(filePath, updated, "utf-8");
}

function parseArgs(args: string[]): QueueOptions {
  const options: QueueOptions = {
    tiers: new Set(["A", "B", "C"]),
  };

  const datasetIdx = args.indexOf("--dataset");
  if (datasetIdx !== -1) {
    const dataset = args[datasetIdx + 1];
    if (dataset === "part145" || dataset === "part135") {
      options.dataset = dataset;
    }
  }

  const tiersIdx = args.indexOf("--tiers");
  if (tiersIdx !== -1) {
    const raw = args[tiersIdx + 1] ?? "";
    const tiers = raw
      .split(",")
      .map((tier) => tier.trim().toUpperCase())
      .filter((tier): tier is "A" | "B" | "C" =>
        tier === "A" || tier === "B" || tier === "C"
      );
    if (tiers.length > 0) {
      options.tiers = new Set(tiers);
    }
  }

  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1) {
    const value = Number(args[limitIdx + 1]);
    if (Number.isFinite(value) && value > 0) {
      options.limit = value;
    }
  }

  return options;
}

function generateQueue(options: QueueOptions): DiscoveryEntry[] {
  const queue: DiscoveryEntry[] = [];

  // Part 145
  if (!options.dataset || options.dataset === "part145") {
    try {
    const part145 = readTsDataArray(
      PART145_PATH,
      "coloradoPart145Research"
    ) as Part145Record[];

    for (const entry of part145) {
      if (entry.website) continue;
      const emailDomain = extractEmailDomain(entry.email ?? null);
      const searchName = entry.dbaName
        ? `${entry.legalName} ${entry.dbaName}`
        : entry.legalName;
      queue.push({
        dataset: "part145",
        entityId: entry.entityId,
        legalName: entry.legalName,
        dbaName: entry.dbaName,
        city: entry.city,
        state: entry.state,
        emailDomainHint: emailDomain,
        searchQuery: `"${searchName}" ${entry.city} ${entry.state} aviation`,
      });
    }
    } catch (e) {
      console.error("Error reading Part 145 data:", e);
    }
  }

  // Part 135
  if (!options.dataset || options.dataset === "part135") {
    try {
    const part135 = readTsDataArray(
      PART135_PATH,
      "part135Operators"
    ) as Part135Record[];

    for (const entry of part135) {
      if (entry.website) continue;
      if (!options.tiers.has(entry.outreachTier)) continue;
      queue.push({
        dataset: "part135",
        entityId: entry.entityId,
        legalName: entry.legalName,
        city: "",
        state: "",
        emailDomainHint: null,
        searchQuery:
          `"${entry.legalName}" "${entry.faaDistrictOffice}" aviation charter operator`,
        outreachTier: entry.outreachTier,
        faaDistrictOffice: entry.faaDistrictOffice,
        fleetSize: entry.fleetSize,
      });
    }
    } catch (e) {
      console.error("Error reading Part 135 data:", e);
    }
  }

  if (options.limit) {
    return queue.slice(0, options.limit);
  }

  return queue;
}

function showStats(): void {
  console.log("=== Website Coverage Stats ===\n");

  try {
    const part145 = readTsDataArray(
      PART145_PATH,
      "coloradoPart145Research"
    ) as Array<{ website?: string | null }>;
    const with145 = part145.filter((e) => e.website).length;
    console.log(
      `Part 145 (Colorado): ${with145}/${part145.length} have websites (${Math.round((with145 / part145.length) * 100)}%)`
    );
  } catch {
    console.log("Part 145: could not read");
  }

  try {
    const part135 = readTsDataArray(
      PART135_PATH,
      "part135Operators"
    ) as Part135Record[];
    const with135 = part135.filter((e) => e.website).length;
    console.log(
      `Part 135:            ${with135}/${part135.length} have websites (${Math.round((with135 / part135.length) * 100)}%)`
    );
    const unresolved = part135.filter((e) => !e.website);
    const byTier = unresolved.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.outreachTier] = (acc[entry.outreachTier] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `  Remaining null websites: ${unresolved.length} (A: ${byTier.A ?? 0}, B: ${byTier.B ?? 0}, C: ${byTier.C ?? 0})`
    );
  } catch {
    console.log("Part 135: could not read");
  }
}

function mergeResults(resultsPath: string): void {
  const results: DiscoveryResult[] = JSON.parse(
    fs.readFileSync(resultsPath, "utf-8")
  );

  const part145Results = results.filter((r) => r.dataset === "part145");
  const part135Results = results.filter((r) => r.dataset === "part135");

  if (part145Results.length > 0) {
    const part145 = readTsDataArray(
      PART145_PATH,
      "coloradoPart145Research"
    ) as Array<Record<string, unknown>>;
    const byId = new Map(part145.map((entry) => [entry.entityId, entry]));
    for (const result of part145Results) {
      if (!result.website) continue;
      const entry = byId.get(result.entityId);
      if (!entry) continue;
      entry.website = result.website;
      if ("hasWebsite" in entry) {
        entry.hasWebsite = true;
      }
    }
    writeTsDataArray(PART145_PATH, "coloradoPart145Research", part145);
    console.log(`Updated ${part145Results.filter((r) => r.website).length} Part 145 entries`);
  }

  if (part135Results.length > 0) {
    const part135 = readTsDataArray(
      PART135_PATH,
      "part135Operators"
    ) as Array<Record<string, unknown>>;
    const byId = new Map(part135.map((entry) => [entry.entityId, entry]));
    for (const result of part135Results) {
      if (!result.website) continue;
      const entry = byId.get(result.entityId);
      if (!entry) continue;
      entry.website = result.website;
    }
    writeTsDataArray(PART135_PATH, "part135Operators", part135);
    console.log(`Updated ${part135Results.filter((r) => r.website).length} Part 135 entries`);
  }
}

// CLI
const args = process.argv.slice(2);
const options = parseArgs(args);

if (args.includes("--stats")) {
  showStats();
} else if (args.includes("--merge")) {
  const idx = args.indexOf("--merge");
  const resultsPath = args[idx + 1];
  if (!resultsPath) {
    console.error("Usage: discover-websites.ts --merge <results.json>");
    process.exit(1);
  }
  mergeResults(resultsPath);
  showStats();
} else {
  const queue = generateQueue(options);
  const suffix = [
    options.dataset ?? "all",
    options.dataset === "part135"
      ? `tiers-${Array.from(options.tiers).sort().join("")}`
      : null,
    options.limit ? `limit-${options.limit}` : null,
  ]
    .filter(Boolean)
    .join("-");
  const outputPath = path.join(__dirname, `discovery-queue-${suffix}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(queue, null, 2));
  console.log(`Generated ${queue.length} search queries → ${outputPath}`);
  console.log(
    `\nPart 145: ${queue.filter((q) => q.dataset === "part145").length} entries`
  );
  console.log(
    `Part 135: ${queue.filter((q) => q.dataset === "part135").length} entries`
  );
  console.log(
    `\nWith email domain hints: ${queue.filter((q) => q.emailDomainHint).length}`
  );
  if (options.dataset === "part135") {
    const tierCounts = queue.reduce<Record<string, number>>((acc, entry) => {
      const tier = entry.outreachTier ?? "unknown";
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `Tier mix: A ${tierCounts.A ?? 0}, B ${tierCounts.B ?? 0}, C ${tierCounts.C ?? 0}`
    );
  }
  console.log("\nNext steps:");
  console.log(
    "  1. Use Claude Code WebSearch to find websites for each entry"
  );
  console.log("  2. Save results as discovery-results.json");
  console.log(
    "  3. Run: npx tsx discover-websites.ts --merge discovery-results.json"
  );
}
