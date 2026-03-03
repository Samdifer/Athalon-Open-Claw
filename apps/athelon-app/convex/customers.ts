// convex/customers.ts
// Athelon — Customer Queries
//
// Minimal customer read API for the billing frontend.
// Customers are org-scoped and linked to aircraft via aircraft.customerId.

import { query } from "./_generated/server";
import { v } from "convex/values";

/** Lists all active customers for an organization. */
export const listCustomers = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("customers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.orgId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

/** Gets a single customer by ID. */
export const getCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.customerId);
  },
});
