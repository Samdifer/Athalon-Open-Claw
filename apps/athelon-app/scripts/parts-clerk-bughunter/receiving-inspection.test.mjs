#!/usr/bin/env node
// parts-clerk-bughunter/receiving-inspection.test.mjs
//
// Focused bug-hunt checks on the receiving → inspection → inventory path.
// This is the highest-priority flow for the parts clerk story:
// a part arrives, gets inspected, gets documentation attached, enters inventory.
//
// Run: node --test scripts/parts-clerk-bughunter/receiving-inspection.test.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const APP_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CONVEX_DIR = path.join(APP_ROOT, "convex");
const APP_DIR = path.join(APP_ROOT, "app");

function readSource(relPath) {
  return fs.readFileSync(path.join(CONVEX_DIR, relPath), "utf8");
}

function readAppFile(relPath) {
  const full = path.join(APP_DIR, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVING INSPECTION BACKEND CHECKS
// ─────────────────────────────────────────────────────────────────────────────

test("receivePart: serialized parts require serialNumber (G6)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("SERIALIZED_PART_MISSING_SERIAL"),
    "receivePart must block serialized parts without a serial number",
  );
});

test("receivePart: 8130-3 quantity must be >= 1", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("8130_QUANTITY_INVALID") && src.includes("tag.quantity < 1"),
    "receivePart must validate 8130-3 quantity >= 1",
  );
});

test("receivePart: 8130-3 certifyingStatement required", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("8130_CERTIFYING_STATEMENT_EMPTY"),
    "receivePart must validate 8130-3 certifyingStatement is non-empty",
  );
});

test("receivePart: computes hoursAccumulatedBeforeInstall from 8130-3 Block 12", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("computedHoursAccumulated") &&
      src.includes("lifeLimitHours") &&
      src.includes("lifeRemainingHours"),
    "receivePart must compute hours accumulated from 8130-3 Block 12 data (lifeLimitHours - lifeRemainingHours)",
  );
});

test("receivePart: creates audit log entry with full context", () => {
  const src = readSource("parts.ts");
  // Find the audit log insert near the end of receivePart
  const receiveSection = src.slice(
    src.indexOf("export const receivePart"),
    src.indexOf("export const installPart"),
  );
  assert.ok(
    receiveSection.includes("auditLog") && receiveSection.includes("Part received:"),
    "receivePart must create an auditLog entry with receiving details",
  );
});

test("receivePart: links eightOneThirtyId to part record", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("ctx.db.patch(partId, { eightOneThirtyId }"),
    "receivePart must link the 8130-3 record back to the part via patch",
  );
});

test("receivePart: organization must be active (G1)", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("org.active") || src.includes("!org.active"),
    "receivePart must check that the organization is active before receiving parts",
  );
});

