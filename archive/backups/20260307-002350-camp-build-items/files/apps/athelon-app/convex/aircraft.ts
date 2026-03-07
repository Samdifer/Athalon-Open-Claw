// convex/aircraft.ts
// Athelon — Aircraft Queries and Mutations

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

function normalizeTail(value?: string | null): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeCampAircraftId(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function getCampLinkState(aircraft: any): "linked" | "unlinked" | "conflict" | "stale" {
  if (!aircraft.campAircraftId) return "unlinked";
  if (aircraft.campStatus === "conflict") return "conflict";
  const staleThresholdMs = 1000 * 60 * 60 * 24 * 7;
  const ageMs = aircraft.campLastSyncAt ? Date.now() - aircraft.campLastSyncAt : Number.POSITIVE_INFINITY;
  if (aircraft.campStatus === "stale" || ageMs > staleThresholdMs || aircraft.campSyncHealth === "failed") {
    return "stale";
  }
  return "linked";
}

function campSnapshot(aircraft: any) {
  return {
    campAircraftId: aircraft.campAircraftId,
    campTailNumber: aircraft.campTailNumber,
    campStatus: aircraft.campStatus,
    campLastSyncAt: aircraft.campLastSyncAt,
    campSyncHealth: aircraft.campSyncHealth,
    campLinkageConfidence: aircraft.campLinkageConfidence,
    campLinkageMethod: aircraft.campLinkageMethod,
  };
}

/**
 * List all aircraft for an organization with their current status.
 * Returns denormalized data for efficient list rendering.
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scopedAircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q) =>
        q.eq("operatingOrganizationId", args.organizationId)
      )
      .collect();

    const orgWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const openStatuses = new Set([
      "open",
      "in_progress",
      "pending_inspection",
      "pending_signoff",
      "on_hold",
      "open_discrepancies",
    ]);

    const openCountByAircraft = new Map<string, number>();
    const nextScheduledByAircraft = new Map<string, number>();
    for (const wo of orgWorkOrders) {
      if (!openStatuses.has(wo.status)) continue;
      const key = wo.aircraftId;
      openCountByAircraft.set(key, (openCountByAircraft.get(key) ?? 0) + 1);

      if (!wo.scheduledStartDate || wo.scheduledStartDate <= now) continue;
      const current = nextScheduledByAircraft.get(key);
      if (current === undefined || wo.scheduledStartDate < current) {
        nextScheduledByAircraft.set(key, wo.scheduledStartDate);
      }
    }

    const aircraftDocs = await ctx.db
      .query("documents")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const imageDocsByAircraftId = new Map<string, any[]>();
    for (const doc of aircraftDocs) {
      if (doc.attachedToTable !== "aircraft") continue;
      if (!doc.mimeType.startsWith("image/")) continue;
      const key = doc.attachedToId;
      const rows = imageDocsByAircraftId.get(key) ?? [];
      rows.push(doc);
      imageDocsByAircraftId.set(key, rows);
    }

    // Self-heal read path: include aircraft referenced by org work orders even if
    // operatingOrganizationId has not been linked yet.
    const aircraftById = new Map(scopedAircraft.map((ac) => [ac._id, ac]));
    const uniqueWorkOrderAircraftIds = new Set(
      orgWorkOrders.map((wo) => wo.aircraftId),
    );
    for (const aircraftId of uniqueWorkOrderAircraftIds) {
      if (aircraftById.has(aircraftId)) continue;
      const aircraft = await ctx.db.get(aircraftId);
      if (!aircraft) continue;
      if (
        aircraft.operatingOrganizationId &&
        aircraft.operatingOrganizationId !== args.organizationId
      ) {
        continue;
      }
      aircraftById.set(aircraft._id, aircraft);
    }

    const rows = await Promise.all(
      Array.from(aircraftById.values()).map(async (ac) => {
        const key = String(ac._id);
        const imageDocs = imageDocsByAircraftId.get(key) ?? [];
        const featuredDoc =
          imageDocs.find((doc) =>
            (doc.description ?? "").toLowerCase().includes("[featured]"),
          ) ??
          [...imageDocs].sort((a, b) => b.uploadedAt - a.uploadedAt)[0];

        const featuredImageUrl = featuredDoc
          ? await ctx.storage.getUrl(featuredDoc.storageId)
          : null;

        return {
          ...ac,
          campLinkState: getCampLinkState(ac),
          openWorkOrderCount: openCountByAircraft.get(ac._id) ?? 0,
          nextScheduledStartDate: nextScheduledByAircraft.get(ac._id) ?? null,
          featuredImageUrl,
          galleryImageCount: imageDocs.length,
        };
      }),
    );

    return rows;
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
    const scopedAircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_registration", (q) =>
        q.eq("currentRegistration", args.tailNumber)
      )
      .filter((q) =>
        q.eq(q.field("operatingOrganizationId"), args.organizationId)
      )
      .first();

    if (scopedAircraft) return scopedAircraft;

    const candidates = await ctx.db
      .query("aircraft")
      .withIndex("by_registration", (q) =>
        q.eq("currentRegistration", args.tailNumber)
      )
      .collect();

    for (const candidate of candidates) {
      if (
        candidate.operatingOrganizationId &&
        candidate.operatingOrganizationId !== args.organizationId
      ) {
        continue;
      }

      const hasOrgWorkOrder = await ctx.db
        .query("workOrders")
        .withIndex("by_aircraft", (q) => q.eq("aircraftId", candidate._id))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();

      if (hasOrgWorkOrder) return candidate;
    }

    return null;
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

/**
 * Repair utility: links org work-order aircraft into the fleet scope when
 * operatingOrganizationId is missing.
 */
export const backfillOperatingOrganizationFromWorkOrders = mutation({
  args: {
    organizationId: v.id("organizations"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const dryRun = args.dryRun ?? false;

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const uniqueAircraftIds = Array.from(
      new Set(workOrders.map((wo) => wo.aircraftId)),
    );

    const linkedAircraftIds: string[] = [];
    const alreadyLinkedAircraftIds: string[] = [];
    const crossOrgAircraftIds: string[] = [];
    const missingAircraftIds: string[] = [];

    for (const aircraftId of uniqueAircraftIds) {
      const aircraft = await ctx.db.get(aircraftId);
      if (!aircraft) {
        missingAircraftIds.push(aircraftId);
        continue;
      }

      if (aircraft.operatingOrganizationId === args.organizationId) {
        alreadyLinkedAircraftIds.push(aircraftId);
        continue;
      }

      if (aircraft.operatingOrganizationId) {
        crossOrgAircraftIds.push(aircraftId);
        continue;
      }

      linkedAircraftIds.push(aircraftId);
      if (dryRun) continue;

      await ctx.db.patch(aircraftId, {
        operatingOrganizationId: args.organizationId,
        createdByOrganizationId: aircraft.createdByOrganizationId ?? args.organizationId,
        updatedAt: now,
      });
    }

    if (!dryRun && linkedAircraftIds.length > 0) {
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "aircraft",
        recordId: `org:${args.organizationId}`,
        userId,
        fieldName: "operatingOrganizationId",
        oldValue: JSON.stringify(null),
        newValue: JSON.stringify(args.organizationId),
        notes:
          `Backfilled operatingOrganizationId for ${linkedAircraftIds.length} ` +
          `aircraft referenced by org work orders.`,
        timestamp: now,
      });
    }

    return {
      dryRun,
      totalWorkOrders: workOrders.length,
      totalReferencedAircraft: uniqueAircraftIds.length,
      linkedCount: linkedAircraftIds.length,
      alreadyLinkedCount: alreadyLinkedAircraftIds.length,
      crossOrgCount: crossOrgAircraftIds.length,
      missingAircraftCount: missingAircraftIds.length,
      linkedAircraftIds,
      alreadyLinkedAircraftIds,
      crossOrgAircraftIds,
      missingAircraftIds,
    };
  },
});

