# Feature Intake Implementation Review

Date: 2026-03-03  
Source plan: `docs/plans/2026-03-03-feature-intake-wave-roadmap.md`  
Scope: repo scan + targeted verification + immediate fixes

## Verification Executed

1. `npm run typecheck` (pass)
2. `npx playwright test e2e/billing-quote.spec.ts --project=chromium-authenticated` (2 passed, 2 skipped)
3. `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts e2e/wave11-work-order-lifecycle-guard.spec.ts e2e/wave6-rts-release-gate.spec.ts e2e/wave6-parts-wo-safety.spec.ts --project=chromium-authenticated` (20 passed)
4. Re-run after fixes:
   - `npm run typecheck` (pass)
   - `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts e2e/wave11-work-order-lifecycle-guard.spec.ts --project=chromium-authenticated` (6 passed)
5. Wave 13 build verification:
   - `npx convex codegen` (pass)
   - `npm run typecheck` (pass)
   - `npx playwright test e2e/wave13-lead-turnover.spec.ts e2e/wave12-wo-dashboard-quote-decisions.spec.ts --project=chromium-authenticated` (3 passed, 1 skipped)
   - `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts e2e/wave11-work-order-lifecycle-guard.spec.ts --project=chromium-authenticated` (6 passed)
6. Wave 14 verification:
   - `npm run typecheck` (pass)
   - `npx playwright test e2e/wave14-fleet-wo-evidence.spec.ts --project=chromium-authenticated` (3 passed)
   - `npx playwright test e2e/wave12-wo-dashboard-quote-decisions.spec.ts e2e/wave13-lead-turnover.spec.ts e2e/wave9-work-order-creation-guard.spec.ts e2e/wave11-work-order-lifecycle-guard.spec.ts e2e/wave6-rts-release-gate.spec.ts e2e/wave6-parts-wo-safety.spec.ts --project=chromium-authenticated` (23 passed, 1 skipped)
   - `npx playwright test e2e/smoke-full.spec.ts --project=chromium` (52 passed)

## Findings (Remaining)

## S1

1. Line-item decision attribution depth (`FR-024`) remains partial: actor fields are now captured and displayed, but a full immutable multi-event acceptance history trail per line item is still pending.

## S2

1. Lead workspace remains partial (`FR-011`/`FR-012`/`FR-013`): core assignment + turnover draft/submit lock is implemented, but subtask assignment UI, richer team analytics visuals, and auto-ingested parts/day feed summaries are still incomplete.

2. In-dock/RTS evidence workflow (`FR-016`) is now present as dedicated checklist/video surfaces, but admin-managed digital checklist templates and stronger upload policy/retention controls are still pending.

## Fixes Applied

1. Added location-scoped filter to Work Orders list flow (`FR-017` alignment).
   - File: `app/(app)/work-orders/page.tsx`
   - Changes:
     - Query now passes `shopLocationId` to `api.workOrders.getWorkOrdersWithScheduleRisk`.
     - Added location selector in filter popover using `api.shopLocations.list`.
     - Clear-filter action now resets location selection.
     - Corrected type filtering to compare raw `workOrderType` directly (removed brittle label reverse lookup).

2. Added top-of-work-order lifecycle stage timeline (`FR-010` alignment).
   - File: `app/(app)/work-orders/[id]/page.tsx`
   - Changes:
     - Added normalized stage sequence:
       `Quoting -> In-dock -> Inspection -> Repair -> Return to Service -> Review & Improvement`.
     - Added status-to-stage mapping and visible stage card in WO detail header area.

3. Implemented Work Order Dashboard subpage (`FR-021`).
   - Files:
     - `app/(app)/work-orders/dashboard/page.tsx` (new)
     - `App.tsx` (route)
     - `components/AppSidebar.tsx` (navigation)
     - `app/(app)/work-orders/page.tsx` (quick-link button)
   - Changes:
     - Added active WO KPI dashboard with total estimated/apply hours, portfolio WIP %, and days-to-RTS countdown per WO.
     - Wired metrics to `api.workOrders.getWorkOrdersWithScheduleRisk` + `api.timeClock.listTimeEntries`.

4. Implemented quote line-item decision UX (`FR-023` baseline + `FR-024` partial).
   - Files:
     - `convex/billing.ts`
     - `app/(app)/billing/quotes/[id]/page.tsx`
   - Changes:
     - Enriched quote line items with linked discrepancy metadata (`discrepancyType`, `discrepancyNumber`) from backend query.
     - Added per-line `Category` and `Customer Decision` columns.
     - Added Accept/Defer/Decline line-item actions and notes dialog using `api.gapFixes.decideQuoteLineItem`.

5. Implemented lead workspace + turnover report baseline (`FR-011`/`FR-012`/`FR-013` partial).
   - Files:
     - `convex/schema.ts`
     - `convex/leadTurnover.ts` (new)
     - `app/(app)/work-orders/lead/page.tsx` (new)
     - `lib/pdf/TurnoverReportPDF.tsx` (new)
     - `App.tsx`
     - `components/AppSidebar.tsx`
     - `app/(app)/work-orders/page.tsx`
     - `e2e/wave13-lead-turnover.spec.ts` (new)
   - Changes:
     - Added `leadAssignments` table for work-order/task-card/task-step ownership metadata.
     - Added `turnoverReports` table with draft/submitted lifecycle and submission signature fields.
     - Added `leadTurnover` API:
       - `getLeadWorkspace` (assignment + turnover day context + AI draft summary seed)
       - `assignEntity` (lead assignment mutation with task-card -> My Work sync path)
       - `upsertTurnoverDraft`
       - `submitTurnoverReport` (immutable submit lock)
     - Added `/work-orders/lead` UI for lead assignment and turnover editing/submission.
     - Added turnover PDF export action and report template.
     - Added route/nav/quick-link integration for the lead workspace.

