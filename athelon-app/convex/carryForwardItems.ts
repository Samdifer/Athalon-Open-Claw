import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByAircraft = query({
  args: {
    aircraftId: v.id("aircraft"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("carryForwardItems")
      .withIndex("by_aircraft", (q) =>
        q.eq("aircraftId", args.aircraftId).eq("status", "open"),
      )
      .collect();
  },
});

export const listByOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("carryForwardItems")
      .withIndex("by_org", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "open"),
      )
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createFromWOClose = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    items: v.array(
      v.object({
        description: v.string(),
        category: v.union(
          v.literal("deferred_maintenance"),
          v.literal("note"),
          v.literal("ad_tracking"),
        ),
        priority: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
          v.literal("critical"),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);

    const now = Date.now();
    const ids: string[] = [];

    for (const item of args.items) {
      const id = await ctx.db.insert("carryForwardItems", {
        aircraftId: wo.aircraftId,
        organizationId: args.organizationId,
        sourceWorkOrderId: args.workOrderId,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: "open",
        createdAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});

export const consumeByQuote = mutation({
  args: {
    itemId: v.id("carryForwardItems"),
    quoteId: v.id("quotes"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Carry-forward item not found.");
    if (item.status !== "open") throw new Error("Item is not open.");

    await ctx.db.patch(args.itemId, {
      status: "consumed",
      consumedByQuoteId: args.quoteId,
    });
  },
});

export const consumeByWO = mutation({
  args: {
    itemId: v.id("carryForwardItems"),
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Carry-forward item not found.");
    if (item.status !== "open") throw new Error("Item is not open.");

    await ctx.db.patch(args.itemId, {
      status: "consumed",
      consumedByWorkOrderId: args.workOrderId,
    });
  },
});

export const dismiss = mutation({
  args: {
    itemId: v.id("carryForwardItems"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Carry-forward item not found.");
    if (item.status !== "open") throw new Error("Item is not open.");

    await ctx.db.patch(args.itemId, {
      status: "dismissed",
      dismissedReason: args.reason,
    });
  },
});
