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

type DueSource = "maintenance_program" | "ad_compliance";

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
    }

    events.sort((a, b) => a.dueDate - b.dueDate);

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
        source: v.union(v.literal("maintenance_program"), v.literal("ad_compliance")),
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
          taskType: item.source === "ad_compliance" ? "ad_compliance" : "inspection",
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
