# Athelon — Phase 2: Parts Traceability Module
**Document Type:** Feature Specification — Backend Design + Product Rationale  
**Authors:** Devraj Anand (Backend Engineer, Convex) + Nadia Solis (Product Manager)  
**Date:** 2026-02-22  
**Status:** DRAFT — Pending Marcus Webb regulatory sign-off  
**Builds On:** `phase-1-data-model/convex-schema-v2.md`, `phase-1-data-model/regulatory-requirements.md`  
**Scope:** Parts receiving, inspection, installation, removal, and full traceability chain

---

## Devraj's Preamble

*Parts traceability is the regulatory load-bearing wall of this entire platform. We can recover from a UI bug or a slow query. We cannot recover from a traceability gap that allows an unpapered part to be installed in a flight-critical position and nobody can prove what it was or where it came from. The schema in v2 gives us the right tables. This document specifies the mutations that populate them correctly, the invariants that govern every state transition, and the data model for the 8130-3 that Rosa and Marcus flagged as the most commonly botched record in MRO software.*

*Nadia's product rationale is embedded throughout — marked clearly. I've found that understanding the "why a user needs this" helps me not over-engineer the wrong thing.*

---

## 1. Part Record Lifecycle

### 1.1 State Machine Overview

A part record in the `parts` table moves through a defined set of states. The `location` field is the primary state carrier. The `condition` field is orthogonal — a part can be `serviceable` while in `inventory`, or `unserviceable` while `installed` (though the second combination should never be reached via correct mutation paths).

```
                    ┌─────────────────────────────────────────┐
                    │             LIFECYCLE STATES             │
                    │                                          │
  [Receive Part]    │                                          │
       ↓            │   inventory ──────────────────────────── │──→ returned_to_vendor
  [Create Record]   │       │                                  │
       ↓            │       │  [installPart]                   │
  location:         │       ↓                                  │
  "inventory"       │   installed ──[removePart]──────────────→│──→ removed_pending_disposition
  condition:        │       │                                  │         │
  "new" / "svc"     │       │  [tagPartUnserviceable]          │         │ [receivingInspection]
                    │       ↓                                  │         │
                    │   unserviceable ────────────────────────→│── quarantine
                    │                                          │         │
                    │                                          │         │ [confirmScrapped]
                    │                                          │         ↓
                    │                                          │      scrapped
                    └─────────────────────────────────────────┘
```

**Valid `location` transitions:**

| From | To | Triggering Mutation | Guard Conditions |
|---|---|---|---|
| *(not yet created)* | `inventory` | `receivePart` | 8130-3 present or receiving inspection complete |
| `inventory` | `installed` | `installPart` | INV-07, shelf-life check, LL part life check |
| `installed` | `removed_pending_disposition` | `removePart` | Work order open + technician authorized |
| `removed_pending_disposition` | `inventory` | `dispositionRemovedPart` | Condition set to `serviceable` or `overhauled` |
| `removed_pending_disposition` | `quarantine` | `quarantinePart` | Reason required |
| `removed_pending_disposition` | `scrapped` | `scrapPart` | IA or DOM authorization required for life-limited parts |
| `inventory` | `quarantine` | `quarantinePart` | Reason required |
| `quarantine` | `scrapped` | `scrapPart` | Confirmation required |
| `inventory` | `returned_to_vendor` | `returnPartToVendor` | No current WO dependency |

> **Nadia:** *The `removed_pending_disposition` state was a specific ask from our beta shop contacts. When a part comes off an airplane, the mechanic doesn't always know right away whether it's going back into inventory, going to the shelf, or getting scrapped. They need a "holding" state. What they absolutely cannot do is remove a part and have it silently disappear from the record. Every removal needs a disposition outcome before the work order can close. That's both a product UX requirement and a regulatory one — the `closeWorkOrder` mutation already enforces open dispositions as a blocker.*

### 1.2 Receiving Phase

When a part arrives at the shop, the following must be established **before** the part record is created:

1. **Identity verification:** Part number and description must match the order/paperwork.
2. **Documentation check:** Is there an 8130-3, a Certificate of Conformance (CoC), or other airworthiness documentation?
3. **Condition assessment:** New, serviceable tagged, overhauled, etc.
4. **Owner-supplied flag:** Is this a customer-supplied part (OSP)?

Receiving creates two records atomically:
- A `parts` record (location: `inventory`, condition per documentation)
- An `eightOneThirtyRecords` record if a tag was received, linked via `parts.eightOneThirtyId`

If no 8130-3 is present on receipt, the `eightOneThirtyId` remains null. The part may exist in inventory but **INV-07** (`installPart` mutation guard) will block installation until either the tag is attached or a receiving inspection is on record.

> **Nadia:** *The most common support ticket we're going to get in the first month is "why can't I install this part?" The answer will almost always be "missing 8130-3." We need the error message from `installPart` to be specific: "This part has no linked airworthiness documentation. Attach an 8130-3 record or record a receiving inspection before installation." Generic "validation error" messages will cost us support hours.*

### 1.3 Inspection Phase (Receiving Inspection)

For parts received without an 8130-3 — particularly owner-supplied parts — a **receiving inspection** must be performed and documented. The inspection creates a `maintenanceRecords` entry with `recordType: "maintenance_43_9"` and links it to the part via the work order. Until this link exists, the part is blocked from installation per INV-07.

For **Owner-Supplied Parts (OSP)**, 14 CFR 145.201(c) creates a hard requirement: the repair station cannot return the article to service unless it can establish that the part meets airworthiness requirements. The `isOwnerSupplied: true` flag on the `parts` record triggers additional validation in `installPart` — the 8130-3 check is **not skippable** for OSP parts under any circumstance.

