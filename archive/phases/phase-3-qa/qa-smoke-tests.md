# Athelon — QA & Smoke Tests Specification
**Document Type:** Phase 3 QA Specification — Test Matrix, Smoke Test Scripts, Invariant Cases
**Author:** Cilla Oduya (QA Lead)
**References:** schema-v2.1.md · mutation-implementation.md · work-order-engine.md · task-card-execution.md · compliance-validation.md · phase-2-gate-review.md
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — This is the test contract for Phase 3. Not a draft. Not a suggestion.

---

## My Preamble

I have read every spec in this system, including the parts Devraj wrote at midnight and the parts Marcus annotated with a full CFR citation when a comment would have done. I know where the bodies are buried. This document is my answer to the question: "Is Phase 3 done?" It is a formal test contract, not a checklist. A mutation that passes Devraj's unit tests but fails my matrix is not done. A smoke path that passes on a clean database but fails with realistic seed data is not done. "Close enough" has no definition in a system where the output is an aircraft maintenance logbook.

I expect to find bugs in the following areas before I find them in any other:

- `counterSignStep` will silently accept a duplicate counter-signature unless Devraj adds a pre-insert DB query. He cannot rely on an index uniqueness constraint — Convex does not have unique indexes. I will find this by calling the mutation twice in rapid succession.
- `closeWorkOrder` will not count open interruptions in its error payload, even though the spec says it should. The count will be off-by-one or missing. I will check the payload, not just the error code.
- `authorizeReturnToService` will accept a whitespace-only `form337Reference` on a major repair WO because someone will trim and check length in the wrong order. I will test `"   "` explicitly.
- The six-check signatureAuthEvent consumption sequence will be incomplete in at least one signing mutation. The identity mismatch check (Check 4) is the most commonly omitted. I will test it on every signing mutation individually.
- `reviewNAStep` will not verify the IA March 31 expiry date. It will check `hasIaAuthorization: true` and stop there. An IA whose authorization expired yesterday will be accepted. I will test this with `iaExpiryDate = now - 86_400_000`.

Those are the bugs I expect to find. There will be more. This document names the tests that will catch them.

---

## Section 1: Test Matrix Structure

### 1.1 Organization

Tests are organized into four layers:

| Layer | ID Prefix | Scope | Count |
|---|---|---|---|
| **Smoke Test Paths** | Smoke-01 through Smoke-05 | End-to-end critical user journeys | 5 paths |
| **Mutation Unit Tests** | By mutation name (TC-WO-*, TC-TC-*, etc.) | One assertion per guard condition per mutation | ~90 total |
| **Invariant Tests** | INV-01 through INV-25 | One test per invariant, directly or indirectly | 25 invariants |
| **Regression Tests** | REG-BP-*, REG-UM-* | One test per Phase 2 blocker and unimplemented mutation | 10 blockers, 8 UM stubs |

Every test has: a precondition state, an action (one mutation call or one query call), an expected result, a pass criterion, and a fail criterion. "No exception thrown" is never a pass criterion on its own. I also check the database state after the call.

### 1.2 What a Passing Test Looks Like

**Format:**
```
TEST [ID]: [Name]
Preconditions: [exact database state required]
Action:        [mutation or query call with exact args]
Assert-Pass:   [what must be true — return value AND database state]
Assert-Fail:   [what triggers a test failure — including wrong error code]
```

A test **passes** when:
1. The call returns the expected result (or throws the expected error with the expected error code).
2. The database state after the call matches the spec exactly (not approximately).
3. The audit log contains an entry for the affected record with the correct `eventType` and `tableName`.
4. No unintended side effects occurred (no extra records created, no incorrect fields mutated).

A test **fails** when:
1. The wrong error code is thrown (e.g., a generic `Error` instead of `ConvexError({ code: "WO_CLOSE_OPEN_INTERRUPTIONS" })`).
2. The call succeeds when it should throw, or throws when it should succeed.
3. Database state is incorrect after the call — wrong field value, missing write, or stale denormalized counter.
4. The audit log has no entry for the call, or the entry has incorrect fields.

**On known-defect exceptions:** There are none for Phase 3 exit. A test failure is a blocker. I do not categorize issues as "known defects" and skip them in the gate decision. Every failing test must either be fixed or explain why the test itself is wrong. If the test is wrong, I rewrite the test.

### 1.3 Environment Assumptions

- **Runtime:** Convex dev deployment with local function environment. Tests run against a real Convex database instance, not mocks.
- **Auth:** Test utilities generate valid Clerk JWTs with controlled `sub`, `org_id`, and `athelon_role` claims. Auth helpers `requireUser`, `requireOrgContext`, `requireOrgMembership` are wired to these JWTs.
- **Seed data:** A deterministic seed fixture creates: 1 organization (Part 145), 3 technicians (AMT, IA-current, IA-expired), 2 aircraft (piston + turbine), certificates for each technician, and 2 work orders in known states.
- **Time:** All time-sensitive tests use explicit `now` values rather than `Date.now()` to avoid flakiness. The mutation implementation must accept a `_testNow` override in test mode, or tests use Convex's built-in time manipulation if available.
- **Parallelism:** Tests in the INV and REG layers run sequentially per mutation. Smoke test paths run sequentially from start to finish. No parallel execution within a path.

---

## Section 2: Five Critical Smoke Test Paths

### Smoke-01: Sign-In + Org Switch

**Purpose:** Verify Clerk authentication, JWT claim propagation, and org context switch correctly gate Convex mutation access.

**Preconditions:**
- Two organizations exist: `org_A` (Part 145, role: dom) and `org_B` (Part 91, role: amt).
- Technician `tech_A` is a member of `org_A` with `athelon_role: "dom"`.
- Technician `tech_B` is a member of `org_B` with `athelon_role: "amt"`.
- One work order `wo_A` exists under `org_A`.

**Action Sequence:**

