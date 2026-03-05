// convex/taskCompliance.ts
// Athelon — Aviation MRO SaaS Platform
//
// Task Compliance Items Module
//
// Per-task regulatory compliance tracking. Each compliance item links a task
// card to a specific reference (AD, SB, AMM, CMM, FAA approved data, Part 145,
// or other) and tracks its compliance status through a full history trail.
//
// This module is NOT a signed operation — compliance items are administrative
// tracking records, not maintenance entries requiring signature authority.
//
// Cross-references:
//   convex/schema.ts — taskComplianceItems table definition
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

const referenceTypeValidator = v.union(
  v.literal("ad"),
  v.literal("sb"),
  v.literal("amm"),
  v.literal("cmm"),
  v.literal("faa_approved_data"),
  v.literal("part_145"),
  v.literal("other"),
);

const complianceStatusValidator = v.union(
  v.literal("pending"),
  v.literal("compliant"),
  v.literal("non_compliant"),
  v.literal("deferred"),
  v.literal("na"),
);

async function assertMutableTaskCard(ctx: { db: { get: (id: Id<"taskCards">) => Promise<any> } }, taskCardId: Id<"taskCards">) {
  const taskCard = await ctx.db.get(taskCardId);
  if (!taskCard) {
    throw new Error(`Task card ${taskCardId} not found.`);
  }
  if (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt) {
    throw new Error("Task card is signed/locked. Compliance records are immutable after sign-off.");
  }
  return taskCard;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addComplianceItem
//
// Creates a new compliance item linked to a task card. The item starts in
// "pending" status with an empty history.
// ─────────────────────────────────────────────────────────────────────────────

export const addComplianceItem = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    referenceType: referenceTypeValidator,
    reference: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"taskComplianceItems">> => {
    await requireAuth(ctx);
    const now = Date.now();

    const taskCard = await assertMutableTaskCard(ctx, args.taskCardId);
    if (
      taskCard.workOrderId !== args.workOrderId ||
      taskCard.organizationId !== args.organizationId ||
      taskCard.aircraftId !== args.aircraftId
    ) {
      throw new Error("Task compliance target does not match task card/work-order/aircraft context.");
    }

    const reference = args.reference.trim();
    if (!reference) throw new Error("Compliance reference is required.");

    const id = await ctx.db.insert("taskComplianceItems", {
      taskCardId: args.taskCardId,
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      organizationId: args.organizationId,
      referenceType: args.referenceType,
      reference,
      description: args.description?.trim() || undefined,
      complianceStatus: "pending",
      history: [],
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateComplianceStatus
//
// Transitions a compliance item to a new status. The previous status is
// recorded in the history array for audit trail purposes.
// ─────────────────────────────────────────────────────────────────────────────

export const updateComplianceStatus = mutation({
  args: {
    itemId: v.id("taskComplianceItems"),
    status: complianceStatusValidator,
    notes: v.optional(v.string()),
    technicianId: v.id("technicians"),
    technicianName: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(args.itemId);
    if (!existing) {
      throw new Error(
        `Compliance item ${args.itemId as string} not found.`,
      );
    }

    await assertMutableTaskCard(ctx, existing.taskCardId);

    if (existing.complianceStatus === args.status) {
      return;
    }

    const historyEntry = {
      status: existing.complianceStatus,
      notes: args.notes?.trim() || undefined,
      changedByTechnicianId: args.technicianId,
      changedByName: args.technicianName.trim() || "Unknown",
      changedAt: Date.now(),
    };

    await ctx.db.patch(args.itemId, {
      complianceStatus: args.status,
      history: [...existing.history, historyEntry],
      updatedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: removeComplianceItem
//
// Deletes a compliance item. Items with recorded history cannot be deleted
// to prevent accidental destruction of compliance audit trails.
// ─────────────────────────────────────────────────────────────────────────────

export const removeComplianceItem = mutation({
  args: {
    itemId: v.id("taskComplianceItems"),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(args.itemId);
    if (!existing) {
      throw new Error(
        `Compliance item ${args.itemId as string} not found.`,
      );
    }

    await assertMutableTaskCard(ctx, existing.taskCardId);

    if (existing.history.length > 0) {
      throw new Error(
        "Cannot delete a compliance item with recorded history",
      );
    }

    await ctx.db.delete(args.itemId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getComplianceItemsForTask
//
// Returns all compliance items for a given task card, ordered by creation
// time ascending (oldest first).
// ─────────────────────────────────────────────────────────────────────────────

export const getComplianceItemsForTask = query({
  args: {
    taskCardId: v.id("taskCards"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const items = await ctx.db
      .query("taskComplianceItems")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .order("asc")
      .collect();

    return items;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getComplianceItemsForWorkOrder
//
// Returns all compliance items for a work order, grouped by task card.
// Each group includes a computed overallStatus:
//   - "non_compliant" if any item is non_compliant
//   - "issues_pending" if any item is pending
//   - "all_compliant" if all items are compliant or na
//   - "no_items" if the task has zero compliance items
// ─────────────────────────────────────────────────────────────────────────────

type OverallStatus = "non_compliant" | "issues_pending" | "all_compliant" | "no_items";

interface TaskComplianceGroup {
  taskCardId: Id<"taskCards">;
  items: Array<{
    _id: Id<"taskComplianceItems">;
    _creationTime: number;
    taskCardId: Id<"taskCards">;
    workOrderId: Id<"workOrders">;
    aircraftId: Id<"aircraft">;
    organizationId: Id<"organizations">;
    referenceType: string;
    reference: string;
    description?: string;
    complianceStatus: string;
    history: Array<{
      status: string;
      notes?: string;
      changedByTechnicianId: Id<"technicians">;
      changedByName: string;
      changedAt: number;
    }>;
    notes?: string;
    createdAt: number;
    updatedAt: number;
  }>;
  overallStatus: OverallStatus;
}

function computeOverallStatus(
  items: Array<{ complianceStatus: string }>,
): OverallStatus {
  if (items.length === 0) {
    return "no_items";
  }
  if (items.some((item) => item.complianceStatus === "non_compliant")) {
    return "non_compliant";
  }
  if (items.some((item) => item.complianceStatus === "pending")) {
    return "issues_pending";
  }
  return "all_compliant";
}

export const getComplianceItemsForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args): Promise<TaskComplianceGroup[]> => {
    await requireAuth(ctx);
    const allItems = await ctx.db
      .query("taskComplianceItems")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    // Group items by taskCardId
    const groupMap = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = item.taskCardId as string;
      const group = groupMap.get(key);
      if (group) {
        group.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    const result: TaskComplianceGroup[] = [];
    for (const [taskCardIdStr, items] of groupMap) {
      result.push({
        taskCardId: taskCardIdStr as Id<"taskCards">,
        items,
        overallStatus: computeOverallStatus(items),
      });
    }

    return result;
  },
});
