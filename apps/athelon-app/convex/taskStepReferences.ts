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
    await requireAuth(ctx);
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
    const now = Date.now();

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId || taskCard.workOrderId !== args.workOrderId) {
      throw new Error("Invalid task card reference target.");
    }
    if (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt) {
      throw new Error("Task card is signed/locked. Step references are immutable after sign-off.");
    }

    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId || step.organizationId !== args.organizationId) {
      throw new Error("Invalid task step reference target.");
    }

    const title = args.title.trim();
    const url = args.url.trim();
    if (!title) throw new Error("Reference title is required.");
    if (!url) throw new Error("Reference URL is required.");

    return await ctx.db.insert("taskStepReferences", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      stepId: args.stepId,
      referenceType: args.referenceType,
      title,
      url,
      notes: args.notes?.trim() || undefined,
      documentId: args.documentId,
      storageId: args.storageId,
      createdByUserId: userId,
      createdAt: now,
    });
  },
});
