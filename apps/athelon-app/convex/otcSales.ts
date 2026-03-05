// convex/otcSales.ts
// Over-the-counter (walk-in) sales for FBOs — quick part sales without a full work order.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const otcItemValidator = v.object({
  partId: v.optional(v.id("parts")),
  description: v.string(),
  partNumber: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
});

export const createOTCSale = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    items: v.array(otcItemValidator),
    taxRateId: v.optional(v.id("taxRates")),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("account"),
      v.literal("check"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) throw new Error("At least one item is required");

    // Calculate subtotal
    const subtotal = args.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Calculate tax
    let taxRate = 0;
    if (args.taxRateId) {
      const tax = await ctx.db.get(args.taxRateId);
      if (tax) taxRate = tax.rate;
    }
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // Generate receipt number
    const existing = await ctx.db
      .query("otcSales")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const receiptNumber = `OTC-${String(existing.length + 1).padStart(5, "0")}`;

    const now = Date.now();

    const saleId = await ctx.db.insert("otcSales", {
      organizationId: args.organizationId,
      receiptNumber,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      status: "completed",
      createdAt: now,
    });

    // Insert line items and deduct inventory
    for (const item of args.items) {
      await ctx.db.insert("otcSaleItems", {
        otcSaleId: saleId,
        organizationId: args.organizationId,
        partId: item.partId,
        description: item.description,
        partNumber: item.partNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
        createdAt: now,
      });

      // Deduct inventory if linked to a part
      if (item.partId) {
        const part = await ctx.db.get(item.partId);
        if (part) {
          // BUG-BM-HUNT-003: Previously only an audit log was written; the part's
          // location was never updated.  This left the part in "inventory" status
          // so it could be sold again via OTC or reserved for a work order.
          // Fix: mark the part as "scrapped" (consumed/sold) so it is removed from
          // available inventory.  This is the closest available location status for
          // a part that has left the building via an OTC sale.
          if (part.location === "inventory") {
            await ctx.db.patch(item.partId, {
              location: "scrapped",
              updatedAt: now,
            });
          }
          await ctx.db.insert("auditLog", {
            organizationId: args.organizationId,
            eventType: "part_removed",
            tableName: "parts",
            recordId: item.partId,
            notes: `OTC sale ${receiptNumber}: ${item.quantity}x ${item.description} — location set to scrapped`,
            timestamp: now,
          });
        }
      }
    }

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "otcSales",
      recordId: saleId,
      notes: `OTC sale ${receiptNumber} — $${total.toFixed(2)} via ${args.paymentMethod}`,
      timestamp: now,
    });

    return saleId;
  },
});

export const listOTCSales = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("otcSales")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

export const getOTCSale = query({
  args: {
    id: v.id("otcSales"),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id);
    if (!sale) return null;
    const items = await ctx.db
      .query("otcSaleItems")
      .withIndex("by_sale", (q) => q.eq("otcSaleId", args.id))
      .collect();
    return { ...sale, items };
  },
});

export const voidOTCSale = mutation({
  args: {
    id: v.id("otcSales"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id);
    if (!sale) throw new Error("Sale not found");
    if (sale.status === "voided") throw new Error("Sale already voided");

    await ctx.db.patch(args.id, { status: "voided" });

    await ctx.db.insert("auditLog", {
      organizationId: sale.organizationId,
      eventType: "status_changed",
      tableName: "otcSales",
      recordId: args.id,
      oldValue: JSON.stringify("completed"),
      newValue: JSON.stringify("voided"),
      notes: `Voided: ${args.reason}`,
      timestamp: Date.now(),
    });
  },
});
