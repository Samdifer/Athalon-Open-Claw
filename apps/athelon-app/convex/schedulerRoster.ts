import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  dateKeyFromMs,
  ensureShopLocationBelongsToOrg,
  isDateKeyWithinRange,
  isShiftActive,
  isSupervisorRole,
  resolveEffectiveShift,
  type ShiftLike,
} from "./lib/rosterHelpers";
import { requireOrgScopedTechnician } from "./shared/helpers/accessControl";

const DEFAULT_SETTINGS = {
  capacityBufferPercent: 15,
  defaultShiftDays: [1, 2, 3, 4, 5],
  defaultStartHour: 7,
  defaultEndHour: 17,
  defaultEfficiencyMultiplier: 1,
};

const DEFAULT_TEAM_COLORS = [
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
];

const shopLocationFilterValidator = v.optional(
  v.union(v.id("shopLocations"), v.literal("all")),
);

const teamMutationValidator = {
  organizationId: v.id("organizations"),
  shopLocationId: v.optional(v.id("shopLocations")),
  name: v.string(),
  colorToken: v.string(),
  shiftId: v.id("rosterShifts"),
  sortOrder: v.optional(v.number()),
} as const;

const shiftMutationValidator = {
  organizationId: v.id("organizations"),
  shopLocationId: v.optional(v.id("shopLocations")),
  name: v.string(),
  daysOfWeek: v.array(v.number()),
  startHour: v.number(),
  endHour: v.number(),
  efficiencyMultiplier: v.number(),
  sortOrder: v.optional(v.number()),
} as const;

const holidayMutationValidator = {
  organizationId: v.id("organizations"),
  shopLocationId: v.optional(v.id("shopLocations")),
  dateKey: v.string(),
  name: v.string(),
  notes: v.optional(v.string()),
} as const;

async function getCallerTech(ctx: any, organizationId: Id<"organizations">) {
  const { identity, technician } = await requireOrgScopedTechnician(ctx, {
    organizationId,
    requireActive: true,
    operation: "roster workspace updates",
  });

  return { callerTech: technician, userId: identity.subject };
}

function requireRosterManager(role?: string) {
  if (!["admin", "shop_manager", "lead_technician"].includes(role ?? "")) {
    throw new Error("ACCESS_DENIED: roster workspace update requires admin/shop_manager/lead_technician");
  }
}

async function ensureSettingsRow(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: string,
) {
  const existing = await ctx.db
    .query("schedulingSettings")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .unique();

  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("schedulingSettings", {
    organizationId,
    capacityBufferPercent: DEFAULT_SETTINGS.capacityBufferPercent,
    defaultShiftDays: DEFAULT_SETTINGS.defaultShiftDays,
    defaultStartHour: DEFAULT_SETTINGS.defaultStartHour,
    defaultEndHour: DEFAULT_SETTINGS.defaultEndHour,
    defaultEfficiencyMultiplier: DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
    rosterWorkspaceEnabled: false,
    rosterWorkspaceBootstrappedAt: undefined,
    updatedAt: now,
    updatedByUserId: userId,
  });

  return await ctx.db.get(id);
}

function normalizeDays(days: number[]): number[] {
  return Array.from(
    new Set(days.filter((d) => Number.isFinite(d) && d >= 0 && d <= 6).map((d) => Math.floor(d))),
  ).sort((a, b) => a - b);
}

function shiftSignature(shift: ShiftLike): string {
  const days = normalizeDays(shift.daysOfWeek);
  return `${days.join(",")}|${shift.startHour}|${shift.endHour}|${shift.efficiencyMultiplier.toFixed(2)}`;
}

async function writeRosterAudit(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: string,
  eventType: string,
  tableName: string,
  recordId: string,
  notes: string,
) {
  await ctx.db.insert("auditLog", {
    organizationId,
    eventType,
    tableName,
    recordId,
    userId,
    timestamp: Date.now(),
    notes,
  });
}

function resolveScopedLocationId(
  shopLocationId?: Id<"shopLocations"> | "all",
): Id<"shopLocations"> | undefined {
  if (!shopLocationId || shopLocationId === "all") return undefined;
  return shopLocationId;
}

