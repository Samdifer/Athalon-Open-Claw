// convex/form8130.ts
// Athelon — FAA Form 8130-3 Data Retrieval
//
// Query to fetch a complete 8130-3 record with related org and part data,
// used by the Download8130Button frontend component.

import { query } from "./_generated/server";
import { v } from "convex/values";

export const getForm8130Data = query({
  args: {
    recordId: v.id("eightOneThirtyRecords"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) return null;

    // Fetch the organization name
    const org = await ctx.db.get(record.organizationId);

    // Fetch the linked part if it exists
    const part = record.partId ? await ctx.db.get(record.partId) : null;

    return {
      ...record,
      organizationName: org?.name ?? record.organizationName ?? "",
      partData: part,
    };
  },
});
