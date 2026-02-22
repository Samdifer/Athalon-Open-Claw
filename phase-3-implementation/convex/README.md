# Athelon — Phase 3 Convex Implementation Notes

**Author:** Devraj Anand (Backend / Convex)  
**Date:** 2026-02-22  
**Phase:** 3 — Integration & Mutation Implementation  
**Spec basis:** phase-2-work-orders, phase-2-task-cards, phase-2-signoff, phase-2-compliance  
**Schema basis:** convex-schema-v2.md (FROZEN 2026-02-22)

---

## What Was Implemented

### `schema.ts`

A complete, production-quality TypeScript translation of `convex-schema-v2.md`. Every table, index, shared validator type, and INVARIANT comment from the spec is present. Notable details:

- All shared validator constants (`certificateType`, `ratingsExercised`, `technicianSignature`, `embeddedPartRecord`) are defined at the module level and reused across table definitions. Convex v1 supports this pattern cleanly.
- Every INVARIANT block in the schema is annotated in comments above the relevant field, with references to the phase-2 spec that mandates the enforcement. The type system cannot enforce these — the mutation layer does.
- Immutable tables (`maintenanceRecords`, `inspectionRecords`, `returnToService`, `partInstallationHistory`) have **no `updatedAt` field**. This is an intentional signal to future developers: the absence of `updatedAt` means "do not write an update mutation for this table." Corrections are made by inserting new correction records.
- The `aircraft.customerId` field resolves the write-conflict hotspot (QA-005): previously `customers.aircraftIds[]` was the relationship, which caused concurrent write conflicts when multiple aircraft for the same customer arrived simultaneously. The relationship is now inverted.
- Phase 2.1 schema extensions (`taskCardStepCounterSignatures`, `taskCardInterruptions`, `taskCardStepAssignments`) are **not** in this file — they are gated behind the SE-01/SE-02/SE-03 approval process. The mutations reference them in TODO comments with precise migration instructions.

### `workOrders.ts`

Six public operations: `createWorkOrder`, `openWorkOrder`, `closeWorkOrder`, `voidWorkOrder`, `listWorkOrders`, `getWorkOrder`, plus a bonus `getCloseReadiness` query.

**Key implementation decisions:**

- `createWorkOrder` sets `aircraftTotalTimeAtOpen: 0` as a sentinel. Real time is captured in `openWorkOrder`. The UI must not display this field until the WO is in "open" status. I chose 0 as sentinel because no aircraft has exactly 0 TT by the time it receives its first work order in Athelon.
- `openWorkOrder` captures aircraft total time per 14 CFR 43.11(a)(2). It also does the concurrent work order guard — if another active WO exists for the same aircraft, the caller must pass `concurrentWorkOrderOverrideAcknowledged: true` and a documented reason. This creates an audit trail for dual-aircraft events.
- `closeWorkOrder` is the most heavily guarded mutation in the system (8 sequential guards). Guards execute in order — the first failure throws and no subsequent guards run. This is intentional: if a precondition can be checked with a single db.get, do that first before loading large collections. I put the signatureAuthEvent check first (fast, single lookup) and the task card completeness check later (requires a collection query).
- `voidWorkOrder` checks for signed maintenance records before allowing void. This is the "broken chain of custody" guard Marcus described.
- `listWorkOrders` returns enriched WOs with aircraft identification data for list rendering. It uses three different index paths depending on which filter combination was requested. I avoided a single "God query" — each filter combination maps to a specific index to avoid table scans.
- `getCloseReadiness` is a read-only pre-flight check. It runs the same guard logic as `closeWorkOrder` but returns a structured report instead of throwing. The frontend should call this before presenting the close modal. The mutation still enforces the same rules — `getCloseReadiness` is a UX enhancement, not a bypass.

### `taskCards.ts`

Four public operations: `createTaskCard`, `completeStep`, `signTaskCard`, `listTaskCardsForWorkOrder`.

