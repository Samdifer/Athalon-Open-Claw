# UX Evaluation: Scheduling, Compliance, and Reports
**Evaluator:** Team 6 — Scheduling / Compliance / Reports
**Date:** 2026-03-12
**Scope:** 22 pages across three feature sections

---

## Scheduling Section

---

### `/scheduling` — Gantt Scheduling Board
**File:** `app/(app)/scheduling/page.tsx`
**Usability:** 2/5 | **Logic:** 4/5
**Summary:** Architecturally sound scheduler with sound data modeling but the interaction surface is overwhelming — too many modes, panels, and floating controls compete for attention simultaneously.

**Issues:**
- The page manages approximately 25+ distinct `useState` variables at the top level (backlog open, graveyard open, command center open, quote workspace open, onboarding open, magic selection mode, magic running, schedule edit mode, schedule edit tool, analytics open, analytics popout, P&L open, P&L popout, roster open, roster popout, active snapshot, show bay allocation, plus three resize state objects). This state explosion means the page can be in dozens of meaningfully different visual states with no single indicator of "what mode am I in."
- Three optional side panels (BacklogSidebar, GraveyardSidebar, SchedulingRosterPanel) can all be open simultaneously. Combined with the bottom P&L panel and Analytics panel (each independently poppable into draggable floating windows), a shop manager working a 1440p monitor could have five separate content areas active at once. There is no workspace management — no "close all panels" or "reset layout" affordance.
- The toolbar has two tiers of icon-only buttons (no labels visible by default). Icon-only toolbars require tooltips to be discoverable; it is not clear from the code whether all icons have tooltip coverage. A new scheduler user cannot scan the toolbar and understand what each control does.
- "Magic Scheduler" and "Schedule Edit Mode" are mutually exclusive modes that each hide/show different sub-controls when active. Switching between them requires understanding that they are modal — there is no prominent mode indicator (no highlighted header bar, no "you are in X mode" banner visible in the JSX).
- The `DEFAULT_TIMELINE_DAYS = 120` view starts 30 days in the past. A first-time user opens the scheduler and sees the Gantt positioned at a point 30 days ago, not today. There is a "Today" scroll button but its discoverability depends on the user noticing it in the toolbar.
- The onboarding system (localStorage-backed `SchedulingOnboardingRecord`) is version-keyed and triggers via `seenAt` / `skippedAt` / `completedAt` — but the onboarding panel is opened via `setOnboardingSetupOpen` which is never set to `true` in the visible code excerpt. The trigger logic is unclear, meaning first-run users may see no onboarding guidance at all.
- `GanttChart.tsx` is a deprecated shim that still appears in the codebase with a `console.warn`. If any path still renders it, users would see an amber warning panel with no functionality. The file should be removed entirely or the legacy import path eliminated.

**Recommendations:**
- Collapse the mode/panel state into a single discriminated union: `type SchedulerMode = "view" | "edit_distribute" | "edit_block" | "magic_selection"`. Display the active mode prominently in the toolbar (e.g., a highlighted pill reading "EDIT MODE — Distribute" with an Escape-to-exit hint).
- Limit simultaneous open panels: backlog OR graveyard can be open, not both. Roster panel should be mutually exclusive with backlog/graveyard. Provide a "Close all panels" button.
- Add labels (not just icons) to all primary toolbar buttons, or at minimum implement a consistent tooltip system. Evaluate the toolbar for grouping: "view controls | filters | mode toggles | actions" with visual separators.
- Position the initial timeline scroll to today by default. The 30-day lookback should be preserved but the viewport should open centered on today.
- Add a persistent "N unscheduled" and "N conflicts" status bar at the bottom of the board so the scheduler always has situational awareness without opening the command center dialog.

---

### `/scheduling/bays` — Hangar Bays Management
**File:** `app/(app)/scheduling/bays/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Clean, well-structured page. Card grid with status badges is readable and the modal form + detail slide-in panel pattern is appropriate for this data type.

**Issues:**
- The sub-navigation bar (Gantt Board / Bays / Capacity / Roster / Financial Planning / Quote Workspace) is duplicated across every scheduling sub-page as inline JSX. There is no shared `SchedulingSubNav` component, meaning a nav change requires editing six files. This is a maintainability issue that eventually becomes a usability issue when pages diverge.
- The bay card shows "type · capacity N" as a single text line (e.g., "hangar · capacity 2"). "Capacity" here means number of aircraft, but this is not stated. A first-time user might interpret it as square footage or personnel slots.
- The detail panel uses `fixed top-12 right-0` positioning. On mobile, this covers the entire screen without a backdrop or overlay dimming, creating an ambiguous modal-versus-inline pattern.
- There is no bulk action (e.g., set multiple bays to "maintenance" during a planned closure). This may be acceptable for small shops but becomes painful for multi-bay facilities.
- "Release Bay" is a destructive action (clears the current WO assignment) with no confirmation prompt. Accidental clicks would silently de-assign work.

**Recommendations:**
- Extract the sub-nav into a shared `SchedulingSubNav` component.
- Label capacity as "Aircraft capacity: N" for clarity.
- Add a confirmation dialog to "Release Bay" with the current WO number displayed: "Release Bay 3 from WO-1042?"
- On mobile, the detail panel should use a bottom sheet pattern or a full-screen modal rather than a fixed right-side panel.

---

### `/scheduling/capacity` — Capacity Planning
**File:** `app/(app)/scheduling/capacity/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Solid capacity overview but the "Capacity Defaults" settings form embedded directly in the page creates cognitive confusion — is this a read page or a configuration page?

