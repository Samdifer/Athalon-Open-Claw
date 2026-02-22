# Athelon — Core Data Model Architecture
**Document Type:** Architecture Specification  
**Author:** Rafael Mendoza (Product Architect / Tech Lead)  
**Date:** Day 1–3, Phase 1  
**Status:** DRAFT — Under team review  
**Dependencies:** Regulatory Requirements document (Webb/Eaton) must be read first

---

## Author's Note

> *I spent three days on this. I know that sounds like a lot. It's not enough.*
>
> *My father worked the line at LAX for 30 years. He had a logbook. It was a physical book, the size of a bible, held together with a rubber band after the binding gave out somewhere around 1997. When he signed an entry in that logbook, that was a legal act. He was saying: I did this work, on this aircraft, on this date, and I stake my certificate on it.*
>
> *Everything we build sits on top of that act. If we get the data model wrong, we corrupt the digital equivalent of a mechanic's handshake with the FAA. I will not rush this.*
>
> — R. Mendoza

---

## Design Principles

Before the entities, the principles. These are non-negotiable:

**1. Regulatory records are immutable.** A signed maintenance record cannot be modified. Period. This is not a UI constraint — it's a schema constraint. The database must enforce it.

**2. Aircraft-centricity.** Permanent records belong to the aircraft, not the organization. The data model must distinguish between organization-scoped data (work orders, inventory levels) and aircraft-scoped data (logbook entries, AD compliance, modification history).

**3. Time-awareness everywhere.** Aviation maintenance runs on time — hours, cycles, calendar dates. Every entity that can accumulate time must store that time at the moment of the event. You cannot reconstruct past-time-in-service from a current odometer.

**4. The work order crystallizes into the maintenance record.** Two different entities. Work order is the shop's working document — mutable, in-progress, operational. Maintenance record is the legal document — immutable, signed, permanent. The moment of signing is when the work order becomes a maintenance record.

**5. Traceability is total.** Every part can be traced from PO receipt through 8130-3 verification, to shelf, to installation, to removal, to disposal or re-certification. Every technician signature links to a certificate that was verified as current on the date of signature.

**6. Computed fields are never stored unless they are point-in-time snapshots.** AD next-due, technician recent-experience validity, part remaining-life — these are computed from source data. The source data is stored. Computed results are cached, not authoritative.

---

## The Ten Platform Capabilities (Entities Overview)

The Athelon platform addresses these 10 capabilities, in order of dependency:

1. **Aircraft Registry** — The aircraft itself; identity, configuration, time-in-service
2. **Technician / Certificate Management** — Who can do the work and what they're authorized for
3. **Parts & Component Inventory** — What's on the shelf, what's installed, where it came from
4. **Work Orders** — The operational document coordinating work in progress
5. **Discrepancy Management** — Defects found during inspection or operation
6. **Task Cards** — Step-by-step procedure execution with per-step sign-off
7. **Maintenance Records (Logbook Entries)** — The legal record; crystallized from work orders
8. **AD Compliance Tracking** — Mandatory airworthiness directives; applicability and intervals
9. **Inspection Management** — Annual, 100-hour, and other 43.11 inspections
10. **Return-to-Service Workflow** — The formal approval that an aircraft is airworthy

---

## Entity 1: Aircraft

### Description
The central entity of the entire system. Everything else either belongs to an aircraft or is performed on an aircraft. Getting this entity right is foundational.

### The Identity Problem (Non-Obvious Complexity #1)

An N-number (FAA registration) identifies a registration, not an aircraft. The same N-number can be de-registered and re-used on a different aircraft. An aircraft can change N-numbers while remaining the same physical aircraft. The unique identity of an aircraft is its **manufacturer serial number (MSN)** within a specific **make and model**.

But even that has edge cases:
- Homebuilt aircraft (EAB — Experimental Amateur Built) do not have manufacturer serial numbers in the traditional sense; the builder assigns one
- Aircraft that have undergone major structural repair may have amended type certificates
- Engines and propellers are separately registered components with their own serial numbers

**Design Decision: Aircraft Identity**
- Primary identifier: `{make} + {model} + {serial_number}` — this triple is unique and permanent
- N-number is a *property* of the aircraft (current registration) — stored but not the identifier
- N-number history is tracked (because maintenance records reference N-numbers that may have changed)

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | Auto-generated |
| `make` | string | ✅ | e.g., "Cessna", "Piper", "Boeing" |
| `model` | string | ✅ | e.g., "172S", "PA-28-181" |
| `series` | string | | e.g., "Skyhawk G1000" |
| `serial_number` | string | ✅ | Manufacturer serial number (MSN) |
| `current_registration` | string | | Current N-number (nullable — unregistered aircraft exist) |
| `registration_history` | array of { n_number, effective_date, expiry_date } | | Historical N-numbers |
| `type_certificate_number` | string | | FAA TC number (blank for homebuilts) |
| `experimental` | boolean | ✅ | EAB, LSA Experimental, etc. |
| `category` | enum | ✅ | Normal, Utility, Acrobatic, Limited, LSA, Experimental |
| `total_time_airframe` | number | ✅ | Hours TT at last known time |
| `total_time_airframe_as_of_date` | date | ✅ | Date of last TT update |
| `max_gross_weight` | number | | lbs |
| `engine_count` | number | ✅ | |
| `year_of_manufacture` | number | | |
| `owner_name` | string | | Current owner |
| `owner_address` | string | | |
| `operator_id` | ConvexId | | Foreign key to Organization |
| `status` | enum | ✅ | airworthy, out_of_service, destroyed, sold, unknown |
| `base_location` | string | | ICAO airport code |
| `created_at` | timestamp | System | |
| `updated_at` | timestamp | System | |

