# DOENGINE R1 — CAMP vs Athelon Current State (Chapter 4/5 Due-Item Handling)

Date: 2026-03-06  
Scope: current-state only (no target architecture)

---

## 1) Athelon implementation audit (code-level)

### 1.1 What exists now (Confirmed)

1) **Dedicated AD due engine with deterministic replay and transition guards** — **Confirmed**  
- `computeDueSnapshot` calculates next due date/hours/cycles from last compliance baseline for recurring ADs.  
- `recomputeAdComplianceDueSnapshot` recomputes from immutable history and compares with cached fields.  
- Explicit AD lifecycle and directive lifecycle transition guards exist.  
Citations: `apps/athelon-app/convex/dueEngine.ts:35-60,62-130,140-175,185-205`

2) **AD compliance model is mature and auditable** — **Confirmed**  
- Shared `airworthinessDirectives` reference table with recurrence, compliance types, supersession links.  
- `adCompliance` table supports aircraft/engine/part scope, applicability determination, append-only history, cached next-due fields, status lifecycle, and index support for due queries.  
- Compliance ledger events table exists for append-only transitions.  
Citations: `apps/athelon-app/convex/schema.ts:2065-2121,2144-2206,2213-2248`

3) **AD compliance mutation logic is strong on controls** — **Confirmed**  
- Signed maintenance record required; approvedDataReference must contain AD number; no backdating/decreasing TT; auth-event consume; audit/ledger write.  
- Live overdue logic in `checkAdDueForAircraft` uses current aircraft hours and aggregates aircraft+engine+part AD compliance rows.  
Citations: `apps/athelon-app/convex/adCompliance.ts:135-419,671-760`

4) **Maintenance-program due handling exists but is simplified** — **Confirmed**  
- Chapter 5-oriented `maintenancePrograms` table includes ATA chapter + day/hour/cycle intervals + trigger logic (`first`/`greater`).  
- `computeDueDates` calculates projections from current totals and average utilization assumptions.  
Citations: `apps/athelon-app/convex/schema.ts:5306-5331`; `apps/athelon-app/convex/maintenancePrograms.ts:33-184`

5) **Due-list workbench and monthly planner exist** — **Confirmed**  
- `dueListWorkbench` merges maintenance-program due events and optional recurring AD rows.  
- `generateMonthlyPlan` creates draft work orders + seeded task cards from selected due items.  
Citations: `apps/athelon-app/convex/planningFromDueList.ts:53-229,231-400`

6) **Task-level compliance tracking exists but is administrative (not signed authority chain)** — **Confirmed**  
- `taskComplianceItems` captures AD/SB/AMM/etc references with status history.  
- Module explicitly states not a signed operation.  
Citations: `apps/athelon-app/convex/schema.ts:1750-1801`; `apps/athelon-app/convex/taskCompliance.ts:6-12,28-52,92-185`

---

### 1.2 Immediate implementation constraints / gaps (Confirmed unless noted)

1) **Due-list workbench uses hard-coded utilization rates** — **Confirmed**  
- Hours/day fixed at `1.5`, cycles/day fixed at `1`; no per-aircraft utilization profile in this function.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:103-117`

2) **Maintenance-program due dates are computed from `now`, not persisted last-compliance baseline in this path** — **Confirmed**  
- Calendar due date is `now + interval`; hour/cycle math uses modulo current totals. This is simple and deterministic, but not evidence of per-program “last performed” anchor in this specific flow.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:91-133`; `apps/athelon-app/convex/maintenancePrograms.ts:124-169`

3) **Monthly-plan seeded task cards are minimal stubs** — **Confirmed**  
- No prebuilt steps, no estimated hours population, generic approved data source string.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:328-365`

4) **No one-click AD due item → actionable task card from AD tab (UI gap)** — **Confirmed**  
- Existing internal audit identifies AD compliance tab as read-only for this action.  
Citation: `apps/athelon-app/AUDIT-PHASES-1-4.md:98-103`

5) **Broad Chapter 4/5 item families beyond AD + interval tasks are only partially evidenced in this due pipeline** — **Likely**  
- Current due workbench source types are only `maintenance_program` and `ad_compliance`.  
- Potential chapter-4/5 domains like consumable/shelf-life controls, detailed LLP due generation, and richer service bulletin planning are not directly visible in this module pair.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:7,53-58,143-146,161-190,242`

---

## 2) CAMP current-state model (from corpus + fresh web evidence)

1) **CAMP provides due-list/calendar handling across interval types with recurring representation and detail drill-down** — **Confirmed**  
Citations: CAMP MTX Calendar page extract (task/discrepancy details, same-date grouping by days/hours/cycles/other, recurring task display)  
- https://www.campsystems.com/mtx-calendar

2) **CAMP provides due-list-to-work-order planning flow (monthly) and desktop/mobile execution path** — **Confirmed**  
Citations: eWorkOrder extract (“monthly plan directly from due list”, desktop+iCAMP updates/assignment)  
- https://www.campsystems.com/eWorkOrder

