// convex/parts.ts
// Athelon — Aviation MRO SaaS Platform
//
// Parts Traceability Module — Phase 4 Implementation
//
// Implements the four mutations specified in:
//   phase-2-parts/parts-traceability.md (Devraj Anand, Nadia Solis)
//   phase-2-signoff/signoff-rts-flow.md (ref for auth event pattern)
//   convex-schema-v2.md (FROZEN 2026-02-22)
//
// Author:     Devraj Anand (Phase 4 Implementation)
// Product:    Nadia Solis
// QA:         Cilla Oduya
//
// ─── DESIGN NOTES ───────────────────────────────────────────────────────────
//
// Parts traceability is the regulatory load-bearing wall of this platform.
// The mutations in this file enforce:
//
//   INV-07: Parts cannot be installed without 8130-3 or receiving inspection docs.
//           OSP (Owner-Supplied Parts) have no override path — zero exceptions.
//   INV-11: Life-limited parts must declare lifeLimitHours or lifeLimitCycles.
//   INV-12: Parts with shelf-life limits must have a shelfLifeLimitDate.
//   Cilla 3.5: currentAircraftId and currentEngineId must both be cleared on removal.
//   INV per spec: signatureAuthEvent consumed atomically with the primary write.
//
// LLP (Life-Limited Part) hard block policy:
//   - Zero remaining life: hard block. No override. Installation is illegal.
//   - Low remaining life: supervisor-acknowledges-and-proceeds (supervisorOverrideReason
//     required for LLPs with <= 10% life remaining). WARN in UI; don't hard-block.
//   - These thresholds are consistent with Nadia's PM note in §2.2 G7:
//     "Mechanics sometimes knowingly install a part with low remaining life...
//      That's a legal operation. We block at zero, warn below threshold."
//
// 8130-3 quantity counter:
//   We do NOT decrement eightOneThirtyRecords.quantity in this implementation
//   because quantity is a tag-level field reflecting the original batch, not
//   a real-time counter. Phase 4.1 will add a partTagQuantityUsed field and
//   enforce the guard from spec §3.3 (linked parts must not exceed tag quantity).
//   TODO: Phase 4.1 — add partTagQuantityUsed counter and enforcement.
//
// ─── KEY REGULATORY REFERENCES ──────────────────────────────────────────────
// 14 CFR 145.201(c) — OSP documentation requirements
// 14 CFR 43.9(a)(1) — approved data reference in maintenance records
// FAA Order 8120.11 — suspected unapproved parts reporting

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const partConditionValidator = v.union(
  v.literal("new"),
  v.literal("serviceable"),
  v.literal("overhauled"),
  v.literal("repaired"),
  v.literal("unserviceable"),
  v.literal("quarantine"),
  v.literal("scrapped"),
);

const eightOneThirtyInputValidator = v.object({
  approvingAuthority: v.string(),
  applicantName: v.string(),
  applicantAddress: v.optional(v.string()),
  formTrackingNumber: v.string(),
  organizationName: v.optional(v.string()),
  workOrderReference: v.optional(v.string()),
  itemNumber: v.optional(v.string()),
  partDescription: v.string(),
  partNumber: v.string(),
  partEligibility: v.optional(v.string()),
  quantity: v.number(),
  serialBatchNumber: v.optional(v.string()),
  isLifeLimited: v.boolean(),
  lifeRemainingHours: v.optional(v.number()),
  lifeRemainingCycles: v.optional(v.number()),
  statusWork: v.union(
    v.literal("new"),
    v.literal("overhauled"),
    v.literal("repaired"),
    v.literal("inspected"),
    v.literal("modified"),
  ),
  remarks: v.optional(v.string()),
  certifyingStatement: v.string(),
  authorizedSignatoryName: v.string(),
  signatureDate: v.number(),
  approvalNumber: v.string(),
  exportAuthorizationNumber: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  verifiedByUserId: v.optional(v.string()),
  verificationNotes: v.optional(v.string()),
});

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
// INTERNAL UTILITY: VALIDATE AND CONSUME SIGNATURE AUTH EVENT
//
// Per INV-05: consumed == false, expiresAt > now, technicianId check if provided.
// Consumption is atomic with the caller's primary write (same Convex transaction).
// ─────────────────────────────────────────────────────────────────────────────

