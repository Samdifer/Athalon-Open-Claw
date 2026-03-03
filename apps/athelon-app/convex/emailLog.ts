// convex/emailLog.ts
// Athelon — Email log storage
//
// Internal mutation for logging emails + public query for the email log page.

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    stub: v.boolean(),
    errorMessage: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    relatedTable: v.optional(v.string()),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLog", {
      to: args.to,
      subject: args.subject,
      status: args.status,
      stub: args.stub,
      errorMessage: args.errorMessage,
      organizationId: args.organizationId,
      relatedTable: args.relatedTable,
      relatedId: args.relatedId,
      sentAt: Date.now(),
    });
  },
});

export const listEmails = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    let q = ctx.db.query("emailLog").order("desc");
    if (args.orgId) {
      q = ctx.db
        .query("emailLog")
        .withIndex("by_org", (idx) => idx.eq("organizationId", args.orgId))
        .order("desc");
    }
    return await q.take(limit);
  },
});
