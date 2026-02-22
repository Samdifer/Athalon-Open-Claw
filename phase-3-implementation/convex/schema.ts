// convex/schema.ts
// Athelon — Aviation MRO SaaS Platform
//
// Primary schema author:       Devraj Anand (Backend, Convex)
// Architecture:                Rafael Mendoza
// Regulatory Review:           Marcus Webb, Capt. Rosa Eaton
// QA Review:                   Cilla Oduya
// Schema Version:              2 (Phase 1 gate review remediation — 2026-02-22)
// Phase 3 Implementation:      Devraj Anand
//
// SOURCE OF TRUTH: convex-schema-v2.md (FROZEN 2026-02-22)
// This file is a direct, runnable TypeScript translation of that spec.
// Every comment prefixed // INVARIANT: is an enforcement requirement for the
// mutation layer — the type system cannot enforce these; mutations must.
//
// DO NOT modify the schema structure without a corresponding update to convex-schema-v2.md
// and a sign-off from Marcus Webb (regulatory) and Cilla Oduya (QA).

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATOR TYPES
// Defined as constants for reuse across multiple table definitions.
// Convex v1 allows validator constants to be referenced inside v.object({}),
// which is the pattern used throughout this file.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Certificate type held by a technician.
 * Maps to FAA certificate categories under 14 CFR Part 65.
 */
const certificateType = v.union(
  v.literal("A&P"),             // Airframe and Powerplant — 14 CFR 65.71
  v.literal("airframe_only"),   // Airframe rating only — 14 CFR 65.85
  v.literal("powerplant_only"), // Powerplant rating only — 14 CFR 65.87
  v.literal("IA"),              // Inspection Authorization — 14 CFR 65.91
  v.literal("repairman"),       // FAA Repairman Certificate — 14 CFR 65.101
  v.literal("repair_station"),  // Repair station authorized person — 14 CFR Part 145
  v.literal("other"),
);

/**
 * A&P ratings exercised at the time of signing a maintenance entry.
 * Required per 14 CFR 65.85 (airframe rating) and 65.87 (powerplant rating).
 * Must be populated on every signing event — see INV-02.
 */
const ratingsExercised = v.array(
  v.union(
    v.literal("airframe"),
    v.literal("powerplant"),
    v.literal("ia"),   // When signing under Inspection Authorization authority
    v.literal("none"), // Non-rated scope (e.g. repair station authorized person)
  ),
);

/** Current airworthiness status of an aircraft. */
const aircraftStatus = v.union(
  v.literal("airworthy"),
  v.literal("out_of_service"),
  v.literal("in_maintenance"),
  v.literal("destroyed"),
  v.literal("sold"),
  v.literal("unknown"),
);

/**
 * Work order lifecycle status.
 *
 * INVARIANT [workOrders.close — INV-06/INV-19]:
 *   Status may only transition to "closed" when:
 *     1. aircraftTotalTimeAtClose is set and >= aircraftTotalTimeAtOpen (throw if less)
 *     2. closedAt, closedByUserId, closedByTechnicianId are all set
 *     3. All discrepancies are in status "dispositioned"
 *     4. A returnToService record linked to this work order exists
 *
 * INVARIANT [workOrders.void]:
 *   Status "voided" requires voidedByUserId, voidedAt, voidedReason — all non-null.
 *   Voiding is an administrative error correction; cancellation is a customer decision.
 */
const workOrderStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("on_hold"),            // v2: waiting on parts, customer auth, etc.
  v.literal("pending_inspection"),
  v.literal("pending_signoff"),
  v.literal("open_discrepancies"),
  v.literal("closed"),
  v.literal("cancelled"),
  v.literal("voided"),             // v2: administrative void — distinct from cancelled
);

/** Discrepancy disposition — how a finding was resolved. */
const discrepancyDisposition = v.union(
  v.literal("corrected"),
  v.literal("deferred_mel"),
  v.literal("deferred_grounded"),
  v.literal("no_fault_found"),
  v.literal("no_fault_found_could_not_reproduce"),
  v.literal("pending"),
);

/** Condition of a part at time of record. */
const partCondition = v.union(
  v.literal("new"),
  v.literal("serviceable"),
  v.literal("overhauled"),
  v.literal("repaired"),
  v.literal("unserviceable"),
  v.literal("quarantine"),
  v.literal("scrapped"),
);

/**
 * Technician signature object embedded in maintenance and inspection records.
 *
 * v2 changes:
 *   - ratingsExercised added (REG-002 / 14 CFR 65.85, 65.87)
 *   - signatureAuthEventId is now v.id("signatureAuthEvents") — typed FK (REG-005)
 *   - signatureHash is now required (was optional in v1)
 *
 * INVARIANT [all signing mutations]:
 *   ratingsExercised must be populated at signing time.
 *   signatureHash must be computed from the canonical record content.
 *   signatureAuthEventId must reference a consumed signatureAuthEvent (INV-05).
 */
const technicianSignature = v.object({
  technicianId: v.id("technicians"),
  legalName: v.string(),              // Snapshot at signing — not a runtime lookup
  certificateNumber: v.string(),      // Snapshot at signing — not a runtime lookup
  certificateType: certificateType,
  ratingsExercised: ratingsExercised, // v2 — REG-002 — which rating was exercised
  scopeOfWork: v.string(),
  signatureTimestamp: v.number(),     // Unix timestamp (ms)
  signatureHash: v.string(),          // v2 — required; hash of record content at signing
  signatureAuthEventId: v.id("signatureAuthEvents"), // v2 — typed FK (REG-005)
});

/**
 * Part record embedded in maintenance records.
 * Captures what was installed, removed, overhauled, repaired, or inspected.
 *
 * INVARIANT: quantity must be >= 1. Schema admits 0 and negative; mutation must validate.
 */
