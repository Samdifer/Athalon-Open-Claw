// convex/seeds/_wave1_wave2.ts
// Wave 1: WO Operational Depth + Wave 2: WO Completion Records
// Wrapped from raw seed code into callable helper functions.

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface SeedIds {
  orgId: Id<"organizations">;
  clerkUserId: string;
  now: number;
  DAY: number;
  HOUR: number;
  MINUTE: number;
  techMap: Record<string, Id<"technicians">>;
  certNumbers: Record<string, string>;
  customerIds: Id<"customers">[];
  aircraftIds: Id<"aircraft">[];
  vendorIds: Id<"vendors">[];
  hangarBayIds: Id<"hangarBays">[];
  partIds: Id<"parts">[];
  closedWOIds: Id<"workOrders">[];
  activeWOIds: Id<"workOrders">[];
  locationMap: Record<string, Id<"shopLocations">>;
  aircraftTotalTimes: number[];
}

export async function seedWave1and2(ctx: MutationCtx, ids: SeedIds): Promise<void> {
  // Destructure for compatibility with raw seed code
  const {
    orgId, now, DAY, HOUR, MINUTE,
    techMap, certNumbers,
    aircraftIds, closedWOIds, activeWOIds, partIds,
    locationMap, aircraftTotalTimes,
  } = ids;
  const args = { clerkUserId: ids.clerkUserId };
  // Provide AIRCRAFT_SEED-compatible array for induction records
  const AIRCRAFT_SEED = aircraftTotalTimes.map((tt) => ({ tt }));

  // ══════════════════════════════════════════════════════════════════════════
  // WAVE 1: WO OPERATIONAL DEPTH
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. workOrderParts — 20 records ────────────────────────────────────────
  // Closed WO parts (8 records)
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[0], partId: partIds[0],
    partNumber: "CH48110-1", partName: "Oil Filter Element", status: "installed",
    quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 18.50, totalCost: 18.50, markupPercent: 50, billableAmount: 27.75,
    requestedAt: now - 88 * DAY, issuedAt: now - 87 * DAY, installedAt: now - 87 * DAY,
    notes: "Standard annual oil filter replacement",
    createdAt: now - 88 * DAY, updatedAt: now - 87 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[0], partId: partIds[1],
    partNumber: "CH48108-1", partName: "Fuel Filter Element", status: "installed",
    quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 22.00, totalCost: 22.00, markupPercent: 50, billableAmount: 33.00,
    requestedAt: now - 88 * DAY, issuedAt: now - 87 * DAY, installedAt: now - 87 * DAY,
    createdAt: now - 88 * DAY, updatedAt: now - 87 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[3], partId: partIds[18],
    partNumber: "101-8002-1", partName: "Main Gear Actuator Seal Kit", status: "installed",
    quantityRequested: 2, quantityIssued: 2, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 145.00, totalCost: 290.00, markupPercent: 25, billableAmount: 362.50,
    requestedAt: now - 78 * DAY, issuedAt: now - 77 * DAY, installedAt: now - 76 * DAY,
    notes: "Required by AD 2024-15-07 compliance task",
    createdAt: now - 78 * DAY, updatedAt: now - 76 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[3], partId: partIds[10],
    partNumber: "3040550-01", partName: "PT6A Fuel Nozzle", serialNumber: "FN-7201",
    status: "installed", quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 1800.00, totalCost: 1800.00, markupPercent: 15, billableAmount: 2070.00,
    requestedAt: now - 78 * DAY, orderedAt: now - 78 * DAY, receivedAt: now - 77 * DAY,
    issuedAt: now - 77 * DAY, installedAt: now - 76 * DAY,
    notes: "S/N FN-7201 — overhauled unit from stock",
    createdAt: now - 78 * DAY, updatedAt: now - 76 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[5], partId: partIds[3],
    partNumber: "AEROSHELL-560", partName: "AeroShell Turbine Oil 560", status: "installed",
    quantityRequested: 6, quantityIssued: 6, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 28.00, totalCost: 168.00, markupPercent: 35, billableAmount: 226.80,
    requestedAt: now - 58 * DAY, issuedAt: now - 57 * DAY, installedAt: now - 57 * DAY,
    createdAt: now - 58 * DAY, updatedAt: now - 57 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[5], partId: partIds[14],
    partNumber: "3041600-01", partName: "PT6A FCU Assembly", serialNumber: "FCU-1101",
    status: "installed", quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 8500.00, totalCost: 8500.00, markupPercent: 15, billableAmount: 9775.00,
    requestedAt: now - 58 * DAY, orderedAt: now - 58 * DAY, receivedAt: now - 55 * DAY,
    issuedAt: now - 54 * DAY, installedAt: now - 53 * DAY,
    notes: "Overhauled FCU — exchange unit from StandardAero",
    createdAt: now - 58 * DAY, updatedAt: now - 53 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[2], partId: partIds[20],
    partNumber: "101-3200-5", partName: "Brake Disc Assembly", serialNumber: "BD-3301",
    status: "installed", quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-008"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 320.00, totalCost: 320.00, markupPercent: 25, billableAmount: 400.00,
    requestedAt: now - 74 * DAY, issuedAt: now - 73 * DAY, installedAt: now - 73 * DAY,
    createdAt: now - 74 * DAY, updatedAt: now - 73 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[2], partId: partIds[22],
    partNumber: "101-8100-2", partName: "Cleveland Brake Lining Set", status: "installed",
    quantityRequested: 2, quantityIssued: 2, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-008"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 85.00, totalCost: 170.00, markupPercent: 50, billableAmount: 255.00,
    requestedAt: now - 74 * DAY, issuedAt: now - 73 * DAY, installedAt: now - 73 * DAY,
    createdAt: now - 74 * DAY, updatedAt: now - 73 * DAY,
  });

  // Active WO parts (8 records)
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[0], partId: partIds[3],
    partNumber: "AEROSHELL-560", partName: "AeroShell Turbine Oil 560", status: "issued",
    quantityRequested: 4, quantityIssued: 4, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 28.00, totalCost: 112.00, markupPercent: 35, billableAmount: 151.20,
    requestedAt: now - 5 * DAY, issuedAt: now - 4 * DAY,
    notes: "Phase 3 oil service",
    createdAt: now - 5 * DAY, updatedAt: now - 4 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[0], partId: partIds[12],
    partNumber: "3045001-01", partName: "PT6A Igniter Plug", serialNumber: "IP-4401",
    status: "received", quantityRequested: 2, quantityIssued: 0, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"], issuedByTechnicianId: undefined,
    unitCost: 425.00, totalCost: 850.00, markupPercent: 20, billableAmount: 1020.00,
    requestedAt: now - 5 * DAY, orderedAt: now - 5 * DAY, receivedAt: now - 2 * DAY,
    notes: "Awaiting QC incoming inspection before issue",
    createdAt: now - 5 * DAY, updatedAt: now - 2 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[1], partId: partIds[0],
    partNumber: "CH48110-1", partName: "Oil Filter Element", status: "installed",
    quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-008"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 18.50, totalCost: 18.50, markupPercent: 50, billableAmount: 27.75,
    requestedAt: now - 3 * DAY, issuedAt: now - 2 * DAY, installedAt: now - 2 * DAY,
    createdAt: now - 3 * DAY, updatedAt: now - 2 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[2], partId: partIds[1],
    partNumber: "CH48108-1", partName: "Fuel Filter Element", status: "installed",
    quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-009"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 22.00, totalCost: 22.00, markupPercent: 50, billableAmount: 33.00,
    requestedAt: now - 7 * DAY, issuedAt: now - 6 * DAY, installedAt: now - 5 * DAY,
    createdAt: now - 7 * DAY, updatedAt: now - 5 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[3], partId: partIds[4],
    partNumber: "SW-032-SS", partName: "Safety Wire .032 Stainless", status: "issued",
    quantityRequested: 2, quantityIssued: 2, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 14.00, totalCost: 28.00, markupPercent: 50, billableAmount: 42.00,
    requestedAt: now - 4 * DAY, issuedAt: now - 3 * DAY,
    createdAt: now - 4 * DAY, updatedAt: now - 3 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[4],
    partNumber: "LG-ACT-B200-001", partName: "Main Gear Actuator Assembly",
    status: "ordered", quantityRequested: 1, quantityIssued: 0, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"],
    unitCost: 4200.00, totalCost: 4200.00, markupPercent: 15, billableAmount: 4830.00,
    requestedAt: now - 6 * DAY, orderedAt: now - 4 * DAY,
    notes: "On order from Aviall — PO-2026-0015, ETA 3 days",
    createdAt: now - 6 * DAY, updatedAt: now - 4 * DAY,
  });
  // Additional closed WO parts
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[10], partId: partIds[12],
    partNumber: "3045001-01", partName: "PT6A Igniter Plug", serialNumber: "IP-4402",
    status: "installed", quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 425.00, totalCost: 425.00, markupPercent: 20, billableAmount: 510.00,
    requestedAt: now - 28 * DAY, issuedAt: now - 27 * DAY, installedAt: now - 27 * DAY,
    notes: "Replaced fouled igniter plug — resolved rough running squawk",
    createdAt: now - 28 * DAY, updatedAt: now - 27 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[13], partId: partIds[0],
    partNumber: "CH48110-1", partName: "Oil Filter Element", status: "returned",
    quantityRequested: 2, quantityIssued: 2, quantityReturned: 1,
    requestedByTechnicianId: techMap["CAMG-008"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 18.50, totalCost: 37.00, markupPercent: 50, billableAmount: 27.75,
    requestedAt: now - 16 * DAY, issuedAt: now - 15 * DAY, installedAt: now - 15 * DAY,
    returnedAt: now - 13 * DAY, notes: "1 of 2 returned to stock — only 1 needed",
    createdAt: now - 16 * DAY, updatedAt: now - 13 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[11],
    partNumber: "208-FUEL-SEL-001", partName: "Fuel Selector Valve Assembly",
    status: "installed", quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-009"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 1650.00, totalCost: 1650.00, markupPercent: 15, billableAmount: 1897.50,
    requestedAt: now - 23 * DAY, orderedAt: now - 23 * DAY, receivedAt: now - 21 * DAY,
    issuedAt: now - 20 * DAY, installedAt: now - 20 * DAY,
    notes: "AD 2024-18-03 compliance — fuel selector valve replacement",
    createdAt: now - 23 * DAY, updatedAt: now - 20 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: activeWOIds[5],
    partNumber: "PT6A-60A-FILTER-001", partName: "PT6A-60A Inlet Particle Separator",
    status: "requested", quantityRequested: 1, quantityIssued: 0, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-007"], requestedAt: now,
    notes: "Pending evaluation — may need replacement if screen is damaged",
    createdAt: now, updatedAt: now,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[7], partId: partIds[3],
    partNumber: "AEROSHELL-560", partName: "AeroShell Turbine Oil 560", status: "installed",
    quantityRequested: 3, quantityIssued: 3, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-008"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 28.00, totalCost: 84.00, markupPercent: 35, billableAmount: 113.40,
    requestedAt: now - 48 * DAY, issuedAt: now - 47 * DAY, installedAt: now - 47 * DAY,
    notes: "Engine oil service during trend monitoring visit",
    createdAt: now - 48 * DAY, updatedAt: now - 47 * DAY,
  });
  await ctx.db.insert("workOrderParts", {
    organizationId: orgId, workOrderId: closedWOIds[4], partId: partIds[35],
    partNumber: "101-4500-1", partName: "Cabin Pressure Valve", status: "installed",
    quantityRequested: 1, quantityIssued: 1, quantityReturned: 0,
    requestedByTechnicianId: techMap["CAMG-005"], issuedByTechnicianId: techMap["CAMG-010"],
    unitCost: 2800.00, totalCost: 2800.00, markupPercent: 15, billableAmount: 3220.00,
    requestedAt: now - 68 * DAY, orderedAt: now - 68 * DAY, receivedAt: now - 66 * DAY,
    issuedAt: now - 65 * DAY, installedAt: now - 65 * DAY,
    notes: "Root cause of TBM 940 pressurization squawk — cabin pressure valve replaced",
    createdAt: now - 68 * DAY, updatedAt: now - 65 * DAY,
  });

  // ── 2. taskAssignments — 15 records ─────────────────────────────────────
  const allTaskCards = await ctx.db
    .query("taskCards")
    .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
    .collect();
  const activeWOTaskCards = allTaskCards.filter((tc) =>
    activeWOIds.some((id) => id === tc.workOrderId)
  );
  const taskCardsByWO: Record<string, typeof allTaskCards> = {};
  for (const tc of activeWOTaskCards) {
    const woKey = tc.workOrderId as string;
    if (!taskCardsByWO[woKey]) taskCardsByWO[woKey] = [];
    taskCardsByWO[woKey].push(tc);
  }
  const wo0Cards = taskCardsByWO[activeWOIds[0] as string] ?? [];
  const wo1Cards = taskCardsByWO[activeWOIds[1] as string] ?? [];
  const wo2Cards = taskCardsByWO[activeWOIds[2] as string] ?? [];
  const wo3Cards = taskCardsByWO[activeWOIds[3] as string] ?? [];
  const wo4Cards = taskCardsByWO[activeWOIds[4] as string] ?? [];
  const wo5Cards = taskCardsByWO[activeWOIds[5] as string] ?? [];

  const orgIdStr = orgId as unknown as string;

  if (wo0Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[0], taskCardId: wo0Cards[0]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 5 * DAY + 7 * HOUR, scheduledEnd: now - 5 * DAY + 15 * HOUR, actualHoursLogged: 7.5, percentComplete: 100, status: "complete", createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY + 15 * HOUR });
  }
  if (wo0Cards[1]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[0], taskCardId: wo0Cards[1]._id, technicianId: techMap["CAMG-008"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 4 * DAY + 7 * HOUR, scheduledEnd: now - 4 * DAY + 15 * HOUR, actualHoursLogged: 8.0, percentComplete: 100, status: "complete", createdAt: now - 5 * DAY, updatedAt: now - 4 * DAY + 15 * HOUR });
  }
  if (wo0Cards[2]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[0], taskCardId: wo0Cards[2]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 3 * DAY + 7 * HOUR, scheduledEnd: now - 3 * DAY + 15 * HOUR, actualHoursLogged: 6.0, percentComplete: 100, status: "complete", createdAt: now - 5 * DAY, updatedAt: now - 3 * DAY + 15 * HOUR });
  }
  if (wo0Cards[3]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[0], taskCardId: wo0Cards[3]._id, technicianId: techMap["CAMG-005"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 1 * DAY + 7 * HOUR, scheduledEnd: now + 7 * HOUR, actualHoursLogged: 3.5, percentComplete: 45, status: "in_progress", createdAt: now - 5 * DAY, updatedAt: now });
  }
  if (wo0Cards[4]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[0], taskCardId: wo0Cards[4]._id, technicianId: techMap["CAMG-003"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now + DAY + 7 * HOUR, scheduledEnd: now + DAY + 12 * HOUR, percentComplete: 0, status: "scheduled", createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY });
  }
  if (wo1Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[1], taskCardId: wo1Cards[0]._id, technicianId: techMap["CAMG-008"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 3 * DAY + 7 * HOUR, scheduledEnd: now - 3 * DAY + 15 * HOUR, actualHoursLogged: 7.0, percentComplete: 100, status: "complete", createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY + 15 * HOUR });
  }
  if (wo1Cards[1]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[1], taskCardId: wo1Cards[1]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 1 * DAY + 7 * HOUR, scheduledEnd: now + 15 * HOUR, actualHoursLogged: 4.5, percentComplete: 60, status: "in_progress", createdAt: now - 3 * DAY, updatedAt: now });
  }
  if (wo1Cards[2]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[1], taskCardId: wo1Cards[2]._id, technicianId: techMap["CAMG-009"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now + DAY + 7 * HOUR, scheduledEnd: now + DAY + 15 * HOUR, percentComplete: 0, status: "scheduled", createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY });
  }
  if (wo1Cards[3]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[1], taskCardId: wo1Cards[3]._id, technicianId: techMap["CAMG-003"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now + 2 * DAY + 7 * HOUR, scheduledEnd: now + 2 * DAY + 12 * HOUR, percentComplete: 0, status: "scheduled", createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY });
  }
  if (wo2Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[2], taskCardId: wo2Cards[0]._id, technicianId: techMap["CAMG-009"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 7 * DAY + 7 * HOUR, scheduledEnd: now - 7 * DAY + 15 * HOUR, actualHoursLogged: 8.0, percentComplete: 100, status: "complete", createdAt: now - 7 * DAY, updatedAt: now - 7 * DAY + 15 * HOUR });
  }
  if (wo2Cards[1]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[2], taskCardId: wo2Cards[1]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 5 * DAY + 7 * HOUR, scheduledEnd: now - 5 * DAY + 15 * HOUR, actualHoursLogged: 6.5, percentComplete: 100, status: "complete", createdAt: now - 7 * DAY, updatedAt: now - 5 * DAY + 15 * HOUR });
  }
  if (wo3Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[3], taskCardId: wo3Cards[0]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 4 * DAY + 7 * HOUR, scheduledEnd: now - 4 * DAY + 15 * HOUR, actualHoursLogged: 7.0, percentComplete: 100, status: "complete", createdAt: now - 4 * DAY, updatedAt: now - 4 * DAY + 15 * HOUR });
  }
  if (wo4Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[4], taskCardId: wo4Cards[0]._id, technicianId: techMap["CAMG-005"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now - 6 * DAY + 7 * HOUR, scheduledEnd: now - 6 * DAY + 15 * HOUR, actualHoursLogged: 4.0, percentComplete: 100, status: "complete", createdAt: now - 6 * DAY, updatedAt: now - 6 * DAY + 15 * HOUR });
  }
  if (wo4Cards[1]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[4], taskCardId: wo4Cards[1]._id, technicianId: techMap["CAMG-007"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now + 3 * DAY + 7 * HOUR, scheduledEnd: now + 3 * DAY + 15 * HOUR, percentComplete: 0, status: "scheduled", createdAt: now - 6 * DAY, updatedAt: now - 2 * DAY });
  }
  if (wo5Cards[0]) {
    await ctx.db.insert("taskAssignments", { workOrderId: activeWOIds[5], taskCardId: wo5Cards[0]._id, technicianId: techMap["CAMG-005"], organizationId: orgIdStr, shopLocationId: locationMap["APA"], scheduledStart: now + 7 * HOUR, scheduledEnd: now + 15 * HOUR, percentComplete: 0, status: "scheduled", createdAt: now, updatedAt: now });
  }

  // ── 3. carryForwardItems — 6 records ────────────────────────────────────
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[0], organizationId: orgId, sourceWorkOrderId: closedWOIds[12], description: "Left engine compressor wash due within 50 hours — noted on Phase 2, carry to Phase 3 active WO for tracking", category: "deferred_maintenance", priority: "medium", status: "consumed", createdAt: now - 18 * DAY, consumedByWorkOrderId: activeWOIds[0] });
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[2], organizationId: orgId, sourceWorkOrderId: closedWOIds[0], description: "Left main gear tire wear approaching limit — monitor at next inspection. Tread depth 2/32 at annual.", category: "deferred_maintenance", priority: "low", status: "open", createdAt: now - 88 * DAY });
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[8], organizationId: orgId, sourceWorkOrderId: closedWOIds[1], description: "AD 2024-20-01 PT6A-114A fuel nozzle next inspection due at 11,820 TT (400 hours from last compliance)", category: "ad_tracking", priority: "high", status: "open", createdAt: now - 85 * DAY });
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[4], organizationId: orgId, sourceWorkOrderId: closedWOIds[7], description: "ITT trending high at cruise power — EGT climb 12°C over 200 hours. Trend data attached. Monitor closely.", category: "note", priority: "high", status: "consumed", createdAt: now - 48 * DAY, consumedByWorkOrderId: activeWOIds[1] });
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[3], organizationId: orgId, sourceWorkOrderId: closedWOIds[13], description: "Propeller leading edge nicks — within limits per McCauley SB. Document for next 100hr re-inspection.", category: "deferred_maintenance", priority: "low", status: "open", createdAt: now - 16 * DAY });
  await ctx.db.insert("carryForwardItems", { aircraftId: aircraftIds[1], organizationId: orgId, sourceWorkOrderId: closedWOIds[5], description: "Cabin door seal showing UV weathering — airworthy but suggest replacement at next heavy visit. Customer notified.", category: "note", priority: "low", status: "dismissed", createdAt: now - 58 * DAY, dismissedReason: "Customer elected to defer — aircraft sold; new owner accepted condition" });

  // ── 4. turnoverReports — 4 records ──────────────────────────────────────
  const fmtDate = (d: number) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; };

  await ctx.db.insert("turnoverReports", {
    organizationId: orgId, reportDate: fmtDate(now - 3 * DAY),
    windowStartAt: now - 3 * DAY + 7 * HOUR, windowEndAt: now - 3 * DAY + 17 * HOUR,
    status: "submitted", leadTechnicianId: techMap["CAMG-005"],
    selectedWorkOrderIds: [activeWOIds[0], activeWOIds[1], activeWOIds[2]],
    summaryText: "Phase 3 inspection on N341PA progressing well — igniter plugs received, awaiting QC release. TBM 930 annual underway, compressor wash complete. N208CD pending inspection sign-off.",
    leadNotes: "Igniter plug issue needs QCM review before install — Robert to confirm conformity docs in the morning.",
    timeAppliedMinutes: 540, shopWorkOrderMinutes: 480,
    personBreakdown: [
      { technicianId: techMap["CAMG-005"], technicianName: "David Kowalski", minutes: 180, notes: "Lead oversight, Phase 3 planning" },
      { technicianId: techMap["CAMG-007"], technicianName: "Mike Patterson", minutes: 150, notes: "N341PA primary wrench" },
      { technicianId: techMap["CAMG-008"], technicianName: "Priya Desai", minutes: 150, notes: "TBM 930 annual — incoming inspection" },
      { technicianId: techMap["CAMG-009"], technicianName: "Carlos Mendez", minutes: 120, notes: "N208CD borescope and engine trend" },
    ],
    teamBreakdown: [{ teamName: "APA Day Team", minutes: 540, notes: "Full team on deck" }],
    workOrderNotes: [
      { workOrderId: activeWOIds[0], workOrderNumber: "WO-2026-0101", notes: "TC-4 in progress — 45% complete." },
      { workOrderId: activeWOIds[1], workOrderNumber: "WO-2026-0102", notes: "TC-1 complete. TC-2 underway." },
      { workOrderId: activeWOIds[2], workOrderNumber: "WO-2026-0103", notes: "All tasks complete. Pending final QCM sign-off." },
    ],
    submittedAt: now - 3 * DAY + 17 * HOUR, submittedByTechnicianId: techMap["CAMG-005"],
    submissionSignature: { signedName: "David Kowalski", signedRole: "Lead Technician", signedAt: now - 3 * DAY + 17 * HOUR },
    createdAt: now - 3 * DAY + 16 * HOUR, updatedAt: now - 3 * DAY + 17 * HOUR,
  });
  await ctx.db.insert("turnoverReports", {
    organizationId: orgId, reportDate: fmtDate(now - 2 * DAY),
    windowStartAt: now - 2 * DAY + 7 * HOUR, windowEndAt: now - 2 * DAY + 17 * HOUR,
    status: "submitted", leadTechnicianId: techMap["CAMG-005"],
    selectedWorkOrderIds: [activeWOIds[0], activeWOIds[1], activeWOIds[3], activeWOIds[4]],
    summaryText: "TC-4 on N341PA closed out. N172FR prop strike eval complete. Gear actuator still on order for N892PA.",
    leadNotes: "N892PA remains on hold — customer aware. Parts ETA tomorrow per Aviall.",
    timeAppliedMinutes: 490, shopWorkOrderMinutes: 450,
    personBreakdown: [
      { technicianId: techMap["CAMG-005"], technicianName: "David Kowalski", minutes: 120 },
      { technicianId: techMap["CAMG-007"], technicianName: "Mike Patterson", minutes: 160 },
      { technicianId: techMap["CAMG-008"], technicianName: "Priya Desai", minutes: 140 },
      { technicianId: techMap["CAMG-009"], technicianName: "Carlos Mendez", minutes: 70 },
    ],
    teamBreakdown: [{ teamName: "APA Day Team", minutes: 490 }],
    workOrderNotes: [
      { workOrderId: activeWOIds[0], workOrderNumber: "WO-2026-0101", notes: "TC-4 signed off. TC-5 scheduled for tomorrow." },
      { workOrderId: activeWOIds[3], workOrderNumber: "WO-2026-0104", notes: "Prop strike eval complete — awaiting QCM documentation." },
      { workOrderId: activeWOIds[4], workOrderNumber: "WO-2026-0105", notes: "On hold — gear actuator in transit." },
    ],
    submittedAt: now - 2 * DAY + 17 * HOUR, submittedByTechnicianId: techMap["CAMG-005"],
    submissionSignature: { signedName: "David Kowalski", signedRole: "Lead Technician", signedAt: now - 2 * DAY + 17 * HOUR },
    createdAt: now - 2 * DAY + 16 * HOUR, updatedAt: now - 2 * DAY + 17 * HOUR,
  });
  await ctx.db.insert("turnoverReports", {
    organizationId: orgId, reportDate: fmtDate(now - DAY),
    windowStartAt: now - DAY + 7 * HOUR, windowEndAt: now - DAY + 17 * HOUR,
    status: "submitted", leadTechnicianId: techMap["CAMG-006"],
    selectedWorkOrderIds: [activeWOIds[1], activeWOIds[5]],
    summaryText: "TBM 930 annual — TC-2 major tasks complete. N350AE just inducted, initial inspection starting tomorrow.",
    leadNotes: "New intake squawk on N350AE — inlet particle separator screen damage. Part ordered.",
    timeAppliedMinutes: 340, shopWorkOrderMinutes: 310,
    personBreakdown: [
      { technicianId: techMap["CAMG-006"], technicianName: "Sarah Nakamura", minutes: 120 },
      { technicianId: techMap["CAMG-009"], technicianName: "Carlos Mendez", minutes: 220 },
    ],
    teamBreakdown: [{ teamName: "FNL Day Team", minutes: 340 }],
    workOrderNotes: [
      { workOrderId: activeWOIds[1], workOrderNumber: "WO-2026-0102", notes: "TC-2 electrical systems check: 80% complete." },
      { workOrderId: activeWOIds[5], workOrderNumber: "WO-2026-0106", notes: "N350AE inducted. Initial evaluation underway." },
    ],
    submittedAt: now - DAY + 17 * HOUR, submittedByTechnicianId: techMap["CAMG-006"],
    submissionSignature: { signedName: "Sarah Nakamura", signedRole: "Lead Technician — FNL", signedAt: now - DAY + 17 * HOUR },
    createdAt: now - DAY + 16 * HOUR, updatedAt: now - DAY + 17 * HOUR,
  });
  await ctx.db.insert("turnoverReports", {
    organizationId: orgId, reportDate: fmtDate(now),
    windowStartAt: now + 7 * HOUR, windowEndAt: now + 17 * HOUR,
    status: "draft", leadTechnicianId: techMap["CAMG-005"],
    selectedWorkOrderIds: [activeWOIds[0], activeWOIds[1], activeWOIds[2], activeWOIds[5]],
    summaryText: "WO-2026-0101 nearing completion — RTS inspection this AM. TBM 930 annual on track.",
    timeAppliedMinutes: 0, shopWorkOrderMinutes: 0,
    personBreakdown: [], teamBreakdown: [], workOrderNotes: [],
    createdAt: now, updatedAt: now,
  });

  // ── 5. leadAssignments — 6 records ──────────────────────────────────────
  await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "work_order", workOrderId: activeWOIds[0], assignedToTechnicianId: techMap["CAMG-005"], assignmentNote: "David leading Phase 3", assignedByTechnicianId: techMap["CAMG-002"], isActive: true, assignedAt: now - 5 * DAY, updatedAt: now - 5 * DAY });
  await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "work_order", workOrderId: activeWOIds[1], assignedToTechnicianId: techMap["CAMG-006"], assignmentNote: "Sarah leading — FNL has TBM type experience", assignedByTechnicianId: techMap["CAMG-002"], isActive: true, assignedAt: now - 3 * DAY, updatedAt: now - 3 * DAY });
  await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "work_order", workOrderId: activeWOIds[3], assignedToTechnicianId: techMap["CAMG-005"], assignmentNote: "AOG-adjacent — prop strike requires IA oversight", assignedByTechnicianId: techMap["CAMG-002"], isActive: true, assignedAt: now - 4 * DAY, updatedAt: now - 4 * DAY });
  await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "work_order", workOrderId: activeWOIds[4], assignedToTechnicianId: techMap["CAMG-005"], assignmentNote: "On hold — David remains lead pending part arrival", assignedByTechnicianId: techMap["CAMG-002"], isActive: true, assignedAt: now - 6 * DAY, updatedAt: now - 2 * DAY });
  if (wo0Cards[4]) {
    await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "task_card", workOrderId: activeWOIds[0], taskCardId: wo0Cards[4]._id, assignedToTechnicianId: techMap["CAMG-003"], assignmentNote: "Robert to perform final IA inspection and RTS sign-off", assignedByTechnicianId: techMap["CAMG-005"], isActive: true, assignedAt: now - DAY, updatedAt: now - DAY });
  }
  await ctx.db.insert("leadAssignments", { organizationId: orgId, entityType: "work_order", workOrderId: activeWOIds[5], assignedTeamName: "FNL Day Team", assignmentNote: "FNL team assigned — N350AE based at FNL satellite", assignedByTechnicianId: techMap["CAMG-002"], isActive: true, assignedAt: now, updatedAt: now });

  // ── 6. workItemEntries — 12 records ─────────────────────────────────────
  const activeWODiscrepancies = await ctx.db.query("discrepancies").withIndex("by_status", (q) => q.eq("organizationId", orgId)).collect();
  const wo0Discrepancy = activeWODiscrepancies.find((d) => d.workOrderId === activeWOIds[0]);
  const wo1Discrepancy = activeWODiscrepancies.find((d) => d.workOrderId === activeWOIds[1]);
  const wo2Discrepancy = activeWODiscrepancies.find((d) => d.workOrderId === activeWOIds[2]);
  const wo4Discrepancy = activeWODiscrepancies.find((d) => d.workOrderId === activeWOIds[4]);

  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[0], discrepancyId: wo0Discrepancy?._id, entryType: "discrepancy_writeup", text: "During Phase 3 panel removal, noted right engine bleed air duct insulation blanket showing heat discoloration. Blanket is intact but shows brown staining consistent with minor duct leak. No active leak detected.", technicianId: techMap["CAMG-007"], technicianName: "Mike Patterson", certificateNumber: certNumbers["CAMG-007"], createdAt: now - 4 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[0], discrepancyId: wo0Discrepancy?._id, entryType: "corrective_action", text: "Inspected bleed air duct fittings per AMM 36-10-00. All B-nut fittings torqued within spec. Blanket replaced with new unit from stock. Confirmed per AMM.", technicianId: techMap["CAMG-005"], technicianName: "David Kowalski", certificateNumber: certNumbers["CAMG-005"], createdAt: now - 3 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[0], taskCardId: wo0Cards[3]?._id, entryType: "note", text: "TC-4 igniter plug R&R: Left igniter IP-4401 gap 0.028 in, within limits. Right igniter IP-4402 gap 0.031, slightly out — replaced with new unit. Ops check confirmed both igniters firing.", technicianId: techMap["CAMG-007"], technicianName: "Mike Patterson", certificateNumber: certNumbers["CAMG-007"], createdAt: now - 2 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[1], discrepancyId: wo1Discrepancy?._id, entryType: "discrepancy_writeup", text: "Logbook review confirms ITT trend anomaly. ITT at cruise power (99% Ng) is 794°C. AMM limit is 820°C. 26°C below limit but 12°C above baseline. Trend monitoring required.", technicianId: techMap["CAMG-008"], technicianName: "Priya Desai", certificateNumber: certNumbers["CAMG-008"], createdAt: now - 3 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[1], discrepancyId: wo1Discrepancy?._id, entryType: "note", text: "Borescope inspection of PT6A-66D hot section. No cracks on NGV or turbine blades. Carbon fouling on 3 of 12 combustion liner tiles — within limits per CMM. Fuel nozzle flow check pending.", technicianId: techMap["CAMG-008"], technicianName: "Priya Desai", certificateNumber: certNumbers["CAMG-008"], createdAt: now - 2 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[2], discrepancyId: wo2Discrepancy?._id, entryType: "discrepancy_writeup", text: "Engine trend check noted elevated fuel flow at 100% Ng — 228 lbs/hr vs. baseline 221 lbs/hr. Within advisory threshold of ±15 lb/hr but trending.", technicianId: techMap["CAMG-009"], technicianName: "Carlos Mendez", certificateNumber: certNumbers["CAMG-009"], createdAt: now - 7 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[2], discrepancyId: wo2Discrepancy?._id, entryType: "corrective_action", text: "Full PT6A-114A fuel nozzle flow check per CMM 73-10-02. Distribution within spec. Fuel control trimmed per AMM 73-20-00. Post-trim: 219 lbs/hr at 100% Ng. Baseline restored.", technicianId: techMap["CAMG-009"], technicianName: "Carlos Mendez", certificateNumber: certNumbers["CAMG-009"], createdAt: now - 5 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[2], entryType: "status_change", text: "Work order status changed to pending_inspection. All task cards complete. Awaiting QCM conformity inspection and IA sign-off.", technicianId: techMap["CAMG-005"], technicianName: "David Kowalski", certificateNumber: certNumbers["CAMG-005"], createdAt: now - 3 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[3], entryType: "note", text: "Prop strike evaluation per McCauley SB M-82 and Lycoming SI 1032E. No scoring on crankshaft flange. Compression 76/80+ all cylinders. Prop tracking within limits. Aircraft airworthy.", technicianId: techMap["CAMG-007"], technicianName: "Mike Patterson", certificateNumber: certNumbers["CAMG-007"], createdAt: now - 2 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[4], discrepancyId: wo4Discrepancy?._id, entryType: "discrepancy_writeup", text: "Left main gear actuator failed to fully extend during gear retraction check. Actuator stalls at intermediate position. Hydraulic pressure nominal (1400 PSI). Internal seal failure suspected.", technicianId: techMap["CAMG-005"], technicianName: "David Kowalski", certificateNumber: certNumbers["CAMG-005"], createdAt: now - 6 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[4], entryType: "status_change", text: "Work order placed on hold — awaiting main gear actuator assembly from Aviall (PO-2026-0015). ETA 3 days. Customer notified. Aircraft grounded at APA.", technicianId: techMap["CAMG-002"], technicianName: "Maria Santos", certificateNumber: certNumbers["CAMG-002"], createdAt: now - 4 * DAY });
  await ctx.db.insert("workItemEntries", { organizationId: orgId, workOrderId: activeWOIds[5], entryType: "note", text: "Initial induction: Aspen Executive Air reported unusual whistling noise during takeoff power. Inlet particle separator screen shows two wires bent inward at 1 o'clock position. Screen integrity compromised. Part on request.", technicianId: techMap["CAMG-006"], technicianName: "Sarah Nakamura", certificateNumber: certNumbers["CAMG-006"], createdAt: now });

  // ══════════════════════════════════════════════════════════════════════════
  // WAVE 2: WO COMPLETION RECORDS
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. eightOneThirtyRecords — 8 records ────────────────────────────────
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[14], approvingAuthority: "FAA", applicantName: "StandardAero Component Services", applicantAddress: "8015 N 73rd Ave, Peoria, AZ 85345", formTrackingNumber: "8130-SA-2025-08-0041", organizationName: "StandardAero Component Services", workOrderReference: "SA-WO-2025-08-0041", itemNumber: "1", partDescription: "Fuel Control Unit (FCU) Assembly", partNumber: "3041600-01", partEligibility: "PT6A-42, PT6A-52, PT6A-60A — per CMM 73-10-01", quantity: 1, serialBatchNumber: "FCU-1101", isLifeLimited: false, statusWork: "overhauled", remarks: "Overhauled per CMM 73-10-01 Rev 12. Test run performed. Meets all serviceable limits.", certifyingStatement: "The work described above was accomplished in accordance with the applicable regulations and the item is considered airworthy.", authorizedSignatoryName: "James R. Collins", signatureDate: now - 60 * DAY, approvalNumber: "DASA-145-SA-2024-001", receivedByOrganizationId: orgId, receivedDate: now - 55 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "Received with full 8130-3, CMM test data, and work order documentation. Conformity verified by Robert Chen.", isSuspect: false, createdAt: now - 55 * DAY, updatedAt: now - 55 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[10], approvingAuthority: "FAA", applicantName: "StandardAero Component Services", applicantAddress: "8015 N 73rd Ave, Peoria, AZ 85345", formTrackingNumber: "8130-SA-2025-09-0078", organizationName: "StandardAero Component Services", workOrderReference: "SA-WO-2025-09-0078", itemNumber: "1", partDescription: "PT6A Fuel Nozzle", partNumber: "3040550-01", partEligibility: "PT6A-42, PT6A-52 — per CMM 73-10-04", quantity: 1, serialBatchNumber: "FN-7201", isLifeLimited: false, statusWork: "overhauled", remarks: "Overhauled per CMM 73-10-04 Rev 8. Flow test within ±3%. Filter screen replaced.", certifyingStatement: "The work described above was accomplished in accordance with the applicable regulations and the item is considered airworthy.", authorizedSignatoryName: "Patricia M. Ortiz", signatureDate: now - 80 * DAY, approvalNumber: "DASA-145-SA-2024-001", receivedByOrganizationId: orgId, receivedDate: now - 77 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "8130-3 conformity check complete — S/N FN-7201 matches tag.", isSuspect: false, createdAt: now - 77 * DAY, updatedAt: now - 77 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[12], approvingAuthority: "FAA", applicantName: "Aviall Services Inc", applicantAddress: "2750 Regent Blvd, Dallas, TX 75261", formTrackingNumber: "8130-AV-2026-01-0112", organizationName: "Aviall Services Inc", itemNumber: "1", partDescription: "PT6A Igniter Plug", partNumber: "3045001-01", quantity: 2, serialBatchNumber: "IP-4401 / IP-4402", isLifeLimited: false, statusWork: "new", remarks: "New manufacture — trace to OEM lot 2025-47B. Calibrated gap 0.025±0.002 in per CMM.", certifyingStatement: "I certify that the statements herein are correct and the work was accomplished in accordance with applicable regulations.", authorizedSignatoryName: "Brian K. Stanton", signatureDate: now - 10 * DAY, approvalNumber: "AV-DAS-145-2024", receivedByOrganizationId: orgId, receivedDate: now - 2 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "Received with 8130-3 and CoC. QC incoming inspection complete.", isSuspect: false, createdAt: now - 2 * DAY, updatedAt: now - 2 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[20], approvingAuthority: "FAA", applicantName: "Aviall Services Inc", applicantAddress: "2750 Regent Blvd, Dallas, TX 75261", formTrackingNumber: "8130-AV-2025-11-0289", organizationName: "Aviall Services Inc", itemNumber: "1", partDescription: "Brake Disc Assembly", partNumber: "101-3200-5", partEligibility: "Cessna 172, 182 — per IPC Chapter 32", quantity: 1, serialBatchNumber: "BD-3301", isLifeLimited: false, statusWork: "new", remarks: "New — factory acceptance test passed. Meets all dimensional and material specs.", certifyingStatement: "I certify that the statements herein are correct.", authorizedSignatoryName: "Brian K. Stanton", signatureDate: now - 80 * DAY, approvalNumber: "AV-DAS-145-2024", receivedByOrganizationId: orgId, receivedDate: now - 74 * DAY, isSuspect: false, createdAt: now - 74 * DAY, updatedAt: now - 74 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[15], approvingAuthority: "FAA", applicantName: "Collins Aerospace", applicantAddress: "400 Collins Rd NE, Cedar Rapids, IA 52498", formTrackingNumber: "8130-COL-2025-07-0033", organizationName: "Collins Aerospace Component Repair", workOrderReference: "COL-CRS-2025-07-0033", itemNumber: "1", partDescription: "Starter Generator Assembly", partNumber: "3041700-01", partEligibility: "PT6A-42, PT6A-52, PT6A-60A", quantity: 1, serialBatchNumber: "SG-2201", isLifeLimited: false, statusWork: "repaired", remarks: "Repaired per CMM 24-30-01 Rev 14. Replaced brush pack. Load test 28.5VDC.", certifyingStatement: "The work described above was accomplished in accordance with the applicable regulations and the item is considered airworthy.", authorizedSignatoryName: "Douglas M. Fraser", signatureDate: now - 120 * DAY, approvalNumber: "COL-DAS-145-2023", receivedByOrganizationId: orgId, receivedDate: now - 115 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "Serviceable tag and 8130-3 verified. Placed in rotable serviceable shelf.", isSuspect: false, createdAt: now - 115 * DAY, updatedAt: now - 115 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[24], approvingAuthority: "FAA", applicantName: "Garmin International", applicantAddress: "1200 E 151st St, Olathe, KS 66062", formTrackingNumber: "8130-GAR-2025-06-0819", organizationName: "Garmin International Inc", itemNumber: "1", partDescription: "Air Data Computer Module — GTN 750Xi", partNumber: "822-1468-004", partEligibility: "GTN 750Xi — per installation manual", quantity: 1, serialBatchNumber: "ADC-9101", isLifeLimited: false, statusWork: "overhauled", remarks: "Overhauled per Garmin CMM. Software v23.40. All calibration checks passed.", certifyingStatement: "I certify that the statements herein are correct.", authorizedSignatoryName: "Jennifer L. Watts", signatureDate: now - 150 * DAY, approvalNumber: "GAR-DASA-145-2024", receivedByOrganizationId: orgId, receivedDate: now - 145 * DAY, isSuspect: false, createdAt: now - 145 * DAY, updatedAt: now - 145 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, approvingAuthority: "FAA", applicantName: "Aviall Services Inc", applicantAddress: "2750 Regent Blvd, Dallas, TX 75261", formTrackingNumber: "8130-AV-2025-10-0441", organizationName: "Aviall Services Inc", itemNumber: "1", partDescription: "Fuel Selector Valve Assembly — Cessna 208B", partNumber: "208-FUEL-SEL-001", quantity: 1, isLifeLimited: false, statusWork: "new", remarks: "New manufacture. Dimensional checks per drawing. Torque tested. Functional check complete.", certifyingStatement: "I certify that the statements herein are correct.", authorizedSignatoryName: "Brian K. Stanton", signatureDate: now - 30 * DAY, approvalNumber: "AV-DAS-145-2024", receivedByOrganizationId: orgId, receivedDate: now - 21 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "AD 2024-18-03 compliance part — 8130-3 conformity verified.", isSuspect: false, createdAt: now - 21 * DAY, updatedAt: now - 21 * DAY });
  await ctx.db.insert("eightOneThirtyRecords", { organizationId: orgId, partId: partIds[29], approvingAuthority: "FAA", applicantName: "Unknown Supplier", formTrackingNumber: "8130-SUSP-2026-01-0001", itemNumber: "1", partDescription: "PT6A Fuel Nozzle — SUSPECT", partNumber: "3040550-01", quantity: 1, serialBatchNumber: "FN-QUAR-001", isLifeLimited: false, statusWork: "inspected", remarks: "8130-3 documentation questionable — approval number format invalid. SDR filed.", certifyingStatement: "Documentation received — authenticity under investigation.", authorizedSignatoryName: "R. Martinez (under investigation)", signatureDate: now - 15 * DAY, approvalNumber: "SUSP-UNKNOWN-001", receivedByOrganizationId: orgId, receivedDate: now - 14 * DAY, verifiedByUserId: args.clerkUserId, verificationNotes: "SUSPECT PART — approval number format invalid. Part quarantined. SDR filed.", isSuspect: true, suspectReason: "FAA approval number format does not match known DAS. Document appears altered. Part quarantined per QCM directive.", suspectStatus: "under_investigation", createdAt: now - 14 * DAY, updatedAt: now - 14 * DAY });

  // ── 2. releaseCertificates — 5 records ──────────────────────────────────
  await ctx.db.insert("releaseCertificates", { organizationId: orgId, workOrderId: closedWOIds[0], formType: "faa_8130", certificateNumber: "CAMG-RC-2025-0801", partDescription: "Cessna 172S Skyhawk — Annual Inspection", partNumber: "172S-10241", serialNumber: "172S-10241", quantity: 1, workPerformed: "Annual inspection per FAR 43 Appendix D. All discrepancies corrected. Oil/fuel filters replaced.", condition: "Airworthy — returned to service", remarks: "N172FR S/N 172S-10241 is airworthy.", inspectorTechnicianId: techMap["CAMG-003"], inspectorName: "Robert Chen", approvalNumber: certNumbers["CAMG-003"] ?? "FAA-AP-003", organizationName: "Colorado Aviation Maintenance Group", organizationAddress: "7565 S Peoria St, Centennial, CO 80112", repairStationCertNumber: "CAMG-145-2022-001", signatureDate: now - 81 * DAY, createdAt: now - 81 * DAY });
  await ctx.db.insert("releaseCertificates", { organizationId: orgId, workOrderId: closedWOIds[3], partId: partIds[10], formType: "faa_8130", certificateNumber: "CAMG-RC-2025-0804A", partDescription: "PT6A Fuel Nozzle — After AD Compliance", partNumber: "3040550-01", serialNumber: "FN-7201", quantity: 1, workPerformed: "Fuel nozzle inspected and replaced per AD 2024-15-07. Flow check performed.", condition: "Overhauled — serviceable", remarks: "Part released per AD 2024-15-07 compliance.", inspectorTechnicianId: techMap["CAMG-003"], inspectorName: "Robert Chen", approvalNumber: certNumbers["CAMG-003"] ?? "FAA-AP-003", organizationName: "Colorado Aviation Maintenance Group", organizationAddress: "7565 S Peoria St, Centennial, CO 80112", repairStationCertNumber: "CAMG-145-2022-001", signatureDate: now - 75 * DAY, createdAt: now - 75 * DAY });
  await ctx.db.insert("releaseCertificates", { organizationId: orgId, workOrderId: closedWOIds[5], formType: "faa_8130", certificateNumber: "CAMG-RC-2025-0901", partDescription: "Beechcraft King Air 250 — Annual Inspection", partNumber: "BY-4402", serialNumber: "BY-4402", quantity: 1, workPerformed: "Annual inspection completed. FCU assembly replaced with overhauled unit. Aircraft returned to service.", condition: "Airworthy — returned to service", remarks: "N892PA S/N BY-4402 is airworthy. Airframe TT at completion: 5870 hrs.", inspectorTechnicianId: techMap["CAMG-001"], inspectorName: "James Harwick", approvalNumber: certNumbers["CAMG-001"] ?? "FAA-AP-001", organizationName: "Colorado Aviation Maintenance Group", organizationAddress: "7565 S Peoria St, Centennial, CO 80112", repairStationCertNumber: "CAMG-145-2022-001", signatureDate: now - 48 * DAY, createdAt: now - 48 * DAY });
  await ctx.db.insert("releaseCertificates", { organizationId: orgId, workOrderId: closedWOIds[11], formType: "faa_8130", certificateNumber: "CAMG-RC-2025-1002", partDescription: "Cessna 208B Fuel Selector Valve — AD Compliance", partNumber: "208-FUEL-SEL-001", quantity: 1, workPerformed: "Fuel selector valve replaced per AD 2024-18-03. Functional check complete.", condition: "New — serviceable", remarks: "AD 2024-18-03 compliance completed. N208CD airworthy.", inspectorTechnicianId: techMap["CAMG-003"], inspectorName: "Robert Chen", approvalNumber: certNumbers["CAMG-003"] ?? "FAA-AP-003", organizationName: "Colorado Aviation Maintenance Group", organizationAddress: "7565 S Peoria St, Centennial, CO 80112", repairStationCertNumber: "CAMG-145-2022-001", signatureDate: now - 19 * DAY, createdAt: now - 19 * DAY });
  await ctx.db.insert("releaseCertificates", { organizationId: orgId, workOrderId: closedWOIds[2], partId: partIds[20], formType: "faa_8130", certificateNumber: "CAMG-RC-2025-0803", partDescription: "Cleveland Brake Disc Assembly — N182FR", partNumber: "101-3200-5", serialNumber: "BD-3301", quantity: 1, workPerformed: "Brake disc assembly and lining replaced. Hydraulic system bled. Taxi test normal.", condition: "New — serviceable", remarks: "Brake R&R complete on N182FR.", inspectorTechnicianId: techMap["CAMG-005"], inspectorName: "David Kowalski", approvalNumber: certNumbers["CAMG-005"] ?? "FAA-AP-005", organizationName: "Colorado Aviation Maintenance Group", organizationAddress: "7565 S Peoria St, Centennial, CO 80112", repairStationCertNumber: "CAMG-145-2022-001", signatureDate: now - 72 * DAY, createdAt: now - 72 * DAY });

  // ── 3. conformityInspections — 8 records ────────────────────────────────
  const closedWO0Steps = await ctx.db.query("taskCardSteps").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).filter((q) => q.eq(q.field("workOrderId"), closedWOIds[0])).collect();
  const closedWO5Steps = await ctx.db.query("taskCardSteps").withIndex("by_organization", (q) => q.eq("organizationId", orgId)).filter((q) => q.eq(q.field("workOrderId"), closedWOIds[5])).collect();
  const closedWO0Cards = allTaskCards.filter((tc) => tc.workOrderId === closedWOIds[0]);
  const closedWO5Cards = allTaskCards.filter((tc) => tc.workOrderId === closedWOIds[5]);
  const closedWO3Cards = allTaskCards.filter((tc) => tc.workOrderId === closedWOIds[3]);
  const closedWO11Cards = allTaskCards.filter((tc) => tc.workOrderId === closedWOIds[11]);

  if (closedWO0Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: closedWOIds[0], taskCardId: closedWO0Cards[0]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "final", status: "passed", stepsReviewed: closedWO0Steps.slice(0, 3).map((s) => s._id), approvedDataReference: "FAR 43 Appendix D; Cessna 172S AMM Rev 23", completedAt: now - 82 * DAY, createdAt: now - 82 * DAY }); }
  if (closedWO5Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: closedWOIds[5], taskCardId: closedWO5Cards[0]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "buy_back", status: "passed", stepsReviewed: closedWO5Steps.slice(0, 3).map((s) => s._id), approvedDataReference: "Beechcraft King Air 250 AMM Rev 12", completedAt: now - 49 * DAY, createdAt: now - 49 * DAY }); }
  if (closedWO5Cards[1]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: closedWOIds[5], taskCardId: closedWO5Cards[1]._id, inspectorTechnicianId: techMap["CAMG-001"], inspectionType: "final", status: "passed", stepsReviewed: closedWO5Steps.slice(3, 6).map((s) => s._id), approvedDataReference: "Beechcraft King Air 250 AMM Rev 12; P&WC PT6A CMM", completedAt: now - 48 * DAY, createdAt: now - 48 * DAY }); }
  if (closedWO3Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: closedWOIds[3], taskCardId: closedWO3Cards[0]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "in_process", status: "passed", stepsReviewed: [], approvedDataReference: "AD 2024-15-07; Beechcraft King Air B200 AMM", completedAt: now - 76 * DAY, createdAt: now - 76 * DAY }); }
  if (closedWO11Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: closedWOIds[11], taskCardId: closedWO11Cards[0]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "final", status: "passed", stepsReviewed: [], approvedDataReference: "AD 2024-18-03; Cessna 208B AMM Chapter 28", completedAt: now - 20 * DAY, createdAt: now - 20 * DAY }); }
  if (wo2Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: activeWOIds[2], taskCardId: wo2Cards[0]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "final", status: "pending", stepsReviewed: [], approvedDataReference: "Cessna 208B AMM; PT6A-114A CMM Rev 9", createdAt: now - DAY }); }
  if (wo3Cards[0]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: activeWOIds[3], taskCardId: wo3Cards[0]._id, inspectorTechnicianId: techMap["CAMG-001"], inspectionType: "final", status: "passed", stepsReviewed: [], approvedDataReference: "McCauley SB M-82; Lycoming SI 1032E; Cessna 172S AMM", completedAt: now - DAY, createdAt: now - DAY }); }
  if (wo0Cards[1]) { await ctx.db.insert("conformityInspections", { organizationId: orgId, workOrderId: activeWOIds[0], taskCardId: wo0Cards[1]._id, inspectorTechnicianId: techMap["CAMG-003"], inspectionType: "in_process", status: "conditional", findings: "TC-2 step 2 torque callout not recorded — technician performed work correctly but omitted recording torque value. Documentation corrected during inspection.", stepsReviewed: [], approvedDataReference: "Beechcraft King Air B200 AMM Chapter 12", completedAt: now - 3 * DAY, createdAt: now - 3 * DAY }); }

  // ── 4. inductionRecords — 6 records ─────────────────────────────────────
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[0], workOrderId: activeWOIds[0], totalTimeAtInduction: AIRCRAFT_SEED[0].tt - 10, inductionNotes: "Aircraft arrived under own power. Customer Jeff Morrison on site. All logbooks provided.", walkAroundFindings: "General condition good. Right engine cowl latch shows slight play. No fluid leaks.", logbookReviewNotes: "Airframe log current — all ADs noted. Engine logs reviewed for both PT6A-42.", inductedAt: now - 5 * DAY });
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[4], workOrderId: activeWOIds[1], totalTimeAtInduction: AIRCRAFT_SEED[4].tt - 10, inductionNotes: "Aircraft towed into Bay B. Amy Liu (MWMedevac) provided all records. Carry-forward ITT trend was key focus.", walkAroundFindings: "Aircraft clean. 2 of 4 static wicks missing on left horizontal stabilizer. Tires good.", logbookReviewNotes: "Engine log shows ITT trending data from last three flights. AD status current.", inductedAt: now - 3 * DAY });
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[8], workOrderId: activeWOIds[2], totalTimeAtInduction: AIRCRAFT_SEED[8].tt - 10, inductionNotes: "Colorado Dept of Wildlife Caravan. Jennifer Hawk authorized. Current TT 11,410.", walkAroundFindings: "Exterior good. Floats installed — no leaks. Engine exhaust normal staining.", logbookReviewNotes: "PT6A-114A at 11,410 TT, 2,410 TSO. Last fuel nozzle inspection at 11,000 TT.", inductedAt: now - 7 * DAY });
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[2], workOrderId: activeWOIds[3], totalTimeAtInduction: AIRCRAFT_SEED[2].tt - 10, inductionNotes: "FRONT RANGE FLIGHT TRAINING prop strike event. Steve Rodriguez (DOM) accompanied aircraft.", walkAroundFindings: "Prop blade leading edges show impact damage. Engine cowl scoring. No airframe structural damage.", logbookReviewNotes: "Lycoming IO-360-L2A at 6,241 TT, 241 TSO.", inductedAt: now - 4 * DAY });
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[1], workOrderId: activeWOIds[4], totalTimeAtInduction: AIRCRAFT_SEED[1].tt - 10, inductionNotes: "Peak Aviation Partners — gear retraction failure during pre-flight. Aircraft towed to Bay A.", walkAroundFindings: "Gear down and locked after manual extension. Left MLG actuator stalls at mid-point.", logbookReviewNotes: "King Air 250 airframe at 5,870 TT. Previous gear actuator service at 4,200 TT.", inductedAt: now - 6 * DAY });
  await ctx.db.insert("inductionRecords", { aircraftId: aircraftIds[6], workOrderId: activeWOIds[5], totalTimeAtInduction: AIRCRAFT_SEED[6].tt - 10, inductionNotes: "Aspen Executive Air squawk evaluation. Pilot reported high-pitched whistle during takeoff.", walkAroundFindings: "Left engine inlet particle separator screen — two wires bent at 1 o'clock position. Right engine inlet normal.", logbookReviewNotes: "N350AE at 7,180 TT. Both PT6A-60A at 7,180 TT, 1,180 TSO. All ADs current.", inductedAt: now });
}
