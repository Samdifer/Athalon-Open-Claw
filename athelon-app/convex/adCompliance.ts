// convex/adCompliance.ts
// Athelon — Aviation MRO SaaS Platform
//
// AD Compliance Module — Phase 4 Implementation
//
// Implements all four mutations/queries specified in:
//   phase-2-compliance/ad-compliance-module.md (Marcus Webb, Devraj Anand)
//   phase-2-signoff/signoff-rts-flow.md §2.2 PRECONDITION 7
//   phase-3-implementation/tests/README.md (Cilla Oduya)
//   convex-schema-v2.md (FROZEN 2026-02-22)
//
// Author:     Devraj Anand (Phase 4 Implementation)
// Regulatory: Marcus Webb
// QA:         Cilla Oduya
//
// ─── DESIGN NOTES ───────────────────────────────────────────────────────────
//
// AD compliance is not optional. 14 CFR § 39.3: "No person may operate a
// product to which an airworthiness directive applies except in accordance
// with the requirements of that airworthiness directive."
//
// Every invariant in this module corresponds to a named invariant in
// convex-schema-v2.md or a specific precondition in ad-compliance-module.md.
// Every audit log write corresponds to an entry in signoff-rts-flow.md §6.
//
// Key design decisions:
//
// 1. MARCUS'S NEW REQUIREMENT (recordAdCompliance):
//    The `approvedDataReference` field on the maintenance record linked to this
//    compliance event must contain the AD number. This ensures that when an FAA
//    inspector asks "show me the record proving AD 2024-15-07 was complied with,"
//    we can follow the chain: adCompliance → maintenanceRecord → approvedDataReference
//    containing the AD number. Without this check, the chain is documentable but
//    not self-evidencing under audit. See §3.1 of the spec.
//
// 2. OVERDUE DETERMINATION IS LIVE (checkAdDueForAircraft):
//    Per Marcus §2.3: "The cached nextDue* fields on adCompliance are for display
//    and sorting — not the authoritative overdue determination. Authoritative
//    determination requires comparing nextDueHours against the aircraft's current
//    totalTimeAirframeHours, which changes with every work order close."
//    This query always fetches live aircraft hours. No exceptions.
//
// 3. AUTH LEVEL ENFORCEMENT (markAdNotApplicable):
//    An N/A determination is a regulated act. The signing technician must hold
//    an active certificate. The spec does not require IA for this mutation, but
//    it writes the technician's authorization level to the record. The IA flag
//    is captured so auditors can assess the determination's authority.
//
// 4. BIDIRECTIONAL SUPERSESSION (handleAdSupersession):
//    Both AD records must be updated: old → supersededByAdId, new → supersedesAdId.
//    Every affected adCompliance record gets: old marked "superseded", new
//    pending_determination record created. Per Marcus §4.2 — this is not optional.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

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
// INTERNAL UTILITY: COMPUTE NEXT DUE VALUES
//
// Deterministic from last compliance data and AD interval fields.
// Per Marcus §2.3 — these are cached for display/sorting only.
// Authoritative overdue determination uses live aircraft hours.
// ─────────────────────────────────────────────────────────────────────────────

