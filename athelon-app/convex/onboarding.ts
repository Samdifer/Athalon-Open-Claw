import { mutation, query } from "./_generated/server";
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

async function findOrganizationByName(
  ctx: { db: any },
  preferredOrganizationName?: string,
) {
  const preferred = normalizeOrganizationName(preferredOrganizationName);
  if (!preferred) return null;

  const organizations = await ctx.db.query("organizations").collect();
  return (
    organizations.find(
      (org: any) => normalizeOrganizationName(org.name) === preferred,
    ) ?? null
  );
}

async function resolveSelectedOrganization(
  ctx: { db: any },
  preferredClerkOrganizationId?: string,
  preferredOrganizationName?: string,
) {
  if (preferredClerkOrganizationId) {
    const preferredOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_organization", (q: any) =>
        q.eq("clerkOrganizationId", preferredClerkOrganizationId),
      )
      .first();

    if (preferredOrg) {
      return preferredOrg;
    }
  }

  return findOrganizationByName(ctx, preferredOrganizationName);
}

async function resolvePreferredTechnician(
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
    const selectedOrg = await resolveSelectedOrganization(
      ctx,
      preferredClerkOrganizationId,
      preferredOrganizationName,
    );
    if (!selectedOrg) return null;

    const scoped = technicians.filter(
      (tech: any) => tech.organizationId === selectedOrg._id,
    );
    const scopedTech = pickLatestTechnician(scoped);
    if (scopedTech) {
      return { tech: scopedTech, org: selectedOrg };
    }
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

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; name?: string | null; email?: string | null } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED");
  }
  return identity;
}

export const getBootstrapStatus = query({
  args: {
    preferredClerkOrganizationId: v.optional(v.string()),
    preferredOrganizationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "loading" as const };
    }

    const resolved = await resolvePreferredTechnician(
      ctx,
      identity.subject,
      args.preferredClerkOrganizationId,
      args.preferredOrganizationName,
    );
    const technician = resolved?.tech ?? null;

    if (!technician) {
      return { status: "needs_bootstrap" as const };
    }

    const org = resolved?.org ?? null;
    if (!org) {
      return { status: "needs_bootstrap" as const };
    }

    return {
      status: "ready" as const,
      orgId: technician.organizationId,
      techId: technician._id,
    };
  },
});

export const linkUserToSelectedOrganization = mutation({
  args: {
    preferredClerkOrganizationId: v.optional(v.string()),
    preferredOrganizationName: v.optional(v.string()),
    legalName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const selectedOrg = await resolveSelectedOrganization(
      ctx,
      args.preferredClerkOrganizationId,
      args.preferredOrganizationName,
    );
    if (!selectedOrg) {
      throw new Error(
        "Selected organization is not mapped in Athelon. Ask an admin to set the Clerk organization mapping.",
      );
    }

    const existingTechnicians = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const existingInSelected = existingTechnicians.find(
      (tech) => tech.organizationId === selectedOrg._id,
    );
    if (existingInSelected) {
      return {
        organizationId: existingInSelected.organizationId,
        technicianId: existingInSelected._id,
        linked: false,
      };
    }

    const legalName =
      args.legalName?.trim() ||
      identity.name?.trim() ||
      identity.email?.split("@")[0] ||
      "Administrator";
    const now = Date.now();

    const technicianId = await ctx.db.insert("technicians", {
      organizationId: selectedOrg._id,
      userId: identity.subject,
      legalName,
      email: identity.email ?? undefined,
      status: "active",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return {
      organizationId: selectedOrg._id,
      technicianId,
      linked: true,
    };
  },
});

export const bootstrapOrganizationAndAdmin = mutation({
  args: {
    organizationName: v.string(),
    legalName: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    // Idempotent by Clerk user ID.
    const existingTech = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existingTech) {
      return {
        organizationId: existingTech.organizationId,
        technicianId: existingTech._id,
      };
    }

    const organizationName = args.organizationName.trim();
    if (!organizationName) {
      throw new Error("Organization name is required.");
    }

    const city = args.city.trim();
    const state = args.state.trim().toUpperCase();
    const country = args.country.trim().toUpperCase();
    if (!city || !state || !country) {
      throw new Error("City, state, and country are required.");
    }

    const legalName =
      args.legalName?.trim() ||
      identity.name?.trim() ||
      identity.email?.split("@")[0] ||
      "Administrator";

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: organizationName,
      part145Ratings: [],
      address: "Setup in progress",
      city,
      state,
      zip: "00000",
      country,
      email: identity.email ?? undefined,
      subscriptionTier: "starter",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const techId = await ctx.db.insert("technicians", {
      organizationId: orgId,
      userId: identity.subject,
      legalName,
      email: identity.email ?? undefined,
      status: "active",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("shopLocations", {
      organizationId: orgId,
      name: "Main Shop",
      code: "MAIN",
      city,
      state,
      country,
      isActive: true,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      organizationId: orgId,
      technicianId: techId,
    };
  },
});
