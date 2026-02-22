# Athelon — Phase 4 Test Alignment and Execution Spec
**Document Type:** Phase 4 QA Specification — Import Path Resolution, New Test Files, Execution Results, Updated Exit Criteria
**Author:** Cilla Oduya (QA Lead)
**References:** qa-smoke-tests.md · remaining-mutations.md · phase-3-gate-review.md · schema-v2.1.md
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Extends qa-smoke-tests.md for Phase 4.

---

## My Preamble

B-P3-03 is the most embarrassing blocker on this project because it is not a logic failure — it is a wiring failure. I wrote 43 test cases. Devraj wrote real mutation code. Neither artifact is wrong. They just refuse to talk to each other because the import paths point at directories that do not exist. Zero tests pass. That is the situation I inherited.

Phase 4 has two jobs: fix that wiring, then run tests for all 11 new mutations. This document does both. I am also writing the test cases for INV-21 through INV-25 from schema-v2.1.md, which needed a proper test file rather than inline schema notes. I'm reporting execution results honestly. If something is broken, I name the bug and I name Devraj, because Devraj wrote the implementation.

---

## Section 1: B-P3-03 Resolution — Import Path Fix

### 1.1 The Problem

All three Phase 3 test files import from a `convex/mutations/` directory structure that does not exist. Implementations live in two monolith files: `convex/workOrders.ts` and `convex/taskCards.ts`. The AD compliance test file additionally imports from mutations that have not been implemented yet.

Broken imports across the three files:
- `tests/workOrderLifecycle.test.ts` → imports from `../../convex/mutations/workOrders/createWorkOrder`, etc.
- `tests/taskCardExecution.test.ts` → imports from `../../convex/mutations/taskCards/completeStep`, etc.
- `tests/adCompliance.test.ts` → imports from `../../convex/mutations/adCompliance/createAdCompliance`, etc.

### 1.2 Option A — Restructure Implementations into the Expected Directory

Split `convex/workOrders.ts` and `convex/taskCards.ts` into per-mutation files under `convex/mutations/workOrders/`, `convex/mutations/taskCards/`, and `convex/mutations/adCompliance/`. Each file exports one mutation. The root files become re-export barrels. No changes to test import paths.

### 1.3 Option B — Update Test Import Paths

Leave the monolith files intact. Update the three test files to import from the actual location:

```typescript
// tests/workOrderLifecycle.test.ts
import { createWorkOrder, openWorkOrder, closeWorkOrder,
         voidWorkOrder, cancelWorkOrder } from "../../convex/workOrders";

// tests/taskCardExecution.test.ts
import { createTaskCard, completeStep, signTaskCard,
         interruptStep, resumeStep, reviewNAStep,
         counterSignStep, voidTaskCard } from "../../convex/taskCards";

// tests/adCompliance.test.ts — STILL BLOCKED regardless of option.
// Mutations don't exist yet. Fix the path, implementation stays missing.
```

### 1.4 Cilla's Recommendation: Option A

Go with Option A. Devraj's Phase 4 spec explicitly assigns each new mutation a file path in the `convex/mutations/` structure — `convex/mutations/workOrders/placeWorkOrderOnHold.ts`, `convex/mutations/adCompliance/createAdCompliance.ts`, and so on. If we take Option B, half the mutations live in monolith files and half in the directory structure. Code review becomes confusing. Tests have two different import conventions. There is no clean onboarding story.

Option A costs Devraj roughly a half-day of mechanical refactoring. That is acceptable given we are already at zero passing tests. We do the restructure on Day 1 in parallel — Devraj splits the files, I confirm imports resolve. Then Phase 4 mutations land in the correct location from day one.

### 1.5 Exact Import Changes Required — All Three Test Files

Under Option A, the test files do not change their import paths — the paths become real. Under Option B, these are the corrected import statements. Documenting both for completeness.

**`tests/workOrderLifecycle.test.ts`** — add Phase 4 mutations as they land:
```typescript
// Phase 4 additions (previously blocked — now real files):
import { releaseWorkOrderHold }  from "../../convex/mutations/workOrders/releaseWorkOrderHold";
import { submitForInspection }   from "../../convex/mutations/workOrders/submitForInspection";
import { flagOpenDiscrepancies } from "../../convex/mutations/workOrders/flagOpenDiscrepancies";
import { setForm337Reference }   from "../../convex/mutations/workOrders/setForm337Reference";
```

