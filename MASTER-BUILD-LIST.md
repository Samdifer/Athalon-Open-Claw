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
