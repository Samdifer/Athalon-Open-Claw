# System-Level UX Orchestrator Review — Athelon MRO SaaS
**Date:** 2026-03-12
**Inputs:** UX Evaluation reports from 7 parallel agent teams (Team 1–7), covering ~130+ page surfaces across the full application
**Scope:** System-level synthesis, cross-module journey analysis, navigation architecture, entity duplication, data consistency, role-based experience, and consolidated priority recommendations

---

## Executive Summary

Athelon is a feature-complete MRO platform whose individual module quality ranges significantly — from production-grade (customer portal, invoice list, jacket sign-off) to critically incomplete (ADS-B settings page, vendor services tab, routing templates). The most pressing system-level concern is not any individual page issue but a set of **architectural patterns** that create compliance risk, multi-device data loss, and broken user journeys across module boundaries. Specifically: localStorage being used for operational MRO data, the CRM/Billing entity split requiring users to manage customers in two places, and a training/personnel navigation that fragments a single domain across four separate entry points.

The application is best described as a **feature-rich expert system** that rewards trained power users but creates significant friction for onboarding, for technicians on the shop floor, and for QCM inspectors trying to move through end-to-end compliance workflows. The navigation architecture houses 13+ top-level sidebar sections with deep sub-menus, some critical pages hidden behind in-page buttons with no sidebar entry at all.

---

## Section A: Cross-Module User Journeys

### A1. Induction Flow
**Customer contact → Quote → Schedule → Induct aircraft → Create WO → Execute tasks → RTS → Invoice**

This is the primary revenue-generating workflow and it crosses five modules: CRM → Sales/Scheduling → Fleet → Work Orders → Billing.

**Dead ends and friction points identified:**

1. **Prospect → Customer gap (CRM/Billing split):** Qualifying a prospect in `/crm/prospects/intelligence` and clicking "Promote to Customer" leaves the user on the prospects page with no link to the newly created account. The CRM module's "Add Customer" and "Edit in Billing" buttons both route out of CRM to `/billing/customers`, meaning accounts are effectively managed in Billing while CRM provides only a read overlay. (Team 5)

2. **Quote → Schedule hand-off:** The Scheduling module (`/scheduling`) has a built-in Quote Workspace (`/scheduling/quotes`), but this is also duplicated as a Sales entry point (`/sales/quotes`). There is no guided flow from an approved quote to a scheduled work slot — users must manually navigate from the quote detail to the scheduler. (Teams 4, 6)

3. **Aircraft induction missing from the flow:** There is no "induct aircraft" workflow step. Aircraft are added to the fleet via the Fleet page wizard, but there is no step between "customer brings aircraft" and "create work order" that captures incoming aircraft condition, fuel state, or pre-induction inspection requirements. The WO creation form does not reference the fleet page for this context.

4. **WO creation → Draft status dead end:** Creating a new work order always creates it in Draft status with no inline next-step guidance to move it to Open. The help text says "Open it after selecting technicians" but provides no link. (Team 1)

5. **RTS → Release disconnection:** The RTS sign-off page (`/work-orders/[id]/rts`) and the Release page (`/work-orders/[id]/release`) are separate pages with no cross-reference between them. After completing RTS, users do not see a "Next: Release aircraft" prompt. (Team 1)

6. **Release → Invoice gap:** After aircraft release, there is no "Next steps" panel linking to invoice creation. The billing team must manually find the work order in `/billing/invoices/new` and re-select it. No automated invoice draft is triggered on release. (Teams 1, 4)

**Journey score: 2.5/5** — Works for trained users who know the sequence; fails for new users at multiple transition points.

---

### A2. Parts Lifecycle
**Request part on task → Approve → PO to vendor → Receive → Inspect → Issue to task → Install**

1. **Parts requests stored in localStorage on the WO detail page** — the single most critical data integrity failure in the application. A technician requesting a part on task card TC-007 from their tablet creates a localStorage entry visible only on that device. The parts clerk on a different computer sees zero requests. The billing manager reconciling POs sees no connection to the originating task. (Team 1 — flagged as critical compliance risk)

2. **Parts request → PO workflow is manual:** There is a `/parts/requests` page and a `/billing/purchase-orders` page, but no automated path from an approved part request to a draft PO. The parts clerk must note the request and manually re-enter it as a PO.

3. **Receiving → Inspection → Issue to task path is present** (`/parts/receiving`, `/parts/receiving/po`) but the connection back to the originating task card is not surfaced. A technician cannot see from their task card that the part they requested has been received. (Team 2)

4. **PO Detail page** is the strongest link in the chain — the budget comparison card shows WO-linked spend. But this only works if the PO was manually linked to the WO at creation time — there is no auto-linking from parts requests. (Team 4)

**Journey score: 2/5** — The localStorage gap alone makes parts traceability non-functional for multi-device shops.

---

### A3. Compliance Workflow
**AD published → Fleet impact assessed → Task cards created → Work performed → Compliance recorded → Audit trail**

1. **AD/SB → Fleet impact is well-built:** `/compliance/ad-sb` and the Aircraft AD Compliance tab at `/fleet/[tail]` provide a solid foundation. The `getFleetAdSummary` backend function enables org-wide AD assessment. (Teams 2, 6)

2. **AD → Task card creation gap:** There is no guided flow from "AD affects N aircraft" to "create task card for each affected aircraft's work order." The AD compliance tab shows impact but does not link to WO creation with the AD pre-populated as a compliance item.

3. **Task compliance items (two-surface confusion):** Compliance items added at the task card level (`/work-orders/[id]/tasks/[cardId]`) also appear in the WO-level Compliance tab (`/work-orders/[id]` → Compliance tab). Technicians and QCM inspectors may update them inconsistently from the two surfaces. (Team 1)

4. **Maintenance Records → Compliance tab disconnect:** Records created at `/work-orders/[id]/records` are not reflected in the WO Compliance tab's readiness checklist, leaving a gap in the end-to-end compliance closure loop. (Team 1)

5. **QCM Review surface** at `/compliance/qcm-review` exists and was evaluated by Team 6 — it is the dedicated QCM workflow page, appropriate for the role. But the path from task-level sign-off to QCM review is not surfaced in the task card detail itself; technicians completing work must know to navigate there.

