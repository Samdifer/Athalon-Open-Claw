# Technician User Journey Audit
## King Air B200 — Phase 4 Inspection

**Persona**: Jake Hernandez, A&P/IA mechanic at High Plains Aero & Charter (Pueblo, CO)
**Aircraft**: Beechcraft King Air B200, N412HP, S/N BB-1847
**Task**: Phase 4 inspection per Raytheon/Textron Maintenance Manual Chapter 5-30
**Customer**: Western Range Aviation LLC (charter operator)

---

## Phase 1: Aircraft Induction & Work Order Creation

**Real-world**: Customer calls, schedules inspection. Aircraft arrives. Jake does a walk-around, checks logbooks, notes squawks. Front desk creates work order.

### Steps in app:
1. ☐ Look up aircraft by tail number (N412HP) → Fleet page
2. ☐ Verify aircraft record (make, model, serial, TT, registration)
3. ☐ Check customer record exists → Customer linked to aircraft?
4. ☐ Create work order: type=progressive_inspection, description, squawks from pilot
5. ☐ Set customer-facing status to "received_inspection_pending"
6. ☐ Record aircraft total time at induction

### Potential gaps:
- No "induction checklist" UI (walk-around findings, logbook review, customer sign-in)
- No way to link customer to aircraft record from fleet view
- No pilot squawk intake form (just a text field?)
- No aircraft arrival/departure tracking
- customerFacingStatus — is it settable from UI?

---

## Phase 2: Work Scope Planning & Task Card Creation

**Real-world**: Jake pulls the Phase 4 inspection checklist from the Maintenance Manual. Creates task cards for each inspection zone/section. May also create task cards for known ADs, recurring squawks, or customer-requested items.

### Steps in app:
1. ☐ Navigate to WO → Tasks tab
2. ☐ Create task cards for each inspection section (e.g., "Phase 4 — Wing Structure", "Phase 4 — Landing Gear", "Phase 4 — Engine #1 Hot Section", etc.)
3. ☐ For each task card: set type=inspection, approved data source (MM Ch 5-30), add individual steps
4. ☐ Assign technicians to task cards
5. ☐ Check applicable ADs for this aircraft/engine combo
6. ☐ Create a quote for the customer based on planned scope

### Potential gaps:
- No inspection template library (Phase 1-6 checklists should be reusable)
- No way to bulk-create task cards from a template
- Task card step creation — can you add steps? Or only at task card creation?
- AD compliance check — is there a link from WO to AD lookup?
- No estimated hours per task card (for scheduling/quoting)

---

## Phase 3: Parts Inspection & Ordering

**Real-world**: During inspection, Jake identifies parts needed — filters, seals, hardware. Creates parts requests, then POs to vendors.

### Steps in app:
1. ☐ Check parts inventory for available stock
2. ☐ Create parts requests for needed items
3. ☐ Create PO to vendor (e.g., Aviall, Textron) for parts not in stock
4. ☐ Receive parts when they arrive → receive into inventory
5. ☐ Inspect received parts (8130-3 tag, condition)

### Potential gaps:
- Parts request → PO flow: is there a link?
- No incoming parts inspection workflow (8130-3/dual release verification)
- No minimum stock alerts
- No parts reservation (claim parts for a specific WO)
- Received parts go to "pending_inspection" status — who moves them to "inventory"?

---

## Phase 4: Inspection Execution

**Real-world**: Jake works through each task card step by step. Opens panels, inspects, documents findings. Signs off each step with his certificate number.

### Steps in app:
1. ☐ Go to My Work → see assigned task cards
2. ☐ Open task card → work through steps
3. ☐ For each step: inspect, then sign off (enter PIN, select cert, optional notes)
4. ☐ Mark N/A steps with reason
5. ☐ Record approved data reference per step
6. ☐ Record parts installed per step (if any)
7. ☐ Clock in/out time against this WO

### Potential gaps:
- No photo attachment on steps (critical for documenting corrosion, cracks, wear)
- No measurement recording (e.g., brake pad thickness, tire pressure, prop runout)
- No zonal inspection mapping (which zone of aircraft does this step cover?)
- No step-level notes visible to other techs (only handoff notes at card level)
- Can a tech mark a step as "in progress" vs just pending/complete/NA?
- No special tool checkout/return tracking
- No step dependencies (step 5 requires step 3 complete first)

---

## Phase 5: Discrepancy Documentation

**Real-world**: Jake finds a cracked exhaust riser on Engine #2, corrosion on the wing spar cap, and a leaking fuel bladder cell. Each is a discrepancy that must be documented, evaluated, and dispositioned.

