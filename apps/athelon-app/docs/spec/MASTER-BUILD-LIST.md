# MASTER FEATURE SPECIFICATION REGISTRY — Athelon MRO Platform

**Canonical Path:** `athelon-app/MASTER-BUILD-LIST.md`

This file is the markdown-authoritative source of truth for feature status, implementation level, review timestamps, and feature interconnections across the application.

## Bug Hunter Fixes

- **BUG-SM-HUNT-016** — New Work Order form `estimatedLaborHoursOverride` silently discarded an explicit "0" value because `0 || undefined` evaluates to `undefined`. A shop manager entering 0 hours for warranty/no-charge work got their override dropped, causing fallback to task-card sum.
  **File:** `app/(app)/work-orders/new/page.tsx`
  **Fix:** Replaced `|| undefined` chain with strict `Number.isFinite` + non-negative guard using an IIFE, so 0 is a valid passthrough.
  **Why it matters:** Explicit zero-hour overrides are now preserved, supporting warranty and goodwill WOs.

- **BUG-SM-HUNT-017** — New Work Order form's promised delivery date past-date validation used `new Date("YYYY-MM-DD")` (UTC midnight) while the actual submission parsed dates as local midnight. In UTC+ timezones, today's date could falsely show a "past date" warning after 00:00 UTC.
  **File:** `app/(app)/work-orders/new/page.tsx`
  **Fix:** Switched validation to the same local-midnight split-and-construct pattern used by the submit handler.
  **Why it matters:** Shop managers no longer see false overdue warnings when creating WOs with today's promised date.

- **BUG-SM-HUNT-018** — Kanban board drag-and-drop from any column into "Pending Inspection" always set status to `pending_inspection`, even for WOs that were already `pending_signoff`. This silently downgraded QCM sign-off readiness.
  **File:** `app/(app)/work-orders/kanban/page.tsx`
  **Fix:** Drop handler now checks if the WO's original status was `pending_signoff` and preserves it when dropping back into the same column.
  **Why it matters:** QCM sign-off state is no longer lost through routine kanban board rearrangement.

- **BUG-SM-HUNT-019** — Dashboard `todayLabel` was memoized with empty deps `useMemo(fn, [])`, computing once on mount. If the dashboard stayed open past midnight, it displayed yesterday's date all day.
  **File:** `app/(app)/dashboard/page.tsx`
  **Fix:** Added `workOrdersWithRisk` as a dependency so the label re-evaluates when live query data updates (which happens frequently enough to catch date rollovers).
  **Why it matters:** Shop managers who keep the dashboard open see the correct date without manual refresh.

- **BUG-SM-HUNT-020** — Kanban board showed `pending_signoff` and `pending_inspection` WOs identically in the same "Pending Inspection" column, with no visual way to distinguish QCM-ready work orders from those awaiting regular inspector review.
  **File:** `app/(app)/work-orders/kanban/page.tsx`
  **Fix:** Added a purple "QCM" badge on cards with `pending_signoff` status.
  **Why it matters:** Shop managers can instantly identify which WOs in the inspection column are ready for QCM release vs. still awaiting initial inspection.

- **BUG-QCM-HUNT-006** — Compliance card skipped AD/SB status query when `currentRegistration` was blank, showing “Not Configured” even when AD records existed for the aircraft.
  **File:** `app/(app)/compliance/_components/AircraftComplianceCard.tsx`
  **Fix:** Removed tail-number gate and always queried compliance by `aircraftId` + `organizationId`.
  **Why it matters:** QCM inspectors no longer miss real non-compliance on imported/onboarding aircraft with temporary missing registrations.

- **BUG-QCM-HUNT-008** — Release page could show active release form for already-released work orders after refresh/navigation, allowing duplicate submit attempts that fail late.
  **File:** `app/(app)/work-orders/[id]/release/page.tsx`
  **Fix:** Added persisted release-state guard using `wo.releasedAt` and render confirmation mode for previously released WOs.
  **Why it matters:** Prevents confusing duplicate-release workflow and keeps release records operationally trustworthy.

- **BUG-QCM-HUNT-009** — Audit Trail fleet overview subtitle showed “Loading sort order…” whenever the preloaded summary map was empty, including valid zero-record states.
  **File:** `app/(app)/compliance/audit-trail/page.tsx`
  **Fix:** Added explicit `isSummaryLoaded` prop and switched subtitle logic to load-state rather than map size.
  **Why it matters:** QCM inspectors get accurate status messaging instead of false loading indicators during fleet-level compliance review.

- **BUG-QCM-HUNT-004** — RTS hours input accepted malformed values like `123abc` (via `parseFloat`) and negative numbers, creating invalid hour entries and late submit failures.
  **File:** `app/(app)/work-orders/[id]/rts/page.tsx`
  **Fix:** Replaced permissive parsing with strict numeric validation using `Number(...)`, `Number.isFinite`, and non-negative guard; updated user-facing error copy.
  **Why it matters:** QCM inspectors can’t accidentally authorize RTS with corrupted total-time values.

- **BUG-QCM-HUNT-005** — IA queue grouping used raw `workOrderNumber` only; null/missing WO numbers collapsed unrelated steps into a single “undefined” bucket.
  **File:** `app/(app)/compliance/qcm-review/page.tsx`
  **Fix:** Added stable fallback group keys from `workOrderId` (`WO-<id suffix>`) with a final `WO-UNKNOWN` fallback.
  **Why it matters:** IA sign-off queue remains correctly grouped per work order even with imperfect imported records.

- **BUG-QCM-HUNT-006** — Audit Trail aircraft selector had no way to clear a selected aircraft and return to fleet-level overview without page reload.
  **File:** `app/(app)/compliance/audit-trail/page.tsx`
  **Fix:** Added explicit `All Aircraft (Fleet Overview)` select option and wired it to clear `?aircraft=` context.
  **Why it matters:** QCM inspectors can smoothly toggle between per-aircraft drill-in and fleet oversight in one workflow.

- **BUG-QCM-HUNT-007** — RTS page only seeded `signatureAuthEventId` from URL on first render; auth redirects that updated query params mid-session could leave stale/empty form state.
  **File:** `app/(app)/work-orders/[id]/rts/page.tsx`
  **Fix:** Added effect to sync non-empty `authEventId` query param into signature field state.
  **Why it matters:** Re-auth handoff is reliable and avoids manual ID re-entry after returning from signature flow.

- **BUG-BH-012** — Quote Workspace “Attention Queue” total added AOG count + sent-quote count, which double-counted the same work order when both conditions applied.
  **File:** `src/shared/components/quote-workspace/QuoteWorkspaceShell.tsx`
  **Fix:** Switched attention metric to a single unique WO filter (`priority === "aog" || quoteStatus === "SENT"`).
  **Why it matters:** Billing managers now see a true workload count instead of inflated queue totals.

- **BUG-BH-013** — Invoice batch actions used selected rows from the filtered list only, so search/filter changes could hide selected invoices from the payment dialog while void action still applied to all selected IDs.
  **File:** `app/(app)/billing/invoices/page.tsx`
  **Fix:** Derived `selectedInvoices`/`selectedDraftIds` from the full invoice dataset (`all`) instead of only filtered rows.
  **Why it matters:** Batch send/void/payment actions now operate on the same selected set consistently, preventing hidden-selection surprises.

- **BUG-BH-014** — WO Profitability page rendered before customers query loaded, briefly showing “Unknown” customers and blank-looking report context.
  **File:** `app/(app)/reports/financials/profitability/page.tsx`
  **Fix:** Added `customers === undefined` to loading gate.
  **Why it matters:** Billing users get stable, trustworthy customer context when opening P&L.

- **BUG-BH-015** — WO Profitability date filtering relied on `createdAt` only and used invoice number as row key, causing dropped rows when legacy invoices lacked `createdAt` and risking duplicate-key rendering collisions.
  **File:** `app/(app)/reports/financials/profitability/page.tsx`
  **Fix:** Date filter now falls back to `_creationTime`; table rows use stable `invoiceId` key.
  **Why it matters:** P&L period filters include legacy records correctly and table rendering remains deterministic.

- **BUG-BM-HUNT-008** — Profitability report column labeled "Invoiced" was showing collected revenue for partial invoices after margin fix, making the table internally inconsistent and confusing billing reconciliation.
  **File:** `app/(app)/reports/financials/profitability/page.tsx`
  **Fix:** Added a dedicated "Realized Revenue" column, restored "Invoiced" to true invoice total (`quoted`), and updated empty-state column span.
  **Why it matters:** Billing managers can now compare billed vs collected amounts directly and trust margin context during collection follow-up.

- **BUG-BM-HUNT-009** — Quote → Invoice due date parsing used `new Date(YYYY-MM-DD)` local-time conversion, which can shift stored due dates by timezone and create off-by-one collection dates.
  **File:** `src/shared/components/quote-workspace/QuoteDetailEditor.tsx`
  **Fix:** Switched date-input parsing to UTC-midnight (`Date.UTC`) and added invalid-date guard before create-invoice submission.
  **Why it matters:** Prevents accidental wrong due dates when converting approved quotes into invoices across time zones.

- **BUG-BM-HUNT-010** — Quote decline and create-invoice dialogs retained stale form values when closed via backdrop/X, causing accidental reuse of prior reason/terms on the next action.
  **File:** `src/shared/components/quote-workspace/QuoteDetailEditor.tsx`
  **Fix:** Added explicit `onOpenChange` close resets for decline reason, invoice due date, and payment terms.
  **Why it matters:** Billing users can safely process multiple quotes in sequence without hidden stale-field carryover.

- **BUG-BM-HUNT-011** — Time Clock work-order filter compared raw Convex ID objects against string select values, so valid WO filters could silently return zero rows.
  **File:** `app/(app)/billing/time-clock/page.tsx`
  **Fix:** Normalized entry `workOrderId` to string before comparison in filtered list logic.
  **Why it matters:** Billing managers can reliably isolate labor by work order for invoice prep.

- **BUG-SM-HUNT-007** — Work Orders could crash/render broken rows when partially seeded records had null `workOrderNumber`, `description`, `priority`, or `openedAt` values, because list/search/sort logic assumed non-null strings/numbers.
  **File:** `app/(app)/work-orders/page.tsx`
  **Fix:** Added defensive fallbacks during row normalization (`WO-<id>` number, default description/customer/priority, resilient `openedAt` fallback).
  **Why it matters:** Shop managers can still triage queue data during imperfect imports instead of hitting runtime errors or blank rows.

- **BUG-SM-HUNT-008** — “Awaiting Parts” tab included draft work orders, surfacing pre-intake jobs in the active parts-waiting queue and inflating actionable counts.
  **File:** `app/(app)/work-orders/page.tsx`
  **Fix:** Updated awaiting-parts filter and tab counter logic to exclude `draft` along with terminal statuses.
  **Why it matters:** Queue reflects true in-work blockers, so scheduling/parts follow-up time is spent on live jobs.

- **BUG-SM-HUNT-009** — Reports date range included transactions exactly at midnight after the selected “To” date because the upper bound used an inclusive comparison after already shifting to next-day midnight.
  **File:** `app/(app)/reports/page.tsx`
  **Fix:** Switched revenue and throughput filters from `ts > toTs` to `ts >= toTs` for correct end-of-day exclusivity.
  **Why it matters:** Monthly/period totals match operator expectations and avoid subtle off-by-one-day revenue or throughput inflation.

- **BUG-SM-HUNT-010** — Scheduling page returned `null` when a required query resolved missing data, causing a blank screen with no recovery path.
  **File:** `app/(app)/scheduling/page.tsx`
  **Fix:** Replaced null-render path with actionable empty state guidance and tightened pointer event typing (`ReactPointerEvent`) to avoid fragile namespace-dependent typing.
  **Why it matters:** Shop managers get a clear recovery action instead of a dead UI when planning data loads incompletely.

- **BUG-PC-HUNT-103** — PO Receiving initialized line items by calling `setState` during render (`if (step===2) initializeLineItems()`), which risks React render-loop warnings and duplicate initialization under strict/concurrent rendering.  
  **File:** `app/(app)/parts/receiving/po/page.tsx`  
  **Fix:** Moved initialization into a `useEffect` tied to `step`, `poDetail`, and `lineItemsData.length`.  
  **Why it matters:** Parts clerks moving quickly between POs no longer risk unstable wizard behavior from render-time mutations.

- **BUG-PC-HUNT-104** — PO Receiving let users proceed to review with missing core metadata (blank Part Number/Part Name and missing shelf-life date when shelf-life was enabled), then failed late at submit.  
  **File:** `app/(app)/parts/receiving/po/page.tsx`  
  **Fix:** Added step-2 required-field validation and blocked `Next: Review` until required receiving fields are complete, with inline operator guidance.  
  **Why it matters:** Clerks catch incomplete receiving packets immediately instead of losing time on end-of-flow submission failures.

- **BUG-PC-HUNT-105** — Loaner Tracking page could stay stuck in loading skeleton indefinitely when org context was missing because it lacked onboarding/context guards.  
  **File:** `app/(app)/parts/loaners/page.tsx`  
  **Fix:** Added `usePagePrereqs` handling with explicit loading and missing-context states plus onboarding recovery empty state.  
  **Why it matters:** Parts teams now get a clear setup path instead of a dead-end loading screen.

- **BUG-113** — AD/SB compliance page was a navigation dead-end in the QCM flow, with no direct path back to Compliance or forward to Audit Trail/QCM Review.  
  **File:** `app/(app)/compliance/ad-sb/page.tsx`  
  **Fix:** Added header journey navigation buttons (`Compliance`, `Audit Trail`, `QCM Review`) and wired Audit Trail link to carry selected `?aircraft=` context.  
  **Why it matters:** Keeps the intended Compliance → AD/SB → Audit Trail → RTS Review journey navigable without relying on sidebar/back-button detours.

- **BUG-114** — Audit Trail ignored `?aircraft=` URL context, so deep links/refresh/back dropped the selected aircraft and forced manual re-selection.  
  **File:** `app/(app)/compliance/audit-trail/page.tsx`  
  **Fix:** Added URL/state synchronization for aircraft selection, route actions through query-param updates, and preserve current aircraft when jumping back to AD/SB.  
  **Why it matters:** QCM inspectors stay on the correct aircraft context across page transitions and browser navigation.

- **BUG-115** — QCM Review blocked RTS page access unless `canClose` was already true, preventing inspectors from opening RTS preconditions early for blocker review.  
  **File:** `app/(app)/compliance/qcm-review/page.tsx`  
  **Fix:** Show a direct RTS navigation action for selected work orders in both states (`Sign Off & Close` when ready, `Review RTS Preconditions` when not ready).  
  **Why it matters:** Restores continuous Audit Trail → RTS Review workflow even when work orders are not yet fully clear to close.

- **BUG-116** — QCM Review close-readiness data was truncated to the first 200 work orders due to paginated query limits.  
  **File:** `app/(app)/compliance/qcm-review/page.tsx`  
  **Fix:** Added incremental `loadMore` loop while pagination reports `CanLoadMore`, so all open/pending-signoff work orders are available.  
  **Why it matters:** Prevents missing older open work orders in large shops and avoids false “not found in queue” outcomes.

