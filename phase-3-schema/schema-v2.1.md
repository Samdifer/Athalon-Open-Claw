# Athelon — Convex Schema v2.1 Extension
**Document Type:** Implementation Specification — Schema Extension (Spec, Not TypeScript)
**Author:** Devraj Anand (Backend Engineer, Convex)
**QA Review:** Cilla Oduya (QA Lead) — notes marked `[CILLA]`
**Date:** 2026-02-22
**Status:** DRAFT — Pending Cilla sign-off and Marcus Webb regulatory review
**Extends:** `convex-schema-v2.md` (FROZEN, 2026-02-22) — does not modify any existing table
**Gate Review Basis:** Phase 2 Gate Review — CONDITIONAL PASS — SE-01, SE-02, SE-03, BP-03, BP-05

---

## Author's Preamble

*Schema v2 is frozen. This document adds exactly what the Phase 2 gate review demanded and nothing else. Three new tables come from Rafael's task card execution engine spec (§3.1–3.3), which was necessarily written after v2 was frozen. Two field additions — `adComplianceId` on `taskCards` and `form337Reference` on `workOrders` — are targeted surgeries on existing tables. Both were named blockers in the gate review (BP-03 and BP-05). Neither requires structural changes to existing tables or their index sets.*

*I want to be precise about optionality on the two field additions. Both are `v.optional()` at the schema level and required-under-conditions at the mutation level. Existing documents will read `undefined` for both fields. No migration is needed. v2 and v2.1 are fully compatible.*

*Cilla's notes are inline. They are not suggestions. Where she names a testability gap, it is closed before I write schema code.*

---

## Section 1: Change Log — v2 to v2.1

| Change | Type | Gate Review ID | Reason |
|---|---|---|---|
| New table: `taskCardStepCounterSignatures` | Additive | SE-01 (Critical) | `taskCardSteps` single-signer slot cannot model AMT + IA dual sign-off |
| New table: `taskCardInterruptions` | Additive | SE-02 (High) | Shift-change and parts-hold interruptions must be first-class audit records |
| New table: `taskCardStepAssignments` | Additive | SE-03 (Medium) | Audit-log workaround for step assignments is unqueryable in any structured sense |
| `adComplianceId` on `taskCards` | Field addition | BP-03 (High) | AD compliance cards have no link to their governing `adCompliance` record |
| `form337Reference` on `workOrders` | Field addition | BP-05 / OI-02 (Blocker) | `authorizeReturnToService` cannot enforce 337 requirement without a field to check |
| INV-21 through INV-25 | Invariant additions | All of the above | New invariants for all five changes |

**What did not change:** All twenty v2 tables — their field shapes, validators, and indexes — are untouched.

### 1.1 Why Each Change Is Necessary

**SE-01:** The dual sign-off scenario (A&P performs work, IA independently reviews and counter-signs) is two distinct regulatory acts under two distinct certificate authorities. Modeling a second signature as optional fields on `taskCardSteps` makes invariants condition-on-field-presence rather than condition-on-table-existence — untestable at the mutation layer. A companion table is the correct answer. Marcus Webb's annotation in the task card spec (§5.2) is explicit: "These are different legal statements with different liability implications."

**SE-02:** An interruption is not a step status change. The step remains `pending` whether interrupted or not. Embedding interruption history as an array in the step document recreates the Phase 1 anti-pattern that caused `taskCardSteps` to be extracted from `taskCards`. Separately: Marcus's close-guard requirement (BACK-TC-08) — open interruptions must block `closeWorkOrder` — requires a queryable table, not audit log text parsing.

**SE-03:** `assignStep` currently writes to the audit log as a structured-notes entry. The audit log is not queryable in the structured sense needed for: technician worklist ("what am I assigned to?"), reassignment history, or the close guard's assignment-state check. The workaround was explicitly documented as temporary.

