# Audit Report — Phases 5–7
## Discrepancy Documentation · Repair Authorization · Repair Execution

**Audited by:** Subagent (technician perspective)  
**Date:** 2026-02-26  
**App root:** `athelon-app/`  
**Method:** Direct code reading — schema, mutations, and UI components

---

## Phase 5 — Discrepancy Documentation

### GAP-01: Discrepancy Has No Link Back to the Task Card Step Where It Was Found
**Phase**: 5 | **Severity**: HIGH  
**Current state**: `taskCardSteps` has a `discrepancyIds: v.array(v.id("discrepancies"))` field, which provides a one-way link from step → discrepancy. The `discrepancies` schema has no `taskCardStepId` field, so a discrepancy has no reference back to the specific step it was raised on.  
**What's needed**: A `taskCardStepId: v.optional(v.id("taskCardSteps"))` field in the `discrepancies` table, and `openDiscrepancy` should accept and store it. `RaiseFindingDialog` receives `stepDescription` and `taskCardTitle` as props but has no mechanism to pass a step ID to the mutation.  
**Code reference**: `convex/schema.ts:875` (discrepancies table — no taskCardStepId), `convex/schema.ts:1086` (taskCardSteps.discrepancyIds), `convex/discrepancies.ts:97` (openDiscrepancy args — no stepId param), `app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx:52` (props — stepId absent)

---

### GAP-02: No Severity or Priority Field on Discrepancies
**Phase**: 5 | **Severity**: HIGH  
**Current state**: The `discrepancies` schema contains `status`, `disposition`, `foundDuring`, `description`, `componentAffected`, `componentPartNumber`, `componentSerialNumber`, `componentPosition`, `foundAtAircraftHours`, and MEL fields — but no `severity` or `priority` field of any kind. The squawks page (`app/(app)/squawks/page.tsx`) displays and filters only by `status: "open"` with no urgency ranking.  
**What's needed**: A structured `severity` field (e.g., `critical`, `major`, `minor`, `observation`) and/or a `priority` field (`aog`, `urgent`, `routine`) to allow technicians and ops to triage a growing squawks list. Without this, a cracked spar and a burned-out cabin light appear identically on the squawks list.  
**Code reference**: `convex/schema.ts:875–951` (full discrepancies schema — no severity/priority), `app/(app)/squawks/page.tsx:83` (listDiscrepancies query — no priority filter available)

---

### GAP-03: No Photo or Attachment Support in Discrepancy Schema
**Phase**: 5 | **Severity**: HIGH  
**Current state**: The `discrepancies` schema has no `photoUrls`, `attachmentIds`, `photos`, or any attachment field. The `RaiseFindingDialog` notes field has placeholder text "Additional context, references, photos..." implying photo support is expected, but there is no mechanism to attach images or documents.  
**What's needed**: A `photoUrls: v.optional(v.array(v.string()))` or a linked attachments table. In practice, technicians document corrosion, cracks, and damage with photos. FAA inspectors reviewing records may ask for supporting documentation. Without photo attachment, findings are text-only.  
**Code reference**: `convex/schema.ts:875–951` (no photo/attachment fields), `app/(app)/work-orders/[id]/tasks/[cardId]/_components/RaiseFindingDialog.tsx:163` (notes placeholder implies photo support)

---

### GAP-04: RaiseFindingDialog Passes Aircraft Hours as Hardcoded Zero
**Phase**: 5 | **Severity**: HIGH  
**Current state**: In `page.tsx`, `RaiseFindingDialog` is rendered with `aircraftHours={0}`. This hardcoded zero is then passed to `openDiscrepancy` as `foundAtAircraftHours`, which stores it directly in the database.  
**What's needed**: The task card page should resolve the actual current aircraft total time from the work order's `aircraftTotalTimeAtOpen` field or from a real-time aircraft record query, and pass that as `aircraftHours`. `foundAtAircraftHours` is a compliance field — an incorrect value of `0` on a regulatory record is a falsification concern.  
**Code reference**: `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx:260` (`aircraftHours={0}` — hardcoded), `convex/discrepancies.ts:151` (stored as-is in the record)

