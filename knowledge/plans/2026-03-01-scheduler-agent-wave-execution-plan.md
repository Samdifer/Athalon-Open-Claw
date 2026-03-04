# Scheduler Integration Agent Wave Execution Plan

Date: 2026-03-01
Program: Integrate scheduler core features into `athelon-app` with `project = workOrder` and quote-centric planning context.

## Team Model
1. Program Ops Team
- Owns wave sequencing, acceptance criteria, and release gating.
2. Data Contracts Team
- Owns Convex schema/functions for scheduling assignments, quote/work-order linkage, archive lifecycle, and planning financial settings.
3. Scheduling UX Team
- Owns Gantt/backlog orchestration, bay-correct rendering, and planner data wiring.
4. Optimization Team
- Owns Magic Scheduler flow (selection, prioritization, apply schedule).
5. Finance Planning Team
- Owns planning assumptions UI and projected P&L panel.
6. Quality Team
- Owns feature-level checks per wave and final full regression.

## Non-Negotiables
1. Planner project is always a `workOrder`.
2. Quote lifecycle is preserved and surfaced in planning views.
3. Regulatory maintenance records remain separate from planning archive semantics.
4. Every wave must pass its test gate before next wave.

## Waves

### Wave 0 - Program Setup
Deliverables:
1. Finalized wave plan and ownership model.
2. Per-wave acceptance + test gates.

Test gate:
1. Documentation review complete.

### Wave 1 - Data Contracts Team
Deliverables:
1. `scheduleAssignments` + quote linkage contract.
2. Planner query surface:
- `listPlannerProjects`
- assignment upsert/day-model/archive/restore.

Acceptance:
1. Assignment must reject quote/work-order mismatches.
2. Assignment auto-links quote when possible.

Test gate:
1. `npx convex codegen`
2. `npx tsc --noEmit`

### Wave 2 - Scheduling UX Team
Deliverables:
1. Scheduling page consumes planner projects + assignments.
2. Gantt rows map correctly per bay assignment.
3. Backlog includes quote context where available.

Acceptance:
1. No duplicate WO bars across all bay rows.
2. Drag/resize persists through planner mutation endpoint.

Test gate:
1. `npx tsc --noEmit`
2. `npx playwright test e2e/wave3-scheduling.spec.ts --project=chromium-authenticated`

### Wave 3 - Optimization Team
Deliverables:
1. Magic Scheduler modal/workflow for unscheduled WOs.
2. Priority ordering + apply assignments with result summary.

Acceptance:
1. Apply action creates/updates schedule assignments.
2. Results show WO and assigned bay/date output.

Test gate:
1. `npx tsc --noEmit`
2. Focused scheduling e2e (existing + added planner flow check).

### Wave 4 - Finance Planning Team
Deliverables:
1. Planning financial settings page/section.
2. Daily projected P&L panel using planning assumptions + schedule load.

Acceptance:
1. Settings persist and reload correctly.
2. Projection visibly changes after assumption updates.

Test gate:
1. `npx tsc --noEmit`
2. Planning financial smoke e2e.

### Wave 5 - Quality Team (Program Close)
Deliverables:
1. Full regression pass.
2. Final implementation report with known gaps/risks.

Final test gate:
1. `npx convex codegen`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npx playwright test e2e/wave3-scheduling.spec.ts --project=chromium-authenticated`
5. `npx playwright test e2e/wave2-dashboard.spec.ts --project=chromium-authenticated`

