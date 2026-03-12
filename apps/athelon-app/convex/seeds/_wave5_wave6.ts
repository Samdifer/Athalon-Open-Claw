// convex/seeds/_wave5_wave6.ts
// Wave 5: Parts & Inventory seed data
// Wave 6: Training & OJT seed data
//
// Colorado Aviation Maintenance Group (CAMG) — FAA Part 145 MRO
// Centennial Airport (APA) primary, Fort Collins (FNL) secondary

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface SeedIds {
  orgId: Id<"organizations">;
  clerkUserId: string;
  now: number;
  DAY: number;
  HOUR: number;
  techMap: Record<string, Id<"technicians">>;
  customerIds: Id<"customers">[];
  aircraftIds: Id<"aircraft">[];
  vendorIds: Id<"vendors">[];
  partIds: Id<"parts">[];
  closedWOIds: Id<"workOrders">[];
  activeWOIds: Id<"workOrders">[];
  locationMap: Record<string, Id<"shopLocations">>;
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 5: PARTS & INVENTORY
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave5(ctx: MutationCtx, ids: SeedIds) {
  const { orgId, now, DAY, techMap, vendorIds, partIds, closedWOIds, activeWOIds, locationMap } = ids;
  const orgIdStr = orgId as unknown as string;

  // ── 1. warehouses (2 records) ─────────────────────────────────────────────
  const warehouseApaId = await ctx.db.insert("warehouses", {
    organizationId: orgId,
    name: "APA Main Parts Stockroom",
    code: "APA-MAIN",
    description: "Primary parts warehouse at Centennial Airport — general aviation, turboprop, and rotable inventory",
    address: "7707 S Peoria St, Englewood, CO 80112",
    shopLocationId: locationMap["APA"],
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const warehouseFnlId = await ctx.db.insert("warehouses", {
    organizationId: orgId,
    name: "FNL Parts Stockroom",
    code: "FNL-MAIN",
    description: "Secondary parts warehouse at Fort Collins-Loveland Municipal — piston and training fleet support",
    address: "4824 Earhart Rd, Loveland, CO 80538",
    shopLocationId: locationMap["FNL"],
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 2. warehouseAreas (6 records) ─────────────────────────────────────────
  const areaApaGeneralId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    name: "General Parts",
    code: "APA-GEN",
    description: "Standard airframe and powerplant parts — no special handling required",
    areaType: "general",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const areaApaHazmatId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    name: "Hazardous Materials",
    code: "APA-HAZ",
    description: "Solvents, adhesives, sealants, and other HAZMAT — DOT-compliant storage cabinets",
    areaType: "hazmat",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const areaApaSecureId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    name: "High-Value & Avionics",
    code: "APA-SEC",
    description: "Avionics boxes, LRUs, and high-value rotables — keyed access, CCTV monitored",
    areaType: "secure",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const areaApaReceivingId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    name: "Receiving & Incoming QC",
    code: "APA-RCV",
    description: "Incoming parts staging — parts wait here until receiving inspection is complete",
    areaType: "receiving",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const areaFnlGeneralId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    name: "FNL General Parts",
    code: "FNL-GEN",
    description: "Piston engine consumables, filters, and commonly stocked hardware",
    areaType: "general",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const areaFnlQuarantineId = await ctx.db.insert("warehouseAreas", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    name: "FNL Quarantine",
    code: "FNL-QRT",
    description: "Parts pending disposition — unapproved paperwork, suspected unapproved parts (SUP) hold",
    areaType: "quarantine",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 3. warehouseShelves (6 records) ───────────────────────────────────────
  const shelfApaA1Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    name: "Shelf A1 — Filters & Consumables",
    code: "APA-GEN-A1",
    description: "Oil filters, fuel filters, spark plugs, and consumable items",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const shelfApaA2Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    name: "Shelf A2 — Hardware & Fasteners",
    code: "APA-GEN-A2",
    description: "AN hardware, MS fasteners, cotter pins, and safety wire",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const shelfApaB1Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaSecureId,
    name: "Shelf B1 — Avionics Units",
    code: "APA-SEC-B1",
    description: "GTN series navigators, GFC autopilots, and transponders",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const shelfApaC1Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaReceivingId,
    name: "Receiving Bench C1",
    code: "APA-RCV-C1",
    description: "Incoming parts staging bench — awaiting receiving inspection",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const shelfFnlA1Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlGeneralId,
    name: "FNL Shelf A1 — Lycoming & Continental",
    code: "FNL-GEN-A1",
    description: "Piston engine parts: spark plugs, gaskets, seals, and filters",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const shelfFnlQ1Id = await ctx.db.insert("warehouseShelves", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlQuarantineId,
    name: "FNL Quarantine Shelf Q1",
    code: "FNL-QRT-Q1",
    description: "Parts pending FAA Form 8130-3 verification or source traceability review",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 4. warehouseShelfLocations (12 records) ───────────────────────────────
  const slApaA1L1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    name: "Level 1 — Bottom",
    code: "APA-GEN-A1-L1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaA1L2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    name: "Level 2 — Mid",
    code: "APA-GEN-A1-L2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaA2L1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA2Id,
    name: "Level 1 — Bottom",
    code: "APA-GEN-A2-L1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaA2L2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA2Id,
    name: "Level 2 — Mid",
    code: "APA-GEN-A2-L2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaB1L1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaSecureId,
    shelfId: shelfApaB1Id,
    name: "Level 1 — Bottom",
    code: "APA-SEC-B1-L1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaB1L2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaSecureId,
    shelfId: shelfApaB1Id,
    name: "Level 2 — Mid",
    code: "APA-SEC-B1-L2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaC1S1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaReceivingId,
    shelfId: shelfApaC1Id,
    name: "Section 1 — Left",
    code: "APA-RCV-C1-S1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slApaC1S2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaReceivingId,
    shelfId: shelfApaC1Id,
    name: "Section 2 — Right",
    code: "APA-RCV-C1-S2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const slFnlA1L1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlGeneralId,
    shelfId: shelfFnlA1Id,
    name: "Level 1 — Bottom",
    code: "FNL-GEN-A1-L1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const slFnlA1L2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlGeneralId,
    shelfId: shelfFnlA1Id,
    name: "Level 2 — Mid",
    code: "FNL-GEN-A1-L2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const slFnlQ1S1Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlQuarantineId,
    shelfId: shelfFnlQ1Id,
    name: "Section 1",
    code: "FNL-QRT-Q1-S1",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const slFnlQ1S2Id = await ctx.db.insert("warehouseShelfLocations", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlQuarantineId,
    shelfId: shelfFnlQ1Id,
    name: "Section 2",
    code: "FNL-QRT-Q1-S2",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 5. warehouseBins (12 records) ─────────────────────────────────────────
  const binApaOilFilterId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    shelfLocationId: slApaA1L1Id,
    name: "Oil Filters",
    code: "APA-GEN-A1-L1-01",
    barcode: "CAMG-BIN-001",
    displayPath: "APA Main → General → A1 → Level 1 → Oil Filters",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaFuelFilterId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    shelfLocationId: slApaA1L1Id,
    name: "Fuel Filters",
    code: "APA-GEN-A1-L1-02",
    barcode: "CAMG-BIN-002",
    displayPath: "APA Main → General → A1 → Level 1 → Fuel Filters",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaSparkPlugsId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    shelfLocationId: slApaA1L2Id,
    name: "Spark Plugs & Ignition",
    code: "APA-GEN-A1-L2-01",
    barcode: "CAMG-BIN-003",
    displayPath: "APA Main → General → A1 → Level 2 → Spark Plugs & Ignition",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaOilsId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA1Id,
    shelfLocationId: slApaA1L2Id,
    name: "Oils & Lubricants",
    code: "APA-GEN-A1-L2-02",
    barcode: "CAMG-BIN-004",
    displayPath: "APA Main → General → A1 → Level 2 → Oils & Lubricants",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaHardwareSmallId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA2Id,
    shelfLocationId: slApaA2L1Id,
    name: "AN Hardware — Small (AN3-AN5)",
    code: "APA-GEN-A2-L1-01",
    barcode: "CAMG-BIN-005",
    displayPath: "APA Main → General → A2 → Level 1 → AN Hardware Small",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaHardwareLargeId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaGeneralId,
    shelfId: shelfApaA2Id,
    shelfLocationId: slApaA2L2Id,
    name: "AN Hardware — Large (AN6+) & Safety Wire",
    code: "APA-GEN-A2-L2-01",
    barcode: "CAMG-BIN-006",
    displayPath: "APA Main → General → A2 → Level 2 → AN Hardware Large",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaGTNId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaSecureId,
    shelfId: shelfApaB1Id,
    shelfLocationId: slApaB1L1Id,
    name: "Garmin GTN / GNS Units",
    code: "APA-SEC-B1-L1-01",
    barcode: "CAMG-BIN-007",
    displayPath: "APA Main → Secure → B1 → Level 1 → Garmin GTN/GNS",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaAviationicsRotableId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaSecureId,
    shelfId: shelfApaB1Id,
    shelfLocationId: slApaB1L2Id,
    name: "Autopilot & Transponder Rotables",
    code: "APA-SEC-B1-L2-01",
    barcode: "CAMG-BIN-008",
    displayPath: "APA Main → Secure → B1 → Level 2 → Autopilot & Transponder",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaReceiving1Id = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaReceivingId,
    shelfId: shelfApaC1Id,
    shelfLocationId: slApaC1S1Id,
    name: "Incoming — Pending Inspection (Left)",
    code: "APA-RCV-C1-S1-01",
    barcode: "CAMG-BIN-009",
    displayPath: "APA Main → Receiving → C1 → Left → Pending Inspection",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binApaReceiving2Id = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseApaId,
    areaId: areaApaReceivingId,
    shelfId: shelfApaC1Id,
    shelfLocationId: slApaC1S2Id,
    name: "Incoming — Rush / AOG (Right)",
    code: "APA-RCV-C1-S2-01",
    barcode: "CAMG-BIN-010",
    displayPath: "APA Main → Receiving → C1 → Right → Rush/AOG",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 30 * DAY,
  });

  const binFnlPistonId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlGeneralId,
    shelfId: shelfFnlA1Id,
    shelfLocationId: slFnlA1L1Id,
    name: "FNL Piston Engine Parts",
    code: "FNL-GEN-A1-L1-01",
    barcode: "CAMG-BIN-011",
    displayPath: "FNL Stockroom → General → A1 → Level 1 → Piston Parts",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const binFnlQuarantineId = await ctx.db.insert("warehouseBins", {
    organizationId: orgId,
    warehouseId: warehouseFnlId,
    areaId: areaFnlQuarantineId,
    shelfId: shelfFnlQ1Id,
    shelfLocationId: slFnlQ1S1Id,
    name: "FNL Quarantine Hold",
    code: "FNL-QRT-Q1-S1-01",
    barcode: "CAMG-BIN-012",
    displayPath: "FNL Stockroom → Quarantine → Q1 → Section 1 → Hold",
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // Suppress unused variable warnings for shelf locations only used for bins
  void slFnlA1L2Id;
  void slFnlQ1S2Id;

  // ── 6. lots (6 records) ───────────────────────────────────────────────────
  const lot1Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00101",
    batchNumber: "CH-BATCH-2025-Q4",
    partNumber: "CH48110-1",
    partName: "Oil Filter Element",
    description: "Champion Aerospace oil filter elements — bulk purchase Q4 2025",
    originalQuantity: 24,
    receivedQuantity: 24,
    issuedQuantity: 8,
    remainingQuantity: 16,
    vendorId: vendorIds[0], // Aviall
    receivedDate: now - 90 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: false,
    condition: "new",
    notes: "Received with CoC #AV-2025-9872. All 24 units inspected.",
    binLocationId: binApaOilFilterId,
    createdAt: now - 90 * DAY,
    updatedAt: now - 10 * DAY,
  });

  const lot2Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00102",
    batchNumber: "GARMIN-GTN750XI-SN",
    partNumber: "011-02261-00",
    partName: "GTN 750Xi GPS/NAV/COMM",
    description: "Garmin GTN 750Xi exchange unit — new-in-box with all accessories",
    originalQuantity: 1,
    receivedQuantity: 1,
    issuedQuantity: 0,
    remainingQuantity: 1,
    vendorId: vendorIds[2], // Garmin
    receivedDate: now - 14 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: false,
    condition: "new",
    notes: "S/N 0MGTG70001. Received for scheduled avionics upgrade — awaiting install slot.",
    binLocationId: binApaGTNId,
    createdAt: now - 14 * DAY,
    updatedAt: now - 14 * DAY,
  });

  const lot3Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00103",
    batchNumber: "PWA-PT6-2026-001",
    partNumber: "AEROSHELL-560",
    partName: "AeroShell Turbine Oil 560",
    description: "AeroShell 560 turbine oil — case of 12 quarts for PT6A fleet",
    originalQuantity: 48,
    receivedQuantity: 48,
    issuedQuantity: 22,
    remainingQuantity: 26,
    vendorId: vendorIds[0], // Aviall
    receivedDate: now - 45 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: true,
    shelfLifeExpiryDate: now + 730 * DAY, // 2-year shelf life
    condition: "new",
    notes: "Batch expires 2028-03. Monitor remaining quantity — reorder at 10.",
    binLocationId: binApaOilsId,
    createdAt: now - 45 * DAY,
    updatedAt: now - 5 * DAY,
  });

  const lot4Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00104",
    batchNumber: "HPC-2025-4471",
    partNumber: "HC-E4N-3D",
    partName: "Hartzell HC-E4N-3D Prop Blade",
    description: "Hartzell four-blade composite prop blade — serviceable exchange",
    originalQuantity: 1,
    receivedQuantity: 1,
    issuedQuantity: 1,
    remainingQuantity: 0,
    vendorId: vendorIds[3], // Hartzell
    receivedDate: now - 35 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: false,
    condition: "depleted",
    notes: "Installed on King Air B200 N722KA during Phase 3 inspection. Core returned.",
    binLocationId: binApaReceiving1Id,
    createdAt: now - 35 * DAY,
    updatedAt: now - 7 * DAY,
  });

  const lot5Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00105",
    batchNumber: "CLEV-2025-BRAKE",
    partNumber: "101-8100-2",
    partName: "Cleveland Brake Lining Set",
    description: "Cleveland 30-91 series brake lining set — 172/182/206 fleet",
    originalQuantity: 20,
    receivedQuantity: 20,
    issuedQuantity: 4,
    remainingQuantity: 16,
    vendorId: vendorIds[4], // Cleveland Wheels
    receivedDate: now - 60 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: false,
    condition: "new",
    notes: "Bulk order for 172 fleet brake service program.",
    binLocationId: binFnlPistonId,
    createdAt: now - 60 * DAY,
    updatedAt: now - 20 * DAY,
  });

  const lot6Id = await ctx.db.insert("lots", {
    organizationId: orgId,
    lotNumber: "LOT-2026-00106",
    batchNumber: "SUSPECT-HOLD-2026",
    partNumber: "MS24665-305",
    partName: "Cotter Pin MS24665-305",
    description: "Cotter pins — quarantined pending source traceability documentation",
    originalQuantity: 500,
    receivedQuantity: 500,
    issuedQuantity: 0,
    remainingQuantity: 500,
    vendorId: undefined,
    receivedDate: now - 5 * DAY,
    receivedByUserId: ids.clerkUserId,
    hasShelfLife: false,
    condition: "quarantine",
    notes: "Received without CoC — seller could not provide traceability. QCM hold per §145.211(c). Do not issue.",
    binLocationId: binFnlQuarantineId,
    createdAt: now - 5 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // ── 7. partHistory (15 records) ───────────────────────────────────────────
  // Oil filter lifecycle
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[0], // CH48110-1 Oil Filter
    eventType: "received",
    vendorId: vendorIds[0],
    lotId: lot1Id,
    toLocation: "APA-RCV-C1-S1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Lot LOT-2026-00101 received from Aviall. 24 units on CoC #AV-2025-9872.",
    createdAt: now - 90 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[0],
    eventType: "inspected",
    lotId: lot1Id,
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Receiving inspection passed. Part numbers and quantities verified against packing slip.",
    createdAt: now - 90 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[0],
    eventType: "stocked",
    lotId: lot1Id,
    fromLocation: "APA-RCV-C1-S1-01",
    toLocation: "APA-GEN-A1-L1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Moved to bin APA-GEN-A1-L1-01. Ready for issue.",
    createdAt: now - 89 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[0],
    eventType: "issued_to_wo",
    workOrderId: closedWOIds[0], // WO-2025-0801 172S annual
    lotId: lot1Id,
    fromLocation: "APA-GEN-A1-L1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "1 unit issued for 172S annual — WO-2025-0801.",
    createdAt: now - 87 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[0],
    eventType: "installed",
    workOrderId: closedWOIds[0],
    aircraftId: ids.aircraftIds[0],
    lotId: lot1Id,
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-007"],
    notes: "Installed per Cessna SB. Torqued to spec. Logbook entry made.",
    createdAt: now - 87 * DAY,
  });

  // Turbine oil lifecycle
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[3], // AeroShell 560
    eventType: "received",
    vendorId: vendorIds[0],
    lotId: lot3Id,
    toLocation: "APA-RCV-C1-S1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "48 quarts received. Shelf life confirmed to 2028-03.",
    createdAt: now - 45 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[3],
    eventType: "stocked",
    lotId: lot3Id,
    fromLocation: "APA-RCV-C1-S1-01",
    toLocation: "APA-GEN-A1-L2-02",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Placed in oils bin. FIFO rotation applied.",
    createdAt: now - 44 * DAY,
  });

  // GTN 750Xi received and staged
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[5], // Garmin GTN 750Xi
    eventType: "received",
    vendorId: vendorIds[2], // Garmin
    lotId: lot2Id,
    toLocation: "APA-RCV-C1-S2-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "AOG priority receipt. S/N confirmed against customer PO.",
    createdAt: now - 14 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[5],
    eventType: "inspected",
    lotId: lot2Id,
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Receiving inspection: new-in-box, all accessories present, data tag verified.",
    createdAt: now - 14 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[5],
    eventType: "stocked",
    lotId: lot2Id,
    fromLocation: "APA-RCV-C1-S2-01",
    toLocation: "APA-SEC-B1-L1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Moved to secure avionics cage. Reserved for upcoming GFC/GTN upgrade.",
    createdAt: now - 13 * DAY,
  });

  // Brake lining issued and installed
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[22], // Cleveland brake lining
    eventType: "issued_to_wo",
    workOrderId: closedWOIds[2], // WO-2025-0803 brake overhaul 182T
    lotId: lot5Id,
    fromLocation: "FNL-GEN-A1-L1-01",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "2 sets issued for 182T brake overhaul — WO-2025-0803.",
    createdAt: now - 73 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[22],
    eventType: "installed",
    workOrderId: closedWOIds[2],
    aircraftId: ids.aircraftIds[2],
    lotId: lot5Id,
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-008"],
    notes: "Installed both main gear lining sets. Brake dragging corrected.",
    createdAt: now - 73 * DAY,
  });

  // Quarantine event
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[15], // MS cotter pins
    eventType: "quarantined",
    lotId: lot6Id,
    toLocation: "FNL-QRT-Q1-S1-01",
    fromCondition: "new",
    toCondition: "quarantine",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-003"], // QCM inspector
    notes: "QCM quarantine hold: lot MS-SUSPECT-001 received without CoC. Cannot verify manufacturer traceability. Awaiting vendor response.",
    createdAt: now - 5 * DAY,
  });

  // PT6A fuel nozzle sent to vendor for overhaul
  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[10], // PT6A Fuel Nozzle
    eventType: "sent_to_vendor",
    vendorId: vendorIds[1], // StandardAero
    workOrderId: closedWOIds[3], // King Air AD compliance WO
    fromCondition: "unserviceable",
    toCondition: "serviceable",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-005"],
    notes: "Removed unserviceable FCU sent to StandardAero for overhaul. Exchange unit installed.",
    createdAt: now - 76 * DAY,
  });

  await ctx.db.insert("partHistory", {
    organizationId: orgId,
    partId: partIds[10],
    eventType: "received_from_vendor",
    vendorId: vendorIds[1],
    fromCondition: "unserviceable",
    toCondition: "serviceable",
    performedByUserId: ids.clerkUserId,
    performedByTechnicianId: techMap["CAMG-010"],
    notes: "Overhauled FCU returned from StandardAero with 8130-3. Added to rotable stock.",
    createdAt: now - 30 * DAY,
  });

  // ── 8. partsRequests (6 records) ──────────────────────────────────────────
  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: activeWOIds[0], // King Air B200 Phase 3
    technicianId: techMap["CAMG-005"],
    requestedBy: "David Kowalski",
    requestedAt: now - 4 * DAY,
    status: "received",
    partNumber: "3045001-01",
    quantity: 2,
    notes: "PT6A igniter plugs — both engines. Received and in QC.",
  });

  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: activeWOIds[0],
    technicianId: techMap["CAMG-007"],
    requestedBy: "Mike Patterson",
    requestedAt: now - 3 * DAY,
    status: "ordered",
    partNumber: "2890-12-1",
    quantity: 1,
    notes: "King Air fuel cap seal — ordered from Aviall. ETA 2 days.",
  });

  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: activeWOIds[1], // second active WO
    technicianId: techMap["CAMG-006"],
    requestedBy: "Sarah Nakamura",
    requestedAt: now - 2 * DAY,
    status: "pending",
    partNumber: "CH48108-1",
    quantity: 1,
    notes: "172S fuel filter for 100-hr service — check bin APA-GEN-A1-L1-02 first.",
  });

  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: activeWOIds[1],
    technicianId: techMap["CAMG-008"],
    requestedBy: "Priya Desai",
    requestedAt: now - 1 * DAY,
    status: "pending",
    partNumber: "REM37BYEB",
    quantity: 4,
    notes: "Lycoming 540 spark plugs — front cylinder bank. AOG — aircraft grounded for mag issue.",
  });

  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: activeWOIds[2],
    technicianId: techMap["CAMG-009"],
    requestedBy: "Carlos Mendez",
    requestedAt: now - 5 * DAY,
    status: "received",
    partNumber: "101-8002-1",
    quantity: 1,
    notes: "Main gear actuator seal kit — FNL aircraft. Received from Aviall.",
  });

  await ctx.db.insert("partsRequests", {
    organizationId: orgIdStr,
    workOrderId: closedWOIds[4],
    technicianId: techMap["CAMG-005"],
    requestedBy: "David Kowalski",
    requestedAt: now - 20 * DAY,
    status: "cancelled",
    partNumber: "3041600-01",
    quantity: 1,
    notes: "Exchange FCU — cancelled, found serviceable unit in rotable stock.",
  });

  // ── 9. inventoryCounts (2 records) ────────────────────────────────────────
  const count1Id = await ctx.db.insert("inventoryCounts", {
    organizationId: orgId,
    name: "Q1 2026 Annual Inventory — APA Stockroom",
    status: "reconciled",
    startedAt: now - 30 * DAY,
    completedAt: now - 28 * DAY,
    countedBy: techMap["CAMG-010"],
    notes: "Q1 physical count. 3 discrepancies found and resolved: 2 qty variances, 1 bin mislabeled.",
    createdAt: now - 32 * DAY,
  });

  const count2Id = await ctx.db.insert("inventoryCounts", {
    organizationId: orgId,
    name: "Spot Count — Filters & Consumables (APA-GEN-A1)",
    status: "completed",
    startedAt: now - 2 * DAY,
    completedAt: now - 1 * DAY,
    countedBy: techMap["CAMG-010"],
    notes: "Triggered by reorder threshold alert on oil filters. Verified stock levels.",
    createdAt: now - 3 * DAY,
  });

  // ── 10. inventoryCountItems (8 records) ───────────────────────────────────
  await ctx.db.insert("inventoryCountItems", {
    countId: count1Id,
    organizationId: orgId,
    partId: partIds[0], // Oil Filter
    partNumber: "CH48110-1",
    partName: "Oil Filter Element",
    expectedQuantity: 18,
    actualQuantity: 16,
    variance: -2,
    location: "APA-GEN-A1-L1-01",
    countedAt: now - 29 * DAY,
    notes: "Variance of -2: two filters issued to WO-2025-0810 not yet recorded in system at time of count.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count1Id,
    organizationId: orgId,
    partId: partIds[1], // Fuel Filter
    partNumber: "CH48108-1",
    partName: "Fuel Filter Element",
    expectedQuantity: 12,
    actualQuantity: 12,
    variance: 0,
    location: "APA-GEN-A1-L1-02",
    countedAt: now - 29 * DAY,
    notes: "Count matches system. No variance.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count1Id,
    organizationId: orgId,
    partId: partIds[3], // AeroShell 560
    partNumber: "AEROSHELL-560",
    partName: "AeroShell Turbine Oil 560",
    expectedQuantity: 28,
    actualQuantity: 26,
    variance: -2,
    location: "APA-GEN-A1-L2-02",
    countedAt: now - 29 * DAY,
    notes: "2-unit variance traced to King Air 250 annual — issued before system update. Reconciled.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count1Id,
    organizationId: orgId,
    partId: partIds[22], // Brake linings
    partNumber: "101-8100-2",
    partName: "Cleveland Brake Lining Set",
    expectedQuantity: 16,
    actualQuantity: 16,
    variance: 0,
    location: "FNL-GEN-A1-L1-01",
    countedAt: now - 28 * DAY,
    notes: "FNL count match.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count1Id,
    organizationId: orgId,
    partId: partIds[2], // Spark plugs
    partNumber: "REM37BYEB",
    partName: "Spark Plug — Massive Electrode",
    expectedQuantity: 24,
    actualQuantity: 24,
    variance: 0,
    location: "APA-GEN-A1-L2-01",
    countedAt: now - 29 * DAY,
    notes: "Count verified.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count2Id,
    organizationId: orgId,
    partId: partIds[0],
    partNumber: "CH48110-1",
    partName: "Oil Filter Element",
    expectedQuantity: 16,
    actualQuantity: 16,
    variance: 0,
    location: "APA-GEN-A1-L1-01",
    countedAt: now - 1 * DAY,
    notes: "Spot count matches. Reorder not yet required — threshold is 10.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count2Id,
    organizationId: orgId,
    partId: partIds[1],
    partNumber: "CH48108-1",
    partName: "Fuel Filter Element",
    expectedQuantity: 12,
    actualQuantity: 11,
    variance: -1,
    location: "APA-GEN-A1-L1-02",
    countedAt: now - 1 * DAY,
    notes: "Variance -1: one filter requested for active WO and not yet marked issued in system.",
  });

  await ctx.db.insert("inventoryCountItems", {
    countId: count2Id,
    organizationId: orgId,
    partId: partIds[3],
    partNumber: "AEROSHELL-560",
    partName: "AeroShell Turbine Oil 560",
    expectedQuantity: 26,
    actualQuantity: 26,
    variance: 0,
    location: "APA-GEN-A1-L2-02",
    countedAt: now - 1 * DAY,
    notes: "Stock confirmed.",
  });

  // ── 11. warrantyClaims (3 records) ────────────────────────────────────────
  await ctx.db.insert("warrantyClaims", {
    organizationId: orgId,
    claimNumber: "WC-2026-0001",
    workOrderId: closedWOIds[3], // King Air AD compliance
    partId: partIds[10], // PT6A Fuel Nozzle
    vendorId: vendorIds[1], // StandardAero
    claimType: "part_defect",
    status: "approved",
    description: "PT6A fuel nozzle S/N FN-7201 failed prematurely after 200 hours. Installed new unit meeting service life expectations of 1,200 hrs TBO. StandardAero confirmed manufacturing defect in spray pattern.",
    partNumber: "3040550-01",
    serialNumber: "FN-7201",
    claimedAmount: 1800.00,
    approvedAmount: 1800.00,
    resolution: "Full credit approved by StandardAero warranty department. Credit memo issued.",
    submittedAt: now - 75 * DAY,
    resolvedAt: now - 45 * DAY,
    notes: "Warranty claim filed same day as removal. StandardAero approved in 30 days.",
    createdAt: now - 75 * DAY,
  });

  await ctx.db.insert("warrantyClaims", {
    organizationId: orgId,
    claimNumber: "WC-2026-0002",
    partId: partIds[5], // GTN 750Xi
    vendorId: vendorIds[2], // Garmin
    claimType: "oem_warranty",
    status: "submitted",
    description: "GTN 750Xi S/N 0MGTG60055 displays intermittent GPS signal loss after firmware update. Customer reports screen blanking during IFR approach. Under OEM 2-year warranty.",
    partNumber: "011-02261-00",
    serialNumber: "0MGTG60055",
    claimedAmount: 0,
    submittedAt: now - 3 * DAY,
    notes: "Awaiting Garmin tech support case # and pre-authorization for swap unit.",
    createdAt: now - 3 * DAY,
  });

  await ctx.db.insert("warrantyClaims", {
    organizationId: orgId,
    claimNumber: "WC-2026-0003",
    workOrderId: closedWOIds[2], // 182T brake overhaul
    partId: partIds[20], // Brake disc
    vendorId: vendorIds[4], // Cleveland Wheels
    claimType: "vendor_warranty",
    status: "denied",
    description: "Cleveland brake disc assembly BD-3301 showed accelerated wear after 40 flight hours. Customer claims disc was defective from factory.",
    partNumber: "101-3200-5",
    serialNumber: "BD-3301",
    claimedAmount: 320.00,
    approvedAmount: 0,
    resolution: "Cleveland denied claim — inspection report indicates normal wear consistent with customer-reported hard landings. No manufacturing defect found.",
    submittedAt: now - 50 * DAY,
    resolvedAt: now - 20 * DAY,
    notes: "Closed. No credit. Discussed brake wear expectations with customer.",
    createdAt: now - 50 * DAY,
  });

  // ── 12. coreTracking (3 records) ──────────────────────────────────────────
  await ctx.db.insert("coreTracking", {
    organizationId: orgId,
    coreNumber: "CORE-2026-001",
    partId: partIds[14], // PT6A FCU Assembly
    partNumber: "3041600-01",
    serialNumber: "FCU-0882",
    description: "PT6A-60A Fuel Control Unit — removed unserviceable during King Air annual. Exchange unit installed.",
    status: "credit_issued",
    vendorId: vendorIds[1], // StandardAero
    workOrderId: closedWOIds[5], // King Air 250 annual
    coreValue: 8500.00,
    creditAmount: 7650.00,
    returnDueDate: now - 15 * DAY, // already past due and resolved
    returnedAt: now - 30 * DAY,
    inspectedAt: now - 22 * DAY,
    creditIssuedAt: now - 18 * DAY,
    notes: "Core accepted by StandardAero. 10% deduction for leaking P1 fitting. Credit applied to open account.",
    createdAt: now - 53 * DAY,
  });

  await ctx.db.insert("coreTracking", {
    organizationId: orgId,
    coreNumber: "CORE-2026-002",
    partId: partIds[10], // PT6A Fuel Nozzle
    partNumber: "3040550-01",
    serialNumber: "FN-7201",
    description: "PT6A fuel nozzle — removed under warranty claim WC-2026-0001. Core returned to StandardAero.",
    status: "received",
    vendorId: vendorIds[1],
    workOrderId: closedWOIds[3],
    coreValue: 1800.00,
    creditAmount: 1800.00, // full credit per warranty approval
    returnDueDate: now - 40 * DAY,
    returnedAt: now - 60 * DAY,
    inspectedAt: now - 40 * DAY,
    notes: "Full core credit included in warranty resolution.",
    createdAt: now - 76 * DAY,
  });

  await ctx.db.insert("coreTracking", {
    organizationId: orgId,
    coreNumber: "CORE-2026-003",
    partId: partIds[19], // Hartzell prop assembly
    partNumber: "HC-E4N-3D",
    serialNumber: "HC-E4N-3D-5512",
    description: "Hartzell composite propeller hub assembly — removed during propeller overhaul. Core owed to Hartzell.",
    status: "awaiting_return",
    vendorId: vendorIds[3], // Hartzell
    workOrderId: activeWOIds[0],
    coreValue: 4200.00,
    returnDueDate: now + 45 * DAY,
    notes: "Core due back to Hartzell within 60 days of exchange install. Coordinate shipping with Amanda.",
    createdAt: now - 7 * DAY,
  });

  // ── 13. otcSales (2 records) + otcSaleItems (4 records) ──────────────────
  const sale1Id = await ctx.db.insert("otcSales", {
    organizationId: orgId,
    receiptNumber: "OTC-2026-0041",
    customerName: "Jim Whitmore",
    subtotal: 87.50,
    taxRate: 0.029, // Colorado state tax 2.9%
    taxAmount: 2.54,
    total: 90.04,
    paymentMethod: "card",
    notes: "Walk-in owner-mechanic — building RV-10. Purchased hardware and spark plugs.",
    status: "completed",
    createdAt: now - 3 * DAY,
  });

  await ctx.db.insert("otcSaleItems", {
    otcSaleId: sale1Id,
    organizationId: orgId,
    partId: partIds[2], // Spark plugs
    description: "Champion REM37BYEB Spark Plug",
    partNumber: "REM37BYEB",
    quantity: 2,
    unitPrice: 28.75,
    lineTotal: 57.50,
    createdAt: now - 3 * DAY,
  });

  await ctx.db.insert("otcSaleItems", {
    otcSaleId: sale1Id,
    organizationId: orgId,
    partId: partIds[7], // AN hardware
    description: "AN3 Bolt Assortment Pack",
    partNumber: "AN3-ASSORTMENT",
    quantity: 1,
    unitPrice: 30.00,
    lineTotal: 30.00,
    createdAt: now - 3 * DAY,
  });

  const sale2Id = await ctx.db.insert("otcSales", {
    organizationId: orgId,
    receiptNumber: "OTC-2026-0042",
    customerName: "Front Range Aero Club",
    subtotal: 168.00,
    taxRate: 0.029,
    taxAmount: 4.87,
    total: 172.87,
    paymentMethod: "account",
    notes: "Aero club account purchase — picked up oil for 172 fleet self-service. Net 30.",
    status: "completed",
    createdAt: now - 1 * DAY,
  });

  await ctx.db.insert("otcSaleItems", {
    otcSaleId: sale2Id,
    organizationId: orgId,
    partId: partIds[4], // Phillips 20W-50
    description: "Phillips X/C 20W-50 Aviation Oil (qt)",
    partNumber: "PHILLIPS-20W50",
    quantity: 6,
    unitPrice: 14.00,
    lineTotal: 84.00,
    createdAt: now - 1 * DAY,
  });

  await ctx.db.insert("otcSaleItems", {
    otcSaleId: sale2Id,
    organizationId: orgId,
    partId: partIds[0], // Oil filters
    description: "Champion CH48110-1 Oil Filter",
    partNumber: "CH48110-1",
    quantity: 4,
    unitPrice: 21.00,
    lineTotal: 84.00,
    createdAt: now - 1 * DAY,
  });

  // Suppress unused lot IDs to avoid TypeScript warnings
  void lot4Id;
  void lot6Id;
  void binApaReceiving2Id;
  void slApaC1S2Id;
  void slApaB1L2Id;
  void slApaA2L1Id;
  void slApaA2L2Id;
  void areaApaHazmatId;
}

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 6: TRAINING & OJT
// ══════════════════════════════════════════════════════════════════════════════

