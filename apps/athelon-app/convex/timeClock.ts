// convex/timeClock.ts
// Athelon — Aviation MRO SaaS Platform
//
// Unified time tracking APIs:
// - Context-aware timers (shop / WO / task / step)
// - Pause/resume with server-side segment persistence
// - Manual correction entry flows
// - Legacy compatibility wrappers (clockIn/clockOut)

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

const entryTypeValidator = v.union(
  v.literal("shift"),
  v.literal("shop"),
  v.literal("work_order"),
  v.literal("task"),
  v.literal("step"),
  v.literal("break"),
  v.literal("admin"),
);

const billingClassValidator = v.union(
  v.literal("billable"),
  v.literal("non_billable"),
  v.literal("warranty"),
  v.literal("internal"),
  v.literal("absorbed"),
);

const approvalStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

type TimerEntryType =
  | "shift"
  | "shop"
  | "work_order"
  | "task"
  | "step"
  | "break"
  | "admin";

type BillingClass =
  | "billable"
  | "non_billable"
  | "warranty"
  | "internal"
  | "absorbed";

type ApprovalStatus = "pending" | "approved" | "rejected";

type TimerContext = {
  entryType: TimerEntryType;
  workOrderId?: Id<"workOrders">;
  taskCardId?: Id<"taskCards">;
  taskStepId?: Id<"taskCardSteps">;
  shopActivityCode?: string;
};

function minutesFromMs(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000));
}

function defaultBillingClassForEntryType(entryType: TimerEntryType): BillingClass {
  switch (entryType) {
    case "work_order":
    case "task":
    case "step":
      return "billable";
    default:
      return "internal";
  }
}