**BP-03:** When a task card with `taskType == "ad_compliance"` completes, the `completeTaskCard` mutation must append to `adCompliance.complianceHistory`. Without `adComplianceId` on the task card, the mutation has no link to the correct `adCompliance` record. The connection is currently made out-of-band.

**BP-05:** The `authorizeReturnToService` mutation's Precondition 3 for major repair/alteration work orders requires a Form 337 reference to be on file before RTS can proceed (14 CFR 43 Appendix B; FAA Order 8300.16). The field does not exist in v2, so the precondition cannot be enforced. This is the OI-02 open item from the sign-off spec.

---

## Section 2: New Table Definitions

### 2.1 `taskCardStepCounterSignatures`

**Source:** SE-01 | **Regulatory Basis:** 14 CFR 145.109(d); 14 CFR 65.91; 14 CFR 43 Appendix D

Each document represents one counter-signature event on a step that has received its primary signature. A step may have at most one record per `counterSignType`.

```
Fields:

  stepId                        v.id("taskCardSteps")
    The counter-signed step. Must be in "completed" status at insertion time.
    INV-21 enforced in counterSignStep.

  taskCardId                    v.id("taskCards")        [denormalized]
  workOrderId                   v.id("workOrders")       [denormalized]
  organizationId                v.id("organizations")    [denormalized]

  counterSignType               v.union(
                                  v.literal("ia_inspection"),   // IA reviewing AMT work (14 CFR 65.91)
                                  v.literal("inspector_qc"),    // QC inspector, Part 145 RSM
                                  v.literal("dual_amt")         // Second A&P, AMM-required
                                )

  counterSignedByTechnicianId   v.id("technicians")
  counterSignedLegalName        v.string()         // Snapshot at signing — never updated
  counterSignedCertNumber       v.string()         // Snapshot. INV-22: must match active cert.
  counterSignedAt               v.number()         // Unix ms

  counterSignRatingsExercised   v.array(v.union(   // INV-02 compliance — required at every signing
                                  v.literal("airframe"), v.literal("powerplant"),
                                  v.literal("ia"), v.literal("none")
                                ))
    For counterSignType == "ia_inspection", must include "ia".

  counterSignatureAuthEventId   v.id("signatureAuthEvents")
    INV-21 / INV-05: unconsumed, unexpired, issued to counterSignedByTechnicianId.
    Consumed atomically in counterSignStep.

  counterSignatureHash          v.string()
    SHA-256 of canonical record fields pre-insert. Tamper detection.

  scopeStatement                v.string()
    Counter-signer's attestation. Non-empty; ≥ 30 chars for ia_inspection type.

  createdAt                     v.number()
    // No updatedAt — this record is immutable after creation.

Indexes:
  by_step           ["stepId"]                           Primary lookup
  by_task_card      ["taskCardId"]                       Card-level dual sign-off check
  by_work_order     ["workOrderId"]                      Q-WO-09 pre-flight check
  by_technician     ["counterSignedByTechnicianId"]      IA activity history
  by_type_step      ["counterSignType", "stepId"]        Uniqueness check (INV-21)
```

> **[CILLA — SE-01 Testability Review]**
> *This table unlocks the annual inspection dual sign-off smoke test, which was the primary reason Task Card Execution received B+ instead of A in the gate review.*
>
> *Required tests before counterSignStep can be marked done:*
> - *TC-CS-01: Consumed authEvent → assert throws INV-21*
> - *TC-CS-02: IA-type counter-sign, caller's IA expired → assert throws INV-22*
> - *TC-CS-03: counterSignStep on step with status != "completed" → assert throws*
> - *TC-CS-04: Duplicate (same counterSignType + stepId) → assert throws. Critical: Convex indexes are not unique constraints. counterSignStep MUST query by_type_step and explicitly throw if a record exists. Do not rely on the index to block the insert.*
> - *TC-CS-05: signTaskCard on annual inspection card, IA-required step missing ia_inspection counter-signature → assert throws with step numbers listed*
> - *TC-CS-06: counterSignRatingsExercised empty → assert INV-02 throws*
> - *TC-CS-07: Same technician as primary signer, holds current IA, counterSignType == "ia_inspection" → assert succeeds (legally permissible per Marcus §5.2)*

