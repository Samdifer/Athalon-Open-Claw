# UX Evaluation — Fleet & Parts Sections

**Evaluator:** UX/Usability Review Team 2
**Date:** 2026-03-12
**Scope:** All Fleet pages (10) and Parts pages (15)
**Method:** Static code review of all page files; no live browser session

---

## Scoring Guide

| Score | Meaning |
|---|---|
| 5 | Excellent — clear, consistent, complete |
| 4 | Good — minor friction, no blockers |
| 3 | Adequate — noticeable gaps, works for trained users |
| 2 | Problematic — confusion likely without documentation |
| 1 | Broken — significant UX failures or misleading UI |

---

## Section 1: Fleet (10 pages)

---

### `/fleet` — Fleet List

**File:** `app/(app)/fleet/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Comprehensive fleet roster with three view modes (list, tiles, truncated), multi-field filtering, FAA N-number lookup, CSV export, and Add Aircraft wizard.

**Issues:**

- `classifyAircraftStyle()` uses hardcoded make/model string matching (e.g. checking for "Cessna" or "Piper" substrings) — this will misclassify any aircraft whose make/model deviates from the expected casing or abbreviation
- FAA lookup dialog is embedded inline as a 200+ line component — it does not provide feedback when the FAA registry returns no result vs a network error; both conditions silently show empty results
- "Add Aircraft" wizard collects registration, make, model, customer association — there is no confirmation step before submission; the wizard submits on the final step's "Save" button without a review summary
- The "Truncated" view mode label is user-facing and will not be understood by most technicians; this is an internal layout term
- `resolveAircraftThumbnailUrl` falls back to demo image URLs — if an aircraft has no photo and the demo URL is unreachable, no broken-image fallback is shown

**Recommendations:**

- Replace hardcoded string matching in `classifyAircraftStyle()` with a proper aircraft class field on the aircraft record
- Rename "Truncated" view to "Compact" or "Dense" for clarity
- Add a review/confirm step to the Add Aircraft wizard
- Distinguish FAA lookup empty-result (aircraft not found) from network error with distinct messaging
- Add an `alt`-text or icon fallback for missing aircraft photos

---

### `/fleet/calendar` — Maintenance Calendar

**File:** `app/(app)/fleet/calendar/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5

**Summary:** Month-view grid of scheduled work orders with color-coded urgency and three filter controls; practical for schedule overview but drills down poorly.

**Issues:**

- "+N more" overflow links navigate to `/work-orders` (the full WO list) rather than a filtered or day-specific drill-down — the user loses their calendar context and lands in an unfiltered list
- Clicking a single event also navigates to the WO list, not to the specific work order detail; there is no direct deep-link from calendar event to WO detail
- The "Today" button only appears when navigated away from the current month; on first load it is hidden, which makes month navigation non-discoverable
- Filter state (WO status, event type, tail search) is not reflected in the URL — browser back/forward will reset filters
- No week or day views are available; a 30-day horizon is too coarse for scheduling technician labor

**Recommendations:**

- Make each calendar event a direct link to `/work-orders/[id]`
- Add a URL-synced `?month=YYYY-MM` param so the calendar is bookmarkable/shareable
- Show the "Today" button persistently (disabled or greyed when on the current month)
- Add a week-view toggle for daily scheduling resolution
- On "+N more" overflow, open a popover or modal listing that day's events with direct WO links

---

### `/fleet/predictions` — Predictive Maintenance

**File:** `app/(app)/fleet/predictions/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Predictive alert hub with severity tabs, 5 KPI cards, and confirmation dialogs for dismissing or resolving critical/high alerts; well-structured for shop manager review.

**Issues:**

- "Generate Predictions" is a manual button with no explanation of what triggers it, how long it takes, or whether it is destructive — technicians may hammer it repeatedly expecting faster results
- The `PredictionToOpportunityBanner` is a cross-module import from the CRM feature; this creates an invisible feature dependency — if the CRM feature is removed or restructured, predictive maintenance silently breaks
- Tab badge counts reflect filtered results only after BUG-DOM-066 fix, but the filter controls (aircraft, type, status) sit below the tabs — users filter then must scroll up to see updated tab counts
- Dismissed predictions are only accessible if the user explicitly selects "Acknowledged" status filter; there is no permanent audit trail page for prediction disposition history
- No bulk-action controls — dismissing or resolving 20 low-severity alerts requires 20 individual dialog confirmations

**Recommendations:**

- Add a short description tooltip or info text next to "Generate Predictions" explaining what it does and when to use it
- Decouple `PredictionToOpportunityBanner` behind a feature-flag prop or lazy import
- Move filter controls above the tabs, or repeat the active filter context below the tabs
- Add a "Select All (filtered)" + bulk dismiss/resolve action
- Add a prediction history/audit log page under the predictions route

---

### `/fleet/llp` — LLP Stoplight Grid

**File:** `app/(app)/fleet/llp/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Fleet-wide LLP status heat map showing worst-case % remaining per aircraft per LLP category; fast situational awareness for shop manager or QC inspector.

**Issues:**

