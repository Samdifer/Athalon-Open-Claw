// convex/capacity.ts
// Athelon — Scheduling Phase 2: Technician Shift Model + Capacity Calculation
//
// Queries and mutations for:
//   - Per-technician shift patterns (daysOfWeek, hours, efficiency multiplier)
//   - Team-owned shift defaults + holiday exclusions for roster parity
//   - Shop-wide scheduling settings (capacity buffer, defaults)
//   - Available-hours calculation over a date range
//   - Capacity utilization vs. committed hours

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  dateKeyFromMs,
  ensureShopLocationBelongsToOrg,
  isDateKeyWithinRange,
  isShiftActive,
  resolveEffectiveShift,
  type ShiftLike,
} from "./lib/rosterHelpers";

const DEFAULT_SETTINGS = {
  capacityBufferPercent: 15,
  defaultShiftDays: [1, 2, 3, 4, 5], // Mon–Fri
  defaultStartHour: 7,
  defaultEndHour: 17,
  defaultEfficiencyMultiplier: 1.0,
};

const shopLocationFilterValidator = v.optional(
  v.union(v.id("shopLocations"), v.literal("all")),
);

function requireAuth(identity: { subject: string } | null): string {
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

function resolveScopedLocationId(
  shopLocationId?: Id<"shopLocations"> | "all",
): Id<"shopLocations"> | undefined {
  if (!shopLocationId || shopLocationId === "all") return undefined;
  return shopLocationId;
}

function hoursPerShiftDay(
  startHour: number,
  endHour: number,
  efficiencyMultiplier: number,
): number {
  return Math.max(0, endHour - startHour) * efficiencyMultiplier;
}

async function loadBaseSchedulingContext(
  ctx: any,
  organizationId: Id<"organizations">,
  scopedLocationId?: Id<"shopLocations">,
) {
  if (scopedLocationId) {
    await ensureShopLocationBelongsToOrg(ctx, organizationId, scopedLocationId);
  }

  const [settings, allTechs, allRosterTeams, allRosterShifts, allTechShifts] = await Promise.all([
    ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .unique(),
    ctx.db
      .query("technicians")
      .withIndex("by_status", (q: any) =>
        q.eq("organizationId", organizationId).eq("status", "active"),
      )
      .collect(),
    ctx.db
      .query("rosterTeams")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect(),
    ctx.db
      .query("rosterShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect(),
    ctx.db
      .query("technicianShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
      .collect(),
  ]);

  const defaultShift: ShiftLike = {
    daysOfWeek: settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays,
    startHour: settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
    endHour: settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
    efficiencyMultiplier:
      settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
  };

  const techs = scopedLocationId
    ? allTechs.filter((tech: any) => tech.primaryShopLocationId === scopedLocationId)
    : allTechs;

  const rosterTeams = allRosterTeams.filter(
    (team: any) =>
      team.isActive !== false &&
      (scopedLocationId ? team.shopLocationId === scopedLocationId : true),
  );
  const rosterShifts = allRosterShifts.filter(
    (shift: any) =>
      shift.isActive !== false &&
      (scopedLocationId ? shift.shopLocationId === scopedLocationId : true),
  );

  const nowMs = Date.now();
  const activeTechShiftByTechId = new Map<string, any>();
  for (const shift of allTechShifts) {
    if (!isShiftActive(shift, nowMs)) continue;
    activeTechShiftByTechId.set(String(shift.technicianId), shift);
  }

  return {
    settings,
    defaultShift,
    techs,
    rosterTeams,
    rosterShifts,
    activeTechShiftByTechId,
  };
}

function resolveEffectiveShiftForTech(args: {
  tech: any;
  defaultShift: ShiftLike;
  rosterTeams: any[];
  rosterShifts: any[];
  activeTechShiftByTechId: Map<string, any>;
}) {
  const team = args.tech.rosterTeamId
    ? args.rosterTeams.find((row: any) => row._id === args.tech.rosterTeamId)
    : undefined;

  const teamShift = team
    ? args.rosterShifts.find((row: any) => row._id === team.shiftId)
    : undefined;

  const override = args.activeTechShiftByTechId.get(String(args.tech._id));

  const resolved = resolveEffectiveShift({
    technicianShift: override
      ? {
          daysOfWeek: override.daysOfWeek,
          startHour: override.startHour,
          endHour: override.endHour,
          efficiencyMultiplier: override.efficiencyMultiplier,
        }
      : undefined,
    teamShift: teamShift
      ? {
          daysOfWeek: teamShift.daysOfWeek,
          startHour: teamShift.startHour,
          endHour: teamShift.endHour,
          efficiencyMultiplier: teamShift.efficiencyMultiplier,
        }
      : undefined,
    defaultShift: args.defaultShift,
  });

  return {
    team,
    teamShift,
    resolved,
  };
}

async function fetchObservedHolidayDateKeys(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    scopedLocationId?: Id<"shopLocations">;
    startDateMs: number;
    endDateMs: number;
  },
): Promise<Set<string>> {
  const holidays = await ctx.db
    .query("schedulingHolidays")
    .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
    .collect();

  const dateKeys = new Set<string>();
  for (const holiday of holidays) {
    if (!holiday.isObserved) continue;
    if (args.scopedLocationId && holiday.shopLocationId !== args.scopedLocationId) continue;
    if (!isDateKeyWithinRange(holiday.dateKey, args.startDateMs, args.endDateMs)) continue;
    dateKeys.add(holiday.dateKey);
  }

  return dateKeys;
}

export const getSchedulingSettings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    if (!row) {
      return {
        ...DEFAULT_SETTINGS,
        rosterWorkspaceEnabled: false,
        rosterWorkspaceBootstrappedAt: undefined,
        organizationId: args.organizationId,
        updatedAt: null,
        updatedByUserId: null,
      };
    }
    return row;
  },
});

