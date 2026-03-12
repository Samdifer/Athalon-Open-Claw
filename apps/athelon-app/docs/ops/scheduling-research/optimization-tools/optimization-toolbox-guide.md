# Optimization Toolbox Guide for Athelon Scheduling

> Research conversation from 2026-03-12. Covers optimization tool types, their applicability to MRO scheduling, and a phased implementation roadmap for Athelon capacity planning.

---

## Table of Contents

1. [Google OR-Tools & Related Tools Overview](#google-or-tools--related-tools-overview)
2. [Optimization Tool Types Explained](#optimization-tool-types-explained)
3. [Athelon Current State vs. Gaps](#athelon-current-state-vs-gaps)
4. [Implementation Roadmap](#implementation-roadmap)

---

## Google OR-Tools & Related Tools Overview

Google OR-Tools is an open-source optimization suite (C++/Python/Java/C#) with four key solver families:

- **CP-SAT** — Constraint Programming solver. Best for scheduling, assignment, and combinatorial problems. The go-to for job-shop scheduling, shift scheduling, and resource-constrained project scheduling.
- **Linear/Mixed-Integer Programming (GLOP/SCIP)** — For LP/MIP problems like cost minimization, capacity planning, blending.
- **Vehicle Routing (VRP)** — Purpose-built for routing problems (fleet dispatch, delivery optimization).
- **Network Flows** — Min-cost flow, max flow, assignment problems.

### Related Optimization Libraries

| Tool | Language | Strength |
|---|---|---|
| **OptaPlanner** (now Timefold) | Java/Kotlin | Employee shift scheduling, vehicle routing, task assignment. Very mature constraint solver with built-in scheduling domain models. |
| **Timefold** | Java/Python | Fork/successor of OptaPlanner, actively developed. Has Python bindings now. |
| **CPLEX** (IBM) | C++/Python/Java | Industrial-grade MIP/CP solver. Expensive but extremely fast. Free academic licenses. |
| **Gurobi** | C++/Python/Java | Arguably the fastest commercial MIP solver. Used in airline crew scheduling, logistics. |
| **COIN-OR (CBC)** | C++ | Open-source MIP solver. Slower than commercial but free. |
| **MiniZinc** | Declarative | Modeling language that compiles to multiple solvers (CP-SAT, Gurobi, etc.). Great for prototyping constraint models. |
| **Z3** (Microsoft) | C++/Python | SMT solver — more for verification/logic but can handle scheduling constraints. |

### Scheduling-Specific Tools

- **Microsoft Project / Project Online** — Traditional CPM/PERT project scheduling with resource leveling.
- **Primavera P6** (Oracle) — Heavy-duty project scheduling for construction/engineering. CPM-based with resource optimization.
- **LiquidPlanner** — Predictive scheduling using ranged estimates (probabilistic).

### MRO/Maintenance Scheduling Tools

- **MOCA (IBS)** — Aviation MRO planning engine.
- **AMOS** (Swiss Aviation Software) — MRO scheduling with maintenance program integration.

The real pattern in aviation MRO is **constraint-based scheduling** where tasks have dependencies (can't close panel before inspection), resource constraints (only 2 NDT technicians), regulatory gates (QC hold points), and parts availability windows.

---

## Optimization Tool Types Explained

### 1. Greedy Algorithms (What Athelon Has Now)

**What it is:** Like packing a suitcase by grabbing the biggest item first and cramming it in wherever it fits. You go through your list one item at a time, make the best choice *right now*, and never look back.

**What Athelon does today:** `magicSchedule.ts` sorts work orders by priority (AOG first, then urgent, then routine), then for each one, finds the least-loaded bay with the earliest open slot. Done. Next WO.

**Benefits:**
- Blazing fast (milliseconds)
- Easy to understand and debug
- Good enough when you have few WOs or lots of spare capacity

**Limitations:**
- Never reconsiders a past decision — if putting WO #3 in Bay A blocks a better arrangement for WOs #4-10, too bad
- Can't optimize globally — it doesn't know what's coming next
- Doesn't minimize total cost, overtime, or makespan — just stuffs things in order
- Gets worse as utilization increases (when bays are 80%+ full, greedy choices cascade into bad plans)

**Athelon example:** You have 12 WOs to schedule across 4 bays. The greedy scheduler puts AOG jobs first, which is correct. But it might put a 3-day routine job in Bay 1 when putting it in Bay 3 would have left Bay 1 open for an urgent job arriving tomorrow. It can't see that.

---

### 2. Linear Programming (LP) / Mixed-Integer Programming (MIP)

**What it is:** You want to maximize profit (or minimize cost). You have constraints: limited resources, limited hours. LP finds the mathematically *perfect* answer given your constraints.

- **LP** = all decisions are continuous numbers ("use 3.7 hours of tech time")
- **MIP** = some decisions are yes/no ("assign this tech to this WO: yes or no"). This is what scheduling needs because you can't assign half a technician.

**How it works:** Write the problem as math equations:
- **Objective:** Minimize total labor cost (or makespan, or overtime)
- **Constraints:** Each tech works max 8.5 hrs/day. Each bay holds 1 aircraft. WO #5 needs an IA-certified tech.
- **Decision variables:** `x[tech_i, wo_j, day_k]` = 1 if tech i works on WO j on day k, 0 otherwise

The solver finds the optimal assignment of all variables simultaneously.

**Benefits:**
- Finds the *proven optimal* solution (or proves how close to optimal you are)
- Handles cost minimization beautifully — great for "minimize overtime while meeting all due dates"
- Well-understood math, huge ecosystem of solvers
- Can model complex cost structures (overtime rates, markup tiers)

**Limitations:**
- Gets slow when problems get large (thousands of binary variables = slow)
- Hard to model "if-then" logic — these become "big-M" constraints that bloat the model
- The math formulation is tricky to get right and hard to debug
- Doesn't naturally handle sequences/ordering — you need extra variables for "task A before task B"

**Solvers:** Gurobi (fastest, expensive), CPLEX (IBM, expensive), GLOP (Google OR-Tools, free, LP only), CBC (free, slower MIP)

---

### 3. Constraint Programming (CP) / CP-SAT

**What it is:** Instead of writing math equations, you describe *rules*. "Tech A can't work two WOs at the same time." "Inspection must happen after repair." "Bay 3 only fits single-engine aircraft." The solver explores combinations and finds arrangements that satisfy all rules.

CP-SAT (Google OR-Tools) combines constraint programming with SAT solving (a technique from proving logical statements true/false). It's extremely good at scheduling.

**How it works:** Define:
- **Variables:** Start time of each task, which bay, which tech
- **Constraints:** No overlap on same bay. Tech certifications match requirements. Dependencies respected. Shifts honored.
- **Objective (optional):** Minimize makespan, or minimize late deliveries, or maximize utilization

The solver uses a combination of smart search and logical deduction to prune impossible combinations and find good solutions fast.

**Benefits:**
- *Built for scheduling* — native concepts for "intervals that can't overlap," "this before that," "choose one from this set"
- Handles complex logical rules naturally (if/then, or, not)
- Fast for combinatorial problems (thousands of tasks, hundreds of resources)
- Can find optimal solutions OR stop early with a "good enough" solution (anytime algorithm)
- Free and open source (Google OR-Tools)

**Limitations:**
- Less intuitive to model cost optimization (LP is better for pure cost problems)
- Python-native — would need a microservice for a TypeScript/Convex stack
- Harder to explain *why* it chose a particular schedule (less interpretable than LP)
- Overkill for simple problems where greedy works fine

**Athelon example:** "Schedule 40 WOs across 6 bays and 20 technicians over 4 weeks, respecting all certifications, inspection holds, part availability dates, shift schedules, and dependencies — minimize the number of late deliveries." CP-SAT eats this for breakfast. The existing scheduling research already identifies CP-SAT as the recommended solver.

---

### 4. Bin Packing

**What it is:** You have boxes of different sizes. You have shelves of fixed width. Fit as many boxes on as few shelves as possible without anything falling off.

**How it works:** Classic algorithms like First Fit Decreasing: sort items biggest-first, put each item on the first shelf where it fits.

**Benefits:**
- Simple, fast, well-studied algorithms
- Perfect mental model for capacity problems
- Can implement in pure TypeScript (no external solver needed)

**Limitations:**
- Only handles one constraint dimension well (size to capacity)
- Real scheduling has many dimensions (time, skills, bays, tools, parts) — bin packing alone can't capture this
- No concept of ordering/dependencies
- Approximation only — guaranteed within ~22% of optimal for simple cases, but no guarantees with multiple constraints

**Athelon examples:**
- **Hangar bay scheduling** = 2D bin packing: aircraft (width = bay space) x time (height = duration)
- **Shift packing** = 1D bin packing: filling tech shifts with tasks without exceeding hours
- **Parts kit staging** = bin packing by weight/volume
- The existing `capacityModel.ts` computes available hours per day (bin size) and WO hours per day (items). When utilization exceeds 100%, you've overpacked the bin.

**Variants relevant to MRO:**

| Variant | What It Is | MRO Example |
|---|---|---|
| 1D bin packing | Items have one dimension (size) | Packing tasks into shifts by hours |
| 2D bin packing | Items have width + height | Bay scheduling (space x time) |
| Variable-sized bin packing | Bins differ in capacity | Different bay sizes, different shift lengths |
| Online bin packing | Items arrive over time, can't repack | AOG/unscheduled work arriving mid-week |
| Bin packing with conflicts | Some items can't share a bin | Tasks requiring the same tooling can't overlap |

---

### 5. Critical Path Method (CPM)

**What it is:** If you're building a house, some tasks are sequential (pour foundation, frame walls, roof). The *longest chain* of sequential tasks determines the minimum time to finish. That chain is the "critical path." Any delay on it delays the whole project.

Tasks *not* on the critical path have "float" — they can slip without affecting the finish date.

**How it works:** Forward pass (earliest start/finish for each task) then backward pass (latest start/finish). Float = latest start - earliest start. Zero float = critical.

**Benefits:**
- Tells you exactly which tasks matter most for on-time delivery
- Float tells you where you have flexibility to move things around
- Foundation of all project management
- Already built in Athelon: `critical-path.ts`

**Limitations:**
- Assumes deterministic durations (in reality, that 40-hour inspection might take 60)
- Doesn't consider resource constraints — assumes infinite techs/bays
- The critical path changes as the schedule changes, needs constant recalculation
- Only tells you *what's critical*, not *what to do about it*

**Athelon example:** A King Air 350 heavy check has 85 task cards with dependencies. CPM shows NDT inspection -> wing spar repair -> QC signoff is 14 days and critical. The avionics bench check has 3 days of float. So if short-staffed, pull a tech from avionics to support NDT.

---

### 6. Resource Leveling

**What it is:** After scheduling tasks, you notice Tuesday needs 5 techs but you only have 3. Resource leveling pushes tasks forward (or rearranges) until no day exceeds capacity. It smooths out the humps.

**How it works:** Priority-based greedy scan: for each task (highest priority first), find the earliest day where adding this task doesn't overload any resource. Push it there.

**Benefits:**
- Turns an infeasible schedule into a feasible one
- Respects priority — important work stays early
- Already built in Athelon: `resource-leveling.ts` with certification checks, efficiency multipliers, bay capacity limits

**Limitations:**
- Extends the schedule — leveling almost always makes the total duration longer
- Greedy approach means it may not find the shortest possible leveled schedule
- Doesn't optimize cost — just feasibility
- One-pass: doesn't reconsider earlier assignments when later ones cause problems

**Athelon example:** The 15% capacity buffer (`capacityBufferPercent` in `capacity.ts`) flags overloads. Resource leveling would automatically resolve them by shifting routine WOs to later slots, preserving AOG/urgent timing.

---

### 7. Earned Value Management (EVM)

**What it is:** A way to answer "are we on budget and on schedule?" with actual numbers, not gut feelings. Compares what you *planned* to spend by now, what you've *actually* accomplished, and what you've *actually* spent.

**How it works:** Three curves tracked over time:
- **PV** (Planned Value) — what you budgeted to complete by now
- **EV** (Earned Value) — the budgeted cost of work actually completed
- **AC** (Actual Cost) — what you actually spent

From these: CPI (cost performance index) and SPI (schedule performance index). CPI < 1 = over budget. SPI < 1 = behind schedule.

**Benefits:**
- Early warning system — see trouble at 20% completion, not 80%
- Standardized (used by DoD, NASA, major construction)
- Already built in Athelon: `earned-value.ts` with S-curve generation

**Limitations:**
- Only as good as your estimates — garbage in, garbage out
- Doesn't tell you *why* you're behind or *what to do*
- Requires accurate time tracking (actual hours booked per task)
- Can be misleading if scope changes mid-project

**Athelon example:** A Cessna Citation CJ4 annual inspection is quoted at $45K and 120 labor hours. At day 5 of 10, you've spent $28K but only completed 40% of the work. EVM: CPI = 0.64 (way over budget), SPI = 0.80 (behind schedule). EAC projects a $70K final cost. The shop manager sees this on the dashboard before it's too late to recover.

---

### 8. Metaheuristics (Genetic Algorithms, Simulated Annealing, Tabu Search)

**What it is:** When the problem is too complex for exact solvers, these algorithms mimic natural processes to find "good enough" solutions:

- **Genetic Algorithm (GA):** Create a population of random schedules. The best ones "breed" (combine features). Mutate randomly. Repeat for generations. The population evolves toward better solutions.
- **Simulated Annealing (SA):** Start with a random schedule. Make random changes. Accept improvements always; accept bad changes sometimes (more likely early on, less likely later — like cooling metal). Avoids getting stuck in local optima.
- **Tabu Search:** Keep making the best available move, but remember recent moves in a "tabu list" so you don't go in circles.

**Benefits:**
- Handle messy, real-world problems that exact solvers choke on
- Can optimize multiple objectives simultaneously (cost AND schedule AND utilization)
- Flexible — easy to add new constraint types
- Can run in TypeScript (no external solver needed)
- OptaPlanner/Timefold are production-grade frameworks built on these

**Limitations:**
- No guarantee of optimality — you get a "good" answer, not provably "the best"
- Tuning is an art (population size, mutation rate, cooling schedule, etc.)
- Can be slow for real-time re-scheduling (seconds to minutes)
- Hard to explain to users why the schedule looks the way it does

**Athelon example:** "Optimize next month's schedule across 3 shop locations, 45 technicians, 30 WOs, considering overtime costs, training requirements, customer promised dates, AD compliance deadlines, and bay maintenance windows." This is too messy for pure LP. A GA or SA could explore the solution space and find a plan that's 90-95% as good as optimal in under 30 seconds.

---

## How All Optimization Types Relate

```
Optimization Problems
+-- Linear Programming (LP/MIP)
|   +-- Assignment problems (who does what)
|   +-- Flow problems (routing, logistics)
|   +-- Scheduling (minimize makespan/cost)
+-- Constraint Programming (CP)
|   +-- Scheduling with complex rules
|   +-- Sequencing with dependencies
|   +-- Timetabling
+-- Bin Packing / Cutting Stock
|   +-- Resource capacity allocation
|   +-- Spatial/temporal fitting
|   +-- Load balancing
+-- Vehicle Routing (VRP)
|   +-- Fleet dispatch
|   +-- Field service routing
+-- Metaheuristics
    +-- Genetic Algorithms
    +-- Simulated Annealing
    +-- Tabu Search
```

**Key insight:** These aren't separate problems — real scheduling is a *combination*. An MRO weekly plan is simultaneously:
- A **MIP** problem (minimize cost/overtime)
- A **bin packing** problem (fit jobs into bays and shifts)
- A **constraint satisfaction** problem (regulatory sequences, skill requirements, part availability)
- A **dependency graph** problem (task ordering within a work order)

This is why **CP-SAT** has become the go-to — it handles the hybrid nature well.

---

## Athelon Current State vs. Gaps

| Capability | Status | Location |
|---|---|---|
| Greedy bay assignment | Built, in production | `magicSchedule.ts` |
| Conflict detection | Built | `conflicts.ts` |
| CPM / Critical Path | Built, not wired to UI | `critical-path.ts` |
| Cascade scheduling | Built, not wired to UI | `cascade-scheduler.ts` |
| Resource leveling | Built, not wired to UI | `resource-leveling.ts` |
| EVM tracking | Built, not wired to UI | `earned-value.ts` |
| WBS rollup | Built, not wired to UI | `wbs.ts` |
| Capacity calculation | Built, server + client | `convex/capacity.ts` + `capacityModel.ts` |
| Roster/shift management | Built, in production | `convex/schedulerRoster.ts` |
| Baseline snapshots | Built | `convex/scheduleSnapshots.ts` |
| **Optimization solver (CP-SAT/MIP)** | **Not built** | Research docs recommend it |
| **Predictive scheduling (stochastic)** | **Not built** | Durations are deterministic only |
| **Multi-objective optimization** | **Not built** | No cost vs. schedule tradeoff |
| **What-if scenario comparison** | **Partial** | Snapshots exist but no side-by-side solver runs |

---

## Implementation Roadmap

### Phase 1 — Wire What You Already Have (biggest bang for zero new code)

CPM, resource leveling, cascade scheduling, and EVM already exist as pure functions. They just need to be connected to live Convex data.

1. **CPM on every WO with dependencies** — show critical path highlighting on the Gantt. Red border = critical task. Float displayed as a tooltip. This alone transforms planning visibility.
2. **Resource leveling as a "Level" button** — feed current assignments + roster into `resourceLeveling()`, show the result as a proposed schedule the user can accept or reject.
3. **Cascade on drag** — when a user drags a WO on the Gantt, run `cascadeSchedule()` to push dependents.
4. **EVM dashboard per WO** — add a tab on WO detail showing CPI/SPI gauges and the S-curve chart.

**Effort:** Medium. No new algorithms, just plumbing Convex queries into existing pure functions.

### Phase 2 — Smart Capacity Planning (bin packing + heuristics, pure TypeScript)

Build a **capacity-aware scheduler** that replaces `magicSchedule` with something smarter:

1. **Multi-resource bin packing** — when auto-scheduling, check tech hours AND bay slots AND certification requirements simultaneously (not just bay availability like today). The `resource-leveling.ts` already does most of this — promote it to be the primary scheduler.
2. **Rolling horizon planning** — schedule the next 2 weeks optimally and tentatively plan weeks 3-6. Re-plan weekly. This matches how MRO shops actually work.
3. **Buffer management** — use the 15% capacity buffer intelligently. Routine work scheduled to 85% capacity, leaving 15% for AOG/urgent arrivals. When an AOG arrives, the buffer absorbs it.
4. **Due-date feasibility check** — before accepting a promised delivery date, run the scheduler forward and flag if it's achievable given current load. This is predictive planning.

**Effort:** Medium-high. Mostly enhancing existing algorithms and building UI for the results.

### Phase 3 — CP-SAT Optimization Microservice (the big upgrade)

Deploy a small Python microservice (Cloud Run or Lambda) that runs Google OR-Tools CP-SAT:

**Architecture:**
```
Gantt UI -> Convex Action -> HTTP call to Python service -> CP-SAT solves -> returns optimal schedule -> Convex persists
```

**What to optimize:**
1. **Weekly/monthly plan generation** — "Given these 30 WOs, 20 techs, 5 bays, and all constraints, what's the schedule that minimizes late deliveries while keeping overtime under 10%?"
2. **AOG rescheduling** — "An AOG just arrived. What's the least disruptive way to accommodate it?" CP-SAT can solve this in 1-2 seconds.
3. **What-if scenarios** — "What if we hire 2 more A&Ps? What if Bay 3 is down for 2 weeks?" Run the solver with different inputs and compare.
4. **Multi-location balancing** — CP-SAT can decide which location should take which WO based on capacity, skills, and travel.

**Why a microservice:** CP-SAT is Python/C++ native. Convex actions can call external HTTP endpoints. The solver runs for 2-30 seconds depending on problem size — too long for a Convex mutation, perfect for an action with a callback.

**Effort:** High. New infrastructure, new language (Python), but the constraint model maps cleanly to existing data types.

### Phase 4 — Predictive & Probabilistic (future)

Once historical data is flowing:

1. **Duration estimation from history** — instead of fixed "estimated hours," use distributions (a 100-hour check actually takes 80-130 hours based on past data). Feed ranges into the solver.
2. **Monte Carlo simulation** — run the schedule 1000 times with random duration variations. "There's an 85% chance we finish by Friday" is way more useful than "the plan says Friday."
3. **Demand forecasting** — predict upcoming maintenance needs from fleet data (flight hours, cycles, calendar intervals, AD compliance deadlines) to pre-plan capacity months out.

---

## Summary

**Start here:** Wire existing CPM + resource leveling + EVM to the live UI (Phase 1). This gives 70% of the value for 20% of the effort. Then layer in smarter capacity bin packing (Phase 2) to replace the greedy scheduler. When ready for a step change, add CP-SAT as a microservice (Phase 3) for true optimization. Save probabilistic planning (Phase 4) for when there's enough historical data to feed it.
