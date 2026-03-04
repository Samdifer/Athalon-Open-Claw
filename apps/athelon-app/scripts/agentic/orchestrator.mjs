#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureAgenticFilesystem,
  getAgenticPaths,
  loadLeasesState,
  loadOrchestratorState,
  makeRunId,
  normalizePriority,
  nowUtcIso,
  parseArgs,
  priorityValue,
  saveLeasesState,
  saveOrchestratorState,
  writeJson,
  writeText,
} from "./state-io.mjs";
import {
  acquireLease,
  activeLeaseByAssignment,
  branchFromAssignment,
  leaseConflictMessage,
  leaseStateSnapshot,
  listRepoFiles,
  loadPathOwnershipConfig,
  makeAssignmentId,
  releaseLeasesForAssignment,
  resolveOwnershipForRequest,
  resolveRepoFiles,
  summarizeLeaseConflicts,
} from "./leases.mjs";
import { loadQueue, saveQueue } from "./queue.mjs";
import {
  buildMbpIndex,
  getMbpDependencies,
  loadCrosswalkGroupStatuses,
  parseMasterSpec,
} from "./registry-parser.mjs";
import { spawnSummary, spawnTeamSession } from "./openclaw-spawn-adapter.mjs";

const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];
const READY_GROUP_STATUSES = new Set(["implemented", "complete", "completed"]);

function appendHistory(entry, event, details = {}, atUtc = nowUtcIso()) {
  entry.history = Array.isArray(entry.history) ? entry.history : [];
  entry.history.push({
    event,
    at_utc: atUtc,
    ...details,
  });
}

function normalizeQueueEntry(entry) {
  return {
    ...entry,
    priority: normalizePriority(entry.priority),
    mbp_ids: Array.isArray(entry.mbp_ids) ? entry.mbp_ids : [],
    explicit_paths: Array.isArray(entry.explicit_paths) ? entry.explicit_paths : [],
    history: Array.isArray(entry.history) ? entry.history : [],
    status: entry.status || "queued",
  };
}

function sortQueue(entries) {
  return [...entries].sort((a, b) => {
    const byPriority = priorityValue(a.priority) - priorityValue(b.priority);
    if (byPriority !== 0) return byPriority;
    return String(a.created_at_utc || "").localeCompare(String(b.created_at_utc || ""));
  });
}

function buildQueueIndex(queue) {
  return new Map(queue.map((entry) => [entry.request_id, entry]));
}

export function isDependencyGroupReady(groupId, groupStatuses) {
  const status = groupStatuses.get(groupId)?.rollup_status;
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  return READY_GROUP_STATUSES.has(normalized);
}

