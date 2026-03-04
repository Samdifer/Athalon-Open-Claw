# Phase 1 Schema Blocker Resolution Log
**Document Type:** Resolution Record  
**Author:** Devraj Anand (Backend Engineer)  
**Date:** 2026-02-22  
**Sprint:** Phase 1 Gate — Blocker Sprint (label: athelon-blocker-sprint)  
**Schema Version Produced:** `convex-schema-v2.md`  
**Status:** COMPLETE — Pending final sign-off

---

## Context

Phase 1 gate review produced 16 schema blockers: 8 regulatory (REG-001 through REG-008, raised by Marcus Webb) and 8 QA (QA-001 through QA-008, raised by Cilla Oduya). The gate decision was GO WITH CONDITIONS — all 16 must be resolved before any mutation code is written or Phase 2 work begins.

This document records the resolution for each blocker: what was changed, what was not (and why), and who approved.

---

## Blocker Resolutions

---

### REG-001
**Original ID:** BLOCKER-REG-001  
**Gate Review Reference:** B-03 (Theme 1: Signing & Identity Integrity)  
**Description:** Correction records can be created without referencing what they correct. Fields `corrects`, `correctionFieldName`, `correctionOriginalValue`, `correctionCorrectedValue`, and `correctionReason` are all `v.optional()` even when `recordType == "correction"`. A correction record with any of these null is invalid under AC 43-9C.

**Resolution Applied:**  
Convex's type system does not support conditional required fields — this is a known platform limitation. Fields remain `v.optional()` in the schema. However, the schema now contains explicit INVARIANT documentation adjacent to all five correction fields, naming the `createCorrectionRecord` mutation as the enforcement point. The invariant is stated precisely: *"When `recordType == "correction"`, all five correction fields must be set. The mutation must throw if any are absent."* This invariant is entered into the invariant reference table (INV-01) and into Cilla's mutation spec test matrix.

Additionally, the `corrects` field type is `v.optional(v.id("maintenanceRecords"))` — the foreign key type itself provides referential integrity once the mutation enforces the field's presence.

**What is NOT changed:** The field types remain optional in the schema. The Convex type system cannot enforce conditional required fields. Full enforcement lives in the mutation layer and in the test suite.

**Approved by:** Marcus Webb ✓ (regulatory requirement met via documented invariant + mutation enforcement), Cilla Oduya ✓ (invariant is testable: createCorrectionRecord with null corrects → assert throws)  
**Status:** RESOLVED

---

### REG-002
**Original ID:** BLOCKER-REG-002  
**Gate Review Reference:** B-02 (Theme 1: Signing & Identity Integrity)  
**Description:** `technicianSignature` embedded type does not capture which rating (airframe, powerplant) the technician exercised when signing. Required per 14 CFR 65.85 and 65.87 when work involves a specific rating.

**Resolution Applied:**  
Added `ratingsExercised: ratingsExercised` to the `technicianSignature` embedded object. The `ratingsExercised` validator is defined as a constant at the top of the schema:

```typescript
const ratingsExercised = v.array(v.union(
  v.literal("airframe"),
  v.literal("powerplant"),
  v.literal("ia"),
  v.literal("none")
));
```

The field is **required** in `technicianSignature` (not optional). Every signing action must populate it. This field is also added as `signingTechnicianRatingsExercised` on the `maintenanceRecords` table for the primary signatory (to ensure the top-level signing fields are consistent with the embedded signature objects).

`signatureHash: v.string()` in `technicianSignature` was also changed from `v.optional(v.string())` to `v.string()` — every signature must include a hash. Making it optional was an oversight in v1.

**Approved by:** Marcus Webb ✓ (14 CFR 65.85/65.87 requirement satisfied), Cilla Oduya ✓ (field is now required, not optional — testable at schema level)  
**Status:** RESOLVED

---

### REG-003
**Original ID:** BLOCKER-REG-003  
**Gate Review Reference:** B-11 (Theme 3: Schema Structure)  
**Description:** `adCompliance` allows orphaned records with no aircraft, engine, or part linkage. All three target identifiers (`aircraftId`, `engineId`, `partId`) are optional, meaning a compliance record can exist linked to nothing.