const embeddedPartRecord = v.object({
  partNumber: v.string(),
  partName: v.string(),
  serialNumber: v.optional(v.string()),
  quantity: v.number(),
  // INVARIANT: quantity >= 1. Enforced in mutation. v.number() admits zero/negative.
  action: v.union(
    v.literal("installed"),
    v.literal("removed"),
    v.literal("overhauled"),
    v.literal("repaired"),
    v.literal("inspected"),
  ),
  eightOneThirtyReference: v.optional(v.string()),
  partInventoryId: v.optional(v.id("parts")),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export default defineSchema({

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE AUTH EVENTS
  //
  // v2: New table — the foundational record linking Clerk re-authentication
  // to Convex signing mutations (resolves REG-005 / QA-007).
  //
  // Design principle: a signatureAuthEvent is generated by the pre-signing
  // re-authentication flow (PIN, biometric, MFA), carries a 5-minute TTL,
  // and is consumed exactly once. After consumption it is retained permanently
  // as an immutable audit record.
  //
  // Jonas Harker (Platform) owns the Clerk webhook integration that creates
  // these records. No signing mutation may be invoked without a valid,
  // unconsumed event.
  //
  // INVARIANT [all signing mutations — INV-05]:
  //   Before consuming: consumed == false AND expiresAt > Date.now()
  //   AND technicianId matches the caller.
  //   Consumption is atomic with the target record update (same Convex transaction).
  //   A consumed event may never be re-used. Throw on any violation.
  // ═══════════════════════════════════════════════════════════════════════════
  signatureAuthEvents: defineTable({
    // Clerk authentication identifiers
    clerkEventId: v.string(),         // Clerk-issued event ID from re-auth webhook
    clerkSessionId: v.string(),       // Clerk session at time of re-authentication
    userId: v.string(),               // Clerk user ID (sub claim)

    // Technician identity confirmed by the re-auth
    technicianId: v.id("technicians"),
    authenticatedLegalName: v.string(),  // Legal name confirmed during re-auth
    authenticatedCertNumber: v.string(), // Certificate number entered/confirmed

    // Authentication method
    authMethod: v.union(
      v.literal("pin"),       // 6-digit PIN re-entry
      v.literal("biometric"), // Face ID / Touch ID
      v.literal("password"),  // Password re-entry
      v.literal("mfa_totp"),  // TOTP second factor
      v.literal("mfa_sms"),   // SMS second factor
    ),

    // Context of the signing action (what is being signed)
    intendedTable: v.string(),                          // e.g. "returnToService", "taskCardSteps"
    intendedRecordHash: v.optional(v.string()),         // Hash of record content pre-auth

    // Network context for audit and anomaly detection
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Lifecycle
    authenticatedAt: v.number(),   // When user re-authenticated (Unix ms)
    expiresAt: v.number(),         // authenticatedAt + 5 minutes (300_000 ms)

    // Consumption tracking
    // INVARIANT [INV-05]: consumed transitions from false → true exactly once.
    // The signing mutation must atomically check consumed == false and set it true.
    consumed: v.boolean(),
    consumedAt: v.optional(v.number()),
    consumedByTable: v.optional(v.string()),
    consumedByRecordId: v.optional(v.string()),
  })
    .index("by_clerk_event", ["clerkEventId"])
    .index("by_user_timestamp", ["userId", "authenticatedAt"])
    .index("by_technician_timestamp", ["technicianId", "authenticatedAt"])
    .index("by_session", ["clerkSessionId"])
    .index("by_expiry", ["expiresAt"]), // for TTL-based cleanup jobs

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIZATIONS
  //
  // v2: directorOfMaintenance and qualityControlManager now reference technician
  //     records (resolves REG-004). Display name fields added for fast rendering.
  //
  // INVARIANT [Part 145 org setup — INV-04]:
  //   If part145CertificateNumber is set, both directorOfMaintenanceId and
  //   qualityControlManagerId must reference active technicians with valid certs.
  //   The org-setup mutation validates certificate currency on assignment.
  // ═══════════════════════════════════════════════════════════════════════════
  organizations: defineTable({
    name: v.string(),
    part145CertificateNumber: v.optional(v.string()),
    part145Ratings: v.array(v.string()), // e.g. ["Class A Airframe", "Class A Powerplant"]
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),

    // v2: DOM and QCM now reference technician records (REG-004)
    directorOfMaintenanceId: v.optional(v.id("technicians")),
    directorOfMaintenanceName: v.optional(v.string()), // denormalized display cache
    qualityControlManagerId: v.optional(v.id("technicians")),
    qualityControlManagerName: v.optional(v.string()), // denormalized display cache

    rsmRevision: v.optional(v.string()), // Repair Station Manual current revision

    subscriptionTier: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise"),
    ),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_part145_cert", ["part145CertificateNumber"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AIRCRAFT
  //
  // v2: Added customerId (resolves QA-005 — inverts the customers.aircraftIds
  //     relationship to eliminate write-conflict hotspot on customer documents).
  //
  // INVARIANT [aircraft.updateTime — INV-18]:
  //   totalTimeAirframeHours is monotonically increasing.
  //   Any write to this field must verify new value >= current value.
  //   If less, the mutation MUST throw — not warn. Decreasing TT is a
  //   falsification flag.
  // ═══════════════════════════════════════════════════════════════════════════
  aircraft: defineTable({
    // Identity — (make, model, serialNumber) is the true unique identifier
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    serialNumber: v.string(), // Manufacturer Serial Number (MSN)
    // INVARIANT: serialNumber must be non-empty and non-whitespace.

    currentRegistration: v.optional(v.string()), // N-number (null if not currently registered)

    typeCertificateNumber: v.optional(v.string()),
    experimental: v.boolean(),
    aircraftCategory: v.union(
      v.literal("normal"),
      v.literal("utility"),
      v.literal("acrobatic"),
      v.literal("limited"),
      v.literal("lsa"),
      v.literal("experimental"),
      v.literal("restricted"),
      v.literal("provisional"),
    ),

    engineCount: v.number(),
    maxGrossWeightLbs: v.optional(v.number()),
    yearOfManufacture: v.optional(v.number()),

    // INVARIANT [INV-18]: totalTimeAirframeHours is monotonically increasing.
    totalTimeAirframeHours: v.number(),
    totalTimeAirframeAsOfDate: v.number(), // Unix timestamp of last TT update

    ownerName: v.optional(v.string()),
    ownerAddress: v.optional(v.string()),
    operatingOrganizationId: v.optional(v.id("organizations")),
    operatingRegulation: v.optional(
      v.union(
        v.literal("part_91"),
        v.literal("part_135"),
        v.literal("part_121"),
        v.literal("part_137"),
        v.literal("part_91_135_mixed"),
        v.literal("pending_determination"), // v2: explicit unknown state
      ),
    ),

    // v2: Customer relationship (QA-005 — moved from customers.aircraftIds)
    customerId: v.optional(v.id("customers")),

    status: aircraftStatus,
    baseLocation: v.optional(v.string()), // ICAO airport code

    createdAt: v.number(),
    updatedAt: v.number(),
    createdByOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_serial", ["make", "model", "serialNumber"])
    .index("by_registration", ["currentRegistration"])
    .index("by_organization", ["operatingOrganizationId"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]), // v2: supports customer fleet queries

  // ═══════════════════════════════════════════════════════════════════════════
  // AIRCRAFT REGISTRATION HISTORY
  // (N-numbers can be re-assigned; history must be retained)
  // ═══════════════════════════════════════════════════════════════════════════
  aircraftRegistrationHistory: defineTable({
    aircraftId: v.id("aircraft"),
    nNumber: v.string(),
    effectiveDate: v.number(),
    expiryDate: v.optional(v.number()),
    registrationClass: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_n_number", ["nNumber"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINES
  //
  // INVARIANT [engine.status]:
  //   If status == "installed", currentAircraftId must be set.
  //   The install mutation enforces this.
  // ═══════════════════════════════════════════════════════════════════════════
  engines: defineTable({
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),

    currentAircraftId: v.optional(v.id("aircraft")),
    position: v.optional(v.string()), // "L", "R", "C", "1", "2", etc.

    // INVARIANT: All hours fields must be >= 0.
    totalTimeHours: v.number(),
    totalTimeAsOfDate: v.number(),
    timeSinceOverhaulHours: v.optional(v.number()),
    timeSinceNewHours: v.number(),
    timeBetweenOverhaulLimit: v.optional(v.number()), // Manufacturer TBO

    lastOverhaulDate: v.optional(v.number()),
    lastOverhaulFacility: v.optional(v.string()),
    lastOverhaulEightOneThirtyReference: v.optional(v.string()),

    status: v.union(
      v.literal("installed"),
      v.literal("removed_serviceable"),
      v.literal("removed_unserviceable"),
      v.literal("in_overhaul"),
      v.literal("scrapped"),
    ),

    organizationId: v.optional(v.id("organizations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serial", ["make", "model", "serialNumber"])
    .index("by_aircraft", ["currentAircraftId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICIANS
  //
  // INVARIANT [technician.sign]:
  //   A technician with userId == null cannot perform any signing action.
  //   The signing mutation must verify userId is set before generating
  //   a signatureAuthEvent. Technicians without system accounts are display-only.
  // ═══════════════════════════════════════════════════════════════════════════
  technicians: defineTable({
    legalName: v.string(),            // Name exactly as on FAA certificate
    userId: v.optional(v.string()),   // Clerk user ID (null = no system account)
    employeeId: v.optional(v.string()),
    organizationId: v.id("organizations"),

    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("terminated"),
    ),

    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_status", ["organizationId", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATES
  //
  // Each technician may hold multiple certificates.
  //
  // INVARIANT [certificate.create / certificate.update — INV-13]:
  //   If hasIaAuthorization == true, iaExpiryDate MUST be set.
  //   All IAs expire on March 31 of the applicable year.
  //
  // INVARIANT [certificate.create]:
  //   certificateNumber must be non-empty. Format validated for known types.
  // ═══════════════════════════════════════════════════════════════════════════
  certificates: defineTable({
    technicianId: v.id("technicians"),

    certificateType: certificateType,
    certificateNumber: v.string(), // FAA-issued
    // INVARIANT: non-empty; format validated per type in mutation.
    issueDate: v.number(),

    // Ratings for A&P certificates
    ratings: v.array(
      v.union(v.literal("airframe"), v.literal("powerplant")),
    ),

    // Inspection Authorization
    hasIaAuthorization: v.boolean(),
    iaExpiryDate: v.optional(v.number()), // Always March 31 of applicable year
    // INVARIANT [INV-13]: If hasIaAuthorization == true, iaExpiryDate MUST be set.

    // IA Renewal Activity Log (per 14 CFR 65.93)
    iaRenewalActivities: v.array(
      v.object({
        date: v.number(),
        activityType: v.union(
          v.literal("inspection_performed"),
          v.literal("pmi_review"),
          v.literal("faa_exam"),
          v.literal("other"),
        ),
        activityTypeDetail: v.optional(v.string()), // required when activityType == "other"
        notes: v.optional(v.string()),
      }),
    ),

    // Recent experience per 14 CFR 65.83
    lastExercisedDate: v.optional(v.number()),

    // Repair station specific authorizations
    repairStationAuthorizations: v.array(
      v.object({
        organizationId: v.id("organizations"),
        authorizedWorkScope: v.string(),
        effectiveDate: v.number(),
        expiryDate: v.optional(v.number()),
      }),
    ),

    certificateDocumentUrl: v.optional(v.string()),

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_certificate_number", ["certificateNumber"])
    .index("by_type", ["technicianId", "certificateType"])
    .index("by_ia_expiry", ["hasIaAuthorization", "iaExpiryDate"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WORK ORDERS
  //
  // v2 changes (resolves QA-005.1 and REG-006):
  //   - Added on_hold and voided to status enum
  //   - Added closedByTechnicianId (REG-006 / Marcus 3.2)
  //   - Added voidedByUserId, voidedAt, voidedReason
  //   - Added concurrentWorkOrderOverrideAcknowledged
  //   - aircraftTotalTimeAtClose invariant documented (REG-006)
  //
  // INVARIANT [workOrder.create — INV-14]:
  //   workOrderNumber must be unique within organizationId.
  //   Create mutation queries by_number and throws on collision.
  //
  // INVARIANT [workOrder.close — INV-06/INV-18/INV-19]:
  //   Before status → "closed":
  //     1. closedAt, closedByUserId, closedByTechnicianId must all be set
  //     2. aircraftTotalTimeAtClose must be set
  //     3. aircraftTotalTimeAtClose >= aircraftTotalTimeAtOpen (throw if not)
  //     4. All discrepancies must be in status "dispositioned"
  //     5. A returnToService record must exist for this work order
  //
  // INVARIANT [workOrder.void]:
  //   When status → "voided": voidedByUserId, voidedAt, voidedReason must all be set.
  //   No signed maintenanceRecords may exist for this WO (throw if found).
  // ═══════════════════════════════════════════════════════════════════════════
  workOrders: defineTable({
    workOrderNumber: v.string(),     // Human-readable, org-unique
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),

    status: workOrderStatus,

    workOrderType: v.union(
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
    ),

    description: v.string(),
    squawks: v.optional(v.string()), // Pilot-reported issues at intake

    // Timestamps
    openedAt: v.number(),
    openedByUserId: v.string(), // Clerk user ID
    targetCompletionDate: v.optional(v.number()),

    // Close fields — see INVARIANT block above
    closedAt: v.optional(v.number()),
    closedByUserId: v.optional(v.string()),
    closedByTechnicianId: v.optional(v.id("technicians")), // v2 (REG-006)

    // Aircraft time snapshot
    aircraftTotalTimeAtOpen: v.number(),
    // INVARIANT: >= 0. Set to 0 as sentinel in createWorkOrder; real value set in openWorkOrder.
    aircraftTotalTimeAtClose: v.optional(v.number()),
    // INVARIANT [INV-06]: Must be set before close. Must be >= aircraftTotalTimeAtOpen.

    // Voided state (only populated when status == "voided")
    voidedByUserId: v.optional(v.string()),
    voidedAt: v.optional(v.number()),
    voidedReason: v.optional(v.string()),

    // On-hold state
    onHoldReason: v.optional(v.string()),
    onHoldSince: v.optional(v.number()),

    // Concurrent work order handling (QA testability)
    concurrentWorkOrderOverrideAcknowledged: v.optional(v.boolean()),
    concurrentWorkOrderReason: v.optional(v.string()),

    // Customer / Billing
    customerId: v.optional(v.id("customers")),
    priority: v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("aog"), // Aircraft on Ground — highest priority
    ),
    billingStatus: v.optional(
      v.union(
        v.literal("quoted"),
        v.literal("approved"),
        v.literal("invoiced"),
        v.literal("paid"),
        v.literal("disputed"),
      ),
    ),

    // Return to service
    returnToServiceId: v.optional(v.id("returnToService")),
    returnedToService: v.optional(v.boolean()),

    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_number", ["organizationId", "workOrderNumber"])
    .index("by_aircraft_status", ["aircraftId", "status"])
    .index("by_priority", ["organizationId", "priority", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCREPANCIES
  //
  // v2 additions:
  //   - dispositionedCertificateNumber (Marcus 4.5 — REG requirement)
  //   - melDeferralDate (QA-008 — source truth for expiry computation)
  //   - no_fault_found_could_not_reproduce disposition
  //
  // INVARIANT [discrepancy.disposition — INV-16]:
  //   When disposition == "corrected":
  //     correctiveAction AND correctiveMaintenanceRecordId must both be set.
  //
  // INVARIANT [discrepancy.defer_mel — INV-17]:
  //   When disposition == "deferred_mel":
  //     melItemNumber, melCategory, melDeferralDate, melExpiryDate must all be set.
  //     melExpiryDate must equal melDeferralDate + category_interval.
  // ═══════════════════════════════════════════════════════════════════════════
  discrepancies: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),      // Denormalized for aircraft-level queries
    organizationId: v.id("organizations"),

    discrepancyNumber: v.string(),     // WO-scoped identifier

    status: v.union(
      v.literal("open"),
      v.literal("under_evaluation"),
      v.literal("dispositioned"),
    ),
    disposition: v.optional(discrepancyDisposition),

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

    description: v.string(),

    componentAffected: v.optional(v.string()),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    componentPosition: v.optional(v.string()),

    foundByTechnicianId: v.id("technicians"),
    foundAt: v.number(),
    foundAtAircraftHours: v.number(),
    // INVARIANT: foundAtAircraftHours >= 0.

    dispositionedByTechnicianId: v.optional(v.id("technicians")),
    dispositionedAt: v.optional(v.number()),
    dispositionedCertificateNumber: v.optional(v.string()), // v2 (Marcus 4.5)

    // MEL deferral fields
    melItemNumber: v.optional(v.string()),
    melCategory: v.optional(
      v.union(
        v.literal("A"), // 10 calendar days
        v.literal("B"), // 3 calendar days
        v.literal("C"), // 120 calendar days
        v.literal("D"), // No calendar limit specified
      ),
    ),
    melDeferralDate: v.optional(v.number()),   // v2: source truth for expiry (QA-008)
    melExpiryDate: v.optional(v.number()),     // computed from melDeferralDate + interval

    // Corrective action fields
    correctiveAction: v.optional(v.string()),
    correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),

    // Owner notification per 14 CFR 43.11(b)
    deferredListIssuedToOwner: v.optional(v.boolean()),
    deferredListIssuedAt: v.optional(v.number()),
    deferredListRecipient: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_disposition", ["workOrderId", "disposition"])
    .index("by_mel_expiry", ["melExpiryDate"])
    .index("by_org_mel_expiry", ["organizationId", "melExpiryDate"]), // v2 (Cilla 6.1)

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK CARDS
  //
  // v2 changes (resolves QA-001 and QA-002):
  //   - Embedded steps array removed — steps now live in taskCardSteps table
  //   - Status enum corrected to include both voided AND incomplete_na_steps
  //
  // Status semantics:
  //   not_started       — created, no steps touched
  //   in_progress       — at least one step addressed
  //   incomplete_na_steps — all steps addressed but ≥1 IA-required step was N/A'd;
  //                         requires IA review before card can be closed
  //   complete          — all steps signed off; card closed
  //   voided            — card administratively cancelled
  //
  // stepCount, completedStepCount, naStepCount are denormalized counters
  // maintained by completeStep. They must stay in sync — getCloseReadiness
  // surfaces any drift.
  //
  // INVARIANT [taskCard.complete — INV-09]:
  //   A task card may only transition to "complete" when all linked taskCardSteps
  //   are in status "completed" or "na", and all IA-required steps that were N/A'd
  //   have been reviewed.
  // ═══════════════════════════════════════════════════════════════════════════
  taskCards: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),

    taskCardNumber: v.string(),
    title: v.string(),

    taskType: v.union(
      v.literal("inspection"),
      v.literal("repair"),
      v.literal("replacement"),
      v.literal("ad_compliance"),
      v.literal("functional_check"),
      v.literal("rigging"),
      v.literal("return_to_service"),
      v.literal("overhaul"),
      v.literal("modification"),
    ),

    approvedDataSource: v.string(),            // Required — 14 CFR 43.9(a)(1)
    approvedDataRevision: v.optional(v.string()),

    assignedToTechnicianId: v.optional(v.id("technicians")),

    // INV-09 applies here — see status semantics above
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("incomplete_na_steps"), // v2: added from architecture doc
      v.literal("complete"),
      v.literal("voided"),
    ),

    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    notes: v.optional(v.string()),

    // Denormalized counters — maintained by completeStep mutation
    stepCount: v.number(),
    completedStepCount: v.number(),
    naStepCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedToTechnicianId", "status"])
    .index("by_org_assigned", ["organizationId", "assignedToTechnicianId", "status"]), // v2

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK CARD STEPS
  //
  // v2: New table — extracted from embedded steps array in taskCards (resolves QA-002).
  //
  // Rationale for extraction:
  //   1. Audit granularity: each step sign-off is a distinct document with its own trail
  //   2. Concurrency: multiple mechanics signing different steps no longer conflict
  //   3. Testability: per-step assertions are direct table queries, not array digs
  //   4. Indexing: steps can be queried by technician, status, and work order
  //
  // INVARIANT [taskCardStep.signoff — INV-10]:
  //   When status → "completed":
  //     signedByTechnicianId, signedAt, signedCertificateNumber, signatureAuthEventId
  //     must all be set. If signOffRequiresIa == true, signedHasIaOnDate must also be
  //     set, and the signing mutation must verify iaExpiryDate against signedAt.
  //
  // INVARIANT [taskCardStep.markNA]:
  //   naReason and naAuthorizedById must be set when status → "na".
  // ═══════════════════════════════════════════════════════════════════════════
  taskCardSteps: defineTable({
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),         // denormalized for WO-level queries
    aircraftId: v.id("aircraft"),            // denormalized for aircraft-level queries
    organizationId: v.id("organizations"),   // denormalized for org-scoped queries

    stepNumber: v.number(),    // 1-indexed, sequential within the task card
    description: v.string(),
    requiresSpecialTool: v.boolean(),
    specialToolReference: v.optional(v.string()),
    signOffRequired: v.boolean(),
    signOffRequiresIa: v.boolean(),

    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("na"),
    ),

    // Sign-off fields — populated when status → completed
    signedByTechnicianId: v.optional(v.id("technicians")),
    signedAt: v.optional(v.number()),
    signedCertificateNumber: v.optional(v.string()), // snapshot at signing time
    signedHasIaOnDate: v.optional(v.boolean()),       // IA currency at time of signing
    signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),

    // N/A fields — populated when status → na
    naReason: v.optional(v.string()),
    naAuthorizedById: v.optional(v.id("technicians")),
    naAuthorizedAt: v.optional(v.number()),

    notes: v.optional(v.string()),
    discrepancyIds: v.array(v.id("discrepancies")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_task_card_step", ["taskCardId", "stepNumber"]) // ordered step retrieval
    .index("by_work_order", ["workOrderId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_signed_technician", ["signedByTechnicianId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE RECORDS  (14 CFR 43.9)
  //
  // IMMUTABLE — no UPDATE operations permitted after creation.
  // The absence of updatedAt is an intentional schema-level signal.
  // Errors are corrected by creating a new record with recordType == "correction".
  //
  // v2 changes:
  //   - signatureAuthEventId now v.id("signatureAuthEvents") (REG-005 / QA-007)
  //   - technicianSignature now includes ratingsExercised (REG-002)
  //   - organizationCertificateNumber invariant documented (Marcus 4.2)
  //
  // INVARIANT [maintenanceRecord.create — INV-01]:
  //   For recordType == "correction": corrects, correctionFieldName,
  //   correctionOriginalValue, correctionCorrectedValue, correctionReason
  //   must ALL be set (AC 43-9C requirement).
  //
  // INVARIANT [maintenanceRecord.create — INV-20]:
  //   If returnedToService == true, returnToServiceStatement must be set.
  // ═══════════════════════════════════════════════════════════════════════════
  maintenanceRecords: defineTable({
    recordType: v.union(
      v.literal("maintenance_43_9"),
      v.literal("inspection_43_11"),
      v.literal("correction"),
    ),

    // Aircraft identification — ALL denormalized at signing (never change)
    aircraftId: v.id("aircraft"),
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    aircraftSerialNumber: v.string(),
    aircraftRegistration: v.string(),
    aircraftTotalTimeHours: v.number(),
    // INVARIANT: must equal workOrder.aircraftTotalTimeAtClose (sourced by mutation, not user input)

    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    organizationCertificateNumber: v.optional(v.string()),
    // INVARIANT [Marcus 4.2]: If org has part145CertificateNumber, this must be populated.

    sequenceNumber: v.number(), // Aircraft-scoped logbook entry sequence

    workPerformed: v.string(),
    approvedDataReference: v.string(), // NOT optional — 14 CFR 43.9(a)(1)
    partsReplaced: v.array(embeddedPartRecord),

    completionDate: v.number(), // Date work was COMPLETED

    // All signing technicians — each entry includes ratingsExercised (v2 REG-002)
    technicians: v.array(technicianSignature),

    // Primary signatory (person making the record entry)
    signingTechnicianId: v.id("technicians"),
    signingTechnicianLegalName: v.string(),           // Snapshot at signing
    signingTechnicianCertNumber: v.string(),          // Snapshot at signing
    signingTechnicianCertType: certificateType,       // Snapshot at signing
    signingTechnicianRatingsExercised: ratingsExercised, // v2 REG-002

    signatureTimestamp: v.number(),
    signatureHash: v.string(),
    signatureAuthEventId: v.id("signatureAuthEvents"), // v2 typed FK (REG-005)

    returnedToService: v.boolean(),
    returnToServiceStatement: v.optional(v.string()),
    // INVARIANT [INV-20]: If returnedToService == true, this must be set.

    discrepanciesFound: v.array(v.id("discrepancies")),
    discrepanciesCorrected: v.array(v.id("discrepancies")),
    discrepancyListProvided: v.optional(v.boolean()),

    // Correction record fields (only for recordType == "correction")
    corrects: v.optional(v.id("maintenanceRecords")),
    correctionFieldName: v.optional(v.string()),
    correctionOriginalValue: v.optional(v.string()),
    correctionCorrectedValue: v.optional(v.string()),
    correctionReason: v.optional(v.string()),
    // INVARIANT [INV-01]: All five must be set when recordType == "correction".

    createdAt: v.number(),
    // NOTE: NO updatedAt — immutable after creation. Do not add it.
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_aircraft_sequence", ["aircraftId", "sequenceNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_organization", ["organizationId"])
    .index("by_completion_date", ["aircraftId", "completionDate"])
    .index("by_org_completion_date", ["organizationId", "completionDate"]) // v2 NB-01
    .index("by_technician", ["signingTechnicianId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INSPECTION RECORDS  (14 CFR 43.11)
  //
  // IMMUTABLE — no UPDATE operations permitted after creation.
  //
  // v2 changes:
  //   - signatureAuthEventId now v.id("signatureAuthEvents") (REG-005)
  //   - iaCurrentOnInspectionDate added (Marcus 4.4 — IA currency snapshot)
  //   - notes field added (REG-008 / Marcus 2.2)
  //   - by_aircraft_date index added (NB-01 / Cilla 6.2)
  //
  // INVARIANT [inspectionRecord.close — REG-008]:
  //   If adComplianceReviewed == true and adComplianceReferenceIds is empty,
  //   notes must be non-empty documenting why no ADs were found applicable.
  // ═══════════════════════════════════════════════════════════════════════════
  inspectionRecords: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),

    inspectionType: v.union(
      v.literal("annual"),
      v.literal("100_hour"),
      v.literal("progressive"),
      v.literal("continuous_airworthiness"),
      v.literal("pre_purchase"),
      v.literal("condition_inspection"),
    ),

    inspectionDate: v.number(),

    // Aircraft identification — denormalized at signing (snapshot)
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    aircraftSerialNumber: v.string(),
    aircraftRegistration: v.string(),

    // Time in service at inspection per 14 CFR 43.11(a)(2)
    totalTimeAirframeHours: v.number(),
    // INVARIANT: must match workOrder.aircraftTotalTimeAtClose (Cilla 3.3)
    totalTimeEngine1Hours: v.optional(v.number()),
    totalTimeEngine2Hours: v.optional(v.number()),
    totalTimePropellerHours: v.optional(v.number()),

    scopeDescription: v.string(),

    airworthinessDetermination: v.union(
      v.literal("returned_to_service"),
      v.literal("not_returned_discrepancies"),
    ),

    discrepancyIds: v.array(v.id("discrepancies")),

    notes: v.optional(v.string()), // v2 (Marcus 2.2 / REG-008)

    // IA sign-off (annual inspections require IA per 14 CFR 65.91)
    iaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),       // Snapshot at signing

    // v2: iaCurrentOnInspectionDate (Marcus 4.4)
    // Computed at signing time; written once; immutable.
    // If false, inspection was signed by an expired IA.
    iaCurrentOnInspectionDate: v.boolean(),

    iaSignatureTimestamp: v.number(),
    iaSignatureHash: v.string(),
    iaSignatureAuthEventId: v.id("signatureAuthEvents"), // v2 typed FK (REG-005)

    // Discrepancy list per 14 CFR 43.11(b)
    discrepancyListIssuedToOwner: v.optional(v.boolean()),
    discrepancyListIssuedAt: v.optional(v.number()),
    discrepancyListRecipient: v.optional(v.string()),

    // AD compliance review
    adComplianceReviewed: v.boolean(),
    adComplianceReferenceIds: v.array(v.id("adCompliance")),
    // INVARIANT [REG-008]: If adComplianceReviewed == true and refs array is empty,
    // notes must document why no ADs were found applicable.

    nextInspectionDueDate: v.optional(v.number()),
    nextInspectionDueHours: v.optional(v.number()),

    sequenceNumber: v.number(),

    createdAt: v.number(),
    // NOTE: Immutable — no updatedAt.
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_type_date", ["aircraftId", "inspectionType", "inspectionDate"])
    .index("by_organization", ["organizationId"])
    .index("by_aircraft_date", ["aircraftId", "inspectionDate"]), // v2 NB-01

  // ═══════════════════════════════════════════════════════════════════════════
  // AIRWORTHINESS DIRECTIVES  (global — not org-scoped)
  //
  // ADs are FAA issuances that apply worldwide. All organizations read from
  // this shared table. No org-scoping on the AD reference itself — only on
  // adCompliance records (which are org-scoped).
  // ═══════════════════════════════════════════════════════════════════════════
  airworthinessDirectives: defineTable({
    adNumber: v.string(),          // e.g., "2024-15-07"
    title: v.string(),
    effectiveDate: v.number(),
    docketNumber: v.optional(v.string()),

    applicabilityText: v.string(),
    applicabilityStructured: v.optional(
      v.object({
        makes: v.array(v.string()),
        models: v.array(v.string()),
        serialRangeStart: v.optional(v.string()),
        serialRangeEnd: v.optional(v.string()),
        partNumbers: v.array(v.string()),
        notes: v.optional(v.string()),
      }),
    ),

    adType: v.union(
      v.literal("one_time"),
      v.literal("recurring"),
      v.literal("terminating_action"),
    ),

    emergencyAd: v.boolean(),

    complianceMethodDescription: v.string(),
    complianceType: v.union(
      v.literal("calendar"),
      v.literal("hours"),
      v.literal("cycles"),
      v.literal("calendar_or_hours"),
      v.literal("calendar_or_cycles"),
      v.literal("hours_or_cycles"),
      v.literal("one_time"),
      v.literal("other"),
    ),

    initialComplianceHours: v.optional(v.number()),
    initialComplianceDays: v.optional(v.number()),

    recurringIntervalHours: v.optional(v.number()),
    recurringIntervalDays: v.optional(v.number()),
    recurringIntervalCycles: v.optional(v.number()),

    supersededByAdId: v.optional(v.id("airworthinessDirectives")),
    supersedesAdId: v.optional(v.id("airworthinessDirectives")),

    sourceUrl: v.optional(v.string()),

    addedByUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ad_number", ["adNumber"])
    .index("by_effective_date", ["effectiveDate"])
    .index("by_type", ["adType"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AD COMPLIANCE  (aircraft/engine/part-scoped — permanent record)
  //
  // v2 additions:
  //   - by_engine and by_part indexes (Marcus 2.1.2 / NB-01)
  //   - Orphan invariant documented (REG-003)
  //   - Applicability determination fields invariant (Cilla 4.5)
  //   - by_org_next_due_date index (Cilla 6.1 / NB-01)
  //
  // INVARIANT [adCompliance.create — INV-03]:
  //   At least one of aircraftId, engineId, or partId must be set.
  //   All three null = orphaned record (never appears in any compliance review).
  //
  // INVARIANT [adCompliance.setApplicability — Cilla 4.5]:
  //   When applicable is set to true or false, applicabilityDeterminedById and
  //   applicabilityDeterminationDate must both be set.
  //
  // INVARIANT [adCompliance.addEntry — Cilla 3.4]:
  //   New complianceHistory entries must have complianceDate >= last entry date.
  //   Backdated entries are rejected.
  // ═══════════════════════════════════════════════════════════════════════════
  adCompliance: defineTable({
    adId: v.id("airworthinessDirectives"),

    // At least one must be set (INV-03)
    aircraftId: v.optional(v.id("aircraft")),
    engineId: v.optional(v.id("engines")),
    partId: v.optional(v.id("parts")),

    organizationId: v.id("organizations"),

    applicable: v.boolean(),
    applicabilityDeterminationNotes: v.optional(v.string()),
    applicabilityDeterminedById: v.optional(v.id("technicians")),
    applicabilityDeterminationDate: v.optional(v.number()),

    complianceStatus: v.union(
      v.literal("not_complied"),
      v.literal("complied_one_time"),
      v.literal("complied_recurring"),
      v.literal("not_applicable"),
      v.literal("superseded"),
      v.literal("pending_determination"),
    ),

    // Append-only compliance history
    complianceHistory: v.array(
      v.object({
        complianceDate: v.number(),
        aircraftHoursAtCompliance: v.number(),
        aircraftCyclesAtCompliance: v.optional(v.number()),
        technicianId: v.id("technicians"),
        maintenanceRecordId: v.id("maintenanceRecords"),
        complianceMethodUsed: v.string(),
        notes: v.optional(v.string()),
      }),
    ),

    // Denormalized snapshot for query performance
    lastComplianceDate: v.optional(v.number()),
    lastComplianceHours: v.optional(v.number()),
    lastComplianceCycles: v.optional(v.number()),

    // Next due (computed and cached; recomputed when compliance history changes)
    nextDueDate: v.optional(v.number()),
    nextDueHours: v.optional(v.number()),
    nextDueCycles: v.optional(v.number()),

    maintenanceRecordIds: v.array(v.id("maintenanceRecords")),

    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ad_aircraft", ["adId", "aircraftId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_engine", ["engineId"])                              // v2 NB-01
    .index("by_part", ["partId"])                                  // v2 NB-01
    .index("by_ad", ["adId"])
    .index("by_status", ["organizationId", "complianceStatus"])
    .index("by_next_due_date", ["nextDueDate"])
    .index("by_org_next_due_date", ["organizationId", "nextDueDate"]), // v2 NB-01

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTS / INVENTORY
  //
  // INVARIANT [part.create / part.update — INV-11]:
  //   If isLifeLimited == true, at least one of lifeLimitHours or lifeLimitCycles
  //   must be set. A life-limited part with no defined limit is a compliance gap.
  //
  // INVARIANT [part.create / part.update — INV-12]:
  //   If hasShelfLifeLimit == true, shelfLifeLimitDate must be set.
  //
  // INVARIANT [part.install — INV-07]:
  //   Before location → "installed":
  //     1. OSP parts (isOwnerSupplied == true) require eightOneThirtyId (14 CFR 145.201)
  //     2. currentAircraftId or currentEngineId must be set — not both, not neither
  //     3. Part must not be in quarantine or scrapped condition
  //
  // INVARIANT [part.remove — Cilla 3.5]:
  //   When location changes away from "installed":
  //     currentAircraftId and currentEngineId must both be cleared.
  // ═══════════════════════════════════════════════════════════════════════════
  parts: defineTable({
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),

    serialNumber: v.optional(v.string()),
    isSerialized: v.boolean(),

    isLifeLimited: v.boolean(),
    lifeLimitHours: v.optional(v.number()),    // INV-11
    lifeLimitCycles: v.optional(v.number()),   // INV-11

    hasShelfLifeLimit: v.boolean(),
    shelfLifeLimitDate: v.optional(v.number()), // INV-12

    hoursAccumulatedBeforeInstall: v.optional(v.number()),
    cyclesAccumulatedBeforeInstall: v.optional(v.number()),

    condition: partCondition,

    location: v.union(
      v.literal("inventory"),
      v.literal("installed"),
      v.literal("removed_pending_disposition"),
      v.literal("quarantine"),
      v.literal("scrapped"),
      v.literal("returned_to_vendor"),
    ),

    currentAircraftId: v.optional(v.id("aircraft")),
    currentEngineId: v.optional(v.id("engines")),
    installPosition: v.optional(v.string()),
    installedAt: v.optional(v.number()),
    installedByWorkOrderId: v.optional(v.id("workOrders")),
    hoursAtInstallation: v.optional(v.number()),
    cyclesAtInstallation: v.optional(v.number()),

    removedAt: v.optional(v.number()),
    removedByWorkOrderId: v.optional(v.id("workOrders")),

    organizationId: v.id("organizations"),
    receivingDate: v.optional(v.number()),
    receivingWorkOrderId: v.optional(v.id("workOrders")),
    supplier: v.optional(v.string()),
    purchaseOrderNumber: v.optional(v.string()),
    isOwnerSupplied: v.boolean(),

    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),

    quarantineReason: v.optional(v.string()),
    quarantineCreatedById: v.optional(v.id("technicians")),
    quarantineCreatedAt: v.optional(v.number()),

    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_part_number", ["partNumber"])
    .index("by_serial", ["partNumber", "serialNumber"])
    .index("by_aircraft", ["currentAircraftId"])
    .index("by_condition", ["organizationId", "condition"])
    .index("by_location", ["organizationId", "location"])
    .index("by_shelf_life", ["hasShelfLifeLimit", "shelfLifeLimitDate"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // 8130-3 RECORDS  (FAA Airworthiness Approval Tag)
  //
  // v2: Added suspectStatus enum (Cilla 7.3)
  //
  // INVARIANT [eightOneThirty.suspect]:
  //   When isSuspect → true, suspectStatus must be set to "under_investigation".
  // ═══════════════════════════════════════════════════════════════════════════
  eightOneThirtyRecords: defineTable({
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),

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
    // INVARIANT: quantity >= 1.
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

    receivedByOrganizationId: v.id("organizations"),
    receivedDate: v.number(),
    verifiedByUserId: v.optional(v.string()),
    verificationNotes: v.optional(v.string()),

    isSuspect: v.boolean(),
    suspectReason: v.optional(v.string()),
    suspectStatus: v.optional( // v2 (Cilla 7.3)
      v.union(
        v.literal("under_investigation"),
        v.literal("reported_to_faa"),
        v.literal("cleared"),
        v.literal("confirmed_unapproved"),
      ),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_tracking_number", ["formTrackingNumber"])
    .index("by_part_number", ["partNumber"])
    .index("by_part", ["partId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN TO SERVICE
  //
  // IMMUTABLE — no UPDATE operations permitted after creation.
  //
  // v2 changes:
  //   - signatureAuthEventId now v.id("signatureAuthEvents") (REG-005)
  //   - iaCurrentOnRtsDate added (IA currency snapshot at signing time)
  //
  // INVARIANT [returnToService.create]:
  //   aircraftHoursAtRts must equal workOrder.aircraftTotalTimeAtClose.
  //   Source is the work order — not independent user input. (Cilla 3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  returnToService: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),

    inspectionRecordId: v.optional(v.id("inspectionRecords")),

    signedByIaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),          // Snapshot at signing
    iaRepairStationCert: v.optional(v.string()),
    iaAuthorizedWorkScope: v.optional(v.string()),
    iaCurrentOnRtsDate: v.boolean(),           // IA currency verified at signing

    returnToServiceDate: v.number(),
    returnToServiceStatement: v.string(),      // NOT optional
    aircraftHoursAtRts: v.number(),
    // INVARIANT: must equal workOrder.aircraftTotalTimeAtClose.

    limitations: v.optional(v.string()),

    signatureHash: v.string(),
    signatureTimestamp: v.number(),
    signatureAuthEventId: v.id("signatureAuthEvents"), // v2 typed FK (REG-005)

    createdAt: v.number(),
    // NOTE: Immutable — no updatedAt.
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_organization", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS  (Aircraft owners / operators)
  //
  // v2: aircraftIds array removed (resolves QA-005).
  //     Aircraft now carry customerId. Query aircraft by customer via aircraft.by_customer.
  //     This eliminates the write-conflict hotspot when multiple aircraft for the same
  //     customer arrive concurrently.
  // ═══════════════════════════════════════════════════════════════════════════
  customers: defineTable({
    organizationId: v.id("organizations"),

    name: v.string(),
    companyName: v.optional(v.string()),
    customerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("charter_operator"),
      v.literal("flight_school"),
      v.literal("government"),
    ),

    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),

    // v2: aircraftIds removed (QA-005). Query: aircraft.by_customer(customerId)
    notes: v.optional(v.string()),

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_name", ["organizationId", "name"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  //
  // Append-only. Never deleted. Captures all write events.
  //
  // v2 additions:
  //   - organizationId is required for regulated event types (Marcus 1.1.1)
  //   - by_technician index (Marcus 1.1.3)
  //   - by_org_event_type index (Cilla 6.3 / NB-01)
  //
  // INVARIANT [auditLog.write]:
  //   For event types record_signed, correction_created, technician_signed,
  //   record_viewed, record_exported: organizationId must be set.
  //   System-level events may have null organizationId.
  //   The audit log write helper enforces this by event type.
  //
  // Every mutation that writes to this table must be called within the same
  // Convex transaction as the primary mutation. If the audit write fails,
  // the entire mutation fails. This is the Convex atomicity guarantee.
  // ═══════════════════════════════════════════════════════════════════════════
  auditLog: defineTable({
    organizationId: v.optional(v.id("organizations")),
    // INVARIANT: Required for regulated events (see above).

    eventType: v.union(
      v.literal("record_created"),
      v.literal("record_updated"),
      v.literal("record_signed"),
      v.literal("record_viewed"),
      v.literal("record_exported"),
      v.literal("correction_created"),
      v.literal("status_changed"),
      v.literal("part_installed"),
      v.literal("part_removed"),
      v.literal("aircraft_received"),
      v.literal("aircraft_returned"),
      v.literal("ad_compliance_updated"),
      v.literal("technician_signed"),
      v.literal("access_denied"),
      v.literal("system_event"),
    ),

    tableName: v.string(),
    recordId: v.string(),

    userId: v.optional(v.string()),           // Clerk user ID
    technicianId: v.optional(v.id("technicians")),

    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.string()),  // JSON stringified
    newValue: v.optional(v.string()),  // JSON stringified

    notes: v.optional(v.string()),

    timestamp: v.number(),
  })
    .index("by_record", ["tableName", "recordId"])
    .index("by_organization", ["organizationId", "timestamp"])
    .index("by_user", ["userId", "timestamp"])
    .index("by_technician", ["technicianId", "timestamp"])              // v2 Marcus 1.1.3
    .index("by_event_type", ["eventType", "timestamp"])
    .index("by_org_event_type", ["organizationId", "eventType", "timestamp"]) // v2 Cilla 6.3
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PART INSTALLATION HISTORY
  // Tracks full history of a part's installation and removal cycles.
  // Append-only — no updates after creation.
  // ═══════════════════════════════════════════════════════════════════════════
  partInstallationHistory: defineTable({
    partId: v.id("parts"),
    aircraftId: v.id("aircraft"),
    engineId: v.optional(v.id("engines")),
    organizationId: v.id("organizations"),

    position: v.optional(v.string()),

    installedAt: v.number(),
    installedByWorkOrderId: v.id("workOrders"),
    installedByTechnicianId: v.id("technicians"),
    aircraftHoursAtInstall: v.number(),
    aircraftCyclesAtInstall: v.optional(v.number()),

    removedAt: v.optional(v.number()),
    removedByWorkOrderId: v.optional(v.id("workOrders")),
    removedByTechnicianId: v.optional(v.id("technicians")),
    aircraftHoursAtRemoval: v.optional(v.number()),
    aircraftCyclesAtRemoval: v.optional(v.number()),
    removalReason: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_part", ["partId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_work_order_install", ["installedByWorkOrderId"])
    .index("by_work_order_removal", ["removedByWorkOrderId"]),
});
