#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureAgenticFilesystem,
  getAgenticPaths,
  loadLeasesState,
  loadOrchestratorState,
  makeRunId,
  nowUtcIso,
  normalizePriority,
  parseArgs,
  priorityValue,
  readJsonl,
  saveLeasesState,
  saveOrchestratorState,
  toSlug,
  writeJsonl,
} from "./state-io.mjs";
import {
  releaseLeasesForAssignment,
  normalizeExplicitPaths,
  parsePathCsv,
} from "./leases.mjs";

const VALID_STATUSES = ["queued", "blocked", "in_progress", "completed", "failed", "cancelled"];

function sortQueue(entries) {
  return [...entries].sort((a, b) => {
    const byPriority = priorityValue(a.priority) - priorityValue(b.priority);
    if (byPriority !== 0) return byPriority;
    return String(a.created_at_utc).localeCompare(String(b.created_at_utc));
  });
}

export function loadQueue(paths) {
  return sortQueue(readJsonl(paths.queueFilePath));
}

export function saveQueue(paths, entries) {
  writeJsonl(paths.queueFilePath, sortQueue(entries));
}

function ensureQueueEntryShape(entry) {
  return {
    request_id: String(entry.request_id),
    created_at_utc: entry.created_at_utc || nowUtcIso(),
    requested_by: String(entry.requested_by || "unknown"),
    mbp_ids: Array.isArray(entry.mbp_ids) ? [...new Set(entry.mbp_ids)] : [],
    priority: normalizePriority(entry.priority),
    notes: String(entry.notes || ""),
    explicit_paths: Array.isArray(entry.explicit_paths) ? entry.explicit_paths : [],
    status: VALID_STATUSES.includes(entry.status) ? entry.status : "queued",
    blocked_reason: entry.blocked_reason || null,
    assignment_id: entry.assignment_id || null,
    owner_branch: entry.owner_branch || null,
    owner_session: entry.owner_session || null,
    history: Array.isArray(entry.history) ? entry.history : [],
    completion: entry.completion || null,
  };
}

function appendHistory(entry, event, details = {}, atUtc = nowUtcIso()) {
  entry.history = Array.isArray(entry.history) ? entry.history : [];
  entry.history.push({
    event,
    at_utc: atUtc,
    ...details,
  });
}

export function addQueueEntry(paths, payload) {
  const queue = loadQueue(paths);
  const now = nowUtcIso();
  const requestId = payload.request_id || `REQ-${makeRunId("Q").slice(2)}-${toSlug(payload.requested_by || "agent")}`;

  if (queue.some((entry) => entry.request_id === requestId)) {
    throw new Error(`Request ${requestId} already exists.`);
  }

  const mbpIds = [...new Set((payload.mbp_ids || []).map((id) => String(id).trim()).filter(Boolean))];
  if (mbpIds.length === 0) {
    throw new Error("At least one MBP ID is required.");
  }

  const entry = ensureQueueEntryShape({
    request_id: requestId,
    created_at_utc: now,
    requested_by: payload.requested_by || "unknown",
    mbp_ids: mbpIds,
    priority: payload.priority,
    notes: payload.notes || "",
    explicit_paths: normalizeExplicitPaths(payload.explicit_paths),
    status: "queued",
    blocked_reason: null,
    assignment_id: null,
    owner_branch: null,
    owner_session: null,
    history: [],
    completion: null,
  });

  appendHistory(entry, "queued", { requested_by: entry.requested_by, mbp_ids: entry.mbp_ids }, now);

  queue.push(entry);
  saveQueue(paths, queue);
  return entry;
}

export function listQueueEntries(paths, filters = {}) {
  const queue = loadQueue(paths);
  return queue.filter((entry) => {
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.requested_by && entry.requested_by !== filters.requested_by) return false;
    return true;
  });
}

export function upsertQueueEntry(paths, requestId, updater) {
  const queue = loadQueue(paths);
  const index = queue.findIndex((entry) => entry.request_id === requestId);
  if (index === -1) {
    throw new Error(`Request ${requestId} not found.`);
  }
  const current = ensureQueueEntryShape(queue[index]);
  const updated = ensureQueueEntryShape(updater(current));
  queue[index] = updated;
  saveQueue(paths, queue);
  return updated;
}