export const upsertSchedulingSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    capacityBufferPercent: v.optional(v.number()),
    defaultShiftDays: v.optional(v.array(v.number())),
    defaultStartHour: v.optional(v.number()),
    defaultEndHour: v.optional(v.number()),
    defaultEfficiencyMultiplier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const nowMs = Date.now();

    const existing = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    const patch = {
      capacityBufferPercent:
        args.capacityBufferPercent ??
        existing?.capacityBufferPercent ??
        DEFAULT_SETTINGS.capacityBufferPercent,
      defaultShiftDays:
        args.defaultShiftDays ?? existing?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays,
      defaultStartHour:
        args.defaultStartHour ?? existing?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
      defaultEndHour:
        args.defaultEndHour ?? existing?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
      defaultEfficiencyMultiplier:
        args.defaultEfficiencyMultiplier ??
        existing?.defaultEfficiencyMultiplier ??
        DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
      updatedAt: nowMs,
      updatedByUserId: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("schedulingSettings", {
        organizationId: args.organizationId,
        rosterWorkspaceEnabled: false,
        rosterWorkspaceBootstrappedAt: undefined,
        ...patch,
      });
    }
  },
});

export const getTechnicianShift = query({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const context = await loadBaseSchedulingContext(ctx, args.organizationId);
    const tech = context.techs.find((row: any) => row._id === args.technicianId);

    if (!tech) {
      throw new Error("Technician not found or inactive");
    }

    const resolved = resolveEffectiveShiftForTech({
      tech,
      defaultShift: context.defaultShift,
      rosterTeams: context.rosterTeams,
      rosterShifts: context.rosterShifts,
      activeTechShiftByTechId: context.activeTechShiftByTechId,
    });

    return {
      technicianId: tech._id,
      organizationId: args.organizationId,
      daysOfWeek: resolved.resolved.daysOfWeek,
      startHour: resolved.resolved.startHour,
      endHour: resolved.resolved.endHour,
      efficiencyMultiplier: resolved.resolved.efficiencyMultiplier,
      source: resolved.resolved.source,
      usingDefaultShift: resolved.resolved.usingDefaultShift,
      teamId: resolved.team?._id,
      teamName: resolved.team?.name,
      teamShiftId: resolved.teamShift?._id,
      teamShiftName: resolved.teamShift?.name,
      isDefault: resolved.resolved.usingDefaultShift,
    };
  },
});

