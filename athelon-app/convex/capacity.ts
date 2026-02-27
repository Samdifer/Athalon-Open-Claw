// convex/capacity.ts
// Athelon — Scheduling Phase 2: Technician Shift Model + Capacity Calculation
//
// Queries and mutations for:
//   - Per-technician shift patterns (daysOfWeek, hours, efficiency multiplier)
//   - Shop-wide scheduling settings (capacity buffer, defaults)
//   - Available-hours calculation over a date range
//   - Capacity utilization vs. committed hours

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  capacityBufferPercent: 15,
  defaultShiftDays: [1, 2, 3, 4, 5], // Mon–Fri
  defaultStartHour: 7,
  defaultEndHour: 17,
  defaultEfficiencyMultiplier: 1.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(identity: { subject: string } | null): string {
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

/** Returns true if the shift is currently active (no effectiveTo, or effectiveTo in future). */
function isShiftActive(
  shift: { effectiveTo?: number },
  nowMs: number,
): boolean {
  return shift.effectiveTo === undefined || shift.effectiveTo > nowMs;
}

/** Hours per day for a shift, after efficiency multiplier. */
function hoursPerShiftDay(
  startHour: number,
  endHour: number,
  efficiencyMultiplier: number,
): number {
  return (endHour - startHour) * efficiencyMultiplier;
}

// ─── getSchedulingSettings ────────────────────────────────────────────────────

export const getSchedulingSettings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    if (!row) {
      return {
        ...DEFAULT_SETTINGS,
        organizationId: args.organizationId,
        updatedAt: null,
        updatedByUserId: null,
      };
    }
    return row;
  },
});

// ─── upsertSchedulingSettings ─────────────────────────────────────────────────

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
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const patch = {
      capacityBufferPercent:
        args.capacityBufferPercent ?? existing?.capacityBufferPercent ?? DEFAULT_SETTINGS.capacityBufferPercent,
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
        ...patch,
      });
    }
  },
});

// ─── getTechnicianShift ───────────────────────────────────────────────────────

export const getTechnicianShift = query({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();

    const shifts = await ctx.db
      .query("technicianShifts")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();

    const active = shifts.find((s) => isShiftActive(s, nowMs));

    if (active) return active;

    // Fall back to org defaults
    const settings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    return {
      technicianId: args.technicianId,
      organizationId: args.organizationId,
      daysOfWeek: settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays,
      startHour: settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour,
      endHour: settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour,
      efficiencyMultiplier:
        settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier,
      isDefault: true,
    };
  },
});

// ─── upsertTechnicianShift ────────────────────────────────────────────────────

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

    // Retire the currently-active shift (set effectiveTo = now)
    const existing = await ctx.db
      .query("technicianShifts")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();

    for (const shift of existing) {
      if (isShiftActive(shift, nowMs)) {
        await ctx.db.patch(shift._id, { effectiveTo: nowMs });
      }
    }

    // Create the new active shift
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

    // Audit log
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

// ─── getTechnicianWorkload ────────────────────────────────────────────────────

export const getTechnicianWorkload = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const nowMs = Date.now();

    // Fetch all active technicians
    const techs = await ctx.db
      .query("technicians")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    // Fetch org settings for defaults
    const settings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const defaultDays = settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays;
    const defaultStart = settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour;
    const defaultEnd = settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour;
    const defaultEff = settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier;

    // For each tech, get their active shift and active task card count
    const results = await Promise.all(
      techs.map(async (tech) => {
        // Active shift
        const shifts = await ctx.db
          .query("technicianShifts")
          .withIndex("by_technician", (q) => q.eq("technicianId", tech._id))
          .collect();

        const activeShift = shifts.find((s) => isShiftActive(s, nowMs));

        const daysOfWeek = activeShift?.daysOfWeek ?? defaultDays;
        const startHour = activeShift?.startHour ?? defaultStart;
        const endHour = activeShift?.endHour ?? defaultEnd;
        const efficiencyMultiplier = activeShift?.efficiencyMultiplier ?? defaultEff;

        // Active task cards assigned to this tech
        const assignedCards = await ctx.db
          .query("taskCards")
          .withIndex("by_assigned", (q) =>
            q.eq("assignedToTechnicianId", tech._id),
          )
          .collect();

        const activeCards = assignedCards.filter(
          (c) => c.status !== "complete" && c.status !== "voided",
        );

        const estimatedRemainingHours = activeCards.reduce(
          (sum, c) => sum + (c.estimatedHours ?? 0),
          0,
        );

        return {
          technicianId: tech._id,
          name: tech.legalName,
          employeeId: tech.employeeId,
          daysOfWeek,
          startHour,
          endHour,
          efficiencyMultiplier,
          usingDefaultShift: !activeShift,
          assignedActiveCards: activeCards.length,
          estimatedRemainingHours,
        };
      }),
    );

    return results;
  },
});

// ─── getShopCapacity ─────────────────────────────────────────────────────────

