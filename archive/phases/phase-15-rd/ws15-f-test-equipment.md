# WS15-F — Test Equipment Traceability (Avionics)

**Phase:** 15  
**Workstream:** WS15-F  
**Owner:** Devraj Anand (Backend/Convex)  
**SMEs:** Dale Purcell (Avionics, Henderson NV) + Teresa Varga (Parts, Hickory NC)  
**QA:** Cilla Oduya (Test Plan author)  
**Status at Open:** Parts receiving with `pending_inspection` state exists; quarantine as mutation-level block exists; no structured test equipment traceability model  
**Artifact Version:** 1.0 — 2026-02-22  

---

## SME Brief

### Dale Purcell — Avionics Technician, Henderson NV

Dale works at a Part 145 avionics shop outside Las Vegas. He does a mix of bench work and aircraft installs — everything from IFR avionics stacks to TAWS and ADS-B upgrades. He is meticulous about documentation in a way that most shops around him are not, and he is frank about why:

> "Calibration cert dates have to appear in the maintenance record for any test equipment used, per applicable TSOs. That's not a nicety. That's a requirement. I've never worked in an MRO system that had a structured field for this. Every single one uses a notes field, and notes fields don't get audited. I keep a personal binder of the applicable TSOs on my bench because I don't trust the shops I work with to know what they are."

On the gap in current MRO tooling:

> "The problem with a free-text notes field is that it's search-invisible and audit-invisible. When an FAA inspector comes in and asks to see the calibration records for the equipment used on tail number N12345, what am I showing them? A paragraph in a notes field that says 'used calibrated pitot-static test set, cal due 06/2024'? That's not a record. That's a Post-it note. I need structured fields: equipment ID, manufacturer, serial number, cal cert number, cal date, cal due date, cal lab. Searchable. Auditable. Linked to the maintenance record."

On equipment without valid calibration:

> "I've caught two shops doing avionics installs with test equipment that was out of cal. Both times, the shops didn't know — they just hadn't tracked it. One of them had a pitot-static tester that was three months out of cal. If that test result goes into the maintenance record and someone pulls the cal record later, you've got a potential airworthiness question on every aircraft that tester touched. That's a lot of callbacks."

On his minimum bar:

> "At a minimum: you can't use test equipment in a maintenance record entry without recording the calibration status. If the cal is expired, the system should flag it — not block it, because sometimes you're in a renewal gap and you've got documentation — but flag it prominently and require an explanation. And the calibration record should be linked to the maintenance record, not just noted in a text field."

On STCs and test equipment:

> "I caught two shops doing installs without valid STCs. The STC specifies the test equipment, and the test equipment specifies the test procedure. If your system is tracking the STC for the install, it should be able to tell you what test equipment is required and whether the shop's equipment list has a current calibrated example. That's the ideal. I know that's complex. But the baseline — cal dates in the record — is table stakes."

### Teresa Varga — Parts Inspector, Hickory NC

Teresa runs receiving and parts inspection at a mid-size repair station in North Carolina. She was brought in because her experience with 8130-3 fraud and parts traceability overlaps meaningfully with test equipment chain of custody:

> "In 2021, I caught a forged 8130-3 by looking up the Block 17 approval number. It didn't match any FAA-authorized organization. The paperwork was perfect — looked exactly right — but the approval number was made up. If we'd received that part without checking, it would have gone into an aircraft."

On the connection between parts traceability and test equipment:

> "Test equipment is a special category of shop equipment. It has its own pedigree — calibration certificates, NIST traceability, cal lab approval. The receiving workflow for test equipment should be at least as rigorous as parts receiving. When a new piece of test equipment comes in, who checks the cal cert? Is it current? Is it from an accredited lab? Right now that information lives in a binder on someone's bench. It should be in the system."

On the "structurally impossible to issue a quarantined part" principle:

> "The same principle that makes it impossible to approve a quarantined part should apply to out-of-cal test equipment. You shouldn't be able to record a test result in a maintenance record using equipment that the system knows is out of cal. The system should know. That's the whole point of having the data."

On minimum bar from her perspective:

> "When test equipment is received, the calibration certificate is received and verified at the same time as the equipment. The cert number, lab, date, and due date go in. The equipment doesn't go to 'available' status until that's done. Same workflow as receiving a part — just different fields."

