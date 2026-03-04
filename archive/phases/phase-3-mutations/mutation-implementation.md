# Athelon — Phase 3 Mutation Implementation Specification
**Document Type:** Phase 3 Implementation Specification — Mutation Layer (Unimplemented Items)
**Author:** Devraj Anand (Backend, Convex)
**Regulatory Cross-Reference:** Marcus Webb — compliance-validation.md (RQ-01 through RQ-06)
**QA Contract:** Cilla Oduya — implementation checklist in Section 7
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 3 implementation begins against this document
**Schema Basis:** convex-schema-v2.md (FROZEN) + schema-v2.1.md (Phase 3 extensions — SE-01, SE-02, SE-03)
**Resolves:** UM-01 through UM-07 (gate review blocker consolidation); BP-01, BP-02 (close guards)
**Preconditions:** Phase 2 gate review CONDITIONAL PASS accepted. RQ-01 through RQ-06 determinations received from Marcus (compliance-validation.md). Schema v2.1 committed with taskCardStepCounterSignatures, taskCardInterruptions, taskCardStepAssignments, adComplianceId on taskCards, form337Reference.

---

## Devraj's Preamble

This document picks up exactly where the Phase 2 gate review left it. Rafael's work order engine and task card execution specs defined the state machines, guard sequences, and audit requirements for the system's core mutations. Phase 2 also left eight unimplemented mutation stubs (UM-01 through UM-08), two Marcus-flagged close guards (BP-01, BP-02), and six open regulatory questions (RQ-01 through RQ-06) whose resolutions change specific guard behaviors. This document specifies all of them.

I am writing in spec style: TypeScript pseudocode for guard sequences is used throughout. This is not working code — it is a precise behavioral contract for what working code must enforce. Every mutation in this document includes an auth wrapper invocation, an ordered guard sequence with error codes, an execution sequence, an audit log write, and any invariant enforcements flagged in schema-v2.md or the gate review. Nothing is optional. Nothing is a recommendation.

Three implementation rules that govern everything in this document:

**Rule 1 — Guards are ordered and the order matters.** Guards must execute in the sequence listed. Auth checks run first. Document existence checks run second. State transition validity runs third. Business logic guards run last. This ordering minimizes wasted DB reads on requests that will fail authentication or fetch a non-existent document.

**Rule 2 — The six-check signatureAuthEvent consumption sequence (Section 5) applies to every signing mutation without exception.** I am specifying it once. Every mutation that consumes a `signatureAuthEvent` references it by name. Do not inline a partial version. Do not skip checks because they seem redundant. They are not redundant.

**Rule 3 — Audit log writes are not optional and not last.** The audit log write is part of the mutation's behavioral contract, not an afterthought. It happens within the same Convex transaction as the primary write. If the primary write succeeds but the audit log write fails, the transaction rolls back. There is no partial state.

---

## Section 1: Implementation Priority Order

The implementation sequence for Phase 3 mutations is not arbitrary. It is dictated by the dependency chain, the state machine topology, and the regulatory risk distribution across modules.

### Priority 1 — Work Order Lifecycle (UM-05, UM-06, UM-07 + BP-01, BP-02 close guard updates)

**Justification:** The work order state machine has dead ends without these mutations. A work order can reach `in_progress` but cannot reach `on_hold` (UM-05 missing), cannot reach `pending_inspection` (UM-06 missing), and cannot be `cancelled` (UM-07 missing). The `closeWorkOrder` mutation, already specified in Phase 2, is missing two required guard conditions: BP-01 (open interruptions block close) and BP-02 (RTS hours verification). An `in_progress` work order that cannot transition anywhere except `closeWorkOrder` is a state machine trap. Fix the WO lifecycle first because every other module — task cards, parts, compliance, RTS — sits inside a work order.

**Dependency note:** `interruptStep` (UM-03) writes to `taskCardInterruptions`. The BP-01 guard on `closeWorkOrder` queries `taskCardInterruptions` for open records. This means UM-03 must exist before the BP-01 guard is meaningful. However, the `closeWorkOrder` guard should be added now regardless — it will simply find nothing to block against until UM-03 is implemented. Adding the guard late (after UM-03) is a regulatory risk window. Add it now.

### Priority 2 — Task Card Execution (UM-01, UM-02, UM-03, UM-04)

**Justification:** Task card mutations sit inside the work order lifecycle. They cannot run before the WO is `open` or `in_progress`, so the WO lifecycle must be stable first. Among the task card mutations, the dependency chain is: `interruptStep`/`resumeStep` (UM-03) first — because BP-01 depends on their interruption records; `reviewNAStep` (UM-01) second — because annual inspections produce `incomplete_na_steps` cards that block the work order from reaching `pending_signoff`; `counterSignStep` (UM-02) third — because it depends on SE-01 (`taskCardStepCounterSignatures` table) and `completeStep` having already run; `voidTaskCard` (UM-04) last — it is a correction path that does not gate any other mutation.

**Regulatory risk:** UM-01 and UM-02 gate annual inspection completion. An `incomplete_na_steps` card that cannot be resolved prevents `closeWorkOrder` from running. This is not just a product gap — it means annual inspections cannot be completed in the system until UM-01 is live. High regulatory risk.

### Priority 3 — Parts Module

**Justification:** Parts mutations (`installPart`, `removePart`, `receivePart`) are already partially specified in Phase 2. The guard changes from RQ-01 (shelf-life enforcement levels), RQ-03 (quantity validation hard-block), and RQ-04 (CoC documentation pathway) affect these mutations. These guard changes are implementable in parallel with task card mutations but cannot be verified until work orders and task cards are testable end-to-end.

### Priority 4 — AD Compliance Module (UM-08)

**Justification:** `createAdCompliance` (UM-08) is the entry point to the entire AD compliance chain. Without it, no `adCompliance` records are created, and the `authorizeReturnToService` PRECONDITION 7 checks an empty set — a vacuous pass. This is a critical gap identified in compliance-validation.md Section 5.4. However, implementing UM-08 without a stable work order and task card layer means you cannot test the AD compliance chain in context. AD compliance depends on work orders; implement it after the WO/TC layer is stable.

### Priority 5 — RTS Sign-Off (`authorizeReturnToService`)

**Justification:** RTS is the terminal event in the maintenance lifecycle. It depends on: a closed work order (WO lifecycle), resolved task cards (TC execution), dispositioned discrepancies (parts/compliance), and valid AD compliance records (AD module). Implement and test last because it can only be verified when everything upstream is correct. The RTS guard changes from RQ-06 (statement validation tightening) are surgical — add them to the existing precondition block per the spec in Section 6.

---

## Section 2: Auth Wrapper Pattern

Every protected mutation in Phase 3 begins with one of three auth helper calls. These helpers are defined in `convex/lib/auth.ts` per auth-platform-wiring.md Section 3. They are not optional. A mutation without an auth helper does not merge.

### 2.1 The Three Helpers

```typescript
// Hierarchy (each implies all checks from levels above it):
// requireUser(ctx)             — JWT present + cryptographically valid
//   └─ requireOrgContext(ctx)  — JWT has org_id claim (user is in an active org)
//       └─ requireOrgMembership(ctx, minRole) — athelon_role meets minimum level
//
// Role levels: viewer(1) < amt(2) < inspector(3) < supervisor(4) < dom(5)
```

### 2.2 Canonical Full Example — `placeWorkOrderOnHold`

The following mutation shows the complete auth wrapper pattern. All subsequent mutations reference this pattern by name.