### 1.4 Installation Phase

See Section 2.2 (`installPart` mutation spec) for the complete guard sequence.

Installation writes to:
- `parts` — location, currentAircraftId or currentEngineId, installedAt, hoursAtInstallation, installedByWorkOrderId
- `partInstallationHistory` — new append-only record
- `auditLog` — `part_installed` event

### 1.5 Removal Phase

See Section 2.3 (`removePart` mutation spec).

Removal writes to:
- `parts` — location transitions to `removed_pending_disposition`, removedAt, removedByWorkOrderId set, currentAircraftId and currentEngineId **both cleared**
- `partInstallationHistory` — existing open record updated with removedAt, removedByWorkOrderId, removedByTechnicianId, aircraftHoursAtRemoval
- `auditLog` — `part_removed` event

The life-accumulated-this-installation calculation happens here:
```
hours_this_installation = aircraftHoursAtRemoval - aircraftHoursAtInstall
new_total_accumulated   = (hoursAccumulatedBeforeInstall ?? 0) + hours_this_installation
```

This value is written back to `parts.hoursAccumulatedBeforeInstall` so that the running total is always current regardless of how many install/remove cycles the part has undergone.

### 1.6 Serviceable Tag and Unserviceable Tag

A **serviceable tag** (in practice, a green tag or a signed-off 8130-3 with "serviceable" determination) moves a part's `condition` field from `removed_pending_disposition` back to `serviceable` and `location` to `inventory`. This requires:
- A signed inspection by a certificated technician
- A reference to the maintenance record documenting the inspection

An **unserviceable tag** (red tag) sets `condition: "unserviceable"`. Once tagged unserviceable, the part moves to `quarantine` or `scrapped`. It **may not** transition back to `installed` without a full overhaul cycle (which would produce a new 8130-3 and reset the history chain).

> **Nadia:** *The green tag / red tag language is what mechanics actually use. Our UI should use that vocabulary in the tag action labels, even if the underlying field is `condition: "serviceable"` or `condition: "unserviceable"`. Regulatory language and shop-floor language can coexist — we just need to map them correctly in the UI layer.*

---

## 2. Convex Mutation Specifications

### 2.1 `receivePart`

**Purpose:** Creates a new `parts` record and optionally an `eightOneThirtyRecords` record when a part is received into inventory.

```typescript
// convex/parts/receivePart.ts
// Enforces: INV-07 preconditions, INV-11, INV-12, QA-003

mutation receivePart({
  args: {
    organizationId:       v.id("organizations"),
    workOrderId:          v.optional(v.id("workOrders")),   // receiving WO if applicable
    partNumber:           v.string(),
    partName:             v.string(),
    description:          v.optional(v.string()),
    serialNumber:         v.optional(v.string()),
    isSerialized:         v.boolean(),
    condition:            partCondition,                    // "new" | "serviceable" | "overhauled"
    isOwnerSupplied:      v.boolean(),
    supplier:             v.optional(v.string()),
    purchaseOrderNumber:  v.optional(v.string()),
    receivingDate:        v.number(),                       // Unix ms

    // Life tracking (required if isLifeLimited == true — INV-11)
    isLifeLimited:        v.boolean(),
    lifeLimitHours:       v.optional(v.number()),
    lifeLimitCycles:      v.optional(v.number()),

    // Prior accumulated life (from 8130-3 Block 12 or prior records)
    hoursAccumulatedBeforeInstall:  v.optional(v.number()),
    cyclesAccumulatedBeforeInstall: v.optional(v.number()),

    // Shelf life (required if hasShelfLifeLimit == true — INV-12)
    hasShelfLifeLimit:    v.boolean(),
    shelfLifeLimitDate:   v.optional(v.number()),

    // 8130-3 data (optional at receive — may be attached later)
    eightOneThirtyData:   v.optional(EightOneThirtyInput),  // see Section 3

    notes:                v.optional(v.string()),
  }
})

// GUARD SEQUENCE (must execute in order, abort on first failure):
//
// G1. Validate organizationId exists and is active.
// G2. If isLifeLimited == true: assert lifeLimitHours != null || lifeLimitCycles != null.
//     Throw: "Life-limited part requires lifeLimitHours or lifeLimitCycles."  [INV-11]
// G3. If hasShelfLifeLimit == true: assert shelfLifeLimitDate != null.
//     Throw: "Part with shelf life requires shelfLifeLimitDate."  [INV-12]
// G4. If hoursAccumulatedBeforeInstall is provided: assert >= 0.
// G5. If isLifeLimited && hoursAccumulatedBeforeInstall is provided:
//     assert hoursAccumulatedBeforeInstall < lifeLimitHours (if set).
//     A part arriving with hours already at or beyond its life limit must be
//     received into "quarantine", not "inventory". Throw if condition != "quarantine".
// G6. If isSerialized == true: assert serialNumber != null.
//     Throw: "Serialized part requires a serial number."
// G7. If isSerialized == true: check for existing part with same (partNumber, serialNumber)
//     within this organization. If found: throw duplicate error. Duplicate serial numbers
//     for the same P/N within one org indicate a receiving error or data entry error.
//
// WRITES (atomic):
//   1. ctx.db.insert("parts", { ...args, location: "inventory", createdAt, updatedAt })
//   2. If eightOneThirtyData provided:
//        a. ctx.db.insert("eightOneThirtyRecords", { ...eightOneThirtyData, partId, organizationId })
//        b. ctx.db.patch(partId, { eightOneThirtyId: newRecordId })
//   3. ctx.db.insert("auditLog", { eventType: "record_created", tableName: "parts", ... })
//
// RETURNS: { partId, eightOneThirtyId? }
```

### 2.2 `installPart`

