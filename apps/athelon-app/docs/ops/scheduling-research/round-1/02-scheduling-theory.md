# Scheduling Theory for Aviation MRO: A Comprehensive Research Document

## 1. Executive Summary: Which Model Fits MRO?

**Bottom-line answer: The best-fit model for an FAA Part 145 MRO scheduling engine is the Multi-Skill Resource-Constrained Project Scheduling Problem (MS-RCPSP), with elements of the Flexible Job-Shop Scheduling Problem (FJSSP).**

| MRO Reality | Scheduling Model Match |
|---|---|
| Task cards have precedence dependencies | RCPSP precedence constraints |
| Technicians have specific FAA ratings (A&P, IA, avionics) | Multi-skill resources (MS-RCPSP) |
| Any qualified technician can perform an eligible task | Flexible job-shop (machine = technician) |
| Tasks have hard regulatory deadlines and AOG events | Due-date/tardiness objectives |
| Plans change constantly (parts delays, AOG, sick calls) | Dynamic/reactive rescheduling |
| Multiple aircraft compete for the same technician pool | Multi-project RCPSP |
| C-checks and D-checks span weeks with thousands of sub-tasks | Project scheduling, not simple job-shop |
| Inspector sign-off required before return to service | Logical gate constraints (CP) |

**Recommended solver: Google OR-Tools CP-SAT** — open-source, free (Apache 2.0), Python-native, callable from Convex Actions, and capable of handling all of the above constraints natively.

---

## 2. Classical Scheduling Theory

### 2.1 Critical Path Method (CPM) and PERT

**Origin:** CPM was developed in 1957 by Morgan R. Walker (DuPont) and James E. Kelley Jr. (Remington Rand). PERT was developed simultaneously by Booz Allen Hamilton and the U.S. Navy for the Polaris submarine program.

**What CPM computes:** Given a directed acyclic graph of tasks with durations and precedence constraints, CPM computes:
- **Earliest Start (ES)** / **Earliest Finish (EF)** via forward pass
- **Latest Start (LS)** / **Latest Finish (LF)** via backward pass
- **Float (slack)** = LS − ES: how much a task can slip without delaying the project
- **Critical path** = all tasks with zero float

**PERT extension:** PERT handles uncertain durations with a 3-point estimate:
- Expected duration = (Optimistic + 4×Most Likely + Pessimistic) / 6
- Variance = ((Pessimistic − Optimistic) / 6)²

**Key limitation for MRO:** CPM assumes unlimited resources. Adding resource constraints transforms CPM into the RCPSP.

### 2.2 Job-Shop Scheduling Problem (JSSP) and Variants

**Definition:** n jobs and m machines. Each job has a fixed sequence of operations, each requiring one specific machine. Objective: typically minimize makespan.

**Complexity:** NP-hard for m ≥ 3 and n ≥ 3. The number of possible schedules is (n!)^m.

**Graham notation (α | β | γ):** Standard 3-field notation (Graham et al., 1979):
- α = machine environment (J = job-shop, F = flow-shop, O = open-shop, Pm = parallel machines)
- β = job characteristics (prec, rj, dj, pmtn)
- γ = objective (Cmax, ΣwjTj, Lmax)

**Key variants relevant to MRO:**

| Variant | MRO Relevance |
|---|---|
| Dynamic JSSP (jobs arrive over time) | Aircraft arriving for service unpredictably |
| Stochastic JSSP (random processing times) | Uncertain maintenance task durations |
| JSSP with sequence-dependent setups | Technician travel time between work zones |
| JSSP with preemption | Tech can pause to handle an AOG |
| Multi-objective JSSP | Balance efficiency with deadline compliance |

### 2.3 Resource-Constrained Project Scheduling Problem (RCPSP)

**Definition — the core model for MRO:**
- n activities with fixed durations, non-preemptable
- Precedence constraints: activity j cannot start until all predecessors finish
- K renewable resource types, each with capacity Rk
- Each activity j requires rjk units of resource k while executing
- Objective: minimize makespan

**Complexity:** Strongly NP-hard, even for 2 resource types.

**Extensions especially relevant to MRO:**

| Extension | MRO Application |
|---|---|
| **MS-RCPSP** (multi-skill) | FAA certification requirements |
| **Multi-mode RCPSP** | In-house vs. vendor outsourcing |
| **Multi-project RCPSP** | Multiple aircraft in the hangar simultaneously |
| **Generalized precedence** | Cure times after sealant application |
| **Stochastic RCPSP** | Uncertain maintenance task scope |

**The PSPLIB benchmark:** Standard dataset created by Kolisch & Sprecher (1996). Contains instances with 30, 60, 90, and 120 activities.

### 2.4 Flexible Job-Shop Scheduling Problem (FJSSP)

Extends JSSP by allowing each operation to be processed by any machine from a given subset. Creates two interleaved sub-problems:
1. **Routing:** Choose which machine (technician) performs each operation
2. **Sequencing:** Order the operations assigned to each machine

**MRO mapping:**
- Each technician = one "machine"
- Each maintenance task = one operation
- Eligible machines = technicians certified for that task
- Processing time can vary by technician proficiency

