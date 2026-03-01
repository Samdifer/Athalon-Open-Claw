# Scheduler -> Athelon Integration Design

Date: 2026-02-28
Scope: Integrate the added `scheduler/` program (aircraft planning + shop P&L + capacity) into `athelon-app/` with Convex + Clerk architecture.

## Sources Reviewed
- `scheduler/docs/integration/master-evaluation.md`
- `scheduler/docs/integration/integration-matrix.md`
- `scheduler/docs/integration/migration-backlog.md`
- `scheduler/docs/integration/known-risks.md`
- `scheduler/docs/integration/e2e-verification.md`
- `athelon-app/app/(app)/scheduling/page.tsx`
- `athelon-app/app/(app)/scheduling/_components/GanttBoard.tsx`
- `athelon-app/app/(app)/scheduling/capacity/page.tsx`
- `athelon-app/app/(app)/billing/analytics/page.tsx`
- `athelon-app/app/(app)/personnel/page.tsx`
- `athelon-app/convex/schema.ts`
- `athelon-app/convex/workOrders.ts`
- `athelon-app/convex/scheduling.ts`
- `athelon-app/convex/capacity.ts`
- `athelon-app/convex/hangarBays.ts`

## Executive Decision
Do not lift-and-shift the scheduler app as a standalone micro-app.  
Integrate feature-by-feature into current `athelon-app`, reusing existing routes, auth, RBAC, and Convex schema conventions.

Reason:
1. `scheduler/` is monolithic `GameState` + Supabase persistence.
2. `athelon-app` is normalized Convex domain + role-based MRO workflows already in production shape.
3. A direct embed would duplicate auth/data models and create long-term divergence.

## Domain Non-Negotiables
1. Planner "project" is always a `workOrder` in Athelon.
2. Scheduling/planning records must reference `workOrders` as the canonical unit.
3. Quoting remains a core feature:
   - quote lifecycle (`DRAFT -> SENT -> APPROVED -> CONVERTED`) is preserved,
   - project planning views carry linked quote context (number/status/total),
   - quote-to-work-order conversion remains the primary handoff into execution planning.

## Core Features to Integrate (Priority Order)
1. Advanced scheduling board interactions (drag/move/resize, lane semantics, backlog lifecycle).
2. Capacity forecasting tied to roster/shift/holiday reality.
3. Daily financial/P&L tracking tied to labor load, expenses, and quote/revenue assumptions.
4. Magic Scheduler optimization workflow (selection, prioritization, delta outcomes).
5. Personnel/config/financial command-center depth (not separate apps; expanded existing pages).
6. Archive/restore ("graveyard") lifecycle for planning entities with audit-safe behavior.

## Target Integration Architecture
Use three layers:
1. Domain layer (Convex tables + queries/mutations):
   - Source of truth for schedule, capacity, and financial assumptions.
2. Engine layer (pure TS):
   - Scheduler algorithms (slotting, optimization, projection math) extracted from `scheduler/`.
3. UI layer (React routes/components in `athelon-app`):
   - Existing pages expanded to host new command-center interactions.

Guiding rule:
- Reuse scheduler UI behavior contracts.
- Do not reuse scheduler auth/persistence implementation.

## Feature Mapping (Source -> Target)
1. Board + timeline:
   - Source: `scheduler/components/GanttBoard.tsx`
   - Target: `athelon-app/app/(app)/scheduling/_components/GanttBoard.tsx` + new Convex schedule contract.
2. Backlog + quote lifecycle:
   - Source: `scheduler/components/BacklogPanel.tsx`, `QuoteBuilder.tsx`
   - Target: current scheduling page + billing quotes + work-order intake.
3. Capacity forecaster:
   - Source: `scheduler/components/CapacityForecaster.tsx`
   - Target: `athelon-app/app/(app)/scheduling/capacity/page.tsx` + `convex/capacity.ts`.
4. Daily P&L panel:
   - Source: `scheduler/components/DailyFinancialTracker.tsx`, `FinancialPanel.tsx`
   - Target: `billing/analytics` + new finance-planning Convex module.
5. Personnel manager:
   - Source: `scheduler/components/PersonnelManager.tsx`
   - Target: `athelon-app/app/(app)/personnel/page.tsx` (expand tabs/controls).
6. Config manager:
   - Source: `scheduler/components/ConfigurationPanel.tsx`
   - Target: scheduling + shop settings + bay/fleet management surfaces.
7. Magic Scheduler wizard:
   - Source: `scheduler/components/MagicSchedulerWizard.tsx` + `scheduler/App.tsx` optimizer flow
   - Target: scheduling route modal/wizard.
8. Graveyard:
   - Source: `scheduler/components/GraveyardPanel.tsx`
   - Target: work-order scheduling archive model with restore/permanent-delete controls.

## Data Contract Plan (Convex-First)
Current gaps in `athelon-app` relative to scheduler behavior:
1. Work orders have start/end dates but no explicit bay assignment in schedule record.
2. No native per-day effort distribution/non-work-day model for scheduled jobs.
3. No dedicated planning financial assumptions table (shop overhead/capex tiers in scheduler sense).
4. No archive lane specifically for scheduling backlog entities.