**Purpose:** Transitions a part from `inventory` to `installed`, records the installation against a work order and aircraft (or engine), and creates a `partInstallationHistory` entry.

```typescript
// convex/parts/installPart.ts
// Enforces: INV-07 (OSP + 8130-3 chain), INV-11 (LL life check),
//           INV-12 (shelf life check), Cilla-3.5 (double-install guard)

mutation installPart({
  args: {
    partId:              v.id("parts"),
    workOrderId:         v.id("workOrders"),
    installedByTechId:   v.id("technicians"),
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // Exactly one of aircraftId or engineId must be provided (Cilla 3.5)
    aircraftId:          v.optional(v.id("aircraft")),
    engineId:            v.optional(v.id("engines")),
    installPosition:     v.optional(v.string()),          // e.g. "LH main gear", "cylinder 3"

    aircraftHoursAtInstall:  v.number(),                  // TT airframe at time of install
    aircraftCyclesAtInstall: v.optional(v.number()),
  }
})

// GUARD SEQUENCE:
//
// G1. Fetch part. Assert location == "inventory".
//     Throw: "Part is not in inventory. Current location: {location}."
//
// G2. Assert exactly one of (aircraftId, engineId) is provided.  [Cilla 3.5]
//     Throw: "installPart requires exactly one of aircraftId or engineId."
//
// G3. Assert part is not already installed on the target aircraft or engine.
//     Query partInstallationHistory by_aircraft where removedAt == null.
//     If any open history record exists for this partId on this aircraftId/engineId: throw.
//     (Belt-and-suspenders: location check in G1 should catch this, but defense in depth.)
//
// G4. Assert signatureAuthEvent is valid: consumed == false, expiresAt > now().
//     Atomically mark consumed = true, consumedAt = now(), consumedByTable = "parts".
//     [REG-005]
//
// G5. Verify work order is open/in_progress and belongs to organizationId.
//
// G6. SHELF LIFE CHECK: If part.hasShelfLifeLimit == true:
//     Assert shelfLifeLimitDate > now().
//     Throw: "Part shelf life expired on {date}. Quarantine required before any use."
//     (An expired shelf-life part must go to quarantine, not be installed.)
//
// G7. LIFE-LIMITED PART CHECK: If part.isLifeLimited == true:
//     Compute remaining_hours = lifeLimitHours - (hoursAccumulatedBeforeInstall ?? 0).
//     If lifeLimitHours is set and remaining_hours <= 0: throw.
//     Throw: "Life-limited part has zero remaining life. Scrap before closing work order."
//     NOTE: We do NOT block at > 0 — the mechanic may knowingly install a part with low
//     remaining life. We will surface a warning in the UI. But zero or negative is a hard block.
//
// G8. 8130-3 / AIRWORTHINESS DOCUMENTATION CHECK:  [INV-07 / REG-007]
//     If part.eightOneThirtyId == null:
//       - Check for a receiving inspection maintenanceRecord linked to this part
//         via workOrderId chain. If none found: THROW.
//         Throw: "No airworthiness documentation on file. Attach an 8130-3 or record
//                 a receiving inspection before installation."
//     Else:
//       - Fetch eightOneThirtyRecord. Assert isSuspect == false.
//         If isSuspect == true: throw.
//         Throw: "Part is linked to a suspect 8130-3 (status: {suspectStatus}). 
//                 Resolve suspect status before installation."
//     If part.isOwnerSupplied == true: the above check is NON-BYPASSABLE.
//     There is no override flag. OSP without documentation cannot be installed.  [REG-007]
//
// G9. Verify technician is active and holds a valid certificate for this work.
//
// WRITES (atomic):
//   1. ctx.db.patch(partId, {
//        location: "installed",
//        currentAircraftId: aircraftId ?? null,
//        currentEngineId: engineId ?? null,
//        installPosition,
//        installedAt: now(),
//        installedByWorkOrderId: workOrderId,
//        hoursAtInstallation: aircraftHoursAtInstall,
//        cyclesAtInstallation: aircraftCyclesAtInstall,
//        updatedAt: now()
//      })
//   2. ctx.db.insert("partInstallationHistory", {
//        partId, aircraftId, engineId, organizationId,
//        position: installPosition,
//        installedAt: now(),
//        installedByWorkOrderId: workOrderId,
//        installedByTechnicianId: installedByTechId,
//        aircraftHoursAtInstall, aircraftCyclesAtInstall,
//        createdAt: now()
//      })
//   3. ctx.db.insert("auditLog", { eventType: "part_installed", ... })
//
// RETURNS: { partInstallationHistoryId }
```

> **Nadia:** *G7's "warn but don't block at low remaining life" was a deliberate product decision. Beta shop feedback: mechanics sometimes knowingly install a part with two flight hours remaining because the replacement part is on order and the aircraft needs to make one ferry flight. That's a legal operation — the mechanic is aware and accepts responsibility. We block at zero, we warn below a threshold (TBD with Marcus — likely 10% of rated life), and we leave the decision to the certificated technician. Paternalistic hard blocks on non-zero remaining life will cause shops to work around us, which is worse.*

### 2.3 `removePart`

**Purpose:** Transitions a part from `installed` to `removed_pending_disposition`, records removal hours, and updates the life accumulation total.