```typescript
// convex/mutations/workOrders/placeWorkOrderOnHold.ts

export const placeWorkOrderOnHold = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    holdReason: v.string(),
    holdType: v.union(
      v.literal("parts_availability"),
      v.literal("customer_approval"),
      v.literal("engineering_review"),
      v.literal("weather"),
      v.literal("facility"),
      v.literal("other")
    ),
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    // ── AUTH WRAPPER (canonical form) ─────────────────────────────────
    // Step A: requireOrgMembership derives orgId from the JWT org_id claim.
    //         The client NEVER passes orgId as a mutation argument.
    //         minRole "amt" — line technician can place a hold (supervisor not required).
    const { orgId, identity } = await requireOrgMembership(ctx, "amt");

    // Step B: Resolve callerUserId from the verified JWT subject claim.
    //         Never accept callerUserId as a mutation argument.
    const callerUserId: string = identity.subject;

    // ── GUARD SEQUENCE (ordered — do not reorder) ─────────────────────
    // G1: Fetch target document
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) {
      throw new ConvexError({ code: "WO_NOT_FOUND", workOrderId: args.workOrderId });
    }

    // G2: Org isolation — verify the document belongs to the caller's org
    if (wo.organizationId !== orgId) {
      throw new ConvexError({ code: "WO_ORG_MISMATCH" });
    }

    // G3: State transition validity
    if (wo.status !== "in_progress") {
      throw new ConvexError({
        code: "WO_INVALID_STATE_FOR_HOLD",
        current: wo.status,
        required: "in_progress",
        message: "A work order can only be placed on hold from in_progress status.",
      });
    }

    // G4: Business logic guard — holdReason must be non-empty
    if (!args.holdReason.trim()) {
      throw new ConvexError({
        code: "WO_HOLD_REASON_REQUIRED",
        message: "holdReason must be a non-empty string. Document why the work order is being held.",
      });
    }

    // G5: Verify caller technician record
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech || callerTech.status !== "active" || callerTech.organizationId !== orgId) {
      throw new ConvexError({ code: "TECHNICIAN_NOT_ACTIVE_IN_ORG" });
    }

    // ── EXECUTION SEQUENCE ────────────────────────────────────────────
    await ctx.db.patch(args.workOrderId, {
      status: "on_hold",
      onHoldReason: args.holdReason.trim(),
      onHoldType: args.holdType,
      onHoldAt: now,
      onHoldByTechnicianId: args.callerTechnicianId,
      updatedAt: now,
    });

    // ── AUDIT LOG WRITE (same transaction) ────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: orgId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("in_progress"),
      newValue: JSON.stringify("on_hold"),
      notes: `Work order placed on hold. Type: ${args.holdType}. Reason: ${args.holdReason.trim()}`,
      timestamp: now,
    });
  },
});
```

**Auth wrapper summary for remaining mutations:**
- `orgId` and `callerUserId` are always derived from the JWT via `requireOrgMembership(ctx, minRole)` or `requireOrgContext(ctx)`.
- The client never passes `organizationId` or `callerUserId` as mutation args.
- `callerTechnicianId` is still a mutation arg because the JWT subject is a Clerk user ID, not a Convex technician ID. The mapping is: `callerUserId (JWT subject)` → must match `technician.userId` field. Guard G5 in the canonical example performs this cross-check.
- All mutations below reference "AUTH: requireOrgMembership(ctx, minRole)" with the appropriate minRole.

---

## Section 3: Work Order Lifecycle Mutations

### 3.1 `placeWorkOrderOnHold` / `releaseWorkOrderHold` (UM-05)

`placeWorkOrderOnHold` is shown in full in Section 2.2 (the canonical auth example). The full spec is reproduced there. Summary for reference:

- **AUTH:** `requireOrgMembership(ctx, "amt")`
- **Guard sequence:** WO exists → org isolation → `status == "in_progress"` → holdReason non-empty → caller technician active
- **State transition:** `in_progress` → `on_hold`
- **Fields written:** `status`, `onHoldReason`, `onHoldType`, `onHoldAt`, `onHoldByTechnicianId`, `updatedAt`
- **Error codes:** `WO_NOT_FOUND`, `WO_ORG_MISMATCH`, `WO_INVALID_STATE_FOR_HOLD`, `WO_HOLD_REASON_REQUIRED`, `TECHNICIAN_NOT_ACTIVE_IN_ORG`

---

**`releaseWorkOrderHold`**

```typescript
// convex/mutations/workOrders/releaseWorkOrderHold.ts
// AUTH: requireOrgMembership(ctx, "supervisor")
// Rationale: releasing a hold re-authorizes work to continue;
//            requires supervisor or higher, not any AMT.

// GUARD SEQUENCE (ordered):
// G1: Fetch WO — throw WO_NOT_FOUND if null
// G2: Org isolation — throw WO_ORG_MISMATCH if wo.organizationId !== orgId
// G3: State check — throw WO_NOT_ON_HOLD if wo.status !== "on_hold"
// G4: Verify caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG
// G5: (Optional) If holdType == "engineering_review", assert releaseNotes non-empty
//     → throw WO_HOLD_RELEASE_NOTES_REQUIRED

// EXECUTION SEQUENCE:
// 1. Patch workOrder:
//    status → "in_progress"
//    onHoldReleasedAt → now
//    onHoldReleasedByTechnicianId → callerTechnicianId
//    onHoldReason → null (cleared)
//    onHoldType → null (cleared)
//    updatedAt → now
// 2. Audit log: eventType "status_changed", oldValue "on_hold", newValue "in_progress"
//    notes: "Hold released by [callerTechnicianId]. Release notes: [releaseNotes]."

// INVARIANT ENFORCEMENT:
// INV: onHoldReason and onHoldType are cleared on release.
//      A released hold must not carry stale hold metadata into in_progress.

// ERROR CODES:
// WO_NOT_FOUND | WO_ORG_MISMATCH | WO_NOT_ON_HOLD | TECHNICIAN_NOT_ACTIVE_IN_ORG
// WO_HOLD_RELEASE_NOTES_REQUIRED
```

---

### 3.2 `submitForInspection` / `flagOpenDiscrepancies` (UM-06)

These are the two transitions out of `in_progress` that the Phase 2 WO engine left unimplemented.

**`submitForInspection`** — transitions `in_progress` → `pending_inspection`

```typescript
// convex/mutations/workOrders/submitForInspection.ts
// AUTH: requireOrgMembership(ctx, "amt")

// GUARD SEQUENCE (ordered):
// G1: Fetch WO — throw WO_NOT_FOUND if null
// G2: Org isolation — throw WO_ORG_MISMATCH
// G3: State check — throw WO_INVALID_STATE if wo.status !== "in_progress"
// G4: All task cards must be in terminal or resolvable status.
//     Query taskCards.by_work_order for this workOrderId.
//     For each card: assert status ∈ {"complete", "voided", "incomplete_na_steps"}.
//     A card in status "not_started" or "in_progress" is a blocker.
//     → throw WO_TASK_CARDS_INCOMPLETE {
//         blockerCardIds: string[],
//         message: "N task card(s) are not complete. Complete or void all task cards before submitting for inspection."
//       }
// G5: No open interruptions on any step under this WO (BP-01 pre-check — belt-and-suspenders).
//     Query taskCardInterruptions.by_work_order where resumedAt == null.
//     → throw WO_OPEN_INTERRUPTIONS_BLOCK { interruptionIds: string[] }
// G6: Verify caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Patch workOrder:
//    status → "pending_inspection"
//    submittedForInspectionAt → now
//    submittedForInspectionByTechnicianId → callerTechnicianId
//    updatedAt → now
// 2. Audit log: eventType "status_changed", oldValue "in_progress",
//    newValue "pending_inspection"
//    notes: "Work order submitted for IA inspection by [callerTechnicianId]."

// INVARIANT ENFORCEMENT:
// A work order cannot enter pending_inspection with any task card still in
// active execution. This prevents partial-completion situations where
// the IA begins reviewing a work order that has unresolved steps.

// ERROR CODES:
// WO_NOT_FOUND | WO_ORG_MISMATCH | WO_INVALID_STATE | WO_TASK_CARDS_INCOMPLETE
// WO_OPEN_INTERRUPTIONS_BLOCK | TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

**`flagOpenDiscrepancies`** — transitions `in_progress` → `open_discrepancies`

```typescript
// convex/mutations/workOrders/flagOpenDiscrepancies.ts
// AUTH: requireOrgMembership(ctx, "amt")

