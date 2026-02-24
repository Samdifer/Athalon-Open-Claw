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
    .index("by_location", ["organizationId", "location"]) // now covers pending_inspection queries
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
      v.literal("contract_maintenance"),
      v.literal("calibration_lab"),
      v.literal("DER"),
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

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_vendor", ["orgId", "vendorId"])
    .index("by_org_po_number", ["orgId", "poNumber"])
    .index("by_work_order", ["workOrderId"]),

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
  // Technician clock-in / clock-out records per work order (and optionally
  // per task card). durationMinutes is computed at clock-out.
  // Marcus: Time entry records provide the audit trail for labor charged to
  // a work order. Required for §145.213 cost allocation traceability.
  // ═══════════════════════════════════════════════════════════════════════════
  timeEntries: defineTable({
    orgId: v.id("organizations"),
    technicianId: v.id("technicians"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.optional(v.id("taskCards")),  // Optional: tie to a specific task card

    clockInAt: v.number(),                 // Unix ms
    clockOutAt: v.optional(v.number()),    // Unix ms — null while clocked in
    durationMinutes: v.optional(v.number()), // Computed at clock-out

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_technician", ["technicianId"])
    .index("by_org_tech", ["orgId", "technicianId"])
    .index("by_org_wo", ["orgId", "workOrderId"]),

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

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_customer", ["orgId", "customerId"])
    .index("by_org_quote_number", ["orgId", "quoteNumber"])
    .index("by_work_order", ["workOrderId"]),

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
    total: v.number(),

    // Optional context fields
    technicianId: v.optional(v.id("technicians")),  // For labor lines: which tech
    partId: v.optional(v.id("parts")),              // For part lines: which part
    departmentSection: v.optional(v.string()),       // For multi-dept quotes (FEAT-140)

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_quote", ["quoteId"])
    .index("by_org", ["orgId"])
    .index("by_org_quote", ["orgId", "quoteId"]),

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
    tax: v.number(),
    total: v.number(),
    amountPaid: v.number(),
    balance: v.number(),

    // Progress billing (FEAT-138)
    isProgressBill: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),

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
});
