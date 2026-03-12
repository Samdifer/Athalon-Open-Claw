import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireSchedulingManager } from "./shared/helpers/schedulingPermissions";
import { reserveNextWorkOrderNumber } from "./lib/workOrderNumber";
import {
  daysBetween,
  formatAircraftLabel,
  getAircraftTypeTokens,
} from "./lib/dueListPlanningHelpers";

type DueSource =
  | "maintenance_program"
  | "ad_compliance"
  | "ad_one_time"
  | "engine_tbo"
  | "propeller_tbo"
  | "llp"
  | "carry_forward";

type DueEvent = {
  dueKey: string;
  source: DueSource;
  aircraftId: Id<"aircraft">;
  aircraftLabel: string;
  programId?: Id<"maintenancePrograms">;
  title: string;
  details: string;
  dueDate: number;
  dueInDays: number;
  intervalSummary: string[];
  projectionDates: number[];
  hasConflict: boolean;
  conflictReason?: string;
  status: "overdue" | "due_soon" | "planned";
  /** Estimated cost in dollars (optional — for bundle scoring) */
  estimatedCost?: number;
};

type BundleRecommendation = {
  aircraftId: Id<"aircraft">;
  aircraftLabel: string;
  events: { dueKey: string; title: string; dueDate: number }[];
  windowStart: number;
  windowEnd: number;
  estimatedSavingsPercent: number;
  reason: string;
};

const DAY_MS = 86_400_000;

