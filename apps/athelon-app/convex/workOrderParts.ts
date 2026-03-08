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

    const now = Date.now();

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      updatedAt: now,
    });

    // BUG-PC-11 fix: If the request linked to a specific part and that part has
    // a reservation pointing to this work order, release it on cancellation.
    // Previously, cancelling a request that had triggered a "reserved" partHistory
    // event left a dangling soft-reservation with no corresponding release.
    if (record.partId) {
      const part = await ctx.db.get(record.partId);
      if (
        part &&
        part.reservedForWorkOrderId &&
        String(part.reservedForWorkOrderId) === String(record.workOrderId)
      ) {
        await ctx.db.patch(record.partId, {
          reservedForWorkOrderId: undefined,
          reservedByTechnicianId: undefined,
          reservedAt: undefined,
          updatedAt: now,
        });

        await ctx.runMutation(internal.partHistory.recordEvent, {
          organizationId: record.organizationId,
          partId: record.partId,
          workOrderId: record.workOrderId,
          eventType: "reservation_released",
          performedByUserId: "system",
          notes: `Reservation released — part request cancelled`,
        });
      }
    }
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

    // BUG-PC-03 fix: Guard against parts still in pending_inspection (INV-23).
    // Parts must pass receiving inspection before issuance.
    if (part.location === "pending_inspection") {
      throw new Error(
        `PART_NOT_INSPECTED: Part ${args.partId} is in "pending_inspection" and ` +
        `cannot be issued until receiving inspection is completed (INV-23). ` +
        `Complete the receiving inspection first via completeReceivingInspection.`,
      );
    }

    if (part.location !== "inventory") {
      throw new Error(
        `Part is not available for issuance — current location is "${part.location}".`,
      );
    }

    // BUG-PC-04 fix: Prevent issuing a part already reserved for a DIFFERENT work order.
    if (
      part.reservedForWorkOrderId &&
      String(part.reservedForWorkOrderId) !== String(record.workOrderId)
    ) {
      throw new Error(
        `PART_RESERVED_ELSEWHERE: Part ${args.partId} is already reserved for ` +
        `work order ${part.reservedForWorkOrderId}. Release the reservation first ` +
        `or select a different part.`,
      );
    }

    // NOTE: Idempotency for rapid duplicate clicks is enforced by the
    // reservation conflict guard + request status transition to "issued".
    // Once issued, subsequent calls will fail the status precondition above.

    const now = Date.now();
    const previousLocation = part.location;

    // BUG-PC-01 fix: Actually transition location from "inventory" to "issued"
    // so the part is no longer available for other work orders. Previously only
    // reservedForWorkOrderId was set, leaving location as "inventory" — meaning
    // the part could be double-issued to multiple WOs.
    //
    // Note: "issued" is not a valid location in the parts schema enum. We use a
    // two-field approach: location stays "inventory" but reservedForWorkOrderId
    // acts as the issued lock. The real fix is the reservation conflict guard
    // above (BUG-PC-04) which prevents double-issue.
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

    // BUG-PC-08 fix: Validate return quantity doesn't exceed issued quantity.
    if (args.quantityReturned <= 0) {
      throw new Error("quantityReturned must be > 0.");
    }
    const totalReturned = (record.quantityReturned ?? 0) + args.quantityReturned;
    if (totalReturned > record.quantityIssued) {
      throw new Error(
        `RETURN_EXCEEDS_ISSUED: Cannot return ${args.quantityReturned} units — ` +
        `total returned (${totalReturned}) would exceed issued quantity (${record.quantityIssued}). ` +
        `Already returned: ${record.quantityReturned ?? 0}.`,
      );
    }

    const part = await ctx.db.get(record.partId);
    if (!part) {
      throw new Error("Linked inventory part not found.");
    }

    const now = Date.now();
    const fullyReturned = totalReturned >= record.quantityIssued;

    // Restore part to inventory — clear reservation fields
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
        // BUG-PC-07 fix: Clear reservation fields on install and set the
        // work order reference on installedByWorkOrderId (consistent with
        // parts.ts installPart). Also fetch the WO to get the aircraftId
        // so currentAircraftId is populated (previously omitted, creating
        // inconsistency between this path and parts.ts installPart).
        const workOrder = await ctx.db.get(record.workOrderId);
        await ctx.db.patch(record.partId, {
          location: "installed",
          installedOnWorkOrderId: record.workOrderId,
          installedByWorkOrderId: record.workOrderId,
          installedAt: now,
          // Propagate aircraft reference from the work order (if available)
          currentAircraftId: workOrder?.aircraftId,
          // Clear reservation fields — part is now installed, not reserved
          reservedForWorkOrderId: undefined,
          reservedByTechnicianId: undefined,
          reservedAt: undefined,
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
