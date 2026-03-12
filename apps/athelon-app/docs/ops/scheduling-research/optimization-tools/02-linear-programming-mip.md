# Linear Programming & Mixed-Integer Programming for Athelon

> Research document — 2026-03-12. Deep technical reference for LP/MIP integration into Athelon MRO SaaS. Covers mathematical foundations, Athelon-specific use cases with formal formulations, solver ecosystem, integration architecture, and interaction with other optimization tools.

---

## Table of Contents

1. [What LP/MIP Is](#1-what-lpmip-is)
2. [General Use Cases](#2-general-use-cases)
3. [Athelon-Specific Use Cases](#3-athelon-specific-use-cases)
4. [How It Works — Technical Deep Dive](#4-how-it-works--technical-deep-dive)
5. [Where to Find It — Solver Ecosystem](#5-where-to-find-it--solver-ecosystem)
6. [Integration Architecture for Athelon](#6-integration-architecture-for-athelon)
7. [Interactions with Other Optimization Tools](#7-interactions-with-other-optimization-tools)

---

## 1. What LP/MIP Is

### 1.1 Linear Programming — Formal Definition

A **Linear Program (LP)** is an optimization problem of the form:

```
Minimize (or Maximize):   c^T x
Subject to:               A x  ≤ b   (inequality constraints)
                          A_eq x = b_eq  (equality constraints)
                          l ≤ x ≤ u     (variable bounds)
```

Where:
- **x ∈ ℝⁿ** — the decision variable vector (continuous)
- **c ∈ ℝⁿ** — the objective coefficient vector ("cost per unit of each variable")
- **A ∈ ℝᵐˣⁿ** — the constraint matrix
- **b ∈ ℝᵐ** — the right-hand-side vector (resource limits)

**Feasible region:** The set of all x satisfying all constraints simultaneously. For an LP with n variables and m constraints, the feasible region is a convex polytope (a many-faceted geometric solid in n-dimensional space).

**Optimal solution:** A point on the boundary of the feasible region — specifically a vertex (corner point) — that minimizes or maximizes the objective function. The fundamental theorem of LP guarantees that if an optimal solution exists, it lies at a vertex of the feasible region.

**What makes it "linear":** Every constraint and the objective function must be a linear combination of variables. No `x²`, no `x * y`, no `abs(x)`. The constraint `2x₁ + 3x₂ ≤ 100` is linear. The constraint `x₁ * x₂ ≤ 100` is not (that's a nonlinear program).

This linearity is both a restriction and a superpower: it enables solvers to solve problems with millions of variables in seconds by exploiting the convex geometry.

### 1.2 Solving LPs — Simplex and Interior Point Methods

**The Simplex Method** (Dantzig, 1947):

The simplex method exploits the fundamental theorem by searching only over the vertices of the feasible polytope. Algorithm sketch:

1. Find an initial feasible vertex (basic feasible solution)
2. Check all neighboring vertices — is any of them better?
3. If yes: move to the best neighboring vertex. Repeat.
4. If no: you're at the optimal — stop.

Each "move" is a pivot operation: one variable enters the basis (becomes nonzero) and one leaves. In practice, simplex terminates in O(m) pivots for most real-world problems even though the worst-case is exponential. The **dual simplex** variant starts from an infeasible-but-optimal-objective point and pivots toward feasibility — extremely effective when solving sequences of related problems (e.g., re-optimizing after adding one constraint).

**Interior Point Methods** (Karmarkar, 1984):

Instead of walking along edges of the polytope, interior point methods traverse the interior, following a curved path from the initial point to the optimal vertex. They have polynomial-time complexity guarantees, which the simplex method lacks. In practice:

- Interior point methods dominate for very large LPs (millions of variables/constraints)
- Simplex dominates for sequences of similar problems (warm starting) and moderate-sized problems
- Most production solvers run both in parallel and use whichever finishes first

**PDLP (Primal-Dual LP)** (Google, 2021): A first-order method using projected gradient steps. Trades some precision for the ability to scale to LP problems with hundreds of millions of variables — relevant for large fleet-wide planning but not for shop-level Athelon problems.

### 1.3 Mixed-Integer Programming (MIP)

A **Mixed-Integer Program (MIP)** adds integrality constraints to some or all variables:

```
Minimize:   c^T x + d^T y
Subject to: A x + B y ≤ b
            x ∈ ℝⁿ    (continuous variables)
            y ∈ {0,1}^k or ℤ^k   (binary or general integer variables)
```

**Why this matters for scheduling:** The question "Is tech Alice assigned to WO #42 on Tuesday?" is binary — either yes (1) or no (0). You cannot assign half a technician. The moment you require integer solutions, the problem becomes NP-hard in general, but structured MIP models can be solved near-optimally in practical time.

**Special cases:**
- **Binary Integer Program (BIP):** All integer variables are 0/1. Most scheduling MIPs are BIPs.
- **Pure Integer Program:** All variables are integers.
- **MIP:** Mix of continuous and integer.

### 1.4 Branch-and-Bound

The workhorse algorithm for MIP solving. Core idea: solve the LP relaxation first, then systematically fix integer variables and re-solve.

**Algorithm:**

1. **Solve LP relaxation** — ignore integrality, solve as a pure LP. This gives the best possible objective value (a lower bound for minimization).
2. **Check integrality:** If all integer variables happen to be integers: done. If not:
3. **Branch:** Pick a fractional variable (e.g., `y₃ = 0.7`). Create two subproblems:
   - Left branch: add constraint `y₃ ≤ 0` (round down)
   - Right branch: add constraint `y₃ ≥ 1` (round up)
4. **Bound:** Solve each subproblem's LP relaxation. If a subproblem's bound is worse than the best integer solution found so far, prune that branch — no need to explore further.
5. **Recurse** until all branches are either pruned or yield integer solutions.

The tree of subproblems is the **branch-and-bound tree**. Finding good integer solutions early (via heuristics) is critical for aggressive pruning.

### 1.5 Cutting Planes and Branch-and-Cut

**Cutting planes** are additional constraints that cut off fractional LP-relaxation solutions without removing any integer-feasible points. They tighten the LP relaxation bound, reducing the branch-and-bound tree size dramatically.

**Gomory cuts** (1958): The original cutting-plane method. Generate cuts from the LP tableau by rounding fractional rows.

**Chvátal-Gomory cuts:** Stronger cuts from the structure of the constraint matrix.

**Problem-specific cuts** for scheduling:
- **Clique cuts:** If variables x₁ + x₂ + x₃ ≤ 1 must hold (at most one tech per slot), and the LP gives x₁ = 0.5, x₂ = 0.5, x₃ = 0.4 — this LP solution is infeasible even though no single variable violates a bound. The cut eliminates it.
- **Cover cuts:** For knapsack-style constraints.

**Branch-and-Cut** (the modern standard): Interleave cutting plane generation with branching. At each node of the B&B tree, first try to add cuts to tighten the relaxation before branching. This is what Gurobi, CPLEX, SCIP, and HiGHS all implement.

### 1.6 The LP Relaxation and Why It Matters

The LP relaxation of a MIP is obtained by dropping all integrality constraints and solving as a pure LP. It provides:

1. **A lower bound** (for minimization): The LP relaxation optimal is always ≤ the MIP optimal. No integer-feasible solution can be cheaper than the LP relaxation says.

2. **An optimality certificate:** When you find an integer solution whose value equals the LP relaxation bound, you've proven optimality — no need to search further.

3. **The integrality gap:** `(MIP optimal - LP relaxation optimal) / LP relaxation optimal`. A small gap means the LP relaxation is tight and B&B will be fast. A large gap means the problem is hard.

4. **Warm-starting CP-SAT or metaheuristics:** The LP relaxation often gives a near-integer solution that can be rounded into a good starting point for other solvers.

**For Athelon:** The LP relaxation of a tech assignment MIP tells you: "In the ideal continuous world where you can assign 0.7 of a tech, the minimum cost is $X." The gap between that and the best integer schedule tells you how close to optimal your schedule is.

### 1.7 Duality Theory — Shadow Prices

Every LP has a **dual problem**. For a minimization LP `min c^T x, Ax ≥ b`, the dual is `max b^T y, A^T y ≤ c, y ≥ 0`.

The dual variables `y` are called **shadow prices** (or dual prices). They encode the marginal value of each constraint's right-hand side:

> Shadow price of constraint `i` = how much the optimal objective value improves if you increase the RHS of constraint `i` by one unit

**Practical meaning for Athelon:**

| Constraint | Shadow Price Interpretation |
|---|---|
| `total_tech_hours ≤ 320 hrs/week` | "Adding 1 more available labor-hour reduces our optimal cost by $Y" |
| `bay_capacity ≤ 5 aircraft` | "Opening one more hangar bay reduces schedule cost by $Z" |
| `overtime_budget ≤ $5000` | "Increasing overtime budget by $1 reduces total cost by $W" |
| `max_wos_per_tech ≤ 2` | "Allowing each tech to handle 3 WOs reduces cost by $V" |

Shadow prices directly answer management questions: "Should we hire another A&P tech?" Compute the shadow price on the tech-hours constraint. If it's $85/hour and an A&P costs $55/hour fully loaded, the answer is yes.

**Complementary slackness:** If a constraint is not binding (there's slack — the constraint isn't tight at the optimum), its shadow price is 0. You can't improve the objective by relaxing a non-binding constraint. This tells you which bottlenecks actually matter.

---

## 2. General Use Cases

### 2.1 Production Planning and Scheduling

Classic LP: a factory makes `n` products, each consuming resources (labor hours, machine time, raw materials) at known rates. Maximize revenue subject to resource limits. The LP tells you the optimal product mix.

Classic MIP scheduling: `n` jobs, `m` machines. Job `j` requires processing on machine `m_j` for `p_j` periods. Binary variable `x[j,t]` = 1 if job `j` starts at time `t`. Minimize makespan (or tardiness). This is the job-shop scheduling problem — the canonical MIP scheduling formulation.

### 2.2 Supply Chain Optimization

Multi-echelon inventory optimization: LP for continuous replenishment decisions, MIP for discrete lot sizing (Economic Order Quantity becomes a MIP when setup costs are included). Network flow LPs determine optimal routing through a supply chain.

### 2.3 Workforce Scheduling and Shift Optimization

The **Nurse Scheduling Problem** (NSP) is the canonical workforce MIP. Binary variable `x[nurse, day, shift]` = 1 if nurse is on that shift. Constraints: minimum staffing levels, maximum consecutive days, certification requirements. Objective: minimize total cost (or maximize preference satisfaction).

Airlines use variants for crew pairing (which trips does each crew work?) and crew rostering (which pairings get assigned to which crew members over a month). Both are large-scale BIPs.

### 2.4 Portfolio Optimization

Markowitz mean-variance optimization is a QP (quadratic program, closely related to LP). The LP version: given return estimates and risk limits, maximize expected return. Integer variables appear when you add cardinality constraints ("invest in at most 20 stocks") or minimum position sizes.

### 2.5 Transportation and Logistics

The **Transportation Problem** is a pure LP: minimize shipping cost from `m` suppliers to `n` customers, subject to supply and demand constraints. Integer variables appear for vehicle routing (which vehicles take which routes?). Amazon's warehouse order picking optimization is a large-scale MIP combining bin assignment, picking routes, and packing.

### 2.6 Blending Problems

A refinery blends crude oils with different properties to produce products meeting specifications (octane, viscosity, sulfur content). Each specification is a linear constraint on blend fractions. Objective: minimize raw material cost. This is one of the oldest industrial LP applications (oil industry LP use predates Dantzig by a few years).

### 2.7 Network Flow Optimization

Minimum cost flow: given a directed graph with arc capacities and costs, send a specified flow from source to sink at minimum cost. LP formulations have totally unimodular constraint matrices — their LP relaxations always have integer optimal solutions without needing branch-and-bound. Power grid dispatch (unit commitment + economic dispatch) is a large-scale MIP that utilities solve every 5-15 minutes.

### 2.8 Real-World Examples

**Airline Revenue Management:** LP-based bid-price controls allocate capacity across origin-destination pairs. American Airlines estimated $1.4B/year in revenue uplift from their DINAMO LP system when it launched.

**Airline Crew Scheduling:** Crew pairing (cover all flights with minimum cost crew pairings) is a set-covering MIP with millions of columns, solved via column generation (LP with dynamic constraint generation). Solved daily by every major airline.

**Power Grid Dispatch:** ISO/RTO operators solve unit commitment MIPs (which generators to turn on?) every 5 minutes across thousands of generators with binary startup/shutdown variables.

**Amazon Warehouse Fulfillment:** Bin packing, order batching, and pick-path optimization are all MIP variants. Amazon's fulfillment optimization team publishes extensively on large-scale LP/MIP applications.

**Airline MRO (Air France Industries):** Published research on LP-based hangar scheduling for A320/A330 heavy maintenance. Decision variables: which aircraft enters which dock on which day. Constraints: dock capacity, hangar entry compatibility, crew availability, parts lead times. Objective: minimize total ground time. Reduces average out-of-service time by 8-12%.

---

## 3. Athelon-Specific Use Cases

### 3.1 Cost-Optimal Work Order Scheduling

**Problem:** Given `n` work orders and `m` technicians over `T` days, find the assignment that minimizes total labor cost (regular + overtime) while ensuring all WOs are completed by their due dates.

**Decision variables:**

```
x[i,j,t] ∈ {0,1}:  1 if technician i works on work order j on day t
h[i,t] ≥ 0:         overtime hours for technician i on day t
```

**Parameters:**

```
w[i]:     regular hourly wage for technician i (from planningFinancialSettings.defaultLaborCostRate)
w_ot[i]:  overtime rate = 1.5 * w[i]
H_reg:    regular hours per shift (e.g., 8.5 from technicianShifts.endHour - startHour)
r[j]:     total labor hours required for work order j (workOrders.estimatedHours)
d[j]:     due date for work order j (day index from workOrders.estimatedCompletionDate)
cap[i,t]: capacity indicator: 1 if tech i is available on day t (from technicianShifts)
cert[i,j]: 1 if tech i has required certifications for WO j (from technicians + taskCards)
```

**Objective — minimize total labor cost:**

```
Minimize: Σᵢ Σₜ [ w[i] * H_reg * Σⱼ x[i,j,t] + w_ot[i] * h[i,t] ]
```

**Constraints:**

```
(1) Due date feasibility:
    Σₜ≤d[j] Σᵢ cert[i,j] * x[i,j,t] * H_reg ≥ r[j]   for all j
    (WO j must accumulate required labor hours by its due date)

(2) Tech daily capacity:
    Σⱼ x[i,j,t] * H_reg ≤ H_reg + h[i,t]              for all i, t
    (hours worked = regular + overtime)

(3) Single bay occupancy — one WO per bay per day:
    Σⱼ_{using_bay_b} x[i,j,t] ≤ 1                      for all bays b, days t
    (simplified; bay constraint handled by separate hangarBay assignment)

(4) Certification requirement:
    x[i,j,t] ≤ cert[i,j]                                for all i, j, t

(5) Tech availability:
    x[i,j,t] ≤ cap[i,t]                                 for all i, j, t

(6) Overtime non-negativity and cap:
    0 ≤ h[i,t] ≤ H_max_ot                               for all i, t

(7) Binary integrality:
    x[i,j,t] ∈ {0,1}
```

**Scale:** For 20 WOs, 15 techs, 10-day horizon: ~3,000 binary variables, ~400 constraints. Solvable by HiGHS or CBC in under 5 seconds. For 100 WOs, 50 techs, 30 days: ~150,000 binary variables — needs a good solver (Gurobi or CPLEX) or problem decomposition.

**Shadow price interpretation:** The shadow price on constraint (1) for WO `j` tells you how much cost increases if the due date tightens by one day. Present to the user as: "Tightening this due date by one day adds $340 in labor cost."

### 3.2 Overtime Minimization

**Problem:** Given a fixed set of WO start/end dates (already committed in `scheduleAssignments`), find the tech assignment that minimizes total overtime hours.

This is a simpler variant of 3.1 where the schedule structure is fixed and only tech assignment is optimized.

**Decision variables:**

```
x[i,j,t] ∈ {0,1}:  1 if tech i is the primary tech for WO j on day t
h[i,t] ≥ 0:         overtime hours for tech i on day t
```

**Objective:**

```
Minimize: Σᵢ Σₜ h[i,t]
```

**Key constraint:**

```
Σⱼ x[i,j,t] * effort[j,t] ≤ H_reg + h[i,t]   for all i, t
```

Where `effort[j,t]` comes from `scheduleAssignments.dailyEffort[dayOffset].effortHours`.

**Use case trigger:** Run this automatically whenever `magicSchedule` creates a new schedule. Compare the greedy assignment's overtime against the LP-optimal overtime. Surface the delta to the shop manager: "This schedule requires 24 overtime hours. Optimal assignment requires 11 overtime hours — would you like to apply the optimized assignment?"

### 3.3 Quote Pricing Optimization

**Problem:** Given a set of labor tasks and parts for a quote, find the optimal pricing to hit a target gross margin while respecting the `partMarkupTiers` from `planningFinancialSettings`.

**Parameters from Athelon schema:**

```
partMarkupTiers (from planningFinancialSettings):
  e.g., [
    { maxLimit: 100,   markupPercent: 30 },  // Parts ≤ $100: 30% markup
    { maxLimit: 500,   markupPercent: 22 },  // Parts $100-$500: 22% markup
    { maxLimit: 2000,  markupPercent: 15 },  // Parts $500-$2000: 15% markup
    { maxLimit: ∞,     markupPercent: 10 },  // Parts > $2000: 10% markup
  ]
laborRate (from planningFinancialSettings.defaultShopRate)
targetMargin: e.g., 0.35 (35% gross margin)
```

**Decision variables:**

```
p[k] ≥ 0:  price charged for labor line item k (quote line items)
m[k] ≥ 0:  price charged for part line item k
z[k,b] ∈ {0,1}: 1 if part k falls into markup tier b (linearizes the tier structure)
```

**Objective — maximize total quote value (subject to margin floor):**

```
Maximize: Σₖ p[k] + Σₖ m[k]
```

**Constraints:**

```
(1) Margin floor:
    (Σₖ p[k] + Σₖ m[k] - total_cost) / (Σₖ p[k] + Σₖ m[k]) ≥ targetMargin
    Linearized: Σₖ p[k] + Σₖ m[k] ≥ total_cost / (1 - targetMargin)

(2) Labor price bounds:
    laborRate * hours[k] ≤ p[k] ≤ maxPrice[k]

(3) Parts markup tiers (SOS1 — Special Ordered Sets):
    Σ_b z[k,b] = 1                         for all k  (exactly one tier applies)
    cost[k] * (1 + markup[b]/100) * z[k,b] ≤ m[k]  for applicable tier b

(4) Competitive ceiling:
    p[k] + m[k] ≤ market_ceiling[k]        if market data available
```

**Practical note:** The tier structure requires SOS1 or big-M constraints. A cleaner approach: precompute which tier each part falls into (since cost is known) and reduce this to a pure LP for pricing optimization with fixed markups.

**Shadow price insight:** The shadow price on the margin constraint tells you the revenue cost of tightening your margin floor: "Requiring 40% vs. 35% margin reduces maximum quote value by $X for this job."

### 3.4 Inventory and Parts Ordering — Lot Sizing

**Problem:** Parts must be available when scheduled WOs need them. Minimize total carrying cost + ordering cost while ensuring parts availability.

This is the **Capacitated Lot Sizing Problem (CLSP)**, a classical production planning MIP.

**Decision variables:**

```
y[p,t] ∈ {0,1}:  1 if a purchase order for part p is placed in period t
q[p,t] ≥ 0:       quantity ordered for part p in period t
I[p,t] ≥ 0:       inventory level of part p at end of period t
```

**Parameters:**

```
d[p,t]:   demand for part p in period t (from scheduled WOs)
c_ord[p]: fixed ordering cost for part p (setup + shipping)
c_hold[p]: holding cost per unit per period (typically 20-25% of unit cost annually)
lead[p]:  lead time in periods for part p
```

**Objective:**

```
Minimize: Σₚ Σₜ [ c_ord[p] * y[p,t] + c_hold[p] * I[p,t] ]
```

**Constraints:**

```
(1) Inventory balance:
    I[p,t] = I[p,t-1] + q[p,t-lead[p]] - d[p,t]   for all p, t

(2) Ordering requires setup (big-M):
    q[p,t] ≤ M * y[p,t]   for all p, t
    (if you're ordering, you pay the setup cost)

(3) Non-stockout:
    I[p,t] ≥ safety_stock[p]   for all p, t

(4) Non-negativity:
    q[p,t] ≥ 0,  I[p,t] ≥ 0
```

**Athelon data mapping:**
- `d[p,t]` comes from `taskCards` linked to `workOrders` with assigned schedule dates
- Lead times come from `vendors` purchase order history
- `c_hold` can be estimated as `(unit_cost * 0.25) / 52` per week
- Parts reservations (`inventory.reservedForWorkOrderId`) must be respected as hard constraints

**Practical value:** Run weekly or when a new batch of WOs is scheduled. Output: a recommended purchase order list for the parts clerk. The MIP optimally balances ordering too early (high carrying cost) vs. ordering too late (risk of stockout delaying a WO).

### 3.5 Multi-Location Load Balancing

**Problem:** Athelon may operate multiple `shopLocations`. Distribute incoming WOs across locations to minimize total cost (labor + transport + opportunity cost of delayed work).

**Decision variables:**

```
z[j,l] ∈ {0,1}:  1 if WO j is assigned to location l
delay[j] ≥ 0:    days WO j is completed after its due date
```

**Parameters:**

```
cap[l,t]:   labor hours available at location l on day t
transport[j,l]: cost to ferry aircraft j to location l (from customer.homeAirportId distances)
rate[l]:    blended labor rate at location l
delay_cost[j]: daily cost of delay for WO j (e.g., AOG penalty rate from workOrders)
```

**Objective:**

```
Minimize: Σⱼ Σₗ z[j,l] * [rate[l] * est_hours[j] + transport[j,l]]
          + Σⱼ delay_cost[j] * delay[j]
```

**Constraints:**

```
(1) WO assigned to exactly one location:
    Σₗ z[j,l] = 1   for all j

(2) Location capacity:
    Σⱼ z[j,l] * daily_demand[j,t] ≤ cap[l,t] + overtime_cap[l,t]   for all l, t

(3) Due date compliance (with allowed delay):
    Σₜ≤d[j] effective_throughput[l,t] * z[j,l] + delay[j] ≥ est_hours[j]   for all j

(4) Certification coverage:
    z[j,l] ≤ has_qualified_tech[j,l]   for all j, l
    (location must have at least one tech with required certs)
```

**Shadow prices for management:** The shadow price on location capacity tells you the marginal value of expanding a specific location. The shadow price on certification coverage flags which certifications are bottlenecks across the network.

### 3.6 Hiring Budget Optimization

**Problem:** Given a hiring budget, what combination of new technicians (by certificate type) maximizes shop capacity for projected demand?

**Decision variables:**

```
n[c] ∈ ℤ₊:   number of new hires of certification type c
```

**Parameters:**

```
salary[c]:      annual fully-loaded cost of a tech with cert type c
capacity[c]:    annual billable hours a tech with cert type c adds
demand_uncovered[c]: hours of WOs requiring cert type c that current staff cannot cover
budget:         total annual hiring budget
```

**Objective — maximize covered demand:**

```
Maximize: Σc min(n[c] * capacity[c], demand_uncovered[c])
```

This `min()` makes the objective nonlinear. Linearize with auxiliary variable `covered[c]`:

```
Maximize: Σc covered[c]
Subject to:
  covered[c] ≤ n[c] * capacity[c]   for all c
  covered[c] ≤ demand_uncovered[c]  for all c  (can't cover more than the gap)
  Σc salary[c] * n[c] ≤ budget
  n[c] ≥ 0, integer
```

**Extensions:**
- Include a certification overlap matrix (an A&P can cover airframe-only WOs): `capacity_overlap[c1, c2]` captures partial substitutability
- Add a diversity constraint: `n["A&P"] ≥ 0.6 * Σc n[c]` (at least 60% of hires should be full A&Ps)
- Multi-year planning: repeat over T years with budget rolling

**Output format for Athelon:** The solution gives a hiring plan. Shadow prices on the budget constraint answer: "What's the return on adding $50K to the hiring budget?" The shadow price on `demand_uncovered[c]` for IA cert tells you: "Unmet IA-required work is the binding constraint — an IA hire yields more capacity than another A&P."

### 3.7 Training Investment ROI

**Problem:** Which existing technicians should receive which additional certifications to maximize the reduction in outsourced (sent-away) work?

**Decision variables:**

```
train[i,c] ∈ {0,1}:  1 if technician i receives certification c
outsource[j] ∈ {0,1}: 1 if work order j must be outsourced
```

**Parameters:**

```
train_cost[i,c]:  cost to train tech i for cert c (varies by tech — some already have prerequisites)
outsource_cost[j]: cost to outsource WO j (labor cost + transport + overhead + markup)
in_house_cost[j]:  cost to do WO j in-house
requires[j,c]:    1 if WO j requires at least one tech with cert c
budget:           training budget
```

**Objective — maximize outsourcing reduction:**

```
Minimize: Σⱼ outsource[j] * (outsource_cost[j] - in_house_cost[j])
```

**Constraints:**

```
(1) Budget:
    Σᵢ Σc train[i,c] * train_cost[i,c] ≤ budget

(2) WO can be in-housed if cert requirement met:
    (1 - outsource[j]) ≤ Σᵢ (has_cert_today[i,c] + train[i,c]) * requires[j,c]
    for each required cert type c

(3) Prerequisite constraints (A&P required before IA):
    train[i,"IA"] ≤ has_cert_today[i,"A&P"] + train[i,"A&P"]

(4) Each tech can receive at most K certifications (bandwidth constraint):
    Σc train[i,c] ≤ K   for all i
```

**Shadow price insight:** The shadow price on the training budget constraint tells you: "Each additional $1,000 in training budget reduces outsourcing costs by $Y." This is the direct ROI calculation that justifies training investments.

---

## 4. How It Works — Technical Deep Dive

### 4.1 Simplex Algorithm — Worked Example

Consider the simplest MRO-relevant LP: allocate two tech types (A&P, IA) across two WO types (routine, inspection) over one day to maximize revenue.

```
Parameters:
  Revenue per A&P-hour on routine WO:   $95
  Revenue per A&P-hour on inspection:   $110
  Revenue per IA-hour on inspection:    $145
  Available A&P hours:                  16 (2 A&P techs, 8 hrs each)
  Available IA hours:                   8  (1 IA tech, 8 hrs)
  Routine WO demand:                    20 hours
  Inspection demand:                    12 hours
  Inspection requires IA for at least 50% of hours

Decision variables:
  x₁: A&P hours on routine WOs
  x₂: A&P hours on inspections
  x₃: IA hours on inspections

LP:
  Maximize: 95 x₁ + 110 x₂ + 145 x₃
  Subject to:
    x₁ + x₂ ≤ 16         (A&P capacity)
    x₃ ≤ 8               (IA capacity)
    x₁ ≤ 20              (routine demand)
    x₂ + x₃ ≤ 12         (inspection demand)
    x₃ ≥ 0.5 * (x₂+x₃)  → x₃ ≥ x₂  (IA ≥ 50% of inspection hours)
    x₁, x₂, x₃ ≥ 0
```

**Standard form** (add slack variables s₁–s₅):

```
Max: 95x₁ + 110x₂ + 145x₃
s.t.:
  x₁ + x₂ + s₁ = 16
  x₃ + s₂ = 8
  x₁ + s₃ = 20
  x₂ + x₃ + s₄ = 12
  -x₂ + x₃ - s₅ = 0  (IA ≥ A&P on inspections)
  all vars ≥ 0
```

**Initial basic feasible solution:** Set decision variables to 0, slacks to RHS values. Objective = 0.

**Simplex iteration 1:** Most favorable reduced cost is x₃ (+145). Minimum ratio test: x₃ can increase to min(8/1, 12/1, 0/1) = 0. Degenerate pivot — x₃ enters basis tied with s₅.

**Continue pivoting:** After a few iterations, optimal solution:
- x₁ = 8 (A&P on routine), x₂ = 8 (A&P on inspection), x₃ = 8 (IA on inspection)
- Revenue = 95(8) + 110(8) + 145(8) = $2,800
- Shadow prices: A&P capacity constraint: $110/hr, IA capacity: $35/hr → A&P hours are more valuable here

### 4.2 Branch-and-Bound — Scheduling Example

Assign 3 tech-WO pairings with binary variables. LP relaxation gives `x₁ = 0.5, x₂ = 1.0, x₃ = 0.5` with cost $420.

```
Node 0 (root): LP relaxation → $420, x₁ = 0.5 fractional → branch on x₁

  Node 1 (x₁ = 0): LP → $450, x₃ = 0.3 fractional → branch on x₃
    Node 3 (x₁=0, x₃=0): LP → $510, all integer → INCUMBENT = $510
    Node 4 (x₁=0, x₃=1): LP → infeasible → PRUNE

  Node 2 (x₁ = 1): LP → $430, all integer → INCUMBENT = $430 (better!)
    Node 3 is now pruned (its $510 > $430)
```

**Final answer:** `x₁=1, x₂=1, x₃=0`, cost $430. Optimality proved: LP relaxation lower bound was $420, and we found an integer solution at $430 — the gap is $10/$420 = 2.4%.

### 4.3 Presolve, Cutting Planes, and Heuristics

**Presolve:** Before solving, modern solvers apply dozens of reduction rules:
- Eliminate variables that are trivially forced to 0 or 1
- Remove redundant constraints
- Tighten variable bounds
- Detect and exploit problem structure (network structure, special ordered sets)

Presolve can reduce problem size by 50-90% for well-structured MIPs.

**Cutting planes added by solvers:**
- **MIR (Mixed Integer Rounding):** Strengthens bounds near fractional solutions
- **Gomory cuts:** From LP tableau rows
- **Implied bound cuts:** Logical deductions between binary variables
- **Clique/cover cuts:** For set-packing/covering structure

**Primal heuristics** find good integer solutions early to improve pruning:
- **Rounding:** Round LP relaxation solution toward integrality
- **RINS (Relaxation Induced Neighborhood Search):** Fix variables where LP relaxation agrees with best known integer solution, re-solve smaller subproblem
- **Large Neighborhood Search:** Fix most variables, solve smaller MIP

### 4.4 Big-M Constraints and Indicator Constraints

**Big-M pattern:** Enforce "if binary variable y = 0, then x must be 0":
```
x ≤ M * y
```
Where M is a large constant (an upper bound on x). If y = 0, forces x ≤ 0. If y = 1, constraint is `x ≤ M` which is not binding.

**Problem:** Large M values cause numerical instability in the LP relaxation. The bound `x ≤ 1000000 * y` gives the LP solver very little information when y = 0.7.

**Best practice:** Choose M as tight as possible. For a tech assignment MIP, M = max shift length (8.5 hours), not a large arbitrary number.

**Indicator constraints** (supported by Gurobi, CPLEX): A cleaner formulation `y = 1 → x ≤ 10` that avoids big-M entirely. The solver handles the logic internally. Prefer these when available.

**For Athelon:** "WO j can only be assigned to bay b if WO j's aircraft type is compatible with bay b":
```python
# Big-M version (acceptable for small M):
for j in work_orders:
    for b in bays:
        model.add(x[j,b] * est_hours[j] <= bay_capacity[b] * compatible[j,b])
        # compatible[j,b] is 0 or 1 — this is naturally tight

# Better: just filter the variable set
for j in work_orders:
    for b in compatible_bays[j]:  # only create variables for compatible pairs
        x[j,b] = model.new_bool_var(f"assign_{j}_{b}")
```

### 4.5 Sensitivity Analysis

After solving an LP, solvers provide sensitivity analysis (also called **ranging**):

**RHS ranging:** For each constraint, the range of RHS values over which the current optimal basis remains optimal (and shadow prices remain valid). Outside this range, the basis changes.

**Objective ranging:** For each variable, the range of its objective coefficient over which the current optimal solution structure remains optimal.

**Practical for Athelon:**

After solving the tech assignment LP:
- "The shadow price on A&P capacity is valid for A&P availability between 290 and 380 hours/week. Below 290 hours, a different assignment structure becomes optimal."
- "This assignment remains optimal as long as Alice's hourly cost is between $42 and $67/hr."

This gives the shop manager confidence in the plan's robustness to estimate errors.

### 4.6 Python Code Examples

#### Example 1: OR-Tools GLOP (LP) — Simplified Revenue Maximization

```python
from ortools.linear_solver import pywraplp

def solve_daily_revenue_lp(
    techs: list[dict],      # [{name, cert_types, available_hours, hourly_rate}]
    work_orders: list[dict], # [{id, required_cert, hours, revenue_per_hour}]
) -> dict:
    """
    Maximize revenue from assigning techs to WOs for a single day.
    Returns assignment and shadow prices.
    """
    solver = pywraplp.Solver.CreateSolver("GLOP")
    if not solver:
        raise RuntimeError("GLOP not available")

    # Decision variables: hours tech i spends on WO j
    x = {}
    for i, tech in enumerate(techs):
        for j, wo in enumerate(work_orders):
            # Only create variable if tech has required cert
            if wo["required_cert"] in tech["cert_types"]:
                x[i, j] = solver.NumVar(0, solver.infinity(), f"x_{i}_{j}")

    # Objective: maximize revenue
    objective = solver.Objective()
    for (i, j), var in x.items():
        objective.SetCoefficient(var, work_orders[j]["revenue_per_hour"])
    objective.SetMaximization()

    # Constraints: tech capacity
    tech_capacity_constraints = {}
    for i, tech in enumerate(techs):
        ct = solver.Constraint(0, tech["available_hours"], f"cap_tech_{i}")
        for j in range(len(work_orders)):
            if (i, j) in x:
                ct.SetCoefficient(x[i, j], 1)
        tech_capacity_constraints[i] = ct

    # Constraints: WO demand (can't assign more hours than needed)
    for j, wo in enumerate(work_orders):
        ct = solver.Constraint(0, wo["hours"], f"demand_wo_{j}")
        for i in range(len(techs)):
            if (i, j) in x:
                ct.SetCoefficient(x[i, j], 1)

    status = solver.Solve()
    if status != pywraplp.Solver.OPTIMAL:
        return {"status": "infeasible_or_unbounded"}

    assignment = {
        f"tech_{i}_wo_{j}": var.solution_value()
        for (i, j), var in x.items()
        if var.solution_value() > 1e-6
    }

    # Extract shadow prices from dual values
    shadow_prices = {
        f"tech_{i}_capacity": tech_capacity_constraints[i].dual_value()
        for i in range(len(techs))
    }

    return {
        "status": "optimal",
        "total_revenue": solver.Objective().Value(),
        "assignment": assignment,
        "shadow_prices": shadow_prices,
        "message": (
            f"Optimal revenue: ${solver.Objective().Value():,.2f}. "
            f"Shadow prices ($/hr of additional tech capacity): "
            + ", ".join(
                f"{techs[i]['name']}: ${v:.2f}"
                for i, v in shadow_prices.items()
                if isinstance(i, int) and v > 0.01
            )
        )
    }
```

#### Example 2: OR-Tools SCIP (MIP) — Work Order Assignment

```python
from ortools.linear_solver import pywraplp

def solve_wo_assignment_mip(
    techs: list[dict],       # [{id, name, certs, shift_hours, rate, ot_rate}]
    work_orders: list[dict], # [{id, required_certs, est_hours, due_day, priority}]
    num_days: int = 10,
    max_solve_seconds: float = 30.0,
) -> dict:
    """
    MIP: assign techs to WOs over a planning horizon.
    Minimize total labor cost (regular + overtime).
    """
    solver = pywraplp.Solver.CreateSolver("SCIP")
    solver.set_time_limit(int(max_solve_seconds * 1000))  # milliseconds

    n_techs = len(techs)
    n_wos = len(work_orders)
    H_REG = 8.5  # regular shift hours

    # Binary assignment: tech i works WO j on day t
    x = {}
    for i, tech in enumerate(techs):
        for j, wo in enumerate(work_orders):
            # Check cert compatibility
            if not all(c in tech["certs"] for c in wo["required_certs"]):
                continue
            for t in range(num_days):
                x[i, j, t] = solver.BoolVar(f"x_{i}_{j}_{t}")

    # Overtime hours: tech i on day t
    ot = {}
    for i in range(n_techs):
        for t in range(num_days):
            ot[i, t] = solver.NumVar(0, 4.0, f"ot_{i}_{t}")  # max 4 hrs OT/day

    # Objective: minimize total labor cost
    objective = solver.Objective()
    for i, tech in enumerate(techs):
        rate = tech["rate"]
        ot_rate = tech.get("ot_rate", rate * 1.5)
        for t in range(num_days):
            objective.SetCoefficient(ot[i, t], ot_rate)
            # Regular time cost is fixed (sunk cost) — but we can minimize
            # the number of techs working (and thus total cost)
            for j in range(n_wos):
                if (i, j, t) in x:
                    objective.SetCoefficient(x[i, j, t], rate * H_REG)
    objective.SetMinimization()

    # Constraint 1: WO must be completed by due date
    for j, wo in enumerate(work_orders):
        ct = solver.Constraint(wo["est_hours"], solver.infinity(), f"due_{j}")
        for i in range(n_techs):
            for t in range(min(wo["due_day"], num_days)):
                if (i, j, t) in x:
                    ct.SetCoefficient(x[i, j, t], H_REG)

    # Constraint 2: Tech daily capacity (regular + overtime)
    for i, tech in enumerate(techs):
        for t in range(num_days):
            ct = solver.Constraint(
                -solver.infinity(), H_REG, f"cap_{i}_{t}"
            )
            for j in range(n_wos):
                if (i, j, t) in x:
                    ct.SetCoefficient(x[i, j, t], H_REG)
            ct.SetCoefficient(ot[i, t], -1)  # overtime expands capacity

    # Constraint 3: Each tech works at most one WO per day
    for i in range(n_techs):
        for t in range(num_days):
            ct = solver.Constraint(0, 1, f"one_wo_{i}_{t}")
            for j in range(n_wos):
                if (i, j, t) in x:
                    ct.SetCoefficient(x[i, j, t], 1)

    status = solver.Solve()

    if status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        assignments = []
        for (i, j, t), var in x.items():
            if var.solution_value() > 0.5:
                assignments.append({
                    "tech_id": techs[i]["id"],
                    "tech_name": techs[i]["name"],
                    "wo_id": work_orders[j]["id"],
                    "day": t,
                    "hours": H_REG,
                })
        total_ot = sum(ot[i, t].solution_value()
                       for i in range(n_techs)
                       for t in range(num_days))
        return {
            "status": "optimal" if status == pywraplp.Solver.OPTIMAL else "feasible",
            "total_cost": solver.Objective().Value(),
            "total_overtime_hours": total_ot,
            "assignments": assignments,
            "solve_time_ms": solver.wall_time(),
            "num_b_and_b_nodes": solver.nodes(),
        }
    else:
        return {"status": "infeasible", "message": "No feasible schedule found. Check due dates and capacity."}
```

#### Example 3: HiGHS via Python — Lot Sizing for Parts Ordering

```python
import highspy
import numpy as np

def solve_parts_lot_sizing(
    parts: list[dict],      # [{part_id, unit_cost, lead_time_days}]
    demand: dict,           # {(part_id, day): quantity_needed}
    num_periods: int = 14,  # 2-week horizon
    holding_cost_rate: float = 0.0048,  # ~25%/year, per day
) -> dict:
    """
    Minimize parts ordering cost + holding cost.
    Returns recommended purchase order dates and quantities.
    """
    h = highspy.Highs()
    h.silent()

    n_parts = len(parts)
    # Variables: inventory[p,t], order_qty[p,t], order_placed[p,t]
    # Using HiGHS column-based API for performance

    inf = highspy.kHighsInf
    col_idx = {}
    col_count = 0

    # Build variable arrays
    costs = []
    lower = []
    upper = []
    int_vars = []

    for p_idx, part in enumerate(parts):
        hold_cost_per_unit = part["unit_cost"] * holding_cost_rate

        for t in range(num_periods):
            # Inventory variable (continuous)
            col_idx[("inv", p_idx, t)] = col_count
            costs.append(hold_cost_per_unit)
            lower.append(0)
            upper.append(inf)
            col_count += 1

            # Order quantity (continuous)
            col_idx[("qty", p_idx, t)] = col_count
            costs.append(0)  # holding cost is on inventory, not order qty
            lower.append(0)
            upper.append(inf)
            col_count += 1

            # Order placed (binary)
            col_idx[("ord", p_idx, t)] = col_count
            FIXED_ORDER_COST = 50.0  # $50 fixed cost per PO line
            costs.append(FIXED_ORDER_COST)
            lower.append(0)
            upper.append(1)
            int_vars.append(col_count)
            col_count += 1

    h.passLp(
        col_count, 0,  # numCol, numRow (rows added via addRow)
        highspy.ObjSense.kMinimize,
        0,  # offset
        costs, lower, upper,
        [], [], [], [], []  # empty row data — we'll add rows
    )
    for iv in int_vars:
        h.changeColIntegrality(iv, highspy.HighsVarType.kInteger)

    # Add inventory balance constraints
    for p_idx, part in enumerate(parts):
        lead = int(part["lead_time_days"])
        for t in range(num_periods):
            d = demand.get((part["part_id"], t), 0)
            # inv[t] = inv[t-1] + qty[t-lead] - demand[t]
            # Rewritten: inv[t] - inv[t-1] - qty[t-lead] = -demand[t]
            row_indices = []
            row_values = []

            # inv[t]
            row_indices.append(col_idx[("inv", p_idx, t)])
            row_values.append(1.0)

            # -inv[t-1]
            if t > 0:
                row_indices.append(col_idx[("inv", p_idx, t-1)])
                row_values.append(-1.0)

            # -qty[t-lead] (if receipt arrives this period)
            if 0 <= t - lead < num_periods:
                row_indices.append(col_idx[("qty", p_idx, t-lead)])
                row_values.append(-1.0)

            h.addRow(-d, -d, len(row_indices), row_indices, row_values)

            # Big-M linking: qty[t] <= M * ord[t]
            M = 1000  # max order quantity
            h.addRow(
                -inf, 0,
                2,
                [col_idx[("qty", p_idx, t)], col_idx[("ord", p_idx, t)]],
                [1.0, -M]
            )

    h.run()
    info = h.getInfoValue("primal_solution_status")[1]

    result = {"status": info, "purchase_orders": []}
    if "Optimal" in str(info) or "Feasible" in str(info):
        sol = h.getSolution()
        for p_idx, part in enumerate(parts):
            for t in range(num_periods):
                qty = sol.col_value[col_idx[("qty", p_idx, t)]]
                if qty > 0.5:
                    result["purchase_orders"].append({
                        "part_id": part["part_id"],
                        "order_day": t,
                        "quantity": round(qty),
                        "estimated_arrival_day": t + int(part["lead_time_days"]),
                    })

    return result
```

---

## 5. Where to Find It — Solver Ecosystem

### 5.1 Open-Source Solvers

| Solver | License | LP | MIP | Python | Notes |
|---|---|---|---|---|---|
| **HiGHS** | MIT | GLOP-competitive | Good | `highspy` | Best open-source LP/MIP as of 2025. Used by SciPy, Pyomo, CVXPY defaults. |
| **Google OR-Tools GLOP** | Apache 2.0 | Excellent | N/A | `ortools` | Google's LP solver. Fast, numerically stable. Part of OR-Tools suite. |
| **Google OR-Tools SCIP** | Apache 2.0 | Via LP relax | Excellent | `ortools` | SCIP integrated into OR-Tools. Production-quality MIP. |
| **COIN-OR CBC** | Eclipse 2.0 | Via CLP | Good | `cylp`, `PuLP` | Older but widely deployed. CLP for LP, CBC for MIP. Slower than HiGHS. |
| **SCIP** | Apache 2.0 | Good | One of fastest OSS | `PySCIPOpt` | Standalone SCIP (not OR-Tools variant). More features, direct Python API. |
| **GLPK** | GPL 3.0 | Good | Adequate | `cvxopt`, WASM | Older. GPL license restricts commercial use. Compiles to WASM (browser). |

**HiGHS benchmarks (MIPlib 2017):** HiGHS solves ~85% of standard benchmark instances to optimality within 1-hour time limits — competitive with commercial solvers on small-to-medium problems. On large instances, commercial solvers still dominate by 2-5x.

**Recommended open-source stack for Athelon:**
- LP optimization → HiGHS (via `highspy`) or OR-Tools GLOP
- MIP scheduling → OR-Tools SCIP (convenient) or SCIP standalone (more control)
- Browser-side feasibility → GLPK compiled to WASM

### 5.2 Commercial Solvers

| Solver | Company | LP | MIP | Academic | Commercial Price |
|---|---|---|---|---|---|
| **Gurobi** | Gurobi Optimization | Fastest | Fastest | Free (unlimited size) | ~$10,000–$25,000/year per server |
| **CPLEX** | IBM | Fastest | Fastest | Free via IBM Academic | ~$14,000+/year (bundled with ILOG CP) |
| **FICO Xpress** | FICO | Excellent | Excellent | Academic available | ~$10,000–$20,000/year |
| **MOSEK** | MOSEK ApS | Excellent (conic) | Good | Free for academics | ~$2,500/year (smaller operator) |

**Gurobi** is widely considered the fastest MIP solver, typically 2-10x faster than HiGHS on hard instances. Their Python API (`gurobipy`) is clean. Academic licenses are fully-featured and free for verifiable academic use.

**CPLEX** is IBM's solver, bundled with the ILOG CP Optimizer (a full CP solver). The combined LP + CP license is attractive for MRO problems that need both.

**For Athelon at launch:** Start with HiGHS + OR-Tools (zero cost). If solve times become a bottleneck (>30 second solves on weekly plans), evaluate Gurobi. The code change from OR-Tools SCIP to Gurobi is typically 10-20 lines of solver initialization.

### 5.3 Python Modeling Libraries

These libraries provide an abstraction layer over multiple solvers:

| Library | Solvers Supported | API Style | Notes |
|---|---|---|---|
| **PuLP** | HiGHS, CBC, GLPK, Gurobi, CPLEX, SCIP, XPRESS | Variable + constraint objects | Simple, beginner-friendly, good for small-medium models |
| **Pyomo** | HiGHS, CBC, GLPK, Gurobi, CPLEX, SCIP, IPOPT | Declarative modeling | More powerful, supports nonlinear + stochastic, steeper learning curve |
| **CVXPY** | HiGHS, GLPK, ECOS, SCS, Gurobi, CPLEX, MOSEK | Convex optimization oriented | Excellent for LP/QP, less natural for MIP |
| **OR-Tools Python** | GLOP, SCIP (native) | Solver-specific API | No abstraction layer, full control |
| **gurobipy** | Gurobi only | Native Gurobi API | Fastest for Gurobi, clean syntax |

**Recommendation for Athelon microservice:** OR-Tools Python for the CP-SAT integration path (since CP-SAT is already planned), with HiGHS via `highspy` for pure LP problems. This avoids adding Pyomo or PuLP as an additional dependency.

### 5.4 JavaScript/TypeScript Options

For browser-side feasibility checks (not full optimization — just "can this WO fit in this week?"):

| Package | Approach | Size | Capability |
|---|---|---|---|
| `glpk.js` (npm: `glpk.js`) | GLPK compiled to WASM | ~1.5 MB | Full LP + MIP (GLPK-level) |
| `javascript-lp-solver` | Pure JS simplex | ~50 KB | LP only, simple API, no MIP |
| `highs-js` | HiGHS compiled to WASM | ~8 MB | Full LP + MIP (HiGHS-level) |
| `@optimization-js/glpk` | GLPK WASM wrapper | ~2 MB | LP + MIP |

**`glpk.js`** is the most mature WASM solver for browser use. Install: `npm install glpk.js`. Example:

```typescript
import GLPK from "glpk.js";

async function checkFeasibility(
  availableHours: number,
  workOrderHours: number[],
  dueInDays: number[],
  dailyCapacity: number,
): Promise<{ feasible: boolean; message: string }> {
  const glpk = await GLPK();

  const lp = {
    name: "feasibility_check",
    objective: {
      direction: glpk.GLP_MIN,
      name: "min_tardiness",
      vars: workOrderHours.map((_, j) => ({
        name: `start_${j}`,
        coef: 1,
      })),
    },
    subjectTo: [
      {
        name: "daily_capacity",
        vars: workOrderHours.map((h, j) => ({ name: `start_${j}`, coef: h })),
        bnds: { type: glpk.GLP_UP, ub: availableHours, lb: 0 },
      },
      ...workOrderHours.map((h, j) => ({
        name: `due_date_${j}`,
        vars: [{ name: `start_${j}`, coef: h }],
        bnds: {
          type: glpk.GLP_UP,
          ub: dueInDays[j] * dailyCapacity,
          lb: 0,
        },
      })),
    ],
    bounds: workOrderHours.map((_, j) => ({
      name: `start_${j}`,
      type: glpk.GLP_LO,
      lb: 0,
      ub: glpk.GLP_DBL_MAX,
    })),
  };

  const result = glpk.solve(lp, glpk.GLP_MSG_OFF);

  return {
    feasible: result.result.status === glpk.GLP_OPT,
    message:
      result.result.status === glpk.GLP_OPT
        ? "Schedule is feasible"
        : "Warning: Work orders may not meet all due dates with current capacity",
  };
}
```

`highs-js` is newer and based on the superior HiGHS solver, but its 8 MB WASM bundle makes it less suitable for browser use. Consider it for a Node.js service layer (Convex actions run Node.js — HiGHS-WASM would run there).

### 5.5 Learning Resources

- **Textbooks:** "Linear Programming" (Chvátal), "Integer Programming" (Wolsey), "Introduction to Operations Research" (Hillier & Lieberman, 14th ed.)
- **Free online courses:** Coursera "Discrete Optimization" (University of Melbourne, covers LP + MIP + CP-SAT), MIT 15.053 (open courseware)
- **OR-Tools guides:** https://developers.google.com/optimization/lp/glop (LP), https://developers.google.com/optimization/mip (MIP)
- **HiGHS documentation:** https://highs.dev/ — includes API reference, solver options, sensitivity analysis output
- **PuLP case studies:** https://coin-or.github.io/pulp/ — worked examples for blending, transportation, workforce scheduling
- **Hans Mittelmann's LP/MIP benchmarks:** http://plato.asu.edu/bench.html — authoritative solver comparison tables

---

## 6. Integration Architecture for Athelon

### 6.1 Two-Tier Architecture

Athelon's TypeScript/Convex stack does not natively support Python optimization libraries. The practical architecture uses two tiers:

**Tier 1 — Browser-side LP (GLPK WASM):** Instant feasibility checks while the user is building a schedule or entering a promise date. Runs in ~50ms. No network round-trip.

**Tier 2 — Server-side optimization microservice (Python):** Full MIP optimization for complex problems. Called from Convex actions via HTTP. Returns in 5-60 seconds depending on problem size.

```
Browser
  └── Schedule UI / Quote Workspace
       ├── glpk.js (WASM) ─────────────────────────────── instant feasibility
       └── "Optimize" button
            └── Convex Action (scheduleOptimize)
                 └── HTTP POST → Python Optimization Service
                      └── OR-Tools / HiGHS
                           └── Returns schedule + shadow prices
                                └── Convex Mutation (persistOptimizedSchedule)
                                     └── scheduleAssignments table updated
```

### 6.2 Python Optimization Microservice

**Deployment options:**
- **Google Cloud Run** — containerized Python, scale-to-zero, per-request billing. Ideal for infrequent batch optimization (weekly planning runs)
- **AWS Lambda** — similar economics, 15-minute timeout (more than enough)
- **Railway.app / Render** — simpler deployment, persistent container, ~$10/month for a small instance

**Service interface:**

```python
# FastAPI service — apps/optimizer/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import solve_work_order_assignment  # module from Section 4.6

app = FastAPI()

class OptimizeRequest(BaseModel):
    organization_id: str
    techs: list[dict]
    work_orders: list[dict]
    hangar_bays: list[dict]
    planning_horizon_days: int = 14
    max_solve_seconds: float = 30.0
    objective: str = "minimize_cost"  # or "minimize_overtime", "minimize_tardiness"

class OptimizeResponse(BaseModel):
    status: str
    total_cost: Optional[float]
    total_overtime_hours: Optional[float]
    assignments: list[dict]
    shadow_prices: dict
    optimality_gap_percent: Optional[float]
    solve_time_ms: int
    message: str

@app.post("/optimize/schedule", response_model=OptimizeResponse)
async def optimize_schedule(req: OptimizeRequest) -> OptimizeResponse:
    result = solve_work_order_assignment.solve(
        techs=req.techs,
        work_orders=req.work_orders,
        hangar_bays=req.hangar_bays,
        num_days=req.planning_horizon_days,
        max_solve_seconds=req.max_solve_seconds,
        objective=req.objective,
    )
    return OptimizeResponse(**result)

@app.post("/optimize/quote-pricing")
async def optimize_quote(req: dict) -> dict:
    # Quote pricing LP from Section 3.3
    ...

@app.post("/optimize/hiring-plan")
async def optimize_hiring(req: dict) -> dict:
    # Hiring budget MIP from Section 3.6
    ...

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

**Dockerfile:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn ortools highspy pydantic
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 6.3 Convex Action Flow

```typescript
// convex/actions/optimizeSchedule.ts

"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const optimizeScheduleAction = action({
  args: {
    organizationId: v.id("organizations"),
    horizonDays: v.optional(v.number()),
    objective: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all required data from Convex
    const [techs, workOrders, hangarBays, settings] = await Promise.all([
      ctx.runQuery(api.technicians.listActiveWithShifts, {
        organizationId: args.organizationId,
      }),
      ctx.runQuery(api.workOrders.listOpenForOptimization, {
        organizationId: args.organizationId,
      }),
      ctx.runQuery(api.hangarBays.listActive, {
        organizationId: args.organizationId,
      }),
      ctx.runQuery(api.planningFinancialSettings.get, {
        organizationId: args.organizationId,
      }),
    ]);

    // 2. Map Convex records to optimizer payload
    const payload = {
      organization_id: args.organizationId,
      techs: techs.map((t) => ({
        id: t._id,
        name: t.legalName,
        certs: t.certificates?.map((c) => c.certificateType) ?? [],
        available_hours: t.shift?.endHour - t.shift?.startHour ?? 8.5,
        rate: settings?.defaultLaborCostRate ?? 55,
        efficiency: t.shift?.efficiencyMultiplier ?? 1.0,
      })),
      work_orders: workOrders.map((wo) => ({
        id: wo._id,
        required_certs: wo.requiredCertifications ?? [],
        est_hours: wo.estimatedHours ?? 40,
        due_day: Math.ceil(
          (wo.estimatedCompletionDate - Date.now()) / 86_400_000,
        ),
        priority: wo.priority,
        aog: wo.isAog ?? false,
      })),
      hangar_bays: hangarBays.map((b) => ({
        id: b._id,
        name: b.name,
        capacity: b.bayCapacity ?? 1,
      })),
      planning_horizon_days: args.horizonDays ?? 14,
      max_solve_seconds: 30,
      objective: args.objective ?? "minimize_cost",
    };

    // 3. Call optimization microservice
    const optimizerUrl = process.env.OPTIMIZER_SERVICE_URL;
    if (!optimizerUrl) {
      throw new Error("OPTIMIZER_SERVICE_URL not configured");
    }

    const response = await fetch(`${optimizerUrl}/optimize/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Optimizer service error: ${error}`);
    }

    const result = await response.json();

    if (result.status === "infeasible") {
      return {
        success: false,
        message: result.message,
        shadowPrices: {},
      };
    }

    // 4. Persist optimized assignments
    await ctx.runMutation(api.scheduleAssignments.applyOptimizedSchedule, {
      organizationId: args.organizationId,
      assignments: result.assignments,
      source: "lp_optimizer",
    });

    // 5. Return results with shadow price interpretations
    return {
      success: true,
      totalCost: result.total_cost,
      totalOvertimeHours: result.total_overtime_hours,
      optimalityGapPercent: result.optimality_gap_percent,
      solveTimeMs: result.solve_time_ms,
      shadowPrices: result.shadow_prices,
      message: formatShadowPriceMessage(result.shadow_prices, techs),
    };
  },
});

function formatShadowPriceMessage(
  shadowPrices: Record<string, number>,
  techs: Array<{ _id: string; legalName: string }>,
): string {
  const insights: string[] = [];

  for (const [key, value] of Object.entries(shadowPrices)) {
    if (value > 1 && key.startsWith("tech_capacity_")) {
      const techId = key.replace("tech_capacity_", "");
      const tech = techs.find((t) => t._id === techId);
      const name = tech?.legalName ?? techId;
      insights.push(
        `${name} is a bottleneck: each additional shift-hour saves $${value.toFixed(2)}`,
      );
    }
  }

  if (insights.length === 0) {
    return "Schedule is optimal. No resource bottlenecks identified.";
  }

  return "Resource insights: " + insights.join("; ");
}
```

### 6.4 Data Mapping — Convex Schema to LP Variables

| Convex Table / Field | LP/MIP Element | Notes |
|---|---|---|
| `technicians._id` | Tech index `i` | One LP variable set per tech |
| `technicians.certificates[].certificateType` | `cert[i,j]` compatibility matrix | Filtered when building x[i,j,t] variables |
| `technicianShifts.efficiencyMultiplier` | Scales `H_REG` for tech `i` | A 1.2x tech contributes 10.2 hours vs. 8.5 |
| `technicianShifts.daysOfWeek` | `cap[i,t]` availability indicator | 0 if tech is off on day t |
| `workOrders.estimatedHours` | `r[j]` — required effort | RHS of due-date constraint |
| `workOrders.estimatedCompletionDate` | `d[j]` — due date index | Computed as days from now |
| `workOrders.priority` | Objective weight `w[j]` | AOG WOs get 10x cost multiplier for lateness |
| `hangarBays._id` | Bay index `b` | Used in bay-occupancy constraints |
| `hangarBays.compatibleAircraftTypes` | `bay_compat[j,b]` | Restricts which WOs can use which bay |
| `scheduleAssignments.startDate/endDate` | Fixed structure in overtime MIP | When solving assignment-only variant |
| `scheduleAssignments.dailyEffort` | `effort[j,t]` per-day workload | Maps to per-day capacity constraints |
| `planningFinancialSettings.defaultLaborCostRate` | `w[i]` (default) | Per-tech override not yet in schema |
| `planningFinancialSettings.partMarkupTiers` | Tier bounds in quote LP | `maxLimit` and `markupPercent` fields |
| `planningFinancialSettings.defaultShopRate` | Revenue coefficient | Used in revenue maximization LP |
| `schedulingSettings.capacityBufferPercent` | Effective capacity = `H_REG * (1 - buffer)` | Soft cap before overtime |

### 6.5 Surfacing Shadow Prices to Users

Shadow prices should appear as actionable insights, not raw numbers. Suggested UI placements:

**Schedule Optimization Results panel** (shown after running optimizer):

```
Optimization complete: 14-day plan generated
Total cost: $47,200 (vs. $51,800 greedy estimate — saves $4,600)
Overtime: 12 hours (vs. 28 hours greedy)

Bottleneck insights:
  • IA tech availability: each additional IA shift-hour saves $42
    → Scheduling Carlos Rodriguez for Saturday would save ~$340
  • Bay 3 occupancy is not a bottleneck (shadow price: $0)
  • Tightening WO #2847 due date by 1 day adds $380 in labor cost
```

**Quote Promise Date checker** (runs client-side WASM LP):

```
⚠ Tight schedule detected
This promise date requires 94% of available tech capacity.
Buffer: 6% (below 15% recommended threshold).
Shadow price: tightening by 2 days adds $190 in overtime risk.
[Adjust promise date] [Accept risk]
```

**Hiring ROI panel** (runs from monthly planning batch):

```
Training investment analysis:
  Adding IA certification to Miguel Santos ($3,200 training cost):
  → Eliminates $14,800 in annual outsourced annual inspection work
  → ROI: 4.6x in year 1
  Shadow price on IA demand: $2.10/hr (highest constraint value)
```

### 6.6 Specific Integration Points in the Codebase

| File | Integration Point | What to Add |
|---|---|---|
| `convex/actions/` (new) | `optimizeSchedule.ts` | Convex action as shown in Section 6.3 |
| `convex/scheduleAssignments.ts` | `applyOptimizedSchedule` mutation | Bulk-upsert assignments from optimizer result |
| `convex/workOrders.ts` | `listOpenForOptimization` query | Query returning all open WOs with cert requirements and due dates |
| `src/shared/lib/scheduling/magicSchedule.ts` | Post-schedule hook | After greedy schedule, offer LP overtime optimization |
| `app/(app)/schedule/` | "Optimize" button | Triggers `optimizeScheduleAction`, shows results panel |
| `app/(app)/quotes/[id]/` | Promise date feasibility | `glpk.js` WASM check on due date input change |
| `app/(app)/settings/planning/` | Training ROI calculator | UI for hiring/training MIP |
| `convex/planningFinancialSettings.ts` | Already has `partMarkupTiers` | Use these as quote LP parameters directly |

---

## 7. Interactions with Other Optimization Tools

### 7.1 LP/MIP + CP-SAT

**Complementary strengths:**

| Capability | LP/MIP | CP-SAT |
|---|---|---|
| Cost minimization | Excellent | Adequate |
| Logical constraints (if-then, OR) | Awkward (big-M) | Natural |
| Sequencing / precedence | Extra variables needed | Native interval variables |
| Certification matching | Binary variables work | Constraint objects simpler |
| Proving optimality | Yes, with gap certificate | Yes, but different bound type |
| Warm starting | LP relaxation provides tight bounds | LP bounds prune search tree |

**Integration pattern — LP bounds for CP-SAT:**

The LP relaxation can compute a lower bound on total cost that CP-SAT can use as a pruning threshold during its search. When CP-SAT finds an integer solution, compare against the LP lower bound: if the gap is less than 2%, stop searching.

```python
def solve_with_lp_guided_cpsat(techs, work_orders, ...):
    # 1. Solve LP relaxation for lower bound
    lp_result = solve_daily_revenue_lp(techs, work_orders)
    lp_lower_bound = lp_result["total_cost"]

    # 2. Set CP-SAT to stop if it finds a solution within 3% of LP bound
    cp_model = cp_model.CpModel()
    # ... build CP-SAT model with full sequencing + cert constraints ...
    solver = cp_model.CpSolver()
    solver.parameters.absolute_gap_limit = lp_lower_bound * 0.03
    solver.parameters.max_time_in_seconds = 20

    status = solver.Solve(cp_model)
    # If CP-SAT objective is within 3% of LP lower bound, this is near-optimal
```

**Recommended Athelon architecture:** Use LP/MIP for strategic planning (monthly capacity, hiring, quote pricing) and CP-SAT for tactical scheduling (weekly schedule generation, real-time rescheduling). The LP provides cost targets; CP-SAT finds sequenceable, feasible schedules within those cost targets.

### 7.2 LP/MIP + Bin Packing

**Relationship:** Bin packing is a special case of MIP (the set covering formulation). However, purpose-built bin packing heuristics are much faster for pure capacity problems.

**Integration pattern for Athelon:**

1. **Bin packing for initial feasibility:** Use the existing `capacityModel.ts` to quickly check if WOs fit in the horizon at all. This is a necessary but not sufficient condition.

2. **LP/MIP for cost optimization within feasible region:** Once bin packing confirms feasibility, use LP/MIP to find the minimum-cost assignment within the feasible region.

3. **Set-covering MIP for shift scheduling:** "Cover all required WO slots using minimum number of tech shifts" is a set-covering MIP — a generalization of bin packing. This is the right formulation for minimizing the number of days techs need to work overtime.

**Concrete flow:**

```
capacityModel.ts (bin packing)
  → infeasible: flag to user immediately, no LP needed
  → feasible: proceed to LP overtime minimization
               → LP gives optimal assignment
               → CP-SAT validates sequencing constraints
```

### 7.3 LP/MIP + EVM (Earned Value Management)

**EVM as LP input:** The existing `earned-value.ts` computes CPI and SPI from actual vs. planned cost. When CPI < 1 (over budget), these metrics can feed directly into the LP as updated cost parameters.

**Re-optimization workflow:**

1. EVM detects CPI = 0.82 on a complex WO mid-execution (20% over budget at 40% completion)
2. EAC (Estimate at Completion) recomputes remaining hours needed
3. LP re-optimizes tech assignment for the remaining work using updated `r[j] = remaining_hours`
4. New shadow prices show whether bringing in an additional tech saves more than the overtime cost

**Implementation sketch:**

```python
def reoptimize_from_evm(
    wo_id: str,
    actual_cost_to_date: float,
    percent_complete: float,
    original_estimate: float,
) -> dict:
    # EVM: EAC = actual_cost / (percent_complete)
    eac = actual_cost_to_date / percent_complete if percent_complete > 0 else original_estimate
    # Remaining estimate = EAC - actual_to_date
    remaining_hours = (eac - actual_cost_to_date) / hourly_rate
    # Re-run LP with updated remaining_hours for this WO
    return solve_wo_assignment_mip(
        work_orders=[{"id": wo_id, "est_hours": remaining_hours, ...}],
        ...
    )
```

**User-facing:** "This WO is tracking 18% over budget. Re-optimizing tech assignment for remaining work could save $640. [Apply re-optimization]"

### 7.4 LP/MIP + Metaheuristics

**LP lower bound as quality evaluator:** When a metaheuristic (genetic algorithm, simulated annealing) generates a candidate schedule, compare its cost to the LP relaxation lower bound. The gap tells you the quality of the metaheuristic solution:

```
LP lower bound:           $42,000
Metaheuristic solution:   $44,500 (6% above LP bound — quite good)
Greedy solution:          $51,800 (23% above LP bound — poor)
```

This gives the user a meaningful quality metric ("this schedule is within 6% of mathematically optimal") rather than a relative comparison.

**Warm starting metaheuristics from LP:** The LP relaxation often gives a near-integral solution. Round fractional variables to get an initial integer solution, then use this as the starting population/state for a genetic algorithm or simulated annealing. This dramatically speeds convergence.

**When to use which:**
- Pure cost problems with linear structure → LP/MIP
- Problems with complex logical rules (many if-then, sequences) → CP-SAT or metaheuristics
- Very large problems (1000+ WOs) where MIP is too slow → Metaheuristics with LP lower bound for quality assessment

### 7.5 LP/MIP + Forecasting

**Demand forecasting feeds workforce planning LP:** The hiring optimization MIP (Section 3.6) requires projected demand by certification type. Feed this from:

1. **Historical EVM data:** Average hours per WO type × projected WO volume
2. **Fleet data:** Aircraft approaching scheduled maintenance intervals (`aircraft.totalAirframeTime` against maintenance program intervals) predict future WO demand
3. **Customer fleet composition:** Aircraft with upcoming 100-hour, annual, or phase inspections

**Stochastic LP (LP with uncertainty):** When demand forecasts have confidence intervals, use robust optimization or stochastic LP to find assignments that remain good across scenarios:

```python
# Scenario-based stochastic LP:
# Instead of one demand vector d[j], use K scenarios with probabilities p_k
# Minimize: expected_cost = Σ_k p_k * cost_k(x)
# For each scenario k, all WO constraints must be feasible
# This produces a schedule robust to demand uncertainty
```

**Practical for Athelon:** When the monthly planning LP runs, pass three demand scenarios (optimistic/expected/pessimistic based on forecast confidence intervals). The resulting schedule is robust to demand swings of ±20%.

---

## Summary

### When to Use LP/MIP in Athelon

| Problem | Use | Reason |
|---|---|---|
| Minimize overtime for this week's schedule | LP/MIP | Pure cost minimization, linear structure |
| Generate next week's WO schedule | CP-SAT + LP bounds | Sequencing + cost, hybrid approach |
| Quote promise date feasibility check | GLPK WASM in browser | Instant, client-side, simple LP |
| Monthly capacity planning | LP/MIP (HiGHS) | Strategic, batch, cost-focused |
| Hiring budget optimization | MIP (integer hires) | Few variables, fast to solve |
| Training investment ROI | MIP | Binary train/don't train decisions |
| Parts ordering schedule | MIP (lot sizing) | Classic CLSP formulation |
| Multi-location load balancing | MIP | Assignment + capacity, linear costs |
| Quote pricing optimization | LP (continuous prices) | Continuous variables, linear margins |

### Implementation Priority

1. **Quick win (Phase 1):** Add `glpk.js` WASM to the quote promise date UI for instant feasibility feedback. ~1 week effort.

2. **Medium effort (Phase 2):** LP overtime minimization as a post-processing step after `magicSchedule`. Python microservice + Convex action. ~3 weeks effort. Immediate visible value (overtime reduction).

3. **Strategic (Phase 3):** Monthly planning MIP for hiring + training optimization. Surface shadow prices as management insights. ~4 weeks effort. High strategic value for shop managers.

4. **Advanced (Phase 4):** Parts lot sizing MIP integrated with purchase order workflow. Requires parts demand forecasting from scheduled WOs. ~4 weeks effort.

### Key Design Decisions for Athelon

- **Solver:** HiGHS (MIT license) for LP/MIP microservice. OR-Tools SCIP as fallback/alternative for CP-SAT integration path.
- **Language boundary:** Python for optimization logic (access to the full solver ecosystem). TypeScript/Convex for data access, persistence, and UI.
- **Communication:** Convex actions calling a FastAPI microservice over HTTPS. Standard JSON payloads.
- **Data mapping:** `technicians`, `technicianShifts`, `workOrders`, `hangarBays`, `scheduleAssignments`, and `planningFinancialSettings` tables already contain all required LP inputs.
- **Shadow prices:** Always surface to users as dollar-denominated insights, not raw dual values.
- **Optimality guarantees:** Report the optimality gap to users ("within 2% of mathematically optimal") so they understand the solution quality.