---

### GAP-05: "Log Squawk" Button on Squawks Page Is Non-Functional
**Phase**: 5 | **Severity**: MEDIUM  
**Current state**: The squawks page renders a `<Button size="sm">` with label "Log Squawk" and no `onClick` handler. Clicking it does nothing. There is no dialog, modal, or navigation triggered from this button.  
**What's needed**: Wire the "Log Squawk" button to a `LogSquawkDialog` (similar to `RaiseFindingDialog`) that allows a standalone squawk to be created from the squawks list page, not just from within a task card.  
**Code reference**: `app/(app)/squawks/page.tsx:88–91` (Button with no onClick)

---

### GAP-06: Limited Disposition Options — No "Replace," "Overhaul," or "Serviceable As-Is"
**Phase**: 5 | **Severity**: MEDIUM  
**Current state**: `dispositionDiscrepancy` supports `corrected`, `deferred_grounded`, `no_fault_found`, `no_fault_found_could_not_reproduce`. `deferDiscrepancy` adds `deferred_mel`. The schema `discrepancyDisposition` union mirrors these options.  
**What's needed**: Standard MRO disposition workflow also includes: `replaced` (component replaced with new/overhauled unit), `overhauled` (sent to shop), `deferred_til_next_inspection`, `serviceable_as_is` (inspected and found acceptable by IA). The current options conflate the _action_ with the _finding_ — "corrected" isn't a disposition type, it's an outcome. In practice, a discrepancy is dispositioned differently depending on what corrective action was taken.  
**Code reference**: `convex/discrepancies.ts:202–208` (dispositionDiscrepancy disposition union), `convex/schema.ts:882` (discrepancyDisposition type — see schema)

---

## Phase 6 — Repair Authorization

### GAP-07: Quote Line Items Cannot Be Linked to a Specific Discrepancy
**Phase**: 6 | **Severity**: CRITICAL  
**Current state**: `quoteLineItems` schema has `type`, `description`, `qty`, `unitPrice`, `technicianId` (optional), `partId` (optional), and `departmentSection` (optional) — but no `discrepancyId` field. `addQuoteLineItem` mutation accepts no `discrepancyId` argument. There is no way in the data model to say "this $450 labor line item is to correct discrepancy DISC-007."  
**What's needed**: A `discrepancyId: v.optional(v.id("discrepancies"))` field on `quoteLineItems`. This is the audit trail link between customer authorization (quote approval) and the specific maintenance finding that triggered the work. Without this link, there is no way to prove that a customer authorized repair of a specific discrepancy. This is not just a UX gap — it affects regulatory traceability under 14 CFR Part 91 Appendix D.  
**Code reference**: `convex/schema.ts:2154–2179` (quoteLineItems schema — no discrepancyId), `convex/billing.ts:120–170` (addQuoteLineItem args — no discrepancyId)

---

### GAP-08: Quote Approval Is All-or-Nothing — No Per-Line-Item Customer Decision
**Phase**: 6 | **Severity**: HIGH  
**Current state**: `approveQuote` transitions the entire quote from `SENT` → `APPROVED`. `declineQuote` transitions the entire quote from `SENT` → `DECLINED`. There is no per-line-item approval/decline mechanism. A customer cannot say "yes to the annual inspection labor, no to the prop overhaul."  
**What's needed**: A `quoteLineItemDecisions` concept where each line item (or grouped discrepancy cluster) can be approved, declined, or deferred individually. In aviation MRO, customers routinely approve immediate safety items and defer cosmetic or scheduled items. The current model forces operators to either accept everything or re-quote.  
**Code reference**: `convex/billing.ts:288–320` (approveQuote — patches entire quote), `convex/billing.ts:322–356` (declineQuote — patches entire quote, no line-item tracking)

---