// GUARD SEQUENCE (ordered):
// G1: Fetch WO — throw WO_NOT_FOUND if null
// G2: Org isolation — throw WO_ORG_MISMATCH
// G3: State check — throw WO_INVALID_STATE if wo.status !== "in_progress"
// G4: At least one open undispositioned discrepancy must exist for this WO.
//     Query discrepancies.by_work_order where status ∈ {"open", "under_evaluation"}.
//     → throw WO_NO_OPEN_DISCREPANCIES if count == 0.
//       Message: "flagOpenDiscrepancies requires at least one open or under-evaluation
//                 discrepancy linked to this work order."
// G5: Verify caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Patch workOrder:
//    status → "open_discrepancies"
//    openDiscrepanciesFlaggedAt → now
//    openDiscrepanciesFlaggedByTechnicianId → callerTechnicianId
//    updatedAt → now
// 2. Audit log: eventType "status_changed", oldValue "in_progress",
//    newValue "open_discrepancies"
//    notes: "Discrepancies flagged as open by [callerTechnicianId]. 
//            [N] open discrepancy(ies) on record."

// ERROR CODES:
// WO_NOT_FOUND | WO_ORG_MISMATCH | WO_INVALID_STATE | WO_NO_OPEN_DISCREPANCIES
// TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

### 3.3 `cancelWorkOrder` (UM-07)

Cancellation is a customer-decision terminal state. It is distinct from `voidWorkOrder` (administrative error). A cancelled work order may have signed maintenance records; those records are immutable and remain anchored to the work order.

```typescript
// convex/mutations/workOrders/cancelWorkOrder.ts
// AUTH: requireOrgMembership(ctx, "supervisor")
// Rationale: Cancellation is a business decision with customer impact.
//            Requires supervisor or higher. DOM should review in Part 145 orgs.

// GUARD SEQUENCE (ordered):
// G1: Fetch WO — throw WO_NOT_FOUND if null
// G2: Org isolation — throw WO_ORG_MISMATCH
// G3: Terminal state check — throw WO_ALREADY_TERMINAL if wo.status ∈
//     {"closed", "voided", "cancelled"}.
//     Message: "Work order is already in terminal state [status]. Cannot cancel."
// G4: Active safety block — throw WO_CANCEL_IN_PROGRESS_BLOCKED if
//     wo.status ∈ {"pending_inspection", "pending_signoff"}.
//     Message: "A work order in [pending_inspection | pending_signoff] status cannot be
//               cancelled without DOM authorization. Obtain DOM sign-off and use 
//               voidWorkOrder if the work order was opened in error."
//     (Note: cancellation from in_progress IS allowed — customer pulled the aircraft;
//      only inspection-stage or signoff-stage WOs require escalation.)
// G5: cancellationReason must be non-empty — throw WO_CANCELLATION_REASON_REQUIRED
// G6: Verify caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Patch workOrder:
//    status → "cancelled"
//    cancelledAt → now
//    cancelledByUserId → callerUserId (from JWT)
//    cancelledByTechnicianId → callerTechnicianId
//    cancellationReason → args.cancellationReason.trim()
//    updatedAt → now
// 2. Audit log: eventType "status_changed", oldValue "[prior status]",
//    newValue "cancelled"
//    notes: "Work order cancelled. Reason: [cancellationReason]. By: [callerTechnicianId]."

// INVARIANT ENFORCEMENT:
// Cancellation does NOT void maintenance records. If signed records exist,
// they remain valid and immutable. The work order transitions to cancelled
// but stays as the anchor for those records.
// Cancellation from "in_progress" is allowed because no inspection-stage
// actions have been taken. Cancellation from "pending_inspection" or
// "pending_signoff" indicates that inspection work has been partially or
// fully performed — this should route through DOM review and voidWorkOrder,
// not cancellation.

// ERROR CODES:
// WO_NOT_FOUND | WO_ORG_MISMATCH | WO_ALREADY_TERMINAL | WO_CANCEL_IN_PROGRESS_BLOCKED
// WO_CANCELLATION_REASON_REQUIRED | TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

### 3.4 `closeWorkOrder` — Updated with BP-01 and BP-02

The Phase 2 `closeWorkOrder` spec is sound. Two guards must be added before Phase 3 smoke tests.

**BP-01: Open interruptions block close**

Insert as new guard after the existing "all discrepancies dispositioned" check:

```typescript
// BP-01 GUARD (insert after G2 / discrepancy check in existing closeWorkOrder):

const openInterruptions = await ctx.db
  .query("taskCardInterruptions")
  .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
  .filter((q) => q.eq(q.field("resumedAt"), null))  // resumedAt null = interruption not resolved
  .collect();

if (openInterruptions.length > 0) {
  throw new ConvexError({
    code: "WO_CLOSE_OPEN_INTERRUPTIONS",
    count: openInterruptions.length,
    interruptionIds: openInterruptions.map((i) => i._id),
    message: `${openInterruptions.length} step interruption(s) have not been resolved (resumeStep not called). ` +
             `All interruptions must be resolved before a work order can be closed. ` +
             `Resolve the following interruption records: ${openInterruptions.map((i) => i._id).join(", ")}.`,
  });
}
```

**BP-02: RTS hours verification**

Insert after the existing `returnToService` existence check:

```typescript
// BP-02 GUARD (insert immediately after RTS existence check):

if (rts.aircraftHoursAtRts !== args.aircraftTotalTimeAtClose) {
  throw new ConvexError({
    code: "WO_CLOSE_RTS_HOURS_MISMATCH",
    rtsHours: rts.aircraftHoursAtRts,
    closeHours: args.aircraftTotalTimeAtClose,
    message: `INV per schema: returnToService.aircraftHoursAtRts (${rts.aircraftHoursAtRts}h) ` +
             `must equal aircraftTotalTimeAtClose (${args.aircraftTotalTimeAtClose}h). ` +
             `The RTS record was signed at a different aircraft total time than the close time entered. ` +
             `Verify the aircraft total time reading and re-authorize RTS if necessary.`,
  });
}
```

**Updated closeWorkOrder guard sequence (complete ordered list):**

```
G1:  AUTH: requireOrgMembership(ctx, "inspector")
G2:  Fetch WO — WO_NOT_FOUND
G3:  Org isolation — WO_ORG_MISMATCH
G4:  State check: status == "pending_signoff" — WO_INVALID_STATE_FOR_CLOSE
G5:  INV-06/INV-18: aircraftTotalTimeAtClose >= wo.aircraftTotalTimeAtOpen
     → WO_CLOSE_TT_REGRESSION
G6:  All discrepancies dispositioned (status not in {"open","under_evaluation"})
     → WO_CLOSE_OPEN_DISCREPANCIES
G7:  [BP-01] No open interruptions (resumedAt == null) — WO_CLOSE_OPEN_INTERRUPTIONS
G8:  returnToService record exists — WO_CLOSE_NO_RTS_RECORD
G9:  [BP-02] rts.aircraftHoursAtRts == args.aircraftTotalTimeAtClose
     → WO_CLOSE_RTS_HOURS_MISMATCH
G10: Closing technician active in org — TECHNICIAN_NOT_ACTIVE_IN_ORG
G11: INV-20: returnToServiceStatement non-empty — WO_CLOSE_STATEMENT_REQUIRED
G12: [Six-check signatureAuthEvent consumption — see Section 5]
```

---

## Section 4: Task Card Mutations

### 4.1 `reviewNAStep` (UM-01)

**Context:** When `completeStep` marks a step N/A on a task card where `step.signOffRequiresIa == true`, the task card status transitions to `incomplete_na_steps`. This mutation is the IA's formal review of that N/A marking. If the IA concurs that N/A is appropriate, the step is reviewed and the task card can transition to `complete`. If the IA rejects the N/A determination, the step reverts to `pending` for rework.

```typescript
// convex/mutations/taskCards/reviewNAStep.ts
// AUTH: requireOrgMembership(ctx, "inspector")
// Rationale: Only an IA-qualified inspector may review N/A determinations
//            on steps that required IA sign-off.

