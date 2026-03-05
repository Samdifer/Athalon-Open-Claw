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
