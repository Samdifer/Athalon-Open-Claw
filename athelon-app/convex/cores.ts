// convex/cores.ts
// Athelon — Aviation MRO SaaS Platform
// Core exchange and credit tracking

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";
import { getNextNumber } from "./lib/numberGenerator";

export const createCoreReturn = mutation({
  args: {
    organizationId: v.id("organizations"),
    partId: v.id("parts"),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    vendorId: v.optional(v.id("vendors")),
    workOrderId: v.optional(v.id("workOrders")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    coreValue: v.number(),
    returnDueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const coreNumber = await getNextNumber(ctx, args.organizationId, "core", "CORE");
    return ctx.db.insert("coreTracking", {
      ...args,
      coreNumber,
      status: "awaiting_return",
      createdAt: Date.now(),
    });
  },
});

export const markCoreReceived = mutation({
  args: { coreId: v.id("coreTracking") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.coreId, { status: "received", returnedAt: Date.now() });
  },
});

export const markCoreInspected = mutation({
  args: { coreId: v.id("coreTracking") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.coreId, { status: "inspected", inspectedAt: Date.now() });
  },
});

export const issueCoreCredit = mutation({
  args: {
    coreId: v.id("coreTracking"),
    creditAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.coreId, {
      status: "credit_issued",
      creditAmount: args.creditAmount,
      creditIssuedAt: Date.now(),
    });
  },
});

export const scrapCore = mutation({
  args: {
    coreId: v.id("coreTracking"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = { status: "scrapped" };
    if (args.notes !== undefined) patch.notes = args.notes;
    await ctx.db.patch(args.coreId, patch);
  },
});

export const listCores = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("awaiting_return"),
      v.literal("received"),
      v.literal("inspected"),
      v.literal("credit_issued"),
      v.literal("scrapped"),
      v.literal("overdue"),
    )),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("coreTracking")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!),
        )
        .collect();
    }
    return ctx.db
      .query("coreTracking")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

export const getCoreDetail = query({
  args: { coreId: v.id("coreTracking") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.coreId);
  },
});

export const listOverdueCores = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cores = await ctx.db
      .query("coreTracking")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "awaiting_return"),
      )
      .collect();
    return cores.filter((c) => c.returnDueDate && c.returnDueDate < now);
  },
});
