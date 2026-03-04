// convex/lots.ts
// Athelon — Aviation MRO SaaS Platform
//
// Lot / Batch Management — Inventory System v10
//
// Manages batches of parts tracked under a single certificate of conformity.
// A lot represents identical parts (same P/N) received together from a vendor.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Shared condition validator (matches schema union)
// ─────────────────────────────────────────────────────────────────────────────

const conditionValidator = v.union(
  v.literal("new"),
  v.literal("serviceable"),
  v.literal("quarantine"),
  v.literal("expired"),
  v.literal("depleted"),
);

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createLot
//
// Creates a new lot record. Auto-generates lotNumber if not provided
// (format: "LOT-YYYY-XXXXX" where XXXXX is a zero-padded random number).
// Sets issuedQuantity = 0, remainingQuantity = receivedQuantity, condition = "new".
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new lot for the organization. */
export const createLot = mutation({
  args: {
    organizationId: v.id("organizations"),
    lotNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),
    originalQuantity: v.number(),
    receivedQuantity: v.number(),
    vendorId: v.optional(v.id("vendors")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    receivedByUserId: v.string(),
    hasShelfLife: v.boolean(),
    shelfLifeExpiryDate: v.optional(v.number()),
    certificateOfConformityId: v.optional(v.id("documents")),
    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"lots">> => {
    const now = Date.now();

    // Auto-generate lotNumber if not provided
    let lotNumber = args.lotNumber;
    if (!lotNumber) {
      const year = new Date().getFullYear();
      const randomPart = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0");
      lotNumber = `LOT-${year}-${randomPart}`;
    }

    const lotId = await ctx.db.insert("lots", {
      organizationId: args.organizationId,
      lotNumber,
      batchNumber: args.batchNumber,
      partNumber: args.partNumber,
      partName: args.partName,
      description: args.description,
      certificateOfConformityId: args.certificateOfConformityId,
      eightOneThirtyId: args.eightOneThirtyId,
      originalQuantity: args.originalQuantity,
      receivedQuantity: args.receivedQuantity,
      issuedQuantity: 0,
      remainingQuantity: args.receivedQuantity,
      vendorId: args.vendorId,
      purchaseOrderId: args.purchaseOrderId,
      receivedDate: now,
      receivedByUserId: args.receivedByUserId,
      hasShelfLife: args.hasShelfLife,
      shelfLifeExpiryDate: args.shelfLifeExpiryDate,
      condition: "new" as const,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return lotId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getLot
//
// Returns a single lot record by ID, or null if not found.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a single lot by its ID. */
export const getLot = query({
  args: {
    lotId: v.id("lots"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.lotId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listLots
//
// Lists lots for an organization with optional filters for partNumber and
// condition. Uses by_org or by_org_part index depending on filters provided.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists lots for an organization, with optional partNumber and condition filters. */
export const listLots = query({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.optional(v.string()),
    condition: v.optional(
      v.union(
        v.literal("new"),
        v.literal("serviceable"),
        v.literal("quarantine"),
        v.literal("expired"),
        v.literal("depleted"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    let results;

    if (args.partNumber) {
      // Use the more specific by_org_part index when partNumber is provided
      results = await ctx.db
        .query("lots")
        .withIndex("by_org_part", (q) =>
          q.eq("organizationId", args.organizationId).eq("partNumber", args.partNumber!),
        )
        .collect();
    } else {
      // Use the general by_org index
      results = await ctx.db
        .query("lots")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .collect();
    }

    // Apply condition filter in-memory (condition is not an indexed prefix)
    if (args.condition) {
      return results.filter((lot) => lot.condition === args.condition);
    }

    return results;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: issueFromLot
//
// Issues parts from a lot. Decrements remainingQuantity, increments
// issuedQuantity. If remainingQuantity reaches 0, sets condition to "depleted".
// ─────────────────────────────────────────────────────────────────────────────

/** Issues a quantity of parts from a lot. Validates sufficient remaining quantity. */
export const issueFromLot = mutation({
  args: {
    lotId: v.id("lots"),
    quantity: v.number(),
    workOrderId: v.optional(v.id("workOrders")),
    issuedByUserId: v.string(),
  },

  handler: async (ctx, args) => {
    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error(`Lot ${args.lotId} not found.`);
    }

    if (args.quantity <= 0) {
      throw new Error("Issue quantity must be greater than zero.");
    }

    if (lot.remainingQuantity < args.quantity) {
      throw new Error(
        `Insufficient quantity: requested ${args.quantity}, but only ${lot.remainingQuantity} remaining in lot ${lot.lotNumber}.`,
      );
    }

    const newRemainingQuantity = lot.remainingQuantity - args.quantity;
    const newIssuedQuantity = lot.issuedQuantity + args.quantity;
    const newCondition = newRemainingQuantity === 0 ? ("depleted" as const) : lot.condition;

    await ctx.db.patch(args.lotId, {
      remainingQuantity: newRemainingQuantity,
      issuedQuantity: newIssuedQuantity,
      condition: newCondition,
      updatedAt: Date.now(),
    });

    // Return the updated lot
    return await ctx.db.get(args.lotId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateLotCondition
//
// Updates a lot's condition (e.g. quarantine, expire, mark serviceable).
// Records optional notes and the user who made the change.
// ─────────────────────────────────────────────────────────────────────────────

/** Updates the condition of a lot. Used for quarantining, expiring, etc. */
export const updateLotCondition = mutation({
  args: {
    lotId: v.id("lots"),
    newCondition: conditionValidator,
    notes: v.optional(v.string()),
    updatedByUserId: v.string(),
  },

  handler: async (ctx, args) => {
    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error(`Lot ${args.lotId} not found.`);
    }

    const patch: {
      condition: typeof args.newCondition;
      updatedAt: number;
      notes?: string;
    } = {
      condition: args.newCondition,
      updatedAt: Date.now(),
    };

    if (args.notes !== undefined) {
      patch.notes = args.notes;
    }

    await ctx.db.patch(args.lotId, patch);

    return await ctx.db.get(args.lotId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getLotParts
//
// Returns all parts in the parts table that belong to a given lot,
// using the by_org_lot index on the parts table.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all parts associated with a lot via the parts table by_org_lot index. */
export const getLotParts = query({
  args: {
    organizationId: v.id("organizations"),
    lotId: v.id("lots"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("parts")
      .withIndex("by_org_lot", (q) =>
        q.eq("organizationId", args.organizationId).eq("lotId", args.lotId),
      )
      .collect();
  },
});
