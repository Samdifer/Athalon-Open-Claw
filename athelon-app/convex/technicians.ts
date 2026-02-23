// convex/technicians.ts
// Athelon — Technician Queries

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all technicians for an organization.
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.neq(q.field("status"), "terminated"))
      .collect();
  },
});

/**
 * Get the current user's technician record.
 */
export const getSelf = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();
  },
});

/**
 * List technicians with expiring certifications (within 90 days).
 */
export const listWithExpiringCerts = query({
  args: {
    organizationId: v.id("organizations"),
    withinDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() + args.withinDays * 24 * 60 * 60 * 1000;

    // Query IA certs expiring before the cutoff, then filter by org via technician
    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_ia_expiry", (q) =>
        q.eq("hasIaAuthorization", true).lt("iaExpiryDate", cutoff)
      )
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Enrich with technician data and filter to the requested organization
    const enriched = await Promise.all(
      certs.map(async (cert) => {
        const tech = await ctx.db.get(cert.technicianId);
        return { cert, technician: tech };
      })
    );

    return enriched.filter(
      ({ technician }) =>
        technician !== null &&
        (technician as { organizationId?: unknown }).organizationId ===
          args.organizationId
    );
  },
});
