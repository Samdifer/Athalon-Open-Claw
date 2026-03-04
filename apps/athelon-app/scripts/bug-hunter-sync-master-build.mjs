#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const LEGACY_STATE_TO_IMPL = {
  "Not Implemented": "not_implemented",
  "Partially Implemented": "partially_implemented",
  Implemented: "implemented",
  "Backend Needed": "backend_needed",
};

const IMPL_TO_LEGACY = {
  not_implemented: "Not Implemented",
  partially_implemented: "Partially Implemented",
  implemented: "Implemented",
  backend_needed: "Backend Needed",
  blocked: "Backend Needed",
  deprecated: "Not Implemented",
};

const APPENDIX_FILES = {
  ledger: "docs/feature-spec-appendices/bug-hunter-categorization-ledger.md",
  detected: "docs/feature-spec-appendices/detected-features-log.md",
  qa: "docs/feature-spec-appendices/qa-artifact-reconciliation-log.md",
  runlog: "docs/feature-spec-appendices/bug-hunter-run-log.md",
};

const HEADINGS = {
  registryA: "## Registry A — Master Features",
  ledger: "### Bug Hunter Categorization Ledger",
  detected: "### Detected Features Not Previously Represented",
  qa: "### QA Artifact Reconciliation",
  runlog: "### Bug Hunter Automation Run Log",
};

