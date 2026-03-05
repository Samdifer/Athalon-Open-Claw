import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./shared/helpers/authHelpers";

const referenceTypeValidator = v.union(v.literal("pdf"), v.literal("link"), v.literal("file"));

export const listForTaskCard = query({
  args: {
    taskCardId: v.id("taskCards"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskStepReferences")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();
  },
});

export const addReference = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    stepId: v.id("taskCardSteps"),
    referenceType: referenceTypeValidator,
    title: v.string(),
    url: v.string(),
    notes: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<Id<"taskStepReferences">> => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId || step.organizationId !== args.organizationId) {
      throw new Error("Invalid task step reference target.");
    }

    return await ctx.db.insert("taskStepReferences", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      stepId: args.stepId,
      referenceType: args.referenceType,
      title: args.title.trim(),
      url: args.url.trim(),
      notes: args.notes?.trim() || undefined,
      documentId: args.documentId,
      storageId: args.storageId,
      createdByUserId: userId,
      createdAt: Date.now(),
    });
  },
});