| Step | Action | Expected State |
|---|---|---|
| 1 | Sign in as `tech_A` via Clerk. Obtain JWT with `org_id: org_A`. | JWT valid. `requireOrgMembership(ctx, "amt")` resolves `orgId = org_A`. |
| 2 | Call `getWorkOrdersByOrg({ organizationId: org_A })`. | Returns `wo_A`. Audit: no write event. |
| 3 | Call any protected mutation (e.g., `placeWorkOrderOnHold`) with `workOrderId` pointing to `wo_A` with a valid hold type and reason. | Mutation executes. WO status transitions to `on_hold`. Audit log has entry. |
| 4 | Switch org context to `org_B` (new JWT with `org_id: org_B`). | JWT updated. `requireOrgMembership` now derives `orgId = org_B`. |
| 5 | Retry step 3 on the same `wo_A` (which belongs to `org_A`) using the new `org_B` JWT. | Throws `WO_ORG_MISMATCH`. WO state unchanged. |
| 6 | Call with no JWT (unauthenticated). | Throws auth error (`AUTH_REQUIRED` or equivalent). No database read occurs. |

**Pass Criteria:** Steps 1–3 succeed. Step 4 JWT swap is transparent. Steps 5–6 throw correct errors. No `org_A` data is visible or mutable from an `org_B` session.

**Fail Criteria:** Step 5 succeeds (cross-org mutation executed). Step 6 succeeds (unauthenticated access). Any step returns a generic `Error` instead of a `ConvexError` with a named error code.

---

### Smoke-02: Create and Open Work Order

**Purpose:** Full work order creation and opening flow, including all guards on `createWorkOrder` and `openWorkOrder`.

**Preconditions:**
- Org `org_1` exists, active.
- Aircraft `ac_1` exists, status `active`, `totalTimeAirframeHours: 1234.5`.
- Technician `tech_1` is active in `org_1`.
- No existing open work orders on `ac_1`.

**Action Sequence:**

| Step | Action | Expected State |
|---|---|---|
| 1 | Call `createWorkOrder` with `workOrderNumber: "WO-2026-001"`, `workOrderType: "annual_inspection"`, `organizationId: org_1`, `aircraftId: ac_1`. | Returns `woId`. WO in `draft` status. `aircraftTotalTimeAtOpen: 0` (sentinel). |
| 2 | Call `createWorkOrder` again with the same `workOrderNumber` in the same org. | Throws `INV-14` violation. Database unchanged. |
| 3 | Call `openWorkOrder` with `aircraftTotalTimeAtOpen: 1000.0` (below aircraft last-known TT of 1234.5). | Throws `INV-18` TT regression error. WO remains `draft`. |
| 4 | Call `openWorkOrder` with `aircraftTotalTimeAtOpen: 1234.5`, `assignedTechnicianIds: [tech_1]`. | Succeeds. WO transitions to `open`. `aircraftTotalTimeAtOpen` written as `1234.5`. |
| 5 | Call `openWorkOrder` again on the same WO (now `open`). | Throws state guard: `openWorkOrder requires status "draft"`. |
| 6 | Verify `auditLog.by_record("workOrders", woId)` has entries for step 1 and step 4. | Two entries: `record_created` and `status_changed` (draft → open). Both have `userId` and `timestamp`. |

**Pass Criteria:** Steps 1, 4 succeed. Steps 2, 3, 5 throw correct errors. Audit log verified at step 6. Aircraft TT at open is exactly `1234.5` on the WO document.

**Fail Criteria:** Duplicate WO number accepted. TT regression accepted. Second `openWorkOrder` accepted. Audit log missing either entry.

---

### Smoke-03: Add Task Card + Sign Steps (Including Dual Sign-Off)

**Purpose:** Full task card creation, step-by-step sign-off, interruption, and dual sign-off (IA counter-sign) path.

**Preconditions:**
- WO `wo_1` in `in_progress` status.
- Technician `tech_amt` (A&P only, no IA), `tech_ia` (A&P + current IA, `iaExpiryDate > now`), both active in org.
- Valid `signatureAuthEvent_amt` issued to `tech_amt`, unconsumed, not expired.
- Valid `signatureAuthEvent_ia` issued to `tech_ia`, unconsumed, not expired.

**Action Sequence:**

| Step | Action | Expected State |
|---|---|---|
| 1 | Call `createTaskCard` with `approvedDataSource: ""` (empty). | Throws. Task card not created. |
| 2 | Call `createTaskCard` with valid `approvedDataSource: "AMM 05-20-00 Rev 12"`, 3 steps (step numbers 1, 2, 3). Step 3 has `signOffRequiresIa: true`. | Succeeds. `taskCardId` returned. 3 `taskCardSteps` documents in `pending`. Card status: `not_started`. |
| 3 | Call `completeStep` on step 1 with `action: "complete"`, `ratingsExercised: ["powerplant"]`, valid `signatureAuthEvent_amt`. `tech_amt` holds `airframe` rating only. | Throws `SIGN_RATING_NOT_HELD`. Step status unchanged. Auth event NOT consumed. |
| 4 | Retry step 3 with `ratingsExercised: ["airframe"]`. | Succeeds. Step 1 → `completed`. Card → `in_progress`. Auth event consumed. Snapshot fields written (certNumber, legalName). |
| 5 | Call `interruptStep` on step 2 with `safetyPreservationTaken: ""` (empty). | Throws `TC_INTERRUPTION_FIELDS_REQUIRED`. Interruption record not created. |
| 6 | Call `interruptStep` on step 2 with all required fields populated. | `taskCardInterruptions` record created with `resumedAt: null`. Step 2 remains `pending`. |
| 7 | Call `closeWorkOrder` on `wo_1` (with other preconditions met except this interruption). | Throws `WO_CLOSE_OPEN_INTERRUPTIONS`. Error payload includes interruption record ID. Count in payload == 1. |
| 8 | Call `resumeStep` on the interruption from step 6 with `resumptionNotes: "Resumed after parts arrived"`. | Interruption record updated: `resumedAt != null`, `resumedByTechnicianId` set. Step 2 still `pending`. |
| 9 | Obtain fresh `signatureAuthEvent_amt_2` for step 2. Sign step 2 with `tech_amt`, `ratingsExercised: ["airframe"]`. | Succeeds. Step 2 → `completed`. Card still `in_progress` (step 3 pending). |
| 10 | Call `completeStep` on step 3 with `tech_amt` (no IA). | Throws IA currency error. Step 3 unchanged. |
| 11 | Obtain `signatureAuthEvent_ia_step3` for `tech_ia`. Call `completeStep` on step 3 with `tech_ia`, `ratingsExercised: ["airframe", "ia"]`. | Succeeds. Step 3 → `completed`. Card → `in_progress` still (dual sign-off required). |
| 12 | Obtain `signatureAuthEvent_ia_countersign` for `tech_ia`. Call `counterSignStep` on step 3, `counterSignType: "ia_inspection"`, valid scope statement. | `taskCardStepCounterSignatures` record created. Step 3 fully dual-signed. |
| 13 | Call `counterSignStep` again on step 3 with another fresh auth event, same `counterSignType`. | Throws `TC_COUNTER_SIGN_ALREADY_EXISTS`. Second record NOT inserted. |
| 14 | Obtain card-level `signatureAuthEvent_ia_card`. Call `signTaskCard` with `tech_ia`, valid `returnToServiceStatement`. | Card → `complete` (or final signed state). Audit entry present. |

