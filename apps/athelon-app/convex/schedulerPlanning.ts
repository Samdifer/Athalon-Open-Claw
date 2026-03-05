// convex/schedulerPlanning.ts
// Planner v2 foundations for schedule assignments + planning financial settings.
//
// This module intentionally extends scheduling capability without changing the
// regulatory work-order lifecycle model.

import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireSchedulingManager } from "./shared/helpers/schedulingPermissions";

const DEFAULT_PART_MARKUP_TIERS = [
  { maxLimit: 500, markupPercent: 30 },
  { maxLimit: 2000, markupPercent: 22 },
  { maxLimit: 10000, markupPercent: 15 },
  { maxLimit: 999999, markupPercent: 10 },
];

const DEFAULT_SERVICE_MARKUP_TIERS = [
  { maxLimit: 500, markupPercent: 25 },
  { maxLimit: 2000, markupPercent: 18 },
  { maxLimit: 10000, markupPercent: 12 },
  { maxLimit: 999999, markupPercent: 8 },
];

const dailyEffortValidator = v.array(
  v.object({
    dayOffset: v.number(),
    effortHours: v.number(),
  }),
);

const markupTierValidator = v.array(
  v.object({
    maxLimit: v.number(),
    markupPercent: v.number(),
  }),
);

const shopLocationFilterValidator = v.optional(
  v.union(v.id("shopLocations"), v.literal("all")),
);

type AssignmentWindow = {
  startDate: number;
  endDate: number;
};

type BackfillOptions = {
  organizationId: Id<"organizations">;
  includeClosed: boolean;
  createFallbackBayIfMissing: boolean;
  dryRun: boolean;
  actorUserId: string;
};

function rangesOverlap(a: AssignmentWindow, b: AssignmentWindow): boolean {
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

async function ensureShopLocationBelongsToOrg(
  ctx: {
    db: {
      get: (id: Id<"shopLocations">) => Promise<any>;
    };
  },
  organizationId: Id<"organizations">,
  shopLocationId: Id<"shopLocations">,
) {
  const location = await ctx.db.get(shopLocationId);
  if (!location || location.organizationId !== organizationId) {
    throw new Error("Shop location does not belong to this organization");
  }
}

function normalizeAircraftToken(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

async function ensureAircraftBayCompatibility(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    shopLocationId?: Id<"shopLocations">;
    bayId: Id<"hangarBays">;
    aircraft: {
      make: string;
      model: string;
      series?: string;
      currentRegistration?: string;
      serialNumber?: string;
    };
  },
) {
  const supportedRows = await ctx.db
    .query("stationSupportedAircraft")
    .withIndex("by_org_location", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
    )
    .collect();

  // Backwards compatibility mode until a location has explicit config rows.
  if (supportedRows.length === 0) return;

  const targetMake = normalizeAircraftToken(args.aircraft.make);
  const targetModel = normalizeAircraftToken(args.aircraft.model);
  const targetSeries = normalizeAircraftToken(args.aircraft.series);

  const matchingAircraftRows = supportedRows.filter((entry: any) => {
    const sameMake = normalizeAircraftToken(entry.make) === targetMake;
    const sameModel = normalizeAircraftToken(entry.model) === targetModel;
    if (!sameMake || !sameModel) return false;
    const configuredSeries = normalizeAircraftToken(entry.series);
    return !configuredSeries || configuredSeries === targetSeries;
  });

  if (matchingAircraftRows.length === 0) {
    throw new Error(
      `Aircraft ${args.aircraft.make} ${args.aircraft.model} is not configured as supported for this location.`,
    );
  }

  const isCompatibleWithBay = matchingAircraftRows.some((entry: any) => {
    if (!entry.compatibleBayIds || entry.compatibleBayIds.length === 0) return true;
    return entry.compatibleBayIds.some((id: Id<"hangarBays">) => id === args.bayId);
  });

  if (isCompatibleWithBay) return;

  const regOrSn =
    args.aircraft.currentRegistration ?? args.aircraft.serialNumber ?? "unknown registration";
  throw new Error(
    `Aircraft ${args.aircraft.make} ${args.aircraft.model} (${regOrSn}) is not compatible with the selected bay.`,
  );
}

function chooseBackfillBayId(
  bays: Array<{ _id: Id<"hangarBays">; name: string }>,
  existingWindowsByBay: Map<string, AssignmentWindow[]>,
  target: AssignmentWindow,
): Id<"hangarBays"> {
  let bestBay: { _id: Id<"hangarBays">; name: string } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const bay of bays) {
    const windows = existingWindowsByBay.get(String(bay._id)) ?? [];
    const overlapCount = windows.reduce(
      (sum, window) => sum + (rangesOverlap(window, target) ? 1 : 0),
      0,
    );
    // Strongly prefer reducing overlaps; secondarily spread by booking count.
    const score = overlapCount * 1000 + windows.length;
    if (score < bestScore) {
      bestScore = score;
      bestBay = bay;
      continue;
    }
    if (
      score === bestScore &&
      bestBay !== null &&
      bay.name.localeCompare(bestBay.name) < 0
    ) {
      bestBay = bay;
    }
  }

  if (!bestBay) {
    throw new Error("No bays available for backfill selection");
  }
  return bestBay._id;
}