// ARGS:
// stepId: Id<"taskCardSteps">
// taskCardId: Id<"taskCards">
// signatureAuthEventId: Id<"signatureAuthEvents">  ← required per Section 5
// reviewDecision: "concur_na" | "reject_na"
// reviewNotes: string  ← required non-empty (regulatory decision must be documented)
// callerTechnicianId: Id<"technicians">
// callerIpAddress?: string

// GUARD SEQUENCE (ordered):
// G1: AUTH — requireOrgMembership(ctx, "inspector") → orgId, callerUserId
// G2: Fetch step — throw TC_STEP_NOT_FOUND if null
// G3: Org isolation on step — throw TC_STEP_ORG_MISMATCH
// G4: Step must belong to taskCardId — throw TC_STEP_CARD_MISMATCH
// G5: Step status must be "na" — throw TC_STEP_NOT_NA
//     Message: "reviewNAStep can only be called on steps in 'na' status. 
//               Current status: [status]."
// G6: Step must have signOffRequiresIa == true — throw TC_STEP_IA_REVIEW_NOT_REQUIRED
//     Message: "This step does not require IA review. Only steps marked N/A where
//               signOffRequiresIa == true require an IA review decision."
// G7: Task card status must be "incomplete_na_steps" — throw TC_CARD_NOT_AWAITING_REVIEW
// G8: Caller technician must hold a current IA:
//     Query certificates.by_type for (callerTechnicianId, certificateType="IA")
//     where active == true AND hasIaAuthorization == true AND iaExpiryDate >= now
//     → throw IA_CERT_NOT_CURRENT if not found or expired
//     (Per auth-platform-wiring.md §3.3: iaExpiryDate is always March 31 of applicable year)
// G9: reviewNotes must be non-empty — throw TC_REVIEW_NOTES_REQUIRED
//     Message: "reviewNotes is required. An IA's N/A review determination is a
//               regulatory decision and must be documented."
// G10: [Six-check signatureAuthEvent consumption — Section 5]

// EXECUTION SEQUENCE:
// Branch A: reviewDecision == "concur_na"
//   1. Patch step: naReviewedByIaId → callerTechnicianId, naReviewedAt → now,
//                  naReviewDecision → "concur_na", naReviewNotes → reviewNotes,
//                  signatureAuthEventId → consumed event ID, updatedAt → now
//   2. Recount all steps for this taskCard.
//      If zero steps remain in "na" status with iaReview pending:
//        Patch taskCard: status → "complete", completedAt → now, updatedAt → now
//   3. Audit log: eventType "record_signed", tableName "taskCardSteps",
//      recordId stepId, notes "IA concurred N/A is appropriate. Step [N]. 
//      IA cert [certNumber]. Notes: [reviewNotes]."

// Branch B: reviewDecision == "reject_na"
//   1. Patch step: status → "pending", naReason → null, naAuthorizedById → null,
//                  naAuthorizedAt → null, naReviewedByIaId → callerTechnicianId,
//                  naReviewedAt → now, naReviewDecision → "reject_na",
//                  naReviewNotes → reviewNotes, updatedAt → now
//      (Prior N/A signing data is not fully cleared — reviewDecision and reviewNotes
//       remain as the permanent record of the IA's rejection. The step reverts
//       to pending for rework, but the chain of custody is preserved.)
//   2. Patch taskCard: status → "in_progress" (step is now pending again),
//                      updatedAt → now
//   3. Audit log: eventType "status_changed", tableName "taskCardSteps",
//      notes "IA rejected N/A determination. Step [N] reverted to pending.
//             IA cert [certNumber]. Rejection notes: [reviewNotes]."

// INVARIANT ENFORCEMENT:
// INV-05: signatureAuthEvent consumed atomically with G10 before any execution steps.
// The auth event consumption happens before Branch A or Branch B writes.
// If execution fails after consumption, Convex transaction rollback reverses the consumption.
// No orphaned consumed events.

// ERROR CODES:
// TC_STEP_NOT_FOUND | TC_STEP_ORG_MISMATCH | TC_STEP_CARD_MISMATCH | TC_STEP_NOT_NA
// TC_STEP_IA_REVIEW_NOT_REQUIRED | TC_CARD_NOT_AWAITING_REVIEW | IA_CERT_NOT_CURRENT
// TC_REVIEW_NOTES_REQUIRED | [Section 5 error codes]
```

---

### 4.2 `counterSignStep` (UM-02)

**Context:** Steps where `signOffRequiresIa == true` require both a primary AMT signature (via `completeStep`) and an IA counter-signature. The counter-signature is a distinct regulatory act written to `taskCardStepCounterSignatures` (SE-01 table from schema-v2.1). This mutation creates that record.

```typescript
// convex/mutations/taskCards/counterSignStep.ts
// AUTH: requireOrgMembership(ctx, "inspector")

// ARGS:
// stepId: Id<"taskCardSteps">
// taskCardId: Id<"taskCards">
// signatureAuthEventId: Id<"signatureAuthEvents">   ← required per Section 5
// counterSignType: "ia_inspection" | "inspector_qc" | "dual_amt"
// scopeStatement: string   ← required, non-empty
// ratingsExercised: ("airframe" | "powerplant" | "ia" | "none")[]
// callerTechnicianId: Id<"technicians">
// callerIpAddress?: string

// GUARD SEQUENCE (ordered):
// G1: AUTH — requireOrgMembership(ctx, "inspector") → orgId, callerUserId
// G2: Fetch step — throw TC_STEP_NOT_FOUND if null
// G3: Org isolation — throw TC_STEP_ORG_MISMATCH
// G4: Step must belong to taskCardId — throw TC_STEP_CARD_MISMATCH
// G5: Step status must be "completed" (primary signature already present)
//     → throw TC_STEP_NOT_SIGNED_BY_PRIMARY
//     Message: "counterSignStep requires the step to already be signed by the 
//               primary AMT (status: completed). Call completeStep first."
// G6: Step must have signOffRequiresIa == true (or requiresDualSignOff == true)
//     → throw TC_COUNTER_SIGN_NOT_REQUIRED
// G7: Counter-signature not already present for this step.
//     Query taskCardStepCounterSignatures.by_step where stepId == args.stepId
//     → throw TC_COUNTER_SIGN_ALREADY_EXISTS if record found
//     Message: "A counter-signature already exists for step [stepNumber]. 
//               Each step may only receive one counter-signature."
// G8: If counterSignType == "ia_inspection": caller must hold current IA.
//     Same IA currency check as reviewNAStep G8.
//     → throw IA_CERT_NOT_CURRENT
// G9: Validate ratingsExercised against caller's certificate.ratings[]:
//     Each selected rating must be held by the caller.
//     → throw SIGN_RATING_NOT_HELD { selected: rating, held: cert.ratings }
//     (Per RQ-05 determination — technician declares, system validates)
// G10: If caller is same technician as step.signedByTechnicianId:
//      They may only counter-sign if counterSignType == "ia_inspection" AND they hold IA.
//      A second A&P self-counter-sign (dual_amt) by the same person is not valid.
//      → throw TC_COUNTER_SIGN_SELF_DUAL_AMT
// G11: scopeStatement must be non-empty — throw TC_SCOPE_STATEMENT_REQUIRED
// G12: [Six-check signatureAuthEvent consumption — Section 5]