**Pass Criteria:** All throws occur with correct error codes. Auth events consumed exactly once. Counter-sign duplicate rejected. Card reaches terminal signed state. Interruption record correctly closed before step 12.

**Fail Criteria:** Step 3 rating validation skipped. Step 7 `closeWorkOrder` passes despite open interruption. Step 13 duplicate counter-sign succeeds. Any step's auth event consumed without the corresponding record being updated.

---

### Smoke-04: Parts Receive + Install

**Purpose:** Full parts receiving, documentation validation, and installation path including shelf-life and LLP guards.

**Preconditions:**
- WO `wo_parts` in `in_progress` status.
- `eightOneThirtyRecord_good`: quantity 2, new part, valid form.
- `eightOneThirtyRecord_llp`: quantity 1, part is life-limited, quantity cap enforced.
- `part_coc`: `documentationType: "coc_only"`, no receiving inspection record on file.
- Aircraft `ac_1` with current total time.

**Action Sequence:**

| Step | Action | Expected State |
|---|---|---|
| 1 | Call `receivePart` for part against `eightOneThirtyRecord_good`. Receive 2 parts. | Both parts created in `inventory`. Count against tag: 2 of 2. |
| 2 | Call `receivePart` for a third part against same `eightOneThirtyRecord_good` (quantity cap: 2). | Throws `PART_QUANTITY_EXCEEDS_TAG`. Third part not created. |
| 3 | Call `receivePart` for an LLP part, exceeding `eightOneThirtyRecord_llp.quantity`. Include `supervisorOverrideAuthEventId`. | Throws `PART_QUANTITY_EXCEEDS_TAG_LLP` unconditionally. No override accepted. |
| 4 | Call `receivePart` for a part with `documentationType: "no_documentation"`. | Part created in `quarantine` location, not `inventory`. Cannot be installed until quarantine is resolved. |
| 5 | Call `installPart` on `part_coc` (CoC-only, no receiving inspection on file). | Throws `PART_COC_RECEIVING_INSPECTION_REQUIRED`. Part not installed. |
| 6 | Create a receiving inspection `maintenanceRecords` entry for `part_coc` referencing the CoC. Re-call `installPart`. | Succeeds. Part status → `installed`. `partInstallationHistory` record created. |
| 7 | Create a part with `hasShelfLifeLimit: true`, `shelfLifeLimitDate: now - 86_400_000` (expired yesterday). Call `installPart`. | Throws `PART_SHELF_LIFE_EXPIRED`. Part not installed. |
| 8 | Query `getPartTraceabilityChain` for the part installed in step 6. | Chain resolves: 8130-3 / CoC → part record → installation history → WO → technician cert snapshot. `chainComplete: true`. |

**Pass Criteria:** Quantity cap hard-blocked on step 2. LLP override rejected on step 3. Quarantine routing on step 4. CoC installation guard on step 5. Shelf-life hard-block on step 7. Traceability chain complete on step 8.

**Fail Criteria:** LLP quantity override accepted. CoC part installs without receiving inspection. Expired shelf-life part installs. `chainComplete` false when chain is actually complete (counter-check on correct test data).

---

### Smoke-05: RTS Sign-Off Flow (All Nine Preconditions)

**Purpose:** Complete RTS sign-off flow exercising all nine preconditions of `authorizeReturnToService` and the final `closeWorkOrder` with BP-01 and BP-02 guards.

**Preconditions:**
- WO `wo_annual` of type `annual_inspection` in `pending_signoff` status.
- All task cards complete and dual-signed.
- All discrepancies dispositioned.
- No open interruptions.
- Aircraft `ac_1` with `totalTimeAirframeHours: 1234.5`. WO `aircraftTotalTimeAtOpen: 1234.5`.
- At least one `adCompliance` record in `not_complied` status for `ac_1` (overdue by 10 hours).
- One `adCompliance` record for `ac_1` that is complied and current.
- `tech_ia` holds current IA (`iaExpiryDate > now`). Recent experience `lastExercisedDate` within 24 months.
- `signatureAuthEvent_rts` issued to `tech_ia`, unconsumed, not expired.

**Action Sequence — Precondition Failures (all must throw before the success path):**

