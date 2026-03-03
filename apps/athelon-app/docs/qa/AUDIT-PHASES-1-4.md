# Athelon Aviation MRO — Technical Audit: Phases 1–4
## Technician Perspective Gap Analysis

**Auditor**: Code-level inspection (all findings verified against source)  
**Scope**: Phases 1–4 of the Jake Hernandez / King Air B200 technician journey  
**App root**: `/home/sam_sandifer1/.openclaw/workspace/simulation/athelon/athelon-app`  
**Date**: 2026-02-26  

---

## Methodology

Every gap below was verified by reading the actual source files — no assumptions. Files read:
- `convex/schema.ts` (full schema)
- `convex/workOrders.ts`, `convex/aircraft.ts`, `convex/taskCards.ts`, `convex/parts.ts`, `convex/adCompliance.ts`
- `app/(app)/fleet/page.tsx`, `app/(app)/fleet/[tail]/page.tsx`
- `app/(app)/work-orders/new/page.tsx`
- `app/(app)/work-orders/[id]/page.tsx`, `AdComplianceTab.tsx`
- `app/(app)/work-orders/[id]/tasks/new/page.tsx` + `_components/StepBuilder.tsx` + `_components/TaskCardForm.tsx`
- `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`
- `app/(app)/parts/page.tsx`, `app/(app)/parts/new/page.tsx`, `app/(app)/parts/requests/page.tsx`
- `app/(app)/my-work/page.tsx`

---

## PHASE 1: Aircraft Induction & Work Order Creation

---

### GAP-01: No Mutation to Update Aircraft Total Time at Induction
**Phase**: 1 | **Severity**: CRITICAL  
**Current state**: `convex/aircraft.ts` contains zero mutations. The aircraft record's `totalTimeAirframeHours` and `totalTimeAirframeAsOfDate` are shown in the fleet detail view (`app/(app)/fleet/[tail]/page.tsx` line 187, 298) but there is no way to update them from any page. There is no `updateAircraft`, `updateTotalTime`, or `setInductionHours` mutation in the codebase.  
**What's needed**: When Jake inducting the King Air, he must record the aircraft's TT (e.g., 4,312.5 TTAF) as of arrival. This feeds AD overdue calculations (`checkAdDueForAircraft` compares `nextDueHours` against `aircraft.totalTimeAirframeHours` — live data) and the parts installation/removal life-accumulation math. Without a writable TT field, every hours-based AD calculation is stale from the moment the aircraft arrives.  
**Code reference**: `convex/aircraft.ts` — entire file has no mutations; `convex/adCompliance.ts:169` — `currentHours = aircraft.totalTimeAirframeHours` (live fetch); `convex/schema.ts:393` — `totalTimeAirframeHours` defined as writable field.

---

### GAP-02: No Aircraft Induction Workflow
**Phase**: 1 | **Severity**: HIGH  
**Current state**: There is no induction checklist UI, no walk-around findings form, no logbook review record, and no aircraft arrival/departure timestamp. The fleet detail page shows static aircraft info but no induction-specific workflow exists anywhere in the codebase.  
**What's needed**: Jake needs to: record the aircraft's physical arrival, log discrepancies found during walk-around (pre-existing damage, AD items noted in logbooks), capture logbook-verified TT, and have the system timestamp the induction event. This is both an operational and regulatory need (pre-maintenance condition baseline).  
**Code reference**: `app/(app)/fleet/[tail]/page.tsx` — read-only display only, no induction mutation calls; `convex/aircraft.ts` — no induction workflow mutations.

---

