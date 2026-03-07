import assert from "node:assert/strict";
import test from "node:test";

import {
  daysBetween,
  formatAircraftLabel,
  getAircraftTypeTokens,
  toUtcDayStart,
} from "../../convex/lib/dueListPlanningHelpers.ts";

test("toUtcDayStart normalizes timestamp to UTC midnight", () => {
  const ts = Date.UTC(2026, 2, 7, 23, 45, 11);
  assert.equal(toUtcDayStart(ts), Date.UTC(2026, 2, 7, 0, 0, 0));
});

test("daysBetween computes ceil day difference based on UTC day boundaries", () => {
  const start = Date.UTC(2026, 2, 7, 23, 59, 0);
  const end = Date.UTC(2026, 2, 8, 0, 1, 0);

  assert.equal(daysBetween(start, end), 1);
  assert.equal(daysBetween(end, start), -1);
});

test("formatAircraftLabel prefers registration fallback", () => {
  assert.equal(
    formatAircraftLabel({
      currentRegistration: "N123AB",
      make: "Cessna",
      model: "Citation",
      serialNumber: "SN-001",
    }),
    "N123AB",
  );

  assert.equal(
    formatAircraftLabel({
      currentRegistration: undefined,
      make: "Gulfstream",
      model: "G550",
      serialNumber: "G550-42",
    }),
    "Gulfstream G550 (G550-42)",
  );
});

test("getAircraftTypeTokens deduplicates and trims generated token set", () => {
  const tokens = getAircraftTypeTokens({
    make: "Dassault",
    model: "Falcon 2000",
    series: "LX",
  });

  assert.deepEqual(tokens, ["Dassault Falcon 2000", "Dassault Falcon 2000 LX", "Falcon 2000"]);
});
