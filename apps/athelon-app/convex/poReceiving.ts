// convex/poReceiving.ts
// Athelon — Aviation MRO SaaS Platform
//
// PO-to-Receiving-to-Stock Pipeline — Phase 4 Inventory System
//
// Orchestrates the full pipeline: PO -> create parts records -> update PO line items.
// This module bridges the billing PO workflow (convex/billing.ts) with the parts
// traceability system (convex/parts.ts) by automating part record creation when
// goods are physically received against a purchase order.
//
// Author:      Devraj Anand (Backend Engineer)
// Regulatory:  Marcus Webb
//
// Marcus note: This module implements the receiving dock workflow required by
// §145.213(a) for procurement controls. Parts received against a PO are created
// in "pending_inspection" status per INV-23 — they cannot be issued to work orders
// until receiving inspection is completed via the existing inspection workflow.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const partConditionValidator = v.union(
  v.literal("new"),
  v.literal("serviceable"),
  v.literal("overhauled"),
  v.literal("repaired"),
  v.literal("unserviceable"),
  v.literal("quarantine"),
  v.literal("scrapped"),
);

const partCategoryValidator = v.optional(v.union(
  v.literal("consumable"),
  v.literal("standard"),
  v.literal("rotable"),
  v.literal("expendable"),
  v.literal("repairable"),
));

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: receiveAgainstPO
//
// Orchestrates the full PO receiving pipeline:
//   1. Validate PO + line item
//   2. Create lot record (if lotNumber provided)
//   3. Create parts records (one per serial for serialized, one for batch)
//   4. Update PO line item received quantities
//   5. Update PO status
//   6. Record audit trail
//
// Parts are created in "pending_inspection" location per INV-23. They must
// pass receiving inspection before becoming issuable inventory.
// ─────────────────────────────────────────────────────────────────────────────

