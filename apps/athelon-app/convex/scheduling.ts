// convex/scheduling.ts
// Legacy scheduling API surface kept as compatibility wrappers.
//
// DEPRECATED (Wave 8):
// - updateWOSchedule
// - assignWOToBay
// - getScheduledWOs
//
// New scheduling writes should use convex/schedulerPlanning.ts.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSchedulingManager } from "./shared/helpers/schedulingPermissions";

function emitDeprecatedWarning(name: string) {
  console.warn(`[DEPRECATED] convex/scheduling.${name} is legacy. Use convex/schedulerPlanning instead.`);
}

export const updateWOSchedule = mutation({
  args: {
    woId: v.id("workOrders"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { woId, startDate, endDate }) => {
    emitDeprecatedWarning("updateWOSchedule");

    if (endDate <= startDate) throw new Error("End date must be after start date");

    const wo = await ctx.db.get(woId);
    if (!wo) throw new Error("Work order not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: wo.organizationId,
      operation: "legacy work-order schedule update",
    });

    const previous = {
      scheduledStartDate: wo.scheduledStartDate,
      promisedDeliveryDate: wo.promisedDeliveryDate,
    };

    const now = Date.now();
    await ctx.db.patch(woId, {
      scheduledStartDate: startDate,
      promisedDeliveryDate: endDate,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: wo.organizationId,
      eventType: "record_updated",
      tableName: "workOrders",
      recordId: String(woId),
      userId,
      oldValue: JSON.stringify(previous),
      newValue: JSON.stringify({
        scheduledStartDate: startDate,
        promisedDeliveryDate: endDate,
      }),
      notes: "Deprecated wrapper: updateWOSchedule",
      timestamp: now,
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
    emitDeprecatedWarning("assignWOToBay");

    if (endDate <= startDate) throw new Error("End date must be after start date");

    const [wo, bay] = await Promise.all([ctx.db.get(woId), ctx.db.get(bayId)]);
    if (!wo) throw new Error("Work order not found");
    if (!bay) throw new Error("Bay not found");
    if (wo.organizationId !== bay.organizationId) {
      throw new Error("Bay does not belong to work order organization");
    }

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: wo.organizationId,
      operation: "legacy bay assignment",
    });

    const now = Date.now();

    await ctx.db.patch(woId, {
      scheduledStartDate: startDate,
      promisedDeliveryDate: endDate,
      shopLocationId: bay.shopLocationId ?? wo.shopLocationId,
      updatedAt: now,
    });

    // Best-effort parity with planner data model: upsert scheduleAssignments.
    const existing = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org_wo", (q) =>
        q.eq("organizationId", wo.organizationId).eq("workOrderId", woId),
      )
      .first();

    const assignmentPatch = {
      sourceQuoteId: existing?.sourceQuoteId,
      hangarBayId: bayId,
      shopLocationId: bay.shopLocationId ?? wo.shopLocationId,
      startDate,
      endDate,
      isLocked: existing?.isLocked,
      archivedAt: undefined,
      archivedByUserId: undefined,
      updatedAt: now,
      updatedByUserId: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, assignmentPatch);
    } else {
      await ctx.db.insert("scheduleAssignments", {
        organizationId: wo.organizationId,
        workOrderId: woId,
        ...assignmentPatch,
        createdAt: now,
      });
    }

    await ctx.db.insert("auditLog", {
      organizationId: wo.organizationId,
      eventType: "record_updated",
      tableName: "workOrders",
      recordId: String(woId),
      userId,
      oldValue: JSON.stringify({
        scheduledStartDate: wo.scheduledStartDate,
        promisedDeliveryDate: wo.promisedDeliveryDate,
      }),
      newValue: JSON.stringify({
        scheduledStartDate: startDate,
        promisedDeliveryDate: endDate,
        bayId,
      }),
      notes: "Deprecated wrapper: assignWOToBay",
      timestamp: now,
    });
  },
});

export const getScheduledWOs = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    emitDeprecatedWarning("getScheduledWOs");

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
        wo.status !== "voided",
    );
  },
});