**Issues:**
- The page serves two distinct purposes: (1) monitoring load vs. capacity and (2) configuring default shift assumptions. These should be separated. A shop manager landing here during a busy shift wants to see utilization numbers, not a form asking for "Default Efficiency Multiplier."
- The four stat cards (Available, Planned Load, Utilization, Peak Day) use `BatteryCharging` icons for two of the four cards. The "Utilization" card reuses the same `Gauge` icon as "Planned Load." Distinct metrics should have visually distinct iconography.
- The "Adjust Shifts" button in the header links to `/personnel`, which is a different top-level section. This cross-section jump is not prefaced by any explanation — a user clicking "Adjust Shifts" on the Capacity page and landing on a personnel roster may be disoriented.
- Capacity settings (buffer %, start/end hours, efficiency) duplicate settings that are also editable via the Command Center dialog on the main Gantt page. Two entry points to the same configuration with no indication of duplication creates confusion about which is authoritative.
- The `CapacityForecaster` component is always open (`forecasterOpen` starts `true`), taking significant vertical space. There is a toggle, but the default-open state means the page starts with the chart occupying most of the viewport before the user sees the summary cards.

**Recommendations:**
- Move the "Capacity Defaults" settings card to `/scheduling/capacity/settings` or into the Command Center dialog on the Gantt board. The capacity page should be read-only monitoring.
- Make the summary stat cards scroll into view first; place the forecaster timeline below the fold.
- Add a tooltip or brief description to the "Adjust Shifts" link: "Edit technician shift hours on the Personnel page."
- Use distinct icons for each of the four stat cards (e.g., `Layers` for load, `Gauge` for utilization, `TrendingUp` for peak).

---

### `/scheduling/roster` — Roster and Teams Workspace
**File:** `app/(app)/scheduling/roster/page.tsx` + `_components/roster/SchedulingRosterWorkspace.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** The five-tab roster workspace (Roster, Teams, Shifts, Holidays, Analysis) is functionally comprehensive but overlaps heavily with the `/personnel` section of the app, creating a split-brain problem for users.

**Issues:**
- There are two "roster" surfaces in the app: `/scheduling/roster` (shift-focused, scheduling context) and `/personnel` (HR-focused, training/certs context). A shop manager who needs to see technician availability must know which roster page has the data they need. The mental model is: "go to Scheduling for shift planning, Personnel for credentials" — but this distinction is not communicated anywhere in either section.
- The `SchedulingRosterWorkspace` component is also embedded as a dock panel within the main Gantt board page (via `SchedulingRosterPanel` / `SchedulingRosterDockPreview`). The same workspace exists as a standalone page AND as a collapsible side panel on the Gantt board, with no indication of this relationship. A scheduler who configures teams in the side panel may not realize `/scheduling/roster` is the same tool with more screen real estate.
- The `RosterAnalysisTab` exists alongside `CapacityForecaster` on the capacity page. Both provide utilization analysis views. The relationship between these two analysis surfaces is not explained.
- The roster workspace uses a `focusDateMs` prop that links it to the Gantt timeline position, but when accessed as a standalone page (`/scheduling/roster`), the focus date is `undefined` and defaults to today. This is correct behavior but the page shows no indication of what date context it is analyzing.

**Recommendations:**
- Add a visible information callout at the top of `/scheduling/roster`: "This roster tracks shift assignments and team structure for scheduling. For training records and certifications, see Personnel."
- Consider consolidating the dock panel on the Gantt board and the standalone roster page into a single entry point, with the Gantt offering a "full screen" link rather than an embedded duplicate.
- Add a date picker or "analyzing week of: [date]" indicator to the standalone roster page.
- Rename the Analysis tab to "Workload Analysis" to distinguish it from the Capacity Forecaster's utilization view.

---

### `/scheduling/financial-planning` — Planning Financials
**File:** `app/(app)/scheduling/financial-planning/page.tsx`
**Usability:** 4/5 | **Logic:** 3/5
**Summary:** Clean, readable page with a good three-card summary + assumptions form pattern. The placement within Scheduling raises a logical concern.

**Issues:**
- "Planning Financials" lives under Scheduling, while actual financial reporting lives under Reports. The distinction — "planning assumptions vs. historical actuals" — is logical in principle but is never stated on the page. A billing manager landing here from the sidebar would see a `$125/hr` shop rate field and wonder if this is the system of record for billing.
- The `Planner v2` badge in the header corner is an internal version marker that should not be visible to end users. It creates confusion ("is there a Planner v1 I should know about?").
- The three summary cards only show Projected Revenue and Projected Profit. There is no Projected Labor Cost card despite this being a computed value already available in `projection.projectedLaborCost`. A billing manager reviewing the P&L needs all three numbers at the top level.
- The "Computed Monthly Overhead" field is read-only (shown as a styled div, not an input). This is the correct approach, but it would benefit from a small formula explanation ("Fixed + Variable + CAPEX/12") to help users understand why the number is what it is.
- There is no link from this page to the Reports section. A user who configures planning assumptions here may not know where to see the resulting impact on the Reports financial dashboard.

**Recommendations:**
- Add a brief callout at the top: "These assumptions drive the Gantt board P&L tracker. For billing history and revenue reports, see the Reports section."
- Remove the `Planner v2` badge.
- Add a Projected Labor Cost stat card alongside Revenue and Profit.
- Add a "View Reports" link in the page header or footer.

---

### `/scheduling/quotes` — Quote Workspace
**File:** `app/(app)/scheduling/quotes/page.tsx`
**Usability:** N/A (shell redirect) | **Logic:** 3/5
**Summary:** This page is a single-line wrapper that renders `<QuoteWorkspaceShell surface="scheduling" />`. The page itself has no evaluable layout. The placement concern is architectural.

**Issues:**
- The Quote Workspace is also accessible from the main Gantt board via a dialog (`SchedulingQuoteWorkspaceDialog`). Having a standalone page at `/scheduling/quotes` AND a modal version within the Gantt board creates two paths to quote management with no indication of which to use.
- A "Quote Workspace" page under Scheduling is not obviously discoverable to a billing manager, who would expect quotes under Billing or CRM.
- The sub-navigation on the Bays, Capacity, Roster, and Financial Planning pages includes "Quote Workspace" as a nav item, but the main Gantt board page does not include this sub-nav (it uses a toolbar button instead), creating inconsistency.

**Recommendations:**
- Make a deliberate choice: is the quote workspace primarily a scheduling tool or a billing tool? If both, it should cross-link from both surfaces with a single canonical URL.
- Ensure the sub-nav on the Gantt board page includes the same "Quote Workspace" link as the other sub-pages (currently it uses a toolbar icon button only).

---

### `/scheduling/due-list` — Due-List Planning Workbench
**File:** `app/(app)/scheduling/due-list/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** Excellent planning tool with a clear workflow: review due items grouped by urgency, select items, pick a month, generate draft work orders. The logic flow is intuitive for a shop manager or planner.

