import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { organizationId: v.id("organizations"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("shipments").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));
    const shipments = await q.collect();
    if (args.status) return shipments.filter((s) => s.status === args.status);
    return shipments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("shipments") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getItems = query({
  args: { shipmentId: v.id("shipments") },
  handler: async (ctx, args) => {
    return await ctx.db.query("shipmentItems").withIndex("by_shipment", (q) => q.eq("shipmentId", args.shipmentId)).collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(v.literal("inbound"), v.literal("outbound")),
    carrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number()),
    originName: v.optional(v.string()),
    originAddress: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
    workOrderId: v.optional(v.id("workOrders")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    customerId: v.optional(v.id("customers")),
    vendorId: v.optional(v.id("vendors")),
    shippingCost: v.optional(v.number()),
    insuranceValue: v.optional(v.number()),
    hazmat: v.optional(v.boolean()),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("shipments").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).collect();
    const num = `SHP-${String(existing.length + 1).padStart(5, "0")}`;
    return await ctx.db.insert("shipments", {
      ...args,
      shipmentNumber: num,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("shipments"),
    status: v.union(v.literal("pending"), v.literal("in_transit"), v.literal("delivered"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status, updatedAt: Date.now() };
    if (args.status === "delivered") patch.actualDelivery = Date.now();
    if (args.status === "in_transit") patch.shippedDate = Date.now();
    await ctx.db.patch(args.id, patch);
  },
});

export const update = mutation({
  args: {
    id: v.id("shipments"),
    carrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number()),
    bolNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    shippingCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const addItem = mutation({
  args: {
    shipmentId: v.id("shipments"),
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),
    partNumber: v.string(),
    description: v.string(),
    serialNumber: v.optional(v.string()),
    quantity: v.number(),
    condition: v.optional(v.union(v.literal("new"), v.literal("serviceable"), v.literal("unserviceable"), v.literal("as_removed"))),
    traceDoc: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("shipmentItems", { ...args, createdAt: Date.now() });
  },
});

export const removeItem = mutation({
  args: { id: v.id("shipmentItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});
