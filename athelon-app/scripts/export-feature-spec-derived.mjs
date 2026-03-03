#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_MASTER = "MASTER-BUILD-LIST.md";
const DEFAULT_REGISTRY = "docs/plans/MASTER-FEATURE-REGISTRY.csv";
const DEFAULT_CROSSWALK = "docs/plans/MASTER-FEATURE-CROSSWALK.md";
const DEFAULT_BUILD_PLAN = "docs/plans/MASTER-BUILD-PLAN.md";

function parseArgs(argv) {
  const opts = {
    master: DEFAULT_MASTER,
    registryOut: DEFAULT_REGISTRY,
    crosswalkOut: DEFAULT_CROSSWALK,
    buildPlanOut: DEFAULT_BUILD_PLAN,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--master") {
      opts.master = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--registry-out") {
      opts.registryOut = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--crosswalk-out") {
      opts.crosswalkOut = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--build-plan-out") {
      opts.buildPlanOut = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return opts;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/export-feature-spec-derived.mjs [--master MASTER-BUILD-LIST.md]",
      "",      
      "Outputs:",
      "  - docs/plans/MASTER-FEATURE-REGISTRY.csv",
      "  - docs/plans/MASTER-FEATURE-CROSSWALK.md",
      "  - docs/plans/MASTER-BUILD-PLAN.md",
    ].join("\n"),
  );
}

function findHeadingIndex(lines, headingPrefix) {
  return lines.findIndex((line) => line.trim().startsWith(headingPrefix));
}

function parseMarkdownTable(lines, startHeadingPrefix, expectedHeaderPrefix) {
  const headingIndex = findHeadingIndex(lines, startHeadingPrefix);
  if (headingIndex === -1) {
    throw new Error(`Heading not found: ${startHeadingPrefix}`);
  }

  let i = headingIndex + 1;
  while (i < lines.length && !lines[i].trim().startsWith(expectedHeaderPrefix)) {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`Table header not found for heading: ${startHeadingPrefix}`);
  }

  const headerCells = splitRow(lines[i]);
  const dividerLine = lines[i + 1] ?? "";
  if (!dividerLine.trim().startsWith("|")) {
    throw new Error(`Malformed table under ${startHeadingPrefix}: missing divider`);
  }

  const rows = [];
  i += 2;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = splitRow(lines[i]);
    if (cells.length === headerCells.length) {
      const obj = {};
      for (let c = 0; c < headerCells.length; c += 1) {
        obj[headerCells[c]] = cells[c];
      }
      rows.push(obj);
    }
    i += 1;
  }

  return rows;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((s) => s.trim());
}

