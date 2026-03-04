import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureAgenticFilesystem,
  loadLeasesState,
  loadOrchestratorState,
  saveLeasesState,
  saveOrchestratorState,
} from "../state-io.mjs";
import {
  addQueueEntry,
  loadQueue,
  saveQueue,
} from "../queue.mjs";
import {
  runOrchestratorTick,
  startRunWindow,
  stopRunWindow,
} from "../orchestrator.mjs";
import {
  makePaths,
  makeTempRepo,
  writeCrosswalk,
  writeMinimalMasterSpec,
  writeOwnership,
} from "./_helpers.mjs";

function setupFixture(groupStatuses) {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);
  writeCrosswalk(paths.crosswalkPath, groupStatuses);
  writeOwnership(paths.pathOwnershipConfigPath);
  ensureAgenticFilesystem(paths);

  const repoFiles = [
    "apps/athelon-app/app/(app)/work-orders/page.tsx",
    "apps/athelon-app/app/(app)/parts/page.tsx",
  ];

  return { repoRoot, paths, repoFiles };
}

test("run window gating: paused prevents dispatch, active dispatches, stopped halts new dispatch", () => {
  const { paths, repoFiles } = setupFixture({
    "GRP-003": "implemented",
    "GRP-006": "implemented",
  });

  addQueueEntry(paths, {
    request_id: "REQ-PAUSE-1",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P1",
  });

  const pausedTick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-PAUSED",
    spawn_mode: "mock",
  });
  assert.equal(pausedTick.run_mode, "PAUSED");
  assert.equal(pausedTick.dispatch_count, 0);

  startRunWindow({ paths, max_parallel: 8 });
  const activeTick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-ACTIVE",
    spawn_mode: "mock",
  });
  assert.equal(activeTick.run_mode, "ACTIVE");
  assert.equal(activeTick.dispatch_count, 1);

  stopRunWindow({ paths });
  addQueueEntry(paths, {
    request_id: "REQ-PAUSE-2",
    requested_by: "qa",
    mbp_ids: ["MBP-1002"],
    priority: "P1",
  });

  const stoppedTick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-STOPPED",
    spawn_mode: "mock",
  });
  assert.equal(stoppedTick.run_mode, "PAUSED");
  assert.equal(stoppedTick.dispatch_count, 0);

  const queue = loadQueue(paths);
  const second = queue.find((entry) => entry.request_id === "REQ-PAUSE-2");
  assert.equal(second.status, "queued");
});

test("overlapping requests are blocked by lease conflicts", () => {
  const { paths, repoFiles } = setupFixture({
    "GRP-003": "implemented",
    "GRP-006": "implemented",
  });

  startRunWindow({ paths, max_parallel: 8 });
  addQueueEntry(paths, {
    request_id: "REQ-OVERLAP-1",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P0",
  });
  addQueueEntry(paths, {
    request_id: "REQ-OVERLAP-2",
    requested_by: "qa",
    mbp_ids: ["MBP-1002"],
    priority: "P1",
  });

  const tick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-OVERLAP",
    spawn_mode: "mock",
  });

  assert.equal(tick.dispatch_count, 1);
  assert.equal(tick.blocked_count, 1);
  assert.equal(tick.blocked[0].request_id, "REQ-OVERLAP-2");
  assert.match(tick.blocked[0].reason, /lease_conflict/);
});

test("max parallel cap blocks additional dispatch when 8 sessions are active", () => {
  const { paths, repoFiles } = setupFixture({
    "GRP-003": "implemented",
    "GRP-006": "implemented",
  });

  addQueueEntry(paths, {
    request_id: "REQ-CAP-1",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P0",
  });
  for (let i = 0; i < 8; i += 1) {
    addQueueEntry(paths, {
      request_id: `REQ-PRE-${i + 1}`,
      requested_by: "qa",
      mbp_ids: ["MBP-1001"],
      priority: "P3",
    });
  }

  const seededQueue = loadQueue(paths).map((entry) => {
    if (!entry.request_id.startsWith("REQ-PRE-")) return entry;
    const index = Number(entry.request_id.replace("REQ-PRE-", ""));
    return {
      ...entry,
      status: "in_progress",
      assignment_id: `ASG-PRE-${index}`,
      owner_branch: `agent/asg-pre-${index}`,
      owner_session: `mock-pre-${index}`,
      blocked_reason: null,
    };
  });
  saveQueue(paths, seededQueue);

  const leasesState = loadLeasesState(paths);
  for (let i = 0; i < 8; i += 1) {
    leasesState.leases.push({
      lease_id: `LEASE-PRE-${i + 1}`,
      assignment_id: `ASG-PRE-${i + 1}`,
      paths: ["apps/athelon-app/app/(app)/work-orders/**"],
      owner_session: `mock-pre-${i + 1}`,
      owner_branch: `agent/asg-pre-${i + 1}`,
      acquired_at_utc: "2026-03-03T00:00:00Z",
      expires_at_utc: "2026-03-04T00:00:00Z",
      status: "active",
    });
  }
  saveLeasesState(paths, leasesState);

  const state = loadOrchestratorState(paths);
  state.run_mode = "ACTIVE";
  state.max_parallel_teams = 8;
  state.active_assignments = Array.from({ length: 8 }).map((_, i) => ({
    assignment_id: `ASG-PRE-${i + 1}`,
    request_id: `REQ-PRE-${i + 1}`,
    status: "in_progress",
  }));
  saveOrchestratorState(paths, state);

  const tick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-CAP",
    spawn_mode: "mock",
    max_parallel: 8,
  });

  assert.equal(tick.dispatch_count, 0);
  const queue = loadQueue(paths);
  assert.equal(queue.find((entry) => entry.request_id === "REQ-CAP-1").status, "queued");
});

test("dependency blocking is strict when required group rollup is not implemented", () => {
  const { paths, repoFiles } = setupFixture({
    "GRP-003": "partial",
    "GRP-006": "missing",
  });

  startRunWindow({ paths, max_parallel: 8 });
  addQueueEntry(paths, {
    request_id: "REQ-DEP-1",
    requested_by: "qa",
    mbp_ids: ["MBP-1003"],
    priority: "P0",
  });

  const tick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-DEP",
    spawn_mode: "mock",
  });

  assert.equal(tick.dispatch_count, 0);
  assert.equal(tick.blocked_count, 1);
  assert.match(tick.blocked[0].reason, /dependency_not_ready:MBP-1003:GRP-003/);
});

test("spawn failure rolls back lease and leaves no active assignment", () => {
  const { paths, repoFiles } = setupFixture({
    "GRP-003": "implemented",
    "GRP-006": "implemented",
  });

  startRunWindow({ paths, max_parallel: 8 });
  addQueueEntry(paths, {
    request_id: "REQ-SPAWN-FAIL",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P0",
  });

  const tick = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-SPAWN-FAIL",
    spawn_mode: "disabled",
  });

  assert.equal(tick.dispatch_count, 0);
  assert.equal(tick.blocked_count, 1);
  assert.match(tick.blocked[0].reason, /spawn_failed/);

  const leasesState = loadLeasesState(paths);
  const activeLeases = leasesState.leases.filter((lease) => lease.status === "active");
  assert.equal(activeLeases.length, 0);
  assert.equal(leasesState.leases.some((lease) => lease.release_reason === "spawn_failed"), true);

  const state = loadOrchestratorState(paths);
  assert.equal(state.active_assignments.length, 0);
});
