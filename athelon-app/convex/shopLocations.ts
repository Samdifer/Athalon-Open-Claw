import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    return await ctx.db.insert("shopLocations", { ...args, isActive: true, createdAt: Date.now() });
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
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("shopLocations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});