### GAP-03: `customerFacingStatus` Not Settable on Work Order Creation or Anywhere
**Phase**: 1 | **Severity**: HIGH  
**Current state**: The schema defines `customerFacingStatus` as an optional field on `workOrders` (`convex/schema.ts:766`) with 8 possible values including `received_inspection_pending`. However, `createWorkOrder` in `convex/workOrders.ts` does not accept `customerFacingStatus` as an argument — it is never set. The WO creation page (`app/(app)/work-orders/new/page.tsx`) has no `customerFacingStatus` field. No other mutation in the codebase sets this field.  
**What's needed**: Jake's work order coordinator needs to set status to "Received — Inspection Pending" immediately when the aircraft arrives so the customer portal (when it ships) shows the correct status. This was explicitly planned: schema comment at line 764 — "REQ-DO-02 (Danny Osei, WO Coordinator). Present for v1.1 customer portal readiness." The field was added to the schema but never wired up.  
**Code reference**: `convex/schema.ts:766-780` — field defined; `convex/workOrders.ts` `createWorkOrder` args — field absent; `app/(app)/work-orders/new/page.tsx` — no such field in form.

---

### GAP-04: Customer Not Linked to Aircraft or Work Order From Fleet UI
**Phase**: 1 | **Severity**: HIGH  
**Current state**: The schema supports a `customerId` FK on both `aircraft` (`schema.ts:394`) and `workOrders` (`schema.ts:826`). The `createWorkOrder` mutation accepts `customerId` as an optional arg. However, the WO creation form (`app/(app)/work-orders/new/page.tsx`) shows the selected aircraft's TT (line 181) but has no customer selection dropdown. The fleet pages (`fleet/page.tsx`, `fleet/[tail]/page.tsx`) show no customer linkage at all.  
**What's needed**: When creating a WO for the King Air owned by Western Range Aviation LLC, Jake (or the coordinator) needs to link the customer. Without the customer link: billing has no party, customer authorizations (`customerWorkAuthorizations` table exists in schema) cannot be linked, and customerFacingStatus has no recipient.  
**Code reference**: `convex/workOrders.ts:128` — `customerId: v.optional(v.id("customers"))` in createWorkOrder args; `app/(app)/work-orders/new/page.tsx:34-71` — no customer state variable or dropdown.

---

### GAP-05: Pilot Squawk Intake Is a Single Unstructured Text Field
**Phase**: 1 | **Severity**: MEDIUM  
**Current state**: The WO creation form (`app/(app)/work-orders/new/page.tsx:38,285`) has a single textarea for `squawks`. This submits a plain string (`squawks: squawks.trim() || undefined`) to `createWorkOrder`. The discrepancies table is separate and structured — but pilot squawks from arrival are never converted into structured discrepancy records.  
**What's needed**: Squawks should create individual discrepancy records (one per item) with component, ATA chapter, description, and customer-reported severity. A single free-text blob for multiple squawks makes it impossible to track each item's disposition individually.  
**Code reference**: `app/(app)/work-orders/new/page.tsx:38` — `const [squawks, setSquawks] = useState("")`; `convex/workOrders.ts:82` — `squawks: v.optional(v.string())` (plain string in schema).

---

## PHASE 2: Work Scope Planning & Task Card Creation

---

### GAP-06: No Inspection Template System
**Phase**: 2 | **Severity**: CRITICAL  
**Current state**: No template tables exist in `schema.ts`. There is no `taskCardTemplates`, `checklistTemplates`, or `inspectionTemplates` table. `createTaskCard` requires every step to be entered manually from scratch. There is no API to instantiate a card from a template.  
**What's needed**: A Phase 4 inspection on a King Air B200 has hundreds of steps across 6+ inspection phases per Textron MM Chapter 5-30. Every AMT at every shop doing King Air work uses the same checklist. Jake should be able to select "King Air B200 — Phase 4" from a template library and get all 200+ steps pre-loaded. Without templates, task card creation is hours of manual typing — unusable in a real shop.  
**Code reference**: `convex/schema.ts` — no template table; `convex/taskCards.ts:createTaskCard` — steps array must be fully specified by caller; `app/(app)/work-orders/[id]/tasks/new/page.tsx:31-47` — all state initialized empty with no template loading.

---

