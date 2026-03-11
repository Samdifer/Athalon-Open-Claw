# Scheduling Engine Implementation Patterns

## 1. Open-Source Scheduling Libraries and Engines

### Google OR-Tools

**GitHub:** https://github.com/google/or-tools | **License:** Apache 2.0 | **Languages:** C++ with Python, Java, C# bindings

The most capable open-source scheduling engine. Its **CP-SAT solver** models scheduling through:
- **Interval variables**: represent a task with start, duration, and end
- **`AddNoOverlap`**: prevent two tasks from using the same resource simultaneously
- **`AddCumulative`**: enforce concurrent task demands do not exceed capacity
- **Precedence constraints**: B cannot start until A finishes
- **Optional intervals**: tasks that may or may not be scheduled

Relevant OR-Tools examples:
- `rcpsp_sat.py` — Resource-Constrained Project Scheduling (the canonical MRO formulation)
- `jobshop_with_maintenance_sat.py` — job shop with maintenance windows
- `gate_scheduling_sat.py` — airport gate/bay allocation
- `shift_scheduling_sat.py` — technician shift assignment

**Limitations:** No JavaScript/TypeScript bindings. Must run as a Python microservice.

### Timefold Solver (OptaPlanner Fork)

**GitHub:** https://github.com/TimefoldAI/timefold-solver | **License:** Apache 2.0 | **Language:** Java/Kotlin

Models problems as Planning Entities with Constraint Streams (Hard/Soft constraints). Lists "Maintenance Scheduling" as an explicit use case.

**Limitations:** Java only; separate service required.

### JavaScript/TypeScript: The Critical Gap

**No production-grade constraint-based scheduling engine exists in JS/TS.**

| Library | What it does | MRO Useful? |
|---|---|---|
| jsLPSolver | LP/MIP in pure JS | Simple assignment only |
| rrule.js | iCalendar recurrence rules | YES — recurring maintenance schedules |
| BullMQ | Redis job queue | Triggers only, not optimization |

**Practical options:**
1. Custom greedy heuristic in TypeScript (~2–3 weeks)
2. OR-Tools Python microservice via REST API
3. Timefold Java microservice via REST API

### Frontend Gantt Libraries

| Library | Type | License | Notes |
|---|---|---|---|
| `gantt-task-react` | Gantt | MIT | TypeScript, dependencies, drag-drop |
| `react-timeline-gantt` | Resource timeline | MIT | 100k+ record virtualization |
| `vis-timeline` | Timeline | MIT | Mature, needs React wrapper |
| `frappe/gantt` | Gantt | MIT | Simple, no resource views |
| `react-flow` | DAG editor | MIT | 35.6k stars, undo/redo |
| Bryntum Gantt | All-in-one | Commercial | Best feature set |
| DHTMLX Gantt | Gantt | Commercial | Enterprise-grade |

---

## 2. Scheduling Data Models

### Core Entities

```typescript
WorkOrder          // Aircraft, type, priority, release/due dates
TaskCard           // Duration, certifications required, predecessor IDs, isRegHoldPoint
Technician         // Certifications[], specialties[], shift schedule
HangarBay          // Aircraft capacity, supported types
TechnicianAvailability   // Time windows: shift | overtime | on_call | unavailable
ScheduledAssignment      // taskCardId + technicianId + scheduledStart/End + source
ScheduleViolation        // type, severity, taskCardId, description
ScheduleEvent            // Append-only audit log
```

### Temporal Modeling — Dependency Types

- **FS (Finish-to-Start):** Most common MRO dependency
- **SS (Start-to-Start):** Parallel work with shared setup
- **FF (Finish-to-Finish):** Supervised parallel work
- **SF (Start-to-Finish):** Rare; overnight soak tests

Each dependency can have a **lag** (minimum gap) or **lead** (overlap).

### Resource Capacity Types

- **Unary** (hangar bay, specialized tool): no-overlap constraints
- **Cumulative** (technicians): capacity ceiling
- **Skill/Certification**: assigned tech must hold required cert

### Make-Ready Checklist Model

