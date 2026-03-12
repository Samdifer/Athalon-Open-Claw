# UX Evaluation — Billing & Sales Module
**Team 4 · Athelon MRO SaaS**
**Evaluation Date:** 2026-03-12
**Evaluator:** Agent UX Review Pass (automated, full-source read)

---

## Scope

This evaluation covers all pages in the `/billing` and `/sales` route groups plus the shared Quote Workspace component system. Each page was read at the source level; scores and observations are based on the implemented code, not a running application.

**Pages evaluated:** 32 total
- Billing sub-pages: 25
- Sales sub-pages: 3
- Quote workspace components: evaluated as a unified system (4 page entry points)

---

## Evaluation Criteria

Each entry uses the following schema:

- **Route:** URL path
- **File:** Source file relative to `apps/athelon-app/`
- **Usability (1–5):** How easy is it for a billing user to understand and operate this page?
- **Logic (1–5):** Does the data model, state machine, and workflow make domain sense?
- **Summary:** What the page does and overall quality judgment
- **Issues:** Specific problems found
- **Recommendations:** Prioritized improvements

---

## SECTION 1 — Customer Management

---

### 1.1 Customer List

- **Route:** `/billing/customers`
- **File:** `app/(app)/billing/customers/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** A 7-column table of billing customers with responsive mobile/desktop views and customer type badges (individual, company, charter_operator, flight_school, government). The split view is a clean pattern. Mobile uses a card layout with phone shown as actionable link. The search field is functional but the commented-out BUG-FD-004 indicates phone search was specifically broken and de-scoped.

**Issues:**
- No balance column — billing users cannot triage collections without navigating into each customer
- No type filter — charter operators and flight schools cannot be isolated for segment-specific workflows
- No sorting on any column
- BUG-FD-004: phone search silently excluded; no in-UI indication that phone is not searchable
- "Add Customer" navigates to a new page form rather than a dialog, breaking the list context

**Recommendations:**
- Add an outstanding balance column with color-coded aging indicator (green/amber/red)
- Add type filter as a segmented control or multi-select above the table
- Add column-header sort on name and balance
- Fix or surface BUG-FD-004 — either restore phone search or add a tooltip noting search is name-only
- Consider a quick-create dialog instead of a full-page form for common cases

---

### 1.2 Customer Detail

- **Route:** `/billing/customers/:id`
- **File:** `app/(app)/billing/customers/[id]/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** A 6-tab customer record covering Profile, Aircraft, Work Orders, Quotes, Invoices, and Notes. Rich inline Convex queries provide live data across all tabs. The tabs are logically ordered from identity to transactional history. Customer type badge on the header is useful.

**Issues:**
- File is very large (~59 KB); significant cognitive surface area for a page component
- No "create invoice for this customer" shortcut from within the customer record
- No outstanding balance total displayed prominently at the top of the page — key metric for billing context
- Aircraft tab does not distinguish between aircraft by registration clearly on small screens
- Notes tab uses a flat textarea; no threaded/timestamped notes visible at a glance

**Recommendations:**
- Add a header KPI strip showing: total outstanding, oldest invoice date, last payment date
- Add a "New Invoice" and "New Quote" shortcut button in the header actions area
- Extract large tab components to co-located `_components/` files to reduce page file size
- Add note timestamps to the Notes tab; format notes as a feed, not a free-text blob

---

## SECTION 2 — Invoices

---

### 2.1 Invoice List

- **Route:** `/billing/invoices`
- **File:** `app/(app)/billing/invoices/page.tsx`
- **Usability: 5**
- **Logic: 5**

**Summary:** Best page in the billing module. Status tabs with badge counts (ALL/DRAFT/SENT/PARTIAL/PAID/VOID), sort controls on date and amount, checkbox multi-select with a floating batch action bar, VoidBatchDialog, and BatchPaymentDialog. Overdue and aging badges improve collections visibility. CSV export present. The floating bar pattern is ergonomic for batch workflows.

**Issues:**
- Batch void and batch payment are available but batch "send" (mark as sent) is not present — an asymmetric gap
- No date range filter — filtering by billing period requires manual scrolling
- Invoice aging buckets shown as badges but are not filterable as standalone views

**Recommendations:**
- Add batch "Send" action to the floating bar to match batch void and payment
- Add a date-range picker filter (month/quarter/custom) above the table
- Consider adding an "Overdue" quick filter tab alongside the status tabs

---

### 2.2 New Invoice

- **Route:** `/billing/invoices/new`
- **File:** `app/(app)/billing/invoices/new/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Mode selector (From Work Order vs Manual), with an "enhanced generation" toggle that pulls labor hours, parts, and discrepancies from the selected work order via WorkSummaryPanel. Tax rate selector included. The WO-linked mode is genuinely useful for MRO workflows.

**Issues:**
- "Enhanced generation" is unexplained jargon — billing users unfamiliar with the term will not know what to toggle
- No preview of the generated invoice before creation
- Mode selector is a full-page binary choice; first-time users have no guidance on which to use
- No breadcrumb back to the invoice list

**Recommendations:**
- Rename "Enhanced generation" to something explicit like "Auto-populate from work order labor and parts"
- Add a tooltip or inline description to the mode selector explaining when each is appropriate
- Add a preview step before final creation
- Add a breadcrumb or back link at the top of the page

---

### 2.3 Invoice Detail

- **Route:** `/billing/invoices/:id`
- **File:** `app/(app)/billing/invoices/[id]/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Full invoice lifecycle page with 7+ state dialogs (record payment, void, due date change, edit line item, delete line item, add line item, partial payment). PDF download and print present. Status machine appears complete. File is large (~52 KB) but well-structured.