### GAP-07: Steps Cannot Be Added to a Task Card After Creation
**Phase**: 2 | **Severity**: HIGH  
**Current state**: `createTaskCard` requires the complete `steps` array at creation time (`convex/taskCards.ts:createTaskCard` — `steps: v.array(stepInputValidator)`). There is no `addStep`, `appendStep`, or `insertStep` mutation anywhere in `convex/taskCards.ts`. Once a card is created, its step set is frozen (short of voiding the card).  
**What's needed**: During a Phase 4 inspection, Jake often discovers mid-inspection that additional steps are needed (e.g., found corrosion on a wing rib — needs a "blend repair inspection" step added to the existing structural card). Real maintenance work is not fully defined upfront; the step set must be extensible.  
**Code reference**: `convex/taskCards.ts` — mutations are: `createTaskCard`, `completeStep`, `signTaskCard`, `addHandoffNote`, `listTaskCardsForWorkOrder`, `listTaskCardsForTechnician`. No addStep mutation exists.

---

### GAP-08: No Estimated Hours Field on Task Cards or Steps (API Accepts It, UI Ignores It)
**Phase**: 2 | **Severity**: HIGH  
**Current state**: The `taskCards` table in `schema.ts` has no `estimatedHours` field at the card level. The `stepInputValidator` in `convex/taskCards.ts:42` accepts `estimatedDurationMinutes: v.optional(v.number())` per step, but (1) this is never surfaced in the `StepBuilder` UI component (`app/(app)/work-orders/[id]/tasks/new/_components/StepBuilder.tsx` — `StepDraft` interface has no such field), and (2) there is no card-level estimated hours field.  
**What's needed**: Estimated hours per task card is essential for scheduling (how many technicians, what day will work complete), customer quoting (labor estimate × rate), and invoicing reconciliation. Step-level duration estimates are also needed for scheduling concurrent work across multiple technicians.  
**Code reference**: `convex/taskCards.ts:42` — `estimatedDurationMinutes` in `stepInputValidator`; `app/(app)/work-orders/[id]/tasks/new/_components/StepBuilder.tsx:14-21` — `StepDraft` interface missing this field; `convex/schema.ts` taskCards table — no `estimatedHours` field.

---

### GAP-09: AD Compliance Not Actionable From Task Card Creation
**Phase**: 2 | **Severity**: HIGH  
**Current state**: The WO detail page has an "AD Compliance" tab (`AdComplianceTab.tsx`) that calls `checkAdDueForAircraft` and displays overdue/due-soon ADs. However, there is no "Create Task Card from AD" button. `createTaskCard` accepts `taskType: "ad_compliance"` but the AD compliance tab has no action to initiate this — it is read-only. The AD item's `adComplianceId` is never passed to the task card creation form.  
**What's needed**: When Jake sees an overdue AD in the compliance tab, he needs one click to create a task card pre-populated with the AD number, task type `ad_compliance`, and the AD number in `approvedDataSource`. Currently he must manually switch tabs, create a new task card, and type the AD number — with no validation that he typed the right AD number.  
**Code reference**: `app/(app)/work-orders/[id]/AdComplianceTab.tsx:161` — `checkAdDueForAircraft` query used for display only; `app/(app)/work-orders/[id]/AdComplianceTab.tsx` — no link/button to create task card from AD item; `convex/adCompliance.ts:recordAdCompliance` — requires `maintenanceRecordId` referencing the AD number, not a task card ID.

---

### GAP-10: Step Prerequisites Accepted by API but Not Exposed in UI
**Phase**: 2 | **Severity**: MEDIUM  
**Current state**: `stepInputValidator` in `convex/taskCards.ts:52` accepts `prerequisiteStepNumbers: v.optional(v.array(v.number()))`. The backend validates these on creation (checks all referenced steps exist and have lower numbers). However, `StepBuilder.tsx`'s `StepDraft` interface has no `prerequisiteStepNumbers` field, and the UI renders no way to configure prerequisites.  
**What's needed**: Some inspection steps genuinely have dependencies — e.g., "Inspect wing spar cap" (step 5) cannot start until "Remove lower wing skin" (step 2) is complete. Without enforced prerequisites, a tech could sign off a step that depends on another not yet started, producing a non-sequential audit trail.  
**Code reference**: `convex/taskCards.ts:52` — `prerequisiteStepNumbers` in validator; `app/(app)/work-orders/[id]/tasks/new/_components/StepBuilder.tsx:14-21` — `StepDraft` type has no such field; the UI renders only description, requiresSpecialTool, signOffRequired, signOffRequiresIa.