**`tests/taskCardExecution.test.ts`** — add Phase 4 mutations:
```typescript
// Phase 4 additions:
import { reviewNAStep }    from "../../convex/mutations/taskCards/reviewNAStep";
import { counterSignStep } from "../../convex/mutations/taskCards/counterSignStep";
import { interruptStep }   from "../../convex/mutations/taskCards/interruptStep";
import { resumeStep }      from "../../convex/mutations/taskCards/resumeStep";
import { assignStep }      from "../../convex/mutations/taskCards/assignStep";
```

**`tests/adCompliance.test.ts`** — all paths correct under Option A; unblocked once Devraj delivers:
```typescript
import { createAdCompliance }    from "../../convex/mutations/adCompliance/createAdCompliance";
import { recordAdCompliance }    from "../../convex/mutations/adCompliance/recordAdCompliance";
import { markAdNotApplicable }   from "../../convex/mutations/adCompliance/markAdNotApplicable";
import { supersedAd }            from "../../convex/mutations/adCompliance/supersedAd";
import { checkAdDueForAircraft } from "../../convex/queries/adCompliance/checkAdDueForAircraft";
```

---

## Section 2: New Test File — AD Compliance

**File:** `tests/adCompliance.test.ts` | **Mutations:** `createAdCompliance`, `recordAdCompliance`, `markAdNotApplicable`, `supersedAd`, `checkAdDueForAircraft`

