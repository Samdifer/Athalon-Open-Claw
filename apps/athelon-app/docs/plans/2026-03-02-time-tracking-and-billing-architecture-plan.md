# Athalon Time Tracking + Billing Architecture Plan

Date: 2026-03-02  
Status: Discovery and design only (no code changes)  
Scope: End-to-end planning for technician time capture, approval, billing, reporting, and financial sync

## 1) Objective

Define where and how Athalon should implement standard aviation-MRO time tracking so technician time can reliably drive billing and reporting.

Required minimum capabilities:
- Clock into generic shop/internal time not tied to a customer work order.
- Clock into a work order at task-card level.
- Clock into a specific task step under a specific task card.

Additional in-scope planning:
- Technician dashboards and profile-level time views.
- Approval controls.
- Billing generation from approved labor.
- Reporting and financial-backend integration touchpoints.

## 2) External System Baseline (EBIS + CORRIDOR)

This plan aligns to common patterns visible in EBIS and CORRIDOR:

- EBIS separates two layers:
  - Shift time clock (on-site time).
  - Work order service timers (work-performed time tied to billable/non-billable work).
- EBIS analytics rely on both layers to measure efficiency, billable %, and shop/internal allocation.
- CORRIDOR emphasizes:
  - Work-order and task/step execution capture.
  - Mobile technician labor entry.
  - Time & Attendance + work-performed labor + invoicing/reporting integration.
  - Internal/non-revenue work order handling as first-class operations.

Reference URLs:
- https://support.ebiscloud.com/-time-clock
- https://support.ebiscloud.com/technician-efficiency-dashboard-overview
- https://www.corridor.aero/work-order/
- https://www.corridor.aero/corridor-go/
- https://www.corridor.aero/time-attendance-module/
- https://www.corridor.aero/invoicing-module/

## 3) Current Athalon State (As-Is)

### 3.1 Core time tracking already present

- `convex/timeClock.ts` supports `clockIn`, `clockOut`, `listTimeEntries`, work-order labor summaries.
- `timeEntries` currently require `workOrderId`.
- `taskCardId` is optional.
- Approval metadata exists on `timeEntries` (`approved`, `approvedAt`, `rejectedAt`, etc.).

### 3.2 Current UI surfaces

- `/billing/time-clock` supports manual clock-in/out and active entries list.
- `/billing/time-approval` supports approve/reject workflow.
- Routing exists in `App.tsx` for both pages.

### 3.3 Work order / task / step execution exists but is not labor-timer integrated

- Task card and step lifecycle are implemented (`convex/taskCards.ts`, `convex/gapFixes.ts` step start).
- Task step start data exists (`startedByTechnicianId`, `startedAt`) but there is no dedicated step-level time entry linkage.
- Task page currently supports "start step" and signoff, not explicit "clock labor against this step."

### 3.4 Billing and reporting linkage gaps

- Invoice generation from work orders pulls labor from `timeEntries`.
- Approval state is not consistently enforced as a prerequisite for billing totals.
- Financial reporting primarily reads invoice totals, not raw approved labor slices by dimension.

### 3.5 Navigation and discoverability gap

- Time clock/approval routes exist, but billing submenu discoverability is uneven for daily technician flow.

### 3.6 Financial backend readiness

- QuickBooks integration scaffolding exists, but sync actions are stubs and not enforcing labor provenance/approval contract yet.

## 4) Standard Time Tracking Capability Map (To-Be)

Athalon should support all four standard labor contexts, not only the three minimum asks:

1. Shift/attendance time
- Technician clock-in/out for paid time on site.
- Independent from customer billing.

2. Shop/internal non-WO productive time
- Track internal activities (training, hangar organization, tooling, QA prep).
- Non-customer-billable by default but reportable for utilization and cost.

3. Work order task-card time
- Labor against a specific WO + task card.
- Billable behavior depends on customer contract/rate profile.

4. Work order task-step time
- Labor against WO + task card + step.
- Enables detailed actual-vs-estimate, rework analysis, and high-fidelity audit trail.

## 5) Proposed Data Model Evolution

### 5.1 Time entry classification

Add explicit classification on each time entry, for example:
- `entryType`: `shift | shop | work_order | task | step | break | admin`
- `billingClass`: `billable | non_billable | absorbed | warranty | internal`