---

## PHASE 3: Parts Inspection & Ordering

---

### GAP-11: No UI Action to Move Parts From `pending_inspection` → `inventory`
**Phase**: 3 | **Severity**: CRITICAL  
**Current state**: Parts received go to `location: "pending_inspection"` by default (`convex/parts.ts:createPart` line ~580). The `installPart` mutation hard-blocks installation of any part not in `"inventory"` status: `if (part.location !== "inventory") { throw new Error("PART_NOT_IN_INVENTORY"...) }`. However, there is no mutation in `convex/parts.ts` to transition `pending_inspection → inventory`. There is no "Complete Receiving Inspection" button anywhere in the UI — not in `parts/requests/page.tsx`, not in `parts/new/page.tsx`, not in `parts/page.tsx`.  
**What's needed**: When a part arrives and passes receiving inspection, someone must move it from `pending_inspection` to `inventory` so it can be installed. Currently this state transition is architecturally required but completely unimplemented — parts received through the UI can never be installed. This is a complete workflow dead-end.  
**Code reference**: `convex/parts.ts:installPart` — line ~550: `if (part.location !== "inventory") throw ...`; `convex/parts.ts` — no `completeReceivingInspection`, `approvePart`, or `transitionToInventory` mutation exists; `app/(app)/parts/requests/page.tsx` — list view only, no action buttons on items.

---

### GAP-12: New Part Form (`/parts/new`) Calls `createPart` Not `receivePart` — Bypasses All Airworthiness Controls
**Phase**: 3 | **Severity**: CRITICAL  
**Current state**: `app/(app)/parts/new/page.tsx` calls `api.parts.createPart`, a bare-bones mutation that creates a part with `isSerialized: false`, `isLifeLimited: false`, `hasShelfLifeLimit: false`, and no 8130-3 data. The `receivePart` mutation exists in the backend with full validation (INV-07, INV-11, INV-12, 8130-3 enforcement, LLP life-limit hard blocks, shelf-life checks, duplicate serial guard) but is completely unreachable from any UI page. The `parts/new` page even states: "For full traceability (8130-3 tag, serial numbers, life-limited tracking), use the full receiving flow from within a Work Order" — but no such UI exists within a work order.  
**What's needed**: The actual parts receiving flow must use `receivePart` with serial number, condition, 8130-3 data, LLP declaration, and shelf-life. For a King Air with life-limited parts, receiving without these fields is a regulatory documentation failure. The UI currently makes the regulated path impossible and the unregulated path the only option.  
**Code reference**: `app/(app)/parts/new/page.tsx:56` — `const createPart = useMutation(api.parts.createPart)`; `convex/parts.ts:receivePart` — full mutation exists, never called from any UI; `app/(app)/parts/new/page.tsx:162` — note text acknowledging the gap.

---

### GAP-13: No Parts Request → Purchase Order Link in UI
**Phase**: 3 | **Severity**: HIGH  
**Current state**: Parts requests appear in the Parts Queue (`/parts/requests`). POs exist in `/billing/purchase-orders`. There is zero navigational or functional link between them. The `purchaseOrders` schema has `workOrderId` on it (`schema.ts:2035`), and `poLineItems` exist, but the parts queue page has no "Create PO" button and the billing PO creation page (`billing/purchase-orders/new/page.tsx`) has no way to pre-populate from a parts request.  
**What's needed**: When Jake identifies 15 parts needed for the King Air Phase 4, he needs to create a PO to Aviall for those parts with one workflow — not manually copy part numbers from the parts queue into the billing module. The disconnect means parts ordering happens outside the system (phone, email, separate vendor portal) with no traceability.  
**Code reference**: `app/(app)/parts/requests/page.tsx` — no link to `/billing/purchase-orders/new`; `app/(app)/billing/purchase-orders/new/page.tsx` — no parts-request pre-population; `convex/schema.ts:2008-2058` — `purchaseOrders` and `poLineItems` exist with `workOrderId` but no `partId` FK on line items.