---

## 3. Constraint-Based Scheduling

### 3.1 Constraint Programming (CP) Overview

CP is a declarative paradigm: you specify *what* must be true, not *how* to find it.

**Key concepts:**
- **Decision variables and domains:** Start times Sj ∈ [release_date, deadline], assignment variables xjk ∈ {0,1}
- **Constraints:** Precedence (Sj ≥ Si + di), No-overlap, Cumulative, All-different
- **Constraint propagation:** AC-3 algorithm achieves arc consistency in O(ed³)

**Global constraints for scheduling:**
- `cumulative(starts, durations, demands, capacity)`: Total resource use ≤ capacity at every time point
- `no_overlap(intervals)`: No two intervals overlap
- `interval(start, duration, end)`: Interval variable with start + duration = end

### 3.2 CP-SAT: Google's State-of-the-Art Solver

CP-SAT combines:
1. Constraint programming with domain propagation
2. SAT solving for combinatorial structure
3. LP relaxations for continuous bounds
4. Large Neighborhood Search (LNS) for heuristic exploration
5. Multi-threading: multiple search strategies run in parallel

**Performance:** Competitive with IBM CP Optimizer on industrial instances with up to 1 million operations.

**Key API features for MRO:**
- Native interval variables (start, duration, end)
- `AddNoOverlap` constraint (one-technician constraint)
- `AddCumulative` constraint (resource capacity)
- Optional intervals (tasks that may be deferred)
- Time-limited optimization with anytime guarantee
- Warm-start hints

**License:** Apache 2.0. Free for commercial use.

---

## 4. Optimization Approaches

### 4.1 Exact Methods

**Branch and Bound:** Maintains a search tree; branches by fixing decisions; prunes by bounding. Guarantees optimal solution. For RCPSP: Demeulemeester & Herroelen (1992) developed the best-known B&B.

**Mixed Integer Programming (MIP):** Binary variables for task-time and task-technician assignments. Solved by branch-and-cut. Decomposition approaches can achieve < 2% optimality gap.

**Open-source MIP solvers:** HiGHS (MIT license, Python + JavaScript APIs), CBC, GLPK.

### 4.2 Metaheuristics

**Genetic Algorithms (GA):** Encode schedule as a priority list; decode via Schedule Generation Scheme. Hartmann's (1998) GA was state-of-the-art for RCPSP for a decade.

**Simulated Annealing (SA):** Accept worse solutions with probability exp(−Δ/T). Simple, good theoretical properties.

**Tabu Search (TS):** Local search with a tabu list preventing revisiting recent moves. "Should be tried first" — yields good results with less computing time than GA.

**Ant Colony Optimization (ACO):** Probabilistic construction guided by pheromone trails. Strong on routing problems.

**When to use which:**

| Scenario | Recommended |
|---|---|
| ≤ 30 tasks, < 10 resources | CP-SAT (often optimal) |
| 30–100 tasks, < 20 resources | CP-SAT with time limit, or TS/SA |
| 100+ tasks, many resources | GA/SA/ACO metaheuristic |
| Real-time rescheduling (< 1 sec) | Priority dispatch rules |
| Initial planning (30 sec available) | CP-SAT warm-started with priority rule |

### 4.3 Priority Dispatching Rules

| Rule | Formula | Best Objective |
|---|---|---|
| SPT | Shortest Processing Time first | Minimize average completion time |
| LPT | Longest Processing Time first | Minimize makespan (parallel machines) |
| EDD | Earliest Due Date first | Minimize maximum lateness |
| MWKR | Most Work Remaining | Minimize makespan |
| LST | Latest Start Time (CPM-based) | Minimize makespan |
| ATC | Apparent Tardiness Cost | Balance due dates and processing times |

### 4.4 Deep Reinforcement Learning (DRL) — Emerging

GNN + PPO approaches encode schedule as a heterogeneous graph. Once trained (offline), inference is < 1ms. Key papers: Song et al. (2022, IEEE TII), Lei et al. (2022, Expert Systems).

---

## 5. Seminal Works and Key Authors

### 5.1 Foundational Textbooks

**Pinedo, M.L. — Scheduling: Theory, Algorithms, and Systems (6th ed., 2022)**
The single most comprehensive graduate textbook on scheduling. https://link.springer.com/book/10.1007/978-3-031-05921-6

**Brucker, P. — Scheduling Algorithms (5th ed., 2007)**
Theoretically rigorous treatment of algorithm complexity.

**Demeulemeester, E. & Herroelen, W. — Project Scheduling: A Research Handbook (2002)**
Definitive reference for RCPSP.

**Dorigo, M. & Stützle, T. — Ant Colony Optimization (MIT Press 2004)**
Canonical ACO reference with scheduling applications.

### 5.2 Seminal Papers

**Graham et al. (1979)** — Established the (α|β|γ) three-field notation.

**Blazewicz, Lenstra & Rinnooy Kan (1983)** — The foundational RCPSP paper. https://www.sciencedirect.com/science/article/pii/0166218X83900124

**Demeulemeester & Herroelen (1992)** — Best-known exact B&B for RCPSP.