**Issues:**
- The page has no sub-navigation connecting it to the rest of the scheduling section. Every other scheduling sub-page has the "Gantt Board / Bays / Capacity / Roster / Financial Planning" nav bar — the due-list page does not. A user who navigates here via the sidebar has no breadcrumb back to the rest of Scheduling without using the sidebar again.
- The empty state ("Due-list workbench is clear") suggests the user should "Expand horizon or verify maintenance intervals." The action button reads "Set 180-day horizon" which is good, but there is no guidance on where to verify/add maintenance intervals. A link to the Fleet or Compliance section would be helpful.
- The "Recurring projection" badges show "Next: [date]" and "Run N: [date]". "Run" is an unusual term here — "Occurrence 2" or "Next: ... After next: ..." would be clearer.
- Selection state is lost on page refresh (it is not persisted to URL or localStorage). Selecting 15 items and then accidentally clicking a browser shortcut clears all selections.

**Recommendations:**
- Add the standard scheduling sub-navigation bar to this page.
- Add a "Verify intervals in Fleet" link next to the "verify maintenance intervals" text in the empty state.
- Rename "Run N" to "Occurrence N" or use a relative label like "Next occurrence / +2 months."
- Consider persisting selection state to the URL as a comma-separated `?selected=key1,key2` parameter for shareability.

---

### `/scheduling/seed-audit` — Repair Station Seed Audit
**File:** `app/(app)/scheduling/seed-audit/page.tsx`
**Usability:** 1/5 | **Logic:** 1/5
**Summary:** This page is a developer/QA tool that has been exposed to end users. It checks whether seeded King Air/TBM scenario data matches hardcoded counts ("20 tools per location", "15 scheduled WOs per location"). It has no business value for a shop manager, scheduler, or compliance officer.

**Issues:**
- The page description says "Deterministic King Air/TBM scenario coverage and Scheduler parity gap tracking." This is test fixture verification, not a production feature. An end user landing here from the Scheduling sidebar would see pass/fail counts for fictional aircraft scenario data and have no idea what they mean.
- The hardcoded counts in `PARTS_CONTRACT` (e.g., `consumables_hardware: 18`) are test expectations, not configurable business rules. They are baked into the page component with no explanation.
- The "Gap ID" labels in the top gaps section (from `api.seedAudit.getSchedulerParityGaps`) are internal test identifiers. They would be meaningless to a shop manager.
- The page exists under `/scheduling` but is not linked from the scheduling sub-navigation, meaning it is only reachable via the sidebar. This is appropriate for an internal tool but the sidebar should not expose it to non-developer roles.
- There is no RBAC guard — any authenticated user can reach this page.

**Recommendations:**
- Remove this page from the production sidebar. It should be accessible only to `admin` role users, or hidden behind a developer mode toggle (e.g., `?dev=1` query parameter).
- If this page must remain, add a clearly visible "Developer tool — not for operational use" banner at the top.
- Gate with `role === "admin"` RBAC check before rendering any content.

---

## Compliance Section

---