```typescript
// convex/parts/removePart.ts

mutation removePart({
  args: {
    partId:                  v.id("parts"),
    workOrderId:             v.id("workOrders"),
    removedByTechId:         v.id("technicians"),
    signatureAuthEventId:    v.id("signatureAuthEvents"),

    aircraftHoursAtRemoval:  v.number(),
    aircraftCyclesAtRemoval: v.optional(v.number()),
    removalReason:           v.optional(v.string()),    // "scheduled replacement", "unserviceable", etc.
  }
})

// GUARD SEQUENCE:
//
// G1. Fetch part. Assert location == "installed".
// G2. Assert work order is open/in_progress.
// G3. Validate signatureAuthEvent (consumed, expiry). Atomically consume.
// G4. Assert aircraftHoursAtRemoval >= part.hoursAtInstallation.
//     A removal with fewer hours than installation is a data entry error.
//     Throw: "Aircraft hours at removal ({x}) cannot be less than hours at installation ({y})."
//
// LIFE ACCUMULATION COMPUTATION:
//   hours_this_install  = aircraftHoursAtRemoval - (part.hoursAtInstallation ?? 0)
//   new_total_hours     = (part.hoursAccumulatedBeforeInstall ?? 0) + hours_this_install
//   cycles_this_install = (aircraftCyclesAtRemoval ?? 0) - (part.cyclesAtInstallation ?? 0)
//   new_total_cycles    = (part.cyclesAccumulatedBeforeInstall ?? 0) + cycles_this_install
//
// WRITES (atomic):
//   1. ctx.db.patch(partId, {
//        location: "removed_pending_disposition",
//        currentAircraftId: null,          // MUST be cleared — Cilla 3.5
//        currentEngineId: null,            // MUST be cleared — Cilla 3.5
//        installPosition: null,
//        removedAt: now(),
//        removedByWorkOrderId: workOrderId,
//        hoursAccumulatedBeforeInstall: new_total_hours,
//        cyclesAccumulatedBeforeInstall: new_total_cycles,
//        updatedAt: now()
//      })
//   2. Find open partInstallationHistory record for this partId.
//      ctx.db.patch(historyId, {
//        removedAt: now(),
//        removedByWorkOrderId: workOrderId,
//        removedByTechnicianId: removedByTechId,
//        aircraftHoursAtRemoval,
//        aircraftCyclesAtRemoval,
//        removalReason
//      })
//   3. ctx.db.insert("auditLog", { eventType: "part_removed", ... })
//
// NOTE: We do NOT automatically set condition to "unserviceable" on removal.
//   A part removed for "scheduled replacement" (e.g., reaching 100hr interval) may
//   still be serviceable — it's just due for inspection before reinstallation.
//   Condition is only changed by explicit tagPartUnserviceable or a subsequent
//   inspection finding.
//
// RETURNS: { partInstallationHistoryId, totalAccumulatedHours: new_total_hours }
```

### 2.4 `tagPartUnserviceable`

**Purpose:** Sets a part's condition to `unserviceable` and transitions it to `quarantine`. This is the "red tag" operation. Once tagged unserviceable, the part cannot be installed without going through overhaul/repair and obtaining fresh documentation.

```typescript
// convex/parts/tagPartUnserviceable.ts

mutation tagPartUnserviceable({
  args: {
    partId:                  v.id("parts"),
    workOrderId:             v.optional(v.id("workOrders")),   // optional — may happen outside WO
    taggedByTechId:          v.id("technicians"),
    signatureAuthEventId:    v.id("signatureAuthEvents"),

    unserviceableReason:     v.string(),    // REQUIRED — free text + structured
    unserviceableCategory:   v.union(
      v.literal("damage"),
      v.literal("corrosion"),
      v.literal("life_expired"),
      v.literal("airworthiness_concern"),
      v.literal("missing_documentation"),
      v.literal("failed_inspection"),
      v.literal("other")
    ),
    maintenanceRecordId:     v.optional(v.id("maintenanceRecords")),  // record documenting the finding

    // If this is an installed part being red-tagged in situ (emergency quarantine):
    // removePart should be called first. tagPartUnserviceable operates on inventory/removed parts.
    // If the part is currently "installed", the mutation will throw: remove it first.
  }
})

// GUARD SEQUENCE:
//
// G1. Fetch part. Assert location != "installed".
//     Throw: "Cannot tag an installed part as unserviceable directly. Call removePart first."
//     (This guard exists because an unserviceable part that is still "installed" in the
//     database creates a contradictory state. The removal records are required for the
//     traceability chain to remain intact.)
// G2. Assert unserviceableReason is non-empty.
// G3. Validate signatureAuthEvent. Consume.
//
// WRITES (atomic):
//   1. ctx.db.patch(partId, {
//        condition: "unserviceable",
//        location: "quarantine",
//        quarantineReason: unserviceableReason,
//        quarantineCreatedById: taggedByTechId,
//        quarantineCreatedAt: now(),
//        updatedAt: now()
//      })
//   2. ctx.db.insert("auditLog", {
//        eventType: "record_updated",
//        tableName: "parts",
//        fieldName: "condition",
//        oldValue: JSON.stringify(part.condition),
//        newValue: JSON.stringify("unserviceable"),
//        notes: unserviceableReason,
//        technicianId: taggedByTechId,
//        ...
//      })
//
// RETURNS: { partId, quarantinedAt: now() }
```

> **Nadia:** *The guard at G1 — requiring removePart before tagPartUnserviceable — is intentional product behavior, not just a technical convenience. A mechanic finding a cracked part mid-inspection should document the removal (which creates the hours-at-removal record and closes the installation history) and THEN tag it unserviceable. The two-step process ensures the traceability chain is never broken. We'll need clear UI affordances: a "Remove and Red Tag" combined action that calls both mutations in sequence, for the common case.*

---

## 3. 8130-3 Tag Data Model and Storage

### 3.1 Structural Design Rationale

The FAA Form 8130-3 is the primary airworthiness provenance document for any repaired, overhauled, or inspected part. Rosa's commentary in the regulatory requirements document is precise: storing it as a "PDF attachment and calling it done" is filing, not tracking. The `eightOneThirtyRecords` table in schema v2 models every block as a structured field.

