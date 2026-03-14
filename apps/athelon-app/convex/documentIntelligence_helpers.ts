// convex/documentIntelligence_helpers.ts
// Athelon — Document Intelligence Helper Queries
//
// Internal queries used by the documentIntelligence action for RBAC checks.
// Separate file because the action uses "use node" and cannot coexist with queries.

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getTechnicianForUser = internalQuery({
  args: {
    userId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!technician) return null;
    if (technician.organizationId !== args.organizationId) return null;
    if (technician.status !== "active") return null;

    return {
      _id: technician._id,
      role: technician.role,
      status: technician.status,
    };
  },
});
