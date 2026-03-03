# Time Tracking Synthesis: Athalon + Prior System

Date: 2026-03-02  
Status: Design synthesis (no code changes)  
Inputs:
- Athalon plan: `docs/plans/2026-03-02-time-tracking-and-billing-architecture-plan.md`
- Prior implementation review: `/Users/samuelsandifer/Desktop/time-tracking-system-review.md`

## 1) Why this synthesis exists

Athalon already has backend-centric work-order time entries, approvals, and invoice generation hooks.  
Your prior system adds a strong technician UX layer: global runtime timers, pause/resume, cross-tab recovery, manual entry ergonomics, and richer live safeguards.

This document combines both into a single target architecture that is:
- Technician-fast in day-to-day operation.
- Auditor-strong for billing/financial traceability.
- Compatible with Athalon work order/task/step workflows.

## 2) Feature comparison and merge decisions

### 2.1 Timer runtime model

Prior system:
- `TimerContext` runs client-side timer sessions.
- Most sessions persist only on stop.
- `localStorage` recovery + `BroadcastChannel` sync.
- Server running-timer APIs also exist, creating dual-model complexity.

Athalon plan:
- Server-authoritative open `timeEntries` model.
- Add explicit contexts (`shop`, `work_order`, `task`, `step`) and approval-to-billing lock.

Merged decision:
- Keep server as source of truth for active timers.
- Keep a lightweight client runtime mirror for UX smoothness (instant elapsed updates, offline queue, tab sync).
- Remove dual-model ambiguity: client cannot be the only source of active state once timer starts.

Implementation note:
- Start timer = immediate server mutation creating an open entry.
- Client stores mirror (`activeEntryId`, last heartbeat, elapsed offset) and syncs via BroadcastChannel.

### 2.2 Clock-in entry points

Prior system strengths:
- Multiple surfaces: time page, floating widget, sidebar/mobile widget, project/task/checklist drill-ins.

Athalon current state:
- Central `/billing/time-clock` page, plus WO/task pages with step lifecycle but not full timer actions.

Merged decision:
- Introduce consistent timer controls in all operational surfaces:
  - Global header/floating timer.
  - Work order page (WO-level clock-in).
  - Task card page (task-level and step-level clock-in).
  - Supervisor console (`/billing/time-clock`) for oversight/corrections.

Mapping:
- Prior `project` => Athalon `workOrder`.
- Prior `task` => Athalon `taskCard`.
- Prior `checklistItem` => Athalon `taskCardStep`.

### 2.3 Timer lifecycle behavior

Prior system strengths:
- Start, pause, resume, stop, discard.
- Runtime warnings (>12h, <1m).

Athalon plan:
- Start/stop/switch context, strict invariants, overlap control.

Merged decision:
- Preserve `pause/resume` UX because technicians need interruption handling.
- Persist pause state server-side as segmented time, not only client flags.
- Do not auto-start timers from status changes; timers start only from explicit technician actions.

Recommended data extension:
- `timeEntrySegments` table (or embedded segment array) with:
  - `timeEntryId`
  - `segmentStartAt`
  - `segmentEndAt`
  - `segmentType` (`active`, `pause`, `break`)

Benefit:
- Accurate duration reconstruction, better auditability, robust multi-device recovery.

### 2.4 Manual time entry and corrections

Prior system strengths:
- Manual add/edit with:
  - Clock in/out mode.
  - Duration + anchor mode.
  - Midnight crossing handling.
  - Editable billable/rate/notes.

Athalon plan:
- Focused on clock-in/out flows; correction model not yet deeply specified.

Merged decision:
- Keep full manual entry capability for supervisor/backfill/payroll correction workflows.
- Add correction policy:
  - Pre-approval edits allowed with audit trail.
  - Post-approval edits require rejection+replace or controlled override.
  - Post-billing edits require credit/rebill flow.

### 2.5 Billing and review workflow

Prior system strengths:
- `reviewStatus` lifecycle and billed/unbilled toggles.
- mark/unmark billed patterns.

Athalon current gap:
- Approval exists, but invoice generation is not consistently approval-gated.

Merged decision:
- Adopt strict labor contract:
  - Invoice labor source = approved + unbilled entries only.
  - Invoice rollups = by work order and task card.
  - Internal visibility = technician-level and task-step/checklist-level drill-down for audit and operations.
  - Billed entries receive immutable linkage (`billedInvoiceId`, `billedLineItemId`, `billedAt`).
  - No unmark billed after posted invoice without reversal workflow.

### 2.6 Data integrity and validation

Prior system gap observed:
- Partial foreign-key relationship validation on updates.

Athalon synthesis rule:
- Every mutation that sets/changes context IDs must validate full lineage:
  - `taskCard` belongs to `workOrder`.
  - `taskStep` belongs to `taskCard` and same `workOrder`.
  - `orgId` ownership across all references.

### 2.7 Guardrails and exception handling

Prior system strengths:
- Single active timer checks and deletion safeguards.

Athalon plan:
- Policy-driven concurrency and anomaly detection.

