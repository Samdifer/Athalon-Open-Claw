# Athelon — Convex Schema
**Document Type:** Implementation Specification — Convex TypeScript Schema  
**Author:** Devraj Anand (Backend Engineer, Convex)  
**Date:** Day 3–4, Phase 1  
**Status:** DRAFT — Pending data model review sign-off  
**Dependencies:** data-model-architecture.md (Rafael Mendoza)

---

## Author's Notes

*I've been working from Rafael's architecture document. It's thorough — he always is. I've made a few decisions in translation that I should be explicit about.*

*One thing I noticed that I haven't raised yet: Rafael's model has `steps` as an embedded array inside TaskCard. In Convex, embedding an array of complex objects inside a document works fine for reads, but it creates a problem for concurrent sign-offs: two mechanics signing different steps simultaneously will have a write conflict on the parent TaskCard document. This is a real concurrency issue in a shop setting.*

*I'll raise this during the review. The right solution is to break TaskCardStep out into its own table. But I want to see if Rafael arrives at the same conclusion on his own during the discussion — it's more useful to agree on the problem than for me to just announce the fix.*

*The schema below implements Rafael's design faithfully, including the embedded steps (for now), so the review can happen against the actual proposed schema.*

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

### Indexing Strategy
- Primary queries indexed first
- Compound indexes for range queries
- Full-text search indexes where supported

---

## Complete Convex Schema

