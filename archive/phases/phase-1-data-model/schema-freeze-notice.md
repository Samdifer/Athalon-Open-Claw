# Athelon Schema Freeze Notice
**Document Type:** Schema Governance — Freeze Declaration  
**Issued by:** Devraj Anand (Backend Engineer)  
**Effective Date:** 2026-02-22  
**Schema Version Frozen:** `convex-schema-v2.md`  
**Supersedes:** `convex-schema.md` (v1, DEPRECATED — do not implement against)

---

## Notice

The Athelon Convex schema is **frozen** as of 2026-02-22.

`convex-schema-v2.md` is the sole authoritative schema document. All mutation development, query development, and feature engineering in Phase 2 proceeds against this version and no other.

---

## What Changed from v1 to v2

The following changes were made to resolve 16 blockers identified in the Phase 1 gate review (8 regulatory, 8 QA). This is the complete change list — nothing was changed without a blocker citation.

### New Tables (2)

| Table | Purpose | Blocker |
|---|---|---|
| `signatureAuthEvents` | Defines what `signatureAuthEventId` references. Stores pre-signing re-authentication events. Short-lived, single-use, permanently retained. | REG-005 / QA-007 |
| `taskCardSteps` | Extracted from embedded `steps` array in `taskCards`. Each step is now a first-class document with its own audit trail and independent write path. | QA-002 |

### Changed Tables

| Table | Change | Blocker |
|---|---|---|
| `organizations` | `directorOfMaintenance` → `directorOfMaintenanceId: v.id("technicians")`. Same for `qualityControlManager`. Display name cache fields added. | REG-004 |
| `aircraft` | Added `customerId: v.id("customers")`. Added `operatingRegulation: "pending_determination"` enum value. Added `by_customer` index. | QA-005, NB-04 |
| `workOrders` | Added `on_hold` and `voided` to status enum. Added `closedByTechnicianId`. Added `voidedByUserId`, `voidedAt`, `voidedReason`. Added `onHoldReason`, `onHoldSince`. Added `concurrentWorkOrderOverrideAcknowledged`, `concurrentWorkOrderReason`. | REG-006, Cilla 5.1 |
| `discrepancies` | Added `dispositionedCertificateNumber`. Added `melDeferralDate`. Added `no_fault_found_could_not_reproduce` disposition value. Added `by_org_mel_expiry` index. | NB-02, QA-008, Cilla 5.4 |
| `taskCards` | Removed embedded `steps` array. Added `stepCount`, `completedStepCount`, `naStepCount` (denormalized counters). Added `incomplete_na_steps` to status enum (retained `voided`). Added `by_org_assigned` index. | QA-001, QA-002 |
| `maintenanceRecords` | `signatureAuthEventId` type changed from `v.string()` to `v.id("signatureAuthEvents")`. Added `signingTechnicianRatingsExercised`. `signatureHash` in `technicianSignature` made required (was optional). `ratingsExercised` added to `technicianSignature` embedded type. Added `by_org_completion_date` index. | REG-005, REG-002, NB-01 |
| `inspectionRecords` | `iaSignatureAuthEventId` type changed to `v.id("signatureAuthEvents")`. Added `iaCurrentOnInspectionDate: v.boolean()`. Added `notes: v.optional(v.string())`. Added `by_aircraft_date` index. | REG-005, NB-02, REG-008, NB-01 |
| `returnToService` | `signatureAuthEventId` type changed to `v.id("signatureAuthEvents")`. Added `iaCurrentOnRtsDate: v.boolean()`. `returnToServiceStatement` made `v.string()` (was optional). Added `iaAuthorizedWorkScope`. | REG-005, Marcus 5.2, Cilla 4.3 |
| `adCompliance` | Added `by_engine`, `by_part`, `by_org_next_due_date` indexes. Invariant documentation for orphan prevention and applicability determination. | REG-003, Marcus 2.1.2, Cilla 4.5, NB-01 |
| `customers` | Removed `aircraftIds: v.array(v.id("aircraft"))`. | QA-005 |
| `eightOneThirtyRecords` | Added `suspectStatus` enum field. | NB-03 |
| `auditLog` | Added `by_technician` index. Added `by_org_event_type` index. | Marcus 1.1.3, Cilla 6.3, NB-01 |
| `certificates` | Added `activityTypeDetail` to `iaRenewalActivities`. Invariant documentation for `hasIaAuthorization` + `iaExpiryDate` pair. | QA-003, Marcus 5.3 |
| `parts` | Invariant documentation for `isLifeLimited`, `hasShelfLifeLimit`, and install-state rules. No structural schema changes. | QA-003, REG-007 |