- **BUG-LT-HUNT-099** — Step sign-off button wiring caused a TypeScript/runtime handler mismatch (`onClick={handleSign}` while `handleSign` expected an optional boolean), risking incorrect click event values being treated as bypass flags.  
  **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignStepDialog.tsx`  
  **Fix:** Wrapped click handler with `onClick={() => void handleSign()}` so the dialog always invokes sign-off with the expected default flow.  
  **Why it matters:** Lead technicians can reliably sign steps without brittle event-argument behavior in a safety-critical workflow.

- **BUG-LT-HUNT-100** — Card sign-off button had the same handler mismatch pattern as step sign-off (`onClick={handleSign}` with a boolean parameter), creating the same risk at card-level certification.  
  **File:** `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx`  
  **Fix:** Switched to `onClick={() => void handleSign()}` and kept explicit bypass flow only in the training-warning confirmation action.  
  **Why it matters:** Prevents fragile click behavior during 14 CFR 43.9 card certification.

- **BUG-LT-HUNT-101** — Signature re-auth continue flow malformed URLs when `returnTo` already had query params (`?tab=...`), producing `...?tab=x?authEventId=...` and dropping context.  
  **File:** `app/(app)/work-orders/[id]/signature/page.tsx`  
  **Fix:** Rebuilt destination with `URLSearchParams`, preserving existing query params and appending `authEventId` safely.  
  **Why it matters:** Techs return to the exact sign-off screen state after PIN auth instead of losing place mid-workflow.

- **BUG-LT-HUNT-102** — Turnover notes local storage key was not organization-scoped, so multi-org users could see mixed notes if WO/card IDs collided.  
  **Files:** `app/(app)/work-orders/[id]/tasks/[cardId]/_components/TurnoverNotes.tsx`, `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`  
  **Fix:** Added `organizationId` to turnover note storage key and passed `orgId` from task card page.  
  **Why it matters:** Shift handoff notes stay isolated to the correct shop context.

- **BUG-SM-HUNT-003** — Work Orders default sort claimed to be “newest first” but actually preserved backend order, so high-priority recent jobs could appear buried unpredictably.  
  **File:** `app/(app)/work-orders/page.tsx`  
  **Fix:** Updated default sort branch to explicitly sort by `openedAt` descending (newest first), while keeping AOG-first grouping behavior.  
  **Why it matters:** Shop managers now get deterministic queue triage aligned to recency, reducing missed fresh arrivals.

- **BUG-SM-HUNT-004** — Dashboard active WO rows displayed discrepancy badge text as singular (“squawk”) for every count.  
  **File:** `app/(app)/dashboard/page.tsx`  
  **Fix:** Added singular/plural label handling for discrepancy counts in the Active Work Orders widget.  
  **Why it matters:** Removes ambiguous at-a-glance wording in high-tempo dashboard scanning.

- **BUG-SM-HUNT-005** — Dashboard Attention Required AOG description could render literal `undefined` when WO description was empty.  
  **File:** `app/(app)/dashboard/page.tsx`  
  **Fix:** Added safe fallback text (`"No description"`) when composing AOG attention line items.  
  **Why it matters:** Shop managers no longer see broken-looking alert rows during incomplete WO intake.

- **BUG-SM-HUNT-006** — Scheduling Auto Schedule always reported success toast even when every assignment mutation failed.  
  **File:** `app/(app)/scheduling/page.tsx`  
  **Fix:** Added success/failure accounting and differentiated toasts: error for zero applied, warning for partial, success for full apply.  
  **Why it matters:** Prevents false confidence and rework when planners assume bays were assigned but nothing actually persisted.

- **BUG-DOM-109** — Fleet cards built detail links from raw registration/serial strings, so tails containing `/` or spaces could break routing and open the wrong aircraft (or 404).  
  **File:** `app/(app)/fleet/page.tsx`  
  **Fix:** URL-encoded the fleet tail parameter in all three "Open" links (list, tiles, truncated views).  
  **Why it matters:** DOM users can reliably open aircraft detail/logbook screens even for legacy or imported tail formats.

- **BUG-DOM-110** — Fleet detail `?tab=` deep links accepted any arbitrary tab value; invalid values rendered a blank tab body with no recovery hint.  
  **File:** `app/(app)/fleet/[tail]/page.tsx`  
  **Fix:** Added an allowlist for valid tab keys and fallback to `aircraft-info` when the query param is invalid.  
  **Why it matters:** Shared links/bookmarks always land on a usable DOM view instead of appearing broken.

- **BUG-DOM-111** — Scheduling Constraints "Add Scheduling Training" dialog retained stale form values when closed via backdrop/X.  
  **File:** `app/(app)/personnel/training/page.tsx`  
  **Fix:** Reset training type/date/cert form state whenever the dialog closes from any path.  
  **Why it matters:** Prevents accidental carry-over records and reduces bad training data entry during batch updates.

- **BUG-DOM-112** — Fleet logbook page could crash on malformed links because `decodeURIComponent` was called on an undefined route param.  
  **File:** `app/(app)/fleet/[tail]/logbook/page.tsx`  
  **Fix:** Guarded `tail` route param before decoding and defaulted safely when missing.  
  **Why it matters:** DOM oversight/logbook access remains resilient even when links are malformed or manually edited.

- **BUG-DOM-113** — Aircraft detail “Past” work-order history included cancelled WOs in-count, but the “view all” link filtered to `status=closed`, hiding cancelled records and creating count mismatch.  
  **File:** `app/(app)/fleet/[tail]/page.tsx`  
  **Fix:** Updated deep link to `status=complete` (terminal bucket), and updated empty/summary copy from “closed” to “completed” to match actual dataset.  
  **Why it matters:** DOM can trust that fleet history counts and drill-down lists reflect the same completed WO population.

- **BUG-DOM-114** — Fleet “Clear Filters” reset search/filter chips but left sort mode active (e.g., “Status”), so the list stayed non-default after reset.  
  **File:** `app/(app)/fleet/page.tsx`  
  **Fix:** Reset `sortKey` to default registration sorting inside the existing clear action.  
  **Why it matters:** “Clear Filters” now truly restores baseline fleet view, reducing triage confusion during morning dispatch checks.

- **BUG-DOM-115** — Predictions page assumed severity enum always matched known values; unexpected/stale severity strings could break summary math and crash card rendering.  
  **File:** `app/(app)/fleet/predictions/page.tsx`  
  **Fix:** Added defensive severity guards in summary counting and fallback card styling (`medium`) for unknown severities.  
  **Why it matters:** DOM still gets actionable prediction visibility instead of a hard UI failure when legacy/migrated data is imperfect.

- **BUG-QCM-HUNT-001** — RTS authorization page could hang in an endless loading skeleton when org context was missing or still loading.  
  **File:** `app/(app)/work-orders/[id]/rts/page.tsx`  
  **Fix:** Added explicit org context guards (`isLoaded` spinner + onboarding empty state) before report rendering.  
  **Why it matters:** QCM inspectors now get a clear recovery path instead of a dead-end loading screen during sign-off workflow.

- **BUG-QCM-HUNT-002** — AD/SB aircraft filter changed UI state but did not persist to URL, so refresh/share/back lost the selected aircraft.  
  **File:** `app/(app)/compliance/ad-sb/page.tsx`  
  **Fix:** Synced aircraft selection into `?aircraft=` query params on dropdown changes (and remove param for fleet view).  
  **Why it matters:** Inspectors can now deep-link and reliably return to the exact aircraft compliance context they were reviewing.

- **BUG-QCM-HUNT-003** — QCM close-readiness selector kept stale work-order IDs after live status changes, showing "Work order not found" for removed items.  
  **File:** `app/(app)/compliance/qcm-review/page.tsx`  
  **Fix:** Added reconciliation effect to auto-reselect a valid pending-signoff/open WO when the current selection disappears.  
  **Why it matters:** The readiness panel stays actionable during real-time shop activity instead of breaking when work orders transition state.

- **BUG-BM-HUNT-005** — Invoice CSV export used local timezone date rendering for due dates, causing off-by-one day exports for UTC-stored date-only fields.  
  **File:** `app/(app)/billing/invoices/page.tsx`  
  **Fix:** Export due dates with `formatDateUTC()` and keep creation dates consistent with shared formatter usage.  
  **Why it matters:** Billing exports now match promised due dates exactly, preventing collection errors and customer disputes.

- **BUG-BM-HUNT-006** — Batch payment dialog allowed over-balance payment entries, leading to submit-time failures and frustrating rework.  
  **File:** `app/(app)/billing/invoices/page.tsx`  
  **Fix:** Added client-side validation to block over-balance payment amounts before submit (plus numeric guardrails).  
  **Why it matters:** Billing managers can complete batch payment entry in one pass instead of trial-and-error correction cycles.

- **BUG-BM-HUNT-007** — Time Clock daily summary included rejected labor entries, inflating billable labor visibility for management.  
  **File:** `app/(app)/billing/time-clock/page.tsx`  
  **Fix:** Exclude entries with rejected approval status from daily summary rollups.  
  **Why it matters:** Financial oversight reflects approved labor only, improving trust in payroll and billing dashboards.

- **BUG-BM-HUNT-001** — Forecast used non-collected invoice totals (`status !== VOID`) as revenue, overstating cash outlook.  
  **File:** `app/(app)/reports/financials/forecast/page.tsx`  
  **Fix:** Limit baseline revenue to `PAID`/`PARTIAL` and use `amountPaid` for partial invoices.  
  **Why it matters:** Billing managers get realistic forward cash forecasts instead of inflated projections.

- **BUG-BM-HUNT-002** — WO profitability margins for partial invoices used full invoice total rather than collected amount.  
  **File:** `app/(app)/reports/financials/profitability/page.tsx`  
  **Fix:** Use realized revenue (`amountPaid` for `PARTIAL`) when computing margin and margin %.  
  **Why it matters:** Prevents false-positive profitability on partially collected jobs.

- **BUG-BM-HUNT-003** — Time Clock “Clock In” dialog preserved stale validation/errors when reopened.  
  **File:** `app/(app)/billing/time-clock/page.tsx`  
  **Fix:** Added dialog close reset for error/loading/context state via `onOpenChange`.  
  **Why it matters:** Lead/billing users can restart clock-in workflow cleanly after a failed attempt.

- **BUG-BM-HUNT-004** — Batch payment dialog lost “Recorded By” prefill after close, forcing repeated re-selection.  
  **File:** `app/(app)/billing/invoices/page.tsx`  
  **Fix:** Reset tech selection back to current user instead of blank on close.  
  **Why it matters:** Speeds recurring payment entry and reduces accidental mis-attribution.

- **BUG-DOM-117** — Maintenance Programs edit dialog retained stale form values when closed via backdrop/X, causing the next "Add Program" to show leftover data from a previous edit.
  **File:** `app/(app)/fleet/maintenance-programs/page.tsx`
  **Fix:** Added `resetForm()` to the Dialog `onOpenChange` close handler.
  **Why it matters:** DOM creating a new maintenance program no longer inherits stale fields from a prior edit session — prevents silent misconfiguration of interval definitions.

- **BUG-DOM-118** — Fleet Calendar "today" highlight used local-timezone accessors (`getDate`, `getMonth`) while event placement used UTC accessors (`getUTCDate`, `getUTCMonth`), causing the highlight to appear on the wrong day in non-UTC timezones.
  **File:** `app/(app)/fleet/calendar/page.tsx`
  **Fix:** Switched `isToday` check to use UTC accessors (`getUTCDate`, `getUTCMonth`, `getUTCFullYear`).
  **Why it matters:** A DOM in UTC-5 no longer sees the "today" dot on a different day than where today's scheduled events appear.

- **BUG-DOM-119** — Maintenance Programs "Deactivate" button called `removeProgram` (permanent delete) but showed a "Program deactivated" toast. The DOM thought they were toggling off (reversible), but the record was permanently deleted.
  **File:** `app/(app)/fleet/maintenance-programs/page.tsx`
  **Fix:** Replaced destructive `removeProgram` call with `updateProgram({ id, isActive: false })` to match the inline Switch behavior. Also disabled the button when already inactive.
  **Why it matters:** Prevents irreversible data loss of maintenance program definitions — a DOM deactivating a seasonal inspection program can reactivate it next year.

- **BUG-DOM-120** — OJT Training page had a `"use client"` Next.js directive at the top — a no-op in a Vite+React app that misleads contributors into thinking the project uses Next.js conventions.
  **File:** `app/(app)/training/ojt/page.tsx`
  **Fix:** Removed the `"use client"` directive and added a clarifying comment.
  **Why it matters:** Codebase hygiene — prevents cargo-cult proliferation of framework-wrong directives across the training module.

- **BUG-DOM-121** — Fleet Calendar rendered a bare unstyled `<div>` when org context was missing, inconsistent with the rest of the app's Card-based empty states with recovery actions.
  **File:** `app/(app)/fleet/calendar/page.tsx`
  **Fix:** Replaced the plain div with a Card-based empty state including the page header, contextual guidance, and a "Complete Setup" link to onboarding.
  **Why it matters:** DOM landing on the calendar without org context gets a professional recovery path instead of a dead-end sentence.

## Canonical Governance

1. `MASTER-BUILD-LIST.md` is the only write-authoritative feature specification artifact.
2. `docs/plans/MASTER-FEATURE-REGISTRY.csv`, `docs/plans/MASTER-FEATURE-CROSSWALK.md`, and `docs/plans/MASTER-BUILD-PLAN.md` are derived/reference outputs.
3. Bug Hunter and autonomous systems must update this spec through automation contracts, not manual ad-hoc row edits.
4. All dates must be absolute UTC timestamps (`YYYY-MM-DDTHH:MM:SSZ`) or `null` where explicitly allowed.

## Status Enum Contract

- `implementation_state`: `not_implemented | backend_needed | partially_implemented | implemented | blocked | deprecated`
- `verification_state`: `unreviewed | doc_reviewed | app_verified | qa_verified | production_verified`

## Required Record Fields

Required fields for both FS and MBP records:
1. `implementation_state`
2. `verification_state`
3. `last_reviewed_at_utc`
4. `last_verified_in_app_at_utc`
5. `reviewed_by`
6. `evidence_links`
7. `related_ids`

## Registry A — Master Features (69)

| fs_id | feature_number | feature_name | implementation_state | verification_state | last_reviewed_at_utc | last_verified_in_app_at_utc | reviewed_by | intended_outcome | current_context_update | evidence_links | related_ids | interconnection_notes | legacy_state_snapshot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FS-0001 | 1 | Dual Sign-off (Tech + Inspector) | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Cross-Module, Work Orders. / BUG-005, BUG-LT-001, BUG-LT-003, BUG-LT-HUNT-001, BUG-LT3-001 / GAP-18, GAP-22 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Cross-Module, Work Orders. | BugHunter=BUG-005, BUG-LT-001, BUG-LT-003, BUG-LT-HUNT-001, BUG-LT3-001; QA=GAP-18, GAP-22 | Feature #1; FS-0001 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0002 | 2 | PDF Generation — Invoices | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #2; FS-0002 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0003 | 3 | PDF Generation — Quotes | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #3; FS-0003 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0004 | 4 | PDF Generation — RTS / 8610-2 | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-07 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-07 | Feature #4; FS-0004 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0005 | 5 | PDF Generation — Work Order Pack | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #5; FS-0005 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0006 | 6 | Email / Notifications System | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-02, GAP-20, GAP-24 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-02, GAP-20, GAP-24 | Feature #6; FS-0006 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0007 | 7 | Pricing Rules — Auto-Application | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Billing. / BUG-031 / GAP-11, GAP-15 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Billing. | BugHunter=BUG-031; QA=GAP-11, GAP-15 | Feature #7; FS-0007 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0008 | 8 | Tax Calculation | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Billing. / BUG-033 / GAP-03, GAP-16 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Billing. | BugHunter=BUG-033; QA=GAP-03, GAP-16 | Feature #8; FS-0008 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0009 | 9 | Document Upload / Attachments | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-16 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-16 | Feature #9; FS-0009 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0010 | 10 | Customer Portal (ServiceEdge equivalent) | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-23 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-23 | Feature #10; FS-0010 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0011 | 11 | Barcoding / QR Scanning | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #11; FS-0011 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0012 | 12 | Reports & Analytics Dashboard | backend_needed | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Backend Needed / Bug Hunter hardening delivered across Billing, Cross-Module, Dashboard/Reports, Fleet, Parts, Personnel, Scheduling. / BACKEND-NEEDED-SM-01, BUG-007, BUG-011, BUG-012, BUG-013 +… / GAP-04, GAP-05, GAP-07, GAP-10, GAP-13 +… / Retain current UX guards; complete server contracts before parity. | Bug Hunter hardening delivered across Billing, Cross-Module, Dashboard/Reports, Fleet, Parts, Personnel, Scheduling. | BugHunter=BACKEND-NEEDED-SM-01, BUG-007, BUG-011, BUG-012, BUG-013 +…; QA=GAP-04, GAP-05, GAP-07, GAP-10, GAP-13 +… | Feature #12; FS-0012 | Retain current UX guards; complete server contracts before parity. | Backend Needed |
| FS-0013 | 13 | Scheduling — Drag-Drop Gantt | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Scheduling. / BUG-SM-HUNT-002 / No new post-cycle evidence / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Scheduling. | BugHunter=BUG-SM-HUNT-002; QA=No new post-cycle evidence | Feature #13; FS-0013 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0014 | 14 | Scheduling — Auto-Schedule | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #14; FS-0014 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0015 | 15 | Role Management Admin UI | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Feature #15; FS-0015; MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Implemented |
| FS-0016 | 16 | Training & Qualifications Mgmt | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Compliance/RTS, Personnel. / BUG-DOM-5, BUG-DOM-6, BUG-DOM-7, BUG-DOM-9 / No new post-cycle evidence / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Compliance/RTS, Personnel. | BugHunter=BUG-DOM-5, BUG-DOM-6, BUG-DOM-7, BUG-DOM-9; QA=No new post-cycle evidence | Feature #16; FS-0016 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0017 | 17 | Multi-Location Cross-Site UI | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #17; FS-0017 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0018 | 18 | Warranty Management | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #18; FS-0018 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0019 | 19 | Tool Crib Management | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Parts. / BUG-PC-002 / No new post-cycle evidence / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Parts. | BugHunter=BUG-PC-002; QA=No new post-cycle evidence | Feature #19; FS-0019 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0020 | 20 | AD/SB Fleet Compliance Dashboard | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Compliance/RTS, Fleet, Personnel, Work Orders. / BH-004, BH-005, BH-006, BH-007, BUG-015 +… / GAP-01 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Compliance/RTS, Fleet, Personnel, Work Orders. | BugHunter=BH-004, BH-005, BH-006, BH-007, BUG-015 +…; QA=GAP-01 | Feature #20; FS-0020 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0021 | 21 | Overtime / Shift Management | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-16, GAP-20 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-16, GAP-20 | Feature #21; FS-0021 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0022 | 22 | Discrepancy Disposition Workflow | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Compliance/RTS, Cross-Module, Fleet. / BUG-003, BUG-006, BUG-DOM-12 / FEAT-LARGE-003, FEAT-LARGE-005, GAP-04, GAP-07, GAP-24 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Compliance/RTS, Cross-Module, Fleet. | BugHunter=BUG-003, BUG-006, BUG-DOM-12; QA=FEAT-LARGE-003, FEAT-LARGE-005, GAP-04, GAP-07, GAP-24 | Feature #22; FS-0022 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0023 | 23 | Work Order Close Readiness | partially_implemented | unreviewed | 2026-03-04T04:43:13Z | null | agentic-reviewer | Partially Implemented / Bug Hunter hardening delivered across Billing, Compliance/RTS, Cross-Module, Dashboard/Reports, Parts, Personnel, Work Orders. / BH-LT3-001, BH-LT3-002, BUG-001, BUG-002, BUG-031 +… / FEAT-LARGE-001, GAP-06, GAP-09, GAP-10, GAP-11 +… / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Billing, Compliance/RTS, Cross-Module, Dashboard/Reports, Parts, Personnel, Work Orders. | BugHunter=BH-LT3-001, BH-LT3-002, BUG-001, BUG-002, BUG-031 +…; QA=FEAT-LARGE-001, GAP-06, GAP-09, GAP-10, GAP-11 +…; derived_from=MBP-0014,MBP-0015,MBP-0039,MBP-0040,MBP-0041,MBP-0042,MBP-0123,MBP-0124,MBP-0125,MBP-0127,MBP-0134,MBP-0136 | Feature #23; FS-0023; MBP-0014,MBP-0015,MBP-0039,MBP-0040,MBP-0041,MBP-0042,MBP-0123,MBP-0124,MBP-0125,MBP-0127,MBP-0134,MBP-0136 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0024 | 24 | Squawk Board Enhancements | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-05 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-05 | Feature #24; FS-0024 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0025 | 25 | Search — Global Search | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Cross-Module. / BH-002 / GAP-21 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Cross-Module. | BugHunter=BH-002; QA=GAP-21 | Feature #25; FS-0025 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0026 | 26 | Dashboard KPIs | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Dashboard/Reports. / BUG-SM-012, BUG-SM-HUNT-001 / GAP-21, TD-004, TD-016 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Dashboard/Reports. | BugHunter=BUG-SM-012, BUG-SM-HUNT-001; QA=GAP-21, TD-004, TD-016 | Feature #26; FS-0026 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0027 | 27 | Kanban — Drag-Drop | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Cross-Module. / BUG-SM-004 / No new post-cycle evidence / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Cross-Module. | BugHunter=BUG-SM-004; QA=No new post-cycle evidence | Feature #27; FS-0027 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0028 | 28 | Handoff Notes | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Personnel, Work Orders. / BUG-LT-HUNT-004, BUG-LT-HUNT-005 / FEAT-LARGE-006 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Personnel, Work Orders. | BugHunter=BUG-LT-HUNT-004, BUG-LT-HUNT-005; QA=FEAT-LARGE-006 | Feature #28; FS-0028 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0029 | 29 | Fleet Calendar Enhancements | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / Bug Hunter hardening delivered across Compliance/RTS, Cross-Module, Dashboard/Reports, Fleet, Personnel, Work Orders. / BUG-016, BUG-020, BUG-021, BUG-022, BUG-DOM-001 +… / FEAT-LARGE-002, TD-006 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Bug Hunter hardening delivered across Compliance/RTS, Cross-Module, Dashboard/Reports, Fleet, Personnel, Work Orders. | BugHunter=BUG-016, BUG-020, BUG-021, BUG-022, BUG-DOM-001 +…; QA=FEAT-LARGE-002, TD-006 | Feature #29; FS-0029 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0030 | 30 | Conformity Inspection | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-15 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-15 | Feature #30; FS-0030 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0031 | 31 | CAMP Connect Integration | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #31; FS-0031 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0032 | 32 | QuickBooks Integration | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / FEAT-110, FEAT-LARGE-007, GAP-22 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=FEAT-110, FEAT-LARGE-007, GAP-22 | Feature #32; FS-0032 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0033 | 33 | Multi-Currency | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #33; FS-0033 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0034 | 34 | ILS Parts Marketplace | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #34; FS-0034 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0035 | 35 | AI Predictive Maintenance | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #35; FS-0035 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0036 | 36 | eCommerce / Parts Sales | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #36; FS-0036 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0037 | 37 | Vertex Tax Integration | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #37; FS-0037 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0038 | 38 | UPS WorldShip Integration | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #38; FS-0038 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0039 | 39 | FBO Line Sales | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #39; FS-0039 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0040 | 40 | Native Mobile App | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / GAP-19 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-19 | Feature #40; FS-0040 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0041 | 41 | Policy Enforcement Engine | partially_implemented | unreviewed | 2026-03-04T04:05:06Z | null | agentic-reviewer | Partially Implemented / No new post-cycle evidence. / None / GAP-25, ISSUE-001, ISSUE-002, ISSUE-003, TD-002 +… / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=GAP-25, ISSUE-001, ISSUE-002, ISSUE-003, TD-002 +…; derived_from=MBP-0003,MBP-0004,MBP-0011,MBP-0017,MBP-0018,MBP-0033,MBP-0054,MBP-0055,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Feature #41; FS-0041; MBP-0003,MBP-0004,MBP-0011,MBP-0017,MBP-0018,MBP-0033,MBP-0054,MBP-0055,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0042 | 42 | Immutable Record Locks & Compliance Holds | partially_implemented | unreviewed | 2026-03-04T04:38:57Z | null | agentic-reviewer | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0018,MBP-0045,MBP-0054,MBP-0063,MBP-0064,MBP-0065,MBP-0066,MBP-0067,MBP-0068 | Feature #42; FS-0042; MBP-0018,MBP-0045,MBP-0054,MBP-0063,MBP-0064,MBP-0065,MBP-0066,MBP-0067,MBP-0068 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Partially Implemented |
| FS-0043 | 43 | Customer Portal Identity Link Model | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #43; FS-0043 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0044 | 44 | Work Order Routing Templates + Standard Minutes | partially_implemented | unreviewed | 2026-03-04T04:43:13Z | null | agentic-reviewer | Backend Needed / Bug Hunter hardening delivered across Work Orders. / BACKEND-NEEDED-BH-01 / GAP-06, GAP-08, TD-001, TD-005, TD-009 +… / Retain current UX guards; complete server contracts before parity. | Bug Hunter hardening delivered across Work Orders. | BugHunter=BACKEND-NEEDED-BH-01; QA=GAP-06, GAP-08, TD-001, TD-005, TD-009 +…; derived_from=MBP-0014,MBP-0015,MBP-0016,MBP-0039,MBP-0052,MBP-0053,MBP-0123,MBP-0124,MBP-0127,MBP-0132,MBP-0133,MBP-0136 | Feature #44; FS-0044; MBP-0014,MBP-0015,MBP-0016,MBP-0039,MBP-0052,MBP-0053,MBP-0123,MBP-0124,MBP-0127,MBP-0132,MBP-0133,MBP-0136 | Retain current UX guards; complete server contracts before parity. | Partially Implemented |
| FS-0045 | 45 | Inspection & Exception Queue Governance | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #45; FS-0045 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0046 | 46 | Materials Demand Ledger + Reservation Controls | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #46; FS-0046 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0047 | 47 | Compliance Command Center | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #47; FS-0047 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0048 | 48 | Dynamic Custom Fields Framework | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #48; FS-0048 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0049 | 49 | Alert Rules + Escalation Engine | not_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence | Feature #49; FS-0049 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Not Implemented |
| FS-0050 | 50 | Field-Level Visibility/Edit Policy Controls | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Feature #50; FS-0050; MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Implemented |
| FS-0051 | 51 | Operational Report Builder + Scheduled Report Runs | partially_implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Partially Implemented / No new post-cycle evidence. / None / TD-013 / Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | No new post-cycle evidence. | BugHunter=None; QA=TD-013 | Feature #51; FS-0051 | Rebuild from existing guards/flows and preserve post-cycle bug fixes as acceptance criteria. | Partially Implemented |
| FS-0052 | 52 | Part Lineage Drilldown Explorer | backend_needed | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | Backend Needed / Bug Hunter hardening delivered across Billing, Cross-Module, Parts, Work Orders. / BACKEND-NEEDED-BH-P01, BH-008, BH-009, BH-010, BUG-008 +… / FEAT-LARGE-004, GAP-11, GAP-12, GAP-13 / Retain current UX guards; complete server contracts before parity. | Bug Hunter hardening delivered across Billing, Cross-Module, Parts, Work Orders. | BugHunter=BACKEND-NEEDED-BH-P01, BH-008, BH-009, BH-010, BUG-008 +…; QA=FEAT-LARGE-004, GAP-11, GAP-12, GAP-13 | Feature #52; FS-0052 | Retain current UX guards; complete server contracts before parity. | Backend Needed |
| FS-0053 | 53 | Zero-Downtime Migration Control Plane | partially_implemented | unreviewed | 2026-03-04T04:05:06Z | null | agentic-reviewer | Not Implemented / No new post-cycle evidence. / None / No new post-cycle evidence / Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | No new post-cycle evidence. | BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0003,MBP-0004,MBP-0011,MBP-0016,MBP-0133 | Feature #53; FS-0053; MBP-0003,MBP-0004,MBP-0011,MBP-0016,MBP-0133 | Build from baseline spec; no confirmed implementation evidence in current cycle corpus. | Partially Implemented |
| FS-0054 | 54 | Task Card Compliance Save Guardrail | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Enforce hard-failure save guards for task-card compliance mutation paths and preserve operator-visible error fidelity. | Detected Bug Hunter threads show compliance save guard behavior in task-card execution views. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx | Feature #54; FS-0054; MBP-0138 | Complete backend mutation contracts and field-level validation parity for all task-card compliance save paths. | Partially Implemented |
| FS-0055 | 55 | Lead Technician Execution Safety Orchestrator | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Coordinate lead-tech execution, sign-off gating, and escalation safety checks across active work-order task flows. | In-code bug-hunter annotations indicate partial guard coverage in lead-tech execution dialogs and pages. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx | Feature #55; FS-0055; MBP-0139 | Consolidate execution safety checks into shared orchestration rules and remove divergent per-dialog behavior. | Partially Implemented |
| FS-0056 | 56 | Task Card Authoring Validation Controls | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Provide deterministic validation for task-card creation, template application, and work-item authoring constraints. | Task new-card surfaces include guard comments and partial validation, but capability parity is incomplete. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/new/page.tsx | Feature #56; FS-0056; MBP-0140 | Harden schema-level validation and align frontend validator feedback with backend enforcement. | Partially Implemented |
| FS-0057 | 57 | Discrepancy Raise-and-Link Integrity | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Guarantee discrepancy records opened from task/work-order contexts maintain referential integrity and lifecycle linkage. | Raise-finding and discrepancy list components show partial controls with known consistency gaps. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/_components/DiscrepancyList.tsx | Feature #57; FS-0057; MBP-0141 | Unify discrepancy creation contracts and ensure cross-context linking is transactionally safe. | Partially Implemented |
| FS-0058 | 58 | My Work Assignment Consistency Controls | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Keep technician assignment, task visibility, and handoff context synchronized for the My Work execution lane. | My Work page annotations capture partial protections against stale assignment and status drift. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/my-work/page.tsx | Feature #58; FS-0058; MBP-0142 | Add assignment freshness checks, mutation conflict handling, and deterministic queue ordering. | Partially Implemented |
| FS-0059 | 59 | Sign-Off Dialog Data Integrity Guardrails | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Ensure sign-off dialogs enforce required fields, bounds, and immutable audit payload composition before completion. | Sign-card dialog artifacts indicate partial safeguards with unresolved edge-case consistency. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx | Feature #59; FS-0059; MBP-0143 | Promote guard logic into shared mutation contracts and expand regression tests for sign-off edge cases. | Partially Implemented |
| FS-0060 | 60 | Squawk Escalation and Handoff Safeguards | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Control squawk escalation, handoff note continuity, and queue transitions between lead and technician lanes. | Squawk and lead-workspace comments show partial handoff protections with remaining parity gaps. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/squawks/page.tsx | Feature #60; FS-0060; MBP-0144 | Close escalation path gaps and normalize handoff-state transitions across squawk and task modules. | Partially Implemented |
| FS-0061 | 61 | Certificate Field Normalization Pipeline | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Normalize certificate field formatting, trimming, and validation for regulatory record consistency and export safety. | Certificate forms include partial normalization controls documented in bug-hunter detected threads. | docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/certificates/page.tsx | Feature #61; FS-0061; MBP-0145 | Complete end-to-end normalization in schema and serializer layers, including historical data backfill strategy. | Partially Implemented |
| FS-0062 | 62 | Customer Account CRM & Profile Ledger | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Establish customer profile ledgering with account-level commercial context, communication timeline, and portal alignment. | Customer and portal surfaces provide partial account context but lack full ledger and lifecycle cohesion. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/customers/page.tsx; app/(customer)/portal/page.tsx | Feature #62; FS-0062; MBP-0146 | Complete shared customer ledger domain model and unify internal/portal data contracts. | Partially Implemented |
| FS-0063 | 63 | AR, Deposits, and Credit Memo Controls | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Cover receivables control paths from deposit intake through memo adjustment and AR aging governance. | Dedicated AR, deposits, and credit memo pages exist with partial operational parity and control completeness. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/ar-dashboard/page.tsx; app/(app)/billing/deposits/page.tsx; app/(app)/billing/credit-memos/page.tsx | Feature #63; FS-0063; MBP-0147 | Finish posting/adjustment reconciliation contracts and strengthen approval/audit workflows for financial controls. | Partially Implemented |
| FS-0064 | 64 | Procurement and Vendor Operations | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Define procurement lifecycle operations for vendor management, purchase orders, and external service obligations. | Vendor and PO routes are present, but end-to-end procurement governance remains partially implemented. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/vendors/page.tsx; app/(app)/billing/purchase-orders/page.tsx | Feature #64; FS-0064; MBP-0148 | Add procurement state machine invariants, receiving hooks, and payable-side audit trace completeness. | Partially Implemented |
| FS-0065 | 65 | Recurring Billing Contract Engine | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Model recurring billing agreements with cadence control, renewal logic, and invoice generation linkage. | Recurring billing UI is implemented as a partial capability with contract lifecycle gaps still open. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/recurring/page.tsx | Feature #65; FS-0065; MBP-0149 | Introduce contract versioning, renewal events, and posting guarantees tied to billing periods. | Partially Implemented |
| FS-0066 | 66 | Labor Kit and Quote Template Library | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Manage reusable labor kits and quote templates for consistent estimating, quoting, and conversion workflows. | Labor kit routing is active while quote template management exists as an orphan page not yet wired in router modules. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/labor-kits/page.tsx; app/(app)/billing/quotes/templates/page.tsx | Feature #66; FS-0066; MBP-0150 | Wire template library into canonical routes and align quote conversion pipeline with reusable library primitives. | Partially Implemented |
| FS-0067 | 67 | Parts Logistics Operations (Shipping, Loaners, Core Flow) | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Coordinate outbound shipping, temporary loaner control, and core-return lifecycle with inventory/accountability guarantees. | Shipping, loaner, and core pages are present with partial lifecycle controls and reconciliation coverage. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/shipping/page.tsx; app/(app)/parts/loaners/page.tsx; app/(app)/parts/cores/page.tsx | Feature #67; FS-0067; MBP-0151 | Close state-transition and custody-link gaps between logistics events and inventory financial reconciliation. | Partially Implemented |
| FS-0068 | 68 | Scheduling Roster and Crew Coordination | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Provide crew roster governance and coordination controls integrated with bay/capacity scheduling outcomes. | Scheduling roster route exists and is partially implemented; coordination and optimization paths remain incomplete. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/roster/page.tsx | Feature #68; FS-0068; MBP-0152 | Complete crew assignment optimization rules and tie roster constraints directly into scheduling engines. | Partially Implemented |
| FS-0069 | 69 | Station Configuration and Org Governance Console | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | Centralize station configuration, org policy, and governance controls for consistent operational posture by location. | Settings surfaces provide partial governance controls with known coverage gaps across org-level administration. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/station-config/page.tsx; app/(app)/settings/users/page.tsx | Feature #69; FS-0069; MBP-0153 | Consolidate governance policy storage and enforce policy propagation across dependent modules/routes. | Partially Implemented |

## Registry B — Atomic Features (153)

| mbp_id | fs_links | canonical_group_id | title | normalized_requirement | source_pack | source_id | source_file | priority | wave | owner_lane | dependencies | acceptance_criteria | test_gate | legacy_status | implementation_state | verification_state | last_reviewed_at_utc | last_verified_in_app_at_utc | reviewed_by | evidence_links | related_ids | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MBP-0001 | FS-0016, FS-0028 | GRP-016 | OJT task progression scoring | Digitally tracked progression with sign-off integrity | REPORT | RPT-001 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave3 | workflow | ["GRP-001", "GRP-002"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-001 | MBP-0001; RPT-001 | current=Multi-step training with score progression concept; source_dependencies=Trainer workflows, user records; risks=Superficial completion gaming; evidence=E01,E02,E03; ctx_seed=ICS-001/corpus=industry-context-field-artifacts/doc=OJT Data Flow.pdf/feature=16/conf=high/date=2026-03-03 |
| MBP-0002 | FS-0016, FS-0028 | GRP-016 | Multi-aircraft shared OJT tasks | Shared + aircraft-specific task linking | REPORT | RPT-002 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave3 | workflow | ["GRP-001", "GRP-002"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-002 | MBP-0002; RPT-002 | current=Single-aircraft orientation in legacy base; source_dependencies=Task model refactor; risks=Complexity explosion; evidence=E11 |
| MBP-0003 | FS-0053, FS-0041 | GRP-021 | Voice notes + transcript capture | Voice-first notes with editable transcript | REPORT | RPT-003 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave0 | platform | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-003; local://commit/1fb138a | MBP-0003; RPT-003; REQ-TEAM-07,MBP-0003; REQ-TEAM-07 | current=Typing-heavy data entry; source_dependencies=Speech pipeline; risks=Mis-transcription; evidence=E11 |
| MBP-0004 | FS-0053, FS-0041 | GRP-021 | Spell-check accessibility layer | Ubiquitous writing assist | REPORT | RPT-004 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave0 | platform | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-004; local://commit/dd99293 | MBP-0004; RPT-004; REQ-TEAM-08,MBP-0004; REQ-TEAM-08 | current=High friction for dyslexic users; source_dependencies=Input components; risks=Bad autocorrection in technical terms; evidence=E11 |
| MBP-0005 | FS-0016, FS-0028 | GRP-016 | Trainer sign-off queue | Explicit pending sign-off list + audit trail | REPORT | RPT-005 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave3 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-005 | MBP-0005; RPT-005 | current=Conceptual workflow exists; source_dependencies=Notifications, role model; risks=Missed approvals; evidence=E03,E31; ctx_seed=ICS-001/corpus=industry-context-field-artifacts/doc=OJT Data Flow.pdf/feature=16/conf=high/date=2026-03-03 |
| MBP-0006 | FS-0012, FS-0026, FS-0051 | GRP-009 | Efficiency baseline by experience | Managed planning model in product | REPORT | RPT-006 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-006 | MBP-0006; RPT-006 | current=Conceptual handicap model described; source_dependencies=HR/profile data; risks=Misclassification; evidence=E04 |
| MBP-0007 | FS-0012, FS-0026, FS-0051 | GRP-009 | Growth curve dashboard | Role-based growth dashboards | REPORT | RPT-007 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-007 | MBP-0007; RPT-007 | current=Radar and growth curve concept; source_dependencies=Metric definitions; risks=KPI misuse; evidence=E05,E07 |
| MBP-0008 | FS-0013, FS-0014 | GRP-012 | Team composition warnings | Real-time staffing-risk alerts in scheduling | REPORT | RPT-008 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-008 | MBP-0008; RPT-008 | current=Predictive warning concept discussed; source_dependencies=Work order context, skills matrix; risks=Alert fatigue; evidence=E06 |
| MBP-0009 | FS-0035, FS-0013 | GRP-013 | Predictive maintenance (Chapter 5) | Reliable continuous prediction engine | REPORT | RPT-009 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave5 | data | ["GRP-012", "GRP-017"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-009 | MBP-0009; RPT-009 | current=Demonstrated path + manual confirmations; source_dependencies=Chapter 5 data quality; risks=Wrong forecasts; evidence=E15,E28,E29 |
| MBP-0010 | FS-0035, FS-0013 | GRP-013 | ADS-B usage integration | Live cycle/time approximation with correction factor | REPORT | RPT-010 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave5 | data | ["GRP-012", "GRP-017"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-010 | MBP-0010; RPT-010 | current=Planned + partially wired; source_dependencies=External feeds; risks=Data mismatch with tach time; evidence=E17,E28 |
| MBP-0011 | FS-0053, FS-0041 | GRP-021 | AD/SB dynamic due logic | Deterministic due-state engine | REPORT | RPT-011 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave0 | platform | [] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-011; local://commit/fa3a514 | MBP-0011; RPT-011; REQ-TEAM-09,MBP-0011; REQ-TEAM-09 | current=Discussed and prototyped; source_dependencies=Regulatory data ingestion; risks=Compliance liability; evidence=E28,E29 |
| MBP-0012 | FS-0020, FS-0030, FS-0001 | GRP-017 | Logbook entry generation | Automated draft entries per work stage | REPORT | RPT-012 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-012 | MBP-0012; RPT-012 | current=Workflow target defined; source_dependencies=Rules engine; risks=Incorrect legal wording; evidence=E30 |
| MBP-0013 | FS-0020, FS-0030, FS-0001 | GRP-017 | Logbook scanning + OCR ingestion | Searchable full maintenance history | REPORT | RPT-013 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-013 | MBP-0013; RPT-013 | current=“no good answers” in transcript; source_dependencies=OCR pipeline, parsing; risks=Data quality + legal issues; evidence=E30,E17 |
| MBP-0014 | FS-0044, FS-0023 | GRP-003 | Work order assignment (My Work) | Assign, track, and complete task workflows | REPORT | RPT-014 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P0 | Wave1 | workflow | ["GRP-001", "GRP-002"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:43:13Z | 2026-03-04T04:43:13Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-014; local://commit/9a9347b | MBP-0014; RPT-014; REQ-TEAM-10,MBP-0014,MBP-0015; REQ-TEAM-10 | current=Not fully built; source_dependencies=Task model, role model; risks=Execution confusion; evidence=E32 |
| MBP-0015 | FS-0044, FS-0023 | GRP-003 | Clock-in / labor tracking | Integrated labor capture | REPORT | RPT-015 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P0 | Wave1 | workflow | ["GRP-001", "GRP-002"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:43:13Z | 2026-03-04T04:43:13Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-015; local://commit/9a9347b | MBP-0015; RPT-015; REQ-TEAM-10,MBP-0014,MBP-0015; REQ-TEAM-10 | current=Explicitly absent in current area; source_dependencies=Time service integration; risks=KPI gaming; evidence=E32,E33 |
| MBP-0016 | FS-0053, FS-0044 | GRP-014 | Cross-module data bus | Stable event-driven integration | REPORT | RPT-016 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave5 | platform | ["GRP-003", "GRP-006", "GRP-018"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-016 | MBP-0016; RPT-016 | current=Connective tissue underway; source_dependencies=Schema governance; risks=Hard-to-debug coupling; evidence=E25 |
| MBP-0017 | FS-0015, FS-0041, FS-0050 | GRP-001 | Role-based access control (RBAC) | Role-scoped views and permissions | REPORT | RPT-017 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P0 | Wave0 | compliance | [] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-017; local://commit/a18385b | MBP-0017; RPT-017; REQ-TEAM-01,MBP-0017; REQ-TEAM-01 | current=Overexposed unified view; source_dependencies=Auth model, policy matrix; risks=Security/compliance risk; evidence=E39,E31 |
| MBP-0018 | FS-0041, FS-0042 | GRP-002 | Override reason logging | Required reason + immutable audit | REPORT | RPT-018 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave0 | compliance | ["GRP-001"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:38:57Z | 2026-03-04T04:38:57Z | agentic-reviewer | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-018; local://commit/6fd3a02 | MBP-0018; RPT-018; REQ-TEAM-11,MBP-0018,MBP-0054; REQ-TEAM-11 | current=Concept discussed; source_dependencies=Role control, audit log; risks=Weak accountability; evidence=E31,E39 |
| MBP-0019 | FS-0010, FS-0043, FS-0006 | GRP-015 | Customer portal & history | Full lifecycle visibility + communications | REPORT | RPT-019 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-019 | MBP-0019; RPT-019 | current=Basic concept and partial implementation; source_dependencies=CRM model, notifications; risks=Trust erosion if inaccurate; evidence=E40 |
| MBP-0020 | FS-0019, FS-0052 | GRP-007 | Inventory control + Kanban | End-to-end consumables planning + forecasting | REPORT | RPT-020 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave2 | workflow | ["GRP-006"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-020 | MBP-0020; RPT-020 | current=Tool crib and some flows exist; source_dependencies=Inventory backbone; risks=Cost leakage; evidence=E35,E32 |
| MBP-0021 | FS-0019, FS-0052 | GRP-007 | Inventory master tab | Complete searchable inventory state | REPORT | RPT-021 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P0 | Wave2 | workflow | ["GRP-006"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-021 | MBP-0021; RPT-021 | current=Explicitly absent; source_dependencies=Data model completion; risks=Blind spots in purchasing; evidence=E32 |
| MBP-0022 | FS-0052, FS-0019 | GRP-006 | Rotables lifecycle tracking | Full install/remove/disposition lifecycle | REPORT | RPT-022 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-022 | MBP-0022; RPT-022 | current=Serviceable/shop/vendor states shown; source_dependencies=Part traceability; risks=Compliance gaps; evidence=E35 |
| MBP-0023 | FS-0019, FS-0052 | GRP-007 | Tool calibration workflows | Reliable calibration control | REPORT | RPT-023 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave2 | workflow | ["GRP-006"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-023 | MBP-0023; RPT-023 | current=Due-calibration concepts surfaced; source_dependencies=Tool master data; risks=Overdue tooling risk; evidence=E35 |
| MBP-0024 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | QuickBooks integration | Bi-directional finance sync with controls | REPORT | RPT-024 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-024 | MBP-0024; RPT-024 | current=Integration points shown; source_dependencies=API and accounting mapping; risks=Financial mis-posting; evidence=E40 |
| MBP-0025 | FS-0016, FS-0028 | GRP-016 | Training compliance records | Full requirements and completion workflows | REPORT | RPT-025 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave3 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-025 | MBP-0025; RPT-025 | current=Minimal training requirement shown; source_dependencies=Training schema; risks=Incomplete compliance evidence; evidence=E27,E32; ctx_seed=ICS-001/corpus=industry-context-field-artifacts/doc=OJT Data Flow.pdf/feature=16/conf=high/date=2026-03-03 |
| MBP-0026 | FS-0035, FS-0013 | GRP-013 | FAA profile/aircraft enrichment | Verified and normalized external profile ingestion | REPORT | RPT-026 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P1 | Wave5 | data | ["GRP-012", "GRP-017"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-026 | MBP-0026; RPT-026 | current=Live FAA scrape demo; source_dependencies=Data validation; risks=Incorrect owner/engine data; evidence=E28 |
| MBP-0027 | FS-0051, FS-0012 | GRP-020 | Market-level quote benchmark engine | Labeled benchmark service | REPORT | RPT-027 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave6 | data | ["GRP-013", "GRP-018"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-027 | MBP-0027; RPT-027 | current=Conceptual “common quote book”; source_dependencies=Large clean dataset; risks=False confidence, liability; evidence=E18 |
| MBP-0028 | FS-0036, FS-0040 | GRP-019 | Talent marketplace matching | Profile-to-role matching with confidence score | REPORT | RPT-028 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave6 | product | ["GRP-015", "GRP-016"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-028 | MBP-0028; RPT-028 | current=Strategy discussions; source_dependencies=Identity, profile quality; risks=Focus dilution; evidence=E10,E36,E38 |
| MBP-0029 | FS-0020, FS-0030, FS-0001 | GRP-017 | Industry certification framework | Formalized cert pathways + audit loop | REPORT | RPT-029 | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | P2 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md#RPT-029 | MBP-0029; RPT-029 | current=New standards ideated; source_dependencies=Standards governance; risks=Credibility risk; evidence=E12,E13 |
| MBP-0030 | FS-0025, FS-0029 | GRP-010 | Multi-location UX: Map-based selection when creating a new work location. | Map-based selection when creating a new work location. | FR | FR-001 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave4 | ux | ["GRP-003"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-001 | MBP-0030; FR-001 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-009/corpus=industry-context-field-artifacts/doc=Repair Station Contacts with Ratings (Download).xlsx/feature=17/conf=high/date=2026-03-03 |
| MBP-0031 | FS-0035, FS-0013 | GRP-013 | Telemetry + predictive: Ingest ADS-B movement data for tracked aircraft and estimate time/cycl | Ingest ADS-B movement data for tracked aircraft and estimate time/cycles from last known baseline to shift scheduling and predictive maintenance. | FR | FR-002 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave5 | data | ["GRP-012", "GRP-017"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-002 | MBP-0031; FR-002 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0032 | FS-0020, FS-0030, FS-0001 | GRP-017 | WO docs + compliance: Separate compliance docs at task/subtask level from overall WO attachm | Separate compliance docs at task/subtask level from overall WO attachments; add task/subtask manual references (PDF/link/file), in-app PDF viewer, and download. | FR | FR-003 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-003 | MBP-0032; FR-003 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0033 | FS-0001, FS-0041 | GRP-005 | Task execution + signoff: Add vendor service add flow inside task items; discrepancy + correctiv | Add vendor service add flow inside task items; discrepancy + corrective action fields with immutable history; enforce technician signoff and independent inspector/RIII signoff via privileges and training compliance gates; add admin role capability matrix. | FR | FR-004 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-004 | MBP-0033; FR-004 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0034 | FS-0012, FS-0026, FS-0051 | GRP-009 | Time visibility: Show estimated task hours vs actual time logged to discrepancy/squawk. | Show estimated task hours vs actual time logged to discrepancy/squawk. | FR | FR-005 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave1 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-005 | MBP-0034; FR-005 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0035 | FS-0052, FS-0019 | GRP-006 | Task-level parts traceability: Add Parts Removed/Parts Installed per task with full part metadata, ro | Add Parts Removed/Parts Installed per task with full part metadata, rotable/consumable support, compliance docs access, and lot-level chain of custody history. | FR | FR-006 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-006 | MBP-0035; FR-006 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0036 | FS-0052, FS-0019 | GRP-006 | WO parts lifecycle board: In WO Parts tab, show requested/ordered/received/used-installed lifecy | In WO Parts tab, show requested/ordered/received/used-installed lifecycle and link each part to associated SWAC/squawk. | FR | FR-007 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-007 | MBP-0036; FR-007 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0037 | FS-0052, FS-0019 | GRP-006 | Parts request intake control: Part add flow should prefill from catalog; allow provisional net-new p | Part add flow should prefill from catalog; allow provisional net-new part requests routed to parts clerk acceptance/edit queue before permanent catalog entry. | FR | FR-008 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave2 | workflow | ["GRP-001", "GRP-002"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-008 | MBP-0037; FR-008 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0038 | FS-0052, FS-0019 | GRP-006 | Parts status labels: Color status semantics: requested-not-ordered (red), ordered-not-recei | Color status semantics: requested-not-ordered (red), ordered-not-received (yellow), received-not-installed (purple), installed (green), returned-to-stock (orange). | FR | FR-009 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-009 | MBP-0038; FR-009 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0039 | FS-0044, FS-0023 | GRP-003 | WO lifecycle timeline: Show timeline stage chips/circles on every WO: Quoting, In-dock, Inspe | Show timeline stage chips/circles on every WO: Quoting, In-dock, Inspection, Repair, Return to Service, Review & Improvement. | FR | FR-010 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-010 | MBP-0039; FR-010 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0040 | FS-0028, FS-0023 | GRP-008 | Turnover notes + AI assist: Dated turnover notes at task level and a lead turnover workspace that | Dated turnover notes at task level and a lead turnover workspace that aggregates in-work WOs from clocked activity/recents, with AI draft summary editable by lead and preserved in history. | FR | FR-011 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave3 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-011 | MBP-0040; FR-011 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0041 | FS-0028, FS-0023 | GRP-008 | Lead technician workspace: New lead page for assignment/management, team insights, and assigning | New lead page for assignment/management, team insights, and assigning WOs/tasks/subtasks to teams/individuals with bidirectional status reporting into lead and turnover views. | FR | FR-012 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave3 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-012 | MBP-0041; FR-012 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0042 | FS-0028, FS-0023 | GRP-008 | Turnover report contract: Generate/save PDF turnover reports; immutable after submit; signature | Generate/save PDF turnover reports; immutable after submit; signature and audit trail; include time totals, per-person/team breakdowns, graphs, deadlines, parts ordered/received, and lead notes. | FR | FR-013 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave3 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-013 | MBP-0042; FR-013 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0043 | FS-0025, FS-0029 | GRP-010 | Fleet filtering + view modes: Fleet filters for in-work and future schedule windows (3/6/12 months), | Fleet filters for in-work and future schedule windows (3/6/12 months), plus list/tile/truncated modes and classification by class/type/make/model. | FR | FR-014 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave4 | ux | ["GRP-003"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-014 | MBP-0043; FR-014 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-009/corpus=industry-context-field-artifacts/doc=Repair Station Contacts with Ratings (Download).xlsx/feature=17/conf=high/date=2026-03-03 |
| MBP-0044 | FS-0025, FS-0029 | GRP-010 | WO list modes + aircraft media linkage: Work Orders list supports current/tile/truncated views and aircraft th | Work Orders list supports current/tile/truncated views and aircraft thumbnails linked to Fleet featured image + gallery/carousel. | FR | FR-015 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave4 | ux | ["GRP-003"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-015 | MBP-0044; FR-015 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0045 | FS-0009, FS-0042 | GRP-011 | In-dock + RTS evidence hub: Add dedicated in-dock and return-to-service areas with checklist uploa | Add dedicated in-dock and return-to-service areas with checklist uploads, digital checklist templates, incoming inspection and RTS liability video upload/view/download, mobile-friendly (10-20 min videos, multiple files, auto naming). | FR | FR-016 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave4 | platform | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-016 | MBP-0045; FR-016 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0046 | FS-0025, FS-0029 | GRP-010 | WO search by location: Search modal supports all locations or specific location filter. | Search modal supports all locations or specific location filter. | FR | FR-017 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave0 | ux | ["GRP-003"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-017 | MBP-0046; FR-017 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-010/corpus=industry-context-field-artifacts/doc=Repair Station Contacts with Ratings (Download).xlsx/feature=25/conf=high/date=2026-03-03 |
| MBP-0047 | FS-0013, FS-0014 | GRP-012 | WO Gantt + smart assignment: Add Gantt view with dependencies, phase-tag population, lead assignmen | Add Gantt view with dependencies, phase-tag population, lead assignment controls, and foundation for automated assignment based on actuals/performance (PMBOK-aligned). | FR | FR-018 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-018 | MBP-0047; FR-018 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-002/corpus=industry-context-field-artifacts/doc=2023 leveling.pdf/feature=13/conf=high/date=2026-03-03 |
| MBP-0048 | FS-0052, FS-0019 | GRP-006 | Part return-to-parts workflow: From task/subtask, technician can return part to Parts with prefilled | From task/subtask, technician can return part to Parts with prefilled return info; parts dept confirms receipt and re-stocks only after receiving inspection. | FR | FR-019 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave2 | workflow | ["GRP-001", "GRP-002"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-019 | MBP-0048; FR-019 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0049 | FS-0052, FS-0019 | GRP-006 | Receiving inspection workflow: Add receiving checklists per part/PO/batch, role-gated completion by p | Add receiving checklists per part/PO/batch, role-gated completion by parts clerk capability, digital ownership trail, conformity doc uploads (8130/EASA/etc), mobile photo capture, batch PDF download. | FR | FR-020 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-020 | MBP-0049; FR-020 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0050 | FS-0012, FS-0026, FS-0051 | GRP-009 | WO dashboard page: Add `work-orders/dashboard` with active WO KPI, WIP (estimated vs actu | Add `work-orders/dashboard` with active WO KPI, WIP (estimated vs actual hours), and countdown to RTS date. | FR | FR-021 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-021 | MBP-0050; FR-021 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-005/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=26/conf=high/date=2026-03-03 |
| MBP-0051 | FS-0012, FS-0026, FS-0051 | GRP-009 | WO header KPI + date commitments: Per-WO KPI summary at top (WIP/estimated/applied), prominent committed | Per-WO KPI summary at top (WIP/estimated/applied), prominent committed RTS date, and controlled post-inspection out-date update flow. | FR | FR-022 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave1 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-022 | MBP-0051; FR-022 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md; ctx_seed=ICS-005/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=26/conf=high/date=2026-03-03 |
| MBP-0052 | FS-0044, FS-0010 | GRP-004 | Quote decision granularity: Pre-in-dock quote must allow accept/decline per line item with categor | Pre-in-dock quote must allow accept/decline per line item with categories: airworthiness, recommended, customer-info-only. | FR | FR-023 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave1 | product | ["GRP-002", "GRP-003"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-023 | MBP-0052; FR-023 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0053 | FS-0044, FS-0010 | GRP-004 | Secondary quote + squawk identity: Post-inspection repair quote supports same accept/decline model; each | Post-inspection repair quote supports same accept/decline model; each squawk has stable unique ID, with actor/time decision history visible. | FR | FR-024 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P0 | Wave1 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-024 | MBP-0053; FR-024 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0054 | FS-0041, FS-0042 | GRP-002 | Finding origin taxonomy: Every task/squawk tagged by origin: planned, inspection-found, custome | Every task/squawk tagged by origin: planned, inspection-found, customer-reported, RTS-found, post-release-found. | FR | FR-025 | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | P1 | Wave0 | compliance | ["GRP-001"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:38:57Z | 2026-03-04T04:38:57Z | agentic-reviewer | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md#FR-025; local://commit/6fd3a02 | MBP-0054; FR-025; REQ-TEAM-11,MBP-0018,MBP-0054; REQ-TEAM-11 | status provenance: athelon-app/docs/plans/2026-03-03-feature-intake-implementation-review.md |
| MBP-0055 | FS-0001, FS-0041 | GRP-005 | `completeStep` rating-to-step authorization — validate airframe/powerplant cert | `completeStep` rating-to-step authorization — validate airframe/powerplant cert | WATERFALL | AUTH-001 | WATERFALL-PLAN.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#AUTH-001 | MBP-0055; AUTH-001 | Source row extracted from waterfall feature tables. |
| MBP-0056 | FS-0012, FS-0026, FS-0051 | GRP-009 | Dashboard: WO status distribution (pie/donut chart) | Dashboard: WO status distribution (pie/donut chart) | WATERFALL | CHART-001 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#CHART-001 | MBP-0056; CHART-001 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0057 | FS-0012, FS-0026, FS-0051 | GRP-009 | Dashboard: Revenue trend (line chart, last 12 months) | Dashboard: Revenue trend (line chart, last 12 months) | WATERFALL | CHART-002 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#CHART-002 | MBP-0057; CHART-002 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0058 | FS-0012, FS-0026, FS-0051 | GRP-009 | Dashboard: TAT performance (bar chart) | Dashboard: TAT performance (bar chart) | WATERFALL | CHART-003 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#CHART-003 | MBP-0058; CHART-003 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0059 | FS-0012, FS-0026, FS-0051 | GRP-009 | Dashboard: Technician utilization (horizontal bar) | Dashboard: Technician utilization (horizontal bar) | WATERFALL | CHART-004 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#CHART-004 | MBP-0059; CHART-004 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0060 | FS-0012, FS-0026, FS-0051 | GRP-009 | Billing analytics: enhanced with real charts | Billing analytics: enhanced with real charts | WATERFALL | CHART-005 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#CHART-005 | MBP-0060; CHART-005 | Source row extracted from waterfall feature tables. |
| MBP-0061 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | CSV export on all list pages (invoices, WOs, parts, fleet) | CSV export on all list pages (invoices, WOs, parts, fleet) | WATERFALL | EXPORT-001 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#EXPORT-001 | MBP-0061; EXPORT-001 | Source row extracted from waterfall feature tables. |
| MBP-0062 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | Date range filter on exports | Date range filter on exports | WATERFALL | EXPORT-002 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#EXPORT-002 | MBP-0062; EXPORT-002 | Source row extracted from waterfall feature tables. |
| MBP-0063 | FS-0009, FS-0042 | GRP-011 | Convex file storage integration (generateUploadUrl → store → getUrl) | Convex file storage integration (generateUploadUrl → store → getUrl) | WATERFALL | FILE-001 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-001 | MBP-0063; FILE-001 | Source row extracted from waterfall feature tables. |
| MBP-0064 | FS-0009, FS-0042 | GRP-011 | Reusable FileUpload component (drag-drop, click, preview) | Reusable FileUpload component (drag-drop, click, preview) | WATERFALL | FILE-002 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-002 | MBP-0064; FILE-002 | Source row extracted from waterfall feature tables. |
| MBP-0065 | FS-0009, FS-0042 | GRP-011 | Photo upload on step sign-off (replace text URL field with actual upload) | Photo upload on step sign-off (replace text URL field with actual upload) | WATERFALL | FILE-003 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-003 | MBP-0065; FILE-003 | Source row extracted from waterfall feature tables. |
| MBP-0066 | FS-0009, FS-0042 | GRP-011 | Photo upload on discrepancy creation | Photo upload on discrepancy creation | WATERFALL | FILE-004 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-004 | MBP-0066; FILE-004 | Source row extracted from waterfall feature tables. |
| MBP-0067 | FS-0009, FS-0042 | GRP-011 | Document attachment on work orders (actual files, not just metadata) | Document attachment on work orders (actual files, not just metadata) | WATERFALL | FILE-005 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-005 | MBP-0067; FILE-005 | Source row extracted from waterfall feature tables. |
| MBP-0068 | FS-0009, FS-0042 | GRP-011 | Photo gallery component (thumbnail grid, lightbox view) | Photo gallery component (thumbnail grid, lightbox view) | WATERFALL | FILE-006 | WATERFALL-PLAN.md | P1 | Wave4 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#FILE-006 | MBP-0068; FILE-006 | Source row extracted from waterfall feature tables. |
| MBP-0069 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | Labor rate auto-application — pricing rules exist but `unitPrice` always defaults to 0 | Labor rate auto-application — pricing rules exist but `unitPrice` always defaults to 0 | WATERFALL | LABOR-001 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#LABOR-001 | MBP-0069; LABOR-001 | Source row extracted from waterfall feature tables. |
| MBP-0070 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | Wire `pricingProfiles` into invoice/quote line item creation | Wire `pricingProfiles` into invoice/quote line item creation | WATERFALL | LABOR-002 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#LABOR-002 | MBP-0070; LABOR-002 | Source row extracted from waterfall feature tables. |
| MBP-0071 | FS-0006, FS-0049 | GRP-023 | `notifications` table in schema (type, message, recipientId, read, createdAt) | `notifications` table in schema (type, message, recipientId, read, createdAt) | WATERFALL | NOTIF-001 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-001 | MBP-0071; NOTIF-001 | Source row extracted from waterfall feature tables. |
| MBP-0072 | FS-0006, FS-0049 | GRP-023 | Bell icon in TopBar with unread count badge | Bell icon in TopBar with unread count badge | WATERFALL | NOTIF-002 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-002 | MBP-0072; NOTIF-002 | Source row extracted from waterfall feature tables. |
| MBP-0073 | FS-0006, FS-0049 | GRP-023 | Notification dropdown panel | Notification dropdown panel | WATERFALL | NOTIF-003 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-003 | MBP-0073; NOTIF-003 | Source row extracted from waterfall feature tables. |
| MBP-0074 | FS-0006, FS-0049 | GRP-023 | Auto-generate notifications: WO status change, quote approved, invoice overdue, discrep... | Auto-generate notifications: WO status change, quote approved, invoice overdue, discrepancy critical | WATERFALL | NOTIF-004 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-004 | MBP-0074; NOTIF-004 | Source row extracted from waterfall feature tables. |
| MBP-0075 | FS-0006, FS-0049 | GRP-023 | Mark as read / mark all read | Mark as read / mark all read | WATERFALL | NOTIF-005 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-005 | MBP-0075; NOTIF-005 | Source row extracted from waterfall feature tables. |
| MBP-0076 | FS-0006, FS-0049 | GRP-023 | Notification preferences page | Notification preferences page | WATERFALL | NOTIF-006 | WATERFALL-PLAN.md | P1 | Wave3 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#NOTIF-006 | MBP-0076; NOTIF-006 | Source row extracted from waterfall feature tables. |
| MBP-0077 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | Invoice PDF template (header, line items, totals, tax, payment terms) | Invoice PDF template (header, line items, totals, tax, payment terms) | WATERFALL | PDF-001 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-001 | MBP-0077; PDF-001 | Source row extracted from waterfall feature tables. |
| MBP-0078 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | Quote PDF template (header, departments/sections, line items, terms) | Quote PDF template (header, departments/sections, line items, terms) | WATERFALL | PDF-002 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-002 | MBP-0078; PDF-002 | Source row extracted from waterfall feature tables. |
| MBP-0079 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | RTS document PDF (aircraft info, completed work, compliance items, signatures) | RTS document PDF (aircraft info, completed work, compliance items, signatures) | WATERFALL | PDF-003 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-003 | MBP-0079; PDF-003 | Source row extracted from waterfall feature tables. |
| MBP-0080 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | Work order summary PDF (header, task cards, discrepancies, parts used) | Work order summary PDF (header, task cards, discrepancies, parts used) | WATERFALL | PDF-004 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-004 | MBP-0080; PDF-004 | Source row extracted from waterfall feature tables. |
| MBP-0081 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | "Download PDF" button on invoice detail, quote detail, RTS, WO detail pages | "Download PDF" button on invoice detail, quote detail, RTS, WO detail pages | WATERFALL | PDF-005 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-005 | MBP-0081; PDF-005 | Source row extracted from waterfall feature tables. |
| MBP-0082 | FS-0002, FS-0003, FS-0004, FS-0005 | GRP-022 | "Print" button using browser print with print-friendly CSS | "Print" button using browser print with print-friendly CSS | WATERFALL | PDF-006 | WATERFALL-PLAN.md | P1 | Wave1 | platform | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PDF-006 | MBP-0082; PDF-006 | Source row extracted from waterfall feature tables. |
| MBP-0083 | FS-0025, FS-0040 | GRP-024 | Dark mode toggle in TopBar | Dark mode toggle in TopBar | WATERFALL | POLISH-001 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-001 | MBP-0083; POLISH-001 | Source row extracted from waterfall feature tables. |
| MBP-0084 | FS-0025, FS-0040 | GRP-024 | Cmd-K command palette (search, navigate, quick actions) | Cmd-K command palette (search, navigate, quick actions) | WATERFALL | POLISH-002 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-002 | MBP-0084; POLISH-002 | Source row extracted from waterfall feature tables. |
| MBP-0085 | FS-0025, FS-0040 | GRP-024 | Activity timeline on work orders | Activity timeline on work orders | WATERFALL | POLISH-003 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-003 | MBP-0085; POLISH-003 | Source row extracted from waterfall feature tables. |
| MBP-0086 | FS-0025, FS-0040 | GRP-024 | Keyboard shortcuts (N for new, E for edit, etc.) | Keyboard shortcuts (N for new, E for edit, etc.) | WATERFALL | POLISH-004 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-004 | MBP-0086; POLISH-004 | Source row extracted from waterfall feature tables. |
| MBP-0087 | FS-0025, FS-0040 | GRP-024 | PWA manifest + service worker + offline support | PWA manifest + service worker + offline support | WATERFALL | POLISH-005 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-005 | MBP-0087; POLISH-005 | Source row extracted from waterfall feature tables. |
| MBP-0088 | FS-0025, FS-0040 | GRP-024 | Bulk CSV import (aircraft, parts, customers) | Bulk CSV import (aircraft, parts, customers) | WATERFALL | POLISH-006 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-006 | MBP-0088; POLISH-006 | Source row extracted from waterfall feature tables. |
| MBP-0089 | FS-0025, FS-0040 | GRP-024 | Parts reorder alerts (min-stock threshold) | Parts reorder alerts (min-stock threshold) | WATERFALL | POLISH-007 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-007 | MBP-0089; POLISH-007 | Source row extracted from waterfall feature tables. |
| MBP-0090 | FS-0025, FS-0040 | GRP-024 | MEL deferral tracking with countdown timers | MEL deferral tracking with countdown timers | WATERFALL | POLISH-008 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-008 | MBP-0090; POLISH-008 | Source row extracted from waterfall feature tables. |
| MBP-0091 | FS-0025, FS-0040 | GRP-024 | Shift handoff dashboard | Shift handoff dashboard | WATERFALL | POLISH-009 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-009 | MBP-0091; POLISH-009 | Source row extracted from waterfall feature tables. |
| MBP-0092 | FS-0025, FS-0040 | GRP-024 | Fleet calendar (upcoming inspections) | Fleet calendar (upcoming inspections) | WATERFALL | POLISH-010 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-010 | MBP-0092; POLISH-010 | Source row extracted from waterfall feature tables. |
| MBP-0093 | FS-0025, FS-0040 | GRP-024 | Expand E2E test coverage to all features | Expand E2E test coverage to all features | WATERFALL | POLISH-011 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-011 | MBP-0093; POLISH-011 | Source row extracted from waterfall feature tables. |
| MBP-0094 | FS-0025, FS-0040 | GRP-024 | Performance audit (bundle size, lazy loading) | Performance audit (bundle size, lazy loading) | WATERFALL | POLISH-012 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-012 | MBP-0094; POLISH-012 | Source row extracted from waterfall feature tables. |
| MBP-0095 | FS-0025, FS-0040 | GRP-024 | WCAG AA deep pass | WCAG AA deep pass | WATERFALL | POLISH-013 | WATERFALL-PLAN.md | P2 | Wave4 | ux | ["GRP-003", "GRP-010"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#POLISH-013 | MBP-0095; POLISH-013 | Source row extracted from waterfall feature tables. |
| MBP-0096 | FS-0010, FS-0043, FS-0006 | GRP-015 | Customer login (separate Clerk org or magic link) | Customer login (separate Clerk org or magic link) | WATERFALL | PORTAL-001 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-001 | MBP-0096; PORTAL-001 | Source row extracted from waterfall feature tables. |
| MBP-0097 | FS-0010, FS-0043, FS-0006 | GRP-015 | Customer dashboard: active WOs, recent invoices, fleet status | Customer dashboard: active WOs, recent invoices, fleet status | WATERFALL | PORTAL-002 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-002 | MBP-0097; PORTAL-002 | Source row extracted from waterfall feature tables. |
| MBP-0098 | FS-0010, FS-0043, FS-0006 | GRP-015 | WO status tracking (timeline view) | WO status tracking (timeline view) | WATERFALL | PORTAL-003 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-003 | MBP-0098; PORTAL-003 | Source row extracted from waterfall feature tables. |
| MBP-0099 | FS-0010, FS-0043, FS-0006 | GRP-015 | Quote review & approve/decline inline | Quote review & approve/decline inline | WATERFALL | PORTAL-004 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-004 | MBP-0099; PORTAL-004 | Source row extracted from waterfall feature tables. |
| MBP-0100 | FS-0010, FS-0043, FS-0006 | GRP-015 | Invoice view & payment status | Invoice view & payment status | WATERFALL | PORTAL-005 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-005 | MBP-0100; PORTAL-005 | Source row extracted from waterfall feature tables. |
| MBP-0101 | FS-0010, FS-0043, FS-0006 | GRP-015 | Download PDFs (invoices, quotes, RTS) | Download PDFs (invoices, quotes, RTS) | WATERFALL | PORTAL-006 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-006 | MBP-0101; PORTAL-006 | Source row extracted from waterfall feature tables. |
| MBP-0102 | FS-0010, FS-0043, FS-0006 | GRP-015 | Message/request submission to shop | Message/request submission to shop | WATERFALL | PORTAL-007 | WATERFALL-PLAN.md | P1 | Wave4 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#PORTAL-007 | MBP-0102; PORTAL-007 | Source row extracted from waterfall feature tables. |
| MBP-0103 | FS-0012, FS-0026, FS-0051 | GRP-009 | Monthly revenue report page | Monthly revenue report page | WATERFALL | REPORT-001 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#REPORT-001 | MBP-0103; REPORT-001 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0104 | FS-0012, FS-0026, FS-0051 | GRP-009 | WO throughput report | WO throughput report | WATERFALL | REPORT-002 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#REPORT-002 | MBP-0104; REPORT-002 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-004/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=12/conf=high/date=2026-03-03 |
| MBP-0105 | FS-0015, FS-0041, FS-0050 | GRP-001 | Define MRO roles: admin, shop_manager, qcm_inspector, lead_technician, technician, bill... | Define MRO roles: admin, shop_manager, qcm_inspector, lead_technician, technician, billing_clerk, customer | WATERFALL | ROLE-001 | WATERFALL-PLAN.md | P0 | Wave0 | compliance | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | WATERFALL-PLAN.md#ROLE-001; local://commit/ba485cc | MBP-0105; ROLE-001; REQ-TEAM-02,MBP-0105; REQ-TEAM-02 | Source row extracted from waterfall feature tables. |
| MBP-0106 | FS-0015, FS-0041, FS-0050 | GRP-001 | Admin settings page: invite user, assign role, deactivate | Admin settings page: invite user, assign role, deactivate | WATERFALL | ROLE-002 | WATERFALL-PLAN.md | P0 | Wave0 | compliance | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | WATERFALL-PLAN.md#ROLE-002; local://commit/fd08a87 | MBP-0106; ROLE-002; REQ-TEAM-03,MBP-0106; REQ-TEAM-03 | Source row extracted from waterfall feature tables. |
| MBP-0107 | FS-0015, FS-0041, FS-0050 | GRP-001 | Role-based sidebar nav (hide billing from technicians, hide WO execution from billing) | Role-based sidebar nav (hide billing from technicians, hide WO execution from billing) | WATERFALL | ROLE-003 | WATERFALL-PLAN.md | P0 | Wave0 | compliance | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | WATERFALL-PLAN.md#ROLE-003; local://commit/7e925b4 | MBP-0107; ROLE-003; REQ-TEAM-04,MBP-0107; REQ-TEAM-04 | Source row extracted from waterfall feature tables. |
| MBP-0108 | FS-0015, FS-0041, FS-0050 | GRP-001 | Role-based route guards (redirect unauthorized) | Role-based route guards (redirect unauthorized) | WATERFALL | ROLE-004 | WATERFALL-PLAN.md | P0 | Wave0 | compliance | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | WATERFALL-PLAN.md#ROLE-004; local://commit/1a206bc | MBP-0108; ROLE-004; REQ-TEAM-05,MBP-0108; REQ-TEAM-05 | Source row extracted from waterfall feature tables. |
| MBP-0109 | FS-0015, FS-0041, FS-0050 | GRP-001 | Role display in personnel page | Role display in personnel page | WATERFALL | ROLE-005 | WATERFALL-PLAN.md | P0 | Wave0 | compliance | [] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | implemented | implemented | qa_verified | 2026-03-04T04:05:06Z | 2026-03-04T04:05:06Z | agentic-reviewer | WATERFALL-PLAN.md#ROLE-005; local://commit/d104430 | MBP-0109; ROLE-005; REQ-TEAM-06,MBP-0109; REQ-TEAM-06 | Source row extracted from waterfall feature tables. |
| MBP-0110 | FS-0013, FS-0014 | GRP-012 | Interactive Gantt chart with drag-drop (resize, move WO bars) | Interactive Gantt chart with drag-drop (resize, move WO bars) | WATERFALL | SCHED-001 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-001 | MBP-0110; SCHED-001 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-002/corpus=industry-context-field-artifacts/doc=2023 leveling.pdf/feature=13/conf=high/date=2026-03-03 |
| MBP-0111 | FS-0013, FS-0014 | GRP-012 | Technician skill matching in drag-drop (warn if unqualified) | Technician skill matching in drag-drop (warn if unqualified) | WATERFALL | SCHED-002 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-002 | MBP-0111; SCHED-002 | Source row extracted from waterfall feature tables. |
| MBP-0112 | FS-0013, FS-0014 | GRP-012 | Hangar bay allocation view (which aircraft in which bay) | Hangar bay allocation view (which aircraft in which bay) | WATERFALL | SCHED-003 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-003 | MBP-0112; SCHED-003 | Source row extracted from waterfall feature tables. |
| MBP-0113 | FS-0013, FS-0014 | GRP-012 | Bay conflict detection (double-booking warning) | Bay conflict detection (double-booking warning) | WATERFALL | SCHED-004 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-004 | MBP-0113; SCHED-004 | Source row extracted from waterfall feature tables. |
| MBP-0114 | FS-0013, FS-0014 | GRP-012 | Auto-schedule algorithm (assign WOs to bays + techs based on constraints) | Auto-schedule algorithm (assign WOs to bays + techs based on constraints) | WATERFALL | SCHED-005 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-005 | MBP-0114; SCHED-005 | Source row extracted from waterfall feature tables.; ctx_seed=ICS-003/corpus=industry-context-field-artifacts/doc=Elevate MRO Capacity planning.xlsx/feature=14/conf=high/date=2026-03-03 |
| MBP-0115 | FS-0013, FS-0014 | GRP-012 | TAT estimation based on historical data | TAT estimation based on historical data | WATERFALL | SCHED-006 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-006 | MBP-0115; SCHED-006 | Source row extracted from waterfall feature tables. |
| MBP-0116 | FS-0013, FS-0014 | GRP-012 | Schedule snapshot/baseline comparison | Schedule snapshot/baseline comparison | WATERFALL | SCHED-007 | WATERFALL-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHED-007 | MBP-0116; SCHED-007 | Source row extracted from waterfall feature tables. |
| MBP-0117 | FS-0020, FS-0030, FS-0001 | GRP-017 | Create `conformityInspections` table with proper indexes | Create `conformityInspections` table with proper indexes | WATERFALL | SCHEMA-001 | WATERFALL-PLAN.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHEMA-001 | MBP-0117; SCHEMA-001 | Source row extracted from waterfall feature tables. |
| MBP-0118 | FS-0020, FS-0030, FS-0001 | GRP-017 | Add conformity inspection mutations (create, complete, list) | Add conformity inspection mutations (create, complete, list) | WATERFALL | SCHEMA-002 | WATERFALL-PLAN.md | P0 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#SCHEMA-002 | MBP-0118; SCHEMA-002 | Source row extracted from waterfall feature tables. |
| MBP-0119 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | Invoice tax calculation — tax arg is accepted but ignored, always writes `tax: 0` | Invoice tax calculation — tax arg is accepted but ignored, always writes `tax: 0` | WATERFALL | TAX-001 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#TAX-001 | MBP-0119; TAX-001 | Source row extracted from waterfall feature tables. |
| MBP-0120 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | `computeTaxForInvoice` in billingV4 — wire it into invoice creation flow | `computeTaxForInvoice` in billingV4 — wire it into invoice creation flow | WATERFALL | TAX-002 | WATERFALL-PLAN.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | WATERFALL-PLAN.md#TAX-002 | MBP-0120; TAX-002 | Source row extracted from waterfall feature tables. |
| MBP-0121 | FS-0020, FS-0030, FS-0001 | GRP-017 | Approved data ref on task step | Approved data ref on task step | TECH_MVP | GAP-001 | athelon-app/TECH-MVP-BUILD-PLAN.md | P1 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-001 | MBP-0121; GAP-001 | schema=✅ on taskCards (not steps); backend=❌ Need step-level field; frontend=🔧 Add to SignStepDialog; effort=M |
| MBP-0122 | FS-0052, FS-0019 | GRP-006 | Parts installation in step sign-off | Parts installation in step sign-off | TECH_MVP | GAP-002 | athelon-app/TECH-MVP-BUILD-PLAN.md | P2 | Wave2 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include chain-of-custody and state-transition checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-002 | MBP-0122; GAP-002 | schema=✅ embeddedPartRecord on maintenanceRecords; backend=❌ Need step-level parts; frontend=🔧 Add parts picker to SignStepDialog; effort=L |
| MBP-0123 | FS-0044, FS-0023 | GRP-003 | "My Work" tech view | "My Work" tech view | TECH_MVP | GAP-003 | athelon-app/TECH-MVP-BUILD-PLAN.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-04T04:43:13Z | 2026-03-04T04:43:13Z | agentic-reviewer | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-003; local://commit/3da181f | MBP-0123; GAP-003; REQ-TEAM-12,MBP-0123; REQ-TEAM-12 | schema=✅ by_assigned index exists; backend=✅ Can query by techId; frontend=❌ No /my-work page; effort=M |
| MBP-0124 | FS-0044, FS-0023 | GRP-003 | Raise Finding from task card | Raise Finding from task card | TECH_MVP | GAP-004 | athelon-app/TECH-MVP-BUILD-PLAN.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-004 | MBP-0124; GAP-004 | schema=✅ discrepancies table exists; backend=✅ openDiscrepancy mutation; frontend=❌ No UI button on task card; effort=S |
| MBP-0125 | FS-0028, FS-0023 | GRP-008 | Shift handoff notes on task cards | Shift handoff notes on task cards | TECH_MVP | GAP-005 | athelon-app/TECH-MVP-BUILD-PLAN.md | P1 | Wave3 | workflow | ["GRP-003", "GRP-009"] | Feature is implemented end-to-end with role, audit, and data-integrity controls where required. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | missing | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-005 | MBP-0125; GAP-005 | schema=❌ No schema field; backend=❌ Need mutation; frontend=❌ No UI; effort=M |
| MBP-0126 | FS-0020, FS-0030, FS-0001 | GRP-017 | Aircraft maintenance logbook view | Aircraft maintenance logbook view | TECH_MVP | GAP-006 | athelon-app/TECH-MVP-BUILD-PLAN.md | P2 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include negative-permission and audit-trace checks. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-006 | MBP-0126; GAP-006 | schema=✅ maintenanceRecords table; backend=✅ Queries exist; frontend=❌ No /fleet/[tail]/logbook page; effort=L |
| MBP-0127 | FS-0044, FS-0023 | GRP-003 | Tech notes on step sign-off | Tech notes on step sign-off | TECH_MVP | GAP-007 | athelon-app/TECH-MVP-BUILD-PLAN.md | P2 | Wave1 | workflow | ["GRP-001", "GRP-002"] | Regression coverage confirms current behavior remains stable and traceable. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | implemented | implemented | qa_verified | 2026-03-03T00:00:00Z | 2026-03-03T00:00:00Z | feature-spec-migration-agent | athelon-app/TECH-MVP-BUILD-PLAN.md#GAP-007 | MBP-0127; GAP-007 | schema=✅ notes field on taskCardSteps; backend=✅ completeStep accepts notes; frontend=✅ SignStepDialog has notes field; effort=DONE |
| MBP-0128 | FS-0013, FS-0014 | GRP-012 | Gantt Engine (Pure TypeScript) | Gantt Engine (Pure TypeScript) | SCHED | SCH-A1 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A1 | MBP-0128; SCH-A1 | Agent-track from scheduling build plan.; ctx_seed=ICS-002/corpus=industry-context-field-artifacts/doc=2023 leveling.pdf/feature=13/conf=high/date=2026-03-03 |
| MBP-0129 | FS-0013, FS-0014 | GRP-012 | Gantt UI — Interactive Visual Scheduler | Gantt UI — Interactive Visual Scheduler | SCHED | SCH-A2 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A2 | MBP-0129; SCH-A2 | Agent-track from scheduling build plan.; ctx_seed=ICS-002/corpus=industry-context-field-artifacts/doc=2023 leveling.pdf/feature=13/conf=high/date=2026-03-03 |
| MBP-0130 | FS-0013, FS-0014 | GRP-012 | Capacity Management Dashboard | Capacity Management Dashboard | SCHED | SCH-A3 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave5 | workflow | ["GRP-003", "GRP-009"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. Include deterministic schedule/prediction assertions. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A3 | MBP-0130; SCH-A3 | Agent-track from scheduling build plan. |
| MBP-0131 | FS-0032, FS-0007, FS-0008, FS-0051 | GRP-018 | P&L Projection & Financial Dashboard | P&L Projection & Financial Dashboard | SCHED | SCH-A4 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A4 | MBP-0131; SCH-A4 | Agent-track from scheduling build plan. |
| MBP-0132 | FS-0044, FS-0010 | GRP-004 | Quote Builder & WO Cost Estimation | Quote Builder & WO Cost Estimation | SCHED | SCH-A5 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave1 | product | ["GRP-002", "GRP-003"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A5 | MBP-0132; SCH-A5 | Agent-track from scheduling build plan. |
| MBP-0133 | FS-0053, FS-0044 | GRP-014 | Routes, Navigation & Integration | Routes, Navigation & Integration | SCHED | SCH-A6 | athelon-app/SCHEDULING-BUILD-PLAN.md | P1 | Wave4 | platform | ["GRP-003", "GRP-006", "GRP-018"] | Feature intent is specified, scoped, and validated with executable acceptance tests before build start. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | proposed | not_implemented | unreviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/SCHEDULING-BUILD-PLAN.md#SCH-A6 | MBP-0133; SCH-A6 | Agent-track from scheduling build plan. |
| MBP-0134 | FS-0021, FS-0028, FS-0023 | GRP-008 | Overtime / Shift Management | Shift schedules and overtime threshold controls for labor governance. | MASTER | MBL-021 | athelon-app/MASTER-BUILD-LIST.md | P2 | Wave3 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-021 | MBP-0134; MBL-021 | source=Master Build List feature #21; status=Partially Implemented in feature matrix.; ctx_seed=ICS-006/corpus=industry-context-field-artifacts/doc=Tech capacity and training report BJC Jan 2023 1.2 (1).pdf/feature=21/conf=high/date=2026-03-03 |
| MBP-0135 | FS-0025, FS-0029 | GRP-010 | Search — Global Search | Command-palette global search across aircraft, work orders, parts, and customers. | MASTER | MBL-025 | athelon-app/MASTER-BUILD-LIST.md | P2 | Wave4 | ux | ["GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-025 | MBP-0135; MBL-025 | source=Master Build List feature #25; status=Partially Implemented in feature matrix.; ctx_seed=ICS-010/corpus=industry-context-field-artifacts/doc=Repair Station Contacts with Ratings (Download).xlsx/feature=25/conf=high/date=2026-03-03 |
| MBP-0136 | FS-0044, FS-0023 | GRP-003 | Work Order Routing Templates + Standard Minutes | Template-driven work-order routing with operation-level standard-minute baselines. | MASTER | MBL-044 | athelon-app/MASTER-BUILD-LIST.md | P0 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-044 | MBP-0136; MBL-044 | source=Master Build List feature #44; backend-needed status captured under partial for canonical rollup.; ctx_seed=ICS-007/corpus=industry-context-field-artifacts/doc=AVEX-NS Aviation Hldgs Lean slide.pptx/feature=44/conf=high/date=2026-03-03 |
| MBP-0137 | FS-0012, FS-0026, FS-0051 | GRP-009 | Operational Report Builder + Scheduled Report Runs | Configurable operational report definitions with scheduled run execution. | MASTER | MBL-051 | athelon-app/MASTER-BUILD-LIST.md | P2 | Wave3 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-03T00:00:00Z | null | feature-spec-migration-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-051 | MBP-0137; MBL-051 | source=Master Build List feature #51; status=Partially Implemented in feature matrix.; ctx_seed=ICS-008/corpus=industry-context-field-artifacts/doc=Elevate MRO Capacity planning.xlsx/feature=51/conf=high/date=2026-03-03 |
| MBP-0138 | FS-0054, FS-0023 | GRP-003 | Task-card compliance persistence guard | Task-card compliance save hard-failure guard and retry-safe mutation flow. | MASTER | MBL-054 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-054 | MBP-0138; MBL-054 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0139 | FS-0055, FS-0023 | GRP-003 | Lead-tech execution safety orchestration | Lead workspace and task execution safety guardrail consolidation. | MASTER | MBL-055 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-055 | MBP-0139; MBL-055 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0140 | FS-0056, FS-0044 | GRP-003 | Task-card authoring validation hardening | Template and ad hoc task-card authoring validation constraints. | MASTER | MBL-056 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-056 | MBP-0140; MBL-056 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0141 | FS-0057, FS-0022 | GRP-017 | Discrepancy raise/link integrity controls | Referentially safe discrepancy raise-and-link controls from task and WO contexts. | MASTER | MBL-057 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-057 | MBP-0141; MBL-057 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0142 | FS-0058, FS-0023 | GRP-003 | My Work assignment consistency checks | Assignment freshness and stale-view protections for technician execution lanes. | MASTER | MBL-058 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-058 | MBP-0142; MBL-058 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0143 | FS-0059, FS-0001 | GRP-005 | Sign-off dialog integrity guardrails | Required-field and payload integrity rules for sign-off dialogs and commits. | MASTER | MBL-059 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | workflow | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-059 | MBP-0143; MBL-059 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0144 | FS-0060, FS-0028 | GRP-008 | Squawk escalation and handoff safety | Deterministic squawk escalation and handoff continuity controls. | MASTER | MBL-060 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-060 | MBP-0144; MBL-060 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0145 | FS-0061, FS-0020 | GRP-017 | Certificate normalization and hygiene | Certificate field trim/normalize pipeline and compliance-form data hygiene. | MASTER | MBL-061 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave1 | compliance | ["GRP-001", "GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-061 | MBP-0145; MBL-061 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0146 | FS-0062, FS-0010 | GRP-015 | Customer account CRM and profile ledger | Unified customer profile ledger across internal billing and customer portal surfaces. | MASTER | MBL-062 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | product | ["GRP-003", "GRP-014"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-062 | MBP-0146; MBL-062 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0147 | FS-0063, FS-0032 | GRP-018 | AR/deposits/credit memo control pack | Receivables controls for deposits, credit memo issuance, and AR aging consistency. | MASTER | MBL-063 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | product | ["GRP-003", "GRP-014"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-063 | MBP-0147; MBL-063 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0148 | FS-0064, FS-0052 | GRP-014 | Procurement and vendor operations pack | Vendor and purchase-order operational controls with payable governance hooks. | MASTER | MBL-064 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | workflow | ["GRP-003", "GRP-006", "GRP-018"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-064 | MBP-0148; MBL-064 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0149 | FS-0065, FS-0032 | GRP-018 | Recurring billing contract engine | Contract-driven recurring billing lifecycle, cadence, and renewal controls. | MASTER | MBL-065 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave3 | product | ["GRP-003", "GRP-014"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-065 | MBP-0149; MBL-065 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0150 | FS-0066, FS-0044 | GRP-004 | Labor-kit and quote-template library | Reusable labor and quote template library with conversion-safe mapping. | MASTER | MBL-066 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | product | ["GRP-002", "GRP-003"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-066 | MBP-0150; MBL-066 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0151 | FS-0067, FS-0052 | GRP-007 | Parts logistics operations pack | Shipping, loaner, and core lifecycle controls with custody traceability. | MASTER | MBL-067 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | workflow | ["GRP-006"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-067 | MBP-0151; MBL-067 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0152 | FS-0068, FS-0013 | GRP-012 | Roster and crew coordination controls | Crew roster coordination integrated with bay/capacity scheduling constraints. | MASTER | MBL-068 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave4 | workflow | ["GRP-003", "GRP-009"] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-068 | MBP-0152; MBL-068 | Route/category audit promotion; mapped into canonical registry expansion. |
| MBP-0153 | FS-0069, FS-0015, FS-0053 | GRP-001 | Station config and org governance console | Station/org governance policy controls and configuration propagation rules. | MASTER | MBL-069 | athelon-app/MASTER-BUILD-LIST.md | P1 | Wave2 | platform | [] | All missing behaviors are completed and verified end-to-end against source requirement text. | npx tsc --noEmit; targeted Playwright scenario; Convex query/mutation validation where applicable. | partial | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | — | master-spec-expansion-agent | athelon-app/MASTER-BUILD-LIST.md#MBL-069 | MBP-0153; MBL-069 | Route/category audit promotion; mapped into canonical registry expansion. |

## Registry C — Route Capability Registry (101)

| route_id | route_path_template | route_label | route_kind | route_category_id | route_source | source_component | route_source_status | mapped_fs_ids | mapped_mbp_ids | implementation_state | verification_state | last_reviewed_at_utc | reviewed_by | key_subfeatures | gap_notes | evidence_links |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RTC-0001 | /billing | Billing | redirect | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | Navigate(to=/billing/customers) | router_only | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing; Role-scoped access flow; State transition controls | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. | src/router/routeModules/protectedAppRoutes.tsx |
| RTC-0002 | /billing/analytics | Billing Analytics | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingAnalyticsPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing Analytics; Monthly Revenue — Last 6 Months; Revenue by Month; AR Aging; Top Customers by Collected Revenue | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/analytics/page.tsx |
| RTC-0003 | /billing/ar-dashboard | AR Dashboard | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | ArDashboardPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | AR Dashboard; Customer Balances; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/ar-dashboard/page.tsx |
| RTC-0004 | /billing/credit-memos | Credit Memos | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingCreditMemosPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Credit Memos; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/credit-memos/page.tsx |
| RTC-0005 | /billing/customers | Customers | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | CustomersPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Customers; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/customers/page.tsx |
| RTC-0006 | /billing/customers/:id | Billing Customers Detail | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | CustomerDetailPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | customer?.name; Customer Information; Quotes; Invoices; Payment History | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/customers/[id]/page.tsx |
| RTC-0007 | /billing/deposits | Deposits | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingDepositsPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Deposits; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/deposits/page.tsx |
| RTC-0008 | /billing/invoices | Invoices | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | InvoicesPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Invoices; Cash; Check; Credit Card; Wire Transfer | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/invoices/page.tsx |
| RTC-0009 | /billing/invoices/:id | Billing Invoices Detail | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | InvoiceDetailPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | invoice.invoiceNumber; Invoice invoice.invoiceNumber; Invoice Summary; Line Items; Payment History | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/invoices/[id]/page.tsx |
| RTC-0010 | /billing/invoices/new | Billing Invoices New | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | NewInvoicePage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | New Invoice; Invoice Source; Invoice Details; Tax Rate | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/invoices/new/page.tsx |
| RTC-0011 | /billing/labor-kits | Labor Kits | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | LaborKitsPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Labor Kits; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/labor-kits/page.tsx |
| RTC-0012 | /billing/otc | OTC Sales | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | OTCSalesPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Counter Sales; Add Items; Cart (cart.length itemcart.length !== 1 ? "s" : ""); Payment; Sales History | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/otc/page.tsx |
| RTC-0013 | /billing/pricing | Pricing | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingPricingPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Pricing; Pricing Profiles; Pricing Rules | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/pricing/page.tsx |
| RTC-0014 | /billing/purchase-orders | Purchase Orders | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | PurchaseOrdersPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Purchase Orders; Draft; Submitted; Partial; Received | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/purchase-orders/page.tsx |
| RTC-0015 | /billing/purchase-orders/:id | Billing Purchase Orders Detail | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | PODetailPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | po.poNumber; PO Summary; Line Items | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/purchase-orders/[id]/page.tsx |
| RTC-0016 | /billing/purchase-orders/new | Billing Purchase Orders New | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | NewPOPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | New Purchase Order; PO Details; Line Items | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/purchase-orders/new/page.tsx |
| RTC-0017 | /billing/quotes | Quotes | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | QuotesPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Quotes; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/quotes/page.tsx |
| RTC-0018 | /billing/quotes/:id | Billing Quotes Detail | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | QuoteDetailPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing Quotes Detail; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/quotes/[id]/page.tsx |
| RTC-0019 | /billing/quotes/new | Billing Quotes New | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | NewQuotePage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing Quotes New; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/quotes/new/page.tsx |
| RTC-0020 | /billing/recurring | Recurring | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingRecurringPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Recurring; Recurring Billing; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/recurring/page.tsx |
| RTC-0021 | /billing/settings | Billing Settings | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingSettingsPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing Settings; Role-scoped action controls; Validation and error-state handling | Page includes explicit coming-soon/stub indicators; capability is partial. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/settings/page.tsx |
| RTC-0022 | /billing/tax-config | Tax Config | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingTaxConfigPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Tax Config; Tax Configuration; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/tax-config/page.tsx |
| RTC-0023 | /billing/time-approval | Time Approval | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingTimeApprovalPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Time Approval; Time Clock Approval; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/time-approval/page.tsx |
| RTC-0024 | /billing/time-clock | Time Clock | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | BillingTimeClockPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Time Clock; Today&apos;s Summary; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/time-clock/page.tsx |
| RTC-0025 | /billing/vendors | Vendors | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | VendorsPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Vendors; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/vendors/page.tsx |
| RTC-0026 | /billing/vendors/:id | Billing Vendors Detail | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | VendorDetailPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | vendor.name; Services; Contact Information; Certification; Purchase Order History | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/vendors/[id]/page.tsx |
| RTC-0027 | /billing/vendors/new | Billing Vendors New | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | NewVendorPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | New Vendor; Vendor Information; Contact Information; Certification; Parts Supplier | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/vendors/new/page.tsx |
| RTC-0028 | /billing/warranty | Warranty | page | CAT-BILLING | src/router/routeModules/protectedAppRoutes.tsx | WarrantyPage | routed | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Total Claims; Draft; Submitted; Under Review; Approved | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/warranty/page.tsx |
| RTC-0029 | /compliance | Compliance | page | CAT-COMPLIANCE | src/router/routeModules/protectedAppRoutes.tsx | CompliancePage | routed | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Compliance; Fleet AD Compliance Status; Compliance Tools | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/compliance/page.tsx |
| RTC-0030 | /compliance/ad-sb | AD/SB | page | CAT-COMPLIANCE | src/router/routeModules/protectedAppRoutes.tsx | AdSbCompliancePage | routed | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | AD/SB; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/compliance/ad-sb/page.tsx |
| RTC-0031 | /compliance/audit-trail | Audit Trail | page | CAT-COMPLIANCE | src/router/routeModules/protectedAppRoutes.tsx | AuditTrailPage | routed | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Audit Trail; Airworthiness Directives — aircraftRegistration; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/compliance/audit-trail/page.tsx |
| RTC-0032 | /compliance/certificates | Compliance Certificates | redirect | CAT-COMPLIANCE | src/router/routeModules/protectedAppRoutes.tsx | Navigate(to=/compliance/audit-trail) | router_only | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Compliance Certificates; Role-scoped access flow; State transition controls | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. | src/router/routeModules/protectedAppRoutes.tsx |
| RTC-0033 | /compliance/qcm-review | QCM Review | page | CAT-COMPLIANCE | src/router/routeModules/protectedAppRoutes.tsx | QcmReviewPage | routed | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | QCM Review; IA Sign-Off Queue; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/compliance/qcm-review/page.tsx |
| RTC-0034 | /dashboard | Dashboard | page | CAT-DASHBOARD | src/router/routeModules/protectedAppRoutes.tsx | DashboardPage | routed | FS-0012, FS-0026 | MBP-0056, MBP-0057 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Dashboard; Active Work Orders; AOG Aircraft; Overdue ADs; Open Discrepancies | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/dashboard/page.tsx |
| RTC-0035 | /fleet | Fleet | page | CAT-FLEET | src/router/routeModules/protectedAppRoutes.tsx | FleetPage | routed | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Fleet; Airworthy; Airworthy w/ Limitations; In Maintenance; Out of Service | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/fleet/page.tsx |
| RTC-0036 | /fleet/:tail | Fleet Aircraft Tail | page | CAT-FLEET | src/router/routeModules/protectedAppRoutes.tsx | AircraftDetailPage | routed | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | aircraft!.currentRegistration; Work Orders; Identification; Customer; Airworthy | Page includes explicit coming-soon/stub indicators; capability is partial. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/fleet/[tail]/page.tsx |
| RTC-0037 | /fleet/:tail/logbook | Fleet Aircraft Tail Logbook | page | CAT-FLEET | src/router/routeModules/protectedAppRoutes.tsx | AircraftLogbookPage | routed | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | tailNumber; Maintenance; Inspection; Correction | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/fleet/[tail]/logbook/page.tsx |
| RTC-0038 | /fleet/calendar | Fleet Calendar | page | CAT-FLEET | src/router/routeModules/protectedAppRoutes.tsx | FleetCalendarPage | routed | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Fleet Calendar; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/fleet/calendar/page.tsx |
| RTC-0039 | /fleet/predictions | Fleet Predictions | page | CAT-FLEET | src/router/routeModules/protectedAppRoutes.tsx | PredictionsPage | routed | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Fleet Predictions; Predictive Maintenance; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/fleet/predictions/page.tsx |
| RTC-0040 | /lead | Lead | page | CAT-LEAD | src/router/routeModules/protectedAppRoutes.tsx | LeadDashboardPage | routed | FS-0028, FS-0055 | MBP-0134, MBP-0139 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Lead Technician Workspace; My Team; Assignment Board; Team Capacity; Active WO Summary | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/lead/page.tsx |
| RTC-0041 | /my-work | My Work | page | CAT-MY-WORK | src/router/routeModules/protectedAppRoutes.tsx | MyWorkPage | routed | FS-0023, FS-0044, FS-0058 | MBP-0123, MBP-0142 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | My Work; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/my-work/page.tsx |
| RTC-0042 | /onboarding | Onboarding | page | CAT-ONBOARDING | src/router/routeModules/protectedAppRoutes.tsx | OnboardingPage | routed | FS-0041, FS-0069 | MBP-0105, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Onboarding; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/onboarding/page.tsx |
| RTC-0043 | /parts | Parts | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | PartsPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Parts; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/page.tsx |
| RTC-0044 | /parts/cores | Cores | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | CoresPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Cores Out; Value Outstanding; Overdue; Awaiting Return; Received | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/cores/page.tsx |
| RTC-0045 | /parts/inventory-count | Inventory Count | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | InventoryCountPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Inventory Count; countDetail.name; Inventory Counts | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/inventory-count/page.tsx |
| RTC-0046 | /parts/loaners | Loaners | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | LoanersPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Loaners; Rental / Loaner Tracking; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/loaners/page.tsx |
| RTC-0047 | /parts/new | New Part | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | NewPartPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Serviceable (used); Overhauled; Repaired | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/new/page.tsx |
| RTC-0048 | /parts/receiving | Part Receiving | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | PartsReceivingPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Part Receiving; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/receiving/page.tsx |
| RTC-0049 | /parts/requests | Part Requests | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | PartsRequestsPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Parts Queue; Pending Inspection; In Stock; Installed; Removed — Pending Disposition | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/requests/page.tsx |
| RTC-0050 | /parts/rotables | Rotables | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | RotablesPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Rotables; Rotable Components; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/rotables/page.tsx |
| RTC-0051 | /parts/shipping | Shipping | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | ShippingPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Open Receiving; Total; Pending; In Transit; Delivered | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/shipping/page.tsx |
| RTC-0052 | /parts/tools | Tools | page | CAT-PARTS | src/router/routeModules/protectedAppRoutes.tsx | ToolCribPage | routed | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Hand Tool; Power Tool; Test Equipment; Special Tooling; Consumable | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/tools/page.tsx |
| RTC-0053 | /personnel | Personnel | page | CAT-PERSONNEL | src/router/routeModules/protectedAppRoutes.tsx | PersonnelPage | routed | FS-0016, FS-0021 | MBP-0001, MBP-0134 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Personnel; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/personnel/page.tsx |
| RTC-0054 | /personnel/training | Training | page | CAT-PERSONNEL | src/router/routeModules/protectedAppRoutes.tsx | TrainingPage | routed | FS-0016, FS-0021 | MBP-0001, MBP-0134 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Training &amp; Qualifications; Initial; Recurrent; Regulatory; Safety | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/personnel/training/page.tsx |
| RTC-0055 | /portal | Portal | page | CAT-PORTAL | src/router/routeModules/customerPortalRoutes.tsx | CustomerDashboardPage | routed | FS-0010, FS-0062 | MBP-0019, MBP-0146 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | No customer account linked; Active Work Orders; Pending Quotes; Outstanding Invoices; Total Fleet | — | src/router/routeModules/customerPortalRoutes.tsx; app/(customer)/portal/page.tsx |
| RTC-0056 | /portal/fleet | Portal Fleet | page | CAT-PORTAL | src/router/routeModules/customerPortalRoutes.tsx | CustomerFleetPage | routed | FS-0010, FS-0062 | MBP-0019, MBP-0146 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Portal Fleet; My Fleet; Validation and error-state handling | — | src/router/routeModules/customerPortalRoutes.tsx; app/(customer)/portal/fleet/page.tsx |
| RTC-0057 | /portal/invoices | Portal Invoices | page | CAT-PORTAL | src/router/routeModules/customerPortalRoutes.tsx | CustomerInvoicesPage | routed | FS-0010, FS-0062 | MBP-0019, MBP-0146 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Portal Invoices; Invoices; invoice.invoiceNumber | — | src/router/routeModules/customerPortalRoutes.tsx; app/(customer)/portal/invoices/page.tsx |
| RTC-0058 | /portal/quotes | Portal Quotes | page | CAT-PORTAL | src/router/routeModules/customerPortalRoutes.tsx | CustomerQuotesPage | routed | FS-0010, FS-0062 | MBP-0019, MBP-0146 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Portal Quotes; Quotes; quote.quoteNumber | — | src/router/routeModules/customerPortalRoutes.tsx; app/(customer)/portal/quotes/page.tsx |
| RTC-0059 | /portal/work-orders | Portal Work Orders | page | CAT-PORTAL | src/router/routeModules/customerPortalRoutes.tsx | CustomerWorkOrdersPage | routed | FS-0010, FS-0062 | MBP-0019, MBP-0146 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders; detail.workOrderNumber; Received; Inspection; In Progress | — | src/router/routeModules/customerPortalRoutes.tsx; app/(customer)/portal/work-orders/page.tsx |
| RTC-0060 | /reports | Reports | page | CAT-REPORTS | src/router/routeModules/protectedAppRoutes.tsx | ReportsPage | routed | FS-0012, FS-0051 | MBP-0103, MBP-0137 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Monthly Revenue; WO Throughput; Revenue Summary Table | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/reports/page.tsx |
| RTC-0061 | /reports/financials | Reports Financials | page | CAT-REPORTS | src/router/routeModules/protectedAppRoutes.tsx | FinancialDashboardPage | routed | FS-0012, FS-0051 | MBP-0103, MBP-0137 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Financial Dashboard; Monthly Revenue — Last 12 Months; Gross Margin Trend; Revenue by Aircraft Type | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/reports/financials/page.tsx |
| RTC-0062 | /reports/financials/forecast | Reports Financials Forecast | page | CAT-REPORTS | src/router/routeModules/protectedAppRoutes.tsx | FinancialForecastPage | routed | FS-0012, FS-0051 | MBP-0103, MBP-0137 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Cash Flow Forecast; horizon-Month Revenue / Cost / Profit Projection; Monthly Cash Flow Detail | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/reports/financials/forecast/page.tsx |
| RTC-0063 | /reports/financials/profitability | Reports Financials Profitability | page | CAT-REPORTS | src/router/routeModules/protectedAppRoutes.tsx | FinancialProfitabilityPage | routed | FS-0012, FS-0051 | MBP-0103, MBP-0137 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Reports Financials Profitability; WO Profitability; Per-WO Profit &amp; Loss | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/reports/financials/profitability/page.tsx |
| RTC-0064 | /reports/financials/runway | Reports Financials Runway | page | CAT-REPORTS | src/router/routeModules/protectedAppRoutes.tsx | FinancialRunwayPage | routed | FS-0012, FS-0051 | MBP-0103, MBP-0137 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Reports Financials Runway; Business Runway; 12-Month Cash Position Projection | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/reports/financials/runway/page.tsx |
| RTC-0065 | /scheduling | Scheduling | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | SchedulingPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/page.tsx |
| RTC-0066 | /scheduling/bays | Scheduling Bays | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | BaysPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling Bays; Hangar Bays; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/bays/page.tsx |
| RTC-0067 | /scheduling/capacity | Scheduling Capacity | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | CapacityPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling Capacity; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/capacity/page.tsx |
| RTC-0068 | /scheduling/financial-planning | Scheduling Financial Planning | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | FinancialPlanningPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling Financial Planning; Assumptions; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/financial-planning/page.tsx |
| RTC-0069 | /scheduling/quotes | Scheduling Quote Workspace | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | SchedulingQuotesPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling Quote Workspace; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/quotes/page.tsx |
| RTC-0070 | /scheduling/roster | Scheduling Roster | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | SchedulingRosterPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Scheduling Roster; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/roster/page.tsx |
| RTC-0071 | /scheduling/seed-audit | Scheduling Seed Audit | page | CAT-SCHEDULING | src/router/routeModules/protectedAppRoutes.tsx | SeedAuditPage | routed | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Repair Station Seed Audit; Coverage Counts; Per-Location Scheduled Counts; Per-Location Tool Counts; Fleet Component Coverage | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/seed-audit/page.tsx |
| RTC-0072 | /settings/email-log | Settings Email Log | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | EmailLogPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Settings Email Log; Email Log; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/email-log/page.tsx |
| RTC-0073 | /settings/import | Settings Import | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | ImportPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Import Data; 2. Map columns; 3. Preview (csvRows.length rows) | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/import/page.tsx |
| RTC-0074 | /settings/locations | Settings Locations | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | ShopLocationsPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Part 145; Part 135; Part 121; Part 91 | Page includes explicit coming-soon/stub indicators; capability is partial. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/locations/page.tsx |
| RTC-0075 | /settings/notifications | Settings Notifications | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | NotificationPreferencesPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Notification Preferences; Notification Types; Work Order Status Changes; Task Assignments; Quote Approved | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/notifications/page.tsx |
| RTC-0076 | /settings/quickbooks | Settings QuickBooks | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | QuickBooksPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Sync Settings; Total Syncs; Pending; Synced; Failed | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/quickbooks/page.tsx |
| RTC-0077 | /settings/routing-templates | Settings Routing Templates | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | RoutingTemplatesPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Settings Routing Templates; Role-scoped action controls; Validation and error-state handling | Page includes explicit coming-soon/stub indicators; capability is partial. | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/routing-templates/page.tsx |
| RTC-0078 | /settings/shop | Settings Shop | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | ShopSettingsPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Eastern (ET) — America/New_York; Eastern (ET) — America/Detroit; Eastern (ET) — America/Indianapolis; Central (CT) — America/Chicago; Central (CT) — America/Menominee | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/shop/page.tsx |
| RTC-0079 | /settings/station-config | Settings Station Config | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | StationConfigPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Settings Station Config; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/station-config/page.tsx |
| RTC-0080 | /settings/users | Settings Users | page | CAT-SETTINGS | src/router/routeModules/protectedAppRoutes.tsx | UsersSettingsPage | routed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Settings Users; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/users/page.tsx |
| RTC-0081 | /sign-in/* | Sign In Wildcard | alias | CAT-AUTH | src/router/routeModules/authRoutes.tsx | app/(auth)/sign-in/[[...sign-in]]/page.tsx | routed | FS-0015, FS-0050 | MBP-0017, MBP-0108 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Sign In Wildcard; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/authRoutes.tsx; app/(auth)/sign-in/[[...sign-in]]/page.tsx |
| RTC-0082 | /sign-up/* | Sign Up Wildcard | alias | CAT-AUTH | src/router/routeModules/authRoutes.tsx | app/(auth)/sign-up/[[...sign-up]]/page.tsx | routed | FS-0015, FS-0050 | MBP-0017, MBP-0108 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Sign Up Wildcard; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/authRoutes.tsx; app/(auth)/sign-up/[[...sign-up]]/page.tsx |
| RTC-0083 | /squawks | Squawks | page | CAT-SQUAWKS | src/router/routeModules/protectedAppRoutes.tsx | SquawksPage | routed | FS-0024, FS-0060 | MBP-0041, MBP-0144 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Squawks & Discrepancies; Critical; Major; Minor; Observation | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/squawks/page.tsx |
| RTC-0084 | /work-orders | Work Orders | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WorkOrdersPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/page.tsx |
| RTC-0085 | /work-orders/:id | Work Orders Detail | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WorkOrderDetailPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | wo.workOrderNumber; Work Order Activity; Quoting; In-dock; Inspection | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/page.tsx |
| RTC-0086 | /work-orders/:id/certificates | Work Orders Detail Certificates | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | CertificatesPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056, FS-0061 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, MBP-0145 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Certificates; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/certificates/page.tsx |
| RTC-0087 | /work-orders/:id/execution | Work Orders Detail Execution | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WOExecutionPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Execution; workOrder.workOrderNumber — Execution Planning; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/execution/page.tsx |
| RTC-0088 | /work-orders/:id/records | Work Orders Detail Records | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | MaintenanceRecordsPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Annual; 100-Hour; Progressive; Conditional | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/records/page.tsx |
| RTC-0089 | /work-orders/:id/release | Work Orders Detail Release | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | ReleaseAircraftPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Release; Aircraft Released to Customer; Work Order Details | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/release/page.tsx |
| RTC-0090 | /work-orders/:id/rts | Work Orders Detail Rts | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | RtsPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Rts; Aircraft Returned to Service; Return-to-Service Already Authorized | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/rts/page.tsx |
| RTC-0091 | /work-orders/:id/signature | Work Orders Detail Signature | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | SignaturePage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Signature; Re-Authentication Required; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/signature/page.tsx |
| RTC-0092 | /work-orders/:id/tasks/:cardId | Work Orders Detail Tasks Task Card | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | TaskCardPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Tasks Task Card; taskCard.title; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx |
| RTC-0093 | /work-orders/:id/tasks/new | Work Orders Detail Tasks New | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | NewTaskCardPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Detail Tasks New; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/[id]/tasks/new/page.tsx |
| RTC-0094 | /work-orders/dashboard | Work Orders Dashboard | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WorkOrdersDashboardPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders Dashboard; Work Order Dashboard; Active Work Orders | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/dashboard/page.tsx |
| RTC-0095 | /work-orders/kanban | Work Order Kanban | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | KanbanPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Orders — Kanban; col.label; Draft; Open; In Progress | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/kanban/page.tsx |
| RTC-0096 | /work-orders/lead | Work Orders Lead | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WorkOrdersLeadPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Lead Workspace; Task Assignment Feed; Turnover Report Editor; Submitted History | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/lead/page.tsx |
| RTC-0097 | /work-orders/new | New Work Order | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | NewWorkOrderPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | New Work Order; Work Order Details; Priority | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/new/page.tsx |
| RTC-0098 | /work-orders/templates | Work Order Templates | page | CAT-WORK-ORDERS | src/router/routeModules/protectedAppRoutes.tsx | WorkOrderTemplatesPage | routed | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Work Order Templates; Role-scoped action controls; Validation and error-state handling | — | src/router/routeModules/protectedAppRoutes.tsx; app/(app)/work-orders/templates/page.tsx |
| RTC-0099 | * | App Not Found Catch-All | catch_all | CAT-SYSTEM | src/router/routeModules/protectedAppRoutes.tsx | AppNotFoundPage | router_only | FS-0053, FS-0069 | MBP-0133, MBP-0153 | implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | App Not Found Catch-All; Role-scoped access flow; State transition controls | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. | src/router/routeModules/protectedAppRoutes.tsx |
| RTC-0100 | /billing/quotes/templates | Billing Quotes Templates | page | CAT-BILLING | app/(app)/billing/quotes/templates/page.tsx | app/(app)/billing/quotes/templates/page.tsx | orphan_page | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Billing Quotes Templates; Quote Templates; t.name | Page exists in filesystem but is not wired in route modules. | app/(app)/billing/quotes/templates/page.tsx |
| RTC-0101 | /not-found | Not Found | page | CAT-SYSTEM | app/(app)/not-found/page.tsx | app/(app)/not-found/page.tsx | orphan_page | FS-0053, FS-0069 | MBP-0133, MBP-0153 | partially_implemented | doc_reviewed | 2026-03-04T00:00:00Z | master-spec-expansion-agent | Not Found; Role-scoped action controls; Validation and error-state handling | Page exists in filesystem but is not wired in route modules. | app/(app)/not-found/page.tsx |

## Registry D — Route Category Rollup (17)

| route_category_id | category_name | route_count | mapped_fs_ids | mapped_mbp_ids | coverage_state | uncovered_route_ids | notes |
|---|---|---|---|---|---|---|---|
| CAT-AUTH | Authentication & Session Boundaries | 2 | FS-0015, FS-0050 | MBP-0017, MBP-0108 | complete | — | routed=2; router_only=0; orphan_page=0 |
| CAT-BILLING | Billing, AR, and Commercial Operations | 29 | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | complete | — | routed=27; router_only=1; orphan_page=1 |
| CAT-COMPLIANCE | Compliance and Regulatory Traceability | 5 | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | complete | — | routed=4; router_only=1; orphan_page=0 |
| CAT-DASHBOARD | Operational Dashboard Surfaces | 1 | FS-0012, FS-0026 | MBP-0056, MBP-0057 | complete | — | routed=1; router_only=0; orphan_page=0 |
| CAT-FLEET | Fleet Planning and Aircraft State | 5 | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | complete | — | routed=5; router_only=0; orphan_page=0 |
| CAT-LEAD | Lead Workspace and Shift Handoffs | 1 | FS-0028, FS-0055 | MBP-0134, MBP-0139 | complete | — | routed=1; router_only=0; orphan_page=0 |
| CAT-MY-WORK | Technician Execution Workspace | 1 | FS-0023, FS-0044, FS-0058 | MBP-0123, MBP-0142 | complete | — | routed=1; router_only=0; orphan_page=0 |
| CAT-ONBOARDING | Organization Onboarding | 1 | FS-0041, FS-0069 | MBP-0105, MBP-0153 | complete | — | routed=1; router_only=0; orphan_page=0 |
| CAT-PARTS | Parts and Materials Operations | 10 | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | complete | — | routed=10; router_only=0; orphan_page=0 |
| CAT-PERSONNEL | Personnel and Training | 2 | FS-0016, FS-0021 | MBP-0001, MBP-0134 | complete | — | routed=2; router_only=0; orphan_page=0 |
| CAT-PORTAL | Customer Portal | 5 | FS-0010, FS-0062 | MBP-0019, MBP-0146 | complete | — | routed=5; router_only=0; orphan_page=0 |
| CAT-REPORTS | Reporting and Financial Analytics | 5 | FS-0012, FS-0051 | MBP-0103, MBP-0137 | complete | — | routed=5; router_only=0; orphan_page=0 |
| CAT-SCHEDULING | Scheduling and Capacity Planning | 7 | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | complete | — | routed=7; router_only=0; orphan_page=0 |
| CAT-SETTINGS | System Settings and Governance | 9 | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | complete | — | routed=9; router_only=0; orphan_page=0 |
| CAT-SQUAWKS | Squawk Intake and Discrepancy Intake | 1 | FS-0024, FS-0060 | MBP-0041, MBP-0144 | complete | — | routed=1; router_only=0; orphan_page=0 |
| CAT-SYSTEM | System and Fallback Routes | 2 | FS-0053, FS-0069 | MBP-0133, MBP-0153 | complete | — | routed=0; router_only=1; orphan_page=1 |
| CAT-WORK-ORDERS | Work Order Lifecycle Execution | 15 | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056, FS-0061 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, MBP-0145 | complete | — | routed=15; router_only=0; orphan_page=0 |

## Application Page + Subpage Atlas (Derived)

This section is a page-first view of every routed page and subpage in the application, with context joined from the feature list in Registry A and route mappings in Registry C.

Scope and method:
1. Source routes: Registry C (`RTC-0001` through `RTC-0101`).
2. Feature context: Registry A (`FS-*`) names resolved from each route's `mapped_fs_ids`.
3. Work package context: Registry B (`MBP-*`) references from each route's `mapped_mbp_ids`.

### CAT-AUTH — Authentication & Session Boundaries (2 routes)

Category feature context: FS-0015 Role Management Admin UI; FS-0050 Field-Level Visibility/Edit Policy Controls.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/sign-in/*` | Sign In Wildcard | system | `alias` / `routed` | Sign In Wildcard; Role-scoped action controls; Validation and error-state handling | FS-0015, FS-0050 | MBP-0017, MBP-0108 | `partially_implemented` | `doc_reviewed` | — |
| `/sign-up/*` | Sign Up Wildcard | system | `alias` / `routed` | Sign Up Wildcard; Role-scoped action controls; Validation and error-state handling | FS-0015, FS-0050 | MBP-0017, MBP-0108 | `partially_implemented` | `doc_reviewed` | — |

