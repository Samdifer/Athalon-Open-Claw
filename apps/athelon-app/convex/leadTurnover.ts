import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const leadEntityTypeValidator = v.union(
  v.literal("work_order"),
  v.literal("task_card"),
  v.literal("task_step"),
);

const ACTIVE_WO_STATUSES = new Set([
  "open",
  "in_progress",
  "pending_inspection",
  "pending_signoff",
  "on_hold",
  "open_discrepancies",
]);

const ACTIVE_TASK_CARD_STATUSES = new Set([
  "not_started",
  "in_progress",
  "incomplete_na_steps",
]);

const LEAD_ENABLED_ROLES = new Set([
  "lead_technician",
  "shop_manager",
  "admin",
]);

function normalizeReportDate(input?: string): string {
  const raw = input?.trim();
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Invalid reportDate "${input}". Expected YYYY-MM-DD.`);
  }
  return raw;
}

function reportDateWindow(reportDate: string): { startAt: number; endAt: number } {
  const startAt = new Date(`${reportDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(startAt)) {
    throw new Error(`Invalid reportDate "${reportDate}".`);
  }
  return { startAt, endAt: startAt + 24 * 60 * 60 * 1000 };
}

function minutesWithinWindow(
  entry: { clockInAt: number; clockOutAt?: number },
  startAt: number,
  endAt: number,
  now: number,
): number {
  const entryStart = entry.clockInAt;
  const entryEnd = entry.clockOutAt ?? now;
  const overlapStart = Math.max(startAt, entryStart);
  const overlapEnd = Math.min(endAt, entryEnd);
  if (overlapEnd <= overlapStart) return 0;
  return Math.max(0, Math.round((overlapEnd - overlapStart) / 60_000));
}

async function requireCaller(ctx: any, organizationId: Id<"organizations">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Sign in required.");

  const callerTech = await ctx.db
    .query("technicians")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .filter((q: any) => q.eq(q.field("userId"), identity.subject))
    .first();

  if (!callerTech) {
    throw new Error(
      `No technician profile found for your account in organization ${organizationId}.`,
    );
  }
  if (callerTech.status !== "active") {
    throw new Error(
      `Technician profile ${callerTech._id} is not active (status: ${callerTech.status}).`,
    );
  }

  return { callerUserId: identity.subject, callerTech };
}

function requireLeadRole(role?: string) {
  if (!role || !LEAD_ENABLED_ROLES.has(role)) {
    throw new Error(
      "ACCESS_DENIED: Lead workspace requires lead_technician, shop_manager, or admin role.",
    );
  }
}

async function getEntityAssignment(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    entityType: "work_order" | "task_card" | "task_step";
    workOrderId?: Id<"workOrders">;
    taskCardId?: Id<"taskCards">;
    taskStepId?: Id<"taskCardSteps">;
  },
) {
  if (args.entityType === "work_order") {
    const rows = await ctx.db
      .query("leadAssignments")
      .withIndex("by_org_work_order", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("workOrderId", args.workOrderId),
      )
      .collect();
    return rows.find((row: any) => row.entityType === "work_order" && row.isActive) ?? null;
  }

  if (args.entityType === "task_card") {
    const rows = await ctx.db
      .query("leadAssignments")
      .withIndex("by_org_task_card", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("taskCardId", args.taskCardId),
      )
      .collect();
    return rows.find((row: any) => row.entityType === "task_card" && row.isActive) ?? null;
  }

  const rows = await ctx.db
    .query("leadAssignments")
    .withIndex("by_org_task_step", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("taskStepId", args.taskStepId),
    )
    .collect();
  return rows.find((row: any) => row.entityType === "task_step" && row.isActive) ?? null;
}

function buildTurnoverSummary(args: {
  reportDate: string;
  totalMinutes: number;
  workOrderMinutes: number;
  selectedWorkOrders: string[];
  personBreakdown: Array<{ technicianName: string; minutes: number }>;
}): string {
  const totalHours = (args.totalMinutes / 60).toFixed(2);
  const woHours = (args.workOrderMinutes / 60).toFixed(2);
  const topPeople = [...args.personBreakdown]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3)
    .map((p) => `${p.technicianName} (${(p.minutes / 60).toFixed(2)}h)`);

  const woText =
    args.selectedWorkOrders.length > 0
      ? args.selectedWorkOrders.join(", ")
      : "No work orders selected";

  const peopleText = topPeople.length > 0 ? topPeople.join("; ") : "No technician time logged";

  return [
    `Turnover ${args.reportDate}: ${totalHours} total labor hours logged.`,
    `${woHours} hours were tied to work-order execution.`,
    `Primary work orders: ${woText}.`,
    `Top contributors: ${peopleText}.`,
  ].join(" ");
}