The design has three tiers:

```
Tier 1: Structured Fields (queryable, searchable, enforceable)
  → Blocks 1–13, 16–17 — all stored as typed Convex fields
  → Enables: query by part number, query by approval number, life-remaining check

Tier 2: PDF Storage (audit artifact, printable)
  → pdfUrl field — reference to blob storage (Convex file storage or Vercel Blob)
  → PDF generated from structured fields OR uploaded as received document
  → Original received PDFs retained; generated PDFs cached

Tier 3: Receiving Verification (who checked this, when)
  → receivedByOrganizationId, receivedDate, verifiedByUserId, verificationNotes
  → This is the shop's attestation that they reviewed the tag on receipt
```

### 3.2 The 19 Blocks — Field Mapping

```typescript
// Field mapping: 8130-3 blocks → eightOneThirtyRecords fields
//
// Block 1  → approvingAuthority         (string: "FAA / USA" for domestic)
// Block 2  → applicantName + applicantAddress
// Block 3  → formTrackingNumber          UNIQUE per form — used as primary traceability ID
// Block 4  → organizationName           (repair station name, not our org)
// Block 5  → workOrderReference         (external WO from releasing entity)
// Block 6  → itemNumber                 (line item if multi-part form)
// Block 7  → partDescription
// Block 8  → partNumber                 (manufacturer's P/N)
// Block 9  → partEligibility            (aircraft make/model eligibility)
// Block 10 → quantity                   INVARIANT: >= 1
// Block 11 → serialBatchNumber          (serial for traceables, batch for expendables)
// Block 12 → isLifeLimited + lifeRemainingHours + lifeRemainingCycles
//             ↑ This is the critical field. See Section 6.
// Block 13 → statusWork                 (new | overhauled | repaired | inspected | modified)
// Block 14 → remarks
// Block 15 → certifyingStatement        (regulatory certification text)
// Block 16 → authorizedSignatoryName + signatureDate
// Block 17 → approvalNumber             (repair station cert number of releasing entity)
// Block 18 → (export — exportAuthorizationNumber)
// Block 19 → (export — same field group)
```

### 3.3 Traceability Link: `eightOneThirtyRecords` ↔ `parts`

```
eightOneThirtyRecords
  .partId  ─────────────────────────→  parts._id
  
parts
  .eightOneThirtyId  ───────────────→  eightOneThirtyRecords._id
```

Both directions exist and both must be maintained. The `eightOneThirtyId` on the `parts` record is the primary navigation direction (part → its tag). The `partId` on `eightOneThirtyRecords` is for reverse lookup (tag → what part it documents).

A single 8130-3 may cover multiple quantities of the same part (Block 10 > 1). In that case, multiple `parts` records point to the same `eightOneThirtyRecords` document. The system must validate that the sum of parts pointing to a given tag does not exceed the tag's `quantity`.

> **Nadia:** *The one-tag-to-many-parts case is common for consumables — fasteners, seals, O-rings. The shop buys a bag of 50 O-rings on a single 8130-3. They receive them as a single tag but will install them individually across multiple work orders. The system needs to model this without requiring a mechanic to create 50 individual part records at receiving. We'll implement a "bulk receive" mode that creates the linked records with a quantity counter. The tag's remaining quantity decrements on each installation.*

### 3.4 Suspect Part Workflow

If an 8130-3 is flagged as suspect (counterfeit indicator, mismatched data, torn or altered tag), the receiving workflow triggers:

```typescript
// Suspect flag sets:
eightOneThirtyRecord.isSuspect = true
eightOneThirtyRecord.suspectReason = "<description>"
eightOneThirtyRecord.suspectStatus = "under_investigation"   // v2 field — Cilla 7.3

// All linked parts must be moved to quarantine:
parts WHERE eightOneThirtyId == suspectRecordId:
  location → "quarantine"
  condition → "quarantine"
  quarantineReason → "Linked 8130-3 flagged suspect: " + suspectReason
```

Per FAA Order 8120.11, suspected unapproved parts must be reported to the FAA. The `suspectStatus` transitions:
- `under_investigation` → `reported_to_faa` (after SUP report submission)
- `under_investigation` → `cleared` (after investigation finds the tag genuine)
- `under_investigation` → `confirmed_unapproved` (part is confirmed fake — destroy)

The `confirmed_unapproved` state triggers a mandatory notification to the DOM (Director of Maintenance), logged as an `auditLog` entry.

---

## 4. Traceability Chain

### 4.1 The Full Chain: Installed Part → Origin Paperwork

Given any `parts._id` currently in `location: "installed"`, the complete traceability chain is:

```
parts._id
  ├─ parts.eightOneThirtyId
  │    └─ eightOneThirtyRecords
  │         ├─ .formTrackingNumber      (the 8130-3's unique ID)
  │         ├─ .approvingAuthority      (FAA/USA or foreign authority)
  │         ├─ .authorizedSignatoryName (who released the part)
  │         ├─ .approvalNumber          (releasing repair station's cert)
  │         ├─ .statusWork              (new/overhauled/repaired)
  │         └─ .signatureDate           (when the tag was signed)
  │
  ├─ parts.installedByWorkOrderId
  │    └─ workOrders
  │         ├─ .workOrderNumber
  │         ├─ .organizationId          (which shop installed it)
  │         └─ .aircraftTotalTimeAtOpen / Close
  │
  ├─ partInstallationHistory (by_part index)
  │    └─ most recent open record
  │         ├─ .installedByTechnicianId
  │         ├─ .installedAt
  │         ├─ .aircraftHoursAtInstall
  │         └─ .aircraftCyclesAtInstall
  │
  └─ maintenanceRecords (by_work_order index, filtered to partsReplaced containing this partId)
       ├─ .workPerformed
       ├─ .approvedDataReference
       ├─ .completionDate
       ├─ .technicianSignature[]
       │    ├─ .legalName
       │    ├─ .certificateNumber
       │    └─ .ratingsExercised
       └─ .signatureHash                (tamper evidence)
```