### CAT-BILLING — Billing, AR, and Commercial Operations (29 routes)

Category feature context: FS-0007 Pricing Rules — Auto-Application; FS-0008 Tax Calculation; FS-0032 QuickBooks Integration; FS-0062 Customer Account CRM & Profile Ledger; FS-0063 AR, Deposits, and Credit Memo Controls; FS-0064 Procurement and Vendor Operations; FS-0065 Recurring Billing Contract Engine; FS-0066 Labor Kit and Quote Template Library.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/billing` | Billing | root | `redirect` / `router_only` | Billing; Role-scoped access flow; State transition controls | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `implemented` | `doc_reviewed` | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. |
| `/billing/analytics` | Billing Analytics | subpage | `page` / `routed` | Billing Analytics; Monthly Revenue — Last 6 Months; Revenue by Month; AR Aging; Top Customers by Collected Revenue | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/ar-dashboard` | AR Dashboard | subpage | `page` / `routed` | AR Dashboard; Customer Balances; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/credit-memos` | Credit Memos | subpage | `page` / `routed` | Credit Memos; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/customers` | Customers | subpage | `page` / `routed` | Customers; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/customers/:id` | Billing Customers Detail | deep-subpage | `page` / `routed` | customer?.name; Customer Information; Quotes; Invoices; Payment History | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/deposits` | Deposits | subpage | `page` / `routed` | Deposits; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/invoices` | Invoices | subpage | `page` / `routed` | Invoices; Cash; Check; Credit Card; Wire Transfer | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/invoices/:id` | Billing Invoices Detail | deep-subpage | `page` / `routed` | invoice.invoiceNumber; Invoice invoice.invoiceNumber; Invoice Summary; Line Items; Payment History | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/invoices/new` | Billing Invoices New | deep-subpage | `page` / `routed` | New Invoice; Invoice Source; Invoice Details; Tax Rate | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/labor-kits` | Labor Kits | subpage | `page` / `routed` | Labor Kits; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/otc` | OTC Sales | subpage | `page` / `routed` | Counter Sales; Add Items; Cart (cart.length itemcart.length !== 1 ? "s" : ""); Payment; Sales History | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/pricing` | Pricing | subpage | `page` / `routed` | Pricing; Pricing Profiles; Pricing Rules | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/purchase-orders` | Purchase Orders | subpage | `page` / `routed` | Purchase Orders; Draft; Submitted; Partial; Received | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/purchase-orders/:id` | Billing Purchase Orders Detail | deep-subpage | `page` / `routed` | po.poNumber; PO Summary; Line Items | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/purchase-orders/new` | Billing Purchase Orders New | deep-subpage | `page` / `routed` | New Purchase Order; PO Details; Line Items | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/quotes` | Quotes | subpage | `page` / `routed` | Quotes; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/quotes/:id` | Billing Quotes Detail | deep-subpage | `page` / `routed` | Billing Quotes Detail; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/quotes/new` | Billing Quotes New | deep-subpage | `page` / `routed` | Billing Quotes New; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/recurring` | Recurring | subpage | `page` / `routed` | Recurring; Recurring Billing; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/settings` | Billing Settings | subpage | `page` / `routed` | Billing Settings; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | Page includes explicit coming-soon/stub indicators; capability is partial. |
| `/billing/tax-config` | Tax Config | subpage | `page` / `routed` | Tax Config; Tax Configuration; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/time-approval` | Time Approval | subpage | `page` / `routed` | Time Approval; Time Clock Approval; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/time-clock` | Time Clock | subpage | `page` / `routed` | Time Clock; Today&apos;s Summary; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/vendors` | Vendors | subpage | `page` / `routed` | Vendors; Role-scoped action controls; Validation and error-state handling | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/vendors/:id` | Billing Vendors Detail | deep-subpage | `page` / `routed` | vendor.name; Services; Contact Information; Certification; Purchase Order History | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/vendors/new` | Billing Vendors New | deep-subpage | `page` / `routed` | New Vendor; Vendor Information; Contact Information; Certification; Parts Supplier | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/warranty` | Warranty | subpage | `page` / `routed` | Total Claims; Draft; Submitted; Under Review; Approved | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | — |
| `/billing/quotes/templates` | Billing Quotes Templates | deep-subpage | `page` / `orphan_page` | Billing Quotes Templates; Quote Templates; t.name | FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 | MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150 | `partially_implemented` | `doc_reviewed` | Page exists in filesystem but is not wired in route modules. |