Planned additions:
1. `scheduleAssignments` (new table):
   - `organizationId`, `workOrderId`, `hangarBayId`, `startDate`, `endDate`
   - optional `dailyEffort`, `nonWorkDays`, `locked`, `updatedBy`.
2. `planningFinancialSettings` (new table):
   - org-level shop-rate assumptions, markup tiers, monthly expense assumptions, capex assumptions.
3. `planningScenarios` (new table):
   - optional scenario start/end and cursor markers for what-if ranges.
4. `planningArchive` (new table or archived state model):
   - soft-delete/restore records for backlog-planning entities with audit trail.

Decision note:
- Keep regulatory work-order lifecycle untouched (`workOrders.status` for compliance).
- Planning archive should not weaken FAA record retention/integrity controls.

## Implementation Waves

### Wave 0 - Contract Freeze (2-3 days)
1. Confirm feature parity subset for first release:
   - Board interactions, capacity forecast, daily P&L, magic scheduler, archive/restore.
2. Publish interface contracts for:
   - scheduling engine input/output,
   - capacity math input/output,
   - daily P&L projection input/output.
3. Add feature flags:
   - `planner_v2_board`, `planner_v2_capacity`, `planner_v2_financial`, `planner_v2_magic`.

Exit criteria:
- Signed contract doc for domain + engine + UI boundaries.

### Wave 1 - Data Foundations (4-6 days)
1. Add Convex tables/indexes for schedule assignments, planning financial settings, and archive/scenario support.
2. Build mutations/queries for:
   - assign/move/resize schedule blocks,
   - update daily effort/non-work days,
   - archive/restore planning records.
3. Seed bootstrap defaults:
   - enforce at least one shop/base + one hangar path for schedulability.

Exit criteria:
- Board can load schedulable lanes for a fresh org without manual DB fixes.

### Wave 2 - Board and Backlog Parity (5-8 days)
1. Upgrade `GanttBoard` interactions:
   - bay lane-aware drag/drop,
   - resize with min-duration guards,
   - conflict overlays from assignment model.
2. Integrate backlog lifecycle:
   - unscheduled queue, scheduled queue, archive transitions.
3. Add job details panel actions:
   - auto-fit, archive/restore, guarded permanent delete.

Exit criteria:
- Equivalent of scheduler scenarios 3, 4, 5, and 14 pass in `athelon-app`.

### Wave 3 - Capacity + Personnel Deepening (4-6 days)
1. Extend capacity engine:
   - use shifts + efficiency + holidays + scheduled load.
2. Expand personnel page into tabbed command-center style:
   - roster, assignments, roles, holidays, analysis.
3. Connect capacity warnings to scheduling board and dispatch actions.

Exit criteria:
- Capacity metrics update immediately after roster/shift changes.

### Wave 4 - Financial Planning + P&L (5-7 days)
1. Add planning financial assumptions UI and persistence.
2. Build daily P&L tracker from:
   - labor capacity/load,
   - quote/revenue assumptions,
   - expense/capex assumptions.
3. Integrate with billing analytics without duplicating invoice logic.

Exit criteria:
- Financial assumption changes produce deterministic projection deltas and persist across reload.

### Wave 5 - Magic Scheduler + Advanced UX (4-6 days)
1. Port optimization workflow:
   - select jobs, priority ordering, apply optimized schedule, display deltas.
2. Add popout/fullscreen behavior only where useful in current IA.
3. Add onboarding guidance for new planner features.

Exit criteria:
- Equivalent of scheduler scenario 7 and fullscreen/popout checks pass.

### Wave 6 - Hardening + Rollout (3-5 days)
1. E2E parity suite in `athelon-app/e2e` for planner flows.
2. Regression coverage for:
   - scheduling collisions,
   - archive restore correctness,
   - financial persistence,
   - role guard behavior.
3. Progressive rollout via feature flags by org.

Exit criteria:
- Zero P0/P1 defects in pilot org, feature flags enabled for staged cohort.

## Risk Register for This Repo
1. Data-model collision:
   - Scheduler uses monolithic state; Athelon uses normalized records.
   - Mitigation: strict adapter contracts and Convex read-model endpoints.
2. Regulatory regression risk:
   - Planning archive/deletion must not conflict with maintenance record retention.
   - Mitigation: isolate planning archive from compliance records.
3. Performance risk:
   - Board + capacity + financial calculations can become heavy.
   - Mitigation: pre-aggregated Convex queries + memoized engine computations.
4. UX complexity:
   - Command-center surfaces can overwhelm existing app IA.
   - Mitigation: phased feature flags and scoped entry points in existing pages.

## Testing Strategy
1. Unit tests:
   - scheduling engine (move/resize/conflict/optimization),
   - capacity math,
   - P&L projection math.
2. Convex function tests:
   - assignment/resize/archive/restore invariants,
   - bootstrap defaults.
3. E2E tests:
   - adapt scheduler 14-scenario matrix to `athelon-app/e2e`.

## Definition of Done
1. Scheduler core features run in `athelon-app` under Convex/Clerk architecture.
2. No parallel auth/data stack from `scheduler/` remains in runtime path.
3. E2E parity for board, capacity, P&L, magic scheduler, archive/restore is green.
4. Feature flags allow safe staged rollout and rollback.