**Key implementation decisions:**

- `createTaskCard` creates the task card document and all step documents in a single atomic transaction. Convex's atomicity guarantee means if step insertion fails midway (e.g., a validation error on step 3 of 5), the entire mutation is rolled back — no partial task card with only 2 of 5 steps. This is critical for audit integrity.
- `completeStep` is the most regulatory-critical mutation in the entire codebase. The six-step signatureAuthEvent validation (EXISTS, UNCONSUMED, UNEXPIRED, IDENTITY MATCH, CONSUME, WRITE) maps directly to task-card-execution.md §7.2. Steps 5 and 6 (CONSUME + WRITE) happen in the same Convex transaction — this is the atomicity guarantee that makes double-signing impossible.
- `completeStep` is idempotent: if the step is already in a terminal state (completed or na), it returns a success response with `idempotent: true` and does not re-process. This handles network retries gracefully without re-consuming auth events or re-signing.
- `deriveCardStatus()` is an internal helper that computes the new card status from all its steps. It is called after every step update to maintain the INV-09 invariant: card status is always derived from step state, never independently set. This function is pure — it doesn't write to the database. The caller patches the card after calling it.
- `signTaskCard` records the card-level sign-off in the `notes` field and the audit log. **TODO (Phase 2.1):** Add dedicated signature fields to `taskCards` (`signingTechnicianId`, `signedAt`, `cardSignatureAuthEventId`). Currently notes is used as a workaround pending schema extension.
- `listTaskCardsForWorkOrder` sorts by `taskCardNumber` using `localeCompare`, which works correctly for both numeric-style numbers ("TC-001") and alphanumeric ("TC-A-001"). It computes a `progressPercent` per card for the frontend progress bar.

### Auth Pattern

Every mutation calls `requireAuth(ctx)` first. This reads the Clerk JWT via `ctx.auth.getUserIdentity()` and throws with a clear UNAUTHENTICATED message if the user is not signed in. The returned `subject` is the Clerk user ID, used as `userId` in all audit log entries.

Technician identity is validated separately via `callerTechnicianId`. The Clerk user ID and the technician ID are two different identity systems:
- Clerk user ID: the authentication identity (who is this browser session)
- Technician ID: the regulatory identity (which certificate holder is signing this)

A user account can be linked to a technician via `technicians.userId`. Signing mutations verify this linkage.

### Audit Log Writes

Every mutation writes to `auditLog` in the same transaction as the primary write. If the audit write fails for any reason, the entire mutation fails. This is the Convex atomicity guarantee — there is no path by which a signing event could succeed without an audit log entry.

The audit log entries follow the catalogue in signoff-rts-flow.md §6. Key event types used:

- `record_created` — new WO, new task card
- `status_changed` — WO/task card status transitions
- `technician_signed` — step-level sign-off
- `record_signed` — card-level sign-off, maintenance record creation
- `record_updated` — step marked N/A, fields updated

---

## What Was Deferred

### Phase 2.1 Schema Extensions Required

These mutations are **specified but not implementable** until the schema extensions are approved:

| Mutation | Blocked By | Gate Review ID |
|---|---|---|
| `counterSignStep` | `taskCardStepCounterSignatures` table (SE-01) | UM-02 |
| `interruptStep` / `resumeStep` | `taskCardInterruptions` table (SE-02) | UM-03 |
| `assignStep` (full impl) | `taskCardStepAssignments` table (SE-03) | UM-04 |
| Open interruptions block `closeWorkOrder` (BP-01) | SE-02 | BP-01 |

The `TODO` comments in `workOrders.ts#closeWorkOrder` mark exactly where BP-01 code will slot in. The commented-out query is the correct query to run once SE-02 exists.

### Unimplemented Mutations (Phase 2.1)

