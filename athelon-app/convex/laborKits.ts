// convex/laborKits.ts
// Athelon — Labor Kits: reusable templates bundling labor tasks with parts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

const laborItemValidator = v.object({
  description: v.string(),
  estimatedHours: v.number(),
  skillRequired: v.optional(v.string()),
});

const requiredPartValidator = v.object({
  partNumber: v.string(),
  description: v.string(),
  quantity: v.number(),
  unitCost: v.optional(v.number()),
});

const externalServiceValidator = v.object({
  vendorName: v.optional(v.string()),
  description: v.string(),
  estimatedCost: v.number(),
});

export const createLaborKit = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    ataChapter: v.optional(v.string()),
    aircraftType: v.optional(v.string()),
    estimatedHours: v.number(),
    laborRate: v.optional(v.number()),
    laborItems: v.array(laborItemValidator),
    requiredParts: v.array(requiredPartValidator),
    externalServices: v.optional(v.array(externalServiceValidator)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { orgId, ...rest } = args;
    return await ctx.db.insert("laborKits", {
      organizationId: orgId,
      ...rest,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateLaborKit = mutation({
  args: {
    id: v.id("laborKits"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    ataChapter: v.optional(v.string()),
    aircraftType: v.optional(v.string()),
    estimatedHours: v.optional(v.number()),
    laborRate: v.optional(v.number()),
    laborItems: v.optional(v.array(laborItemValidator)),
    requiredParts: v.optional(v.array(requiredPartValidator)),
    externalServices: v.optional(v.array(externalServiceValidator)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Labor kit not found");
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

export const listLaborKits = query({
  args: {
    orgId: v.id("organizations"),
    aircraftType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let kits;
    if (args.aircraftType) {
      kits = await ctx.db
        .query("laborKits")
        .withIndex("by_org_aircraft", (q) =>
          q.eq("organizationId", args.orgId).eq("aircraftType", args.aircraftType),
        )
        .collect();
    } else {
      kits = await ctx.db
        .query("laborKits")
        .withIndex("by_org", (q) => q.eq("organizationId", args.orgId))
        .collect();
    }
    return kits;
  },
});

export const getLaborKit = query({
  args: { id: v.id("laborKits") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const toggleLaborKit = mutation({
  args: { id: v.id("laborKits") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const kit = await ctx.db.get(args.id);
    if (!kit) throw new Error("Labor kit not found");
    await ctx.db.patch(args.id, { isActive: !kit.isActive });
  },
});

export const duplicateLaborKit = mutation({
  args: { id: v.id("laborKits") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const kit = await ctx.db.get(args.id);
    if (!kit) throw new Error("Labor kit not found");
    const { _id, _creationTime, ...rest } = kit;
    return await ctx.db.insert("laborKits", {
      ...rest,
      name: `${rest.name} (Copy)`,
      createdAt: Date.now(),
    });
  },
});

export const deleteLaborKit = mutation({
  args: { id: v.id("laborKits") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.id);
  },
});
