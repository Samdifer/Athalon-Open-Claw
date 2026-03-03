# Work Order Lifecycle + Signoff + Closure Pack (v1)

Date: 2026-03-02  
Pack ID: WO-LIFECYCLE-v1  
Parent Plan: `docs/workflow-readiness-loop/PROCESS-CHARTER.md`  
Status: Green (Run 001 complete, remediation validated)

## 1) Module Focus

Validate the full work-order operating lifecycle from new WO creation through task execution, compliance/signoff, RTS authorization, and customer release/closure.

Primary routes:
- `/work-orders/new`
- `/work-orders/:id`
- `/work-orders/:id/tasks/new`
- `/work-orders/:id/tasks/:cardId`
- `/work-orders/:id/records`
- `/work-orders/:id/rts`
- `/work-orders/:id/release`

Downstream verification routes:
- `/work-orders`
- `/work-orders/kanban`
- `/compliance/qcm-review`

## 2) Role Coverage

Required runs:

1. Primary: `lead_technician`
2. Adjacent: `qcm_inspector`
3. Negative RBAC: `read_only`

## 3) User Outcomes (Must Achieve)

1. User can open a WO and route into detail/task execution safely.
2. User can execute step/task progression with timer and signoff constraints enforced.
3. User can complete RTS authorization only when all readiness preconditions pass.
4. User can release aircraft only after RTS authorization and required release data.
5. User can verify close-state and records visibility after signoff/release actions.

## 4) Button + Action Map

### `/work-orders/new`

1. `Create Work Order`
- Expected: creates draft WO and routes to `/work-orders/:id`.

2. `Cancel`
- Expected: returns to `/work-orders` without mutation.

### `/work-orders/:id`

1. `Clock to WO`
- Expected: starts WO-context timer if no active timer exists.

2. `Sign Off & Close`
- Expected: routes to `/work-orders/:id/rts` when close-ready.

3. `Add Task Card`
- Expected: routes to `/work-orders/:id/tasks/new`.

### `/work-orders/:id/tasks/:cardId`

1. `Start Step`
- Expected: moves step to in-progress and records actor/time.

2. `Sign Step`
- Expected: blocked if step timer is active for technician.

3. `Sign & Lock Card`
- Expected: enabled only when all step/compliance preconditions are met.

4. `Clock Task` / `Stop Task Clock` / step timer controls
- Expected: enforce single active timer invariant.

### `/work-orders/:id/rts`

1. `Go to signature page`
- Expected: re-auth flow returns auth event ID for RTS action.

2. `Authorize Return to Service`
- Expected: enabled only when all 9 RTS preconditions pass.

### `/work-orders/:id/release`

1. `Go to RTS Authorization`
- Expected: present and routes to `/rts` when RTS not signed.

2. `Release Aircraft to Customer`
- Expected: disabled until RTS signed and aircraft total time is populated.

## 5) Core Invariants

1. Single active timer per technician is enforced across WO/task/step contexts.
2. Step/task signoff cannot proceed with inconsistent step completion state.
3. RTS authorization is blocked unless all readiness preconditions pass.
4. Release action is blocked when RTS is unsigned.
5. Signoff/close actions must route to `/rts` (not `/signature`) for RTS authorization.

## 6) Guided Training Script (Initial Runthrough)

1. Create WO and verify detail route.
2. Add/open task card and execute start/sign step flow.
3. Validate timer guardrails (task + step context) and stop behavior.
4. Review maintenance records readiness state.
5. Execute RTS path and verify release gate behavior.
6. Verify post-release navigation and list-level closure visibility.

## 7) Structured Test Matrix

### Happy Path

1. `WO-LIFE-HAPPY-01`
- Create WO and reach detail route.

2. `WO-LIFE-HAPPY-02`
- Reach RTS/release pages with valid WO context.

### Workflow / UX

1. `WO-LIFE-WF-01`
- Signoff/close actions route operators to RTS flow.

2. `WO-LIFE-WF-02`
- Release screen clearly blocks/permits handoff based on RTS state.

### Edge / Failure

1. `WO-LIFE-EDGE-01`
- No close-ready WO state should fail safely and show blocking guidance.

2. `WO-LIFE-EDGE-02`
- No active timers edge still preserves timer guard invariants.

### RBAC

1. `WO-LIFE-RBAC-01`
- Read-only role cannot mutate WO lifecycle state.

### Data Integrity

1. `WO-LIFE-DX-01`
- Context lineage remains valid (`work_order -> task -> step`) during timer actions.

2. `WO-LIFE-DX-02`
- RTS/release gates reflect backend readiness state and do not allow bypass.

## 8) Automation Backstop For This Pack

Run before and after session:

1. Route smoke:
- `npx playwright test e2e/smoke-all-routes.spec.ts --project=chromium-authenticated`

2. Work orders route baseline:
- `npx playwright test e2e/wave3-work-orders.spec.ts --project=chromium-authenticated`

3. WO create guard:
- `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts --project=chromium-authenticated`

4. RTS + release gate:
- `npx playwright test e2e/wave6-rts-release-gate.spec.ts --project=chromium-authenticated`

5. Time/timer guardrails:
- `npx playwright test e2e/wave7-time-clock-guard.spec.ts --project=chromium-authenticated`

6. Full lifecycle chain guard:
- `npx playwright test e2e/wave11-work-order-lifecycle-guard.spec.ts --project=chromium-authenticated`

Follow-up rule:
- Any reproducible lifecycle finding must be converted to dedicated deterministic E2E in next cycle.

## 9) Evidence Capture

Store run artifacts:
- `artifacts/training-runs/YYYY-MM-DD/work-order-lifecycle/<role>/<run-id>/`

Capture:
1. Preflight command output with pass/skip/fail counts.
2. WO IDs used in RTS/release checks.
3. Evidence for routing and gate behavior.
4. Findings log linkage to ticket IDs.

## 10) Scorecard Gate (This Pack)

Green gate target:
1. >= 90% lifecycle checks pass.
2. <= 2 trainer assists per role run.
3. 0 unresolved S0/S1 findings.
4. RTS and release gates pass with deterministic coverage.

Current gate note:
- Run 001 gate is `Green` after remediation validation:
  - `wave6-rts-release-gate.spec.ts` -> `5 passed`
  - `wave7-time-clock-guard.spec.ts` -> `9 passed`
  - `wave11-work-order-lifecycle-guard.spec.ts` -> `1 passed`
  - 0 unresolved S0/S1/S2 lifecycle findings.