### Steps in app:
1. ☐ Open a discrepancy from the task card or WO level
2. ☐ Document: description, component affected, P/N, S/N, position
3. ☐ Set severity and classification
4. ☐ Link discrepancy to specific task card step where found
5. ☐ Take photos of discrepancy

### Potential gaps:
- No severity/priority field on discrepancies
- No discrepancy-to-task-card-step link (only WO-level)
- No photo attachments
- No MEL/CDL reference for deferrable items
- No customer notification trigger when discrepancy found
- Can't create a discrepancy FROM a task card step (only from squawks page?)
- Where is "Raise Finding" accessible from?
- Disposition options — what are they? Do they cover repair/replace/overhaul/defer/CDL?

---

## Phase 6: Repair Authorization & Additional Work

**Real-world**: Jake calls the customer: "We found 3 items. Exhaust riser needs replacement ($4,200), spar cap corrosion needs blend repair ($1,800), fuel cell reseal ($6,500). Do you authorize?" Customer approves exhaust and spar, defers fuel cell.

### Steps in app:
1. ☐ Create supplemental quote with discrepancy repairs
2. ☐ Send quote to customer
3. ☐ Customer approves/declines individual line items
4. ☐ Convert approved items to new task cards
5. ☐ Defer declined items with documentation

### Potential gaps:
- No line-item-level approval/decline on quotes (only entire quote)
- No link from discrepancy → quote line item
- No "authorization required" status on WO when discrepancies found
- Can't partially convert a quote (all-or-nothing to WO)
- Deferred discrepancy tracking — does it carry forward to next WO?

---

## Phase 7: Repair Execution

**Real-world**: Jake orders the exhaust riser, receives it, installs it, and documents the work. Blend repairs the spar cap per SRM.

### Steps in app:
1. ☐ Create new task cards for approved repairs
2. ☐ Order parts (PO) for repairs
3. ☐ Receive and inspect parts
4. ☐ Execute repair task card steps
5. ☐ Document parts installed (P/N, S/N, condition, 8130-3)
6. ☐ Sign off repair steps

### Potential gaps:
- No removed parts tracking (old P/N, S/N, condition at removal, disposition)
- Parts installed on steps — does the schema actually track P/N, S/N, 8130-3?
- No repair data reference per step (SRM, CMM section)
- No conformity inspection step for repaired items

---

## Phase 8: Quality Review & IA Inspection

**Real-world**: As an IA, Jake (or another IA) reviews all completed work, verifies task card signatures, checks parts documentation, and performs the annual/progressive inspection approval.

### Steps in app:
1. ☐ Review all task cards — all steps signed off?
2. ☐ Review discrepancies — all dispositioned?
3. ☐ IA counter-signs inspection task cards
4. ☐ QCM (Quality Control Manager) review
5. ☐ Check close readiness

### Potential gaps:
- No IA counter-signature on task cards (only tech signature exists)
- No QCM review queue / dashboard
- No "IA inspection required" flag on specific task cards
- Can IA see all unsigned steps across all task cards at once?
- No inspection buyback concept (IA physically re-inspects work)
- Close readiness check — what does it actually verify?

---

## Phase 9: Return to Service

**Real-world**: All work complete, all discrepancies resolved, all parts documented. Jake makes the 43.9 maintenance record entry and the 43.11 inspection entry. Signs the aircraft back to service.

### Steps in app:
1. ☐ Navigate to WO → RTS page
2. ☐ Verify close readiness (all green)
3. ☐ Generate RTS document
4. ☐ Create maintenance record (43.9)
5. ☐ Create inspection record (43.11)
6. ☐ Update aircraft total time
7. ☐ Close work order

### Potential gaps:
- Does RTS update aircraft total time automatically?
- Can you create both 43.9 AND 43.11 records for the same WO?
- Is there a logbook entry summary view?
- Sticker/tag generation for aircraft (inspection due date sticker)?
- No aircraft release certificate / ferry permit generation

---

## Phase 10: Billing & Customer Pickup

**Real-world**: Front desk creates the invoice from the WO, adds all labor and parts. Customer pays, picks up aircraft.

### Steps in app:
1. ☐ Create invoice from WO
2. ☐ Review line items (labor hours × rate, parts cost + markup)
3. ☐ Apply tax
4. ☐ Send invoice
5. ☐ Record payment
6. ☐ Release aircraft

### Potential gaps:
- Auto-population of labor from time clock → invoice line items?
- Auto-population of parts from installed parts → invoice line items?
- No "release to customer" status or sign-out form
- No customer signature capture on pickup