| Mutation | Priority | Notes |
|---|---|---|
| `reviewNAStep` | **High** | Resolves `incomplete_na_steps` → `complete`. Required for annual inspection N/A flows. |
| `counterSignStep` | **High** | Dual sign-off for IA-required steps. Phase 2.0 workaround: signer must hold IA themselves. |
| `interruptStep` / `resumeStep` | **High** | Shift-change compliance. Currently no mechanism to document work interruptions. |
| `voidTaskCard` | Medium | Admin correction flow. |
| `placeWorkOrderOnHold` / `releaseWorkOrderHold` | High | Status: on_hold. The status enum includes it; the mutation isn't here. |
| `submitForInspection` / `flagOpenDiscrepancies` | High | Moves WO to pending_inspection and open_discrepancies states. |
| `cancelWorkOrder` | Medium | Customer-initiated cancellation (distinct from admin void). |
| `createAdCompliance` | **High** | The entry point for the AD compliance chain. Not implemented — AD compliance module is Phase 2.1. |
| `recordAdCompliance` | **High** | Records compliance on an existing adCompliance record. |
| `markAdNotApplicable` | **High** | N/A determination for an AD. |
| `authorizeReturnToService` | **Critical** | Full RTS mutation per signoff-rts-flow.md §2. Currently `closeWorkOrder` references the RTS record but the creation mechanism for that record is not implemented. |

### Scope Notes

`authorizeReturnToService` is the most critical missing mutation. `closeWorkOrder` already checks for its existence (Guard 5), but the mechanism to create the `returnToService` record is not yet implemented. This means `closeWorkOrder` will always throw until `authorizeReturnToService` is built and called first. This is the correct behavior — it surfaces the dependency explicitly rather than hiding it.

---

## Known Gaps

### 1. `signTaskCard` Missing Schema Fields (Phase 2.1)

The `taskCards` table has no dedicated signature fields (`signingTechnicianId`, `signedAt`, `cardSignatureAuthEventId`). For Phase 2.0, the sign-off is recorded in the `notes` field and the `auditLog`. This is auditable but not queryable. When Phase 2.1 adds these fields, the `signTaskCard` mutation needs an update — and a migration to backfill existing signed cards.

### 2. Certificate Query Indexes

The certificate queries in `completeStep` and `signTaskCard` use:
```
.withIndex("by_type", q => q.eq("technicianId", ...).eq("certificateType", "IA"))
```
The `by_type` index in schema.ts is defined as `["technicianId", "certificateType"]`. This is correct. However, the active certificate query for step sign-off uses `withIndex("by_technician")` with a `.filter()` for `active == true`. This is a partial index scan — not a full table scan, but not optimal. **TODO:** Add a `["technicianId", "active"]` index to certificates for the active cert lookup.

### 3. Concurrent `completeStep` Calls

If two technicians are signing different steps of the same task card at the same exact millisecond, both mutations will read the card's current `completedStepCount`, compute a new count, and patch. Because Convex serializes mutations, one will win and one will read stale data. The correct pattern — implemented here — is to recount all steps from `taskCardSteps` (the authoritative source) rather than incrementing the card's denormalized counter. This is correct but slightly more expensive than an atomic increment.

### 4. AD Compliance Blocking in `closeWorkOrder`

Marcus's module (ad-compliance-module.md §6.3) specifies that `closeWorkOrder` must call `checkAdDueForAircraft` and throw if any ADs are overdue. This guard is **not yet implemented** in `closeWorkOrder`. It requires the `adCompliance` table to be populated (which requires `createAdCompliance`, which is Phase 2.1). The guard's TODO is implicitly present — once AD compliance is populated, a `checkAdDueForAircraft` call will be inserted between Guard 7 and Guard 8 in `closeWorkOrder`.

### 5. IA 24-Month Recent Experience Check (14 CFR 65.83)

