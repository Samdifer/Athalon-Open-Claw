# Athelon Alpha MVP — Definitive Scope Document
**Date:** 2026-02-22  
**Status:** APPROVED — Engineering team builds from this document  
**Baseline:** Phase 4 Gate Review (GO WITH CONDITIONS), Phase 5 Interview Synthesis

---

## What the Athelon Alpha MVP Is

Athelon alpha is a web application that allows a single Part 145 GA repair station to open a work order for a real aircraft, assign task cards with step-level sign-off, document discrepancies with MEL deferral support, record parts installation with 8130-3 traceability, create signed maintenance records, and authorize return to service — all with cryptographic signature binding, immutable audit trails, and hard-block regulatory enforcement — producing records that survive FAA surveillance inspection without caveat.

---

## Exact Feature List for Alpha

### 1. Work Order Lifecycle
**Acceptance criteria:** A work order can be created (draft → open), progressed through in_progress / on_hold / pending_inspection / pending_signoff states, and closed via the close readiness wizard. Voiding requires documented reason. All state transitions are audit-logged.

### 2. Task Card Execution with Step-Level Sign-Off
**Acceptance criteria:** Task cards are created against a work order with numbered steps. Each step is signed individually via the three-phase SignOffFlow (summary → PIN → submit). The signing consumes a signatureAuthEvent atomically. IA-required steps enforce IA currency at signing time. Step status is visible in real-time to all connected users. N/A steps require reason and authorization.

### 3. Discrepancy Management
**Acceptance criteria:** Discrepancies are opened against a work order with sequential numbering. Each can be dispositioned as corrected (with linked maintenance record), deferred to MEL (with auto-computed expiry per category), or no-fault-found. MEL expiry dates are computed automatically from deferral date + category interval. Owner notification is documentable with structured fields. All open discrepancies must be dispositioned before WO close.

### 4. Maintenance Record Creation and Signing
**Acceptance criteria:** A mechanic can create a 14 CFR 43.9 maintenance record against a work order. The record captures: work performed (minimum content enforced — non-empty, minimum 50 characters), approved data reference, parts replaced (embedded array), aircraft total time, and signing technician identity. The record is signed via SignOffFlow with cryptographic hash (SHA-256). After signing, the record is immutable. Corrections create a new linked record with recordType "correction" per INV-01. The record is viewable by any authorized user immediately after creation.

### 5. Return-to-Service Authorization
**Acceptance criteria:** `authorizeReturnToService` enforces all 9 preconditions: (1) all task cards complete, (2) all discrepancies dispositioned, (3) maintenance records exist and are signed, (4) aircraft TT at close ≥ TT at open, (5) IA certificate is current, (6) no overdue AD compliance items, (7) signatureAuthEvent consumed atomically, (8) MEL expirations validated, (9) Part 135/121 owner notifications documented if applicable. Failed attempts are audit-logged with specific failure reasons. Successful RTS creates an immutable returnToService record.

### 6. Close Readiness Report
**Acceptance criteria:** Single-screen dashboard showing green/red status for: task card completion, maintenance record signatures, AD compliance, discrepancy disposition, aircraft TT reconciliation. Each red item is clickable to navigate to the blocking record. WO close is hard-blocked until all items are green.

### 7. AD Compliance Tracking
**Acceptance criteria:** AD compliance records can be created against aircraft/engine/part. Applicability determination (applicable/not applicable) requires technician signature and date. Compliance history is append-only with monotonic date enforcement. Overdue recurring ADs surface in close readiness. Supersession is bidirectional.

### 8. Parts Receiving and Installation
**Acceptance criteria:** Parts are received into a `pending_inspection` state (not issuable). Receiving inspection moves part to `inventory` (issuable). Installation requires valid 8130-3 for OSP parts (INV-07). Life-limited parts block at zero remaining life (INV-11). Shelf-life parts block past expiry (INV-12). Quarantined parts are not issuable and do not appear in available inventory searches. Part installation/removal is recorded in partInstallationHistory.

### 9. Audit History UI
**Acceptance criteria:** Every record (work order, task card, maintenance record, discrepancy, RTS, AD compliance, part) has a viewable audit trail directly in the UI. The trail shows: creation event, every state change, every sign-off attempt (successful and failed), every amendment. An FAA inspector sitting next to the QCM can read the full history without export or explanation.

### 10. QCM Review Action
**Acceptance criteria:** After a work order is closed, the QCM can perform a formal "QCM Reviewed" action that records reviewer identity, timestamp, and optional findings notes. This creates an audit event. Work orders closed more than 48 hours without QCM review appear on the QCM dashboard with aging indicator.

