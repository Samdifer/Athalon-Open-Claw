# Master Build List

## Bug Hunter Fixes

### Cycle 1 — Parts Clerk (2026-03-05)

**BUG-HUNT-111: Lots page stats show filtered counts instead of global totals**
- **File:** `app/(app)/parts/lots/page.tsx`
- **What was broken:** Stats cards (Total Lots, Active, Quarantined, Expired) were derived from the condition-filtered `lots` query. When a clerk switched to the "Quarantine" tab, "Total Lots" showed only quarantine count (e.g. 3 instead of 50) and "Active" showed 0.
- **Fix:** Added a separate unfiltered `allLots` query for stats computation, same pattern as cores page fix BUG-PC-HUNT-108.
- **Impact:** Stats cards now always show accurate global totals regardless of active tab.

**BUG-HUNT-112: ConformityDocumentPanel "View Document" button was completely broken**
- **File:** `app/(app)/parts/_components/ConformityDocumentPanel.tsx`
- **What was broken:** The `handleView` function opened `window.open('#doc-${storageId}', '_blank')` — navigating to a meaningless hash fragment. Every "View document" click on a conformity document (CoC, 8130-3, test reports) opened a blank page. The `getDocumentUrl` query was imported but never used.
- **Fix:** Replaced with a `ViewDocumentButton` component that uses `useQuery(api.documents.getDocumentUrl, { storageId })` to resolve the Convex storage URL, then opens it in a new tab. Removed dead code.
- **Impact:** Clerks and inspectors can now actually view attached conformity documents.

**BUG-HUNT-113: Alerts page "Create PO" links don't pre-fill part number**
- **File:** `app/(app)/parts/alerts/page.tsx`
- **What was broken:** Both the reorder alerts and shelf-life alerts had "Create PO" buttons that linked to `/billing/purchase-orders/new` with no query params. A clerk seeing "MS20470AD4 needs reorder" had to manually re-type the part number in the PO form.
- **Fix:** Added `?partNumber=${encodeURIComponent(item.partNumber)}` to both Create PO link targets.
- **Impact:** Reduces data entry time and prevents typos when ordering parts flagged by alerts.

**BUG-HUNT-114: CreateLotDialog vendor field was cosmetic — data silently dropped on submit**
- **File:** `app/(app)/parts/lots/page.tsx`
- **What was broken:** The "Create Lot" dialog had a free-text "Vendor" input (`vendorName` state), but the `handleSubmit` function never passed it to the `createLot` mutation. The backend expects a `vendorId` (Convex ID reference), not a text string. Clerks would carefully type a vendor name, submit, and the vendor association was silently lost.
- **Fix:** Replaced free-text input with a vendor `Select` dropdown that queries `api.vendors.listVendors`. Now passes the selected `vendorId` to the mutation.
- **Impact:** Lot-vendor traceability now works — critical for FAA Part 145 supply chain documentation.

**BUG-HUNT-115: Shipping summary cards missing Cancelled count**
- **File:** `app/(app)/parts/shipping/page.tsx`
- **What was broken:** Summary cards showed Total/Pending/In Transit/Delivered but omitted Cancelled — inconsistent with the Cancelled tab added in BUG-PC-086. A clerk couldn't see at a glance how many shipments had been cancelled.
- **Fix:** Added a fifth summary card for Cancelled count. Updated grid from `grid-cols-4` to `grid-cols-5`.
- **Impact:** Complete shipment status visibility in the summary bar.

### Bug Hunter Opus — Billing Manager (2026-03-05)

**BUG-BM-HUNT-120: Invoice CSV export missing Customer, Balance, and date columns**
- **File:** `app/(app)/billing/invoices/page.tsx`
- **What was broken:** CSV export only included Invoice #, Status, Total, Due Date, Created. A billing manager exporting data for collections or reconciliation had no Customer Name, Amount Paid, Balance Due, Sent date, or Paid date columns.
- **Fix:** Added Customer, Amount Paid, Balance, Sent, and Paid columns to the CSV export.
- **Impact:** Billing manager can now export a complete invoice register for collections follow-up or accountant handoff.

**BUG-BM-HUNT-121: Invoice detail — shared error state leaks across dialogs**
- **File:** `app/(app)/billing/invoices/[id]/page.tsx`
- **What was broken:** A single `error` state variable was shared across Send, Record Payment, Void, Set Due Date, and Edit Line Item actions. If a void failed and the user then opened the payment dialog, the stale void error banner remained visible — confusing the user into thinking the payment had failed.
- **Fix:** Clear `error` state when opening each dialog (payment, void, due date, edit line item).
- **Impact:** Eliminates misleading error messages that persist across unrelated billing actions.