// EXECUTION SEQUENCE:
// 1. Fetch caller's active certificate for snapshot fields:
//    counterSignedLegalName, counterSignedCertNumber
// 2. Insert taskCardStepCounterSignatures:
//    stepId, taskCardId, workOrderId (from step), organizationId
//    counterSignType, counterSignedByTechnicianId → callerTechnicianId
//    counterSignedLegalName → cert.legalName (snapshot)
//    counterSignedCertNumber → cert.certificateNumber (snapshot)
//    counterSignedAt → now
//    counterSignRatingsExercised → args.ratingsExercised
//    counterSignatureAuthEventId → consumed event ID
//    scopeStatement → args.scopeStatement.trim()
//    createdAt → now
// 3. Update step: patch updatedAt → now
//    (Step status remains "completed" — the counter-signature is additive,
//     not a status change on the step document itself.)
// 4. Audit log: eventType "record_signed", tableName "taskCardStepCounterSignatures",
//    recordId → new counter-signature record ID
//    notes: "Counter-signature applied to step [stepNumber]. Type: [counterSignType].
//            Cert: [counterSignedCertNumber]. Ratings: [ratingsExercised].
//            Scope: [scopeStatement truncated to 100 chars]."

// INVARIANT ENFORCEMENT:
// INV-05: six-check consumption (Section 5).
// The counter-signature's authEvent is distinct from the primary step's authEvent.
// Each auth event is single-use. Two different events must be consumed for 
// a dual-signed step.
// Snapshot principle: legalName and certNumber are written at signing time.
// If the technician's certificate is revoked after signing, the historical
// record of what was current at signing time is preserved.

// ERROR CODES:
// TC_STEP_NOT_FOUND | TC_STEP_ORG_MISMATCH | TC_STEP_CARD_MISMATCH
// TC_STEP_NOT_SIGNED_BY_PRIMARY | TC_COUNTER_SIGN_NOT_REQUIRED
// TC_COUNTER_SIGN_ALREADY_EXISTS | IA_CERT_NOT_CURRENT | SIGN_RATING_NOT_HELD
// TC_COUNTER_SIGN_SELF_DUAL_AMT | TC_SCOPE_STATEMENT_REQUIRED | [Section 5 codes]
```

---

### 4.3 `interruptStep` / `resumeStep` (UM-03)

**Context:** Interruptions are first-class events, not edge cases. Every unresolved interruption (resumedAt == null) blocks `closeWorkOrder` (BP-01). The `taskCardInterruptions` table (SE-02) stores these.

**`interruptStep`**

```typescript
// convex/mutations/taskCards/interruptStep.ts
// AUTH: requireOrgMembership(ctx, "amt")

// ARGS:
// stepId: Id<"taskCardSteps">
// taskCardId: Id<"taskCards">
// interruptionType: "shift_change" | "parts_hold" | "deferred_maintenance" |
//                   "tooling_unavailable" | "awaiting_engineering_order" |
//                   "rdd_hold" | "supervisor_review" | "other"
// interruptionReason: string   ← non-empty
// workStatusAtInterruption: string   ← non-empty; what state the work is in
// safetyPreservationTaken: string   ← non-empty; caps on, panels closed, etc.
// deferralDiscrepancyId?: Id<"discrepancies">   ← if formal deferral
// deferredToWorkOrderId?: Id<"workOrders">      ← if deferred_maintenance type
// callerTechnicianId: Id<"technicians">
// callerIpAddress?: string

// GUARD SEQUENCE (ordered):
// G1: AUTH — requireOrgMembership(ctx, "amt")
// G2: Fetch step — throw TC_STEP_NOT_FOUND
// G3: Org isolation — throw TC_STEP_ORG_MISMATCH
// G4: Step must belong to taskCardId — throw TC_STEP_CARD_MISMATCH
// G5: Step status must be "pending" — throw TC_STEP_NOT_INTERRUPTIBLE
//     Message: "Cannot interrupt a step in status [status]. Only pending steps
//               can be interrupted. Completed or N/A steps are already terminal."
// G6: Task card status must be "in_progress" — throw TC_CARD_NOT_IN_PROGRESS
// G7: No existing open interruption for this step:
//     Query taskCardInterruptions.by_step where stepId == args.stepId AND resumedAt == null
//     → throw TC_STEP_ALREADY_INTERRUPTED if found
//     Message: "Step [stepNumber] already has an open interruption (ID: [id]).
//               Resume or resolve the existing interruption before creating a new one."
// G8: interruptionReason, workStatusAtInterruption, safetyPreservationTaken
//     must all be non-empty — throw TC_INTERRUPTION_FIELDS_REQUIRED {field: string}
// G9: If interruptionType == "deferred_maintenance":
//     assert deferredToWorkOrderId is provided — throw TC_DEFERRAL_WO_REQUIRED
// G10: Caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Insert taskCardInterruptions:
//    stepId, taskCardId, workOrderId (from step), organizationId
//    interruptionType, interruptedByTechnicianId → callerTechnicianId
//    interruptedAt → now
//    interruptionReason → args.interruptionReason.trim()
//    workStatusAtInterruption → args.workStatusAtInterruption.trim()
//    safetyPreservationTaken → args.safetyPreservationTaken.trim()
//    resumedAt → null (open interruption)
//    deferralDiscrepancyId → args.deferralDiscrepancyId (optional)
//    deferredToWorkOrderId → args.deferredToWorkOrderId (optional)
//    createdAt → now, updatedAt → now
// 2. Patch step: updatedAt → now (step status remains "pending" — interruption
//    does NOT change step status; the step is still pending completion)
// 3. Audit log: eventType "record_created", tableName "taskCardInterruptions"
//    notes: "Step [stepNumber] interrupted. Type: [interruptionType].
//            Work state: [workStatusAtInterruption]. Safety: [safetyPreservationTaken].
//            Reason: [interruptionReason]."

// INVARIANT ENFORCEMENT:
// Step status DOES NOT change on interrupt. The step remains "pending".
// This is intentional: the interruption record documents WHY the step wasn't
// completed at this moment; the step itself awaits completion or N/A.
// The BP-01 guard queries resumedAt == null — this is the open interruption state.

// ERROR CODES:
// TC_STEP_NOT_FOUND | TC_STEP_ORG_MISMATCH | TC_STEP_CARD_MISMATCH
// TC_STEP_NOT_INTERRUPTIBLE | TC_CARD_NOT_IN_PROGRESS | TC_STEP_ALREADY_INTERRUPTED
// TC_INTERRUPTION_FIELDS_REQUIRED | TC_DEFERRAL_WO_REQUIRED | TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

**`resumeStep`**

```typescript
// convex/mutations/taskCards/resumeStep.ts
// AUTH: requireOrgMembership(ctx, "amt")

// ARGS:
// interruptionId: Id<"taskCardInterruptions">
// stepId: Id<"taskCardSteps">
// taskCardId: Id<"taskCards">
// resumptionNotes: string   ← required; documents handoff state
// callerTechnicianId: Id<"technicians">
// callerIpAddress?: string

// GUARD SEQUENCE (ordered):
// G1: AUTH — requireOrgMembership(ctx, "amt")
// G2: Fetch interruption record — throw TC_INTERRUPTION_NOT_FOUND
// G3: Org isolation on interruption — throw TC_INTERRUPTION_ORG_MISMATCH
// G4: Interruption must reference args.stepId — throw TC_INTERRUPTION_STEP_MISMATCH
// G5: Interruption must be open: resumedAt == null
//     → throw TC_INTERRUPTION_ALREADY_RESUMED
//     Message: "Interruption [interruptionId] was already resumed at [resumedAt]
//               by technician [resumedByTechnicianId]."
// G6: resumptionNotes must be non-empty — throw TC_RESUMPTION_NOTES_REQUIRED
//     Message: "resumptionNotes is required. Document the work state at resumption
//               to establish continuity of work per AC 43-9C."
// G7: Caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Patch taskCardInterruptions:
//    resumedAt → now
//    resumedByTechnicianId → callerTechnicianId
//    resumptionNotes → args.resumptionNotes.trim()
//    updatedAt → now
// 2. Patch step: updatedAt → now
//    (Step status remains "pending" — resuming does not complete the step)
// 3. Audit log: eventType "record_updated", tableName "taskCardInterruptions"
//    recordId → interruptionId
//    notes: "Step [stepNumber] work resumed by [callerTechnicianId].
//            Interruption duration: [now - interruptedAt] ms.
//            Resumption notes: [resumptionNotes]."

// INVARIANT ENFORCEMENT:
// resumedAt is set exactly once — G5 prevents double-resume.
// The interruption record is now "closed" (resumedAt != null).
// The BP-01 guard in closeWorkOrder will not find this record because
// it filters on resumedAt == null.
// Step status is NOT changed here. The resuming technician must call
// completeStep to actually complete the step.

// ERROR CODES:
// TC_INTERRUPTION_NOT_FOUND | TC_INTERRUPTION_ORG_MISMATCH | TC_INTERRUPTION_STEP_MISMATCH
// TC_INTERRUPTION_ALREADY_RESUMED | TC_RESUMPTION_NOTES_REQUIRED | TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

### 4.4 `voidTaskCard` (UM-04)

```typescript
// convex/mutations/taskCards/voidTaskCard.ts
// AUTH: requireOrgMembership(ctx, "supervisor")

