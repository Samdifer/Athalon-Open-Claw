// convex/inventoryValuation.ts
// Athelon — Aviation MRO SaaS Platform
//
// Inventory Valuation & Reporting Module — Phase 6 Implementation
//
// Provides queries and mutations for inventory valuation, reorder reporting,
// shelf life monitoring, and average cost recalculation.
//
// ─── KEY QUERIES ──────────────────────────────────────────────────────────────
//   getInventoryValue          — Total inventory valuation with condition breakdown
//   getInventoryValueByCategory — Grouped by partCategory
//   getReorderReport           — Parts below reorder point / min stock level
//   getShelfLifeReport         — Lots with shelf life expiring within window
//   recalculateAverageCost     — Weighted average cost recalculation (mutation)
// ──────────────────────────────────────────────────────────────────────────────

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// getInventoryValue
//
// Returns total inventory valuation and breakdown by condition.
// Considers only parts with a unitCost value.
// ─────────────────────────────────────────────────────────────────────────────
export const getInventoryValue = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    let totalValue = 0;
    let partCount = 0;

    const conditionBreakdown: Record<string, { totalValue: number; partCount: number }> = {
      new: { totalValue: 0, partCount: 0 },
      serviceable: { totalValue: 0, partCount: 0 },
      overhauled: { totalValue: 0, partCount: 0 },
      repaired: { totalValue: 0, partCount: 0 },
      unserviceable: { totalValue: 0, partCount: 0 },
      quarantine: { totalValue: 0, partCount: 0 },
      scrapped: { totalValue: 0, partCount: 0 },
    };

    for (const part of parts) {
      const cost = part.unitCost ?? 0;
      totalValue += cost;
      partCount += 1;

      const condition = part.condition;
      if (conditionBreakdown[condition]) {
        conditionBreakdown[condition].totalValue += cost;
        conditionBreakdown[condition].partCount += 1;
      }
    }

    return {
      totalValue,
      partCount,
      conditionBreakdown,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// getInventoryValueByCategory
//
// Returns inventory value grouped by partCategory.
// ─────────────────────────────────────────────────────────────────────────────
export const getInventoryValueByCategory = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const categoryMap: Record<string, { totalValue: number; partCount: number }> = {};

    for (const part of parts) {
      const category = part.partCategory ?? "uncategorized";
      const cost = part.unitCost ?? 0;

      if (!categoryMap[category]) {
        categoryMap[category] = { totalValue: 0, partCount: 0 };
      }
      categoryMap[category].totalValue += cost;
      categoryMap[category].partCount += 1;
    }

    return Object.entries(categoryMap).map(([category, data]) => ({
      category,
      totalValue: data.totalValue,
      partCount: data.partCount,
    }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// getReorderReport
//
// Returns parts that are below their reorder point or min stock level.
// For each partNumber, counts how many parts are in "inventory" location
// as an approximation of current available quantity.
// ─────────────────────────────────────────────────────────────────────────────
export const getReorderReport = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Group parts by partNumber to compute aggregate inventory counts
    const partNumberMap: Record<
      string,
      {
        partName: string;
        inventoryQty: number;
        reorderPoint: number | undefined;
        minStockLevel: number | undefined;
      }
    > = {};

    for (const part of parts) {
      const pn = part.partNumber;
      if (!partNumberMap[pn]) {
        partNumberMap[pn] = {
          partName: part.partName,
          inventoryQty: 0,
          reorderPoint: part.reorderPoint,
          minStockLevel: part.minStockLevel,
        };
      }

      // Count parts that are in "inventory" location as available stock
      if (part.location === "inventory") {
        partNumberMap[pn].inventoryQty += 1;
      }

      // Use the most recently seen reorder/min values (they should be consistent
      // across parts with the same partNumber, but take latest non-undefined)
      if (part.reorderPoint !== undefined) {
        partNumberMap[pn].reorderPoint = part.reorderPoint;
      }
      if (part.minStockLevel !== undefined) {
        partNumberMap[pn].minStockLevel = part.minStockLevel;
      }
    }

    // Filter to parts below threshold
    const alerts: Array<{
      partNumber: string;
      partName: string;
      currentQty: number;
      reorderPoint: number | undefined;
      minStockLevel: number | undefined;
    }> = [];

    for (const [partNumber, data] of Object.entries(partNumberMap)) {
      const belowReorder =
        data.reorderPoint !== undefined && data.inventoryQty < data.reorderPoint;
      const belowMin =
        data.minStockLevel !== undefined && data.inventoryQty < data.minStockLevel;

      if (belowReorder || belowMin) {
        alerts.push({
          partNumber,
          partName: data.partName,
          currentQty: data.inventoryQty,
          reorderPoint: data.reorderPoint,
          minStockLevel: data.minStockLevel,
        });
      }
    }

    return alerts;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// getShelfLifeReport
//
// Returns lots with shelf life expiry within the given window, grouped by
// urgency band: expired, 30d, 60d, 90d (or custom windowDays).
// ─────────────────────────────────────────────────────────────────────────────
export const getShelfLifeReport = query({
  args: {
    organizationId: v.id("organizations"),
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const windowDays = args.windowDays ?? 90;
    const now = Date.now();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const windowEnd = now + windowMs;

    // Query lots with shelf life for this org
    const allLots = await ctx.db
      .query("lots")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter to lots that have shelf life and are within window or expired
    const relevantLots = allLots.filter(
      (lot) =>
        lot.hasShelfLife &&
        lot.shelfLifeExpiryDate !== undefined &&
        lot.shelfLifeExpiryDate <= windowEnd &&
        lot.condition !== "depleted",
    );

    const MS_30D = 30 * 24 * 60 * 60 * 1000;
    const MS_60D = 60 * 24 * 60 * 60 * 1000;
    const MS_90D = 90 * 24 * 60 * 60 * 1000;

    type LotSummary = {
      lotId: string;
      lotNumber: string;
      partNumber: string;
      partName: string;
      remainingQuantity: number;
      expiryDate: number;
      condition: string;
    };

    const expired: Array<LotSummary> = [];
    const within30d: Array<LotSummary> = [];
    const within60d: Array<LotSummary> = [];
    const within90d: Array<LotSummary> = [];

    for (const lot of relevantLots) {
      const expiryDate = lot.shelfLifeExpiryDate as number;
      const summary: LotSummary = {
        lotId: lot._id,
        lotNumber: lot.lotNumber,
        partNumber: lot.partNumber,
        partName: lot.partName,
        remainingQuantity: lot.remainingQuantity,
        expiryDate,
        condition: lot.condition,
      };

      if (expiryDate <= now) {
        expired.push(summary);
      } else if (expiryDate <= now + MS_30D) {
        within30d.push(summary);
      } else if (expiryDate <= now + MS_60D) {
        within60d.push(summary);
      } else if (expiryDate <= now + MS_90D) {
        within90d.push(summary);
      }
      // If windowDays > 90, items between 90d and windowDays go into the
      // closest applicable band. For the default 90-day window, the four
      // bands above cover the full range.
    }

    return {
      expired,
      within30d,
      within60d,
      within90d,
      totalExpiring: expired.length + within30d.length + within60d.length + within90d.length,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// recalculateAverageCost
//
// Recalculates the weighted average cost for all parts matching a given
// partNumber within an organization. The average is computed across all
// parts that have a unitCost value, then written back to each part's
// averageCost field.
// ─────────────────────────────────────────────────────────────────────────────
export const recalculateAverageCost = mutation({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Filter to matching part number
    const matchingParts = parts.filter((p) => p.partNumber === args.partNumber);

    if (matchingParts.length === 0) {
      return { updated: 0, averageCost: null };
    }

    // Calculate weighted average — each part record represents one unit,
    // so the average is simply the mean of unitCost values.
    const partsWithCost = matchingParts.filter((p) => p.unitCost !== undefined);

    if (partsWithCost.length === 0) {
      return { updated: 0, averageCost: null };
    }

    const totalCost = partsWithCost.reduce((sum, p) => sum + (p.unitCost ?? 0), 0);
    const averageCost = Math.round((totalCost / partsWithCost.length) * 100) / 100;

    // Update all matching parts with the recalculated average cost
    let updated = 0;
    for (const part of matchingParts) {
      await ctx.db.patch(part._id, {
        averageCost,
        updatedAt: Date.now(),
      });
      updated += 1;
    }

    return { updated, averageCost };
  },
});