| Step | Precondition Under Test | Setup Modification | Expected Throw |
|---|---|---|---|
| 1 | PRECONDITION 7: Overdue AD | Leave overdue AD in place. Call `authorizeReturnToService`. | `RTS_AD_OVERDUE { adIds: [...] }` |
| 2 | Fix step 1: record compliance for the overdue AD via `recordAdCompliance`. Verify chain. Now call `authorizeReturnToService` with `returnToServiceStatement` of 60 chars, valid keywords. | PRECONDITION 9: statement too short | `RTS_STATEMENT_TOO_SHORT { length: 60, required: 75 }` |
| 3 | 80-char statement, no "14 CFR" or "Part 43". | PRECONDITION 9: no citation | `RTS_STATEMENT_NO_CITATION` |
| 4 | 80-char statement with "14 CFR Part 43", no "return" or "airworthy". | PRECONDITION 9: no determination | `RTS_STATEMENT_NO_DETERMINATION` |
| 5 | WO type is `major_repair`, `form337Reference` is null. | PRECONDITION: INV-25 | `RTS_337_REFERENCE_MISSING` |
| 6 | Fix step 5: `setForm337Reference` with whitespace only `"   "`. | INV-25 whitespace bypass | `RTS_337_REFERENCE_MISSING` (or equivalent) |
| 7 | `setForm337Reference` with valid reference "FAA-2026-001-337". `tech_ia_expired` has `iaExpiryDate = now - 1`. Use expired IA to call `authorizeReturnToService`. | PRECONDITION 6: IA cert expired | `IA_CERT_NOT_CURRENT` |
| 8 | Consumed auth event (consume it on a different step first). Call `authorizeReturnToService` with consumed event. | PRECONDITION: INV-05 | `AUTH_EVENT_ALREADY_CONSUMED` |
| 9 | Expiry test: auth event with `expiresAt = now - 1`. | PRECONDITION: INV-05 | `AUTH_EVENT_EXPIRED` |

**Action Sequence — Success Path (after all preconditions satisfied):**

| Step | Action | Expected State |
|---|---|---|
| 10 | All conditions met. Fresh `signatureAuthEvent_rts` for `tech_ia`. Valid ≥75-char statement with "14 CFR Part 43" and "airworthy". All ADs current. Form 337 on file (if major repair). Call `authorizeReturnToService`. | `returnToService` record created. `signatureHash` written. `iaCertificateNumber` snapshotted. Auth event consumed. `lastExercisedDate` updated on certificate. |
| 11 | Call `closeWorkOrder` with `aircraftTotalTimeAtClose: 1235.0` and `rts.aircraftHoursAtRts: 1234.5` (intentional mismatch). | Throws `WO_CLOSE_RTS_HOURS_MISMATCH { rtsHours: 1234.5, closeHours: 1235.0 }`. |
| 12 | Call `closeWorkOrder` with `aircraftTotalTimeAtClose: 1234.5` (matching RTS hours). All other guards satisfied. | WO → `closed`. `aircraft.totalTimeAirframeHours` updated. Audit entry present. |
| 13 | Re-compute SHA-256 over canonical RTS record fields. Compare to `returnToService.signatureHash`. | Hashes match. Integrity check passes. |
| 14 | Query `auditLog.by_record` for the WO. Assert minimum 1 entry with `eventType: "status_changed"`, `newValue: "closed"`. | Entry present with correct fields. |

**Pass Criteria:** All nine precondition failure paths throw correct error codes. Success path produces matching hash. WO reaches `closed`. `lastExercisedDate` updated.

**Fail Criteria:** Any precondition skipped or returning wrong error code. RTS hours mismatch accepted. Hash mismatch after close. Audit log missing close entry.

---

## Section 3: Invariant Test Cases — INV-01 through INV-25

For each invariant: the mutation(s) that enforce it, the test that catches a violation, and whether enforcement is schema-level or mutation-level. All twenty-five must pass. Not twenty-three. Not twenty-four with two "known issues." Twenty-five.

