import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "loading" as const };
    }

    const technician = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!technician) {
      return { status: "needs_bootstrap" as const };
    }

    const org = await ctx.db.get(technician.organizationId);
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
