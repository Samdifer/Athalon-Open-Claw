import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  applyRowUpdates,
  getMbpDependencies,
  loadCrosswalkGroupStatuses,
  parseFsLinks,
  parseMasterSpec,
  writeMasterSpec,
} from "../registry-parser.mjs";
import {
  makePaths,
  makeTempRepo,
  writeCrosswalk,
  writeMinimalMasterSpec,
} from "./_helpers.mjs";

test("registry parser loads Registry A and B tables and dependencies", () => {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);
  writeCrosswalk(paths.crosswalkPath, {
    "GRP-003": "implemented",
    "GRP-006": "partial",
  });

  const parsed = parseMasterSpec(paths.masterSpecPath);
  assert.equal(parsed.registryARows.length, 2);
  assert.equal(parsed.registryBRows.length, 3);

  const mbp1001 = parsed.registryBRows.find((row) => row.mbp_id === "MBP-1001");
  const mbp1003 = parsed.registryBRows.find((row) => row.mbp_id === "MBP-1003");
  assert.deepEqual(parseFsLinks(mbp1001.fs_links), ["FS-0001"]);
  assert.deepEqual(getMbpDependencies(mbp1003), ["GRP-003"]);

  const groups = loadCrosswalkGroupStatuses(paths.crosswalkPath);
  assert.equal(groups.get("GRP-003").rollup_status, "implemented");
  assert.equal(groups.get("GRP-006").rollup_status, "partial");
});

test("applyRowUpdates mutates MBP and FS rows in markdown table", () => {
  const repoRoot = makeTempRepo();
  const paths = makePaths(repoRoot);
  writeMinimalMasterSpec(paths.masterSpecPath);

  const parsed = parseMasterSpec(paths.masterSpecPath);

  const mbpUpdates = new Map([
    [
      "MBP-1001",
      {
        implementation_state: "implemented",
        verification_state: "qa_verified",
        reviewed_by: "test-agent",
      },
    ],
  ]);
  const fsUpdates = new Map([
    [
      "FS-0001",
      {
        implementation_state: "partially_implemented",
        reviewed_by: "test-agent",
      },
    ],
  ]);

  const touchedMbp = applyRowUpdates(parsed.lines, parsed.registryBTable, "mbp_id", mbpUpdates);
  const touchedFs = applyRowUpdates(parsed.lines, parsed.registryATable, "fs_id", fsUpdates);
  assert.equal(touchedMbp, 1);
  assert.equal(touchedFs, 1);

  writeMasterSpec(paths.masterSpecPath, parsed.lines);
  const reparsed = parseMasterSpec(paths.masterSpecPath);

  const mbp1001 = reparsed.registryBRows.find((row) => row.mbp_id === "MBP-1001");
  const fs0001 = reparsed.registryARows.find((row) => row.fs_id === "FS-0001");

  assert.equal(mbp1001.implementation_state, "implemented");
  assert.equal(mbp1001.verification_state, "qa_verified");
  assert.equal(mbp1001.reviewed_by, "test-agent");

  assert.equal(fs0001.implementation_state, "partially_implemented");
  assert.equal(fs0001.reviewed_by, "test-agent");

  assert.ok(fs.existsSync(path.join(repoRoot, "apps", "athelon-app", "docs", "spec", "MASTER-BUILD-LIST.md")));
});
