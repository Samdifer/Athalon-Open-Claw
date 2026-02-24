// convex/pricing.ts
// Athelon — Aviation MRO SaaS Platform
//
// Pricing engine: pricing profiles per customer, multi-structure pricing rules,
// and the computePrice action that resolves applicable rules in priority order.
//
// Author:      Devraj Anand (Backend Engineer)
// Regulatory:  Marcus Webb
//
// Marcus note: Pricing profiles and rules are contract-level configurations that
// must be auditable. All creates and updates produce audit log entries. The
// computePrice action is read-only (resolves pricing at billing time) and does
// not write to the database — it returns the computed price for the caller to
// apply when building quote/invoice line items.
//
// Rule resolution order (computePrice):
//   1. Filter rules by orgId, appliesTo (item type), and effectiveDate/expiryDate window.
//   2. Apply scoping selectors (partId > partClass > techCertLevel/customerClass > none).
//   3. Sort by priority ASC (lower priority number = higher precedence).
//   4. First matching rule wins. If no rule matches, return baseCost as-is.
//
// Pricing profile resolution:
//   1. Look for a profile where orgId matches AND customerId matches AND dates are valid.
//   2. If none, fall back to the org default (isDefault=true).
//   3. Profile modifiers (laborRateMultiplier, partsMarkupPercent) are applied after
//      the pricing rule resolves the base unit price.

import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ═════════════════════════════════════════════════════════════════════════════
// PRICING PROFILES
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createPricingProfile
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a pricing profile for a customer (or org-wide if no customerId). */
export const createPricingProfile = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
    name: v.string(),
    laborRateOverride: v.optional(v.number()),
    laborRateMultiplier: v.optional(v.number()),
    partsMarkupPercent: v.optional(v.number()),
    partsDiscountPercent: v.optional(v.number()),
    effectiveDate: v.number(),
    expiryDate: v.optional(v.number()),
    isDefault: v.boolean(),
  },

  handler: async (ctx, args): Promise<Id<"pricingProfiles">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) throw new Error(`Organization ${args.orgId} not found or inactive.`);

    if (!args.name.trim()) throw new Error("Pricing profile name must be non-empty.");
    if (args.effectiveDate <= 0) throw new Error("effectiveDate must be a positive Unix timestamp.");
    if (args.expiryDate !== undefined && args.expiryDate <= args.effectiveDate) {
      throw new Error("expiryDate must be after effectiveDate.");
    }
    if (args.laborRateMultiplier !== undefined && args.laborRateMultiplier <= 0) {
      throw new Error("laborRateMultiplier must be > 0.");
    }

    // If this is marked as the new default, un-default existing default profiles
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("pricingProfiles")
        .withIndex("by_org_default", (q) => q.eq("orgId", args.orgId).eq("isDefault", true))
        .collect();
      for (const profile of existingDefaults) {
        await ctx.db.patch(profile._id, { isDefault: false, updatedAt: now });
      }
    }

    const profileId = await ctx.db.insert("pricingProfiles", {
      orgId: args.orgId,
      customerId: args.customerId,
      name: args.name.trim(),
      laborRateOverride: args.laborRateOverride,
      laborRateMultiplier: args.laborRateMultiplier,
      partsMarkupPercent: args.partsMarkupPercent,
      partsDiscountPercent: args.partsDiscountPercent,
      effectiveDate: args.effectiveDate,
      expiryDate: args.expiryDate,
      isDefault: args.isDefault,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "pricingProfiles",
      recordId: profileId,
      userId: callerUserId,
      notes:
        `Pricing profile "${args.name.trim()}" created. ` +
        (args.customerId ? `Customer-specific profile.` : `Org-wide profile.`) +
        (args.isDefault ? ` Marked as DEFAULT.` : ""),
      timestamp: now,
    });

    return profileId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updatePricingProfile
// ─────────────────────────────────────────────────────────────────────────────

