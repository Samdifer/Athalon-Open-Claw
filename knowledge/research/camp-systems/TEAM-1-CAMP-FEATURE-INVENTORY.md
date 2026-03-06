# TEAM 1 — CAMP Systems Feature Inventory (Product Surface + Maintenance Tracking)

**Scope:** CAMP Systems product surface, with emphasis on maintenance tracking workflows (MTX).
**Research date:** 2026-03-06 (UTC)
**Method:** Official sources first, then secondary industry sources, then user-signal sources.

---

## 1) Product Surface Taxonomy

## A. Core maintenance tracking (CAMP MTX)

| Feature | What it does operationally | Status | Confidence | Cross-validation |
|---|---|---|---|---|
| Due item tracking by interval type | Tracks maintenance due by days/hours/cycles/other measures; supports visibility of multiple due items on same date. | Confirmed | High | CAMP MTX Calendar + CAMP training overview |
| Task/discrepancy detail with compliance/time-remaining | Users can open a due item and inspect compliance data and remaining time. | Confirmed | High | MTX Calendar page + training materials |
| Recurring task representation | Recurring maintenance items are rendered across selected calendar horizon. | Confirmed | High | MTX Calendar page + help-center search snippet |
| Work order container in MTX | Work orders used as planning/execution units for maintenance actions and tracking. | Confirmed | High | CAMP training + eWorkOrder page + App Store iCAMP feature list |
| Monthly planning from due list | eWorkOrder can generate monthly plan directly from due list. | Confirmed | High | eWorkOrder page + maintenance page search snippets |
| Mobile/desktop execution sync | Scheduled items/task assignment updates can be performed from desktop and iCAMP. | Confirmed | High | eWorkOrder page + iCAMP App Store description |
| Digital workflow + e-signature option | Paperless task workflow with electronic signature capability. | Confirmed | High | iCAMP App Store + eWorkOrder “paperless workflow” |
| AD/SB management portal | Find/review ADs and SBs; process and add to aircraft records in MTX. | Confirmed | High | Training page AD/SB module + maintenance page snippet mentioning AD/SB Manager |
| Program Manager | Digitized and automated maintenance program creation/monitoring/updating with quality control framing. | Confirmed | Medium | Program Manager page + CAMP ecosystem descriptions in secondary sources |
| Aircraft analyst support layer | Human analyst support embedded as operational “second set of eyes.” | Confirmed | Medium | Maintenance page + AviationPros profile |

## B. Mobile and field capabilities (iCAMP)

| Feature | What it does operationally | Status | Confidence | Cross-validation |
|---|---|---|---|---|
| Mobile access to maintenance status/info | Field access to aircraft maintenance data. | Confirmed | High | iCAMP App Store + CAMP iCAMP page |
| Discrepancy capture | Enter/view discrepancies from mobile context. | Confirmed | High | iCAMP App Store + Reddit user-signal snippets |
| Airworthiness documentation and ramp-check view | Access airworthiness docs and ramp-check views in app. | Confirmed | High | iCAMP App Store listing |
| Work cards + procedural text | Task card/procedural content available in mobile app. | Confirmed | High | iCAMP App Store |
| Work orders with maintenance tasks | Mobile support for WO task context. | Confirmed | High | iCAMP App Store + eWorkOrder page |
| Aircraft Insights (Garmin data ingestion) | Upload Garmin flight operational data to CAMP; trend/threshold comparisons in charts. | Confirmed | Medium | iCAMP page + training EHM references |

## C. Adjacent modules tightly coupled to maintenance execution

| Module | Operational relevance to maintenance tracking | Status | Confidence | Cross-validation |
|---|---|---|---|---|
| Inventory Management System (IMS) | Lifecycle tracking of parts (shelf-life, location, reorder, purchasing, receiving), supports maintenance readiness. | Confirmed | High | IMS page + training page + secondary listings |
| Flight Scheduling (FS) | Scheduling context impacts maintenance planning windows and dispatch reliability. | Confirmed | Medium | FS page + maintenance page snippet + secondary listings |
| Engine Health Monitoring (EHM) | Condition-based trend/fault/exceedance monitoring; drives maintenance recommendations. | Confirmed | High | EHM page + training page |

## D. Integrations and ecosystem evidence

| Integration/behavior | Operational implication | Status | Confidence | Cross-validation |
|---|---|---|---|---|
| Bi-directional ecosystem with MRO shop software (CORRIDOR claim) | Suggests task-card / work package interoperability between tracking and shop execution systems. | Confirmed (partner claim) | Medium | Aviation Week Marketplace CORRIDOR page + CAMP broad product-surface claims |
| Flight ops platform sync (FL3XX knowledge base) | Auto-push times/cycles to CAMP; pull due lists/work orders; 3h due-list sync cadence option. | Confirmed (3rd-party integration doc) | Medium | FL3XX KB + Reddit user pain point about duplicate entries supports need |
| CAMP support flags aircraft-level integration enablement | Integration is configured per-aircraft with CAMP-side enablement controls. | Confirmed (3rd-party integration doc) | Medium | FL3XX KB + CAMP support contact/process framing |

---

## 2) Maintenance Tracking Workflow Map (MTX-Centric)