### CAT-COMPLIANCE — Compliance and Regulatory Traceability (5 routes)

Category feature context: FS-0020 AD/SB Fleet Compliance Dashboard; FS-0030 Conformity Inspection; FS-0061 Certificate Field Normalization Pipeline.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/compliance` | Compliance | root | `page` / `routed` | Compliance; Fleet AD Compliance Status; Compliance Tools | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | `partially_implemented` | `doc_reviewed` | — |
| `/compliance/ad-sb` | AD/SB | subpage | `page` / `routed` | AD/SB; Role-scoped action controls; Validation and error-state handling | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | `partially_implemented` | `doc_reviewed` | — |
| `/compliance/audit-trail` | Audit Trail | subpage | `page` / `routed` | Audit Trail; Airworthiness Directives — aircraftRegistration; Validation and error-state handling | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | `partially_implemented` | `doc_reviewed` | — |
| `/compliance/certificates` | Compliance Certificates | subpage | `redirect` / `router_only` | Compliance Certificates; Role-scoped access flow; State transition controls | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | `implemented` | `doc_reviewed` | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. |
| `/compliance/qcm-review` | QCM Review | subpage | `page` / `routed` | QCM Review; IA Sign-Off Queue; Validation and error-state handling | FS-0020, FS-0030, FS-0061 | MBP-0011, MBP-0117, MBP-0145 | `partially_implemented` | `doc_reviewed` | — |

### CAT-DASHBOARD — Operational Dashboard Surfaces (1 routes)

Category feature context: FS-0012 Reports & Analytics Dashboard; FS-0026 Dashboard KPIs.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard | root | `page` / `routed` | Dashboard; Active Work Orders; AOG Aircraft; Overdue ADs; Open Discrepancies | FS-0012, FS-0026 | MBP-0056, MBP-0057 | `partially_implemented` | `doc_reviewed` | — |

### CAT-FLEET — Fleet Planning and Aircraft State (5 routes)

Category feature context: FS-0020 AD/SB Fleet Compliance Dashboard; FS-0029 Fleet Calendar Enhancements; FS-0035 AI Predictive Maintenance.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/fleet` | Fleet | root | `page` / `routed` | Fleet; Airworthy; Airworthy w/ Limitations; In Maintenance; Out of Service | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | `partially_implemented` | `doc_reviewed` | — |
| `/fleet/:tail` | Fleet Aircraft Tail | subpage | `page` / `routed` | aircraft!.currentRegistration; Work Orders; Identification; Customer; Airworthy | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | `partially_implemented` | `doc_reviewed` | Page includes explicit coming-soon/stub indicators; capability is partial. |
| `/fleet/:tail/logbook` | Fleet Aircraft Tail Logbook | deep-subpage | `page` / `routed` | tailNumber; Maintenance; Inspection; Correction | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | `partially_implemented` | `doc_reviewed` | — |
| `/fleet/calendar` | Fleet Calendar | subpage | `page` / `routed` | Fleet Calendar; Role-scoped action controls; Validation and error-state handling | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | `partially_implemented` | `doc_reviewed` | — |
| `/fleet/predictions` | Fleet Predictions | subpage | `page` / `routed` | Fleet Predictions; Predictive Maintenance; Validation and error-state handling | FS-0020, FS-0029, FS-0035 | MBP-0009, MBP-0047, MBP-0126 | `partially_implemented` | `doc_reviewed` | — |

