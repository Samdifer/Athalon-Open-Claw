// convex/workOrders.ts
// Athelon — Aviation MRO SaaS Platform
//
// Implements the Work Order Engine as specified in:
//   phase-2-work-orders/work-order-engine.md (Rafael Mendoza, Devraj Anand)
//   phase-2-signoff/signoff-rts-flow.md (Marcus Webb)
//   phase-2-compliance/ad-compliance-module.md (Marcus Webb)
//   reviews/phase-2-gate-review.md
//
// Author:    Devraj Anand (Phase 3 Implementation)
// Spec:      Rafael Mendoza (Tech Lead / Architect)
// Regulatory: Marcus Webb
// QA:        Cilla Oduya
//
// Every INVARIANT enforced here corresponds to a named invariant in
// convex-schema-v2.md. Every audit log write corresponds to an entry in
// the signoff-rts-flow.md Section 6 audit log catalogue.
//
// Auth pattern: ctx.auth.getUserIdentity() gives us the Clerk JWT subject.
// The subject is the Clerk user ID. We use this as callerUserId on all mutations
// that do not take an explicit callerUserId arg — this makes auth self-validating.
//
// Organization scoping: Every query is org-scoped. Cross-org data access is
// architecturally impossible — all indexes include organizationId as the first
// key so the query planner cannot return cross-org results.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPER TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses in which a work order is considered "active" for concurrent WO detection. */
const ACTIVE_WO_STATUSES = [
  "open",
  "in_progress",
  "on_hold",
  "pending_inspection",
  "pending_signoff",
  "open_discrepancies",
] as const;

/** Statuses from which voidWorkOrder is permitted. */
const VOIDABLE_WO_STATUSES = ["draft", "open", "on_hold"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS (for reuse across args blocks)
// ─────────────────────────────────────────────────────────────────────────────

const workOrderTypeValidator = v.union(
  v.literal("routine"),
  v.literal("unscheduled"),
  v.literal("annual_inspection"),
  v.literal("100hr_inspection"),
  v.literal("progressive_inspection"),
  v.literal("ad_compliance"),
  v.literal("major_repair"),
  v.literal("major_alteration"),
  v.literal("field_approval"),
  v.literal("ferry_permit"),
);

const priorityValidator = v.union(
  v.literal("routine"),
  v.literal("urgent"),
  v.literal("aog"),
);

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

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: REQUIRE AUTHENTICATED USER
//
// Every public mutation calls this first. It reads the Clerk JWT from the
// Convex context and throws if the user is not authenticated.
// The returned subject is the Clerk user ID — used as userId in audit log entries.
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session. " +
      "Sign in before calling this mutation.",
    );
  }
  return identity.subject; // Clerk user ID (sub claim from JWT)
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createWorkOrder
//
// Spec ref: work-order-engine.md §2.1
// Enforces: INV-14 (work order number uniqueness within org)
//
// Creates a work order in "draft" status. Does not open it, does not capture
// aircraft time, does not assign technicians. Draft is administrative intake.
//
// A work order number that was previously used on a voided WO may NOT be reused —
// voided records still occupy their number (chain of custody requirement).
// ─────────────────────────────────────────────────────────────────────────────

export const createWorkOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),

    workOrderNumber: v.string(),
    workOrderType: workOrderTypeValidator,
    description: v.string(),
    squawks: v.optional(v.string()),
    priority: priorityValidator,
    targetCompletionDate: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    notes: v.optional(v.string()),

    // Optional: caller's IP for audit log (extracted server-side by API layer)
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"workOrders">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Input validation ────────────────────────────────────────────────────

    if (!args.workOrderNumber.trim()) {
      throw new Error("workOrderNumber must be a non-empty, non-whitespace string.");
    }
    if (!args.description.trim()) {
      throw new Error("description must be a non-empty string.");
    }

    // ── INV-14: workOrderNumber must be unique within organization ──────────
    // We query ALL statuses — including "voided". A voided WO retains its number
    // permanently. An FAA inspector querying by WO number must get exactly one result.
    const existingWO = await ctx.db
      .query("workOrders")
      .withIndex("by_number", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("workOrderNumber", args.workOrderNumber.trim()),
      )
      .first();

    if (existingWO !== null) {
      throw new Error(
        `INV-14: Work order number "${args.workOrderNumber.trim()}" already exists ` +
        `within organization ${args.organizationId} (existing status: "${existingWO.status}"). ` +
        `Work order numbers must be unique per organization, including across voided records. ` +
        `Choose a different work order number.`,
      );
    }

    // ── Organization validation ─────────────────────────────────────────────
    const org = await ctx.db.get(args.organizationId);
    if (!org || !org.active) {
      throw new Error(
        `Organization ${args.organizationId} not found or is inactive. ` +
        `Work orders may only be created for active organizations.`,
      );
    }

    // ── Aircraft validation ─────────────────────────────────────────────────
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) {
      throw new Error(`Aircraft ${args.aircraftId} not found.`);
    }
    // Destroyed and sold aircraft cannot receive new work orders.
    // Per Marcus: creating a WO for a destroyed aircraft indicates either an error
    // or an attempt to falsify maintenance records for an aircraft that no longer exists.
    if (aircraft.status === "destroyed" || aircraft.status === "sold") {
      throw new Error(
        `Aircraft ${args.aircraftId} (${aircraft.make} ${aircraft.model} ` +
        `S/N ${aircraft.serialNumber}) has status "${aircraft.status}". ` +
        `Work orders may not be created for destroyed or sold aircraft.`,
      );
    }

    // ── Customer validation (if provided) ──────────────────────────────────
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.organizationId !== args.organizationId) {
        throw new Error(
          `Customer ${args.customerId} not found or does not belong to ` +
          `organization ${args.organizationId}.`,
        );
      }
      if (!customer.active) {
        throw new Error(`Customer ${args.customerId} is inactive.`);
      }
    }

    // ── Insert work order ───────────────────────────────────────────────────
    const workOrderId = await ctx.db.insert("workOrders", {
      workOrderNumber: args.workOrderNumber.trim(),
      organizationId: args.organizationId,
      aircraftId: args.aircraftId,
      status: "draft",
      workOrderType: args.workOrderType,
      description: args.description.trim(),
      squawks: args.squawks,
      openedAt: now,
      openedByUserId: callerUserId,
      targetCompletionDate: args.targetCompletionDate,
      customerId: args.customerId,
      priority: args.priority,
      notes: args.notes,
      // aircraftTotalTimeAtOpen is set to 0 as a sentinel value here.
      // The real value is captured in openWorkOrder (regulatory clock start).
      // The UI must NOT display this field until the WO is in "open" status.
      // Devraj note: 0 is distinguishable from a real reading because no aircraft
      // has exactly 0 TT by the time it receives its first work order.
      aircraftTotalTimeAtOpen: 0,
      returnedToService: false,
      createdAt: now,
      updatedAt: now,
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    // Signoff-rts-flow.md §6.2: record_created on workOrders
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "workOrders",
      recordId: workOrderId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `Work order ${args.workOrderNumber.trim()} created in draft status. ` +
        `Aircraft: ${aircraft.make} ${aircraft.model} S/N ${aircraft.serialNumber}. ` +
        `Type: ${args.workOrderType}. Priority: ${args.priority}.`,
      timestamp: now,
    });

    return workOrderId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: openWorkOrder