6. **Audit trail** at `/compliance/audit-trail` provides organizational event history. This is a read-only management view. The audit trail does not link back to source records (e.g., clicking a "WO signed off" event does not navigate to that WO). (Team 6)

**Journey score: 3/5** — AD tracking and audit infrastructure are solid; the gap is in AD→task creation automation and the two-surface compliance item management.

---

### A4. Personnel Management
**Hire tech → Onboard → Assign to team/shift → Train (OJT) → Certify → Schedule → Track time**

1. **Onboarding is critically under-designed:** The `/onboarding` page creates an org with 5 fields and sends users to `/dashboard?setup=complete` with no checklist of remaining steps. FAA certificate numbers, primary location, and staff configuration are deferred to Shop Settings with no guided handoff. (Team 7)

2. **Four-surface personnel training fragmentation:** A manager trying to understand a technician's full training status must navigate across:
   - `/personnel/training` — org-wide 11-tab mega-page (the worst-usability page in the application per Team 3)
   - `/personnel/[id]/training` — individual training records
   - `/training/ojt/jackets/[jacketId]` — OJT jacket detail
   - `/personnel/[techId]/career` — career profile summary
   None of these surfaces link to each other coherently. (Team 3)

3. **Career profile A&P/IA detection is fragile:** Certification status is inferred by checking if course names contain "a&p" or "ia" as substrings. This heuristic will fail in an FAA audit context. Structured `ampCertificateNumber` and `iaCertificateNumber` fields are needed. (Team 3)

4. **Scheduling → Personnel connection is broken:** The scheduling roster panel and the personnel time management page (`/personnel/time-management`) are both accessible from the Lead Center and from Scheduling, creating two separate time-tracking surfaces without clear differentiation. The `/scheduling/roster` page and the Lead Center's embedded `SchedulingRosterWorkspace` are near-duplicate experiences. (Teams 3, 5, 6)

5. **Time tracking has two surfaces:** `/my-work/time` (technician-facing) and `/billing/time-clock` (manager-facing) show the same underlying time entry data with different UI contexts. This is architecturally acceptable but leads to confusion when technicians see their entries from one angle and managers see them from another without clear labeling. (Teams 3, 4)

**Journey score: 2.5/5** — The individual components (OJT jacket, My Time page) are well-built; the connective tissue between hire → certify → schedule is missing.

---

### A5. Customer Lifecycle
**Prospect identified → Intelligence gathered → Account created → Quote sent → Work done → Invoice → Repeat**

1. **Prospect intelligence has two near-identical pages** (`/crm/prospects/intelligence` and `/crm/prospects/part135`) with no orienting explanation of their strategic difference. Part 145 is about competing shops or partners; Part 135 is about air charter operators who are potential customers. New users cannot tell these apart. (Team 5)

2. **Promote to Customer creates no post-conversion guidance:** After promoting a prospect, the user stays on the prospects page. There is no link to the new CRM account, no "What to do next" prompt, no automated interaction log entry saying "Converted from prospect on [date]." (Team 5)

3. **CRM/Billing account entity split is the most structurally significant issue in the CRM module.** The same customer record is accessible as a "CRM Account" (`/crm/accounts/[id]`) and a "Billing Customer" (`/billing/customers/[id]`). The CRM view adds health scores, interactions, and pipeline. The billing view adds invoicing. But the "Edit in Billing" button on CRM accounts admits that CRM cannot edit the base record. A user performing customer lifecycle management must mentally manage two views of the same entity. (Team 5)

4. **Quote creation does not pre-populate customer context** when triggered from the CRM account detail page. The user must re-select the customer after clicking "Create Quote." (Team 5)

5. **Sales Pipeline conflates two unrelated models:** The "Prediction Pipeline" (maintenance demand driven by fleet state) and "Manual Pipeline" (hand-entered sales opportunities) share a single page with co-equal tabs, different stage vocabularies (5 vs 6 stages), and asymmetric KPI cards. These should be separated. (Team 5)

**Journey score: 2.5/5** — CRM intelligence and account management are rich; the conversion flow and billing integration create structural friction throughout.

---

### A6. Daily Technician Workflow
**Clock in → View assignments (My Work) → Open task card → Log steps → Request parts → Log findings → Sign off → Clock out**

This is the highest-frequency workflow for the largest user segment. The individual page quality is actually among the highest in the application at the page level — but system-level gaps break the flow.

1. **Clock in** (`/my-work/time`) — Strong implementation. Cascading entry type selector. The main gap is that "Work Order" should be the default entry type, not "Shop / Internal." (Team 3)

2. **View assignments** (`/my-work`) — Well-executed risk-first sort. Gap: no temporal grouping of "today's work" vs. "upcoming," and the "Overdue" count is not surfaced as a stat card. (Team 3)

3. **Open task card** (`/work-orders/[id]/tasks/[cardId]`) — High density but complete. The 14 imported sub-components create cognitive load. The gap is that finding the task card requires navigating WO list → WO detail → task card — three clicks minimum, with no direct link from My Work to a task card within the WO context. (Actually there is — My Work cards do link to `/work-orders/${workOrderId}/tasks/${cardId}`. This path works. The issue is the WO context is lost on arrival.) (Team 1)

4. **Request parts** — Broken for multi-device use (localStorage). See A2 above.

5. **Log findings** — "Raise Finding" button exists per-step in the task card. After raising, the technician is navigated to the finding detail page and their scroll position on the task card is lost. (Team 1)

6. **Sign off** — The step sign-off and card-level sign-off are visually similar. There is no positive confirmation ("All steps complete — ready to sign card") between the two actions. (Team 1)

7. **Clock out** — Works, but the post-clock-out toast only confirms the action without summarizing total hours logged. (Teams 3, 4)

**Journey score: 3.5/5** — Strongest of the six journeys at the page level; the localStorage parts gap and missing positive confirmation states are the primary blockers.

---

## Section B: Entity Duplication and Module Overlap

### B1. Customer / Account (CRM ↔ Billing)
**Duplication cost: HIGH**

The same `customers` table record is presented as:
- A CRM Account at `/crm/accounts/[id]` (7 tabs: Overview, Contacts, Aircraft, Work History, Quotes & Invoices, Interactions, Documents)
- A Billing Customer at `/billing/customers/[id]` (6 tabs: Profile, Aircraft, Work Orders, Quotes, Invoices, Notes)