### 11. N-Number Normalization
**Acceptance criteria:** Aircraft registration numbers are normalized at input to a canonical format (uppercase, "N" prefix, no hyphens, no spaces). Variant inputs are auto-normalized or rejected. All records for a given aircraft are retrievable by a single search regardless of how the N-number was originally entered.

### 12. Cryptographic Signature Hash (SHA-256)
**Acceptance criteria:** All signed records (maintenance records, RTS, inspection records, task card step sign-offs) produce a SHA-256 hash of the canonical record content at signing time. The hash is stored in the signatureHash field. Any post-signing alteration to the record would produce a different hash (detectable). The placeholder RTS-HASH-V0-* pattern is replaced entirely.

---

## Explicit Deferrals

| Feature | Why Deferred | Target Version |
|---------|-------------|----------------|
| **Offline mode** | Requires service worker, IndexedDB sync, conflict resolution — large engineering effort; alpha shop has WiFi | v1.1 |
| **Customer-facing portal** | High value but not regulatory; alpha is supervised internal use | v1.1 |
| **LLP dashboard per engine** | Schema foundations exist; dashboard and auto-accumulation logic need design | v1.1 |
| **Test equipment traceability** | Schema change to immutable maintenanceRecords; needs careful design | v1.1 |
| **Structural repair record type** | Significant schema addition; alpha scope is 100-hour and routine, not structural | v1.1 |
| **Photo attachments on records** | Requires file storage integration (S3/Convex file storage); not blocking for alpha | v1.1 |
| **IA expiry notifications** | Notification system not built; IA expiry block at signing is sufficient for alpha | v1.1 |
| **DOM personnel compliance dashboard** | Alpha has one shop with known personnel; dashboard is fleet-scale feature | v1.1 |
| **AOG cascade across queues** | AOG flag exists in schema; cascade behavior is UX, not regulatory | v1.1 |
| **PDF document generation** | Records exist in database; printable PDF is convenience, not compliance | v1.1 |
| **Discrepancy authorization workflow (email)** | Customer communication is manual in alpha; automated email is v1.1 | v1.1 |
| **Multi-aircraft Kanban board** | Avionics-specific UX; alpha is a general airframe shop | v1.1 |
| **8130-3 OCR** | ML/OCR integration; low priority relative to structured manual entry | v2.0 |
| **Multi-org / multi-shop** | Clerk org switching designed; not needed for single-shop alpha | v2.0 |
| **SRM structured reference fields** | Significant schema addition; free-text approvedDataReference sufficient for alpha | v1.1 |
| **Form 337 / DER record linkage** | Specialty workflow; alpha scope excludes major repairs | v2.0 |

---

## Schema Changes Required Before Alpha Build Starts

### 1. Add `"pending_inspection"` to parts.location enum
```typescript
location: v.union(
  v.literal("pending_inspection"),  // NEW — received but not inspectable
  v.literal("inventory"),
  v.literal("installed"),
  v.literal("removed_pending_disposition"),
  v.literal("quarantine"),
  v.literal("scrapped"),
  v.literal("returned_to_vendor"),
),
```
**Rationale:** Teresa Varga (Parts Manager) — parts must not be issuable before receiving inspection. Three interviewees independently confirmed this gap.

### 2. Add `"qcm_reviewed"` to auditLog.eventType enum
```typescript
v.literal("qcm_reviewed"),  // NEW — formal QCM review action
```
**Rationale:** Linda Paredes (QCM) — QCM review is a first-class compliance action, not a note in a spreadsheet.

### 3. Add `customerFacingStatus` to workOrders (optional, for v1.1 readiness)
```typescript
customerFacingStatus: v.optional(v.union(
  v.literal("awaiting_arrival"),
  v.literal("received_inspection_pending"),
  v.literal("inspection_in_progress"),
  v.literal("discrepancy_authorization_required"),
  v.literal("awaiting_parts"),
  v.literal("work_in_progress"),
  v.literal("final_inspection_pending"),
  v.literal("ready_for_pickup"),
)),
```
**Rationale:** Danny Osei (WO Coordinator). Optional field — can be added now without affecting alpha, ready for v1.1 customer portal.

### 4. Enforce minimum content on maintenanceRecords.workPerformed
Add mutation-level validation: `workPerformed.length >= 50` with error message citing AC 43-9C.

**Rationale:** Linda Paredes (QCM) — "If the software allows someone to create a legally insufficient maintenance record without friction, they will."

---

## Build Sequence

Starting from Phase 4 implementation artifacts:

| Order | Task | Owner | Depends On | Duration |
|-------|------|-------|------------|----------|
| 1 | Deploy Convex (dev + staging) | Jonas | Nothing | 1 day |
| 2 | Replace all `api` stubs with real Convex imports | Chloe | #1 | 2 hours |
| 3 | signatureAuthEvent creation endpoint live | Jonas | #1 | 1 day |
| 4 | SHA-256 signature hash (replace placeholder) | Devraj | #1 | 1 day |
| 5 | Schema changes: `pending_inspection`, `qcm_reviewed`, `customerFacingStatus` | Devraj | #1 | 2 hours |
| 6 | Maintenance record creation mutation + UI | Devraj + Chloe | #2, #3 | 2 days |
| 7 | Parts receiving flow with `pending_inspection` state | Devraj | #5 | 1 day |
| 8 | Quarantine enforcement: issuance block at mutation level + cascade from suspect 8130-3 | Devraj | #7 | 1 day |
| 9 | Audit history UI component (per-record trail viewer) | Chloe | #2 | 2 days |
| 10 | QCM review mutation + dashboard indicator | Devraj + Chloe | #5, #9 | 1 day |
| 11 | N-number normalization (mutation-level + migration) | Devraj | #1 | 4 hours |
| 12 | Smoke test execution (Cilla's 43 cases + new cases) | Cilla | #6, #7, #8 | 2 days |
| 13 | Marcus simulated inspection | Marcus | #12 | 1 day |
| 14 | Rosa field validation (6 scenarios) | Rosa | #13 | 1 day |

**Critical path:** 1 → 2 → 6 → 12 → 13 → 14 = **~9 working days**

---

## Definition of Done for Alpha

The following scenario must complete end-to-end on the deployed system with no manual database intervention:

### Scenario: 100-Hour Inspection — Cessna 172, N12345

**Cast:**
- **Troy** (A&P Mechanic) — performs the work, signs task card steps
- **Pat** (IA Holder) — inspects, signs inspection steps, authorizes RTS
- **Linda** (QCM) — reviews the closed work order
- **Gary** (DOM) — observes the close readiness report

**Sequence:**

1. **Gary** creates work order WO-2026-001 for N12345, type `100hr_inspection`, priority `routine`. System records aircraftTotalTimeAtOpen.

2. **Gary** creates three task cards: "Engine Compartment Inspection" (8 steps), "Landing Gear Inspection" (6 steps), "Propeller Inspection" (4 steps). Step 14 of "Landing Gear" requires IA sign-off.

3. **Troy** signs off steps 1-7 of "Engine Compartment" via SignOffFlow on a tablet. Each sign-off consumes a signatureAuthEvent. Confirmation is immediate and unambiguous. Gary sees progress update in real-time on his desktop.

4. **Troy** discovers a cracked exhaust gasket during step 8. He opens discrepancy DISC-1 against WO-2026-001. Discrepancy status: `open`.

5. **Troy** replaces the gasket. He creates a maintenance record documenting the work (≥50 characters, approved data reference, part replaced with P/N and S/N from 8130-3). He signs the record via SignOffFlow with SHA-256 hash. The record is immediately immutable.

6. **Troy** dispositions DISC-1 as `corrected`, linking the signed maintenance record. System verifies the linked record is signed and for the correct aircraft (INV-16).

7. **Troy** completes remaining task cards. **Pat** signs step 14 (IA-required). System verifies Pat's IA expiry date is in the future before allowing sign-off.

8. **Pat** opens the Close Readiness Report. All items green: task cards complete, discrepancies dispositioned, maintenance records signed, AD compliance current, aircraft TT reconciled.

9. **Pat** authorizes Return to Service via SignOffFlow. `authorizeReturnToService` enforces all 9 preconditions. RTS record is created with SHA-256 hash. Work order status → `closed`. Aircraft status → `airworthy`.

10. **Linda** opens WO-2026-001 post-close. She views the full audit trail directly in the UI: every step sign-off, the discrepancy lifecycle, the maintenance record, the RTS event. She performs the "QCM Reviewed" action. The review is timestamped and audit-logged.

11. **Gary** (playing the role of FAA inspector) asks: "Show me the maintenance record for the exhaust gasket replacement." Linda pulls it up. The record shows: work performed, approved data reference, part P/N and S/N, 8130-3 reference, signing technician cert number, SHA-256 hash, signature timestamp. The full audit history is visible without export. Gary asks: "Was this record altered after signing?" The system shows: no amendments, original creation event only, hash is consistent.

**Alpha ships when this scenario completes without failure, without workaround, and without anyone saying "we'll fix that later."**

---

*This document is the contract between product and engineering. Build exactly this. Ship exactly this. Everything else waits.*