### 4.2 The `getPartTraceabilityChain` Query

```typescript
// convex/parts/getPartTraceabilityChain.ts
// Returns the complete regulatory traceability chain for any part.

query getPartTraceabilityChain({
  args: { partId: v.id("parts") }
}) -> PartTraceabilityChain

// Resolution sequence:
// 1. Fetch parts record.
// 2. Fetch eightOneThirtyRecords via parts.eightOneThirtyId (if set).
// 3. Fetch partInstallationHistory records (all) via by_part index — ordered by installedAt ASC.
//    This gives the full install/remove history for the part's life.
// 4. For the current installation (removedAt == null in history): fetch the linked workOrder.
// 5. Fetch maintenanceRecords via by_work_order where partsReplaced contains this part's P/N.
//    NOTE: partsReplaced is an embedded array. Since Convex cannot index into embedded arrays,
//    this requires either:
//      a. Fetching all maintenance records for the work order and filtering in-memory (acceptable
//         for work-order-scoped queries — typical WO has <50 maintenance records), OR
//      b. Adding a dedicated partMaintenanceLinks junction table (preferable for high-volume shops).
//    Phase 2 will use option (a). A junction table is flagged for Phase 3 if performance warrants.
// 6. Fetch the installedByTechnicianId technician and their certificate records.
// 7. Return the assembled chain.

type PartTraceabilityChain = {
  part:                PartRecord
  eightOneThirty:      EightOneThirtyRecord | null
  installationHistory: PartInstallationHistoryRecord[]
  currentInstallation: {
    workOrder:         WorkOrderRecord
    maintenanceRecord: MaintenanceRecord | null
    technician:        TechnicianRecord
    certificate:       CertificateRecord | null
  } | null
  lifeStatus:          PartLifeStatus   // see Section 6
  chainComplete:       boolean          // true if no gaps in documentation chain
  chainGaps:           string[]         // list of identified traceability gaps
}
```

### 4.3 Chain Completeness Validation

`chainComplete` is `true` only when:
1. `eightOneThirtyId` is set and the referenced record is not suspect
2. At least one `maintenanceRecord` links this part's installation to a work order
3. That maintenance record has a non-null `signatureHash`
4. The installing technician has an active certificate valid on the installation date

If any of these conditions fail, `chainGaps` is populated with specific gap descriptions for display to the user and for FAA audit export.

> **Nadia:** *The `chainComplete` flag and `chainGaps` array are what powers the "traceability health" indicator we want on the parts detail page. Green = complete chain. Yellow = gap in documentation. Red = suspect documentation. Mechanics should see this immediately when pulling up a part — not only when trying to install or export. Early visibility of gaps means they get fixed before they become a discrepancy in an FAA audit.*

---

## 5. FAA Audit Trail Requirements for Parts Records

### 5.1 What an FAA Inspector Requires for Parts

From `regulatory-requirements.md` Section 9 and 145.221, a parts audit must produce:

| Required Evidence | Source in Athelon | Retention |
|---|---|---|
| Part identity (P/N, S/N) | `parts` record | Life of aircraft |
| 8130-3 or equivalent | `eightOneThirtyRecords` + PDF | Life of installation |
| Installing technician identity | `partInstallationHistory.installedByTechnicianId` | 2 years (WO-level) / life of aircraft for major |
| Technician certificate at time of installation | `maintenanceRecords.technicianSignature[].certificateNumber` | Same |
| Maintenance record referencing the installation | `maintenanceRecords.partsReplaced[]` | Same |
| Removal records | `partInstallationHistory.removedAt` etc. | Same |
| Life accumulation history | `parts.hoursAccumulatedBeforeInstall` + install history | Life of part |
| Audit log of all changes | `auditLog` | 2 years minimum |

### 5.2 Events That Must Be Logged to `auditLog`

Every mutation in this module must write to `auditLog`. Required events:

```typescript
// Receiving
{ eventType: "record_created", tableName: "parts", recordId: partId,
  notes: "Part received: {partNumber} {serialNumber ?? 'non-serialized'}" }

// 8130-3 attachment
{ eventType: "record_created", tableName: "eightOneThirtyRecords", recordId: tagId,
  notes: "8130-3 attached: tracking #{formTrackingNumber}" }

// Installation
{ eventType: "part_installed", tableName: "parts", recordId: partId,
  notes: "Installed on aircraft {aircraftId} at {aircraftHoursAtInstall} TT",
  technicianId: installedByTechId }

// Removal
{ eventType: "part_removed", tableName: "parts", recordId: partId,
  notes: "Removed from aircraft {aircraftId} at {aircraftHoursAtRemoval} TT. Reason: {removalReason}",
  technicianId: removedByTechId }

// Unserviceable tag
{ eventType: "record_updated", tableName: "parts", recordId: partId,
  fieldName: "condition", oldValue: prev_condition, newValue: "unserviceable",
  notes: "Tagged unserviceable: {unserviceableCategory} — {unserviceableReason}",
  technicianId: taggedByTechId }

// Suspect 8130-3 flag
{ eventType: "record_updated", tableName: "eightOneThirtyRecords", recordId: tagId,
  fieldName: "isSuspect", oldValue: "false", newValue: "true",
  notes: "Flagged suspect: {suspectReason}" }
```

### 5.3 Immutability Enforcement for Parts Records