### CAT-LEAD — Lead Workspace and Shift Handoffs (1 routes)

Category feature context: FS-0028 Handoff Notes; FS-0055 Lead Technician Execution Safety Orchestrator.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/lead` | Lead | root | `page` / `routed` | Lead Technician Workspace; My Team; Assignment Board; Team Capacity; Active WO Summary | FS-0028, FS-0055 | MBP-0134, MBP-0139 | `partially_implemented` | `doc_reviewed` | — |

### CAT-MY-WORK — Technician Execution Workspace (1 routes)

Category feature context: FS-0023 Work Order Close Readiness; FS-0044 Work Order Routing Templates + Standard Minutes; FS-0058 My Work Assignment Consistency Controls.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/my-work` | My Work | root | `page` / `routed` | My Work; Role-scoped action controls; Validation and error-state handling | FS-0023, FS-0044, FS-0058 | MBP-0123, MBP-0142 | `partially_implemented` | `doc_reviewed` | — |

### CAT-ONBOARDING — Organization Onboarding (1 routes)

Category feature context: FS-0041 Policy Enforcement Engine; FS-0069 Station Configuration and Org Governance Console.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/onboarding` | Onboarding | root | `page` / `routed` | Onboarding; Role-scoped action controls; Validation and error-state handling | FS-0041, FS-0069 | MBP-0105, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |

### CAT-PARTS — Parts and Materials Operations (10 routes)

Category feature context: FS-0019 Tool Crib Management; FS-0052 Part Lineage Drilldown Explorer; FS-0067 Parts Logistics Operations (Shipping, Loaners, Core Flow).

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/parts` | Parts | root | `page` / `routed` | Parts; Role-scoped action controls; Validation and error-state handling | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/cores` | Cores | subpage | `page` / `routed` | Cores Out; Value Outstanding; Overdue; Awaiting Return; Received | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/inventory-count` | Inventory Count | subpage | `page` / `routed` | Inventory Count; countDetail.name; Inventory Counts | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/loaners` | Loaners | subpage | `page` / `routed` | Loaners; Rental / Loaner Tracking; Validation and error-state handling | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/new` | New Part | subpage | `page` / `routed` | Serviceable (used); Overhauled; Repaired | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/receiving` | Part Receiving | subpage | `page` / `routed` | Part Receiving; Role-scoped action controls; Validation and error-state handling | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/requests` | Part Requests | subpage | `page` / `routed` | Parts Queue; Pending Inspection; In Stock; Installed; Removed — Pending Disposition | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/rotables` | Rotables | subpage | `page` / `routed` | Rotables; Rotable Components; Validation and error-state handling | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/shipping` | Shipping | subpage | `page` / `routed` | Open Receiving; Total; Pending; In Transit; Delivered | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |
| `/parts/tools` | Tools | subpage | `page` / `routed` | Hand Tool; Power Tool; Test Equipment; Special Tooling; Consumable | FS-0019, FS-0052, FS-0067 | MBP-0020, MBP-0122, MBP-0151 | `partially_implemented` | `doc_reviewed` | — |

### CAT-PERSONNEL — Personnel and Training (2 routes)

Category feature context: FS-0016 Training & Qualifications Mgmt; FS-0021 Overtime / Shift Management.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/personnel` | Personnel | root | `page` / `routed` | Personnel; Role-scoped action controls; Validation and error-state handling | FS-0016, FS-0021 | MBP-0001, MBP-0134 | `partially_implemented` | `doc_reviewed` | — |
| `/personnel/training` | Training | subpage | `page` / `routed` | Training &amp; Qualifications; Initial; Recurrent; Regulatory; Safety | FS-0016, FS-0021 | MBP-0001, MBP-0134 | `partially_implemented` | `doc_reviewed` | — |

### CAT-PORTAL — Customer Portal (5 routes)

Category feature context: FS-0010 Customer Portal (ServiceEdge equivalent); FS-0062 Customer Account CRM & Profile Ledger.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/portal` | Portal | root | `page` / `routed` | No customer account linked; Active Work Orders; Pending Quotes; Outstanding Invoices; Total Fleet | FS-0010, FS-0062 | MBP-0019, MBP-0146 | `partially_implemented` | `doc_reviewed` | — |
| `/portal/fleet` | Portal Fleet | subpage | `page` / `routed` | Portal Fleet; My Fleet; Validation and error-state handling | FS-0010, FS-0062 | MBP-0019, MBP-0146 | `partially_implemented` | `doc_reviewed` | — |
| `/portal/invoices` | Portal Invoices | subpage | `page` / `routed` | Portal Invoices; Invoices; invoice.invoiceNumber | FS-0010, FS-0062 | MBP-0019, MBP-0146 | `partially_implemented` | `doc_reviewed` | — |
| `/portal/quotes` | Portal Quotes | subpage | `page` / `routed` | Portal Quotes; Quotes; quote.quoteNumber | FS-0010, FS-0062 | MBP-0019, MBP-0146 | `partially_implemented` | `doc_reviewed` | — |
| `/portal/work-orders` | Portal Work Orders | subpage | `page` / `routed` | Work Orders; detail.workOrderNumber; Received; Inspection; In Progress | FS-0010, FS-0062 | MBP-0019, MBP-0146 | `partially_implemented` | `doc_reviewed` | — |

### CAT-REPORTS — Reporting and Financial Analytics (5 routes)

Category feature context: FS-0012 Reports & Analytics Dashboard; FS-0051 Operational Report Builder + Scheduled Report Runs.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/reports` | Reports | root | `page` / `routed` | Monthly Revenue; WO Throughput; Revenue Summary Table | FS-0012, FS-0051 | MBP-0103, MBP-0137 | `partially_implemented` | `doc_reviewed` | — |
| `/reports/financials` | Reports Financials | subpage | `page` / `routed` | Financial Dashboard; Monthly Revenue — Last 12 Months; Gross Margin Trend; Revenue by Aircraft Type | FS-0012, FS-0051 | MBP-0103, MBP-0137 | `partially_implemented` | `doc_reviewed` | — |
| `/reports/financials/forecast` | Reports Financials Forecast | deep-subpage | `page` / `routed` | Cash Flow Forecast; horizon-Month Revenue / Cost / Profit Projection; Monthly Cash Flow Detail | FS-0012, FS-0051 | MBP-0103, MBP-0137 | `partially_implemented` | `doc_reviewed` | — |
| `/reports/financials/profitability` | Reports Financials Profitability | deep-subpage | `page` / `routed` | Reports Financials Profitability; WO Profitability; Per-WO Profit &amp; Loss | FS-0012, FS-0051 | MBP-0103, MBP-0137 | `partially_implemented` | `doc_reviewed` | — |
| `/reports/financials/runway` | Reports Financials Runway | deep-subpage | `page` / `routed` | Reports Financials Runway; Business Runway; 12-Month Cash Position Projection | FS-0012, FS-0051 | MBP-0103, MBP-0137 | `partially_implemented` | `doc_reviewed` | — |

### CAT-SCHEDULING — Scheduling and Capacity Planning (7 routes)

Category feature context: FS-0013 Scheduling — Drag-Drop Gantt; FS-0014 Scheduling — Auto-Schedule; FS-0068 Scheduling Roster and Crew Coordination.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/scheduling` | Scheduling | root | `page` / `routed` | Scheduling; Role-scoped action controls; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/bays` | Scheduling Bays | subpage | `page` / `routed` | Scheduling Bays; Hangar Bays; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/capacity` | Scheduling Capacity | subpage | `page` / `routed` | Scheduling Capacity; Role-scoped action controls; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/financial-planning` | Scheduling Financial Planning | subpage | `page` / `routed` | Scheduling Financial Planning; Assumptions; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/quotes` | Scheduling Quote Workspace | subpage | `page` / `routed` | Scheduling Quote Workspace; Role-scoped action controls; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/roster` | Scheduling Roster | subpage | `page` / `routed` | Scheduling Roster; Role-scoped action controls; Validation and error-state handling | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |
| `/scheduling/seed-audit` | Scheduling Seed Audit | subpage | `page` / `routed` | Repair Station Seed Audit; Coverage Counts; Per-Location Scheduled Counts; Per-Location Tool Counts; Fleet Component Coverage | FS-0013, FS-0014, FS-0068 | MBP-0110, MBP-0114, MBP-0152 | `partially_implemented` | `doc_reviewed` | — |

### CAT-SETTINGS — System Settings and Governance (9 routes)

Category feature context: FS-0015 Role Management Admin UI; FS-0053 Zero-Downtime Migration Control Plane; FS-0069 Station Configuration and Org Governance Console.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/settings/email-log` | Settings Email Log | subpage | `page` / `routed` | Settings Email Log; Email Log; Validation and error-state handling | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/import` | Settings Import | subpage | `page` / `routed` | Import Data; 2. Map columns; 3. Preview (csvRows.length rows) | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/locations` | Settings Locations | subpage | `page` / `routed` | Part 145; Part 135; Part 121; Part 91 | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | Page includes explicit coming-soon/stub indicators; capability is partial. |
| `/settings/notifications` | Settings Notifications | subpage | `page` / `routed` | Notification Preferences; Notification Types; Work Order Status Changes; Task Assignments; Quote Approved | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/quickbooks` | Settings QuickBooks | subpage | `page` / `routed` | Sync Settings; Total Syncs; Pending; Synced; Failed | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/routing-templates` | Settings Routing Templates | subpage | `page` / `routed` | Settings Routing Templates; Role-scoped action controls; Validation and error-state handling | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | Page includes explicit coming-soon/stub indicators; capability is partial. |
| `/settings/shop` | Settings Shop | subpage | `page` / `routed` | Eastern (ET) — America/New_York; Eastern (ET) — America/Detroit; Eastern (ET) — America/Indianapolis; Central (CT) — America/Chicago; Central (CT) — America/Menominee | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/station-config` | Settings Station Config | subpage | `page` / `routed` | Settings Station Config; Role-scoped action controls; Validation and error-state handling | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |
| `/settings/users` | Settings Users | subpage | `page` / `routed` | Settings Users; Role-scoped action controls; Validation and error-state handling | FS-0015, FS-0053, FS-0069 | MBP-0106, MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | — |

### CAT-SQUAWKS — Squawk Intake and Discrepancy Intake (1 routes)

Category feature context: FS-0024 Squawk Board Enhancements; FS-0060 Squawk Escalation and Handoff Safeguards.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/squawks` | Squawks | root | `page` / `routed` | Squawks & Discrepancies; Critical; Major; Minor; Observation | FS-0024, FS-0060 | MBP-0041, MBP-0144 | `partially_implemented` | `doc_reviewed` | — |

### CAT-SYSTEM — System and Fallback Routes (2 routes)

Category feature context: FS-0053 Zero-Downtime Migration Control Plane; FS-0069 Station Configuration and Org Governance Console.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `*` | App Not Found Catch-All | system | `catch_all` / `router_only` | App Not Found Catch-All; Role-scoped access flow; State transition controls | FS-0053, FS-0069 | MBP-0133, MBP-0153 | `implemented` | `doc_reviewed` | Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed. |
| `/not-found` | Not Found | root | `page` / `orphan_page` | Not Found; Role-scoped action controls; Validation and error-state handling | FS-0053, FS-0069 | MBP-0133, MBP-0153 | `partially_implemented` | `doc_reviewed` | Page exists in filesystem but is not wired in route modules. |

### CAT-WORK-ORDERS — Work Order Lifecycle Execution (15 routes)

Category feature context: FS-0023 Work Order Close Readiness; FS-0044 Work Order Routing Templates + Standard Minutes; FS-0054 Task Card Compliance Save Guardrail; FS-0055 Lead Technician Execution Safety Orchestrator; FS-0056 Task Card Authoring Validation Controls; FS-0061 Certificate Field Normalization Pipeline.