| INV | Invariant Statement | Enforcing Mutation(s) | Violation Test | Layer |
|---|---|---|---|---|
| **INV-01** | Correction records must reference a valid prior record via `corrects` field | `createCorrectionRecord` | Call with `corrects: null` → assert throws | Mutation |
| **INV-02** | `ratingsExercised` must be populated at every signing action | `completeStep`, `counterSignStep`, `reviewNAStep`, `signTaskCard` | Each with empty `ratingsExercised: []` → assert throws in all four | Mutation |
| **INV-03** | `adCompliance` requires at least one valid subject (aircraft, engine, or prop ID) | `createAdCompliance` | All three IDs null → assert throws | Mutation |
| **INV-04** | DOM must hold a current IA | `setOrganizationLeadership` | Assign technician with expired `iaExpiryDate` → assert throws | Mutation |
| **INV-05** | Each `signatureAuthEvent` is consumed exactly once | All signing mutations | (a) Already-consumed event → `AUTH_EVENT_ALREADY_CONSUMED`; (b) Expired event → `AUTH_EVENT_EXPIRED`; (c) Wrong technician → `AUTH_EVENT_IDENTITY_MISMATCH`; (d) Not found → `AUTH_EVENT_NOT_FOUND`. Run against every signing mutation. | Mutation |
| **INV-06** | `aircraftTotalTimeAtClose` must be ≥ `aircraftTotalTimeAtOpen` | `closeWorkOrder` | Submit with close TT < open TT → assert `WO_CLOSE_TT_REGRESSION`. Also verify close TT = open TT (zero-flight WO) is accepted. | Mutation |
| **INV-07** | OSP (owner-supplied parts) must reference a valid `eightOneThirtyId` | `installPart` | Install part with `isOwnerSupplied: true`, `eightOneThirtyId: null` → assert throws | Mutation |
| **INV-08** | If `adComplianceReviewed: true` on inspection close, references or notes are required | `closeInspection` | Set flag true with empty refs and empty notes → assert throws | Mutation |
| **INV-09** | Task card status is derived from its steps, never independently set | `completeStep` | All steps complete, no N/A → assert card status `"complete"`. One pending step remains → assert card status `"in_progress"`. Card status patch without step change → verify no direct card status update mutation exists (API surface test). | Mutation |
| **INV-10** | Every step sign-off creates a `taskCardSteps` document update and an `auditLog` entry | `completeStep` | After completing step → assert `taskCardSteps[stepId].status == "completed"` AND `auditLog.by_record("taskCardSteps", stepId)` has ≥1 entry with `eventType: "technician_signed"`. | Mutation |
| **INV-11** | Life-limited parts must have at least one limit field set | `createPart` | `isLifeLimited: true`, `lifeLimitHours: null`, `lifeLimitCycles: null` → assert throws | Mutation |
| **INV-12** | Parts with shelf-life limit must have a `shelfLifeLimitDate` | `createPart` | `hasShelfLifeLimit: true`, `shelfLifeLimitDate: null` → assert throws | Mutation |
| **INV-13** | Technicians with IA authorization must have an `iaExpiryDate` | `createCertificate` | `hasIaAuthorization: true`, `iaExpiryDate: null` → assert throws | Mutation |
| **INV-14** | Work order numbers are unique within an organization | `createWorkOrder` | Duplicate `workOrderNumber` in same org → assert throws. Same number in different org → assert succeeds. | Mutation |
| **INV-15** | Aircraft-customer associations are queryable via `aircraft.by_customer` index | `associateAircraftCustomer` | After association, query `by_customer(customerId)` → assert aircraft returned in result set. | Schema + Query |
| **INV-16** | Corrected discrepancies must reference a `correctiveMaintenanceRecordId` | `dispositionDiscrepancy` | `disposition: "corrected"`, no `correctiveMaintenanceRecordId` → assert throws | Mutation |
| **INV-17** | MEL deferrals must include `melDeferralDate` | `dispositionDiscrepancy` | `disposition: "deferred_mel"`, no `melDeferralDate` → assert throws | Mutation |
| **INV-18** | Aircraft total time is monotonically non-decreasing | `openWorkOrder`, `closeWorkOrder` | TT at open < aircraft last-known TT → throws. TT at close < TT at open → throws. TT at close = TT at open → accepted (zero-flight). | Mutation |
| **INV-19** | Closed work orders must record `closedAt`, `closedByUserId`, `closedByTechnicianId` | `closeWorkOrder` | After successful close, fetch WO and assert all three fields non-null. Verify no close path exists without all three. | Mutation |
| **INV-20** | RTS statement is required and non-empty on `returnToService` creation | `createMaintenanceRecord`, `authorizeReturnToService` | `returnedToService: true`, empty statement → assert throws. Also: statement length ≥ 75, contains "14 CFR" or "Part 43", contains "return" or "airworthy" (RQ-06 extension). | Mutation |
| **INV-21** | `taskCardStepCounterSignature` may only be created when: (a) step is `completed`, (b) `signatureAuthEventId` unconsumed/unexpired/identity-matched, (c) no prior record for same `(stepId, counterSignType)` pair | `counterSignStep` | (a) Step in `pending` → throws. (b) Consumed event → throws `AUTH_EVENT_ALREADY_CONSUMED`. (c) Duplicate call (same type + step) → throws `TC_COUNTER_SIGN_ALREADY_EXISTS` — verified via DB query, not in-memory check. | Mutation |
| **INV-22** | Counter-signer's cert number must be active; for `ia_inspection` type, IA must be current (`iaExpiryDate ≥ now`); `counterSignRatingsExercised` must include "ia" for IA type | `counterSignStep` | (a) `ia_inspection` with expired IA → `IA_CERT_NOT_CURRENT`. (b) `ia_inspection` with `ratingsExercised` not including "ia" → throws (INV-02 extension). (c) `counterSignedCertNumber` not matching active cert → throws. | Mutation |
| **INV-23a** | If `deferralType` set on interruption, `deferralDiscrepancyId` must also be set | `interruptStep` | `deferralType: "mel"`, `deferralDiscrepancyId: null` → assert throws INV-23a | Mutation |
| **INV-23b** | `closeWorkOrder` must treat any `taskCardInterruptions` record with `resumedAt == null` as a hard block | `closeWorkOrder`, `getCloseReadiness` | One open interruption → `WO_CLOSE_OPEN_INTERRUPTIONS` with correct count in payload. `getCloseReadiness` → `canClose: false`, `blockers[]` contains interruption detail. After resumeStep → interrupt closed → `closeWorkOrder` no longer blocked by this guard. | Mutation |
| **INV-23c** | `resumedAt` must be strictly > `interruptedAt` when set | `resumeStep` | Submit `resumedAt = interruptedAt` (or `< interruptedAt` in test override mode) → assert throws. After success, assert `resumedAt > interruptedAt` holds on the record. Also assert both `resumedAt` AND `resumedByTechnicianId` are set atomically — not one without the other. | Mutation |
| **INV-24** | `adCompliance` task card with non-null `adComplianceId` must reference an applicable record scoped to the card's `aircraftId` | `createTaskCard`, `addTaskCard` | (a) `adComplianceId` references record for different aircraft → throws. (b) `adComplianceId` references `applicable: false` record → throws. (c) `adComplianceId: null` on `ad_compliance` card → succeeds + warn log (no throw). | Mutation |
| **INV-25** | For `workOrderType` in major_repair/major_alteration/field_approval, `form337Reference` must be non-null/non-empty at RTS time; `setForm337Reference` rejects empty strings | `authorizeReturnToService`, `setForm337Reference` | (a) Major repair WO, `form337Reference: null` → `RTS_337_REFERENCE_MISSING`. (b) `setForm337Reference("")` → throws. (c) `setForm337Reference("   ")` (whitespace) → throws (trim-then-length check). (d) `workOrderType: "routine"`, no 337 → RTS proceeds without 337 check. | Mutation |

---

## Section 4: Regression Tests for Phase 2 Blockers