function csvEscape(value) {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function mapImplementationToLegacyStatus(implementationState) {
  switch (implementationState) {
    case "implemented":
      return "implemented";
    case "partially_implemented":
      return "partial";
    case "backend_needed":
      return "partial";
    case "blocked":
      return "missing";
    case "deprecated":
      return "proposed";
    case "not_implemented":
    default:
      return "missing";
  }
}

function rollupStatus(statuses) {
  if (statuses.has("missing")) return "missing";
  if (statuses.has("partial")) return "partial";
  if (statuses.has("proposed")) return "proposed";
  return "implemented";
}

function toCsvRows(registryRows) {
  const csvHeaders = [
    "mbp_id",
    "canonical_group_id",
    "title",
    "normalized_requirement",
    "source_pack",
    "source_id",
    "source_file",
    "status",
    "priority",
    "wave",
    "owner_lane",
    "dependencies",
    "acceptance_criteria",
    "test_gate",
    "notes",
  ];

  const lines = [csvHeaders.join(",")];

  for (const row of registryRows) {
    const status = row.legacy_status && row.legacy_status !== "—"
      ? row.legacy_status
      : mapImplementationToLegacyStatus(row.implementation_state);

    const values = [
      row.mbp_id,
      row.canonical_group_id,
      row.title,
      row.normalized_requirement,
      row.source_pack,
      row.source_id,
      row.source_file,
      status,
      row.priority,
      row.wave,
      row.owner_lane,
      row.dependencies,
      row.acceptance_criteria,
      row.test_gate,
      row.notes,
    ];
    lines.push(values.map(csvEscape).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function parseGroupMetadataFromCurrentCrosswalk(crosswalkPath) {
  if (!fs.existsSync(crosswalkPath)) return new Map();
  const lines = fs.readFileSync(crosswalkPath, "utf8").split(/\r?\n/);
  const idx = lines.findIndex((line) => line.trim() === "## Group Rollup");
  if (idx === -1) return new Map();

  let i = idx + 1;
  while (i < lines.length && !lines[i].trim().startsWith("| Group ID |")) i += 1;
  if (i >= lines.length) return new Map();

  i += 2;
  const map = new Map();
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = splitRow(lines[i]);
    if (cells.length >= 4 && /^GRP-\d{3}$/.test(cells[0])) {
      map.set(cells[0], {
        groupName: cells[1],
        targetWave: cells[2],
      });
    }
    i += 1;
  }
  return map;
}

function buildCrosswalk(registryRows, priorGroupMeta) {
  const grouped = new Map();

  for (const row of registryRows) {
    const gid = row.canonical_group_id;
    if (!grouped.has(gid)) {
      grouped.set(gid, {
        rows: [],
        statuses: new Set(),
        sourceIds: new Set(),
      });
    }
    const g = grouped.get(gid);
    g.rows.push(row);
    const status = row.legacy_status && row.legacy_status !== "—"
      ? row.legacy_status
      : mapImplementationToLegacyStatus(row.implementation_state);
    g.statuses.add(status);
    g.sourceIds.add(row.source_id);
  }

  const sortedGroupIds = [...grouped.keys()].sort();
  const today = new Date().toISOString().slice(0, 10);

  const out = [];
  out.push("# Master Feature Crosswalk (Derived)");
  out.push("");
  out.push(
    `Derived from \`MASTER-BUILD-LIST.md\` Registry B on ${today}. Do not edit manually; regenerate via \`npm run spec:export:derived\`.`,
  );
  out.push("");
  out.push("## Group Rollup");
  out.push("");
  out.push("| Group ID | Group Name | Target Wave | Rollup Status | Atomic Count | Merged Source IDs |");
  out.push("|---|---|---|---|---:|---|");

  for (const gid of sortedGroupIds) {
    const g = grouped.get(gid);
    const meta = priorGroupMeta.get(gid) ?? { groupName: `Group ${gid}`, targetWave: g.rows[0]?.wave ?? "Backlog" };
    const status = rollupStatus(g.statuses);
    const sourceIds = [...g.sourceIds].sort().join(", ");
    out.push(`| ${gid} | ${meta.groupName} | ${meta.targetWave} | ${status} | ${g.rows.length} | ${sourceIds} |`);
  }

  out.push("");
  out.push("## Atomic Mapping");
  out.push("");
  out.push("| MBP ID | Source Pack | Source ID | Group ID | Status | Wave | Title |");
  out.push("|---|---|---|---|---|---|---|");

  const sortedRows = [...registryRows].sort((a, b) => a.mbp_id.localeCompare(b.mbp_id));
  for (const row of sortedRows) {
    const status = row.legacy_status && row.legacy_status !== "—"
      ? row.legacy_status
      : mapImplementationToLegacyStatus(row.implementation_state);
    out.push(
      `| ${row.mbp_id} | ${row.source_pack} | ${row.source_id} | ${row.canonical_group_id} | ${status} | ${row.wave} | ${row.title} |`,
    );
  }

  out.push("");
  return out.join("\n");
}

function buildDerivedBuildPlan(registryRows) {
  const sourceCounts = new Map();
  const statusCounts = new Map();
  const waveCounts = new Map();

  for (const row of registryRows) {
    const source = row.source_pack || "UNKNOWN";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

    const legacyStatus = row.legacy_status && row.legacy_status !== "—"
      ? row.legacy_status
      : mapImplementationToLegacyStatus(row.implementation_state);
    statusCounts.set(legacyStatus, (statusCounts.get(legacyStatus) || 0) + 1);

    const wave = row.wave || "Backlog";
    waveCounts.set(wave, (waveCounts.get(wave) || 0) + 1);
  }

  const out = [];
  out.push("# MASTER BUILD PLAN (Derived Reference)");
  out.push("");
  out.push("This file is a derived planning reference generated from the canonical feature spec at `MASTER-BUILD-LIST.md`.");
  out.push("");
  out.push("Canonical source of truth: `athelon-app/MASTER-BUILD-LIST.md`");
  out.push("");
  out.push("## Canonical Ownership");
  out.push("");
  out.push("1. Do not directly author feature status in this file.");
  out.push("2. Update canonical feature records in `MASTER-BUILD-LIST.md` (Registry A/Registry B) or through Bug Hunter sync.");
  out.push("3. Regenerate derived artifacts with `npm run spec:export:derived`.");
  out.push("");
  out.push("## Derived Snapshot");
  out.push("");
  out.push(`- Total atomic features: **${registryRows.length}**`);
  out.push("- Total master features (Registry A): **53**");
  out.push(
    `- Status counts: implemented=${statusCounts.get("implemented") || 0}, partial=${statusCounts.get("partial") || 0}, missing=${statusCounts.get("missing") || 0}, proposed=${statusCounts.get("proposed") || 0}`,
  );
  out.push("");
  out.push("## Source Coverage");
  out.push("");
  out.push("| Source Pack | Atomic Count |");
  out.push("|---|---:|");
  for (const source of [...sourceCounts.keys()].sort()) {
    out.push(`| ${source} | ${sourceCounts.get(source)} |`);
  }
  out.push("");
  out.push("## Wave Distribution");
  out.push("");
  out.push("| Wave | Atomic Count |");
  out.push("|---|---:|");
  for (const wave of [...waveCounts.keys()].sort()) {
    out.push(`| ${wave} | ${waveCounts.get(wave)} |`);
  }
  out.push("");
  out.push("## Dependency and Group Reference");
  out.push("");
  out.push("Use `docs/plans/MASTER-FEATURE-CROSSWALK.md` for canonical group rollups and MBP-to-group mapping.");
  out.push("");
  out.push("## Update Workflow");
  out.push("");
  out.push("1. Update canonical registries in `MASTER-BUILD-LIST.md` (or run Bug Hunter sync).");
  out.push("2. Run `npm run spec:export:derived`.");
  out.push("3. Review diffs in:");
  out.push("   - `docs/plans/MASTER-FEATURE-REGISTRY.csv`");
  out.push("   - `docs/plans/MASTER-FEATURE-CROSSWALK.md`");
  out.push("   - `docs/plans/MASTER-BUILD-PLAN.md` (this file)");
  out.push("");
  return out.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  const masterPath = path.resolve(cwd, opts.master);
  const registryOutPath = path.resolve(cwd, opts.registryOut);
  const crosswalkOutPath = path.resolve(cwd, opts.crosswalkOut);
  const buildPlanOutPath = path.resolve(cwd, opts.buildPlanOut);

  const masterLines = fs.readFileSync(masterPath, "utf8").split(/\r?\n/);
  const registryRows = parseMarkdownTable(
    masterLines,
    "## Registry B — Atomic Features",
    "| mbp_id |",
  );

  if (registryRows.length === 0) {
    throw new Error("No Registry B rows found in canonical master file.");
  }

  const csvData = toCsvRows(registryRows);
  fs.writeFileSync(registryOutPath, csvData, "utf8");

  const priorGroupMeta = parseGroupMetadataFromCurrentCrosswalk(crosswalkOutPath);
  const crosswalkMd = buildCrosswalk(registryRows, priorGroupMeta);
  fs.writeFileSync(crosswalkOutPath, `${crosswalkMd}\n`, "utf8");

  const buildPlanMd = buildDerivedBuildPlan(registryRows);
  fs.writeFileSync(buildPlanOutPath, `${buildPlanMd}\n`, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        master: path.relative(cwd, masterPath),
        registryOut: path.relative(cwd, registryOutPath),
        crosswalkOut: path.relative(cwd, crosswalkOutPath),
        buildPlanOut: path.relative(cwd, buildPlanOutPath),
        rowsExported: registryRows.length,
      },
      null,
      2,
    ) + "\n",
  );
}

main();