async function findLinkedQuoteId(
  ctx: {
    db: {
      query: (...args: unknown[]) => any;
    };
  },
  organizationId: Id<"organizations">,
  workOrderId: Id<"workOrders">,
): Promise<Id<"quotes"> | undefined> {
  const directQuote = await ctx.db
    .query("quotes")
    .withIndex("by_work_order", (q: any) => q.eq("workOrderId", workOrderId))
    .first();

  if (directQuote && directQuote.orgId === organizationId) {
    return directQuote._id;
  }

  const convertedQuote = await ctx.db
    .query("quotes")
    .withIndex("by_converted_work_order", (q: any) =>
      q.eq("convertedToWorkOrderId", workOrderId),
    )
    .first();

  if (convertedQuote && convertedQuote.orgId === organizationId) {
    return convertedQuote._id;
  }

  return undefined;
}

async function runLegacyScheduleBackfill(
  ctx: {
    db: {
      get: (id: any) => Promise<any>;
      insert: (...args: any[]) => Promise<any>;
      patch: (...args: any[]) => Promise<any>;
      query: (...args: any[]) => any;
    };
  },
  options: BackfillOptions,
) {
  const now = Date.now();

  const org = await ctx.db.get(options.organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }

  let bays = await ctx.db
    .query("hangarBays")
    .withIndex("by_org", (q: any) => q.eq("organizationId", options.organizationId))
    .collect();

  let fallbackBayCreated = false;
  if (bays.length === 0 && options.createFallbackBayIfMissing) {
    fallbackBayCreated = true;
    if (!options.dryRun) {
      const bayId = await ctx.db.insert("hangarBays", {
        organizationId: options.organizationId,
        shopLocationId: undefined,
        name: "Backfill Bay 1",
        description: "Auto-created to support legacy scheduling migration",
        type: "hangar",
        capacity: 1,
        status: "available",
        currentAircraftId: undefined,
        currentWorkOrderId: undefined,
        createdAt: now,
        updatedAt: now,
      });
      const createdBay = await ctx.db.get(bayId);
      if (createdBay) bays = [createdBay];
    } else {
      bays = [
        {
          _id: "dry_run_backfill_bay" as Id<"hangarBays">,
          organizationId: options.organizationId,
          shopLocationId: undefined,
          name: "Backfill Bay 1",
          description: "dry run",
          type: "hangar",
          capacity: 1,
          status: "available",
          currentAircraftId: undefined,
          currentWorkOrderId: undefined,
          createdAt: now,
          updatedAt: now,
        },
      ];
    }
  }

  const sortedBays = [...bays].sort((a, b) => a.name.localeCompare(b.name));
  const bayById = new Map(sortedBays.map((bay) => [String(bay._id), bay]));

  const allAssignments = await ctx.db
    .query("scheduleAssignments")
    .withIndex("by_org", (q: any) => q.eq("organizationId", options.organizationId))
    .collect();

  const assignmentByWorkOrder = new Map<string, any>();
  const windowsByBay = new Map<string, AssignmentWindow[]>();
  for (const assignment of allAssignments) {
    assignmentByWorkOrder.set(String(assignment.workOrderId), assignment);
    if (assignment.archivedAt !== undefined) continue;
    const key = String(assignment.hangarBayId);
    const rows = windowsByBay.get(key) ?? [];
    rows.push({ startDate: assignment.startDate, endDate: assignment.endDate });
    windowsByBay.set(key, rows);
  }

  const workOrders = await ctx.db
    .query("workOrders")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", options.organizationId))
    .collect();

  const orderedWorkOrders = [...workOrders].sort(
    (a, b) =>
      (a.scheduledStartDate ?? Number.MAX_SAFE_INTEGER) -
      (b.scheduledStartDate ?? Number.MAX_SAFE_INTEGER),
  );

  let eligibleByDate = 0;
  let skippedInactiveStatus = 0;
  let skippedNoDate = 0;
  let skippedInvalidDateRange = 0;
  let skippedNoBay = 0;
  let existingAssignments = 0;
  let createdAssignments = 0;
  let updatedAssignmentQuoteLinks = 0;
  const touchedWorkOrderNumbers: string[] = [];

  for (const wo of orderedWorkOrders) {
    const inactiveStatus =
      wo.status === "closed" || wo.status === "cancelled" || wo.status === "voided";
    if (inactiveStatus && !options.includeClosed) {
      skippedInactiveStatus++;
      continue;
    }

    if (wo.scheduledStartDate === undefined || wo.promisedDeliveryDate === undefined) {
      skippedNoDate++;
      continue;
    }
    eligibleByDate++;

    if (wo.promisedDeliveryDate <= wo.scheduledStartDate) {
      skippedInvalidDateRange++;
      continue;
    }

    const linkedQuoteId = await findLinkedQuoteId(
      ctx,
      options.organizationId,
      wo._id,
    );

    const existing = assignmentByWorkOrder.get(String(wo._id));
    if (existing) {
      existingAssignments++;
      const existingBay = bayById.get(String(existing.hangarBayId));
      const inferredLocationId =
        existing.shopLocationId ?? wo.shopLocationId ?? existingBay?.shopLocationId;
      const needsLocationPatch = existing.shopLocationId !== inferredLocationId;
      if (
        (linkedQuoteId && existing.sourceQuoteId !== linkedQuoteId) ||
        needsLocationPatch
      ) {
        if (!options.dryRun) {
          await ctx.db.patch(existing._id, {
            sourceQuoteId: linkedQuoteId ?? existing.sourceQuoteId,
            shopLocationId: inferredLocationId,
            updatedAt: now,
            updatedByUserId: options.actorUserId,
          });
        }
        updatedAssignmentQuoteLinks++;
      }
      continue;
    }

    if (sortedBays.length === 0) {
      skippedNoBay++;
      continue;
    }

    const targetWindow: AssignmentWindow = {
      startDate: wo.scheduledStartDate,
      endDate: wo.promisedDeliveryDate,
    };
    const selectedBayId = chooseBackfillBayId(
      sortedBays.map((bay) => ({ _id: bay._id, name: bay.name })),
      windowsByBay,
      targetWindow,
    );
    const selectedBay = bayById.get(String(selectedBayId));
    const resolvedShopLocationId = wo.shopLocationId ?? selectedBay?.shopLocationId;

    if (!options.dryRun) {
      const assignmentId = await ctx.db.insert("scheduleAssignments", {
        organizationId: options.organizationId,
        workOrderId: wo._id,
        sourceQuoteId: linkedQuoteId,
        hangarBayId: selectedBayId,
        shopLocationId: resolvedShopLocationId,
        startDate: wo.scheduledStartDate,
        endDate: wo.promisedDeliveryDate,
        isLocked: false,
        archivedAt: undefined,
        archivedByUserId: undefined,
        createdAt: now,
        updatedAt: now,
        updatedByUserId: options.actorUserId,
      });
      assignmentByWorkOrder.set(String(wo._id), {
        _id: assignmentId,
        workOrderId: wo._id,
        sourceQuoteId: linkedQuoteId,
      });
    }

    const key = String(selectedBayId);
    const rows = windowsByBay.get(key) ?? [];
    rows.push(targetWindow);
    windowsByBay.set(key, rows);
    createdAssignments++;
    touchedWorkOrderNumbers.push(wo.workOrderNumber);
  }

  return {
    organizationId: options.organizationId,
    dryRun: options.dryRun,
    fallbackBayCreated,
    scannedWorkOrders: orderedWorkOrders.length,
    eligibleByDate,
    createdAssignments,
    existingAssignments,
    updatedAssignmentQuoteLinks,
    skippedInactiveStatus,
    skippedNoDate,
    skippedInvalidDateRange,
    skippedNoBay,
    touchedWorkOrderNumbers,
  };
}

