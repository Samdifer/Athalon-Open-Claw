# Athelon MRO — Technician Journey Audit: Phases 8–10
**Scope**: QA/IA Review (Phase 8), Return to Service (Phase 9), Billing & Pickup (Phase 10) + Cross-cutting Concerns
**Audit Date**: 2026-02-26
**Auditor**: Subagent (Phases 8–10 deep-code audit)
**App Root**: `/athelon-app`
**Method**: Full code reading of all referenced backend mutations, queries, and UI pages

---

## Summary

Phases 8–10 represent the legally highest-stakes portion of the technician journey — the regulatory sign-off, release, and financial close. The backend logic (especially `authorizeReturnToService`) is genuinely impressive: 9 hard-block preconditions, SHA-256 signature hashing, atomic auth-event consumption, immutable records, and comprehensive audit logging. However, the UI and workflow UX are materially incomplete:

- No QCM review UI exists at all
- PDF/document generation is a `TODO`
- Parts are not auto-populated on invoices despite the docstring claiming they are
- Tax is never auto-applied
- No offline support, no push notifications, no print capability
- The RTS form requires manual auth-event ID entry — a significant UX and error-surface problem

Total gaps: **21**

---

## Phase 8: QA/IA Review

### GAP-01: No QCM Review Dashboard or UI Page
**Phase**: 8 | **Severity**: CRITICAL
**Current state**: `createQcmReview` mutation is fully implemented in `convex/maintenanceRecords.ts` (line 1244) with all invariants (INV-24, INV-25, INV-26). The backend is complete and production-ready.
**What's needed**: There is NO UI route for QCM review anywhere in the app. No `app/(app)/qcm/`, no `app/(app)/quality/`, no "QCM Review" button on the work order detail page. The QCM literally has no way to call `createQcmReview` from the app. This is a compliance gap: per REQ-LP-05, the QCM must perform a formal post-close review. Without the UI, this mandatory step is silently skipped.
**Code reference**: `convex/maintenanceRecords.ts:1244` (mutation exists), `app/(app)/` (no QCM page)

---

### GAP-02: Only One Person Can Be QCM — No Deputy Support
**Phase**: 8 | **Severity**: HIGH
**Current state**: `createQcmReview` enforces INV-25 as a strict equality check: `org.qualityControlManagerId !== args.reviewerTechnicianId`. The code comment explicitly states: "Deputy QCM authorization is v1.1 scope." If the QCM is unavailable (vacation, illness, emergency), no one else can perform the review.
**What's needed**: Deputy QCM designation on the organization record, or a temporary delegation mechanism. Real shops frequently need this — one sick day shouldn't ground a work order.
**Code reference**: `convex/maintenanceRecords.ts:1348–1365` (INV-25 check)

---

### GAP-03: IA Counter-Signature on Task Cards Has No UI Surface
**Phase**: 8 | **Severity**: HIGH
**Current state**: `returnToService.ts` (PRECONDITION 4) correctly checks `naAuthorizedById` on `taskCardSteps` with `signOffRequiresIa == true`. The backend enforces this — NA steps on IA-required work cannot clear RTS unless an IA has set `naAuthorizedById`. However, there is no visible UI for an IA to review and authorize NA steps across all task cards in a work order.
**What's needed**: An "IA Review Queue" — a view showing all task cards with unreviewed NA steps across the work order, allowing an IA to review each one and mark it authorized. The `getCloseReadinessReport` query returns `unreviewedNaStepIds` per card, but no page displays this list or lets the IA act on it.
**Code reference**: `convex/returnToService.ts:280–310` (PRECONDITION 4), `convex/returnToService.ts:630–660` (query surfaces unreviewed NA steps), no corresponding UI page found

---

### GAP-04: Maintenance Records Page Uses V1 Readiness Query (Not V2)
**Phase**: 8 | **Severity**: MEDIUM
**Current state**: `app/(app)/work-orders/[id]/records/page.tsx` (line 32) calls `api.returnToService.getCloseReadinessReport` — the v1 readiness query. Wave 2 added `getWorkOrderCloseReadinessV2` in `convex/maintenanceRecords.ts` (line 1517) which adds two new checks: (1) all maintenance records have structured pipe-separated approved data references, and (2) test equipment calibration warnings.
**What's needed**: The records page should use `getWorkOrderCloseReadinessV2` instead of (or in addition to) v1, so technicians see the structured-reference check and calibration warnings at the point of record creation, not only at RTS time.
**Code reference**: `app/(app)/work-orders/[id]/records/page.tsx:32`, `convex/maintenanceRecords.ts:1517`