---

### 2.2 `taskCardInterruptions`

**Source:** SE-02 / BP-01 | **Regulatory Basis:** 14 CFR 145.109(a); AC 43-9C continuity-of-work guidance

Each document represents a single interruption event on a step. The step remains `pending` while interrupted. The record is "open" while `resumedAt` is null. Open interruptions are a hard block on `closeWorkOrder` (INV-23b / BP-01 resolution).

```
Fields:

  stepId                      v.id("taskCardSteps")
    Must be in "pending" status at interruption time.

  taskCardId                  v.id("taskCards")        [denormalized]
  workOrderId                 v.id("workOrders")       [denormalized — closeWorkOrder queries here]
  organizationId              v.id("organizations")    [denormalized]

  interruptionType            v.union(
                                v.literal("shift_change"), v.literal("parts_hold"),
                                v.literal("deferred_maintenance"), v.literal("tooling_unavailable"),
                                v.literal("awaiting_engineering_order"), v.literal("rdd_hold"),
                                v.literal("supervisor_review"), v.literal("other")
                              )

  interruptedByTechnicianId   v.id("technicians")
  interruptedAt               v.number()
  interruptionReason          v.string()           // Non-empty. Required.
  workStatusAtInterruption    v.string()           // Non-empty. What was done, what remains.
  safetyPreservationTaken     v.string()           // Non-empty. Caps, covers, placards placed.
                                                   // Mutation rejects empty — this is safety-critical.

  resumedByTechnicianId       v.optional(v.id("technicians"))   // Null = open interruption
  resumedAt                   v.optional(v.number())
    INV-23c: resumedAt must be strictly > interruptedAt when set.

  resumptionNotes             v.optional(v.string())

  deferralDiscrepancyId       v.optional(v.id("discrepancies"))
  deferralType                v.optional(v.union(
                                v.literal("mel"), v.literal("cdl"),
                                v.literal("neo"), v.literal("deferred_wo")
                              ))
    INV-23a: If deferralType is set, deferralDiscrepancyId must also be set.

  deferredToWorkOrderId       v.optional(v.id("workOrders"))

  createdAt                   v.number()
  updatedAt                   v.number()           // Updated when resumption fields are set.

Indexes:
  by_step               ["stepId"]                              Interruption history per step
  by_task_card          ["taskCardId"]
  by_work_order         ["workOrderId"]                         closeWorkOrder open-interruption check
  by_open_interruptions ["organizationId", "resumedAt"]         DOM dashboard — open interruptions
  by_org_type           ["organizationId", "interruptionType"]  Analytics
```

> **[CILLA — SE-02 Testability Review]**
> *This is the table I have been waiting for. BP-01 (Marcus-flagged close guard) is now testable end-to-end. TC-INT-05 is the first test I run after interruptStep is implemented — it is a condition for my Phase 3 sign-off.*
>
> *Required tests:*
> - *TC-INT-01: interruptStep with empty safetyPreservationTaken → assert throws*
> - *TC-INT-02: interruptStep on completed step → assert throws*
> - *TC-INT-03: interruptStep with deferralType set, no deferralDiscrepancyId → assert throws INV-23a*
> - *TC-INT-04: resumeStep where timestamp would be < interruptedAt → assert throws INV-23c*
> - *TC-INT-05: closeWorkOrder with one open interruption (resumedAt == null) → assert throws with step ID and interrupt record ID*
> - *TC-INT-06: getCloseReadiness (Q-WO-09) with open interruption → assert canClose == false, blockers[] contains interruption detail*
> - *TC-INT-07: All interruptions for a WO are closed (all resumedAt set) → closeWorkOrder is not blocked by interruption check*
>
> *INV-23b wording: closeWorkOrder MUST query taskCardInterruptions.by_work_order(workOrderId), filter for resumedAt == null (post-index filter — Convex does not support IS NULL index queries natively), and throw if any records are found. This must also be reflected in Q-WO-09's return shape as a named blocker.*

