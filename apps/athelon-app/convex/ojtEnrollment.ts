import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listRoster = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtEnrollmentRoster")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getForTechnician = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ojtEnrollmentRoster")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .first();
  },
});

export const updateEnrollment = mutation({
  args: {
    id: v.id("ojtEnrollmentRoster"),
    isEnrolledInOjt: v.optional(v.boolean()),
    hasOjtLogConverted: v.optional(v.boolean()),
    ojtLogVersion: v.optional(v.string()),
    personnelCategory: v.optional(v.union(
      v.literal("mechanic"),
      v.literal("avionics"),
      v.literal("detailer"),
      v.literal("inspection"),
      v.literal("admin"),
      v.literal("management"),
      v.literal("test_pilot"),
    )),
    locationCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...filtered, lastDigitalUpdate: Date.now(), updatedAt: Date.now() });
  },
});

export const createEnrollment = mutation({
  args: {
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    isEnrolledInOjt: v.boolean(),
    personnelCategory: v.optional(v.union(
      v.literal("mechanic"),
      v.literal("avionics"),
      v.literal("detailer"),
      v.literal("inspection"),
      v.literal("admin"),
      v.literal("management"),
      v.literal("test_pilot"),
    )),
    locationCode: v.optional(v.string()),
    ojtLogVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ojtEnrollmentRoster", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