export const upsertTechnicianShift = mutation({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
    daysOfWeek: v.array(v.number()),
    startHour: v.number(),
    endHour: v.number(),
    efficiencyMultiplier: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = requireAuth(identity);
    const nowMs = Date.now();

    const existing = await ctx.db
      .query("technicianShifts")
      .withIndex("by_technician", (q: any) => q.eq("technicianId", args.technicianId))
      .collect();

    for (const shift of existing) {
      if (isShiftActive(shift, nowMs)) {
        await ctx.db.patch(shift._id, { effectiveTo: nowMs });
      }
    }

    const newShiftId = await ctx.db.insert("technicianShifts", {
      technicianId: args.technicianId,
      organizationId: args.organizationId,
      effectiveFrom: nowMs,
      effectiveTo: undefined,
      daysOfWeek: args.daysOfWeek,
      startHour: args.startHour,
      endHour: args.endHour,
      efficiencyMultiplier: args.efficiencyMultiplier,
      notes: args.notes,
      createdAt: nowMs,
      createdByUserId: userId,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "technicianShifts",
      recordId: newShiftId,
      userId,
      timestamp: nowMs,
      notes: `Shift updated for technician ${args.technicianId}: ${args.daysOfWeek.join(",")} days, ${args.startHour}–${args.endHour}h, ×${args.efficiencyMultiplier}`,
    });

    return newShiftId;
  },
});

export const getTechnicianWorkload = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
  },
  handler: async (ctx, args) => {
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);
    const context = await loadBaseSchedulingContext(
      ctx,
      args.organizationId,
      scopedLocationId,
    );

    const results = await Promise.all(
      context.techs.map(async (tech: any) => {
        const shiftResolution = resolveEffectiveShiftForTech({
          tech,
          defaultShift: context.defaultShift,
          rosterTeams: context.rosterTeams,
          rosterShifts: context.rosterShifts,
          activeTechShiftByTechId: context.activeTechShiftByTechId,
        });

        const assignedCards = await ctx.db
          .query("taskCards")
          .withIndex("by_assigned", (q: any) => q.eq("assignedToTechnicianId", tech._id))
          .collect();

        const activeCards = assignedCards.filter(
          (card: any) => card.status !== "complete" && card.status !== "voided",
        );

        const estimatedRemainingHours = activeCards.reduce(
          (sum: number, card: any) => sum + (card.estimatedHours ?? 0),
          0,
        );

        return {
          technicianId: tech._id,
          name: tech.legalName,
          employeeId: tech.employeeId,
          role: tech.role,
          primaryShopLocationId: tech.primaryShopLocationId,
          teamId: shiftResolution.team?._id,
          teamName: shiftResolution.team?.name,
          teamColorToken: shiftResolution.team?.colorToken,
          shiftId: shiftResolution.teamShift?._id,
          shiftName: shiftResolution.teamShift?.name,
          shiftSource: shiftResolution.resolved.source,
          daysOfWeek: shiftResolution.resolved.daysOfWeek,
          startHour: shiftResolution.resolved.startHour,
          endHour: shiftResolution.resolved.endHour,
          efficiencyMultiplier: shiftResolution.resolved.efficiencyMultiplier,
          usingDefaultShift: shiftResolution.resolved.usingDefaultShift,
          usingTeamShift: shiftResolution.resolved.usingTeamShift,
          assignedActiveCards: activeCards.length,
          estimatedRemainingHours,
        };
      }),
    );

    return results;
  },
});

export const getShopCapacity = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
    startDateMs: v.number(),
    endDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);
    const context = await loadBaseSchedulingContext(
      ctx,
      args.organizationId,
      scopedLocationId,
    );

    const observedHolidayKeys = await fetchObservedHolidayDateKeys(ctx, {
      organizationId: args.organizationId,
      scopedLocationId,
      startDateMs: args.startDateMs,
      endDateMs: args.endDateMs,
    });

    let totalAvailableHours = 0;
    const byTechnician: Array<{
      technicianId: string;
      name: string;
      primaryShopLocationId?: string;
      teamId?: string;
      teamName?: string;
      availableHours: number;
      shiftDays: number[];
      startHour: number;
      endHour: number;
      efficiencyMultiplier: number;
      shiftSource: string;
    }> = [];

    for (const tech of context.techs) {
      const shiftResolution = resolveEffectiveShiftForTech({
        tech,
        defaultShift: context.defaultShift,
        rosterTeams: context.rosterTeams,
        rosterShifts: context.rosterShifts,
        activeTechShiftByTechId: context.activeTechShiftByTechId,
      });

      let availableHours = 0;
      const current = new Date(args.startDateMs);
      const end = new Date(args.endDateMs);
      while (current <= end) {
        const dayKey = dateKeyFromMs(current.getTime());
        if (observedHolidayKeys.has(dayKey)) {
          current.setDate(current.getDate() + 1);
          continue;
        }

        const dow = current.getDay();
        if (shiftResolution.resolved.daysOfWeek.includes(dow)) {
          availableHours += hoursPerShiftDay(
            shiftResolution.resolved.startHour,
            shiftResolution.resolved.endHour,
            shiftResolution.resolved.efficiencyMultiplier,
          );
        }
        current.setDate(current.getDate() + 1);
      }

      totalAvailableHours += availableHours;
      byTechnician.push({
        technicianId: tech._id,
        name: tech.legalName,
        primaryShopLocationId: tech.primaryShopLocationId,
        teamId: shiftResolution.team?._id,
        teamName: shiftResolution.team?.name,
        availableHours,
        shiftDays: shiftResolution.resolved.daysOfWeek,
        startHour: shiftResolution.resolved.startHour,
        endHour: shiftResolution.resolved.endHour,
        efficiencyMultiplier: shiftResolution.resolved.efficiencyMultiplier,
        shiftSource: shiftResolution.resolved.source,
      });
    }

    return { totalAvailableHours, byTechnician };
  },
});

