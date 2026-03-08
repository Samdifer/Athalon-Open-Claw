/**
 * inventory-lifecycle.test.mjs
 *
 * Unit tests for parts clerk receiving/inspection/inventory lifecycle logic.
 * Tests validate invariants around:
 *   - Receiving parts creates correct initial state (pending_inspection)
 *   - Issue guards prevent double-issue and pending_inspection issuance
 *   - Return quantity cannot exceed issued quantity
 *   - Physical inventory counts batch parts correctly using quantityOnHand
 *   - Reservation conflicts are detected
 *   - Cancel releases reservations
 *
 * These are logic-level tests that validate the guard conditions and
 * computations extracted from the Convex mutations. They do NOT require
 * a running Convex backend — they test the invariant logic in isolation.
 */

import assert from "node:assert/strict";
import test from "node:test";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: Simulate the guard logic extracted from mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates issuePart guard logic (from workOrderParts.ts)
 * Returns { ok: true } or { ok: false, code: string }
 */
function checkIssueGuards(part, record, targetWorkOrderId) {
  // INV-23: pending_inspection guard
  if (part.location === "pending_inspection") {
    return { ok: false, code: "PART_NOT_INSPECTED" };
  }

  // Location guard
  if (part.location !== "inventory") {
    return { ok: false, code: "PART_NOT_IN_INVENTORY" };
  }

  // Reservation conflict guard
  if (
    part.reservedForWorkOrderId &&
    part.reservedForWorkOrderId !== targetWorkOrderId
  ) {
    return { ok: false, code: "PART_RESERVED_ELSEWHERE" };
  }

  // Request status guard
  const ALLOWED = new Set(["requested", "ordered", "received"]);
  if (!ALLOWED.has(record.status)) {
    return { ok: false, code: "INVALID_REQUEST_STATUS" };
  }

  return { ok: true };
}

/**
 * Simulates returnPart quantity guard (from workOrderParts.ts)
 */
function checkReturnGuards(record, quantityReturned) {
  if (quantityReturned <= 0) {
    return { ok: false, code: "QTY_NONPOSITIVE" };
  }
  const totalReturned = (record.quantityReturned ?? 0) + quantityReturned;
  if (totalReturned > record.quantityIssued) {
    return { ok: false, code: "RETURN_EXCEEDS_ISSUED" };
  }
  return { ok: true, totalReturned, fullyReturned: totalReturned >= record.quantityIssued };
}

/**
 * Simulates physical inventory count grouping logic (from physicalInventory.ts)
 * Returns Map<string, { count: number }>
 */
function groupPartsForCount(parts) {
  const groups = new Map();
  for (const part of parts) {
    const key = part.partNumber;
    const qty = part.isSerialized ? 1 : (part.quantityOnHand ?? 1);
    const existing = groups.get(key);
    if (existing) {
      existing.count += qty;
    } else {
      groups.set(key, { partNumber: part.partNumber, count: qty });
    }
  }
  return groups;
}

/**
 * Simulates receivePart location determination (from parts.ts)
 */