---

### GAP-14: No Parts Reservation System
**Phase**: 3 | **Severity**: HIGH  
**Current state**: The `parts` schema (`schema.ts:1520-1580`) has no `reservedForWorkOrderId`, `reservedAt`, or `reservationStatus` fields. `listParts` returns all inventory parts regardless of whether another WO has informally claimed them. `installPart` checks only that `location === "inventory"` — no reservation guard exists.  
**What's needed**: If both WO-001 (King Air) and WO-002 (Cessna 172) need the same oil filter (last one in stock), there must be a way to reserve it for one job. Without reservation, two technicians can simultaneously proceed assuming they have the part, then one finds it missing at installation time — causing delay and potential schedule failure.  
**Code reference**: `convex/schema.ts` parts table definition (lines ~1520-1580) — no reservation fields; `convex/parts.ts:installPart` — G1 check is only `location === "inventory"`, no reservation check.

---

### GAP-15: `receivePart` Has No Receiving Inspection Approval Step in Backend Flow
**Phase**: 3 | **Severity**: HIGH  
**Current state**: `receivePart` in `convex/parts.ts` places parts directly into `location: "inventory"` (or `"quarantine"` for expired LLPs). There is no intermediate state for "received, physically inspected and approved by a certificated technician." The `pending_inspection` state in the schema is only set by `createPart` (the bare-bones mutation) — `receivePart` skips it entirely. This means even `receivePart` (the "proper" mutation) doesn't model the required dual-inspection process.  
**What's needed**: Per 14 CFR 145.211, a repair station must have an incoming inspection procedure. A part should go: received → `pending_inspection` → (tech inspects 8130-3, physical condition, markings) → `inventory`. The receiving tech must sign off the inspection. Currently this regulatory step has no implementation path.  
**Code reference**: `convex/parts.ts:receivePart` handler, line ~400: `let receivingLocation: "inventory" | "quarantine" = "inventory"` — only quarantine override, no `pending_inspection` stop; `convex/schema.ts:1487-1492` — schema comment acknowledges INV-23 (pending_inspection not issuable) but receivePart never uses it.

---

## PHASE 4: Inspection Execution

---

### GAP-16: No Photo Attachment on Task Card Steps
**Phase**: 4 | **Severity**: CRITICAL  
**Current state**: The `taskCardSteps` schema (`schema.ts:1054-1115`) has no photo/attachment fields whatsoever. Fields defined: `description`, `requiresSpecialTool`, `signOffRequired`, `status`, `signedByTechnicianId`, `signedAt`, `notes`, `discrepancyIds`, `approvedDataReference`, `partsInstalled`. No `photoUrls`, `attachmentIds`, `photoStorageIds`, or similar. The `completeStep` mutation in `convex/taskCards.ts` accepts no photo data. The `TaskStepRow` component (`app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx`) renders no upload button.  
**What's needed**: When Jake inspects the King Air's wing spar cap and finds corrosion, he must photograph it. That photo becomes part of the permanent maintenance record — it documents the pre-repair condition, justifies the repair action, and provides evidence if the aircraft is later involved in an incident. Photo documentation on inspection steps is an industry-standard requirement. Without it, all findings exist only as text.  
**Code reference**: `convex/schema.ts:1054-1115` — no photo fields in taskCardSteps; `convex/taskCards.ts:completeStep` args — no photo/attachment args; `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` — no upload UI anywhere.

---