- Black cells indicate overdue LLPs but there is no legend on the page — users new to the view will not know that black means overdue vs. a display error
- Clicking a cell navigates to `/fleet/[tail]/llp` (the per-aircraft LLP page) — it does not deep-link to the specific LLP category, so the user must re-orient within the destination page
- BUG-DOM-112 documents that `totalTracked` counts only installed parts — but the LLP grid also reflects only installed parts, which means a removed-and-warehoused LLP with hours accumulated is invisible until reinstalled
- The 3 KPI cards (fleet total, critical, warning) are above the grid but not visually connected to it — it is unclear whether those numbers count unique aircraft or unique LLP items
- No filtering or sorting is available; for a fleet of 30+ aircraft the grid becomes unwieldy

**Recommendations:**

- Add a color legend directly on the page (green / amber / red / black = overdue)
- Annotate KPI cards to clarify whether they count by aircraft or by LLP item
- Add a filter to show only aircraft with at least one red/black cell
- When the grid cell is clicked, pass a query param to the destination page to highlight or scroll to the relevant LLP category

---

### `/fleet/maintenance-programs` — Maintenance Programs List

**File:** `app/(app)/fleet/maintenance-programs/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5

**Summary:** Tabular list of inspection/maintenance program templates with inline active/inactive toggle and a 16-field add/edit dialog; functional but the dialog is dense.

**Issues:**

- The add/edit dialog has 16 fields on a single scrollable form with no section grouping — fields like "Trigger Logic", "Phase Inspection Toggle", and "Serial Scope" have no help text or examples; a first-time user cannot complete this form without documentation
- "Trigger Logic" is a free-text field accepting arbitrary strings — there is no validation or picker for standard logic expressions (calendar AND hours, OR cycles, etc.)
- The ATA chapter filter is a free-text input, not a select — users must know the numeric chapter code; there is no lookup or autocomplete
- Active/inactive row toggle uses `updateProgram` (correct after BUG-DOM-119 fix), but there is no visual confirmation of the toggle action — the row simply changes state silently
- No bulk-deactivate is available for retiring a class of programs (e.g., retiring all programs for an aircraft type leaving the fleet)

**Recommendations:**

- Group the 16-field dialog into logical sections: "Program Identity", "Interval Settings", "Scope & Parts", "Admin"
- Add help text or placeholder examples for Trigger Logic (e.g., "calendar_and_hours", "cycles_only")
- Replace ATA chapter free-text with a select or typeahead from a known ATA chapter list
- Show a brief toast confirmation when a program is toggled active/inactive
- Add an "ATA Chapter" column to the list table so programs are scannable without opening each record

---

### `/fleet/maintenance-programs/[id]` — Program Detail

**File:** `app/(app)/fleet/maintenance-programs/[id]/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5

**Summary:** Read-only program detail page with a due-date projection chart and level-loading chart; useful for planning but contains hardcoded assumptions.

**Issues:**

- `averageMonthlyHours: 35` is hardcoded for all fleet projections — this is the single most consequential assumption on the page and there is no UI to override it or see where the value comes from
- The `DueDateProjection` chart has no axis labels or scale visible in the component — the page provides no explanation of what the X/Y axes represent
- Fleet averages are computed from aircraft matching `aircraftType` — but if an aircraft has no hours logged, it silently contributes zero to the average, dragging projections artificially low
- No "Edit Program" action is accessible from this detail page — the user must navigate back to the list and open the edit dialog from there
- The back navigation is not explicit; the browser back button is the only way to return to the program list

**Recommendations:**

- Surface the `averageMonthlyHours` assumption as an editable or at minimum visible field on the page
- Add axis labels and a brief legend to both charts
- Exclude aircraft with zero hours from the fleet average calculation, or annotate their omission
- Add an "Edit Program" button on the detail page linking to or opening the edit dialog
- Add an explicit breadcrumb: Maintenance Programs > [Program Name]

---

### `/fleet/[tail]` — Aircraft Detail

**File:** `app/(app)/fleet/[tail]/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Six-tab aircraft detail page covering aircraft info, times/cycles, work orders, AD compliance, deferred maintenance, and logbook; deep-linked via `?tab=` param.

**Issues:**

- The Times & Cycles update dialog has two validation bugs fixed (BUG-DOM-070/071) but the TTAF update dialog still allows entering times lower than the previously recorded total — there is no warning for decreasing hour entries which could represent data entry errors
- Work Orders tab shows active/planned/past sections but the "planned" section is empty if no WOs are in `planned` status — the empty section heading still renders, creating visual noise
- CAMP integration status is displayed as a badge but there is no action to initiate or configure a CAMP integration from this page — it is display-only with no pathway to act on it
- The AD Compliance tab (`AircraftAdComplianceTab`) and Deferred Maintenance section each link independently to work order creation; there is no way to create a WO that addresses both an AD finding and a deferred item simultaneously
- The Logbook tab does not provide a "Print Logbook" shortcut from the aircraft detail page; users must navigate to the dedicated `/fleet/[tail]/logbook` page

**Recommendations:**

- Add a warning toast or inline error if a TTAF entry is lower than the previously recorded value
- Conditionally render the "Planned" section header only when planned WOs exist
- Add a "Configure CAMP" or "Learn more" link next to the CAMP status badge
- Consider a "Create WO from findings" multi-select pattern in AD Compliance and Deferred tabs
- Add a direct "Print Logbook" button on the aircraft detail page that deep-links to the logbook print view

---

### `/fleet/[tail]/llp` — Per-Aircraft LLP Detail

**File:** `app/(app)/fleet/[tail]/llp/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Per-aircraft LLP table sorted by % remaining (lowest first) with a stack-leader card and engine breakdown groupings; precise and well-ordered.