Both pages display the same aircraft, work orders, and quotes data from different angles. Users are explicitly routed between them via "Edit in Billing" buttons in CRM. This is not just a navigation issue — it creates uncertainty about which view is authoritative. The long-term fix is a single "Account" view with "Relationship" (CRM) and "Billing" tabs. In the interim, the cross-links should at minimum clearly label what each view adds.

### B2. Training Records (4 surfaces)
**Duplication cost: MEDIUM-HIGH**

Training data is surfaced in:
1. `/personnel/training` — org-wide 11-tab page
2. `/personnel/[id]/training` — individual tech training records
3. `/training/ojt/jackets/[jacketId]` — OJT jacket progression
4. `/personnel/[techId]/career` — career summary heatmap

There is no single view that answers "What is this technician's current training and certification status?" without visiting multiple pages. The career profile page is the intended synthesis view but relies on text-parsing heuristics rather than structured data.

### B3. Shop Locations (2 surfaces)
**Duplication cost: MEDIUM**

`/settings/locations` and `/settings/station-config` (Facilities & Bays tab) both create/edit/delete from the same `shopLocations` table with near-identical form dialogs. Users who create a location in one place will find it in the other — this is not a data issue but a discoverability and maintenance issue. The location form dialog code is duplicated across two files. (Team 7)

### B4. Time Tracking (2 surfaces)
**Duplication cost: LOW-MEDIUM**

`/my-work/time` (technician self-service) and `/billing/time-clock` (manager view) present the same `timeEntries` table data. The distinction is correct (personal vs. supervisory view) but neither surface explicitly calls out the other. A technician who clocks in from My Time will not see their entry in Time Clock unless they navigate there — acceptable, but the relationship between the surfaces should be documented in the UI.

### B5. Scheduling Roster (2 surfaces)
**Duplication cost: MEDIUM**

`/scheduling/roster` and the Lead Center's embedded `SchedulingRosterWorkspace` tab appear to render the same or similar scheduling roster experience. The Lead Center is positioned as the daily operational tool, and embedding a full scheduling workspace as one of its six tabs creates a significant scope jump. (Teams 5, 6)

### B6. Two "Forecast" pages with different methodologies
**Duplication cost: HIGH for finance users**

`/reports/financials/forecast` (historical invoice extrapolation) and the Scheduling module's `DailyFinancialTracker` / `CapacityForecaster` (schedule-assumption projection) are both called "forecast" in their respective contexts. For a shop owner reviewing financial projections, these will produce very different numbers from very different assumptions. Neither page documents its methodology or distinguishes itself from the other. (Team 6)

### B7. Two Lead Workspaces
**Duplication cost: MEDIUM**

`/work-orders/lead` and `/lead` are both "lead technician workspace" pages accessible from the sidebar. `/lead` is the consolidated Lead Center (6 tabs, higher-level). `/work-orders/lead` is the older Lead Workspace (5 tabs, more WO-specific). The sidebar shows "Lead Center" linking to `/lead` and "Lead Workspace" under Work Orders linking to `/work-orders/lead`. These serve overlapping purposes with different scopes. Users may not know which to use for their task. (Teams 1, 5)

---

## Section C: Navigation Architecture

### C1. Sidebar Structure Assessment

The sidebar currently houses 13 top-level entries (Dashboard, My Work, Lead Center, Fleet, Work Orders, Schedule, Parts, Sales, Billing, CRM, Compliance, Reports, Personnel + OJT + Settings in the bottom group). This is at the upper bound of what users can cognitively manage as a flat list.

**Specific navigation problems:**

| Issue | Details |
|---|---|
| Lead Center appears twice | `/lead` as a standalone top-level item AND `/work-orders/lead` as a Work Orders child. Both serve lead technicians. |
| Prospect Intelligence appears twice | Listed under both `Sales` sub-menu and `CRM` sub-menu, pointing to the same routes. |
| Sales Training appears twice | `/sales/training` is a child of both `Sales` and `CRM` in the sidebar nav definition. |
| ADS-B Settings misplaced | `/settings/adsb` is listed as a Fleet child entry in the sidebar but the page is in the Settings section. |
| Critical WO sub-pages have no sidebar entry | `/work-orders/dashboard`, `/work-orders/handoff`, `/work-orders/templates`, and `/work-orders/[id]/execution` are navigable only via in-page buttons. These were partially addressed (Team 1 noted that the sidebar does now expose `/work-orders/dashboard`, `/work-orders/handoff`, etc.), but the execution Gantt, certificates, and records pages for WO sub-navigation remain inaccessible from the sidebar. |
| Personnel split | `Personnel` in the bottom nav has children for Training and Time Management, but `OJT Training` is a separate standalone bottom nav entry with no parent grouping. The two should be siblings under a single Personnel/Training top-level group. |
| Settings lacks Email Log, Notifications, Users | The Settings sidebar group only exposes 6 children: Station Config, Capabilities List, Routing Templates, Import Data, QuickBooks, Locations. Settings/Users, Settings/Notifications, and Settings/Email Log have no sidebar entry. |
| Findings has no sidebar entry | `/findings` is accessible only via navigation logic or direct URL — not in the sidebar at all. This is a significant discoverability gap for QCM inspectors. |

**Recommended sidebar reorganization:**