export const upsertScheduleAssignment = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    sourceQuoteId: v.optional(v.id("quotes")),
    hangarBayId: v.id("hangarBays"),
    shopLocationId: v.optional(v.id("shopLocations")),
    startDate: v.number(),
    endDate: v.number(),
    isLocked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: args.organizationId,
      operation: "schedule assignment update",
    });
    const now = Date.now();

    if (args.endDate <= args.startDate) {
      throw new Error("End date must be after start date");
    }

    const [org, wo, bay] = await Promise.all([
      ctx.db.get(args.organizationId),
      ctx.db.get(args.workOrderId),
      ctx.db.get(args.hangarBayId),
    ]);

    if (!org) throw new Error("Organization not found");
    if (!wo) throw new Error("Work order not found");
    if (!bay) throw new Error("Hangar bay not found");
    if (wo.organizationId !== args.organizationId) {
      throw new Error("Work order does not belong to this organization");
    }
    if (bay.organizationId !== args.organizationId) {
      throw new Error("Hangar bay does not belong to this organization");
    }
    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }
    if (args.shopLocationId && bay.shopLocationId && args.shopLocationId !== bay.shopLocationId) {
      throw new Error("Selected shop location does not match the selected bay location");
    }

    let linkedQuoteId = args.sourceQuoteId;
    if (linkedQuoteId) {
      const quote = await ctx.db.get(linkedQuoteId);
      if (!quote) throw new Error("Source quote not found");
      if (quote.orgId !== args.organizationId) {
        throw new Error("Source quote does not belong to this organization");
      }
      if (quote.aircraftId !== wo.aircraftId) {
        throw new Error("Source quote aircraft does not match work order aircraft");
      }
      const tiedToWo =
        quote.workOrderId === args.workOrderId ||
        quote.convertedToWorkOrderId === args.workOrderId;
      if (!tiedToWo) {
        throw new Error("Source quote is not linked to the target work order");
      }
    } else {
      // Best-effort auto-link to quote tied directly or via conversion history.
      const directQuote = await ctx.db
        .query("quotes")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first();

      if (directQuote && directQuote.orgId === args.organizationId) {
        linkedQuoteId = directQuote._id;
      } else {
        const convertedQuote = await ctx.db
          .query("quotes")
          .withIndex("by_converted_work_order", (q) =>
            q.eq("convertedToWorkOrderId", args.workOrderId),
          )
          .first();
        if (convertedQuote && convertedQuote.orgId === args.organizationId) {
          linkedQuoteId = convertedQuote._id;
        }
      }
    }

    const existing = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org_wo", (q) =>
        q.eq("organizationId", args.organizationId).eq("workOrderId", args.workOrderId),
      )
      .first();

    const resolvedShopLocationId =
      args.shopLocationId ?? bay.shopLocationId ?? wo.shopLocationId;
    if (resolvedShopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, resolvedShopLocationId);
    }
    if (
      wo.shopLocationId &&
      resolvedShopLocationId &&
      wo.shopLocationId !== resolvedShopLocationId
    ) {
      throw new Error("Work order location does not match the selected scheduling location");
    }

    const aircraft = await ctx.db.get(wo.aircraftId);
    if (aircraft) {
      await ensureAircraftBayCompatibility(ctx, {
        organizationId: args.organizationId,
        shopLocationId: resolvedShopLocationId,
        bayId: args.hangarBayId,
        aircraft,
      });
    }

    const patch = {
      sourceQuoteId: linkedQuoteId,
      hangarBayId: args.hangarBayId,
      shopLocationId: resolvedShopLocationId,
      startDate: args.startDate,
      endDate: args.endDate,
      isLocked: args.isLocked,
      archivedAt: undefined,
      archivedByUserId: undefined,
      updatedAt: now,
      updatedByUserId: userId,
    };

    let assignmentId = existing?._id;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      assignmentId = await ctx.db.insert("scheduleAssignments", {
        organizationId: args.organizationId,
        workOrderId: args.workOrderId,
        ...patch,
        createdAt: now,
      });
    }

    if (!assignmentId) throw new Error("Failed to persist schedule assignment");

    // Audit log — capture before/after state
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "scheduleAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: existing
        ? JSON.stringify({
            hangarBayId: existing.hangarBayId,
            startDate: existing.startDate,
            endDate: existing.endDate,
            isLocked: existing.isLocked,
            shopLocationId: existing.shopLocationId,
            sourceQuoteId: existing.sourceQuoteId,
          })
        : undefined,
      newValue: JSON.stringify({
        hangarBayId: args.hangarBayId,
        startDate: args.startDate,
        endDate: args.endDate,
        isLocked: args.isLocked,
        shopLocationId: resolvedShopLocationId,
        sourceQuoteId: linkedQuoteId,
      }),
      notes: existing ? "Schedule assignment updated" : "Schedule assignment created",
      timestamp: now,
    });

    // Keep legacy WO scheduling fields synchronized for existing UI/routes.
    await ctx.db.patch(args.workOrderId, {
      scheduledStartDate: args.startDate,
      promisedDeliveryDate: args.endDate,
      shopLocationId: resolvedShopLocationId,
      updatedAt: now,
    });

    return assignmentId;
  },
});

