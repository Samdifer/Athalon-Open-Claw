// convex/physicalInventory.ts
// Athelon — Physical Inventory Count system

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

export const createInventoryCount = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.insert("inventoryCounts", {
      organizationId: args.orgId,
      name: args.name,
      status: "draft",
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const startCount = mutation({
  args: {
    countId: v.id("inventoryCounts"),
    countedBy: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const count = await ctx.db.get(args.countId);
    if (!count) throw new Error("Inventory count not found");
    if (count.status !== "draft") throw new Error("Count must be in draft status to start");

    // Populate items from current inventory (parts in "inventory" location)
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_location", (q) =>
        q.eq("organizationId", count.organizationId).eq("location", "inventory"),
      )
      .collect();

    // Group by partNumber to get quantities.
    // BUG-PC-09 fix: For non-serialized (batch) parts, use quantityOnHand
    // instead of counting each record as 1 unit. A single batch parts record
    // with quantityOnHand=50 was previously counted as 1, producing wildly
    // incorrect expected counts for physical inventory.
    const partGroups = new Map<string, { partName: string; partNumber: string; count: number; partId: string }>();
    for (const part of parts) {
      const key = part.partNumber;
      // For batch parts, use quantityOnHand; for serialized parts, count as 1
      const qty = part.isSerialized ? 1 : (part.quantityOnHand ?? 1);
      const existing = partGroups.get(key);
      if (existing) {
        existing.count += qty;
      } else {
        partGroups.set(key, {
          partName: part.partName,
          partNumber: part.partNumber,
          count: qty,
          partId: part._id as string,
        });
      }
    }

    for (const group of partGroups.values()) {
      await ctx.db.insert("inventoryCountItems", {
        countId: args.countId,
        organizationId: count.organizationId,
        partId: group.partId as any,
        partNumber: group.partNumber,
        partName: group.partName,
        expectedQuantity: group.count,
      });
    }

    await ctx.db.patch(args.countId, {
      status: "in_progress",
      startedAt: Date.now(),
      countedBy: args.countedBy,
    });
  },
});

export const recordItemCount = mutation({
  args: {
    itemId: v.id("inventoryCountItems"),
    actualQuantity: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Count item not found");
    await ctx.db.patch(args.itemId, {
      actualQuantity: args.actualQuantity,
      variance: args.actualQuantity - item.expectedQuantity,
      location: args.location,
      notes: args.notes,
      countedAt: Date.now(),
    });
  },
});

export const completeCount = mutation({
  args: { countId: v.id("inventoryCounts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const count = await ctx.db.get(args.countId);
    if (!count) throw new Error("Inventory count not found");
    if (count.status !== "in_progress") throw new Error("Count must be in progress to complete");

    await ctx.db.patch(args.countId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

export const reconcileCount = mutation({
  args: { countId: v.id("inventoryCounts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const count = await ctx.db.get(args.countId);
    if (!count) throw new Error("Inventory count not found");
    if (count.status !== "completed") throw new Error("Count must be completed before reconciliation");

    // Mark as reconciled (actual inventory adjustments would be a future enhancement)
    await ctx.db.patch(args.countId, { status: "reconciled" });
  },
});

export const listCounts = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventoryCounts")
      .withIndex("by_org", (q) => q.eq("organizationId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const getCountWithItems = query({
  args: { countId: v.id("inventoryCounts") },
  handler: async (ctx, args) => {
    const count = await ctx.db.get(args.countId);
    if (!count) return null;
    const items = await ctx.db
      .query("inventoryCountItems")
      .withIndex("by_count", (q) => q.eq("countId", args.countId))
      .collect();
    return { ...count, items };
  },
});

export const deleteCount = mutation({
  args: { countId: v.id("inventoryCounts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const count = await ctx.db.get(args.countId);
    if (!count) throw new Error("Inventory count not found");
    if (count.status !== "draft") throw new Error("Only draft counts can be deleted");
    // Delete items
    const items = await ctx.db
      .query("inventoryCountItems")
      .withIndex("by_count", (q) => q.eq("countId", args.countId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.countId);
  },
});