**Issues:**

- `calcCurrentAccumulated()` computes live accumulated values as aircraft total hours minus installation hours — if a part has been removed and reinstalled, prior accumulated time may not be carried forward correctly depending on how the schema tracks installation basis
- The stack leader card shows the most-critical LLP but does not link to the part record or provide a quick action (e.g., "Open Work Order" or "Flag for Replacement")
- Engine breakdown groupings are hardcoded by the position/tag on the part record — if a part has no engine assignment, it falls into an unlabeled group with no user-visible indication
- No edit action is available for LLP records from this page — updating hours or installation data requires navigating elsewhere
- There is no export or print capability for the LLP table, which is frequently needed for FAA audit presentations

**Recommendations:**

- Clarify accumulated-time computation for parts with multiple removal/reinstallation cycles in tooltips or a help section
- Make the stack leader card actionable (quick-link to create a replacement WO or flag the part)
- Label ungrouped parts explicitly as "Unassigned / Other"
- Add a print-optimized layout or PDF export for the LLP table
- Surface an inline edit action (at minimum for hours-at-installation) directly in the table

---

### `/fleet/[tail]/logbook` — Maintenance Logbook

**File:** `app/(app)/fleet/[tail]/logbook/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5

**Summary:** Reverse-chronological maintenance logbook with type filter, date range, keyword search, CFR citation badges, and correction entry cross-referencing; the regulatory accuracy here is strong.

**Issues:**

- Long "work performed" text is truncated at an arbitrary character limit with an expand toggle — the truncation threshold is not documented and may cut off critical airworthiness language mid-sentence during an FAA audit review
- No "Add Logbook Entry" button is visible on this page — entries appear to be created from work order closeout only, but this is not communicated to the user
- The keyword search (BUG-DOM-099) operates client-side on already-loaded records; for fleets with large logbook histories this will miss older records that are not in the current query window
- Correction entries show amended sequence numbers (BUG-DOM-067) but do not visually link back to the original errored entry — the user must manually search for the original
- No print or export action is available from this page; logbook entries must be printed from the work order closeout workflow

**Recommendations:**

- Set truncation at a sentence boundary or paragraph break, not a character count; or increase the visible threshold significantly for regulatory text
- Add a visible "Add Entry" button (or explain in empty/help text that entries come from WO closeout)
- Add a "View Original Entry" link on correction entries that jumps to the corrected record
- Add a "Print Logbook" / "Export to PDF" action with date range filter support
- Consider paginating or virtualizing the logbook timeline for large datasets

---

### `/fleet/[tail]/adsb` — ADS-B Flight Sessions

**File:** `app/(app)/fleet/[tail]/adsb/page.tsx`
**Usability:** 2/5 | **Logic:** 1/5

**Summary:** ADS-B flight session page that is entirely hardcoded demo data — three sessions with hardcoded timestamps and airports, `status="paused"`, and a hardcoded ICAO hex value.

**Issues:**

- The page presents fabricated flight data as if it were live — there is no visible indicator that this is demo/placeholder data, creating a significant trust and accuracy risk in a Part 145 environment
- `ADSBSyncStatus` shows `status="paused"` permanently regardless of actual integration state
- The ICAO hex value is hardcoded and will not match the actual aircraft being viewed
- "API integration not yet live in Convex" is noted only in a code comment — there is no in-page notice to the user
- `ADSBUtilizationComparison` component is rendered with hardcoded data — any utilization insights shown are fabricated

**Recommendations:**

- Replace all hardcoded data with a loading/not-configured state that clearly labels this as "Coming Soon" or "Integration not configured"
- Add a prominent banner: "ADS-B integration is not yet active. Data shown is for demonstration only."
- Gate the page with a feature flag or hide it from the sidebar until the API is live
- When the real API is integrated, use the aircraft's actual ICAO hex from its record
- Do not render `ADSBUtilizationComparison` with fake data in production — it undermines operator trust in the platform

---

## Section 2: Parts (15 pages)

---

### `/parts` — Parts Inventory Hub

**File:** `app/(app)/parts/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5

**Summary:** The central parts hub with 10-tab filtering, 4 view modes, barcode/QR scanning, print labels, reserve/issue/return part dialogs, and a kanban view; ambitious scope but the implementation depth is uneven.

**Issues:**

- `"use client"` directive at line 1 is a Next.js artifact — it is harmless in Vite but semantically incorrect and signals legacy code to future maintainers
- 10 tabs on a single page creates a wide tab bar that will overflow or require horizontal scroll on smaller viewports; several tabs (inventory_master, kanban, parts_requests) represent distinct workflows that would justify their own routes
- Parts requests form uses `localStorage` persistence keyed by `orgId` — if the same user opens two browser tabs, form state will conflict; additionally, localStorage-persisted requests bypass the Convex backend entirely until explicitly submitted
- The "Part Return" dialog uses localStorage-based state — returned parts may exist in localStorage but not in the database, creating a phantom inventory situation on page reload
- `useSelectedLocation` multi-location filter is present but there is no visible indication of which location is currently active; switching locations silently changes what inventory is displayed