3) **CAMP includes AD/SB lifecycle tooling inside product** — **Confirmed**  
Citations: AD/SB Manager extract (assess, plan, baseline, apply, report; bi-weekly authority/manufacturer feed references)  
- https://www.campsystems.com/ad-sb-manager

4) **CAMP training catalog explicitly references next-due viewing, WO creation, task compliance updating, AD/SB processing** — **Confirmed**  
Citations: CAMP Training page extract  
- https://www.campsystems.com/training

5) **CAMP mobile app (iCAMP) claims field capabilities directly relevant to due-item execution** — **Confirmed**  
- Airworthiness docs, discrepancies, work cards/procedural text, work orders, digital workflow with electronic signature option.  
Citation: App Store listing extract  
- https://apps.apple.com/us/app/icamp/id542306737

6) **CAMP integrations appear to support counter push + due/work-order pull in some ecosystems** — **Likely**  
- FL3XX KB documents post-flight actuals push, due/work-order pull, 3-hour sync option, and setup dependencies.  
- This is third-party integration documentation, not universal proof for all CAMP deployments.  
Citation: https://www.fl3xx.com/kb/camp

7) **CAMP appears to organize practical due handling in a single operational flow that can span many ATA-organized items** — **Likely**  
- Supported by MTX+AD/SB+eWorkOrder+iCAMP evidence and prior team synthesis, but public detail on exact ATA-level object model is limited.  
Citations: above URLs + `knowledge/research/camp-systems/TEAM-1-CAMP-FEATURE-INVENTORY.md`, `TEAM-2-WORKFLOW-COMPLIANCE-ANALYSIS.md`

---

## 3) Side-by-side: CAMP vs Athelon current handling

| Area | CAMP current handling | Athelon current handling | Confidence |
|---|---|---|---|
| Due list core | Calendarized due view with days/hours/cycles grouping, recurring visibility | Due workbench returns grouped events by overdue/due_soon/planned | Confirmed |
| AD lifecycle | Productized AD/SB manager with assess→plan→apply/report | Strong AD compliance module + deterministic due recompute + lifecycle guards + audit/ledger | Confirmed |
| Work planning from due list | eWorkOrder monthly planning directly from due list | `generateMonthlyPlan` creates draft WO + seeded task cards | Confirmed |
| Mobile execution | iCAMP claims discrepancy/work cards/WO/e-sign workflow | Not part of audited backend pair; no equivalent proven in this audit slice | CAMP Confirmed / Athelon Unknown (in this scope) |
| Integration/counter sync | Third-party docs show actuals push + due pull patterns | Counter reconciliation model exists in schema, but not evidenced as active in this due pipeline | Likely |
| ATA breadth for Ch.4/5 due items | Broadly marketed/practiced as comprehensive maintenance tracking | Mostly AD + maintenance program interval events in workbench sources | Likely |

---

## 4) Immediate gaps for Chapter 4/5 ATA DO-item support (Athelon)

1) **Expand due source coverage beyond 2 source types** — **Confirmed gap**  
Current due workbench source enum is only `maintenance_program` and `ad_compliance`.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:7,242`

2) **Replace fixed utilization assumptions with aircraft/program-specific utilization models** — **Confirmed gap**  
Hardcoded 1.5 h/day and 1 cycle/day risks poor forecast realism by fleet/type/use profile.  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:103-117`

3) **Add robust baseline anchoring per non-AD due item (last performed / carried-forward logic)** — **Likely gap**  
AD path is baseline-anchored via compliance history; maintenance-program path appears interval-from-now/modulo based in current flow.  
Citations: `dueEngine.ts:62-92`; `maintenancePrograms.ts:124-169`; `planningFromDueList.ts:91-133`

4) **Promote due-item→task-card generation with richer payloads** — **Confirmed gap**  
Current seeded cards are thin stubs (no steps, generic data source, no labor estimate mapping).  
Citation: `apps/athelon-app/convex/planningFromDueList.ts:328-365`

5) **Close AD actionable UX path from due/compliance views** — **Confirmed gap**  
Internal audit identifies missing one-click AD→task card workflow.  
Citation: `apps/athelon-app/AUDIT-PHASES-1-4.md:98-103`

6) **Harmonize signed authority chain for all regulatory due item classes** — **Likely gap**  
AD path is strong and signed; taskCompliance is explicitly administrative/not signed. Broader chapter 4/5 items likely need consistent signed-evidence patterns.  
Citations: `adCompliance.ts:135-419`; `taskCompliance.ts:10-12`

---

## 5) Bottom-line assessment

- **Athelon is strongest today in AD compliance rigor (deterministic recompute, lifecycle controls, signed evidence chain).** — **Confirmed**
- **Athelon has an emerging due-list planning flow, but currently narrow source coverage and simplified forecasting assumptions for broad Chapter 4/5 ATA DO handling.** — **Confirmed/Likely**
- **CAMP currently appears ahead in integrated operational breadth (due list + AD/SB + work-order planning + mobile + practical ecosystem integrations).** — **Likely/Confirmed by module-level evidence**

