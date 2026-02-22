# Athelon — Convex Schema v2
**Document Type:** Implementation Specification — Convex TypeScript Schema  
**Author:** Devraj Anand (Backend Engineer, Convex)  
**Date:** 2026-02-22  
**Status:** FROZEN — Pending Marcus Webb and Cilla Oduya sign-off  
**Supersedes:** `convex-schema.md` (v1)  
**Change Basis:** Phase 1 Gate Review — 16 blockers (REG-001–008, QA-001–008)

---

## Author's Revision Notes

*This is v2. Every blocker from the Phase 1 gate review has been addressed. I'll walk through the structural changes here so the diff is not a mystery.*

*The biggest structural change is the extraction of `taskCardSteps` into its own table. I called this out in my own notes in v1 — I should have just fixed it then. Embedded arrays that receive concurrent writes are a concurrency problem AND an audit granularity problem. Cilla and Marcus both caught this independently, which tells me the instinct was right. The new table gives us per-step audit trails, indexed queries, and conflict-free concurrent signing.*

*The second major change is the addition of `signatureAuthEvents` as a first-class table. Jonas and I worked out the spec: a `signatureAuthEvent` is created by a pre-signing re-authentication flow, carries a short TTL (5 minutes), and is consumed exactly once. The three tables that held `signatureAuthEventId: v.string()` now hold `signatureAuthEventId: v.id("signatureAuthEvents")` — a proper foreign key. This makes the signing chain auditable and independently verifiable.*

*The third change is inverting the `customers.aircraftIds` relationship. `customerId` now lives on `aircraft`. This eliminates the write-conflict hotspot on customer documents and makes the query direction correct.*

*Everything else is additive: new fields, new indexes, new enum values, corrected optionality. The table structure is otherwise stable. Migration from v1 is a greenfield operation — no existing data.*

*One design decision I want to document explicitly: I kept `voided` AND added `incomplete_na_steps` to `taskCards.status`. These are not the same thing. `incomplete_na_steps` means the card is in a reviewable state where some steps were marked N/A and an IA needs to confirm those N/A markings are appropriate. `voided` means the task card was administratively cancelled — it should never have been open, or it became irrelevant. Both states are real. Both need to be representable. The architecture document was right to include `incomplete_na_steps`; the v1 schema was right to include `voided`. The fix was to include both.*

*State transition guards are documented as invariants in comments adjacent to the relevant fields. These must be enforced in mutation functions — Convex's type system cannot enforce conditional required fields. Every invariant in this schema has a corresponding note specifying which mutation must enforce it.*

---

## Schema Notes