**Resolution Applied:**  
Fields remain optional in the schema (Convex cannot enforce a three-way "at least one required" constraint at the type level). The schema now contains INVARIANT documentation on the `adCompliance` table:

*"At least one of `aircraftId`, `engineId`, or `partId` must be set. An adCompliance record with all three null is orphaned and will never appear in any compliance review. The `createAdCompliance` mutation must enforce at-least-one."*

This is INV-03 in the invariant reference table. The `createAdCompliance` mutation spec (Devraj's mutations spec document, due Day 6) will list this as a pre-condition check.

**Approved by:** Marcus Webb ✓, Cilla Oduya ✓ (test case: createAdCompliance with all three null → assert throws)  
**Status:** RESOLVED

---

### REG-004
**Original ID:** BLOCKER-REG-004  
**Gate Review Reference:** B-14 (Theme 4: Data Integrity)  
**Description:** `organizations.directorOfMaintenance` and `qualityControlManager` are free-text string fields. For Part 145 organizations, DOM and QCM are required accountable personnel with FAA certificates. Storing as strings makes certificate currency unverifiable.

**Resolution Applied:**  
Changed both fields from `v.optional(v.string())` to `v.optional(v.id("technicians"))`. The field names are updated to `directorOfMaintenanceId` and `qualityControlManagerId` to signal the semantic change.

Added denormalized display cache fields `directorOfMaintenanceName: v.optional(v.string())` and `qualityControlManagerName: v.optional(v.string())` to support fast rendering without requiring a join on every organization read.

Added INVARIANT: *"If `part145CertificateNumber` is set, both `directorOfMaintenanceId` and `qualityControlManagerId` must reference active technicians with appropriate certificates. The `setOrganizationLeadership` mutation must validate certificate currency for both roles on assignment."* (INV-04)

This enables the system to track DOM/QCM certificate expiry and surface alerts when an IA expires (March 31) and the DOM has not renewed — a regulatory finding waiting to happen.

**Approved by:** Marcus Webb ✓ (Part 145 accountable personnel requirement satisfied), Cilla Oduya ✓ (technician reference is testable; display name fields prevent regression where names disappear on technician rename)  
**Status:** RESOLVED

---

### REG-005
**Original ID:** BLOCKER-REG-005  
**Gate Review Reference:** B-01 (Theme 1: Signing & Identity Integrity — Highest Priority)  
**Description:** `signatureAuthEventId` exists on three tables (`maintenanceRecords`, `inspectionRecords`, `returnToService`) as `v.string()`. There is no specification of what this field contains, how it is generated, or how it can be queried to verify identity at a specific timestamp. Electronic signatures without this definition do not meet AC 43-9C authenticity standards.

**Resolution Applied:**  
This was the most significant structural addition in v2. A new first-class table `signatureAuthEvents` has been created with the following design:

- A `signatureAuthEvent` is generated by the pre-signing re-authentication flow (PIN, biometric, MFA)
- It carries a 5-minute TTL (`expiresAt` field)
- It is consumed exactly once (`consumed: boolean`, `consumedAt`, `consumedByTable`, `consumedByRecordId`)
- It captures: `clerkEventId`, `clerkSessionId`, `userId`, `technicianId`, `authenticatedLegalName`, `authenticatedCertNumber`, `authMethod`, `intendedTable`, `ipAddress`, `userAgent`
- It is permanently retained after consumption — never deleted

The `signatureAuthEventId` field on `maintenanceRecords`, `inspectionRecords`, `returnToService`, and `taskCardSteps` is now typed as `v.id("signatureAuthEvents")` — a proper foreign key, not a raw string. This change makes the signing chain:

1. **Auditable** — Inspector can retrieve the `signatureAuthEvent` by ID and see the exact authentication method, timestamp, IP address, and confirmed identity
2. **Non-reusable** — The `consumed` flag prevents a single auth event from being used to sign multiple records
3. **Time-bounded** — The `expiresAt` field means an auth event generated but not used within 5 minutes is invalid
4. **Independently verifiable** — The `clerkEventId` can be cross-referenced against Clerk's audit log

INV-05 documents that all signing mutations must atomically check `consumed == false` before writing a signed record, and set `consumed = true` as part of the same transaction.

Jonas Harker owns the Clerk webhook integration that creates `signatureAuthEvents`. This blocker is jointly resolved between Jonas (platform) and Devraj (schema).

**Approved by:** Marcus Webb ✓ (AC 43-9C authenticity requirement satisfied — signer identity is now independently verifiable), Cilla Oduya ✓ (the signing flow is now fully testable: auth event creation → signature → consumed flag asserted)  
**Status:** RESOLVED

---

### REG-006
**Original ID:** BLOCKER-REG-006  
**Gate Review Reference:** B-04 (Theme 2: State Transition Guards)  
**Description:** `aircraftTotalTimeAtClose` is optional on `workOrders`. A work order can close without recording aircraft total time at close, which is non-compliant with 14 CFR 43.11(a)(2). Additionally, there is no `closedByTechnicianId` field distinguishing the regulatory close from an administrative close.

**Resolution Applied:**  
`aircraftTotalTimeAtClose` remains `v.optional(v.number())` in the schema (it is legitimately null while the work order is open). INVARIANT INV-06 and INV-19 document enforcement:

- `closeWorkOrder` mutation must verify `aircraftTotalTimeAtClose` is set
- `aircraftTotalTimeAtClose` must be ≥ `aircraftTotalTimeAtOpen` — if less, the mutation MUST throw (not warn)
- `closedAt`, `closedByUserId`, and `closedByTechnicianId` must all be set at close time

`closedByTechnicianId: v.optional(v.id("technicians"))` has been added to `workOrders`. This field captures the certificated individual performing the regulatory close (RTS approval), distinct from `closedByUserId` (the system user who clicked close).

Additional void state fields added: `voidedByUserId`, `voidedAt`, `voidedReason` — populated when `status == "voided"`. INVARIANT documents that the void mutation must set all three.

**Approved by:** Marcus Webb ✓ (14 CFR 43.11(a)(2) compliance path documented; closedByTechnicianId distinguishes regulatory from administrative close), Cilla Oduya ✓ (closeWorkOrder without aircraftTotalTimeAtClose → assert throws is now testable)  
**Status:** RESOLVED

---

### REG-007
**Original ID:** BLOCKER-REG-007  
**Gate Review Reference:** B-05 (Theme 2: State Transition Guards)  
**Description:** The schema allows `isOwnerSupplied: true` + `eightOneThirtyId: null` + `location: "installed"`. This combination is a violation of 14 CFR 145.201 — a part installed without airworthiness documentation is illegal.

**Resolution Applied:**  
Schema fields remain as-is (three separate optional fields; Convex cannot enforce their relationship). INVARIANT INV-07 documents the enforcement point in the `installPart` mutation:

*"Before a part transitions to location == 'installed': (1) Either `eightOneThirtyId` must be set and the referenced record must have `isSuspect == false`, OR an explicit receiving inspection must be on record. (2) If `isOwnerSupplied == true`, the `eightOneThirtyId` requirement is mandatory — OSP parts cannot be installed without airworthiness documentation."*

Also documented: the three invalid state combinations that `installPart` must prevent:
- `location: "installed"` + `currentAircraftId: null` + `currentEngineId: null`
- `location: "inventory"` + `currentAircraftId: [id]`
- `currentAircraftId` and `currentEngineId` both set simultaneously

**Approved by:** Marcus Webb ✓ (14 CFR 145.201 enforcement path documented), Cilla Oduya ✓ (three separate installPart rejection tests now have documented invariants to test against)  
**Status:** RESOLVED

---

### REG-008
**Original ID:** BLOCKER-REG-008  
**Gate Review Reference:** B-06 (Theme 2: State Transition Guards)  
**Description:** An inspection record can certify `adComplianceReviewed: true` while referencing zero AD compliance records. An inspector will ask "what exactly did you review?" with no data to show.

**Resolution Applied:**  
Added `notes: v.optional(v.string())` to `inspectionRecords`. This field is used to document the reason for a zero-reference AD review (e.g., "no ADs found applicable to this type certificate as of inspection date — verified against FAA DRS on [date]").

INVARIANT INV-10 (in the schema, labelled for closeInspection): *"If `adComplianceReviewed == true` and `adComplianceReferenceIds` is empty, then `notes` must be non-empty and must document why no AD records are referenced. The close mutation enforces this."*

This satisfies Marcus's requirement that the scenario of "zero ADs applicable" is explicitly documented rather than silently accepted.

**Approved by:** Marcus Webb ✓ (the zero-AD case is now documentable, not a silent gap), Cilla Oduya ✓ (closeInspection with adComplianceReviewed=true + empty refs + no notes → assert throws; with notes → assert passes)  
**Status:** RESOLVED

---

### QA-001
**Original ID:** BLOCKER-QA-001  
**Gate Review Reference:** B-09 (Theme 3: Schema Structure)  
**Description:** `taskCards.status` enum disagrees with architecture document. Schema has `voided`; architecture document has `incomplete_na_steps`. Neither alone is correct. The discrepancy blocks task card workflow testing.

**Resolution Applied:**  
Both states are included in the v2 schema. The status enum for `taskCards` now has five values:

```typescript
v.literal("not_started"),
v.literal("in_progress"),
v.literal("incomplete_na_steps"),  // added from architecture doc
v.literal("complete"),
v.literal("voided")               // retained from v1 schema
```

These are not the same semantic concept:
- `incomplete_na_steps`: The card has been worked through, but one or more steps were marked N/A and require IA review before the card can be declared complete
- `voided`: The card was administratively cancelled (created in error or became inapplicable)

The schema comment documents both definitions explicitly so there is no future ambiguity. Rafael has been notified that the architecture document should be updated to include both states.

**Approved by:** Cilla Oduya ✓ (both states now testable; workflow tests can cover incomplete_na_steps → IA review → complete path and the voided path independently). Marcus Webb ✓ (no regulatory impact; both states are internally consistent)  
**Status:** RESOLVED

---

### QA-002
**Original ID:** BLOCKER-QA-002  
**Gate Review Reference:** B-08 (Theme 3: Schema Structure)  
**Description:** The embedded `steps` array in `taskCards` has inadequate audit granularity. The audit log records "taskCard updated" when a step is signed, not which step was signed, by whom, at what time. Additionally, concurrent step sign-offs produce write conflicts on the parent document.

**Resolution Applied:**  
`taskCardSteps` is now its own table. The embedded `steps` array has been removed from `taskCards` entirely.

The new `taskCardSteps` table:
- Contains one document per step
- Carries denormalized `taskCardId`, `workOrderId`, `aircraftId`, `organizationId` for direct queries
- Carries full signing fields: `signedByTechnicianId`, `signedAt`, `signedCertificateNumber`, `signedHasIaOnDate`, `signatureAuthEventId`
- Is indexed by `by_task_card`, `by_task_card_step` (ordered retrieval), `by_work_order`, `by_org_status`, `by_signed_technician`
- Has its own `createdAt` and `updatedAt` — each step is a first-class document with its own audit trail

The `taskCards` table retains denormalized summary counters (`stepCount`, `completedStepCount`, `naStepCount`) for efficient display without querying all steps.

Concurrency benefit: Multiple mechanics signing different steps simultaneously no longer conflict on the parent `taskCards` document. Each step write is an independent document write.

This is the largest structural change in v2. I flagged this issue in my own notes in v1 — the gate review confirmed it was the right call. Should have fixed it at the time.

**Approved by:** Cilla Oduya ✓ (individual step sign-off is now a testable, auditable, indexed event), Marcus Webb ✓ (per-step audit trail is now available for compliance-level traceability)  
**Status:** RESOLVED

---

### QA-003
**Original ID:** BLOCKER-QA-003  
**Gate Review Reference:** B-12 (Theme 4: Data Integrity)  
**Description:** Three boolean+conditional-required field pairs allow invalid null states: (1) `isLifeLimited: true` + both life limit fields null, (2) `hasShelfLifeLimit: true` + `shelfLifeLimitDate` null, (3) `hasIaAuthorization: true` + `iaExpiryDate` null. All three allow data states that cause silent failures in tracking logic.

**Resolution Applied:**  
All three field pairs remain as-is in the schema (Convex cannot enforce conditional required fields). Three new INVARIANTs are documented and entered in the invariant reference table:

- **INV-11**: `isLifeLimited: true` requires `lifeLimitHours` or `lifeLimitCycles` (at least one). Enforced in `createPart` and `updatePart`.
- **INV-12**: `hasShelfLifeLimit: true` requires `shelfLifeLimitDate`. Enforced in `createPart` and `updatePart`.
- **INV-13**: `hasIaAuthorization: true` requires `iaExpiryDate`. Enforced in `createCertificate`. All IAs expire on March 31 — a certificate without an expiry date is a data error.

All three generate corresponding test cases in Cilla's test matrix: create the document with the boolean `true` and the dependent field null — assert the mutation throws.

**Approved by:** Cilla Oduya ✓ (three failing test cases that were "known defects on day one" are now documented enforcement invariants), Marcus Webb ✓ (IA expiry date requirement is particularly important — an IA with no documented expiry is invisible to currency checking)  
**Status:** RESOLVED

---

### QA-004
**Original ID:** BLOCKER-QA-004  
**Gate Review Reference:** B-13 (Theme 4: Data Integrity)  
**Description:** No enforced uniqueness on `workOrders.workOrderNumber` within an organization. The index exists to support uniqueness checking but the mutation enforcement does not. Duplicate work order numbers create chain-of-custody confusion in a regulated environment.

**Resolution Applied:**  
INVARIANT INV-14 is documented on the `workOrders` table:

*"`workOrderNumber` must be unique within `organizationId`. The `createWorkOrder` mutation must query the `by_number` index before inserting and throw if a record already exists with the same `organizationId` + `workOrderNumber` combination."*

The index `by_number: ["organizationId", "workOrderNumber"]` already exists and supports this check efficiently. No schema change required — the invariant documentation and mutation enforcement are sufficient.

Test case: Create two work orders in the same org with the same number → assert the second throws.

**Approved by:** Cilla Oduya ✓ (test case is precisely defined and testable), Marcus Webb ✓ (chain-of-custody integrity maintained)  
**Status:** RESOLVED

---

### QA-005
**Original ID:** BLOCKER-QA-005  
**Gate Review Reference:** B-10 (Theme 3: Schema Structure)  
**Description:** `customers.aircraftIds` is an array on the customer document. Adding multiple aircraft simultaneously causes write conflicts on the customer document. Querying "which customer owns this aircraft?" requires scanning all customers for the aircraft ID — unindexed. This is a data model inversion.

**Resolution Applied:**  
The relationship is inverted:
- `aircraftIds: v.array(v.id("aircraft"))` **removed** from `customers`
- `customerId: v.optional(v.id("customers"))` **added** to `aircraft`
- `.index("by_customer", ["customerId"])` added to `aircraft`

To get all aircraft for a customer: `query aircraft.by_customer(customerId)` — O(log n), indexed, no scan.
To get the customer for an aircraft: `aircraft.customerId` — direct field read.
Adding a new aircraft to a customer: write to the `aircraft` document only, no customer document write, no conflict.

The `customers` table is now a clean entity with no embedded relationship arrays.

INV-15 documents that the `associateAircraftCustomer` mutation must write `customerId` to the `aircraft` document — not to the customer.

**Approved by:** Cilla Oduya ✓ (eliminates write-conflict test scenario; query "aircraft for customer X" is now indexed and testable), Marcus Webb: no objection  
**Status:** RESOLVED

---

### QA-006
**Original ID:** BLOCKER-QA-006  
**Gate Review Reference:** B-07 (Theme 2: State Transition Guards)  
**Description:** A discrepancy can be dispositioned as "corrected" with no corrective action description and no link to the maintenance record proving it was corrected. This is a phantom correction — it passes schema validation, appears compliant in the UI, and fails an FAA inspection when the inspector asks for supporting maintenance records.

**Resolution Applied:**  
Fields `correctiveAction` and `correctiveMaintenanceRecordId` remain `v.optional()` in the schema (they are legitimately null while disposition is pending). INVARIANT INV-16 is documented:

*"When `disposition == 'corrected'`: both `correctiveAction` and `correctiveMaintenanceRecordId` must be set. The `dispositionDiscrepancy` mutation must enforce both fields before closing any discrepancy as corrected."*

Also documented: when `disposition == 'deferred_mel'`, `melItemNumber`, `melCategory`, `melDeferralDate`, and `melExpiryDate` must all be set (INV-17 partially covers this; the full deferral invariant is stated in the `discrepancies` table comment).

Test case: Set `disposition: "corrected"` with null `correctiveMaintenanceRecordId` → assert throws.

**Approved by:** Cilla Oduya ✓ (phantom correction test case is now precisely defined), Marcus Webb ✓ (a corrected discrepancy without a maintenance record reference is not a corrected discrepancy)  
**Status:** RESOLVED

---

### QA-007
**Original ID:** BLOCKER-QA-007  
**Gate Review Reference:** B-01 (same as REG-005)  
**Description:** `signatureAuthEventId` has no defined specification — the field exists in three tables but what it contains is undefined in the schema and not specified in any technical requirement. No signing mutation can be validated for correctness without this definition.

**Resolution Applied:**  
Same resolution as REG-005. The new `signatureAuthEvents` table defines the complete spec for what `signatureAuthEventId` references. The field is now typed as `v.id("signatureAuthEvents")` on all signing tables, making it a proper foreign key with referential integrity.

This is a joint resolution (REG-005 + QA-007) — the two blockers described the same gap from different angles. One fix resolves both.

**Approved by:** Cilla Oduya ✓ (signing flow is now fully testable end-to-end), Marcus Webb ✓  
**Status:** RESOLVED

---

### QA-008
**Original ID:** BLOCKER-QA-008  
**Gate Review Reference:** B-15 (Theme 4: Data Integrity)  
**Description:** `melDeferralDate` is missing from `discrepancies`. `melExpiryDate` is stored as a computed value, but its source (the date the deferral formally started) is not stored. This makes MEL expiry computation untestable — there is no source truth to verify the computation against.

**Resolution Applied:**  
Added `melDeferralDate: v.optional(v.number())` to the `discrepancies` table. This is the date the MEL deferral was formally logged and the compliance clock started.

INVARIANT documented: *"When `disposition == 'deferred_mel'`: `melItemNumber`, `melCategory`, `melDeferralDate`, and `melExpiryDate` must all be set. `melExpiryDate` must equal `melDeferralDate + category_interval`. Enforced in the `dispositionDiscrepancy` mutation."*

This provides the testable assertion Cilla specified: `assert melExpiryDate == melDeferralDate + category_days_in_ms`.

Note: `melDeferralDate` may differ from `dispositionedAt` if there is administrative delay between the MEL determination and system entry. Both dates are now captured — `dispositionedAt` records when the discrepancy was formally dispositioned in the system; `melDeferralDate` records when the MEL clock started. These should typically be the same date, and the mutation should default `melDeferralDate` to `dispositionedAt` if not overridden.

**Approved by:** Cilla Oduya ✓ (MEL expiry computation is now testable), Marcus Webb ✓ (MEL deferral date is a regulatory record — the FAA's MEL interval runs from the date of the deferral decision, not necessarily the system entry date)  
**Status:** RESOLVED

---

## Non-Blocking Items Addressed in v2

The following NB items from the gate review were addressed in the v2 schema revision, ahead of their stated deadlines:

| NB-ID | Description | Status in v2 |
|---|---|---|
| NB-01 | Add 7 missing indexes | All 7 added ✓ |
| NB-02 | Add `iaCurrentOnInspectionDate`, `dispositionedCertificateNumber` | Both added ✓ |
| NB-03 | Add `suspectStatus` to `eightOneThirtyRecords` | Added ✓ |
| NB-04 | Add `operatingRegulation: "pending_determination"` | Added ✓ |
| NB-05 | Model squawks as separate table | DEFERRED — see note |

**NB-05 Deferral Note:** Squawks-as-table was scoped as a Rafael + Devraj decision requiring architecture alignment. The free-text `squawks` field is retained on `workOrders` for now. The squawk-to-discrepancy traceability gap is real (noted by both Marcus and Cilla) but is not on the critical path for Phase 2 mutation work. This is formally deferred to Phase 2 backlog with priority "before intake workflow feature."

---

## Summary

| Category | Total | Resolved | Deferred |
|---|---|---|---|
| REG (Marcus) | 8 | 8 | 0 |
| QA (Cilla) | 8 | 8 | 0 |
| **Total Blockers** | **16** | **16** | **0** |
| NB Items | 5 | 4 | 1 (NB-05) |

All 16 blockers are RESOLVED. Schema v2 is submitted for final sign-off.

---

## Final Sign-Off Statements

---

### Marcus Webb — Regulatory Sign-Off

I've reviewed the v2 schema against each of my eight blockers and against the non-blocking items that were in scope for this revision. Every blocker is addressed.

REG-005 (signatureAuthEventId) and REG-002 (ratingsExercised) were my highest-priority items. Both are fully resolved. The `signatureAuthEvents` table design is correct — the combination of TTL, single-consumption, and Clerk event cross-reference gives us an independently verifiable electronic signature trail that satisfies AC 43-9C. REG-002's addition of `ratingsExercised` to `technicianSignature` closes a gap I would not have expected a backend engineer to catch on their own — it's in the regulations, not in any schema guide.

REG-004 (DOM/QCM as technician IDs) is done correctly. The display cache fields are a sensible addition. REG-001 and REG-003 are acceptably resolved — Convex's type system limits what the schema can enforce, and the invariant documentation plus named mutation enforcement points are the appropriate pattern.

I have one standing note for the mutations spec: the `createCorrectionRecord` mutation must be reviewed by regulatory before any Phase 2 correction workflows are built. Not because the schema is wrong — it isn't — but because the signing requirements for correction records under AC 43-9C have subtleties (the correction itself must be signed, the signatureHash must cover the correction fields, and the corrector's certificate must be the same type as the original signatory's or higher). This goes in the mutations spec, not the schema.

**I sign off on schema v2. The 8 regulatory blockers are resolved. Phase 2 mutation work for signing, inspection, and maintenance record workflows may proceed.**

*— Marcus Webb, Regulatory & Compliance*  
*2026-02-22*

---

### Cilla Oduya — QA Sign-Off

I went through the v2 schema against all eight of my blockers and ran the invariant table against Cilla's test matrix draft. Here's my actual assessment:

**QA-002 (taskCardSteps extraction):** This is the most important fix in v2 and Devraj did it right. The denormalized counters on `taskCards` are a good call — I was going to ask for those. The new indexes on `taskCardSteps` cover every query pattern I need for test assertions. Per-step audit entries are now a real thing.

**QA-001 (status enum):** Including both `voided` and `incomplete_na_steps` is the correct answer. The original schema dropped one; the architecture doc dropped the other. The schema comment documenting what each state means will prevent future "which one do I use" ambiguity. 

**QA-005 (customers.aircraftIds inversion):** Done correctly. The `by_customer` index on `aircraft` is exactly what I need. Write-conflict scenario eliminated.

**QA-003 (boolean pairs):** Three invariants documented, three test cases now precisely specified. This is how I want all invariants documented — with the enforcing mutation named, not just "enforced somewhere."

**REG-005/QA-007 (signatureAuthEventId):** The `signatureAuthEvents` table is the right design. The `consumed` flag is important — I'll write a test that attempts to use the same auth event ID twice and asserts the second fails. The `expiresAt` index enables cleanup jobs, which is operationally necessary. Good work from both Devraj and Jonas.

**Things I want addressed before Phase 2 mutation review, not as blockers but as musts:**

1. The mutations spec (due Day 6) must list every invariant from the INV table and its test case ID. I want to see the two-column table: invariant → test ID. No invariant without a test.

2. `aircraft.totalTimeAirframeHours` monotonicity (INV-18) — I want a regression test that creates a work order, closes it with a *lower* total time than open, and asserts the throw. This is the falsification scenario. If that test doesn't exist in the test matrix, the invariant isn't covered.

3. The concurrentWorkOrder fields I recommended are present. I want explicit mutation enforcement, not optional fields that the mutation ignores.

None of these are blockers for the schema sign-off. They go in the mutations spec review.

**I sign off on schema v2. All 8 QA blockers are resolved. No QA objections to Phase 2 start.**

*— Cilla Oduya, QA Lead*  
*2026-02-22*

---

*Blocker resolution log prepared by Devraj Anand.*  
*This document, along with `convex-schema-v2.md` and `schema-freeze-notice.md`, constitutes the Phase 1 schema remediation package.*  
*Retained permanently as part of the Phase 1 gate record.*