// ARGS:
// taskCardId: Id<"taskCards">
// voidReason: string   ← non-empty
// callerTechnicianId: Id<"technicians">
// callerIpAddress?: string

// GUARD SEQUENCE (ordered):
// G1: AUTH — requireOrgMembership(ctx, "supervisor")
// G2: Fetch task card — throw TC_CARD_NOT_FOUND
// G3: Org isolation — throw TC_CARD_ORG_MISMATCH
// G4: Card status must be "not_started" or "in_progress"
//     → throw TC_CARD_NOT_VOIDABLE
//     Message: "voidTaskCard can only be called on cards in not_started or
//               in_progress status. Status [status] is not voidable."
// G5: No signed steps present on this task card.
//     Query taskCardSteps.by_task_card where status == "completed".
//     → throw TC_CARD_HAS_SIGNED_STEPS { signedStepCount: N, stepNumbers: [] }
//     Message: "Task card [taskCardNumber] has [N] signed step(s) (step numbers: X, Y, Z).
//               A task card with signed steps cannot be voided. Signed steps are permanent
//               audit records. Contact your DOM for guidance."
// G6: Parent work order must be open or in_progress — throw TC_VOID_WO_NOT_ACTIVE
//     Message: "Cannot void a task card on a work order in status [status].
//               The work order must be open or in_progress."
// G7: voidReason must be non-empty — throw TC_VOID_REASON_REQUIRED
// G8: Caller technician active in org — throw TECHNICIAN_NOT_ACTIVE_IN_ORG

// EXECUTION SEQUENCE:
// 1. Patch all "pending" steps to a void-adjacent state:
//    For each step in status "pending": patch updatedAt → now.
//    (Steps are not deleted — they remain as the historical record of what was planned.)
// 2. Patch taskCard:
//    status → "voided"
//    voidedAt → now
//    voidedByTechnicianId → callerTechnicianId
//    voidedReason → args.voidReason.trim()
//    updatedAt → now
// 3. Audit log: eventType "status_changed", tableName "taskCards"
//    oldValue → prior status, newValue → "voided"
//    notes: "Task card [taskCardNumber] voided by supervisor [callerTechnicianId].
//            Reason: [voidReason]. [N] unsigned steps present at void."

// INVARIANT ENFORCEMENT:
// A voided task card is a permanent audit record. The card document remains.
// The steps remain. Nothing is deleted. The "voided" status is terminal.
// The parent work order's task card count is not decremented — the voided
// card still counts in the work order's historical record.
// closeWorkOrder guard on task card completeness (G4 of submitForInspection)
// allows "voided" as an acceptable terminal status.

// ERROR CODES:
// TC_CARD_NOT_FOUND | TC_CARD_ORG_MISMATCH | TC_CARD_NOT_VOIDABLE
// TC_CARD_HAS_SIGNED_STEPS | TC_VOID_WO_NOT_ACTIVE | TC_VOID_REASON_REQUIRED
// TECHNICIAN_NOT_ACTIVE_IN_ORG
```

---

## Section 5: The `signatureAuthEvent` Six-Check Atomic Consumption Sequence

This sequence applies to every signing mutation in the system without exception. It is specified here once. Every mutation that consumes a `signatureAuthEvent` references this section by name: "apply Section 5 consumption sequence."

```typescript
// convex/lib/consumeSignatureAuthEvent.ts
// This is the canonical sequence. Do not inline partial versions.

async function consumeSignatureAuthEvent(
  ctx: MutationCtx,
  args: {
    signatureAuthEventId: Id<"signatureAuthEvents">;
    callerTechnicianId: Id<"technicians">;
    consumingTable: string;
    consumingRecordId: string;
  }
): Promise<void> {
  const now = Date.now();

  // CHECK 1 — EXISTS
  // The event document must be retrievable.
  const authEvent = await ctx.db.get(args.signatureAuthEventId);
  if (!authEvent) {
    throw new ConvexError({
      code: "AUTH_EVENT_NOT_FOUND",
      eventId: args.signatureAuthEventId,
      message: "signatureAuthEvent not found. Request a new re-authentication.",
    });
  }

  // CHECK 2 — UNCONSUMED
  // Each auth event may only be used for exactly one signing action.
  // This is INV-05. It prevents replay attacks and double-signing.
  if (authEvent.consumed) {
    throw new ConvexError({
      code: "AUTH_EVENT_ALREADY_CONSUMED",
      eventId: args.signatureAuthEventId,
      consumedAt: authEvent.consumedAt,
      consumedByTable: authEvent.consumedByTable,
      consumedByRecordId: authEvent.consumedByRecordId,
      message: "This re-authentication event has already been used for a prior sign-off. " +
               "Each re-authentication authorizes exactly one signature. " +
               "Complete a new re-authentication to obtain a fresh event.",
    });
  }

  // CHECK 3 — NOT EXPIRED
  // TTL is 5 minutes from authenticatedAt. Enforced here at the mutation layer.
  // The frontend timer is informational only and does not substitute for this check.
  if (authEvent.expiresAt < now) {
    throw new ConvexError({
      code: "AUTH_EVENT_EXPIRED",
      eventId: args.signatureAuthEventId,
      expiredAt: authEvent.expiresAt,
      expiredAtIso: new Date(authEvent.expiresAt).toISOString(),
      message: `Re-authentication event expired at ${new Date(authEvent.expiresAt).toISOString()}. ` +
               "Complete a new re-authentication to obtain a fresh event.",
    });
  }

  // CHECK 4 — IDENTITY MATCH
  // The auth event was issued to a specific technician.
  // It cannot be used by a different technician. Non-transferable.
  if (authEvent.technicianId !== args.callerTechnicianId) {
    throw new ConvexError({
      code: "AUTH_EVENT_IDENTITY_MISMATCH",
      eventId: args.signatureAuthEventId,
      issuedTo: authEvent.technicianId,
      callerIs: args.callerTechnicianId,
      message: "Re-authentication event was issued to a different technician. " +
               "Auth events are non-transferable. The signing technician must " +
               "complete their own re-authentication.",
    });
  }

  // CHECK 5 — CONSUME (atomic with CHECK 6)
  // Mark the event as consumed. This write and the primary record write (CHECK 6)
  // occur in the same Convex transaction. If either fails, both are rolled back.
  // No orphaned consumed events. No consumed events without a corresponding record.
  await ctx.db.patch(args.signatureAuthEventId, {
    consumed: true,
    consumedAt: now,
    consumedByTable: args.consumingTable,
    consumedByRecordId: args.consumingRecordId,
  });

  // CHECK 6 — The calling mutation writes the primary record AFTER this function returns.
  // The Convex transaction guarantees checks 5 and 6 are atomic.
  // This function does not write the primary record — it prepares for it.
  // The caller must complete the primary write in the same transaction.
}