//
// Spec ref: work-order-engine.md §2.2
// Enforces: INV-06 (partial), INV-18 (aircraft total time monotonicity)
//
// Formally opens a draft work order. This is the regulatory start of the
// maintenance event: aircraft total time is captured here, technicians are
// assigned, and the status transitions from "draft" to "open".
//
// Per Marcus (work-order-engine.md §2.2):
//   aircraftTotalTimeAtOpen is the regulatory start clock under 14 CFR 43.11(a)(2).
//   If the entered value is less than the aircraft's last known TT, throw.
//   Aircraft total time is monotonically increasing (INV-18). A lower value
//   is either a typo or falsification — we treat it as the latter.
// ─────────────────────────────────────────────────────────────────────────────

export const openWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // Aircraft total time at the formal start of this maintenance event.
    // Entered by the opening technician from the aircraft's tachometer / hobbs meter.
    // NOT derived from aircraft.totalTimeAirframeHours (which is a stale cached value).
    // Per 14 CFR 43.11(a)(2).
    aircraftTotalTimeAtOpen: v.number(),

    // At least one technician must be assigned when opening (work-order-engine.md §2.2)
    assignedTechnicianIds: v.array(v.id("technicians")),

    // Concurrent work order override (see guard below)
    concurrentWorkOrderOverrideAcknowledged: v.optional(v.boolean()),
    concurrentWorkOrderReason: v.optional(v.string()),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch and validate work order ───────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) {
      throw new Error(`Work order ${args.workOrderId} not found.`);
    }
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.organizationId}.`,
      );
    }
    if (wo.status !== "draft") {
      throw new Error(
        `openWorkOrder requires status "draft". ` +
        `Current status: "${wo.status}". ` +
        `Only draft work orders can be opened.`,
      );
    }

    // ── Aircraft total time validation ──────────────────────────────────────
    if (args.aircraftTotalTimeAtOpen < 0) {
      throw new Error(
        `aircraftTotalTimeAtOpen must be >= 0. Got: ${args.aircraftTotalTimeAtOpen}.`,
      );
    }

    const aircraft = await ctx.db.get(wo.aircraftId);
    if (!aircraft) {
      throw new Error(`Aircraft ${wo.aircraftId} not found. Cannot open work order.`);
    }

    // INV-18: Aircraft total time is monotonically increasing.
    // If the technician enters a value lower than the last known TT, throw.
    // Per Marcus: this is not a warning. A value lower than the last-known TT
    // is either a typo or a falsification flag. Do not provide an override path.
    if (args.aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours) {
      throw new Error(
        `INV-18: aircraftTotalTimeAtOpen (${args.aircraftTotalTimeAtOpen}h) is less than ` +
        `aircraft's last known total time (${aircraft.totalTimeAirframeHours}h). ` +
        `Aircraft total time is monotonically increasing. ` +
        `If this tachometer reading is correct, contact your Director of Maintenance ` +
        `before proceeding — this value will appear on all maintenance records for this event.`,
      );
    }

    // ── Concurrent work order guard ─────────────────────────────────────────
    // If another WO in an active status already exists for this aircraft,
    // the caller must explicitly acknowledge and provide a documented reason.
    // This prevents accidental concurrent work and creates a documented override trail.
    const concurrentWO = await ctx.db
      .query("workOrders")
      .withIndex("by_aircraft_status", (q) => q.eq("aircraftId", wo.aircraftId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "on_hold"),
          q.eq(q.field("status"), "pending_inspection"),
          q.eq(q.field("status"), "pending_signoff"),
          q.eq(q.field("status"), "open_discrepancies"),
        ),
      )
      .first();

    if (concurrentWO !== null) {
      if (
        !args.concurrentWorkOrderOverrideAcknowledged ||
        !args.concurrentWorkOrderReason?.trim()
      ) {
        throw new Error(
          `Aircraft ${wo.aircraftId} already has an active work order: ` +
          `"${concurrentWO.workOrderNumber}" (status: "${concurrentWO.status}"). ` +
          `To open a concurrent work order, set concurrentWorkOrderOverrideAcknowledged=true ` +
          `and provide a non-empty concurrentWorkOrderReason documenting the justification ` +
          `(e.g., "Warranty repair performed concurrently with scheduled 100-hour inspection ` +
          `per DOM authorization 2026-02-22").`,
        );
      }
    }

    // ── Technician assignment validation ────────────────────────────────────
    if (args.assignedTechnicianIds.length === 0) {
      throw new Error(
        `At least one technician must be assigned when opening a work order. ` +
        `Provide at least one technician ID in assignedTechnicianIds.`,
      );
    }

    for (const techId of args.assignedTechnicianIds) {
      const tech = await ctx.db.get(techId);
      if (!tech) {
        throw new Error(`Technician ${techId} not found.`);
      }
      if (tech.status !== "active") {
        throw new Error(
          `Technician ${techId} (${tech.legalName}) has status "${tech.status}". ` +
          `Only active technicians may be assigned to a work order.`,
        );
      }
      if (tech.organizationId !== args.organizationId) {
        throw new Error(
          `Technician ${techId} (${tech.legalName}) does not belong to ` +
          `organization ${args.organizationId}. ` +
          `Technicians must be members of the organization that owns the work order.`,
        );
      }
    }

    // ── Transition work order to open ───────────────────────────────────────
    await ctx.db.patch(args.workOrderId, {
      status: "open",
      aircraftTotalTimeAtOpen: args.aircraftTotalTimeAtOpen,
      ...(concurrentWO !== null && {
        concurrentWorkOrderOverrideAcknowledged: args.concurrentWorkOrderOverrideAcknowledged,
        concurrentWorkOrderReason: args.concurrentWorkOrderReason?.trim(),
      }),
      updatedAt: now,
    });

    // ── Audit log: status change ────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("draft"),
      newValue: JSON.stringify("open"),
      notes:
        `Work order opened. ` +
        `Aircraft TT at open: ${args.aircraftTotalTimeAtOpen}h. ` +
        `Technicians assigned: [${args.assignedTechnicianIds.join(", ")}]. ` +
        (concurrentWO
          ? `Concurrent WO override: reason="${args.concurrentWorkOrderReason?.trim()}".`
          : ""),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: closeWorkOrder
