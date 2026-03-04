import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const listOrgs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("organizations").collect();
  },
});

export const listAllAircraft = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aircraft").collect();
  },
});

export const listAllWorkOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workOrders").collect();
  },
});

export const listAllTechnicians = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("technicians").collect();
  },
});

export const listAllTaskCards = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("taskCards").collect();
  },
});

export const listAllParts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("parts").collect();
  },
});

export const listAllCustomers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").collect();
  },
});

export const listAllDiscrepancies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("discrepancies").collect();
  },
});

export const listAllQuotes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("quotes").collect();
  },
});

// ─── SIM-ONLY: Create signature auth event (bypasses Clerk auth) ───────────
import { internalMutation } from "../_generated/server";

export const simCreateAuthEvent = internalMutation({
  args: {
    technicianId: v.id("technicians"),
    intendedTable: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Tech not found");
    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q: any) => q.eq("technicianId", args.technicianId))
      .filter((q: any) => q.eq(q.field("active"), true))
      .first();
    const eventId = await ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `sim-${now}`,
      clerkSessionId: `sim-session-${now}`,
      userId: "sim_qcm_rosa",
      technicianId: args.technicianId,
      authenticatedLegalName: tech.legalName,
      authenticatedCertNumber: cert?.certificateNumber ?? "SIM-CERT",
      authMethod: "pin" as const,
      intendedTable: args.intendedTable,
      authenticatedAt: now,
      expiresAt: now + 300_000,
      consumed: false,
    });
    return { eventId, expiresAt: now + 300_000 };
  },
});
