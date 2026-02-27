// convex/discrepancies.ts
// Athelon — Aviation MRO SaaS Platform
//
// Discrepancy Management Module — Phase 4 Implementation
//
// Implements the three mutations specified in the Phase 4 task brief:
//   - openDiscrepancy: links to work order, all required fields
//   - dispositionDiscrepancy: corrected/deferred/no-fault-found with required docs
//   - deferDiscrepancy: MEL reference required, expiry date required
//
// Cross-references:
//   convex-schema-v2.md (FROZEN 2026-02-22) — schema invariants INV-16, INV-17
//   phase-2-signoff/signoff-rts-flow.md §2.2 PRECONDITION 5 — RTS blocking rules
//   phase-3-implementation/convex/schema.ts — discrepancies table definition
//
// Author:     Devraj Anand (Phase 4 Implementation)
// Regulatory: Marcus Webb
// QA:         Cilla Oduya
//
// ─── DESIGN NOTES ───────────────────────────────────────────────────────────
//
// Discrepancies (squawks, findings) are the open-ended findings generated
// during maintenance. Every discrepancy must be resolved before an aircraft
// can be returned to service — this is enforced by authorizeReturnToService
// PRECONDITION 5.
//
// INV-16: When disposition == "corrected":
//   correctiveAction AND correctiveMaintenanceRecordId must both be set.
//
// INV-17: When disposition == "deferred_mel":
//   melItemNumber, melCategory, melDeferralDate, melExpiryDate must all be set.
//   melExpiryDate must equal melDeferralDate + category_interval.
//
// MEL EXPIRY COMPUTATION (INV-17):
//   Category A: 10 calendar days
//   Category B: 3 calendar days
//   Category C: 120 calendar days
//   Category D: No calendar limit — melExpiryDate set to null (no expiry)
//
// NO SOFT BLOCKS: Every guard that enforces a regulatory requirement throws.
// If the system allows a discrepancy to be dispositioned without documentation,
// that is a compliance failure, not a UX preference.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// MEL CATEGORY EXPIRY INTERVALS
// Per signoff-rts-flow.md §2.2 PRECONDITION 5 and schema INV-17
// ─────────────────────────────────────────────────────────────────────────────

const MEL_CATEGORY_INTERVALS_MS: Record<string, number | null> = {
  A: 10 * 24 * 60 * 60 * 1000,   // 10 calendar days
  B: 3 * 24 * 60 * 60 * 1000,    // 3 calendar days
  C: 120 * 24 * 60 * 60 * 1000,  // 120 calendar days
  D: null,                         // No calendar limit
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: REQUIRE AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session.",
    );
  }
  return identity.subject;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: GENERATE DISCREPANCY NUMBER
//
// Discrepancy numbers are work-order-scoped, sequential human-readable IDs.
// Format: WO-{workOrderNumber}-DISC-{N} (e.g., WO-2024-0045-DISC-3)
//
// We count existing discrepancies for this work order and increment.
// This is an optimistic approach — in high-concurrency scenarios, two concurrent
// openDiscrepancy calls for the same work order could generate the same number.
// TODO: Phase 4.1 — Implement a Convex counter document per work order for
// true atomic sequential numbering without conflicts.
// ─────────────────────────────────────────────────────────────────────────────