### Combined Minimum Bar

1. Structured test equipment records with: equipment ID, make/model, serial number, calibration cert number, cal date, cal due date, cal lab (accredited), NIST-traceable (boolean), and applicable TSO reference
2. Equipment cannot be used in a maintenance record entry if its calibration is expired — at minimum, a flag and mandatory override explanation; at maximum, a hard block (to be decided with Marcus)
3. Calibration cert information appears in the maintenance record for any test equipment used — not as a notes field, as a structured linked record
4. Test equipment receiving workflow mirrors the parts receiving workflow: received → pending_cal_verification → available (or quarantine)
5. Cal expiry alerts: 30-day and 7-day pre-expiry notifications to assigned calibration coordinator

---

## R&D Scope

### Open Design Questions

1. **Hard block vs. advisory on expired cal?** Dale prefers advisory + explanation; Teresa prefers hard block. Marcus will resolve. The regulatory text (see below) supports at minimum a documented requirement; whether it supports a hard block at the mutation level needs analysis.

2. **What test procedures/TSOs trigger the traceability requirement?** Not every test tool in a shop requires traceable calibration. The requirement is specific to equipment used in certain regulated test procedures (pitot-static, transponder, altimeter, etc. — FAR Part 91 App E, FAR Part 43 App E, TSO-C106, etc.). We need a trigger model: does the technician tag equipment at sign-off time, or does the task card specify required equipment types?

3. **NIST traceability verification:** How does the system verify NIST traceability? Options: (a) attestation by receiving technician (manual), (b) Cal lab lookup via NVLAP accreditation database, (c) upload and manual review of cal cert. For v1.1, option (c) with attestation checkbox is the practical path.

4. **Cal cert storage:** Cal certs are typically PDF documents. Storage in Convex `_storage` via existing file upload mechanism. Are there retention requirements beyond Part 145 2-year standard?

5. **Test equipment lifecycle:** What happens when a piece of test equipment is sent out for calibration? There should be a `sent_for_calibration` state with a return/due date. Equipment in this state is unavailable for use.

6. **STC-specified equipment:** Dale's ideal of system-driven STC→required equipment matching is scoped to v2.0. For v1.1, the requirement is structured traceability records attached to maintenance record entries, not automated STC cross-reference.

### Regulatory Touch Points

- **14 CFR §43.9(a)(2)** — Approved data references in maintenance records; calibration cert data for test equipment is part of the "description of work" and approved data chain
- **14 CFR Part 43, Appendix E** — Altimeter, static, and transponder tests; specifies equipment requirements explicitly
- **14 CFR §91.411 and §91.413** — Altimeter/static/transponder inspection requirements for IFR operations; test equipment must be appropriately calibrated
- **TSO-C106** — Air data test sets; calibration requirements apply
- **AC 43-9C §6** — Maintenance record content; test equipment used should be identifiable from the record
- **ANSI/NCSL Z540-1** and **ISO/IEC 17025** — Lab accreditation standards (NVLAP) for calibration labs — not FAA regulations but are the recognized standard for NIST traceability
- **Part 145.109(a)** — Repair station must have and maintain equipment, tools, and materials necessary to perform approved maintenance; implies traceability

---

## Implementation Spec

### Data Model

#### `testEquipment` table (new)

