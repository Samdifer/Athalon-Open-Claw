import assert from "node:assert/strict";
import test from "node:test";

import {
  createHarnessState,
  linkCampRecord,
  unlinkCampRecord,
  snapshotTraceability,
} from "./linkage-harness.mjs";

test("linkage changes do not mutate historical maintenance evidence references", () => {
  const state = createHarnessState();
  const refs = ["wo-1:step-2:photo-8", "wo-3:task-1:doc-4"];

  const initial = linkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-901",
    aircraftId: "acft-901",
    linkedBy: "qa",
    historicalMaintenanceEvidenceRefs: refs,
  });

  const before = snapshotTraceability(initial);

  unlinkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-901",
    unlinkedBy: "qa",
  });

  const relinked = linkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-901",
    aircraftId: "acft-901",
    linkedBy: "qa",
    provenanceMetadata: { relinkReason: "corrected tail normalization" },
  });

  const after = snapshotTraceability(relinked);

  assert.deepEqual(after.evidenceRefs, before.evidenceRefs);
  assert.equal(after.evidenceRefs[0], "wo-1:step-2:photo-8");
});

test("provenance metadata is preserved and appended after relink", () => {
  const state = createHarnessState();

  linkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-950",
    aircraftId: "acft-950",
    linkedBy: "qa",
    provenanceMetadata: { ingestedBatchId: "batch-1", sourceRevision: "r1" },
  });

  unlinkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-950",
    unlinkedBy: "qa",
  });

  const relink = linkCampRecord(state, {
    orgId: "org-far",
    campAircraftId: "CAMP-950",
    aircraftId: "acft-950",
    linkedBy: "qa",
    provenanceMetadata: { sourceRevision: "r2", relinkTicket: "INC-44" },
  });

  assert.equal(relink.provenanceMetadata.ingestedBatchId, "batch-1");
  assert.equal(relink.provenanceMetadata.sourceRevision, "r2");
  assert.equal(relink.provenanceMetadata.relinkTicket, "INC-44");
  assert.equal(relink.provenanceMetadata.relinkCount, 1);
});