### 4.1 BP-01 and BP-02 — Marcus-Flagged Close Guards

**REG-BP-01: Open Interruptions Block `closeWorkOrder`**

```
Preconditions:
  WO in `pending_signoff`. All other close preconditions satisfied EXCEPT:
  taskCardInterruptions record exists for this WO with resumedAt == null.

Action:
  Call closeWorkOrder with all required args.

Assert-Pass:
  Throws ConvexError({ code: "WO_CLOSE_OPEN_INTERRUPTIONS" }).
  Error payload includes:
    - count: N (must equal actual number of open records)
    - interruptionIds: [id_1, id_2, ...] (correct IDs)
  WO status unchanged (still "pending_signoff").
  
Assert-Fail:
  Call succeeds. Error thrown but with wrong code. Count in payload is wrong.
  WO transitions despite open interruption.

Additional sub-test (REG-BP-01b):
  Two open interruptions. Assert count == 2. Assert both IDs in payload.
  Resume one. Call closeWorkOrder again. Assert still throws with count == 1.
  Resume second. Call closeWorkOrder again. Assert BP-01 guard does NOT fire.
```

**REG-BP-02: RTS Hours Mismatch Blocks `closeWorkOrder`**

```
Preconditions:
  RTS record exists with aircraftHoursAtRts: 1000.0.
  Calling closeWorkOrder with aircraftTotalTimeAtClose: 1001.5.

Action:
  Call closeWorkOrder.

Assert-Pass:
  Throws ConvexError({ code: "WO_CLOSE_RTS_HOURS_MISMATCH" }).
  Payload contains: { rtsHours: 1000.0, closeHours: 1001.5 }.
  This is a throw, not a warning. If it logs and continues, it fails.

Assert-Fail:
  Call succeeds. Warning logged instead of throw. Wrong hours in payload.

Additional sub-test (REG-BP-02b):
  aircraftHoursAtRts == aircraftTotalTimeAtClose == 1000.0 (exact match).
  Assert BP-02 guard does NOT fire. Close proceeds.
```

### 4.2 UM-01 through UM-08 — Previously Unimplemented Mutations

**REG-UM-01: `reviewNAStep` — Exists and Guards Correctly**

```
Verify mutation exists: Call with invalid args → ConvexError (not "function not found").
Accept test: IA-required step in "na" status, valid IA, valid authEvent, reviewDecision="concur_na"
  → step gains naReviewedByIaId, naReviewDecision. Card transitions to "complete" if last NA.
Reject tests:
  (a) Caller lacks IA → IA_CERT_NOT_CURRENT
  (b) Caller IA expired by 1 day → IA_CERT_NOT_CURRENT (March 31 rule, no grace)
  (c) Step not in "na" status → TC_STEP_NOT_NA
  (d) Step has signOffRequiresIa == false → TC_STEP_IA_REVIEW_NOT_REQUIRED
  (e) reviewNotes empty → TC_REVIEW_NOTES_REQUIRED
  (f) reviewDecision="reject_na" → step reverts to "pending", card to "in_progress"
```

**REG-UM-02: `counterSignStep` — Exists and Guards Correctly**

```
Verify: mutation exists.
Accept test: completed step, ia_inspection type, current IA caller, valid authEvent, 
  scopeStatement ≥30 chars → taskCardStepCounterSignatures record created with snapshot fields.
Reject tests:
  (a) Step in "pending" status → TC_STEP_NOT_SIGNED_BY_PRIMARY
  (b) Duplicate call → TC_COUNTER_SIGN_ALREADY_EXISTS (DB query, not in-memory)
  (c) counterSignType="dual_amt", caller is same technician as primary signer → TC_COUNTER_SIGN_SELF_DUAL_AMT
  (d) scopeStatement empty → TC_SCOPE_STATEMENT_REQUIRED
  (e) All four Section 5 auth event checks (not-found, consumed, expired, mismatch)
```

**REG-UM-03: `interruptStep` / `resumeStep` — Exist and Guard Correctly**

```
interruptStep:
  Verify: mutation exists.
  Accept: pending step, all required fields populated → interruption record created.
  Reject: (a) safetyPreservationTaken empty → TC_INTERRUPTION_FIELDS_REQUIRED
           (b) completed step → TC_STEP_NOT_INTERRUPTIBLE
           (c) deferralType set, no deferralDiscrepancyId → INV-23a throws
           (d) step already has open interruption → TC_STEP_ALREADY_INTERRUPTED

resumeStep:
  Verify: mutation exists.
  Accept: open interruption, resumptionNotes provided → resumedAt set, step remains "pending"
  Reject: (a) already resumed interruption → TC_INTERRUPTION_ALREADY_RESUMED
           (b) resumptionNotes empty → TC_RESUMPTION_NOTES_REQUIRED
  Atomicity: assert both resumedAt AND resumedByTechnicianId are set; neither without the other.
```

**REG-UM-04: `voidTaskCard` — Exists and Guards Correctly**

```
Verify: mutation exists.
Accept: card in "not_started", no signed steps → card voided, steps untouched.
Reject: (a) card has 1 completed step → TC_CARD_HAS_SIGNED_STEPS { signedStepCount: 1 }
         Guard uses DB query for completed steps, not denormalized counter.
        (b) card in "complete" status → TC_CARD_NOT_VOIDABLE
        (c) voidReason empty → TC_VOID_REASON_REQUIRED
        (d) parent WO in "closed" status → TC_VOID_WO_NOT_ACTIVE
```

**REG-UM-05: `placeWorkOrderOnHold` / `releaseWorkOrderHold` — Exist and State Machine Correct**

```
placeWorkOrderOnHold:
  Verify: mutation exists.
  Accept: WO in "in_progress" → transitions to "on_hold". onHoldType written.
  Reject: (a) WO in "draft" → WO_INVALID_STATE_FOR_HOLD
           (b) holdReason empty → WO_HOLD_REASON_REQUIRED

releaseWorkOrderHold:
  Verify: mutation exists.
  Accept: WO in "on_hold", caller is supervisor → transitions to "in_progress". 
    onHoldReason cleared on release (stale hold metadata must not persist).
  Reject: (a) WO not in "on_hold" → WO_NOT_ON_HOLD
           (b) Caller role < supervisor → auth error
```

