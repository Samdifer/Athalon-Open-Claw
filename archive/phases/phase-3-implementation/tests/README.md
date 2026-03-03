# Phase 3 Test Plan — Cilla Oduya

**Date:** 2026-02-22  
**Phase:** 3 — Integration & Smoke Testing  
**Status:** Test matrix written. Pending Devraj's mutation implementations.  
**My sign-off on this phase requires everything in Section 5 from Devraj. Non-negotiable.**

---

## 1. What Is Covered

### 1.1 Work Order Engine (`workOrders.test.ts`)

| Test ID | Invariant / Guard | Description |
|---|---|---|
| TC-WO-HP-01 | Happy path | Full lifecycle: create → open → addTaskCard → completeTaskCard → close. Verifies all final state fields. |
| TC-WO-HP-02 | openWorkOrder | Draft → open transition, TT at open captured. |
| TC-WO-INV-01 | Open task card blocks close | `closeWorkOrder` throws when a task card is `in_progress`. |
| TC-WO-INV-02 | Close after all cards complete | `closeWorkOrder` succeeds when all task cards are `complete`. |
| TC-WO-INV-03 | Concurrent WO guard | `openWorkOrder` throws without override on same aircraft. |
| TC-WO-INV-04 | Concurrent WO override | Override + reason allows concurrent WO. |
| TC-WO-INV-05 | INV-06 / INV-18: monotonic TT | `closeWorkOrder` throws when atClose < atOpen. |
| TC-WO-INV-06 | INV-06 boundary: atClose == atOpen | Zero-flight-time maintenance is valid — `>=` not `>`. |
| TC-WO-INV-07 | INV-18 at open | `openWorkOrder` throws when TT at open < aircraft last known TT. |
| TC-WO-VOID-01 | Void guard: signed records | `voidWorkOrder` throws when a signed maintenance record exists. |
| TC-WO-VOID-02 | Void success on draft | Draft WO void works; sets all three required void fields. |
| TC-WO-VOID-03 | Void blocked on in_progress | `voidWorkOrder` throws on in-progress WO. |
| TC-WO-AUTH-01 | Non-existent org | `createWorkOrder` throws on fake organizationId. |
| TC-WO-AUTH-02 | Inactive org | `createWorkOrder` throws when org is `active: false`. |
| TC-WO-AUTH-03 | INV-14: duplicate WO number | Second WO with same number in same org throws. |
| TC-WO-AUTH-04 | INV-14: cross-org same number | Same WO number in different orgs is allowed. |

**Coverage gaps I'm aware of and accepting for Phase 3:**
- `placeWorkOrderOnHold` / `releaseWorkOrderHold` — BACK-P2-03, not implemented yet
- `submitForInspection` / `flagOpenDiscrepancies` — BACK-P2-05, not implemented yet
- `cancelWorkOrder` — out of scope per spec
- DOM authorization path in `closeWorkOrder` (Part 145 org) — needs `part145Ratings` enforcement
- Aircraft status `destroyed`/`sold` blocking `createWorkOrder` — the test scaffold skips this; add to v2 matrix

---

### 1.2 Task Card Execution (`taskCards.test.ts`)

| Test ID | Invariant / Guard | Description |
|---|---|---|
| TC-TC-STEP-01 | INV-05: auth event required | `completeStep` throws without signatureAuthEventId. |
| TC-TC-STEP-02 | INV-05: expired event | `completeStep` throws when expiresAt < now. |
| TC-TC-CONS-01 | INV-05: single-consumption | Consumed auth event cannot sign a second step. |
| TC-TC-CONS-02 | INV-05: identity check | Auth event issued to Tech A cannot be used by Tech B. |
| TC-TC-SIGN-01 | TC-TC-15: pending steps block sign-off | `signTaskCard` throws when a step is still pending. |
| TC-TC-SIGN-02 | signTaskCard happy path | Card with all steps complete: signTaskCard succeeds, audit log written. |
| TC-TC-IA-01 | IA currency: A&P without IA | IA-required step throws when signer has no IA. |
| TC-TC-IA-02 | IA currency: expired IA | IA-required step throws when signer's IA is expired. |
| TC-TC-IA-03 | IA currency: current IA | IA-required step succeeds with current IA. |
| TC-TC-CONCURRENT-01 | QA-002 resolution | Two techs sign different steps; both succeed; no write conflict. |
| TC-TC-CONCURRENT-02 | Counter accuracy | Denormalized counters stay in sync after concurrent sign-offs. |