```
Operations (primary)
├── Dashboard
├── My Work
│   └── My Time
├── Work Orders
│   ├── Kanban
│   ├── WIP Labor Summary (was "Dashboard")
│   ├── Shift Handoff
│   └── Lead Workspace (role-gated)
├── Schedule
│   ├── Due-List Workbench
│   ├── Roster & Teams
│   ├── Quote Workspace
│   └── Seed Audit
├── Fleet
│   ├── Calendar
│   ├── Predictions
│   ├── Maintenance Programs
│   ├── Life-Limited Parts
│   └── AD/SB Tracking (replaces Compliance > AD/SB)

Compliance & Quality
├── Findings
├── Compliance
│   ├── Audit Readiness
│   ├── QCM Review
│   ├── Audit Trail
│   └── Diamond Award

Parts & Supply
├── Parts
│   ├── Receiving Inspection
│   ├── PO Receiving
│   ├── Part Requests
│   ├── Tool Crib
│   ├── Inventory Count
│   ├── Core Tracking
│   ├── Shipping
│   ├── Rotables
│   ├── Loaners
│   ├── Lots & Batches
│   ├── Warehouse Locations
│   ├── Tags
│   └── Alerts

Customer & Revenue
├── CRM
│   ├── Dashboard
│   ├── Accounts
│   ├── Contacts
│   ├── Interactions
│   ├── Sales Pipeline
│   ├── Prospect Intelligence (Part 145)
│   ├── Part 135 Operators
│   └── Analytics
├── Sales
│   ├── Dashboard
│   ├── Quotes
│   └── Sales Ops
├── Billing
│   ├── Invoices
│   ├── Customers
│   ├── AR Dashboard
│   ├── Purchase Orders
│   ├── Vendors
│   ├── Analytics
│   └── [remaining billing items]

People & Training
├── Personnel
│   ├── Time Management
│   └── Training & Certs
├── OJT Training
│   ├── Jackets
│   └── Roster

Reports (read-only reference group)
└── Reports
    ├── Financials
    ├── Forecast
    ├── Profitability
    ├── Runway
    ├── Inventory
    ├── Revenue
    └── Throughput

Settings (bottom)
└── Settings
    ├── Shop Info
    ├── Station Config
    ├── Capabilities List
    ├── Users & Access
    ├── Notifications
    ├── Routing Templates
    ├── Import Data
    ├── Integrations (QuickBooks, ADS-B)
    └── Audit Logs (Email Log)
```

### C2. Two-Click Rule Assessment

Pages reachable within 2 clicks from the sidebar:
- Dashboard, WO List, Fleet List, Parts List, Billing Invoices, CRM Dashboard, Schedule — YES (1 click)
- WO Detail, Fleet Aircraft Detail, Customer Detail — YES (2 clicks via list)

Pages that require 3+ clicks or in-page navigation only:
- WO Execution Gantt: 3 clicks (WO List → WO Detail → Execution button)
- WO Certificates: 3 clicks (WO List → WO Detail → Certificates)
- Task Card Detail: 3 clicks minimum
- Finding Detail: 4 clicks
- Training Jacket Detail: 3 clicks (OJT → Jackets → Jacket Detail)
- Career Profile: 3 clicks (Personnel → Roster → [tech] → Career tab)

The depth of the Work Order section (up to 5 navigation levels) is a particular concern for technicians who live in task card detail pages.

### C3. Orphan Pages (No Sidebar Entry)

The following routes exist in `protectedAppRoutes.tsx` but have no sidebar navigation entry:

- `/findings` — QCM-critical page with no sidebar entry
- `/work-orders/templates` — Templates are linked from the New Task Card page but not the sidebar
- `/work-orders/[id]/execution` — Execution planning Gantt
- `/work-orders/[id]/certificates` — Release certificates
- `/work-orders/[id]/records` — Maintenance records
- `/fleet/[tail]/logbook` — Aircraft logbook
- `/fleet/[tail]/adsb` — Per-aircraft ADS-B view
- `/training/ojt/roster` — OJT enrollment roster
- `/scheduling/bays` — Bay management
- `/scheduling/capacity` — Capacity planning
- `/scheduling/financial-planning` — Financial planning sub-page
- `/sales/training` — Sales training (accessible only from CRM/Sales sub-menus)
- `/settings/users` — User management
- `/settings/notifications` — Notification preferences
- `/settings/email-log` — Email log

---

## Section D: Data Consistency Issues

### D1. localStorage Used for Operational Data (CRITICAL)

| Page | Data Stored in localStorage | Compliance Impact |
|---|---|---|
| `/work-orders/[id]` | Parts requests | CRITICAL — multi-device data loss, parts traceability |
| `/work-orders/[id]/tasks/[cardId]` | Voice notes | HIGH — audit trail completeness |
| `/settings/routing-templates` | Routing templates | HIGH — templates not shared across users |
| `/dashboard` | Welcome modal shown state | LOW — acceptable UI preference |
| `/work-orders` (view mode) | View mode (list/cards/compact) | LOW — acceptable UI preference |

**Only the last two are acceptable uses of localStorage.** The first three store operational data that must be in Convex for multi-user, multi-device, and compliance-audit scenarios.

### D2. Demo/Stub Data in Production UI

| Page | Stub Pattern | Risk |
|---|---|---|
| `/billing/vendors/[id]` (Services tab) | `useState(initialDemoServices)` — hardcoded, never persists | HIGH — users believe they've saved vendor services |
| `/settings/routing-templates` | localStorage only — lost on device change | HIGH |
| `/settings/shop` (Branding section) | Color/logo pickers have no save action | MEDIUM — confusing but not destructive |
| `/settings/shop` (Operating Hours) | Read-only placeholders, no link to edit | MEDIUM |
| `/settings/adsb` | All state is local React useState, no persistence | MEDIUM |
| `/settings/shop` (Demo Apps card) | Hardcoded `localhost:3001` / `localhost:3002` links | MEDIUM — development artifact in production UI |
| `/billing/pricing` | Rules table is read-only; explicit "use backend or API" message | MEDIUM |
| `/personnel/[techId]/career` | Employment History admits "not yet captured" | LOW |

### D3. Hardcoded Financial Assumptions Shown as Live Data

| Page | Hardcoded Assumption | Risk |
|---|---|---|
| `/crm/pipeline` | Pipeline value estimated at hardcoded `$185/hr` labor rate | HIGH — users anchor on it |
| `/reports/financials/runway` | Runway calculated from parts spend only (excludes labor) | HIGH — dramatically overstated runway |
| `/reports/financials/profitability` | Margin threshold of 20% coded as "good" | MEDIUM |
| `/reports/financials/forecast` | 3-month rolling average, not configurable | MEDIUM |

### D4. Data Displayed Inconsistently Across Pages

