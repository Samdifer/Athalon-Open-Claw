import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("maintenancePrograms")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const listByAircraftType = query({
  args: { organizationId: v.string(), aircraftType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("maintenancePrograms")
      .withIndex("by_org_aircraft", (q) =>
        q.eq("organizationId", args.organizationId).eq("aircraftType", args.aircraftType)
      )
      .collect();
  },
});

export const get = query({
  args: { id: v.id("maintenancePrograms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    aircraftType: v.string(),
    serialNumberScope: v.union(v.literal("all"), v.literal("specific")),
    specificSerials: v.optional(v.array(v.string())),
    taskName: v.string(),
    ataChapter: v.string(),
    approvedDataRef: v.optional(v.string()),
    calendarIntervalDays: v.optional(v.number()),
    hourInterval: v.optional(v.number()),
    cycleInterval: v.optional(v.number()),
    triggerLogic: v.union(v.literal("first"), v.literal("greater")),
    isPhaseInspection: v.boolean(),
    phaseNumber: v.optional(v.number()),
    requiredPartsTemplate: v.optional(v.array(v.string())),
    estimatedLaborHours: v.optional(v.number()),
    // BUG-DOM-117: isActive was missing from the create mutation args. The UI form
    // includes an "Active" toggle that was silently ignored — Convex strips unknown
    // fields and the handler hardcoded isActive:true. A DOM creating a program with
    // the toggle set to inactive (e.g., staging a future inspection) would see the
    // program immediately appear as active with no way to pre-set it inactive at
    // creation time.
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("maintenancePrograms", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("maintenancePrograms"),
    taskName: v.optional(v.string()),
    ataChapter: v.optional(v.string()),
    approvedDataRef: v.optional(v.string()),
    calendarIntervalDays: v.optional(v.number()),
    hourInterval: v.optional(v.number()),
    cycleInterval: v.optional(v.number()),
    triggerLogic: v.optional(v.union(v.literal("first"), v.literal("greater"))),
    isPhaseInspection: v.optional(v.boolean()),
    phaseNumber: v.optional(v.number()),
    requiredPartsTemplate: v.optional(v.array(v.string())),
    estimatedLaborHours: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("maintenancePrograms") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});

// Compute next-due dates for an aircraft given its current times/cycles
export const computeDueDates = query({
  args: {
    organizationId: v.string(),
    aircraftType: v.string(),
    currentTotalTime: v.number(),
    currentCycles: v.number(),
    averageMonthlyHours: v.number(),
    averageMonthlyCycles: v.number(),
  },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("maintenancePrograms")
      .withIndex("by_org_aircraft", (q) =>
        q.eq("organizationId", args.organizationId).eq("aircraftType", args.aircraftType)
      )
      .collect();

    const active = programs.filter((p) => p.isActive);
    const now = Date.now();
    const msPerDay = 86400000;

    return active.map((program) => {
      const projections: { type: string; dueDate: number; remaining: string }[] = [];

      if (program.calendarIntervalDays) {
        const dueDate = now + program.calendarIntervalDays * msPerDay;
        projections.push({
          type: "calendar",
          dueDate,
          remaining: `${program.calendarIntervalDays} days`,
        });
      }

      if (program.hourInterval) {
        // BUG-DOM-114: hoursRemaining was always set to the full program.hourInterval,
        // ignoring the aircraft's currentTotalTime. A 1 000-hour interval always showed
        // "1 000 hours remaining" regardless of how many hours the aircraft had flown,
        // making the DOM's maintenance planning completely inaccurate. Fix: compute
        // remaining as interval minus (totalTime modulo interval).
        const hoursIntoInterval = args.currentTotalTime % program.hourInterval;
        const hoursRemaining = program.hourInterval - hoursIntoInterval;
        const monthsUntilDue = args.averageMonthlyHours > 0
          ? hoursRemaining / args.averageMonthlyHours
          : Infinity;
        const dueDate = now + monthsUntilDue * 30 * msPerDay;
        projections.push({
          type: "hours",
          dueDate,
          remaining: `${hoursRemaining.toFixed(1)} hours`,
        });
      }

      if (program.cycleInterval) {
        // BUG-DOM-114 (cycles): Same issue — always showed full interval remaining.
        const cyclesIntoInterval = args.currentCycles % program.cycleInterval;
        const cyclesRemaining = program.cycleInterval - cyclesIntoInterval;
        const monthsUntilDue = args.averageMonthlyCycles > 0
          ? cyclesRemaining / args.averageMonthlyCycles
          : Infinity;
        const dueDate = now + monthsUntilDue * 30 * msPerDay;
        projections.push({
          type: "cycles",
          dueDate,
          remaining: `${cyclesRemaining} cycles`,
        });
      }

      const effectiveDueDate = program.triggerLogic === "first"
        ? Math.min(...projections.map((p) => p.dueDate))
        : Math.max(...projections.map((p) => p.dueDate));

      return {
        programId: program._id,
        taskName: program.taskName,
        ataChapter: program.ataChapter,
        triggerLogic: program.triggerLogic,
        projections,
        effectiveDueDate: isFinite(effectiveDueDate) ? effectiveDueDate : null,
        isPhaseInspection: program.isPhaseInspection,
        phaseNumber: program.phaseNumber,
        estimatedLaborHours: program.estimatedLaborHours,
      };
    });
  },
});
