# My Work - Feature Registry

## Design Direction

- Primary mode: `ICW`
- Secondary influence: `PNU` for technician legibility and quick single-task completion

## Roles and Access

- Primary users:
  - `technician`
  - `lead_technician`
- Current access reality:
  - route family is small and focused
  - `route-permissions.ts` currently allows `/my-work/*` for all roles, which is broader than the intended technician audience

## Entry Points and Adjacent Surfaces

- Main entries:
  - `/my-work`
  - `/my-work/time`
- Main adjacency:
  - work-order task card detail
  - billing time clock
  - personnel profile linkage when technician context is missing

## Routes

- `/my-work`
- `/my-work/time`

## Shell Dependencies

- Depends on `OrgContextProvider` for technician linkage
- Overlaps directly with `GlobalTimerWidget` behavior in the top bar
- Relies on shell navigation back into Work Orders and Personnel

## Data Dependencies

### Convex Queries

- `api.taskCards.listTaskCardsForTechnician`
- `api.workOrders.listActive`
- `api.taskCards.listTaskCardsForWorkOrder`
- `api.timeClock.getActiveTimerForTechnician`
- `api.timeClock.listTimeEntries`

### Convex Mutations and Actions

- `api.timeClock.startTimer`
- `api.timeClock.stopTimer`
- `api.timeClock.pauseTimer`
- `api.timeClock.resumeTimer`

### Cross-Feature Data

- Pulls work-order context into personal labor tracking
- Depends on technician profile linkage from personnel/bootstrap state

## Cross-Feature Component Imports

- None significant beyond shared UI

## Shared Component Usage

- Heavy use of shared UI primitives
- Indirect dependency on `GlobalTimerWidget` for global timer parity

## UI Patterns in Use

- Card list of assigned work
- Header-level active-only toggle
- Summary KPI cards
- Empty-state CTA to Personnel when no technician profile is linked
- Time page uses form-like timer controls and filters

## State Model

- `activeOnly` filter on main page is local state
- Sorting is urgency-first by schedule risk and task status
- Time page mixes selected work order, task card, timer context, and live timer state

## Key Workflows by Role

- Technician:
  - open My Work
  - isolate active cards
  - sort by urgency implicitly
  - open task card for execution
  - use My Time to start, pause, resume, and stop labor entries
- Lead technician:
  - use My Work as a personal execution view while also working in Lead Center

## Critical Decisions and Safety Checks

- Starting a timer against the wrong work order or task
- Missing technician profile linkage
- Completing steps without a clear signoff cue

## Redesign Notes

- This should become the most technician-friendly execution surface in the app
- Preserve urgency sorting and active-only behavior
- Later redesign should reduce cognitive load and make timer context clearer without losing access to task-card detail

## Surface Acceptance Criteria

- A technician must be able to go from My Work to task execution in one obvious step
- Timer actions must remain reliable and consistent with the global timer
- Missing-profile state must remain explicit and actionable

## Open Questions

- Should My Time remain its own route or become a docked panel within My Work?
- Should read-only or non-technician roles have any sanctioned My Work visibility at all?
