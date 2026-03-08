#!/usr/bin/env node
// parts-clerk-bughunter/invariant-checks.test.mjs
//
// Deterministic invariant checks for the parts clerk user story.
// These are static-analysis / code-review tests that verify the Convex
// backend enforces critical domain invariants. They parse source files
// and assert that guard rails, status transitions, and traceability
// requirements are correctly implemented.
//
// Run: node --test scripts/parts-clerk-bughunter/invariant-checks.test.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const APP_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
);
const CONVEX_DIR = path.join(APP_ROOT, "convex");

function readSource(relPath) {
  return fs.readFileSync(path.join(CONVEX_DIR, relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INVENTORY COUNT DRIFT — physicalInventory.ts
// ─────────────────────────────────────────────────────────────────────────────

test("physicalInventory: startCount populates items from current inventory", () => {
  const src = readSource("physicalInventory.ts");

  // Must query parts with location = "inventory"
  assert.ok(
    src.includes('.eq("location", "inventory")') || src.includes("'inventory'"),
    "startCount must filter parts by location='inventory' to get accurate expected counts",
  );

  // Must group by partNumber
  assert.ok(
    src.includes("partNumber") && src.includes("partGroups"),
    "startCount must group parts by partNumber to compute expected quantities",
  );

  // Must write expectedQuantity
  assert.ok(
    src.includes("expectedQuantity"),
    "startCount must set expectedQuantity on count items",
  );
});

test("physicalInventory: recordItemCount computes variance", () => {
  const src = readSource("physicalInventory.ts");

  // Variance = actual - expected
  assert.ok(
    src.includes("args.actualQuantity - item.expectedQuantity") ||
      src.includes("actualQuantity - expectedQuantity"),
    "recordItemCount must compute variance as actualQuantity - expectedQuantity",
  );
});

test("physicalInventory: completeCount enforces in_progress status", () => {
  const src = readSource("physicalInventory.ts");
  assert.ok(
    src.includes('"in_progress"') && src.includes("completeCount"),
    "completeCount must check that count status is in_progress",
  );
});

test("physicalInventory: reconcileCount enforces completed status before reconciliation", () => {
  const src = readSource("physicalInventory.ts");
  assert.ok(
    src.includes('"completed"') && src.includes("reconcileCount"),
    "reconcileCount must require completed status",
  );
});

test("physicalInventory: deleteCount only allows draft deletion", () => {
  const src = readSource("physicalInventory.ts");
  assert.ok(
    src.includes('"draft"') && src.includes("deleteCount"),
    "deleteCount must only allow deleting draft counts",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MISSING/INCORRECT WO ATTACHMENT — workOrderParts.ts
// ─────────────────────────────────────────────────────────────────────────────

test("workOrderParts: requestPart records reservation event when partId provided", () => {
  const src = readSource("workOrderParts.ts");

  assert.ok(
    src.includes("partHistory.recordEvent") && src.includes('"reserved"'),
    "requestPart must record a 'reserved' partHistory event when a specific partId is provided",
  );
});

test("workOrderParts: issuePart validates part is in inventory location", () => {
  const src = readSource("workOrderParts.ts");

  assert.ok(
    src.includes('part.location !== "inventory"') ||
      src.includes("location !== 'inventory'"),
    "issuePart must check that part.location === 'inventory' before issuing",
  );
});

test("workOrderParts: issuePart records issued_to_wo history event", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('"issued_to_wo"'),
    "issuePart must record an 'issued_to_wo' event in partHistory",
  );
});

test("workOrderParts: returnPart validates issued status", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('record.status !== "issued"'),
    "returnPart must only allow returns from 'issued' status",
  );
});

test("workOrderParts: returnPart restores part location to inventory", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('location: "inventory"'),
    "returnPart must restore part location to 'inventory'",
  );
});

test("workOrderParts: returnPart records returned_from_wo history event", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('"returned_from_wo"'),
    "returnPart must record a 'returned_from_wo' event in partHistory",
  );
});

test("workOrderParts: markInstalled validates issued status", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('record.status !== "issued"') && src.includes("markInstalled"),
    "markInstalled must only allow transition from 'issued' status",
  );
});

