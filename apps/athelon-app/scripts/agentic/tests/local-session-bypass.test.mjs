import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { ensureAgenticFilesystem, loadOrchestratorState, saveOrchestratorState } from "../state-io.mjs";
import { addQueueEntry, loadQueue, saveQueue } from "../queue.mjs";
import { spawnTeamSession } from "../openclaw-spawn-adapter.mjs";
import {
  makePaths,
  makeTempRepo,
  writeCrosswalk,
  writeMinimalMasterSpec,
  writeOwnership,
} from "./_helpers.mjs";

test("local spawn mode writes assignment manifest to runtime local-session directory", () => {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);
  writeCrosswalk(paths.crosswalkPath, {
    "GRP-003": "implemented",
  });
  writeOwnership(paths.pathOwnershipConfigPath);
  ensureAgenticFilesystem(paths);

  const assignment = {
    assignment_id: "ASG-LOCAL-1",
    request_id: "REQ-LOCAL-1",
    mbp_ids: ["MBP-1001"],
    owner_branch: "agent/asg-local-1",
    lease_paths: ["apps/athelon-app/app/(app)/work-orders/**"],
    notes: "local bypass",
  };

  const result = spawnTeamSession(assignment, {
    spawn_mode: "local",
    paths,
  });

  assert.equal(result.ok, true);
  assert.equal(result.session_id, "local-main-session");
  assert.ok(result.raw_output.endsWith("ASG-LOCAL-1.json"));
  assert.equal(fs.existsSync(result.raw_output), true);

  const parsed = JSON.parse(fs.readFileSync(result.raw_output, "utf8"));
  assert.equal(parsed.assignment.assignment_id, "ASG-LOCAL-1");
  assert.equal(parsed.mode, "local");
});

test("adopt flow prerequisites can be represented through state+queue for local session takeover", () => {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);
  writeCrosswalk(paths.crosswalkPath, {
    "GRP-003": "implemented",
  });
  writeOwnership(paths.pathOwnershipConfigPath);
  ensureAgenticFilesystem(paths);

  addQueueEntry(paths, {
    request_id: "REQ-LOCAL-ADOPT",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P1",
    explicit_paths: ["apps/athelon-app/app/(app)/work-orders/page.tsx"],
  });

  const queue = loadQueue(paths).map((entry) => {
    if (entry.request_id !== "REQ-LOCAL-ADOPT") return entry;
    return {
      ...entry,
      status: "in_progress",
      assignment_id: "ASG-LOCAL-ADOPT",
      owner_branch: "agent/asg-local-adopt",
      owner_session: "mock-old-session",
    };
  });
  saveQueue(paths, queue);

  const state = loadOrchestratorState(paths);
  state.run_mode = "ACTIVE";
  state.active_assignments = [
    {
      assignment_id: "ASG-LOCAL-ADOPT",
      request_id: "REQ-LOCAL-ADOPT",
      owner_branch: "agent/asg-local-adopt",
      owner_session: "mock-old-session",
      mbp_ids: ["MBP-1001"],
      lease_paths: ["apps/athelon-app/app/(app)/work-orders/page.tsx"],
      status: "in_progress",
    },
  ];
  saveOrchestratorState(paths, state);

  const result = spawnTeamSession(state.active_assignments[0], {
    spawn_mode: "local",
    paths,
  });
  assert.equal(result.ok, true);

  const localRoot = path.join(paths.runtimeRoot, "local-session");
  assert.equal(fs.existsSync(path.join(localRoot, "dispatch-log.jsonl")), true);
});
