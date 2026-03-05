import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listForJacket = query({
  args: { jacketId: v.id("ojtJackets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtAuthorizations")
      .withIndex("by_jacket", (q) => q.eq("jacketId", args.jacketId))
      .collect();
  },
});

export const grantAuthorization = mutation({
  args: {
    id: v.id("ojtAuthorizations"),
    grantedByTechnicianId: v.id("technicians"),
    grantedByName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      isGranted: true,
      grantedAt: now,
      grantedByTechnicianId: args.grantedByTechnicianId,
      grantedByName: args.grantedByName,
      revokedAt: undefined,
      revokedByTechnicianId: undefined,
      revokedReason: undefined,
      notes: args.notes,
      updatedAt: now,
    });
  },
});

export const revokeAuthorization = mutation({
  args: {
    id: v.id("ojtAuthorizations"),
    revokedByTechnicianId: v.id("technicians"),
    revokedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      isGranted: false,
      revokedAt: now,
      revokedByTechnicianId: args.revokedByTechnicianId,
      revokedReason: args.revokedReason,
      updatedAt: now,
    });
  },
});

export const createAuthorizationForJacket = mutation({
  args: {
    organizationId: v.string(),
    jacketId: v.id("ojtJackets"),
    technicianId: v.id("technicians"),
    curriculumId: v.id("ojtCurricula"),
    capabilityKey: v.string(),
    capabilityLabel: v.string(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtAuthorizations", {
      ...args,
      isGranted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
