// convex/conformityInspections.ts
// Athelon — Aviation MRO SaaS Platform
//
// Conformity inspections: buy-back, final, and in-process inspections
// performed by IA-qualified inspectors on task cards within work orders.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createConformityInspection
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new conformity inspection in "pending" status. */
export const createConformityInspection = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    inspectorTechnicianId: v.id("technicians"),
    inspectionType: v.union(v.literal("buy_back"), v.literal("final"), v.literal("in_process")),
    stepsReviewed: v.optional(v.array(v.id("taskCardSteps"))),
    approvedDataReference: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"conformityInspections">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // Validate org
    const org = await ctx.db.get(args.organizationId);
    if (!org || !org.active) throw new Error(`Organization ${args.organizationId} not found or inactive.`);

    // Validate work order belongs to org
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo || wo.organizationId !== args.organizationId) {
      throw new Error(`Work order ${args.workOrderId} not found or does not belong to org.`);
    }

    // Validate task card belongs to work order
    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.workOrderId !== args.workOrderId) {
      throw new Error(`Task card ${args.taskCardId} not found or does not belong to work order.`);
    }

    // Validate inspector is active
    const inspector = await ctx.db.get(args.inspectorTechnicianId);
    if (!inspector || inspector.status !== "active") {
      throw new Error(`Inspector technician ${args.inspectorTechnicianId} not found or not active.`);
    }

    const inspectionId = await ctx.db.insert("conformityInspections", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      inspectorTechnicianId: args.inspectorTechnicianId,
      inspectionType: args.inspectionType,
      status: "pending",
      stepsReviewed: args.stepsReviewed,
      approvedDataReference: args.approvedDataReference,
      createdAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "conformityInspections",
      recordId: inspectionId,
      userId: callerUserId,
      notes: `Conformity inspection (${args.inspectionType}) created for task card ${taskCard.taskCardNumber} on WO ${wo.workOrderNumber}.`,
      timestamp: now,
    });

    return inspectionId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: completeConformityInspection
// ─────────────────────────────────────────────────────────────────────────────

/** Marks a pending conformity inspection as passed, failed, or conditional. */
export const completeConformityInspection = mutation({
  args: {
    organizationId: v.id("organizations"),
    inspectionId: v.id("conformityInspections"),
    status: v.union(v.literal("passed"), v.literal("failed"), v.literal("conditional")),
    findings: v.optional(v.string()),
    stepsReviewed: v.optional(v.array(v.id("taskCardSteps"))),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error(`Conformity inspection ${args.inspectionId} not found.`);
    if (inspection.organizationId !== args.organizationId) {
      throw new Error(`Inspection does not belong to organization ${args.organizationId}.`);
    }
    if (inspection.status !== "pending") {
      throw new Error(
        `Inspection ${args.inspectionId} is already in status "${inspection.status}". ` +
        `Only pending inspections can be completed.`,
      );
    }

    await ctx.db.patch(args.inspectionId, {
      status: args.status,
      findings: args.findings,
      stepsReviewed: args.stepsReviewed ?? inspection.stepsReviewed,
      completedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "conformityInspections",
      recordId: args.inspectionId,
      userId: callerUserId,
      notes: `Conformity inspection completed with status "${args.status}".${args.findings ? ` Findings: ${args.findings}` : ""}`,
      timestamp: now,
    });

    return { inspectionId: args.inspectionId, status: args.status };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listByWorkOrder
// ─────────────────────────────────────────────────────────────────────────────

/** Lists all conformity inspections for a given work order. */
export const listByWorkOrder = query({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("conformityInspections")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listByTaskCard
// ─────────────────────────────────────────────────────────────────────────────

/** Lists all conformity inspections for a specific task card. */
export const listByTaskCard = query({
  args: {
    organizationId: v.id("organizations"),
    taskCardId: v.id("taskCards"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("conformityInspections")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listByOrg  (MBP-0118)
//
// Lists all conformity inspections for an organization, ordered by creation.
// ─────────────────────────────────────────────────────────────────────────────

export const listInspectionsByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("conformityInspections")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getById  (MBP-0118)
//
// Returns a single conformity inspection by ID, with org-scoped access check.
// ─────────────────────────────────────────────────────────────────────────────

export const getById = query({
  args: {
    organizationId: v.id("organizations"),
    inspectionId: v.id("conformityInspections"),
  },

  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) return null;
    if (inspection.organizationId !== args.organizationId) return null;
    return inspection;
  },
});
