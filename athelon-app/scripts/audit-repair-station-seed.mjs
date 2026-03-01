#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PARTS_CONTRACT = {
  consumables_hardware: 18,
  powerplant_service: 12,
  airframe_brake_env: 10,
  avionics_electrical: 8,
  lifeLimited: 6,
  shelfLifeLimited: 10,
  serialized: 20,
  ownerSupplied: 2,
  lowStock: 6,
  pendingInspection: 4,
  quarantine: 4,
  removedPendingDisposition: 4,
  installed: 6,
  expiredShelfLife: 2,
  nearLifeLimit: 2,
  lifeExpiredInQuarantine: 1,
  pendingWithoutInspection: 4,
};

function runConvex(functionName, args) {
  const argJson = JSON.stringify(args);
  const cmd = `npx convex run ${functionName} '${argJson}'`;
  return execSync(cmd, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
  }).trim();
}

function parseConvexJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  }
  throw new Error(`Unable to parse Convex JSON output:\n${raw}`);
}

function markdownTable(rows) {
  if (rows.length === 0) return "";
  const header = Object.keys(rows[0]);
  const divider = header.map(() => "---");
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${header.map((key) => String(row[key] ?? "")).join(" | ")} |`);
  }

  return lines.join("\n");
}

function severityRank(severity) {
  switch (severity) {
    case "critical": return 0;
    case "high": return 1;
    case "medium": return 2;
    case "low": return 3;
    default: return 4;
  }
}

function statusText(status) {
  return status === "resolved" ? "Resolved" : "Open";
}

function main() {
  const scenarioKey = process.env.ATHELON_SCENARIO_KEY || "ATHELON-DEMO-KA-TBM-2LOC";
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const dateStamp = `${y}-${m}-${d}`;

  const coverage = parseConvexJson(
    runConvex("seedAudit:getRepairStationSeedCoverage", { scenarioKey }),
  );

  const gapsRaw = runConvex("seedAudit:getSchedulerParityGaps", { scenarioKey });
  let gaps;
  try {
    gaps = JSON.parse(gapsRaw);
  } catch {
    const start = gapsRaw.indexOf("[");
    const end = gapsRaw.lastIndexOf("]");
    if (start >= 0 && end > start) {
      gaps = JSON.parse(gapsRaw.slice(start, end + 1));
    } else {
      throw new Error(`Unable to parse gap output:\n${gapsRaw}`);
    }
  }

  const sortedGaps = [...gaps].sort((a, b) => {
    if ((a.status ?? "open") !== (b.status ?? "open")) {
      return (a.status ?? "open") === "open" ? -1 : 1;
    }
    return severityRank(a.severity) - severityRank(b.severity);
  });

  const countsRows = Object.keys(coverage.requiredCounts).map((key) => ({
    Item: key,
    Required: coverage.requiredCounts[key],
    Actual: coverage.actualCounts[key],
    Pass: coverage.requiredCounts[key] === coverage.actualCounts[key] ? "yes" : "no",
  }));

  const perLocationRows = (coverage.perLocationScheduledCounts ?? []).map((row) => ({
    Location: row.locationCode,
    Scheduled: row.scheduled,
    Target: 15,
    Pass: row.scheduled === 15 ? "yes" : "no",
  }));

  const perLocationToolRows = (coverage.perLocationToolCounts ?? []).map((row) => ({
    Location: row.locationCode,
    Tools: row.tools,
    Target: 20,
    Pass: row.tools === 20 ? "yes" : "no",
  }));

  const fleetRows = (coverage.fleetComponentCoverage ?? []).map((row) => ({
    Tail: row.tailNumber,
    Expected: row.expected,
    Engines: row.engines,
    Propellers: row.propellers,
    Pass: row.engines === row.expected && row.propellers === row.expected ? "yes" : "no",
  }));

  const familyRows = [
    {
      Metric: "consumables_hardware",
      Actual: coverage.partsUseCaseCoverage?.familyCounts?.consumables_hardware ?? 0,
      Required: PARTS_CONTRACT.consumables_hardware,
    },
    {
      Metric: "powerplant_service",
      Actual: coverage.partsUseCaseCoverage?.familyCounts?.powerplant_service ?? 0,
      Required: PARTS_CONTRACT.powerplant_service,
    },
    {
      Metric: "airframe_brake_env",
      Actual: coverage.partsUseCaseCoverage?.familyCounts?.airframe_brake_env ?? 0,
      Required: PARTS_CONTRACT.airframe_brake_env,
    },
    {
      Metric: "avionics_electrical",
      Actual: coverage.partsUseCaseCoverage?.familyCounts?.avionics_electrical ?? 0,
      Required: PARTS_CONTRACT.avionics_electrical,
    },
  ].map((row) => ({ ...row, Pass: row.Actual >= row.Required ? "yes" : "no" }));

  const edgeRows = Object.entries(PARTS_CONTRACT)
    .filter(([key]) => !["consumables_hardware", "powerplant_service", "airframe_brake_env", "avionics_electrical"].includes(key))
    .map(([key, required]) => {
      const actual = coverage.partsUseCaseCoverage?.[key] ?? 0;
      return {
        Metric: key,
        Actual: actual,
        Required: required,
        Pass: actual >= required ? "yes" : "no",
      };
    });

  const toolStatusRows = Object.entries(coverage.toolStatusMix ?? {}).map(([status, count]) => ({
    Status: status,
    Count: count,
  }));

  const toolCategoryRows = Object.entries(coverage.toolCategoryMix ?? {}).map(([category, count]) => ({
    Category: category,
    Count: count,
  }));

  const openGaps = sortedGaps.filter((gap) => (gap.status ?? "open") !== "resolved");
  const resolvedGaps = sortedGaps.filter((gap) => (gap.status ?? "open") === "resolved");

  const lines = [];
  lines.push(`# Repair Station Seed Audit Report (${dateStamp})`);
  lines.push("");
  lines.push(`Scenario key: \`${scenarioKey}\``);
  lines.push(`Coverage pass: **${coverage.coveragePassFail?.pass ? "PASS" : "FAIL"}**`);
  lines.push("");

  lines.push("## Count Coverage");
  lines.push("");
  lines.push(markdownTable(countsRows));
  lines.push("");

  lines.push("## Per-Location Scheduled Counts");
  lines.push("");
  lines.push(perLocationRows.length > 0 ? markdownTable(perLocationRows) : "No location rows returned.");
  lines.push("");

  lines.push("## Per-Location Tool Counts");
  lines.push("");
  lines.push(perLocationToolRows.length > 0 ? markdownTable(perLocationToolRows) : "No tool location rows returned.");
  lines.push("");

  lines.push("## Fleet Component Coverage");
  lines.push("");
  lines.push(fleetRows.length > 0 ? markdownTable(fleetRows) : "No fleet component rows returned.");
  lines.push("");

  lines.push("## Parts Family Coverage");
  lines.push("");
  lines.push(markdownTable(familyRows));
  lines.push("");

  lines.push("## Parts Edge Coverage");
  lines.push("");
  lines.push(markdownTable(edgeRows));
  lines.push("");

  lines.push("## Tool Status Mix");
  lines.push("");
  lines.push(toolStatusRows.length > 0 ? markdownTable(toolStatusRows) : "No tool status data.");
  lines.push("");

  lines.push("## Tool Category Mix");
  lines.push("");
  lines.push(toolCategoryRows.length > 0 ? markdownTable(toolCategoryRows) : "No tool category data.");
  lines.push("");

  if ((coverage.coveragePassFail?.failures ?? []).length > 0) {
    lines.push("## Coverage Failures");
    lines.push("");
    for (const failure of coverage.coveragePassFail.failures) {
      lines.push(`- ${failure}`);
    }
    lines.push("");
  }

  lines.push("## Gap Summary");
  lines.push("");
  lines.push(`- Open gaps: **${openGaps.length}**`);
  lines.push(`- Resolved gaps: **${resolvedGaps.length}**`);
  lines.push("");

  lines.push("## Gaps");
  lines.push("");
  for (const gap of sortedGaps) {
    lines.push(`### ${gap.gapId} (${statusText(gap.status)})`);
    lines.push("");
    lines.push(`- Severity: ${gap.severity}`);
    lines.push(`- Category: ${gap.category}`);
    lines.push(`- Impact: ${gap.impact}`);
    lines.push(`- Recommended fix: ${gap.recommendedFix}`);
    lines.push(`- Evidence: \`${JSON.stringify(gap.evidence)}\``);
    lines.push("");
  }

  const outDir = path.join(ROOT, "artifacts", "seed-audit");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${dateStamp}-repair-station-gap-report.md`);
  fs.writeFileSync(outFile, lines.join("\n"), "utf8");

  console.log(`Coverage pass: ${coverage.coveragePassFail?.pass ? "PASS" : "FAIL"}`);
  console.log(`Open gaps: ${openGaps.length}`);
  console.log(`Resolved gaps: ${resolvedGaps.length}`);
  console.log(`Report written: ${outFile}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
