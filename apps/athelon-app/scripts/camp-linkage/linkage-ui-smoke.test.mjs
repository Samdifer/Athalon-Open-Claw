import assert from "node:assert/strict";
import test from "node:test";

import {
  beginUnlinkRelinkFlow,
  confirmUnlinkRelinkFlow,
  deriveFleetStatusBadge,
  getConflictStateForUi,
} from "./linkage-harness.mjs";

test("fleet views render expected linkage status badges", () => {
  const now = new Date("2026-03-06T20:00:00.000Z");

  const linkedHealthy = deriveFleetStatusBadge(
    { active: true },
    { lastSyncAt: "2026-03-06T18:30:00.000Z", now },
  );
  assert.deepEqual(linkedHealthy, { tone: "success", label: "Linked" });

  const linkedStale = deriveFleetStatusBadge(
    { active: true },
    { lastSyncAt: "2026-03-03T01:00:00.000Z", now },
  );
  assert.deepEqual(linkedStale, { tone: "danger", label: "Sync stale" });

  const unlinked = deriveFleetStatusBadge(
    { active: false },
    { lastSyncAt: "2026-03-06T18:30:00.000Z", now },
  );
  assert.deepEqual(unlinked, { tone: "muted", label: "Unlinked" });
});

test("conflict state is visible and blocking", () => {
  const conflict = getConflictStateForUi({
    pendingLinkAircraftId: "acft-1",
    activeLinksByAircraftId: {
      "acft-1": { campAircraftId: "CAMP-777" },
    },
  });

  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.blocking, true);
  assert.match(conflict.message, /CAMP-777/);

  const noConflict = getConflictStateForUi({
    pendingLinkAircraftId: "acft-2",
    activeLinksByAircraftId: {
      "acft-1": { campAircraftId: "CAMP-777" },
    },
  });

  assert.deepEqual(noConflict, { hasConflict: false, blocking: false });
});

test("unlink/relink flow requires confirmation before relink action", () => {
  const started = beginUnlinkRelinkFlow({ requireConfirmation: true });
  assert.equal(started.step, "confirm-unlink");
  assert.equal(started.blocked, true);

  const confirmed = confirmUnlinkRelinkFlow(started);
  assert.equal(confirmed.step, "ready-relink");
  assert.equal(confirmed.blocked, false);
});