async function listScopedLocations(
  ctx: any,
  organizationId: Id<"organizations">,
  scopedLocationId?: Id<"shopLocations">,
) {
  const locations = await ctx.db
    .query("shopLocations")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  const activeLocations = locations.filter((loc: any) => loc.isActive !== false);

  if (scopedLocationId) {
    const scoped = activeLocations.find((loc: any) => loc._id === scopedLocationId);
    if (!scoped) {
      throw new Error("Selected shop location is not active for this organization");
    }
    return [scoped];
  }

  return activeLocations;
}

async function getOrgShiftDefaults(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: string,
) {
  const settings = await ensureSettingsRow(ctx, organizationId, userId);
  return {
    settings,
    defaultShift: {
      daysOfWeek: settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays,
      startHour: settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
      endHour: settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
      efficiencyMultiplier:
        settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
    },
  };
}

export const setRosterWorkspaceEnabled = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const settings = await ensureSettingsRow(ctx, args.organizationId, userId);
    if (!settings) {
      throw new Error("Failed to initialize scheduling settings");
    }

    await ctx.db.patch(settings._id, {
      rosterWorkspaceEnabled: args.enabled,
      updatedAt: Date.now(),
      updatedByUserId: userId,
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "schedulingSettings",
      String(settings._id),
      `Roster workspace ${args.enabled ? "enabled" : "disabled"}`,
    );

    return { ok: true, enabled: args.enabled };
  },
});

