// convex/simPartsRunner.ts — Parts & Services simulation mutations (no auth)
// DELETE before production

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Receive Part (receiving inspection flow) ──
export const receivePart = mutation({
  args: {
    partId: v.id("parts"),
    technicianId: v.id("technicians"),
    notes: v.optional(v.string()),
    accept: v.boolean(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.accept) {
      await ctx.db.patch(args.partId, {
        location: "inventory",
        receivingInspectedBy: args.technicianId,
        receivingInspectedAt: now,
        receivingInspectionNotes: args.notes,
        receivingDate: now,
        updatedAt: now,
      });
      return { status: "accepted", partId: args.partId };
    } else {
      await ctx.db.patch(args.partId, {
        location: "quarantine",
        receivingInspectedBy: args.technicianId,
        receivingInspectedAt: now,
        receivingInspectionNotes: args.notes,
        receivingRejectionReason: args.rejectionReason,
        quarantineReason: args.rejectionReason,
        quarantineCreatedById: args.technicianId,
        quarantineCreatedAt: now,
        updatedAt: now,
      });
      return { status: "rejected", partId: args.partId };
    }
  },
});

// ── Reserve Part for Work Order ──
export const reservePart = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.id("workOrders"),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.partId, {
      reservedForWorkOrderId: args.workOrderId,
      reservedByTechnicianId: args.technicianId,
      reservedAt: now,
      updatedAt: now,
    });
    return { reserved: true };
  },
});

// ── Release Part Reservation ──
export const releaseReservation = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partId, {
      reservedForWorkOrderId: undefined,
      reservedByTechnicianId: undefined,
      reservedAt: undefined,
      updatedAt: Date.now(),
    });
    return { released: true };
  },
});

// ── Install Part on Aircraft ──
export const installPart = mutation({
  args: {
    partId: v.id("parts"),
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
    technicianId: v.id("technicians"),
    position: v.optional(v.string()),
    aircraftHours: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.partId, {
      location: "installed",
      currentAircraftId: args.aircraftId,
      installedOnAircraftId: args.aircraftId,
      installedOnWorkOrderId: args.workOrderId,
      installedByWorkOrderId: args.workOrderId,
      installedByTechnicianId: args.technicianId,
      installedAt: now,
      installPosition: args.position,
      hoursAtInstallation: args.aircraftHours,
      reservedForWorkOrderId: undefined,
      reservedByTechnicianId: undefined,
      reservedAt: undefined,
      updatedAt: now,
    });
    return { installed: true };
  },
});

// ── Remove Part from Aircraft ──
export const removePart = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.id("workOrders"),
    technicianId: v.id("technicians"),
    condition: v.string(),
    disposition: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.partId, {
      location: "removed_pending_disposition",
      removedAt: now,
      removedByWorkOrderId: args.workOrderId,
      removedByTechnicianId: args.technicianId,
      removalCondition: args.condition,
      intendedDisposition: args.disposition,
      currentAircraftId: undefined,
      installPosition: undefined,
      updatedAt: now,
    });
    return { removed: true };
  },
});

// ── Tag Part Unserviceable / Quarantine ──
export const quarantinePart = mutation({
  args: {
    partId: v.id("parts"),
    technicianId: v.id("technicians"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.partId, {
      location: "quarantine",
      condition: "unserviceable" as any,
      quarantineReason: args.reason,
      quarantineCreatedById: args.technicianId,
      quarantineCreatedAt: now,
      updatedAt: now,
    });
    return { quarantined: true };
  },
});

// ── Scrap Part ──
export const scrapPart = mutation({
  args: {
    partId: v.id("parts"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partId, {
      location: "scrapped",
      notes: args.reason,
      updatedAt: Date.now(),
    });
    return { scrapped: true };
  },
});

// ── Return Part to Vendor ──
export const returnToVendor = mutation({
  args: {
    partId: v.id("parts"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partId, {
      location: "returned_to_vendor",
      notes: args.reason,
      updatedAt: Date.now(),
    });
    return { returned: true };
  },
});