Per task card, track 5 prerequisite categories:
1. Labor readiness (certified tech available)
2. Parts readiness (kitted and at aircraft)
3. Equipment readiness (tooling/GSE available)
4. Predecessor readiness (all predecessors signed off)
5. Regulatory readiness (hold points released)

Task enters "schedulable" status only when all 5 are green.

---

## 3. Architecture Patterns

### Event Sourcing

Store every scheduling change as an immutable event. Benefits for MRO:
- Complete audit trail (FAA Part 145 requirement)
- Temporal queries ("what did the schedule look like yesterday?")
- Undo/redo rescheduling decisions
- Event-driven notifications on hold point release

### Two-Phase Scheduling

**Phase 1 — Rough-Cut Capacity Planning (RCCP):** "Are there enough technician-hours in Week 12?" No task-to-person assignment yet. Fast.

**Phase 2 — Detailed Scheduling:** Assign specific tasks to specific technicians with full dependency and certification resolution.

### Separating Engine from UI

```typescript
interface SchedulingEngine {
  solve(input: SchedulingProblem): SchedulingResult
}
interface SchedulingProblem {
  workOrders: WorkOrder[]
  technicians: Technician[]
  hangarBays: HangarBay[]
  constraints: Constraint[]
  horizon: { start: Date; end: Date }
  objectives: Objective[]
}
interface SchedulingResult {
  assignments: TaskAssignment[]
  score: SolutionScore
  violations: ConstraintViolation[]
  criticalPath: TaskCardId[]
}
```

The engine is a pure function. The UI calls Convex mutations that trigger the engine via actions and store results.

### Optimistic Scheduling with Conflict Detection

Allow dispatchers to assign tasks freely. Run background conflict checker after every assignment. Surface violations as warnings in the Gantt (red highlights). Use optimizer for on-demand "Suggest Optimal Schedule" — not as a blocking gatekeeper.

---

## 4. Gantt Visualization

### Three Required View Types

1. **Task Gantt** (task-centric): WO → Task Cards timeline with dependency arrows
2. **Resource Timeline** (resource-centric): Technicians/bays on Y axis, task bars per resource
3. **DAG Dependency Editor**: Visualize and edit predecessor relationships

### Key Interactions

- Drag to reschedule (move bar left/right)
- Resize to re-estimate (drag right edge)
- Draw dependency arrows
- Conflict highlighting (red overlay on overlap)
- Critical path highlight (golden path)
- Zoom: Hour → Day → Week → Month
- Load bar: green 0–80%, amber 80–100%, red >100%

### Conflict Visualization

- Technician overload: Red fill in resource row
- Dependency violation: Red dependency arrow
- Regulatory hold violation: Shield-with-exclamation icon

### Virtualization for Large Schedules

Heavy checks have 2,000–8,000 task cards. Requirements:
- Virtualize task list (only render viewport rows)
- Canvas rendering for Gantt bars (not SVG/DOM)
- Date-range windowing

---

## 5. Real-World Implementation Patterns

### Evolution Path

| Version | Approach | Timeline |
|---|---|---|
| V3 | Constraint checker — validate assignments, surface violations | ~2 weeks |
| V4 | Greedy heuristic optimizer — "Auto-schedule" button | ~3 weeks |
| V5 | OR-Tools CP-SAT for full optimization | Later |

Most MRO shops never reach V5. V3–V4 delivers 90% of the value.

### Heuristic Algorithms for TypeScript

All implementable in TypeScript, runnable in Convex actions:

- **Earliest Due Date (EDD):** Assign resources to earliest-due WO first
- **Critical Ratio (CR):** `CR = Time_Remaining / Work_Remaining`. CR < 1 = behind; prioritize lowest
- **Greedy Assignment:** For each unscheduled task (priority-ordered): find earliest slot where predecessors complete, certs match, bay available
- **Local Search:** After greedy, do random task-pair swaps; accept if makespan improves

### Performance Benchmarks

| Scale | Approach | Solve Time |
|---|---|---|
| 1–50 tasks, 1–10 techs | Greedy in TypeScript | <100ms |
| 50–500 tasks, 10–50 techs | Greedy + local search in TS | <5 seconds |
| 500–5,000 tasks, 50+ techs | OR-Tools Python service | 5–60 seconds |