**Issues:**
- 7+ active dialogs creates significant cognitive overhead; some actions (edit line item, delete line item) could be inline table actions instead
- No "Duplicate Invoice" shortcut for repeat work scenarios
- No link to the originating work order from the invoice header (if WO-linked)
- Payment recording does not validate that payment amount does not exceed balance due (unless handled in backend)

**Recommendations:**
- Convert edit and delete line item actions to inline table row controls (pencil/trash icons) to reduce dialog count
- Add a "Duplicate" action for repeat invoice generation
- Add a WO reference link in the invoice header when `workOrderId` is present
- Add client-side validation guard on payment amount exceeding balance

---

## SECTION 3 — Purchase Orders

---

### 3.1 PO List

- **Route:** `/billing/purchase-orders`
- **File:** `app/(app)/billing/purchase-orders/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Status-tabbed PO list (DRAFT/SUBMITTED/PARTIAL/RECEIVED/CLOSED) with vendor name lookup map and CSV export. The status tabs follow the PO lifecycle correctly.

**Issues:**
- No search — finding a specific PO by part number or vendor requires visual scan
- No date range filter for high-volume shops
- Vendor column shows raw vendor ID if lookup map fails to resolve (no graceful fallback)

**Recommendations:**
- Add a search input filtering on PO number, vendor name, and part description
- Add a graceful fallback for unresolved vendor IDs (e.g., "Unknown Vendor (#...)")
- Add date range filter

---

### 3.2 New PO

- **Route:** `/billing/purchase-orders/new`
- **File:** `app/(app)/billing/purchase-orders/new/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Well-structured PO creation form with `PartNumberCombobox` integration for part lookup, live subtotal calculation, and a DRAFT status indicator. Parts-to-vendor relationship is implicit (vendor selected at header level, parts added as line items).

**Issues:**
- No ability to link a PO to a work order at creation time — users must do this post-creation or remember context manually
- No duplicate detection for in-flight POs to the same vendor for the same part

**Recommendations:**
- Add optional WO association at creation (select from open WOs)
- Add a warning if a recent open PO to the same vendor for the same part number exists

---

### 3.3 PO Detail

- **Route:** `/billing/purchase-orders/:id`
- **File:** `app/(app)/billing/purchase-orders/[id]/page.tsx`
- **Usability: 5**
- **Logic: 5**

**Summary:** The strongest PO page in the module. Budget status card compares WO-linked quote spend vs PO spend with a color-coded progress bar. Receive dialog has an over-receive guard and pre-fills defaults. Status state machine is well-implemented.

**Issues:**
- The budget comparison card only appears when the PO is linked to a WO — standalone POs have no spend context
- "Over budget" visual is a color change on a progress bar; no alert or notification is surfaced to the billing manager

**Recommendations:**
- For WO-linked POs, add a toast or inline alert when a receive action would push the PO over budget
- Consider adding a budget target field on standalone POs for shops that use POs independently of WOs

---

## SECTION 4 — Vendors

---

### 4.1 Vendor List

- **Route:** `/billing/vendors`
- **File:** `app/(app)/billing/vendors/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Vendor list with approved/pending tabs, left-border color coding for cert expiry (amber = expiring soon, red = expired), and service count badges. The cert expiry visual is a good at-a-glance pattern.

**Issues:**
- No type filter — consumables suppliers, service providers, and parts vendors are mixed together
- No search
- Service count badge is a number only; cannot tell at a glance what service types are offered

**Recommendations:**
- Add vendor type filter (multi-select: parts, consumables, service)
- Add search by vendor name and city
- On hover or in a tooltip, show the service type breakdown for the service count badge

---

### 4.2 New Vendor

- **Route:** `/billing/vendors/new`
- **File:** `app/(app)/billing/vendors/new/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Three-section form (basic info, contact, certification) with a logical top-down flow. Vendors start in unapproved state, requiring manager approval — correct MRO workflow. Certification section includes repair station cert number and expiry date.

**Issues:**
- No duplicate detection — submitting a vendor with an identical name gives no warning
- "Unapproved by default" behavior is not surfaced to the user on the form — a new vendor can be surprised when they navigate back to the list and see "Pending"

**Recommendations:**
- Add an inline notice on the form: "New vendors require approval before use on POs"
- Check for similar vendor names before save and offer a duplicate warning dialog

---

### 4.3 Vendor Detail

- **Route:** `/billing/vendors/:id`
- **File:** `app/(app)/billing/vendors/[id]/page.tsx`
- **Usability: 3**
- **Logic: 2**

**Summary:** Two-tab view (Overview + Services). The Overview tab is well-implemented with cert update dialog, AVL toggle, and PO history. The Services tab is critically broken at the data layer.

**Issues:**
- **CRITICAL — DEAD DATA:** Services tab uses `useState<VendorService[]>(initialDemoServices)` — local demo state with hardcoded placeholder data, NOT wired to the Convex backend. The `createVendorService`, `updateVendorService`, `listVendorServices` mutations exist in `convex/vendors.ts` but are not called. Any vendor service a user adds is lost on page reload.
- Services tab "Deactivate" toggle operates only on local state — no persistence
- No confirmation dialog before deactivating a vendor service
- AVL toggle and cert update are functional (backend-wired) but exist on the same page as the broken Services tab, creating a trust inconsistency

**Recommendations:**
- **P0:** Wire the Services tab to `api.vendors.listVendorServices` (query) and `api.vendors.createVendorService` / `api.vendors.updateVendorService` (mutations) — the backend is already written
- Add a deactivate confirmation dialog
- Add a test to cover vendor service persistence end-to-end

---

## SECTION 5 — AR Dashboard

---

### 5.1 AR Dashboard