---

### GAP-05: No "IA Unsigned Steps" Cross-Work-Order Query
**Phase**: 8 | **Severity**: MEDIUM
**Current state**: The only way to see unreviewed NA steps is per work order via `getCloseReadinessReport`. There is no query that shows an IA all unreviewed NA steps across all open work orders in the org.
**What's needed**: A query `getIaReviewQueue` (or similar) that returns all `taskCardSteps` where `signOffRequiresIa == true`, `status == "na"`, and `naAuthorizedById == null` across the organization. An IA should be able to see their entire review queue, not hunt work-order by work-order.
**Code reference**: `convex/returnToService.ts:278–312` (precondition 4 iterates per-WO only), no global IA queue query found in any convex file

---

### GAP-06: Signature Page Requires Manual Auth Event ID Entry on RTS Form
**Phase**: 8/9 | **Severity**: HIGH
**Current state**: The signature page (`app/(app)/work-orders/[id]/signature/page.tsx`) correctly generates a `signatureAuthEvent` token and shows it with a countdown. However, the RTS page (`app/(app)/work-orders/[id]/rts/page.tsx`) has a plain `useState` for `signatureAuthEventId` with no pre-population from the signature flow. The `RtsSignoffForm` component receives `signatureAuthEventId` as a controlled string input.
**What's needed**: The RTS page should read the `?authEventId=` query param (the signature page passes it via `returnTo` redirect), or the signature → RTS flow should be a single wizard step. Requiring a technician to manually copy-paste a Convex ID string is an error-prone UX and defeats the purpose of the 5-minute TTL.
**Code reference**: `app/(app)/work-orders/[id]/signature/page.tsx:72–77` (returnTo redirect), `app/(app)/work-orders/[id]/rts/page.tsx:18` (no query param read), `app/(app)/work-orders/[id]/rts/page.tsx:37` (useState with no default)

---

## Phase 9: Return to Service

### GAP-07: PDF / RTS Document Generation Is a TODO
**Phase**: 9 | **Severity**: CRITICAL
**Current state**: `generateRtsDocument` mutation assembles all legal fields into a `documentFields` object and logs a `record_viewed` audit entry. The code comment explicitly states: "Actual PDF rendering is handled by a Convex action (calling a PDF library) that reads this snapshot. TODO: Phase 4.1 — Implement the PDF rendering action that calls this mutation's output and produces a storable PDF blob."
**What's needed**: A Convex action that calls a PDF library (e.g., `@react-pdf/renderer`, `puppeteer`, or `pdfkit`) to render a legally formatted 14 CFR 43.11 return-to-service document. The document must include all fields from `generateRtsDocument.documentFields`. Without this, there is no printable/storable official RTS record — only the database entry.
**Code reference**: `convex/returnToService.ts:640–660` (TODO comment on PDF rendering action)

---

### GAP-08: Aircraft Release Certificate / FAA 337 Not Implemented
**Phase**: 9 | **Severity**: HIGH
**Current state**: No aircraft release certificate or FAA Form 337 (for major repairs/alterations) generation exists anywhere in the codebase. The `work_order_type` supports `"major_repair"` and `"major_alteration"` (defined in `workOrders.ts:64–67`), but there is no 337 form path.
**What's needed**: For major repairs and alterations, FAA Form 337 must be completed in duplicate — one copy to the aircraft records, one copy to the FAA. The system needs a 337 generation path triggered when `workOrderType == "major_repair" || "major_alteration"`. For standard RTS, an aircraft release certificate (similar to EASA Form 1 concept) should be generatable.
**Code reference**: `convex/workOrders.ts:64–67` (workOrderType includes major_repair/alteration), no 337 form code found

---

### GAP-09: No Sticker / Discrepancy Tag Generation
**Phase**: 9 | **Severity**: MEDIUM
**Current state**: No sticker, discrepancy tag, or "INOP" tag generation exists anywhere in the codebase. Hangars use physical tags on discrepant systems/components.
**What's needed**: Printable discrepancy tags (showing squawk description, date opened, MEL item if deferred, aircraft tail) and "INOP" stickers for MEL-deferred items. Should be triggerable from the discrepancy list on a work order.
**Code reference**: No sticker/tag generation found in `convex/` or `app/(app)/`