async function validateAndConsumeAuthEvent(
  ctx: { db: any },
  signatureAuthEventId: Id<"signatureAuthEvents">,
  consumedByTable: string,
  consumedByRecordId: string,
  now: number,
  expectedTechnicianId?: Id<"technicians">,
): Promise<Id<"technicians">> {
  const authEvent = await ctx.db.get(signatureAuthEventId);
  if (!authEvent) {
    throw new Error(
      `signatureAuthEvent ${signatureAuthEventId} not found. ` +
      `Request a new re-authentication event.`,
    );
  }
  if (authEvent.consumed) {
    throw new Error(
      `INV-05: signatureAuthEvent ${signatureAuthEventId} has already been consumed ` +
      `(at ${authEvent.consumedAt ? new Date(authEvent.consumedAt).toISOString() : "unknown"} ` +
      `for ${authEvent.consumedByTable}/${authEvent.consumedByRecordId}). ` +
      `Each auth event is single-use. Request a new re-authentication event.`,
    );
  }
  if (authEvent.expiresAt < now) {
    throw new Error(
      `INV-05: signatureAuthEvent ${signatureAuthEventId} expired at ` +
      `${new Date(authEvent.expiresAt).toISOString()}. ` +
      `Auth events have a 5-minute TTL. Request a new re-authentication event.`,
    );
  }
  if (expectedTechnicianId != null && authEvent.technicianId !== expectedTechnicianId) {
    throw new Error(
      `INV-05: Auth event was issued to technician ${authEvent.technicianId} ` +
      `but the caller is technician ${expectedTechnicianId}. ` +
      `Auth events are non-transferable.`,
    );
  }

  // Consume atomically with the caller's primary write
  await ctx.db.patch(signatureAuthEventId, {
    consumed: true,
    consumedAt: now,
    consumedByTable,
    consumedByRecordId,
  });

  return authEvent.technicianId;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: receivePart
//
// Spec ref: parts-traceability.md §2.1
// Enforces: INV-11, INV-12, G1–G7 guard sequence
//
// Creates a new parts record and optionally an eightOneThirtyRecords record
// when a part is received into inventory. Both writes are atomic.
//
// 8130-3 TAG VALIDATION:
// If eightOneThirtyData is provided, we validate:
//   - formTrackingNumber is non-empty (required per schema INV)
//   - quantity >= 1 (per schema INV)
//   - approvalNumber is non-empty (FAA repair station cert of releasing entity)
//   - certifyingStatement is non-empty
//
// LLP HARD BLOCK ON RECEIPT WITH ZERO REMAINING LIFE:
// Per spec §2.1 G5: "A part arriving with hours already at or beyond its life
// limit must be received into quarantine, not inventory."
//
// SUPERVISOR OVERRIDE FOR QUANTITY MISMATCHES:
// If the 8130-3 tag quantity does not match the receivedQuantity (when provided),
// a supervisorOverrideReason is required unless the mismatch is explicitly acknowledged.
// TODO: Phase 4.1 — implement partTagQuantityUsed counter for full 8130-3 quantity
// enforcement (spec §3.3 question Q3).
// ─────────────────────────────────────────────────────────────────────────────

export const receivePart = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.optional(v.id("workOrders")),

    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    isSerialized: v.boolean(),
    condition: partConditionValidator,
    isOwnerSupplied: v.boolean(),
    supplier: v.optional(v.string()),
    purchaseOrderNumber: v.optional(v.string()),
    receivingDate: v.number(),

    // Life-limited part tracking (INV-11)
    isLifeLimited: v.boolean(),
    lifeLimitHours: v.optional(v.number()),
    lifeLimitCycles: v.optional(v.number()),

    // Prior accumulated life (from 8130-3 Block 12 or prior records)
    hoursAccumulatedBeforeInstall: v.optional(v.number()),
    cyclesAccumulatedBeforeInstall: v.optional(v.number()),

    // Shelf life (INV-12)
    hasShelfLifeLimit: v.boolean(),
    shelfLifeLimitDate: v.optional(v.number()),

    // 8130-3 data (optional at receive — may be attached later)
    eightOneThirtyData: v.optional(eightOneThirtyInputValidator),

    // When the received quantity differs from the 8130-3 tag quantity,
    // a supervisor must acknowledge with a reason (LLP hard block or override).
    receivedQuantity: v.optional(v.number()),
    supervisorOverrideReason: v.optional(v.string()),
    supervisorTechnicianId: v.optional(v.id("technicians")),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),

    // v11: Relational warehouse location
    binLocationId: v.optional(v.id("warehouseBins")),
  },

  handler: async (ctx, args): Promise<{ partId: Id<"parts">; eightOneThirtyId?: Id<"eightOneThirtyRecords"> }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── G1: Validate organizationId ───────────────────────────────────────────
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error(`Organization ${args.organizationId} not found.`);
    }
    if (!org.active) {
      throw new Error(
        `Organization ${args.organizationId} (${org.name}) is inactive. ` +
        `Parts cannot be received into an inactive organization.`,
      );
    }

    // ── G2: INV-11 — Life-limited part must declare its limit ────────────────
    if (args.isLifeLimited) {
      if (args.lifeLimitHours == null && args.lifeLimitCycles == null) {
        throw new Error(
          `INV-11: Life-limited part requires at least one of lifeLimitHours or lifeLimitCycles. ` +
          `A life-limited part with no defined limit cannot be tracked for airworthiness. ` +
          `Obtain the life limit from the manufacturer's IPC, CMM, or the 8130-3 Block 12.`,
        );
      }
    }

    // ── G3: INV-12 — Shelf-life part must have a date ─────────────────────────
    if (args.hasShelfLifeLimit) {
      if (args.shelfLifeLimitDate == null) {
        throw new Error(
          `INV-12: Part with shelf life requires shelfLifeLimitDate. ` +
          `Obtain the shelf life expiry date from the manufacturer's data or the 8130-3.`,
        );
      }
    }

    // ── G4: Accumulated hours must be non-negative ────────────────────────────
    if (args.hoursAccumulatedBeforeInstall != null && args.hoursAccumulatedBeforeInstall < 0) {
      throw new Error(
        `hoursAccumulatedBeforeInstall must be >= 0. ` +
        `Received: ${args.hoursAccumulatedBeforeInstall}. ` +
        `This value represents flight hours the part has already consumed before this receipt.`,
      );
    }

    // ── G5: LLP hard block — parts at or beyond life limit go to quarantine ───
    // BUG-PC-10 fix: Per INV-23 (schema v3), parts received at the dock must go
    // to "pending_inspection" — NOT directly to "inventory". They become issuable
    // only after receiving inspection is completed via completeReceivingInspection.
    // Exception: quarantine for life-expired parts (below).
    let receivingLocation: "pending_inspection" | "quarantine" = "pending_inspection";
    if (args.isLifeLimited && args.lifeLimitHours != null && args.hoursAccumulatedBeforeInstall != null) {
      if (args.hoursAccumulatedBeforeInstall >= args.lifeLimitHours) {
        // Hard block: this part has exhausted its life limit.
        // Per spec §2.1 G5: must be received into quarantine, not inventory.
        if (args.condition !== "quarantine" && args.condition !== "scrapped") {
          throw new Error(
            `PART_LIFE_EXPIRED_AT_RECEIPT: ` +
            `Life-limited part has accumulated ${args.hoursAccumulatedBeforeInstall}h ` +
            `which meets or exceeds its life limit of ${args.lifeLimitHours}h. ` +
            `This part must be received into quarantine (condition: "quarantine") ` +
            `and scrapped — it may not be received into serviceable inventory. ` +
            `Life-limited parts at or beyond their limit cannot be returned to service ` +
            `regardless of apparent condition. Per 14 CFR and the manufacturer's ICA.`,
          );
        }
        receivingLocation = "quarantine";
      }
    }

    // ── G6: Serialized parts must have a serial number ────────────────────────
    if (args.isSerialized && !args.serialNumber?.trim()) {
      throw new Error(
        `SERIALIZED_PART_MISSING_SERIAL: ` +
        `Serialized part (isSerialized == true) requires a non-empty serialNumber. ` +
        `A serialized part without a serial number cannot be uniquely identified ` +
        `and cannot have a complete traceability chain.`,
      );
    }

    // ── G7: Duplicate serial number check for same P/N within org ────────────
    if (args.isSerialized && args.serialNumber?.trim()) {
      const existingPart = await ctx.db
        .query("parts")
        .withIndex("by_serial", (q) =>
          q
            .eq("partNumber", args.partNumber)
            .eq("serialNumber", args.serialNumber!.trim()),
        )
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
      if (existingPart) {
        throw new Error(
          `DUPLICATE_SERIAL_IN_ORG: ` +
          `A part with part number "${args.partNumber}" and serial number ` +
          `"${args.serialNumber!.trim()}" already exists in organization ` +
          `${args.organizationId} (existing record: ${existingPart._id}). ` +
          `Duplicate serial numbers for the same P/N within an organization ` +
          `indicate a receiving error or data entry error. ` +
          `Verify the serial number against the physical tag before proceeding.`,
        );
      }
    }

    // ── 8130-3 validation (if provided) ──────────────────────────────────────
    if (args.eightOneThirtyData) {
      const tag = args.eightOneThirtyData;

      if (!tag.formTrackingNumber.trim()) {
        throw new Error(
          `8130_TRACKING_NUMBER_EMPTY: ` +
          `8130-3 formTrackingNumber must be non-empty. ` +
          `This is the primary identification field for the tag (Block 3).`,
        );
      }
      if (tag.quantity < 1) {
        throw new Error(
          `8130_QUANTITY_INVALID: ` +
          `8130-3 quantity must be >= 1. ` +
          `Block 10 of the 8130-3 specifies the certified quantity. Received: ${tag.quantity}.`,
        );
      }
      if (!tag.approvalNumber.trim()) {
        throw new Error(
          `8130_APPROVAL_NUMBER_EMPTY: ` +
          `8130-3 approvalNumber must be non-empty. ` +
          `Block 17 must contain the repair station certificate number of the releasing entity.`,
        );
      }
      if (!tag.certifyingStatement.trim()) {
        throw new Error(
          `8130_CERTIFYING_STATEMENT_EMPTY: ` +
          `8130-3 certifyingStatement must be non-empty. ` +
          `Block 15 contains the regulatory certification text.`,
        );
      }

      // Quantity mismatch guard
      if (args.receivedQuantity != null && args.receivedQuantity !== tag.quantity) {
        // For LLPs, this is a hard block
        if (args.isLifeLimited) {
          throw new Error(
            `LLP_QUANTITY_MISMATCH: ` +
            `Life-limited part: received quantity (${args.receivedQuantity}) does not match ` +
            `8130-3 tag quantity (${tag.quantity}). ` +
            `For life-limited parts, quantity mismatches are a hard block. ` +
            `Each individual LLP must have its own 8130-3 or be individually serialized ` +
            `and documented. Contact your DOM before proceeding.`,
          );
        }
        // For non-LLPs, require supervisor override
        if (!args.supervisorOverrideReason?.trim()) {
          throw new Error(
            `QUANTITY_MISMATCH_NEEDS_OVERRIDE: ` +
            `Received quantity (${args.receivedQuantity}) does not match ` +
            `8130-3 tag quantity (${tag.quantity}). ` +
            `A supervisorOverrideReason is required to proceed with a quantity mismatch ` +
            `for non-life-limited parts. ` +
            `Also provide supervisorTechnicianId identifying the authorizing supervisor.`,
          );
        }
        if (!args.supervisorTechnicianId) {
          throw new Error(
            `QUANTITY_MISMATCH_NEEDS_SUPERVISOR: ` +
            `supervisorTechnicianId must be provided when supervisorOverrideReason is used ` +
            `to override a quantity mismatch.`,
          );
        }
      }

      // 8130-3 Block 12 → Part life synchronization (spec §6.4)
      // The 8130-3 states life REMAINING at time of tag signing.
      // If hoursAccumulatedBeforeInstall was not provided by the caller, compute it
      // from the 8130-3 data if the tag has Block 12 data.
    }

    // Compute hoursAccumulatedBeforeInstall from 8130-3 Block 12 if not directly provided
    let computedHoursAccumulated = args.hoursAccumulatedBeforeInstall;
    if (
      computedHoursAccumulated == null &&
      args.eightOneThirtyData?.isLifeLimited === true &&
      args.eightOneThirtyData.lifeRemainingHours != null &&
      args.lifeLimitHours != null
    ) {
      // Per spec §6.4: hoursAlreadyConsumed = lifeLimitHours - lifeRemainingHours (from tag)
      const computed = args.lifeLimitHours - args.eightOneThirtyData.lifeRemainingHours;
      computedHoursAccumulated = Math.max(0, computed);
    }

    // ── WRITE 1: Create the parts record ─────────────────────────────────────
    const partId = await ctx.db.insert("parts", {
      partNumber: args.partNumber.trim(),
      partName: args.partName.trim(),
      description: args.description?.trim(),
      serialNumber: args.serialNumber?.trim(),
      isSerialized: args.isSerialized,
      isLifeLimited: args.isLifeLimited,
      lifeLimitHours: args.lifeLimitHours,
      lifeLimitCycles: args.lifeLimitCycles,
      hasShelfLifeLimit: args.hasShelfLifeLimit,
      shelfLifeLimitDate: args.shelfLifeLimitDate,
      hoursAccumulatedBeforeInstall: computedHoursAccumulated,
      cyclesAccumulatedBeforeInstall: args.cyclesAccumulatedBeforeInstall,
      condition: args.condition,
      location: receivingLocation,
      organizationId: args.organizationId,
      receivingDate: args.receivingDate,
      receivingWorkOrderId: args.workOrderId,
      supplier: args.supplier?.trim(),
      purchaseOrderNumber: args.purchaseOrderNumber?.trim(),
      isOwnerSupplied: args.isOwnerSupplied,
      notes: args.notes,
      binLocationId: args.binLocationId,
      createdAt: now,
      updatedAt: now,
    });

    // ── WRITE 2: Create 8130-3 record if data provided ───────────────────────
    let eightOneThirtyId: Id<"eightOneThirtyRecords"> | undefined;
    if (args.eightOneThirtyData) {
      const tag = args.eightOneThirtyData;
      eightOneThirtyId = await ctx.db.insert("eightOneThirtyRecords", {
        organizationId: args.organizationId,
        partId,
        approvingAuthority: tag.approvingAuthority,
        applicantName: tag.applicantName,
        applicantAddress: tag.applicantAddress,
        formTrackingNumber: tag.formTrackingNumber.trim(),
        organizationName: tag.organizationName,
        workOrderReference: tag.workOrderReference,
        itemNumber: tag.itemNumber,
        partDescription: tag.partDescription,
        partNumber: tag.partNumber,
        partEligibility: tag.partEligibility,
        quantity: tag.quantity,
        serialBatchNumber: tag.serialBatchNumber,
        isLifeLimited: tag.isLifeLimited,
        lifeRemainingHours: tag.lifeRemainingHours,
        lifeRemainingCycles: tag.lifeRemainingCycles,
        statusWork: tag.statusWork,
        remarks: tag.remarks,
        certifyingStatement: tag.certifyingStatement,
        authorizedSignatoryName: tag.authorizedSignatoryName,
        signatureDate: tag.signatureDate,
        approvalNumber: tag.approvalNumber.trim(),
        exportAuthorizationNumber: tag.exportAuthorizationNumber,
        pdfUrl: tag.pdfUrl,
        receivedByOrganizationId: args.organizationId,
        receivedDate: args.receivingDate,
        verifiedByUserId: tag.verifiedByUserId ?? callerUserId,
        verificationNotes: tag.verificationNotes,
        isSuspect: false,
        createdAt: now,
        updatedAt: now,
      });

      // Link the 8130-3 to the part record
      await ctx.db.patch(partId, { eightOneThirtyId });

      // Audit: 8130-3 created
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_created",
        tableName: "eightOneThirtyRecords",
        recordId: eightOneThirtyId,
        userId: callerUserId,
        ipAddress: args.callerIpAddress,
        notes:
          `8130-3 attached: tracking #${tag.formTrackingNumber.trim()}. ` +
          `P/N: ${tag.partNumber}. Approval #: ${tag.approvalNumber.trim()}. ` +
          `Status: ${tag.statusWork}. Qty: ${tag.quantity}.`,
        timestamp: now,
      });
    }

    // ── WRITE 3: Audit log for part creation ─────────────────────────────────
    const quantityNote =
      args.supervisorOverrideReason && args.receivedQuantity != null && args.eightOneThirtyData
        ? ` QUANTITY MISMATCH: received ${args.receivedQuantity} vs tag qty ${args.eightOneThirtyData.quantity}. ` +
          `Override by ${args.supervisorTechnicianId}: "${args.supervisorOverrideReason}".`
        : "";

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "parts",
      recordId: partId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `Part received: ${args.partNumber.trim()} "${args.partName.trim()}" ` +
        `${args.serialNumber ? `S/N ${args.serialNumber.trim()}` : "(non-serialized)"}. ` +
        `Condition: ${args.condition}. Location: ${receivingLocation}. ` +
        `OSP: ${args.isOwnerSupplied}. ` +
        `Life-limited: ${args.isLifeLimited}${computedHoursAccumulated != null ? ` (${computedHoursAccumulated}h accumulated)` : ""}. ` +
        `8130-3: ${eightOneThirtyId ?? "none"}.` +
        quantityNote,
      timestamp: now,
    });

    // ── Part history: "received" event ──────────────────────────────────────
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: args.organizationId,
      partId,
      eventType: "received",
      toLocation: receivingLocation,
      toCondition: args.condition,
      purchaseOrderId: undefined,
      performedByUserId: callerUserId,
      notes: `Received: P/N ${args.partNumber.trim()}${args.serialNumber ? ` S/N ${args.serialNumber.trim()}` : ""} — ${args.condition}`,
    });

    return { partId, eightOneThirtyId };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: installPart