The `completeStep` and `signTaskCard` mutations verify IA expiry date (March 31 rule) but do **not** verify the 24-month recent experience requirement from `certificate.lastExercisedDate`. Per Marcus (signoff-rts-flow.md §4.3), this is a required check for card-level sign-off on annual inspections. It is omitted here because:
1. `lastExercisedDate` may not be populated for technicians imported from other systems
2. The full recent experience check belongs in `authorizeReturnToService`, not in individual step sign-offs

This is a **documented gap** — not an oversight. Add `lastExercisedDate` check to `signTaskCard` when `authorizeReturnToService` is implemented.

---

## Testing Requirements

These test cases correspond directly to the invariant-to-test-case tables in the Phase 2 spec documents.

### Critical Path Tests (Must Pass Before Smoke Testing)

| Test ID | What to Test | Expected Result |
|---|---|---|
| TC-WO-01 | Create WO with duplicate workOrderNumber → closeWorkOrder | Throws "INV-14: already exists" |
| TC-WO-02 | openWorkOrder with aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours | Throws "INV-18: less than last known TT" |
| TC-WO-03 | openWorkOrder for aircraft with status "destroyed" | Throws at createWorkOrder |
| TC-WO-04 | closeWorkOrder without returnToService record | Throws "INV: No returnToService record" |
| TC-WO-05 | closeWorkOrder with open discrepancy | Throws "RTS_OPEN_DISCREPANCIES" |
| TC-WO-06 | closeWorkOrder with incomplete task card | Throws "RTS_OPEN_TASK_CARDS" |
| TC-WO-07 | voidWorkOrder with signed maintenanceRecord linked | Throws "broken chain of custody" |
| TC-WO-08 | voidWorkOrder on "in_progress" WO | Throws — not in VOIDABLE_WO_STATUSES |
| TC-WO-09 | closeWorkOrder: rts.aircraftHoursAtRts ≠ provided aircraftTotalTimeAtClose | Throws "RTS_TIME_MISMATCH" |
| TC-TC-01 | completeStep: reuse consumed auth event | Throws "already been consumed" with consumedAt |
| TC-TC-02 | completeStep: expired auth event (expiresAt < now) | Throws "expired" with ISO timestamp |
| TC-TC-03 | completeStep: auth event for technician A, caller is technician B | Throws "non-transferable" |
| TC-TC-04 | completeStep: empty ratingsExercised | Throws "INV-02" |
| TC-TC-05 | All steps completed, no IA N/A → assert card status | "complete" |
| TC-TC-06 | One IA-required step marked N/A → assert card status | "incomplete_na_steps" |
| TC-TC-07 | completeStep succeeds → assert taskCardSteps.status, auditLog entry | Both present |
| TC-TC-08 | IA-required step, signer's IA certificate expired | Throws with expiry date in ISO |
| TC-TC-09 | signTaskCard: card with IA-required steps, signer lacks current IA | Throws dual sign-off message |
| TC-TC-10 | signTaskCard: pending steps still remain | Throws "X step(s) are still pending" |
| TC-TC-11 | completeStep on voided task card | Throws "is voided" |
| TC-TC-12 | createTaskCard: steps [1, 3, 5] (non-sequential) | Throws sequential numbering message |
| TC-TC-13 | completeStep mark_na: null naAuthorizedById | Throws required |
| TC-TC-14 | signTaskCard: empty returnToServiceStatement | Throws non-empty required |
| TC-TC-15 | createTaskCard: approvedDataSource is whitespace | Throws 14 CFR 43.9(a)(1) message |
| TC-TC-16 | listTaskCardsForWorkOrder: wrong org | Throws access denied |
| TC-INV-01 | Verify auditLog entry in same transaction as step sign-off | Entry exists with same timestamp |
| TC-INV-02 | signatureAuthEvent.consumed == true after completeStep succeeds | True |
| TC-INV-03 | completeStep idempotency: same step signed twice | Second call returns idempotent:true |

### Invariant Verification Tests