### GAP-09: No Workflow Trigger That Sets "discrepancy_authorization_required" Customer Status
**Phase**: 6 | **Severity**: HIGH  
**Current state**: `workOrders.customerFacingStatus` has a `discrepancy_authorization_required` literal value (`convex/schema.ts:771`). However, no mutation in the codebase sets this status. There is no trigger when `openDiscrepancy` is called, no automatic transition when a new squawk is raised mid-work-order, and no UI surface that surfaces this to the customer.  
**What's needed**: When a discrepancy is opened on a work order and the discrepancy requires customer authorization (i.e., it is not a safety-of-flight item the shop can address under implied authorization), `openDiscrepancy` should optionally set the work order's `customerFacingStatus` to `discrepancy_authorization_required`. This closes the loop between finding → customer notification → authorization → repair.  
**Code reference**: `convex/schema.ts:771` (discrepancy_authorization_required literal exists), `convex/discrepancies.ts` (openDiscrepancy — no customerFacingStatus update)

---

### GAP-10: Declined Quotes Leave Discrepancies in Perpetual "Open" State
**Phase**: 6 | **Severity**: HIGH  
**Current state**: When `declineQuote` is called, the quote moves to `DECLINED` status with a `declineReason` stored. No downstream action occurs: the discrepancies that prompted the quote remain in `status: "open"` indefinitely. There is no `deferDiscrepancy` call, no status change, no tracking of which discrepancies were declined.  
**What's needed**: When a quote containing line items linked to discrepancies is declined, each referenced discrepancy should either: (a) be explicitly deferred (customer-directed deferral, different from MEL deferral), or (b) remain open with a `pendingCustomerAuthorization` sub-status. Without this, the squawks list will accumulate open items that are actually customer-declined, creating a false picture of active unresolved findings.  
**Code reference**: `convex/billing.ts:322–356` (declineQuote — no discrepancy status update), `convex/discrepancies.ts:198` (no customer-directed deferral disposition option)

---

### GAP-11: convertQuoteToWorkOrder Doesn't Transfer Quote Line Items to the New Work Order
**Phase**: 6 | **Severity**: MEDIUM  
**Current state**: `convertQuoteToWorkOrder` creates a new work order record and sets `quote.status = CONVERTED` and `quote.convertedToWorkOrderId`. It does not copy any quote line items into the work order as planned labor or parts tasks. The new work order is created with only the basic fields (aircraft, customer, description, priority) from the quote args — none of the cost estimates.  
**What's needed**: The conversion should either: (a) create task card templates from the quote labor lines, or (b) store a snapshot of the approved scope so technicians can reference what the customer approved. As-is, the approved scope lives only in the quote; the work order has no structured record of what work was authorized at what price.  
**Code reference**: `convex/billing.ts:460–550` (convertQuoteToWorkOrder — creates bare workOrder, no line item transfer)

---

## Phase 7 — Repair Execution

### GAP-12: partsInstalled at Step Sign-Off Is Informational Only — Inventory Not Updated
**Phase**: 7 | **Severity**: CRITICAL  
**Current state**: `completeStep` accepts `partsInstalled: v.optional(v.array(v.object({ partId, partNumber, serialNumber, description, quantity })))` and stores it directly to `taskCardSteps.partsInstalled` (`convex/taskCards.ts:660–665`). No `installPart` mutation is called. No `parts` table record is updated. The part's `location` remains `"inventory"`, no `partInstallationHistory` record is created, and no `signatureAuthEvent` is consumed for the installation.  
**What's needed**: Either (a) require technicians to call `installPart` explicitly before signing the step, linking the `partInstallationHistoryId` to the step, or (b) have `completeStep` auto-call `installPart` for each `partsInstalled` entry that has a `partId`. The current state means parts can be documented as installed on a task card while still showing as `"inventory"` in the parts system — breaking all life-limited part tracking and inventory management.  
**Code reference**: `convex/taskCards.ts:433–445` (partsInstalled arg), `convex/taskCards.ts:655–670` (stored to step, no installPart call), `convex/parts.ts:installPart` (not called from completeStep)

---