export const receiveAgainstPO = mutation({
  args: {
    organizationId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
    lineItemId: v.id("poLineItems"),
    receivedQty: v.number(),
    // Part data
    partNumber: v.string(),
    partName: v.string(),
    serialNumbers: v.optional(v.array(v.string())),
    isSerialized: v.boolean(),
    condition: partConditionValidator,
    partCategory: partCategoryValidator,
    // Lot
    lotNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    // Financial
    unitCost: v.number(),
    // Shelf life
    hasShelfLifeLimit: v.boolean(),
    shelfLifeLimitDate: v.optional(v.number()),
    // Life limited
    isLifeLimited: v.boolean(),
    lifeLimitHours: v.optional(v.number()),
    lifeLimitCycles: v.optional(v.number()),
    // Location
    shopLocationId: v.optional(v.id("shopLocations")),
    binLocation: v.optional(v.string()),
    warehouseZone: v.optional(v.string()),
    aisle: v.optional(v.string()),
    shelf: v.optional(v.string()),
    binNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Caller
    receivedByUserId: v.string(),
  },

  handler: async (ctx, args): Promise<{
    partIds: Id<"parts">[];
    lotId?: string;
  }> => {
    const now = Date.now();
    await requireAuth(ctx);

    // ── 1. Validate PO exists and status is SUBMITTED or PARTIAL ────────────
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) {
      throw new Error(`PO ${args.purchaseOrderId} not found.`);
    }
    if (po.orgId !== args.organizationId) {
      throw new Error(`PO does not belong to organization ${args.organizationId}.`);
    }
    if (po.status !== "SUBMITTED" && po.status !== "PARTIAL") {
      throw new Error(
        `Cannot receive against PO in status "${po.status}". ` +
        `PO must be in SUBMITTED or PARTIAL status to receive items.`,
      );
    }

    // ── 2. Validate line item exists and belongs to this PO ─────────────────
    const lineItem = await ctx.db.get(args.lineItemId);
    if (!lineItem) {
      throw new Error(`PO line item ${args.lineItemId} not found.`);
    }
    if (lineItem.purchaseOrderId !== args.purchaseOrderId) {
      throw new Error(
        `Line item ${args.lineItemId} does not belong to PO ${args.purchaseOrderId}.`,
      );
    }

    // ── 3. Validate receivedQty doesn't exceed remaining ────────────────────
    if (args.receivedQty <= 0) {
      throw new Error("receivedQty must be > 0.");
    }
    const remaining = lineItem.qty - lineItem.receivedQty;
    if (args.receivedQty > remaining) {
      throw new Error(
        `Cannot receive ${args.receivedQty} units — only ${remaining} remaining ` +
        `on line item "${lineItem.description}" (ordered: ${lineItem.qty}, ` +
        `already received: ${lineItem.receivedQty}).`,
      );
    }

    // ── 4. Validate serialized parts have correct serial number count ───────
    if (args.isSerialized) {
      if (!args.serialNumbers || args.serialNumbers.length === 0) {
        throw new Error(
          "Serialized parts require at least one serial number in serialNumbers array.",
        );
      }
      if (args.serialNumbers.length !== args.receivedQty) {
        throw new Error(
          `Serialized part count mismatch: receivedQty is ${args.receivedQty} ` +
          `but ${args.serialNumbers.length} serial numbers provided. ` +
          `Each serialized part must have a unique serial number.`,
        );
      }
      // Check for duplicate serial numbers within the batch
      const uniqueSerials = new Set(args.serialNumbers.map((s) => s.trim()));
      if (uniqueSerials.size !== args.serialNumbers.length) {
        throw new Error(
          "Duplicate serial numbers detected in serialNumbers array. " +
          "Each serialized part must have a unique serial number.",
        );
      }
    }

    // ── 5. Validate life-limited and shelf-life constraints ─────────────────
    if (args.isLifeLimited) {
      if (args.lifeLimitHours == null && args.lifeLimitCycles == null) {
        throw new Error(
          "INV-11: Life-limited part requires at least one of lifeLimitHours or lifeLimitCycles.",
        );
      }
    }
    if (args.hasShelfLifeLimit && args.shelfLifeLimitDate == null) {
      throw new Error(
        "INV-12: Part with shelf life limit requires shelfLifeLimitDate.",
      );
    }

    // ── 6. Create lot record if lotNumber provided ──────────────────────────
    let lotId: string | undefined;
    if (args.lotNumber?.trim()) {
      // Store lot info as a formatted string identifier for traceability
      lotId = `LOT-${args.lotNumber.trim()}-${now}`;
    }

    // ── 7. Create parts records ─────────────────────────────────────────────
    const partIds: Id<"parts">[] = [];
    const basePart = {
      organizationId: args.organizationId,
      partNumber: args.partNumber,
      partName: args.partName,
      isSerialized: args.isSerialized,
      condition: args.condition,
      location: "pending_inspection" as const,
      isLifeLimited: args.isLifeLimited,
      lifeLimitHours: args.lifeLimitHours,
      lifeLimitCycles: args.lifeLimitCycles,
      hasShelfLifeLimit: args.hasShelfLifeLimit,
      shelfLifeLimitDate: args.shelfLifeLimitDate,
      isOwnerSupplied: false,
      shopLocationId: args.shopLocationId,
      receivingDate: now,
      purchaseOrderNumber: po.poNumber,
      // v10 PO-to-Stock fields
      unitCost: args.unitCost,
      lastPurchasePrice: args.unitCost,
      purchaseOrderId: args.purchaseOrderId,
      lotNumber: args.lotNumber?.trim(),
      batchNumber: args.batchNumber?.trim(),
      binLocation: args.binLocation?.trim(),
      warehouseZone: args.warehouseZone?.trim(),
      aisle: args.aisle?.trim(),
      shelf: args.shelf?.trim(),
      binNumber: args.binNumber?.trim(),
      partCategory: args.partCategory,
      createdAt: now,
      updatedAt: now,
    };

    if (args.isSerialized && args.serialNumbers) {
      // One record per serial number for serialized parts
      for (const serial of args.serialNumbers) {
        const partId = await ctx.db.insert("parts", {
          ...basePart,
          serialNumber: serial.trim(),
        });
        partIds.push(partId);
      }
    } else {
      // One record for non-serialized (batch) parts.
      // BUG-PC-02 fix: set quantityOnHand so that inventory counts and the
      // parts grid display the correct received quantity. Previously this field
      // was omitted, so every batch-received part showed 0 (or undefined) in
      // all inventory views that read `quantityOnHand` for display.
      const notesWithQty = args.notes
        ? `Qty received: ${args.receivedQty}. ${args.notes}`
        : `Qty received: ${args.receivedQty}`;
      const partId = await ctx.db.insert("parts", {
        ...basePart,
        quantityOnHand: args.receivedQty,
        notes: notesWithQty,
      });
      partIds.push(partId);
    }

    // ── 8. Update PO line item ──────────────────────────────────────────────
    const newReceivedQty = lineItem.receivedQty + args.receivedQty;
    const newItemStatus = newReceivedQty >= lineItem.qty ? "RECEIVED" : "PARTIAL";
    await ctx.db.patch(args.lineItemId, {
      receivedQty: newReceivedQty,
      status: newItemStatus as "PENDING" | "PARTIAL" | "RECEIVED",
      updatedAt: now,
    });

    // ── 9. Update PO status ─────────────────────────────────────────────────
    const allItems = await ctx.db
      .query("poLineItems")
      .withIndex("by_po", (q) => q.eq("purchaseOrderId", args.purchaseOrderId))
      .collect();

    // Check if all items are now RECEIVED (accounting for the update we just made)
    const allReceived = allItems.every((item) => {
      if (item._id === args.lineItemId) {
        return newReceivedQty >= item.qty;
      }
      return item.status === "RECEIVED" || item.receivedQty >= item.qty;
    });

    const newPoStatus = allReceived ? "RECEIVED" : "PARTIAL";
    await ctx.db.patch(args.purchaseOrderId, {
      status: newPoStatus as "SUBMITTED" | "PARTIAL" | "RECEIVED",
      updatedAt: now,
    });

    // ── 10. Record audit trail ──────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "parts",
      recordId: partIds[0],
      userId: args.receivedByUserId,
      notes: `PO ${po.poNumber} receiving: ${args.receivedQty}x ${args.partNumber} "${args.partName}" ` +
        `received against line item "${lineItem.description}". ` +
        `${partIds.length} part record(s) created in pending_inspection. ` +
        `PO status → ${newPoStatus}.` +
        (args.lotNumber ? ` Lot: ${args.lotNumber}.` : ""),
      timestamp: now,
    });

    return { partIds, lotId };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listPOsAwaitingReceiving
