#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { nowUtcIso } from "./state-io.mjs";

function safeShellJson(payload) {
  return JSON.stringify(payload).replace(/'/g, "'\\''");
}

export function buildSpawnTaskPrompt(assignment) {
  const mbpList = (assignment.mbp_ids || []).join(", ");
  const leasePatterns = (assignment.lease_paths || []).join(", ");

  return [
    `Assignment ID: ${assignment.assignment_id}`,
    `Request ID: ${assignment.request_id}`,
    `MBP IDs: ${mbpList}`,
    `Branch: ${assignment.owner_branch}`,
    `Leased paths: ${leasePatterns}`,
    "",
    "Execution rules:",
    "1. Work only on leased paths.",
    "2. Do not modify canonical spec artifacts directly.",
    "3. Record implementation evidence and validation output.",
    "4. On completion, report evidence links and touched files.",
    "",
    `Notes: ${assignment.notes || "none"}`,
  ].join("\n");
}

export function spawnTeamSession(assignment, options = {}) {
  const mode = options.spawn_mode || process.env.OPENCLAW_SPAWN_MODE || "mock";
  const now = nowUtcIso();

  if (mode === "mock") {
    return {
      ok: true,
      mode,
      spawned_at_utc: now,
      session_id: `mock-${assignment.assignment_id.toLowerCase()}`,
      raw_output: "mock spawn",
    };
  }

  if (mode === "disabled") {
    return {
      ok: false,
      mode,
      spawned_at_utc: now,
      error: "spawn mode is disabled",
      raw_output: "",
    };
  }

  if (mode === "local") {
    try {
      const runtimeRoot = resolveRuntimeRoot(options);
      const localRoot = path.join(runtimeRoot, "local-session");
      fs.mkdirSync(localRoot, { recursive: true });

      const manifestPath = path.join(localRoot, `${assignment.assignment_id}.json`);
      const manifest = {
        mode,
        spawned_at_utc: now,
        assignment,
        task: buildSpawnTaskPrompt(assignment),
        next_steps: [
          `git switch ${assignment.owner_branch}`,
          "Implement against leased paths only.",
          "Run relevant tests and collect evidence links.",
          `Mark completion with: pnpm --dir apps/athelon-app run agentic:queue:complete -- --request-id ${assignment.request_id} --completed-by local-session --status completed --implementation-state implemented --verification-state qa_verified --validation-status pass --evidence-links \"local://<notes>\" --related-ids ${assignment.request_id}`,
        ],
      };
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      const logPath = path.join(localRoot, "dispatch-log.jsonl");
      fs.appendFileSync(
        logPath,
        `${JSON.stringify({
          assignment_id: assignment.assignment_id,
          request_id: assignment.request_id,
          owner_branch: assignment.owner_branch,
          manifest_path: manifestPath,
          spawned_at_utc: now,
          mode,
        })}\n`,
        "utf8",
      );

      return {
        ok: true,
        mode,
        spawned_at_utc: now,
        session_id: "local-main-session",
        raw_output: manifestPath,
      };
    } catch (error) {
      return {
        ok: false,
        mode,
        spawned_at_utc: now,
        error: error.message,
        raw_output: "",
      };
    }
  }

  const payload = {
    label: assignment.assignment_id,
    task: buildSpawnTaskPrompt(assignment),
    metadata: {
      request_id: assignment.request_id,
      mbp_ids: assignment.mbp_ids,
      owner_branch: assignment.owner_branch,
      lease_paths: assignment.lease_paths,
    },
  };

  if (mode === "cli") {
    const command = process.env.OPENCLAW_SPAWN_CMD || "openclaw sessions spawn";
    const shellPayload = safeShellJson(payload);
    const fullCommand = `${command} --json '${shellPayload}'`;

    try {
      const out = execSync(fullCommand, {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      }).trim();

      const parsed = tryParseJson(out);
      const sessionId = parsed?.session_id || parsed?.id || parsed?.session || extractSessionIdFromText(out);

      if (!sessionId) {
        return {
          ok: false,
          mode,
          spawned_at_utc: now,
          error: "Spawn command returned no session ID",
          raw_output: out,
        };
      }

      return {
        ok: true,
        mode,
        spawned_at_utc: now,
        session_id: String(sessionId),
        raw_output: out,
      };
    } catch (error) {
      return {
        ok: false,
        mode,
        spawned_at_utc: now,
        error: error.message,
        raw_output: error.stdout || error.stderr || "",
      };
    }
  }

  return {
    ok: false,
    mode,
    spawned_at_utc: now,
    error: `Unknown spawn mode: ${mode}`,
    raw_output: "",
  };
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractSessionIdFromText(text) {
  const match = String(text || "").match(/session[_\s-]?id["'=:\s]+([A-Za-z0-9._:-]+)/i);
  return match ? match[1] : null;
}

function resolveRuntimeRoot(options = {}) {
  if (options.paths?.runtimeRoot) return options.paths.runtimeRoot;
  if (options.repo_root) {
    return path.join(options.repo_root, "ops", "agentic-build-system", "runtime");
  }
  if (process.env.AGENTIC_RUNTIME_ROOT) return process.env.AGENTIC_RUNTIME_ROOT;
  throw new Error("Unable to resolve runtime root for local spawn mode.");
}

export function spawnSummary(result) {
  if (result.ok) {
    return `spawned ${result.session_id} (${result.mode})`;
  }
  return `spawn_failed (${result.mode}): ${result.error}`;
}