export const dueListWorkbench = query({
  args: {
    organizationId: v.id("organizations"),
    horizonDays: v.optional(v.number()),
    includeAdCompliance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const horizonDays = Math.max(14, Math.min(args.horizonDays ?? 90, 365));
    const horizonEnd = now + horizonDays * DAY_MS;

    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q) =>
        q.eq("operatingOrganizationId", args.organizationId),
      )
      .collect();

    const programs = await ctx.db
      .query("maintenancePrograms")
      .withIndex("by_org", (q) => q.eq("organizationId", String(args.organizationId)))
      .collect();

    const events: DueEvent[] = [];

    for (const ac of aircraft) {
      const typeTokens = getAircraftTypeTokens(ac);
      const matchingPrograms = programs.filter(
        (program) =>
          program.isActive &&
          typeTokens.includes(program.aircraftType) &&
          (program.serialNumberScope === "all" ||
            (program.specificSerials ?? []).includes(ac.serialNumber)),
      );

      for (const program of matchingPrograms) {
        const intervalCandidates: Array<{ label: string; dueDate: number; projectionStepMs: number }> = [];

        if (program.calendarIntervalDays && program.calendarIntervalDays > 0) {
          const dueDate = now + program.calendarIntervalDays * DAY_MS;
          intervalCandidates.push({
            label: `${program.calendarIntervalDays}d`,
            dueDate,
            projectionStepMs: program.calendarIntervalDays * DAY_MS,
          });
        }

        if (program.hourInterval && program.hourInterval > 0) {
          const hoursIntoInterval = ac.totalTimeAirframeHours % program.hourInterval;
          const hoursRemaining = program.hourInterval - hoursIntoInterval;
          const hoursPerDay = 1.5;
          const dueDate = now + Math.ceil(hoursRemaining / hoursPerDay) * DAY_MS;
          intervalCandidates.push({
            label: `${Math.round(hoursRemaining)}h`,
            dueDate,
            projectionStepMs: Math.max(30, Math.round(program.hourInterval / 1.5)) * DAY_MS,
          });
        }

        if (program.cycleInterval && program.cycleInterval > 0) {
          const currentCycles = ac.totalLandingCycles ?? 0;
          const cyclesIntoInterval = currentCycles % program.cycleInterval;
          const cyclesRemaining = program.cycleInterval - cyclesIntoInterval;
          const cyclesPerDay = 1;
          const dueDate = now + Math.ceil(cyclesRemaining / cyclesPerDay) * DAY_MS;
          intervalCandidates.push({
            label: `${Math.round(cyclesRemaining)}cy`,
            dueDate,
            projectionStepMs: Math.max(30, Math.round(program.cycleInterval / cyclesPerDay)) * DAY_MS,
          });
        }

        if (intervalCandidates.length === 0) continue;

        const effectiveDueDate =
          program.triggerLogic === "greater"
            ? Math.max(...intervalCandidates.map((i) => i.dueDate))
            : Math.min(...intervalCandidates.map((i) => i.dueDate));

        if (effectiveDueDate > horizonEnd) continue;

        const baseStep = intervalCandidates[0]?.projectionStepMs ?? 30 * DAY_MS;
        const projectionDates = [
          effectiveDueDate,
          effectiveDueDate + baseStep,
          effectiveDueDate + baseStep * 2,
        ];

        const dueInDays = daysBetween(now, effectiveDueDate);

        events.push({
          dueKey: `mp:${program._id}:${ac._id}`,
          source: "maintenance_program",
          aircraftId: ac._id,
          aircraftLabel: formatAircraftLabel(ac),
          programId: program._id,
          title: program.taskName,
          details: `ATA ${program.ataChapter}${program.isPhaseInspection ? ` • Phase ${program.phaseNumber ?? "-"}` : ""}`,
          dueDate: effectiveDueDate,
          dueInDays,
          intervalSummary: intervalCandidates.map((i) => i.label),
          projectionDates,
          hasConflict: false,
          status: dueInDays < 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
        });
      }
    }

    // ── Recurring AD compliance (existing) ──────────────────────────────
    if (args.includeAdCompliance) {
      const adRows = await ctx.db
        .query("adCompliance")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("complianceStatus", "complied_recurring"),
        )
        .collect();

      for (const row of adRows) {
        const nextDueDate = row.nextDueDate;
        if (!nextDueDate || nextDueDate > horizonEnd || !row.aircraftId) continue;
        const aircraftDoc = await ctx.db.get(row.aircraftId);
        if (!aircraftDoc) continue;
        const ad = await ctx.db.get(row.adId);
        const dueInDays = daysBetween(now, nextDueDate);
        events.push({
          dueKey: `ad:${row._id}`,
          source: "ad_compliance",
          aircraftId: row.aircraftId,
          aircraftLabel: formatAircraftLabel(aircraftDoc),
          title: `Recurring AD ${ad?.adNumber ?? String(row.adId)}`,
          details: row.notes ?? "Recurring AD compliance cycle",
          dueDate: nextDueDate,
          dueInDays,
          intervalSummary: ["recurring"],
          projectionDates: [nextDueDate],
          hasConflict: false,
          status: dueInDays < 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
        });
      }

      // ── One-time ADs not yet complied ────────────────────────────────
      const notCompliedAds = await ctx.db
        .query("adCompliance")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("complianceStatus", "not_complied"),
        )
        .collect();

      for (const row of notCompliedAds) {
        if (!row.aircraftId) continue;
        const aircraftDoc = await ctx.db.get(row.aircraftId);
        if (!aircraftDoc) continue;
        const ad = await ctx.db.get(row.adId);
        // Use compliance deadline if set, otherwise flag as immediately due
        const dueDate = row.nextDueDate ?? now;
        if (dueDate > horizonEnd) continue;
        const dueInDays = daysBetween(now, dueDate);
        events.push({
          dueKey: `ad-once:${row._id}`,
          source: "ad_one_time",
          aircraftId: row.aircraftId,
          aircraftLabel: formatAircraftLabel(aircraftDoc),
          title: `AD ${ad?.adNumber ?? String(row.adId)} — Not Complied`,
          details: ad?.title ?? row.notes ?? "One-time AD requiring compliance",
          dueDate,
          dueInDays,
          intervalSummary: ["one-time"],
          projectionDates: [dueDate],
          hasConflict: false,
          status: dueInDays < 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
        });
      }
    }

    // ── Engine TBO approaching limits ──────────────────────────────────
    const aircraftMap = new Map(aircraft.map((ac) => [String(ac._id), ac]));

    for (const ac of aircraft) {
      const engines = await ctx.db
        .query("engines")
        .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", ac._id))
        .collect();

      for (const engine of engines) {
        if (!engine.timeBetweenOverhaulLimit || engine.timeBetweenOverhaulLimit <= 0) continue;
        const tsoHours = engine.timeSinceOverhaulHours ?? engine.totalTimeHours;
        const remainingHours = engine.timeBetweenOverhaulLimit - tsoHours;
        if (remainingHours > engine.timeBetweenOverhaulLimit * 0.3) continue; // Only flag when within 30% of TBO

        const hoursPerDay = ac.averageDailyHours ?? 1.5;
        const daysRemaining = Math.ceil(remainingHours / hoursPerDay);
        const dueDate = now + daysRemaining * DAY_MS;
        if (dueDate > horizonEnd && remainingHours > 0) continue;

        const dueInDays = daysBetween(now, dueDate);
        events.push({
          dueKey: `eng-tbo:${engine._id}`,
          source: "engine_tbo",
          aircraftId: ac._id,
          aircraftLabel: formatAircraftLabel(ac),
          title: `Engine TBO — ${engine.make} ${engine.model} (${engine.position ?? "?"})`,
          details: `${Math.round(remainingHours)}h remaining of ${engine.timeBetweenOverhaulLimit}h TBO (${Math.round((tsoHours / engine.timeBetweenOverhaulLimit) * 100)}% used)`,
          dueDate,
          dueInDays,
          intervalSummary: [`${Math.round(remainingHours)}h`],
          projectionDates: [dueDate],
          hasConflict: false,
          status: remainingHours <= 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
        });
      }

      // ── Propeller TBO approaching limits ───────────────────────────────
      const propellers = await ctx.db
        .query("propellers")
        .withIndex("by_aircraft", (q) => q.eq("aircraftId", ac._id))
        .collect();

      for (const prop of propellers) {
        // Propellers don't have explicit TBO in schema yet, but track TSO
        if (!prop.timeSinceOverhaulHours || !prop.totalTimeHours) continue;
        // Use a conservative default TBO of 2000h for propellers if no explicit limit
        const propTboDefault = 2000;
        const remainingHours = propTboDefault - prop.timeSinceOverhaulHours;
        if (remainingHours > propTboDefault * 0.3) continue;

        const hoursPerDay = ac.averageDailyHours ?? 1.5;
        const daysRemaining = Math.ceil(remainingHours / hoursPerDay);
        const dueDate = now + daysRemaining * DAY_MS;
        if (dueDate > horizonEnd && remainingHours > 0) continue;

        const dueInDays = daysBetween(now, dueDate);
        events.push({
          dueKey: `prop-tbo:${prop._id}`,
          source: "propeller_tbo",
          aircraftId: ac._id,
          aircraftLabel: formatAircraftLabel(ac),
          title: `Prop TBO — ${prop.make} ${prop.model} (${prop.position})`,
          details: `${Math.round(remainingHours)}h remaining of ${propTboDefault}h TBO`,
          dueDate,
          dueInDays,
          intervalSummary: [`${Math.round(remainingHours)}h`],
          projectionDates: [dueDate],
          hasConflict: false,
          status: remainingHours <= 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
        });
      }

      // ── LLP approaching limits ─────────────────────────────────────────
      const llps = await ctx.db
        .query("parts")
        .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", ac._id))
        .collect();

      for (const part of llps) {
        if (!part.isLifeLimited) continue;

        // Hours-based LLP
        if (part.lifeLimitHours && part.lifeLimitHours > 0) {
          const hoursAccum = part.hoursAccumulatedBeforeInstall ?? 0;
          const hoursAtInstall = part.hoursAtInstallation ?? 0;
          // Estimate current hours: hours accumulated + (aircraft TTAF - TTAF at install)
          const currentPartHours = hoursAccum + Math.max(0, ac.totalTimeAirframeHours - hoursAtInstall);
          const remainingHours = part.lifeLimitHours - currentPartHours;
          const pctUsed = currentPartHours / part.lifeLimitHours;
          if (pctUsed < 0.7) continue; // Only flag when > 70% of life used

          const hoursPerDay = ac.averageDailyHours ?? 1.5;
          const daysRemaining = Math.ceil(remainingHours / hoursPerDay);
          const dueDate = now + daysRemaining * DAY_MS;
          if (dueDate > horizonEnd && remainingHours > 0) continue;

          const dueInDays = daysBetween(now, dueDate);
          events.push({
            dueKey: `llp-h:${part._id}`,
            source: "llp",
            aircraftId: ac._id,
            aircraftLabel: formatAircraftLabel(ac),
            title: `LLP — ${part.partName} (${part.partNumber})`,
            details: `${Math.round(remainingHours)}h remaining of ${part.lifeLimitHours}h life limit (${Math.round(pctUsed * 100)}% used)`,
            dueDate,
            dueInDays,
            intervalSummary: [`${Math.round(remainingHours)}h`],
            projectionDates: [dueDate],
            hasConflict: false,
            status: remainingHours <= 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
          });
        }

        // Cycles-based LLP
        if (part.lifeLimitCycles && part.lifeLimitCycles > 0) {
          const cyclesAccum = part.cyclesAccumulatedBeforeInstall ?? 0;
          const currentCycles = cyclesAccum + (ac.totalLandingCycles ?? 0);
          const remainingCycles = part.lifeLimitCycles - currentCycles;
          const pctUsed = currentCycles / part.lifeLimitCycles;
          if (pctUsed < 0.7) continue;

          const cyclesPerDay = ac.averageDailyCycles ?? 1;
          const daysRemaining = Math.ceil(remainingCycles / cyclesPerDay);
          const dueDate = now + daysRemaining * DAY_MS;
          if (dueDate > horizonEnd && remainingCycles > 0) continue;

          const dueInDays = daysBetween(now, dueDate);
          events.push({
            dueKey: `llp-c:${part._id}`,
            source: "llp",
            aircraftId: ac._id,
            aircraftLabel: formatAircraftLabel(ac),
            title: `LLP (cycles) — ${part.partName} (${part.partNumber})`,
            details: `${Math.round(remainingCycles)} cycles remaining of ${part.lifeLimitCycles} limit (${Math.round(pctUsed * 100)}% used)`,
            dueDate,
            dueInDays,
            intervalSummary: [`${Math.round(remainingCycles)}cy`],
            projectionDates: [dueDate],
            hasConflict: false,
            status: remainingCycles <= 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
          });
        }
      }
    }

    // ── Carry-forward items (open deferred maintenance) ────────────────
    const carryForwards = await ctx.db
      .query("carryForwardItems")
      .withIndex("by_org", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "open"),
      )
      .collect();

    for (const cfi of carryForwards) {
      const aircraftDoc = aircraftMap.get(String(cfi.aircraftId));
      if (!aircraftDoc) continue;
      // Carry-forward items don't have a due date — use creation date + urgency
      const urgencyDays = cfi.priority === "critical" ? 7 : cfi.priority === "high" ? 30 : 90;
      const dueDate = cfi.createdAt + urgencyDays * DAY_MS;
      if (dueDate > horizonEnd) continue;

      const dueInDays = daysBetween(now, dueDate);
      events.push({
        dueKey: `cfi:${cfi._id}`,
        source: "carry_forward",
        aircraftId: cfi.aircraftId,
        aircraftLabel: formatAircraftLabel(aircraftDoc),
        title: `Carry-forward: ${cfi.description.slice(0, 80)}`,
        details: `Priority: ${cfi.priority} • Category: ${cfi.category.replace(/_/g, " ")}`,
        dueDate,
        dueInDays,
        intervalSummary: [cfi.priority],
        projectionDates: [dueDate],
        hasConflict: false,
        status: dueInDays < 0 ? "overdue" : dueInDays <= 30 ? "due_soon" : "planned",
      });
    }

    // ── Sort all events ────────────────────────────────────────────────
    events.sort((a, b) => a.dueDate - b.dueDate);

    // ── Conflict / overlap detection ───────────────────────────────────
    for (let i = 0; i < events.length; i += 1) {
      const current = events[i];
      const neighbor = events.find(
        (candidate, idx) =>
          idx !== i &&
          candidate.aircraftId === current.aircraftId &&
          Math.abs(candidate.dueDate - current.dueDate) <= 3 * DAY_MS,
      );
      if (neighbor) {
        current.hasConflict = true;
        current.conflictReason = `Due window overlaps with ${neighbor.title}`;
      }
    }

    // ── Bundle scoring ─────────────────────────────────────────────────
    // For each pair of events on same aircraft within configurable window,
    // compute cost savings from combining (amortized setup/teardown, single induction)
    const bundleWindowDays = 14;
    const bundles: BundleRecommendation[] = [];
    const byAircraftEvents = new Map<string, DueEvent[]>();
    for (const ev of events) {
      const key = String(ev.aircraftId);
      const list = byAircraftEvents.get(key) ?? [];
      list.push(ev);
      byAircraftEvents.set(key, list);
    }

    for (const [acId, acEvents] of byAircraftEvents) {
      if (acEvents.length < 2) continue;
      // Find clusters of events within the bundle window
      const sorted = [...acEvents].sort((a, b) => a.dueDate - b.dueDate);
      let clusterStart = 0;
      while (clusterStart < sorted.length) {
        const cluster: DueEvent[] = [sorted[clusterStart]];
        let j = clusterStart + 1;
        while (j < sorted.length && sorted[j].dueDate - sorted[clusterStart].dueDate <= bundleWindowDays * DAY_MS) {
          cluster.push(sorted[j]);
          j++;
        }
        if (cluster.length >= 2) {
          // Savings estimate: each additional item saves ~15% of induction/setup cost
          const savingsPercent = Math.min(40, (cluster.length - 1) * 15);
          const earliest = cluster[0].dueDate;
          const latest = cluster[cluster.length - 1].dueDate;
          bundles.push({
            aircraftId: cluster[0].aircraftId,
            aircraftLabel: cluster[0].aircraftLabel,
            events: cluster.map((e) => ({ dueKey: e.dueKey, title: e.title, dueDate: e.dueDate })),
            windowStart: earliest,
            windowEnd: latest,
            estimatedSavingsPercent: savingsPercent,
            reason: `${cluster.length} items due within ${bundleWindowDays} days — combine for ~${savingsPercent}% savings on induction/setup`,
          });
        }
        clusterStart = j;
      }
    }

    const groups = {
      overdue: events.filter((e) => e.status === "overdue"),
      dueSoon: events.filter((e) => e.status === "due_soon"),
      planned: events.filter((e) => e.status === "planned"),
    };

    return {
      horizonDays,
      generatedAt: now,
      totals: {
        all: events.length,
        overdue: groups.overdue.length,
        dueSoon: groups.dueSoon.length,
        planned: groups.planned.length,
        withConflicts: events.filter((e) => e.hasConflict).length,
      },
      groups,
      events,
      bundles,
    };
  },
});