export const setScheduleDayModel = mutation({
  args: {
    assignmentId: v.id("scheduleAssignments"),
    dailyEffort: v.optional(dailyEffortValidator),
    nonWorkDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Schedule assignment not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: assignment.organizationId,
      operation: "schedule day-model update",
    });
    const now = Date.now();

    if (args.dailyEffort) {
      for (const row of args.dailyEffort) {
        if (row.dayOffset < 0) throw new Error("dayOffset must be >= 0");
        if (row.effortHours < 0) throw new Error("effortHours must be >= 0");
      }
    }

    if (args.nonWorkDays) {
      for (const offset of args.nonWorkDays) {
        if (offset < 0) throw new Error("nonWorkDays offsets must be >= 0");
      }
    }

    const patch: {
      dailyEffort?: { dayOffset: number; effortHours: number }[];
      nonWorkDays?: number[];
      updatedAt: number;
      updatedByUserId: string;
    } = {
      updatedAt: now,
      updatedByUserId: userId,
    };

    if (args.dailyEffort !== undefined) patch.dailyEffort = args.dailyEffort;
    if (args.nonWorkDays !== undefined) patch.nonWorkDays = args.nonWorkDays;

    await ctx.db.patch(args.assignmentId, patch);
  },
});

export const listScheduleAssignments = query({
  args: {
    organizationId: v.id("organizations"),
    includeArchived: v.optional(v.boolean()),
    shopLocationId: shopLocationFilterValidator,
  },
  handler: async (ctx, { organizationId, includeArchived, shopLocationId }) => {
    const rows = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const unarchivedRows = includeArchived
      ? rows
      : rows.filter((row) => row.archivedAt === undefined);

    if (!shopLocationId || shopLocationId === "all") {
      return unarchivedRows;
    }

    await ensureShopLocationBelongsToOrg(ctx, organizationId, shopLocationId);

    const withLocation = await Promise.all(
      unarchivedRows.map(async (row) => {
        const [wo, bay] = await Promise.all([
          ctx.db.get(row.workOrderId),
          ctx.db.get(row.hangarBayId),
        ]);
        const resolvedLocationId =
          row.shopLocationId ?? wo?.shopLocationId ?? bay?.shopLocationId;
        return resolvedLocationId === shopLocationId ? row : null;
      }),
    );

    return withLocation.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

export const listPlannerProjects = query({
  args: {
    organizationId: v.id("organizations"),
    includeArchived: v.optional(v.boolean()),
    shopLocationId: shopLocationFilterValidator,
  },
  handler: async (ctx, { organizationId, includeArchived, shopLocationId }) => {
    if (shopLocationId && shopLocationId !== "all") {
      await ensureShopLocationBelongsToOrg(ctx, organizationId, shopLocationId);
    }
    const assignments = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    const filtered = includeArchived
      ? assignments
      : assignments.filter((row) => row.archivedAt === undefined);

    const projects = await Promise.all(
      filtered.map(async (assignment) => {
        const workOrder = await ctx.db.get(assignment.workOrderId);
        if (!workOrder || workOrder.organizationId !== organizationId) return null;

        let quote =
          assignment.sourceQuoteId !== undefined
            ? await ctx.db.get(assignment.sourceQuoteId)
            : null;
        if (quote && quote.orgId !== organizationId) {
          quote = null;
        }

        if (!quote) {
          quote = await ctx.db
            .query("quotes")
            .withIndex("by_work_order", (q) => q.eq("workOrderId", workOrder._id))
            .first();
        }
        if (!quote) {
          quote = await ctx.db
            .query("quotes")
            .withIndex("by_converted_work_order", (q) =>
              q.eq("convertedToWorkOrderId", workOrder._id),
            )
            .first();
        }

        const [aircraft, bay] = await Promise.all([
          ctx.db.get(workOrder.aircraftId),
          ctx.db.get(assignment.hangarBayId),
        ]);
        const resolvedLocationId =
          assignment.shopLocationId ?? workOrder.shopLocationId ?? bay?.shopLocationId;
        if (shopLocationId && shopLocationId !== "all" && resolvedLocationId !== shopLocationId) {
          return null;
        }

        return {
          assignmentId: assignment._id,
          workOrderId: workOrder._id,
          shopLocationId: resolvedLocationId,
          workOrderNumber: workOrder.workOrderNumber,
          workOrderStatus: workOrder.status,
          priority: workOrder.priority,
          description: workOrder.description,
          scheduledStartDate: assignment.startDate,
          promisedDeliveryDate: assignment.endDate,
          hangarBayId: assignment.hangarBayId,
          dailyEffort: assignment.dailyEffort ?? [],
          nonWorkDays: assignment.nonWorkDays ?? [],
          sourceQuoteId: quote?._id,
          quoteNumber: quote?.quoteNumber ?? null,
          quoteStatus: quote?.status ?? null,
          quoteTotal: quote?.total ?? null,
          aircraft: aircraft
            ? {
                currentRegistration: aircraft.currentRegistration,
                make: aircraft.make,
                model: aircraft.model,
              }
            : null,
          archivedAt: assignment.archivedAt,
          isLocked: assignment.isLocked ?? false,
        };
      }),
    );

    return projects.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );
  },
});

export const archiveScheduleAssignment = mutation({
  args: {
    assignmentId: v.id("scheduleAssignments"),
  },
  handler: async (ctx, { assignmentId }) => {
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) throw new Error("Schedule assignment not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: assignment.organizationId,
      operation: "schedule assignment archive",
    });
    const now = Date.now();

    await ctx.db.patch(assignmentId, {
      archivedAt: now,
      archivedByUserId: userId,
      updatedAt: now,
      updatedByUserId: userId,
    });

    // Audit log — archive action
    await ctx.db.insert("auditLog", {
      organizationId: assignment.organizationId,
      eventType: "record_updated",
      tableName: "scheduleAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: JSON.stringify({ archivedAt: undefined }),
      newValue: JSON.stringify({ archivedAt: now }),
      notes: "Schedule assignment archived",
      timestamp: now,
    });

    await ctx.db.insert("planningArchive", {
      organizationId: assignment.organizationId,
      entityType: "schedule_assignment",
      scheduleAssignmentId: assignmentId,
      workOrderId: assignment.workOrderId,
      archivedPayloadJson: JSON.stringify({
        hangarBayId: assignment.hangarBayId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        dailyEffort: assignment.dailyEffort ?? [],
        nonWorkDays: assignment.nonWorkDays ?? [],
      }),
      archivedAt: now,
      archivedByUserId: userId,
      restoredAt: undefined,
      restoredByUserId: undefined,
      permanentlyDeletedAt: undefined,
      permanentlyDeletedByUserId: undefined,
    });
  },
});

