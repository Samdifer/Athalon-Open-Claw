# Scheduler Parity Missing Items Implementation Plan

Date: 2026-03-01  
Owner: Scheduling parity program (Athlon app)

## Objective
Implement the currently missing scheduler parity items in `athelon-app` while preserving Athlon's route-based architecture and Convex data model.

## Scope
This plan covers the parity gaps currently identified:
1. Backlog -> timeline drag/drop assignment.
2. Vertical drag across bays and hangar row reordering.
3. Scheduler edit-mode tools (distribute/block painter).
4. Board-native magic selection workflow.
5. Fullscreen scheduling experience.
6. Analytics panel parity in scheduling surface.
7. Roster side panel parity in scheduling surface.
8. Graveyard/archive management UX.
9. Scheduling onboarding/welcome/setup defaults flow.
10. In-scheduling command-center UX for config/personnel/financial controls.
11. Scheduler-embedded quote builder workflow.

## Non-Goals
1. Replacing Athlon billing, reports, personnel, or settings routes.
2. Reintroducing monolithic app state from `scheduler`.
3. Full rewrite of current scheduling page; this is an incremental parity program.

## Delivery Strategy
Ship in six waves. Each wave is releasable behind feature flags and includes an explicit test gate.

## Wave 1 (P0): Core Board Interaction Parity
### Deliverables
1. Backlog cards become draggable onto `GanttBoard` lanes.
2. Drop creates assignment via `schedulerPlanning.upsertScheduleAssignment`.
3. Scheduled bars support vertical lane moves (bay change) plus horizontal date move.
4. Hangar/bay row reorder control in scheduling view.

### Implementation Notes
1. Extend board DnD payload types in:
   - `app/(app)/scheduling/_components/BacklogSidebar.tsx`
   - `app/(app)/scheduling/_components/GanttBoard.tsx`
2. Add lane reorder persistence contract (new mutation if needed) in:
   - `convex/hangarBays.ts`
3. Preserve location scoping in all mutations and queries.

### Acceptance Criteria
1. User can drag unscheduled WO from backlog to a bay/date lane and see persisted bar after refresh.
2. User can drag a scheduled bar to another bay and persistence updates bay assignment.
3. Bay order changes persist per location and affect board render order.

### Test Gate
1. `npx tsc --noEmit`
2. Add Playwright coverage for backlog drop, bay move, row reorder.

## Wave 2 (P0): Archive Lifecycle + Graveyard UX
### Deliverables
1. Graveyard panel with archived work orders.
2. Archive, restore, and permanent-delete user flows from scheduling context.
3. Two-step destructive confirmation for permanent delete.

### Implementation Notes
1. Build graveyard dock panel first; optional popout in same wave if low risk.
2. Use existing planner mutations:
   - `archiveScheduleAssignment`
   - `restoreScheduleAssignment`
3. Add permanent delete mutation if required (or route through existing WO delete flow with safeguards).

### Acceptance Criteria
1. Archived items leave active board immediately and appear in graveyard list.
2. Restore returns item to prior or selected lane/date.
3. Permanent delete cannot execute without explicit second confirmation.

### Test Gate
1. Unit tests for archive/restore/delete mutation guards.
2. Playwright scenario covering archive -> restore and archive -> delete.

## Wave 3 (P1): Scheduler UX Surface Parity
### Deliverables
1. Fullscreen scheduling route/mode with safe exit and no state divergence.
2. Analytics panel added to dock ecosystem with existing scroll sync behavior.
3. Roster side panel integrated into scheduling surface.

### Implementation Notes
1. Use URL state (`?view=fullscreen`) to avoid state forks.
2. Keep one source of truth for timeline window and selected location.
3. Reuse `DraggableWindow` for popout parity where appropriate.

### Acceptance Criteria
1. Fullscreen mode shows same data and actions as standard view.
2. Analytics and roster panels honor location filtering.
3. Panel open/dock/popout does not break timeline sync.