### GAP-17: No Measurement Recording on Steps
**Phase**: 4 | **Severity**: CRITICAL  
**Current state**: The `taskCardSteps` schema has no fields for recording measurements (torque values, wear dimensions, clearances, pressures, deflection readings). The schema does have a `testEquipmentUsed` array on `maintenanceRecords` (`schema.ts:572` references `v.literal("multimeter")`), but task card steps cannot capture measurement values at all. `completeStep` mutation accepts no measurement data.  
**What's needed**: A Phase 4 King Air inspection requires recording dozens of precise measurements: brake pad thickness (limit: 0.100"), tire pressure (150 PSI), propeller tracking (0.050" max runout), control surface travel (FAA Type Cert limits), strut extension (per AMM). These are not pass/fail checks — they are specific numerical values that must be recorded in the maintenance record for airworthiness determination and trend tracking.  
**Code reference**: `convex/schema.ts:taskCardSteps` (lines 1054-1115) — no measurement fields; `convex/taskCards.ts:completeStep` — no measurement args; `app/(app)/work-orders/[id]/tasks/[cardId]/_components/TaskStepRow.tsx` (inferred from page) — no measurement input.

---

### GAP-18: No Step-Level "In Progress" Status
**Phase**: 4 | **Severity**: HIGH  
**Current state**: `taskCardSteps` status enum is strictly `"pending" | "completed" | "na"` (`schema.ts:1067-1072`). `completeStep` only accepts `action: "complete" | "mark_na"`. There is no `startStep`, `markInProgress`, or similar mechanism. A step either hasn't been touched (`pending`) or is done (`completed`/`na`).  
**What's needed**: When Jake opens up an inspection panel (a multi-hour task), that step should be visibly "in progress" to other technicians. This prevents: (1) a second tech starting the same step unknowingly, (2) confusion during shift handoffs about what's actually being worked vs waiting to be started, and (3) workload visibility for the shop foreman. "In progress" is a standard status in all shop management systems.  
**Code reference**: `convex/schema.ts:1067-1072` — step status union only has 3 literals; `convex/taskCards.ts:completeStep` — `action: v.union(v.literal("complete"), v.literal("mark_na"))`, no `mark_in_progress` action.

---

### GAP-19: Estimated Duration per Step Accepted by API but Never Offered in UI
**Phase**: 4 | **Severity**: MEDIUM  
**Current state**: `stepInputValidator` in `convex/taskCards.ts:42` defines `estimatedDurationMinutes: v.optional(v.number())`. However, the `StepDraft` interface in `StepBuilder.tsx` (lines 14-21) does not include this field. The task card creation form's `handleSubmit` (`new/page.tsx:89-101`) maps `steps` to the API format but never passes `estimatedDurationMinutes`. The field is silently dropped.  
**What's needed**: Estimated duration per step enables: (1) scheduling (how long will this task card take), (2) capacity planning (can Jake finish Phase 4 by Friday?), and (3) actuals-vs-estimates reporting. The API already accepts this data — it just needs to be wired to the UI.  
**Code reference**: `convex/taskCards.ts:42` — `estimatedDurationMinutes: v.optional(v.number())`; `app/(app)/work-orders/[id]/tasks/new/_components/StepBuilder.tsx:14-21` — `StepDraft` interface missing field; `app/(app)/work-orders/[id]/tasks/new/page.tsx:89-101` — step mapping omits `estimatedDurationMinutes`.

---

### GAP-20: No Time Clock / Labor Tracking Against Work Orders
**Phase**: 4 | **Severity**: HIGH  
**Current state**: The schema includes `timeEntries` in a commented-out "Phase 4.1 TODO" comment at `schema.ts:1949`. There is no `timeEntries` table in the schema. There is no time clock UI anywhere in the app. There is no `clockIn`/`clockOut` mutation. The `my-work/page.tsx` shows task card progress but has no timer.  
**What's needed**: Jake needs to log time against the King Air WO for billing purposes — "3.5 hours on Phase 4 Wing Structure task card." Without time tracking, invoicing requires manual time sheets, labor cannot be auto-populated into the invoice, and the system cannot verify that quoted labor hours match actuals.  
**Code reference**: `convex/schema.ts:1949` — comment: "vendors, purchaseOrders, poLineItems, timeEntries"; `app/(app)/my-work/page.tsx` — no timer/clock UI; no `timeEntries` table in schema.