```typescript
defineTable({
  // Identity
  internalEquipmentId: v.string(),     // Shop-assigned ID (e.g., "TE-0042")
  manufacturer: v.string(),
  modelNumber: v.string(),
  serialNumber: v.string(),
  description: v.string(),             // Human-readable: "Pitot-Static Test Set"
  
  // Equipment type / regulatory category
  equipmentCategory: v.union(
    v.literal("pitot_static"),
    v.literal("transponder"),
    v.literal("altimeter"),
    v.literal("radio_test"),
    v.literal("electrical_test"),
    v.literal("torque"),
    v.literal("other_calibrated"),
    v.literal("shop_tool_uncalibrated"),  // Does not require cal traceability
  ),
  
  // Applicable regulatory references (e.g., "14 CFR Part 43 Appendix E")
  applicableRegulations: v.array(v.string()),
  applicableTSOs: v.array(v.string()),  // e.g., ["TSO-C106"]
  
  // Lifecycle status
  status: v.union(
    v.literal("pending_cal_verification"),  // Received, cal not yet verified
    v.literal("available"),                 // In service, cal current
    v.literal("cal_expiring_soon"),         // Within 30-day expiry window
    v.literal("cal_expired"),               // Past cal due date
    v.literal("sent_for_calibration"),      // Out of shop for cal
    v.literal("quarantined"),               // Hold — anomaly detected
    v.literal("retired"),                   // No longer in service
  ),
  
  // Calibration record (current)
  currentCalibration: v.optional(v.object({
    calCertNumber: v.string(),
    calDate: v.number(),           // epoch ms
    calDueDate: v.number(),        // epoch ms
    calLab: v.string(),            // Lab name
    calLabAccreditationNumber: v.optional(v.string()),  // NVLAP number if available
    nistTraceable: v.boolean(),
    calCertStorageId: v.id("_storage"),   // PDF upload
    verifiedBy: v.id("users"),
    verifiedAt: v.number(),
  })),
  
  // Cal history (immutable log)
  calibrationHistory: v.array(v.object({
    calCertNumber: v.string(),
    calDate: v.number(),
    calDueDate: v.number(),
    calLab: v.string(),
    nistTraceable: v.boolean(),
    calCertStorageId: v.id("_storage"),
    replacedAt: v.number(),        // When this record was superseded
    replacedBy: v.id("users"),
  })),
  
  // Receiving provenance
  receivedAt: v.number(),
  receivedBy: v.id("users"),
  purchaseOrderRef: v.optional(v.string()),
  
  // Organizational scope
  orgId: v.id("organizations"),
  assignedLocation: v.optional(v.string()),  // Bench / bay / cage
})
.index("by_org", ["orgId"])
.index("by_status", ["orgId", "status"])
.index("by_calDue", ["orgId", "currentCalibration.calDueDate"])
.index("by_serialNumber", ["serialNumber"])
```

#### `maintenanceRecordTestEquipmentLinks` table (new)

Links test equipment usage to specific maintenance record entries:

```typescript
defineTable({
  maintenanceRecordId: v.id("maintenanceRecords"),  // or taskStepId, TBD on granularity
  taskCardId: v.id("taskCards"),
  workOrderId: v.id("workOrders"),
  testEquipmentId: v.id("testEquipment"),
  
  // Snapshot of cal status AT TIME OF USE — immutable, for audit
  calStatusAtUse: v.union(
    v.literal("current"),
    v.literal("expired"),
    v.literal("expiring_soon"),
  ),
  calCertNumberAtUse: v.string(),
  calDateAtUse: v.number(),
  calDueDateAtUse: v.number(),
  calLabAtUse: v.string(),
  nistTraceableAtUse: v.boolean(),
  
  // If cal was expired at use: mandatory explanation
  expiredCalOverride: v.optional(v.object({
    explanation: v.string(),     // Min 30 chars
    authorizedBy: v.id("users"),
    authorizedAt: v.number(),
  })),
  
  // Who linked this equipment to this record
  linkedBy: v.id("users"),
  linkedAt: v.number(),
})
.index("by_maintenanceRecord", ["maintenanceRecordId"])
.index("by_workOrder", ["workOrderId"])
.index("by_equipment", ["testEquipmentId"])
```

#### `testEquipment` table — receiving state additions

The `pending_cal_verification` state mirrors `pending_inspection` in parts receiving:
- Equipment enters this state when received
- Cannot transition to `available` without `currentCalibration` being fully populated
- Transition is a mutation that verifies all required cal fields are non-empty

### Mutations

#### `mutations/testEquipment.ts` — `receiveTestEquipment`

```typescript
// Arguments:
{
  internalEquipmentId: string,
  manufacturer: string,
  modelNumber: string,
  serialNumber: string,
  description: string,
  equipmentCategory: EquipmentCategory,
  applicableRegulations: string[],
  applicableTSOs: string[],
  purchaseOrderRef?: string,
  assignedLocation?: string,
}

// Creates equipment record in status: "pending_cal_verification"
// Does NOT create a calibration record yet
// Emits audit event: EQUIPMENT_RECEIVED
```