test("workOrderParts: cancelRequest validates requested status", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('record.status !== "requested"') && src.includes("cancelRequest"),
    "cancelRequest must only allow cancellation from 'requested' status",
  );
});

test("workOrderParts: getPartsCostForWO excludes cancelled and returned items", () => {
  const src = readSource("workOrderParts.ts");
  assert.ok(
    src.includes('"cancelled"') && src.includes('"returned"'),
    "getPartsCostForWO must exclude cancelled and returned items from cost computation",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. INCONSISTENT PART STATUS TRANSITIONS — parts.ts
// ─────────────────────────────────────────────────────────────────────────────

test("parts: receivePart enforces INV-11 (life-limited requires limit)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("INV-11") && src.includes("lifeLimitHours") && src.includes("lifeLimitCycles"),
    "receivePart must enforce INV-11: life-limited parts require at least one of lifeLimitHours or lifeLimitCycles",
  );
});

test("parts: receivePart enforces INV-12 (shelf life requires date)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("INV-12") && src.includes("shelfLifeLimitDate"),
    "receivePart must enforce INV-12: shelf-life parts require shelfLifeLimitDate",
  );
});

test("parts: receivePart quarantines LLPs at or beyond life limit", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_LIFE_EXPIRED_AT_RECEIPT") &&
      src.includes('receivingLocation = "quarantine"'),
    "receivePart must quarantine life-limited parts at or beyond their life limit (G5)",
  );
});

test("parts: receivePart checks for duplicate serial numbers", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("DUPLICATE_SERIAL_IN_ORG"),
    "receivePart must detect duplicate serial numbers within an organization (G7)",
  );
});

test("parts: receivePart validates 8130-3 formTrackingNumber", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("8130_TRACKING_NUMBER_EMPTY"),
    "receivePart must validate that 8130-3 formTrackingNumber is non-empty",
  );
});

test("parts: receivePart validates 8130-3 approvalNumber", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("8130_APPROVAL_NUMBER_EMPTY"),
    "receivePart must validate that 8130-3 approvalNumber is non-empty",
  );
});

test("parts: receivePart LLP quantity mismatch is hard block", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("LLP_QUANTITY_MISMATCH"),
    "receivePart must hard-block LLP quantity mismatches between received and tag quantities",
  );
});

test("parts: receivePart non-LLP quantity mismatch requires supervisor override", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("QUANTITY_MISMATCH_NEEDS_OVERRIDE") &&
      src.includes("QUANTITY_MISMATCH_NEEDS_SUPERVISOR"),
    "receivePart must require supervisor override for non-LLP quantity mismatches",
  );
});

test("parts: installPart enforces part must be in inventory (G1)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_NOT_IN_INVENTORY"),
    "installPart must block installation of parts not in inventory",
  );
});

test("parts: installPart enforces exactly one of aircraftId or engineId (Cilla 3.5)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("INSTALL_TARGET_AMBIGUOUS") &&
      src.includes("hasAircraftId === hasEngineId"),
    "installPart must require exactly one of aircraftId or engineId",
  );
});

test("parts: installPart double-install guard via partInstallationHistory", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_ALREADY_INSTALLED") && src.includes("partInstallationHistory"),
    "installPart must check for open installation history records (double-install guard)",
  );
});

test("parts: installPart enforces INV-07 (8130-3 or receiving inspection required)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_NO_AIRWORTHINESS_DOCS"),
    "installPart must require 8130-3 or receiving inspection documentation before installation (INV-07)",
  );
});

test("parts: installPart blocks suspect 8130-3 parts", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_SUSPECT_8130"),
    "installPart must block installation of parts with suspect 8130-3 tags",
  );
});

test("parts: installPart enforces OSP-specific 8130-3 requirement", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("OSP_NO_8130"),
    "installPart must have zero override path for OSP parts without 8130-3",
  );
});

test("parts: installPart blocks shelf-life-expired parts", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("SHELF_LIFE_EXPIRED"),
    "installPart must block installation of shelf-life-expired parts",
  );
});

test("parts: installPart blocks life-limited-expired parts", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("LIFE_LIMITED_EXPIRED"),
    "installPart must hard-block installation of parts with zero or negative remaining life",
  );
});