---

### GAP-21: My Work Page Shows Empty Aircraft Registration for All Cards
**Phase**: 4 | **Severity**: MEDIUM  
**Current state**: `listTaskCardsForTechnician` query in `convex/taskCards.ts` (lines ~580-620) explicitly returns `aircraftRegistration: ""` (hardcoded empty string) with the comment "Will be enriched by caller if needed." The My Work page (`my-work/page.tsx`) renders the work order number (`card.workOrderNumber`) but never shows which aircraft the work is on — and the registration field is always empty so there's nothing to display anyway.  
**What's needed**: Jake works on multiple aircraft. His My Work view should show "N412HP — King Air B200" for each card so he can tell at a glance which aircraft he's walking to. Displaying only the work order number is insufficient — techs don't memorize WO numbers.  
**Code reference**: `convex/taskCards.ts:listTaskCardsForTechnician` — `aircraftRegistration: ""` (hardcoded); `app/(app)/my-work/page.tsx` — only renders `card.workOrderNumber`, not aircraft registration.

---

### GAP-22: Card-Level Sign-Off Not Stored in Dedicated Schema Fields
**Phase**: 4 | **Severity**: HIGH  
**Current state**: `signTaskCard` mutation in `convex/taskCards.ts` stores the card-level sign-off by appending a string to `taskCards.notes` (see comment and code at the end of `signTaskCard` handler: "TODO (Phase 2.1 schema extension): Add dedicated signature fields to taskCards"). There are no `signingTechnicianId`, `signedAt`, `signedCertificateNumber`, or `cardSignatureAuthEventId` fields on the `taskCards` table in `schema.ts`. The authoritative record is in the audit log — notes is "a display convenience."  
**What's needed**: The card-level sign-off is the supervising technician's 43.9 certification. It must be queryable (e.g., "show me all task cards signed by Jake Hernandez this month"), not buried in a freetext `notes` field. The Phase 2.1 TODO has not been implemented. Until it is, any query or report requiring card-level signature data (who signed, when, which cert) cannot be answered programmatically.  
**Code reference**: `convex/taskCards.ts:signTaskCard` — `signatureNoteEntry` string appended to `taskCard.notes`; `convex/schema.ts` taskCards table — no signature fields; `convex/taskCards.ts:signTaskCard` — "TODO (Phase 2.1 schema extension)" comment.

---

### GAP-23: Step Notes Are Not Surfaced to Other Technicians
**Phase**: 4 | **Severity**: MEDIUM  
**Current state**: `completeStep` accepts a `notes` field and `taskCardSteps` stores `notes: v.optional(v.string())`. However, the task card execution page (`[cardId]/page.tsx`) renders handoff notes at the card level (the `Shift Handoff Notes` section) but does not display individual step notes in the step list. Step notes are captured at sign-off time but are not visible during execution unless a tech navigates into individual step details.  
**What's needed**: Step notes often contain critical information — "found 0.003" wear on bearing race, within limits per AMM Table 6-1" or "torqued to 75 in-lb as specified." This information must be visible to the IA performing the inspection review and to other techs working the same card. Notes buried at sign-off and not displayed in the step list defeats their purpose.  
**Code reference**: `convex/schema.ts:1103` — `notes: v.optional(v.string())` on taskCardSteps; `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` — `Shift Handoff Notes` section is card-level only; individual step rendering delegates to `TaskStepRow` component which (per page structure) does not show prior notes.

---

