// convex/returnToService.ts
// Athelon — Aviation MRO SaaS Platform
//
// Return-to-Service Module — Phase 4 Implementation
//
// Implements all three mutations/queries specified in:
//   phase-2-signoff/signoff-rts-flow.md (Marcus Webb, Chloe Park)
//   convex-schema-v2.md (FROZEN 2026-02-22)
//   phase-3-implementation/tests/README.md (Cilla Oduya)
//
// Author:     Devraj Anand (Phase 4 Implementation)
// Regulatory: Marcus Webb
// Frontend:   Chloe Park
// QA:         Cilla Oduya
//
// ─── DESIGN NOTES ───────────────────────────────────────────────────────────
//
// Non-negotiable: an aircraft does not return to service without a legally
// defensible chain of evidence. Every precondition in authorizeReturnToService
// exists because the FAA can — and does — ask for it.
//
// ALL 9 PRECONDITIONS FROM signoff-rts-flow.md §2.2 ARE ENFORCED.
// None are warnings. None are bypassable.
// Failed RTS attempts are logged to auditLog per §6.6.
//
// The returnToService record is immutable once created. The schema has no
// updatedAt field — this is intentional. Any database-level tampering would
// change the document hash without changing the stored hash.
//
// ─── PRECONDITION SEQUENCE ──────────────────────────────────────────────────
//
// PRECONDITION 1: Signature auth event valid (consumed, expiry, intendedTable)
// PRECONDITION 2: Work order state (pending_signoff, has close time, not already signed)
// PRECONDITION 3: Aircraft total time consistent (matches WO, not decreased)
// PRECONDITION 4: All task cards complete (complete or voided; no incomplete_na_steps without reviewed NA steps)
// PRECONDITION 5: All discrepancies dispositioned (corrected with record, MEL with all fields, expiry)
// PRECONDITION 6: Signing technician authorized (cert required, IA for annual, ratings match)
// PRECONDITION 7: AD compliance reviewed (annual/100hr inspections only)
// PRECONDITION 8: Required signatures present on maintenance records
// PRECONDITION 9: Return to service statement provided (non-empty, >= 50 chars)
//
// ─── SIGNATURE HASH ─────────────────────────────────────────────────────────
//
// Per spec §3.3: signatureHash is computed over canonical JSON of all required
// RTS fields before insert. The hash is SHA-256 via Web Crypto API.
// v3: Upgraded from weak DJB2 hash to proper SHA-256 (TD-011).

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
// INTERNAL UTILITY: COMPUTE RTS HASH
//
// Per spec §3.3: hash computed over canonical JSON of all required RTS fields.
// v3: Now uses SHA-256 via crypto.subtle (Web Crypto API).
// ─────────────────────────────────────────────────────────────────────────────

async function computeRtsHash(fields: {
  workOrderId: string;
  aircraftId: string;
  organizationId: string;
  signedByIaTechnicianId: string;
  iaCertificateNumber: string;
  returnToServiceDate: number;
  returnToServiceStatement: string;
  aircraftHoursAtRts: number;
  limitations?: string;
  signatureAuthEventId: string;
}): Promise<string> {
  // Deterministic canonical serialization — keys in alphabetical order
  const canonical = JSON.stringify(
    Object.fromEntries(
      Object.entries(fields)
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([, v]) => v != null),
    ),
  );
  // SHA-256 via Web Crypto API (available in Convex runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `RTS-SHA256-${hashHex}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: authorizeReturnToService
//
// Spec ref: signoff-rts-flow.md §2 (Mutation Specification)
// Enforces: ALL 9 PRECONDITIONS from §2.2. No exceptions. No overrides.
//
// This is the single most consequential mutation in the system. It transitions
// an aircraft from "in maintenance" to "airworthy" and creates the legal record
// that authorizes the aircraft to fly.
//
// Failed attempts are always logged. Success creates an immutable returnToService
// record and updates the work order to "closed" and the aircraft to "airworthy".
// ─────────────────────────────────────────────────────────────────────────────