---

### 2.3 `taskCardStepAssignments`

**Source:** SE-03 | **Regulatory Basis:** 14 CFR Part 145 RSM step-level accountability

Each document is one assignment event. Reassigning creates a new record; the prior record's `supersededAt` is set atomically in the same transaction. The current assignment is the record with `supersededAt == null` for a given step.

```
Fields:

  stepId                    v.id("taskCardSteps")
  taskCardId                v.id("taskCards")        [denormalized]
  workOrderId               v.id("workOrders")       [denormalized]
  organizationId            v.id("organizations")    [denormalized]

  assignedToTechnicianId    v.id("technicians")
    Must be active and a member of organizationId at assignment time.

  assignedByTechnicianId    v.id("technicians")
    The supervisor or lead making the assignment. Distinct from assignedTo.

  estimatedStartAt          v.optional(v.number())
  estimatedDurationMinutes  v.optional(v.number())   // Must be > 0 if provided.
  assignmentNotes           v.optional(v.string())

  supersededAt              v.optional(v.number())
    Set when a new assignment is created for this step. Null = current assignment.
    Set atomically in the same transaction as the new record's insert.
    Devraj: do not split the supersession update into a separate mutation call.
    Concurrent reassignment with split operations leaves two records with
    supersededAt == null — a race condition that Convex atomicity would otherwise prevent.

  supersededByAssignmentId  v.optional(v.id("taskCardStepAssignments"))

  createdAt                 v.number()

Indexes:
  by_step           ["stepId"]
  by_task_card      ["taskCardId"]
  by_technician     ["assignedToTechnicianId"]    Technician worklist (filter: supersededAt == null)
  by_work_order     ["workOrderId"]
  by_org_technician ["organizationId", "assignedToTechnicianId"]
```

> **[CILLA — SE-03 Testability Review]**
> *The audit log workaround was unverifiable. I had no way to assert "technician X is currently assigned to step Y" without parsing free-text notes fields. That is not a test.*
>
> *Required tests:*
> - *TC-ASN-01: assignStep to inactive technician → assert throws*
> - *TC-ASN-02: assignStep to technician in different org → assert throws*
> - *TC-ASN-03: Reassign step — assert prior record has supersededAt set AND new record has supersededAt == null, both in the same mutation. This is the atomicity test.*
> - *TC-ASN-04: estimatedDurationMinutes == 0 → assert throws*
> - *TC-ASN-05: Query by_technician, filter supersededAt == null → assert only current assignments returned*
> - *TC-ASN-06: Three steps assigned to technician A, one reassigned to technician B → technician A's worklist shows two; B's shows one*

---

## Section 3: Field Additions to Existing Tables

### 3.1 `adComplianceId` on `taskCards`

**Source:** BP-03 | **Type:** `v.optional(v.id("adCompliance"))`

Optional at the schema level. For task cards where `taskType == "ad_compliance"`, this field should be populated with the governing `adCompliance` record's ID.

**Semantics:** When a task card with `taskType == "ad_compliance"` reaches `complete` status, the completion handler uses `adComplianceId` to append to `adCompliance.complianceHistory` and recompute `nextDueDate` / `nextDueHours`. Without this link, the AD remains flagged as overdue even after the work is performed.

