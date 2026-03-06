# Compliance State Machine (C1 Foundation)

Date: 2026-03-06

## Purpose

Defines backend transition invariants for CAMP P0 compliance foundations.

## 1) AD compliance lifecycle (`adCompliance.complianceStatus`)

Allowed transitions:

- `pending_determination -> not_complied | complied_one_time | complied_recurring | not_applicable | superseded`
- `not_complied -> complied_one_time | complied_recurring | not_applicable | superseded`
- `complied_one_time -> superseded`
- `complied_recurring -> complied_recurring | superseded`
- `not_applicable -> superseded`
- `superseded -> (terminal)`

Enforced by:

- `convex/dueEngine.ts` (`assertValidAdLifecycleTransition`)
- `convex/adCompliance.ts` before status updates in record/NA/supersession flows

## 2) AD/SB directive flow baseline (policy contract)

Lifecycle chain:

`identified -> assessed -> applicable -> scheduled -> complied -> recurring_next`

Recurrence loop:

`recurring_next -> scheduled` (or re-mark `complied` when completed)

Enforced by:

- `convex/dueEngine.ts` (`assertValidDirectiveLifecycleTransition`)
- `convex/complianceLedger.ts` (`transitionDirectiveLifecycle`)

## 3) Counter source-of-truth policy

- Counter reconciliation events are immutable (`counterReconciliationEvents`).
- `authoritativeSource` must be explicit (`aircraft|engine|apu|external_sync|manual`).
- Delta is always persisted (`authoritativeValue - observedValue`).
- Every reconciliation writes a matching row into `complianceLedgerEvents` for replay.

## 4) Due engine baseline

- Due snapshot is deterministic from immutable compliance history and recurrence policy.
- `computeDueSnapshot` is pure and additive (days/hours/cycles offsets only).
- Replay contract available in `recomputeAdComplianceDueSnapshot` query.