### Relationships
- **Aircraft → Engine[]** (one aircraft has one or more engines; modeled separately)
- **Aircraft → Propeller[]** (zero or more propellers)
- **Aircraft → Component[]** (installed components with life tracking)
- **Aircraft → MaintenanceRecord[]** (all 43.9/43.11 records; permanent; aircraft-scoped)
- **Aircraft → ADCompliance[]** (AD compliance status per AD)
- **Aircraft → WorkOrder[]** (current and historical work orders)

### Business Rules / Invariants
1. `{make, model, serial_number}` must be unique across the system
2. N-number uniqueness is enforced only within an effective-date range (historical N-number re-use must be allowed)
3. `total_time_airframe` can only increase (monotonic). System should warn if a new TT is less than last recorded TT.
4. Aircraft status can be `out_of_service` with open discrepancies — that is the normal state of an aircraft undergoing maintenance

### Open Questions
- How do we handle homebuilt aircraft with builder-assigned serial numbers? Add a `builder_id` field?
- LSA (Light Sport Aircraft) have a separate sport pilot certificate scheme — do we need separate aircraft category handling?
- Will we support Part 135/121 fleet management at launch? If yes, the fleet/tail relationship needs modeling.

---

## Entity 2: Engine

### Description
Engines are separately-tracked components with their own time-in-service, overhaul history, and AD applicability. An engine may be removed from one aircraft and installed on another. Engine time-since-overhaul (TSO) is tracked separately from airframe time.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `make` | string | ✅ | e.g., "Lycoming", "Continental", "Pratt & Whitney" |
| `model` | string | ✅ | e.g., "IO-360-L2A" |
| `serial_number` | string | ✅ | Manufacturer S/N |
| `current_aircraft_id` | ConvexId | | Aircraft currently installed on (null if in storage) |
| `position` | string | | "L" (left), "R" (right), "1", "2", "3", "4", or "C" (center) |
| `total_time` | number | ✅ | Hours TT since new |
| `time_since_overhaul` | number | | Hours since last OH (null if never overhauled) |
| `time_since_new` | number | | Hours since new (same as TT if never overhauled) |
| `time_limit_tbo` | number | | Manufacturer recommended TBO (hours) |
| `last_overhaul_date` | date | | |
| `overhaul_facility` | string | | Who did the overhaul |
| `overhaul_8130_reference` | string | | 8130-3 form number from overhaul release |
| `status` | enum | ✅ | installed, removed_serviceable, removed_unserviceable, scrapped |
| `total_time_as_of_date` | date | ✅ | |

### Business Rules
1. If status is `installed`, `current_aircraft_id` must be set
2. `time_since_overhaul` ≤ `total_time`
3. Engine TT is tracked separately from airframe TT; they diverge when engines are swapped

---

## Entity 3: Technician

### Description
Any person who performs or supervises maintenance. In Athelon, a Technician is distinct from a User (system account). A user may be linked to a technician certificate, but not all users are technicians and not all technicians have accounts.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `legal_name` | string | ✅ | Exactly as it appears on the certificate |
| `user_id` | ConvexId | | Link to auth system user (nullable — tech may not have system account) |
| `employee_id` | string | | Internal employee identifier |
| `organization_id` | ConvexId | ✅ | |
| `status` | enum | ✅ | active, inactive, terminated |

### Sub-Entity: Certificate

Each technician may hold one or more FAA certificates:

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `technician_id` | ConvexId | ✅ | |
| `certificate_type` | enum | ✅ | A&P, A_only, P_only, IA, Repairman, RepairStation |
| `certificate_number` | string | ✅ | FAA-issued number |
| `issue_date` | date | ✅ | |
| `ratings` | array of enum | | ["airframe", "powerplant"] |
| `ia_authorization` | boolean | | True if this certificate carries IA |
| `ia_expiry_date` | date | | Always March 31 of applicable year |
| `ia_renewal_activity_log` | array of {date, activity_type} | | Per 65.93 renewal requirements |
| `last_exercised_date` | date | | Date privileges were last exercised (65.83 currency) |
| `certificate_document_url` | string | | Scanned certificate |
| `active` | boolean | ✅ | System flag — updated by compliance check |

### Computed Properties (not stored — computed on query)
- `recent_experience_valid`: `last_exercised_date` within past 24 months (65.83)
- `ia_current`: `ia_authorization == true AND ia_expiry_date > today`
- `can_return_to_service_annual`: `ia_current AND recent_experience_valid`

### Business Rules
1. A technician may not sign a maintenance record using a certificate that was expired or non-current on the date of signing. System must validate this at time of signature.
2. IA expiry is always March 31 — year must be computed from issue/renewal date.
3. The `recent_experience_valid` computation must be evaluated as of the *signature date*, not today. Historical records must be validatable.

