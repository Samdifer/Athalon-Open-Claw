import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-build-system-"));
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "athelon-app", "docs", "spec"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "athelon-app", "docs", "plans"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "athelon-app", "docs", "ops", "agentic-build-system", "runs", "reviewer"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "athelon-app", "docs", "ops", "agentic-build-system", "runs", "orchestrator"), { recursive: true });
  fs.mkdirSync(path.join(root, "ops", "agentic-build-system", "config"), { recursive: true });
  fs.mkdirSync(path.join(root, "ops", "agentic-build-system", "runtime"), { recursive: true });

  return root;
}

export function writeMinimalMasterSpec(masterPath) {
  const content = [
    "# MASTER BUILD LIST",
    "",
    "## Registry A — Master Features",
    "",
    "| fs_id | feature_number | feature_name | implementation_state | verification_state | last_reviewed_at_utc | last_verified_in_app_at_utc | reviewed_by | intended_outcome | current_context_update | evidence_links | related_ids | interconnection_notes | legacy_state_snapshot |",
    "|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|",
    "| FS-0001 | 1 | Feature One | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | seed | goal | context | seed-evidence | FS-0001 | notes | Not Implemented |",
    "| FS-0002 | 2 | Feature Two | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | seed | goal | context | seed-evidence | FS-0002 | notes | Not Implemented |",
    "",
    "## Registry B — Atomic Features (3)",
    "",
    "| mbp_id | fs_links | canonical_group_id | title | normalized_requirement | source_pack | source_id | source_file | priority | wave | owner_lane | dependencies | acceptance_criteria | test_gate | legacy_status | implementation_state | verification_state | last_reviewed_at_utc | last_verified_in_app_at_utc | reviewed_by | evidence_links | related_ids | notes |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    "| MBP-1001 | FS-0001 | GRP-003 | Task A | Req A | TEST | T-001 | src/a.md | P0 | Wave1 | workflow | [] | done | npx tsc --noEmit | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | seed | ev-1 | MBP-1001 | note |",
    "| MBP-1002 | FS-0001 | GRP-003 | Task B | Req B | TEST | T-002 | src/b.md | P1 | Wave1 | workflow | [] | done | npx tsc --noEmit | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | seed | ev-2 | MBP-1002 | note |",
    "| MBP-1003 | FS-0002 | GRP-006 | Task C | Req C | TEST | T-003 | src/c.md | P1 | Wave2 | workflow | [\"GRP-003\"] | done | npx tsc --noEmit | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | seed | ev-3 | MBP-1003 | note |",
    "",
  ].join("\n");

  fs.writeFileSync(masterPath, `${content}\n`, "utf8");
}

export function writeCrosswalk(crosswalkPath, groupStatusMap = {}) {
  const rows = Object.entries(groupStatusMap).map(
    ([groupId, status]) => `| ${groupId} | ${groupId} Name | Wave1 | ${status} | 1 | SRC |`,
  );

  const content = [
    "# Crosswalk",
    "",
    "## Group Rollup",
    "",
    "| Group ID | Group Name | Target Wave | Rollup Status | Atomic Count | Merged Source IDs |",
    "|---|---|---|---|---:|---|",
    ...(rows.length ? rows : ["| GRP-003 | G3 | Wave1 | partial | 1 | SRC |"]),
    "",
  ].join("\n");

  fs.writeFileSync(crosswalkPath, `${content}\n`, "utf8");
}

export function writeOwnership(configPath) {
  const ownership = {
    version: 1,
    protected_paths: [
      "apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md",
    ],
    group_paths: {
      "GRP-003": ["apps/athelon-app/app/(app)/work-orders/**"],
      "GRP-006": ["apps/athelon-app/app/(app)/parts/**"],
      "GRP-007": ["apps/athelon-app/app/(app)/inventory/**"],
    },
    defaults: {
      fallback_paths: ["apps/athelon-app/**"],
    },
  };

  fs.writeFileSync(configPath, `${JSON.stringify(ownership, null, 2)}\n`, "utf8");
}

export function makePaths(repoRoot) {
  const appRoot = path.join(repoRoot, "apps", "athelon-app");
  const docsOpsRoot = path.join(appRoot, "docs", "ops", "agentic-build-system");
  const runtimeRoot = path.join(repoRoot, "ops", "agentic-build-system", "runtime");

  return {
    repoRoot,
    appRoot,
    masterSpecPath: path.join(appRoot, "docs", "spec", "MASTER-BUILD-LIST.md"),
    crosswalkPath: path.join(appRoot, "docs", "plans", "MASTER-FEATURE-CROSSWALK.md"),
    registryCsvPath: path.join(appRoot, "docs", "plans", "MASTER-FEATURE-REGISTRY.csv"),
    queueFilePath: path.join(docsOpsRoot, "feature-request-queue.jsonl"),
    runsRoot: path.join(docsOpsRoot, "runs"),
    reviewerRunsRoot: path.join(docsOpsRoot, "runs", "reviewer"),
    orchestratorRunsRoot: path.join(docsOpsRoot, "runs", "orchestrator"),
    runtimeRoot,
    orchestratorStatePath: path.join(runtimeRoot, "orchestrator-state.json"),
    leasesPath: path.join(runtimeRoot, "leases.json"),
    reviewerStatePath: path.join(runtimeRoot, "reviewer-state.json"),
    pathOwnershipConfigPath: path.join(repoRoot, "ops", "agentic-build-system", "config", "path-ownership.yaml"),
    cronTemplatesPath: path.join(repoRoot, "ops", "agentic-build-system", "config", "cron-templates.json"),
  };
}

export function writeCronTemplates(templatesPath) {
  const payload = {
    version: 1,
    jobs: [
      {
        name: "athelon-orchestrator-tick",
        schedule: { kind: "every", everyMs: 300000 },
      },
    ],
  };
  fs.writeFileSync(templatesPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function writeStubSpecExport(appRoot) {
  const scriptsDir = path.join(appRoot, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });

  const packageJson = {
    name: "agentic-test-fixture",
    private: true,
    version: "0.0.0",
    scripts: {
      typecheck: "node -e \"process.stdout.write('typecheck-ok\\\\n')\"",
      build: "node -e \"process.stdout.write('build-ok\\\\n')\"",
      "spec:export:derived": "node scripts/export-feature-spec-derived.mjs",
    },
  };

  fs.writeFileSync(path.join(appRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(scriptsDir, "export-feature-spec-derived.mjs"),
    "process.stdout.write('derived-export-ok\\n');\n",
    "utf8",
  );
}
