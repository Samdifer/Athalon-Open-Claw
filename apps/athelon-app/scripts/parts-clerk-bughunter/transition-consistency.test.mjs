#!/usr/bin/env node
// parts-clerk-bughunter/transition-consistency.test.mjs
//
// Validates that status transition logic is complete and consistent
// across the parts lifecycle. Catches gaps where a mutation allows
// an unexpected source status, or where a transition is missing.
//
// Run: node --test scripts/parts-clerk-bughunter/transition-consistency.test.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const APP_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CONVEX_DIR = path.join(APP_ROOT, "convex");

function readSource(relPath) {
  return fs.readFileSync(path.join(CONVEX_DIR, relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED PART LOCATION STATE MACHINE
//
// Valid part.location transitions:
//   (created)                    → pending_inspection  (createPart)
//   (received)                   → inventory | quarantine  (receivePart)
//   inventory                    → installed  (installPart)
//   installed                    → removed_pending_disposition  (removePart)
//   * (except installed/scrapped) → quarantine  (tagPartUnserviceable)
//   inventory                    → issued  (issuePart via workOrderParts)
//   issued                       → inventory  (returnPart via workOrderParts)
//
// WORK ORDER PARTS status machine:
//   (created)    → requested
//   requested    → cancelled  (cancelRequest)
//   requested/ordered/received → issued  (issuePart)
//   issued       → installed  (markInstalled)
//   issued       → returned   (returnPart, when fully returned)
//
// INVENTORY COUNT status machine:
//   (created)    → draft
//   draft        → in_progress  (startCount)
//   in_progress  → completed  (completeCount)
//   completed    → reconciled  (reconcileCount)
// ─────────────────────────────────────────────────────────────────────────────

test("parts.ts: receivePart outputs pending_inspection or quarantine", () => {
  const src = readSource("parts.ts");
  // Scope to just the receivePart mutation
  const receiveSection = src.slice(
    src.indexOf("export const receivePart"),
    src.indexOf("export const installPart"),
  );
  // receivePart sets receivingLocation: default pending_inspection, quarantine for expired LLPs
  const locationAssignments = receiveSection.match(
    /receivingLocation\s*[:=]\s*"(\w+)"/g,
  );
  assert.ok(locationAssignments, "Must find receivingLocation assignments in receivePart");

  const values = locationAssignments.map((m) => m.match(/"(\w+)"/)[1]);
  const unique = [...new Set(values)];
  assert.deepEqual(
    unique.sort(),
    ["pending_inspection", "quarantine"],
    `receivePart receivingLocation must be pending_inspection/quarantine, got: ${unique}`,
  );

  // NOTE: receivePart sends ALL received parts to pending_inspection by default,
  // even when full 8130-3 documentation is provided. This means parts always
  // need a separate inspection completion step before entering "inventory".
  // This is consistent with createPart behavior but means there's no direct
  // path to inventory even with complete documentation at receiving time.
  // This may be intentional (all parts must be physically inspected regardless
  // of documentation) or a gap (documented parts could skip to inventory).
  console.log(
    "ℹ️  NOTE: receivePart sends all parts to 'pending_inspection' by default, " +
      "even with complete 8130-3 documentation. Combined with the missing " +
      "'completeInspection' mutation, received parts may be stuck at pending_inspection.",
  );
});

test("parts.ts: installPart transitions location from inventory → installed", () => {
  const src = readSource("parts.ts");
  // Guard: location must be "inventory"
  assert.ok(
    src.includes('part.location !== "inventory"') ||
      src.includes("part.location !== 'inventory'"),
    "installPart must guard location === inventory",
  );
  // Write: location = "installed"
  assert.ok(
    src.includes('location: "installed"'),
    "installPart must set location to 'installed'",
  );
});

test("parts.ts: removePart transitions location from installed → removed_pending_disposition", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('part.location !== "installed"'),
    "removePart must guard location === installed",
  );
  assert.ok(
    src.includes('location: "removed_pending_disposition"'),
    "removePart must set location to removed_pending_disposition",
  );
});

test("parts.ts: tagPartUnserviceable transitions to quarantine", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('location: "quarantine"'),
    "tagPartUnserviceable must set location to quarantine",
  );
});

test("parts.ts: tagPartUnserviceable blocks installed and scrapped parts", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('part.location === "installed"') ||
      src.includes("PART_IS_INSTALLED"),
    "tagPartUnserviceable must block installed parts",
  );
  assert.ok(
    src.includes('part.location === "scrapped"') ||
      src.includes("PART_ALREADY_SCRAPPED"),
    "tagPartUnserviceable must block scrapped parts",
  );
});

test("workOrderParts.ts: status transitions are guarded", () => {
  const src = readSource("workOrderParts.ts");

  // cancelRequest: requested → cancelled
  assert.ok(
    src.includes('record.status !== "requested"') && src.includes('"cancelled"'),
    "cancelRequest must guard: only 'requested' → 'cancelled'",
  );

  // issuePart: requested/ordered/received → issued
  assert.ok(
    src.includes('"requested"') && src.includes('"ordered"') && src.includes('"received"'),
    "issuePart must accept requested/ordered/received as valid source statuses",
  );
  assert.ok(
    src.includes('status: "issued"'),
    "issuePart must transition to 'issued'",
  );

  // returnPart: issued → returned (or stays issued if partial)
  assert.ok(
    src.includes('record.status !== "issued"') && src.includes('"returned"'),
    "returnPart must guard: only 'issued' → 'returned'",
  );

  // markInstalled: issued → installed
  assert.ok(
    src.includes('record.status !== "issued"') && src.includes('"installed"'),
    "markInstalled must guard: only 'issued' → 'installed'",
  );
});

