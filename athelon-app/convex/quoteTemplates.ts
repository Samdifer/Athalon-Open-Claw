/**
 * Quote Templates — Wave 4
 *
 * Reusable templates for quickly populating quote line items.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const lineItemSchema = v.object({
  type: v.union(v.literal("labor"), v.literal("part"), v.literal("external_service")),
  description: v.string(),
  qty: v.number(),
  unitPrice: v.number(),
  directCost: v.optional(v.number()),
  markupMultiplier: v.optional(v.number()),
});

export const list = query({
  args: {
    orgId: v.id("organizations"),
    aircraftTypeFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("quoteTemplates")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    if (args.aircraftTypeFilter) {
      templates = templates.filter(
        (t) => !t.aircraftTypeFilter || t.aircraftTypeFilter === args.aircraftTypeFilter
      );
    }
    return templates;
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    aircraftTypeFilter: v.optional(v.string()),
    lineItems: v.array(lineItemSchema),
  },
  handler: async (ctx, args): Promise<Id<"quoteTemplates">> => {
    return await ctx.db.insert("quoteTemplates", {
      orgId: args.orgId,
      name: args.name,
      aircraftTypeFilter: args.aircraftTypeFilter,
      lineItems: args.lineItems,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    templateId: v.id("quoteTemplates"),
    name: v.optional(v.string()),
    aircraftTypeFilter: v.optional(v.string()),
    lineItems: v.optional(v.array(lineItemSchema)),
  },
  handler: async (ctx, args): Promise<void> => {
    const { templateId, ...updates } = args;
    const filtered: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) filtered.name = updates.name;
    if (updates.aircraftTypeFilter !== undefined) filtered.aircraftTypeFilter = updates.aircraftTypeFilter;
    if (updates.lineItems !== undefined) filtered.lineItems = updates.lineItems;
    await ctx.db.patch(templateId, filtered);
  },
});

export const duplicate = mutation({
  args: { templateId: v.id("quoteTemplates") },
  handler: async (ctx, args): Promise<Id<"quoteTemplates">> => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    return await ctx.db.insert("quoteTemplates", {
      orgId: template.orgId,
      name: `${template.name} (Copy)`,
      aircraftTypeFilter: template.aircraftTypeFilter,
      lineItems: template.lineItems,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const toggleActive = mutation({
  args: { templateId: v.id("quoteTemplates") },
  handler: async (ctx, args): Promise<void> => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    await ctx.db.patch(args.templateId, {
      isActive: !template.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const insertIntoQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    templateId: v.id("quoteTemplates"),
  },
  handler: async (ctx, args): Promise<void> => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found");

    // Get current max sortOrder
    const existing = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_quote", (q) => q.eq("quoteId", args.quoteId))
      .collect();
    let maxSort = existing.reduce((m, li) => Math.max(m, li.sortOrder ?? 0), 0);

    const now = Date.now();
    for (const item of template.lineItems) {
      maxSort += 1;
      const total = item.qty * item.unitPrice;
      await ctx.db.insert("quoteLineItems", {
        orgId: args.orgId,
        quoteId: args.quoteId,
        type: item.type,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total,
        sortOrder: maxSort,
        directCost: item.directCost,
        markupMultiplier: item.markupMultiplier,
        pricingMode: "derived",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate quote totals
    const allLines = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_quote", (q) => q.eq("quoteId", args.quoteId))
      .collect();
    const laborTotal = allLines.filter((l) => l.type === "labor").reduce((s, l) => s + l.total, 0);
    const partsTotal = allLines.filter((l) => l.type === "part").reduce((s, l) => s + l.total, 0);
    const extTotal = allLines.filter((l) => l.type === "external_service").reduce((s, l) => s + l.total, 0);
    const subtotal = laborTotal + partsTotal + extTotal;
    await ctx.db.patch(args.quoteId, {
      laborTotal,
      partsTotal,
      subtotal,
      total: subtotal + (quote.tax ?? 0),
      updatedAt: now,
    });
  },
});