**INV-24 (enforced in `createTaskCard` and `addTaskCard`):**
- If `taskType == "ad_compliance"` and `adComplianceId` is **non-null**: the referenced `adCompliance` record must exist, must be `applicable == true`, and must be scoped to the task card's `aircraftId`. Mutation throws if these conditions fail.
- If `taskType == "ad_compliance"` and `adComplianceId` is **null**: the mutation logs a warning entry but does not throw. `getCloseReadiness` (Q-WO-09) surfaces this as a soft warning, not a hard block. Marcus confirmed: missing link is a data quality issue, not a task card violation.
- If `adComplianceId` is set on a task card with `taskType != "ad_compliance"`: soft warning only.

No new index is required. Reverse lookup ("which task card tracks this adCompliance record?") uses `taskCards.by_work_order` with a post-filter.

> **[CILLA — BP-03 Testability Review]**
> - *TC-ADC-01: adComplianceId points to adCompliance record scoped to a different aircraft → assert throws INV-24*
> - *TC-ADC-02: taskType == "ad_compliance", adComplianceId == null → assert succeeds + warn log entry present*
> - *TC-ADC-03: Complete an ad_compliance task card with valid adComplianceId → assert adCompliance.complianceHistory has new entry with correct date and technicianId*
> - *TC-ADC-04: adComplianceId references record with applicable == false → assert throws*
> - *TC-ADC-05: adComplianceId set on taskType == "repair" card → assert soft warning, no throw*

---

### 3.2 `form337Reference` on `workOrders`

**Source:** BP-05 / OI-02 | **Type:** `v.optional(v.string())`
**Regulatory Basis:** 14 CFR 43 Appendix B; 14 CFR 43.9(d); FAA Order 8300.16

Optional at schema level. For work orders of type `major_repair`, `major_alteration`, or `field_approval`, this field must be non-null and non-empty before `authorizeReturnToService` can proceed.

**Semantics:** The FAA Form 337 document identifier or field approval number for the work performed. Populated via the new `setForm337Reference` mutation (an audited, targeted field setter — not a general WO update). The mutation writes an audit log entry capturing the reference value.

**INV-25 (enforced in `authorizeReturnToService` Precondition 2b):**
For `workOrderType` in `["major_repair", "major_alteration", "field_approval"]`:
  - Assert `form337Reference` is non-null and non-empty.
  - If null or empty: throw `RTS_337_REFERENCE_MISSING`.
  - An empty string is treated as equivalent to null.
  - `setForm337Reference` must reject empty strings with the same error to prevent a bypass via whitespace.

For all other work order types: no check. The field may be populated if a 337 is incidentally required.

`workOrderType` is treated as immutable after the work order passes `draft` status. The `setForm337Reference` mutation enforces this: it rejects calls on work orders in `closed`, `voided`, or `cancelled` status.

> **[CILLA — BP-05 Testability Review]**
> - *TC-337-01: authorizeReturnToService on "major_repair" WO with form337Reference == null → assert throws RTS_337_REFERENCE_MISSING*
> - *TC-337-02: authorizeReturnToService on "major_repair" WO with valid form337Reference → 337 check passes (other preconditions may still block)*
> - *TC-337-03: authorizeReturnToService on "routine" WO with form337Reference == null → assert no 337 check applied*
> - *TC-337-04: setForm337Reference on closed WO → assert throws*
> - *TC-337-05: setForm337Reference with empty string or whitespace-only → assert throws INV-25*
> - *TC-337-06 (edge case — workOrderType immutability): If workOrderType is mutable after "open" status, a bad actor could change "major_repair" to "routine" to bypass INV-25. Devraj: document whether workOrderType is mutable post-draft. If yes, add a guard. If no, document the invariant explicitly and I will add a test to verify the type cannot be changed on an open WO.*

---

## Section 4: Updated Invariant List — INV-21 through INV-25

All five invariants follow the naming and documentation convention of INV-01–20 in schema-v2.md. Enforcement is at the mutation layer; the Convex type system cannot enforce these.