| Data Point | Page A Display | Page B Display | Risk |
|---|---|---|---|
| Customer health score buckets | 4 buckets (CRM Analytics: Excellent/Good/At Risk/Critical) | 3 buckets (CRM Accounts filter: Excellent/Good/At Risk) | MEDIUM — filter misses "Critical" accounts |
| WO status labels | Snake_case (`in_progress`) on WO Dashboard | Human-readable labels on WO List | LOW — inconsistency across same module |
| Invoice status | ALL_CAPS (`SENT`, `APPROVED`) on Customer Portal | Sentence case elsewhere | LOW |
| Timezone display | UTC with "Z" suffix on Shift Handoff | Local time on most other pages | MEDIUM — confusing on shop floor |
| Pipeline stages | 5 stages (Prediction tab) | 6 stages (Manual tab) | MEDIUM — conflated under "Sales Pipeline" |
| Training type input | Free text on Individual Tech Training | Free text on Org-Wide Training | MEDIUM — inconsistent spell/format over time |

### D5. Non-Persisting Form Fields

| Page | Field | Status |
|---|---|---|
| `/work-orders/[id]/tasks/new` | "Estimated Hours" | Explicitly non-saving — shows warning label but still renders as form field |
| `/settings/adsb` | All configuration fields | Non-persisting — no Convex mutation |
| `/settings/shop` (Branding) | Logo upload, color pickers | Non-persisting — no save action wired |

---

## Section E: Role-Based Experience Analysis

### E1. Admin / Shop Manager

**Strengths:**
- Dashboard provides a solid command-center overview with live KPIs
- Personnel time management, WO kanban, and billing analytics are well-scoped for managerial oversight
- The Lead Center (`/lead`) provides a good multi-tab operational view

**Gaps:**
- No single "shop health" view combining compliance status, open WOs, parts shortages, and AR simultaneously
- The WO Dashboard (WIP Labor Summary) is hidden behind a button — not in the sidebar
- Pricing configuration is incomplete (`/billing/pricing` — rules are read-only)
- Scheduling page (Gantt) is overwhelming for daily oversight use — 25+ state variables, 5 concurrent panels. (Team 6: Usability 2/5)
- Financial reports exclude labor costs from profitability and runway calculations, giving shop managers inaccurate financial picture

**Role fitness score: 3.5/5**

### E2. QCM Inspector

**Strengths:**
- Compliance section (`/compliance`) has dedicated pages for audit readiness, QCM review, and audit trail
- WO Compliance tab provides a per-WO compliance readiness checklist
- Task card compliance items are well-modeled

**Gaps:**
- `/findings` page has no sidebar entry — QCM inspectors who are the primary users of this page must bookmark or navigate manually
- Finding detail page (`/work-orders/[id]/findings/[discrepancyId]`) has no disposition controls — QCMs who navigate to a finding cannot act on it from there
- The finding detail page over-fetches all org discrepancies client-side (no `getDiscrepancy(id)` query)
- Maintenance records created at `/work-orders/[id]/records` are not reflected in the Compliance tab — QCM sees incomplete compliance picture
- No secondary severity filter on the Findings page (cannot isolate "all Critical findings across all WOs")

**Role fitness score: 2.5/5** — The compliance infrastructure exists but critical pages are orphaned from navigation and cross-links are missing.

### E3. Lead Technician

**Strengths:**
- Lead Center (`/lead`) is logically sound (Team 5: Logic 5/5)
- Turnover report with AI summary is a differentiating feature
- Shift board, task feed, and WO monitor are well-organized under six tabs

**Gaps:**
- Navigating to `/lead` vs `/work-orders/lead` is confusing — two lead workspaces with overlapping scope
- Embedding the full Scheduling Roster as a tab in the Lead Center creates a scope overload
- Date picker in Lead Center is too subtle — data across all tabs silently shifts when the date changes, with no visual indicator of "viewing a non-today date"
- The Lead Center's Roster tab could be replaced with a condensed team card to reduce complexity

**Role fitness score: 3.5/5**

### E4. Technician (Shop Floor)

**Strengths:**
- My Work page is well-designed with risk-first sorting and handoff note preview
- My Time clock-in flow is the best-executed time-tracking flow in the application (Team 3: Logic 5/5)
- Task card detail is comprehensive for step sign-off

**Gaps:**
- Parts requests are localStorage-only — shop-floor use on shared tablets silently loses data
- No overdue stat card on My Work — technicians don't see urgency count at a glance
- Task card density is high (14 sub-components) — a technician in gloves on a tablet faces significant scroll and cognitive load
- No breadcrumb navigation below WO detail — technicians navigating deep get lost
- PIN entry page (`/work-orders/[id]/signature`) uses text input on mobile, forcing keyboard switch to numeric
- No role-aware view toggle on WO detail — technicians see irrelevant financial KPI cards (WIP cost, labor cost) alongside their work area

**Role fitness score: 3/5**

### E5. Parts Clerk

**Strengths:**
- Parts module is comprehensive: receiving, PO receiving, requests, tool crib, cores, inventory count, shipping, rotables, loaners, lots, warehouse locations, tags, alerts
- PO Detail is the strongest page in billing for parts-specific workflows

**Gaps:**
- Parts requests from technicians are only in localStorage — parts clerks cannot see them from any admin surface
- No automated path from an approved part request to drafting a PO
- `/parts/requests` exists but its integration with the PO workflow is manual
- Parts receiving page does not link back to the task card that originated the part request

**Role fitness score: 3/5** — Rich inventory tools, broken integration with the WO/task workflow.

### E6. Billing Manager

**Strengths:**
- Invoice list is the best-implemented page in the billing module (Usability 5/5, Logic 5/5)
- AR Dashboard provides aging bucket visibility
- PO Detail budget comparison is well-implemented

**Gaps:**
- Vendor services tab is hardcoded demo data — never persists. Billing managers who manage vendor service agreements are viewing and "saving" phantom data
- Pricing rules configuration is read-only in the UI — billing managers cannot configure markup without backend access
- No "Pay Invoice" path in the customer portal — customers cannot self-serve payment
- The Runway report dramatically overstates cash position by excluding labor costs — a serious financial planning risk
- Notification preferences are org-wide, not per-user — admin's preference changes affect all billing users

**Role fitness score: 3/5** — Strong invoice management, incomplete pricing control, misleading financial reporting.

### E7. Customer (Portal)

**Strengths:**
- Customer portal is the most polished section in the codebase
- Portal sign-in, dashboard, work order tracker, and quote approval are production-quality
- Per-line-item quote approval/decline is a differentiating feature