### Convex Validator Types Used
- `v.id("tableName")` — reference to another table's document
- `v.string()` — string values
- `v.number()` — numeric (float64 in Convex)
- `v.boolean()` — boolean
- `v.optional(v.string())` — nullable/optional fields
- `v.union(v.literal("a"), v.literal("b"))` — enums (Convex doesn't have native enums)
- `v.array(...)` — arrays
- `v.object({...})` — embedded objects
- `v.null()` — explicit null

### Invariant Notation
Throughout this schema, blocks marked `// INVARIANT:` describe constraints that the schema type system cannot enforce but that MUST be enforced at the mutation layer. Every invariant in this schema has a named enforcement point (the mutation responsible).

---

## Complete Convex Schema (v2)

```typescript
// convex/schema.ts
// Athelon — Aviation MRO SaaS Platform
// Primary schema author: Devraj Anand
// Architecture: Rafael Mendoza
// Regulatory Review: Marcus Webb, Capt. Rosa Eaton
// QA Review: Cilla Oduya
// Schema Version: 2 (Phase 1 gate review remediation — 2026-02-22)

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────
// SHARED VALIDATOR TYPES (defined as constants for reuse)
// ─────────────────────────────────────────────

// Certificate type enum values
const certificateType = v.union(
  v.literal("A&P"),             // Airframe and Powerplant
  v.literal("airframe_only"),   // Airframe rating only
  v.literal("powerplant_only"), // Powerplant rating only
  v.literal("IA"),              // Inspection Authorization
  v.literal("repairman"),       // FAA Repairman Certificate
  v.literal("repair_station"),  // Repair station authorized person
  v.literal("other")
);

// Ratings exercised at time of signing (per 14 CFR 65.85, 65.87)
// Used in technicianSignature to capture which A&P rating applied to the work
const ratingsExercised = v.array(v.union(
  v.literal("airframe"),
  v.literal("powerplant"),
  v.literal("ia"),       // When signing as IA (inspection authority)
  v.literal("none")      // Non-rated scope (e.g. repair station authorized person)
));

// Aircraft airworthiness status
const aircraftStatus = v.union(
  v.literal("airworthy"),
  v.literal("out_of_service"),
  v.literal("in_maintenance"),
  v.literal("destroyed"),
  v.literal("sold"),
  v.literal("unknown")
);

// Work order status lifecycle (v2: added voided, on_hold)
// INVARIANT [workOrders.close]: status may only transition to "closed" when
//   aircraftTotalTimeAtClose is set, all discrepancies are dispositioned,
//   and a returnToService record exists linked to this work order.
// INVARIANT [workOrders.close]: aircraftTotalTimeAtClose MUST be ≥ aircraftTotalTimeAtOpen.
//   If less, the mutation MUST throw — not warn. A decreasing logbook TT is a falsification flag.
// INVARIANT [workOrders.void]: A voided work order must record voidedByUserId and voidedReason.
//   Voiding differs from cancellation: voided = administrative error; cancelled = customer decision.
const workOrderStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("on_hold"),              // v2 addition: waiting on parts, customer auth, etc.
  v.literal("pending_inspection"),
  v.literal("pending_signoff"),
  v.literal("open_discrepancies"),
  v.literal("closed"),
  v.literal("cancelled"),
  v.literal("voided")               // v2 addition: administrative void, not customer cancel
);

// Discrepancy disposition
const discrepancyDisposition = v.union(
  v.literal("corrected"),
  v.literal("deferred_mel"),
  v.literal("deferred_grounded"),
  v.literal("no_fault_found"),
  v.literal("no_fault_found_could_not_reproduce"), // pilot report could not be reproduced
  v.literal("pending")
);

// Part condition
const partCondition = v.union(
  v.literal("new"),
  v.literal("serviceable"),
  v.literal("overhauled"),
  v.literal("repaired"),
  v.literal("unserviceable"),
  v.literal("quarantine"),
  v.literal("scrapped")
);

// Technician signature object (embedded in multiple tables)
// v2: Added ratingsExercised (REG-002 / 14 CFR 65.85, 65.87)
// v2: signatureAuthEventId is now v.id("signatureAuthEvents") — properly typed foreign key
// INVARIANT [signing mutations]: ratingsExercised must be populated at signing time.
//   The signing mutation must determine which rating the work falls under and set this field.
//   An A&P signing engine work must list ["powerplant"]. An IA signing an annual must list ["ia"].
const technicianSignature = v.object({
  technicianId: v.id("technicians"),
  legalName: v.string(),              // captured at signing time — snapshot, not lookup
  certificateNumber: v.string(),      // captured at signing time — snapshot, not lookup
  certificateType: certificateType,
  ratingsExercised: ratingsExercised, // v2: REG-002 — which rating was exercised for this work
  scopeOfWork: v.string(),
  signatureTimestamp: v.number(),     // Unix timestamp (ms)
  signatureHash: v.string(),          // v2: was optional — now required; every signature must hash
  signatureAuthEventId: v.id("signatureAuthEvents"), // v2: properly typed foreign key
});

// Part record (embedded in maintenance records)
const embeddedPartRecord = v.object({
  partNumber: v.string(),
  partName: v.string(),
  serialNumber: v.optional(v.string()),
  quantity: v.number(),
  // INVARIANT: quantity must be ≥ 1. Enforced in mutation. v.number() admits zero/negative.
  action: v.union(
    v.literal("installed"),
    v.literal("removed"),
    v.literal("overhauled"),
    v.literal("repaired"),
    v.literal("inspected")
  ),
  eightOneThirtyReference: v.optional(v.string()),
  partInventoryId: v.optional(v.id("parts")),
});

export default defineSchema({

  // ═══════════════════════════════════════════════════════
  // SIGNATURE AUTH EVENTS
  // v2: New table. Defines what signatureAuthEventId references in signing tables.
  // (Resolves REG-005 / QA-007 — highest priority blocker)
  //
  // Design: A signatureAuthEvent is generated by the pre-signing re-authentication
  // flow (PIN, biometric, or MFA confirmation). It is short-lived (TTL: 5 minutes),
  // consumed exactly once, and permanently retained in this table as an audit record.
  //
  // Verification: To verify a signature on a maintenance record, inspect the linked
  // signatureAuthEvent. The authenticatedAt timestamp, userId, clerkSessionId, and
  // ipAddress together prove the identity of the signer at the moment of signing.
  //
  // Jonas Harker (Platform) owns the Clerk webhook integration that creates these
  // records. No signing mutation may be called without a valid, unconsumed event.
  // ═══════════════════════════════════════════════════════
  signatureAuthEvents: defineTable({
    // Clerk authentication identifiers
    clerkEventId: v.string(),          // Clerk-issued event ID from the re-auth webhook
    clerkSessionId: v.string(),        // Clerk session at time of re-authentication
    userId: v.string(),                // Clerk user ID

    // Technician identity confirmed by auth
    technicianId: v.id("technicians"),
    authenticatedLegalName: v.string(),   // Legal name confirmed by the user during re-auth
    authenticatedCertNumber: v.string(),  // Certificate number entered/confirmed during re-auth

    // Auth mechanism used
    authMethod: v.union(
      v.literal("pin"),          // 6-digit PIN re-entry
      v.literal("biometric"),    // Face ID / Touch ID
      v.literal("password"),     // Password re-entry
      v.literal("mfa_totp"),     // TOTP second factor
      v.literal("mfa_sms")       // SMS second factor
    ),

    // Context of the signing action (what is being signed)
    intendedTable: v.string(),         // The table being signed ("maintenanceRecords", etc.)
    intendedRecordHash: v.optional(v.string()), // Hash of the record content pre-auth

    // Network context (for audit / anomaly detection)
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Lifecycle
    authenticatedAt: v.number(),       // When the user re-authenticated (Unix ms)
    expiresAt: v.number(),             // When this event expires (authenticatedAt + 5 minutes)

    // Consumption tracking
    // INVARIANT [all signing mutations]: An event may only be consumed once.
    //   The signing mutation must atomically check consumed == false and set consumed = true.
    //   If consumed == true, the mutation must throw. Events cannot be reused across records.
    consumed: v.boolean(),
    consumedAt: v.optional(v.number()),
    consumedByTable: v.optional(v.string()),
    consumedByRecordId: v.optional(v.string()),
  })
    .index("by_clerk_event", ["clerkEventId"])
    .index("by_user_timestamp", ["userId", "authenticatedAt"])
    .index("by_technician_timestamp", ["technicianId", "authenticatedAt"])
    .index("by_session", ["clerkSessionId"])
    .index("by_expiry", ["expiresAt"]),  // for TTL-based cleanup jobs

  // ═══════════════════════════════════════════════════════
  // ORGANIZATIONS
  // v2: directorOfMaintenance and qualityControlManager now reference technicians.
  //     Added display name fields for fast rendering without a join.
  //     (Resolves REG-004)
  // ═══════════════════════════════════════════════════════
  organizations: defineTable({
    name: v.string(),
    part145CertificateNumber: v.optional(v.string()),   // null if not Part 145
    part145Ratings: v.array(v.string()),                // e.g. ["Class A Airframe", "Class A Powerplant"]
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),

    // v2: DOM and QCM now reference technician records (REG-004).
    // INVARIANT [Part 145 org setup]: If part145CertificateNumber is set,
    //   both directorOfMaintenanceId and qualityControlManagerId must reference
    //   active technicians with appropriate certificates. The org-setup mutation
    //   must validate certificate currency for both roles on assignment.
    directorOfMaintenanceId: v.optional(v.id("technicians")),
    directorOfMaintenanceName: v.optional(v.string()),      // denormalized display cache
    qualityControlManagerId: v.optional(v.id("technicians")),
    qualityControlManagerName: v.optional(v.string()),      // denormalized display cache

    rsmRevision: v.optional(v.string()),     // Repair Station Manual current revision

    subscriptionTier: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_part145_cert", ["part145CertificateNumber"]),

  // ═══════════════════════════════════════════════════════
  // AIRCRAFT
  // v2: Added customerId (QA-005 — invert relationship from customers.aircraftIds)
  // ═══════════════════════════════════════════════════════
  aircraft: defineTable({
    // Identity — the triple (make, model, serialNumber) is the true unique identifier
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    serialNumber: v.string(),          // Manufacturer Serial Number (MSN)
    // INVARIANT: serialNumber must be non-empty and non-whitespace. Enforced in create mutation.

    // Current registration
    currentRegistration: v.optional(v.string()),  // N-number (nullable if not currently registered)

    // Type and category
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
      v.literal("provisional")
    ),

    // Physical characteristics
    engineCount: v.number(),
    maxGrossWeightLbs: v.optional(v.number()),
    yearOfManufacture: v.optional(v.number()),

    // Time in service (snapshot — updated on each work order close)
    // INVARIANT [aircraft.updateTime]: totalTimeAirframeHours is monotonically increasing.
    //   Any mutation that writes this field must verify the new value ≥ current value.
    //   If less, the mutation must throw — not warn.
    totalTimeAirframeHours: v.number(),
    totalTimeAirframeAsOfDate: v.number(),  // Unix timestamp of last TT update

    // Ownership and operation
    ownerName: v.optional(v.string()),
    ownerAddress: v.optional(v.string()),
    operatingOrganizationId: v.optional(v.id("organizations")),
    operatingRegulation: v.optional(v.union(
      v.literal("part_91"),
      v.literal("part_135"),
      v.literal("part_121"),
      v.literal("part_137"),
      v.literal("part_91_135_mixed"),
      v.literal("pending_determination")   // v2: explicit unknown state (avoids silent null)
    )),

    // v2: Customer relationship (QA-005 — moved from customers.aircraftIds array)
    customerId: v.optional(v.id("customers")),

    // Status
    status: aircraftStatus,
    baseLocation: v.optional(v.string()),  // ICAO airport code

    // Audit
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_serial", ["make", "model", "serialNumber"])
    .index("by_registration", ["currentRegistration"])
    .index("by_organization", ["operatingOrganizationId"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]),   // v2: supports customer fleet queries

  // ═══════════════════════════════════════════════════════
  // AIRCRAFT REGISTRATION HISTORY
  // (separate table — N-numbers can be re-assigned)
  // ═══════════════════════════════════════════════════════
  aircraftRegistrationHistory: defineTable({
    aircraftId: v.id("aircraft"),
    nNumber: v.string(),
    effectiveDate: v.number(),     // Unix timestamp
    expiryDate: v.optional(v.number()),
    registrationClass: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_n_number", ["nNumber"]),

  // ═══════════════════════════════════════════════════════
  // ENGINES
  // ═══════════════════════════════════════════════════════
  engines: defineTable({
    make: v.string(),
    model: v.string(),
    serialNumber: v.string(),

    // Current installation
    currentAircraftId: v.optional(v.id("aircraft")),
    position: v.optional(v.string()),  // "L", "R", "C", "1", "2", etc.
    // INVARIANT [engine.status]: If status == "installed", currentAircraftId must be set.
    //   The engine install mutation must enforce this. The schema cannot.

    // Time tracking
    // INVARIANT: All hours fields must be ≥ 0. Enforced in mutation.
    totalTimeHours: v.number(),
    totalTimeAsOfDate: v.number(),
    timeSinceOverhaulHours: v.optional(v.number()),
    timeSinceNewHours: v.number(),
    timeBetweenOverhaulLimit: v.optional(v.number()),  // Manufacturer TBO

    // Overhaul history
    lastOverhaulDate: v.optional(v.number()),
    lastOverhaulFacility: v.optional(v.string()),
    lastOverhaulEightOneThirtyReference: v.optional(v.string()),

    status: v.union(
      v.literal("installed"),
      v.literal("removed_serviceable"),
      v.literal("removed_unserviceable"),
      v.literal("in_overhaul"),
      v.literal("scrapped")
    ),

    organizationId: v.optional(v.id("organizations")),  // who owns/maintains it
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serial", ["make", "model", "serialNumber"])
    .index("by_aircraft", ["currentAircraftId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════
  // TECHNICIANS
  // ═══════════════════════════════════════════════════════
  technicians: defineTable({
    legalName: v.string(),        // Name exactly as on FAA certificate
    userId: v.optional(v.string()),  // Clerk user ID
    // INVARIANT [technician.sign]: A technician with userId == null cannot perform any
    //   signing action. The signing mutation must verify userId is set before generating
    //   a signatureAuthEvent. Technicians without system accounts are display-only.
    employeeId: v.optional(v.string()),
    organizationId: v.id("organizations"),

    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("terminated")
    ),

    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_status", ["organizationId", "status"]),

  // ═══════════════════════════════════════════════════════
  // CERTIFICATES
  // (each technician may hold multiple certificates)
  // v2: iaExpiryDate is still optional — but INVARIANT documented.
  // ═══════════════════════════════════════════════════════
  certificates: defineTable({
    technicianId: v.id("technicians"),

    certificateType: certificateType,
    certificateNumber: v.string(),  // FAA-issued
    // INVARIANT: certificateNumber must be non-empty. The mutation must validate
    //   format for known types (A&P: 2-letter prefix + 6 digits). Enforced in mutation.
    issueDate: v.number(),          // Unix timestamp

    // Ratings (for A&P)
    ratings: v.array(v.union(
      v.literal("airframe"),
      v.literal("powerplant")
    )),

    // Inspection Authorization
    hasIaAuthorization: v.boolean(),
    iaExpiryDate: v.optional(v.number()),  // Always March 31 of applicable year
    // INVARIANT [certificate.create / certificate.update]: If hasIaAuthorization == true,
    //   iaExpiryDate MUST be set. An IA with no expiry date is a data error — all IAs
    //   expire on March 31. The create/update mutation must enforce this.

    // IA Renewal Activity Log (per 14 CFR 65.93)
    iaRenewalActivities: v.array(v.object({
      date: v.number(),
      activityType: v.union(
        v.literal("inspection_performed"),
        v.literal("pmi_review"),
        v.literal("faa_exam"),
        v.literal("other")
      ),
      activityTypeDetail: v.optional(v.string()),  // required when activityType == "other"
      notes: v.optional(v.string()),
    })),

    // Recent experience (14 CFR 65.83)
    lastExercisedDate: v.optional(v.number()),

    // Repair station specific authorization
    repairStationAuthorizations: v.array(v.object({
      organizationId: v.id("organizations"),
      authorizedWorkScope: v.string(),
      effectiveDate: v.number(),
      expiryDate: v.optional(v.number()),
    })),

    // Document storage
    certificateDocumentUrl: v.optional(v.string()),

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_technician", ["technicianId"])
    .index("by_certificate_number", ["certificateNumber"])
    .index("by_type", ["technicianId", "certificateType"])
    .index("by_ia_expiry", ["hasIaAuthorization", "iaExpiryDate"]),

  // ═══════════════════════════════════════════════════════
  // WORK ORDERS
  // v2: Added on_hold and voided to status (QA-005.1, Cilla 5.1)
  // v2: Added closedByTechnicianId (REG-006 / Marcus 3.2)
  // v2: closedAt and closedByUserId invariant documented
  // v2: aircraftTotalTimeAtClose invariant documented (REG-006)
  // v2: Added voidedByUserId, voidedReason for voided state
  // v2: Added concurrentWorkOrderOverrideAcknowledged (QA testability)
  // ═══════════════════════════════════════════════════════
  workOrders: defineTable({
    workOrderNumber: v.string(),    // Human-readable, org-unique
    // INVARIANT [workOrder.create]: workOrderNumber must be unique within organizationId.
    //   The create mutation must query by_number index and throw if a record exists.
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
      v.literal("ferry_permit")
    ),

    description: v.string(),
    squawks: v.optional(v.string()),  // Pilot-reported issues at intake (free text)

    // Timestamps
    openedAt: v.number(),
    openedByUserId: v.string(),    // Clerk user ID
    targetCompletionDate: v.optional(v.number()),

    // INVARIANT [workOrder.close]: Before status transitions to "closed":
    //   1. closedAt and closedByUserId must be set
    //   2. closedByTechnicianId must be set (the certificated person authorizing close)
    //   3. aircraftTotalTimeAtClose must be set
    //   4. aircraftTotalTimeAtClose ≥ aircraftTotalTimeAtOpen (strictly enforced — not a warning)
    //   5. All discrepancies linked to this work order must be in status "dispositioned"
    //   6. A returnToService record must exist with workOrderId == this work order
    // All six conditions are enforced in the closeWorkOrder mutation.
    closedAt: v.optional(v.number()),
    closedByUserId: v.optional(v.string()),

    // v2: Added closedByTechnicianId (REG-006 / Marcus 3.2)
    // Captures the certificated individual who performed the regulatory close (RTS approval).
    // Distinct from closedByUserId which captures the system user who clicked "close."
    closedByTechnicianId: v.optional(v.id("technicians")),

    // Aircraft time snapshot
    aircraftTotalTimeAtOpen: v.number(),
    // INVARIANT: aircraftTotalTimeAtOpen must be ≥ 0.
    aircraftTotalTimeAtClose: v.optional(v.number()),
    // INVARIANT [workOrder.close]: Must be set before close. Must be ≥ aircraftTotalTimeAtOpen.

    // Voided state fields (only populated when status == "voided")
    voidedByUserId: v.optional(v.string()),
    voidedAt: v.optional(v.number()),
    voidedReason: v.optional(v.string()),
    // INVARIANT [workOrder.void]: If status transitions to "voided", all three void fields must be set.

    // On-hold state fields
    onHoldReason: v.optional(v.string()),    // Why the WO is on hold
    onHoldSince: v.optional(v.number()),     // When it went on hold

    // Concurrent work order handling (QA testability — Cilla 3.1)
    concurrentWorkOrderOverrideAcknowledged: v.optional(v.boolean()),
    concurrentWorkOrderReason: v.optional(v.string()),
    // INVARIANT [workOrder.open]: If another open/in_progress WO exists for the same aircraft,
    //   concurrentWorkOrderOverrideAcknowledged must be true and concurrentWorkOrderReason set.

    // Customer / Billing
    customerId: v.optional(v.id("customers")),
    priority: v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("aog")   // Aircraft on Ground — highest priority
    ),
    billingStatus: v.optional(v.union(
      v.literal("quoted"),
      v.literal("approved"),
      v.literal("invoiced"),
      v.literal("paid"),
      v.literal("disputed")
    )),

    // Return to service
    returnToServiceId: v.optional(v.id("returnToService")),
    returnedToService: v.optional(v.boolean()),

    notes: v.optional(v.string()),  // Internal shop notes

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_number", ["organizationId", "workOrderNumber"])
    .index("by_aircraft_status", ["aircraftId", "status"])
    .index("by_priority", ["organizationId", "priority", "status"]),

  // ═══════════════════════════════════════════════════════
  // DISCREPANCIES
  // v2: Added dispositionedCertificateNumber (Marcus 4.5)
  // v2: Added melDeferralDate (QA-008 — MEL expiry testability)
  // v2: Added no_fault_found_could_not_reproduce disposition
  // v2: Invariants documented for corrected disposition (QA-006 / REG-001 cross-ref)
  // ═══════════════════════════════════════════════════════
  discrepancies: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),    // Denormalized for aircraft-level queries
    organizationId: v.id("organizations"),

    discrepancyNumber: v.string(),   // WO-scoped identifier

    status: v.union(
      v.literal("open"),
      v.literal("under_evaluation"),
      v.literal("dispositioned")
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
      v.literal("other")
    ),

    description: v.string(),

    // Component identification
    componentAffected: v.optional(v.string()),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    componentPosition: v.optional(v.string()),

    // Who found it
    foundByTechnicianId: v.id("technicians"),
    foundAt: v.number(),             // Timestamp
    foundAtAircraftHours: v.number(),
    // INVARIANT: foundAtAircraftHours ≥ 0. Enforced in create mutation.

    // Disposition — who, when, with what authority
    dispositionedByTechnicianId: v.optional(v.id("technicians")),
    dispositionedAt: v.optional(v.number()),
    // v2: Added dispositionedCertificateNumber (Marcus 4.5 — REG requirement)
    // The disposition of a discrepancy is a regulated act. The dispositioner's
    // certificate number must be captured at disposition time.
    dispositionedCertificateNumber: v.optional(v.string()),

    // MEL deferral fields (populated if disposition == deferred_mel)
    melItemNumber: v.optional(v.string()),
    melCategory: v.optional(v.union(
      v.literal("A"),   // 10 calendar days
      v.literal("B"),   // 3 calendar days
      v.literal("C"),   // 120 calendar days
      v.literal("D")    // No calendar limit specified
    )),
    // v2: Added melDeferralDate (QA-008 — source truth for expiry computation)
    // The date the MEL deferral was formally logged and the compliance clock started.
    // melExpiryDate is computed from melDeferralDate + melCategory interval.
    // Having both fields makes the computation testable and auditable.
    melDeferralDate: v.optional(v.number()),
    melExpiryDate: v.optional(v.number()),
    // INVARIANT [discrepancy.defer_mel]: When disposition == "deferred_mel":
    //   melItemNumber, melCategory, melDeferralDate, and melExpiryDate must all be set.
    //   melExpiryDate must equal melDeferralDate + category_interval. Enforced in mutation.

    // Corrective action (if disposition == corrected)
    correctiveAction: v.optional(v.string()),
    correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),
    // INVARIANT [discrepancy.disposition]: When disposition == "corrected":
    //   Both correctiveAction and correctiveMaintenanceRecordId must be set.
    //   A discrepancy cannot be closed as "corrected" without proof of correction.
    //   Enforced in the dispositionDiscrepancy mutation. (QA-006)

    // Owner notification (per 14 CFR 43.11(b))
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
    .index("by_mel_expiry", ["melExpiryDate"])              // global MEL expiry (for system-wide jobs)
    .index("by_org_mel_expiry", ["organizationId", "melExpiryDate"]),  // v2: org-scoped MEL alerting

  // ═══════════════════════════════════════════════════════
  // TASK CARDS
  // v2: Removed embedded steps array (QA-002 — extracted to taskCardSteps table)
  // v2: Status enum corrected to include both voided AND incomplete_na_steps (QA-001)
  // ═══════════════════════════════════════════════════════
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
      v.literal("modification")
    ),

    // Approved data reference (required per 14 CFR 43.9(a)(1))
    approvedDataSource: v.string(),
    approvedDataRevision: v.optional(v.string()),

    assignedToTechnicianId: v.optional(v.id("technicians")),

    // v2: Status enum corrected (QA-001).
    //
    // Status semantics:
    //   not_started       — card created, no steps begun
    //   in_progress       — at least one step is completed or in progress
    //   incomplete_na_steps — all steps have been addressed, but one or more was marked N/A
    //                         and requires IA review before the card can be closed
    //   complete          — all steps signed off; card closed
    //   voided            — card administratively cancelled (was never applicable, or created in error)
    //
    // v1 had `voided` but not `incomplete_na_steps`.
    // Architecture document had `incomplete_na_steps` but not `voided`.
    // Both states are real and distinct. Both are now present.
    //
    // INVARIANT [taskCard.complete]: A task card may only transition to "complete" when
    //   all linked taskCardSteps are in status "completed" or "na", AND all "na" steps
    //   have been reviewed and confirmed (signedHasIaOnDate set if signOffRequiresIa was true).
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("incomplete_na_steps"),  // v2: added (from architecture doc)
      v.literal("complete"),
      v.literal("voided")
    ),

    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    notes: v.optional(v.string()),

    // Steps are now in the taskCardSteps table (v2 — QA-002).
    // stepCount is a denormalized summary for display purposes.
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
    .index("by_org_assigned", ["organizationId", "assignedToTechnicianId", "status"]),  // v2

  // ═══════════════════════════════════════════════════════
  // TASK CARD STEPS
  // v2: New table — extracted from embedded steps array in taskCards (QA-002)
  //
  // Rationale for extraction:
  //   1. Audit granularity: Each step sign-off is now a distinct document with its own
  //      audit trail. The auditLog records "taskCardStep signed" not "taskCard updated."
  //   2. Concurrency: Multiple mechanics signing different steps simultaneously no longer
  //      conflict on the parent taskCard document. Each step write is independent.
  //   3. Testability: Cilla can write a test that asserts "step X was signed by technician Y
  //      at time T" by querying the taskCardSteps table directly, not digging into a document array.
  //   4. Indexing: Steps can be queried by technician, by status, and by work order.
  // ═══════════════════════════════════════════════════════
  taskCardSteps: defineTable({
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),         // denormalized for direct WO-level queries
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
      v.literal("na")
    ),

    // Sign-off fields (populated when status → completed)
    // INVARIANT [taskCardStep.signoff]: When status transitions to "completed":
    //   signedByTechnicianId, signedAt, signedCertificateNumber, and signatureAuthEventId
    //   must all be set. If signOffRequiresIa == true, signedHasIaOnDate must also be set,
    //   and the signing mutation must verify the technician's iaExpiryDate against signedAt.
    signedByTechnicianId: v.optional(v.id("technicians")),
    signedAt: v.optional(v.number()),
    signedCertificateNumber: v.optional(v.string()),   // snapshot at signing time
    signedHasIaOnDate: v.optional(v.boolean()),         // IA currency at time of signing
    signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),

    // N/A fields (populated when status → na)
    // INVARIANT [taskCardStep.markNA]: naReason and naAuthorizedById must be set.
    naReason: v.optional(v.string()),
    naAuthorizedById: v.optional(v.id("technicians")),
    naAuthorizedAt: v.optional(v.number()),

    notes: v.optional(v.string()),
    discrepancyIds: v.array(v.id("discrepancies")),  // Found during this step

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_card", ["taskCardId"])
    .index("by_task_card_step", ["taskCardId", "stepNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_signed_technician", ["signedByTechnicianId"]),

  // ═══════════════════════════════════════════════════════
  // MAINTENANCE RECORDS (14 CFR 43.9)
  // IMMUTABLE — no UPDATE operations permitted after creation.
  //   There is no updateMaintenanceRecord mutation. The absence of that mutation
  //   is intentional and is tested in the invariant test suite (Cilla's test matrix).
  //   Errors in maintenance records are corrected by creating a new record with
  //   recordType == "correction" that references the original.
  //
  // v2: signatureAuthEventId now v.id("signatureAuthEvents") (REG-005 / QA-007)
  // v2: technicianSignature now includes ratingsExercised (REG-002)
  // v2: Correction record invariants documented (REG-001)
  // v2: organizationCertificateNumber population invariant documented (Marcus 4.2)
  // ═══════════════════════════════════════════════════════
  maintenanceRecords: defineTable({
    recordType: v.union(
      v.literal("maintenance_43_9"),    // General maintenance record
      v.literal("inspection_43_11"),    // Inspection record
      v.literal("correction")           // Correction to a prior record
    ),

    // Aircraft identification (ALL denormalized at signing — these NEVER change)
    aircraftId: v.id("aircraft"),
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    aircraftSerialNumber: v.string(),
    aircraftRegistration: v.string(),    // N-number at time of signing
    // INVARIANT: aircraftRegistration must be non-empty. Enforced in signing mutation.
    aircraftTotalTimeHours: v.number(),  // TT at completion
    // INVARIANT: aircraftTotalTimeHours must equal the linked workOrder's aircraftTotalTimeAtClose.
    //   These values must not diverge. The maintenance record signing mutation must source
    //   this value directly from the work order — not from independent user input.
    //   (Addresses Cilla 3.3 — aircraft time snapshot consistency)

    // Work order reference
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    organizationCertificateNumber: v.optional(v.string()),
    // INVARIANT [maintenanceRecord.create]: If the organization has a part145CertificateNumber,
    //   organizationCertificateNumber must be populated from that value automatically
    //   by the create mutation. It may not be left null for Part 145 organizations.
    //   (Marcus 4.2 — 14 CFR 43.9 Part 145 requirement)

    // Aircraft-scoped sequence number (logbook entry number)
    sequenceNumber: v.number(),

    // Work description (per 14 CFR 43.9(a)(1))
    workPerformed: v.string(),
    approvedDataReference: v.string(),  // NOT optional — required per 43.9(a)(1)
    partsReplaced: v.array(embeddedPartRecord),

    // Date (per 14 CFR 43.9(a)(2))
    completionDate: v.number(),         // Unix timestamp — date work was COMPLETED

    // Personnel (per 14 CFR 43.9(a)(3))
    // Each entry now includes ratingsExercised (v2 — REG-002)
    technicians: v.array(technicianSignature),

    // Primary signatory (the person making the record entry)
    signingTechnicianId: v.id("technicians"),
    signingTechnicianLegalName: v.string(),      // Captured at signing — snapshot
    signingTechnicianCertNumber: v.string(),     // Captured at signing — snapshot
    signingTechnicianCertType: certificateType,  // Captured at signing — snapshot
    signingTechnicianRatingsExercised: ratingsExercised,  // v2: REG-002

    // Signature (per 14 CFR 43.9(a)(4) + AC 43-9C)
    signatureTimestamp: v.number(),
    signatureHash: v.string(),                   // Hash of all record fields at signing
    signatureAuthEventId: v.id("signatureAuthEvents"),  // v2: typed foreign key (REG-005)

    // Return to service determination
    returnedToService: v.boolean(),
    returnToServiceStatement: v.optional(v.string()),
    // INVARIANT [maintenanceRecord.create]: If returnedToService == true,
    //   returnToServiceStatement must be set. If returnedToService == false,
    //   the discrepancy list must reference open discrepancies.
    //   (Cilla 4.3 — return to service statement always required)

    // Discrepancy cross-references
    discrepanciesFound: v.array(v.id("discrepancies")),
    discrepanciesCorrected: v.array(v.id("discrepancies")),
    discrepancyListProvided: v.optional(v.boolean()),

    // For correction records only
    // INVARIANT [maintenanceRecord.create with recordType == "correction"]:
    //   All five correction fields below (corrects, correctionFieldName,
    //   correctionOriginalValue, correctionCorrectedValue, correctionReason)
    //   must be set. A correction record with any of these null is invalid under
    //   AC 43-9C. Enforced in createCorrectionRecord mutation. (REG-001)
    corrects: v.optional(v.id("maintenanceRecords")),
    correctionFieldName: v.optional(v.string()),
    correctionOriginalValue: v.optional(v.string()),
    correctionCorrectedValue: v.optional(v.string()),
    correctionReason: v.optional(v.string()),

    createdAt: v.number(),
    // NOTE: NO updatedAt field. This record is immutable after creation.
    // The absence of updatedAt is a schema-level signal. Do not add it.
    // Correction records are the only permitted modification pathway.
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_aircraft_sequence", ["aircraftId", "sequenceNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_organization", ["organizationId"])
    .index("by_completion_date", ["aircraftId", "completionDate"])
    .index("by_org_completion_date", ["organizationId", "completionDate"])  // v2: NB-01
    .index("by_technician", ["signingTechnicianId"]),

  // ═══════════════════════════════════════════════════════
  // INSPECTION RECORDS (14 CFR 43.11)
  // IMMUTABLE — see maintenanceRecords note.
  //
  // v2: signatureAuthEventId now v.id("signatureAuthEvents") (REG-005 / QA-007)
  // v2: Added iaCurrentOnInspectionDate (Marcus 4.4 — IA currency snapshot)
  // v2: Added notes field (REG-008 / Marcus 2.2 — needed when adComplianceReviewed
  //     is true but adComplianceReferenceIds is empty)
  // v2: Added by_aircraft_date index (NB-01 / Cilla 6.2)
  // ═══════════════════════════════════════════════════════
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
      v.literal("condition_inspection")
    ),

    inspectionDate: v.number(),          // Date inspection was completed

    // Aircraft identification (denormalized at signing — snapshot)
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    aircraftSerialNumber: v.string(),
    aircraftRegistration: v.string(),

    // Time in service at inspection (per 14 CFR 43.11(a)(2))
    // INVARIANT: All hours fields must be ≥ 0. Enforced in signing mutation.
    // INVARIANT: totalTimeAirframeHours must match the linked workOrder's aircraftTotalTimeAtClose.
    //   Source of truth is the work order, not independent user entry. (Cilla 3.3)
    totalTimeAirframeHours: v.number(),
    totalTimeEngine1Hours: v.optional(v.number()),
    totalTimeEngine2Hours: v.optional(v.number()),
    totalTimePropellerHours: v.optional(v.number()),

    // Inspection scope (per 14 CFR 43.11(a)(3))
    scopeDescription: v.string(),

    // Airworthiness determination (per 14 CFR 43.11(a)(6))
    airworthinessDetermination: v.union(
      v.literal("returned_to_service"),
      v.literal("not_returned_discrepancies")
    ),

    discrepancyIds: v.array(v.id("discrepancies")),

    // v2: Added notes field (Marcus 2.2 / REG-008)
    // Required when adComplianceReviewed == true but adComplianceReferenceIds is empty.
    // Must document why no AD records are referenced (e.g., "no ADs applicable to this
    // aircraft type as of inspection date — verified against FAA DRS").
    notes: v.optional(v.string()),

    // IA sign-off (annual inspections require IA per 14 CFR 65.91)
    iaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),     // Captured at signing — snapshot

    // v2: Added iaCurrentOnInspectionDate (Marcus 4.4 — REG requirement)
    // Permanently records the result of the IA currency check performed at signing time.
    // Populated by the inspection signing mutation by comparing iaTechnicianId's
    // iaExpiryDate against inspectionDate. Once written, this value is immutable.
    // If this field is false, the inspection was signed by an expired IA.
    iaCurrentOnInspectionDate: v.boolean(),

    iaSignatureTimestamp: v.number(),
    iaSignatureHash: v.string(),
    iaSignatureAuthEventId: v.id("signatureAuthEvents"),  // v2: typed foreign key (REG-005)

    // Discrepancy list (per 14 CFR 43.11(b))
    discrepancyListIssuedToOwner: v.optional(v.boolean()),
    discrepancyListIssuedAt: v.optional(v.number()),
    discrepancyListRecipient: v.optional(v.string()),

    // AD compliance review (documented during inspection)
    adComplianceReviewed: v.boolean(),
    adComplianceReferenceIds: v.array(v.id("adCompliance")),
    // INVARIANT [inspectionRecord.close]: If adComplianceReviewed == true and
    //   adComplianceReferenceIds is empty, then notes must be non-empty and must
    //   document why no ADs were found applicable. The close mutation enforces this.
    //   (Marcus 2.2 / REG-008) An inspection that certifies AD review without linking
    //   to any AD compliance records will be rejected by the mutation unless notes
    //   contains the documented explanation.

    // Next inspection scheduling
    nextInspectionDueDate: v.optional(v.number()),
    nextInspectionDueHours: v.optional(v.number()),

    sequenceNumber: v.number(),  // Aircraft-scoped sequence

    createdAt: v.number(),
    // NOTE: NO updatedAt — immutable after creation.
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_type_date", ["aircraftId", "inspectionType", "inspectionDate"])
    .index("by_organization", ["organizationId"])
    .index("by_aircraft_date", ["aircraftId", "inspectionDate"]),  // v2: NB-01 (Cilla 6.2)

  // ═══════════════════════════════════════════════════════
  // AIRWORTHINESS DIRECTIVES (global — not org-scoped)
  // ═══════════════════════════════════════════════════════
  airworthinessDirectives: defineTable({
    adNumber: v.string(),          // e.g., "2024-15-07"
    title: v.string(),
    effectiveDate: v.number(),
    docketNumber: v.optional(v.string()),

    // Applicability (raw text + structured parsed version)
    applicabilityText: v.string(),
    applicabilityStructured: v.optional(v.object({
      makes: v.array(v.string()),
      models: v.array(v.string()),
      serialRangeStart: v.optional(v.string()),
      serialRangeEnd: v.optional(v.string()),
      partNumbers: v.array(v.string()),
      notes: v.optional(v.string()),
    })),

    adType: v.union(
      v.literal("one_time"),
      v.literal("recurring"),
      v.literal("terminating_action")
    ),

    emergencyAd: v.boolean(),

    // What the AD requires
    complianceMethodDescription: v.string(),
    complianceType: v.union(
      v.literal("calendar"),
      v.literal("hours"),
      v.literal("cycles"),
      v.literal("calendar_or_hours"),
      v.literal("calendar_or_cycles"),
      v.literal("hours_or_cycles"),
      v.literal("one_time"),
      v.literal("other")
    ),

    // Initial compliance window
    initialComplianceHours: v.optional(v.number()),
    initialComplianceDays: v.optional(v.number()),

    // Recurring intervals (null for one-time ADs)
    recurringIntervalHours: v.optional(v.number()),
    recurringIntervalDays: v.optional(v.number()),
    recurringIntervalCycles: v.optional(v.number()),

    // Supersession chain
    supersededByAdId: v.optional(v.id("airworthinessDirectives")),
    supersedesAdId: v.optional(v.id("airworthinessDirectives")),

    sourceUrl: v.optional(v.string()),  // FAA DRS link

    // Meta
    addedByUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ad_number", ["adNumber"])
    .index("by_effective_date", ["effectiveDate"])
    .index("by_type", ["adType"]),

  // ═══════════════════════════════════════════════════════
  // AD COMPLIANCE (aircraft-scoped — permanent record)
  // v2: Added by_engine and by_part indexes (Marcus 2.1.2 / NB-01)
  // v2: Orphan invariant documented (REG-003)
  // v2: Applicability determination fields invariant documented (Cilla 4.5)
  // v2: by_org_next_due_date index added (Cilla 6.1 / NB-01)
  //
  // NOTE on complianceStatus == "superseded":
  //   This status applies to the *compliance record* when the governing AD has been
  //   superseded. It means "this record tracks an AD that is no longer the governing
  //   requirement." It does NOT mean the aircraft's compliance under the old AD
  //   was invalidated — that's a separate regulatory determination.
  //   When an AD is superseded, the system should:
  //   1. Set this record's complianceStatus to "superseded"
  //   2. Create a new adCompliance record for the superseding AD at "pending_determination"
  //   (Marcus 2.1.3 — supersession chain semantics)
  // ═══════════════════════════════════════════════════════
  adCompliance: defineTable({
    adId: v.id("airworthinessDirectives"),

    // INVARIANT [adCompliance.create]: At least one of aircraftId, engineId, or partId
    //   must be set. An adCompliance record with all three null is orphaned and will
    //   never appear in any aircraft, engine, or part compliance review.
    //   The create mutation must enforce at-least-one. (REG-003)
    aircraftId: v.optional(v.id("aircraft")),
    engineId: v.optional(v.id("engines")),
    partId: v.optional(v.id("parts")),

    organizationId: v.id("organizations"),

    // Applicability determination
    applicable: v.boolean(),
    applicabilityDeterminationNotes: v.optional(v.string()),
    applicabilityDeterminedById: v.optional(v.id("technicians")),
    applicabilityDeterminationDate: v.optional(v.number()),
    // INVARIANT [adCompliance.setApplicability]: When applicable is set to true or false,
    //   applicabilityDeterminedById and applicabilityDeterminationDate must both be set.
    //   Who made the determination and when must be on record. (Cilla 4.5)

    complianceStatus: v.union(
      v.literal("not_complied"),
      v.literal("complied_one_time"),
      v.literal("complied_recurring"),
      v.literal("not_applicable"),
      v.literal("superseded"),
      v.literal("pending_determination")
    ),

    // Compliance history (append-only)
    // INVARIANT [adCompliance.addEntry]: New entries must have complianceDate ≥
    //   the most recent existing entry's complianceDate. Backdated entries are rejected.
    //   (Cilla 3.4 — compliance history ordering)
    complianceHistory: v.array(v.object({
      complianceDate: v.number(),
      aircraftHoursAtCompliance: v.number(),
      aircraftCyclesAtCompliance: v.optional(v.number()),
      technicianId: v.id("technicians"),
      maintenanceRecordId: v.id("maintenanceRecords"),
      complianceMethodUsed: v.string(),
      notes: v.optional(v.string()),
    })),

    // Most recent compliance snapshot (denormalized for query performance)
    lastComplianceDate: v.optional(v.number()),
    lastComplianceHours: v.optional(v.number()),
    lastComplianceCycles: v.optional(v.number()),

    // Next due (computed and cached — recomputed whenever compliance history changes)
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
    .index("by_engine", ["engineId"])                               // v2: NB-01 (Marcus 2.1.2)
    .index("by_part", ["partId"])                                   // v2: NB-01 (Marcus 2.1.2)
    .index("by_ad", ["adId"])
    .index("by_status", ["organizationId", "complianceStatus"])
    .index("by_next_due_date", ["nextDueDate"])                     // global (system-wide jobs)
    .index("by_org_next_due_date", ["organizationId", "nextDueDate"])  // v2: NB-01 (Cilla 6.1)
    .index("by_next_due_hours", ["aircraftId", "nextDueHours"]),

  // ═══════════════════════════════════════════════════════
  // PARTS / INVENTORY
  // v2: isLifeLimited and hasShelfLifeLimit invariants documented (QA-003)
  // v2: OSP installation invariant documented (REG-007 / Marcus 7.2)
  // v2: Double-installation state invariants documented (Cilla 3.5)
  // ═══════════════════════════════════════════════════════
  parts: defineTable({
    partNumber: v.string(),
    partName: v.string(),
    description: v.optional(v.string()),

    serialNumber: v.optional(v.string()),
    isSerialized: v.boolean(),

    // Life tracking
    isLifeLimited: v.boolean(),
    lifeLimitHours: v.optional(v.number()),
    lifeLimitCycles: v.optional(v.number()),
    // INVARIANT [part.create / part.update]: If isLifeLimited == true, at least one of
    //   lifeLimitHours or lifeLimitCycles must be set. A life-limited part with no
    //   defined limit is a silent compliance gap — the remaining-life computation
    //   will return undefined results. Enforced in create/update mutations. (QA-003)

    hasShelfLifeLimit: v.boolean(),
    shelfLifeLimitDate: v.optional(v.number()),
    // INVARIANT [part.create / part.update]: If hasShelfLifeLimit == true,
    //   shelfLifeLimitDate must be set. Enforced in create/update mutations. (QA-003)

    hoursAccumulatedBeforeInstall: v.optional(v.number()),
    cyclesAccumulatedBeforeInstall: v.optional(v.number()),
    // INVARIANT: Both hours fields must be ≥ 0. Enforced in mutation.

    condition: partCondition,

    location: v.union(
      v.literal("inventory"),
      v.literal("installed"),
      v.literal("removed_pending_disposition"),
      v.literal("quarantine"),
      v.literal("scrapped"),
      v.literal("returned_to_vendor")
    ),

    // INVARIANT [part.install]: Before a part transitions to location == "installed":
    //   1. Either eightOneThirtyId must be set and the referenced record must have
    //      isSuspect == false, OR an explicit receiving inspection must be on record.
    //   2. If isOwnerSupplied == true, item 1 above is mandatory — OSP parts cannot be
    //      installed without airworthiness documentation (14 CFR 145.201). (REG-007)
    //   3. currentAircraftId or currentEngineId must be set — not both, not neither.
    //      A serialized part installed on exactly one aircraft or engine. (Cilla 3.5)
    //   4. location == "installed" with currentAircraftId == null && currentEngineId == null
    //      is an invalid state. The install mutation must set the target before transitioning.
    //
    // INVARIANT [part.remove]: When a part is removed (location → inventory or other):
    //   currentAircraftId and currentEngineId must both be cleared. (Cilla 3.5)
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

  // ═══════════════════════════════════════════════════════
  // 8130-3 RECORDS (FAA Airworthiness Approval Tag)
  // v2: Added suspectStatus enum (Cilla 7.3)
  // ═══════════════════════════════════════════════════════
  eightOneThirtyRecords: defineTable({
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),

    approvingAuthority: v.string(),

    // Block 2
    applicantName: v.string(),
    applicantAddress: v.optional(v.string()),

    // Block 3
    formTrackingNumber: v.string(),

    // Block 4
    organizationName: v.optional(v.string()),

    // Block 5
    workOrderReference: v.optional(v.string()),

    // Block 6
    itemNumber: v.optional(v.string()),

    // Block 7
    partDescription: v.string(),

    // Block 8
    partNumber: v.string(),

    // Block 9
    partEligibility: v.optional(v.string()),

    // Block 10
    quantity: v.number(),
    // INVARIANT: quantity must be ≥ 1. Enforced in create mutation.

    // Block 11
    serialBatchNumber: v.optional(v.string()),

    // Block 12
    isLifeLimited: v.boolean(),
    lifeRemainingHours: v.optional(v.number()),
    lifeRemainingCycles: v.optional(v.number()),

    // Block 13
    statusWork: v.union(
      v.literal("new"),
      v.literal("overhauled"),
      v.literal("repaired"),
      v.literal("inspected"),
      v.literal("modified")
    ),

    // Block 14
    remarks: v.optional(v.string()),

    // Block 15
    certifyingStatement: v.string(),

    // Block 16
    authorizedSignatoryName: v.string(),
    signatureDate: v.number(),

    // Block 17
    approvalNumber: v.string(),

    // Block 18-19 (export)
    exportAuthorizationNumber: v.optional(v.string()),

    pdfUrl: v.optional(v.string()),

    // Receiving verification
    receivedByOrganizationId: v.id("organizations"),
    receivedDate: v.number(),
    verifiedByUserId: v.optional(v.string()),
    verificationNotes: v.optional(v.string()),

    // Suspect unapproved parts tracking
    isSuspect: v.boolean(),
    suspectReason: v.optional(v.string()),
    // v2: Added suspectStatus (Cilla 7.3 — lifecycle tracking after suspect flag)
    // INVARIANT [eightOneThirty.suspect]: When isSuspect transitions to true,
    //   suspectStatus must be set to "under_investigation". The suspect mutation enforces this.
    suspectStatus: v.optional(v.union(
      v.literal("under_investigation"),
      v.literal("reported_to_faa"),     // per Order 8120.11
      v.literal("cleared"),              // found serviceable after investigation
      v.literal("confirmed_unapproved") // confirmed as unapproved part — quarantine/destroy
    )),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_tracking_number", ["formTrackingNumber"])
    .index("by_part_number", ["partNumber"])
    .index("by_part", ["partId"]),

  // ═══════════════════════════════════════════════════════
  // RETURN TO SERVICE
  // IMMUTABLE — no UPDATE operations permitted.
  // v2: signatureAuthEventId now v.id("signatureAuthEvents") (REG-005 / QA-007)
  // ═══════════════════════════════════════════════════════
  returnToService: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),

    inspectionRecordId: v.optional(v.id("inspectionRecords")),

    // IA Sign-off
    signedByIaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),       // Captured at signing — snapshot
    iaRepairStationCert: v.optional(v.string()),
    iaAuthorizedWorkScope: v.optional(v.string()),  // from repairStationAuthorizations at signing
    iaCurrentOnRtsDate: v.boolean(),        // IA currency verified at signing time

    returnToServiceDate: v.number(),
    returnToServiceStatement: v.string(),   // NOT optional — required per regulatory requirements
    aircraftHoursAtRts: v.number(),
    // INVARIANT: aircraftHoursAtRts must equal the work order's aircraftTotalTimeAtClose.
    //   Source of truth is the work order. (Cilla 3.3 — aircraft time snapshot consistency)

    limitations: v.optional(v.string()),

    // Cryptographic signature
    signatureHash: v.string(),
    signatureTimestamp: v.number(),
    signatureAuthEventId: v.id("signatureAuthEvents"),  // v2: typed foreign key (REG-005)

    createdAt: v.number(),
    // NOTE: Immutable — no updatedAt.
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_organization", ["organizationId"]),

  // ═══════════════════════════════════════════════════════
  // CUSTOMERS (Aircraft owners / operators)
  // v2: Removed aircraftIds array (QA-005 — inverted relationship)
  //     Aircraft now carry customerId. Query aircraft by customer using aircraft.by_customer.
  // ═══════════════════════════════════════════════════════
  customers: defineTable({
    organizationId: v.id("organizations"),

    name: v.string(),
    companyName: v.optional(v.string()),
    customerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("charter_operator"),
      v.literal("flight_school"),
      v.literal("government")
    ),

    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),

    // v2: aircraftIds array removed (QA-005).
    // To get all aircraft for a customer: query aircraft.by_customer(customerId)
    // This eliminates write-conflict hotspot on the customer document when multiple
    // aircraft for the same customer arrive simultaneously.

    notes: v.optional(v.string()),

    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_name", ["organizationId", "name"]),

  // ═══════════════════════════════════════════════════════
  // AUDIT LOG
  // Append-only. Never deleted. Captures all write events.
  // v2: organizationId made required for regulatory event types (Marcus 1.1.1)
  //     Added by_technician index (Marcus 1.1.3)
  //     Added by_org_event_type index (Cilla 6.3 / NB-01)
  //
  // NOTE on organizationId optionality:
  //   The schema retains optional for system-level events (startup, migrations,
  //   cross-org system events). However, for all regulated event types
  //   (record_signed, correction_created, technician_signed), organizationId
  //   MUST be present. The mutation that writes these event types enforces this.
  //   (Marcus 1.1.1 — FAA inspection auditability requirement)
  // ═══════════════════════════════════════════════════════
  auditLog: defineTable({
    organizationId: v.optional(v.id("organizations")),
    // INVARIANT [auditLog.write]: For event types record_signed, correction_created,
    //   technician_signed, record_viewed, record_exported — organizationId must be set.
    //   System-level events (system_event, access_denied) may have null organizationId.
    //   The audit log write helper enforces this by event type.

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
      v.literal("system_event")
    ),

    tableName: v.string(),          // Which table was affected
    recordId: v.string(),           // ID of the affected record

    userId: v.optional(v.string()), // Clerk user ID
    technicianId: v.optional(v.id("technicians")),

    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Change details
    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.string()),  // JSON stringified
    newValue: v.optional(v.string()),  // JSON stringified

    notes: v.optional(v.string()),

    timestamp: v.number(),  // When event occurred
  })
    .index("by_record", ["tableName", "recordId"])
    .index("by_organization", ["organizationId", "timestamp"])
    .index("by_user", ["userId", "timestamp"])
    .index("by_technician", ["technicianId", "timestamp"])            // v2: Marcus 1.1.3
    .index("by_event_type", ["eventType", "timestamp"])
    .index("by_org_event_type", ["organizationId", "eventType", "timestamp"])  // v2: Cilla 6.3
    .index("by_timestamp", ["timestamp"]),

  // ═══════════════════════════════════════════════════════
  // PART INSTALLATION HISTORY
  // Tracks the full history of a part's installation and removal
  // ═══════════════════════════════════════════════════════
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
```

---

## Schema v2 Summary

| Table | Records Type | Mutable? | Scope | v2 Changes |
|---|---|---|---|---|
| `signatureAuthEvents` | **NEW** | Limited (consumed flag) | System | New table — defines signatureAuthEventId |
| `organizations` | Operational | Yes | — | DOM/QCM now reference technicians |
| `aircraft` | Registry | Limited | Global | Added customerId |
| `aircraftRegistrationHistory` | Historical | No (append) | Aircraft | None |
| `engines` | Registry | Yes | Global | None |
| `technicians` | Personnel | Yes | Organization | None |
| `certificates` | Compliance | Append-only once issued | Technician | None |
| `workOrders` | Operational | Yes until closed | Organization | Added on_hold, voided, closedByTechnicianId |
| `discrepancies` | Operational | Yes until dispositioned | Organization | Added melDeferralDate, dispositionedCertificateNumber |
| `taskCards` | Operational | Yes until complete | Organization | Status enum fixed; steps array removed |
| `taskCardSteps` | **NEW** | Yes until signed | Organization | Extracted from taskCards |
| `maintenanceRecords` | **Legal record** | **NEVER** | Aircraft | signatureAuthEventId typed; ratingsExercised added |
| `inspectionRecords` | **Legal record** | **NEVER** | Aircraft | iaCurrentOnInspectionDate; notes; indexes |
| `airworthinessDirectives` | Reference | Yes (FAA updates) | Global | None |
| `adCompliance` | Compliance | Append-only history | Aircraft | New indexes; invariants documented |
| `parts` | Inventory | Yes | Organization | Invariants documented |
| `eightOneThirtyRecords` | Provenance | Limited | Organization | suspectStatus added |
| `returnToService` | **Legal record** | **NEVER** | Aircraft | signatureAuthEventId typed; iaCurrentOnRtsDate added |
| `customers` | Operational | Yes | Organization | aircraftIds removed |
| `auditLog` | Audit | **NEVER** | Organization | New indexes; technicianId index added |
| `partInstallationHistory` | Historical | No (append) | Part | None |

---

## Index Coverage Analysis (v2)

### New Indexes Added in v2

| Table | Index | Purpose | Source |
|---|---|---|---|
| `aircraft` | `by_customer` | Customer fleet queries | QA-005 |
| `discrepancies` | `by_org_mel_expiry` | Org-scoped MEL alerting | Cilla 6.1 / NB-01 |
| `maintenanceRecords` | `by_org_completion_date` | Org-level billing/reporting | Cilla 6.1 / NB-01 |
| `adCompliance` | `by_engine` | Engine-specific AD queries | Marcus 2.1.2 / NB-01 |
| `adCompliance` | `by_part` | Part-specific AD queries | Marcus 2.1.2 / NB-01 |
| `adCompliance` | `by_org_next_due_date` | Org-scoped AD alerting | Cilla 6.1 / NB-01 |
| `inspectionRecords` | `by_aircraft_date` | Chronological inspection history | Cilla 6.2 / NB-01 |
| `auditLog` | `by_technician` | Technician-scoped audit trail | Marcus 1.1.3 |
| `auditLog` | `by_org_event_type` | Compliance audit by org + type | Cilla 6.3 / NB-01 |
| `taskCards` | `by_org_assigned` | Org-scoped assignee worklist | Cilla 6.1 |
| `taskCardSteps` | `by_task_card` | Primary step queries | QA-002 |
| `taskCardSteps` | `by_task_card_step` | Ordered step retrieval | QA-002 |
| `taskCardSteps` | `by_work_order` | WO-level step queries | QA-002 |
| `signatureAuthEvents` | `by_technician_timestamp` | Technician auth history | REG-005 |
| `signatureAuthEvents` | `by_expiry` | TTL cleanup jobs | REG-005 |

### Total: 7 required indexes from NB-01 — all present ✓

---

## Schema-Enforced Invariants Reference

The following invariants are documented in this schema and MUST be enforced in the named mutation. They cannot be enforced by the Convex type system but are required for regulatory compliance and data integrity.

| # | Invariant | Enforcing Mutation | Blocker |
|---|---|---|---|
| INV-01 | Correction records require all 5 correction fields | `createCorrectionRecord` | REG-001 |
| INV-02 | `ratingsExercised` populated at every signing | All signing mutations | REG-002 |
| INV-03 | `adCompliance` requires ≥1 of aircraftId/engineId/partId | `createAdCompliance` | REG-003 |
| INV-04 | DOM/QCM must have valid certificate on assignment | `setOrganizationLeadership` | REG-004 |
| INV-05 | `signatureAuthEvent` consumed once, before expiry | All signing mutations | REG-005 |
| INV-06 | `aircraftTotalTimeAtClose` required and ≥ atOpen | `closeWorkOrder` | REG-006 |
| INV-07 | OSP parts require `eightOneThirtyId` before install | `installPart` | REG-007 |
| INV-08 | `adComplianceReviewed: true` requires refs or notes | `closeInspection` | REG-008 |
| INV-09 | `taskCards.status` enum aligned with arch doc | `updateTaskCardStatus` | QA-001 |
| INV-10 | Step sign-off logged per-step in `taskCardSteps` | `signTaskCardStep` | QA-002 |
| INV-11 | `isLifeLimited: true` requires lifeLimitHours or Cycles | `createPart`, `updatePart` | QA-003 |
| INV-12 | `hasShelfLifeLimit: true` requires `shelfLifeLimitDate` | `createPart`, `updatePart` | QA-003 |
| INV-13 | `hasIaAuthorization: true` requires `iaExpiryDate` | `createCertificate` | QA-003 |
| INV-14 | `workOrderNumber` unique within organization | `createWorkOrder` | QA-004 |
| INV-15 | `customerId` on `aircraft` (not array on `customers`) | `associateAircraftCustomer` | QA-005 |
| INV-16 | `corrected` disposition requires correctiveAction + recordId | `dispositionDiscrepancy` | QA-006 |
| INV-17 | `melDeferralDate` required for MEL deferral dispositions | `dispositionDiscrepancy` | QA-008 |
| INV-18 | Aircraft total time monotonically increasing | `closeWorkOrder`, `updateAircraftTime` | Cilla 3.3 |
| INV-19 | `closedAt`/`closedByUserId`/`closedByTechnicianId` set on close | `closeWorkOrder` | Cilla 4.2 |
| INV-20 | `returnToServiceStatement` required when returnedToService | `createMaintenanceRecord` | Cilla 4.3 |

---

*Schema v2 — Devraj Anand — 2026-02-22*  
*All 16 Phase 1 gate review blockers addressed.*  
*This schema is submitted for Marcus Webb and Cilla Oduya sign-off.*