| # | Invariant | Enforcing Mutation(s) | Gate Review Source |
|---|---|---|---|
| INV-21 | A `taskCardStepCounterSignature` may only be created when: (a) the referenced step is in "completed" status, (b) `signatureAuthEventId` is unconsumed and unexpired and issued to `counterSignedByTechnicianId`, (c) no prior record exists for the same `(stepId, counterSignType)` pair — verified via `by_type_step` query before insert | `counterSignStep` | SE-01 |
| INV-22 | `counterSignedCertNumber` must match an active certificate held by `counterSignedByTechnicianId` at mutation time; for `counterSignType == "ia_inspection"`, the technician must hold a current IA (`iaExpiryDate ≥ now`); `counterSignRatingsExercised` must include "ia" for ia_inspection type (INV-02 extension) | `counterSignStep` | SE-01 / INV-02 |
| INV-23 | (a) If `deferralType` is set on a `taskCardInterruptions` record, `deferralDiscrepancyId` must also be set. (b) `closeWorkOrder` and `getCloseReadiness` must query `taskCardInterruptions.by_work_order` and treat any record with `resumedAt == null` as a hard block — throws with interrupt record IDs. (c) `resumedAt` must be strictly greater than `interruptedAt` when set by `resumeStep` | `interruptStep`, `resumeStep`, `closeWorkOrder`, `getCloseReadiness` | SE-02 / BP-01 |
| INV-24 | A task card with `taskType == "ad_compliance"` and non-null `adComplianceId` must reference an `adCompliance` record that is (a) applicable to the task card's `aircraftId` and (b) not in status "not_applicable". Null `adComplianceId` on an "ad_compliance" task card is a soft warning, not a throw | `createTaskCard`, `addTaskCard` | BP-03 |
| INV-25 | For `workOrderType` in `["major_repair", "major_alteration", "field_approval"]`, `form337Reference` must be non-null and non-empty at `authorizeReturnToService` time. Throws `RTS_337_REFERENCE_MISSING`. An empty string is treated as null. `setForm337Reference` rejects empty strings with the same error | `authorizeReturnToService`, `setForm337Reference` | BP-05 / OI-02 |

### 4.1 Invariant Cross-Reference

| New INV | Complements | Enforcement Layer | Mandatory Test(s) |
|---|---|---|---|
| INV-21 | INV-05 (signatureAuthEvent single-use) | `counterSignStep` pre-insert checks | TC-CS-01, TC-CS-04 |
| INV-22 | INV-02 (ratingsExercised at signing) | `counterSignStep` cert + IA currency check | TC-CS-02, TC-CS-06 |
| INV-23a | INV-16 (corrected disposition completeness) | `interruptStep` deferral validation | TC-INT-03 |
| INV-23b | INV-06 (closeWorkOrder precondition set) | `closeWorkOrder` interruption pre-check | TC-INT-05, TC-INT-06 |
| INV-23c | INV-18 (monotonic time enforcement) | `resumeStep` timestamp validation | TC-INT-04 |
| INV-24 | INV-03 (adCompliance requires valid subject) | `createTaskCard`, `addTaskCard` | TC-ADC-01, TC-ADC-04 |
| INV-25 | INV-20 (RTS statement completeness) | `authorizeReturnToService` Precondition 2b | TC-337-01, TC-337-05 |

---

## Section 5: Cilla's Testability Sign-Off

*— Cilla Oduya, QA Lead*

### 5.1 What This Extension Unlocks

**Annual inspection dual sign-off:** With `taskCardStepCounterSignatures`, the full annual inspection smoke test is now writable: AMT signs steps → IA counter-signs → `signTaskCard` validates dual sign-off → RTS proceeds. This was the structural gap behind the B+ in the gate review. TC-CS-05 closes it.

**Interruption-gated close (BP-01 / Marcus-flagged):** TC-INT-05 is now a testable, deterministic assertion. It is also a Phase 3 sign-off condition. Previously I had no mechanism to assert "closeWorkOrder throws when an open interruption exists" because there was nowhere to record the interruption.

