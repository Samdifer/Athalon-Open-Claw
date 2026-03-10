// convex/schema.ts
// Athelon — Aviation MRO SaaS Platform
//
// Primary schema author:       Devraj Anand (Backend, Convex)
// Architecture:                Rafael Mendoza
// Regulatory Review:           Marcus Webb, Capt. Rosa Eaton
// QA Review:                   Cilla Oduya
// Schema Version:              3 (Phase 5 MVP pre-build schema additions — 2026-02-22)
// Phase 5 Implementation:      Devraj Anand
//
// SOURCE OF TRUTH: This file supersedes convex-schema-v2.md as of Schema v3 freeze.
// v3 is the schema all Phase 5 MVP mutations must be implemented against.
//
// v2 baseline: convex-schema-v2.md (FROZEN 2026-02-22)
// v3 additions: phase-5-implementation/convex/schema-v3-change-log.md
//
// Four schema additions were required before MVP build could start. Each was surfaced
// during Phase 5 repair station interviews and reviewed by Marcus Webb (regulatory)
// and Cilla Oduya (QA) before being included here. See schema-v3-change-log.md for
// the full rationale, Marcus's sign-off notes, and Cilla's test impact analysis.
//
// ADDITIONS IN v3:
//   1. testEquipment table          — Dale Purcell (Avionics), REQ-DP-01/DP-02
//   2. pending_inspection location  — Teresa Varga (Parts Manager), REQ-TV-02
//   3. qcmReviews table             — Linda Paredes (QCM), REQ-LP-05
//   4. engines cycle + LLP fields   — Erik Holmberg + Rosario Tafoya, REQ-EH-01/RT-01
//   (5. customerFacingStatus field  — Danny Osei (WO Coordinator), REQ-DO-02, v1.1 readiness)
//
// UNCHANGED FROM v2:
//   - All table structures, invariants, and indexes from v2 are preserved exactly.
//   - Immutability of maintenanceRecords, inspectionRecords, returnToService, auditLog.
//   - All signatureAuthEvent consumption mechanics (INV-05).
//   - All 20 invariants from v2 remain in force.
//
// DO NOT modify this file without a corresponding update to the schema change log
// and explicit sign-off from Marcus Webb (regulatory) and Cilla Oduya (QA).
// See phase-1-data-model/schema-freeze-notice.md for the full change request process.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  accessAuthorizationArrayValidator,
  mroRoleValidator,
} from "./lib/mroAccessValidators";

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
  v.literal("replaced"),                          // v5: GAP-06
  v.literal("overhauled"),                        // v5: GAP-06
  v.literal("serviceable_as_is"),                 // v5: GAP-06
  v.literal("deferred_mel"),
  v.literal("deferred_grounded"),
  v.literal("deferred_customer_declined"),        // v5: GAP-10
  v.literal("deferred_next_inspection"),          // v5: GAP-06
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

/**
 * Test equipment reference embedded in maintenance records.
 *
 * v3 addition — Dale Purcell (Avionics), REQ-DP-01.
 *
 * Test equipment used during IFR return-to-service work must be traceable on each
 * maintenance record. Calibration data is snapshotted at signing time because the
 * calibration status of the equipment may change after the record is created and
 * the record is immutable. An FAA inspector reviewing IFR records will ask:
 *   "What equipment was used? Was it in calibration when used?"
 * Both answers must be answerable directly from the maintenance record without
 * reference to an external spreadsheet.
 *
 * testEquipmentId is optional to support records where the equipment was entered
 * manually and does not correspond to a library record. This handles:
 *   1. External test equipment temporarily brought in
 *   2. Historical data entry from paper records
 *   3. Equipment not yet added to the testEquipment library
 *
 * INVARIANT [maintenanceRecord.create]:
 *   If testEquipmentId is set, the snapshot fields (partNumber, serialNumber,
 *   calibrationCertNumber, calibrationExpiryDate) must match the referenced
 *   testEquipment record at the time of signing. Mutation enforces this.
 *   calibrationCurrentAtUse must be computed by the mutation as:
 *     calibrationExpiryDate > signatureTimestamp
 */