export const getLeadWorkspace = query({
  args: {
    organizationId: v.id("organizations"),
    reportDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { callerTech } = await requireCaller(ctx, args.organizationId);
    requireLeadRole(callerTech.role);

    const reportDate = normalizeReportDate(args.reportDate);
    const { startAt, endAt } = reportDateWindow(reportDate);
    const now = Date.now();

    const technicians = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    const technicianById = new Map<string, any>(
      technicians.map((tech: any) => [String(tech._id), tech]),
    );

    const allWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const activeWorkOrders = allWorkOrders
      .filter((wo: any) => ACTIVE_WO_STATUSES.has(wo.status))
      .sort((a: any, b: any) => {
        const aPromised = a.promisedDeliveryDate ?? Number.MAX_SAFE_INTEGER;
        const bPromised = b.promisedDeliveryDate ?? Number.MAX_SAFE_INTEGER;
        if (aPromised !== bPromised) return aPromised - bPromised;
        return a.workOrderNumber.localeCompare(b.workOrderNumber);
      });

    const taskCards: any[] = [];
    const taskSteps: any[] = [];
    for (const wo of activeWorkOrders) {
      const cards = await ctx.db
        .query("taskCards")
        .withIndex("by_work_order", (q: any) => q.eq("workOrderId", wo._id))
        .collect();

      for (const card of cards) {
        if (!ACTIVE_TASK_CARD_STATUSES.has(card.status)) continue;
        const steps = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q: any) => q.eq("taskCardId", card._id))
          .collect();
        const pendingStepRows = steps.filter((step: any) => step.status === "pending");
        const pendingSteps = pendingStepRows.length;

        for (const step of pendingStepRows) {
          taskSteps.push({
            _id: step._id,
            taskCardId: card._id,
            taskCardNumber: card.taskCardNumber,
            stepNumber: step.stepNumber,
            description: step.description,
            workOrderId: wo._id,
            workOrderNumber: wo.workOrderNumber,
            estimatedMinutes: null,
            assignedToTechnicianId: card.assignedToTechnicianId ?? null,
            assignedToName: card.assignedToTechnicianId
              ? technicianById.get(String(card.assignedToTechnicianId))?.legalName ?? "Unknown"
              : null,
          });
        }

        taskCards.push({
          ...card,
          workOrderNumber: wo.workOrderNumber,
          workOrderPromisedDeliveryDate: wo.promisedDeliveryDate,
          pendingSteps,
          totalSteps: steps.length,
          assignedToName: card.assignedToTechnicianId
            ? technicianById.get(String(card.assignedToTechnicianId))?.legalName ?? "Unknown"
            : null,
        });
      }
    }

    const assignmentRows = await ctx.db
      .query("leadAssignments")
      .withIndex("by_org_entity", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const activeAssignments = assignmentRows.filter((row: any) => row.isActive);

    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();

    const dayEntries = timeEntries
      .map((entry: any) => ({
        ...entry,
        overlapMinutes: minutesWithinWindow(entry, startAt, endAt, now),
      }))
      .filter((entry: any) => entry.overlapMinutes > 0);

    const minutesByTechnician = new Map<string, number>();
    const minutesByWorkOrder = new Map<string, number>();
    let totalMinutes = 0;
    let workOrderMinutes = 0;

    for (const entry of dayEntries) {
      totalMinutes += entry.overlapMinutes;
      const techKey = String(entry.technicianId);
      minutesByTechnician.set(
        techKey,
        (minutesByTechnician.get(techKey) ?? 0) + entry.overlapMinutes,
      );
      if (entry.workOrderId) {
        workOrderMinutes += entry.overlapMinutes;
        const woKey = String(entry.workOrderId);
        minutesByWorkOrder.set(woKey, (minutesByWorkOrder.get(woKey) ?? 0) + entry.overlapMinutes);
      }
    }

    const personBreakdown = Array.from(minutesByTechnician.entries())
      .map(([technicianId, minutes]) => ({
        technicianId,
        technicianName: technicianById.get(technicianId)?.legalName ?? "Unknown",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const teamInsightMap = new Map<string, {
      teamName: string;
      assignmentCount: number;
      workOrderCount: number;
      assignedMinutes: number;
      technicians: Set<string>;
    }>();

    for (const assignment of activeAssignments) {
      const teamName = assignment.assignedTeamName?.trim() || "Unassigned Team";
      const key = teamName.toLowerCase();
      const row = teamInsightMap.get(key) ?? {
        teamName,
        assignmentCount: 0,
        workOrderCount: 0,
        assignedMinutes: 0,
        technicians: new Set<string>(),
      };

      row.assignmentCount += 1;
      if (assignment.workOrderId) {
        row.workOrderCount += 1;
        row.assignedMinutes += minutesByWorkOrder.get(String(assignment.workOrderId)) ?? 0;
      }
      if (assignment.assignedToTechnicianId) {
        const techName =
          technicianById.get(String(assignment.assignedToTechnicianId))?.legalName ?? "Unknown";
        row.technicians.add(techName);
      }
      teamInsightMap.set(key, row);
    }

    const teamInsights = Array.from(teamInsightMap.values())
      .map((row) => ({
        teamName: row.teamName,
        assignmentCount: row.assignmentCount,
        workOrderCount: row.workOrderCount,
        assignedMinutes: row.assignedMinutes,
        technicianCount: row.technicians.size,
      }))
      .sort((a, b) => b.assignedMinutes - a.assignedMinutes);

    const reportsForDate = await ctx.db
      .query("turnoverReports")
      .withIndex("by_org_date", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("reportDate", reportDate),
      )
      .collect();

    const currentReport =
      [...reportsForDate].sort((a: any, b: any) => {
        if (a.status !== b.status) {
          return a.status === "submitted" ? -1 : 1;
        }
        return (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0);
      })[0] ?? null;

    const submittedReports = await ctx.db
      .query("turnoverReports")
      .withIndex("by_org_status", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("status", "submitted"),
      )
      .collect();

    const history = submittedReports
      .sort((a: any, b: any) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))
      .slice(0, 20)
      .map((row: any) => ({
        _id: row._id,
        reportDate: row.reportDate,
        submittedAt: row.submittedAt,
        leadTechnicianId: row.leadTechnicianId,
        leadName: technicianById.get(String(row.leadTechnicianId))?.legalName ?? "Unknown",
        timeAppliedMinutes: row.timeAppliedMinutes,
        shopWorkOrderMinutes: row.shopWorkOrderMinutes,
        selectedWorkOrderCount: row.selectedWorkOrderIds.length,
      }));

    const autoSelectedWorkOrders = activeWorkOrders
      .filter((wo: any) => (minutesByWorkOrder.get(String(wo._id)) ?? 0) > 0)
      .slice(0, 6)
      .map((wo: any) => wo.workOrderNumber);

    const aiDraftSummary = buildTurnoverSummary({
      reportDate,
      totalMinutes,
      workOrderMinutes,
      selectedWorkOrders: autoSelectedWorkOrders,
      personBreakdown,
    });

    return {
      reportDate,
      windowStartAt: startAt,
      windowEndAt: endAt,
      caller: {
        technicianId: callerTech._id,
        legalName: callerTech.legalName,
        role: callerTech.role ?? "unassigned",
      },
      technicians: technicians
        .map((tech: any) => ({
          _id: tech._id,
          legalName: tech.legalName,
          role: tech.role ?? "unassigned",
        }))
        .sort((a: any, b: any) => a.legalName.localeCompare(b.legalName)),
      workOrders: activeWorkOrders.map((wo: any) => ({
        _id: wo._id,
        workOrderNumber: wo.workOrderNumber,
        description: wo.description,
        status: wo.status,
        promisedDeliveryDate: wo.promisedDeliveryDate,
        targetCompletionDate: wo.targetCompletionDate,
        assignedMinutesToday: minutesByWorkOrder.get(String(wo._id)) ?? 0,
      })),
      taskCards: taskCards.sort((a, b) => {
        if (a.workOrderNumber !== b.workOrderNumber) {
          return a.workOrderNumber.localeCompare(b.workOrderNumber);
        }
        return a.taskCardNumber.localeCompare(b.taskCardNumber);
      }),
      taskSteps: taskSteps.sort((a, b) => {
        if (a.workOrderNumber !== b.workOrderNumber) {
          return a.workOrderNumber.localeCompare(b.workOrderNumber);
        }
        if (a.taskCardNumber !== b.taskCardNumber) {
          return a.taskCardNumber.localeCompare(b.taskCardNumber);
        }
        return (a.stepNumber ?? 0) - (b.stepNumber ?? 0);
      }),
      assignments: activeAssignments,
      teamInsights,
      dayMetrics: {
        totalMinutes,
        workOrderMinutes,
        personBreakdown,
        minutesByWorkOrder: Object.fromEntries(minutesByWorkOrder),
      },
      report: currentReport,
      aiDraftSummary,
      history,
    };
  },
});

export const assignEntity = mutation({
  args: {
    organizationId: v.id("organizations"),
    entityType: leadEntityTypeValidator,
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    assignedTeamName: v.optional(v.string()),
    assignmentNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { callerUserId, callerTech } = await requireCaller(ctx, args.organizationId);
    requireLeadRole(callerTech.role);

    let workOrderId = args.workOrderId;
    let taskCardId = args.taskCardId;
    let taskStepId = args.taskStepId;

    if (args.entityType === "work_order") {
      if (!workOrderId) throw new Error("workOrderId is required for entityType=work_order.");
      const wo = await ctx.db.get(workOrderId);
      if (!wo || wo.organizationId !== args.organizationId) {
        throw new Error(`Work order ${workOrderId} not found in this organization.`);
      }
      taskCardId = undefined;
      taskStepId = undefined;
    } else if (args.entityType === "task_card") {
      if (!taskCardId) throw new Error("taskCardId is required for entityType=task_card.");
      const card = await ctx.db.get(taskCardId);
      if (!card || card.organizationId !== args.organizationId) {
        throw new Error(`Task card ${taskCardId} not found in this organization.`);
      }
      workOrderId = card.workOrderId;
      taskStepId = undefined;
    } else {
      if (!taskStepId) throw new Error("taskStepId is required for entityType=task_step.");
      const step = await ctx.db.get(taskStepId);
      if (!step || step.organizationId !== args.organizationId) {
        throw new Error(`Task step ${taskStepId} not found in this organization.`);
      }
      workOrderId = step.workOrderId;
      taskCardId = step.taskCardId;
    }

    let assigneeName = "Unassigned";
    if (args.assignedToTechnicianId) {
      const assignee = await ctx.db.get(args.assignedToTechnicianId);
      if (!assignee || assignee.organizationId !== args.organizationId) {
        throw new Error(`Assigned technician ${args.assignedToTechnicianId} not found in this organization.`);
      }
      if (assignee.status !== "active") {
        throw new Error(`Assigned technician ${assignee.legalName} is not active.`);
      }
      assigneeName = assignee.legalName;
    }

    const existing = await getEntityAssignment(ctx, {
      organizationId: args.organizationId,
      entityType: args.entityType,
      workOrderId,
      taskCardId,
      taskStepId,
    });

    const payload = {
      organizationId: args.organizationId,
      entityType: args.entityType,
      workOrderId,
      taskCardId,
      taskStepId,
      assignedToTechnicianId: args.assignedToTechnicianId,
      assignedTeamName: args.assignedTeamName?.trim() || undefined,
      assignmentNote: args.assignmentNote?.trim() || undefined,
      assignedByTechnicianId: callerTech._id,
      isActive: true,
      assignedAt: now,
      updatedAt: now,
    };

    let assignmentId: Id<"leadAssignments">;
    if (existing) {
      assignmentId = existing._id;
      await ctx.db.patch(existing._id, payload);
    } else {
      assignmentId = await ctx.db.insert("leadAssignments", payload);
    }

    if (args.entityType === "task_card" && taskCardId) {
      await ctx.db.patch(taskCardId, {
        assignedToTechnicianId: args.assignedToTechnicianId,
        updatedAt: now,
      });
    }

    if (args.assignedToTechnicianId) {
      const assignee = await ctx.db.get(args.assignedToTechnicianId);
      if (assignee?.userId) {
        await ctx.db.insert("notifications", {
          organizationId: args.organizationId,
          recipientUserId: assignee.userId,
          type: "assignment",
          title: "New assignment",
          message:
            args.entityType === "work_order"
              ? `You were assigned to work order ${workOrderId}.`
              : args.entityType === "task_card"
                ? `You were assigned to task card ${taskCardId}.`
                : `You were assigned to task step ${taskStepId}.`,
          linkTo:
            args.entityType === "work_order" && workOrderId
              ? `/work-orders/${workOrderId}`
              : args.entityType === "task_card" && workOrderId && taskCardId
                ? `/work-orders/${workOrderId}/tasks/${taskCardId}`
                : undefined,
          read: false,
          createdAt: now,
        });
      }
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "leadAssignments",
      recordId: assignmentId,
      userId: callerUserId,
      technicianId: callerTech._id,
      notes:
        `Lead assignment updated for ${args.entityType}. ` +
        `Assignee: ${assigneeName}. Team: ${args.assignedTeamName ?? "—"}.`,
      timestamp: now,
    });

    return { assignmentId };
  },
});