- **Route:** `/billing/ar-dashboard`
- **File:** `app/(app)/billing/ar-dashboard/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Four KPI cards (Total Outstanding, Current, 30–60 Days, 60+ Days) with an overdue invoices table (row color-coded by aging bucket) and a customer balances table with clickable links. Conceptually sound. The aging bucket breakdown matches standard AR workflows.

**Issues:**
- No collection action shortcuts — billing managers must navigate to each invoice individually to take action; no "Send Reminder" or "Mark for Collection" from the dashboard
- The four KPI cards use the same visual weight; the 60+ bucket (most critical) is not visually distinguished
- Customer balances table lacks a sort control — largest debtors cannot be brought to the top
- No export functionality — AR reports typically need to leave the system for review meetings
- No date-as-of filter — the dashboard always shows current state with no historical snapshot capability

**Recommendations:**
- Add a "Send Reminder Email" quick action on each overdue invoice row
- Visually differentiate the 60+ Days card (red border, stronger weight)
- Add sort-by-balance on the customer balances table
- Add CSV export for both tables
- Add a date picker to view AR as of a prior date (useful for month-end close)

---

## SECTION 6 — Analytics

---

### 6.1 Billing Analytics

- **Route:** `/billing/analytics`
- **File:** `app/(app)/billing/analytics/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Five KPI cards, a 6-month revenue table, three Recharts visualizations (line chart, AR aging bar chart, top-customers horizontal bar), a quote pipeline funnel with stacked progress bar, and two bottom tables (top 5 by quote value, recent conversions). Comprehensive and well-organized.

**Issues:**
- Revenue table and line chart show the same data in different formats on the same screen — redundant
- No date range selector — analytics are fixed to a hardcoded 6-month window
- Quote pipeline funnel uses a stacked progress bar which is visually ambiguous without a legend
- No drill-down from chart to underlying records
- KPI cards do not show period-over-period delta (no comparison to prior period)

**Recommendations:**
- Remove the revenue table if the line chart is present, or vice versa
- Add a date range selector (month/quarter/year/custom)
- Add a legend to the funnel chart
- Add clickable chart segments that link to filtered invoice or quote lists
- Add period delta indicators (arrow + percentage change) to KPI cards

---

## SECTION 7 — Pricing

---

### 7.1 Pricing

- **Route:** `/billing/pricing`
- **File:** `app/(app)/billing/pricing/page.tsx`
- **Usability: 2**
- **Logic: 3**

**Summary:** Pricing profiles table and pricing rules table. Create profile dialog is functional. However, the pricing rules section contains a message stating "Pricing rules are created via the Convex backend or API" — there is no UI to create, edit, or delete rules. The profile edit and delete actions are also missing.

**Issues:**
- **Rules table is read-only with no creation UI** — the explicit message acknowledges this gap, but it means the page is incomplete as a user-facing feature
- No edit or delete action on pricing profiles — only create
- No preview of how a pricing profile affects a quote line item
- Pricing rules and pricing profiles are conceptually related but the connection is not explained in the UI

**Recommendations:**
- Add inline CRUD for pricing rules (type, value, applies_to, is_active) — this is a critical gap for billing managers who need to configure markup
- Add edit and delete actions to pricing profiles
- Add a "Preview impact" mode that shows how a profile + ruleset affects a sample quote
- Add an explanatory section linking profiles to rules to customer assignments

---

## SECTION 8 — Time Management

---

### 8.1 Time Clock

- **Route:** `/billing/time-clock`
- **File:** `app/(app)/billing/time-clock/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Live active timers card with green pulsing indicator, today's summary table, and a filtered entries table. Clock In dialog uses a well-designed cascading selector (context → WO → task card → step). Duplicate timer guard (BUG-BM-099 comment) shows awareness of a real operational hazard.

**Issues:**
- The duplicate timer guard is noted as a known bug (BUG-BM-099) — status unclear
- No clock-out confirmation or summary shown after clocking out (user sees no feedback on hours logged)
- Technicians can see all entries, not just their own — privacy concern for sensitive billing context
- No overtime indicator for entries exceeding shift thresholds

**Recommendations:**
- Resolve BUG-BM-099: enforce single active timer per technician at the backend level
- Add a post-clock-out summary toast: "Logged 3.5 hours on WO-0042"
- Scope the default view to the current user's entries; add a supervisor toggle for "all technicians"
- Add visual indicator for entries exceeding 8 hours or shift-based overtime threshold

---

### 8.2 Time Approval

- **Route:** `/billing/time-approval`
- **File:** `app/(app)/billing/time-approval/page.tsx`
- **Usability: 5**
- **Logic: 5**

**Summary:** Clean approve/reject workflow with Pending/Approved/Rejected tabs, bulk approve with total pending hours display, individual approve/reject with reason dialog, and context + technician filters. Good audit trail design. The "bulk approve" with total hours is ergonomically sound for end-of-week review.

**Issues:**
- Reject reason is required in the dialog but there is no validation feedback if the field is empty at submission
- No way to "un-reject" a time entry that was rejected in error
- No total pay cost estimate alongside hours (useful for billing managers doing payroll validation)

**Recommendations:**
- Add form validation on the reject reason field with an inline error
- Add a "Return to Pending" action on rejected entries (with audit log)
- Add an optional pay rate column or total cost column (using shop rate from settings)

---

## SECTION 9 — Financial Transactions

---

### 9.1 Deposits

- **Route:** `/billing/deposits`
- **File:** `app/(app)/billing/deposits/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Three KPI cards (total deposits, applied, available), deposits table with Apply to Invoice action, RecordDepositDialog and ApplyDepositDialog. Proper AVAILABLE/PARTIAL/APPLIED status tracking. Straightforward and complete.

**Issues:**
- No search on the deposits table — finding a specific deposit for a high-volume customer requires scrolling
- ApplyDepositDialog does not prevent applying a deposit to an invoice from a different customer — no customer-match validation visible

**Recommendations:**
- Add search by customer name or deposit reference number
- Add a customer-match validation in ApplyDepositDialog: warn if the invoice's customer does not match the deposit's customer