Merged decision:
- Hard single-active timer enforcement per technician (no concurrent timer override).
- Add anomaly queue for:
  - overlaps,
  - missing clock-outs,
  - long sessions,
  - orphaned context references.

## 3) Unified target capabilities (minimum + recommended)

### 3.1 Minimum capabilities (required)

1. Shop/internal timer with no work order.  
2. Work order task-card timer.  
3. Task-step timer under specific task card and work order.

### 3.2 Recommended capabilities from legacy system

1. Global quick timer widget available everywhere in-app.  
2. Pause/resume with server-side segment persistence.  
3. Cross-tab/device recovery (`BroadcastChannel` + server active entry query).  
4. Manual time entry modes (clock range and duration anchor).  
5. Warnings and guardrails (<1m, >12h, overlap pre-check).  
6. Bulk review and exception handling queue.  
7. Strong billed-entry lock semantics for accounting integrity.

## 4) Unified data model (proposed)

### 4.1 `timeEntries` (authoritative ledger)

Core:
- `orgId`
- `technicianId`
- `entryType`: `shift | shop | work_order | task | step | break | admin`
- `workOrderId?`
- `taskCardId?`
- `taskStepId?`
- `shopActivityCode?`
- `clockInAt`
- `clockOutAt?`
- `durationMinutes`
- `notes?`

Billing/review:
- `billingClass`: `billable | non_billable | warranty | internal | absorbed`
- `rateAtTime`
- `approvalStatus`: `pending | approved | rejected`
- `approvedByTechId?`, `approvedAt?`
- `rejectedByTechId?`, `rejectedAt?`, `rejectionReason?`
- `billedInvoiceId?`, `billedLineItemId?`, `billedAt?`, `billingLock`

### 4.2 `timeEntrySegments` (recommended for pause/resume fidelity)

- `timeEntryId`
- `segmentStartAt`
- `segmentEndAt?`
- `segmentType`
- `createdBySource` (`widget`, `wo_page`, `task_page`, `admin_edit`, etc.)

## 5) Unified API shape (proposed)

Time capture:
- `startTimer(context)`
- `pauseTimer(activeEntryId)`
- `resumeTimer(activeEntryId)`
- `stopTimer(activeEntryId)`
- `discardOpenTimer(activeEntryId)` (policy-restricted)
- `switchTimerContext(activeEntryId, newContext)` (atomic)

Manual/correction:
- `createManualTimeEntry(...)`
- `updateTimeEntry(...)` (audit + policy checks)
- `deleteTimeEntry(...)` (role-restricted)

Review/billing:
- `approveTimeEntry(...)`
- `rejectTimeEntry(...)`
- `bulkApproveTimeEntries(...)`
- `createInvoiceFromWorkOrder(...)` (approved+unbilled filter mandatory, rollup by WO + task card)

## 6) UI synthesis blueprint

1. Global timer (new):
- Always visible for technician role.
- Context selector: shop, WO, task, step.
- Start/pause/resume/stop, notes, elapsed.

2. Work order page:
- “Clock to WO” quick action.
- Show active labor and totals by task.
- Show who is currently clocked in to the WO.
- Show clock-in history scoped to WO and child task/step (checklist item) contexts.

3. Task card page:
- “Clock to task” and “Clock to step”.
- Step timer starts only from explicit user action (no auto-start on `in_progress`).
- Prevent step signoff when open step timer exists (unless supervisory override).
- Show checklist item (task step) clock-in history with technician attribution.

4. Billing time console:
- Supervisor controls (force clock-out, corrections).
- Approvals, anomalies, and unbilled approved labor queue.

5. Profile/timesheet:
- Personal daily/weekly view with review/billing state.

## 7) Phased merged rollout

### Phase A: Contract safety first
- Enforce approved+unbilled invoice labor filter.
- Add billed linkage lock fields.
- Add full context lineage validation.

### Phase B: Runtime UX unification
- Introduce global timer widget backed by server-open entries.
- Add pause/resume + cross-tab sync.

### Phase C: Context depth
- Add shop timer.
- Add task/step timers in WO task-card UI.

### Phase D: Supervisor and analytics maturity
- Exception queue + bulk review.
- Utilization and margin dashboards from approved entries.

### Phase E: Accounting hardening
- Reversal flows for billed corrections.
- QuickBooks sync with labor provenance metadata.

## 8) Key synthesis choices (explicit)

1. Hard single-active timer enforcement per technician.  
2. No auto-start timers; all starts are explicit user actions.  
3. Invoice labor rollup at work order + task card level.  
4. Internal operations views must show active clock-ins and clock-in history at work order/task/checklist-item (step) levels, including technician attribution.  
5. Context-based timer defaults are required (`shop` non-billable by default; WO/task/step billable by default).  
6. Keep prior UX richness (global widget, pause/resume, manual modes) while making server state authoritative.  
7. Maintain strict lineage validation and approved+unbilled+billed-lock accounting rules.

## 9) Remaining clarification question

1. After a time entry is approved, should supervisors edit in place, or should correction require reject-and-replace?
