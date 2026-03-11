# Scheduling Engine Research Corpus — Round 1

## Purpose

First-pass research corpus for building a production scheduling engine into the heart of Athelon's scheduling module. Covers foundational theory, MRO-specific scheduling, cross-industry transferable concepts, implementation patterns, and tooling. Organized for review before a deeper Round 2 enrichment.

---

## Table of Contents

1. [Current State — What Exists in Athelon](#1-current-state)
2. [The Core Problem — What MRO Scheduling Actually Is](#2-the-core-problem)
3. [Foundational Scheduling Theory](#3-foundational-theory)
4. [MRO-Specific Scheduling Research](#4-mro-specific)
5. [Cross-Industry Transferable Concepts](#5-cross-industry)
6. [Solver Technology & Implementation Patterns](#6-solvers-and-implementation)
7. [Data Models & Architecture](#7-data-models)
8. [Gantt Visualization](#8-gantt-visualization)
9. [Seminal Works — The Reading List](#9-reading-list)
10. [Next Steps — Round 2 Research Directions](#10-next-steps)

---

## 1. Current State — What Exists in Athelon {#1-current-state}

### Scheduling Engine Library (`src/shared/lib/scheduling-engine/`)
A pure TypeScript, framework-agnostic algorithm library with 6 modules:
- **`critical-path.ts`** (331 lines) — CPM implementation (forward/backward pass, float calculation)
- **`cascade-scheduler.ts`** (304 lines) — Cascade scheduling with AOG priority override
- **`resource-leveling.ts`** (418 lines) — Resource leveling with certification and shift constraints
- **`earned-value.ts`** (235 lines) — EVM metrics with S-curve data
- **`wbs.ts`** (304 lines) — Work Breakdown Structure tree builder and rollup
- **`types.ts`** (216 lines) — Core types: `DependencyType` (FS/FF/SS/SF), `ScheduledWorkOrder`, `ScheduledTaskCard`, `MRODependency`, `HangarBay`, `TechnicianResource`, `ShiftDefinition`

### Supplementary Scheduling Lib (`src/shared/lib/scheduling/`)
- `autoSchedule.ts`, `magicSchedule.ts`, `conflicts.ts`, `dayModel.ts`

### Full Scheduling UI Module (`app/(app)/scheduling/`)
40+ files including: Gantt board, roster workspace, capacity forecaster, bay allocation grid, due list, financial planning, schedule snapshots, command center dialog. Hooks for drag-and-drop, undo, keyboard shortcuts.

### WO Execution Gantt (`app/(app)/work-orders/[id]/_components/WOExecutionGantt.tsx`)
Live Convex-wired drag-and-drop Gantt for single work order execution. Canvas-based, 24-hour timeline, per-technician lanes.

### Convex Backend
- `taskAssignments.ts` — Per-task technician assignments with start/end times
- `taskAssignmentDependencies.ts` — FS/SS/FF/SF dependency links
- `schedulerPlanning.ts` (1,085 lines) — Planning board CRUD
- `schedulerRoster.ts` (1,387 lines) — Roster/shifts/teams/holidays
- `scheduling.ts` — WO schedule dates and bay assignment
- Domain modules: `convex/domains/scheduling/` (capacity, hangar bays, shop locations, station config)
- Adjacent: `dueEngine.ts`, `tatEstimation.ts`, `fleetCalendar.ts`, `scheduleSnapshots.ts`

### Schema Tables
`technicianShifts`, `schedulingSettings`, `rosterShifts`, `rosterTeams`, `schedulingHolidays`, `scheduleAssignments`, `hangarBays`, `scheduleSnapshots`, `taskAssignments`, `taskAssignmentDependencies`

**Assessment:** Strong UI scaffolding and backend CRUD. The scheduling engine has CPM and resource leveling foundations. The gap is in constraint-based optimization, dynamic rescheduling, and the make-ready/conflict enforcement layer.

---

## 2. The Core Problem — What MRO Scheduling Actually Is {#2-the-core-problem}

### The Best-Fit Formal Model

**Multi-Skill Resource-Constrained Project Scheduling Problem (MS-RCPSP)** with elements of the **Flexible Job-Shop Scheduling Problem (FJSSP)**.

| MRO Reality | Scheduling Model Match |
|---|---|
| Task cards have precedence dependencies (remove cowling → inspect engine) | RCPSP precedence constraints |
| Technicians have specific FAA ratings (A&P, IA, avionics) | Multi-skill resources (MS-RCPSP) |
| Any qualified technician can perform an eligible task | Flexible job-shop (machine = technician) |
| Tasks have hard regulatory deadlines and AOG events | Due-date/tardiness objectives |
| Plans change constantly (parts delays, AOG, sick calls) | Dynamic/reactive rescheduling |
| Multiple aircraft compete for the same technician pool | Multi-project RCPSP |
| Heavy checks span weeks with thousands of sub-tasks | Project scheduling, not simple job-shop |
| Inspector sign-off required before return to service | Logical gate constraints |

### The 10 Constraint Classes (Simultaneously Active)

1. **Task precedence** — DAG of dependencies (FS/SS/FF/SF with lag)
2. **Skill/license constraints** — FAA certification match per task
3. **Inspector availability** — RII hold points requiring IA sign-off
4. **Tool/GSE availability** — Finite specialized tooling
5. **Physical zone capacity** — Concurrent crew limits per aircraft zone
6. **Parts availability** — Must arrive before task start
7. **Maintenance interval due dates** — Regulatory hard limits (ADs, intervals)
8. **Shift continuity** — In-progress tasks require coverage or preservation
9. **Fatigue/duty time rules** — Technician work hour limits
10. **Certification constraints** — Sign-off authority per task type

### What Makes MRO Scheduling Uniquely Hard

**Non-routine work discovery:** Scheduled inspections discover discrepancies (cracks, corrosion, wear) that spawn unplanned tasks with unpredictable scope. The FRAME framework (2019), studying 372 maintenance projects, found a significant fraction of total check man-hours are attributable to non-routine tasks — and this fraction is highly variable. A C-check planned for 4,000 man-hours may consume 7,000.

**Parts availability uncertainty:** Boeing estimates AOG costs at $10,000–$100,000/hour; industry-wide ~$50B/year. Repair-vs-replace decisions made mid-check create unpredictable parts demand.

**Inspector bottleneck:** Inspector pools are smaller than technician pools. RII tasks create mandatory serialization that cannot be parallelized. Inspector allocation is frequently the critical path constraint in heavy maintenance.

**Schedule volatility is the norm:** Internal disruptions (NRT scope growth, technician absences, rework) and external disruptions (aircraft arrives late, new AD issued mid-check) are constant. A scheduling engine that cannot handle disruptions in real time provides limited practical value.

---

## 3. Foundational Scheduling Theory {#3-foundational-theory}

### 3.1 Critical Path Method (CPM) — Already Implemented in Athelon

CPM (1957, Walker/Kelley at DuPont) computes earliest/latest start-finish times and float for each task in a DAG. Tasks with zero float form the **critical path** — any delay there delays the whole project.

**Key limitation for MRO:** CPM assumes unlimited resources. Adding resource constraints transforms CPM into the RCPSP — harder, more realistic.

**Where CPM remains useful:** As a preprocessing step before optimization. Identifies critical tasks, informs priority rules, and computes a lower bound on project duration. Athelon's existing `critical-path.ts` serves this role.

### 3.2 PERT — Stochastic Extension of CPM

Three-point estimates: Expected = (O + 4M + P) / 6, Variance = ((P - O) / 6)²

**MRO relevance:** Task card durations are uncertain. OR scheduling research establishes they follow a **log-normal distribution** (right-skewed — overruns are more frequent and severe than underruns). Use P80 (80th percentile) estimates for customer commitments, not the mean.

### 3.3 Resource-Constrained Project Scheduling Problem (RCPSP)

The canonical model: n activities with durations, precedence constraints, and K renewable resource types each with capacity Rk. Objective: minimize makespan. **Strongly NP-hard** even for 2 resource types.

**Critical extensions for MRO:**
- **MS-RCPSP** — Each resource has a skill set; activities require specific skills (FAA certifications)
- **Multi-mode RCPSP** — Each activity can use different resource combinations (in-house vs vendor)
- **Multi-project RCPSP** — Multiple work orders share the same technician pool
- **Generalized precedence** — Min/max time lags (cure times after sealant application)
- **Stochastic RCPSP** — Activity durations as random variables

**PSPLIB benchmark** (Kolisch & Sprecher, 1996): The standard dataset for evaluating RCPSP algorithms. J30 instances mostly solved optimally; J120 remain very difficult.

### 3.4 Flexible Job-Shop Scheduling Problem (FJSSP)

Extends JSSP by allowing each operation to be processed by any machine from a given subset. Creates two interleaved sub-problems: **routing** (which technician does the task) and **sequencing** (in what order per technician). NP-hard.

For MRO: each technician = one "machine"; each task = one operation; eligible machines = technicians certified for that task; processing time can vary by technician proficiency.

### 3.5 Priority Dispatching Rules

Simple O(n log n) rules that run in milliseconds. Essential for real-time decisions and warm-starts:

| Rule | Formula | Best Objective |
|---|---|---|
| SPT | Shortest Processing Time first | Minimize average completion time |
| EDD | Earliest Due Date first | Minimize maximum lateness |
| MWKR | Most Work Remaining (CPM-based) | Minimize makespan |
| LST | Latest Start Time (CPM float) | Minimize makespan |
| ATC | Apparent Tardiness Cost (composite) | Balance due dates + processing times |
| CR | Critical Ratio = Time_Remaining / Work_Remaining | CR < 1 = behind; prioritize lowest CR |

### 3.6 Optimization Approach Selection

| Scenario | Recommended Approach |
|---|---|
| ≤ 30 tasks, < 10 resources | CP-SAT (often optimal in seconds) |
| 30–100 tasks, < 20 resources | CP-SAT with time limit, or Tabu Search/SA |
| 100+ tasks, many resources | Metaheuristic (GA/SA/ACO), or DRL dispatch |
| Real-time rescheduling (< 1 sec) | Priority dispatch rules, local repair |
| Initial planning (30 sec available) | CP-SAT warm-started with priority rule |

**Practical note:** "Tabu search should be tried first as it yields good or better results and is easy to develop and implement" — yields better solutions with less computing time than GA on many scheduling problems.

---

## 4. MRO-Specific Scheduling Research {#4-mro-specific}

### 4.1 The Maintenance Program Hierarchy

MSG-3 analysis → MRBR (FAA-approved minimum requirements) → MPD (manufacturer-published) → AMP/CAMP (operator's approved program, the binding schedule). Intervals in the MPD are **regulatory minimums** — operators may not exceed without escalation approval.

### 4.2 Check Types and Scheduling Characteristics

| Check | Interval | Man-hours | Duration | Scheduling Character |
|---|---|---|---|---|
| Pre-flight/Transit | Every flight | 0.5–1 | 20–60 min | Pure dispatching (no optimization needed) |
| Overnight/Daily | Daily | 2–10 | Multi-hour | Line maintenance scheduling |
| A Check | 400–600 FH | 50–70 | Overnight | Fit into ground-time windows (bin-packing) |
| C Check | 18–24 months | Up to 6,000 | ~2 weeks | Full RCPSP with resource constraints |
| D Check / HMV | 6–10 years | 30,000–50,000 | 4–6 weeks | Multi-project RCPSP at scale |

### 4.3 Key MRO Scheduling Sub-Problems

**Aircraft Maintenance Routing Problem (AMRP):** Which aircraft flies which route sequence to reach a maintenance-capable station within regulatory intervals? Polynomial-time algorithms exist (Gopalan & Talluri, 1998).

**Heavy Maintenance Check Scheduling:** Over 3–5 years, allocate hangar slots for C/D checks across all fleet tails. Each tail has a due-date window. NP-hard; metaheuristics dominate.

**Line Maintenance Scheduling (LMSP):** Given fixed routes, assign pending jobs to ground-time windows at maintenance-capable airports. Mixed integer program; constraint programming achieves solutions in <10 minutes.

**Task Card Sequencing:** Within a check, sequence task cards respecting precedence, skills, zone capacity, tool availability, and hold points. This is where the scheduling engine lives.

**Task Packaging:** Grouping tasks with compatible intervals into work packages. Formulated as time-constrained variable-sized bin packing (TC-VS-BPP).

### 4.4 Frontlog Scheduling (Novel Concept)

Öhman et al. (2021, *Journal of Operations Management*) introduced **frontlog scheduling** — deliberately over-maintaining (scheduling tasks earlier than required) to create a buffer pool that can be deferred opportunistically when ground time is shorter than expected. Simulation demonstrates simultaneous improvement in departure reliability and cost reduction. Counterintuitive but empirically validated.

### 4.5 The Discovery-Disposition-Repair Cycle

Inspection → discrepancy found → engineering disposition required (hours to days) → NRT generated → parts kitted (may not be in stock) → repair executed. During this cycle, adjacent zone work may be suspended. Statistical NRT frequency models by aircraft age/type can inform buffer sizing.

### 4.6 FAA Part 145 Constraints as Scheduling Constraints

| FAA Requirement | Scheduling Constraint |
|---|---|
| §145.151: appropriate certificate required | Skill constraint: `taskCard.requiredCerts ⊆ tech.certs` |
| Required Inspection Items (RII) | Mandatory FS successor: inspection task assigned to IA inspector |
| AD compliance deadline | Hard deadline: tardiness = infinity |
| Multi-shift work | Shift boundary constraint: tasks must fit within shift or be explicitly authorized to span |
| WO sign-off | Dummy end-task with precedence from all task ends = aircraft release date |
| Vendor work | Fixed-duration task on "vendor" resource with lead time |

### 4.7 Commercial MRO Software Scheduling Approaches

**AMOS** (Swiss AviationSoftware): Gantt-based hangar planning, automated task packaging, labor demand forecasting by license category, digital task cards with hold point tracking.

**TRAX**: Electronic task cards with inspector routing and digital sign-off. AI/ML predictive analytics in development.

**Ramco Aviation Suite**: Cloud-native SaaS. Technician assignment optimization by skill/availability/workload.

**IFS (Maintenix)**: Engine MRO specialization, complex shop visit scheduling, LLP tracking.

**Veryon (Flightdocs)**: Strong in Part 135 and business aviation. Qualification-enforced digital sign-off.

**Emerging trend**: Closed-loop scheduling where sensor data → health assessment → maintenance trigger → schedule update forms a continuous feedback loop.

---

## 5. Cross-Industry Transferable Concepts {#5-cross-industry}

### Priority Tier 1 — High Impact, Implementable Now

#### Theory of Constraints / Drum-Buffer-Rope (Goldratt)
- **Drum:** The constraint resource (licensed inspector count, hangar bay capacity) sets the pace
- **Buffer:** WIP staged before the constraint to prevent starvation (15–25% of WO duration)
- **Rope:** Pull signal controlling new work entry — no new aircraft until capacity exists
- **MRO application:** If the IA inspector is the drum, their inspection schedule drives everything. Aircraft arrival rate is "roped" to the departure rate of the drum.

#### Make-Ready Gating (Last Planner System — Construction)
A task is **sound** (ready for committed schedule) only when ALL prerequisites are resolved:
- Labor: Right technicians available with right certifications?
- Materials: Required parts kitted and available at the aircraft?
- Equipment: Required test equipment, tooling, GSE available?
- Prerequisites: Predecessor tasks completed and signed off?
- External: Regulatory hold points released?

If ANY is unresolved, the task does NOT enter the committed schedule — it goes on the **make-ready list** with a named owner for each constraint.

**The single most transferable concept for Athelon:** A formal prerequisite gate before any task card enters "Assigned" status.

#### WIP Limits + Little's Law (Kanban)
`Cycle Time = Work In Progress / Throughput`

If throughput is fixed, the only way to reduce cycle time is to reduce WIP. Starting more work simultaneously *increases* average completion time.
- Cap aircraft-in-work to bay count
- Cap inspection queue depth by inspector capacity
- When any WIP limit is hit, the process *pulls* rather than *pushes*
- **Key insight:** Making the QC inspection queue depth *visible* as a metric transforms it from an invisible bottleneck into a managed constraint.

#### P80 Duration Estimates (Healthcare OR Scheduling)
Task durations follow a **log-normal distribution** (overruns more frequent/severe than underruns). The correct commitment duration is the **80th percentile**, not the mean. Buffers should be asymmetric.

*Source: Strum, May & Vargas (2000), "Modeling the Uncertainty of Surgical Procedure Times," Anesthesiology*

#### Skill-Indexed Eligibility (Field Service Management)
Technician certifications as **hard constraints** on task assignment, not advisory headcount. Assignment is only valid when `taskCard.requiredCerts ⊆ technician.certifications`.

*Source: Cordeau et al. (2010), "Scheduling Technicians and Tasks," Journal of Scheduling — defines the TTSP (Technician and Task Scheduling Problem)*

### Priority Tier 2 — Medium Impact, Requires Process Change

| Concept | Source | Application |
|---|---|---|
| **CCPM buffers** | Critical Chain PM (Goldratt) | Remove padding from individual tasks; aggregate into WO-level buffer. Track buffer consumption as leading health indicator. |
| **Heijunka fleet-type leveling** | Lean/TPS | Sequence aircraft types to level specialty skill demand across the week instead of batching by type |
| **Velocity calibration** | Agile/Scrum | Track actual vs estimated hours per task type × aircraft variant. Use rolling velocity for self-calibrating future estimates. |
| **Percent Plan Complete (PPC)** | Last Planner System | `PPC = tasks completed as planned / tasks committed × 100%`. World-class LPS achieves 85–90%. Root-cause analysis on misses drives improvement. |
| **Block + Flex scheduling** | Healthcare OR | Reserved hangar slots for contract customers + flex capacity (10–15%) for AOG/unscheduled. Release unused blocks at T-7. |

### Priority Tier 3 — Advanced, Long-Term

| Concept | Source | Application |
|---|---|---|
| **FJSP background optimizer** | Operations Research | Solver proposing optimal assignment across multi-WO base |
| **Two-stage stochastic programming** | Stochastic Scheduling | Optimize for expected case; hedge for high-variance scenarios |
| **Match-up rescheduling** | Dynamic Scheduling (Cowling & Johansson) | Find future point where new schedule rejoins original after disruption |
| **Zone-based LOB visualization** | Construction (Line of Balance) | Location-based Gantt showing zone conflicts in heavy check planning |
| **Log-normal duration fitting** | OR Scheduling | Fit historical task durations; auto-set P80 estimates |
| **Scope multiplier factors** | Shipyard maintenance | Historical "average overhaul runs 1.3× initial estimate" — build explicit contingency |

---

## 6. Solver Technology & Implementation Patterns {#6-solvers-and-implementation}

### 6.1 The JavaScript/TypeScript Gap

**No production-grade constraint-based scheduling solver exists in JavaScript/TypeScript.** This is the critical technical decision point.

| Option | Approach | Tradeoff |
|---|---|---|
| **Custom greedy heuristic in TS** | EDD + topological sort + earliest-available-slot | Fast to build (~2 weeks), runs in Convex actions, handles 80% of cases |
| **OR-Tools Python microservice** | CP-SAT solver via REST API | Best solver quality, requires separate service (Fly.io/Railway container) |
| **Timefold (Java)** | Constraint solver via REST | Good domain modeling, separate JVM service |
| **HiGHS (has JS bindings)** | MIP solver, MIT license | Good for resource allocation; weaker for temporal sequencing than CP |

### 6.2 Google OR-Tools CP-SAT — The Primary Solver Choice

Apache 2.0 license, free for commercial use. Combines constraint programming + SAT solving + LP relaxations + Large Neighborhood Search. Multi-threaded.

**Key features for MRO:**
- Native interval variables (start, duration, end)
- `AddNoOverlap` — one technician per task at a time
- `AddCumulative` — resource capacity ceilings
- Optional intervals — tasks that may be deferred
- Time-limited optimization with anytime guarantee (always returns best-found solution)
- Warm-start hints (feed greedy heuristic result as initial solution)

**Performance:** Solved a 100-item instance with 10^30 possible solutions in 0.01 seconds. Competitive with IBM CP Optimizer on industrial benchmarks.

### 6.3 Recommended Evolution Path

| Version | Approach | Solve Time | Scale |
|---|---|---|---|
| **V3 — Constraint Checker** | TS constraint validation after every assignment | <100ms | Any |
| **V4 — Greedy Optimizer** | TS heuristic in Convex action ("Auto-schedule" button) | <5 sec | 1–500 tasks |
| **V5 — External Solver** | OR-Tools CP-SAT Python microservice | 5–60 sec | 500–5,000 tasks |
| **V6 — Multi-objective** | CP-SAT with warm-start + metaheuristic fallback | Minutes | Fleet-wide |

**Most teams never reach V5. V3–V4 delivers 90% of the value.**

### 6.4 Athelon's Scale

20–100 technicians, hundreds of tasks/month. Squarely in the **TypeScript greedy heuristic range** (V4). CP-SAT becomes relevant for multi-WO cross-optimization or heavy checks with 2,000+ task cards.

### 6.5 Dynamic/Reactive Scheduling

MRO disruptions are the norm, not exceptions. Three-tier response:

1. **Right-shift repair** (< 100ms): Delay affected tasks by disruption amount. Fast, minimal plan nervousness.
2. **Match-up rescheduling** (< 2 sec): Find a future point where the new schedule rejoins the original. Minimizes disruption while accommodating the event.
3. **Full re-optimization** (< 30 sec): Compute new optimal schedule from scratch. Maximum solution quality, maximum plan disruption.

**Recommended hybrid:** Compute initial schedule with robustness buffers → execute → on disruption, apply fast repair → if repair insufficient, trigger full re-optimization.

**Rolling horizon:** Schedule only the next 1–2 shifts in detail. Beyond-horizon tasks are tentative. Re-solve at each shift boundary.

**Event-driven triggers:** Task completion, task blocked, new task added, resource freed, due date changed → evaluate whether rescheduling is needed → apply appropriate tier.

### 6.6 Architecture Pattern

```
React Frontend (Gantt UI)
    ↓ user triggers "Auto-schedule" or drag-drop
Convex Mutation → creates schedule request
    ↓ triggers Convex Action
Convex Action (TypeScript)
    → fetches WO, task cards, technician availability
    → runs greedy heuristic (V4) OR calls Python service (V5)
    → writes assignments as "proposed" status
React Frontend
    → useQuery on assignments → renders Gantt
    → dispatcher reviews → confirms/adjusts → commits
```

### 6.7 Event Sourcing for Audit Trail

Every scheduling change as an immutable event: `WorkOrderCreated`, `TechnicianAssigned`, `AssignmentRevoked`, `HoldPointReleased`, `AOGDeclared`, `ScheduleOptimized`. Benefits:
- FAA-required audit trail for Part 145
- Temporal queries ("what did the schedule look like yesterday at 08:00?")
- Undo/redo rescheduling decisions
- Event-driven notifications on hold point release

---

## 7. Data Models & Architecture {#7-data-models}

### 7.1 Core Entities (Extending Existing Schema)

The existing `taskAssignments` and `taskAssignmentDependencies` tables provide a foundation. Key additions needed:

**Schedule Events** (append-only audit log):
- type, payload, workOrderId, taskCardId, technicianId, timestamp, userId, source ('dispatcher' | 'optimizer' | 'system')

**Schedule Violations** (real-time conflict index):
- type, severity ('hard' | 'soft'), taskCardId, workOrderId, technicianId, description, detectedAt, resolvedAt

**Technician Availability** (shift windows):
- technicianId, startTime, endTime, type ('shift' | 'overtime' | 'on_call' | 'unavailable')

**Proposed vs Committed Assignments:**
- Add `status` field to `taskAssignments`: 'proposed' | 'committed' | 'in_progress' | 'complete'
- Add `source` field: 'manual' | 'optimizer'

### 7.2 Temporal Modeling

Four dependency types already supported in schema (`taskAssignmentDependencies`):
- **FS (Finish-to-Start):** Most common MRO dependency
- **SS (Start-to-Start):** Parallel work with shared setup
- **FF (Finish-to-Finish):** Supervised parallel work
- **SF (Start-to-Finish):** Rare; overnight soak tests

Each should support a **lag** value (minimum gap or overlap).

### 7.3 Make-Ready Checklist Model

Per task card, track 5 prerequisite categories:
- Labor readiness (certified tech available)
- Parts readiness (kitted and at aircraft)
- Equipment readiness (tooling/GSE available)
- Predecessor readiness (all predecessors signed off)
- Regulatory readiness (hold points released)

Task enters "schedulable" status only when all 5 are green.

### 7.4 Constraint Enforcement Functions

TypeScript pure functions (no Convex imports):
- `checkCertMatch(taskCard, technician)` → boolean
- `checkPredecessorCompletion(taskCard, allAssignments)` → boolean
- `checkBayCapacity(bay, timeWindow, existingAssignments)` → boolean
- `checkHoldPointOrdering(taskCard, inspectorAssignments)` → boolean
- `checkTechnicianAvailability(tech, timeWindow, shifts)` → boolean
- `checkZoneCapacity(zone, timeWindow, existingAssignments)` → boolean
- `detectAllViolations(schedule)` → Violation[]

---

## 8. Gantt Visualization {#8-gantt-visualization}

### Three Required View Types

1. **Task Gantt** (task-centric): Work Order → Task Cards timeline with dependency arrows. For project managers and critical path analysis. *Athelon has this in WOExecutionGantt.*
2. **Resource Timeline** (resource-centric): Technicians/bays on Y-axis, task bars per resource. For dispatchers assigning work. *Partially exists in scheduling module.*
3. **DAG Dependency Editor**: Visualize and edit predecessor relationships. *Could use react-flow.*

### Key Interactions

- Drag to reschedule (move bar left/right)
- Resize to re-estimate (drag right edge)
- Draw dependency arrows (connect task end to task start)
- Conflict highlighting (red overlay on same-resource overlap)
- Critical path highlight (golden path)
- Zoom: Hour → Day → Week → Month
- Load bar: green 0–80%, amber 80–100%, red >100% utilization

### Virtualization for Heavy Checks

C/D checks have 2,000–8,000 task cards. Requirements:
- Virtualize task list (only render rows in viewport)
- Canvas rendering for Gantt bars (not SVG/DOM per task)
- Date-range windowing (load visible window + buffer)

### Library Options (React 19 + TypeScript)

| Library | Type | License | Notes |
|---|---|---|---|
| `gantt-task-react` | Gantt | MIT | TS-native, dependencies, drag-drop |
| `react-timeline-gantt` | Resource timeline | MIT | 100k+ record virtualization |
| `react-flow` | DAG editor | MIT | 35.6k stars, undo/redo |
| Bryntum Gantt | All-in-one | Commercial | Best feature set; resource leveling, critical path, baselines |
| DHTMLX Gantt | Gantt | Commercial | Enterprise-grade |

---

## 9. Seminal Works — The Reading List {#9-reading-list}

### Tier 1 — Start Here (Directly Applicable)

1. **CP-SAT Primer** — Implementation guide for OR-Tools CP-SAT
   https://d-krupke.github.io/cpsat-primer/

2. **"Using constraint programming for aircraft line maintenance scheduling"** (2024), *Transportation Research Part E*
   First CP-based solution jointly integrating zone constraints, task precedence, technician-pool sharing, and multi-shift continuity for aircraft line maintenance.
   https://www.sciencedirect.com/science/article/abs/pii/S0969699724000024

3. **"Project Scheduling for MRO Work Orders"** (2018), ResearchGate
   Directly frames MRO work orders as RCPSP instances.
   https://www.researchgate.net/publication/326920421_Project_Scheduling_for_MRO_Work_Orders

4. **Goldratt, E.M. — *Critical Chain*** (1997), North River Press
   Extends TOC to multi-project environments. Project buffers, feeding buffers, resource buffers.

5. **Ballard, G. — "The Last Planner System of Production Control"** (2000), PhD Thesis, University of Birmingham
   Make-ready gating and Percent Plan Complete. The most directly implementable process concept.

### Tier 2 — Foundational Theory

6. **Pinedo, M.L. — *Scheduling: Theory, Algorithms, and Systems*** (6th ed., 2022), Springer
   The single most comprehensive graduate scheduling textbook. Chapters 1–4 for theory foundation.
   https://link.springer.com/book/10.1007/978-3-031-05921-6

7. **Blazewicz, Lenstra & Rinnooy Kan (1983)** — "Scheduling subject to resource constraints: Classification and complexity"
   The foundational RCPSP paper. Formal classification and complexity proofs.
   https://www.sciencedirect.com/science/article/pii/0166218X83900124

8. **Hartmann & Kolisch (2006)** — "Experimental evaluation of state-of-the-art heuristics for the RCPSP"
   Definitive survey of RCPSP heuristics. Essential before implementing any solver.
   https://www.sciencedirect.com/science/article/abs/pii/S0377221705002596

9. **Kolisch & Sprecher (1996)** — "PSPLIB — A project scheduling problem library"
   Standard benchmark dataset. Enables objective algorithm comparison.
   https://www.sciencedirect.com/science/article/abs/pii/S0377221796001701

10. **Graham, Lawler, Lenstra & Rinnooy Kan (1979)** — "Optimization and approximation in deterministic sequencing and scheduling: A survey"
    Established the universal (α|β|γ) three-field notation for all scheduling problems.

### Tier 3 — MRO-Specific

11. **Gopalan & Talluri (1998)** — "The Aircraft Maintenance Routing Problem," *Operations Research*
    Foundational AMRP formulation with polynomial-time algorithms.

12. **FRAME Framework (2019)** — "A Supporting Framework for Maintenance Capacity Planning," *IJPE*
    Based on 372 real maintenance projects. Quantifies non-routine task uncertainty.

13. **"A two-stage optimization for aircraft hangar maintenance planning"** (2020), *Computers & Industrial Engineering*
    Combined hangar space + multi-skill technician scheduling.
    https://www.sciencedirect.com/science/article/abs/pii/S0360835220303417

14. **"Robust Long-Term Aircraft Heavy Maintenance Scheduling"** (2022), *Computers & Operations Research*
    GA for 3–5 year C/D check schedules under uncertainty.

15. **Öhman et al. (2021)** — "Frontlog Scheduling in Aircraft Line Maintenance," *Journal of Operations Management*
    Introduced frontlog scheduling (deliberate over-maintenance as buffer strategy).

16. **De Bruecker et al. (2018)** — "Three-Stage MIP for Skill Mix and Training," *EJOR*
    Skill-mix optimization with training cost tradeoffs for aircraft maintenance.

### Tier 4 — Cross-Industry References

17. **Goldratt & Cox — *The Goal*** (1984) — Constraint-based thinking
18. **Womack & Jones — *Lean Thinking*** (1996) — Five lean principles, seven wastes
19. **Cardoen, Demeulemeester & Beliën (2010)** — "Operating room planning and scheduling: A literature review," *EJOR* — Closest academic analogue to MRO scheduling
20. **Cordeau et al. (2010)** — "Scheduling technicians and tasks," *Journal of Scheduling* — TTSP with skill constraints
21. **Strum, May & Vargas (2000)** — "Modeling the Uncertainty of Surgical Procedure Times," *Anesthesiology* — Log-normal distribution model
22. **Dorigo & Stützle — *Ant Colony Optimization*** (2004), MIT Press — ACO reference with scheduling applications

### Tier 5 — Emerging/Advanced

23. **Song et al. (2022)** — "Flexible Job-Shop Scheduling via GNN and Deep Reinforcement Learning," *IEEE TII*
24. **"Aircraft Maintenance Check Scheduling Using Reinforcement Learning"** (2021), *Aerospace* (MDPI)
25. **"Adaptive Reinforcement Learning for Task Scheduling in Aircraft Maintenance"** (2023), *Scientific Reports*

---

## 10. Next Steps — Round 2 Research Directions {#10-next-steps}

After reviewing this corpus, potential directions for deeper research:

### A. Deep-Dive Specific Algorithms
- Full implementation walkthrough of CP-SAT for MRO (with pseudocode → TypeScript translation)
- Greedy heuristic variants benchmarked against Athelon's actual task data
- Priority rule comparison (EDD vs MWKR vs ATC vs CR) on MRO-shaped instances

### B. Data Model Deep-Dive
- Detailed schema design for the constraint enforcement layer
- Event sourcing schema for scheduling audit trail
- Make-ready checklist data model with Convex implementation

### C. Industry Case Studies
- How specific MRO shops (AAR, ST Engineering, Lufthansa Technik, HAECO) structure their scheduling
- Part 135 vs Part 145 scheduling differences (Athelon's primary market)
- Business aviation vs airline MRO scheduling differences

### D. Visualization Patterns
- Benchmark review of Bryntum, DHTMLX, and gantt-task-react for MRO-specific views
- Conflict visualization UX patterns from commercial MRO software
- Mobile-first scheduling interfaces for shop floor technicians

### E. Integration Architecture
- OR-Tools Python microservice deployment patterns (Fly.io, Railway, Lambda)
- Convex action → external solver communication patterns
- Real-time schedule update propagation via Convex subscriptions

### F. Predictive/AI Layer
- Predictive task duration models from historical data
- NRT frequency prediction by aircraft age/type/check type
- Parts demand forecasting for pre-kitting optimization

---

## Execution Plan

### Step 1: Save Research Corpus Files
Save all 4 full agent reports to `apps/athelon-app/docs/ops/scheduling-research/round-1/`:
- `01-mro-maintenance-scheduling.md` — MRO-specific concepts, regulatory framework, commercial software
- `02-scheduling-theory.md` — CPM, RCPSP, FJSSP, optimization approaches, dynamic rescheduling
- `03-cross-industry-concepts.md` — TOC, Last Planner, Kanban, healthcare OR, field service, shipyard
- `04-implementation-patterns.md` — Solvers, data models, architecture, Gantt libraries, evolution path
- `00-synthesis.md` — This synthesized corpus (the plan file content above)

### Step 2: Round 2 — Algorithm Deep-Dive (Next Session)
- Full implementation walkthrough of CP-SAT for MRO (pseudocode → TypeScript translation)
- Greedy heuristic variants benchmarked against MRO-shaped instances
- Priority rule comparison (EDD vs MWKR vs ATC vs CR) on realistic task sets
- TypeScript constraint checker implementation patterns
- Topological sort + earliest-available-slot greedy algorithm design
