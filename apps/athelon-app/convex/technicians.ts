// convex/technicians.ts
// Athelon — Technician Queries

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function normalizeOrganizationName(value?: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function pickLatestTechnician(technicians: any[]) {
  if (technicians.length === 0) return null;
  const sorted = [...technicians].sort((a: any, b: any) => {
    const bStamp = b.updatedAt ?? b.createdAt ?? 0;
    const aStamp = a.updatedAt ?? a.createdAt ?? 0;
    if (bStamp !== aStamp) return bStamp - aStamp;
    return b._creationTime - a._creationTime;
  });
  return sorted[0];
}

async function resolvePreferredContext(
  ctx: { db: any },
  userId: string,
  preferredClerkOrganizationId?: string,
  preferredOrganizationName?: string,
) {
  const technicians = await ctx.db
    .query("technicians")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  if (technicians.length === 0) return null;

  if (preferredClerkOrganizationId) {
    let selectedOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_organization", (q: any) =>
        q.eq("clerkOrganizationId", preferredClerkOrganizationId),
      )
      .first();

    // Backward-compat fallback for orgs that predate Clerk-org mapping.
    if (!selectedOrg) {
      const preferred = normalizeOrganizationName(preferredOrganizationName);
      if (preferred) {
        const organizations = await ctx.db.query("organizations").collect();
        selectedOrg =
          organizations.find(
            (org: any) => normalizeOrganizationName(org.name) === preferred,
          ) ?? null;
      }
    }

    // A selected Clerk org must resolve to exactly one org context.
    if (!selectedOrg) return null;

    const scoped = technicians.filter(
      (tech: any) => tech.organizationId === selectedOrg._id,
    );
    const scopedTech = pickLatestTechnician(scoped);
    if (scopedTech) {
      return { tech: scopedTech, org: selectedOrg };
    }
    // Do not silently fall back to a different org's technician.
    return null;
  }

  const enriched = (
    await Promise.all(
      technicians.map(async (tech: any) => ({
        tech,
        org: await ctx.db.get(tech.organizationId),
      })),
    )
  ).filter((entry: any) => entry.org !== null);

  if (enriched.length === 0) return null;

  const preferred = normalizeOrganizationName(preferredOrganizationName);
  if (preferred) {
    const matched = enriched.find(
      (entry: any) =>
        normalizeOrganizationName(entry.org.name) === preferred,
    );
    if (matched) return matched;
  }

  const fallbackTech = pickLatestTechnician(enriched.map((entry: any) => entry.tech));
  if (!fallbackTech) return null;
  const fallbackOrg = enriched.find((entry: any) => entry.tech._id === fallbackTech._id)?.org ?? null;
  if (!fallbackOrg) return null;

  return { tech: fallbackTech, org: fallbackOrg };
}

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
 * Bootstrap query: get the current user's technician record AND organization
 * WITHOUT requiring an organizationId as input. Uses the Clerk JWT subject to
 * find the technician record, then resolves the organization from that.
 *
 * This is the entry-point query for the client — call it once on mount to get
 * the org context for all subsequent queries.
 */
export const getMyContext = query({
  args: {
    preferredClerkOrganizationId: v.optional(v.string()),
    preferredOrganizationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const resolved = await resolvePreferredContext(
      ctx,
      identity.subject,
      args.preferredClerkOrganizationId,
      args.preferredOrganizationName,
    );
    if (!resolved) return null;

    return { tech: resolved.tech, org: resolved.org };
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

// ═══════════════════════════════════════════════════════════════════════════
// SET PIN  (TD: PIN Security)
// Sets or updates the technician's PIN hash for signature re-authentication.
// ═══════════════════════════════════════════════════════════════════════════
export const setPin = mutation({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found.");
    if (tech.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH: technician does not belong to this organization.");
    }

    const trimmed = args.pin.trim();
    if (trimmed.length < 4 || trimmed.length > 6) {
      throw new Error("PIN must be 4–6 digits.");
    }
    if (!/^\d+$/.test(trimmed)) {
      throw new Error("PIN must contain only digits.");
    }

    // SHA-256 hash the PIN
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmed);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const pinHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await ctx.db.patch(args.technicianId, {
      pinHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
