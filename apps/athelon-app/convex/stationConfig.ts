import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { ensureShopLocationBelongsToOrg } from "./lib/rosterHelpers";

const aircraftCategoryValidator = v.union(
  v.literal("single-engine"),
  v.literal("multi-engine"),
  v.literal("turboprop"),
  v.literal("light-jet"),
  v.literal("midsize-jet"),
  v.literal("large-jet"),
  v.literal("helicopter"),
);

type WorkOrderStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "on_hold"
  | "pending_inspection"
  | "pending_signoff"
  | "open_discrepancies"
  | "closed"
  | "cancelled"
  | "voided";

const workOrderStatusValidator = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("on_hold"),
  v.literal("pending_inspection"),
  v.literal("pending_signoff"),
  v.literal("open_discrepancies"),
  v.literal("closed"),
  v.literal("cancelled"),
  v.literal("voided"),
);

const operatingHourValidator = v.object({
  dayOfWeek: v.number(), // 0=Mon..6=Sun
  isOpen: v.boolean(),
  openTime: v.string(),
  closeTime: v.string(),
});

const timelineCursorValidator = v.object({
  id: v.string(),
  label: v.string(),
  dayOffset: v.number(),
  colorClass: v.string(),
  enabled: v.boolean(),
});

const workOrderStageValidator = v.object({
  id: v.string(),
  label: v.string(),
  description: v.optional(v.string()),
  color: v.string(),
  sortOrder: v.number(),
  statusMappings: v.array(workOrderStatusValidator),
});

const supportedAircraftImportValidator = v.array(
  v.object({
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    category: aircraftCategoryValidator,
  }),
);

const holidayInputValidator = v.array(
  v.object({
    id: v.optional(v.id("schedulingHolidays")),
    shopLocationId: v.optional(v.id("shopLocations")),
    dateKey: v.string(),
    name: v.string(),
    isObserved: v.boolean(),
    notes: v.optional(v.string()),
  }),
);

const DEFAULT_SETTINGS = {
  capacityBufferPercent: 15,
  defaultShiftDays: [1, 2, 3, 4, 5],
  defaultStartHour: 7,
  defaultEndHour: 17,
  defaultEfficiencyMultiplier: 1,
  timezone: "America/Denver",
} as const;

const DEFAULT_OPERATING_HOURS = [
  { dayOfWeek: 0, isOpen: true, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 1, isOpen: true, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 2, isOpen: true, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 3, isOpen: true, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 4, isOpen: true, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 5, isOpen: false, openTime: "07:00", closeTime: "17:00" },
  { dayOfWeek: 6, isOpen: false, openTime: "07:00", closeTime: "17:00" },
] as const;

const DEFAULT_STAGE_CONFIG = [
  {
    id: "stage-quoting",
    label: "Quoting",
    description: "Customer quote preparation and approval",
    color: "bg-slate-500",
    sortOrder: 0,
    statusMappings: ["draft"],
  },
  {
    id: "stage-indock",
    label: "In-dock",
    description: "Aircraft received and inducted into shop",
    color: "bg-sky-500",
    sortOrder: 1,
    statusMappings: ["open"],
  },
  {
    id: "stage-inspection",
    label: "Inspection",
    description: "Initial and progressive inspections",
    color: "bg-amber-500",
    sortOrder: 2,
    statusMappings: ["pending_inspection"],
  },
  {
    id: "stage-repair",
    label: "Repair",
    description: "Active maintenance and repair work",
    color: "bg-blue-500",
    sortOrder: 3,
    statusMappings: ["in_progress", "on_hold", "open_discrepancies"],
  },
  {
    id: "stage-rts",
    label: "Return to Service",
    description: "Final inspection, paperwork, and RTS sign-off",
    color: "bg-emerald-500",
    sortOrder: 4,
    statusMappings: ["pending_signoff"],
  },
  {
    id: "stage-review",
    label: "Review & Improvement",
    description: "Post-completion review and process improvement",
    color: "bg-violet-500",
    sortOrder: 5,
    statusMappings: ["closed", "cancelled", "voided"],
  },
] as const;

