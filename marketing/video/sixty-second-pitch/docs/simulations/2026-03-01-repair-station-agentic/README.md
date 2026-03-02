# Repair Station Agentic Simulation (2026-03-01)

This folder contains a complete multi-team simulation system for Athelon-style repair-station operations.

## Purpose

Run realistic user behavior across features in concert, capture developer observations, and synthesize findings into a backlog of immediate fixes and missing features.

## Folder Map

- `00-governance`
- `01-team-charters`
- `02-user-journeys`
- `03-observations`
- `04-orchestrator`
- `05-backlog`
- `templates`

## Execution Sequence

1. Read governance files.
2. Assign teams and run each journey.
3. Complete team observation logs.
4. Feed all outputs to orchestrator synthesis.
5. Execute backlog triage.

## Canonical Outputs

- Team journey narratives: `02-user-journeys/*`
- Developer observation logs: `03-observations/*`
- Consolidated synthesis: `04-orchestrator/01-cross-team-synthesis.md`
- Priority backlog: `05-backlog/01-feature-bug-list.md`

## Live Execution Outputs

- Command log and run metrics: `03-observations/2026-03-01-live-run-command-log.md`
- Execution-backed synthesis: `04-orchestrator/02-live-execution-synthesis.md`
- Execution-validated bug list: `05-backlog/02-execution-validated-bug-list-2026-03-01.md`