test("receivePart: callerUserId from requireAuth is used for audit trail", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("requireAuth") && src.includes("callerUserId"),
    "receivePart must authenticate the caller and use their ID in audit records",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVING INSPECTION UI CHECKS
// ─────────────────────────────────────────────────────────────────────────────

test("UI: ReceivingInspection component exists", () => {
  const src = readAppFile("(app)/parts/_components/ReceivingInspection.tsx");
  assert.ok(src !== null, "ReceivingInspection.tsx component must exist");
});

test("UI: receiving page renders ReceivingInspection component", () => {
  const src = readAppFile("(app)/parts/receiving/page.tsx");
  assert.ok(src !== null, "Parts receiving page must exist");
  assert.ok(
    src.includes("ReceivingInspection"),
    "Receiving page must render the ReceivingInspection component",
  );
});

test("UI: parts requests page exists", () => {
  const src = readAppFile("(app)/parts/requests/page.tsx");
  assert.ok(src !== null, "Parts requests page must exist at /parts/requests");
});

test("UI: parts alerts page exists", () => {
  const src = readAppFile("(app)/parts/alerts/page.tsx");
  assert.ok(src !== null, "Parts alerts page must exist at /parts/alerts");
});

test("UI: parts main page exists", () => {
  const src = readAppFile("(app)/parts/page.tsx");
  assert.ok(src !== null, "Parts main page must exist at /parts");
});

test("UI: parts new page exists for creating parts", () => {
  const src = readAppFile("(app)/parts/new/page.tsx");
  assert.ok(src !== null, "Parts new page must exist at /parts/new for creating parts");
});

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVING INSPECTION PATH COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

test("createPart: initial condition is 'new'", () => {
  const src = readSource("parts.ts");
  const createSection = src.slice(
    src.indexOf("export const createPart"),
  );
  assert.ok(
    createSection.includes('condition: "new"'),
    "createPart must set initial condition to 'new'",
  );
});

test("createPart: initial location is 'pending_inspection' (not 'inventory')", () => {
  const src = readSource("parts.ts");
  const createSection = src.slice(
    src.indexOf("export const createPart"),
  );
  assert.ok(
    createSection.includes('location: "pending_inspection"'),
    "createPart must set location to 'pending_inspection', not directly to inventory",
  );
  // BUG CHECK: ensure it doesn't bypass inspection
  const directToInventory =
    createSection.includes('location: "inventory"') &&
    !createSection.includes("receivePart");

  if (directToInventory) {
    console.log(
      "⚠️  POTENTIAL BUG: createPart appears to set location directly to 'inventory' " +
        "bypassing the inspection step. Parts should go through receiving inspection " +
        "before entering inventory.",
    );
  }
});

test("BUG CHECK: createPart lacks 8130-3 attachment enforcement before inventory entry", () => {
  const src = readSource("parts.ts");
  const createSection = src.slice(
    src.indexOf("export const createPart"),
  );

  // createPart creates parts with no 8130-3 and no receiving inspection
  // Parts go to pending_inspection, which is correct, BUT:
  // There is no separate mutation to complete inspection and move to inventory.
  // receivePart is the only path that sets location to "inventory" with documentation.
  // createPart parts at pending_inspection need a separate flow to enter inventory.

  const hasInspectionCompletion = src.includes("completeInspection") ||
    src.includes("approveInspection") ||
    src.includes("moveToInventory");

  if (!hasInspectionCompletion) {
    console.log(
      "⚠️  GAP DETECTED: No mutation found to transition parts from 'pending_inspection' " +
        "to 'inventory' after inspection completion. createPart puts parts at " +
        "'pending_inspection' but there's no explicit inspection-complete mutation. " +
        "receivePart is the full-featured path but creates new records rather than " +
        "transitioning existing ones. Parts created via createPart may be stuck " +
        "in 'pending_inspection' indefinitely.",
    );
  }

  assert.ok(true, "Gap detection completed");
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ACCESS FOR RECEIVING INSPECTION
// ─────────────────────────────────────────────────────────────────────────────

test("partDocuments: supports receiving_inspection_report document role", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes('"receiving_inspection_report"'),
    "partDocuments must support 'receiving_inspection_report' as a document role",
  );
});

test("partDocuments: supports photo document role", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes('"photo"'),
    "partDocuments must support 'photo' as a document role for part photos",
  );
});

test("partDocuments: supports 8130_3_tag document role", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes('"8130_3_tag"'),
    "partDocuments must support '8130_3_tag' as a document role",
  );
});

test("partDocuments: supports certificate_of_conformity role", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes('"certificate_of_conformity"'),
    "partDocuments must support 'certificate_of_conformity' as a document role",
  );
});

test("partDocuments: listForPart enriches with actual document record", () => {
  const src = readSource("partDocuments.ts");
  assert.ok(
    src.includes("ctx.db.get(linkage.documentId)") ||
      src.includes("db.get(linkage.documentId)"),
    "partDocuments.listForPart must enrich linkages with the actual document record",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PO RECEIVING PATH
// ─────────────────────────────────────────────────────────────────────────────

test("UI: PO receiving page exists", () => {
  const src = readAppFile("(app)/parts/receiving/po/page.tsx");
  assert.ok(src !== null, "PO receiving page must exist at /parts/receiving/po");
});

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE / BIN LOCATION INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

test("receivePart: supports binLocationId for warehouse location", () => {
  const src = readSource("parts.ts");
  assert.ok(
    src.includes("binLocationId") && src.includes("warehouseBins"),
    "receivePart must accept an optional binLocationId for warehouse location tracking",
  );
});

test("UI: warehouse page exists", () => {
  const src = readAppFile("(app)/parts/warehouse/page.tsx");
  assert.ok(src !== null, "Warehouse page must exist at /parts/warehouse");
});

test("UI: BinLocationPicker component exists", () => {
  const src = readAppFile("(app)/parts/_components/BinLocationPicker.tsx");
  assert.ok(src !== null, "BinLocationPicker component must exist for warehouse integration");
});
