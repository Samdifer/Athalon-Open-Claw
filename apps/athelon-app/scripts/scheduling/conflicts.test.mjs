import assert from "node:assert/strict";
import test from "node:test";

import { checkBayTimeConflict, detectConflicts } from "../../src/shared/lib/scheduling/conflicts.ts";

const HOUR = 60 * 60 * 1000;
const base = Date.UTC(2026, 2, 7, 8, 0, 0);

test("detectConflicts flags bay overlap + technician overlap + past-due paths", () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const nowSpy = test.mock.method(Date, "now", () => now);

  const conflicts = detectConflicts([
    {
      woId: "wo-1",
      workOrderNumber: "WO-1001",
      bayId: "bay-a",
      bayName: "Bay A",
      startDate: base,
      endDate: base + 4 * HOUR,
      assignedTechnicianIds: ["tech-1"],
      promisedDeliveryDate: base + 3 * HOUR,
    },
    {
      woId: "wo-2",
      workOrderNumber: "WO-1002",
      bayId: "bay-a",
      bayName: "Bay A",
      startDate: base + 2 * HOUR,
      endDate: base + 6 * HOUR,
      assignedTechnicianIds: ["tech-1"],
      promisedDeliveryDate: base - 2 * HOUR,
    },
  ]);

  nowSpy.mock.restore();

  const byType = Object.groupBy(conflicts, (c) => c.type);
  assert.equal(byType.bay_double_booking?.length, 1);
  assert.equal(byType.tech_over_allocation?.length, 1);
  assert.equal(byType.past_due?.length, 3);

  assert.match(byType.bay_double_booking[0].message, /Bay A/);
  assert.equal(byType.past_due.some((c) => c.severity === "error"), true);
});

test("checkBayTimeConflict returns deterministic overlap details", () => {
  const result = checkBayTimeConflict(
    "wo-proposed",
    base + 2 * HOUR,
    base + 5 * HOUR,
    [
      {
        woId: "wo-1",
        workOrderNumber: "WO-1001",
        bayId: "bay-a",
        startDate: base,
        endDate: base + 3 * HOUR,
      },
      {
        woId: "wo-2",
        workOrderNumber: "WO-1002",
        bayId: "bay-a",
        startDate: base + 4 * HOUR,
        endDate: base + 6 * HOUR,
      },
    ],
  );

  assert.deepEqual(result.conflictingWoNumbers, ["WO-1001", "WO-1002"]);
  assert.deepEqual(result.overlapDetails, [
    {
      woNumber: "WO-1001",
      overlapStart: base + 2 * HOUR,
      overlapEnd: base + 3 * HOUR,
    },
    {
      woNumber: "WO-1002",
      overlapStart: base + 4 * HOUR,
      overlapEnd: base + 5 * HOUR,
    },
  ]);
});