### Open Questions
- How do we handle foreign mechanics (EASA Part-66, Transport Canada M1/M2)? Some Part 145 shops use foreign nationals for certain work.
- Repair station authorization lists (who is authorized to do what at this specific repair station) — separate entity or property of Technician-Organization relationship?

---

## Entity 4: WorkOrder

### Description
The operational document that coordinates all work performed on an aircraft during a maintenance visit. Mutable while in progress. Has a defined lifecycle. At completion, crystallizes into one or more MaintenanceRecords.

### The Work Order Lifecycle

```
DRAFT → OPEN → IN_PROGRESS → PENDING_INSPECTION → PENDING_SIGNOFF → CLOSED
                                                          ↓
                                                   [if discrepancies found]
                                                   OPEN_DISCREPANCIES
                                                          ↓
                                                   [after all resolved]
                                                   PENDING_SIGNOFF
```

**State definitions:**
- `DRAFT`: Created but not yet started; aircraft not in shop
- `OPEN`: Authorized, aircraft received; work may begin
- `IN_PROGRESS`: Mechanics are actively working
- `PENDING_INSPECTION`: Work complete, awaiting QC/IA inspection
- `PENDING_SIGNOFF`: Inspection complete, awaiting final IA sign-off
- `OPEN_DISCREPANCIES`: Inspection found discrepancies; cannot close until resolved or deferred
- `CLOSED`: IA signed; maintenance records created; aircraft returned to service (or formally grounded)

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `work_order_number` | string | ✅ | Human-readable, organization-unique |
| `aircraft_id` | ConvexId | ✅ | |
| `organization_id` | ConvexId | ✅ | Repair station performing work |
| `status` | enum | ✅ | See lifecycle above |
| `work_order_type` | enum | ✅ | routine, unscheduled, annual_inspection, 100hr_inspection, progressive_inspection, ad_compliance, major_repair, major_alteration |
| `description` | string | ✅ | Customer-facing description of work requested |
| `squawks` | string | | Pilot-reported discrepancies at intake |
| `opened_at` | timestamp | ✅ | When aircraft was received |
| `opened_by_user_id` | ConvexId | ✅ | |
| `target_completion_date` | date | | |
| `closed_at` | timestamp | | Set when status → CLOSED |
| `closed_by_user_id` | ConvexId | | |
| `aircraft_total_time_at_open` | number | ✅ | Airframe TT when work began |
| `aircraft_total_time_at_close` | number | | Airframe TT at completion — required before close |
| `return_to_service_id` | ConvexId | | Link to ReturnToService record |
| `billing_status` | enum | | quoted, approved, invoiced, paid |
| `customer_id` | ConvexId | | Aircraft owner/operator as customer |
| `priority` | enum | | routine, urgent, aog (Aircraft on Ground) |
| `notes` | string | | Internal shop notes |

### Relationships
- **WorkOrder → TaskCard[]** (work items within the work order)
- **WorkOrder → Discrepancy[]** (defects found during this work order)
- **WorkOrder → PartUsage[]** (parts consumed/installed)
- **WorkOrder → MaintenanceRecord[]** (legal records produced when WO closes)
- **WorkOrder → Aircraft** (one aircraft per WO; one WO active at a time per aircraft is a soft rule)

### Business Rules
1. An aircraft may have multiple simultaneous open work orders, but the system should warn and require explicit override — this is an unusual situation
2. `aircraft_total_time_at_close` must be ≥ `aircraft_total_time_at_open`
3. A work order may not transition to CLOSED with any open discrepancies that are not formally dispositioned (corrected OR deferred per MEL OR deferred-aircraft-grounded)
4. Once CLOSED, the work order record becomes effectively immutable — it should not be edited, only annotated
5. Parts may not be marked as "installed" without a work order context

---

## Entity 5: Discrepancy

### Description
A defect, abnormality, or condition found during inspection or reported by the pilot/operator that requires disposition. The lifecycle of a discrepancy is one of the most regulatory-sensitive workflows in the system.

### The Discrepancy Lifecycle

```
OPEN → UNDER_EVALUATION → DISPOSITIONED → [three paths]:
  ├── CORRECTED (corrective action performed, maintenance record created)
  ├── DEFERRED_MEL (aircraft remains airworthy within MEL limitations)  
  └── DEFERRED_GROUNDED (aircraft not returned to service until corrected)
```

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `work_order_id` | ConvexId | ✅ | Parent work order |
| `aircraft_id` | ConvexId | ✅ | Denormalized from WO for aircraft-level queries |
| `discrepancy_number` | string | ✅ | WO-scoped number (e.g., WO-2024-001-D3) |
| `status` | enum | ✅ | open, under_evaluation, dispositioned |
| `disposition` | enum | | corrected, deferred_mel, deferred_grounded, no_fault_found |
| `found_during` | enum | ✅ | annual_inspection, 100hr_inspection, progressive, routine_maintenance, preflight, pilot_report |
| `description` | string | ✅ | Description of the discrepancy found |
| `component_affected` | string | | Component name |
| `component_part_number` | string | | |
| `component_serial_number` | string | | |
| `component_position` | string | | Location on aircraft |
| `found_by_technician_id` | ConvexId | ✅ | Who found it |
| `found_at` | timestamp | ✅ | |
| `found_at_aircraft_hours` | number | ✅ | Airframe TT when found |
| `disposition_by_technician_id` | ConvexId | | |
| `disposition_at` | timestamp | | |
| `mel_item_number` | string | | If deferred per MEL: the MEL item number |
| `mel_category` | enum | | A (10 days), B (3 days), C (120 days), D (no limit) |
| `mel_expiry_date` | date | | Computed from MEL category and deferral date |
| `corrective_action` | string | | Description of corrective action taken (required if disposition == corrected) |
| `corrective_maintenance_record_id` | ConvexId | | Link to MaintenanceRecord for the repair |
| `deferred_discrepancy_list_issued` | boolean | | Was written list given to owner per 43.11(b)? |
| `deferred_list_issued_at` | timestamp | | |
| `deferred_list_recipient` | string | | |

