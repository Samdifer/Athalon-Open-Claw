/**
 * Shop Settings — Quote Builder Configuration
 *
 * Organization-level financial configuration for the quote builder:
 * shop rate, average hourly labor cost, and tiered markup schedules.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/authHelpers";

const markupTierValidator = v.array(
  v.object({
    maxCostThreshold: v.number(),
    markupMultiplier: v.number(),
  }),
);

/** Get shop settings for an organization. Returns null if not yet configured. */
export const getShopSettings = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

/** Create or update shop settings for an organization. */
export const upsertShopSettings = mutation({
  args: {
    orgId: v.id("organizations"),
    shopRate: v.number(),
    averageHourlyCost: v.number(),
    partMarkupTiers: markupTierValidator,
    serviceMarkupTiers: markupTierValidator,
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("shopSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        shopRate: args.shopRate,
        averageHourlyCost: args.averageHourlyCost,
        partMarkupTiers: args.partMarkupTiers,
        serviceMarkupTiers: args.serviceMarkupTiers,
        updatedAt: now,
      });

      await ctx.db.insert("auditLog", {
        organizationId: args.orgId,
        eventType: "record_updated",
        tableName: "shopSettings",
        recordId: existing._id,
        userId: callerUserId,
        notes: `Shop settings updated: rate $${args.shopRate}/hr, avg cost $${args.averageHourlyCost}/hr, ${args.partMarkupTiers.length} part tiers, ${args.serviceMarkupTiers.length} service tiers.`,
        timestamp: now,
      });

      return existing._id;
    }

    const settingsId = await ctx.db.insert("shopSettings", {
      orgId: args.orgId,
      shopRate: args.shopRate,
      averageHourlyCost: args.averageHourlyCost,
      partMarkupTiers: args.partMarkupTiers,
      serviceMarkupTiers: args.serviceMarkupTiers,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "shopSettings",
      recordId: settingsId,
      userId: callerUserId,
      notes: `Shop settings created: rate $${args.shopRate}/hr, avg cost $${args.averageHourlyCost}/hr.`,
      timestamp: now,
    });

    return settingsId;
  },
});

/**
 * Pure helper: given a cost amount, a category, and the org's markup tiers,
 * returns the applicable markup multiplier. Walks tiers in ascending
 * maxCostThreshold order and returns the first match.
 */
export function getAutoMarkupMultiplier(
  costBasis: number,
  category: "part" | "service",
  partTiers: Array<{ maxCostThreshold: number; markupMultiplier: number }>,
  serviceTiers: Array<{ maxCostThreshold: number; markupMultiplier: number }>,
): number {
  const tiers = category === "part" ? partTiers : serviceTiers;
  const sorted = [...tiers].sort(
    (a, b) => a.maxCostThreshold - b.maxCostThreshold,
  );
  for (const tier of sorted) {
    if (costBasis <= tier.maxCostThreshold) {
      return tier.markupMultiplier;
    }
  }
  // Fallback: no markup
  return 1.0;
}