export const getCapacityUtilization = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
    periodWeeks: v.number(),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();
    const endDateMs = nowMs + args.periodWeeks * 7 * 24 * 60 * 60 * 1000;
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);

    const context = await loadBaseSchedulingContext(
      ctx,
      args.organizationId,
      scopedLocationId,
    );

    const observedHolidayKeys = await fetchObservedHolidayDateKeys(ctx, {
      organizationId: args.organizationId,
      scopedLocationId,
      startDateMs: nowMs,
      endDateMs,
    });

    const bufferPercent =
      context.settings?.capacityBufferPercent ?? DEFAULT_SETTINGS.capacityBufferPercent;

    let totalAvailableHours = 0;
    let totalCommittedHours = 0;

    const byTechnician: Array<{
      technicianId: string;
      name: string;
      primaryShopLocationId?: string;
      teamId?: string;
      teamName?: string;
      availableHours: number;
      assignedEstimatedHours: number;
      utilizationPercent: number;
      shiftSource: string;
    }> = [];

    for (const tech of context.techs) {
      const shiftResolution = resolveEffectiveShiftForTech({
        tech,
        defaultShift: context.defaultShift,
        rosterTeams: context.rosterTeams,
        rosterShifts: context.rosterShifts,
        activeTechShiftByTechId: context.activeTechShiftByTechId,
      });

      let availableHours = 0;
      const current = new Date(nowMs);
      const end = new Date(endDateMs);
      while (current <= end) {
        const dayKey = dateKeyFromMs(current.getTime());
        if (observedHolidayKeys.has(dayKey)) {
          current.setDate(current.getDate() + 1);
          continue;
        }

        const dow = current.getDay();
        if (shiftResolution.resolved.daysOfWeek.includes(dow)) {
          availableHours += hoursPerShiftDay(
            shiftResolution.resolved.startHour,
            shiftResolution.resolved.endHour,
            shiftResolution.resolved.efficiencyMultiplier,
          );
        }
        current.setDate(current.getDate() + 1);
      }

      const assignedCards = await ctx.db
        .query("taskCards")
        .withIndex("by_assigned", (q: any) => q.eq("assignedToTechnicianId", tech._id))
        .collect();

      const assignedEstimatedHours = assignedCards
        .filter((card: any) => card.status !== "complete" && card.status !== "voided")
        .reduce((sum: number, card: any) => sum + (card.estimatedHours ?? 0), 0);

      const techUtil =
        availableHours > 0 ? Math.round((assignedEstimatedHours / availableHours) * 100) : 0;

      totalAvailableHours += availableHours;
      totalCommittedHours += assignedEstimatedHours;

      byTechnician.push({
        technicianId: tech._id,
        name: tech.legalName,
        primaryShopLocationId: tech.primaryShopLocationId,
        teamId: shiftResolution.team?._id,
        teamName: shiftResolution.team?.name,
        availableHours,
        assignedEstimatedHours,
        utilizationPercent: techUtil,
        shiftSource: shiftResolution.resolved.source,
      });
    }

    const utilizationPercent =
      totalAvailableHours > 0
        ? Math.round((totalCommittedHours / totalAvailableHours) * 100)
        : 0;

    return {
      totalAvailableHours,
      committedHours: totalCommittedHours,
      utilizationPercent,
      bufferPercent,
      isOverCapacity: totalCommittedHours > totalAvailableHours,
      isNearBuffer: utilizationPercent > 100 - bufferPercent,
      periodWeeks: args.periodWeeks,
      observedHolidayCount: observedHolidayKeys.size,
      byTechnician,
    };
  },
});
