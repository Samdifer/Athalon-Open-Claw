# CP-SAT Constraint Programming Solver — Research Document

> Research date: 2026-03-12. Covers CP-SAT internals, use cases, Athelon-specific constraint models, integration architecture, and interactions with the existing scheduling engine.

---

## Table of Contents

1. [What CP-SAT Is](#1-what-cp-sat-is)
2. [General Use Cases](#2-general-use-cases)
3. [Athelon-Specific Use Cases](#3-athelon-specific-use-cases)
4. [How It Works — Technical Deep Dive](#4-how-it-works--technical-deep-dive)
5. [Where to Find It / Dependencies](#5-where-to-find-it--dependencies)
6. [Integration Architecture for Athelon](#6-integration-architecture-for-athelon)
7. [Interactions with Other Optimization Tools](#7-interactions-with-other-optimization-tools)

---

## 1. What CP-SAT Is

### Technical Definition

CP-SAT is a hybrid constraint programming / Boolean satisfiability solver developed by Google as part of the OR-Tools suite. It was released publicly around 2018 and has since become the default recommended solver for combinatorial optimization within OR-Tools, replacing the older CP solver (`ortools.constraint_solver`).

The name means exactly what it says: **CP** (Constraint Programming) combined with **SAT** (Boolean Satisfiability). The combination is not cosmetic — it is a deep architectural fusion that gives CP-SAT its power.

### How It Works Internally

#### Lazy Clause Generation (LCG)

The central mechanism that distinguishes CP-SAT from classic CP solvers is **Lazy Clause Generation**, a technique developed at Monash University (Australia) by Peter Stuckey and colleagues. LCG bridges the gap between constraint propagation and SAT solving:

1. **Classical CP propagators** maintain domain consistency — they prune impossible values from variable domains. But when a conflict is found, classical CP can only backtrack to the most recent choice point ("chronological backtracking"). It does not learn *why* the conflict occurred.

2. **SAT solvers** (CDCL — Conflict-Driven Clause Learning) are exceptional at learning from conflicts. When a contradiction is reached, the solver analyzes the implication graph to identify a "conflict clause" — a minimal set of variable assignments that caused the failure. This clause is added to the formula permanently, so the solver never repeats the same mistake.

3. **LCG** gives CP propagators the ability to *explain themselves* in SAT terms. When a propagator prunes a value (e.g., "variable X cannot be 5 because constraint C says so"), it can generate a *reason clause* — a Boolean justification for that deduction. These reason clauses feed into the CDCL machinery, enabling conflict clause learning even over non-Boolean (integer) domains.

The result: CP-SAT gets the domain modeling power of constraint programming (intervals, cumulative, element, etc.) plus the powerful backjumping and clause learning of modern SAT solvers.

#### Propagation

CP-SAT uses a **fix-point propagation loop**: after any variable assignment or domain restriction, all affected constraints fire their propagators. Propagators narrow domains (e.g., "if task A ends at time T, task B with FS dependency must start at T or later"). This repeats until no further deductions can be made — the system reaches a "propagation fix-point." Only then does the solver branch.

Key constraint propagators relevant to scheduling:
- **Bound propagation**: `x + y <= z` propagates tighter bounds on each variable
- **No-overlap propagation** (disjunctive scheduling): Uses edge-finding, not-first/not-last, and precedence energy algorithms
- **Cumulative propagation**: Uses timetabling, overload checking, edge-finding for resource capacity
- **Linear propagation**: Maintains bounds consistency for linear constraints

#### Clause Learning

When the propagation loop reaches a contradiction (all values eliminated from a domain), CP-SAT performs:
1. **Conflict analysis**: Traces back through the implication graph to find the root cause
2. **Clause minimization**: Reduces the conflict clause to its minimal form
3. **Clause learning**: Adds the clause to the SAT database
4. **Non-chronological backjumping**: Jumps back past the most recent choice to the level that caused the conflict (not just one level back)

This is what makes CP-SAT dramatically faster than older CP solvers on hard combinatorial problems — it does not repeat the same dead ends.

#### Branching

CP-SAT uses several branching strategies:
- **Variable selection**: Minimum domain heuristic (branch on the variable with fewest remaining values), activity-based scoring (variables that appear in many recent conflicts get priority), or user-specified hints
- **Value selection**: Try the smallest value first, or use solution hints to guide toward known-good values
- **Search restarts**: Luby sequence restarts (rapid restarts with exponentially growing cutoffs) allow escaping from poor parts of the search tree
- **Large Neighborhood Search (LNS)**: A portfolio of neighborhood operators selectively fixes and releases subsets of variables, allowing focused optimization within neighborhoods. This is particularly powerful for scheduling: fix 80% of assignments, reoptimize the remaining 20%, repeat.

#### Parallelism

CP-SAT has native multi-threaded search. With `num_workers = N`, it runs multiple independent search threads, each using a different strategy (e.g., one pure CDCL, one LNS-focused, one with different variable ordering). Threads share learned clauses through a shared clause database. This often gives near-linear speedups up to 8-16 cores for scheduling problems.

### CP vs. SAT vs. CP-SAT — Differences

| Dimension | Pure CP | Pure SAT/CDCL | CP-SAT (LCG) |
|---|---|---|---|
| Variable types | Integer, float, set | Boolean only | Integer (encoded as Boolean) |
| Domain modeling | Natural (intervals, cumulative) | Requires encoding | Natural |
| Conflict learning | No (chronological backtrack) | Yes (CDCL) | Yes (LCG) |
| Global constraints | Yes (all-different, cumulative, etc.) | No (must encode manually) | Yes + propagators generate SAT clauses |
| Scalability | Poor on hard combinatorial | Excellent on Boolean problems | Excellent on scheduling/assignment |
| Objective | Minimize/maximize | Typically satisfaction only | Minimize/maximize with branch-and-bound |

### Interval Variables and Scheduling-Specific Constructs

CP-SAT has first-class support for scheduling via **interval variables**, which are composite objects:

```python
start = model.new_int_var(0, horizon, "start")
end   = model.new_int_var(0, horizon, "end")
duration = 5  # fixed, or could be a variable
interval = model.new_interval_var(start, duration, end, "interval")
# Enforces: end == start + duration
```

**Optional interval variables** model tasks that may or may not be scheduled:
```python
is_present = model.new_bool_var("is_present")
opt_interval = model.new_optional_interval_var(start, duration, end, is_present, "opt_interval")
# The start/end constraints only apply if is_present == True
```

**No-overlap constraint** (`AddNoOverlap`): Ensures that among a list of intervals (e.g., all tasks on a given machine or bay), no two overlap in time. This is the disjunctive scheduling constraint.

**Cumulative constraint** (`AddCumulative`): Ensures that at any point in time, the sum of demands of active intervals does not exceed a capacity. Used for resources like "max 3 technicians in a bay at once" or "max 2 NDT jobs per shift."

**No-overlap 2D constraint** (`AddNoOverlap2D`): Two sets of intervals (x-axis and y-axis) — at any point, no two tasks overlap in both dimensions simultaneously. This directly models 2D bin packing and hangar floor placement.

**Element constraint** (`AddElement`): `variables[index] == target`. Used to look up values in tables — for example, "the duration of this task depends on which technician is assigned."

**Circuit constraint** (`AddCircuit`): Models traveling salesman / Hamiltonian circuit problems. Each node has exactly one outgoing arc and one incoming arc selected. Useful for sequencing problems.

### What Makes CP-SAT Different from LP/MIP Solvers

| Dimension | LP/MIP (e.g., GLOP, Gurobi, CPLEX) | CP-SAT |
|---|---|---|
| Objective form | Must be linear | Can be non-linear (piecewise, element, max) |
| Constraint form | Must be linear | Arbitrary (global constraints, logical, table) |
| Continuous variables | Native | Not directly (all integer) |
| Large domains | Scales well with LP relaxation | Can struggle with very large horizons |
| Combinatorial structure | Branch-and-bound on LP relaxation | CDCL + LCG + propagation |
| Disjunctive scheduling | Requires big-M linearization | Native (no-overlap constraint) |
| Symmetry breaking | Manual | Partially automatic |
| Best for | Cost optimization, resource allocation, logistics | Scheduling, assignment, combinatorial feasibility |

In scheduling specifically, LP/MIP solvers require disjunctive constraints to be modeled with binary variables and big-M linearization (e.g., `start_j >= end_i - M*(1-b_ij)` for all pairs i,j). This creates exponential numbers of constraints and poor LP relaxations. CP-SAT's no-overlap propagator avoids this entirely.

---

## 2. General Use Cases

### Job-Shop Scheduling (JSP)

The classic job-shop problem: N jobs, M machines. Each job has a fixed sequence of operations across machines. Each machine processes one operation at a time. Goal: minimize makespan.

CP-SAT naturally models this: one interval variable per (job, machine) operation, no-overlap constraint per machine, precedence constraints within each job. This is the canonical CP-SAT example in the OR-Tools documentation.

**Flexible Job-Shop Scheduling (FJSP)** extends this: each operation can be performed on any machine from a set, with machine-dependent durations. CP-SAT models this with optional intervals: for each (operation, machine) pair, create an optional interval. Exactly one must be selected per operation (`add_exactly_one`). The no-overlap constraint uses all optional intervals for each machine.

### Employee Rostering and Shift Scheduling

Assign employees to shifts over a planning horizon. Constraints:
- Coverage minimums per shift/day
- Maximum consecutive days worked
- Minimum rest between shifts
- Employee preferences (maximize satisfied requests)
- Regulatory limits (max hours/week, mandatory days off)

CP-SAT uses Boolean variables `shift[employee][day][shift_type]` and linear constraints for coverage. The nurse scheduling example in OR-Tools documentation is a canonical example of this.

Real-world scale: airlines schedule tens of thousands of crew members. While airline crew pairing (building trips) is typically solved with column generation, final crew assignment uses CP or IP methods. CP-SAT has been applied at medium scale (hundreds of employees, monthly horizon).

### Vehicle Routing with Time Windows (VRPTW)

While OR-Tools has a dedicated routing library (Google VRP library) that is typically preferred for VRPTW, CP-SAT can model it directly:
- Boolean `arc[i][j][vehicle]` variable for each arc/vehicle combination
- Circuit constraint per vehicle
- Interval variables for service time at each node
- Cumulative constraints for vehicle capacity

For VRPTW at small-to-medium scale (< 200 stops), CP-SAT is competitive. For large-scale routing (500+ stops), the dedicated VRP library with its metaheuristic local search is typically faster.

### Bin Packing with Constraints

1D bin packing: minimize number of bins used to pack items of various sizes. CP-SAT models this with cumulative constraints (one "bin" per time unit, or one cumulative resource per bin). Optional intervals per (item, bin) pair.

2D bin packing (rectangle packing): Use `AddNoOverlap2D` with two sets of intervals — one for the x-axis (width), one for the y-axis (height). Each item has an x-interval and a y-interval. `AddNoOverlap2D` ensures no two items overlap in 2D space.

### Timetabling

**University timetabling**: Assign courses to rooms and time slots. Constraints: no professor teaches two courses simultaneously, no room double-booked, student group conflicts, room capacity, preferred days. CP-SAT handles this well up to hundreds of courses.

**Hospital OR scheduling**: Assign surgeries to operating rooms and time blocks. Constraints: surgeon availability, anesthesiologist assignment, room specialization (cardiac vs. orthopedic), setup/teardown times, emergency slots. This is extremely close to Athelon's use case (NDT bays, paint bays = specialized ORs; A&P/IA = surgeons/anesthesiologists).

**Airline crew scheduling**: Two-phase approach: (1) crew pairing (build valid pairings using set partitioning / column generation), (2) crew rostering (assign pairings to individual crew members using CP or IP). CP-SAT is used in phase 2.

### Resource-Constrained Project Scheduling (RCPSP)

The canonical problem for MRO: activities with durations, precedences (FS/FF/SS/SF), and resource requirements. Resources have limited capacity. Goal: minimize project duration (makespan) or meet a deadline.

CP-SAT models RCPSP with:
- One interval variable per activity
- Precedence constraints (`model.add(end_A <= start_B)`)
- Cumulative constraints per resource type
- Objective: minimize maximum end time

This is the closest standard problem to what Athelon needs to solve at the work-order task-card level.

### Real-World Examples

**Google:** Internal use at Google for data center scheduling, cloud resource allocation, and advertising optimization pipelines.

**Healthcare:** Hospital OR scheduling, nurse rostering. Several published papers show CP-SAT outperforming manual scheduling by 15-25% on OR utilization.

**Manufacturing:** Production scheduling at automotive plants. Toyota, BMW, and similar manufacturers use constraint-based scheduling for sequencing paint lines, assembly operations, and supplier kanban.

**Railway:** Train scheduling and crew assignment at European rail operators uses CP models (often Chuffed or CP-SAT).

**Aviation MRO (closest to Athelon):** Published work from Airbus and Lufthansa Technik describes constraint programming for heavy maintenance visit (HMV) scheduling — analogous to Athelon's work order scheduling problem.

---

## 3. Athelon-Specific Use Cases

This section defines the complete CP-SAT constraint model for each Athelon scheduling problem. Each model specifies: decision variables, variable domains, constraints, objective function, and the expected solving time category.

### 3.1 Work Order Scheduling

**Problem:** Assign N work orders to M hangar bays, selecting a start time for each, such that capacity is not exceeded, priorities are respected, promised dates are met, and the schedule is globally optimal.

**Decision Variables:**
```
start[wo]       ∈ [0, horizon]     # start time in hours (integer)
end[wo]         ∈ [0, horizon]     # end time in hours (integer)
bay[wo]         ∈ [0, num_bays-1]  # which bay (integer)
interval[wo]    # composite interval variable: (start, duration, end)
opt_interval[wo][bay]  # optional interval: wo is in this bay iff selected
```

**Derived Variables:**
```
is_in_bay[wo][bay]  ∈ {0, 1}  # Boolean: True iff wo assigned to bay
```

**Constraints:**

1. **Assignment completeness:** Each WO is assigned to exactly one bay.
   ```python
   model.add_exactly_one(is_in_bay[wo][bay] for bay in all_bays)
   ```

2. **Bay no-overlap:** No two WOs overlap in the same bay (one aircraft at a time).
   ```python
   for bay in all_bays:
       model.add_no_overlap([opt_intervals[wo][bay] for wo in all_wos])
   ```

3. **Aircraft-bay compatibility:** AOG-capable aircraft cannot go to a paint bay; wide-body aircraft cannot go to small bays.
   ```python
   for wo in all_wos:
       if aircraft[wo].wingspan > bay_width[bay]:
           model.add(is_in_bay[wo][bay] == 0)
   ```

4. **Priority ordering:** AOG WOs must start before urgent WOs; urgent before routine (soft constraint via objective penalty, or hard via time bounds).
   ```python
   # Hard: AOG must start within 4 hours
   for wo in aog_wos:
       model.add(start[wo] <= 4)
   ```

5. **Promised date (due date constraint):**
   ```python
   model.add(end[wo] <= promised_date[wo])  # hard
   # or: penalize lateness in objective (soft)
   lateness[wo] = model.new_int_var(0, horizon, f"late_{wo}")
   model.add_max_equality(lateness[wo], [end[wo] - promised_date[wo], 0])
   ```

6. **Dependency chains** (FS precedence between task cards, aggregated to WO level):
   ```python
   model.add(start[successor_wo] >= end[predecessor_wo])
   ```

7. **Bay capacity** (some bays allow 2 small aircraft simultaneously — use cumulative):
   ```python
   for bay in multi_capacity_bays:
       demands = [aircraft_size[wo] for wo in all_wos]
       model.add_cumulative(
           [opt_intervals[wo][bay] for wo in all_wos],
           demands,
           bay_capacity[bay]
       )
   ```

**Objective:**
```python
# Minimize weighted combination of:
# (1) Total lateness (missed promised dates)
# (2) Makespan (finish all work as early as possible)
# (3) AOG penalty (AOG WOs incur very large daily cost if delayed)

total_cost = (
    sum(lateness_penalty[wo] * lateness[wo] for wo in all_wos)
    + alpha * makespan
)
model.minimize(total_cost)
```

**Solving time:** 2-10 seconds for 20-50 WOs / 6-10 bays. Suitable for batch scheduling with a "confirm" UX pattern (user requests optimization, waits up to 10 seconds).

---

### 3.2 Technician Assignment

**Problem:** Assign technicians to task cards for a given day or week, respecting certifications, shifts, hours caps, and skill levels.

**Decision Variables:**
```
assigned[task][tech]  ∈ {0, 1}  # Boolean: tech is assigned to task
start_hour[task]      ∈ [shift_start, shift_end]  # start time within shift
```

**Constraints:**

1. **Each task assigned to exactly one tech:**
   ```python
   model.add_exactly_one(assigned[task][tech] for tech in qualified_techs[task])
   ```

2. **Certification requirement:** Only techs holding required cert can be assigned.
   ```python
   for task in all_tasks:
       for tech in all_techs:
           if required_cert[task] not in tech_certs[tech]:
               model.add(assigned[task][tech] == 0)
   ```

3. **Shift compatibility:** Task must fall within the assigned tech's shift window.
   ```python
   for task in all_tasks:
       for tech in all_techs:
           # Only enforce if assigned
           model.add(start_hour[task] >= shift_start[tech]).only_enforce_if(assigned[task][tech])
           model.add(start_hour[task] + duration[task][tech] <= shift_end[tech]).only_enforce_if(assigned[task][tech])
   ```

4. **Daily hours cap:** No tech exceeds 10 hours in a day.
   ```python
   for tech in all_techs:
       model.add(
           sum(duration[task][tech] * assigned[task][tech] for task in all_tasks)
           <= max_hours_per_day[tech]
       )
   ```

5. **Task dependencies within a tech's day:** If task B depends on task A (FS), and both assigned to same tech, sequence them.
   ```python
   for (a, b) in task_dependencies:
       # end[a] <= start[b] — use interval variables and precedence
       model.add(start_hour[b] >= start_hour[a] + effective_duration[a])
   ```

6. **Inspection holds (QCM gate):** Task after inspection hold must have a QCM-certified tech.
   ```python
   for task in post_inspection_tasks:
       for tech in all_techs:
           if "IA" not in tech_certs[tech] and "QCM" not in tech_certs[tech]:
               model.add(assigned[task][tech] == 0)
   ```

7. **Days off:**
   ```python
   for tech in all_techs:
       if day_of_week in tech.days_off:
           model.add(sum(assigned[task][tech] for task in all_tasks) == 0)
   ```

**Objective:**
```python
# Minimize: overtime hours + uncertified assignments (infeasible = no solution)
# + maximize technician preference satisfaction (nice-to-have)
# + balance load across technicians (Gini coefficient approximation)

overtime = sum(
    max(0, hours_assigned[tech] - standard_hours)
    for tech in all_techs
)
model.minimize(overtime_cost * overtime + lateness_penalty)
```

**Efficiency multiplier integration:** Replace `duration[task][tech]` with `base_duration[task] / efficiency[tech]`. Higher-efficiency techs finish faster, freeing capacity.

**Solving time:** 1-5 seconds for 50 tasks / 20 technicians / 1-day horizon. For weekly planning (250 tasks), 10-30 seconds with parallelism.

---

### 3.3 Maintenance Planning (Fleet-Level)

**Problem:** Schedule recurring maintenance events (100hr, annual, progressive check, AD compliance) across a fleet over a 6-12 month rolling horizon.

**Key Complexity:** Maintenance intervals are expressed in multiple units simultaneously — calendar days, flight hours, and cycles — and the next-due date depends on accumulated actuals, not just wall-clock time.

**Decision Variables:**
```
mx_start[aircraft][event_type][occurrence]  # epoch day when maintenance begins
mx_duration[aircraft][event_type]            # days the aircraft is down
```

**Constraints:**

1. **Interval recurrence:** 100-hour inspection must occur every 100 flight hours ± 10% tolerance.
   ```python
   # If last completed at flight_hours_at_last + 100, next is due at:
   next_due_hours = last_hours + 100
   # Convert to calendar date using projected daily flight rate:
   due_day = current_day + (next_due_hours - current_hours) / daily_flight_rate
   model.add(mx_start[ac][100hr] <= due_day)
   ```

2. **AD compliance deadline:** Hard deadline — aircraft is grounded if not complied.
   ```python
   for ac in fleet:
       for ad in applicable_ads[ac]:
           model.add(mx_start[ac][ad.id] <= ad.compliance_deadline_day)
   ```

3. **One maintenance event per aircraft at a time:**
   ```python
   model.add_no_overlap([mx_intervals[ac] for ac in all_aircraft])  # per aircraft
   ```

4. **Bay resource constraint:**
   ```python
   # Across fleet: no more than N aircraft in maintenance simultaneously
   model.add_cumulative(all_mx_intervals, demands=[1]*n, capacity=num_bays)
   ```

5. **Technician capacity for planning:**
   ```python
   # Each maintenance event requires K tech-hours; total tech capacity is T/day
   model.add_cumulative(all_mx_intervals, tech_demands, total_tech_capacity)
   ```

6. **Progressive check sequencing:** Phase A must precede Phase B; Phase B precedes Phase C.
   ```python
   model.add(end[ac][phase_A] <= start[ac][phase_B])
   ```

**Objective:**
```python
# Minimize: total aircraft downtime cost + grounding penalty (AD violations)
# + overtime premium for tight maintenance windows
# Maximize: aircraft availability during peak revenue periods

total_downtime = sum(mx_duration[ac][event] for ac, event in all_events)
model.minimize(total_downtime_cost * total_downtime + peak_penalty)
```

**Solving time:** 30-120 seconds for a fleet of 20 aircraft / 12-month horizon. Suitable for nightly batch planning with results available next morning.

---

### 3.4 AOG Rescheduling

**Problem:** An AOG aircraft arrives unexpectedly. Find the minimum-disruption rearrangement of the existing confirmed schedule to accommodate it within 4 hours.

**Key Constraint:** This must return a solution in < 2 seconds (pilots and ground crews are waiting).

**Approach — Fix-and-Relax with Hints:**

1. Load current confirmed schedule as CP-SAT hints (warm start).
2. Fix all non-moveable WOs (customer committed, regulatory deadlines within 24h) as hard constraints.
3. Allow a small set of "displaceable" WOs (low-priority, flexible customers) to shift.
4. Minimize total displacement (sum of start time shifts for all displaced WOs) + makespan increase.

```python
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 1.5
solver.parameters.num_workers = 8  # use all cores

# Fix confirmed WOs as hints
for wo in confirmed_wos:
    model.add_hint(start[wo], current_start[wo])
    model.add_hint(bay[wo], current_bay[wo])

# AOG must start immediately in the first available bay
model.add(start[aog_wo] <= 4)  # within 4 hours
model.add(start[aog_wo] >= 0)

# Minimize disruption
displacement = sum(
    abs(start[wo] - current_start[wo])
    for wo in displaceable_wos
)
model.minimize(displacement)
```

**Expected result:** With hints providing a near-feasible starting point, CP-SAT typically finds a high-quality solution within 200-500ms for 20 WOs / 6 bays, and returns `FEASIBLE` (not necessarily `OPTIMAL`) within the 1.5s limit. The OPTIMAL gap is usually < 5% for this problem size.

**Fallback:** If no feasible rearrangement exists (all bays full for 72+ hours), return the earliest available slot with explanation: "Earliest bay available: Bay 3 at T+16h. 2 WOs would need to be delayed."

---

### 3.5 Hangar Bay Optimization (2D Bin Packing)

**Problem:** Assign aircraft to hangar floor positions such that no two aircraft overlap spatially, and the total floor utilization is maximized. This is a 2D rectangle packing problem in the x-axis (floor position) × time axis (occupancy duration).

**Decision Variables:**
```
x_start[ac]      # floor x position (feet from reference point)
x_end[ac]        # x_start + wingspan
t_start[ac]      # entry time
t_end[ac]        # departure time
x_interval[ac]   # interval over floor x-axis
t_interval[ac]   # interval over time axis
```

**Constraints:**

1. **No physical overlap (2D no-overlap):**
   ```python
   model.add_no_overlap_2d(x_intervals, t_intervals)
   # Ensures: for any two aircraft, they either don't overlap in floor space OR don't overlap in time
   ```

2. **Bay boundary:**
   ```python
   for ac in all_aircraft:
       model.add(x_start[ac] >= 0)
       model.add(x_end[ac] <= hangar_width)
   ```

3. **Tooling exclusion zones:** NDT bay requires 10-foot clearance around aircraft:
   ```python
   for ac in ndt_wos:
       model.add(x_start[ac] >= ndt_zone_start)
       model.add(x_end[ac] <= ndt_zone_end)
   ```

4. **Tow path clearance:** A 15-foot center aisle must remain open:
   ```python
   for ac in all_aircraft:
       # Aircraft must be entirely left or entirely right of aisle
       left_of_aisle = model.new_bool_var(f"left_{ac}")
       model.add(x_end[ac] <= aisle_left).only_enforce_if(left_of_aisle)
       model.add(x_start[ac] >= aisle_right).only_enforce_if(left_of_aisle.Not())
   ```

5. **Paint bay isolation:** Paint aircraft cannot share the bay with other aircraft (fumes/contamination):
   ```python
   for paint_ac in paint_wos:
       for other_ac in all_aircraft:
           if other_ac != paint_ac:
               # Overlap in time means they must not share the bay
               model.add(t_end[other_ac] <= t_start[paint_ac]).only_enforce_if(same_bay[other_ac][paint_ac])
   ```

**Objective:**
```python
# Maximize floor utilization = minimize empty floor-time
# Equivalently: minimize time aircraft spend waiting for a floor spot
model.minimize(sum(entry_delay[ac] for ac in all_aircraft))
```

**Solving time:** 5-20 seconds for 10-15 aircraft / single hangar. Interactive drag-and-drop override should use a 500ms time limit and return `FEASIBLE` for UI responsiveness.

---

### 3.6 Hiring and Training Planning

**Problem:** Given projected work order demand for the next 12 months (tech-hours by certification type), and current headcount, determine the minimum hiring scenario that avoids capacity shortfalls while minimizing payroll cost increase.

**Decision Variables:**
```
hire[month][cert_type]   ∈ [0, max_hires]  # integer: new hires per month per cert
train[tech][cert]        ∈ {0, 1}           # Boolean: train existing tech for cert
ready_month[new_tech]    ∈ [hire_month+3, hire_month+6]  # onboarding completion
```

**Constraints:**

1. **Capacity meets demand:**
   ```python
   for month in planning_months:
       for cert in cert_types:
           available_capacity = sum(
               hours_per_month[tech]
               for tech in techs_with_cert[cert]
               if available_in_month[tech][month]
           )
           model.add(available_capacity >= projected_demand[month][cert])
   ```

2. **Hiring ramp-up:** New hires are not productive for 90 days (onboarding).
   ```python
   model.add(ready_month[new_hire] >= hire_month[new_hire] + 3)
   ```

3. **Training prerequisites:** An A&P tech can be trained for IA only if they have 3+ years logged (modeled as a Boolean gate).

4. **Training cost budget:**
   ```python
   model.add(
       sum(training_cost[tech][cert] * train[tech][cert]
           for tech, cert in all_training_options)
       <= training_budget
   )
   ```

5. **Max monthly hiring capacity** (HR constraint):
   ```python
   for month in planning_months:
       model.add(sum(hire[month][cert] for cert in all_certs) <= max_hires_per_month)
   ```

**Objective:**
```python
# Minimize: total new payroll cost + training cost - revenue from filled demand
model.minimize(
    sum(hire_cost[cert] * hire[month][cert]
        for month, cert in all_combinations)
    + sum(training_cost[tech][cert] * train[tech][cert]
          for tech, cert in all_training_options)
)
```

**Sensitivity analysis usage:** Run CP-SAT N times varying `projected_demand[month][cert]` (using Monte Carlo perturbations from the existing scheduling engine) to build a probability distribution of "minimum headcount." This answers "what is the 90th percentile headcount we need to handle projected demand with 90% confidence?"

**Solving time:** 1-10 seconds. This is a strategic planning tool, not real-time.

---

### 3.7 Manpower Planning (Multi-Location Weekly Allocation)

**Problem:** Allocate technicians across multiple shop locations (hangar A, hangar B, field team, customer locations) on a weekly basis. Balance utilization targets (85% = ideal), minimize overtime, minimize travel costs.

**Decision Variables:**
```
location[tech][week]      ∈ {hangar_a, hangar_b, field, customer_site}
overtime_hours[tech][week]  ∈ [0, 20]  # integer hours
```

**Constraints:**

1. **Minimum coverage at each location:**
   ```python
   for location in all_locations:
       for week in planning_weeks:
           model.add(
               sum(location[tech][week] == location
                   for tech in all_techs)
               >= min_coverage[location][week]
           )
   ```

2. **Tech cannot be in two places at once:**
   ```python
   # Already enforced by single-value domain for location[tech][week]
   ```

3. **Certification requirements per location:**
   ```python
   # If a location requires an IA inspector, at least one IA must be assigned
   for loc in locations_requiring_ia:
       for week in planning_weeks:
           model.add(
               sum(1 for tech in techs_assigned_to_loc[loc][week]
                   if "IA" in tech.certs)
               >= 1
           )
   ```

4. **Maximum travel distance:** Field assignments limited to techs within N miles of work site.

5. **Consecutive weeks constraint:** Techs on extended field assignment get a minimum rest rotation back to home base.

**Objective:**
```python
# Minimize: overtime cost + travel cost + deviation from utilization targets
utilization_deviation = sum(
    abs(actual_utilization[tech][week] - target_utilization)
    for tech, week in all_combinations
)
model.minimize(overtime_cost + travel_cost + utilization_deviation_penalty * utilization_deviation)
```

**Solving time:** 10-60 seconds for 30 techs / 4 locations / 4-week horizon.

---

## 4. How It Works — Technical Deep Dive

### The CP-SAT Model Building Process

CP-SAT follows a declarative model → solve → extract pattern:

```python
from ortools.sat.python import cp_model

# 1. Create model
model = cp_model.CpModel()

# 2. Create variables
x = model.new_int_var(0, 100, "x")  # integer variable, domain [0, 100]
y = model.new_int_var(0, 100, "y")
b = model.new_bool_var("b")          # Boolean variable (0 or 1)

# 3. Add constraints
model.add(x + y <= 150)
model.add(x >= 10).only_enforce_if(b)   # conditional constraint
model.add_linear_constraint(x + 2*y, lb=50, ub=100)

# 4. Set objective
model.minimize(x + y)

# 5. Configure solver
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 30.0
solver.parameters.num_workers = 8           # use 8 threads
solver.parameters.log_search_progress = True

# 6. Solve
status = solver.solve(model)

# 7. Extract solution
if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
    print(f"x = {solver.value(x)}, y = {solver.value(y)}")
    print(f"objective = {solver.objective_value}")
    print(f"best bound = {solver.best_objective_bound}")
    print(f"optimality gap = {(solver.objective_value - solver.best_objective_bound) / solver.objective_value:.1%}")
```

### Key Constraint Types for MRO Scheduling

#### NewIntervalVar — The Foundation of Scheduling

```python
# Fixed duration
start = model.new_int_var(0, horizon, "start_wo_1")
end   = model.new_int_var(0, horizon, "end_wo_1")
interval = model.new_interval_var(start, 48, end, "interval_wo_1")
# Automatically enforces: end == start + 48

# Variable duration (e.g., uncertain repair time)
duration = model.new_int_var(24, 72, "duration_wo_1")  # 1-3 days
interval = model.new_interval_var(start, duration, end, "interval_wo_1")
# Enforces: end == start + duration
```

#### NewOptionalIntervalVar — For Assignment Problems

```python
# WO can be assigned to bay 0, 1, or 2
for bay in range(3):
    is_in_bay = model.new_bool_var(f"wo1_in_bay{bay}")
    opt_interval = model.new_optional_interval_var(
        start, duration, end, is_in_bay, f"opt_wo1_bay{bay}"
    )
    # This interval is only "active" (and participates in constraints) if is_in_bay == True
```

#### AddNoOverlap — Disjunctive Scheduling

```python
# Ensure no two WOs occupy the same bay simultaneously
for bay in all_bays:
    bay_intervals = [opt_intervals[wo][bay] for wo in all_wos]
    model.add_no_overlap(bay_intervals)
    # Only active (non-optional) intervals participate
    # Optional intervals with is_present=False are ignored
```

The no-overlap propagator implements edge-finding and not-first/not-last algorithms internally — among the most powerful propagators in constraint programming. It can prune large portions of the search space without branching.

#### AddCumulative — Resource Capacity

```python
# At most 4 technicians working in the hangar at any time
all_intervals = [tech_task_intervals[t][task] for t in techs for task in tasks]
demands = [1] * len(all_intervals)   # each tech uses 1 unit of capacity
capacity = 4
model.add_cumulative(all_intervals, demands, capacity)

# Variable demands (e.g., a task requires 2 techs working simultaneously)
demands = [task_crew_size[task] for task in all_tasks]
model.add_cumulative(task_intervals, demands, hangar_crew_capacity)
```

#### AddElement — Table Lookups for Duration/Cost

```python
# Duration of a task depends on which technician is assigned
tech_durations = [12, 10, 14, 8, 11]  # hours per tech
assigned_tech = model.new_int_var(0, num_techs - 1, "assigned_tech_for_task_1")
task_duration = model.new_int_var(0, max_duration, "duration_task_1")
model.add_element(assigned_tech, tech_durations, task_duration)
# Enforces: task_duration == tech_durations[assigned_tech]
```

#### AddCircuit — Sequencing Tasks in a Bay

```python
# Sequence WOs through a bay, minimizing total travel/setup time between jobs
arcs = []
for i in all_wos_in_bay:
    for j in all_wos_in_bay:
        if i != j:
            lit = model.new_bool_var(f"arc_{i}_{j}")
            arcs.append((i, j, lit))
            # If arc i->j is selected, enforce start[j] >= end[i] + setup_time[i][j]
            model.add(start[j] >= end[i] + setup_time[i][j]).only_enforce_if(lit)
# Add depot arcs (0 = depot)
for i in all_wos_in_bay:
    arcs.append((0, i, model.new_bool_var(f"arc_depot_{i}")))
    arcs.append((i, 0, model.new_bool_var(f"arc_{i}_depot")))
model.add_circuit(arcs)
```

### Modeling MRO-Specific Constraints

#### Inspection Holds (QCM Gate Points)

An inspection hold is a mandatory stop: task A must complete, then a QCM inspector must sign off (with a non-zero duration), and only then can task B begin.

```python
# Model the inspection as a real task with duration
inspection_start = model.new_int_var(0, horizon, "insp_start")
inspection_end   = model.new_int_var(0, horizon, "insp_end")
inspection_interval = model.new_interval_var(inspection_start, insp_duration, inspection_end, "insp")

# Sequencing
model.add(inspection_start >= end[task_A])   # inspection starts after task A
model.add(start[task_B] >= inspection_end)   # task B starts after inspection

# Certification: only QCM/IA-certified techs can perform inspection
for tech in assigned_inspection_tech:
    if "IA" not in tech.certs and "QCM" not in tech.certs:
        model.add(is_assigned_inspection[tech] == 0)
```

#### Parts Availability Windows

Parts have an expected arrival date. Tasks requiring those parts cannot start before parts arrive.

```python
for task in tasks_with_parts_dependency:
    parts_arrival_day = expected_parts_arrival[task]
    model.add(start[task] >= parts_arrival_day)
    # Optional: soft constraint with penalty for each day of parts wait
```

#### Regulatory Sequences (Return-to-Service)

RTS (Return to Service) sign-off is the final mandatory gate: work complete → QCM final inspection → RTS by IA → aircraft released.

```python
# RTS must be the very last activity on a WO
rts_task = [t for t in tasks_in_wo if t.type == "return_to_service"][0]
for other_task in tasks_in_wo:
    if other_task.id != rts_task.id:
        model.add(end[other_task] <= start[rts_task])

# RTS must be performed by an IA certificate holder
for tech in all_techs:
    if "IA" not in tech.certs:
        model.add(assigned[rts_task][tech] == 0)
```

#### AD Compliance Deadlines (Hard Stop)

```python
for aircraft in fleet:
    for ad in aircraft.applicable_ads:
        if ad.compliance_type == "one_time":
            # AD must be complied before compliance_date
            model.add(end[ad_task[aircraft][ad]] <= ad.compliance_date)
        elif ad.compliance_type == "recurring":
            for occurrence in ad_occurrences:
                model.add(end[ad_task[aircraft][ad][occurrence]]
                          <= ad.next_due_date[occurrence])
```

### Solution Callbacks and Intermediate Solutions

For long-running solves (30+ seconds), you can receive intermediate solutions:

```python
class MROScheduleCallback(cp_model.CpSolverSolutionCallback):
    def __init__(self, variables, websocket_queue):
        cp_model.CpSolverSolutionCallback.__init__(self)
        self._variables = variables
        self._queue = websocket_queue
        self._solution_count = 0

    def on_solution_callback(self):
        self._solution_count += 1
        obj = self.objective_value
        bound = self.best_objective_bound
        gap = (obj - bound) / obj if obj > 0 else 0

        # Send partial solution to client via websocket/Convex mutation
        assignments = {
            wo_id: {
                "start": self.value(self._variables[wo_id]["start"]),
                "bay":   self.value(self._variables[wo_id]["bay"]),
                "end":   self.value(self._variables[wo_id]["end"]),
            }
            for wo_id in self._variables
        }
        self._queue.put({
            "type": "partial_solution",
            "solution_number": self._solution_count,
            "objective": obj,
            "gap_percent": gap * 100,
            "assignments": assignments,
        })

callback = MROScheduleCallback(all_vars, update_queue)
solver.solve(model, callback)
```

This enables a real-time "solving in progress" UI with live updates.

### Parallelism and Search Strategies

```python
solver.parameters.num_workers = 8   # Number of parallel search threads
# CP-SAT automatically assigns different strategies to each worker:
# - Worker 0: pure CDCL with default branching
# - Worker 1: LNS (Large Neighborhood Search) on intervals
# - Worker 2: LNS on assignment variables
# - Worker 3: Restart-heavy with random restarts
# - Worker 4-7: Various combinations

# Explicit strategy hints (optional)
solver.parameters.search_branching = cp_model.PORTFOLIO_WITH_QUICK_RESTART
# Options: AUTOMATIC, FIXED_SEARCH, PORTFOLIO, PORTFOLIO_WITH_QUICK_RESTART, LP_SEARCH
```

### Time Limits and Solution Quality

```python
solver.parameters.max_time_in_seconds = 30.0

status = solver.solve(model)
# status can be:
#   cp_model.OPTIMAL    = proven optimal (gap == 0)
#   cp_model.FEASIBLE   = valid solution found, but not proven optimal
#   cp_model.INFEASIBLE = no solution exists (check constraints!)
#   cp_model.UNKNOWN    = time limit hit before any solution found

if status == cp_model.FEASIBLE:
    gap = ((solver.objective_value - solver.best_objective_bound)
           / solver.objective_value)
    print(f"Solution found with {gap:.1%} optimality gap")
    # For MRO scheduling: gap < 5% is usually acceptable for production use
```

**Practical guidance for Athelon time limits:**
- AOG rescheduling: 1.5 seconds (must return something)
- Intraday assignment: 5 seconds (dispatcher is waiting)
- Daily schedule optimization: 30 seconds (batch, confirm UX)
- Weekly manpower planning: 120 seconds (background job)
- Monthly fleet maintenance planning: 300 seconds (overnight batch)

### Python Code Example — Simplified MRO Work Order Scheduling

```python
"""
Simplified Athelon MRO Work Order Scheduler using CP-SAT.

Assigns work orders to hangar bays, respecting:
- One aircraft per bay at a time (no-overlap)
- AOG priority (must start within 4 hours)
- Promised dates (minimize lateness)
"""
import collections
from ortools.sat.python import cp_model

def solve_mro_schedule(work_orders, bays, horizon_hours=336):  # 2-week horizon
    """
    work_orders: list of {id, priority, duration_hours, due_hours, compatible_bays}
    bays:        list of {id, name, type}
    Returns: dict of wo_id -> {bay_id, start_hour, end_hour}
    """
    model = cp_model.CpModel()

    all_wos  = range(len(work_orders))
    all_bays = range(len(bays))

    # --- Variables ---
    starts    = {}  # start[wo] = integer var
    ends      = {}  # end[wo]   = integer var
    intervals = {}  # interval[wo][bay] = optional interval var
    in_bay    = {}  # in_bay[wo][bay]   = bool var

    for wo_idx, wo in enumerate(work_orders):
        dur = wo["duration_hours"]
        starts[wo_idx] = model.new_int_var(0, horizon_hours - dur, f"start_{wo_idx}")
        ends[wo_idx]   = model.new_int_var(dur, horizon_hours,      f"end_{wo_idx}")

        for bay_idx in all_bays:
            is_present = model.new_bool_var(f"in_bay_{wo_idx}_{bay_idx}")
            in_bay[(wo_idx, bay_idx)] = is_present

            opt_interval = model.new_optional_interval_var(
                starts[wo_idx], dur, ends[wo_idx],
                is_present, f"interval_{wo_idx}_{bay_idx}"
            )
            intervals[(wo_idx, bay_idx)] = opt_interval

    # --- Constraints ---

    # 1. Each WO in exactly one bay
    for wo_idx, wo in enumerate(work_orders):
        compatible = [
            in_bay[(wo_idx, bay_idx)]
            for bay_idx in all_bays
            if bays[bay_idx]["id"] in wo.get("compatible_bays", [b["id"] for b in bays])
        ]
        model.add_exactly_one(compatible)
        # Incompatible bays: force out
        for bay_idx in all_bays:
            if bays[bay_idx]["id"] not in wo.get("compatible_bays", [b["id"] for b in bays]):
                model.add(in_bay[(wo_idx, bay_idx)] == 0)

    # 2. No overlap per bay
    for bay_idx in all_bays:
        bay_intervals = [intervals[(wo_idx, bay_idx)] for wo_idx in all_wos]
        model.add_no_overlap(bay_intervals)

    # 3. AOG priority: must start within 4 hours
    for wo_idx, wo in enumerate(work_orders):
        if wo["priority"] == "aog":
            model.add(starts[wo_idx] <= 4)

    # 4. end == start + duration (via interval variable; also add explicit for safety)
    for wo_idx, wo in enumerate(work_orders):
        model.add(ends[wo_idx] == starts[wo_idx] + wo["duration_hours"])

    # --- Objective: minimize weighted lateness ---
    priority_weights = {"aog": 1000, "urgent": 100, "routine": 10, "deferred": 1}
    lateness_vars = []

    for wo_idx, wo in enumerate(work_orders):
        due = wo.get("due_hours", horizon_hours)
        late = model.new_int_var(0, horizon_hours, f"late_{wo_idx}")
        # late = max(0, end - due)
        model.add_max_equality(late, [ends[wo_idx] - due, model.new_constant(0)])
        weight = priority_weights.get(wo["priority"], 10)
        lateness_vars.append(weight * late)

    model.minimize(sum(lateness_vars))

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_workers = 8

    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None  # infeasible or time limit with no solution

    # --- Extract ---
    result = {}
    for wo_idx, wo in enumerate(work_orders):
        assigned_bay = next(
            bay_idx for bay_idx in all_bays
            if solver.value(in_bay[(wo_idx, bay_idx)]) == 1
        )
        result[wo["id"]] = {
            "bay_id":     bays[assigned_bay]["id"],
            "start_hour": solver.value(starts[wo_idx]),
            "end_hour":   solver.value(ends[wo_idx]),
        }

    return result
```

---

## 5. Where to Find It / Dependencies

### Installation

```bash
# Python (recommended for Athelon's microservice)
pip install ortools
# Current version: 9.15.6755 (January 2026)
# Requires Python >= 3.9

# Supports: Windows x64, macOS (Intel + Apple Silicon), Linux x64/ARM64
```

```bash
# For the Node.js/TypeScript environment (NOT recommended for CP-SAT)
# There is no official OR-Tools NPM package that includes CP-SAT.
# The TypeScript scheduling engine must call a Python microservice.
# See Section 6 for the integration architecture.
```

### Key Resources

| Resource | URL |
|---|---|
| Official documentation | https://developers.google.com/optimization |
| Python API reference | https://developers.google.com/optimization/reference/python/sat/python/cp_model |
| Job shop example | https://developers.google.com/optimization/scheduling/job_shop |
| Nurse scheduling example | https://developers.google.com/optimization/scheduling/employee_scheduling |
| GitHub repository | https://github.com/google/or-tools |
| PyPI package | https://pypi.org/project/ortools/ |
| CP-SAT Primer (Krupke) | https://d-krupke.github.io/cpsat-primer/ |
| OR-Tools examples (Python) | https://github.com/google/or-tools/tree/stable/examples/python |
| RCPSP example | https://github.com/google/or-tools/blob/stable/examples/python/rcpsp_sat.py |

### Community Resources

- **Discord:** OR-Tools has an active Discord server for real-time support (linked from GitHub)
- **Stack Overflow:** Tag `google-or-tools` (active, ~2,000 questions)
- **Google Groups:** `or-tools-discuss@googlegroups.com` (lower traffic, more technical)
- **GitHub Discussions:** https://github.com/google/or-tools/discussions

### Alternative CP Solvers

| Solver | Language | License | When to Prefer |
|---|---|---|---|
| **Chuffed** | C++ | MIT | Problems where LCG specifically shines; research use |
| **Gecode** | C++ | MIT | Highly configurable; academic use; older but battle-tested |
| **IBM CP Optimizer** | C++/Python | Commercial | Industrial-grade; fastest for job-shop scheduling at extreme scale (1000+ jobs); free for academic use |
| **MiniZinc** | Declarative | MIT | Model once, solve with any backend (CP-SAT, Gecode, Gurobi); excellent for prototyping |
| **Timefold** | Python/Java | Apache 2.0 | Python bindings available; excellent for shift scheduling with domain-specific constructs; less raw power than CP-SAT for general scheduling |

**Recommendation for Athelon:** Use CP-SAT. It is the most actively developed open-source CP solver, has excellent Python support, handles all the required MRO constraint types natively, and is free (Apache 2.0). The only reason to switch to IBM CP Optimizer would be if solving time becomes unacceptable at enterprise scale (500+ simultaneous WOs), which is unlikely for a regional MRO.

---

## 6. Integration Architecture for Athelon

### Overview

CP-SAT is a Python library. Athelon's backend is TypeScript/Convex. The integration requires a **Python microservice** that accepts scheduling problems as JSON over HTTP and returns optimized schedules.

```
Convex Action (TypeScript)
    │
    │ HTTP POST (JSON: problem spec)
    ▼
CP-SAT Microservice (Python, Cloud Run)
    │
    │ Builds CP-SAT model
    │ Solves (2-120 seconds)
    │
    │ HTTP 200 (JSON: solution + metrics)
    ▼
Convex Action (TypeScript)
    │
    │ ctx.runMutation → persist assignments
    ▼
Convex DB (assignments table)
```

### Microservice Architecture (Python / Cloud Run)

```python
# service.py — FastAPI microservice for CP-SAT scheduling
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import asyncio
import uuid
from solver import solve_work_order_schedule, solve_technician_assignment, solve_aog_rescheduling

app = FastAPI()

# --- Request/Response Models ---

class WorkOrder(BaseModel):
    id: str
    priority: str           # "aog" | "urgent" | "routine" | "deferred"
    duration_hours: int
    due_epoch_ms: int
    compatible_bay_ids: list[str]
    dependency_predecessors: list[str]   # WO IDs that must complete first
    required_certifications: list[str]

class HangarBay(BaseModel):
    id: str
    name: str
    type: str               # "hangar" | "ramp" | "paint" | "ndt"
    capacity: int

class ScheduleRequest(BaseModel):
    problem_type: str       # "work_order_schedule" | "technician_assignment" | "aog_reschedule"
    work_orders: list[WorkOrder]
    bays: list[HangarBay]
    horizon_hours: int = 336    # 2-week default
    time_limit_seconds: float = 30.0
    existing_schedule: Optional[dict] = None   # for AOG warm-start

class AssignedWorkOrder(BaseModel):
    work_order_id: str
    bay_id: str
    start_epoch_ms: int
    end_epoch_ms: int

class ScheduleResponse(BaseModel):
    status: str             # "optimal" | "feasible" | "infeasible" | "timeout_no_solution"
    assignments: list[AssignedWorkOrder]
    objective_value: float
    optimality_gap_percent: float
    solve_time_seconds: float
    warnings: list[str]     # e.g., "2 WOs could not be scheduled within promised dates"
    solution_id: str

# --- Synchronous endpoint (for < 5 second problems) ---

@app.post("/schedule/sync", response_model=ScheduleResponse)
async def schedule_sync(req: ScheduleRequest):
    if req.time_limit_seconds > 10:
        raise HTTPException(400, "Use /schedule/async for time limits > 10s")
    result = solve_work_order_schedule(req)
    return result

# --- Async endpoint (for long-running problems) ---

job_results = {}  # In production: use Redis or Convex itself

@app.post("/schedule/async")
async def schedule_async(req: ScheduleRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_and_store, job_id, req)
    return {"job_id": job_id, "status": "queued"}

@app.get("/schedule/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in job_results:
        return {"status": "pending"}
    return job_results[job_id]

async def run_and_store(job_id: str, req: ScheduleRequest):
    result = solve_work_order_schedule(req)
    job_results[job_id] = result
```

### JSON API Contract

**Request (work order scheduling):**
```json
{
  "problem_type": "work_order_schedule",
  "horizon_hours": 336,
  "time_limit_seconds": 30,
  "work_orders": [
    {
      "id": "wo_abc123",
      "priority": "aog",
      "duration_hours": 16,
      "due_epoch_ms": 1741824000000,
      "compatible_bay_ids": ["bay_1", "bay_2", "bay_3"],
      "dependency_predecessors": [],
      "required_certifications": ["AP", "IA"]
    },
    {
      "id": "wo_def456",
      "priority": "routine",
      "duration_hours": 48,
      "due_epoch_ms": 1742256000000,
      "compatible_bay_ids": ["bay_1", "bay_3"],
      "dependency_predecessors": [],
      "required_certifications": ["AP"]
    }
  ],
  "bays": [
    { "id": "bay_1", "name": "Bay 1", "type": "hangar", "capacity": 1 },
    { "id": "bay_2", "name": "Bay 2 - Wide Body", "type": "hangar", "capacity": 1 },
    { "id": "bay_3", "name": "NDT Bay", "type": "ndt", "capacity": 1 }
  ]
}
```

**Response:**
```json
{
  "status": "feasible",
  "assignments": [
    {
      "work_order_id": "wo_abc123",
      "bay_id": "bay_2",
      "start_epoch_ms": 1741737600000,
      "end_epoch_ms": 1741795200000
    },
    {
      "work_order_id": "wo_def456",
      "bay_id": "bay_1",
      "start_epoch_ms": 1741824000000,
      "end_epoch_ms": 1741996800000
    }
  ],
  "objective_value": 0.0,
  "optimality_gap_percent": 3.2,
  "solve_time_seconds": 4.7,
  "warnings": [],
  "solution_id": "sol_xyz789"
}
```

### Convex Action Integration

```typescript
// convex/actions/optimizeSchedule.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const optimizeWorkOrderSchedule = action({
  args: {
    organizationId: v.id("organizations"),
    workOrderIds: v.array(v.id("workOrders")),
    horizonDays: v.optional(v.number()),
    timeLimitSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all necessary data from Convex
    const [workOrders, bays, technicians] = await Promise.all([
      ctx.runQuery(api.workOrders.getSchedulingData, {
        organizationId: args.organizationId,
        workOrderIds: args.workOrderIds,
      }),
      ctx.runQuery(api.hangarBays.listForOrg, {
        organizationId: args.organizationId,
      }),
      ctx.runQuery(api.technicians.listForScheduling, {
        organizationId: args.organizationId,
      }),
    ]);

    // 2. Serialize to solver input format
    const now = Date.now();
    const horizonHours = (args.horizonDays ?? 14) * 24;
    const msPerHour = 3_600_000;

    const solverRequest = {
      problem_type: "work_order_schedule",
      horizon_hours: horizonHours,
      time_limit_seconds: args.timeLimitSeconds ?? 30,
      work_orders: workOrders.map((wo) => ({
        id: wo._id,
        priority: wo.priority,
        duration_hours: Math.ceil((wo.estimatedHours ?? 24)),
        due_epoch_ms: wo.promisedDate ?? now + horizonHours * msPerHour,
        compatible_bay_ids: bays
          .filter((b) => isCompatible(wo, b))
          .map((b) => b._id),
        dependency_predecessors: wo.dependsOn ?? [],
        required_certifications: wo.requiredCertifications ?? [],
      })),
      bays: bays.map((bay) => ({
        id: bay._id,
        name: bay.name,
        type: bay.type,
        capacity: bay.capacity ?? 1,
      })),
    };

    // 3. Call the CP-SAT microservice
    const serviceUrl = process.env.CPSAT_SERVICE_URL ?? "https://cpsat.internal.athelon.app";

    let response: Response;
    try {
      response = await fetch(`${serviceUrl}/schedule/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(solverRequest),
        // Note: Convex actions have a 10-minute timeout; the microservice will return
        // within its own time limit regardless
      });
    } catch (err) {
      throw new Error(`CP-SAT microservice unreachable: ${err}`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`CP-SAT microservice error ${response.status}: ${body}`);
    }

    const solution = await response.json();

    // 4. Persist results via mutation
    if (solution.status === "infeasible") {
      return {
        success: false,
        status: "infeasible",
        message: "No feasible schedule exists. Check bay compatibility and promised dates.",
        warnings: solution.warnings,
      };
    }

    await ctx.runMutation(api.schedule.applyOptimizedSchedule, {
      organizationId: args.organizationId,
      solutionId: solution.solution_id,
      assignments: solution.assignments.map((a: any) => ({
        workOrderId: a.work_order_id,
        hangarBayId: a.bay_id,
        startDate: a.start_epoch_ms,
        endDate: a.end_epoch_ms,
      })),
      metadata: {
        objectiveValue: solution.objective_value,
        optimalityGapPercent: solution.optimality_gap_percent,
        solveTimeSeconds: solution.solve_time_seconds,
        optimizedAt: Date.now(),
      },
    });

    return {
      success: true,
      status: solution.status,
      assignmentCount: solution.assignments.length,
      optimalityGapPercent: solution.optimality_gap_percent,
      solveTimeSeconds: solution.solve_time_seconds,
      warnings: solution.warnings,
    };
  },
});

function isCompatible(wo: any, bay: any): boolean {
  if (bay.type === "paint" && wo.workType !== "paint") return false;
  if (bay.type === "ndt" && !wo.requiresNDT) return false;
  if (wo.aircraftCategory === "wide_body" && bay.maxWingspan < 100) return false;
  return true;
}
```

### Where This Fits in the Existing Codebase

The CP-SAT microservice augments (does not replace) the existing TypeScript scheduling engine:

```
apps/athelon-app/src/shared/lib/
  scheduling-engine/
    index.ts                    # existing barrel export (CPM, EVM, WBS, resource leveling)
    types.ts                    # existing types (ScheduledWorkOrder, TechnicianResource, etc.)
    cascade-scheduler.ts        # existing greedy cascade
    critical-path.ts            # existing CPM
    resource-leveling.ts        # existing resource leveling
    earned-value.ts             # existing EVM
    wbs.ts                      # existing WBS
    cp-sat-client.ts            # NEW: TypeScript client for CP-SAT microservice
    cp-sat-types.ts             # NEW: TypeScript types for solver API contract

convex/
  actions/
    optimizeSchedule.ts         # NEW: Convex action that calls CP-SAT microservice
  mutations/
    applyOptimizedSchedule.ts   # NEW: persists CP-SAT results to DB

apps/
  cpsat-service/                # NEW: Python microservice (separate Dockerfile)
    service.py                  # FastAPI entry point
    solver.py                   # CP-SAT model builders
    models.py                   # Pydantic request/response models
    requirements.txt            # ortools>=9.15, fastapi, uvicorn, pydantic
    Dockerfile
```

### Incremental Solving (Warm Start)

To warm-start from an existing schedule (especially important for AOG rescheduling):

```python
def solve_with_warm_start(model, variables, existing_schedule):
    """
    Provide hints from the existing schedule.
    CP-SAT will explore near this solution first, dramatically
    reducing time-to-first-feasible-solution.
    """
    for wo_id, assignment in existing_schedule.items():
        if wo_id in variables:
            model.add_hint(variables[wo_id]["start"], assignment["start_hour"])
            model.add_hint(variables[wo_id]["bay"],   assignment["bay_idx"])
    # CP-SAT uses these as the starting point for LNS and initial branching
    # but is not constrained to stay close — it will move away if needed
```

For the AOG case where we want to minimize disruption, combine warm-start hints with a displacement objective. The hints guide the solver to start near the current schedule; the displacement objective ensures it moves as little as possible to accommodate the AOG.

### Real-Time vs. Batch Solve Classification

| Use Case | Max Response Time | Strategy | Solver Endpoint |
|---|---|---|---|
| AOG rescheduling | 1.5 seconds | Warm-start + fix 80% + LNS | `/schedule/sync` with `time_limit=1.5` |
| Intraday tech assignment | 5 seconds | Full model, 8 workers | `/schedule/sync` with `time_limit=5` |
| Daily bay scheduling | 30 seconds | Full model, intermediate solutions | `/schedule/sync` with `time_limit=30` |
| Weekly manpower planning | 2 minutes | Full model, async with progress callback | `/schedule/async` |
| Monthly fleet maintenance | 5 minutes | Full model, overnight batch | `/schedule/async` |
| Hiring/training scenarios | 10-60 seconds per scenario | Monte Carlo batch | `/schedule/async` batch endpoint |

---

## 7. Interactions with Other Optimization Tools

### 7.1 CP-SAT vs. LP/MIP

**Use CP-SAT when:**
- The problem has disjunctive constraints (one aircraft per bay, one tech per task)
- The objective is non-linear or involves max/min expressions
- You need logical constraints (if X then Y, not both A and B)
- The problem has many "assignment" decisions

**Use MIP (e.g., Gurobi, GLOP, CP-SAT's own linear subsystem) when:**
- The problem is primarily cost minimization with linear constraints
- You need tight LP relaxation bounds for large problems
- The problem has mostly continuous variables with some integer decisions
- Hiring/financial planning (linear capacities, linear costs)

**For Athelon:** Day-to-day scheduling → CP-SAT. Financial modeling (pricing, margin analysis, budget allocation) → LP/MIP or CP-SAT's linear constraints.

Note that CP-SAT internally uses an LP relaxation (via the PDLP solver) for dual bounds, so the distinction is less sharp in practice. For moderate-size problems, CP-SAT's LP integration often matches dedicated MIP solvers.

### 7.2 CP-SAT + Bin Packing

CP-SAT solves 1D bin packing natively via cumulative constraints. For 2D bin packing (hangar floor placement), use `AddNoOverlap2D`. There is no need for a separate bin-packing solver.

For Athelon's hangar bay optimization (Section 3.5), CP-SAT handles the full 2D layout problem directly. The existing TypeScript `magicSchedule.ts` (which assigns WOs to bays greedily) can be replaced with CP-SAT calls for the optimization phase, while keeping the greedy fallback for cases when the microservice is unavailable.

### 7.3 CP-SAT + CPM (Critical Path Method)

The existing `critical-path.ts` computes CPM results: critical path, float values, early/late start times. These feed directly into CP-SAT as:

1. **Constraint hints:** Tasks on the critical path have zero float → their CP-SAT start variables can be tightly bounded (early_start <= x <= late_start where late_start = early_start + float = early_start).

2. **Priority hints:** Use CPM float as a branching hint — branch on tasks with smallest float first (they're most constrained). This improves CP-SAT's variable selection heuristic.

3. **Dependency constraints:** CPM computes the full FS/FF/SS/SF dependency network, which becomes the precedence constraints in CP-SAT directly.

```python
# Feed CPM results into CP-SAT
for task_id, cpm_result in critical_path_results.items():
    # Tight bound for critical tasks
    if cpm_result.total_float == 0:
        model.add(start[task_id] == cpm_result.early_start)
    else:
        # Bounded by CPM float
        model.add(start[task_id] >= cpm_result.early_start)
        model.add(start[task_id] <= cpm_result.late_start)

    # Hint from CPM
    model.add_hint(start[task_id], cpm_result.early_start)
```

### 7.4 CP-SAT + EVM (Earned Value Management)

The existing `earned-value.ts` computes CPI (Cost Performance Index) and SPI (Schedule Performance Index) per work order. These integrate with CP-SAT in two ways:

1. **Adjusted priority weights in objective:** WOs with CPI < 0.9 (over budget) get higher urgency weight in the scheduling objective — finish them faster to avoid further cost escalation.

2. **Duration adjustments:** If a WO has SPI < 1.0 (behind schedule), its remaining duration estimate in CP-SAT should be inflated: `adjusted_duration = base_duration / spi`. This prevents CP-SAT from scheduling optimistically with unrealistic completion times.

```python
for wo_idx, wo in enumerate(work_orders):
    cpi = evm_results[wo.id].cost_performance_index
    spi = evm_results[wo.id].schedule_performance_index

    # Inflate duration if behind schedule
    adjusted_duration = int(wo.remaining_hours / max(spi, 0.5))

    # Increase lateness penalty for over-budget WOs
    lateness_weight = base_weight * (2.0 if cpi < 0.9 else 1.0)

    # Apply to model
    interval = model.new_interval_var(start[wo_idx], adjusted_duration, end[wo_idx], ...)
    late_penalty = lateness_weight * lateness_var[wo_idx]
```

### 7.5 CP-SAT + Metaheuristics

**Pattern 1: Metaheuristic → CP-SAT warm start**
Run a fast metaheuristic (simulated annealing, genetic algorithm) to get a good initial solution in < 1 second, then pass it as CP-SAT hints. CP-SAT uses this as the starting point and either proves it optimal or improves it with guarantee.

**Pattern 2: CP-SAT → metaheuristic refinement**
Get a feasible CP-SAT solution quickly, then use LNS (which CP-SAT does internally) or an external metaheuristic to improve it. The internal LNS in CP-SAT is usually superior to external metaheuristics for scheduling.

**Pattern 3: Decomposition**
For very large problems (500+ tasks), decompose with a metaheuristic (assign WOs to bays coarsely) then use CP-SAT within each bay to optimize the detailed sequence. This divide-and-conquer approach makes the problem tractable.

For Athelon: the existing `magicSchedule.ts` greedy algorithm can serve as Pattern 1 — convert its output to CP-SAT hints for warm-starting the AOG rescheduling solver. This is explicitly the recommended architecture for the sub-2-second AOG use case.

### 7.6 CP-SAT + Monte Carlo Simulation

The Monte Carlo engine (or a simple perturbation approach) interacts with CP-SAT for two purposes:

**1. Probabilistic schedule robustness:**
Run CP-SAT N=50-200 times with task durations sampled from distributions (e.g., repair time ~ triangular(min, mode, max)). For each run, record whether the promised date was met. Output: "This schedule has an 87% probability of meeting all promised dates."

```python
import random
results = []
for trial in range(100):
    perturbed_durations = {
        wo_id: int(random.triangular(
            wo.min_duration, wo.mode_duration, wo.max_duration
        ))
        for wo_id, wo in work_orders.items()
    }
    solution = solve_mro_schedule(work_orders, bays, durations=perturbed_durations,
                                   time_limit=5.0)
    results.append(solution)

# Analyze: for each WO, what % of trials met the promised date?
on_time_rate = {
    wo_id: sum(1 for r in results if r[wo_id]["end"] <= promised_date[wo_id]) / len(results)
    for wo_id in work_orders
}
```

**2. Hiring/capacity planning under demand uncertainty:**
As described in Section 3.6, run CP-SAT for each Monte Carlo draw of projected demand. Build a distribution of "minimum headcount required." Report the 75th percentile as the planning recommendation.

This Monte Carlo + CP-SAT combination transforms static "what is the optimal schedule?" into "what is the distribution of outcomes?" — substantially more valuable for an MRO operator managing AOG risk.

---

## Summary Table

| Use Case | CP-SAT Model Type | Time Limit | Convex Integration |
|---|---|---|---|
| Work order bay assignment | No-overlap per bay, optional intervals | 30s | Action → sync endpoint → mutation |
| AOG rescheduling | Warm-start + fix/relax | 1.5s | Action → sync endpoint → mutation |
| Technician assignment | Boolean assignment + cumulative hours | 5s | Action → sync endpoint → mutation |
| 2D hangar bay layout | NoOverlap2D (x × time) | 20s | Action → sync endpoint → mutation |
| Fleet maintenance planning | Cumulative, precedence, hard deadlines | 120s | Action → async endpoint → polling mutation |
| Weekly manpower allocation | Boolean assignment, coverage constraints | 60s | Action → async endpoint → polling mutation |
| Hiring/training scenarios | Integer hiring + Boolean training | 30s per scenario | Action → async batch → mutation |
| Monte Carlo robustness | CP-SAT × N runs with perturbed durations | 5s × N | Background action → aggregate mutation |

---

*Document: `01-constraint-programming-cp-sat.md`*
*Located: `apps/athelon-app/docs/ops/scheduling-research/optimization-tools/`*
*Status: Research complete. Ready for implementation planning.*
