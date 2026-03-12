# 03 — Bin Packing & Combinatorial Optimization

> Research document for Athelon scheduling optimization. Covers bin packing theory, algorithms, MRO-specific use cases, and integration strategy.

---

## Table of Contents

1. [What Bin Packing Is](#1-what-bin-packing-is)
2. [Classic Algorithms](#2-classic-algorithms)
3. [General Use Cases](#3-general-use-cases)
4. [Athelon-Specific Use Cases](#4-athelon-specific-use-cases)
5. [How It Works — Implementation Details](#5-how-it-works--implementation-details)
6. [Where to Find It / Dependencies](#6-where-to-find-it--dependencies)
7. [Integration Architecture for Athelon](#7-integration-architecture-for-athelon)
8. [Interactions with Other Optimization Tools](#8-interactions-with-other-optimization-tools)
9. [Manpower Planning Application](#9-manpower-planning-application)

---

## 1. What Bin Packing Is

Bin packing is one of the most fundamental combinatorial optimization problems: given a set of **items** with sizes and a set of **bins** with capacities, pack all items into bins while minimizing the number of bins used (or minimizing wasted space, or satisfying some other objective).

### 1D Bin Packing

The simplest form. Items have a single size dimension (e.g., weight, hours, volume). Bins have a single capacity.

**Formal definition:** Given `n` items with sizes `s_1, s_2, ..., s_n` where `0 < s_i <= C` (bin capacity), find a packing that minimizes the number of bins used.

**Complexity:** NP-hard (proven by reduction from the partition problem). No polynomial-time algorithm can solve all instances optimally unless P=NP.

**Approximation:** Despite NP-hardness, excellent approximation algorithms exist:
- First Fit Decreasing (FFD) uses at most `(11/9)OPT + 6/9` bins — within ~22% of optimal
- In practice, FFD is often within 1-2% of optimal for typical instances

### 2D Bin Packing

Items have width and height. Bins are rectangular containers. This is directly relevant to scheduling where one axis is "resource" (bay, technician) and the other is "time."

**Variants:**
- **Strip packing:** One dimension is fixed (e.g., bay width), minimize the other (total time span)
- **Shelf algorithms:** Pack items in horizontal "shelves" — simpler but wastes vertical space
- **Guillotine cuts:** Items must be separable by edge-to-edge cuts (relevant to cutting stock, less so for scheduling)
- **Free rotation:** Items can be rotated 90 degrees (in scheduling terms: a task can be done by different resources)

### 3D Bin Packing and Higher Dimensions

3D adds depth — relevant for physical packing (container loading, parts kitting). For scheduling, the third dimension might be "skill type" — a task needs hours (dimension 1) of a specific skill (dimension 2) during a time window (dimension 3).

### Vector Bin Packing (Multi-Dimensional)

Each item is a **vector** of resource requirements: `(hours, A&P_hours, IA_hours, NDT_hours, avionics_hours)`. Each bin (shift/day) has a vector of capacities. An item fits only if it doesn't exceed the bin in ANY dimension.

This is the most relevant variant for MRO workforce scheduling — a work order doesn't just need "hours," it needs specific types of hours.

**Key insight:** Vector bin packing is significantly harder than 1D. The approximation ratios degrade as dimensions increase. For `d` dimensions, the best known asymptotic ratio is roughly `O(d)`.

### The Cutting Stock Problem

The dual of bin packing: given bins (rolls of material) of fixed size and **demand** for items of various sizes, minimize the total number of bins consumed. Solved via **column generation** (Gilmore-Gomory, 1961) — an LP technique that generates packing patterns on the fly.

**MRO analog:** Given a fixed workforce capacity per week and a backlog of WOs with varying hour requirements, what's the minimum number of weeks to clear the backlog?

### Online vs Offline Bin Packing

- **Offline:** All items are known in advance. Sort and optimize globally. Used for weekly/monthly planning.
- **Online:** Items arrive one at a time and must be placed immediately without knowledge of future items. Cannot repack. Used for AOG arrivals and unscheduled maintenance.

**Competitive ratios for online algorithms:**
- First Fit: 1.7 (worst case uses 70% more bins than optimal)
- Best Fit: 1.7
- Harmonic-k algorithms: approach 1.589... as k increases
- No online algorithm can do better than 1.540... (lower bound)

This matters for Athelon: when an AOG arrives mid-week, you're doing online bin packing. The theoretical limit says you'll waste ~54% more capacity than if you'd known about the AOG in advance. This quantifies the cost of unpredictability.

### Variable-Sized Bin Packing

Bins have different capacities (and potentially different costs). Minimize total cost of bins used.

**MRO analog:** Different bays have different capacities (large hangar vs. small bay), different shifts have different hours (day 8.5h vs night 7h), and overtime hours cost more than regular hours. Minimize total cost while packing all tasks.

---

## 2. Classic Algorithms

### First Fit (FF)

**How it works:** Process items in order. For each item, place it in the **first** bin where it fits. If no bin has room, open a new bin.

- **Time complexity:** O(n log n) with a balanced tree for bin tracking
- **Approximation ratio:** 1.7 OPT + 1 (worst case)
- **Pros:** Simple, fast, reasonable quality
- **Cons:** Sensitive to item order — bad input ordering produces bad packings

### First Fit Decreasing (FFD)

**How it works:** Sort items largest-first, then apply First Fit.

- **Time complexity:** O(n log n) (dominated by the sort)
- **Approximation ratio:** (11/9) OPT + 6/9 — roughly 22% worse than optimal in the worst case
- **Pros:** Best simple heuristic. In practice, typically within 1-2% of optimal
- **Cons:** Requires all items known in advance (offline only)

**This is the single most important algorithm for Athelon.** Sorting WOs by size (largest duration first) before assigning to bays is a direct upgrade over the current greedy approach in `magicSchedule.ts`, which sorts by priority only.

### Best Fit (BF) / Best Fit Decreasing (BFD)

**How it works:** Place each item in the bin with the **least remaining space** that still fits the item. Minimizes wasted space per bin.

- **Time complexity:** O(n log n)
- **Approximation ratio:** Same as FF/FFD asymptotically
- **Pros:** Tends to fill bins more completely, leaving fewer partially-filled bins
- **Cons:** Slightly more complex. Can be worse than FF for specific instances.

**MRO insight:** BFD is better when you want to maximize utilization per shift/day (pack shifts as full as possible, leaving entire days free rather than many partially-used days).

### Next Fit (NF)

**How it works:** Only consider the current (most recently opened) bin. If the item doesn't fit, close this bin permanently and open a new one.

- **Time complexity:** O(n)
- **Approximation ratio:** 2 OPT (can use twice as many bins as optimal)
- **Pros:** Extremely fast, O(1) memory, works for streaming
- **Cons:** Poor quality — wastes a lot of space

**MRO use:** Only appropriate for very rough estimates ("how many weeks of work is this backlog?").

### Shelf Algorithms for 2D Packing

For 2D bin packing (bay x time scheduling), shelf algorithms treat the problem as packing items onto horizontal "shelves":

**Next Fit Shelf (NFS):** Open a shelf. Place items left-to-right until one doesn't fit, then start a new shelf above.

**First Fit Shelf (FFS):** For each item, try all existing shelves. Place on the first one where it fits. If none, open a new shelf.

**Best Fit Shelf (BFS):** Place on the shelf with the least remaining width that still accommodates the item.

**MRO application:** Think of each "shelf" as a bay, and items are WOs placed sequentially in time. FFS is essentially what `magicSchedule.ts` does today — scan bays for the first one with an open slot.

### Column Generation for Cutting Stock

**How it works:**
1. Start with a set of simple packing "patterns" (one item per bin)
2. Solve an LP relaxation to get dual prices (value of packing each item type)
3. Use the dual prices to find a new, better pattern (a sub-problem — often a knapsack problem)
4. Add the new pattern to the LP and re-solve
5. Repeat until no improving pattern exists
6. Round the LP solution to integers (branch-and-price for exact)

**Relevance:** This is the gold standard for large-scale bin packing when you need provably optimal or near-optimal solutions. It's how paper mills, steel mills, and fabric manufacturers minimize waste.

**MRO analog:** "Given our workforce capacity profile (bins) and WO backlog (items), what's the optimal weekly packing schedule?" Column generation finds packing patterns (weekly schedules) and selects the best combination.

**Practical note:** Column generation is complex to implement but is available in OR-Tools and commercial solvers. For Athelon, this would be a Phase 3+ optimization — CP-SAT with cumulative constraints is simpler and nearly as effective for the problem sizes involved.

### Branch-and-Price (Exact Solutions)

Column generation gives a fractional (LP) solution. Branch-and-price adds branching on integer variables to find the true optimum. This guarantees optimality but can be slow for large instances.

**When to use:** When you absolutely need the best answer (e.g., annual capacity planning where a 2% improvement in utilization translates to significant revenue).

---

## 3. General Use Cases

### Container Loading and Logistics
- 3D bin packing: load trucks/containers with boxes of varying sizes
- Companies like UPS, FedEx, Amazon solve millions of these daily
- Typical instance: 50-500 items into 1-50 containers

### Cloud VM Placement / Server Consolidation
- VMs (items with CPU, RAM, disk, network dimensions) into physical servers (bins)
- Google, AWS, Azure solve massive vector bin packing problems
- Drives billions of dollars in infrastructure efficiency

### Memory Allocation
- OS memory allocators (malloc) use bin packing heuristics
- First Fit and Best Fit are the basis of most memory allocators

### Cutting Stock
- Paper mills: cut large rolls into customer-ordered widths
- Sheet metal: cut parts from standard sheets minimizing waste
- Textile: pattern layout on fabric rolls
- 1-5% waste reduction = millions in annual savings for large manufacturers

### Warehouse Slotting
- Assign SKUs to warehouse locations to minimize pick time
- Multi-dimensional: SKU size, pick frequency, weight, storage requirements

### Scheduling as Bin Packing
- University course timetabling: courses (items) into time slots and rooms (bins)
- Broadcast scheduling: ads (items) into commercial breaks (bins)
- Job scheduling on parallel machines: jobs (items) into machine time (bins)
- Operating room scheduling: surgeries (items) into OR slots (bins)

---

## 4. Athelon-Specific Use Cases

### 4.1 Hangar Bay Scheduling (2D Bin Packing)

**The model:**
- **Bins:** Each hangar bay is a horizontal strip of time. Width = planning horizon (e.g., 30 days). Height = 1 (one aircraft per bay at a time).
- **Items:** Each WO has a duration (width in days) and occupies 1 bay slot (height = 1).
- **Constraints:**
  - Aircraft-bay compatibility (from `stationSupportedAircraft` table) — not all items fit all bins
  - No overlap within a bay
  - Priority ordering: AOG items must be placed earliest
  - Customer promised delivery dates = hard right-edge constraint
- **Algorithm:** FFD with compatibility filtering. Sort WOs by duration descending (largest first), then within equal durations by priority. For each WO, find the compatible bay with the earliest available slot.
- **Upgrade over current:** `magicSchedule.ts` sorts by priority only. FFD sorts by size, which produces tighter packings. Combine: sort by priority tier first, then by duration within each tier.

### 4.2 Shift Capacity Packing (1D)

**The model:**
- **Bins:** Technician shifts. Day shift = 8.5h capacity, swing = 8.5h, night = 7h. Adjusted by efficiency multiplier (e.g., 8.5h × 0.85 efficiency = 7.225h effective).
- **Items:** Task card estimated hours.
- **Constraint:** Task certification requirements must match tech certifications.
- **Algorithm:** BFD per certification group. For each cert type (A&P, IA, NDT, avionics), sort tasks requiring that cert by hours descending, then pack into matching tech shifts using Best Fit.
- **Output:** Per-tech daily task list. Identifies shifts with excess capacity (available for additional work or training) and overloaded shifts (need reassignment or overtime).

### 4.3 Weekly Capacity Planning (Vector Bin Packing)

**The model:**
- **Bins:** Each workday is a multi-dimensional bin with capacity vector:
  - `[total_hours, ap_hours, ia_hours, ndt_hours, avionics_hours, paint_hours]`
  - Derived from roster: sum of each tech's available hours by certification type
- **Items:** Each WO has a daily resource requirement vector:
  - `[total_hours_per_day, ap_hours_needed, ia_hours_needed, ...]`
  - Derived from task cards and their certification requirements
- **Constraint:** WO cannot be split across non-contiguous days (contiguity constraint)
- **Algorithm:** First Fit Decreasing on the bottleneck dimension (the cert type with highest utilization). This ensures the scarcest resource is packed efficiently first.
- **Output:** A feasibility assessment — "Can we complete all scheduled WOs this week given our current roster?" Plus identification of the binding dimension ("IA hours are the bottleneck — 94% utilized while A&P hours are only 62% utilized").

### 4.4 Parts Kit Staging

**The model:**
- **Bins:** Parts carts/kits with weight and volume limits
- **Items:** Parts required for each WO, with weight, dimensions, and WO association
- **Constraint:** All parts for a single task card should be on the same cart if possible
- **Algorithm:** 2D BFD (weight × volume), with grouping constraint

### 4.5 Training Batch Scheduling

**The model:**
- **Bins:** Available training slots (e.g., 4-hour blocks, full-day sessions)
- **Items:** Training needs (tech × certification combinations) with varying durations
- **Constraint:** Maximum number of techs away from production simultaneously, instructor availability, prerequisite ordering
- **Algorithm:** BFD with a production-impact constraint — pack training into slots that minimize concurrent absences from the shop floor

### 4.6 Online AOG Insertion

**The model:**
- **Existing packing:** Current week's schedule (items already packed into bay/time bins)
- **New item:** AOG work order that must be inserted immediately
- **Algorithm:** Modified Best Fit — find the bay-time combination that:
  1. Can accommodate the AOG within the required timeframe
  2. Displaces the minimum total hours of existing work
  3. Displaced work can be repacked into remaining capacity
- **Fallback:** If no feasible insertion exists without deadline violations, flag the displaced WOs and their new projected dates for manager approval

This is inherently online bin packing. The competitive ratio tells us we'll waste ~54-70% more capacity than if we'd known about the AOG in advance. This quantifies the value of predictive maintenance (reducing AOGs reduces online packing waste).

---

## 5. How It Works — Implementation Details

### 1D First Fit Decreasing in TypeScript

```typescript
interface BinPackItem {
  id: string;
  size: number; // e.g., estimated hours
  priority?: number;
}

interface Bin {
  id: string;
  capacity: number; // e.g., shift hours
  remaining: number;
  items: BinPackItem[];
}

function firstFitDecreasing(items: BinPackItem[], binCapacity: number): Bin[] {
  // Sort largest first
  const sorted = [...items].sort((a, b) => b.size - a.size);
  const bins: Bin[] = [];

  for (const item of sorted) {
    // Find first bin where item fits
    let placed = false;
    for (const bin of bins) {
      if (bin.remaining >= item.size) {
        bin.items.push(item);
        bin.remaining -= item.size;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Open a new bin
      bins.push({
        id: `bin-${bins.length + 1}`,
        capacity: binCapacity,
        remaining: binCapacity - item.size,
        items: [item],
      });
    }
  }
  return bins;
}
```

### 2D Bay Scheduling Packer in TypeScript

```typescript
interface WOItem {
  woId: string;
  durationDays: number;
  priorityTier: number; // 0=AOG, 1=urgent, 2=routine, 3=deferred
  compatibleBayIds: string[];
  promisedDeliveryDate?: number; // ms timestamp
}

interface BaySlot {
  bayId: string;
  bookings: { startDay: number; endDay: number; woId: string }[];
}

interface PackResult {
  woId: string;
  bayId: string;
  startDay: number;
  endDay: number;
}

function packWOsIntoBays(
  items: WOItem[],
  bays: BaySlot[],
  horizonDays: number,
): { assignments: PackResult[]; unassigned: string[] } {
  // Sort: priority tier first, then duration descending (FFD within tier)
  const sorted = [...items].sort((a, b) => {
    if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
    return b.durationDays - a.durationDays; // Largest first within same priority
  });

  const assignments: PackResult[] = [];
  const unassigned: string[] = [];

  for (const wo of sorted) {
    let bestAssignment: PackResult | null = null;
    let bestScore = Infinity;

    for (const bay of bays) {
      // Check compatibility
      if (!wo.compatibleBayIds.includes(bay.bayId)) continue;

      // Find earliest available slot
      const earliestStart = findEarliestSlot(bay, wo.durationDays, horizonDays);
      if (earliestStart === null) continue;

      const endDay = earliestStart + wo.durationDays;

      // Score: earlier is better, penalize if past promised date
      let score = earliestStart;
      if (wo.promisedDeliveryDate) {
        const promisedDay = Math.floor(
          (wo.promisedDeliveryDate - Date.now()) / (24 * 60 * 60 * 1000)
        );
        if (endDay > promisedDay) {
          score += (endDay - promisedDay) * 1000; // Heavy penalty for late
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestAssignment = {
          woId: wo.woId,
          bayId: bay.bayId,
          startDay: earliestStart,
          endDay,
        };
      }
    }

    if (bestAssignment) {
      // Record the booking
      const bay = bays.find((b) => b.bayId === bestAssignment!.bayId)!;
      bay.bookings.push({
        startDay: bestAssignment.startDay,
        endDay: bestAssignment.endDay,
        woId: wo.woId,
      });
      assignments.push(bestAssignment);
    } else {
      unassigned.push(wo.woId);
    }
  }

  return { assignments, unassigned };
}

function findEarliestSlot(
  bay: BaySlot,
  durationDays: number,
  horizonDays: number,
): number | null {
  // Sort existing bookings by start
  const sorted = [...bay.bookings].sort((a, b) => a.startDay - b.startDay);

  // Try to fit before the first booking
  let candidate = 0;

  for (const booking of sorted) {
    if (candidate + durationDays <= booking.startDay) {
      return candidate; // Fits in this gap
    }
    candidate = Math.max(candidate, booking.endDay);
  }

  // Try after all bookings
  if (candidate + durationDays <= horizonDays) {
    return candidate;
  }

  return null; // Doesn't fit within horizon
}
```

### Vector Bin Packing for Capacity Assessment

```typescript
interface SkillVector {
  totalHours: number;
  apHours: number;
  iaHours: number;
  ndtHours: number;
  avionicsHours: number;
}

interface CapacityDay {
  date: string;
  capacity: SkillVector;
  load: SkillVector;
}

function assessCapacityFit(
  days: CapacityDay[],
  newWO: { dailyRequirement: SkillVector; durationDays: number },
): {
  fits: boolean;
  bottleneckDimension: string | null;
  worstUtilization: number;
  bestStartDay: number | null;
} {
  // Slide the WO across available days, find the position with best fit
  let bestStart: number | null = null;
  let bestWorstUtil = Infinity;

  for (let start = 0; start <= days.length - newWO.durationDays; start++) {
    let worstUtil = 0;
    let bottleneck = '';
    let feasible = true;

    for (let d = 0; d < newWO.durationDays; d++) {
      const day = days[start + d];
      const dimensions: (keyof SkillVector)[] = [
        'totalHours', 'apHours', 'iaHours', 'ndtHours', 'avionicsHours',
      ];

      for (const dim of dimensions) {
        const newLoad = day.load[dim] + newWO.dailyRequirement[dim];
        const util = day.capacity[dim] > 0 ? newLoad / day.capacity[dim] : Infinity;
        if (util > 1.0) feasible = false;
        if (util > worstUtil) {
          worstUtil = util;
          bottleneck = dim;
        }
      }
    }

    if (feasible && worstUtil < bestWorstUtil) {
      bestWorstUtil = worstUtil;
      bestStart = start;
    }
  }

  return {
    fits: bestStart !== null,
    bottleneckDimension: bestStart !== null ? null : identifyBottleneck(days, newWO),
    worstUtilization: bestWorstUtil,
    bestStartDay: bestStart,
  };
}

function identifyBottleneck(
  days: CapacityDay[],
  wo: { dailyRequirement: SkillVector; durationDays: number },
): string {
  const dimensions: (keyof SkillVector)[] = [
    'totalHours', 'apHours', 'iaHours', 'ndtHours', 'avionicsHours',
  ];
  let worstDim = '';
  let worstAvgUtil = 0;

  for (const dim of dimensions) {
    let totalUtil = 0;
    for (const day of days) {
      totalUtil += day.capacity[dim] > 0
        ? (day.load[dim] + wo.dailyRequirement[dim]) / day.capacity[dim]
        : 999;
    }
    const avgUtil = totalUtil / days.length;
    if (avgUtil > worstAvgUtil) {
      worstAvgUtil = avgUtil;
      worstDim = dim;
    }
  }
  return worstDim;
}
```

### Extending Basic Bin Packing with Constraints

Pure bin packing becomes constrained bin packing when:

1. **Compatibility constraints** — not all items fit all bins (aircraft-bay compatibility, tech certifications). Filter bins per item before attempting placement.

2. **Precedence constraints** — item A must be packed before/in-the-same-bin-as item B (task dependencies). Process items in topological order.

3. **Contiguity constraints** — a multi-day WO can't have gaps (the aircraft is in the bay for the full duration). Treat the WO as a single rectangular item, not individual day-items.

4. **Grouping constraints** — related items should be co-located (all task cards for a WO on the same bay). Pack the group as a unit.

5. **Conflict constraints** — some items cannot share a bin (two WOs needing the same specialized tooling). Check conflict lists during placement.

When constraints get complex enough, you're effectively solving a constraint satisfaction problem — and CP-SAT becomes more appropriate than pure bin packing heuristics. The rule of thumb: **if you have more than 3 constraint types, use CP-SAT with cumulative constraints instead of rolling your own constrained bin packer.**

---

## 6. Where to Find It / Dependencies

### Pure TypeScript (No Dependencies)

For 1D and simple 2D bin packing, the algorithms are straightforward enough to implement directly (see code above). This is the recommended approach for Athelon because:
- No external dependency risk
- Full control over constraint handling
- Algorithms are 20-50 lines each
- Can be added directly to `src/shared/lib/scheduling/`

### npm Packages

| Package | What It Does | Relevance |
|---|---|---|
| `shelf-pack` (Mapbox) | 2D shelf-based packing | Bay scheduling visualization |
| `maxrects-packer` | 2D rectangle packing with max rectangles | Bay scheduling optimization |
| `bin-packing` | Simple 1D/2D packing | General utility |
| `glpk.js` | GLPK solver compiled to WASM | Exact solutions via LP/IP |

**Recommendation:** Don't use npm packages for this. The algorithms are simple enough to implement inline, and you need custom constraint handling that packages won't provide.

### OR-Tools (Python)

OR-Tools has dedicated bin packing support via CP-SAT:

```python
from ortools.sat.python import cp_model

model = cp_model.CpModel()

# Bin packing via CP-SAT cumulative constraint
# Each bin has capacity C, items have sizes s_i
# Binary variables: x[i][j] = 1 if item i is in bin j

for j in range(num_bins):
    model.Add(
        sum(sizes[i] * x[i][j] for i in range(num_items)) <= capacity
    )

# Each item in exactly one bin
for i in range(num_items):
    model.AddExactlyOne(x[i][j] for j in range(num_bins))
```

For Athelon, this would be part of the CP-SAT microservice (see doc 01), not a standalone bin packing service.

### Performance for MRO Problem Sizes

| Problem Size | FFD (TypeScript) | CP-SAT (Python) |
|---|---|---|
| 20 WOs, 5 bays | < 1ms | ~50ms |
| 50 WOs, 10 bays | < 5ms | ~200ms |
| 200 WOs, 20 bays | < 20ms | ~2s |
| 500 WOs, 30 bays | < 50ms | ~15s |

For typical MRO shops (20-100 active WOs), TypeScript FFD is more than fast enough. CP-SAT is only needed when you want provably optimal solutions or have complex multi-dimensional constraints.

---

## 7. Integration Architecture for Athelon

### Client-Side Bin Packing for Capacity Visualization

Replace or enhance `capacityModel.ts` with bin-packing-aware capacity computation:

**Current approach:** `capacityModel.ts` distributes WO hours uniformly across days and computes utilization per day.

**Improved approach:** Use vector bin packing to compute:
- Per-day utilization by skill dimension (not just total hours)
- Bottleneck identification ("IA hours are 94% utilized, everything else is under 70%")
- Feasibility check for new WOs ("will this WO fit given current load?")

This runs client-side in milliseconds and powers the capacity visualization on the Gantt board.

### Bay Scheduling Upgrade

Replace the core of `magicSchedule.ts` with the 2D bin packing approach:

**Current:** Sort by priority → scan bays for first available slot → pick bay with least load.

**Improved:** Sort by priority tier then duration descending (FFD within tier) → for each WO, score ALL compatible bays by (earliest start + late penalty + load balance score) → pick the best scoring bay.

This is a drop-in replacement that requires no new infrastructure and produces measurably tighter schedules.

### Due-Date Feasibility Checker

Before accepting a promised delivery date on a quote, run a quick bin packing feasibility check:

```
User enters promised date →
  Vector bin packing assessment →
    "Feasible" (green) / "Tight" (amber) / "Infeasible" (red)
    + bottleneck dimension if not feasible
```

This runs in < 5ms client-side and prevents promising dates the shop can't meet.

### Integration Points in Existing Codebase

| File | Change |
|---|---|
| `src/shared/lib/scheduling/magicSchedule.ts` | Replace greedy scan with FFD + scoring |
| `app/(app)/scheduling/_lib/capacityModel.ts` | Add skill-dimension breakdown and bottleneck identification |
| `convex/capacity.ts` | Add `checkWOFeasibility` query that runs vector bin packing server-side |
| `convex/schedulerPlanning.ts` | Add feasibility check before `upsertScheduleAssignment` |

---

## 8. Interactions with Other Optimization Tools

### Bin Packing + CP-SAT

CP-SAT can solve bin packing problems exactly using cumulative constraints and interval variables. The relationship:
- **Use bin packing heuristics** for instant client-side feedback (feasibility checks, capacity visualization)
- **Use CP-SAT** for optimal solutions when time permits (monthly planning, what-if scenarios)
- **Use bin packing as warm-start** for CP-SAT — feed the FFD solution as hints to the solver, which then improves upon it

### Bin Packing + LP/MIP

Bin packing can be formulated as a set covering MIP problem. The column generation approach (Gilmore-Gomory) generates packing patterns via LP and selects the best combination. This is the most powerful exact method for large instances.

For Athelon: LP can provide a lower bound ("you need at minimum X weeks of capacity") that validates bin packing heuristic quality.

### Bin Packing + Current Greedy Scheduler

**Bin packing IS an improved greedy.** FFD is strictly better than the current scan-for-first-fit approach in `magicSchedule.ts` because:
1. Sorting by size before packing produces tighter packings (proven mathematically)
2. Scoring all bays instead of taking the first fit finds better placements
3. The improvement is free — same computational cost, better results

### Bin Packing + Resource Leveling

Resource leveling (in `resource-leveling.ts`) is essentially "repack the bins when they overflow." The relationship:
1. Initial packing via bin packing algorithms
2. If any bin overflows (day exceeds tech capacity), resource leveling shifts tasks to future days
3. Better initial packing → less leveling needed → shorter total schedule

### Bin Packing + CPM / Critical Path

CPM tells you which tasks have float (can be moved) and which are critical (cannot). Use this information to constrain bin packing:
- Critical tasks: pack first, in their required time slots
- Float tasks: pack with flexibility, used to fill gaps
- This is a "constrained FFD" — pack critical items in fixed positions, then FFD the rest around them

### Bin Packing + Predictive/Probabilistic

Use predicted durations (from Monte Carlo or ML) instead of point estimates as item sizes:
- **P50 estimate** for baseline packing (50% chance task is this size or smaller)
- **P80 estimate** for buffer-aware packing (80% confidence — builds in margin)
- **P95 estimate** for worst-case assessment

The difference between P50 and P80 packing tells you how much schedule buffer you're carrying.

### Bin Packing + EVM

EVM tracks cost and schedule performance. When CPI or SPI drops below threshold:
- Rerun bin packing with updated (longer) duration estimates for the affected WO
- Show the cascade impact on other WOs sharing the same bay/tech resources
- "WO-2024-045 is running 20% over estimate. If it takes 3 more days, here's what shifts..."

---

## 9. Manpower Planning Application

### Hiring as Bin Sizing

The hiring problem is the inverse of bin packing: instead of fitting items into fixed bins, you're choosing how large to make the bins.

**Model:**
- **Current bins:** Weekly capacity vectors per skill type `[ap_hours, ia_hours, ndt_hours, avionics_hours]`
- **Projected items:** Forecasted WO demand over the next 12 months, as weekly skill-hour vectors
- **Question:** In which weeks does demand exceed capacity? In which skill dimension? By how much?

The gap analysis tells you exactly what to hire:
- "We need 160 more A&P hours per month starting Q3" → hire 1 A&P tech
- "IA hours are the bottleneck at 94% utilization" → get an existing tech their IA authorization
- "NDT capacity is only needed 2 weeks per quarter" → contract NDT rather than hire

### Training as Bin Resizing

When a technician gains a certification, they effectively increase the bin capacity in that skill dimension:
- Tech with A&P only contributes to `ap_hours` bin
- Same tech with A&P + IA now contributes to both `ap_hours` AND `ia_hours` bins
- This is "resizing" the bin by adding a dimension

**Optimization question:** Given a training budget, which tech × certification combinations produce the maximum increase in the bottleneck dimension? This is a knapsack problem (maximize capacity gain subject to budget constraint) — solvable optimally with dynamic programming or LP.

### Capacity Gap Identification

```typescript
function identifyCapacityGaps(
  weeklyCapacity: SkillVector[], // From roster
  weeklyDemand: SkillVector[],   // From WO forecast
): {
  gapWeeks: { week: number; dimension: string; gapHours: number }[];
  recommendations: string[];
} {
  const gaps: { week: number; dimension: string; gapHours: number }[] = [];
  const dimensions: (keyof SkillVector)[] = [
    'totalHours', 'apHours', 'iaHours', 'ndtHours', 'avionicsHours',
  ];

  for (let w = 0; w < weeklyDemand.length; w++) {
    for (const dim of dimensions) {
      const gap = weeklyDemand[w][dim] - (weeklyCapacity[w]?.[dim] ?? 0);
      if (gap > 0) {
        gaps.push({ week: w, dimension: dim, gapHours: gap });
      }
    }
  }

  // Aggregate gaps by dimension
  const dimGaps = new Map<string, number>();
  for (const g of gaps) {
    dimGaps.set(g.dimension, (dimGaps.get(g.dimension) ?? 0) + g.gapHours);
  }

  const recommendations: string[] = [];
  for (const [dim, totalGap] of [...dimGaps.entries()].sort((a, b) => b[1] - a[1])) {
    const weeksAffected = gaps.filter((g) => g.dimension === dim).length;
    const avgGapPerWeek = totalGap / weeksAffected;
    recommendations.push(
      `${dim}: ${totalGap.toFixed(0)}h total gap across ${weeksAffected} weeks ` +
      `(avg ${avgGapPerWeek.toFixed(1)}h/week). ` +
      `Consider ${avgGapPerWeek > 30 ? 'hiring' : 'cross-training or overtime'}.`
    );
  }

  return { gapWeeks: gaps, recommendations };
}
```

---

## Summary

Bin packing is the most immediately actionable optimization for Athelon because:

1. **Zero infrastructure needed** — pure TypeScript, runs client-side or server-side
2. **Drop-in upgrade** to existing `magicSchedule.ts` — FFD with scoring is strictly better than current greedy
3. **Enables capacity intelligence** — vector bin packing reveals skill-dimension bottlenecks
4. **Foundation for advanced optimization** — bin packing solutions feed CP-SAT as warm starts
5. **Quantifies the cost of unpredictability** — online vs. offline packing ratios show the value of reducing AOGs

**Recommended starting point:** Replace `magicSchedule.ts` core with priority-tiered FFD (Phase 1), add vector capacity assessment to `capacityModel.ts` (Phase 1), then add due-date feasibility checking (Phase 2).