### Business Rules
1. If `disposition == deferred_grounded`, the parent WorkOrder cannot transition to CLOSED (only to a grounded state)
2. If `disposition == deferred_mel`, `mel_item_number` and `mel_category` are required
3. MEL Category A items must be corrected within 10 calendar days or the aircraft is grounded
4. When an aircraft is found with discrepancies and NOT returned to service, `deferred_discrepancy_list_issued` must be set to true before the work order can close — per 43.11(b)
5. A corrected discrepancy must link to a maintenance record proving the corrective action

---

## Entity 6: TaskCard

### Description
A structured, step-by-step procedure associated with a work order. Based on approved maintenance data (AMM, IPC, STC, or internal SOP). Each step requires individual sign-off by a qualified technician.

### The Step Sign-Off Problem (Non-Obvious Complexity #2)

This entity revealed the most design complexity: **What happens when a step is skipped?**

In a physical task card, a mechanic can simply not sign a step. This is illegal — unsigned steps mean the work wasn't done or wasn't verified. But in a paper world, it happens and inspectors catch it during QC.

In a digital system, we have a choice:
- **Option A: Prevent progression** — System blocks the next step from being signed until all prior steps are signed. Problem: parallel steps exist (e.g., two mechanics working simultaneously on different sections). Strict sequential enforcement doesn't match shop reality.
- **Option B: Flag and report** — Allow out-of-order signing, but flag unsigned steps at task card completion time. The task card cannot be marked complete with unsigned steps. Problem: what if a step is genuinely inapplicable (e.g., "inspect fuel boost pump" on an aircraft without a boost pump)?
- **Option C: Not-Applicable disposition** — Allow steps to be marked N/A by an authorized technician with a required reason. The N/A itself counts as a disposition. This matches shop practice and is defensible.

**Decision:** Option C (Option B + N/A disposition). The task card may not be marked complete with any step that is unsigned AND not marked N/A. The N/A requires an authorized technician's identity and a reason.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `work_order_id` | ConvexId | ✅ | |
| `aircraft_id` | ConvexId | ✅ | Denormalized |
| `task_card_number` | string | ✅ | Internal reference |
| `title` | string | ✅ | Human-readable name |
| `task_type` | enum | ✅ | inspection, repair, replacement, ad_compliance, functional_check, rigging, return_to_service |
| `approved_data_source` | string | ✅ | AMM chapter/section, STC number, AD number, etc. |
| `approved_data_revision` | string | | Document revision used |
| `assigned_to_technician_id` | ConvexId | | Primary assignee |
| `status` | enum | ✅ | not_started, in_progress, complete, incomplete_na_steps |
| `started_at` | timestamp | | |
| `completed_at` | timestamp | | |
| `steps` | see below | ✅ | |

### Sub-Entity: TaskCardStep

| Field | Type | Required | Notes |
|---|---|---|---|
| `step_number` | number | ✅ | Sequential, 1-indexed |
| `description` | string | ✅ | What to do |
| `requires_special_tool` | boolean | | |
| `special_tool_reference` | string | | Tool number if required |
| `sign_off_required` | boolean | ✅ | Default true |
| `sign_off_requires_ia` | boolean | | True for critical steps requiring IA |
| `status` | enum | ✅ | pending, completed, na |
| `signed_by_technician_id` | ConvexId | | |
| `signed_at` | timestamp | | |
| `signed_certificate_number` | string | | Certificate number as of signing date |
| `na_reason` | string | | Required if status == na |
| `na_authorized_by_id` | ConvexId | | Who authorized the N/A |
| `notes` | string | | Step-level notes |
| `discrepancy_ids` | array of ConvexId | | Discrepancies found during this step |

### Business Rules
1. A task card cannot transition to `complete` if any step with `sign_off_required == true` has `status == pending`
2. `na` status requires both `na_reason` and `na_authorized_by_id`
3. The certificate number is captured at signing time (not looked up later) — this is for historical accuracy
4. Steps with `sign_off_requires_ia == true` may only be signed by a technician with a current IA

---

## Entity 7: MaintenanceRecord

### Description
The legal maintenance record — the digital equivalent of a logbook entry. This is the immutable permanent record produced when a work order is closed. It corresponds to a 14 CFR 43.9 or 43.11 record.