### `/compliance` — Compliance Dashboard (AD Compliance Hub)
**File:** `app/(app)/compliance/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Well-structured hub page with a clear hierarchy: fleet stats, regulatory notice, per-aircraft AD status, and a Compliance Tools section linking to sub-pages. Cross-navigation has been thoughtfully constructed.

**Issues:**
- The page title is "AD Compliance" but the section is called "Repair Station Compliance" in the sidebar (per the CLAUDE.md notes). There is a naming inconsistency: the hub page's `<h1>` says "AD Compliance," which undersells the breadth of the compliance section (which also covers QCM review, audit readiness, training, and Diamond Award tracking).
- The Compliance Tools grid shows 6 cards in a 2-column layout. The two newly added cards ("Audit Readiness" and "Diamond Award Tracking") are at the bottom, creating a 3-row grid where the most important compliance workflows (QCM Review, Audit Readiness) are separated. A compliance officer scanning the page sees "Audit Trail" and "AD/SB Tracking" at top, "QCM Review" and "Fleet Management" in the middle, and the two critical pre-audit tools at the bottom.
- `CapabilitiesOverview` is rendered between `FleetComplianceStats` and the regulatory notice, but it receives no section heading in the parent page. The `FleetComplianceStats` has its own section, but the capabilities overview appears to float between sections without a title or explanation.
- Each `AircraftComplianceCard` fires its own Convex query for `checkAdDueForAircraft`. For a 10-aircraft fleet, this is 10 concurrent subscriptions on page load. The Audit Trail page addressed this with `fleetAdSummary` preloading (BH-QCM-004) — the same optimization should apply here.

**Recommendations:**
- Rename the `<h1>` from "AD Compliance" to "Compliance Overview" or "Repair Station Compliance" to match the sidebar label and reflect the full scope of the section.
- Reorder the Compliance Tools grid: (1) QCM Review, (2) Audit Readiness, (3) Audit Trail, (4) AD/SB Tracking, (5) Diamond Award, (6) Fleet Management — highest-urgency workflows first.
- Add a section heading ("Compliance Tools") above the tools grid so the CapabilitiesOverview and the fleet list each have clear section boundaries.
- Apply the `fleetAdSummary` preload optimization to avoid N per-aircraft queries on page load.

---

### `/compliance/qcm-review` — QCM Review Dashboard
**File:** `app/(app)/compliance/qcm-review/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** Strong operational page with clear logic: IA Sign-Off Queue (pending steps) + Work Order Close Readiness panel. Many usability edge cases have been thoughtfully addressed (auto-select single pending WO, sort pending_signoff to top, exclude drafts).

**Issues:**
- The page loads all work orders (paginating until exhausted) to populate the Close Readiness selector. For a shop with hundreds of WOs this is a heavy load. The page correctly handles this with auto-load pagination, but there is no loading indicator in the selector itself while additional pages are loading — the dropdown may appear complete while more WOs are still incoming.
- The IA Sign-Off Queue table uses a fixed 7-column grid with `min-w-[700px]`. On screens narrower than 700px this creates a horizontal scroll inside the card. The columns are: WO #, Aircraft, Work Card, Step, Description, Status, Action. "WO #" and "Aircraft" are redundant at the group level (both are shown in the card header). Removing them from the row would reduce the column count and improve mobile usability.
- There is no search or filter in the IA queue. A shop with 50+ pending IA steps has no way to filter by aircraft, technician, or task card without scrolling through all groups.
- The "Create Work Order" action in the empty state for the IA queue is an odd choice — if there are no IA-pending steps, creating a new WO does not help. A more appropriate empty state action would be "View Active Work Orders" to check if any are ready to advance.

**Recommendations:**
- Add a column count badge or "Showing N of M" indicator in the WO selector while pages are loading.
- Remove "WO #" and "Aircraft" columns from the individual step rows (they repeat the group header). Add a "Task Card" or "Part" column if space allows.
- Add a search input above the IA queue to filter by WO number, aircraft registration, or task card number.
- Change the IA queue empty state primary action from "Create Work Order" to "View All Work Orders."

---

### `/compliance/audit-trail` — AD Compliance Audit
**File:** `app/(app)/compliance/audit-trail/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Well-designed master-detail layout. Fleet overview panel (non-compliant first) + aircraft selector + drill-in detail panel is a logical and efficient pattern for AD compliance review.

**Issues:**
- The page has two selection mechanisms for the same thing: (1) clicking a row in the FleetOverviewPanel and (2) using the "Select Aircraft to Inspect" dropdown below it. This redundancy is acceptable as a power-user affordance (the dropdown allows keyboard navigation), but they are visually equal in weight, making the page look more complex than it is.
- The "Loading sort order..." subtitle in FleetOverviewPanel (shown while `fleetAdSummary` loads) is good, but during that window the fleet rows still render in insertion order. A brief skeleton state instead of rendered rows would prevent the user from clicking on a row before the compliance-sort order is established.
- The name "Audit Trail" is misleading. An audit trail in the compliance domain typically means a chronological log of events (who did what, when). This page is a live AD compliance status view, not an event log. The page description even says "Live airworthiness directive status" which confirms it is not an audit trail in the traditional sense.
- The CSV export produces one row per aircraft with a summary (overdue count, total ADs). It is not an exportable event log. For FAA audit preparation, this level of export detail is insufficient — inspectors typically need a per-AD record export.

**Recommendations:**
- Rename the page from "AD Compliance Audit" / "Audit Trail" to "AD Compliance Detail" or "Per-Aircraft AD Status." Update the sidebar label accordingly.
- Replace the inline aircraft dropdown with a smaller "Change aircraft" link below the FleetOverviewPanel, making the panel the primary selection mechanism.
- Enhance the CSV export to include one row per AD record (AD number, compliance status, last compliance date, next due date) rather than one row per aircraft.

---

### `/compliance/ad-sb` — AD/SB Tracking
**File:** `app/(app)/compliance/ad-sb/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** The detailed AD/SB record management page with filtering, per-record status updates, and a dialog for entering compliance details. Filtering by aircraft + status is appropriate and well-implemented.