**Gaps:**
- No online payment path for invoices — customers see what they owe but cannot pay in-portal
- Portal is hardcoded to light mode (uses `text-gray-*` throughout, not semantic tokens)
- Messages page is mislabeled — it is a one-way ticket submission system, not messaging
- "No customer account linked" state gives no actionable guidance
- Quote list has no status filter to surface "pending approval" items urgently
- Customer portal 404 would show the internal app's not-found page with staff navigation links

**Role fitness score: 4/5** — Best role fit in the application; the gaps are incremental rather than structural.

---

## Section F: Priority-Ranked Recommendations

### P0 — Critical: Data Integrity, Compliance, or Blocking Workflow Issues

These issues create compliance risk, data loss, or completely broken workflows. They should be addressed before any further feature development.

| ID | Issue | Source | Impact |
|---|---|---|---|
| P0-01 | **Migrate parts requests from localStorage to Convex.** A technician's part request on a task card is device-specific and not visible to parts clerks or billing on other devices. This is a regulatory traceability failure. | Team 1 | Parts lifecycle broken for multi-device use |
| P0-02 | **Wire vendor services tab to Convex backend.** `/billing/vendors/[id]` Services tab uses `useState(initialDemoServices)` — data is hardcoded demo data that never persists. Backend mutations `createVendorService`/`updateVendorService`/`listVendorServices` are already written. | Team 4 | Users believe they are saving vendor service agreements |
| P0-03 | **Add a `getDiscrepancy(discrepancyId)` backend query.** The finding detail page currently fetches all org discrepancies and filters client-side. On orgs with hundreds of discrepancies this is a significant data over-fetch and a compliance page performance risk. | Team 1 | Data over-fetch, potential compliance page timeouts |
| P0-04 | **Add dispositioning controls to the finding detail page or a clear link to where disposition happens.** QCM inspectors navigating to a finding detail cannot take regulatory action from that page. | Team 1 | QCM workflow dead-end |
| P0-05 | **Add prominent disclaimer to `/reports/financials/runway`.** Runway is calculated from parts spend only, excluding labor and overhead — the largest costs for an MRO operation. A shop manager seeing "18 months of runway" when labor-adjusted runway is 4 months is a critical financial planning risk. | Team 6 | Misleading financial decision-making |
| P0-06 | **Remove or gate the Demo Apps card from `/settings/shop`.** The card with hardcoded `localhost:3001`/`localhost:3002` links is a development artifact that must never reach production users. | Team 7 | Trust erosion and user confusion |
| P0-07 | **Fix the inverted switch logic in Station Config Scheduling tab.** `checked={!day.isOpen}` causes the toggle to be ON when the day is closed. Inverted boolean logic in production UI. | Team 7 | Administrators set wrong operating hours |
| P0-08 | **Migrate routing templates from localStorage to Convex.** Templates in `/settings/routing-templates` are device-specific and not visible to other team members. The "Apply Template to WO" button stubs with a `toast.info("coming soon")` — the primary use case is unimplemented. | Team 7 | Templates cannot be used for their purpose; not shared |
| P0-09 | **Add `flex-wrap` to the `<TabsList>` on `/personnel/training`.** The 11-tab training page overflows horizontally on standard 1440px displays with no scrolling mechanism, making most tabs inaccessible. This is a layout bug, not a design preference. | Team 3 | Critical training administration pages are unreachable |

### P1 — High: Major Usability Problems Affecting Daily Work

| ID | Issue | Source | Impact |
|---|---|---|---|
| P1-01 | **Redesign the personnel training page.** 11 tabs spanning training records, compliance, OKR analytics, scheduling constraints, run/taxi quals, and trainer records in a single page serves no single user well. Maximum 5 tabs; split analytics to a dedicated analytics sub-section. | Team 3 | Training managers cannot administer efficiently |
| P1-02 | **Add a `Findings` sidebar entry.** `/findings` is QCM-critical but has no sidebar entry. QCM inspectors are the primary users of this page. | Team 5 | QCM role-critical page is orphaned |
| P1-03 | **Add breadcrumb navigation to WO sub-pages.** The WO section creates 3–4 navigation levels (Work Orders → WO Detail → Task Card → Step/Finding) with no breadcrumbs anywhere in the path. Technicians on deep pages have no spatial awareness. | Team 1 | Navigation confusion on shop floor |
| P1-04 | **Separate or clearly differentiate the two Lead Workspaces.** `/lead` (Lead Center) and `/work-orders/lead` (Lead Workspace) serve overlapping audiences with different scope. Either consolidate or clearly differentiate their purpose in the navigation and page headers. | Teams 1, 5 | Lead technicians don't know which tool to use |
| P1-05 | **Add positive confirmation states to the WO completion flow.** When a WO is ready to close, show a green "All checks passed" banner. When all task card steps are complete, show a "Ready to sign card" prompt. When RTS checklist passes, show a "Proceed to Sign-Off" CTA. | Team 1 | Safety-critical workflow has no positive confirmation |
| P1-06 | **Fix career profile A&P/IA detection.** Replace text substring heuristics with dedicated structured fields (`ampCertificateNumber`, `iaCertificateNumber`, `ampExpiry`, `iaExpiry`) on the technician schema. An FAA auditor cannot rely on inferred certification status. | Team 3 | Compliance audit reliability |
| P1-07 | **Establish a canonical Account view merging CRM and Billing.** The "Edit in Billing" button pattern and dual-module customer management creates a broken mental model. Begin by removing cross-module routing for core account edits and enabling inline editing of base fields from the CRM account view. | Team 5 | Customer lifecycle management friction |
| P1-08 | **Add `usePagePrereqs` guards to financial report sub-pages.** `/reports/financials`, `/reports/financials/forecast`, `/reports/financials/profitability`, `/reports/financials/runway` lack loading state guards — they render with undefined data before Convex resolves. | Team 6 | Financial report rendering instability |
| P1-09 | **Replace raw status values with human-readable labels on WO Dashboard.** The WIP Labor Summary page shows raw snake_case status values (e.g., `in_progress`) instead of using the `WO_STATUS_LABEL` lookups already available in the codebase. | Team 1 | Non-technical users cannot read the dashboard |
| P1-10 | **Add `alertdialog` confirmation to the aircraft release action.** Releasing aircraft to the customer is irreversible but has no confirmation dialog. Minimum: confirm dialog; better: require typing the aircraft registration. | Team 1 | Irreversible action with no ceremony |
| P1-11 | **Increase offline data stale warning prominence on Dashboard.** The "Showing cached offline snapshot" notice is rendered at 10px text below the subtitle. In an MRO context, stale data driving maintenance decisions is a safety concern — it should be an amber banner at page top. | Team 1 | Safety-relevant stale data may be missed |
| P1-12 | **Implement multi-step onboarding wizard.** The single-form onboarding page creates organizations without FAA certificate numbers, primary location, or staff configuration. New operators are sent to `/dashboard?setup=complete` with no guidance on the 10+ required follow-up steps. | Team 7 | New customers cannot properly configure their account |
| P1-13 | **Redesign scheduling page complexity.** The `/scheduling` Gantt page manages 25+ distinct state variables with no workspace management (no "reset layout" or "close all panels"). Rated 2/5 Usability by Team 6. This is the primary planning tool for shop managers. | Team 6 | Shop managers cannot effectively plan work |
| P1-14 | **Add delete confirmation to curriculum section/task deletion.** Deleting a section with 20 tasks in the OJT curriculum editor destroys all of them instantly with no undo. For a Part 145 approved training program, accidental deletion creates compliance gaps. | Team 3 | Permanent data loss on compliance-critical records |

