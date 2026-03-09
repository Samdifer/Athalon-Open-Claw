# Lead Workspace - Feature Registry

## Design Direction

- Primary mode: mixed `ICW` + `CWP`
- This is the strongest collaboration-oriented internal surface in Wave 0
- It still lives inside the execution spine and should not drift into chat-like tooling

## Roles and Access

- Primary users:
  - `lead_technician`
  - `shop_manager`
  - `admin`
- Current access reality:
  - `/lead` is restricted in `route-permissions.ts`
  - `/work-orders/lead` is explicitly guarded for lead roles
  - `mro-access.ts` maps `/lead` through `reports.view`, which is semantically weak

## Entry Points and Adjacent Surfaces

- Main entries:
  - `/lead`
  - `/work-orders/lead`
  - `/work-orders/handoff`
- Main adjacency:
  - Work Orders backlog and detail
  - Scheduling roster
  - OJT training
  - Dashboard

## Routes

- `/lead`
- `/work-orders/lead`
- `/work-orders/handoff`

## Shell Dependencies

- Requires `OrgContextProvider`
- Depends on top-bar shell and global navigation for fast movement to Work Orders and Training
- Uses lazy-loaded roster workspace from Scheduling inside the lead surface
- Time oversight tabs pull in time-management patterns that are also present under Personnel

## Data Dependencies

### Convex Queries

- `api.leadTurnover.getLeadWorkspace`
- `api.workOrders.getWorkOrdersWithScheduleRisk`
- `api.taskCards.getShiftHandoffDashboard`
- Via embedded time oversight components:
  - time-clock and technician views from personnel/time-management patterns

### Convex Mutations and Actions

- `api.leadTurnover.assignEntity`
- `api.leadTurnover.upsertTurnoverDraft`
- `api.leadTurnover.submitTurnoverReport`

### Cross-Feature Data

- Work-order risk summary for operational awareness
- Scheduling roster workspace embedded as a large lazy sub-surface
- Personnel time-management component reuse

## Cross-Feature Component Imports

- Reuses scheduling roster workspace under the Lead Center
- Pulls in personnel time-management components through route-family reuse

## Shared Component Usage

- Standard shared UI primitives
- Indirect shell dependencies through tabs, header actions, and routing links

## UI Patterns in Use

- Tabbed workspace with six operational tabs:
  - Shift Board
  - Task Feed
  - Work Orders
  - Time & Hours
  - Roster
  - Turnover
- KPI summary cards across the top
- Draft/submitted indicator on turnover
- Inline operational panels rather than modal-heavy interaction

## State Model

- Report date drives workspace query state
- Tabs are local and controlled in the page
- Turnover draft vs submitted state is part of the live workspace record
- Embedded roster area introduces a large lazy-loaded child workspace

## Key Workflows by Role

- Lead technician:
  - open Shift Board
  - reassign people or work
  - watch active task feed and work-order risk
  - inspect time and hours
  - check roster
  - draft and submit turnover report
- Shop manager:
  - review the same workspace from a broader oversight position
  - use work-order monitor and time tabs for shift control
- Admin:
  - maintain visibility and override access where needed

## Critical Decisions and Safety Checks

- Assignment changes
- Turnover report submission and lock state
- Work-order risk triage
- Time oversight before end-of-shift handoff

## Redesign Notes

- This is the main place where `CWP` influence is justified
- Preserve the authoritative-record tone; do not redesign this as messaging software
- Later redesign should decide whether `/lead` becomes the canonical lead workspace and `/work-orders/lead` becomes an alias, or vice versa

## Surface Acceptance Criteria

- Later redesign must preserve shift board, task feed, work-order monitoring, roster, and turnover in one reachable flow
- Lead users must be able to jump from this surface into work orders and back without losing context
- Access semantics for `/lead` must be clarified before visual redesign

## Open Questions

- Should `/work-orders/handoff` remain a separate route or become a lead tab/state?
- Is the roster tab a long-term embedded dependency or should it deep-link into Scheduling?