**Kolisch & Sprecher (1996)** — PSPLIB benchmark dataset. https://www.sciencedirect.com/science/article/abs/pii/S0377221796001701

**Hartmann (1998)** — Best GA for RCPSP.

**Hartmann & Kolisch (2000 + 2006)** — Definitive RCPSP heuristics surveys. https://www.sciencedirect.com/science/article/abs/pii/S0377221705002596

**Mischek et al. (2019)** — Google vs IBM solver comparison. https://arxiv.org/pdf/1909.08247

### 5.3 MRO-Specific Papers

**Using constraint programming for aircraft line maintenance scheduling (2024)** — First CP-based solution for aircraft line maintenance. https://www.sciencedirect.com/science/article/abs/pii/S0969699724000024

**A two-stage optimization for aircraft hangar maintenance planning (2020)** — Combined hangar + multi-skill technician scheduling. https://www.sciencedirect.com/science/article/abs/pii/S0360835220303417

**Project Scheduling for MRO Work Orders (2018)** — Directly frames MRO WOs as RCPSP. https://www.researchgate.net/publication/326920421_Project_Scheduling_for_MRO_Work_Orders

---

## 6. Real-Time and Dynamic Scheduling

### 6.1 Taxonomy of Approaches

**Predictive (proactive):** Build robustness into the initial schedule. Buffer times, stochastic scheduling. Tradeoff: costs efficiency.

**Reactive:** Respond to disruptions as they occur.
- **Right-shift repair:** Delay affected tasks. Fast, minimal nervousness.
- **Regenerative rescheduling:** New optimal schedule from scratch.
- **Match-up scheduling:** Find a future point where new schedule rejoins original.
- **Left-shift repair:** Fill freed capacity by pulling forward unlocked tasks.

**Predictive-reactive (hybrid — best practice):**
1. Compute initial schedule with robustness buffers
2. Execute; monitor for disruptions
3. On disruption: apply fast repair (< 1 sec)
4. If insufficient: trigger full re-optimization (minutes)

### 6.2 Rolling Horizon Scheduling

Schedule only tasks within a near-term window; treat beyond-horizon as tentative. Re-solve as time advances.

For MRO: a 1-shift or 1-day rolling window is practical. Within the window, CP-SAT achieves exact or near-exact solutions.

### 6.3 Event-Driven Rescheduling

MRO trigger events: task completion, task blocked, new task added, resource becomes available, due date changed.

### 6.4 Robustness vs. Optimality

Research shows 5–15% increase in nominal makespan buys 30–50% reduction in worst-case tardiness.

Buffer high-risk tasks proportionally to: task duration uncertainty, part dependency risk, certification bottleneck risk, regulatory penalty severity.

---

## 7. Practical Implementation

### 7.1 Computation Time Targets

| Operation | Target | Approach |
|---|---|---|
| Initial plan (new WO) | < 30 seconds | CP-SAT with time limit + warm start |
| Real-time reschedule | < 2 seconds | Priority rule repair or small-window CP-SAT |
| Daily re-optimization | < 5 minutes | CP-SAT or metaheuristic, no time limit |
| Feasibility check only | < 100ms | Constraint propagation, no optimization |

### 7.2 Open-Source Solver Comparison

| Solver | Type | License | MRO Recommendation |
|---|---|---|---|
| **Google OR-Tools CP-SAT** | CP + SAT + LNS | Apache 2.0 | **Primary choice** |
| **HiGHS** | MIP | MIT | MIP sub-problems |
| **Timefold Solver** | Metaheuristic + CP | Apache 2.0 | High-level domain modeling |
| **Gurobi** | MIP | Commercial | Best MIP solver if budget allows |
| **IBM CP Optimizer** | CP | Commercial | Best CP solver; comparable to CP-SAT |

### 7.3 Modeling FAA Part 145 Constraints

| FAA Requirement | Scheduling Constraint |
|---|---|
| Technician must hold appropriate certificate | Skill constraint: only certified techs eligible |
| Required Inspection Items (RII) | Precedence + assignment to IA inspector |
| AD compliance deadline | Hard deadline: tardiness = infinity |
| Multi-shift work | Shift boundary constraint |
| WO sign-off | Dummy end-task precedence from all task_ends |
| Vendor work | Fixed-duration on "vendor" resource type |

---

## Sources

- Critical path method — Wikipedia
- Job-shop scheduling — Wikipedia
- Scheduling subject to resource constraints — ScienceDirect (1983)
- Resource-constrained multi-project scheduling — ScienceDirect (2022)
- PSPLIB Library — TUM
- Scheduling: Theory, Algorithms, and Systems — Springer (2022)
- CP-SAT Primer — d-krupke.github.io
- CP-SAT Solver — Google OR-Tools
- Google vs IBM Constraint Solving Challenge — arxiv (2019)
- Experimental evaluation of heuristics for RCPSP — ScienceDirect (2006)
- Flexible Job-Shop Scheduling via GNN and DRL — IEEE (2022)
- Multi-skill resource-constrained project scheduling — Springer (2019)
- FAA Part 145 — eCFR