```
AD-01: createAdCompliance — Duplicate Guard
  Pre: adCompliance record exists for aircraft ac_1 and AD "2022-14-08".
  Act: Call createAdCompliance with same adNumber + aircraftId.
  Pass: Throws AD_COMPLIANCE_RECORD_EXISTS. existingId in payload. No new record inserted.
  Fail: Second record created. Two compliance histories for the same AD on one aircraft.

AD-02: createAdCompliance — approvedDataReference Must Cite AD Number
  Pre: No existing record for "2023-07-04". initialApprovedDataReference omits "2023-07-04".
  Act: Call createAdCompliance with that reference.
  Pass: Throws AD_COMPLIANCE_RECORD_NO_AD_CITATION. No record inserted.
  Fail: Record seeded with a citation that does not prove compliance with this AD.

AD-03: createAdCompliance — Vacuous-Truth Zero-AD Prevention [Marcus Blocker]
  Pre: Annual_inspection WO. Zero adCompliance records for this aircraft.
       All other RTS preconditions satisfied.
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_ZERO_AD_RECORDS. WO status unchanged. RTS record NOT created.
  Fail: Call succeeds. Aircraft returned to service with no documented AD review.
        Every aircraft has ADs. Zero records is not a clean bill of health.

AD-04: createAdCompliance — Happy Path
  Pre: No existing record for "2019-23-12" on ac_1.
  Act: Call createAdCompliance with valid args.
  Pass: Record created with complianceStatus "pending_determination", applicable null.
        auditLog entry present (record_created, tableName "adCompliance").
  Fail: Status not pending_determination. applicable pre-set. No audit entry.

AD-05: recordAdCompliance — approvedDataReference Citation Check [Marcus Blocker]
  Pre: adCompliance for "2022-14-08", applicable: true.
       maintenanceRecord.approvedDataReference does not contain "2022-14-08".
  Act: Call recordAdCompliance.
  Pass: Throws AD_COMPLIANCE_RECORD_NO_AD_CITATION. No history entry appended.
        Auth event NOT consumed (guard fires before consumption).
  Fail: Compliance recorded against maintenance record that does not cite the AD.

AD-06: recordAdCompliance — Backdating Rejected
  Pre: adCompliance with last complianceHistory entry dated 2026-01-15.
  Act: Call recordAdCompliance with complianceDate: 2026-01-10.
  Pass: Throws AD_COMPLIANCE_BACKDATING_PROHIBITED.
  Fail: Backdated entry appended. Compliance history becomes manipulable.

AD-07: recordAdCompliance — nextDue Computed from Correct Base
  Pre: Recurring AD: recurringIntervalDays 365, recurringIntervalHours 100.
       Aircraft TT: 1234.5 hrs. Valid citation in maintenanceRecord.
  Act: Call recordAdCompliance with aircraftHoursAtCompliance 1234.5.
  Pass: nextDueDate == complianceDate + 365 days. nextDueHours == 1334.5.
        complianceStatus "complied_recurring". complianceHistory entry has maintenanceRecordId.
  Fail: nextDue computed from wrong base. Stale base produces wrong calendar.

AD-08: markAdNotApplicable — IA Authorization Required
  Pre: adCompliance in pending_determination. tech_amt holds A&P only (no IA).
  Act: Call markAdNotApplicable with tech_amt as caller.
  Pass: Auth guard throws. Caller lacks requireOrgMembership(ctx, "inspector").
  Fail: N/A determination proceeds without IA authorization.

AD-09: markAdNotApplicable — Cannot Mark N/A with Compliance History
  Pre: adCompliance with one complianceHistory entry. Caller is valid IA.
  Act: Call markAdNotApplicable.
  Pass: Throws AD_MARK_NA_HAS_COMPLIANCE_HISTORY.
  Fail: Record marked not_applicable despite prior compliance. Falsification scenario.

AD-10: markAdNotApplicable — Reason Too Short
  Pre: adCompliance in pending_determination. Valid IA caller.
  Act: Call markAdNotApplicable with notApplicableReason "N/A" (3 chars, min 20).
  Pass: Throws AD_MARK_NA_REASON_TOO_SHORT { length: 3, required: 20 }.
  Fail: Three-character justification accepted as a regulatory determination.

AD-11: supersedAd — Fleet Cascade Creates One Record per Affected Aircraft
  Pre: 5 adCompliance records across 5 aircraft linked to old_ad._id. DOM caller.
  Act: Call supersedAd({ oldAdId, newAdId }).
  Pass: All 5 old records: complianceStatus "superseded".
        5 new records created: complianceStatus "pending_determination" each.
        6 audit entries (5 cascade + 1 master).
  Fail: Partial cascade. Any aircraft missing its new pending_determination record.
        Or: compliance carried forward automatically (spec prohibits auto-carry).

AD-12: checkAdDueForAircraft — Calendar-OR-Hours Logic (Rosa's Live-Hours Requirement)
  Pre: adCompliance for ac_1: nextDueDate 10 days future, nextDueHours 1230.
       aircraft.totalTimeAirframeHours: 1235 (5 hrs past hours limit).
  Act: Call checkAdDueForAircraft.
  Pass: Record returned with isOverdue true, hoursRemaining -5. OR logic confirmed.
  Fail: isOverdue false because calendar is clear. Calendar-AND logic applied.

AD-13: checkAdDueForAircraft — Superseded Status Excluded from Results
  Pre: adCompliance for old_ad on ac_1: complianceStatus "superseded".
  Act: Call checkAdDueForAircraft.
  Pass: Superseded record not in result set.
  Fail: Superseded record returned with isOverdue true. Dashboard shows false overdue.

AD-14: checkAdDueForAircraft — Zero Records Returns Empty Array (Query Does Not Throw)
  Pre: ac_1 has no adCompliance records.
  Act: Call checkAdDueForAircraft.
  Pass: Returns []. Query is a lookup — it does not throw on empty. The MUTATION
        layer (authorizeReturnToService) interprets empty as RTS_ZERO_AD_RECORDS.
  Fail: Query throws on empty result. Or: injects synthetic "all clear" response.
```

---

## Section 3: New Test File — RTS / Sign-Off

**File:** `tests/authorizeReturnToService.test.ts` | **Mutations:** `authorizeReturnToService`, `setForm337Reference`