```typescript
// convex/schema.ts
// Athelon — Aviation MRO SaaS Platform
// Primary schema author: Devraj Anand
// Architecture: Rafael Mendoza
// Regulatory Review: Marcus Webb, Capt. Rosa Eaton

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────
// SHARED VALIDATOR TYPES (defined as constants for reuse)
// ─────────────────────────────────────────────

// Certificate type enum values
const certificateType = v.union(
  v.literal("A&P"),           // Airframe and Powerplant
  v.literal("airframe_only"), // Airframe rating only
  v.literal("powerplant_only"), // Powerplant rating only
  v.literal("IA"),            // Inspection Authorization
  v.literal("repairman"),     // FAA Repairman Certificate
  v.literal("repair_station"), // Repair station authorized person
  v.literal("other")
);

// Aircraft airworthiness status
const aircraftStatus = v.union(
  v.literal("airworthy"),
  v.literal("out_of_service"),
  v.literal("in_maintenance"),
  v.literal("destroyed"),
  v.literal("sold"),
  v.literal("unknown")
);

// Work order status lifecycle
const workOrderStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("pending_inspection"),
  v.literal("pending_signoff"),
  v.literal("open_discrepancies"),
  v.literal("closed"),
  v.literal("cancelled")
);

// Discrepancy disposition
const discrepancyDisposition = v.union(
  v.literal("corrected"),
  v.literal("deferred_mel"),
  v.literal("deferred_grounded"),
  v.literal("no_fault_found"),
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
const technicianSignature = v.object({
  technicianId: v.id("technicians"),
  legalName: v.string(),           // captured at signing time
  certificateNumber: v.string(),   // captured at signing time
  certificateType: certificateType,
  scopeOfWork: v.string(),
  signatureTimestamp: v.number(),  // Unix timestamp (ms)
  signatureHash: v.optional(v.string()),
});

// Part record (embedded in maintenance records)
const embeddedPartRecord = v.object({
  partNumber: v.string(),
  partName: v.string(),
  serialNumber: v.optional(v.string()),
  quantity: v.number(),
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
  // ORGANIZATIONS
  // ═══════════════════════════════════════════════════════
  organizations: defineTable({
    name: v.string(),
    part145CertificateNumber: v.optional(v.string()),  // null if not Part 145
    part145Ratings: v.array(v.string()),               // e.g. ["Class A Airframe", "Class A Powerplant"]
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    directorOfMaintenance: v.optional(v.string()),
    qualityControlManager: v.optional(v.string()),
    rsmRevision: v.optional(v.string()),          // Repair Station Manual current revision
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
  // ═══════════════════════════════════════════════════════
  aircraft: defineTable({
    // Identity — the triple (make, model, serialNumber) is the true unique identifier
    make: v.string(),
    model: v.string(),
    series: v.optional(v.string()),
    serialNumber: v.string(),          // Manufacturer Serial Number (MSN)
    
    // Current registration
    currentRegistration: v.optional(v.string()),  // N-number (nullable)
    
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
    totalTimeAirframeHours: v.number(),
    totalTimeAirframeAsOfDate: v.number(), // Unix timestamp
    
    // Ownership and operation
    ownerName: v.optional(v.string()),
    ownerAddress: v.optional(v.string()),
    operatingOrganizationId: v.optional(v.id("organizations")),
    operatingRegulation: v.optional(v.union(
      v.literal("part_91"),
      v.literal("part_135"),
      v.literal("part_121"),
      v.literal("part_137"),
      v.literal("part_91_135_mixed")
    )),
    
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
    .index("by_status", ["status"]),

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
    
    // Time tracking
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
    userId: v.optional(v.string()),  // Clerk user ID (nullable)
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
  // ═══════════════════════════════════════════════════════
  certificates: defineTable({
    technicianId: v.id("technicians"),
    
    certificateType: certificateType,
    certificateNumber: v.string(),  // FAA-issued
    issueDate: v.number(),          // Unix timestamp
    
    // Ratings (for A&P)
    ratings: v.array(v.union(
      v.literal("airframe"),
      v.literal("powerplant")
    )),
    
    // Inspection Authorization
    hasIaAuthorization: v.boolean(),
    iaExpiryDate: v.optional(v.number()),  // Always March 31 of applicable year
    
    // IA Renewal Activity Log (per 14 CFR 65.93)
    iaRenewalActivities: v.array(v.object({
      date: v.number(),
      activityType: v.union(
        v.literal("inspection_performed"),
        v.literal("pmi_review"),
        v.literal("faa_exam"),
        v.literal("other")
      ),
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
  // ═══════════════════════════════════════════════════════
  workOrders: defineTable({
    workOrderNumber: v.string(),    // Human-readable, org-unique
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
    
    description: v.string(),       // Customer-facing description
    squawks: v.optional(v.string()),  // Pilot-reported issues at intake
    
    // Timestamps
    openedAt: v.number(),
    openedByUserId: v.string(),    // Clerk user ID
    targetCompletionDate: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    closedByUserId: v.optional(v.string()),
    
    // Aircraft time snapshot
    aircraftTotalTimeAtOpen: v.number(),
    aircraftTotalTimeAtClose: v.optional(v.number()),
    
    // Customer / Billing
    customerId: v.optional(v.id("customers")),
    priority: v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("aog")  // Aircraft on Ground — highest priority
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
    
    // Disposition
    dispositionedByTechnicianId: v.optional(v.id("technicians")),
    dispositionedAt: v.optional(v.number()),
    
    // MEL deferral fields (populated if disposition == deferred_mel)
    melItemNumber: v.optional(v.string()),
    melCategory: v.optional(v.union(
      v.literal("A"),  // 10 calendar days
      v.literal("B"),  // 3 calendar days
      v.literal("C"),  // 120 calendar days
      v.literal("D")   // No calendar limit specified
    )),
    melExpiryDate: v.optional(v.number()),
    
    // Corrective action (if disposition == corrected)
    correctiveAction: v.optional(v.string()),
    correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),
    
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
    .index("by_mel_expiry", ["melExpiryDate"]),  // for MEL expiry alerting

  // ═══════════════════════════════════════════════════════
  // TASK CARDS
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
    approvedDataSource: v.string(),     // AMM chapter, STC number, AD number, etc.
    approvedDataRevision: v.optional(v.string()),
    
    assignedToTechnicianId: v.optional(v.id("technicians")),
    
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("voided")
    ),
    
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    notes: v.optional(v.string()),
    
    // NOTE (Devraj, internal): steps are embedded here per Rafael's architecture.
    // I have a concern about concurrent write conflicts in a multi-mechanic shop.
    // Will raise in review meeting. For now, implementing as specified.
    steps: v.array(v.object({
      stepNumber: v.number(),
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
      signedByTechnicianId: v.optional(v.id("technicians")),
      signedAt: v.optional(v.number()),
      signedCertificateNumber: v.optional(v.string()),  // Captured at signing
      
      // N/A fields (populated when status → na)
      naReason: v.optional(v.string()),
      naAuthorizedById: v.optional(v.id("technicians")),
      naAuthorizedAt: v.optional(v.number()),
      
      notes: v.optional(v.string()),
      discrepancyIds: v.array(v.id("discrepancies")),  // Found during this step
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_status", ["organizationId", "status"])
    .index("by_assigned", ["assignedToTechnicianId", "status"]),

  // ═══════════════════════════════════════════════════════
  // MAINTENANCE RECORDS (14 CFR 43.9)
  // IMMUTABLE — no UPDATE operations permitted
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
    aircraftTotalTimeHours: v.number(),  // TT at completion
    
    // Work order reference
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    organizationCertificateNumber: v.optional(v.string()),  // Repair station cert
    
    // Aircraft-scoped sequence number (logbook entry number)
    sequenceNumber: v.number(),
    
    // Work description (per 14 CFR 43.9(a)(1))
    workPerformed: v.string(),
    approvedDataReference: v.string(),  // NOT optional — required per 43.9(a)(1)
    partsReplaced: v.array(embeddedPartRecord),
    
    // Date (per 14 CFR 43.9(a)(2))
    completionDate: v.number(),         // Unix timestamp — date work was COMPLETED
    
    // Personnel (per 14 CFR 43.9(a)(3))
    technicians: v.array(technicianSignature),
    
    // Primary signatory (the person making the record entry)
    signingTechnicianId: v.id("technicians"),
    signingTechnicianLegalName: v.string(),      // Captured at signing
    signingTechnicianCertNumber: v.string(),     // Captured at signing
    signingTechnicianCertType: certificateType,  // Captured at signing
    
    // Signature (per 14 CFR 43.9(a)(4) + AC 43-9C)
    signatureTimestamp: v.number(),
    signatureHash: v.string(),           // Hash of all record fields at signing
    signatureAuthEventId: v.string(),    // Auth system event ID proving identity
    
    // Return to service determination
    returnedToService: v.boolean(),
    returnToServiceStatement: v.optional(v.string()),
    
    // Discrepancy cross-references
    discrepanciesFound: v.array(v.id("discrepancies")),
    discrepanciesCorrected: v.array(v.id("discrepancies")),
    discrepancyListProvided: v.optional(v.boolean()),
    
    // For correction records only
    corrects: v.optional(v.id("maintenanceRecords")),
    correctionFieldName: v.optional(v.string()),
    correctionOriginalValue: v.optional(v.string()),
    correctionCorrectedValue: v.optional(v.string()),
    correctionReason: v.optional(v.string()),
    
    createdAt: v.number(),  // When the record was created in the system
    // NOTE: NO updatedAt field — this record is immutable after creation
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_aircraft_sequence", ["aircraftId", "sequenceNumber"])
    .index("by_work_order", ["workOrderId"])
    .index("by_organization", ["organizationId"])
    .index("by_completion_date", ["aircraftId", "completionDate"])
    .index("by_technician", ["signingTechnicianId"]),

  // ═══════════════════════════════════════════════════════
  // INSPECTION RECORDS (14 CFR 43.11)
  // IMMUTABLE — separate from 43.9 records per regulatory distinction
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
    
    // Aircraft identification (denormalized at signing)
    aircraftMake: v.string(),
    aircraftModel: v.string(),
    aircraftSerialNumber: v.string(),
    aircraftRegistration: v.string(),
    
    // Time in service at inspection (per 14 CFR 43.11(a)(2))
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
    
    // IA sign-off (annual inspections require IA per 14 CFR 65.91)
    iaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),     // Captured at signing
    iaSignatureTimestamp: v.number(),
    iaSignatureHash: v.string(),
    iaSignatureAuthEventId: v.string(),
    
    // Discrepancy list (per 14 CFR 43.11(b))
    discrepancyListIssuedToOwner: v.optional(v.boolean()),
    discrepancyListIssuedAt: v.optional(v.number()),
    discrepancyListRecipient: v.optional(v.string()),
    
    // AD compliance review (documented during inspection)
    adComplianceReviewed: v.boolean(),
    adComplianceReferenceIds: v.array(v.id("adCompliance")),
    
    // Next inspection scheduling
    nextInspectionDueDate: v.optional(v.number()),
    nextInspectionDueHours: v.optional(v.number()),
    
    sequenceNumber: v.number(),  // Aircraft-scoped sequence
    
    createdAt: v.number(),
    // NOTE: NO updatedAt — immutable
  })
    .index("by_aircraft", ["aircraftId"])
    .index("by_work_order", ["workOrderId"])
    .index("by_type_date", ["aircraftId", "inspectionType", "inspectionDate"])
    .index("by_organization", ["organizationId"]),

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
  // ═══════════════════════════════════════════════════════
  adCompliance: defineTable({
    adId: v.id("airworthinessDirectives"),
    
    // What this compliance record is for
    aircraftId: v.optional(v.id("aircraft")),    // Aircraft-level AD
    engineId: v.optional(v.id("engines")),       // Engine-specific AD
    partId: v.optional(v.id("parts")),            // Part/component-specific AD
    
    organizationId: v.id("organizations"),
    
    // Applicability determination
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
      v.literal("pending_determination")
    ),
    
    // Compliance history (append-only)
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
    .index("by_ad", ["adId"])
    .index("by_status", ["organizationId", "complianceStatus"])
    .index("by_next_due_date", ["nextDueDate"])   // for overdue alerting
    .index("by_next_due_hours", ["aircraftId", "nextDueHours"]),

  // ═══════════════════════════════════════════════════════
  // PARTS / INVENTORY
  // ═══════════════════════════════════════════════════════
  parts: defineTable({
    partNumber: v.string(),       // Manufacturer's part number
    partName: v.string(),
    description: v.optional(v.string()),
    
    // Serialization
    serialNumber: v.optional(v.string()),
    isSerialized: v.boolean(),
    
    // Life tracking
    isLifeLimited: v.boolean(),
    lifeLimitHours: v.optional(v.number()),
    lifeLimitCycles: v.optional(v.number()),
    hasShelfLifeLimit: v.boolean(),
    shelfLifeLimitDate: v.optional(v.number()),
    
    // Prior service time (from 8130-3 at receiving)
    hoursAccumulatedBeforeInstall: v.optional(v.number()),
    cyclesAccumulatedBeforeInstall: v.optional(v.number()),
    
    condition: partCondition,
    
    location: v.union(
      v.literal("inventory"),
      v.literal("installed"),
      v.literal("removed_pending_disposition"),
      v.literal("quarantine"),
      v.literal("scrapped"),
      v.literal("returned_to_vendor")
    ),
    
    // Current installation (if installed)
    currentAircraftId: v.optional(v.id("aircraft")),
    currentEngineId: v.optional(v.id("engines")),
    installPosition: v.optional(v.string()),
    installedAt: v.optional(v.number()),
    installedByWorkOrderId: v.optional(v.id("workOrders")),
    hoursAtInstallation: v.optional(v.number()),
    cyclesAtInstallation: v.optional(v.number()),
    
    // Removal history
    removedAt: v.optional(v.number()),
    removedByWorkOrderId: v.optional(v.id("workOrders")),
    
    // Provenance
    organizationId: v.id("organizations"),
    receivingDate: v.optional(v.number()),
    receivingWorkOrderId: v.optional(v.id("workOrders")),
    supplier: v.optional(v.string()),
    purchaseOrderNumber: v.optional(v.string()),
    isOwnerSupplied: v.boolean(),      // Owner-supplied part (OSP) flag
    
    // Documentation
    eightOneThirtyId: v.optional(v.id("eightOneThirtyRecords")),
    
    // Quarantine
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
  // ═══════════════════════════════════════════════════════
  eightOneThirtyRecords: defineTable({
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),
    
    // Block 1 — Approving Authority
    approvingAuthority: v.string(),
    
    // Block 2 — Applicant's Name and Address
    applicantName: v.string(),
    applicantAddress: v.optional(v.string()),
    
    // Block 3 — Form Tracking Number
    formTrackingNumber: v.string(),
    
    // Block 4 — Organization
    organizationName: v.optional(v.string()),
    
    // Block 5 — Work Order / Contract / Invoice
    workOrderReference: v.optional(v.string()),
    
    // Block 6 — Item Number
    itemNumber: v.optional(v.string()),
    
    // Block 7 — Description
    partDescription: v.string(),
    
    // Block 8 — Part Number
    partNumber: v.string(),
    
    // Block 9 — Eligibility
    partEligibility: v.optional(v.string()),
    
    // Block 10 — Quantity
    quantity: v.number(),
    
    // Block 11 — Serial/Batch Number
    serialBatchNumber: v.optional(v.string()),
    
    // Block 12 — Life-Limited Part
    isLifeLimited: v.boolean(),
    lifeRemainingHours: v.optional(v.number()),
    lifeRemainingCycles: v.optional(v.number()),
    
    // Block 13 — Status/Work
    statusWork: v.union(
      v.literal("new"),
      v.literal("overhauled"),
      v.literal("repaired"),
      v.literal("inspected"),
      v.literal("modified")
    ),
    
    // Block 14 — Remarks
    remarks: v.optional(v.string()),
    
    // Block 15 — Certifying Statement
    certifyingStatement: v.string(),
    
    // Block 16 — Authorized Signature
    authorizedSignatoryName: v.string(),
    signatureDate: v.number(),
    
    // Block 17 — Approval/Authorization Number
    approvalNumber: v.string(),
    
    // Block 18-19 — Export (if applicable)
    exportAuthorizationNumber: v.optional(v.string()),
    
    // Document storage
    pdfUrl: v.optional(v.string()),
    
    // Receiving verification
    receivedByOrganizationId: v.id("organizations"),
    receivedDate: v.number(),
    verifiedByUserId: v.optional(v.string()),
    verificationNotes: v.optional(v.string()),
    
    // Suspect flag
    isSuspect: v.boolean(),
    suspectReason: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_tracking_number", ["formTrackingNumber"])
    .index("by_part_number", ["partNumber"])
    .index("by_part", ["partId"]),

  // ═══════════════════════════════════════════════════════
  // RETURN TO SERVICE
  // ═══════════════════════════════════════════════════════
  returnToService: defineTable({
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    
    inspectionRecordId: v.optional(v.id("inspectionRecords")),
    
    // IA Sign-off
    signedByIaTechnicianId: v.id("technicians"),
    iaCertificateNumber: v.string(),
    iaRepairStationCert: v.optional(v.string()),
    
    returnToServiceDate: v.number(),
    returnToServiceStatement: v.string(),
    aircraftHoursAtRts: v.number(),
    
    limitations: v.optional(v.string()),
    
    // Cryptographic signature
    signatureHash: v.string(),
    signatureTimestamp: v.number(),
    signatureAuthEventId: v.string(),
    
    createdAt: v.number(),
    // NOTE: Immutable — no updatedAt
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_aircraft", ["aircraftId"])
    .index("by_organization", ["organizationId"]),

  // ═══════════════════════════════════════════════════════
  // CUSTOMERS (Aircraft owners / operators)
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
    
    aircraftIds: v.array(v.id("aircraft")),   // Aircraft belonging to this customer
    
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
  // ═══════════════════════════════════════════════════════
  auditLog: defineTable({
    organizationId: v.optional(v.id("organizations")),
    
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
    
    tableName: v.string(),          // Which table
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
    .index("by_event_type", ["eventType", "timestamp"])
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

## Schema Summary

| Table | Records Type | Mutable? | Scope |
|---|---|---|---|
| `organizations` | Operational | Yes | — |
| `aircraft` | Registry | Limited | Global |
| `aircraftRegistrationHistory` | Historical | No (append) | Aircraft |
| `engines` | Registry | Yes | Global |
| `technicians` | Personnel | Yes | Organization |
| `certificates` | Compliance | Append-only once issued | Technician |
| `workOrders` | Operational | Yes until closed | Organization |
| `discrepancies` | Operational | Yes until dispositioned | Organization |
| `taskCards` | Operational | Yes until complete | Organization |
| `maintenanceRecords` | **Legal record** | **NEVER** | Aircraft |
| `inspectionRecords` | **Legal record** | **NEVER** | Aircraft |
| `airworthinessDirectives` | Reference | Yes (FAA updates) | Global |
| `adCompliance` | Compliance | Append-only history | Aircraft |
| `parts` | Inventory | Yes | Organization |
| `eightOneThirtyRecords` | Provenance | Limited | Organization |
| `returnToService` | **Legal record** | **NEVER** | Aircraft |
| `customers` | Operational | Yes | Organization |
| `auditLog` | Audit | **NEVER** | Organization |
| `partInstallationHistory` | Historical | No (append) | Part |

---

## Devraj's Private Notes (Internal — not in architecture document)

*These are thoughts I'm carrying into the review meeting:*

**The TaskCardStep concurrency problem:** Rafael embedded steps as an array inside TaskCard. In a shop with 4 mechanics each signing different steps simultaneously, every step sign-off is a write to the *same TaskCard document*. Convex serializes writes per document, so there's no data corruption — but there will be retries and latency spikes. More importantly, if two writes conflict, Convex resolves it with optimistic concurrency control: the second write retries. In a high-throughput shop with 10-15 mechanics, this becomes a performance issue.*

*The fix is obvious: `taskCardSteps` should be its own table, with `taskCardId` as a foreign key. Each step sign-off is then an independent write with no contention. This also enables per-step audit trails without embedding them in the parent document.*

*I've implemented the schema with steps embedded (per Rafael's spec) because I want to raise this in the review meeting with the actual code in front of everyone. It's easier to show the problem with working code than to explain it abstractly.*

*I'll let Rafael present, let Marcus and Rosa do their regulatory check, then I'll raise it. The right time is after the overall structure is approved — then we fix the one concrete implementation issue.*

---

## Index Coverage Analysis

### Critical Query Patterns

| Query | Index Used | Performance |
|---|---|---|
| All work orders for an aircraft | `workOrders.by_aircraft` | O(log n) |
| All maintenance records for aircraft | `maintenanceRecords.by_aircraft` | O(log n) |
| All open discrepancies in an org | `discrepancies.by_status` | O(log n) |
| AD compliance records for aircraft | `adCompliance.by_aircraft` | O(log n) |
| Overdue ADs by next-due-date | `adCompliance.by_next_due_date` | O(log n) |
| Certificate lookup by number | `certificates.by_certificate_number` | O(log n) |
| Parts in quarantine | `parts.by_condition` | O(log n) |
| MEL items expiring | `discrepancies.by_mel_expiry` | O(log n) |
| Audit trail for a record | `auditLog.by_record` | O(log n) |

All critical query patterns are covered by indexes. No table scans required for standard operations.

---

## Migration Notes

*For Phase 1 launch, this is a greenfield schema — no migration required. However, several fields will need to be populated by future migrations as features are added:*

1. `aircraft.operatingRegulation` — will be set as customers configure their fleet
2. `airworthinessDirectives.applicabilityStructured` — will be parsed from raw text as we build the AD parser
3. `certificates.repairStationAuthorizations` — populated as repair stations configure their authorized personnel lists
4. `adCompliance.nextDueDate/Hours/Cycles` — computed and cached after each compliance event; initial values require manual entry or AD import

---

*Schema ready for team review. One architectural concern to raise in the meeting.*