//
// Returns POs with status SUBMITTED or PARTIAL for the given org.
// These are the POs that have outstanding items to receive.
// ─────────────────────────────────────────────────────────────────────────────

export const listPOsAwaitingReceiving = query({
  args: {
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    // Fetch SUBMITTED POs
    const submitted = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.organizationId).eq("status", "SUBMITTED"),
      )
      .order("desc")
      .collect();

    // Fetch PARTIAL POs
    const partial = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_org_status", (q) =>
        q.eq("orgId", args.organizationId).eq("status", "PARTIAL"),
      )
      .order("desc")
      .collect();

    // Combine and sort by creation date descending
    const combined = [...submitted, ...partial].sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    // Enrich with line item counts
    const enriched = await Promise.all(
      combined.map(async (po) => {
        const lineItems = await ctx.db
          .query("poLineItems")
          .withIndex("by_po", (q) => q.eq("purchaseOrderId", po._id))
          .collect();

        const totalItems = lineItems.length;
        const receivedItems = lineItems.filter(
          (item) => item.status === "RECEIVED",
        ).length;
        const pendingItems = totalItems - receivedItems;

        return {
          ...po,
          lineItemCount: totalItems,
          receivedItemCount: receivedItems,
          pendingItemCount: pendingItems,
        };
      }),
    );

    return enriched;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPOReceivingDetail
//
// Returns a PO with all its line items and receiving progress.
// Used by the PO Receiving Wizard to display line item status and
// determine which items still need receiving.
// ─────────────────────────────────────────────────────────────────────────────

export const getPOReceivingDetail = query({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
  },

  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) {
      throw new Error(`PO ${args.purchaseOrderId} not found.`);
    }

    const lineItems = await ctx.db
      .query("poLineItems")
      .withIndex("by_po", (q) => q.eq("purchaseOrderId", args.purchaseOrderId))
      .collect();

    // Enrich line items with receiving progress
    const enrichedLineItems = lineItems.map((item) => ({
      ...item,
      remainingQty: item.qty - item.receivedQty,
      isFullyReceived: item.receivedQty >= item.qty,
    }));

    return {
      ...po,
      lineItems: enrichedLineItems,
    };
  },
});