**Issues:**
- Based on the imports and component structure, this page includes a table of AD records filterable by aircraft and compliance status. The `statusBadge` function correctly differentiates `not_complied` from `isOverdue` (a fix noted in the inline comments as BUG-QCM-1). However, the `pending_determination` status is only described in code comments — the page itself never explains to the user what "Pending" means in the context of AD compliance (i.e., applicability not yet established). A tooltip or glossary link would help.
- The `?aircraft=` URL parameter integration means deep links from the Audit Trail page preserve the selected aircraft in the AD/SB page — this is excellent UX. However, the filter UI on this page likely does not visually indicate that an aircraft pre-filter is active when loaded from a deep link. A user might not notice the filter is applied.
- There is likely no way to add new AD records from this page's empty state if no ADs exist for a selected aircraft — the empty state should prompt users to add an AD rather than just saying "No ADs."

**Recommendations:**
- Add a one-line tooltip on the "Pending" status badge explaining its meaning: "Applicability has not yet been confirmed for this aircraft."
- When the page loads with an `?aircraft=` parameter, display a visible "Filtered: [Aircraft Reg]" chip with an X to clear the filter, consistent with the filter bar pattern.
- Confirm the empty state (no ADs for aircraft) includes an "Add AD Record" action.

---

### `/compliance/audit-readiness` — Audit Readiness Dashboard
**File:** `app/(app)/compliance/audit-readiness/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5
**Summary:** A genuinely valuable dashboard that aggregates six compliance dimensions (training, tools, AD compliance, RSM, QCM outcomes, open findings) into actionable scores with drill-down links. The scoring methodology is well-reasoned and the metrics each link to their respective management pages.

**Issues:**
- The page fires an enormous number of Convex queries simultaneously on load: technicians, training, expiringTraining, tools, calibrationDue, adSummary, aircraft, iaSteps, discrepancies, stationWorkspace, workOrders (paginated), and per-aircraft AD records via `useQueries`. On a fleet of 10 aircraft with 50 technicians, this could easily be 15+ simultaneous subscriptions on page mount. The loading skeleton (a large single skeleton + 6 skeleton cards) does not reflect this latency cost — the page will load visually jagged as queries resolve at different times.
- The `qcmScore` formula (`100 - iaPending * 5 - pendingSignoff * 3`) can produce negative numbers for shops with many pending items. These are clamped to 0 by `clampPct`, but the clamp destroys the signal — a shop with 30 pending IA steps (score = -50, clamped to 0) looks the same as a shop with 20 (score = 0). The metric bottoms out too quickly.
- The "RSM Revision Currency" metric penalizes based on `stationWorkspace.warnings.length`. The penalty is 20 points per warning, capped at 100. Two warnings drive the score to 60 and three warnings to 40. This is extremely aggressive for what might be minor configuration warnings. The metric needs calibration or severity weighting.
- The `AuditChecklistGenerator` component is imported and presumably rendered, but it is not visible in the excerpt. Depending on its placement in the layout, it could be buried below the fold for users who need to quickly assess their readiness score.

**Recommendations:**
- Implement a loading strategy that shows the aggregate score card as soon as training, AD, and QCM data loads (the three highest-signal metrics), rather than waiting for all queries to resolve.
- Rework `qcmScore` to use a logarithmic or asymptotic formula so that the score remains meaningful across a realistic range (e.g., `100 * (1 - Math.log1p(iaPending) / Math.log1p(20))`).
- Calibrate RSM warnings by severity: a minor config warning should not carry the same 20-point penalty as a certificate expiry warning.
- Ensure the AuditChecklistGenerator is prominently placed — if it is a primary action for pre-audit preparation, it should appear above or alongside the score, not below a full page of metrics.

---

### `/compliance/diamond-award` — FAA AMT Diamond Award
**File:** `app/(app)/compliance/diamond-award/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** The page correctly implements Diamond Award tier tracking (Bronze/Silver/Gold based on FAA training hour thresholds). It is a legitimate compliance metric but its placement and weight in the UI do not align with its operational frequency.

**Issues:**
- The Diamond Award is reviewed once per year (FAASafety.gov submission cycle). Giving it a permanent sidebar entry and a full-page treatment alongside daily compliance tools (QCM Review, AD Compliance) inflates its visual priority. A shop manager preparing for an FAA audit does not check Diamond Award daily.
- The page fires `useQueries` for OJT jacket lists per technician and then another nested `useQueries` for stage events per jacket. For a 20-technician shop with 5 jackets each, this is 100+ simultaneous Convex subscriptions on page load. This is a significant over-fetching problem that will cause slow page load and excessive real-time subscription cost.
- The year filter defaults to the current year. If a technician completed their training hours last year (e.g., December 2025) and the page opens in January 2026, their tier shows as "None" until they accumulate hours in the new year. The page does not explain this — users may think their records were lost.
- The `isTrainingEligible` function uses a regex heuristic to determine FAA AMT eligibility (`/(faa|14 cfr|airframe|powerplant|amt|part 145|maintenance)/.test(name)`). This is fragile — a training course titled "Hydraulic Systems Maintenance" would not match despite being AMT-eligible, while "FAA Safety Seminar" would match regardless of content. The eligibility determination should be an explicit field on the training record, not a name-based heuristic.

**Recommendations:**
- Move Diamond Award to a sub-section of Personnel (under training management) or as a secondary link in the Compliance Tools grid rather than a primary sidebar entry.
- Replace the nested per-technician/per-jacket `useQueries` with a single backend aggregation query that returns technician hours pre-computed per year.
- Add a year-over-year summary: show both the selected year's tier and the prior year's tier for context.
- Replace the name-matching heuristic with an explicit `isFaaAMTEligible: boolean` field on training records, and provide a tooltip on any training record where eligibility is not set.

---

## Reports Section

---