### Shared Validator Changes

| Validator | Change | Blocker |
|---|---|---|
| `technicianSignature` | Added `ratingsExercised` (required). Made `signatureHash` required. Changed `signatureAuthEventId` to `v.id("signatureAuthEvents")`. | REG-002, REG-005 |
| `workOrderStatus` | Added `on_hold`, `voided`. | Cilla 5.1 |
| `discrepancyDisposition` | Added `no_fault_found_could_not_reproduce`. | Cilla 5.4 |
| `ratingsExercised` | New validator constant. `v.array(v.union("airframe", "powerplant", "ia", "none"))`. | REG-002 |

### Invariants Added (20 total)

Twenty schema-enforced invariants are documented in v2. Each names the mutation responsible for enforcement and has a corresponding test case in Cilla's test matrix. See `blocker-resolution-log.md` for the full invariant table.

---

## What Did NOT Change

The following design decisions from v1 are unchanged and confirmed correct:

- Table separation between `maintenanceRecords` (43.9) and `inspectionRecords` (43.11)
- Immutability of `maintenanceRecords`, `inspectionRecords`, `returnToService`, and `auditLog`
- Append-only behavior of `adCompliance.complianceHistory`
- Aircraft-centricity: all maintenance records link to `aircraftId`
- Denormalization strategy for signing snapshots (legal name, cert number captured at signing time)
- The `adCompliance` structure including compliance history array and next-due caching
- All existing indexes that were present in v1 (none removed)
- The `sequenceNumber` aircraft-scoped logbook entry numbering

---

## Schema Freeze Policy

**Effective immediately, no changes to `convex-schema-v2.md` are permitted without a formal schema change request.**

### Change Request Process

Any proposed schema change — new field, modified type, new table, removed field, new index — must go through the following process before being merged:

1. **Author** drafts a written change request describing: what changes, why, which mutations are affected, and which invariants are affected or added.

2. **Marcus Webb (Regulatory)** reviews for compliance impact. Any change touching a signing table, a legal record table, or a compliance-tracking table requires Marcus's explicit written approval.

3. **Cilla Oduya (QA)** reviews for testability impact. Any change that adds, modifies, or removes an invariant requires a corresponding update to the test matrix. Cilla must confirm the test matrix is updated before the schema change is merged.

4. **Devraj Anand** implements the change and updates this freeze notice's change log.

5. A new version tag is applied to the schema document (`v2.1`, `v3`, etc.).

**No exceptions.** A schema change merged without this process voids the regulatory compliance guarantees of this document.

### Why This Matters

This schema stores aviation maintenance records. FAA regulation 14 CFR Part 43 and AC 43-9C require that maintenance records be accurate, complete, and defensible. A schema change that inadvertently makes a required field optional, removes an index that supports a compliance query, or breaks the signing chain is not a minor technical issue. It is a regulatory failure that may not be discovered until an FAA inspection — at which point the consequences fall on the certificate holders who signed the records, not on the engineering team.

The freeze policy exists to protect the technicians and IAs who will be signing records in this system.

---

## Signatures

**Devraj Anand** — Author, Backend Engineer  
I authored this schema and the v1→v2 revision. The schema is structurally sound. All 16 blockers are resolved. The invariant documentation is complete. I am confident this schema supports legally defensible aviation maintenance records when mutation-layer enforcement is implemented per the invariant table.

*Signed: Devraj Anand, 2026-02-22*

---

**Marcus Webb** — Regulatory Review  
v2 is signed off. The regulatory gaps in v1 are closed. The most critical items — signatureAuthEventId definition and ratingsExercised capture — are correctly implemented. Any future changes touching maintenanceRecords, inspectionRecords, returnToService, or signatureAuthEvents come to me first. That is not optional.

*Signed: Marcus Webb, Regulatory & Compliance, 2026-02-22*

---

**Cilla Oduya** — QA Review  
v2 is signed off. The 8 QA blockers are resolved. taskCardSteps extraction is done right. The invariant table is complete and testable. I'm holding to the rule I stated in my review: every invariant gets a test case in the test matrix before any mutation that relies on it is considered done. Devraj's mutations spec document is due Day 6. If it doesn't include the two-column invariant→test-case table, it comes back.

*Signed: Cilla Oduya, QA Lead, 2026-02-22*

---

*This document is effective immediately. `convex-schema.md` (v1) is deprecated and must not be referenced in any new implementation work.*