//
// Spec ref: work-order-engine.md §2.5, signoff-rts-flow.md §2.2
// Enforces: INV-06, INV-18, INV-19, INV-20, INV-05
//
// THE MOST HEAVILY GUARDED MUTATION IN THE SYSTEM.
//
// This is the regulatory point of return-to-service authorization. Six guard
// conditions must ALL pass. Per Marcus: every condition corresponds to a specific
// CFR requirement — these are not business rules, they are federal compliance rules.
//
// From Marcus's annotation in work-order-engine.md §2.5:
//   "A work order that transitions to 'closed' without a returnToService record
//   is not just a data error — it is a falsified maintenance record in an aircraft
//   logbook. Treat every guard condition as if a certificate holder's license
//   depends on it, because it does."
//
// Additional guards from phase-2-gate-review.md BP-01 and BP-02 (Marcus-flagged):
//   BP-01: Open interruptions (taskCardInterruptions with resumedAt == null) must block close.
//          NOTE: taskCardInterruptions is a Phase 2.1 schema extension. The check is
//          TODO'd below pending that extension.
//   BP-02: rts.aircraftHoursAtRts must equal wo.aircraftTotalTimeAtClose.
//          This cross-reference is enforced here per Marcus's explicit flag.
// ─────────────────────────────────────────────────────────────────────────────