**This entity is the most compliance-sensitive in the system.**

### Immutability Design

MaintenanceRecord rows are **never updated after creation**. The only permissible operation is INSERT. This is enforced at:
1. Database level: No UPDATE mutation is permitted on this table (Convex function-level restriction)
2. Application level: The UI provides no edit operation on signed records
3. Correction mechanism: Corrections create a new MaintenanceRecordCorrection row that references the original

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `record_type` | enum | ✅ | maintenance_43_9, inspection_43_11 |
| `aircraft_id` | ConvexId | ✅ | |
| `work_order_id` | ConvexId | ✅ | Source work order |
| `sequence_number` | number | ✅ | Aircraft-scoped sequence (logbook entry number) |
| `aircraft_make` | string | ✅ | Captured at signing time — denormalized |
| `aircraft_model` | string | ✅ | Captured at signing time |
| `aircraft_serial_number` | string | ✅ | Captured at signing time |
| `aircraft_registration` | string | ✅ | N-number at time of signing (historical) |
| `aircraft_total_time` | number | ✅ | Airframe TT at completion |
| `work_performed` | string | ✅ | Description per 43.9(a)(1) |
| `approved_data_reference` | string | ✅ | What approved data was used |
| `parts_replaced` | array of PartRecord | | See sub-type |
| `completion_date` | date | ✅ | Date work was completed per 43.9(a)(2) |
| `created_at` | timestamp | System | When the record was entered |
| `organization_id` | ConvexId | ✅ | Repair station |
| `organization_certificate_number` | string | ✅ | Repair station cert number — captured at signing |
| `technicians` | array of TechnicianSignature | ✅ | Min 1; each person who performed work |
| `signing_technician_id` | ConvexId | ✅ | The one making the record entry per 43.9(a)(3) |
| `signing_technician_legal_name` | string | ✅ | Captured at signing — denormalized |
| `signing_technician_certificate_number` | string | ✅ | Captured at signing |
| `signing_technician_certificate_type` | enum | ✅ | |
| `signature_timestamp` | timestamp | ✅ | |
| `signature_hash` | string | ✅ | Cryptographic hash of record content at signing |
| `signature_auth_event_id` | string | ✅ | Auth system event proving identity at signing |
| `return_to_service` | boolean | ✅ | True: aircraft returned to service; False: grounded |
| `return_to_service_statement` | string | | Full text of RTS statement |
| `discrepancies_found` | array of ConvexId | | Discrepancy IDs that were FOUND during this work |
| `discrepancies_corrected` | array of ConvexId | | Discrepancy IDs CORRECTED by this record |
| `discrepancy_list_provided` | boolean | | Per 43.11(b) |

### Sub-type: TechnicianSignature
```
{
  technician_id: ConvexId,
  legal_name: string,       // captured at signing
  certificate_number: string, // captured at signing
  certificate_type: enum,
  scope_of_work: string,    // what this person did
  signature_timestamp: timestamp,
}
```

### Sub-type: PartRecord (parts replaced/installed, embedded in maintenance record)
```
{
  part_number: string,
  part_name: string,
  serial_number: string | null,  // null for non-serialized
  quantity: number,
  action: enum,  // installed, removed, overhauled, repaired
  eight_one_thirty_reference: string | null,
  part_inventory_id: ConvexId | null,
}
```

### Sub-entity: MaintenanceRecordCorrection
When a signed record contains an error, a correction entry is created:

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `original_record_id` | ConvexId | ✅ | The record being corrected |
| `field_corrected` | string | ✅ | Which field contained the error |
| `original_value` | string | ✅ | Original value (stringified) |
| `corrected_value` | string | ✅ | Corrected value |
| `reason` | string | ✅ | Why the correction is needed |
| `corrected_by_technician_id` | ConvexId | ✅ | |
| `correction_timestamp` | timestamp | System | |
| `correction_signature_hash` | string | ✅ | Signed correction |

### Business Rules
1. No UPDATE operations on MaintenanceRecord — ever. All changes are corrections.
2. `signature_hash` is computed over the complete record content at signing — any field change would invalidate it
3. All denormalized fields (aircraft make/model/serial, technician name/cert) are frozen at signing and MUST NOT be updated even if the source records change
4. A maintenance record for a 43.11 inspection must include total time on airframe, engine(s), and propeller(s)

---

## Entity 8: InspectionRecord

