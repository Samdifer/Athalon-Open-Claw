import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./shared/helpers/authHelpers";

const eventTypeValidator = v.union(v.literal("installed"), v.literal("removed"));

export const listForTaskCard = query({
  args: { taskCardId: v.id("taskCards") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const events = await ctx.db
      .query("taskStepPartTraceEvents")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();
    return events.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addTraceEvent = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    stepId: v.id("taskCardSteps"),
    eventType: eventTypeValidator,
    partId: v.optional(v.id("parts")),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    conditionAtRemoval: v.optional(v.union(v.literal("serviceable"), v.literal("unserviceable"), v.literal("scrap"))),
    partCategory: v.optional(v.string()),
    lotId: v.optional(v.id("lots")),
    lotNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),
    eightOneThirtyReference: v.optional(v.string()),
    fromCustody: v.optional(v.string()),
    toCustody: v.optional(v.string()),
    chainOfCustodyNote: v.optional(v.string()),
    technicianId: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args): Promise<Id<"taskStepPartTraceEvents">> => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId || taskCard.workOrderId !== args.workOrderId) {
      throw new Error("Invalid task card for parts trace event.");
    }
    if (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt) {
      throw new Error("Task card is signed/locked. Parts trace records are immutable after sign-off.");
    }

    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId || step.organizationId !== args.organizationId) {
      throw new Error("Invalid step for parts trace event.");
    }

    const partNumber = args.partNumber.trim();
    const description = args.description.trim();
    const fromCustody = args.fromCustody?.trim();
    const toCustody = args.toCustody?.trim();
    if (!partNumber) throw new Error("Part number is required.");
    if (!description) throw new Error("Part description is required.");
    if (!fromCustody || !toCustody) {
      throw new Error("Chain-of-custody requires both fromCustody and toCustody.");
    }

    if (args.eventType === "installed") {
      if (args.quantity === undefined || args.quantity <= 0) {
        throw new Error("Installed part events require a quantity greater than zero.");
      }
    }

    if (args.eventType === "removed" && !args.conditionAtRemoval) {
      throw new Error("Removed part events require conditionAtRemoval.");
    }

    const traceId = await ctx.db.insert("taskStepPartTraceEvents", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      stepId: args.stepId,
      eventType: args.eventType,
      partId: args.partId,
      partNumber,
      serialNumber: args.serialNumber?.trim() || undefined,
      description,
      quantity: args.quantity,
      conditionAtRemoval: args.conditionAtRemoval,
      partCategory: args.partCategory?.trim() || undefined,
      lotId: args.lotId,
      lotNumber: args.lotNumber?.trim() || undefined,
      batchNumber: args.batchNumber?.trim() || undefined,
      eightOneThirtyId: args.eightOneThirtyId,
      eightOneThirtyReference: args.eightOneThirtyReference?.trim() || undefined,
      fromCustody,
      toCustody,
      chainOfCustodyNote: args.chainOfCustodyNote?.trim() || undefined,
      createdByUserId: userId,
      createdByTechnicianId: args.technicianId,
      createdAt: now,
    });

    if (args.partId) {
      await ctx.db.insert("partHistory", {
        organizationId: args.organizationId,
        partId: args.partId,
        eventType: args.eventType,
        workOrderId: args.workOrderId,
        performedByUserId: userId,
        performedByTechnicianId: args.technicianId,
        fromLocation: fromCustody,
        toLocation: toCustody,
        notes: args.chainOfCustodyNote?.trim() || undefined,
        createdAt: now,
      });
    }

    return traceId;
  },
});

export const voidTraceEvent = mutation({
  args: {
    eventId: v.id("taskStepPartTraceEvents"),
    reason: v.string(),
    technicianId: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args): Promise<Id<"taskStepPartTraceEvents">> => {
    const userId = await requireAuth(ctx);
    const prior = await ctx.db.get(args.eventId);
    if (!prior) throw new Error("Trace event not found.");

    if (prior.eventType === "voided") {
      throw new Error("Cannot void a voided trace event.");
    }

    const reason = args.reason.trim();
    if (!reason) throw new Error("Void reason is required.");

    const taskCard = await ctx.db.get(prior.taskCardId);
    if (!taskCard) throw new Error("Task card not found for trace event.");
    if (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt) {
      throw new Error("Task card is signed/locked. Trace events cannot be voided after sign-off.");
    }

    const now = Date.now();

    return await ctx.db.insert("taskStepPartTraceEvents", {
      organizationId: prior.organizationId,
      workOrderId: prior.workOrderId,
      taskCardId: prior.taskCardId,
      stepId: prior.stepId,
      eventType: "voided",
      partId: prior.partId,
      partNumber: prior.partNumber,
      serialNumber: prior.serialNumber,
      description: prior.description,
      quantity: prior.quantity,
      conditionAtRemoval: prior.conditionAtRemoval,
      partCategory: prior.partCategory,
      lotId: prior.lotId,
      lotNumber: prior.lotNumber,
      batchNumber: prior.batchNumber,
      eightOneThirtyId: prior.eightOneThirtyId,
      eightOneThirtyReference: prior.eightOneThirtyReference,
      fromCustody: prior.toCustody,
      toCustody: prior.fromCustody,
      chainOfCustodyNote: reason,
      linkedEventId: prior._id,
      createdByUserId: userId,
      createdByTechnicianId: args.technicianId,
      createdAt: now,
    });
  },
});