---

### 9.2 Credit Memos

- **Route:** `/billing/credit-memos`
- **File:** `app/(app)/billing/credit-memos/page.tsx`
- **Usability: 4**
- **Logic: 3**

**Summary:** Create/Issue/Apply/Void lifecycle for credit memos with two apply dialogs. Status machine (DRAFT→ISSUED→APPLIED/VOID) is well-implemented. However, BUG-BM-100 is present in comments: PAID invoices are included in the credit memo issuance dialog, which is logically incorrect.

**Issues:**
- **BUG-BM-100:** Credit memo issuance dialog includes PAID invoices — a credit memo should only be applicable to OPEN (SENT/PARTIAL) invoices, not already-paid ones
- No explanation of when to use a credit memo vs a deposit vs a refund — users unfamiliar with accounting may misuse this tool
- No audit history visible on a credit memo after it has been applied

**Recommendations:**
- **Fix BUG-BM-100:** Filter invoice dropdown in Apply dialog to exclude PAID and VOID invoices
- Add a tooltip or inline guidance: "Use credit memos for pricing adjustments or goodwill credits against open invoices"
- Add a credit memo history feed showing creation, issue, and application events

---

### 9.3 Recurring Billing

- **Route:** `/billing/recurring`
- **File:** `app/(app)/billing/recurring/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Recurring templates table (name, customer, frequency, subtotal, next generate, status) with a complex CreateRecurringTemplateDialog including inline line items. Generate Now with AlertDialog confirmation. Uses `usePagePrereqs` gating.

**Issues:**
- No per-customer view — cannot see all recurring templates for a given customer from this page
- "Generate Now" action is not reversible — generating a duplicate invoice requires manual voiding
- Dialog for create/edit is complex; the inline line items table inside a dialog is cramped and hard to use
- No history of previously generated invoices from a recurring template

**Recommendations:**
- Add a customer filter above the templates table
- Add a generated-invoice history panel per template (showing last 5 generated invoices)
- Move line item editing to a two-step dialog: step 1 header info, step 2 line items (or a full-page editor)
- Add a duplicate-detection warning before "Generate Now": "An invoice for this customer was already generated in the current period"

---

## SECTION 10 — Configuration

---

### 10.1 Tax Configuration

- **Route:** `/billing/tax-config`
- **File:** `app/(app)/billing/tax-config/page.tsx`
- **Usability: 2**
- **Logic: 4**

**Summary:** Simple tax rates table (name, rate%, applies_to, default, active) with an Add Rate dialog. The data model is correct. However, the page only supports creation — no edit, delete, or active toggle is available from the table.

**Issues:**
- **No edit action on existing tax rates** — to correct a rate, users must delete and recreate (and there is no delete either)
- **No active toggle** from the table row — the `active` column is shown but the toggle is not accessible
- No default rate indicator that is visually distinct from other rates
- No validation that only one rate can be "default" at a time

**Recommendations:**
- Add Edit (pencil) and Delete (trash) row actions to the table
- Add an active toggle directly in the table row
- Enforce single-default logic: toggling one rate as default should auto-deactivate the previous default, with a warning dialog

---

### 10.2 Billing Settings

- **Route:** `/billing/settings`
- **File:** `app/(app)/billing/settings/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Multi-section configuration page covering company info, invoice defaults, payment instructions, quote defaults, shop rate settings, markup tiers, and email preferences. Large file (~51 KB) but well-structured with card-based sections. Appears to be one of the most complete configuration pages in the app.

**Issues:**
- File size is very large for a settings page — likely contains inline markup tier CRUD that would be better extracted
- No "unsaved changes" indicator — users may navigate away without saving
- Logo URL is a raw text input; no upload UI or preview
- Settings page is accessed via the billing sidebar but configures shop-wide settings that arguably belong in a global admin section

**Recommendations:**
- Add a sticky "You have unsaved changes — Save or Discard" banner at the top when the form is dirty
- Replace logo URL input with a file uploader that stores to Convex file storage
- Consider whether shop rate and markup tier settings belong here or in a dedicated shop settings page

---

## SECTION 11 — Customer-Facing Operations

---

### 11.1 Customer Requests

- **Route:** `/billing/customer-requests`
- **File:** `app/(app)/billing/customer-requests/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Split-pane layout (request list left, detail right) with status filter and an internal response textarea with a 2000-character limit. Workflow is logical. However, the page uses a markedly different visual styling from the rest of the billing module.

**Issues:**
- **Styling inconsistency:** Uses raw Tailwind classes (`text-2xl font-bold`, non-system badge variants like `bg-blue-100 text-blue-700`) instead of the design system patterns used elsewhere (shadcn Badge, `text-lg sm:text-xl font-semibold` headings)
- No assignment workflow — requests cannot be assigned to a specific billing user for follow-up
- The 2000-character textarea does not show a character count
- No SLA timer or response-time indicator — critical for customer-facing operations

**Recommendations:**
- Replace raw Tailwind heading and badge styles with design system equivalents (`<Badge variant="...">`, `text-lg font-semibold`)
- Add character count display below the textarea
- Add a simple assignment dropdown to route requests to team members
- Add a "time since submitted" indicator on each request in the list

---

### 11.2 OTC / Counter Sales

- **Route:** `/billing/otc`
- **File:** `app/(app)/billing/otc/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** POS-style layout with New Sale and History tabs. Part search + manual item entry, cart table with editable qty/price, right panel for customer + payment method, and receipt dialog with `window.print()`. Functionally sound for counter sales.

**Issues:**
- **Styling inconsistency:** Uses `p-6` padding and `text-2xl font-bold` headings vs `text-lg sm:text-xl font-semibold` used elsewhere in the module
- `window.print()` for receipts is fragile and not connected to the billing PDF system used for invoices
- No barcode scanner integration point or keyboard shortcut for fast part lookup (important for counter sales speed)
- History tab is a flat list with no filter or search

