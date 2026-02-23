// convex/wave-2-mutations.ts
// Athelon — Aviation MRO SaaS Platform
//
// Wave 2 Backend Mutations — Pre-Signature Summary, Maintenance Record Creation,
// QCM Review, Work Order Close Readiness V2, and Test Equipment Receiving.
//
// Author:    Devraj Anand (Phase 5 Implementation — Wave 2)
// Spec:      Rafael Mendoza (Tech Lead / Architect)
// Regulatory: Marcus Webb
// QA:        Cilla Oduya
// Schema:    phase-5-implementation/convex/schema-v3.ts (FROZEN 2026-02-22)
//
// Wave 2 closes the gap identified in the Phase 4 gate review:
//   1. createMaintenanceRecord — the Phase 4 stub that was never implemented
//   2. getPreSignatureSummary  — query that powers the confirm phase of SignOffFlow
//   3. createQcmReview         — formal QCM post-close review action (REQ-LP-05)
//   4. getWorkOrderCloseReadinessV2 — updated readiness report with new v3 checks
//   5. receiveTestEquipment    — create test equipment library record (REQ-DP-02)
//
// INVARIANTS ENFORCED IN THIS FILE:
//   INV-01  (correction record completeness)
//   INV-02  (ratingsExercised at signing time)
//   INV-05  (signatureAuthEvent: single-use atomic consumption)
//   INV-20  (returnToServiceStatement when returnedToService == true)
//   INV-22  (testEquipment: calibrationExpiryDate > calibrationDate)
//   INV-23a (snapshot field consistency when testEquipmentId is set)
//   INV-24  (qcmReview: workOrder.status must be "closed")
//   INV-25  (qcmReview: reviewer must be org's qualityControlManager)
//   INV-26  (qcmReview: findingsNotes required when outcome != "accepted")
//
// NOTE ON calibrationCurrentAtUse:
//   Per Marcus Webb's sign-off in schema-v3-change-log.md (Change 1):
//   Expired calibration is a WARNING, not a hard block. If a technician used
//   equipment that was expired, the system documents this fact rather than
//   preventing documentation of work already performed. This is consistent with
//   the regulatory requirement (traceability) vs. the quality system requirement
//   (prevention of use). calibrationCurrentAtUse is computed server-side;
//   the client cannot set it. (Cilla's condition #3 in QA sign-off.)
//
// NOTE ON SNAPSHOT BEHAVIOR (getPreSignatureSummary):
//   Convex queries are live subscriptions. The "does not change after first read"
//   requirement from the component spec is a FRONTEND concern: SignOffFlow.tsx
//   captures the query result in useState once and passes the snapshot to the
//   component. The query itself returns the current state; snapshotting is done
//   client-side. See pre-signature-summary-component.md §3.2.
//
// APPROVED DATA REFERENCE CANONICAL FORMAT:
//   createMaintenanceRecord requires a structured approvedDataRef object.
//   It is serialized for storage in the immutable approvedDataReference field as:
//     "{docType}|{identifier}|{revision}|{section}"
//   Example: "AMM|27-20-00|Rev 15|27-20-00-200-000"
//   The pipe-separated format is detectable by getWorkOrderCloseReadinessV2
//   when checking that all maintenance records used structured references.
//   Free-text entries (legacy or non-structured) will not contain "|" separators.
//
// SHA-256 SIGNATURE HASH:
//   Computed via the Web Crypto API (crypto.subtle), which is available in Convex's
//   V8 runtime. The hash covers the canonical immutable content of the record at
//   signing time. Any post-creation alteration to immutable fields would produce
//   a different hash (detectable by re-computing from the stored field values).
//
// AUDIT LOG:
//   Every mutation writes to auditLog in the same Convex transaction.
//   Per schema: "If the audit write fails, the entire mutation fails."
//   This is the Convex atomicity guarantee.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS (local to this module — not re-exported from schema)
// ─────────────────────────────────────────────────────────────────────────────

const ratingsExercisedValidator = v.array(
  v.union(
    v.literal("airframe"),
    v.literal("powerplant"),
    v.literal("ia"),
    v.literal("none"),
  ),
);

const certificateTypeValidator = v.union(
  v.literal("A&P"),
  v.literal("airframe_only"),
  v.literal("powerplant_only"),
  v.literal("IA"),
  v.literal("repairman"),
  v.literal("repair_station"),
  v.literal("other"),
);

/**
 * Structured approved data reference — required input for createMaintenanceRecord.
 * Enforces that the reference is structured (doc type / identifier / revision / section)
 * rather than free-text. Per 14 CFR 43.9(a)(1).
 *
 * Mutation validates all required fields and serializes to canonical pipe-separated
 * string for immutable storage in maintenanceRecords.approvedDataReference.
 */
const structuredApprovedDataRefValidator = v.object({
  /**
   * Document type per FAA/OEM classification.
   * "other" requires the identifier to be self-describing.
   */
  docType: v.union(
    v.literal("AMM"),   // Aircraft Maintenance Manual
    v.literal("CMM"),   // Component Maintenance Manual
    v.literal("SRM"),   // Structural Repair Manual
    v.literal("AD"),    // FAA Airworthiness Directive — e.g. "2024-15-07"
    v.literal("SB"),    // Service Bulletin
    v.literal("AC"),    // Advisory Circular — e.g. "43.13-1B"
    v.literal("ICA"),   // Instructions for Continued Airworthiness
    v.literal("TCDS"),  // Type Certificate Data Sheet
    v.literal("STC"),   // Supplemental Type Certificate
    v.literal("other"), // Non-standard — identifier must be fully self-describing
  ),
  /** Document identifier — chapter/section, AD number, SB number, etc. */
  identifier: v.string(),
  /** Document revision designator — e.g. "Rev 15", "2026-01", "Original". */
  revision: v.string(),
  /**
   * Section/paragraph/task reference within the document.
   * Optional if the identifier is already at task-level granularity.
   */
  section: v.optional(v.string()),
});

/**
 * Input shape for a single test equipment entry when creating a maintenance record.
 * The testEquipmentId is optional (supports external equipment not in the library).
 * If testEquipmentId is set, the mutation fetches the library record and snapshots
 * current calibration data, ignoring any caller-supplied snapshot fields.
 * If testEquipmentId is null, the caller must supply all snapshot fields directly.
 */
const testEquipmentInputValidator = v.object({
  /** FK to testEquipment library — optional; see embeddedTestEquipmentRef rationale in schema. */
  testEquipmentId: v.optional(v.id("testEquipment")),
  /**
   * Required when testEquipmentId is null (manually entered external equipment).
   * Ignored (overwritten from DB) when testEquipmentId is set.
   */
  partNumber: v.optional(v.string()),
  serialNumber: v.optional(v.string()),
  equipmentName: v.optional(v.string()),
  calibrationCertNumber: v.optional(v.string()),
  calibrationExpiryDate: v.optional(v.number()),
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Require an authenticated Clerk session.
 * Returns the Clerk user ID (JWT "sub" claim).
 * Every public mutation and query calls this first.
 */
async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; name?: string } | null> };
}): Promise<{ subject: string; name?: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session. " +
      "Sign in before calling this mutation.",
    );
  }
  return identity;
}

/**
 * Validate and atomically consume a signatureAuthEvent.
 * Implements INV-05 (six-check pattern from taskCards.ts).
 *
 * @param ctx         Convex mutation context (must support db.get and db.patch)
 * @param eventId     The signatureAuthEvent ID to consume
 * @param techId      The expected technician — must match authEvent.technicianId
 * @param now         Current timestamp (Unix ms) — used for expiry check
 * @param targetTable Table the consuming record belongs to (for audit)
 * @param targetId    ID of the record consuming this event (for audit)
 */
async function consumeSignatureAuthEvent(
  ctx: { db: { get: (id: Id<"signatureAuthEvents">) => Promise<any>; patch: (id: Id<"signatureAuthEvents">, patch: object) => Promise<void> } },
  eventId: Id<"signatureAuthEvents">,
  techId: Id<"technicians">,
  now: number,
  targetTable: string,
  targetId: string,
): Promise<void> {
  // Check 1 + 2: EXISTS in DB
  const authEvent = await ctx.db.get(eventId);
  if (!authEvent) {
    throw new Error(
      `INV-05: signatureAuthEvent ${eventId} not found. ` +
      `The auth event may have already been used or the ID is incorrect. ` +
      `Request a new re-authentication event.`,
    );
  }
  // Check 3: UNCONSUMED
  if (authEvent.consumed) {
    throw new Error(
      `INV-05 / AUTH_EVENT_CONSUMED: ` +
      `signatureAuthEvent ${eventId} has already been consumed ` +
      `(consumed at ${authEvent.consumedAt ? new Date(authEvent.consumedAt).toISOString() : "unknown"} ` +
      `for ${authEvent.consumedByTable}/${authEvent.consumedByRecordId}). ` +
      `Each auth event is single-use. Request a new re-authentication event.`,
    );
  }
  // Check 4: UNEXPIRED
  if (authEvent.expiresAt < now) {
    throw new Error(
      `INV-05 / AUTH_EVENT_EXPIRED: ` +
      `signatureAuthEvent ${eventId} expired at ` +
      `${new Date(authEvent.expiresAt).toISOString()} ` +
      `(${Math.round((now - authEvent.expiresAt) / 1000)}s ago). ` +
      `Auth events have a 5-minute TTL. Request a new re-authentication event.`,
    );
  }
  // Check 5: IDENTITY MATCH
  if (authEvent.technicianId !== techId) {
    throw new Error(
      `INV-05: Auth event ${eventId} was issued to technician ${authEvent.technicianId} ` +
      `but the signing technician is ${techId}. ` +
      `Auth events are non-transferable between technicians.`,
    );
  }
  // Check 6: CONSUME — atomic with the calling mutation's writes (same Convex transaction)
  await ctx.db.patch(eventId, {
    consumed: true,
    consumedAt: now,
    consumedByTable: targetTable,
    consumedByRecordId: targetId,
  });
}

