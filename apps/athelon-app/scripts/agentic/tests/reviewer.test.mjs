import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { ensureAgenticFilesystem } from "../state-io.mjs";
import { addQueueEntry, completeQueueEntry } from "../queue.mjs";
import { parseMasterSpec } from "../registry-parser.mjs";
import { applyProposal, buildProposal } from "../reviewer.mjs";
import {
  makePaths,
  makeTempRepo,
  readFile,
  writeCrosswalk,
  writeMinimalMasterSpec,
  writeOwnership,
  writeStubSpecExport,
} from "./_helpers.mjs";

function setupReviewerFixture() {
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
  return { repoRoot, paths };
}

test("proposal mode is read-only and generates proposal artifacts", () => {
  const { paths } = setupReviewerFixture();
  const before = readFile(paths.masterSpecPath);

  addQueueEntry(paths, {
    request_id: "REQ-RVW-1",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P0",
  });
  completeQueueEntry(paths, {
    request_id: "REQ-RVW-1",
    completed_by: "qa",
    status: "completed",
    validation_status: "pass",
    implementation_state: "implemented",
    verification_state: "qa_verified",
    evidence_links: "run://req-rvw-1",
    related_ids: "REQ-RVW-1",
  });

  const proposal = buildProposal({
    mode: "quick",
    paths,
    run_id: "RVWQ-TEST",
  });

  assert.equal(proposal.mode, "quick");
  assert.equal(proposal.candidate_updates_mbp.length, 1);
  assert.equal(proposal.candidate_updates_fs.length, 1);
  assert.match(proposal.apply_command, /agentic:reviewer:apply/);

  const after = readFile(paths.masterSpecPath);
  assert.equal(after, before);

  const proposalPath = path.join(paths.reviewerRunsRoot, "RVWQ-TEST", "proposal.json");
  const summaryPath = path.join(paths.reviewerRunsRoot, "RVWQ-TEST", "summary.md");
  assert.equal(fs.existsSync(proposalPath), true);
  assert.equal(fs.existsSync(summaryPath), true);
});

test("apply requires explicit approval token", () => {
  const { paths } = setupReviewerFixture();
  const fakeProposalPath = path.join(paths.reviewerRunsRoot, "RVWQ-EMPTY", "proposal.json");
  fs.mkdirSync(path.dirname(fakeProposalPath), { recursive: true });
  fs.writeFileSync(
    fakeProposalPath,
    JSON.stringify(
      {
        run_id: "RVWQ-EMPTY",
        candidate_updates_mbp: [],
        candidate_updates_fs: [],
      },
      null,
      2,
    ),
    "utf8",
  );

  assert.throws(
    () => applyProposal({ paths, proposal_path: fakeProposalPath, approve_token: "NOPE" }),
    /Invalid or missing approve token/,
  );
});

test("apply updates MBP + FS rows and runs derived export command", () => {
  const { paths } = setupReviewerFixture();

  addQueueEntry(paths, {
    request_id: "REQ-RVW-2",
    requested_by: "qa",
    mbp_ids: ["MBP-1001"],
    priority: "P0",
  });
  completeQueueEntry(paths, {
    request_id: "REQ-RVW-2",
    completed_by: "qa",
    status: "completed",
    validation_status: "pass",
    implementation_state: "implemented",
    verification_state: "qa_verified",
    evidence_links: "run://req-rvw-2",
    related_ids: "REQ-RVW-2",
  });

  const proposal = buildProposal({
    mode: "quick",
    paths,
    run_id: "RVWQ-APPLY-TEST",
  });
  const proposalPath = path.join(paths.reviewerRunsRoot, "RVWQ-APPLY-TEST", "proposal.json");

  const result = applyProposal({
    paths,
    proposal_path: proposalPath,
    approve_token: "YES-APPLY",
  });

  assert.equal(result.mbp_rows_updated, 1);
  assert.equal(result.fs_rows_updated, 1);
  assert.equal(result.export_result.status, "pass");

  const parsed = parseMasterSpec(paths.masterSpecPath);
  const mbp1001 = parsed.registryBRows.find((row) => row.mbp_id === "MBP-1001");
  const fs0001 = parsed.registryARows.find((row) => row.fs_id === "FS-0001");
  assert.equal(mbp1001.implementation_state, "implemented");
  assert.equal(mbp1001.reviewed_by, "agentic-reviewer");
  assert.equal(fs0001.implementation_state, "partially_implemented");
  assert.equal(fs0001.reviewed_by, "agentic-reviewer");

  const applyResultPath = path.join(paths.reviewerRunsRoot, proposal.run_id, "apply-result.json");
  assert.equal(fs.existsSync(applyResultPath), true);
});
