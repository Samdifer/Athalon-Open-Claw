#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

export function nowUtcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function findRepoRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to find repo root from ${startDir}`);
    }
    current = parent;
  }
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

export function readText(filePath, fallback = "") {
  if (!fs.existsSync(filePath)) return fallback;
  return fs.readFileSync(filePath, "utf8");
}

export function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, filePath);
}

export function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at ${filePath}:${i + 1} - ${error.message}`);
    }
  });
}

export function writeJsonl(filePath, rows) {
  ensureDir(path.dirname(filePath));
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeText(filePath, body ? `${body}\n` : "");
}

export function getAgenticPaths(repoRoot = findRepoRoot()) {
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

export function defaultOrchestratorState() {
  return {
    run_mode: "PAUSED",
    max_parallel_teams: 8,
    active_assignments: [],
    last_tick_at_utc: null,
    last_start_at_utc: null,
    last_stop_at_utc: null,
  };
}

export function defaultLeasesState() {
  return {
    leases: [],
  };
}

export function loadOrchestratorState(paths) {
  const state = readJson(paths.orchestratorStatePath, defaultOrchestratorState());
  if (!state || typeof state !== "object") return defaultOrchestratorState();
  return {
    ...defaultOrchestratorState(),
    ...state,
    active_assignments: Array.isArray(state.active_assignments) ? state.active_assignments : [],
  };
}

export function saveOrchestratorState(paths, state) {
  writeJson(paths.orchestratorStatePath, state);
}

export function loadLeasesState(paths) {
  const state = readJson(paths.leasesPath, defaultLeasesState());
  if (!state || typeof state !== "object") return defaultLeasesState();
  return {
    leases: Array.isArray(state.leases) ? state.leases : [],
  };
}

export function saveLeasesState(paths, state) {
  writeJson(paths.leasesPath, state);
}

export function ensureAgenticFilesystem(paths) {
  ensureDir(paths.runtimeRoot);
  ensureDir(paths.reviewerRunsRoot);
  ensureDir(paths.orchestratorRunsRoot);
  if (!fs.existsSync(paths.queueFilePath)) {
    writeText(paths.queueFilePath, "");
  }
  if (!fs.existsSync(paths.orchestratorStatePath)) {
    writeJson(paths.orchestratorStatePath, defaultOrchestratorState());
  }
  if (!fs.existsSync(paths.leasesPath)) {
    writeJson(paths.leasesPath, defaultLeasesState());
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

export function priorityValue(priority) {
  const p = String(priority || "P2").toUpperCase();
  const map = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return map[p] ?? 2;
}

export function normalizePriority(priority) {
  const p = String(priority || "P2").toUpperCase();
  return ["P0", "P1", "P2", "P3"].includes(p) ? p : "P2";
}

export function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function makeRunId(prefix = "RUN") {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
