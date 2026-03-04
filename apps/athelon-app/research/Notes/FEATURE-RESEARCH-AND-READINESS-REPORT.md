# Athelon Feature Research & Implementation Readiness Report

> **Purpose:** Comprehensive research document covering all 15 feature categories from the Organized Feature List. For each feature: current implementation status, best-practice research, integration strategy, and readiness assessment. This will feed into the Master Build List.

---

## Feature Status Summary

### Fully Built (no action needed)
| Feature | Key Files |
|---|---|
| Work Order Lifecycle | `convex/workOrders.ts`, `convex/returnToService.ts`, 15+ WO pages |
| Task Cards | `convex/taskCards.ts`, step-level sign-off, IA requirements |
| Squawks / Discrepancies | `convex/discrepancies.ts`, MEL deferral, OP-1003 classification |
| WO Assignment | `convex/taskAssignments.ts`, execution Gantt, `/my-work` |
| WIP Dashboard | `/dashboard` + `/work-orders/dashboard`, stat cards, charts |
| Drag-and-Drop Scheduling / Gantt | `/scheduling` with 6 sub-routes, multi-lane Gantt, bay swim lanes |
| Logbook Entry Generation | `convex/maintenanceRecords.ts`, immutable 43.9/43.11 records |
| Fleet View / Aircraft Detail | `/fleet`, `/fleet/:tail`, calendar, predictions pages |
| Aircraft Onboarding Wizard | `convex/faaLookup.ts`, FAA N-number lookup, `AddAircraftWizard.tsx` |
| Parts Tracking & Inventory | `convex/parts.ts` + 6 related files, receiving/PO/alerts/lots/shipping |
| Rotables Management | `convex/rotables.ts`, full lifecycle tracking |
| Tool Crib / Calibration | `convex/toolCrib.ts`, `testEquipment` table |
| Counter Sales | `convex/otcSales.ts`, `/billing/otc` |
| Bay Management / Capacity | `convex/hangarBays.ts`, `convex/capacity.ts` |
| AD Tracking & Compliance | `convex/adCompliance.ts`, fleet-level + per-aircraft views |
| Customer Portal | `convex/customerPortal.ts`, 5 portal pages, full query set |
| Customer CRM | `customers` + `customerNotes` tables, detail page with tabs |
| Billing & Invoicing | 16+ billing tables, 22 billing pages, PDF generation |
| Quote Management | Full lifecycle, templates, per-line decisions |
| Vendor Services | `vendorServices` + `taskCardVendorServices` tables |
| Task Compliance | `taskComplianceItems` table, per-task + per-WO views |
| RBAC | 8 roles, permission matrix, `RouteGuard`, `RoleGuard` |
| Multi-Location | `shopLocations` table, per-location bay management |

### Partially Built (need completion)
| Feature | What Exists | What's Missing |
|---|---|---|
| Predictive Maintenance | `maintenancePredictions` table, predictions page | Chapter 5 ingestion pipeline, multi-trigger logic, level loading |
| Life-Limited Components | Schema fields on `parts`/`engines` tables | Dedicated LLP dashboard, remaining-life calculations, fleet alerts |
| QuickBooks Integration | Schema tables, settings UI, `testConnection` action | Actual OAuth handshake, real sync pipeline |
| Voice-to-Text Notes | `VoiceNoteRecorder.tsx`, audio recording, manual transcript | Whisper API integration, Convex persistence (currently localStorage) |
| Trainer Dashboard | `/personnel/training` page, `TrainerSignOffQueue.tsx` | Persistent sign-off (uses useState), trainer records, OKR tracking |
| Efficiency Scoring | `GrowthCurveDashboard.tsx`, `EfficiencyBaseline.tsx` | Real task-time data wiring (synthetic estimates currently) |
| Repair Station Audit Dashboard | Compliance pages, `auditLog` table, QCM review | Dedicated Part 145 audit readiness metrics dashboard |
| Capabilities List | `stationSupportedAircraft` table | FAA-format capabilities list document, ratings display |
| Digital Sign-Off Workflow (Training) | `TrainerSignOffQueue.tsx` component | Convex persistence of sign-off status (currently client-only) |