### P2 — Medium: Navigation, Consolidation, and UX Polish

| ID | Issue | Source | Impact |
|---|---|---|---|
| P2-01 | **Consolidate `/settings/locations` and `/settings/station-config` Facilities tab.** Both pages manage the same `shopLocations` table with near-identical form code. Redirect `/settings/locations` to the Station Config page with the Facilities tab pre-selected. | Team 7 | Duplicate management UI causes confusion |
| P2-02 | **Add `Findings` to the sidebar nav** (as detailed in P1-02) and add secondary severity filter (Critical/Major/Minor/Observation) to the findings page. | Team 5 | QCM usability |
| P2-03 | **Add "Load inspection template" selector to the New WO form.** A shop manager creating a recurring inspection should be able to pre-populate task cards from a template at WO creation time, not after. | Team 1 | Reduces task card setup friction for repeat work |
| P2-04 | **Separate Prediction Pipeline from Manual Pipeline on the Sales Pipeline page.** Two fundamentally different data sources and stage vocabularies should not be co-equal tabs with asymmetric KPI cards. | Team 5 | Conceptual confusion for sales users |
| P2-05 | **Fix back navigation on Finding Detail.** The back button navigates to the WO list page, not to the task card that originated the finding. After raising a finding, a technician's scroll position on the task card is lost. | Team 1 | Technician workflow disruption |
| P2-06 | **Add orienting explanations to prospect intelligence pages.** The Part 145 and Part 135 intelligence pages are near-identical in structure; the strategic distinction (competing shops vs. potential customers) is not surfaced anywhere in the UI. | Team 5 | New users cannot use these pages productively |
| P2-07 | **Add "Showing X of Y" count to all truncated lists.** Several pages silently truncate results (Shift Handoff capped at 75 notes, Runway capped at 3-month window, Portal fleet at 5 aircraft). Users have no indication data is being hidden. | Teams 1, 7 | Users make decisions on incomplete views |
| P2-08 | **Standardize tab counts across the application.** Cap at 5 visible tabs with overflow into a "More" dropdown. Specifically: WO Detail (7→5), CRM Account Detail (7→5), Personnel Training (11→5), `/crm/pipeline` (2 co-equal tabs → separated pages). | Teams 1, 4, 5 | Tab overflow breaks on medium screens |
| P2-09 | **Add "Promote to Customer" post-conversion link.** After promoting a prospect to a customer, navigate to or show a link to the new CRM account record. | Team 5 | Conversion flow drops context |
| P2-10 | **Add "Create Quote" pre-population.** When "Create Quote" is triggered from a CRM account detail page, pre-populate the customer ID in the quote form. | Team 5 | Re-entry tax on common workflow |
| P2-11 | **Fix duplicate navigation entries in sidebar.** Remove duplicate "Prospect Intelligence" and "Sales Training" entries that appear under both Sales and CRM sidebar groups. | AppSidebar analysis | Navigation confusion |
| P2-12 | **Add an "Overdue" stat card to My Work.** Technicians should see their urgent item count at a glance without scrolling the card list. | Team 3 | Risk visibility for shop-floor users |
| P2-13 | **Add edit and deactivate actions to WO templates list.** Templates with typos must be deleted and recreated from scratch — there is no edit action on the template list page. | Team 1 | Maintenance friction on compliance templates |
| P2-14 | **Make the "Complete" Kanban column visually distinct.** The read-only "Complete" column looks identical to actionable columns; users inevitably drag WOs into it and receive an error toast. A grayed-out locked column with a tooltip prevents this. | Team 1 | Drag interaction confusion |
| P2-15 | **Add search/filter to vendor list.** No search on the vendor list; parts, service, and consumables vendors are mixed together with no type filter. | Team 4 | Parts clerks cannot efficiently find approved vendors |
| P2-16 | **Add column "last activity" and "progress %" to the OJT Jackets list.** Training managers cannot identify stale or near-complete jackets from the list view without clicking into each one. | Team 3 | Training management overhead |
| P2-17 | **Add duplicate check when assigning OJT jackets.** A technician can be assigned the same curriculum twice with no warning. | Team 3 | Data integrity in training records |
| P2-18 | **Add date-range filter to the Interactions Log.** The cross-account interaction timeline has no date scoping — orgs with high interaction volume face scroll-intensive experience. | Team 5 | CRM usability for active sales teams |
| P2-19 | **Rename "Enhanced generation" invoice toggle.** The term is jargon; replace with "Auto-populate from work order labor and parts." | Team 4 | Billing manager discoverability |
| P2-20 | **Make the scheduling page date picker visually prominent.** A small date input that changes data across all tabs simultaneously in the Lead Center should have a large label ("Viewing shift for:") and visual indicator when a non-today date is selected. | Team 5 | Stale data viewed as current data |

### P3 — Low: Nice-to-Have Improvements