export const upsertTurnoverDraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    reportDate: v.string(),
    selectedWorkOrderIds: v.array(v.id("workOrders")),
    summaryText: v.optional(v.string()),
    aiDraftSummary: v.optional(v.string()),
    leadNotes: v.optional(v.string()),
    upcomingDeadlinesNotes: v.optional(v.string()),
    partsOrderedSummary: v.optional(v.string()),
    partsReceivedSummary: v.optional(v.string()),
    workOrderNotes: v.optional(v.array(v.object({
      workOrderId: v.id("workOrders"),
      notes: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { callerUserId, callerTech } = await requireCaller(ctx, args.organizationId);
    requireLeadRole(callerTech.role);

    const reportDate = normalizeReportDate(args.reportDate);
    const { startAt, endAt } = reportDateWindow(reportDate);

    const validatedWorkOrders: any[] = [];
    for (const workOrderId of args.selectedWorkOrderIds) {
      const wo = await ctx.db.get(workOrderId);
      if (!wo || wo.organizationId !== args.organizationId) {
        throw new Error(`Work order ${workOrderId} not found in this organization.`);
      }
      validatedWorkOrders.push(wo);
    }
    const workOrderById = new Map<string, any>(
      validatedWorkOrders.map((wo: any) => [String(wo._id), wo]),
    );

    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();

    const entriesForWindow = timeEntries
      .map((entry: any) => ({
        ...entry,
        overlapMinutes: minutesWithinWindow(entry, startAt, endAt, now),
      }))
      .filter((entry: any) => entry.overlapMinutes > 0);

    const minutesByTechnician = new Map<string, number>();
    const minutesByWorkOrder = new Map<string, number>();
    let timeAppliedMinutes = 0;
    let shopWorkOrderMinutes = 0;

    for (const entry of entriesForWindow) {
      timeAppliedMinutes += entry.overlapMinutes;

      const techKey = String(entry.technicianId);
      minutesByTechnician.set(
        techKey,
        (minutesByTechnician.get(techKey) ?? 0) + entry.overlapMinutes,
      );

      if (entry.workOrderId) {
        shopWorkOrderMinutes += entry.overlapMinutes;
        const woKey = String(entry.workOrderId);
        minutesByWorkOrder.set(woKey, (minutesByWorkOrder.get(woKey) ?? 0) + entry.overlapMinutes);
      }
    }

    const techRows = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const techById = new Map<string, any>(techRows.map((row: any) => [String(row._id), row]));

    const personBreakdown = Array.from(minutesByTechnician.entries())
      .map(([technicianId, minutes]) => ({
        technicianId: techById.get(technicianId)?._id,
        technicianName: techById.get(technicianId)?.legalName ?? "Unknown",
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const assignmentRows = await ctx.db
      .query("leadAssignments")
      .withIndex("by_org_entity", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const teamByWorkOrder = new Map<string, string>();
    for (const assignment of assignmentRows) {
      if (!assignment.isActive || assignment.entityType !== "work_order" || !assignment.workOrderId) {
        continue;
      }
      teamByWorkOrder.set(
        String(assignment.workOrderId),
        assignment.assignedTeamName ?? "Unassigned Team",
      );
    }

    const teamMinutes = new Map<string, number>();
    for (const [woId, minutes] of minutesByWorkOrder.entries()) {
      const teamName = teamByWorkOrder.get(woId) ?? "Unassigned Team";
      teamMinutes.set(teamName, (teamMinutes.get(teamName) ?? 0) + minutes);
    }

    const teamBreakdown = Array.from(teamMinutes.entries())
      .map(([teamName, minutes]) => ({ teamName, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const normalizedWorkOrderNotes = (args.workOrderNotes ?? [])
      .filter((row) => workOrderById.has(String(row.workOrderId)))
      .map((row) => ({
        workOrderId: row.workOrderId,
        workOrderNumber: workOrderById.get(String(row.workOrderId))?.workOrderNumber ?? "—",
        notes: row.notes?.trim() || undefined,
      }));

    const fallbackAiDraft = buildTurnoverSummary({
      reportDate,
      totalMinutes: timeAppliedMinutes,
      workOrderMinutes: shopWorkOrderMinutes,
      selectedWorkOrders: validatedWorkOrders.map((wo: any) => wo.workOrderNumber),
      personBreakdown: personBreakdown.map((row) => ({
        technicianName: row.technicianName,
        minutes: row.minutes,
      })),
    });

    const reportsForDate = await ctx.db
      .query("turnoverReports")
      .withIndex("by_org_date", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("reportDate", reportDate),
      )
      .collect();

    const existingSubmitted = reportsForDate.find((row: any) => row.status === "submitted");
    if (existingSubmitted) {
      throw new Error(
        `Report ${existingSubmitted._id} is already submitted for ${reportDate} and is immutable.`,
      );
    }

    const existingDraft = reportsForDate.find((row: any) => row.status === "draft");

    const payload = {
      reportDate,
      windowStartAt: startAt,
      windowEndAt: endAt,
      status: "draft" as const,
      leadTechnicianId: callerTech._id,
      selectedWorkOrderIds: args.selectedWorkOrderIds,
      summaryText: args.summaryText?.trim() || undefined,
      aiDraftSummary: args.aiDraftSummary?.trim() || fallbackAiDraft,
      leadNotes: args.leadNotes?.trim() || undefined,
      upcomingDeadlinesNotes: args.upcomingDeadlinesNotes?.trim() || undefined,
      partsOrderedSummary: args.partsOrderedSummary?.trim() || undefined,
      partsReceivedSummary: args.partsReceivedSummary?.trim() || undefined,
      timeAppliedMinutes,
      shopWorkOrderMinutes,
      personBreakdown,
      teamBreakdown,
      workOrderNotes: normalizedWorkOrderNotes,
      updatedAt: now,
    };

    let reportId: Id<"turnoverReports">;
    if (existingDraft) {
      reportId = existingDraft._id;
      await ctx.db.patch(existingDraft._id, payload);
    } else {
      reportId = await ctx.db.insert("turnoverReports", {
        organizationId: args.organizationId,
        createdAt: now,
        ...payload,
      });
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "turnoverReports",
      recordId: reportId,
      userId: callerUserId,
      technicianId: callerTech._id,
      notes: `Turnover report draft saved for ${reportDate}.`,
      timestamp: now,
    });

    return { reportId, status: "draft" as const };
  },
});

export const submitTurnoverReport = mutation({
  args: {
    organizationId: v.id("organizations"),
    reportId: v.id("turnoverReports"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { callerUserId, callerTech } = await requireCaller(ctx, args.organizationId);
    requireLeadRole(callerTech.role);

    const report = await ctx.db.get(args.reportId);
    if (!report || report.organizationId !== args.organizationId) {
      throw new Error(`Turnover report ${args.reportId} not found in this organization.`);
    }
    if (report.status === "submitted") {
      throw new Error("Report is already submitted and cannot be altered.");
    }

    await ctx.db.patch(args.reportId, {
      status: "submitted",
      submittedAt: now,
      submittedByTechnicianId: callerTech._id,
      submissionSignature: {
        signedName: callerTech.legalName,
        signedRole: callerTech.role,
        signedAt: now,
      },
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "turnoverReports",
      recordId: args.reportId,
      userId: callerUserId,
      technicianId: callerTech._id,
      fieldName: "status",
      oldValue: JSON.stringify("draft"),
      newValue: JSON.stringify("submitted"),
      notes: `Turnover report ${args.reportId} submitted.`,
      timestamp: now,
    });

    return { reportId: args.reportId, submittedAt: now };
  },
});