export const ensureRosterWorkspaceBootstrap = mutation({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
  },
  handler: async (ctx, args) => {
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);
    if (scopedLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, scopedLocationId);
    }

    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    const { settings, defaultShift } = await getOrgShiftDefaults(ctx, args.organizationId, userId);

    const now = Date.now();
    const touchedShiftIds = new Set<string>();
    const touchedTeamIds = new Set<string>();

    const locations = await listScopedLocations(ctx, args.organizationId, scopedLocationId);
    const locationKeys = locations.length > 0 ? locations : [{ _id: undefined, code: "ORG", name: "Org" }];

    const allRosterShifts = await ctx.db
      .query("rosterShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const allRosterTeams = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeTechs = await ctx.db
      .query("technicians")
      .withIndex("by_status", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    const allTechShifts = await ctx.db
      .query("technicianShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeShiftByTech = new Map<string, any>();
    for (const shift of allTechShifts) {
      if (!isShiftActive(shift, now)) continue;
      activeShiftByTech.set(String(shift.technicianId), shift);
    }

    for (const loc of locationKeys) {
      const locId = loc._id as Id<"shopLocations"> | undefined;
      const locCode = (loc as any).code ?? "ORG";

      const scopedShifts = allRosterShifts
        .filter((shift: any) => shift.shopLocationId === locId)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

      let locationShifts = scopedShifts;

      if (locationShifts.length === 0) {
        const shiftSeeds = [
          {
            name: `${locCode} Day Shift`,
            daysOfWeek: defaultShift.daysOfWeek,
            startHour: defaultShift.startHour,
            endHour: defaultShift.endHour,
            efficiencyMultiplier: defaultShift.efficiencyMultiplier,
          },
          {
            name: `${locCode} Swing Shift`,
            daysOfWeek: [1, 2, 3, 4, 5],
            startHour: 14,
            endHour: 22,
            efficiencyMultiplier: 0.95,
          },
        ];

        locationShifts = [];
        for (let i = 0; i < shiftSeeds.length; i++) {
          const seed = shiftSeeds[i];
          const shiftId = await ctx.db.insert("rosterShifts", {
            organizationId: args.organizationId,
            shopLocationId: locId,
            ...seed,
            isActive: true,
            sortOrder: i,
            createdAt: now,
            updatedAt: now,
          });
          const shift = await ctx.db.get(shiftId);
          if (shift) {
            locationShifts.push(shift);
            touchedShiftIds.add(String(shiftId));
          }
        }
      }

      const locationTeams = allRosterTeams
        .filter((team: any) => team.shopLocationId === locId)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

      const teamByShift = new Map<string, any>();
      for (const team of locationTeams) {
        if (!teamByShift.has(String(team.shiftId))) {
          teamByShift.set(String(team.shiftId), team);
        }
      }

      for (let i = 0; i < locationShifts.length; i++) {
        const shift = locationShifts[i];
        if (teamByShift.has(String(shift._id))) continue;

        const teamId = await ctx.db.insert("rosterTeams", {
          organizationId: args.organizationId,
          shopLocationId: locId,
          name: `${locCode} ${shift.name.replace(`${locCode} `, "")}`,
          colorToken: DEFAULT_TEAM_COLORS[i % DEFAULT_TEAM_COLORS.length],
          shiftId: shift._id,
          isActive: true,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        });
        const team = await ctx.db.get(teamId);
        if (team) {
          teamByShift.set(String(team.shiftId), team);
          touchedTeamIds.add(String(teamId));
        }
      }

      const teamsNow = Array.from(teamByShift.values());
      if (teamsNow.length === 0 && locationShifts[0]) {
        const fallbackId = await ctx.db.insert("rosterTeams", {
          organizationId: args.organizationId,
          shopLocationId: locId,
          name: `${locCode} Unassigned Team`,
          colorToken: DEFAULT_TEAM_COLORS[0],
          shiftId: locationShifts[0]._id,
          isActive: true,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
        const fallback = await ctx.db.get(fallbackId);
        if (fallback) {
          teamsNow.push(fallback);
          touchedTeamIds.add(String(fallbackId));
        }
      }

      const teamsById = new Map(teamsNow.map((team: any) => [String(team._id), team]));
      const shiftsById = new Map(locationShifts.map((shift: any) => [String(shift._id), shift]));

      const techsForLocation = activeTechs.filter(
        (tech: any) =>
          (locId ? tech.primaryShopLocationId === locId : true),
      );

      const fallbackTeam =
        teamsNow.find((team: any) => team.name.includes("Unassigned")) ?? teamsNow[0];

      for (const tech of techsForLocation) {
        if (tech.rosterTeamId && teamsById.has(String(tech.rosterTeamId))) {
          continue;
        }

        const overrideShift = activeShiftByTech.get(String(tech._id));
        const resolved = resolveEffectiveShift({
          technicianShift: overrideShift
            ? {
                daysOfWeek: overrideShift.daysOfWeek,
                startHour: overrideShift.startHour,
                endHour: overrideShift.endHour,
                efficiencyMultiplier: overrideShift.efficiencyMultiplier,
              }
            : undefined,
          teamShift: undefined,
          defaultShift,
        });

        const targetSignature = shiftSignature(resolved);
        let selectedTeam = fallbackTeam;

        for (const team of teamsNow) {
          const linkedShift = shiftsById.get(String(team.shiftId));
          if (!linkedShift) continue;
          if (
            shiftSignature({
              daysOfWeek: linkedShift.daysOfWeek,
              startHour: linkedShift.startHour,
              endHour: linkedShift.endHour,
              efficiencyMultiplier: linkedShift.efficiencyMultiplier,
            }) === targetSignature
          ) {
            selectedTeam = team;
            break;
          }
        }

        if (!selectedTeam) continue;
        await ctx.db.patch(tech._id, {
          rosterTeamId: selectedTeam._id,
          updatedAt: now,
        });
      }
    }

    if (settings && !settings.rosterWorkspaceBootstrappedAt) {
      await ctx.db.patch(settings._id, {
        rosterWorkspaceBootstrappedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
      });
    }

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "schedulingSettings",
      String(settings?._id ?? "init"),
      `Roster workspace bootstrap completed by ${callerTech.userId ?? callerTech._id}`,
    );

    return {
      ok: true,
      touchedShiftCount: touchedShiftIds.size,
      touchedTeamCount: touchedTeamIds.size,
      bootstrappedAt: now,
    };
  },
});

export const getRosterWorkspace = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
    focusDateMs: v.optional(v.number()),
    dateMode: v.optional(v.union(v.literal("today"), v.literal("focus"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);
    if (scopedLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, scopedLocationId);
    }

    const settings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .unique();

    const dateMode = args.dateMode ?? "today";
    const focusDateMs = dateMode === "focus" && args.focusDateMs ? args.focusDateMs : now;
    const focusDateKey = dateKeyFromMs(focusDateMs);
    const focusDay = new Date(focusDateMs).getDay();

    const activeTechsAll = await ctx.db
      .query("technicians")
      .withIndex("by_status", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    const activeTechs = scopedLocationId
      ? activeTechsAll.filter((tech: any) => tech.primaryShopLocationId === scopedLocationId)
      : activeTechsAll;

    const rosterShiftsAll = await ctx.db
      .query("rosterShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const rosterTeamsAll = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const holidaysAll = await ctx.db
      .query("schedulingHolidays")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeTechShiftsAll = await ctx.db
      .query("technicianShifts")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const rosterShifts = rosterShiftsAll
      .filter(
        (shift: any) =>
          shift.isActive !== false &&
          (scopedLocationId ? shift.shopLocationId === scopedLocationId : true),
      )
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const rosterTeams = rosterTeamsAll
      .filter(
        (team: any) =>
          team.isActive !== false &&
          (scopedLocationId ? team.shopLocationId === scopedLocationId : true),
      )
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const shiftById = new Map(rosterShifts.map((shift: any) => [String(shift._id), shift]));
    const teamById = new Map(rosterTeams.map((team: any) => [String(team._id), team]));

    const observedHoliday = holidaysAll.find(
      (holiday: any) =>
        holiday.dateKey === focusDateKey &&
        holiday.isObserved &&
        (scopedLocationId ? holiday.shopLocationId === scopedLocationId : true),
    );

    const defaultShift = {
      daysOfWeek: settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays,
      startHour: settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
      endHour: settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
      efficiencyMultiplier:
        settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
    };

    const activeShiftByTech = new Map<string, any>();
    for (const shift of activeTechShiftsAll) {
      if (!isShiftActive(shift, now)) continue;
      activeShiftByTech.set(String(shift.technicianId), shift);
    }

    const cardsByTech = new Map<string, { count: number; remaining: number }>();

    for (const tech of activeTechs) {
      const assignedCards = await ctx.db
        .query("taskCards")
        .withIndex("by_assigned", (q: any) => q.eq("assignedToTechnicianId", tech._id))
        .collect();

      const activeCards = assignedCards.filter(
        (card: any) => card.status !== "complete" && card.status !== "voided",
      );

      cardsByTech.set(String(tech._id), {
        count: activeCards.length,
        remaining: activeCards.reduce((sum: number, card: any) => sum + (card.estimatedHours ?? 0), 0),
      });
    }

    const technicians = activeTechs.map((tech: any) => {
      const team = tech.rosterTeamId ? teamById.get(String(tech.rosterTeamId)) : undefined;
      const teamShift = team ? shiftById.get(String(team.shiftId)) : undefined;
      const override = activeShiftByTech.get(String(tech._id));

      const resolvedShift = resolveEffectiveShift({
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
        defaultShift,
      });

      const cardStats = cardsByTech.get(String(tech._id)) ?? { count: 0, remaining: 0 };

      return {
        technicianId: tech._id,
        name: tech.legalName,
        employeeId: tech.employeeId,
        role: tech.role,
        teamId: team?._id,
        teamName: team?.name,
        teamColorToken: team?.colorToken,
        shiftId: team?.shiftId,
        shiftName: teamShift?.name,
        shiftSource: resolvedShift.source,
        usingDefaultShift: resolvedShift.usingDefaultShift,
        usingTeamShift: resolvedShift.usingTeamShift,
        daysOfWeek: resolvedShift.daysOfWeek,
        startHour: resolvedShift.startHour,
        endHour: resolvedShift.endHour,
        efficiencyMultiplier: resolvedShift.efficiencyMultiplier,
        isSupervisor: isSupervisorRole(tech.role),
        isOnShiftToday:
          !observedHoliday && resolvedShift.daysOfWeek.includes(focusDay),
        assignedActiveCards: cardStats.count,
        estimatedRemainingHours: cardStats.remaining,
      };
    });

    const teamRows = rosterTeams.map((team: any) => {
      const members = technicians.filter((tech: any) => tech.teamId === team._id);
      const shift = shiftById.get(String(team.shiftId));

      const onShiftMembers = members.filter((tech: any) => tech.isOnShiftToday);
      const hasSupervisorCoverage = onShiftMembers.some((tech: any) => tech.isSupervisor);

      return {
        teamId: team._id,
        name: team.name,
        colorToken: team.colorToken,
        shiftId: team.shiftId,
        shiftName: shift?.name,
        daysOfWeek: shift?.daysOfWeek ?? defaultShift.daysOfWeek,
        startHour: shift?.startHour ?? defaultShift.startHour,
        endHour: shift?.endHour ?? defaultShift.endHour,
        efficiencyMultiplier: shift?.efficiencyMultiplier ?? defaultShift.efficiencyMultiplier,
        memberCount: members.length,
        onShiftCount: onShiftMembers.length,
        hasSupervisorCoverage,
        isUnsupervised: onShiftMembers.length > 0 && !hasSupervisorCoverage,
      };
    });

    const shiftRows = rosterShifts.map((shift: any) => ({
      shiftId: shift._id,
      name: shift.name,
      daysOfWeek: shift.daysOfWeek,
      startHour: shift.startHour,
      endHour: shift.endHour,
      efficiencyMultiplier: shift.efficiencyMultiplier,
      teamCount: teamRows.filter((team: any) => team.shiftId === shift._id).length,
      activeToday: !observedHoliday && shift.daysOfWeek.includes(focusDay),
      sortOrder: shift.sortOrder,
    }));

    const totalAssignedCards = technicians.reduce(
      (sum: number, tech: any) => sum + tech.assignedActiveCards,
      0,
    );
    const totalRemainingHours = technicians.reduce(
      (sum: number, tech: any) => sum + tech.estimatedRemainingHours,
      0,
    );

    const activeTeamCount = teamRows.filter((team: any) => team.memberCount > 0).length;
    const unsupervisedTeams = teamRows.filter((team: any) => team.isUnsupervised).length;

    return {
      feature: {
        rosterWorkspaceEnabled: settings?.rosterWorkspaceEnabled ?? false,
        rosterWorkspaceBootstrappedAt: settings?.rosterWorkspaceBootstrappedAt,
      },
      focus: {
        dateMode,
        focusDateMs,
        focusDateKey,
        focusDay,
        observedHoliday: observedHoliday
          ? {
              id: observedHoliday._id,
              name: observedHoliday.name,
              dateKey: observedHoliday.dateKey,
            }
          : null,
      },
      shifts: shiftRows,
      teams: teamRows,
      technicians,
      holidays: holidaysAll
        .filter(
          (holiday: any) =>
            holiday.isObserved &&
            (scopedLocationId ? holiday.shopLocationId === scopedLocationId : true),
        )
        .sort((a: any, b: any) => a.dateKey.localeCompare(b.dateKey)),
      analysis: {
        activeTechnicians: technicians.length,
        activeTeams: activeTeamCount,
        unsupervisedTeams,
        onShiftTechnicians: technicians.filter((tech: any) => tech.isOnShiftToday).length,
        assignedCards: totalAssignedCards,
        remainingHours: totalRemainingHours,
        averageEfficiency:
          technicians.length > 0
            ? technicians.reduce((sum: number, tech: any) => sum + tech.efficiencyMultiplier, 0) /
              technicians.length
            : 0,
        supervisorCoveragePercent:
          activeTeamCount > 0
            ? Math.round(((activeTeamCount - unsupervisedTeams) / activeTeamCount) * 100)
            : 100,
      },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listActiveRosterTeams
//
// Lightweight query for populating team-assignment dropdowns (e.g. work order
// team assignment). Returns only active teams with minimal fields.
// ─────────────────────────────────────────────────────────────────────────────

export const listActiveRosterTeams = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const teams = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();

    // If shopLocationId provided, include teams for that location + org-wide teams (no location)
    const filtered = args.shopLocationId
      ? teams.filter(
          (t) => !t.shopLocationId || t.shopLocationId === args.shopLocationId,
        )
      : teams;

    return filtered
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((team) => ({
        _id: team._id,
        name: team.name,
        colorToken: team.colorToken,
      }));
  },
});

export const createRosterTeam = mutation({
  args: teamMutationValidator,
  handler: async (ctx, args) => {
    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const shift = await ctx.db.get(args.shiftId);
    if (!shift || shift.organizationId !== args.organizationId) {
      throw new Error("Shift does not belong to this organization");
    }

    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const existing = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org_location", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
      )
      .collect();

    const now = Date.now();
    const teamId = await ctx.db.insert("rosterTeams", {
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      name: args.name.trim(),
      colorToken: args.colorToken,
      shiftId: args.shiftId,
      isActive: true,
      sortOrder: args.sortOrder ?? existing.length,
      createdAt: now,
      updatedAt: now,
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_created",
      "rosterTeams",
      String(teamId),
      `Created roster team ${args.name.trim()}`,
    );

    return teamId;
  },
});

export const updateRosterTeam = mutation({
  args: {
    teamId: v.id("rosterTeams"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    colorToken: v.optional(v.string()),
    shiftId: v.optional(v.id("rosterShifts")),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const team = await ctx.db.get(args.teamId);
    if (!team || team.organizationId !== args.organizationId) {
      throw new Error("Roster team not found");
    }

    if (args.shiftId) {
      const shift = await ctx.db.get(args.shiftId);
      if (!shift || shift.organizationId !== args.organizationId) {
        throw new Error("Shift does not belong to this organization");
      }
    }

    await ctx.db.patch(args.teamId, {
      name: args.name?.trim() ?? team.name,
      colorToken: args.colorToken ?? team.colorToken,
      shiftId: args.shiftId ?? team.shiftId,
      sortOrder: args.sortOrder ?? team.sortOrder,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterTeams",
      String(args.teamId),
      `Updated roster team ${team.name}`,
    );

    return { ok: true };
  },
});

export const archiveRosterTeam = mutation({
  args: {
    teamId: v.id("rosterTeams"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const team = await ctx.db.get(args.teamId);
    if (!team || team.organizationId !== args.organizationId) {
      throw new Error("Roster team not found");
    }

    const assignedTechs = await ctx.db
      .query("technicians")
      .withIndex("by_org_roster_team", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("rosterTeamId", args.teamId),
      )
      .collect();

    if (assignedTechs.length > 0) {
      throw new Error("Cannot archive team with assigned technicians. Reassign members first.");
    }

    await ctx.db.patch(args.teamId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterTeams",
      String(args.teamId),
      `Archived roster team ${team.name}`,
    );

    return { ok: true };
  },
});

export const deleteRosterTeam = mutation({
  args: {
    teamId: v.id("rosterTeams"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const team = await ctx.db.get(args.teamId);
    if (!team || team.organizationId !== args.organizationId) {
      throw new Error("Roster team not found");
    }

    const assignedTechs = await ctx.db
      .query("technicians")
      .withIndex("by_org_roster_team", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("rosterTeamId", args.teamId),
      )
      .collect();

    if (assignedTechs.length > 0) {
      throw new Error("Cannot delete team with assigned technicians. Reassign members first.");
    }

    await ctx.db.delete(args.teamId);

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterTeams",
      String(args.teamId),
      `Deleted roster team ${team.name}`,
    );

    return { ok: true };
  },
});

export const createRosterShift = mutation({
  args: shiftMutationValidator,
  handler: async (ctx, args) => {
    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const now = Date.now();
    const daysOfWeek = normalizeDays(args.daysOfWeek);
    if (daysOfWeek.length === 0) {
      throw new Error("Shift requires at least one work day");
    }

    const existing = await ctx.db
      .query("rosterShifts")
      .withIndex("by_org_location", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shopLocationId", args.shopLocationId),
      )
      .collect();

    const shiftId = await ctx.db.insert("rosterShifts", {
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      name: args.name.trim(),
      daysOfWeek,
      startHour: args.startHour,
      endHour: args.endHour,
      efficiencyMultiplier: args.efficiencyMultiplier,
      isActive: true,
      sortOrder: args.sortOrder ?? existing.length,
      createdAt: now,
      updatedAt: now,
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_created",
      "rosterShifts",
      String(shiftId),
      `Created roster shift ${args.name.trim()}`,
    );

    return shiftId;
  },
});

export const updateRosterShift = mutation({
  args: {
    shiftId: v.id("rosterShifts"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    daysOfWeek: v.optional(v.array(v.number())),
    startHour: v.optional(v.number()),
    endHour: v.optional(v.number()),
    efficiencyMultiplier: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const shift = await ctx.db.get(args.shiftId);
    if (!shift || shift.organizationId !== args.organizationId) {
      throw new Error("Roster shift not found");
    }

    const daysOfWeek = args.daysOfWeek ? normalizeDays(args.daysOfWeek) : shift.daysOfWeek;
    if (daysOfWeek.length === 0) {
      throw new Error("Shift requires at least one work day");
    }

    await ctx.db.patch(args.shiftId, {
      name: args.name?.trim() ?? shift.name,
      daysOfWeek,
      startHour: args.startHour ?? shift.startHour,
      endHour: args.endHour ?? shift.endHour,
      efficiencyMultiplier: args.efficiencyMultiplier ?? shift.efficiencyMultiplier,
      sortOrder: args.sortOrder ?? shift.sortOrder,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterShifts",
      String(args.shiftId),
      `Updated roster shift ${shift.name}`,
    );

    return { ok: true };
  },
});

export const archiveRosterShift = mutation({
  args: {
    shiftId: v.id("rosterShifts"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const shift = await ctx.db.get(args.shiftId);
    if (!shift || shift.organizationId !== args.organizationId) {
      throw new Error("Roster shift not found");
    }

    const teams = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org_shift", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shiftId", args.shiftId),
      )
      .collect();

    if (teams.some((team: any) => team.isActive !== false)) {
      throw new Error("Cannot archive shift with active teams. Reassign teams first.");
    }

    await ctx.db.patch(args.shiftId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterShifts",
      String(args.shiftId),
      `Archived roster shift ${shift.name}`,
    );

    return { ok: true };
  },
});

export const deleteRosterShift = mutation({
  args: {
    shiftId: v.id("rosterShifts"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const shift = await ctx.db.get(args.shiftId);
    if (!shift || shift.organizationId !== args.organizationId) {
      throw new Error("Roster shift not found");
    }

    const teams = await ctx.db
      .query("rosterTeams")
      .withIndex("by_org_shift", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("shiftId", args.shiftId),
      )
      .collect();

    if (teams.length > 0) {
      throw new Error("Cannot delete shift while teams are linked to it.");
    }

    await ctx.db.delete(args.shiftId);

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "rosterShifts",
      String(args.shiftId),
      `Deleted roster shift ${shift.name}`,
    );

    return { ok: true };
  },
});

export const createSchedulingHoliday = mutation({
  args: holidayMutationValidator,
  handler: async (ctx, args) => {
    if (args.shopLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, args.shopLocationId);
    }

    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const existing = await ctx.db
      .query("schedulingHolidays")
      .withIndex("by_org_location_date", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("shopLocationId", args.shopLocationId)
          .eq("dateKey", args.dateKey),
      )
      .first();

    if (existing) {
      throw new Error("Holiday already exists for this date and location");
    }

    const now = Date.now();
    const holidayId = await ctx.db.insert("schedulingHolidays", {
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      dateKey: args.dateKey,
      name: args.name.trim(),
      isObserved: true,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_created",
      "schedulingHolidays",
      String(holidayId),
      `Created holiday ${args.name.trim()} (${args.dateKey})`,
    );

    return holidayId;
  },
});

export const updateSchedulingHoliday = mutation({
  args: {
    holidayId: v.id("schedulingHolidays"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const holiday = await ctx.db.get(args.holidayId);
    if (!holiday || holiday.organizationId !== args.organizationId) {
      throw new Error("Scheduling holiday not found");
    }

    await ctx.db.patch(args.holidayId, {
      name: args.name?.trim() ?? holiday.name,
      notes: args.notes ?? holiday.notes,
      dateKey: args.dateKey ?? holiday.dateKey,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "schedulingHolidays",
      String(args.holidayId),
      `Updated holiday ${holiday.name}`,
    );

    return { ok: true };
  },
});

export const toggleSchedulingHoliday = mutation({
  args: {
    holidayId: v.id("schedulingHolidays"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const holiday = await ctx.db.get(args.holidayId);
    if (!holiday || holiday.organizationId !== args.organizationId) {
      throw new Error("Scheduling holiday not found");
    }

    await ctx.db.patch(args.holidayId, {
      isObserved: !holiday.isObserved,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "schedulingHolidays",
      String(args.holidayId),
      `${holiday.isObserved ? "Disabled" : "Enabled"} holiday ${holiday.name}`,
    );

    return { ok: true, isObserved: !holiday.isObserved };
  },
});

export const deleteSchedulingHoliday = mutation({
  args: {
    holidayId: v.id("schedulingHolidays"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const holiday = await ctx.db.get(args.holidayId);
    if (!holiday || holiday.organizationId !== args.organizationId) {
      throw new Error("Scheduling holiday not found");
    }

    await ctx.db.delete(args.holidayId);

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "schedulingHolidays",
      String(args.holidayId),
      `Deleted holiday ${holiday.name}`,
    );

    return { ok: true };
  },
});

export const assignTechnicianToRosterTeam = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
    teamId: v.id("rosterTeams"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const [tech, team] = await Promise.all([
      ctx.db.get(args.technicianId),
      ctx.db.get(args.teamId),
    ]);

    if (!tech || tech.organizationId !== args.organizationId) {
      throw new Error("Technician not found for organization");
    }

    if (!team || team.organizationId !== args.organizationId) {
      throw new Error("Roster team not found for organization");
    }

    if (
      tech.primaryShopLocationId &&
      team.shopLocationId &&
      tech.primaryShopLocationId !== team.shopLocationId
    ) {
      throw new Error("Technician and team must belong to the same location");
    }

    await ctx.db.patch(args.technicianId, {
      rosterTeamId: args.teamId,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "technicians",
      String(args.technicianId),
      `Assigned technician ${tech.legalName} to roster team ${team.name}`,
    );

    return { ok: true };
  },
});

export const clearTechnicianRosterTeam = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const { callerTech, userId } = await getCallerTech(ctx, args.organizationId);
    requireRosterManager(callerTech.role);

    const tech = await ctx.db.get(args.technicianId);
    if (!tech || tech.organizationId !== args.organizationId) {
      throw new Error("Technician not found for organization");
    }

    await ctx.db.patch(args.technicianId, {
      rosterTeamId: undefined,
      updatedAt: Date.now(),
    });

    await writeRosterAudit(
      ctx,
      args.organizationId,
      userId,
      "record_updated",
      "technicians",
      String(args.technicianId),
      `Cleared roster team for technician ${tech.legalName}`,
    );

    return { ok: true };
  },
});

export const listSchedulingHolidaysForRange = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
    startDateMs: v.number(),
    endDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    const scopedLocationId = resolveScopedLocationId(args.shopLocationId);
    if (scopedLocationId) {
      await ensureShopLocationBelongsToOrg(ctx, args.organizationId, scopedLocationId);
    }

    const holidays = await ctx.db
      .query("schedulingHolidays")
      .withIndex("by_org", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    return holidays
      .filter(
        (holiday: any) =>
          holiday.isObserved &&
          (scopedLocationId ? holiday.shopLocationId === scopedLocationId : true) &&
          isDateKeyWithinRange(holiday.dateKey, args.startDateMs, args.endDateMs),
      )
      .sort((a: any, b: any) => a.dateKey.localeCompare(b.dateKey));
  },
});