**Recommendations:**

- Remove the `"use client"` directive
- Split kanban, inventory master, and parts requests into dedicated sub-routes (see section-level consolidation analysis below)
- Replace localStorage-based form persistence with Convex draft mutations or at minimum a clear "unsaved draft" indicator
- Make the active location selection persistent and visible in the page header
- Reduce the tab bar to 5-6 maximum tabs; use a "More" dropdown or dedicated sub-pages for less-frequent workflows

---

### `/parts/new` — Receive Part (Form)

**File:** `app/(app)/parts/new/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5

**Summary:** Progressive-disclosure receive part form with collapsible sections for LLP data, shelf life, FAA 8130-3, and warehouse bin; regulatory field labeling is excellent.

**Issues:**

- The FAA 8130-3 section uses block references ("Block 3", "Block 5", etc.) which are accurate for certificated parts clerks but opaque to technicians who have not handled 8130-3 paperwork
- Post-submit success banner offers three actions ("Receive another", "Receiving Queue", "View Inventory") but the primary workflow in a receiving dock is always "Receive another" — this action is not visually emphasized over the others
- The form does not validate part number format against any standard (e.g., AN, MS, NAS, manufacturer P/N) — a typo will create an incorrect part record with no warning
- Shelf life and LLP sections are collapsed by default — a parts clerk receiving a known life-limited part must remember to expand these sections; there is no auto-suggest based on part number pattern recognition
- No duplicate detection: if the same P/N + S/N already exists in inventory, the form will create a second record without warning

**Recommendations:**

- Add a tooltip or help text on 8130-3 block references explaining what information belongs in each block
- Make "Receive another" the primary (filled) button; demote "View Inventory" to a secondary link
- Add a P/N lookup/typeahead that checks existing parts catalog to flag potential duplicates
- Consider an optional "Part Type" selector (consumable / rotable / life-limited / standard) at the top of the form that auto-expands the relevant sections
- Add a warning when submitting if a matching P/N + S/N already exists in pending or inventory status

---

### `/parts/requests` — Parts Request Queue

**File:** `app/(app)/parts/requests/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5

**Summary:** Combined queue for open WO part requests, pending inspection parts, removed-pending-disposition parts, catalog search intake, and part return queue — five distinct workflows on one page.

**Issues:**

- `(api as any)` casting for `api.workOrderParts.listOpenRequests` is a TypeScript bypass that hides a real type mismatch; if the API signature changes, this will fail silently at runtime
- The page combines five unrelated workflows (WO requests, inspection queue, disposition queue, catalog search, return queue) — a parts clerk must cognitively context-switch between workflows without clear visual separation
- `InspectDialog` is duplicated here and in `parts/page.tsx` — two components with the same name, likely the same function, living separately; divergence over time is a maintenance risk
- Part return queue is localStorage-backed (same issue as main parts page) — return intents may disappear on page reload before the parts clerk processes them
- No pagination or virtualization is present; a shop with large WO part request backlogs will load the entire list at once

**Recommendations:**

- Fix the `(api as any)` cast by aligning the API type definition
- Extract the Inspect dialog into a shared component used by both pages
- Split this page into two: "Work Order Parts Queue" and "Receiving Queue" (pending inspection + disposition)
- Replace localStorage return queue with a Convex-backed draft return table
- Add pagination or an infinite scroll pattern for the WO parts requests list

---

### `/parts/receiving` — Receiving Hub

**File:** `app/(app)/parts/receiving/page.tsx`
**Usability:** 3/5 | **Logic:** 3/5

**Summary:** Thin 49-line wrapper that renders a PO receiving banner and the `ReceivingInspection` component; the page has minimal independent value.

**Issues:**

- The page is a near-empty wrapper — its only distinctive content is a single banner card linking to `/parts/receiving/po`; the actual receiving workflow lives in two separate locations (`/parts/new` and `/parts/receiving/po`)
- `ReceivingInspection` is a component rendered here but it is unclear from the page's structure whether this is a standalone inspection workflow or a sub-component of the PO receiving process — the relationship is implicit
- The receiving workflow is split across three routes (`/parts/new`, `/parts/receiving`, `/parts/receiving/po`) with no breadcrumb or step indicator connecting them
- No parts in `pending_inspection` status are surfaced here even though receiving implies inspection is needed — the parts clerk must navigate back to `/parts/requests` to find them

**Recommendations:**

- Merge the receiving hub into the parts requests page as a "Receiving" tab, or give it real content (e.g., show all parts in `pending_inspection` directly)
- Add a clear step navigation: "Receive via PO → Inspect → Move to Inventory"
- Add a quick summary of parts awaiting inspection directly on this page
- Evaluate whether this route needs to exist independently or whether `/parts/receiving/po` should be the primary entry point

---

### `/parts/receiving/po` — PO Receiving Wizard