export async function seedWave6(ctx: MutationCtx, ids: SeedIds) {
  const { orgId, now, DAY, techMap } = ids;
  const orgIdStr = orgId as unknown as string;

  // ── 1. technicianTraining (8 records) ─────────────────────────────────────
  // James Harwick (CAMG-001, admin) — multiple currency items
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-001"],
    organizationId: orgIdStr,
    trainingType: "91.411",
    completedAt: now - 180 * DAY,
    expiresAt: now + 545 * DAY, // ~18 months from completion
    certificateRef: "CERT-411-HRW-2025-09",
    createdAt: now - 180 * DAY,
  });

  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-001"],
    organizationId: orgIdStr,
    trainingType: "91.413",
    completedAt: now - 180 * DAY,
    expiresAt: now + 545 * DAY,
    certificateRef: "CERT-413-HRW-2025-09",
    createdAt: now - 180 * DAY,
  });

  // Maria Santos (CAMG-002, shop_manager) — shop management & safety training
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-002"],
    organizationId: orgIdStr,
    trainingType: "hazmat_awareness",
    completedAt: now - 90 * DAY,
    expiresAt: now + 275 * DAY, // 1-year recurrency
    certificateRef: "CERT-HAZMAT-SNT-2025-12",
    createdAt: now - 90 * DAY,
  });

  // Robert Chen (CAMG-003, QCM inspector) — inspection authorization training
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-003"],
    organizationId: orgIdStr,
    trainingType: "borescope",
    completedAt: now - 365 * DAY,
    certificateRef: "CERT-BORE-CHN-2025-03",
    createdAt: now - 365 * DAY,
  });

  // David Kowalski (CAMG-005, lead_tech) — turbine currency
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-005"],
    organizationId: orgIdStr,
    trainingType: "pt6a_type_training",
    completedAt: now - 200 * DAY,
    certificateRef: "CERT-PT6A-KWL-2025-09",
    createdAt: now - 200 * DAY,
  });

  // Sarah Nakamura (CAMG-006, lead_tech FNL) — NDT currency
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-006"],
    organizationId: orgIdStr,
    trainingType: "ndt",
    completedAt: now - 120 * DAY,
    expiresAt: now + 245 * DAY,
    certificateRef: "CERT-NDT-NKM-2025-11",
    createdAt: now - 120 * DAY,
  });

  // Priya Desai (CAMG-008, tech) — avionics specific
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-008"],
    organizationId: orgIdStr,
    trainingType: "garmin_gtn_installation",
    completedAt: now - 60 * DAY,
    expiresAt: now + 1095 * DAY, // 3-year Garmin cert
    certificateRef: "CERT-GTN-DSA-2026-01",
    createdAt: now - 60 * DAY,
  });

  // Carlos Mendez (CAMG-009, tech FNL) — 91.411 expiring soon
  await ctx.db.insert("technicianTraining", {
    technicianId: techMap["CAMG-009"],
    organizationId: orgIdStr,
    trainingType: "91.411",
    completedAt: now - 530 * DAY,
    expiresAt: now + 15 * DAY, // EXPIRING SOON — triggers alert
    certificateRef: "CERT-411-MDZ-2024-10",
    createdAt: now - 530 * DAY,
  });

  // ── 2. qualificationRequirements (4 records) ──────────────────────────────
  await ctx.db.insert("qualificationRequirements", {
    organizationId: orgId,
    name: "IFR Pitot-Static & Transponder Currency",
    description: "Required for all A&P mechanics who perform or supervise 91.411/91.413 tests. Must be current within 18 months per CAMG RSM Chapter 4.",
    requiredCourses: ["91.411", "91.413"],
    recurrencyMonths: 18,
    applicableRoles: ["lead_technician", "qcm_inspector", "admin"],
    createdAt: now - 365 * DAY,
  });

  await ctx.db.insert("qualificationRequirements", {
    organizationId: orgId,
    name: "HAZMAT Initial & Recurrent",
    description: "Annual HAZMAT awareness training required per 49 CFR 172.700 for all personnel who handle hazardous materials.",
    requiredCourses: ["hazmat_awareness", "hazmat_shipping"],
    recurrencyMonths: 12,
    applicableRoles: ["admin", "shop_manager", "lead_technician", "technician", "parts_clerk"],
    createdAt: now - 365 * DAY,
  });

  await ctx.db.insert("qualificationRequirements", {
    organizationId: orgId,
    name: "PT6A Turboprop Type Training",
    description: "P&W Canada PT6A series OEM type training required for technicians assigned to King Air and TBM work orders. Recommend renewal every 5 years.",
    requiredCourses: ["pt6a_type_training"],
    recurrencyMonths: 60,
    applicableRoles: ["lead_technician", "technician"],
    createdAt: now - 365 * DAY,
  });

  await ctx.db.insert("qualificationRequirements", {
    organizationId: orgId,
    name: "Garmin Avionics Installation Authorization",
    description: "Garmin authorized installer certification required before performing GTN/GFC installation or software updates on customer aircraft.",
    requiredCourses: ["garmin_gtn_installation", "garmin_gfc500_installation"],
    recurrencyMonths: 36,
    applicableRoles: ["technician", "lead_technician"],
    createdAt: now - 180 * DAY,
  });

  // ── 3. ojtCurricula (2 records) ───────────────────────────────────────────
  const curriculumKingAirId = await ctx.db.insert("ojtCurricula", {
    organizationId: orgIdStr,
    aircraftType: "King Air B200",
    name: "King Air B200 (PT6A-42) OJT Curriculum",
    description: "Comprehensive OJT curriculum for Beechcraft King Air B200 with PT6A-42 engines. Covers airframe, powerplant, avionics, and inspection procedures per CAMG RSM and AMM Rev 2.1.",
    isActive: true,
    createdByTechnicianId: techMap["CAMG-001"],
    signOffModel: "repetition_5col",
    version: "2.1",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const curriculumCessnaId = await ctx.db.insert("ojtCurricula", {
    organizationId: orgIdStr,
    aircraftType: "Cessna 172S",
    name: "Cessna 172S (IO-360-L2A) OJT Curriculum",
    description: "Entry-level OJT curriculum for Cessna 172S with Lycoming IO-360. Ideal for new hire A&P mechanics transitioning from general practice to fleet support.",
    isActive: true,
    createdByTechnicianId: techMap["CAMG-002"],
    signOffModel: "progression_4stage",
    version: "1.4",
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 4. ojtCurriculumSections (6 records) ──────────────────────────────────
  const sectionKAInitialId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    name: "Initial Training",
    description: "Ground school, aircraft familiarization, and documentation review",
    displayOrder: 1,
    sectionType: "standard",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const sectionKABasicId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    name: "Basic Airframe Tasks",
    description: "Routine airframe maintenance: servicing, panels, landing gear, and flight controls",
    displayOrder: 2,
    sectionType: "standard",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const sectionKAEngineId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    name: "PT6A Powerplant",
    description: "PT6A-42 engine servicing, troubleshooting, and removal/installation",
    displayOrder: 3,
    sectionType: "standard",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const sectionKAAuthId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    name: "Special Authorizations",
    description: "Binary capability authorizations: engine run, aircraft towing, ground power connection",
    displayOrder: 4,
    sectionType: "authorization",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const sectionC172InitialId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    name: "Initial Familiarization",
    description: "172S aircraft documents, systems overview, and routine servicing",
    displayOrder: 1,
    sectionType: "standard",
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const sectionC172EngineId = await ctx.db.insert("ojtCurriculumSections", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    name: "IO-360 Engine Tasks",
    description: "Lycoming IO-360 oil changes, mag timing, fuel injector cleaning, and compression checks",
    displayOrder: 2,
    sectionType: "standard",
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 5. ojtTasks (12 records) ──────────────────────────────────────────────
  // King Air Initial section tasks
  const taskKAFamiliarizationId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAInitialId,
    ataChapter: "GEN",
    description: "Review aircraft maintenance manuals, ICA, and applicable SBs/ADs for King Air B200",
    approvedDataRef: "B200 AMM Chapter 00-00, CAMG RSM §4.3",
    isSharedAcrossTypes: false,
    estimatedMinutes: 240,
    displayOrder: 1,
    proficiencyTier: "initial",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const taskKADocumentationId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAInitialId,
    ataChapter: "GEN",
    description: "Complete a maintenance record entry under 14 CFR 43.9 for a King Air squawk",
    approvedDataRef: "14 CFR 43.9, CAMG RSM §5.1",
    isSharedAcrossTypes: true,
    estimatedMinutes: 60,
    displayOrder: 2,
    proficiencyTier: "initial",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // King Air Basic Airframe tasks
  const taskKALandingGearId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKABasicId,
    ataChapter: "32",
    description: "Perform main and nose gear retraction and extension test using ground power and hydraulics",
    approvedDataRef: "B200 AMM 32-10-01",
    isSharedAcrossTypes: false,
    estimatedMinutes: 90,
    displayOrder: 1,
    proficiencyTier: "basic",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const taskKAFlightControlsId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKABasicId,
    ataChapter: "27",
    description: "Rig and rigging check aileron, elevator, and rudder flight controls per AMM limits",
    approvedDataRef: "B200 AMM 27-10-01 through 27-30-01",
    isSharedAcrossTypes: false,
    estimatedMinutes: 120,
    displayOrder: 2,
    proficiencyTier: "basic",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // King Air Engine tasks
  const taskKAPT6AOilServiceId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAEngineId,
    ataChapter: "71",
    description: "Perform PT6A-42 engine oil service: drain, filter change, fill, and leak check",
    approvedDataRef: "P&WC PT6A-42 MM 72-00-00, B200 AMM 72-00-00",
    isSharedAcrossTypes: false,
    estimatedMinutes: 45,
    displayOrder: 1,
    proficiencyTier: "basic",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const taskKAPT6AHotSectionId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAEngineId,
    ataChapter: "72",
    description: "Conduct hot section borescope inspection and document findings per P&WC limits",
    approvedDataRef: "P&WC PT6A-42 MM 72-30-00",
    isSharedAcrossTypes: false,
    estimatedMinutes: 120,
    displayOrder: 2,
    proficiencyTier: "intermediate",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  const taskKAEngineRunId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAEngineId,
    ataChapter: "71",
    description: "Perform engine run-up: start checklist, power checks, ITT/Ng/Np monitoring, shutdown per AFM",
    approvedDataRef: "B200 AFM Section 4, CAMG RSM §8.2 (engine run authorization required)",
    isSharedAcrossTypes: false,
    estimatedMinutes: 60,
    displayOrder: 3,
    proficiencyTier: "advanced",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // King Air Authorization section tasks
  const taskKATowingId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumKingAirId,
    sectionId: sectionKAAuthId,
    ataChapter: "09",
    description: "Aircraft towing: towbar attachment, nose gear limits, marshalling signals, and tie-down",
    approvedDataRef: "B200 AMM 09-10-00",
    isSharedAcrossTypes: true,
    estimatedMinutes: 30,
    displayOrder: 1,
    proficiencyTier: "basic",
    requiredSignOffs: 5,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // Cessna 172S Initial section
  const taskC172ServicingId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    sectionId: sectionC172InitialId,
    ataChapter: "12",
    description: "Perform 172S scheduled servicing: oil check/service, tire inflation, fuel sumping, and brake fluid check",
    approvedDataRef: "Cessna 172S Maintenance Manual 12-10-00",
    isSharedAcrossTypes: false,
    estimatedMinutes: 30,
    displayOrder: 1,
    proficiencyTier: "initial",
    requiredSignOffs: 4,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const taskC172SquawkId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    sectionId: sectionC172InitialId,
    ataChapter: "GEN",
    description: "Write up squawk and maintenance entry for a 172S defect — correct format, ref data, and signature",
    approvedDataRef: "14 CFR 43.9, 14 CFR 43.11, CAMG RSM §5",
    isSharedAcrossTypes: true,
    estimatedMinutes: 45,
    displayOrder: 2,
    proficiencyTier: "initial",
    requiredSignOffs: 4,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // Cessna 172S Engine section
  const taskC172OilChangeId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    sectionId: sectionC172EngineId,
    ataChapter: "79",
    description: "Perform Lycoming IO-360 oil change: drain, filter remove/replace, fill to capacity, run-up, leak check",
    approvedDataRef: "Lycoming IO-360 Overhaul Manual, Cessna 172S MM 79-10-00",
    isSharedAcrossTypes: false,
    estimatedMinutes: 60,
    displayOrder: 1,
    proficiencyTier: "basic",
    requiredSignOffs: 4,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  const taskC172MagTimingId = await ctx.db.insert("ojtTasks", {
    organizationId: orgIdStr,
    curriculumId: curriculumCessnaId,
    sectionId: sectionC172EngineId,
    ataChapter: "74",
    description: "Check and set magneto timing (internal and external) per Lycoming SI 1418C",
    approvedDataRef: "Lycoming SI 1418C, Cessna 172S MM 74-10-00",
    isSharedAcrossTypes: false,
    estimatedMinutes: 90,
    displayOrder: 2,
    proficiencyTier: "intermediate",
    requiredSignOffs: 4,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 6. ojtJackets (3 records) ─────────────────────────────────────────────
  // Mike Patterson (CAMG-007) — King Air jacket in progress
  const jacketPatersonKAId = await ctx.db.insert("ojtJackets", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-007"],
    curriculumId: curriculumKingAirId,
    status: "in_progress",
    startedAt: now - 180 * DAY,
    notes: "Mike transitioning from piston to turboprop work. Good progress on initial and basic sections.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 7 * DAY,
  });

  // Priya Desai (CAMG-008) — Cessna 172S jacket fully qualified
  const jacketDesaiCessnaId = await ctx.db.insert("ojtJackets", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-008"],
    curriculumId: curriculumCessnaId,
    status: "fully_qualified",
    startedAt: now - 730 * DAY,
    qualifiedAt: now - 365 * DAY,
    notes: "Priya completed all 172S tasks ahead of schedule. Recommended for King Air curriculum next cycle.",
    createdAt: now - 730 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // Carlos Mendez (CAMG-009) — Cessna 172S jacket in progress at FNL
  const jacketMendezCessnaId = await ctx.db.insert("ojtJackets", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-009"],
    curriculumId: curriculumCessnaId,
    status: "in_progress",
    startedAt: now - 90 * DAY,
    notes: "Carlos enrolled at FNL. Working through initial section with Sarah Nakamura as trainer.",
    createdAt: now - 90 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // ── 7. ojtStageEvents (12 records) ────────────────────────────────────────
  // Mike Patterson (CAMG-007) — King Air stages across multiple tasks
  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    taskId: taskKAFamiliarizationId,
    technicianId: techMap["CAMG-007"],
    stage: "instructor_completion",
    trainerId: techMap["CAMG-005"], // David Kowalski
    trainerCertificateSnapshot: "A&P #3241987 — David Kowalski",
    trainingMethod: "classroom",
    actualMinutes: 260,
    columnNumber: 1,
    techSignedAt: now - 179 * DAY,
    trainerSignedAt: now - 179 * DAY,
    notes: "Ground school session 1 — AMM review and aircraft systems orientation.",
    createdAt: now - 179 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    taskId: taskKAFamiliarizationId,
    technicianId: techMap["CAMG-007"],
    stage: "instructor_completion",
    trainerId: techMap["CAMG-001"], // James Harwick
    trainerCertificateSnapshot: "A&P/IA #2108845 — James Harwick",
    trainingMethod: "classroom",
    actualMinutes: 240,
    columnNumber: 2,
    techSignedAt: now - 170 * DAY,
    trainerSignedAt: now - 170 * DAY,
    notes: "Regulatory review session — 14 CFR Part 43 and maintenance record requirements.",
    createdAt: now - 170 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    taskId: taskKADocumentationId,
    technicianId: techMap["CAMG-007"],
    stage: "instructor_completion",
    trainerId: techMap["CAMG-003"], // Robert Chen (QCM)
    trainerCertificateSnapshot: "A&P/IA #3109234 — Robert Chen",
    trainingMethod: "hands-on",
    actualMinutes: 75,
    columnNumber: 1,
    techSignedAt: now - 165 * DAY,
    trainerSignedAt: now - 165 * DAY,
    notes: "Mike wrote up WO-2025-0801 squawk entries. Format and regulatory content reviewed by QCM.",
    createdAt: now - 165 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    taskId: taskKALandingGearId,
    technicianId: techMap["CAMG-007"],
    stage: "instructor_completion",
    trainerId: techMap["CAMG-005"],
    trainerCertificateSnapshot: "A&P #3241987 — David Kowalski",
    trainingMethod: "hands-on",
    actualMinutes: 95,
    columnNumber: 1,
    techSignedAt: now - 120 * DAY,
    trainerSignedAt: now - 120 * DAY,
    notes: "Gear swing on N722KA — Mike performed all steps under David's direct supervision.",
    createdAt: now - 120 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    taskId: taskKAPT6AOilServiceId,
    technicianId: techMap["CAMG-007"],
    stage: "instructor_completion",
    trainerId: techMap["CAMG-005"],
    trainerCertificateSnapshot: "A&P #3241987 — David Kowalski",
    trainingMethod: "hands-on",
    actualMinutes: 50,
    columnNumber: 1,
    techSignedAt: now - 60 * DAY,
    trainerSignedAt: now - 60 * DAY,
    notes: "Left engine oil service — WO-2026-0101. First PT6 oil change for Mike.",
    createdAt: now - 60 * DAY,
  });

  // Priya Desai (CAMG-008) — completed 172S curriculum events
  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketDesaiCessnaId,
    taskId: taskC172ServicingId,
    technicianId: techMap["CAMG-008"],
    stage: "observe",
    trainerId: techMap["CAMG-006"], // Sarah Nakamura
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "hands-on",
    actualMinutes: 35,
    techSignedAt: now - 720 * DAY,
    trainerSignedAt: now - 720 * DAY,
    notes: "Observation stage — 100-hr service on N12345.",
    createdAt: now - 720 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketDesaiCessnaId,
    taskId: taskC172OilChangeId,
    technicianId: techMap["CAMG-008"],
    stage: "evaluated",
    trainerId: techMap["CAMG-001"], // James Harwick signed off
    trainerCertificateSnapshot: "A&P/IA #2108845 — James Harwick",
    trainingMethod: "hands-on",
    actualMinutes: 55,
    techSignedAt: now - 400 * DAY,
    trainerSignedAt: now - 400 * DAY,
    notes: "Final evaluation — Priya performed IO-360 oil change independently. Performance satisfactory.",
    createdAt: now - 400 * DAY,
  });

  // Carlos Mendez (CAMG-009) — in-progress 172S stages
  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketMendezCessnaId,
    taskId: taskC172ServicingId,
    technicianId: techMap["CAMG-009"],
    stage: "observe",
    trainerId: techMap["CAMG-006"],
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "hands-on",
    actualMinutes: 30,
    techSignedAt: now - 88 * DAY,
    trainerSignedAt: now - 88 * DAY,
    notes: "Carlos observed 100-hr service at FNL.",
    createdAt: now - 88 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketMendezCessnaId,
    taskId: taskC172ServicingId,
    technicianId: techMap["CAMG-009"],
    stage: "assist",
    trainerId: techMap["CAMG-006"],
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "hands-on",
    actualMinutes: 35,
    techSignedAt: now - 60 * DAY,
    trainerSignedAt: now - 60 * DAY,
    notes: "Assisted with full service — Carlos performed oil service items, Sarah handled fuel system.",
    createdAt: now - 60 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketMendezCessnaId,
    taskId: taskC172SquawkId,
    technicianId: techMap["CAMG-009"],
    stage: "observe",
    trainerId: techMap["CAMG-006"],
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "classroom",
    actualMinutes: 45,
    techSignedAt: now - 45 * DAY,
    trainerSignedAt: now - 45 * DAY,
    notes: "Documentation review session — Carlos reviewed completed CAMG squawk entries.",
    createdAt: now - 45 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketMendezCessnaId,
    taskId: taskC172OilChangeId,
    technicianId: techMap["CAMG-009"],
    stage: "observe",
    trainerId: techMap["CAMG-006"],
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "hands-on",
    actualMinutes: 60,
    techSignedAt: now - 20 * DAY,
    trainerSignedAt: now - 20 * DAY,
    notes: "Observed complete IO-360 oil change at FNL.",
    createdAt: now - 20 * DAY,
  });

  await ctx.db.insert("ojtStageEvents", {
    organizationId: orgIdStr,
    jacketId: jacketMendezCessnaId,
    taskId: taskC172OilChangeId,
    technicianId: techMap["CAMG-009"],
    stage: "assist",
    trainerId: techMap["CAMG-006"],
    trainerCertificateSnapshot: "A&P #4412098 — Sarah Nakamura",
    trainingMethod: "hands-on",
    actualMinutes: 65,
    techSignedAt: now - 5 * DAY,
    trainerSignedAt: now - 5 * DAY,
    notes: "Carlos performed oil drain, filter change, and fill. Sarah monitored.",
    createdAt: now - 5 * DAY,
  });

  // ── 8. ojtTrainerAuthorizations (3 records) ───────────────────────────────
  await ctx.db.insert("ojtTrainerAuthorizations", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-005"], // David Kowalski authorized to train King Air
    scope: "curriculum",
    scopeRefId: curriculumKingAirId,
    grantedByTechnicianId: techMap["CAMG-001"], // James Harwick granted
    grantedAt: now - 730 * DAY,
    notes: "David is the primary King Air OJT trainer. Authorized for all King Air B200 curriculum tasks.",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  await ctx.db.insert("ojtTrainerAuthorizations", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-006"], // Sarah Nakamura — Cessna at FNL
    scope: "curriculum",
    scopeRefId: curriculumCessnaId,
    grantedByTechnicianId: techMap["CAMG-001"],
    grantedAt: now - 365 * DAY,
    notes: "Sarah authorized for full 172S curriculum training at FNL. Primary trainer for FNL new hires.",
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  await ctx.db.insert("ojtTrainerAuthorizations", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-003"], // Robert Chen (QCM) — documentation and regulatory tasks
    scope: "section",
    scopeRefId: sectionKAInitialId,
    grantedByTechnicianId: techMap["CAMG-001"],
    grantedAt: now - 365 * DAY,
    notes: "Robert authorized for King Air initial section training (documentation & regulatory compliance only).",
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // ── 9. ojtTrainingGoals (3 records) ───────────────────────────────────────
  const quarterStart = now - 30 * DAY; // current quarter start approximation
  const quarterEnd = now + 60 * DAY;

  await ctx.db.insert("ojtTrainingGoals", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-007"], // Mike Patterson
    setByTechnicianId: techMap["CAMG-005"], // David Kowalski
    period: "quarterly",
    periodStart: quarterStart,
    periodEnd: quarterEnd,
    targetType: "stages_completed",
    targetValue: 10,
    actualValue: 5, // in progress
    status: "active",
    notes: "Q1 goal: complete 10 sign-off stages across King Air curriculum. Mike is on track — 5 completed.",
    createdAt: now - 30 * DAY,
    updatedAt: now - 5 * DAY,
  });

  await ctx.db.insert("ojtTrainingGoals", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-009"], // Carlos Mendez
    setByTechnicianId: techMap["CAMG-006"], // Sarah Nakamura
    period: "monthly",
    periodStart: now - 30 * DAY,
    periodEnd: now,
    targetType: "tasks_completed",
    targetValue: 3,
    actualValue: 2,
    status: "missed",
    notes: "March goal missed by 1 task. Carlos was out 5 days for personal leave. Continue to April.",
    createdAt: now - 30 * DAY,
    updatedAt: now,
  });

  await ctx.db.insert("ojtTrainingGoals", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-007"],
    setByTechnicianId: techMap["CAMG-005"],
    period: "monthly",
    periodStart: now - 30 * DAY,
    periodEnd: now,
    targetType: "hours_trained",
    targetValue: 16,
    actualValue: 18,
    status: "completed",
    notes: "Exceeded March hours goal. Mike logged 18 training hours including two King Air oil services.",
    createdAt: now - 30 * DAY,
    updatedAt: now,
  });

  // ── 10. ojtAuthorizations (4 records) ─────────────────────────────────────
  // King Air towing authorization for Mike — granted after demonstrating competency
  await ctx.db.insert("ojtAuthorizations", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    technicianId: techMap["CAMG-007"],
    curriculumId: curriculumKingAirId,
    capabilityKey: "aircraft_towing",
    capabilityLabel: "Aircraft Towing",
    displayOrder: 1,
    isGranted: true,
    grantedAt: now - 90 * DAY,
    grantedByTechnicianId: techMap["CAMG-001"],
    grantedByName: "James Harwick",
    notes: "Mike demonstrated safe towing procedure on King Air B200 under supervision of David Kowalski. Authorization granted.",
    createdAt: now - 90 * DAY,
    updatedAt: now - 90 * DAY,
  });

  // Engine run authorization NOT yet granted for Mike
  await ctx.db.insert("ojtAuthorizations", {
    organizationId: orgIdStr,
    jacketId: jacketPatersonKAId,
    technicianId: techMap["CAMG-007"],
    curriculumId: curriculumKingAirId,
    capabilityKey: "engine_run_pt6a",
    capabilityLabel: "PT6A Engine Run",
    displayOrder: 2,
    isGranted: false,
    notes: "Pending — Mike must complete engine run task (all 5 columns) before authorization can be granted.",
    createdAt: now - 180 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // Priya Desai — 172S full capability grants (fully qualified)
  await ctx.db.insert("ojtAuthorizations", {
    organizationId: orgIdStr,
    jacketId: jacketDesaiCessnaId,
    technicianId: techMap["CAMG-008"],
    curriculumId: curriculumCessnaId,
    capabilityKey: "aircraft_towing",
    capabilityLabel: "Aircraft Towing",
    displayOrder: 1,
    isGranted: true,
    grantedAt: now - 400 * DAY,
    grantedByTechnicianId: techMap["CAMG-001"],
    grantedByName: "James Harwick",
    notes: "Granted at 172S qualification completion.",
    createdAt: now - 400 * DAY,
    updatedAt: now - 400 * DAY,
  });

  await ctx.db.insert("ojtAuthorizations", {
    organizationId: orgIdStr,
    jacketId: jacketDesaiCessnaId,
    technicianId: techMap["CAMG-008"],
    curriculumId: curriculumCessnaId,
    capabilityKey: "ground_run_piston",
    capabilityLabel: "Piston Engine Ground Run",
    displayOrder: 2,
    isGranted: true,
    grantedAt: now - 365 * DAY,
    grantedByTechnicianId: techMap["CAMG-001"],
    grantedByName: "James Harwick",
    notes: "Priya demonstrated satisfactory engine run-up on Cessna 172S.",
    createdAt: now - 365 * DAY,
    updatedAt: now - 365 * DAY,
  });

  // ── 11. ojtEnrollmentRoster (6 records) ───────────────────────────────────
  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-001"], // James Harwick — management
    isEnrolledInOjt: false,
    hasOjtLogConverted: true,
    ojtLogVersion: "legacy",
    personnelCategory: "management",
    locationCode: "APA",
    createdAt: now - 730 * DAY,
    updatedAt: now - 365 * DAY,
  });

  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-003"], // Robert Chen — inspection
    isEnrolledInOjt: false,
    lastDigitalUpdate: now - 90 * DAY,
    hasOjtLogConverted: true,
    ojtLogVersion: "2.0",
    personnelCategory: "inspection",
    locationCode: "APA",
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-005"], // David Kowalski — lead_tech
    isEnrolledInOjt: false,
    lastDigitalUpdate: now - 60 * DAY,
    hasOjtLogConverted: true,
    ojtLogVersion: "2.1",
    personnelCategory: "mechanic",
    locationCode: "APA",
    createdAt: now - 730 * DAY,
    updatedAt: now - 60 * DAY,
  });

  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-007"], // Mike Patterson — enrolled
    isEnrolledInOjt: true,
    lastDigitalUpdate: now - 7 * DAY,
    hasOjtLogConverted: false,
    ojtLogVersion: "2.1",
    personnelCategory: "mechanic",
    locationCode: "APA",
    createdAt: now - 180 * DAY,
    updatedAt: now - 7 * DAY,
  });

  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-008"], // Priya Desai — qualified, now trainer candidate
    isEnrolledInOjt: false,
    lastDigitalUpdate: now - 365 * DAY,
    hasOjtLogConverted: true,
    ojtLogVersion: "1.4",
    personnelCategory: "avionics",
    locationCode: "APA",
    createdAt: now - 730 * DAY,
    updatedAt: now - 365 * DAY,
  });

  await ctx.db.insert("ojtEnrollmentRoster", {
    organizationId: orgIdStr,
    technicianId: techMap["CAMG-009"], // Carlos Mendez — enrolled at FNL
    isEnrolledInOjt: true,
    lastDigitalUpdate: now - 5 * DAY,
    hasOjtLogConverted: false,
    ojtLogVersion: "1.4",
    personnelCategory: "mechanic",
    locationCode: "FNL",
    createdAt: now - 90 * DAY,
    updatedAt: now - 5 * DAY,
  });

  // ── 12. maintenancePrograms (4 records) ───────────────────────────────────
  await ctx.db.insert("maintenancePrograms", {
    organizationId: orgIdStr,
    aircraftType: "King Air B200",
    serialNumberScope: "all",
    taskName: "Phase 1 Inspection — Powerplant & Fuel",
    ataChapter: "71",
    approvedDataRef: "Beechcraft B200 Maintenance Manual, Chapter 5 Phase Inspection Program",
    calendarIntervalDays: 365,
    hourInterval: 200,
    triggerLogic: "first",
    isPhaseInspection: true,
    phaseNumber: 1,
    estimatedLaborHours: 16,
    isActive: true,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  await ctx.db.insert("maintenancePrograms", {
    organizationId: orgIdStr,
    aircraftType: "King Air B200",
    serialNumberScope: "all",
    taskName: "Phase 2 Inspection — Airframe & Flight Controls",
    ataChapter: "27",
    approvedDataRef: "Beechcraft B200 Maintenance Manual, Chapter 5 Phase Inspection Program",
    calendarIntervalDays: 365,
    hourInterval: 200,
    triggerLogic: "first",
    isPhaseInspection: true,
    phaseNumber: 2,
    estimatedLaborHours: 14,
    isActive: true,
    createdAt: now - 730 * DAY,
    updatedAt: now - 90 * DAY,
  });

  await ctx.db.insert("maintenancePrograms", {
    organizationId: orgIdStr,
    aircraftType: "Cessna 172S",
    serialNumberScope: "all",
    taskName: "100-Hour/Annual Inspection",
    ataChapter: "INSP",
    approvedDataRef: "Cessna 172S Maintenance Manual, FAA Advisory Circular AC 43.13-1B",
    calendarIntervalDays: 365,
    hourInterval: 100,
    triggerLogic: "first",
    isPhaseInspection: false,
    estimatedLaborHours: 8,
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  await ctx.db.insert("maintenancePrograms", {
    organizationId: orgIdStr,
    aircraftType: "Cessna 172S",
    serialNumberScope: "all",
    taskName: "IFR Certification — Pitot-Static (91.411) & Transponder (91.413)",
    ataChapter: "34",
    approvedDataRef: "14 CFR 91.411, 14 CFR 91.413, FAR/AIM",
    calendarIntervalDays: 730, // 24 calendar months
    triggerLogic: "first",
    isPhaseInspection: false,
    estimatedLaborHours: 3,
    isActive: true,
    createdAt: now - 365 * DAY,
    updatedAt: now - 60 * DAY,
  });

  // Suppress unused task IDs to avoid TypeScript warnings
  void taskKAFlightControlsId;
  void taskKAPT6AHotSectionId;
  void taskKAEngineRunId;
  void taskKATowingId;
  void taskC172MagTimingId;
  void sectionKAAuthId;
}
