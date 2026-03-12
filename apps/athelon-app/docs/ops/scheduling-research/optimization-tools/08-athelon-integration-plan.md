# 08 — Athelon Optimization Integration Plan

> Approved plan from 2026-03-12 for integrating optimization technologies into Athelon across Part 135/91 operations planning and Part 145 schedule optimization.

> Full plan file: `.claude/plans/polymorphic-waddling-blossom.md`

---

## Decisions Made

| Question | Decision |
|---|---|
| Customer portal availability input | Phased: MRO staff enters manually first (Phase 2), customer self-service in Phase 3 |
| Optimization transparency | Full transparency — show score breakdown, constraints, alternatives rejected |
| CP-SAT invocation | On-demand only — schedule never changes without human action |
| Domain priority | Parallel — both Domain A and Domain B built simultaneously |
| Training recommendations | Show skill gaps abstractly, drill-down to specific techs with reasoning |
| Multi-location rebalancing | Surface opportunity with full transparency, no automated workflow |

## Design Principles

1. **Full transparency everywhere** — every optimization recommendation includes WHY
2. **Human-in-the-loop always** — no automated schedule changes, all optimization produces suggestions
3. **Parallel domain development** — Domain A and B share the capacity data layer
4. **Progressive trust building** — MRO-staff-only workflows first, customer self-service later

## Implementation Phases Summary

### Phase 1 (Weeks 1-6): TypeScript-First, Zero New Infrastructure
- Schema additions (backward compatible optional fields)
- B1: magicSchedule FFD upgrade
- B2: Wire CPM to Gantt board
- B4: Vector capacity dimension breakdown
- A1: Due-list workbench expansion (LLP, TBO, carry-forward, bundle scoring)
- A2: Maintenance window recommendation algorithm
- A3: Predictions engine overhaul

### Phase 2 (Weeks 7-14): Convex Orchestration + New Surfaces
- B3: Resource leveling integration
- B5: Parts-aware hold detection
- B6: Tooling constraint integration
- B7: EVM dashboard per WO
- B9: Training window scheduler
- B10: Workforce planning page
- A4: Aircraft maintenance outlook page
- A5: Customer portal maintenance visibility (MRO staff enters availability)
- PERT + Monte Carlo via Web Workers

### Phase 3 (Weeks 15+): Microservices + ML
- B12: CP-SAT optimization microservice (on-demand only)
- B8: LP/MIP financial optimization
- B11: Multi-location work balance
- A5 extension: Customer self-service availability input
- ADS-B live integration
- ML duration prediction

## Technology-to-Use-Case Map

| Use Case | Technology | Phase | Infrastructure |
|---|---|---|---|
| Tighter bay scheduling | FFD Bin Packing (TS) | 1 | None |
| Critical path on Gantt | CPM (existing TS) | 1 | None |
| Maintenance window recommendations | Window scoring algorithm (TS) | 1 | None |
| Predictions engine | Multi-signal projection (TS) | 1 | None |
| Due-list expansion | Query expansion (Convex) | 1 | None |
| Skill-dimension capacity | Vector bin packing (TS) | 1 | None |
| Resource leveling | Existing TS engine | 2 | None |
| EVM tracking | Existing TS engine | 2 | None |
| Parts-aware scheduling | Convex query | 2 | Schema additions |
| Tool conflict detection | TS + Convex | 2 | Schema additions |
| Workforce planning | TS capacity analysis | 2 | New page |
| Training optimization | DP knapsack (TS) | 2 | None |
| PERT confidence intervals | 3-point estimation (TS) | 2 | Schema additions |
| Monte Carlo simulation | Web Worker (TS) | 2 | None |
| Full-shop optimization | CP-SAT (Python) | 3 | Microservice |
| Financial optimization | LP/MIP (Python) | 3 | Microservice |
| Duration prediction (ML) | XGBoost/LightGBM | 3 | Microservice |
| ADS-B live utilization | FlightAware API | 3 | API integration |

## Required Schema Additions

| Table | Field | Type | Purpose |
|---|---|---|---|
| `taskCards` | `estimatedHoursOptimistic` | optional number | PERT lower bound |
| `taskCards` | `estimatedHoursPessimistic` | optional number | PERT upper bound |
| `parts` | `typicalLeadTimeDays` | optional number | Parts-aware scheduling |
| `vendors` | `defaultLeadTimeDays` | optional number | Vendor lead time fallback |
| `hangarBays` | `capabilities` | string[] | Bay specialization |
| `aircraft` | `averageDailyHours` | optional number | Utilization rate |
| `aircraft` | `averageDailyCycles` | optional number | Cycle-based projections |