// Usage pattern in every signing mutation:
// await consumeSignatureAuthEvent(ctx, {
//   signatureAuthEventId: args.signatureAuthEventId,
//   callerTechnicianId: args.callerTechnicianId,
//   consumingTable: "taskCardSteps",           ← the table being signed
//   consumingRecordId: args.stepId,            ← the record being signed
// });
// // Then immediately: await ctx.db.patch(args.stepId, { ... signing fields ... });
```

**Mutations applying Section 5:**
- `completeStep` (action="complete") — per step
- `reviewNAStep` — per IA review decision
- `counterSignStep` — per counter-signature
- `signTaskCard` — per card-level sign-off
- `closeWorkOrder` — RTS closing signature
- `authorizeReturnToService` — RTS creation signature
- `recordAdCompliance` — AD compliance recording signature

---

## Section 6: Marcus's RQ Determinations Applied

For each of RQ-01 through RQ-06 from compliance-validation.md, the following documents what changed (or did not change) in the relevant mutation guard.

### RQ-01 — Shelf-Life Override: Warn vs. Block on Installed Parts

**Determination (Marcus):** Do NOT apply a uniform hard-block on shelf-life-expired installed parts. Installation guard (G6 in `installPart`) hard-blocks on `shelfLifeLimitDate < now()` at install time — this is unchanged and correct. In-service parts that pass shelf-life receive different treatment based on `shelfLifeEnforcementLevel` field (new field per RQ-01 on `parts` table):

**Guard change in `installPart`:** No change to the installation-time hard-block. The new `shelfLifeEnforcementLevel` field affects only the nightly scheduled shelf-life check behavior — not the mutation. The guard that already existed (`shelfLifeLimitDate < now() → throw PART_SHELF_LIFE_EXPIRED`) remains as specified.

**New field required:** `shelfLifeEnforcementLevel: "warning_only" | "mandatory_removal"` on `parts` table. Default `"warning_only"`. The scheduled function (not a mutation) checks this field when generating shelf-life expiry alerts for in-service parts. `mandatory_removal` items escalate immediately to DOM notification.

**Cross-reference:** compliance-validation.md §1 (RQ-01 formal determination).

---

### RQ-02 — Cycle Counter Requirement Timing

**Determination (Marcus):** Cycle tracking is mandatory at aircraft creation for turbine and pressurized aircraft. The trigger is aircraft type, not installation event.

**Guard change in `createAircraft`:** Add guard: if `aircraftCategory ∈ {"turbine", "pressurized"}`, then `totalTimeAirframeCycles` is required (not optional). Throw `AIRCRAFT_CYCLES_REQUIRED_FOR_TYPE` if null.

**Guard change in `recordAdCompliance` (UM-08, pending full implementation):** Before recording compliance for any AD where `adCompliance.complianceType` includes `"cycles"`: assert `aircraft.totalTimeAirframeCycles != null`. Throw `AD_COMPLIANCE_CYCLES_REQUIRED`.

**Guard change in Phase 3 mutations documented here:** None of the mutations in this document (UM-01 through UM-07) directly involve cycle counters. The RQ-02 changes are upstream (`createAircraft`) and downstream (`recordAdCompliance` / UM-08). Note this for the UM-08 implementation.

**Cross-reference:** compliance-validation.md §1 (RQ-02 formal determination).

---

### RQ-03 — 8130-3 Quantity Validation: Hard-Block

**Determination (Marcus):** Hard-block. No warning. No override for LLPs. Supervisor override with documented reason is acceptable for non-LLP parts only.

**Guard change in `receivePart` (bulk mode):** Count existing `parts` records referencing the same `eightOneThirtyId`. If `existingCount + newCount > eightOneThirtyRecord.quantity`:
  - If any part being received has `isLifeLimited == true`: throw `PART_QUANTITY_EXCEEDS_TAG_LLP` unconditionally. No override.
  - If non-LLP: throw `PART_QUANTITY_EXCEEDS_TAG` with optional override path: if `supervisorOverrideAuthEventId` is provided, apply Section 5 consumption sequence and write override event to audit log with supervisor's `technicianId` and certificate number.

**Phase 3 mutation impact:** No impact on UM-01 through UM-07. The guard change is in `receivePart` (Phase 2 spec). Coordinate with Phase 2 `receivePart` implementation.

**Cross-reference:** compliance-validation.md §1 (RQ-03 formal determination, including Rosa's dissent and Marcus's response on LLP exception).

---

### RQ-04 — Owner-Supplied Parts with CoC

**Determination (Marcus):** CoC is acceptable for new-from-manufacturer parts only, with additional conditions. Parts with no documentation go to quarantine, not inventory.

**Guard change in `receivePart`:** If `documentationType == "no_documentation"`: route directly to quarantine (`location: "quarantine"`) rather than `inventory`. `quarantineReason` required.

**Guard change in `installPart` (G8 extension):** If `part.documentationType == "coc_only"`: assert that a receiving inspection record (`maintenanceRecords` entry of `recordType: "maintenance_43_9"`) exists referencing this part, AND the creating technician held an A&P. Throw `PART_COC_RECEIVING_INSPECTION_REQUIRED` if not found.

**New enum value required:** `documentationType: "8130_3" | "coc_only" | "pma_marked" | "tso_marked" | "no_documentation"` on `parts` table.

**Phase 3 mutation impact:** No impact on UM-01 through UM-07.

**Cross-reference:** compliance-validation.md §1 (RQ-04 formal determination).

---

### RQ-05 — Ratings-Exercised: Technician Declares, System Validates

**Determination (Marcus):** Technician declares. System validates against held certificates. System may pre-populate as a convenience but must not silently accept pre-populated values.

**Guard change in `completeStep`:** The existing guard already requires `ratingsExercised` to be non-empty (INV-02). Add new guard: validate each selected rating against `cert.ratings[]` for the signing technician. If a selected rating is not held, throw `SIGN_RATING_NOT_HELD { selected: rating, held: cert.ratings }`.

This is a new check not in the Phase 2 `completeStep` spec. It applies to `completeStep`, `reviewNAStep`, `counterSignStep`, and `signTaskCard` — all mutations that capture `ratingsExercised`.

**Practical implementation:** After fetching the signing technician's active certificate, before consuming the auth event:

```typescript
// RQ-05 guard — add to all signing mutations after cert fetch
for (const rating of args.ratingsExercised) {
  if (rating === "none") continue;  // "none" is a valid declaration (e.g., inspection-only)
  if (!cert.ratings.includes(rating)) {
    throw new ConvexError({
      code: "SIGN_RATING_NOT_HELD",
      selected: rating,
      held: cert.ratings,
      message: `Technician ${args.callerTechnicianId} selected rating "${rating}" ` +
               `but holds only: ${cert.ratings.join(", ")}. ` +
               `The rating exercised must match a held certificate rating.`,
    });
  }
}
```

**Cross-reference:** compliance-validation.md §1 (RQ-05 formal determination).

---

### RQ-06 — RTS Statement Minimum Content

**Determination (Marcus):** Keyword check AND character floor. Both. The character floor is raised from 50 to 75 characters. Three separate assertion checks, three separate error codes.

**Guard change in `authorizeReturnToService` PRECONDITION 9:**

Replace existing character-floor-only check with:

```typescript
// RQ-06: Three assertions — all must pass
const stmt = args.returnToServiceStatement.trim();

// Assertion 1: Character floor
if (stmt.length < 75) {
  throw new ConvexError({
    code: "RTS_STATEMENT_TOO_SHORT",
    length: stmt.length,
    required: 75,
    message: "returnToServiceStatement must be at least 75 characters. " +
             "A regulatory return-to-service statement must be substantive.",
  });
}

// Assertion 2: Regulatory citation
const hasCitation = /14 cfr/i.test(stmt) || /part 43/i.test(stmt);
if (!hasCitation) {
  throw new ConvexError({
    code: "RTS_STATEMENT_NO_CITATION",
    message: "returnToServiceStatement must contain a regulatory citation. " +
             "Include '14 CFR' or 'Part 43' in the statement. " +
             "Example: '...in accordance with 14 CFR Part 43...'",
  });
}