### Description
The formal 43.11 inspection record — distinct from general 43.9 maintenance records. An annual inspection or 100-hour inspection produces one 43.11 InspectionRecord plus potentially many 43.9 MaintenanceRecords (for work done during the inspection).

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `work_order_id` | ConvexId | ✅ | |
| `aircraft_id` | ConvexId | ✅ | |
| `inspection_type` | enum | ✅ | annual, 100_hour, progressive, continuous_airworthiness |
| `inspection_date` | date | ✅ | Date inspection was completed |
| `aircraft_make` | string | ✅ | Captured at signing |
| `aircraft_model` | string | ✅ | |
| `aircraft_serial_number` | string | ✅ | |
| `aircraft_registration` | string | ✅ | |
| `total_time_airframe` | number | ✅ | Required per 43.11(a)(2) |
| `total_time_engine_1` | number | | |
| `total_time_engine_2` | number | | |
| `total_time_propeller` | number | | |
| `scope_description` | string | ✅ | Description of inspection scope per 43.11(a)(3) |
| `airworthiness_determination` | enum | ✅ | returned_to_service, not_returned_discrepancies |
| `discrepancy_ids` | array of ConvexId | | Discrepancies found during inspection |
| `ia_technician_id` | ConvexId | ✅ | Must be current IA |
| `ia_certificate_number` | string | ✅ | Captured at signing |
| `ia_signature_timestamp` | timestamp | ✅ | |
| `ia_signature_hash` | string | ✅ | |
| `discrepancy_list_issued_to_owner` | boolean | | Required per 43.11(b) if not returned to service |
| `ad_compliance_reviewed` | boolean | ✅ | Were applicable ADs reviewed during inspection? |
| `ad_compliance_references` | array of ConvexId | | ADCompliance records reviewed |
| `next_inspection_due_date` | date | | Calendar date next inspection due |
| `next_inspection_due_hours` | number | | TT at which next 100-hr is due |

### Business Rules
1. `airworthiness_determination` == `returned_to_service` requires that all discrepancies found are dispositioned (corrected OR deferred per MEL)
2. Annual inspections may only be signed by a current IA — validated against Certificate records
3. This record is immutable — same rules as MaintenanceRecord

---

## Entity 9: AirworthinessDirective

### Description
Master record for an FAA Airworthiness Directive. One AirworthinessDirective record per AD, shared across all aircraft in the system. Not aircraft-specific — the applicability determination creates the link.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `ad_number` | string | ✅ | e.g., "2024-15-07", "2019-10-22 R1" |
| `title` | string | ✅ | |
| `effective_date` | date | ✅ | |
| `docket_number` | string | | FAA docket |
| `applicability_text` | string | ✅ | Raw applicability text from the AD |
| `applicability_structured` | object | | Structured parsed version (make, model, serial ranges) |
| `ad_type` | enum | ✅ | one_time, recurring, terminating_action |
| `compliance_method_description` | string | ✅ | What the AD requires |
| `compliance_type` | enum | ✅ | calendar, hours, cycles, calendar_or_hours, other |
| `initial_compliance_hours` | number | | For hours-based compliance |
| `initial_compliance_date` | date | | For date-based compliance |
| `recurring_interval_hours` | number | | Null if one-time |
| `recurring_interval_calendar_days` | number | | Null if not calendar-recurring |
| `recurring_interval_cycles` | number | | Null if not cycle-based |
| `superseded_by_ad_id` | ConvexId | | If this AD was superseded |
| `supersedes_ad_id` | ConvexId | | AD this one supersedes |
| `emergency_ad` | boolean | ✅ | Emergency ADs have immediate compliance requirements |
| `source_url` | string | | Link to FAA DRS |
| `created_at` | timestamp | System | When added to system |
| `updated_at` | timestamp | System | |

---

## Entity 10: ADCompliance

### Description
The compliance status of a specific aircraft (or engine/component) against a specific AD. This is the aircraft-scoped record — one per AD per aircraft (or per AD per engine/component where applicable).

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `ad_id` | ConvexId | ✅ | The AD |
| `aircraft_id` | ConvexId | ✅ | The aircraft (or null if component-level) |
| `component_id` | ConvexId | | If AD applies to a specific component, not the aircraft |
| `engine_id` | ConvexId | | If AD applies to the engine |
| `applicable` | boolean | ✅ | Is this AD applicable to this aircraft? |
| `applicability_determination_notes` | string | | How applicability was determined |
| `applicability_determined_by_id` | ConvexId | | Who made the determination |
| `applicability_determination_date` | date | | |
| `compliance_status` | enum | ✅ | not_complied, complied_one_time, complied_recurring, not_applicable, superseded |
| `compliance_history` | array of ComplianceEvent | | Full history |
| `last_compliance_date` | date | | Date of last compliance action |
| `last_compliance_hours` | number | | Airframe TT at last compliance |
| `last_compliance_cycles` | number | | Cycles at last compliance (if applicable) |
| `next_due_date` | date | | Computed — when compliance next required |
| `next_due_hours` | number | | Computed |
| `next_due_cycles` | number | | Computed |
| `compliance_method_used` | string | | Which compliance method per the AD was used |
| `maintenance_record_ids` | array of ConvexId | | Maintenance records proving compliance |
| `notes` | string | | |

### Sub-type: ComplianceEvent
```
{
  compliance_date: date,
  aircraft_hours_at_compliance: number,
  aircraft_cycles_at_compliance: number | null,
  technician_id: ConvexId,
  maintenance_record_id: ConvexId,
  notes: string,
}
```

### Business Rules
1. `compliance_status == complied_recurring` requires at minimum one ComplianceEvent
2. AD next-due is computed, never manually entered
3. An aircraft with `applicable == true` and `next_due_date` in the past must trigger an airworthiness alert — the aircraft may not be returned to service
4. ADCompliance records are permanent — retained with the aircraft forever per 91.417(a)(2)(v)

---

## Entity 11: Part / Component

### Description
A physical part or component. Has two modes:
- **Inventory item:** On the shelf, available for installation
- **Installed component:** Currently installed on an aircraft or engine