**REG-UM-06: `submitForInspection` / `flagOpenDiscrepancies` — Exist and Guard Correctly**

```
submitForInspection:
  Verify: mutation exists.
  Accept: all task cards in terminal status, no open interruptions → WO → "pending_inspection"
  Reject: (a) any task card in "not_started" → WO_TASK_CARDS_INCOMPLETE with blocking card IDs
           (b) open interruption present → WO_OPEN_INTERRUPTIONS_BLOCK

flagOpenDiscrepancies:
  Verify: mutation exists.
  Accept: at least one open discrepancy → WO → "open_discrepancies"
  Reject: no open discrepancies → WO_NO_OPEN_DISCREPANCIES
```

**REG-UM-07: `cancelWorkOrder` — Exists and Blocks Correctly at Inspection Stages**

```
Verify: mutation exists.
Accept: WO in "in_progress" → transitions to "cancelled". Cancellation reason written.
Reject: (a) WO in "pending_inspection" → WO_CANCEL_IN_PROGRESS_BLOCKED
         (b) WO in "pending_signoff" → WO_CANCEL_IN_PROGRESS_BLOCKED
         (c) WO in "closed" → WO_ALREADY_TERMINAL
         (d) cancellationReason empty → WO_CANCELLATION_REASON_REQUIRED
Immutability: signed maintenance records linked to the WO must remain intact after cancel.
  Assert: after cancelWorkOrder, maintenanceRecords linked to WO are still retrievable.
```

**REG-UM-08: `createAdCompliance` — Exists, Non-Vacuous, Guards Correctly**

```
Verify: mutation exists (Phase 3 exit blocker per Marcus).
Accept: valid AD with aircraftId, applicable fields, valid callerTechnicianId → record created.
Vacuous-truth prevention:
  closeInspection for annual_inspection WO where adCompliance query returns empty set:
  → Must throw, not pass vacuously. Assert "zero AD records" is a hard block with message
    requiring IA attestation or explicit DOM acknowledgment.
Reject:
  (a) All three subject IDs null → throws (INV-03)
  (b) adCompliance.applicable: false on record cited by an ad_compliance task card → INV-24 throws
  (c) createAdCompliance for turbine aircraft without cycle tracking → AD_COMPLIANCE_CYCLES_REQUIRED
    (only if complianceType includes cycles)
```

---

## Section 5: Marcus's Three Phase 3 Exit Blockers

### 5.1 `createAdCompliance` — Existence and Vacuous-Truth Prevention

Two separate things to test. Do not conflate them.

**Test 5.1-A: Mutation exists and creates valid records.**
```
Call createAdCompliance with valid args: adIdentifier, aircraftId, applicable: true,
  complianceType: "calendar", initialComplianceDays: 365, recurringIntervalDays: 365.
Assert: adCompliance record created. applicable: true. status: "not_complied".
  complianceHistory: []. Audit log entry present.
Fail: mutation not found. Record created with incorrect initial status. No audit entry.
```

**Test 5.1-B: Vacuous-truth prevention — zero AD records blocks annual inspection close.**
```
Setup: annual_inspection WO with no adCompliance records for the aircraft (zero records).
  All other close preconditions satisfied.
Action: Call closeInspection (or the annual-inspection-specific close path).
Assert: Throws. Error message requires IA to provide explicit "no ADs apply" attestation
  or DOM acknowledgment. Does NOT silently pass.
Fail: Call succeeds. Zero AD records treated as "all clear." This is a compliance failure
  that allows aircraft with unknown AD status to be returned to service.
```

**What I can't fully test without a UI:** The DOM authorization workflow for the zero-AD attestation. I can test that the mutation throws when given no attestation. I can test that the mutation accepts a valid attestation record. I cannot test the full wizard flow — that's FE-01 territory.

### 5.2 Multi-Inspector Sign-Off UX Completeness

**What I can test from the mutation layer (without UI):**

**Test 5.2-A: Three-technician annual inspection signature chain.**
```
Setup: annual inspection WO. Task card with airframe steps (signed by tech_airframe),
  powerplant steps (signed by tech_powerplant), both A&P. IA-required step signed by tech_amt,
  counter-signed by tech_ia.
Action: Call signTaskCard with tech_ia (card-level IA sign-off).
Assert: Card reaches signed terminal state. All three technicians' cert numbers appear in
  the audit trail for this card. signTaskCard does NOT aggregate all signing under tech_ia alone.
Fail: Card signs with only tech_ia on record. tech_airframe and tech_powerplant step-level
  sign-offs are not represented in the card-level audit trail.
```

**Test 5.2-B: `maintenanceRecords.technicians[]` populated with all signers.**
```
After card completion and maintenance record creation:
  Assert maintenanceRecords.technicians[] contains all three technician IDs.
  Assert each technician entry has their certificate number, not a shared IA cert.
Fail: Only the IA's certificate on the maintenance record. This is a 43.9 violation.
```

**What I cannot test without a UI:** The wizard presenting three separate signature slots. The UI preventing the IA from signing fields meant for the A&P. Chloe owns FE-01. My mutation tests confirm the data model supports it. If the UI shortcuts around it, that's a UI regression, not a mutation failure — but I'm filing it as a blocker regardless of which layer it's on.

### 5.3 `approvedDataReference` AD Citation Check in `recordAdCompliance`