export const closeWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // INV-06: Required at close. Must be >= aircraftTotalTimeAtOpen.
    // Source: the closing technician's physical tachometer/hobbs reading.
    aircraftTotalTimeAtClose: v.number(),

    // INV-19: The certificated individual performing the RTS authorization.
    closingTechnicianId: v.id("technicians"),

    // INV-20: The legal return-to-service statement per 14 CFR 43.9.
    // Per Marcus: A one-word entry is not legally defensible. Minimum 50 chars.
    returnToServiceStatement: v.string(),

    // INV-05: The signature auth event authorizing this RTS signing action.
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // DOM authorization (if Part 145 organization)
    domAuthorizationId: v.optional(v.id("technicians")),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch and validate work order ───────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.organizationId}.`,
      );
    }
    if (wo.status !== "pending_signoff") {
      throw new Error(
        `closeWorkOrder requires status "pending_signoff". ` +
        `Current status: "${wo.status}". ` +
        `All task cards must be complete and all discrepancies dispositioned ` +
        `before a work order can be closed.`,
      );
    }

    // ── GUARD 1: signatureAuthEvent validation (INV-05) ─────────────────────
    // Per signoff-rts-flow.md §2.2 PRECONDITION 1:
    //   Consumed check, expiry check, and technician identity check are all mandatory.
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05 / RTS_AUTH_EVENT_CONSUMED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} has already been consumed. ` +
        `Each auth event may only be used for a single signing action. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05 / RTS_AUTH_EVENT_EXPIRED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}. ` +
        `Auth events have a 5-minute TTL. Request a new re-authentication event.`,
      );
    }
    if (authEvent.technicianId !== args.closingTechnicianId) {
      throw new Error(
        `INV-05: signatureAuthEvent was issued to technician ${authEvent.technicianId} ` +
        `but the closing technician is ${args.closingTechnicianId}. ` +
        `Auth events are non-transferable.`,
      );
    }

    // ── GUARD 2: aircraftTotalTimeAtClose (INV-06 / INV-18) ─────────────────
    // This is the single most reliable indicator of falsified logbooks in FAA enforcement.
    if (args.aircraftTotalTimeAtClose < wo.aircraftTotalTimeAtOpen) {
      throw new Error(
        `INV-06 / INV-18 / RTS_TIME_DECREASED: ` +
        `aircraftTotalTimeAtClose (${args.aircraftTotalTimeAtClose}h) is less than ` +
        `aircraftTotalTimeAtOpen (${wo.aircraftTotalTimeAtOpen}h). ` +
        `Aircraft total time is monotonically increasing. ` +
        `A time-at-close less than time-at-open is a falsification flag. ` +
        `Do not proceed. Contact your Director of Maintenance immediately.`,
      );
    }

    // ── GUARD 3: closing technician validation (INV-19) ──────────────────────
    const closingTech = await ctx.db.get(args.closingTechnicianId);
    if (!closingTech || closingTech.status !== "active") {
      throw new Error(
        `INV-19 / RTS_TECH_INACTIVE: ` +
        `Closing technician ${args.closingTechnicianId} not found or is inactive. ` +
        `The RTS authorization must be performed by an active, certificated individual.`,
      );
    }

    // ── GUARD 4: All discrepancies must be dispositioned ─────────────────────
    // Per 14 CFR 43.11(a)(6): an open discrepancy on a closed WO means an aircraft
    // returned to service with an unresolved finding. This is a hard block.
    const openDiscrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "under_evaluation"),
        ),
      )
      .collect();

    if (openDiscrepancies.length > 0) {
      throw new Error(
        `RTS_OPEN_DISCREPANCIES: ${openDiscrepancies.length} discrepancy(ies) are still ` +
        `open or under evaluation on work order ${wo.workOrderNumber}. ` +
        `All discrepancies must be dispositioned before the work order can be closed. ` +
        `Open discrepancy IDs: [${openDiscrepancies.map((d) => d._id).join(", ")}].`,
      );
    }

    // ── GUARD 5: returnToService record must exist ───────────────────────────
    // The returnToService record is the 43.11 maintenance release record.
    // Per Marcus: "You cannot close without it." A work order with no RTS record
    // is an incomplete regulatory document.
    const rts = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (!rts) {
      throw new Error(
        `INV per schema / RTS_NO_MAINTENANCE_RECORDS: ` +
        `No returnToService record exists for work order ${wo.workOrderNumber}. ` +
        `A return-to-service record signed by a certificated technician must be created ` +
        `before the work order can be closed. ` +
        `Create the RTS record via authorizeReturnToService, then close.`,
      );
    }

    // ── GUARD 6 (BP-02 — Marcus-flagged): RTS hours must match close hours ───
    // From phase-2-gate-review.md BP-02 and signoff-rts-flow.md §2.2 PRECONDITION 3:
    //   rts.aircraftHoursAtRts must equal the work order's aircraftTotalTimeAtClose.
    if (rts.aircraftHoursAtRts !== args.aircraftTotalTimeAtClose) {
      throw new Error(
        `RTS_TIME_MISMATCH (BP-02): ` +
        `The returnToService record's aircraftHoursAtRts (${rts.aircraftHoursAtRts}h) ` +
        `does not match the provided aircraftTotalTimeAtClose (${args.aircraftTotalTimeAtClose}h). ` +
        `These values must be identical — the RTS hours are sourced from the work order's ` +
        `close reading, not from independent user input. ` +
        `Re-run authorizeReturnToService with the correct close time, or correct the WO close time.`,
      );
    }

    // ── GUARD 7: returnToServiceStatement non-empty (INV-20) ─────────────────
    // Per 14 CFR 43.9 and signoff-rts-flow.md §2.2 PRECONDITION 9.
    // Minimum 50 characters per the spec — a one-word entry is not defensible.
    if (!args.returnToServiceStatement.trim()) {
      throw new Error(
        `INV-20 / RTS_STATEMENT_EMPTY: returnToServiceStatement must be a non-empty string. ` +
        `Per 14 CFR 43.9, a return-to-service statement is required in every maintenance record.`,
      );
    }
    if (args.returnToServiceStatement.trim().length < 50) {
      throw new Error(
        `RTS_STATEMENT_TOO_SHORT: returnToServiceStatement must be at least 50 characters. ` +
        `Current length: ${args.returnToServiceStatement.trim().length}. ` +
        `The RTS statement is a legal certification — a one-sentence entry is the minimum. ` +
        `Include the regulatory citation (e.g., "per 14 CFR § 43.9") and aircraft identification.`,
      );
    }

    // ── GUARD 8: All task cards must be in terminal status ───────────────────
    // Per signoff-rts-flow.md §2.2 PRECONDITION 4:
    //   Every task card must be "complete" or "voided". A card in any active status
    //   is a hard block — there is open, unsigned work.
    const incompletTaskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "not_started"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "incomplete_na_steps"),
        ),
      )
      .collect();

    if (incompletTaskCards.length > 0) {
      throw new Error(
        `RTS_OPEN_TASK_CARDS: ${incompletTaskCards.length} task card(s) are not yet complete. ` +
        `All task cards must be in "complete" or "voided" status before the work order can be closed. ` +
        `Incomplete card IDs: [${incompletTaskCards.map((tc) => tc._id).join(", ")}]. ` +
        `Card numbers: [${incompletTaskCards.map((tc) => tc.taskCardNumber).join(", ")}].`,
      );
    }

    // ── TODO (BP-01 — Marcus-flagged, Phase 2.1): ─────────────────────────
    // When taskCardInterruptions table is added (schema extension SE-02):
    //   const openInterruptions = await ctx.db
    //     .query("taskCardInterruptions")
    //     .withIndex("by_work_order", q => q.eq("workOrderId", args.workOrderId))
    //     .filter(q => q.eq(q.field("resumedAt"), undefined))
    //     .collect();
    //   if (openInterruptions.length > 0) throw new Error(`${openInterruptions.length} open interruptions...`);

    // ── Consume signatureAuthEvent (INV-05) ──────────────────────────────────
    // This is atomic with the work order update in the same Convex transaction.
    // The Convex atomicity guarantee means: either the auth event is consumed
    // AND the WO is updated, or neither happens. No partial state is possible.
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "workOrders",
      consumedByRecordId: args.workOrderId,
    });

    // ── Close the work order (INV-19) ────────────────────────────────────────
    await ctx.db.patch(args.workOrderId, {
      status: "closed",
      closedAt: now,
      closedByUserId: callerUserId,
      closedByTechnicianId: args.closingTechnicianId,
      aircraftTotalTimeAtClose: args.aircraftTotalTimeAtClose,
      returnedToService: true,
      updatedAt: now,
    });

    // ── Update aircraft total time (INV-18) ──────────────────────────────────
    // The aircraft's totalTimeAirframeHours is the system's last-known TT snapshot.
    // We update it to the close reading. Only update if the new value is greater
    // (monotonic invariant — the aircraft may have had a more recent reading from
    // another shop that was recorded after this WO was opened).
    const aircraft = await ctx.db.get(wo.aircraftId);
    if (aircraft && args.aircraftTotalTimeAtClose > aircraft.totalTimeAirframeHours) {
      await ctx.db.patch(wo.aircraftId, {
        totalTimeAirframeHours: args.aircraftTotalTimeAtClose,
        totalTimeAirframeAsOfDate: now,
        updatedAt: now,
      });
    }

    // ── Audit log ───────────────────────────────────────────────────────────
    // signoff-rts-flow.md §6.5: Work order status → closed
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: callerUserId,
      technicianId: args.closingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("pending_signoff"),
      newValue: JSON.stringify("closed"),
      notes:
        `Work order ${wo.workOrderNumber} closed. ` +
        `Aircraft TT at close: ${args.aircraftTotalTimeAtClose}h. ` +
        `Closing technician: ${args.closingTechnicianId}. ` +
        `RTS record: ${rts._id}. ` +
        `RTS statement (first 100 chars): "${args.returnToServiceStatement.trim().substring(0, 100)}".`,
      timestamp: now,
    });

    // Aircraft total time updated audit log entry
    // signoff-rts-flow.md §6.5: Aircraft total time updated
    if (aircraft) {
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "aircraft",
        recordId: wo.aircraftId,
        userId: callerUserId,
        technicianId: args.closingTechnicianId,
        ipAddress: args.callerIpAddress,
        fieldName: "totalTimeAirframeHours",
        oldValue: JSON.stringify(aircraft.totalTimeAirframeHours),
        newValue: JSON.stringify(args.aircraftTotalTimeAtClose),
        notes: `Aircraft TT updated on work order ${wo.workOrderNumber} close.`,
        timestamp: now,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: voidWorkOrder
//
// Spec ref: work-order-engine.md §2.6
// Enforces: INV per schema (voidedByUserId, voidedAt, voidedReason required)
//
// Administratively void a work order created in error or that became inapplicable.
// Voiding is DISTINCT from cancellation:
//   voided = administrative error (records management)
//   cancelled = customer decision (business decision)
//
// A voided work order is a permanent audit record. Its number is permanently
// reserved — it cannot be reused. The chain of custody is preserved.
//
// Per Marcus (work-order-engine.md §2.6):
//   "A work order with signed maintenance records cannot be voided — the records
//   are immutable legal documents. The work order must remain to anchor them."
// ─────────────────────────────────────────────────────────────────────────────

export const voidWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    voidedReason: v.string(),

    // The technician making the void decision (for audit; must be active)
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch and validate work order ───────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.organizationId}.`,
      );
    }

    // ── Status guard: only draft, open, on_hold are voidable ────────────────
    // Per work-order-engine.md §2.6:
    //   in_progress, pending_inspection, pending_signoff, open_discrepancies,
    //   closed, cancelled, and voided are NOT voidable.
    //   Work in progress cannot be voided — the chain of signed records must be preserved.
    const isVoidable = (VOIDABLE_WO_STATUSES as readonly string[]).includes(wo.status);
    if (!isVoidable) {
      throw new Error(
        `voidWorkOrder: Work order "${wo.workOrderNumber}" has status "${wo.status}" ` +
        `which is not voidable. ` +
        `Only draft, open, and on_hold work orders may be voided. ` +
        `Work orders with active or completed work cannot be voided. ` +
        `If work has already begun, contact your DOM — this may require a formal ` +
        `discrepancy entry and a corrective maintenance record.`,
      );
    }

    // ── Guard: No signed maintenance records may be linked to this WO ────────
    // Per Marcus: a signed maintenance record is a permanent entry in the aircraft's
    // permanent maintenance history. The WO number is its chain-of-custody anchor.
    // If the WO is voided, any future inquiry encounters a broken chain.
    const signedRecord = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (signedRecord !== null) {
      throw new Error(
        `voidWorkOrder: Work order "${wo.workOrderNumber}" has at least one signed ` +
        `maintenance record (record ID: ${signedRecord._id}). ` +
        `Work orders with signed maintenance records cannot be voided — maintenance ` +
        `records are immutable legal documents under 14 CFR 91.417. ` +
        `The work order number must remain to anchor those records. ` +
        `Contact your Director of Maintenance for guidance on correcting the chain of custody.`,
      );
    }

    // ── voidedReason must be non-empty ───────────────────────────────────────
    if (!args.voidedReason.trim()) {
      throw new Error(
        `voidedReason must be a non-empty string. ` +
        `The reason for voiding a work order is a required audit record.`,
      );
    }

    // Validate the calling technician
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech || callerTech.status !== "active") {
      throw new Error(
        `Calling technician ${args.callerTechnicianId} not found or inactive.`,
      );
    }

    // ── Void the work order ──────────────────────────────────────────────────
    const previousStatus = wo.status;
    await ctx.db.patch(args.workOrderId, {
      status: "voided",
      voidedByUserId: callerUserId,
      voidedAt: now,
      voidedReason: args.voidedReason.trim(),
      updatedAt: now,
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify(previousStatus),
      newValue: JSON.stringify("voided"),
      notes:
        `Work order "${wo.workOrderNumber}" voided from status "${previousStatus}". ` +
        `Reason: ${args.voidedReason.trim()}. ` +
        `WO number is permanently reserved and may not be reused.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listWorkOrders