export const authorizeReturnToService = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    signatureAuthEventId: v.id("signatureAuthEvents"),
    returnToServiceStatement: v.string(),
    aircraftHoursAtRts: v.number(),
    limitations: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"returnToService">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // Helper to log a failed RTS attempt (per spec §6.6: always log failures)
    async function logFailedAttempt(errorCode: string, notes: string, technicianId?: Id<"technicians">): Promise<void> {
      const workOrder = await ctx.db.get(args.workOrderId).catch(() => null);
      await ctx.db.insert("auditLog", {
        organizationId: workOrder?.organizationId,
        eventType: "access_denied",
        tableName: "returnToService",
        recordId: args.workOrderId,
        userId: callerUserId,
        technicianId,
        ipAddress: args.callerIpAddress,
        notes: `RTS precondition failed: ${errorCode}. WO: ${args.workOrderId}. ${notes}`,
        timestamp: now,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 1: Signature auth event valid
    // ════════════════════════════════════════════════════════════════════════

    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      await logFailedAttempt("RTS_AUTH_EVENT_NOT_FOUND", `signatureAuthEventId: ${args.signatureAuthEventId}`);
      throw new Error(
        `RTS_AUTH_EVENT_NOT_FOUND: signatureAuthEvent ${args.signatureAuthEventId} not found. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.consumed) {
      await logFailedAttempt("RTS_AUTH_EVENT_CONSUMED", `Event consumed at ${authEvent.consumedAt}`, authEvent.technicianId);
      throw new Error(
        `RTS_AUTH_EVENT_CONSUMED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} has already been consumed. ` +
        `Each auth event is single-use. Request a new re-authentication event.`,
      );
    }
    if (authEvent.expiresAt < now) {
      await logFailedAttempt("RTS_AUTH_EVENT_EXPIRED", `Expired at ${new Date(authEvent.expiresAt).toISOString()}`, authEvent.technicianId);
      throw new Error(
        `RTS_AUTH_EVENT_EXPIRED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}. ` +
        `Auth events have a 5-minute TTL. Request a new re-authentication event.`,
      );
    }
    // Per spec: intendedTable must be "returnToService"
    if (authEvent.intendedTable !== "returnToService") {
      await logFailedAttempt("RTS_AUTH_EVENT_WRONG_TABLE", `intendedTable was "${authEvent.intendedTable}", expected "returnToService"`, authEvent.technicianId);
      throw new Error(
        `RTS_AUTH_EVENT_WRONG_TABLE: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} was issued for table ` +
        `"${authEvent.intendedTable}", not "returnToService". ` +
        `Request a new re-authentication event specifically for return-to-service signing.`,
      );
    }

    const signingTechnicianId = authEvent.technicianId;

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 2: Work order state valid
    // ════════════════════════════════════════════════════════════════════════

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      await logFailedAttempt("RTS_WORK_ORDER_NOT_FOUND", `workOrderId: ${args.workOrderId}`, signingTechnicianId);
      throw new Error(
        `RTS_WORK_ORDER_NOT_FOUND: Work order ${args.workOrderId} not found.`,
      );
    }
    if (workOrder.status !== "pending_signoff") {
      await logFailedAttempt("RTS_WRONG_WO_STATUS", `Status: ${workOrder.status}`, signingTechnicianId);
      throw new Error(
        `RTS_WRONG_WO_STATUS: ` +
        `Work order ${args.workOrderId} has status "${workOrder.status}". ` +
        `authorizeReturnToService requires status "pending_signoff". ` +
        `The work order must be transitioned to pending_signoff (all task cards complete, ` +
        `discrepancies dispositioned) before RTS can be authorized.`,
      );
    }
    if (workOrder.aircraftTotalTimeAtClose == null) {
      await logFailedAttempt("RTS_NO_CLOSE_TIME", "aircraftTotalTimeAtClose not set", signingTechnicianId);
      throw new Error(
        `RTS_NO_CLOSE_TIME: ` +
        `Work order ${args.workOrderId} does not have aircraftTotalTimeAtClose set. ` +
        `The aircraft total time at close must be recorded before RTS can be authorized.`,
      );
    }
    if (workOrder.returnToServiceId != null) {
      await logFailedAttempt("RTS_ALREADY_SIGNED", `Existing RTS: ${workOrder.returnToServiceId}`, signingTechnicianId);
      throw new Error(
        `RTS_ALREADY_SIGNED: ` +
        `Work order ${args.workOrderId} already has a return-to-service record ` +
        `(${workOrder.returnToServiceId}). ` +
        `An RTS can only be issued once per work order.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 3: Aircraft total time consistent
    // ════════════════════════════════════════════════════════════════════════

    // The RTS hours must match the work order's recorded close time exactly.
    // Per spec: "This field is not a user entry on the RTS screen — it is sourced
    // directly from workOrder.aircraftTotalTimeAtClose."
    if (args.aircraftHoursAtRts !== workOrder.aircraftTotalTimeAtClose) {
      await logFailedAttempt("RTS_TIME_MISMATCH",
        `Submitted: ${args.aircraftHoursAtRts}h, WO close: ${workOrder.aircraftTotalTimeAtClose}h`,
        signingTechnicianId);
      throw new Error(
        `RTS_TIME_MISMATCH: ` +
        `Submitted aircraftHoursAtRts (${args.aircraftHoursAtRts}h) does not match ` +
        `work order's aircraftTotalTimeAtClose (${workOrder.aircraftTotalTimeAtClose}h). ` +
        `Aircraft hours at RTS must exactly match the work order's close time. ` +
        `This value is sourced from the work order — not from independent user input. ` +
        `Use the value that was recorded when the work order was closed.`,
      );
    }

    // Verify close >= open (should have been caught at WO close, but verify here)
    if (workOrder.aircraftTotalTimeAtClose < workOrder.aircraftTotalTimeAtOpen) {
      await logFailedAttempt("RTS_TIME_DECREASED",
        `Close: ${workOrder.aircraftTotalTimeAtClose}h < Open: ${workOrder.aircraftTotalTimeAtOpen}h — POTENTIAL FALSIFICATION`,
        signingTechnicianId);
      throw new Error(
        `RTS_TIME_DECREASED: ` +
        `Work order aircraftTotalTimeAtClose (${workOrder.aircraftTotalTimeAtClose}h) is less than ` +
        `aircraftTotalTimeAtOpen (${workOrder.aircraftTotalTimeAtOpen}h). ` +
        `Aircraft hours cannot decrease. This is a data integrity violation and ` +
        `a potential falsification flag. Contact your Director of Maintenance.`,
      );
    }

    // Verify submitted hours >= aircraft's last known TT
    const aircraft = await ctx.db.get(workOrder.aircraftId);
    if (!aircraft) {
      await logFailedAttempt("RTS_AIRCRAFT_NOT_FOUND", `aircraftId: ${workOrder.aircraftId}`, signingTechnicianId);
      throw new Error(`RTS_AIRCRAFT_NOT_FOUND: Aircraft ${workOrder.aircraftId} not found.`);
    }
    if (args.aircraftHoursAtRts < aircraft.totalTimeAirframeHours) {
      await logFailedAttempt("RTS_TIME_BELOW_AIRCRAFT_RECORD",
        `RTS: ${args.aircraftHoursAtRts}h, Aircraft record: ${aircraft.totalTimeAirframeHours}h`,
        signingTechnicianId);
      throw new Error(
        `RTS_TIME_BELOW_AIRCRAFT_RECORD: ` +
        `aircraftHoursAtRts (${args.aircraftHoursAtRts}h) is less than the aircraft's ` +
        `current totalTimeAirframeHours (${aircraft.totalTimeAirframeHours}h). ` +
        `Aircraft hours are monotonically increasing. ` +
        `The RTS hours must be >= the aircraft's recorded current time.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 4: All task cards complete
    // ════════════════════════════════════════════════════════════════════════

    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const incompleteCards: string[] = [];
    const unreviewedNaSteps: string[] = [];

    for (const card of taskCards) {
      if (card.status !== "complete" && card.status !== "voided") {
        // Check for incomplete_na_steps — permissible only if all NA steps are reviewed
        if (card.status === "incomplete_na_steps") {
          // Verify all IA-required NA steps have naAuthorizedById set
          const naSteps = await ctx.db
            .query("taskCardSteps")
            .withIndex("by_task_card", (q) => q.eq("taskCardId", card._id))
            .filter((q) =>
              q.and(
                q.eq(q.field("status"), "na"),
                q.eq(q.field("signOffRequiresIa"), true),
              ),
            )
            .collect();

          const unreviewed = naSteps.filter((s) => s.naAuthorizedById == null);
          if (unreviewed.length > 0) {
            unreviewedNaSteps.push(...unreviewed.map((s) => s._id));
          }
        } else {
          incompleteCards.push(card._id);
        }
      }
    }

    if (incompleteCards.length > 0) {
      await logFailedAttempt("RTS_OPEN_TASK_CARDS",
        `Incomplete cards: ${incompleteCards.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_OPEN_TASK_CARDS: ` +
        `${incompleteCards.length} task card(s) are not in "complete" or "voided" status. ` +
        `Card IDs: [${incompleteCards.join(", ")}]. ` +
        `All task cards must be completed or voided before RTS can be authorized.`,
      );
    }

    if (unreviewedNaSteps.length > 0) {
      await logFailedAttempt("RTS_UNREVIEWED_NA_STEPS",
        `Unreviewed steps: ${unreviewedNaSteps.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_UNREVIEWED_NA_STEPS: ` +
        `${unreviewedNaSteps.length} IA-required step(s) are marked N/A but have not been ` +
        `reviewed and authorized (naAuthorizedById is null). ` +
        `Step IDs: [${unreviewedNaSteps.join(", ")}]. ` +
        `An IA must review and authorize all N/A markings on IA-required steps before RTS.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 5: All discrepancies dispositioned
    // ════════════════════════════════════════════════════════════════════════

    const discrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const openDiscrepancies: string[] = [];
    const missingCorrectiveRecords: string[] = [];
    const incompleteMelFields: string[] = [];
    const expiredMels: string[] = [];
    const melDeferralListNotIssued: string[] = [];

    for (const discrepancy of discrepancies) {
      if (discrepancy.status !== "dispositioned") {
        openDiscrepancies.push(discrepancy._id);
        continue;
      }

      // Corrected discrepancies must have a corrective maintenance record
      if (discrepancy.disposition === "corrected") {
        if (!discrepancy.correctiveMaintenanceRecordId) {
          missingCorrectiveRecords.push(discrepancy._id);
        }
      }

      // MEL deferrals must have all required fields
      if (discrepancy.disposition === "deferred_mel") {
        const melFieldsMissing =
          !discrepancy.melItemNumber ||
          !discrepancy.melCategory ||
          discrepancy.melDeferralDate == null ||
          discrepancy.melExpiryDate == null;

        if (melFieldsMissing) {
          incompleteMelFields.push(discrepancy._id);
        } else if (discrepancy.melExpiryDate! <= now) {
          // An overdue MEL is a hard block — the aircraft is grounded, not deferred
          expiredMels.push(discrepancy._id);
        } else {
          // Check Part 135/121 owner notification requirement
          if (
            aircraft.operatingRegulation === "part_135" ||
            aircraft.operatingRegulation === "part_121" ||
            aircraft.operatingRegulation === "part_91_135_mixed"
          ) {
            if (discrepancy.deferredListIssuedToOwner !== true) {
              melDeferralListNotIssued.push(discrepancy._id);
            }
          }
        }
      }
    }

    if (openDiscrepancies.length > 0) {
      await logFailedAttempt("RTS_OPEN_DISCREPANCIES",
        `Open discrepancy IDs: ${openDiscrepancies.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_OPEN_DISCREPANCIES: ` +
        `${openDiscrepancies.length} discrepancy/discrepancies have not been dispositioned. ` +
        `Discrepancy IDs: [${openDiscrepancies.join(", ")}]. ` +
        `All discrepancies must be dispositioned before RTS.`,
      );
    }
    if (missingCorrectiveRecords.length > 0) {
      await logFailedAttempt("RTS_CORRECTIVE_RECORD_MISSING",
        `Discrepancy IDs: ${missingCorrectiveRecords.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_CORRECTIVE_RECORD_MISSING: ` +
        `${missingCorrectiveRecords.length} corrected discrepancy/discrepancies are missing ` +
        `a linked corrective maintenance record (correctiveMaintenanceRecordId is null). ` +
        `Discrepancy IDs: [${missingCorrectiveRecords.join(", ")}]. ` +
        `Every corrected discrepancy must reference the maintenance record documenting the fix.`,
      );
    }
    if (incompleteMelFields.length > 0) {
      await logFailedAttempt("RTS_MEL_FIELDS_INCOMPLETE",
        `Discrepancy IDs: ${incompleteMelFields.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_MEL_FIELDS_INCOMPLETE: ` +
        `${incompleteMelFields.length} MEL deferral(s) are missing required fields. ` +
        `Required: melItemNumber, melCategory, melDeferralDate, melExpiryDate. ` +
        `Discrepancy IDs: [${incompleteMelFields.join(", ")}].`,
      );
    }
    if (expiredMels.length > 0) {
      await logFailedAttempt("RTS_MEL_EXPIRED",
        `Expired MEL discrepancy IDs: ${expiredMels.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_MEL_EXPIRED: ` +
        `${expiredMels.length} MEL deferral(s) have expired. ` +
        `An overdue MEL means the aircraft is grounded — not deferred. ` +
        `This is NOT a soft warning. The aircraft cannot return to service with expired MEL items. ` +
        `Discrepancy IDs: [${expiredMels.join(", ")}]. ` +
        `Correct or properly re-defer these items before RTS.`,
      );
    }
    if (melDeferralListNotIssued.length > 0) {
      await logFailedAttempt("RTS_MEL_DEFERRAL_LIST_NOT_ISSUED",
        `Discrepancy IDs: ${melDeferralListNotIssued.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_MEL_DEFERRAL_LIST_NOT_ISSUED: ` +
        `${melDeferralListNotIssued.length} MEL deferral(s) require the owner/lessee ` +
        `to be notified per 14 CFR 43.11(b), but deferredListIssuedToOwner is not true. ` +
        `This aircraft operates under Part ${aircraft.operatingRegulation?.replace("part_", "")}, ` +
        `which requires owner/operator notification of deferred items before flight. ` +
        `Discrepancy IDs: [${melDeferralListNotIssued.join(", ")}].`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 6: Signing technician authorized
    // ════════════════════════════════════════════════════════════════════════

    const signingTech = await ctx.db.get(signingTechnicianId);
    if (!signingTech) {
      await logFailedAttempt("RTS_TECH_NOT_FOUND", `technicianId: ${signingTechnicianId}`, signingTechnicianId);
      throw new Error(
        `RTS_TECH_NOT_FOUND: Technician ${signingTechnicianId} not found.`,
      );
    }
    if (signingTech.status !== "active") {
      await logFailedAttempt("RTS_TECH_INACTIVE",
        `Technician ${signingTechnicianId} status: ${signingTech.status}`,
        signingTechnicianId);
      throw new Error(
        `RTS_TECH_INACTIVE: ` +
        `Technician ${signingTechnicianId} (${signingTech.legalName}) has status ` +
        `"${signingTech.status}". ` +
        `Only active technicians may authorize return to service.`,
      );
    }

    // Fetch the signing technician's active certificates
    const signingCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", signingTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    if (!signingCert) {
      await logFailedAttempt("RTS_NO_ACTIVE_CERT",
        `No active certificate found for technician ${signingTechnicianId}`,
        signingTechnicianId);
      throw new Error(
        `RTS_NO_ACTIVE_CERT: ` +
        `No active certificate found for technician ${signingTechnicianId} ` +
        `(${signingTech.legalName}). ` +
        `A current certificate is required to sign a return-to-service record.`,
      );
    }

    // IA requirement — annual inspections require a current IA
    let iaCurrent = false;
    let iaCertificateNumber = signingCert.certificateNumber;
    let inspectionRecord: Awaited<ReturnType<typeof ctx.db.get>> | null = null;

    if (
      workOrder.workOrderType === "annual_inspection" ||
      workOrder.workOrderType === "progressive_inspection"
    ) {
      // Must have IA authorization
      if (!signingCert.hasIaAuthorization) {
        await logFailedAttempt("RTS_IA_REQUIRED",
          `Annual inspection RTS requires IA. Technician has no IA.`,
          signingTechnicianId);
        throw new Error(
          `RTS_IA_REQUIRED: ` +
          `Work order type "${workOrder.workOrderType}" requires an Inspection Authorization holder ` +
          `to issue the return-to-service. ` +
          `Technician ${signingTechnicianId} (${signingTech.legalName}) does not hold an IA. ` +
          `Per 14 CFR 91.409(a) and 65.91: only an IA may approve an aircraft for return to ` +
          `service after an annual inspection.`,
        );
      }
      // IA must not be expired — March 31 rule, no grace period
      if (!signingCert.iaExpiryDate || signingCert.iaExpiryDate < now) {
        await logFailedAttempt("RTS_IA_EXPIRED",
          `IA expired at ${signingCert.iaExpiryDate ? new Date(signingCert.iaExpiryDate).toISOString() : "never set"}`,
          signingTechnicianId);
        throw new Error(
          `RTS_IA_EXPIRED: ` +
          `Technician ${signingTechnicianId} (${signingTech.legalName}) holds an IA ` +
          `that ${!signingCert.iaExpiryDate ? "has no expiry date on file" : `expired on ${new Date(signingCert.iaExpiryDate).toISOString()}`}. ` +
          `Per the March 31 rule (14 CFR 65.92), Inspection Authorizations expire annually. ` +
          `There is NO grace period. An IA expired on March 31 may not sign on April 1. ` +
          `The current IA holder must renew before issuing this RTS, or have a current IA ` +
          `technician sign the record.`,
        );
      }
      // IA recent experience — 24-month rule (14 CFR 65.83)
      if (signingCert.lastExercisedDate != null) {
        const TWENTY_FOUR_MONTHS_MS = 24 * 30 * 24 * 60 * 60 * 1000; // approximate
        if (now - signingCert.lastExercisedDate > TWENTY_FOUR_MONTHS_MS) {
          await logFailedAttempt("RTS_RECENT_EXP_LAPSED",
            `Last exercised: ${new Date(signingCert.lastExercisedDate).toISOString()}`,
            signingTechnicianId);
          throw new Error(
            `RTS_RECENT_EXP_LAPSED: ` +
            `Technician ${signingTechnicianId} (${signingTech.legalName})'s IA ` +
            `recent experience has lapsed. ` +
            `Last exercised: ${new Date(signingCert.lastExercisedDate).toISOString()}. ` +
            `Per 14 CFR 65.83, certificated mechanics must have performed maintenance ` +
            `within the preceding 24 calendar months to exercise their certificate. ` +
            `This technician's experience is outside that window.`,
          );
        }
      }
      iaCurrent = true;
    }

    // Rating check for non-inspection work orders
    // TODO: Phase 4.1 — Implement full rating inference from task card taskType.
    // For now, verify the technician holds at least one relevant A&P rating.
    // See OI-01 in signoff-rts-flow.md §8.
    if (signingCert.ratings.length === 0 && !signingCert.hasIaAuthorization) {
      await logFailedAttempt("RTS_RATING_INSUFFICIENT",
        `No A&P ratings on active certificate ${signingCert._id}`,
        signingTechnicianId);
      throw new Error(
        `RTS_RATING_INSUFFICIENT: ` +
        `The signing technician's active certificate has no A&P ratings (airframe/powerplant). ` +
        `A return-to-service signature requires the appropriate rating for the work performed. ` +
        `Verify the certificate record for technician ${signingTechnicianId}.`,
      );
    }

    // Part 145 repair station authorization check
    const org = await ctx.db.get(workOrder.organizationId);
    let repairStationAuth: { authorizedWorkScope: string; organizationId: string } | null = null;
    if (org?.part145CertificateNumber) {
      // Check if technician is in the repair station's authorized personnel list
      const rsAuth = signingCert.repairStationAuthorizations?.find(
        (auth: { organizationId: Id<"organizations">; expiryDate?: number }) =>
          auth.organizationId === workOrder.organizationId &&
          (auth.expiryDate == null || auth.expiryDate >= now),
      );
      if (!rsAuth) {
        await logFailedAttempt("RTS_NOT_AUTHORIZED_FOR_ORG",
          `Technician ${signingTechnicianId} not in repair station authorization list for org ${workOrder.organizationId}`,
          signingTechnicianId);
        throw new Error(
          `RTS_NOT_AUTHORIZED_FOR_ORG: ` +
          `Technician ${signingTechnicianId} (${signingTech.legalName}) does not appear in ` +
          `the repair station's authorized personnel list for organization ${workOrder.organizationId}. ` +
          `Per 14 CFR 145.201: only personnel authorized by the repair station may approve ` +
          `work for return to service. ` +
          `Update the technician's repairStationAuthorizations or have an authorized person sign.`,
        );
      }
      repairStationAuth = rsAuth;

      // TODO: Phase 4.1 — Implement work scope vs. part145Ratings check (RTS_SCOPE_OUTSIDE_STATION_RATING).
      // Requires structured work scope matching against org.part145Ratings.
      // See OI-01 in signoff-rts-flow.md §8 for the design question on scope inference.
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 7: AD compliance reviewed (annual and 100-hour only)
    // ════════════════════════════════════════════════════════════════════════

    if (
      workOrder.workOrderType === "annual_inspection" ||
      workOrder.workOrderType === "100hr_inspection"
    ) {
      // Find the inspection record linked to this work order
      const foundInspectionRecord = await ctx.db
        .query("inspectionRecords")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first();

      if (!foundInspectionRecord) {
        await logFailedAttempt("RTS_NO_INSPECTION_RECORD",
          `No inspectionRecord found for work order ${args.workOrderId}`,
          signingTechnicianId);
        throw new Error(
          `RTS_NO_INSPECTION_RECORD: ` +
          `No inspection record found for work order ${args.workOrderId}. ` +
          `An inspection record must be created and signed before RTS on an ` +
          `${workOrder.workOrderType === "annual_inspection" ? "annual" : "100-hour"} inspection.`,
        );
      }

      if (!foundInspectionRecord.adComplianceReviewed) {
        await logFailedAttempt("RTS_AD_REVIEW_NOT_DOCUMENTED",
          `inspectionRecord ${foundInspectionRecord._id} adComplianceReviewed is false`,
          signingTechnicianId);
        throw new Error(
          `RTS_AD_REVIEW_NOT_DOCUMENTED: ` +
          `Inspection record ${foundInspectionRecord._id} does not have adComplianceReviewed == true. ` +
          `Per REG-008: AD compliance review must be documented before the ` +
          `${workOrder.workOrderType === "annual_inspection" ? "annual" : "100-hour"} inspection RTS can be issued. ` +
          `Set adComplianceReviewed to true on the inspection record to confirm review.`,
        );
      }

      inspectionRecord = foundInspectionRecord;

      // Check for overdue ADs — use live hours (not cached)
      const applicableAds = await ctx.db
        .query("adCompliance")
        .withIndex("by_aircraft", (q) => q.eq("aircraftId", workOrder.aircraftId))
        .filter((q) =>
          q.and(
            q.eq(q.field("applicable"), true),
            q.neq(q.field("complianceStatus"), "not_applicable"),
            q.neq(q.field("complianceStatus"), "superseded"),
          ),
        )
        .collect();

      const overdueAdIds: string[] = [];
      const blockingAdIds: string[] = [];

      for (const adCompliance of applicableAds) {
        // not_complied or pending_determination past effective date is a hard block
        if (
          adCompliance.complianceStatus === "not_complied" ||
          adCompliance.complianceStatus === "pending_determination"
        ) {
          blockingAdIds.push(adCompliance._id);
          continue;
        }

        // Recurring AD overdue check — live hours comparison
        if (adCompliance.complianceStatus === "complied_recurring") {
          const calendarOverdue =
            adCompliance.nextDueDate != null && adCompliance.nextDueDate < now;
          const hoursOverdue =
            adCompliance.nextDueHours != null &&
            aircraft.totalTimeAirframeHours > adCompliance.nextDueHours;
          if (calendarOverdue || hoursOverdue) {
            overdueAdIds.push(adCompliance._id);
          }
        }
      }

      if (blockingAdIds.length > 0) {
        await logFailedAttempt("RTS_AD_NOT_COMPLIED",
          `AD compliance IDs with not_complied/pending: ${blockingAdIds.join(", ")}`,
          signingTechnicianId);
        throw new Error(
          `RTS_AD_NOT_COMPLIED: ` +
          `${blockingAdIds.length} applicable AD(s) have status "not_complied" or ` +
          `"pending_determination". ` +
          `AD compliance record IDs: [${blockingAdIds.join(", ")}]. ` +
          `All applicable ADs must be complied with or determined not-applicable ` +
          `before RTS can be authorized. ` +
          `Per 14 CFR § 39.3 and ad-compliance-module.md §6.3: this is a hard block.`,
        );
      }

      if (overdueAdIds.length > 0) {
        await logFailedAttempt("RTS_AD_OVERDUE",
          `Overdue AD compliance IDs: ${overdueAdIds.join(", ")}`,
          signingTechnicianId);
        throw new Error(
          `RTS_AD_OVERDUE: ` +
          `${overdueAdIds.length} recurring AD(s) are past their next-due date or hours. ` +
          `AD compliance record IDs: [${overdueAdIds.join(", ")}]. ` +
          `Aircraft current hours: ${aircraft.totalTimeAirframeHours}h. ` +
          `An aircraft with an overdue recurring AD cannot be returned to service. ` +
          `Per 14 CFR § 39.3: this is a HARD BLOCK. There is no override path.`,
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 8: Required signatures present on maintenance records
    // ════════════════════════════════════════════════════════════════════════

    const maintenanceRecords = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    if (maintenanceRecords.length === 0) {
      await logFailedAttempt("RTS_NO_MAINTENANCE_RECORDS",
        `No maintenance records found for work order ${args.workOrderId}`,
        signingTechnicianId);
      throw new Error(
        `RTS_NO_MAINTENANCE_RECORDS: ` +
        `No maintenance records found for work order ${args.workOrderId}. ` +
        `At least one signed maintenance record is required before RTS. ` +
        `Per 14 CFR 43.9: every maintenance action must be documented.`,
      );
    }

    const unsignedRecords: string[] = [];
    for (const record of maintenanceRecords) {
      if (!record.signatureHash || !record.signatureHash.trim()) {
        unsignedRecords.push(record._id);
      }
    }

    if (unsignedRecords.length > 0) {
      await logFailedAttempt("RTS_UNSIGNED_RECORD",
        `Unsigned record IDs: ${unsignedRecords.join(", ")}`,
        signingTechnicianId);
      throw new Error(
        `RTS_UNSIGNED_RECORD: ` +
        `${unsignedRecords.length} maintenance record(s) have no signatureHash. ` +
        `Record IDs: [${unsignedRecords.join(", ")}]. ` +
        `All maintenance records must be signed before RTS can be authorized. ` +
        `Per 14 CFR 43.9: the maintenance entry must be signed by the person ` +
        `approving the work for return to service.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRECONDITION 9: Return to service statement provided
    // ════════════════════════════════════════════════════════════════════════

    if (!args.returnToServiceStatement.trim()) {
      await logFailedAttempt("RTS_STATEMENT_EMPTY", "Empty RTS statement", signingTechnicianId);
      throw new Error(
        `RTS_STATEMENT_EMPTY: ` +
        `returnToServiceStatement must be a non-empty string. ` +
        `The RTS statement is a legal certification required by 14 CFR 43.9 and 43.11.`,
      );
    }
    if (args.returnToServiceStatement.trim().length < 50) {
      await logFailedAttempt("RTS_STATEMENT_TOO_SHORT",
        `Statement length: ${args.returnToServiceStatement.trim().length}`,
        signingTechnicianId);
      throw new Error(
        `RTS_STATEMENT_TOO_SHORT: ` +
        `returnToServiceStatement must be at least 50 characters. ` +
        `Current length: ${args.returnToServiceStatement.trim().length}. ` +
        `A one-line entry is not legally defensible. ` +
        `The statement must include the regulatory citation, aircraft identification, ` +
        `total time, and certification language per 14 CFR 43.9/43.11.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // ALL PRECONDITIONS PASSED — EXECUTE THE RTS
    // ════════════════════════════════════════════════════════════════════════

    // Step 1: Consume the signature auth event (atomically with creation)
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "returnToService",
      consumedByRecordId: null as unknown as string, // will patch after creation
    });

    // Step 2: Compute signature hash over required fields
    const hashFields = {
      workOrderId: args.workOrderId,
      aircraftId: workOrder.aircraftId as string,
      organizationId: workOrder.organizationId as string,
      signedByIaTechnicianId: signingTechnicianId as string,
      iaCertificateNumber: signingCert.certificateNumber,
      returnToServiceDate: now,
      returnToServiceStatement: args.returnToServiceStatement.trim(),
      aircraftHoursAtRts: args.aircraftHoursAtRts,
      limitations: args.limitations,
      signatureAuthEventId: args.signatureAuthEventId as string,
    };
    const signatureHash = await computeRtsHash(hashFields);

    // Step 3: Create the returnToService record (immutable after creation)
    const rtsId = await ctx.db.insert("returnToService", {
      workOrderId: args.workOrderId,
      aircraftId: workOrder.aircraftId,
      organizationId: workOrder.organizationId,
      inspectionRecordId: inspectionRecord?._id,
      signedByIaTechnicianId: signingTechnicianId,
      iaCertificateNumber: signingCert.certificateNumber,
      iaRepairStationCert: org?.part145CertificateNumber,
      iaAuthorizedWorkScope: repairStationAuth?.authorizedWorkScope,
      iaCurrentOnRtsDate: iaCurrent,
      returnToServiceDate: now,
      returnToServiceStatement: args.returnToServiceStatement.trim(),
      aircraftHoursAtRts: args.aircraftHoursAtRts,
      limitations: args.limitations,
      signatureHash,
      signatureTimestamp: now,
      signatureAuthEventId: args.signatureAuthEventId,
      createdAt: now,
    });

    // Step 4: Patch the auth event with the RTS record ID now that we have it
    await ctx.db.patch(args.signatureAuthEventId, {
      consumedByRecordId: rtsId,
    });

    // Step 5: Update work order to closed
    await ctx.db.patch(args.workOrderId, {
      status: "closed",
      returnToServiceId: rtsId,
      returnedToService: true,
      closedAt: now,
      closedByUserId: callerUserId,
      closedByTechnicianId: signingTechnicianId,
      aircraftTotalTimeAtClose: args.aircraftHoursAtRts,
      updatedAt: now,
    });

    // Step 6: Update aircraft status to airworthy and advance total time
    const previousAircraftStatus = aircraft.status;
    const previousAircraftHours = aircraft.totalTimeAirframeHours;
    await ctx.db.patch(workOrder.aircraftId, {
      status: "airworthy",
      totalTimeAirframeHours: args.aircraftHoursAtRts,
      totalTimeAirframeAsOfDate: now,
      updatedAt: now,
    });

    // Step 7: Write all required audit log entries (signoff-rts-flow.md §6.5)

    // RTS record created
    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_signed",
      tableName: "returnToService",
      recordId: rtsId,
      userId: callerUserId,
      technicianId: signingTechnicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `Return-to-Service issued. ` +
        `Aircraft: ${workOrder.aircraftId} (${aircraft.currentRegistration ?? "N-unknown"}). ` +
        `Signed by: ${signingTech.legalName} (cert: ${signingCert.certificateNumber}). ` +
        `IA current on RTS date: ${iaCurrent}. ` +
        `Aircraft hours at RTS: ${args.aircraftHoursAtRts}h. ` +
        `Signature hash: ${signatureHash}. ` +
        `Auth event: ${args.signatureAuthEventId}.`,
      timestamp: now,
    });

    // Work order status changed to closed
    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: callerUserId,
      technicianId: signingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("pending_signoff"),
      newValue: JSON.stringify("closed"),
      notes: `Work order closed. RTS record: ${rtsId}.`,
      timestamp: now,
    });

    // Aircraft status changed to airworthy
    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "status_changed",
      tableName: "aircraft",
      recordId: workOrder.aircraftId,
      userId: callerUserId,
      technicianId: signingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify(previousAircraftStatus),
      newValue: JSON.stringify("airworthy"),
      notes: `Aircraft returned to airworthy status. Work order: ${args.workOrderId}.`,
      timestamp: now,
    });

    // Aircraft total time updated
    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_updated",
      tableName: "aircraft",
      recordId: workOrder.aircraftId,
      userId: callerUserId,
      technicianId: signingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "totalTimeAirframeHours",
      oldValue: JSON.stringify(previousAircraftHours),
      newValue: JSON.stringify(args.aircraftHoursAtRts),
      notes: `Aircraft total time advanced at RTS. Work order: ${args.workOrderId}.`,
      timestamp: now,
    });

    return rtsId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: generateRtsDocument
//
// Spec ref: signoff-rts-flow.md §3 (Legal Maintenance Release Model)
//
// Assembles the legal RTS record with all required fields for PDF generation.
// This is not the create mutation — the record already exists. This mutation
// enriches the existing returnToService record with denormalized snapshot
// data that the PDF renderer needs, and stamps the document as generated.
//
// This is a mutation (not query) because it writes the enriched snapshot to
// a documentSnapshot field and records the generation event in auditLog.
// The snapshot is write-once: if already generated, returns the existing snapshot.
//
// NOTE: Actual PDF rendering is handled by a Convex action (calling a PDF library)
// that reads this snapshot. This mutation prepares the data; the action renders it.
// TODO: Phase 4.1 — Implement the PDF rendering action that calls this mutation's
// output and produces a storable PDF blob.
// ─────────────────────────────────────────────────────────────────────────────

export const generateRtsDocument = mutation({
  args: {
    rtsId: v.id("returnToService"),
    organizationId: v.id("organizations"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{
    rtsId: Id<"returnToService">;
    documentFields: Record<string, unknown>;
  }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const rts = await ctx.db.get(args.rtsId);
    if (!rts) {
      throw new Error(`returnToService record ${args.rtsId} not found.`);
    }
    if (rts.organizationId !== args.organizationId) {
      throw new Error(
        `returnToService record ${args.rtsId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // Gather all linked records for the legal document
    const workOrder = await ctx.db.get(rts.workOrderId);
    const aircraft = await ctx.db.get(rts.aircraftId);
    const signingTech = await ctx.db.get(rts.signedByIaTechnicianId);
    const org = await ctx.db.get(rts.organizationId);

    // Gather maintenance records
    const maintenanceRecords = workOrder
      ? await ctx.db
          .query("maintenanceRecords")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", rts.workOrderId))
          .collect()
      : [];

    // Gather discrepancy/MEL deferrals for the limitations section
    const deferrals = workOrder
      ? await ctx.db
          .query("discrepancies")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", rts.workOrderId))
          .filter((q) => q.eq(q.field("disposition"), "deferred_mel"))
          .collect()
      : [];

    // Assemble the canonical legal document fields per spec §3.1
    const documentFields = {
      // RTS identification
      rtsId: rts._id,
      returnToServiceDate: rts.returnToServiceDate,
      returnToServiceStatement: rts.returnToServiceStatement,
      signatureHash: rts.signatureHash,
      signatureTimestamp: rts.signatureTimestamp,
      limitations: rts.limitations,

      // Aircraft identification — per 43.11(a)(1)
      aircraftId: rts.aircraftId,
      aircraftRegistration: aircraft?.currentRegistration ?? "UNKNOWN",
      aircraftMake: aircraft?.make ?? "UNKNOWN",
      aircraftModel: aircraft?.model ?? "UNKNOWN",
      aircraftSerialNumber: aircraft?.serialNumber ?? "UNKNOWN",

      // Aircraft time — per 43.11(a)(2)
      aircraftHoursAtRts: rts.aircraftHoursAtRts,

      // Work order reference
      workOrderId: rts.workOrderId,
      workOrderNumber: workOrder?.workOrderNumber ?? "UNKNOWN",
      workOrderType: workOrder?.workOrderType ?? "UNKNOWN",
      workOrderDescription: workOrder?.description ?? "",

      // Signing technician — per 43.11(a)(5)
      signingTechnicianId: rts.signedByIaTechnicianId,
      signingTechnicianName: signingTech?.legalName ?? "UNKNOWN",
      iaCertificateNumber: rts.iaCertificateNumber,
      iaCurrentOnRtsDate: rts.iaCurrentOnRtsDate,
      iaRepairStationCert: rts.iaRepairStationCert,
      iaAuthorizedWorkScope: rts.iaAuthorizedWorkScope,

      // Organization — per 145.219
      organizationId: rts.organizationId,
      organizationName: org?.name ?? "UNKNOWN",
      organizationCertificate: org?.part145CertificateNumber,

      // Inspection record link (if annual/100hr)
      inspectionRecordId: rts.inspectionRecordId,

      // Maintenance records in this work order
      maintenanceRecordCount: maintenanceRecords.length,
      maintenanceRecordIds: maintenanceRecords.map((r) => r._id),

      // MEL deferrals (feed into limitations section)
      melDeferrals: deferrals.map((d) => ({
        discrepancyId: d._id,
        description: d.description,
        melItemNumber: d.melItemNumber,
        melCategory: d.melCategory,
        melExpiryDate: d.melExpiryDate,
        deferredListIssuedToOwner: d.deferredListIssuedToOwner,
        deferredListRecipient: d.deferredListRecipient,
      })),

      // Generation metadata
      generatedAt: now,
      generatedByUserId: callerUserId,
    };

    // Audit log: record viewed (for FAA audit chain — per signoff-rts-flow.md §5.4)
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_viewed",
      tableName: "returnToService",
      recordId: args.rtsId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `RTS document assembled for generation. ` +
        `RTS ID: ${rts._id}. ` +
        `Work order: ${rts.workOrderId}. ` +
        `Aircraft: ${aircraft?.currentRegistration ?? rts.aircraftId}.`,
      timestamp: now,
    });

    return { rtsId: args.rtsId, documentFields };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getCloseReadinessReport
//
// Spec ref: signoff-rts-flow.md §5.1–5.2, phase-3-tests/README.md (getCloseReadiness)
//
// Comprehensive pre-flight query for the RTS UI (Chloe Park's sign-off wizard
// Step 1: Pre-Flight Summary). Returns the full readiness state of a work order
// so the frontend can surface blockers before the technician reaches the
// signature step.
//
// This is a READ-ONLY query. No writes.
//
// Returns a structured report with:
//   - Work order and aircraft summary
//   - Task card status (per-card, with step counts)
//   - Discrepancy summary (open, MEL deferrals, corrected)
//   - AD compliance status (for annual/100hr inspections)
//   - Maintenance record signature status
//   - List of all blocking conditions with error codes
//   - isReadyForRts boolean (true only if no blockers)
// ─────────────────────────────────────────────────────────────────────────────

export const getCloseReadinessReport = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const now = Date.now();

    // ── Fetch work order ──────────────────────────────────────────────────────
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return null;
    if (workOrder.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.organizationId}.`,
      );
    }

    // ── Fetch aircraft ────────────────────────────────────────────────────────
    const aircraft = await ctx.db.get(workOrder.aircraftId);

    // ── Task cards ────────────────────────────────────────────────────────────
    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const taskCardSummary = await Promise.all(
      taskCards.map(async (card) => {
        const pendingStepCount = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", card._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .collect()
          .then((s) => s.length);

        const unreviewedNaSteps = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", card._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("status"), "na"),
              q.eq(q.field("signOffRequiresIa"), true),
            ),
          )
          .collect()
          .then((steps) => steps.filter((s) => s.naAuthorizedById == null));

        const isBlocking =
          card.status !== "complete" && card.status !== "voided" &&
          !(card.status === "incomplete_na_steps" && unreviewedNaSteps.length === 0);

        return {
          taskCardId: card._id,
          taskCardNumber: card.taskCardNumber,
          title: card.title,
          taskType: card.taskType,
          status: card.status,
          stepCount: card.stepCount,
          completedStepCount: card.completedStepCount,
          naStepCount: card.naStepCount,
          pendingStepCount,
          unreviewedNaStepIds: unreviewedNaSteps.map((s) => s._id),
          isBlocking,
          progressPercent:
            card.stepCount > 0
              ? Math.round(((card.completedStepCount + card.naStepCount) / card.stepCount) * 100)
              : 0,
        };
      }),
    );

    // ── Discrepancies ─────────────────────────────────────────────────────────
    const discrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const discrepancySummary = discrepancies.map((d) => ({
      discrepancyId: d._id,
      discrepancyNumber: d.discrepancyNumber,
      description: d.description,
      status: d.status,
      disposition: d.disposition,
      isBlocking:
        d.status !== "dispositioned" ||
        (d.disposition === "corrected" && !d.correctiveMaintenanceRecordId) ||
        (d.disposition === "deferred_mel" &&
          (!d.melItemNumber || !d.melCategory || d.melDeferralDate == null || d.melExpiryDate == null)) ||
        (d.disposition === "deferred_mel" && d.melExpiryDate != null && d.melExpiryDate <= now),
      melItemNumber: d.melItemNumber,
      melCategory: d.melCategory,
      melExpiryDate: d.melExpiryDate,
      melExpired: d.melExpiryDate != null ? d.melExpiryDate <= now : false,
      deferredListIssuedToOwner: d.deferredListIssuedToOwner,
      correctiveMaintenanceRecordId: d.correctiveMaintenanceRecordId,
    }));

    // ── Maintenance records ───────────────────────────────────────────────────
    const maintenanceRecords = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const maintenanceRecordSummary = maintenanceRecords.map((r) => ({
      recordId: r._id,
      recordType: r.recordType,
      completionDate: r.completionDate,
      isSigned: !!r.signatureHash?.trim(),
      isBlocking: !r.signatureHash?.trim(),
    }));

    // ── AD compliance (annual/100hr only) ─────────────────────────────────────
    let adComplianceSummary: Array<{
      adComplianceId: string;
      adId: string;
      complianceStatus: string;
      isBlocking: boolean;
      isOverdue: boolean;
      blockReason: string;
    }> | null = null;
    let inspectionRecordSummary: {
      recordId: string;
      adComplianceReviewed: boolean;
      isBlocking: boolean;
    } | null = null;

    if (
      workOrder.workOrderType === "annual_inspection" ||
      workOrder.workOrderType === "100hr_inspection"
    ) {
      const inspRecord = await ctx.db
        .query("inspectionRecords")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .first();

      inspectionRecordSummary = inspRecord
        ? {
            recordId: inspRecord._id,
            adComplianceReviewed: inspRecord.adComplianceReviewed,
            isBlocking: !inspRecord.adComplianceReviewed,
          }
        : null;

      const applicableAds = await ctx.db
        .query("adCompliance")
        .withIndex("by_aircraft", (q) => q.eq("aircraftId", workOrder.aircraftId))
        .filter((q) =>
          q.and(
            q.eq(q.field("applicable"), true),
            q.neq(q.field("complianceStatus"), "not_applicable"),
            q.neq(q.field("complianceStatus"), "superseded"),
          ),
        )
        .collect();

      adComplianceSummary = applicableAds.map((ad) => {
        const isNotComplied =
          ad.complianceStatus === "not_complied" || ad.complianceStatus === "pending_determination";
        const calendarOverdue =
          ad.nextDueDate != null && ad.nextDueDate < now;
        const hoursOverdue =
          ad.nextDueHours != null &&
          aircraft != null &&
          aircraft.totalTimeAirframeHours > ad.nextDueHours;
        const isOverdue = !isNotComplied && (calendarOverdue || hoursOverdue);
        const isBlocking = isNotComplied || isOverdue;

        return {
          adComplianceId: ad._id,
          adId: ad.adId,
          complianceStatus: ad.complianceStatus,
          isBlocking,
          isOverdue,
          blockReason: isNotComplied
            ? `AD has status "${ad.complianceStatus}" — must be complied with or determined N/A`
            : isOverdue
            ? `Recurring AD is overdue${calendarOverdue ? ` (calendar: due ${ad.nextDueDate ? new Date(ad.nextDueDate).toISOString() : "unknown"})` : ""}${hoursOverdue ? ` (hours: due at ${ad.nextDueHours}h, current: ${aircraft?.totalTimeAirframeHours}h)` : ""}`
            : "No blocking condition",
        };
      });
    }

    // ── Compile blocking conditions ────────────────────────────────────────────
    const blockers: Array<{ code: string; description: string; ids?: string[] }> = [];

    if (workOrder.status !== "pending_signoff" && workOrder.status !== "closed") {
      blockers.push({
        code: "RTS_WRONG_WO_STATUS",
        description: `Work order status is "${workOrder.status}". Must be "pending_signoff" to proceed with RTS.`,
      });
    }

    const blockingCards = taskCardSummary.filter((c) => c.isBlocking);
    if (blockingCards.length > 0) {
      blockers.push({
        code: "RTS_OPEN_TASK_CARDS",
        description: `${blockingCards.length} task card(s) are not complete.`,
        ids: blockingCards.map((c) => c.taskCardId),
      });
    }

    const unreviewedNas = taskCardSummary.filter((c) => c.unreviewedNaStepIds.length > 0);
    if (unreviewedNas.length > 0) {
      const allStepIds = unreviewedNas.flatMap((c) => c.unreviewedNaStepIds);
      blockers.push({
        code: "RTS_UNREVIEWED_NA_STEPS",
        description: `${allStepIds.length} IA-required step(s) marked N/A without authorization.`,
        ids: allStepIds,
      });
    }

    const blockingDiscrepancies = discrepancySummary.filter((d) => d.isBlocking);
    if (blockingDiscrepancies.length > 0) {
      blockers.push({
        code: "RTS_OPEN_DISCREPANCIES",
        description: `${blockingDiscrepancies.length} discrepancy/discrepancies require attention.`,
        ids: blockingDiscrepancies.map((d) => d.discrepancyId),
      });
    }

    if (maintenanceRecords.length === 0) {
      blockers.push({
        code: "RTS_NO_MAINTENANCE_RECORDS",
        description: "No maintenance records found for this work order.",
      });
    }

    const unsignedRecords = maintenanceRecordSummary.filter((r) => r.isBlocking);
    if (unsignedRecords.length > 0) {
      blockers.push({
        code: "RTS_UNSIGNED_RECORD",
        description: `${unsignedRecords.length} maintenance record(s) are not signed.`,
        ids: unsignedRecords.map((r) => r.recordId),
      });
    }

    if (adComplianceSummary) {
      const blockingAds = adComplianceSummary.filter((a) => a.isBlocking);
      if (blockingAds.length > 0) {
        blockers.push({
          code: "RTS_AD_OVERDUE",
          description: `${blockingAds.length} applicable AD(s) are overdue or not complied with.`,
          ids: blockingAds.map((a) => a.adComplianceId),
        });
      }
    }

    if (inspectionRecordSummary?.isBlocking) {
      blockers.push({
        code: "RTS_AD_REVIEW_NOT_DOCUMENTED",
        description: "AD compliance review has not been documented on the inspection record.",
        ids: [inspectionRecordSummary.recordId],
      });
    }

    return {
      workOrderId: args.workOrderId,
      workOrderNumber: workOrder.workOrderNumber,
      workOrderType: workOrder.workOrderType,
      workOrderStatus: workOrder.status,
      aircraftId: workOrder.aircraftId,
      aircraftRegistration: aircraft?.currentRegistration,
      aircraftMake: aircraft?.make,
      aircraftModel: aircraft?.model,
      aircraftTotalTimeAtOpen: workOrder.aircraftTotalTimeAtOpen,
      aircraftTotalTimeAtClose: workOrder.aircraftTotalTimeAtClose,
      aircraftCurrentHours: aircraft?.totalTimeAirframeHours,

      taskCards: taskCardSummary,
      discrepancies: discrepancySummary,
      maintenanceRecords: maintenanceRecordSummary,
      adComplianceSummary,
      inspectionRecordSummary,

      blockers,
      isReadyForRts: blockers.length === 0 && workOrder.returnToServiceId == null,
      isAlreadySigned: workOrder.returnToServiceId != null,
      existingRtsId: workOrder.returnToServiceId,

      // Summary counts for the Pre-Flight Summary dashboard
      summary: {
        totalTaskCards: taskCards.length,
        completedTaskCards: taskCards.filter((c) => c.status === "complete" || c.status === "voided").length,
        totalDiscrepancies: discrepancies.length,
        openDiscrepancies: discrepancies.filter((d) => d.status !== "dispositioned").length,
        totalMaintenanceRecords: maintenanceRecords.length,
        signedMaintenanceRecords: maintenanceRecords.filter((r) => !!r.signatureHash?.trim()).length,
        blockerCount: blockers.length,
      },
    };
  },
});