### `/reports` — Reports Overview
**File:** `app/(app)/reports/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A solid overview page combining monthly revenue (line chart) and WO throughput (bar chart) with a cross-tabulation table. The date range picker is well-implemented with correct validation. CSV export per chart is useful.

**Issues:**
- The sub-navigation bar links to seven destinations: Overview, Financial Dashboard, Forecast, Profitability, Runway, and Inventory. A user seeing seven report destinations at once with no hierarchy or grouping has to understand the difference between "Reports Overview," "Financial Dashboard," "Forecast," "Profitability," and "Runway" from their names alone. The distinction is not obvious: is "Financial Dashboard" a historical view or a live view? Is "Runway" a cash runway calculation?
- The `Revenue Report` page at `/reports/revenue` and the `Throughput Report` at `/reports/throughput` are NOT linked from the sub-navigation on the overview page. The sub-nav links to Financial Dashboard, Forecast, Profitability, and Runway — but the standalone revenue and throughput deep-dive pages are invisible. These pages are only discoverable via the sidebar.
- The date range picker defaults to a 1-year lookback from today. This is a good default, but there are no preset buttons (MTD, QTD, YTD, Last 12 Months) — the user must manually enter both dates. The forecasting pages use MTD/QTD/YTD presets; consistency would reduce friction on this page too.
- The revenue data is sourced from `listInvoices` with `status: "PAID"`. Quotes and pending invoices are excluded. The page title says "Revenue & work order analytics" but does not clarify that revenue here means only collected/paid revenue (not booked or projected). A billing manager comparing this to their invoicing records may see different numbers.

**Recommendations:**
- Add brief descriptions below each sub-nav button: "Financial Dashboard — live P&L with charts" / "Forecast — projected cash flow" / "Runway — months of operating reserve."
- Add the Revenue and Throughput report pages to the sub-navigation (or merge their content into the Overview page and eliminate the duplicate pages).
- Add date preset buttons (MTD, QTD, YTD, Last 12 Months) alongside the date range pickers.
- Add a footnote: "Revenue shown reflects paid invoices only. Open invoices are excluded."

---

### `/reports/inventory` — Inventory Report
**File:** `app/(app)/reports/inventory/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** The inventory valuation report covers total value, category breakdown, reorder alerts, and shelf-life expiry. The data is relevant and the multi-section structure is logical. Discoverability is the primary issue.

**Issues:**
- This page was not linked from the Reports sub-navigation until a bug fix (BUG-SM-HUNT-034) added it. The fix is present in the overview page code. However, the Inventory Report has a sub-navigation bar of its own that duplicates the links from the Reports Overview page (via `Link` components). If the nav is rendered at the page level, it creates a second navigation layer that is inconsistent with how other report pages work (which use the nav from the parent overview page).
- The reorder alerts table likely shows all parts below reorder point without pagination. For a large inventory this could render hundreds of rows in a single table, with no search or sort capability.
- The shelf-life sections ("Expired," "Within 30d," "Within 60d," "Within 90d") show four separate tables. The buckets overlap logically (items in "Within 30d" are also "Within 60d" and "Within 90d"), but the UI shows separate lists for each bucket. Users should understand these are non-overlapping subsets, not cumulative counts.
- There is no action affordance from this page. A shop manager who sees "6 parts below reorder point" cannot create a purchase order from the inventory report — they must navigate to the Parts section. A "Create PO" or "Go to Parts" link next to the reorder alert section would close the loop.

**Recommendations:**
- Standardize the sub-navigation: all report pages should use the same top-level nav. Remove the duplicate nav from the inventory report page if it is rendered inside the Reports layout.
- Clarify the shelf-life bucket labels: "Expired (N items, not included in other buckets)," "Expiring within 30 days (N items)," etc.
- Add a "View in Parts" or "Create Purchase Order" action link next to reorder alerts.
- Add pagination or "show top 20" limiting to the reorder alerts table.

---

### `/reports/financials` — Financial Dashboard
**File:** `app/(app)/reports/financials/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A data-dense page with multiple chart types (area, line, bar, pie) showing revenue trends, WO pipeline, labor composition, and a revenue breakdown table. The visual variety creates cognitive load without a clear information hierarchy.

**Issues:**
- The page renders 4+ chart types simultaneously (AreaChart, LineChart, BarChart, PieChart). This is information overload. Different chart types require different cognitive processing modes; presenting all simultaneously means users must constantly shift between them without a clear reading order.
- The Financial Dashboard and the Reports Overview page (`/reports`) both show revenue by month. The distinction between them is unclear from the user's perspective — if the Overview page shows monthly revenue and the Financial Dashboard also shows monthly revenue, what is the additive value of clicking into the Financial Dashboard?
- There is no loading gate or `usePagePrereqs` guard visible in the first 100 lines. The Forecast, Profitability, and Runway pages also appear to lack `usePagePrereqs`, meaning they show broken states without clear error messaging if org context is not available.
- The `MetricCard` component used on this page has the same pattern as other section dashboards. However, these metric cards likely show historical actuals from billing data — but the scheduling section's Financial Planning page shows projected values from scheduler assumptions. Both use the same visual components. Without labeling the data source, a billing manager switching between the two sections may conflate historical actuals with planning projections.

**Recommendations:**
- Establish a primary chart (e.g., revenue trend area chart) as the visual anchor. Demote secondary charts to collapsible sections or a detail sub-tab.
- Differentiate the Financial Dashboard from the Reports Overview clearly: the Dashboard should show a live P&L (income vs. expenses vs. margin) while the Overview shows historical counts. Add a subtitle: "Live P&L — actuals from billing records."
- Add `usePagePrereqs` guards to all financial sub-pages to provide consistent loading and error states.

---

### `/reports/financials/forecast` — Cash Flow Forecast
**File:** `app/(app)/reports/financials/forecast/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** The forecast page projects future cash flow based on historical invoice trends and open quotes/POs. The 3/6/12-month horizon toggle is a useful affordance.

