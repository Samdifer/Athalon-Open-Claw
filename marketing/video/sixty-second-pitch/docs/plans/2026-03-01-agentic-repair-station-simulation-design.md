# Agentic Repair-Station Simulation Design

Date: 2026-03-01
Context source: `../../../athelon-app` seeded repair-station scenario, E2E user-story specs, and current product positioning (`planning`, `quoting`, `scheduling`, `resources`, `compliance`, AI-assisted decisions).

## Objective

Design and run a repeatable multi-agent simulation that mirrors a working Part 145/Part 135 repair station. The simulation must surface feature-level friction, workflow breakpoints, and missing capabilities by combining realistic user behavior with developer-side observation.

## Why This Structure

Single-user QA misses most handoff failures. Repair stations are multi-role operations where problems usually appear between roles (service writer to scheduler, technician to inspector, parts to billing, station A to station B). The design therefore emphasizes:

- Role-constrained user simulators that behave like real shop personnel.
- Embedded developer observers who capture behavior and anticipated edge-case failures.
- A central orchestrator that reconciles findings into one backlog.

## Simulation Architecture

`Orchestrator` -> runs cadence, enforces evidence quality, synthesizes findings.

`Agentic teams` (5 teams) -> each team contains:

- `User Agent` (persona-driven task execution)
- `Developer Observer` (friction capture + probable root cause)
- `QA Scribe` (timestamps, route refs, repro steps, data condition)

`Artifact flow`:

1. Team charter defines mission and KPI.
2. Journey script executes cross-feature scenario.
3. Developer observation log captures defects, near-misses, and likely failure paths.
4. Orchestrator aggregates all team outputs.
5. Consolidated backlog split into immediate fixes and missing features.

## Coverage Model

The simulation covers all primary station domains:

- Dispatch and line maintenance triage
- Work-order lifecycle and task execution
- Scheduler planning and bay assignment
- Parts, rotables, loaners, and tools
- Compliance and audit trail review
- Quote to conversion to invoice to payment
- Multi-location operations and handoffs
- Reporting and management review

## Evidence Standard

A finding is accepted only if it includes:

- User role and scenario step
- Route/module touched
- Behavior observed
- Operational risk statement
- Recommendation class (`fix-now` or `missing-feature`)

## Execution Cadence

- `Cycle 1`: Team-level execution and logs
- `Cycle 2`: Developer anticipation pass (edge cases not yet triggered)
- `Cycle 3`: Orchestrator synthesis and de-duplication
- `Cycle 4`: Backlog publication with severity and ownership hints

## Success Criteria

- Every core feature group is exercised in at least one cross-feature journey.
- Every team produces a saved journey artifact and observation artifact.
- Orchestrator outputs one merged narrative and one prioritized backlog.
- Backlog separates bugs from feature gaps to prevent triage confusion.

## Risks and Controls

- Risk: Findings drift into opinion.
- Control: Require route/module references and concrete workflow impact.

- Risk: Teams over-index on one module.
- Control: Use feature-workflow matrix and explicit cross-team handoffs.

- Risk: Duplicate findings inflate priority.
- Control: Orchestrator canonicalizes by root cause cluster.