export const restoreScheduleAssignment = mutation({
  args: {
    assignmentId: v.id("scheduleAssignments"),
  },
  handler: async (ctx, { assignmentId }) => {
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) throw new Error("Schedule assignment not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: assignment.organizationId,
      operation: "schedule assignment restore",
    });
    const now = Date.now();

    await ctx.db.patch(assignmentId, {
      archivedAt: undefined,
      archivedByUserId: undefined,
      updatedAt: now,
      updatedByUserId: userId,
    });

    // Audit log — restore action
    await ctx.db.insert("auditLog", {
      organizationId: assignment.organizationId,
      eventType: "record_updated",
      tableName: "scheduleAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: JSON.stringify({ archivedAt: assignment.archivedAt }),
      newValue: JSON.stringify({ archivedAt: undefined }),
      notes: "Schedule assignment restored",
      timestamp: now,
    });

    const archiveRow = await ctx.db
      .query("planningArchive")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", assignment.organizationId).eq("entityType", "schedule_assignment"),
      )
      .filter((q) =>
        q.eq(q.field("scheduleAssignmentId"), assignmentId),
      )
      .first();

    if (archiveRow && archiveRow.restoredAt === undefined) {
      await ctx.db.patch(archiveRow._id, {
        restoredAt: now,
        restoredByUserId: userId,
      });
    }
  },
});

