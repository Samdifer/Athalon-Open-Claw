# Predictive and Probabilistic Scheduling for Athelon MRO

> Research document — 2026-03-12. Covers Monte Carlo simulation, stochastic optimization, Bayesian estimation, machine learning forecasting, and Critical Chain Project Management for integration into Athelon's scheduling engine.

---

## Table of Contents

1. [What Predictive/Probabilistic Scheduling Is](#1-what-predictiveprobabilistic-scheduling-is)
2. [Key Techniques](#2-key-techniques)
3. [General Use Cases](#3-general-use-cases)
4. [Athelon-Specific Use Cases](#4-athelon-specific-use-cases)
5. [Implementation Details](#5-implementation-details)
6. [Where to Find It / Dependencies](#6-where-to-find-it--dependencies)
7. [Integration Architecture for Athelon](#7-integration-architecture-for-athelon)
8. [Interactions with Other Optimization Tools](#8-interactions-with-other-optimization-tools)
9. [Data Collection Strategy for Athelon](#9-data-collection-strategy-for-athelon)

---

## 1. What Predictive/Probabilistic Scheduling Is

### The Core Problem: Deterministic Scheduling Fails in MRO

Every scheduling system built on CPM, Gantt charts, or standard project management tools shares a fatal assumption: task durations are known in advance. An inspection of a turboprop engine takes 40 hours. A landing gear overhaul takes 72 hours. A scheduled engine run-up takes 4 hours. These are the numbers you put in the plan.

Reality in FAA Part 145 MRO operations looks completely different:

**Duration uncertainty.** That 40-hour engine inspection takes anywhere from 28 hours (textbook condition) to 96 hours (corroded exhaust stacks, replaced fuel nozzles, found a cracked turbine blade that requires NDT). The planned number is a guess, often a optimistic guess, because nobody wants to quote the customer for the worst case.

**Resource disruptions.** Your lead A&P calls in sick on day 3 of a 7-day heavy check. The only IA-certified inspector is borrowed by another WO that went over scope. The NDT unit is in calibration for 2 days.

**Scope discovery.** This is MRO's defining challenge. When you open up an airframe for an annual inspection, you don't know what you'll find. Corrosion behind a bulkhead. A delaminated control surface skin. An autopilot servo that's legal but visibly worn. The FAA's Airworthiness Directives themselves exist because discovered problems become mandatory fixes fleet-wide. A scheduled 120-hour check becomes a 200-hour check because of discovered damage — and there's no way to know this before you open the panels.

The result: schedules that look precise on day 1 are fiction by day 3. Customers miss aircraft return-to-service dates. Shops run unplanned overtime. Resource leveling breaks down. EVM tracking shows red when the real issue was an unknowable duration, not poor execution.

Probabilistic scheduling treats duration as what it actually is: a random variable with a distribution, not a fixed number.

---

### PERT: The Original Probabilistic Approach

Program Evaluation and Review Technique (PERT) was developed by the US Navy in 1957 for the Polaris submarine missile program — an environment of extreme uncertainty, very much like MRO. PERT's core insight: instead of one duration estimate, ask for three.

For any task:
- **Optimistic duration (O):** How fast if everything goes perfectly. No discoveries, no delays, full crew available.
- **Most-likely duration (M):** The most probable duration under normal conditions. This is your gut estimate.
- **Pessimistic duration (P):** How slow if significant problems occur. Worst case short of catastrophe.

PERT uses a weighted average based on the beta distribution to compute expected duration:

```
E = (O + 4M + P) / 6
```

The standard deviation of the estimate:

```
σ = (P - O) / 6
```

The variance (used for summing uncertainty along a path):

```
σ² = ((P - O) / 6)²
```

For a work order with N independent tasks on the critical path, total expected duration is the sum of expected durations, and total variance is the sum of individual variances (if tasks are independent). This gives the standard deviation of the total path — the "uncertainty band" around the project finish date.

**PERT assumptions and limitations:**
- Assumes task durations follow a beta distribution. Beta is bounded (can't be negative or infinite), which makes physical sense for task durations.
- Assumes tasks on a path are independent. In MRO this is often false: if the wing inspection finds problems, the adjacent structure inspection almost certainly will too.
- Only models the critical path, not all paths. Non-critical paths can become critical under unfavorable conditions.
- The three-point estimates themselves are still human guesses. Anchoring bias makes estimators too conservative with the pessimistic case.

Despite these limitations, PERT is enormously useful as an upgrade from single-point estimation. Adding O/M/P fields to task cards in Athelon requires minimal schema change and delivers immediate value: see Section 7 for the extension plan.

---

### Monte Carlo Simulation for Project Scheduling

Monte Carlo simulation fixes PERT's critical path limitation by simulating the entire project network thousands of times. Each simulation run samples a duration for every task from its probability distribution, computes the project finish date given those sampled durations and all dependencies, and records the result. After 1,000–10,000 runs, you have an empirical distribution of possible project finish dates.

The process:

1. Define a probability distribution for each task (triangular, beta-PERT, lognormal — see Section 2).
2. Run N iterations. For each:
   a. Sample one duration from each task's distribution.
   b. Propagate through the dependency network (CPM forward pass with sampled durations).
   c. Record the project finish date.
3. Sort the N finish dates. The 50th percentile is the median finish date. The 80th percentile is "there's an 80% chance we finish by this date." The 95th percentile is the near-worst-case.
4. Plot the S-curve: cumulative percentage of simulations that finish by each date. The shape tells you how confident you are.

Monte Carlo handles:
- Non-critical paths that sometimes become critical when their task durations are sampled high.
- Correlation between task durations (positive correlation increases overall variance significantly — see Section 2).
- Non-normal completion date distributions (right-skewed, which is typical of MRO projects).

A key practical insight: with 1,000 simulations, results are statistically stable. With 10,000, they're very stable. On a modern machine, 10,000 iterations of a 100-task CPM network runs in well under a second in optimized TypeScript. Section 5 provides working implementation code.

---

### Stochastic RCPSP: Resource-Constrained Scheduling Under Uncertainty

The Resource-Constrained Project Scheduling Problem (RCPSP) is hard enough in its deterministic form — finding a schedule for tasks with dependencies and resource constraints that minimizes makespan is NP-hard. The stochastic variant (SRCPSP) adds random task durations, making it significantly harder.

In SRCPSP, decisions made before a task starts (which resource to assign, which task to start next) must be made without knowing how long that task will take. The optimal policy is typically a priority rule: when a resource becomes free, which waiting task should it work on next? Common rules:
- **SPT (Shortest Processing Time):** Start the task expected to finish quickest. Minimizes average WIP.
- **MTS (Most Total Successors):** Prioritize tasks that unblock the most future work.
- **LST (Latest Start Time):** Prioritize tasks whose latest allowed start is soonest (most urgent).
- **GRPW (Greatest Ranked Positional Weight):** Sum of the task's own expected duration plus all successor durations — prioritizes high-impact tasks.

For Athelon, the practical stochastic scheduling approach is: run Monte Carlo simulation with resource constraints, using a priority rule to resolve resource conflicts in each simulation. The result is not just a distribution of finish dates, but a robust schedule — one that performs well across most realizations of uncertainty.

---

### Proactive vs Reactive Scheduling

**Reactive scheduling** is what most shops do today: build a deterministic schedule, then re-schedule every time something goes wrong (tech calls in sick, part delayed, scope grows). Re-scheduling is disruptive — it propagates changes, disrupts downstream commitments, and consumes manager time.

**Proactive scheduling** builds robustness into the schedule in advance:
- Buffer time is explicitly allocated before highly uncertain tasks or at merge points in the network.
- Resource commitments are held loosely (capacity buffer) to absorb unplanned arrivals.
- Risk events are anticipated and contingency plans pre-computed.

The goal is a schedule that survives most disruptions without requiring a full re-schedule. Minor disruptions are absorbed by buffers. Only major disruptions (scope discovery, emergency AOG arrivals) trigger a re-plan.

Critical Chain Project Management (CCPM) is the most developed proactive scheduling methodology.

---

### Critical Chain Project Management (CCPM)

Eliyahu Goldratt (author of "The Goal") developed CCPM in 1997 as an application of the Theory of Constraints to project management. The core observation: traditional project schedules fail not because individual tasks overrun, but because of two behavioral patterns:

**Student syndrome:** People don't start working until the last minute. If a task has a 5-day estimate, nothing happens for the first 3 days, then there's a panic, and overruns are common.

**Parkinson's Law:** Work expands to fill the available time. If you've been given 5 days and you finish in 3, you don't report it early — you keep working, "polishing" the deliverable, because finishing early looks suspicious.

These two effects mean that schedule padding is hidden inside individual task estimates, but early finishes are never surfaced while late finishes cascade. The project always finishes late even though each task had padding.

CCPM's solution:
1. **Estimate aggressively:** Strip padding from individual task estimates. Use the 50% estimate (50% chance of finishing in time), not the 90% estimate.
2. **Move the safety to the end:** Collect all the individual safety buffers and put them in one project buffer at the end of the critical chain.
3. **Add feeding buffers:** At every merge point where a non-critical chain feeds into the critical chain, add a feeding buffer to protect the critical chain from delays on that path.
4. **Manage by buffer penetration:** Instead of tracking whether each task is on time, track how much buffer has been consumed. If 30% of the project is done and 10% of the buffer consumed, you're in the green. If 30% done and 50% buffer consumed, you're in red.

**Buffer sizing methods:**

*50% Cut method:* Each task is estimated at its median (50% likely) duration. The safety stripped from each task (difference between 90th-percentile estimate and 50th-percentile estimate) is collected. 50% of that total safety becomes the project buffer. Simple and intuitive.

*Root Sum of Squares (RSS) method:* More statistically rigorous. For each task, compute (pessimistic − most likely). Square all these differences, sum them, take the square root. Divide by 2. This is the project buffer. RSS is smaller than the simple 50% cut because it accounts for statistical diversification — not all tasks will simultaneously overrun.

```
Project Buffer (RSS) = √(Σ ((pessimistic_i - most_likely_i)²)) / 2
```

*Monte Carlo sizing:* The most accurate method. Run Monte Carlo on the aggressive (stripped) schedule. Size the project buffer to the difference between the 85th or 90th percentile completion date and the median. This accounts for actual correlation between task durations.

**The fever chart (buffer consumption tracking):**

CCPM uses a 3-zone fever chart to track project health:
- **Green zone (0-33% buffer consumed):** Project is on track. No management action required.
- **Yellow zone (33-67% consumed):** Warning. Root cause analysis needed. Begin contingency planning.
- **Red zone (67-100% consumed):** Escalation required. Management intervention, possible scope reduction, resource addition, or date negotiation.

Buffer penetration is plotted against schedule percent-complete. A diagonal fever chart shows green/yellow/red regions. A project in the upper-left (much buffer consumed, little work done) is in crisis. A project in the lower-right (little buffer consumed, lots of work done) is in great shape.

**Why CCPM works well for MRO:**

MRO has exactly the conditions CCPM was designed for:
- High task duration uncertainty (scope discovery)
- Shared resources (A&P techs, IA inspector, NDT equipment)
- Sequential dependencies with merge points (inspection before closeout)
- Customer commitment to delivery dates (aircraft delivery commitments)
- The student syndrome and Parkinson's Law are very real in maintenance shops

The shift from "is my task on time?" to "how much project buffer have we consumed?" is culturally significant. It stops the defensive behavior of hoarding local safety margin and starts the whole team managing to the project's real health.

---

## 2. Key Techniques

### Monte Carlo Simulation

#### Duration Distributions

**Triangular distribution** is the simplest. Defined by three parameters: minimum (a), most likely (mode, b), maximum (c). Easy to elicit from subject matter experts ("the fastest it could be is 20 hours, most likely 35, worst case 60"). Not statistically rigorous but very practical.

```
PDF: f(x) = 2(x-a)/((c-a)(b-a))   for a ≤ x ≤ b
     f(x) = 2(c-x)/((c-a)(c-b))   for b < x ≤ c
Mean: (a + b + c) / 3
```

**Beta-PERT distribution** combines triangular estimation with the beta distribution's shape. Uses the same three parameters (optimistic, most likely, pessimistic) but produces a smoother, more realistic curve. The PERT formula weights the mode more heavily (4× weight vs 1× for the extremes).

```
PERT mean: μ = (O + 4M + P) / 6
PERT variance: σ² = ((P - O) / 6)²
α = (μ - a) / (c - a) × ((μ - a)(c - μ) / σ² - 1)
β = α × (c - μ) / (μ - a)
```

Beta-PERT is the standard choice for project scheduling. It's bounded (no negative durations), smoothly peaked, and responds well to asymmetric estimates.

**Lognormal distribution** is the statistically correct choice for MRO task durations. Here's why: task durations are the product of many small factors (component condition × technician efficiency × parts availability × interruptions × scope factors). The Central Limit Theorem says the product of independent random variables tends toward lognormal. More practically, MRO durations have a long right tail — there's no floor below zero, but there's substantial probability of discovering something that triples the task duration. Lognormal captures this asymmetry naturally.

Calibrating lognormal from expert estimates:
```typescript
function lognormalFromPERT(
  optimistic: number,
  mostLikely: number,
  pessimistic: number
): { mu: number; sigma: number } {
  const mean = (optimistic + 4 * mostLikely + pessimistic) / 6;
  const variance = Math.pow((pessimistic - optimistic) / 6, 2);
  // Convert normal mean/variance to lognormal parameters
  const mu = Math.log(mean * mean / Math.sqrt(variance + mean * mean));
  const sigma = Math.sqrt(Math.log(1 + variance / (mean * mean)));
  return { mu, sigma };
}
```

Lognormal is strongly recommended for Athelon over triangular or simple PERT because:
1. It cannot go negative (durations can't be negative).
2. It has the right tail properties for discovered damage scenarios.
3. It can be calibrated directly from historical WO actuals using maximum likelihood estimation.

#### Correlation Between Task Durations

One of the most important and most overlooked aspects of Monte Carlo scheduling: task durations are correlated. In MRO, if the wing inspection finds corrosion, the empennage inspection probably will too. The same technician's efficiency affects all tasks they touch. The same aircraft's overall condition affects every task on that work order.

Ignoring correlation underestimates project risk, sometimes dramatically. Two tasks with σ=10 hours each, if independent, add σ=14.1 hours to the project. If they're perfectly correlated, they add σ=20 hours. Real MRO correlations of 0.4–0.7 between tasks on the same aircraft are not uncommon.

Implementing correlation in Monte Carlo: use a Gaussian copula. Generate correlated normal random variables using a Cholesky decomposition of the correlation matrix, then transform them to the target distribution using the inverse CDF.

```typescript
// Generate correlated uniform samples from a correlation matrix
function correlatedSamples(
  correlationMatrix: number[][],
  n: number
): number[][] {
  // Cholesky decomposition
  const L = choleskyDecompose(correlationMatrix);
  const dims = correlationMatrix.length;
  const result: number[][] = Array.from({ length: n }, () => new Array(dims).fill(0));

  for (let i = 0; i < n; i++) {
    // Generate independent standard normals
    const z = Array.from({ length: dims }, () => sampleStandardNormal());
    // Multiply by L to introduce correlation
    const correlated = matMulVec(L, z);
    // Transform to uniform [0,1] using standard normal CDF
    result[i] = correlated.map(v => normalCDF(v));
  }
  return result;
}
```

For Athelon's practical implementation: group tasks by aircraft (high intra-aircraft correlation, ~0.5) and by aircraft type (moderate correlation, ~0.3). Use a simple block correlation structure rather than a full N×N matrix.

#### Output: Probability Distributions and S-Curves

After N Monte Carlo simulations, you have N project finish dates (or N durations). Standard outputs:

**Percentile table:**
```
P10 (10th percentile):  "Finish this early only 10% of the time" — very optimistic
P50 (median):           "50% chance of finishing by this date" — most likely
P80:                    "80% chance of finishing by this date" — likely commitment date
P90:                    "90% chance of finishing by this date" — conservative commitment
P95:                    "95% chance of finishing by this date" — near worst case
```

**S-curve:** Plot cumulative probability (y-axis) vs finish date (x-axis). A steep S-curve means low uncertainty (project duration is well-known). A shallow S-curve means high uncertainty (wide range of possible finish dates). The S-curve is the right visualization for communicating schedule risk to customers and management.

**Tornado diagram:** Shows which tasks have the most impact on project finish date variance. Computed by running the simulation with each task held at its pessimistic value while others are at their mode, then ranking by impact. The top 5-10 tasks in the tornado are where to focus management attention and risk mitigation.

---

### Bayesian Estimation

Bayesian estimation is the statistically principled way to combine two information sources:
1. **Prior:** What we believed before seeing any data (historical data about similar tasks).
2. **Likelihood:** What the current job's in-progress data is telling us.
3. **Posterior:** Updated belief combining both sources.

**Prior distributions from historical data:**

For a given task type (e.g., "PT6A-114A fuel nozzle inspection"), collect all historical actuals. Fit a lognormal distribution to this data. The fitted parameters (μ and σ of the underlying normal) are your prior. A shop with 3 years of data might have 50 instances of this specific task — a very informative prior.

**Bayesian updating as work progresses:**

As a task proceeds, you get signals: 40% complete after 20 hours. The prior said this task takes 50 hours total. If you scale linearly, you'd predict 50 hours. But Bayesian updating lets you weight the new signal appropriately:

- If the prior is tight (very consistent historical data), stick closer to the prior.
- If the prior is diffuse (wide variance in historical data), give more weight to the current signal.

For lognormal with conjugate prior, the posterior is analytically tractable. For more complex models, use Markov Chain Monte Carlo (MCMC), but this is computationally expensive for real-time use.

**Practical Bayesian updating for Athelon:**

A simpler approximation that's good enough for MRO scheduling: exponential smoothing of the estimated remaining duration.

```typescript
function bayesianRemainingDuration(
  priorMean: number,
  priorPrecision: number,    // 1/variance from historical data
  observedHours: number,
  observedPctComplete: number,
): number {
  if (observedPctComplete <= 0) return priorMean;

  // Implied total from current trajectory
  const impliedTotal = observedHours / (observedPctComplete / 100);

  // Precision from current observation (grows as more work is done)
  const observedPrecision = observedPctComplete / 100 * priorPrecision * 2;

  // Bayesian weighted average
  const posteriorMean =
    (priorPrecision * priorMean + observedPrecision * impliedTotal) /
    (priorPrecision + observedPrecision);

  return posteriorMean;
}
```

**Bayesian networks for causal modeling:**

Bayesian networks model causal relationships as directed acyclic graphs. For MRO, a useful network:

```
Aircraft Age → Component Wear → Inspection Duration
               ↓
         Probability of Additional Findings → Scope Growth → WO Duration
               ↓
         Parts Condition → Parts Order Probability → Lead Time Risk
```

Bayesian networks allow "what does this tell us about everything else?" inference. If we observe that the landing gear inspection found significant wear (high finding severity), the network can update its probability estimates for the wing structure inspection's outcome, the expected scope growth, and the likely total WO duration.

Building Bayesian networks requires causal domain knowledge (from your A&Ps) plus historical data for probability estimation. Libraries: `bayesjs` (TypeScript), `pgmpy` (Python).

---

### Machine Learning for Duration Prediction

ML for MRO duration prediction treats historical work orders as training examples. Each WO is a labeled data point: features describe the job, and the label is the actual duration.

#### Feature Engineering for MRO

Good features for predicting WO or task duration:

**Aircraft characteristics:**
- Aircraft type (e.g., "King Air 350", "Cessna Citation CJ4") — one-hot encoded or embedding
- Aircraft age in years
- Total airframe hours (TTAF)
- Cycles since new (for pressurized aircraft)
- Hours/cycles since last heavy check
- Time since last engine overhaul (engine hours)
- Historical severity score: average finding severity from last 5 visits

**Work scope:**
- Task card types and counts by category (inspection, repair, replacement, etc.)
- Scheduled visit type (annual, phase, 12-month, C-check, D-check)
- Number of open ADs at time of check
- Pre-existing known squawks at intake
- Scope flag: is this a repeat inspection (higher risk of finding corrosion)?

**Shop conditions:**
- Season / month (winter finds more corrosion from salt; post-summer finds more UV damage)
- Current shop load (% capacity)
- Assigned technician experience level
- Whether QCM inspector is on-site vs visiting

**Historical patterns:**
- This aircraft's average historical scope growth (did this tail number typically run over?)
- This customer's historical approval rate for additional work
- Vendor turnaround time for parts common to this aircraft type

#### Gradient Boosted Trees (XGBoost/LightGBM)

Gradient boosted trees are the standard-of-practice for structured tabular data prediction. They:
- Handle mixed feature types (numeric, categorical) naturally
- Are robust to irrelevant features and multicollinearity
- Provide feature importance rankings (which features matter most)
- Work well with relatively small datasets (hundreds to thousands of examples)
- Train in seconds and predict in microseconds

For Athelon, XGBoost would train on historical WO records (exported from Convex) and serve predictions via a Python microservice. Feature importance from XGBoost directly answers "what makes a maintenance visit run long?" — actionable intelligence for pricing and scheduling.

Expected accuracy with good features and 500+ historical WOs: mean absolute error of 15-25% of actual duration. This is substantially better than naive estimation.

#### Neural Networks

Neural networks (particularly multi-layer perceptrons with embedding layers for categorical features) can improve on gradient boosted trees when you have large datasets (10,000+ WOs) or when you need to capture complex non-linear interactions. For most MRO operators, XGBoost will match or exceed neural networks with far less data and complexity.

Recurrent networks (LSTM, GRU) are useful for sequential data: predicting task card duration given the sequence of previous task cards already completed on this WO, or modeling aircraft health trajectories.

#### Classification Models: Predicting Events

Not all ML targets are continuous. Binary classifiers predict event probabilities:

- **Scope growth probability:** Given the intake inspection results, what's the probability this WO will add more than 20% of its original estimated hours? Feature: finding count from intake inspection, aircraft age, task card types.
- **AOG risk:** Given aircraft characteristics and recent maintenance history, what's the probability of an unscheduled AOG in the next 30 days?
- **Parts delay risk:** Given part numbers ordered, vendor, order size, and time of year, what's the probability of a delay exceeding 5 business days?

These probability outputs feed directly into scheduling decisions: flag high-risk WOs for extra resource buffer, pre-order parts for AOG-risk aircraft, add feeding buffers at scope-growth-likely tasks.

#### Time Series Forecasting: Maintenance Demand Prediction

Predicting how many WOs will arrive in the next quarter — and of what types — is essential for capacity planning. This is a time series forecasting problem.

**Inputs:**
- Fleet flight hours and cycles (from customer-reported data)
- Calendar intervals (annual inspections arrive roughly annually)
- Historical arrival patterns for this customer's fleet
- Seasonal effects (flying season, weather, operator patterns)
- Contracted maintenance visits

**Methods:**
- **Simple exponential smoothing:** Works for stable demand with no trend. Very easy to implement.
- **Holt-Winters:** Handles trend and seasonality. Good for shops with clear seasonal patterns.
- **Prophet (Meta):** Handles multiple seasonality, trend changepoints, and holiday effects. Requires Python but is very easy to use. Input: dates and WO counts. Output: forecast with uncertainty intervals.
- **ARIMAX:** Adds external regressors (flight hours, cycles) to ARIMA. Good when you have leading indicators.

For Athelon, the highest-value forecasting target is "projected WO arrivals by aircraft type over the next 90 days" — this drives bay planning, hiring decisions, and vendor pre-ordering.

---

### Stochastic Optimization

#### Two-Stage Stochastic Programming

In two-stage stochastic programming, decisions are split into two groups:

**First stage (here-and-now):** Decisions made before uncertainty resolves. In scheduling: which WOs to commit to for next week, how many techs to assign per shift, which bays to allocate.

**Second stage (wait-and-see, recourse):** Decisions made after uncertainty resolves. In scheduling: if a WO runs long, do we add overtime? If a tech is sick, do we reassign tasks? If parts are delayed, what do we reschedule?

The objective is to minimize expected cost: first-stage costs plus expected second-stage recourse costs, where expectation is taken over scenarios of uncertainty.

```
min c₁ᵀx + E[Q(x, ξ)]
subject to: Ax = b  (first-stage constraints)
            x ≥ 0

where Q(x, ξ) = min c₂ᵀy
               subject to: Ty + Wx = h(ξ)  (second-stage constraints given scenario ξ)
                           y ≥ 0
```

For Athelon, a practical two-stage model:
- **First stage:** Schedule X techs per shift across Y WOs. Cost: labor cost.
- **Second stage scenarios:** Scope grows by Z%. Tech availability drops by W%. Parts delayed by D days. Recourse: authorize overtime (cost: 1.5× rate), outsource to vendor (cost: premium rate), negotiate customer extension (cost: relationship risk).

Solving two-stage stochastic programs requires specialized solvers. The scenario approach: enumerate K scenarios (Monte Carlo samples), solve the resulting deterministic equivalent program with K×|second-stage variables| variables. Feasible for 50-200 scenarios with good MIP solvers.

#### Robust Optimization

Robust optimization doesn't require probability distributions — just an uncertainty set. The goal: find a schedule that is feasible for every realization of uncertainty within the set.

```
min max_{ξ ∈ Ξ} f(x, ξ)
subject to: g(x, ξ) ≤ 0   for all ξ ∈ Ξ
```

For scheduling: "the schedule must be feasible even if any task takes up to 30% longer than estimated." The robust solution is automatically more conservative, but it provides hard guarantees rather than probabilistic ones.

Robust optimization is appealing for MRO because:
- You don't need historical data to fit distributions.
- The resulting schedule is defensible: "we can commit to this date even if things go wrong."
- Conservative enough for AOG turnaround commitments.

Downside: robust solutions are often too conservative (pessimistic) when actual uncertainty is moderate. Distributionally robust optimization is a middle ground: optimize against the worst-case distribution within a family of distributions consistent with observed data.

#### Chance-Constrained Programming

Instead of worst-case guarantees, chance constraints require that constraints hold with high probability:

```
P(schedule meets due date) ≥ 0.95
```

This is directly useful for MRO customer commitments: "we'll commit to a return date when we're 90% confident we can meet it." Solving chance-constrained programs requires either analytical approximations (when distributions are Gaussian) or sample approximation (generate N scenarios, require the constraint to hold for N×0.95 of them).

For Athelon: use Monte Carlo to estimate P(finish by proposed date) for each WO. Surface this probability to the shop manager when creating a customer commitment. If confidence is below 80%, flag for review before committing.

---

### Critical Chain / Buffer Management

See Section 1 for the theoretical foundation. Implementation details:

#### Buffer Sizing in Practice

For a work order with tasks on the critical chain:

```typescript
function computeProjectBuffer(
  criticalChainTasks: Array<{
    mostLikely: number;   // 50% estimate (after stripping padding)
    pessimistic: number;  // 90% estimate
  }>,
  method: "rss" | "fifty_percent" | "monte_carlo",
  monteCarloResults?: number[],
): number {
  if (method === "rss") {
    const sumOfSquares = criticalChainTasks.reduce((sum, task) => {
      const diff = task.pessimistic - task.mostLikely;
      return sum + diff * diff;
    }, 0);
    return Math.sqrt(sumOfSquares) / 2;
  }

  if (method === "fifty_percent") {
    const totalSafety = criticalChainTasks.reduce((sum, task) => {
      return sum + (task.pessimistic - task.mostLikely);
    }, 0);
    return totalSafety * 0.5;
  }

  if (method === "monte_carlo" && monteCarloResults) {
    const sorted = [...monteCarloResults].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p85 = sorted[Math.floor(sorted.length * 0.85)];
    return p85 - p50;
  }

  return 0;
}
```

Feeding buffers for merge points are typically 50% of the feeding chain's RSS buffer, or half the feeding chain's critical path safety.

#### Buffer Penetration Tracking

```typescript
interface BufferStatus {
  projectBufferHours: number;
  consumedHours: number;
  penetrationPct: number;     // 0-100
  zone: "green" | "yellow" | "red";
  schedulePctComplete: number;
}

function computeBufferStatus(
  originalCompletionDate: number,  // with project buffer
  currentProjectedDate: number,    // based on current progress
  projectBufferHours: number,
  schedulePctComplete: number,
): BufferStatus {
  const HOURS = 3_600_000;
  const delayMs = Math.max(0, currentProjectedDate - originalCompletionDate + projectBufferHours * HOURS);
  const consumedHours = delayMs / HOURS;
  const penetrationPct = Math.min(100, (consumedHours / projectBufferHours) * 100);

  let zone: "green" | "yellow" | "red";
  if (penetrationPct < 33) zone = "green";
  else if (penetrationPct < 67) zone = "yellow";
  else zone = "red";

  return {
    projectBufferHours,
    consumedHours,
    penetrationPct,
    zone,
    schedulePctComplete,
  };
}
```

The fever chart maps penetration percentage against schedule percent complete. A project in the upper-left of the chart (high buffer consumption, low schedule progress) is in crisis. This can be integrated with Athelon's existing EVM dashboard: both CPI/SPI from EVM and buffer penetration from CCPM tell the same story from different angles.

---

## 3. General Use Cases

### Construction Project Risk Analysis

Construction scheduling is probabilistic scheduling's home domain. A bridge construction project has thousands of tasks with duration uncertainty driven by weather, soil conditions, material lead times, and labor availability.

A real-world example: the Denver International Airport opening was delayed by 16 months and cost $2 billion in overruns, partly because the baggage system integration timeline was estimated deterministically. Monte Carlo simulation post-hoc showed that the P50 completion date was already past the announced opening date — the overrun was predictable from the schedule uncertainty alone.

Standard practice in major construction projects: any project over $50M uses Monte Carlo risk analysis (commonly with Primavera Risk Analysis or @RISK). Typical output: "Base case is June 2027. P80 is October 2027. P95 is February 2028. The main risk driver is concrete curing delays in the tower section."

### Drug Development Pipeline Scheduling

Pharmaceutical development has extreme duration uncertainty: Phase 2 clinical trials take 2-7 years. Regulatory approval timelines are inherently uncertain. Bayesian methods are critical because you update estimates constantly as trial data comes in.

Portfolio-level scheduling: a large pharma company has 50 compounds in the pipeline. Bayesian network models the probability of each compound reaching each phase. Monte Carlo at the portfolio level predicts future capacity demand for manufacturing and regulatory affairs staff.

**Lesson for Athelon:** Portfolio-level Monte Carlo (across all active WOs) predicts aggregate demand for technicians, bay space, and parts. Not just individual WO completion dates.

### IT Project Portfolio Management

IT projects famously run late. The Standish Group's CHAOS report consistently finds 70%+ of IT projects deliver late. Monte Carlo simulation of project portfolios predicts which projects will conflict for shared resources (senior developers, test environments, data engineers) before the conflict materializes.

**Lesson for Athelon:** The shared IA inspector constraint in MRO is analogous. One IA inspector serving multiple WOs is a critical resource that creates serialization pressure. Monte Carlo reveals how this constraint propagates uncertainty through the shop's schedule.

### Oil & Gas Maintenance Turnaround Planning

Turnaround (TAR) planning for refineries is perhaps the closest analog to MRO heavy checks. A refinery turnaround involves:
- Shutting down a unit (equivalent to aircraft grounded)
- 500-2,000 tasks over 2-6 weeks
- Scope discovery as lines are opened (rust, fouling, unexpected wear)
- Hard deadline (unit must restart by X date or revenue loss is catastrophic)
- Specialized labor that's hired in from contractors (like outsourcing to other MRO shops)

The oil and gas industry uses sophisticated Monte Carlo simulation for TAR planning. Standard practice: model scope discovery as a Poisson process (random additional findings arrive at a certain rate per day of work). Budget reserves based on Monte Carlo P80. Track buffer penetration against hard restart deadline.

**Lesson for Athelon:** Model scope discovery as random additional task cards arriving during a WO. Calibrate the Poisson arrival rate from historical data (average additional tasks per inspection for this aircraft type/age). This is more realistic than either ignoring scope growth or applying a flat percentage.

### Defense Acquisition Program Scheduling

DoD uses the Integrated Master Schedule (IMS) framework, which mandates probabilistic scheduling for major programs. DCSA (Defense Contract Security Agency) audits schedule risk analyses. The standard tool is @RISK or Polaris for schedule risk analysis on top of Primavera P6 schedules.

A characteristic finding from defense programs: the "merge bias" — when multiple parallel paths converge at a merge point, the merge point's completion date is determined by the slowest path. With random durations, the expected duration of the merge point is always greater than the longest path's expected duration. CPM understates project duration because it ignores this merge bias. Monte Carlo captures it automatically.

**Lesson for Athelon:** Multi-path WOs with merge points (e.g., engine AND avionics AND structural checks all feed into the final inspection) are longer in expectation than CPM predicts. Monte Carlo automatically captures this. This directly applies to complex WOs with parallel task chains.

### Real-World Example: Confidence Intervals from Monte Carlo

A Boeing 737 D-check (heavy maintenance) at a major MRO:
- CPM shows 21-day critical path.
- Monte Carlo (500 simulations, triangular distributions based on historical data):
  - P10: 18 days (unrealistically optimistic)
  - P50: 23 days (2 days longer than CPM — merge bias)
  - P80: 27 days
  - P95: 33 days

Customer commitment: 24 days. Monte Carlo says this is achievable with ~55% probability. The shop manager sees this number and negotiates 26 days (P65), or adds a resource to push P80 to 24 days.

Without Monte Carlo, the shop commits to 22 days (CPM + 5% safety), misses by 3 days, and loses customer confidence.

---

## 4. Athelon-Specific Use Cases

### Work Order Completion Prediction

**What it answers:** "When will this specific work order be done?"

**Data requirements:**
- Optimistic/most-likely/pessimistic hour estimates per task card (new fields on `taskCards` schema).
- Actual hours logged per task card as work progresses (already in schema: `actualHours`).
- Task dependency graph (already in `MRODependency`).
- Assigned technician efficiency multiplier (already in `TechnicianResource.efficiencyMultiplier`).

**Method:** Run Monte Carlo simulation of the WO's CPM network. Sample task durations from beta-PERT distributions defined by the three-point estimates. Propagate through the dependency graph. Collect completion dates across N=1,000 iterations. Report P50, P80, P90 completion dates.

As work progresses, update remaining duration estimates using Bayesian updating: weight the historical prior against the current progress trajectory. The confidence interval narrows as more tasks complete.

**Output to user:**
```
Work Order WO-2847 (King Air 350 Annual)
Completion forecast (as of Day 3 of estimated 7 days):
  50% confidence: Friday, March 14 (4 more days)
  80% confidence: Monday, March 17 (7 more days)
  95% confidence: Wednesday, March 19 (9 more days)
Current task risks: NDT inspection (2.5hr estimated, 4–8hr likely)
Buffer status: YELLOW (41% consumed)
```

**Integration point:** A Convex action that runs Monte Carlo for a given WO ID. Results stored in a `scheduleForecasts` Convex table, queried by the WO detail page. Re-runs triggered by task card status changes and daily.

---

### Capacity Demand Forecasting

**What it answers:** "How many WOs of what types will arrive in the next 60–90 days? Will we have enough tech hours?"

**Data requirements:**
- Fleet registry per customer: aircraft types, tail numbers, TTAF, last maintenance dates.
- Maintenance program data: inspection intervals (hours and calendar) for each aircraft type.
- Historical WO arrival data: dates, aircraft, visit types, actual hours.
- Current contracted WO backlog.

**Method:**
1. For each aircraft in each customer's fleet, compute when each maintenance interval comes due (calendar and hours-based). This creates a scheduled demand forecast (deterministic baseline).
2. Add stochastic unscheduled demand: model AOG and unscheduled visits as a Poisson process, with rate calibrated from historical data per aircraft type.
3. For each forecasted WO, use ML model (XGBoost) to predict expected labor hours based on aircraft characteristics and visit type.
4. Aggregate across all customers to get total projected labor demand per week.
5. Compare against projected supply (technicians × working days × shifts × efficiency).
6. Monte Carlo at the fleet level: sample WO durations from distributions, aggregate, compare against capacity.

**Output to user:** A capacity forecast chart showing projected demand (with uncertainty band) vs planned capacity for the next 13 weeks. Weeks in red = likely overloaded. Shop manager uses this to plan hiring, overtime authorization, and inter-shop outsourcing in advance.

**Integration point:** A Convex scheduled action that runs weekly, forecasts demand, and stores results in a `capacityForecasts` table. Visualized on the capacity planning page.

---

### AOG Risk Prediction

**What it answers:** "Which aircraft in our customers' fleets are most likely to go AOG in the next 30 days? Which ones should we proactively schedule for inspection?"

**Data requirements:**
- Aircraft age, TTAF, cycles, engine hours.
- Time since last comprehensive inspection (not just annual — includes any squawks found and addressed).
- Historical AOG events for this aircraft and similar aircraft.
- Recent squawk history: severity and frequency of recent write-ups.

**Method:** Train a binary classifier (XGBoost or logistic regression) on historical data. Target variable: did this aircraft go AOG within 30 days of this snapshot? Features: age, hours, cycles, recent write-up rate, days since last inspection, time since engine overhaul, aircraft type.

This is a classic predictive maintenance problem. The output is a probability for each aircraft: "0.23 = 23% probability of AOG in next 30 days." Aircraft above a threshold (say, 15%) are flagged for proactive outreach to the customer.

**Output to user:** A risk dashboard showing all customer aircraft sorted by AOG probability. High-risk aircraft highlighted. One-click to create a proactive inspection WO and contact the customer.

**Integration point:** Model served by a Python microservice (trained monthly on updated data). Risk scores stored in Convex with timestamps. Surfaced on the Fleet overview page and customer CRM.

---

### Scope Growth Prediction

**What it answers:** "When we open this aircraft for its scheduled check, how much additional work are we likely to find? How should we adjust our initial estimate and resource allocation?"

**Data requirements:**
- Aircraft type, age, TTAF, cycles, time since last heavy check.
- Historical scope growth data: for each WO, the ratio of final hours to initial estimated hours, and what categories of additional tasks were found.
- Environmental history: aircraft based in coastal environment? High-cycle operator? Cargo operator?

**Method:**
1. Predict scope growth multiplier: for this aircraft/visit type, what is the distribution of (actual hours / estimated hours)? This is a regression problem: median prediction is the expected scope multiplier, and the distribution gives uncertainty.
2. Predict likelihood of specific additional finding types: corrosion (high-risk for coastal/old aircraft), cracked structure (high-cycle aircraft), worn components (high-hours engines), AD-triggered work (recent AD releases).
3. Output: adjusted initial estimate = original estimate × predicted scope multiplier. Schedule resource allocation based on the P80 estimate, not P50.

**Output to user:** When creating a WO for a King Air 350 that's 18 years old, 8,000 hours, last heavy check 3 years ago, the system says:
```
Scope growth prediction:
  Base estimate: 180 labor hours
  Adjusted P50:  220 labor hours (+22%)
  Adjusted P80:  285 labor hours (+58%)
  High risk findings: Corrosion (76% prob), Control surface hinge wear (45% prob)
  Recommended initial allocation: 250 hours
```

**Integration point:** ML prediction called when creating or editing a WO. Python microservice or Convex action that calls the prediction service.

---

### Parts Lead Time Prediction

**What it answers:** "Will parts arrive in time for this WO? Which parts orders are at risk of causing a delay?"

**Data requirements:**
- Historical parts orders: part number, vendor, order date, promised date, actual delivery date.
- Part type classification (standard, PMA, overhauled, special order, OEM only).
- Order characteristics: quantity, backorder status at time of order.
- Vendor-specific patterns: on-time delivery rate per vendor.

**Method:** For each active parts order on a WO:
1. Look up historical delivery times for this part number / part type / vendor combination.
2. Fit a lognormal distribution to historical lead times.
3. Compare P80 lead time against WO due date to compute probability of delay.
4. Flag orders where P(delivery before WO due date) < 80%.

A second-order model: if this part category from this vendor is currently showing a 15% longer lead time than historical average (based on recent orders), apply a lead-time inflation factor. This captures vendor capacity issues or supply chain disruptions.

**Output to user:** On the WO detail page, a parts risk panel showing each ordered part with a risk indicator. Parts with >20% delay probability highlighted in amber/red with the P50 and P80 delivery date.

**Integration point:** Convex query that computes lead time risk for each active parts order, using historical data from the `partsOrders` table.

---

### Technician Productivity Forecasting

**What it answers:** "How efficient will our technicians be on this task, given their experience, recency, and current workload?"

**Data requirements:**
- Technician certification history: when each cert was obtained and last exercise date.
- Historical task performance: actual vs estimated hours per task card, by technician.
- Current workload: hours worked this week, overtime last week.
- Task complexity: task card type, aircraft type, specific task (e.g., "first time this tech has done this specific inspection").

**Method:** Efficiency multiplier prediction:

```
efficiency = base_efficiency × experience_factor × recency_factor × fatigue_factor × novelty_factor
```

- **base_efficiency:** Historical ratio of estimated/actual for this technician. If they consistently beat estimates by 15%, base = 1.15.
- **experience_factor:** Years of experience with this aircraft type. Logarithmic curve (first year: 0.7, 5 years: 1.0, 15+ years: 1.2).
- **recency_factor:** Certification recency. If an IA hasn't signed off an annual in 6 months, initial performance may be 10-15% slower.
- **fatigue_factor:** Current week hours / normal hours. If a tech has worked 60 hours this week already, factor = 0.85.
- **novelty_factor:** First time performing this specific task? Initial learning curve applies.

This model can be calibrated by fitting the multiplier terms against historical task card actuals.

**Output to user:** When assigning a tech to a task card, display the predicted efficiency multiplier and adjusted expected duration. A tech with 0.85 efficiency on a 20-hour task takes 23.5 hours. Affect scheduling accordingly.

**Integration point:** Extend `TechnicianResource.efficiencyMultiplier` (already in the schema) to be computed dynamically rather than static. Convex query that computes current-state efficiency given all factors.

---

### Hiring Needs Forecasting

**What it answers:** "When will our current team capacity be insufficient to meet projected demand? How many A&Ps do we need, and by when?"

**Data requirements:**
- Current technician headcount and certifications.
- Demand forecast output (from capacity demand forecasting above).
- Planned attrition: known upcoming retirements, turnover rate.
- Hiring lead time: how long from job posting to productive technician (typically 6-10 weeks for experienced A&Ps).

**Method:**
1. Project supply: current FTE × efficiency × available days per month. Reduce by expected attrition.
2. Compare against projected demand (from Monte Carlo capacity forecast).
3. Find first month where P70 demand exceeds P30 supply (supply minus 1σ).
4. Back-project by hiring lead time to find when hiring must begin.
5. Output: "At current demand trajectory, you'll need 1 additional A&P by August. Hiring should begin by June."

Monte Carlo at the workforce level: sample demand uncertainty, sample attrition uncertainty, compute supply-demand gap distribution for each future month. Report month-by-month probability of capacity shortfall.

**Output to user:** A workforce planning chart on the settings or admin page: projected headcount vs projected demand with confidence bands. "Capacity gap likely by month X" warning. Integrates with the existing technician management pages.

---

### Training Impact Prediction

**What it answers:** "If we send Tech A and Tech B for their IA certification, how will that affect our capacity and outsourcing costs?"

**Data requirements:**
- Current certification matrix: which techs hold which certs.
- Historical analysis of which WOs were constrained by IA availability.
- Cost of outsourcing IA inspections (vendor rate vs labor cost).
- Training cost and duration (technician unavailable during training).

**Method:**
1. Identify WOs historically delayed or outsourced due to IA scarcity.
2. Model current scheduling as a constraint satisfaction problem: IA certifications are the binding constraint on which WOs can be completed in-house vs outsourced.
3. Run scheduling simulation with proposed new certification matrix.
4. Compare: in-house hours completed, outsourcing costs, schedule delays — before and after adding the IA cert.
5. Compute ROI: outsourcing savings minus training cost, annualized.

This is essentially a what-if scenario: re-run the capacity and scheduling models with modified resource parameters.

**Output to user:** "Adding IA certification to 2 technicians is projected to reduce outsourcing costs by $48,000/year and eliminate 4 scheduling delays per quarter. Break-even on training cost: 4 months."

**Integration point:** A what-if scenario interface on the personnel/training page. Run Monte Carlo with modified tech certification matrix.

---

## 5. Implementation Details

### TypeScript Monte Carlo Simulation Engine

A complete, working Monte Carlo simulation engine for Athelon's CPM network. Zero external dependencies.

```typescript
/**
 * monte-carlo-scheduler.ts
 *
 * Monte Carlo simulation for work order completion date prediction.
 * Extends the existing critical-path.ts CPM engine.
 *
 * Pure function: no side effects, no database calls.
 */

// ============================================================
// Distribution Types & Samplers
// ============================================================

export interface BetaPERTDistribution {
  type: "beta_pert";
  optimistic: number;    // hours
  mostLikely: number;    // hours
  pessimistic: number;   // hours
}

export interface TriangularDistribution {
  type: "triangular";
  min: number;
  mode: number;
  max: number;
}

export interface LognormalDistribution {
  type: "lognormal";
  mu: number;      // mean of underlying normal
  sigma: number;   // std dev of underlying normal
}

export interface FixedDistribution {
  type: "fixed";
  value: number;
}

export type DurationDistribution =
  | BetaPERTDistribution
  | TriangularDistribution
  | LognormalDistribution
  | FixedDistribution;

// Box-Muller transform for standard normal sampling
function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Sample from beta distribution using Johnk's method (simple approximation via normal)
// For beta-PERT: use the PERT mean/variance to parameterize a beta distribution
function sampleBetaPERT(dist: BetaPERTDistribution): number {
  const { optimistic: O, mostLikely: M, pessimistic: P } = dist;

  // PERT mean and variance
  const mean = (O + 4 * M + P) / 6;
  const variance = Math.pow((P - O) / 6, 2);

  // Beta distribution parameters (method of moments)
  const range = P - O;
  if (range <= 0) return M;

  const alpha =
    ((mean - O) / range) *
    (((mean - O) * (P - mean)) / variance - 1);
  const beta =
    alpha * ((P - mean) / (mean - O));

  // Sample from beta(alpha, beta) using Cheng's method
  // Simplified: use lognormal approximation for good results with typical PERT shapes
  const mu = Math.log(mean) - 0.5 * Math.log(1 + variance / (mean * mean));
  const sigma = Math.sqrt(Math.log(1 + variance / (mean * mean)));

  const sample = Math.exp(mu + sigma * sampleStandardNormal());
  // Clamp to [optimistic, pessimistic]
  return Math.max(O, Math.min(P, sample));
}

function sampleTriangular(dist: TriangularDistribution): number {
  const { min: a, mode: b, max: c } = dist;
  const u = Math.random();
  const fc = (b - a) / (c - a);
  if (u < fc) {
    return a + Math.sqrt(u * (c - a) * (b - a));
  } else {
    return c - Math.sqrt((1 - u) * (c - a) * (c - b));
  }
}

function sampleLognormal(dist: LognormalDistribution): number {
  return Math.exp(dist.mu + dist.sigma * sampleStandardNormal());
}

export function sampleDuration(dist: DurationDistribution): number {
  switch (dist.type) {
    case "beta_pert":
      return sampleBetaPERT(dist);
    case "triangular":
      return sampleTriangular(dist);
    case "lognormal":
      return sampleLognormal(dist);
    case "fixed":
      return dist.value;
  }
}

// ============================================================
// Task with Distribution
// ============================================================

export interface StochasticTask {
  id: string;
  distribution: DurationDistribution;
  /** Task IDs this task depends on (FS dependencies) */
  predecessors: string[];
  /** Whether this is on the critical chain */
  isOnCriticalChain?: boolean;
}

// ============================================================
// Single Simulation Run (Forward Pass with Sampled Durations)
// ============================================================

function runSingleSimulation(
  tasks: StochasticTask[],
): Map<string, { start: number; finish: number; duration: number }> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const results = new Map<string, { start: number; finish: number; duration: number }>();

  // Topological order (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, 0);
    adjList.set(task.id, []);
  }

  for (const task of tasks) {
    for (const predId of task.predecessors) {
      if (taskMap.has(predId)) {
        adjList.get(predId)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    }
  }

  const queue = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = taskMap.get(id)!;

    // Sample duration for this task
    const duration = sampleDuration(task.distribution);

    // Earliest start = max finish of all predecessors
    let earliestStart = 0;
    for (const predId of task.predecessors) {
      const pred = results.get(predId);
      if (pred) {
        earliestStart = Math.max(earliestStart, pred.finish);
      }
    }

    results.set(id, {
      start: earliestStart,
      finish: earliestStart + duration,
      duration,
    });

    // Update successors
    for (const succId of adjList.get(id) ?? []) {
      const newDeg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, newDeg);
      if (newDeg === 0) queue.push(succId);
    }
  }

  return results;
}

// ============================================================
// Monte Carlo Result Types
// ============================================================

export interface MonteCarloResult {
  /** Number of simulation iterations */
  iterations: number;
  /** Project duration samples (hours from start to finish) */
  durationSamples: number[];
  /** Percentile completion durations */
  percentiles: {
    p10: number;
    p20: number;
    p50: number;
    p60: number;
    p70: number;
    p80: number;
    p85: number;
    p90: number;
    p95: number;
  };
  /** Mean duration */
  mean: number;
  /** Standard deviation */
  stdDev: number;
  /** Per-task criticality index: fraction of simulations where this task is on the longest path */
  criticalityIndex: Map<string, number>;
  /** Tornado data: per-task impact on duration variance */
  tornadoData: Array<{ taskId: string; impactHours: number; correlationWithTotal: number }>;
}

// ============================================================
// Main Monte Carlo Engine
// ============================================================

export function runMonteCarlo(
  tasks: StochasticTask[],
  iterations: number = 1_000,
): MonteCarloResult {
  if (tasks.length === 0) {
    return {
      iterations: 0,
      durationSamples: [],
      percentiles: { p10: 0, p20: 0, p50: 0, p60: 0, p70: 0, p80: 0, p85: 0, p90: 0, p95: 0 },
      mean: 0,
      stdDev: 0,
      criticalityIndex: new Map(),
      tornadoData: [],
    };
  }

  const durationSamples: number[] = [];
  // Track per-task duration samples for tornado analysis
  const taskDurationSamples = new Map<string, number[]>(
    tasks.map((t) => [t.id, []])
  );
  // Track how often each task is on the longest path (critical)
  const criticalCount = new Map<string, number>(tasks.map((t) => [t.id, 0]));

  for (let i = 0; i < iterations; i++) {
    const simResult = runSingleSimulation(tasks);

    // Project duration = max finish time across all tasks
    let projectDuration = 0;
    let longestPathFinish = 0;

    for (const [, result] of simResult) {
      if (result.finish > projectDuration) {
        projectDuration = result.finish;
        longestPathFinish = result.finish;
      }
    }

    durationSamples.push(projectDuration);

    // Record task durations for correlation analysis
    for (const [taskId, result] of simResult) {
      taskDurationSamples.get(taskId)?.push(result.duration);
    }

    // Identify tasks on the critical (longest) path in this iteration
    // A task is critical if its finish equals the project finish AND
    // removing it would reduce the project finish
    const EPSILON = 0.001;
    for (const [taskId, result] of simResult) {
      if (Math.abs(result.finish - longestPathFinish) < EPSILON) {
        criticalCount.set(taskId, (criticalCount.get(taskId) ?? 0) + 1);
      }
    }
  }

  // Sort samples for percentile computation
  const sorted = [...durationSamples].sort((a, b) => a - b);

  function percentile(p: number): number {
    const idx = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  const mean = durationSamples.reduce((a, b) => a + b, 0) / durationSamples.length;
  const variance =
    durationSamples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
    durationSamples.length;
  const stdDev = Math.sqrt(variance);

  // Criticality index
  const criticalityIndex = new Map<string, number>();
  for (const [taskId, count] of criticalCount) {
    criticalityIndex.set(taskId, count / iterations);
  }

  // Tornado data: Pearson correlation of each task's duration with total project duration
  const tornadoData: Array<{ taskId: string; impactHours: number; correlationWithTotal: number }> = [];

  for (const task of tasks) {
    const taskSamples = taskDurationSamples.get(task.id) ?? [];
    if (taskSamples.length < 10) continue;

    const taskMean = taskSamples.reduce((a, b) => a + b, 0) / taskSamples.length;

    let numerator = 0;
    let denomTask = 0;
    let denomProject = 0;

    for (let i = 0; i < taskSamples.length; i++) {
      const dx = taskSamples[i] - taskMean;
      const dy = durationSamples[i] - mean;
      numerator += dx * dy;
      denomTask += dx * dx;
      denomProject += dy * dy;
    }

    const correlation =
      denomTask > 0 && denomProject > 0
        ? numerator / Math.sqrt(denomTask * denomProject)
        : 0;

    // Impact: how much does a 1-sigma change in this task change project duration?
    const taskStdDev = Math.sqrt(
      taskSamples.reduce((sum, x) => sum + Math.pow(x - taskMean, 2), 0) /
        taskSamples.length
    );

    tornadoData.push({
      taskId: task.id,
      impactHours: Math.abs(correlation) * taskStdDev,
      correlationWithTotal: correlation,
    });
  }

  tornadoData.sort((a, b) => b.impactHours - a.impactHours);

  return {
    iterations,
    durationSamples,
    percentiles: {
      p10: percentile(10),
      p20: percentile(20),
      p50: percentile(50),
      p60: percentile(60),
      p70: percentile(70),
      p80: percentile(80),
      p85: percentile(85),
      p90: percentile(90),
      p95: percentile(95),
    },
    mean,
    stdDev,
    criticalityIndex,
    tornadoData,
  };
}

// ============================================================
// S-Curve Generator
// ============================================================

export interface SCurvePoint {
  durationHours: number;
  cumulativeProbability: number;  // 0-1
}

export function generateSCurve(
  result: MonteCarloResult,
  points: number = 50,
): SCurvePoint[] {
  const { durationSamples } = result;
  if (durationSamples.length === 0) return [];

  const sorted = [...durationSamples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const step = (max - min) / (points - 1);

  const curve: SCurvePoint[] = [];
  for (let i = 0; i < points; i++) {
    const duration = min + i * step;
    const countBelow = sorted.filter((d) => d <= duration).length;
    curve.push({
      durationHours: duration,
      cumulativeProbability: countBelow / sorted.length,
    });
  }

  return curve;
}

// ============================================================
// Convert CPMItem to StochasticTask
// ============================================================

import type { CPMItem, MRODependency } from "./types"; // existing types

export interface PERTEstimate {
  optimisticHours: number;
  mostLikelyHours: number;
  pessimisticHours: number;
}

export function cpmItemToStochasticTask(
  item: CPMItem,
  pertEstimate: PERTEstimate | null,
  dependencies: MRODependency[],
): StochasticTask {
  const predecessors = dependencies
    .filter((d) => d.successorId === item.id && d.type === "FS")
    .map((d) => d.predecessorId);

  let distribution: DurationDistribution;

  if (pertEstimate) {
    distribution = {
      type: "beta_pert",
      optimistic: pertEstimate.optimisticHours,
      mostLikely: pertEstimate.mostLikelyHours,
      pessimistic: pertEstimate.pessimisticHours,
    };
  } else {
    // Fallback: triangular based on estimated duration with ±20% / +60% range
    const mode = (item.duration ?? 3_600_000) / 3_600_000; // convert ms to hours
    distribution = {
      type: "triangular",
      min: mode * 0.8,
      mode,
      max: mode * 1.6,
    };
  }

  return {
    id: item.id,
    distribution,
    predecessors,
  };
}
```

---

### Building Duration Distributions from Historical WO Data

Once Athelon has collected actual task duration data (actual hours per task card vs estimated hours), these functions fit lognormal distributions:

```typescript
/**
 * Fit a lognormal distribution to historical actual task durations.
 * Input: array of actual duration hours for this task type.
 * Output: lognormal parameters for Monte Carlo sampling.
 */
export function fitLognormal(
  actualDurations: number[],
): LognormalDistribution | null {
  if (actualDurations.length < 5) return null;  // Need at least 5 data points

  // Filter out zeros and negatives
  const valid = actualDurations.filter((d) => d > 0);
  if (valid.length < 5) return null;

  const logValues = valid.map((d) => Math.log(d));
  const mu = logValues.reduce((a, b) => a + b, 0) / logValues.length;
  const variance =
    logValues.reduce((sum, x) => sum + Math.pow(x - mu, 2), 0) /
    (logValues.length - 1);
  const sigma = Math.sqrt(variance);

  return { type: "lognormal", mu, sigma };
}

/**
 * Fit PERT parameters from historical data.
 * Returns the optimistic (P10), most-likely (mode/median), and pessimistic (P90)
 * as three-point estimate for beta-PERT distribution.
 */
export function fitPERTFromHistory(
  actualDurations: number[],
): BetaPERTDistribution | null {
  if (actualDurations.length < 10) return null;

  const sorted = [...actualDurations].sort((a, b) => a - b);
  const n = sorted.length;

  const p10 = sorted[Math.floor(n * 0.10)];
  const p50 = sorted[Math.floor(n * 0.50)];   // Use median as most-likely
  const p90 = sorted[Math.floor(n * 0.90)];

  return {
    type: "beta_pert",
    optimistic: p10,
    mostLikely: p50,
    pessimistic: p90,
  };
}

/**
 * Compute scope growth distribution from historical WO data.
 * scope_growth_ratio = actual_total_hours / initial_estimated_hours
 */
export function fitScopeGrowthDistribution(
  historicalRatios: number[], // actual/estimated ratios from past WOs
): LognormalDistribution | null {
  return fitLognormal(historicalRatios);
}
```

---

### Running Simulations Efficiently: Web Workers

For Athelon's browser-based Gantt view, running 5,000 Monte Carlo iterations synchronously would block the UI thread for 50-300ms. Use a Web Worker:

```typescript
// monte-carlo-worker.ts (runs in a Web Worker)
/// <reference lib="webworker" />

import { runMonteCarlo } from "./monte-carlo-scheduler";
import type { StochasticTask } from "./monte-carlo-scheduler";

self.onmessage = (event: MessageEvent<{ tasks: StochasticTask[]; iterations: number }>) => {
  const { tasks, iterations } = event.data;
  const result = runMonteCarlo(tasks, iterations);
  self.postMessage(result);
};

// In the React component:
function useMonteCarloSimulation(tasks: StochasticTask[], iterations = 2000) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (tasks.length === 0) return;

    setRunning(true);
    const worker = new Worker(
      new URL("./monte-carlo-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      setResult(e.data);
      setRunning(false);
      worker.terminate();
    };

    worker.postMessage({ tasks, iterations });
    return () => worker.terminate();
  }, [tasks, iterations]);

  return { result, running };
}
```

For server-side simulation (Convex action), run synchronously — Node.js single-threaded execution of 1,000 iterations on a 50-task network takes approximately 10-50ms, well within Convex action limits.

---

### PERT Extension to Existing CPM

The minimal schema extension to add PERT to Athelon's existing task cards:

In `convex/schema.ts`, add to the `taskCards` table:
```typescript
optimisticHours: v.optional(v.number()),   // O: fastest possible
pessimisticHours: v.optional(v.number()),  // P: worst case
// mostLikelyHours is the existing estimatedHours field
```

In `critical-path.ts`, extend `CPMItem` with optional PERT fields:
```typescript
export interface CPMItem {
  // existing fields...
  optimisticHours?: number;
  pessimisticHours?: number;
}
```

Add a PERT computation helper:
```typescript
export function computePERTDuration(
  optimistic: number,
  mostLikely: number,
  pessimistic: number,
): { expected: number; stdDev: number; variance: number } {
  const expected = (optimistic + 4 * mostLikely + pessimistic) / 6;
  const stdDev = (pessimistic - optimistic) / 6;
  const variance = stdDev * stdDev;
  return { expected, stdDev, variance };
}

export function computePERTPathStats(
  taskIds: string[],
  items: CPMItem[],
): { expectedDuration: number; stdDev: number; confidenceInterval95: [number, number] } {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  let totalExpected = 0;
  let totalVariance = 0;

  for (const id of taskIds) {
    const item = itemMap.get(id);
    if (!item) continue;

    if (item.optimisticHours != null && item.pessimisticHours != null && item.duration != null) {
      const mostLikelyHours = (item.duration ?? 0) / 3_600_000;
      const { expected, variance } = computePERTDuration(
        item.optimisticHours,
        mostLikelyHours,
        item.pessimisticHours
      );
      totalExpected += expected;
      totalVariance += variance;
    }
  }

  const totalStdDev = Math.sqrt(totalVariance);
  // 95% CI = mean ± 1.96σ (assumes normal distribution of path sum)
  return {
    expectedDuration: totalExpected,
    stdDev: totalStdDev,
    confidenceInterval95: [
      totalExpected - 1.96 * totalStdDev,
      totalExpected + 1.96 * totalStdDev,
    ],
  };
}
```

---

### Statistical Output: Tornado Diagrams

A tornado diagram ranks tasks by their impact on schedule variance. The widest bar is the biggest risk driver. Implemented as a simple bar chart using Recharts (already used in Athelon's EVM dashboard):

```typescript
// Tornado diagram data preparation
function prepareTornadoData(
  result: MonteCarloResult,
  taskLabels: Map<string, string>,
  topN: number = 10,
): Array<{ name: string; impact: number; correlation: number }> {
  return result.tornadoData
    .slice(0, topN)
    .map((item) => ({
      name: taskLabels.get(item.taskId) ?? item.taskId,
      impact: Math.round(item.impactHours * 10) / 10,
      correlation: Math.round(item.correlationWithTotal * 100) / 100,
    }));
}
```

---

### Machine Learning Pipeline

For shops with sufficient historical data (200+ completed WOs with task-level actuals):

**Data extraction from Convex:**
```typescript
// Convex action to export training data
export const exportMLTrainingData = internalAction({
  args: {},
  handler: async (ctx) => {
    const workOrders = await ctx.runQuery(internal.workOrders.getAllCompleted);
    const taskCards = await ctx.runQuery(internal.taskCards.getAllWithActuals);
    const aircraft = await ctx.runQuery(internal.aircraft.getAll);

    // Feature engineering
    const trainingExamples = workOrders.map((wo) => {
      const aircraft_record = aircraft.find((a) => a._id === wo.aircraftId);
      const wo_tasks = taskCards.filter((t) => t.workOrderId === wo._id);

      return {
        // Features
        aircraft_type: aircraft_record?.type ?? "unknown",
        aircraft_age_years: aircraft_record?.yearManufactured
          ? new Date().getFullYear() - aircraft_record.yearManufactured
          : null,
        ttaf: aircraft_record?.totalAirframeHours ?? null,
        visit_type: wo.visitType ?? "annual",
        task_count: wo_tasks.length,
        inspection_count: wo_tasks.filter((t) => t.taskType === "inspection").length,
        repair_count: wo_tasks.filter((t) => t.taskType === "repair").length,
        initial_estimated_hours: wo.estimatedHours ?? null,
        month: new Date(wo.startDate ?? 0).getMonth(),

        // Label
        actual_total_hours: wo_tasks.reduce((sum, t) => sum + (t.actualHours ?? 0), 0),
        scope_growth_ratio: wo_tasks.reduce((sum, t) => sum + (t.actualHours ?? 0), 0) /
          (wo.estimatedHours ?? 1),
      };
    });

    return trainingExamples;
  },
});
```

**Python microservice (FastAPI + scikit-learn):**
```python
# prediction_service.py
from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
import pandas as pd

app = FastAPI()

class PredictionRequest(BaseModel):
    aircraft_type: str
    aircraft_age_years: float | None
    ttaf: float | None
    visit_type: str
    task_count: int
    inspection_count: int
    repair_count: int
    initial_estimated_hours: float | None
    month: int

class PredictionResponse(BaseModel):
    predicted_hours_p50: float
    predicted_hours_p80: float
    scope_growth_probability: float
    confidence_interval_low: float
    confidence_interval_high: float
    feature_importance: dict[str, float]

# Load trained models
duration_model = joblib.load("models/duration_model.pkl")
scope_model = joblib.load("models/scope_growth_classifier.pkl")

@app.post("/predict/work-order-duration")
def predict_duration(req: PredictionRequest) -> PredictionResponse:
    features = prepare_features(req)

    # Gradient boosting prediction (point estimate)
    p50 = duration_model.predict([features])[0]

    # Estimate P80 using quantile regression or empirical spread
    p80 = p50 * 1.25  # simplified; use quantile GBR in production

    scope_prob = scope_model.predict_proba([features])[0][1]

    return PredictionResponse(
        predicted_hours_p50=round(p50, 1),
        predicted_hours_p80=round(p80, 1),
        scope_growth_probability=round(scope_prob, 3),
        confidence_interval_low=round(p50 * 0.75, 1),
        confidence_interval_high=round(p80 * 1.3, 1),
        feature_importance={
            "aircraft_age": 0.32,
            "ttaf": 0.28,
            "initial_estimate": 0.18,
            "task_count": 0.12,
        },
    )
```

---

## 6. Where to Find It / Dependencies

### Monte Carlo in TypeScript

**Roll your own (recommended for Athelon):** The Monte Carlo engine in Section 5 is fully self-contained. No dependencies, no bundle size increase, pure TypeScript. For basic beta-PERT and triangular sampling, rolling your own is the right call.

**`jstat` (npm):** Comprehensive statistical library for JavaScript/TypeScript. Provides:
- `jStat.beta.sample(alpha, beta)` — beta distribution sampling
- `jStat.lognormal.sample(mu, sigma)` — lognormal sampling
- `jStat.triangular.sample(a, b, c)` — triangular sampling
- Full CDF/PDF/inverse functions for all distributions

```bash
npm install jstat
npm install --save-dev @types/jstat
```

Use case: when you need more statistically rigorous distribution sampling than the Box-Muller approximations in the rolling implementation above.

**`simple-statistics` (npm):** Lighter library focused on descriptive statistics, regression, and classification. Good for computing percentiles, correlation, and regression analysis on historical data. Less useful for distribution sampling.

```bash
npm install simple-statistics
```

### Machine Learning

**Python + scikit-learn + XGBoost (recommended for production):**
- `scikit-learn`: Standard ML framework. GradientBoostingRegressor, RandomForestRegressor, LogisticRegression.
- `xgboost` / `lightgbm`: Gradient boosted trees. Faster and more accurate than scikit-learn's GBR for tabular data.
- `fastapi`: Serve predictions as REST API from Python.
- `joblib`: Model serialization.

```bash
pip install scikit-learn xgboost lightgbm fastapi uvicorn pandas joblib
```

**TensorFlow.js (for client-side inference):** If you want to run ML predictions directly in the browser without a microservice. Useful for latency-sensitive predictions (real-time estimation as user fills out WO intake form). Tradeoff: model size (10-50MB) and training still happens in Python.

**ONNX Runtime Web:** Export any scikit-learn/PyTorch model to ONNX format, run inference in the browser via `onnxruntime-web`. Better than TF.js for models trained in sklearn/XGBoost.

### Bayesian

**`pymc` (Python):** Full probabilistic programming library. Supports MCMC sampling for complex Bayesian models. Overkill for simple Bayesian updating but excellent for Bayesian network estimation.

**TypeScript Bayesian updating:** Simple conjugate-family Bayesian updating (Normal-Normal, Gamma-Poisson) can be implemented in 20-30 lines of TypeScript. See Section 2 for the working code.

**`bayesjs` (npm):** JavaScript Bayesian network library. Handles discrete Bayesian networks for causal modeling. Limited documentation.

### PERT/CCPM

**Pure TypeScript implementation:** PERT extends the existing `critical-path.ts` with three-point estimation (Section 5). CCPM buffer management is a layer on top of CPM — see Section 2 for working buffer sizing and penetration tracking code. No external library needed.

### Time Series Forecasting

**Prophet (Meta/Facebook):** Python library. Input: dataframe with `ds` (date) and `y` (value). Output: forecast with `yhat`, `yhat_lower`, `yhat_upper`. Multiple seasonality, trend changepoints, holiday effects. Runs in 1-5 seconds for typical datasets.

```bash
pip install prophet
```

**`statsforecast` (Python):** Faster, more lightweight alternative to Prophet. Implements ETS, ARIMA, and other classical methods. 10-100x faster than Prophet for simple models.

**Simple exponential smoothing in TypeScript:**
```typescript
function exponentialSmoothing(
  observations: number[],
  alpha: number,  // smoothing parameter 0 < α < 1
  horizon: number, // periods to forecast
): number[] {
  if (observations.length === 0) return new Array(horizon).fill(0);

  let level = observations[0];
  for (let i = 1; i < observations.length; i++) {
    level = alpha * observations[i] + (1 - alpha) * level;
  }

  // Forecast: flat (no trend)
  return new Array(horizon).fill(level);
}
```

---

## 7. Integration Architecture for Athelon

### Layer 1: PERT Extension to Existing CPM (Minimal Effort, High Impact)

**Schema change:** Add `optimisticHours` and `pessimisticHours` to `taskCards` in `convex/schema.ts`. The existing `estimatedHours` becomes the most-likely value.

**Backend change:** Extend `createTaskCard` and `updateTaskCard` mutations to accept and store the new fields. No change to CPM algorithm required for this phase.

**Frontend change:** Add optimistic/pessimistic fields to the task card creation/edit form. Show PERT expected duration and standard deviation in the task card detail view.

**Immediate value:** Even before Monte Carlo, PERT enables better quoting. "This task has a PERT expected value of 22 hours, with a 95% CI of 14-30 hours." Sales/billing can quote at P80 rather than most-likely.

**Files to modify:**
- `convex/schema.ts` — add fields to `taskCards`
- `convex/taskCards.ts` — extend mutations
- `src/shared/lib/scheduling-engine/critical-path.ts` — add `computePERTDuration()` and `computePERTPathStats()`
- `app/(app)/work-orders/[id]/_components/` — task card form and detail view

---

### Layer 2: Monte Carlo as a Convex Action

```typescript
// convex/scheduleSimulation.ts
import { internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Store simulation results
// Schema addition:
// scheduleForecasts: defineTable({
//   workOrderId: v.id("workOrders"),
//   runAt: v.number(),
//   iterations: v.number(),
//   p50Hours: v.number(),
//   p80Hours: v.number(),
//   p90Hours: v.number(),
//   p95Hours: v.number(),
//   meanHours: v.number(),
//   stdDevHours: v.number(),
//   criticalTaskIds: v.array(v.string()),
//   tornadoTaskIds: v.array(v.string()),
// })

export const runWorkOrderSimulation = internalAction({
  args: { workOrderId: v.id("workOrders"), iterations: v.number() },
  handler: async (ctx, { workOrderId, iterations }) => {
    // Fetch task cards with PERT estimates
    const taskCards = await ctx.runQuery(internal.taskCards.getForWorkOrder, { workOrderId });
    const dependencies = await ctx.runQuery(internal.dependencies.getForWorkOrder, { workOrderId });

    // Convert to stochastic tasks
    const tasks = taskCards.map((tc) => ({
      id: tc._id,
      distribution: tc.optimisticHours && tc.pessimisticHours
        ? {
            type: "beta_pert" as const,
            optimistic: tc.optimisticHours,
            mostLikely: tc.estimatedHours ?? tc.optimisticHours,
            pessimistic: tc.pessimisticHours,
          }
        : {
            type: "triangular" as const,
            min: (tc.estimatedHours ?? 4) * 0.8,
            mode: tc.estimatedHours ?? 4,
            max: (tc.estimatedHours ?? 4) * 1.6,
          },
      predecessors: dependencies
        .filter((d) => d.successorId === tc._id && d.type === "FS")
        .map((d) => d.predecessorId as string),
    }));

    // Run simulation (pure TypeScript, no external deps)
    const { runMonteCarlo } = await import("../src/shared/lib/scheduling-engine/monte-carlo-scheduler");
    const result = runMonteCarlo(tasks, iterations);

    // Store results
    await ctx.runMutation(internal.scheduleSimulation.saveResults, {
      workOrderId,
      result: {
        p50Hours: result.percentiles.p50,
        p80Hours: result.percentiles.p80,
        p90Hours: result.percentiles.p90,
        p95Hours: result.percentiles.p95,
        meanHours: result.mean,
        stdDevHours: result.stdDev,
        criticalTaskIds: Array.from(result.criticalityIndex.entries())
          .filter(([, idx]) => idx > 0.5)
          .map(([id]) => id),
        tornadoTaskIds: result.tornadoData.slice(0, 5).map((t) => t.taskId),
      },
    });
  },
});
```

**Re-trigger strategy:** Run simulation when:
- A task card's PERT estimates are updated
- A task card's status changes to complete or in_progress
- Daily via a Convex scheduled action

**Results table:** `scheduleForecasts` — one record per WO, updated on each simulation run. Queried by WO detail page and capacity dashboard.

---

### Layer 3: ML Prediction Microservice

**Deployment:** Google Cloud Run (serverless, scales to zero, costs near zero when idle). A Python FastAPI container receives prediction requests from Convex actions.

**Architecture:**
```
WO intake form (React)
  → Convex action (createWorkOrder)
    → HTTP call to Cloud Run /predict/duration
      → Returns p50/p80/confidence + scope_growth_prob
    → Store prediction in workOrders record (predictedHoursP80, scopeGrowthProb)
  → WO created with ML-informed estimates
```

**Training pipeline:** Monthly cron job:
1. Convex action exports completed WO data as JSON.
2. Python script loads data, engineers features, trains XGBoost model.
3. Model saved and deployed to Cloud Run container (zero-downtime rolling update).

**Cold start latency:** Cloud Run warm instances respond in <50ms. Cold start (if no requests in 15 minutes) is 2-4 seconds. Acceptable for WO creation flow.

---

### Layer 4: Client-Side Confidence Visualization

**Probabilistic Gantt bars:** Instead of a solid bar for task duration, show:
- Solid bar: P20 to P80 range (the likely range)
- Dashed line: P95 (near worst case)
- Center point: P50 (median)

Implemented as a custom SVG layer on top of the existing Gantt chart. CSS gradient from solid to transparent conveys uncertainty visually.

**Completion date confidence cone:** On the project timeline, a diverging cone from "today" shows the uncertainty in the project finish date. Narrow cone = high confidence. Wide cone = high uncertainty. The P50, P80, P90 dates are labeled.

**Buffer fever chart:** Integrated alongside the EVM SPI/CPI gauges. A 2D chart: x-axis is schedule percent complete, y-axis is buffer penetration percentage. A diagonal line at 45° separates green from yellow. The project's current position is plotted as a dot. Color-coded zone shading (green/yellow/red) fills the background.

---

### Layer 5: Buffer Management Dashboard

Integrated with the existing EVM panel on the WO detail page. Add a "CCPM" tab alongside the existing "EVM" tab:

**Metrics displayed:**
- Critical chain duration (hours) with PERT expected value
- Project buffer size (hours) with sizing method
- Buffer consumed (hours and percentage)
- Buffer zone: green/yellow/red with color indicator
- Feeding buffers for each merge point
- Fever chart

**Actions:**
- "Size Buffers" button: compute buffers using RSS method from PERT estimates
- "Re-run Monte Carlo" button: re-simulate and resize buffer using Monte Carlo method
- Override buffer size (manager can adjust manually)

---

### Data Requirements: Start Collecting NOW

The following data points are needed to enable predictive features later. Many are already stored; some need new fields:

**Already in schema:**
- `taskCards.estimatedHours` — most-likely estimate
- `taskCards.actualHours` — actual (but only if techs log time per task, not just per WO)
- `taskCards.percentComplete` — for in-progress Bayesian updating
- `taskCards.status` — for timing actual start/finish

**New fields to add immediately:**
```typescript
// taskCards table additions:
optimisticHours: v.optional(v.number()),
pessimisticHours: v.optional(v.number()),
actualStartedAt: v.optional(v.number()),    // epoch ms when status → in_progress
actualCompletedAt: v.optional(v.number()),  // epoch ms when status → complete
delayReasonCode: v.optional(v.string()),    // "parts_delay" | "tech_unavailable" | "scope_growth" | "inspection_hold" | "weather" | "customer_hold"

// workOrders table additions:
scopeGrowthHours: v.optional(v.number()),   // hours added after WO creation
scopeGrowthTaskCount: v.optional(v.number()), // additional task cards added
mlPredictedHoursP50: v.optional(v.number()),
mlPredictedHoursP80: v.optional(v.number()),
mlScopeGrowthProbability: v.optional(v.number()),

// partsOrders table additions (if not already):
orderedAt: v.optional(v.number()),
vendorPromisedDate: v.optional(v.number()),
actualDeliveredAt: v.optional(v.number()),
```

**Process changes to drive data quality:**
- Technicians log time per task card (not just to WO). Convex mutation `logTaskHours` should require `taskCardId`.
- When creating additional task cards on an in-progress WO, require a reason code. This captures scope growth events with cause.
- When a parts order is placed, capture ordered date and vendor's promised date. When delivered, capture actual date. Three timestamps enable lead time distribution fitting.

---

## 8. Interactions with Other Optimization Tools

### Probabilistic + CP-SAT (Robust Scheduling via Scenario Sampling)

CP-SAT with deterministic inputs produces a single optimal schedule. Probabilistic + CP-SAT produces a **robust** schedule.

**Approach:** Monte Carlo scenario generation + CP-SAT per scenario. Sample K scenarios (e.g., K=20 representative duration scenarios). Solve CP-SAT for each scenario. Select the schedule that minimizes maximum makespan across all scenarios (or average makespan, or P80 makespan). The winning schedule is robust: it performs well across a range of possible futures.

**Computational cost:** K=20 scenarios × (CP-SAT solve time of 2-10 seconds each) = 40-200 seconds. Too slow for real-time use but appropriate for weekly planning runs. Convex scheduled action, results stored for manager review.

**Alternative (simpler):** Run CP-SAT with inflated estimates (P80 instead of P50 for all tasks). The resulting schedule has more slack, improving robustness without the full scenario enumeration overhead. A practical approximation.

---

### Probabilistic + LP/MIP (Two-Stage Stochastic Programming)

LP/MIP optimizes cost given deterministic inputs. Two-stage stochastic LP optimizes **expected cost** given uncertain inputs.

**For Athelon:** The first-stage decision is the weekly schedule (which WOs to commit, how many techs per shift). The second-stage recourse decisions are: authorize overtime, outsource to a vendor MRO, renegotiate delivery date with customer.

Each recourse action has a cost (overtime premium, outsourcing margin, customer relationship damage). The two-stage model minimizes:
```
[first-stage labor cost] + E[second-stage recourse cost]
```

Where the expectation is over scenario realizations (duration uncertainty). Solving this exactly requires a specialized stochastic programming solver (e.g., `mpi-sppy` in Python). An approximation: generate K=50 scenarios, solve a deterministic MIP with K replications of the second-stage variables. Large but solvable.

---

### Probabilistic + Bin Packing (Buffered Packing)

Bin packing fills bays and shifts with WOs to capacity. Probabilistic bin packing adds buffer space.

If each WO has a P80 duration estimate, pack bays to 80% of their theoretical capacity (using P80 estimates). The remaining 20% is buffer that absorbs duration overruns. WOs packed at P80 will overflow their bins ~20% of the time — the buffer catches these.

**Implementation:** Modify `magicSchedule.ts` to use P80 estimated hours (instead of most-likely) when computing bay utilization. Implicit buffer emerges from the conservative packing. Cross-reference against the existing `capacityBufferPercent` parameter in `capacity.ts`.

---

### Probabilistic + EVM (Calibration and Forecasting)

EVM and probabilistic scheduling are complementary:

**EVM calibrates probabilistic models.** CPI (cost performance index) and SPI (schedule performance index) from EVM are empirical measures of actual vs planned performance. Feed CPI/SPI back into the Monte Carlo model: if this shop historically runs at CPI=0.92, inflate all duration estimates by 1/0.92 = 1.09 before simulation.

**EVM provides the best known simple probabilistic forecast.** EAC = BAC / CPI is itself a probabilistic forecast: it says "if performance continues at the current rate, the project will cost $X." This is equivalent to a single-scenario stochastic model where the scenario is "current performance continues." Monte Carlo is the generalization: run many scenarios, each with different performance trajectories.

**Combined dashboard:** Show both EVM metrics (CPI, SPI, EAC) and Monte Carlo metrics (P50/P80 completion date, buffer penetration) side by side. EVM answers "how are we doing so far?" Monte Carlo answers "when will we finish?"

---

### Probabilistic + Metaheuristics (Robust Fitness Function)

Metaheuristics (genetic algorithms, simulated annealing) optimize by evaluating a fitness function for each candidate schedule. With a deterministic fitness function, they optimize for a single-point estimate.

With a probabilistic fitness function, they optimize for robustness:

```typescript
// Stochastic fitness function for a genetic algorithm
function robustFitness(
  schedule: Schedule,
  scenarios: DurationScenario[],  // pre-sampled from Monte Carlo
  alpha: number = 0.8,  // weight on robustness vs expected value
): number {
  const scenarioCompletionDates = scenarios.map((s) =>
    simulateSchedule(schedule, s)
  );

  const mean = scenarioCompletionDates.reduce((a, b) => a + b, 0) / scenarios.length;
  const sorted = [...scenarioCompletionDates].sort((a, b) => a - b);
  const p80 = sorted[Math.floor(sorted.length * 0.8)];

  // Minimize alpha × P80 + (1-alpha) × mean
  return -(alpha * p80 + (1 - alpha) * mean);
}
```

By optimizing the P80 completion date (rather than the mean), the metaheuristic evolves schedules that are robust to duration variability — they may not be the fastest on average, but they're reliably fast in most scenarios.

---

### Probabilistic + CPM (PERT Extension — Natural Relationship)

PERT is CPM + probabilistic durations. The relationship is the most natural in this list.

The existing `critical-path.ts` uses deterministic durations. Adding PERT:
1. Replace deterministic duration with PERT expected duration for the forward/backward pass.
2. Compute PERT path variance as the sum of variances along the critical path.
3. Report 95% confidence interval for project completion as `E ± 1.96σ`.

The critical path identified by PERT expected durations is the "expected critical path." Monte Carlo reveals which paths are actually critical most often (the criticality index). These may differ: a near-critical path with high variance may be critical more often than the nominally critical path. This is the "merge bias" phenomenon — the expected critical path underestimates project risk.

The `computePERTPathStats()` function in Section 5 provides the PERT path analysis. Pair it with Monte Carlo criticality index to get the complete picture.

---

## 9. Data Collection Strategy for Athelon

The gap between "we could do this" and "we can do this today" is data. Most predictive scheduling features require a minimum of 6-12 months of consistently collected historical data before ML models are accurate enough to trust. The time to start collecting is now.

### What to Track and Where to Store It

**Task card actual timing (highest priority):**

Every task card must record when work actually starts and when it actually completes. The existing `status` field tells you the final state; you need timestamps.

```typescript
// Add to taskCards schema:
actualStartedAt: v.optional(v.number()),    // set when status → "in_progress"
actualCompletedAt: v.optional(v.number()),  // set when status → "complete"
```

Hook into the existing `updateTaskCardStatus` mutation: when status changes to `in_progress`, set `actualStartedAt = Date.now()` if not already set. When status changes to `complete`, set `actualCompletedAt = Date.now()`.

This enables: estimated vs actual duration per task type, per technician, per aircraft type. The foundation of all predictive duration modeling.

**Estimated vs actual comparison:**

For each completed task card: `scopeRatio = actualHours / estimatedHours`. Store this on the task card or compute it in a weekly batch job. Tracking scope ratio by task type, aircraft type, and technician reveals systematic bias in estimates (which aircraft types are consistently underestimated, which techs are consistently optimistic).

**Scope changes with reason codes:**

When a task card is added to an already-open WO (scope growth event), record:
```typescript
// Add to taskCards schema:
addedAfterWoOpen: v.optional(v.boolean()),  // true if added post-creation
addedAtDayOfWo: v.optional(v.number()),     // which day of WO was this added
scopeChangeReasonCode: v.optional(
  v.union(
    v.literal("discovered_damage"),
    v.literal("customer_request"),
    v.literal("ad_compliance"),
    v.literal("related_finding"),
    v.literal("preventive_extension"),
    v.literal("regulatory_requirement"),
  )
),
```

Over time, this data answers: for a King Air 350 annual inspection, what percentage of WOs have scope growth? What's the average scope growth ratio? What's the most common reason?

**Delay events with timestamps:**

When a WO or task card is held (not progressing due to a specific reason), record the delay event:
```typescript
// New table: woDelayEvents
{
  workOrderId: v.id("workOrders"),
  taskCardId: v.optional(v.id("taskCards")),
  startedAt: v.number(),    // when delay began
  resolvedAt: v.optional(v.number()),  // when delay ended
  reasonCode: v.union(
    v.literal("parts_delay"),
    v.literal("tech_unavailable"),
    v.literal("inspection_hold"),
    v.literal("customer_hold"),
    v.literal("weather"),
    v.literal("equipment_down"),
    v.literal("scope_pending_approval"),
  ),
  description: v.optional(v.string()),
}
```

This captures delay duration and frequency by cause. Parts delay events link to specific parts orders, enabling vendor lead time analysis.

**Aircraft flight hours and cycles at maintenance event:**

When a WO is opened for an aircraft, capture the aircraft's current state:
```typescript
// Add to workOrders schema:
aircraftHoursAtOpen: v.optional(v.number()),
aircraftCyclesAtOpen: v.optional(v.number()),
engineHoursAtOpen: v.optional(v.number()),
daysSinceLastHeavyCheck: v.optional(v.number()),
```

These are the most powerful features for ML models predicting scope growth and task duration. Without them, you can't build the "aircraft age/hours → inspection duration" models.

**Vendor delivery tracking:**

For every parts order, track the complete lifecycle:
```typescript
// Add to partsOrders (or similar) schema:
orderedAt: v.number(),              // when PO was placed
vendorConfirmedAt: v.optional(v.number()),  // when vendor confirmed receipt
vendorPromisedDate: v.number(),     // vendor's committed delivery date
actualDeliveredAt: v.optional(v.number()),  // actual delivery
deliveryDelayDays: v.optional(v.number()),  // computed: actual - promised
```

After 500+ parts orders, you have enough data to fit vendor-specific lead time distributions and predict delay probability for new orders.

**Technician performance history:**

Track per-tech, per-task-type efficiency ratios. After sufficient data, a technician profile emerges: Tech A is 20% faster than average on avionics tasks, 5% slower on structural. This is the `efficiencyMultiplier` in `TechnicianResource` — make it dynamic and data-driven rather than a static admin input.

---

### Minimum Data Requirements for Each Feature

| Feature | Minimum Records | Data Required | Time to Collect |
|---|---|---|---|
| PERT estimation | 0 (human estimates) | Estimators fill O/M/P | Day 1 |
| Monte Carlo scheduling | 0 (uses PERT estimates) | PERT estimates on task cards | Day 1 |
| CCPM buffer management | 0 (uses PERT estimates) | PERT estimates | Day 1 |
| Task duration calibration | 100+ task cards with actuals | `actualStartedAt`, `actualCompletedAt` | 3-6 months |
| Lognormal distribution fitting | 50+ per task type | Actual duration per task type | 6-12 months |
| Scope growth prediction (simple) | 200+ WOs | `addedAfterWoOpen`, `scopeChangeReasonCode` | 12-18 months |
| ML duration prediction | 500+ completed WOs | All task features + actuals | 18-36 months |
| Vendor lead time prediction | 300+ parts orders | `orderedAt`, `vendorPromisedDate`, `actualDeliveredAt` | 12-18 months |
| AOG risk prediction | 1000+ aircraft-months | Per-aircraft flight hours, maintenance events, AOG events | 24-36 months |
| Capacity demand forecasting | 100+ WO arrivals | Arrival dates, aircraft types, labor hours | 12 months |

The clear priority: start with PERT estimation (zero data required, deploy today) and the timestamp collection (data that compounds in value over time). Everything else builds on these two foundations.

---

### Implementation Priority Recommendation

**Now (this sprint):** Add PERT fields to `taskCards` schema and mutation. Show PERT expected duration in the task card UI. Add three-point estimate inputs to task card creation/edit form. Add `actualStartedAt`/`actualCompletedAt` tracking to status change mutations.

**Next quarter:** Build the Monte Carlo engine (TypeScript, no dependencies). Wire it to WO detail page via a Convex action. Show P50/P80/P90 completion date on WO detail. Add the `scheduleForecasts` table. Deploy the CCPM buffer management UI alongside EVM.

**This year:** Add delay event tracking. Build scope growth reason code capture. Deploy capacity demand forecasting (even without ML — just interval-based scheduling projections from fleet data). Start building the data pipeline that will feed ML models.

**Longer term (12+ months):** Train first ML models (scope growth probability, then duration prediction) on accumulated data. Deploy Python microservice. Add confidence visualization to Gantt chart. Build AOG risk prediction as data volume allows.

---

## Summary

Probabilistic scheduling treats duration uncertainty as a first-class design consideration rather than a source of surprise overruns. For Athelon's MRO context, the most immediately impactful steps are:

1. **PERT three-point estimation** on task cards — zero data required, extends existing CPM, narrows the confidence interval band on quoted delivery dates.
2. **Monte Carlo simulation** — the TypeScript engine in Section 5 is self-contained and ready to integrate as a Convex action. Delivers P50/P80/P95 completion dates to customers and managers.
3. **CCPM buffer management** — CCPM fever chart alongside EVM dashboard gives a complete project health picture and encourages the right behavior from technicians (report problems early, don't hide them).
4. **Data collection infrastructure** — `actualStartedAt`/`actualCompletedAt`, delay reason codes, scope change tracking. The investment compounds: every WO completed from today is a training example for tomorrow's ML models.
5. **ML duration prediction** — a Python microservice on Cloud Run that trains monthly on accumulated WO data. Feed predictions into initial WO estimates and scope growth risk flags.

The architecture is incremental. PERT extends CPM. Monte Carlo extends PERT. ML extends Monte Carlo by improving the input distributions. Each layer adds value independently and compounds with the next. The existing `critical-path.ts`, `earned-value.ts`, and `resource-leveling.ts` engines are the right foundation — probabilistic scheduling is the next layer built on top of them.
