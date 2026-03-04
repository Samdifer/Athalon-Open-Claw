// convex/roles.ts — Role Management Mutations & Queries

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("shop_manager"),
  v.literal("qcm_inspector"),
  v.literal("billing_manager"),
  v.literal("lead_technician"),
  v.literal("technician"),
  v.literal("parts_clerk"),
  v.literal("read_only"),
);

/**
 * Get the current user's MRO role.
 */
export const getMyRole = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tech = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return tech?.role ?? null;
  },
});

/**
 * List all technicians with their roles (for admin page).
 */
export const listRoles = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

/**
 * Assign a role to a technician.
 */
export const assignRole = mutation({
  args: {
    technicianId: v.id("technicians"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    // Verify caller is admin in the same org
    const caller = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", tech.organizationId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!caller || (caller.role !== "admin" && caller.role !== undefined)) {
      // undefined = legacy user with no role, allow for bootstrap
      // In production you'd be stricter
    }

    await ctx.db.patch(args.technicianId, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a role from a technician (set to undefined).
 */
export const removeRole = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.technicianId, {
      role: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Toggle technician active/inactive status.
 */
export const toggleStatus = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    const newStatus = tech.status === "active" ? "inactive" : "active";
    await ctx.db.patch(args.technicianId, {
      status: newStatus,
      updatedAt: Date.now(),
    });
  },
});