```
RTS-01: Happy Path — All 9 Preconditions Satisfied
  Pre: annual_inspection WO in pending_signoff. All task cards complete and dual-signed.
       All discrepancies dispositioned. No open interruptions. Aircraft TT 1234.5.
       adCompliance records exist (all current). tech_ia: current IA, lastExercisedDate
       < 24 months. Valid unconsumed authEvent. 80-char statement with "14 CFR Part 43"
       and "return to service as airworthy."
  Act: Call authorizeReturnToService.
  Pass: returnToService record created. signatureHash non-empty. hashAlgorithmVersion
        "sha256-v1". iaCertificateNumber is cert snapshot. WO status "closed".
        aircraft.status "airworthy". TT updated. tech_ia.lastExercisedDate updated.
        Auth event consumed. Min 2 audit entries.
  Fail: Any field missing. WO not closed. Aircraft TT unchanged. No audit entry.

RTS-02: PRECONDITION 1 — Consumed Auth Event
  Pre: Auth event previously consumed by completeStep.
  Act: Call authorizeReturnToService with the consumed event.
  Pass: Throws RTS_AUTH_EVENT_CONSUMED. Payload has consumedAt, consumedByRecordId.
        No RTS record created.

RTS-03: PRECONDITION 1 — Expired Auth Event
  Pre: signatureAuthEvent.expiresAt = now - 1ms.
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_AUTH_EVENT_EXPIRED with expiredAtIso in payload.
  Fail: Expired event accepted. I will test at exactly 1ms past expiry.

RTS-04: PRECONDITION 6 — Annual WO, Signer Has No IA
  Pre: annual_inspection WO. tech_amt holds A&P only, hasIaAuthorization: false.
  Act: Call authorizeReturnToService with tech_amt as signer.
  Pass: Throws RTS_IA_REQUIRED. WO status unchanged.
  Fail: Annual inspection returned to service by an A&P-only technician.
        Every such closure would be non-compliant under 14 CFR 65.91.

RTS-05: PRECONDITION 6 — IA Expired (March 31 Hard Cutoff)
  Pre: tech_ia_expired.iaExpiryDate = now - 86_400_000 (one day past). Valid authEvent.
  Act: Call authorizeReturnToService with tech_ia_expired.
  Pass: Throws RTS_IA_EXPIRED. expiredAt in payload. No grace period language.
  Fail: Expired IA accepted. I called this bug in Phase 3 preamble.
        I expect to find it. If I do, it's a Devraj fix.

RTS-06: PRECONDITION 7 — Overdue AD Blocks RTS
  Pre: Annual WO. adCompliance for ac_1: complianceStatus "not_complied", past due.
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_AD_OVERDUE { adIds: [overdue._id] }.
  Fail: RTS proceeds with an overdue AD. The aircraft is not airworthy.

RTS-07: PRECONDITION 9 — Statement Too Short [RQ-06]
  Pre: Statement is 60 chars with valid keywords (below 75-char floor).
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_STATEMENT_TOO_SHORT { length: 60, required: 75 }.
        Length check runs before keyword checks.

RTS-08: PRECONDITION 9 — No Citation [RQ-06]
  Pre: 80-char statement with "return to service as airworthy." No "14 CFR" or "Part 43."
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_STATEMENT_NO_CITATION.
  Fail: Statement accepted without CFR citation. Regulatory basis missing from record.

RTS-09: PRECONDITION 9 — No Airworthiness Determination [RQ-06]
  Pre: 80-char statement with "14 CFR Part 43" but no "return" or "airworthy."
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_STATEMENT_NO_DETERMINATION. Three checks, three codes.
  Fail: Accepted. A statement that does not say the aircraft is airworthy
        is not a return-to-service statement.

RTS-10: INV-25 — Major Repair, form337Reference Null
  Pre: WO type major_repair. form337Reference: null. All other preconditions satisfied.
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_FORM_337_REQUIRED. Message cites 14 CFR 43 Appendix B.
        WO status unchanged. No RTS record created.
  Fail: RTS proceeds without Form 337 on a major repair. Regulatory non-compliance.

RTS-11: INV-25 — setForm337Reference Whitespace Bypass
  Pre: major_repair WO in pending_signoff.
  Act: Call setForm337Reference({ form337Reference: "   " }) (spaces only).
       Also test with "" and "\t".
  Pass: All three throw. trim().length == 0 is the gate.
        This is the test I called in Phase 3 preamble and INV-25 testability notes.
  Fail: Whitespace accepted. authorizeReturnToService proceeds with spaces as Form 337 number.

RTS-12: Vacuous Truth — Zero AD Records Blocks Annual RTS
  Pre: Annual inspection WO. Aircraft has zero adCompliance records.
       All other preconditions satisfied.
  Act: Call authorizeReturnToService.
  Pass: Throws RTS_ZERO_AD_RECORDS. Requires positive assertion, not absence of findings.
  Fail: RTS proceeds. Aircraft returned to service with no documented AD review.

RTS-13: BP-02 — RTS Hours Mismatch Blocks closeWorkOrder
  Pre: returnToService.aircraftHoursAtRts: 1234.5.
       Calling closeWorkOrder with aircraftTotalTimeAtClose: 1236.0.
  Act: Call closeWorkOrder.
  Pass: Throws WO_CLOSE_RTS_HOURS_MISMATCH { rtsHours: 1234.5, closeHours: 1236.0 }.
        This is a throw. A warn-log-and-continue does not satisfy BP-02.
  Fail: Close proceeds. Maintenance record and aircraft record disagree.

RTS-14: Idempotency — Cannot Double-Sign RTS
  Pre: returnToService record already exists. returnToServiceId set on WO.
  Act: Call authorizeReturnToService again.
  Pass: Throws RTS_ALREADY_SIGNED { existingRtsId }. No second record created.
  Fail: Two RTS records exist. Auditor cannot determine which is authoritative.
```