//
// Spec ref: parts-traceability.md §2.2
// Enforces: INV-07, INV-11, INV-12, Cilla 3.5, REG-007
//
// Transitions a part from inventory → installed, records the installation
// against a work order and aircraft/engine, and creates a partInstallationHistory
// entry. All writes are atomic.
//
// AIRCRAFT TIME SNAPSHOT: The current aircraft totalTimeAirframeHours is captured
// at installation time so life accumulation can be computed correctly at removal.
//
// The signatureAuthEvent is consumed atomically with the primary writes. If the
// auth event write fails, no installation occurs.
// ─────────────────────────────────────────────────────────────────────────────

export const installPart = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.id("workOrders"),
    installedByTechId: v.id("technicians"),
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // Exactly one of aircraftId or engineId must be provided (Cilla 3.5)
    aircraftId: v.optional(v.id("aircraft")),
    engineId: v.optional(v.id("engines")),
    installPosition: v.optional(v.string()),

    // Aircraft total time at installation — must be consistent with work order
    aircraftHoursAtInstall: v.number(),
    aircraftCyclesAtInstall: v.optional(v.number()),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{ partInstallationHistoryId: Id<"partInstallationHistory"> }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── G1: Fetch part and assert location == "inventory" ─────────────────────
    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error(`Part ${args.partId} not found.`);
    }
    if (part.location !== "inventory") {
      throw new Error(
        `PART_NOT_IN_INVENTORY: ` +
        `Part ${args.partId} (${part.partNumber}) is not in inventory. ` +
        `Current location: "${part.location}". ` +
        `Only parts in "inventory" may be installed. ` +
        (part.location === "installed"
          ? `This part is currently installed. It must be removed before reinstalling.`
          : part.location === "quarantine"
          ? `This part is in quarantine. Resolve the quarantine issue before installation.`
          : part.condition === "unserviceable"
          ? `This part is unserviceable. It must be overhauled and re-certified before installation.`
          : `Review the part's current status before proceeding.`),
      );
    }

    // ── G2: Exactly one of aircraftId or engineId (Cilla 3.5) ─────────────────
    const hasAircraftId = args.aircraftId != null;
    const hasEngineId = args.engineId != null;
    if (hasAircraftId === hasEngineId) {
      throw new Error(
        `INSTALL_TARGET_AMBIGUOUS: ` +
        `installPart requires exactly one of aircraftId or engineId. ` +
        `Received: aircraftId=${args.aircraftId ?? "null"}, engineId=${args.engineId ?? "null"}. ` +
        `Install a part to an aircraft OR an engine — not both, not neither.`,
      );
    }

    // ── G3: Double-install guard (belt-and-suspenders) ─────────────────────────
    // location == "inventory" in G1 should prevent this, but verify via history
    const openHistoryRecord = await ctx.db
      .query("partInstallationHistory")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .filter((q) =>
        q.and(
          q.eq(q.field("removedAt"), undefined),
        ),
      )
      .first();
    if (openHistoryRecord) {
      throw new Error(
        `PART_ALREADY_INSTALLED: ` +
        `Part ${args.partId} has an open installation history record (${openHistoryRecord._id}). ` +
        `A part with an open installation record cannot be installed again. ` +
        `Ensure the prior removal was properly recorded.`,
      );
    }

    // ── G4: Validate signatureAuthEvent (consume atomically below) ────────────
    // We validate here but consume atomically with the writes.
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found. ` +
        `Request a new re-authentication event.`,
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

    // ── G5: Verify work order is open/in_progress and belongs to same org ─────
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${args.workOrderId} not found.`);
    }
    if (workOrder.organizationId !== part.organizationId) {
      throw new Error(
        `INSTALL_ORG_MISMATCH: ` +
        `Work order ${args.workOrderId} belongs to organization ${workOrder.organizationId} ` +
        `but part ${args.partId} belongs to organization ${part.organizationId}. ` +
        `Parts can only be installed under a work order from the same organization.`,
      );
    }
    if (workOrder.status !== "open" && workOrder.status !== "in_progress") {
      throw new Error(
        `INSTALL_WO_CLOSED: ` +
        `Work order ${args.workOrderId} has status "${workOrder.status}". ` +
        `Parts can only be installed under an open or in-progress work order. ` +
        `Status "${workOrder.status}" does not permit new installations.`,
      );
    }

    // ── G6: SHELF LIFE CHECK ─────────────────────────────────────────────────
    // A shelf-life-expired part must be quarantined before any use.
    if (part.hasShelfLifeLimit && part.shelfLifeLimitDate != null) {
      if (part.shelfLifeLimitDate <= now) {
        throw new Error(
          `SHELF_LIFE_EXPIRED: ` +
          `Part ${args.partId} (${part.partNumber}) shelf life expired on ` +
          `${new Date(part.shelfLifeLimitDate).toISOString()}. ` +
          `This part must be moved to quarantine before any further use. ` +
          `An expired shelf-life part may not be installed.`,
        );
      }
    }

    // ── G7: LIFE-LIMITED PART CHECK ──────────────────────────────────────────
    // Hard block at zero or negative remaining life.
    // Warn (but not block) for low remaining life.
    let lifeLimitWarning: string | undefined;
    if (part.isLifeLimited) {
      // Hours-based life check
      if (part.lifeLimitHours != null) {
        const accruedHours = part.hoursAccumulatedBeforeInstall ?? 0;
        const remainingHours = part.lifeLimitHours - accruedHours;
        if (remainingHours <= 0) {
          throw new Error(
            `LIFE_LIMITED_EXPIRED: ` +
            `Part ${args.partId} (${part.partNumber}) has zero or negative remaining flight hours. ` +
            `Life limit: ${part.lifeLimitHours}h. Accumulated: ${accruedHours}h. ` +
            `Remaining: ${remainingHours}h. ` +
            `Life-limited parts at or beyond their life limit must be scrapped. ` +
            `They may not be installed under any circumstances. ` +
            `Contact your DOM to authorize scrapping.`,
          );
        }
        // Warn at <= 10% remaining (not a hard block per Nadia's PM note)
        const percentRemaining = (remainingHours / part.lifeLimitHours) * 100;
        if (percentRemaining <= 10) {
          lifeLimitWarning =
            `LLP_LOW_LIFE_WARNING: Part ${args.partId} (${part.partNumber}) has ` +
            `${remainingHours.toFixed(1)}h remaining (${percentRemaining.toFixed(1)}% of ${part.lifeLimitHours}h limit). ` +
            `Installation proceeding per technician judgment. ` +
            `Ensure replacement part is available before this limit is reached.`;
        }
      }
    }

    // ── G8: 8130-3 / AIRWORTHINESS DOCUMENTATION CHECK (INV-07 / REG-007) ────
    if (part.eightOneThirtyId == null) {
      // No 8130-3 linked. Check for a receiving inspection maintenance record.
      // For now: a work order link on the part's receivingWorkOrderId indicates
      // a receiving inspection was performed at intake.
      // TODO: Phase 4.1 — When maintenanceRecords implements a parts link index,
      // query for an explicit receiving inspection record linked to this part.
      // For now, use receivingWorkOrderId as a proxy.
      const hasReceivingInspection = part.receivingWorkOrderId != null;
      if (!hasReceivingInspection) {
        throw new Error(
          `PART_NO_AIRWORTHINESS_DOCS: ` +
          `Part ${args.partId} (${part.partNumber}) has no linked airworthiness documentation. ` +
          `Attach an 8130-3 record or record a receiving inspection before installation. ` +
          (part.isOwnerSupplied
            ? `This is an Owner-Supplied Part (OSP). Per 14 CFR 145.201(c), OSP parts ` +
              `require airworthiness documentation before the repair station may return them ` +
              `to service. There is NO override path for OSP parts.`
            : `Attach an 8130-3 or record a receiving inspection before installation.`),
        );
      }
    } else {
      // 8130-3 exists — verify it is not suspect
      const tag = await ctx.db.get(part.eightOneThirtyId);
      if (tag && tag.isSuspect) {
        throw new Error(
          `PART_SUSPECT_8130: ` +
          `Part ${args.partId} (${part.partNumber}) is linked to a suspect 8130-3 ` +
          `(status: ${tag.suspectStatus ?? "under_investigation"}). ` +
          `Reason: "${tag.suspectReason ?? "not specified"}". ` +
          `A suspect 8130-3 must be resolved before the part can be installed. ` +
          `Per FAA Order 8120.11, suspected unapproved parts must be quarantined ` +
          `and investigated before any use.`,
        );
      }
    }

    // OSP parts have absolutely no bypass for documentation requirement
    if (part.isOwnerSupplied && part.eightOneThirtyId == null) {
      throw new Error(
        `OSP_NO_8130: ` +
        `Owner-Supplied Part ${args.partId} (${part.partNumber}) has no 8130-3. ` +
        `Per 14 CFR 145.201(c), there is no override path. ` +
        `An 8130-3 must be attached before an OSP may be installed.`,
      );
    }

    // ── G9: Verify technician is active ──────────────────────────────────────
    const tech = await ctx.db.get(args.installedByTechId);
    if (!tech) {
      throw new Error(`Technician ${args.installedByTechId} not found.`);
    }
    if (tech.status !== "active") {
      throw new Error(
        `TECH_INACTIVE: ` +
        `Technician ${args.installedByTechId} (${tech.legalName}) has status ` +
        `"${tech.status}". Only active technicians may install parts.`,
      );
    }

    // ── WRITES: All atomic ────────────────────────────────────────────────────

    // Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "parts",
      consumedByRecordId: args.partId,
    });

    // Create installation history record
    const historyId = await ctx.db.insert("partInstallationHistory", {
      partId: args.partId,
      aircraftId: args.aircraftId ?? workOrder.aircraftId,
      engineId: args.engineId,
      organizationId: part.organizationId,
      position: args.installPosition,
      installedAt: now,
      installedByWorkOrderId: args.workOrderId,
      installedByTechnicianId: args.installedByTechId,
      aircraftHoursAtInstall: args.aircraftHoursAtInstall,
      aircraftCyclesAtInstall: args.aircraftCyclesAtInstall,
      // removedAt, removedBy*, aircraftHoursAtRemoval etc. left null/undefined
      createdAt: now,
    });

    // Update the part record
    await ctx.db.patch(args.partId, {
      location: "installed",
      currentAircraftId: args.aircraftId,
      currentEngineId: args.engineId,
      installPosition: args.installPosition,
      installedAt: now,
      installedByWorkOrderId: args.workOrderId,
      hoursAtInstallation: args.aircraftHoursAtInstall,
      cyclesAtInstallation: args.aircraftCyclesAtInstall,
      // Clear removal fields (in case of reinstall after prior removal)
      removedAt: undefined,
      removedByWorkOrderId: undefined,
      updatedAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: part.organizationId,
      eventType: "part_installed",
      tableName: "parts",
      recordId: args.partId,
      userId: callerUserId,
      technicianId: args.installedByTechId,
      ipAddress: args.callerIpAddress,
      notes:
        `Part ${part.partNumber}${part.serialNumber ? ` S/N ${part.serialNumber}` : ""} ` +
        `installed on ` +
        (args.aircraftId
          ? `aircraft ${args.aircraftId}`
          : `engine ${args.engineId}`) +
        ` at ${args.aircraftHoursAtInstall}h TT. ` +
        `Position: ${args.installPosition ?? "not specified"}. ` +
        `Work order: ${args.workOrderId}. ` +
        `Installation history: ${historyId}. ` +
        `Auth event: ${args.signatureAuthEventId}.` +
        (lifeLimitWarning ? ` WARNING: ${lifeLimitWarning}` : ""),
      timestamp: now,
    });

    // ── Part history: "installed" event ─────────────────────────────────────
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: part.organizationId,
      partId: args.partId,
      eventType: "installed",
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      fromLocation: part.location,
      toLocation: "installed",
      performedByUserId: callerUserId,
      performedByTechnicianId: args.installedByTechId,
      notes: `Installed on ${args.aircraftId ? `aircraft ${args.aircraftId}` : `engine ${args.engineId}`} at ${args.aircraftHoursAtInstall}h TT. Position: ${args.installPosition ?? "N/A"}`,
    });

    return { partInstallationHistoryId: historyId };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: removePart