### 5.2 Association fields

Evolve `timeEntries` to allow optional context depending on `entryType`:
- `workOrderId?`
- `taskCardId?`
- `taskStepId?` (new; references `taskCardSteps`)
- `shopActivityCode?` (new; training/admin/tooling/etc.)
- `source` (manual, scanner, mobile, auto-transition)

### 5.3 Invariants and guardrails

- One active entry per technician at a time (default strict mode), with optional org setting for concurrent entries.
- Step entry requires valid parent task + WO consistency check.
- Closed/voided WO or completed/voided task cannot accept new billable entries.
- Clock-out is server-authoritative for duration calculation.
- Editing closed/approved entries requires explicit override audit.

### 5.4 Approval and billing fields

Keep and strengthen approval fields on `timeEntries`:
- `approvalStatus`: `pending | approved | rejected`
- `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`
- Add invoice linkage fields:
  - `billedInvoiceId?`
  - `billedLineItemId?`
  - `billedAt?`
  - `billingLock` (prevent double billing)

## 6) API and Backend Workstreams

### 6.1 Time capture APIs

Extend `convex/timeClock.ts` (or split into `timeTracking.ts`) with explicit intents:
- `clockInShift`
- `clockOutShift`
- `startShopTimer` / `stopShopTimer`
- `startWorkOrderTimer` / `stopWorkOrderTimer`
- `startTaskTimer` / `stopTaskTimer`
- `startStepTimer` / `stopStepTimer`
- `switchTimerContext` (atomic stop+start to reduce overlap errors)

### 6.2 Validation and policy APIs

- `getActiveTimerForTechnician`
- `canStartTimerContext` (policy preflight)
- `listTimeEntriesByContext`
- `listUnapprovedTimeForPeriod`
- `lockTimeEntriesForPayrollPeriod`

### 6.3 Billing integration APIs

Update billing creators so labor pulls only approved, unbilled entries:
- `billing.createInvoiceFromWorkOrder`
- `gapFixes.createInvoiceFromWorkOrderEnhanced`

Required behavior:
- Filter: `approvalStatus == approved`
- Exclude already billed entries
- Roll up invoice labor lines by work order and task card
- Keep internal drill-down views by technician and task step/checklist item
- Mark consumed entries as billed

### 6.4 Configuration surface

Org-level settings table additions:
- Hard single-active timer enforcement policy.
- Rounding increment rules (e.g., 6/10/15 min).
- Auto-break policy.
- Shop activity taxonomy.
- Default billing class by context.

## 7) Frontend Surfaces to Enable

### 7.1 Global technician timer control

Add a persistent timer widget in app shell:
- Start/stop/switch context.
- Show active context and elapsed time.
- Fast path for shop vs WO/task/step selection.

### 7.2 Billing > Time Clock (supervisor/admin console)

Keep as operational oversight page:
- Active timers.
- Forced clock-out and correction flows.
- Entry audit history.
- Bulk approval prep.

### 7.3 Work Order detail page

Add labor panel on `/work-orders/[id]`:
- Start WO-level timer.
- View active technicians on this WO.
- Labor totals by task and billing class.
- Clock-in history at WO level, with drill-down into task and step/checklist-item history.

### 7.4 Task card page

On `/work-orders/[id]/tasks/[cardId]`:
- Start/stop task-level timer.
- For each step, start/stop step-level timer by explicit user action only.
- Prevent step signoff with open step timer (policy choice).
- Inline visibility: estimated vs actual labor by step.
- Show technician-attributed step/checklist-item clock-in history.

### 7.5 Technician profile and personal timesheet view

Add profile pages:
- Active timer.
- Daily/weekly timesheet.
- Breakdown: shift vs shop vs WO billable.
- Approval status and rejection reasons.

### 7.6 Approval workspace

Enhance `/billing/time-approval`:
- Filter by context (shop/task/step).
- Bulk approve by supervisor.
- Exception queue for overlaps/missing clock-outs/long duration anomalies.

### 7.7 Reporting dashboards

New or expanded dashboard cards:
- Utilization: shift vs productive vs billable.
- WO labor burn vs estimate.
- Step-level overrun heatmap.
- Unbilled approved labor aging.

## 8) Billing, Financials, and Reporting Contracts

### 8.1 Canonical labor-to-invoice contract