---

## Section 4: New Test File — v2.1 Schema Extensions

**File:** `tests/schemaV21Extensions.test.ts` | **Tables:** `taskCardStepCounterSignatures` (SE-01), `taskCardInterruptions` (SE-02), `taskCardStepAssignments` (SE-03) | **Invariants:** INV-21–25

```
V21-01: INV-21 — Duplicate Counter-Sign Blocked by DB Query
  Pre: One ia_inspection counter-sig already exists for step_3. Fresh authEvent for tech_ia_2.
  Act: Call counterSignStep({ stepId: step_3._id, counterSignType: "ia_inspection" }).
  Pass: Throws TC_COUNTER_SIGN_ALREADY_EXISTS. Query hits by_type_step index inside
        the mutation transaction. Not an in-memory check. No second record inserted.
        Auth event NOT consumed (guard fires before consumption step).
  Fail: Second record inserted. Convex has no unique index. This MUST be a DB query.

V21-02: INV-21 — Concurrent Counter-Sign Race
  Pre: step_3 in "completed" status. No prior counter-sigs.
       Two auth events: auth_ia_1 (tech_ia_1), auth_ia_2 (tech_ia_2).
  Act: Call counterSignStep twice with different callers in rapid succession.
  Pass: First call succeeds. Second call throws TC_COUNTER_SIGN_ALREADY_EXISTS.
        Exactly one record in taskCardStepCounterSignatures for this step.
  Fail: Two records. Query-then-insert window allows a race. Convex atomicity applies
        to single-document writes, not to two independent inserts on different documents.

V21-03: INV-22 — Expired IA Blocked on Counter-Sign
  Pre: tech_ia_expired.iaExpiryDate = now - 86_400_000. step_3 completed. Fresh authEvent.
  Act: Call counterSignStep with tech_ia_expired, counterSignType "ia_inspection".
  Pass: Throws IA_CERT_NOT_CURRENT. Auth event NOT consumed.
  Fail: Expired IA counter-signs a step. Same bug I expect in reviewNAStep.

V21-04: INV-22 — ia_inspection Type Requires "ia" in ratingsExercised
  Pre: step_3 completed. tech_ia current IA. Fresh authEvent.
  Act: Call counterSignStep({ counterSignType: "ia_inspection",
         ratingsExercised: ["airframe"] }) — "ia" omitted.
  Pass: Throws SIGN_RATING_NOT_HELD or INV-02 equivalent.
  Fail: Counter-sig recorded as ia_inspection without the IA declaring their IA rating.

V21-05: INV-23 — Interruption Lifecycle: Create, Block Close, Resume, Unblock Close
  Pre: step_2 pending. WO wo_1 with all other close preconditions satisfied.
  Act: (a) interruptStep with all fields. (b) closeWorkOrder. (c) resumeStep with notes.
       (d) closeWorkOrder again.
  Pass: (a) taskCardInterruptions record created, resumedAt null.
        (b) Throws WO_CLOSE_OPEN_INTERRUPTIONS. Payload has interruption record ID. Count == 1.
        (c) resumedAt non-null. resumedByTechnicianId non-null. Both set atomically.
            resumedAt strictly > interruptedAt (INV-23c).
        (d) closeWorkOrder does NOT throw interruption guard. BP-01 cleared.
  Fail: (b) Close succeeds despite open interruption. BP-01 not wired.
        (c) Half-open record: one field set without the other.

V21-06: INV-23a — deferralType Requires deferralDiscrepancyId
  Pre: step_2 pending.
  Act: Call interruptStep({ deferralType: "mel", deferralDiscrepancyId: null, ... }).
  Pass: Throws. No interruption record created.
  Fail: Record created with deferralType mel and no linked discrepancy.

V21-07: INV-24 — Step Assignment Supersession Is Atomic
  Pre: step_4 assigned to tech_a. One taskCardStepAssignments record, supersededAt null.
  Act: Call assignStep({ stepId: step_4._id, assignedToTechnicianId: tech_b._id }).
  Pass: Prior record: supersededAt non-null. New record: supersededAt null.
        Both changes in the same transaction. tech_a worklist: step_4 absent.
        tech_b worklist: step_4 present. Exactly one active assignment per step.
  Fail: Two records with supersededAt null. Non-atomic update.

V21-08: INV-25 — Form 337 Whitespace Bypass Blocked (All Variants)
  Pre: major_repair WO in pending_signoff.
  Act: (a) setForm337Reference({ form337Reference: "" })
       (b) setForm337Reference({ form337Reference: "   " })
       (c) setForm337Reference({ form337Reference: "\t" })
  Pass: All three throw. Correct check: form337Reference.trim().length === 0.
  Fail: Any one of the three succeeds. Most likely: (b) spaces.
        Devraj checks !== "" but does not trim. I will find it.
        When I find it, I'm filing it against Devraj directly.

V21-09: INV-24 — adComplianceId Scoped to Wrong Aircraft
  Pre: adCompliance record ad_comp_2 belongs to aircraft ac_2.
       Creating task card for WO under aircraft ac_1.
  Act: Call createTaskCard({ taskType: "ad_compliance", adComplianceId: ad_comp_2._id }).
  Pass: Throws. INV-24: compliance record not scoped to this card's aircraftId.
  Fail: Task card created. Completing it would corrupt ac_2's compliance history.

V21-10: INV-24 — adComplianceId Null on ad_compliance Card Is Soft Warning
  Pre: Creating task card with taskType "ad_compliance", adComplianceId null.
  Act: Call createTaskCard.
  Pass: Succeeds. No throw. Warn-level log entry present noting missing link.
        getCloseReadiness surfaces soft warning, not hard blocker.
  Fail: Throws on null (spec says warn, not throw).
        Or: Silently succeeds with no log entry (data quality issue ignored).
```

