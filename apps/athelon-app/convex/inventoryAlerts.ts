// convex/inventoryAlerts.ts
// Athelon — Inventory Alert Queries
//
// Shelf-life, reorder, and calibration alert queries for the
// Inventory Alerts dashboard.

import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── Shelf Life Alerts ────────────────────────────────────────────────────────

type ShelfLifeBand = "expired" | "critical_30d" | "warning_60d" | "upcoming_90d";

interface ShelfLifeAlertItem {
  _id: string;
  type: "part";
  partNumber: string;
  partName: string;
  expiryDate: number;
  daysRemaining: number;
  location: string;
  band: ShelfLifeBand;
}

function classifyShelfLifeBand(expiryDate: number, now: number): ShelfLifeBand | null {
  const daysMs = 24 * 60 * 60 * 1000;
  const diff = expiryDate - now;

  if (diff <= 0) return "expired";
  if (diff <= 30 * daysMs) return "critical_30d";
  if (diff <= 60 * daysMs) return "warning_60d";
  if (diff <= 90 * daysMs) return "upcoming_90d";
  return null;
}

export const getShelfLifeAlerts = query({
  args: {
    organizationId: v.id("organizations"),
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowDays = args.windowDays ?? 90;
    const now = Date.now();
    const daysMs = 24 * 60 * 60 * 1000;
    const cutoff = now + windowDays * daysMs;

    // Query parts with hasShelfLifeLimit = true using the by_shelf_life index
    const shelfLifeParts = await ctx.db
      .query("parts")
      .withIndex("by_shelf_life", (q) => q.eq("hasShelfLifeLimit", true))
      .collect();

    // Filter to parts belonging to this org and within the window
    const orgParts = shelfLifeParts.filter(
      (p) =>
        p.organizationId === args.organizationId &&
        p.shelfLifeLimitDate !== undefined &&
        p.shelfLifeLimitDate <= cutoff,
    );

    const expired: Array<ShelfLifeAlertItem> = [];
    const critical: Array<ShelfLifeAlertItem> = [];
    const warning: Array<ShelfLifeAlertItem> = [];
    const upcoming: Array<ShelfLifeAlertItem> = [];

    for (const part of orgParts) {
      const expiryDate = part.shelfLifeLimitDate!;
      const band = classifyShelfLifeBand(expiryDate, now);
      if (!band) continue;

      const item: ShelfLifeAlertItem = {
        _id: part._id,
        type: "part",
        partNumber: part.partNumber,
        partName: part.partName,
        expiryDate,
        daysRemaining: Math.ceil((expiryDate - now) / daysMs),
        location: part.location,
        band,
      };

      switch (band) {
        case "expired":
          expired.push(item);
          break;
        case "critical_30d":
          critical.push(item);
          break;
        case "warning_60d":
          warning.push(item);
          break;
        case "upcoming_90d":
          upcoming.push(item);
          break;
      }
    }

    return {
      expired,
      critical,
      warning,
      upcoming,
      totalAlerts: expired.length + critical.length + warning.length + upcoming.length,
    };
  },
});

// ─── Reorder Alerts ───────────────────────────────────────────────────────────

interface ReorderAlertItem {
  partNumber: string;
  partName: string;
  currentStock: number;
  reorderPoint: number | undefined;
  minStockLevel: number | undefined;
  deficit: number;
}