---

### GAP-10: closeWorkOrder Mutation vs. authorizeReturnToService — Overlap / Confusion Risk
**Phase**: 9 | **Severity**: HIGH
**Current state**: Two mutations can close a work order: `closeWorkOrder` (in `convex/workOrders.ts:463`) and `authorizeReturnToService` (in `convex/returnToService.ts`). Both accept `returnToServiceStatement` and `signatureAuthEventId`. `closeWorkOrder` sets `status: "closed"` directly; `authorizeReturnToService` also sets `status: "closed"` (Step 5). There are 9 preconditions in `authorizeReturnToService` but `closeWorkOrder` has different guards (6 conditions, different implementation).
**What's needed**: Clarify the intended flow. Based on the code comments, `authorizeReturnToService` appears to be the canonical Phase 4 RTS path. `closeWorkOrder` may be a legacy or alternative path. The duplication creates risk that a WO could be closed via `closeWorkOrder` bypassing some of the 9 RTS preconditions (e.g., `closeWorkOrder` does not check AD compliance or discrepancy MEL expiry). The RTS page calls `authorizeReturnToService` — the correct one — but `closeWorkOrder` exists as a potential bypass.
**Code reference**: `convex/workOrders.ts:463` (closeWorkOrder), `convex/returnToService.ts:130` (authorizeReturnToService), both set status="closed"

---

### GAP-11: Aircraft Hours at RTS Is a Manual Entry — Not Auto-Populated
**Phase**: 9 | **Severity**: HIGH
**Current state**: The RTS form (`RtsSignoffForm`) has an `aircraftHoursAtRts` text input. The backend (PRECONDITION 3) requires this value to exactly match `workOrder.aircraftTotalTimeAtClose`. If the work order has `aircraftTotalTimeAtClose` already set, the form should pre-populate it. The RTS page has access to `report.aircraftTotalTimeAtClose` from `getCloseReadinessReport` but does NOT use it to pre-populate the field.
**What's needed**: Auto-populate `aircraftHoursAtRts` from `report.aircraftTotalTimeAtClose` when available. The user should be confirming the value, not re-entering it. Manual re-entry creates transcription error risk and causes avoidable PRECONDITION 3 failures.
**Code reference**: `convex/returnToService.ts:238–268` (PRECONDITION 3 strict match), `app/(app)/work-orders/[id]/rts/page.tsx:9` (aircraftHoursAtRts is blank string), `convex/returnToService.ts:658` (report.aircraftTotalTimeAtClose available)

---

### GAP-12: Logbook Has No Pagination for Large Aircraft
**Phase**: 9 | **Severity**: MEDIUM
**Current state**: `app/(app)/fleet/[tail]/logbook/page.tsx` uses `useQuery(api.maintenanceRecords.listByAircraft, ...)` which calls `.collect()` — a full table scan of all maintenance records for the aircraft. For a 20-year-old airframe with hundreds or thousands of records, this is an O(n) load.
**What's needed**: Paginated logbook using `usePaginatedQuery`. The logbook page should load in pages (e.g., 50 records at a time) with a "Load more" button. The filter bar should ideally also support date range filtering server-side, not just client-side.
**Code reference**: `app/(app)/fleet/[tail]/logbook/page.tsx:95–100` (rawRecords = useQuery, full collect), `convex/maintenanceRecords.ts` (listByAircraft likely uses .collect())

---

### GAP-13: No Print Button on Logbook or RTS Records
**Phase**: 9 | **Severity**: MEDIUM
**Current state**: The logbook page and RTS success page have no print button or `window.print()` call. The RTS success page only shows the RTS Record ID.
**What's needed**: A "Print" or "Export PDF" button on the logbook timeline and on the post-RTS success screen. The logbook is a legal document — technicians and owners need to print it for physical aircraft records. The RTS record should be printable/downloadable as a formatted document (distinct from the raw database entry).
**Code reference**: `app/(app)/fleet/[tail]/logbook/page.tsx` (no print functionality), `app/(app)/work-orders/[id]/rts/page.tsx:90–110` (success state shows only Record ID, no download)