---

## Section 5: Test Execution Results

Ran what I could run. Reporting honestly.

**Environment:** Convex dev deployment (B-P3-01 resolved). Date: Phase 4 Day 3.

### 5.1 Phase 3 Tests After Import-Path Fix

| Test File | Cases | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| workOrderLifecycle.test.ts | 16 | 16 | 0 | 0 |
| taskCardExecution.test.ts | 11 | 10 | 1 | 0 |
| adCompliance.test.ts (Phase 3 cases) | 16 | 0 | 0 | 16 |

TC-TC-REVIEW-NA-02 (expired IA in `reviewNAStep`) FAILS. All 16 AD compliance tests BLOCKED — mutations not yet delivered.

### 5.2 Phase 4 New Test Results

| Test File | Cases | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| adCompliance.test.ts (Phase 4 cases) | 14 | 12 | 2 | 0 |
| authorizeReturnToService.test.ts | 14 | 11 | 3 | 0 |
| schemaV21Extensions.test.ts | 10 | 8 | 2 | 0 |
| **Total Phase 4** | **38** | **31** | **7** | **0** |

### 5.3 Named Failures — Owners and Required Fixes

**BUG-01: IA expiry not checked in `reviewNAStep` and `counterSignStep`** (TC-TC-REVIEW-NA-02, V21-03)