#### `mutations/testEquipment.ts` — `verifyCalibratio`

```typescript
// Arguments:
{
  testEquipmentId: Id<"testEquipment">,
  calCertNumber: string,
  calDate: number,
  calDueDate: number,
  calLab: string,
  calLabAccreditationNumber?: string,
  nistTraceable: boolean,
  calCertStorageId: Id<"_storage">,
}

// Validation:
// - calDate must be in the past
// - calDueDate must be in the future (or: if in the past, status → "cal_expired" not "available")
// - calCertStorageId must reference a valid uploaded file
// - calCertNumber must be non-empty

// Side effects:
// - Sets currentCalibration
// - Sets status: "available" (if calDueDate > now) or "cal_expired" (if calDueDate <= now)
// - Emits audit event: CALIBRATION_VERIFIED
```

#### `mutations/testEquipment.ts` — `recordCalibrationReturn`

```typescript
// Called when equipment returns from a cal lab
// Moves old currentCalibration to calibrationHistory
// Sets new currentCalibration
// Transitions status from "sent_for_calibration" → "available"
// Emits: CALIBRATION_UPDATED
```

#### `mutations/maintenanceRecords.ts` — `linkTestEquipment` (new)

```typescript
// Arguments:
{
  maintenanceRecordId: Id<"maintenanceRecords">,
  taskCardId: Id<"taskCards">,
  workOrderId: Id<"workOrders">,
  testEquipmentId: Id<"testEquipment">,
  expiredCalOverride?: { explanation: string },
}

// Validation:
// - testEquipmentId must reference equipment with status "available", "cal_expiring_soon",
//   or "cal_expired" (expired requires expiredCalOverride)
// - If status === "cal_expired" and no expiredCalOverride provided: throw error
// - Equipment must be "available" or "cal_expiring_soon" to link without override
// - Snapshots all cal data at time of link (immutable in the link record)
// - Emits: EQUIPMENT_LINKED_TO_RECORD
```

### Queries

#### `queries/testEquipment.ts` — `getEquipmentForOrg`

```typescript
// Returns full equipment list for an org with status summary
// Supports filter by: status, category, cal due within N days
```

#### `queries/testEquipment.ts` — `getCalExpiringWithin`

```typescript
// Arguments: { orgId, daysAhead: number }
// Returns all equipment where calDueDate is within daysAhead days
// Powers cal expiry alert system
```

#### `queries/maintenanceRecords.ts` — `getEquipmentUsedOnRecord`

```typescript
// Returns all equipment linked to a maintenance record
// Includes snapshot cal data (not live cal status — snapshot at time of use)
// Used for: audit export, PDF generation, FAA inspector response
```

### UI Components

#### `TestEquipmentPanel` — on task card / maintenance record entry

- Displayed on task cards that require calibrated test equipment (based on `equipmentCategory` and task type)
- Shows list of equipment linked to this entry
- CTA: "Add Test Equipment Used"
- Each linked item shows: Equipment ID, description, cal cert number, cal date, cal due date, cal status badge (current/expiring/expired)
- Expired cal badge is prominent red with "Override required" text if linked with expired cal
- Equipment with expired cal linked via override shows amber "Cal expired at time of use — override documented" badge

#### `TestEquipmentPicker` — modal for linking equipment

- Search by internal ID, description, serial number
- Filters out `quarantined` and `retired` equipment
- Shows cal status prominently for each result
- Equipment with expired cal is flagged but selectable (triggers override flow)
- Override flow: textarea for explanation (min 30 chars), authorized-by dropdown (IA or shop lead)

#### `TestEquipmentDashboard` — shop-level management view

- List of all equipment with status badges
- Sortable by cal due date (earliest first) — primary use case
- Alert banner: "N items expiring within 30 days" with link to filtered list
- Filter by status, category, location
- Bulk actions: "Mark sent for calibration" (batch)

#### `CalExpiryNotificationSystem`

- Scheduled Convex action (cron): runs daily, queries `getCalExpiringWithin(30)`
- Sends in-app notifications to assigned calibration coordinator
- 30-day warning: advisory (amber)
- 7-day warning: urgent (red), escalates to shop lead in addition to cal coordinator
- Expiry day: all available units transition to `cal_expired`; any task card using that equipment gets a flag in the UI

