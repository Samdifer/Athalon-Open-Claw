import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { ensureAgenticFilesystem, loadLeasesState } from "../state-io.mjs";
import { addQueueEntry, completeQueueEntry, loadQueue } from "../queue.mjs";
import { runOrchestratorTick, startRunWindow } from "../orchestrator.mjs";
import { applyProposal, buildProposal } from "../reviewer.mjs";
import { parseMasterSpec } from "../registry-parser.mjs";
import {
  makePaths,
  makeTempRepo,
  writeCrosswalk,
  writeMinimalMasterSpec,
  writeOwnership,
  writeStubSpecExport,
} from "./_helpers.mjs";

test("end-to-end queue waves dispatch safely and reviewer proposal/apply flow works", () => {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);
  writeCrosswalk(paths.crosswalkPath, {
    "GRP-003": "implemented",
    "GRP-006": "implemented",
  });
  writeOwnership(paths.pathOwnershipConfigPath);
  writeStubSpecExport(paths.appRoot);
  ensureAgenticFilesystem(paths);

  const repoFiles = [
    "apps/athelon-app/app/(app)/work-orders/page.tsx",
    "apps/athelon-app/app/(app)/parts/page.tsx",
  ];

  startRunWindow({ paths, max_parallel: 8 });

  const requests = [
    ["REQ-E2E-01", ["MBP-1001"]],
    ["REQ-E2E-02", ["MBP-1002"]],
    ["REQ-E2E-03", ["MBP-1003"]],
    ["REQ-E2E-04", ["MBP-1001"]],
    ["REQ-E2E-05", ["MBP-1002"]],
    ["REQ-E2E-06", ["MBP-1003"]],
    ["REQ-E2E-07", ["MBP-1001"]],
    ["REQ-E2E-08", ["MBP-1002"]],
    ["REQ-E2E-09", ["MBP-1003"]],
    ["REQ-E2E-10", ["MBP-1001"]],
  ];
  for (const [requestId, mbpIds] of requests) {
    addQueueEntry(paths, {
      request_id: requestId,
      requested_by: "qa",
      mbp_ids: mbpIds,
      priority: "P1",
    });
  }

  const wave1 = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-E2E-W1",
    spawn_mode: "mock",
    max_parallel: 8,
  });
  assert.equal(wave1.dispatch_count, 2);
  assert.ok(wave1.blocked_count >= 1);

  const queueAfterWave1 = loadQueue(paths);
  const inProgress = queueAfterWave1.filter((entry) => entry.status === "in_progress");
  assert.equal(inProgress.length, 2);

  completeQueueEntry(paths, {
    request_id: inProgress[0].request_id,
    completed_by: "qa",
    status: "completed",
    validation_status: "pass",
    implementation_state: "implemented",
    verification_state: "qa_verified",
    evidence_links: `run://${inProgress[0].request_id}`,
    related_ids: inProgress[0].request_id,
  });

  const wave2 = runOrchestratorTick({
    paths,
    repoFiles,
    run_id: "ORCH-E2E-W2",
    spawn_mode: "mock",
    max_parallel: 8,
  });
  assert.ok(wave2.dispatch_count >= 1);

  const leasesAfterWave2 = loadLeasesState(paths);
  const activeAssignments = new Set(
    leasesAfterWave2.leases
      .filter((lease) => lease.status === "active")
      .map((lease) => lease.assignment_id),
  );
  assert.equal(activeAssignments.size, 2);

  const queueBeforeReview = loadQueue(paths);
  const anotherInProgress = queueBeforeReview.find((entry) => entry.status === "in_progress");
  completeQueueEntry(paths, {
    request_id: anotherInProgress.request_id,
    completed_by: "qa",
    status: "completed",
    validation_status: "pass",
    implementation_state: "implemented",
    verification_state: "qa_verified",
    evidence_links: `run://${anotherInProgress.request_id}`,
    related_ids: anotherInProgress.request_id,
  });

  const quick = buildProposal({
    mode: "quick",
    paths,
    run_id: "RVWQ-E2E",
  });
  const deep = buildProposal({
    mode: "deep",
    paths,
    run_id: "RVWD-E2E",
  });
  assert.ok(quick.candidate_updates_mbp.length >= 1);
  assert.ok(deep.candidate_updates_mbp.length >= 1);

  const apply = applyProposal({
    paths,
    proposal_path: path.join(paths.reviewerRunsRoot, "RVWD-E2E", "proposal.json"),
    approve_token: "YES-APPLY",
  });
  assert.equal(apply.export_result.status, "pass");

  const parsed = parseMasterSpec(paths.masterSpecPath);
  const mbp1001 = parsed.registryBRows.find((row) => row.mbp_id === "MBP-1001");
  assert.equal(mbp1001.implementation_state, "implemented");
  assert.equal(mbp1001.verification_state, "qa_verified");
});