export const getReorderAlerts = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Query all parts for the org
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Group by partNumber — count parts in "inventory" location per partNumber
    const partGroups: Record<
      string,
      {
        partName: string;
        inventoryCount: number;
        reorderPoint: number | undefined;
        minStockLevel: number | undefined;
      }
    > = {};

    for (const part of parts) {
      if (!partGroups[part.partNumber]) {
        partGroups[part.partNumber] = {
          partName: part.partName,
          inventoryCount: 0,
          reorderPoint: undefined,
          minStockLevel: undefined,
        };
      }
      const group = partGroups[part.partNumber];

      if (part.location === "inventory") {
        group.inventoryCount += 1;
      }

      // Take the first non-undefined reorderPoint / minStockLevel found
      if (part.reorderPoint !== undefined && group.reorderPoint === undefined) {
        group.reorderPoint = part.reorderPoint;
      }
      if (part.minStockLevel !== undefined && group.minStockLevel === undefined) {
        group.minStockLevel = part.minStockLevel;
      }
    }

    // Build alert items for groups below threshold
    const alerts: Array<ReorderAlertItem> = [];

    for (const [partNumber, group] of Object.entries(partGroups)) {
      const threshold = group.reorderPoint ?? group.minStockLevel;
      if (threshold === undefined) continue;
      if (group.inventoryCount >= threshold) continue;

      alerts.push({
        partNumber,
        partName: group.partName,
        currentStock: group.inventoryCount,
        reorderPoint: group.reorderPoint,
        minStockLevel: group.minStockLevel,
        deficit: threshold - group.inventoryCount,
      });
    }

    // Sort by deficit descending
    alerts.sort((a, b) => b.deficit - a.deficit);

    return alerts;
  },
});

// ─── Calibration Alerts ───────────────────────────────────────────────────────

export const getCalibrationAlerts = query({
  args: {
    organizationId: v.id("organizations"),
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowDays = args.windowDays ?? 90;
    const now = Date.now();
    const daysMs = 24 * 60 * 60 * 1000;
    const cutoff = now + windowDays * daysMs;

    // Query tools using the calibration_due index
    const tools = await ctx.db
      .query("toolRecords")
      .withIndex("by_calibration_due", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const alerts = tools.filter(
      (t) =>
        t.calibrationRequired &&
        t.nextCalibrationDue !== undefined &&
        t.nextCalibrationDue <= cutoff &&
        t.status !== "retired",
    );

    // Enrich with days remaining
    return alerts.map((t) => ({
      _id: t._id,
      toolNumber: t.toolNumber,
      description: t.description,
      category: t.category,
      lastCalibrationDate: t.lastCalibrationDate,
      nextCalibrationDue: t.nextCalibrationDue!,
      daysRemaining: Math.ceil((t.nextCalibrationDue! - now) / daysMs),
      status: t.status,
      location: t.location,
    }));
  },
});

// ─── Alerts Summary ───────────────────────────────────────────────────────────

export const getAlertsSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const daysMs = 24 * 60 * 60 * 1000;
    const cutoff90 = now + 90 * daysMs;

    // Shelf life count
    const shelfLifeParts = await ctx.db
      .query("parts")
      .withIndex("by_shelf_life", (q) => q.eq("hasShelfLifeLimit", true))
      .collect();

    const shelfLifeCount = shelfLifeParts.filter(
      (p) =>
        p.organizationId === args.organizationId &&
        p.shelfLifeLimitDate !== undefined &&
        p.shelfLifeLimitDate <= cutoff90,
    ).length;

    // Reorder count
    const allParts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const partGroups: Record<
      string,
      { inventoryCount: number; threshold: number | undefined }
    > = {};

    for (const part of allParts) {
      if (!partGroups[part.partNumber]) {
        partGroups[part.partNumber] = { inventoryCount: 0, threshold: undefined };
      }
      const group = partGroups[part.partNumber];
      if (part.location === "inventory") {
        group.inventoryCount += 1;
      }
      if (group.threshold === undefined) {
        const t = part.reorderPoint ?? part.minStockLevel;
        if (t !== undefined) group.threshold = t;
      }
    }

    let reorderCount = 0;
    for (const group of Object.values(partGroups)) {
      if (group.threshold !== undefined && group.inventoryCount < group.threshold) {
        reorderCount += 1;
      }
    }

    // Calibration count
    const tools = await ctx.db
      .query("toolRecords")
      .withIndex("by_calibration_due", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const calibrationCount = tools.filter(
      (t) =>
        t.calibrationRequired &&
        t.nextCalibrationDue !== undefined &&
        t.nextCalibrationDue <= cutoff90 &&
        t.status !== "retired",
    ).length;

    return {
      shelfLifeCount,
      reorderCount,
      calibrationCount,
      totalAlerts: shelfLifeCount + reorderCount + calibrationCount,
    };
  },
});