const DEFAULT_TIMELINE_CURSORS = [
  {
    id: "cursor-week",
    label: "This Week",
    dayOffset: 0,
    colorClass: "bg-emerald-500",
    enabled: true,
  },
  {
    id: "cursor-2week",
    label: "2-Week Out",
    dayOffset: 14,
    colorClass: "bg-amber-500",
    enabled: true,
  },
  {
    id: "cursor-30",
    label: "30-Day Horizon",
    dayOffset: 30,
    colorClass: "bg-sky-500",
    enabled: true,
  },
  {
    id: "cursor-90",
    label: "90-Day Planning",
    dayOffset: 90,
    colorClass: "bg-violet-500",
    enabled: false,
  },
] as const;

function requireAuth(identity: { subject: string } | null): string {
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

function normalizeText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStatusMappings(statusMappings: readonly WorkOrderStatus[]): WorkOrderStatus[] {
  return Array.from(new Set(statusMappings));
}

function normalizeOperatingHours(
  hours?: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }>,
) {
  if (!hours || hours.length === 0) {
    return DEFAULT_OPERATING_HOURS.map((entry) => ({ ...entry }));
  }
  const byDay = new Map<number, (typeof hours)[number]>();
  for (const hour of hours) {
    const day = Math.max(0, Math.min(6, Math.floor(hour.dayOfWeek)));
    byDay.set(day, {
      dayOfWeek: day,
      isOpen: Boolean(hour.isOpen),
      openTime: hour.openTime,
      closeTime: hour.closeTime,
    });
  }
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const value = byDay.get(dayOfWeek);
    return (
      value ?? {
        dayOfWeek,
        isOpen: false,
        openTime: "07:00",
        closeTime: "17:00",
      }
    );
  });
}

function stageSnapshotFromDefaults() {
  return DEFAULT_STAGE_CONFIG.map((stage) => ({
    ...stage,
    description: normalizeText(stage.description),
    statusMappings: normalizeStatusMappings(stage.statusMappings),
  }));
}

function cursorSnapshotFromDefaults() {
  return DEFAULT_TIMELINE_CURSORS.map((cursor) => ({ ...cursor }));
}

function resolveAircraftCategory(aircraft: {
  make?: string;
  model?: string;
  engineCount?: number;
}): "single-engine" | "multi-engine" | "turboprop" | "light-jet" | "midsize-jet" | "large-jet" | "helicopter" {
  const makeModel = `${aircraft.make ?? ""} ${aircraft.model ?? ""}`.toLowerCase();
  if (makeModel.includes("helicopter") || makeModel.includes("bell ") || makeModel.includes("as350")) {
    return "helicopter";
  }
  if (makeModel.includes("caravan") || makeModel.includes("king air") || makeModel.includes("pc-12")) {
    return "turboprop";
  }
  if (makeModel.includes("global") || makeModel.includes("challenger")) {
    return "large-jet";
  }
  if (makeModel.includes("legacy") || makeModel.includes("praetor") || makeModel.includes("lear")) {
    return "midsize-jet";
  }
  if (makeModel.includes("jet") || makeModel.includes("phenom") || makeModel.includes("citation")) {
    return "light-jet";
  }
  return (aircraft.engineCount ?? 1) > 1 ? "multi-engine" : "single-engine";
}

function normalizeAircraftKey(make: string, model: string, series?: string) {
  return `${make.trim().toLowerCase()}::${model.trim().toLowerCase()}::${normalizeText(series)?.toLowerCase() ?? ""}`;
}

