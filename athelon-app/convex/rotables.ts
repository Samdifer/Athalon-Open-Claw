import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    shopLocationId: v.optional(v.union(v.id("shopLocations"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("rotables")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    let filtered = all;
    if (args.shopLocationId && args.shopLocationId !== "all") {
      filtered = filtered.filter((row) => row.shopLocationId === args.shopLocationId);
    }
    if (args.status) return filtered.filter((r) => r.status === args.status);
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("rotables") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getHistory = query({
  args: { rotableId: v.id("rotables") },
  handler: async (ctx, args) => {
    return await ctx.db.query("rotableHistory").withIndex("by_rotable", (q) => q.eq("rotableId", args.rotableId)).collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    partNumber: v.string(),
    serialNumber: v.string(),
    description: v.string(),
    status: v.union(v.literal("installed"), v.literal("serviceable"), v.literal("in_shop"), v.literal("at_vendor"), v.literal("condemned"), v.literal("loaned_out")),
    condition: v.union(v.literal("serviceable"), v.literal("unserviceable"), v.literal("overhauled"), v.literal("repaired"), v.literal("inspected")),
    aircraftId: v.optional(v.id("aircraft")),
    positionCode: v.optional(v.string()),
    tsnHours: v.optional(v.number()),
    tsnCycles: v.optional(v.number()),
    tsoHours: v.optional(v.number()),
    tsoCycles: v.optional(v.number()),
    tboHours: v.optional(v.number()),
    tboCycles: v.optional(v.number()),
    purchasePrice: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    coreValue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rotables", { ...args, createdAt: Date.now() });
  },
});

export const update = mutation({
  args: {
    id: v.id("rotables"),
    shopLocationId: v.optional(v.id("shopLocations")),
    status: v.optional(v.union(v.literal("installed"), v.literal("serviceable"), v.literal("in_shop"), v.literal("at_vendor"), v.literal("condemned"), v.literal("loaned_out"))),
    condition: v.optional(v.union(v.literal("serviceable"), v.literal("unserviceable"), v.literal("overhauled"), v.literal("repaired"), v.literal("inspected"))),
    aircraftId: v.optional(v.id("aircraft")),
    positionCode: v.optional(v.string()),
    tsnHours: v.optional(v.number()),
    tsnCycles: v.optional(v.number()),
    tsoHours: v.optional(v.number()),
    tsoCycles: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const recordAction = mutation({
  args: {
    rotableId: v.id("rotables"),
    organizationId: v.id("organizations"),
    action: v.union(v.literal("installed"), v.literal("removed"), v.literal("sent_to_vendor"), v.literal("received_from_vendor"), v.literal("overhauled"), v.literal("condemned"), v.literal("loaned"), v.literal("returned")),
    fromAircraftId: v.optional(v.id("aircraft")),
    toAircraftId: v.optional(v.id("aircraft")),
    workOrderId: v.optional(v.id("workOrders")),
    hoursAtAction: v.optional(v.number()),
    cyclesAtAction: v.optional(v.number()),
    notes: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rotableHistory", { ...args, createdAt: Date.now() });
    // Update rotable status based on action
    const statusMap: Record<string, string> = {
      installed: "installed", removed: "serviceable", sent_to_vendor: "at_vendor",
      received_from_vendor: "serviceable", overhauled: "serviceable",
      condemned: "condemned", loaned: "loaned_out", returned: "serviceable",
    };
    const newStatus = statusMap[args.action];
    if (newStatus) {
      const patch: Record<string, unknown> = { status: newStatus, updatedAt: Date.now() };
      if (args.action === "installed" && args.toAircraftId) patch.aircraftId = args.toAircraftId;
      if (args.action === "removed") patch.aircraftId = undefined;
      await ctx.db.patch(args.rotableId, patch);
    }
  },
});