export const getPlanningFinancialSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const row = await ctx.db
      .query("planningFinancialSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .unique();

    if (row) return row;

    return {
      organizationId,
      defaultShopRate: 125,
      defaultLaborCostRate: 52,
      monthlyFixedOverhead: 38000,
      monthlyVariableOverhead: 12000,
      annualCapexAssumption: 120000,
      partMarkupTiers: DEFAULT_PART_MARKUP_TIERS,
      serviceMarkupTiers: DEFAULT_SERVICE_MARKUP_TIERS,
      updatedAt: null,
      updatedByUserId: null,
    };
  },
});

export const upsertPlanningFinancialSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    defaultShopRate: v.optional(v.number()),
    defaultLaborCostRate: v.optional(v.number()),
    monthlyFixedOverhead: v.optional(v.number()),
    monthlyVariableOverhead: v.optional(v.number()),
    annualCapexAssumption: v.optional(v.number()),
    partMarkupTiers: v.optional(markupTierValidator),
    serviceMarkupTiers: v.optional(markupTierValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: args.organizationId,
      operation: "planning financial settings update",
    });
    const now = Date.now();

    const existing = await ctx.db
      .query("planningFinancialSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const next = {
      defaultShopRate: args.defaultShopRate ?? existing?.defaultShopRate ?? 125,
      defaultLaborCostRate: args.defaultLaborCostRate ?? existing?.defaultLaborCostRate ?? 52,
      monthlyFixedOverhead: args.monthlyFixedOverhead ?? existing?.monthlyFixedOverhead ?? 38000,
      monthlyVariableOverhead:
        args.monthlyVariableOverhead ?? existing?.monthlyVariableOverhead ?? 12000,
      annualCapexAssumption: args.annualCapexAssumption ?? existing?.annualCapexAssumption ?? 120000,
      partMarkupTiers: args.partMarkupTiers ?? existing?.partMarkupTiers ?? DEFAULT_PART_MARKUP_TIERS,
      serviceMarkupTiers:
        args.serviceMarkupTiers ?? existing?.serviceMarkupTiers ?? DEFAULT_SERVICE_MARKUP_TIERS,
      updatedAt: now,
      updatedByUserId: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
      return existing._id;
    }

    return await ctx.db.insert("planningFinancialSettings", {
      organizationId: args.organizationId,
      ...next,
    });
  },
});

