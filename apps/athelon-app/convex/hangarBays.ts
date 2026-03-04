// convex/hangarBays.ts
// Hangar Bay Management — Phase 7 Scheduling
//
// Provides CRUD operations for hangar bays plus bay assignment/release mutations.

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const shopLocationFilterValidator = v.optional(
  v.union(v.id("shopLocations"), v.literal("all")),
);

function compareBays(
  a: { displayOrder?: number; createdAt: number; name: string },
  b: { displayOrder?: number; createdAt: number; name: string },
): number {
  const aOrder =
    typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
  const bOrder =
    typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.name.localeCompare(b.name);
}

async function ensureLocationBelongsToOrg(
  ctx: { db: { get: (id: Id<"shopLocations">) => Promise<any> } },
  organizationId: Id<"organizations">,
  shopLocationId: Id<"shopLocations">,
) {
  const location = await ctx.db.get(shopLocationId);
  if (!location || location.organizationId !== organizationId) {
    throw new Error("Shop location does not belong to this organization");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export const listBays = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
  },
  handler: async (ctx, { organizationId, shopLocationId }) => {
    if (shopLocationId && shopLocationId !== "all") {
      await ensureLocationBelongsToOrg(ctx, organizationId, shopLocationId);
      const bays = await ctx.db
        .query("hangarBays")
        .withIndex("by_org_location", (q) =>
          q.eq("organizationId", organizationId).eq("shopLocationId", shopLocationId),
        )
        .collect();
      return bays.sort(compareBays);
    }

    const bays = await ctx.db
      .query("hangarBays")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
    return bays.sort(compareBays);
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
    shopLocationId: v.optional(v.id("shopLocations")),
  },
  handler: async (ctx, args) => {
    if (args.shopLocationId) {
      await ensureLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const sameScopeBays = args.shopLocationId
      ? await ctx.db
          .query("hangarBays")
          .withIndex("by_org_location", (q) =>
            q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
          )
          .collect()
      : (await ctx.db
          .query("hangarBays")
          .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
          .collect()
        ).filter((bay) => bay.shopLocationId === undefined);

    const ordered = sameScopeBays.sort(compareBays);
    const lastOrder = ordered.length > 0 ? ordered[ordered.length - 1].displayOrder : undefined;
    const nextDisplayOrder =
      typeof lastOrder === "number" ? lastOrder + 1 : ordered.length;

    const now = Date.now();
    return await ctx.db.insert("hangarBays", {
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      name: args.name,
      description: args.description,
      type: args.type,
      capacity: args.capacity,
      status: "available",
      displayOrder: nextDisplayOrder,
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
    shopLocationId: v.optional(v.id("shopLocations")),
    status: v.optional(
      v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance"))
    ),
  },
  handler: async (ctx, { bayId, ...updates }) => {
    const existing = await ctx.db.get(bayId);
    if (!existing) throw new Error("Bay not found");

    if (updates.shopLocationId !== undefined) {
      await ensureLocationBelongsToOrg(ctx, existing.organizationId, updates.shopLocationId);
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.capacity !== undefined) patch.capacity = updates.capacity;
    if (updates.shopLocationId !== undefined) patch.shopLocationId = updates.shopLocationId;
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

export const reorderBays = mutation({
  args: {
    organizationId: v.id("organizations"),
    orderedBayIds: v.array(v.id("hangarBays")),
    shopLocationId: v.optional(v.id("shopLocations")),
  },
  handler: async (ctx, args) => {
    if (args.shopLocationId) {
      await ensureLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const scopedBays = args.shopLocationId
      ? await ctx.db
          .query("hangarBays")
          .withIndex("by_org_location", (q) =>
            q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
          )
          .collect()
      : await ctx.db
          .query("hangarBays")
          .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
          .collect();

    const scopedIds = new Set(scopedBays.map((bay) => String(bay._id)));
    if (args.orderedBayIds.length !== scopedBays.length) {
      throw new Error("orderedBayIds must include every bay in the selected scope.");
    }
    for (const id of args.orderedBayIds) {
      if (!scopedIds.has(String(id))) {
        throw new Error("orderedBayIds contains a bay outside the selected scope.");
      }
    }

    const now = Date.now();
    for (let index = 0; index < args.orderedBayIds.length; index++) {
      await ctx.db.patch(args.orderedBayIds[index], {
        displayOrder: index,
        updatedAt: now,
      });
    }
  },
});

export const deleteBay = mutation({
  args: {
    organizationId: v.id("organizations"),
    bayId: v.id("hangarBays"),
  },
  handler: async (ctx, args) => {
    const bay = await ctx.db.get(args.bayId);
    if (!bay || bay.organizationId !== args.organizationId) {
      throw new Error("Bay not found");
    }

    const assignmentsAtBay = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org_bay", (q) =>
        q.eq("organizationId", args.organizationId).eq("hangarBayId", args.bayId),
      )
      .collect();
    if (assignmentsAtBay.some((assignment) => assignment.archivedAt === undefined)) {
      throw new Error("Cannot delete bay with active schedule assignments");
    }

    await ctx.db.delete(args.bayId);

    const supportedRows = await ctx.db
      .query("stationSupportedAircraft")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const now = Date.now();
    for (const row of supportedRows) {
      if (!row.compatibleBayIds.some((id) => id === args.bayId)) continue;
      await ctx.db.patch(row._id, {
        compatibleBayIds: row.compatibleBayIds.filter((id) => id !== args.bayId),
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});