**BUG-BM-HUNT-122: Profitability page uses createdAt instead of paidAt for period attribution**
- **File:** `app/(app)/reports/financials/profitability/page.tsx`
- **What was broken:** The WO Profitability page filtered invoices by `createdAt >= cutoff`, but the Financial Dashboard correctly uses `paidAt` (cash-basis accounting). An invoice created in January but paid in March appeared in January's profitability but March's revenue — inconsistent numbers across reports.
- **Fix:** Changed period attribution to use `paidAt` (falling back to `createdAt`) for consistency with the Financial Dashboard.
- **Impact:** Revenue and profitability now align across all financial reports — no more conflicting numbers.

**BUG-BM-HUNT-123: Batch Record Payments shows PAID/VOID invoices with $0 balance**
- **File:** `app/(app)/billing/invoices/page.tsx`
- **What was broken:** When selecting mixed-status invoices (including PAID and VOID), the batch "Record Payments" button appeared and the dialog showed $0.00 balance rows. Clicking "Pay All" would try to pay $0 on already-paid invoices — confusing and pointless.
- **Fix:** Hide "Record Payments" button when no selected invoices have a balance > 0. Filter zero-balance invoices out of the batch payment dialog.
- **Impact:** Billing manager only sees actionable invoices in the payment workflow — no dead rows cluttering the dialog.

**BUG-BM-HUNT-124: Time Approval — no pending hours summary for billing manager**
- **File:** `app/(app)/billing/time-approval/page.tsx`
- **What was broken:** The pending tab showed individual time entries but provided no total hours summary. A billing manager reviewing 20+ entries had no quick way to assess total labor cost exposure before approving. They'd have to mentally sum every row.
- **Fix:** Added a pending hours summary badge (e.g., "12h 30m pending") with entry count, displayed prominently above the approval table.
- **Impact:** Billing manager can immediately assess labor cost impact before bulk-approving time entries.

### Bug Hunter Opus — QCM Inspector (2026-03-05)

**BUG-QCM-HUNT-130: Audit Readiness AD score ignores notCompliedAds — inflated readiness score**
- **File:** `app/(app)/compliance/audit-readiness/page.tsx`
- **What was broken:** `problematicAds` only summed `overdueAds + pendingAds`, completely missing `notCompliedAds` (ADs that were never performed). An org with 4 never-performed ADs but 0 date-overrun ADs showed an AD Compliance readiness score of 100% — grossly misleading for a QCM preparing for an FAA audit.
- **Fix:** Added `notCompliedAds` to the `problematicAds` calculation using the same defensive type-cast pattern used throughout the compliance section.
- **Impact:** Audit readiness score now accurately reflects the true AD compliance posture; never-performed ADs properly penalize the score.

**BUG-QCM-HUNT-131: AuditChecklistGenerator uses emoji (✅/❌) instead of Lucide icons**
- **File:** `app/(app)/compliance/_components/AuditChecklistGenerator.tsx`
- **What was broken:** Pre-audit checklist used Unicode emoji for pass/fail indicators while every other compliance component uses Lucide `CheckCircle2`/`XCircle` icons. Emoji renders inconsistently across Windows, macOS, and mobile — and was already fixed in RTSEvidenceSummary (BUG-QCM-HUNT-121).
- **Fix:** Replaced emoji with `CheckCircle2` (green) / `XCircle` (red) icons matching the established pattern.
- **Impact:** Consistent visual language across all compliance tools; no more platform-dependent rendering.

**BUG-QCM-HUNT-132: Diamond Award page missing cross-navigation links**
- **File:** `app/(app)/compliance/diamond-award/page.tsx`
- **What was broken:** Every compliance subpage (ad-sb, audit-trail, qcm-review, audit-readiness) has "← Compliance" and sibling page shortcuts. Diamond Award had none — a QCM inspector was trapped without using the sidebar or browser back button.
- **Fix:** Added "← Compliance", "AD/SB Tracking", "Audit Trail", and "QCM Review" buttons matching the established cross-nav pattern.
- **Impact:** Full cross-linking across all 6 compliance pages; QCM can cycle through the compliance workflow without losing context.