//
// Spec ref: parts-traceability.md §2.3
// Enforces: Cilla 3.5 (both currentAircraftId and currentEngineId cleared),
//           life accumulation total update, signatureAuthEvent consumption
//
// Transitions a part from installed → removed_pending_disposition.
// Updates the partInstallationHistory with removal data.
// Computes and updates the running life accumulation total.
//
// DOES NOT automatically set condition to "unserviceable". A part removed
// for scheduled replacement may still be serviceable. Condition is only
// changed by an explicit tagPartUnserviceable or inspection finding.
// Per spec §2.3 NOTE.
// ─────────────────────────────────────────────────────────────────────────────

export const removePart = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.id("workOrders"),
    removedByTechId: v.id("technicians"),
    signatureAuthEventId: v.id("signatureAuthEvents"),

    aircraftHoursAtRemoval: v.number(),
    aircraftCyclesAtRemoval: v.optional(v.number()),
    removalReason: v.optional(v.string()),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{
    partInstallationHistoryId: Id<"partInstallationHistory">;
    totalAccumulatedHours: number;
  }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── G1: Fetch part and assert location == "installed" ─────────────────────
    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error(`Part ${args.partId} not found.`);
    }
    if (part.location !== "installed") {
      throw new Error(
        `PART_NOT_INSTALLED: ` +
        `Part ${args.partId} (${part.partNumber}) is not currently installed. ` +
        `Current location: "${part.location}". ` +
        `removePart can only be called on installed parts.`,
      );
    }

    // ── G2: Verify work order is open/in_progress ─────────────────────────────
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      throw new Error(`Work order ${args.workOrderId} not found.`);
    }
    if (workOrder.status !== "open" && workOrder.status !== "in_progress") {
      throw new Error(
        `REMOVE_WO_CLOSED: ` +
        `Work order ${args.workOrderId} has status "${workOrder.status}". ` +
        `Parts can only be removed under an open or in-progress work order.`,
      );
    }

    // ── G3: Validate signatureAuthEvent ──────────────────────────────────────
    // Validation here, consumption atomic with writes below.
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} already consumed.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}.`,
      );
    }

    // ── G4: Hours at removal must be >= hours at installation ─────────────────
    const installHours = part.hoursAtInstallation ?? 0;
    if (args.aircraftHoursAtRemoval < installHours) {
      throw new Error(
        `REMOVAL_HOURS_BELOW_INSTALL: ` +
        `Aircraft hours at removal (${args.aircraftHoursAtRemoval}h) cannot be less than ` +
        `hours at installation (${installHours}h). ` +
        `Aircraft hours are monotonically increasing. ` +
        `A lower value is either a data entry error or an attempt to falsify records.`,
      );
    }

    // ── LIFE ACCUMULATION COMPUTATION ────────────────────────────────────────
    // Per spec §2.3: compute hours accumulated this installation
    const hoursThisInstall = args.aircraftHoursAtRemoval - installHours;
    const newTotalHours = (part.hoursAccumulatedBeforeInstall ?? 0) + hoursThisInstall;

    let newTotalCycles = part.cyclesAccumulatedBeforeInstall ?? 0;
    if (args.aircraftCyclesAtRemoval != null && part.cyclesAtInstallation != null) {
      const cyclesThisInstall = args.aircraftCyclesAtRemoval - part.cyclesAtInstallation;
      newTotalCycles = (part.cyclesAccumulatedBeforeInstall ?? 0) + Math.max(0, cyclesThisInstall);
    }

    // ── Find the open partInstallationHistory record ───────────────────────────
    const openHistory = await ctx.db
      .query("partInstallationHistory")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .filter((q) => q.eq(q.field("removedAt"), undefined))
      .first();

    if (!openHistory) {
      // This shouldn't happen if location == "installed" (G1 passed), but guard it
      throw new Error(
        `INSTALL_HISTORY_MISSING: ` +
        `No open installation history record found for part ${args.partId}. ` +
        `This is a data integrity error. ` +
        `The part record shows it is installed, but no corresponding installation ` +
        `history record exists. Contact your system administrator.`,
      );
    }

    // ── WRITES: All atomic ────────────────────────────────────────────────────

    // Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "parts",
      consumedByRecordId: args.partId,
    });

    // Update the installation history record with removal data
    await ctx.db.patch(openHistory._id, {
      removedAt: now,
      removedByWorkOrderId: args.workOrderId,
      removedByTechnicianId: args.removedByTechId,
      aircraftHoursAtRemoval: args.aircraftHoursAtRemoval,
      aircraftCyclesAtRemoval: args.aircraftCyclesAtRemoval,
      removalReason: args.removalReason,
    });

    // Update the part record — Cilla 3.5: BOTH currentAircraftId AND currentEngineId cleared
    await ctx.db.patch(args.partId, {
      location: "removed_pending_disposition",
      currentAircraftId: undefined,    // MUST be cleared — Cilla 3.5
      currentEngineId: undefined,      // MUST be cleared — Cilla 3.5
      installPosition: undefined,
      removedAt: now,
      removedByWorkOrderId: args.workOrderId,
      // Update running life accumulation totals
      hoursAccumulatedBeforeInstall: newTotalHours,
      cyclesAccumulatedBeforeInstall: newTotalCycles,
      updatedAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: part.organizationId,
      eventType: "part_removed",
      tableName: "parts",
      recordId: args.partId,
      userId: callerUserId,
      technicianId: args.removedByTechId,
      ipAddress: args.callerIpAddress,
      notes:
        `Part ${part.partNumber}${part.serialNumber ? ` S/N ${part.serialNumber}` : ""} ` +
        `removed from ` +
        (part.currentAircraftId ? `aircraft ${part.currentAircraftId}` : `engine ${part.currentEngineId}`) +
        ` at ${args.aircraftHoursAtRemoval}h TT. ` +
        `Hours this installation: ${hoursThisInstall.toFixed(1)}h. ` +
        `Total accumulated hours: ${newTotalHours.toFixed(1)}h. ` +
        `Reason: "${args.removalReason ?? "not specified"}". ` +
        `Work order: ${args.workOrderId}. ` +
        `History record: ${openHistory._id}.`,
      timestamp: now,
    });

    // ── Part history: "removed" event ───────────────────────────────────────
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: part.organizationId,
      partId: args.partId,
      eventType: "removed",
      workOrderId: args.workOrderId,
      aircraftId: part.currentAircraftId,
      fromLocation: "installed",
      toLocation: "removed_pending_disposition",
      performedByUserId: callerUserId,
      performedByTechnicianId: args.removedByTechId,
      notes: `Removed at ${args.aircraftHoursAtRemoval}h TT. Reason: "${args.removalReason ?? "not specified"}"`,
    });

    return {
      partInstallationHistoryId: openHistory._id,
      totalAccumulatedHours: newTotalHours,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: tagPartUnserviceable
//
// Spec ref: parts-traceability.md §2.4
// Enforces: G1 (cannot tag installed part directly), reason required,
//           signatureAuthEvent consumption, audit trail
//
// Sets a part's condition to "unserviceable" and transitions it to "quarantine".
// This is the "red tag" operation. Once tagged unserviceable, the part cannot
// be installed without going through overhaul/repair and obtaining fresh docs.
//
// Per spec §2.4 G1: "If the part is currently 'installed', the mutation will
// throw: remove it first." This ensures the removal record (with hours-at-removal)
// is always created before the unserviceable determination. The traceability
// chain cannot have a gap.
//
// Per Nadia (spec §2.4 product note): The UI should provide a "Remove and Red Tag"
// combined action that calls both mutations in sequence for the common case.
// ─────────────────────────────────────────────────────────────────────────────

export const tagPartUnserviceable = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.optional(v.id("workOrders")),
    taggedByTechId: v.id("technicians"),
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // REQUIRED — free text description of the finding
    unserviceableReason: v.string(),

    // Structured category for reporting and analytics
    unserviceableCategory: v.union(
      v.literal("damage"),
      v.literal("corrosion"),
      v.literal("life_expired"),
      v.literal("airworthiness_concern"),
      v.literal("missing_documentation"),
      v.literal("failed_inspection"),
      v.literal("other"),
    ),

    // Optional: maintenance record documenting the finding
    maintenanceRecordId: v.optional(v.id("maintenanceRecords")),

    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<{ partId: Id<"parts">; quarantinedAt: number }> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── G1: Part must NOT be installed ────────────────────────────────────────
    // Per spec §2.4 G1: "Cannot tag an installed part as unserviceable directly.
    // Call removePart first."
    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error(`Part ${args.partId} not found.`);
    }
    if (part.location === "installed") {
      throw new Error(
        `PART_IS_INSTALLED: ` +
        `Cannot tag an installed part as unserviceable directly. ` +
        `Call removePart first to create the removal record (with hours-at-removal), ` +
        `then call tagPartUnserviceable on the removed part. ` +
        `The two-step process ensures the traceability chain is never broken. ` +
        `Per parts-traceability.md §2.4: removing the part first also creates the ` +
        `installation history closure record required for life accumulation tracking.`,
      );
    }
    if (part.location === "scrapped") {
      throw new Error(
        `PART_ALREADY_SCRAPPED: ` +
        `Part ${args.partId} (${part.partNumber}) is already scrapped. ` +
        `Scrapped parts cannot be tagged unserviceable — they are already disposed of.`,
      );
    }

    // ── G2: Reason must be non-empty ──────────────────────────────────────────
    if (!args.unserviceableReason.trim()) {
      throw new Error(
        `UNSERVICEABLE_REASON_EMPTY: ` +
        `unserviceableReason must be a non-empty string. ` +
        `A specific reason is required for all unserviceable determinations. ` +
        `The reason becomes part of the permanent audit record.`,
      );
    }

    // ── G3: Validate and consume signatureAuthEvent ───────────────────────────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(
        `signatureAuthEvent ${args.signatureAuthEventId} not found.`,
      );
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} already consumed.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}.`,
      );
    }

    const previousCondition = part.condition;
    const previousLocation = part.location;

    // ── WRITES: All atomic ────────────────────────────────────────────────────

    // Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "parts",
      consumedByRecordId: args.partId,
    });

    // Update part to unserviceable / quarantine
    await ctx.db.patch(args.partId, {
      condition: "unserviceable",
      location: "quarantine",
      quarantineReason:
        `[${args.unserviceableCategory.toUpperCase()}] ${args.unserviceableReason.trim()}`,
      quarantineCreatedById: args.taggedByTechId,
      quarantineCreatedAt: now,
      updatedAt: now,
    });

    // Audit log — comprehensive as required by spec §5.2
    await ctx.db.insert("auditLog", {
      organizationId: part.organizationId,
      eventType: "record_updated",
      tableName: "parts",
      recordId: args.partId,
      userId: callerUserId,
      technicianId: args.taggedByTechId,
      ipAddress: args.callerIpAddress,
      fieldName: "condition",
      oldValue: JSON.stringify(previousCondition),
      newValue: JSON.stringify("unserviceable"),
      notes:
        `Part ${part.partNumber}${part.serialNumber ? ` S/N ${part.serialNumber}` : ""} ` +
        `tagged unserviceable (RED TAG). ` +
        `Previous condition: "${previousCondition}". ` +
        `Previous location: "${previousLocation}". ` +
        `Category: ${args.unserviceableCategory}. ` +
        `Reason: "${args.unserviceableReason.trim()}". ` +
        `Moved to quarantine. ` +
        (args.maintenanceRecordId
          ? `Documented in maintenance record: ${args.maintenanceRecordId}. `
          : "No maintenance record linked. ") +
        (args.workOrderId
          ? `Work order: ${args.workOrderId}. `
          : "No work order linked (stand-alone tagging action). ") +
        `Tagged by: ${args.taggedByTechId}. ` +
        `Auth event: ${args.signatureAuthEventId}.`,
      timestamp: now,
    });

    // ── Part history: "quarantined" event ───────────────────────────────────
    await ctx.runMutation(internal.partHistory.recordEvent, {
      organizationId: part.organizationId,
      partId: args.partId,
      eventType: "quarantined",
      workOrderId: args.workOrderId,
      fromLocation: previousLocation,
      toLocation: "quarantine",
      fromCondition: previousCondition,
      toCondition: "unserviceable",
      performedByUserId: callerUserId,
      performedByTechnicianId: args.taggedByTechId,
      notes: `RED TAG: [${args.unserviceableCategory.toUpperCase()}] ${args.unserviceableReason.trim()}`,
    });

    return { partId: args.partId, quarantinedAt: now };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listParts
