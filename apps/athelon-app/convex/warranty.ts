// convex/warranty.ts
// Athelon — Aviation MRO SaaS Platform
// Warranty claims management

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";
import { getNextNumber } from "./lib/numberGenerator";

export const createWarrantyClaim = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.optional(v.id("workOrders")),
    partId: v.optional(v.id("parts")),
    vendorId: v.optional(v.id("vendors")),
    customerId: v.optional(v.id("customers")),
    claimType: v.union(
      v.literal("part_defect"),
      v.literal("workmanship"),
      v.literal("oem_warranty"),
      v.literal("vendor_warranty"),
    ),
    description: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    originalInstallDate: v.optional(v.number()),
    failureDate: v.optional(v.number()),
    warrantyExpiresAt: v.optional(v.number()),
    claimedAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const claimNumber = await getNextNumber(ctx, args.organizationId, "warrantyClaim", "WC");
    return ctx.db.insert("warrantyClaims", {
      ...args,
      claimNumber,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const updateClaimStatus = mutation({
  args: {
    claimId: v.id("warrantyClaims"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("paid"),
      v.literal("closed"),
    ),
    approvedAmount: v.optional(v.number()),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.approvedAmount !== undefined) patch.approvedAmount = args.approvedAmount;
    if (args.resolution !== undefined) patch.resolution = args.resolution;
    if (args.status === "submitted") patch.submittedAt = Date.now();
    if (["approved", "denied", "paid", "closed"].includes(args.status)) {
      patch.resolvedAt = Date.now();
    }
    await ctx.db.patch(args.claimId, patch);
  },
});

export const submitClaim = mutation({
  args: { claimId: v.id("warrantyClaims") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.status !== "draft") throw new Error("Claim must be in draft status to submit");
    await ctx.db.patch(args.claimId, { status: "submitted", submittedAt: Date.now() });
  },
});

export const approveClaim = mutation({
  args: {
    claimId: v.id("warrantyClaims"),
    approvedAmount: v.number(),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.claimId, {
      status: "approved",
      approvedAmount: args.approvedAmount,
      resolution: args.resolution,
      resolvedAt: Date.now(),
    });
  },
});

export const denyClaim = mutation({
  args: {
    claimId: v.id("warrantyClaims"),
    resolution: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.claimId, {
      status: "denied",
      resolution: args.resolution,
      resolvedAt: Date.now(),
    });
  },
});

export const closeClaim = mutation({
  args: { claimId: v.id("warrantyClaims") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.claimId, { status: "closed", resolvedAt: Date.now() });
  },
});

export const listClaims = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("paid"),
      v.literal("closed"),
    )),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("warrantyClaims")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!),
        )
        .collect();
    }
    return ctx.db
      .query("warrantyClaims")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

export const getClaimDetail = query({
  args: { claimId: v.id("warrantyClaims") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.claimId);
  },
});
