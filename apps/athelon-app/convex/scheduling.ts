// convex/scheduling.ts
// Scheduling mutations — Phase 7
//
// Provides mutations for updating WO schedule dates and bay assignments.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateWOSchedule = mutation({
  args: {
    woId: v.id("workOrders"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { woId, startDate, endDate }) => {
    const wo = await ctx.db.get(woId);
    if (!wo) throw new Error("Work order not found");
    if (endDate <= startDate) throw new Error("End date must be after start date");

    await ctx.db.patch(woId, {
      scheduledStartDate: startDate,
      promisedDeliveryDate: endDate,
      updatedAt: Date.now(),
    });
  },
});

export const assignWOToBay = mutation({
  args: {
    woId: v.id("workOrders"),
    bayId: v.id("hangarBays"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { woId, bayId, startDate, endDate }) => {
    const wo = await ctx.db.get(woId);
    if (!wo) throw new Error("Work order not found");
    const bay = await ctx.db.get(bayId);
    if (!bay) throw new Error("Bay not found");

    await ctx.db.patch(woId, {
      scheduledStartDate: startDate,
      promisedDeliveryDate: endDate,
      updatedAt: Date.now(),
    });
  },
});

export const getScheduledWOs = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const wos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    return wos.filter(
      (wo) =>
        wo.scheduledStartDate &&
        wo.promisedDeliveryDate &&
        wo.status !== "closed" &&
        wo.status !== "cancelled" &&
        wo.status !== "voided"
    );
  },
});