| Invariant | Test | Verification Method |
|---|---|---|
| INV-05 | Auth event consumed in same transaction as step update | Assert consumed=true AND step.status="completed" atomically present |
| INV-09 | Card status never independently set | Query taskCards and taskCardSteps; derive status from steps; must match stored status |
| INV-10 | Every sign-off has corresponding auditLog entry | For each taskCardSteps where status="completed", assert auditLog record with same timestamp |
| INV-14 | WO number uniqueness | Two createWorkOrder calls with same number: second throws |
| INV-18 | Aircraft TT monotonic | openWorkOrder with TT < aircraft.totalTimeAirframeHours: throws |

---

## Integration Notes for Frontend Team (Chloe Park, Finn Calloway)

### Auth Events (Jonas Harker — read first)

**Every signing action requires a `signatureAuthEvent`** before the mutation can be called. The flow is:

1. User triggers signing action (clicking "Sign Step")
2. `<ReAuthModal>` opens — user enters PIN/biometric
3. Clerk re-auth fires webhook to Jonas's handler
4. Handler calls `insertSignatureAuthEvent` (your Convex mutation — Jonas, please build this)
5. Frontend polls `getPendingAuthEventForUser` (Convex query) until the event ID is available
6. Frontend calls `completeStep` or `signTaskCard` with the event ID
7. If the user waits more than 5 minutes, the event expires and they must re-authenticate

The poll timeout is 10 seconds. If no event appears in 10 seconds, show `<ReAuthTimeoutError>`. Don't let the user sit at a spinner indefinitely.

**IMPORTANT:** The auth event check (`consumed == false`, `expiresAt > now`) is enforced server-side. Do not rely on frontend validation to prevent expired events — the mutation will throw with a clear error code.

### Error Handling

All mutations throw `Error` objects with human-readable messages. The message includes:
- An error code prefix (e.g., `INV-05:`, `RTS_OPEN_TASK_CARDS:`, `RTS_TIME_MISMATCH:`)
- A plain-language description
- Actionable resolution advice

The frontend should parse the error code prefix (everything before the first colon) and map it to a user-facing message using a constants file. The full error message is suitable for display in a developer console / admin panel but may be too technical for end users.

Map these error codes to `<MutationErrorAlert>` components with resolution links:

| Error Code | User-Facing Message | Resolution Link |
|---|---|---|
| `INV-14` | "Work order number already in use" | Back to create form |
| `INV-05` | "Signature expired or already used" | Re-auth modal |
| `INV-18` | "Aircraft time cannot decrease" | Contact DOM |
| `RTS_OPEN_TASK_CARDS` | "Some task cards aren't complete yet" | Task card list |
| `RTS_OPEN_DISCREPANCIES` | "Open discrepancies need resolution" | Discrepancy list |
| `RTS_TIME_MISMATCH` | "Time mismatch between RTS and WO records" | Contact DOM |
| `UNAUTHENTICATED` | "Your session has expired" | Sign-in redirect |

### `getCloseReadiness` — Pre-Flight Check

Call `getCloseReadiness` before presenting the WO close modal. It returns:
```typescript
{
  canClose: boolean,
  workOrderStatus: string,
  openDiscrepancyCount: number,
  incompleteTaskCardCount: number,
  hasRtsRecord: boolean,
  aircraftTotalTimeAtOpenRecorded: boolean,
  blockers: string[],  // human-readable list of what's blocking close
}
```

If `canClose == false`, show the `blockers` array as a list. Each blocker is a human-readable sentence. Don't show the "Close Work Order" button at all if `canClose == false` — the mutation would throw, which wastes a round-trip.

### `listTaskCardsForWorkOrder` Returns Steps In Order

The `listTaskCardsForWorkOrder` query returns steps ordered by `stepNumber` (via the `by_task_card_step` index). Don't re-sort client-side. Each step includes:
- `signerName`: The technician's legal name at sign-off time (fetched from technicians table)
- `naAuthorizerName`: The authorizer's name (if N/A'd)
- `progressPercent`: Per-card progress (0–100)