**Structured assignment queries:** The `taskCardStepAssignments` table converts "parse the auditLog notes field" into "query the table." TC-ASN-05 and TC-ASN-06 are now simple indexed queries with deterministic results.

### 5.2 Mandatory Tests Before Any v2.1 Feature Is "Done"

I will not sign off on any Phase 3 mutation implementation that depends on v2.1 until all tests in the following list pass against a live Convex dev deployment.

| Test ID | Assertion | Blocks Sign-Off On |
|---|---|---|
| TC-CS-01 | counterSignStep: consumed authEvent → throws INV-21 | `counterSignStep` |
| TC-CS-02 | counterSignStep: ia_inspection, IA expired → throws INV-22 | `counterSignStep` |
| TC-CS-04 | counterSignStep: duplicate (type + step) → throws — NOT silently inserted | `counterSignStep` |
| TC-CS-05 | signTaskCard: IA-required step missing ia_inspection counter-sig → throws with step IDs | `signTaskCard` |
| TC-INT-05 | closeWorkOrder: open interruption (resumedAt null) → throws with interrupt record ID | `closeWorkOrder` |
| TC-INT-06 | getCloseReadiness: open interruption → `canClose == false`, blocker in `blockers[]` | Q-WO-09 |
| TC-ASN-03 | Reassignment: prior record has `supersededAt` set atomically with new insert | `assignStep` |
| TC-ADC-01 | createTaskCard: adComplianceId references wrong aircraft's record → throws | `createTaskCard` |
| TC-ADC-03 | Completing ad_compliance task card → adCompliance.complianceHistory appended | `completeTaskCard` |
| TC-337-01 | authorizeReturnToService: major_repair, form337Reference null → RTS_337_REFERENCE_MISSING | `authorizeReturnToService` |

### 5.3 Invariant Violations I Expect to Catch

**Concurrent counter-sign race (TC-CS-04):** Two IAs simultaneously call `counterSignStep` on the same step with `ia_inspection` type. Convex mutation atomicity prevents a write-write race on the same document, but two inserts to `taskCardStepCounterSignatures` for the same step are independent writes. The query-before-insert pattern in `counterSignStep` must be inside the mutation transaction. If Devraj checks the index and then inserts in a non-atomic pattern, two records can be created. I will test this by examining index state after rapid-succession mutation calls.

**Half-closed interruption (INV-23c / TC-INT-04):** `resumeStep` sets `resumedAt` but not `resumedByTechnicianId`, or vice versa. This is a half-open audit record. The mutation must set both fields atomically. I will add a sub-case where I separately assert that both fields are present and consistent after resumeStep returns.

**AD completion bypass (INV-24 / TC-ADC-06):** An ad_compliance task card completes with `adComplianceId == null`. No `complianceHistory` entry is appended. The AD remains overdue in the system. TC-ADC-03 covers the success path. TC-ADC-06 will assert that completing a null-linked ad_compliance card produces a warn-level log entry and does NOT silently append to any adCompliance record.

**Form 337 bypass via whitespace (INV-25 / TC-337-05):** `setForm337Reference` called with `"   "` (whitespace only). If the mutation checks non-null but not non-blank, a whitespace string satisfies the null check and RTS proceeds without a valid reference. The mutation must trim and then check length > 0. I will test with empty string, single space, and tab character.

### 5.4 My Sign-Off Conditions for Schema v2.1

I sign off when:

1. This document is accepted by Devraj, or all Devraj changes are noted with explicit agreement on the delta.
2. INV-21 through INV-25 are incorporated into the full invariant table from schema-v2.md (rows added, not replaced).
3. All ten mandatory tests in Section 5.2 pass against a live Convex dev deployment.
4. `closeWorkOrder` precondition set is updated to include INV-23b, and Q-WO-09 (`getCloseReadiness`) return shape includes an `openInterruptions` count and associated blocker message.
5. `authorizeReturnToService` error code catalogue includes `RTS_337_REFERENCE_MISSING` as a typed error consistent with sign-off spec §7.
6. TC-337-06 has a documented answer: is `workOrderType` mutable after draft? If yes, Devraj adds a guard. If no, a new invariant names it and I write the test.