export const generateMonthlyPlan = mutation({
  args: {
    organizationId: v.id("organizations"),
    monthStart: v.number(),
    dueItems: v.array(
      v.object({
        dueKey: v.string(),
        aircraftId: v.id("aircraft"),
        title: v.string(),
        details: v.optional(v.string()),
        dueDate: v.number(),
        source: v.union(
          v.literal("maintenance_program"),
          v.literal("ad_compliance"),
          v.literal("ad_one_time"),
          v.literal("engine_tbo"),
          v.literal("propeller_tbo"),
          v.literal("llp"),
          v.literal("carry_forward"),
        ),
      }),
    ),
    planTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireSchedulingManager(ctx, {
      organizationId: args.organizationId,
      operation: "generate monthly plan",
    });

    if (args.dueItems.length === 0) {
      throw new Error("Select at least one due item to generate a monthly plan.");
    }

    const now = Date.now();
    const month = new Date(args.monthStart);
    const monthLabel = month.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const byAircraft = new Map<string, typeof args.dueItems>();
    for (const item of args.dueItems) {
      const key = String(item.aircraftId);
      const list = byAircraft.get(key) ?? [];
      list.push(item);
      byAircraft.set(key, list);
    }

    const created: Array<{ workOrderId: Id<"workOrders">; workOrderNumber: string; taskCardCount: number }> = [];

    for (const [aircraftIdKey, items] of byAircraft.entries()) {
      const aircraftId = aircraftIdKey as Id<"aircraft">;
      const aircraft = await ctx.db.get(aircraftId);
      if (!aircraft) continue;

      const workOrderNumber = await reserveNextWorkOrderNumber(ctx, args.organizationId, undefined);
      const workOrderId = await ctx.db.insert("workOrders", {
        workOrderNumber,
        organizationId: args.organizationId,
        shopLocationId: undefined,
        aircraftId,
        status: "draft",
        workOrderType: "routine",
        description: `Monthly due-list plan (${monthLabel})`,
        squawks: undefined,
        openedAt: now,
        openedByUserId: actor.userId,
        targetCompletionDate: items[0]?.dueDate,
        closedAt: undefined,
        closedByUserId: undefined,
        closedByTechnicianId: undefined,
        aircraftTotalTimeAtOpen: 0,
        aircraftTotalTimeAtClose: undefined,
        voidedByUserId: undefined,
        voidedAt: undefined,
        voidedReason: undefined,
        inductedAt: undefined,
        releasedAt: undefined,
        releasedByTechnicianId: undefined,
        customerSignatureAtRelease: undefined,
        pickupNotes: undefined,
        onHoldReason: undefined,
        onHoldSince: undefined,
        concurrentWorkOrderOverrideAcknowledged: undefined,
        concurrentWorkOrderReason: undefined,
        customerId: aircraft.customerId,
        priority: "routine",
        billingStatus: undefined,
        returnToServiceId: undefined,
        returnedToService: false,
        notes: `${args.planTitle ?? "Planner-generated monthly package"}\nSeeded from due-list workbench with ${items.length} item(s).`,
        promisedDeliveryDate: undefined,
        estimatedLaborHoursOverride: undefined,
        scheduledStartDate: args.monthStart,
        assignedRosterTeamId: undefined,
        aircraftSnapshotAtOpen: undefined,
        createdAt: now,
        updatedAt: now,
      });

      let taskCardCount = 0;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        await ctx.db.insert("taskCards", {
          workOrderId,
          aircraftId,
          organizationId: args.organizationId,
          taskCardNumber: `${workOrderNumber}-PLAN-${index + 1}`,
          title: item.title,
          taskType: item.source === "ad_compliance" || item.source === "ad_one_time"
            ? "ad_compliance"
            : item.source === "engine_tbo" || item.source === "propeller_tbo"
              ? "overhaul"
              : "inspection",
          approvedDataSource: "Due-list planning workbench",
          approvedDataRevision: undefined,
          assignedToTechnicianId: undefined,
          status: "not_started",
          startedAt: undefined,
          completedAt: undefined,
          notes: item.details,
          handoffNotes: undefined,
          estimatedHours: undefined,
          signingTechnicianId: undefined,
          signedAt: undefined,
          signedCertificateNumber: undefined,
          cardSignatureAuthEventId: undefined,
          inspectorTechnicianId: undefined,
          inspectorSignedAt: undefined,
          inspectorCertificateNumber: undefined,
          inspectorSignatureAuthEventId: undefined,
          rtsTechnicianId: undefined,
          rtsSignedAt: undefined,
          rtsCertificateNumber: undefined,
          rtsSignatureAuthEventId: undefined,
          requiredTraining: undefined,
          stepCount: 0,
          completedStepCount: 0,
          naStepCount: 0,
          aircraftSystem: undefined,
          isInspectionItem: true,
          isCustomerReported: false,
          createdAt: now,
          updatedAt: now,
        });
        taskCardCount += 1;
      }

      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_created",
        tableName: "workOrders",
        recordId: workOrderId,
        userId: actor.userId,
        technicianId: actor.technicianId,
        notes: `Monthly plan work order ${workOrderNumber} generated from due-list with ${taskCardCount} seeded task card(s).`,
        timestamp: now,
      });

      created.push({ workOrderId, workOrderNumber, taskCardCount });
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "system_event",
      tableName: "planningFromDueList",
      recordId: String(args.organizationId),
      userId: actor.userId,
      technicianId: actor.technicianId,
      notes: `Generated monthly due-list plan for ${monthLabel}. Work orders: ${created.length}. Items: ${args.dueItems.length}.`,
      timestamp: now,
    });

    return {
      createdWorkOrders: created,
      totalItems: args.dueItems.length,
      monthLabel,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// A2: OPTIMAL MAINTENANCE WINDOW RECOMMENDATIONS
//
// Pure TypeScript scoring algorithm, no external solver needed.
// For each due event, compute constraint window and group bundleable items.
// Score windows by: cost_savings * 0.35 + 1/deadline_urgency * 0.40 + mro_capacity * 0.25
// Returns top 3 recommended windows with full transparency breakdown.
// ═══════════════════════════════════════════════════════════════════════════

type WindowScore = {
  score: number;
  breakdown: {
    costSavingsScore: number;
    deadlineUrgencyScore: number;
    capacityScore: number;
  };
};

type MaintenanceWindow = {
  windowStart: number;
  windowEnd: number;
  dueEvents: { dueKey: string; title: string; source: string; dueDate: number }[];
  aircraftId: string;
  aircraftLabel: string;
  score: WindowScore;
  estimatedDurationDays: number;
  bundleSavingsPercent: number;
  constraints: string[];
};

export const getOptimalMaintenanceWindows = query({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    horizonDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const horizonDays = Math.max(14, Math.min(args.horizonDays ?? 180, 365));
    const horizonEnd = now + horizonDays * DAY_MS;

    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) return { windows: [], aircraftLabel: "Unknown" };
    const acLabel = formatAircraftLabel(aircraft);

    // Gather all due events for this aircraft using the same logic as dueListWorkbench
    // but simplified to a single aircraft
    const dueEvents: Array<{ dueKey: string; title: string; source: string; dueDate: number; estimatedDays: number }> = [];

    // Maintenance programs
    const typeTokens = getAircraftTypeTokens(aircraft);
    const programs = await ctx.db
      .query("maintenancePrograms")
      .withIndex("by_org", (q) => q.eq("organizationId", String(args.organizationId)))
      .collect();

    for (const program of programs) {
      if (!program.isActive) continue;
      if (!typeTokens.includes(program.aircraftType)) continue;

      let dueDate: number | null = null;
      if (program.calendarIntervalDays && program.calendarIntervalDays > 0) {
        dueDate = now + program.calendarIntervalDays * DAY_MS;
      }
      if (program.hourInterval && program.hourInterval > 0) {
        const hoursRemaining = program.hourInterval - (aircraft.totalTimeAirframeHours % program.hourInterval);
        const hoursPerDay = aircraft.averageDailyHours ?? 1.5;
        const hourDue = now + Math.ceil(hoursRemaining / hoursPerDay) * DAY_MS;
        dueDate = dueDate ? Math.min(dueDate, hourDue) : hourDue;
      }

      if (!dueDate || dueDate > horizonEnd) continue;
      dueEvents.push({
        dueKey: `mp:${program._id}`,
        title: program.taskName,
        source: "maintenance_program",
        dueDate,
        estimatedDays: 2, // default estimate for inspection
      });
    }

    // Engine TBO
    const engines = await ctx.db
      .query("engines")
      .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", args.aircraftId))
      .collect();

    for (const engine of engines) {
      if (!engine.timeBetweenOverhaulLimit || engine.timeBetweenOverhaulLimit <= 0) continue;
      const tsoHours = engine.timeSinceOverhaulHours ?? engine.totalTimeHours;
      const remainingHours = engine.timeBetweenOverhaulLimit - tsoHours;
      if (remainingHours > engine.timeBetweenOverhaulLimit * 0.3) continue;

      const hoursPerDay = aircraft.averageDailyHours ?? 1.5;
      const dueDate = now + Math.ceil(remainingHours / hoursPerDay) * DAY_MS;
      if (dueDate > horizonEnd && remainingHours > 0) continue;

      dueEvents.push({
        dueKey: `eng:${engine._id}`,
        title: `Engine TBO — ${engine.make} ${engine.model}`,
        source: "engine_tbo",
        dueDate,
        estimatedDays: 14, // overhaul typically takes 2 weeks
      });
    }

    // AD compliance (non-complied)
    const adRows = await ctx.db
      .query("adCompliance")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("complianceStatus", "not_complied"),
      )
      .collect();

    for (const row of adRows) {
      if (String(row.aircraftId) !== String(args.aircraftId)) continue;
      const dueDate = row.nextDueDate ?? now;
      if (dueDate > horizonEnd) continue;
      const ad = await ctx.db.get(row.adId);
      dueEvents.push({
        dueKey: `ad:${row._id}`,
        title: `AD ${ad?.adNumber ?? "?"} — ${ad?.title ?? ""}`.trim(),
        source: "ad_one_time",
        dueDate,
        estimatedDays: 3,
      });
    }

    // Carry-forward items
    const cfis = await ctx.db
      .query("carryForwardItems")
      .withIndex("by_aircraft", (q) =>
        q.eq("aircraftId", args.aircraftId).eq("status", "open"),
      )
      .collect();

    for (const cfi of cfis) {
      const urgencyDays = cfi.priority === "critical" ? 7 : cfi.priority === "high" ? 30 : 90;
      const dueDate = cfi.createdAt + urgencyDays * DAY_MS;
      if (dueDate > horizonEnd) continue;
      dueEvents.push({
        dueKey: `cfi:${cfi._id}`,
        title: cfi.description.slice(0, 80),
        source: "carry_forward",
        dueDate,
        estimatedDays: 1,
      });
    }

    if (dueEvents.length === 0) return { windows: [], aircraftLabel: acLabel };

    // Sort by due date
    dueEvents.sort((a, b) => a.dueDate - b.dueDate);

    // Group events with overlapping windows (bundleable)
    const bundleWindowMs = 14 * DAY_MS;
    const clusters: Array<typeof dueEvents> = [];
    let currentCluster: typeof dueEvents = [dueEvents[0]];

    for (let i = 1; i < dueEvents.length; i++) {
      if (dueEvents[i].dueDate - currentCluster[0].dueDate <= bundleWindowMs) {
        currentCluster.push(dueEvents[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [dueEvents[i]];
      }
    }
    clusters.push(currentCluster);

    // Get MRO capacity utilization for scoring
    // (simplified — uses schedule assignment count as a proxy)
    const assignments = await ctx.db
      .query("scheduleAssignments")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeAssignments = assignments.filter(
      (a) => !a.archivedAt && a.endDate > now,
    );

    // Score each cluster as a potential maintenance window
    const windows: MaintenanceWindow[] = [];

    for (const cluster of clusters) {
      const earliestDue = cluster[0].dueDate;
      const latestDue = cluster[cluster.length - 1].dueDate;
      const totalEstDays = cluster.reduce((sum, e) => sum + e.estimatedDays, 0);
      // Parallelize some work: effective duration is reduced for bundled work
      const effectiveDays = Math.max(
        Math.max(...cluster.map((e) => e.estimatedDays)),
        Math.ceil(totalEstDays * 0.7),
      );

      // Try 3 candidate start dates: ASAP, midpoint, latest safe
      const partsLeadBuffer = 7 * DAY_MS; // 7 day buffer for parts
      const candidateStarts = [
        Math.max(now + partsLeadBuffer, earliestDue - 30 * DAY_MS),
        Math.max(now + partsLeadBuffer, earliestDue - 14 * DAY_MS),
        Math.max(now + partsLeadBuffer, earliestDue - effectiveDays * DAY_MS),
      ];

      for (const startDate of candidateStarts) {
        const endDate = startDate + effectiveDays * DAY_MS;
        const bundleSavings = cluster.length >= 2 ? Math.min(40, (cluster.length - 1) * 15) : 0;

        // Deadline urgency: how many items would be overdue by the time we finish?
        const overdueCount = cluster.filter((e) => endDate > e.dueDate).length;
        const deadlineUrgencyScore = 1 - (overdueCount / cluster.length);

        // Cost savings from bundling
        const costSavingsScore = bundleSavings / 40; // normalize to 0-1

        // Capacity availability: fewer overlapping assignments = better
        const overlapping = activeAssignments.filter(
          (a) => a.startDate < endDate && a.endDate > startDate,
        ).length;
        const maxOverlap = Math.max(1, activeAssignments.length);
        const capacityScore = 1 - Math.min(1, overlapping / maxOverlap);

        const score = costSavingsScore * 0.35 + deadlineUrgencyScore * 0.40 + capacityScore * 0.25;

        const constraints: string[] = [];
        if (overdueCount > 0) {
          constraints.push(`${overdueCount} item(s) would be past due date at window end`);
        }
        if (overlapping > 0) {
          constraints.push(`${overlapping} other WO(s) overlap this window`);
        }
        if (cluster.length >= 2) {
          constraints.push(`Bundle ${cluster.length} items for ~${bundleSavings}% setup savings`);
        }

        windows.push({
          windowStart: startDate,
          windowEnd: endDate,
          dueEvents: cluster.map((e) => ({
            dueKey: e.dueKey,
            title: e.title,
            source: e.source,
            dueDate: e.dueDate,
          })),
          aircraftId: String(args.aircraftId),
          aircraftLabel: acLabel,
          score: {
            score: Math.round(score * 1000) / 1000,
            breakdown: {
              costSavingsScore: Math.round(costSavingsScore * 1000) / 1000,
              deadlineUrgencyScore: Math.round(deadlineUrgencyScore * 1000) / 1000,
              capacityScore: Math.round(capacityScore * 1000) / 1000,
            },
          },
          estimatedDurationDays: effectiveDays,
          bundleSavingsPercent: bundleSavings,
          constraints,
        });
      }
    }

    // Sort by score descending and return top 3
    windows.sort((a, b) => b.score.score - a.score.score);

    return {
      windows: windows.slice(0, 3),
      aircraftLabel: acLabel,
      totalDueEvents: dueEvents.length,
    };
  },
});
