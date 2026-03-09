# Compliance - Feature Registry

## Design Direction

- Primary mode: `ICW`
- Secondary influence: document-centric review and readiness gating

## Roles and Access

- Primary users:
  - `qcm_inspector`
  - `shop_manager`
  - `admin`
- Intended secondary viewers from other helpers:
  - `technician`
  - `lead_technician`
  - `read_only`
- Current access mismatch:
  - `mro-access.ts` grants `compliance.view` to more roles than `route-permissions.ts` currently allows

## Entry Points and Adjacent Surfaces

- Main entries:
  - `/compliance`
  - `/compliance/qcm-review`
  - `/compliance/audit-trail`
  - `/compliance/ad-sb`
  - `/compliance/audit-readiness`
  - `/compliance/diamond-award`
- Alias edge:
  - `/compliance/certificates` redirects into audit-trail tooling
- Main adjacency:
  - Fleet
  - Work Orders
  - Findings
  - Training
  - Settings/station config

## Routes

- `/compliance`
- `/compliance/qcm-review`
- `/compliance/audit-trail`
- `/compliance/ad-sb`
- `/compliance/audit-readiness`
- `/compliance/diamond-award`
- alias: `/compliance/certificates`

## Shell Dependencies

- Depends on org context from the shell
- Uses top-level navigation for quick movement to adjacent compliance tools
- Works as a hub surface with many sibling links rather than a single monolithic page

## Data Dependencies

### Convex Queries

- Fleet and AD state:
  - `api.aircraft.list`
  - `api.adCompliance.checkAdDueForAircraft`
  - `api.adCompliance.getFleetAdSummary`
  - `api.adCompliance.listAdRecordsForAircraft`
- QCM and audit readiness:
  - `api.gapFixes.listStepsRequiringIAReview`
  - `api.maintenanceRecords.getWorkOrderCloseReadinessV2`
  - `api.workOrders.listWorkOrders`
  - `api.discrepancies.listDiscrepancies`
  - `api.stationConfig.getStationConfigWorkspace`
  - `api.technicians.list`
  - `api.toolCrib.listCalibrationDue`
  - `api.toolCrib.listTools`
  - `api.training.listExpiringTraining`
  - `api.training.listOrgTraining`
  - `api.ojt.listJacketsByTechnician`
  - `api.ojt.listStageEvents`

### Convex Mutations and Actions

- This route family is more read/review heavy than mutation heavy in the sampled Wave 0 set
- Most decisive actions happen in adjacent work-order and training surfaces

### Cross-Feature Data

- Fleet provides aircraft and AD context
- Work Orders provide close-readiness and IA review obligations
- Findings feed audit readiness gaps
- Training and OJT feed Diamond Award and readiness narratives
- Station config shapes compliance expectations

## Cross-Feature Component Imports

- None significant in the current route family beyond shared components

## Shared Component Usage

- `ActionableEmptyState`
- `ExportCSVButton`
- Shared card, badge, select, and skeleton primitives

## UI Patterns in Use

- Compliance hub page with quick-link buttons to sibling sub-surfaces
- Fleet stats cards and per-aircraft compliance cards
- Audit-readiness score and timeline components
- Mostly full-page review surfaces, not sheet drill-ins
- Exception and readiness information is distributed across several routes

## State Model

- More query-driven than locally stateful on the hub page
- Audit readiness composes many read models across domains
- Sorting and filtering behavior is present but not strongly standardized

## Key Workflows by Role

- QCM inspector:
  - open Compliance hub
  - review fleet status and AD/SB posture
  - move into QCM Review for IA-required items
  - inspect audit readiness gaps
  - review Diamond Award/training posture
- Shop manager:
  - use readiness and audit views to understand operational risk
- Admin:
  - maintain governance and cross-surface oversight

## Critical Decisions and Safety Checks

- AD non-compliance and due-soon state
- IA-required review items
- Audit readiness blockers
- Training and tooling readiness as compliance prerequisites

## Redesign Notes

- This route family should gain a more explicit exception-first queue structure
- `ReadinessGate` and shared timeline patterns are directly relevant here
- Later redesign should make audit-readiness blockers and review actions more coherent across routes

## Surface Acceptance Criteria

- A QCM user must still be able to move from fleet-level status to specific readiness and review flows
- AD, audit, and training readiness signals must remain visible and traceable
- Redirect aliases such as `/compliance/certificates` must remain accounted for

## Open Questions

- Should audit-readiness become the dominant landing surface for QCM users instead of the current hub?
- Which technician-facing compliance read views should become first-class rather than deep-link-only?
