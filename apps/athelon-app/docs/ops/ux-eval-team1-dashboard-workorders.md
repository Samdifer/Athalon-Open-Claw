# UX Evaluation — Team 1: Dashboard + Work Orders

**Evaluator role:** UX/usability evaluator for Athelon MRO SaaS
**Date:** 2026-03-12
**Scope:** Dashboard page cluster + full Work Orders section (list, sub-views, detail, downstream pages)

---

## Evaluation Index

| Page | Route | Usability | Logic |
|---|---|---|---|
| Dashboard | `/dashboard` | 4/5 | 4/5 |
| Work Orders List | `/work-orders` | 4/5 | 4/5 |
| WO Dashboard | `/work-orders/dashboard` | 3/5 | 3/5 |
| Lead Workspace | `/work-orders/lead` | 3/5 | 4/5 |
| Shift Handoff | `/work-orders/handoff` | 3/5 | 3/5 |
| Kanban Board | `/work-orders/kanban` | 4/5 | 4/5 |
| New Work Order | `/work-orders/new` | 4/5 | 4/5 |
| Templates | `/work-orders/templates` | 3/5 | 3/5 |
| WO Detail | `/work-orders/[id]` | 3/5 | 4/5 |
| New Task Card | `/work-orders/[id]/tasks/new` | 4/5 | 4/5 |
| Task Card Detail | `/work-orders/[id]/tasks/[cardId]` | 3/5 | 4/5 |
| Finding Detail | `/work-orders/[id]/findings/[discrepancyId]` | 3/5 | 3/5 |
| Records | `/work-orders/[id]/records` | 3/5 | 3/5 |
| RTS | `/work-orders/[id]/rts` | 4/5 | 4/5 |
| Release | `/work-orders/[id]/release` | 4/5 | 4/5 |
| Certificates | `/work-orders/[id]/certificates` | 3/5 | 3/5 |
| Execution Planning | `/work-orders/[id]/execution` | 3/5 | 3/5 |
| Signature | `/work-orders/[id]/signature` | 4/5 | 4/5 |

---

## Page-by-Page Evaluations

---

### `/dashboard` — Main Dashboard
**File:** `app/(app)/dashboard/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Well-structured command-center dashboard with live KPIs, active WO board, and collapsible below-the-fold sections. The progressive disclosure pattern (above-the-fold action items, collapsed analytics) is well-considered.

**Issues:**
- The CommandCenter component receives 7 distinct props from 7 separate Convex queries all fired at the top level of `DashboardPage`. This is architecturally correct (single-subscription, no duplicate fetches) but the page will show partial/staggered skeletons if any query resolves late — there is no unified loading state coordinating them.
- Three collapsible sections ("Schedule & Fleet", "Inventory", "Analytics") all default to closed. A user who wants the fleet status list after switching from a mobile phone will need two interactions (scroll, expand) to reach content that should arguably be a quick-access panel.
- The welcome modal is keyed to localStorage and shown once per org. If a user clears their browser data or logs in from a new device, they see it again. This is acceptable but not called out anywhere in the UX — there is no "Don't show again" checkbox or settings toggle to bring it back.
- The "New Work Order" CTA button in the header is appropriate but duplicates the same button visible in the work orders list header. The dashboard should ideally differentiate its primary action (e.g., "View Active Work Orders") since the dashboard is observational, not a creation entry point.
- The offline cache badge ("Showing cached offline snapshot") appears at 10px text below the subtitle — small enough that a technician on a shop-floor tablet with glare could miss it. Stale data driving actions is a safety concern in an MRO context.

**Recommendations:**
- Add a lightweight unified loading indicator (e.g., a top-of-page progress bar) rather than letting each widget render its own skeleton independently.
- Default the "Schedule & Fleet" collapsible section to `open` — fleet status and schedule health are daily operational needs, not buried analytics.
- Increase the offline badge prominence: use an amber banner at the top of the page rather than 10px text. Stale data in an MRO context is operationally significant.
- Retarget the primary CTA on the dashboard to "View Work Orders" (the observational action), not "New Work Order" (the creation action). Place "New Work Order" only in the work orders list header.

---

### `/work-orders` — Work Orders List
**File:** `app/(app)/work-orders/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Feature-rich list page with status tabs, three view modes (list/tiles/truncated), sort controls, multi-filter popover, and QR code generation. Well-implemented overall; the AOG-first sorting is an excellent MRO-specific design decision.