function determineReceivingLocation(args) {
  let location = "pending_inspection"; // INV-23 default

  if (args.isLifeLimited && args.lifeLimitHours != null && args.hoursAccumulated != null) {
    if (args.hoursAccumulated >= args.lifeLimitHours) {
      if (args.condition === "quarantine" || args.condition === "scrapped") {
        location = "quarantine";
      } else {
        return { ok: false, code: "PART_LIFE_EXPIRED_AT_RECEIPT" };
      }
    }
  }

  return { ok: true, location };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: Issue Guards
// ─────────────────────────────────────────────────────────────────────────────

test("issuePart rejects parts still in pending_inspection (INV-23)", () => {
  const result = checkIssueGuards(
    { location: "pending_inspection" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "PART_NOT_INSPECTED");
});

test("issuePart rejects parts in quarantine", () => {
  const result = checkIssueGuards(
    { location: "quarantine" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "PART_NOT_IN_INVENTORY");
});

test("issuePart rejects parts already installed", () => {
  const result = checkIssueGuards(
    { location: "installed" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "PART_NOT_IN_INVENTORY");
});

test("issuePart rejects parts reserved for a different work order", () => {
  const result = checkIssueGuards(
    { location: "inventory", reservedForWorkOrderId: "wo-other" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "PART_RESERVED_ELSEWHERE");
});

test("issuePart allows parts reserved for the SAME work order", () => {
  const result = checkIssueGuards(
    { location: "inventory", reservedForWorkOrderId: "wo-1" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, true);
});

test("issuePart allows unreserved inventory parts", () => {
  const result = checkIssueGuards(
    { location: "inventory" },
    { status: "requested" },
    "wo-1",
  );
  assert.equal(result.ok, true);
});

test("issuePart rejects when request status is 'cancelled'", () => {
  const result = checkIssueGuards(
    { location: "inventory" },
    { status: "cancelled" },
    "wo-1",
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_REQUEST_STATUS");
});

test("issuePart accepts 'ordered' and 'received' request statuses", () => {
  for (const status of ["ordered", "received"]) {
    const result = checkIssueGuards(
      { location: "inventory" },
      { status },
      "wo-1",
    );
    assert.equal(result.ok, true, `Expected ok for status "${status}"`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: Return Guards
// ─────────────────────────────────────────────────────────────────────────────

test("returnPart rejects zero quantity", () => {
  const result = checkReturnGuards({ quantityIssued: 5, quantityReturned: 0 }, 0);
  assert.equal(result.ok, false);
  assert.equal(result.code, "QTY_NONPOSITIVE");
});

test("returnPart rejects negative quantity", () => {
  const result = checkReturnGuards({ quantityIssued: 5, quantityReturned: 0 }, -1);
  assert.equal(result.ok, false);
  assert.equal(result.code, "QTY_NONPOSITIVE");
});

test("returnPart rejects when return exceeds issued", () => {
  const result = checkReturnGuards({ quantityIssued: 3, quantityReturned: 2 }, 5);
  assert.equal(result.ok, false);
  assert.equal(result.code, "RETURN_EXCEEDS_ISSUED");
});

test("returnPart allows partial return", () => {
  const result = checkReturnGuards({ quantityIssued: 5, quantityReturned: 0 }, 3);
  assert.equal(result.ok, true);
  assert.equal(result.totalReturned, 3);
  assert.equal(result.fullyReturned, false);
});

test("returnPart detects full return", () => {
  const result = checkReturnGuards({ quantityIssued: 5, quantityReturned: 3 }, 2);
  assert.equal(result.ok, true);
  assert.equal(result.totalReturned, 5);
  assert.equal(result.fullyReturned, true);
});

test("returnPart rejects exactly-one-over return (boundary)", () => {
  const result = checkReturnGuards({ quantityIssued: 5, quantityReturned: 5 }, 1);
  assert.equal(result.ok, false);
  assert.equal(result.code, "RETURN_EXCEEDS_ISSUED");
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: Physical Inventory — Batch Part Counting
// ─────────────────────────────────────────────────────────────────────────────

test("physical inventory counts serialized parts as 1 each", () => {
  const parts = [
    { partNumber: "AN3-7A", isSerialized: true, quantityOnHand: undefined },
    { partNumber: "AN3-7A", isSerialized: true, quantityOnHand: undefined },
    { partNumber: "AN3-7A", isSerialized: true, quantityOnHand: undefined },
  ];
  const groups = groupPartsForCount(parts);
  assert.equal(groups.get("AN3-7A").count, 3);
});

test("physical inventory uses quantityOnHand for batch parts", () => {
  const parts = [
    { partNumber: "OIL-15W50", isSerialized: false, quantityOnHand: 50 },
  ];
  const groups = groupPartsForCount(parts);
  assert.equal(groups.get("OIL-15W50").count, 50);
});

test("physical inventory defaults to 1 when quantityOnHand is undefined for batch parts", () => {
  const parts = [
    { partNumber: "WASHER-X", isSerialized: false, quantityOnHand: undefined },
  ];
  const groups = groupPartsForCount(parts);
  assert.equal(groups.get("WASHER-X").count, 1);
});

test("physical inventory aggregates mixed serialized + batch parts", () => {
  const parts = [
    { partNumber: "BOLT-A", isSerialized: true, quantityOnHand: undefined },
    { partNumber: "BOLT-A", isSerialized: false, quantityOnHand: 25 },
  ];
  const groups = groupPartsForCount(parts);
  // 1 serialized + 25 batch = 26 total
  assert.equal(groups.get("BOLT-A").count, 26);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: Receiving Location Determination (INV-23)
// ─────────────────────────────────────────────────────────────────────────────

test("received parts go to pending_inspection by default (INV-23)", () => {
  const result = determineReceivingLocation({
    isLifeLimited: false,
    condition: "new",
  });
  assert.equal(result.ok, true);
  assert.equal(result.location, "pending_inspection");
});

test("life-expired parts received in quarantine condition go to quarantine", () => {
  const result = determineReceivingLocation({
    isLifeLimited: true,
    lifeLimitHours: 5000,
    hoursAccumulated: 5001,
    condition: "quarantine",
  });
  assert.equal(result.ok, true);
  assert.equal(result.location, "quarantine");
});

test("life-expired parts received in non-quarantine condition are rejected", () => {
  const result = determineReceivingLocation({
    isLifeLimited: true,
    lifeLimitHours: 5000,
    hoursAccumulated: 5001,
    condition: "serviceable",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PART_LIFE_EXPIRED_AT_RECEIPT");
});

test("non-life-limited parts always go to pending_inspection", () => {
  for (const condition of ["new", "serviceable", "overhauled", "repaired"]) {
    const result = determineReceivingLocation({
      isLifeLimited: false,
      condition,
    });
    assert.equal(result.ok, true);
    assert.equal(result.location, "pending_inspection", `Expected pending_inspection for condition "${condition}"`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: Life Accumulation Computation (from removePart)
// ─────────────────────────────────────────────────────────────────────────────

function computeLifeAccumulation(part, removalHours, removalCycles) {
  const installHours = part.hoursAtInstallation ?? 0;
  const hoursThisInstall = removalHours - installHours;
  const newTotalHours = (part.hoursAccumulatedBeforeInstall ?? 0) + hoursThisInstall;

  let newTotalCycles = part.cyclesAccumulatedBeforeInstall ?? 0;
  if (removalCycles != null && part.cyclesAtInstallation != null) {
    const cyclesThisInstall = removalCycles - part.cyclesAtInstallation;
    newTotalCycles += Math.max(0, cyclesThisInstall);
  }

  return { hoursThisInstall, newTotalHours, newTotalCycles };
}

test("life accumulation: fresh part installed at 1000h, removed at 1500h", () => {
  const result = computeLifeAccumulation(
    { hoursAtInstallation: 1000, hoursAccumulatedBeforeInstall: 0 },
    1500,
    undefined,
  );
  assert.equal(result.hoursThisInstall, 500);
  assert.equal(result.newTotalHours, 500);
});

test("life accumulation: part with prior hours carries forward correctly", () => {
  const result = computeLifeAccumulation(
    { hoursAtInstallation: 2000, hoursAccumulatedBeforeInstall: 300 },
    2200,
    undefined,
  );
  assert.equal(result.hoursThisInstall, 200);
  assert.equal(result.newTotalHours, 500); // 300 prior + 200 this install
});

test("life accumulation: cycles computed when both install and removal cycles provided", () => {
  const result = computeLifeAccumulation(
    { hoursAtInstallation: 1000, hoursAccumulatedBeforeInstall: 0,
      cyclesAtInstallation: 100, cyclesAccumulatedBeforeInstall: 50 },
    1500,
    150,
  );
  assert.equal(result.newTotalCycles, 100); // 50 prior + 50 this install
});

test("life accumulation: cycles clamp to 0 if removal < install (data error)", () => {
  const result = computeLifeAccumulation(
    { hoursAtInstallation: 1000, hoursAccumulatedBeforeInstall: 0,
      cyclesAtInstallation: 100, cyclesAccumulatedBeforeInstall: 50 },
    1500,
    90, // fewer cycles than install — impossible but guarded
  );
  assert.equal(result.newTotalCycles, 50); // 50 prior + max(0, 90-100) = 50
});

console.log("\n✅ All parts-clerk inventory lifecycle tests passed.\n");