**File:** `app/(app)/parts/receiving/po/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5

**Summary:** Multi-step PO receiving wizard (Select PO → Enter Data → Review → Success) that correctly creates parts in `pending_inspection` status per INV-23; one of the strongest parts workflows in the module.

**Issues:**

- The wizard has no "Save Draft" capability — if a parts clerk is interrupted mid-receiving (e.g., a phone call, a shift change), all entered data is lost on navigation away
- Step 1 (Select PO) shows the full PO list without any search or filter — for shops with dozens of open POs, the clerk must scroll through the entire list
- The review step does not show which bin locations were entered per part line — the clerk cannot verify warehouse placement before final submission
- Quantity variance handling (receiving fewer than PO quantity) is not clearly communicated — the form accepts partial quantities but does not explain what happens to the unfulfilled line
- No attachment capability exists within the wizard — the parts clerk cannot attach the packing slip or certificate of conformance during the receiving workflow

**Recommendations:**

- Add a search/filter input to the PO selection step
- Show bin location assignments on the review step
- Add inline help text explaining partial quantity behavior ("remaining units will stay as open on the PO")
- Add a packing slip / document attachment step between data entry and review
- Persist wizard state to sessionStorage or a Convex draft record to survive navigation interruptions

---

### `/parts/tools` — Tool Crib

**File:** `app/(app)/parts/tools/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Tool crib management with check-out/check-in, calibration workflow, QR code generation, and two-tab view (Inventory / Calibration Due); well-structured for a shop tool room.

**Issues:**

- Check-out dialog requires a technician but the technician list is loaded from Convex — if the org has many technicians, the select dropdown becomes unwieldy; there is no search-within-select
- "Send for Calibration" and "Complete Calibration" are separate dialog actions but there is no intermediate state for "received back from calibration lab" before it is marked complete — the workflow skips the physical receipt step
- QR code dialog shows only the QR code with no surrounding context (tool P/N, description, serial number) — scanning the code is the only way to identify the tool from the printout
- The Calibration Due tab sorts by days remaining but does not distinguish between tools whose calibration is overdue (past due date) vs. upcoming — both are listed together with only the color code differentiating them
- No historical log of who checked out a tool and when — the audit trail is invisible once a tool is checked back in

**Recommendations:**

- Add a "Returned from Cal Lab" intermediate state in the calibration workflow before "Complete Calibration"
- Add a searchable select or typeahead for the technician field in the check-out dialog
- Include tool metadata (P/N, description, S/N) on the QR code printout label
- Add explicit "Overdue" and "Due Soon" sections or labels on the Calibration Due tab
- Add a check-out history tab or expandable row showing past check-out/in records per tool

---

### `/parts/cores` — Core Return Tracking

**File:** `app/(app)/parts/cores/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Core return lifecycle tracking with status tabs, an overdue alert banner, and a step-progression dialog (Received → Inspected → Credit Issued / Scrapped); clear workflow logic.

**Issues:**

- The credit amount input in the Issue Credit step has no currency formatting or validation — entering "1000" vs "1,000.00" vs "1000.00" are all accepted silently; this could create accounting discrepancies
- Once a core is marked "Scrapped" it disappears from active views — there is no archive or audit tab for scrapped cores, which may be needed for vendor dispute resolution
- The overdue alert banner shows a count of overdue cores but does not name which cores are overdue — the user must switch to the "Overdue" tab to discover them
- BUG-PC-HUNT-108 fixes global stats to reflect total counts, but the stat cards do not refresh after a status transition without a page reload in some edge cases (depending on Convex subscription timing)
- No bulk-action for processing multiple returned cores from the same vendor simultaneously

**Recommendations:**

- Add currency formatting and a minimum/maximum value validation to the credit amount input
- Add an "All (including scrapped)" archive view or a separate Scrapped tab for audit purposes
- Make the overdue alert banner clickable to filter the list to overdue cores directly
- Add a bulk-receive action for cores from the same vendor/PO
- Show credit amount history in the CoreDetailDialog for cores that have had credits issued then revised

---

### `/parts/inventory-count` — Physical Inventory Count

**File:** `app/(app)/parts/inventory-count/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Physical inventory count sessions with list → detail drill-down, inline actual qty entry, progress tracking, and a destructive reconcile action with confirmation; the reconcile safeguard is good.

**Issues:**

- The "Reconcile" action is described as destructive and irreversible — but the confirmation dialog does not show the user what the reconciliation will change (i.e., which items have variances and will be adjusted)
- Inline actual qty fields are only editable in `in_progress` status — if a count session is accidentally completed before all items are counted, there is no way to reopen it
- The progress bar and stat cards show percentage-complete but do not distinguish between "counted and matched" vs "counted with variance" — both appear as "counted" in the progress metric
- `window.print()` is used for print — the print layout is not optimized; a standard browser print of a complex inventory table will produce poor results
- Count sessions have no name or label — if multiple sessions are created in the same month, they are indistinguishable in the list view except by timestamp

**Recommendations:**

- Show a variance summary ("N items with differences totaling X units") before the reconcile confirmation
- Add a "Reopen Count" action for recently completed sessions (within a configurable time window, admin-only)
- Break out "counted/matched" vs "counted/variance" in the progress stats
- Implement a dedicated print layout using CSS print media queries for the count sheet
- Require a session name or label when creating a new count session

---

### `/parts/shipping` — Shipping & Receiving