**Issues:**
- The header action area has **six controls in a row** on small screens: Dashboard, Lead, Kanban, Export CSV, and New Work Order buttons plus view-mode toggles below. On a 375px phone this row collapses badly. The "Dashboard", "Lead", and "Kanban" navigation buttons arguably do not belong here — these are secondary sub-views, not actions.
- The three view-mode toggle buttons (List, Grid, Truncated) use icon-only buttons with `title` tooltips. On touch devices, tooltips do not appear. "Truncated" view is conceptually ambiguous — the label does not describe what makes it different from "list" without trying it.
- The "Awaiting Parts" status tab filters by `partsOnOrder > 0` regardless of whether the part shortage is actually blocking progress. A WO with parts on order but plenty of other work to continue still shows in this tab, potentially inflating the count.
- The filter popover contains Priority, Type, and Location — but there is no saved/pinned filter state. A shop manager who always filters by Location will re-apply the filter on every page visit.
- Progress bars on list-view cards use `w-16` (64px) — extremely narrow for conveying percentage information. The `1/8` fraction labels (e.g., "1/8 tasks") are clearer than the bar itself.
- The empty-state for "no results in this filter" lacks a "Clear all" shortcut that also clears the active tab selection (it only offers "Clear Search," not "Clear Filters").
- Export CSV is a power-user feature placed inline with the primary navigation buttons, adding visual noise.