### The Life-Limited Part Problem

Life-limited parts (LLPs) have a total life in cycles or hours defined by the manufacturer. The critical data points:
- **Total life limit** (from manufacturer data — stored with part type)
- **Time accumulated before arriving at this shop** (from 8130-3)
- **Time accumulated since installation** (tracked in our system)
- **Remaining life** = Total limit − (Pre-install time + Since-install time)

This means remaining-life is a *computed* value, not stored. The stored values are the pre-install times from the 8130-3 and the installation snapshot of aircraft hours/cycles.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `part_number` | string | ✅ | Manufacturer's part number |
| `part_name` | string | ✅ | |
| `description` | string | | |
| `serial_number` | string | | Required for serialized parts |
| `serialized` | boolean | ✅ | True for traceable parts |
| `life_limited` | boolean | ✅ | LLP flag |
| `life_limit_hours` | number | | Total life in hours (null if not hours-limited) |
| `life_limit_cycles` | number | | Total life in cycles (null if not cycle-limited) |
| `condition` | enum | ✅ | new, serviceable, overhauled, repaired, unserviceable, quarantine |
| `location` | enum | ✅ | inventory, installed, removed_pending_disposition, scrapped |
| `aircraft_id` | ConvexId | | If installed: which aircraft |
| `engine_id` | ConvexId | | If installed on engine |
| `install_position` | string | | Where on the aircraft |
| `installed_at` | timestamp | | |
| `installed_by_work_order_id` | ConvexId | | |
| `removed_at` | timestamp | | |
| `removed_by_work_order_id` | ConvexId | | |
| `hours_at_installation` | number | | Aircraft/engine TT when installed |
| `cycles_at_installation` | number | | If cycle-tracked |
| `hours_accumulated_before_install` | number | | From 8130-3 — prior service time |
| `cycles_accumulated_before_install` | number | | |
| `receiving_date` | date | | When received in our shop |
| `receiving_work_order_id` | ConvexId | | |
| `supplier` | string | | |
| `purchase_order_number` | string | | |
| `owner_supplied` | boolean | ✅ | Owner-supplied part (OSP) flag |
| `eight_one_thirty_id` | ConvexId | | Link to EightOneThirty record |
| `shelf_life_limit_date` | date | | Expiry date (for shelf-life-limited parts) |
| `quarantine_reason` | string | | If condition == quarantine |
| `quarantine_created_by_id` | ConvexId | | |
| `organization_id` | ConvexId | ✅ | Which shop owns this inventory record |

### Business Rules
1. A part with `condition == unserviceable` or `condition == quarantine` may not be installed
2. A life-limited part whose computed remaining life ≤ 0 must be automatically set to `unserviceable`
3. Owner-supplied parts without an 8130-3 must go through a receiving inspection workflow before installation is permitted
4. Shelf-life-limited parts with `shelf_life_limit_date` in the past must be set to `unserviceable` (or quarantine for investigation)
5. Part installation and removal are tracked as events — the complete installation history is maintained

---

## Entity 12: EightOneThirty (8130-3 Record)

### Description
Structured representation of FAA Form 8130-3. Not a PDF attachment — all 19 blocks stored as structured data, with the PDF also attached.

### Key Fields (selected — all 19 blocks)

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `form_tracking_number` | string | ✅ | Block 3: Unique per form |
| `approving_authority` | string | ✅ | Block 1 |
| `applicant_name` | string | ✅ | Block 2 |
| `organization_name` | string | | Block 4 |
| `work_order_reference` | string | | Block 5 |
| `item_number` | string | | Block 6 |
| `part_description` | string | ✅ | Block 7 |
| `part_number` | string | ✅ | Block 8 |
| `part_eligibility` | string | | Block 9 |
| `quantity` | number | ✅ | Block 10 |
| `serial_number` | string | | Block 11 |
| `life_limited` | boolean | ✅ | Block 12 |
| `life_remaining_hours` | number | | Block 12 — if LLP |
| `life_remaining_cycles` | number | | Block 12 — if LLP |
| `status_work` | enum | ✅ | Block 13: new, overhauled, repaired, inspected |
| `remarks` | string | | Block 14 |
| `certifying_statement` | string | ✅ | Block 15 |
| `authorized_signatory_name` | string | ✅ | Block 16 |
| `approval_number` | string | ✅ | Block 17 |
| `signature_date` | date | ✅ | Block 16 |
| `export_authorization` | string | | Block 18 (if applicable) |
| `pdf_url` | string | | Scanned original |
| `part_id` | ConvexId | | Link to Part record |
| `received_by_organization_id` | ConvexId | ✅ | |
| `received_date` | date | ✅ | |
| `verified_by_user_id` | ConvexId | | Who verified the 8130-3 on receipt |

---

## Entity 13: ReturnToService