**File:** `app/(app)/parts/shipping/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Outbound/inbound shipment tracking with status progression, expandable detail rows, and a toast-with-action linking inbound deliveries to the receiving workflow; the cross-module nav here is handled well.

**Issues:**

- Inbound and outbound shipments are mixed in the same list with no default filter to separate them — a shipping coordinator managing outbound logistics must manually filter to exclude inbound records
- The "Deliver" confirmation dialog has no field for entering actual delivery date/time — the system records the mutation timestamp, which may not match the actual delivery date on the packing slip
- Shipment cancellation (BUG-PC-HUNT-143 fix requiring carrier or tracking number) is a good guard, but there is no soft-delete or "void" state — cancelled shipments disappear from active views; they should remain auditable
- No attachment capability for shipping documents (bill of lading, packing list, hazmat paperwork) within the shipment record
- The expandable row `ShipmentDetails` sub-component renders items but does not show the item's current location in inventory after delivery

**Recommendations:**

- Add a default tab or toggle to separate inbound vs. outbound shipments
- Add an actual delivery date/time field in the "Mark Delivered" dialog
- Keep cancelled shipments visible in a "Cancelled" tab for audit purposes
- Add document attachment capability to shipment records
- After marking a shipment delivered, show each item's resulting inventory status in the detail view

---

### `/parts/rotables` — Rotable Components

**File:** `app/(app)/parts/rotables/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5

**Summary:** Rotable component lifecycle management with TBO progress bars, status tabs, and an append-only history per component; action AlertDialogs prevent accidental state transitions.

**Issues:**

- The TBO bar visualization shows % of TBO consumed but does not display actual remaining hours/cycles as a number — users must mentally calculate from the bar width
- "Condemn" action has a safety copy requirement (BUG-PC-087) which is good, but the condemned component then disappears from active views — there is no permanent condemned archive; a physical condemned parts tag/log is a 14 CFR 43.10 requirement
- "Send to Vendor" and "Receive from Vendor" are actions on the history form but the vendor is entered as free text — it is not linked to the `vendors` table; this creates unstructured data that cannot be reported on
- Loaned-out rotables (status `loaned_out`) have no due-back date or customer link visible in the main table — identifying overdue loaners requires opening each record
- `RotableHistory` sub-component is rendered inline in the expanded row — for components with long histories, this creates a very tall row that disrupts table scanning

**Recommendations:**

- Show remaining hours/cycles as a number alongside the TBO bar
- Add a "Condemned" archive tab and ensure condemned records are never hard-deleted
- Link vendor selection in the "Send to Vendor" action to the vendors table (selector, not free text)
- Add a due-back date column for loaned-out rotables in the main table
- Paginate or cap `RotableHistory` in the expanded row with a "View all history" link to a dedicated history view

---

### `/parts/loaners` — Rental & Loaner Tracking

