# Workflow Readiness Loop (WRL) - Process Charter

Canonical Path: `docs/workflow-readiness-loop/PROCESS-CHARTER.md`

Date: 2026-03-02  
Version: v2  
Status: Ready to run  
Scope: Internal app modules, global UI surfaces, and customer portal flows

## 1) Purpose

Create a repeatable system to run first-time user training by module/model while simultaneously finding:
- Workflow friction.
- Logic inconsistencies.
- Missing features.
- Data/state integrity gaps.

This is not a one-off walkthrough. It is an ongoing quality loop.

## 2) What Was Improved From v1

v2 adds five controls missing from the first draft:

1. Role-based coverage matrix aligned to actual app roles (`admin`, `shop_manager`, `qcm_inspector`, `billing_manager`, `lead_technician`, `technician`, `parts_clerk`, `read_only`).
2. Route-complete module coverage using the internal route manifest plus customer portal routes.
3. Deterministic run setup (seed profile, environment profile, preflight smoke checks).
4. Explicit automation backstop using existing Playwright suites before/after manual sessions.
5. Session scorecards and quality gates so each module has measurable pass/fail criteria.

## 3) Coverage Model

Every cycle tests three coverage layers:

1. `Module Packs`
- Feature areas (Work Orders, Billing, Parts, etc.).

2. `Global Surface Packs`
- Top bar, global timer widget, command palette, notifications, sidebar, location switcher.

3. `Cross-Module Transition Packs`
- Flows that cross boundaries (example: time entry -> approval -> invoice).

No module is considered trained/tested unless all applicable layers pass.

## 4) Module Inventory (Athalon)

Use this as the canonical first-pass list:

1. Dashboard
2. My Work
3. Fleet (+ calendar, predictions, tail detail/logbook)
4. Work Orders (+ kanban, templates, WO detail sub-pages, task/step flows)
5. Scheduling (+ bays, capacity, financial planning, seed audit)
6. Parts (+ requests, receiving, tools, cores, rotables, loaners, shipping, inventory count)
7. Billing (+ invoices, quotes, customers, vendors, POs, analytics, OTC, warranty, labor kits, time clock, time approval, settings)
8. Compliance (+ AD/SB, audit trail, QCM review, squawks)
9. Reports (+ financials, forecast, profitability, runway)
10. Personnel (+ training)
11. Settings (+ shop, users, quickbooks, locations, notifications, import, email log)
12. Customer Portal (+ portal dashboard, work orders, quotes, invoices, fleet)

## 5) Role-Based Coverage Matrix

Each pack must declare required persona runs:

1. Technician
- My Work, Work Orders, task/step execution, timer actions, parts request touchpoints.

2. Lead Technician
- Technician flows plus signoff/coordination and escalation actions.

3. Shop Manager
- Operational oversight across work orders, scheduling, personnel views.

4. Billing Manager
- Time approval, invoice creation, billing filters, financial rollups.

5. QCM Inspector
- Compliance, audit trail, work quality signoff constraints.

6. Parts Clerk
- Receiving, inventory movement, request fulfillment.

7. Admin
- Cross-module configuration, role/permission governance, recovery paths.

8. Read-only
- Visibility and navigation integrity with no mutation capability.

Minimum rule per module:
- One primary role run + one adjacent role run + one negative RBAC run.

## 6) Repeatable Session Pipeline

### A) Preflight (required)

1. Confirm target env (`local/dev/staging`) and org.
2. Load deterministic seed profile when needed.
3. Run route health smoke:
- `npx playwright test e2e/smoke-all-routes.spec.ts --project=chromium-authenticated`
4. Run module-specific guard suite (if available) before manual session.

### B) Live Session (45-60 min)

1. Orientation (5 min)
- Goal, role, success criteria, entry points.

2. Guided training runthrough (15-20 min)
- Teach module basics and button intent.

3. Structured stress pass (15-20 min)
- Edge cases, error recovery, permission boundaries.

4. Debrief and capture (10-15 min)
- Findings logged with severity and owner.

### C) Postflight

1. Re-run module guard suite after any fixes.
2. Update module scorecard and gate status.
3. Convert S0/S1 findings to tickets immediately.

## 7) Training + Test Pack Contract (Template)

