// convex/toolCrib.ts
// Athelon — Tool Crib Management
//
// Tool inventory, check-out/check-in, and calibration tracking.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listTools = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    shopLocationId: v.optional(v.union(v.id("shopLocations"), v.literal("all"))),
  },
  handler: async (ctx, { orgId, status, category, shopLocationId }) => {
    let tools;
    if (status) {
      tools = await ctx.db
        .query("toolRecords")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", orgId).eq("status", status as any)
        )
        .collect();
    } else {
      tools = await ctx.db
        .query("toolRecords")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId))
        .collect();
    }
    if (shopLocationId && shopLocationId !== "all") {
      tools = tools.filter((tool) => tool.shopLocationId === shopLocationId);
    }
    if (category) {
      tools = tools.filter((t) => t.category === category);
    }
    return tools;
  },
});

export const listCalibrationDue = query({
  args: {
    orgId: v.id("organizations"),
    withinDays: v.number(),
    shopLocationId: v.optional(v.union(v.id("shopLocations"), v.literal("all"))),
  },
  handler: async (ctx, { orgId, withinDays, shopLocationId }) => {
    const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
    const tools =
      shopLocationId && shopLocationId !== "all"
        ? await ctx.db
            .query("toolRecords")
            .withIndex("by_org_location_calibration_due", (q) =>
              q.eq("organizationId", orgId).eq("shopLocationId", shopLocationId as any)
            )
            .collect()
        : await ctx.db
            .query("toolRecords")
            .withIndex("by_calibration_due", (q) => q.eq("organizationId", orgId))
            .collect();
    let filtered = tools.filter(
      (t) =>
        t.calibrationRequired &&
        t.nextCalibrationDue !== undefined &&
        t.nextCalibrationDue <= cutoff &&
        t.status !== "retired"
    );
    return filtered;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createTool = mutation({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    toolNumber: v.string(),
    description: v.string(),
    serialNumber: v.optional(v.string()),
    category: v.union(
      v.literal("hand_tool"),
      v.literal("power_tool"),
      v.literal("test_equipment"),
      v.literal("special_tooling"),
      v.literal("consumable"),
    ),
    location: v.optional(v.string()),
    calibrationRequired: v.boolean(),
    calibrationIntervalDays: v.optional(v.number()),
    calibrationProvider: v.optional(v.string()),
    lastCalibrationDate: v.optional(v.number()),
    nextCalibrationDue: v.optional(v.number()),
    purchaseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("toolRecords", {
      ...args,
      status: "available",
      createdAt: Date.now(),
    });
  },
});

export const updateTool = mutation({
  args: {
    toolId: v.id("toolRecords"),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    shopLocationId: v.optional(v.id("shopLocations")),
    calibrationRequired: v.optional(v.boolean()),
    calibrationIntervalDays: v.optional(v.number()),
    calibrationProvider: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("in_use"),
        v.literal("calibration_due"),
        v.literal("out_for_calibration"),
        v.literal("retired"),
      )
    ),
  },
  handler: async (ctx, { toolId, ...fields }) => {
    const updates: Record<string, any> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(toolId, updates);
    }
  },
});

export const checkOutTool = mutation({
  args: {
    toolId: v.id("toolRecords"),
    technicianId: v.id("technicians"),
    workOrderId: v.optional(v.id("workOrders")),
  },
  handler: async (ctx, { toolId, technicianId, workOrderId }) => {
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.status !== "available" && tool.status !== "calibration_due") {
      throw new Error(`Tool is not available (status: ${tool.status})`);
    }
    await ctx.db.patch(toolId, {
      status: "in_use",
      assignedToTechnicianId: technicianId,
      assignedToWorkOrderId: workOrderId,
    });
  },
});

export const checkInTool = mutation({
  args: { toolId: v.id("toolRecords") },
  handler: async (ctx, { toolId }) => {
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new Error("Tool not found");
    const now = Date.now();
    const needsCalibration =
      tool.calibrationRequired &&
      tool.nextCalibrationDue !== undefined &&
      tool.nextCalibrationDue <= now;
    await ctx.db.patch(toolId, {
      status: needsCalibration ? "calibration_due" : "available",
      assignedToTechnicianId: undefined,
      assignedToWorkOrderId: undefined,
    });
  },
});

export const sendForCalibration = mutation({
  args: {
    toolId: v.id("toolRecords"),
    provider: v.string(),
  },
  handler: async (ctx, { toolId, provider }) => {
    await ctx.db.patch(toolId, {
      status: "out_for_calibration",
      calibrationProvider: provider,
    });
  },
});

export const completeCalibration = mutation({
  args: {
    toolId: v.id("toolRecords"),
    date: v.number(),
    nextDue: v.number(),
  },
  handler: async (ctx, { toolId, date, nextDue }) => {
    await ctx.db.patch(toolId, {
      status: "available",
      lastCalibrationDate: date,
      nextCalibrationDue: nextDue,
    });
  },
});