async function generateDiscrepancyNumber(
  ctx: { db: any },
  workOrderId: Id<"workOrders">,
  workOrderNumber: string,
): Promise<string> {
  const existingCount = await ctx.db
    .query("discrepancies")
    .withIndex("by_work_order", (q: any) => q.eq("workOrderId", workOrderId))
    .collect()
    .then((records: { _id: string }[]) => records.length);

  const sequenceNumber = existingCount + 1;
  return `WO-${workOrderNumber}-DISC-${sequenceNumber}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: openDiscrepancy
//
// Creates a new discrepancy record linked to an open work order.
// The discrepancy starts in "open" status.
//
// Required fields: description, foundDuring, foundByTechnicianId,
//                  foundAtAircraftHours, workOrderId, aircraftId, organizationId
//
// This mutation does not require a signatureAuthEvent — finding a discrepancy
// is not a signing act. The finding is attributed to the technician via
// foundByTechnicianId, not a cryptographic signature.
//
// Per schema: foundAtAircraftHours >= 0 (invariant enforced in mutation).
// ─────────────────────────────────────────────────────────────────────────────

export const openDiscrepancy = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    description: v.string(),    // Required — what was found

    foundDuring: v.union(
      v.literal("annual_inspection"),
      v.literal("100hr_inspection"),
      v.literal("progressive_inspection"),
      v.literal("routine_maintenance"),
      v.literal("preflight"),
      v.literal("pilot_report"),
      v.literal("ad_compliance_check"),
      v.literal("other"),
    ),

    foundByTechnicianId: v.id("technicians"),
    foundAtAircraftHours: v.number(),    // INVARIANT: >= 0

    componentAffected: v.optional(v.string()),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    componentPosition: v.optional(v.string()),

    // Aircraft system classification (Phase 1 — Squawks Unification)
    aircraftSystem: v.optional(v.union(
      v.literal("airframe"),
      v.literal("engine_left"),
      v.literal("engine_right"),
      v.literal("engine_center"),
      v.literal("engine_single"),
      v.literal("avionics"),
      v.literal("landing_gear"),
      v.literal("fuel_system"),
      v.literal("hydraulics"),
      v.literal("electrical"),
      v.literal("other"),
    )),
    squawkOrigin: v.optional(v.union(
      v.literal("inspection_finding"),
      v.literal("customer_reported"),
      v.literal("rts_finding"),
      v.literal("routine_check"),
      v.literal("ad_compliance_check"),
    )),
    isInspectionItem: v.optional(v.boolean()),
    isCustomerReported: v.optional(v.boolean()),
    foundDuringRts: v.optional(v.boolean()),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),

    // ── OP-1003 Classification Fields ──────────────────────────────────────────
    discrepancyType: v.optional(v.union(
      v.literal("mandatory"),
      v.literal("recommended"),
      v.literal("customer_information"),
      v.literal("ops_check"),
    )),
    systemType: v.optional(v.union(
      v.literal("airframe"),
      v.literal("engine"),
      v.literal("propeller"),
      v.literal("appliance"),
    )),
    discoveredWhen: v.optional(v.union(
      v.literal("customer_report"),
      v.literal("planning"),
      v.literal("inspection"),
      v.literal("post_quote"),
    )),
    riiRequired: v.optional(v.boolean()),
    stcRelated: v.optional(v.boolean()),
    stcNumber: v.optional(v.string()),
    mhEstimate: v.optional(v.number()),
    writtenByTechnicianId: v.optional(v.id("technicians")),
  },

  handler: async (ctx, args): Promise<Id<"discrepancies">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Validate description is non-empty ─────────────────────────────────────
    if (!args.description.trim()) {
      throw new Error(
        `DISC_DESCRIPTION_EMPTY: description must be a non-empty string. ` +
        `A discrepancy without a description is not documentable.`,
      );
    }

    // ── Validate foundAtAircraftHours >= 0 (schema INV) ──────────────────────
    if (args.foundAtAircraftHours < 0) {
      throw new Error(
        `DISC_HOURS_NEGATIVE: foundAtAircraftHours must be >= 0. ` +
        `Received: ${args.foundAtAircraftHours}.`,
      );
    }

    // ── Verify work order exists and is open/in_progress ─────────────────────
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${args.workOrderId} not found.`);
    }
    if (workOrder.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }
    if (
      workOrder.status !== "open" &&
      workOrder.status !== "in_progress" &&
      workOrder.status !== "pending_inspection" &&
      workOrder.status !== "pending_signoff" &&
      workOrder.status !== "open_discrepancies"
    ) {
      throw new Error(
        `DISC_WO_WRONG_STATUS: ` +
        `Work order ${args.workOrderId} has status "${workOrder.status}". ` +
        `Discrepancies can only be opened on work orders that are not closed, ` +
        `cancelled, or voided. ` +
        `Status "${workOrder.status}" does not permit new discrepancy creation.`,
      );
    }

    // ── Verify finding technician exists and is active ─────────────────────────
    const findingTech = await ctx.db.get(args.foundByTechnicianId);
    if (!findingTech) {
      throw new Error(`Technician ${args.foundByTechnicianId} not found.`);
    }
    if (findingTech.status !== "active") {
      throw new Error(
        `DISC_TECH_INACTIVE: ` +
        `Technician ${args.foundByTechnicianId} (${findingTech.legalName}) ` +
        `has status "${findingTech.status}". ` +
        `Only active technicians may open discrepancies.`,
      );
    }

    // ── Verify aircraft ID from work order ────────────────────────────────────
    const aircraftId = workOrder.aircraftId;

    // ── Generate discrepancy number ───────────────────────────────────────────
    const discrepancyNumber = await generateDiscrepancyNumber(
      ctx,
      args.workOrderId,
      workOrder.workOrderNumber,
    );

    // ── Create the discrepancy record ─────────────────────────────────────────
    const discrepancyId = await ctx.db.insert("discrepancies", {
      workOrderId: args.workOrderId,
      aircraftId,
      organizationId: args.organizationId,
      discrepancyNumber,
      status: "open",
      disposition: undefined,
      foundDuring: args.foundDuring,
      description: args.description.trim(),
      componentAffected: args.componentAffected?.trim(),
      componentPartNumber: args.componentPartNumber?.trim(),
      componentSerialNumber: args.componentSerialNumber?.trim(),
      componentPosition: args.componentPosition?.trim(),
      foundByTechnicianId: args.foundByTechnicianId,
      foundAt: now,
      foundAtAircraftHours: args.foundAtAircraftHours,
      // Phase 1 — Squawks Unification fields (all optional)
      ...(args.aircraftSystem !== undefined && { aircraftSystem: args.aircraftSystem }),
      ...(args.squawkOrigin !== undefined && { squawkOrigin: args.squawkOrigin }),
      ...(args.isInspectionItem !== undefined && { isInspectionItem: args.isInspectionItem }),
      ...(args.isCustomerReported !== undefined && { isCustomerReported: args.isCustomerReported }),
      ...(args.foundDuringRts !== undefined && { foundDuringRts: args.foundDuringRts }),
      // OP-1003 classification fields
      ...(args.discrepancyType !== undefined && { discrepancyType: args.discrepancyType }),
      ...(args.systemType !== undefined && { systemType: args.systemType }),
      ...(args.discoveredWhen !== undefined && { discoveredWhen: args.discoveredWhen }),
      ...(args.riiRequired !== undefined && { riiRequired: args.riiRequired }),
      ...(args.stcRelated !== undefined && { stcRelated: args.stcRelated }),
      ...(args.stcNumber !== undefined && { stcNumber: args.stcNumber }),
      ...(args.mhEstimate !== undefined && { mhEstimate: args.mhEstimate }),
      ...(args.writtenByTechnicianId !== undefined && { writtenByTechnicianId: args.writtenByTechnicianId }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "discrepancies",
      recordId: discrepancyId,
      userId: callerUserId,
      technicianId: args.foundByTechnicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `Discrepancy ${discrepancyNumber} opened on work order ${workOrder.workOrderNumber}. ` +
        `Found during: ${args.foundDuring}. ` +
        `Aircraft hours: ${args.foundAtAircraftHours}h. ` +
        `Component: ${args.componentAffected ?? "not specified"}. ` +
        `Description: "${args.description.trim()}". ` +
        `Found by: ${findingTech.legalName}.`,
      timestamp: now,
    });

    return discrepancyId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: dispositionDiscrepancy
//
// Records the disposition of a discrepancy: corrected, deferred, or no-fault.
// Enforces schema invariants INV-16 and INV-17.
//
// DISPOSITIONS:
//   corrected — INV-16: correctiveAction AND correctiveMaintenanceRecordId required
//   deferred_mel — INV-17: MEL fields required; use deferDiscrepancy for this
//   deferred_grounded — aircraft is grounded; no MEL fields required
//   no_fault_found — standard no-fault finding
//   no_fault_found_could_not_reproduce — could not reproduce the reported issue
//
// Note on deferred_mel: this mutation handles the disposition transition and
// validation. For the specific MEL deferral workflow (which requires the caller
// to provide melCategory, melItemNumber, and optional explicit melExpiryDate),
// use deferDiscrepancy instead. dispositionDiscrepancy does support
// deferred_mel as a disposition but requires all MEL fields to be provided.
//
// A signatureAuthEvent is required for corrected dispositions because those
// represent a certified technician's determination that work was performed.
// No auth event is needed for no-fault-found (an observation, not certified work).
// ─────────────────────────────────────────────────────────────────────────────

export const dispositionDiscrepancy = mutation({
  args: {
    discrepancyId: v.id("discrepancies"),
    organizationId: v.id("organizations"),

    disposition: v.union(
      v.literal("corrected"),
      v.literal("deferred_grounded"),
      v.literal("no_fault_found"),
      v.literal("no_fault_found_could_not_reproduce"),
    ),

    // Required for "corrected" disposition (INV-16)
    signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
    correctiveAction: v.optional(v.string()),
    correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),

    // Required for "deferred_grounded" disposition
    deferredReason: v.optional(v.string()),

    // Notes for no-fault findings
    noFaultNotes: v.optional(v.string()),

    // Who is dispositioning
    dispositionedByTechnicianId: v.id("technicians"),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch discrepancy ─────────────────────────────────────────────────────
    const discrepancy = await ctx.db.get(args.discrepancyId);
    if (!discrepancy) {
      throw new Error(`Discrepancy ${args.discrepancyId} not found.`);
    }
    if (discrepancy.organizationId !== args.organizationId) {
      throw new Error(
        `Discrepancy ${args.discrepancyId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // ── Cannot re-disposition an already-dispositioned discrepancy ────────────
    if (discrepancy.status === "dispositioned") {
      throw new Error(
        `DISC_ALREADY_DISPOSITIONED: ` +
        `Discrepancy ${args.discrepancyId} (${discrepancy.discrepancyNumber}) ` +
        `has already been dispositioned as "${discrepancy.disposition}". ` +
        `A dispositioned discrepancy cannot be re-dispositioned. ` +
        `If the disposition was made in error, contact your Director of Maintenance ` +
        `to create a corrective record.`,
      );
    }

    // ── Verify technician ─────────────────────────────────────────────────────
    const tech = await ctx.db.get(args.dispositionedByTechnicianId);
    if (!tech) {
      throw new Error(
        `Technician ${args.dispositionedByTechnicianId} not found.`,
      );
    }
    if (tech.status !== "active") {
      throw new Error(
        `DISC_TECH_INACTIVE: ` +
        `Technician ${args.dispositionedByTechnicianId} has status "${tech.status}". ` +
        `Only active technicians may disposition discrepancies.`,
      );
    }

    let consumedAuthEventId: Id<"signatureAuthEvents"> | undefined;

    if (args.disposition === "corrected") {
      // ── INV-16: correctiveAction AND correctiveMaintenanceRecordId required ──
      if (!args.correctiveAction?.trim()) {
        throw new Error(
          `INV-16 / DISC_CORRECTIVE_ACTION_EMPTY: ` +
          `Disposition "corrected" requires a non-empty correctiveAction. ` +
          `Describe what was done to correct the discrepancy ` +
          `(e.g., "Replaced faulty fuel selector valve per IPC Fig 29-10-01 Item 5. ` +
          `Functional check performed — system normal.").`,
        );
      }
      if (!args.correctiveMaintenanceRecordId) {
        throw new Error(
          `INV-16 / DISC_CORRECTIVE_RECORD_REQUIRED: ` +
          `Disposition "corrected" requires a correctiveMaintenanceRecordId. ` +
          `The corrective work must be documented in a signed maintenance record ` +
          `before the discrepancy can be closed as corrected. ` +
          `Create and sign a maintenance record for the corrective work first.`,
        );
      }

      // Verify the maintenance record exists and is signed
      const maintRecord = await ctx.db.get(args.correctiveMaintenanceRecordId);
      if (!maintRecord) {
        throw new Error(
          `DISC_MAINT_RECORD_NOT_FOUND: ` +
          `Maintenance record ${args.correctiveMaintenanceRecordId} not found. ` +
          `The correctiveMaintenanceRecordId must reference an existing maintenance record.`,
        );
      }
      if (!maintRecord.signatureHash?.trim()) {
        throw new Error(
          `DISC_CORRECTIVE_RECORD_UNSIGNED: ` +
          `Maintenance record ${args.correctiveMaintenanceRecordId} is not signed ` +
          `(no signatureHash). ` +
          `The corrective maintenance record must be signed by a certificated technician ` +
          `before it can be used to close a corrected discrepancy.`,
        );
      }
      // Verify record is for the same aircraft
      if (maintRecord.aircraftId !== discrepancy.aircraftId) {
        throw new Error(
          `DISC_RECORD_AIRCRAFT_MISMATCH: ` +
          `Maintenance record ${args.correctiveMaintenanceRecordId} is for aircraft ` +
          `${maintRecord.aircraftId}, but discrepancy ${args.discrepancyId} is for ` +
          `aircraft ${discrepancy.aircraftId}. ` +
          `The corrective maintenance record must be for the same aircraft.`,
        );
      }

      // Corrected dispositions require signature auth event
      if (!args.signatureAuthEventId) {
        throw new Error(
          `DISC_CORRECTED_NEEDS_AUTH: ` +
          `Closing a discrepancy as "corrected" is a certified act requiring ` +
          `a signatureAuthEventId. ` +
          `Request a re-authentication event and provide it with this call.`,
        );
      }

      // Validate and consume auth event
      const authEvent = await ctx.db.get(args.signatureAuthEventId);
      if (!authEvent) {
        throw new Error(`signatureAuthEvent ${args.signatureAuthEventId} not found.`);
      }
      if (authEvent.consumed) {
        throw new Error(`INV-05: signatureAuthEvent ${args.signatureAuthEventId} already consumed.`);
      }
      if (authEvent.expiresAt < now) {
        throw new Error(`INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired.`);
      }
      await ctx.db.patch(args.signatureAuthEventId, {
        consumed: true,
        consumedAt: now,
        consumedByTable: "discrepancies",
        consumedByRecordId: args.discrepancyId,
      });
      consumedAuthEventId = args.signatureAuthEventId;

    } else if (args.disposition === "deferred_grounded") {
      // Grounded deferral requires a reason
      if (!args.deferredReason?.trim()) {
        throw new Error(
          `DISC_DEFERRED_REASON_REQUIRED: ` +
          `Disposition "deferred_grounded" requires a non-empty deferredReason. ` +
          `Specify why the aircraft is grounded and what is required before it ` +
          `may return to service (e.g., "Awaiting replacement hydraulic actuator P/N XYZ-123. ` +
          `Aircraft grounded until part received and installed.").`,
        );
      }

    } else if (
      args.disposition === "no_fault_found" ||
      args.disposition === "no_fault_found_could_not_reproduce"
    ) {
      // No-fault findings benefit from notes but do not require them
      // (some squawks have no additional context beyond the pilot report)
    }

    // ── Fetch dispositioner's certificate for the record ──────────────────────
    const dispositionerCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.dispositionedByTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    // ── Update the discrepancy record ─────────────────────────────────────────
    const patchData: Record<string, unknown> = {
      status: "dispositioned",
      disposition: args.disposition,
      dispositionedByTechnicianId: args.dispositionedByTechnicianId,
      dispositionedAt: now,
      dispositionedCertificateNumber: dispositionerCert?.certificateNumber,
      updatedAt: now,
    };

    if (args.disposition === "corrected") {
      patchData.correctiveAction = args.correctiveAction!.trim();
      patchData.correctiveMaintenanceRecordId = args.correctiveMaintenanceRecordId;
    }
    if (args.disposition === "deferred_grounded" && args.deferredReason) {
      patchData.correctiveAction =
        `GROUNDED — Reason: ${args.deferredReason.trim()}`;
    }
    if (
      (args.disposition === "no_fault_found" ||
        args.disposition === "no_fault_found_could_not_reproduce") &&
      args.noFaultNotes
    ) {
      patchData.correctiveAction =
        `NFF Notes: ${args.noFaultNotes.trim()}`;
    }

    await ctx.db.patch(args.discrepancyId, patchData);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "discrepancies",
      recordId: args.discrepancyId,
      userId: callerUserId,
      technicianId: args.dispositionedByTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "disposition",
      oldValue: JSON.stringify(discrepancy.disposition ?? null),
      newValue: JSON.stringify(args.disposition),
      notes:
        `Discrepancy ${discrepancy.discrepancyNumber} dispositioned as "${args.disposition}". ` +
        `By: ${tech.legalName}` +
        (dispositionerCert ? ` (cert: ${dispositionerCert.certificateNumber})` : " (no active cert found)") +
        `. ` +
        (args.disposition === "corrected"
          ? `Corrective action: "${args.correctiveAction!.trim()}". ` +
            `Maintenance record: ${args.correctiveMaintenanceRecordId}. ` +
            `Auth event: ${consumedAuthEventId}.`
          : args.disposition === "deferred_grounded"
          ? `Grounded reason: "${args.deferredReason?.trim()}".`
          : `Notes: "${args.noFaultNotes?.trim() ?? "none"}".`),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: deferDiscrepancy
//
// Records a MEL (Minimum Equipment List) deferral for a discrepancy.
// This is a specialized path for MEL deferrals with full MEL field validation.
//
// Per signoff-rts-flow.md §2.2 PRECONDITION 5 (MEL deferral requirements):
//   - melItemNumber: required
//   - melCategory: required (A/B/C/D)
//   - melDeferralDate: required (source truth for expiry computation)
//   - melExpiryDate: computed from melDeferralDate + category interval (INV-17)
//
// INV-17: melExpiryDate MUST equal melDeferralDate + category_interval.
// The mutation computes this and writes it — not the caller.
// This prevents a scenario where a caller provides a false expiry date.
//
// Owner notification (14 CFR 43.11(b)):
// For Part 135/121/mixed-regulation aircraft, the discrepancy list must be
// issued to the owner/lessee. The deferredListIssuedToOwner, issuedAt,
// and recipient fields capture this.
//
// A signatureAuthEvent is required — a MEL deferral is a certified act.
// The technician is certifying that the deferral is authorized under the
// approved MEL and that the aircraft may operate with the deferred item.
// ─────────────────────────────────────────────────────────────────────────────

export const deferDiscrepancy = mutation({
  args: {
    discrepancyId: v.id("discrepancies"),
    organizationId: v.id("organizations"),

    // INV-05: pre-signing re-authentication required for MEL deferral
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // INV-17: All of these are required
    melItemNumber: v.string(),     // MEL reference (e.g., "28-10-01")
    melCategory: v.union(
      v.literal("A"),
      v.literal("B"),
      v.literal("C"),
      v.literal("D"),
    ),
    melDeferralDate: v.number(),   // Unix ms — when the deferral is recorded

    // Optional: explicit override of the computed expiry date.
    // Category D items have no calendar limit (null expiry).
    // For A/B/C, this must equal or be earlier than the computed maximum.
    // If not provided, the system computes the maximum allowable expiry.
    melExpiryDateOverride: v.optional(v.number()),

    // Owner notification fields
    deferredListIssuedToOwner: v.optional(v.boolean()),
    deferredListRecipient: v.optional(v.string()),

    // Who is dispositioning
    dispositionedByTechnicianId: v.id("technicians"),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{
    discrepancyId: Id<"discrepancies">;
    melExpiryDate: number | null;
  }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch discrepancy ─────────────────────────────────────────────────────
    const discrepancy = await ctx.db.get(args.discrepancyId);
    if (!discrepancy) {
      throw new Error(`Discrepancy ${args.discrepancyId} not found.`);
    }
    if (discrepancy.organizationId !== args.organizationId) {
      throw new Error(
        `Discrepancy ${args.discrepancyId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // ── Cannot re-disposition an already-dispositioned discrepancy ────────────
    if (discrepancy.status === "dispositioned") {
      throw new Error(
        `DISC_ALREADY_DISPOSITIONED: ` +
        `Discrepancy ${args.discrepancyId} (${discrepancy.discrepancyNumber}) ` +
        `has already been dispositioned. ` +
        `Cannot apply a MEL deferral to an already-dispositioned discrepancy.`,
      );
    }

    // ── Validate MEL item number is non-empty ──────────────────────────────────
    if (!args.melItemNumber.trim()) {
      throw new Error(
        `MEL_ITEM_NUMBER_EMPTY: melItemNumber must be a non-empty string. ` +
        `The MEL item number is the specific reference in the aircraft's approved MEL ` +
        `that authorizes this deferral (e.g., "28-10-01" or "ATA 28-10-01 Item 1"). ` +
        `Without a specific MEL reference, the deferral is not legally authorized.`,
      );
    }

    // ── INV-17: Compute melExpiryDate from melDeferralDate + category interval ─
    // The computation is authoritative. If the caller provides an override, we
    // validate it does not exceed the maximum allowable expiry.
    const categoryIntervalMs = MEL_CATEGORY_INTERVALS_MS[args.melCategory];
    let melExpiryDate: number | null;

    if (categoryIntervalMs === null) {
      // Category D: no calendar limit
      melExpiryDate = null;
    } else {
      const computedMaxExpiry = args.melDeferralDate + categoryIntervalMs;

      if (args.melExpiryDateOverride != null) {
        // Override must not exceed the computed maximum
        if (args.melExpiryDateOverride > computedMaxExpiry) {
          throw new Error(
            `MEL_EXPIRY_EXCEEDS_CATEGORY_LIMIT: ` +
            `melExpiryDateOverride (${new Date(args.melExpiryDateOverride).toISOString()}) ` +
            `exceeds the maximum allowable expiry for MEL Category ${args.melCategory}. ` +
            `Category ${args.melCategory} maximum: ${new Date(computedMaxExpiry).toISOString()} ` +
            `(${args.melDeferralDate} + ${categoryIntervalMs / 86_400_000} calendar days). ` +
            `A MEL deferral cannot extend beyond its category's calendar limit. ` +
            `Per INV-17: melExpiryDate must equal melDeferralDate + category_interval.`,
          );
        }
        // Override may be earlier than maximum (conservative deferral — acceptable)
        melExpiryDate = args.melExpiryDateOverride;
      } else {
        // Use the computed maximum expiry
        melExpiryDate = computedMaxExpiry;
      }
    }

    // ── Validate melDeferralDate is not in the future (with 5-min tolerance) ──
    // A deferral date in the future doesn't make sense — it hasn't happened yet.
    if (args.melDeferralDate > now + 5 * 60 * 1000) {
      throw new Error(
        `MEL_DEFERRAL_DATE_FUTURE: ` +
        `melDeferralDate (${new Date(args.melDeferralDate).toISOString()}) is in the future. ` +
        `A MEL deferral is recorded when the deferral is made, not before. ` +
        `Use the current date and time as the deferral date.`,
      );
    }

    // ── Guard against deferring an already-expired MEL ────────────────────────
    if (melExpiryDate != null && melExpiryDate <= now) {
      throw new Error(
        `MEL_ALREADY_EXPIRED: ` +
        `The computed MEL expiry date (${new Date(melExpiryDate).toISOString()}) ` +
        `is already in the past. ` +
        `This would create an immediately-expired MEL deferral. ` +
        `Review the deferralDate and category, or resolve the discrepancy instead of deferring.`,
      );
    }

    // ── Validate signatureAuthEvent ───────────────────────────────────────────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} already consumed. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}. ` +
        `Request a new re-authentication event.`,
      );
    }

    // ── Verify dispositioner technician ───────────────────────────────────────
    const tech = await ctx.db.get(args.dispositionedByTechnicianId);
    if (!tech) {
      throw new Error(`Technician ${args.dispositionedByTechnicianId} not found.`);
    }
    if (tech.status !== "active") {
      throw new Error(
        `DISC_TECH_INACTIVE: ` +
        `Technician ${args.dispositionedByTechnicianId} (${tech.legalName}) ` +
        `has status "${tech.status}". ` +
        `Only active technicians may issue MEL deferrals.`,
      );
    }

    // ── Fetch aircraft operating regulation for owner notification check ───────
    const workOrder = await ctx.db.get(discrepancy.workOrderId);
    const aircraft = workOrder ? await ctx.db.get(workOrder.aircraftId) : null;
    const requiresOwnerNotification =
      aircraft?.operatingRegulation === "part_135" ||
      aircraft?.operatingRegulation === "part_121" ||
      aircraft?.operatingRegulation === "part_91_135_mixed";

    // ── Fetch certificate for the record ──────────────────────────────────────
    const dispositionerCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.dispositionedByTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    // ── WRITES: All atomic ────────────────────────────────────────────────────

    // Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "discrepancies",
      consumedByRecordId: args.discrepancyId,
    });

    // Update discrepancy record
    await ctx.db.patch(args.discrepancyId, {
      status: "dispositioned",
      disposition: "deferred_mel",
      dispositionedByTechnicianId: args.dispositionedByTechnicianId,
      dispositionedAt: now,
      dispositionedCertificateNumber: dispositionerCert?.certificateNumber,
      melItemNumber: args.melItemNumber.trim(),
      melCategory: args.melCategory,
      melDeferralDate: args.melDeferralDate,
      melExpiryDate: melExpiryDate ?? undefined,
      deferredListIssuedToOwner: args.deferredListIssuedToOwner,
      deferredListIssuedAt: args.deferredListIssuedToOwner ? now : undefined,
      deferredListRecipient: args.deferredListRecipient?.trim(),
      updatedAt: now,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "discrepancies",
      recordId: args.discrepancyId,
      userId: callerUserId,
      technicianId: args.dispositionedByTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "disposition",
      oldValue: JSON.stringify(discrepancy.disposition ?? null),
      newValue: JSON.stringify({
        disposition: "deferred_mel",
        melItemNumber: args.melItemNumber.trim(),
        melCategory: args.melCategory,
        melDeferralDate: args.melDeferralDate,
        melExpiryDate,
        deferredListIssuedToOwner: args.deferredListIssuedToOwner,
        deferredListRecipient: args.deferredListRecipient?.trim(),
      }),
      notes:
        `Discrepancy ${discrepancy.discrepancyNumber} deferred under MEL. ` +
        `MEL item: ${args.melItemNumber.trim()}. ` +
        `Category: ${args.melCategory}` +
        (categoryIntervalMs != null
          ? ` (${categoryIntervalMs / 86_400_000} calendar days).`
          : " (no calendar limit).") +
        ` Deferral date: ${new Date(args.melDeferralDate).toISOString()}. ` +
        `Expiry: ${melExpiryDate != null ? new Date(melExpiryDate).toISOString() : "no expiry (Category D)"}. ` +
        `By: ${tech.legalName}` +
        (dispositionerCert ? ` (cert: ${dispositionerCert.certificateNumber})` : "") +
        `. Auth event: ${args.signatureAuthEventId}. ` +
        (requiresOwnerNotification
          ? `Owner notification required (${aircraft?.operatingRegulation}). ` +
            `List issued: ${args.deferredListIssuedToOwner === true ? `YES to ${args.deferredListRecipient ?? "unspecified recipient"}` : "NOT YET"}.`
          : "Owner notification not required for this aircraft's operating regulation."),
      timestamp: now,
    });

    // Separate audit entry for owner notification per 14 CFR 43.11(b) (if applicable)
    if (args.deferredListIssuedToOwner === true && args.deferredListRecipient) {
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "discrepancies",
        recordId: args.discrepancyId,
        userId: callerUserId,
        technicianId: args.dispositionedByTechnicianId,
        ipAddress: args.callerIpAddress,
        fieldName: "deferredListIssuedToOwner",
        oldValue: JSON.stringify(false),
        newValue: JSON.stringify(true),
        notes:
          `Deferred discrepancy list issued to owner/lessee "${args.deferredListRecipient.trim()}" ` +
          `at ${new Date(now).toISOString()}. ` +
          `Per 14 CFR 43.11(b): owner/lessee notified of deferred items.`,
        timestamp: now,
      });
    }

    return {
      discrepancyId: args.discrepancyId,
      melExpiryDate,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listDiscrepancies
//
// Lists discrepancies for an organization, optionally filtered by status.
// Used by the Squawks page and Dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export const listDiscrepancies = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("under_evaluation"),
        v.literal("dispositioned"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const discrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_status", (q) =>
        args.status
          ? q
              .eq("organizationId", args.organizationId)
              .eq("status", args.status)
          : q.eq("organizationId", args.organizationId),
      )
      .collect();

    return discrepancies;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateDiscrepancyApproval
//
// Updates customer approval status and labor tracking fields on a discrepancy.
// Used by the OP-1003 customer approval workflow — station management or
// customer approves/denies the recommended work.
// ─────────────────────────────────────────────────────────────────────────────

export const updateDiscrepancyApproval = mutation({
  args: {
    discrepancyId: v.id("discrepancies"),
    customerApprovalStatus: v.union(
      v.literal("pending"),
      v.literal("approved_by_customer"),
      v.literal("approved_by_station"),
      v.literal("denied"),
    ),
    addedToQuote: v.optional(v.boolean()),
    addedToQuoteInitials: v.optional(v.string()),
    mhActual: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { discrepancyId, ...updates } = args;
    await ctx.db.patch(discrepancyId, updates);
  },
});
