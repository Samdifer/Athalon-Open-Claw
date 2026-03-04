import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { workOrderId: v.optional(v.id("workOrders")), taskCardId: v.optional(v.id("taskCards")) },
  handler: async (ctx, args) => {
    if (args.taskCardId) {
      return await ctx.db
        .query("voiceNotes")
        .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
        .collect();
    }
    if (args.workOrderId) {
      return await ctx.db
        .query("voiceNotes")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect();
    }
    return [];
  },
});

export const get = query({
  args: { id: v.id("voiceNotes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskCardStepId: v.optional(v.id("taskCardSteps")),
    technicianId: v.id("technicians"),
    audioStorageId: v.optional(v.id("_storage")),
    audioDurationSeconds: v.optional(v.number()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("voiceNotes", {
      ...args,
      transcriptionStatus: args.transcript ? "manual" : "pending",
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTranscript = mutation({
  args: {
    id: v.id("voiceNotes"),
    transcript: v.string(),
    transcriptionStatus: v.optional(v.union(
      v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("manual")
    )),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      transcript: args.transcript,
      transcriptionStatus: args.transcriptionStatus ?? "manual",
      isEdited: true,
      transcribedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("voiceNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (note?.audioStorageId) {
      await ctx.storage.delete(note.audioStorageId);
    }
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
