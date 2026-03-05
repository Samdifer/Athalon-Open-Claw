// convex/taskCardVendorServices.ts
// Athelon — Aviation MRO SaaS Platform
//
// Task Card Vendor Services Module
//
// Links vendor services to specific task cards on work orders. Tracks the
// lifecycle of outsourced work (planned → sent_for_work → in_progress →
// completed). Denormalized vendor/service names survive vendor edits for
// audit trail integrity.
//
// Cross-references:
//   convex/schema.ts — taskCardVendorServices table definition
//   convex/vendors.ts — vendor and vendorServices operations
//   convex/taskCards.ts — parent task card operations
//
// ─────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./shared/helpers/authHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const vendorServiceStatusValidator = v.union(
  v.literal("planned"),
  v.literal("sent_for_work"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addVendorServiceToTask
//
// Attaches a vendor service to a task card. The record starts in "planned"
// status. Vendor name and service name are denormalized at creation time.
// ─────────────────────────────────────────────────────────────────────────────

/** Adds a vendor service attachment to a task card. */
export const addVendorServiceToTask = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    vendorId: v.id("vendors"),
    vendorServiceId: v.optional(v.id("vendorServices")),
    vendorName: v.string(),
    serviceName: v.string(),
    serviceType: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"taskCardVendorServices">> => {
    const now = Date.now();
    const userId = await requireAuth(ctx);

    const id = await ctx.db.insert("taskCardVendorServices", {
      taskCardId: args.taskCardId,
      workOrderId: args.workOrderId,
      organizationId: args.organizationId,
      vendorId: args.vendorId,
      vendorServiceId: args.vendorServiceId,
      vendorName: args.vendorName,
      serviceName: args.serviceName,
      serviceType: args.serviceType,
      status: "planned",
      estimatedCost: args.estimatedCost,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("taskCardVendorServiceStatusHistory", {
      taskCardVendorServiceId: id,
      taskCardId: args.taskCardId,
      workOrderId: args.workOrderId,
      organizationId: args.organizationId,
      toStatus: "planned",
      actualCost: args.estimatedCost,
      notes: args.notes,
      changedByUserId: userId,
      createdAt: now,
    });

    return id;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateVendorServiceStatus
//
// Advances the status of an outsourced vendor service on a task card.
// Optionally records the actual cost and additional notes.
// ─────────────────────────────────────────────────────────────────────────────

/** Updates the status (and optionally cost/notes) of a task card vendor service. */
export const updateVendorServiceStatus = mutation({
  args: {
    id: v.id("taskCardVendorServices"),
    status: vendorServiceStatusValidator,
    actualCost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const userId = await requireAuth(ctx);

    const record = await ctx.db.get(args.id);
    if (!record) {
      throw new Error(`Task card vendor service ${args.id} not found.`);
    }

    const patch: Record<string, string | number> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.actualCost !== undefined) patch.actualCost = args.actualCost;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.id, patch);

    await ctx.db.insert("taskCardVendorServiceStatusHistory", {
      taskCardVendorServiceId: record._id,
      taskCardId: record.taskCardId,
      workOrderId: record.workOrderId,
      organizationId: record.organizationId,
      fromStatus: record.status,
      toStatus: args.status,
      actualCost: args.actualCost,
      notes: args.notes,
      changedByUserId: userId,
      createdAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: removeVendorServiceFromTask
//
// Soft-deletes a vendor service from a task card by setting status to
// "cancelled". Does NOT hard-delete the record.
// ─────────────────────────────────────────────────────────────────────────────

/** Soft-deletes a vendor service attachment by setting status to cancelled. */
export const removeVendorServiceFromTask = mutation({
  args: {
    id: v.id("taskCardVendorServices"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const userId = await requireAuth(ctx);

    const record = await ctx.db.get(args.id);
    if (!record) {
      throw new Error(`Task card vendor service ${args.id} not found.`);
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
      updatedAt: now,
    });

    await ctx.db.insert("taskCardVendorServiceStatusHistory", {
      taskCardVendorServiceId: record._id,
      taskCardId: record.taskCardId,
      workOrderId: record.workOrderId,
      organizationId: record.organizationId,
      fromStatus: record.status,
      toStatus: "cancelled",
      changedByUserId: userId,
      createdAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getVendorServicesForTask
//
// Returns all non-cancelled vendor service records for a given task card.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists active (non-cancelled) vendor services for a task card. */
export const getVendorServicesForTask = query({
  args: {
    taskCardId: v.id("taskCards"),
  },

  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("taskCardVendorServices")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();

    return records.filter((r) => r.status !== "cancelled");
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getVendorServicesForWorkOrder
//
// Returns all non-cancelled vendor service records for a given work order.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists active (non-cancelled) vendor services for a work order. */
export const getVendorServicesForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("taskCardVendorServices")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    return records.filter((r) => r.status !== "cancelled");
  },
});

export const listStatusHistoryForTask = query({
  args: {
    taskCardId: v.id("taskCards"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("taskCardVendorServiceStatusHistory")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});