## Step 0 — Aircraft and program baseline
1. Aircraft/fleet onboarded in CAMP MTX.
2. Maintenance program framework managed in Program Manager (where licensed/used).
3. AD/SB applicability and processing performed via AD/SB portal.

**Key data objects:** aircraft registration, systems/serials, maintenance program tasks, AD/SB directives.

## Step 1 — Usage ingestion (drives next-due)
1. Flight activity updates aircraft/engine/APU times/cycles.
2. Data can be entered directly in CAMP or pushed from integrated ops systems (e.g., FL3XX post-flight push model).
3. CAMP recalculates due status and projections.

**Failure mode noted by users:** duplicate-entry friction when ops and maintenance systems are not tightly integrated.

## Step 2 — Due-list and calendar planning
1. MTX Calendar surfaces due tasks/discrepancies with time remaining and compliance context.
2. Planner reviews clustered due events (same date/metric) and recurring tasks.
3. eWorkOrder can create monthly plan from due list.

## Step 3 — Work package / task execution
1. Planned items move into work orders.
2. Task assignment and updates occur across desktop + iCAMP.
3. Work cards/procedural text and discrepancies are consumed/updated in execution.
4. Digital workflow and electronic signatures support paperless closeout.

## Step 4 — Compliance closure and records
1. Tasks updated to complied status.
2. AD/SB actions documented against aircraft applicability/implementation strategy.
3. Airworthiness documentation and related compliance evidence stored/viewed (including mobile access patterns).

## Step 5 — Continuous oversight and optimization
1. Analyst support reviews ongoing maintenance posture.
2. EHM adds exceedance/fault/recommendation signal into maintenance decisioning.
3. Inventory status and procurement data (IMS) influence maintenance readiness and downtime.

---

## 3) Confirmed vs Inferred Capability Boundaries

## Confirmed (high confidence)
- Due-list/calendar mechanics (multi-interval, recurring tasks, compliance/time remaining views)
- Work-order centric maintenance planning/execution
- AD/SB management portal functionality (find/review/process)
- iCAMP field features (discrepancies, work cards, work orders, digital workflow)
- IMS core part lifecycle and procurement/stock controls
- EHM monitoring/trending and analyst-oriented outputs

## Inferred or environment-dependent (flagged)
- Depth of “full ERP-like” shop execution in MTX alone (vs with corridor/quantum/etc.)
- Native real-time bi-directional sync behavior across all third-party dispatch/ops platforms (confirmed for specific integrations, not universal)
- Advanced predictive maintenance claims beyond described EHM analytics (insufficient public technical detail)

---

## 4) Real-User Signals (non-marketing)

1. **Adoption asymmetry:** teams often use CAMP strongly for maintenance tracking/MTR generation but underuse work-order/inventory modules.
2. **Complexity/configuration burden:** comments indicate value is high when properly configured; weak setups create workflow friction.
3. **Integration pain point:** duplicate data entry (flight actuals) appears as a recurring complaint where integration is partial or absent.
4. **Mobile execution value:** discrepancy entry and field visibility are repeatedly highlighted in user contexts and app-store feature framing.

(See source log for direct links and evidence notes.)

---

## 5) Source Citations (URL list)

### Official CAMP sources
- https://www.campsystems.com/maintenance
- https://www.campsystems.com/mtx-calendar
- https://www.campsystems.com/eWorkOrder
- https://www.campsystems.com/program-manager
- https://www.campsystems.com/icamp
- https://www.campsystems.com/inventory
- https://www.campsystems.com/flight-scheduling
- https://www.campsystems.com/engine-health-monitoring
- https://www.campsystems.com/training
- https://www.campsystems.com/support

### Secondary sources
- https://marketplace.aviationweek.com/suppliers/camp-systems-international/
- https://www.aviationpros.com/aircraft-maintenance-technology/mros-repair-shops/maintenance-it/record-keeping/company/10134036/camp-systems-international-inc
- https://marketplace.aviationweek.com/company/corridor-aviation-service-software-0
- https://www.fl3xx.com/kb/camp
- https://platform.softwareone.com/vendor/camp-systems-international/VND-6218-2451

### Real-user signals
- https://www.reddit.com/r/aviationmaintenance/comments/1fld0o9/camp_work_ordersinventory/
- https://www.reddit.com/r/aviationmaintenance/comments/sfb7tg/im_trying_to_select_a_maintenance_tracking/
- https://www.reddit.com/r/aviationmaintenance/comments/x4ya4d/bizav_folks_anyone_have_intel_on_what_camps_costs/
- https://apps.apple.com/us/app/icamp/id542306737
- https://www.g2.com/sellers/camp-systems

---

## 6) Practical Takeaways for Athelon Competitive Modeling

1. CAMP’s defensible core is **maintenance tracking + analyst service + OEM-adjacent compliance workflows**.
2. MTX workflow is strongest when linked to **usage ingestion + due-list planning + mobile execution + records closure**.
3. User comments suggest an opportunity: **simpler configuration and faster activation of WO/inventory value** are differentiators.
4. Integration surface (times/cycles push, due-list pull, discrepancy/work-order linkage) is a key battleground for operational stickiness.