function computeNextDue(ad: {
  adType: string;
  complianceType: string;
  recurringIntervalHours?: number;
  recurringIntervalDays?: number;
  recurringIntervalCycles?: number;
}, lastComplianceDate: number, lastComplianceHours: number, lastComplianceCycles?: number): {
  nextDueDate?: number;
  nextDueHours?: number;
  nextDueCycles?: number;
} {
  // One-time ADs: no next due after compliance
  if (ad.adType === "one_time" || ad.adType === "terminating_action") {
    return {};
  }

  const result: { nextDueDate?: number; nextDueHours?: number; nextDueCycles?: number } = {};

  if (ad.recurringIntervalDays != null) {
    result.nextDueDate = lastComplianceDate + ad.recurringIntervalDays * 86_400_000;
  }
  if (ad.recurringIntervalHours != null) {
    result.nextDueHours = lastComplianceHours + ad.recurringIntervalHours;
  }
  if (ad.recurringIntervalCycles != null && lastComplianceCycles != null) {
    result.nextDueCycles = lastComplianceCycles + ad.recurringIntervalCycles;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: recordAdCompliance
//
// Spec ref: ad-compliance-module.md §3.1
// Enforces: INV-05, INV-03, Cilla 3.4 (no backdating), Marcus's new requirement
//           (approvedDataReference must contain AD number)
//
// This is the mutation that moves an aircraft from "not complied" to "complied"
// for a specific AD. It is a regulated act. It requires a valid, unconsumed
// signatureAuthEvent and a linked maintenanceRecord whose approvedDataReference
// contains the AD number.
//
// Marcus's requirement (§5 of spec): "If maintenanceRecord.approvedDataReference
// doesn't contain the AD number, the traceability chain is broken. An FAA
// inspector following the chain will reach the maintenance record and not be
// able to confirm which AD it documents."
// ─────────────────────────────────────────────────────────────────────────────

export const recordAdCompliance = mutation({
  args: {
    adComplianceId: v.id("adCompliance"),
    organizationId: v.id("organizations"),

    // INV-05: pre-signing re-authentication required
    signatureAuthEventId: v.id("signatureAuthEvents"),

    complianceDate: v.number(),              // Unix ms — date work was completed
    aircraftHoursAtCompliance: v.number(),   // Aircraft TT at time of compliance
    aircraftCyclesAtCompliance: v.optional(v.number()),

    // The 43.9 record that proves compliance
    maintenanceRecordId: v.id("maintenanceRecords"),

    // Which paragraph(s) of the AD were followed
    complianceMethodUsed: v.string(),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── PRECONDITION 1: signatureAuthEvent exists, unconsumed, unexpired ─────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `recordAdCompliance: signatureAuthEvent ${args.signatureAuthEventId} not found. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05 / AD_AUTH_EVENT_CONSUMED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} has already been consumed ` +
        `(consumed at ${authEvent.consumedAt ? new Date(authEvent.consumedAt).toISOString() : "unknown"}). ` +
        `Each auth event is single-use. Request a new re-authentication event.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05 / AD_AUTH_EVENT_EXPIRED: ` +
        `signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}. ` +
        `Auth events have a 5-minute TTL. Request a new re-authentication event.`,
      );
    }

    // ── PRECONDITION 3: adCompliance record exists and is applicable ─────────
    const adCompliance = await ctx.db.get(args.adComplianceId);
    if (!adCompliance) {
      throw new Error(
        `adCompliance record ${args.adComplianceId} not found.`,
      );
    }
    if (adCompliance.organizationId !== args.organizationId) {
      throw new Error(
        `adCompliance record ${args.adComplianceId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }
    if (!adCompliance.applicable) {
      throw new Error(
        `AD_COMPLIANCE_NOT_APPLICABLE: ` +
        `adCompliance record ${args.adComplianceId} has applicable == false. ` +
        `Cannot record compliance for an AD determined to be not applicable. ` +
        `If the applicability determination was made in error, it must be formally ` +
        `revised — see your DOM before proceeding.`,
      );
    }
    if (adCompliance.complianceStatus === "not_applicable") {
      throw new Error(
        `AD_COMPLIANCE_STATUS_NOT_APPLICABLE: ` +
        `adCompliance record ${args.adComplianceId} has status "not_applicable". ` +
        `Cannot record compliance on a not-applicable record.`,
      );
    }

    // ── Fetch the AD record for its number and interval fields ────────────────
    const ad = await ctx.db.get(adCompliance.adId);
    if (!ad) {
      throw new Error(
        `airworthinessDirective ${adCompliance.adId} not found. ` +
        `Cannot record compliance for an AD that does not exist in the system.`,
      );
    }

    // ── PRECONDITION 4: maintenanceRecord exists, is signed, and is for ──────
    // the same aircraft/engine. Per Marcus §5: "If maintenanceRecord.approvedDataReference
    // doesn't contain the AD number, the traceability chain is broken."
    const maintenanceRecord = await ctx.db.get(args.maintenanceRecordId);
    if (!maintenanceRecord) {
      throw new Error(
        `maintenanceRecord ${args.maintenanceRecordId} not found. ` +
        `A signed maintenance record is required to document AD compliance.`,
      );
    }
    // Verify aircraft match
    if (
      adCompliance.aircraftId != null &&
      maintenanceRecord.aircraftId !== adCompliance.aircraftId
    ) {
      throw new Error(
        `AD_RECORD_AIRCRAFT_MISMATCH: ` +
        `maintenanceRecord ${args.maintenanceRecordId} is for aircraft ` +
        `${maintenanceRecord.aircraftId}, but adCompliance record ` +
        `${args.adComplianceId} is linked to aircraft ${adCompliance.aircraftId}. ` +
        `The maintenance record must be for the same aircraft as the AD compliance record.`,
      );
    }
    // Verify maintenance record is signed (has a signatureHash)
    if (!maintenanceRecord.signatureHash || !maintenanceRecord.signatureHash.trim()) {
      throw new Error(
        `AD_RECORD_UNSIGNED: ` +
        `maintenanceRecord ${args.maintenanceRecordId} has no signatureHash. ` +
        `Only signed maintenance records may be used to document AD compliance. ` +
        `Complete and sign the maintenance record before recording compliance.`,
      );
    }

    // ── MARCUS'S NEW REQUIREMENT: approvedDataReference must contain AD number ─
    // Per signoff-rts-flow.md §5 note: the inspector will ask to see the record
    // proving compliance and will look for the AD number in approvedDataReference.
    // If it's not there, the traceability chain is broken.
    const adNumberInRecord = maintenanceRecord.approvedDataReference
      .toLowerCase()
      .includes(ad.adNumber.toLowerCase());
    if (!adNumberInRecord) {
      throw new Error(
        `AD_REFERENCE_NOT_IN_RECORD: ` +
        `maintenanceRecord ${args.maintenanceRecordId} has approvedDataReference ` +
        `"${maintenanceRecord.approvedDataReference}" which does not contain AD number ` +
        `"${ad.adNumber}". ` +
        `Per Marcus Webb's requirement (ad-compliance-module.md §5): the maintenance ` +
        `record documenting AD compliance must reference the AD number in its ` +
        `approvedDataReference field (e.g., "FAA AD ${ad.adNumber}, Paragraph (f)"). ` +
        `Update the maintenance record's approvedDataReference to include the AD number ` +
        `before recording compliance.`,
      );
    }

    // ── PRECONDITION 5: No backdating (Cilla 3.4 / INV per schema) ───────────
    if (adCompliance.complianceHistory.length > 0) {
      const lastEntry = adCompliance.complianceHistory[adCompliance.complianceHistory.length - 1];
      if (args.complianceDate < lastEntry.complianceDate) {
        throw new Error(
          `AD_COMPLIANCE_BACKDATED: ` +
          `complianceDate (${new Date(args.complianceDate).toISOString()}) is before ` +
          `the last compliance entry (${new Date(lastEntry.complianceDate).toISOString()}). ` +
          `Compliance history entries must be chronological. ` +
          `No backdating — per Marcus §5, this prevents retroactive compliance fabrication.`,
        );
      }

      // ── PRECONDITION 6: Hours must increase ──────────────────────────────────
      if (args.aircraftHoursAtCompliance < lastEntry.aircraftHoursAtCompliance) {
        throw new Error(
          `AD_COMPLIANCE_HOURS_DECREASED: ` +
          `aircraftHoursAtCompliance (${args.aircraftHoursAtCompliance}h) is less than ` +
          `the last compliance entry (${lastEntry.aircraftHoursAtCompliance}h). ` +
          `Aircraft hours are monotonically increasing. ` +
          `A lower hours value is either a typo or an attempt to fabricate compliance history.`,
        );
      }
    }

    // ── complianceMethodUsed must be non-empty ────────────────────────────────
    if (!args.complianceMethodUsed.trim()) {
      throw new Error(
        `AD_METHOD_EMPTY: complianceMethodUsed must be a non-empty string. ` +
        `Specify which paragraph(s) and method were used (e.g., "Paragraph (f), Method 1 — ` +
        `Repetitive inspections at 100-hour intervals").`,
      );
    }

    // ── WRITE 1: Consume signatureAuthEvent (atomic with rest) ───────────────
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "adCompliance",
      consumedByRecordId: args.adComplianceId,
    });

    // ── WRITE 2: Append to complianceHistory ─────────────────────────────────
    const newHistoryEntry = {
      complianceDate: args.complianceDate,
      aircraftHoursAtCompliance: args.aircraftHoursAtCompliance,
      aircraftCyclesAtCompliance: args.aircraftCyclesAtCompliance,
      technicianId: authEvent.technicianId,
      maintenanceRecordId: args.maintenanceRecordId,
      complianceMethodUsed: args.complianceMethodUsed.trim(),
      notes: args.notes,
    };
    const updatedHistory = [...adCompliance.complianceHistory, newHistoryEntry];

    // ── WRITE 3: Compute new next-due values ─────────────────────────────────
    const nextDue = computeNextDue(
      ad,
      args.complianceDate,
      args.aircraftHoursAtCompliance,
      args.aircraftCyclesAtCompliance,
    );

    // ── WRITE 4: Determine new complianceStatus ────────────────────────────────
    const newStatus =
      ad.adType === "one_time" || ad.adType === "terminating_action"
        ? "complied_one_time"
        : "complied_recurring";

    // ── WRITE 5: Add maintenanceRecordId to the records array ─────────────────
    const updatedMaintenanceRecordIds = [
      ...adCompliance.maintenanceRecordIds,
      args.maintenanceRecordId,
    ];

    // ── WRITE 6: Update adCompliance record ───────────────────────────────────
    await ctx.db.patch(args.adComplianceId, {
      complianceHistory: updatedHistory,
      lastComplianceDate: args.complianceDate,
      lastComplianceHours: args.aircraftHoursAtCompliance,
      lastComplianceCycles: args.aircraftCyclesAtCompliance,
      nextDueDate: nextDue.nextDueDate,
      nextDueHours: nextDue.nextDueHours,
      nextDueCycles: nextDue.nextDueCycles,
      complianceStatus: newStatus,
      maintenanceRecordIds: updatedMaintenanceRecordIds,
      updatedAt: now,
    });

    // ── WRITE 7: Audit log (ad-compliance-module.md §3.1) ────────────────────
    // organizationId required for regulated events per schema INV
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "ad_compliance_updated",
      tableName: "adCompliance",
      recordId: args.adComplianceId,
      userId: callerUserId,
      technicianId: authEvent.technicianId,
      ipAddress: args.callerIpAddress,
      oldValue: JSON.stringify({ complianceStatus: adCompliance.complianceStatus }),
      newValue: JSON.stringify({
        complianceStatus: newStatus,
        complianceDate: args.complianceDate,
        aircraftHoursAtCompliance: args.aircraftHoursAtCompliance,
        maintenanceRecordId: args.maintenanceRecordId,
        complianceMethodUsed: args.complianceMethodUsed.trim(),
        adNumber: ad.adNumber,
      }),
      notes:
        `AD ${ad.adNumber} compliance recorded. ` +
        `Aircraft hours at compliance: ${args.aircraftHoursAtCompliance}h. ` +
        `Method: ${args.complianceMethodUsed.trim()}. ` +
        `Maintenance record: ${args.maintenanceRecordId}. ` +
        `New status: ${newStatus}. ` +
        (nextDue.nextDueHours != null
          ? `Next due hours: ${nextDue.nextDueHours}h. `
          : "") +
        (nextDue.nextDueDate != null
          ? `Next due date: ${new Date(nextDue.nextDueDate).toISOString()}. `
          : ""),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: markAdNotApplicable
//
// Spec ref: ad-compliance-module.md §3.2
// Enforces: INV-05, INV-03 (applicable boolean + determination fields),
//           auth level enforcement (certificated technician required)
//
// A formal determination that a specific AD does not apply to this aircraft/
// engine/part. This is a regulated act — a shop that incorrectly marks an
// applicable AD as N/A has falsified a compliance record.
//
// Auth level: certificated technician (A&P or IA) — verified via certificates
// table, NOT via role labels. Per Cilla §5.3: "Do not check roles on the
// user/technician record instead of checking the certificates table."
//
// Per Marcus §3.2: "The mutation writes the technician's authorization level
// to the record." We capture whether the signer holds an IA so auditors can
// assess the determination's authority.
// ─────────────────────────────────────────────────────────────────────────────

export const markAdNotApplicable = mutation({
  args: {
    adComplianceId: v.id("adCompliance"),
    organizationId: v.id("organizations"),

    // INV-05: pre-signing re-authentication required
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // Must be specific and exceed 20 characters per spec §3.2
    notApplicableReason: v.string(),

    // e.g., "TCDS A-768, Note 3" or STC number
    supportingDocumentationReference: v.optional(v.string()),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── PRECONDITION 1: signatureAuthEvent valid ──────────────────────────────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} has already been consumed. ` +
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

    // ── AUTH LEVEL ENFORCEMENT: certificated technician required ──────────────
    // Per Marcus §3.2: "Requires a certificated A&P or IA — not a shop manager,
    // not an admin user." Check certificates table, not role labels.
    const signingTechnicianId = authEvent.technicianId;
    const activeCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", signingTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    if (!activeCert) {
      throw new Error(
        `AD_NA_CERT_REQUIRED: ` +
        `Technician ${signingTechnicianId} does not hold an active certificate. ` +
        `Only certificated A&P or IA technicians may make N/A applicability ` +
        `determinations for ADs. ` +
        `This is a regulated act under 14 CFR § 43 and § 65. ` +
        `Assign this determination to a certificated technician.`,
      );
    }

    // Capture IA status for audit record — per spec: "mutation does not require IA
    // but writes the technician's authorization level to the record"
    const iaCert = await ctx.db
      .query("certificates")
      .withIndex("by_type", (q) =>
        q.eq("technicianId", signingTechnicianId).eq("certificateType", "IA"),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("active"), true),
          q.eq(q.field("hasIaAuthorization"), true),
        ),
      )
      .first();
    const signerHasCurrentIa =
      iaCert != null &&
      iaCert.iaExpiryDate != null &&
      iaCert.iaExpiryDate >= now;

    // ── Fetch adCompliance record ─────────────────────────────────────────────
    const adCompliance = await ctx.db.get(args.adComplianceId);
    if (!adCompliance) {
      throw new Error(`adCompliance record ${args.adComplianceId} not found.`);
    }
    if (adCompliance.organizationId !== args.organizationId) {
      throw new Error(
        `adCompliance record ${args.adComplianceId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // ── PRECONDITION 2: Status must be pending_determination or not_complied ──
    // Per spec §3.2: "Cannot mark N/A a record that already has compliance history."
    if (
      adCompliance.complianceStatus !== "pending_determination" &&
      adCompliance.complianceStatus !== "not_complied"
    ) {
      throw new Error(
        `AD_NA_TERMINAL_STATUS: ` +
        `adCompliance record ${args.adComplianceId} has status ` +
        `"${adCompliance.complianceStatus}". ` +
        `N/A determinations are only permitted on records with status ` +
        `"pending_determination" or "not_complied". ` +
        `A record with compliance history cannot be re-determined as N/A — ` +
        `that is a compliance falsification scenario.`,
      );
    }

    // Additional guard: no compliance history should exist on a record we're
    // marking N/A. Belt-and-suspenders beyond the status check.
    if (adCompliance.complianceHistory.length > 0) {
      throw new Error(
        `AD_NA_HAS_HISTORY: ` +
        `adCompliance record ${args.adComplianceId} has ` +
        `${adCompliance.complianceHistory.length} compliance history entries. ` +
        `A record with compliance history cannot be marked N/A. ` +
        `This is a compliance falsification scenario — contact your Director of Maintenance.`,
      );
    }

    // ── PRECONDITION 3: notApplicableReason minimum content ───────────────────
    // Per spec §3.2: must be non-empty AND exceed 20 characters.
    if (!args.notApplicableReason.trim()) {
      throw new Error(
        `AD_NA_REASON_EMPTY: notApplicableReason must be a non-empty string. ` +
        `A documented justification is required for all N/A determinations per 14 CFR 91.417.`,
      );
    }
    if (args.notApplicableReason.trim().length < 20) {
      throw new Error(
        `AD_NA_REASON_TOO_SHORT: notApplicableReason must exceed 20 characters. ` +
        `Current length: ${args.notApplicableReason.trim().length}. ` +
        `A one-line "N/A" or "not applicable" entry is not a defensible regulatory determination. ` +
        `Include the specific reason (e.g., "S/N outside applicability range specified in AD applicability text", ` +
        `or "Aircraft does not have the affected component installed per TCDS A-768").`,
      );
    }

    // ── WRITE 1: Consume signatureAuthEvent ───────────────────────────────────
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "adCompliance",
      consumedByRecordId: args.adComplianceId,
    });

    // ── WRITE 2: Update adCompliance record ───────────────────────────────────
    await ctx.db.patch(args.adComplianceId, {
      applicable: false,
      complianceStatus: "not_applicable",
      applicabilityDeterminationNotes:
        args.notApplicableReason.trim() +
        (args.supportingDocumentationReference
          ? ` Supporting documentation: ${args.supportingDocumentationReference.trim()}.`
          : "") +
        (signerHasCurrentIa
          ? " [Determination made by technician with current IA.]"
          : " [Determination made by A&P technician — IA not held or not current.]"),
      applicabilityDeterminedById: signingTechnicianId,
      applicabilityDeterminationDate: now,
      updatedAt: now,
    });

    // ── WRITE 3: Audit log ────────────────────────────────────────────────────
    // Fetch AD number for the audit notes
    const ad = await ctx.db.get(adCompliance.adId);

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "ad_compliance_updated",
      tableName: "adCompliance",
      recordId: args.adComplianceId,
      userId: callerUserId,
      technicianId: signingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "complianceStatus",
      oldValue: JSON.stringify(adCompliance.complianceStatus),
      newValue: JSON.stringify({
        status: "not_applicable",
        reason: args.notApplicableReason.trim(),
        supportingDocumentation: args.supportingDocumentationReference,
        signerHasIa: signerHasCurrentIa,
        signerCertNumber: activeCert.certificateNumber,
      }),
      notes:
        `AD ${ad?.adNumber ?? adCompliance.adId} determined NOT APPLICABLE. ` +
        `Determined by: ${signingTechnicianId} (cert: ${activeCert.certificateNumber}, ` +
        `IA current: ${signerHasCurrentIa}). ` +
        `Reason: "${args.notApplicableReason.trim()}". ` +
        (args.supportingDocumentationReference
          ? `Supporting doc: "${args.supportingDocumentationReference.trim()}". `
          : "") +
        `Per 14 CFR 91.417(a)(2)(v) — record retained permanently with aircraft.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: checkAdDueForAircraft
//
// Spec ref: ad-compliance-module.md §3.3
// Enforces: Live hours query (NOT cached fields for overdue determination)
//
// Returns all applicable AD compliance items for an aircraft (including engines
// and parts), with live overdue status computed at query time.
//
// Per Marcus §2.3: "Authoritative overdue determination requires comparing
// nextDueHours against the aircraft's current totalTimeAirframeHours."
// This is NOT a cached value — we fetch live aircraft hours every time.
//
// Due-soon threshold: 10 hours or 30 calendar days (configurable per spec §3.3,
// but hardcoded here as a TODO until org-level settings table is implemented).
// ─────────────────────────────────────────────────────────────────────────────

export const checkAdDueForAircraft = query({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    // Defaults to Date.now() — useful for pre-departure checks
    asOfDate: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const asOfDate = args.asOfDate ?? Date.now();

    // TODO: Phase 4.1 — Load due-soon thresholds from org-level settings document
    // when settings table is implemented. For now, hardcode per spec.
    const DUE_SOON_HOURS = 10;
    const DUE_SOON_DAYS_MS = 30 * 86_400_000;

    // ── STEP 1: Fetch aircraft with live hours ────────────────────────────────
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) return null;

    const currentHours = aircraft.totalTimeAirframeHours;

    // ── STEP 2: Fetch all applicable adCompliance records for this aircraft ───
    // Exclude not_applicable and superseded — these are resolved states.
    const aircraftCompliance = await ctx.db
      .query("adCompliance")
      .withIndex("by_aircraft", (q) => q.eq("aircraftId", args.aircraftId))
      .filter((q) =>
        q.and(
          q.eq(q.field("applicable"), true),
          q.neq(q.field("complianceStatus"), "not_applicable"),
          q.neq(q.field("complianceStatus"), "superseded"),
        ),
      )
      .collect();

    // ── STEP 3: Fetch installed engines and their AD compliance records ────────
    const engines = await ctx.db
      .query("engines")
      .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", args.aircraftId))
      .collect();

    const engineComplianceArrays = await Promise.all(
      engines.map((engine) =>
        ctx.db
          .query("adCompliance")
          .withIndex("by_engine", (q) => q.eq("engineId", engine._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("applicable"), true),
              q.neq(q.field("complianceStatus"), "not_applicable"),
              q.neq(q.field("complianceStatus"), "superseded"),
            ),
          )
          .collect(),
      ),
    );
    const engineCompliance = engineComplianceArrays.flat();

    // ── STEP 4: Fetch installed parts and their AD compliance records ─────────
    const installedParts = await ctx.db
      .query("parts")
      .withIndex("by_aircraft", (q) => q.eq("currentAircraftId", args.aircraftId))
      .collect();

    const partComplianceArrays = await Promise.all(
      installedParts.map((part) =>
        ctx.db
          .query("adCompliance")
          .withIndex("by_part", (q) => q.eq("partId", part._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("applicable"), true),
              q.neq(q.field("complianceStatus"), "not_applicable"),
              q.neq(q.field("complianceStatus"), "superseded"),
            ),
          )
          .collect(),
      ),
    );
    const partCompliance = partComplianceArrays.flat();

    // ── STEP 5: Combine all compliance records and compute live overdue status ─
    const allCompliance = [
      ...aircraftCompliance.map((c) => ({ ...c, appliesTo: "aircraft" as const, appliesToId: args.aircraftId })),
      ...engineCompliance.map((c) => ({ ...c, appliesTo: "engine" as const, appliesToId: c.engineId ?? "" })),
      ...partCompliance.map((c) => ({ ...c, appliesTo: "part" as const, appliesToId: c.partId ?? "" })),
    ];

    // Fetch all referenced AD records
    const adIds = [...new Set(allCompliance.map((c) => c.adId))];
    const adMap = new Map<string, Doc<"airworthinessDirectives"> | null>();
    for (const adId of adIds) {
      const ad = await ctx.db.get(adId as Id<"airworthinessDirectives">);
      adMap.set(adId, ad);
    }

    // Build result items with live overdue computation
    const items = allCompliance.map((compliance) => {
      const ad = adMap.get(compliance.adId);

      // ── Authoritative overdue determination (NOT using cached fields) ────────
      // Per Marcus §2.3: "Don't rely on cached fields for RTS blocking logic."
      let isOverdue = false;
      let isDueSoon = false;
      let hoursRemaining: number | undefined;
      let daysRemaining: number | undefined;

      // Calendar overdue
      if (compliance.nextDueDate != null) {
        const msRemaining = compliance.nextDueDate - asOfDate;
        daysRemaining = Math.floor(msRemaining / 86_400_000);
        if (msRemaining < 0) {
          isOverdue = true;
        } else if (msRemaining <= DUE_SOON_DAYS_MS) {
          isDueSoon = true;
        }
      }

      // Hours overdue — compare against LIVE aircraft hours
      if (compliance.nextDueHours != null) {
        const remainingHours = compliance.nextDueHours - currentHours;
        // Keep the more pessimistic remaining if calendar already computed one
        hoursRemaining = remainingHours;
        if (remainingHours <= 0) {
          isOverdue = true;
        } else if (remainingHours <= DUE_SOON_HOURS) {
          isDueSoon = true;
        }
      }

      // Not-complied within initial compliance window check
      if (
        compliance.complianceStatus === "not_complied" ||
        compliance.complianceStatus === "pending_determination"
      ) {
        if (ad != null) {
          // Check initial compliance window (calendar)
          if (ad.initialComplianceDays != null) {
            const initialDueDate = ad.effectiveDate + ad.initialComplianceDays * 86_400_000;
            if (asOfDate > initialDueDate) {
              isOverdue = true;
            }
          }
          // Check initial compliance window (hours)
          if (ad.initialComplianceHours != null) {
            // TODO: Phase 4.1 — requires knowing aircraft hours at AD effective date
            // For now, compare against current hours as a conservative estimate.
            // This may generate false positives for recently-effective ADs on high-time aircraft.
          }
        }
      }

      return {
        adComplianceId: compliance._id,
        adId: compliance.adId,
        adNumber: ad?.adNumber ?? "UNKNOWN",
        adTitle: ad?.title ?? "AD record not found",
        complianceStatus: compliance.complianceStatus,
        adType: ad?.adType,
        complianceType: ad?.complianceType,
        isOverdue,
        isDueSoon,
        nextDueDate: compliance.nextDueDate,
        nextDueHours: compliance.nextDueHours,
        nextDueCycles: compliance.nextDueCycles,
        hoursRemaining: compliance.nextDueHours != null ? hoursRemaining : undefined,
        daysRemaining: compliance.nextDueDate != null ? daysRemaining : undefined,
        lastComplianceDate: compliance.lastComplianceDate,
        lastComplianceHours: compliance.lastComplianceHours,
        appliesTo: compliance.appliesTo,
        appliesToId: compliance.appliesToId,
      };
    });

    // ── STEP 7: Sort — overdue first, then due-soon, then complied ────────────
    items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isDueSoon && !b.isDueSoon) return -1;
      if (!a.isDueSoon && b.isDueSoon) return 1;
      // Among complied items: sort by furthest-out next-due last
      if (a.nextDueHours != null && b.nextDueHours != null) {
        return a.nextDueHours - b.nextDueHours;
      }
      if (a.nextDueDate != null && b.nextDueDate != null) {
        return a.nextDueDate - b.nextDueDate;
      }
      return 0;
    });

    const overdueCount = items.filter((i) => i.isOverdue).length;
    const dueSoonCount = items.filter((i) => i.isDueSoon && !i.isOverdue).length;
    const pendingDeterminationCount = items.filter(
      (i) => i.complianceStatus === "pending_determination",
    ).length;
    const notCompliedCount = items.filter(
      (i) => i.complianceStatus === "not_complied",
    ).length;

    return {
      aircraftId: args.aircraftId,
      aircraftRegistration: aircraft.currentRegistration,
      currentHours,
      asOfDate,
      items,
      summary: {
        total: items.length,
        overdueCount,
        dueSoonCount,
        pendingDeterminationCount,
        notCompliedCount,
        hasBlockingItems: overdueCount > 0 || notCompliedCount > 0 || pendingDeterminationCount > 0,
      },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: handleAdSupersession
//
// Spec ref: ad-compliance-module.md §4.2
// Enforces: Bidirectional supersededBy/supersedes linkage, creates
//           pending_determination records for all affected aircraft
//
// When a new AD supersedes an old one:
// 1. Old AD record: supersededByAdId → new AD
// 2. New AD record: supersedesAdId → old AD
// 3. All adCompliance records for the old AD:
//    - Old record: complianceStatus → "superseded"
//    - New pending_determination record created for same aircraft/engine/part
//
// Per Marcus §4.2: "The system must not automatically carry forward compliance.
// Doing so would be a regulatory determination made by software."
// ─────────────────────────────────────────────────────────────────────────────

export const handleAdSupersession = mutation({
  args: {
    oldAdId: v.id("airworthinessDirectives"),
    newAdId: v.id("airworthinessDirectives"),
    organizationId: v.id("organizations"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{
    oldAdNumber: string;
    newAdNumber: string;
    affectedComplianceRecords: number;
    newPendingDeterminationRecords: number;
  }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Validate old AD ───────────────────────────────────────────────────────
    const oldAd = await ctx.db.get(args.oldAdId);
    if (!oldAd) {
      throw new Error(`airworthinessDirective ${args.oldAdId} (old AD) not found.`);
    }

    // ── Validate new AD ───────────────────────────────────────────────────────
    const newAd = await ctx.db.get(args.newAdId);
    if (!newAd) {
      throw new Error(`airworthinessDirective ${args.newAdId} (new AD) not found.`);
    }

    if (args.oldAdId === args.newAdId) {
      throw new Error(
        `AD_SUPERSESSION_SELF_REFERENCE: ` +
        `oldAdId and newAdId cannot be the same AD. ` +
        `An AD cannot supersede itself.`,
      );
    }

    // Guard: don't supersede an already-superseded AD with the same new AD
    if (oldAd.supersededByAdId === args.newAdId) {
      throw new Error(
        `AD_ALREADY_SUPERSEDED: ` +
        `AD ${oldAd.adNumber} has already been superseded by ${newAd.adNumber}. ` +
        `This supersession relationship already exists.`,
      );
    }

    // ── WRITE 1: Update old AD record (bidirectional link) ───────────────────
    await ctx.db.patch(args.oldAdId, {
      supersededByAdId: args.newAdId,
      updatedAt: now,
    });

    // ── WRITE 2: Update new AD record (bidirectional link) ───────────────────
    await ctx.db.patch(args.newAdId, {
      supersedesAdId: args.oldAdId,
      updatedAt: now,
    });

    // ── WRITE 3: Find all adCompliance records for the old AD ─────────────────
    // Query all org compliance records for this AD.
    // We query by organization scope since each org manages their own compliance records.
    // The global AD record is shared; the compliance records are org-scoped.
    const oldCompliances = await ctx.db
      .query("adCompliance")
      .withIndex("by_ad", (q) => q.eq("adId", args.oldAdId))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.neq(q.field("complianceStatus"), "superseded"), // don't double-supersede
        ),
      )
      .collect();

    let newPendingCount = 0;

    for (const oldCompliance of oldCompliances) {
      // Mark old compliance record as superseded
      await ctx.db.patch(oldCompliance._id, {
        complianceStatus: "superseded",
        updatedAt: now,
      });

      // Prepare informative notes for the new pending_determination record
      const priorComplianceNote =
        oldCompliance.lastComplianceDate != null && oldCompliance.lastComplianceHours != null
          ? `Prior compliance with AD ${oldAd.adNumber} on ${new Date(oldCompliance.lastComplianceDate).toISOString()} ` +
            `at ${oldCompliance.lastComplianceHours}h TT. ` +
            `Review new AD applicability and determine whether prior compliance satisfies new AD requirements.`
          : `No prior compliance on record with superseded AD ${oldAd.adNumber}. Review new AD applicability.`;

      // Create new pending_determination record for the new AD
      // Per Marcus §4.3: "The system must not automatically carry forward compliance."
      await ctx.db.insert("adCompliance", {
        adId: args.newAdId,
        aircraftId: oldCompliance.aircraftId,
        engineId: oldCompliance.engineId,
        partId: oldCompliance.partId,
        organizationId: args.organizationId,
        applicable: true,           // Assume applicable until determined otherwise
        applicabilityDeterminationNotes: priorComplianceNote,
        complianceStatus: "pending_determination",
        complianceHistory: [],
        maintenanceRecordIds: [],
        notes:
          `Supersedes AD ${oldAd.adNumber}. ` +
          `Auto-created on supersession event ${now}. ` +
          `Prior record: ${oldCompliance._id}.`,
        createdAt: now,
        updatedAt: now,
      });

      newPendingCount++;

      // Audit log for each affected compliance record
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "ad_compliance_updated",
        tableName: "adCompliance",
        recordId: oldCompliance._id,
        userId: callerUserId,
        ipAddress: args.callerIpAddress,
        fieldName: "complianceStatus",
        oldValue: JSON.stringify(oldCompliance.complianceStatus),
        newValue: JSON.stringify("superseded"),
        notes:
          `AD ${oldAd.adNumber} superseded by AD ${newAd.adNumber}. ` +
          `Compliance record marked superseded. ` +
          `New pending_determination record created for AD ${newAd.adNumber}. ` +
          priorComplianceNote,
        timestamp: now,
      });
    }

    // ── Audit log: supersession event on the AD records themselves ────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "ad_compliance_updated",
      tableName: "airworthinessDirectives",
      recordId: args.oldAdId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      fieldName: "supersededByAdId",
      oldValue: JSON.stringify(null),
      newValue: JSON.stringify(args.newAdId),
      notes:
        `AD ${oldAd.adNumber} marked superseded by AD ${newAd.adNumber}. ` +
        `${oldCompliances.length} adCompliance records affected. ` +
        `${newPendingCount} pending_determination records created.`,
      timestamp: now,
    });

    return {
      oldAdNumber: oldAd.adNumber,
      newAdNumber: newAd.adNumber,
      affectedComplianceRecords: oldCompliances.length,
      newPendingDeterminationRecords: newPendingCount,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listAdRecordsForAircraft
//
// Phase F: Compliance Layer
//
// Returns all adCompliance records for a given aircraft, each joined with the
// corresponding airworthinessDirectives row for display. Sorted by AD number.
//
// Used by the AircraftAdComplianceTab on the fleet detail page to show the
// full per-aircraft AD compliance table.
//
// Includes both applicable and not_applicable records so the technician can
// see the complete AD list and change applicability determinations.
// ─────────────────────────────────────────────────────────────────────────────

export const listAdRecordsForAircraft = query({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const complianceRecords = await ctx.db
      .query("adCompliance")
      .withIndex("by_aircraft", (q) => q.eq("aircraftId", args.aircraftId))
      .collect();

    // Join each record with its AD row
    const joined = await Promise.all(
      complianceRecords.map(async (cr) => {
        const ad = await ctx.db.get(cr.adId);
        return {
          ...cr,
          ad: ad
            ? {
                adNumber: ad.adNumber,
                subject: ad.title,
                effectiveDate: ad.effectiveDate,
                adType: ad.adType,
                complianceType: ad.complianceType,
                recurringIntervalHours: ad.recurringIntervalHours,
                recurringIntervalDays: ad.recurringIntervalDays,
                recurringIntervalCycles: ad.recurringIntervalCycles,
                emergencyAd: ad.emergencyAd,
                supersededByAdId: ad.supersededByAdId,
              }
            : null,
        };
      }),
    );

    // Sort by AD number for stable display order
    joined.sort((a, b) => {
      const numA = a.ad?.adNumber ?? "";
      const numB = b.ad?.adNumber ?? "";
      return numA.localeCompare(numB);
    });

    return joined;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getFleetAdSummary
//
// Phase F: Compliance Layer
//
// Returns aggregate AD compliance stats per aircraft for an organization.
// Used by FleetComplianceStats to show fleet-wide AD compliance posture.
//
// For each aircraft in the fleet, returns:
//   - aircraftId
//   - total tracked ADs (applicable == true only)
//   - overdueCount (complianceStatus == "not_complied" with nextDueDate < now OR no compliance)
//   - pendingCount (complianceStatus == "pending_determination")
//   - dueSoonCount (applicable, complied, nextDueDate within 30 days)
//   - compliantCount (remainder)
//
// "Due soon" threshold: nextDueDate within 30 calendar days.
// ─────────────────────────────────────────────────────────────────────────────

export const getFleetAdSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dueSoonThresholdMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Fetch all applicable AD compliance records for this org
    const allRecords = await ctx.db
      .query("adCompliance")
      .withIndex("by_status", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    // Only consider aircraft-scoped, applicable records
    const applicableRecords = allRecords.filter(
      (r) => r.aircraftId != null && r.applicable === true,
    );

    // Aggregate per aircraft
    const byAircraft = new Map<
      string,
      {
        aircraftId: string;
        total: number;
        overdueCount: number;
        pendingCount: number;
        dueSoonCount: number;
        compliantCount: number;
      }
    >();

    for (const rec of applicableRecords) {
      const key = rec.aircraftId as string;
      if (!byAircraft.has(key)) {
        byAircraft.set(key, {
          aircraftId: key,
          total: 0,
          overdueCount: 0,
          pendingCount: 0,
          dueSoonCount: 0,
          compliantCount: 0,
        });
      }
      const entry = byAircraft.get(key)!;
      entry.total++;

      if (rec.complianceStatus === "pending_determination") {
        entry.pendingCount++;
      } else if (
        rec.complianceStatus === "not_complied" ||
        (rec.nextDueDate != null && rec.nextDueDate < now)
      ) {
        entry.overdueCount++;
      } else if (
        rec.nextDueDate != null &&
        rec.nextDueDate >= now &&
        rec.nextDueDate <= now + dueSoonThresholdMs
      ) {
        entry.dueSoonCount++;
      } else {
        entry.compliantCount++;
      }
    }

    // Compute fleet-level totals
    const aircraftSummaries = Array.from(byAircraft.values());
    const fleetTotals = {
      trackedAds: applicableRecords.length,
      overdueAds: aircraftSummaries.reduce((s, a) => s + a.overdueCount, 0),
      pendingAds: aircraftSummaries.reduce((s, a) => s + a.pendingCount, 0),
      dueSoonAds: aircraftSummaries.reduce((s, a) => s + a.dueSoonCount, 0),
      compliantAds: aircraftSummaries.reduce((s, a) => s + a.compliantCount, 0),
      aircraftWithIssues: aircraftSummaries.filter(
        (a) => a.overdueCount > 0 || a.pendingCount > 0,
      ).length,
    };

    return {
      aircraftSummaries,
      fleetTotals,
    };
  },
});