### Not Built (need full implementation)
| Feature | Priority Assessment |
|---|---|
| OJT Training Jacket System | **HIGH** — Core differentiator, founder's primary vision |
| Training Scoring (1-6 pts) | **HIGH** — Part of OJT system |
| Radar Chart / Skill Visualization | **HIGH** — Part of OJT system |
| Gamification of Training | **MEDIUM** — Layered on top of OJT |
| Technician Career Profile | **HIGH** — Second core product pillar |
| Resume Parsing (Elevate MRO) | **MEDIUM** — AI-powered, depends on nomenclature index |
| Standardized Nomenclature Index | **HIGH** — Foundation for career + marketplace |
| ADS-B Integration | **MEDIUM** — External API dependency, high value |
| Chapter 5 Schedule Ingestion | **MEDIUM** — Manual curation first, automation later |
| Logbook Scanning / OCR | **LOW** — External dependency, ancillary service |
| Sales Pipeline from Predictions | **MEDIUM** — Connects predictions to CRM |
| FAA Diamond Award Tracking | **LOW** — Simple tracking feature |
| Certifications (Wyvern, IS-BAO) | **LOW** — Niche certifications |
| Industry Benchmarking / Task-Time Data | **LOW** — Platform-scale feature, needs customer base |
| Marketplace / Recruiting | **LOW** — Separate product, future roadmap |
| Military Skill Bridge | **LOW** — Niche feature, depends on career profile |
| Interview Prep AI | **LOW** — Depends on career profile |
| Auto Resume Generation | **LOW** — Depends on career profile |

---

## Category 1: Work Order Management

### Status: FULLY BUILT
All 9 features from the organized list are implemented. The work order system is the most mature area of the application.

### What Exists
- **10-value status enum** + 9-value `customerFacingStatus` — covers the full quote → release lifecycle
- **Task cards with step-level sign-off** — `taskCardSteps` with IA requirements, measurements, parts installed/removed
- **Squawk/discrepancy tracking** — 10 disposition values, MEL deferral, OP-1003 classification
- **WO assignment** — task-level via `assignedToTechnicianId`, WO-level via `assignedRosterTeamId`, execution Gantt
- **WIP dashboard** — stat cards, WO status chart, tech utilization, revenue trends
- **Scheduling** — multi-lane Gantt with draggable lanes, bay swim lanes, financial tracker
- **Logbook entries** — immutable 43.9/43.11 records with cryptographic hashing
- **100+ schema tables** supporting the full domain

### Gaps to Address (Enhancements, Not New Builds)
1. **Agent-assisted inspections** — AI suggests common inspection items per aircraft type. *Integration point:* Add an AI suggestion panel to the task card creation flow. Use the `maintenancePrograms` data (once curated) + LLM prompt to suggest items. Store suggestions in a `taskCardSuggestions` table; log overrides with reason.
2. **Override tracking** — If technician overrides an AI suggestion, log who/why. *Integration point:* Add `overrideReason` and `overrideByTechnicianId` fields to the suggestion record. The existing `auditLog` table pattern supports this.