**Issues:**
- There are two "forecast" surfaces: this page (historical-extrapolation-based cash flow forecast) and the Scheduling section's `DailyFinancialTracker` panel + `CapacityForecaster` (schedule-based day-by-day P&L projection). These two forecasts use entirely different data sources and methodologies but are both called "forecast" in the UI. A CFO-level user could easily confuse them.
- The forecast methodology (extrapolating from the last 3 months of invoices + open quotes) is not documented on the page. If the last 3 months were unusually high or low (seasonal work, AOG surge), the projection would be misleading with no indication of the assumption.
- The page loads invoices, quotes, and purchase orders simultaneously with no `usePagePrereqs` loading state guard — the page likely renders with undefined data momentarily before Convex resolves.
- The horizon options (3, 6, 12 months) are good but there is no indication of confidence interval or margin of error. An MRO business has high revenue variance; showing a single projected line without any uncertainty band is potentially misleading for financial planning.

**Recommendations:**
- Rename this page "Revenue Forecast" to distinguish it from the scheduling P&L projection.
- Add a "How this works" disclosure: "Based on average monthly collections from the past 3 months, plus estimated value of open quotes at 70% conversion."
- Add a `usePagePrereqs` guard for consistent loading UX.
- Consider adding a simple confidence band (e.g., ±20%) to the forecast chart to communicate projection uncertainty.

---

### `/reports/financials/profitability` — Profitability Analysis
**File:** `app/(app)/reports/financials/profitability/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Per-WO and per-aircraft-type profitability breakdown using invoice vs. part cost data. The date range toggles (MTD/QTD/YTD/ALL) are well-implemented.

**Issues:**
- The page uses `hsl(var(--chart-N))` color tokens for the bar chart. These are likely theme-aware Tailwind CSS variables. However, if no CSS chart color variables are defined in the theme, all bars would render as undefined colors. The page appears to assume the chart colors are defined without a fallback.
- The profitability breakdown shows per-WO margins, but without technician labor cost data (which is only available through the scheduling settings, not in billing records), the margin calculation may be incomplete. The page does not disclose what cost inputs are used in the margin calculation.
- Like the Forecast page, there is no `usePagePrereqs` guard visible.
- The `marginColor` and `marginBg` functions use a 20% margin threshold as "good" (green). For an MRO Part 145 operation, a 20% gross margin on labor-heavy work orders may be aspirational — the threshold is not configurable and is not documented as an assumption.

**Recommendations:**
- Add a "Data sources" footnote: "Revenue from paid invoices. Costs include parts only. Labor costs are not yet included in margin calculations."
- Make the margin threshold configurable or at least expose it as a documented assumption.
- Add `usePagePrereqs` guard.

---

### `/reports/financials/runway` — Business Runway
**File:** `app/(app)/reports/financials/runway/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Calculates cash runway based on average monthly revenue and purchase order spend. The concept is valid for MRO financial management but the implementation assumptions make the metric unreliable in practice.

**Issues:**
- Runway is calculated from invoice revenue minus PO spend over the last 3 months. This excludes labor costs, overhead, and payroll — the largest costs for an MRO operation. The resulting runway number would be dramatically overstated for most shops because it only sees parts purchasing as "spend." A shop manager seeing "18 months of runway" when their actual burn rate is 3x higher due to labor would be misled.
- The page title "Business Runway" uses a `Fuel` icon. In aviation context, "fuel" and "runway" are spatial/physical metaphors that could be confusing alongside financial content. The metaphor is clever but risks being too abstract.
- Like the other financial sub-pages, there is no `usePagePrereqs` guard.
- The historical averaging window is hardcoded to 3 months. A shop that had an unusually good or bad quarter would see a distorted runway calculation with no way to change the window.

**Recommendations:**
- Add a prominent disclaimer: "Runway estimate based on parts spend only. Labor and overhead costs are not included. Actual runway will be shorter."
- Add a configurable averaging window (3, 6, 12 months).
- Add `usePagePrereqs` guard.
- Consider renaming to "Cash Flow Runway" and adding a "What's not included" expandable section.

---

### `/reports/revenue` — Revenue Report (Detailed)
**File:** `app/(app)/reports/revenue/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A more detailed revenue breakdown page that duplicates the core content of the Reports Overview but adds per-customer or per-aircraft breakdown. The page is not linked from the main Reports sub-navigation, creating a discoverability gap.

**Issues:**
- This page is not accessible from the main Reports sub-navigation (the fix for this appears only in `/reports/page.tsx` for inventory, not for revenue or throughput). A user must know the URL or find it in the sidebar.
- Given that the Reports Overview (`/reports`) already shows monthly revenue and WO throughput, the existence of a separate `/reports/revenue` page creates duplication ambiguity. Users do not know which page to use for revenue reporting.
- The page appears to load invoice and customer/aircraft data for per-entity breakdown. If the per-entity table is not virtualized or paginated, shops with many customers would see very long lists.

**Recommendations:**
- Add `/reports/revenue` and `/reports/throughput` to the Reports sub-navigation with distinguishing labels: "Revenue Report (Detail)" vs "Reports Overview."
- Alternatively, merge the content of these standalone pages into tab views within the Reports Overview to eliminate navigation fragmentation.

---

### `/reports/throughput` — Throughput Report (Detailed)
**File:** `app/(app)/reports/throughput/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Per-aircraft-type and per-technician WO completion breakdown. Same discoverability issues as the revenue report.