**Test 5.3-A: Missing AD citation in maintenance record blocks compliance recording.**
```
Setup: adCompliance record for AD 2022-14-08. maintenanceRecord exists referencing
  this WO, but approvedDataReference does NOT contain "2022-14-08" or "AD 2022-14-08".
Action: Call recordAdCompliance referencing this maintenance record.
Assert: Throws AD_COMPLIANCE_RECORD_NO_AD_CITATION.
  The compliance record is NOT created.
Fail: recordAdCompliance succeeds. AD compliance recorded against a maintenance record
  that does not cite the AD. This creates false compliance evidence.
```

**Test 5.3-B: Valid AD citation in maintenance record allows compliance recording.**
```
Setup: Same, but approvedDataReference contains "AD 2022-14-08, paragraph (f)".
Action: Call recordAdCompliance.
Assert: adCompliance record updated with new complianceHistory entry.
  Compliance entry includes maintenanceRecordId as evidence link.
  adCompliance.status updates appropriately (e.g., "complied").
Fail: Throws despite valid citation. Or: complianceHistory entry missing maintenanceRecordId.
```

**Test 5.3-C: Section 5 auth event consumption in `recordAdCompliance`.**
```
All four auth event failure modes: not-found, consumed, expired, identity mismatch.
Assert: Each throws the correct Section 5 error code.
Fail: Any recordAdCompliance call accepts an invalid, consumed, or expired auth event.
This is a regulatory defect, not a product bug.
```

---

## Section 6: Phase 3 Exit Criteria Sign-Off

*What must be true before I stamp Phase 3 DONE. Every item is binary — either it is true or it is not. No partial credit. No "mostly done." No "we'll fix it in Phase 4."*

**1. Auth guard present and tested on every Phase 3 mutation.**
Every mutation in mutation-implementation.md has `requireOrgMembership` or `requireOrgContext` as its first executable line. I will call each mutation with no session. I will call each mutation with a session from a different org pointing at the other org's data. Both calls must fail with the correct error. One failure = all of Phase 3 on hold.

**2. `orgId` is derived from JWT in every mutation. No mutation accepts `organizationId` as a client arg to determine access scope.**
I will find the mutation argument list for every protected Phase 3 mutation. If any of them accept `organizationId` and use it directly to scope data access without also verifying against the JWT-derived orgId, that mutation is a P0 data breach and Phase 3 does not close.

**3. All fifteen items in mutation-implementation.md Section 7 (Cilla's Implementation Checklist) pass.**
CHECK 1 through CHECK 15. Every one. I do not "mostly pass" a compliance checklist.

**4. INV-01 through INV-25 tests all green.**
25 invariants. 25 passing tests. Verified against a live Convex dev deployment, not a unit test mock.

**5. All five smoke test paths pass end-to-end with realistic seed data.**
Smoke-01 through Smoke-05 on the staging deployment with the standard seed fixture. Pass means every step in every table above produces the expected state. Not "we skipped the expiry test because it's hard to set up." Every step.

**6. BP-01 guard verified: `closeWorkOrder` throws `WO_CLOSE_OPEN_INTERRUPTIONS` with correct count and IDs.**
Not just "it throws." The count in the error payload is correct. The IDs are correct. I am checking the payload.

**7. BP-02 guard verified: `closeWorkOrder` throws `WO_CLOSE_RTS_HOURS_MISMATCH` on any mismatch.**
A warning log does not satisfy this. A throw does. If the implementation produces a warn log instead of a throw: BP-02 is not implemented.

**8. Section 5 six-check signatureAuthEvent consumption verified in every signing mutation.**
The four test cases (not-found, consumed, expired, identity mismatch) pass for: `completeStep`, `reviewNAStep`, `counterSignStep`, `signTaskCard`, `closeWorkOrder`, `authorizeReturnToService`, `recordAdCompliance`. That is seven mutations × four test cases = 28 test assertions. All 28 pass.

**9. `createAdCompliance` mutation exists, creates valid records, and vacuous-truth prevention blocks annual close with zero AD records.**
Both Test 5.1-A and Test 5.1-B pass. If `createAdCompliance` does not exist, Phase 3 does not close — we have an entry point to the AD compliance chain with no gate.

**10. `approvedDataReference` AD citation check in `recordAdCompliance` blocks compliance recording without AD citation in maintenance record.**
Test 5.3-A and Test 5.3-B both pass. This is Marcus's condition, not mine. But I am the one running the test and I am the one signing off.

**11. RQ-06 three-assertion RTS statement validation returns three distinct error codes.**
Not one. Not two. Three separate error codes (`RTS_STATEMENT_TOO_SHORT`, `RTS_STATEMENT_NO_CITATION`, `RTS_STATEMENT_NO_DETERMINATION`). Each tested independently (CHECK 8 in mutation-implementation.md Section 7). The frontend error handler maps all three to distinct user messages.

**12. INV-25 (Form 337) whitespace bypass test passes.**
`setForm337Reference("   ")` throws. Not just `setForm337Reference("")`. The trim-then-length check is verified. Whitespace is not a valid 337 reference and the system knows it.

**13. `counterSignStep` duplicate guard uses a DB query, not an in-memory check.**
I will verify this by inspecting the implementation. If the guard queries `taskCardStepCounterSignatures.by_type_step` before inserting, it passes. If it relies on any in-memory state or caches, it fails — race condition vulnerability in a regulatory system is not acceptable.

**14. `resumeStep` sets both `resumedAt` and `resumedByTechnicianId` atomically, and step status remains `"pending"` after resume.**
Verified per INV-23c sub-tests. Half-open resumption records are a compliance defect.

**15. Audit log entry present and correct for every Phase 3 mutation on the success path.**
For each of the 12+ Phase 3 mutations: after a successful execution, query `auditLog.by_record` for the affected record and assert at minimum one entry with correct `eventType`, `tableName`, `recordId`, `userId`. A mutation that succeeds without an audit entry is undeployable in a regulated environment. Unconditionally.

---

*Signed,*
*Cilla Oduya — QA Lead, Athelon*
*2026-02-22*

*These are the conditions. I don't negotiate on regulatory compliance checks. Devraj knows where to find me when the implementations are ready.*