```yaml
pack_id: "WO-CORE-v1"
module: "Work Orders"
owner: "Product + Ops"
env_profile: "staging-seeded"
roles_tested: ["technician", "lead_technician", "billing_manager"]
routes:
  - "/work-orders"
  - "/work-orders/:id"
  - "/work-orders/:id/tasks/:cardId"
global_dependencies:
  - "GlobalTimerWidget"
  - "CommandPalette"
prerequisites:
  - "At least 1 active WO with task cards and steps"
  - "At least 2 technicians with different roles"
button_action_map:
  - button: "Clock to WO"
    expected: "Creates active WO-context timer"
  - button: "Start Step"
    expected: "Moves step to in-progress without hidden side effects"
invariants:
  - "Single active timer per technician"
  - "Step belongs to selected task and work order"
test_flows:
  - id: "WO-HAPPY-01"
    type: "happy"
  - id: "WO-EDGE-02"
    type: "edge"
  - id: "WO-RBAC-03"
    type: "permission"
scorecard:
  task_success_rate_target: ">= 90%"
  median_time_to_complete_target: "<= baseline + 15%"
  assist_count_target: "<= 2 per run"
artifact_path: "artifacts/training-runs/YYYY-MM-DD/work-orders/<role>/<run-id>/"
```

## 8) Session Scorecard (Required)

Track these per run:

1. Task completion rate.
2. Median time-on-task.
3. Assist count (trainer interventions).
4. Navigation backtracks.
5. Error encounter count.
6. Data consistency checks passed.

Quality gate:
- `Red`: Any S0, or 2+ S1 unresolved.
- `Yellow`: No S0, max 1 unresolved S1, or repeated S2 patterns.
- `Green`: No unresolved S0/S1 and stable repeat run.

## 9) Finding Taxonomy and Ticket Contract

### Finding types
- `WF`: Workflow friction.
- `LI`: Logic inconsistency.
- `MF`: Missing feature.
- `DX`: Data/state defect.
- `RBAC`: Role/permission mismatch.
- `OBS`: Observability gap (cannot verify correctness from UI/logs).

### Severity
- `S0`: Core flow blocked or compliance/financial risk.
- `S1`: High friction/risk with likely user impact.
- `S2`: Medium issue with workaround.
- `S3`: Low-impact polish.

### Ticket minimum fields
- Repro steps.
- Expected vs actual.
- Role and route.
- Data context (WO/tech IDs where relevant).
- Evidence link (video/screenshot/log).
- Proposed fix and owner.

## 10) High-Risk Invariant Packs (Time Tracking + Billing)

Always include these cross-module checks:

1. Single active timer enforcement per technician.
2. Pause/resume/stop state integrity across refresh and navigation.
3. Context lineage validity (`work_order -> task -> step`).
4. Step signoff behavior with open step timers.
5. Approval-gated billing (approved + unbilled only).
6. Billed-entry lock behavior (no silent rebilling/re-editing).
7. Supervisor force actions and audit trail visibility.
8. Global timer + time clock page consistency.

## 11) Automation Backstop Strategy

Use existing E2E assets as baseline and regression safety net:

1. Route coverage:
- `e2e/route-manifest.internal.ts`
- `e2e/smoke-all-routes.spec.ts`

2. Time workflow guards:
- `e2e/wave7-time-clock-guard.spec.ts`

3. Gate suite:
- `npm run qa:first-user-gate`

Rule:
- Manual training findings that expose repeatable defects must become automated tests in the next cycle.

## 12) Cadence and Governance

Weekly cycle:

1. Monday: select packs + freeze run scope.
2. Tuesday-Thursday: execute sessions and triage.
3. Friday: review scorecards, open tickets, schedule fixes.

Definition of done for a module pack:
- Script validated by at least one target role.
- Button/action map complete for in-scope routes.
- Scorecard recorded for at least two runs.
- S0/S1 findings assigned with target dates.
- Regression coverage updated (manual and/or automated).

## 13) Immediate Next Actions

1. Build v1 packs first for:
- `Work Order Creation` (`/work-orders/new` -> `/work-orders/:id`)
- `Work Orders` (list + detail + task/step)
- `Billing Time Clock + Time Approval + Invoices`

2. For each pack, run:
- Technician session
- Primary manager session (shop or billing)
- Negative RBAC check

3. Publish first weekly rollup:
- Top 10 workflow breaks
- Top 5 logic inconsistencies
- Top 5 missing features
- Top 5 automation additions created from findings

## 14) Program Artifacts

Use these companion files as part of normal operation:

1. Weekly operating dashboard template:
- `docs/plans/2026-03-02-weekly-training-ops-dashboard-template.md`

2. Codex continuity and decision context:
- `docs/plans/2026-03-02-codex-context-training-program.md`

3. First module pack (work order creation):
- `docs/plans/2026-03-02-work-order-creation-training-test-pack-v1.md`
