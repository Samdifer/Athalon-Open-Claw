// convex/fleetCalendar.ts
// Athelon — Fleet Calendar query

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

/**
 * Returns scheduled work orders for a given month range (for calendar view).
 */
export const listScheduledWorkOrders = query({
  args: {
    organizationId: v.id("organizations"),
    rangeStartMs: v.number(),
    rangeEndMs: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get all WOs for this org
    const wos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    // Filter to those with a scheduled date in range
    const inRange = wos.filter((wo) => {
      const dateMs = wo.scheduledStartDate ?? wo.promisedDeliveryDate;
      if (!dateMs) return false;
      return dateMs >= args.rangeStartMs && dateMs <= args.rangeEndMs;
    });

    // Enrich with aircraft tail
    const enriched = await Promise.all(
      inRange.map(async (wo) => {
        const ac = wo.aircraftId ? await ctx.db.get(wo.aircraftId) : null;
        return {
          _id: wo._id,
          workOrderNumber: wo.workOrderNumber,
          status: wo.status,
          scheduledStartDate: wo.scheduledStartDate,
          promisedDeliveryDate: wo.promisedDeliveryDate,
          aircraftId: wo.aircraftId,
          tailNumber: ac?.currentRegistration ?? null,
        };
      }),
    );

    return enriched;
  },
});