| Route | Page Label | Page Level | Kind / Source Status | Key Contextual Behaviors | FS Links | MBP Links | Implementation | Verification | Gap Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/work-orders` | Work Orders | root | `page` / `routed` | Work Orders; Role-scoped action controls; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id` | Work Orders Detail | subpage | `page` / `routed` | wo.workOrderNumber; Work Order Activity; Quoting; In-dock; Inspection | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/certificates` | Work Orders Detail Certificates | deep-subpage | `page` / `routed` | Work Orders Detail Certificates; Role-scoped action controls; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056, FS-0061 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, MBP-0145 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/execution` | Work Orders Detail Execution | deep-subpage | `page` / `routed` | Work Orders Detail Execution; workOrder.workOrderNumber — Execution Planning; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/records` | Work Orders Detail Records | deep-subpage | `page` / `routed` | Annual; 100-Hour; Progressive; Conditional | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/release` | Work Orders Detail Release | deep-subpage | `page` / `routed` | Work Orders Detail Release; Aircraft Released to Customer; Work Order Details | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/rts` | Work Orders Detail Rts | deep-subpage | `page` / `routed` | Work Orders Detail Rts; Aircraft Returned to Service; Return-to-Service Already Authorized | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/signature` | Work Orders Detail Signature | deep-subpage | `page` / `routed` | Work Orders Detail Signature; Re-Authentication Required; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/tasks/:cardId` | Work Orders Detail Tasks Task Card | deep-subpage | `page` / `routed` | Work Orders Detail Tasks Task Card; taskCard.title; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/:id/tasks/new` | Work Orders Detail Tasks New | deep-subpage | `page` / `routed` | Work Orders Detail Tasks New; Role-scoped action controls; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/dashboard` | Work Orders Dashboard | subpage | `page` / `routed` | Work Orders Dashboard; Work Order Dashboard; Active Work Orders | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/kanban` | Work Order Kanban | subpage | `page` / `routed` | Work Orders — Kanban; col.label; Draft; Open; In Progress | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/lead` | Work Orders Lead | subpage | `page` / `routed` | Lead Workspace; Task Assignment Feed; Turnover Report Editor; Submitted History | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/new` | New Work Order | subpage | `page` / `routed` | New Work Order; Work Order Details; Priority | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |
| `/work-orders/templates` | Work Order Templates | subpage | `page` / `routed` | Work Order Templates; Role-scoped action controls; Validation and error-state handling | FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 | MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140 | `partially_implemented` | `doc_reviewed` | — |


## Feature Narrative Specifications

### FS-0001 — Dual Sign-off (Tech + Inspector)

FS-0001 defines the technical contract for Dual Sign-off (Tech + Inspector) across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-005, BUG-LT-001, BUG-LT-003, BUG-LT-HUNT-001, BUG-LT3-001; QA=GAP-18, GAP-22. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0001 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0002 — PDF Generation — Invoices

FS-0002 defines the technical contract for PDF Generation — Invoices across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0002 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0003 — PDF Generation — Quotes

FS-0003 defines the technical contract for PDF Generation — Quotes across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0003 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0004 — PDF Generation — RTS / 8610-2

FS-0004 defines the technical contract for PDF Generation — RTS / 8610-2 across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-07. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0004 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0005 — PDF Generation — Work Order Pack

FS-0005 defines the technical contract for PDF Generation — Work Order Pack across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0005 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0006 — Email / Notifications System

FS-0006 defines the technical contract for Email / Notifications System across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-02, GAP-20, GAP-24. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0006 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0007 — Pricing Rules — Auto-Application

FS-0007 defines the technical contract for Pricing Rules — Auto-Application across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-031; QA=GAP-11, GAP-15. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0007 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0008 — Tax Calculation

FS-0008 defines the technical contract for Tax Calculation across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-033; QA=GAP-03, GAP-16. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0008 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0009 — Document Upload / Attachments

FS-0009 defines the technical contract for Document Upload / Attachments across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-16. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0009 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0010 — Customer Portal (ServiceEdge equivalent)

FS-0010 defines the technical contract for Customer Portal (ServiceEdge equivalent) across CAT-PORTAL. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-23. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0010 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0011 — Barcoding / QR Scanning

FS-0011 defines the technical contract for Barcoding / QR Scanning across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0011 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0012 — Reports & Analytics Dashboard

FS-0012 defines the technical contract for Reports & Analytics Dashboard across CAT-DASHBOARD, CAT-REPORTS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is backend_needed with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BACKEND-NEEDED-SM-01, BUG-007, BUG-011, BUG-012, BUG-013 +…; QA=GAP-04, GAP-05, GAP-07, GAP-10, GAP-13 +…. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0012 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0013 — Scheduling — Drag-Drop Gantt

FS-0013 defines the technical contract for Scheduling — Drag-Drop Gantt across CAT-SCHEDULING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-SM-HUNT-002; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0013 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0014 — Scheduling — Auto-Schedule

FS-0014 defines the technical contract for Scheduling — Auto-Schedule across CAT-SCHEDULING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0014 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0015 — Role Management Admin UI

FS-0015 defines the technical contract for Role Management Admin UI across CAT-AUTH, CAT-SETTINGS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is implemented with verification at qa_verified. The latest review timestamp is 2026-03-04T04:05:06Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0015 is to close all linked atomic work items (MBP-0017, MBP-0105, MBP-0106, MBP-0107, MBP-0108, MBP-0109) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0016 — Training & Qualifications Mgmt

FS-0016 defines the technical contract for Training & Qualifications Mgmt across CAT-PERSONNEL. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-DOM-5, BUG-DOM-6, BUG-DOM-7, BUG-DOM-9; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0016 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0017 — Multi-Location Cross-Site UI

FS-0017 defines the technical contract for Multi-Location Cross-Site UI across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0017 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0018 — Warranty Management

FS-0018 defines the technical contract for Warranty Management across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0018 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0019 — Tool Crib Management

FS-0019 defines the technical contract for Tool Crib Management across CAT-PARTS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-PC-002; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0019 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0020 — AD/SB Fleet Compliance Dashboard

FS-0020 defines the technical contract for AD/SB Fleet Compliance Dashboard across CAT-COMPLIANCE, CAT-FLEET. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BH-004, BH-005, BH-006, BH-007, BUG-015 +…; QA=GAP-01. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0020 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0021 — Overtime / Shift Management

FS-0021 defines the technical contract for Overtime / Shift Management across CAT-PERSONNEL. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-16, GAP-20. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0021 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0022 — Discrepancy Disposition Workflow

FS-0022 defines the technical contract for Discrepancy Disposition Workflow across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-003, BUG-006, BUG-DOM-12; QA=FEAT-LARGE-003, FEAT-LARGE-005, GAP-04, GAP-07, GAP-24. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0022 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0023 — Work Order Close Readiness

FS-0023 defines the technical contract for Work Order Close Readiness across CAT-MY-WORK, CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at unreviewed. The latest review timestamp is 2026-03-04T04:43:13Z and evidence currently points to BugHunter=BH-LT3-001, BH-LT3-002, BUG-001, BUG-002, BUG-031 +…; QA=FEAT-LARGE-001, GAP-06, GAP-09, GAP-10, GAP-11 +…; derived_from=MBP-0014,MBP-0015,MBP-0039,MBP-0040,MBP-0041,MBP-0042,MBP-0123,MBP-0124,MBP-0125,MBP-0127,MBP-0134,MBP-0136. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0023 is to close all linked atomic work items (MBP-0014, MBP-0015, MBP-0039, MBP-0040, MBP-0041, MBP-0042, MBP-0123, MBP-0124) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0024 — Squawk Board Enhancements

FS-0024 defines the technical contract for Squawk Board Enhancements across CAT-SQUAWKS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-05. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0024 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0025 — Search — Global Search

FS-0025 defines the technical contract for Search — Global Search across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BH-002; QA=GAP-21. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0025 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0026 — Dashboard KPIs

FS-0026 defines the technical contract for Dashboard KPIs across CAT-DASHBOARD. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-SM-012, BUG-SM-HUNT-001; QA=GAP-21, TD-004, TD-016. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0026 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0027 — Kanban — Drag-Drop

FS-0027 defines the technical contract for Kanban — Drag-Drop across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-SM-004; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0027 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0028 — Handoff Notes

FS-0028 defines the technical contract for Handoff Notes across CAT-LEAD. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-LT-HUNT-004, BUG-LT-HUNT-005; QA=FEAT-LARGE-006. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0028 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0029 — Fleet Calendar Enhancements

FS-0029 defines the technical contract for Fleet Calendar Enhancements across CAT-FLEET. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BUG-016, BUG-020, BUG-021, BUG-022, BUG-DOM-001 +…; QA=FEAT-LARGE-002, TD-006. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0029 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0030 — Conformity Inspection

FS-0030 defines the technical contract for Conformity Inspection across CAT-COMPLIANCE. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-15. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0030 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0031 — CAMP Connect Integration

FS-0031 defines the technical contract for CAMP Connect Integration across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0031 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0032 — QuickBooks Integration

FS-0032 defines the technical contract for QuickBooks Integration across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=FEAT-110, FEAT-LARGE-007, GAP-22. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0032 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0033 — Multi-Currency

FS-0033 defines the technical contract for Multi-Currency across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0033 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0034 — ILS Parts Marketplace

FS-0034 defines the technical contract for ILS Parts Marketplace across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0034 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0035 — AI Predictive Maintenance

FS-0035 defines the technical contract for AI Predictive Maintenance across CAT-FLEET. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0035 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0036 — eCommerce / Parts Sales

FS-0036 defines the technical contract for eCommerce / Parts Sales across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0036 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0037 — Vertex Tax Integration

FS-0037 defines the technical contract for Vertex Tax Integration across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0037 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0038 — UPS WorldShip Integration

FS-0038 defines the technical contract for UPS WorldShip Integration across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0038 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0039 — FBO Line Sales

FS-0039 defines the technical contract for FBO Line Sales across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0039 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0040 — Native Mobile App

FS-0040 defines the technical contract for Native Mobile App across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=GAP-19. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0040 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0041 — Policy Enforcement Engine

FS-0041 defines the technical contract for Policy Enforcement Engine across CAT-ONBOARDING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at unreviewed. The latest review timestamp is 2026-03-04T04:05:06Z and evidence currently points to BugHunter=None; QA=GAP-25, ISSUE-001, ISSUE-002, ISSUE-003, TD-002 +…; derived_from=MBP-0003,MBP-0004,MBP-0011,MBP-0017,MBP-0018,MBP-0033,MBP-0054,MBP-0055,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0041 is to close all linked atomic work items (MBP-0003, MBP-0004, MBP-0011, MBP-0017, MBP-0018, MBP-0033, MBP-0054, MBP-0055) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0042 — Immutable Record Locks & Compliance Holds

FS-0042 defines the technical contract for Immutable Record Locks & Compliance Holds across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at unreviewed. The latest review timestamp is 2026-03-04T04:38:57Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0018,MBP-0045,MBP-0054,MBP-0063,MBP-0064,MBP-0065,MBP-0066,MBP-0067,MBP-0068. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0042 is to close all linked atomic work items (MBP-0018, MBP-0045, MBP-0054, MBP-0063, MBP-0064, MBP-0065, MBP-0066, MBP-0067) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0043 — Customer Portal Identity Link Model

FS-0043 defines the technical contract for Customer Portal Identity Link Model across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0043 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0044 — Work Order Routing Templates + Standard Minutes

FS-0044 defines the technical contract for Work Order Routing Templates + Standard Minutes across CAT-MY-WORK, CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at unreviewed. The latest review timestamp is 2026-03-04T04:43:13Z and evidence currently points to BugHunter=BACKEND-NEEDED-BH-01; QA=GAP-06, GAP-08, TD-001, TD-005, TD-009 +…; derived_from=MBP-0014,MBP-0015,MBP-0016,MBP-0039,MBP-0052,MBP-0053,MBP-0123,MBP-0124,MBP-0127,MBP-0132,MBP-0133,MBP-0136. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0044 is to close all linked atomic work items (MBP-0014, MBP-0015, MBP-0016, MBP-0039, MBP-0052, MBP-0053, MBP-0123, MBP-0124) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0045 — Inspection & Exception Queue Governance

FS-0045 defines the technical contract for Inspection & Exception Queue Governance across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0045 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0046 — Materials Demand Ledger + Reservation Controls

FS-0046 defines the technical contract for Materials Demand Ledger + Reservation Controls across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0046 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0047 — Compliance Command Center

FS-0047 defines the technical contract for Compliance Command Center across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0047 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0048 — Dynamic Custom Fields Framework

FS-0048 defines the technical contract for Dynamic Custom Fields Framework across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0048 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0049 — Alert Rules + Escalation Engine

FS-0049 defines the technical contract for Alert Rules + Escalation Engine across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is not_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0049 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0050 — Field-Level Visibility/Edit Policy Controls

FS-0050 defines the technical contract for Field-Level Visibility/Edit Policy Controls across CAT-AUTH. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is implemented with verification at qa_verified. The latest review timestamp is 2026-03-04T04:05:06Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0017,MBP-0105,MBP-0106,MBP-0107,MBP-0108,MBP-0109. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0050 is to close all linked atomic work items (MBP-0017, MBP-0105, MBP-0106, MBP-0107, MBP-0108, MBP-0109) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0051 — Operational Report Builder + Scheduled Report Runs

FS-0051 defines the technical contract for Operational Report Builder + Scheduled Report Runs across CAT-REPORTS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=None; QA=TD-013. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0051 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0052 — Part Lineage Drilldown Explorer

FS-0052 defines the technical contract for Part Lineage Drilldown Explorer across CAT-PARTS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is backend_needed with verification at qa_verified. The latest review timestamp is 2026-03-03T00:00:00Z and evidence currently points to BugHunter=BACKEND-NEEDED-BH-P01, BH-008, BH-009, BH-010, BUG-008 +…; QA=FEAT-LARGE-004, GAP-11, GAP-12, GAP-13. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0052 is to close all linked atomic work items (no MBP IDs currently linked) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0053 — Zero-Downtime Migration Control Plane

FS-0053 defines the technical contract for Zero-Downtime Migration Control Plane across CAT-SETTINGS, CAT-SYSTEM. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at unreviewed. The latest review timestamp is 2026-03-04T04:05:06Z and evidence currently points to BugHunter=None; QA=No new post-cycle evidence; derived_from=MBP-0003,MBP-0004,MBP-0011,MBP-0016,MBP-0133. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0053 is to close all linked atomic work items (MBP-0003, MBP-0004, MBP-0011, MBP-0016, MBP-0133) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0054 — Task Card Compliance Save Guardrail

FS-0054 defines the technical contract for Task Card Compliance Save Guardrail across CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0054 is to close all linked atomic work items (MBP-0138) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0055 — Lead Technician Execution Safety Orchestrator

FS-0055 defines the technical contract for Lead Technician Execution Safety Orchestrator across CAT-LEAD, CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0055 is to close all linked atomic work items (MBP-0139) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0056 — Task Card Authoring Validation Controls

FS-0056 defines the technical contract for Task Card Authoring Validation Controls across CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/new/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0056 is to close all linked atomic work items (MBP-0140) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0057 — Discrepancy Raise-and-Link Integrity

FS-0057 defines the technical contract for Discrepancy Raise-and-Link Integrity across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/_components/DiscrepancyList.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0057 is to close all linked atomic work items (MBP-0141) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0058 — My Work Assignment Consistency Controls

FS-0058 defines the technical contract for My Work Assignment Consistency Controls across CAT-MY-WORK. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/my-work/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0058 is to close all linked atomic work items (MBP-0142) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0059 — Sign-Off Dialog Data Integrity Guardrails

FS-0059 defines the technical contract for Sign-Off Dialog Data Integrity Guardrails across cross-cutting platform categories. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0059 is to close all linked atomic work items (MBP-0143) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0060 — Squawk Escalation and Handoff Safeguards

FS-0060 defines the technical contract for Squawk Escalation and Handoff Safeguards across CAT-SQUAWKS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/squawks/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0060 is to close all linked atomic work items (MBP-0144) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0061 — Certificate Field Normalization Pipeline

FS-0061 defines the technical contract for Certificate Field Normalization Pipeline across CAT-COMPLIANCE, CAT-WORK-ORDERS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to docs/feature-spec-appendices/detected-features-log.md#detected-features-not-previously-represented; app/(app)/work-orders/[id]/certificates/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0061 is to close all linked atomic work items (MBP-0145) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0062 — Customer Account CRM & Profile Ledger

FS-0062 defines the technical contract for Customer Account CRM & Profile Ledger across CAT-BILLING, CAT-PORTAL. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/customers/page.tsx; app/(customer)/portal/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0062 is to close all linked atomic work items (MBP-0146) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0063 — AR, Deposits, and Credit Memo Controls

FS-0063 defines the technical contract for AR, Deposits, and Credit Memo Controls across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/ar-dashboard/page.tsx; app/(app)/billing/deposits/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0063 is to close all linked atomic work items (MBP-0147) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0064 — Procurement and Vendor Operations

FS-0064 defines the technical contract for Procurement and Vendor Operations across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/vendors/page.tsx; app/(app)/billing/purchase-orders/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0064 is to close all linked atomic work items (MBP-0148) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0065 — Recurring Billing Contract Engine

FS-0065 defines the technical contract for Recurring Billing Contract Engine across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/recurring/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0065 is to close all linked atomic work items (MBP-0149) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0066 — Labor Kit and Quote Template Library

FS-0066 defines the technical contract for Labor Kit and Quote Template Library across CAT-BILLING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/billing/labor-kits/page.tsx; app/(app)/billing/quotes/templates/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0066 is to close all linked atomic work items (MBP-0150) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0067 — Parts Logistics Operations (Shipping, Loaners, Core Flow)

FS-0067 defines the technical contract for Parts Logistics Operations (Shipping, Loaners, Core Flow) across CAT-PARTS. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/parts/shipping/page.tsx; app/(app)/parts/loaners/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0067 is to close all linked atomic work items (MBP-0151) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0068 — Scheduling Roster and Crew Coordination

FS-0068 defines the technical contract for Scheduling Roster and Crew Coordination across CAT-SCHEDULING. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/scheduling/roster/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0068 is to close all linked atomic work items (MBP-0152) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

### FS-0069 — Station Configuration and Org Governance Console

FS-0069 defines the technical contract for Station Configuration and Org Governance Console across CAT-ONBOARDING, CAT-SETTINGS, CAT-SYSTEM. The intended behavior is deterministic role-gated execution, consistent data capture, and predictable state transitions so downstream workflows do not depend on operator memory or ad hoc sequencing. This feature is treated as a first-class capability in Registry A and is expected to remain stable under concurrent updates, retries, and cross-module navigation.

Current canonical state is partially_implemented with verification at doc_reviewed. The latest review timestamp is 2026-03-04T00:00:00Z and evidence currently points to src/router/routeModules/protectedAppRoutes.tsx; app/(app)/settings/station-config/page.tsx; app/(app)/settings/users/page.tsx. This means the capability surface exists in the product, but the platform still carries documented parity and hardening gaps that must be tracked explicitly rather than implied by UI presence.

Completion path for FS-0069 is to close all linked atomic work items (MBP-0153) and retire open gap notes in interconnection controls. Delivery must preserve auditability, permissions, and regression safety in mapped route categories, then advance verification from documentation-level checks to app and QA evidence with repeatable gates. Constraints include dependency ordering in the feature graph and preserving behavior already stabilized by prior bug-hunter hardening.

## Route Narrative Specifications

### RTC-0001 — /billing

/billing is the Billing surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing; Role-scoped access flow; State transition controls, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is implemented with source status router_only and verification at doc_reviewed. The bound component/source is Navigate(to=/billing/customers) from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0002 — /billing/analytics

/billing/analytics is the Billing Analytics surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing Analytics; Monthly Revenue — Last 6 Months; Revenue by Month; AR Aging; Top Customers by Collected Revenue, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingAnalyticsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0003 — /billing/ar-dashboard

/billing/ar-dashboard is the AR Dashboard surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by AR Dashboard; Customer Balances; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ArDashboardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0004 — /billing/credit-memos

/billing/credit-memos is the Credit Memos surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Credit Memos; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingCreditMemosPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0005 — /billing/customers

/billing/customers is the Customers surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Customers; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomersPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0006 — /billing/customers/:id

/billing/customers/:id is the Billing Customers Detail surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by customer?.name; Customer Information; Quotes; Invoices; Payment History, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0007 — /billing/deposits

/billing/deposits is the Deposits surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Deposits; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingDepositsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0008 — /billing/invoices

/billing/invoices is the Invoices surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Invoices; Cash; Check; Credit Card; Wire Transfer, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is InvoicesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0009 — /billing/invoices/:id

/billing/invoices/:id is the Billing Invoices Detail surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by invoice.invoiceNumber; Invoice invoice.invoiceNumber; Invoice Summary; Line Items; Payment History, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is InvoiceDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0010 — /billing/invoices/new

/billing/invoices/new is the Billing Invoices New surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by New Invoice; Invoice Source; Invoice Details; Tax Rate, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewInvoicePage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0011 — /billing/labor-kits

/billing/labor-kits is the Labor Kits surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Labor Kits; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is LaborKitsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0012 — /billing/otc

/billing/otc is the OTC Sales surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Counter Sales; Add Items; Cart (cart.length itemcart.length !== 1 ? "s" : ""); Payment; Sales History, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is OTCSalesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0013 — /billing/pricing

/billing/pricing is the Pricing surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Pricing; Pricing Profiles; Pricing Rules, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingPricingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0014 — /billing/purchase-orders

/billing/purchase-orders is the Purchase Orders surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Purchase Orders; Draft; Submitted; Partial; Received, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PurchaseOrdersPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0015 — /billing/purchase-orders/:id

/billing/purchase-orders/:id is the Billing Purchase Orders Detail surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by po.poNumber; PO Summary; Line Items, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PODetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0016 — /billing/purchase-orders/new

/billing/purchase-orders/new is the Billing Purchase Orders New surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by New Purchase Order; PO Details; Line Items, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewPOPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0017 — /billing/quotes

/billing/quotes is the Quotes surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Quotes; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is QuotesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0018 — /billing/quotes/:id

/billing/quotes/:id is the Billing Quotes Detail surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing Quotes Detail; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is QuoteDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0019 — /billing/quotes/new

/billing/quotes/new is the Billing Quotes New surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing Quotes New; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewQuotePage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0020 — /billing/recurring

/billing/recurring is the Recurring surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Recurring; Recurring Billing; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingRecurringPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0021 — /billing/settings

/billing/settings is the Billing Settings surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing Settings; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingSettingsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Page includes explicit coming-soon/stub indicators; capability is partial.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0022 — /billing/tax-config

/billing/tax-config is the Tax Config surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Tax Config; Tax Configuration; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingTaxConfigPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0023 — /billing/time-approval

/billing/time-approval is the Time Approval surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Time Approval; Time Clock Approval; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingTimeApprovalPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0024 — /billing/time-clock

/billing/time-clock is the Time Clock surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Time Clock; Today&apos;s Summary; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BillingTimeClockPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0025 — /billing/vendors

/billing/vendors is the Vendors surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Vendors; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is VendorsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0026 — /billing/vendors/:id

/billing/vendors/:id is the Billing Vendors Detail surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by vendor.name; Services; Contact Information; Certification; Purchase Order History, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is VendorDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0027 — /billing/vendors/new

/billing/vendors/new is the Billing Vendors New surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by New Vendor; Vendor Information; Contact Information; Certification; Parts Supplier, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewVendorPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0028 — /billing/warranty

/billing/warranty is the Warranty surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Total Claims; Draft; Submitted; Under Review; Approved, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WarrantyPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0029 — /compliance

/compliance is the Compliance surface in CAT-COMPLIANCE. Intended behavior is to expose the capability cluster defined by Compliance; Fleet AD Compliance Status; Compliance Tools, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CompliancePage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0030, FS-0061 and atomic backlog MBP-0011, MBP-0117, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0030 — /compliance/ad-sb

/compliance/ad-sb is the AD/SB surface in CAT-COMPLIANCE. Intended behavior is to expose the capability cluster defined by AD/SB; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is AdSbCompliancePage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0030, FS-0061 and atomic backlog MBP-0011, MBP-0117, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0031 — /compliance/audit-trail

/compliance/audit-trail is the Audit Trail surface in CAT-COMPLIANCE. Intended behavior is to expose the capability cluster defined by Audit Trail; Airworthiness Directives — aircraftRegistration; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is AuditTrailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0030, FS-0061 and atomic backlog MBP-0011, MBP-0117, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0032 — /compliance/certificates

/compliance/certificates is the Compliance Certificates surface in CAT-COMPLIANCE. Intended behavior is to expose the capability cluster defined by Compliance Certificates; Role-scoped access flow; State transition controls, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is implemented with source status router_only and verification at doc_reviewed. The bound component/source is Navigate(to=/compliance/audit-trail) from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0030, FS-0061 and atomic backlog MBP-0011, MBP-0117, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0033 — /compliance/qcm-review

/compliance/qcm-review is the QCM Review surface in CAT-COMPLIANCE. Intended behavior is to expose the capability cluster defined by QCM Review; IA Sign-Off Queue; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is QcmReviewPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0030, FS-0061 and atomic backlog MBP-0011, MBP-0117, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0034 — /dashboard

/dashboard is the Dashboard surface in CAT-DASHBOARD. Intended behavior is to expose the capability cluster defined by Dashboard; Active Work Orders; AOG Aircraft; Overdue ADs; Open Discrepancies, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is DashboardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0026 and atomic backlog MBP-0056, MBP-0057, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0035 — /fleet

/fleet is the Fleet surface in CAT-FLEET. Intended behavior is to expose the capability cluster defined by Fleet; Airworthy; Airworthy w/ Limitations; In Maintenance; Out of Service, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FleetPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0029, FS-0035 and atomic backlog MBP-0009, MBP-0047, MBP-0126, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0036 — /fleet/:tail

/fleet/:tail is the Fleet Aircraft Tail surface in CAT-FLEET. Intended behavior is to expose the capability cluster defined by aircraft!.currentRegistration; Work Orders; Identification; Customer; Airworthy, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is AircraftDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Page includes explicit coming-soon/stub indicators; capability is partial.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0029, FS-0035 and atomic backlog MBP-0009, MBP-0047, MBP-0126, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0037 — /fleet/:tail/logbook

/fleet/:tail/logbook is the Fleet Aircraft Tail Logbook surface in CAT-FLEET. Intended behavior is to expose the capability cluster defined by tailNumber; Maintenance; Inspection; Correction, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is AircraftLogbookPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0029, FS-0035 and atomic backlog MBP-0009, MBP-0047, MBP-0126, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0038 — /fleet/calendar

/fleet/calendar is the Fleet Calendar surface in CAT-FLEET. Intended behavior is to expose the capability cluster defined by Fleet Calendar; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FleetCalendarPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0029, FS-0035 and atomic backlog MBP-0009, MBP-0047, MBP-0126, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0039 — /fleet/predictions

/fleet/predictions is the Fleet Predictions surface in CAT-FLEET. Intended behavior is to expose the capability cluster defined by Fleet Predictions; Predictive Maintenance; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PredictionsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0020, FS-0029, FS-0035 and atomic backlog MBP-0009, MBP-0047, MBP-0126, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0040 — /lead

/lead is the Lead surface in CAT-LEAD. Intended behavior is to expose the capability cluster defined by Lead Technician Workspace; My Team; Assignment Board; Team Capacity; Active WO Summary, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is LeadDashboardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0028, FS-0055 and atomic backlog MBP-0134, MBP-0139, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0041 — /my-work

/my-work is the My Work surface in CAT-MY-WORK. Intended behavior is to expose the capability cluster defined by My Work; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is MyWorkPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0058 and atomic backlog MBP-0123, MBP-0142, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0042 — /onboarding

/onboarding is the Onboarding surface in CAT-ONBOARDING. Intended behavior is to expose the capability cluster defined by Onboarding; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is OnboardingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0041, FS-0069 and atomic backlog MBP-0105, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0043 — /parts

/parts is the Parts surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Parts; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PartsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0044 — /parts/cores

/parts/cores is the Cores surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Cores Out; Value Outstanding; Overdue; Awaiting Return; Received, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CoresPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0045 — /parts/inventory-count

/parts/inventory-count is the Inventory Count surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Inventory Count; countDetail.name; Inventory Counts, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is InventoryCountPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0046 — /parts/loaners

/parts/loaners is the Loaners surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Loaners; Rental / Loaner Tracking; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is LoanersPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0047 — /parts/new

/parts/new is the New Part surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Serviceable (used); Overhauled; Repaired, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewPartPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0048 — /parts/receiving

/parts/receiving is the Part Receiving surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Part Receiving; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PartsReceivingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0049 — /parts/requests

/parts/requests is the Part Requests surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Parts Queue; Pending Inspection; In Stock; Installed; Removed — Pending Disposition, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PartsRequestsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0050 — /parts/rotables

/parts/rotables is the Rotables surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Rotables; Rotable Components; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is RotablesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0051 — /parts/shipping

/parts/shipping is the Shipping surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Open Receiving; Total; Pending; In Transit; Delivered, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ShippingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0052 — /parts/tools

/parts/tools is the Tools surface in CAT-PARTS. Intended behavior is to expose the capability cluster defined by Hand Tool; Power Tool; Test Equipment; Special Tooling; Consumable, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ToolCribPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0019, FS-0052, FS-0067 and atomic backlog MBP-0020, MBP-0122, MBP-0151, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0053 — /personnel

/personnel is the Personnel surface in CAT-PERSONNEL. Intended behavior is to expose the capability cluster defined by Personnel; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is PersonnelPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0016, FS-0021 and atomic backlog MBP-0001, MBP-0134, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0054 — /personnel/training

/personnel/training is the Training surface in CAT-PERSONNEL. Intended behavior is to expose the capability cluster defined by Training &amp; Qualifications; Initial; Recurrent; Regulatory; Safety, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is TrainingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0016, FS-0021 and atomic backlog MBP-0001, MBP-0134, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0055 — /portal

/portal is the Portal surface in CAT-PORTAL. Intended behavior is to expose the capability cluster defined by No customer account linked; Active Work Orders; Pending Quotes; Outstanding Invoices; Total Fleet, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerDashboardPage from src/router/routeModules/customerPortalRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0010, FS-0062 and atomic backlog MBP-0019, MBP-0146, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0056 — /portal/fleet

/portal/fleet is the Portal Fleet surface in CAT-PORTAL. Intended behavior is to expose the capability cluster defined by Portal Fleet; My Fleet; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerFleetPage from src/router/routeModules/customerPortalRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0010, FS-0062 and atomic backlog MBP-0019, MBP-0146, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0057 — /portal/invoices

/portal/invoices is the Portal Invoices surface in CAT-PORTAL. Intended behavior is to expose the capability cluster defined by Portal Invoices; Invoices; invoice.invoiceNumber, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerInvoicesPage from src/router/routeModules/customerPortalRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0010, FS-0062 and atomic backlog MBP-0019, MBP-0146, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0058 — /portal/quotes