**Recommendations:**
- Move "Dashboard," "Lead," and "Kanban" sub-view links to a secondary nav row or a `More views` dropdown, freeing header space for the primary actions.
- Label the view-mode buttons with text on larger screens: "List," "Cards," "Compact" (rename "Truncated" to "Compact" — it's more descriptive).
- Add persistent filter state per user (localStorage or URL query params) so recurring filter selections survive page navigation.
- Move Export CSV to a secondary actions menu (ellipsis or kebab) rather than a top-level button.
- Increase the progress bar width to at least `w-24` (96px) or remove it in favor of the fraction label alone.

---

### `/work-orders/dashboard` — Work Order Dashboard (WIP Summary)
**File:** `app/(app)/work-orders/dashboard/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A focused WIP-hours dashboard showing estimated vs. applied hours per active WO with a portfolio-level progress bar. Useful for shop managers but has discovery and role-clarity issues.

**Issues:**
- This page is reachable only via a small "Dashboard" button in the work orders list header — there is no sidebar nav entry, no breadcrumb reference, and the button label ("Dashboard") is ambiguous given there is already a main dashboard.
- The naming collision between this page ("Work Order Dashboard") and the main app Dashboard (`/dashboard`) creates conceptual confusion. The WO dashboard is really a "WIP Summary" or "Labor Tracker."
- The four KPI cards (Active WOs, Estimated Hours, Applied Hours, Portfolio WIP) duplicate what is already visible in the main dashboard's CommandCenter. Users may not know which view is authoritative.
- The WO table shows raw `status` badges on each row (e.g., `in_progress`) instead of human-readable labels. Raw snake_case statuses are for engineers; shop managers and technicians need plain English.
- The `wipPercent` can exceed 100% (capped at 999% in the computation) but the Progress bar is capped at 100%. There is no visual indication that a WO has exceeded its estimate — the bar simply fills to 100% and stops, hiding over-budget situations.
- There is no way to click a WO row to navigate to the WO detail. It is a read-only list.

**Recommendations:**
- Rename this page to "WIP Labor Summary" or "Labor Tracker" and add it to the sidebar nav under Work Orders to improve discoverability.
- Replace raw status values with `WO_STATUS_LABEL` lookups (already used elsewhere; this page missed it).
- When `wipPercent > 100`, color the progress bar red and show "Over budget X%" instead of silently capping at 100%.
- Make WO number/aircraft cells clickable links to the WO detail page.

---

### `/work-orders/lead` — Lead Workspace
**File:** `app/(app)/work-orders/lead/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** Comprehensive lead technician tool combining team assignment, subtask assignment, turnover report authoring, and submission history into five tabs. Logic is sound and the workflow is well-modeled; the UI density is the primary concern.

**Issues:**
- The page renders fully even for non-lead users who reach it by URL — they see a "Lead Workspace Access Required" card, which is fine, but the page title and URL are still `lead` with no redirect or sidebar hiding. A technician role user could bookmark this page thinking it will eventually give them access.
- The Tabs row ("Ownership," "Task Feed," "Steps," "Turnover Report," "History") shows five tabs at once on a narrow screen. The tabs do not scroll on small viewports (the `flex-wrap` approach breaks the visual tab metaphor when tabs wrap to a second line).
- The "Ownership" tab shows a text input for "Team name" — this is a free-form string field with no autocomplete or validation, making it easy to create inconsistent team names across WOs (e.g., "Airframe Day," "Airframe Day Shift," "airframe day shift").
- The Turnover Report tab bundles WO selection checkboxes, AI draft summary, lead summary, per-section notes, and per-WO notes into a single large card. Scrolling through this section is disorienting — there is no visual section separation or step numbering.
- The date picker input for "Report Date" is labeled with plain "date" type (`<Input type="date">`). On iOS/Safari this renders a native date picker which is acceptable, but the visual size (`h-8 w-[170px]`) is disproportionately small relative to the importance of the date selection — this date determines which draft gets loaded from the backend.
- The "Save Draft" and "Submit" buttons in the header are separated from the form content by a full page scroll on large turnover reports. A user who has scrolled to the bottom of the form needs to scroll back up to save.

**Recommendations:**
- Add sticky footer action buttons (Save Draft, Submit, PDF) that remain visible while scrolling the Turnover Report form.
- Replace the free-form team name field with an autocomplete seeded from existing team names used in the same org.
- Add visual step numbering or section headings ("Step 1: Select Work Orders," "Step 2: Write Summary," etc.) to the Turnover Report tab.
- Add a role gate in the sidebar to prevent non-lead-role users from seeing the "Lead" nav item entirely, rather than showing it and then gating on-page.

---

### `/work-orders/handoff` — Shift Handoff Dashboard
**File:** `app/(app)/work-orders/handoff/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A filterable view of shift handoff notes from task cards, organized by shift/team/date. The concept is valuable but the implementation has significant visual and discoverability gaps.

**Issues:**
- The page uses `p-6` padding at the top level but the rest of the application uses `space-y-*` — this creates a layout inconsistency where this page is visually wider-margined than all other pages.
- The "Handoff Note Stream" is capped at 75 notes with no pagination controls and no indication to the user that overflow exists. Unlike the Lead page's overflow fix (which shows "Showing X of Y"), this page silently truncates at 75.
- The time display shows UTC time with a "Z" suffix (`16:42Z`) — on a shop floor where everyone is in the same timezone, UTC times are confusing. There is no way to switch to local time.
- The "Teams (top 5)" KPI card shows team names with note counts but offers no drill-down. A user sees "Airframe Day: 3" but cannot click to filter to just that team.
- The filter card (Date, Shift, Team, Unresolved checkbox) and KPI cards look identical in visual weight, causing the user's eye to scan the filter controls as content and vice versa.
- The page title "Shift Handoff Dashboard" is not in the sidebar navigation. Users must navigate to Work Orders, then click the button — its discoverability is essentially zero for a new user.

**Recommendations:**
- Add the page to the sidebar nav under Work Orders with a descriptive label ("Shift Handoff" or "Turnover Notes").
- Replace UTC time display with local time, or provide a timezone toggle.
- Add "Showing X of Y notes" indicator when results are truncated.
- Style the filter area distinctly from the KPI cards (e.g., a bordered filter panel vs. metric cards).
- Make team names in the KPI card clickable to auto-apply the team filter.

---

### `/work-orders/kanban` — Kanban Board
**File:** `app/(app)/work-orders/kanban/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A competently implemented HTML5 drag-and-drop Kanban board for status management. The six-column layout covers the full WO lifecycle. Good AOG-first sorting within columns and QCM badge differentiation.

**Issues:**
- Six columns on a laptop screen means each column is approximately 300px wide. At 6 columns with a `gap-4` layout, the board requires horizontal scroll on screens narrower than ~1900px. The "Complete" column (read-only, no drops) takes up the same real estate as an actionable column and adds scrolling without actionable value.
- The `complete` column is read-only (dropping into it shows an error toast), but it is visually identical to the other columns. Users discovering the board will inevitably try to drag a WO into "Complete" and receive an error. The intended workflow (use the RTS workflow) is only explained in the toast — not in any visible UI hint.
- The "Draft" column is editable — cards can be dragged out of Draft status into active work. This may or may not be intentional, but it bypasses the "New Work Order → open in detail page" workflow that the new WO form describes ("Creates a work order in Draft status. Open it after selecting technicians.").
- There is no column for `pending_signoff` separate from `pending_inspection` — both are mapped to one "Pending Inspection" column. The QCM badge on `pending_signoff` cards partially addresses this, but from a board-management perspective, the shop manager cannot see at a glance how many are truly ready for QCM release.
- Card click navigates to the WO detail page. The entire card is clickable AND draggable, which creates interaction conflicts on touch devices — dragging a card can accidentally navigate to the detail page.

**Recommendations:**
- Make the "Complete" column visually distinct: gray it out, add a lock icon, and show a tooltip "Drag to this column is disabled — use the RTS workflow." This communicates the constraint without requiring a toast error.
- Consider splitting "Pending Inspection" and "Pending Signoff" into separate columns for QCM clarity.
- Implement touch-specific drag-and-drop handling (using pointer events or a touch drag library) so card taps navigate and deliberate drags move cards, rather than both competing.
- Consider hiding or collapsing "Draft" and "Complete" columns behind a toggle to reduce horizontal scroll for the most-used active columns.

---

### `/work-orders/new` — New Work Order
**File:** `app/(app)/work-orders/new/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** Well-structured card-per-section form for creating a WO in Draft status. Progressive form layout with contextual validation cues and smart helper text. The card-grouped sections work well on mobile.

**Issues:**
- The form creates a WO in **Draft** status with no way to immediately set it to "Open" — the help text says "Open it after selecting technicians" but gives no inline link or next-step guidance to where that action happens. A new user will create the WO, land on the detail page, and need to discover the status transition themselves.
- The "Pilot-Reported Findings" field label uses aviation jargon ("Squawks") internally in the code but the visible label says "Pilot-Reported Findings." While the visible label is more accessible, the label inconsistency between internal naming (squawks) and display ("Findings") may confuse ops staff who use both terms in different contexts.
- There is no template selection at WO creation time. A shop manager creating a recurring inspection type (annual, 100-hour) has to manually add task cards after creation. The Templates page exists but there is no "Start from template" option in the new WO form.
- The "Work Order Number" field shows "Auto-generated on create" in a disabled input. This is fine, but the format explanation (`WO-{BASE}-{SEQUENCE}` and `WO-DEN-1`) uses code-style placeholders that are confusing for non-technical users.
- The past-date warning on the Promised Delivery Date field correctly uses amber styling and inline text, but the warning only appears after typing a date — there is no validation on form submit that prevents creating a WO with an already-overdue promise date without at least requiring confirmation.
- "Internal Notes" and "Pilot-Reported Findings" are both in separate Cards with similar visual treatment. They serve different purposes (one is operational context for the shop; one is the pilot's report). Their equivalent visual weight obscures their functional difference.

**Recommendations:**
- After WO creation, navigate to the detail page and auto-open a "Quick Start" panel or highlight the status-transition flow, guiding the user to move the WO from Draft to Open.
- Add a "Load inspection template" selector to the form — when an inspection type WO is selected, offer available templates so the WO can be pre-populated with task cards.
- Replace the format explanation string with a real example: `Example: WO-DEN-1` (the example is there but the braces notation `{BASE}-{SEQUENCE}` is unnecessary).
- Differentiate "Pilot-Reported Findings" visually (e.g., a yellow-tinted card background) to signal that this is customer/pilot input, not shop-authored content.

---

### `/work-orders/templates` — Inspection Templates
**File:** `app/(app)/work-orders/templates/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A template library for reusable inspection step sets. The creation dialog is detailed and functional. The list view is minimal but serves the purpose.

**Issues:**
- Templates are read-only in the list — there is no way to edit or deactivate a template from this page. Activating/deactivating requires knowledge of a feature that does not exist in the UI. The `active` field is set at creation and presumably never changes after that (no edit button is visible). A template with a typo in step 3 must be recreated from scratch.
- The creation dialog is a full-screen scrollable modal that can contain an unbounded number of steps. A template with 30 steps requires extensive dialog scrolling. The dialog's `max-h-[90vh] overflow-y-auto` limits height correctly, but the UX of building a long checklist inside a modal is poor — there is no preview of the resulting template structure and no way to reorder steps after the fact using keyboard shortcuts.
- Templates are scoped by aircraft make/model (optional) but the list view shows no filtering or grouping by make/model. An org with 10+ templates for different aircraft types will see a flat unsorted list.
- The "Approved Data Source" field is required at template creation (`approvedDataSource is required`) but the field label's asterisk uses `text-destructive` (red) — the word "destructive" in a compliance document context creates a subtle but avoidable connotation if the Tailwind semantic meaning were ever changed.
- There is no link from the Templates page back to the New Task Card page (the primary consumer of templates). The relationship between the pages is not surfaced.

**Recommendations:**
- Add Edit and Deactivate actions to each template row (edit modal reuses the same form, deactivate toggles the `active` field).
- Add a search/filter bar to the template list, filterable by aircraft make/model and inspection type.
- Add a "Used in X work cards" usage count to each template row to show which templates are actively used and which are stale.
- Add a contextual link "Create a new template" in the New Task Card page's TemplatePickerDialog empty state (one already exists — confirm it links to `/work-orders/templates`).

---

### `/work-orders/[id]` — Work Order Detail
**File:** `app/(app)/work-orders/[id]/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** The most complex page in the application — a multi-section detail page combining a stage progress indicator, WOHeaderKPI, readiness blockers, and seven tabs (Tasks, Compliance, Parts, Cost Estimate, Evidence, Documents, Notes & Activity). Information density is high but the logic of what belongs where is mostly sound.

**Issues:**
- **Seven tabs is too many.** The tab bar is set to `flex-wrap` — on screens narrower than 1200px the tabs overflow and wrap to a second line, visually breaking the tab metaphor and making it unclear which tab is active. Industry convention for this pattern (issue tracker, ERP detail pages) caps visible tabs at 5-6, with overflow in a "More" dropdown.
- The **"Cost Estimate"** tab label is misleading. The tab appears to contain the `CostEstimationPanel` — but it is positioned between operational tabs (Parts, Evidence) and a documentary tab (Documents). Managers reviewing costs expect a financial tab to be last or separated from workflow tabs.
- The **stage progress indicator** (Quoting → In-dock → Inspection → Repair → Return to Service → Review & Improvement) is rendered in a scrollable card. On a phone, stages 5 and 6 require horizontal scroll within the card — the stage labels truncate to `whitespace-nowrap` which is intentional but means users miss the later stage names.
- The **WOHeaderKPI** component shows 7 metric tiles (RTS Date, Time Summary with 3 sub-values, Parts Cost, Labor Cost, Total WIP, Days Until RTS). The RTS Date card + Days Until RTS card are highly redundant — both show the same underlying data point.
- The **"Clock to WO"** timer button is placed in the header action area alongside PDF download and "Sign Off & Close" — three very different actions with very different frequencies of use and consequences. A technician starting/stopping their clock should not be adjacent to the "Sign Off & Close" critical action.
- The readiness blockers card (amber, with XCircle list) is embedded between the stage indicator and the WOHeaderKPI — a well-chosen position. However, blockers are only shown when `!canClose && blockers.length > 0`. When the WO IS ready to close, no positive confirmation is shown in this area — the only signal is the Compliance tab's green dot and the enabled "Sign Off & Close" button.
- Parts requests are stored in **localStorage**, not in Convex. This means parts data is device-specific. A shop manager viewing the WO from a different device will see zero parts requests even though a technician logged them. This architectural gap is serious for an MRO context where parts traceability is regulatory.
- The `FindingList` component is rendered **below** `WorkItemsList` inside the Tasks tab, meaning task cards are rendered first and findings second. For a WO in "Open Discrepancies" status, findings are the primary focus — they should be first or in their own tab.

**Recommendations:**
- Collapse the 7 tabs to 5 by merging related content: merge "Cost Estimate" into "Parts" as a subtab, and merge "Evidence" into "Documents" as a subtab or toggle within the Documents tab.
- Rename "Cost Estimate" to "Financials" and move it to the last tab position.
- Separate the "Clock to WO" button from the "Sign Off & Close" button with a visual divider or position them in distinct areas (timer controls in a "time tracking" row; close action as a standalone prominent button).
- Remove the Days Until RTS mini-card from WOHeaderKPI since the RTS Date card already shows a color-coded days-remaining line.
- Migrate parts requests out of localStorage into Convex — flag this as a critical architectural gap for multi-device compliance.
- When WO is ready to close (`canClose: true`), show a brief green confirmation banner in the blockers area: "All readiness checks passed — ready to sign off."

---

### `/work-orders/[id]/tasks/new` — New Task Card
**File:** `app/(app)/work-orders/[id]/tasks/new/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A focused task card creation form with template loading, step builder, and technician assignment. Solid workflow with good safety guards (template overwrite confirmation, special-tool reference enforcement).

**Issues:**
- The **Estimated Hours** field prominently appears in the form but has a warning label: "Not saved — for local planning only. Hours won't appear on the work card." Showing a form field that explicitly states it will not be saved creates confusion — users will not understand why they should fill it in at all. The field should either be removed or replaced with a planned/backlogged schema addition that actually saves.
- The "Load from Template" button is positioned in the form header next to the "Back" button. This placement is good for discoverability, but the template picker dialog closes on template selection without any success confirmation — the user must visually scan the form to verify the template was applied.
- The TaskCardForm component includes an "Aircraft System" field (dropdown) and an "Is Inspection Item" checkbox. These fields are new (from Phase 1) but lack field-level help text explaining what "Aircraft System" means to technicians who are not system engineers.
- The form validates on submit but does not provide real-time validation on individual fields. A technician who fills in 8 steps and forgets the Approved Data Source won't find out until they click "Create Work Card" — at which point the error message appears at the bottom of the page (after the steps), requiring scroll to find.
- The breadcrumb context shows only "WO {number} · {registration}" — it does not show what work order type this is, which could help technicians select the appropriate template.

**Recommendations:**
- Remove the non-persisting "Estimated Hours" field entirely, or replace it with a clear "BACKEND-PENDING" callout (not a form field) that indicates hours will be available in a future release.
- Add a success toast when a template is applied: "Template '{name}' loaded — {N} steps added."
- Add inline help text for "Aircraft System" field: "(ATA chapter system the task addresses, e.g. 71 - Powerplant)".
- Move the validation summary to the top of the form (below the WO context card) rather than the bottom, so users see the error without scrolling past all their steps.

---

### `/work-orders/[id]/tasks/[cardId]` — Task Card Detail
**File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5
**Summary:** The operational workhorse for technicians — shows all steps, allows sign-off, raise findings, mark N/A, time tracking, compliance items, vendor services, and handoff notes. Logic is thorough; the density requires expert users.

**Issues:**
- The page imports **14 distinct sub-components** and renders several sections that each contain their own internal state. The cognitive load for a technician opening a task card for the first time is very high — they see steps, compliance items, vendor services, handoff notes, voice recording, and timelines in a single scrollable page.
- The step sign-off flow (`SignStepDialog`) and the card-level sign-off (`SignCardDialog`) are conceptually different actions but are visually similar buttons. A technician can sign individual steps before the card is complete, which may conflict with their expectation that the card must be complete before signing.
- The **Compliance** section on the task card shows a list of compliance items with a `status` badge and update controls. This data also appears in the WO-level Compliance tab. There is visual and workflow redundancy — technicians see compliance requirements in two places and may update them inconsistently.
- The "Raise Finding" button (opens `RaiseFindingDialog`) is appropriately available inline per-step. However, findings raised from a step navigate to a separate findings page while the technician's scroll position on the task card is lost.
- The `WriteUpTimeline` and `ActivityTimeline` both appear at the bottom of the task card page. These are distinct — one shows write-up entries, one shows system events — but they look visually similar (both are vertical timelines with timestamps). Users may not understand the difference.
- Voice notes on the task card are stored in localStorage, matching the same architectural gap on the WO detail page.

**Recommendations:**
- Introduce progressive disclosure on the task card: show only the Steps section by default, with other sections (Compliance, Vendor Services, Notes) accessible via a secondary "More" panel or collapsible accordions.
- Rename "Activity Timeline" to "System Event Log" and "WriteUp Timeline" to "Work Log" to clearly differentiate the two timeline sections.
- After raising a finding, return focus to the task card (use scroll restoration or a hash anchor) rather than losing the technician's position.
- Add a visual separator between step sign-offs and card-level sign-off with explanatory text: "Once all steps are complete, you can sign off the entire work card."

---

### `/work-orders/[id]/findings/[discrepancyId]` — Finding Detail
**File:** `app/(app)/work-orders/[id]/findings/[discrepancyId]/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A detail page for an individual maintenance finding (discrepancy), showing the finding's properties, write-up timeline, and activity log. The page is functional but lean.

**Issues:**
- The finding detail page is reached from the task card step level (via "Raise Finding") but the back navigation button links to `/work-orders/${workOrderId}` — the WO detail page, not the task card that originated the finding. A technician who raised a finding on Step 3 of Task Card TC-007 must navigate back manually to Task Card TC-007.
- The page fetches **all discrepancies for the org** (`api.discrepancies.listDiscrepancies`) then filters client-side by `discrepancyId`. On an org with hundreds of discrepancies, this is a significant data over-fetch. There is no dedicated `getDiscrepancy(id)` query — it is presumably missing from the backend.
- The finding disposition controls (Accept, Defer MEL, Defer Grounded, etc.) are not shown on this detail page. Disposition happens elsewhere (likely in the WO Tasks tab `FindingList` component). Users navigating directly to the finding detail expecting to disposition it will find no such controls — there is no affordance explaining where disposition happens.
- The `isDispositioned` flag is checked but does not render any different read-only state for the page when the finding is closed — the page looks identical regardless of whether the finding is open or resolved.

**Recommendations:**
- Fix the back navigation to return to the originating task card if `taskCardId` is available, or to the WO Tasks tab with the finding scrolled into view.
- Add a `getDiscrepancy(discrepancyId)` backend query to avoid fetching all org discrepancies client-side.
- When a finding is dispositioned, show a clear "Resolved" header state with the disposition type and date — differentiate the read-only view from the active view.
- Add an inline "Disposition this finding" action (or a link to where it can be dispositioned) so users who land on this page know the next step.

---

### `/work-orders/[id]/records` — Maintenance Records
**File:** `app/(app)/work-orders/[id]/records/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Maintenance record creation and listing for a WO, supporting annual, 100-hour, progressive, and conditional inspection record types. The page has a tabs-within-a-page-within-tabs structure that creates navigational confusion.

**Issues:**
- This page uses its own internal tab set (implied by `Tabs`, `TabsContent` imports and `CreateRecordForm` in a tab) inside a page that is itself reachable only via sub-navigation from the WO detail. This nesting of tabbed navigation is cognitively taxing and breaks the browser back-button expectation — users may expect "Back" to return them to the WO detail, but navigating between internal tabs changes no URL.
- There is no integration between records created here and the Compliance tab on the WO detail page. A QCM who creates an annual inspection record does not see it reflected in the compliance readiness checks.
- The `CreateRecordForm` is in a sub-component (`_components/CreateRecordForm`) but the form is rendered inline in the tab view. If the form has many fields, the user's scroll context may be lost when switching between the List and Create tabs.
- The page is linked from the WO detail page via sub-navigation but there is no visible breadcrumb indicating the user is at `WO-123 > Records` — the only navigation back is the Back button.

**Recommendations:**
- Replace the internal tab structure with a two-panel layout: record list on the left, create-form panel on the right (collapsible on mobile).
- Add records to the WO Compliance tab — when a maintenance record is created, show it as a completed compliance item.
- Add breadcrumb navigation: "Work Orders / WO-123 / Records."

---

### `/work-orders/[id]/rts` — Return to Service
**File:** `app/(app)/work-orders/[id]/rts/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** The RTS sign-off page — final sign-off form with a readiness checklist, RTS statement, aircraft hours, and PDF download. Well-structured for a high-stakes action.

**Issues:**
- The page uses `useSearchParams` to pre-populate `signatureAuthEventId` from a `?authEventId=` URL param. This is a good QOL feature, but the URL exposes an auth event ID in the browser history. If a user shares the URL or uses a shared computer, the auth token (even expired) persists in history.
- The `RtsChecklist` and `RtsSignoffForm` components are separate — the checklist shows whether the WO is ready, and the form takes the actual sign-off input. But both render on the same page without a clear visual divider. The "Checklist" should be Step 1 and the "Sign-Off Form" should be Step 2 with clear progression.
- The PDF download for the RTS document requires the user to have an `orgId` and `workOrderId` — both are URL-based, which is correct. However, the PDF button is rendered without loading state. Generating a PDF from large WO data can take a few seconds, and clicking the button twice would generate duplicate PDFs.
- The page renders `ActionableEmptyState` when preconditions are not met but does not explain specifically which precondition failed (e.g., "Organization setup incomplete" vs. "Work order not found").

**Recommendations:**
- Add a clear two-step visual layout to the RTS page: "Step 1: Readiness Checklist" and "Step 2: Sign-Off Statement."
- Add loading state to the PDF download button (disable after click, show spinner).
- Consider using a session-based auth token flow that clears the `?authEventId=` URL param after successful capture, reducing history exposure.

---

### `/work-orders/[id]/release` — Aircraft Release
**File:** `app/(app)/work-orders/[id]/release/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** The final aircraft release-to-customer form. Shows readiness state and, if satisfied, presents a release confirmation form. The `ReleaseConfirmationCard` provides appropriate ceremony for a consequential action.

**Issues:**
- The release action is a high-stakes, irreversible action but there is no explicit confirmation dialog ("Are you sure you want to release N123AB to the customer?") before submission. The form fills and submits with a standard button press.
- After a successful release, the `ReleaseConfirmationCard` shows the confirmation inline on the page, but there is no link to a post-release checklist or customer notification flow.
- The page imports `CloseReadinessReport` type from `@/lib/mro-types` but the `release` route is a separate page from `rts` — users who complete the RTS page may not know they also need to complete the Release page. The connection between the two pages is not surfaced in the UI.

**Recommendations:**
- Add an `AlertDialog` confirmation: "Releasing this aircraft to the customer is final and cannot be undone. Continue?" with a require-to-type aircraft registration for high-risk confirmation.
- After release, show a "Next steps" panel: "Send customer notification," "File maintenance records," "Archive work order."
- Add a "View RTS Record" link at the top of the Release page so users understand it follows the RTS step.

---

### `/work-orders/[id]/certificates` — Release Certificates (8130/EASA Form 1)
**File:** `app/(app)/work-orders/[id]/certificates/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** Manages FAA 8130-3 and EASA Form 1 release certificates. The creation dialog is comprehensive; the list view is functional.

**Issues:**
- The page has no breadcrumb or back navigation — it renders within the app layout but there is no "Back to WO" button. Users who navigate here from the WO detail lose their context.
- The creation dialog for certificates is complex (part number, serial, batch, quantity, work performed, condition, remarks, approval number) but has no form validation feedback — error handling relies on `toast.error()` calls from the mutation, which gives no inline field-level guidance.
- Certificate generation (PDF download) is triggered separately per certificate but the `downloadPDF` function has no error state displayed in the UI — errors are silently swallowed in the `catch` block.
- The `PartNumberCombobox` component inside the dialog creates an interactive search element within a modal that also has keyboard navigation for the dialog itself — this can create focus-trap conflicts on keyboard-only navigation.
- The certificate list shows the certificate type (8130-3 / EASA Form 1), part number, and status, but does not show who created the certificate or when — critical audit information for a Part 145 compliance document.

**Recommendations:**
- Add "Back to Work Order" navigation.
- Add created-by and created-at columns to the certificate list.
- Add field-level validation to the certificate creation form with inline error display rather than only relying on toast errors.
- Show a PDF error toast if PDF generation fails, with a retry button.

---

### `/work-orders/[id]/execution` — Execution Planning (Gantt)
**File:** `app/(app)/work-orders/[id]/execution/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5
**Summary:** A Gantt chart view for WO task card scheduling and execution planning, rendered by `WOExecutionGantt`. The page wrapper is minimal; all complexity is in the component.

**Issues:**
- The page header renders the today's date using `new Date().toLocaleDateString()` — this date will not update if the user leaves the page open overnight (same class as BUG-SM-HUNT-019 on the dashboard, which was fixed with a dependency on live query data — this page has no such hook).
- The Gantt is accessed via a secondary "Execution Planning" button on the WO detail page. Its placement in the action button cluster makes it appear to be an infrequent-use secondary action, but for a shop manager planning labor allocation it is a primary view. There is no sidebar nav entry.
- The page uses `p-4` padding at the top level, different from the standard `space-y-*` layout used throughout the rest of the app.
- The Gantt component (`WOExecutionGantt`) is not evaluated here as it is a sub-component, but the page provides no fallback UI if the Gantt renders empty (no task cards yet) — the page would show the header and a blank canvas.

**Recommendations:**
- Add this page to the WO detail page's tab navigation as "Schedule" (replacing the current button in the header action cluster) to improve discoverability.
- Replace `new Date().toLocaleDateString()` in the header with a live-updating date.
- Standardize the page padding to match the rest of the application.
- Add an empty state for the Gantt when no task cards are scheduled: "No scheduled tasks. Add work cards to build the execution timeline."

---

### `/work-orders/[id]/signature` — Signature / PIN Authentication
**File:** `app/(app)/work-orders/[id]/signature/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5
**Summary:** A PIN-entry page for generating a time-limited authentication event used for sign-off actions. The countdown timer UX is well-executed; the flow handles the `returnTo` redirect correctly.

**Issues:**
- The page has no page title visible in the browser tab — the `<h1>` shows contextual content but there is no `<title>` or meta equivalent to help users identify the page in browser history or multi-tab scenarios.
- The PIN entry field uses a standard `<Input type="text">` (presumably changed from `type="password"` for shop-floor usability) — but on mobile, the virtual keyboard defaults to alphabetical layout, requiring manual switch to numeric. Using `type="tel"` or `inputMode="numeric"` would auto-show the numeric keypad on iOS/Android.
- The 5-minute countdown timer is well-implemented but starts from when the auth event is created (server-side timestamp), not from when the user first sees the countdown. If there is network latency between the mutation completing and the UI rendering, the visible countdown may be slightly shorter than 5 minutes, creating confusion.
- When the token expires, the page shows "expired" state but does not automatically redirect or offer a "Try again" button that resets to the PIN entry state — the user must manually click a link.

**Recommendations:**
- Change PIN input to `type="tel"` or add `inputMode="numeric"` for mobile numeric keypad auto-display.
- When the token expires, auto-show a "Request new signature token" action button inline without requiring page reload.
- Ensure the auth event `expiresAt` timestamp accounts for server/client clock drift by using the server-returned value, not a client-calculated offset.

---

## Section Summary: Cross-Cutting Themes

### 1. Navigation fragmentation between sub-views
The Work Orders section has **7+ sub-pages/views** accessible only via buttons within pages, not via sidebar navigation. These include: `/work-orders/dashboard`, `/work-orders/lead`, `/work-orders/handoff`, `/work-orders/kanban`, and sub-pages of the WO detail (`/records`, `/rts`, `/release`, `/certificates`, `/execution`). Users who know these pages exist can reach them; users who don't know they exist will not discover them. The sidebar nav should expose at least the five primary WO views.

### 2. Tab overload on complex pages
Both the WO Detail page (7 tabs) and the Lead Workspace (5 tabs) are at or over the point where tabs become a navigation liability rather than an aid. When tabs wrap to a second line on medium screens, the pattern collapses. Recommendation: cap visible tabs at 5, use "More" overflow for secondary tabs, and split the most complex tabs into sub-pages.

### 3. Inconsistent padding/layout conventions
Several pages use `p-6` or `p-4` as a top-level wrapper (`handoff/page.tsx`, `execution/page.tsx`) while the rest of the application uses `space-y-*` with the layout's own padding. This produces visual inconsistency in margins and alignment. A single layout wrapper standard should be enforced.

### 4. localhost/device-specific data stores
Both voice notes and parts requests are stored in **localStorage** on the WO detail page and task card page. In a collaborative MRO environment, shop-floor data must be accessible by any authorized user from any device. LocalStorage persistence is appropriate only for purely UI preferences (e.g., view mode), not for operational data. This should be treated as a compliance risk and migrated to Convex.

### 5. Missing breadcrumb navigation
The WO section creates a 3–4 level deep navigation path (Work Orders → WO Detail → Task Card → Step / Finding) but no page in the path shows a breadcrumb. Users who navigate directly to a deep URL or return from a dialog have no spatial awareness. Adding breadcrumbs to all pages below `/work-orders/[id]` would significantly reduce "where am I?" confusion, particularly for role-based users (technicians) who access only deep pages.

### 6. Missing positive confirmation states
Several critical workflow completion points lack positive confirmation UI:
- WO ready to close: no green banner in the blocker area
- All steps complete on a task card: no call-out to prompt card-level sign-off
- RTS checklist all-pass: no "Go to Sign-Off" prompt
Positive states are as important as warning states in a safety-critical compliance workflow.

### 7. Role-based information density mismatch
The application serves technicians (shop floor, mobile, gloves on), lead technicians (desktop, management oversight), and QCM inspectors (audit trail focus). The WO detail page uses a single layout for all three. A technician performing step sign-off does not need WIP cost cards or compliance color indicators. A QCM inspector does not need the "Clock to WO" timer. Consider a role-aware view toggle that simplifies the WO detail page for technician use.

### 8. Date/time display inconsistency
Several pages mix UTC display (`formatDateUTC`, "Z" suffix timestamps), local display (`formatDate`), and raw ISO strings. This inconsistency is most visible when a user sees "Due Feb 28" on the WO list and "RTS Target: Feb 27" in the WO Dashboard — appearing to contradict each other because one uses UTC and one uses local timezone. Standardize on local timezone display with a single UTC "admin mode" toggle for debugging.