function buildStableStageId(label: string, sortOrder: number) {
  return `stage-${sortOrder}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

async function upsertPlanningScenarioMirror(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    userId: string;
    cursors: Array<{ label: string; dayOffset: number; colorClass: string; enabled: boolean }>;
    rangeStartDay?: number;
    rangeEndDay?: number;
  },
) {
  const existingDefaults = await ctx.db
    .query("planningScenarios")
    .withIndex("by_org_default", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("isDefault", true),
    )
    .collect();

  const now = Date.now();
  const normalizedCursors = args.cursors.map((cursor) => ({
    label: cursor.label,
    dayOffset: cursor.dayOffset,
    color: cursor.colorClass,
    enabled: cursor.enabled,
  }));

  if (existingDefaults.length === 0) {
    await ctx.db.insert("planningScenarios", {
      organizationId: args.organizationId,
      name: "Station Timeline Default",
      isDefault: true,
      rangeStartDay: args.rangeStartDay,
      rangeEndDay: args.rangeEndDay,
      cursors: normalizedCursors,
      notes: "Auto-synced from station configuration",
      createdAt: now,
      updatedAt: now,
      createdByUserId: args.userId,
      updatedByUserId: args.userId,
    });
    return;
  }

  const [primaryDefault, ...duplicates] = existingDefaults;
  await ctx.db.patch(primaryDefault._id, {
    name: "Station Timeline Default",
    isDefault: true,
    rangeStartDay: args.rangeStartDay,
    rangeEndDay: args.rangeEndDay,
    cursors: normalizedCursors,
    notes: "Auto-synced from station configuration",
    updatedAt: now,
    updatedByUserId: args.userId,
  });
  for (const duplicate of duplicates) {
    await ctx.db.patch(duplicate._id, {
      isDefault: false,
      updatedAt: now,
      updatedByUserId: args.userId,
    });
  }
}

async function ensureStationConfigSeed(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: string,
) {
  const now = Date.now();

  const locations = await ctx.db
    .query("shopLocations")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  const activeLocations = locations
    .filter((location: any) => location.isActive !== false)
    .sort((a: any, b: any) => a.createdAt - b.createdAt);

  if (activeLocations.length > 0) {
    const preferredPrimary =
      activeLocations.find((location: any) => location.isPrimary) ?? activeLocations[0];
    for (const location of activeLocations) {
      const shouldBePrimary = location._id === preferredPrimary._id;
      if ((location.isPrimary ?? false) === shouldBePrimary) continue;
      await ctx.db.patch(location._id, { isPrimary: shouldBePrimary, updatedAt: now });
    }
  }

  const settings = await ctx.db
    .query("schedulingSettings")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .unique();
  if (!settings) {
    await ctx.db.insert("schedulingSettings", {
      organizationId,
      capacityBufferPercent: DEFAULT_SETTINGS.capacityBufferPercent,
      defaultShiftDays: [...DEFAULT_SETTINGS.defaultShiftDays],
      defaultStartHour: DEFAULT_SETTINGS.defaultStartHour,
      defaultEndHour: DEFAULT_SETTINGS.defaultEndHour,
      defaultEfficiencyMultiplier: DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
      timezone:
        activeLocations.find((location: any) => location.isPrimary)?.timezone ??
        activeLocations[0]?.timezone ??
        DEFAULT_SETTINGS.timezone,
      operatingHours: normalizeOperatingHours(),
      rosterWorkspaceEnabled: false,
      rosterWorkspaceBootstrappedAt: undefined,
      updatedAt: now,
      updatedByUserId: userId,
    });
  } else {
    const patch: Record<string, unknown> = {};
    if (!settings.timezone) {
      patch.timezone =
        activeLocations.find((location: any) => location.isPrimary)?.timezone ??
        activeLocations[0]?.timezone ??
        DEFAULT_SETTINGS.timezone;
    }
    if (!settings.operatingHours || settings.operatingHours.length === 0) {
      patch.operatingHours = normalizeOperatingHours();
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(settings._id, {
        ...patch,
        updatedAt: now,
        updatedByUserId: userId,
      });
    }
  }

  const stageConfig = await ctx.db
    .query("workOrderStageConfigs")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .unique();
  if (!stageConfig) {
    await ctx.db.insert("workOrderStageConfigs", {
      organizationId,
      stages: stageSnapshotFromDefaults(),
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
  }

  const cursorConfig = await ctx.db
    .query("stationTimelineCursorConfig")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .unique();
  if (!cursorConfig) {
    const defaultPlanningScenario = await ctx.db
      .query("planningScenarios")
      .withIndex("by_org_default", (q: any) =>
        q.eq("organizationId", organizationId).eq("isDefault", true),
      )
      .first();

    const cursors = defaultPlanningScenario
      ? defaultPlanningScenario.cursors.map((cursor: any, idx: number) => ({
          id: `cursor-${idx + 1}`,
          label: cursor.label,
          dayOffset: cursor.dayOffset,
          colorClass: cursor.color,
          enabled: cursor.enabled,
        }))
      : cursorSnapshotFromDefaults();

    await ctx.db.insert("stationTimelineCursorConfig", {
      organizationId,
      cursors,
      rangeStartDay: defaultPlanningScenario?.rangeStartDay,
      rangeEndDay: defaultPlanningScenario?.rangeEndDay,
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    await upsertPlanningScenarioMirror(ctx, {
      organizationId,
      userId,
      cursors,
      rangeStartDay: defaultPlanningScenario?.rangeStartDay,
      rangeEndDay: defaultPlanningScenario?.rangeEndDay,
    });
  } else {
    await upsertPlanningScenarioMirror(ctx, {
      organizationId,
      userId,
      cursors: cursorConfig.cursors,
      rangeStartDay: cursorConfig.rangeStartDay,
      rangeEndDay: cursorConfig.rangeEndDay,
    });
  }

  const existingSupported = await ctx.db
    .query("stationSupportedAircraft")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .take(1);

  if (existingSupported.length === 0) {
    const [workOrders, bays] = await Promise.all([
      ctx.db
        .query("workOrders")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
        .collect(),
      ctx.db
        .query("hangarBays")
        .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
        .collect(),
    ]);

    const baysByLocation = new Map<string, Id<"hangarBays">[]>();
    for (const bay of bays) {
      const key = bay.shopLocationId ? String(bay.shopLocationId) : "__org__";
      const rows = baysByLocation.get(key) ?? [];
      rows.push(bay._id);
      baysByLocation.set(key, rows);
    }

    const seen = new Set<string>();
    for (const workOrder of workOrders) {
      const aircraft = await ctx.db.get(workOrder.aircraftId);
      if (!aircraft) continue;

      const locationKey = workOrder.shopLocationId ? String(workOrder.shopLocationId) : "__org__";
      const key = `${locationKey}::${normalizeAircraftKey(
        aircraft.make,
        aircraft.model,
        aircraft.series,
      )}`;
      if (seen.has(key)) continue;
      seen.add(key);

      await ctx.db.insert("stationSupportedAircraft", {
        organizationId,
        shopLocationId: workOrder.shopLocationId,
        make: aircraft.make,
        model: aircraft.model,
        series: normalizeText(aircraft.series),
        category: resolveAircraftCategory(aircraft),
        compatibleBayIds: [...(baysByLocation.get(locationKey) ?? [])],
        createdAt: now,
        updatedAt: now,
        createdByUserId: userId,
        updatedByUserId: userId,
      });
    }
  }
}

export const bootstrapStationConfig = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    await ensureStationConfigSeed(ctx, args.organizationId, userId);
    return { ok: true };
  },
});

export const getStationConfigWorkspace = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const [
      locations,
      bays,
      supportedAircraft,
      stageConfig,
      cursorConfig,
      settings,
      holidays,
    ] = await Promise.all([
      ctx.db
        .query("shopLocations")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
        .collect(),
      ctx.db
        .query("hangarBays")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .collect(),
      ctx.db
        .query("stationSupportedAircraft")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .collect(),
      ctx.db
        .query("workOrderStageConfigs")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .unique(),
      ctx.db
        .query("stationTimelineCursorConfig")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .unique(),
      ctx.db
        .query("schedulingSettings")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .unique(),
      ctx.db
        .query("schedulingHolidays")
        .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
        .collect(),
    ]);

    const sortedLocations = [...locations].sort((a: any, b: any) => {
      if ((a.isActive ?? true) !== (b.isActive ?? true)) {
        return (b.isActive ?? true ? 1 : 0) - (a.isActive ?? true ? 1 : 0);
      }
      if ((a.isPrimary ?? false) !== (b.isPrimary ?? false)) {
        return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });

    const sortedBays = [...bays].sort((a: any, b: any) => {
      const aOrder = typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      if (a.shopLocationId !== b.shopLocationId) {
        return String(a.shopLocationId ?? "").localeCompare(String(b.shopLocationId ?? ""));
      }
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    const warnings: string[] = [];
    const locationIds = sortedLocations
      .filter((location: any) => location.isActive !== false)
      .map((location: any) => String(location._id));
    for (const locationId of locationIds) {
      const hasSupported = supportedAircraft.some(
        (entry: any) => String(entry.shopLocationId ?? "") === locationId,
      );
      if (!hasSupported) {
        warnings.push(
          `No supported-aircraft entries found for location ${locationId}; allow-all fallback is active.`,
        );
      }
    }

    return {
      locations: sortedLocations,
      bays: sortedBays,
      supportedAircraft: supportedAircraft.sort((a: any, b: any) => {
        const locationCmp = String(a.shopLocationId ?? "").localeCompare(String(b.shopLocationId ?? ""));
        if (locationCmp !== 0) return locationCmp;
        const makeCmp = a.make.localeCompare(b.make);
        if (makeCmp !== 0) return makeCmp;
        return a.model.localeCompare(b.model);
      }),
      workOrderStageConfig: stageConfig?.stages ?? stageSnapshotFromDefaults(),
      timelineCursorConfig: cursorConfig?.cursors ?? cursorSnapshotFromDefaults(),
      timelineCursorRange: {
        rangeStartDay: cursorConfig?.rangeStartDay,
        rangeEndDay: cursorConfig?.rangeEndDay,
      },
      schedulingPreferences: {
        timezone: settings?.timezone ?? DEFAULT_SETTINGS.timezone,
        operatingHours: normalizeOperatingHours(settings?.operatingHours),
        capacityBufferPercent:
          settings?.capacityBufferPercent ?? DEFAULT_SETTINGS.capacityBufferPercent,
        defaultShiftDays: settings?.defaultShiftDays ?? [...DEFAULT_SETTINGS.defaultShiftDays],
        defaultStartHour: settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
        defaultEndHour: settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
        defaultEfficiencyMultiplier:
          settings?.defaultEfficiencyMultiplier ??
          DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
      },
      holidays: holidays.sort((a: any, b: any) => a.dateKey.localeCompare(b.dateKey)),
      warnings,
    };
  },
});

export const listSupportedAircraft = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.union(v.id("shopLocations"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    if (args.shopLocationId && args.shopLocationId !== "all") {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const rows = await ctx.db
      .query("stationSupportedAircraft")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const filtered =
      args.shopLocationId && args.shopLocationId !== "all"
        ? rows.filter((row: any) => row.shopLocationId === args.shopLocationId)
        : rows;

    return filtered.sort((a: any, b: any) => {
      const makeCmp = a.make.localeCompare(b.make);
      if (makeCmp !== 0) return makeCmp;
      return a.model.localeCompare(b.model);
    });
  },
});

export const getWorkOrderStageConfig = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("workOrderStageConfigs")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();
    return row?.stages ?? stageSnapshotFromDefaults();
  },
});

export const getTimelineCursorConfig = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("stationTimelineCursorConfig")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();
    return {
      cursors: row?.cursors ?? cursorSnapshotFromDefaults(),
      rangeStartDay: row?.rangeStartDay,
      rangeEndDay: row?.rangeEndDay,
    };
  },
});

export const upsertSupportedAircraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftConfigId: v.optional(v.id("stationSupportedAircraft")),
    shopLocationId: v.optional(v.id("shopLocations")),
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    category: aircraftCategoryValidator,
    compatibleBayIds: v.array(v.id("hangarBays")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const now = Date.now();

    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    for (const bayId of args.compatibleBayIds) {
      const bay = await ctx.db.get(bayId);
      if (!bay || bay.organizationId !== args.organizationId) {
        throw new Error("Compatible bay must belong to the selected organization");
      }
      if (args.shopLocationId && bay.shopLocationId && bay.shopLocationId !== args.shopLocationId) {
        throw new Error("Compatible bay must match the selected location");
      }
    }

    const make = args.make.trim();
    const model = args.model.trim();
    if (!make || !model) {
      throw new Error("Aircraft make and model are required");
    }

    const existingRows = await ctx.db
      .query("stationSupportedAircraft")
      .withIndex("by_org_location", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
      )
      .collect();

    const targetKey = normalizeAircraftKey(make, model, args.series);
    const duplicate = existingRows.find(
      (row: any) =>
        normalizeAircraftKey(row.make, row.model, row.series) === targetKey &&
        row._id !== args.aircraftConfigId,
    );
    if (duplicate) {
      throw new Error("Supported aircraft entry already exists for this location");
    }

    const payload = {
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      make,
      model,
      series: normalizeText(args.series),
      category: args.category,
      compatibleBayIds: Array.from(new Set(args.compatibleBayIds)),
      updatedAt: now,
      updatedByUserId: userId,
    };

    if (args.aircraftConfigId) {
      const existing = await ctx.db.get(args.aircraftConfigId);
      if (!existing || existing.organizationId !== args.organizationId) {
        throw new Error("Supported aircraft entry not found");
      }
      await ctx.db.patch(args.aircraftConfigId, payload);
      return args.aircraftConfigId;
    }

    return await ctx.db.insert("stationSupportedAircraft", {
      ...payload,
      createdAt: now,
      createdByUserId: userId,
    });
  },
});

export const deleteSupportedAircraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftConfigId: v.id("stationSupportedAircraft"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAuth(identity);

    const row = await ctx.db.get(args.aircraftConfigId);
    if (!row || row.organizationId !== args.organizationId) {
      throw new Error("Supported aircraft entry not found");
    }
    await ctx.db.delete(args.aircraftConfigId);
    return { ok: true };
  },
});

export const bulkImportSupportedAircraftPackage = mutation({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    entries: supportedAircraftImportValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const now = Date.now();

    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const locationBays = await ctx.db
      .query("hangarBays")
      .withIndex("by_org_location", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
      )
      .collect();
    const compatibleBayIds = locationBays.map((bay: any) => bay._id);

    const existingRows = await ctx.db
      .query("stationSupportedAircraft")
      .withIndex("by_org_location", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
      )
      .collect();
    const existingKeys = new Set(
      existingRows.map((row: any) => normalizeAircraftKey(row.make, row.model, row.series)),
    );

    let imported = 0;
    let skipped = 0;
    for (const entry of args.entries) {
      const key = normalizeAircraftKey(entry.make, entry.model, entry.series);
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      existingKeys.add(key);
      await ctx.db.insert("stationSupportedAircraft", {
        organizationId: args.organizationId,
        shopLocationId: args.shopLocationId,
        make: entry.make.trim(),
        model: entry.model.trim(),
        series: normalizeText(entry.series),
        category: entry.category,
        compatibleBayIds,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userId,
        updatedByUserId: userId,
      });
      imported += 1;
    }

    return { imported, skipped };
  },
});

export const saveWorkOrderStageConfig = mutation({
  args: {
    organizationId: v.id("organizations"),
    stages: v.array(workOrderStageValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const now = Date.now();

    if (args.stages.length === 0) {
      throw new Error("At least one work order stage is required");
    }

    const normalizedStages = args.stages
      .map((stage, idx) => {
        const label = stage.label.trim();
        if (!label) throw new Error("Stage label cannot be empty");
        return {
          id: normalizeText(stage.id) ?? buildStableStageId(label, idx),
          label,
          description: normalizeText(stage.description),
          color: stage.color,
          sortOrder: idx,
          statusMappings: normalizeStatusMappings(stage.statusMappings),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const existing = await ctx.db
      .query("workOrderStageConfigs")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stages: normalizedStages,
        updatedAt: now,
        updatedByUserId: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("workOrderStageConfigs", {
      organizationId: args.organizationId,
      stages: normalizedStages,
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
  },
});

export const saveSchedulingPreferences = mutation({
  args: {
    organizationId: v.id("organizations"),
    timezone: v.string(),
    operatingHours: v.array(operatingHourValidator),
    capacityBufferPercent: v.number(),
    defaultShiftDays: v.array(v.number()),
    defaultStartHour: v.number(),
    defaultEndHour: v.number(),
    defaultEfficiencyMultiplier: v.number(),
    holidays: holidayInputValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const now = Date.now();

    const existingSettings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    const settingsPayload = {
      capacityBufferPercent: args.capacityBufferPercent,
      defaultShiftDays: args.defaultShiftDays,
      defaultStartHour: args.defaultStartHour,
      defaultEndHour: args.defaultEndHour,
      defaultEfficiencyMultiplier: args.defaultEfficiencyMultiplier,
      timezone: args.timezone,
      operatingHours: normalizeOperatingHours(args.operatingHours),
      updatedAt: now,
      updatedByUserId: userId,
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, settingsPayload);
    } else {
      await ctx.db.insert("schedulingSettings", {
        organizationId: args.organizationId,
        ...settingsPayload,
        rosterWorkspaceEnabled: false,
        rosterWorkspaceBootstrappedAt: undefined,
      });
    }

    const existingHolidays = await ctx.db
      .query("schedulingHolidays")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const existingById = new Map(existingHolidays.map((holiday: any) => [String(holiday._id), holiday]));
    const incomingIds = new Set<string>();

    for (const holiday of args.holidays) {
      if (holiday.shopLocationId) {
        await ensureShopLocationBelongsToOrg(ctx, args.organizationId, holiday.shopLocationId);
      }
      if (holiday.id) {
        const row = await ctx.db.get(holiday.id);
        if (!row || row.organizationId !== args.organizationId) {
          throw new Error("Scheduling holiday not found");
        }
        incomingIds.add(String(holiday.id));
        await ctx.db.patch(holiday.id, {
          shopLocationId: holiday.shopLocationId,
          dateKey: holiday.dateKey,
          name: holiday.name.trim(),
          isObserved: holiday.isObserved,
          notes: normalizeText(holiday.notes),
          updatedAt: now,
        });
        continue;
      }

      const duplicate = existingHolidays.find(
        (row: any) =>
          row.shopLocationId === holiday.shopLocationId &&
          row.dateKey === holiday.dateKey,
      );
      if (duplicate) {
        incomingIds.add(String(duplicate._id));
        await ctx.db.patch(duplicate._id, {
          name: holiday.name.trim(),
          isObserved: holiday.isObserved,
          notes: normalizeText(holiday.notes),
          updatedAt: now,
        });
        continue;
      }

      const newHolidayId = await ctx.db.insert("schedulingHolidays", {
        organizationId: args.organizationId,
        shopLocationId: holiday.shopLocationId,
        dateKey: holiday.dateKey,
        name: holiday.name.trim(),
        isObserved: holiday.isObserved,
        notes: normalizeText(holiday.notes),
        createdAt: now,
        updatedAt: now,
      });
      incomingIds.add(String(newHolidayId));
    }

    for (const existing of existingById.values()) {
      if (incomingIds.has(String(existing._id))) continue;
      await ctx.db.delete(existing._id);
    }

    return { ok: true };
  },
});

export const saveTimelineCursorConfig = mutation({
  args: {
    organizationId: v.id("organizations"),
    cursors: v.array(timelineCursorValidator),
    rangeStartDay: v.optional(v.number()),
    rangeEndDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const now = Date.now();

    const normalizedCursors = args.cursors.map((cursor) => ({
      id: cursor.id,
      label: cursor.label.trim(),
      dayOffset: cursor.dayOffset,
      colorClass: cursor.colorClass,
      enabled: cursor.enabled,
    }));

    const existing = await ctx.db
      .query("stationTimelineCursorConfig")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursors: normalizedCursors,
        rangeStartDay: args.rangeStartDay,
        rangeEndDay: args.rangeEndDay,
        updatedAt: now,
        updatedByUserId: userId,
      });
    } else {
      await ctx.db.insert("stationTimelineCursorConfig", {
        organizationId: args.organizationId,
        cursors: normalizedCursors,
        rangeStartDay: args.rangeStartDay,
        rangeEndDay: args.rangeEndDay,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userId,
        updatedByUserId: userId,
      });
    }

    await upsertPlanningScenarioMirror(ctx, {
      organizationId: args.organizationId,
      userId,
      cursors: normalizedCursors,
      rangeStartDay: args.rangeStartDay,
      rangeEndDay: args.rangeEndDay,
    });

    return { ok: true };
  },
});