function overlapExists(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

async function writeTimeAudit(
  ctx: any,
  args: {
    orgId: Id<"organizations">;
    userId: string;
    technicianId: Id<"technicians">;
    recordId: Id<"timeEntries">;
    eventType: "record_created" | "record_updated" | "correction_created";
    notes: string;
  },
): Promise<void> {
  await ctx.db.insert("auditLog", {
    organizationId: args.orgId,
    eventType: args.eventType,
    tableName: "timeEntries",
    recordId: args.recordId,
    userId: args.userId,
    technicianId: args.technicianId,
    notes: args.notes,
    timestamp: Date.now(),
  });
}

async function assertOrgAndTech(
  ctx: any,
  orgId: Id<"organizations">,
  technicianId: Id<"technicians">,
): Promise<{ org: any; tech: any }> {
  const org = await ctx.db.get(orgId);
  if (!org || !org.active) {
    throw new Error(`Organization ${orgId} not found or inactive.`);
  }

  const tech = await ctx.db.get(technicianId);
  if (!tech) {
    throw new Error(`Technician ${technicianId} not found.`);
  }
  if (tech.organizationId !== orgId) {
    throw new Error(
      `Technician ${technicianId} does not belong to organization ${orgId}.`,
    );
  }
  if (tech.status !== "active") {
    throw new Error(
      `Technician ${technicianId} is not active (status: ${tech.status}).`,
    );
  }

  return { org, tech };
}

async function validateTimerContextLineage(
  ctx: any,
  orgId: Id<"organizations">,
  context: TimerContext,
): Promise<void> {
  const isWorkScoped =
    context.entryType === "work_order" ||
    context.entryType === "task" ||
    context.entryType === "step";

  if (!isWorkScoped) {
    if (context.workOrderId || context.taskCardId || context.taskStepId) {
      throw new Error(
        `entryType "${context.entryType}" cannot include work-order/task/step context fields.`,
      );
    }
    return;
  }

  if (!context.workOrderId) {
    throw new Error(`entryType "${context.entryType}" requires workOrderId.`);
  }

  const wo = await ctx.db.get(context.workOrderId);
  if (!wo) {
    throw new Error(`Work order ${context.workOrderId} not found.`);
  }
  if (wo.organizationId !== orgId) {
    throw new Error(`Work order ${context.workOrderId} does not belong to organization ${orgId}.`);
  }
  if (wo.status === "closed" || wo.status === "cancelled" || wo.status === "voided") {
    throw new Error(
      `Cannot create timer on work order ${context.workOrderId} with status "${wo.status}".`,
    );
  }

  if (context.entryType === "task" || context.entryType === "step") {
    if (!context.taskCardId) {
      throw new Error(`entryType "${context.entryType}" requires taskCardId.`);
    }

    const card = await ctx.db.get(context.taskCardId);
    if (!card) {
      throw new Error(`Task card ${context.taskCardId} not found.`);
    }
    if (card.organizationId !== orgId) {
      throw new Error(`Task card ${context.taskCardId} does not belong to organization ${orgId}.`);
    }
    if (card.workOrderId !== context.workOrderId) {
      throw new Error(
        `Task card ${context.taskCardId} does not belong to work order ${context.workOrderId}.`,
      );
    }
    if (card.status === "complete" || card.status === "voided") {
      throw new Error(
        `Cannot create timer on task card ${context.taskCardId} with status "${card.status}".`,
      );
    }
  } else if (context.taskCardId || context.taskStepId) {
    throw new Error(`entryType "work_order" cannot include taskCardId/taskStepId.`);
  }

  if (context.entryType === "step") {
    if (!context.taskStepId) {
      throw new Error(`entryType "step" requires taskStepId.`);
    }

    const step = await ctx.db.get(context.taskStepId);
    if (!step) {
      throw new Error(`Task step ${context.taskStepId} not found.`);
    }
    if (step.organizationId !== orgId) {
      throw new Error(`Task step ${context.taskStepId} does not belong to organization ${orgId}.`);
    }
    if (step.workOrderId !== context.workOrderId) {
      throw new Error(
        `Task step ${context.taskStepId} does not belong to work order ${context.workOrderId}.`,
      );
    }
    if (step.taskCardId !== context.taskCardId) {
      throw new Error(
        `Task step ${context.taskStepId} does not belong to task card ${context.taskCardId}.`,
      );
    }
    if (step.status === "completed" || step.status === "na") {
      throw new Error(
        `Cannot create timer on task step ${context.taskStepId} with status "${step.status}".`,
      );
    }
  } else if (context.taskStepId) {
    throw new Error(`entryType "${context.entryType}" cannot include taskStepId.`);
  }
}

async function listOpenEntriesForTechnician(
  ctx: any,
  orgId: Id<"organizations">,
  technicianId: Id<"technicians">,
): Promise<any[]> {
  const openEntries = await ctx.db
    .query("timeEntries")
    .withIndex("by_org_tech", (q: any) => q.eq("orgId", orgId).eq("technicianId", technicianId))
    .filter((q: any) => q.eq(q.field("clockOutAt"), undefined))
    .collect();

  return openEntries.sort((a: any, b: any) => b.clockInAt - a.clockInAt);
}

async function getEntrySegments(
  ctx: any,
  timeEntryId: Id<"timeEntries">,
): Promise<any[]> {
  const segments = await ctx.db
    .query("timeEntrySegments")
    .withIndex("by_time_entry", (q: any) => q.eq("timeEntryId", timeEntryId))
    .collect();

  return segments.sort((a: any, b: any) => a.segmentStartAt - b.segmentStartAt);
}

async function closeOpenSegments(
  ctx: any,
  args: {
    timeEntryId: Id<"timeEntries">;
    now: number;
    segmentType?: "active" | "pause" | "break";
  },
): Promise<void> {
  const segments = await getEntrySegments(ctx, args.timeEntryId);
  const open = segments.filter(
    (segment: any) =>
      segment.segmentEndAt === undefined &&
      (args.segmentType ? segment.segmentType === args.segmentType : true),
  );

  for (const segment of open) {
    await ctx.db.patch(segment._id, {
      segmentEndAt: args.now,
      updatedAt: args.now,
    });
  }
}

async function computeSegmentTotals(
  ctx: any,
  args: {
    timeEntryId: Id<"timeEntries">;
    now: number;
    fallbackClockInAt: number;
    fallbackClockOutAt: number;
    fallbackPausedMinutes?: number;
  },
): Promise<{ durationMinutes: number; pausedMinutes: number }> {
  const segments = await getEntrySegments(ctx, args.timeEntryId);

  if (segments.length === 0) {
    const grossMs = Math.max(0, args.fallbackClockOutAt - args.fallbackClockInAt);
    const pausedMinutes = Math.max(0, args.fallbackPausedMinutes ?? 0);
    const durationMinutes = Math.max(0, minutesFromMs(grossMs) - pausedMinutes);
    return { durationMinutes, pausedMinutes };
  }

  let activeMs = 0;
  let pausedMs = 0;

  for (const segment of segments) {
    const end = segment.segmentEndAt ?? args.now;
    if (end <= segment.segmentStartAt) continue;
    const segmentMs = end - segment.segmentStartAt;

    if (segment.segmentType === "active") {
      activeMs += segmentMs;
    }
    if (segment.segmentType === "pause") {
      pausedMs += segmentMs;
    }
  }

  return {
    durationMinutes: minutesFromMs(activeMs),
    pausedMinutes: minutesFromMs(pausedMs),
  };
}

async function findOverlappingEntry(
  ctx: any,
  args: {
    orgId: Id<"organizations">;
    technicianId: Id<"technicians">;
    rangeStartAt: number;
    rangeEndAt: number;
    excludeTimeEntryId?: Id<"timeEntries">;
  },
): Promise<any | null> {
  const entries = await ctx.db
    .query("timeEntries")
    .withIndex("by_org_tech", (q: any) =>
      q.eq("orgId", args.orgId).eq("technicianId", args.technicianId),
    )
    .collect();

  const now = Date.now();
  for (const entry of entries) {
    if (args.excludeTimeEntryId && entry._id === args.excludeTimeEntryId) continue;

    const entryStart = entry.clockInAt;
    const entryEnd = entry.clockOutAt ?? now;
    if (overlapExists(args.rangeStartAt, args.rangeEndAt, entryStart, entryEnd)) {
      return entry;
    }
  }

  return null;
}

async function startTimerInternal(
  ctx: any,
  args: {
    callerUserId: string;
    orgId: Id<"organizations">;
    technicianId: Id<"technicians">;
    context: TimerContext;
    notes?: string;
    billingClass?: BillingClass;
    rateAtTime?: number;
    source?: string;
    now?: number;
  },
): Promise<Id<"timeEntries">> {
  const now = args.now ?? Date.now();

  await assertOrgAndTech(ctx, args.orgId, args.technicianId);
  await validateTimerContextLineage(ctx, args.orgId, args.context);

  const openEntries = await listOpenEntriesForTechnician(ctx, args.orgId, args.technicianId);
  if (openEntries.length > 0) {
    throw new Error(
      `Technician ${args.technicianId} already has an active timer (${openEntries[0]._id}). ` +
      `Stop/pause/switch before starting a new timer.`,
    );
  }

  const effectiveBillingClass =
    args.billingClass ?? defaultBillingClassForEntryType(args.context.entryType);

  const timeEntryId = await ctx.db.insert("timeEntries", {
    orgId: args.orgId,
    technicianId: args.technicianId,

    entryType: args.context.entryType,
    workOrderId: args.context.workOrderId,
    taskCardId: args.context.taskCardId,
    taskStepId: args.context.taskStepId,
    shopActivityCode: args.context.shopActivityCode,
    source: args.source ?? "timer",

    clockInAt: now,
    notes: args.notes,

    billingClass: effectiveBillingClass,
    rateAtTime: args.rateAtTime,

    approvalStatus: "pending",
    billingLock: false,
    totalPausedMinutes: 0,

    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("timeEntrySegments", {
    orgId: args.orgId,
    timeEntryId,
    technicianId: args.technicianId,
    segmentStartAt: now,
    segmentType: "active",
    createdBySource: args.source ?? "timer",
    createdAt: now,
    updatedAt: now,
  });

  await writeTimeAudit(ctx, {
    orgId: args.orgId,
    userId: args.callerUserId,
    technicianId: args.technicianId,
    recordId: timeEntryId,
    eventType: "record_created",
    notes:
      `Started ${args.context.entryType} timer at ${new Date(now).toISOString()}. ` +
      `Context: WO=${args.context.workOrderId ?? "-"}, task=${args.context.taskCardId ?? "-"}, step=${args.context.taskStepId ?? "-"}.`,
  });

  return timeEntryId;
}

async function stopTimerInternal(
  ctx: any,
  args: {
    callerUserId: string;
    orgId: Id<"organizations">;
    timeEntryId: Id<"timeEntries">;
    notes?: string;
    now?: number;
  },
): Promise<void> {
  const now = args.now ?? Date.now();

  const entry = await ctx.db.get(args.timeEntryId);
  if (!entry) throw new Error(`Time entry ${args.timeEntryId} not found.`);
  if (entry.orgId !== args.orgId) {
    throw new Error(`Time entry ${args.timeEntryId} does not belong to organization ${args.orgId}.`);
  }
  if (entry.clockOutAt !== undefined) {
    throw new Error(
      `Time entry ${args.timeEntryId} is already stopped at ${new Date(entry.clockOutAt).toISOString()}.`,
    );
  }

  await closeOpenSegments(ctx, { timeEntryId: args.timeEntryId, now });

  const totals = await computeSegmentTotals(ctx, {
    timeEntryId: args.timeEntryId,
    now,
    fallbackClockInAt: entry.clockInAt,
    fallbackClockOutAt: now,
    fallbackPausedMinutes: entry.totalPausedMinutes,
  });

  await ctx.db.patch(args.timeEntryId, {
    clockOutAt: now,
    durationMinutes: totals.durationMinutes,
    totalPausedMinutes: totals.pausedMinutes,
    pausedAt: undefined,
    notes: args.notes ?? entry.notes,
    updatedAt: now,
  });

  await writeTimeAudit(ctx, {
    orgId: args.orgId,
    userId: args.callerUserId,
    technicianId: entry.technicianId,
    recordId: args.timeEntryId,
    eventType: "record_updated",
    notes:
      `Stopped ${entry.entryType ?? "work_order"} timer at ${new Date(now).toISOString()}. ` +
      `Duration=${totals.durationMinutes} min, paused=${totals.pausedMinutes} min.`,
  });
}

async function pauseTimerInternal(
  ctx: any,
  args: {
    callerUserId: string;
    orgId: Id<"organizations">;
    timeEntryId: Id<"timeEntries">;
    source?: string;
    now?: number;
  },
): Promise<void> {
  const now = args.now ?? Date.now();

  const entry = await ctx.db.get(args.timeEntryId);
  if (!entry) throw new Error(`Time entry ${args.timeEntryId} not found.`);
  if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
  if (entry.clockOutAt !== undefined) {
    throw new Error("Cannot pause a stopped timer.");
  }
  if (entry.pausedAt !== undefined) {
    throw new Error("Timer is already paused.");
  }

  const segments = await getEntrySegments(ctx, args.timeEntryId);
  const hasOpenActive = segments.some(
    (segment: any) =>
      segment.segmentType === "active" && segment.segmentEndAt === undefined,
  );

  if (!hasOpenActive) {
    // Legacy open entry (or repaired data) that predates segment tracking.
    await ctx.db.insert("timeEntrySegments", {
      orgId: entry.orgId,
      timeEntryId: entry._id,
      technicianId: entry.technicianId,
      segmentStartAt: entry.clockInAt,
      segmentEndAt: now,
      segmentType: "active",
      createdBySource: "legacy_backfill",
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await closeOpenSegments(ctx, {
      timeEntryId: args.timeEntryId,
      now,
      segmentType: "active",
    });
  }

  await ctx.db.insert("timeEntrySegments", {
    orgId: entry.orgId,
    timeEntryId: entry._id,
    technicianId: entry.technicianId,
    segmentStartAt: now,
    segmentType: "pause",
    createdBySource: args.source ?? "timer",
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(entry._id, {
    pausedAt: now,
    updatedAt: now,
  });

  await writeTimeAudit(ctx, {
    orgId: entry.orgId,
    userId: args.callerUserId,
    technicianId: entry.technicianId,
    recordId: entry._id,
    eventType: "record_updated",
    notes: `Paused timer at ${new Date(now).toISOString()}.`,
  });
}

async function resumeTimerInternal(
  ctx: any,
  args: {
    callerUserId: string;
    orgId: Id<"organizations">;
    timeEntryId: Id<"timeEntries">;
    source?: string;
    now?: number;
  },
): Promise<void> {
  const now = args.now ?? Date.now();

  const entry = await ctx.db.get(args.timeEntryId);
  if (!entry) throw new Error(`Time entry ${args.timeEntryId} not found.`);
  if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
  if (entry.clockOutAt !== undefined) throw new Error("Cannot resume a stopped timer.");
  if (entry.pausedAt === undefined) throw new Error("Timer is not paused.");

  await closeOpenSegments(ctx, {
    timeEntryId: args.timeEntryId,
    now,
    segmentType: "pause",
  });

  const incrementalPaused = minutesFromMs(now - entry.pausedAt);
  await ctx.db.patch(entry._id, {
    pausedAt: undefined,
    totalPausedMinutes: Math.max(0, (entry.totalPausedMinutes ?? 0) + incrementalPaused),
    updatedAt: now,
  });

  await ctx.db.insert("timeEntrySegments", {
    orgId: entry.orgId,
    timeEntryId: entry._id,
    technicianId: entry.technicianId,
    segmentStartAt: now,
    segmentType: "active",
    createdBySource: args.source ?? "timer",
    createdAt: now,
    updatedAt: now,
  });

  await writeTimeAudit(ctx, {
    orgId: entry.orgId,
    userId: args.callerUserId,
    technicianId: entry.technicianId,
    recordId: entry._id,
    eventType: "record_updated",
    notes: `Resumed timer at ${new Date(now).toISOString()}.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy compatibility wrappers
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy WO/task clock-in wrapper kept for compatibility with existing UI usage. */
export const clockIn = mutation({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.optional(v.id("taskCards")),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"timeEntries">> => {
    const callerUserId = await requireAuth(ctx);

    return startTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      technicianId: args.technicianId,
      context: {
        entryType: args.taskCardId ? "task" : "work_order",
        workOrderId: args.workOrderId,
        taskCardId: args.taskCardId,
      },
      notes: args.notes,
      source: "billing_time_clock",
    });
  },
});

/** Legacy clock-out wrapper kept for compatibility with existing UI usage. */
export const clockOut = mutation({
  args: {
    timeEntryId: v.id("timeEntries"),
    orgId: v.id("organizations"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);

    await stopTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      timeEntryId: args.timeEntryId,
      notes: args.notes,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Unified timer API
// ─────────────────────────────────────────────────────────────────────────────

export const startTimer = mutation({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    entryType: entryTypeValidator,

    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    shopActivityCode: v.optional(v.string()),

    notes: v.optional(v.string()),
    billingClass: v.optional(billingClassValidator),
    rateAtTime: v.optional(v.number()),
    source: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"timeEntries">> => {
    const callerUserId = await requireAuth(ctx);

    return startTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      technicianId: args.technicianId,
      context: {
        entryType: args.entryType,
        workOrderId: args.workOrderId,
        taskCardId: args.taskCardId,
        taskStepId: args.taskStepId,
        shopActivityCode: args.shopActivityCode,
      },
      notes: args.notes,
      billingClass: args.billingClass,
      rateAtTime: args.rateAtTime,
      source: args.source,
    });
  },
});

export const stopTimer = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);

    await stopTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      timeEntryId: args.timeEntryId,
      notes: args.notes,
    });
  },
});

export const pauseTimer = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    source: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);
    await pauseTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      timeEntryId: args.timeEntryId,
      source: args.source,
    });
  },
});

export const resumeTimer = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    source: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);
    await resumeTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      timeEntryId: args.timeEntryId,
      source: args.source,
    });
  },
});

export const switchTimerContext = mutation({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    activeTimeEntryId: v.id("timeEntries"),

    entryType: entryTypeValidator,
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    shopActivityCode: v.optional(v.string()),

    notes: v.optional(v.string()),
    billingClass: v.optional(billingClassValidator),
    rateAtTime: v.optional(v.number()),
    source: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{ stoppedTimeEntryId: Id<"timeEntries">; startedTimeEntryId: Id<"timeEntries"> }> => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    const activeEntry = await ctx.db.get(args.activeTimeEntryId);
    if (!activeEntry) throw new Error("Active timer entry not found.");
    if (activeEntry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (activeEntry.technicianId !== args.technicianId) {
      throw new Error("Active timer does not belong to the provided technician.");
    }
    if (activeEntry.clockOutAt !== undefined) {
      throw new Error("Provided activeTimeEntryId is already stopped.");
    }

    await stopTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      timeEntryId: args.activeTimeEntryId,
      now,
    });

    const startedTimeEntryId = await startTimerInternal(ctx, {
      callerUserId,
      orgId: args.orgId,
      technicianId: args.technicianId,
      context: {
        entryType: args.entryType,
        workOrderId: args.workOrderId,
        taskCardId: args.taskCardId,
        taskStepId: args.taskStepId,
        shopActivityCode: args.shopActivityCode,
      },
      notes: args.notes,
      billingClass: args.billingClass,
      rateAtTime: args.rateAtTime,
      source: args.source,
      now,
    });

    return {
      stoppedTimeEntryId: args.activeTimeEntryId,
      startedTimeEntryId,
    };
  },
});

export const discardOpenTimer = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    reason: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);

    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (entry.clockOutAt !== undefined) throw new Error("Only open timers can be discarded.");
    if (entry.billingLock || entry.billedInvoiceId) {
      throw new Error("Cannot discard a billed/locked time entry.");
    }

    const segments = await getEntrySegments(ctx, args.timeEntryId);
    for (const segment of segments) {
      await ctx.db.delete(segment._id);
    }

    await ctx.db.delete(args.timeEntryId);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "correction_created",
      tableName: "timeEntries",
      recordId: args.timeEntryId,
      userId: callerUserId,
      technicianId: entry.technicianId,
      notes:
        `Discarded open timer entry ${args.timeEntryId}. ` +
        `Reason: ${args.reason?.trim() || "not provided"}.`,
      timestamp: Date.now(),
    });
  },
});

export const createManualTimeEntry = mutation({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    entryType: entryTypeValidator,

    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    shopActivityCode: v.optional(v.string()),

    clockInAt: v.number(),
    clockOutAt: v.number(),

    notes: v.optional(v.string()),
    billingClass: v.optional(billingClassValidator),
    rateAtTime: v.optional(v.number()),
    source: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"timeEntries">> => {
    const callerUserId = await requireAuth(ctx);

    await assertOrgAndTech(ctx, args.orgId, args.technicianId);
    await validateTimerContextLineage(ctx, args.orgId, {
      entryType: args.entryType,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      taskStepId: args.taskStepId,
      shopActivityCode: args.shopActivityCode,
    });

    if (args.clockOutAt <= args.clockInAt) {
      throw new Error("clockOutAt must be greater than clockInAt.");
    }

    const overlapping = await findOverlappingEntry(ctx, {
      orgId: args.orgId,
      technicianId: args.technicianId,
      rangeStartAt: args.clockInAt,
      rangeEndAt: args.clockOutAt,
    });
    if (overlapping) {
      throw new Error(
        `Manual entry overlaps existing entry ${overlapping._id}. ` +
        `Resolve overlap before creating this correction entry.`,
      );
    }

    const durationMinutes = minutesFromMs(args.clockOutAt - args.clockInAt);
    const now = Date.now();

    const timeEntryId = await ctx.db.insert("timeEntries", {
      orgId: args.orgId,
      technicianId: args.technicianId,

      entryType: args.entryType,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      taskStepId: args.taskStepId,
      shopActivityCode: args.shopActivityCode,
      source: args.source ?? "manual_entry",

      clockInAt: args.clockInAt,
      clockOutAt: args.clockOutAt,
      durationMinutes,

      notes: args.notes,

      billingClass: args.billingClass ?? defaultBillingClassForEntryType(args.entryType),
      rateAtTime: args.rateAtTime,

      approvalStatus: "pending",
      billingLock: false,
      totalPausedMinutes: 0,

      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("timeEntrySegments", {
      orgId: args.orgId,
      timeEntryId,
      technicianId: args.technicianId,
      segmentStartAt: args.clockInAt,
      segmentEndAt: args.clockOutAt,
      segmentType: "active",
      createdBySource: args.source ?? "manual_entry",
      createdAt: now,
      updatedAt: now,
    });

    await writeTimeAudit(ctx, {
      orgId: args.orgId,
      userId: callerUserId,
      technicianId: args.technicianId,
      recordId: timeEntryId,
      eventType: "correction_created",
      notes:
        `Created manual ${args.entryType} time entry. ` +
        `${new Date(args.clockInAt).toISOString()} -> ${new Date(args.clockOutAt).toISOString()} (${durationMinutes} min).`,
    });

    return timeEntryId;
  },
});

export const updateTimeEntry = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),

    entryType: v.optional(entryTypeValidator),
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    shopActivityCode: v.optional(v.string()),

    clockInAt: v.optional(v.number()),
    clockOutAt: v.optional(v.number()),

    notes: v.optional(v.string()),
    billingClass: v.optional(billingClassValidator),
    rateAtTime: v.optional(v.number()),
    approvalStatus: v.optional(approvalStatusValidator),

    allowApprovedEdit: v.optional(v.boolean()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);

    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");

    if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) {
      throw new Error("Cannot edit billed/locked time entries.");
    }

    const currentApprovalStatus: ApprovalStatus =
      (entry.approvalStatus as ApprovalStatus | undefined) ??
      (entry.approved === true ? "approved" : entry.approved === false ? "rejected" : "pending");

    if (currentApprovalStatus === "approved" && !args.allowApprovedEdit) {
      throw new Error(
        "Time entry is already approved. Set allowApprovedEdit=true for supervisor override edits.",
      );
    }

    const nextEntryType = (args.entryType ?? entry.entryType ?? "work_order") as TimerEntryType;
    const nextClockInAt = args.clockInAt ?? entry.clockInAt;
    const nextClockOutAt = args.clockOutAt ?? entry.clockOutAt;

    const nextContext: TimerContext = {
      entryType: nextEntryType,
      workOrderId: args.workOrderId ?? entry.workOrderId,
      taskCardId: args.taskCardId ?? entry.taskCardId,
      taskStepId: args.taskStepId ?? entry.taskStepId,
      shopActivityCode: args.shopActivityCode ?? entry.shopActivityCode,
    };

    await validateTimerContextLineage(ctx, args.orgId, nextContext);

    if (nextClockOutAt !== undefined && nextClockOutAt <= nextClockInAt) {
      throw new Error("clockOutAt must be greater than clockInAt.");
    }

    if (nextClockOutAt !== undefined) {
      const overlapping = await findOverlappingEntry(ctx, {
        orgId: args.orgId,
        technicianId: entry.technicianId,
        rangeStartAt: nextClockInAt,
        rangeEndAt: nextClockOutAt,
        excludeTimeEntryId: entry._id,
      });
      if (overlapping) {
        throw new Error(
          `Updated entry would overlap existing entry ${overlapping._id}.`,
        );
      }
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      entryType: nextEntryType,
      workOrderId: nextContext.workOrderId,
      taskCardId: nextContext.taskCardId,
      taskStepId: nextContext.taskStepId,
      shopActivityCode: nextContext.shopActivityCode,
      clockInAt: nextClockInAt,
      notes: args.notes ?? entry.notes,
      billingClass:
        args.billingClass ??
        entry.billingClass ??
        defaultBillingClassForEntryType(nextEntryType),
      rateAtTime: args.rateAtTime ?? entry.rateAtTime,
      updatedAt: now,
    };

    if (nextClockOutAt !== undefined) {
      patch.clockOutAt = nextClockOutAt;
      patch.durationMinutes = minutesFromMs(nextClockOutAt - nextClockInAt);
      patch.pausedAt = undefined;
      patch.totalPausedMinutes = 0;
    } else {
      patch.clockOutAt = undefined;
      patch.durationMinutes = undefined;
    }

    if (args.approvalStatus) {
      patch.approvalStatus = args.approvalStatus;
      if (args.approvalStatus === "approved") {
        patch.approved = true;
        patch.approvedAt = now;
      } else if (args.approvalStatus === "rejected") {
        patch.approved = false;
        patch.rejectedAt = now;
      } else {
        patch.approved = undefined;
        patch.approvedAt = undefined;
        patch.rejectedAt = undefined;
        patch.rejectionReason = undefined;
      }
    }

    await ctx.db.patch(entry._id, patch);

    // Keep segments aligned with edited time range.
    const oldSegments = await getEntrySegments(ctx, entry._id);
    for (const segment of oldSegments) {
      await ctx.db.delete(segment._id);
    }

    await ctx.db.insert("timeEntrySegments", {
      orgId: entry.orgId,
      timeEntryId: entry._id,
      technicianId: entry.technicianId,
      segmentStartAt: nextClockInAt,
      segmentEndAt: nextClockOutAt,
      segmentType: "active",
      createdBySource: "admin_edit",
      createdAt: now,
      updatedAt: now,
    });

    await writeTimeAudit(ctx, {
      orgId: entry.orgId,
      userId: callerUserId,
      technicianId: entry.technicianId,
      recordId: entry._id,
      eventType: "correction_created",
      notes: "Updated time entry fields via correction flow.",
    });
  },
});

export const deleteTimeEntry = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    forceApprovedDelete: v.optional(v.boolean()),
  },

  handler: async (ctx, args): Promise<void> => {
    const callerUserId = await requireAuth(ctx);

    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) {
      throw new Error("Cannot delete billed/locked time entries.");
    }

    const approvalStatus: ApprovalStatus =
      (entry.approvalStatus as ApprovalStatus | undefined) ??
      (entry.approved === true ? "approved" : entry.approved === false ? "rejected" : "pending");

    if (approvalStatus === "approved" && !args.forceApprovedDelete) {
      throw new Error(
        "Cannot delete approved time entry without forceApprovedDelete=true.",
      );
    }

    const segments = await getEntrySegments(ctx, entry._id);
    for (const segment of segments) {
      await ctx.db.delete(segment._id);
    }

    await ctx.db.delete(entry._id);

    await ctx.db.insert("auditLog", {
      organizationId: entry.orgId,
      eventType: "correction_created",
      tableName: "timeEntries",
      recordId: entry._id,
      userId: callerUserId,
      technicianId: entry.technicianId,
      notes: `Deleted time entry ${entry._id}.`,
      timestamp: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Lists time entries for the org with optional technician/work-order/context filters. */
export const listTimeEntries = query({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.optional(v.id("technicians")),
    workOrderId: v.optional(v.id("workOrders")),
    entryType: v.optional(entryTypeValidator),
    approvalStatus: v.optional(approvalStatusValidator),
    includeOpenOnly: v.optional(v.boolean()),
    includeUnbilledOnly: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    let entries: any[];

    if (args.workOrderId !== undefined) {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_org_wo", (q: any) =>
          q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
        )
        .collect();
    } else if (args.technicianId !== undefined) {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_org_tech", (q: any) =>
          q.eq("orgId", args.orgId).eq("technicianId", args.technicianId),
        )
        .collect();
    } else {
      entries = await ctx.db
        .query("timeEntries")
        .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
        .collect();
    }

    const normalized = entries
      .filter((entry) => {
        if (args.entryType && (entry.entryType ?? "work_order") !== args.entryType) {
          return false;
        }

        const entryApprovalStatus: ApprovalStatus =
          (entry.approvalStatus as ApprovalStatus | undefined) ??
          (entry.approved === true ? "approved" : entry.approved === false ? "rejected" : "pending");

        if (args.approvalStatus && entryApprovalStatus !== args.approvalStatus) {
          return false;
        }

        if (args.includeOpenOnly && entry.clockOutAt !== undefined) {
          return false;
        }

        if (args.includeUnbilledOnly) {
          if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.clockInAt - a.clockInAt)
      .map((entry) => ({
        ...entry,
        entryType: entry.entryType ?? "work_order",
        approvalStatus:
          (entry.approvalStatus as ApprovalStatus | undefined) ??
          (entry.approved === true ? "approved" : entry.approved === false ? "rejected" : "pending"),
      }));

    return normalized;
  },
});

/** Returns all time entries for a work order ordered by clock-in time. */
export const getTimeEntriesForWorkOrder = query({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q: any) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .collect();

    return entries.sort((a: any, b: any) => a.clockInAt - b.clockInAt);
  },
});

/** Returns total labor hours per technician for a work order. Open entries included at current time. */
export const getLaborSummaryForWorkOrder = query({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    approvedOnly: v.optional(v.boolean()),
    unbilledOnly: v.optional(v.boolean()),
  },

  handler: async (ctx, args): Promise<Array<{
    technicianId: Id<"technicians">;
    totalMinutes: number;
    totalHours: number;
    openEntryCount: number;
  }>> => {
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q: any) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .collect();

    const now = Date.now();
    const byTech = new Map<string, { totalMinutes: number; openEntryCount: number }>();

    for (const entry of entries) {
      const approvalStatus: ApprovalStatus =
        (entry.approvalStatus as ApprovalStatus | undefined) ??
        (entry.approved === true ? "approved" : entry.approved === false ? "rejected" : "pending");

      if (args.approvedOnly && approvalStatus !== "approved") continue;
      if (args.unbilledOnly && (entry.billingLock || entry.billedInvoiceId || entry.billedAt)) continue;

      const techKey = entry.technicianId as string;
      if (!byTech.has(techKey)) {
        byTech.set(techKey, { totalMinutes: 0, openEntryCount: 0 });
      }
      const agg = byTech.get(techKey)!;

      if (entry.durationMinutes !== undefined) {
        agg.totalMinutes += entry.durationMinutes;
      } else {
        const provisionalMinutes = Math.round((now - entry.clockInAt) / 60_000);
        agg.totalMinutes += provisionalMinutes;
        agg.openEntryCount += 1;
      }
    }

    return Array.from(byTech.entries()).map(([techId, agg]) => ({
      technicianId: techId as Id<"technicians">,
      totalMinutes: agg.totalMinutes,
      totalHours: Math.round((agg.totalMinutes / 60) * 100) / 100,
      openEntryCount: agg.openEntryCount,
    }));
  },
});

export const listActiveTimers = query({
  args: {
    orgId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .filter((q: any) => q.eq(q.field("clockOutAt"), undefined))
      .collect();

    return entries.sort((a: any, b: any) => b.clockInAt - a.clockInAt);
  },
});

export const getActiveTimerForTechnician = query({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
  },

  handler: async (ctx, args) => {
    const openEntries = await listOpenEntriesForTechnician(
      ctx,
      args.orgId,
      args.technicianId,
    );

    if (openEntries.length === 0) return null;
    const activeEntry = openEntries[0];

    const now = Date.now();
    const segments = await getEntrySegments(ctx, activeEntry._id);
    const totals = await computeSegmentTotals(ctx, {
      timeEntryId: activeEntry._id,
      now,
      fallbackClockInAt: activeEntry.clockInAt,
      fallbackClockOutAt: now,
      fallbackPausedMinutes: activeEntry.totalPausedMinutes,
    });

    return {
      entry: {
        ...activeEntry,
        entryType: activeEntry.entryType ?? "work_order",
        approvalStatus:
          (activeEntry.approvalStatus as ApprovalStatus | undefined) ??
          (activeEntry.approved === true
            ? "approved"
            : activeEntry.approved === false
              ? "rejected"
              : "pending"),
      },
      segments,
      elapsedMinutes: totals.durationMinutes,
      pausedMinutes: totals.pausedMinutes,
      isPaused: activeEntry.pausedAt !== undefined,
    };
  },
});

export const listTimeEntrySegments = query({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
  },

  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");

    return getEntrySegments(ctx, args.timeEntryId);
  },
});