### Best Practices
- AI suggestions in safety-critical contexts must always be **advisory only** with human-in-the-loop confirmation (per AC 145-10 and the founder's explicit design philosophy)
- Override tracking is an FAA audit differentiator — demonstrates the organization's process for handling AI recommendations

---

## Category 2: Fleet & Aircraft Management

### Status: MOSTLY BUILT (ADS-B is the gap)

### What Exists
- Fleet list, aircraft detail (multi-tab), calendar view, predictions page
- FAA N-number lookup via `faaLookup.ts`
- `aircraft` table: make, model, serial, totalTimeAirframeHours, totalLandingCycles, baseLocation, status
- `engines` table (v3): totalCycles, cyclesSinceOverhaul, TBO limits, LLP review date
- Customer/aircraft association via `customerId` on aircraft
- Loaner tracking via `loanerItems` and `loanerHistory` tables

### ADS-B Integration — Research Findings

**Data Sources (ranked by recommendation):**

| Provider | Best For | Historical Data | Pricing |
|---|---|---|---|
| FlightAware AeroAPI | Most complete US GA coverage | Jan 2011–present | Usage-based, tiered (requires portal signup) |
| ADS-B Exchange | Unfiltered data, trace files | Mar 2020–present at 5s intervals | "Significantly lower than others" |
| OpenSky Network | Academic/research, free tier | Trino SQL interface | Free (400 req/day), commercial license for production |

**Flight hour estimation accuracy:**
- ADS-B gives clock time (block-off to block-on), NOT tach time
- Piston aircraft: ADS-B hours are 5–25% higher than tach hours
- Turbine aircraft: ADS-B hours are 0–5% higher than logbook hours
- **Correction factor:** Store per-aircraft `adsbTachCorrectionFactor` (e.g., 0.92) calibrated from periodic logbook/ADS-B comparisons

**Cycle counting:** `on_ground` flag transitions reliably count takeoff/landing cycles. Filter out segments < 90 seconds to eliminate taxi false positives.

**Critical rule:** ADS-B estimates must NEVER auto-write to `totalTimeAirframeHours` (INV-18 monotonic invariant). Store separately in `adsbFlightSessions` table.

**Implementation architecture:**
```
Convex cron (nightly) → internalAction (fetches FlightAware API)
  → ctx.runMutation (writes adsbFlightSessions)
  → internalMutation (recomputes prediction inputs)
```

**New tables needed:**
- `adsbFlightSessions`: aircraftId, nNumber, departureTimestamp, arrivalTimestamp, clockDurationMinutes, estimatedTachHours, departureAirport, arrivalAirport, cycleCount, dataSource
- `adsbSyncState`: aircraftId, lastSyncTimestamp, lastKnownIcao24Hex, syncStatus

**Integration with existing schema:** The `aircraft` table already has `totalTimeAirframeHours` and `totalLandingCycles`. ADS-B data feeds into a comparison view: "Logbook: 3,450 hrs | ADS-B estimate: 3,480 hrs | Drift: +30 hrs since last logbook update."

---

## Category 3: Predictive Maintenance & Scheduling

### Status: PARTIALLY BUILT

### What Exists
- `maintenancePredictions` table with prediction types, severity, confidence
- `/fleet/predictions` page with severity filters
- Current `generatePredictions` uses hardcoded 3500h TBO and 40h/month utilization

### What's Missing & Research Findings

**1. Chapter 5 Maintenance Schedule Ingestion**

*Legal/licensing reality:*
- Large aircraft OEMs (Boeing, Airbus, Bombardier) deliver AMMs via proprietary portals. No programmatic API access.
- GA OEMs (Cessna, Piper, Cirrus) deliver PDFs only. No structured digital format.
- CAMP Systems has pre-parsed Chapter 5 intervals for 20,000+ aircraft but offers no public API.

*Recommended approach:*
- **Phase 1 (manual curation):** Create `maintenancePrograms` table with Chapter 5 intervals for 15–20 common aircraft types (Cessna 172/182/206/210, Piper PA-28/32/34, Beechcraft Bonanza/Baron, King Air 90/200, Cirrus SR22, Citation CJ series). This is a fixed reference database.
- **Phase 2 (customer input):** Allow shop managers to enter/modify interval cards per aircraft serial number.
- **Phase 3 (future):** When CAMP or OEM APIs become available, integrate for automated population.

**2. Multi-Trigger Scheduling Algorithm**

Each maintenance task stores up to three interval dimensions:
```
calendarIntervalDays (e.g., 365 for annual)
hourIntervalTT (e.g., 100 for 100-hour)
cycleIntervalLandings (e.g., 500 cycles)
```

Due date computation:
```
calendarRemaining = (lastComplianceDate + calendarInterval) - today
hoursRemaining = (lastComplianceTT + hourInterval) - currentTT
cyclesRemaining = (lastComplianceCycles + cycleInterval) - currentCycles

effectiveDueDate = min(projected dates for each dimension)
```

The "whichever comes first" vs. "whichever is greater" logic is per-task.

**3. Level Loading Optimization**

Algorithm: For each due event, define a window [earliestOpportunity, hardDeadline]. Assign events to the calendar week with lowest current bay utilization. This is a greedy earliest-deadline-first bin-packing approach — sufficient for fleets up to a few hundred aircraft.

**4. Work Scope Pre-Calculation**

At WO induction: query all `maintenancePrograms` tasks for the aircraft type/serial, filter to those due within a look-ahead window (30 hours or 30 days beyond induction date), auto-create draft task cards.

**5. Sales Pipeline from Predictions**

When a maintenance event's `effectiveDueDate` is within 90 days and no open WO exists → auto-create a CRM opportunity tagged with estimated labor hours and parts from task card templates.

### New Schema Needed
```
maintenancePrograms: {
  aircraftType, serialNumberScope (all | specific),
  taskName, ataChapter, approvedDataRef,
  calendarIntervalDays, hourInterval, cycleInterval,
  triggerLogic ("first" | "greater"),
  isPhaseInspection, phaseNumber,
  requiredPartsTemplate[], estimatedLaborHours
}
```

### Life-Limited Component Dashboard

**Current gap:** Schema fields exist on `parts` (isLifeLimited, lifeLimitHours, lifeLimitCycles) and `engines` (totalCycles, cycleBetweenOverhaulLimit), but:
- No `cyclesAccumulatedAtInstall` / `hoursAccumulatedAtInstall` on parts table (needed for remaining-life calc)
- No dedicated LLP dashboard view
- No fleet-level LLP alert system

**Add to `parts` table:**
- `cyclesAccumulatedAtInstall` — cycles this part carried into current installation
- `hoursAccumulatedAtInstall` — hours carried into current installation
- `totalAccumulatedCycles` / `totalAccumulatedHours` — running totals updated at removal

**Remaining life formula:**
```
remainingCycles = lifeLimitCycles - (cyclesAccumulatedAtInstall + (engine.totalCycles - engineCyclesAtInstall))
```

**Alert thresholds (industry standard):**
- Warning: ≤20% remaining life (or 500 cycles, whichever is more conservative)
- Critical: ≤10% remaining life (or 200 cycles)
- Overdue: 0% or exceeded

**Visualization:**
- Per-aircraft: table of all LLPs with remaining-life percentage bars
- Fleet-level: stoplight grid (rows = aircraft, columns = LLP types, color = health)
- "Stack leader" card: per engine, the LLP with lowest remaining life

---

## Category 4: Scheduling & Capacity Planning

### Status: FULLY BUILT

All features exist: drag-and-drop scheduler, bay management, capacity view, roster management, financial planning integration. The scheduling module has 12+ schema tables and 7 pages.

### Gaps to Address (Enhancements)

**1. Auto-schedule (magic scheduler)** — Not yet implemented. Would use the level-loading algorithm from Category 3 applied to the existing `scheduleAssignments` + `hangarBays` data.

**2. Team composition analysis** — AI analyzes team skill mix vs. WO requirements. *Integration point:* When OJT system is built, query the team's OJT jacket scores for the ATA chapters relevant to the WO's task cards. Warn if mismatch (e.g., sheet metal project needs 4 specialists but only 1 assigned).

**3. Critical path tracking** — PMBOK/Lean principles applied to WO execution. *Integration point:* The existing execution Gantt (`WOExecutionGantt.tsx`) already has task assignments with `scheduledStart`/`scheduledEnd`. Adding dependency links between task cards would enable critical path highlighting.

---

## Category 5: OJT Training & Technician Development — MAJOR NEW BUILD

### Status: NOT BUILT (the most important unbuilt feature)

### Regulatory Foundation (14 CFR Part 145)

**What the FAA requires (per § 145.163 + AC 145-10):**
- An FAA-approved employee training program (initial + recurrent)
- Individual training records retained 2+ years
- Records traceable to approved data (AMM sections, ATA chapters)
- Dual-signature model: trainer certifies tech is capable; tech confirms receipt
- Trainer must have documented proficiency in the area being taught

**What auditors check:**
1. Can you produce the training program document?
2. Can you produce individual training records for every active employee?
3. Do records go back at least 2 years?
4. Is there a record for every task/skill area assigned?
5. Are trainers' qualifications documented?
6. Is recurrent training occurring at approved intervals?
7. Are records traceable to approved data?

**Most common audit failure:** Vague records that say "completed initial training" without specifying tasks, trainer, or data reference.

### ATA Code System for Training Organization

ATA 100 / JASC codes use a hierarchical `CC-SS-TT` format. For training curricula, the **2-digit chapter level** organizes task categories; individual tasks reference the **4-digit section level** for traceability.

**Mapping to curriculum sections:**
| Section | ATA Chapters |
|---|---|
| Basics | 05, 07, 08, 09, 10, 12, 20 |
| Intermediate | 21, 24, 27, 28, 29, 32, 33 |
| Advanced | 22, 23, 31, 34, 42, 45, 46 |
| Specialties: Sheet Metal | 51, 52, 53, 55, 56, 57 |
| Specialties: Avionics | 23, 34, 42, 44, 45, 46 |
| Specialties: Engine/Powerplant | 71–80 |

### 4-Stage Sign-Off Model (Aligned with EASA Part 66 OJT + TWI)

| Stage | Code | Description | Who Signs |
|---|---|---|---|
| 1 | `observe` | Trainer demonstrates, tech watches | Trainer confirms |
| 2 | `assist` | Tech performs with trainer assisting | Trainer signs; tech acknowledges |
| 3 | `supervised` | Tech performs solo, trainer observes | Trainer signs completion |
| 4 | `evaluated` | Oral + practical test | Trainer signs; chief inspector countersigns |

**Scoring:** 1 point per stage completed (cumulative). Max 4 points per task. Score is **computed from events**, not stored — avoids drift.

**Critical design rule:** Each stage completion is an **append-only event** (never mutated). A tech can work with different authorized trainers at different stages. The system detects pending sign-offs automatically.

### Proposed Convex Schema (7 new tables)

```
ojt_curricula — Per aircraft type curriculum definition
  organizationId, aircraftType, name, isActive

ojt_curriculum_sections — Sections within a curriculum
  curriculumId, name (Initial/Basics/Intermediate/Advanced/Specialties), displayOrder

ojt_tasks — Individual trainable tasks
  sectionId, curriculumId, ataChapter, description, approvedDataRef, isSharedAcrossTypes

ojt_jackets — Per technician per curriculum (their "training jacket")
  technicianId, curriculumId, status (in_progress/fully_qualified/suspended)

ojt_stage_events — APPEND-ONLY sign-off records (audit-immutable)
  jacketId, taskId, technicianId, stage, trainerId, trainerCertificateSnapshot,
  approvedDataRef, trainingMethod, techSignedAt, trainerSignedAt,
  chiefInspectorSignedAt, chiefInspectorId, notes

ojt_trainer_authorizations — Which techs can train on which tasks
  technicianId, scope (task/section/curriculum), grantedByTechnicianId, expiresAt

ojt_training_goals — OKR integration
  technicianId, period (weekly/monthly/quarterly/yearly), targetType, targetValue
```

### Radar Chart Implementation

Use **Recharts `<RadarChart>`** (already in the project). Best practices:
- Limit to 6–9 axes (curriculum sections, not individual ATA codes)
- Show two series: current score (filled) + target score (outline) for OKR integration
- Normalize to 0–100% so sections with different task counts are comparable
- Multi-tech comparison: up to 4 overlapping polygons, beyond that use small multiples

### Gamification Strategy (Safety-Critical Context)

**What works:** Reward mastery, not speed. Gate progression on trainer sign-off.

**Tier 1 (Launch):** Progress rings per aircraft type + milestone badges
**Tier 2 (Month 2):** Team dashboards + OKR streak tracking + "Most Improved"
**Tier 3 (Quarter 2):** Incentive templates — leads create reward templates tied to training milestones

**Anti-gaming safeguards:**
- Cannot advance stage without prior stages signed by authorized trainer
- No self-certification
- Anomaly detection: flag if trainer signed >15 tasks/day for one tech
- Chief inspector countersign required to close full jacket

### Integration with Existing Schema

- `ojt_jackets.technicianId` references existing `technicians` table
- Do NOT collapse existing `technicianTraining` / `trainingRecords` into OJT system — they serve compliance monitoring and scheduler constraints separately
- OJT completion can CREATE `trainingRecords` entries (one-way feed)
- `ojt_stage_events.actualMinutes` feeds FAA AMT award hour tracking

---

## Category 6: Technician Efficiency & Growth

### Status: PARTIALLY BUILT

### What Exists
- `GrowthCurveDashboard.tsx` — Recharts line chart from Convex data
- `EfficiencyBaseline.tsx` — scatter chart with **synthetic** efficiency estimates
- `timeEntries` table with actual task-time data (not yet wired to efficiency)

### What Needs to Happen
1. **Wire real task-time data** from `timeEntries` to efficiency calculations (replace synthetic estimates)
2. **Growth curves** — Store per-technician efficiency targets via the `ojt_training_goals` table
3. **Radar chart** — Built as part of OJT system (Category 5)
4. **Run/taxi qualifications** — `ojt_aircraft_ops_quals` table (see OJT schema above)

### Balanced KPIs (from founder's vision)
- **Primary:** On-time delivery + first-time fix rate (NOT billable hours/efficiency)
- **Secondary:** Efficiency numbers for planning purposes only
- Efficiency is outside technician's control (depends on scheduling, tool access, assignment)
- The system should never incentivize efficiency as a tech-level OKR

---

## Category 7: Technician Career Profile & Marketplace — MAJOR NEW BUILD

### Status: NOT BUILT

### FAA Data Sources Available

| Source | Data | Access Method |
|---|---|---|
| Releasable Airmen Database | Name, certificate types, ratings, address | Monthly CSV bulk download |
| Aircraft Registry | N-number, manufacturer, model, serial, engine, TC number | Monthly CSV download |
| TCDS (Type Certificate Data Sheets) | Approved engine/propeller combos, design data | PDFs via drs.faa.gov |
| IACRA | Certification applications | No third-party access |

**No real-time FAA API exists.** Athelon must ingest monthly bulk downloads into local lookup tables.

### Nomenclature Index Architecture

Build from three layers:
1. **FAA Aircraft Registry CSV** — canonical airframe/engine table (300,000+ registrations)
2. **TCDS data** — link make/model to approved engine configurations
3. **ATA/JASC codes** — standardize "what they worked on" across employers

Add an **alias/synonym layer** for fuzzy matching ("King 200" → "Beechcraft B200"). Use Convex vector search for embedding-based similarity when alias matching fails.

### Resume Parsing Pipeline

```
PDF upload → Convex file storage
  → internalAction ("use node") → pdf-parse text extraction
  → OpenAI GPT-4o structured extraction (JSON schema output)
  → Post-extraction normalization against nomenclature index
  → Human review queue for unresolvable aircraft names
```

**Aviation-specific extraction schema:**
```
certificates: [{ type, number, ratings }]
employers: [{ companyName, repairStationCertNumber, startDate, endDate,
              aircraftWorked[], enginesWorked[], systemsWorked[] }]
militaryService: [{ branch, mosAfscNec, aircraftWorked }]
education: [{ institution, program, type }]
```

**Employer-to-repair-station correlation:** Fuzzy match employer names against FAA repair station database for pre-filling verified employer data.

### IA Renewal Tracking (14 CFR 65.93)

- 2-year cycle expiring March 31 of odd years
- Requires at least one qualifying activity per year (annual inspections, major repairs, refresher course, oral test)
- Digital tracking: store `IAActivity` events with evidence document uploads
- Calculate progress automatically, surface alerts as March 31 approaches

### Military Skill Bridge

- 14 CFR 65.77 governs military experience qualification for A&P
- Curate a table of qualifying MOS/AFSC/NEC codes from AC 65-30B
- Match military aircraft types to civilian FAA equivalents
- Generate FSDO interview documentation checklist

### Marketplace Architecture (Future Product)

- Two-sided marketplace with vector-embedding-based matching
- Use Convex vector search for profile-to-job matching
- Privacy model: profiles default to private, explicit opt-in for discoverability
- Granular visibility controls per field

---

## Category 8: Certifications & Awards

### Status: NOT BUILT

### FAA Diamond Award Integration

**How the program works:**
- Individual AMT Certificate: Bronze (16 hrs), Silver (40 hrs), Gold (80 hrs) of eligible training per calendar year
- Employer Diamond Award: 100% of eligible employees have individual certificates
- Tracked via FAASafety.gov

**Integration opportunity:**
- Add `isFaaAMTEligible` boolean to training records
- Computed query: `getAMTAwardProgressForYear(technicianId, year)` sums eligible hours
- Org-level query: `getDiamondAwardEligibility(orgId, year)` checks all-employee threshold
- Generate supporting documentation for FAASafety.gov submission

### Wyvern / IS-BAO (Low Priority)
Simple tracking tables for organizational certification status with expiry dates and document uploads. Can be built as a lightweight module when customer demand exists.

### Custom Athelon Certification Standard
Depends on OJT system maturity + sufficient customer base. Roadmap item for post-launch.

---

## Category 9: Parts, Inventory & Tool Management

### Status: FULLY BUILT (minor enhancements)

All 14 sub-features are implemented. The parts module has 13 pages and 9 Convex backend files.

### Gaps to Address

1. **Two-bin Kanban for consumables** — The `inventoryAlerts` system has reorder points. A dedicated consumable kanban view could visualize this as a physical two-bin system. Enhancement to existing `/parts/alerts` page.

2. **Predictive consumable spend** — Forecast annual consumable spend based on the scheduling module's planned work orders. Requires joining `scheduledAssignments` → `workOrders` → `laborKits` → parts requirements. Data exists; needs a computed report.

3. **QR code generation for tools** — The `toolRecords` table exists. Generate QR codes linking to tool detail pages with calibration data. Use a client-side QR library (qrcode.react or similar).

---

## Category 10: Customer Relationship Management

### Status: FULLY BUILT (enhancement opportunities)

### Existing
- Customer portal with 5 pages (dashboard, WOs, quotes, invoices, fleet)
- CRM with customer list, detail page, notes, interaction history

### Enhancement: Proactive Sales from Predictions
Connect `maintenancePredictions` to customer contact pipeline:
1. When prediction `effectiveDueDate` is within configurable window (default 90 days)
2. Check if open WO exists for that aircraft
3. If not, create a CRM opportunity with estimated scope
4. Notify the assigned CSR via the existing `notifications` system

### Enhancement: SendGrid Email Notifications
The existing `emailLog` table and `convex/email.ts` support email. Wire this to customer-facing events (WO status changes, quote ready, invoice sent). SendGrid or Resend integration via Convex `internalAction`.

---

## Category 11: Financial & Business Operations

### Status: FULLY BUILT

22 billing pages, 16+ schema tables, full lifecycle from quotes through invoicing to payments.

### QuickBooks Integration (Partially Built)
- Schema tables exist (`quickbooksSync`, `quickbooksSettings`)
- Settings UI exists
- `testConnection` action exists
- **Missing:** OAuth 2.0 handshake, real entity sync pipeline
- **Integration approach:** Convex `internalAction` with `"use node"` to call Intuit QuickBooks Online API. Sync invoices, payments, customers, and vendors bidirectionally. Use `quickbooksSync` table for per-entity sync status tracking.

### Accurate Quoting from Industry Data
Depends on industry benchmarking data collection (Category 12). Once task-time benchmarks exist, surface them in the quote creation flow as reference data.

---

## Category 12: Industry-Wide Data & Benchmarking — PLATFORM SCALE

### Status: NOT BUILT (requires customer base)

### Architecture: Give-to-Get Model

**Data collection pipeline:**
1. At WO close → `internalMutation` extracts anonymized task data
2. Strip all identifiers; retain only: ATA chapter, task duration, parts count, aircraft category, aircraft age bracket
3. Write to `benchmarkTaskEvents` table
4. Nightly aggregation into `benchmarkSummaries`: p25, p50, p75, p90 labor hours per ATA chapter per aircraft category

**Anonymization:**
- Organization-level: hash of `organizationId` + rotating quarterly salt
- Aircraft-level: retain only category (piston single, turboprop, light jet, etc.) + age bracket
- k-anonymity: suppress any benchmark cell with fewer than 5 contributors

**Quote integration:**
Display in quote creation: "Industry median for [ATA chapter] on [aircraft category]: 4.5 hrs. Your shop average: 3.8 hrs."

**Tool/facility requirements database:**
Crowd-edited `taskToolRequirements` table: ATA chapter, required tools, required test equipment, minimum bay size. Shops contribute as part of give-to-get.

---

## Category 13: Repair Station & Compliance

### Status: MOSTLY BUILT

### Audit Dashboard Enhancement
Existing compliance pages cover AD/SB tracking, audit trail, and QCM review. A dedicated "Part 145 Audit Readiness" dashboard would aggregate:
- Training compliance percentage (all employees have current records)
- Tool calibration status (all tools current)
- AD compliance status (all applicable ADs compliant)
- RSM revision currency
- Recent QCM review outcomes
- Open discrepancies count and age

### Capabilities List Enhancement
`stationSupportedAircraft` table exists. Need a formatted view matching FAA OpSpecs format showing organization ratings (airframe, powerplant, instrument, radio, accessory) with specific make/model/series authorizations.

---

## Category 14: UX & Accessibility

### Status: PARTIALLY BUILT

### Voice-to-Text (Whisper Integration)
**Current state:** `VoiceNoteRecorder.tsx` records audio and has a manual transcript textarea. Persists to localStorage, not Convex.

**Required changes:**
1. Move audio storage from localStorage to Convex file storage
2. Add `voiceNotes` table in schema (workOrderId, taskCardId, audioStorageId, transcript, transcribedAt)
3. Create Convex `internalAction` ("use node") calling OpenAI Whisper API for transcription
4. Replace manual transcript textarea with auto-transcribed text (editable)

### Spell Checking
Browser-native spell check (`spellCheck={true}` on textareas) covers basics. For enhanced checking, evaluate Grammarly's API or a self-hosted LanguageTool instance. Low priority — browser spell check is sufficient for launch.

---

## Category 15: Marketplace & Recruiting — SEPARATE PRODUCT

### Status: NOT BUILT (future roadmap)

This is explicitly called out as a separate product in the organized feature list. Dependencies:
- Requires completed technician career profile (Category 7)
- Requires standardized nomenclature index
- Requires vector-search-based matching
- Privacy architecture must be designed from the start

### Key Technical Decisions (for future planning)
- Profile embeddings via OpenAI `text-embedding-3-small` stored in Convex vector indexes
- Multi-embedding approach (certifications, aircraft experience, ATA codes, geography)
- Matching via `ctx.vectorSearch()` + re-ranking with indexed business rules
- Default-private profiles with explicit opt-in for discoverability

---

## Logbook Scanning / OCR — Research Findings

### Status: NOT BUILT

**Recommended OCR provider:** AWS Textract with `TABLES` feature type (best for columnar logbook data). 85–95% accuracy for legible entries; human review always required.

**Pipeline:**
```
Upload logbook images → Convex file storage
  → internalAction → AWS Textract AnalyzeDocument (TABLES)
  → Store results in logbookScanResults table
  → Human review queue UI (accept/correct/reject each row)
  → Accepted rows → create logbook records
```

**Post-processing:**
- Date format normalization
- Hours monotonic validation (must be ≥ previous entry)
- N-number cross-reference
- ATA chapter keyword extraction from description text

---

## Implementation Priority Recommendation

### Tier 1: Core Differentiators (Build First)
1. **OJT Training Jacket System** — 7 new tables, training page rebuild, radar chart
2. **Life-Limited Component Dashboard** — Schema additions + new fleet-level view
3. **Predictive Maintenance Enhancement** — `maintenancePrograms` table, multi-trigger logic

### Tier 2: High-Value Integrations (Build Second)
4. **ADS-B Integration** — External API, nightly sync, utilization estimation
5. **Voice-to-Text (Whisper)** — Move to Convex storage, add Whisper API
6. **Technician Career Profile** — Nomenclature index, experience dashboard
7. **Training sign-off persistence** — Wire `TrainerSignOffQueue` to Convex mutations

### Tier 3: Business Operations (Build Third)
8. **QuickBooks OAuth + Sync** — Complete the partially built integration
9. **Sales Pipeline from Predictions** — Connect predictions to CRM
10. **FAA Diamond Award Tracking** — Simple tracking module
11. **Repair Station Audit Dashboard** — Aggregated readiness view

### Tier 4: Platform Scale (Future)
12. **Industry Benchmarking** — Data collection pipeline
13. **Resume Parsing** — AI pipeline with human review
14. **Marketplace / Recruiting** — Separate product
15. **Logbook OCR** — Ancillary service
16. **Custom Certification Standard** — Requires customer base

---

## Key Architectural Patterns to Follow

All new features should follow the established pattern:

1. **Schema** → `convex/schema.ts` (table definition with indexes)
2. **Backend** → `convex/{feature}.ts` (query/mutation/action functions)
3. **Route** → `src/router/routeModules/protectedAppRoutes.tsx` (lazy-loaded page)
4. **Page** → `app/(app)/{section}/page.tsx` (React component with `useQuery`/`useMutation`)
5. **Sidebar** → `src/shared/components/AppSidebar.tsx` (nav entry with role access)

**Convex rules (from CONVEX_RULES.md):**
- New function syntax: `query({args: {}, handler: ...})`
- Always include argument validators
- Use `withIndex()` not `filter()` for queries
- Actions cannot use `ctx.db` — use `ctx.runQuery`/`ctx.runMutation`
- No `"use node"` in files with queries/mutations
- External API calls (ADS-B, Whisper, Textract, OpenAI) go in dedicated action files

**Existing utilities to reuse:**
- `src/shared/lib/barcode.ts` — barcode generation
- `src/shared/lib/pdf/` — PDF generation (InvoicePDF pattern)
- `src/shared/lib/roles.ts` / `rbac.ts` — permission checking
- `src/shared/hooks/useCurrentOrg.ts` — org context
- `src/shared/components/VoiceNoteRecorder.tsx` — voice recording (needs Whisper upgrade)
- Recharts — already in project for all chart types including RadarChart
