import assert from "node:assert/strict";
import test from "node:test";

import {
  createHarnessState,
  linkCampRecord,
  unlinkCampRecord,
  computeSyncHealth,
} from "./linkage-harness.mjs";

test("enforces unique mapping per org and prevents duplicate CAMP IDs", () => {
  const state = createHarnessState();

  linkCampRecord(state, {
    orgId: "org-a",
    campAircraftId: "CAMP-101",
    aircraftId: "acft-1",
    linkedBy: "qa",
  });

  assert.throws(
    () =>
      linkCampRecord(state, {
        orgId: "org-a",
        campAircraftId: "CAMP-101",
        aircraftId: "acft-2",
        linkedBy: "qa",
      }),
    /Duplicate CAMP aircraft ID/,
  );

  assert.throws(
    () =>
      linkCampRecord(state, {
        orgId: "org-a",
        campAircraftId: "CAMP-102",
        aircraftId: "acft-1",
        linkedBy: "qa",
      }),
    /already mapped/,
  );

  // Same CAMP ID in different org is allowed.
  linkCampRecord(state, {
    orgId: "org-b",
    campAircraftId: "CAMP-101",
    aircraftId: "acft-9",
    linkedBy: "qa",
  });

  assert.equal(state.links.filter((l) => l.active).length, 2);
});

test("ambiguous tail/serial matching requires explicit confirmation", () => {
  const state = createHarnessState();
  const aircraftCatalog = [
    { aircraftId: "acft-1", tailNumber: "N123AB", serialNumber: "SN-1" },
    { aircraftId: "acft-2", tailNumber: "N123AB", serialNumber: "SN-2" },
  ];

  assert.throws(
    () =>
      linkCampRecord(state, {
        orgId: "org-a",
        campAircraftId: "CAMP-200",
        aircraftId: "acft-1",
        tailNumber: "N123AB",
        linkedBy: "qa",
        aircraftCatalog,
      }),
    /requires explicit confirmation/,
  );

  const link = linkCampRecord(state, {
    orgId: "org-a",
    campAircraftId: "CAMP-200",
    aircraftId: "acft-1",
    tailNumber: "N123AB",
    linkedBy: "qa",
    aircraftCatalog,
    explicitAmbiguousConfirm: true,
  });

  assert.equal(link.active, true);
});

test("unlink + relink writes complete audit trail", () => {
  const state = createHarnessState();

  linkCampRecord(state, {
    orgId: "org-a",
    campAircraftId: "CAMP-301",
    aircraftId: "acft-7",
    linkedBy: "qa",
  });
  unlinkCampRecord(state, {
    orgId: "org-a",
    campAircraftId: "CAMP-301",
    unlinkedBy: "qa",
  });
  linkCampRecord(state, {
    orgId: "org-a",
    campAircraftId: "CAMP-301",
    aircraftId: "acft-7",
    linkedBy: "qa",
  });

  const actions = state.auditTrail.map((e) => e.action);
  assert.deepEqual(actions, ["link", "unlink", "relink"]);
});

test("stale sync health transitions healthy -> warning -> critical", () => {
  const now = new Date("2026-03-06T20:00:00.000Z");

  assert.equal(
    computeSyncHealth({ lastSyncAt: "2026-03-06T12:00:00.000Z", now }),
    "healthy",
  );
  assert.equal(
    computeSyncHealth({ lastSyncAt: "2026-03-05T12:00:00.000Z", now }),
    "warning",
  );
  assert.equal(
    computeSyncHealth({ lastSyncAt: "2026-03-03T12:00:00.000Z", now }),
    "critical",
  );
});