//
// Spec ref: work-order-engine.md §3 (Q-WO-01, Q-WO-04)
//
// Returns a paginated list of work orders for an organization, optionally filtered
// by status and/or priority. All results are org-scoped — cross-org queries are
// architecturally impossible.
//
// Convex pagination is cursor-based via paginationOptsValidator. The frontend
// uses useQuery with pagination opts for infinite-scroll behavior.
// ─────────────────────────────────────────────────────────────────────────────

export const listWorkOrders = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(workOrderStatusValidator),
    priority: v.optional(priorityValidator),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.status) {
      // Status-filtered query uses the by_status index
      // (organizationId, status) — correct for this access pattern
      const result = await ctx.db
        .query("workOrders")
        .withIndex("by_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("status", args.status!),
        )
        .paginate(args.paginationOpts);

      // Enrich each WO with denormalized aircraft data for list rendering
      const enriched = await Promise.all(
        result.page.map(async (wo) => {
          const aircraft = await ctx.db.get(wo.aircraftId);
          return {
            ...wo,
            aircraft: aircraft
              ? {
                  make: aircraft.make,
                  model: aircraft.model,
                  serialNumber: aircraft.serialNumber,
                  currentRegistration: aircraft.currentRegistration,
                  status: aircraft.status,
                }
              : null,
          };
        }),
      );

      return { ...result, page: enriched };
    }

    if (args.priority) {
      // Priority-filtered query uses the by_priority index
      // (organizationId, priority, status)
      // We return all non-terminal statuses for the given priority
      const result = await ctx.db
        .query("workOrders")
        .withIndex("by_priority", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("priority", args.priority!),
        )
        .filter((q) =>
          q.and(
            q.neq(q.field("status"), "closed"),
            q.neq(q.field("status"), "voided"),
            q.neq(q.field("status"), "cancelled"),
          ),
        )
        .paginate(args.paginationOpts);

      const enriched = await Promise.all(
        result.page.map(async (wo) => {
          const aircraft = await ctx.db.get(wo.aircraftId);
          return {
            ...wo,
            aircraft: aircraft
              ? {
                  make: aircraft.make,
                  model: aircraft.model,
                  serialNumber: aircraft.serialNumber,
                  currentRegistration: aircraft.currentRegistration,
                  status: aircraft.status,
                }
              : null,
          };
        }),
      );

      return { ...result, page: enriched };
    }

    // No filter: return all org WOs paginated
    const result = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .paginate(args.paginationOpts);

    const enriched = await Promise.all(
      result.page.map(async (wo) => {
        const aircraft = await ctx.db.get(wo.aircraftId);
        return {
          ...wo,
          aircraft: aircraft
            ? {
                make: aircraft.make,
                model: aircraft.model,
                serialNumber: aircraft.serialNumber,
                currentRegistration: aircraft.currentRegistration,
                status: aircraft.status,
              }
            : null,
        };
      }),
    );

    return { ...result, page: enriched };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getWorkOrder