Part records themselves ARE mutable (location, condition, installed/removed status change over time). The immutability requirement is on **maintenance records** and **installation history**. `partInstallationHistory` is append-only: new records are inserted on install, and the removal fields are patched on the *same record* (not a new record). The history record is never deleted.

The `removedAt` patch on `partInstallationHistory` is the only permitted mutation on an existing history record. Any other field change on a closed history record (where `removedAt != null`) is blocked:

```typescript
// INVARIANT [partInstallationHistory.update]:
//   Once a history record has removedAt set, no further patches are permitted
//   EXCEPT by an admin correction mutation (createCorrectionRecord equivalent).
//   This is enforced by checking removedAt != null in the update path and throwing.
```

### 5.4 FAA Audit Export

The `exportPartsAudit` query (Phase 3 scope, specified here for completeness) must produce a document that includes:
- All parts installed on a given aircraft within a date range
- For each part: complete traceability chain (Section 4)
- For each part: all audit log events
- Hash verification: for each maintenance record in the chain, verify `signatureHash` matches current field values

The export must be signed with the organization's audit-export key and timestamped. A hash of the export document itself is stored in `auditLog` under a `record_exported` event so the FAA can verify they received the original output.

---

## 6. Shelf-Life and Life-Limited Part Tracking Logic

### 6.1 Definitions

**Shelf-Life Part:** A part whose airworthiness degrades over calendar time regardless of use. Examples: rubber seals, O-rings, hydraulic hoses, certain composite components, pyrotechnic devices (ELTs, seat belt inflators). The limit is a fixed calendar date from manufacture or the last certification.

**Life-Limited Part (LLP):** A part with a mandatory replacement interval defined in flight hours, flight cycles, or calendar time — established by the manufacturer's Type Certificate data or an AD. Examples: turbine engine disks, landing gear cylinders, propeller hubs, certain structural fasteners. Life-limited parts must be scrapped at expiry; they may NOT be returned to service after reaching their limit, regardless of apparent condition.

### 6.2 Shelf-Life Tracking

```typescript
// Shelf-life fields on parts:
{
  hasShelfLifeLimit:  boolean,
  shelfLifeLimitDate: number | null,  // Unix ms of expiry date
}

// Shelf-life alerts are computed as:
function getShelfLifeStatus(part: Part): ShelfLifeStatus {
  if (!part.hasShelfLifeLimit) return { status: "not_applicable" }
  const now = Date.now()
  const expiry = part.shelfLifeLimitDate!
  const daysRemaining = Math.floor((expiry - now) / MS_PER_DAY)

  if (daysRemaining < 0)  return { status: "expired",  daysRemaining }
  if (daysRemaining < 30) return { status: "critical",  daysRemaining }
  if (daysRemaining < 90) return { status: "warning",   daysRemaining }
  return                         { status: "ok",        daysRemaining }
}

// installPart blocks on status: "expired"
// installPart shows a confirmation warning on status: "critical" (not a hard block — pilot
//   override with reason allowed for non-safety-critical shelf-life items, per shop SOP)
// No block on status: "warning" — informational only
```

**Shelf-life expiry for currently installed parts** is surfaced on the aircraft's parts list as a warning. A part installed before its shelf-life date may remain installed past that date in some categories (this is a regulatory determination the shop makes, not a system block). The system records and warns; it does not auto-remove installed parts.

### 6.3 Life-Limited Part Tracking

The schema stores life accumulation across the part's entire history, not just the current installation. This is the key design requirement from Rosa's regulatory review.

```typescript
// Life-limited tracking fields on parts:
{
  isLifeLimited:                 boolean,
  lifeLimitHours:                number | null,    // total life limit in flight hours
  lifeLimitCycles:               number | null,    // total life limit in cycles
  hoursAccumulatedBeforeInstall: number | null,    // total hours at last removal
  cyclesAccumulatedBeforeInstall: number | null,   // total cycles at last removal
  hoursAtInstallation:           number | null,    // aircraft TT at current install
  cyclesAtInstallation:          number | null,    // aircraft cycles at current install
}

// Remaining life computation (for an installed part):
function computeRemainingLife(part: Part, aircraft: Aircraft): PartLifeStatus {
  // Hours remaining
  let hoursRemaining: number | null = null
  if (part.isLifeLimited && part.lifeLimitHours != null) {
    const accruedThisInstall = (aircraft.totalTimeAirframeHours) - (part.hoursAtInstallation ?? 0)
    const totalAccrued       = (part.hoursAccumulatedBeforeInstall ?? 0) + accruedThisInstall
    hoursRemaining           = part.lifeLimitHours - totalAccrued
  }

  // Cycles remaining (if tracked)
  let cyclesRemaining: number | null = null
  if (part.isLifeLimited && part.lifeLimitCycles != null && part.cyclesAtInstallation != null) {
    // Aircraft cycles requires a cycles counter on the aircraft record (Phase 3 addition)
    // For Phase 2: cycles tracking is stored but not computed without aircraft cycle counter.
    // Flag this as a data gap in lifeStatus if lifeLimitCycles is set but no cycle counter exists.
    cyclesRemaining = null  // placeholder until aircraft cycle tracking is implemented
  }

  const percentRemaining = hoursRemaining != null && part.lifeLimitHours
    ? (hoursRemaining / part.lifeLimitHours) * 100
    : null

  return {
    isLifeLimited:    part.isLifeLimited,
    lifeLimitHours:   part.lifeLimitHours,
    lifeLimitCycles:  part.lifeLimitCycles,
    hoursRemaining,
    cyclesRemaining,
    percentRemaining,
    status: hoursRemaining == null  ? "unknown"
          : hoursRemaining <= 0     ? "expired"
          : percentRemaining! <= 5  ? "critical"
          : percentRemaining! <= 20 ? "warning"
          : "ok"
  }
}
```

