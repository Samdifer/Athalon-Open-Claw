import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function enforceSinglePrimary(
  ctx: {
    db: {
      query: (...args: any[]) => any;
      patch: (id: Id<"shopLocations">, value: Partial<any>) => Promise<void>;
    };
  },
  organizationId: Id<"organizations">,
  primaryLocationId: Id<"shopLocations">,
) {
  const locations = await ctx.db
    .query("shopLocations")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();
  for (const location of locations) {
    const shouldBePrimary = location._id === primaryLocationId;
    if ((location.isPrimary ?? false) === shouldBePrimary) continue;
    await ctx.db.patch(location._id, { isPrimary: shouldBePrimary, updatedAt: Date.now() });
  }
}

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.query("shopLocations").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).collect();
  },
});

export const get = query({
  args: { id: v.id("shopLocations") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    certificateType: v.optional(v.union(v.literal("part_145"), v.literal("part_135"), v.literal("part_121"), v.literal("part_91"))),
    capabilities: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("shopLocations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const shouldBePrimary = (args.isPrimary ?? false) || existing.length === 0;

    const id = await ctx.db.insert("shopLocations", {
      ...args,
      isPrimary: shouldBePrimary,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (shouldBePrimary) {
      await enforceSinglePrimary(ctx, args.organizationId, id);
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("shopLocations"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    certificateType: v.optional(
      v.union(
        v.literal("part_145"),
        v.literal("part_135"),
        v.literal("part_121"),
        v.literal("part_91"),
      ),
    ),
    capabilities: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const location = await ctx.db.get(id);
    if (!location) throw new Error("Location not found");

    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });

    if (fields.isPrimary === true) {
      await enforceSinglePrimary(ctx, location.organizationId, id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("shopLocations") },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.id);
    if (!location) throw new Error("Location not found");

    const [assignmentsAtLocation, activeWorkOrders] = await Promise.all([
      ctx.db
        .query("scheduleAssignments")
        .withIndex("by_org_location", (q) =>
          q.eq("organizationId", location.organizationId).eq("shopLocationId", args.id),
        )
        .collect(),
      ctx.db
        .query("workOrders")
        .withIndex("by_org_location", (q) =>
          q.eq("organizationId", location.organizationId).eq("shopLocationId", args.id),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "closed"),
            q.neq(q.field("status"), "cancelled"),
            q.neq(q.field("status"), "voided"),
          ),
        )
        .take(1),
    ]);
    const activeAssignments = assignmentsAtLocation.filter(
      (assignment) => assignment.archivedAt === undefined,
    );

    if (activeAssignments.length > 0 || activeWorkOrders.length > 0) {
      throw new Error(
        "Cannot deactivate a location with active schedule assignments or active work orders.",
      );
    }

    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});