### Description
The formal authorization that an aircraft is airworthy and approved for flight. Produced by an IA at the conclusion of a work order that includes return-to-service determination. Distinct from the maintenance record — this is the airworthiness determination.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `work_order_id` | ConvexId | ✅ | |
| `aircraft_id` | ConvexId | ✅ | |
| `inspection_record_id` | ConvexId | | For 43.11 inspections |
| `signed_by_ia_id` | ConvexId | ✅ | Must be current IA |
| `ia_certificate_number` | string | ✅ | |
| `ia_repair_station_cert` | string | | If signing as repair station authorized person |
| `return_to_service_date` | date | ✅ | |
| `return_to_service_statement` | string | ✅ | Full text of authorization |
| `aircraft_hours_at_rts` | number | ✅ | |
| `limitations` | string | | Any limitations on return (e.g., VFR only pending equipment repair) |
| `signature_hash` | string | ✅ | Cryptographic signature |
| `signature_timestamp` | timestamp | ✅ | |

---

## Entity 14: Organization

### Description
A repair station, MRO facility, or flight department using Athelon. Scopes most operational data.

### Key Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ConvexId | System | |
| `name` | string | ✅ | |
| `part_145_certificate_number` | string | | FAA repair station cert (null if not Part 145) |
| `part_145_ratings` | array of string | | Class and Limited ratings authorized |
| `address` | string | ✅ | |
| `phone` | string | | |
| `email` | string | | |
| `dfr_manager` | string | | Director of Maintenance |
| `qc_manager` | string | | Quality Control Manager |
| `rsm_revision` | string | | Repair Station Manual current revision |
| `subscription_tier` | enum | | For billing |
| `created_at` | timestamp | System | |

---

## Design Decisions with Tradeoffs

### Decision 1: Aircraft vs. Organization Record Ownership

**Problem:** Permanent records (AD compliance, inspection records) belong to the aircraft forever. But work orders, billing, and operational data belong to the organization performing the work. How do we separate these?

**Decision:** Aircraft-scoped records (`aircraft_id` as primary index, `organization_id` as secondary) vs. organization-scoped records (`organization_id` as primary, `aircraft_id` as foreign key).

| Record Type | Primary Owner | Transferable? |
|---|---|---|
| MaintenanceRecord | Aircraft | Yes — follows aircraft on sale |
| InspectionRecord | Aircraft | Yes |
| ADCompliance | Aircraft | Yes |
| WorkOrder | Organization | No — stays with shop |
| Parts Inventory | Organization | No |
| Billing | Organization | No |

**Tradeoff:** When an aircraft leaves an organization, its permanent records become orphaned from the organization that created them. We need a record-transfer mechanism. **Deferred — will address in Phase 2 when we design the customer/aircraft relationship model.**

### Decision 2: Immutable MaintenanceRecord in Convex

**Problem:** Convex doesn't have native row-level immutability. Any mutation function can update any row.

**Decision:** Enforce immutability at the application layer with multiple layers of protection:
1. No `updateMaintenanceRecord` mutation exists in the codebase
2. If a mutation attempts to write to this table with a non-insert operation, throw an error
3. Signature hash provides cryptographic immutability verification (after-the-fact detection)
4. Audit log captures any write attempt

**Tradeoff:** This is application-layer immutability, not database-level. A sufficiently motivated bad actor with database access could still modify records. True database-level immutability would require a separate append-only store (like an event log). Decision: Accept application-layer immutability for now; evaluate event sourcing for compliance records in Phase 3.

---

## Entity Relationship Diagram (Textual)

```
Organization
├── Technician[] (has certificates[])
├── WorkOrder[] → Aircraft (many-to-one)
│   ├── TaskCard[]
│   │   └── TaskCardStep[] (with signatures)
│   ├── Discrepancy[]
│   ├── PartUsage[] → Part
│   └── MaintenanceRecord[] (immutable, after close)
│       └── MaintenanceRecordCorrection[] (if needed)
├── Part/Inventory[]
│   └── EightOneThirty[]
└── Customer[]

Aircraft (owned by nobody — persists across organizations)
├── Engine[]
├── InspectionRecord[] (immutable, 43.11)
├── MaintenanceRecord[] (via work_order)
├── ADCompliance[] → AirworthinessDirective
└── InstalledComponent[] → Part

AirworthinessDirective (global, not org-scoped)
└── ADCompliance[] (per-aircraft)
```

---

## Open Questions (Carry to Review Meeting)

1. **Aircraft time tracking:** When an aircraft is returned from a work order, its TT must be updated. Who updates it? The IA at sign-off? The customer? Both? The schema must prevent TT from going backward.

2. **Progressive inspection programs:** Some aircraft operate on progressive inspection programs instead of annual/100-hour. How do we model the inspection schedule? This may require a new entity (InspectionProgram) that the InspectionRecord references.

3. **Squawk-to-Discrepancy pipeline:** Pilots report squawks (issues). Some become discrepancies. Some are "no fault found." The pre-discrepancy state — the pilot report — should it be modeled separately?

4. **MEL management:** MEL itself is a document maintained by the operator. Should Athelon host the MEL? Or just reference it when creating deferred discrepancies?

5. **Multi-shop work:** A work order is created by Shop A. Some work is contracted to Shop B (contract maintenance per 145.217). How do contract maintenance records work? The 43.9 record must be signed by the person who did the work at Shop B.

6. **Billing and work order value:** How does billing integrate? Labor rates by technician, part markups, flat-rate cards — is this Phase 1 scope?

*Document status: Ready for team review. Devraj has schema draft in progress.*