const embeddedTestEquipmentRef = v.object({
  testEquipmentId: v.optional(v.id("testEquipment")), // FK to library — optional; see above
  partNumber: v.string(),             // Equipment P/N — snapshot at signing
  serialNumber: v.string(),           // Equipment S/N — snapshot at signing
  equipmentName: v.string(),          // Display name — snapshot at signing
  calibrationCertNumber: v.string(),  // Cal cert# — snapshot at signing
  calibrationExpiryDate: v.number(),  // Cal expiry — snapshot at signing (Unix ms)
  calibrationCurrentAtUse: v.boolean(), // Was calibration current at time of signing?
  // INVARIANT: calibrationCurrentAtUse = (calibrationExpiryDate > signatureTimestamp)
  //   Computed in mutation; not user-settable.
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
    clerkOrganizationId: v.optional(v.string()),
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

    // v12: Airport association — FAA NFDC reference data linkage
    homeAirportFaaLocId: v.optional(v.string()),  // FAA Location Identifier (e.g. "DEN")
    homeAirportIcao: v.optional(v.string()),       // ICAO code (e.g. "KDEN")
    homeAirportName: v.optional(v.string()),        // Denormalized display name

    subscriptionTier: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise"),
    ),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_part145_cert", ["part145CertificateNumber"])
    .index("by_clerk_organization", ["clerkOrganizationId"]),

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

    // Hobbs meter tracking (separate from logbook TTAF on some aircraft types)
    hobbsReading: v.optional(v.number()),
    hobbsAsOfDate: v.optional(v.number()), // Unix timestamp

    // Landing cycle tracking (critical for airframe life-limited parts)
    totalLandingCycles: v.optional(v.number()),
    totalLandingCyclesAsOfDate: v.optional(v.number()), // Unix timestamp

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

    // CAMP linkage metadata (org-scoped mapping to external CAMP aircraft identity)
    campAircraftId: v.optional(v.string()),
    campTailNumber: v.optional(v.string()),
    campStatus: v.optional(
      v.union(
        v.literal("linked"),
        v.literal("unlinked"),
        v.literal("conflict"),
        v.literal("stale"),
      ),
    ),
    campLastSyncAt: v.optional(v.number()),
    campSyncHealth: v.optional(
      v.union(
        v.literal("healthy"),
        v.literal("degraded"),
        v.literal("failed"),
        v.literal("unknown"),
      ),
    ),
    campLinkageConfidence: v.optional(v.number()), // 0..1
    campLinkageMethod: v.optional(
      v.union(v.literal("manual"), v.literal("import"), v.literal("api")),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
    createdByOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_serial", ["make", "model", "serialNumber"])
    .index("by_registration", ["currentRegistration"])
    .index("by_organization", ["operatingOrganizationId"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_camp_aircraft_id", ["campAircraftId"])
    .index("by_org_camp_aircraft_id", ["operatingOrganizationId", "campAircraftId"])
    .index("by_org_camp_tail", ["operatingOrganizationId", "campTailNumber"]), // v2: supports customer fleet queries

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

  // Append-only CAMP linkage audit trail (before/after snapshots + actor).
  campLinkAudit: defineTable({
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    action: v.union(v.literal("link"), v.literal("unlink"), v.literal("relink"), v.literal("sync_update")),
    actorUserId: v.string(),
    linkageMethod: v.union(v.literal("manual"), v.literal("import"), v.literal("api")),
    before: v.optional(v.object({
      campAircraftId: v.optional(v.string()),
      campTailNumber: v.optional(v.string()),
      campStatus: v.optional(v.string()),
      campLastSyncAt: v.optional(v.number()),
      campSyncHealth: v.optional(v.string()),
      campLinkageConfidence: v.optional(v.number()),
      campLinkageMethod: v.optional(v.string()),
    })),
    after: v.optional(v.object({
      campAircraftId: v.optional(v.string()),
      campTailNumber: v.optional(v.string()),
      campStatus: v.optional(v.string()),
      campLastSyncAt: v.optional(v.number()),
      campSyncHealth: v.optional(v.string()),
      campLinkageConfidence: v.optional(v.number()),
      campLinkageMethod: v.optional(v.string()),
    })),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_org_aircraft", ["organizationId", "aircraftId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINES
  //
  // v3 additions (REQ-EH-01, REQ-RT-01, REQ-RT-02 — Erik Holmberg, Rosario Tafoya):
  //   - totalCycles, totalCyclesAsOfDate — independent cycle tracking per engine S/N
  //   - cyclesSinceOverhaul — cycles analog of timeSinceOverhaulHours
  //   - cycleBetweenOverhaulLimit — manufacturer cycles-based TBO (CBS limit)
  //   - llpPackageReviewDate, llpPackageReviewedByTechnicianId, llpPackageReviewNotes
  //     — LLP package formal review snapshot
  //   - by_organization index — supports fleet-level LLP dashboard queries
  //
  // WHY ADDED (v3):
  //   Both Erik Holmberg (powerplant mechanic) and Rosario Tafoya (powerplant lead)
  //   independently described the same gap in Phase 5 interviews: engine life is
  //   tracked in cycles for every turbine engine and for piston-engine LLPs such as
  //   crankshaft, camshaft, and connecting rod assemblies. The existing engines table
  //   tracked hours only (totalTimeHours, timeSinceOverhaulHours) with no cycle analog.
  //   Without engine-level cycle tracking, the system cannot:
  //     1. Enforce monotonic LLP cycle accumulation per engine S/N (INV — v3)
  //     2. Compute LLP remaining cycles (lifeLimitCycles - cyclesAccumulated)
  //     3. Surface LLP approaching-limit warnings in the close readiness report
  //   LLPs themselves are tracked as parts (parts.isLifeLimited == true,
  //   parts.currentEngineId == this engine). The cycle fields added here provide
  //   the engine-level reference against which LLP cycle limits are enforced.
  //
  // INVARIANT [engine.status]:
  //   If status == "installed", currentAircraftId must be set.
  //   The install mutation enforces this.
  //
  // INVARIANT [engine.updateCycles — v3 INV-21]:
  //   totalCycles is monotonically increasing per engine S/N.
  //   Any write where the incoming value < current totalCycles must throw.
  //   This invariant mirrors INV-18 (airframe TT). Decreasing cycle count
  //   is a falsification flag. Mutation: updateEngineCycles.
  // ═══════════════════════════════════════════════════════════════════════════
  engines: defineTable({
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),

    currentAircraftId: v.optional(v.id("aircraft")),
    position: v.optional(v.string()), // "L", "R", "C", "1", "2", etc.

    // Hours tracking
    // INVARIANT: All hours fields must be >= 0.
    totalTimeHours: v.number(),
    totalTimeAsOfDate: v.number(),
    timeSinceOverhaulHours: v.optional(v.number()),
    timeSinceNewHours: v.number(),
    timeBetweenOverhaulLimit: v.optional(v.number()), // Manufacturer TBO in hours

    // v3: Cycle tracking — REQ-EH-01, REQ-RT-01 (Erik Holmberg, Rosario Tafoya)
    // Required for turbine engines and piston-engine LLP compliance.
    // INVARIANT [INV-21]: totalCycles is monotonically increasing. See above.
    totalCycles: v.optional(v.number()),
    totalCyclesAsOfDate: v.optional(v.number()), // Unix timestamp of last cycle update

    // v3: Cycles-based overhaul tracking (separate from hour-based TBO)
    cyclesSinceOverhaul: v.optional(v.number()),
    cycleBetweenOverhaulLimit: v.optional(v.number()), // Manufacturer cycles-based TBO (CBS)

    // Overhaul history — hours-based
    lastOverhaulDate: v.optional(v.number()),
    lastOverhaulFacility: v.optional(v.string()),
    lastOverhaulEightOneThirtyReference: v.optional(v.string()),

    // v3: LLP package review snapshot
    // LLPs are tracked as individual parts with parts.currentEngineId == this engine.
    // These fields record when the full LLP package was last formally reviewed by
    // a technician (typically at engine induction or at TBO). The LLP dashboard
    // query joins this engine record with all parts where currentEngineId == _id
    // and isLifeLimited == true.
    llpPackageReviewDate: v.optional(v.number()),
    llpPackageReviewedByTechnicianId: v.optional(v.id("technicians")),
    llpPackageReviewNotes: v.optional(v.string()),

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
    .index("by_status", ["status"])
    .index("by_organization", ["organizationId"]), // v3: fleet-level LLP dashboard

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPELLERS
  // Tracks propellers mounted to aircraft. Up to 2 per aircraft for twins.
  // Referenced in work order cover page snapshots (OP-1003 fields).
  // ═══════════════════════════════════════════════════════════════════════════
  propellers: defineTable({
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    position: v.union(
      v.literal("single"),
      v.literal("left"),
      v.literal("right"),
      v.literal("rear"),
      v.literal("forward"),
    ),
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),
    totalTimeHours: v.optional(v.number()),
    totalTimeAsOfDate: v.optional(v.number()),
    timeSinceOverhaulHours: v.optional(v.number()),
    lastOverhaulDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_organization", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST EQUIPMENT
  //
  // v3 addition — Dale Purcell (Avionics), REQ-DP-01 / REQ-DP-02.
  //
  // WHY ADDED (v3):
  //   Dale Purcell's requirement was the single most surprising gap surfaced in
  //   Phase 5 interviews (see requirements-synthesis.md "The One Surprise" section).
  //   Test equipment calibration traceability is invisible from the regulatory text
  //   (14 CFR Part 43 does not explicitly mandate it) but is a routine FAA
  //   surveillance focus for avionics and IFR return-to-service work. An FAA
  //   inspector conducting a focused surveillance inspection of IFR maintenance
  //   records will ask: "What equipment was used? Was it in calibration?" If the
  //   answer requires a spreadsheet lookup, the shop is out of compliance with its
  //   own Repair Station Manual (which universally requires calibration traceability).
  //
  //   This table is the equipment LIBRARY. Individual maintenance records reference
  //   equipment from this library via the embeddedTestEquipmentRef validator
  //   (maintenanceRecords.testEquipmentUsed). The snapshot pattern used for signing
  //   technician identity is also used here: calibration data is snapshotted at
  //   maintenance record creation time so that future recalibration or equipment
  //   retirement does not alter the historical record.
  //
  //   Calibration warnings (REQ-DP-03) are a mutation-layer concern: when a technician
  //   adds test equipment to a maintenance record, the mutation computes
  //   calibrationCurrentAtUse = (calibrationExpiryDate > now()) and populates the
  //   snapshot field. The mutation does NOT hard-block on expired calibration for
  //   alpha (this is a warning, not a gate, per Dale's specification and Marcus's
  //   sign-off below). That determination may be revisited in v1.1.
  //
  // INVARIANT [testEquipment.calibration — v3 INV-22]:
  //   calibrationExpiryDate must be > calibrationDate.
  //   The create/update mutation enforces this. A cert that expires before it was
  //   issued is a data entry error.
  //
  // INVARIANT [testEquipment.status]:
  //   status == "current" requires calibrationExpiryDate > now().
  //   The updateCalibration mutation must set status = "expired" when
  //   calibrationExpiryDate <= now(). A background job (Convex scheduled function)
  //   should run nightly to flip expired records. Do not rely solely on the job;
  //   the mutation must also check on each write.
  // ═══════════════════════════════════════════════════════════════════════════
  testEquipment: defineTable({
    organizationId: v.id("organizations"),

    // Equipment identity
    partNumber: v.string(),     // Manufacturer part number
    serialNumber: v.string(),   // Serial number — required; test equipment is always serialized
    // INVARIANT: serialNumber must be non-empty. Test equipment with no S/N cannot be
    // traced. If no manufacturer S/N exists, assign an internal tracking number.
    equipmentName: v.string(),
    manufacturer: v.optional(v.string()),

    // Equipment classification
    equipmentType: v.union(
      v.literal("multimeter"),              // Electrical measurement
      v.literal("oscilloscope"),            // Waveform analysis
      v.literal("pitot_static_tester"),     // Altimetry/airspeed systems
      v.literal("altimeter_tester"),        // Altimeter bench test
      v.literal("transponder_tester"),      // ATC transponder certification
      v.literal("nav_com_tester"),          // NAV/COM radio bench test
      v.literal("torque_wrench"),           // Calibrated torque tool
      v.literal("borescope"),              // Internal inspection optics
      v.literal("rigging_tool"),            // Flight control rigging
      v.literal("pressure_gauge"),          // Hydraulic/pneumatic pressure
      v.literal("fuel_flow_tester"),        // Fuel system bench test
      v.literal("insulation_tester"),       // Wire insulation resistance
      v.literal("timing_light"),            // Ignition timing
      v.literal("compression_tester"),      // Cylinder differential compression
      v.literal("prop_balance_analyzer"),   // Propeller dynamic balance
      v.literal("other"),                   // Catch-all — equipmentName must be descriptive
    ),

    // Calibration traceability — core purpose of this table (REQ-DP-01)
    // All fields below are required for the equipment to be usable in maintenance records.
    calibrationCertNumber: v.string(),    // Certificate number issued by calibration lab
    calibrationDate: v.number(),          // Date calibration was performed (Unix ms)
    calibrationExpiryDate: v.number(),    // Date calibration expires (Unix ms)
    // INVARIANT [INV-22]: calibrationExpiryDate > calibrationDate.
    calibrationPerformedBy: v.optional(v.string()), // Calibration lab name
    calibrationCertDocumentUrl: v.optional(v.string()), // Link to cert PDF

    // Current status — maintained by mutations and nightly background job
    status: v.union(
      v.literal("current"),              // In calibration; available for use in records
      v.literal("expired"),             // Past calibration expiry; generates warning if used
      v.literal("out_for_calibration"), // Sent to lab; temporarily unavailable
      v.literal("removed_from_service"), // Retired; cannot be referenced in new records
      v.literal("quarantine"),          // Under investigation; cannot be used
    ),

    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_serial", ["partNumber", "serialNumber"])
    .index("by_cal_expiry", ["calibrationExpiryDate"])
    .index("by_status", ["organizationId", "status"])
    .index("by_org_cal_expiry", ["organizationId", "calibrationExpiryDate"]), // for expiry dashboard

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
    primaryShopLocationId: v.optional(v.id("shopLocations")),
    rosterTeamId: v.optional(v.id("rosterTeams")),

    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("terminated"),
    ),

    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    // MRO role for RBAC — see lib/roles.ts
    role: v.optional(mroRoleValidator),
    accessAuthorizations: v.optional(accessAuthorizationArrayValidator),

    // v3: PIN hash for signature re-authentication (TD: PIN security)
    // Stored as SHA-256 hex digest. Set via setPin mutation.
    // When set, createSignatureAuthEvent verifies the PIN against this hash.
    pinHash: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_org_location", ["organizationId", "primaryShopLocationId"])
    .index("by_org_roster_team", ["organizationId", "rosterTeamId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICIAN SHIFTS
  //
  // Per-technician shift patterns used for capacity calculation.
  // Phase 2 of scheduling feature.
  //
  // effectiveTo: undefined = currently active shift
  // daysOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // efficiencyMultiplier: 1.0 = standard, 1.2 = 20% faster, 0.8 = 20% slower
  // ═══════════════════════════════════════════════════════════════════════════
  technicianShifts: defineTable({
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    daysOfWeek: v.array(v.number()),
    startHour: v.number(),
    endHour: v.number(),
    efficiencyMultiplier: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdByUserId: v.string(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "effectiveTo"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULING SETTINGS (per organization)
  //
  // Shop-level defaults for capacity calculation.
  // Created on first access (upsert pattern in mutation).
  // ═══════════════════════════════════════════════════════════════════════════
  schedulingSettings: defineTable({
    organizationId: v.id("organizations"),
    capacityBufferPercent: v.number(),
    defaultShiftDays: v.array(v.number()),
    defaultStartHour: v.number(),
    defaultEndHour: v.number(),
    defaultEfficiencyMultiplier: v.number(),
    // Station-config canonical scheduling preferences.
    timezone: v.optional(v.string()),
    operatingHours: v.optional(
      v.array(
        v.object({
          dayOfWeek: v.number(), // 0=Mon..6=Sun
          isOpen: v.boolean(),
          openTime: v.string(), // HH:mm
          closeTime: v.string(), // HH:mm
        }),
      ),
    ),
    rosterWorkspaceEnabled: v.optional(v.boolean()),
    rosterWorkspaceBootstrappedAt: v.optional(v.number()),
    updatedAt: v.number(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ROSTER SHIFTS (Scheduler roster workspace)
  //
  // Team-owned shift defaults for active roster visualization. Individual
  // technician overrides continue to use technicianShifts.
  // ═══════════════════════════════════════════════════════════════════════════
  rosterShifts: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    name: v.string(),
    daysOfWeek: v.array(v.number()), // 0=Sun..6=Sat
    startHour: v.number(),
    endHour: v.number(),
    efficiencyMultiplier: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_active", ["organizationId", "isActive"])
    .index("by_org_location_active", ["organizationId", "shopLocationId", "isActive"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ROSTER TEAMS (Scheduler roster workspace)
  //
  // First-class team model used by scheduler roster grouping, staffing
  // operations, and supervisory coverage analytics.
  // ═══════════════════════════════════════════════════════════════════════════
  rosterTeams: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    name: v.string(),
    colorToken: v.string(),
    shiftId: v.id("rosterShifts"),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_active", ["organizationId", "isActive"])
    .index("by_org_location_active", ["organizationId", "shopLocationId", "isActive"])
    .index("by_org_shift", ["organizationId", "shiftId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULING HOLIDAYS (Scheduler roster workspace)
  //
  // Explicit holiday observance model used by roster activity and capacity math.
  // dateKey uses YYYY-MM-DD in local shop context.
  // ═══════════════════════════════════════════════════════════════════════════
  schedulingHolidays: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    dateKey: v.string(),
    name: v.string(),
    isObserved: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_date", ["organizationId", "dateKey"])
    .index("by_org_location_date", ["organizationId", "shopLocationId", "dateKey"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // STATION SUPPORTED AIRCRAFT (Station Config source of truth)
  //
  // Per-location aircraft support matrix with optional bay compatibility.
  // If an organization has no rows for a location, the system falls back to
  // allow-all behavior with warning telemetry at mutation-layer guards.
  // ═══════════════════════════════════════════════════════════════════════════
  stationSupportedAircraft: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    category: v.union(
      v.literal("single-engine"),
      v.literal("multi-engine"),
      v.literal("turboprop"),
      v.literal("light-jet"),
      v.literal("midsize-jet"),
      v.literal("large-jet"),
      v.literal("helicopter"),
    ),
    compatibleBayIds: v.array(v.id("hangarBays")),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.string(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_location_make_model", ["organizationId", "shopLocationId", "make", "model"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WORK ORDER STAGE CONFIGS (Station Config source of truth)
  //
  // Variable-count stage model with explicit mapping to workOrders.status enum.
  // The execution engine remains enum-backed; this table drives presentation and
  // status-to-stage routing.
  // ═══════════════════════════════════════════════════════════════════════════
  workOrderStageConfigs: defineTable({
    organizationId: v.id("organizations"),
    stages: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        description: v.optional(v.string()),
        color: v.string(),
        sortOrder: v.number(),
        statusMappings: v.array(workOrderStatus),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.string(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // STATION TIMELINE CURSOR CONFIG (Station Config authoritative)
  //
  // Canonical cursor definitions used by scheduling/capacity timeline overlays.
  // planner planningScenarios.default row mirrors this config for compatibility.
  // ═══════════════════════════════════════════════════════════════════════════
  stationTimelineCursorConfig: defineTable({
    organizationId: v.id("organizations"),
    cursors: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        dayOffset: v.number(),
        colorClass: v.string(),
        enabled: v.boolean(),
      }),
    ),
    rangeStartDay: v.optional(v.number()),
    rangeEndDay: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.string(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE ASSIGNMENTS (Planner v2 foundation)
  //
  // Normalized schedule lane assignment for a work order. This extends the
  // lightweight start/end fields on workOrders with bay-level planning data and
  // optional per-day effort/non-work-day controls for advanced planner features.
  // ═══════════════════════════════════════════════════════════════════════════
  scheduleAssignments: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    sourceQuoteId: v.optional(v.id("quotes")),
    hangarBayId: v.id("hangarBays"),
    shopLocationId: v.optional(v.id("shopLocations")),
    startDate: v.number(),
    endDate: v.number(),

    // Optional day-level distribution model
    dailyEffort: v.optional(v.array(v.object({
      dayOffset: v.number(),
      effortHours: v.number(),
    }))),
    nonWorkDays: v.optional(v.array(v.number())), // day offsets from startDate
    isLocked: v.optional(v.boolean()),

    // Soft-archive support for planning lifecycle
    archivedAt: v.optional(v.number()),
    archivedByUserId: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_wo", ["organizationId", "workOrderId"])
    .index("by_org_quote", ["organizationId", "sourceQuoteId"])
    .index("by_org_bay", ["organizationId", "hangarBayId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_location_start", ["organizationId", "shopLocationId", "startDate"])
    .index("by_org_start", ["organizationId", "startDate"])
    .index("by_org_archived", ["organizationId", "archivedAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNING FINANCIAL SETTINGS (Planner v2 foundation)
  //
  // Stores assumptions used by schedule-aware planning math (capacity-driven
  // profitability and what-if analysis). Does not replace billing/invoice truth.
  // ═══════════════════════════════════════════════════════════════════════════
  planningFinancialSettings: defineTable({
    organizationId: v.id("organizations"),
    defaultShopRate: v.number(),
    defaultLaborCostRate: v.number(),
    monthlyFixedOverhead: v.number(),
    monthlyVariableOverhead: v.number(),
    annualCapexAssumption: v.number(),
    partMarkupTiers: v.array(v.object({
      maxLimit: v.number(),
      markupPercent: v.number(),
    })),
    serviceMarkupTiers: v.array(v.object({
      maxLimit: v.number(),
      markupPercent: v.number(),
    })),
    updatedAt: v.number(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNING SCENARIOS (Planner v2 foundation)
  //
  // User-defined timeline scenarios/cursors for what-if planning windows.
  // ═══════════════════════════════════════════════════════════════════════════
  planningScenarios: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    isDefault: v.boolean(),
    rangeStartDay: v.optional(v.number()),
    rangeEndDay: v.optional(v.number()),
    cursors: v.array(v.object({
      label: v.string(),
      dayOffset: v.number(),
      color: v.string(),
      enabled: v.boolean(),
    })),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.string(),
    updatedByUserId: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_default", ["organizationId", "isDefault"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANNING ARCHIVE (Planner v2 foundation)
  //
  // Archive/restore lifecycle for planning entities without mutating regulatory
  // source records.
  // ═══════════════════════════════════════════════════════════════════════════
  planningArchive: defineTable({
    organizationId: v.id("organizations"),
    entityType: v.union(
      v.literal("work_order"),
      v.literal("quote"),
      v.literal("schedule_assignment"),
    ),
    workOrderId: v.optional(v.id("workOrders")),
    quoteId: v.optional(v.id("quotes")),
    scheduleAssignmentId: v.optional(v.id("scheduleAssignments")),
    archivedPayloadJson: v.optional(v.string()),
    archivedAt: v.number(),
    archivedByUserId: v.string(),
    restoredAt: v.optional(v.number()),
    restoredByUserId: v.optional(v.string()),
    permanentlyDeletedAt: v.optional(v.number()),
    permanentlyDeletedByUserId: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_type", ["organizationId", "entityType"])
    .index("by_org_work_order", ["organizationId", "workOrderId"])
    .index("by_org_archived_at", ["organizationId", "archivedAt"]),

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
  // v3 additions:
  //   - customerFacingStatus field (REQ-DO-02 — Danny Osei, WO Coordinator)
  //     Optional enum, separate from internal workOrderStatus.
  //     Present now (v3) to avoid a breaking schema change when the customer
  //     portal is built in v1.1. The field has no mutation enforcement in alpha;
  //     the coordinator sets it manually. v1.1 portal will enforce transitions.
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
    shopLocationId: v.optional(v.id("shopLocations")),
    aircraftId: v.id("aircraft"),

    status: workOrderStatus,

    // v3: Customer-facing status — separate from internal lifecycle status
    // REQ-DO-02 (Danny Osei, WO Coordinator). Present for v1.1 customer portal readiness.
    // Optional in alpha; no alpha mutations enforce transitions on this field.
    customerFacingStatus: v.optional(
      v.union(
        v.literal("awaiting_arrival"),
        v.literal("received_inspection_pending"),
        v.literal("inspection_in_progress"),
        v.literal("discrepancy_authorization_required"),
        v.literal("awaiting_parts"),
        v.literal("work_in_progress"),
        v.literal("final_inspection_pending"),
        v.literal("ready_for_pickup"),
        v.literal("completed"),
      ),
    ),

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

    // v5: Induction (GAP-02)
    inductedAt: v.optional(v.number()),

    // v5: Release to customer (GAP-18 Phase 9)
    releasedAt: v.optional(v.number()),
    releasedByTechnicianId: v.optional(v.id("technicians")),
    customerSignatureAtRelease: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),

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

    // v6: Scheduling — Promised Delivery Date + Schedule Risk (Phase 1)
    //   promisedDeliveryDate — customer-committed delivery date (ms). Separate from
    //     targetCompletionDate (internal ops estimate) — this is the externally-committed date.
    //   estimatedLaborHoursOverride — manual labor estimate set at intake/quoting.
    //     If absent, the UI falls back to sum(taskCards.estimatedHours). This lets
    //     estimators set a top-level figure before task cards exist.
    //   scheduledStartDate — planned aircraft induction date for future scheduling board use.
    promisedDeliveryDate: v.optional(v.number()),
    estimatedLaborHoursOverride: v.optional(v.number()),
    scheduledStartDate: v.optional(v.number()),

    // v7: Team-level assignment — which roster team is responsible for this WO.
    // Separate from individual task-to-technician assignments in taskAssignments.
    assignedRosterTeamId: v.optional(v.id("rosterTeams")),

    // Aircraft snapshot captured at work order open time (OP-1003 page 1 data)
    // This makes the WO self-contained for FAA audit — the state at time of opening
    // is preserved even if aircraft records are later updated.
    aircraftSnapshotAtOpen: v.optional(v.object({
      registration: v.string(),
      make: v.string(),
      model: v.string(),
      serialNumber: v.string(),
      totalTimeAirframeHours: v.number(),
      hobbsReading: v.optional(v.number()),
      totalLandingCycles: v.optional(v.number()),
      engineSnapshots: v.array(v.object({
        position: v.optional(v.number()),
        make: v.string(),
        model: v.string(),
        serialNumber: v.string(),
        totalTimeHours: v.number(),
        totalCycles: v.optional(v.number()),
      })),
      propellerSnapshots: v.optional(v.array(v.object({
        position: v.string(),
        make: v.string(),
        model: v.string(),
        serialNumber: v.string(),
        totalTimeHours: v.optional(v.number()),
      }))),
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_location_status", ["organizationId", "shopLocationId", "status"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_number", ["organizationId", "workOrderNumber"])
    .index("by_aircraft_status", ["aircraftId", "status"])
    .index("by_priority", ["organizationId", "priority", "status"])
    .index("by_delivery_date", ["organizationId", "promisedDeliveryDate"])
    .index("by_org_assigned_team", ["organizationId", "assignedRosterTeamId"]),

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

    // v5: Task card step linkage (GAP-01 Phase 5)
    taskCardStepId: v.optional(v.id("taskCardSteps")),
    taskCardId: v.optional(v.id("taskCards")),

    // v5: Severity and priority (GAP-02 Phase 5)
    severity: v.optional(v.union(
      v.literal("critical"),
      v.literal("major"),
      v.literal("minor"),
      v.literal("observation"),
    )),
    priority: v.optional(v.union(
      v.literal("aog"),
      v.literal("urgent"),
      v.literal("routine"),
      v.literal("deferred"),
    )),

    // v5: Photos (GAP-03 Phase 5)
    photoUrls: v.optional(v.array(v.string())),

    // v5: Reporting technician (separate from foundBy for clarity)
    reportedByTechnicianId: v.optional(v.id("technicians")),

    // v5: Enhanced disposition fields (GAP-06 Phase 5)
    dispositionApprovedDataReference: v.optional(v.string()),
    dispositionNotes: v.optional(v.string()),

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

    // ── OP-1003 Classification Fields ──────────────────────────────────────────
    // Discrepancy type (maps to OP-1003 "Select Type" checkboxes)
    discrepancyType: v.optional(v.union(
      v.literal("mandatory"),           // Affects airworthiness — must be addressed
      v.literal("recommended"),         // Does not affect airworthiness
      v.literal("customer_information"), // Informational only
      v.literal("ops_check"),           // Requires an operational check
    )),

    // System type (maps to OP-1003 "Select type: Airframe/Engine/Propeller/Appliance")
    systemType: v.optional(v.union(
      v.literal("airframe"),
      v.literal("engine"),
      v.literal("propeller"),
      v.literal("appliance"),
    )),

    // When was this found (maps to OP-1003 "When was this found?" checkboxes)
    discoveredWhen: v.optional(v.union(
      v.literal("customer_report"),   // Reported by customer
      v.literal("planning"),          // Found during maintenance planning
      v.literal("inspection"),        // Found during inspection
      v.literal("post_quote"),        // Found after customer quote was issued
    )),

    // ── Customer Approval Workflow ──────────────────────────────────────────────
    customerApprovalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved_by_customer"),
      v.literal("approved_by_station"),  // Approved by station management without customer
      v.literal("denied"),               // Customer denied — record is voided per OP-1003
    )),
    addedToQuote: v.optional(v.boolean()),
    addedToQuoteInitials: v.optional(v.string()), // Initials of person who added to quote

    // ── Regulatory Flags ────────────────────────────────────────────────────────
    riiRequired: v.optional(v.boolean()),  // Required Inspection Item — needs IA for sign-off
    stcRelated: v.optional(v.boolean()),
    stcNumber: v.optional(v.string()),     // STC number if stcRelated is true

    // ── Labor Tracking ──────────────────────────────────────────────────────────
    mhEstimate: v.optional(v.number()),    // Man-hours estimate (in tenths, e.g. 2.5 = 2h 30m)
    mhActual: v.optional(v.number()),      // Actual man-hours (in tenths)

    // ── Attribution ─────────────────────────────────────────────────────────────
    writtenByTechnicianId: v.optional(v.id("technicians")), // Who wrote up the squawk

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

    // v3: Shift handoff notes (Gap 5)
    // Timestamped, attributed notes for shift handoff between technicians.
    handoffNotes: v.optional(v.array(v.object({
      technicianId: v.id("technicians"),
      technicianName: v.string(),
      note: v.string(),
      createdAt: v.number(),
    }))),

    // Denormalized counters — maintained by completeStep mutation
    // v5: Estimated hours (GAP-08)
    estimatedHours: v.optional(v.number()),

    // v5: Dedicated signature fields (GAP-22 — replaces notes-based sign-off)
    // Performing technician sign-off
    signingTechnicianId: v.optional(v.id("technicians")),
    signedAt: v.optional(v.number()),
    signedCertificateNumber: v.optional(v.string()),
    cardSignatureAuthEventId: v.optional(v.id("signatureAuthEvents")),

    // v6: Inspector sign-off (Part 145 dual sign-off requirement)
    // Independent QCM/IA inspector must verify work before RTS
    inspectorTechnicianId: v.optional(v.id("technicians")),
    inspectorSignedAt: v.optional(v.number()),
    inspectorCertificateNumber: v.optional(v.string()),
    inspectorSignatureAuthEventId: v.optional(v.id("signatureAuthEvents")),

    // v6: Return-to-Service sign-off (separate from inspector)
    // IA-holder who authorizes aircraft return to service
    rtsTechnicianId: v.optional(v.id("technicians")),
    rtsSignedAt: v.optional(v.number()),
    rtsCertificateNumber: v.optional(v.string()),
    rtsSignatureAuthEventId: v.optional(v.id("signatureAuthEvents")),

    // Wave 3: Required training types for task assignment constraint validation
    requiredTraining: v.optional(v.array(v.string())),

    stepCount: v.number(),
    completedStepCount: v.number(),
    naStepCount: v.number(),

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
    isInspectionItem: v.optional(v.boolean()),
    isCustomerReported: v.optional(v.boolean()),

    // Parent-level write-up summaries (latest entry text, patched by workItemEntries.addEntry)
    discrepancySummary: v.optional(v.string()),
    correctiveActionSummary: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedToTechnicianId", "status"])
    .index("by_org_assigned", ["organizationId", "assignedToTechnicianId", "status"]) // v2
    .index("by_organization", ["organizationId"]),

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
      v.literal("in_progress"),   // v5: GAP-18 — tech actively working on this step
      v.literal("completed"),
      v.literal("na"),
    ),

    // v5: Step started tracking (GAP-18)
    startedByTechnicianId: v.optional(v.id("technicians")),
    startedAt: v.optional(v.number()),

    // v5: Estimated duration (GAP-08/19 — was in API validator but never in schema)
    estimatedDurationMinutes: v.optional(v.number()),

    // v5: Zone reference for inspection mapping (GAP-16)
    zoneReference: v.optional(v.string()),

    // v5: Measurement spec for recorded values (GAP-17)
    measurementSpec: v.optional(v.object({
      name: v.string(),
      unit: v.string(),
      minValue: v.optional(v.number()),
      maxValue: v.optional(v.number()),
    })),

    // v5: Photos (GAP-16)
    photoUrls: v.optional(v.array(v.string())),

    // v5: Measurements recorded at completion (GAP-17)
    measurements: v.optional(v.array(v.object({
      name: v.string(),
      value: v.number(),
      unit: v.string(),
      withinLimits: v.boolean(),
      minLimit: v.optional(v.number()),
      maxLimit: v.optional(v.number()),
      notes: v.optional(v.string()),
    }))),

    // v5: Parts removed (GAP-13)
    partsRemoved: v.optional(v.array(v.object({
      partId: v.optional(v.id("parts")),
      partNumber: v.string(),
      serialNumber: v.optional(v.string()),
      description: v.string(),
      conditionAtRemoval: v.string(),
      intendedDisposition: v.string(),
    }))),

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

    // v3: Step-level approved data reference (Gap 1 — 14 CFR 43.9(a)(3))
    // The task card has a card-level approvedDataSource, but individual steps
    // may reference different sections of the same manual or different manuals.
    approvedDataReference: v.optional(v.string()),

    // v3: Parts installed during this step (Gap 2)
    // Captured at sign-off time. Links to parts inventory for traceability.
    partsInstalled: v.optional(v.array(v.object({
      partId: v.optional(v.id("parts")),
      partNumber: v.string(),
      serialNumber: v.optional(v.string()),
      description: v.string(),
      quantity: v.number(),
    }))),

    // Step-level write-up summaries (latest entry text, patched by workItemEntries.addEntry)
    stepDiscrepancySummary: v.optional(v.string()),
    stepCorrectiveActionSummary: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_task_card_step", ["taskCardId", "stepNumber"]) // ordered step retrieval
    .index("by_organization", ["organizationId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_signed_technician", ["signedByTechnicianId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK COMPLIANCE ITEMS
  //
  // Per-task regulatory compliance tracking. Each item links a task card to
  // a specific compliance reference (AD, SB, AMM, CMM, etc.) and tracks its
  // compliance status through a full history trail.
  //
  // This is NOT a signed operation — compliance items are administrative
  // tracking records, not maintenance entries requiring signature authority.
  // ═══════════════════════════════════════════════════════════════════════════

  taskComplianceItems: defineTable({
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),

    referenceType: v.union(
      v.literal("ad"),
      v.literal("sb"),
      v.literal("amm"),
      v.literal("cmm"),
      v.literal("faa_approved_data"),
      v.literal("part_145"),
      v.literal("other"),
    ),
    reference: v.string(),
    description: v.optional(v.string()),

    complianceStatus: v.union(
      v.literal("pending"),
      v.literal("compliant"),
      v.literal("non_compliant"),
      v.literal("deferred"),
      v.literal("na"),
    ),

    history: v.array(v.object({
      status: v.string(),
      notes: v.optional(v.string()),
      changedByTechnicianId: v.id("technicians"),
      changedByName: v.string(),
      changedAt: v.number(),
    })),

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_org_status", ["organizationId", "complianceStatus"]),

  // Task/subtask-level manual and compliance references (MBP-0032).
  taskStepReferences: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    stepId: v.id("taskCardSteps"),
    referenceType: v.union(v.literal("pdf"), v.literal("link"), v.literal("file")),
    title: v.string(),
    url: v.string(),
    notes: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    storageId: v.optional(v.id("_storage")),
    createdByUserId: v.string(),
    createdAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_step", ["stepId"])
    .index("by_work_order", ["workOrderId"]),

  // Immutable chain-of-custody events for step-level parts traceability (MBP-0035).
  taskStepPartTraceEvents: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    stepId: v.id("taskCardSteps"),
    eventType: v.union(v.literal("installed"), v.literal("removed"), v.literal("voided")),
    partId: v.optional(v.id("parts")),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    quantity: v.optional(v.number()),
    conditionAtRemoval: v.optional(v.union(v.literal("serviceable"), v.literal("unserviceable"), v.literal("scrap"))),
    partCategory: v.optional(v.string()),
    lotId: v.optional(v.id("lots")),
    lotNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),
    eightOneThirtyReference: v.optional(v.string()),
    fromCustody: v.optional(v.string()),
    toCustody: v.optional(v.string()),
    chainOfCustodyNote: v.optional(v.string()),
    linkedEventId: v.optional(v.id("taskStepPartTraceEvents")),
    createdByUserId: v.string(),
    createdByTechnicianId: v.optional(v.id("technicians")),
    createdAt: v.number(),
  })
    .index("by_step", ["stepId"])
    .index("by_task_card", ["taskCardId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_part", ["partId"]),

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
  // v3 changes:
  //   - testEquipmentUsed: optional embedded array of embeddedTestEquipmentRef
  //     (REQ-DP-01 — Dale Purcell, Avionics). Captures calibration traceability
  //     at signing time. Optional in alpha scope (avionics facilities only for v1.1)
  //     but added here because maintenanceRecords is immutable and adding a field
  //     retroactively cannot backfill historical records. Adding now allows alpha
  //     avionics shops to populate it; non-avionics shops simply leave it empty.
  //     See embeddedTestEquipmentRef validator above for full rationale.
  //
  // INVARIANT [maintenanceRecord.create — INV-01]:
  //   For recordType == "correction": corrects, correctionFieldName,
  //   correctionOriginalValue, correctionCorrectedValue, correctionReason
  //   must ALL be set (AC 43-9C requirement).
  //
  // INVARIANT [maintenanceRecord.create — INV-20]:
  //   If returnedToService == true, returnToServiceStatement must be set.
  //
  // INVARIANT [maintenanceRecord.create — v3]:
  //   For each entry in testEquipmentUsed where testEquipmentId is set:
  //     The snapshot fields (partNumber, serialNumber, calibrationCertNumber,
  //     calibrationExpiryDate) must match the testEquipment record at signing time.
  //     calibrationCurrentAtUse must equal (calibrationExpiryDate > signatureTimestamp).
  //     A warning (not a block) must be generated when calibrationCurrentAtUse == false.
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

    // v3: Test equipment calibration traceability — REQ-DP-01 (Dale Purcell, Avionics)
    // Optional in alpha; required for all IFR return-to-service work per RSM in v1.1.
    // Each entry snapshots the equipment's calibration state at signing time.
    // See embeddedTestEquipmentRef validator definition above for full rationale.
    testEquipmentUsed: v.optional(v.array(embeddedTestEquipmentRef)),

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
  // COMPLIANCE LEDGER EVENTS (C1 FOUNDATION)
  //
  // Append-only stream of compliance state transitions and due snapshots.
  // No mutation should patch/delete rows in this table.
  // ═══════════════════════════════════════════════════════════════════════════
  complianceLedgerEvents: defineTable({
    organizationId: v.id("organizations"),

    aggregateType: v.union(
      v.literal("ad_compliance"),
      v.literal("task_compliance"),
      v.literal("directive_lifecycle"),
      v.literal("counter_reconciliation"),
    ),
    aggregateId: v.string(),

    eventType: v.string(),
    previousState: v.optional(v.string()), // JSON payload
    nextState: v.optional(v.string()), // JSON payload

    // Optional denormalized due snapshot at event time.
    dueDate: v.optional(v.number()),
    dueHours: v.optional(v.number()),
    dueCycles: v.optional(v.number()),

    source: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("integration"),
      v.literal("reconciliation"),
    ),

    entityTable: v.optional(v.string()),
    entityId: v.optional(v.string()),
    actorUserId: v.optional(v.string()),

    occurredAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_occurred", ["organizationId", "occurredAt"])
    .index("by_org_aggregate", ["organizationId", "aggregateType", "aggregateId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTER RECONCILIATION EVENTS (C1 FOUNDATION)
  //
  // Source-of-truth policy:
  // - authoritativeSource identifies the winning authority.
  // - observedValue vs authoritativeValue captures reconciliation deltas.
  // - every event is immutable and ledgered.
  // ═══════════════════════════════════════════════════════════════════════════
  counterReconciliationEvents: defineTable({
    organizationId: v.id("organizations"),
    counterScope: v.union(v.literal("airframe"), v.literal("engine"), v.literal("apu")),
    counterName: v.union(v.literal("hours"), v.literal("cycles")),
    authoritativeSource: v.union(
      v.literal("aircraft"),
      v.literal("engine"),
      v.literal("apu"),
      v.literal("external_sync"),
      v.literal("manual"),
    ),
    entityRef: v.string(),
    observedValue: v.number(),
    authoritativeValue: v.number(),
    delta: v.number(),
    action: v.union(
      v.literal("accepted_authoritative"),
      v.literal("accepted_observed"),
      v.literal("requires_review"),
    ),
    metadataJson: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_counter", ["organizationId", "counterScope", "counterName"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTS / INVENTORY
  //
  // v3 addition:
  //   - "pending_inspection" added to location enum
  //     (REQ-TV-02 — Teresa Varga, Parts Manager)
  //
  // WHY ADDED (v3):
  //   Teresa Varga and Erik Holmberg independently described the same gap:
  //   parts received at the dock are immediately searchable as "inventory" items
  //   and can be issued to work orders before receiving inspection has been
  //   performed. This is a regulatory gap: 14 CFR 145.221 requires that a repair
  //   station have a receiving inspection process before parts are accepted and
  //   placed into service. "pending_inspection" is the system-enforced holding
  //   state that makes a received part non-issuable until the receiving inspection
  //   mutation transitions it to "inventory".
  //
  //   The existing "inventory" state means "received, inspected, and available
  //   for issuance." The new "pending_inspection" state means "received, not yet
  //   inspected — cannot be issued." This distinction is enforced at the mutation
  //   layer: any mutation that installs a part or assigns it to a task card must
  //   verify location != "pending_inspection". See also mvp-scope.md Schema Change #1.
  //
  // INVARIANT [part.issue — v3 INV-23]:
  //   A part in location "pending_inspection" must not be issuable.
  //   The installPart and assignPartToTaskCard mutations must check
  //   location != "pending_inspection" and throw with code PART_NOT_INSPECTED
  //   if this condition is violated.
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
  //     4. Part must not be in pending_inspection location (INV-23)
  //
  // INVARIANT [part.remove — Cilla 3.5]:
  //   When location changes away from "installed":
  //     currentAircraftId and currentEngineId must both be cleared.
  // ═══════════════════════════════════════════════════════════════════════════
  parts: defineTable({
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),

    // v10: Part classification (Inventory System Phase 1)
    partCategory: v.optional(v.union(
      v.literal("consumable"),    // Nuts, bolts, fluids, filters — qty tracked, not serialized
      v.literal("standard"),      // Standard hardware per spec (AN/MS/NAS)
      v.literal("rotable"),       // Linked to rotables table for time/cycle tracking
      v.literal("expendable"),    // One-time use (gaskets, seals, safety wire)
      v.literal("repairable"),    // Can be repaired and returned to service
    )),

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
      v.literal("pending_inspection"), // v3: received but not yet inspected — NOT issuable (INV-23)
      v.literal("inventory"),          // received, inspected, available for issuance
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
    shopLocationId: v.optional(v.id("shopLocations")),
    receivingDate: v.optional(v.number()),
    receivingWorkOrderId: v.optional(v.id("workOrders")),
    supplier: v.optional(v.string()),
    purchaseOrderNumber: v.optional(v.string()),
    isOwnerSupplied: v.boolean(),

    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),

    quarantineReason: v.optional(v.string()),
    quarantineCreatedById: v.optional(v.id("technicians")),
    quarantineCreatedAt: v.optional(v.number()),

    // v5: Reservation (GAP-14)
    reservedForWorkOrderId: v.optional(v.id("workOrders")),
    reservedByTechnicianId: v.optional(v.id("technicians")),
    reservedAt: v.optional(v.number()),

    // v5: Receiving inspection (GAP-11, GAP-15)
    receivingInspectedBy: v.optional(v.id("technicians")),
    receivingInspectedAt: v.optional(v.number()),
    receivingInspectionNotes: v.optional(v.string()),
    receivingRejectionReason: v.optional(v.string()),
    // Wave 6 MBP-0049: Conformity / chain-of-custody evidence captured at receiving.
    receivingConformityDocumentIds: v.optional(v.array(v.id("documents"))),

    // v5: Installation tracking (GAP-12)
    installedOnAircraftId: v.optional(v.id("aircraft")),
    installedOnWorkOrderId: v.optional(v.id("workOrders")),
    installedByTechnicianId: v.optional(v.id("technicians")),

    // v5: Removal tracking (GAP-13, GAP-14)
    removedByTechnicianId: v.optional(v.id("technicians")),
    removalCondition: v.optional(v.string()),
    intendedDisposition: v.optional(v.string()),

    notes: v.optional(v.string()),

    // v9: Reorder alerts (Phase 9 polish)
    minStockLevel: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),

    // v10: Quantity tracking for non-serialized (batch) parts
    quantityOnHand: v.optional(v.number()),       // Current on-hand count for consumables/expendables

    // v10: Valuation fields (Inventory System Phase 1)
    unitCost: v.optional(v.number()),             // Cost per unit at last receipt
    averageCost: v.optional(v.number()),           // Weighted average cost across all receipts
    lastPurchasePrice: v.optional(v.number()),     // Price from most recent PO
    purchaseOrderId: v.optional(v.id("purchaseOrders")), // FK to originating PO

    // v10: Lot/batch tracking (Inventory System Phase 1)
    lotId: v.optional(v.id("lots")),               // FK to lots table
    lotNumber: v.optional(v.string()),             // Denormalized for fast display
    batchNumber: v.optional(v.string()),           // Manufacturer batch number

    // v10: Bin location granularity (Inventory System Phase 1)
    warehouseZone: v.optional(v.string()),         // e.g. "A", "B", "Hangar 2"
    aisle: v.optional(v.string()),                 // e.g. "3"
    shelf: v.optional(v.string()),                 // e.g. "B"
    binNumber: v.optional(v.string()),             // e.g. "12"
    binLocation: v.optional(v.string()),           // Composite display: "A-3-B-12"

    // v11: Relational warehouse location (Warehouse Hierarchy)
    binLocationId: v.optional(v.id("warehouseBins")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_shop_location", ["organizationId", "shopLocationId"])
    .index("by_part_number", ["partNumber"])
    .index("by_serial", ["partNumber", "serialNumber"])
    .index("by_aircraft", ["currentAircraftId"])
    .index("by_condition", ["organizationId", "condition"])
    .index("by_location", ["organizationId", "location"]) // now covers pending_inspection queries
    .index("by_shelf_life", ["hasShelfLifeLimit", "shelfLifeLimitDate"])
    .index("by_org_category", ["organizationId", "partCategory"])
    .index("by_org_lot", ["organizationId", "lotId"])
    .index("by_org_bin", ["organizationId", "binLocationId"])
    .searchIndex("search_partNumber", {
      searchField: "partNumber",
      filterFields: ["organizationId"],
    })
    .searchIndex("search_partName", {
      searchField: "partName",
      filterFields: ["organizationId"],
    }),

  provisionalParts: defineTable({
    organizationId: v.id("organizations"),
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.string(),
    sourceContext: v.union(
      v.literal("work_order_request"),
      v.literal("purchase_order"),
      v.literal("rotable_create"),
      v.literal("loaner_create"),
      v.literal("core_return"),
      v.literal("warranty_claim"),
      v.literal("release_certificate"),
      v.literal("parts_request"),
    ),
    sourceReferenceId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org_and_partNumber", ["organizationId", "partNumber"]),

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
  // QCM REVIEWS
  //
  // v3 addition — Linda Paredes (QCM), REQ-LP-05.
  //
  // WHY ADDED (v3):
  //   Linda Paredes described the current state plainly: "QCM review is a line in
  //   a spreadsheet." In a Part 145 repair station, the Quality Control Manager's
  //   post-close review of completed work orders is a documented compliance action,
  //   not an informal check. The RSM (Repair Station Manual) requires that the QCM
  //   review each closed work order and document findings. Without a dedicated record
  //   type, the review is legally invisible — it happened or it didn't, and there is
  //   no way to prove it to an FAA inspector.
  //
  //   This table was considered as an auditLog event type (see requirements-synthesis.md)
  //   but a dedicated table is the correct design for the following reasons:
  //   1. QCM reviews are SIGNED compliance actions with signature hash and
  //      signatureAuthEvent — not passive system events.
  //   2. The review has structured data (outcome, findingsNotes) beyond what
  //      auditLog.newValue / oldValue can cleanly represent.
  //   3. The QCM aging dashboard (work orders closed >48h without review) requires
  //      an efficient left-join between workOrders and qcmReviews — a dedicated
  //      table with by_work_order index makes this query direct.
  //   4. Per Marcus's sign-off: QCM review records must be independently auditable
  //      as signed documents — they cannot be co-mingled with passive log events.
  //
  //   Note: An auditLog entry with eventType "qcm_reviewed" is ALSO written when a
  //   QCM review is created (as with all write events). The qcmReviews table is the
  //   authoritative record; the auditLog entry is the audit trail of the write action.
  //
  // IMMUTABLE — no UPDATE operations permitted after creation.
  //   A QCM review, once signed, is a permanent compliance record.
  //   If a review has errors, the QCM creates a new review referencing the
  //   correctedReviewId field (same amendment pattern as maintenanceRecords).
  //   Existing reviews are never modified.
  //
  // INVARIANT [qcmReview.create — v3 INV-24]:
  //   The referenced workOrder must be in status "closed" before a QCM review
  //   can be created. The mutation must verify workOrder.status == "closed".
  //
  // INVARIANT [qcmReview.create — v3 INV-25]:
  //   reviewedByTechnicianId must reference the organization's current
  //   qualityControlManagerId (from organizations.qualityControlManagerId)
  //   OR a technician explicitly authorized as QCM deputy.
  //   The mutation checks organizations.qualityControlManagerId == reviewedByTechnicianId.
  //   Exception handling for deputy QCM is v1.1 scope; for alpha, enforce strict QCM match.
  //
  // INVARIANT [qcmReview.create — v3 INV-26]:
  //   If outcome == "findings_noted" or outcome == "requires_amendment",
  //   findingsNotes must be non-empty. The mutation enforces this.
  //   A review with findings but no notes is legally insufficient.
  // ═══════════════════════════════════════════════════════════════════════════
  qcmReviews: defineTable({
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // QCM reviewer identity — snapshot at review time
    // The QCM is a technician. Identity is snapshotted at signing consistent with
    // the pattern used in maintenanceRecords and returnToService.
    reviewedByTechnicianId: v.id("technicians"),
    reviewerLegalName: v.string(),           // Snapshot at review time
    reviewerCertificateNumber: v.string(),   // Snapshot at review time
    reviewerCertificateType: certificateType, // Snapshot at review time

    reviewTimestamp: v.number(),             // Unix ms — when the review was performed

    // Review outcome
    outcome: v.union(
      v.literal("accepted"),            // All records compliant; no findings
      v.literal("findings_noted"),      // Minor findings logged; work order acceptable
      v.literal("requires_amendment"),  // One or more records require amendment before acceptance
    ),

    // Required when outcome == "findings_noted" or outcome == "requires_amendment" (INV-26)
    findingsNotes: v.optional(v.string()),

    // Amendment chain — if this review corrects a prior review with errors
    // (same pattern as maintenanceRecords.corrects)
    corrects: v.optional(v.id("qcmReviews")),

    // Cryptographic signature — QCM review is a signed compliance action
    signatureHash: v.string(),
    signatureTimestamp: v.number(),
    signatureAuthEventId: v.id("signatureAuthEvents"),

    createdAt: v.number(),
    // NOTE: Immutable — no updatedAt. See immutability note above.
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_timestamp", ["organizationId", "reviewTimestamp"]) // QCM dashboard timeline
    .index("by_reviewer", ["reviewedByTechnicianId"])
    .index("by_outcome", ["organizationId", "outcome"]),              // filter by outcome type

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

    // v12: Structured address fields
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),

    // v12: Airport association — FAA NFDC reference data linkage
    homeAirportFaaLocId: v.optional(v.string()),  // FAA Location Identifier (primary key)
    homeAirportIcao: v.optional(v.string()),       // ICAO code (when available)
    homeAirportName: v.optional(v.string()),        // Denormalized display name
    homeAirportCity: v.optional(v.string()),        // Denormalized for fast display

    // v12: Repair station cert for Part 145 customers
    part145CertNo: v.optional(v.string()),

    // v2: aircraftIds removed (QA-005). Query: aircraft.by_customer(customerId)
    notes: v.optional(v.string()),

    // v4: Tax and payment terms (GAP-03, GAP-04)
    taxExempt: v.optional(v.boolean()),
    defaultPaymentTerms: v.optional(v.string()),    // e.g., "Net 30"
    defaultPaymentTermsDays: v.optional(v.number()), // e.g., 30

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_name", ["organizationId", "name"])
    .index("by_org_airport", ["organizationId", "homeAirportFaaLocId", "active"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER NOTES
  // Chronological activity/notes log per customer. Append-only.
  // ═══════════════════════════════════════════════════════════════════════════
  customerNotes: defineTable({
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
    content: v.string(),
    createdByUserId: v.optional(v.string()), // Clerk user ID
    createdByName: v.optional(v.string()),   // Display name at time of creation
    createdAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_org", ["organizationId"]),

  // Customer-submitted messages/requests from portal users to the shop.
  customerRequests: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    customerNameSnapshot: v.string(),
    customerEmailSnapshot: v.optional(v.string()),

    // Optional scoping for request context.
    workOrderId: v.optional(v.id("workOrders")),
    aircraftId: v.optional(v.id("aircraft")),

    subject: v.string(),
    message: v.string(),
    category: v.union(
      v.literal("general"),
      v.literal("invoice"),
      v.literal("quote"),
      v.literal("work_order"),
      v.literal("technical"),
      v.literal("parts"),
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),

    status: v.union(
      v.literal("new"),
      v.literal("in_review"),
      v.literal("responded"),
      v.literal("closed"),
    ),

    submittedByUserId: v.string(),
    submittedByEmail: v.optional(v.string()),
    internalResponse: v.optional(v.string()),
    respondedByUserId: v.optional(v.string()),
    respondedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId", "createdAt"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_organization", ["organizationId", "createdAt"])
    .index("by_work_order", ["workOrderId", "createdAt"]),

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
  // v3 additions:
  //   - "qcm_reviewed" added to eventType enum (REQ-LP-05 — Linda Paredes, QCM)
  //     This event type is written alongside every qcmReviews record creation.
  //     The qcmReviews table is the authoritative signed record; this event is
  //     the audit trail entry that surfaces in the per-record audit history UI.
  //
  // INVARIANT [auditLog.write]:
  //   For event types record_signed, correction_created, technician_signed,
  //   record_viewed, record_exported, qcm_reviewed (v3): organizationId must be set.
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
      v.literal("qcm_reviewed"), // v3 — REQ-LP-05 (Linda Paredes, QCM)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ████████████████████████████████████████████████████████████████████████
  // BILLING SCHEMA — Phase 1 Billing MVP
  //
  // Authors:       Devraj Anand (Backend), Marcus Webb (Regulatory)
  // Schema Version: 4 (Billing Phase 1 — 2026-02-24)
  //
  // Marcus Webb regulatory notes:
  //   All billing records are org-scoped. Invoice immutability (once SENT or PAID)
  //   is enforced at the mutation layer, mirroring the immutability model for
  //   maintenance records. Audit log entries are mandatory on every financial
  //   state transition. This satisfies internal audit trail requirements and
  //   supports future QBO sync (FEAT-110, deferred).
  //
  // ADDITIONS (12 tables):
  //   vendors, purchaseOrders, poLineItems, timeEntries,
  //   quotes, quoteLineItems, quoteDepartments,
  //   invoices, invoiceLineItems, payments,
  //   pricingProfiles, pricingRules
  // ████████████████████████████████████████████████████████████████████████
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDORS
  //
  // Tracks external vendors used for parts procurement, contract maintenance,
  // calibration, and DER services. Marcus Webb: FAA Part 145 §145.217(b)
  // requires repair stations to maintain a list of approved suppliers.
  // isApproved / approvedBy / approvedAt implement the approved vendor list
  // (AVL) control required by Part 145 Quality Control Manual procedures.
  // ═══════════════════════════════════════════════════════════════════════════
  vendors: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("parts_supplier"),
      v.literal("consumables_supplier"),
      v.literal("contract_maintenance"),
      v.literal("calibration_lab"),
      v.literal("DER"),
      v.literal("service_provider"),
      v.literal("other"),
    ),
    address: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    // Certificate / approval tracking
    // Marcus: For calibration labs and DERs, certNumber is the FAA-issued
    // certificate number. For Part 145 repair stations, it is the RSMC number.
    // certExpiry is monitored; vendors with expired certs must not be used.
    certNumber: v.optional(v.string()),
    certExpiry: v.optional(v.number()),   // Unix ms

    // Approved Vendor List controls
    isApproved: v.boolean(),
    approvedBy: v.optional(v.id("technicians")),  // Technician who approved (DOM or QCM)
    approvedAt: v.optional(v.number()),            // Unix ms

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type", ["orgId", "type"])
    .index("by_org_approved", ["orgId", "isApproved"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDOR SERVICES
  //
  // Catalog of services each vendor provides (repair, overhaul, calibration,
  // NDT, etc.). Links to vendorId; used when attaching vendor work to task
  // cards via taskCardVendorServices.
  // ═══════════════════════════════════════════════════════════════════════════
  vendorServices: defineTable({
    vendorId: v.id("vendors"),
    orgId: v.id("organizations"),
    serviceName: v.string(),
    serviceType: v.union(
      v.literal("repair"),
      v.literal("overhaul"),
      v.literal("test"),
      v.literal("calibration"),
      v.literal("inspection"),
      v.literal("fabrication"),
      v.literal("cleaning"),
      v.literal("plating"),
      v.literal("painting"),
      v.literal("ndt"),
      v.literal("other"),
    ),
    description: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    certificationRequired: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_org", ["orgId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK CARD VENDOR SERVICES
  //
  // Links a vendor service to a specific task card on a work order. Tracks
  // the status of outsourced work through planned → sent → in_progress →
  // completed lifecycle. Denormalized vendorName/serviceName survive vendor
  // edits for audit trail integrity.
  // ═══════════════════════════════════════════════════════════════════════════
  taskCardVendorServices: defineTable({
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    vendorId: v.id("vendors"),
    vendorServiceId: v.optional(v.id("vendorServices")),
    // Denormalized for display — survives vendor edits
    vendorName: v.string(),
    serviceName: v.string(),
    serviceType: v.optional(v.string()),
    status: v.union(
      v.literal("planned"),
      v.literal("sent_for_work"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_vendor", ["vendorId"]),

  // Immutable status history trail for task-level vendor work.
  taskCardVendorServiceStatusHistory: defineTable({
    taskCardVendorServiceId: v.id("taskCardVendorServices"),
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    fromStatus: v.optional(v.union(
      v.literal("planned"),
      v.literal("sent_for_work"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    )),
    toStatus: v.union(
      v.literal("planned"),
      v.literal("sent_for_work"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    actualCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    changedByUserId: v.string(),
    createdAt: v.number(),
  })
    .index("by_task_vendor_service", ["taskCardVendorServiceId"])
    .index("by_task_card", ["taskCardId"])
    .index("by_work_order", ["workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  //
  // PO lifecycle: DRAFT → SUBMITTED → PARTIAL → RECEIVED → CLOSED
  // Marcus: POs support the procurement controls required by §145.213(a).
  // A PO in RECEIVED or CLOSED status has parts in inventory; PARTIAL means
  // a partial delivery was logged and more shipments are expected.
  // ═══════════════════════════════════════════════════════════════════════════
  purchaseOrders: defineTable({
    orgId: v.id("organizations"),
    poNumber: v.string(),       // Org-scoped unique PO number (e.g. PO-0001)
    vendorId: v.id("vendors"),
    workOrderId: v.optional(v.id("workOrders")),  // Optional: PO tied to a specific WO
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SUBMITTED"),
      v.literal("PARTIAL"),
      v.literal("RECEIVED"),
      v.literal("CLOSED"),
    ),
    requestedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),

    // Financial summary (computed from line items; denormalized for fast reads)
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),

    // Multi-currency support
    currency: v.optional(v.string()),     // ISO 4217 code, default "USD"

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_vendor", ["orgId", "vendorId"])
    .index("by_org_po_number", ["orgId", "poNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_org_wo", ["orgId", "workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PO LINE ITEMS
  // Individual line items on a purchase order. Tracks ordered qty vs received qty.
  // ═══════════════════════════════════════════════════════════════════════════
  poLineItems: defineTable({
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
    partId: v.optional(v.id("parts")),    // Optional FK to parts inventory
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
    receivedQty: v.number(),              // How many have been received so far
    status: v.union(
      v.literal("PENDING"),
      v.literal("PARTIAL"),
      v.literal("RECEIVED"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_po", ["purchaseOrderId"])
    .index("by_org", ["orgId"])
    .index("by_part", ["partId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME ENTRIES
  //
  // Technician clock-in / clock-out records across shop/work-order/task/step
  // contexts. durationMinutes is computed server-side on stop/clock-out.
  // Marcus: Time entry records provide the audit trail for labor charged to
  // a work order. Required for §145.213 cost allocation traceability.
  // ═══════════════════════════════════════════════════════════════════════════
  timeEntries: defineTable({
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    entryType: v.optional(v.union(
      v.literal("shift"),
      v.literal("shop"),
      v.literal("work_order"),
      v.literal("task"),
      v.literal("step"),
      v.literal("break"),
      v.literal("admin"),
    )),

    // Optional context fields depending on entryType
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    shopActivityCode: v.optional(v.string()),
    source: v.optional(v.string()),

    clockInAt: v.number(),                 // Unix ms
    clockOutAt: v.optional(v.number()),    // Unix ms — null while clocked in
    durationMinutes: v.optional(v.number()), // Computed at clock-out
    pausedAt: v.optional(v.number()),      // Unix ms when currently paused
    totalPausedMinutes: v.optional(v.number()),

    notes: v.optional(v.string()),

    // Billing / classification snapshots
    billingClass: v.optional(v.union(
      v.literal("billable"),
      v.literal("non_billable"),
      v.literal("warranty"),
      v.literal("internal"),
      v.literal("absorbed"),
    )),
    rateAtTime: v.optional(v.number()),

    // v4: Time approval workflow (GAP-16)
    approvalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    )),
    approved: v.optional(v.boolean()),
    approvedByTechId: v.optional(v.id("technicians")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    rejectedByTechId: v.optional(v.id("technicians")),
    rejectedAt: v.optional(v.number()),

    // Billing lock/linkage (prevents double-billing once consumed)
    billedInvoiceId: v.optional(v.id("invoices")),
    billedLineItemId: v.optional(v.id("invoiceLineItems")),
    billedAt: v.optional(v.number()),
    billingLock: v.optional(v.boolean()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type", ["orgId", "entryType"])
    .index("by_org_approval_status", ["orgId", "approvalStatus"])
    .index("by_org_tech_clock_out", ["orgId", "technicianId", "clockOutAt"])
    .index("by_work_order", ["workOrderId"])
    .index("by_technician", ["technicianId"])
    .index("by_org_tech", ["orgId", "technicianId"])
    .index("by_org_wo", ["orgId", "workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TIME ENTRY SEGMENTS
  //
  // Segment ledger for pause/resume fidelity. A time entry can contain multiple
  // active/pause segments. Duration reconstruction should be based on active
  // segment totals to maintain auditable timer behavior across devices.
  // ═══════════════════════════════════════════════════════════════════════════
  timeEntrySegments: defineTable({
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    technicianId: v.id("technicians"),

    segmentStartAt: v.number(),
    segmentEndAt: v.optional(v.number()),
    segmentType: v.union(
      v.literal("active"),
      v.literal("pause"),
      v.literal("break"),
    ),
    createdBySource: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_time_entry", ["timeEntryId"])
    .index("by_org_tech", ["orgId", "technicianId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTES
  //
  // Quote lifecycle: DRAFT → SENT → APPROVED → CONVERTED (to WO) | DECLINED
  // Marcus: Quotes are pre-work authorizations. APPROVED status captures the
  // customer's written authorization required by 14 CFR 43 Appendix D (most
  // operators require written auth before major repairs). convertedToWorkOrderId
  // provides the audit link between customer approval and maintenance activity.
  // ═══════════════════════════════════════════════════════════════════════════
  quotes: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    aircraftId: v.id("aircraft"),
    workOrderId: v.optional(v.id("workOrders")),  // Set if quote is tied to existing WO
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SENT"),
      v.literal("APPROVED"),
      v.literal("CONVERTED"),
      v.literal("DECLINED"),
    ),
    quoteNumber: v.string(),            // Org-scoped unique (e.g. Q-0001)
    createdByTechId: v.id("technicians"),

    // Timestamps
    sentAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),

    // Decline tracking
    declineReason: v.optional(v.string()),

    // Conversion tracking
    convertedToWorkOrderId: v.optional(v.id("workOrders")),

    // Financial summary (denormalized for fast reads)
    laborTotal: v.number(),
    partsTotal: v.number(),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),

    // Multi-currency support
    currency: v.optional(v.string()),     // ISO 4217 code, default "USD"

    // Notes
    notes: v.optional(v.string()),

    // Quote builder metadata (scheduler feature parity)
    projectTitle: v.optional(v.string()),               // Distinct title separate from notes
    priority: v.optional(v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("aog"),
    )),
    requestedStartDate: v.optional(v.number()),          // Unix ms — when customer wants work to begin
    requestedEndDate: v.optional(v.number()),            // Unix ms — customer-requested completion

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_quote_number", ["orgId", "quoteNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_converted_work_order", ["convertedToWorkOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTE LINE ITEMS
  // Labor, parts, and external service line items on a quote.
  // ═══════════════════════════════════════════════════════════════════════════
  quoteLineItems: defineTable({
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    type: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    ),
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
    // v4: Line item discounts (GAP-11)
    discountPercent: v.optional(v.number()),   // e.g., 10 for 10%
    discountAmount: v.optional(v.number()),    // Flat dollar discount
    total: v.number(),                         // After discount applied

    // Optional context fields
    technicianId: v.optional(v.id("technicians")),  // For labor lines: which tech
    partId: v.optional(v.id("parts")),              // For part lines: which part
    departmentSection: v.optional(v.string()),       // For multi-dept quotes (FEAT-140)

    // v5: Discrepancy link (GAP-07 Phase 6)
    discrepancyId: v.optional(v.id("discrepancies")),

    // v5: Per-line-item customer decision (GAP-08 Phase 6)
    customerDecision: v.optional(v.union(
      v.literal("approved"),
      v.literal("declined"),
      v.literal("deferred"),
    )),
    customerDecisionNotes: v.optional(v.string()),
    customerDecisionAt: v.optional(v.number()),
    customerDecisionByUserId: v.optional(v.string()),
    customerDecisionByTechnicianId: v.optional(v.id("technicians")),
    customerDecisionByName: v.optional(v.string()),

    // Wave 4: Line economics & reordering
    sortOrder: v.optional(v.number()),
    directCost: v.optional(v.number()),
    markupMultiplier: v.optional(v.number()),
    fixedPriceOverride: v.optional(v.number()),
    pricingMode: v.optional(v.union(v.literal("derived"), v.literal("override"))),
    isMarkupOverride: v.optional(v.boolean()),  // True when user manually deviated from auto-tier

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_quote", ["quoteId"])
    .index("by_org", ["orgId"])
    .index("by_org_quote", ["orgId", "quoteId"]),

  // Immutable event trail for quote line decisions (MBP-0053 / FR-024).
  quoteLineItemDecisionEvents: defineTable({
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    lineItemId: v.id("quoteLineItems"),
    discrepancyId: v.optional(v.id("discrepancies")),
    decision: v.union(
      v.literal("approved"),
      v.literal("declined"),
      v.literal("deferred"),
    ),
    decisionNotes: v.optional(v.string()),
    actorUserId: v.string(),
    actorTechnicianId: v.optional(v.id("technicians")),
    actorName: v.optional(v.string()),
    decidedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_line_item", ["lineItemId"])
    .index("by_quote", ["quoteId"])
    .index("by_org_quote", ["orgId", "quoteId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTE TEMPLATES
  //
  // Reusable quote templates with pre-configured line items (Wave 4).
  // ═══════════════════════════════════════════════════════════════════════════
  quoteTemplates: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    aircraftTypeFilter: v.optional(v.string()),
    lineItems: v.array(v.object({
      type: v.union(v.literal("labor"), v.literal("part"), v.literal("external_service")),
      description: v.string(),
      qty: v.number(),
      unitPrice: v.number(),
      directCost: v.optional(v.number()),
      markupMultiplier: v.optional(v.number()),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTE DEPARTMENTS
  //
  // Multi-department quotation workflow (FEAT-140). Each department section of
  // a quote must be submitted and approved before the quote can be sent.
  // Marcus: Required for Part 145 repair stations with segregated shops
  // (avionics, airframe, powerplant) — each must sign off their section.
  // ═══════════════════════════════════════════════════════════════════════════
  quoteDepartments: defineTable({
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    sectionName: v.string(),          // e.g. "Avionics", "Airframe", "Powerplant"
    assignedTechId: v.id("technicians"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SUBMITTED"),
      v.literal("APPROVED"),
    ),
    submittedAt: v.optional(v.number()),  // Unix ms
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_quote", ["quoteId"])
    .index("by_org", ["orgId"])
    .index("by_org_quote", ["orgId", "quoteId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOP SETTINGS
  //
  // Organization-level financial configuration for the quote builder:
  // shop rate, average hourly cost (for margin calculation), and tiered
  // markup schedules for parts and services.
  // ═══════════════════════════════════════════════════════════════════════════
  shopSettings: defineTable({
    orgId: v.id("organizations"),
    shopRate: v.number(),                    // Default hourly labor rate (e.g., 135)
    averageHourlyCost: v.number(),           // Internal labor cost for margin calc (e.g., 58)
    partMarkupTiers: v.array(v.object({
      maxCostThreshold: v.number(),          // Upper bound of this tier (e.g. 500)
      markupMultiplier: v.number(),          // e.g. 1.30 for 30% markup
    })),
    serviceMarkupTiers: v.array(v.object({
      maxCostThreshold: v.number(),
      markupMultiplier: v.number(),
    })),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICES
  //
  // Invoice lifecycle: DRAFT → SENT → PAID → VOID
  // Marcus: Invoices in SENT or PAID status are immutable — corrections must
  // be made via credit memo (not implemented in MVP; this is the enforcement
  // hook). This mirrors the immutability model for maintenance records.
  // isProgressBill and depositAmount support FEAT-138 (Progress Billing).
  // ═══════════════════════════════════════════════════════════════════════════
  invoices: defineTable({
    orgId: v.id("organizations"),
    workOrderId: v.optional(v.id("workOrders")),
    customerId: v.id("customers"),
    quoteId: v.optional(v.id("quotes")),
    invoiceNumber: v.string(),          // Org-scoped unique (e.g. INV-0001)
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SENT"),
      v.literal("PARTIAL"),
      v.literal("PAID"),
      v.literal("VOID"),
    ),
    createdByTechId: v.id("technicians"),

    // Timestamps
    sentAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    voidedAt: v.optional(v.number()),
    voidReason: v.optional(v.string()),

    // Financial summary (denormalized)
    laborTotal: v.number(),
    partsTotal: v.number(),
    subtotal: v.number(),
    // BUG-BM-HUNT-TAX: taxRatePercent stored so recomputeInvoiceTotals can
    // reapply tax whenever line items change on a DRAFT invoice.
    taxRatePercent: v.optional(v.number()),
    tax: v.number(),
    total: v.number(),
    amountPaid: v.number(),
    balance: v.number(),

    // Progress billing (FEAT-138)
    isProgressBill: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),

    // v4: Due date and overdue tracking (GAP-04)
    dueDate: v.optional(v.number()),      // Unix ms — when payment is due
    // v4: Terms for display (e.g., "Net 30", "Due on Receipt")
    paymentTerms: v.optional(v.string()),

    // Multi-currency support
    currency: v.optional(v.string()),     // ISO 4217 code, default "USD"

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_invoice_number", ["orgId", "invoiceNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_quote", ["quoteId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INVOICE LINE ITEMS
  // Labor by tech, parts consumed, external service charges, deposits, credits.
  // ═══════════════════════════════════════════════════════════════════════════
  invoiceLineItems: defineTable({
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    type: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
      v.literal("deposit"),
      v.literal("credit"),
    ),
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
    // v4: Line item discounts (GAP-11)
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),

    // Optional context
    technicianId: v.optional(v.id("technicians")),  // For labor lines
    partId: v.optional(v.id("parts")),              // For part lines

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_org", ["orgId"])
    .index("by_org_invoice", ["orgId", "invoiceId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  //
  // Partial and full payment records against invoices.
  // Marcus: Each payment record must carry method and referenceNumber for
  // bank reconciliation and cash-flow audit purposes.
  // recordedAt is the business date of payment (not necessarily now()).
  // ═══════════════════════════════════════════════════════════════════════════
  payments: defineTable({
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    amount: v.number(),
    method: v.union(
      v.literal("cash"),
      v.literal("check"),
      v.literal("credit_card"),
      v.literal("wire"),
      v.literal("ach"),
      v.literal("other"),
    ),
    recordedAt: v.number(),             // Business date of payment (Unix ms)
    recordedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),
    referenceNumber: v.optional(v.string()), // Check#, wire ref, ACH trace, etc.
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_org", ["orgId"])
    .index("by_org_invoice", ["orgId", "invoiceId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING PROFILES
  //
  // Per-customer pricing configuration. isDefault=true applies org-wide when
  // no customer-specific profile exists. Rate fields are optional — absence
  // means "use system default".
  // ═══════════════════════════════════════════════════════════════════════════
  pricingProfiles: defineTable({
    orgId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),  // null = org-wide default profile
    name: v.string(),
    laborRateOverride: v.optional(v.number()),    // Flat $ rate overriding tech cert rate
    laborRateMultiplier: v.optional(v.number()),  // e.g. 1.5 = 150% of base rate
    partsMarkupPercent: v.optional(v.number()),   // e.g. 20 = 20% markup over cost
    partsDiscountPercent: v.optional(v.number()), // e.g. 10 = 10% discount off list
    effectiveDate: v.number(),                    // Unix ms — profile takes effect
    expiryDate: v.optional(v.number()),           // Unix ms — null = perpetual
    isDefault: v.boolean(),                       // True = use when no specific profile matches
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_default", ["orgId", "isDefault"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING RULES
  //
  // Multi-structure pricing rules (FEAT-130). Evaluated in priority order
  // (lower priority number = higher precedence). Rules may apply to labor,
  // parts, or external services. A rule may be scoped by part, partClass,
  // techCertLevel, or customerClass. The computePrice action resolves the
  // applicable rule given a context and returns the computed price.
  //
  // Rule types:
  //   cost_plus      — unitPrice = baseCost * (1 + markupPercent/100)
  //   list_minus     — unitPrice = listPrice * (1 - discountPercent/100)
  //   flat_rate      — unitPrice = flatRate (ignores baseCost)
  //   quantity_tier  — unitPrice from tier table encoded in tierBreaks JSON
  // ═══════════════════════════════════════════════════════════════════════════
  pricingRules: defineTable({
    orgId: v.id("organizations"),
    ruleType: v.union(
      v.literal("cost_plus"),
      v.literal("list_minus"),
      v.literal("flat_rate"),
      v.literal("quantity_tier"),
    ),
    appliesTo: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    ),

    // Scoping selectors (all optional — absence = "match any")
    partId: v.optional(v.id("parts")),
    partClass: v.optional(v.string()),      // e.g. "avionics", "structural"
    techCertLevel: v.optional(v.string()),  // e.g. "A&P", "IA"
    customerClass: v.optional(v.string()),  // e.g. "charter_operator", "flight_school"

    // Rule-type-specific parameters
    unitCost: v.optional(v.number()),         // cost_plus base cost (if fixed)
    markupPercent: v.optional(v.number()),    // cost_plus markup
    listPrice: v.optional(v.number()),        // list_minus list price
    discountPercent: v.optional(v.number()),  // list_minus discount
    flatRate: v.optional(v.number()),         // flat_rate value
    tierBreaks: v.optional(v.string()),       // JSON-encoded tier table for quantity_tier

    effectiveDate: v.number(),               // Unix ms
    expiryDate: v.optional(v.number()),      // Unix ms — null = perpetual
    priority: v.number(),                    // Lower = higher precedence

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_applies_to", ["orgId", "appliesTo"])
    .index("by_org_priority", ["orgId", "priority"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG COUNTERS
  //
  // Atomic counters for generating unique org-scoped sequential numbers.
  // Supports invoice (INV-XXXX), quote (Q-XXXX), and PO (PO-XXXX) numbers.
  // Each counter record is patched atomically within a Convex mutation
  // transaction, guaranteeing no duplicate numbers even under concurrent load.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // CREDIT MEMOS (GAP-09)
  // Issued for returns, corrections, or overpayments.
  // ═══════════════════════════════════════════════════════════════════════════
  creditMemos: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    invoiceId: v.optional(v.id("invoices")),   // Related invoice (if applicable)
    creditMemoNumber: v.string(),               // CM-0001
    status: v.union(
      v.literal("DRAFT"),
      v.literal("ISSUED"),
      v.literal("APPLIED"),                     // Applied to another invoice
      v.literal("VOID"),
    ),
    reason: v.string(),
    amount: v.number(),
    appliedToInvoiceId: v.optional(v.id("invoices")),
    appliedAt: v.optional(v.number()),
    issuedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),
    voidReason: v.optional(v.string()),          // BUG-BM-HUNT-104: reason when credit memo is voided
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_invoice", ["invoiceId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TAX CONFIGURATION (GAP-03)
  // Per-org tax rates. Supports multiple tax rates (state, county, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  taxRates: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),                           // e.g., "Colorado Sales Tax"
    rate: v.number(),                           // Percentage, e.g. 7.65
    appliesTo: v.union(
      v.literal("parts"),
      v.literal("labor"),
      v.literal("all"),
    ),
    isDefault: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_active", ["orgId", "active"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER TAX EXEMPTIONS (GAP-03)
  // ═══════════════════════════════════════════════════════════════════════════
  customerTaxExemptions: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    exemptionType: v.union(
      v.literal("full"),
      v.literal("parts_only"),
      v.literal("labor_only"),
    ),
    certificateNumber: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_customer", ["orgId", "customerId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // RECURRING BILLING TEMPLATES (GAP-10)
  // ═══════════════════════════════════════════════════════════════════════════
  recurringBillingTemplates: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.string(),
    description: v.optional(v.string()),
    frequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually"),
    ),
    lineItems: v.array(v.object({
      type: v.union(v.literal("labor"), v.literal("part"), v.literal("external_service")),
      description: v.string(),
      qty: v.number(),
      unitPrice: v.number(),
    })),
    subtotal: v.number(),
    paymentTerms: v.optional(v.string()),
    paymentTermsDays: v.optional(v.number()),
    nextGenerateAt: v.number(),
    lastGeneratedAt: v.optional(v.number()),
    active: v.boolean(),
    createdByTechId: v.id("technicians"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_active", ["orgId", "active"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER DEPOSITS (GAP-12)
  // ═══════════════════════════════════════════════════════════════════════════
  customerDeposits: defineTable({
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    amount: v.number(),
    appliedAmount: v.number(),
    remainingAmount: v.number(),
    method: v.union(
      v.literal("cash"), v.literal("check"), v.literal("credit_card"),
      v.literal("wire"), v.literal("ach"), v.literal("other"),
    ),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedByTechId: v.id("technicians"),
    status: v.union(
      v.literal("AVAILABLE"),
      v.literal("PARTIAL"),
      v.literal("APPLIED"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_status", ["orgId", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG BILLING SETTINGS (GAP-15, GAP-19)
  // Company branding, default terms, PO approval thresholds.
  // ═══════════════════════════════════════════════════════════════════════════
  orgBillingSettings: defineTable({
    orgId: v.id("organizations"),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyEmail: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    invoiceTerms: v.optional(v.string()),
    invoiceNotes: v.optional(v.string()),
    quoteTerms: v.optional(v.string()),
    quoteNotes: v.optional(v.string()),
    paymentInstructions: v.optional(v.string()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultPaymentTermsDays: v.optional(v.number()),
    poApprovalThreshold: v.optional(v.number()),
    // Multi-currency support
    baseCurrency: v.optional(v.string()),              // default "USD"
    supportedCurrencies: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INDUCTION RECORDS (GAP-02)
  // Records the aircraft arrival event with logbook review and walk-around findings.
  // ═══════════════════════════════════════════════════════════════════════════
  inductionRecords: defineTable({
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
    totalTimeAtInduction: v.number(),
    inductionNotes: v.optional(v.string()),
    walkAroundFindings: v.optional(v.string()),
    logbookReviewNotes: v.optional(v.string()),
    inductedAt: v.number(),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_work_order", ["workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INSPECTION TEMPLATES (GAP-06)
  // Reusable checklist templates (e.g., King Air B200 Phase 4).
  // ═══════════════════════════════════════════════════════════════════════════
  inspectionTemplates: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    aircraftMake: v.optional(v.string()),
    aircraftModel: v.optional(v.string()),
    inspectionType: v.string(),
    approvedDataSource: v.string(),
    approvedDataRevision: v.optional(v.string()),
    steps: v.array(v.object({
      stepNumber: v.number(),
      description: v.string(),
      requiresSpecialTool: v.boolean(),
      specialToolReference: v.optional(v.string()),
      signOffRequired: v.boolean(),
      signOffRequiresIa: v.boolean(),
      estimatedDurationMinutes: v.optional(v.number()),
      zoneReference: v.optional(v.string()),
      measurementSpec: v.optional(v.object({
        name: v.string(),
        unit: v.string(),
        minValue: v.optional(v.number()),
        maxValue: v.optional(v.number()),
      })),
    })),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_type", ["organizationId", "inspectionType"]),

  orgCounters: defineTable({
    orgId: v.string(),
    counterType: v.string(), // "invoice" | "quote" | "po" | "credit_memo" | "work_order:{BASE}"
    lastValue: v.number(),
  }).index("by_org_type", ["orgId", "counterType"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  //
  // Phase E: Document Attachment System
  //
  // Stores metadata for files attached to maintenance records, work orders,
  // discrepancies, and task cards. The actual file bytes live in Convex file
  // storage (ctx.storage); this table holds the pointer (storageId) and the
  // display/classification metadata.
  //
  // Polymorphic attachment: attachedToTable + attachedToId let a single table
  // handle attachments on any entity without per-entity junction tables.
  //
  // REGULATORY CONTEXT:
  //   FAA-approved data references (AMM pages, SB text, AD documents) must be
  //   traceable on the maintenance record. This table supports digital attachment
  //   of the approved data used, satisfying the documentation requirement under
  //   14 CFR Part 43.9(a)(4): "description of the work performed" must be
  //   sufficient to determine airworthiness.
  //
  // INVARIANT [documents.delete]:
  //   Documents attached to a closed work order or signed maintenance record
  //   should not be deleted. The delete mutation warns but does not hard-block
  //   (alpha scope) — this gate is v1.1.
  // ═══════════════════════════════════════════════════════════════════════════
  documents: defineTable({
    organizationId: v.id("organizations"),

    // Polymorphic FK — identifies which record this document is attached to
    attachedToTable: v.string(), // e.g. "workOrders", "discrepancies", "taskCards"
    attachedToId: v.string(),   // The _id of the record as a string

    // Convex file storage pointer
    storageId: v.id("_storage"),

    // File metadata
    fileName: v.string(),
    fileSize: v.number(),   // bytes
    mimeType: v.string(),   // e.g. "application/pdf", "image/jpeg"

    // Classification — helps FAA audit trail categorization
    documentType: v.union(
      v.literal("approved_data"),       // AMM, SRM, SB, CMM page — FAA-approved data
      v.literal("ad_document"),         // AD text / NPRM / final rule document
      v.literal("work_authorization"),  // Customer WO authorization / verbal auth record
      v.literal("photo"),               // Damage, installation, or inspection photo
      v.literal("parts_8130"),          // FAA Form 8130-3 / export airworthiness approval
      v.literal("vendor_invoice"),      // Parts vendor packing list or invoice
      v.literal("other"),               // Catch-all — fileName must be descriptive
    ),

    description: v.optional(v.string()), // Human-readable note about the document

    uploadedByUserId: v.string(),  // Clerk user ID of the uploader
    uploadedAt: v.number(),        // Unix ms
  })
    .index("by_attachment", ["attachedToTable", "attachedToId"])
    .index("by_org", ["organizationId"])
    .index("by_org_uploaded", ["organizationId", "uploadedAt"]),

  // Admin-managed checklist templates for in-dock and RTS evidence hubs.
  evidenceChecklistTemplates: defineTable({
    organizationId: v.id("organizations"),
    evidenceType: v.union(v.literal("in_dock"), v.literal("rts")),
    name: v.string(),
    items: v.array(v.string()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdByUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_type", ["organizationId", "evidenceType"]),

  // Work-order checklist instantiations + immutable completion audit fields.
  workOrderEvidenceChecklistItems: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    templateId: v.optional(v.id("evidenceChecklistTemplates")),
    evidenceType: v.union(v.literal("in_dock"), v.literal("rts")),
    bucketKey: v.union(
      v.literal("in_dock_checklist"),
      v.literal("in_dock_video"),
      v.literal("rts_checklist"),
      v.literal("rts_video"),
    ),
    label: v.string(),
    order: v.number(),
    completed: v.boolean(),
    completedByUserId: v.optional(v.string()),
    completedByTechnicianId: v.optional(v.id("technicians")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order_type", ["workOrderId", "evidenceType"])
    .index("by_work_order_bucket", ["workOrderId", "bucketKey"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFORMITY INSPECTIONS (Phase 1)
  //
  // Tracks buy-back, final, and in-process conformity inspections performed
  // by IA-qualified inspectors. Each inspection references a work order and
  // task card, records which steps were reviewed, and captures findings.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS (Phase 6)
  // In-app notification system for work order updates, billing events, etc.
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: defineTable({
    organizationId: v.id("organizations"),
    recipientUserId: v.string(),
    type: v.union(
      v.literal("wo_status_change"),
      v.literal("quote_approved"),
      v.literal("quote_declined"),
      v.literal("invoice_overdue"),
      v.literal("invoice_paid"),
      v.literal("discrepancy_critical"),
      v.literal("part_received"),
      v.literal("task_completed"),
      v.literal("rts_ready"),
      v.literal("assignment"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    linkTo: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient", ["recipientUserId", "createdAt"])
    .index("by_org", ["organizationId", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATION PREFERENCES (Phase 6)
  // Per-user toggle for each notification type.
  // ═══════════════════════════════════════════════════════════════════════════
  notificationPreferences: defineTable({
    userId: v.string(),
    organizationId: v.id("organizations"),
    disabledTypes: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  conformityInspections: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    inspectorTechnicianId: v.id("technicians"),
    inspectionType: v.union(v.literal("buy_back"), v.literal("final"), v.literal("in_process")),
    status: v.union(v.literal("pending"), v.literal("passed"), v.literal("failed"), v.literal("conditional")),
    findings: v.optional(v.string()),
    stepsReviewed: v.optional(v.array(v.id("taskCardSteps"))),
    approvedDataReference: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_task_card", ["taskCardId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // HANGAR BAYS — Phase 7 Scheduling
  //
  // Tracks physical hangar bays, ramp spots, and paint bays available for
  // aircraft maintenance. Used by the scheduling Gantt board and auto-scheduler.
  // ═══════════════════════════════════════════════════════════════════════════
  hangarBays: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("hangar"),
      v.literal("ramp"),
      v.literal("paint"),
    ),
    capacity: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("maintenance"),
    ),
    currentAircraftId: v.optional(v.id("aircraft")),
    currentWorkOrderId: v.optional(v.id("workOrders")),
    displayOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_status", ["organizationId", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULE SNAPSHOTS — MBP-0116: Schedule Baseline Comparison
  //
  // Stores point-in-time snapshots of the schedule for baseline comparison.
  // Each snapshot captures all active schedule assignments at save time.
  // ═══════════════════════════════════════════════════════════════════════════
  scheduleSnapshots: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    entries: v.array(v.object({
      workOrderId: v.string(),
      workOrderNumber: v.string(),
      hangarBayId: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      priority: v.string(),
      aircraftReg: v.optional(v.string()),
    })),
    createdAt: v.number(),
    createdByUserId: v.string(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICIAN TRAINING — Wave 3: Training-Based Constraints
  //
  // Per-technician training records for scheduling constraint validation.
  // Training types include FAR 91.411, 91.413, borescope, NDT, and custom.
  // Used by the magic scheduler to validate tech–task assignment eligibility.
  // ═══════════════════════════════════════════════════════════════════════════
  technicianTraining: defineTable({
    technicianId: v.id("technicians"),
    organizationId: v.string(),
    trainingType: v.string(),          // "91.411", "91.413", "borescope", "ndt", or custom
    completedAt: v.number(),           // Unix ms
    expiresAt: v.optional(v.number()), // Unix ms — undefined = never expires
    certificateRef: v.optional(v.string()), // Certificate/document reference
    createdAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING RECORDS — Phase 8 Training & Qualifications
  //
  // Tracks technician training completions, certifications, and expiry dates.
  // Supports compliance monitoring for FAA-required recurrent training.
  // ═══════════════════════════════════════════════════════════════════════════
  trainingRecords: defineTable({
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
    courseName: v.string(),
    courseType: v.union(
      v.literal("initial"),
      v.literal("recurrent"),
      v.literal("oem"),
      v.literal("regulatory"),
      v.literal("safety"),
      v.literal("hazmat"),
      v.literal("custom"),
    ),
    provider: v.optional(v.string()),
    completedAt: v.number(),
    expiresAt: v.optional(v.number()),
    certificateNumber: v.optional(v.string()),
    documentStorageId: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("current"),
      v.literal("expiring_soon"),
      v.literal("expired"),
    ),
    createdAt: v.number(),
  })
    .index("by_technician", ["technicianId", "createdAt"])
    .index("by_org", ["organizationId", "createdAt"])
    .index("by_org_expiry", ["organizationId", "expiresAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALIFICATION REQUIREMENTS — Phase 8 Training & Qualifications
  //
  // Defines what training courses are required for specific roles within the
  // organization. Used to calculate compliance status per technician.
  // ═══════════════════════════════════════════════════════════════════════════
  qualificationRequirements: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    requiredCourses: v.array(v.string()),
    recurrencyMonths: v.optional(v.number()),
    applicableRoles: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL RECORDS — Phase 8 Tool Crib Management
  //
  // Tracks tool inventory, check-out/check-in, and calibration status.
  // Supports calibration due alerts and tool assignment to work orders.
  // ═══════════════════════════════════════════════════════════════════════════
  toolRecords: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    toolNumber: v.string(),
    description: v.string(),
    serialNumber: v.optional(v.string()),
    category: v.union(
      v.literal("hand_tool"),
      v.literal("power_tool"),
      v.literal("test_equipment"),
      v.literal("special_tooling"),
      v.literal("consumable"),
    ),
    location: v.optional(v.string()),
    status: v.union(
      v.literal("available"),
      v.literal("in_use"),
      v.literal("calibration_due"),
      v.literal("out_for_calibration"),
      v.literal("retired"),
    ),
    calibrationRequired: v.boolean(),
    lastCalibrationDate: v.optional(v.number()),
    nextCalibrationDue: v.optional(v.number()),
    calibrationIntervalDays: v.optional(v.number()),
    calibrationProvider: v.optional(v.string()),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    assignedToWorkOrderId: v.optional(v.id("workOrders")),
    purchaseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_location_status", ["organizationId", "shopLocationId", "status"])
    .index("by_calibration_due", ["organizationId", "nextCalibrationDue"])
    .index("by_org_location_calibration_due", ["organizationId", "shopLocationId", "nextCalibrationDue"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENCY RATES — Multi-Currency Support
  // Stores exchange rates per organization for multi-currency billing.
  // ═══════════════════════════════════════════════════════════════════════════
  currencyRates: defineTable({
    organizationId: v.id("organizations"),
    fromCurrency: v.string(),   // ISO 4217 (e.g. "USD")
    toCurrency: v.string(),     // ISO 4217 (e.g. "EUR")
    rate: v.number(),           // 1 fromCurrency = rate toCurrency
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_pair", ["organizationId", "fromCurrency", "toCurrency"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL LOG — Tracks all outbound emails sent by the system
  // ═══════════════════════════════════════════════════════════════════════════
  emailLog: defineTable({
    to: v.string(),
    subject: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    stub: v.boolean(),
    errorMessage: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    relatedTable: v.optional(v.string()),
    relatedId: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_sentAt", ["sentAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // LABOR KITS — Reusable templates bundling labor tasks with associated parts
  // ═══════════════════════════════════════════════════════════════════════════
  laborKits: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    ataChapter: v.optional(v.string()),
    aircraftType: v.optional(v.string()),
    estimatedHours: v.number(),
    laborRate: v.optional(v.number()),
    laborItems: v.array(v.object({
      description: v.string(),
      estimatedHours: v.number(),
      skillRequired: v.optional(v.string()),
    })),
    requiredParts: v.array(v.object({
      partNumber: v.string(),
      description: v.string(),
      quantity: v.number(),
      unitCost: v.optional(v.number()),
    })),
    externalServices: v.optional(v.array(v.object({
      vendorName: v.optional(v.string()),
      description: v.string(),
      estimatedCost: v.number(),
    }))),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_aircraft", ["organizationId", "aircraftType"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY COUNTS — Physical inventory count sessions
  // ═══════════════════════════════════════════════════════════════════════════
  inventoryCounts: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("reconciled"),
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    countedBy: v.optional(v.id("technicians")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY COUNT ITEMS — Individual part count entries within a count session
  // ═══════════════════════════════════════════════════════════════════════════
  inventoryCountItems: defineTable({
    countId: v.id("inventoryCounts"),
    organizationId: v.id("organizations"),
    partId: v.id("parts"),
    partNumber: v.string(),
    partName: v.string(),
    expectedQuantity: v.number(),
    actualQuantity: v.optional(v.number()),
    variance: v.optional(v.number()),
    location: v.optional(v.string()),
    countedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_count", ["countId"])
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WARRANTY CLAIMS — Track warranty claims against parts, vendors, and OEMs
  // ═══════════════════════════════════════════════════════════════════════════
  warrantyClaims: defineTable({
    organizationId: v.id("organizations"),
    claimNumber: v.string(),
    workOrderId: v.optional(v.id("workOrders")),
    partId: v.optional(v.id("parts")),
    vendorId: v.optional(v.id("vendors")),
    customerId: v.optional(v.id("customers")),
    claimType: v.union(
      v.literal("part_defect"),
      v.literal("workmanship"),
      v.literal("oem_warranty"),
      v.literal("vendor_warranty"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("paid"),
      v.literal("closed"),
    ),
    description: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    originalInstallDate: v.optional(v.number()),
    failureDate: v.optional(v.number()),
    warrantyExpiresAt: v.optional(v.number()),
    claimedAmount: v.number(),
    approvedAmount: v.optional(v.number()),
    creditMemoId: v.optional(v.id("creditMemos")),
    resolution: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId", "createdAt"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_work_order", ["workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE TRACKING — Core exchange and credit tracking for rotable parts
  // ═══════════════════════════════════════════════════════════════════════════
  coreTracking: defineTable({
    organizationId: v.id("organizations"),
    coreNumber: v.string(),
    partId: v.id("parts"),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    status: v.union(
      v.literal("awaiting_return"),
      v.literal("received"),
      v.literal("inspected"),
      v.literal("credit_issued"),
      v.literal("scrapped"),
      v.literal("overdue"),
    ),
    vendorId: v.optional(v.id("vendors")),
    workOrderId: v.optional(v.id("workOrders")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    coreValue: v.number(),
    creditAmount: v.optional(v.number()),
    returnDueDate: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    inspectedAt: v.optional(v.number()),
    creditIssuedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId", "createdAt"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_vendor", ["vendorId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICKBOOKS SYNC — Integration sync log for QuickBooks Online
  // ═══════════════════════════════════════════════════════════════════════════
  quickbooksSync: defineTable({
    organizationId: v.id("organizations"),
    entityType: v.union(
      v.literal("invoice"),
      v.literal("payment"),
      v.literal("customer"),
      v.literal("vendor"),
      v.literal("item"),
    ),
    entityId: v.string(),
    qbId: v.optional(v.string()),
    syncStatus: v.union(
      v.literal("pending"),
      v.literal("synced"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    lastSyncAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICKBOOKS SETTINGS — Per-org QuickBooks connection settings
  // ═══════════════════════════════════════════════════════════════════════════
  quickbooksSettings: defineTable({
    organizationId: v.id("organizations"),
    isConnected: v.boolean(),
    companyName: v.optional(v.string()),
    realmId: v.optional(v.string()),
    syncInvoices: v.boolean(),
    syncPayments: v.boolean(),
    syncCustomers: v.boolean(),
    syncVendors: v.boolean(),
    autoSync: v.boolean(),
    lastFullSyncAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASE CERTIFICATES (FAA 8130-3 / EASA Form 1)
  // Generated for completed repairs to release components back to service.
  // ═══════════════════════════════════════════════════════════════════════════
  releaseCertificates: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    partId: v.optional(v.id("parts")),
    formType: v.union(v.literal("faa_8130"), v.literal("easa_form1")),
    certificateNumber: v.string(),
    partDescription: v.string(),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    quantity: v.number(),
    workPerformed: v.string(),
    condition: v.string(),
    remarks: v.string(),
    inspectorTechnicianId: v.id("technicians"),
    inspectorName: v.string(),
    approvalNumber: v.string(),
    organizationName: v.string(),
    organizationAddress: v.optional(v.string()),
    repairStationCertNumber: v.optional(v.string()),
    signatureDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_workOrder", ["workOrderId"])
    .index("by_certNumber", ["organizationId", "certificateNumber"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // OTC SALES — Over-the-counter walk-in sales
  // ═══════════════════════════════════════════════════════════════════════════
  otcSales: defineTable({
    organizationId: v.id("organizations"),
    receiptNumber: v.string(),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    subtotal: v.number(),
    taxRate: v.number(),
    taxAmount: v.number(),
    total: v.number(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("account"),
      v.literal("check"),
    ),
    notes: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("voided")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_receipt", ["organizationId", "receiptNumber"]),

  otcSaleItems: defineTable({
    otcSaleId: v.id("otcSales"),
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),
    description: v.string(),
    partNumber: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(),
    lineTotal: v.number(),
    createdAt: v.number(),
  })
    .index("by_sale", ["otcSaleId"])
    .index("by_organization", ["organizationId"]),

  // === SHIPPING & RECEIVING ===
  shipments: defineTable({
    organizationId: v.id("organizations"),
    shipmentNumber: v.string(),
    type: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(v.literal("pending"), v.literal("in_transit"), v.literal("delivered"), v.literal("cancelled")),
    carrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number()),
    actualDelivery: v.optional(v.number()),
    shippedDate: v.optional(v.number()),
    // Origin/destination
    originName: v.optional(v.string()),
    originAddress: v.optional(v.string()),
    destinationName: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
    // Related records
    workOrderId: v.optional(v.id("workOrders")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    customerId: v.optional(v.id("customers")),
    vendorId: v.optional(v.id("vendors")),
    // Costs
    shippingCost: v.optional(v.number()),
    insuranceValue: v.optional(v.number()),
    // BOL
    bolNumber: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    hazmat: v.optional(v.boolean()),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_tracking", ["organizationId", "trackingNumber"])
    .index("by_workOrder", ["workOrderId"])
    .index("by_purchaseOrder", ["purchaseOrderId"]),

  shipmentItems: defineTable({
    shipmentId: v.id("shipments"),
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),
    partNumber: v.string(),
    description: v.string(),
    serialNumber: v.optional(v.string()),
    quantity: v.number(),
    condition: v.optional(v.union(v.literal("new"), v.literal("serviceable"), v.literal("unserviceable"), v.literal("as_removed"))),
    traceDoc: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_shipment", ["shipmentId"])
    .index("by_organization", ["organizationId"]),

  // === ROTABLE MANAGEMENT ===
  rotables: defineTable({
    organizationId: v.id("organizations"),
    shopLocationId: v.optional(v.id("shopLocations")),
    partNumber: v.string(),
    serialNumber: v.string(),
    description: v.string(),
    status: v.union(v.literal("installed"), v.literal("serviceable"), v.literal("in_shop"), v.literal("at_vendor"), v.literal("condemned"), v.literal("loaned_out")),
    condition: v.union(v.literal("serviceable"), v.literal("unserviceable"), v.literal("overhauled"), v.literal("repaired"), v.literal("inspected")),
    aircraftId: v.optional(v.id("aircraft")),
    positionCode: v.optional(v.string()),
    tsnHours: v.optional(v.number()),
    tsnCycles: v.optional(v.number()),
    tsoHours: v.optional(v.number()),
    tsoCycles: v.optional(v.number()),
    tsiHours: v.optional(v.number()),
    tsiCycles: v.optional(v.number()),
    // Limits
    tboHours: v.optional(v.number()),
    tboCycles: v.optional(v.number()),
    shelfLifeExpiry: v.optional(v.number()),
    // Financial
    purchasePrice: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    coreValue: v.optional(v.number()),
    // Vendor
    lastOverhaulVendor: v.optional(v.string()),
    lastOverhaulDate: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    // Docs
    traceDocFileId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_location", ["organizationId", "shopLocationId"])
    .index("by_partSerial", ["organizationId", "partNumber", "serialNumber"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"]),

  rotableHistory: defineTable({
    rotableId: v.id("rotables"),
    organizationId: v.id("organizations"),
    action: v.union(v.literal("installed"), v.literal("removed"), v.literal("sent_to_vendor"), v.literal("received_from_vendor"), v.literal("overhauled"), v.literal("condemned"), v.literal("loaned"), v.literal("returned")),
    fromAircraftId: v.optional(v.id("aircraft")),
    toAircraftId: v.optional(v.id("aircraft")),
    workOrderId: v.optional(v.id("workOrders")),
    hoursAtAction: v.optional(v.number()),
    cyclesAtAction: v.optional(v.number()),
    notes: v.optional(v.string()),
    performedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_rotable", ["rotableId"])
    .index("by_organization", ["organizationId"]),

  // === RENTAL / LOANER TRACKING ===
  loanerItems: defineTable({
    organizationId: v.id("organizations"),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    status: v.union(v.literal("available"), v.literal("loaned_out"), v.literal("maintenance"), v.literal("retired")),
    // Current loan
    loanedToCustomerId: v.optional(v.id("customers")),
    loanedToWorkOrderId: v.optional(v.id("workOrders")),
    loanedDate: v.optional(v.number()),
    expectedReturnDate: v.optional(v.number()),
    actualReturnDate: v.optional(v.number()),
    dailyRate: v.optional(v.number()),
    // Condition
    conditionOut: v.optional(v.string()),
    conditionIn: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_customer", ["loanedToCustomerId"]),

  loanerHistory: defineTable({
    loanerItemId: v.id("loanerItems"),
    organizationId: v.id("organizations"),
    action: v.union(v.literal("loaned"), v.literal("returned"), v.literal("extended"), v.literal("damaged")),
    customerId: v.optional(v.id("customers")),
    workOrderId: v.optional(v.id("workOrders")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_item", ["loanerItemId"])
    .index("by_organization", ["organizationId"]),

  // === MULTI-SHOP / MULTI-LOCATION ===
  shopLocations: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    repairStationCertificateNumber: v.optional(v.string()),
    certificateType: v.optional(v.union(v.literal("part_145"), v.literal("part_135"), v.literal("part_121"), v.literal("part_91"))),
    capabilities: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    isPrimary: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_code", ["organizationId", "code"]),

  // === LEAD ASSIGNMENTS ===
  // Lead/team assignment records for work orders, task cards, and task steps.
  leadAssignments: defineTable({
    organizationId: v.id("organizations"),
    entityType: v.union(
      v.literal("work_order"),
      v.literal("task_card"),
      v.literal("task_step"),
    ),
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskStepId: v.optional(v.id("taskCardSteps")),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    assignedTeamName: v.optional(v.string()),
    assignmentNote: v.optional(v.string()),
    assignedByTechnicianId: v.id("technicians"),
    isActive: v.boolean(),
    assignedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_entity", ["organizationId", "entityType"])
    .index("by_org_assignee", ["organizationId", "assignedToTechnicianId"])
    .index("by_org_work_order", ["organizationId", "workOrderId"])
    .index("by_org_task_card", ["organizationId", "taskCardId"])
    .index("by_org_task_step", ["organizationId", "taskStepId"]),

  // === TURNOVER REPORTS ===
  // Draft/submitted handoff reports owned by lead technicians.
  turnoverReports: defineTable({
    organizationId: v.id("organizations"),
    reportDate: v.string(), // YYYY-MM-DD (shop local date)
    windowStartAt: v.number(),
    windowEndAt: v.number(),
    status: v.union(v.literal("draft"), v.literal("submitted")),
    leadTechnicianId: v.id("technicians"),
    selectedWorkOrderIds: v.array(v.id("workOrders")),
    summaryText: v.optional(v.string()),
    aiDraftSummary: v.optional(v.string()),
    leadNotes: v.optional(v.string()),
    upcomingDeadlinesNotes: v.optional(v.string()),
    partsOrderedSummary: v.optional(v.string()),
    partsReceivedSummary: v.optional(v.string()),
    timeAppliedMinutes: v.number(),
    shopWorkOrderMinutes: v.number(),
    personBreakdown: v.array(v.object({
      technicianId: v.optional(v.id("technicians")),
      technicianName: v.string(),
      minutes: v.number(),
      notes: v.optional(v.string()),
    })),
    teamBreakdown: v.array(v.object({
      teamName: v.string(),
      minutes: v.number(),
      notes: v.optional(v.string()),
    })),
    workOrderNotes: v.array(v.object({
      workOrderId: v.id("workOrders"),
      workOrderNumber: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    submittedAt: v.optional(v.number()),
    submittedByTechnicianId: v.optional(v.id("technicians")),
    submissionSignature: v.optional(v.object({
      signedName: v.string(),
      signedRole: v.optional(v.string()),
      signedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_date", ["organizationId", "reportDate"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_lead", ["organizationId", "leadTechnicianId"])
    .index("by_org_submitted_at", ["organizationId", "submittedAt"]),

  // === PREDICTIVE MAINTENANCE ===
  maintenancePredictions: defineTable({
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    predictionType: v.union(v.literal("time_based"), v.literal("usage_based"), v.literal("trend_based"), v.literal("condition_based")),
    predictedDate: v.number(),
    confidence: v.number(), // 0-100
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.string(),
    recommendation: v.optional(v.string()),
    basedOn: v.optional(v.string()), // data source description
    status: v.union(v.literal("active"), v.literal("acknowledged"), v.literal("scheduled"), v.literal("dismissed"), v.literal("resolved")),
    acknowledgedBy: v.optional(v.string()),
    resolvedDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_aircraft", ["organizationId", "aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_severity", ["organizationId", "severity"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CARRY-FORWARD ITEMS (Wave 5)
  // Deferred maintenance items captured when closing a work order.
  // ═══════════════════════════════════════════════════════════════════════════
  carryForwardItems: defineTable({
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    sourceWorkOrderId: v.id("workOrders"),
    description: v.string(),
    category: v.union(
      v.literal("deferred_maintenance"),
      v.literal("note"),
      v.literal("ad_tracking"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    status: v.union(
      v.literal("open"),
      v.literal("consumed"),
      v.literal("dismissed"),
    ),
    createdAt: v.number(),
    consumedByQuoteId: v.optional(v.id("quotes")),
    consumedByWorkOrderId: v.optional(v.id("workOrders")),
    dismissedReason: v.optional(v.string()),
  })
    .index("by_aircraft", ["aircraftId", "status"])
    .index("by_org", ["organizationId", "status"]),

  // === TASK ASSIGNMENTS (Wave 6: WO Execution Gantt) ===
  taskAssignments: defineTable({
    workOrderId: v.id("workOrders"),
    taskCardId: v.id("taskCards"),
    technicianId: v.id("technicians"),
    organizationId: v.string(),
    shopLocationId: v.optional(v.id("shopLocations")),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    actualHoursLogged: v.optional(v.number()),
    percentComplete: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("complete"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workOrder", ["workOrderId"])
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"]),

  // ─── Task Assignment Dependencies ──────────────────────────────────────────
  // Links between task assignments within a work order to enforce sequencing.
  // Supports all four standard Gantt dependency types (FS/SS/FF/SF).
  // Used by the WO Execution Gantt for dependency arrow rendering and
  // scheduling constraint enforcement.
  // ──────────────────────────────────────────────────────────────────────────
  taskAssignmentDependencies: defineTable({
    workOrderId: v.id("workOrders"),
    organizationId: v.string(),
    predecessorId: v.id("taskAssignments"),
    successorId: v.id("taskAssignments"),
    type: v.union(
      v.literal("FS"), // Finish-to-Start (default, most common)
      v.literal("SS"), // Start-to-Start
      v.literal("FF"), // Finish-to-Finish
      v.literal("SF"), // Start-to-Finish (rare)
    ),
    lagMinutes: v.optional(v.number()), // delay between linked tasks (negative = lead)
    createdAt: v.number(),
  })
    .index("by_workOrder", ["workOrderId"])
    .index("by_org", ["organizationId", "workOrderId"])
    .index("by_predecessor", ["predecessorId"])
    .index("by_successor", ["successorId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // LOTS / BATCH TRACKING  (Inventory System v10)
  //
  // Tracks batches of parts under a single certificate of conformity.
  // A lot represents a group of identical parts (same P/N) received together
  // from a vendor, covered by the same CoC/8130-3 documentation.
  //
  // Example: 500 AN3-4A bolts arrive with one CoC — that's one lot record.
  // As bolts are issued to work orders, remainingQuantity decrements.
  // ═══════════════════════════════════════════════════════════════════════════
  lots: defineTable({
    organizationId: v.id("organizations"),
    lotNumber: v.string(),                          // Unique within org, e.g. "LOT-2026-00142"
    batchNumber: v.optional(v.string()),             // Manufacturer batch/heat number
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),

    // Certification linkage
    certificateOfConformityId: v.optional(v.id("documents")),     // FK to documents table (CoC PDF)
    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")), // 8130-3 tag for this lot

    // Quantities
    originalQuantity: v.number(),       // Total qty on the CoC at receipt
    receivedQuantity: v.number(),       // Qty actually received (may differ from original)
    issuedQuantity: v.number(),         // Qty issued to work orders
    remainingQuantity: v.number(),      // receivedQuantity - issuedQuantity

    // Source tracking
    vendorId: v.optional(v.id("vendors")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    receivedDate: v.number(),
    receivedByUserId: v.string(),       // Clerk user ID of receiver

    // Shelf life (lot-level — many consumables expire by lot)
    hasShelfLife: v.boolean(),
    shelfLifeExpiryDate: v.optional(v.number()),

    // Condition
    condition: v.union(
      v.literal("new"),
      v.literal("serviceable"),
      v.literal("quarantine"),
      v.literal("expired"),
      v.literal("depleted"),            // remainingQuantity === 0
    ),

    notes: v.optional(v.string()),

    // v11: Relational warehouse location (Warehouse Hierarchy)
    binLocationId: v.optional(v.id("warehouseBins")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_part", ["organizationId", "partNumber"])
    .index("by_lot_number", ["organizationId", "lotNumber"])
    .index("by_shelf_life", ["hasShelfLife", "shelfLifeExpiryDate"])
    .index("by_org_bin", ["organizationId", "binLocationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PART HISTORY  (Inventory System v10)
  //
  // Append-only event log for every part lifecycle transition.
  // This is the "provenance chain" — the complete story of where a part
  // came from, where it's been, and who touched it. Required for FAA
  // traceability per 14 CFR 43.9 and AC 20-62E.
  //
  // INVARIANT [partHistory.append_only]:
  //   Records in this table are NEVER updated or deleted.
  //   Every state change creates a new record.
  // ═══════════════════════════════════════════════════════════════════════════
  partHistory: defineTable({
    organizationId: v.id("organizations"),
    partId: v.id("parts"),

    eventType: v.union(
      v.literal("received"),              // Part received into facility
      v.literal("inspected"),             // Receiving inspection completed
      v.literal("stocked"),               // Moved to inventory (issuable)
      v.literal("moved"),                 // Bin/location change
      v.literal("reserved"),              // Reserved for a work order
      v.literal("reservation_released"),  // Reservation cancelled
      v.literal("issued_to_wo"),          // Issued from inventory to work order
      v.literal("returned_from_wo"),      // Returned unused from work order
      v.literal("installed"),             // Installed on aircraft/engine
      v.literal("removed"),               // Removed from aircraft/engine
      v.literal("sent_to_vendor"),        // Sent out for repair/overhaul
      v.literal("received_from_vendor"),  // Returned from vendor
      v.literal("quarantined"),           // Moved to quarantine
      v.literal("scrapped"),              // Condemned/scrapped
      v.literal("condition_changed"),     // Condition status updated
      v.literal("cost_updated"),          // Valuation changed
      v.literal("document_attached"),     // Conformity doc linked
      v.literal("shelf_life_alert"),      // Shelf life warning triggered
    ),

    // Context references (all optional — depends on event type)
    workOrderId: v.optional(v.id("workOrders")),
    aircraftId: v.optional(v.id("aircraft")),
    vendorId: v.optional(v.id("vendors")),
    shipmentId: v.optional(v.id("shipments")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    lotId: v.optional(v.id("lots")),

    // Change tracking
    fromLocation: v.optional(v.string()),
    toLocation: v.optional(v.string()),
    fromCondition: v.optional(v.string()),
    toCondition: v.optional(v.string()),

    // Who and when
    performedByUserId: v.string(),        // Clerk user ID
    performedByTechnicianId: v.optional(v.id("technicians")),
    notes: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_part", ["partId"])
    .index("by_org", ["organizationId"])
    .index("by_part_type", ["partId", "eventType"])
    .index("by_work_order", ["workOrderId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PART DOCUMENTS  (Inventory System v10)
  //
  // Junction table linking conformity documents to parts and/or lots.
  // Each document has a role (CoC, CoA, 8130-3, test report, etc.) that
  // classifies what kind of conformity evidence it provides.
  //
  // A single document can be linked to multiple parts (e.g., one CoC
  // covers an entire lot). A single part can have multiple documents
  // (e.g., CoC + test report + photo of dataplate).
  // ═══════════════════════════════════════════════════════════════════════════
  partDocuments: defineTable({
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),    // FK to part (optional if lot-level)
    lotId: v.optional(v.id("lots")),      // FK to lot (optional if part-level)
    documentId: v.id("documents"),        // FK to documents table (file storage)

    documentRole: v.union(
      v.literal("certificate_of_conformity"),     // CoC from manufacturer
      v.literal("certificate_of_airworthiness"),  // CoA / FAA Form 8100-2
      v.literal("test_report"),                   // Lab/test results
      v.literal("8130_3_tag"),                    // FAA Form 8130-3 scan/PDF
      v.literal("receiving_inspection_report"),   // Internal receiving inspection
      v.literal("vendor_invoice"),                // Vendor invoice/receipt
      v.literal("packing_slip"),                  // Shipping packing slip
      v.literal("material_certification"),        // Material/chemical cert
      v.literal("spec_sheet"),                    // Specification/data sheet
      v.literal("photo"),                         // Photo of part/dataplate/packaging
      v.literal("other"),
    ),

    description: v.optional(v.string()),
    linkedByUserId: v.string(),           // Clerk user ID
    linkedAt: v.number(),
  })
    .index("by_part", ["partId"])
    .index("by_lot", ["lotId"])
    .index("by_document", ["documentId"])
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WORK ORDER PARTS  (Inventory System v10)
  //
  // Persistent tracking of parts requested, ordered, issued, installed,
  // and returned for each work order. Replaces the previous localStorage-
  // based parts request system with full backend state management.
  //
  // Lifecycle: requested → ordered → received → issued → installed
  //                                                    → returned
  //                                         → cancelled
  //
  // Financial fields support cost tracking and markup for billing.
  // ═══════════════════════════════════════════════════════════════════════════
  workOrderParts: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    partId: v.optional(v.id("parts")),    // FK when part exists in inventory

    // Part identification (may exist before a parts record is created)
    partNumber: v.string(),
    partName: v.string(),
    serialNumber: v.optional(v.string()),

    // Request lifecycle
    status: v.union(
      v.literal("requested"),     // Technician needs this part
      v.literal("ordered"),       // PO has been created
      v.literal("received"),      // Part arrived at facility
      v.literal("issued"),        // Issued from inventory to WO
      v.literal("installed"),     // Installed on aircraft
      v.literal("returned"),      // Returned unused to inventory
      v.literal("cancelled"),     // Request cancelled
    ),

    quantityRequested: v.number(),
    quantityIssued: v.number(),
    quantityReturned: v.number(),

    // Source references
    requestedByTechnicianId: v.optional(v.id("technicians")),
    issuedByTechnicianId: v.optional(v.id("technicians")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    lotId: v.optional(v.id("lots")),

    // Financial
    unitCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    markupPercent: v.optional(v.number()),
    billableAmount: v.optional(v.number()),

    // Timestamps per status transition
    requestedAt: v.number(),
    orderedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    issuedAt: v.optional(v.number()),
    installedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_part", ["partId"]),

  // ==========================================
  // OJT TRAINING JACKET SYSTEM (9 tables)
  // ==========================================

  // Curriculum definitions per aircraft type
  ojtCurricula: defineTable({
    organizationId: v.string(),
    aircraftType: v.string(), // e.g. "TBM", "King Air B200"
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdByTechnicianId: v.optional(v.id("technicians")),
    // Which sign-off model: "progression_4stage" (observe->assist->supervised->evaluated)
    // or "repetition_5col" (4 instructor observations + 1 authorization/test)
    signOffModel: v.optional(v.union(v.literal("progression_4stage"), v.literal("repetition_5col"))),
    version: v.optional(v.string()), // OJT log version, e.g. "2.1"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_aircraft", ["organizationId", "aircraftType"])
    .index("by_org_active", ["organizationId", "isActive"]),

  // Sections within a curriculum (Initial, Basics, Intermediate, Advanced, Specialties)
  ojtCurriculumSections: defineTable({
    organizationId: v.string(),
    curriculumId: v.id("ojtCurricula"),
    name: v.string(), // "Initial Training", "Basic Tasks", "Specializations", etc.
    description: v.optional(v.string()),
    displayOrder: v.number(),
    // One-level nesting for specialization sub-groups (Engine, Sheet Metal, etc.)
    parentSectionId: v.optional(v.id("ojtCurriculumSections")),
    // Drives UI rendering: standard=multi-stage tasks, authorization=binary capabilities,
    // procedural=checklist items, reference=info only
    sectionType: v.optional(v.union(
      v.literal("standard"),
      v.literal("authorization"),
      v.literal("procedural"),
      v.literal("reference"),
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_curriculum", ["curriculumId"])
    .index("by_org", ["organizationId"])
    .index("by_parent", ["parentSectionId"]),

  // Individual trainable tasks within a section
  ojtTasks: defineTable({
    organizationId: v.string(),
    curriculumId: v.id("ojtCurricula"),
    sectionId: v.id("ojtCurriculumSections"),
    ataChapter: v.string(), // "71", "28", "GEN", "INSP", "Shop"
    description: v.string(),
    approvedDataRef: v.optional(v.string()), // AMM section reference
    isSharedAcrossTypes: v.boolean(), // reusable across aircraft curricula
    estimatedMinutes: v.optional(v.number()),
    displayOrder: v.number(),
    // Proficiency tier for tasks that repeat across sections (Basic -> Intermediate)
    proficiencyTier: v.optional(v.union(
      v.literal("initial"),
      v.literal("basic"),
      v.literal("intermediate"),
      v.literal("advanced"),
      v.literal("specialization"),
    )),
    // Number of sign-off columns required (default: 5 for repetition, 4 for progression)
    requiredSignOffs: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_curriculum", ["curriculumId"])
    .index("by_section", ["sectionId"])
    .index("by_org", ["organizationId"])
    .index("by_org_ata", ["organizationId", "ataChapter"]),

  // Per-technician per-curriculum training jacket
  ojtJackets: defineTable({
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    curriculumId: v.id("ojtCurricula"),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("fully_qualified"), v.literal("suspended")),
    startedAt: v.optional(v.number()),
    qualifiedAt: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_curriculum", ["curriculumId"])
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_tech_curriculum", ["technicianId", "curriculumId"]),

  // APPEND-ONLY sign-off events (audit-immutable)
  ojtStageEvents: defineTable({
    organizationId: v.string(),
    jacketId: v.id("ojtJackets"),
    taskId: v.id("ojtTasks"),
    technicianId: v.id("technicians"),
    stage: v.union(
      // Progression model (4-stage)
      v.literal("observe"), v.literal("assist"), v.literal("supervised"), v.literal("evaluated"),
      // Repetition model (5-column): columns 1-4 instructor, column 5 authorization
      v.literal("instructor_completion"), v.literal("authorization_test"),
    ),
    trainerId: v.id("technicians"),
    trainerCertificateSnapshot: v.optional(v.string()), // cert info at time of sign-off
    approvedDataRef: v.optional(v.string()),
    trainingMethod: v.optional(v.string()), // "hands-on", "classroom", "CBT"
    actualMinutes: v.optional(v.number()),
    techSignedAt: v.optional(v.number()),
    trainerSignedAt: v.optional(v.number()),
    chiefInspectorId: v.optional(v.id("technicians")),
    chiefInspectorSignedAt: v.optional(v.number()),
    // For repetition_5col model: which column (1-5) this event fills
    columnNumber: v.optional(v.number()),
    isAuthorizationSignOff: v.optional(v.boolean()), // true for column 5
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_jacket", ["jacketId"])
    .index("by_task", ["taskId"])
    .index("by_technician", ["technicianId"])
    .index("by_trainer", ["trainerId"])
    .index("by_org", ["organizationId"])
    .index("by_jacket_task", ["jacketId", "taskId"]),

  // Trainer authorization records
  ojtTrainerAuthorizations: defineTable({
    organizationId: v.string(),
    technicianId: v.id("technicians"), // who is authorized to train
    scope: v.union(v.literal("task"), v.literal("section"), v.literal("curriculum"), v.literal("all")),
    scopeRefId: v.optional(v.string()), // ID of task/section/curriculum if scoped
    grantedByTechnicianId: v.id("technicians"),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    revokedByTechnicianId: v.optional(v.id("technicians")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"])
    .index("by_org_tech", ["organizationId", "technicianId"]),

  // OKR / training goals
  ojtTrainingGoals: defineTable({
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    setByTechnicianId: v.id("technicians"), // lead/manager who set the goal
    period: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")),
    periodStart: v.number(),
    periodEnd: v.number(),
    targetType: v.union(v.literal("stages_completed"), v.literal("tasks_completed"), v.literal("hours_trained")),
    targetValue: v.number(),
    actualValue: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("missed"), v.literal("cancelled")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"])
    .index("by_org_period", ["organizationId", "period"]),

  // Binary capability authorizations (towing, engine run, etc.) per jacket
  ojtAuthorizations: defineTable({
    organizationId: v.string(),
    jacketId: v.id("ojtJackets"),
    technicianId: v.id("technicians"),
    curriculumId: v.id("ojtCurricula"),
    capabilityKey: v.string(), // e.g. "aircraft_towing", "engine_run"
    capabilityLabel: v.string(), // "Aircraft Towing"
    displayOrder: v.number(),
    isGranted: v.boolean(),
    grantedAt: v.optional(v.number()),
    grantedByTechnicianId: v.optional(v.id("technicians")),
    grantedByName: v.optional(v.string()), // snapshot of grantor name
    revokedAt: v.optional(v.number()),
    revokedByTechnicianId: v.optional(v.id("technicians")),
    revokedReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_jacket", ["jacketId"])
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"])
    .index("by_jacket_capability", ["jacketId", "capabilityKey"]),

  // Personnel OJT enrollment tracking (Work Roster)
  ojtEnrollmentRoster: defineTable({
    organizationId: v.string(),
    technicianId: v.id("technicians"),
    isEnrolledInOjt: v.boolean(),
    lastDigitalUpdate: v.optional(v.number()),
    hasOjtLogConverted: v.optional(v.boolean()),
    ojtLogVersion: v.optional(v.string()), // e.g. "1.4", "1.5"
    personnelCategory: v.optional(v.union(
      v.literal("mechanic"),
      v.literal("avionics"),
      v.literal("detailer"),
      v.literal("inspection"),
      v.literal("admin"),
      v.literal("management"),
      v.literal("test_pilot"),
    )),
    locationCode: v.optional(v.string()), // "BJC", "CMA"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_technician", ["technicianId"])
    .index("by_org_enrolled", ["organizationId", "isEnrolledInOjt"]),

  // ==========================================
  // MAINTENANCE PROGRAMS (Chapter 5 intervals)
  // ==========================================

  maintenancePrograms: defineTable({
    organizationId: v.string(),
    aircraftType: v.string(),
    serialNumberScope: v.union(v.literal("all"), v.literal("specific")),
    specificSerials: v.optional(v.array(v.string())),
    taskName: v.string(),
    ataChapter: v.string(),
    approvedDataRef: v.optional(v.string()),
    calendarIntervalDays: v.optional(v.number()),
    hourInterval: v.optional(v.number()),
    cycleInterval: v.optional(v.number()),
    triggerLogic: v.union(v.literal("first"), v.literal("greater")),
    isPhaseInspection: v.boolean(),
    phaseNumber: v.optional(v.number()),
    requiredPartsTemplate: v.optional(v.array(v.string())),
    estimatedLaborHours: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_aircraft", ["organizationId", "aircraftType"])
    .index("by_org_ata", ["organizationId", "ataChapter"]),

  // ==========================================
  // VOICE NOTES (Convex-persisted audio + transcripts)
  // ==========================================

  voiceNotes: defineTable({
    organizationId: v.string(),
    workOrderId: v.optional(v.id("workOrders")),
    taskCardId: v.optional(v.id("taskCards")),
    taskCardStepId: v.optional(v.id("taskCardSteps")),
    technicianId: v.id("technicians"),
    audioStorageId: v.optional(v.id("_storage")),
    audioDurationSeconds: v.optional(v.number()),
    transcript: v.optional(v.string()),
    transcriptionStatus: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("manual")),
    transcribedAt: v.optional(v.number()),
    isEdited: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_task_card", ["taskCardId"])
    .index("by_technician", ["technicianId"])
    .index("by_org", ["organizationId"]),

  // ==========================================
  // ADS-B FLIGHT TRACKING
  // ==========================================

  adsbFlightSessions: defineTable({
    organizationId: v.string(),
    aircraftId: v.id("aircraft"),
    nNumber: v.string(),
    departureTimestamp: v.number(),
    arrivalTimestamp: v.number(),
    clockDurationMinutes: v.number(),
    estimatedTachHours: v.optional(v.number()),
    departureAirport: v.optional(v.string()),
    arrivalAirport: v.optional(v.string()),
    cycleCount: v.number(), // takeoffs detected
    dataSource: v.union(v.literal("flightaware"), v.literal("adsbexchange"), v.literal("opensky"), v.literal("manual")),
    rawPayload: v.optional(v.string()), // JSON blob for audit
    createdAt: v.number(),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_org", ["organizationId"])
    .index("by_aircraft_departure", ["aircraftId", "departureTimestamp"]),

  adsbSyncState: defineTable({
    organizationId: v.string(),
    aircraftId: v.id("aircraft"),
    lastSyncTimestamp: v.number(),
    lastKnownIcao24Hex: v.optional(v.string()),
    adsbTachCorrectionFactor: v.optional(v.number()), // e.g. 0.92
    syncStatus: v.union(v.literal("active"), v.literal("paused"), v.literal("error")),
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_org", ["organizationId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // FILES (MBP-0063 — File Storage Integration)
  //
  // Generic file storage metadata table. Files can be linked to any entity
  // via linkedEntityType + linkedEntityId. Used for step sign-off photos
  // (linkedEntityType: "taskCardStep"), discrepancy evidence photos
  // (linkedEntityType: "discrepancy"), and general document attachments.
  //
  // File bytes live in Convex built-in storage (ctx.storage); this table
  // holds the pointer (storageId) and display/classification metadata.
  // ═══════════════════════════════════════════════════════════════════════════
  files: defineTable({
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),       // bytes
    storageId: v.id("_storage"),
    organizationId: v.id("organizations"),
    linkedEntityType: v.string(), // e.g. "taskCardStep", "discrepancy", "workOrder"
    linkedEntityId: v.string(),   // The _id of the linked record as a string
    uploadedByUserId: v.string(), // Clerk user ID
    uploadedAt: v.number(),       // Unix ms
  })
    .index("by_entity", ["linkedEntityType", "linkedEntityId"])
    .index("by_org", ["organizationId"])
    .index("by_org_uploaded", ["organizationId", "uploadedAt"]),

  // ==========================================
  // CRM MODULE — Contacts, Interactions, Opportunities, Health
  // Added for Corridor/EBIS 5 feature parity
  // ==========================================

  crmContacts: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    firstName: v.string(),
    lastName: v.string(),
    title: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("owner"),
      v.literal("dom"),
      v.literal("chief_pilot"),
      v.literal("ap_manager"),
      v.literal("operations"),
      v.literal("dispatcher"),
      v.literal("other"),
    )),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    isPrimary: v.boolean(),
    receiveStatusUpdates: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    active: v.boolean(),
    lastContactedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_organization_and_customer", ["organizationId", "customerId"]),

  crmInteractions: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    contactId: v.optional(v.id("crmContacts")),
    type: v.union(
      v.literal("phone_call"),
      v.literal("email"),
      v.literal("meeting"),
      v.literal("site_visit"),
      v.literal("note"),
    ),
    direction: v.optional(v.union(
      v.literal("inbound"),
      v.literal("outbound"),
    )),
    subject: v.string(),
    description: v.optional(v.string()),
    outcome: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    interactionDate: v.number(),
    followUpDate: v.optional(v.number()),
    followUpCompleted: v.optional(v.boolean()),
    createdByUserId: v.string(),
    createdByName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_organization_and_customer", ["organizationId", "customerId"])
    .index("by_organization_and_type", ["organizationId", "type"])
    .index("by_organization_and_interactionDate", ["organizationId", "interactionDate"]),

  crmOpportunities: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    aircraftId: v.optional(v.id("aircraft")),
    predictionId: v.optional(v.id("maintenancePredictions")),
    title: v.string(),
    description: v.optional(v.string()),
    stage: v.union(
      v.literal("prospecting"),
      v.literal("qualification"),
      v.literal("proposal"),
      v.literal("negotiation"),
      v.literal("won"),
      v.literal("lost"),
    ),
    estimatedValue: v.number(),
    estimatedLaborHours: v.optional(v.number()),
    probability: v.optional(v.number()),
    expectedCloseDate: v.optional(v.number()),
    actualCloseDate: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    wonWorkOrderId: v.optional(v.id("workOrders")),
    wonQuoteId: v.optional(v.id("quotes")),
    assignedToUserId: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("prediction"),
      v.literal("referral"),
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("website"),
      v.literal("trade_show"),
      v.literal("existing_customer"),
      v.literal("other"),
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_stage", ["organizationId", "stage"])
    .index("by_organization_and_customer", ["organizationId", "customerId"])
    .index("by_prediction", ["predictionId"]),

  crmHealthSnapshots: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    overallScore: v.number(),
    factors: v.object({
      woFrequency: v.number(),
      paymentTimeliness: v.number(),
      fleetSize: v.number(),
      contractValue: v.number(),
      communicationFrequency: v.number(),
      recencyOfWork: v.number(),
    }),
    churnRiskLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    snapshotDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_organization_and_customer", ["organizationId", "customerId"]),

  crmProspectCampaignAssessments: defineTable({
    organizationId: v.id("organizations"),
    prospectEntityId: v.string(),
    prospectLegalName: v.string(),
    campaignKey: v.string(),
    campaignName: v.string(),
    campaignFit: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("unknown"),
    ),
    qualificationStatus: v.union(
      v.literal("unreviewed"),
      v.literal("qualified"),
      v.literal("nurture"),
      v.literal("research"),
      v.literal("disqualified"),
    ),
    fitScore: v.optional(v.number()),
    contactStrategy: v.optional(v.union(
      v.literal("call_first"),
      v.literal("email_first"),
      v.literal("multi_touch"),
      v.literal("warm_intro"),
      v.literal("research_first"),
      v.literal("site_visit"),
      v.literal("other"),
    )),
    notes: v.optional(v.string()),
    nextStep: v.optional(v.string()),
    selectedOutreachTier: v.optional(v.union(
      v.literal("A"),
      v.literal("B"),
      v.literal("C"),
    )),
    promotedCustomerId: v.optional(v.id("customers")),
    promotedAt: v.optional(v.number()),

    // v12: Airport repair service validation signal from FAA NFDC cross-reference
    airportRepairSignal: v.optional(v.union(
      v.literal("on_airport_major"),
      v.literal("on_airport_minor"),
      v.literal("off_airport"),
      v.literal("airport_not_found"),
      v.literal("not_reviewed"),
    )),

    lastReviewedAt: v.number(),
    reviewedByUserId: v.string(),
    reviewedByName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_campaign", ["organizationId", "campaignKey"])
    .index("by_org_prospect", ["organizationId", "prospectEntityId"])
    .index("by_org_prospect_campaign", ["organizationId", "prospectEntityId", "campaignKey"])
    .index("by_org_status", ["organizationId", "qualificationStatus"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WAREHOUSE LOCATION HIERARCHY  (v11)
  //
  // Five-level configurable hierarchy: Warehouse → Area → Shelf → ShelfLocation → Bin
  // Parent IDs are denormalized on child tables because Convex lacks JOINs —
  // enables direct indexed queries like "all bins in warehouse X".
  // Parts and lots reference warehouseBins (the leaf node) via binLocationId.
  // ═══════════════════════════════════════════════════════════════════════════

  warehouses: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    shopLocationId: v.optional(v.id("shopLocations")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_code", ["organizationId", "code"]),

  warehouseAreas: defineTable({
    organizationId: v.id("organizations"),
    warehouseId: v.id("warehouses"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    areaType: v.optional(v.union(
      v.literal("general"),
      v.literal("hazmat"),
      v.literal("temperature_controlled"),
      v.literal("secure"),
      v.literal("quarantine"),
      v.literal("receiving"),
    )),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_warehouse", ["warehouseId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_warehouse", ["organizationId", "warehouseId"]),

  warehouseShelves: defineTable({
    organizationId: v.id("organizations"),
    warehouseId: v.id("warehouses"),
    areaId: v.id("warehouseAreas"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_area", ["areaId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_area", ["organizationId", "areaId"]),

  warehouseShelfLocations: defineTable({
    organizationId: v.id("organizations"),
    warehouseId: v.id("warehouses"),
    areaId: v.id("warehouseAreas"),
    shelfId: v.id("warehouseShelves"),
    name: v.string(),
    code: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shelf", ["shelfId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_shelf", ["organizationId", "shelfId"]),

  warehouseBins: defineTable({
    organizationId: v.id("organizations"),
    warehouseId: v.id("warehouses"),
    areaId: v.id("warehouseAreas"),
    shelfId: v.id("warehouseShelves"),
    shelfLocationId: v.id("warehouseShelfLocations"),
    name: v.string(),
    code: v.string(),
    barcode: v.optional(v.string()),
    displayPath: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shelf_location", ["shelfLocationId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_shelf_location", ["organizationId", "shelfLocationId"])
    .index("by_org_barcode", ["organizationId", "barcode"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTS TAGGING SYSTEM  (v11)
  //
  // Hierarchical taxonomy: TagCategory → Tag → Subtag
  // Many-to-many junction via partTags.
  // System categories: Aircraft Type, Engine Type, ATA Chapter, Component Type.
  // Users can create custom categories. Denormalized display names on partTags
  // enable list rendering without extra lookups.
  // ═══════════════════════════════════════════════════════════════════════════

  tagCategories: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    categoryType: v.union(
      v.literal("aircraft_type"),
      v.literal("engine_type"),
      v.literal("ata_chapter"),
      v.literal("component_type"),
      v.literal("custom"),
    ),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    isSystem: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_slug", ["organizationId", "slug"])
    .index("by_org_type", ["organizationId", "categoryType"]),

  tags: defineTable({
    organizationId: v.id("organizations"),
    categoryId: v.id("tagCategories"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    aircraftMake: v.optional(v.string()),
    aircraftModel: v.optional(v.string()),
    engineMake: v.optional(v.string()),
    engineModel: v.optional(v.string()),
    isActive: v.boolean(),
    displayOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_category", ["organizationId", "categoryId"]),

  subtags: defineTable({
    organizationId: v.id("organizations"),
    tagId: v.id("tags"),
    categoryId: v.id("tagCategories"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    aircraftSeries: v.optional(v.string()),
    isActive: v.boolean(),
    displayOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tag", ["tagId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_tag", ["organizationId", "tagId"]),

  partTags: defineTable({
    organizationId: v.id("organizations"),
    partId: v.id("parts"),
    tagId: v.id("tags"),
    subtagId: v.optional(v.id("subtags")),
    categoryId: v.id("tagCategories"),
    categoryName: v.string(),
    tagName: v.string(),
    subtagName: v.optional(v.string()),
    createdAt: v.number(),
    createdByUserId: v.string(),
  })
    .index("by_part", ["partId"])
    .index("by_tag", ["tagId"])
    .index("by_subtag", ["subtagId"])
    .index("by_org_tag", ["organizationId", "tagId"])
    .index("by_org_category", ["organizationId", "categoryId"])
    .index("by_part_category", ["partId", "categoryId"])
    .index("by_org_part", ["organizationId", "partId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // WORK ITEM ENTRIES
  //
  // Append-only audit trail for discrepancy write-ups and corrective actions.
  // Each entry is immutable once created (FAA compliance — no updatedAt).
  //
  // Supports parent-level entries on discrepancies and task cards, as well as
  // step-level entries on individual taskCardSteps. Exactly one of the three
  // polymorphic parent IDs must be set per entry.
  // ═══════════════════════════════════════════════════════════════════════════
  workItemEntries: defineTable({
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),

    // Polymorphic parent — exactly one is set per entry:
    discrepancyId: v.optional(v.id("discrepancies")),
    taskCardId: v.optional(v.id("taskCards")),
    taskCardStepId: v.optional(v.id("taskCardSteps")),

    entryType: v.union(
      v.literal("discrepancy_writeup"),
      v.literal("corrective_action"),
      v.literal("note"),
      v.literal("status_change"),
    ),

    text: v.string(),

    // Attribution — snapshot at write time for immutable audit trail
    technicianId: v.id("technicians"),
    technicianName: v.string(),
    certificateNumber: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_discrepancy", ["discrepancyId", "createdAt"])
    .index("by_task_card", ["taskCardId", "createdAt"])
    .index("by_task_card_step", ["taskCardStepId", "createdAt"])
    .index("by_work_order", ["workOrderId", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PROSPECT NOTES
  // Chronological activity/notes log per prospect. Append-only.
  // ═══════════════════════════════════════════════════════════════════════════
  prospectNotes: defineTable({
    prospectEntityId: v.string(),
    organizationId: v.id("organizations"),
    campaignKey: v.string(),
    content: v.string(),
    createdByUserId: v.optional(v.string()),
    createdByName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_prospect", ["prospectEntityId"])
    .index("by_org_prospect", ["organizationId", "prospectEntityId"]),
});