**Recommendations:**
- Align heading styles with the rest of the billing module
- Replace `window.print()` receipt with the same PDF generation system used for invoices
- Add keyboard shortcut (e.g., `/` or `F3`) to focus the part search field for keyboard-driven counter workflows
- Add search/filter to the History tab

---

### 11.3 Warranty Claims

- **Route:** `/billing/warranty`
- **File:** `app/(app)/billing/warranty/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Eight-status state machine (draft, submitted, under_review, approved, denied, paid, closed + all) with 4 KPI cards (total, pending $, approved $, recovery rate %). Status tab filter and search. ClaimDetailDialog handles all state transitions with appropriate action buttons.

**Issues:**
- **BUG-BM-HUNT-111:** Two separate Convex queries (`allClaims` for stats, `claims` for table) are run; under high claim volume, stats and table data may be momentarily out of sync
- Recovery rate % calculation is not explained — users cannot audit whether it is claims count-based or dollar-based
- Denied claims cannot be appealed or re-submitted from the UI
- No vendor reference on the warranty claim — parts under warranty need to be associated with a vendor for the recovery workflow

**Recommendations:**
- Fix BUG-BM-HUNT-111: derive stats from the same filtered query rather than a separate `allClaims` call
- Add a tooltip to the recovery rate card explaining the formula
- Add a "Re-submit" action on denied claims (transitions back to submitted with a note)
- Add an optional vendor association field on the claim form

---

### 11.4 Labor Kits

- **Route:** `/billing/labor-kits`
- **File:** `app/(app)/billing/labor-kits/page.tsx`
- **Usability: 3**
- **Logic: 5**

**Summary:** Complex create/edit dialog with labor items, required parts, external services, and a cost summary card. Duplicate, toggle active, and delete actions are present. Aircraft type filter is derived from kit data. Integration with the Quote Builder (via `handleAddLaborKit`) is a strong feature.

**Issues:**
- **Styling inconsistency:** Uses `text-2xl font-bold` heading vs design system `text-lg font-semibold`
- Create/edit dialog is a single large form — labor, parts, and services in one scroll is cognitively dense
- No kit-level labor rate override in the list view — users cannot see the effective rate without editing
- External services in the dialog do not show a vendor picker — just a free-text vendor name field
- Aircraft type filter is derived from existing kit data; if no kits exist for a type, the filter offers no option

**Recommendations:**
- Align heading styles with the module standard
- Split the dialog into tabbed sections: (1) Identity & Rates, (2) Labor Items, (3) Parts, (4) External Services
- Show the kit's effective labor rate in the list table
- Replace free-text vendor name in external services with a `VendorCombobox` lookup

---

## SECTION 12 — Quote System

---

### 12.1 Quotes List

- **Route:** `/billing/quotes`
- **File:** `app/(app)/billing/quotes/page.tsx`
- **Usability: 3**
- **Logic: 3**

**Summary:** The page is a 7-line thin wrapper that renders `<QuoteWorkspaceShell surface="billing" />`. There is no standalone quotes list — the workspace shell is the list. This is architecturally consistent but creates a discoverability problem: billing users who navigate to "Quotes" expect a table, not a 3-column workspace environment.

**Issues:**
- Navigation to `/billing/quotes` drops the user into the full quote workspace without orientation
- The workspace mode (`list`, `new`, `detail`) is determined by URL state — if no `?workOrderId` is set, the right panel shows a `QuoteListPanel` inside a dashed-border card, which is visually de-emphasized
- Billing users need a simple filterable quotes table (by status, customer, date) that the current shell does not prioritize
- The workspace is optimized for quote creation from WOs, not for reviewing/managing existing quotes in bulk

**Recommendations:**
- Add a toggle at the `/billing/quotes` level: "List View" vs "Workspace View"
- In List View, render a standard filterable table (status tabs, customer filter, date range, amount sort)
- Keep the Workspace View as the creation/editing path
- Surface the quotes list as the default landing state when no WO is selected

---

### 12.2 New Quote

- **Route:** `/billing/quotes/new`
- **File:** `app/(app)/billing/quotes/new/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Another thin wrapper rendering `<QuoteWorkspaceShell surface="billing" forceMode="new" />`. Forces mode to "new" and auto-selects the first available work order. The workspace then renders `QuoteBuilderLayout` in new mode.

**Issues:**
- Auto-selecting the first WO may not be the correct context — a billing user starting a new quote may not want the first WO in priority order
- There is no "standalone new quote" path that does not require a work order context
- If no work orders exist, the empty state directs the user to `/work-orders/new` — billing users may not have WO creation permission depending on their role

**Recommendations:**
- Allow new quote creation without a mandatory WO association (WO linkage should be optional, not required by the workspace flow)
- Add a customer + aircraft selector as the primary entry point before the WO rail appears
- Gate the WO creation CTA in the empty state behind role check

---

### 12.3 Quote Templates

- **Route:** `/billing/quotes/templates`
- **File:** `app/(app)/billing/quotes/templates/page.tsx`
- **Usability: 4**
- **Logic: 5**

**Summary:** Fully functional template management page: create, edit, duplicate, and toggle active. Line items table inside the create dialog. Aircraft type filter on templates. Back button links to `/sales/quotes` (note: links to sales, not billing — this is inconsistent with the billing route context).

**Issues:**
- Back button links to `/sales/quotes` not `/billing/quotes` — users navigating from billing will be sent to the wrong section
- No preview of a template before inserting into a quote
- No search or filter on the templates list for shops with many templates
- "Aircraft Type Filter" is a free-text field — typos ("Cessna 172" vs "cessna 172") will silently prevent templates from appearing in filtered results

