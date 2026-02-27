import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { organizationId: v.id("organizations"), status: v.optional(v.string()), aircraftId: v.optional(v.id("aircraft")) },
  handler: async (ctx, args) => {
    let results;
    if (args.aircraftId) {
      const aid = args.aircraftId;
      results = await ctx.db.query("maintenancePredictions").withIndex("by_aircraft", (q) => q.eq("organizationId", args.organizationId).eq("aircraftId", aid)).collect();
    } else {
      results = await ctx.db.query("maintenancePredictions").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).collect();
    }
    if (args.status) results = results.filter((p) => p.status === args.status);
    return results.sort((a, b) => a.predictedDate - b.predictedDate);
  },
});

export const get = query({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    predictionType: v.union(v.literal("time_based"), v.literal("usage_based"), v.literal("trend_based"), v.literal("condition_based")),
    predictedDate: v.number(),
    confidence: v.number(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.string(),
    recommendation: v.optional(v.string()),
    basedOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("maintenancePredictions", { ...args, status: "active", createdAt: Date.now() });
  },
});

export const acknowledge = mutation({
  args: { id: v.id("maintenancePredictions"), acknowledgedBy: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "acknowledged", acknowledgedBy: args.acknowledgedBy, updatedAt: Date.now() });
  },
});

export const resolve = mutation({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "resolved", resolvedDate: Date.now(), updatedAt: Date.now() });
  },
});

export const dismiss = mutation({
  args: { id: v.id("maintenancePredictions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "dismissed", updatedAt: Date.now() });
  },
});

// Generate time-based predictions from aircraft maintenance records
export const generatePredictions = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Get all aircraft
    const aircraft = await ctx.db.query("aircraft").withIndex("by_organization", (q) => q.eq("operatingOrganizationId", args.organizationId)).collect();
    let created = 0;
    for (const ac of aircraft) {
      // Check if TBO-based prediction needed
      if (ac.totalTimeAirframeAsOfDate && ac.totalTimeAirframeAsOfDate > 0) {
        // Simple heuristic: if > 80% of typical TBO (2000h for piston, 3500h for turbine), flag it
        const tbo = 3500; // default turbine TBO
        const pctUsed = ac.totalTimeAirframeAsOfDate / tbo;
        if (pctUsed > 0.8) {
          const hoursRemaining = tbo - ac.totalTimeAirframeAsOfDate;
          const estimatedHoursPerMonth = 40;
          const monthsRemaining = Math.max(1, hoursRemaining / estimatedHoursPerMonth);
          const predictedDate = Date.now() + monthsRemaining * 30 * 24 * 60 * 60 * 1000;
          // Check if prediction already exists
          const existing = await ctx.db.query("maintenancePredictions")
            .withIndex("by_aircraft", (q) => q.eq("organizationId", args.organizationId).eq("aircraftId", ac._id))
            .collect();
          const hasSimilar = existing.some((p) => p.predictionType === "usage_based" && p.status === "active");
          if (!hasSimilar) {
            await ctx.db.insert("maintenancePredictions", {
              organizationId: args.organizationId,
              aircraftId: ac._id,
              predictionType: "usage_based",
              predictedDate,
              confidence: Math.round(70 + pctUsed * 20),
              severity: pctUsed > 0.95 ? "critical" : pctUsed > 0.9 ? "high" : "medium",
              description: `Engine approaching TBO — ${Math.round(hoursRemaining)}h remaining (${Math.round(pctUsed * 100)}% of ${tbo}h TBO)`,
              recommendation: `Schedule engine overhaul within ${Math.round(monthsRemaining)} months`,
              basedOn: `Aircraft total time: ${ac.totalTimeAirframeAsOfDate}h, estimated ${estimatedHoursPerMonth}h/month utilization`,
              status: "active",
              createdAt: Date.now(),
            });
            created++;
          }
        }
      }
    }
    return { created };
  },
});