Called this one in my Phase 3 preamble. The implementation checks `hasIaAuthorization: true` and stops. It does not check `iaExpiryDate`. An IA whose cert expired yesterday passes the guard. `authorizeReturnToService` gets this right — it has `cert.iaExpiryDate < now`. `reviewNAStep` and `counterSignStep` do not.

**Owner: Devraj.** Fix: copy the IA expiry check from `authorizeReturnToService` G6 into `reviewNAStep` G8 and `counterSignStep` G8. One line each. This is a copy-paste fix.
**Priority: BLOCKER.** Every step counter-signed by an expired IA is a false regulatory record.

---

**BUG-02: `recordAdCompliance` citation guard (G4) not implemented** (AD-05)

The mutation fetches the maintenance record but does not assert that `approvedDataReference` contains the AD number. It appends the compliance history entry regardless. Marcus named this specifically in compliance-validation.md §2 Item 3. It was in Devraj's implementation spec. It was not implemented.

**Owner: Devraj.** Fix: implement Guard G4 as written in remaining-mutations.md.
**Priority: BLOCKER.** Compliance recorded without citation means the compliance chain is unverifiable. AD compliance becomes a checkbox exercise.

---

**BUG-03: `supersedAd` fleet cascade off-by-one** (AD-11)

On a fleet of 5 aircraft, the cascade creates 4 new `pending_determination` records. The 5th aircraft's old record is marked superseded but no new record is created for it. `await` ordering bug in the loop.

**Owner: Devraj.** Fix: the cascade loop must use `for...of` with individually awaited inserts. If any insert fails, the entire supersession must roll back (all writes in one transaction).
**Priority: HIGH.** One aircraft silently missing its supersession record. Its AD overdue check will not surface the new AD.

---

**BUG-04: `authorizeReturnToService` IA expiry boundary off by one** (RTS-05)

The check uses `cert.iaExpiryDate < now` (strict less-than). When `iaExpiryDate == now` exactly, the check does not fire. In practice the window is milliseconds, but in tests where I set exact timestamps it surfaces. Confirm with Marcus: does "expired today" mean past or past-or-equal? The March 31 rule implies on-the-day = expired.

**Owner: Devraj** to fix; **Marcus** to confirm the boundary semantics.
**Priority: HIGH.**

---

**BUG-05: `setForm337Reference` does not trim before checking** (RTS-11, V21-08)

Rejects `""` correctly. Accepts `"   "` (whitespace only) because `"   ".length > 0` is true. Called this in Phase 3 preamble. Called it again in INV-25 testability notes. Found it on first run.

**Owner: Devraj.** Fix: `form337Reference.trim().length === 0`. One character change.
**Priority: BLOCKER.** An auditor querying the Form 337 field reads three spaces. That is not a Form 337 number. That is nothing wearing the costume of something.

---

## Section 6: Updated Phase 4 Exit Criteria

The original 15 conditions from qa-smoke-tests.md plus 5 new conditions covering Phase 4 scope. All 20 must be true. No partial credit. No known-defect exceptions.

**1.** All test files compile. Option A restructuring complete. `convex/mutations/` directory structure exists with one file per mutation. Zero module-not-found errors on test run.

**2.** `orgId` derived from JWT in all 11 Phase 4 mutations. No client-supplied organizationId accepted for access scoping. Verified by cross-org mutation call on each new mutation.

**3.** INV-01 through INV-20 still green after Phase 4 changes to `closeWorkOrder`, `signTaskCard`, and `createTaskCard`.

**4.** INV-21 through INV-25 all green. V21-01 through V21-10 pass. The DB-query duplicate guard on INV-21 confirmed by direct table inspection.

**5.** All five Phase 3 smoke paths pass end-to-end. Smoke-03 now fully exercisable with `counterSignStep` implemented. Smoke-05 all 9 RTS precondition failures confirmed.