**Recommendations:**
- Fix back button target: link to the referring surface (billing or sales) using `useNavigate(-1)` or a context prop
- Add search above the templates list
- Change Aircraft Type Filter to a combobox backed by actual aircraft in the org's fleet
- Add a preview that shows template line items before insertion

---

### 12.4 Quote Detail

- **Route:** `/billing/quotes/:id`
- **File:** `app/(app)/billing/quotes/[id]/page.tsx`
- **Usability: 3**
- **Logic: 4**

**Summary:** Thin wrapper rendering `<QuoteDocumentView quoteId={quoteId} />`. The actual functionality lives in the QuoteDocumentView component. This is a standalone detail view separate from the workspace.

**Issues:**
- No breadcrumb or contextual back link — `QuoteDocumentView` receives no `onBack` callback in this context
- The route exists both at `/billing/quotes/:id` and as a right-panel state within the workspace shell — two access patterns for the same content with different navigation context
- Status transitions (Send, Approve, Convert to Invoice) may not be visible depending on the QuoteDocumentView rendering context

**Recommendations:**
- Pass a back link context to `QuoteDocumentView` indicating the referring surface
- Decide whether `/billing/quotes/:id` should be the canonical detail URL or if the workspace shell should be the only access path; document this and remove the redundant entry point if workspace is preferred
- Add breadcrumb: Billing → Quotes → [Quote Number]

---

### 12.5 Quote Workspace System (Component-Level Evaluation)

- **Components:** `QuoteWorkspaceShell`, `QuoteBuilderLayout`, `QuoteBuilderCenter`, `QuoteBuilderLeftSidebar`, `QuoteProfitabilityPanel`, `WORailPanel`, `QuoteDocumentView`, `QuoteListPanel`, `QuoteActionBar`, `QuoteStatusStepper`, `QuoteFinancialFooter`, `QuoteNewEditor`, `QuoteDetailEditor`, `QuoteBuilderSettingsDialog`
- **Usability: 3**
- **Logic: 5**

**Summary:** The quote workspace is architecturally sophisticated — a 3-panel builder (WO rail, left sidebar, center, right profitability), dirty-state tracking, unsaved changes guard, labor kit insertion, template insertion, reorder, and per-line economics editing. The backend is fully implemented and integrated. However, the UX complexity is high for a typical billing user performing routine quote creation.

**Issues:**
- **Cognitive overload:** The full workspace (WO rail + 3-panel builder + profitability panel) presents ~5 simultaneous panels on desktop; first-time users have no orientation
- **Mobile experience is degraded:** The three-column builder collapses to single-column with the WO rail hidden behind a Sheet — building a quote on a tablet or mobile is cumbersome
- **Mode ambiguity:** The `mode` variable (`list`, `new`, `detail`) is derived from URL params and local state interactions; unexpected mode transitions can occur when clicking around the WO rail
- **`handleAddLaborKit` uses local state only for new quotes** — line economics set from a labor kit are not persisted until the user clicks "Create Quote", meaning partial work is silently lost on refresh
- **Settings dialog (`QuoteBuilderSettingsDialog`) edits shop settings** — this side effect is not obvious from the builder UI
- **New quote: line items added serially** — the create flow posts the quote first, then adds each line item in a sequential loop; under poor connectivity, partial quotes with missing line items can be created
- **`calcDeadline` function assumes 8-hour workdays and 5 buffer days** — these constants are hardcoded, not configurable from shop settings

**Recommendations:**
- Add an orientation tooltip or dismissable onboarding overlay for first-time workspace users explaining the three panels
- Implement an "auto-save" draft for new quotes: save to Convex immediately on first line item, then update atomically
- Replace the sequential line-item-posting loop in `handleSubmit` with a single batch mutation that creates the quote and all line items atomically
- Make `calcDeadline` factors (daily hours, buffer days) pull from shop settings
- Rename or re-scope the Settings dialog to make the shop-settings side effect explicit
- Add a simplified "Quick Quote" mode: customer + aircraft + single line item → create, without the full 3-panel workspace

---

## SECTION 13 — Sales Module

---

### 13.1 Sales Dashboard

- **Route:** `/sales/dashboard`
- **File:** `app/(app)/sales/dashboard/page.tsx`
- **Usability: 3**
- **Logic: 3**

**Summary:** An LTV:CAC calibration dashboard with explainable assumptions. Five KPI cards (LTV, CAC, LTV:CAC ratio, projected revenue, projected EBITDA) and three tabs: assumptions calibration, explainability/quality, and deal ownership. The transparency of the assumption model (showing exact formulas) is a sophisticated design decision.

**Issues:**
- **Target user mismatch:** This level of financial modeling (LTV:CAC, EBITDA projection, churn rate assumptions) is product/exec territory, not a daily-use screen for a billing manager or shop manager at an FAA Part 145 repair station
- **All financial model inputs are hardcoded constants** (`DEFAULTS` object) — the page explicitly acknowledges this: the blended/custom override tab says "To apply final overrides, wire these fields to org-level settings in a follow-on task"
- The quality score badge shows "X% data completeness" but the minimum thresholds (3 opportunities, 3 quotes, 3 invoices) are arbitrary and will show "Low confidence" for any new org
- CAC proxy formula (quote volume × 8%) is explicitly a proxy, not a real calculation — presenting this as a KPI card metric may mislead users
- Four Convex queries run on page load (CRM dashboard, opportunities, quotes, invoices) for a page that primarily shows computed estimates

**Recommendations:**
- Reframe the page as an "Analytics Lab" or "Financial Planning" tool with a clear disclaimer that outputs are model estimates, not actuals
- Wire the assumptions overrides to persisted org settings rather than leaving them as hardcoded constants
- Reduce the page's position in the primary navigation; it is not a daily-use screen
- Replace the CAC proxy with a note that CAC requires manual input of marketing/sales spend

---

### 13.2 Sales Ops