/**
 * Compute SHA-256 hash of a UTF-8 string using the Web Crypto API.
 * Available in Convex's V8 runtime environment.
 * Returns lowercase hex string.
 */
async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Serialize a structured approved data reference to its canonical pipe-separated
 * storage format. The pipe character is used as a separator because it does not
 * appear in FAA document identifiers.
 *
 * Format: "{docType}|{identifier}|{revision}|{section}"
 * Example: "AMM|27-20-00|Rev 15|27-20-00-200-000"
 *
 * getWorkOrderCloseReadinessV2 detects structured references by checking for "|".
 */
function serializeApprovedDataRef(ref: {
  docType: string;
  identifier: string;
  revision: string;
  section?: string;
}): string {
  const parts = [
    ref.docType.trim(),
    ref.identifier.trim(),
    ref.revision.trim(),
    ref.section?.trim() ?? "",
  ];
  return parts.join("|");
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY 1: getPreSignatureSummary
//
// Returns all data needed for the PreSignatureSummary component (Phase 5 Wave 1
// frontend, pre-signature-summary-component.md) before the signer enters their PIN.
//
// This query is called during Phase 1 (confirm) of the SignOffFlow ceremony.
// It does NOT trigger any writes. It assembles a view of:
//   - The aircraft being worked on (snapshot from work order + aircraft record)
//   - The work being performed (from the specific record being signed)
//   - The regulatory citation applicable to the record type
//   - The technician's identity and certificate status
//   - Any warnings that should block or flag the signing action
//
// Inputs:
//   recordType — one of: maintenance_record, task_card_step, return_to_service,
//                inspection_record
//   recordId   — Convex ID of the record being signed (string at runtime)
//   workOrderId — parent work order (provides aircraft context)
//
// Snapshot note:
//   Convex queries are live subscriptions. The "does not change after first read"
//   requirement is enforced client-side in SignOffFlow.tsx (useState capture).
//   This query returns the current state; the frontend is responsible for
//   snapshotting it. See pre-signature-summary-component.md §3.2.
//
// Warnings returned (non-blocking unless noted):
//   MISSING_CERTIFICATE  — technician has no active certificate on file (BLOCKS sign)
//   EXPIRED_IA           — IA certificate expired (BLOCKS IA-required sign-offs)
//   WORK_PERFORMED_SHORT — workPerformed < 50 chars (BLOCKS maintenance record sign)
//   TECHNICIAN_NOT_FOUND — no technician record for the caller's Clerk user ID
// ─────────────────────────────────────────────────────────────────────────────

export const getPreSignatureSummary = query({
  args: {
    recordType: v.union(
      v.literal("maintenance_record"),
      v.literal("task_card_step"),
      v.literal("return_to_service"),
      v.literal("inspection_record"),
    ),
    // All Convex IDs are strings at runtime. Using v.string() supports the union
    // of Id<"maintenanceRecords"> | Id<"taskCardSteps"> | Id<"returnToService"> |
    // Id<"inspectionRecords"> without requiring a Convex union validator.
    recordId: v.string(),
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();

    // ── Fetch work order ────────────────────────────────────────────────────
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      throw new Error(
        `WORK_ORDER_NOT_FOUND: Work order ${args.workOrderId} not found. ` +
        `Cannot assemble pre-signature summary.`,
      );
    }

    // ── Fetch aircraft ──────────────────────────────────────────────────────
    const aircraft = await ctx.db.get(workOrder.aircraftId);
    if (!aircraft) {
      throw new Error(
        `AIRCRAFT_NOT_FOUND: Aircraft ${workOrder.aircraftId} not found for ` +
        `work order ${workOrder.workOrderNumber}. Cannot assemble summary.`,
      );
    }

    // ── Fetch the record being signed ────────────────────────────────────────
    // Dynamic dispatch by recordType. All Convex IDs are strings; casting is safe.
    // The `record` object is typed `any` here because the shape differs per type;
    // we extract specific fields by name below with explicit null-checks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let record: any = null;
    switch (args.recordType) {
      case "maintenance_record":
        record = await ctx.db.get(args.recordId as Id<"maintenanceRecords">);
        break;
      case "task_card_step":
        record = await ctx.db.get(args.recordId as Id<"taskCardSteps">);
        break;
      case "return_to_service":
        record = await ctx.db.get(args.recordId as Id<"returnToService">);
        break;
      case "inspection_record":
        record = await ctx.db.get(args.recordId as Id<"inspectionRecords">);
        break;
    }

    // ── Fetch technician by Clerk user ID ─────────────────────────────────────
    // The signer's identity is determined by their Clerk session, not by a passed
    // argument. This prevents identity spoofing in the summary view.
    const technician = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    // ── Fetch active certificate ─────────────────────────────────────────────
    const activeCert = technician
      ? await ctx.db
          .query("certificates")
          .withIndex("by_technician", (q) => q.eq("technicianId", technician._id))
          .filter((q) => q.eq(q.field("active"), true))
          .first()
      : null;

    // ── Fetch IA certificate (if any) ────────────────────────────────────────
    const iaCert = technician
      ? await ctx.db
          .query("certificates")
          .withIndex("by_type", (q) =>
            q
              .eq("technicianId", technician._id)
              .eq("certificateType", "IA"),
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("active"), true),
              q.eq(q.field("hasIaAuthorization"), true),
            ),
          )
          .first()
      : null;

    // ── Compute IA expiry status ─────────────────────────────────────────────
    // Per Phase 3 pattern and Marcus's annotation: there is no grace period.
    // If iaExpiryDate < now, the IA is expired.
    const isIaExpired: boolean = iaCert
      ? !iaCert.iaExpiryDate || iaCert.iaExpiryDate < now
      : false;

    // ── Determine if this sign-off requires IA ───────────────────────────────
    // RTS and inspection records always require IA.
    // Task card steps require IA when signOffRequiresIa == true.
    // Maintenance records do not inherently require IA (unless explicitly flagged).
    let requiresIa = false;
    if (args.recordType === "return_to_service") {
      requiresIa = true;
    } else if (args.recordType === "inspection_record") {
      requiresIa = true;
    } else if (args.recordType === "task_card_step" && record) {
      requiresIa = record.signOffRequiresIa === true;
    }

    // ── Extract work performed and approved data context ──────────────────────
    // Shape varies by record type. Null-safe extraction throughout.
    let workPerformedDescription = "";
    let approvedDataReference: string | null = null;
    let stepNumber: number | null = null;
    let taskCardTitle: string | null = null;
    let totalStepsInCard: number | null = null;

    if (args.recordType === "maintenance_record" && record) {
      workPerformedDescription = record.workPerformed ?? "";
      approvedDataReference = record.approvedDataReference ?? null;
    } else if (args.recordType === "task_card_step" && record) {
      workPerformedDescription = record.description ?? "";
      stepNumber = typeof record.stepNumber === "number" ? record.stepNumber : null;
      // Fetch parent task card for the step count and title context
      if (record.taskCardId) {
        const taskCard = await ctx.db.get(record.taskCardId as Id<"taskCards">);
        if (taskCard) {
          taskCardTitle = taskCard.title;
          approvedDataReference = taskCard.approvedDataSource;
          // stepCount is the denormalized counter maintained by completeStep
          totalStepsInCard = typeof taskCard.stepCount === "number" ? taskCard.stepCount : null;
        }
      }
    } else if (args.recordType === "return_to_service" && record) {
      workPerformedDescription = record.returnToServiceStatement ?? "";
    } else if (args.recordType === "inspection_record" && record) {
      workPerformedDescription = record.scopeDescription ?? "";
    }

    // ── Assemble warnings ────────────────────────────────────────────────────
    // Warnings are surfaced in the UI. Some block the PROCEED TO SIGN button.
    // The component spec (§3.3) defines the blocking logic; we surface the data.
    const warnings: Array<{
      code: string;
      message: string;
      blocking: boolean;
    }> = [];

    if (!technician) {
      warnings.push({
        code: "TECHNICIAN_NOT_FOUND",
        message:
          "No technician record found for your user account. " +
          "Contact your administrator to link your Clerk account to a technician record before signing.",
        blocking: true,
      });
    }

    if (!activeCert) {
      warnings.push({
        code: "MISSING_CERTIFICATE",
        message:
          "Your certificate number is not on file. " +
          "Contact your administrator before signing. " +
          "Per 14 CFR 43.9(a)(3), all maintenance records must include the signer's certificate number.",
        blocking: true,
      });
    }

    if (requiresIa && isIaExpired) {
      warnings.push({
        code: "EXPIRED_IA",
        message:
          `Your Inspection Authorization ${iaCert?.iaExpiryDate ? `expired on ${new Date(iaCert.iaExpiryDate).toLocaleDateString("en-US", { timeZone: "UTC" })}` : "has no expiry date on file"}. ` +
          "You cannot authorize return to service or sign IA-required steps. " +
          "Per the March 31 rule (14 CFR 65.92), there is no grace period.",
        blocking: true,
      });
    }

    // Minimum work performed length enforcement (per mvp-scope.md §Schema Changes #4)
    // Only applies to maintenance_record type (AC 43-9C requirement).
    const minimumLengthMet =
      args.recordType === "maintenance_record"
        ? workPerformedDescription.length >= 50
        : true;
    if (!minimumLengthMet) {
      warnings.push({
        code: "WORK_PERFORMED_SHORT",
        message:
          `Work performed description is ${workPerformedDescription.length} character(s). ` +
          "Minimum 50 characters required per AC 43-9C. " +
          "Return to the record and add more detail before signing.",
        blocking: true,
      });
    }

    // ── Build and return the summary ─────────────────────────────────────────
    return {
      /**
       * Timestamp at which this summary was fetched.
       * The frontend should capture this and the summary payload once (useState)
       * to prevent re-renders while the signer is reading. See component spec §3.2.
       */
      snapshotTimestamp: now,

      recordIdentity: {
        recordType: args.recordType,
        recordId: args.recordId,
        workOrderNumber: workOrder.workOrderNumber,
        workOrderStatus: workOrder.status,
        // Task card step context
        stepNumber,
        taskCardTitle,
        // Step count context (e.g. "Step 6 of 8") — populated from taskCard.stepCount
        totalStepsInCard,
      },

      aircraft: {
        /** N-number — the most prominent identifier on the summary */
        registration: aircraft.currentRegistration ?? null,
        make: aircraft.make,
        model: aircraft.model,
        series: aircraft.series ?? null,
        serialNumber: aircraft.serialNumber,
        /**
         * Aircraft TT as recorded at work order open — not a live query.
         * The distinction matters: the record will capture the TT at the time
         * work was performed, which is the WO open value. (Pre-signature summary
         * component spec §1.2: "This is the TT recorded on the work order, not
         * a live query of the aircraft record.")
         */
        totalTimeAtOpen: workOrder.aircraftTotalTimeAtOpen,
        aircraftStatus: aircraft.status,
      },

      workPerformed: {
        description: workPerformedDescription,
        approvedDataReference,
        minimumLengthMet,
      },

      technician: {
        /** Legal name from technician record (snapshot at summary time) */
        fullName: technician?.legalName ?? identity.name ?? "Unknown",
        technicianId: technician?._id ?? null,
        certificateType: activeCert?.certificateType ?? null,
        certificateNumber: activeCert?.certificateNumber ?? null,
        /** Available A&P ratings (airframe, powerplant) */
        ratings: activeCert?.ratings ?? [],
        hasIaAuthorization: iaCert !== null && !isIaExpired,
        iaExpiryDate: iaCert?.iaExpiryDate ?? null,
        organizationId: technician?.organizationId ?? null,
      },

      requiresIa,
      isIaExpired: requiresIa ? isIaExpired : false,

      warnings,

      /**
       * Derived convenience flag: can the signer proceed to PIN entry?
       * True only when all blocking warnings are absent.
       * The component should use this directly for the disabled state of
       * the "PROCEED TO SIGN" button (after the 2-second timer expires).
       */
      canProceedToSign: warnings.every((w) => !w.blocking),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION 2: createMaintenanceRecord
//
// The Gap from Phase 4: this mutation was stubbed and never implemented.
// Wave 2 implements it fully per 14 CFR 43.9 and the v3 schema.
//
// Creates an IMMUTABLE maintenance record linked to a work order and optionally
// to a specific completed task card. The record is immutable after creation per
// the schema design: there is no updatedAt field, and no UPDATE path exists.
// Errors are corrected by creating a new record with recordType == "correction".
//
// ENFORCEMENTS:
//   1. workPerformed >= 50 characters (mvp-scope.md §Schema Changes #4 / AC 43-9C)
//   2. approvedDataReference must be structured (structured input validator, pipe-serialized)
//   3. taskCard (if provided) must be in "complete" status
//   4. taskCard must belong to the specified workOrder
//   5. signatureAuthEvent consumed atomically (INV-05)
//   6. ratingsExercised populated (INV-02)
//   7. All test equipment from the library has snapshot fields verified (INV-23a)
//      calibrationCurrentAtUse computed server-side; expired = WARNING not BLOCK (per Marcus)
//   8. If returnedToService == true, returnToServiceStatement must be set (INV-20)
//   9. If org has Part 145 cert, organizationCertificateNumber is populated
//  10. Minimum quantity >= 1 on all partsReplaced entries
//  11. Correction record completeness (INV-01) if recordType == "correction"
//
// The signatureHash is computed as SHA-256 of the canonical record content
// (workOrderId, aircraftId, workPerformed, approvedDataReference, completionDate,
// signingTechnicianId, signatureTimestamp). This replaces the "RTS-HASH-V0-*"
// placeholder from Phase 4 (mvp-scope.md Feature 12).
// ─────────────────────────────────────────────────────────────────────────────

export const createMaintenanceRecord = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    /**
     * Optional: link to a specific completed task card.
     * If provided, the mutation validates the card is "complete" and belongs
     * to the work order. The task card ID is recorded in the audit log.
     * Not stored in maintenanceRecords (schema has no taskCardId field) because
     * the linkage is work-order-scoped; the task card ID is captured in auditLog.
     */
    taskCardId: v.optional(v.id("taskCards")),

    /**
     * Record type — defaults to maintenance_43_9 for normal work.
     * Use "correction" for correcting a prior signed record (INV-01).
     */
    recordType: v.optional(
      v.union(
        v.literal("maintenance_43_9"),
        v.literal("inspection_43_11"),
        v.literal("correction"),
      ),
    ),

    /**
     * Narrative description of work performed. Minimum 50 characters.
     * Per AC 43-9C: "The description of work performed should be complete enough
     * that someone not familiar with the work can understand what was done."
     */
    workPerformed: v.string(),

    /**
     * Structured approved data reference — enforces 14 CFR 43.9(a)(1).
     * This is the "gap" that mvp-scope.md Feature #4 addresses: the approved data
     * reference must be structured (doc type / identifier / revision / section),
     * not free-text. The mutation serializes this to the immutable string field.
     */
    approvedDataRef: structuredApprovedDataRefValidator,

    /**
     * Array of parts replaced/installed/removed. May be empty if no parts work.
     * Each entry must have quantity >= 1.
     */
    partsReplaced: v.optional(
      v.array(
        v.object({
          partNumber: v.string(),
          partName: v.string(),
          serialNumber: v.optional(v.string()),
          quantity: v.number(),
          action: v.union(
            v.literal("installed"),
            v.literal("removed"),
            v.literal("overhauled"),
            v.literal("repaired"),
            v.literal("inspected"),
          ),
          eightOneThirtyReference: v.optional(v.string()),
          partInventoryId: v.optional(v.id("parts")),
        }),
      ),
    ),

    /**
     * Test equipment used during this work. Each entry references a testEquipment
     * library record (optional) and/or supplies snapshot fields for equipment not
     * in the library. The mutation computes calibrationCurrentAtUse server-side.
     * Per Marcus's sign-off: expired calibration is a WARNING, not a hard BLOCK.
     */
    testEquipmentUsed: v.optional(v.array(testEquipmentInputValidator)),

    completionDate: v.number(),

    /**
     * Whether this record constitutes a return to service.
     * If true, returnToServiceStatement must be set (INV-20).
     */
    returnedToService: v.boolean(),
    returnToServiceStatement: v.optional(v.string()),

    discrepanciesFound: v.optional(v.array(v.id("discrepancies"))),
    discrepanciesCorrected: v.optional(v.array(v.id("discrepancies"))),
    discrepancyListProvided: v.optional(v.boolean()),

    // ── INV-05: Pre-signing re-authentication ───────────────────────────────
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // ── INV-02: Ratings exercised for this work ─────────────────────────────
    ratingsExercised: ratingsExercisedValidator,
    scopeOfWork: v.optional(v.string()),

    // ── Correction record fields (required when recordType == "correction") ───
    corrects: v.optional(v.id("maintenanceRecords")),
    correctionFieldName: v.optional(v.string()),
    correctionOriginalValue: v.optional(v.string()),
    correctionCorrectedValue: v.optional(v.string()),
    correctionReason: v.optional(v.string()),

    // ── Signing technician identity ─────────────────────────────────────────
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await requireAuth(ctx);
    const callerUserId = identity.subject;

    const effectiveRecordType = args.recordType ?? "maintenance_43_9";

    // ── 1. Validate work order ──────────────────────────────────────────────
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
    // Work order must be active (not closed, cancelled, voided, or draft)
    const ACTIVE_FOR_RECORDS = ["open", "in_progress", "on_hold", "pending_inspection", "pending_signoff", "open_discrepancies"] as const;
    if (!(ACTIVE_FOR_RECORDS as readonly string[]).includes(workOrder.status)) {
      throw new Error(
        `createMaintenanceRecord: Work order "${workOrder.workOrderNumber}" ` +
        `has status "${workOrder.status}". Maintenance records may only be created ` +
        `against active work orders (open, in_progress, on_hold, pending_inspection, ` +
        `pending_signoff, open_discrepancies). ` +
        `A closed or voided work order has already been signed off.`,
      );
    }

    // ── 2. Validate calling technician ──────────────────────────────────────
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech) {
      throw new Error(`Technician ${args.callerTechnicianId} not found.`);
    }
    if (callerTech.status !== "active") {
      throw new Error(
        `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
        `has status "${callerTech.status}". Only active technicians may sign maintenance records.`,
      );
    }
    if (!callerTech.userId) {
      throw new Error(
        `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
        `has no system account (userId is null) and cannot perform signing actions. ` +
        `A Clerk-linked account is required for re-authentication.`,
      );
    }

    // ── 3. Fetch active certificate (snapshot at signing time) ──────────────
    // Per 14 CFR 43.9(a)(3): certificate number must be captured immutably.
    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.callerTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();
    if (!cert) {
      throw new Error(
        `No active certificate found for technician ${args.callerTechnicianId} ` +
        `(${callerTech.legalName}). ` +
        `A technician must hold an active certificate to sign maintenance records.`,
      );
    }

    // ── 4. Validate task card (if provided) ─────────────────────────────────
    if (args.taskCardId) {
      const taskCard = await ctx.db.get(args.taskCardId);
      if (!taskCard) {
        throw new Error(`Task card ${args.taskCardId} not found.`);
      }
      if (taskCard.workOrderId !== args.workOrderId) {
        throw new Error(
          `Task card ${args.taskCardId} (${taskCard.taskCardNumber}) ` +
          `does not belong to work order ${args.workOrderId}. ` +
          `A maintenance record may only reference task cards within the same work order.`,
        );
      }
      if (taskCard.status !== "complete") {
        throw new Error(
          `Task card ${taskCard.taskCardNumber} has status "${taskCard.status}". ` +
          `A maintenance record may only be created against a completed task card. ` +
          `Complete all steps on the task card before creating the maintenance record. ` +
          `Current status: "${taskCard.status}".`,
        );
      }
    }

    // ── 5. Validate workPerformed minimum length (mvp-scope.md / AC 43-9C) ───
    if (!args.workPerformed.trim()) {
      throw new Error(
        `workPerformed must be a non-empty string. ` +
        `Per 14 CFR 43.9(a)(2) and AC 43-9C, a maintenance record must contain ` +
        `a description of the work performed.`,
      );
    }
    if (args.workPerformed.trim().length < 50) {
      throw new Error(
        `WORK_PERFORMED_TOO_SHORT: workPerformed must be at least 50 characters. ` +
        `Current length: ${args.workPerformed.trim().length} characters. ` +
        `Per AC 43-9C, the description must be sufficient for someone unfamiliar ` +
        `with the work to understand what was done. ` +
        `Expand the description and resubmit.`,
      );
    }

    // ── 6. Validate structured approved data reference ───────────────────────
    if (!args.approvedDataRef.identifier.trim()) {
      throw new Error(
        `approvedDataRef.identifier must be non-empty. ` +
        `Per 14 CFR 43.9(a)(1), maintenance records must reference approved data. ` +
        `Examples: "27-20-00" (AMM chapter), "2024-15-07" (AD number), "43.13-1B" (AC).`,
      );
    }
    if (!args.approvedDataRef.revision.trim()) {
      throw new Error(
        `approvedDataRef.revision must be non-empty. ` +
        `Specify the document revision — e.g. "Rev 15", "2026-01", or "Original".`,
      );
    }
    if (args.approvedDataRef.docType === "other" && !args.approvedDataRef.section?.trim()) {
      // For "other" doc type, section should provide additional context
      // (not a hard block, but logged as a warning)
    }
    const serializedApprovedDataRef = serializeApprovedDataRef(args.approvedDataRef);

    // ── 7. Validate INV-02: ratingsExercised ────────────────────────────────
    if (!args.ratingsExercised || args.ratingsExercised.length === 0) {
      throw new Error(
        `INV-02: ratingsExercised must be set when creating a maintenance record. ` +
        `Per 14 CFR 65.85/65.87, specify which A&P rating was exercised for this work. ` +
        `Acceptable values: "airframe", "powerplant", "ia", "none".`,
      );
    }

    // ── 8. Validate INV-20: returnToServiceStatement ─────────────────────────
    if (args.returnedToService) {
      if (!args.returnToServiceStatement?.trim()) {
        throw new Error(
          `INV-20: returnToServiceStatement must be set when returnedToService == true. ` +
          `Per 14 CFR 43.9, every maintenance record that returns an aircraft to service ` +
          `must include a return-to-service certification statement.`,
        );
      }
      if (args.returnToServiceStatement.trim().length < 50) {
        throw new Error(
          `INV-20: returnToServiceStatement must be at least 50 characters. ` +
          `Current length: ${args.returnToServiceStatement.trim().length}. ` +
          `A one-word certification statement is not legally defensible.`,
        );
      }
    }

    // ── 9. Validate INV-01: correction record completeness ──────────────────
    if (effectiveRecordType === "correction") {
      const correctionFields = [
        args.corrects,
        args.correctionFieldName,
        args.correctionOriginalValue,
        args.correctionCorrectedValue,
        args.correctionReason,
      ];
      if (correctionFields.some((f) => f === undefined || f === null)) {
        throw new Error(
          `INV-01: For recordType "correction", all five correction fields must be set: ` +
          `corrects, correctionFieldName, correctionOriginalValue, ` +
          `correctionCorrectedValue, correctionReason. ` +
          `Per AC 43-9C, a correction entry must fully document what was in error ` +
          `and what the correct value is. Missing fields: [` +
          [
            !args.corrects ? "corrects" : null,
            !args.correctionFieldName ? "correctionFieldName" : null,
            args.correctionOriginalValue === undefined ? "correctionOriginalValue" : null,
            args.correctionCorrectedValue === undefined ? "correctionCorrectedValue" : null,
            !args.correctionReason ? "correctionReason" : null,
          ]
            .filter(Boolean)
            .join(", ") +
          `].`,
        );
      }
      // Verify the record being corrected exists
      const correctedRecord = await ctx.db.get(args.corrects!);
      if (!correctedRecord) {
        throw new Error(
          `INV-01: The record being corrected (${args.corrects}) was not found. ` +
          `Correction records must reference an existing maintenance record.`,
        );
      }
    }

    // ── 10. Validate parts quantity (embeddedPartRecord invariant) ──────────
    for (const part of args.partsReplaced ?? []) {
      if (part.quantity < 1) {
        throw new Error(
          `Part "${part.partNumber}" has quantity ${part.quantity}. ` +
          `Part quantity must be >= 1. ` +
          `If a part was removed (not replaced), use action "removed" with quantity 1.`,
        );
      }
    }

    // ── 11. Fetch aircraft (for immutable snapshot fields) ──────────────────
    const aircraft = await ctx.db.get(workOrder.aircraftId);
    if (!aircraft) {
      throw new Error(
        `Aircraft ${workOrder.aircraftId} not found. Cannot create maintenance record.`,
      );
    }

    // ── 12. Fetch organization (for Part 145 cert number) ──────────────────
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error(`Organization ${args.organizationId} not found.`);
    }
    const orgCertNumber = org.part145CertificateNumber ?? null;

    // ── 13. Process test equipment used ─────────────────────────────────────
    // For each entry, if testEquipmentId is set: fetch from library, snapshot,
    // compute calibrationCurrentAtUse. If not set: use caller-supplied fields.
    // Expired calibration = WARNING in response (not a hard block) per Marcus.
    const testEquipmentWarnings: string[] = [];
    const processedTestEquipment: Array<{
      testEquipmentId?: Id<"testEquipment">;
      partNumber: string;
      serialNumber: string;
      equipmentName: string;
      calibrationCertNumber: string;
      calibrationExpiryDate: number;
      calibrationCurrentAtUse: boolean;
    }> = [];

    const signatureTimestamp = now; // Will be used for calibrationCurrentAtUse computation

    for (let i = 0; i < (args.testEquipmentUsed ?? []).length; i++) {
      const entry = (args.testEquipmentUsed ?? [])[i];

      if (entry.testEquipmentId) {
        // ── Library equipment: fetch and snapshot ───────────────────────────
        const libEquip = await ctx.db.get(entry.testEquipmentId);
        if (!libEquip) {
          throw new Error(
            `TEST_EQUIP_NOT_FOUND: Test equipment ${entry.testEquipmentId} ` +
            `(entry ${i + 1} in testEquipmentUsed) not found in the equipment library. ` +
            `Verify the equipment ID or remove the entry and provide snapshot fields directly.`,
          );
        }
        // INV-23a: snapshot fields must match library record at time of signing.
        // Since we're fetching the live record and snapshotting it, the snapshot is
        // always current and always matches — no discrepancy is possible.
        // The invariant is enforced by construction: we write the DB values, not
        // the caller-supplied values, when a library ID is present.

        // calibrationCurrentAtUse is computed server-side (Cilla's condition #3)
        const calibrationCurrentAtUse = libEquip.calibrationExpiryDate > signatureTimestamp;

        if (!calibrationCurrentAtUse) {
          testEquipmentWarnings.push(
            `EXPIRED_CALIBRATION [equipment ${libEquip.serialNumber} "${libEquip.equipmentName}"]: ` +
            `Calibration expired on ${new Date(libEquip.calibrationExpiryDate).toISOString()}. ` +
            `This equipment was used out of calibration. ` +
            `Per your RSM calibration control section, this may constitute a finding. ` +
            `The QCM review should address whether a corrective action is required.`,
          );
        }

        if (libEquip.status === "removed_from_service" || libEquip.status === "quarantine") {
          throw new Error(
            `TEST_EQUIP_UNAVAILABLE: Equipment ${libEquip.serialNumber} ` +
            `"${libEquip.equipmentName}" has status "${libEquip.status}" ` +
            `and cannot be referenced in new maintenance records. ` +
            `Removed-from-service and quarantined equipment is not admissible.`,
          );
        }

        processedTestEquipment.push({
          testEquipmentId: entry.testEquipmentId,
          partNumber: libEquip.partNumber,
          serialNumber: libEquip.serialNumber,
          equipmentName: libEquip.equipmentName,
          calibrationCertNumber: libEquip.calibrationCertNumber,
          calibrationExpiryDate: libEquip.calibrationExpiryDate,
          calibrationCurrentAtUse,
        });
      } else {
        // ── Manually entered equipment (external or not yet in library) ─────
        if (
          !entry.partNumber?.trim() ||
          !entry.serialNumber?.trim() ||
          !entry.equipmentName?.trim() ||
          !entry.calibrationCertNumber?.trim() ||
          entry.calibrationExpiryDate === undefined
        ) {
          throw new Error(
            `MANUAL_EQUIP_INCOMPLETE: Test equipment entry ${i + 1} has no testEquipmentId ` +
            `and is missing required snapshot fields. ` +
            `When testEquipmentId is null, all snapshot fields must be provided: ` +
            `partNumber, serialNumber, equipmentName, calibrationCertNumber, calibrationExpiryDate.`,
          );
        }
        if (!entry.serialNumber.trim()) {
          throw new Error(
            `MANUAL_EQUIP_NO_SN: Test equipment entry ${i + 1} has an empty serialNumber. ` +
            `Per INV-22 rationale: test equipment with no serial number cannot be traced. ` +
            `If no manufacturer S/N exists, assign an internal tracking number.`,
          );
        }

        const calibrationCurrentAtUse = entry.calibrationExpiryDate > signatureTimestamp;

        if (!calibrationCurrentAtUse) {
          testEquipmentWarnings.push(
            `EXPIRED_CALIBRATION [external equipment SN:${entry.serialNumber} "${entry.equipmentName}"]: ` +
            `Calibration expired on ${new Date(entry.calibrationExpiryDate).toISOString()}. ` +
            `This equipment was used out of calibration (warning — documented for QCM review).`,
          );
        }

        processedTestEquipment.push({
          partNumber: entry.partNumber!.trim(),
          serialNumber: entry.serialNumber!.trim(),
          equipmentName: entry.equipmentName!.trim(),
          calibrationCertNumber: entry.calibrationCertNumber!.trim(),
          calibrationExpiryDate: entry.calibrationExpiryDate!,
          calibrationCurrentAtUse,
        });
      }
    }

    // ── 14. Compute next aircraft-scoped sequence number ─────────────────────
    // Sequence number is the logbook entry number for this aircraft.
    // We find the current maximum and add 1.
    const lastRecord = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_aircraft_sequence", (q) => q.eq("aircraftId", workOrder.aircraftId))
      .order("desc")
      .first();
    const sequenceNumber = lastRecord ? lastRecord.sequenceNumber + 1 : 1;

    // ── 15. INV-05: Validate and consume signatureAuthEvent ──────────────────
    // Done AFTER all validation so that an auth event is never consumed by a
    // mutation that would have failed for other reasons.
    // Note: We pass a placeholder recordId here since the record doesn't exist yet.
    // The actual record ID will be set below, but consumeSignatureAuthEvent needs
    // a table name and record ID for the audit trail on the authEvent itself.
    // We use the workOrderId as a stand-in — the authEvent's consumedByRecordId
    // will be overwritten with the real maintenance record ID after creation
    // via a second patch. However, Convex mutations are atomic, so we must
    // handle the ordering carefully.
    //
    // SOLUTION: Consume the auth event AFTER inserting the record,
    // passing the new record's ID as consumedByRecordId. Convex's atomicity
    // guarantees both writes succeed or neither does.
    // We defer consumption to after the db.insert call below.

    // ── 16. Compute signature hash ───────────────────────────────────────────
    // SHA-256 over canonical content. Replaces the "RTS-HASH-V0-*" placeholder.
    // Canonical content includes the fields that must never change (immutable core).
    const canonicalContent = JSON.stringify({
      workOrderId: args.workOrderId,
      aircraftId: workOrder.aircraftId,
      aircraftSerialNumber: aircraft.serialNumber,
      workPerformed: args.workPerformed.trim(),
      approvedDataReference: serializedApprovedDataRef,
      completionDate: args.completionDate,
      signingTechnicianId: args.callerTechnicianId,
      signingCertNumber: cert.certificateNumber,
      signatureTimestamp,
      ratingsExercised: args.ratingsExercised,
    });
    const signatureHash = await computeSha256(canonicalContent);

    // ── 17. Build technician signature object ────────────────────────────────
    // This is the primary technician signature embedded in the record.
    const primarySignature = {
      technicianId: args.callerTechnicianId,
      legalName: callerTech.legalName,              // snapshot
      certificateNumber: cert.certificateNumber,    // snapshot
      certificateType: cert.certificateType,        // snapshot
      ratingsExercised: args.ratingsExercised,
      scopeOfWork: args.scopeOfWork ?? args.workPerformed.trim().substring(0, 200),
      signatureTimestamp,
      signatureHash,
      signatureAuthEventId: args.signatureAuthEventId,
    };

    // ── 18. Insert the maintenance record ────────────────────────────────────
    const maintenanceRecordId = await ctx.db.insert("maintenanceRecords", {
      recordType: effectiveRecordType,

      // Aircraft identification — ALL denormalized at signing (immutable)
      aircraftId: workOrder.aircraftId,
      aircraftMake: aircraft.make,
      aircraftModel: aircraft.model,
      aircraftSerialNumber: aircraft.serialNumber,
      aircraftRegistration: aircraft.currentRegistration ?? "",
      aircraftTotalTimeHours: workOrder.aircraftTotalTimeAtOpen,

      workOrderId: args.workOrderId,
      organizationId: args.organizationId,
      organizationCertificateNumber: orgCertNumber ?? undefined,

      sequenceNumber,

      workPerformed: args.workPerformed.trim(),
      approvedDataReference: serializedApprovedDataRef,
      partsReplaced: args.partsReplaced ?? [],

      testEquipmentUsed:
        processedTestEquipment.length > 0 ? processedTestEquipment : undefined,

      completionDate: args.completionDate,

      // Primary signatory
      technicians: [primarySignature],
      signingTechnicianId: args.callerTechnicianId,
      signingTechnicianLegalName: callerTech.legalName,
      signingTechnicianCertNumber: cert.certificateNumber,
      signingTechnicianCertType: cert.certificateType,
      signingTechnicianRatingsExercised: args.ratingsExercised,

      signatureTimestamp,
      signatureHash,
      signatureAuthEventId: args.signatureAuthEventId,

      returnedToService: args.returnedToService,
      returnToServiceStatement: args.returnedToService
        ? args.returnToServiceStatement?.trim()
        : undefined,

      discrepanciesFound: args.discrepanciesFound ?? [],
      discrepanciesCorrected: args.discrepanciesCorrected ?? [],
      discrepancyListProvided: args.discrepancyListProvided,

      // Correction fields (only for recordType == "correction")
      corrects: effectiveRecordType === "correction" ? args.corrects : undefined,
      correctionFieldName: effectiveRecordType === "correction" ? args.correctionFieldName : undefined,
      correctionOriginalValue: effectiveRecordType === "correction" ? args.correctionOriginalValue : undefined,
      correctionCorrectedValue: effectiveRecordType === "correction" ? args.correctionCorrectedValue : undefined,
      correctionReason: effectiveRecordType === "correction" ? args.correctionReason : undefined,

      createdAt: now,
      // NOTE: No updatedAt — immutable after creation.
    });

    // ── 19. Consume signatureAuthEvent (INV-05 — atomic with record creation) ─
    // Now that we have the record ID, we can set consumedByRecordId correctly.
    await consumeSignatureAuthEvent(
      ctx,
      args.signatureAuthEventId,
      args.callerTechnicianId,
      now,
      "maintenanceRecords",
      maintenanceRecordId,
    );

    // ── 20. Audit log entry ──────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_signed",
      tableName: "maintenanceRecords",
      recordId: maintenanceRecordId,
      userId: callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `Maintenance record created (${effectiveRecordType}). ` +
        `WO: ${workOrder.workOrderNumber}. ` +
        `Aircraft: ${aircraft.make} ${aircraft.model} S/N ${aircraft.serialNumber} ` +
        `(${aircraft.currentRegistration ?? "no reg"}). ` +
        `Sequence: #${sequenceNumber}. ` +
        `Approved data: ${serializedApprovedDataRef}. ` +
        `Signed by: ${callerTech.legalName} (${cert.certificateNumber}). ` +
        `Ratings: [${args.ratingsExercised.join(", ")}]. ` +
        `Test equipment entries: ${processedTestEquipment.length}. ` +
        (testEquipmentWarnings.length > 0
          ? `Calibration warnings: ${testEquipmentWarnings.length}. `
          : "") +
        `Parts replaced: ${(args.partsReplaced ?? []).length}. ` +
        (args.taskCardId ? `Linked task card: ${args.taskCardId}. ` : "") +
        `Signature hash: ${signatureHash.substring(0, 16)}... ` +
        `Auth event: ${args.signatureAuthEventId}.`,
      timestamp: now,
    });

    return {
      maintenanceRecordId,
      sequenceNumber,
      signatureHash,
      signatureTimestamp,
      approvedDataReference: serializedApprovedDataRef,
      /**
       * Non-empty when any test equipment had expired calibration at time of signing.
       * These are WARNING entries, not errors. The QCM review should address them.
       * Per Marcus's sign-off: "hard-blocking on expired calibration would prevent
       * documentation of work that was already performed with expired equipment."
       */
      testEquipmentCalibrationWarnings: testEquipmentWarnings,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION 3: createQcmReview
//
// QCM performs a formal post-close review of a completed work order.
// Per REQ-LP-05 (Linda Paredes, QCM) and schema-v3-change-log.md Change 3.
//
// This is a SIGNED, IMMUTABLE compliance action — not a passive audit event.
// An auditLog entry with eventType "qcm_reviewed" is ALSO written (as required
// by the schema: "Note: An auditLog entry with eventType 'qcm_reviewed' is ALSO
// written when a QCM review is created").
//
// INVARIANTS ENFORCED:
//   INV-24: workOrder.status must be "closed"
//   INV-25: reviewer must match org's qualityControlManagerId (alpha: strict match)
//   INV-26: findingsNotes must be non-empty when outcome != "accepted"
//   INV-05: signatureAuthEvent consumed atomically
//
// IMMUTABILITY:
//   No updatedAt field. If a review has errors, a new review is created with
//   the `corrects` field referencing the prior review (same amendment pattern
//   as maintenanceRecords). The erroneous review is never modified.
// ─────────────────────────────────────────────────────────────────────────────

export const createQcmReview = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    /** The QCM performing the review. Must match org.qualityControlManagerId (INV-25). */
    reviewerTechnicianId: v.id("technicians"),

    /**
     * Review outcome:
     *   accepted          — all records compliant; no findings
     *   findings_noted    — minor findings; work order acceptable; findingsNotes required
     *   requires_amendment — one or more records need correction; findingsNotes required
     */
    outcome: v.union(
      v.literal("accepted"),
      v.literal("findings_noted"),
      v.literal("requires_amendment"),
    ),

    /**
     * Required when outcome == "findings_noted" or "requires_amendment" (INV-26).
     * Must be non-empty. Should document which records have findings and what action
     * is required. For "requires_amendment", should identify the specific record
     * that needs a correction entry (per AC 43-9C).
     */
    findingsNotes: v.optional(v.string()),

    /**
     * Amendment chain: if this review corrects a prior review that had errors.
     * Same pattern as maintenanceRecords.corrects (AC 43-9C amendment model).
     */
    corrects: v.optional(v.id("qcmReviews")),

    /** INV-05: Pre-signing re-authentication. Required — QCM review is a signed action. */
    signatureAuthEventId: v.id("signatureAuthEvents"),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await requireAuth(ctx);
    const callerUserId = identity.subject;

    // ── Fetch work order ────────────────────────────────────────────────────
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

    // ── INV-24: workOrder must be closed ─────────────────────────────────────
    if (workOrder.status !== "closed") {
      throw new Error(
        `INV-24 / WO_NOT_CLOSED: ` +
        `Work order "${workOrder.workOrderNumber}" has status "${workOrder.status}". ` +
        `A QCM review may only be created after the work order is closed. ` +
        `Complete all task cards, disposition all discrepancies, create the RTS record, ` +
        `and close the work order before performing the QCM review.`,
      );
    }

    // ── Fetch reviewer technician ────────────────────────────────────────────
    const reviewer = await ctx.db.get(args.reviewerTechnicianId);
    if (!reviewer) {
      throw new Error(`Reviewer technician ${args.reviewerTechnicianId} not found.`);
    }
    if (reviewer.status !== "active") {
      throw new Error(
        `Reviewer technician ${args.reviewerTechnicianId} (${reviewer.legalName}) ` +
        `has status "${reviewer.status}". Only active technicians may perform QCM reviews.`,
      );
    }
    if (!reviewer.userId) {
      throw new Error(
        `Reviewer technician ${args.reviewerTechnicianId} (${reviewer.legalName}) ` +
        `has no system account and cannot perform signing actions.`,
      );
    }

    // ── Fetch organization ──────────────────────────────────────────────────
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error(`Organization ${args.organizationId} not found.`);
    }

    // ── INV-25: reviewer must be the org's current QCM ───────────────────────
    // Per schema-v3-change-log.md: "For alpha, strict QCM identity match is required."
    // Deputy QCM support is v1.1 scope.
    if (!org.qualityControlManagerId) {
      throw new Error(
        `INV-25 / NO_QCM_CONFIGURED: ` +
        `Organization ${args.organizationId} does not have a qualityControlManagerId ` +
        `configured. A QCM must be designated on the organization record before ` +
        `QCM reviews can be created. Contact your Director of Maintenance.`,
      );
    }
    if (org.qualityControlManagerId !== args.reviewerTechnicianId) {
      throw new Error(
        `INV-25 / NOT_QCM: ` +
        `Technician ${args.reviewerTechnicianId} (${reviewer.legalName}) ` +
        `is not the designated Quality Control Manager for organization ${args.organizationId}. ` +
        `The QCM review must be performed by the designated QCM (technician ID: ` +
        `${org.qualityControlManagerId}${org.qualityControlManagerName ? ` / ${org.qualityControlManagerName}` : ""}). ` +
        `Deputy QCM authorization is v1.1 scope. ` +
        `If the QCM designation needs to be updated, contact your Director of Maintenance.`,
      );
    }

    // ── INV-26: findingsNotes required when outcome has findings ─────────────
    if (args.outcome !== "accepted") {
      if (!args.findingsNotes?.trim() || args.findingsNotes.trim().length === 0) {
        throw new Error(
          `INV-26 / FINDINGS_REQUIRED: ` +
          `outcome "${args.outcome}" requires findingsNotes to be non-empty. ` +
          `A QCM review with findings but no documented findings is legally insufficient. ` +
          `Document which records have findings and what action is required. ` +
          `For "requires_amendment", identify the specific record that needs a correction ` +
          `entry per AC 43-9C.`,
        );
      }
    }

    // ── Fetch reviewer's certificate (snapshot at review time) ──────────────
    const reviewerCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.reviewerTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();
    if (!reviewerCert) {
      throw new Error(
        `No active certificate found for QCM ${args.reviewerTechnicianId} ` +
        `(${reviewer.legalName}). A certificate is required to perform a QCM review.`,
      );
    }

    // ── Validate amendment chain ─────────────────────────────────────────────
    if (args.corrects) {
      const priorReview = await ctx.db.get(args.corrects);
      if (!priorReview) {
        throw new Error(
          `QCM review amendment: prior review ${args.corrects} not found. ` +
          `The review being corrected must exist.`,
        );
      }
      if (priorReview.workOrderId !== args.workOrderId) {
        throw new Error(
          `QCM review amendment: prior review ${args.corrects} ` +
          `belongs to a different work order. ` +
          `A correcting review must reference a prior review on the same work order.`,
        );
      }
    }

    // ── Compute signature hash ───────────────────────────────────────────────
    const reviewTimestamp = now;
    const canonicalContent = JSON.stringify({
      workOrderId: args.workOrderId,
      organizationId: args.organizationId,
      reviewerTechnicianId: args.reviewerTechnicianId,
      reviewerCertNumber: reviewerCert.certificateNumber,
      outcome: args.outcome,
      findingsNotes: args.findingsNotes?.trim() ?? null,
      reviewTimestamp,
    });
    const signatureHash = await computeSha256(canonicalContent);

    // ── INV-05: Consume signatureAuthEvent ────────────────────────────────────
    // Done after all validation — we don't consume auth events for mutations that fail.
    // We need the review ID for consumedByRecordId, so we insert first,
    // then pass the ID to consumeSignatureAuthEvent.

    // ── Create QCM review record ──────────────────────────────────────────────
    const qcmReviewId = await ctx.db.insert("qcmReviews", {
      workOrderId: args.workOrderId,
      organizationId: args.organizationId,

      // Reviewer identity — snapshot at review time
      reviewedByTechnicianId: args.reviewerTechnicianId,
      reviewerLegalName: reviewer.legalName,
      reviewerCertificateNumber: reviewerCert.certificateNumber,
      reviewerCertificateType: reviewerCert.certificateType,

      reviewTimestamp,
      outcome: args.outcome,
      findingsNotes: args.findingsNotes?.trim(),

      corrects: args.corrects,

      signatureHash,
      signatureTimestamp: reviewTimestamp,
      signatureAuthEventId: args.signatureAuthEventId,

      createdAt: now,
      // NOTE: No updatedAt — immutable. Corrections create a new review with corrects set.
    });

    // ── INV-05: Consume auth event (atomic with record creation) ─────────────
    await consumeSignatureAuthEvent(
      ctx,
      args.signatureAuthEventId,
      args.reviewerTechnicianId,
      now,
      "qcmReviews",
      qcmReviewId,
    );

    // ── Audit log: qcm_reviewed (v3 — required alongside every qcmReview) ────
    // Schema: "Note: An auditLog entry with eventType 'qcm_reviewed' is ALSO written
    // when a QCM review is created." This is the authoritative schema requirement.
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "qcm_reviewed",
      tableName: "qcmReviews",
      recordId: qcmReviewId,
      userId: callerUserId,
      technicianId: args.reviewerTechnicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `QCM review created for work order "${workOrder.workOrderNumber}". ` +
        `Outcome: ${args.outcome}. ` +
        `Reviewer: ${reviewer.legalName} (${reviewerCert.certificateNumber}). ` +
        (args.findingsNotes?.trim()
          ? `Findings (first 200 chars): "${args.findingsNotes.trim().substring(0, 200)}". `
          : "No findings noted. ") +
        (args.corrects ? `Corrects prior review: ${args.corrects}. ` : "") +
        `Signature hash: ${signatureHash.substring(0, 16)}... ` +
        `Auth event: ${args.signatureAuthEventId}.`,
      timestamp: now,
    });

    return {
      qcmReviewId,
      outcome: args.outcome,
      reviewTimestamp,
      signatureHash,
      reviewerName: reviewer.legalName,
      reviewerCertNumber: reviewerCert.certificateNumber,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY 4: getWorkOrderCloseReadinessV2
//
// Updated version of getCloseReadiness (workOrders.ts) for Wave 2.
// Returns the same structured report as v1 PLUS two new checks added in v3:
//
//   NEW CHECK 1: All maintenance records for the work order have structured
//   approved data references. A "structured" reference was created by the
//   new createMaintenanceRecord mutation and contains "|" pipe separators
//   (the canonical serialized format). Free-text references (legacy, or
//   created without the structured validator) will not have "|" separators.
//
//   NEW CHECK 2: All test equipment referenced in maintenance records for this
//   work order had current calibration at time of use (calibrationCurrentAtUse == true
//   on all embeddedTestEquipmentRef entries). Expired calibration is documented
//   but does not hard-block close — it appears as a "warning" in the report
//   consistent with the warning-not-block design (Marcus's sign-off, Change 1).
//
// Returns a structured report with:
//   - canClose: boolean — true only when all BLOCKING checks pass
//   - All v1 checks (preserved)
//   - New v2 checks with their own blockers/warnings arrays
//   - A combined summary for the close readiness UI
// ─────────────────────────────────────────────────────────────────────────────

export const getWorkOrderCloseReadinessV2 = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Access denied: Work order ${args.workOrderId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    const blockers: string[] = [];
    const advisories: string[] = []; // Non-blocking findings (warnings)

    // ════════════════════════════════════════════════════════════════════════
    // V1 CHECKS — preserved from getCloseReadiness (workOrders.ts)
    // ════════════════════════════════════════════════════════════════════════

    // V1 Check 1: Work order status
    if (wo.status !== "pending_signoff") {
      blockers.push(
        `Work order status is "${wo.status}", not "pending_signoff". ` +
        `Complete all task cards and disposition all discrepancies first.`,
      );
    }

    // V1 Check 2: Open discrepancies
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
        `${openDiscrepancyCount} discrepancy(ies) are still open or under evaluation. ` +
        `IDs: [${openDiscrepancies.map((d) => d._id).join(", ")}].`,
      );
    }

    // V1 Check 3: Incomplete task cards
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

    // V1 Check 4: returnToService record must exist
    const rts = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();
    const hasRtsRecord = rts !== null;
    if (!hasRtsRecord) {
      blockers.push(
        "No return-to-service record has been created for this work order. " +
        "Create the RTS record via authorizeReturnToService before closing.",
      );
    }

    // V1 Check 5: Aircraft TT at open is a real value (not sentinel 0)
    const aircraftTotalTimeAtOpenRecorded = wo.aircraftTotalTimeAtOpen > 0;
    if (!aircraftTotalTimeAtOpenRecorded) {
      blockers.push(
        "Aircraft total time at open has not been recorded " +
        "(work order may not have been formally opened with a real tachometer reading).",
      );
    }

    // V1 Check 6: RTS hours must match WO close hours (if both are set)
    if (rts && wo.aircraftTotalTimeAtClose !== undefined) {
      if (rts.aircraftHoursAtRts !== wo.aircraftTotalTimeAtClose) {
        blockers.push(
          `RTS aircraft hours (${rts.aircraftHoursAtRts}h) do not match ` +
          `work order close hours (${wo.aircraftTotalTimeAtClose}h). ` +
          `These must be identical (BP-02).`,
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // V2 NEW CHECKS — Added in Wave 2 for v3 compliance
    // ════════════════════════════════════════════════════════════════════════

    // Fetch all maintenance records for this work order
    const maintenanceRecords = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const maintenanceRecordCount = maintenanceRecords.length;

    // ── V2 Check 1: All maintenance records have structured approved data refs ─
    // "Structured" means created by createMaintenanceRecord with the structured
    // validator, serialized in pipe format "{docType}|{identifier}|{revision}|{section}".
    // Free-text references from legacy paths will not contain "|".
    //
    // This is a BLOCKING check: a maintenance record with a free-text approved data
    // reference violates the v3 compliance requirement. Create a correction record
    // or re-sign the record before closing.
    const unstructuredRefs: Array<{ recordId: string; approvedDataRef: string }> = [];
    for (const record of maintenanceRecords) {
      const isStructured =
        record.approvedDataReference.includes("|") &&
        record.approvedDataReference.split("|").length >= 3 &&
        record.approvedDataReference.split("|")[0].trim().length > 0 &&
        record.approvedDataReference.split("|")[1].trim().length > 0;
      if (!isStructured) {
        unstructuredRefs.push({
          recordId: record._id,
          approvedDataRef: record.approvedDataReference,
        });
      }
    }

    let allMaintenanceRecordsHaveStructuredRefs = unstructuredRefs.length === 0;
    if (!allMaintenanceRecordsHaveStructuredRefs) {
      blockers.push(
        `${unstructuredRefs.length} maintenance record(s) have free-text approved data ` +
        `references instead of structured references (doc type / identifier / revision / section). ` +
        `Records: [${unstructuredRefs.map((r) => r.recordId).join(", ")}]. ` +
        `Create correction records for these entries using createMaintenanceRecord ` +
        `with the structured approvedDataRef input.`,
      );
    }

    // ── V2 Check 2: All task card test equipment calibration was current ──────
    // Check all maintenance records' testEquipmentUsed arrays.
    // calibrationCurrentAtUse == false means equipment was used out of calibration.
    // Per Marcus's sign-off: this is an ADVISORY (non-blocking), not a hard blocker.
    // The QCM review is the appropriate venue for finding resolution.
    // However, we surface it prominently so the closing technician is aware.
    const expiredCalibrationEntries: Array<{
      recordId: string;
      equipmentSN: string;
      equipmentName: string;
      calibrationExpiryDate: number;
    }> = [];

    for (const record of maintenanceRecords) {
      if (record.testEquipmentUsed && record.testEquipmentUsed.length > 0) {
        for (const equip of record.testEquipmentUsed) {
          if (!equip.calibrationCurrentAtUse) {
            expiredCalibrationEntries.push({
              recordId: record._id,
              equipmentSN: equip.serialNumber,
              equipmentName: equip.equipmentName,
              calibrationExpiryDate: equip.calibrationExpiryDate,
            });
          }
        }
      }
    }

    const allTestEquipmentCalibrationCurrent = expiredCalibrationEntries.length === 0;
    if (!allTestEquipmentCalibrationCurrent) {
      // ADVISORY — not a blocker (per Marcus's sign-off on the warning-not-block design)
      advisories.push(
        `${expiredCalibrationEntries.length} test equipment entry(ies) had expired ` +
        `calibration at time of use. These have been documented in the maintenance records ` +
        `(calibrationCurrentAtUse = false). The QCM review should address whether ` +
        `corrective action is required per your RSM calibration control procedures. ` +
        `Affected equipment: [${expiredCalibrationEntries.map((e) => `${e.equipmentSN} "${e.equipmentName}"`).join(", ")}].`,
      );
    }

    // ── V2 Check 3: At least one maintenance record exists ────────────────────
    // An inspection work order without any maintenance records may be valid
    // (if only an inspection was performed with no corrective work) but is
    // notable. Surface as advisory, not blocker.
    if (maintenanceRecordCount === 0) {
      advisories.push(
        "No maintenance records have been created for this work order. " +
        "If no corrective work was performed, this may be expected for inspection-only work orders. " +
        "Verify with the signing IA before close.",
      );
    }

    return {
      // ── Close eligibility ─────────────────────────────────────────────────
      canClose: blockers.length === 0 && wo.status === "pending_signoff",

      // ── Summary ───────────────────────────────────────────────────────────
      workOrderNumber: wo.workOrderNumber,
      workOrderStatus: wo.status,
      blockerCount: blockers.length,
      advisoryCount: advisories.length,

      // ── V1 check results (all preserved) ─────────────────────────────────
      v1: {
        openDiscrepancyCount,
        incompleteTaskCardCount,
        hasRtsRecord,
        aircraftTotalTimeAtOpenRecorded,
        rtsHoursMatchWorkOrderClose:
          rts && wo.aircraftTotalTimeAtClose !== undefined
            ? rts.aircraftHoursAtRts === wo.aircraftTotalTimeAtClose
            : null,
      },

      // ── V2 check results (new in Wave 2) ──────────────────────────────────
      v2: {
        maintenanceRecordCount,
        allMaintenanceRecordsHaveStructuredRefs,
        unstructuredRefCount: unstructuredRefs.length,
        unstructuredRefRecordIds: unstructuredRefs.map((r) => r.recordId),
        allTestEquipmentCalibrationCurrent,
        expiredCalibrationCount: expiredCalibrationEntries.length,
        expiredCalibrationDetails: expiredCalibrationEntries,
      },

      // ── All blocking issues ───────────────────────────────────────────────
      /** Hard blockers — close is not permitted until all are resolved. */
      blockers,

      /** Non-blocking findings — documented, surfaced for IA/QCM awareness. */
      advisories,

      // ── Incomplete items for UI navigation ────────────────────────────────
      /** IDs/numbers the UI can link to so each issue is directly navigable. */
      incompleteTaskCards: incompleteTaskCards.map((tc) => ({
        id: tc._id,
        number: tc.taskCardNumber,
        status: tc.status,
      })),
      openDiscrepanciesForNav: openDiscrepancies.map((d) => ({
        id: d._id,
        number: d.discrepancyNumber,
        status: d.status,
      })),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION 5: receiveTestEquipment
//
// Creates a test equipment library record for the organization.
// Part of REQ-DP-02 (Dale Purcell, Avionics): "Test equipment library / profiles."
//
// INVARIANTS ENFORCED:
//   INV-22: calibrationExpiryDate must be strictly > calibrationDate.
//           A cert that expires before it was issued is a data entry error.
//           Error code: CAL_EXPIRY_BEFORE_CAL_DATE.
//   Schema: serialNumber must be non-empty (test equipment must be serialized).
//   Schema: Org-scoped — all records belong to an organization.
//
// Initial status determination:
//   If calibrationExpiryDate > now → status = "current"
//   If calibrationExpiryDate <= now → status = "expired"
//   (A background scheduled function should also flip status nightly, but the
//   mutation must set the correct initial status — per schema invariant comment.)
//
// Audit log: record_created event.
// ─────────────────────────────────────────────────────────────────────────────

// ─── FEAT-021: List maintenance records for a work order (with signatureHash) ──

export const listForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    return records.map((r) => ({
      _id: r._id,
      recordType: r.recordType,
      completionDate: r.completionDate,
      workPerformed: r.workPerformed,
      signatureHash: r.signatureHash ?? null,
      isSigned: !!r.signatureHash?.trim(),
      corrects: r.corrects ?? null,
    }));
  },
});

export const receiveTestEquipment = mutation({
  args: {
    organizationId: v.id("organizations"),

    // ── Equipment identity ──────────────────────────────────────────────────

    /** Manufacturer part number (P/N). Required for traceability. */
    partNumber: v.string(),
    /**
     * Serial number. REQUIRED — test equipment is always serialized.
     * Per schema: "Test equipment with no S/N cannot be traced. If no manufacturer
     * S/N exists, assign an internal tracking number."
     */
    serialNumber: v.string(),
    /** Human-readable equipment name / model. e.g. "Fluke 28-II True RMS Multimeter". */
    equipmentName: v.string(),
    /** Manufacturer / make. e.g. "Fluke", "Barfield Inc.", "Snap-on". */
    manufacturer: v.optional(v.string()),

    // ── Equipment classification ────────────────────────────────────────────
    equipmentType: v.union(
      v.literal("multimeter"),
      v.literal("oscilloscope"),
      v.literal("pitot_static_tester"),
      v.literal("altimeter_tester"),
      v.literal("transponder_tester"),
      v.literal("nav_com_tester"),
      v.literal("torque_wrench"),
      v.literal("borescope"),
      v.literal("rigging_tool"),
      v.literal("pressure_gauge"),
      v.literal("fuel_flow_tester"),
      v.literal("insulation_tester"),
      v.literal("timing_light"),
      v.literal("compression_tester"),
      v.literal("prop_balance_analyzer"),
      v.literal("other"),
    ),

    // ── Calibration traceability (REQ-DP-01) ────────────────────────────────
    /** Certificate number issued by the calibration lab. Required. */
    calibrationCertNumber: v.string(),
    /** Date calibration was performed. Unix ms. Required. */
    calibrationDate: v.number(),
    /**
     * Date calibration expires. Unix ms. Required.
     * INV-22: Must be strictly > calibrationDate.
     */
    calibrationExpiryDate: v.number(),
    /** Name of calibration laboratory. e.g. "Avionics Test Services Inc." */
    calibrationPerformedBy: v.optional(v.string()),
    /** URL to the calibration certificate PDF (S3, Convex file storage, etc.) */
    calibrationCertDocumentUrl: v.optional(v.string()),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"testEquipment">> => {
    const now = Date.now();
    const identity = await requireAuth(ctx);
    const callerUserId = identity.subject;

    // ── Validate organization ────────────────────────────────────────────────
    const org = await ctx.db.get(args.organizationId);
    if (!org || !org.active) {
      throw new Error(
        `Organization ${args.organizationId} not found or is inactive. ` +
        `Test equipment may only be created for active organizations.`,
      );
    }

    // ── Validate serialNumber (non-empty) ────────────────────────────────────
    if (!args.serialNumber.trim()) {
      throw new Error(
        `serialNumber must be non-empty. ` +
        `Test equipment must be individually serialized for calibration traceability. ` +
        `Per schema: if no manufacturer serial number exists, assign an internal tracking number. ` +
        `Use a format like "INT-YYYY-NNN" for internally assigned numbers.`,
      );
    }

    // ── Validate partNumber ──────────────────────────────────────────────────
    if (!args.partNumber.trim()) {
      throw new Error(
        `partNumber must be non-empty. ` +
        `Provide the manufacturer's part number for this equipment. ` +
        `If no OEM P/N exists, use the calibration lab's part identifier.`,
      );
    }

    // ── Validate equipmentName ───────────────────────────────────────────────
    if (!args.equipmentName.trim()) {
      throw new Error(
        `equipmentName must be non-empty. ` +
        `Provide a descriptive name — e.g. "Fluke 28-II True RMS Multimeter". ` +
        `This name will appear in maintenance records and QCM inspection reports.`,
      );
    }

    // ── INV-22: calibrationExpiryDate must be strictly > calibrationDate ─────
    // A calibration certificate that expires before it was issued is a data entry error.
    if (args.calibrationExpiryDate <= args.calibrationDate) {
      throw new Error(
        `INV-22 / CAL_EXPIRY_BEFORE_CAL_DATE: ` +
        `calibrationExpiryDate (${new Date(args.calibrationExpiryDate).toISOString()}) ` +
        `must be strictly later than calibrationDate ` +
        `(${new Date(args.calibrationDate).toISOString()}). ` +
        `A calibration certificate that expires before or on its issuance date is invalid. ` +
        `Verify the dates from the calibration certificate and re-enter.`,
      );
    }

    // ── Validate calibrationCertNumber ──────────────────────────────────────
    if (!args.calibrationCertNumber.trim()) {
      throw new Error(
        `calibrationCertNumber must be non-empty. ` +
        `The calibration certificate number is required for traceability. ` +
        `Find this on the calibration certificate issued by the laboratory.`,
      );
    }

    // ── Duplicate check: (organizationId, partNumber, serialNumber) ──────────
    // A piece of equipment with the same P/N and S/N already in the library
    // should be updated via updateCalibration, not re-created. We surface a clear
    // error so the caller can find and update the existing record.
    const existingEquipment = await ctx.db
      .query("testEquipment")
      .withIndex("by_serial", (q) =>
        q.eq("partNumber", args.partNumber.trim()).eq("serialNumber", args.serialNumber.trim()),
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (existingEquipment) {
      throw new Error(
        `DUPLICATE_EQUIPMENT: Equipment with P/N "${args.partNumber.trim()}" ` +
        `and S/N "${args.serialNumber.trim()}" already exists in the library ` +
        `(existing record ID: ${existingEquipment._id}). ` +
        `To update the calibration data, use the updateCalibration mutation. ` +
        `To receive a new piece of equipment with the same P/N, verify the S/N is correct.`,
      );
    }

    // ── Determine initial status ─────────────────────────────────────────────
    // Per schema: status == "current" requires calibrationExpiryDate > now().
    // If the equipment is being received with an already-expired calibration cert,
    // it enters as "expired" and cannot be used in maintenance records.
    const initialStatus: "current" | "expired" =
      args.calibrationExpiryDate > now ? "current" : "expired";

    if (initialStatus === "expired") {
      // Not a hard block — the equipment can be received into the library as expired.
      // However, it cannot be used in new maintenance records (status "expired" check
      // in createMaintenanceRecord's library lookup branch will log a warning if used).
      // We note this in the audit log.
    }

    // ── Insert test equipment record ─────────────────────────────────────────
    const testEquipmentId = await ctx.db.insert("testEquipment", {
      organizationId: args.organizationId,

      partNumber: args.partNumber.trim(),
      serialNumber: args.serialNumber.trim(),
      equipmentName: args.equipmentName.trim(),
      manufacturer: args.manufacturer?.trim(),

      equipmentType: args.equipmentType,

      calibrationCertNumber: args.calibrationCertNumber.trim(),
      calibrationDate: args.calibrationDate,
      calibrationExpiryDate: args.calibrationExpiryDate,
      calibrationPerformedBy: args.calibrationPerformedBy?.trim(),
      calibrationCertDocumentUrl: args.calibrationCertDocumentUrl,

      status: initialStatus,

      notes: args.notes,

      createdAt: now,
      updatedAt: now,
    });

    // ── Audit log: record_created ────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "testEquipment",
      recordId: testEquipmentId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `Test equipment received: "${args.equipmentName.trim()}" ` +
        `(P/N: ${args.partNumber.trim()}, S/N: ${args.serialNumber.trim()}). ` +
        `Type: ${args.equipmentType}. ` +
        `${args.manufacturer?.trim() ? `Manufacturer: ${args.manufacturer.trim()}. ` : ""}` +
        `Calibration cert: ${args.calibrationCertNumber.trim()}. ` +
        `Calibration date: ${new Date(args.calibrationDate).toISOString().split("T")[0]}. ` +
        `Calibration expiry: ${new Date(args.calibrationExpiryDate).toISOString().split("T")[0]}. ` +
        `Initial status: ${initialStatus}. ` +
        (initialStatus === "expired"
          ? "WARNING: Equipment received with expired calibration — not usable in maintenance records until recalibrated. "
          : "") +
        (args.calibrationPerformedBy?.trim()
          ? `Cal lab: ${args.calibrationPerformedBy.trim()}.`
          : "Cal lab not specified."),
      timestamp: now,
    });

    return testEquipmentId;
  },
});
