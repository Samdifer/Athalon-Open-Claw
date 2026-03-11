# Cross-Industry Scheduling Research for MRO

## Executive Summary

Six distilled cross-industry principles for an MRO scheduling engine:

1. **Constraint-anchored scheduling** (TOC/DBR) — hangar bay or licensed inspector capacity is the drum
2. **Stochastic buffering** (CCPM + OR scheduling) — protect task chains with explicit time buffers sized to variance
3. **Pull-based make-ready** (Last Planner) — release work only when preconditions (parts, tooling, certifications) are confirmed
4. **WIP-limited flow** (Kanban/Little's Law) — cap aircraft-in-work to match throughput
5. **Velocity-calibrated commitment** (Agile) — use historical actual hours vs. estimated hours per work-order type to self-calibrate future commitments
6. **Skill-indexed assignment** (Field Service + JSSP) — model technician certifications as hard eligibility constraints, not advisory headcount

---

## 1. Manufacturing and Job-Shop Scheduling

### 1.1 The Job-Shop Scheduling Problem (JSSP)

| JSSP Concept | MRO Analogue |
|---|---|
| Jobs (J₁…Jₙ) | Work orders / aircraft visits |
| Machines (M₁…Mₘ) | Hangar bays, test benches, inspection stations |
| Operations with fixed sequence | Task cards within a work order |
| Processing times per operation/machine | Estimated man-hours per task card |
| Single-task machine capacity | One aircraft per bay; one inspector signing a task at a time |

JSSP is NP-hard for 3+ machines. The **disjunctive constraint** model — for each resource, at most one job occupies it at any time — must be modeled as hard constraints, not warnings.

**Flexible Job-Shop (FJSP):** Each operation can be assigned to any machine from an eligible set. This is exactly the MRO technician assignment problem.

### 1.2 Theory of Constraints — Drum-Buffer-Rope

*Source: Goldratt & Cox, The Goal (1984); Critical Chain (1997)*

**The Five Focusing Steps:**
1. **Identify** the constraint — licensed inspector availability, hangar bay count, or specialty shops
2. **Exploit** — ensure the constraint never starves; pre-stage parts/tools
3. **Subordinate** everything else — non-constraint processes feed the constraint
4. **Elevate** — add capacity if exploitation is insufficient
5. **Repeat** — new constraint emerges after elevation

**Drum-Buffer-Rope:**
- **Drum:** The constraint resource sets the pace (e.g., QC/RII inspector count)
- **Buffer:** WIP in front of constraint to prevent starvation (15–25% of WO duration for MRO)
- **Rope:** Pull signal controlling new work entry — no new aircraft until capacity exists

### 1.3 Lean Manufacturing — Heijunka, Takt Time

*Sources: Womack & Jones, Lean Thinking (1996); Liker, The Toyota Way (2004)*

**Takt Time:** Available production time ÷ customer demand rate. Originally developed in 1930s German aircraft manufacturing. Sets the throughput target.

**Heijunka (Production Leveling):** Distributing different product types evenly rather than batch-processing by type.
- Batch approach (bad): All 737 A-checks → all A320 A-checks → all CRJ B-checks
- Heijunka approach: 737, A320, CRJ, 737, A320, CRJ...

This distributes skill/tooling demand evenly across the schedule.

---

## 2. Healthcare Operating Room Scheduling

### 2.1 Structural Parallels

| OR Scheduling | MRO Hangar |
|---|---|
| Operating rooms (shared, expensive, specialized) | Hangar bays |
| Surgeons (credentialed, specialty-limited) | Licensed A&P/IA technicians |
| Surgical duration uncertainty (log-normal) | Task card duration uncertainty |
| Emergency surgeries (preempt elective schedule) | AOG situations |
| Recovery room capacity (downstream constraint) | Parts/component shop capacity |

### 2.2 Block Scheduling vs. Open Scheduling

**Block:** Each specialty receives dedicated time blocks. Prioritizes coordination at cost of utilization.
**Open/Modified:** Blocks released to general pool if not filled by cutoff.

**MRO translation:**
- "Block" = committed hangar slot for contract customer
- "Flex" = open capacity for AOG/unscheduled (10–15%)
- "Block release" = if customer hasn't confirmed by T-7 days, slot returns to flex pool

### 2.3 Stochastic Duration Modeling

Surgical durations follow a **log-normal distribution** (right skew). Schedule using P80 (80th-percentile) estimate, not the mean.

**MRO translation:** Track actual vs. estimated hours per task type × aircraft variant. Use P80 for customer delivery commitments.

*Key paper: Strum, May & Vargas (2000), "Modeling the Uncertainty of Surgical Procedure Times," Anesthesiology*

### 2.4 Emergency Case Insertion (AOG Analogue)

1. **Dedicated Emergency OR:** One OR held in reserve for emergencies
2. **Protected Time Slots:** Blank slots at high-risk periods
3. **Last-Scheduled Case Displacement:** Last elective case carries highest preemption risk
4. **Dynamic Rescheduling:** Real-time constraint programming recalculates full schedule

**MRO translation:** Flex capacity reservation (10–15%) for AOG arrivals; AOG preemption protocol; size reserve using statistical AOG arrival rate.

---

## 3. Construction Project Scheduling

### 3.1 Last Planner System (LPS)

*Source: Ballard, G. (2000). The Last Planner System of Production Control.*

### The Five Planning Levels

| Level | Horizon | MRO Analogue |
|---|---|---|
| Master Schedule | Full project | MRO contract milestones (aircraft in, RTS date) |
| Phase Schedule | 6–12 weeks | Zone-by-zone heavy check planning |
| Lookahead Schedule | 3–6 weeks | Work order lookahead: identify blocking constraints |
| Weekly Work Plan | 1 week | Daily/shift assignment board |
| Daily Huddle | Same day | Shift briefing: exceptions, safety, priority changes |

### Make-Ready Process

A task is **sound** (ready for committed schedule) only when ALL prerequisites are resolved:
- **Labor:** Right technicians with right certifications?
- **Materials:** Required parts kitted and available?
- **Equipment:** Required test equipment, tooling, GSE available?
- **Prerequisites:** Predecessor tasks completed and signed off?
- **External:** Regulatory hold points released?

If ANY constraint is unresolved, the task is NOT assigned — it goes on the **make-ready list** with a named owner for each open constraint.

### Percent Plan Complete (PPC)

`PPC = Tasks completed as planned / Tasks committed × 100%`

World-class LPS projects achieve 85–90% PPC. Failure analysis on unmet commitments drives estimate improvement.

### 3.2 Location-Based Scheduling / Line of Balance

Aircraft heavy checks involve zone-based work (fuselage zones, wing zones, empennage). LOB concepts map to visualizing parallel zone work as overlapping activity streams and identifying physical zone conflicts.

---

## 4. Field Service Management

### 4.1 Skill-Based Assignment

**Three approaches:**
1. **Strict eligibility:** Only technicians holding required skill can be assigned
2. **Preference-weighted:** Higher proficiency → faster completion; scheduler weights assignments
3. **Cross-training portfolios:** Track multi-skill techs as "utility" gap-fillers

**MRO translation:** `taskCard.requiredCertifications ⊆ technician.certifications`

*Key paper: Cordeau et al. (2010), "Scheduling Technicians and Tasks," Journal of Scheduling — defines TTSP*

### 4.2 Dynamic Re-scheduling Strategies

1. **Rolling Horizon:** Re-optimize every N minutes with current state
2. **Slack-Based Insertion:** Find assignment with most slack; insert urgent job
3. **Threshold-Based Escalation:** If overrun exceeds 25%, re-evaluate all downstream

---

## 5. Shipyard and Heavy Equipment Maintenance

### 5.1 Structural Analogy

| Ship Repair | Aviation Heavy Maintenance |
|---|---|
| Dry dock (limited, expensive berths) | Hangar bay |
| Multi-trade workforce | Multi-disciplinary workforce |
| Hidden damage scoped after dry-docking | Hidden damage after panel removal |
| Classification society survey (Lloyd's, DNV) | FAA/EASA AD compliance |
| Departure deadline (charter obligations) | Customer RTS commitment |

### 5.2 Key Concepts

**Dock scheduling as bin-packing:** Sequence vessel arrivals to maximize utilization. Same formulation as hangar bay scheduling.

**Zone discipline:** Multi-trade coordination with trade sequencing rules (structural → piping → electrical → insulation → paint). Creates precedence chains identical to task card zonal sequencing.

**Scope multiplier factors:** "Average ship overhaul runs 1.3× initial estimate." Build explicit contingency.

**Key difference:** Aviation has higher regulatory documentation density per unit of work than almost any other maintenance industry.

---

## 6. Software Project Scheduling / Agile

### 6.1 Velocity

Total effort completed per sprint. After 3–5 sprints, velocity stabilizes. Use P80/mean/P20 velocity for confidence intervals.

`Release date ≈ today + (remaining_points / average_velocity) × sprint_length`

**MRO translation:** Track man-hours completed per shift by WO type. Use P80 velocity for committed delivery dates.

### 6.2 Kanban and WIP Limits

**Little's Law:** `Cycle Time = WIP / Throughput`

If throughput is fixed, reducing WIP is the only way to reduce cycle time.

**MRO translation:**
- WIP limit on hangar = max aircraft in active maintenance (= bay count)
- WIP limit on inspection queue = max tasks awaiting QC sign-off (= inspector capacity)
- Making the inspection queue depth visible transforms it from invisible bottleneck to managed constraint

### 6.3 Critical Chain Project Management (CCPM)

**Parkinson's Law:** Work expands to fill time available.
**Student Syndrome:** Real work starts near deadline.
**CCPM solution:** Remove buffers from individual tasks; aggregate into project buffers and feeding buffers.

**MRO translation:**
1. Recalibrate estimates to 50th percentile
2. Add WO-level buffer = ~25% of critical path duration
3. Track buffer consumption rate as leading schedule health indicator
4. Alert when buffer consumption exceeds work completion rate

---

## 7. Synthesis: Most Transferable Concepts

### Tier 1: High Impact, Implementable Now

| Concept | Source | MRO Application |
|---|---|---|
| Constraint-anchored scheduling (DBR) | TOC | Inspector headcount is the drum |
| Make-ready gating | Last Planner | 5-category prerequisite gate before task assignment |
| WIP limits + Little's Law | Kanban | Cap aircraft-in-work; model inspection queue |
| P80 duration estimates | OR Scheduling | Commit using 80th-percentile, not mean |
| Skill-indexed eligibility | Field Service | Certifications as hard constraints |

### Tier 2: Medium Impact, Requires Process Change

| Concept | Source | Application |
|---|---|---|
| CCPM buffers | Critical Chain | WO-level buffer, buffer consumption tracking |
| Heijunka leveling | Lean/TPS | Sequence aircraft types to level skill demand |
| Velocity calibration | Agile | Actual vs estimated hours tracking |
| PPC metric | Last Planner | Weekly completion rate tracking |
| Block + Flex scheduling | Healthcare OR | Reserved slots + AOG flex capacity |

### Tier 3: Advanced, Long-Term

| Concept | Source | Application |
|---|---|---|
| FJSP optimizer | Operations Research | Background solver for multi-WO assignment |
| Stochastic programming | Stochastic Scheduling | Hedge for high-variance scenarios |
| Match-up rescheduling | Dynamic Scheduling | Rejoin original schedule after disruption |
| Zone-based LOB | Construction | Zone conflict visualization |
| Log-normal duration fitting | OR Scheduling | Auto-set P80 estimates from historical data |
| Scope multiplier factors | Shipyard | Build 1.3× contingency into estimates |

---

## Key References

- Goldratt & Cox — *The Goal* (1984)
- Goldratt — *Critical Chain* (1997)
- Womack & Jones — *Lean Thinking* (1996)
- Ballard — *The Last Planner System* (2000)
- Pinedo — *Scheduling: Theory, Algorithms, and Systems* (2022)
- Cardoen, Demeulemeester & Beliën (2010) — OR scheduling literature review
- Cordeau et al. (2010) — TTSP with skill constraints
- Strum, May & Vargas (2000) — Log-normal surgical duration model
- Van den Bergh et al. (2013) — Personnel scheduling literature review
- Birge & Louveaux (1997) — Introduction to Stochastic Programming