Labor line generation should follow:
- Source = approved, unbilled time entries only.
- Rollup level = work order + task card.
- Internal views retain technician and step/checklist-item attribution.
- Traceability = invoice line links back to entry IDs.
- Immutable accounting trail once invoice is posted.

### 8.2 Financial reporting

Add reporting dataset derived from approved time entries:
- Daily labor cost and billable value.
- Margin by WO/task/step.
- Internal/shop absorption costs.

### 8.3 External accounting sync

When QuickBooks sync becomes active:
- Export invoice lines with labor provenance metadata.
- Preserve mapping from time-entry classes to GL account buckets.
- Sync status and failures visible per invoice and per labor batch.

## 9) Phased Implementation Plan

### Phase 0: Foundation hardening
- Add explicit `approvalStatus` and billing linkage fields.
- Enforce approved-only labor inclusion in invoice generation.
- Add hard single-active-entry enforcement and overlap checks.

### Phase 1: Shop/internal time
- Support non-WO shop timers.
- Add activity codes and non-billable defaults.
- Add shop visibility to technician dashboard and reports.

### Phase 2: WO task and step timers
- Add `taskStepId` support.
- Integrate timer controls in task-card page.
- Add estimate-vs-actual labor displays by task/step.

### Phase 3: Billing and finance integration maturity
- Incremental billing from approved labor pools.
- Mark-as-billed locking and reconciliation tooling.
- QuickBooks sync contract for labor lines.

### Phase 4: Analytics and operational controls
- Efficiency dashboard, unbilled aging, overrun diagnostics.
- Supervisor exception queue and audit exports.

## 10) Migration and Compatibility Notes

- Migration should be additive first:
  - Preserve existing WO time entries.
  - Backfill `entryType` for historical rows (`work_order` default where WO exists).
  - Keep legacy APIs operational while new intent APIs are introduced.
- Introduce read-adapters so old screens continue functioning during transition.

## 11) Risks and Decisions Needed

Decisions already locked:
- Hard single-active timer enforcement per technician.
- Step timers do not auto-start from step status changes.
- Context-based timer defaults are required.
- Invoice labor rollup is by work order + task card, with internal technician and step/checklist-item attribution.

Remaining decisions:
- Rounding policy for billing vs payroll vs analytics.
- Whether approved/rejected time is editable in place or requires corrected replacement entries.
- How to handle labor against closed WOs for correction entries.

Primary risks:
- Double billing if billed-link lock is not enforced.
- Technician workflow friction if timer switching is too slow.
- Data quality drift without anomaly detection (overlaps, missing clock-outs, 12h+ entries).

## 12) Test Strategy (Design-Level)

Minimum required test coverage for implementation phase:
- Unit tests for timer lifecycle invariants and duration calculations.
- Authorization tests for technician/supervisor/admin permissions.
- Integration tests for approval-to-invoice flow.
- Regression tests ensuring legacy WO billing still works.
- E2E tests:
  - Shop timer start/stop.
  - WO task timer start/stop.
  - Step timer with signoff.
  - Approval and invoice generation from approved-only labor.

## 13) Concrete Build Touchpoints in Current Codebase

Backend:
- `convex/schema.ts` (`timeEntries`, org settings, invoice linkage fields)
- `convex/timeClock.ts` (timer lifecycle + context support)
- `convex/billing.ts` and `convex/gapFixes.ts` (approved-only invoice labor)
- `convex/billingV4.ts` / `convex/billingV4b.ts` (approval workflows + filters)
- `convex/capacity.ts` (actual labor-aware utilization options)
- `convex/quickbooks.ts` (eventual labor export sync contract)

Frontend:
- `app/(app)/billing/time-clock/page.tsx`
- `app/(app)/billing/time-approval/page.tsx`
- `app/(app)/work-orders/[id]/page.tsx`
- `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- `app/(app)/dashboard/_components/TechUtilizationChart.tsx`
- `app/(app)/reports/financials/page.tsx`
- `components/AppSidebar.tsx`
- `App.tsx` (route and discoverability alignment)

## 14) Recommended Next Action

Use this plan as the implementation blueprint and convert it into a ticketed backlog (schema, API, UI, billing, reporting, migration, tests), starting with Phase 0 approval-to-billing hardening before adding new timer contexts.