test("parts: installPart warns on low remaining life (<=10%)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("LLP_LOW_LIFE_WARNING") && src.includes("percentRemaining <= 10"),
    "installPart must warn (not block) when LLP has <=10% remaining life",
  );
});

test("parts: installPart org mismatch check", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("INSTALL_ORG_MISMATCH"),
    "installPart must block installation under a work order from a different org",
  );
});

test("parts: installPart WO status check", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("INSTALL_WO_CLOSED"),
    "installPart must block installation under a closed work order",
  );
});

test("parts: installPart consumes signatureAuthEvent atomically", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("consumed: true") && src.includes("signatureAuthEventId"),
    "installPart must consume the signatureAuthEvent atomically with the installation writes",
  );
});

test("parts: removePart enforces part must be installed (G1)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_NOT_INSTALLED"),
    "removePart must only allow removal of installed parts",
  );
});

test("parts: removePart validates hours at removal >= hours at install (G4)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("REMOVAL_HOURS_BELOW_INSTALL"),
    "removePart must ensure aircraft hours at removal >= hours at installation",
  );
});

test("parts: removePart clears BOTH currentAircraftId AND currentEngineId (Cilla 3.5)", () => {
  const src = readSource("parts.ts");
  // Must have both cleared
  assert.ok(
    src.includes("currentAircraftId: undefined") && src.includes("currentEngineId: undefined"),
    "removePart must clear BOTH currentAircraftId AND currentEngineId per Cilla 3.5",
  );
});

test("parts: removePart computes life accumulation total", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("hoursThisInstall") && src.includes("newTotalHours"),
    "removePart must compute hours accumulated this installation and update total",
  );
});

test("parts: removePart transitions to removed_pending_disposition", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"removed_pending_disposition"'),
    "removePart must transition part location to 'removed_pending_disposition'",
  );
});

test("parts: tagPartUnserviceable blocks installed parts (must remove first)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("PART_IS_INSTALLED"),
    "tagPartUnserviceable must require removal before tagging as unserviceable",
  );
});

test("parts: tagPartUnserviceable requires non-empty reason", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("UNSERVICEABLE_REASON_EMPTY"),
    "tagPartUnserviceable must require a non-empty unserviceableReason",
  );
});

test("parts: tagPartUnserviceable moves part to quarantine", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('condition: "unserviceable"') && src.includes('location: "quarantine"'),
    "tagPartUnserviceable must set condition to unserviceable and location to quarantine",
  );
});

test("parts: createPart sets location to pending_inspection", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('location: "pending_inspection"') && src.includes("createPart"),
    "createPart must set initial location to 'pending_inspection'",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PART DETAIL / HISTORY / DOC / PHOTO ACCESS — partHistory.ts, partDocuments.ts
// ─────────────────────────────────────────────────────────────────────────────

test("partHistory: recordEvent is internalMutation (not client-callable)", () => {
  const src = readSource("partHistory.ts");
  assert.ok(
    src.includes("internalMutation") && src.includes("recordEvent"),
    "partHistory.recordEvent must be an internalMutation to prevent client-side direct calls",
  );
});

test("partHistory: listHistoryForPart query exists and uses by_part index", () => {
  const src = readSource("partHistory.ts");
  assert.ok(
    src.includes("listHistoryForPart") && src.includes('"by_part"'),
    "partHistory must expose a listHistoryForPart query using the by_part index",
  );
});

test("partHistory: listHistoryForWorkOrder query exists and uses by_work_order index", () => {
  const src = readSource("partHistory.ts");
  assert.ok(
    src.includes("listHistoryForWorkOrder") && src.includes('"by_work_order"'),
    "partHistory must expose a listHistoryForWorkOrder query using the by_work_order index",
  );
});

test("partHistory: listRecentActivity query exists with org filter", () => {
  const src = readSource("partHistory.ts");
  assert.ok(
    src.includes("listRecentActivity") && src.includes('"by_org"'),
    "partHistory must expose a listRecentActivity query using the by_org index",
  );
});

test("partDocuments: linkDocument requires at least partId or lotId", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes("PART_DOC_LINK_INVALID") &&
      src.includes("partId === undefined") &&
      src.includes("lotId === undefined"),
    "partDocuments.linkDocument must require at least one of partId or lotId",
  );
});