---

## Test Plan — Cilla Oduya

> "My goal is to find the path where a mechanic uses an out-of-cal instrument, that test result goes into the maintenance record, and the system never flags it. If I can find that path, the feature doesn't ship."

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| TC-F-01 | Link current-cal equipment to maintenance record | Equipment TE-0042 with calDueDate 90 days out; link to maintenance record for pitot-static test on N12345 | Link succeeds; `maintenanceRecordTestEquipmentLinks` record created with calStatusAtUse="current", cal snapshot populated; maintenance record export shows TE-0042 cal data in structured format | §43.9(a)(2); AC 43-9C §6 |
| TC-F-02 | Attempt to link expired-cal equipment without override | Equipment TE-0011 with calDueDate 45 days ago; attempt to link with no `expiredCalOverride` | `linkTestEquipment` mutation throws error: "Equipment TE-0011 calibration expired 45 days ago — override documentation required"; no link record created | §43.9(a)(2); Part 43 App E |
| TC-F-03 | Link expired-cal equipment WITH valid override | Equipment TE-0011 expired; technician provides explanation "Equipment submitted for recalibration 3 days ago; Cal lab confirmed pickup; awaiting cert"; authorized by shop IA | Link record created with calStatusAtUse="expired" and expiredCalOverride populated; maintenance record shows amber "Cal expired at use — override documented" badge; explanation text included in audit export | §43.9(a)(2) |
| TC-F-04 | Cal verification required before equipment available | Equipment TE-0099 received yesterday; status = "pending_cal_verification"; technician attempts to link to maintenance record | `linkTestEquipment` mutation rejects: "Equipment TE-0099 is pending calibration verification — cannot use until verified"; equipment not linkable in any record | Part 145.109(a) |
| TC-F-05 | Cal data snapshot integrity — cal updated after link | Equipment TE-0042 linked to record at T=0 (calDueDate = Jun 2024). Cal renewed at T+7 days (calDueDate updated to Jun 2025). Query maintenance record at T+14 days. | `maintenanceRecordTestEquipmentLinks.calDueDateAtUse` still shows Jun 2024 (original snapshot). Live equipment record shows Jun 2025. Snapshot is immutable. Audit export uses snapshot data for historical records. | AC 120-78B non-repudiation; audit trail integrity |
| TC-F-06 | Cal expiry transition — equipment in-use | Equipment TE-0042 is currently `available` and linked to 3 open work orders. Cal due date passes (simulated by setting calDueDate = yesterday in test environment). | Equipment status transitions to `cal_expired`; all 3 open WO task cards receive in-app alert: "Test equipment TE-0042 calibration has expired — verify record validity"; equipment cannot be linked to any new records until recertified; existing links are NOT retroactively invalidated (only future links blocked) | Part 43 App E; §91.411 |
| TC-F-07 | 30-day and 7-day expiry alerts | Equipment TE-0033 with calDueDate exactly 30 days from now; run daily cron job | At day 30: amber advisory notification sent to calibration coordinator (and only coordinator). At day 7: urgent red notification sent to coordinator AND shop lead. Confirm notification content includes equipment ID, description, cal due date, and recommended action. | Part 145.109(a); internal SLA |
| TC-F-08 | Maintenance record PDF export — equipment section | Work order with 2 task cards; each has different test equipment linked | PDF export includes a "Test Equipment Used" section for each task card; each entry shows: equipment ID, make/model, serial, cal cert number, cal date, cal due date, cal lab, NIST traceable (Y/N); the section is clearly labeled and formatted for FAA inspector readability | §43.9(a)(2); AC 43-9C §6 |
| TC-F-09 | Quarantined equipment — block on link | Equipment TE-0077 has been placed in quarantine status | Attempt to link TE-0077 to any maintenance record; mutation rejects with "Equipment quarantined — not available for use"; quarantine reason visible to user | Teresa Varga "structurally impossible" requirement |
| TC-F-10 | Cal history retained across renewals | Equipment TE-0042 has had 3 cal cycles over 5 years. Query calibrationHistory. | All 3 historical cal records present in `calibrationHistory` array with `replacedAt` timestamps showing when each was superseded; history is immutable (no delete mutation exists); full history accessible from equipment detail view and audit export | Part 145.217 records retention |