---

## Phase 10: Billing & Pickup

### GAP-14: Parts NOT Auto-Populated on Invoice — Docstring Misleads
**Phase**: 10 | **Severity**: CRITICAL
**Current state**: The `createInvoiceFromWorkOrder` mutation docstring says "Auto-populates labor line items from time entries and parts line items from maintenanceRecords consumed parts." However, the actual implementation only auto-populates labor from `timeEntries`. There is zero parts auto-population code in the handler. The parts loop simply does not exist. The `partsTotal` starts at 0.
**What's needed**: Query `maintenanceRecords` for the work order, iterate `partsReplaced` arrays on each record, and create `invoiceLineItems` of `type: "part"` for each installed/removed part. Alternatively, query a `partsUsed` or `partsInstalled` table if one exists. Technicians who consumed $10,000 of parts will have a $0 parts invoice until someone notices.
**Code reference**: `convex/billing.ts:687` (docstring claims parts auto-populate), `convex/billing.ts:727–760` (implementation — only time entries, no parts loop)

---

### GAP-15: Labor Rates Default to $0 — No Pricing Rule Auto-Application
**Phase**: 10 | **Severity**: HIGH
**Current state**: `createInvoiceFromWorkOrder` creates labor line items with `unitPrice: 0` and `total: 0`. The comment says "Labor rates default to 0 — pricing rules must be applied separately via computePrice." A `billing/pricing` section exists in the app but there is no auto-application of pricing rules to new invoices.
**What's needed**: On invoice creation from a work order, the system should look up the applicable billing rate (from the pricing table) for each technician and apply it to their labor line item. Without this, every invoice requires manual rate entry — a guaranteed billing workflow failure in a busy shop.
**Code reference**: `convex/billing.ts:743–753` (unitPrice: 0 on all labor items), `app/(app)/billing/pricing/` (pricing config exists but not linked to invoice creation)

---

### GAP-16: Tax Is Never Auto-Applied to Invoices
**Phase**: 10 | **Severity**: HIGH
**Current state**: `createInvoiceFromWorkOrder` accepts an optional `taxRate` parameter (line 702), but the invoice is always inserted with `tax: 0` (line 716). The `taxRate` argument is received but never used in the handler — it is completely ignored. A `billing/tax-config` page exists with `createTaxRate` functionality (via `api.billingV4.createTaxRate`) but the configured rates are never applied automatically.
**What's needed**: When `createInvoiceFromWorkOrder` is called, look up the default tax rate for the organization (from the `taxRates` table, where `isDefault == true`) and compute `tax = subtotal * taxRate / 100`. Apply it to the invoice totals. The `taxRate` arg should also be wired up properly if a caller wants to override.
**Code reference**: `convex/billing.ts:702` (taxRate arg), `convex/billing.ts:716` (tax: 0 — arg ignored), `app/(app)/billing/tax-config/page.tsx` (tax config exists but unused in creation)

---

### GAP-17: No "Work Summary" View Before Billing
**Phase**: 10 | **Severity**: HIGH
**Current state**: The invoice creation page (`app/(app)/billing/invoices/new/page.tsx`) shows a dropdown of closed work orders but provides no summary of what work was done — no task card list, no maintenance records summary, no parts consumed, no discrepancies corrected. A billing person creating an invoice has no context.
**What's needed**: When a work order is selected in "From Work Order" mode, show a work summary panel: list of task cards completed, maintenance records created, parts installed (from `partsReplaced`), and any MEL deferrals. This is both a UX need (prevents billing omissions) and a customer trust feature (itemized invoice = fewer disputes).
**Code reference**: `app/(app)/billing/invoices/new/page.tsx:66–100` (WO selected but no summary shown), `convex/billing.ts:693` (createInvoiceFromWorkOrder — WO fetched but only status checked, no summary data)

---