//
// Spec ref: work-order-engine.md §3 (Q-WO-03)
//
// Returns a single work order with:
//   - Full work order document
//   - Aircraft with full identification fields
//   - All task cards (with step counts for progress display)
//   - All discrepancies (with disposition)
//   - returnToService record (if exists)
//   - Audit trail summary (most recent 20 events)
//
// Org scope: verified — the WO's organizationId must match the requested org.
// If a cross-org request is made, we throw — we do not silently return null,
// because a null response could be confused with "WO not found."
// ─────────────────────────────────────────────────────────────────────────────

export const getWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Fetch work order
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;

    // Org scope check — throw if cross-org access is attempted
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Access denied: Work order ${args.workOrderId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // Fetch related data concurrently where possible
    const [aircraft, taskCards, discrepancies, rts] = await Promise.all([
      ctx.db.get(wo.aircraftId),
      ctx.db
        .query("taskCards")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("discrepancies")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("returnToService")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first(),
    ]);

    // Fetch task card steps for each task card
    // These are needed for the progress bar and step-level status display.
    // We use by_task_card_step (includes stepNumber) so we get steps in order.
    const taskCardsWithSteps = await Promise.all(
      taskCards.map(async (tc) => {
        const steps = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card_step", (q) => q.eq("taskCardId", tc._id))
          .collect();
        return { ...tc, steps };
      }),
    );

    // Fetch closing technician name if WO is closed
    let closingTechnicianName: string | null = null;
    if (wo.closedByTechnicianId) {
      const tech = await ctx.db.get(wo.closedByTechnicianId);
      closingTechnicianName = tech?.legalName ?? null;
    }

    // Recent audit events for this WO (last 20)
    const auditEvents = await ctx.db
      .query("auditLog")
      .withIndex("by_record", (q) =>
        q.eq("tableName", "workOrders").eq("recordId", args.workOrderId),
      )
      .order("desc")
      .take(20);

    return {
      workOrder: wo,
      aircraft,
      taskCards: taskCardsWithSteps,
      discrepancies,
      returnToService: rts ?? null,
      closingTechnicianName,
      auditEvents,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getCloseReadiness
//
// Spec ref: work-order-engine.md §3 (Q-WO-09)
//
// Pre-flight check before presenting the close work order modal.
// Returns a structured readiness report — NOT a boolean.
// The close mutation enforces the same rules, but showing them before the user
// clicks "close" reduces failed mutations and improves IA UX.
//
// Per Devraj's note in the spec:
//   "This query should be called client-side before closeWorkOrder to give the
//   user a friendly pre-flight check. The mutation enforces the same rules."
//
// This is a read-only query — no writes.
// ─────────────────────────────────────────────────────────────────────────────

export const getCloseReadiness = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;
    if (wo.organizationId !== args.organizationId) return null;

    const blockers: string[] = [];

    // Check 1: Status
    if (wo.status !== "pending_signoff") {
      blockers.push(
        `Work order status is "${wo.status}", not "pending_signoff". ` +
        `Complete all task cards and disposition all discrepancies first.`,
      );
    }

    // Check 2: Open discrepancies
    const openDiscrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "under_evaluation"),
        ),
      )
      .collect();
    const openDiscrepancyCount = openDiscrepancies.length;
    if (openDiscrepancyCount > 0) {
      blockers.push(
        `${openDiscrepancyCount} discrepancy(ies) are still open or under evaluation.`,
      );
    }

    // Check 3: Incomplete task cards
    const incompleteTaskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "not_started"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "incomplete_na_steps"),
        ),
      )
      .collect();
    const incompleteTaskCardCount = incompleteTaskCards.length;
    if (incompleteTaskCardCount > 0) {
      blockers.push(
        `${incompleteTaskCardCount} task card(s) are not yet complete: ` +
        `[${incompleteTaskCards.map((tc) => tc.taskCardNumber).join(", ")}].`,
      );
    }

    // Check 4: Return to service record
    const rts = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();
    const hasRtsRecord = rts !== null;
    if (!hasRtsRecord) {
      blockers.push("No return-to-service record has been created for this work order.");
    }

    // Check 5: Aircraft total time at open is a real value (not sentinel 0)
    const aircraftTotalTimeAtOpenRecorded = wo.aircraftTotalTimeAtOpen > 0;
    if (!aircraftTotalTimeAtOpenRecorded) {
      blockers.push("Aircraft total time at open has not been recorded (work order was never formally opened).");
    }

    // Check 6: RTS hours match WO close hours (if both are set)
    if (rts && wo.aircraftTotalTimeAtClose !== undefined) {
      if (rts.aircraftHoursAtRts !== wo.aircraftTotalTimeAtClose) {
        blockers.push(
          `RTS aircraft hours (${rts.aircraftHoursAtRts}h) do not match ` +
          `work order close hours (${wo.aircraftTotalTimeAtClose}h). ` +
          `These must be identical.`,
        );
      }
    }

    return {
      canClose: blockers.length === 0 && wo.status === "pending_signoff",
      workOrderStatus: wo.status,
      openDiscrepancyCount,
      incompleteTaskCardCount,
      hasRtsRecord,
      aircraftTotalTimeAtOpenRecorded,
      blockers,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createSignatureAuthEvent
//
// MVP implementation: creates a 5-minute re-authentication token that authorizes
// a single signing action (step sign-off, card sign-off, WO close, or RTS).
//
// In production this would be triggered by a Clerk webhook after PIN/biometric
// re-authentication. For the MVP demo, the UI collects the technician PIN and
// passes it here — the mutation issues the token (PIN validation is a TODO).
//
// Per signoff-rts-flow.md §1.2:
//   A signatureAuthEvent must be created immediately before the signing action.
//   It is single-use (INV-05): consumed atomically with the signing mutation.
//   TTL is 5 minutes (300_000 ms). Expired events are rejected by all consumers.
// ─────────────────────────────────────────────────────────────────────────────

export const createSignatureAuthEvent = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),

    // The intended signing context (for audit trail)
    intendedTable: v.string(), // e.g. "taskCardSteps", "taskCards", "workOrders", "returnToService"
    intendedRecordHash: v.optional(v.string()),

    // MVP: PIN is accepted but not cryptographically verified in this phase.
    // Phase 2.1 TODO: verify PIN hash against technician.pinHash using bcrypt.
    pin: v.string(),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{ eventId: Id<"signatureAuthEvents">; expiresAt: number }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // Validate technician exists and belongs to org
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) {
      throw new Error(`Technician ${args.technicianId} not found.`);
    }
    if (tech.organizationId !== args.organizationId) {
      throw new Error(
        `Technician ${args.technicianId} does not belong to organization ${args.organizationId}.`,
      );
    }
    if (tech.status !== "active") {
      throw new Error(
        `Technician ${args.technicianId} (${tech.legalName}) is not active. ` +
        `Only active technicians may create signature auth events.`,
      );
    }

    // Validate PIN length (basic format check — real validation in Phase 2.1)
    if (!args.pin || args.pin.trim().length < 4) {
      throw new Error(
        `PIN must be at least 4 digits. ` +
        `For the MVP, any 4+ digit PIN is accepted. ` +
        `Phase 2.1 will enforce the stored PIN hash.`,
      );
    }

    // Look up the technician's active certificate for the auth record
    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    const expiresAt = now + 5 * 60 * 1000; // 5-minute TTL

    const eventId = await ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `mvp_evt_${now}_${args.technicianId}`,
      clerkSessionId: callerUserId,
      userId: callerUserId,
      technicianId: args.technicianId,
      authenticatedLegalName: tech.legalName,
      authenticatedCertNumber: cert?.certificateNumber ?? "PENDING",
      authMethod: "pin",
      intendedTable: args.intendedTable,
      intendedRecordHash: args.intendedRecordHash,
      ipAddress: args.callerIpAddress,
      authenticatedAt: now,
      expiresAt,
      consumed: false,
    });

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "signatureAuthEvents",
      recordId: eventId,
      userId: callerUserId,
      technicianId: args.technicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `Signature auth event created for ${tech.legalName}. ` +
        `Intended table: ${args.intendedTable}. ` +
        `Expires: ${new Date(expiresAt).toISOString()}. ` +
        `Auth method: PIN (MVP — hash verification TODO Phase 2.1).`,
      timestamp: now,
    });

    return { eventId, expiresAt };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: countActive