export function evaluateDependencyReadiness(request, mbpIndex, groupStatuses) {
  const blockers = [];
  for (const mbpId of request.mbp_ids || []) {
    const mbp = mbpIndex.get(mbpId);
    if (!mbp) {
      blockers.push(`unknown_mbp:${mbpId}`);
      continue;
    }

    for (const dependencyGroup of getMbpDependencies(mbp)) {
      if (!isDependencyGroupReady(dependencyGroup, groupStatuses)) {
        blockers.push(`dependency_not_ready:${mbpId}:${dependencyGroup}`);
      }
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

function activeAssignmentsCount(state) {
  return (state.active_assignments || []).filter((assignment) => assignment.status === "in_progress").length;
}

function assignmentSlug(request) {
  return String(request.request_id || "request")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function ensureRunDir(baseDir, runId) {
  const runDir = path.join(baseDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
}

function writeRunArtifact(runDir, payload) {
  writeJson(path.join(runDir, "run.json"), payload);
  const summary = [
    `# Orchestrator Run ${payload.run_id}`,
    "",
    `- Timestamp: ${payload.timestamp_utc}`,
    `- Run mode: ${payload.run_mode}`,
    `- Queue count: ${payload.queue_count}`,
    `- Active assignments: ${payload.active_assignments}`,
    `- Dispatch count: ${payload.dispatch_count}`,
    `- Blocked count: ${payload.blocked_count}`,
    "",
    "## Dispatches",
    "",
    ...(payload.dispatched.length
      ? payload.dispatched.map((item) => `- ${item.request_id} -> ${item.assignment_id} (${item.owner_session})`)
      : ["- none"]),
    "",
    "## Blocked",
    "",
    ...(payload.blocked.length
      ? payload.blocked.map((item) => `- ${item.request_id}: ${item.reason}`)
      : ["- none"]),
    "",
    "## Leases",
    "",
    `- Active leases: ${payload.lease_snapshot.stats.active}`,
    `- Total leases: ${payload.lease_snapshot.stats.total}`,
  ].join("\n");
  writeText(path.join(runDir, "summary.md"), `${summary}\n`);
}

function syncCompletedAssignments({ queue, state, leasesState, nowIso }) {
  const queueIndex = buildQueueIndex(queue);
  const retainedAssignments = [];
  let releasedLeases = 0;

  for (const assignment of state.active_assignments || []) {
    const request = queueIndex.get(assignment.request_id);
    if (!request) {
      releasedLeases += releaseLeasesForAssignment(leasesState, assignment.assignment_id, "missing_request", nowIso);
      continue;
    }

    if (["completed", "failed", "cancelled"].includes(request.status)) {
      releasedLeases += releaseLeasesForAssignment(leasesState, assignment.assignment_id, `request_${request.status}`, nowIso);
      continue;
    }

    const lease = activeLeaseByAssignment(leasesState, assignment.assignment_id);
    if (!lease) {
      request.status = "blocked";
      request.blocked_reason = "lease_missing_for_active_assignment";
      appendHistory(request, "blocked", { reason: request.blocked_reason }, nowIso);
      continue;
    }

    retainedAssignments.push(assignment);
  }

  state.active_assignments = retainedAssignments;
  return releasedLeases;
}

function queueCandidates(queue) {
  return sortQueue(
    queue.filter((entry) => ["queued", "blocked"].includes(entry.status)),
  );
}

function queueCounts(queue) {
  const counts = {
    queued: 0,
    blocked: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const entry of queue) {
    const key = counts[entry.status] !== undefined ? entry.status : "queued";
    counts[key] += 1;
  }
  return counts;
}

function setBlocked(entry, reason, nowIso) {
  entry.status = "blocked";
  entry.blocked_reason = reason;
  appendHistory(entry, "blocked", { reason }, nowIso);
}

function setDispatched(entry, assignment, nowIso) {
  entry.status = "in_progress";
  entry.blocked_reason = null;
  entry.assignment_id = assignment.assignment_id;
  entry.owner_branch = assignment.owner_branch;
  entry.owner_session = assignment.owner_session;
  appendHistory(
    entry,
    "dispatched",
    {
      assignment_id: assignment.assignment_id,
      owner_branch: assignment.owner_branch,
      owner_session: assignment.owner_session,
    },
    nowIso,
  );
}

export function deriveRequestMbpRows(request, mbpIndex) {
  const rows = [];
  for (const mbpId of request.mbp_ids || []) {
    const row = mbpIndex.get(mbpId);
    if (row) rows.push(row);
  }
  return rows;
}

function asCliMessage(runResult) {
  return {
    run_id: runResult.run_id,
    run_mode: runResult.run_mode,
    queue: runResult.queue_summary,
    dispatch_count: runResult.dispatch_count,
    blocked_count: runResult.blocked_count,
    dispatched: runResult.dispatched.map((item) => ({
      request_id: item.request_id,
      assignment_id: item.assignment_id,
      owner_session: item.owner_session,
      owner_branch: item.owner_branch,
    })),
    blocked: runResult.blocked,
  };
}

export function runOrchestratorTick(options = {}) {
  const nowIso = nowUtcIso();
  const paths = options.paths || getAgenticPaths(options.repoRoot);
  ensureAgenticFilesystem(paths);

  const parsedSpec = parseMasterSpec(paths.masterSpecPath);
  const mbpIndex = buildMbpIndex(parsedSpec.registryBRows);
  const groupStatuses = loadCrosswalkGroupStatuses(paths.crosswalkPath);
  const ownership = loadPathOwnershipConfig(paths.pathOwnershipConfigPath);

  const queue = loadQueue(paths).map(normalizeQueueEntry);
  const state = loadOrchestratorState(paths);
  const leasesState = loadLeasesState(paths);
  const repoFiles = options.repoFiles || resolveRepoFiles(paths.repoRoot);

  const runId = options.run_id || makeRunId("ORCH");
  const runDir = ensureRunDir(paths.orchestratorRunsRoot, runId);

  const releasedInSync = syncCompletedAssignments({ queue, state, leasesState, nowIso });

  const maxParallel = Number(options.max_parallel || state.max_parallel_teams || 8);
  state.max_parallel_teams = maxParallel;
  state.last_tick_at_utc = nowIso;

  const dispatched = [];
  const blocked = [];
  const notes = [];

  if (state.run_mode !== "ACTIVE") {
    notes.push("run_mode_paused_no_dispatch");
  } else {
    let capacity = Math.max(0, maxParallel - activeAssignmentsCount(state));
    const candidates = queueCandidates(queue);

    for (const request of candidates) {
      if (capacity <= 0) break;
      if (["in_progress", "completed", "failed", "cancelled"].includes(request.status)) continue;

      const requestRows = deriveRequestMbpRows(request, mbpIndex);
      if (requestRows.length !== (request.mbp_ids || []).length) {
        const missing = (request.mbp_ids || []).filter((id) => !mbpIndex.has(id));
        const reason = `unknown_mbp_ids:${missing.join(",")}`;
        setBlocked(request, reason, nowIso);
        blocked.push({ request_id: request.request_id, reason });
        continue;
      }

      const dependency = evaluateDependencyReadiness(request, mbpIndex, groupStatuses);
      if (!dependency.ready) {
        const reason = dependency.blockers.join(";");
        setBlocked(request, reason, nowIso);
        blocked.push({ request_id: request.request_id, reason });
        continue;
      }

      const leasePatterns = resolveOwnershipForRequest({
        mbpRows: requestRows,
        explicitPaths: request.explicit_paths,
        ownership,
      });

      const assignmentId = makeAssignmentId();
      const ownerBranch = branchFromAssignment(assignmentId, assignmentSlug(request));

      const leaseResult = acquireLease({
        leasesState,
        assignmentId,
        ownerSession: "pending-session",
        ownerBranch,
        patterns: leasePatterns,
        repoFiles,
        ttlMinutes: Number(options.lease_ttl_minutes || 120),
        nowIso,
      });

      if (!leaseResult.ok) {
        const conflicts = summarizeLeaseConflicts(leasePatterns, leasesState, repoFiles);
        const reason = leaseResult.conflict
          ? `lease_conflict:${leaseConflictMessage(leaseResult.conflict)}`
          : `lease_reject:${leaseResult.error}`;
        setBlocked(request, reason, nowIso);
        blocked.push({
          request_id: request.request_id,
          reason,
          conflicts,
        });
        continue;
      }

      const assignment = {
        assignment_id: assignmentId,
        request_id: request.request_id,
        mbp_ids: request.mbp_ids,
        owner_branch: ownerBranch,
        owner_session: null,
        lease_id: leaseResult.lease.lease_id,
        lease_paths: leasePatterns,
        notes: request.notes,
        status: "in_progress",
        dispatched_at_utc: nowIso,
      };

      const spawn = spawnTeamSession(assignment, {
        spawn_mode: options.spawn_mode,
        paths,
      });

      if (!spawn.ok) {
        releaseLeasesForAssignment(leasesState, assignment.assignment_id, "spawn_failed", nowIso);
        const reason = `spawn_failed:${spawn.error}`;
        setBlocked(request, reason, nowIso);
        blocked.push({
          request_id: request.request_id,
          reason,
          spawn_mode: spawn.mode,
        });
        continue;
      }

      assignment.owner_session = spawn.session_id;
      leaseResult.lease.owner_session = spawn.session_id;
      setDispatched(request, assignment, nowIso);
      state.active_assignments.push(assignment);
      dispatched.push({
        request_id: request.request_id,
        assignment_id: assignment.assignment_id,
        owner_session: assignment.owner_session,
        owner_branch: assignment.owner_branch,
        lease_id: assignment.lease_id,
        spawn_summary: spawnSummary(spawn),
      });
      capacity -= 1;
    }
  }

  saveQueue(paths, queue);
  saveOrchestratorState(paths, state);
  saveLeasesState(paths, leasesState);

  const runPayload = {
    run_id: runId,
    timestamp_utc: nowIso,
    run_mode: state.run_mode,
    queue_count: queue.length,
    active_assignments: activeAssignmentsCount(state),
    dispatch_count: dispatched.length,
    blocked_count: blocked.length,
    queue_summary: queueCounts(queue),
    released_leases_in_sync: releasedInSync,
    lease_snapshot: leaseStateSnapshot(leasesState),
    dispatched,
    blocked,
    notes,
  };

  writeRunArtifact(runDir, runPayload);
  return runPayload;
}

export function startRunWindow(options = {}) {
  const paths = options.paths || getAgenticPaths(options.repoRoot);
  ensureAgenticFilesystem(paths);
  const state = loadOrchestratorState(paths);
  state.run_mode = "ACTIVE";
  state.last_start_at_utc = nowUtcIso();
  if (options.max_parallel) {
    state.max_parallel_teams = Number(options.max_parallel);
  }
  saveOrchestratorState(paths, state);
  return state;
}

export function stopRunWindow(options = {}) {
  const paths = options.paths || getAgenticPaths(options.repoRoot);
  ensureAgenticFilesystem(paths);
  const state = loadOrchestratorState(paths);
  state.run_mode = "PAUSED";
  state.last_stop_at_utc = nowUtcIso();
  saveOrchestratorState(paths, state);
  return state;
}

function usage() {
  process.stdout.write(
    [
      "Orchestrator CLI",
      "",
      "Commands:",
      "  start [--max-parallel 8]",
      "  stop",
      "  tick [--spawn-mode mock|cli|local|disabled] [--max-parallel 8] [--lease-ttl-minutes 120]",
    ].join("\n"),
  );
}

async function main() {
  const command = process.argv[2];
  if (!command || ["--help", "-h", "help"].includes(command)) {
    usage();
    return;
  }

  const args = parseArgs(process.argv.slice(3));

  if (command === "start") {
    const state = startRunWindow({
      max_parallel: args["max-parallel"],
    });
    process.stdout.write(
      `${JSON.stringify({ command, run_mode: state.run_mode, max_parallel_teams: state.max_parallel_teams }, null, 2)}\n`,
    );
    return;
  }

  if (command === "stop") {
    const state = stopRunWindow();
    process.stdout.write(
      `${JSON.stringify({ command, run_mode: state.run_mode, active_assignments: state.active_assignments.length }, null, 2)}\n`,
    );
    return;
  }

  if (command === "tick") {
    const result = runOrchestratorTick({
      spawn_mode: args["spawn-mode"],
      max_parallel: args["max-parallel"],
      lease_ttl_minutes: args["lease-ttl-minutes"],
    });
    process.stdout.write(`${JSON.stringify(asCliMessage(result), null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