### GAP-18: No "Release to Customer" / Pickup Acknowledgment Flow
**Phase**: 10 | **Severity**: HIGH
**Current state**: Sending an invoice (`sendInvoice` mutation) changes its status from DRAFT to SENT and makes it immutable. This is the billing side. There is no corresponding "aircraft released to customer" workflow — no pickup acknowledgment, no customer signature on pickup, no "aircraft departed" event.
**What's needed**: A "Release Aircraft to Customer" action on the work order (post-RTS, post-invoice) that: (1) records the customer pickup time, (2) optionally captures a customer signature or acknowledgment, (3) transitions the aircraft status from `airworthy` to `released` or similar, (4) logs the event with technician identity for liability documentation.
**Code reference**: `convex/returnToService.ts` (RTS marks aircraft "airworthy" but there's no release/pickup transition), `convex/workOrders.ts` (no releaseToCustomer mutation), `app/(app)/billing/invoices/[id]/page.tsx` (no release button found)

---

## Cross-Cutting Concerns

### GAP-19: No Offline Capability
**Phase**: All | **Severity**: HIGH
**Current state**: Athelon is built entirely on Convex real-time subscriptions with no offline fallback. No service worker, no manifest.json, no IndexedDB caching, no PWA configuration was found anywhere in the project. `useQuery` and `useMutation` calls fail silently or throw when the network is down.
**What's needed**: Hangars are notoriously poor WiFi environments. At minimum: (1) a PWA manifest so the app installs on tablets, (2) a service worker caching shell and static assets, (3) local draft storage for task card step sign-offs that can sync when connectivity resumes. The Convex offline sync story is limited, but a read-only cache layer with conflict-resolution on reconnect is achievable.
**Code reference**: No `next.config.js` PWA plugin, no `public/sw.js`, no `manifest.json` found

---

### GAP-20: No Push / In-App Notification System
**Phase**: All | **Severity**: HIGH
**Current state**: There is no notification infrastructure of any kind. No in-app notification bell, no push notification API calls, no webhook triggers. Key events that a technician needs to know about — PO approved, parts received, work order assigned, IA review required — produce audit log entries and nothing else.
**What's needed**: At minimum, an in-app notification feed (a `notifications` table, a bell icon in the nav, a `listNotifications` query). Events that should trigger notifications: PO status changes to RECEIVED, new task card assigned to technician, IA review required (NA step), QCM review findings requiring amendment, aircraft AOG status change. Push notifications (web push or mobile) are a v1.1 concern but the in-app feed is MVP-critical.
**Code reference**: No notification table in schema, no notification bell in app layout, `app/(app)/billing/` (PO received events exist in audit log only)

---

### GAP-21: No Global Search Across WOs, Aircraft, Task Cards
**Phase**: All | **Severity**: MEDIUM
**Current state**: Individual list pages have local search (e.g., work orders list, customers list, parts list), but each searches only its own entity type. There is no global search bar or cross-entity search (e.g., "find everything related to N12345" or "find task cards mentioning 'landing gear'").
**What's needed**: A global search command palette (Cmd+K) with at minimum: work order number search, aircraft tail number search, part number search, and task card title search. Convex full-text search (`searchIndex`) supports this natively with `ctx.db.query(...).search(...)`. This is especially important for the QCM reviewing records across a busy shop.
**Code reference**: `app/(app)/work-orders/page.tsx` (local WO search), no global search component in `app/(app)/layout.tsx`

---

## Appendix: What Is Well-Built

For completeness, the following areas are production-quality and do not require gaps:

- **`authorizeReturnToService`** — 9 hard-block preconditions, SHA-256 signature hash, atomic auth-event consumption, comprehensive audit trail. Exemplary implementation.
- **`createQcmReview`** — Properly enforces INV-24/25/26, immutable record, amendment chain pattern mirrors maintenance records. Complete.
- **`getCloseReadinessReport`** / **`getWorkOrderCloseReadinessV2`** — Comprehensive pre-flight readiness checks. V2 adds structured reference and calibration checks. Well-designed.
- **`createMaintenanceRecord` (Wave 2)** — Full 11-point enforcement, SHA-256 hash, structured approved data reference serialization, test equipment calibration tracking, correction record pattern. Complete.
- **Signature PIN flow** — Single-use 5-minute auth event, countdown UI, consumed atomically with signing mutation. Well-designed.
- **Logbook timeline page** — Clear 43.9/43.11 visual distinction, correction record indicators, RTS badge, approved data reference parsing. Good UX.
- **Invoice immutability** — SENT/PAID invoices cannot be edited (`assertInvoiceEditable`). Correct financial control.
- **Audit logging** — Every mutation writes to `auditLog` atomically. Complete and consistent.