//
// Returns the count of active (non-terminal) work orders for an org.
// Used by the Dashboard stats panel.
// Active statuses: open, in_progress, on_hold, pending_inspection,
//                  pending_signoff, open_discrepancies
// ─────────────────────────────────────────────────────────────────────────────

export const countActive = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const activeStatuses = [
      "open",
      "in_progress",
      "on_hold",
      "pending_inspection",
      "pending_signoff",
      "open_discrepancies",
    ] as const;

    let total = 0;
    for (const status of activeStatuses) {
      const rows = await ctx.db
        .query("workOrders")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status),
        )
        .collect();
      total += rows.length;
    }
    return total;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listActive
//
// Returns up to `limit` active (non-terminal) work orders for an org,
// enriched with aircraft data. Used by the Dashboard active WO panel.
// ─────────────────────────────────────────────────────────────────────────────

export const listActive = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activeStatuses = [
      "open",
      "in_progress",
      "on_hold",
      "pending_inspection",
      "pending_signoff",
      "open_discrepancies",
    ] as const;

    const limit = args.limit ?? 10;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];

    for (const status of activeStatuses) {
      if (results.length >= limit) break;
      const rows = await ctx.db
        .query("workOrders")
        .withIndex("by_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status),
        )
        .take(limit - results.length);

      for (const wo of rows) {
        const aircraft = await ctx.db.get(wo.aircraftId);
        results.push({
          _id: wo._id,
          workOrderNumber: wo.workOrderNumber,
          status: wo.status,
          description: wo.description,
          openedAt: wo.openedAt,
          aircraft: aircraft
            ? {
                currentRegistration: aircraft.currentRegistration,
                make: aircraft.make,
                model: aircraft.model,
              }
            : null,
        });
      }
    }

    return results.slice(0, limit);
  },
});