**File:** `app/(app)/parts/loaners/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Loaner item tracking with overdue detection, loan-out and return dialogs with condition baselines, customer linking, and actionable empty states; customer condition-at-loan capture is a sound dispute-prevention pattern.

**Issues:**

- Condition notes are required at loan-out and return — but the baseline condition at loan-out is compared to return condition only informally; there is no structured condition scoring or diff visualization
- Overdue detection relies on `isOverdue()` client-side, but there is no automated notification or alert banner — overdue loaners are only surfaced if the user navigates to the overdue sub-tab
- The customer selector in the Loan Out dialog pulls from the billing module — if a customer is not yet in the billing system, the loaner cannot be issued without first creating a customer record
- Retired items (status `retired`) are visible in the list but there is no pathway to un-retire an item if it was retired by mistake
- No tracking of loaner replacement cost or deposit amount — if an item is returned damaged, there is no dollar-amount field to capture the damage claim

**Recommendations:**

- Add a structured condition scale (e.g., Excellent / Good / Fair / Damaged) alongside free-text notes for condition at loan/return
- Add an overdue alert banner on the main loaners page (visible without switching tabs) similar to the pattern used in `/parts/cores`
- Allow ad-hoc customer creation from within the Loan Out dialog (like the Vendor quick-create in VendorServicePickerModal)
- Add an "Undo Retire" action within a short time window (admin-only)
- Add an optional deposit/replacement-cost field to the Loan Out dialog

---

### `/parts/alerts` — Inventory Alerts Hub

**File:** `app/(app)/parts/alerts/page.tsx`
**Usability:** 4/5 | **Logic:** 5/5

**Summary:** Proactive alert hub for shelf life, reorder thresholds, and calibration due; auto-selects the highest-priority tab on load, with "Create PO" pre-fill for reorder alerts — the cross-module navigation is a high point.

**Issues:**

- The default tab auto-selection logic runs on load — if a user manually navigates to the Shelf Life tab and then refreshes, the tab resets to whatever has the most alerts, ignoring user intent
- Shelf life bands (expired / 0-30d / 30-60d / 60-90d) are useful but the page does not provide a bulk "quarantine expired items" action — each expired item requires individual intervention
- Calibration Due tab links to `/parts/tools` generally, not to the specific tool record — the user must search again to find the right tool
- The "Create PO" action pre-fills part number in a query param but there is no indication on the alerts page where it will navigate — the button behavior is not self-describing
- No snooze or acknowledge function — an alert for a part ordered but not yet received will continue to show as a reorder alert until the PO receiving workflow clears it

**Recommendations:**

- Add a URL param (`?tab=shelf-life`) to preserve the active tab across page reloads
- Add a bulk "Quarantine All Expired" action with a confirmation dialog
- Make calibration alert rows link directly to the tool record at `/parts/tools?toolId=[id]`
- Rename or annotate the "Create PO" button to "Create PO for this part" or add a tooltip
- Add an acknowledgement/snooze state per alert item so already-actioned alerts are visually distinguished

---

### `/parts/lots` — Lots & Batches

**File:** `app/(app)/parts/lots/page.tsx`
**Usability:** 4/5 | **Logic:** 4/5

**Summary:** Consumable lot management with condition tabs, search, a create-lot dialog (with BUG-HUNT-114 vendor selector fix), and a slide-over detail sheet with Documents/Parts/History tabs.

**Issues:**

- The Lot History tab in the detail sheet is explicitly a placeholder ("Lot activity history coming soon") — this is a live production page; a placeholder tab that opens in an MRO audit context is potentially compliance-impacting
- `vendorName` is accessed via a runtime cast (`(lot as Record<string, unknown>).vendorName`) — this suggests the Convex query returns a joined field that is not properly typed; if the join is removed or renamed, the vendor column will silently become empty
- The lot quantity is expressed as `remainingQuantity / originalQuantity` but there is no "issued quantity" or "consumed quantity" metric — a shop floor user cannot tell at a glance how much has been used vs. how much was received
- No "Issue from Lot" action is available from the lots page — the user must find the lot elsewhere in the parts workflow; the lots page is read-only for most operations
- Shelf life warning threshold (30 days) is hardcoded in the table row rendering — it does not match the configurable threshold from `/parts/alerts`

**Recommendations:**

- Replace the History placeholder with at minimum a list of parts issued from the lot (which is already available in the "Parts" tab) or remove the History tab until it is implemented
- Type the Convex query return properly to include `vendorName` as a typed field
- Add a computed "issued quantity" column or summary metric
- Add an "Issue from Lot" quick action from the lot detail sheet
- Align the shelf life warning threshold with the configurable setting from the alerts module

---

### `/parts/tags` — Parts Tags Management

**File:** `app/(app)/parts/tags/page.tsx`
**Usability:** 3/5 | **Logic:** 4/5

**Summary:** Hierarchical tag category management with system and custom categories, auto-slug generation, and a seed-to-initialize workflow for system categories; functional admin tooling.

**Issues:**

- The page is administrative configuration — it is placed in the parts section alongside operational tools (loaners, shipping, inventory count), creating navigation confusion; a technician doing daily parts work does not need this page
- The slug field is auto-generated and editable, but there is no validation for uniqueness at input time — a duplicate slug will fail at the Convex mutation level with a generic error, not a pre-emptive UI warning
- "Initialize Default Categories" seed operation has no preview of what will be created — clicking it is a blind action; the user does not know how many categories or which category names will be generated
- The `TagListTable` and `TagCategoryTabs` components are extracted into `_components/` sub-files but the page itself has no meaningful empty state for the case where a category exists but has no tags — the table simply renders empty
- No reorder capability for categories — `displayOrder` is set at creation time as `categories.length + 1` but cannot be changed via the UI

**Recommendations:**

- Move Parts Tags to a Settings or Configuration section rather than the parts operational sidebar
- Add client-side slug uniqueness validation against the existing categories list before form submission
- Show a preview of default categories before the seed action ("This will create: Aircraft Type, Engine Type, ATA Chapter, Component Type")
- Add a "No tags yet" empty state in `TagListTable` with a clear CTA to add the first tag
- Add drag-and-drop or arrow-key reordering for category display order

---

## Cross-Cutting Analysis

### Parts Receiving-to-Stock Workflow

The parts receiving workflow is functionally complete but split across three disconnected routes:

1. **PO Receiving** (`/parts/receiving/po`) — multi-step wizard, strongest implementation
2. **Ad-hoc Receiving** (`/parts/new`) — single-item form, excellent form design
3. **Receiving Hub** (`/parts/receiving`) — thin wrapper with no independent value

Parts created at step 1 or 2 land in `pending_inspection` status. To move them to inventory, the parts clerk must:
- Navigate to `/parts/requests` (which shows pending inspection items)
- Find the part in the inspection queue
- Open the inspect dialog
- Update the status

This is a 4-page journey with no breadcrumb or wizard to guide it. The transition from receiving to inspection to stocking should be a unified workflow with a visible progress state. The current implementation requires a trained user who already knows the system.

**Recommendation:** Create a "Receiving Workflow" unified entry point that shows: (1) PO receiving in progress, (2) Parts awaiting inspection, (3) Parts cleared for stocking — all visible from one page with inline actions.

---

### Fleet Maintenance Planning

The fleet maintenance planning surface is spread across:
- `/fleet/maintenance-programs` — program templates
- `/fleet/predictions` — predictive alert generation
- `/fleet/calendar` — schedule visualization
- `/fleet/[tail]` (Work Orders tab) — per-aircraft WO history

There is no unified "planning dashboard" that shows: which aircraft need upcoming maintenance, which programs are due when, what labor capacity is available, and what WOs are already planned. The four pages each show a slice of this picture but do not compose into a planning tool. A shop manager planning the next 30 days must visit all four pages and mentally aggregate the information.

**Recommendation:** Create a `/fleet/planning` dashboard that aggregates predictions, program due dates, and calendar events into a single prioritized work queue with "Create WO" shortcuts.

---

### Cross-Module Navigation: Fleet ↔ Parts ↔ Work Orders

The app has several implicit cross-module links:
- Fleet detail → Work Orders (via WO tab) ✓
- Fleet AD Compliance → Work Order creation ✓
- Inbound shipping delivery → Receiving workflow (toast with action) ✓
- Inventory Alerts → Create PO (query param pre-fill) ✓
- Predictive Maintenance → CRM opportunity (via `PredictionToOpportunityBanner`) ✓

Missing cross-module links:
- Work Order → Parts issued for that WO (visible in WO detail, but no reverse link from part record to WO)
- Fleet LLP near-limit → Parts replacement request (no quick action from LLP page)
- Parts receiving → Fleet install (no workflow to associate received part directly to an aircraft)
- Rotable at vendor → Expected return date on fleet maintenance calendar

The existing links are well-implemented. The missing links are the ones most needed for an MRO operator's daily workflow.

---

### Data Table Patterns

The codebase is consistent in using the shadcn/ui `<Table>` primitive across almost all list views. Key observations:

- **Sorting:** Implemented in fleet list, absent from most parts tables (tools, lots, loaners, shipping). Users cannot sort by critical columns like quantity, expiry date, or value.
- **Pagination:** Not implemented anywhere. All tables load the full dataset. This will become a performance and usability issue at scale (500+ parts, 100+ work orders).
- **Column density:** Most tables have 6-9 columns — appropriate for a desktop MRO app. The parts main list at 10 tabs is the outlier.
- **Row actions:** Consistent pattern of using inline buttons or expandable rows for actions. Good.
- **Empty states:** `ActionableEmptyState` component is used consistently on most pages. Tags page has a gap.

**Recommendation:** Add sort controls to all parts tables where sort order is meaningful (expiry date, quantity, value). Implement pagination or virtual scrolling before public launch — the Convex `listLots`, `listParts`, etc. queries have no page size limit.

---

### Form Design

Form design is strong overall, with several best practices in place:
- `maxLength` constraints on text inputs (lots, loaners, rotables)
- Required field markers (`*`) and `toast.error` validation feedback
- Loading spinners on async submit buttons (prevents double-submit)
- Form reset on dialog close (BUG-DOM-117 pattern)

Gaps:
- Date input fields use native `<input type="date">` — no calendar picker, which is inconsistent with other shadcn date-picker usage in the app
- Currency fields (credit amounts, core values, rotable values) lack formatting
- Several large dialogs (maintenance programs, vendor service picker, WO creation) are single-scroll forms that could benefit from stepped or tabbed layouts

---

### Are 15 Parts Sub-Pages Justified?

The 15 parts pages cover genuinely distinct domain concepts. However, the current organization conflates:
- **Operational tools** (inventory, receiving, shipping, loaners, tools, cores, rotables, alerts) — these are daily-use pages that belong in the main parts sidebar
- **Configuration tools** (tags) — this belongs in org settings, not the parts sidebar
- **Thin wrappers** (receiving hub at `/parts/receiving`) — this route adds navigation overhead without adding UI value

Recommended consolidation:
1. Remove `/parts/receiving` as a standalone route; merge its content into `/parts/requests` as a "Receiving" tab
2. Move `/parts/tags` to `/settings/parts/tags` or an equivalent configuration area
3. Merge `/parts/alerts` alerts into contextual banners on the relevant pages (shelf life alert on the inventory page, calibration due on the tools page) rather than requiring a separate navigation destination — or keep it as a hub but link to it from relevant pages

This would reduce the parts sidebar to 12 routes while preserving all functionality. The remaining 12 are all justified by the distinct operational scope they cover.

---

## Section Summaries

### Fleet — Overall Assessment

**Strengths:**
- Strong per-aircraft detail page with deep-linked tabs and regulatory completeness
- LLP stoplight grid is a high-value situational awareness tool
- Logbook implementation is accurate to FAA CFR requirements
- Predictions page handles severity filtering and bulk alert management well

**Critical Issues:**
- ADS-B page (`/fleet/[tail]/adsb`) presents hardcoded demo data as live data — this is the single highest-priority fix in the fleet section; it must either be gated or show an unmistakable placeholder state
- Fleet calendar drill-down is broken ("+N more" links to unfiltered WO list, not a day view or filtered list)
- No unified planning dashboard — maintenance planning requires visiting 4+ separate pages

**Fleet Average Scores — Usability: 3.6/5 | Logic: 3.7/5**

---

### Parts — Overall Assessment

**Strengths:**
- PO receiving wizard is well-designed with clear step progression and correct INV-23 compliance
- Parts alerts hub with auto-tab selection and cross-module "Create PO" action is a strong UX pattern
- Core return lifecycle with step-progression dialog is clear and operationally accurate
- Lots & batches page correctly addresses traceability requirements for 14 CFR 145.211

**Critical Issues:**
- Receiving-to-stock workflow is fragmented across 3 routes with no unified progress indicator
- Main parts page has 10 tabs on a single page — overwhelming for new users; kanban and inventory master should be sub-routes
- localStorage-backed parts requests and return queue create phantom data risks
- Tags page is misplaced in the operational parts sidebar

**Parts Average Scores — Usability: 3.7/5 | Logic: 4.1/5**

---

*End of Evaluation — Fleet & Parts Sections*
*Document generated: 2026-03-12*
