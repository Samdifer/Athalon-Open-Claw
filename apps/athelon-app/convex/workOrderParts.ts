// convex/workOrderParts.ts
// Athelon — Aviation MRO SaaS Platform
//
// Work Order Parts Integration — Phase 5
//
// Manages the lifecycle of parts requested, issued, installed, and returned
// on individual work orders. Bridges the parts inventory module with the
// work order execution flow.
//
// Key flows:
//   requestPart → issuePart → markInstalled  (happy path)
//   requestPart → cancelRequest              (cancelled before fulfillment)
//   issuePart → returnPart                   (unused part returned to stock)

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: requestPart
//
// Technician requests a part for a work order. Creates a workOrderParts
// record with status "requested". If a specific inventory part is
// referenced (partId), records a "reserved" event in partHistory.
// ─────────────────────────────────────────────────────────────────────────────

export const requestPart = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    partNumber: v.string(),
    partName: v.string(),
    quantityRequested: v.number(),
    notes: v.optional(v.string()),
    requestedByTechnicianId: v.optional(v.id("technicians")),
    partId: v.optional(v.id("parts")),
    unitCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const wopId = await ctx.db.insert("workOrderParts", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      partId: args.partId,
      partNumber: args.partNumber.trim().toUpperCase(),
      partName: args.partName.trim(),
      status: "requested",
      quantityRequested: Math.max(1, args.quantityRequested),
      quantityIssued: 0,
      quantityReturned: 0,
      unitCost: args.unitCost,
      totalCost: args.unitCost
        ? args.unitCost * Math.max(1, args.quantityRequested)
        : undefined,
      requestedByTechnicianId: args.requestedByTechnicianId,
      notes: args.notes?.trim() || undefined,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // If selecting from existing inventory, record a reservation event
    if (args.partId) {
      await ctx.runMutation(internal.partHistory.recordEvent, {
        organizationId: args.organizationId,
        partId: args.partId,
        workOrderId: args.workOrderId,
        eventType: "reserved",
        performedByUserId: "system",
        notes: `Reserved for WO via parts request`,
      });
    }

    return wopId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: cancelRequest
//
// Cancels a pending part request. Only valid when status is "requested".
// ─────────────────────────────────────────────────────────────────────────────

export const cancelRequest = mutation({
  args: {
    requestId: v.id("workOrderParts"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.requestId);
    if (!record) {
      throw new Error("Work order part request not found.");
    }
    if (record.status !== "requested") {
      throw new Error(
        `Cannot cancel request — current status is "${record.status}". Only "requested" items can be cancelled.`,
      );
    }

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: issuePart
//
// Issues a specific part from inventory to fulfill a work order request.
// Updates both the workOrderParts record and the underlying parts record.
// Records an "issued_to_wo" event in partHistory.
// ─────────────────────────────────────────────────────────────────────────────

export const issuePart = mutation({
  args: {
    requestId: v.id("workOrderParts"),
    partId: v.id("parts"),
    issuedByTechnicianId: v.optional(v.id("technicians")),
    performedByUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.requestId);
    if (!record) {
      throw new Error("Work order part request not found.");
    }
    if (record.status !== "requested" && record.status !== "ordered" && record.status !== "received") {
      throw new Error(
        `Cannot issue part — current request status is "${record.status}". Must be "requested", "ordered", or "received".`,
      );
    }

    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error("Part not found in inventory.");
    }
    if (part.location !== "inventory") {
      throw new Error(
        `Part is not available for issuance — current location is "${part.location}".`,
      );
    }

    const now = Date.now();
    const previousLocation = part.location;

    // Update the inventory part: reserve for this work order
    await ctx.db.patch(args.partId, {
      reservedForWorkOrderId: record.workOrderId,
      reservedByTechnicianId: args.issuedByTechnicianId,
      reservedAt: now,
      updatedAt: now,
    });

    // Update the workOrderParts record
    await ctx.db.patch(args.requestId, {
      status: "issued",
      partId: args.partId,
      quantityIssued: record.quantityRequested,
      issuedByTechnicianId: args.issuedByTechnicianId,
      issuedAt: now,
      unitCost: record.unitCost ?? part.unitCost,
      totalCost: (record.unitCost ?? part.unitCost)
        ? (record.unitCost ?? part.unitCost ?? 0) * record.quantityRequested
        : undefined,
      updatedAt: now,
    });

    // Record audit event
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: record.organizationId,
      partId: args.partId,
      workOrderId: record.workOrderId,
      eventType: "issued_to_wo",
      performedByUserId: args.performedByUserId ?? "system",
      performedByTechnicianId: args.issuedByTechnicianId,
      fromLocation: previousLocation,
      toLocation: "issued",
      notes: `Issued to work order`,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: returnPart
//
// Returns an unused or partially-used part from a work order back to
// inventory. Updates the workOrderParts record and restores the part's
// inventory status. Records a "returned_from_wo" event.
// ─────────────────────────────────────────────────────────────────────────────

export const returnPart = mutation({
  args: {
    requestId: v.id("workOrderParts"),
    quantityReturned: v.number(),
    performedByUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.requestId);
    if (!record) {
      throw new Error("Work order part request not found.");
    }
    if (record.status !== "issued") {
      throw new Error(
        `Cannot return part — current status is "${record.status}". Only "issued" parts can be returned.`,
      );
    }
    if (!record.partId) {
      throw new Error("Cannot return part — no inventory part linked to this request.");
    }

    const part = await ctx.db.get(record.partId);
    if (!part) {
      throw new Error("Linked inventory part not found.");
    }

    const now = Date.now();
    const totalReturned = (record.quantityReturned ?? 0) + args.quantityReturned;
    const fullyReturned = totalReturned >= record.quantityRequested;

    // Restore part to inventory
    await ctx.db.patch(record.partId, {
      location: "inventory",
      reservedForWorkOrderId: undefined,
      reservedByTechnicianId: undefined,
      reservedAt: undefined,
      updatedAt: now,
    });

    // Update workOrderParts record
    await ctx.db.patch(args.requestId, {
      quantityReturned: totalReturned,
      status: fullyReturned ? "returned" : "issued",
      returnedAt: now,
      updatedAt: now,
    });

    // Record audit event
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: record.organizationId,
      partId: record.partId,
      workOrderId: record.workOrderId,
      eventType: "returned_from_wo",
      performedByUserId: args.performedByUserId ?? "system",
      fromLocation: "issued",
      toLocation: "inventory",
      notes: `Returned ${args.quantityReturned} unit(s) from work order`,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: markInstalled
//
// Marks a part as installed on the aircraft. Updates the workOrderParts
// record status and records an "installed" event.
// ─────────────────────────────────────────────────────────────────────────────

export const markInstalled = mutation({
  args: {
    requestId: v.id("workOrderParts"),
    performedByUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.requestId);
    if (!record) {
      throw new Error("Work order part request not found.");
    }
    if (record.status !== "issued") {
      throw new Error(
        `Cannot mark as installed — current status is "${record.status}". Part must be "issued" first.`,
      );
    }

    const now = Date.now();

    await ctx.db.patch(args.requestId, {
      status: "installed",
      installedAt: now,
      updatedAt: now,
    });

    // If linked to an inventory part, update its location
    if (record.partId) {
      const part = await ctx.db.get(record.partId);
      if (part) {
        await ctx.db.patch(record.partId, {
          location: "installed",
          installedOnWorkOrderId: record.workOrderId,
          installedAt: now,
          updatedAt: now,
        });
      }

      // Record audit event
      await ctx.runMutation(internal.partHistory.recordEvent, {
        organizationId: record.organizationId,
        partId: record.partId,
        workOrderId: record.workOrderId,
        eventType: "installed",
        performedByUserId: args.performedByUserId ?? "system",
        fromLocation: "issued",
        toLocation: "installed",
        notes: `Installed on aircraft via work order`,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listForWorkOrder
//
// Returns all workOrderParts records for a given work order, sorted by
// creation time (newest first).
// ─────────────────────────────────────────────────────────────────────────────

export const listForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("workOrderParts")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listOpenRequests
//
// Returns all open ("requested") part requests across all work orders
// for a given organization. Used by the parts manager queue.
// ─────────────────────────────────────────────────────────────────────────────

export const listOpenRequests = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("workOrderParts")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "requested"),
      )
      .collect();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPartsCostForWO
//
// Computes the total parts cost and billable amount for a work order.
// Only counts non-cancelled, non-returned items.
// ─────────────────────────────────────────────────────────────────────────────

export const getPartsCostForWO = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("workOrderParts")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const activeRecords = records.filter(
      (r) => r.status !== "cancelled" && r.status !== "returned",
    );

    let totalCost = 0;
    let billableAmount = 0;
    let itemCount = 0;

    for (const record of activeRecords) {
      itemCount++;
      if (record.totalCost) {
        totalCost += record.totalCost;
      }
      if (record.billableAmount) {
        billableAmount += record.billableAmount;
      } else if (record.totalCost) {
        // Default billable = cost + markup
        const markup = record.markupPercent ?? 0;
        billableAmount += record.totalCost * (1 + markup / 100);
      }
    }

    return { totalCost, billableAmount, itemCount };
  },
});
