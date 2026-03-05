import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./shared/helpers/authHelpers";

const eventTypeValidator = v.union(v.literal("installed"), v.literal("removed"));

export const listForTaskCard = query({
  args: { taskCardId: v.id("taskCards") },
  handler: async (ctx, args) => {
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

    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId || step.organizationId !== args.organizationId) {
      throw new Error("Invalid step for parts trace event.");
    }

    const traceId = await ctx.db.insert("taskStepPartTraceEvents", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      stepId: args.stepId,
      eventType: args.eventType,
      partId: args.partId,
      partNumber: args.partNumber,
      serialNumber: args.serialNumber,
      description: args.description,
      quantity: args.quantity,
      conditionAtRemoval: args.conditionAtRemoval,
      partCategory: args.partCategory,
      lotId: args.lotId,
      lotNumber: args.lotNumber,
      batchNumber: args.batchNumber,
      eightOneThirtyId: args.eightOneThirtyId,
      eightOneThirtyReference: args.eightOneThirtyReference,
      fromCustody: args.fromCustody,
      toCustody: args.toCustody,
      chainOfCustodyNote: args.chainOfCustodyNote,
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
        fromLocation: args.fromCustody,
        toLocation: args.toCustody,
        notes: args.chainOfCustodyNote,
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
      chainOfCustodyNote: args.reason,
      linkedEventId: prior._id,
      createdByUserId: userId,
      createdByTechnicianId: args.technicianId,
      createdAt: now,
    });
  },
});