**Issues:**
- Also not linked from the main Reports sub-navigation.
- The throughput report likely shows per-technician completed WO counts. If it does, this creates a "productivity monitoring" surface that may need role-based access control — technicians probably should not see cross-technician throughput comparisons without explicit design intent.
- Same 500-WO query cap applies. The overview page warns about this cap; the detailed throughput page should as well.

**Recommendations:**
- Add to the Reports sub-navigation.
- Add the 500-WO cap warning to this page if not already present.
- Consider RBAC guard: technician role users should see only their own throughput numbers.

---

## Section Summaries

### Scheduling Section Summary

The scheduling section is technically sophisticated and covers a coherent feature surface (Gantt planning, bay management, capacity, roster, financial planning, due-list). The primary UX problems are:

1. **Gantt board over-complexity** (2/5 usability): the main scheduling page is the most feature-dense page in the app. The simultaneous panel state, multiple modes, and icon-only toolbar create a steep learning curve that would prevent most first-time users from being productive without dedicated training.

2. **Sub-navigation redundancy**: the scheduling sub-nav is duplicated as inline JSX across six pages with no shared component. The Due-List page is the only scheduling sub-page that does not have this nav bar.

3. **Seed Audit page misplacement** (1/5): a developer testing tool exposed to production users with no RBAC guard. This is the single highest-priority issue in the scheduling section to fix.

4. **Roster overlap with Personnel**: the scheduling roster workspace duplicates functionality with the Personnel section without communicating their relationship to users.

The best pages in this section are the **Due-List Planning Workbench** (4/5 usability, 5/5 logic) and the **Bays page** (4/5 usability, 4/5 logic).

---

### Compliance Section Summary

The compliance section has the strongest overall UX in the three sections evaluated. Most pages have thoughtful cross-navigation, correct empty states, and well-reasoned RBAC flows. The inline code comments document a history of significant bug fixes (QCM-001 through QCM-HUNT-138) that demonstrate iterative improvement to real usability problems.

Key concerns:

1. **AD Compliance Audit Trail naming** is misleading — a traditional audit trail is a chronological event log, not a live AD status view.

2. **Diamond Award page query fanout** is a performance risk at scale. The nested `useQueries` pattern for per-technician/per-jacket OJT events will become problematic beyond 20 technicians.

3. **Audit Readiness page query load** fires the most simultaneous Convex subscriptions of any page in the app. A loading strategy that prioritizes the overall score above detailed metric drill-downs would improve perceived performance.

The best page in this section is the **QCM Review Dashboard** (4/5 usability, 5/5 logic) — it has clear queue management, correct empty states, and excellent auto-selection behavior.

---

### Reports Section Summary

The reports section has a discoverability and fragmentation problem. There are eight report pages, but only five are consistently linked from the sub-navigation. The distinction between the Reports Overview, the Financial Dashboard, and the four financial sub-pages is not communicated via UI affordances — users must understand the information architecture to navigate effectively.

Key concerns:

1. **Revenue/Throughput pages invisible from sub-nav**: two report pages are sidebar-only, creating the impression that the Reports section has fewer pages than it does.

2. **Runway and Forecast pages contain misleading data**: both exclude labor costs, which are the primary expense for an MRO. These pages need prominent disclaimers or should be replaced with a more complete financial model.

3. **Missing `usePagePrereqs` guards** on three financial sub-pages (forecast, profitability, runway) creates inconsistent loading behavior compared to the rest of the application.

4. **Sub-nav labels are ambiguous**: "Financial Dashboard," "Forecast," "Profitability," "Runway" are reasonable labels to a financial professional but are not self-explanatory in context. Brief subtitles on the sub-nav buttons would reduce confusion.

The best page in this section is the **Reports Overview** (4/5 usability, 4/5 logic) — it has solid date validation, CSV export, multi-year labeling, and a complete financial cross-tab table.

---

## Priority Issue List (Across All Three Sections)

| Priority | Issue | Page | Severity |
|---|---|---|---|
| 1 | Seed Audit page exposed to non-admin users with no RBAC guard | `/scheduling/seed-audit` | Critical |
| 2 | Runway and Forecast pages exclude labor costs without disclosure | `/reports/financials/runway`, `/forecast` | High |
| 3 | Gantt board simultaneous panel/mode state overwhelms first-time users | `/scheduling` | High |
| 4 | Revenue and Throughput report pages not linked from sub-navigation | `/reports/revenue`, `/reports/throughput` | High |
| 5 | "Audit Trail" name is misleading (it is a live status view, not an event log) | `/compliance/audit-trail` | Medium |
| 6 | Diamond Award page fires nested `useQueries` at O(N × M) scale | `/compliance/diamond-award` | Medium |
| 7 | Scheduling sub-nav duplicated as inline JSX across six files | Multiple scheduling pages | Medium |
| 8 | Missing `usePagePrereqs` guards on financial sub-pages | `/reports/financials/*` | Medium |
| 9 | Compliance dashboard lists tools in the wrong priority order | `/compliance` | Low |
| 10 | Due-list page missing the scheduling sub-navigation bar | `/scheduling/due-list` | Low |