Athelon's scale (20–100 techs, hundreds of tasks/month) is in the TypeScript greedy range.

### Common Pitfalls

1. **Calendar complexity underestimated:** Shifts, holidays, overtime rules are complex. Build robust calendar early.
2. **Premature optimization:** Build greedy first; add CP solver when you can measure the gap.
3. **No draft schedule concept:** Users need to manipulate "proposed" before committing.
4. **No rollback story:** AOG events require partial re-optimization. Event sourcing helps.
5. **Over-constraining:** Every constraint reduces optimizer degrees of freedom. Start with hard constraints only.

### Integration Patterns

- **Parts:** Tasks requiring parts only schedulable when parts on-hand or have confirmed delivery date
- **Certification expiration:** Check at schedule time, not just hire time
- **ERP:** Labor rates per cert level affect cost estimation

---

## 6. Emerging Approaches

### AI/ML for Scheduling

**RL agents** learn dispatching policies through trial and error. Research-grade; not yet production-ready for regulatory MRO.

**Predictive Maintenance Integration:** ML models predicting RUL become probabilistic due dates in the scheduling model.

### Digital Twin

Virtual health model per aircraft updated from sensor data. Enables early detection, opportunistic maintenance, "what-if" simulation.

### LLMs in Scheduling

**Practical uses:**
- Natural language constraint entry
- Schedule explanation generation
- Anomaly narrative summaries
- Agentic scheduling assistant with tools

**Critical limitation:** LLMs cannot perform exact combinatorial optimization. Must be interface/explanation layer, not optimization layer.

---

## 7. Recommended Architecture for Athelon

### Convex Schema Additions

```typescript
scheduleEvents: defineTable({
  type: v.string(), payload: v.any(),
  workOrderId: v.optional(v.id("workOrders")),
  taskCardId: v.optional(v.id("taskCards")),
  technicianId: v.optional(v.id("technicians")),
  timestamp: v.number(), userId: v.string(),
  source: v.string(), // 'dispatcher' | 'optimizer' | 'system'
}).index("by_workOrder", ["workOrderId", "timestamp"])

scheduleViolations: defineTable({
  type: v.string(), severity: v.string(),
  taskCardId: v.optional(v.id("taskCards")),
  workOrderId: v.optional(v.id("workOrders")),
  description: v.string(),
  detectedAt: v.number(), resolvedAt: v.optional(v.number()),
}).index("by_workOrder", ["workOrderId", "resolvedAt"])

technicianAvailability: defineTable({
  technicianId: v.id("technicians"),
  startTime: v.number(), endTime: v.number(),
  type: v.string(), // 'shift' | 'overtime' | 'on_call' | 'unavailable'
}).index("by_technician", ["technicianId", "startTime"])
```

### Implementation Roadmap

**Phase 1 — V3 Constraint Checker (~2 weeks):**
- TypeScript constraint functions
- Run after every assignment mutation; write to `scheduleViolations`
- Gantt shows red highlights on violation rows

**Phase 2 — V4 Greedy Optimizer (~3 weeks):**
- Greedy scheduler as pure TypeScript in Convex action
- "Auto-schedule" button
- Results stored as "proposed" until dispatcher confirms

**Phase 3 — V5 External Optimizer (later):**
- OR-Tools CP-SAT Python microservice
- Convex action calls via HTTP
- Multi-objective optimization

---

## Key References

- OR-Tools: https://developers.google.com/optimization/scheduling/job_shop
- OR-Tools examples: https://github.com/google/or-tools/tree/stable/examples/python
- Timefold Solver: https://github.com/TimefoldAI/timefold-solver
- Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- gantt-task-react: https://github.com/MaTeMaTuK/gantt-task-react
- react-timeline-gantt: https://github.com/guiqui/react-timeline-gantt
- react-flow: https://github.com/wbkd/react-flow
- rrule.js: https://github.com/jakubroztocil/rrule
- CP-SAT Primer: https://d-krupke.github.io/cpsat-primer/
