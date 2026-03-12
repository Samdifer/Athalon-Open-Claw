# Integration Architecture: Multi-Solver Optimization Stack for Athelon

> Definitive blueprint for bringing CP-SAT, LP/MIP, Monte Carlo simulation, machine learning prediction, and the existing TypeScript scheduling engines together into a coherent production system.
>
> Written 2026-03-12. Based on code audit of existing scheduling engine files and external research.

---

## Table of Contents

1. [The Optimization Stack — How Everything Fits Together](#1-the-optimization-stack)
2. [Technology Selection Matrix](#2-technology-selection-matrix)
3. [Microservice Architecture](#3-microservice-architecture)
4. [Implementation Phases](#4-implementation-phases)
5. [Decision Flows](#5-decision-flows)
6. [Interaction Matrix](#6-interaction-matrix)
7. [Risk and Mitigation](#7-risk-and-mitigation)
8. [Success Metrics](#8-success-metrics)

---

## 1. The Optimization Stack — How Everything Fits Together {#1-the-optimization-stack}

The Athelon scheduling system has five logical layers. Each layer builds on the layer below it. Layers 0–1 are pure TypeScript with no new infrastructure. Layers 2–4 require new deployments.

```
Layer 4: UI Integration
  Gantt board · Capacity dashboard · Workforce planner · Command center
         |
Layer 3: Orchestration (Convex Actions)
  Coordinate between layers · Trigger solves · Persist results · Cache
         |
Layer 2: Optimization Microservices (Python)
  CP-SAT solver · LP/MIP solver · ML prediction
         |
Layer 1: Pure TypeScript Engines (Client or Server)
  CPM · Resource leveling · Cascade · EVM · WBS · Capacity · Conflicts · Day model
         |
Layer 0: Data Foundation (Convex)
  workOrders · scheduleAssignments · hangarBays · technicians · taskCards · ...
```

### Layer 0: Data Foundation (Convex)

#### Data That Exists Today

The Convex schema already has the core operational tables:

| Table | Purpose | Key Fields |
|---|---|---|
| `workOrders` | Jobs to be scheduled | priority, estimatedHours, promisedDelivery, status |
| `scheduleAssignments` | Bay/date assignments for WOs | woId, bayId, startDate, endDate |
| `hangarBays` | Physical slots | capacity, shopLocationId |
| `technicians` | The workforce | role, certifications, rosterTeamId, primaryShopLocationId |
| `rosterTeams` | Team groupings | shiftId, colorToken |
| `rosterShifts` | Shift patterns | daysOfWeek, startHour, endHour, efficiencyMultiplier |
| `technicianShifts` | Per-tech overrides | effectiveFrom, effectiveTo, daysOfWeek |
| `schedulingHolidays` | Holiday calendar | dateKey, isObserved |
| `taskCards` | Sub-work within a WO | estimatedHours, assignedToTechnicianId, status, percentComplete |
| `taskAssignments` | Execution-level task-to-tech-to-time | startTime, endTime, durationMinutes |
| `taskAssignmentDependencies` | FS/SS/FF/SF links between tasks | predecessorId, successorId, type, lagMinutes |
| `quotes` | Budget baselines for EVM | lineItems, totalCost |
| `documents` | Attachments | type, storageId |
| `scheduleSnapshots` | Point-in-time captures | snapshotAt, woCount, techCount |
| `schedulingSettings` | Org-level defaults | capacityBufferPercent, defaultShift |

#### Data That Needs to Be Added

The following tables are required before Phases 2–4 become viable:

| New Table | Purpose | Key Fields | Required for |
|---|---|---|---|
| `woActuals` | Historical per-WO actuals | woId, estimatedHours, actualHours, estimatedDays, actualDays, aircraftType, workType, techCount, scopeGrowthFactor | ML duration prediction, forecasting |
| `demandForecasts` | Time-phased WO inflow forecasts | orgId, weekKey, forecastedWOs, forecastedHours, confidence, method | Capacity planning, hiring |
| `optimizationRuns` | Audit trail of every solve | runType, triggeredBy, inputHash, status, durationMs, objectiveValue, warnings, solutionJson | Debugging, trust, comparison |
| `optimizationScenarios` | Named what-if scenarios | name, baselineSnapshotId, runId, deltaVsBaseline, createdBy | What-if UI, scenario comparison |
| `capacityGaps` | Pre-computed skill gaps | orgId, weekKey, skillCategory, availableHours, forecastedDemandHours, gapHours | Workforce planning |
| `hiringRecommendations` | LP-derived headcount suggestions | orgId, generatedAt, targetHorizonWeeks, rolesNeeded, costEstimate | Hiring planner |
| `durationPredictions` | ML model outputs per WO/task | entityId, entityType, predictedHours, confidenceLow, confidenceHigh, modelVersion, features | Confidence intervals on Gantt |

#### Data Flow Between Tables

```
User creates WO
  → workOrders (status: open)
  → Convex action triggers magicSchedule
  → scheduleAssignments (bay + dates)
  → CPM runs on taskAssignments + taskAssignmentDependencies
  → criticalItemIds stored in optimizationRuns
  → Gantt renders with critical path highlighted

WO closes
  → woActuals row written (actual vs estimated)
  → ML training data pool grows
  → demandForecasts updated via rolling average

User clicks "Optimize Month"
  → Convex action serializes open WOs + bays + tech shifts
  → POST to CP-SAT microservice
  → optimizationRuns row (status: pending)
  → Poll until done
  → scheduleAssignments bulk-updated
  → optimizationRuns row (status: complete, solutionJson: ...)
```

---

### Layer 1: Pure TypeScript Engines (Client or Server)

These run in-process, synchronously, with zero infrastructure dependencies. All execute in under 100ms for typical MRO shop sizes (under 200 WOs, under 50 technicians).

#### Already Built (Production-Ready)

| Engine | File | What It Does | Performance |
|---|---|---|---|
| Greedy Scheduler | `src/shared/lib/scheduling/magicSchedule.ts` | Priority-sorted WO→bay assignment with load leveling and training validation | ~1ms for 50 WOs |
| CPM | `src/shared/lib/scheduling-engine/critical-path.ts` | Forward/backward pass, total float, critical path, blocking task identification | ~5ms for 200 tasks |
| Resource Leveling | `src/shared/lib/scheduling-engine/resource-leveling.ts` | Tech workload leveling with cert checks, shift awareness, bay capacity | ~20ms for 50 techs × 100 tasks |
| Cascade Scheduling | `src/shared/lib/scheduling-engine/cascade-scheduler.ts` | Date change propagation through FS/SS/FF/SF dependency graph with AOG override | ~2ms per change |
| EVM | `src/shared/lib/scheduling-engine/earned-value.ts` | BAC/PV/EV/AC/SV/CV/SPI/CPI/EAC/ETC with S-curve data | ~1ms per WO |
| WBS | `src/shared/lib/scheduling-engine/wbs.ts` | WO→TaskCard→Step hierarchy with weighted rollup | ~2ms per WO |
| Capacity Model | `convex/capacity.ts` | Available-hours calculation per-tech per-range, utilization vs. committed | ~50ms (DB-bound) |
| Conflict Detection | `src/shared/lib/scheduling/conflicts.ts` | Bay double-booking, tech over-allocation, past-due detection | ~1ms for 100 WOs |
| Day Model | `src/shared/lib/scheduling/dayModel.ts` | Daily effort distribution with non-work day toggling and redistribution | ~1ms |

#### To Add (TypeScript, No New Infrastructure)

These fill capability gaps that the existing engines do not cover:

**Bin Packing for `magicSchedule.ts`**

Bin packing (specifically First Fit Decreasing) improves bay utilization beyond greedy scheduling. Instead of assigning WOs one at a time to the least-loaded bay, bin packing groups WOs by similar duration to maximize contiguous occupancy. Implement as an optional `binPackMode` in `magicSchedule.ts`. Expected improvement: 10-15% reduction in bay idle time for shops running above 60% utilization.

```typescript
// Extension to magicSchedule.ts
export type BinPackOptions = {
  mode: "greedy" | "ffd" | "best_fit";
  binCapacityDays: number; // planning horizon
};
```

**PERT Extension for `critical-path.ts`**

The existing CPM uses single point estimates. PERT adds three-point estimates (optimistic, most likely, pessimistic) and computes expected duration and variance. This feeds Monte Carlo simulation. Add an optional `pertMode` flag that swaps `duration` for `(o + 4m + p) / 6` in the forward pass.

```typescript
// Extension to critical-path.ts types
export interface CPMItemWithPERT extends CPMItem {
  durationOptimistic?: number;   // best case
  durationMostLikely?: number;   // base estimate
  durationPessimistic?: number;  // worst case
}
// Expected: (o + 4m + p) / 6
// Variance: ((p - o) / 6)^2
```

**Monte Carlo Simulation (Web Worker)**

Uses PERT variances from each task to simulate thousands of project completion scenarios. Produces a probability distribution: "there is a 90% probability of completing WO-1234 within 14 days." Run in a Web Worker to avoid blocking the UI thread.

```typescript
// New file: src/shared/lib/scheduling-engine/monte-carlo.ts
export interface MonteCarloInput {
  items: CPMItemWithPERT[];
  dependencies: MRODependency[];
  iterations: number; // 1000–10000
}

export interface MonteCarloResult {
  p10: number; // 10th percentile completion (optimistic)
  p50: number; // median
  p80: number; // 80th percentile
  p90: number; // 90th percentile (conservative promise date)
  histogram: { bucketDays: number; frequency: number }[];
}
```

For a typical MRO WO with 20 task cards and 1000 iterations, Monte Carlo runs in 50–200ms in a Web Worker — acceptable for interactive use when triggered on demand, not continuously.

**Simple Demand Forecasting (TypeScript)**

Exponential smoothing (Holt-Winters single or double) applied to historical WO inflow counts per week. Requires the `woActuals` table (Phase 1 data collection). Implemented in pure TypeScript, runs on the client or in a Convex query. No ML infrastructure needed.

```typescript
// New file: src/shared/lib/scheduling/demandForecast.ts
export function exponentialSmoothing(
  historicalWeeklyWOs: number[],
  alpha: number,  // smoothing factor, 0.1–0.3
  forecastWeeks: number,
): { week: number; forecast: number; upper: number; lower: number }[]
```

**Due-Date Feasibility Checker**

Given a WO's promised delivery date and the CPM result, determines if the date is achievable under current resource constraints. Returns a structured feasibility verdict with the constraining bottleneck.

```typescript
export interface FeasibilityResult {
  feasible: boolean;
  margin: number; // days of float
  bottleneckTaskId?: string;
  requiredAdditionalTechs?: number;
  alternativeDeliveryDate?: number; // if infeasible
}
```

---

### Layer 2: Optimization Microservices (Python)

These services handle problems that are too complex or too slow for pure TypeScript: constraint satisfaction, integer programming, and machine learning inference. They expose HTTP REST APIs, are stateless, and scale horizontally.

#### CP-SAT Solver Service

**Purpose:** Finds globally optimal WO→bay→tech assignments given hard constraints. Unlike the greedy scheduler (which makes locally optimal decisions), CP-SAT considers all assignments simultaneously and finds the arrangement that minimizes total lateness, overtime, or makespan.

**When to use:**
- Monthly planning run (30-day horizon, up to 50 WOs, up to 30 technicians)
- AOG emergency rescheduling (find slots immediately)
- Shift rostering (assign techs to shifts for next 4 weeks)

**Problem formulation for WO scheduling:**
```
Variables:
  x[wo, bay, day] ∈ {0, 1}  "assign WO w to bay b starting day d"
  overtime[tech, day] ≥ 0   "overtime hours for tech t on day d"

Hard constraints:
  Each WO assigned to exactly one (bay, start_day)
  No two WOs overlap in same bay
  Tech hours per day ≤ shift capacity + overtime_limit
  AOG WOs start within 24 hours
  Certifications: task requires cert c → assigned tech has cert c
  Dependencies: WO b cannot start until WO a is complete (if linked)

Soft constraints (objective terms):
  Minimize: Σ lateness[wo] × priority_weight[wo]
          + Σ overtime[tech, day] × overtime_cost
          + Σ bay_idle_gaps × smoothness_penalty

Solution quality:
  Optimal found in < 5s for 30 WOs, 8 bays, 20 techs
  Good solution in < 2s with time limit (anytime algorithm)
  Uses CP-SAT's "minimize makespan" or "minimize weighted tardiness" objective
```

#### LP/MIP Solver Service

**Purpose:** Continuous optimization problems — cost minimization, headcount planning, training ROI. Unlike CP-SAT (combinatorial), LP/MIP handles problems where the optimal amount of a resource (not just yes/no assignment) is the output.

**When to use:**
- Monthly hiring plan: how many technicians of which cert level to hire given demand forecast
- Training investment planning: which technicians to train in what skills to maximize future capacity value
- Cost allocation: minimize parts + labor cost for a given set of WOs

**Problem formulation for hiring optimization:**
```
Variables:
  hire[role, month] ≥ 0  "technicians hired by role in month"

Constraints:
  capacity[month] = Σ existing_techs + Σ hire[role, m≤month]
  capacity[month] ≥ forecasted_demand[month] × (1 + buffer_factor)
  hire[role, month] ≤ hiring_pipeline_limit[role]

Objective:
  Minimize: Σ hire[role, month] × salary_cost[role]
          + Σ training_cost[trainee, certification]
```

#### ML Prediction Service

**Purpose:** Predict task/WO duration from historical actuals, using features like aircraft type, work category, technician experience, and historical scope growth rate.

**When to use:**
- Setting initial duration estimates when quoting
- Adjusting confidence intervals on the Gantt
- AOG risk scoring (predict probability of scope growth)

**Model type:** Gradient boosted trees (XGBoost or LightGBM). These train quickly, are interpretable, require relatively little data (100+ historical WOs to be useful), and do not require a GPU.

**Features:**
- Aircraft make/model/age
- Work order type (inspection, repair, overhaul, modification)
- Historical average hours for this aircraft × work type
- Number of task cards in the WO
- Tech count assigned
- Time since last major inspection
- Scope growth rate of last 3 WOs on this tail

**Data requirement:** 100–300 closed WOs with accurate actuals to train a useful model. This data collection starts in Phase 1.

---

### Layer 3: Orchestration (Convex Actions)

Convex actions bridge the pure TypeScript world (Layer 1) and the external microservices (Layer 2). They run server-side, can call `fetch`, and interact with the database only through `ctx.runQuery` and `ctx.runMutation`.

**Key constraints (from Convex docs):**
- Maximum execution time: 10 minutes
- Memory limit: 64MB (default) / 512MB (Node.js `"use node"`)
- Actions are not auto-retried on failure — the caller must handle retries
- No `ctx.db` access — use `ctx.runQuery` / `ctx.runMutation`

**Action responsibilities:**

| Action | Trigger | What It Does | Duration |
|---|---|---|---|
| `runGreedySchedule` | New WO created, or user clicks "Auto-schedule" | Fetch WOs + bays from DB, call `magicSchedule.ts`, persist results | < 500ms |
| `runCriticalPath` | Any task date change | Fetch tasks + deps, call `computeCriticalPath`, store critical item IDs | < 200ms |
| `runCascade` | Task date drag in Gantt | Fetch all items in WO, call `computeCascade`, persist `DateChange` array | < 300ms |
| `runMonthlyOptimize` | User triggers, or weekly cron | Serialize WO state → POST to CP-SAT service → poll → persist assignments | 10–60s |
| `runAOGReschedule` | AOG priority set on WO | Serialize current schedule → POST to CP-SAT service (short time limit 3s) → persist | 3–5s |
| `runCapacityForecast` | Weekly cron or user request | Aggregate woActuals → run exponential smoothing → write demandForecasts | < 1s |
| `runHiringPlan` | Quarterly, or user request | Fetch demand forecast + current headcount → POST to LP service → store recommendations | 5–15s |
| `runDurationPrediction` | WO created or scope updated | Serialize WO features → POST to ML service → write durationPredictions | 1–2s |

**Caching and invalidation strategy:**

Optimization results are not re-computed on every query — they are cached in `optimizationRuns` and `durationPredictions`. A result is considered stale when:
- Any input WO changes priority or duration estimate
- A new technician is added or removed
- A bay goes out of service
- The planning horizon rolls past the last solve date

The stale detection runs as a lightweight Convex query that compares an `inputHash` (SHA-256 of sorted WO ids + dates) stored in `optimizationRuns` against the current state. If the hash matches, the cached solution is returned without a new solve.

**User-triggered vs automated:**

- **Interactive (user clicks button):** Runs synchronously from the client's perspective using Convex's `useAction` hook. The action writes a pending `optimizationRuns` row immediately, so the UI can show "optimizing..." while polling.
- **Automated (cron/schedule):** Convex scheduled functions trigger the actions. Weekly capacity forecast runs every Sunday at midnight. AOG rescheduling runs within 30 seconds of any WO being marked AOG.

---

### Layer 4: UI Integration

#### Gantt Board Enhancements

The existing Gantt board (`app/(app)/scheduling/`) needs these visualization layers added on top of the current drag-and-drop implementation:

- **Critical path highlighting:** Tasks with `isCritical: true` from the CPM result render with a red left border and bold text. The critical path chain is connected by a red line overlay.
- **Confidence interval ribbons:** When Monte Carlo has run, each task bar shows a translucent extension representing the P10–P90 range.
- **Buffer visualization:** Total float is shown as a hatched pattern to the right of each task bar. Zero float = no buffer shown. High float = long hatched extension.
- **Optimization status badge:** A "Last optimized: 2 hours ago / Re-optimize" button in the toolbar, reading from the most recent `optimizationRuns` row.

#### Capacity Dashboard

The existing capacity forecaster (`app/(app)/scheduling/capacity-forecaster/`) gains:

- **Skill-level gap chart:** Time-phased bar chart showing available hours by certification level (AMT vs IA vs A&P) vs. forecasted demand. Reads from `capacityGaps`.
- **What-if scenarios:** "Add 2 A&P technicians" slider that re-runs the TypeScript capacity model in-browser with modified headcount, without a backend call.
- **Demand forecast overlay:** Exponential smoothing forecast shown as a dashed line extending 12 weeks ahead of today's actual WO backlog.

#### Workforce Planner

New route (Phase 3): `app/(app)/scheduling/workforce-planner/`

- Reads `hiringRecommendations` from the LP solver
- Displays "You need 2 more Lead Technicians by week 8 to meet your forecasted demand"
- Training ROI table: "Training Tech A in IA endorsement costs $2,400 and adds 8 hours/week of IA-eligible capacity — payback in 4 weeks"
- Allows manager to approve/reject recommendations; approved recommendations write to a `staffingPlan` table

#### Command Center

The existing command center dialog (`app/(app)/scheduling/command-center/`) becomes the central optimization trigger panel:

- "Optimize This Week" button → triggers `runMonthlyOptimize` with a 7-day horizon and a 3-second time limit
- "Optimize Next Month" button → triggers `runMonthlyOptimize` with a 30-day horizon and a 60-second time limit
- Scenario comparison side-by-side view (two `optimizationScenarios` compared by total lateness and utilization)
- Approve/apply button that writes the chosen scenario's assignments as the live schedule

---

## 2. Technology Selection Matrix {#2-technology-selection-matrix}

| Use Case | Tool | Why This One | Solve Time Target |
|---|---|---|---|
| Daily WO scheduling (< 20 WOs) | TypeScript `magicSchedule.ts` (greedy + bin packing) | Zero latency, runs client-side, sufficient quality at low utilization | < 10ms |
| Daily WO scheduling (20–100 WOs) | CP-SAT via microservice | Greedy fails at high utilization; CP-SAT finds globally better solutions | < 5s with anytime fallback |
| AOG rescheduling | CP-SAT via microservice, 3s time limit | Must be fast and must not delay AOG; CP-SAT with short time limit gives good-enough solution in guaranteed time | < 3s |
| Monthly capacity plan | LP/MIP via microservice | Pure optimization problem (minimize cost subject to capacity constraints); no combinatorial explosion | < 15s |
| Shift rostering (4-week horizon) | CP-SAT via microservice | Nurse scheduling is canonical CP-SAT domain; handles fairness, preferences, coverage, rest constraints | < 10s |
| Hiring optimization | LP/MIP via microservice | Continuous headcount decisions, cost minimization, multi-period planning — classic LP structure | < 5s |
| Training planning | LP/MIP via microservice | Maximize capacity value of training budget; linear with few integer variables | < 5s |
| Demand forecasting | TypeScript exponential smoothing (Phase 2) / LightGBM (Phase 4) | Smoothing works for 12-week lookahead with minimal data; ML improves with 12+ months of history | < 100ms (TS) / < 500ms (ML) |
| Duration prediction | LightGBM via ML microservice | Gradient boosted trees train quickly on tabular data, are interpretable, and handle the heterogeneous features (aircraft type, work category, historical actuals) | < 100ms inference |
| What-if scenarios | TypeScript engines (no server call) | Scenarios are exploratory; must be instant for interactive use; recalculate using existing CPM + resource leveling engines with modified inputs | < 50ms |
| Quote feasibility check | TypeScript `feasibilityChecker.ts` (to build) + resource leveling | Feasibility check must run while user is typing quote; instant feedback required; full solver overkill for single-WO check | < 100ms |

---

## 3. Microservice Architecture {#3-microservice-architecture}

### Service Design: Single Multi-Purpose Service vs. Separate Services

**Recommendation: Start with one service, split only when forced.**

A single `athelon-optimization-service` handles CP-SAT, LP, and ML inference in one Python FastAPI application. Separate into independent services only when:
- CP-SAT jobs are queuing behind slow ML inference (use worker pools first)
- ML model must be updated independently of the solver logic
- Team size grows to the point where separate deployments are operationally simpler

Starting with one service avoids premature complexity and reduces deployment cost from day one.

### API Design

The service exposes a REST API using FastAPI. All endpoints are stateless — no session or connection state is retained between requests.

```
POST /solve/schedule
  Request:  ScheduleRequest (WOs, bays, techs, constraints, objective weights)
  Response: ScheduleResponse (assignments, metrics, warnings)
  Timeout:  60s max, configurable per-request

POST /solve/roster
  Request:  RosterRequest (techs, shifts, coverage requirements, preferences)
  Response: RosterResponse (assignments, fairness metrics)
  Timeout:  30s max

POST /solve/hiring
  Request:  HiringRequest (demand forecast, current headcount, cost parameters)
  Response: HiringResponse (recommended hires by role by month, cost projection)
  Timeout:  20s max

POST /predict/duration
  Request:  DurationPredictRequest (aircraft type, work type, task count, tech count, historical features)
  Response: DurationPredictResponse (predicted hours, p10, p50, p90, feature importances)
  Timeout:  5s max

GET /health
  Response: { status: "ok", solverVersion: "...", modelVersion: "..." }
```

**Authentication:** All requests include an `Authorization: Bearer <token>` header. The token is a long-lived secret stored in Convex's environment variables and the microservice's environment. No user-level auth — this is a server-to-server integration.

**Why REST over gRPC:** gRPC requires schema compilation and is harder to debug. The optimization service handles at most a few calls per minute; REST + JSON is fast enough and simpler to operate.

### JSON Schema for Optimization Requests

**Schedule Request:**
```json
{
  "requestId": "uuid-v4",
  "organizationId": "org_xxx",
  "horizon": {
    "startMs": 1700000000000,
    "endMs": 1702592000000
  },
  "workOrders": [
    {
      "id": "wo_abc",
      "priority": "urgent",
      "estimatedDays": 5,
      "requiredCertifications": ["ia"],
      "requiredBayTypes": ["wide_body"],
      "hardDeadlineMs": 1701000000000,
      "canSplit": false
    }
  ],
  "bays": [
    {
      "id": "bay_1",
      "name": "Bay 1",
      "type": "narrow_body",
      "unavailablePeriods": [
        { "startMs": 1700500000000, "endMs": 1700600000000 }
      ]
    }
  ],
  "technicians": [
    {
      "id": "tech_1",
      "certifications": ["amt", "ia"],
      "shiftDaysOfWeek": [1, 2, 3, 4, 5],
      "shiftStartHour": 7,
      "shiftEndHour": 17,
      "efficiencyMultiplier": 1.0
    }
  ],
  "objectiveWeights": {
    "weightedTardiness": 1.0,
    "overtime": 0.5,
    "utilization": 0.3
  },
  "timeLimitSeconds": 30,
  "solverHint": "minimize_lateness"
}
```

**Schedule Response:**
```json
{
  "requestId": "uuid-v4",
  "status": "optimal",
  "objectiveValue": 2.4,
  "solveTimeMs": 1840,
  "assignments": [
    {
      "workOrderId": "wo_abc",
      "bayId": "bay_1",
      "startMs": 1700100000000,
      "endMs": 1700532000000,
      "assignedTechnicianIds": ["tech_1"]
    }
  ],
  "metrics": {
    "totalLatenessDays": 0.5,
    "avgUtilizationPercent": 82.3,
    "overtimeHours": 4.0
  },
  "warnings": [
    {
      "code": "CERT_SHORTAGE",
      "message": "Only 1 IA-certified technician available for 3 IA-required WOs in week 2",
      "affectedWoIds": ["wo_def", "wo_ghi"]
    }
  ],
  "alternativeSolutions": [],
  "apiVersion": "1.0"
}
```

**Status values:** `optimal` (proven optimal), `feasible` (good solution, optimality not proven within time limit), `infeasible` (constraints cannot all be satisfied — see warnings), `timeout` (no feasible solution found within time limit), `error`.

**API versioning:** The `apiVersion` field enables the Convex actions to detect when the service has changed its schema. On mismatch, the action logs a warning and falls back to the cached solution rather than silently accepting a mismatched response.

### Deployment Options

| Platform | Cold Start | Cost (idle) | Cost (active) | Best For |
|---|---|---|---|---|
| Google Cloud Run | 2–8s (Python + OR-Tools) | $0 (scale to zero) | ~$0.000024/vCPU-second | Intermittent solves, cost-sensitive |
| Fly.io | 0.5–2s (keep 1 warm machine) | ~$7/month (shared-1x-nano) | ~$0.02/machine-hour | Low latency, simple ops |
| AWS Lambda + container | 3–10s cold | $0 | $0.0000133/GB-second | AWS ecosystem integration |
| Railway | 0.5–1s | ~$5/month (512MB) | $0.000463/vCPU/minute | Simplest DevEx, small teams |

**Recommendation for Phase 3:** Deploy on Fly.io with one always-warm machine (shared-cpu-1x, 512MB RAM, ~$7/month). This gives 500ms cold starts (because the machine never actually goes cold), handles OR-Tools + FastAPI comfortably, and has simple deployment via `fly deploy`. Upgrade to Cloud Run when usage exceeds 1,000 solve calls per month or when the payload size requires more RAM.

**OR-Tools + FastAPI container size:** Approximately 350MB. FastAPI cold start with OR-Tools: ~3 seconds. With one warm machine on Fly.io, typical latency: 200–800ms for small problems (30 WOs), 2–8s for large problems (100 WOs).

**Horizontal scaling:** The solver is stateless. At high load, Fly.io auto-scales to multiple machines. OR-Tools CP-SAT is single-threaded per solve; multiple concurrent requests run on separate instances.

### Convex Action Integration Pattern

```typescript
// convex/actions/runMonthlyOptimize.ts
"use node"; // Required for larger memory budget (512MB)

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const runMonthlyOptimize = action({
  args: {
    organizationId: v.id("organizations"),
    horizonWeeks: v.number(),
    timeLimitSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const optimizerUrl = process.env.OPTIMIZER_SERVICE_URL;
    const optimizerToken = process.env.OPTIMIZER_SERVICE_TOKEN;
    if (!optimizerUrl || !optimizerToken) {
      throw new Error("OPTIMIZER_SERVICE_URL and OPTIMIZER_SERVICE_TOKEN must be set");
    }

    // 1. Fetch current scheduling state from Convex
    const state = await ctx.runQuery(api.scheduling.getSchedulingSnapshot, {
      organizationId: args.organizationId,
      horizonWeeks: args.horizonWeeks,
    });

    // 2. Compute input hash for cache check
    const inputHash = computeInputHash(state);
    const existing = await ctx.runQuery(api.optimizationRuns.getLatestByHash, {
      organizationId: args.organizationId,
      inputHash,
    });
    if (existing?.status === "complete") {
      return { runId: existing._id, cached: true };
    }

    // 3. Write a pending run record so UI can show "optimizing..."
    const runId = await ctx.runMutation(api.optimizationRuns.create, {
      organizationId: args.organizationId,
      runType: "monthly_schedule",
      status: "pending",
      inputHash,
      triggeredBy: "user",
    });

    // 4. Serialize request
    const request = buildScheduleRequest(state, args.timeLimitSeconds ?? 30);

    // 5. Call optimizer service
    let response: Response;
    try {
      response = await fetch(`${optimizerUrl}/solve/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${optimizerToken}`,
          "X-Request-ID": runId,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(65_000), // 65s — slightly over the solver's 60s limit
      });
    } catch (err) {
      // Network error or timeout
      await ctx.runMutation(api.optimizationRuns.update, {
        id: runId,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Network error",
      });
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      await ctx.runMutation(api.optimizationRuns.update, {
        id: runId,
        status: "error",
        errorMessage: `HTTP ${response.status}: ${body.slice(0, 500)}`,
      });
      throw new Error(`Optimizer service returned ${response.status}`);
    }

    const result = await response.json() as ScheduleResponse;

    // 6. Handle infeasible case — do NOT crash, surface warnings to user
    if (result.status === "infeasible") {
      await ctx.runMutation(api.optimizationRuns.update, {
        id: runId,
        status: "infeasible",
        warnings: result.warnings,
        solutionJson: null,
      });
      return { runId, status: "infeasible", warnings: result.warnings };
    }

    // 7. Persist the solution
    await ctx.runMutation(api.optimizationRuns.update, {
      id: runId,
      status: "complete",
      objectiveValue: result.objectiveValue,
      solveTimeMs: result.solveTimeMs,
      warnings: result.warnings,
      solutionJson: JSON.stringify(result),
    });

    // 8. Optionally auto-apply if called from automated cron (not from user button)
    // For user-triggered solves, the UI shows a "Review and Apply" step before
    // writing to scheduleAssignments.

    return {
      runId,
      status: result.status,
      assignments: result.assignments,
      metrics: result.metrics,
      warnings: result.warnings,
    };
  },
});
```

**Streaming results for long-running solves:**

CP-SAT is an anytime algorithm — it improves its solution over time. For solves longer than 5 seconds, the service can stream intermediate solutions via Server-Sent Events or periodic webhooks. A simpler approach: the service writes progress updates to a Redis-backed progress key, and the Convex action polls it every 2 seconds via a second endpoint (`GET /jobs/{requestId}/status`). The UI shows "Found solution with lateness=3.2 days, still optimizing..." updating in real time.

---

## 4. Implementation Phases {#4-implementation-phases}

### Phase 1: Wire Existing Engines to Live Convex Data

**Duration estimate:** 3–5 weeks
**Infrastructure required:** None new — all TypeScript, runs in-browser or in Convex queries

**Work items:**

1. **Create scheduling data access hooks**
   - `useSchedulingItems()` — returns all WOs + taskCards as `CPMItem[]` from live Convex query
   - `useSchedulingDependencies()` — returns `MRODependency[]` from `taskAssignmentDependencies`
   - `useTechnicianResources()` — returns `TechnicianResource[]` from `technicians` + resolved shifts from `capacity.ts`

2. **Wire CPM to Gantt board**
   - Call `computeCriticalPath(items, deps)` whenever data changes
   - Pass `criticalItemIds` into Gantt bar renderer → red highlighting
   - Show total float as buffer visualization on each bar

3. **Wire resource leveling to planning board**
   - After any tech assignment change, run `levelResources()` client-side
   - Surface `overallocations` as inline warnings on the tech row
   - Surface `certificationViolations` as badge alerts on task cards

4. **Wire cascade scheduling to drag-and-drop**
   - On any task date drag-complete, call `computeCascade()` with changed item ID
   - Optimistically apply `DateChange[]` to UI state
   - Persist changes via Convex mutation (one mutation per changed item)

5. **Wire EVM to WO detail and command center**
   - Compute `calculateWorkOrderEVM()` from task cards as-of today
   - Display SPI/CPI trend sparkline on WO header
   - Add "S-Curve" tab to WO detail using `generateSCurveData()`

6. **Add bin packing to `magicSchedule.ts`**
   - Implement First Fit Decreasing mode with `binPackMode: "ffd"` option
   - Benchmark against current greedy for 50-WO scenarios
   - Use FFD by default when shop utilization > 60%

7. **Add PERT to `critical-path.ts`**
   - Extend `CPMItem` type with optional `durationOptimistic`, `durationMostLikely`, `durationPessimistic`
   - When present, use PERT expected duration in forward pass
   - Compute variance per task for Monte Carlo input

8. **Add Monte Carlo simulation as Web Worker**
   - Implement `monte-carlo.ts` engine
   - Integrate as background calculation on WO detail Gantt
   - Show P90 completion date badge: "90% likely to finish by [date]"

9. **Start collecting `woActuals`**
   - Write a Convex mutation `closeWOWithActuals` that auto-populates the `woActuals` table when a WO moves to `closed` status
   - Capture: estimatedHours vs actualHours, estimatedDays vs actualDays, techCount, aircraftType, workOrderType

**Dependencies:** All existing schema tables. No new tables except `woActuals`.

---

### Phase 2: Capacity Intelligence (TypeScript Only)

**Duration estimate:** 3–4 weeks
**Infrastructure required:** None new — TypeScript + Convex queries

**Work items:**

1. **Skill-level capacity gap analysis**
   - New Convex query `getCapacityGapBySkill()`: for each certification level (AMT/IA/A&P/NDT), compute available hours vs. active task card hours in a date range
   - UI: skill gap chart on capacity dashboard — stacked bars per week, red = gap, green = surplus
   - Pre-compute weekly gaps and write to `capacityGaps` table via scheduled function

2. **Exponential smoothing demand forecast**
   - Implement `exponentialSmoothing()` in `src/shared/lib/scheduling/demandForecast.ts`
   - Input: `woActuals` grouped by week (requires 8+ weeks of data from Phase 1)
   - Output: 12-week forecast with confidence bands
   - Write forecast results to `demandForecasts` table weekly

3. **Due-date feasibility checker**
   - Implement `checkFeasibility()` using CPM result + available capacity
   - Call on quote page when user enters a promised delivery date
   - Show inline: "Based on current workload, this WO would start in [X days] and finish in [Y days]"
   - If infeasible: "Earliest realistic delivery: [date]. To meet your requested date, add [N] technicians or deprioritize [top conflicting WO]."

4. **Rolling horizon planner**
   - Weekly Convex scheduled action that runs the full scheduling pipeline for the next 8 weeks:
     - Fetch all open WOs
     - Run `magicSchedule` with FFD bin packing
     - Run `levelResources`
     - Run CPM for each WO
     - Write summary to `scheduleSnapshots` + update `capacityGaps`

5. **Workforce planning dashboard**
   - New page: `app/(app)/scheduling/workforce-planner/`
   - Shows: current headcount by cert level, demand forecast, gap projection, simple "if you hire X more [role] today, you'll close the gap by [date]" calculation
   - All computed in TypeScript from `demandForecasts` + `capacityGaps` — no solver required at this phase

**Dependencies:** Phase 1 (woActuals data collection must have 8+ weeks of history for forecast to be meaningful).

---

### Phase 3: Optimization Microservice (Python, New Infrastructure)

**Duration estimate:** 4–6 weeks (including infrastructure setup and testing)
**Infrastructure required:** Fly.io deployment for `athelon-optimization-service`

**Work items:**

1. **Build `athelon-optimization-service` (Python)**
   - FastAPI application with CP-SAT (Google OR-Tools) and COIN-OR CBC (LP)
   - Endpoints: `/solve/schedule`, `/solve/roster`, `/solve/hiring`, `/health`
   - Authentication: Bearer token validation
   - Request validation: Pydantic models matching the JSON schema above
   - Logging: structured JSON logs for every solve with requestId, solveTimeMs, status, objectiveValue

2. **CP-SAT WO scheduling model**
   - Implement the RCPSP (Resource-Constrained Project Scheduling Problem) formulation
   - Variables: `x[wo, bay, day]` binary assignment, `start[wo]` integer start day
   - Constraints: no-overlap per bay (CP-SAT interval + no-overlap constraint), tech capacity, certification requirements, AOG priority
   - Objective: minimize weighted sum of lateness
   - Time limit: configurable per request

3. **CP-SAT shift rostering model**
   - Variables: `assigned[tech, shift_slot]` binary
   - Constraints: coverage (min techs per shift), individual limits (max consecutive days), cert-to-shift matching, rest periods
   - Objective: maximize satisfied tech preferences

4. **LP hiring optimization model**
   - Variables: `hire[role, month]` continuous (rounded to integers)
   - Constraints: capacity ≥ demand, hiring limits per month
   - Objective: minimize total compensation cost over planning horizon

5. **Convex actions for microservice integration**
   - Implement `runMonthlyOptimize`, `runAOGReschedule`, `runRosterOptimize`, `runHiringPlan` actions
   - All follow the pattern shown in Section 3
   - Store results in `optimizationRuns`, `optimizationScenarios`, `hiringRecommendations`

6. **What-if scenario engine**
   - UI: "Create Scenario" button on command center
   - User modifies: number of available technicians, WO priority overrides, bay availability
   - System calls `runMonthlyOptimize` with modified inputs → writes to `optimizationScenarios`
   - Side-by-side comparison: Scenario A vs Scenario B vs Current schedule

7. **Deploy and test**
   - Deploy to Fly.io
   - Set `OPTIMIZER_SERVICE_URL` and `OPTIMIZER_SERVICE_TOKEN` in Convex dashboard
   - Integration tests: feed 30 real WOs from dev data, verify assignments are valid, verify AOG is always first

**Dependencies:** Phase 1 (live Convex data wiring), Phase 2 (demand forecast for hiring optimization). The `athelon-optimization-service` can be developed in parallel with Phase 2.

---

### Phase 4: Predictive Intelligence (ML, New Infrastructure)

**Duration estimate:** 4–8 weeks (model quality depends heavily on data volume from Phases 1–2)
**Infrastructure required:** ML prediction endpoint added to `athelon-optimization-service`; requires 100+ closed WOs in `woActuals`

**Work items:**

1. **Duration prediction model**
   - Train LightGBM model on `woActuals` (requires 100+ records minimum, 500+ for high quality)
   - Features: aircraft make/model, work type, task count, tech count, historical_avg_hours_for_aircraft_worktype, time_since_last_visit
   - Target: actual_hours (regression) and scope_growth_factor (regression)
   - Evaluation: Mean Absolute Percentage Error (MAPE) < 20% is the deployment threshold
   - Retrain monthly as new woActuals accumulate

2. **Add `/predict/duration` to optimization service**
   - Load trained model at startup from a model registry (initially: a file bundled in the container)
   - Validate input features against Pydantic schema
   - Return: predicted_hours, p10, p50, p90, top 3 feature importances (for user trust / explainability)

3. **Demand forecasting model (replace exponential smoothing)**
   - Seasonal decomposition + LightGBM forecast using: week of year, historical WO count, aircraft fleet count, months since last major inspection cycle for fleet
   - Requires 12+ months of history
   - Replaces exponential smoothing in `demandForecasts` when MAPE < 15%

4. **AOG risk scoring**
   - Binary classification: "Will this WO have scope growth > 20%?"
   - Features: aircraft age, days since last inspection, work type, historical scope growth rate for this aircraft, open discrepancies count
   - Displayed as risk badge on WO card: "High scope growth risk (78%)"
   - Used by CP-SAT solver to add time buffer to high-risk WOs automatically

5. **Scope growth prediction**
   - Regression model: "How many additional hours will this WO grow beyond the initial estimate?"
   - Used to adjust EVM EAC and Gantt confidence intervals

6. **Convex action for duration prediction**
   - `runDurationPrediction` action called when WO is created or when task cards are added
   - Writes to `durationPredictions` table
   - UI shows: "Estimated 42 hours (AI predicted: 38–51 hours based on 23 similar jobs)"

**Dependencies:** Phase 1 (woActuals data collection), Phase 2 (8+ months of actuals for seasonal model). The ML code can be prototyped in Phase 3 but will not have meaningful quality until Phase 4.

---

### Phase 5: Advanced Optimization

**Duration estimate:** 8–12 weeks
**Infrastructure required:** More compute for larger CP-SAT models; potential Redis for result caching

**Work items:**

1. **Multi-objective optimization (Pareto fronts)**
   - Instead of a single weighted-sum objective, solve for multiple trade-off points: "Minimize lateness" vs. "Minimize cost" vs. "Maximize utilization"
   - Present 3–5 Pareto-efficient solutions to the shop manager for selection
   - Implementation: run CP-SAT with different objective weight vectors, store each in `optimizationScenarios`

2. **Stochastic / robust scheduling**
   - Use Monte Carlo results to build schedules that are robust to duration uncertainty
   - Instead of minimizing expected lateness, minimize P90 lateness (the worst-case 90th percentile scenario)
   - Implementation: feed Monte Carlo P90 durations into CP-SAT instead of point estimates

3. **Hiring and training co-optimization**
   - LP model that jointly optimizes: who to hire, who to send to training, and when — given a 12-month demand forecast
   - Objective: minimize total workforce cost while meeting projected demand at every week
   - Outputs: month-by-month hiring and training plan with total 12-month cost

4. **Multi-location optimization**
   - When an organization has 2+ shop locations, optimize WO assignment across locations
   - Variables: `x[wo, location, bay, day]`
   - Additional constraints: ferry time, customer preferences, location-specific certifications
   - Requires `shopLocations` table + inter-location transit time data

**Dependencies:** Phases 1–4 (requires stable data pipeline, proven solver, meaningful ML predictions).

---

## 5. Decision Flows {#5-decision-flows}

### "A New Work Order Arrives"

```
User creates WO (priority = routine)
  │
  ├─► Convex mutation creates workOrders row
  │
  ├─► Convex scheduled function triggers within 30s:
  │     runDurationPrediction action
  │       → POST /predict/duration with aircraft + work type features
  │       → Write durationPredictions row: predicted p50 = 38h (p10=31h, p90=49h)
  │       → Update WO.estimatedHours if user hasn't manually set it
  │
  ├─► Client-side (on scheduling board load):
  │     useQuery(api.scheduling.getOpenWOs) returns updated list
  │     magicSchedule() runs in-browser with all open WOs
  │     Gantt re-renders with new WO in proposed slot
  │
  └─► If shop is >60% utilized:
        Show "Optimize" nudge banner: "You have X WOs waiting — run optimizer?"
        User clicks → runMonthlyOptimize action (Phase 3+)
```

### "An AOG Is Declared"

```
User sets WO priority = AOG
  │
  ├─► Convex mutation updates workOrders.priority
  │
  ├─► Convex mutation triggers runAOGReschedule action immediately:
  │     1. Fetch current schedule (all open WOs, bays, techs)
  │     2. POST to CP-SAT service with:
  │          timeLimitSeconds: 3
  │          solverHint: "aog_first"
  │          hardConstraint: AOG WO must start within 24h
  │     3. Receive optimized assignments in < 3s
  │     4. Check: which existing WOs must be displaced?
  │     5. Write optimizationRuns row (status: complete)
  │
  ├─► Client receives optimizationRuns update via Convex reactive query
  │     Shows modal: "AOG RESCHEDULING COMPLETE"
  │     Displaced WOs list: "WO-1234 moved from Bay 2 / Mon to Bay 3 / Wed"
  │     Two buttons: [Apply Rescheduling] [Cancel]
  │
  └─► On Apply:
        Bulk-write new scheduleAssignments from optimizationRuns.solutionJson
        Notify displaced customers (future: Convex scheduled notification action)
```

### "User Clicks Optimize Month"

```
User opens Command Center → clicks "Optimize Next 30 Days"
  │
  ├─► UI shows: "Optimization in progress..." with animated spinner
  │     (optimizationRuns row with status: pending created immediately)
  │
  ├─► runMonthlyOptimize action:
  │     1. ctx.runQuery → fetch 30-day snapshot (WOs, bays, techs, shifts, holidays)
  │     2. Compute inputHash → check for cached result
  │     3. Serialize ScheduleRequest JSON
  │     4. POST /solve/schedule with timeLimitSeconds: 60
  │     5. Receive ScheduleResponse
  │     6. Write optimizationRuns (status: complete, solutionJson)
  │
  ├─► (If solve takes > 10s): CP-SAT streams intermediate solution updates
  │     UI updates: "Found solution — lateness: 2.1 days. Continuing to improve..."
  │
  ├─► Convex reactive query delivers result to client:
  │     Shows side-by-side: Current schedule vs. Optimized schedule
  │     Key metrics: Total lateness -40%, Utilization +8%, Overtime -3h
  │     Warning banners: "Cert shortage — 2 IA-required WOs may need outsourcing"
  │
  └─► User clicks [Apply Optimized Schedule]:
        runMutation: bulkUpdateScheduleAssignments(solutionJson.assignments)
        All affected WOs get new bay + date assignments
        Audit log entry written to auditLog table
        Gantt board refreshes with new assignments
```

### "Weekly Planning Cycle"

```
Every Sunday midnight (Convex scheduled function):
  │
  ├─► runCapacityForecast action
  │     Read woActuals last 12 weeks
  │     Run exponential smoothing → write demandForecasts (next 12 weeks)
  │     Compute capacityGaps by skill level → write capacityGaps rows
  │
  ├─► runRollingHorizonPlan (Convex scheduled function)
  │     Fetch all open WOs + current schedule
  │     Run magicSchedule (FFD mode) → level resources → run CPM per WO
  │     Write scheduleSnapshot (weekly baseline)
  │     Detect WOs that are now behind schedule → write alerts to actionRequired
  │
  └─► Morning of Monday, shop manager opens scheduling board:
        Sees "Weekly plan updated — 3 WOs flagged at risk" notification
        Capacity forecast shows week 6 has 40h gap in IA capacity
        Command center shows last optimization run: "Sunday 00:17"
```

### "Quarterly Workforce Review"

```
Quarterly trigger (manual or scheduled):
  │
  ├─► Data inputs:
  │     woActuals (12 months of history)
  │     demandForecasts (12-week lookahead, projected to 6 months)
  │     capacityGaps (rolling weekly gaps)
  │     Current headcount (from technicians table)
  │
  ├─► runHiringPlan action:
  │     POST to LP service with 6-month demand forecast + current headcount
  │     LP minimizes hiring cost subject to: capacity ≥ demand × 1.15 (15% buffer)
  │     Response: "Hire 1 IA-certified Lead Tech in month 2, 1 AMT in month 4"
  │     Write hiringRecommendations rows
  │
  ├─► runTrainingPlan action (Phase 4+):
  │     POST to LP service with: which techs could be trained, training costs,
  │     capacity value added per certification
  │     LP maximizes capacity value added per dollar of training spend
  │     Response: "Train Tech A in IA endorsement ($2,400 → +8h/week IA capacity)"
  │
  └─► Workforce planner dashboard:
        Shop manager sees hiring + training recommendations side-by-side
        Total projected cost for each option shown
        Manager approves recommendations → writes to staffingPlan table
        Approved hires exported to HR system (future integration)
```

---

## 6. Interaction Matrix {#6-interaction-matrix}

How each optimization tool interacts with every other tool in the stack. Cells describe the direction and nature of the interaction.

| | CP-SAT | LP/MIP | Bin Pack | Monte Carlo | ML Predict | CPM | Leveling | EVM | Cascade |
|---|---|---|---|---|---|---|---|---|---|
| **CP-SAT** | — | LP provides capacity bounds that CP-SAT respects as constraints | CP-SAT replaces bin packing for high-utilization scenarios; bin pack provides warm start hint | Monte Carlo P90 durations are fed as task durations to make schedule robust | ML duration predictions are the input task durations for CP-SAT | CPM identifies critical tasks; CP-SAT prioritizes zero-float tasks in assignment | CP-SAT output replaces leveling output for optimized scenarios; leveling is the fallback | CP-SAT EAC feeds updated BAC for EVM recalculation | CP-SAT assignments trigger cascade recalculation for task-level dependencies |
| **LP/MIP** | CP-SAT solution provides utilization data that LP uses as constraints (e.g., "available capacity in week 3") | — | No direct interaction | No direct interaction | ML demand forecast is the primary LP input for hiring models | No direct interaction | No direct interaction | LP cost optimization uses EVM actual cost data as basis | No direct interaction |
| **Bin Pack** | Provides a warm-start feasible solution as a hint to CP-SAT, reducing solve time | No direct interaction | — | No direct interaction | No direct interaction | CPM float data informs which WOs should be packed first | Bin pack output feeds into leveling as initial assignment; leveling adjusts for tech availability | No direct interaction | No direct interaction |
| **Monte Carlo** | Monte Carlo P90 durations → CP-SAT inputs for robust scheduling | No direct interaction | No direct interaction | — | ML duration predictions (p10/p50/p90) are the input distributions for Monte Carlo sampling | PERT-extended CPM provides variance per task as the Monte Carlo sampling distribution | Leveling output provides tech-adjusted durations for more realistic Monte Carlo | Monte Carlo P50 EAC vs P90 EAC shows uncertainty range on EVM dashboard | No direct interaction |
| **ML Predict** | Predicted durations are the primary task duration input for CP-SAT | Demand forecast is the primary LP input for hiring/capacity models | No direct interaction | Duration distributions (p10/p50/p90) are the Monte Carlo input | — | Predicted durations replace or adjust CPM item durations | Predicted durations improve resource leveling accuracy by replacing rough estimates | ML scope growth prediction adjusts EVM EAC in real time | No direct interaction |
| **CPM** | Critical path identifies zero-float tasks; CP-SAT assigns these first | No direct interaction | CPM float data informs bin packing order (zero-float bins pack first) | CPM with PERT provides variance per task as Monte Carlo input | ML duration predictions feed CPM as more accurate durations | — | CPM output (ES/EF/LS/LF) sets the scheduling window for leveling; leveling cannot push tasks outside their float | CPM critical path tasks drive EVM PV weighting | CPM identifies which task changes trigger the largest cascades |
| **Leveling** | Leveling detects overallocation that CP-SAT must resolve | LP capacity model uses leveling utilization output as available-hours input | Leveling post-processes bin pack assignments to resolve tech conflicts | No direct interaction | ML duration predictions are inputs to leveling | Leveling uses CPM ES/EF as scheduling window boundaries | — | Leveling task dates update EVM PV recalculation | Leveling date changes trigger cascade for dependent items |
| **EVM** | CP-SAT new schedule feeds updated PV forecast | LP cost optimization uses EVM AC as the actual cost baseline | No direct interaction | No direct interaction | ML scope growth prediction adjusts EVM EAC in real time | CPM drives EVM's schedule performance (SPI); critical path delay = SV | Leveling delays increase PV but also may increase EAC estimate | — | No direct interaction |
| **Cascade** | CP-SAT assignments may trigger cascades for task-level dependencies after WO placement | No direct interaction | No direct interaction | No direct interaction | No direct interaction | CPM forward pass is essentially a cascade of ES forward through the network | Leveling resolves cascaded overallocations | Cascade date shifts update EVM by changing which tasks are in-progress vs. planned | — |

**Reading the matrix:** Each cell describes what the row tool provides to or receives from the column tool. The key chains are:

- `ML Predict → CPM → Cascade → EVM` — ML improves duration estimates, which flow through the schedule network via CPM, propagate via cascade, and surface as updated EVM metrics
- `Bin Pack → CP-SAT → Leveling` — Bin pack provides warm start, CP-SAT optimizes globally, leveling enforces tech-level constraints within the optimized assignment
- `Monte Carlo ← CPM (PERT) ← ML Predict` — Duration predictions feed PERT variances, PERT feeds Monte Carlo sampling, Monte Carlo outputs confidence intervals for the UI
- `LP/MIP ← ML Demand Forecast ← woActuals` — Historical actuals feed ML forecasting, forecast feeds LP hiring model, LP outputs hiring recommendations

---

## 7. Risk and Mitigation {#7-risk-and-mitigation}

### Risk: Optimization results are "black box" — users don't trust them

**Severity:** High. If shop managers cannot understand why the optimizer made a particular assignment, they will override it manually and stop using it within weeks. This is the most common failure mode in enterprise optimization deployments.

**Mitigation:**
1. **Explanation layer built into the response schema.** Every assignment includes a `reason` field: `"Assigned to Bay 2 because: (1) earliest available slot, (2) only bay with 90-day dock access for Challenger 601"`. The CP-SAT solver must record which binding constraint drove each decision.
2. **Show what changed vs. the previous schedule.** The "Review and Apply" screen always shows a diff: "3 WOs moved, 2 WOs delayed by 1 day, 0 WOs made worse." Users approve changes, not blind overwrites.
3. **Manual override is always available and never penalized.** After applying an optimized schedule, managers can drag any WO to a different slot. The system does not fight manual overrides or automatically undo them.
4. **Progressive trust building.** Start with "recommendations" (the optimizer suggests; the manager approves item by item) before enabling "apply all." Move to bulk-apply only after the team has verified 10+ cycles of recommendations manually.

### Risk: Solver takes too long for interactive use

**Severity:** Medium. If "Optimize Now" takes 45 seconds with a blank spinner, users will abandon it.

**Mitigation:**
1. **Show something immediately.** The `runGreedySchedule` TypeScript action runs in < 100ms and shows a result on the Gantt while the CP-SAT solve is in progress. Users see "Quick schedule applied — optimizing further..." rather than a blank screen.
2. **Anytime algorithm with streaming updates.** CP-SAT is an anytime solver. Set a 30-second time limit for interactive use, 60-second for batch runs. Stream intermediate solutions every 5 seconds so the UI shows improving quality in real time.
3. **Problem decomposition.** For shops with > 100 open WOs, split the problem by week: optimize week 1 first (fastest, most important), then weeks 2–4 in background. Return week 1 results immediately.
4. **Cached solutions for unchanged inputs.** The `inputHash` pattern means if nothing has changed since the last solve, the cached result is returned in milliseconds.

### Risk: Model doesn't capture real-world constraints

**Severity:** High. The constraint model will be incomplete on day one. Real MRO shops have constraints that are not in any database: "Bay 3 needs a 30-foot clearance and can't do rotor work," "Tech A and Tech B can't work on the same WO because of a conflict," "Customer X always calls to change scope mid-WO."

**Mitigation:**
1. **Constraint discovery sessions before Phase 3 deployment.** Run structured interviews with shop managers: "What are the top 5 reasons the scheduler would reject an assignment I made manually?" Encode these before the first production solve.
2. **Hard constraints are opt-in.** Only constraints that are formally entered in the system are enforced. The optimizer does not invent constraints. If a manager puts a WO somewhere the optimizer wouldn't, it records the override but does not block it.
3. **Iterative constraint model evolution.** Each override that contradicts the optimizer's recommendation is a potential missing constraint. After 30 days of usage, review overrides and add the patterns as new constraints.
4. **Start simple.** Phase 3 initial model: only bay capacity + tech certification + AOG priority. No skill preferences, no tech affinities, no customer rules. Add one constraint at a time based on override analysis.

### Risk: Historical data insufficient for ML

**Severity:** Medium. Phase 4 (ML duration prediction) requires 100+ closed WOs with accurate actuals. Many new Athelon customers migrating from paper/spreadsheet will have zero structured historical data at startup.

**Mitigation:**
1. **Start collecting structured data at onboarding.** The `woActuals` write hook in Phase 1 captures every WO closure from day one. In 6 months, a medium-sized shop (5 WOs/week) will have 130+ records — enough for a basic model.
2. **Rule-based fallback.** Until ML model quality reaches MAPE < 20%, the system uses rule-based estimates: "A-check on B737 averages 180 hours (from industry tables)." These rules are pre-populated from MRO industry benchmarks and serve as prior estimates.
3. **Transfer learning from industry benchmarks.** Pre-train a base model on published MRO industry duration data (IATA MRO benchmarks, FAA advisory circulars with time estimates). Fine-tune on customer-specific data as it accumulates. This reduces the cold-start data requirement to ~50 WOs.
4. **Data quality gates.** The ML training pipeline rejects records with `actualHours = 0` or records where the WO was closed within 1 hour of opening (data entry errors). Clean training data matters more than volume.

### Risk: Infrastructure complexity overwhelms a small team

**Severity:** Medium. Adding a Python microservice, model training pipeline, deployment scripts, and monitoring doubles the operational surface area.

**Mitigation:**
1. **Phases 1–2 are pure TypeScript.** No new infrastructure for the first 8–10 weeks. Build confidence in the data pipeline and engine wiring before introducing Python.
2. **Managed deployment from day one.** Deploy to Fly.io (not self-managed Kubernetes) with `fly deploy` as the entire deployment pipeline. One command, managed TLS, auto-scaling, built-in metrics. The threshold to add a second service is kept low.
3. **Single service to start.** One Python FastAPI service handles all optimization workloads (CP-SAT + LP + ML). Split only if the service becomes a bottleneck or the team grows.
4. **Feature flags.** Optimization features are gated behind Convex feature flags (`optimizationEnabled: boolean` in `schedulingSettings`). Features can be disabled per-org if issues arise without a code deployment.
5. **Chaos testing before production.** Before enabling for live customer data, run 100 synthetic solve requests against the service (AOG, infeasible, timeout scenarios) to verify the Convex action error handling paths work correctly.

### Risk: Convex action timeout for long solves

**Severity:** Low-Medium. Convex actions have a 10-minute maximum runtime. A CP-SAT solve for a complex problem could approach this limit.

**Mitigation:**
1. **Aggressive time limits.** All solve requests cap at 60 seconds for user-triggered, 120 seconds for automated. The optimizer returns the best solution found within the time limit, not optimal-or-nothing.
2. **Async webhook pattern for very long solves.** For Phase 5 multi-location optimization that might need 5+ minutes, use a webhook pattern: action submits job and returns jobId immediately; optimizer service calls back to a Convex HTTP endpoint when complete; Convex HTTP action writes the result. The client polls `optimizationRuns.status` via reactive query.
3. **Problem size limits with client-side warning.** If the serialized request exceeds a threshold (e.g., > 200 WOs), warn the user and offer to decompose the problem by week.

---

## 8. Success Metrics {#8-success-metrics}

### Primary Business Metrics

These are the outcomes the optimization investment is ultimately justified by. Measure monthly, compare 6-month pre/post periods after each phase deployment.

| Metric | Description | Measurement Method | Phase 1 Baseline | Phase 3 Target |
|---|---|---|---|---|
| **On-Time Delivery Rate** | % of WOs completed on or before promised delivery date | `(WOs with actualClose ≤ promisedDelivery) / totalWOs × 100` | Establish baseline | +15 percentage points |
| **Bay Utilization Rate** | % of available bay-hours productively used | `committedbayHours / totalAvailablebayHours × 100` | Establish baseline | +10 percentage points |
| **Tech Utilization Rate** | % of available tech hours on billable work | `billedLaborHours / availableHours × 100` | Establish baseline | +8 percentage points |
| **Overtime Hours / Month** | Total overtime hours across all technicians | Sum from payroll integration or manually logged | Establish baseline | -20% |
| **Schedule Adherence** | % of task cards completed on their scheduled date | `(onTimeTaskCards) / totalTaskCards × 100` | Establish baseline | +25 percentage points |
| **Customer Satisfaction (NPS)** | Net Promoter Score from post-delivery survey | Survey sent 3 days after WO closure | Establish baseline | +10 NPS points |

### Operational Efficiency Metrics

These are leading indicators — improvements here should precede business metric improvements.

| Metric | Description | Target |
|---|---|---|
| **Planning Time per Week** | Hours spent by shop manager on manual scheduling | Reduce from baseline by 50% (e.g., 10h/week → 5h/week) |
| **AOG Response Time** | Time from AOG declaration to optimized reschedule published | < 5 minutes (currently: manual, highly variable) |
| **Schedule Changes per Week** | Manual overrides and date changes made by managers | Reduce by 30% (fewer manual corrections = better initial schedule) |
| **Quote Accuracy** | Actual hours / Estimated hours for closed WOs | CPI trending from baseline toward 1.0 (currently likely 0.8–1.2) |
| **Conflict Rate** | % of schedule assignments that have a detected bay/tech conflict | Reduce to < 2% (currently: unmeasured) |

### Optimization Engine Quality Metrics

These measure whether the algorithms are actually working. Tracked internally, not customer-facing.

| Metric | Description | Threshold |
|---|---|---|
| **Duration Prediction MAPE** | Mean Absolute Percentage Error of ML duration estimates | < 20% before Phase 4 deployment |
| **CP-SAT Objective Improvement vs. Greedy** | % reduction in weighted lateness vs. greedy baseline | > 15% for high-utilization scenarios (> 70% capacity) |
| **Solve Time p95** | 95th percentile CP-SAT solve time for 30-WO problem | < 8 seconds |
| **Solver Success Rate** | % of solve requests returning status `optimal` or `feasible` | > 95% |
| **Cache Hit Rate** | % of optimization requests served from cache | > 40% (Monday mornings should pull Sunday's cached plan) |
| **Override Rate** | % of optimizer recommendations that managers reverse | Target < 30% at steady state (indicates sufficient trust) |
| **Monte Carlo Coverage Accuracy** | % of actual completions that fall within the P10–P90 confidence interval | 75–85% (by definition, should be ~80%) |

### Data Quality Metrics (Foundation for ML)

| Metric | Description | Target |
|---|---|---|
| **woActuals Capture Rate** | % of closed WOs with populated actualHours in woActuals | > 95% |
| **Duration Estimate Coverage** | % of task cards with an estimatedHours value | > 80% |
| **Certification Data Completeness** | % of active technicians with complete certification records | 100% (hard requirement for solver to work) |
| **Shift Coverage** | % of active technicians with an active shift assignment (own or team) | > 95% |

### Measurement Infrastructure

To track these metrics, the following data collection is required:

1. **Close-time actuals hook** (Phase 1): Auto-populate `woActuals` on WO closure — no manual entry.
2. **Planning time logging** (Phase 2): Simple "time in scheduling board" instrumentation via page visibility API and session tracking.
3. **Decision audit trail** (Phase 3): Every `scheduleAssignment` change writes an `auditLog` entry with `triggeredBy: "optimizer" | "user_drag" | "user_form"`. Override rate derived from `user_*` changes after optimizer runs.
4. **Solver quality log** (Phase 3): Every `optimizationRuns` row records `objectiveValue`, `solveTimeMs`, `inputWoCount`, `status`. Aggregated weekly for the metrics above.
5. **Prediction accuracy log** (Phase 4): When a WO closes, compare `durationPredictions.predictedHours` to `woActuals.actualHours` and write error to a `predictionAccuracyLog` table for MAPE calculation.

---

## Appendix A: Existing Engine Summary

| Engine | File Path | Lines | Status | Phase to Wire |
|---|---|---|---|---|
| Greedy scheduler | `src/shared/lib/scheduling/magicSchedule.ts` | 234 | Production-ready | Phase 1 |
| CPM | `src/shared/lib/scheduling-engine/critical-path.ts` | 332 | Production-ready | Phase 1 |
| Resource leveling | `src/shared/lib/scheduling-engine/resource-leveling.ts` | 419 | Production-ready | Phase 1 |
| Cascade scheduler | `src/shared/lib/scheduling-engine/cascade-scheduler.ts` | 305 | Production-ready | Phase 1 |
| EVM | `src/shared/lib/scheduling-engine/earned-value.ts` | 236 | Production-ready | Phase 1 |
| WBS | `src/shared/lib/scheduling-engine/wbs.ts` | 305 | Production-ready | Phase 1 |
| Conflict detection | `src/shared/lib/scheduling/conflicts.ts` | 133 | Production-ready | Phase 1 |
| Day model | `src/shared/lib/scheduling/dayModel.ts` | 223 | Production-ready | Phase 1 |
| Capacity calculation | `convex/capacity.ts` | 681 | Production-ready (DB-connected) | Phase 1 |
| Roster management | `convex/schedulerRoster.ts` | 1,387 | Production-ready (DB-connected) | Phase 1 |
| Auto-schedule | `src/shared/lib/scheduling/autoSchedule.ts` | — | Supplementary | Phase 1 |

All engines are pure functions (no side effects, no DB calls except `capacity.ts` and `schedulerRoster.ts`). All are TypeScript strict-mode compliant. All can be called client-side or in Convex queries/actions without modification.

---

## Appendix B: CP-SAT Quick Reference for MRO Scheduling

The OR-Tools CP-SAT Python API for the RCPSP (Resource-Constrained Project Scheduling Problem):

```python
from ortools.sat.python import cp_model

model = cp_model.CpModel()
horizon = 30  # days

# Create interval variables for each WO
intervals = {}
starts = {}
ends = {}
for wo in work_orders:
    start = model.new_int_var(0, horizon, f"start_{wo.id}")
    end = model.new_int_var(0, horizon, f"end_{wo.id}")
    interval = model.new_interval_var(start, wo.duration_days, end, f"interval_{wo.id}")
    starts[wo.id] = start
    ends[wo.id] = end
    intervals[wo.id] = interval

# No-overlap per bay (hard constraint)
for bay in bays:
    bay_intervals = [intervals[wo.id] for wo in work_orders if wo.bay_id == bay.id]
    model.add_no_overlap(bay_intervals)

# AOG must start within 1 day
for wo in work_orders:
    if wo.priority == "aog":
        model.add(starts[wo.id] <= 1)

# Objective: minimize weighted lateness
lateness_terms = []
for wo in work_orders:
    lateness = model.new_int_var(0, horizon, f"lateness_{wo.id}")
    model.add_max_equality(lateness, [0, ends[wo.id] - wo.deadline_day])
    weight = {"aog": 100, "urgent": 10, "routine": 1}[wo.priority]
    lateness_terms.append(weight * lateness)

model.minimize(sum(lateness_terms))

# Solve with time limit
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 30.0
status = solver.solve(model)
# status in: OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
```

The key insight: CP-SAT's `add_no_overlap` constraint is specifically designed for scheduling. It uses efficient filtering algorithms (edge-finding, not-first-not-last, energetic reasoning) that make bay no-overlap constraints fast even for large instances.

---

*Document version 1.0 — 2026-03-12*
*For questions about Phase 3+ infrastructure, see `optimization-toolbox-guide.md` in the same directory.*