### 6.4 8130-3 Block 12 → Part Life Synchronization

When an 8130-3 is attached to a part record, Block 12 (`lifeRemainingHours`, `lifeRemainingCycles`) must be synchronized with the part's accumulation fields:

```typescript
// On receivePart with eightOneThirtyData.isLifeLimited == true:
//
// The 8130-3 states life REMAINING at time of tag signing.
// The part's hoursAccumulatedBeforeInstall is:
//   lifeLimitHours - lifeRemainingHours (from tag)
//
// Example: tag shows lifeLimitHours = 1000, lifeRemainingHours = 350.
// Part has already consumed 650 hours.
// hoursAccumulatedBeforeInstall = 650

const hoursAlreadyConsumed = (eightOneThirtyData.lifeRemainingHours != null && part.lifeLimitHours)
  ? part.lifeLimitHours - eightOneThirtyData.lifeRemainingHours
  : args.hoursAccumulatedBeforeInstall ?? 0

// This value is written as part.hoursAccumulatedBeforeInstall at creation.
```

> **Nadia:** *The sync logic between the 8130-3 Block 12 and the parts record is where most competitors fail, as Rosa called out. A shop that installs a landing gear component with 350 hours remaining out of a 1000-hour life needs the system to track from 650 consumed — not from zero. Getting this wrong doesn't just create bad data; it potentially allows a life-expired part to stay in service because the system thinks it's new. That is a safety issue, not a UX issue. This logic must be in the test matrix with specific scenarios validated against real 8130-3 examples from Marcus.*

### 6.5 Life-Expired Part Enforcement

Once `hoursRemaining <= 0` (or `cyclesRemaining <= 0` when tracked):
- `installPart` hard-blocks the part with a clear error message
- The part is flagged in the organization's dashboard as requiring scrapping
- An `auditLog` entry records the expiry detection event
- The DOM is notified (async notification via Convex scheduled function)

```typescript
// Scheduled function: checkLifeLimitedParts
// Runs nightly. Queries:
//   ctx.db.query("parts")
//     .withIndex("by_location", q => q.eq("organizationId", orgId).eq("location", "installed"))
//     .collect()
//   For each isLifeLimited part: recompute remaining life against current aircraft hours.
//   If newly expired (was ok/warning yesterday, expired today):
//     - auditLog entry
//     - Notification to DOM
//     - Note: Does NOT auto-remove. Human decision required.
```

### 6.6 Life Tracking for Non-Installed Parts

Parts in `inventory` or `removed_pending_disposition` do not accrue flight hours. Their `hoursAccumulatedBeforeInstall` is frozen at the value written during `removePart`. The life computation for non-installed parts is simply:

```
remaining = lifeLimitHours - hoursAccumulatedBeforeInstall
```

Shelf-life, however, continues to accrue for non-installed parts. A part sitting on a shelf for 3 years can expire its shelf life without ever being installed. The `shelfLifeLimitDate` check applies to all parts regardless of location.

---

## 7. Open Questions for Marcus Webb Review

The following items require regulatory input before implementation begins:

**Q1 — Shelf-life override for installed parts:**  
14 CFR does not uniformly require removal of an installed part that has passed its shelf-life date mid-service. The requirement varies by part category and manufacturer service documentation. Does Marcus want the system to block all shelf-life-expired parts uniformly (safest, possibly too conservative) or implement category-specific rules?

**Q2 — Cycle counter requirement timing:**  
Life-limited parts with cycle limits require an aircraft cycle counter. When should we require cycle counter data entry — at aircraft creation, at first life-limited part installation, or as a soft prompt? Phase 2 has a data gap for cycle-limited parts without this.

**Q3 — Multi-tag parts (8130-3 quantity > 1):**  
The "bulk receive" model (one tag, many parts records, decrement counter) needs a maximum quantity validation rule. Should the system warn or hard-block when parts linked to a tag exceed the tag's `quantity` field?

**Q4 — Owner-supplied parts without ANY documentation:**  
INV-07 blocks installation of OSP parts without an 8130-3. But what is the correct receiving inspection pathway when an owner brings a part with a manufacturer's CoC but no 8130-3? The current receiving inspection path (create a maintenance record) may not be sufficient documentation for all part types. Marcus to clarify acceptable alternatives to the 8130-3 for OSP parts per 145.201(c).

---

## Implementation Priority

| Item | Priority | Owner | Blocking? |
|---|---|---|---|
| `receivePart` mutation | P0 | Devraj | Yes — nothing works without it |
| `eightOneThirtyRecords` structured create | P0 | Devraj | Yes |
| `installPart` mutation with all guards | P0 | Devraj | Yes — INV-07 is a REG blocker |
| `removePart` mutation + life accumulation | P0 | Devraj | Yes |
| `tagPartUnserviceable` mutation | P1 | Devraj | No, but needed for quarantine workflow |
| `getPartTraceabilityChain` query | P1 | Devraj | Needed for audit export |
| Shelf-life status computation | P1 | Devraj | Needed for dashboard |
| Life-remaining computation (hours) | P1 | Devraj | Safety-critical |
| Nightly LLP expiry check (scheduled fn) | P2 | Devraj | Operational need, not launch blocker |
| Cycle tracking (cycle-based LLPs) | P3 | Devraj | After aircraft cycle counter is added |
| `exportPartsAudit` full document | P3 | Devraj | Phase 3 scope |

---

*Parts Traceability Module — Devraj Anand (Backend) + Nadia Solis (PM)*  
*2026-02-22*  
*Pending Marcus Webb regulatory review and Cilla Oduya QA sign-off.*
