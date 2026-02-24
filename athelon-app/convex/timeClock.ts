// convex/timeClock.ts
// Athelon — Aviation MRO SaaS Platform
//
// Time clock: technician clock-in/clock-out per work order, time entry queries,
// and labor hour aggregation for billing and WO cost reporting.
//
// Author:      Devraj Anand (Backend Engineer)
// Regulatory:  Marcus Webb
//              Marcus note: Time entries are the audit-trail source for labor
//              charged to a work order. Under §145.213(a) cost allocation
//              requirements, labor hours must be traceable to individual
//              technicians and work orders. durationMinutes is computed
//              server-side at clock-out — it cannot be entered manually by
//              the technician (prevents timesheet fraud). Clock-in records
//              with no corresponding clock-out are flagged as "open" entries
//              and surface in the supervisor dashboard for resolution.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPER: REQUIRE AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session.",
    );
  }
  return identity.subject;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: clockIn
//
// Creates a new timeEntry with clockInAt = Date.now(). clockOutAt and
// durationMinutes are left unset. A technician may only have one open
// (clocked-in) entry per work order at a time; attempting to clock in
// again throws unless the previous entry has been closed.
// ─────────────────────────────────────────────────────────────────────────────

/** Clocks a technician in on a work order. Creates an open timeEntry record. */
export const clockIn = mutation({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.optional(v.id("taskCards")),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"timeEntries">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Validate org ────────────────────────────────────────────────────────
    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) {
      throw new Error(`Organization ${args.orgId} not found or is inactive.`);
    }

    // ── Validate technician ─────────────────────────────────────────────────
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error(`Technician ${args.technicianId} not found.`);

    // ── Validate work order ─────────────────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.orgId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.orgId}.`,
      );
    }
    // Cannot clock in on a closed, cancelled, or voided WO
    if (wo.status === "closed" || wo.status === "cancelled" || wo.status === "voided") {
      throw new Error(
        `Cannot clock in on work order with status "${wo.status}". ` +
        `Work order must be open or in progress.`,
      );
    }

    // ── Guard: no open clock-in entry for this tech + WO ───────────────────
    // Marcus: A technician cannot be simultaneously clocked in on the same WO twice.
    // This prevents accidental double-billing and flags possible supervisory issues.
    const openEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("technicianId"), args.technicianId),
          q.eq(q.field("clockOutAt"), undefined),
        ),
      )
      .collect();

    if (openEntries.length > 0) {
      throw new Error(
        `Technician ${args.technicianId} already has an open clock-in entry ` +
        `(ID: ${openEntries[0]._id}) on work order ${args.workOrderId}. ` +
        `Clock out before clocking in again.`,
      );
    }

    const timeEntryId = await ctx.db.insert("timeEntries", {
      orgId: args.orgId,
      technicianId: args.technicianId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      clockInAt: now,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "timeEntries",
      recordId: timeEntryId,
      userId: callerUserId,
      technicianId: args.technicianId,
      notes:
        `Tech ${tech.legalName ?? args.technicianId} clocked IN on WO ${wo.workOrderNumber} ` +
        `at ${new Date(now).toISOString()}.`,
      timestamp: now,
    });

    return timeEntryId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: clockOut
//
// Closes an open timeEntry. Sets clockOutAt = now and computes durationMinutes
// as Math.round((clockOutAt - clockInAt) / 60_000). Both values are set
// atomically in the same Convex transaction.
// ─────────────────────────────────────────────────────────────────────────────

/** Clocks a technician out. Sets clockOutAt and computes durationMinutes server-side. */
export const clockOut = mutation({
  args: {
    timeEntryId: v.id("timeEntries"),
    orgId: v.id("organizations"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error(`Time entry ${args.timeEntryId} not found.`);
    if (entry.orgId !== args.orgId) {
      throw new Error(`Time entry ${args.timeEntryId} does not belong to organization ${args.orgId}.`);
    }
    if (entry.clockOutAt !== undefined) {
      throw new Error(
        `Time entry ${args.timeEntryId} is already clocked out at ` +
        `${new Date(entry.clockOutAt).toISOString()}.`,
      );
    }

    const durationMinutes = Math.round((now - entry.clockInAt) / 60_000);

    await ctx.db.patch(args.timeEntryId, {
      clockOutAt: now,
      durationMinutes,
      notes: args.notes ?? entry.notes,
      updatedAt: now,
    });

    const wo = await ctx.db.get(entry.workOrderId);
    const tech = await ctx.db.get(entry.technicianId);

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_updated",
      tableName: "timeEntries",
      recordId: args.timeEntryId,
      userId: callerUserId,
      technicianId: entry.technicianId,
      notes:
        `Tech ${tech?.legalName ?? entry.technicianId} clocked OUT on WO ` +
        `${wo?.workOrderNumber ?? entry.workOrderId} at ${new Date(now).toISOString()}. ` +
        `Duration: ${durationMinutes} minutes.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listTimeEntries
//
// Returns time entries for the org, filtered by technician and/or work order.
// ─────────────────────────────────────────────────────────────────────────────

/** Lists time entries for the org, optionally filtered by technician or work order. */
export const listTimeEntries = query({
  args: {
    orgId: v.id("organizations"),
    technicianId: v.optional(v.id("technicians")),
    workOrderId: v.optional(v.id("workOrders")),
  },

  handler: async (ctx, args) => {
    if (args.workOrderId !== undefined) {
      return ctx.db
        .query("timeEntries")
        .withIndex("by_org_wo", (q) =>
          q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId!),
        )
        .order("desc")
        .collect();
    }

    if (args.technicianId !== undefined) {
      return ctx.db
        .query("timeEntries")
        .withIndex("by_org_tech", (q) =>
          q.eq("orgId", args.orgId).eq("technicianId", args.technicianId!),
        )
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getTimeEntriesForWorkOrder
//
// Returns all time entries linked to a given work order, ordered by clockInAt.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all time entries for a work order ordered by clock-in time. */
export const getTimeEntriesForWorkOrder = query({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    return ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .order("asc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getLaborSummaryForWorkOrder
//
// Aggregates total minutes and hours per technician for a given work order.
// Returns an array of { technicianId, totalMinutes, totalHours } objects.
// Open entries (no clockOutAt) are counted using Date.now() as a provisional
// end time so in-progress labor is visible on the WO cost summary.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns total labor hours per technician for a work order. Open entries included at current time. */
export const getLaborSummaryForWorkOrder = query({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args): Promise<Array<{
    technicianId: Id<"technicians">;
    totalMinutes: number;
    totalHours: number;
    openEntryCount: number;
  }>> => {
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .collect();

    const now = Date.now();
    const byTech = new Map<string, { totalMinutes: number; openEntryCount: number }>();

    for (const entry of entries) {
      const techKey = entry.technicianId as string;
      if (!byTech.has(techKey)) {
        byTech.set(techKey, { totalMinutes: 0, openEntryCount: 0 });
      }
      const agg = byTech.get(techKey)!;

      if (entry.durationMinutes !== undefined) {
        agg.totalMinutes += entry.durationMinutes;
      } else {
        // Open entry — use provisional duration to present time
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
