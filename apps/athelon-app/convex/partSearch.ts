// convex/partSearch.ts
// Athelon — Aviation MRO SaaS Platform
//
// Part number search, lot availability, and provisional part creation.
// Separated from convex/parts.ts to keep the regulatory-heavy traceability
// module focused on its core purpose.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session.",
    );
  }
  return identity.subject;
}

// ─── QUERY: searchParts ───────────────────────────────────────────────────────

/** Fuzzy-search parts by partNumber and partName. Returns up to `limit`
 *  unique part numbers with summary info for the combobox dropdown. */
export const searchParts = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const term = args.searchTerm.trim();
    if (term.length < 2) return [];
    const limit = Math.min(args.limit ?? 10, 50);

    // Search by partNumber
    const byNumber = await ctx.db
      .query("parts")
      .withSearchIndex("search_partNumber", (q) =>
        q.search("partNumber", term).eq("organizationId", args.organizationId),
      )
      .take(limit);

    // Search by partName
    const byName = await ctx.db
      .query("parts")
      .withSearchIndex("search_partName", (q) =>
        q.search("partName", term).eq("organizationId", args.organizationId),
      )
      .take(limit);

    // Deduplicate by partNumber (keep first seen)
    const seen = new Map<
      string,
      {
        _id: (typeof byNumber)[0]["_id"];
        partNumber: string;
        partName: string;
        description: string | undefined;
        condition: string;
        partCategory: string | undefined;
        quantityOnHand: number | undefined;
        isSerialized: boolean;
      }
    >();

    for (const part of [...byNumber, ...byName]) {
      const key = part.partNumber.toUpperCase();
      if (!seen.has(key)) {
        seen.set(key, {
          _id: part._id,
          partNumber: part.partNumber,
          partName: part.partName,
          description: part.description,
          condition: part.condition,
          partCategory: part.partCategory,
          quantityOnHand: part.quantityOnHand,
          isSerialized: part.isSerialized,
        });
      }
    }

    return Array.from(seen.values()).slice(0, limit);
  },
});

// ─── QUERY: listAvailableLots ─────────────────────────────────────────────────

/** Returns lots for a given part number that have remaining quantity and are
 *  in a usable condition (new or serviceable). Used by the LotPicker component. */
export const listAvailableLots = query({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const lots = await ctx.db
      .query("lots")
      .withIndex("by_org_part", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("partNumber", args.partNumber),
      )
      .collect();

    return lots
      .filter(
        (lot) =>
          lot.remainingQuantity > 0 &&
          (lot.condition === "new" || lot.condition === "serviceable"),
      )
      .map((lot) => ({
        _id: lot._id,
        lotNumber: lot.lotNumber,
        remainingQuantity: lot.remainingQuantity,
        condition: lot.condition,
        shelfLifeExpiryDate: lot.shelfLifeExpiryDate,
        receivedDate: lot.receivedDate,
      }));
  },
});

// ─── MUTATION: createProvisionalPart ──────────────────────────────────────────

/** Creates a provisional part record for a user-entered part number that does
 *  not yet exist in inventory. Idempotent — returns existing ID if the same
 *  org+partNumber already has a pending provisional. */
export const createProvisionalPart = mutation({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),
    sourceContext: v.union(
      v.literal("work_order_request"),
      v.literal("purchase_order"),
      v.literal("rotable_create"),
      v.literal("loaner_create"),
      v.literal("core_return"),
      v.literal("warranty_claim"),
      v.literal("release_certificate"),
      v.literal("parts_request"),
    ),
    sourceReferenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const normalizedPN = args.partNumber.trim().toUpperCase();

    if (!normalizedPN) {
      throw new Error("Part number is required.");
    }
    if (!args.partName.trim()) {
      throw new Error("Part name is required.");
    }

    // Idempotent: return existing pending provisional if one exists
    const existing = await ctx.db
      .query("provisionalParts")
      .withIndex("by_org_and_partNumber", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("partNumber", normalizedPN),
      )
      .first();

    if (existing && existing.status === "pending") {
      return existing._id;
    }

    return await ctx.db.insert("provisionalParts", {
      organizationId: args.organizationId,
      partNumber: normalizedPN,
      partName: args.partName.trim(),
      description: args.description?.trim(),
      createdByUserId: userId,
      sourceContext: args.sourceContext,
      sourceReferenceId: args.sourceReferenceId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});
