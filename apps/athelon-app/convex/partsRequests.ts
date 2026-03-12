import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createPartRequest = mutation({
  args: {
    organizationId: v.string(),
    workOrderId: v.id("workOrders"),
    taskCardId: v.optional(v.id("taskCards")),
    technicianId: v.optional(v.id("technicians")),
    requestedBy: v.string(),
    partNumber: v.string(),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("partsRequests", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      technicianId: args.technicianId,
      requestedBy: args.requestedBy,
      requestedAt: now,
      status: "pending",
      partNumber: args.partNumber.trim().toUpperCase(),
      quantity: Math.max(1, args.quantity),
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const updatePartRequestStatus = mutation({
  args: {
    requestId: v.id("partsRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("ordered"),
      v.literal("received"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.requestId);
    if (!record) {
      throw new Error("Parts request not found.");
    }
    await ctx.db.patch(args.requestId, { status: args.status });
  },
});

export const listPartRequestsForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("partsRequests")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();
    return records.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

export const listPartRequestsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("partsRequests")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    return records.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});