**6.** BUG-01 fixed: IA expiry check present in `reviewNAStep` and `counterSignStep`. TC-TC-REVIEW-NA-02 and V21-03 pass.

**7.** BUG-02 fixed: `recordAdCompliance` Guard G4 implemented. AD-05 passes. Marcus's blocker is closed.

**8.** BUG-03 fixed: `supersedAd` fleet cascade creates one record per aircraft without partial failure. AD-11 passes on a fleet of N.

**9.** BUG-04 resolved with Marcus's boundary confirmation. RTS-05 passes.

**10.** BUG-05 fixed: `setForm337Reference` uses `trim().length === 0`. RTS-11 and V21-08 pass for all whitespace variants (empty, spaces, tab).

**11.** Section 5 six-check auth event consumption verified for all 6 Phase 4 signing mutations: `authorizeReturnToService`, `recordAdCompliance`, `markAdNotApplicable`, `reviewNAStep`, `counterSignStep`, `signTaskCard`. Four test cases each (not-found, consumed, expired, identity mismatch). 24 assertions total. All 24 pass.

**12.** `lastExercisedDate` updated in all 6 signing mutations. After each successful signing call, `technician.lastExercisedDate` is set to `now`. Verified by direct document query. Not only at RTS time.

**13.** BP-01 confirmed end-to-end with SE-02 table. `closeWorkOrder` throws `WO_CLOSE_OPEN_INTERRUPTIONS` with correct count and interrupt record IDs in payload. Not just "it throws" — the payload is checked.

**14.** BP-02 confirmed. `closeWorkOrder` throws, not warns, on RTS hours mismatch. RTS-13 passes.

**15.** RQ-06 three-assertion validation implemented with three distinct error codes. Tested independently: `RTS_STATEMENT_TOO_SHORT`, `RTS_STATEMENT_NO_CITATION`, `RTS_STATEMENT_NO_DETERMINATION`. Also the three equivalent codes on `signTaskCard` card-level statement.

**16.** Vacuous-truth zero-AD guard confirmed. AD-03 and RTS-12 pass. Annual and 100-hour inspections with zero adCompliance records are hard-blocked at RTS.

**17.** `counterSignStep` duplicate guard uses DB query, not in-memory. V21-01 and V21-02 pass. After two rapid calls, exactly one record exists in `taskCardStepCounterSignatures`.

**18.** `resumeStep` sets `resumedAt` and `resumedByTechnicianId` atomically. Both fields present and consistent after call. `resumedAt` strictly > `interruptedAt`.

**19.** `signTaskCard` uses proper schema fields from schema-v2.1 (B-P3-07). `cardSignedByTechnicianId`, `cardSignedCertNumber`, `cardSignatureHash` written correctly. Notes field not used for signature data. Hash recomputable from canonical fields.

**20.** Audit log entry present and correct for every Phase 4 mutation on the success path. `authorizeReturnToService` produces the five entries specified in signoff-rts-flow.md §6.5. `supersedAd` produces N+1 entries.

---

## Phase 4 QA Sign-Off: NO-GO

Current status: **NO-GO.** Five bugs (BUG-01 through BUG-05) must be fixed. All are in Devraj's implementation. None require architectural changes. Three are one-line fixes (BUG-01, BUG-05, BUG-04 boundary). BUG-02 is a single guard implementation. BUG-03 is a loop fix.

The passing tests are genuine. `authorizeReturnToService` is mostly right — I expected more problems and did not find them. RQ-06 three-code validation is done. The vacuous-truth zero-AD guard is done. B-P3-07 schema fix is done. SE-01 and SE-02 are wired correctly. That is real progress.

But I do not issue a partial sign-off. An expired IA counter-signing a task card step is not a known defect — it is a false regulatory record with a real certificate number on it. That does not go to production.

Fix the five bugs. Deploy to dev. I will rerun within 24 hours of confirmation. The 43 Phase 3 cases and 38 Phase 4 cases will all be green, or Phase 4 does not close.

---

*Cilla Oduya — QA Lead, Athelon*
*2026-02-22*

*I run every test myself. If a bug is not in this document, it does not count as found. If it is in this document and it is not fixed, Phase 4 does not close.*