---

## Compliance Sign-Off Checklist — Marcus Webb

> "The calibration chain for test equipment is an area where I've personally seen Letters of Investigation issued. The FAA's question is always the same: 'How do you know the test equipment used on this aircraft was calibrated, and how do I know the calibration was NIST-traceable?' If the answer is 'it's in the notes field,' that's not an answer."

### Applicable Regulations and ACs

- **14 CFR §43.9(a)(2)** — Approved data references in maintenance records (includes test equipment cal data)
- **14 CFR Part 43, Appendix E** — Altimeter, static, and transponder test requirements and equipment specifications
- **14 CFR §91.411 / §91.413** — IFR equipment test and inspection currency
- **Part 145.109(a)** — Equipment availability and condition requirements for repair stations
- **Part 145.217** — Records retention (minimum 2 years)
- **AC 43-9C §6** — Maintenance record content
- **TSO-C106 and related TSOs** — Test equipment technical standard orders

### Marcus Webb Pre-Release Checklist

**HARD BLOCKERS — Any one of these = NO-GO:**

- [ ] **[HARD BLOCK]** The calibration data snapshot in `maintenanceRecordTestEquipmentLinks` must be immutable after creation. No mutation may update or delete `calCertNumberAtUse`, `calDateAtUse`, `calDueDateAtUse`, or `calLabAtUse` on a link record. If the live cal record changes, the historical maintenance record must reflect the cal status AT TIME OF USE. Test TC-F-05 must pass at mutation level.
- [ ] **[HARD BLOCK]** Equipment in `pending_cal_verification` or `quarantined` status must not be linkable to any maintenance record under any path, including direct API calls. This mirrors the parts quarantine hard block and must be enforced at the mutation level, not the UI level. Test TC-F-04 and TC-F-09 must pass via direct API.
- [ ] **[HARD BLOCK]** The maintenance record PDF export must include a structured "Test Equipment Used" section. A maintenance record that references test results (e.g., pitot-static test, transponder check) without traceable equipment data is incomplete per AC 43-9C §6.
- [ ] **[HARD BLOCK]** Calibration history must be retained for a minimum of 2 years per Part 145.217. Verify that no archival or data retention policy deletes `calibrationHistory` entries or the associated `calCertStorageId` files within the retention window.

**Standard Verification Items:**

- [ ] Determine whether the expired-cal override path constitutes a hard block or advisory: Marcus must rule on this before build. Recommendation: advisory with mandatory documented override for v1.1; hard block in a future rev after workflow stabilizes.
- [ ] Confirm the list of `equipmentCategory` values and their mapped regulatory references. The mapping from category to applicable TSO/FAR must be correct — an incorrect mapping could result in the system failing to flag a category that requires traceable calibration.
- [ ] Verify that `NIST-traceable` boolean is attested by the receiving technician and is not auto-derived — the attestation must be deliberate, not defaulted.
- [ ] Confirm that the `calLabAccreditationNumber` field, while optional in the schema, is prominently prompted during cal verification entry. NVLAP accreditation is the recognized standard; the field should not be skippable without acknowledgment.
- [ ] Review the 30-day and 7-day alert routing: who receives the alerts, and what their required response is. Consider whether an unacknowledged 7-day alert should escalate to a shop-level QA record entry.
- [ ] Confirm that `sent_for_calibration` status prevents equipment use during the out-for-cal period, not just `cal_expired`.
- [ ] Review the FSDO response scenario: if an FAA inspector requests documentation of test equipment used on a specific aircraft, can we produce a complete, structured report including cal cert PDFs? The `getEquipmentUsedOnRecord` query and PDF export path must support this use case.

---

## Status

**READY FOR BUILD**

One pre-build decision required:
- Marcus must rule on the hard-block vs. advisory-with-override policy for expired-cal equipment before `linkTestEquipment` mutation is written.

All other components are specced and ready. Recommend starting with the `testEquipment` data model and receiving workflow (closest analog to existing parts receiving flow — Devraj can adapt that pattern directly).

---
*Filed: 2026-02-22 | Second-wave R&D session | Athelon Phase 15*
