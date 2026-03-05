// convex/tatEstimation.ts
// MBP-0115: TAT Estimation from Historical Data
//
// Calculate average turnaround time by aircraft type from closed work orders.

import { query } from "./_generated/server";
import { v } from "convex/values";

export type TATEstimate = {
  aircraftType: string;
  averageDays: number;
  sampleCount: number;
  minDays: number;
  maxDays: number;
};

export const getEstimates = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    // Get all closed work orders with scheduling dates
    const allWOs = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const closedWOs = allWOs.filter(
      (wo) =>
        wo.status === "closed" &&
        wo.scheduledStartDate &&
        (wo.closedAt || wo.promisedDeliveryDate),
    );

    // Group by aircraft type
    const byType = new Map<
      string,
      { totalDays: number; count: number; min: number; max: number }
    >();

    for (const wo of closedWOs) {
      if (!wo.aircraftId) continue;
      const aircraft = await ctx.db.get(wo.aircraftId);
      if (!aircraft) continue;

      const aircraftType = `${aircraft.make} ${aircraft.model}`;
      const startMs = wo.scheduledStartDate!;
      const endMs = wo.closedAt ?? wo.promisedDeliveryDate!;
      const durationDays = Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)));

      const existing = byType.get(aircraftType) ?? {
        totalDays: 0,
        count: 0,
        min: Infinity,
        max: 0,
      };
      existing.totalDays += durationDays;
      existing.count += 1;
      existing.min = Math.min(existing.min, durationDays);
      existing.max = Math.max(existing.max, durationDays);
      byType.set(aircraftType, existing);
    }

    const estimates: TATEstimate[] = [];
    for (const [aircraftType, data] of byType) {
      estimates.push({
        aircraftType,
        averageDays: Math.round(data.totalDays / data.count),
        sampleCount: data.count,
        minDays: data.min === Infinity ? 0 : data.min,
        maxDays: data.max,
      });
    }

    return estimates;
  },
});