### Test Gate
1. Add Playwright story for fullscreen enter/exit and panel interactions.
2. Add visual regression snapshots for docked layouts.

## Wave 4 (P1): Advanced Scheduling Controls
### Deliverables
1. Edit mode tools:
   - distribute mode
   - block/day-painter mode
2. Day-model UI wired to `setScheduleDayModel`.
3. Board-native magic selection flow (select bars/cards directly from board/backlog).

### Implementation Notes
1. Introduce explicit scheduling interaction modes to avoid drag/edit conflicts.
2. Keep current Magic Scheduler dialog as fallback until board-native flow is stable.
3. Persist mode toggles in local UI state only (no server persistence needed).

### Acceptance Criteria
1. Edit tools can apply bulk schedule adjustments without corrupting assignments.
2. Day-model updates change planner behavior and survive refresh.
3. Board-native selection can hand off to magic scheduling and return deterministic results.

### Test Gate
1. Unit tests for distribute/block transformation logic.
2. Playwright coverage for mode switching and bulk scheduling actions.

## Wave 5 (P1): In-Scheduling Command Center
### Deliverables
1. Scheduling command center container with tabs/sections:
   - Personnel
   - Configuration
   - Financial planning
2. Incremental embedding strategy:
   - Phase A: read-only summaries + deep links.
   - Phase B: inline edit for highest-frequency fields.

### Implementation Notes
1. Do not duplicate full route screens in first pass.
2. Build shared hooks that can be used by route pages and command center widgets.
3. Enforce role-based access controls on edit actions.

### Acceptance Criteria
1. Users can complete common scheduling-adjacent adjustments without leaving scheduling page.
2. Source routes remain functional and data-consistent.
3. No duplicated business logic between route pages and scheduler command center.

### Test Gate
1. Component tests for command center widgets and permission states.
2. End-to-end flow: change config/personnel/financial value -> board reflects effect.

## Wave 6 (P2): Embedded Quote Builder + Onboarding
### Deliverables
1. Scheduler-embedded quote workflow (open/edit/save quote in scheduling context).
2. Onboarding/welcome/setup-defaults experience for first-run scheduling users.

### Implementation Notes
1. Reuse billing quote APIs/components via shared hooks and compact scheduler shell.
2. Preserve quote source of truth in billing domain; scheduler hosts an embedded surface.
3. Gate onboarding by organization/user flags (already seen, skip, complete).

### Acceptance Criteria
1. Quote edits from scheduler and billing remain consistent.
2. First-run users can complete setup without dead ends.
3. Returning users are not forced through onboarding again.

### Test Gate
1. Regression suite for quote actions started from scheduling.
2. Playwright first-run org onboarding scenario.

## Cross-Wave Engineering Standards
1. Feature flag each wave (`schedulerParityWave1...wave6`).
2. No location leaks: every query/mutation remains location scoped.
3. Preserve optimistic UI patterns already present in scheduling page.
4. Add telemetry on new interactions (drop, move, archive, mode apply, quote open/save).
5. Update seeded-user-story E2E specs after every wave.

## Risk Register
1. **Interaction-mode conflicts** (drag vs edit-mode tools): mitigate with explicit mode state and UI affordances.
2. **Duplication with existing route modules**: mitigate by extracting shared hooks and pure logic modules.
3. **Performance regressions** from added panels and DnD events: mitigate with memoized selectors and targeted virtualization.
4. **Data integrity for archive/delete**: mitigate with server-side validation and two-step confirmations.
5. **Quote parity drift**: mitigate with a single quote domain contract and shared validation.

## Definition of Done
1. All 11 missing parity items are implemented or intentionally deferred with owner/date.
2. New and existing scheduling E2E suites pass in CI.
3. Manual UAT confirms parity for top scheduling workflows.
4. Technical docs updated for scheduler module architecture and interaction modes.
