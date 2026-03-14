// convex/documentExtractionJobs.ts
// Athelon — Document Extraction Job Mutations & Queries
//
// Internal mutations for the document intelligence extraction audit trail.
// Separate from the action file because "use node" files cannot export mutations.

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ─── Internal Mutations (called from the action) ──────────────────────────────

export const createExtractionJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    documentId: v.optional(v.id("documents")),
    storageId: v.id("_storage"),
    triggeredByUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"documentExtractionJobs">> => {
    return await ctx.db.insert("documentExtractionJobs", {
      organizationId: args.organizationId,
      documentId: args.documentId,
      storageId: args.storageId,
      status: "processing",
      triggeredByUserId: args.triggeredByUserId,
      startedAt: Date.now(),
    });
  },
});

export const updateExtractionJob = internalMutation({
  args: {
    jobId: v.id("documentExtractionJobs"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    extractedDataJson: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    pagesProcessed: v.optional(v.number()),
    documentTypeDetected: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      extractedDataJson: args.extractedDataJson,
      errorMessage: args.errorMessage,
      pagesProcessed: args.pagesProcessed,
      documentTypeDetected: args.documentTypeDetected,
      completedAt: Date.now(),
    });
  },
});

export const linkExtractionToPart = internalMutation({
  args: {
    jobId: v.id("documentExtractionJobs"),
    partId: v.id("parts"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.jobId, {
      linkedPartId: args.partId,
    });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listForPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("documentExtractionJobs")
      .withIndex("by_part", (q) => q.eq("linkedPartId", args.partId))
      .order("desc")
      .collect();
  },
});

export const listForOrg = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("documentExtractionJobs")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(50);
  },
});