/portal/quotes is the Portal Quotes surface in CAT-PORTAL. Intended behavior is to expose the capability cluster defined by Portal Quotes; Quotes; quote.quoteNumber, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerQuotesPage from src/router/routeModules/customerPortalRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0010, FS-0062 and atomic backlog MBP-0019, MBP-0146, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0059 — /portal/work-orders

/portal/work-orders is the Portal Work Orders surface in CAT-PORTAL. Intended behavior is to expose the capability cluster defined by Work Orders; detail.workOrderNumber; Received; Inspection; In Progress, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CustomerWorkOrdersPage from src/router/routeModules/customerPortalRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0010, FS-0062 and atomic backlog MBP-0019, MBP-0146, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0060 — /reports

/reports is the Reports surface in CAT-REPORTS. Intended behavior is to expose the capability cluster defined by Monthly Revenue; WO Throughput; Revenue Summary Table, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ReportsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0051 and atomic backlog MBP-0103, MBP-0137, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0061 — /reports/financials

/reports/financials is the Reports Financials surface in CAT-REPORTS. Intended behavior is to expose the capability cluster defined by Financial Dashboard; Monthly Revenue — Last 12 Months; Gross Margin Trend; Revenue by Aircraft Type, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FinancialDashboardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0051 and atomic backlog MBP-0103, MBP-0137, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0062 — /reports/financials/forecast

/reports/financials/forecast is the Reports Financials Forecast surface in CAT-REPORTS. Intended behavior is to expose the capability cluster defined by Cash Flow Forecast; horizon-Month Revenue / Cost / Profit Projection; Monthly Cash Flow Detail, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FinancialForecastPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0051 and atomic backlog MBP-0103, MBP-0137, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0063 — /reports/financials/profitability

/reports/financials/profitability is the Reports Financials Profitability surface in CAT-REPORTS. Intended behavior is to expose the capability cluster defined by Reports Financials Profitability; WO Profitability; Per-WO Profit &amp; Loss, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FinancialProfitabilityPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0051 and atomic backlog MBP-0103, MBP-0137, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0064 — /reports/financials/runway

/reports/financials/runway is the Reports Financials Runway surface in CAT-REPORTS. Intended behavior is to expose the capability cluster defined by Reports Financials Runway; Business Runway; 12-Month Cash Position Projection, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FinancialRunwayPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0012, FS-0051 and atomic backlog MBP-0103, MBP-0137, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0065 — /scheduling

/scheduling is the Scheduling surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SchedulingPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0066 — /scheduling/bays

/scheduling/bays is the Scheduling Bays surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling Bays; Hangar Bays; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is BaysPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0067 — /scheduling/capacity

/scheduling/capacity is the Scheduling Capacity surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling Capacity; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CapacityPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0068 — /scheduling/financial-planning

/scheduling/financial-planning is the Scheduling Financial Planning surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling Financial Planning; Assumptions; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is FinancialPlanningPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0069 — /scheduling/quotes

/scheduling/quotes is the Scheduling Quote Workspace surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling Quote Workspace; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SchedulingQuotesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0070 — /scheduling/roster

/scheduling/roster is the Scheduling Roster surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Scheduling Roster; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SchedulingRosterPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0071 — /scheduling/seed-audit

/scheduling/seed-audit is the Scheduling Seed Audit surface in CAT-SCHEDULING. Intended behavior is to expose the capability cluster defined by Repair Station Seed Audit; Coverage Counts; Per-Location Scheduled Counts; Per-Location Tool Counts; Fleet Component Coverage, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SeedAuditPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0013, FS-0014, FS-0068 and atomic backlog MBP-0110, MBP-0114, MBP-0152, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0072 — /settings/email-log

/settings/email-log is the Settings Email Log surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Settings Email Log; Email Log; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is EmailLogPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0073 — /settings/import

/settings/import is the Settings Import surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Import Data; 2. Map columns; 3. Preview (csvRows.length rows), enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ImportPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0074 — /settings/locations

/settings/locations is the Settings Locations surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Part 145; Part 135; Part 121; Part 91, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ShopLocationsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Page includes explicit coming-soon/stub indicators; capability is partial.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0075 — /settings/notifications

/settings/notifications is the Settings Notifications surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Notification Preferences; Notification Types; Work Order Status Changes; Task Assignments; Quote Approved, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NotificationPreferencesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0076 — /settings/quickbooks

/settings/quickbooks is the Settings QuickBooks surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Sync Settings; Total Syncs; Pending; Synced; Failed, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is QuickBooksPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0077 — /settings/routing-templates

/settings/routing-templates is the Settings Routing Templates surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Settings Routing Templates; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is RoutingTemplatesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Page includes explicit coming-soon/stub indicators; capability is partial.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0078 — /settings/shop

/settings/shop is the Settings Shop surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Eastern (ET) — America/New_York; Eastern (ET) — America/Detroit; Eastern (ET) — America/Indianapolis; Central (CT) — America/Chicago; Central (CT) — America/Menominee, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ShopSettingsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0079 — /settings/station-config

/settings/station-config is the Settings Station Config surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Settings Station Config; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is StationConfigPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0080 — /settings/users