- **Route:** `/sales/ops`
- **File:** `app/(app)/sales/ops/page.tsx`
- **Usability: 4**
- **Logic: 4**

**Summary:** Quote pipeline view organized into three buckets (Draft, In-Process, Closed) as summary count cards plus detailed item cards per bucket. Each quote card links to `/sales/quotes/:id`. Customer and technician name resolution via lookup maps. Good test ID coverage.

**Issues:**
- **Styling inconsistency:** Page heading uses `text-2xl font-semibold` without the responsive sizing pattern (`text-lg sm:text-xl md:text-2xl`) used elsewhere
- **Hardcoded 8-item cap:** `bucket.items.slice(0, 8)` silently truncates — a bucket with 9+ items shows no "View all" link and no count mismatch warning
- The page duplicates quote pipeline data already visible in `billing/analytics` (quote pipeline funnel) — two views of the same data in different modules
- No sort controls within buckets — quotes appear in Convex query order
- No filter by date or by assigned owner within the page

**Recommendations:**
- Fix the 8-item cap: add a "Show all X quotes" expand link or remove the cap
- Add a date range filter and owner filter
- Consider merging Sales Ops into the billing analytics page or the CRM pipeline view — this page does not add enough unique value to justify a separate route
- Fix the heading to use responsive sizing

---

### 13.3 Sales Training

- **Route:** `/sales/training`
- **File:** `app/(app)/sales/training/page.tsx`
- **Usability: 4**
- **Logic: 2**

**Summary:** A six-module sales training curriculum with checklists, script templates, guardrails, objection quick-reference, and KPI discipline targets. Well-written content. Explicitly attributed to an internal "Hormozi sales corpus."

**Issues:**
- **No backend dependency or persistence** — all data is hardcoded static content; progress percentages are placeholder constants (20%, 15%, 10%, 5%, 0%, 0%) that never change
- **Wrong audience domain:** Generic B2B sales methodology (ICP research, BANT qualification, objection handling) is not MRO-specific; an FAA Part 145 repair station's "sales" process is quoting and converting AOG/inspection requests, not running discovery calls
- The page explicitly notes it is a "Placeholder progress model for LMS integration" — it is unfinished
- Source attribution references "internal Hormozi sales corpus" — a named external methodology appears inside a product feature without context for the end user
- Progress percentages hardcoded at module level are not user-specific or org-specific

**Recommendations:**
- Either (a) remove this page from the navigation until LMS integration is implemented, or (b) mark it clearly as "Coming Soon — Training content placeholder"
- If retained, replace generic sales methodology with MRO-specific quoting and customer communication workflows
- Remove or contextualize the "Hormozi sales corpus" attribution for end users
- Wire progress tracking to a real backend model (user × module completion)

---

## SECTION 14 — Cross-Cutting Findings

---

### 14.1 The 25 Sub-Page Justification Question

The billing module has 25 sub-pages. The question is whether this count is justified or whether consolidation would improve usability.

**Pages that are clearly justified as standalone routes (15):**
Customers list, Customer detail, Invoice list, Invoice detail, New invoice, PO list, PO detail, New PO, Vendor list, Vendor detail, AR dashboard, Time clock, Time approval, Deposits, Credit memos

**Pages that warrant consolidation consideration (6):**
- **Tax Config + Billing Settings:** Tax config is 3-4 fields; it should be a section within Billing Settings, not a separate route
- **Recurring Billing:** Could be a tab within the Invoice list page ("Recurring" tab alongside status tabs)
- **Pricing:** Currently incomplete; when complete, could merge into Billing Settings as a "Pricing & Markup" section
- **Customer Requests:** Could merge into the Customer detail page as a "Requests" tab
- **OTC/Counter Sales:** Justified as standalone (distinct workflow) but may benefit from placement under a "Point of Sale" top-level section rather than nested under Billing

**Pages that are architectural stubs (4):**
- Quotes list: just renders the workspace shell
- New Quote: just renders the workspace shell with forceMode
- Quote detail: just renders QuoteDocumentView
- All three are wrappers; the workspace system is the real feature

**Recommendation:** Consolidate Tax Config into Billing Settings; move Recurring Billing to an Invoice tab; integrate Pricing into Billing Settings once it is complete. This would reduce the sub-page count from 25 to approximately 20 without removing any functionality.

---

### 14.2 Quote Workspace Complexity Assessment

The quote workspace system is technically well-built but UX-over-engineered for the primary billing use case. The workspace is designed for a quote strategist who needs to cross-reference work orders, apply labor kits, adjust per-line markup, and review profitability simultaneously. Most billing users doing routine quoting need: customer → aircraft → line items → send.

The workspace handles the complex case well but does not offer a simplified path for the common case. Recommendation: implement a "Quick Quote" mode (2–3 step wizard) as the default entry point; the full workspace should be accessible as an "Advanced" toggle.

---

### 14.3 Invoice Creation Flow Assessment

The flow (select mode → work order or manual → tax rate → create) is logically sound but requires 3–4 navigation steps before an invoice exists. The "enhanced generation" toggle that auto-populates from WO data is the most valuable feature in the flow but is inadequately labeled. The creation is a full-page form rather than a dialog, which adds context-switching overhead.

Recommendation: offer a fast-path dialog from the Invoice list page ("Create from WO" with a WO picker), reserving the full-page form for complex manual invoices.

---

### 14.4 Billing/CRM Customer Overlap

The billing module has its own customer list and customer detail pages, and the CRM module has a separate contacts/prospects system. There is conceptual overlap: billing customers and CRM contacts may represent the same entities approached from different directions. The current implementation treats them as separate data domains (different Convex tables), requiring double-entry and creating divergence risk.

No immediate fix is recommended (merging would be a significant schema migration), but the UX evaluation flags this as a long-term architectural debt item.

---

