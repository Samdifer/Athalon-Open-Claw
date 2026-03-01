// convex/aircraft.ts
// Athelon — Aircraft Queries and Mutations

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

/**
 * List all aircraft for an organization with their current status.
 * Returns denormalized data for efficient list rendering.
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q) =>
        q.eq("operatingOrganizationId", args.organizationId)
      )
      .collect();

    // For each aircraft, get open work order count
    const enriched = await Promise.all(
      aircraft.map(async (ac) => {
        const openWos = await ctx.db
          .query("workOrders")
          .withIndex("by_aircraft", (q) => q.eq("aircraftId", ac._id))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "open"),
              q.eq(q.field("status"), "in_progress"),
              q.eq(q.field("status"), "pending_inspection"),
              q.eq(q.field("status"), "pending_signoff"),
              q.eq(q.field("status"), "on_hold"),
              q.eq(q.field("status"), "open_discrepancies")
            )
          )
          .collect();

        return {
          ...ac,
          openWorkOrderCount: openWos.length,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single aircraft by tail number within an org.
 */
export const getByTailNumber = query({
  args: {
    organizationId: v.id("organizations"),
    tailNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("aircraft")
      .withIndex("by_registration", (q) =>
        q.eq("currentRegistration", args.tailNumber)
      )
      .filter((q) => q.eq(q.field("operatingOrganizationId"), args.organizationId))
      .first();
  },
});

/**
 * Get a single aircraft by ID.
 */
export const getById = query({
  args: {
    aircraftId: v.id("aircraft"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.aircraftId);
  },
});

/**
 * Create a new aircraft record for an organization.
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    tailNumber: v.string(),
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    serialNumber: v.string(),
    year: v.optional(v.number()),
    totalTimeAirframeHours: v.number(),
    customerId: v.optional(v.id("customers")),
    experimental: v.optional(v.boolean()),
    aircraftCategory: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("utility"),
        v.literal("acrobatic"),
        v.literal("limited"),
        v.literal("lsa"),
        v.literal("experimental"),
        v.literal("restricted"),
        v.literal("provisional"),
      ),
    ),
    engineCount: v.optional(v.number()),
    maxGrossWeightLbs: v.optional(v.number()),
    baseLocation: v.optional(v.string()),
    operatingRegulation: v.optional(
      v.union(
        v.literal("part_91"),
        v.literal("part_135"),
        v.literal("part_121"),
        v.literal("part_137"),
        v.literal("part_91_135_mixed"),
        v.literal("pending_determination"),
      ),
    ),
    ownerName: v.optional(v.string()),
    hobbsReading: v.optional(v.number()),
    totalLandingCycles: v.optional(v.number()),
    typeCertificateNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const aircraftId = await ctx.db.insert("aircraft", {
      operatingOrganizationId: args.organizationId,
      currentRegistration: args.tailNumber,
      make: args.make,
      model: args.model,
      series: args.series,
      serialNumber: args.serialNumber,
      yearOfManufacture: args.year,
      totalTimeAirframeHours: args.totalTimeAirframeHours,
      totalTimeAirframeAsOfDate: now,
      experimental: args.experimental ?? false,
      aircraftCategory: args.aircraftCategory ?? "normal",
      engineCount: args.engineCount ?? 1,
      maxGrossWeightLbs: args.maxGrossWeightLbs,
      baseLocation: args.baseLocation,
      operatingRegulation: args.operatingRegulation,
      ownerName: args.ownerName,
      hobbsReading: args.hobbsReading,
      hobbsAsOfDate: args.hobbsReading ? now : undefined,
      totalLandingCycles: args.totalLandingCycles,
      totalLandingCyclesAsOfDate: args.totalLandingCycles ? now : undefined,
      typeCertificateNumber: args.typeCertificateNumber,
      status: "airworthy",
      customerId: args.customerId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "aircraft",
      recordId: aircraftId,
      userId: identity.subject,
      timestamp: now,
      notes: `Aircraft ${args.tailNumber} added to fleet`,
    });

    return aircraftId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ENGINES / PROPELLERS — Component queries for aircraft detail page
// ─────────────────────────────────────────────────────────────────────────────

export const listEnginesForAircraft = query({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("engines")
      .filter((q) => q.eq(q.field("currentAircraftId"), args.aircraftId))
      .collect();
  },
});

export const listPropellersForAircraft = query({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("propellers")
      .withIndex("by_aircraft", (q) => q.eq("aircraftId", args.aircraftId))
      .collect();
  },
});

export const addPropeller = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    position: v.union(
      v.literal("single"),
      v.literal("left"),
      v.literal("right"),
      v.literal("rear"),
      v.literal("forward"),
    ),
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),
    totalTimeHours: v.optional(v.number()),
    timeSinceOverhaulHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert("propellers", {
      ...args,
      totalTimeAsOfDate: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createEngine = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),
    position: v.optional(v.string()),
    totalTimeHours: v.number(),
    timeSinceNewHours: v.optional(v.number()),
    timeSinceOverhaulHours: v.optional(v.number()),
    timeBetweenOverhaulLimit: v.optional(v.number()),
    totalCycles: v.optional(v.number()),
    cyclesSinceOverhaul: v.optional(v.number()),
    cycleBetweenOverhaulLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const engineId = await ctx.db.insert("engines", {
      make: args.make,
      model: args.model,
      serialNumber: args.serialNumber,
      currentAircraftId: args.aircraftId,
      position: args.position,
      totalTimeHours: args.totalTimeHours,
      totalTimeAsOfDate: now,
      timeSinceNewHours: args.timeSinceNewHours ?? args.totalTimeHours,
      timeSinceOverhaulHours: args.timeSinceOverhaulHours,
      timeBetweenOverhaulLimit: args.timeBetweenOverhaulLimit,
      totalCycles: args.totalCycles,
      totalCyclesAsOfDate: args.totalCycles ? now : undefined,
      cyclesSinceOverhaul: args.cyclesSinceOverhaul,
      cycleBetweenOverhaulLimit: args.cycleBetweenOverhaulLimit,
      status: "installed",
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "engines",
      recordId: engineId,
      userId,
      timestamp: now,
      notes: `Engine ${args.make} ${args.model} S/N ${args.serialNumber} installed on aircraft`,
    });

    return engineId;
  },
});