export function completeQueueEntry(paths, payload) {
  const now = nowUtcIso();
  const requestId = String(payload.request_id || "").trim();
  if (!requestId) {
    throw new Error("request_id is required.");
  }

  const queue = loadQueue(paths);
  const index = queue.findIndex((entry) => entry.request_id === requestId);
  if (index === -1) {
    throw new Error(`Request ${requestId} not found.`);
  }

  const entry = ensureQueueEntryShape(queue[index]);
  const nextStatus = payload.status || "completed";
  if (!["completed", "failed", "cancelled"].includes(nextStatus)) {
    throw new Error(`Invalid completion status: ${nextStatus}`);
  }

  entry.status = nextStatus;
  entry.blocked_reason = null;
  entry.completion = {
    completed_at_utc: now,
    completed_by: payload.completed_by || "unknown",
    validation_status: payload.validation_status || "pass",
    implementation_state: payload.implementation_state || (nextStatus === "completed" ? "implemented" : "partially_implemented"),
    verification_state: payload.verification_state || (nextStatus === "completed" ? "qa_verified" : "doc_reviewed"),
    evidence_links: payload.evidence_links || "",
    related_ids: payload.related_ids || requestId,
    notes: payload.notes || "",
    touched_paths: normalizeExplicitPaths(payload.touched_paths),
  };
  appendHistory(entry, nextStatus, { completed_by: entry.completion.completed_by }, now);

  const assignmentId = entry.assignment_id;
  entry.assignment_id = null;
  entry.owner_branch = null;
  entry.owner_session = null;

  queue[index] = entry;
  saveQueue(paths, queue);

  if (assignmentId) {
    const leasesState = loadLeasesState(paths);
    const released = releaseLeasesForAssignment(leasesState, assignmentId, `request_${nextStatus}`, now);
    saveLeasesState(paths, leasesState);

    const orchestratorState = loadOrchestratorState(paths);
    orchestratorState.active_assignments = orchestratorState.active_assignments.filter(
      (assignment) => assignment.assignment_id !== assignmentId,
    );
    saveOrchestratorState(paths, orchestratorState);

    return {
      entry,
      released_leases: released,
      assignment_removed: true,
    };
  }

  return {
    entry,
    released_leases: 0,
    assignment_removed: false,
  };
}

function parseMbpIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function usage() {
  process.stdout.write(
    [
      "Queue CLI",
      "",
      "Commands:",
      "  add --requested-by <id> --mbp-ids MBP-0001,MBP-0002 [--request-id REQ-...] [--priority P0|P1|P2|P3] [--notes text] [--paths path1,path2]",
      "  list [--status queued|blocked|in_progress|completed|failed|cancelled]",
      "  complete --request-id <REQ> [--completed-by id] [--status completed|failed|cancelled] [--implementation-state state] [--verification-state state] [--validation-status pass|fail] [--evidence-links text] [--related-ids text] [--notes text] [--touched-paths a,b]",
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
  const paths = getAgenticPaths();
  ensureAgenticFilesystem(paths);

  if (command === "add") {
    const requestedBy = args["requested-by"];
    const mbpIds = parseMbpIds(args["mbp-ids"]);
    if (!requestedBy || mbpIds.length === 0) {
      throw new Error("add requires --requested-by and --mbp-ids.");
    }

    const entry = addQueueEntry(paths, {
      request_id: args["request-id"],
      requested_by: requestedBy,
      mbp_ids: mbpIds,
      priority: args.priority,
      notes: args.notes || "",
      explicit_paths: parsePathCsv(args.paths),
    });

    printJson({
      command,
      request_id: entry.request_id,
      status: entry.status,
      mbp_ids: entry.mbp_ids,
      priority: entry.priority,
    });
    return;
  }

  if (command === "list") {
    const entries = listQueueEntries(paths, {
      status: args.status,
      requested_by: args["requested-by"],
    });
    printJson({
      command,
      count: entries.length,
      entries,
    });
    return;
  }

  if (command === "complete") {
    const requestId = args["request-id"];
    if (!requestId) {
      throw new Error("complete requires --request-id.");
    }

    const result = completeQueueEntry(paths, {
      request_id: requestId,
      completed_by: args["completed-by"],
      status: args.status,
      implementation_state: args["implementation-state"],
      verification_state: args["verification-state"],
      validation_status: args["validation-status"],
      evidence_links: args["evidence-links"],
      related_ids: args["related-ids"],
      notes: args.notes,
      touched_paths: parsePathCsv(args["touched-paths"]),
    });

    printJson({
      command,
      request_id: requestId,
      status: result.entry.status,
      released_leases: result.released_leases,
      assignment_removed: result.assignment_removed,
    });
    return;
  }

  throw new Error(`Unknown queue command: ${command}`);
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