### GAP-24: "Raise Finding" Dialog Passes `aircraftHours: 0` Hardcoded
**Phase**: 4 | **Severity**: MEDIUM  
**Current state**: The task card execution page (`[cardId]/page.tsx`) renders a "Raise Finding" button that opens `RaiseFindingDialog` with `aircraftHours={0}` hardcoded (line near the `RaiseFindingDialog` render). This means any discrepancy raised from a task card step will have `aircraftHoursAtDiscovery = 0` rather than the aircraft's actual current TT.  
**What's needed**: Discrepancy records should include the aircraft's actual TT at the time of discovery. This is relevant both for warranty tracking and for recurring-item trending ("corrosion found at 4,312h — last found at 3,890h — recurrence interval 422h"). Hardcoding zero defeats this entirely.  
**Code reference**: `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` — `<RaiseFindingDialog ... aircraftHours={0} ...>` (hardcoded).

---

## Summary Table

| Gap | Phase | Severity | Area |
|-----|-------|----------|------|
| GAP-01 | 1 | CRITICAL | No aircraft TT update mutation |
| GAP-02 | 1 | HIGH | No induction workflow/checklist |
| GAP-03 | 1 | HIGH | customerFacingStatus never set |
| GAP-04 | 1 | HIGH | No customer link in fleet/WO UI |
| GAP-05 | 1 | MEDIUM | Squawks are unstructured free text |
| GAP-06 | 2 | CRITICAL | No inspection template library |
| GAP-07 | 2 | HIGH | Steps locked at card creation time |
| GAP-08 | 2 | HIGH | No estimated hours on cards (API supports it, UI ignores it) |
| GAP-09 | 2 | HIGH | AD compliance tab read-only, no "Create Task Card" action |
| GAP-10 | 2 | MEDIUM | Step prerequisites in API, missing from UI |
| GAP-11 | 3 | CRITICAL | No UI to move parts from pending_inspection → inventory |
| GAP-12 | 3 | CRITICAL | /parts/new calls createPart not receivePart — bypasses all airworthiness controls |
| GAP-13 | 3 | HIGH | Parts request → PO: completely disconnected flows |
| GAP-14 | 3 | HIGH | No parts reservation system |
| GAP-15 | 3 | HIGH | receivePart skips pending_inspection — no technician sign-off on incoming inspection |
| GAP-16 | 4 | CRITICAL | No photo attachment on steps |
| GAP-17 | 4 | CRITICAL | No measurement recording on steps |
| GAP-18 | 4 | HIGH | No "in progress" status for steps |
| GAP-19 | 4 | MEDIUM | Estimated duration in API, not in UI |
| GAP-20 | 4 | HIGH | No time clock / labor tracking |
| GAP-21 | 4 | MEDIUM | My Work shows no aircraft registration |
| GAP-22 | 4 | HIGH | Card-level sign-off stored as freetext note, not queryable fields |
| GAP-23 | 4 | MEDIUM | Step notes not surfaced to other techs during execution |
| GAP-24 | 4 | MEDIUM | Raise Finding hardcodes aircraftHours=0 |

**CRITICAL**: 6 gaps — any one of these prevents a core workflow from completing  
**HIGH**: 12 gaps — significant functional or regulatory gaps  
**MEDIUM**: 6 gaps — usability and compliance improvements needed  

---

## Critical Path for Phase 4 Readiness

To get from "can't use this" to "usable in a real shop for a single Phase 4 inspection," the minimum required fixes are:

1. **GAP-01** — Add `updateAircraftTotalTime` mutation + UI control (blocks all hours-based AD calculations)
2. **GAP-11** — Add `completeReceivingInspection` mutation + UI button (parts permanently stuck in pending_inspection)
3. **GAP-12** — Wire `/parts/new` to `receivePart` or build a proper receiving UI within the WO context
4. **GAP-16** — Add photo attachment to steps (required for any corrosion/damage documentation)
5. **GAP-06** — Without templates, task card creation for a 200-step Phase 4 inspection is not feasible

Without these 5 fixes, the technician journey cannot be completed for a real Phase 4 inspection.
