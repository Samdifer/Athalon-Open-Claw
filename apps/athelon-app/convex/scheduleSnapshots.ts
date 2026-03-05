// convex/scheduleSnapshots.ts
// MBP-0116: Schedule Snapshot / Baseline Comparison
//
// Save current schedule as a baseline snapshot and compare against actuals.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const snapshotEntryValidator = v.object({
  workOrderId: v.string(),
  workOrderNumber: v.string(),
  hangarBayId: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  priority: v.string(),
  aircraftReg: v.optional(v.string()),
});

export const saveSnapshot = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    entries: v.array(snapshotEntryValidator),
  },
  handler: async (ctx, { organizationId, name, entries }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return ctx.db.insert("scheduleSnapshots", {
      organizationId,
      name,
      entries,
      createdAt: Date.now(),
      createdByUserId: identity.subject,
    });
  },
});

export const listSnapshots = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return ctx.db
      .query("scheduleSnapshots")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(20);
  },
});

export const getSnapshot = query({
  args: { snapshotId: v.id("scheduleSnapshots") },
  handler: async (ctx, { snapshotId }) => {
    return ctx.db.get(snapshotId);
  },
});

export const deleteSnapshot = mutation({
  args: { snapshotId: v.id("scheduleSnapshots") },
  handler: async (ctx, { snapshotId }) => {
    const snapshot = await ctx.db.get(snapshotId);
    if (!snapshot) throw new Error("Snapshot not found");
    await ctx.db.delete(snapshotId);
  },
});
