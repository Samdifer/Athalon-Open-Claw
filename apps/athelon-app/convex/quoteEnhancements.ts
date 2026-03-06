/**
 * Quote Enhancements — Wave 4
 *
 * Line item reordering and economics (direct cost, markup, pricing mode).
 */
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Reorder line items within a quote by providing the ordered array of IDs. */
export const reorderLineItems = mutation({
  args: {
    quoteId: v.id("quotes"),
    orderedIds: v.array(v.id("quoteLineItems")),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        sortOrder: i + 1,
        updatedAt: now,
      });
    }
  },
});

/** Update line-item economics (direct cost, markup, fixed override, pricing mode). */
export const updateLineEconomics = mutation({
  args: {
    lineItemId: v.id("quoteLineItems"),
    directCost: v.optional(v.number()),
    markupMultiplier: v.optional(v.number()),
    fixedPriceOverride: v.optional(v.number()),
    pricingMode: v.optional(v.union(v.literal("derived"), v.literal("override"))),
    isMarkupOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.directCost !== undefined) updates.directCost = args.directCost;
    if (args.markupMultiplier !== undefined) updates.markupMultiplier = args.markupMultiplier;
    if (args.fixedPriceOverride !== undefined) updates.fixedPriceOverride = args.fixedPriceOverride;
    if (args.pricingMode !== undefined) updates.pricingMode = args.pricingMode;
    if (args.isMarkupOverride !== undefined) updates.isMarkupOverride = args.isMarkupOverride;

    // If override mode and fixed price provided, update unitPrice and total
    const mode = args.pricingMode ?? item.pricingMode;
    if (mode === "override" && args.fixedPriceOverride !== undefined) {
      updates.unitPrice = args.fixedPriceOverride;
      updates.total = item.qty * args.fixedPriceOverride;
    } else if (mode === "derived" && args.directCost !== undefined && args.markupMultiplier !== undefined) {
      const derivedPrice = args.directCost * args.markupMultiplier;
      updates.unitPrice = derivedPrice;
      updates.total = item.qty * derivedPrice;
    }

    await ctx.db.patch(args.lineItemId, updates);

    // Recalculate quote totals
    const quote = await ctx.db.get(item.quoteId);
    if (!quote) return;
    const allLines = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_quote", (q) => q.eq("quoteId", item.quoteId))
      .collect();
    // Apply this item's updates locally for accurate totals
    const updatedLines = allLines.map((l) =>
      l._id === args.lineItemId ? { ...l, ...updates } : l
    );
    const laborTotal = updatedLines.filter((l) => l.type === "labor").reduce((s, l) => s + (l.total as number), 0);
    const partsTotal = updatedLines.filter((l) => l.type === "part").reduce((s, l) => s + (l.total as number), 0);
    const extTotal = updatedLines.filter((l) => l.type === "external_service").reduce((s, l) => s + (l.total as number), 0);
    const subtotal = laborTotal + partsTotal + extTotal;
    await ctx.db.patch(item.quoteId, {
      laborTotal,
      partsTotal,
      subtotal,
      total: subtotal + (quote.tax ?? 0),
      updatedAt: Date.now(),
    });
  },
});