/settings/users is the Settings Users surface in CAT-SETTINGS. Intended behavior is to expose the capability cluster defined by Settings Users; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is UsersSettingsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0053, FS-0069 and atomic backlog MBP-0106, MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0081 — /sign-in/*

/sign-in/* is the Sign In Wildcard surface in CAT-AUTH. Intended behavior is to expose the capability cluster defined by Sign In Wildcard; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is app/(auth)/sign-in/[[...sign-in]]/page.tsx from src/router/routeModules/authRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0050 and atomic backlog MBP-0017, MBP-0108, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0082 — /sign-up/*

/sign-up/* is the Sign Up Wildcard surface in CAT-AUTH. Intended behavior is to expose the capability cluster defined by Sign Up Wildcard; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is app/(auth)/sign-up/[[...sign-up]]/page.tsx from src/router/routeModules/authRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0015, FS-0050 and atomic backlog MBP-0017, MBP-0108, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0083 — /squawks

/squawks is the Squawks surface in CAT-SQUAWKS. Intended behavior is to expose the capability cluster defined by Squawks & Discrepancies; Critical; Major; Minor; Observation, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SquawksPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0024, FS-0060 and atomic backlog MBP-0041, MBP-0144, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0084 — /work-orders

/work-orders is the Work Orders surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WorkOrdersPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0085 — /work-orders/:id

/work-orders/:id is the Work Orders Detail surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by wo.workOrderNumber; Work Order Activity; Quoting; In-dock; Inspection, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WorkOrderDetailPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0086 — /work-orders/:id/certificates

/work-orders/:id/certificates is the Work Orders Detail Certificates surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Certificates; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is CertificatesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056, FS-0061 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, MBP-0145, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0087 — /work-orders/:id/execution

/work-orders/:id/execution is the Work Orders Detail Execution surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Execution; workOrder.workOrderNumber — Execution Planning; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WOExecutionPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0088 — /work-orders/:id/records

/work-orders/:id/records is the Work Orders Detail Records surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Annual; 100-Hour; Progressive; Conditional, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is MaintenanceRecordsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0089 — /work-orders/:id/release

/work-orders/:id/release is the Work Orders Detail Release surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Release; Aircraft Released to Customer; Work Order Details, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is ReleaseAircraftPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0090 — /work-orders/:id/rts

/work-orders/:id/rts is the Work Orders Detail Rts surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Rts; Aircraft Returned to Service; Return-to-Service Already Authorized, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is RtsPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0091 — /work-orders/:id/signature

/work-orders/:id/signature is the Work Orders Detail Signature surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Signature; Re-Authentication Required; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is SignaturePage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0092 — /work-orders/:id/tasks/:cardId

/work-orders/:id/tasks/:cardId is the Work Orders Detail Tasks Task Card surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Tasks Task Card; taskCard.title; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is TaskCardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0093 — /work-orders/:id/tasks/new

/work-orders/:id/tasks/new is the Work Orders Detail Tasks New surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Detail Tasks New; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewTaskCardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0094 — /work-orders/dashboard

/work-orders/dashboard is the Work Orders Dashboard surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders Dashboard; Work Order Dashboard; Active Work Orders, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WorkOrdersDashboardPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0095 — /work-orders/kanban

/work-orders/kanban is the Work Order Kanban surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Orders — Kanban; col.label; Draft; Open; In Progress, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is KanbanPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0096 — /work-orders/lead

/work-orders/lead is the Work Orders Lead surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Lead Workspace; Task Assignment Feed; Turnover Report Editor; Submitted History, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WorkOrdersLeadPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0097 — /work-orders/new

/work-orders/new is the New Work Order surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by New Work Order; Work Order Details; Priority, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is NewWorkOrderPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0098 — /work-orders/templates

/work-orders/templates is the Work Order Templates surface in CAT-WORK-ORDERS. Intended behavior is to expose the capability cluster defined by Work Order Templates; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status routed and verification at doc_reviewed. The bound component/source is WorkOrderTemplatesPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is —. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0023, FS-0044, FS-0054, FS-0055, FS-0056 and atomic backlog MBP-0014, MBP-0127, MBP-0138, MBP-0139, MBP-0140, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0099 — *

* is the App Not Found Catch-All surface in CAT-SYSTEM. Intended behavior is to expose the capability cluster defined by App Not Found Catch-All; Role-scoped access flow; State transition controls, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is implemented with source status router_only and verification at doc_reviewed. The bound component/source is AppNotFoundPage from src/router/routeModules/protectedAppRoutes.tsx, and current gap assessment is Route exists in router modules without a dedicated page file; behavior is redirect/catch-all managed.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0053, FS-0069 and atomic backlog MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0100 — /billing/quotes/templates

/billing/quotes/templates is the Billing Quotes Templates surface in CAT-BILLING. Intended behavior is to expose the capability cluster defined by Billing Quotes Templates; Quote Templates; t.name, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status orphan_page and verification at doc_reviewed. The bound component/source is app/(app)/billing/quotes/templates/page.tsx from app/(app)/billing/quotes/templates/page.tsx, and current gap assessment is Page exists in filesystem but is not wired in route modules.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0007, FS-0008, FS-0032, FS-0062, FS-0063, FS-0064, FS-0065, FS-0066 and atomic backlog MBP-0024, MBP-0119, MBP-0146, MBP-0147, MBP-0148, MBP-0149, MBP-0150, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.

### RTC-0101 — /not-found

/not-found is the Not Found surface in CAT-SYSTEM. Intended behavior is to expose the capability cluster defined by Not Found; Role-scoped action controls; Validation and error-state handling, enforce route-level access expectations, and keep navigation outcomes deterministic whether the user enters from sidebar flows, deep links, or redirected states.

Current implementation is partially_implemented with source status orphan_page and verification at doc_reviewed. The bound component/source is app/(app)/not-found/page.tsx from app/(app)/not-found/page.tsx, and current gap assessment is Page exists in filesystem but is not wired in route modules.. This establishes the real implemented posture for the route instead of assuming parity from static menu presence.

Completion path requires closing mapped capability work for FS-0053, FS-0069 and atomic backlog MBP-0133, MBP-0153, then re-validating route behavior under role guards, data loading, and error boundaries. Route-level signoff is complete only when redirect/alias behavior, page rendering, and linked mutations all satisfy the canonical acceptance gates without orphaned data paths.


### Field Contextual Seeding — Industry Context Corpus

| Seed ID | Source Artifact | Source Context Link | Mapped Feature # | Feature Name | Registry MBP IDs | Confidence | Enhancement Context | Future-State Delta |
|---|---|---|---:|---|---|---|---|---|
| ICS-001 | `OJT Data Flow.pdf`, `Master OJT Logs AVEX BEN has ideas.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [16](#feature-state-matrix-all-69-features) | Training & Qualifications Mgmt | `MBP-0001`, `MBP-0005`, `MBP-0025` | High | Seed trainer-signoff queues, step progression provenance, and readiness-driven qualification modeling. | Move from generic training CRUD to role-gated, auditable, progression-aware qualification workflows. |
| ICS-002 | `2023 leveling.pdf`, `Elevate MRO Capacity planning.xlsx`, `AVEX-NS Aviation Hldgs Lean slide.pptx` | [`INDEX.md` Application Context Mapping](../../research/industry-context-field-artifacts/INDEX.md#application-context-mapping) | [13](#feature-state-matrix-all-69-features) | Scheduling — Drag-Drop Gantt | `MBP-0047`, `MBP-0110`, `MBP-0128`, `MBP-0129` | High | Seed bay-aware planning constraints and lean flow semantics in scheduler interactions. | Move from interactive visual scheduling to constraint-informed execution reflecting real hangar flow. |
| ICS-003 | `2023 leveling.pdf`, `Elevate MRO Capacity planning.xlsx`, `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [14](#feature-state-matrix-all-69-features) | Scheduling — Auto-Schedule | `MBP-0114` | High | Seed auto-schedule constraints with PTO/training burden and coarse-leveling assumptions. | Move from baseline assignment logic to workforce-readiness and capacity-aware auto-allocation. |
| ICS-004 | `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`, `Elevate MRO Capacity planning.xlsx` | [`INDEX.md` Application Context Mapping](../../research/industry-context-field-artifacts/INDEX.md#application-context-mapping) | [12](#feature-state-matrix-all-69-features) | Reports & Analytics Dashboard | `MBP-0056`, `MBP-0057`, `MBP-0058`, `MBP-0059`, `MBP-0103`, `MBP-0104` | High | Seed labor-utilization, throughput, and TAT measures with field-derived assumptions and caveats. | Move from chart parity to operationally credible KPIs tied to real workforce and shop dynamics. |
| ICS-005 | `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`, `2023 leveling.pdf`, `Elevate MRO Capacity planning.xlsx` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [26](#feature-state-matrix-all-69-features) | Dashboard KPIs | `MBP-0050`, `MBP-0051` | High | Seed KPI definitions with availability-loss factors and planning-vs-actual framing. | Move from basic KPI widgets to disciplined KPI contracts aligned to field planning reality. |
| ICS-006 | `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [21](#feature-state-matrix-all-69-features) | Overtime / Shift Management | `MBP-0134` | High | Seed shift/overtime policies with observed labor-loss and monthly capacity variance patterns. | Move from time-clock extensions to policy-aware shift controls grounded in field utilization data. |
| ICS-007 | `AVEX-NS Aviation Hldgs Lean slide.pptx`, `Master OJT Logs AVEX BEN has ideas.xlsx`, `OJT Data Flow.pdf` | [`INDEX.md` Application Context Mapping](../../research/industry-context-field-artifacts/INDEX.md#application-context-mapping) | [44](#feature-state-matrix-all-69-features) | Work Order Routing Templates + Standard Minutes | `MBP-0136` | High | Seed routing templates with standardized task sequencing and signoff-aware execution structure. | Move from ad hoc WO execution to reusable operation templates with standard-minute baselines. |
| ICS-008 | `Tech capacity and training report BJC Jan 2023 1.2 (1).pdf`, `Elevate MRO Capacity planning.xlsx`, `2023 leveling.pdf` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [51](#feature-state-matrix-all-69-features) | Operational Report Builder + Scheduled Report Runs | `MBP-0137` | High | Seed scheduled reports with cadence and model assumptions used in recurring field planning cycles. | Move from static reporting to recurring operational intelligence runs with consistent planning semantics. |
| ICS-009 | `Repair Station Contacts with Ratings (Download).xlsx` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [17](#feature-state-matrix-all-69-features) | Multi-Location Cross-Site UI | `MBP-0030`, `MBP-0043` | High | Seed cross-site navigation with real repair-station location and contact metadata patterns. | Move from generic multi-site UI to field-informed site selection and location-scoped workflows. |
| ICS-010 | `Repair Station Contacts with Ratings (Download).xlsx` | [`INDEX.md` File Index](../../research/industry-context-field-artifacts/INDEX.md#file-index) | [25](#feature-state-matrix-all-69-features) | Search — Global Search | `MBP-0135`, `MBP-0046` | High | Seed search/index strategy for large external entity catalogs and location-coded lookup flows. | Move from command-palette baseline to high-scale operational search tuned for field datasets. |
| ICS-011 | `RSQC Skysource HSYR817E Revision 22_20-FEB-2025.pdf`, `Elevate MRO QCM CRS# K4LR032E.pdf`, `Elevate MRO RSM CRS# K4LR032E.pdf` | [`02-skysource-regulatory-audit.md` Exhaustive High-Signal File List](../../research/industry-context-field-artifacts/context-index/02-skysource-regulatory-audit.md#exhaustive-high-signal-file-list) | [20](#feature-state-matrix-all-69-features) | AD/SB Fleet Compliance Dashboard | `MBP-0011` | High | Seed AD/SB compliance logic with current repair-station manual authority and quality-control constraints. | Move from static AD/SB tracking to policy-grounded compliance surfaces aligned to authoritative manuals. |
| ICS-012 | `EP_1_4_2_145F_AW_V21.PDF`, `audit-EP_1_4_2-findings-report.docx`, `audit-EP_4_7_4-findings-report.docx` | [`02-skysource-regulatory-audit.md` Exhaustive High-Signal File List](../../research/industry-context-field-artifacts/context-index/02-skysource-regulatory-audit.md#exhaustive-high-signal-file-list) | [30](#feature-state-matrix-all-69-features) | Conformity Inspection | `MBP-0117`, `MBP-0118` | High | Seed conformity workflows with DCT evidence structure and real audit finding patterns. | Move from generic conformity records to inspection evidence models aligned with FAA DCT/audit criteria. |
| ICS-013 | `2013 Aircraft Maintenance Labor Rates.pdf`, `B200 Flate rates.xls`, `Miscellaneous Services Flat Rates.xls` | [`03-mayo-quote-pricing-retrofit.md` Exhaustive High-Signal File List](../../research/industry-context-field-artifacts/context-index/03-mayo-quote-pricing-retrofit.md#exhaustive-high-signal-file-list-non-image-documents) | [51](#feature-state-matrix-all-69-features) | Operational Report Builder + Scheduled Report Runs | `MBP-0137` | High | Seed recurring report templates with historical labor-rate and flat-rate benchmarking context. | Move from generic scheduled reports to historically anchored estimation and margin-intelligence reporting. |
| ICS-014 | `Garmin.png`, `N2DB.jpg`, `Dual GTN-750.png` | [`05-photo-full-review-ledger.md` Ledger Entries](../../research/industry-context-field-artifacts/context-index/05-photo-full-review-ledger.md#ledger-entries) | [44](#feature-state-matrix-all-69-features) | Work Order Routing Templates + Standard Minutes | `MBP-0136` | High | Seed routing templates with visual retrofit baselines and panel-state evidence patterns. | Move from abstract template definitions to evidence-backed routing based on real retrofit baseline conditions. |
| ICS-015 | `Screenshot 2025-10-31 111606.png`, `Screenshot 2025-10-31 113252.png`, `Screenshot 2025-10-31 120029.png` | [`05-photo-full-review-ledger.md` Ledger Entries](../../research/industry-context-field-artifacts/context-index/05-photo-full-review-ledger.md#ledger-entries) | [12](#feature-state-matrix-all-69-features) | Reports & Analytics Dashboard | `MBP-0056`, `MBP-0057`, `MBP-0058`, `MBP-0059`, `MBP-0103`, `MBP-0104` | High | Seed dashboard/report parity targets with real legacy operational telemetry screenshots. | Move from synthetic KPI views to workflows that reflect observed operational visibility and handoff states. |
| ICS-016 | `IMG_20170527_134716236.jpg`, `IMG_20170527_142423595.jpg`, `IMG_20170527_150716179.jpg` | [`05-photo-full-review-ledger.md` Ledger Entries](../../research/industry-context-field-artifacts/context-index/05-photo-full-review-ledger.md#ledger-entries) | [52](#feature-state-matrix-all-69-features) | Part Lineage Drilldown Explorer | `MBP-0035`, `MBP-0036`, `MBP-0049`, `MBP-0122` | High | Seed part-lineage and receiving-inspection flows with real component-bay and avionics evidence patterns. | Move from document-only part lineage to image-linked evidence chains across install/remove/inspection states. |

## Feature Interconnection Graph

| edge_id | from_fs_id | to_fs_id | relationship | rationale |
|---|---|---|---|---|
| EDGE-0001 | FS-0015 | FS-0041 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-002 |
| EDGE-0002 | FS-0015 | FS-0044 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-003 |
| EDGE-0003 | FS-0041 | FS-0044 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-003 |
| EDGE-0004 | FS-0044 | FS-0044 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-004 |
| EDGE-0005 | FS-0015 | FS-0001 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-005 |
| EDGE-0006 | FS-0041 | FS-0001 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-005 |
| EDGE-0007 | FS-0044 | FS-0001 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-005 |
| EDGE-0008 | FS-0015 | FS-0052 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-006 |
| EDGE-0009 | FS-0041 | FS-0052 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-006 |
| EDGE-0010 | FS-0052 | FS-0019 | depends_on | Derived from canonical group dependency: GRP-006 -> GRP-007 |
| EDGE-0011 | FS-0044 | FS-0028 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-008 |
| EDGE-0012 | FS-0012 | FS-0028 | depends_on | Derived from canonical group dependency: GRP-009 -> GRP-008 |
| EDGE-0013 | FS-0041 | FS-0012 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-009 |
| EDGE-0014 | FS-0044 | FS-0012 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-009 |
| EDGE-0015 | FS-0044 | FS-0025 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-010 |
| EDGE-0016 | FS-0041 | FS-0009 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-011 |
| EDGE-0017 | FS-0044 | FS-0009 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-011 |
| EDGE-0018 | FS-0044 | FS-0013 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-012 |
| EDGE-0019 | FS-0012 | FS-0013 | depends_on | Derived from canonical group dependency: GRP-009 -> GRP-012 |
| EDGE-0020 | FS-0013 | FS-0035 | depends_on | Derived from canonical group dependency: GRP-012 -> GRP-013 |
| EDGE-0021 | FS-0020 | FS-0035 | depends_on | Derived from canonical group dependency: GRP-017 -> GRP-013 |
| EDGE-0022 | FS-0044 | FS-0053 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-014 |
| EDGE-0023 | FS-0052 | FS-0053 | depends_on | Derived from canonical group dependency: GRP-006 -> GRP-014 |
| EDGE-0024 | FS-0032 | FS-0053 | depends_on | Derived from canonical group dependency: GRP-018 -> GRP-014 |
| EDGE-0025 | FS-0044 | FS-0010 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-015 |
| EDGE-0026 | FS-0053 | FS-0010 | depends_on | Derived from canonical group dependency: GRP-014 -> GRP-015 |
| EDGE-0027 | FS-0015 | FS-0016 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-016 |
| EDGE-0028 | FS-0041 | FS-0016 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-016 |
| EDGE-0029 | FS-0015 | FS-0020 | depends_on | Derived from canonical group dependency: GRP-001 -> GRP-017 |
| EDGE-0030 | FS-0041 | FS-0020 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-017 |
| EDGE-0031 | FS-0044 | FS-0020 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-017 |
| EDGE-0032 | FS-0044 | FS-0032 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-018 |
| EDGE-0033 | FS-0053 | FS-0032 | depends_on | Derived from canonical group dependency: GRP-014 -> GRP-018 |
| EDGE-0034 | FS-0010 | FS-0036 | depends_on | Derived from canonical group dependency: GRP-015 -> GRP-019 |
| EDGE-0035 | FS-0016 | FS-0036 | depends_on | Derived from canonical group dependency: GRP-016 -> GRP-019 |
| EDGE-0036 | FS-0035 | FS-0051 | depends_on | Derived from canonical group dependency: GRP-013 -> GRP-020 |
| EDGE-0037 | FS-0032 | FS-0051 | depends_on | Derived from canonical group dependency: GRP-018 -> GRP-020 |
| EDGE-0038 | FS-0041 | FS-0002 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-022 |
| EDGE-0039 | FS-0044 | FS-0002 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-022 |
| EDGE-0040 | FS-0041 | FS-0006 | depends_on | Derived from canonical group dependency: GRP-002 -> GRP-023 |
| EDGE-0041 | FS-0044 | FS-0006 | depends_on | Derived from canonical group dependency: GRP-003 -> GRP-023 |
| EDGE-0042 | FS-0025 | FS-0025 | depends_on | Derived from canonical group dependency: GRP-010 -> GRP-024 |

## Alias Index

| legacy_id | canonical_namespace | canonical_id | alias_of | source_ref | source_date |
|---|---|---|---|---|---|
| Feature #1 | fs | FS-0001 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #2 | fs | FS-0002 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #3 | fs | FS-0003 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #4 | fs | FS-0004 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #5 | fs | FS-0005 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #6 | fs | FS-0006 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #7 | fs | FS-0007 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #8 | fs | FS-0008 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #9 | fs | FS-0009 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #10 | fs | FS-0010 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #11 | fs | FS-0011 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #12 | fs | FS-0012 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #13 | fs | FS-0013 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #14 | fs | FS-0014 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #15 | fs | FS-0015 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #16 | fs | FS-0016 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #17 | fs | FS-0017 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #18 | fs | FS-0018 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #19 | fs | FS-0019 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #20 | fs | FS-0020 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #21 | fs | FS-0021 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #22 | fs | FS-0022 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #23 | fs | FS-0023 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #24 | fs | FS-0024 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #25 | fs | FS-0025 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #26 | fs | FS-0026 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #27 | fs | FS-0027 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #28 | fs | FS-0028 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #29 | fs | FS-0029 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #30 | fs | FS-0030 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #31 | fs | FS-0031 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #32 | fs | FS-0032 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #33 | fs | FS-0033 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #34 | fs | FS-0034 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #35 | fs | FS-0035 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #36 | fs | FS-0036 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #37 | fs | FS-0037 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #38 | fs | FS-0038 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #39 | fs | FS-0039 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #40 | fs | FS-0040 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #41 | fs | FS-0041 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #42 | fs | FS-0042 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #43 | fs | FS-0043 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #44 | fs | FS-0044 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #45 | fs | FS-0045 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #46 | fs | FS-0046 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #47 | fs | FS-0047 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #48 | fs | FS-0048 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #49 | fs | FS-0049 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #50 | fs | FS-0050 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #51 | fs | FS-0051 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #52 | fs | FS-0052 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| Feature #53 | fs | FS-0053 | — | MASTER-BUILD-LIST.md | 2026-03-03 |
| MBP-0001 | mbp | MBP-0001 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-001 | mbp | MBP-0001 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0002 | mbp | MBP-0002 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-002 | mbp | MBP-0002 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0003 | mbp | MBP-0003 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-003 | mbp | MBP-0003 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0004 | mbp | MBP-0004 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-004 | mbp | MBP-0004 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0005 | mbp | MBP-0005 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-005 | mbp | MBP-0005 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0006 | mbp | MBP-0006 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-006 | mbp | MBP-0006 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0007 | mbp | MBP-0007 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-007 | mbp | MBP-0007 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0008 | mbp | MBP-0008 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-008 | mbp | MBP-0008 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0009 | mbp | MBP-0009 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-009 | mbp | MBP-0009 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0010 | mbp | MBP-0010 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-010 | mbp | MBP-0010 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0011 | mbp | MBP-0011 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-011 | mbp | MBP-0011 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0012 | mbp | MBP-0012 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-012 | mbp | MBP-0012 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0013 | mbp | MBP-0013 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-013 | mbp | MBP-0013 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0014 | mbp | MBP-0014 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-014 | mbp | MBP-0014 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0015 | mbp | MBP-0015 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-015 | mbp | MBP-0015 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0016 | mbp | MBP-0016 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-016 | mbp | MBP-0016 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0017 | mbp | MBP-0017 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-017 | mbp | MBP-0017 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0018 | mbp | MBP-0018 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-018 | mbp | MBP-0018 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0019 | mbp | MBP-0019 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-019 | mbp | MBP-0019 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0020 | mbp | MBP-0020 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-020 | mbp | MBP-0020 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0021 | mbp | MBP-0021 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-021 | mbp | MBP-0021 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0022 | mbp | MBP-0022 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-022 | mbp | MBP-0022 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0023 | mbp | MBP-0023 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-023 | mbp | MBP-0023 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0024 | mbp | MBP-0024 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-024 | mbp | MBP-0024 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0025 | mbp | MBP-0025 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-025 | mbp | MBP-0025 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0026 | mbp | MBP-0026 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-026 | mbp | MBP-0026 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0027 | mbp | MBP-0027 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-027 | mbp | MBP-0027 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0028 | mbp | MBP-0028 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-028 | mbp | MBP-0028 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0029 | mbp | MBP-0029 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| RPT-029 | mbp | MBP-0029 | — | reports/transcript-intelligence/2026-03-03/athlon-leadership-report.md | 2026-03-03 |
| MBP-0030 | mbp | MBP-0030 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-001 | mbp | MBP-0030 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0031 | mbp | MBP-0031 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-002 | mbp | MBP-0031 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0032 | mbp | MBP-0032 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-003 | mbp | MBP-0032 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0033 | mbp | MBP-0033 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-004 | mbp | MBP-0033 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0034 | mbp | MBP-0034 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-005 | mbp | MBP-0034 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0035 | mbp | MBP-0035 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-006 | mbp | MBP-0035 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0036 | mbp | MBP-0036 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-007 | mbp | MBP-0036 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0037 | mbp | MBP-0037 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-008 | mbp | MBP-0037 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0038 | mbp | MBP-0038 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-009 | mbp | MBP-0038 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0039 | mbp | MBP-0039 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-010 | mbp | MBP-0039 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0040 | mbp | MBP-0040 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-011 | mbp | MBP-0040 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0041 | mbp | MBP-0041 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-012 | mbp | MBP-0041 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0042 | mbp | MBP-0042 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-013 | mbp | MBP-0042 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0043 | mbp | MBP-0043 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-014 | mbp | MBP-0043 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0044 | mbp | MBP-0044 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-015 | mbp | MBP-0044 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0045 | mbp | MBP-0045 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-016 | mbp | MBP-0045 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0046 | mbp | MBP-0046 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-017 | mbp | MBP-0046 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0047 | mbp | MBP-0047 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-018 | mbp | MBP-0047 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0048 | mbp | MBP-0048 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-019 | mbp | MBP-0048 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0049 | mbp | MBP-0049 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-020 | mbp | MBP-0049 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0050 | mbp | MBP-0050 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-021 | mbp | MBP-0050 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0051 | mbp | MBP-0051 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-022 | mbp | MBP-0051 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0052 | mbp | MBP-0052 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-023 | mbp | MBP-0052 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0053 | mbp | MBP-0053 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-024 | mbp | MBP-0053 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0054 | mbp | MBP-0054 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| FR-025 | mbp | MBP-0054 | — | athelon-app/docs/plans/2026-03-03-feature-intake-wave-roadmap.md | 2026-03-03 |
| MBP-0055 | mbp | MBP-0055 | — | WATERFALL-PLAN.md | 2026-03-03 |
| AUTH-001 | mbp | MBP-0055 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0056 | mbp | MBP-0056 | — | WATERFALL-PLAN.md | 2026-03-03 |
| CHART-001 | mbp | MBP-0056 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0057 | mbp | MBP-0057 | — | WATERFALL-PLAN.md | 2026-03-03 |
| CHART-002 | mbp | MBP-0057 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0058 | mbp | MBP-0058 | — | WATERFALL-PLAN.md | 2026-03-03 |
| CHART-003 | mbp | MBP-0058 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0059 | mbp | MBP-0059 | — | WATERFALL-PLAN.md | 2026-03-03 |
| CHART-004 | mbp | MBP-0059 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0060 | mbp | MBP-0060 | — | WATERFALL-PLAN.md | 2026-03-03 |
| CHART-005 | mbp | MBP-0060 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0061 | mbp | MBP-0061 | — | WATERFALL-PLAN.md | 2026-03-03 |
| EXPORT-001 | mbp | MBP-0061 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0062 | mbp | MBP-0062 | — | WATERFALL-PLAN.md | 2026-03-03 |
| EXPORT-002 | mbp | MBP-0062 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0063 | mbp | MBP-0063 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-001 | mbp | MBP-0063 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0064 | mbp | MBP-0064 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-002 | mbp | MBP-0064 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0065 | mbp | MBP-0065 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-003 | mbp | MBP-0065 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0066 | mbp | MBP-0066 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-004 | mbp | MBP-0066 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0067 | mbp | MBP-0067 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-005 | mbp | MBP-0067 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0068 | mbp | MBP-0068 | — | WATERFALL-PLAN.md | 2026-03-03 |
| FILE-006 | mbp | MBP-0068 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0069 | mbp | MBP-0069 | — | WATERFALL-PLAN.md | 2026-03-03 |
| LABOR-001 | mbp | MBP-0069 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0070 | mbp | MBP-0070 | — | WATERFALL-PLAN.md | 2026-03-03 |
| LABOR-002 | mbp | MBP-0070 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0071 | mbp | MBP-0071 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-001 | mbp | MBP-0071 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0072 | mbp | MBP-0072 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-002 | mbp | MBP-0072 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0073 | mbp | MBP-0073 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-003 | mbp | MBP-0073 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0074 | mbp | MBP-0074 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-004 | mbp | MBP-0074 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0075 | mbp | MBP-0075 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-005 | mbp | MBP-0075 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0076 | mbp | MBP-0076 | — | WATERFALL-PLAN.md | 2026-03-03 |
| NOTIF-006 | mbp | MBP-0076 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0077 | mbp | MBP-0077 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-001 | mbp | MBP-0077 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0078 | mbp | MBP-0078 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-002 | mbp | MBP-0078 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0079 | mbp | MBP-0079 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-003 | mbp | MBP-0079 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0080 | mbp | MBP-0080 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-004 | mbp | MBP-0080 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0081 | mbp | MBP-0081 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-005 | mbp | MBP-0081 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0082 | mbp | MBP-0082 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PDF-006 | mbp | MBP-0082 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0083 | mbp | MBP-0083 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-001 | mbp | MBP-0083 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0084 | mbp | MBP-0084 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-002 | mbp | MBP-0084 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0085 | mbp | MBP-0085 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-003 | mbp | MBP-0085 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0086 | mbp | MBP-0086 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-004 | mbp | MBP-0086 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0087 | mbp | MBP-0087 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-005 | mbp | MBP-0087 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0088 | mbp | MBP-0088 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-006 | mbp | MBP-0088 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0089 | mbp | MBP-0089 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-007 | mbp | MBP-0089 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0090 | mbp | MBP-0090 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-008 | mbp | MBP-0090 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0091 | mbp | MBP-0091 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-009 | mbp | MBP-0091 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0092 | mbp | MBP-0092 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-010 | mbp | MBP-0092 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0093 | mbp | MBP-0093 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-011 | mbp | MBP-0093 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0094 | mbp | MBP-0094 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-012 | mbp | MBP-0094 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0095 | mbp | MBP-0095 | — | WATERFALL-PLAN.md | 2026-03-03 |
| POLISH-013 | mbp | MBP-0095 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0096 | mbp | MBP-0096 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-001 | mbp | MBP-0096 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0097 | mbp | MBP-0097 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-002 | mbp | MBP-0097 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0098 | mbp | MBP-0098 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-003 | mbp | MBP-0098 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0099 | mbp | MBP-0099 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-004 | mbp | MBP-0099 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0100 | mbp | MBP-0100 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-005 | mbp | MBP-0100 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0101 | mbp | MBP-0101 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-006 | mbp | MBP-0101 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0102 | mbp | MBP-0102 | — | WATERFALL-PLAN.md | 2026-03-03 |
| PORTAL-007 | mbp | MBP-0102 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0103 | mbp | MBP-0103 | — | WATERFALL-PLAN.md | 2026-03-03 |
| REPORT-001 | mbp | MBP-0103 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0104 | mbp | MBP-0104 | — | WATERFALL-PLAN.md | 2026-03-03 |
| REPORT-002 | mbp | MBP-0104 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0105 | mbp | MBP-0105 | — | WATERFALL-PLAN.md | 2026-03-03 |
| ROLE-001 | mbp | MBP-0105 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0106 | mbp | MBP-0106 | — | WATERFALL-PLAN.md | 2026-03-03 |
| ROLE-002 | mbp | MBP-0106 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0107 | mbp | MBP-0107 | — | WATERFALL-PLAN.md | 2026-03-03 |
| ROLE-003 | mbp | MBP-0107 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0108 | mbp | MBP-0108 | — | WATERFALL-PLAN.md | 2026-03-03 |
| ROLE-004 | mbp | MBP-0108 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0109 | mbp | MBP-0109 | — | WATERFALL-PLAN.md | 2026-03-03 |
| ROLE-005 | mbp | MBP-0109 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0110 | mbp | MBP-0110 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-001 | mbp | MBP-0110 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0111 | mbp | MBP-0111 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-002 | mbp | MBP-0111 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0112 | mbp | MBP-0112 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-003 | mbp | MBP-0112 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0113 | mbp | MBP-0113 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-004 | mbp | MBP-0113 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0114 | mbp | MBP-0114 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-005 | mbp | MBP-0114 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0115 | mbp | MBP-0115 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-006 | mbp | MBP-0115 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0116 | mbp | MBP-0116 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHED-007 | mbp | MBP-0116 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0117 | mbp | MBP-0117 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHEMA-001 | mbp | MBP-0117 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0118 | mbp | MBP-0118 | — | WATERFALL-PLAN.md | 2026-03-03 |
| SCHEMA-002 | mbp | MBP-0118 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0119 | mbp | MBP-0119 | — | WATERFALL-PLAN.md | 2026-03-03 |
| TAX-001 | mbp | MBP-0119 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0120 | mbp | MBP-0120 | — | WATERFALL-PLAN.md | 2026-03-03 |
| TAX-002 | mbp | MBP-0120 | — | WATERFALL-PLAN.md | 2026-03-03 |
| MBP-0121 | mbp | MBP-0121 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-001 | mbp | MBP-0121 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0122 | mbp | MBP-0122 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-002 | mbp | MBP-0122 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0123 | mbp | MBP-0123 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-003 | mbp | MBP-0123 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0124 | mbp | MBP-0124 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-004 | mbp | MBP-0124 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0125 | mbp | MBP-0125 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-005 | mbp | MBP-0125 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0126 | mbp | MBP-0126 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-006 | mbp | MBP-0126 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0127 | mbp | MBP-0127 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| GAP-007 | mbp | MBP-0127 | — | athelon-app/TECH-MVP-BUILD-PLAN.md | 2026-03-03 |
| MBP-0128 | mbp | MBP-0128 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A1 | mbp | MBP-0128 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0129 | mbp | MBP-0129 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A2 | mbp | MBP-0129 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0130 | mbp | MBP-0130 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A3 | mbp | MBP-0130 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0131 | mbp | MBP-0131 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A4 | mbp | MBP-0131 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0132 | mbp | MBP-0132 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A5 | mbp | MBP-0132 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0133 | mbp | MBP-0133 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| SCH-A6 | mbp | MBP-0133 | — | athelon-app/SCHEDULING-BUILD-PLAN.md | 2026-03-03 |
| MBP-0134 | mbp | MBP-0134 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBL-021 | mbp | MBP-0134 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBP-0135 | mbp | MBP-0135 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBL-025 | mbp | MBP-0135 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBP-0136 | mbp | MBP-0136 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBL-044 | mbp | MBP-0136 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBP-0137 | mbp | MBP-0137 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| MBL-051 | mbp | MBP-0137 | — | athelon-app/MASTER-BUILD-LIST.md | 2026-03-03 |
| `BACKEND-NEEDED-BH-01` | legacy | BACKEND-NEEDED-BH-01 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BACKEND-NEEDED-BH-P01` | legacy | BACKEND-NEEDED-BH-P01 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BACKEND-NEEDED-SM-01` | legacy | BACKEND-NEEDED-SM-01 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-001` | legacy | BH-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-002` | legacy | BH-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-003` | legacy | BH-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-004` | legacy | BH-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-005` | legacy | BH-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-006` | legacy | BH-006 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-007` | legacy | BH-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-008` | legacy | BH-008 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-009` | legacy | BH-009 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-010` | legacy | BH-010 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-011` | legacy | BH-011 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-LT3-001` | legacy | BH-LT3-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-LT3-002` | legacy | BH-LT3-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-LT3-003` | legacy | BH-LT3-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-LT3-004` | legacy | BH-LT3-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BH-QCM-001` | legacy | BH-QCM-001 | `BUG-017` | `app/(app)/compliance/ad-sb/page.tsx` | 2026-03-03 |
| `BH-QCM-002` | legacy | BH-QCM-002 | `BUG-QCM-F4` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BH-QCM-003` | legacy | BH-QCM-003 | `BUG-QCM-CERT-002` | `app/(app)/work-orders/[id]/certificates/page.tsx` | 2026-03-03 |
| `BH-QCM-004` | legacy | BH-QCM-004 | `BUG-QCM-ATA-001` | `app/(app)/compliance/audit-trail/page.tsx` | 2026-03-03 |
| `BUG-001` | legacy | BUG-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-001` | legacy | BUG-001 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `BUG-002` | legacy | BUG-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-003` | legacy | BUG-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-004` | legacy | BUG-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-005` | legacy | BUG-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-006` | legacy | BUG-006 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-007` | legacy | BUG-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-008` | legacy | BUG-008 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-009` | legacy | BUG-009 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-010` | legacy | BUG-010 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-011` | legacy | BUG-011 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-012` | legacy | BUG-012 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-013` | legacy | BUG-013 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-014` | legacy | BUG-014 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-015` | legacy | BUG-015 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-016` | legacy | BUG-016 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-017` | legacy | BUG-017 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-018` | legacy | BUG-018 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-019` | legacy | BUG-019 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-020` | legacy | BUG-020 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-021` | legacy | BUG-021 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-022` | legacy | BUG-022 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-023` | legacy | BUG-023 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-024` | legacy | BUG-024 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-025` | legacy | BUG-025 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-026` | legacy | BUG-026 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-027` | legacy | BUG-027 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-028` | legacy | BUG-028 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-029` | legacy | BUG-029 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-030` | legacy | BUG-030 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-031` | legacy | BUG-031 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-032` | legacy | BUG-032 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-033` | legacy | BUG-033 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-001` | legacy | BUG-BM-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-002` | legacy | BUG-BM-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-003` | legacy | BUG-BM-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-004` | legacy | BUG-BM-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-005` | legacy | BUG-BM-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-006` | legacy | BUG-BM-006 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-007` | legacy | BUG-BM-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-008` | legacy | BUG-BM-008 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-009` | legacy | BUG-BM-009 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-010` | legacy | BUG-BM-010 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-011` | legacy | BUG-BM-011 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-012` | legacy | BUG-BM-012 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-049` | legacy | BUG-BM-049 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-050` | legacy | BUG-BM-050 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-051` | legacy | BUG-BM-051 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-HUNT-001` | legacy | BUG-BM-HUNT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-HUNT-002` | legacy | BUG-BM-HUNT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-HUNT-003` | legacy | BUG-BM-HUNT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-BM-HUNT-004` | legacy | BUG-BM-HUNT-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-001` | legacy | BUG-DOM-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-002` | legacy | BUG-DOM-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-003` | legacy | BUG-DOM-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-004` | legacy | BUG-DOM-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-005` | legacy | BUG-DOM-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-006` | legacy | BUG-DOM-006 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-007` | legacy | BUG-DOM-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-048` | legacy | BUG-DOM-048 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-049` | legacy | BUG-DOM-049 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-050` | legacy | BUG-DOM-050 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-051` | legacy | BUG-DOM-051 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-1` | legacy | BUG-DOM-001 | `BUG-DOM-001` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-10` | legacy | BUG-DOM-10 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-11` | legacy | BUG-DOM-11 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-12` | legacy | BUG-DOM-12 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-2` | legacy | BUG-DOM-002 | `BUG-DOM-002` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-3` | legacy | BUG-DOM-003 | `BUG-DOM-003` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-4` | legacy | BUG-DOM-004 | `BUG-DOM-004` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-5` | legacy | BUG-DOM-005 | `BUG-DOM-005` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-6` | legacy | BUG-DOM-006 | `BUG-DOM-006` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-7` | legacy | BUG-DOM-007 | `BUG-DOM-007` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-8` | legacy | BUG-DOM-008 | `BUG-DOM-008` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-9` | legacy | BUG-DOM-009 | `BUG-DOM-009` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-HUNT-001` | legacy | BUG-DOM-HUNT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-HUNT-002` | legacy | BUG-DOM-HUNT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-HUNT-003` | legacy | BUG-DOM-HUNT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-DOM-HUNT-004` | legacy | BUG-DOM-HUNT-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-HUNTER-001` | legacy | BUG-HUNTER-001 | `BH-001` | `app/(app)/work-orders/[id]/rts/_components/RtsSignoffForm.tsx` | 2026-03-03 |
| `BUG-HUNTER-002` | legacy | BUG-HUNTER-002 | `BH-002` | `app/(app)/work-orders/[id]/rts/page.tsx` | 2026-03-03 |
| `BUG-HUNTER-003` | legacy | BUG-HUNTER-003 | `BH-003` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-LT-001` | legacy | BUG-LT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-002` | legacy | BUG-LT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-003` | legacy | BUG-LT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-004` | legacy | BUG-LT-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-010` | legacy | BUG-LT-010 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx` | 2026-03-03 |
| `BUG-LT-011` | legacy | BUG-LT-011 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-LT-26-001` | legacy | BUG-LT-26-001 | `—` | `app/(app)/work-orders/[id]/_components/DiscrepancyList.tsx` | 2026-03-03 |
| `BUG-LT-26-002` | legacy | BUG-LT-26-002 | `—` | `app/(app)/work-orders/[id]/_components/InductAircraftDialog.tsx` | 2026-03-03 |
| `BUG-LT-26-003` | legacy | BUG-LT-26-003 | `—` | `app/(app)/my-work/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-001` | legacy | BUG-LT-HUNT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-002` | legacy | BUG-LT-HUNT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-003` | legacy | BUG-LT-HUNT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-004` | legacy | BUG-LT-HUNT-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-005` | legacy | BUG-LT-HUNT-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-006` | legacy | BUG-LT-HUNT-006 | `—` | `app/(app)/work-orders/[id]/tasks/new/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-007` | legacy | BUG-LT-HUNT-007 | `—` | `app/(app)/work-orders/[id]/tasks/new/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-008` | legacy | BUG-LT-HUNT-008 | `—` | `app/(app)/work-orders/[id]/_components/WorkItemsList.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-009` | legacy | BUG-LT-HUNT-009 | `—` | `app/(app)/squawks/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-010` | legacy | BUG-LT-HUNT-010 | `—` | `app/(app)/my-work/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-011` | legacy | BUG-LT-HUNT-011 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-LT-HUNT-044` | legacy | BUG-LT-HUNT-044 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT-HUNT-045` | legacy | BUG-LT-HUNT-045 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT2-001` | legacy | BUG-LT2-001 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-LT2-002` | legacy | BUG-LT2-002 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx` | 2026-03-03 |
| `BUG-LT2-003` | legacy | BUG-LT2-003 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx` | 2026-03-03 |
| `BUG-LT2-004` | legacy | BUG-LT2-004 | `—` | `app/(app)/my-work/page.tsx` | 2026-03-03 |
| `BUG-LT2-005` | legacy | BUG-LT2-005 | `—` | `app/(app)/my-work/page.tsx` | 2026-03-03 |
| `BUG-LT2-006` | legacy | BUG-LT2-006 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-LT2-007` | legacy | BUG-LT2-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT2-007` | legacy | BUG-LT2-007 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx` | 2026-03-03 |
| `BUG-LT3-001` | legacy | BUG-LT3-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT3-002` | legacy | BUG-LT3-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT3-003` | legacy | BUG-LT3-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT3-004` | legacy | BUG-LT3-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT4-001` | legacy | BUG-LT4-001 | `—` | `app/(app)/work-orders/[id]/records/_components/CreateRecordForm.tsx` | 2026-03-03 |
| `BUG-LT4-002` | legacy | BUG-LT4-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT4-002` | legacy | BUG-LT4-002 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignCardDialog.tsx` | 2026-03-03 |
| `BUG-LT4-003` | legacy | BUG-LT4-003 | `—` | `app/(app)/work-orders/[id]/tasks/new/page.tsx` | 2026-03-03 |
| `BUG-LT4-004` | legacy | BUG-LT4-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-LT4-004` | legacy | BUG-LT4-004 | `—` | `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` | 2026-03-03 |
| `BUG-PC-001` | legacy | BUG-PC-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-002` | legacy | BUG-PC-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-003` | legacy | BUG-PC-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-004` | legacy | BUG-PC-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-005` | legacy | BUG-PC-005 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-006` | legacy | BUG-PC-006 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-007` | legacy | BUG-PC-007 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-008` | legacy | BUG-PC-008 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-009` | legacy | BUG-PC-009 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-010` | legacy | BUG-PC-010 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-011` | legacy | BUG-PC-011 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-012` | legacy | BUG-PC-012 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-045` | legacy | BUG-PC-045 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-046` | legacy | BUG-PC-046 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-047` | legacy | BUG-PC-047 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-PC-048` | legacy | BUG-PC-048 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-001` | legacy | BUG-QCM-001 | `—` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BUG-QCM-002` | legacy | BUG-QCM-002 | `—` | `app/(app)/compliance/ad-sb/page.tsx` | 2026-03-03 |
| `BUG-QCM-003` | legacy | BUG-QCM-003 | `—` | `app/(app)/compliance/_components/AircraftComplianceCard.tsx` | 2026-03-03 |
| `BUG-QCM-004` | legacy | BUG-QCM-004 | `—` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BUG-QCM-047` | legacy | BUG-QCM-047 | `—` | `app/(app)/fleet/[tail]/_components/AircraftAdComplianceTab.tsx` | 2026-03-03 |
| `BUG-QCM-048` | legacy | BUG-QCM-048 | `—` | `app/(app)/compliance/audit-trail/page.tsx` | 2026-03-03 |
| `BUG-QCM-049` | legacy | BUG-QCM-049 | `—` | `app/(app)/compliance/audit-trail/page.tsx` | 2026-03-03 |
| `BUG-QCM-052` | legacy | BUG-QCM-052 | `—` | `app/(app)/compliance/ad-sb/page.tsx` | 2026-03-03 |
| `BUG-QCM-1` | legacy | BUG-QCM-001 | `BUG-QCM-001` | `app/(app)/compliance/ad-sb/page.tsx` | 2026-03-03 |
| `BUG-QCM-2` | legacy | BUG-QCM-002 | `BUG-QCM-002` | `app/(app)/compliance/ad-sb/page.tsx` | 2026-03-03 |
| `BUG-QCM-3` | legacy | BUG-QCM-003 | `BUG-QCM-003` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BUG-QCM-4` | legacy | BUG-QCM-004 | `BUG-QCM-004` | `app/(app)/compliance/_components/FleetComplianceStats.tsx` | 2026-03-03 |
| `BUG-QCM-AT-001` | legacy | BUG-QCM-AT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-AT-001` | legacy | BUG-QCM-AT-001 | `—` | `app/(app)/compliance/audit-trail/page.tsx` | 2026-03-03 |
| `BUG-QCM-AT-002` | legacy | BUG-QCM-AT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-AT-002` | legacy | BUG-QCM-AT-002 | `—` | `app/(app)/compliance/audit-trail/page.tsx` | 2026-03-03 |
| `BUG-QCM-AT-003` | legacy | BUG-QCM-AT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-ATA-001` | legacy | BUG-QCM-ATA-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-BLE-001` | legacy | BUG-QCM-BLE-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-C1` | legacy | BUG-QCM-C1 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-C2` | legacy | BUG-QCM-C2 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-C3` | legacy | BUG-QCM-C3 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-C4` | legacy | BUG-QCM-C4 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-CERT-001` | legacy | BUG-QCM-CERT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-CERT-002` | legacy | BUG-QCM-CERT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-DATE-001` | legacy | BUG-QCM-DATE-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-DEEP-001` | legacy | BUG-QCM-DEEP-001 | `—` | `app/(app)/fleet/[tail]/_components/AircraftAdComplianceTab.tsx` | 2026-03-03 |
| `BUG-QCM-EMPTY-001` | legacy | BUG-QCM-EMPTY-001 | `—` | `app/(app)/fleet/[tail]/_components/AircraftAdComplianceTab.tsx` | 2026-03-03 |
| `BUG-QCM-F1` | legacy | BUG-QCM-F1 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-F2` | legacy | BUG-QCM-F2 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-F3` | legacy | BUG-QCM-F3 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-F4` | legacy | BUG-QCM-F4 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-MNA-001` | legacy | BUG-QCM-MNA-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-PS-001` | legacy | BUG-QCM-PS-001 | `—` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BUG-QCM-PS-002` | legacy | BUG-QCM-PS-002 | `—` | `app/(app)/compliance/qcm-review/page.tsx` | 2026-03-03 |
| `BUG-QCM-REC-001` | legacy | BUG-QCM-REC-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-REC-002` | legacy | BUG-QCM-REC-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-RFD-001` | legacy | BUG-QCM-RFD-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-SCD-001` | legacy | BUG-QCM-SCD-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-SSD-001` | legacy | BUG-QCM-SSD-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-QCM-TAB-001` | legacy | BUG-QCM-TAB-001 | `—` | `app/(app)/fleet/[tail]/page.tsx` | 2026-03-03 |
| `BUG-QCM-TC-001` | legacy | BUG-QCM-TC-001 | `—` | `app/(app)/work-orders/[id]/_components/WOComplianceTab.tsx` | 2026-03-03 |
| `BUG-SM-001` | legacy | BUG-SM-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-002` | legacy | BUG-SM-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-003` | legacy | BUG-SM-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-004` | legacy | BUG-SM-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-010` | legacy | BUG-SM-010 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-011` | legacy | BUG-SM-011 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-012` | legacy | BUG-SM-012 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-HUNT-001` | legacy | BUG-SM-HUNT-001 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-HUNT-002` | legacy | BUG-SM-HUNT-002 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-HUNT-003` | legacy | BUG-SM-HUNT-003 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `BUG-SM-HUNT-004` | legacy | BUG-SM-HUNT-004 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `FEAT-110` | legacy | FEAT-110 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `FEAT-110` | legacy | FEAT-110 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-001` | legacy | FEAT-LARGE-001 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-002` | legacy | FEAT-LARGE-002 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-003` | legacy | FEAT-LARGE-003 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-004` | legacy | FEAT-LARGE-004 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-005` | legacy | FEAT-LARGE-005 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-006` | legacy | FEAT-LARGE-006 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `FEAT-LARGE-007` | legacy | FEAT-LARGE-007 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `GAP-01` | legacy | GAP-01 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-01` | legacy | GAP-01 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-01` | legacy | GAP-01 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-01` | legacy | GAP-01 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-02` | legacy | GAP-02 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-02` | legacy | GAP-02 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-02` | legacy | GAP-02 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-02` | legacy | GAP-02 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-03` | legacy | GAP-03 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-03` | legacy | GAP-03 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-03` | legacy | GAP-03 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-03` | legacy | GAP-03 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-04` | legacy | GAP-04 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-04` | legacy | GAP-04 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-04` | legacy | GAP-04 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-04` | legacy | GAP-04 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-05` | legacy | GAP-05 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-05` | legacy | GAP-05 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-05` | legacy | GAP-05 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-05` | legacy | GAP-05 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-06` | legacy | GAP-06 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-06` | legacy | GAP-06 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-06` | legacy | GAP-06 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-06` | legacy | GAP-06 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-07` | legacy | GAP-07 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-07` | legacy | GAP-07 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-07` | legacy | GAP-07 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-07` | legacy | GAP-07 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-08` | legacy | GAP-08 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-08` | legacy | GAP-08 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-08` | legacy | GAP-08 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-08` | legacy | GAP-08 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-09` | legacy | GAP-09 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-09` | legacy | GAP-09 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-09` | legacy | GAP-09 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-09` | legacy | GAP-09 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-10` | legacy | GAP-10 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-10` | legacy | GAP-10 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-10` | legacy | GAP-10 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-10` | legacy | GAP-10 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-11` | legacy | GAP-11 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-11` | legacy | GAP-11 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-11` | legacy | GAP-11 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-11` | legacy | GAP-11 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-12` | legacy | GAP-12 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-12` | legacy | GAP-12 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-12` | legacy | GAP-12 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-12` | legacy | GAP-12 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-13` | legacy | GAP-13 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-13` | legacy | GAP-13 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-13` | legacy | GAP-13 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-13` | legacy | GAP-13 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-14` | legacy | GAP-14 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-14` | legacy | GAP-14 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-14` | legacy | GAP-14 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-14` | legacy | GAP-14 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-15` | legacy | GAP-15 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-15` | legacy | GAP-15 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-15` | legacy | GAP-15 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-15` | legacy | GAP-15 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-16` | legacy | GAP-16 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-16` | legacy | GAP-16 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-16` | legacy | GAP-16 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-16` | legacy | GAP-16 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-17` | legacy | GAP-17 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-17` | legacy | GAP-17 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-17` | legacy | GAP-17 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-17` | legacy | GAP-17 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-18` | legacy | GAP-18 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-18` | legacy | GAP-18 | `—` | `AUDIT-PHASES-5-7.md` | 2026-02-26 |
| `GAP-18` | legacy | GAP-18 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-18` | legacy | GAP-18 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-18` | legacy | GAP-18 | `—` | `MASTER-BUILD-LIST.md` | 2026-03-03 |
| `GAP-19` | legacy | GAP-19 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-19` | legacy | GAP-19 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-19` | legacy | GAP-19 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-20` | legacy | GAP-20 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-20` | legacy | GAP-20 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-20` | legacy | GAP-20 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-21` | legacy | GAP-21 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-21` | legacy | GAP-21 | `—` | `AUDIT-PHASES-8-10.md` | 2026-02-26 |
| `GAP-21` | legacy | GAP-21 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-22` | legacy | GAP-22 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-22` | legacy | GAP-22 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-23` | legacy | GAP-23 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-23` | legacy | GAP-23 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-24` | legacy | GAP-24 | `—` | `AUDIT-PHASES-1-4.md` | 2026-02-26 |
| `GAP-24` | legacy | GAP-24 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `GAP-25` | legacy | GAP-25 | `—` | `BILLING-GAP-ANALYSIS.md` | 2026-02-25 |
| `ISSUE-001` | legacy | ISSUE-001 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `ISSUE-002` | legacy | ISSUE-002 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `ISSUE-003` | legacy | ISSUE-003 | `—` | `QA-FINAL-REPORT.md` | 2026-02-25 |
| `TD-001` | legacy | TD-001 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-001` | legacy | TD-001 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-002` | legacy | TD-002 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-002` | legacy | TD-002 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-003` | legacy | TD-003 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-003` | legacy | TD-003 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-004` | legacy | TD-004 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-004` | legacy | TD-004 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-005` | legacy | TD-005 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-005` | legacy | TD-005 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-006` | legacy | TD-006 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-006` | legacy | TD-006 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-007` | legacy | TD-007 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-007` | legacy | TD-007 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-008` | legacy | TD-008 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-008` | legacy | TD-008 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-009` | legacy | TD-009 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-009` | legacy | TD-009 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-010` | legacy | TD-010 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-010` | legacy | TD-010 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-011` | legacy | TD-011 | `—` | `TECH-DEBT-REPORT.md` | 2026-02-26 |
| `TD-011` | legacy | TD-011 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-012` | legacy | TD-012 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-013` | legacy | TD-013 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-014` | legacy | TD-014 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-015` | legacy | TD-015 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-016` | legacy | TD-016 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |
| `TD-017` | legacy | TD-017 | `—` | `TECHNICAL-DEBT.md` | 2026-02-26 |

## Appendix Index

| Appendix | Path | Scope |
|---|---|---|
| Bug Hunter Categorization Ledger | `docs/feature-spec-appendices/bug-hunter-categorization-ledger.md` | Verbatim migrated categorization ledger from legacy master file. |
| Detected Features Log | `docs/feature-spec-appendices/detected-features-log.md` | Verbatim detected-feature records and alias captures. |
| QA Artifact Reconciliation Log | `docs/feature-spec-appendices/qa-artifact-reconciliation-log.md` | Verbatim QA and audit reconciliation entries. |
| Bug Hunter Run Log | `docs/feature-spec-appendices/bug-hunter-run-log.md` | Verbatim automation run log and permissions block. |
| Autonomous Improvements and Fix History | `docs/feature-spec-appendices/autonomous-improvements-and-fix-history.md` | Verbatim historical autonomous improvement and bug-fix cycle records. |
| Migration Manifest | `docs/feature-spec-appendices/MIGRATION-MANIFEST.md` | Line-count and checksum parity for relocated blocks. |

## Derived Artifact Export

Run from repo root:

```bash
pnpm --dir apps/athelon-app run spec:export:derived
```

This command regenerates derived reference artifacts from Registry B, C, and D:
1. `docs/plans/MASTER-FEATURE-REGISTRY.csv`
2. `docs/plans/MASTER-FEATURE-CROSSWALK.md`
3. `docs/plans/MASTER-BUILD-PLAN.md`
4. `docs/plans/MASTER-ROUTE-CAPABILITY-REGISTRY.csv`
5. `docs/plans/MASTER-ROUTE-CATEGORY-ROLLUP.md`

## Migration Parity Snapshot

- Registry A rows: **69**
- Registry B rows: **153**
- Registry C rows: **101**
- Registry D rows: **17**
- Feature narrative entries: **69**
- Route narrative entries: **101**
- Unmapped MBP rows: **0**
- Route rows without FS/MBP mapping: **0**
- Alias rows: **670**
- Interconnection edges: **42**