// ── Rotable Actions ──
export const rotableAction = mutation({
  args: {
    rotableId: v.id("rotables"),
    action: v.union(v.literal("install"), v.literal("remove"), v.literal("send_to_vendor"), v.literal("receive_from_vendor"), v.literal("condemn")),
    aircraftId: v.optional(v.id("aircraft")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const statusMap = {
      install: "installed" as const,
      remove: "in_shop" as const,
      send_to_vendor: "at_vendor" as const,
      receive_from_vendor: "serviceable" as const,
      condemn: "condemned" as const,
    };
    await ctx.db.patch(args.rotableId, {
      status: statusMap[args.action],
      aircraftId: args.action === "install" ? args.aircraftId : undefined,
      updatedAt: now,
    });
    // Record history
    const rotable = await ctx.db.get(args.rotableId);
    if (rotable) {
      await ctx.db.insert("rotableHistory", {
        rotableId: args.rotableId,
        organizationId: rotable.organizationId,
        action: args.action === "install" ? "installed" : args.action === "remove" ? "removed" : args.action === "send_to_vendor" ? "sent_to_vendor" : args.action === "receive_from_vendor" ? "received_from_vendor" : "condemned",
        toAircraftId: args.aircraftId,
        notes: args.notes,
        createdAt: now,
      });
    }
    return { done: true, newStatus: statusMap[args.action] };
  },
});

// ── Loaner Actions ──
export const loanOut = mutation({
  args: {
    loanerItemId: v.id("loanerItems"),
    customerId: v.id("customers"),
    workOrderId: v.optional(v.id("workOrders")),
    expectedReturnDays: v.float64(),
    conditionOut: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 86400000;
    await ctx.db.patch(args.loanerItemId, {
      status: "loaned_out",
      loanedToCustomerId: args.customerId,
      loanedToWorkOrderId: args.workOrderId,
      loanedDate: now,
      expectedReturnDate: now + args.expectedReturnDays * DAY,
      conditionOut: args.conditionOut,
      updatedAt: now,
    });
    const item = await ctx.db.get(args.loanerItemId);
    if (item) {
      await ctx.db.insert("loanerHistory", {
        loanerItemId: args.loanerItemId,
        organizationId: item.organizationId,
        action: "loaned",
        customerId: args.customerId,
        workOrderId: args.workOrderId,
        notes: `Loaned out: ${args.conditionOut}`,
        createdAt: now,
      });
    }
    return { loaned: true };
  },
});

export const returnLoaner = mutation({
  args: {
    loanerItemId: v.id("loanerItems"),
    conditionIn: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.loanerItemId);
    if (!item) throw new Error("Loaner not found");
    await ctx.db.patch(args.loanerItemId, {
      status: "available",
      actualReturnDate: now,
      conditionIn: args.conditionIn,
      loanedToCustomerId: undefined,
      loanedToWorkOrderId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("loanerHistory", {
      loanerItemId: args.loanerItemId,
      organizationId: item.organizationId,
      action: "returned",
      customerId: item.loanedToCustomerId,
      notes: `Returned: ${args.conditionIn}. ${args.notes || ""}`,
      createdAt: now,
    });
    return { returned: true };
  },
});

// ── Tool Actions ──
export const checkOutTool = mutation({
  args: {
    toolId: v.id("toolRecords"),
    technicianId: v.id("technicians"),
    workOrderId: v.optional(v.id("workOrders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.toolId, {
      status: "in_use",
      assignedToTechnicianId: args.technicianId,
      assignedToWorkOrderId: args.workOrderId,
    });
    return { checkedOut: true };
  },
});

export const checkInTool = mutation({
  args: { toolId: v.id("toolRecords") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.toolId, {
      status: "available",
      assignedToTechnicianId: undefined,
      assignedToWorkOrderId: undefined,
    });
    return { checkedIn: true };
  },
});

export const sendToolForCal = mutation({
  args: { toolId: v.id("toolRecords") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.toolId, { status: "out_for_calibration" });
    return { sent: true };
  },
});

export const completeToolCal = mutation({
  args: {
    toolId: v.id("toolRecords"),
    certNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    const now = Date.now();
    const DAY = 86400000;
    await ctx.db.patch(args.toolId, {
      status: "available",
      lastCalibrationDate: now,
      nextCalibrationDue: now + (tool.calibrationIntervalDays ?? 365) * DAY,
    });
    return { calibrated: true };
  },
});

// ── Update PO Status ──
export const updatePOStatus = mutation({
  args: {
    poId: v.id("purchaseOrders"),
    status: v.union(v.literal("DRAFT"), v.literal("SUBMITTED"), v.literal("PARTIAL"), v.literal("RECEIVED"), v.literal("CLOSED")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.poId, { status: args.status, updatedAt: Date.now() });
    return { updated: true };
  },
});

// ── Update Shipment Status ──
export const updateShipmentStatus = mutation({
  args: {
    shipmentId: v.id("shipments"),
    status: v.union(v.literal("pending"), v.literal("in_transit"), v.literal("delivered"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: Record<string, any> = { status: args.status, updatedAt: now };
    if (args.status === "delivered") patch.actualDelivery = now;
    if (args.status === "in_transit") patch.shippedDate = now;
    await ctx.db.patch(args.shipmentId, patch);
    return { updated: true };
  },
});

// ── Create Shipment ──
export const createShipment = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(v.literal("inbound"), v.literal("outbound")),
    carrier: v.string(),
    trackingNumber: v.optional(v.string()),
    originName: v.string(),
    destinationName: v.string(),
    workOrderId: v.optional(v.id("workOrders")),
    notes: v.optional(v.string()),
    weight: v.optional(v.float64()),
    hazmat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("shipments")
      .filter(q => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
    const num = `SHP-SIM-${(existing.length + 1).toString().padStart(3, "0")}`;
    const id = await ctx.db.insert("shipments", {
      organizationId: args.organizationId,
      shipmentNumber: num,
      type: args.type,
      status: "pending",
      carrier: args.carrier,
      trackingNumber: args.trackingNumber,
      originName: args.originName,
      destinationName: args.destinationName,
      workOrderId: args.workOrderId,
      weight: args.weight,
      hazmat: args.hazmat,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
    return { shipmentId: id, number: num };
  },
});

// ── List POs ──
export const listPOs = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("purchaseOrders")
      .filter(q => q.eq(q.field("orgId"), args.orgId))
      .collect();
  },
});

// ── List Shipments ──
export const listShipments = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("shipments")
      .filter(q => q.eq(q.field("organizationId"), args.orgId))
      .collect();
  },
});