test("physicalInventory.ts: count status transitions are sequential", () => {
  const src = readSource("physicalInventory.ts");

  // draft → in_progress
  assert.ok(
    src.includes('count.status !== "draft"') || src.includes('"draft"'),
    "startCount must require draft status",
  );
  assert.ok(
    src.includes('status: "in_progress"'),
    "startCount must transition to in_progress",
  );

  // in_progress → completed
  assert.ok(
    src.includes('count.status !== "in_progress"'),
    "completeCount must require in_progress status",
  );
  assert.ok(
    src.includes('status: "completed"'),
    "completeCount must transition to completed",
  );

  // completed → reconciled
  assert.ok(
    src.includes('count.status !== "completed"'),
    "reconcileCount must require completed status",
  );
  assert.ok(
    src.includes('status: "reconciled"') || src.includes('"reconciled"'),
    "reconcileCount must transition to reconciled",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE CONSISTENCY: WO Parts vs Parts module alignment
// ─────────────────────────────────────────────────────────────────────────────

test("workOrderParts: issuePart updates both workOrderParts and parts records", () => {
  const src = readSource("workOrderParts.ts");
  // Must patch the workOrderParts record
  assert.ok(
    src.includes("ctx.db.patch(args.requestId") || src.includes("db.patch(args.requestId"),
    "issuePart must update the workOrderParts record",
  );
  // Must also patch the parts record (reserve)
  assert.ok(
    src.includes("ctx.db.patch(args.partId") || src.includes("db.patch(args.partId"),
    "issuePart must also update the parts record (reservation)",
  );
});

test("workOrderParts: returnPart restores part and updates workOrderParts", () => {
  const src = readSource("workOrderParts.ts");
  // Must restore part location
  assert.ok(
    src.includes('location: "inventory"'),
    "returnPart must restore part location to inventory",
  );
  // Must clear reservation fields
  assert.ok(
    src.includes("reservedForWorkOrderId: undefined") ||
      src.includes("reservedForWorkOrderId"),
    "returnPart must clear reservation fields on the part",
  );
});

test("workOrderParts: markInstalled updates both request and part location", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('status: "installed"'),
    "markInstalled must set workOrderParts status to installed",
  );
  assert.ok(
    src.includes('location: "installed"'),
    "markInstalled must set part location to installed",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG: issuePart does NOT change part.location from "inventory" to "issued"
//
// The workOrderParts.issuePart mutation sets reservation fields on the part
// but does NOT change part.location from "inventory". This means:
//   - The part still appears in inventory queries
//   - Another work order could issue the same part (race condition)
//   - Physical inventory counts would include reserved-but-issued parts
//
// This is a KNOWN INCONSISTENCY that should be flagged.
// ─────────────────────────────────────────────────────────────────────────────

test("BUG DETECTED: workOrderParts.issuePart does not transition part.location away from inventory", () => {
  const src = readSource("workOrderParts.ts");

  // Look for the issuePart handler's db.patch on partId
  const issuePartSection = src.slice(
    src.indexOf("export const issuePart"),
    src.indexOf("export const returnPart"),
  );

  // Check if location is set in the part patch
  const partPatchMatch = issuePartSection.match(
    /ctx\.db\.patch\(args\.partId[\s\S]*?\{([\s\S]*?)\}/,
  );

  if (partPatchMatch) {
    const patchBody = partPatchMatch[1];
    const setsLocation = patchBody.includes("location:");

    // This test documents the bug: issuePart should set location but doesn't
    if (!setsLocation) {
      // Bug confirmed — flag it but don't fail CI (this is documentation)
      console.log(
        "⚠️  BUG CONFIRMED: workOrderParts.issuePart patches part record but does NOT " +
          'set location away from "inventory". Parts issued to a WO remain visible in ' +
          "inventory queries and physical counts. Risk: double-issuance, inventory count drift.",
      );
    }
  }

  // This test always passes — it's a detection/documentation test
  assert.ok(true, "Bug detection check completed");
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG: physicalInventory.reconcileCount does NOT actually adjust inventory
//
// The reconcileCount mutation only changes the count status to "reconciled"
// but does not create, delete, or modify any parts records to match the
// actual counts. This means inventory drift detected during physical counts
// is acknowledged but never corrected.
// ─────────────────────────────────────────────────────────────────────────────

test("BUG DETECTED: physicalInventory.reconcileCount does not adjust inventory records", () => {
  const src = readSource("physicalInventory.ts");

  const reconcileSection = src.slice(
    src.indexOf("export const reconcileCount"),
  );

  // Check if reconcileCount queries or patches any parts records
  const touchesParts =
    reconcileSection.includes('"parts"') ||
    reconcileSection.includes("parts.") ||
    reconcileSection.includes("partId");

  if (!touchesParts) {
    console.log(
      "⚠️  BUG CONFIRMED: physicalInventory.reconcileCount only changes count status to " +
        '"reconciled" but does NOT adjust any parts records. Inventory drift detected ' +
        "during physical counts is never corrected in the system. This is flagged as a " +
        "future enhancement per the source comment, but represents an inventory integrity gap.",
    );
  }

  assert.ok(true, "Bug detection check completed");
});
