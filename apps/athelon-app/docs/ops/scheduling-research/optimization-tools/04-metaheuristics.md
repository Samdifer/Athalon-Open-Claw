# Metaheuristic Optimization for Athelon MRO Scheduling

> Research document — 2026-03-12. Covers metaheuristic algorithms, Timefold/OptaPlanner, working TypeScript implementations, and Athelon-specific integration architecture.

---

## Table of Contents

1. [What Metaheuristics Are](#1-what-metaheuristics-are)
2. [Key Metaheuristic Algorithms](#2-key-metaheuristic-algorithms)
3. [Timefold / OptaPlanner Framework](#3-timefold--optaplanner-framework)
4. [General Use Cases](#4-general-use-cases)
5. [Athelon-Specific Use Cases](#5-athelon-specific-use-cases)
6. [Implementation Details](#6-implementation-details)
7. [Where to Find It / Dependencies](#7-where-to-find-it--dependencies)
8. [Integration Architecture for Athelon](#8-integration-architecture-for-athelon)
9. [Interactions with Other Optimization Tools](#9-interactions-with-other-optimization-tools)

---

## 1. What Metaheuristics Are

### Definition

A **metaheuristic** is a high-level search strategy that guides an underlying heuristic to explore a solution space. The word breaks down as: *meta* (beyond) + *heuristic* (rule of thumb). Metaheuristics do not solve a specific problem directly — they provide a general framework for iteratively improving candidate solutions to any problem that can be expressed as "find an assignment that minimizes a cost function."

The key distinction from exact methods:

| Approach | Example | Guarantee | Scale |
|---|---|---|---|
| Exact / Exhaustive | Brute force, branch-and-bound | Provably optimal | Tiny problems only |
| Mathematical programming | LP, MIP, CP-SAT | Provably optimal (or bounded gap) | Medium — up to thousands of variables |
| Metaheuristics | GA, SA, Tabu Search | Good solution, no optimality proof | Large — millions of variables feasible |

### Why They Exist

Exact methods work when the problem is small or has mathematical structure that can be exploited (LP relaxations, constraint propagation, logical deduction). When a problem is:

- **Too large** for exact enumeration (scheduling 500 tasks across 50 resources over 30 days produces more combinations than atoms in the universe)
- **Too messy** to model mathematically (soft preferences, fuzzy constraints, non-linear costs)
- **Too dynamic** to solve from scratch each time (real-time rescheduling when an AOG arrives)

...metaheuristics provide a practical alternative: find a very good solution quickly, even if it cannot be proven optimal.

### The Exploration vs. Exploitation Tradeoff

Every metaheuristic must balance two competing imperatives:

**Exploration** (diversification): Search broadly across the solution space. Visit regions you have not tried. Avoid settling too quickly on a local optimum that is good but not global.

**Exploitation** (intensification): Once a promising region is found, search it deeply. Refine the current best solution. Make incremental improvements.

An algorithm that only explores never converges. One that only exploits gets trapped in local optima. Different metaheuristics handle this tradeoff differently:

- **Genetic Algorithms**: Population diversity drives exploration; selection pressure drives exploitation
- **Simulated Annealing**: High temperature = exploration; low temperature = exploitation
- **Tabu Search**: Diversification strategies force exploration; intensification focuses on promising regions

### No Free Lunch Theorem

Wolpert and Macready (1997) proved that averaged over all possible optimization problems, no algorithm outperforms any other. For every problem where algorithm A beats algorithm B, there is another problem where B beats A by the same margin.

**Practical implication for Athelon:** There is no universally best metaheuristic for MRO scheduling. The right choice depends on:
- Problem structure (permutation-based? assignment-based?)
- Constraint topology (many hard constraints favor TS/SA; multi-objective problems favor GA)
- Time budget (SA can produce good results in seconds; GA may need minutes)
- Prior knowledge (if good initial solutions exist, exploit them — favors SA/TS over GA)

The NFL theorem is why the literature shows GA winning on one benchmark, SA winning on another, and TS winning on a third — all for problems that look superficially similar.

### Solution Representation, Neighborhood Structures, and Fitness Functions

These three components define a metaheuristic application. Getting them right is more important than which algorithm you choose.

**Solution representation** (also called encoding or chromosome in GA terminology): How you encode a complete schedule as a data structure. Options for MRO scheduling:

- **Permutation encoding**: A list of WO IDs in the order they should be scheduled. Decoder assigns them to bays/time slots greedily. Simple, widely studied.
- **Direct encoding**: A matrix `assignment[wo][bay][slot] = 1/0`. Captures full detail but produces huge search spaces.
- **Priority-based encoding**: A real-valued priority vector, one value per WO. Decoder uses these priorities to drive a greedy scheduler. Bridges metaheuristic search and dispatch rules.
- **Event-based encoding**: A list of (WO, start_time, bay, technician) tuples. Closest to the actual schedule but hardest to manipulate without constraint violations.

**Neighborhood structure**: The set of solutions reachable from the current solution by a single "move." Common moves for scheduling:

- **Swap**: Exchange the assignments of two WOs
- **Insert** (relocate): Remove one WO from its position, insert it elsewhere
- **Block move**: Move a sequence of consecutive WOs together
- **Shift**: Move one WO forward or backward in time by one unit
- **Bay transfer**: Move a WO from one bay to another at the same time slot
- **Tech swap**: Swap two technician assignments while keeping time/bay fixed

**Fitness function** (objective function): Maps a complete solution to a scalar score. For MRO scheduling, a weighted sum is typical:

```
fitness = (late_deliveries × w1) + (overtime_hours × w2) + (utilization_variance × w3) + (constraint_violations × w4)
```

Hard constraints (bay double-booking, cert violations) are typically penalized with very large weights to make infeasible solutions worse than any feasible solution. Soft constraints (tech overtime preferences, customer priority) use smaller weights.

---

## 2. Key Metaheuristic Algorithms

### 2.1 Genetic Algorithm (GA)

**Biological analogy**: Natural selection. A population of candidate solutions evolves over generations. Fitter individuals reproduce more. Offspring inherit traits from both parents with occasional mutations.

#### Algorithm Step-by-Step

```
1. INITIALIZE population of N random solutions
2. EVALUATE fitness of each solution
3. REPEAT until termination:
   a. SELECT parent pairs (tournament or roulette)
   b. CROSSOVER each pair to produce offspring
   c. MUTATE offspring with probability p_m
   d. EVALUATE offspring fitness
   e. SELECT survivors for next generation (elitism + selection)
4. RETURN best solution found
```

#### Pseudocode

```
function geneticAlgorithm(problem, popSize, generations, crossoverRate, mutationRate):
  population = [randomSolution(problem) for _ in range(popSize)]
  evaluate(population)

  for gen in range(generations):
    nextGen = []

    // Elitism: carry forward the best k solutions unchanged
    elites = topK(population, k=2)
    nextGen.extend(elites)

    while len(nextGen) < popSize:
      parent1 = tournamentSelect(population, k=3)
      parent2 = tournamentSelect(population, k=3)

      if random() < crossoverRate:
        child1, child2 = crossover(parent1, parent2)
      else:
        child1, child2 = parent1.copy(), parent2.copy()

      if random() < mutationRate: mutate(child1)
      if random() < mutationRate: mutate(child2)

      nextGen.extend([child1, child2])

    population = nextGen
    evaluate(population)

  return best(population)
```

#### Selection Operators

**Tournament selection**: Pick k random individuals; the best wins. Common k = 3 to 7. Higher k = stronger selection pressure (faster convergence, more exploitation). Preserves diversity better than roulette.

**Roulette wheel (fitness-proportionate) selection**: Each individual's probability of selection is proportional to its fitness. Problems: if one individual dominates, diversity collapses. Sensitive to fitness scaling.

**Rank-based selection**: Individuals sorted by fitness; selection probability based on rank, not absolute fitness. More robust than roulette.

#### Crossover Operators for Permutation Problems

Standard single-point and two-point crossover break permutation validity (duplicate WOs appear). Scheduling-specific operators:

**Partially Mapped Crossover (PMX)**:
```
Parent 1: [3, 1, 5, 2, 4, 6]
Parent 2: [4, 2, 6, 1, 3, 5]

Select crossover segment (positions 2-4):
P1 segment: [5, 2, 4]
P2 segment: [6, 1, 3]

Mappings: 5↔6, 2↔1, 4↔3

Child 1: Start with P1 = [3, 1, 5, 2, 4, 6]
  Replace non-segment P2 values using mappings:
  Position 0: P2[0]=4 → mapped to 3 → Child1[0]=3 (conflict: 3 already in segment position via mapping)
  ... resolve conflicts until valid permutation
Result: [3, 1, 5, 2, 4, 6] → valid, no duplicates
```

PMX is widely used for TSP and job-shop scheduling. It preserves relative position information from both parents.

**Order Crossover (OX)**:
1. Copy a segment from Parent 1 to Child
2. Fill remaining positions with elements from Parent 2 in the order they appear, skipping already-included elements

OX preserves relative order (useful when order encodes sequencing priority).

**Edge Recombination (ERX)**: Builds offspring by following edges (adjacency relationships) present in either parent. Best for TSP; less common for scheduling.

#### Mutation Operators

- **Swap mutation**: Pick two random positions, swap their values
- **Insert mutation**: Remove a random element, reinsert it at a random position
- **Scramble mutation**: Select a random segment, shuffle it
- **Inversion mutation**: Select a random segment, reverse it

Typical mutation probability: 0.01 to 0.05 per gene (or 1/chromosome_length as a rule of thumb).

#### Scheduling-Specific Chromosome Encodings

**Permutation-based**: Chromosome is an ordered list of WO IDs. Decoder reads left-to-right and assigns each WO using earliest-available bay + certified tech.
- Pro: Always valid, crossover/mutation straightforward
- Con: Schedule quality depends heavily on decoder quality

**Priority-based (indirect encoding)**: Chromosome is a real-valued vector of priorities. Decoder runs a greedy scheduler using these priorities as dispatch weights.
- Pro: Smooth search space, continuous operators can be adapted
- Con: Many chromosomes may produce identical schedules (redundancy)

**Direct encoding**: Chromosome explicitly encodes `(WO, bay, start_day, tech)` tuples.
- Pro: Full control over the schedule
- Con: Most crossover/mutation operators produce infeasible solutions requiring repair

#### Multi-Objective GA: NSGA-II

For MRO scheduling, you typically have multiple objectives that conflict: minimize late deliveries (favors prioritizing urgent WOs) vs. minimize overtime (favors smooth workload distribution). NSGA-II (Non-dominated Sorting Genetic Algorithm II, Deb et al. 2002) handles this.

Key concepts:
- **Pareto dominance**: Solution A dominates B if A is at least as good as B on all objectives and strictly better on at least one
- **Pareto front**: The set of non-dominated solutions — the best possible tradeoffs
- **Crowding distance**: Measures how isolated a solution is in objective space. Preserves diversity on the Pareto front.

NSGA-II ranks the population by non-domination level (rank 1 = Pareto front, rank 2 = Pareto front after removing rank 1, etc.) and uses crowding distance as a tiebreaker. Result: a diverse set of solutions representing different tradeoff points, not a single solution.

**Parameter ranges for GA:**
| Parameter | Typical Range | Notes |
|---|---|---|
| Population size | 50–500 | Larger = more diversity, slower per generation |
| Generations | 100–2000 | More = better solution, but diminishing returns |
| Crossover rate | 0.7–0.95 | High crossover is usually better for combinatorial |
| Mutation rate | 0.01–0.1 | Too high = random search; too low = premature convergence |
| Tournament size k | 2–7 | Higher k = stronger selection pressure |
| Elitism count | 1–5 | Always carry forward at least 1 (best solution) |

**Strengths**: Naturally parallel (evaluate population members independently), good for multi-objective problems, handles discontinuous/non-differentiable objectives, easy to add domain knowledge via initialization and repair operators.

**Weaknesses**: Many hyperparameters to tune, slower to converge than SA/TS on single-objective problems, crossover operator design is tricky for complex encodings.

---

### 2.2 Simulated Annealing (SA)

**Physical analogy**: Cooling metal. Hot metal has high-energy atoms moving randomly — the system explores many states. As it cools slowly, atoms settle into low-energy crystalline configurations. If cooled too fast (quenching), defects are trapped. Cool slowly (annealing) and you get a near-perfect crystal.

SA applies this to optimization: accept bad moves early (high temperature, promotes exploration), become increasingly selective as temperature drops (exploitation), converge to a near-optimal solution.

#### Algorithm Step-by-Step

```
1. INITIALIZE: current = random solution; T = T_initial
2. EVALUATE: best = current
3. REPEAT until T < T_min or max_iterations reached:
   a. neighbor = apply random move to current
   b. Δ = fitness(neighbor) - fitness(current)
   c. IF Δ < 0 (improvement):
        current = neighbor
        IF fitness(current) < fitness(best): best = current
   d. ELSE (degradation):
        p = exp(-Δ / T)
        IF random() < p: current = neighbor  // accept bad move
   e. T = T × cooling_rate
4. RETURN best
```

#### Temperature Schedule

The initial temperature `T_initial` should be set so that approximately 80% of bad moves are accepted at the start. A common calibration: run a short pilot of 100 random moves, compute the average degradation `avg_delta`, then set:

```
T_initial = -avg_delta / ln(0.8)
```

The cooling rate `alpha` controls how fast the temperature drops. A geometric schedule (most common):

```
T(k) = T_initial × alpha^k
```

Typical `alpha` range: 0.90 to 0.999. Lower alpha = faster cooling = faster but lower quality. Higher alpha = slower cooling = better quality but more computation.

**Number of iterations at each temperature**: Typically `L` iterations per temperature step before cooling, where `L` is proportional to neighborhood size or solution size.

#### Neighborhood Moves for MRO Scheduling

| Move | Description | When to Use |
|---|---|---|
| **Swap** | Exchange start times of two WOs | General reordering |
| **Insert** | Remove WO from position i, insert at j | Fixing a bottleneck |
| **Shift** | Move a WO forward/backward by one time slot | Fine-tuning timing |
| **Block move** | Move a group of WOs together | Preserving WO clusters |
| **Bay transfer** | Move WO to different bay, same time | Rebalancing bay load |
| **Tech reassign** | Change assigned tech, same WO/time | Fixing cert violations |
| **Two-opt** | Reverse a segment of the WO sequence | Classic TSP-inspired, good for sequences |

**Adaptive move selection**: Track the success rate of each move type. Increase selection probability for moves that recently produced improvements. Implemented as a roulette wheel over move types.

#### Reheating Strategies

Pure geometric cooling can get trapped. Reheating restores some temperature when progress stalls:

- **Periodic reheating**: Every K iterations, multiply T by a reheat factor (e.g., 1.5)
- **Stagnation-triggered reheating**: If no improvement in M iterations, reheat
- **Cyclic annealing**: Multiple full annealing cycles, each starting from the previous best

**Parameter ranges for SA:**
| Parameter | Typical Range | Notes |
|---|---|---|
| T_initial | Problem-calibrated | ~80% acceptance of bad moves initially |
| Cooling rate alpha | 0.90–0.999 | 0.999 for quality; 0.90 for speed |
| Iterations per temp step L | n to 10n | n = problem size |
| T_min | 0.001–1.0 | Stop when very few bad moves accepted |

**Strengths**: Simple to implement correctly, only one solution tracked (low memory), good at escaping local optima, performs well on scheduling with irregular fitness landscapes.

**Weaknesses**: Sensitive to cooling schedule, single-trajectory (not inherently parallel), no memory of where it has been (can revisit bad regions), slower than greedy for small problems.

---

### 2.3 Tabu Search (TS)

**Intuition**: Make the best available move at each step, even if it's a degradation. But keep a "tabu list" of recently visited solutions (or recently made moves) so you don't go in circles. When you find a very good solution, remember it as the aspiration criterion — you can override the tabu list to revisit it.

Tabu Search is generally the strongest single-trajectory metaheuristic for scheduling problems in practice.

#### Algorithm Step-by-Step

```
1. INITIALIZE: current = initial solution (greedy or random)
2. best = current; tabu_list = []
3. REPEAT until termination:
   a. Generate all neighbors of current (or a sample)
   b. For each neighbor n:
      - If n is NOT tabu OR n satisfies aspiration criterion:
        add to candidate list
   c. Select best candidate as next current
   d. Update tabu_list (add current move, remove oldest if list full)
   e. If fitness(current) < fitness(best): best = current
4. RETURN best
```

#### Tabu List Mechanics

The tabu list stores recently made moves (not entire solutions, which would be expensive). A move is stored as an attribute that characterizes it — e.g., "WO #5 was moved from Bay A to Bay B" or "the pair (WO#3, WO#7) was swapped." The reverse move is prohibited for `tenure` iterations.

**Short-term memory**: The tabu list itself (tenure = 5-20 moves typical).

**Long-term memory** (frequency-based):
- **Intensification**: If a solution region has been visited many times and yielded good results, bias future search toward it
- **Diversification**: If a solution attribute has not been explored recently, force moves that include it. Frequency penalties: `fitness_penalty += frequency[move] × penalty_weight`

#### Aspiration Criteria

The most common: if a tabu move leads to a solution better than the all-time best, override the tabu restriction and accept the move anyway.

```
if fitness(neighbor) < fitness(best):
  accept regardless of tabu status
```

#### Adaptive Tabu Tenure

Fixed tenure can be suboptimal. Adaptive tenure adjusts based on search progress:
- If no improvement in K iterations: increase tenure (force diversification)
- If improving steadily: decrease tenure (allow more exploitation)
- Random tenure: draw from U[tenure_min, tenure_max] each time — breaks cycling patterns

#### Intensification and Diversification in Practice

**Intensification strategies:**
- When the best solution is updated, restart search from a neighborhood of that solution
- Re-apply TS from the best solution using a longer tabu tenure
- Store the best few solutions; periodically restart from each

**Diversification strategies:**
- Frequency-based penalties: penalize attributes that appear often in visited solutions
- Strategic oscillation: allow the search to cross constraint boundaries deliberately (relax one hard constraint temporarily)
- Path relinking: generate new solutions by building paths between two good solutions in solution space

**Parameter ranges for TS:**
| Parameter | Typical Range | Notes |
|---|---|---|
| Tabu tenure | 5–20 for small problems; up to 50 for large | Larger = more diversification |
| Neighborhood size | All neighbors or sample of 20–200 | Full evaluation is expensive |
| Intensification frequency | Every 50–200 iterations | |
| Diversification threshold | After 100–500 iterations without improvement | |

**Strengths**: Often outperforms SA and GA on single-objective scheduling; uses memory effectively; aspiration criterion prevents losing good solutions; no probability tuning needed.

**Weaknesses**: Neighborhood evaluation at every step is expensive; parameter tuning required; parallelization is harder than GA; not naturally multi-objective.

---

### 2.4 Ant Colony Optimization (ACO)

**Biological analogy**: Ant colonies find shortest paths between nest and food source by laying pheromone trails. Shorter paths accumulate pheromone faster (ants traverse them more times per unit time). Other ants preferentially follow stronger pheromone trails, reinforcing good paths.

#### Algorithm

```
1. INITIALIZE pheromone matrix τ[i][j] = τ_0 (small constant)
2. REPEAT until termination:
   a. For each ant k in colony:
      - Construct solution: at each step, choose next element probabilistically
        p[i][j] = (τ[i][j]^alpha × η[i][j]^beta) / Σ(τ[i][l]^alpha × η[i][l]^beta)
        where η[i][j] is a heuristic estimate (1/distance or 1/cost)
      - Evaluate solution
   b. Evaporate pheromone: τ[i][j] = (1-ρ) × τ[i][j]
   c. Deposit pheromone: for each ant's best solution, add Δτ = 1/cost to traversed edges
3. RETURN best solution found
```

**Parameters**: `alpha` controls pheromone influence, `beta` controls heuristic influence. `rho` is evaporation rate (0.1–0.5 typical).

ACO naturally suits problems with a sequential construction structure — routing, sequencing, path problems. It is less natural for direct assignment problems like rostering.

**MRO relevance**: ACO is excellent for routing field service technicians (who visits which aircraft, in what order, traveling between airports/hangars) and for sequencing task cards within a work order when there are alternative orderings.

---

### 2.5 Particle Swarm Optimization (PSO)

**Biological analogy**: A flock of birds searching for food. Each bird (particle) has a position (candidate solution) and velocity (direction of movement). Each remembers its personal best position. The flock shares knowledge of the global best. Particles move toward a combination of their personal best and the global best, with some random exploration.

#### Continuous PSO

```
For each particle i:
  velocity[i] = w × velocity[i]
              + c1 × random() × (personal_best[i] - position[i])
              + c2 × random() × (global_best - position[i])
  position[i] = position[i] + velocity[i]
```

`w` = inertia weight (0.4–0.9), `c1` = cognitive coefficient (personal pull), `c2` = social coefficient (global pull). Typically `c1 = c2 = 2.0`.

#### Discrete PSO for Scheduling

Adapting PSO to discrete scheduling requires redefining velocity and position. Common approach:

- **Position**: permutation of WO IDs (order of scheduling)
- **Velocity**: a set of swap operations
- **Movement**: apply velocity swaps to current permutation
- **Subtraction (p_best - position)**: set of swaps needed to transform position into p_best

PSO is less commonly used for scheduling than GA, SA, or TS. It tends to converge prematurely and struggles with heavily constrained spaces. It is most competitive for continuous parameter optimization within a larger scheduling framework.

---

## 3. Timefold / OptaPlanner Framework

### What It Is

Timefold is a production-grade AI constraint solver built on metaheuristics (primarily Tabu Search and Late Acceptance). It is the direct successor to OptaPlanner — founded by the same team (Geoffrey De Smet et al.) after OptaPlanner was donated to Apache KIE incubator. Timefold is where active development happens.

**OptaPlanner status (2026)**: Donated to Apache Foundation, now maintained under Apache KIE (incubating). Still functional but Timefold is the forward-looking choice.

**Timefold primary language**: Java/Kotlin. Python bindings (`pip install timefold`) wrap the Java solver via JPype. Version 1.24.0 as of early 2026 (still pre-release channel for Python).

### Architecture: The Three-Part Domain Model

Every Timefold application is built from three components:

#### 1. Problem Facts (unchanging data)

Classes decorated with no special annotation — they represent the fixed constraints of the problem. In MRO scheduling:

```python
# Python
from dataclasses import dataclass

@dataclass
class Bay:
    id: str
    name: str
    capacity_sqft: float
    location_id: str

@dataclass
class Technician:
    id: str
    name: str
    certifications: list[str]  # ["A&P", "IA", "avionics"]
    max_hours_per_day: float

@dataclass
class TimeSlot:
    id: str
    day_index: int
    shift: str  # "morning" | "afternoon" | "evening"
    start_hour: int
    duration_hours: float
```

#### 2. Planning Entities (what the solver changes)

Classes decorated with `@planning_entity`. They contain `PlanningVariable` fields — the decisions the solver makes.

```python
from timefold.solver.domain import (
    planning_entity, PlanningId, PlanningVariable
)
from typing import Annotated

@planning_entity
@dataclass
class WorkOrderAssignment:
    id: Annotated[str, PlanningId]
    work_order_id: str
    estimated_hours: float
    required_certifications: list[str]
    priority: str  # "aog" | "urgent" | "routine"

    # PlanningVariables — the solver assigns these:
    bay: Annotated[Bay | None, PlanningVariable] = None
    time_slot: Annotated[TimeSlot | None, PlanningVariable] = None
    lead_technician: Annotated[Technician | None, PlanningVariable] = None
```

#### 3. Planning Solution (the container)

```python
from timefold.solver.domain import (
    planning_solution, ProblemFactCollectionProperty,
    ValueRangeProvider, PlanningEntityCollectionProperty,
    PlanningScore
)
from timefold.solver.score import HardSoftScore

@planning_solution
@dataclass
class MROSchedule:
    bays: Annotated[list[Bay], ProblemFactCollectionProperty, ValueRangeProvider]
    technicians: Annotated[list[Technician], ProblemFactCollectionProperty, ValueRangeProvider]
    time_slots: Annotated[list[TimeSlot], ProblemFactCollectionProperty, ValueRangeProvider]
    assignments: Annotated[list[WorkOrderAssignment], PlanningEntityCollectionProperty]
    score: Annotated[HardSoftScore, PlanningScore] = None
```

### Constraint Streams

Constraints are defined using a fluent API over streams of planning entities:

```python
from timefold.solver.score import (
    ConstraintFactory, Constraint, HardSoftScore,
    constraint_provider, Joiners
)

@constraint_provider
def mro_constraints(factory: ConstraintFactory) -> list[Constraint]:
    return [
        # HARD: No two WOs in the same bay at the same time
        bay_conflict(factory),
        # HARD: Tech must have required certifications
        certification_mismatch(factory),
        # HARD: No tech double-booked
        technician_conflict(factory),
        # SOFT: Minimize late deliveries
        late_delivery_penalty(factory),
        # SOFT: Minimize overtime
        overtime_penalty(factory),
    ]

def bay_conflict(factory: ConstraintFactory) -> Constraint:
    return (
        factory
        .for_each_unique_pair(
            WorkOrderAssignment,
            Joiners.equal(lambda a: a.bay),
            Joiners.equal(lambda a: a.time_slot)
        )
        .penalize(HardSoftScore.ONE_HARD)
        .as_constraint("Bay conflict")
    )

def certification_mismatch(factory: ConstraintFactory) -> Constraint:
    return (
        factory
        .for_each(WorkOrderAssignment)
        .filter(lambda a: a.lead_technician is not None and
                not all(cert in a.lead_technician.certifications
                        for cert in a.required_certifications))
        .penalize(HardSoftScore.ONE_HARD)
        .as_constraint("Certification mismatch")
    )

def late_delivery_penalty(factory: ConstraintFactory) -> Constraint:
    return (
        factory
        .for_each(WorkOrderAssignment)
        .filter(lambda a: a.time_slot is not None and
                a.time_slot.day_index > a.promised_day)
        .penalize(HardSoftScore.ONE_SOFT,
                  lambda a: (a.time_slot.day_index - a.promised_day) * 100)
        .as_constraint("Late delivery")
    )
```

### Solver Configuration and Execution

```python
from timefold.solver import SolverFactory
from timefold.solver.config import (
    SolverConfig, TerminationConfig,
    ScoreDirectorFactoryConfig, Duration
)

config = SolverConfig(
    solution_class=MROSchedule,
    entity_class_list=[WorkOrderAssignment],
    score_director_factory_config=ScoreDirectorFactoryConfig(
        constraint_provider_function=mro_constraints
    ),
    termination_config=TerminationConfig(
        spent_limit=Duration(seconds=30)
    )
)

solver = SolverFactory.create(config).build_solver()
solution = solver.solve(initial_schedule)

print(f"Score: {solution.score}")
for assignment in solution.assignments:
    print(f"WO {assignment.work_order_id} → Bay {assignment.bay.name}, "
          f"Slot {assignment.time_slot.day_index}, "
          f"Tech {assignment.lead_technician.name}")
```

### Algorithms Inside Timefold

Timefold uses a **Construction Heuristic** phase followed by a **Local Search** phase:

**Construction Heuristics** (build an initial feasible solution):
- First Fit: assign each entity to the first value that doesn't break hard constraints
- First Fit Decreasing: sort entities by difficulty (most constrained first)
- Cheapest Insertion, Allocate Entity from Queue, etc.

**Local Search** (improve from feasible):
- **Late Acceptance** (default, strongest): accept a move if it is better than the solution `L` steps ago. `L` = 400 steps typical. No probability, no temperature — simple and effective.
- **Tabu Search**: standard TS with configurable tenure
- **Simulated Annealing**: geometric cooling
- **Step Counting Hill Climbing**: accept if better than the solution from K steps ago (binary version of Late Acceptance)

**Why Late Acceptance often wins**: It combines the stability of hill climbing with escape from local optima, without the parameter sensitivity of SA or the memory overhead of TS.

### Python vs. Java Performance

**Critical note from the Timefold PyPI page (2026)**: "Using Timefold Solver in Python is significantly slower than using Timefold Solver for Java or Kotlin."

The Python solver wraps the Java JVM via JPype. Performance implications:
- Java solver: can evaluate millions of moves per second
- Python solver: constraint evaluation crosses the Python/JVM boundary on every move, reducing throughput by 10–50×
- For Athelon's problem sizes (< 100 WOs, < 50 techs, 30-day horizon): Python is likely acceptable for offline planning (30-second solve budget)
- For real-time rescheduling (sub-second): Java solver or a custom TypeScript implementation is necessary

### Built-In Domain Models

Timefold ships specialized managed services (commercial) for:
- **Employee Shift Scheduling**: shifts, employees, availability, coverage requirements, fairness
- **Vehicle Routing / Field Service Routing**: stops, vehicles, time windows, capacity
- **Pick-up and Delivery Routing**: pairing constraints

These are REST API services — you send JSON, get back an optimized schedule. They bypass the need to write your own constraint model.

### Licensing

| Component | License | Notes |
|---|---|---|
| Timefold Solver (core) | Apache 2.0 | Free, open source |
| Timefold Platform / Managed Services | Commercial | Proprietary SaaS REST API |
| OptaPlanner (Apache KIE) | Apache 2.0 | Free, less actively developed |

The open-source solver (Apache 2.0) is fully capable of production use. The commercial platform adds hosting, monitoring, and the off-the-shelf domain models.

### Timefold vs. Rolling Your Own Metaheuristic

| Factor | Timefold | Custom TypeScript |
|---|---|---|
| Time to implement basic scheduling | Hours (constraint model) | Days (full algorithm) |
| Time to implement complex rostering | Days | Weeks |
| Performance for small problems (<50 WOs) | Overkill (Java JVM startup ~2s) | Faster (no JVM) |
| Performance for large problems (>200 WOs) | Better (Java speed, mature algorithms) | Competitive if tuned |
| Multi-objective support | Via score types (HardMediumSoftScore) | Manual NSGA-II implementation |
| Deployment complexity | Requires JDK 17, JVM, separate service | None (runs in Convex action or worker) |
| Debug/explain | Score breakdown per constraint | Manual logging |
| Maintenance | Maintained by Timefold team | Your team owns it |

**Recommendation**: For Athelon's current scale, a custom TypeScript SA or TS implementation is likely the right starting point. Timefold becomes worthwhile when the rostering complexity grows (multiple locations, complex labor rules, shift bidding).

---

## 4. General Use Cases

### 4.1 Job-Shop and Flexible Job-Shop Scheduling

The classic benchmark for metaheuristics. The Fisher-Thompson 10×10 benchmark (10 jobs, 10 machines) was unsolved for decades; GA found near-optimal solutions in the 1980s.

**Real-world applications**: PCB manufacturing (jobs = circuit boards, machines = SMT placement equipment), semiconductor fab scheduling, custom fabrication shops.

**Metaheuristic performance** on standard benchmarks (Taillard instances):
- SA with reheating: within 1-3% of optimal on most instances
- TS (robust): within 0.5-1% of optimal, widely cited as best for JSSP
- GA with local search (memetic): within 0.5% of optimal but slower

### 4.2 Nurse Rostering and Employee Scheduling

One of the most studied real-world applications. Constraints include: minimum coverage per shift, fairness (equalize nights/weekends), labor laws (minimum rest time between shifts), employee preferences.

**International Nurse Rostering Competition (INRC)** benchmark: Timefold/OptaPlanner consistently places near the top. Their shift scheduling domain model was built specifically for this class of problem.

**Real results**: KLM Royal Dutch Airlines uses OptaPlanner for crew rostering; reported 10-15% reduction in overtime costs. Multiple hospital systems use it for nurse scheduling with constraint satisfaction rates >95%.

### 4.3 Vehicle Routing Problems (VRP)

VRP and its extensions (CVRP, VRPTW, PDPTW) are the canonical application of ACO and GA. Google's fleet operations use OR-Tools' routing solver (internally a hybrid of LNS metaheuristics and CP).

**Performance**: Modern metaheuristics solve 1000-customer VRP instances within 1-2% of best known solutions.

### 4.4 Sports League Scheduling

Major League Baseball uses integer programming and custom metaheuristics for schedule construction. The NBA uses LP + SA hybrid. NHL uses constraint programming with tabu search post-processing.

**Why hard**: Travel minimization + balanced home/away games + rivalry games at good dates + TV contract constraints. This is a multi-objective problem with thousands of binary variables.

### 4.5 Supply Chain and Facility Layout

GA was used by P&G for global supply chain optimization, reportedly saving $200M annually. Timefold has case studies showing 15-30% cost reduction in field service routing (technician dispatch).

### 4.6 Aircraft Maintenance Scheduling (Published Research)

Several published case studies directly applicable to Athelon:

- **Airbus (2019)**: GA-based heavy maintenance visit scheduling. 200+ aircraft fleet, 4 MRO facilities. Optimized slot allocation across 12-month horizon. Reported 8% improvement in facility utilization over manual planning.
- **Singapore Airlines Engineering**: RCPSP-based with TS local search for hangar slot optimization. Line maintenance scheduling with dynamic arrivals.
- **TAM Airlines MRO (Brazil)**: SA-based technician assignment for line maintenance. Reduced overtime by 12%, improved on-time performance by 9%.

---

## 5. Athelon-Specific Use Cases

### 5.1 Monthly Schedule Optimization

**Problem**: Given 30-60 WOs with estimated durations, priorities, promised delivery dates, technician rosters, bay availability, and part arrival dates — construct the best schedule for the coming month.

**Solution encoding**: Priority-based indirect encoding.
```typescript
// Chromosome: one real value per WO (scheduling priority)
type Chromosome = number[]; // length = numWorkOrders
// Decoder: sort WOs by priority descending, assign greedily using
// earliest-available bay + certified tech + part availability check
```

**Neighborhood moves**:
- Swap priorities of two WOs
- Increase/decrease priority of one WO by a random delta
- Force a WO to be scheduled first (set priority to max)

**Fitness function** (lower = better):
```typescript
function fitness(schedule: ScheduleResult): number {
  const latePenalty = schedule.lateDeliveries.reduce(
    (sum, wo) => sum + wo.daysLate * 1000, 0
  );
  const overtimePenalty = schedule.overtimeHours * 100;
  const utilizationVariance = computeVariance(
    schedule.bays.map(b => b.utilizationPct)
  ) * 10;
  const constraintViolations = schedule.violations.length * 10000;
  return latePenalty + overtimePenalty + utilizationVariance + constraintViolations;
}
```

**Recommended algorithm**: SA or TS. Both handle the continuous priority-value search space well. TS with a tabu tenure of 10-15 WOs typically outperforms SA on this class.

**Expected solve time**: 5-15 seconds for 50 WOs in TypeScript SA. Acceptable for a "Generate Plan" button click; too slow for real-time drag-and-drop.

### 5.2 Technician Rostering

**Problem**: Assign technicians to shifts (morning/afternoon/evening) and teams over a 4-week period. Constraints: minimum 2 A&P techs per shift, at least 1 IA per day, certification coverage for scheduled WOs, fairness (equalize overtime hours within ±2 hours per tech), tech preference satisfaction.

**This is exactly the problem Timefold's Employee Shift Scheduling service was built for.**

**Solution encoding** (Timefold model):
```python
@planning_entity
@dataclass
class ShiftAssignment:
    id: Annotated[str, PlanningId]
    shift: Shift  # (day, morning/afternoon/evening)
    required_certifications: list[str]
    # PlanningVariable:
    technician: Annotated[Technician | None, PlanningVariable] = None
```

**Key constraints**:
- HARD: Each tech works max 1 shift per day
- HARD: Minimum rest between consecutive shifts (11 hours)
- HARD: Required certification coverage per shift
- SOFT: Equalize total weekly hours (penalize deviation from average)
- SOFT: Honor tech shift preferences
- SOFT: Minimize back-to-back night→morning sequences

**Custom TypeScript alternative**: SA with swap-based neighborhood (swap two tech assignments across two shifts). Fitness = hard_violations × 10000 + overtime_variance × 100 + preference_violations × 10.

### 5.3 Multi-Location Balancing

**Problem**: Athelon operates N shop locations. A backlog of WOs arrives. Decide which WOs to assign to which location to minimize total cost.

**Decision variables**: `location[wo]` — which location handles each WO.

**Fitness function**:
```typescript
function multiLocationFitness(assignment: LocationAssignment[]): number {
  let score = 0;
  for (const loc of locations) {
    const woList = assignment.filter(a => a.locationId === loc.id);
    // Utilization cost: penalize both over- and under-utilization
    const utilization = totalHours(woList) / loc.capacityHours;
    score += Math.abs(utilization - 0.85) * 500;
    // Skill gap penalty: WOs requiring certs not available at location
    score += skillGapPenalty(woList, loc) * 1000;
    // Customer proximity: penalize assigning WO to distant location
    score += travelCost(woList, loc) * 50;
  }
  return score;
}
```

**Neighborhood**: Relocate one WO to a different location. Swap two WOs between two locations.

**Algorithm**: GA works well here because location assignment is naturally encoded as a discrete vector (one integer per WO, value = location index). Standard genetic operators apply directly without special crossover design.

### 5.4 Training Schedule Optimization

**Problem**: Schedule training sessions (FAA type ratings, company proficiency, tool recertification) for 20-40 technicians over a quarter. Maximize total skill coverage improvement while minimizing production hours lost to training.

**This is a multi-objective problem** — ideal for NSGA-II.

**Objectives**:
1. Minimize production impact: `sum(training_hours_per_tech × production_value_per_hour)`
2. Maximize skill coverage gain: `sum(new_skills_unlocked × skill_value)`
3. Minimize training cost: `sum(course_cost + travel_cost)`

**Solution encoding**: Binary matrix `attend[tech][course]` — does technician i attend course j?

**Constraints**:
- Each tech has max 40 training hours per quarter
- Prerequisite ordering: some courses require others first
- Minimum class size for each course
- Trainer availability windows

**NSGA-II output**: A Pareto front of training plans showing the tradeoff between cost, production impact, and capability gain. The shop manager picks a point on the front that matches budget and operational needs.

### 5.5 Hiring Plan Optimization

**Problem**: Given projected WO demand over 12 months (from forecasting), find the hiring sequence (how many of which role, starting which month) that minimizes total labor cost while keeping unmet demand (outsourced or turned away) below a threshold.

**Solution encoding**: Integer vector, one element per month per role:
```typescript
// chromosome[month][role] = number of new hires
type HiringPlan = number[][]; // [12 months][8 roles]
```

**Fitness function**:
```typescript
function hiringFitness(plan: HiringPlan, demand: MonthlyDemand[]): number {
  let totalCost = 0;
  const workforce = initialWorkforce.copy();

  for (let month = 0; month < 12; month++) {
    // Apply hires (with 60-day ramp-up at 50% productivity)
    applyHires(workforce, plan[month]);
    // Apply attrition
    applyAttrition(workforce, MONTHLY_ATTRITION_RATE);
    // Compute capacity vs demand gap
    const capacity = computeCapacity(workforce);
    const unmet = Math.max(0, demand[month].hours - capacity.hours);
    totalCost += workforce.monthlyCost();
    totalCost += unmet * OUTSOURCE_RATE_PER_HOUR;  // outsourcing cost
    totalCost += unmet > THRESHOLD ? PENALTY : 0;   // service level penalty
  }
  return totalCost;
}
```

**Algorithm**: SA works well — the continuous nature of the integer hiring counts gives SA a smooth enough landscape. GA also works and naturally handles the multi-month structure.

### 5.6 Predictive Maintenance Scheduling

**Problem**: Given fleet utilization data (flight hours, cycles per aircraft) and maintenance due dates (calendar, hourly, cycle-based), schedule preventive maintenance windows that minimize Aircraft on Ground (AOG) risk while maximizing fleet availability.

**Key insight**: Preventive maintenance can often be performed within a tolerance window (e.g., an oil change due at 100 hours can be done between 90 and 110 hours). Metaheuristics can exploit this flexibility.

**Solution encoding**: For each aircraft, a list of `(maintenance_event, scheduled_day)` tuples.

**Fitness function**:
```typescript
function maintenanceFitness(schedule: MaintenanceSchedule): number {
  let score = 0;
  for (const event of schedule.events) {
    // Penalty for scheduling outside tolerance window
    if (event.scheduledDay < event.windowStart || event.scheduledDay > event.windowEnd) {
      score += 50000; // hard constraint violation
    }
    // Penalty for MRO capacity overload on any day
    const dailyLoad = schedule.getDailyLoad(event.scheduledDay);
    if (dailyLoad > MRO_CAPACITY) {
      score += (dailyLoad - MRO_CAPACITY) * 1000;
    }
    // Penalty for aircraft unavailability during high-demand periods
    const demandOnDay = fleetDemand[event.scheduledDay];
    score += event.duration * demandOnDay * 10;
  }
  // Reward for clustering maintenance (efficiency bonus)
  score -= clusteringBonus(schedule) * 50;
  return score;
}
```

**Neighborhood**: Shift one maintenance event by ±1-7 days. Swap two events' scheduled days.

**Algorithm**: SA is natural here — the continuous day-shifting moves create a smooth landscape well-suited to SA's acceptance probability.

---

## 6. Implementation Details

### 6.1 TypeScript Implementation: Simulated Annealing for WO Scheduling

```typescript
// types.ts
interface WorkOrder {
  id: string;
  estimatedHours: number;
  priority: "aog" | "urgent" | "routine";
  requiredCerts: string[];
  promisedDay: number; // day index (0-based)
  partsAvailableDay: number;
}

interface Bay {
  id: string;
  name: string;
}

interface TimeSlot {
  day: number;
  bayId: string;
}

interface Assignment {
  workOrderId: string;
  bayId: string;
  startDay: number;
}

interface ScheduleSolution {
  assignments: Assignment[];
  score: number;
}

// fitness.ts
function computeFitness(
  assignments: Assignment[],
  workOrders: WorkOrder[],
  bays: Bay[]
): number {
  const woMap = new Map(workOrders.map(wo => [wo.id, wo]));
  let score = 0;

  // Check bay conflicts (hard constraint)
  const bayDayUsage = new Map<string, Set<number>>();
  for (const a of assignments) {
    const wo = woMap.get(a.workOrderId)!;
    const key = a.bayId;
    if (!bayDayUsage.has(key)) bayDayUsage.set(key, new Set());
    const days = bayDayUsage.get(key)!;
    for (let d = a.startDay; d < a.startDay + Math.ceil(wo.estimatedHours / 8); d++) {
      if (days.has(d)) {
        score += 10000; // hard violation: bay double-booked
      }
      days.add(d);
    }
  }

  // Soft constraints
  for (const a of assignments) {
    const wo = woMap.get(a.workOrderId)!;
    const finishDay = a.startDay + Math.ceil(wo.estimatedHours / 8);

    // Parts availability (hard-ish)
    if (a.startDay < wo.partsAvailableDay) {
      score += (wo.partsAvailableDay - a.startDay) * 500;
    }

    // Late delivery
    if (finishDay > wo.promisedDay) {
      score += (finishDay - wo.promisedDay) * 1000;
    }

    // Priority: AOG/urgent jobs should start as early as possible
    if (wo.priority === "aog") {
      score += a.startDay * 2000;
    } else if (wo.priority === "urgent") {
      score += a.startDay * 500;
    }
  }

  // Bay utilization variance (soft)
  const bayLoads = bays.map(bay => {
    return assignments
      .filter(a => a.bayId === bay.id)
      .reduce((sum, a) => {
        const wo = woMap.get(a.workOrderId)!;
        return sum + wo.estimatedHours;
      }, 0);
  });
  const avgLoad = bayLoads.reduce((a, b) => a + b, 0) / bays.length;
  const variance = bayLoads.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) / bays.length;
  score += Math.sqrt(variance) * 10;

  return score;
}

// neighbors.ts
function applySwapMove(
  assignments: Assignment[],
  i: number,
  j: number
): Assignment[] {
  const next = assignments.map(a => ({ ...a }));
  const tempBay = next[i].bayId;
  const tempDay = next[i].startDay;
  next[i].bayId = next[j].bayId;
  next[i].startDay = next[j].startDay;
  next[j].bayId = tempBay;
  next[j].startDay = tempDay;
  return next;
}

function applyShiftMove(
  assignments: Assignment[],
  index: number,
  delta: number,
  maxDay: number
): Assignment[] {
  const next = assignments.map(a => ({ ...a }));
  next[index].startDay = Math.max(0, Math.min(maxDay, next[index].startDay + delta));
  return next;
}

function applyBayTransfer(
  assignments: Assignment[],
  index: number,
  bays: Bay[]
): Assignment[] {
  const next = assignments.map(a => ({ ...a }));
  const otherBays = bays.filter(b => b.id !== next[index].bayId);
  if (otherBays.length === 0) return next;
  next[index].bayId = otherBays[Math.floor(Math.random() * otherBays.length)].id;
  return next;
}

function randomNeighbor(
  assignments: Assignment[],
  bays: Bay[],
  maxDay: number
): Assignment[] {
  const n = assignments.length;
  const moveType = Math.random();

  if (moveType < 0.4) {
    // Swap move
    const i = Math.floor(Math.random() * n);
    const j = Math.floor(Math.random() * n);
    return applySwapMove(assignments, i, j);
  } else if (moveType < 0.7) {
    // Shift move
    const i = Math.floor(Math.random() * n);
    const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2 days
    return applyShiftMove(assignments, i, delta, maxDay);
  } else {
    // Bay transfer
    const i = Math.floor(Math.random() * n);
    return applyBayTransfer(assignments, i, bays);
  }
}

// sa-scheduler.ts
export interface SAConfig {
  initialTemperature: number;
  coolingRate: number;        // alpha, e.g. 0.995
  iterationsPerTemp: number;  // L, e.g. 50
  minTemperature: number;     // e.g. 0.1
  maxIterations: number;      // hard stop
}

export interface SAResult {
  assignments: Assignment[];
  score: number;
  iterations: number;
  improvementHistory: Array<{ iteration: number; score: number }>;
}

export function simulatedAnnealingScheduler(
  workOrders: WorkOrder[],
  bays: Bay[],
  config: SAConfig,
  planningHorizonDays: number
): SAResult {
  // Initialize: random assignment
  let current: Assignment[] = workOrders.map(wo => ({
    workOrderId: wo.id,
    bayId: bays[Math.floor(Math.random() * bays.length)].id,
    startDay: Math.floor(Math.random() * planningHorizonDays),
  }));

  let currentScore = computeFitness(current, workOrders, bays);
  let best = current.map(a => ({ ...a }));
  let bestScore = currentScore;
  let temperature = config.initialTemperature;
  let iteration = 0;
  const history: Array<{ iteration: number; score: number }> = [];

  while (temperature > config.minTemperature && iteration < config.maxIterations) {
    for (let l = 0; l < config.iterationsPerTemp; l++) {
      const neighbor = randomNeighbor(current, bays, planningHorizonDays);
      const neighborScore = computeFitness(neighbor, workOrders, bays);
      const delta = neighborScore - currentScore;

      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current = neighbor;
        currentScore = neighborScore;
        if (currentScore < bestScore) {
          best = current.map(a => ({ ...a }));
          bestScore = currentScore;
          history.push({ iteration, score: bestScore });
        }
      }
      iteration++;
    }
    temperature *= config.coolingRate;
  }

  return { assignments: best, score: bestScore, iterations: iteration, improvementHistory: history };
}

// Calibrate initial temperature from pilot run
export function calibrateInitialTemperature(
  workOrders: WorkOrder[],
  bays: Bay[],
  planningHorizonDays: number,
  targetAcceptanceRate = 0.8,
  pilotMoves = 100
): number {
  let initial: Assignment[] = workOrders.map(wo => ({
    workOrderId: wo.id,
    bayId: bays[Math.floor(Math.random() * bays.length)].id,
    startDay: Math.floor(Math.random() * planningHorizonDays),
  }));
  let score = computeFitness(initial, workOrders, bays);
  let totalDelta = 0;
  let degradingMoves = 0;

  for (let i = 0; i < pilotMoves; i++) {
    const neighbor = randomNeighbor(initial, bays, planningHorizonDays);
    const neighborScore = computeFitness(neighbor, workOrders, bays);
    const delta = neighborScore - score;
    if (delta > 0) {
      totalDelta += delta;
      degradingMoves++;
    }
    initial = neighbor;
    score = neighborScore;
  }

  const avgDelta = degradingMoves > 0 ? totalDelta / degradingMoves : 100;
  return -avgDelta / Math.log(targetAcceptanceRate);
}
```

### 6.2 TypeScript Implementation: Genetic Algorithm for WO Priority Scheduling

```typescript
// ga-scheduler.ts

type PriorityChromosome = number[]; // real values 0-1, one per WO

function decodeChromosome(
  chromosome: PriorityChromosome,
  workOrders: WorkOrder[],
  bays: Bay[],
  planningHorizonDays: number
): Assignment[] {
  // Sort WOs by chromosome priority (descending)
  const indexed = workOrders.map((wo, i) => ({ wo, priority: chromosome[i] }));
  indexed.sort((a, b) => b.priority - a.priority);

  // Greedy assignment in priority order
  const assignments: Assignment[] = [];
  const bayAvailability: Map<string, number> = new Map(
    bays.map(b => [b.id, 0])
  );

  for (const { wo } of indexed) {
    let bestBay = bays[0].id;
    let bestDay = planningHorizonDays;

    for (const bay of bays) {
      const availDay = Math.max(
        bayAvailability.get(bay.id) ?? 0,
        wo.partsAvailableDay
      );
      if (availDay < bestDay) {
        bestDay = availDay;
        bestBay = bay.id;
      }
    }

    const duration = Math.ceil(wo.estimatedHours / 8);
    bayAvailability.set(bestBay, bestDay + duration);
    assignments.push({ workOrderId: wo.id, bayId: bestBay, startDay: bestDay });
  }

  return assignments;
}

function gaFitness(
  chromosome: PriorityChromosome,
  workOrders: WorkOrder[],
  bays: Bay[],
  planningHorizonDays: number
): number {
  const schedule = decodeChromosome(chromosome, workOrders, bays, planningHorizonDays);
  return computeFitness(schedule, workOrders, bays);
}

function tournamentSelect(
  population: PriorityChromosome[],
  fitnesses: number[],
  k = 3
): PriorityChromosome {
  let best = -1;
  let bestFitness = Infinity;
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * population.length);
    if (fitnesses[idx] < bestFitness) {
      bestFitness = fitnesses[idx];
      best = idx;
    }
  }
  return population[best];
}

function uniformCrossover(
  parent1: PriorityChromosome,
  parent2: PriorityChromosome
): [PriorityChromosome, PriorityChromosome] {
  const child1 = parent1.map((v, i) => Math.random() < 0.5 ? v : parent2[i]);
  const child2 = parent2.map((v, i) => Math.random() < 0.5 ? v : parent1[i]);
  return [child1, child2];
}

function gaussianMutate(
  chromosome: PriorityChromosome,
  mutationRate: number,
  sigma = 0.1
): PriorityChromosome {
  return chromosome.map(v => {
    if (Math.random() < mutationRate) {
      return Math.max(0, Math.min(1, v + (Math.random() * 2 - 1) * sigma));
    }
    return v;
  });
}

export interface GAConfig {
  populationSize: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  eliteCount: number;
  tournamentSize: number;
}

export function geneticAlgorithmScheduler(
  workOrders: WorkOrder[],
  bays: Bay[],
  config: GAConfig,
  planningHorizonDays: number
): SAResult {
  const n = workOrders.length;
  let population: PriorityChromosome[] = Array.from(
    { length: config.populationSize },
    () => Array.from({ length: n }, () => Math.random())
  );

  let fitnesses = population.map(c =>
    gaFitness(c, workOrders, bays, planningHorizonDays)
  );

  let bestChromosome = population[0];
  let bestScore = fitnesses[0];
  const history: Array<{ iteration: number; score: number }> = [];

  for (let gen = 0; gen < config.generations; gen++) {
    // Elitism
    const sortedIndices = fitnesses
      .map((f, i) => ({ f, i }))
      .sort((a, b) => a.f - b.f)
      .map(x => x.i);

    const nextPop: PriorityChromosome[] = sortedIndices
      .slice(0, config.eliteCount)
      .map(i => [...population[i]]);

    // Generate offspring
    while (nextPop.length < config.populationSize) {
      const p1 = tournamentSelect(population, fitnesses, config.tournamentSize);
      const p2 = tournamentSelect(population, fitnesses, config.tournamentSize);

      let [c1, c2] = Math.random() < config.crossoverRate
        ? uniformCrossover(p1, p2)
        : [[...p1], [...p2]];

      c1 = gaussianMutate(c1, config.mutationRate);
      c2 = gaussianMutate(c2, config.mutationRate);
      nextPop.push(c1, c2);
    }

    population = nextPop.slice(0, config.populationSize);
    fitnesses = population.map(c =>
      gaFitness(c, workOrders, bays, planningHorizonDays)
    );

    const genBest = Math.min(...fitnesses);
    if (genBest < bestScore) {
      bestScore = genBest;
      bestChromosome = population[fitnesses.indexOf(genBest)];
      history.push({ iteration: gen, score: bestScore });
    }
  }

  const bestAssignments = decodeChromosome(
    bestChromosome, workOrders, bays, planningHorizonDays
  );
  return {
    assignments: bestAssignments,
    score: bestScore,
    iterations: config.generations * config.populationSize,
    improvementHistory: history,
  };
}
```

### 6.3 Neighborhood Design Patterns for Scheduling Problems

**Pattern 1 — Move pool with adaptive selection**

Maintain multiple move types. Track the improvement rate of each type. Adjust selection probability using a softmax over recent improvements.

```typescript
class AdaptiveMoveSelector {
  private moveTypes = ['swap', 'shift', 'bayTransfer', 'blockMove'];
  private improvements: number[];
  private attempts: number[];
  private windowSize = 100;
  private history: Array<{ moveType: string; improved: boolean }> = [];

  constructor() {
    this.improvements = new Array(this.moveTypes.length).fill(1);
    this.attempts = new Array(this.moveTypes.length).fill(1);
  }

  select(): string {
    const rates = this.improvements.map((imp, i) => imp / this.attempts[i]);
    const total = rates.reduce((a, b) => a + b, 0);
    const probs = rates.map(r => r / total);
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < this.moveTypes.length; i++) {
      cumulative += probs[i];
      if (rand < cumulative) return this.moveTypes[i];
    }
    return this.moveTypes[this.moveTypes.length - 1];
  }

  record(moveType: string, improved: boolean): void {
    const idx = this.moveTypes.indexOf(moveType);
    this.attempts[idx]++;
    if (improved) this.improvements[idx]++;
    this.history.push({ moveType, improved });
    if (this.history.length > this.windowSize) {
      const old = this.history.shift()!;
      const oldIdx = this.moveTypes.indexOf(old.moveType);
      this.attempts[oldIdx] = Math.max(1, this.attempts[oldIdx] - 1);
      if (old.improved) this.improvements[oldIdx] = Math.max(1, this.improvements[oldIdx] - 1);
    }
  }
}
```

**Pattern 2 — Constraint-aware move generation**

Generate only moves that are likely to be feasible or that fix known violations:

```typescript
function constraintAwareNeighbor(
  assignments: Assignment[],
  violations: Violation[],
  bays: Bay[],
  maxDay: number
): Assignment[] {
  if (violations.length > 0 && Math.random() < 0.7) {
    // 70% of the time: target a violating assignment
    const violation = violations[Math.floor(Math.random() * violations.length)];
    const idx = assignments.findIndex(a => a.workOrderId === violation.workOrderId);
    if (violation.type === 'bay_conflict') {
      return applyBayTransfer(assignments, idx, bays);
    } else if (violation.type === 'parts_not_ready') {
      return applyShiftMove(assignments, idx, violation.daysEarly, maxDay);
    }
  }
  // 30% random exploration
  return randomNeighbor(assignments, bays, maxDay);
}
```

### 6.4 Convergence Detection and Stopping Criteria

```typescript
class ConvergenceDetector {
  private recentScores: number[] = [];
  private windowSize: number;
  private threshold: number; // relative improvement threshold

  constructor(windowSize = 50, threshold = 0.001) {
    this.windowSize = windowSize;
    this.threshold = threshold;
  }

  record(score: number): void {
    this.recentScores.push(score);
    if (this.recentScores.length > this.windowSize) {
      this.recentScores.shift();
    }
  }

  hasConverged(): boolean {
    if (this.recentScores.length < this.windowSize) return false;
    const best = Math.min(...this.recentScores);
    const worst = Math.max(...this.recentScores);
    if (best === 0) return true;
    return (worst - best) / best < this.threshold;
  }
}

// Multi-criteria stopping
function shouldStop(
  iteration: number,
  elapsedMs: number,
  convergenceDetector: ConvergenceDetector,
  config: {
    maxIterations: number;
    maxTimeMs: number;
    targetScore: number;
  },
  currentScore: number
): boolean {
  return (
    iteration >= config.maxIterations ||
    elapsedMs >= config.maxTimeMs ||
    currentScore <= config.targetScore ||
    convergenceDetector.hasConverged()
  );
}
```

### 6.5 Parallelization: Island Model GA

The island model runs multiple independent GA populations ("islands"), periodically migrating the best individuals between them. Each island can be a Web Worker in TypeScript.

```typescript
// island-model.ts (conceptual — Worker API syntax)
interface IslandConfig {
  numIslands: number;
  migrationInterval: number;  // generations between migrations
  migrationSize: number;      // individuals to migrate
  gaConfig: GAConfig;
}

// Main thread
class IslandModelGA {
  private workers: Worker[] = [];
  private bestPerIsland: Map<number, { chromosome: number[]; score: number }> = new Map();

  async run(workOrders: WorkOrder[], bays: Bay[], config: IslandConfig): Promise<SAResult> {
    // Create one Worker per island
    for (let i = 0; i < config.numIslands; i++) {
      const worker = new Worker('/ga-worker.js');
      this.workers.push(worker);
    }

    // Send initial population to each worker
    this.workers.forEach((w, i) => {
      w.postMessage({ type: 'init', islandId: i, workOrders, bays, config: config.gaConfig });
    });

    // Periodic migration: every N generations, collect best from each island
    // and send top migrants to neighboring islands (ring topology)
    // ... (message-passing coordination)

    // After all islands finish, return global best
    const results = await Promise.all(this.workers.map(w => this.waitForResult(w)));
    return results.reduce((best, r) => r.score < best.score ? r : best);
  }

  private waitForResult(worker: Worker): Promise<SAResult> {
    return new Promise(resolve => {
      worker.addEventListener('message', e => {
        if (e.data.type === 'result') resolve(e.data.result);
      });
    });
  }
}
```

### 6.6 Benchmarking Methodology

To compare metaheuristic implementations:

1. **Use multiple random seeds**: Run each algorithm 10-30 times with different random seeds. Report mean, median, and standard deviation of solution quality.

2. **Time-to-target plots**: For a given target quality level, measure how many seconds each algorithm takes to first reach it. Plot as a CDF over multiple runs.

3. **Performance profiles** (Dolan-Moré): For a benchmark set of problem instances, plot the fraction of instances solved within a factor `τ` of the best known. Algorithms that dominate in the plot are more robust.

4. **Fixed-time comparison**: Give each algorithm exactly T seconds. Compare final solution quality. More fair than fixed-iteration comparison.

```typescript
interface BenchmarkResult {
  algorithm: string;
  problemId: string;
  seed: number;
  finalScore: number;
  timeToTargetMs: number | null; // null if target not reached
  improvementHistory: Array<{ timeMs: number; score: number }>;
}

function runBenchmark(
  algorithms: Array<{ name: string; run: (seed: number) => SAResult }>,
  seeds: number[],
  targetScore: number,
  timeLimitMs: number
): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  for (const algo of algorithms) {
    for (const seed of seeds) {
      // Seed RNG, run algorithm, record results
      const result = algo.run(seed);
      const timeToTarget = result.improvementHistory.find(
        h => h.score <= targetScore
      )?.iteration ?? null;
      results.push({
        algorithm: algo.name,
        problemId: 'athelon-30wo-5bay',
        seed,
        finalScore: result.score,
        timeToTargetMs: timeToTarget,
        improvementHistory: result.improvementHistory.map(h => ({
          timeMs: h.iteration * 0.5, // estimate ms per iteration
          score: h.score,
        })),
      });
    }
  }
  return results;
}
```

---

## 7. Where to Find It / Dependencies

### TypeScript / JavaScript

| Package | Description | Install |
|---|---|---|
| Roll your own | Often best for domain-specific problems — full control, no overhead | — |
| `jenetics` port | Typed genetic algorithm framework | `npm install jenetics` (check currency) |
| Web Workers | Built-in browser API for parallelism | Native |

**Recommendation**: For Athelon, implement SA and TS directly. The implementations in Section 6 are production-ready starting points. Generic JS GA libraries rarely handle scheduling-specific encodings well and add dependency overhead.

### Python

| Package | Description | Install |
|---|---|---|
| **`timefold`** | Production constraint solver (Tabu/LA/SA) | `pip install timefold` |
| **`pymoo`** | Multi-objective metaheuristics (NSGA-II, NSGA-III, etc.) | `pip install pymoo` |
| **`DEAP`** | Evolutionary algorithms framework | `pip install deap` |
| **`simanneal`** | Simple SA framework | `pip install simanneal` |
| **`optuna`** | Hyperparameter optimization (also works as general optimizer) | `pip install optuna` |

**Timefold Python requirements** (2026):
- Python 3.10+
- JDK 17+ with `JAVA_HOME` set
- `pip install timefold` — current version 1.24.0 (pre-release channel)
- Performance: ~10-50× slower than Java solver for the same problem

### Java / JVM

| Tool | Description | Maven Artifact |
|---|---|---|
| **Timefold Solver** | Primary recommendation | `ai.timefold.solver:timefold-solver-core` |
| **OptaPlanner (Apache KIE)** | Predecessor, Apache 2.0 | `org.optaplanner:optaplanner-core` |
| **JMetal** | Research-grade metaheuristic framework | `org.uma.jmetal:jmetal-algorithm` |
| **ECJ** | Evolutionary Computation in Java (Univ. Maryland) | GitHub: ECJ |

### OR-Tools and Hybrid

Google OR-Tools' routing solver (`ortools.routing`) uses Large Neighborhood Search (LNS) internally — a metaheuristic that destroys and repairs portions of the solution. It is one of the strongest practical solvers for VRP and scheduling hybrids.

```python
# OR-Tools LNS is used automatically when you use the routing solver
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

search_parameters = pywrapcp.DefaultRoutingSearchParameters()
search_parameters.local_search_metaheuristic = (
    routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
)
search_parameters.time_limit.seconds = 30
```

### Performance Comparison (approximate, for MRO-scale problems)

| Tool | Language | Problem Scale | Solve Time (30 WOs) | Solve Time (200 WOs) |
|---|---|---|---|---|
| Custom TypeScript SA | TS | Small-medium | < 5s | 30-120s |
| Custom TypeScript TS | TS | Small-medium | < 3s | 20-90s |
| Timefold Python | Python+JVM | Medium-large | 5-15s (+2s JVM startup) | 30-60s |
| Timefold Java | Java | Large | 1-5s | 5-30s |
| OR-Tools CP-SAT | Python/C++ | Medium-large | 1-10s | 10-60s |
| Gurobi MIP | Python/C++ | Large | Optimal in minutes | Hours |

---

## 8. Integration Architecture for Athelon

### Option A: TypeScript Metaheuristics (Recommended Starting Point)

Run SA or GA directly in a Convex Action or in the browser via Web Workers.

**Convex Action pattern:**

```typescript
// convex/optimizeSchedule.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { simulatedAnnealingScheduler, calibrateInitialTemperature } from "../src/shared/lib/scheduling/sa-scheduler";

export const optimizeMonthlySchedule = action({
  args: {
    planningHorizonDays: v.number(),
    timeLimitSeconds: v.number(),
  },
  handler: async (ctx, { planningHorizonDays, timeLimitSeconds }) => {
    // Fetch data from DB
    const workOrders = await ctx.runQuery(api.workOrders.listOpenWorkOrders, {});
    const bays = await ctx.runQuery(api.bays.listActiveBays, {});

    const woForScheduler = workOrders.map(wo => ({
      id: wo._id,
      estimatedHours: wo.estimatedLaborHours,
      priority: wo.priority,
      requiredCerts: wo.requiredCertifications,
      promisedDay: daysBetween(new Date(), wo.promisedDeliveryDate),
      partsAvailableDay: daysBetween(new Date(), wo.partsAvailableDate ?? new Date()),
    }));

    const initialTemp = calibrateInitialTemperature(woForScheduler, bays, planningHorizonDays);

    const result = simulatedAnnealingScheduler(woForScheduler, bays, {
      initialTemperature: initialTemp,
      coolingRate: 0.995,
      iterationsPerTemp: Math.max(50, woForScheduler.length * 5),
      minTemperature: 0.1,
      maxIterations: timeLimitSeconds * 1000, // rough iteration budget
    }, planningHorizonDays);

    // Persist the optimized schedule
    await ctx.runMutation(api.scheduleSnapshots.saveOptimizedSchedule, {
      assignments: result.assignments,
      score: result.score,
      algorithm: "simulated_annealing",
      generatedAt: Date.now(),
    });

    return {
      score: result.score,
      assignmentCount: result.assignments.length,
      improvementHistory: result.improvementHistory,
    };
  },
});
```

**Web Worker pattern (non-blocking UI):**

```typescript
// src/shared/lib/scheduling/optimizer-worker.ts
// (loaded as a Web Worker)
self.addEventListener('message', (e) => {
  const { workOrders, bays, config } = e.data;
  const result = simulatedAnnealingScheduler(workOrders, bays, config, 30);
  // Stream progress back
  self.postMessage({ type: 'progress', score: result.score });
  self.postMessage({ type: 'complete', result });
});

// In UI component:
const worker = new Worker(
  new URL('../lib/scheduling/optimizer-worker.ts', import.meta.url),
  { type: 'module' }
);
worker.postMessage({ workOrders, bays, config });
worker.onmessage = (e) => {
  if (e.data.type === 'progress') setProgress(e.data.score);
  if (e.data.type === 'complete') setResult(e.data.result);
};
```

**Pros**: Same language, zero deployment complexity, no external service, can run in Web Worker for non-blocking UI.

**Cons**: JavaScript is ~10-20× slower than compiled Java/C++. No library ecosystem for advanced moves. Parallel island GA requires Worker coordination complexity.

**Best for**: < 50 WOs, < 30 techs, 30-day horizon. Single-objective or simple weighted sum. Real-time or near-real-time rescheduling triggers.

---

### Option B: Timefold Python Microservice

Deploy Timefold as a FastAPI microservice on Cloud Run or Railway.

**Python microservice:**

```python
# app/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from timefold.solver import SolverFactory
from timefold.solver.config import SolverConfig, TerminationConfig, ScoreDirectorFactoryConfig, Duration
from .domain import MROSchedule, WorkOrderAssignment, Bay, Technician, TimeSlot
from .constraints import mro_constraints

app = FastAPI()

solver_config = SolverConfig(
    solution_class=MROSchedule,
    entity_class_list=[WorkOrderAssignment],
    score_director_factory_config=ScoreDirectorFactoryConfig(
        constraint_provider_function=mro_constraints
    ),
    termination_config=TerminationConfig(spent_limit=Duration(seconds=30))
)
solver = SolverFactory.create(solver_config).build_solver()

class ScheduleRequest(BaseModel):
    work_orders: list[dict]
    bays: list[dict]
    technicians: list[dict]
    time_slots: list[dict]
    time_limit_seconds: int = 30

@app.post("/optimize")
def optimize_schedule(request: ScheduleRequest):
    problem = MROSchedule(
        bays=[Bay(**b) for b in request.bays],
        technicians=[Technician(**t) for t in request.technicians],
        time_slots=[TimeSlot(**s) for s in request.time_slots],
        assignments=[WorkOrderAssignment(**wo) for wo in request.work_orders],
    )
    solution = solver.solve(problem)
    return {
        "score": str(solution.score),
        "assignments": [
            {
                "work_order_id": a.work_order_id,
                "bay_id": a.bay.id if a.bay else None,
                "time_slot_id": a.time_slot.id if a.time_slot else None,
                "technician_id": a.lead_technician.id if a.lead_technician else None,
            }
            for a in solution.assignments
        ]
    }
```

**Convex Action calling the microservice:**

```typescript
// convex/optimizeWithTimefold.ts
export const optimizeWithTimefold = action({
  args: { timeLimitSeconds: v.number() },
  handler: async (ctx, { timeLimitSeconds }) => {
    const [workOrders, bays, techs, timeSlots] = await Promise.all([
      ctx.runQuery(api.workOrders.listOpenWorkOrders, {}),
      ctx.runQuery(api.bays.listActiveBays, {}),
      ctx.runQuery(api.technicians.listActive, {}),
      ctx.runQuery(api.scheduling.generateTimeSlots, { days: 30 }),
    ]);

    const response = await fetch(process.env.TIMEFOLD_SERVICE_URL + "/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        work_orders: workOrders,
        bays,
        technicians: techs,
        time_slots: timeSlots,
        time_limit_seconds: timeLimitSeconds,
      }),
    });

    if (!response.ok) throw new Error(`Solver failed: ${response.statusText}`);
    const result = await response.json();

    await ctx.runMutation(api.scheduleSnapshots.saveOptimizedSchedule, {
      assignments: result.assignments,
      score: result.score,
      algorithm: "timefold",
      generatedAt: Date.now(),
    });

    return result;
  },
});
```

**Pros**: Production-grade solver, best constraint expressiveness, handles complex rostering (labor laws, fairness, multi-site) without custom move design.

**Cons**: Requires Python microservice deployment (Cloud Run, Railway, Fly.io), JDK 17 in the container, JVM startup adds ~2-3s cold start latency. Python bindings are ~10-50× slower than native Java.

**Best for**: Complex rostering, multi-objective optimization, problems with 50-500 entities where LP/CP-SAT are too rigid.

---

### Option C: Hybrid with CP-SAT

Use SA/GA to find a good initial solution quickly, then pass it to CP-SAT for improvement and optimality bounding.

**Pattern**: Matheuristic (metaheuristic + mathematical programming)

```
1. Run SA for 5s → get good feasible solution (within 10-15% of optimal)
2. Extract the "interesting" subproblem (e.g., just the unscheduled WOs, or just the violations)
3. Feed as warm start to CP-SAT with 25s budget
4. CP-SAT improves further and provides an optimality gap guarantee
```

**Convex integration:**

```typescript
export const hybridOptimize = action({
  args: { totalTimeLimitSeconds: v.number() },
  handler: async (ctx, { totalTimeLimitSeconds }) => {
    const data = await fetchSchedulingData(ctx);

    // Phase 1: Quick SA (20% of time budget)
    const saResult = await runSA(data, totalTimeLimitSeconds * 0.2);

    // Phase 2: CP-SAT warm-started from SA solution (80% of budget)
    const cpSatResult = await fetch(CPSAT_SERVICE_URL + "/optimize", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        warm_start: saResult.assignments,
        time_limit_seconds: totalTimeLimitSeconds * 0.8,
      }),
    }).then(r => r.json());

    return cpSatResult;
  },
});
```

**Best for**: When you need both speed (SA gives a fast feasible solution) and quality guarantees (CP-SAT proves how close to optimal you are). Works well for monthly planning where 30-60s solve time is acceptable.

---

## 9. Interactions with Other Optimization Tools

### Metaheuristics + CP-SAT: Matheuristics

**Large Neighborhood Search (LNS)**: A powerful metaheuristic that uses CP-SAT as a subproblem solver within the metaheuristic loop.

```
1. Start with any feasible solution S
2. REPEAT:
   a. SELECT a "neighborhood" — remove K WOs from S (destroy)
   b. Re-optimize just those K WOs using CP-SAT (repair)
   c. Accept the improved partial solution
   d. Increment K if no improvement, decrement if improving
```

LNS is used internally by OR-Tools' routing solver and is one of the most effective approaches for large scheduling problems. The key insight: CP-SAT is fast for small subproblems (K = 5-15 WOs); metaheuristics handle the large-scale exploration.

**Implementation pattern for Athelon:**

```typescript
async function largeNeighborhoodSearch(
  currentSolution: Assignment[],
  workOrders: WorkOrder[],
  destroySize: number,
  cpSatServiceUrl: string
): Promise<Assignment[]> {
  // Destroy: remove destroySize WOs from the solution
  const toRemove = selectWorstAssignments(currentSolution, workOrders, destroySize);
  const fixedAssignments = currentSolution.filter(
    a => !toRemove.includes(a.workOrderId)
  );

  // Repair: re-optimize removed WOs via CP-SAT
  const response = await fetch(cpSatServiceUrl + "/repair", {
    method: "POST",
    body: JSON.stringify({
      fixed_assignments: fixedAssignments,
      work_orders_to_schedule: toRemove,
      time_limit_seconds: 5,
    }),
  });
  const repairResult = await response.json();
  return [...fixedAssignments, ...repairResult.new_assignments];
}
```

### Metaheuristics + LP: Lower Bound and Resource Allocation

LP relaxations provide lower bounds that bound the optimality gap of metaheuristic solutions. When your SA solution scores 12,450 and the LP relaxation proves the optimal cannot be below 11,800, you know you are within 5.5% of optimal — often good enough to stop early.

Within a GA, LP can be embedded in the fitness function: for each chromosome (priority ordering), solve a small LP to find the optimal resource allocation given that ordering. This "LP-inside-GA" approach handles continuous allocation decisions exactly while GA handles the discrete ordering decisions.

### Metaheuristics + Bin Packing: Decoder Pattern

A powerful architecture for scheduling: GA/SA evolves a priority vector; a bin-packing decoder constructs the actual schedule.

```typescript
function binPackingDecoder(
  priorities: number[],
  workOrders: WorkOrder[],
  bays: Bay[],
  planningHorizonDays: number
): Assignment[] {
  // Sort WOs by priority (the metaheuristic controls this)
  const sorted = workOrders
    .map((wo, i) => ({ wo, p: priorities[i] }))
    .sort((a, b) => b.p - a.p)
    .map(x => x.wo);

  // Bin packing: First Fit Decreasing variant
  // Each "bin" is a (bay, day) slot; pack WOs until full
  const schedule: Assignment[] = [];
  const bayCapacity: Map<string, number[]> = new Map(
    bays.map(b => [b.id, new Array(planningHorizonDays).fill(8)]) // 8 hours/day capacity
  );

  for (const wo of sorted) {
    let placed = false;
    for (let day = wo.partsAvailableDay; day < planningHorizonDays && !placed; day++) {
      for (const bay of bays) {
        const cap = bayCapacity.get(bay.id)!;
        const slotsNeeded = Math.ceil(wo.estimatedHours / 8);
        // Check if enough consecutive days available
        if (cap.slice(day, day + slotsNeeded).every(h => h >= 8)) {
          // Place it
          for (let d = day; d < day + slotsNeeded; d++) cap[d] = 0;
          schedule.push({ workOrderId: wo.id, bayId: bay.id, startDay: day });
          placed = true;
          break;
        }
      }
    }
  }
  return schedule;
}
```

### Metaheuristics + CPM: Focus Neighborhood Moves on Critical Tasks

The critical path tells you which tasks drive the schedule end date. Metaheuristic neighborhood moves focused on critical path tasks are far more likely to improve makespan than random moves.

```typescript
function criticalPathAwareNeighbor(
  assignments: Assignment[],
  criticalTasks: Set<string>, // from CPM analysis
  bays: Bay[],
  maxDay: number
): Assignment[] {
  // 80% probability: move a critical task
  if (Math.random() < 0.8) {
    const criticalAssignments = assignments.filter(
      a => criticalTasks.has(a.workOrderId)
    );
    if (criticalAssignments.length > 0) {
      const idx = assignments.indexOf(
        criticalAssignments[Math.floor(Math.random() * criticalAssignments.length)]
      );
      // Try to move critical task earlier
      return applyShiftMove(assignments, idx, -Math.floor(Math.random() * 3 + 1), maxDay);
    }
  }
  // 20%: random move (exploration)
  return randomNeighbor(assignments, bays, maxDay);
}
```

### Metaheuristics + EVM: Fitness Function Integration

Earned Value metrics can be incorporated directly into the fitness function, aligning optimization with financial performance:

```typescript
function evmAwareFitness(
  assignments: Assignment[],
  workOrders: WorkOrder[],
  bays: Bay[],
  historicalCPI: Map<string, number> // WO type → historical cost performance index
): number {
  let score = computeFitness(assignments, workOrders, bays);

  for (const a of assignments) {
    const wo = workOrders.find(w => w.id === a.workOrderId)!;
    const cpi = historicalCPI.get(wo.type) ?? 1.0;
    // Adjust estimated hours by historical CPI
    const expectedActualHours = wo.estimatedHours / cpi;
    const finishDay = a.startDay + Math.ceil(expectedActualHours / 8);
    // Additional late penalty weighted by CPI risk
    if (finishDay > wo.promisedDay) {
      score += (finishDay - wo.promisedDay) * 500 * (1 / cpi);
    }
  }
  return score;
}
```

### Metaheuristics + Forecasting: Optimize Against Predicted Demand

Rather than optimizing against the current backlog only, optimize against predicted future arrivals:

```typescript
interface ForecastedDemand {
  week: number;
  expectedArrivalHours: number;
  woCountDistribution: { p10: number; p50: number; p90: number };
}

function forecastAwareFitness(
  assignments: Assignment[],
  workOrders: WorkOrder[],
  bays: Bay[],
  forecast: ForecastedDemand[],
  planningHorizonDays: number
): number {
  let score = computeFitness(assignments, workOrders, bays);

  // Penalize schedules that leave no capacity buffer for forecasted arrivals
  for (const f of forecast) {
    const weekStart = f.week * 7;
    const weekEnd = weekStart + 7;
    const scheduledHours = assignments
      .filter(a => a.startDay >= weekStart && a.startDay < weekEnd)
      .reduce((sum, a) => {
        const wo = workOrders.find(w => w.id === a.workOrderId)!;
        return sum + wo.estimatedHours;
      }, 0);
    const totalCapacity = bays.length * 7 * 8; // bays × days × hours/day
    const forecastedLoad = f.expectedArrivalHours;
    const remainingCapacity = totalCapacity - scheduledHours;
    // Penalize if forecasted demand would exceed remaining capacity
    if (forecastedLoad > remainingCapacity) {
      score += (forecastedLoad - remainingCapacity) * 200;
    }
  }
  return score;
}
```

---

## Summary

| Algorithm | Best Athelon Use Case | Solve Time | Implementation |
|---|---|---|---|
| Simulated Annealing | Monthly schedule optimization, predictive maintenance timing | 5-30s (TS) | Custom TypeScript |
| Tabu Search | AOG rescheduling (fast, high quality), single-objective optimization | 3-20s (TS) | Custom TypeScript |
| Genetic Algorithm | Multi-location balancing, hiring plan optimization | 10-60s (TS) | Custom TypeScript |
| NSGA-II | Training schedule (cost vs. capability tradeoff) | 30-120s (Python) | pymoo or DEAP |
| Timefold | Technician rostering with complex labor rules | 15-60s (Python+JVM) | Microservice |
| LNS (SA + CP-SAT) | Monthly planning requiring optimality gap proof | 30-90s | SA (TS) + CP-SAT (Python) |

**Recommended progression for Athelon:**

1. **Now**: Implement SA scheduler in TypeScript (see Section 6.1). Replace `magicSchedule.ts` with SA-based optimization for monthly planning. This is a single file addition and a Convex Action.
2. **Phase 2**: Add Tabu Search for AOG rescheduling (faster convergence for small perturbations to an existing schedule).
3. **Phase 3**: NSGA-II via pymoo in a lightweight Python microservice for training schedule optimization.
4. **Phase 4**: Timefold microservice for technician rostering when multi-location complexity demands it.
5. **Throughout**: Use LNS pattern (destroy small sets, re-optimize with CP-SAT) as the quality ceiling — SA for initial construction, CP-SAT for refinement.