function parseArgs(argv) {
  const opts = {
    reportPath: "",
    masterPath: "docs/spec/MASTER-BUILD-LIST.md",
    dryRun: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--report") {
      opts.reportPath = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--master") {
      opts.masterPath = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (token === "--force") {
      opts.force = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!opts.reportPath) {
    throw new Error("Missing required --report path.");
  }

  return opts;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/bug-hunter-sync-master-build.mjs --report <path> [--master docs/spec/MASTER-BUILD-LIST.md] [--dry-run] [--force]",
      "",
      "Behavior:",
      "  - Requires report.validation.status = \"pass\".",
      "  - Updates Registry A in canonical master feature spec.",
      "  - Appends Bug Hunter ledger/detected/QA/run-log rows into feature-spec appendices.",
      "  - Accepts legacy and v2 feature update payload fields.",
    ].join("\n"),
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureValidationPassed(report) {
  const status = String(report?.validation?.status ?? "").toLowerCase().trim();
  if (status !== "pass") {
    throw new Error(
      "Refusing sync: report.validation.status must be \"pass\" before spec updates.",
    );
  }
}

function normalizeRunDate(input) {
  if (!input) throw new Error("runDate is required");
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00Z`;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid runDate: ${input}`);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function findHeadingIndex(lines, headingPrefix) {
  return lines.findIndex((line) => line.trim().startsWith(headingPrefix));
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function formatRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function getTableRange(lines, headingPrefix, headerPrefix) {
  const headingIdx = findHeadingIndex(lines, headingPrefix);
  if (headingIdx === -1) {
    throw new Error(`Heading not found: ${headingPrefix}`);
  }
  let i = headingIdx + 1;
  while (i < lines.length && !lines[i].trim().startsWith(headerPrefix)) i += 1;
  if (i >= lines.length) {
    throw new Error(`Table header not found for heading ${headingPrefix}`);
  }
  const header = splitRow(lines[i]);
  const divider = i + 1;
  if (!lines[divider] || !lines[divider].trim().startsWith("|")) {
    throw new Error(`Malformed table under ${headingPrefix}`);
  }
  let dataStart = i + 2;
  let dataEnd = dataStart;
  while (dataEnd < lines.length && lines[dataEnd].trim().startsWith("|")) dataEnd += 1;
  return { header, headerIndex: i, dividerIndex: divider, dataStart, dataEnd };
}

function cleanCell(value) {
  const v = String(value ?? "—").replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
  return v.length ? v : "—";
}

function getAppendixPath(cwd, relPath) {
  return path.resolve(cwd, relPath);
}

function ensureAppendixFile(filePath, heading, headerRow, dividerRow, note) {
  if (fs.existsSync(filePath)) return;
  const lines = [heading, "", note, "", headerRow, dividerRow, ""];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

function parseFsNumFromId(fsId) {
  const m = /^FS-(\d{4})$/.exec(fsId || "");
  if (!m) return null;
  return Number(m[1]);
}

function fsIdFromNumber(featureNumber) {
  if (!Number.isFinite(featureNumber) || featureNumber <= 0) return null;
  return `FS-${String(featureNumber).padStart(4, "0")}`;
}

function implementationFromUpdate(update) {
  if (update.implementationState) {
    return String(update.implementationState).trim();
  }
  if (update.currentState) {
    return LEGACY_STATE_TO_IMPL[String(update.currentState).trim()] ?? "partially_implemented";
  }
  return "partially_implemented";
}

function verificationFromUpdate(update, implementationState) {
  if (update.verificationState) return String(update.verificationState).trim();
  if (implementationState === "implemented") return "qa_verified";
  if (implementationState === "partially_implemented" || implementationState === "backend_needed") {
    return "doc_reviewed";
  }
  return "unreviewed";
}

function defaultVerifiedAt(verificationState, runAt) {
  if (["app_verified", "qa_verified", "production_verified"].includes(verificationState)) {
    return runAt;
  }
  return "null";
}

function setRowValueByHeader(rowCells, header, column, value) {
  const idx = header.indexOf(column);
  if (idx === -1) return;
  rowCells[idx] = cleanCell(value);
}

function upsertRegistryA(masterLines, report, runAt) {
  const table = getTableRange(masterLines, HEADINGS.registryA, "| fs_id |");
  const rowMap = new Map();
  let maxFeatureNum = 0;

  for (let i = table.dataStart; i < table.dataEnd; i += 1) {
    const cells = splitRow(masterLines[i]);
    const fsId = cells[table.header.indexOf("fs_id")];
    const featureNum = Number(cells[table.header.indexOf("feature_number")]);
    if (Number.isFinite(featureNum) && featureNum > maxFeatureNum) maxFeatureNum = featureNum;
    rowMap.set(fsId, cells);
  }

  const updates = Array.isArray(report.featureStateUpdates) ? report.featureStateUpdates : [];
  let touched = 0;

  for (const update of updates) {
    const fsId = update.fsId || fsIdFromNumber(Number(update.featureNumber));
    if (!fsId) continue;

    const existing = rowMap.get(fsId);
    if (!existing) continue;

    const implementationState = implementationFromUpdate(update);
    const verificationState = verificationFromUpdate(update, implementationState);

    setRowValueByHeader(existing, table.header, "feature_name", update.featureName || existing[table.header.indexOf("feature_name")]);
    setRowValueByHeader(existing, table.header, "implementation_state", implementationState);
    setRowValueByHeader(existing, table.header, "verification_state", verificationState);
    setRowValueByHeader(existing, table.header, "last_reviewed_at_utc", update.lastReviewedAtUtc || runAt);
    setRowValueByHeader(
      existing,
      table.header,
      "last_verified_in_app_at_utc",
      update.lastVerifiedInAppAtUtc || defaultVerifiedAt(verificationState, runAt),
    );
    setRowValueByHeader(existing, table.header, "reviewed_by", update.reviewedBy || "bug-hunter-sync");

    const evidence = update.evidenceLinks
      || `BugHunter=${cleanCell(update.bugHunterEvidence || "—")}; QA=${cleanCell(update.qaAuditEvidence || "—")}`;
    setRowValueByHeader(existing, table.header, "evidence_links", evidence);

    if (update.whatNowWorks) {
      setRowValueByHeader(existing, table.header, "current_context_update", update.whatNowWorks);
    }
    if (update.rebuildNotes) {
      setRowValueByHeader(existing, table.header, "interconnection_notes", update.rebuildNotes);
    }
    setRowValueByHeader(existing, table.header, "legacy_state_snapshot", IMPL_TO_LEGACY[implementationState] || "Partially Implemented");

    rowMap.set(fsId, existing);
    touched += 1;
  }

  // New master features -> append as new FS rows
  const newFeatures = Array.isArray(report.newMasterFeatures) ? report.newMasterFeatures : [];
  const appendedFs = [];

  for (const entry of newFeatures) {
    maxFeatureNum += 1;
    const fsId = fsIdFromNumber(maxFeatureNum);
    const impl = implementationFromUpdate(entry);
    const ver = verificationFromUpdate(entry, impl);
    const newRow = table.header.map(() => "—");

    setRowValueByHeader(newRow, table.header, "fs_id", fsId);
    setRowValueByHeader(newRow, table.header, "feature_number", maxFeatureNum);
    setRowValueByHeader(newRow, table.header, "feature_name", entry.featureName || `Detected Feature ${maxFeatureNum}`);
    setRowValueByHeader(newRow, table.header, "implementation_state", impl);
    setRowValueByHeader(newRow, table.header, "verification_state", ver);
    setRowValueByHeader(newRow, table.header, "last_reviewed_at_utc", entry.lastReviewedAtUtc || runAt);
    setRowValueByHeader(
      newRow,
      table.header,
      "last_verified_in_app_at_utc",
      entry.lastVerifiedInAppAtUtc || defaultVerifiedAt(ver, runAt),
    );
    setRowValueByHeader(newRow, table.header, "reviewed_by", entry.reviewedBy || "bug-hunter-sync");
    setRowValueByHeader(newRow, table.header, "intended_outcome", entry.gapIdentified || entry.frontendSpec || "Auto-discovered feature from Bug Hunter sync.");
    setRowValueByHeader(newRow, table.header, "current_context_update", entry.whatNowWorks || "Captured from validated Bug Hunter cycle.");
    setRowValueByHeader(newRow, table.header, "evidence_links", `BugHunter=${cleanCell(entry.bugHunterEvidence || "—")}; QA=${cleanCell(entry.qaAuditEvidence || "—")}`);
    setRowValueByHeader(newRow, table.header, "related_ids", `${fsId}; ${cleanCell(report.runId || "—")}`);
    setRowValueByHeader(newRow, table.header, "interconnection_notes", entry.rebuildNotes || entry.frontendSpec || "Follow-up implementation spec required.");
    setRowValueByHeader(newRow, table.header, "legacy_state_snapshot", IMPL_TO_LEGACY[impl] || "Partially Implemented");

    rowMap.set(fsId, newRow);
    appendedFs.push({ fsId, featureNumber: maxFeatureNum });
  }

  const sortedRows = [...rowMap.entries()]
    .sort((a, b) => {
      const an = parseFsNumFromId(a[0]) ?? Number.MAX_SAFE_INTEGER;
      const bn = parseFsNumFromId(b[0]) ?? Number.MAX_SAFE_INTEGER;
      return an - bn;
    })
    .map(([, cells]) => formatRow(cells));

  masterLines.splice(table.dataStart, table.dataEnd - table.dataStart, ...sortedRows);

  return {
    touched,
    appendedFs,
  };
}

function upsertAliasIndexForNewFs(masterLines, appendedFs, runAt) {
  if (!appendedFs.length) return 0;
  const table = getTableRange(masterLines, "## Alias Index", "| legacy_id |");
  const existing = new Set();
  for (let i = table.dataStart; i < table.dataEnd; i += 1) {
    const cells = splitRow(masterLines[i]);
    existing.add(`${cells[0]}::${cells[2]}::${cells[4]}`);
  }

  const toAdd = [];
  const runDate = runAt.slice(0, 10);
  for (const item of appendedFs) {
    const row = [
      `Feature #${item.featureNumber}`,
      "fs",
      item.fsId,
      "—",
      "docs/spec/MASTER-BUILD-LIST.md",
      runDate,
    ].map(cleanCell);
    const key = `${row[0]}::${row[2]}::${row[4]}`;
    if (!existing.has(key)) {
      existing.add(key);
      toAdd.push(formatRow(row));
    }
  }

  if (!toAdd.length) return 0;
  masterLines.splice(table.dataEnd, 0, ...toAdd);
  return toAdd.length;
}

function appendRowsToTable(filePath, headingPrefix, headerPrefix, keyFn, rowsToAppend, force = false) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const table = getTableRange(lines, headingPrefix, headerPrefix);

  const existingKeys = new Set();
  for (let i = table.dataStart; i < table.dataEnd; i += 1) {
    const cells = splitRow(lines[i]);
    existingKeys.add(keyFn(cells));
  }

  const appended = [];
  for (const rowCells of rowsToAppend) {
    const key = keyFn(rowCells);
    if (!force && existingKeys.has(key)) continue;
    existingKeys.add(key);
    appended.push(formatRow(rowCells.map(cleanCell)));
  }

  if (appended.length) {
    lines.splice(table.dataEnd, 0, ...appended);
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  }

  return appended.length;
}

function toLedgerRow(entry) {
  return [
    `\`${cleanCell(entry.bugId)}\``,
    cleanCell(entry.cycleDate || "n/a / n/a"),
    cleanCell(entry.persona || "n/a"),
    cleanCell(entry.primaryCategory || "Regulatory/Compliance"),
    cleanCell(entry.secondaryCategory || "Workflow"),
    cleanCell(entry.subsystem || "Cross-Module"),
    cleanCell(entry.fsId || entry.mappedFeature || "Unmapped"),
    cleanCell(entry.currentResolution || "Implemented"),
    `\`${cleanCell(entry.evidenceLink || "—")}\``,
  ];
}

function toDetectedRow(entry) {
  return [
    `\`${cleanCell(entry.detectedId)}\``,
    `\`${cleanCell(entry.observedIn)}\``,
    cleanCell(entry.functionalCapabilityExposed || "—"),
    cleanCell(entry.fsId || entry.mappedFeatureOrNew || entry.mappedFeature || "Unmapped"),
    cleanCell(entry.specContext || "—"),
    cleanCell(entry.status || "Detected"),
  ];
}

function toQaRow(entry) {
  return [
    `\`${cleanCell(entry.qaId)}\``,
    `\`${cleanCell(entry.source)}\``,
    cleanCell(entry.fsId || entry.mappedFeature || "Unmapped"),
    cleanCell(entry.resolutionState || "Open"),
    cleanCell(entry.notes || "—"),
  ];
}

function toRunLogRow(report, runAt, bugsAdded, featuresTouched, newFeaturesAdded, reportRef) {
  return [
    cleanCell(report.runId || "UNKNOWN-RUN"),
    runAt.slice(0, 10),
    cleanCell(report?.validation?.status || "pass"),
    String(bugsAdded),
    String(featuresTouched),
    String(newFeaturesAdded),
    cleanCell(reportRef),
  ];
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  const masterPath = path.resolve(cwd, opts.masterPath);
  const reportPath = path.resolve(cwd, opts.reportPath);
  const reportRef = path.relative(cwd, reportPath) || path.basename(reportPath);
  const report = readJson(reportPath);

  ensureValidationPassed(report);
  const runAt = normalizeRunDate(report.runDate);

  const masterLines = fs.readFileSync(masterPath, "utf8").split(/\r?\n/);
  const { touched: featuresTouched, appendedFs } = upsertRegistryA(masterLines, report, runAt);
  const aliasRowsAdded = upsertAliasIndexForNewFs(masterLines, appendedFs, runAt);

  const appendixPaths = {
    ledger: getAppendixPath(cwd, APPENDIX_FILES.ledger),
    detected: getAppendixPath(cwd, APPENDIX_FILES.detected),
    qa: getAppendixPath(cwd, APPENDIX_FILES.qa),
    runlog: getAppendixPath(cwd, APPENDIX_FILES.runlog),
  };

  ensureAppendixFile(
    appendixPaths.ledger,
    HEADINGS.ledger,
    "| Bug ID | Cycle/Date | Persona | Primary Category | Secondary Category | Subsystem | Mapped Feature # | Current Resolution | Evidence Link |",
    "|---|---|---|---|---|---|---:|---|---|",
    "Coverage note: append-only bug ledger updates from validated Bug Hunter runs.",
  );

  ensureAppendixFile(
    appendixPaths.detected,
    HEADINGS.detected,
    "| Detected ID | Observed In | Functional Capability Exposed | Mapped Existing Feature # or New Detected Feature | Spec Context | Status |",
    "|---|---|---|---|---|---|",
    "Detection note: append-only rows for in-code Bug Hunter IDs and alias captures.",
  );

  ensureAppendixFile(
    appendixPaths.qa,
    HEADINGS.qa,
    "| QA ID | Source | Mapped Feature # | Resolution State | Notes |",
    "|---|---|---:|---|---|",
    "QA reconciliation note: append-only updates from validated Bug Hunter runs.",
  );

  ensureAppendixFile(
    appendixPaths.runlog,
    HEADINGS.runlog,
    "| Run ID | Run Date | Validation | Bugs Added | Feature Rows Updated | New Features Added | Source Report |",
    "|---|---|---|---:|---:|---:|---|",
    "Automation entrypoint: `npm run spec:sync:bug-hunter -- --report docs/bug-hunter/reports/<RUN_ID>.json`",
  );

  const ledgerEntries = Array.isArray(report.bugLedgerEntries) ? report.bugLedgerEntries : [];
  const detectedEntries = Array.isArray(report.detectedFeatures) ? report.detectedFeatures : [];
  const qaEntries = Array.isArray(report.qaReconciliationUpdates) ? report.qaReconciliationUpdates : [];

  const ledgerRows = ledgerEntries.map(toLedgerRow);
  const detectedRows = detectedEntries.map(toDetectedRow);
  const qaRows = qaEntries.map(toQaRow);

  let ledgerAdded = 0;
  let detectedAdded = 0;
  let qaAdded = 0;
  let runAdded = 0;

  if (!opts.dryRun) {
    fs.writeFileSync(masterPath, `${masterLines.join("\n")}\n`, "utf8");

    ledgerAdded = appendRowsToTable(
      appendixPaths.ledger,
      HEADINGS.ledger,
      "| Bug ID |",
      (cells) => `${cells[0]}::${cells[1]}`,
      ledgerRows,
      opts.force,
    );

    detectedAdded = appendRowsToTable(
      appendixPaths.detected,
      HEADINGS.detected,
      "| Detected ID |",
      (cells) => cells[0],
      detectedRows,
      opts.force,
    );

    qaAdded = appendRowsToTable(
      appendixPaths.qa,
      HEADINGS.qa,
      "| QA ID |",
      (cells) => `${cells[0]}::${cells[1]}`,
      qaRows,
      opts.force,
    );

    const runRow = toRunLogRow(
      report,
      runAt,
      ledgerRows.length,
      featuresTouched,
      appendedFs.length,
      reportRef,
    );

    runAdded = appendRowsToTable(
      appendixPaths.runlog,
      HEADINGS.runlog,
      "| Run ID |",
      (cells) => cells[0],
      [runRow],
      opts.force,
    );
  }

  process.stdout.write(
    JSON.stringify(
      {
        dryRun: opts.dryRun,
        masterPath: path.relative(cwd, masterPath),
        reportPath: path.relative(cwd, reportPath),
        runAt,
        bugLedgerRowsInput: ledgerRows.length,
        detectedRowsInput: detectedRows.length,
        qaRowsInput: qaRows.length,
        featureRowsUpdated: featuresTouched,
        newFsRowsAdded: appendedFs.length,
        aliasRowsAdded,
        appended: {
          bugLedger: ledgerAdded,
          detected: detectedAdded,
          qa: qaAdded,
          runLog: runAdded,
        },
      },
      null,
      2,
    ) + "\n",
  );
}

main();