export const backfillLegacyScheduleAssignments = mutation({
  args: {
    organizationId: v.id("organizations"),
    includeClosed: v.optional(v.boolean()),
    createFallbackBayIfMissing: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: args.organizationId,
      operation: "legacy schedule backfill",
    });

    return runLegacyScheduleBackfill(ctx, {
      organizationId: args.organizationId,
      includeClosed: args.includeClosed ?? false,
      createFallbackBayIfMissing: args.createFallbackBayIfMissing ?? true,
      dryRun: args.dryRun ?? false,
      actorUserId: userId,
    });
  },
});

export const backfillLegacyScheduleAssignmentsSystem = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    clerkUserId: v.optional(v.string()),
    includeClosed: v.optional(v.boolean()),
    createFallbackBayIfMissing: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let organizationId = args.organizationId;
    if (!organizationId) {
      if (!args.clerkUserId) {
        throw new Error("organizationId or clerkUserId is required");
      }

      const tech = await ctx.db
        .query("technicians")
        .withIndex("by_user", (q) => q.eq("userId", args.clerkUserId!))
        .first();

      if (!tech) {
        throw new Error("No technician found for provided clerkUserId");
      }
      organizationId = tech.organizationId;
    }

    return runLegacyScheduleBackfill(ctx, {
      organizationId,
      includeClosed: args.includeClosed ?? false,
      createFallbackBayIfMissing: args.createFallbackBayIfMissing ?? true,
      dryRun: args.dryRun ?? false,
      actorUserId: args.clerkUserId ?? "system:backfill",
    });
  },
});
