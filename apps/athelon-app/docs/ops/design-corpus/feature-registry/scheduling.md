# Scheduling - Feature Registry

## Design Direction

- Primary mode: `ICW`
- Secondary influence: `CWP` for cross-team coordination
- This is already one of the strongest workbench surfaces in the app

## Roles and Access

- Primary users:
  - `shop_manager`
  - `lead_technician`
  - `admin`
- Intended read/view users according to other helpers:
  - `technician`
  - `read_only`
- Current access mismatch:
  - `mro-access.ts` grants `scheduling.view` to `technician` and `read_only`
  - `route-permissions.ts` only allows `/scheduling/*` for `admin`, `shop_manager`, and `lead_technician`

## Entry Points and Adjacent Surfaces

- Main entries:
  - `/scheduling`
  - `/scheduling/bays`
  - `/scheduling/capacity`
  - `/scheduling/roster`
  - `/scheduling/quotes`
  - `/scheduling/due-list`
  - `/scheduling/seed-audit`
  - `/scheduling/financial-planning`
- Main adjacency:
  - Work Orders
  - Parts
  - Personnel / roster
  - Dashboard
  - Quote workspace

## Routes

- `/scheduling`
- `/scheduling/bays`
- `/scheduling/capacity`
- `/scheduling/roster`
- `/scheduling/quotes`
- `/scheduling/due-list`
- `/scheduling/seed-audit`
- `/scheduling/financial-planning`

## Shell Dependencies

- Strong dependency on `LocationSwitcher` and location-local state
- Uses global app shell but also creates an internal page-nav tier
- Depends on command and keyboard-heavy interaction
- Uses fullscreen mode via search params
- Pulls in quote workspace and roster workspace from outside the core scheduling board

## Data Dependencies

### Convex Queries

- Board and planning:
  - `api.workOrders.getWorkOrdersWithScheduleRisk`
  - `api.hangarBays.listBays`
  - `api.schedulerPlanning.listPlannerProjects`
  - `api.schedulerPlanning.getPlanningFinancialSettings`
  - `api.capacity.getSchedulingSettings`
  - `api.capacity.getTechnicianWorkload`
  - `api.stationConfig.getTimelineCursorConfig`
  - `api.tatEstimation.getEstimates`
- Roster and readiness:
  - `api.schedulerRoster.getRosterWorkspace`
  - `api.schedulerRoster.listSchedulingHolidaysForRange`
  - `api.technicianTraining.getActiveTrainingByOrg`
- Snapshots and audit:
  - `api.scheduleSnapshots.listSnapshots`
  - `api.seedAudit.getRepairStationSeedCoverage`
  - `api.seedAudit.getSchedulerParityGaps`
- Supporting:
  - `api.roles.getMyRole`
  - `api.shopLocations.list`
  - `api.billing.listQuotes`
  - `api.planningFromDueList.dueListWorkbench`

### Convex Mutations and Actions

- Planning board:
  - `api.schedulerPlanning.upsertScheduleAssignment`
  - `api.schedulerPlanning.archiveScheduleAssignment`
  - `api.schedulerPlanning.restoreScheduleAssignment`
  - `api.schedulerPlanning.setScheduleDayModel`
  - `api.schedulerPlanning.upsertPlanningFinancialSettings`
- Capacity and location:
  - `api.capacity.upsertSchedulingSettings`
  - `api.capacity.upsertTechnicianShift`
  - `api.shopLocations.create`
- Bays:
  - `api.hangarBays.createBay`
  - `api.hangarBays.updateBay`
  - `api.hangarBays.releaseBay`
  - `api.hangarBays.reorderBays`
- Roster:
  - create, update, archive, and delete operations across roster teams, shifts, and holidays
- Snapshots and due list:
  - `api.scheduleSnapshots.saveSnapshot`
  - `api.scheduleSnapshots.deleteSnapshot`
  - `api.planningFromDueList.generateMonthlyPlan`
- Quotes:
  - `api.billing.cloneDeclinedQuote`

### Cross-Feature Data

- Work Orders are the main scheduling payload
- Quote workspace ties scheduling to commercial flows
- Roster and training tie scheduling to personnel readiness
- Shop locations and station config shape the board

## Cross-Feature Component Imports

- Imports roster constants from Personnel shared code

## Shared Component Usage

- `LocationSwitcher`
- `QuoteWorkspaceShell`
- `ActionableEmptyState`
- `MissingPrereqBanner`
- Shared UI primitives throughout

## UI Patterns in Use

- Full-canvas workbench with its own page-nav strip
- Backlog and graveyard sidebars
- Floating / popout panels:
  - analytics
  - roster
  - financial tracker
- Command-center and quote-workspace dialogs
- Magic Scheduler modal
- Keyboard shortcuts and undo system
- Partial URL/search-param state via fullscreen mode

## State Model

- Very heavy local state:
  - board layout
  - sidebars
  - popouts
  - onboarding visibility
  - edit mode
  - magic scheduler selection state
  - snapshot state
  - timeline config
- Search params control fullscreen mode
- Location selection comes from shared shell state

## Key Workflows by Role

- Shop manager:
  - open scheduling board
  - allocate bays and assignments
  - watch capacity and financial signals
  - use command center and snapshots
- Lead technician:
  - coordinate roster and assignment realities
  - use board and roster views together
- Admin:
  - maintain schedule settings, facilities, and parity tools
- Due-list planner:
  - work from due-list and generate monthly plan

## Critical Decisions and Safety Checks

- Assignment changes that alter delivery expectations
- Bay reordering and archive/restore actions
- Snapshot save/delete and baseline handling
- Schedule edits performed under keyboard shortcuts and undo semantics

## Redesign Notes

- This surface should be refined, not reset
- Highest-value follow-ups:
  - extract `useScheduleBoard`
  - standardize side-panel drill-in
  - make URL-backed filter state broader than fullscreen only
  - preserve keyboard and undo behavior during any visual overhaul

## Surface Acceptance Criteria

- Drag/assignment behavior, snapshots, roster, and due-list flows must remain intact
- Any redesign must preserve location-aware behavior
- Keyboard shortcuts and undo cannot regress silently

## Open Questions

- Should quote workspace remain a dialog from Scheduling or become a distinct linked workbench?
- Which scheduling views deserve direct navigation versus internal tabs or panels?