**Coverage gaps I'm aware of and accepting for Phase 3:**
- `reviewNAStep` mutation — BACK-TC-04, not implemented. Tests for `incomplete_na_steps` resolution path are written in comments but cannot be executed until UM-01 is delivered.
- `counterSignStep` (dual sign-off) — BACK-TC-05. The `signTaskCard` IA dual sign-off path cannot be fully tested until the `taskCardStepCounterSignatures` table (SE-01) exists.
- `returnTaskCard` — I've written TC-TC-10 in the spec comments (TC-TC-10: return card → step reverts to pending, prior sign-off in auditLog) but not as executable test code because the mutation is unimplemented (UM-04 is medium priority but I want it before final sign-off).
- `interruptStep` / `resumeStep` — BACK-TC-06. TC-TC-16 and TC-TC-17 from the spec are not covered here.
- `voidTaskCard` — UM-04, medium priority. No test.
- INV-09 (incomplete_na_steps card status when IA-required step is N/A'd) — I have the test skeleton in TC-TC-CONCURRENT-02 but the `incomplete_na_steps` path requires `reviewNAStep` to resolve. Devraj must deliver UM-01 for this path to be testable end-to-end.

---

### 1.3 AD Compliance (`adCompliance.test.ts`)

| Test ID | Invariant / Guard | Description |
|---|---|---|
| TC-AD-DUE-01 | Calendar due-date arithmetic | nextDueDate = lastCompliance + days * 86400000. Not overdue before limit. |
| TC-AD-DUE-02 | Calendar overdue detection | nextDueDate = yesterday → AD is overdue in checkAdDueForAircraft. |
| TC-AD-DUE-03 | Hours due-date arithmetic | nextDueHours = lastComplianceHours + recurringIntervalHours. Not overdue before limit. |
| TC-AD-DUE-04 | Hours overdue at boundary | currentHours >= nextDueHours → overdue (boundary: exactly equal is overdue). |
| TC-AD-DUE-05 | Dual limit (calendar OR hours) | AD with both limits: overdue if EITHER exceeded. |
| TC-AD-CLOSE-01 | Annual inspection blocked by overdue AD | closeWorkOrder throws on annual inspection with overdue calendar AD. |
| TC-AD-CLOSE-02 | Annual inspection succeeds, all ADs current | closeWorkOrder succeeds when no ADs are overdue. |
| TC-AD-CLOSE-03 | Routine WO not blocked by overdue AD | AD check scoped to annual/100hr only (RTS §2.2 PRECONDITION 7). |
| TC-AD-SUPER-01 | Supersession creates pending_determination | supersedAd creates new pending_determination for each aircraft. |
| TC-AD-SUPER-02 | Unreviewed superseded AD blocks annual close | pending_determination AD blocks RTS on inspection WOs. |
| TC-AD-NA-01 | markAdNotApplicable: A&P rejected | Plain A&P without IA cannot mark an AD N/A. |
| TC-AD-NA-02 | markAdNotApplicable: current IA succeeds | IA can determine AD is not applicable. |
| TC-AD-NA-03 | markAdNotApplicable: empty reason rejected | Reason is required — empty string throws. |
| TC-AD-NA-04 | markAdNotApplicable: terminal status rejected | Cannot re-determine an already-complied AD. |
| TC-AD-NA-05 | INV-03: no target IDs | createAdCompliance throws when aircraftId, engineId, and partId are all null. |
| TC-AD-RECORD-01 | Append-only compliance history | recordAdCompliance appends entry; nextDueDate recomputed. |

**Coverage gaps I'm aware of and accepting for Phase 3:**
- Ferry permit AD exception path (BP-08, Marcus + Rafael) — no test, policy not yet decided.
- FAA DRS feed integration (BP-07) — not in scope for unit tests; requires a mock DRS endpoint.
- `checkAdDueForAircraft` edge cases: aircraft with no applicable ADs (should return empty overdueAds); aircraft with one-time AD already complied (should not appear overdue).
- 100hr inspection overdue AD block — I only tested annual. The logic is identical (PRECONDITION 7 covers both types), but I want a dedicated 100hr test added to the matrix before Marcus signs off.
- Engine/part-specific ADs (adCompliance.engineId, adCompliance.partId variants of INV-03) — not covered. Engine TBO and life-limited part ADs need their own suite.

---

## 2. Test Data Setup Notes

### 2.1 Schema alignment

All test fixtures insert directly into the Convex database via `t.run(async (ctx) => ctx.db.insert(...))`. This bypasses mutation-layer validation intentionally — the fixture helpers set up known-good state for the "arrange" phase. Mutation-layer behavior is tested by calling the actual mutation functions.

**Critical:** test data must match the **FROZEN schema v2** field shapes. Any fixture field name mismatch will cause a runtime insert error, not a test framework error. If a test fails with `"field X is not defined in schema"`, it means a fixture helper uses a field name from v1 or a draft v2.1 extension that isn't in the frozen schema yet.

### 2.2 signatureAuthEvent setup

Every test that exercises a signing mutation needs a valid auth event. The `seedAuthEvent` helper creates one with:
- `consumed: false`
- `expiresAt: NOW + 4 minutes` (inside 5-minute TTL)
- `technicianId` matching the technician passed in

The `expired: true` option sets `expiresAt: NOW - 1000` (one second in the past).
The `consumed: true` option sets `consumed: true` and `consumedAt: NOW - 5000`.

**Do not reuse an auth event across multiple signing tests in the same test function.** The first signing call will consume it. Each step/card sign-off needs its own fresh auth event.

### 2.3 RTS record seeding

`closeWorkOrder` requires a `returnToService` record to already exist (PRECONDITION 3 in the RTS flow). The `seedRtsRecord` helper creates this directly. In real usage, this record is created by `authorizeReturnToService` before `closeWorkOrder` is called — but for testing `closeWorkOrder`'s own guards (TT monotonicity, open task cards, etc.), we seed the RTS record and close auth event independently so we can isolate which guard we're testing.

### 2.4 Work order state transitions

The state machine has transitions (`placeOnHold`, `submitForInspection`, `flagOpenDiscrepancies`) that are not yet implemented (BACK-P2-03, BACK-P2-05). To test `closeWorkOrder` without those transitions existing, tests use `t.run(async (ctx) => ctx.db.patch(workOrderId, { status: "pending_signoff" }))` to seed the target status directly.

**This is NOT a test quality compromise.** We are testing `closeWorkOrder`'s own preconditions, not the state machine transitions that lead to it. The transition tests will be added when the transition mutations are implemented.

### 2.5 Certificate fixture details

- **A&P without IA:** `hasIaAuthorization: false`, no `iaExpiryDate`
- **Current IA:** `hasIaAuthorization: true`, `iaExpiryDate: next March 31 at 23:59:59`
- **Expired IA:** `hasIaAuthorization: true`, `iaExpiryDate: two years ago` (patched after seeding to guarantee it's in the past regardless of test run date)

The March 31 expiry rule (per signoff-rts-flow.md §1.3) means any test run between April 1 and December 31 would find a `new Date(currentYear, 2, 31)` value in the past. Tests use `currentYear + 1` for current IAs and force an explicit past timestamp for expired IAs to be date-safe.

### 2.6 AD compliance record population

AD records are seeded directly for due-date tests because `createAdCompliance` (UM-08) is not yet implemented as a full mutation. Once Devraj delivers the createAdCompliance mutation, the fixtures should migrate to use it. The direct inserts use valid schema field shapes per convex-schema-v2.md.

---

## 3. Risk Areas

### 3.1 CRITICAL: closeWorkOrder AD check scope

`closeWorkOrder` must check overdue ADs only for `annual_inspection` and `100hr_inspection` work orders. If Devraj implements the AD check globally (for all WO types), routine maintenance becomes impossible while any AD is overdue. **TC-AD-CLOSE-03 will catch this regression.**

### 3.2 HIGH: signatureAuthEvent consumption atomicity

The six-step auth event verification + consumption must happen atomically in the same Convex transaction. If the consume write (`ctx.db.patch(authEventId, { consumed: true })`) and the step update (`ctx.db.patch(stepId, { status: "completed" })`) are in separate transactions, a server crash between them leaves the step unsigned but the auth event consumed — or vice versa. Convex's mutation atomicity guarantee prevents this, but **TC-TC-CONS-01 would surface any implementation that breaks this into two mutations.**

### 3.3 HIGH: aircraft TT monotonicity at openWorkOrder vs. closeWorkOrder

There are two separate TT monotonicity checks:
1. `openWorkOrder`: aircraftTotalTimeAtOpen >= aircraft.totalTimeAirframeHours (last known)
2. `closeWorkOrder`: aircraftTotalTimeAtClose >= aircraftTotalTimeAtOpen (at open)

These are different comparisons with different reference values. An implementation that applies check #1 to both mutations would reject valid closes where the aircraft hasn't moved. An implementation that applies check #2 to both mutations would fail to catch a below-known-TT open. **TC-WO-INV-05 through TC-WO-INV-07 cover both.**

### 3.4 HIGH: denormalized counter drift (completedStepCount, naStepCount)

The task card's `completedStepCount` and `naStepCount` are denormalized from `taskCardSteps`. If the recount logic in `completeStep` uses a filter that misses recently-written rows (caching, consistency delay), the counters will drift. Since the card status is derived from these counters, drift can cause a card to appear complete when it isn't — blocking `closeWorkOrder` in the wrong direction or allowing it through prematurely. **TC-TC-CONCURRENT-02 specifically catches counter drift after multiple sequential writes.**

### 3.5 MEDIUM: calendar-vs-hours AD comparison units

The recurring AD due-date arithmetic mixes milliseconds (calendar intervals stored in epoch ms) with decimal hours (hours-based intervals stored as float). An implementation that applies millisecond arithmetic to the hours comparison (`currentHours >= nextDueHours * 86400000`) would cause all hours-based ADs to appear not overdue forever. **TC-AD-DUE-03 and TC-AD-DUE-04 cover this specifically.**

### 3.6 MEDIUM: concurrent WO override flag validation

The concurrent WO override path requires BOTH `concurrentWorkOrderOverrideAcknowledged: true` AND a non-empty `concurrentWorkOrderReason`. An implementation that checks only the boolean flag (allowing an empty reason) passes a guard that Marcus explicitly called out as requiring documented justification. **TC-WO-INV-04 verifies both fields are required.**

### 3.7 LOW: INV-14 cross-org uniqueness scope

A naive implementation of the WO number uniqueness check might query without filtering by `organizationId`, rejecting WO numbers that are unique within an org but happen to collide with a different org's WO. **TC-WO-AUTH-04 catches this.**

---

## 4. What Is NOT Covered (Formal Gap Register)

| Gap | Reason | Owner | Phase |
|---|---|---|---|
| `placeWorkOrderOnHold` / `releaseWorkOrderHold` | Mutation not implemented (UM-05 / BACK-P2-03) | Devraj | Phase 3.1 |
| `submitForInspection` | Not implemented (UM-06 / BACK-P2-05) | Devraj | Phase 3.1 |
| `flagOpenDiscrepancies` | Not implemented (UM-06 / BACK-P2-05) | Devraj | Phase 3.1 |
| `cancelWorkOrder` | Out of Phase 2 scope per spec | Rafael | Phase 4 backlog |
| `reviewNAStep` | Not implemented (UM-01 / BACK-TC-04) — blocks incomplete_na_steps resolution testing | Devraj | Phase 3.1 |
| `counterSignStep` / dual sign-off | Not implemented (UM-02 / BACK-TC-05); requires SE-01 table | Devraj | Phase 3.1 |
| `taskCardStepCounterSignatures` table | Not in frozen schema (SE-01) | Devraj + Cilla | Phase 3 Day 2 |
| `taskCardInterruptions` table | Not in frozen schema (SE-02) | Devraj + Cilla | Phase 3 Day 2 |
| `interruptStep` / `resumeStep` | Not implemented (UM-03 / BACK-TC-06) | Devraj | Phase 3.1 |
| Open interruptions blocking WO close | BP-01 — Marcus-flagged, not yet guarded in closeWorkOrder | Devraj | Phase 3 Day 5 |
| `returnTaskCard` step revert | UM-04 — medium priority but I want it for annual workflows | Devraj | Phase 3.1 |
| `voidTaskCard` | UM-04, medium priority | Devraj | Phase 3.1 |
| Form 337 reference field (major repair/alteration) | BP-05 — field not in schema (OI-02) | Devraj | Phase 3.1 |
| 100hr inspection overdue AD block | Equivalent logic to annual but needs its own test case | Cilla | Phase 3.1 |
| Engine-specific ADs (engineId on adCompliance) | Engine TBO and variant compliance not yet in test matrix | Cilla + Marcus | Phase 3.1 |
| Part-specific AD compliance (partId on adCompliance) | Life-limited part ADs require parts module integration | Cilla + Nadia | Phase 3.1 |
| Ferry permit AD exception path | BP-08 — policy decision pending (Marcus + Rafael) | Marcus | After RQ resolution |
| FAA DRS integration (BP-07) | Requires mock endpoint, not a unit test concern | Devraj + Marcus | Phase 3.1 |
| RBAC enforcement (who can call what mutations) | Clerk/Convex auth layer — Jonas's responsibility | Jonas | Phase 3 Day 3 |
| `authorizeReturnToService` all 9 preconditions | Needs full RTS mutation implemented — currently only testing via closeWorkOrder's subset of the same guards | Devraj | Phase 3 |
| `createMaintenanceRecord` signing (INV-20) | Separate mutation, not yet spec'd for implementation | Devraj | Phase 3 |
| Part installation/removal lifecycle | Parts module tests not included here — Nadia owns the part traceability test matrix | Nadia + Cilla | Phase 3 |
| `getCloseReadiness` query (Q-WO-09) | UI pre-flight check query — needs to be exercised alongside closeWorkOrder | Devraj + Chloe | Phase 3 |
| Life-remaining recomputation at WO close (BP-04) | Background job trigger, not a synchronous mutation — test strategy TBD | Devraj | Phase 3.1 |

---

## 5. What Devraj Must Deliver Before I Sign Off

This is not a wish list. These are blockers. I will not sign off on Phase 3 until each of these is delivered and all associated tests pass.

### 5.1 Immediate blockers — tests are written, will fail until these exist

These tests are fully written and will compile errors or fail at runtime until the implementations ship:

| Item | File | Mutation/Function | My Test IDs |
|---|---|---|---|
| `createWorkOrder` | `convex/mutations/workOrders/createWorkOrder.ts` | `createWorkOrder` | TC-WO-HP-01, TC-WO-HP-02, TC-WO-AUTH-01 through TC-WO-AUTH-04 |
| `openWorkOrder` | `convex/mutations/workOrders/openWorkOrder.ts` | `openWorkOrder` | TC-WO-HP-01, TC-WO-HP-02, TC-WO-INV-03, TC-WO-INV-04, TC-WO-INV-07 |
| `addTaskCard` | `convex/mutations/workOrders/addTaskCard.ts` | `addTaskCard` | TC-WO-HP-01, TC-WO-INV-01 through TC-WO-INV-04 |
| `completeTaskCard` | `convex/mutations/workOrders/completeTaskCard.ts` | `completeTaskCard` | TC-WO-HP-01, TC-WO-INV-01 through TC-WO-INV-02 |
| `closeWorkOrder` | `convex/mutations/workOrders/closeWorkOrder.ts` | `closeWorkOrder` | TC-WO-HP-01, TC-WO-INV-01 through TC-WO-INV-06, TC-AD-CLOSE-01 through TC-AD-CLOSE-03 |
| `voidWorkOrder` | `convex/mutations/workOrders/voidWorkOrder.ts` | `voidWorkOrder` | TC-WO-VOID-01 through TC-WO-VOID-03 |
| `createTaskCard` | `convex/mutations/taskCards/createTaskCard.ts` | `createTaskCard` | TC-TC-STEP-01 through TC-TC-CONCURRENT-02 |
| `completeStep` | `convex/mutations/taskCards/completeStep.ts` | `completeStep` | TC-TC-STEP-01, TC-TC-STEP-02, TC-TC-CONS-01, TC-TC-CONS-02, TC-TC-IA-01 through TC-TC-IA-03, TC-TC-CONCURRENT-01, TC-TC-CONCURRENT-02 |
| `signTaskCard` | `convex/mutations/taskCards/signTaskCard.ts` | `signTaskCard` | TC-TC-SIGN-01, TC-TC-SIGN-02 |
| `createAdCompliance` | `convex/mutations/adCompliance/createAdCompliance.ts` | `createAdCompliance` | TC-AD-NA-05 |
| `recordAdCompliance` | `convex/mutations/adCompliance/recordAdCompliance.ts` | `recordAdCompliance` | TC-AD-RECORD-01 |
| `supersedAd` | `convex/mutations/adCompliance/supersedAd.ts` | `supersedAd` | TC-AD-SUPER-01, TC-AD-SUPER-02 |
| `markAdNotApplicable` | `convex/mutations/adCompliance/markAdNotApplicable.ts` | `markAdNotApplicable` | TC-AD-NA-01 through TC-AD-NA-04 |
| `checkAdDueForAircraft` | `convex/queries/adCompliance/checkAdDueForAircraft.ts` | `checkAdDueForAircraft` | TC-AD-DUE-01 through TC-AD-DUE-05 |

### 5.2 Pre-sign-off blockers (must be delivered before I sign Phase 3 gate review)

These are either in the "coverage gaps" section above or require schema extensions:

1. **BP-01 (BACK-TC-08):** Open interruptions (`resumedAt == null`) must block `closeWorkOrder`. Marcus flagged this in the gate review. Once UM-03 (`interruptStep`/`resumeStep`) is implemented, I need a test that proves an open interruption blocks WO close. I will add TC-TC-17 to the test matrix when the mutation exists.

2. **BP-02 (BACK-P2-07):** `closeWorkOrder` must verify `rts.aircraftHoursAtRts == wo.aircraftTotalTimeAtClose`. Marcus flagged this. I need a test that seeds an RTS record with mismatched hours and asserts `closeWorkOrder` throws. I will add this when Devraj implements the cross-check in `closeWorkOrder`.

3. **SE-01 (`taskCardStepCounterSignatures`):** Without this table, I cannot write a passing test for the dual sign-off path (IA-required steps on annual inspection task cards). The Phase 2.1 schema extension request must be approved by me before Devraj implements it. I will review the table shape when it's proposed and either approve or reject with comments.

4. **UM-01 (`reviewNAStep`):** Without this mutation, `incomplete_na_steps` cards can never transition to `complete`. Any workflow involving an IA-required step marked N/A is untestable end-to-end. This must ship in Phase 3.1 at the latest.

5. **100hr inspection AD check test:** I wrote TC-AD-CLOSE-01 for annual inspection. I need the equivalent test for `100hr_inspection` work order type before signing off. I'll write it when UM-08 (`createAdCompliance` full mutation) is delivered and the fixture pattern is confirmed.

### 5.3 Things I will NOT accept as "good enough"

- `closeWorkOrder` that checks AD compliance without querying `adCompliance.by_aircraft` — if it's a manual list in the mutation, it'll miss records. Must use the index.
- Denormalized counters (`completedStepCount`) that are only updated in the mutation that completes the last step. Every step completion must recount — or the concurrent case (TC-TC-CONCURRENT-01) will produce inconsistent counter state.
- A `markAdNotApplicable` that checks `roles` on the user/technician record instead of checking the `certificates` table for `hasIaAuthorization`. The schema is the source of truth for certification status, not a role label.
- Any mutation that writes to the `auditLog` in a separate transaction from the primary mutation. If the audit write fails but the mutation succeeds, the regulatory audit chain is broken. One transaction.
- `signatureAuthEvent` consumption that doesn't set `consumedByTable` and `consumedByRecordId`. I need to be able to reconstruct which signing action consumed each event. Both fields are required, not optional.

---

*Cilla Oduya — QA Lead*  
*Phase 3, Athelon MRO SaaS*  
*2026-02-22*  

*"If the test doesn't have a specific failure mode it's guarding against, it's not a test — it's wishful thinking."*