**BUG-QCM-HUNT-133: Audit Readiness page missing cross-navigation links**
- **File:** `app/(app)/compliance/audit-readiness/page.tsx`
- **What was broken:** Same gap as Diamond Award — no "← Compliance" or sibling page shortcuts. QCM landing from the compliance dashboard had no quick way to reach AD/SB Tracking or QCM Review.
- **Fix:** Added consistent cross-nav links in the page header.
- **Impact:** Complete navigation consistency across all compliance subpages.

**BUG-QCM-HUNT-134: ComplianceTimeline "future" badge shows no day count — can't prioritize**
- **File:** `app/(app)/compliance/_components/ComplianceTimeline.tsx`
- **What was broken:** Items due more than 30 days out showed only "future" with a green badge but no actual day count. An AD due in 31 days looked identical to one due in 365 days — impossible for the QCM to prioritize upcoming deadlines or plan audit prep timing.
- **Fix:** Changed "future" badge to show the actual day count (e.g., "45d", "180d") so deadlines are immediately comparable.
- **Impact:** QCM inspector can now visually prioritize all timeline items by their actual urgency, not just a binary near/far classification.

### Cycle 3 — DOM (Director of Maintenance) (2026-03-05)

**BUG-DOM-HUNT-140: OJT Jackets page has dead "use client" Next.js directive**
- **File:** `app/(app)/training/ojt/jackets/page.tsx`
- **What was broken:** The `"use client"` directive at the top of the file is a Next.js convention. Athelon is a Vite+React app — the directive is a no-op that misleads contributors into thinking the project uses Next.js patterns (server components, RSC). Same issue already fixed on the OJT dashboard in BUG-DOM-120.
- **Fix:** Replaced with an explanatory comment documenting the cleanup.
- **Impact:** Prevents architectural confusion for contributors and eliminates a misleading signal about the project's framework.

**BUG-DOM-HUNT-141: OJT Jackets page formatDate uses wrong timezone and inconsistent format**
- **File:** `app/(app)/training/ojt/jackets/page.tsx`
- **What was broken:** `formatDate()` used `toLocaleDateString()` with no options — (1) missing `timeZone: "UTC"` causing jacket start/qualification dates to display one day early for shops west of UTC, and (2) producing "3/5/2026" format while every other date in the app uses "Mar 5, 2026" format. A DOM comparing training dates across pages sees inconsistent formats.
- **Fix:** Added `"en-US"` locale with `{ month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }` options matching the rest of the app.
- **Impact:** Training dates now display correctly and consistently regardless of the user's timezone.

**BUG-DOM-HUNT-142: Logbook tab shows "No entries found" while data is still loading**
- **File:** `app/(app)/fleet/[tail]/_components/LogbookTab.tsx`
- **What was broken:** When `entriesRaw` is undefined (Convex query still in flight), the code defaults to `[]` and renders "No entries found." — making the DOM think the logbook is empty when it's just loading. On slow connections or large aircraft with many entries, this flash of false-empty state lasts several seconds.
- **Fix:** Added a loading skeleton check: when `entriesRaw === undefined`, render skeleton placeholders instead of the empty state message. Also added `Skeleton` to the import list.
- **Impact:** DOM users no longer see a misleading "No entries found" message while logbook data loads.

**BUG-DOM-HUNT-143: TeamTrainingDashboard has dead "use client" Next.js directive**
- **File:** `app/(app)/training/ojt/_components/TeamTrainingDashboard.tsx`
- **What was broken:** Same "use client" artifact as BUG-DOM-HUNT-140.
- **Fix:** Replaced with explanatory comment.
- **Impact:** Consistent framework signal cleanup across the training module.

**BUG-DOM-HUNT-144: Chief Inspector Review shows raw database IDs instead of task names**
- **File:** `app/(app)/training/ojt/_components/ChiefInspectorReview.tsx`
- **What was broken:** The countersign review panel displayed `event.taskId` directly — a raw Convex ID like "j5782ndks..." — instead of the human-readable task description. A Chief Inspector countersigning OJT evaluations had no way to know WHICH task they were approving without cross-referencing the curriculum manually.
- **Fix:** Added queries for the jacket's curriculum and its tasks, built a taskId→description lookup map, and now displays "ATA 71 — Inspect main rotor..." instead of the raw ID. Also cleaned up the "use client" directive.
- **Impact:** Chief Inspectors can now actually read and verify what they're countersigning — critical for Part 145 training compliance.