### 14.5 Sales Module Distinctness Assessment

The sales module (3 pages) does not feel like a cohesive module. Sales Dashboard is a financial modeling lab, Sales Ops is a quote pipeline view, and Sales Training is a placeholder LMS. None of these require a separate "Sales" nav section — they could be distributed:
- Sales Dashboard → under Analytics or a new "Insights" section
- Sales Ops → as a view within Billing Quotes
- Sales Training → removed until complete

The current "Sales" nav section gives an impression of a CRM/sales tool that the app does not yet deliver. The CRM module (under `/crm`) is the more appropriate home for sales-facing features.

---

### 14.6 AR Dashboard Cash Flow Effectiveness

The AR Dashboard provides the right data (aging buckets, customer balances) but does not enable action. In operational AR management, the next step after seeing "60+ day overdue" is sending a reminder, creating a collection note, or escalating to a contact. None of those actions are available from the dashboard. The page functions as a reporting view, not an AR management tool. To be effective, it needs at minimum: one-click reminder email, flag for follow-up, and a column showing last communication date.

---

### 14.7 Styling Inconsistencies

Four pages use visual patterns inconsistent with the rest of the billing module:

| Page | Issue |
|---|---|
| `billing/customer-requests` | Raw Tailwind badge classes (`bg-blue-100 text-blue-700`) instead of `<Badge variant>` |
| `billing/otc` | `text-2xl font-bold` heading, `p-6` spacing vs module standard |
| `billing/labor-kits` | `text-2xl font-bold` heading |
| `sales/ops` | `text-2xl font-semibold` without responsive size modifiers |

All four should be updated to use `text-lg sm:text-xl font-semibold` headings and `<Badge variant="...">` from the design system.

---

## Summary Scorecard

| Page | Route | Usability | Logic |
|---|---|---|---|
| Customer List | `/billing/customers` | 3 | 4 |
| Customer Detail | `/billing/customers/:id` | 4 | 4 |
| Invoice List | `/billing/invoices` | 5 | 5 |
| New Invoice | `/billing/invoices/new` | 3 | 4 |
| Invoice Detail | `/billing/invoices/:id` | 4 | 5 |
| PO List | `/billing/purchase-orders` | 4 | 4 |
| New PO | `/billing/purchase-orders/new` | 4 | 5 |
| PO Detail | `/billing/purchase-orders/:id` | 5 | 5 |
| Vendor List | `/billing/vendors` | 4 | 4 |
| New Vendor | `/billing/vendors/new` | 4 | 5 |
| Vendor Detail | `/billing/vendors/:id` | 3 | 2 |
| AR Dashboard | `/billing/ar-dashboard` | 3 | 4 |
| Billing Analytics | `/billing/analytics` | 4 | 4 |
| Pricing | `/billing/pricing` | 2 | 3 |
| Time Clock | `/billing/time-clock` | 4 | 5 |
| Time Approval | `/billing/time-approval` | 5 | 5 |
| Deposits | `/billing/deposits` | 4 | 5 |
| Credit Memos | `/billing/credit-memos` | 4 | 3 |
| Recurring Billing | `/billing/recurring` | 3 | 4 |
| Tax Config | `/billing/tax-config` | 2 | 4 |
| Billing Settings | `/billing/settings` | 4 | 4 |
| Customer Requests | `/billing/customer-requests` | 3 | 4 |
| OTC / Counter Sales | `/billing/otc` | 3 | 4 |
| Warranty Claims | `/billing/warranty` | 4 | 4 |
| Labor Kits | `/billing/labor-kits` | 3 | 5 |
| Quotes List | `/billing/quotes` | 3 | 3 |
| New Quote | `/billing/quotes/new` | 3 | 4 |
| Quote Templates | `/billing/quotes/templates` | 4 | 5 |
| Quote Detail | `/billing/quotes/:id` | 3 | 4 |
| Quote Workspace System | (component) | 3 | 5 |
| Sales Dashboard | `/sales/dashboard` | 3 | 3 |
| Sales Ops | `/sales/ops` | 4 | 4 |
| Sales Training | `/sales/training` | 4 | 2 |

**Module Average — Usability: 3.5 / 5**
**Module Average — Logic: 4.1 / 5**

---

## Priority Defect Register

| ID | Severity | Location | Description |
|---|---|---|---|
| UX-P0-001 | Critical | Vendor Detail → Services tab | Services tab uses local demo state, not wired to Convex backend. All vendor service data is lost on reload. |
| UX-P0-002 | High | Billing → Pricing | Pricing rules have no creation UI. The only instruction is "use the API". |
| UX-P0-003 | High | Tax Config | No edit or delete actions on existing tax rates. Read-only table masquerading as a management screen. |
| UX-P1-004 | High | Credit Memos (BUG-BM-100) | PAID invoices incorrectly included in Apply dialog. |
| UX-P1-005 | Medium | Time Clock (BUG-BM-099) | Duplicate active timer guard noted as unresolved. |
| UX-P1-006 | Medium | Quote Templates | Back button links to `/sales/quotes` instead of referring billing route. |
| UX-P1-007 | Medium | New Invoice | "Enhanced generation" toggle is unexplained jargon with no tooltip. |
| UX-P1-008 | Medium | Quote Builder | New quote submits line items in a sequential loop — partial quote creation possible under poor connectivity. |
| UX-P1-009 | Medium | AR Dashboard | No collection actions available from the dashboard — read-only reporting only. |
| UX-P2-010 | Low | customer-requests, otc, labor-kits, sales/ops | Heading and badge style inconsistencies vs module design system. |
| UX-P2-011 | Low | Warranty (BUG-BM-HUNT-111) | Dual queries for stats vs table may produce momentary sync inconsistency. |
| UX-P2-012 | Low | Sales Training | All module progress values are hardcoded; page is explicitly a placeholder with no persistence. |
