#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureAgenticFilesystem,
  getAgenticPaths,
  loadOrchestratorState,
  parseArgs,
  saveOrchestratorState,
  writeText,
} from "./state-io.mjs";
import { loadQueue, saveQueue } from "./queue.mjs";
import { spawnTeamSession } from "./openclaw-spawn-adapter.mjs";

function normalizeQueueEntry(entry) {
  return {
    ...entry,
    history: Array.isArray(entry.history) ? entry.history : [],
    explicit_paths: Array.isArray(entry.explicit_paths) ? entry.explicit_paths : [],
    mbp_ids: Array.isArray(entry.mbp_ids) ? entry.mbp_ids : [],
  };
}

function sortInProgress(entries) {
  return [...entries].sort((a, b) => {
    return String(a.created_at_utc || "").localeCompare(String(b.created_at_utc || ""));
  });
}

function writeActiveBoard(paths, inProgress) {
  const localRoot = path.join(paths.runtimeRoot, "local-session");
  const boardPath = path.join(localRoot, "ACTIVE-ASSIGNMENTS.md");

  const lines = [
    "# Local Session Active Assignments",
    "",
    `- Count: ${inProgress.length}`,
    "",
    "## Assignments",
    "",
  ];

  if (inProgress.length === 0) {
    lines.push("- none");
  } else {
    for (const entry of inProgress) {
      lines.push(`### ${entry.request_id}`);
      lines.push("");
      lines.push(`- MBP IDs: ${(entry.mbp_ids || []).join(", ") || "none"}`);
      lines.push(`- Branch: ${entry.owner_branch || "none"}`);
      lines.push(`- Session: ${entry.owner_session || "none"}`);
      lines.push(`- Leased Paths: ${(entry.explicit_paths || []).join(", ") || "none"}`);
      lines.push(`- Notes: ${entry.notes || "none"}`);
      lines.push(`- Next: \`git switch ${entry.owner_branch}\``);
      lines.push("");
    }
  }

  writeText(boardPath, `${lines.join("\n")}\n`);
  return boardPath;
}

function adoptActiveAssignments(paths) {
  const state = loadOrchestratorState(paths);
  const queue = loadQueue(paths).map(normalizeQueueEntry);
  const byRequestId = new Map(queue.map((entry) => [entry.request_id, entry]));

  const adopted = [];
  for (const assignment of state.active_assignments || []) {
    const request = byRequestId.get(assignment.request_id);
    if (!request || request.status !== "in_progress") continue;

    const spawn = spawnTeamSession(assignment, {
      spawn_mode: "local",
      paths,
    });
    if (!spawn.ok) {
      adopted.push({
        request_id: assignment.request_id,
        assignment_id: assignment.assignment_id,
        adopted: false,
        error: spawn.error,
      });
      continue;
    }

    assignment.owner_session = spawn.session_id;
    request.owner_session = spawn.session_id;
    request.history.push({
      event: "local_session_adopted",
      at_utc: spawn.spawned_at_utc,
      owner_session: spawn.session_id,
      manifest: spawn.raw_output,
    });

    adopted.push({
      request_id: assignment.request_id,
      assignment_id: assignment.assignment_id,
      adopted: true,
      owner_session: spawn.session_id,
      manifest: spawn.raw_output,
    });
  }

  saveOrchestratorState(paths, state);
  saveQueue(paths, queue);

  const inProgress = sortInProgress(queue.filter((entry) => entry.status === "in_progress"));
  const boardPath = writeActiveBoard(paths, inProgress);

  return {
    adopted_count: adopted.filter((item) => item.adopted).length,
    failed_count: adopted.filter((item) => !item.adopted).length,
    adopted,
    board_path: boardPath,
  };
}

function nextAssignment(paths) {
  const queue = loadQueue(paths).map(normalizeQueueEntry);
  const inProgress = sortInProgress(queue.filter((entry) => entry.status === "in_progress"));
  if (inProgress.length === 0) {
    return { found: false };
  }

  const entry = inProgress[0];
  return {
    found: true,
    request_id: entry.request_id,
    mbp_ids: entry.mbp_ids,
    owner_branch: entry.owner_branch,
    owner_session: entry.owner_session,
    explicit_paths: entry.explicit_paths,
    notes: entry.notes || "",
    start_command: `git switch ${entry.owner_branch}`,
    completion_command:
      `pnpm --dir apps/athelon-app run agentic:queue:complete -- --request-id ${entry.request_id} --completed-by local-session --status completed --implementation-state implemented --verification-state qa_verified --validation-status pass --evidence-links \"local://notes\" --related-ids ${entry.request_id}`,
  };
}

function usage() {
  process.stdout.write(
    [
      "Local Session Bypass CLI",
      "",
      "Commands:",
      "  adopt    # attach active orchestrator assignments to local session manifests",
      "  next     # print next active assignment to execute in this terminal",
    ].join("\n"),
  );
}

async function main() {
  const command = process.argv[2];
  if (!command || ["--help", "-h", "help"].includes(command)) {
    usage();
    return;
  }

  parseArgs(process.argv.slice(3)); // reserved for future flags
  const paths = getAgenticPaths();
  ensureAgenticFilesystem(paths);

  if (command === "adopt") {
    const result = adoptActiveAssignments(paths);
    process.stdout.write(`${JSON.stringify({ command, ...result }, null, 2)}\n`);
    return;
  }

  if (command === "next") {
    const result = nextAssignment(paths);
    process.stdout.write(`${JSON.stringify({ command, ...result }, null, 2)}\n`);
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