**BUG-DOM-HUNT-145: Logbook "Generate Entry from WO" dropdown shows empty list with no explanation**
- **File:** `app/(app)/fleet/[tail]/_components/LogbookTab.tsx`
- **What was broken:** The work order dropdown used to generate logbook entries showed an empty list (a) while work orders were loading and (b) when no closed WOs existed for the aircraft. The DOM opens the logbook tab, clicks the dropdown, sees nothing, and thinks the feature is broken.
- **Fix:** Added context-sensitive placeholder text ("Loading work orders…" / "No completed work orders") and disabled hint items inside the dropdown content to explain why the list is empty.
- **Impact:** DOM users immediately understand the state of the WO list without confusion.

### Cycle 4 — Billing Manager (2026-03-05)

**BUG-BM-HUNT-150: Time Approval durations ignore paused time — billing approves inflated hours**
- **File:** `app/(app)/billing/time-approval/page.tsx`
- **What was broken:** `fmtDuration()` computed raw `clockOut - clockIn` without subtracting `totalPausedMinutes`. A tech who clocked in for 8h but paused for 2h showed "8h 0m" to the billing manager. When approved, this inflated billable labor by the paused duration — directly overbilling the customer.
- **Fix:** Added `totalPausedMinutes` parameter to `fmtDuration()` and subtracted it. Updated all 3 call sites (pending, approved, rejected tabs) to pass the entry's paused minutes.
- **Impact:** Billing manager now sees accurate active-work duration, preventing systematic overbilling.

**BUG-BM-HUNT-151: Pending hours summary also ignores paused time**
- **File:** `app/(app)/billing/time-approval/page.tsx`
- **What was broken:** The "X h Ym pending" summary badge used raw clock-in-to-clock-out minutes without pause deduction. A manager seeing "24h pending" might actually have only 18h of active labor — the 6h gap was paused time.
- **Fix:** Subtract `totalPausedMinutes` from each entry's raw duration in `pendingTotalMinutes` computation.
- **Impact:** Billing manager's labor cost assessment before bulk-approve is now accurate.

