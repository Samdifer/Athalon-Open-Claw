// convex/hangarBays.ts
// Hangar Bay Management — Phase 7 Scheduling
//
// Provides CRUD operations for hangar bays plus bay assignment/release mutations.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export const listBays = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("hangarBays")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const getBay = query({
  args: { bayId: v.id("hangarBays") },
  handler: async (ctx, { bayId }) => {
    return await ctx.db.get(bayId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const createBay = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("hangar"), v.literal("ramp"), v.literal("paint")),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("hangarBays", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      type: args.type,
      capacity: args.capacity,
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBay = mutation({
  args: {
    bayId: v.id("hangarBays"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("hangar"), v.literal("ramp"), v.literal("paint"))),
    capacity: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance"))
    ),
  },
  handler: async (ctx, { bayId, ...updates }) => {
    const existing = await ctx.db.get(bayId);
    if (!existing) throw new Error("Bay not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.capacity !== undefined) patch.capacity = updates.capacity;
    if (updates.status !== undefined) patch.status = updates.status;

    await ctx.db.patch(bayId, patch);
  },
});

export const assignAircraftToBay = mutation({
  args: {
    bayId: v.id("hangarBays"),
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, { bayId, aircraftId, workOrderId }) => {
    await ctx.db.patch(bayId, {
      status: "occupied" as const,
      currentAircraftId: aircraftId,
      currentWorkOrderId: workOrderId,
      updatedAt: Date.now(),
    });
  },
});

export const releaseBay = mutation({
  args: { bayId: v.id("hangarBays") },
  handler: async (ctx, { bayId }) => {
    await ctx.db.patch(bayId, {
      status: "available" as const,
      currentAircraftId: undefined,
      currentWorkOrderId: undefined,
      updatedAt: Date.now(),
    });
  },
});