// Assertion 3: Airworthiness determination
const hasDetermination = /return/i.test(stmt) || /airworthy/i.test(stmt);
if (!hasDetermination) {
  throw new ConvexError({
    code: "RTS_STATEMENT_NO_DETERMINATION",
    message: "returnToServiceStatement must contain an airworthiness determination. " +
             "Include 'return' (returned to service) or 'airworthy' in the statement.",
  });
}
```

**Note:** Three separate error codes allow the frontend to show the technician exactly what is missing, not just "statement invalid." Do not collapse these into a single error.

**Cross-reference:** compliance-validation.md §1 (RQ-06 formal determination).

---

## Section 7: Cilla's Implementation Checklist

*Written in Cilla's voice. These are the exact checks I run when the test matrix executes against Phase 3 mutations. If any of these fail, the mutation is not ready for merge. "Close enough" is not a concept I recognize.*

---

**CHECK 1 — Auth wrapper presence on every mutation.**
I will call each Phase 3 mutation with no Clerk session. I expect `AUTH_REQUIRED`. If I get any other error — including a successful execution — that mutation ships without auth and I'm filing it as a P0 blocker regardless of what the spec says. No exceptions. Run `requireOrgMembership` first. Always.

**CHECK 2 — Client cannot supply orgId.**
I will call `placeWorkOrderOnHold`, `submitForInspection`, `cancelWorkOrder`, and `releaseWorkOrderHold` with an `organizationId` argument pointing to a different org's work order. The mutation must derive orgId from the JWT and reject the call on org isolation (WO_ORG_MISMATCH), not silently operate on the wrong org's data. If the mutation accepts client-supplied org context: P0 blocker.

**CHECK 3 — State transition guards are strict.**
For each UM-05 through UM-07 mutation, I will call it with the work order in every status it is NOT supposed to accept. `placeWorkOrderOnHold` on a `draft` WO: `WO_INVALID_STATE_FOR_HOLD`. `cancelWorkOrder` on a `closed` WO: `WO_ALREADY_TERMINAL`. `submitForInspection` on an `on_hold` WO: `WO_INVALID_STATE`. If any of these return anything other than the expected error code, it fails. The state machine is not a suggestion.

**CHECK 4 — BP-01: open interruptions block closeWorkOrder.**
Setup: create a work order in `pending_signoff` status with one open `taskCardInterruptions` record (resumedAt null). Call `closeWorkOrder`. Expected: `WO_CLOSE_OPEN_INTERRUPTIONS`. I will also verify that the interruption count in the error payload matches the actual number of open interruption records. If the guard runs but the count is wrong, I'm flagging it.

**CHECK 5 — BP-02: RTS hours mismatch blocks closeWorkOrder.**
Setup: create a `returnToService` record with `aircraftHoursAtRts: 1000.0`. Call `closeWorkOrder` with `aircraftTotalTimeAtClose: 1001.5`. Expected: `WO_CLOSE_RTS_HOURS_MISMATCH`. This must be a throw, not a warning. I'm not interested in "the UI shows a warning." The mutation throws or it doesn't. If it doesn't throw on a mismatch, BP-02 is not implemented.

**CHECK 6 — Section 5 six-check consumption in every signing mutation.**
For each signing mutation (reviewNAStep, counterSignStep, signTaskCard, closeWorkOrder), I run four targeted tests:
  - (a) Auth event not found → `AUTH_EVENT_NOT_FOUND`
  - (b) Already consumed auth event → `AUTH_EVENT_ALREADY_CONSUMED`
  - (c) Expired auth event (expiresAt = now - 1ms) → `AUTH_EVENT_EXPIRED`
  - (d) Auth event issued to technician A, called by technician B → `AUTH_EVENT_IDENTITY_MISMATCH`
All four must throw. If any signing mutation passes on a consumed or expired event, it is a regulatory defect and I will not sign off on Phase 3.

**CHECK 7 — RQ-05: rating validation in completeStep and counterSignStep.**
I will call `completeStep` with a technician who holds only an airframe rating, selecting `ratingsExercised: ["powerplant"]`. Expected: `SIGN_RATING_NOT_HELD`. I will also call it with `ratingsExercised: ["airframe"]` for the same technician. Expected: success (if all other guards pass). This test must be in the matrix for every signing mutation, not just `completeStep`.

**CHECK 8 — RQ-06: three-assertion RTS statement validation.**
Three separate tests for `authorizeReturnToService`:
  - (a) 60-character statement with valid keywords → `RTS_STATEMENT_TOO_SHORT`
  - (b) 80-character statement with no citation → `RTS_STATEMENT_NO_CITATION`
  - (c) 80-character statement with "14 CFR Part 43" but no "return" or "airworthy" → `RTS_STATEMENT_NO_DETERMINATION`
  - (d) Valid statement (≥75 chars, contains "14 CFR", contains "airworthy") → success (assuming all other preconditions pass)
Three error codes. I check that each test returns exactly the right code, not a generic validation error. The frontend error handler maps these codes to specific user messages.

**CHECK 9 — interruptStep does not change step status.**
After calling `interruptStep` on a pending step, fetch the step document. Assert `step.status == "pending"`. If the step status changed on interrupt, the implementation is wrong. Interruptions are records of work pauses, not step completions.

**CHECK 10 — resumeStep closes interruption and does not complete the step.**
After calling `resumeStep`: fetch the interruption record and assert `resumedAt != null`. Fetch the step and assert `status == "pending"`. Call `closeWorkOrder` on the work order — the closed interruption must NOT trigger BP-01. If it does, the BP-01 query is filtering incorrectly.

**CHECK 11 — voidTaskCard blocked when signed steps exist.**
Setup: task card with one completed step. Call `voidTaskCard`. Expected: `TC_CARD_HAS_SIGNED_STEPS` with the correct count and step numbers in the payload. The guard must query the database for completed steps, not rely on the denormalized `completedStepCount` field — if the counter drifted, the guard should still catch signed steps via the actual step documents.

**CHECK 12 — counterSignStep cannot duplicate.**
Call `counterSignStep` twice on the same step. Second call: `TC_COUNTER_SIGN_ALREADY_EXISTS`. The idempotency guard must use a DB query against `taskCardStepCounterSignatures.by_step`, not an in-memory check.

**CHECK 13 — reviewNAStep IA currency check is a hard block.**
Setup: technician with `iaExpiryDate = now - 86400000` (expired yesterday). Call `reviewNAStep`. Expected: `IA_CERT_NOT_CURRENT`. Then run the same test with `iaExpiryDate = now + 86400000` (valid). Expected: proceed past G8. The March 31 rule is not a grace period. Yesterday is too late.

**CHECK 14 — Audit log entry present on every mutation.**
For every Phase 3 mutation in this document, after a successful execution I query `auditLog.by_record` for the affected record and assert at minimum one new entry exists with the correct `eventType`, `tableName`, `recordId`, and `userId`. A mutation that succeeds without writing an audit log entry fails this check unconditionally.

**CHECK 15 — cancelWorkOrder blocked from pending_inspection and pending_signoff.**
Call `cancelWorkOrder` on a WO in `pending_inspection` status. Expected: `WO_CANCEL_IN_PROGRESS_BLOCKED`. Same for `pending_signoff`. `in_progress` status: expected success (assuming other guards pass). The guard boundary is exactly at inspection entry — if the work order has reached the inspection stage, cancellation requires escalation.

---

*Devraj Anand — Backend, Phase 3 Mutation Implementation*
*Regulatory review: Marcus Webb (compliance-validation.md RQ-01 through RQ-06)*
*QA contract: Cilla Oduya (Section 7)*
*Schema basis: convex-schema-v2.md (FROZEN) + schema-v2.1.md*
*Resolves: UM-01, UM-02, UM-03, UM-04, UM-05, UM-06, UM-07, BP-01, BP-02*
*This document is authoritative for Phase 3 mutation implementation. All guard sequences, error codes, and invariant enforcements in this document are binding on the implementation. Deviations require written sign-off from Rafael Mendoza (Tech Lead) and Cilla Oduya (QA Lead).*