6. Extended quote decision actor attribution (`FR-024`).
   - Files:
     - `convex/schema.ts`
     - `convex/gapFixes.ts`
     - `convex/billing.ts`
     - `app/(app)/billing/quotes/[id]/page.tsx`
   - Changes:
     - Added decision actor fields to `quoteLineItems` (`customerDecisionByUserId`, `customerDecisionByTechnicianId`, `customerDecisionByName`).
     - Mutation now captures caller user and resolved technician context on decision.
     - Quote query now resolves display name for decision actor.
     - UI now shows decision attribution (`by <name>`) per line item.

7. Implemented fleet/work-order alternate views + thumbnail linkage (`FR-014`/`FR-015`).
   - Files:
     - `convex/aircraft.ts`
     - `convex/workOrders.ts`
     - `convex/documents.ts`
     - `app/(app)/fleet/page.tsx`
     - `app/(app)/work-orders/page.tsx`
     - `e2e/wave14-fleet-wo-evidence.spec.ts` (new)
   - Changes:
     - Added fleet schedule-window filters (`in work`, `next 3/6/12 months`) and class/make/model filters.
     - Added fleet list/tile/truncated modes.
     - Added aircraft featured image/gallery flow and featured photo mutation.
     - Added work-order list/tile/truncated modes with aircraft thumbnail rendering.
     - Added E2E coverage for both fleet and work-order view mode switching.

8. Added dedicated in-dock/RTS evidence hub (`FR-016` baseline).
   - Files:
     - `app/(app)/work-orders/[id]/_components/InDockRtsEvidenceTab.tsx` (new)
     - `app/(app)/work-orders/[id]/page.tsx`
   - Changes:
     - Added `In-dock & RTS` tab with dedicated checklist/video upload buckets.
     - Added multi-file mobile-friendly video upload (10-20 minute guidance), auto naming by aircraft + inspection type, in-app preview, download, and delete.
     - Added E2E route coverage for evidence tab rendering.

## Plan Coverage Snapshot (Current)

Legend:
- `Implemented`: functionally present in code
- `Partial`: some backend/schema or limited UI present
- `Missing`: not yet implemented

| FR | Status | Notes |
|---|---|---|
| FR-001 | Missing | No map-based location creation UI found. |
| FR-002 | Missing | No ADS-B ingestion integration flow found. |
| FR-003 | Partial | WO-level docs exist; task/subtask manual/PDF experience not fully implemented. |
| FR-004 | Partial | Discrepancy/signoff foundations exist; full role-capability admin matrix not complete. |
| FR-005 | Partial | Some estimated/actual fields exist; task discrepancy-level visibility is not complete. |
| FR-006 | Partial | Step-level parts installed/removed fields exist; full compliance-doc drill-through is incomplete. |
| FR-007 | Partial | WO parts linking exists; requested/ordered/received/installed lifecycle view is incomplete. |
| FR-008 | Missing | Provisional new-part acceptance queue for parts clerk not found. |
| FR-009 | Partial | Color states exist for current part location model, not full requested semantic set. |
| FR-010 | Implemented | Added WO lifecycle stage timeline on detail page. |
| FR-011 | Partial | Lead turnover workspace and draft summary support are now present; deeper auto-feed synthesis and richer shift analytics are still pending. |
| FR-012 | Partial | Dedicated lead page is present with work-order/task assignment controls; full subtask UI and broader team-insight depth remain incomplete. |
| FR-013 | Partial | Turnover report draft/save, PDF export, submit-lock, and submission signature trail exist; advanced charting/detail contract items are still pending. |
| FR-014 | Implemented | Fleet supports schedule-window filters and list/tile/truncated modes plus class/make/model filtering. |
| FR-015 | Implemented | Work Orders supports list/tile/truncated modes with aircraft featured-thumbnail linkage from Fleet media. |
| FR-016 | Partial | Dedicated in-dock/RTS checklist + liability video hubs are implemented; checklist templating/admin controls remain incomplete. |
| FR-017 | Implemented | Added all-locations/specific-location filter in Work Orders list query flow. |
| FR-018 | Partial | Scheduling Gantt exists; WO-detail integrated Gantt and smart assignment path incomplete. |
| FR-019 | Missing | Task-level return-to-parts prefill/confirm workflow not found. |
| FR-020 | Partial | Receiving basics exist; full checklist ownership + batch doc packaging flow incomplete. |
| FR-021 | Implemented | Added `work-orders/dashboard` with active WO KPI + WIP + days-to-RTS countdown. |
| FR-022 | Partial | WO KPI/date surfaces exist; full committed/post-inspection RTS date workflow incomplete. |
| FR-023 | Implemented | Added line-item decision controls and category surfacing in quote detail UI. |
| FR-024 | Partial | Line-item decisions now include actor attribution and display name, but full immutable decision-event history is still partial. |
| FR-025 | Partial | Origin taxonomy fields exist but not consistently surfaced end-to-end in all workflows. |