### GAP-13: No Removed Parts Tracking at Task Card Step Level
**Phase**: 7 | **Severity**: CRITICAL  
**Current state**: `taskCardSteps` schema has `partsInstalled` but has no `partsRemoved` field. `SignStepDialog` UI has an "Add Part" button for installed parts but no corresponding "Add Removed Part" section. When a technician removes the old fuel pump before installing the new one, there is no structured way to document the removal P/N, S/N, condition at removal, or disposition at the step level.  
**What's needed**: A `partsRemoved: v.optional(v.array(v.object({ partId, partNumber, serialNumber, conditionAtRemoval, dispositionOfRemovedPart, description })))` field on `taskCardSteps`, with matching UI in `SignStepDialog`. This is required for a complete 43.9 work record: the regulation requires documenting both what was removed and what was installed.  
**Code reference**: `convex/schema.ts:1086–1107` (taskCardSteps schema — partsInstalled exists, partsRemoved absent), `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignStepDialog.tsx:36` (partsInstalled state — no partsRemoved state)

---

### GAP-14: removePart Mutation Does Not Capture Removed Condition or Post-Removal Disposition
**Phase**: 7 | **Severity**: HIGH  
**Current state**: `removePart` args include `aircraftHoursAtRemoval`, `aircraftCyclesAtRemoval`, and `removalReason`. After removal, part transitions to `location: "removed_pending_disposition"`. The part's `condition` is not updated by `removePart` — it retains whatever condition it had when installed. Post-removal disposition (scrap, return-to-vendor, return-to-customer, sent for overhaul) has no dedicated field or mutation path beyond the separate `tagPartUnserviceable`.  
**What's needed**: `removePart` should accept: (a) `conditionAtRemoval` (e.g., `serviceable`, `unserviceable`, `damaged`, `beyond_limits`), and (b) `intendedDisposition` (e.g., `scrap`, `overhaul`, `return_to_stock`, `return_to_customer`, `return_to_vendor`). This data should be captured at removal time, not as a follow-on action, because the removing technician has the best firsthand knowledge. The `partInstallationHistory` record should store both.  
**Code reference**: `convex/parts.ts:removePart` args — no conditionAtRemoval, no intendedDisposition, `convex/schema.ts` partInstallationHistory (if present — removal fields exist but no conditionAtRemoval)

---

### GAP-15: No Conformity Inspection Concept in Schema or Code
**Phase**: 7 | **Severity**: HIGH  
**Current state**: There is no `conformityInspections` table, no `conformityInspectionId` field on task cards, maintenance records, or work orders, and no UI component related to conformity inspection. For major repairs and major alterations under 14 CFR Part 43 Appendix A, an IA must conduct a conformity inspection and sign a specific certification. FAA Form 337 (Major Repair and Alteration) requires a conformity inspection certification block.  
**What's needed**: A `conformityInspections` table linked to a work order and maintenance record, capturing: inspecting technician (must be IA), scope of inspection, approved data reference, findings, date, aircraft time, and IA certificate number. This is only required for `workOrderType: "major_repair"` or `"major_alteration"`, but those types exist in the schema with no supporting inspection workflow.  
**Code reference**: `convex/schema.ts:792–803` (workOrderType includes major_repair, major_alteration), schema search — no conformityInspections table exists anywhere

---

### GAP-16: SignStepDialog Parts Section Decoupled from Parts Inventory — No Lookup or Validation
**Phase**: 7 | **Severity**: HIGH  
**Current state**: `SignStepDialog` renders a parts entry form with free-text `P/N`, `S/N`, `Description`, and `Quantity` fields. These are local component state arrays. When submitted, they are sent to `completeStep` as raw strings. There is no inventory lookup, no validation that the P/N exists, no check that the part is in `"inventory"` status, no warning if installing a life-limited part with insufficient remaining life, and no `partId` reference required.  
**What's needed**: The parts section of step sign-off should include a parts inventory search/picker that resolves the text P/N to an actual `partId` in the `parts` table, shows the part's current condition and location, and validates airworthiness (8130-3 presence, shelf life, life limit remaining) before allowing the technician to proceed. Free-text P/N entry with no validation allows incorrect P/Ns to be permanently recorded in the maintenance record.  
**Code reference**: `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignStepDialog.tsx:200–260` (free-text parts form), `convex/taskCards.ts:433` (partsInstalled — partId is v.optional, not required)