/** Updates a pricing profile's rate fields and/or effective dates. */
export const updatePricingProfile = mutation({
  args: {
    profileId: v.id("pricingProfiles"),
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    laborRateOverride: v.optional(v.number()),
    laborRateMultiplier: v.optional(v.number()),
    partsMarkupPercent: v.optional(v.number()),
    partsDiscountPercent: v.optional(v.number()),
    effectiveDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    isDefault: v.optional(v.boolean()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error(`Pricing profile ${args.profileId} not found.`);
    if (profile.orgId !== args.orgId) throw new Error(`Profile does not belong to org.`);

    if (args.isDefault === true && !profile.isDefault) {
      // Un-default existing defaults
      const existingDefaults = await ctx.db
        .query("pricingProfiles")
        .withIndex("by_org_default", (q) => q.eq("orgId", args.orgId).eq("isDefault", true))
        .collect();
      for (const p of existingDefaults) {
        if (p._id !== args.profileId) {
          await ctx.db.patch(p._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.laborRateOverride !== undefined) patch.laborRateOverride = args.laborRateOverride;
    if (args.laborRateMultiplier !== undefined) patch.laborRateMultiplier = args.laborRateMultiplier;
    if (args.partsMarkupPercent !== undefined) patch.partsMarkupPercent = args.partsMarkupPercent;
    if (args.partsDiscountPercent !== undefined) patch.partsDiscountPercent = args.partsDiscountPercent;
    if (args.effectiveDate !== undefined) patch.effectiveDate = args.effectiveDate;
    if (args.expiryDate !== undefined) patch.expiryDate = args.expiryDate;
    if (args.isDefault !== undefined) patch.isDefault = args.isDefault;

    await ctx.db.patch(args.profileId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "pricingProfiles",
      recordId: args.profileId,
      userId: callerUserId,
      notes: `Pricing profile "${profile.name}" updated.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listPricingProfiles
// ─────────────────────────────────────────────────────────────────────────────

/** Lists all pricing profiles for the org, optionally filtered by customer. */
export const listPricingProfiles = query({
  args: {
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
  },

  handler: async (ctx, args) => {
    if (args.customerId !== undefined) {
      return ctx.db
        .query("pricingProfiles")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId!),
        )
        .collect();
    }
    return ctx.db
      .query("pricingProfiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPricingProfileForCustomer
//
// Returns the most specific active pricing profile for a customer at a given date.
// Precedence: customer-specific > org default.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the active pricing profile for a customer (customer-specific, then org default). */
export const getPricingProfileForCustomer = query({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    atDate: v.optional(v.number()),   // Unix ms — defaults to now
  },

  handler: async (ctx, args) => {
    const atDate = args.atDate ?? Date.now();

    // Try customer-specific profiles first
    const customerProfiles = await ctx.db
      .query("pricingProfiles")
      .withIndex("by_org_customer", (q) =>
        q.eq("orgId", args.orgId).eq("customerId", args.customerId),
      )
      .collect();

    const activeCustomer = customerProfiles.filter(
      (p) => p.effectiveDate <= atDate && (p.expiryDate === undefined || p.expiryDate > atDate),
    );

    if (activeCustomer.length > 0) {
      // Sort by effectiveDate descending — most recently effective wins
      activeCustomer.sort((a, b) => b.effectiveDate - a.effectiveDate);
      return activeCustomer[0];
    }

    // Fall back to org default
    const defaults = await ctx.db
      .query("pricingProfiles")
      .withIndex("by_org_default", (q) => q.eq("orgId", args.orgId).eq("isDefault", true))
      .collect();

    const activeDefaults = defaults.filter(
      (p) => p.effectiveDate <= atDate && (p.expiryDate === undefined || p.expiryDate > atDate),
    );

    if (activeDefaults.length > 0) {
      activeDefaults.sort((a, b) => b.effectiveDate - a.effectiveDate);
      return activeDefaults[0];
    }

    return null;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PRICING RULES
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createPricingRule
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a pricing rule. Rules are evaluated in priority order (lower = higher precedence). */
export const createPricingRule = mutation({
  args: {
    orgId: v.id("organizations"),
    ruleType: v.union(
      v.literal("cost_plus"),
      v.literal("list_minus"),
      v.literal("flat_rate"),
      v.literal("quantity_tier"),
    ),
    appliesTo: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    ),
    partId: v.optional(v.id("parts")),
    partClass: v.optional(v.string()),
    techCertLevel: v.optional(v.string()),
    customerClass: v.optional(v.string()),
    unitCost: v.optional(v.number()),
    markupPercent: v.optional(v.number()),
    listPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    flatRate: v.optional(v.number()),
    tierBreaks: v.optional(v.string()),
    effectiveDate: v.number(),
    expiryDate: v.optional(v.number()),
    priority: v.number(),
  },

  handler: async (ctx, args): Promise<Id<"pricingRules">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // Validate required fields per rule type
    if (args.ruleType === "cost_plus" && args.markupPercent === undefined) {
      throw new Error("markupPercent is required for cost_plus rules.");
    }
    if (args.ruleType === "list_minus" && (args.listPrice === undefined || args.discountPercent === undefined)) {
      throw new Error("listPrice and discountPercent are required for list_minus rules.");
    }
    if (args.ruleType === "flat_rate" && args.flatRate === undefined) {
      throw new Error("flatRate is required for flat_rate rules.");
    }
    if (args.ruleType === "quantity_tier" && args.tierBreaks === undefined) {
      throw new Error("tierBreaks JSON is required for quantity_tier rules.");
    }
    if (args.priority < 0) throw new Error("priority must be >= 0.");

    const ruleId = await ctx.db.insert("pricingRules", {
      orgId: args.orgId,
      ruleType: args.ruleType,
      appliesTo: args.appliesTo,
      partId: args.partId,
      partClass: args.partClass,
      techCertLevel: args.techCertLevel,
      customerClass: args.customerClass,
      unitCost: args.unitCost,
      markupPercent: args.markupPercent,
      listPrice: args.listPrice,
      discountPercent: args.discountPercent,
      flatRate: args.flatRate,
      tierBreaks: args.tierBreaks,
      effectiveDate: args.effectiveDate,
      expiryDate: args.expiryDate,
      priority: args.priority,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "pricingRules",
      recordId: ruleId,
      userId: callerUserId,
      notes:
        `Pricing rule created: type=${args.ruleType}, appliesTo=${args.appliesTo}, ` +
        `priority=${args.priority}.`,
      timestamp: now,
    });

    return ruleId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updatePricingRule
// ─────────────────────────────────────────────────────────────────────────────

/** Updates a pricing rule's parameters or effective date range. */
export const updatePricingRule = mutation({
  args: {
    ruleId: v.id("pricingRules"),
    orgId: v.id("organizations"),
    unitCost: v.optional(v.number()),
    markupPercent: v.optional(v.number()),
    listPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    flatRate: v.optional(v.number()),
    tierBreaks: v.optional(v.string()),
    effectiveDate: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    priority: v.optional(v.number()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw new Error(`Pricing rule ${args.ruleId} not found.`);
    if (rule.orgId !== args.orgId) throw new Error(`Rule does not belong to org.`);

    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.unitCost !== undefined) patch.unitCost = args.unitCost;
    if (args.markupPercent !== undefined) patch.markupPercent = args.markupPercent;
    if (args.listPrice !== undefined) patch.listPrice = args.listPrice;
    if (args.discountPercent !== undefined) patch.discountPercent = args.discountPercent;
    if (args.flatRate !== undefined) patch.flatRate = args.flatRate;
    if (args.tierBreaks !== undefined) patch.tierBreaks = args.tierBreaks;
    if (args.effectiveDate !== undefined) patch.effectiveDate = args.effectiveDate;
    if (args.expiryDate !== undefined) patch.expiryDate = args.expiryDate;
    if (args.priority !== undefined) patch.priority = args.priority;

    await ctx.db.patch(args.ruleId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "pricingRules",
      recordId: args.ruleId,
      userId: callerUserId,
      notes: `Pricing rule ${args.ruleId} updated.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listPricingRules
// ─────────────────────────────────────────────────────────────────────────────

/** Lists pricing rules for the org, optionally filtered by appliesTo. */
export const listPricingRules = query({
  args: {
    orgId: v.id("organizations"),
    appliesTo: v.optional(v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    )),
  },

  handler: async (ctx, args) => {
    if (args.appliesTo !== undefined) {
      return ctx.db
        .query("pricingRules")
        .withIndex("by_org_applies_to", (q) =>
          q.eq("orgId", args.orgId).eq("appliesTo", args.appliesTo!),
        )
        .order("asc")
        .collect();
    }
    return ctx.db
      .query("pricingRules")
      .withIndex("by_org_priority", (q) => q.eq("orgId", args.orgId))
      .order("asc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: deletePricingRule
// ─────────────────────────────────────────────────────────────────────────────

/** Deletes a pricing rule. Logs deletion for audit trail. */
export const deletePricingRule = mutation({
  args: {
    ruleId: v.id("pricingRules"),
    orgId: v.id("organizations"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw new Error(`Pricing rule ${args.ruleId} not found.`);
    if (rule.orgId !== args.orgId) throw new Error(`Rule does not belong to org.`);

    await ctx.db.delete(args.ruleId);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "pricingRules",
      recordId: args.ruleId,
      userId: callerUserId,
      notes:
        `Pricing rule deleted: type=${rule.ruleType}, appliesTo=${rule.appliesTo}, ` +
        `priority=${rule.priority}.`,
      timestamp: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ACTION: computePrice
//
// Resolves the applicable pricing rule for a given item context and returns
// the computed unit price and total. Does not write to the database.
//
// Resolution algorithm (see file header for full description):
//   1. Fetch all active rules for the org + itemType at the given date.
//   2. Score each rule's specificity: partId match > partClass match > certLevel/customerClass > generic.
//   3. Sort by (specificity DESC, priority ASC).
//   4. Apply first matching rule using the rule type formula.
//   5. Apply pricing profile modifiers if a profile is provided.
// ═════════════════════════════════════════════════════════════════════════════

/** Tier break entry for quantity_tier rules. */
interface TierBreak {
  minQty: number;
  unitPrice: number;
}

/** Input context for computePrice. */
interface ComputePriceInput {
  orgId: Id<"organizations">;
  customerId?: Id<"customers">;
  itemType: "labor" | "part" | "external_service";
  partId?: Id<"parts">;
  partClass?: string;
  techCertLevel?: string;
  customerClass?: string;
  qty: number;
  baseCost: number;
  atDate?: number;
}

/** Output of computePrice. */
interface ComputePriceResult {
  unitPrice: number;
  total: number;
  ruleApplied: string | null;  // rule ID or "profile_only" or null (passthrough)
  ruleType: string | null;
  profileApplied: string | null;  // profile ID or null
}

/**
 * Resolves the applicable pricing rule and profile for an item and returns the
 * computed unit price and total. Pure read operation — does not write to the DB.
 *
 * Marcus: This action is the core of FEAT-129/130. It ensures that all pricing
 * is computed from centrally-managed rules rather than ad-hoc line item entry.
 */
export const computePrice = action({
  args: {
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
    itemType: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    ),
    partId: v.optional(v.id("parts")),
    partClass: v.optional(v.string()),
    techCertLevel: v.optional(v.string()),
    customerClass: v.optional(v.string()),
    qty: v.number(),
    baseCost: v.number(),
    atDate: v.optional(v.number()),
  },

  handler: async (ctx, args): Promise<ComputePriceResult> => {
    const atDate = args.atDate ?? Date.now();

    // Fetch all rules for this org + itemType
    const allRules = await ctx.runQuery(api.pricing.listPricingRules, {
      orgId: args.orgId,
      appliesTo: args.itemType,
    });

    // Filter to active rules at atDate
    const activeRules = allRules.filter(
      (r) =>
        r.effectiveDate <= atDate &&
        (r.expiryDate === undefined || r.expiryDate > atDate),
    );

    // Score specificity of each rule for this context
    // Higher specificity = more specific match (partId > partClass > cert/class > generic)
    function specificity(rule: typeof activeRules[number]): number {
      let score = 0;
      if (rule.partId !== undefined && rule.partId === args.partId) score += 100;
      if (rule.partClass !== undefined && rule.partClass === args.partClass) score += 10;
      if (
        (rule.techCertLevel !== undefined && rule.techCertLevel === args.techCertLevel) ||
        (rule.customerClass !== undefined && rule.customerClass === args.customerClass)
      ) score += 5;
      return score;
    }

    // Filter: exclude rules whose selectors explicitly don't match this context
    const matchingRules = activeRules.filter((r) => {
      if (r.partId !== undefined && r.partId !== args.partId) return false;
      if (r.partClass !== undefined && r.partClass !== args.partClass) return false;
      if (r.techCertLevel !== undefined && r.techCertLevel !== args.techCertLevel) return false;
      if (r.customerClass !== undefined && r.customerClass !== args.customerClass) return false;
      return true;
    });

    // Sort: specificity DESC, then priority ASC
    matchingRules.sort((a, b) => {
      const specDiff = specificity(b) - specificity(a);
      if (specDiff !== 0) return specDiff;
      return a.priority - b.priority;
    });

    let unitPrice = args.baseCost;
    let ruleApplied: string | null = null;
    let ruleType: string | null = null;

    if (matchingRules.length > 0) {
      const rule = matchingRules[0];
      ruleApplied = rule._id;
      ruleType = rule.ruleType;

      switch (rule.ruleType) {
        case "cost_plus": {
          const markup = rule.markupPercent ?? 0;
          const costBasis = rule.unitCost ?? args.baseCost;
          unitPrice = Math.round(costBasis * (1 + markup / 100) * 100) / 100;
          break;
        }
        case "list_minus": {
          const list = rule.listPrice ?? args.baseCost;
          const discount = rule.discountPercent ?? 0;
          unitPrice = Math.round(list * (1 - discount / 100) * 100) / 100;
          break;
        }
        case "flat_rate": {
          unitPrice = rule.flatRate ?? args.baseCost;
          break;
        }
        case "quantity_tier": {
          if (rule.tierBreaks) {
            const tiers: TierBreak[] = JSON.parse(rule.tierBreaks) as TierBreak[];
            // Sort tiers by minQty descending; find first tier where qty >= minQty
            tiers.sort((a, b) => b.minQty - a.minQty);
            const matchedTier = tiers.find((t) => args.qty >= t.minQty);
            if (matchedTier) {
              unitPrice = matchedTier.unitPrice;
            }
          }
          break;
        }
      }
    }

    // Apply pricing profile modifiers
    let profileApplied: string | null = null;
    if (args.customerId !== undefined) {
      const profile = await ctx.runQuery(api.pricing.getPricingProfileForCustomer, {
        orgId: args.orgId,
        customerId: args.customerId,
        atDate,
      });

      if (profile !== null) {
        profileApplied = profile._id;
        if (args.itemType === "labor") {
          if (profile.laborRateOverride !== undefined) {
            unitPrice = profile.laborRateOverride;
          } else if (profile.laborRateMultiplier !== undefined) {
            unitPrice = Math.round(unitPrice * profile.laborRateMultiplier * 100) / 100;
          }
        } else if (args.itemType === "part") {
          if (profile.partsMarkupPercent !== undefined && profile.partsMarkupPercent !== 0) {
            unitPrice = Math.round(unitPrice * (1 + profile.partsMarkupPercent / 100) * 100) / 100;
          } else if (profile.partsDiscountPercent !== undefined && profile.partsDiscountPercent !== 0) {
            unitPrice = Math.round(unitPrice * (1 - profile.partsDiscountPercent / 100) * 100) / 100;
          }
        }
      }
    }

    const total = Math.round(unitPrice * args.qty * 100) / 100;

    return {
      unitPrice,
      total,
      ruleApplied,
      ruleType,
      profileApplied,
    };
  },
});