//
// Lists parts for an organization, optionally filtered by location.
// Used by the Parts Requests page and Dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export const listParts = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.union(v.id("shopLocations"), v.literal("all"))),
    location: v.optional(
      v.union(
        v.literal("pending_inspection"),
        v.literal("inventory"),
        v.literal("installed"),
        v.literal("removed_pending_disposition"),
        v.literal("quarantine"),
        v.literal("scrapped"),
        v.literal("returned_to_vendor"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let parts;
    if (args.location) {
      parts = await ctx.db
        .query("parts")
        .withIndex("by_location", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("location", args.location!),
        )
        .collect();
    } else {
      parts = await ctx.db
        .query("parts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .collect();
    }
    if (args.shopLocationId && args.shopLocationId !== "all") {
      parts = parts.filter((part) => part.shopLocationId === args.shopLocationId);
    }
    return parts;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createPart
//
// Creates a bare part record without 8130-3 tag (for demand / requisition
// tracking).  Call receivePart afterwards to complete the receiving process
// and attach documentation.
// ─────────────────────────────────────────────────────────────────────────────

export const createPart = mutation({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    supplier: v.optional(v.string()),
    workOrderId: v.optional(v.id("workOrders")),
    // v11: Relational warehouse location
    binLocationId: v.optional(v.id("warehouseBins")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();

    // Create one part record per unit for serialized tracking.
    // For bulk/unserialized parts the caller typically passes quantity = 1.
    const ids: Id<"parts">[] = [];
    for (let i = 0; i < Math.max(1, args.quantity); i++) {
      const partId = await ctx.db.insert("parts", {
        organizationId: args.organizationId,
        shopLocationId: args.shopLocationId,
        partNumber: args.partNumber,
        partName: args.partName,
        description: args.description,
        isSerialized: false,
        isLifeLimited: false,
        hasShelfLifeLimit: false,
        condition: "new",
        location: "pending_inspection",
        isOwnerSupplied: false,
        supplier: args.supplier,
        receivingWorkOrderId: args.workOrderId,
        binLocationId: args.binLocationId,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(partId);
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "parts",
      recordId: ids[0],
      userId: identity.subject,
      timestamp: now,
      notes: `Part ${args.partNumber} (${args.partName}) created — qty ${args.quantity}`,
    });

    return ids;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPart
//
// Returns a single part by ID. Used by the /parts/:id detail page for
// deep-link navigation. Returns null if the part does not exist.
// ─────────────────────────────────────────────────────────────────────────────

export const getPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.partId);
  },
});