**BUG-BM-HUNT-152: Analytics monthly "Collected" revenue misattributed for partial payments**
- **File:** `app/(app)/billing/analytics/page.tsx`
- **What was broken:** When `paidAt` was undefined (always the case for PARTIAL invoices — it's only set on full payment), the code fell back to `createdAt`, attributing partial payments to the invoice creation month instead of when payments actually started. An invoice created in October with $5k paid in January showed January's partial payment under October's "Collected" column.
- **Fix:** Fall back to `sentAt` (when the invoice started its payment lifecycle) before `createdAt`. This is a closer proxy for when collections activity began.
- **Impact:** Monthly revenue chart now more accurately reflects when cash was received.

**BUG-BM-HUNT-153: CSV export mangles special characters in Excel**
- **File:** `lib/export.ts`
- **What was broken:** The `downloadCSV()` function produced valid UTF-8 but without a BOM (Byte Order Mark). Excel on Windows defaults to ANSI encoding without a BOM, causing accented characters in customer names (e.g., "González Aviation"), em-dashes, and currency symbols to render as garbled text.
- **Fix:** Prepend `\uFEFF` (UTF-8 BOM) to the CSV content before creating the Blob.
- **Impact:** Exported invoice and parts CSVs now open correctly in Excel on all platforms.

**BUG-BM-HUNT-154: AR Dashboard customer balances not linked to customer profile**
- **File:** `app/(app)/billing/ar-dashboard/page.tsx`
- **What was broken:** Customer names in the "Customer Balances" table were plain text. A billing manager chasing collections had to manually navigate to Billing → Customers → search for the name — multiple clicks and context-switching to see that customer's invoice history and contact info.
- **Fix:** Wrapped customer names in `<Link to="/billing/customers/${cb.customerId}">` for one-click navigation.
- **Impact:** Faster AR collection workflow — click a delinquent customer, see their full history immediately.

### Cycle 5 — Lead Technician (2026-03-05)

**BUG-LT-HUNT-201: Vendor service status update Save button has no loading guard**
- **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- **What was broken:** Double-clicking the "Save" button on a vendor service status update fired two concurrent `updateVendorServiceMutation` calls. Both succeeded, creating duplicate status-change records in the vendor services audit trail. A tech reviewing the history would see "Completed" logged twice with identical timestamps — making it unclear if two separate completions happened.
- **Fix:** Added `isSavingVendorUpdate` state flag. Button is disabled and shows a Loader2 spinner while the mutation is in-flight. Same pattern as `isSavingComplianceUpdate` (BUG-QCM-C19).
- **Impact:** Clean vendor service audit trail; no duplicate status entries from accidental double-clicks.

**BUG-LT-HUNT-202: Compliance Remove (×) button has no loading guard**
- **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- **What was broken:** Double-clicking the Remove (×) button on a compliance item fired two `removeComplianceItemMutation` calls. The first succeeded; the second failed with an "item not found" error, showing a red error toast to the QCM. The QCM would then wonder if the first removal also failed and might re-add the item unnecessarily.
- **Fix:** Added `removingComplianceId` state tracking. Button is disabled and shows Loader2 spinner for the specific item being removed. Guard prevents second mutation from firing.
- **Impact:** No confusing error toasts on compliance item removal; single clean mutation per click.

**BUG-LT-HUNT-204: Finding count badge includes dispositioned discrepancies**
- **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- **What was broken:** The "Findings X" badge in the task card header counted ALL discrepancies for the work order, including "dispositioned" ones (findings that have already been evaluated and resolved). A lead tech working a WO with 7 historical discrepancies — 5 already dispositioned, 2 still open — would see "Findings 7" and assume all 7 were active problems requiring attention, triggering unnecessary alarm and conversations with the QCM.
- **Fix:** Filter findingCount to exclude `status === "dispositioned"` discrepancies. Only "open" and "under_evaluation" findings count toward the badge.
- **Impact:** Accurate active finding count; no inflated severity perception from resolved history.

**BUG-LT-HUNT-205: Handoff note textarea not disabled during submission**
- **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- **What was broken:** While the handoff note submit mutation was in-flight, only the Send button was disabled via `handoffSubmitting` — the textarea itself remained editable. A tech could continue typing after clicking "Add". If the mutation succeeded, `setHandoffNote("")` cleared the textarea including the new text they'd typed, losing it silently. If it failed, the tech had no visual feedback the submission was still processing.
- **Fix:** Added `disabled={handoffSubmitting}` to the Textarea component. Provides clear "I'm busy" feedback and prevents text loss.
- **Impact:** No silent text loss during handoff note submission; clear processing state.

**BUG-LT-HUNT-206: Add Compliance Item Save button has no loading guard**
- **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- **What was broken:** Double-clicking the "Save" button on the Add Compliance Item form fired two concurrent `addComplianceItemMutation` calls, creating duplicate compliance items on the task card. These are permanent maintenance records under 14 CFR 43.9 — duplicate AD/SB entries cannot be easily cleaned up and clutter the compliance audit trail.
- **Fix:** Added `isSavingNewCompliance` state flag. Button is disabled and shows Loader2 spinner while the mutation is in-flight.
- **Impact:** No duplicate compliance items from accidental double-clicks; clean audit trail.

---

### Cycle 6 — Shop Manager (2026-03-05)

**BUG-SM-HUNT-030: WO list subtitle recomputes active count inline instead of using memoized `counts.active`**
- **File:** `app/(app)/work-orders/page.tsx`
- **What was broken:** Subtitle text ran `.filter()` on the entire workOrders array every render to compute active count, duplicating the identical logic already memoized in `counts.active`. On shops with 200+ WOs, this wasted ~0.5ms per render on redundant iteration and created a maintenance risk (two separate "active" definitions to keep in sync).
- **Fix:** Replaced inline filter with `counts.active` reference.
- **Impact:** Eliminates redundant computation; single source of truth for active WO definition.

**BUG-SM-HUNT-031: WO list squawk badge shows singular "squawk" for all counts**
- **File:** `app/(app)/work-orders/page.tsx`
- **What was broken:** Badge text read `{wo.openSquawks} squawk` regardless of count — showing "3 squawk" instead of "3 squawks". Looks unprofessional in front of customers reviewing the WO board.
- **Fix:** Added conditional pluralization: `squawk${wo.openSquawks !== 1 ? "s" : ""}`.
- **Impact:** Correct English on every WO card; polished UI.

**BUG-SM-HUNT-032: WO detail `partsForThisWorkOrder` not memoized — recomputes on every render**
- **File:** `app/(app)/work-orders/[id]/page.tsx`
- **What was broken:** The `partsForThisWorkOrder` filter over ALL org parts ran outside `useMemo`, recalculating on every render. Convex live queries on `allParts` trigger frequent re-renders. For shops with thousands of parts, this caused measurable jank when switching tabs, typing notes, or starting/stopping timers on the WO detail page.
- **Fix:** Wrapped in `useMemo` with `[allParts, workOrderId]` dependencies.
- **Impact:** Eliminates O(n) part scan on every render; smoother WO detail page interaction.

**BUG-SM-HUNT-033: Dashboard crashes if aircraft has no `status` field**
- **File:** `app/(app)/dashboard/page.tsx`
- **What was broken:** `LiveFleetStatus` fallback branch called `ac.status.replace(/_/g, " ")` without null guard. Aircraft imported via CSV bulk upload or created with incomplete data could have `status: undefined`, crashing the entire dashboard with "Cannot read properties of undefined (reading 'replace')".
- **Fix:** Added null coalesce: `(ac.status ?? "unknown").replace(/_/g, " ")`.
- **Impact:** Dashboard no longer crashes when any aircraft is missing a status field.

**BUG-SM-HUNT-034: Reports page missing Inventory Report link in sub-navigation**
- **File:** `app/(app)/reports/page.tsx`
- **What was broken:** The `/reports/inventory` page existed with full inventory valuation and stock analysis, but the Reports page sub-navigation had no link to it. A shop manager reviewing monthly reports had no discoverable path to inventory data without knowing the URL directly.
- **Fix:** Added "Inventory" button with Package icon linking to `/reports/inventory` in the financial sub-nav bar.
- **Impact:** Complete Shop Manager reporting workflow — all report pages now reachable from the Reports hub.

**BUG-PC-HUNT-120: ReceivingInspection resetDialogState uses UTC date instead of local**
- **File:** `app/(app)/parts/_components/ReceivingInspection.tsx`
- **What was broken:** Initial inspection date used local calendar date (BUG-PC-HUNT-106 fix), but `resetDialogState()` reset it with `new Date().toISOString().slice(0, 10)` — UTC. After completing one inspection and opening the next, a clerk in UTC-5 working after 7 PM local time would see tomorrow's date pre-filled. This creates a compliance mismatch between the 8130-3 sign-off date and the inspection record.
- **Fix:** Replaced UTC `.toISOString()` with the same local-date helper used for initial state.
- **Impact:** Consistent local dates across all inspection workflows; no regulatory discrepancies.

**BUG-PC-HUNT-121: InventoryMasterTab shows $0.00 for all Unit Cost and Total Value**
- **File:** `app/(app)/parts/_components/InventoryMasterTab.tsx`
- **What was broken:** `unitCost` was hardcoded to `0` and the `PartRow` type didn't include `unitCost` from the data model. Every row in the Inventory Master tab showed $0.00 for unit cost and total value. A parts clerk or shop manager reviewing stock valuation got completely wrong data — rendering the "Total Value" column useless.
- **Fix:** Added `unitCost` to the PartRow type and read it from the actual part record (`part.unitCost ?? 0`).
- **Impact:** Inventory Master tab now shows real cost data; stock valuation is accurate.

**BUG-PC-HUNT-122: Kanban view missing "Pending Inspection" column**
- **File:** `app/(app)/parts/_components/InventoryKanban.tsx`
- **What was broken:** The Kanban board had 5 columns (In Stock, Reserved, Issued, Installed, Scrapped) but no "Pending Inspection" column. Parts in `pending_inspection` location silently fell into "In Stock" via the default case in `toStage()`. A parts clerk using the Kanban to track the receiving → inspection → stock flow saw no separation between inspected and uninspected parts.
- **Fix:** Added `pending_inspection` to the KanbanStage type, added it as the first column, and added the stage mapping in `toStage()`. Updated the grid to 6 columns.
- **Impact:** Full receiving workflow visibility in the Kanban view; pending inspection parts are clearly separated.

**BUG-PC-HUNT-123: PartsRequestQueue missing "Shipped" tab and "Mark Shipped" button**
- **File:** `app/(app)/parts/_components/PartsRequestQueue.tsx`
- **What was broken:** The request lifecycle is: requested → ordered → shipped → received → issued. But the queue only had tabs for All/Pending/Ordered/Received — no Shipped tab. A parts clerk tracking inbound vendor shipments couldn't filter to just shipped items. Additionally, the "ordered" status had no "Mark Shipped" transition button, so clerks had to skip directly from "ordered" to "received" — losing the shipped tracking state entirely.
- **Fix:** Added "Shipped" tab with filter, added "Mark Shipped" button for ordered requests.
- **Impact:** Complete request lifecycle tracking; clerks can now see what's en route vs. what's still on order.