---

### GAP-17: installPart Requires 8130-3 or receivingWorkOrderId But completeStep Bypasses This Check
**Phase**: 7 | **Severity**: HIGH  
**Current state**: `installPart` mutation enforces INV-07: if a part has no `eightOneThirtyId` linked AND no `receivingWorkOrderId`, it throws `PART_NO_AIRWORTHINESS_DOCS`. However, since `completeStep`'s `partsInstalled` array bypasses `installPart` entirely (GAP-12), the INV-07 airworthiness documentation check is not applied when a technician signs a step with parts. A technician can document installing P/N XYZ-123 on a task card step with zero airworthiness documentation check.  
**What's needed**: Either integrate `installPart` into `completeStep`, or add equivalent documentation validation in `completeStep` when resolving `partsInstalled` entries. The airworthiness documentation requirement is a hard regulatory requirement (14 CFR 145.201(c) for OSP; 14 CFR 43.9(a)(1) for approved data); bypassing it via a different code path is a compliance failure.  
**Code reference**: `convex/parts.ts:installPart` (G8 check — lines ~440–475), `convex/taskCards.ts:completeStep` (partsInstalled stored directly — no airworthiness check)

---

### GAP-18: No Rating-to-Step Authorization Check — Any Technician Can Sign Any Step
**Phase**: 7 | **Severity**: MEDIUM  
**Current state**: `completeStep` validates that the calling technician is `active` and holds a certificate. It enforces IA currency when `step.signOffRequiresIa` is true. However, it does not validate that the technician's rating matches the rating they claim to exercise. A technician with only an Airframe certificate can select "Powerplant (P)" as `ratingsExercised` and the mutation will accept it, recording a false certification.  
**What's needed**: When `ratingsExercised` includes `"powerplant"`, verify the technician's `certificates` table has an active powerplant certificate. Same for `"airframe"`. This cross-check is required: 14 CFR 65.81 authorizes an A&P to return to service only work they are certificated to perform.  
**Code reference**: `convex/taskCards.ts:completeStep` (~line 504–640) — IA check exists, no airframe/powerplant rating verification

---

## Summary Table

| GAP | Phase | Severity | Title |
|-----|-------|----------|-------|
| GAP-01 | 5 | HIGH | No discrepancy-to-step linkage in schema |
| GAP-02 | 5 | HIGH | No severity/priority field on discrepancies |
| GAP-03 | 5 | HIGH | No photo/attachment support in discrepancy schema |
| GAP-04 | 5 | HIGH | RaiseFindingDialog passes aircraft hours as hardcoded 0 |
| GAP-05 | 5 | MEDIUM | "Log Squawk" button is non-functional |
| GAP-06 | 5 | MEDIUM | Limited disposition options — missing replace/overhaul/serviceable-as-is |
| GAP-07 | 6 | CRITICAL | Quote line items cannot be linked to a specific discrepancy |
| GAP-08 | 6 | HIGH | Quote approval is all-or-nothing — no per-line-item customer decision |
| GAP-09 | 6 | HIGH | No workflow trigger sets discrepancy_authorization_required status |
| GAP-10 | 6 | HIGH | Declined quotes leave discrepancies in perpetual open state |
| GAP-11 | 6 | MEDIUM | convertQuoteToWorkOrder doesn't transfer quote line items |
| GAP-12 | 7 | CRITICAL | partsInstalled at step sign-off doesn't update inventory |
| GAP-13 | 7 | CRITICAL | No removed parts tracking at task card step level |
| GAP-14 | 7 | HIGH | removePart doesn't capture removed condition or post-removal disposition |
| GAP-15 | 7 | HIGH | No conformity inspection concept in schema or code |
| GAP-16 | 7 | HIGH | SignStepDialog parts section decoupled from parts inventory |
| GAP-17 | 7 | HIGH | installPart's INV-07 airworthiness check bypassed via completeStep |
| GAP-18 | 7 | MEDIUM | No rating-to-step authorization check for airframe/powerplant |

---

*End of Phase 5–7 Audit*