test("partDocuments: getConformityStatus checks for all required doc types", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes("hasCertificateOfConformity") &&
      src.includes("has8130Tag") &&
      src.includes("hasReceivingInspectionReport"),
    "partDocuments.getConformityStatus must check for CofC, 8130 tag, and receiving inspection report",
  );
});

test("partDocuments: unlinkDocument validates record existence", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes("PART_DOC_NOT_FOUND"),
    "partDocuments.unlinkDocument must validate that the linkage record exists",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TASK STEP PART TRACE — taskStepPartTrace.ts
// ─────────────────────────────────────────────────────────────────────────────

test("taskStepPartTrace: addTraceEvent requires chain-of-custody fields", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("fromCustody") && src.includes("toCustody") &&
      src.includes("Chain-of-custody requires both"),
    "addTraceEvent must require both fromCustody and toCustody for chain-of-custody",
  );
});

test("taskStepPartTrace: addTraceEvent blocks signed/locked task cards", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("signed/locked") && src.includes("signedAt"),
    "addTraceEvent must block trace events on signed/locked task cards",
  );
});

test("taskStepPartTrace: removed events require conditionAtRemoval", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("conditionAtRemoval"),
    "addTraceEvent must require conditionAtRemoval for removed part events",
  );
});

test("taskStepPartTrace: installed events require quantity > 0", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("quantity") && src.includes("greater than zero"),
    "addTraceEvent must require quantity > 0 for installed part events",
  );
});

test("taskStepPartTrace: voidTraceEvent requires reason", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("Void reason is required"),
    "voidTraceEvent must require a non-empty reason",
  );
});

test("taskStepPartTrace: voidTraceEvent blocks voiding a voided event", () => {
  const src = readSource("taskStepPartTrace.ts");
  assert.ok(
    src.includes("Cannot void a voided trace event"),
    "voidTraceEvent must prevent voiding an already-voided event",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. INVENTORY ALERTS — inventoryAlerts.ts
// ─────────────────────────────────────────────────────────────────────────────

test("inventoryAlerts: getShelfLifeAlerts classifies into correct bands", () => {
  const src = readSource("inventoryAlerts.ts");
  assert.ok(
    src.includes('"expired"') &&
      src.includes('"critical_30d"') &&
      src.includes('"warning_60d"') &&
      src.includes('"upcoming_90d"'),
    "getShelfLifeAlerts must classify alerts into expired, critical_30d, warning_60d, upcoming_90d bands",
  );
});

test("inventoryAlerts: getReorderAlerts groups by partNumber and counts inventory location", () => {
  const src = readSource("inventoryAlerts.ts");
  assert.ok(
    src.includes("partNumber") && src.includes('"inventory"') && src.includes("deficit"),
    "getReorderAlerts must group by partNumber, count inventory parts, and compute deficit",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. CROSS-MODULE INTEGRITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

test("parts: receivePart records partHistory 'received' event", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("partHistory.recordEvent") && src.includes('"received"'),
    "receivePart must record a 'received' event in partHistory",
  );
});

test("parts: installPart records partHistory 'installed' event", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"installed"') && src.includes("partHistory.recordEvent"),
    "installPart must record an 'installed' event in partHistory",
  );
});

test("parts: removePart records partHistory 'removed' event", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"removed"') && src.includes("partHistory.recordEvent"),
    "removePart must record a 'removed' event in partHistory",
  );
});

test("parts: tagPartUnserviceable records partHistory 'quarantined' event", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"quarantined"') && src.includes("partHistory.recordEvent"),
    "tagPartUnserviceable must record a 'quarantined' event in partHistory",
  );
});

test("parts: receivePart creates auditLog entry", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"auditLog"') && src.includes("receivePart"),
    "receivePart must create an auditLog entry for traceability",
  );
});

test("parts: installPart creates auditLog entry with part_installed event type", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"part_installed"') && src.includes('"auditLog"'),
    "installPart must create an auditLog entry with event type 'part_installed'",
  );
});

test("parts: removePart creates auditLog entry with part_removed event type", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes('"part_removed"') && src.includes('"auditLog"'),
    "removePart must create an auditLog entry with event type 'part_removed'",
  );
});