export const getShopCapacity = query({
  args: {
    organizationId: v.id("organizations"),
    startDateMs: v.number(),
    endDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();

    const techs = await ctx.db
      .query("technicians")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    const settings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const defaultDays = settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays;
    const defaultStart = settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour;
    const defaultEnd = settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour;
    const defaultEff = settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier;

    let totalAvailableHours = 0;
    const byTechnician: Array<{
      technicianId: string;
      name: string;
      availableHours: number;
      shiftDays: number[];
      startHour: number;
      endHour: number;
      efficiencyMultiplier: number;
    }> = [];

    for (const tech of techs) {
      const shifts = await ctx.db
        .query("technicianShifts")
        .withIndex("by_technician", (q) => q.eq("technicianId", tech._id))
        .collect();

      const activeShift = shifts.find((s) => isShiftActive(s, nowMs));

      const daysOfWeek = activeShift?.daysOfWeek ?? defaultDays;
      const startHour = activeShift?.startHour ?? defaultStart;
      const endHour = activeShift?.endHour ?? defaultEnd;
      const efficiencyMultiplier = activeShift?.efficiencyMultiplier ?? defaultEff;

      // Iterate each day in the range
      let availableHours = 0;
      const current = new Date(args.startDateMs);
      const end = new Date(args.endDateMs);
      while (current <= end) {
        const dow = current.getDay();
        if (daysOfWeek.includes(dow)) {
          availableHours += hoursPerShiftDay(startHour, endHour, efficiencyMultiplier);
        }
        current.setDate(current.getDate() + 1);
      }

      totalAvailableHours += availableHours;
      byTechnician.push({
        technicianId: tech._id,
        name: tech.legalName,
        availableHours,
        shiftDays: daysOfWeek,
        startHour,
        endHour,
        efficiencyMultiplier,
      });
    }

    return { totalAvailableHours, byTechnician };
  },
});

// ─── getCapacityUtilization ───────────────────────────────────────────────────

export const getCapacityUtilization = query({
  args: {
    organizationId: v.id("organizations"),
    periodWeeks: v.number(),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();
    const endDateMs = nowMs + args.periodWeeks * 7 * 24 * 60 * 60 * 1000;

    const techs = await ctx.db
      .query("technicians")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    const settings = await ctx.db
      .query("schedulingSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const bufferPercent = settings?.capacityBufferPercent ?? DEFAULT_SETTINGS.capacityBufferPercent;
    const defaultDays = settings?.defaultShiftDays ?? DEFAULT_SETTINGS.defaultShiftDays;
    const defaultStart = settings?.defaultStartHour ?? DEFAULT_SETTINGS.defaultStartHour;
    const defaultEnd = settings?.defaultEndHour ?? DEFAULT_SETTINGS.defaultEndHour;
    const defaultEff = settings?.defaultEfficiencyMultiplier ?? DEFAULT_SETTINGS.defaultEfficiencyMultiplier;

    let totalAvailableHours = 0;
    let totalCommittedHours = 0;

    const byTechnician: Array<{
      technicianId: string;
      name: string;
      availableHours: number;
      assignedEstimatedHours: number;
      utilizationPercent: number;
    }> = [];

    for (const tech of techs) {
      // Shift
      const shifts = await ctx.db
        .query("technicianShifts")
        .withIndex("by_technician", (q) => q.eq("technicianId", tech._id))
        .collect();

      const activeShift = shifts.find((s) => isShiftActive(s, nowMs));
      const daysOfWeek = activeShift?.daysOfWeek ?? defaultDays;
      const startHour = activeShift?.startHour ?? defaultStart;
      const endHour = activeShift?.endHour ?? defaultEnd;
      const efficiencyMultiplier = activeShift?.efficiencyMultiplier ?? defaultEff;

      // Available hours over period
      let availableHours = 0;
      const current = new Date(nowMs);
      const end = new Date(endDateMs);
      while (current <= end) {
        const dow = current.getDay();
        if (daysOfWeek.includes(dow)) {
          availableHours += hoursPerShiftDay(startHour, endHour, efficiencyMultiplier);
        }
        current.setDate(current.getDate() + 1);
      }

      // Assigned task card hours (incomplete)
      const assignedCards = await ctx.db
        .query("taskCards")
        .withIndex("by_assigned", (q) =>
          q.eq("assignedToTechnicianId", tech._id),
        )
        .collect();

      const assignedEstimatedHours = assignedCards
        .filter((c) => c.status !== "complete" && c.status !== "voided")
        .reduce((sum, c) => sum + (c.estimatedHours ?? 0), 0);

      const techUtil = availableHours > 0
        ? Math.round((assignedEstimatedHours / availableHours) * 100)
        : 0;

      totalAvailableHours += availableHours;
      totalCommittedHours += assignedEstimatedHours;

      byTechnician.push({
        technicianId: tech._id,
        name: tech.legalName,
        availableHours,
        assignedEstimatedHours,
        utilizationPercent: techUtil,
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
      byTechnician,
    };
  },
});