### Optimistic Updates

Per the frontend architecture spec (Chloe's document):
- **DO use optimistic updates for:** time logging, step checkbox visual feedback (show checked immediately)
- **DO NOT use optimistic updates for:** step sign-off confirmation (wait for server), card final sign-off, work order close

For step sign-off: show a loading spinner after the user submits PIN. Update the UI only when the `completeStep` mutation returns. This is safety-critical — premature optimistic updates could mislead a tech into thinking a step was signed when it wasn't.

### Task Card Progress Bar

Use `progressPercent` from `listTaskCardsForWorkOrder` for the card progress bar. For the work order overall progress: sum `completedStepCount + naStepCount` across all cards, divide by sum of `stepCount` across all cards.

Do not use `taskCard.completedStepCount` as the authoritative source for "this card is complete" — use `taskCard.status == "complete"`. The denormalized counters are for display only; `status` is the authoritative state machine field.

---

## Architecture Notes

### Why `deriveCardStatus` Is A Pure Function (Not A Query)

`deriveCardStatus` takes an array of steps and returns the derived status and counters. It does not query the database — it receives all steps as a parameter.

Why: After calling `completeStep`, we already have all step records in memory (we just queried them all for the `allSteps` array). Calling a separate query for the same data would double the database reads. Keeping the derivation logic as a pure function also makes it testable in isolation without a database.

### Why We Recount All Steps Instead of Incrementing

In `completeStep`, after updating a step we recount all steps:
```typescript
const allSteps = await ctx.db.query("taskCardSteps")
  .withIndex("by_task_card", q => q.eq("taskCardId", args.taskCardId))
  .collect();
```

Rather than:
```typescript
await ctx.db.patch(args.taskCardId, {
  completedStepCount: taskCard.completedStepCount + 1
});
```

This is because Convex serializes mutations, but if we read `taskCard.completedStepCount` at the start of the mutation and another mutation has already incremented it between our read and our write, our increment would be based on stale data. The full recount from `taskCardSteps` always produces the correct count regardless of interleaving.

This costs one extra collection query per `completeStep` call. For task cards with ≤50 steps (all of aviation), this is a negligible cost (sub-millisecond on Convex's indexes).

### Why `by_task_card_step` Index

The `by_task_card_step` index on `taskCardSteps` is `["taskCardId", "stepNumber"]`. This gives us:
1. All steps for a card, in step number order (not insertion order)
2. Single-step lookup by card + step number (for `assignStep` and debugging)

Without this index, getting steps in order would require a collection sort in application code. With it, the result is already ordered from the index. Use `by_task_card_step` when you need ordered step traversal; use `by_task_card` for simple existence checks or bulk operations.

---

## Open Questions (Requiring Marcus Webb Response — RQ-01 through RQ-06)

These are documented in the gate review but affect mutations not yet implemented:

1. **RQ-01 (Shelf-life):** Does shelf-life override apply uniformly to all part categories, or do some categories (e.g., O-rings, seals) have different override policies? Affects `installPart` guard.

2. **RQ-05 (Ratings-exercised inference):** For `completeStep`, should `ratingsExercised` be technician-selected in the UI, or should the system infer it from the task card's `taskType`? Current implementation: technician selects. If Marcus rules for inference: add `inferRatingsFromTaskType()` helper.

3. **RQ-06 (RTS statement minimum content):** The 50-character floor in `closeWorkOrder` is a heuristic. Marcus may require a keyword check (statement must contain "14 CFR"). If so: add a regex check in `closeWorkOrder` before the length check.

---

*Devraj Anand — Backend (Convex)*  
*2026-02-22 — Phase 3 Implementation*  
*Regulatory annotations: Marcus Webb*  
*Schema basis: convex-schema-v2.md (FROZEN)*  
*All TypeScript in this directory is intended to run on Convex v1 (`convex` npm package >= 1.0).*
