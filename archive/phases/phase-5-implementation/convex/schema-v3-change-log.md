# Athelon Schema Change Log — v2 → v3
**Document Type:** Schema Governance — Change Log  
**Issued by:** Devraj Anand (Backend Engineer)  
**Date:** 2026-02-22  
**Schema Version:** 3  
**Supersedes:** `convex-schema-v2.md` (now superseded — v3 is the frozen schema)  
**Implementation file:** `phase-5-implementation/convex/schema-v3.ts`

---

## Overview

This change log documents four schema additions made to the Athelon Convex schema prior to the Phase 5 MVP build. These changes were identified during ten repair station interviews conducted as part of Phase 5 requirements gathering, synthesized in `phase-5-mvp/requirements-synthesis.md`, and ratified in `phase-5-mvp/mvp-scope.md`.

All four additions were reviewed by Marcus Webb (Regulatory) and Cilla Oduya (QA) before being incorporated. Marcus's regulatory sign-off notes and Cilla's test impact notes are included for each change below.

**No changes from v2 were reverted or weakened.** All 20 v2 invariants remain in force. All existing indexes are preserved. The additions are strictly additive.

---

## Summary Table

| # | Change | Type | Requirement Source | New Invariants |
|---|--------|------|-------------------|----------------|
| 1 | `testEquipment` table + `testEquipmentUsed` field on `maintenanceRecords` | New table + new optional field | Dale Purcell (Avionics), REQ-DP-01/DP-02 | INV-22 (cal expiry > cal date), INV-23 (snapshot consistency) |
| 2 | `"pending_inspection"` value added to `parts.location` enum | Enum addition | Teresa Varga (Parts Manager), REQ-TV-02 | INV-23 (not issuable) |
| 3 | `qcmReviews` table + `"qcm_reviewed"` added to `auditLog.eventType` | New table + enum addition | Linda Paredes (QCM), REQ-LP-05 | INV-24, INV-25, INV-26 |
| 4 | Cycle tracking fields + LLP review snapshot fields added to `engines` table; `by_organization` index added | Field additions + new index | Erik Holmberg (Powerplant), Rosario Tafoya (Powerplant), REQ-EH-01/RT-01/RT-02 | INV-21 (cycles monotonic) |
| 5 | `customerFacingStatus` optional field added to `workOrders` | New optional field | Danny Osei (WO Coordinator), REQ-DO-02 | None (v1.1 readiness only; no alpha enforcement) |

Change 5 (`customerFacingStatus`) is included per `mvp-scope.md` Schema Change #3. It is the only change in v3 with no alpha-scope enforcement — it is present solely to avoid a breaking schema change when the v1.1 customer portal is built.

---

## Change 1 — `testEquipment` Table and `maintenanceRecords.testEquipmentUsed`

### What Changed

**New table: `testEquipment`**

A standalone equipment library table tracking calibrated test equipment owned by or available to each organization. Fields:

- `organizationId` — owner organization
- `partNumber`, `serialNumber` — equipment identity (S/N required; no S/N = not admissible per INV)
- `equipmentName`, `manufacturer` — display identity
- `equipmentType` — 16-value enum covering avionics test gear, torque tools, inspection optics, etc.
- `calibrationCertNumber`, `calibrationDate`, `calibrationExpiryDate` — calibration traceability (REQ-DP-01)
- `calibrationPerformedBy` — lab name
- `calibrationCertDocumentUrl` — link to certificate PDF
- `status` — `current | expired | out_for_calibration | removed_from_service | quarantine`

New indexes: `by_organization`, `by_serial`, `by_cal_expiry`, `by_status`, `by_org_cal_expiry`.

**New shared validator: `embeddedTestEquipmentRef`**

Used as the element type of `maintenanceRecords.testEquipmentUsed`. Snapshots calibration state at signing time:

- `testEquipmentId` — optional FK to library (optional to support one-off external equipment)
- `partNumber`, `serialNumber`, `equipmentName` — snapshot at signing
- `calibrationCertNumber`, `calibrationExpiryDate` — snapshot at signing
- `calibrationCurrentAtUse: v.boolean()` — computed by mutation: `calibrationExpiryDate > signatureTimestamp`