export const listCampLinkAudit = query({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("campLinkAudit")
      .withIndex("by_org_aircraft", (q) =>
        q.eq("organizationId", args.organizationId).eq("aircraftId", args.aircraftId)
      )
      .order("desc")
      .take(25);
  },
});

export const linkCampRecord = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    campAircraftId: v.string(),
    campTailNumber: v.optional(v.string()),
    campStatus: v.optional(v.union(v.literal("linked"), v.literal("conflict"), v.literal("stale"))),
    campSyncHealth: v.optional(v.union(v.literal("healthy"), v.literal("degraded"), v.literal("failed"), v.literal("unknown"))),
    campLastSyncAt: v.optional(v.number()),
    linkageConfidence: v.optional(v.number()),
    linkageMethod: v.union(v.literal("manual"), v.literal("import"), v.literal("api")),
    reason: v.optional(v.string()),
    confirmRelink: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new Error("Aircraft not found.");
    if (aircraft.operatingOrganizationId !== args.organizationId) {
      throw new Error("Cross-organization linking is not allowed.");
    }

    const campAircraftId = normalizeCampAircraftId(args.campAircraftId);
    if (!campAircraftId) throw new Error("CAMP aircraft ID is required.");

    const orgConflict = await ctx.db
      .query("aircraft")
      .withIndex("by_org_camp_aircraft_id", (q) =>
        q.eq("operatingOrganizationId", args.organizationId).eq("campAircraftId", campAircraftId)
      )
      .first();
    if (orgConflict && orgConflict._id !== args.aircraftId) {
      throw new Error(`CAMP aircraft ID ${campAircraftId} is already linked to another aircraft in this org.`);
    }

    const globalMatches = await ctx.db
      .query("aircraft")
      .withIndex("by_camp_aircraft_id", (q) => q.eq("campAircraftId", campAircraftId))
      .collect();
    const crossOrg = globalMatches.find(
      (row) => row._id !== args.aircraftId && row.operatingOrganizationId && row.operatingOrganizationId !== args.organizationId,
    );
    if (crossOrg) {
      throw new Error("Cross-org CAMP collision detected. CAMP aircraft ID is already bound to a different organization.");
    }

    if (aircraft.campAircraftId && aircraft.campAircraftId !== campAircraftId && !args.confirmRelink) {
      throw new Error("Aircraft is already linked to a different CAMP ID. Confirm relink before overriding production linkage.");
    }

    const before = campSnapshot(aircraft);
    await ctx.db.patch(args.aircraftId, {
      campAircraftId,
      campTailNumber: normalizeTail(args.campTailNumber),
      campStatus: args.campStatus ?? "linked",
      campLastSyncAt: args.campLastSyncAt ?? now,
      campSyncHealth: args.campSyncHealth ?? "healthy",
      campLinkageConfidence: args.linkageConfidence,
      campLinkageMethod: args.linkageMethod,
      updatedAt: now,
    });

    const afterDoc = await ctx.db.get(args.aircraftId);
    await ctx.db.insert("campLinkAudit", {
      organizationId: args.organizationId,
      aircraftId: args.aircraftId,
      action: aircraft.campAircraftId && aircraft.campAircraftId !== campAircraftId ? "relink" : "link",
      actorUserId: userId,
      linkageMethod: args.linkageMethod,
      before,
      after: afterDoc ? campSnapshot(afterDoc) : undefined,
      reason: args.reason,
      createdAt: now,
    });

    return { ok: true };
  },
});

export const unlinkCampRecord = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    reason: v.string(),
    confirmUnlink: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new Error("Aircraft not found.");
    if (aircraft.operatingOrganizationId !== args.organizationId) {
      throw new Error("Cross-organization unlink is not allowed.");
    }
    if (!aircraft.campAircraftId) throw new Error("Aircraft is not linked to CAMP.");
    if (!args.confirmUnlink) {
      throw new Error("Unlink requires explicit confirmation for production safety.");
    }

    const before = campSnapshot(aircraft);
    await ctx.db.patch(args.aircraftId, {
      campAircraftId: undefined,
      campTailNumber: undefined,
      campStatus: "unlinked",
      campLastSyncAt: now,
      campSyncHealth: "unknown",
      campLinkageConfidence: undefined,
      campLinkageMethod: undefined,
      updatedAt: now,
    });

    await ctx.db.insert("campLinkAudit", {
      organizationId: args.organizationId,
      aircraftId: args.aircraftId,
      action: "unlink",
      actorUserId: userId,
      linkageMethod: "manual",
      before,
      after: {
        campStatus: "unlinked",
        campLastSyncAt: now,
        campSyncHealth: "unknown",
      },
      reason: args.reason,
      createdAt: now,
    });

    return { ok: true };
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