*I do not sign on testability gaps. The schema extension is sound. The implementation must be equally sound.*

*— Cilla Oduya*

---

## Section 6: Index Coverage — v2.1 Additions

| Table | Index | Fields | Purpose |
|---|---|---|---|
| `taskCardStepCounterSignatures` | `by_step` | `["stepId"]` | Primary counter-sig lookup |
| `taskCardStepCounterSignatures` | `by_task_card` | `["taskCardId"]` | Card-level dual sign-off check |
| `taskCardStepCounterSignatures` | `by_work_order` | `["workOrderId"]` | Q-WO-09 pre-flight check |
| `taskCardStepCounterSignatures` | `by_technician` | `["counterSignedByTechnicianId"]` | IA activity history |
| `taskCardStepCounterSignatures` | `by_type_step` | `["counterSignType", "stepId"]` | INV-21 uniqueness check |
| `taskCardInterruptions` | `by_step` | `["stepId"]` | Interruption history per step |
| `taskCardInterruptions` | `by_task_card` | `["taskCardId"]` | Card-level interruptions |
| `taskCardInterruptions` | `by_work_order` | `["workOrderId"]` | closeWorkOrder open-interrupt check |
| `taskCardInterruptions` | `by_open_interruptions` | `["organizationId", "resumedAt"]` | DOM open-interruption dashboard |
| `taskCardInterruptions` | `by_org_type` | `["organizationId", "interruptionType"]` | Shop workflow analytics |
| `taskCardStepAssignments` | `by_step` | `["stepId"]` | Assignment history |
| `taskCardStepAssignments` | `by_task_card` | `["taskCardId"]` | Card assignment matrix |
| `taskCardStepAssignments` | `by_technician` | `["assignedToTechnicianId"]` | Technician worklist |
| `taskCardStepAssignments` | `by_work_order` | `["workOrderId"]` | WO-level assignment view |
| `taskCardStepAssignments` | `by_org_technician` | `["organizationId", "assignedToTechnicianId"]` | DOM capacity view |

**Total new indexes: 15.** No indexes added to existing tables for `adComplianceId` or `form337Reference` — neither field's query pattern requires index support at this stage.

---

## Schema v2.1 Summary

| Change | Type | Mutation Dependencies | Gate Review ID |
|---|---|---|---|
| `taskCardStepCounterSignatures` | New table | `counterSignStep` (new), `signTaskCard` (updated) | SE-01 |
| `taskCardInterruptions` | New table | `interruptStep`, `resumeStep` (new), `closeWorkOrder` (updated) | SE-02 / BP-01 |
| `taskCardStepAssignments` | New table | `assignStep` (rewritten from audit-log workaround) | SE-03 |
| `taskCards.adComplianceId` | Field addition | `createTaskCard`, `addTaskCard`, `completeTaskCard` (updated) | BP-03 |
| `workOrders.form337Reference` | Field addition | `setForm337Reference` (new), `authorizeReturnToService` (updated) | BP-05 / OI-02 |
| INV-21 through INV-25 | Invariant additions | All mutations listed in Section 4 | SE-01–03, BP-03, BP-05 |

---

*Schema v2.1 — Devraj Anand — 2026-02-22*
*QA Review: Cilla Oduya — testability notes inline throughout.*
*This document is the definitive spec for the Phase 2.1 schema extension.*
*Implementation follows from this spec. TypeScript schema code written after Cilla's Section 5.4 sign-off conditions are confirmed.*
*Pending: Marcus Webb regulatory review of INV-22 (IA currency standard) and INV-25 (Form 337 regulatory basis).*