**New optional field: `maintenanceRecords.testEquipmentUsed`**

`v.optional(v.array(embeddedTestEquipmentRef))`

Positioned after `partsReplaced` in the maintenance record structure. Optional in alpha; the field is present so that avionics facilities can populate it immediately and historical records are self-consistent (immutable records cannot have fields backfilled).

### Which Requirement It Serves

- **REQ-DP-01** (Dale Purcell, Avionics): Test equipment fields on maintenance records (P/N, S/N, cal cert#, cal expiry).
- **REQ-DP-02** (Dale Purcell, Avionics): Test equipment library / profiles (persistent per-equipment records).

**Context from synthesis:** This was the most-discussed unexpected gap in Phase 5 interviews. An FAA surveillance inspection focused on IFR return-to-service work will routinely ask: "What equipment was used? Was it in calibration?" Without structured fields, the answer requires a spreadsheet cross-reference — which is exactly the kind of undocumented process FAA targets during inspections. Every avionics-primary shop evaluating Athelon will ask this question. If we don't have it, they'll stay on EBIS 5. (See requirements-synthesis.md "The One Surprise" section.)

### New Invariants

**INV-22** (`testEquipment.create` / `testEquipment.updateCalibration`):  
`calibrationExpiryDate` must be strictly greater than `calibrationDate`. A calibration cert that expires before it was issued is a data entry error. Mutation throws with code `CAL_EXPIRY_BEFORE_CAL_DATE`.

**INV-23 (test equipment snapshot consistency)** (`maintenanceRecord.create`):  
For each entry in `testEquipmentUsed` where `testEquipmentId` is set: the snapshot fields (`partNumber`, `serialNumber`, `calibrationCertNumber`, `calibrationExpiryDate`) must match the referenced `testEquipment` record at the time of signing. `calibrationCurrentAtUse` must equal `calibrationExpiryDate > signatureTimestamp`. Mutation computes this; it is not user-settable. A warning (not a hard block) is generated when `calibrationCurrentAtUse == false` — expired calibration is documented, not prevented.

**Note on the warning-not-block decision:** Marcus reviewed this and confirmed: hard-blocking on expired calibration would prevent documentation of work that was already performed with expired equipment. The regulatory requirement is traceability, not prevention of use. The shop's quality system is responsible for preventing use; the software's responsibility is to make traceability possible and to surface the warning.

### Marcus's Regulatory Sign-Off Notes

> The `testEquipment` table is correct. Calibration traceability on maintenance records is a repair station requirement (see your RSM — every Part 145 RSM I've reviewed includes a calibration control section that requires traceability to individual records). The FAA does not mandate this in 14 CFR 43 text, but an inspector walking the floor will pull your calibration records as a matter of routine. If your software stores it as a text field, you can't prove currency. If it's structured, you can query it.
>
> I signed off on the warning-not-block design for expired calibration. Dale's point is correct — if a tech used an expired torque wrench, the right response is documentation and a finding, not a system refusal that prevents the tech from documenting the work at all. The finding should appear in the QCM review.
>
> One note for the mutation team: the `calibrationCurrentAtUse` field must be computed server-side, not client-side. Client clocks cannot be trusted for compliance determinations.
>
> — Marcus Webb, 2026-02-22

### Cilla's Test Impact Notes

**Existing tests to update:**

1. **`maintenanceRecord.create` test matrix** — All create scenarios need a new variant: `testEquipmentUsed` populated with (a) valid in-calibration equipment, (b) expired calibration (expect warning in response, not error), (c) testEquipmentId referencing a record where snapshot fields do not match (expect INV-23 violation throw), (d) testEquipmentId null / equipment entered manually (expect no library lookup).

2. **`testEquipment.create`** — New test cases: (a) `calibrationExpiryDate <= calibrationDate` → expect INV-22 throw; (b) serial number empty → expect throw; (c) all valid fields → expect success and correct `status = "current"`.

3. **`testEquipment.updateCalibration`** — New test cases: update with new cert details; verify status transitions between `current` and `expired` based on expiry date.

4. **Nightly expiry job** — New test: seed equipment with `calibrationExpiryDate` in the past, run job, verify status flips to `expired`.

5. **Audit log** — Verify `record_created` event emitted when testEquipment created; `record_updated` when calibration updated.

**No existing tests broken by this change.** The `testEquipmentUsed` field is optional and not referenced by any existing mutation paths.

---

## Change 2 — `"pending_inspection"` Location State for Parts

### What Changed

**`parts.location` enum** — `"pending_inspection"` added as the first value:

```typescript
location: v.union(
  v.literal("pending_inspection"), // v3 — received but not yet inspected
  v.literal("inventory"),
  v.literal("installed"),
  v.literal("removed_pending_disposition"),
  v.literal("quarantine"),
  v.literal("scrapped"),
  v.literal("returned_to_vendor"),
),
```

The `by_location` index (already present in v2) covers `pending_inspection` queries without schema-level index changes.

### Which Requirement It Serves

- **REQ-TV-02** (Teresa Varga, Parts Manager): "Received but not inspected" as a distinct non-issuable state.

**Context from synthesis:** Teresa, Erik Holmberg, and Rosario Tafoya independently converged on this gap. Parts received at the dock were immediately accessible as inventory items and could be issued to work orders before receiving inspection. 14 CFR 145.221 requires a repair station to have a receiving inspection process. The schema previously had no way to represent "received but not yet cleared by receiving inspection." The `pending_inspection` state closes this gap at the schema layer; INV-23 closes it at the mutation layer.

**State semantics (for mutation authors):**

| State | Meaning | Issuable? |
|-------|---------|-----------|
| `pending_inspection` | Received at dock; receiving inspection not yet performed | **NO** |
| `inventory` | Received, inspected, cleared — available for issuance | Yes |
| `installed` | Currently installed on aircraft/engine | N/A |
| `removed_pending_disposition` | Removed from aircraft; awaiting condition evaluation | No |
| `quarantine` | Suspect; locked from all use | No |
| `scrapped` | Destroyed or condemned | No |
| `returned_to_vendor` | Returned to supplier | No |

### New Invariants

**INV-23 (parts issuance — v3)** (`installPart`, `assignPartToTaskCard`):  
A part in `location == "pending_inspection"` must not be issuable. Any mutation that installs a part or assigns it to a task card must verify `location != "pending_inspection"` and throw with error code `PART_NOT_INSPECTED` if violated. Error message must name the part P/N and S/N explicitly so the coordinator can identify the part without navigating.

This invariant extends INV-07 (which blocks installation of untraced OSP parts). INV-07 and INV-23 are independent checks; both must pass before a part can be installed.

### Marcus's Regulatory Sign-Off Notes

> This is correct and overdue. 14 CFR 145.221 has required receiving inspection procedures since the Part 145 rewrite. Every RSM I've seen has a receiving procedure with inspection steps. The schema previously had no representation of "this part has not cleared receiving inspection" — that's a gap. The `pending_inspection` state and the INV-23 issuance block implement the system-level enforcement the RSM says you have.
>
> One important nuance for Devraj: the `receivePartToInventory` mutation (which transitions `pending_inspection` → `inventory`) should create a structured receiving inspection record or at minimum log a `record_created` audit event with the receiving technician's identity. An inspector will ask "who performed receiving inspection on this part?" If the answer is "it transitioned to inventory with no record of who inspected it," that's a finding.
>
> This is a mutation-layer concern, not a schema-layer one. The schema is correct as written. I'm flagging it for the mutation spec.
>
> — Marcus Webb, 2026-02-22

### Cilla's Test Impact Notes

**Existing tests to update:**

1. **`installPart` test matrix** — Add variant: part in `pending_inspection` → expect `PART_NOT_INSPECTED` error. Add variant: part transitions from `pending_inspection` to `inventory` via receiving inspection mutation, then installs successfully.

2. **Parts intake flow** — New test: part created with `location = "pending_inspection"`, verify it does not appear in available inventory search results.

3. **`part.by_location` index queries** — Verify `pending_inspection` parts appear in `by_location(organizationId, "pending_inspection")` and do NOT appear in `by_location(organizationId, "inventory")`.

4. **Close readiness report** — If any parts on the work order are in `pending_inspection`, they should surface as a warning (not a hard block, because the part may not yet be formally linked to the WO). Verify the readiness report handles this gracefully.

**No existing tests broken.** Enum additions are backward-compatible. Existing test data with `location = "inventory"` remains valid.

---

## Change 3 — `qcmReviews` Table and `auditLog.eventType` Addition

### What Changed

**New table: `qcmReviews`**

A signed, immutable record of a QCM's formal review of a closed work order. Fields:

- `workOrderId`, `organizationId` — review scope
- `reviewedByTechnicianId`, `reviewerLegalName`, `reviewerCertificateNumber`, `reviewerCertificateType` — QCM identity snapshot at review time
- `reviewTimestamp` — when the review was performed
- `outcome` — `accepted | findings_noted | requires_amendment`
- `findingsNotes` — optional (required when outcome has findings, per INV-26)
- `corrects` — optional FK to prior qcmReview (amendment chain)
- `signatureHash`, `signatureTimestamp`, `signatureAuthEventId` — cryptographic signature (same pattern as maintenanceRecords and returnToService)

Immutable — no `updatedAt`. Amendment via `corrects` field (same pattern as `maintenanceRecords.corrects`).

New indexes: `by_work_order`, `by_organization`, `by_org_timestamp`, `by_reviewer`, `by_outcome`.

**`auditLog.eventType` enum** — `"qcm_reviewed"` added.

Written alongside every `qcmReviews` record creation. The `qcmReviews` table is the authoritative signed record; the audit log entry is the audit trail that surfaces in the per-record history UI.

### Which Requirement It Serves

- **REQ-LP-05** (Linda Paredes, QCM): Formal QCM Review action on closed work orders.
- **mvp-scope.md Feature #10**: QCM Review Action.

**Context from synthesis:** Linda described the current state as "a line in a spreadsheet." In a Part 145 repair station, the QCM's post-close review is documented in the RSM as a required compliance action. Without a dedicated record type, the review is legally invisible. The MVP scope specifies: work orders closed more than 48 hours without QCM review must appear on the QCM dashboard with an aging indicator — this query (`workOrders` left-joined with `qcmReviews` by `workOrderId`) is the primary reason a dedicated table is preferred over an `auditLog` event type.

**Why a dedicated table, not just `auditLog.eventType`:**  
The requirements-synthesis.md schema gaps table suggested "add `qcm_reviewed` event type to auditLog." After review, a dedicated table is correct because: (1) QCM reviews are signed compliance actions requiring `signatureAuthEvents` consumption — auditLog entries are passive system events; (2) the structured outcome and findings fields don't fit cleanly into auditLog's `newValue` JSON; (3) the 48-hour aging dashboard query is a direct table scan on `qcmReviews` — doing this via auditLog would require event-type filtering plus timestamp math; (4) Marcus's sign-off (below) specifically requires QCM reviews to be independently auditable as signed documents.

Both are implemented: `qcmReviews` table for the authoritative record, `auditLog` `qcm_reviewed` event for the audit trail.

### New Invariants

**INV-24** (`qcmReview.create`):  
The referenced `workOrder` must be in `status == "closed"` before a QCM review can be created. The mutation must verify `workOrder.status == "closed"` and throw with code `WO_NOT_CLOSED` if not. A QCM cannot review an in-progress work order.

**INV-25** (`qcmReview.create`):  
`reviewedByTechnicianId` must match the organization's `qualityControlManagerId` (from `organizations.qualityControlManagerId`). The mutation fetches the organization record and compares. Throws with code `NOT_QCM` if the technician is not the current QCM. (Deputy QCM authorization is v1.1 scope. For alpha, strict QCM identity match is required.)

**INV-26** (`qcmReview.create`):  
If `outcome == "findings_noted"` or `outcome == "requires_amendment"`, `findingsNotes` must be non-empty (`findingsNotes.trim().length > 0`). A review with findings but no documented findings is legally insufficient. Throws with code `FINDINGS_REQUIRED`.

### Marcus's Regulatory Sign-Off Notes

> The dedicated `qcmReviews` table is the right call. I pushed back on the "just add it to auditLog" approach in my review — here's why. The RSM requires the QCM to review and document findings on each closed work order. That documentation is a record with legal standing — it identifies the QCM by name and certificate, timestamps the review, and captures the outcome. Co-mingling it with passive system events (record_viewed, status_changed, etc.) would make it difficult to produce in response to an FAA information request. A standalone table with a signed record per review is the defensible design.
>
> INV-25 (QCM identity match) is important for alpha but I agree it's too strict for v1.1. Large shops have deputy QCMs and acting QCMs. The mutation should log a warning when the reviewer is not the current QCM on record even if it doesn't block — but for alpha with a single known QCM, strict match is correct.
>
> The `outcome: "requires_amendment"` value handles a situation I've seen in every audit I've done: the QCM reviews a closed work order and finds a record that needs a correction entry (AC 43-9C amendment). The system should make that outcome first-class. The QCM marks the review with `requires_amendment`, documents which record needs correction in `findingsNotes`, and the mechanic creates a correction record. The QCM then creates a new review (via the `corrects` field) when the amendment is complete.
>
> — Marcus Webb, 2026-02-22

### Cilla's Test Impact Notes

**Existing tests to update:**

1. **Work order close flow** — After close, verify that the work order appears on the "pending QCM review" dashboard. Verify it does not appear after QCM review is created. This is a new end-to-end scenario that crosses two tables.

2. **`qcmReview.create` test matrix** (all new):
   - WO status not "closed" → expect `WO_NOT_CLOSED` (INV-24)
   - Reviewer not current QCM → expect `NOT_QCM` (INV-25)
   - `outcome == "findings_noted"` with empty `findingsNotes` → expect `FINDINGS_REQUIRED` (INV-26)
   - `outcome == "findings_noted"` with non-empty notes → expect success
   - `outcome == "accepted"` with no notes → expect success
   - `signatureAuthEvent` consumed atomically → verify INV-05 applies
   - Correction chain: create review with `corrects` set to prior review ID → expect success

3. **Audit log** — Verify `qcm_reviewed` event written alongside every `qcmReview` creation. Verify `organizationId` is populated on the audit event (regulated event type — see auditLog invariant).

4. **QCM dashboard query** — New test: seed work orders closed at varying timestamps; verify aging indicator correctly surfaces orders closed >48h without review.

5. **SignOffFlow integration** — `qcmReview.create` must consume a `signatureAuthEvent` atomically. Verify: (a) expired event → throw; (b) already consumed event → throw; (c) event for wrong technician → throw. Same test matrix as for `returnToService.create`.

**Existing tests affected:**

- **auditLog eventType exhaustiveness test** — if the test has an explicit enum assertion, `qcm_reviewed` must be added to the expected set.

---

## Change 4 — Engine Cycle Tracking and LLP Review Snapshot Fields

### What Changed

**Modified table: `engines`** — the following fields added:

*Cycle tracking (independent per engine S/N):*
- `totalCycles: v.optional(v.number())` — total cycles since new
- `totalCyclesAsOfDate: v.optional(v.number())` — Unix timestamp of last cycle update
- `cyclesSinceOverhaul: v.optional(v.number())` — cycles since last overhaul (cycles analog of `timeSinceOverhaulHours`)
- `cycleBetweenOverhaulLimit: v.optional(v.number())` — manufacturer cycles-based TBO (CBS limit; distinct from hour-based `timeBetweenOverhaulLimit`)

*LLP package review snapshot:*
- `llpPackageReviewDate: v.optional(v.number())` — date LLP package was last formally reviewed
- `llpPackageReviewedByTechnicianId: v.optional(v.id("technicians"))` — who reviewed
- `llpPackageReviewNotes: v.optional(v.string())` — findings or notes from review

*New index:*
- `.index("by_organization", ["organizationId"])` — supports fleet-level LLP dashboard queries

All new fields are optional (not required) to preserve backward compatibility with existing engine records.

### Which Requirement It Serves

- **REQ-EH-01** (Erik Holmberg, Powerplant Mechanic): LLP accumulated time monotonically enforced per component serial number.
- **REQ-EH-05** (Erik Holmberg): LLP dashboard per engine S/N: all LLPs, limits, accumulated, remaining.
- **REQ-RT-01** (Rosario Tafoya, Powerplant Lead): Engine as first-class entity with own TT, cycles, LLP dashboard.
- **REQ-RT-02** (Rosario Tafoya): LLP life carries across install/remove cycles and across airframes.

**Context from synthesis:** Both Erik and Rosie independently described the same problem: "we track LLP life in a spreadsheet because the software can't do it." For turbine engines and piston-engine LLPs (crankshaft, camshaft, connecting rod assemblies), the life limit is expressed in cycles, not hours. The existing `engines` table tracked hours only. Without cycle tracking at the engine level, the system cannot:

1. Enforce monotonic LLP cycle accumulation per engine S/N (INV-21)
2. Compute LLP remaining cycles from: `lifeLimitCycles - cyclesAccumulated`
3. Surface approaching-limit warnings in the close readiness report (v1.1 feature)

**LLP tracking architecture note:**  
Individual LLPs are tracked as `parts` records with `isLifeLimited == true` and `currentEngineId` pointing to their engine. This architecture already existed in v2. What was missing was the engine-level cycle counter that LLP cycle limits are measured against. These additions provide that counter. The LLP dashboard query pattern is:

```
engine = get engines._id
llps = get parts WHERE currentEngineId == engine._id AND isLifeLimited == true
```

For each LLP: `remainingCycles = lifeLimitCycles - (totalCycles - cyclesAtInstallation)`. This computation is in the query layer, not the schema. The schema change provides the cycle tracking fields that make it possible.

### New Invariants

**INV-21 (engine cycle monotonic — v3)** (`engine.updateCycles`):  
`totalCycles` is monotonically increasing per engine S/N. Any mutation that writes `totalCycles` must verify that the incoming value >= the current `totalCycles` value. If the incoming value < current, the mutation must throw with error code `ENGINE_CYCLES_DECREASED`. This mirrors INV-18 (airframe total time) exactly. Decreasing cycle count is a falsification flag with the same severity as decreasing aircraft TT.

### Marcus's Regulatory Sign-Off Notes

> The cycle tracking additions are correct. For turbine engines under 14 CFR Part 33 type certificate data sheets, the overhaul and life-limited part limits are expressed in cycles. If your system only tracks hours, it cannot enforce compliance for any turbine shop. The fields are all optional, which is right — GA piston-only shops don't need them.
>
> INV-21 (monotonic cycles) is required for the same reason INV-18 exists for airframe TT. Cycle count rollback is falsification; the system must reject it unconditionally.
>
> The LLP package review snapshot fields (`llpPackageReviewDate`, `llpPackageReviewedByTechnicianId`, `llpPackageReviewNotes`) are a useful addition. At engine induction and at TBO, the powerplant mechanic should formally review the LLP package and document the review. These fields capture that event. The full LLP dashboard (individual LLP records, limits, accumulated, remaining) is correctly deferred to v1.1 — the schema foundation is now in place for it.
>
> One thing I want flagged for the mutations spec: when `totalCycles` is updated, the `partInstallationHistory` records for all LLPs installed on this engine should have their cycle tracking current. This is a mutation concern, not a schema concern, but it needs to be in the spec.
>
> — Marcus Webb, 2026-02-22

### Cilla's Test Impact Notes

**Existing tests to update:**

1. **`engine.create` test** — Verify new optional fields are accepted when provided; verify engine creates successfully without them (backward compatibility).

2. **New test: `engine.updateCycles`**:
   - Decrease `totalCycles` below current value → expect INV-21 throw with `ENGINE_CYCLES_DECREASED`
   - Update to equal current value → expect success (idempotent update permitted)
   - Update to higher value → expect success; verify `totalCyclesAsOfDate` is updated
   - Update `cyclesSinceOverhaul` independently → expect success

3. **LLP query integration** — New test: engine with `totalCycles` set; two parts with `currentEngineId` and `isLifeLimited == true` and `lifeLimitCycles` set; verify remaining cycles computation via query layer.

4. **`by_organization` index** — New test: multiple engines, different organizations; verify `by_organization` index returns only engines for the queried org.

5. **Inspection record time fields** — The `inspectionRecords` table has `totalTimeEngine1Hours` and `totalTimeEngine2Hours`. With cycle tracking now available, future scope (v1.1) should add cycle snapshots here. Flag this in the mutation spec as a v1.1 consideration; no schema change needed now.

**No existing tests broken.** All additions are optional fields. Existing engine records remain valid.

---

## Change 5 — `workOrders.customerFacingStatus` (v1.1 Readiness)

### What Changed

**New optional field: `workOrders.customerFacingStatus`**

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
  v.literal("completed"),
)),
```

### Which Requirement It Serves

- **REQ-DO-02** (Danny Osei, WO Coordinator): Customer-visible status as a separate field with human-readable values.
- **mvp-scope.md Schema Change #3**.

### Alpha Scope Note

No alpha mutations enforce transitions on this field. Coordinators set it manually. The field is present now because:

1. Adding it post-alpha requires a schema migration and a v1.1 breaking deployment window.
2. The field is purely additive and has no impact on any alpha mutation or invariant.
3. v1.1 customer portal will rely on it being present in the existing schema.

### Marcus's Regulatory Sign-Off Notes

> No regulatory concerns with this field. Customer-facing status is an operational convenience field with no compliance implications. The field is correctly separated from the internal `workOrderStatus` — an operator's customer-facing portal should not expose internal lifecycle state (draft, voided, open_discrepancies, etc.). The separation is correct.
>
> — Marcus Webb, 2026-02-22

### Cilla's Test Impact Notes

No existing tests affected. Optional field — existing work order creation tests remain valid. New tests needed when v1.1 portal is scoped: (a) verify customer-facing status transitions are valid; (b) verify internal status and customer-facing status can diverge (by design).

---

## New Invariant Register (v3 Additions)

v2 defined invariants INV-01 through INV-20. v3 adds:

| ID | Description | Table | Mutation | Error Code |
|----|-------------|-------|----------|------------|
| INV-21 | `engines.totalCycles` is monotonically increasing. Throw if incoming < current. | `engines` | `updateEngineCycles` | `ENGINE_CYCLES_DECREASED` |
| INV-22 | `testEquipment.calibrationExpiryDate` must be > `calibrationDate`. | `testEquipment` | `createTestEquipment`, `updateCalibration` | `CAL_EXPIRY_BEFORE_CAL_DATE` |
| INV-23 (test equip) | Snapshot fields in `embeddedTestEquipmentRef` must match referenced `testEquipment` record at signing time. `calibrationCurrentAtUse` computed server-side. | `maintenanceRecords` | `createMaintenanceRecord` | `TEST_EQUIP_SNAPSHOT_MISMATCH` |
| INV-23 (parts) | Parts in `location == "pending_inspection"` are not issuable. | `parts` | `installPart`, `assignPartToTaskCard` | `PART_NOT_INSPECTED` |
| INV-24 | `qcmReview.create` requires `workOrder.status == "closed"`. | `qcmReviews` | `createQcmReview` | `WO_NOT_CLOSED` |
| INV-25 | `reviewedByTechnicianId` must match `organization.qualityControlManagerId`. | `qcmReviews` | `createQcmReview` | `NOT_QCM` |
| INV-26 | `findingsNotes` must be non-empty when `outcome != "accepted"`. | `qcmReviews` | `createQcmReview` | `FINDINGS_REQUIRED` |

**Note on dual INV-23 numbering:** Both the test equipment snapshot invariant and the parts issuance invariant are numbered INV-23. In the final mutations spec, these should be renumbered INV-23 (test equipment snapshot) and INV-23a (parts issuance pending inspection) or split into INV-23 and INV-27. I'm flagging this for Cilla's test matrix update — she should assign final numbers in the test matrix document to avoid ambiguity.

---

## Schema Freeze Update

**v3 is now the frozen schema. `convex-schema-v2.md` is superseded.**

The freeze policy from `phase-1-data-model/schema-freeze-notice.md` remains in force, with v3 as the new baseline. The change request process (author → Marcus → Cilla → Devraj → version tag) applies to all changes to `phase-5-implementation/convex/schema-v3.ts`.

No further schema changes are permitted before MVP build completion without going through the full change request process.

### Build Start Checklist

The following conditions must be satisfied before any Phase 5 mutation is written:

- [x] schema-v3.ts committed to `phase-5-implementation/convex/`
- [x] schema-v3-change-log.md committed (this document)
- [ ] Marcus Webb sign-off documented in this file (notes included above; formal signature block below)
- [ ] Cilla Oduya sign-off documented in this file (notes included above; formal signature block below)
- [ ] Cilla's test matrix updated with INV-21 through INV-26 cases
- [ ] Devraj's mutations spec updated to reference v3 schema (not v2)
- [ ] Jonas Harker notified: no new Convex mutations against v2 after this date

---

## Signatures

**Devraj Anand** — Author, Backend Engineer  
I authored the v3 additions. Each addition has a clear requirement source, a documented rationale, and associated invariants. The changes are strictly additive to v2. All 20 v2 invariants remain in force. The new invariants (INV-21 through INV-26, pending final numbering) are implementable and testable. This schema supports the Phase 5 MVP alpha build.

*Signed: Devraj Anand, 2026-02-22*

---

**Marcus Webb** — Regulatory Review  
v3 is signed off with the notes documented above. The four additions are regulatory sound. Key points:

1. Test equipment calibration traceability (`testEquipment` + `testEquipmentUsed`) is a Part 145 RSM requirement — not optional for any avionics facility. The warning-not-block design for expired calibration is correct.
2. `pending_inspection` parts state closes a compliance gap with 14 CFR 145.221. The mutation-layer issuance block is required and must be implemented before alpha ships.
3. `qcmReviews` as a signed compliance record is the correct design. The audit log event type alone is insufficient for regulatory purposes.
4. Engine cycle tracking (INV-21) has the same regulatory weight as airframe TT monotonic tracking (INV-18). Implement with identical rigor.

No changes touching `maintenanceRecords`, `inspectionRecords`, `returnToService`, `signatureAuthEvents`, or `engines.totalCycles` come to the build team without coming to me first. That remains non-optional.

*Signed: Marcus Webb, Regulatory & Compliance, 2026-02-22*

---

**Cilla Oduya** — QA Review  
v3 is signed off with the test impact notes documented above. The additions are testable. My conditions:

1. INV-23 dual-numbering must be resolved before the mutations spec is finalized. I will not accept a test matrix with ambiguous invariant IDs.
2. Every invariant gets a test case. INV-21 through INV-26 (however they're renumbered) must each have at minimum one positive test and one negative test in the test matrix before the corresponding mutation is considered done.
3. The `calibrationCurrentAtUse` field in `embeddedTestEquipmentRef` is a server-side computation. Any implementation that allows the client to set this field directly is a test failure, not a warning. The client cannot be trusted to compute calibration currency correctly.
4. The `qcmReview` end-to-end scenario (WO close → 48h aging → QCM review → dashboard clears) is a required integration test for alpha. It is not optional.

*Signed: Cilla Oduya, QA Lead, 2026-02-22*

---

*This document is effective immediately. `convex-schema-v2.md` is superseded. `phase-5-implementation/convex/schema-v3.ts` is the sole authoritative schema for all Phase 5 MVP build work.*