| ID | Issue | Source |
|---|---|---|
| P3-01 | Add persistent filter state (URL query params) on WO List, CRM Accounts, and other filtered lists so browser Back restores the user's filter state. | Teams 1, 5 |
| P3-02 | Add `inputMode="numeric"` to the PIN entry input for mobile numeric keypad auto-display. | Team 1 |
| P3-03 | Add a loading state to the RTS PDF download button (disable after click, show spinner) to prevent duplicate PDF generation. | Team 1 |
| P3-04 | Standardize page padding/layout conventions. Several pages use `p-6` or `p-4` as a top-level wrapper while the rest use `space-y-*` — produces inconsistent margins across the app. | Team 1 |
| P3-05 | Convert portal `text-gray-*` classes to semantic tokens for dark mode support. The customer portal is hardcoded to light mode. | Team 7 |
| P3-06 | Reorder clock-in entry types to "Work Order" first, "Work Card" second — most common actions should be first. | Team 3 |
| P3-07 | Add a "Reply" affordance to the portal Messages page — currently one-way ticket submission with no threading. | Team 7 |
| P3-08 | Add "Pay Online" button placeholder to the portal invoices page — at minimum stub it with "Coming soon: online payment." | Team 7 |
| P3-09 | Add period-over-period delta indicators to KPI cards in billing analytics and CRM analytics. | Teams 4, 5 |
| P3-10 | Reconcile `AVIATION_TIMEZONES` constant (duplicated in 5+ files with different option counts) into a single `@/lib/timezones.ts` export. | Team 7 |
| P3-11 | Rename "Truncated" view mode to "Compact" in WO List and Fleet List — "Truncated" is an internal engineering term, not user-facing language. | Teams 1, 2 |
| P3-12 | Add a "How is this calculated?" disclosure card for health score algorithm in CRM Analytics — currently embedded as a data peer to actual metrics. | Team 5 |
| P3-13 | Add expiry countdown badges to pending-approval quotes in the customer portal ("Expires in 3 days"). | Team 7 |
| P3-14 | Add a visible legend to the ATA Chapter Heatmap on the career profile page. The column meanings (observe/assist/supervised/evaluated) are undocumented. | Team 3 |
| P3-15 | Extract `AVIATION_TIMEZONES` from `onboarding/page.tsx` and `settings/shop/page.tsx` into a shared constant. Onboarding has 8 options; Shop Settings has 18. | Team 7 |
| P3-16 | Add "Showing X of Y notes" indicator to the Shift Handoff Dashboard when results are truncated at 75. | Team 1 |
| P3-17 | Rename the `/work-orders/dashboard` page to "WIP Labor Summary" (or similar) and add it to the sidebar — the name collision with the main Dashboard is confusing. | Team 1 |
| P3-18 | Add a scoring methodology note to the OJT Jacket Scoring tab: "Score = columns signed / max possible. Scores above 80% indicate readiness for independent work." | Team 3 |
| P3-19 | Add `aria-label` attributes to per-line-item quote decision buttons (`✓` / `✗`) in the customer portal for accessibility compliance. | Team 7 |
| P3-20 | Move the `CapabilitiesListPrint` component to a collapsible section — it currently renders as the first element on the page, requiring scroll to reach the edit form. | Team 7 |

---

## Section G: Cross-Cutting Architectural Recommendations

Beyond the page-level priority list, three architectural patterns require cross-team coordination:

### G1. Entity Ownership Model
The app currently has no canonical definition of which module "owns" a customer record. CRM, Billing, and the Customer Portal all read/write from the `customers` table but expose different subsets of fields through different UIs. **Recommendation:** Define CRM as the owner of customer identity and relationship fields; Billing as the owner of invoicing and payment fields. Add a single `AccountDetailPage` that presents both field groups in separated tab groups, replacing the current split. The existing `/billing/customers/[id]` and `/crm/accounts/[id]` can both redirect to this unified view.

### G2. Data Persistence Audit
Conduct a codebase-wide audit of all `localStorage.getItem`/`localStorage.setItem` usage. Tag each use as either (a) acceptable UI preference storage or (b) operational data that requires database migration. Estimated scope: 5–8 stores beyond those identified in this review. The parts request store at the WO detail level is the highest priority.

### G3. Financial Reporting Data Sources
The Reports module (`/reports/financials/*`) and the Scheduling module's financial panels (`DailyFinancialTracker`, `CapacityForecaster`) both show financial projections using different data sources and methodologies. **Recommendation:** Establish a clear labeling standard — all financial displays should carry a one-line "Data source:" footnote indicating whether the figure is from (a) paid billing records, (b) open invoice projections, (c) schedule-based capacity modeling, or (d) manual budget entry. Without this, shop managers and owners will conflate real and projected numbers.

---

## Appendix: Team Evaluation Cross-Reference

| Evaluation File | Module(s) | Page Count | Avg Usability | Avg Logic |
|---|---|---|---|---|
| `ux-eval-team1-dashboard-workorders.md` | Dashboard, Work Orders | 18 | 3.4/5 | 3.7/5 |
| `ux-eval-team2-fleet-parts.md` | Fleet, Parts | 25 | 3.3/5 | 3.9/5 |
| `ux-eval-team3-personnel-training.md` | Personnel, Training/OJT, My Work | 12 | 3.4/5 | 3.9/5 |
| `ux-eval-team4-billing-sales.md` | Billing, Sales, Quote Workspace | 32 | 3.6/5 | 4.1/5 |
| `ux-eval-team5-crm-lead-findings.md` | CRM, Lead, Findings | 11 | 3.5/5 | 3.9/5 |
| `ux-eval-team6-scheduling-compliance-reports.md` | Scheduling, Compliance, Reports | 22 | 3.1/5 | 3.8/5 |
| `ux-eval-team7-settings-auth-portal.md` | Settings, Auth, Portal, Onboarding | 22 | 3.4/5 | 4.0/5 |
| **Total** | **All modules** | **~142** | **3.4/5** | **3.9/5** |

**Pattern:** Logic consistently scores ~0.5 higher than Usability across all teams. The domain model and data architecture are generally sound; the UX execution (discoverability, navigation, feedback, consistency) lags behind.

---

*This review synthesizes input from 7 parallel evaluation teams and represents a system-level perspective only. Page-level detail is available in the individual evaluation files. Recommendations are prioritized by operational impact; sequencing should be determined by the development team in consultation with the user research backlog.*
