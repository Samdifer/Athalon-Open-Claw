# Scheduling Best Practices for Aviation MRO
## Exhaustive Analysis: PMBOK, Operations Research & Commercial Architectures

**Document Purpose:** Foundation reference for the Athelon MRO scheduling simulation engine.  
**Scope:** Aircraft maintenance scheduling theory, algorithms, and data model patterns.  
**Last Updated:** 2026-02-26

---

## Table of Contents

1. [PMBOK Scheduling Concepts](#1-pmbok-scheduling-concepts)
2. [Operations Research / Industrial Scheduling Theory](#2-operations-research--industrial-scheduling-theory)
3. [Commercial Scheduling Software Architectures](#3-commercial-scheduling-software-architectures)
4. [General Scheduling Data Model Patterns](#4-general-scheduling-data-model-patterns)
5. [MRO-Specific Synthesis](#5-mro-specific-synthesis)
6. [Key Metrics & KPIs](#6-key-metrics--kpis)
7. [References](#7-references)

---

## 1. PMBOK Scheduling Concepts

### 1.1 Overview: PMBOK 7th Edition Schedule Philosophy

The PMBOK 7th Edition (PMI, 2021) fundamentally reframed scheduling away from a prescriptive process list (6th Ed.) toward **performance domains** and **principles**. Schedule management is embedded across three domains:

- **Planning Performance Domain** — building the schedule framework
- **Delivery Performance Domain** — executing and adapting the schedule
- **Measurement Performance Domain** — monitoring performance against baseline

Key shift: emphasis on *tailoring* the scheduling approach to project context. An aircraft heavy maintenance check (D-check, ~30,000 hours) warrants predictive CPM scheduling; a line maintenance event warrants rolling-wave/adaptive planning.

**12 PMBOK 7 Principles relevant to MRO scheduling:**
- Principle 4: *Optimize the approach to achieve intended outcomes* — use the simplest adequate scheduling method
- Principle 7: *Demonstrate leadership behaviors* — schedulers must own the drum/constraint
- Principle 8: *Navigate complexity and uncertainty* — stochastic task durations, AOG events, hidden discrepancies
- Principle 11: *Tailor* — line maintenance vs. base maintenance require fundamentally different scheduling models
- Principle 12: *Embrace adaptability and resiliency* — real-time replanning when a finding opens new work

Source: [https://www.projectengineer.net/project-schedule-management-according-to-the-pmbok/](https://www.projectengineer.net/project-schedule-management-according-to-the-pmbok/)

---

### 1.2 Critical Path Method (CPM)

**Definition:** CPM identifies the longest sequence of dependent tasks that determines the minimum project duration. Any delay on the critical path directly delays project completion.

**Core Mechanics:**
- **Forward pass:** Calculate Early Start (ES) and Early Finish (EF) for each activity
  - `ES = max(EF of all predecessors)`
  - `EF = ES + Duration`
- **Backward pass:** Calculate Late Start (LS) and Late Finish (LF)
  - `LF = min(LS of all successors)`
  - `LS = LF - Duration`
- **Float/Slack:** `Float = LS - ES = LF - EF`
  - Activities with Float = 0 are on the **critical path**

**MRO Application:**
- An aircraft heavy maintenance check is a classic CPM scenario: structured task sequences (disassembly → inspection → repair → reassembly → testing → redelivery)
- The critical path typically runs through: airframe access panels removal → structural inspection → corrosion treatment → structural repair → panel reinstallation → functional test
- **Non-critical tasks** (avionics updates, cabin refurbishment) can be scheduled in parallel with float, absorbing technician idle time
- CPM tells you exactly which tasks require overtime authorization to recover schedule vs. which can slip without consequence

**CPM Limitations in MRO:**
- CPM assumes deterministic durations — MRO has high variance (hidden discrepancies, parts delays)
- CPM does not inherently account for resource constraints (technician availability)
- The critical path can shift dynamically as findings emerge

**Resource-Constrained Critical Path (RCCP):**
When resources are limited, the critical path must be recalculated after resource leveling. The resulting longest path may differ from the unconstrained CPM.

Source: Cornell Optimization Wiki — Job Shop Scheduling: [https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling](https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling)

---

### 1.3 Precedence Diagramming Method (PDM)

PDM (also called Activity-on-Node, AON) is the standard used in Primavera P6, MS Project, and most modern scheduling tools.

**Dependency Types:**
| Type | Code | Definition | MRO Example |
|------|------|------------|-------------|
| Finish-to-Start | FS | Successor cannot start until predecessor finishes | Cannot inspect frame until panels removed |
| Start-to-Start | SS | Successor cannot start until predecessor starts | Cabin painting can start when fuselage prep starts |
| Finish-to-Finish | FF | Successor cannot finish until predecessor finishes | NDT report must finish when repair finishes |
| Start-to-Finish | SF | Successor cannot finish until predecessor starts | Rare; approval must start before task can close |

**Lag and Lead:**
- **Lag:** Positive delay added to a dependency (e.g., paint curing time — 8-hour lag after primer application)
- **Lead:** Negative lag, allowing overlap (e.g., start inspection 2 hours before full disassembly completes)

**MRO-Specific PDM Patterns:**
- **Finding loops:** A new discrepancy found during inspection creates a branch in the network; the task graph must be mutable at runtime
- **Conditional dependencies:** Task B depends on Task A only if Task A reveals condition X
- **"Gate" tasks:** Sign-off, QA inspection, or RII (Required Inspection Item) — no downstream work until gate passes

---

### 1.4 Work Breakdown Structure (WBS) for MRO

The WBS decomposes the maintenance project into manageable work packages, providing the skeleton onto which schedule, cost, and resource data are attached.

**Standard MRO WBS Hierarchy (Base Maintenance):**
```
1.0 Aircraft Maintenance Check [Project]
  1.1 Pre-Input Preparation
    1.1.1 Work Package Review & Planning
    1.1.2 Materials & Tooling Procurement
    1.1.3 Slot Confirmation & Bay Preparation
  1.2 Input & Access
    1.2.1 Aircraft Defueling
    1.2.2 Panel & Access Door Removal
    1.2.3 Engine Run-Down & Cooling
  1.3 Inspection Phase
    1.3.1 Airframe Structural Inspection
      1.3.1.1 Fuselage Zones
      1.3.1.2 Wing Structures
      1.3.1.3 Empennage
    1.3.2 Systems Inspection
      1.3.2.1 Hydraulics
      1.3.2.2 Electrical
      1.3.2.3 Avionics
    1.3.3 Landing Gear Inspection
    1.3.4 Powerplant Inspection
  1.4 Repair & Modification Phase
    1.4.1 Routine Repairs (Pre-planned)
    1.4.2 Non-Routine Findings (Dynamic)
    1.4.3 Service Bulletins & Airworthiness Directives
    1.4.4 Customer-Requested Modifications
  1.5 Component Overhaul
    1.5.1 Removed Components (Shop Visits)
    1.5.2 Component Reinstallation
  1.6 Reassembly Phase
    1.6.1 Panel & Access Door Reinstallation
    1.6.2 System Reconnection
    1.6.3 Engine Reinstallation (if removed)
  1.7 Testing & Ground Runs
    1.7.1 Systems Functional Tests
    1.7.2 Engine Ground Run
    1.7.3 Leak Checks
    1.7.4 Avionics Functional Checks
  1.8 Closeout & Delivery
    1.8.1 Documentation Review
    1.8.2 Quality Sign-Off / Final RII
    1.8.3 Aircraft Redelivery
```

**WBS Best Practices for MRO:**
- Each WBS element maps to a Work Order (WO) or Work Card (WC)
- The WBS Dictionary defines: task description, responsible team, estimated labor hours, materials list, required certifications, reference documents (AMM chapter/section)
- Non-routine findings should be pre-allocated a WBS "bucket" (1.4.2 above) with contingency hours; actual finding tasks are created as sub-items dynamically

Source: ResearchGate — WBS for Aircraft Modification Projects: [https://www.researchgate.net/publication/220116793_A_Work_Breakdown_Structure_that_Integrates_Different_Views_in_Aircraft_Modification_Projects](https://www.researchgate.net/publication/220116793_A_Work_Breakdown_Structure_that_Integrates_Different_Views_in_Aircraft_Modification_Projects)

---

### 1.5 Resource Leveling and Resource Smoothing

**Resource Leveling:**
Delays tasks (extending project duration if needed) to resolve resource over-allocation. Used when resource constraints are hard limits.
- Result: Duration may increase; over-allocation eliminated
- Algorithm: Priority-based — higher priority tasks keep their dates; lower-priority tasks are pushed out

**Resource Smoothing:**
Adjusts task timing within float limits to reduce resource peaks without extending project duration.
- Result: Duration unchanged; peaks reduced but some over-allocation may remain
- Constraint: Cannot push tasks beyond their late start dates

**MRO Resource Leveling Considerations:**
- **Labor pools:** AMEs (Aircraft Maintenance Engineers) are typed by license (A&P, avionics, structures, powerplant) — each is a separate resource pool
- **Bay/dock resources:** A maintenance bay is a singular resource; only one aircraft can occupy it
- **Tooling:** Specialized tooling (engine hoists, dock structures, NDT equipment) creates resource contention
- **Shift patterns:** Resources have calendars — leveling must respect shift boundaries, overtime limits, fatigue rules
- **Peak demand:** Multiple aircraft in simultaneous checks compete for the same technician pools

**Leveling Heuristics:**
- Schedule by **Late Start** — postpone tasks as late as possible (ASAP scheduling)
- Schedule by **priority** — AOG aircraft, aircraft approaching hard regulatory deadlines, fleet-critical modifications
- Schedule by **resource utilization** — minimize idle technician time

Source: Primavera P6 Resource Leveling: [https://consultleopard.com/leveling-in-primavera-p6-scheduling-software/](https://consultleopard.com/leveling-in-primavera-p6-scheduling-software/)

---

### 1.6 Schedule Compression Techniques

When TAT (Turnaround Time) is threatened, two primary compression techniques apply:

**Crashing:**
- Add resources to critical path activities to shorten them
- Cost increases (overtime, additional technicians, expedited parts)
- Formula: Crash Cost per Day = (Crash Cost - Normal Cost) / (Normal Duration - Crash Duration)
- **MRO Crashing Examples:**
  - Add a night shift to a structural repair on the critical path
  - Bring in a specialized composites technician from another facility
  - Expedite parts shipping from standard freight to air freight
  - Run parallel inspection teams on different zones simultaneously

**Fast-Tracking:**
- Overlap activities that would normally be sequential
- Increases risk (rework if early task changes affect later task)
- **MRO Fast-Tracking Examples:**
  - Begin avionics test preparation while systems reconnection is still completing (overlap with lead time)
  - Begin cabin refurbishment while structural work continues in forward section
  - Start engine reinstallation procedure while aft section inspections are still underway
  - Ordering long-lead parts before discrepancy is fully scoped (risk: might not need them)

**Caution:** In aviation, safety-critical sequences cannot be fast-tracked. Regulatory requirements (e.g., RII items) enforce hard sequential gates.

Source: [https://asana.com/resources/fast-tracking-vs-crashing](https://asana.com/resources/fast-tracking-vs-crashing)

---

### 1.7 Earned Value Management (EVM) for MRO Progress Tracking

EVM integrates scope, schedule, and cost into a single performance measurement framework.

**Key Terms:**
| Term | Also Known As | Definition |
|------|--------------|------------|
| PV | BCWS (Budgeted Cost of Work Scheduled) | Authorized budget for work planned to date |
| EV | BCWP (Budgeted Cost of Work Performed) | Budget value of work actually completed |
| AC | ACWP (Actual Cost of Work Performed) | Actual cost incurred to date |
| BAC | Budget at Completion | Total planned budget |

**Core Metrics:**
- **Schedule Variance (SV):** `SV = EV - PV` (negative = behind schedule)
- **Cost Variance (CV):** `CV = EV - AC` (negative = over budget)
- **Schedule Performance Index (SPI):** `SPI = EV / PV` (<1 = behind schedule)
- **Cost Performance Index (CPI):** `CPI = EV / AC` (<1 = over budget)
- **Estimate at Completion (EAC):** `EAC = BAC / CPI` (projected final cost)
- **Estimate to Complete (ETC):** `ETC = EAC - AC`
- **To-Complete Performance Index (TCPI):** `TCPI = (BAC - EV) / (BAC - AC)`

**MRO EVM Application:**
- **Work packages** map to WBS elements with budgeted hours
- **% Complete** for a task card = hours earned / hours budgeted (or binary: 0% or 100%)
- **S-curve** (cumulative PV vs. EV vs. AC) shows check-level progress at a glance
- EVM enables early warning: SPI < 0.85 at the midpoint of a C-check predicts late delivery
- EVM is required in US government aircraft programs (DoD Instruction 5000.89)

**MRO-Specific EVM Adjustments:**
- Non-routine findings add scope mid-project; the BAC must be updated (re-baselined or as management reserve drawdown)
- Level of effort (LOE) tasks (supervision, QA oversight) should be separated from discrete work packages

---

### 1.8 Rolling Wave Planning for Progressive Inspections

Rolling wave planning is an iterative technique where near-term work is planned in detail while future work is planned at a high level, with details added as information becomes available.

**How It Applies to MRO:**

Aircraft inspections naturally produce rolling wave scenarios:
1. **Input Phase (T-0):** Scheduled task cards are known; non-routine finding scope is unknown
2. **Inspection Phase (T+2 to T+7 days):** Findings revealed one zone at a time; each finding becomes a new detailed task
3. **Repair Phase (T+7 to T+20 days):** Repair scope is now known for early findings; later finds still unscoped
4. **Closeout (T+20 to T+30):** All scope known; schedule is now fully defined

**Implementation Pattern:**
- Maintain a **planning horizon**: detailed schedule for next 72 hours, rough estimates for remainder
- Create **placeholder tasks** in the schedule for anticipated findings (statistically sized from historical data)
- Replace placeholders with real tasks as findings are raised as Non-Routine Work Orders (NRWOs)
- Schedule reviews (stand-up meetings) should occur at each **zone completion** or **shift change**

---

### 1.9 Critical Chain Project Management (CCPM) in MRO

CCPM (Goldratt, 1997) extends CPM by explicitly accounting for resource constraints and human behavior in estimating.

**Core CCPM Concepts:**

**The Student Syndrome Problem:**
- Technicians (like all humans) start tasks late if there is perceived float
- Traditional schedules embed safety time in each individual task, which gets consumed by procrastination
- CCPM strips individual task safety time out and pools it into explicit buffers

**Buffer Types:**
- **Project Buffer (PB):** Time buffer at the end of the critical chain protecting the delivery date
  - Sized as 50% of the safety time stripped from critical chain tasks (square root of sum of squares method is more sophisticated)
- **Feeding Buffer (FB):** Time buffer at merge points where non-critical chains feed into the critical chain
  - Prevents feeding chain delays from propagating to the critical chain
- **Resource Buffer (RB):** Not a time buffer — a warning flag/signal alerting a key resource that they will be needed soon
  - Critical in MRO where RII inspectors, engine test pilots, or NDT specialists are scarce

**CCPM MRO Case Studies:**
- **French Air Force (Transall C160):** CCPM implementation reduced aircraft maintenance time by 15%, reduced immobilization from 150 to <100 days, freed one maintenance dock, improved service rate by 87%
- **Lufthansa Technik Frankfurt:** CCPM described as "magic formula" for complex maintenance; 15-20% reduction in heavy maintenance intervention times
- **Embraer Executive Jets (Le Bourget):** TAT reduced by >50%, delivery delays nearly eliminated, productivity improved >13%
- **US Marine Corps Albany:** CCPM + Lean combination for specialist vehicle maintenance, multi-year program

**CCPM vs. CPM Tradeoffs for MRO:**
| Aspect | CPM | CCPM |
|--------|-----|------|
| Duration estimates | Padded per task | Aggressive (50% duration) |
| Safety time | Distributed in each task | Pooled in explicit buffers |
| Multitasking | Allowed | Discouraged |
| Progress measurement | % complete | Buffer penetration rate |
| Human behavior | Ignored | Explicitly modeled |
| Resource contention | External leveling step | Built into critical chain identification |

Source: [https://www.critical-chain-projects.com/to-go-further/publications/critical-chain-and-mro](https://www.critical-chain-projects.com/to-go-further/publications/critical-chain-and-mro)

---

## 2. Operations Research / Industrial Scheduling Theory

### 2.1 Problem Taxonomy: Where MRO Fits

Before diving into algorithms, it is essential to classify the MRO scheduling problem correctly within operations research taxonomy.

**Standard OR Scheduling Notation: α | β | γ**
- **α (machine environment):** What machines/resources
- **β (job characteristics):** Task constraints, preemption, etc.
- **γ (objective function):** What we minimize

**MRO fits as:**
- `Pm | r_j, prec, s_ijk | C_max + w_j T_j`
- `Pm` = parallel machines (bays / technicians as resource pools)
- `r_j` = release dates (task becomes available only after predecessor finishes)
- `prec` = precedence constraints (task card dependencies)
- `s_ijk` = sequence-dependent setup times (technician reorientation, tooling changes)
- `C_max` = minimize makespan (total check duration = TAT)
- `w_j T_j` = minimize weighted tardiness (penalty for late-completing high-priority tasks)

This is **NP-hard** in general. Exact solutions are feasible only for small instances; practical MRO scheduling requires heuristics and metaheuristics.

---

### 2.2 Job Shop Scheduling Model

The Job Shop Scheduling Problem (JSSP) is the foundational OR model for MRO.

**Classic JSSP Definition:**
- `n` jobs (aircraft / maintenance orders)
- `m` machines (bays, docks, workstations, technician pools)
- Each job has a sequence of operations, each requiring a specific machine for a specific duration
- Goal: minimize makespan (Cmax) or another objective

**JSSP Assumptions (classical):**
- Each machine processes one job at a time
- Jobs have fixed routing (operation sequence)
- No preemption (once started, cannot interrupt)
- No machine can handle >1 operation simultaneously

**MRO Deviations from Classic JSSP:**
- Operations can require **multiple simultaneous resources** (e.g., 2 technicians + 1 dock + 1 NDT kit)
- Routing is **partially unknown** at schedule inception (findings add new operations)
- Processing times are **stochastic** (hidden corrosion, parts availability)
- Some operations can be **preempted** (shift handover, AOG prioritization)
- **Setup times** exist between jobs on same resource (tool configuration, documentation)

**Flow Shop vs. Job Shop:**
| Aspect | Flow Shop | Job Shop | MRO Reality |
|--------|-----------|----------|-------------|
| Job routing | Fixed, same order for all jobs | Different order per job | Job-specific — each aircraft has unique work scope |
| Machine utilization | Easier to optimize | Harder | Job shop model dominates |
| Flexibility | Low | High | High — must handle dynamic findings |

Source: Cornell JSSP: [https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling](https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling)

---

### 2.3 Theory of Constraints (TOC) Applied to MRO

TOC (Goldratt, *The Goal*, 1984) focuses on identifying and exploiting the system's limiting constraint.

**The 5 Focusing Steps:**
1. **Identify** the constraint — what limits throughput? (e.g., NDT technicians, specific tool availability, paint booth capacity)
2. **Exploit** the constraint — maximize its output without spending money (no idle time at the bottleneck)
3. **Subordinate** everything else — all other processes serve the constraint's schedule
4. **Elevate** the constraint — invest to increase constraint capacity
5. **Repeat** — the constraint shifts; go back to step 1

**Drum-Buffer-Rope (DBR) in MRO:**
- **Drum:** The constraint (e.g., the structural NDT inspection team — 2 NDT techs for 40 aircraft)
  - The drum sets the pace for the entire shop
  - Its schedule is the master schedule
- **Buffer (Time Buffer):** Work placed ahead of the drum to ensure it never starves
  - If NDT takes 4 days, buffer 1 day of work ahead of NDT start
  - Buffer protects the constraint from upstream variability
- **Rope:** The work release mechanism — work is only released when the constraint can absorb it
  - Prevents WIP buildup (too many open task cards overwhelming technicians)

**Identifying MRO Constraints:**
Common MRO bottlenecks:
- **Specialized certifications:** RII (Required Inspection Item) inspectors — FAA/EASA requirement that only specific individuals can close out certain inspections
- **Scarce tooling:** Engine removal/installation rigs, dock structures, hydraulic test rigs
- **Long-lead parts:** Structural spares, proprietary avionics units — parts delay starves downstream tasks
- **Paint booth:** Single bay, temperature/humidity controlled, can be a major bottleneck
- **Ground run slot:** Engine ground runs require specific apron area, noise restrictions by time-of-day

**TOC vs. CPM Perspective:**
- CPM manages the *critical path*; TOC manages the *constraint resource*
- In resource-constrained MRO, the critical path is often determined by the constraint resource — they align
- TOC is more intuitive for production floor management; CPM is better for project-level reporting

---

### 2.4 Resource-Constrained Project Scheduling (RCPSP)

RCPSP is the formal OR model that combines CPM with explicit resource constraints.

**Formal Definition:**
- Activities `j = 1, ..., n` with durations `p_j`
- Precedence constraints: set of pairs `(i, j)` meaning activity `i` must finish before `j` starts
- Resources `k = 1, ..., K` with availability `R_k` per period
- Each activity requires `r_{jk}` units of resource `k`
- **Feasibility:** At any time `t`, total resource usage ≤ `R_k`
- **Objective:** Minimize makespan `C_max`

**RCPSP Variants:**
- **MRCPSP (Multi-mode):** Each task can be executed in multiple modes (more techs = faster, fewer techs = slower)
- **RCPSP with calendars:** Resources available only during working hours/shifts
- **RCPSP with skill constraints:** Resources are not interchangeable; each requires specific skill type
- **Preemptive RCPSP:** Tasks can be interrupted and resumed (relevant for shift handover)
- **Stochastic RCPSP:** Task durations are random variables

**Solution Approaches:**
- **Exact:** Branch-and-bound, ILP — feasible for <30 tasks; MRO has thousands
- **Heuristics:**
  - *Priority rule-based:* Schedule activities by priority (see §2.6) using a Serial or Parallel SGS (Schedule Generation Scheme)
  - *Genetic Algorithms (GA):* Encode schedule as chromosome (priority list); crossover + mutation; demonstrated on MRO makespan minimization
  - *Tabu Search:* Local search with memory to avoid revisiting; good for reoptimization
  - *Simulated Annealing:* Accept worse solutions probabilistically to escape local optima
  - *Ant Colony Optimization (ACO):* Tran et al. applied ACO to MRO scheduling, targeting minimal total processing time and tardiness while adapting dynamically to shop-floor changes
  - *Constraint Programming (CP):* OR-Tools CP-SAT, IBM CP Optimizer — demonstrated ~99.3% resource utilization on MRO engine inspections
  - *Reinforcement Learning:* Silva et al. (2023) framed maintenance scheduling as Markov Decision Process, trained policies via PPO to place routine tasks in calendar slots

Source: [https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling](https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling)  
Source: [https://www.mdpi.com/2227-7390/12/19/3129](https://www.mdpi.com/2227-7390/12/19/3129)

---

### 2.5 Stochastic Scheduling: Handling MRO Uncertainty

MRO is inherently stochastic. Key uncertainty sources:

**Sources of Uncertainty:**
1. **Task Duration Variance:** Inspection finds complex corrosion; planned 2-hour repair becomes 8-hour
2. **Finding Discovery:** Unknown until physical access — cannot be planned deterministically
3. **Parts Availability:** Lead times fluctuate; supplier stock-outs; customs delays
4. **Technician Availability:** Sick leave, training commitments, fatigue limits
5. **Tool Availability:** Shared tooling conflicts across concurrent checks
6. **Test Failures:** Systems fail functional tests, requiring re-repair and retest
7. **Weather/External:** Ground run wind limits, paint booth temperature constraints

**Stochastic Scheduling Approaches:**

**Two-Stage Stochastic Optimization:**
- Stage 1: Make planning decisions before uncertainty resolves (pre-maintenance schedule)
- Stage 2: Recourse decisions after uncertainty reveals itself (reactive rescheduling)
- Objective: Minimize expected cost over all scenarios
- Application: Aircraft line maintenance scheduling across multiple bases — optimize balance between task outsourcing costs and expected overtime/flight delay costs
- Source: ScienceDirect 2025 — "Aircraft maintenance scheduling under uncertain task processing time": [https://www.sciencedirect.com/science/article/abs/pii/S1366554525000535](https://www.sciencedirect.com/science/article/abs/pii/S1366554525000535)

**Robust Scheduling:**
- Find schedule that performs well across worst-case scenarios
- Min-max ILP: minimize the worst-case makespan across generated scenarios
- First research to formulate stochastic H-AMCS (Heavy Aircraft Maintenance Check Scheduling) as ILP
- Source: ScienceDirect 2022 — "Robust long-term aircraft heavy maintenance check scheduling optimization under uncertainty": [https://www.sciencedirect.com/science/article/pii/S0305054821003671](https://www.sciencedirect.com/science/article/pii/S0305054821003671)

**Monte Carlo Simulation:**
- Run thousands of schedule simulations with randomly sampled task durations
- Output: probability distribution of completion dates; P50 date, P80 date, P90 date
- Used to size CCPM project buffers statistically (sum-of-squares method)
- Embedded in Primavera Risk Analysis, @Risk add-in for MS Project

**Stochastic MILP with Deferral Planning:**
- SSRN 2025: Combined stochastic MILP for weekly maintenance task scheduling with embedded deferral planning
- Introduces probabilistic model for part failure probability, enabling preemptive maintenance scheduling
- Source: [https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5739198](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5739198)

**Schedule Robustness Strategies:**
- **Time buffers:** Insert slack between planned tasks to absorb variance (CCPM approach)
- **Resource buffers:** Maintain standby technician capacity for surge demand
- **Rolling rescheduling:** Re-optimize every N hours with fresh information
- **Predictive analytics:** Forecast task duration from historical data (XGBoost, LSTM models on past MRO records)

---

### 2.6 Priority Dispatching Rules

When multiple tasks compete for the same resource, a priority rule determines the sequence. These are simple heuristics — real scheduling systems combine them with RCPSP optimization.

**Standard Priority Rules:**

| Rule | Definition | Formula | Best For | Limitation |
|------|-----------|---------|---------|-----------|
| **FCFS/FIFO** | First Come First Served | Order of arrival | Fair, stable | Ignores urgency |
| **SPT** | Shortest Processing Time | Shortest task first | Min avg. flow time, WIP | Starves long tasks |
| **LPT** | Longest Processing Time | Longest task first | Machine utilization | High lateness |
| **EDD** | Earliest Due Date | Earliest deadline first | Minimize max lateness | Ignores task length |
| **CR** | Critical Ratio | `(Due Date - Now) / Remaining Work Time` | Dynamic, adapts to time | Requires real-time update |
| **WSPT** | Weighted Shortest Processing Time | `w_j / p_j` descending | Weighted throughput | Need accurate weights |
| **STR** | Slack Time Remaining | `Due Date - Now - Remaining Time` | Min number of late jobs | |
| **ODD** | Operation Due Date | Each operation has own due date | Work-in-process control | Complex to set |
| **MOD** | Modified Operation Due Date | ODD variant | Better than ODD on flow | |

**Critical Ratio (CR) — Most Useful for MRO:**
```
CR = (Time Until Due Date) / (Remaining Processing Time)
```
- CR < 1: Task is already late (or will be if not prioritized)
- CR = 1: Task is exactly on schedule
- CR > 1: Task has slack

CR is dynamic — it changes every hour. It naturally elevates tasks approaching their deadline without needing manual reprioritization. This makes it ideal for MRO shift handover briefings.

**MRO Priority Weight Factors:**
Beyond pure algorithmic rules, MRO prioritization incorporates:
- Aircraft AOG status (highest priority — aircraft on ground, revenue loss mounting)
- Regulatory hard deadlines (Airworthiness Directive compliance dates)
- Slot penalty clauses (contractual delivery penalties)
- Fleet criticality (single aircraft type in operator's fleet = higher priority)
- Parts criticality (task blocked by long-lead part = lower priority until part arrives)

Source: [https://www.uky.edu/~dsianita/300/schedule.html](https://www.uky.edu/~dsianita/300/schedule.html)  
Source: [https://link.springer.com/rwe/10.1007/1-4020-0612-8_708](https://link.springer.com/rwe/10.1007/1-4020-0612-8_708)

---

### 2.7 Capacity Planning: Infinite vs. Finite

**Infinite Capacity Planning (ICP):**
- Schedules work without regard to resource limits
- Used in initial planning / demand-side analysis
- Output: theoretical load profile — shows when demand exceeds available capacity
- First step before optimization

**Finite Capacity Planning (FCP):**
- Schedules work respecting hard resource limits
- Delays or splits tasks when resources would be exceeded
- Output: feasible schedule (no over-allocation)
- Required for actual shop floor execution

**MRO Capacity Planning Layers:**
```
Strategic (Months-Years):     Fleet maintenance plan, hangar slot allocation, workforce headcount planning
Tactical (Weeks-Months):      Check scheduling, shift staffing, major component pre-ordering
Operational (Days-Hours):     Daily task assignment, shift handover, reactive rescheduling
Real-Time (Minutes):          AOG response, technician reassignment, tool escalation
```

**Rough-Cut Capacity Planning (RCCP):**
- High-level check: does the master plan fit within aggregate capacity?
- Uses resource profiles per work center (labor hours, bay days, tooling requirements)
- Used in long-term hangar slot planning — "Can we absorb three simultaneous C-checks in Q3?"

**Capacity Requirements Planning (CRP):**
- Detailed check at work center level from released work orders
- Inputs: routing files, work center calendars, shop orders
- Output: capacity load profile per work center per period

---

### 2.8 Makespan Minimization and Objective Functions

**Primary MRO Objectives:**

1. **Minimize Makespan (Cmax):** Complete all tasks as quickly as possible → minimize TAT
   - Direct revenue impact: aircraft not in service = lost revenue for operator
   - Standard academic benchmark

2. **Minimize Total Weighted Tardiness (Σ w_j T_j):** Penalize late tasks weighted by importance
   - AOG aircraft: high weight
   - Non-critical cabin work: low weight

3. **Minimize Resource Idle Time:** Maximize technician utilization
   - Labor cost reduction
   - Floor management optics

4. **Minimize WIP (Work-in-Process):** TOC metric — fewer open task cards simultaneously
   - Reduces coordination complexity
   - Reduces risk of parallel interference

5. **Multi-Objective Tradeoffs:** Real MRO optimizes a blend — TAT + cost + regulatory compliance
   - Pareto front approaches: find the set of non-dominated solutions
   - Weighted sum method: `minimize α·Cmax + β·Σw_jT_j + γ·Cost`

**Research Results:**
- ScienceDirect 2025: Resource utilization and scheduling strategy for in-service aircraft maintenance shows **30.68% improvement in TAT** by incorporating optimization strategy
- Source: [https://www.sciencedirect.com/science/article/abs/pii/S0305054825002916](https://www.sciencedirect.com/science/article/abs/pii/S0305054825002916)

---

## 3. Commercial Scheduling Software Architectures

### 3.1 Microsoft Project / Primavera P6 Architecture

**MS Project Data Model Concepts:**
- **Project:** Container object with calendars, resources, and tasks
- **Task:** Activity node with: ID, Name, Duration, ConstraintType, ConstraintDate, %Complete, Predecessors, Successors, ResourceAssignments, BaselineStart/Finish
- **Resource:** Person or equipment with: Name, Type (Work/Material/Cost), MaxUnits, Calendar, CostRate
- **Assignment:** Junction between Task and Resource: Units, Work, ActualWork, RemainingWork
- **Baseline:** Snapshot of plan for comparison (up to 11 baselines in MSP)
- **Calendar:** Exception-based model — define working days/hours, then add exceptions (holidays, shutdown)

**Primavera P6 Architecture (Oracle):**
P6 is the enterprise standard for construction, engineering, and large-scale MRO projects.

Key P6 Concepts:
- **Enterprise Project Structure (EPS):** Hierarchical container tree for all projects
- **OBS (Organizational Breakdown Structure):** Who is responsible (maps to WBS for cost accounts)
- **Activity:** P6's term for task — has Activity ID, Activity Type, Duration Type, Calendar, WBS
- **Activity Types:**
  - *Task Dependent* — duration determined by assigned resources
  - *Resource Dependent* — tasks are driven by resource availability
  - *Level of Effort (LOE)* — spanning activities (supervision, QA)
  - *Start Milestone / Finish Milestone* — zero-duration gate events
- **Relationships:** Finish-to-Start (FS), SS, FF, SF with optional Lag
- **Constraints:** Must Start On, Start On or Before, Start On or After, Mandatory Start/Finish
- **Resource Dictionary:** Hierarchical — Resource Role → Specific Resource
  - Each resource has: Max Units/Time, Shift Calendar, Skills/Qualifications (extended via custom fields)
- **Resource Leveling Parameters:**
  - Level by: Project Priority, Activity Priority, Early Start, Late Start, Total Float, etc.
  - Preserve scheduled dates option
  - Level within float only (smoothing mode)

**P6 Scheduling Algorithm:**
1. Build precedence network
2. Forward pass → compute Early Dates
3. Backward pass → compute Late Dates
4. Calculate Total Float, Free Float, Project Float
5. Resource leveling (if requested) → shifts activities to resolve over-allocation
6. Update Critical Path

Source: Emerald Associates P6 Terms: [https://www.emerald-associates.com/primavera-p6-terms-and-definitions.html](https://www.emerald-associates.com/primavera-p6-terms-and-definitions.html)

---

### 3.2 ERP Scheduling Modules (SAP PM)

SAP Plant Maintenance (PM) is the dominant ERP module for industrial maintenance, widely adapted for MRO.

**SAP PM Object Hierarchy:**
```
Technical Objects:
  ├── Functional Locations (FL): Where maintenance occurs
  │     └── Hierarchical: Airport → Hangar → Bay → Zone → Component Position
  ├── Equipment: Trackable physical assets (aircraft, engines, APUs)
  │     └── Equipment Master: Serialized, warranty dates, manufacturer, install location
  └── Bills of Material (BOMs): Component lists for equipment

Planning Objects:
  ├── Maintenance Plans: Time-based or performance-based (flight hours, cycles)
  │     └── Generates: Maintenance Orders when trigger reached
  ├── Task Lists (General / Equipment / Functional Location):
  │     └── Reusable templates of maintenance operations with labor hours
  └── Work Centers: Resource pools with capacity profiles and scheduling formulas

Execution Objects:
  ├── Maintenance Notification: Fault report / request
  ├── Maintenance Order: Work authorization
  │     ├── Operations (activities with work center, planned hours)
  │     ├── Components (materials required)
  │     ├── PRTs (Production Resources/Tools)
  │     └── Costs (actual vs. planned)
  └── Confirmations: Actual time and material reported
```

**SAP PM Scheduling Logic:**
- Orders scheduled forward from Basic Start Date or backward from Required End Date
- Capacity requirements checked against work center capacity (Capacity Requirements Planning)
- Work center formula: `Machine Time = Base Quantity / (Activity / Base Quantity)`
- Dispatching: Graphical planning board (Gantt-like) in SAPGui or Fiori

**SAP PM Integration for MRO:**
- MM (Materials Management): Parts procurement triggered by order components
- PP (Production Planning): Coordinates maintenance downtime with production
- CO (Controlling): Cost center posting for maintenance labor and materials
- HR (Human Resources): Qualifications management, time recording

Source: [https://www.rfgen.com/products/sap-enterprise-mobility/sap-plant-maintenance-guide/](https://www.rfgen.com/products/sap-enterprise-mobility/sap-plant-maintenance-guide/)

---

### 3.3 Aviation-Specific MRO Software (AMOS, Quantum Control, RAMCO)

**AMOS (Swiss AviationSoftware / Lufthansa Technik subsidiary):**
- Used by 230+ airlines and MRO providers worldwide
- Core scheduling modules:
  - Line Maintenance Planning: Task cards by flight rotation, technician assignment by airport
  - Base Maintenance Planning: Work package planning, zone access, job card scheduling
  - Workshop Planning: Shop visit scheduling for components, engines
  - Resource Planning: Technician skills, licenses, recency, shift calendars
- Architecture: Integrated M&E (Maintenance & Engineering) system — task cards reference AMM
- Key concepts: Work Order, Job Card, Skill Code, License Type, Fleet Type Rating

**Quantum Control (Component Control):**
- Focused on component MRO shops (avionics repair stations, engine overhaul shops)
- Work order management with routing (operations through workstations)
- Traceable components: part number, serial number, life limits

**RAMCO Aviation:**
- Cloud-native MRO system
- Modules: Technical Records, Component Tracking, Hangar Planning, Line Maintenance, MRO Operations
- Scheduling: Finite scheduling with drag-and-drop Gantt, resource pool management

**Common Architecture Patterns Across Aviation MRO Software:**
- **Task Card as atomic unit:** Every schedulable item is a Task Card or Work Order with: aircraft, ATA chapter, description, planned duration, skill requirements, required tools, parts list, regulatory reference
- **Dual tracking:** Each task has planned (scheduled) dates AND actual (executed) dates
- **Status machine:** Task Card status = Open → Assigned → In Progress → Complete → Signed Off → QA Closed
- **Discrepancy linking:** Non-routine tasks linked to parent job card (finding creates child work order)
- **Compliance clock:** Tasks have triggering thresholds (FH, FC, calendar) that drive urgency; overdue = AOG risk

---

### 3.4 Manufacturing Execution Systems (MES) Parallels

MES systems bridge the gap between ERP planning and shop floor execution — a concept directly applicable to MRO.

**MES Core Functions (ISA-95 standard):**
- Resource management (labor, equipment, materials)
- Dispatching production units (work orders to work centers)
- Collection of data as work executes
- Quality management
- Performance tracking (OEE, throughput)

**Finite Capacity Scheduling in MES:**
- Infinite capacity: Plan ignoring constraints → generates the theoretical schedule
- Finite capacity: Layer resource constraints on top → generates feasible schedule
- MES finite scheduling: Sequencing, dispatching, splitting, overlapping operations

**MES Scheduling Architecture:**
```
ERP Layer:          Master Production Schedule (demand)
                    ↓ Work Orders released
APS/Scheduler:      Advanced Planning & Scheduling engine
                    - Finite capacity calculation
                    - Optimization (metaheuristic or CP solver)
                    - What-if simulation
                    ↓ Dispatched schedule
MES Layer:          Real-time execution tracking
                    - Work order status
                    - Actual time booking
                    - Exception reporting
                    ↓ Feedback
ERP Layer:          Actuals posted; production order confirmed
```

**MRO ↔ MES Mapping:**
| MES Concept | MRO Equivalent |
|------------|---------------|
| Production Order | Maintenance Work Order |
| Work Center | Maintenance Bay / Workshop |
| Operation | Task Card / Work Step |
| BOM | Parts List / Material Requirement |
| Routing | Work Package Sequence |
| Machine | Aircraft / Test Equipment |
| Operator | Aircraft Maintenance Engineer (AME) |
| Setup Time | Tool Configuration / Documentation Time |
| OEE | Bay Utilization / Technician Productivity |

---

### 3.5 Healthcare Operating Room (OR) Scheduling Parallels

Healthcare OR scheduling shares striking structural similarities with MRO:
- Multiple parallel "rooms" (bays/ORs)
- Multiple resource types required simultaneously (surgeon/technician, anesthesiologist/inspector, nursing staff/support crew, equipment/tooling)
- Uncertain procedure durations (complications/findings)
- Hard regulatory constraints (sterile field/safety procedures)
- Arrival uncertainty (emergency cases/AOG events)

**Key Parallels:**
| Healthcare OR | MRO |
|--------------|-----|
| Operating Room | Maintenance Bay |
| Surgical procedure | Maintenance check |
| Surgeon | Licensed AME (structural, avionics, etc.) |
| Anesthesiologist | RII Inspector |
| Recovery room | Post-maintenance functional test area |
| Emergency case | AOG aircraft |
| Elective surgery | Scheduled maintenance |
| Sterile field requirement | Confined space / safety isolation |
| Block scheduling | Hangar slot allocation |

**Healthcare Scheduling Research Applied to MRO:**
- **Block scheduling:** Assign blocks of OR time to specialties/surgeons = assign bay slots to aircraft types/customers
- **Case sequencing within a block:** Optimize order of procedures within a day = optimize task card sequence within a shift
- **Emergency overflow:** Accommodate urgent cases without disrupting elective schedule = AOG integration with planned checks
- **Downstream resource coordination:** Post-op beds must be available = test area / engine run slot must be available

Source: PMC Healthcare Scheduling Review: [https://pmc.ncbi.nlm.nih.gov/articles/PMC8035616/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8035616/)

---

### 3.6 Construction Scheduling Parallels

Construction scheduling (Primavera's original domain) offers mature practices directly applicable to heavy MRO:

**Parallel Patterns:**
- **Activity-on-Node networks** with complex dependencies — identical to MRO task networks
- **Subcontractor coordination** = engine shop visit coordination (off-site component overhaul)
- **Phased access** (can't do electrical while plumbing is in the walls) = zone access constraints in aircraft
- **Inspection hold points** = RII / QA gate approvals before proceeding
- **Weather delays** = ground run restrictions, paint booth temperature requirements
- **Repetitive construction** (floors in a high-rise) = repeat maintenance zones across multiple aircraft of same type

**Line of Balance (LoB):** Used in repetitive construction — tracks progress of repeating activities across units. Applicable in MRO when multiple identical aircraft are in simultaneous checks (fleet campaigns).

**Location-Based Scheduling (LBS):** Activities are located in space (floor/zone); resource crews move through location. Directly maps to MRO zone-based scheduling where teams move through fuselage zones.

---

### 3.7 Gantt Chart Data Models

The Gantt chart is the universal MRO schedule visualization. Understanding its data model is essential for implementation.

**Project Gantt Data Model:**
```
Project
  ├── id
  ├── name
  ├── start_date
  ├── end_date
  ├── baseline_snapshot_id (FK → ProjectSnapshot)
  └── calendars[]

Activity / Task
  ├── id
  ├── project_id (FK → Project)
  ├── wbs_code (e.g., "1.3.2.1")
  ├── name
  ├── activity_type (TASK | LOE | MILESTONE | SUMMARY)
  ├── status (NOT_STARTED | IN_PROGRESS | COMPLETE | ON_HOLD | CANCELLED)
  ├── planned_start
  ├── planned_finish
  ├── planned_duration (hours)
  ├── actual_start
  ├── actual_finish
  ├── actual_duration (hours)
  ├── remaining_duration (hours)
  ├── percent_complete (0-100)
  ├── early_start, early_finish  -- CPM forward pass
  ├── late_start, late_finish    -- CPM backward pass
  ├── total_float, free_float
  ├── is_critical (boolean)
  ├── constraint_type (ASAP | ALAP | MFO | MSO | SNLT | SNET)
  ├── constraint_date
  ├── calendar_id (FK → Calendar)
  └── parent_task_id (FK → Activity, for summary tasks)

Dependency / Relationship
  ├── id
  ├── predecessor_id (FK → Activity)
  ├── successor_id (FK → Activity)
  ├── type (FS | SS | FF | SF)
  └── lag (hours, can be negative = lead)

Resource
  ├── id
  ├── name
  ├── type (LABOR | MATERIAL | EQUIPMENT)
  ├── skill_codes[] (FK → SkillCode)
  ├── max_units_per_day
  ├── cost_rate
  ├── calendar_id (FK → Calendar)
  └── availability_overrides[]

Assignment
  ├── id
  ├── activity_id (FK → Activity)
  ├── resource_id (FK → Resource)
  ├── planned_units (hours or %)
  ├── actual_units
  ├── remaining_units
  └── override_rate

Calendar
  ├── id
  ├── name
  ├── base_work_hours_per_day
  ├── working_days[] (Mon-Sun flags)
  └── exceptions[]  -- holidays, shutdowns, overtime periods
         ├── date
         ├── type (NONWORK | EXTENDED | OVERTIME)
         └── hours
```

**Resource Gantt (Scheduling View):**
The resource Gantt plots resources on Y-axis, time on X-axis, with task bars showing assignments:
```
Resource Utilization Gantt:
  ├── Resource (Y-axis)
  │     ├── Available capacity line (red threshold)
  │     └── Assigned load bars (stacked per task)
  └── Time (X-axis)

Key Views:
  - Overallocation highlighted (load > capacity)
  - Idle time visible (gaps in load)
  - Drill-down from resource → assigned tasks
```

Source: AnyChart Gantt Data: [https://docs.anychart.com/Gantt_Chart/Data](https://docs.anychart.com/Gantt_Chart/Data)

---

## 4. General Scheduling Data Model Patterns

### 4.1 Task/Activity Entity Design

**Core Task Entity (Extended for MRO):**
```
MaintenanceTask
  ├── id (UUID)
  ├── work_order_id (FK → WorkOrder)
  ├── task_card_number (e.g., "AMM 05-21-11-200-801")
  ├── ata_chapter (e.g., "05-21" = Time Limits)
  ├── title
  ├── description
  ├── task_type (ROUTINE | NONROUTINE | AD | SB | MOD | CUSTOMER)
  ├── skill_required (FK → SkillCode)
  ├── certification_required (FK → CertType)  -- e.g., B1.1, B2, Cat C
  ├── estimated_duration_hours
  ├── zone (e.g., "100 - Forward Fuselage Upper")
  ├── access_requirements[] (FK → PanelAccess)
  ├── tools_required[] (FK → Tool)
  ├── parts_required[] (FK → PartRequirement)
  ├── reference_docs[] (AMM, IPC, SRM references)
  ├── is_raii_required (boolean)  -- Required Inspection Item
  ├── is_critical_path (boolean)
  ├── priority_weight (for WSPT)
  ├── triggering_threshold (FH | FC | CALENDAR | ON_CONDITION)
  ├── trigger_value
  ├── compliance_deadline (hard regulatory date)
  ├── parent_task_id (FK → MaintenanceTask)  -- for non-routine children
  └── finding_id (FK → Discrepancy, if non-routine)
```

### 4.2 Dependency Modeling

**Dependency Types in MRO Context:**

**Standard PDM dependencies (all four types):**
- FS: Remove panel before inspect structure
- SS: Start avionics test rig setup when avionics removal starts (preparation can overlap)
- FF: Ground run paperwork closes when ground run closes
- SF: Final QA sign-off cannot close until all task cards are signed

**MRO-Specific Extended Dependency Types:**
- **Access dependency:** Task B cannot start until access panel opened by Task A (not just finished, but physical state changed)
- **Conditional dependency:** Task B only becomes relevant IF Task A reveals condition X (finding-triggered)
- **Resource continuity dependency:** Task B must use the same technician as Task A (for task continuity, institutional knowledge)
- **Zone conflict:** Tasks B and C cannot run simultaneously because they're in the same physical zone (safety isolation)
- **Tool sharing dependency:** Tasks B and C cannot overlap because they share a unique tool

**Dependency Table:**
```
TaskDependency
  ├── id
  ├── predecessor_task_id (FK → MaintenanceTask)
  ├── successor_task_id (FK → MaintenanceTask)
  ├── dependency_type (FS | SS | FF | SF | ACCESS | CONDITIONAL | ZONE_CONFLICT)
  ├── lag_hours (positive or negative)
  ├── condition (nullable — for CONDITIONAL type)
  └── notes
```

### 4.3 Resource Pools and Skill Matrices

**Resource Pool Design:**
```
ResourcePool
  ├── id
  ├── name (e.g., "Airframe B1.1 Technicians - Line 2")
  ├── pool_type (LABOR | BAY | EQUIPMENT | TOOL)
  ├── capacity (count of available units)
  └── shift_calendar_id

Resource (individual)
  ├── id
  ├── pool_id (FK → ResourcePool)
  ├── name
  ├── employee_id
  ├── skills[] (FK → SkillCode, proficiency_level)
  ├── licenses[] (FK → License, expiry_date, aircraft_type_ratings[])
  ├── current_shift_id
  ├── is_available (boolean)
  ├── availability_start, availability_end
  └── fatigue_hours_used_this_week

SkillCode
  ├── id
  ├── code (e.g., "NDT-UT", "ENGINES-CFM56", "AVIONICS-FMS")
  ├── description
  ├── proficiency_levels (1=Aware, 2=Practitioner, 3=Expert)
  └── requires_currency (boolean — skill degrades without recency)

SkillMatrix
  ├── resource_id (FK → Resource)
  ├── skill_code_id (FK → SkillCode)
  ├── proficiency_level (1-3)
  ├── certified_date
  ├── expiry_date
  └── last_performed_date (for recency tracking)
```

**Skill Matching Algorithm (for task assignment):**
1. Filter resources with required skill code (hard constraint)
2. Filter by license/rating validity for aircraft type (hard constraint)
3. Filter by current availability (not assigned to conflicting task, on shift)
4. Rank remaining candidates:
   - Proficiency level (higher = better)
   - Recency (most recent task completion date = better currency)
   - Workload balance (lower current utilization = preferred)
5. Optionally: semantic embedding match (ML-based) for complex multi-skill requirements

Source: ePlane AI Schedule AI: [https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling](https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling)

---

### 4.4 Calendar and Shift Management

**Calendar Hierarchy:**
```
BaseCalendar (global defaults)
  └── ShopCalendar (facility-specific)
        └── TeamCalendar (shift-specific)
              └── ResourceCalendar (individual exceptions)

Calendar
  ├── id
  ├── name
  ├── timezone
  ├── standard_hours_per_day (e.g., 8.0)
  ├── working_days (bit flags: Mon=1, Tue=2, ...Sun=64)
  ├── exceptions[]
  │     ├── date
  │     ├── type (NON_WORKING | OVERTIME | REDUCED)
  │     ├── start_time
  │     └── end_time
  └── shifts[]
        ├── name (e.g., "Day", "Evening", "Night")
        ├── start_time
        ├── end_time
        └── days_of_week[]

ShiftPattern
  ├── pattern_type (FIXED | ROTATING | CONTINENTAL)
  ├── cycle_length_days
  ├── shift_rotation[] (schedule of which shift on which day in cycle)
  └── applicable_resource_pools[]
```

**Aviation-Specific Calendar Constraints:**
- **Fatigue rules:** CAR/FAR Part 117-equivalent limits on consecutive hours, duty periods, weekly limits
- **Currency requirements:** Some skills require periodic practice (e.g., engine run currency, NDT recency)
- **Restricted periods:** Noise-sensitive times for engine ground runs (typically 0600-2200 local)
- **Seasonal factors:** Paint booth requires temperature >15°C — winter scheduling constraint
- **Holiday/station-specific:** Different airports have different public holidays affecting technician availability

---

### 4.5 Milestone Tracking

**Milestone Design:**
```
Milestone
  ├── id
  ├── project_id (FK → WorkOrder)
  ├── name (e.g., "Aircraft Input Complete", "Structural Inspection Complete", "QA Final Sign-Off")
  ├── milestone_type (GATE | INFORMATIONAL | PAYMENT | REGULATORY)
  ├── planned_date
  ├── actual_date
  ├── is_achieved (boolean)
  ├── predecessor_tasks[] (FK → MaintenanceTask, ALL must complete before milestone)
  ├── owner_id (FK → Resource — who is responsible for achieving this)
  └── notes

GateMilestone (subtype)
  ├── gate_type (INPUT | INSPECTION_COMPLETE | REPAIR_COMPLETE | RETEST | QA | OUTPUT)
  ├── requires_sign_off_from (FK → Role — e.g., QA Manager, DER, Customer Rep)
  └── can_proceed_without_sign_off (boolean — for informational gates)
```

**Standard MRO Gate Milestones:**
1. **G0 — Pre-Input:** Work package approved, materials ordered, bay confirmed
2. **G1 — Aircraft Input:** Aircraft in dock, defueled, initial access achieved
3. **G2 — Inspection Complete:** All inspection task cards signed off; NR scope crystallized
4. **G3 — Repair Authorization:** All NR work scoped, parts on order, customer/operator approval (for cost-significant repairs)
5. **G4 — Repairs Complete:** All structural and systems repairs done; ready for reassembly
6. **G5 — Reassembly Complete:** All panels closed, systems connected, ready for functional test
7. **G6 — Test Complete:** All functional tests passed, ground run complete
8. **G7 — QA Final Sign-Off:** Technical records reviewed, CRS (Certificate of Release to Service) issued
9. **G8 — Aircraft Output:** Aircraft departed hangar

---

### 4.6 Buffer Management

**Buffer Types in MRO Scheduling:**

**1. Project Buffer (CCPM):**
- Placed at end of critical chain
- Sized at 50% of critical chain's stripped safety time (or by statistical root-sum-square method)
- Acts as the single point of schedule protection
- Buffer consumption tracked as % penetrated → traffic light alert system

**2. Feeding Buffers:**
- Placed where non-critical chains join the critical chain
- Prevents non-critical delays from cascading to critical path
- Sized proportional to feeding chain's variability

**3. Resource Buffers:**
- Early warnings to scarce resources that they will be needed
- Not time-based — scheduling/notification alerts
- Critical for: RII inspectors, NDT specialists, engine test pilots, specialized tooling

**4. Time Buffers (General):**
- Slack allocated to tasks without specific CCPM framework
- Contingency in work package estimates (traditional padding)
- Regulatory margin: performing an AD before the hard limit, not at the last possible moment

**5. Parts Buffer (Inventory):**
- Safety stock for high-demand consumables
- Strategic stock for long-lead critical items
- Buffer sizing uses statistical demand modeling (reorder point, safety stock = Z × σ_LT × √LT)

**Buffer Status Tracking:**
```
BufferStatus
  ├── buffer_id
  ├── buffer_type (PROJECT | FEEDING | RESOURCE | PARTS)
  ├── total_buffer_hours (or units)
  ├── consumed_hours (current penetration)
  ├── percent_consumed
  ├── status_color (GREEN | YELLOW | RED)
  │     -- GREEN: <33% consumed
  │     -- YELLOW: 33-67% consumed
  │     -- RED: >67% consumed → escalate
  └── trend (IMPROVING | STABLE | DETERIORATING)
```

---

### 4.7 What-If Scenario Planning

**Scenario Planning Architecture:**
```
Scenario
  ├── id
  ├── name (e.g., "Add Night Shift", "Expedite Landing Gear", "Defer SB-2024-03")
  ├── base_schedule_id (FK → Schedule — the "As Planned" baseline)
  ├── created_by
  ├── created_at
  ├── status (DRAFT | EVALUATED | APPROVED | REJECTED | ACTIVE)
  ├── modifications[]
  │     ├── modification_type (CHANGE_DURATION | ADD_RESOURCE | REMOVE_TASK | 
  │     │                      CHANGE_DEPENDENCY | ADD_TASK | CHANGE_DATE)
  │     ├── target_task_id
  │     └── parameters (JSON — modification-specific)
  └── results
        ├── projected_completion_date
        ├── projected_total_hours
        ├── projected_cost
        ├── delta_vs_baseline_days
        ├── delta_vs_baseline_cost
        └── risk_flags[]

ScenarioComparison
  ├── scenario_a_id
  ├── scenario_b_id
  └── comparison_matrix (side-by-side metrics)
```

**Common What-If Scenarios in MRO:**
- "What if we add a night shift for the next 5 days?" → recalculate CPM with extended resource availability
- "What if the landing gear overhaul shop returns the gear 3 days late?" → simulate delay propagation
- "What if we defer the cabin seat track inspection to the next check?" → identify regulatory impact
- "What if we borrow 2 structural techs from the neighboring check?" → resource reallocation analysis
- "What if we split the aircraft work between 2 bays?" → feasibility under zone access constraints
- "What if the parts for item NR-047 don't arrive until day 18?" → critical path shift analysis

**Simulation Approaches:**
- **Discrete Event Simulation (DES):** Model the maintenance shop as a queue system; simulate task execution events; powerful for statistical analysis
  - Source: ScienceDirect DES for MRO line maintenance checks: [https://www.sciencedirect.com/science/article/pii/S2351978921001608](https://www.sciencedirect.com/science/article/pii/S2351978921001608)
- **Monte Carlo Simulation:** Randomize task durations within distributions; run thousands of iterations; output completion date distribution
- **Deterministic What-If:** Simply override specific parameters and rerun the CPM/RCPSP solver

---

### 4.8 Real-Time Schedule Adjustments

**Real-Time Scheduling Requirements:**
MRO environments require continuous schedule adaptation. Key triggers:

| Trigger | Response Required | Time Horizon |
|---------|------------------|--------------|
| AOG aircraft arrival | Emergency slot insertion, resources reallocated | Minutes |
| New NR finding raised | New task created, dependencies set, schedule reoptimized | Hours |
| Parts delay notification | Task pushed out, downstream recalculated, escalation decision | Hours |
| Technician absence | Task reassigned to available qualified resource | Hours |
| Test failure | Repair task inserted, retest added, delivery date recalculated | Hours |
| Tool breakdown | Alternative tool found or task delayed | Hours |
| Shift handover | Remaining work redistributed to incoming shift | Minutes |

**Real-Time Schedule Architecture:**
```
Event Stream (Kafka/MQTT/WebSocket)
  → Schedule Event Processor
        ├── Event Type Classifier
        ├── Impact Analyzer (which tasks/resources affected?)
        ├── Rescheduling Trigger (does this require full re-optimization?)
        │     ├── Local Fix: Adjust only affected tasks (fast, <1 second)
        │     └── Global Reoptimize: Run RCPSP solver (slower, 1-30 seconds)
        └── Schedule Publisher
              → Dashboard Update
              → Technician Notification
              → Management Alert (if critical path affected)
```

**Online vs. Offline Scheduling:**
- **Offline (Predictive):** Full schedule computed in advance; executed as planned; replanning triggered by deviations
- **Online (Reactive):** Schedule built incrementally as information arrives; decisions made just-in-time
- **Hybrid (Rolling Horizon):** Optimize a detailed near-term window (72 hours) with lookahead; rerun periodically

---

## 5. MRO-Specific Synthesis

### 5.1 The MRO Scheduling Problem Statement

**Formal Definition for Simulation:**
```
Given:
  - Aircraft A = {a₁, ..., aₙ} — one or more aircraft in the hangar
  - Task Cards T = {t₁, ..., tₘ} per aircraft — some known upfront, others revealed progressively
  - Resources R = {r₁, ..., rₖ} — technicians by skill type, bays, tools
  - Calendars C — shift patterns, holidays, fatigue limits
  - Dependencies D ⊂ T × T — precedence constraints
  - Durations p: T → ℝ⁺ — stochastic (known distribution from history)
  - Skills S: T → 2^SkillCode — required capabilities per task
  - Deadlines d: A → ℝ⁺ — contractual delivery dates per aircraft

Find:
  - Start times τ: T → ℝ⁺
  - Assignments α: T → R (task to resource)
  Such that:
    - All precedence constraints are satisfied
    - No resource is double-booked
    - All skill requirements are met
    - All calendar constraints respected
    - All compliance deadlines met
    - Some objective function is minimized:
      min Σₐ w(a) · max(0, C(a) - d(a))  [weighted tardiness]
      + λ · (1 - Utilization(R))           [resource idle penalty]
```

### 5.2 Recommended Architecture for Athelon Simulator

Based on the research synthesis:

**Layer 1: Data Model (Entities)**
- Task / MaintenanceTask with full metadata
- Dependency with all types including MRO-specific
- Resource with Skill Matrix
- Calendar with aviation fatigue rules
- WorkOrder / MaintenanceCheck (project container)
- Milestone / Gate
- Buffer (Project, Feeding, Resource, Parts)
- Discrepancy / Finding (NR work order generator)

**Layer 2: Scheduling Engine**
- CPM Calculator (forward/backward pass)
- Resource Leveler (finite capacity, priority-based)
- RCPSP Solver (for optimization scenarios — use CP-SAT via OR-Tools or custom heuristic)
- CCPM Buffer Manager (buffer sizing and tracking)
- Priority Dispatcher (CR, WSPT, or configurable rule)
- Stochastic Simulator (Monte Carlo for P50/P80/P90 completion dates)

**Layer 3: Simulation Dynamics**
- Finding Generator (probabilistic NR discovery model from historical data)
- Parts Arrival Simulator (stochastic lead time model)
- Resource Availability Simulator (absence, fatigue, skill currency)
- AOG Insertion Engine (emergency event handler)

**Layer 4: Outputs / Views**
- Gantt Chart (task-level and resource-level views)
- Resource Histogram (utilization by day/shift)
- Buffer Status Dashboard (CCPM traffic lights)
- EVM Dashboard (SPI, CPI, S-curves)
- Critical Path Highlight
- What-If Scenario Comparison
- Completion Date Probability Distribution (from Monte Carlo)

---

### 5.3 Key Design Decisions for MRO Schedulers

**Decision 1: Activity Duration Type**
- Fixed Duration: Duration stays constant regardless of resources assigned (use for inspection holds, curing times)
- Fixed Work: Total work is fixed; add resources → shorter duration (use for labor-intensive tasks)
- Fixed Units: Resource effort percentage is fixed (use for LOE tasks)

**Decision 2: Constraint Hierarchy**
Recommended priority order (highest to lowest):
1. Regulatory hard deadlines (AD compliance dates, certificate expiry)
2. AOG aircraft (revenue loss per hour mounting)
3. Customer contract delivery penalties
4. Critical path activities
5. Activities with minimal float (<4 hours)
6. All other activities (optimize by utilization/WSPT)

**Decision 3: Replanning Frequency**
- Shift-start re-optimization: Full CPM recalculation + resource leveling
- Event-driven local repair: Immediate on finding raised / resource change
- Weekly strategic replan: Full RCPSP optimization for upcoming 2-week window

**Decision 4: Buffer Sizing Method**
- Simple: 25-30% of critical chain duration
- Statistical: √(Σσᵢ²) for critical chain tasks (root-sum-square)
- Historical: Calibrate buffer size from actual vs. planned variance in past checks

**Decision 5: Multi-Aircraft Scheduling**
- Independent per aircraft: Simpler, misses inter-aircraft resource contention
- Integrated multi-project: Harder, essential when multiple checks compete for same technicians/bays

---

## 6. Key Metrics & KPIs

### Scheduling Performance KPIs

| KPI | Definition | Target | Frequency |
|-----|-----------|--------|-----------|
| TAT (Turnaround Time) | Aircraft input to output (days) | Per contract | Per check |
| Schedule Performance Index (SPI) | EV / PV | ≥ 0.95 | Daily |
| Buffer Penetration Rate | % of project buffer consumed | < 67% at midpoint | Daily |
| On-Time Delivery Rate | % of aircraft delivered on/before contracted date | > 95% | Monthly |
| Resource Utilization | Productive hours / Available hours | 75-85% (not 100% — need flexibility) | Weekly |
| Non-Routine Task Rate | NR task cards / Total task cards | Historical benchmark | Per check |
| Parts-Caused Delay Days | Days lost waiting for parts | Trend toward 0 | Per check |
| Unplanned Overtime Rate | Overtime hours / Planned hours | < 15% | Weekly |
| Critical Path Change Frequency | How often critical path shifts | Trend indicator | Per check |
| Schedule Compression Events | Number of crashing/fast-tracking events required | Minimize | Per check |

---

## 7. References

### Academic Sources
- ScienceDirect (2025): "Aircraft maintenance scheduling under uncertain task processing time" — [https://www.sciencedirect.com/science/article/abs/pii/S1366554525000535](https://www.sciencedirect.com/science/article/abs/pii/S1366554525000535)
- ScienceDirect (2022): "Robust long-term aircraft heavy maintenance check scheduling optimization under uncertainty" — [https://www.sciencedirect.com/science/article/pii/S0305054821003671](https://www.sciencedirect.com/science/article/pii/S0305054821003671)
- ScienceDirect (2025): "An efficient resource utilization and scheduling strategy for in-service aircraft maintenance" — [https://www.sciencedirect.com/science/article/abs/pii/S0305054825002916](https://www.sciencedirect.com/science/article/abs/pii/S0305054825002916)
- ScienceDirect (2021): "An approach to airline MRO operators planning and scheduling during aircraft line maintenance checks using DES" — [https://www.sciencedirect.com/science/article/pii/S2351978921001608](https://www.sciencedirect.com/science/article/pii/S2351978921001608)
- SSRN (2025): "Integrated Optimization of Aircraft Line Maintenance: Scheduling under Uncertainty" — [https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5739198](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5739198)
- PMC (2021): "Healthcare scheduling in optimization context: a review" — [https://pmc.ncbi.nlm.nih.gov/articles/PMC8035616/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8035616/)
- Cornell Optimization Wiki: "Job shop scheduling" — [https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling](https://optimization.cbe.cornell.edu/index.php?title=Job_shop_scheduling)
- PMC Multi-skill RCPSP: [https://pmc.ncbi.nlm.nih.gov/articles/PMC10613272/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10613272/)
- MDPI Multi-objective RCPSP (2024): [https://www.mdpi.com/2227-7390/12/19/3129](https://www.mdpi.com/2227-7390/12/19/3129)

### Industry & Practitioner Sources
- ePlane AI — "Schedule AI: Real-Time Optimization of MRO Scheduling" — [https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling](https://www.eplaneai.com/blog/schedule-ai-real-time-optimization-of-mro-scheduling)
- WinAir — "Optimizing Job Scheduling in Aviation MRO" — [https://winair.ca/blog/optimizing-job-scheduling-in-aviation-mro-strategies-for-reducing-downtime/](https://winair.ca/blog/optimizing-job-scheduling-in-aviation-mro-strategies-for-reducing-downtime/)
- Critical-Chain-Projects.com — "Critical Chain & MRO" — [https://www.critical-chain-projects.com/to-go-further/publications/critical-chain-and-mro](https://www.critical-chain-projects.com/to-go-further/publications/critical-chain-and-mro)
- Project Engineer — "PMBOK Schedule Management" — [https://www.projectengineer.net/project-schedule-management-according-to-the-pmbok/](https://www.projectengineer.net/project-schedule-management-according-to-the-pmbok/)
- PMI — "Critical Chain Project Management" — [https://www.pmi.org/learning/library/critical-chain-project-management-investigation-6380](https://www.pmi.org/learning/library/critical-chain-project-management-investigation-6380)
- PMI — "Optimal methods for scheduling projects under resource constraints" — [https://www.pmi.org/learning/library/scheduling-projects-stinson-talbot-patterson-5730](https://www.pmi.org/learning/library/scheduling-projects-stinson-talbot-patterson-5730)
- RFgen — "SAP Plant Maintenance Guide" — [https://www.rfgen.com/products/sap-enterprise-mobility/sap-plant-maintenance-guide/](https://www.rfgen.com/products/sap-enterprise-mobility/sap-plant-maintenance-guide/)
- Emerald Associates — "Primavera P6 Terms and Definitions" — [https://www.emerald-associates.com/primavera-p6-terms-and-definitions.html](https://www.emerald-associates.com/primavera-p6-terms-and-definitions.html)
- Swiss-AS — AMOS Aviation Software — [https://www.swiss-as.com/](https://www.swiss-as.com/)
- Wikipedia — "Theory of Constraints" — [https://en.wikipedia.org/wiki/Theory_of_constraints](https://en.wikipedia.org/wiki/Theory_of_constraints)
- Wikipedia — "Manufacturing Execution System" — [https://en.wikipedia.org/wiki/Manufacturing_execution_system](https://en.wikipedia.org/wiki/Manufacturing_execution_system)
- Lean Production — "Theory of Constraints" — [https://www.leanproduction.com/theory-of-constraints/](https://www.leanproduction.com/theory-of-constraints/)
- ProjectManagementAcademy — "Crashing vs. Fast Tracking" — [https://projectmanagementacademy.net/resources/blog/crash-schedule-vs-fast-tracking/](https://projectmanagementacademy.net/resources/blog/crash-schedule-vs-fast-tracking/)
- MaintainNow — "Technician Skill Matrix" — [https://www.maintainnow.app/learn/definitions/technician-skill-matrix](https://www.maintainnow.app/learn/definitions/technician-skill-matrix)
- AnyChart — "Gantt Chart Data" — [https://docs.anychart.com/Gantt_Chart/Data](https://docs.anychart.com/Gantt_Chart/Data)

### Standards & Frameworks
- PMBOK Guide, 7th Edition — Project Management Institute (PMI), 2021
- PMBOK Guide, 6th Edition — Section 6 (Schedule Management) — still the authoritative process reference
- ISA-95 — Manufacturing Execution Systems standard
- SAE MSG-3 — Maintenance Steering Group 3 — defines task-oriented maintenance requirements (basis for aircraft maintenance programs)
- IATA / ATA Spec 2200 — ATA chapter system (standardized numbering for aircraft systems and task cards)
- FAR Part 43 (US) / EASA Part M (EU) — Regulatory framework governing maintenance execution order and certification

---

*Document written by Athelon Research Agent | Session: sched-best-practices | February 2026*
