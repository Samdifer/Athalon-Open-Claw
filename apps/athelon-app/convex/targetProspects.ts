/**
 * targetProspects.ts — Market Intel Target Prospect Backend
 *
 * Queries and mutations for enriched repair-station targeting data.
 * Internal sales/ops surface — no compliance implications.
 *
 * Added: 2026-03-09 — OPUS Team F (app-market-intel)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─── Auth helper (same pattern as crm.ts) ────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; name?: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Valid session required.");
  return identity.subject;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List target prospects with optional filtering.
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    targetSegment: v.optional(v.union(
      v.literal("website"),
      v.literal("erp"),
      v.literal("both"),
      v.literal("none"),
    )),
    outreachTier: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const limit = args.limit ?? 200;

    let prospects;
    if (args.targetSegment) {
      prospects = await ctx.db
        .query("targetProspects")
        .withIndex("by_org_segment", (q) =>
          q.eq("organizationId", args.organizationId)
           .eq("targetSegment", args.targetSegment!)
        )
        .take(limit);
    } else if (args.outreachTier) {
      prospects = await ctx.db
        .query("targetProspects")
        .withIndex("by_org_outreach", (q) =>
          q.eq("organizationId", args.organizationId)
           .eq("outreachTier", args.outreachTier!)
        )
        .take(limit);
    } else {
      prospects = await ctx.db
        .query("targetProspects")
        .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
        .take(limit);
    }

    // Client-side text search if search term provided
    if (args.search) {
      const s = args.search.toLowerCase();
      prospects = prospects.filter((p) =>
        p.legalName.toLowerCase().includes(s) ||
        (p.dbaName && p.dbaName.toLowerCase().includes(s)) ||
        (p.city && p.city.toLowerCase().includes(s)) ||
        (p.state && p.state.toLowerCase().includes(s)) ||
        (p.certNumber && p.certNumber.toLowerCase().includes(s))
      );
    }

    return prospects;
  },
});

/**
 * Get a single prospect by ID.
 */
export const get = query({
  args: { id: v.id("targetProspects") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.get(args.id);
  },
});

/**
 * Get summary stats for the org's target prospects.
 */
export const stats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const all = await ctx.db
      .query("targetProspects")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const total = all.length;
    const bySegment = { website: 0, erp: 0, both: 0, none: 0, unscored: 0 };
    const byTier = { A: 0, B: 0, C: 0, other: 0 };
    let avgProminence = 0;

    for (const p of all) {
      if (p.targetSegment && p.targetSegment in bySegment) {
        bySegment[p.targetSegment as keyof typeof bySegment]++;
      } else {
        bySegment.unscored++;
      }
      if (p.outreachTier === "A") byTier.A++;
      else if (p.outreachTier === "B") byTier.B++;
      else if (p.outreachTier === "C") byTier.C++;
      else byTier.other++;

      if (p.prominenceScore) avgProminence += p.prominenceScore;
    }
    if (total > 0) avgProminence /= total;

    return { total, bySegment, byTier, avgProminence };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Upsert a single prospect (by certNumber within org).
 */
export const upsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    certNumber: v.string(),
    designatorCode: v.optional(v.string()),
    legalName: v.string(),
    dbaName: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    websiteRedesignFitScore: v.optional(v.number()),
    erpCorridorLikelihood: v.optional(v.number()),
    erpEbisLikelihood: v.optional(v.number()),
    targetSegment: v.optional(v.union(
      v.literal("website"),
      v.literal("erp"),
      v.literal("both"),
      v.literal("none"),
    )),
    confidenceScore: v.optional(v.number()),
    confidenceLabel: v.optional(v.string()),
    evidenceNotes: v.optional(v.string()),
    prominenceScore: v.optional(v.number()),
    prominenceTier: v.optional(v.string()),
    clientFocusGuess: v.optional(v.string()),
    outreachTier: v.optional(v.string()),
    ratingAirframe: v.optional(v.string()),
    ratingPowerplant: v.optional(v.string()),
    ratingAccessory: v.optional(v.string()),
    ratingInstrument: v.optional(v.string()),
    ratingRadio: v.optional(v.string()),
    ratingPropeller: v.optional(v.string()),
    importBatchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const existing = await ctx.db
      .query("targetProspects")
      .withIndex("by_org_cert", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("certNumber", args.certNumber)
      )
      .first();

    const now = Date.now();

    if (existing) {
      const { organizationId, certNumber, ...updates } = args;
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return ctx.db.insert("targetProspects", {
        ...args,
        importedAt: now,
      });
    }
  },
});

/**
 * Bulk upsert for CSV import. Accepts up to 100 rows per call.
 */
export const bulkUpsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    importBatchId: v.string(),
    rows: v.array(v.object({
      certNumber: v.string(),
      designatorCode: v.optional(v.string()),
      legalName: v.string(),
      dbaName: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      country: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      website: v.optional(v.string()),
      websiteRedesignFitScore: v.optional(v.number()),
      erpCorridorLikelihood: v.optional(v.number()),
      erpEbisLikelihood: v.optional(v.number()),
      targetSegment: v.optional(v.string()),
      confidenceScore: v.optional(v.number()),
      confidenceLabel: v.optional(v.string()),
      evidenceNotes: v.optional(v.string()),
      prominenceScore: v.optional(v.number()),
      prominenceTier: v.optional(v.string()),
      clientFocusGuess: v.optional(v.string()),
      outreachTier: v.optional(v.string()),
      ratingAirframe: v.optional(v.string()),
      ratingPowerplant: v.optional(v.string()),
      ratingAccessory: v.optional(v.string()),
      ratingInstrument: v.optional(v.string()),
      ratingRadio: v.optional(v.string()),
      ratingPropeller: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.rows.length > 100) {
      throw new Error("BATCH_TOO_LARGE: Maximum 100 rows per bulkUpsert call.");
    }

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const row of args.rows) {
      const existing = await ctx.db
        .query("targetProspects")
        .withIndex("by_org_cert", (q) =>
          q.eq("organizationId", args.organizationId)
           .eq("certNumber", row.certNumber)
        )
        .first();

      // Normalize targetSegment
      const validSegments = new Set(["website", "erp", "both", "none"]);
      const segment = row.targetSegment && validSegments.has(row.targetSegment)
        ? row.targetSegment as "website" | "erp" | "both" | "none"
        : undefined;

      const data = {
        ...row,
        targetSegment: segment,
        importBatchId: args.importBatchId,
      };

      if (existing) {
        await ctx.db.patch(existing._id, { ...data, updatedAt: now });
        updated++;
      } else {
        await ctx.db.insert("targetProspects", {
          organizationId: args.organizationId,
          ...data,
          importedAt: now,
        });
        inserted++;
      }
    }

    return { inserted, updated, total: args.rows.length };
  },
});

/**
 * Update enrichment scores for a single prospect.
 */
export const updateEnrichment = mutation({
  args: {
    id: v.id("targetProspects"),
    websiteRedesignFitScore: v.optional(v.number()),
    erpCorridorLikelihood: v.optional(v.number()),
    erpEbisLikelihood: v.optional(v.number()),
    targetSegment: v.optional(v.union(
      v.literal("website"),
      v.literal("erp"),
      v.literal("both"),
      v.literal("none"),
    )),
    confidenceScore: v.optional(v.number()),
    confidenceLabel: v.optional(v.string()),
    evidenceNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});
