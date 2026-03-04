# Athelon Schema Review — Regulatory Compliance Assessment
**Document Type:** Regulatory Review  
**Reviewer:** Marcus Webb, Regulatory & Compliance Engineer  
**Date:** Phase 1, Day 4  
**Review Subject:** `convex-schema.md` (Devraj Anand, primary author)  
**Reference Documents:** `regulatory-requirements.md`, `data-model-architecture.md`  
**Regulatory Lens:** 14 CFR Part 43, Part 65, Part 145, AC 43-9C  
**Status:** DRAFT — Pending team discussion

---

## Reviewer's Prefatory Note

I've gone through this schema field by field against the regulatory requirements Rosa and I produced on Day 1. Devraj has done solid work. The overall structure is sound — better than I expected, frankly. The maintenance record immutability design is correct. The decision to separate `maintenanceRecords` from `inspectionRecords` is correct. The `adCompliance` architecture is directionally right.

That said, there are compliance gaps that need to be resolved before we write a single mutation function. Some of these are subtle. A few are blocking. I'll go through them in order of severity.

I'm writing this as a memo to the team, not as a collection of GitHub comments. The schema needs to be reviewed holistically — several of these gaps interact with each other.

---

## 1. Audit Trail Integrity

### 1.1 The `auditLog` Table Is Structurally Adequate — With Reservations

The `auditLog` table captures the right event taxonomy. The `eventType` union is comprehensive. The combination of `tableName + recordId + userId + timestamp` gives us a workable audit record.

My reservations:

**1.1.1 `organizationId` is optional on `auditLog`.**

```typescript
organizationId: v.optional(v.id("organizations")),
```

This will be the default choice when writing system-level events. But for any event touching regulated records — `record_signed`, `correction_created`, `technician_signed` — `organizationId` must be present. An audit event for a maintenance record correction that has no organization linkage is unqueryable in an FAA inspection context. The inspector asks: "Show me all corrections made by repair station [CERT]." If `organizationId` is null on correction events, that query returns incomplete results.

**Recommendation:** Make `organizationId` required for the event types that correspond to regulated records. This can be done via application-layer validation in the mutation — the schema type itself doesn't support conditional required fields in Convex, but the mutation that writes `correction_created` events should enforce it. Document this explicitly in the mutations spec.

**1.1.2 No `sessionId` field on `auditLog`.**

The FAA doesn't require session-level audit granularity. But AC 43-9C, under the authenticity requirement, calls for records that are "traceable to the person who signed." When the same user ID appears 47 times in a single day, distinguishing between a legitimate signing session and unauthorized access is difficult without session context.

We have `ipAddress` and `userAgent`, which is adequate for now. But in a security incident review, session correlation is what distinguishes "technician signed 12 records in normal course of work" from "someone accessed the account and signed 12 records." Flag this for Phase 2.

**1.1.3 `auditLog` has no index on `technicianId`.**

```typescript
.index("by_user", ["userId", "timestamp"])
```

We index on `userId` (the Clerk user ID) but not on `technicianId`. An FAA inspector asking "show me everything technician AB123456 has signed" is asking by technician identity — which is the regulatory identifier — not by system user account. These are linked but not identical; a technician can operate under different Clerk accounts if (for example) they move between organizations.

**Recommendation:** Add `.index("by_technician", ["technicianId", "timestamp"])` to `auditLog`.

**1.1.4 `record_viewed` events and log volume.**

We agreed during the Day 1 meeting that viewing signed records should be logged. Rosa's position was that litigation scenarios make view logs valuable. I still agree. But `record_viewed` events for a high-volume shop will generate substantial log volume and could degrade the `by_record` index query performance.

This is an operational concern, not a compliance gap. Flag for Devraj's attention in the mutations design phase.

---

### 1.2 Correction Record Design — `maintenanceRecords` Table

The correction mechanism is modeled as a self-referential link within `maintenanceRecords`:

```typescript
corrects: v.optional(v.id("maintenanceRecords")),
correctionFieldName: v.optional(v.string()),
correctionOriginalValue: v.optional(v.string()),
correctionCorrectedValue: v.optional(v.string()),
correctionReason: v.optional(v.string()),
```

This is workable. My concern is that `recordType` distinguishes corrections:

```typescript
recordType: v.union(
  v.literal("maintenance_43_9"),
  v.literal("inspection_43_11"),
  v.literal("correction")
),
```

When `recordType == "correction"`, the fields `corrects`, `correctionFieldName`, `correctionOriginalValue`, `correctionCorrectedValue`, and `correctionReason` are all required by AC 43-9C. But the schema marks them all `v.optional(...)`. 

This means you can create a correction record with no reference to what it corrects. That is not a valid correction record. It's an orphaned record that an inspector would reject.

**Requirement:** When `recordType == "correction"`, the following fields must be populated:
- `corrects` — which record is being corrected
- `correctionFieldName` — which field contained the error
- `correctionOriginalValue` — what the original value was
- `correctionCorrectedValue` — what the correct value is
- `correctionReason` — why the correction is being made

The schema cannot enforce this — Convex doesn't support conditional required fields. The enforcement must live in the `createCorrectionRecord` mutation, and must be tested explicitly. I'll call this out in the blockers section.

**Additionally:** The correction record must itself be signed. Looking at the `maintenanceRecords` structure, a correction record would inherit the signing fields (`signingTechnicianId`, `signatureHash`, `signatureTimestamp`, `signatureAuthEventId`) that are not optional in this table. That's correct. But the correction record needs its own `signatureHash` computed over the correction-specific fields, not just the original record fields. Make sure the signing mutation for corrections hashes the right field set.

---

### 1.3 The Signatory Authentication Event

The `signatureAuthEventId` field exists on `maintenanceRecords`, `inspectionRecords`, and `returnToService`:

```typescript
signatureAuthEventId: v.string(),
```

This is the right concept. The question is: what is this ID pointing to? It should point to a Clerk authentication event that proves the user was actively authenticated at the time of signing — not just that they had a valid session token.

This is an application design question, not a schema question. But I'm noting it here because if `signatureAuthEventId` can be populated with any arbitrary string (e.g., the Clerk session token rather than a specific auth event), then the signature trail does not meet the AC 43-9C authenticity standard. The value in this field must be independently verifiable.

**Requirement for Phase 1:** Document exactly what `signatureAuthEventId` contains, how it is generated, and how it can be queried to verify the identity at signing time. This documentation must exist before any maintenance record can be considered legally defensible.

---

## 2. Airworthiness Directive Linkage

### 2.1 `adCompliance` Structure

The `adCompliance` table is structurally sound. The compliance history array, the next-due caching, and the aircraft/engine/part linkage are all correctly modeled.

Issues I've found:

**2.1.1 `aircraftId` is optional in `adCompliance`.**

```typescript
aircraftId: v.optional(v.id("aircraft")),
engineId: v.optional(v.id("engines")),
partId: v.optional(v.id("parts")),
```

All three target identifiers are optional. This means a `adCompliance` record can be created with no linkage to any aircraft, engine, or part. That's an orphaned AD compliance record — useless for regulatory purposes and impossible to query correctly.

**Requirement:** At least one of `aircraftId`, `engineId`, or `partId` must be set. This is an application-layer invariant. The mutation must enforce it.

**2.1.2 No index on `adCompliance` for `engineId` or `partId`.**

```typescript
.index("by_ad_aircraft", ["adId", "aircraftId"])
.index("by_aircraft", ["aircraftId"])
.index("by_ad", ["adId"])
.index("by_status", ["organizationId", "complianceStatus"])
.index("by_next_due_date", ["nextDueDate"])
.index("by_next_due_hours", ["aircraftId", "nextDueHours"])
```

There's no index on `engineId`. If an engine is moved between aircraft and has its own AD compliance records (which it will — Lycoming ADs apply to engine serial numbers, not aircraft), querying all AD compliance for a specific engine requires a table scan. This will be a problem as data volume grows.

**Recommendation:** Add `.index("by_engine", ["engineId"])` and `.index("by_part", ["partId"])`.

**2.1.3 The supersession chain on `airworthinessDirectives`.**

```typescript
supersededByAdId: v.optional(v.id("airworthinessDirectives")),
supersedesAdId: v.optional(v.id("airworthinessDirectives")),
```

These fields allow modeling the AD supersession chain. Good. But there's no `complianceStatus` value in `adCompliance` that explicitly represents "complied under the predecessor AD before supersession." The current enum is:

```typescript
complianceStatus: v.union(
  v.literal("not_complied"),
  v.literal("complied_one_time"),
  v.literal("complied_recurring"),
  v.literal("not_applicable"),
  v.literal("superseded"),
  v.literal("pending_determination")
),
```

The `superseded` status applies to the AD itself being superseded. But what about the compliance record? If an aircraft complied with AD 2020-10-05, and then AD 2022-07-12 superseded it with new requirements, the aircraft's `adCompliance` record for the old AD should show `superseded`. The new AD's compliance record starts at `not_complied` (or `pending_determination` while the shop determines whether prior compliance carries over). This logic is correct if `superseded` means "this AD is no longer the governing AD" rather than "this compliance record has been superseded." I'd recommend clarifying the intended semantics in a code comment. The ambiguity could cause compliance logic errors.

**2.1.4 No `applicabilityDeterminedAt` required index.**

For recurring ADs, the system needs to alert when `nextDueDate` is approaching, not just when it has passed. The current index:

```typescript
.index("by_next_due_date", ["nextDueDate"])
```

allows querying all compliance records ordered by next-due date. That's the right structure. Make sure the alerting logic queries upcoming-due (e.g., within 30 days) and not just overdue.

---

### 2.2 AD Linkage to Inspection Records

The `inspectionRecords` table has:

```typescript
adComplianceReviewed: v.boolean(),
adComplianceReferenceIds: v.array(v.id("adCompliance")),
```

This is correct — annual inspections must review AD compliance. However, `adComplianceReviewed` being a simple boolean does not capture *which* ADs were found applicable and reviewed. If the `adComplianceReferenceIds` array is empty and `adComplianceReviewed` is `true`, that's a regulatory finding waiting to happen. An inspector will ask: "You certified you reviewed AD compliance, but there are no AD records linked to this inspection. What exactly did you review?"

**Requirement:** If `adComplianceReviewed == true`, `adComplianceReferenceIds` must not be empty. This is an application-layer validation. The inspection closing mutation must enforce it.

Exception: Aircraft with no applicable ADs exist — primarily older homebuilts or very specific type certificates with no AD history. The system should allow `adComplianceReviewed == true` with an empty array only if there's a corresponding `notes` field entry documenting that no ADs were found applicable. The current `inspectionRecords` table has no general `notes` field. Add one.

---

## 3. Work Order Chain of Custody

### 3.1 Aircraft Time Tracking at Work Order Close

The `workOrders` table has:

```typescript
aircraftTotalTimeAtOpen: v.number(),
aircraftTotalTimeAtClose: v.optional(v.number()),
```

This is correct architecture. But `aircraftTotalTimeAtClose` is optional, which means a work order can be closed without recording the aircraft's total time at close. That's non-compliant. Per 14 CFR 43.11(a)(2), the inspection record must state total time in service. The work order close is the event that sources this data.

**Requirement:** `aircraftTotalTimeAtClose` must be set before `status` can transition to `closed`. The work order close mutation must enforce this.

**3.1.1 Monotonicity enforcement.**

Rafael's architecture document lists this as a business rule:

> `total_time_airframe` can only increase (monotonic). System should warn if a new TT is less than last recorded TT.

The schema has no mechanism for this enforcement. It's a mutation-layer concern. But I'll note it here: the `workOrder` close mutation must compare `aircraftTotalTimeAtClose` against `aircraftTotalTimeAtOpen` and against the last recorded total time on the `aircraft` record. If the close TT is less than the open TT, the mutation must fail, not warn.

This is not optional. A decreasing aircraft total time in the logbook is a falsification red flag. An inspector seeing logbook hours go from 2,147 to 2,103 will treat that as a potential fraudulent alteration.

### 3.2 Missing `closedByTechnicianId`

The `workOrders` table has:

```typescript
closedByUserId: v.optional(v.string()),
```

This stores the Clerk user ID of the person who closed the work order. But for regulatory purposes, the closing event — the return-to-service approval — is performed by a certificated individual, not just a system user. We have `returnToService` as a separate table (correct), and the RTS record does capture the IA's technician ID.

The problem is the `closedByUserId` on `workOrders`. This field is ambiguous: does "closed" mean the IA signed the RTS (regulatory close), or does it mean an admin user clicked "close" in the UI (administrative close)? These are different acts with different authorization requirements.

**Recommendation:** Add `closedByTechnicianId: v.optional(v.id("technicians"))` to `workOrders`. Populate it at the time of the regulatory close event. Leave `closedByUserId` for the administrative record. The distinction matters during an audit.

### 3.3 Work Order to Maintenance Record Chain

The current schema has no explicit foreign key from `workOrders` to the `maintenanceRecords` it produced. `maintenanceRecords` has `workOrderId`, so the link exists — but only in one direction.

For chain-of-custody purposes during an FAA inspection, the inspector needs to ask: "For work order WO-2024-1047, what maintenance records were produced?" The current schema requires a query on `maintenanceRecords.by_work_order`, which works. The chain-of-custody is reconstructable. This is adequate.

However, consider adding a `maintenanceRecordIds: v.array(v.id("maintenanceRecords"))` field to `workOrders`. This makes the chain explicit and provides a validation check: if a work order is marked `closed` and `maintenanceRecordIds` is empty, that's an anomaly. Work orders don't close without producing maintenance records (or they shouldn't).

This is a recommendation, not a blocker.

---

## 4. Required Regulatory Fields — Missing or Wrong

### 4.1 `organizations` — Missing Required Part 145 Fields

The `organizations` table has these director/QC fields:

```typescript
directorOfMaintenance: v.optional(v.string()),
qualityControlManager: v.optional(v.string()),
```

Both are string fields (names only) and both are optional. Under 14 CFR Part 145, the Director of Maintenance and Quality Control Manager are required accountable individuals. Their identities must be verifiable — a name string is insufficient.

**4.1.1 DOM and QCM must link to `technicians`.**

The DOM and QCM at a Part 145 repair station must hold appropriate certificates. Storing them as free-text names means we have no way to verify their certificate currency. When the DOM's IA expires on March 31 and no one renews it, the system should flag that — but it can't if the DOM is stored as a string rather than a `technicianId`.

**Requirement:** Change `directorOfMaintenance` and `qualityControlManager` to `v.optional(v.id("technicians"))`. Keep the string name fields as denormalized display values if needed for speed, but the authoritative reference must be to the technician record.

**4.1.2 `part145CertificateNumber` optional but should gate functionality.**

```typescript
part145CertificateNumber: v.optional(v.string()),
```

An organization without a Part 145 certificate cannot perform certain classes of work and cannot produce Part 145 return-to-service approvals. The schema correctly marks this as optional (Part 91 shops exist). But the business logic must gate: if `part145CertificateNumber == null`, certain work order types (e.g., `major_repair`, `major_alteration`) should be unavailable or require explicit override.

This is a mutation/access-control concern, not a schema gap per se. Note it for the authorization design.

### 4.2 `maintenanceRecords` — `organizationCertificateNumber` Optional

```typescript
organizationCertificateNumber: v.optional(v.string()),
```

Per 14 CFR 43.9, when a repair station performs maintenance, the record must include the repair station certificate number. This field is correctly named and positioned. But it's optional.

If the organization performing the work has a `part145CertificateNumber`, then `organizationCertificateNumber` in the maintenance record must equal that value — it cannot be null. An FAA-issued maintenance record from a certificated repair station with no certificate number in the record is non-compliant.

**Requirement:** The mutation that creates a `maintenanceRecord` must populate `organizationCertificateNumber` from `organizations.part145CertificateNumber` when that value exists. If the organization is not Part 145, the field may be null. This population must be automatic — not left to UI input.

### 4.3 `maintenanceRecords` — Missing Rating Exercised

The `technicianSignature` embedded type captures:

```typescript
const technicianSignature = v.object({
  technicianId: v.id("technicians"),
  legalName: v.string(),
  certificateNumber: v.string(),
  certificateType: certificateType,
  scopeOfWork: v.string(),
  signatureTimestamp: v.number(),
  signatureHash: v.optional(v.string()),
});
```

`certificateType` tells us whether the technician holds A&P, IA, etc. But it does not capture which **rating** they exercised for this specific work. An A&P with both airframe and powerplant ratings who performs engine work is exercising their powerplant rating. That distinction matters under 14 CFR 65.85 and 65.87.

Per the regulatory requirements document (Section 4), the required field is:

> `ratings` — Rating(s) exercised (Airframe, Powerplant)

**Requirement:** Add `ratingsExercised: v.array(v.union(v.literal("airframe"), v.literal("powerplant")))` to the `technicianSignature` object. This must be populated at signing time, not inferred later.

### 4.4 `inspectionRecords` — `iaTechnicianId` Correct, But Missing IA Validation Snapshot

The `inspectionRecords` table has:

```typescript
iaTechnicianId: v.id("technicians"),
iaCertificateNumber: v.string(),
```

Good. The certificate number is captured at signing time. But there's no field capturing whether the IA was current on the date of the inspection. IA expiry is March 31 annually (14 CFR 65.92). If an annual inspection is signed on March 30 by someone whose IA expired on March 31 of the prior year, the inspection is invalid.

The `certificates` table has `iaExpiryDate`. The validation should happen at signing time. But the result of that validation — "IA was current on [date]" — is not stored in the inspection record.

**Requirement:** Add `iaCurrentOnInspectionDate: v.boolean()` to `inspectionRecords`, populated at signing time by comparing `iaTechnicianId`'s `iaExpiryDate` against `inspectionDate`. This creates a permanent record of the currency check, not just an assumption that it was checked.

### 4.5 `discrepancies` — Missing Corrective Action Signature

When `disposition == "corrected"`, the schema has:

```typescript
correctiveAction: v.optional(v.string()),
correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),
```

The corrective action description and link to the maintenance record are there. But there's no signature on the corrective disposition itself. The `dispositionedByTechnicianId` field identifies who dispositioned it, but there's no `dispositionedCertificateNumber` captured at the time of disposition.

Per the audit trail requirements, the disposition of a discrepancy is itself a regulated act — particularly when the disposition is `deferred_mel` (the aircraft continues flying with a deferred item). The person making that determination must be identified with their certificate number at the time they make it.

**Requirement:** Add `dispositionedCertificateNumber: v.optional(v.string())` to `discrepancies`, populated at disposition time.

---

## 5. Sign-Off and Authorization Fields

### 5.1 `taskCards` — Step Sign-Off Authorization Gap

In the `steps` array embedded in `taskCards`, steps flagged with `signOffRequiresIa: true` require IA sign-off:

```typescript
signOffRequiresIa: v.boolean(),
```

However, there is no field capturing whether the technician who signed the step was actually verified as an IA at the time of signing. The schema stores:

```typescript
signedByTechnicianId: v.optional(v.id("technicians")),
signedAt: v.optional(v.number()),
signedCertificateNumber: v.optional(v.string()),
```

`signedCertificateNumber` is captured. Good. But if `signOffRequiresIa == true`, we also need to capture whether IA authority was current on `signedAt`. The `certificates` table holds this information, but we're not snapshotting it in the step record.

**Recommendation:** Add `signedHasIaOnDate: v.optional(v.boolean())` to step records where `signOffRequiresIa == true`. The signing mutation should populate this by evaluating `certificates.iaExpiryDate` vs. `signedAt`. This creates a defensible record of the authorization check.

### 5.2 `returnToService` — Missing Check: IA Held Appropriate Rating

```typescript
returnToService: defineTable({
  signedByIaTechnicianId: v.id("technicians"),
  iaCertificateNumber: v.string(),
  iaRepairStationCert: v.optional(v.string()),
  ...
})
```

The return-to-service record captures who signed and their certificate number. But it doesn't capture whether the IA's authorization was scoped to the type of work performed. A repair station may authorize specific individuals for specific categories of work (e.g., "Class A Airframe only"). An IA signing off an engine return-to-service without powerplant authorization is not compliant.

This is enforced through the `repairStationAuthorizations` array on `certificates`. But that authorization data is not snapshotted in the `returnToService` record.

**Recommendation:** Add `iaAuthorizedWorkScope: v.optional(v.string())` to `returnToService`, captured from `certificates.repairStationAuthorizations` at the time of signing. This preserves the scope of authority that existed at signing, regardless of what changes subsequently.

### 5.3 `certificates` — IA Renewal Activity Log Is Append-Only But Not Protected

The `iaRenewalActivities` array on `certificates`:

```typescript
iaRenewalActivities: v.array(v.object({
  date: v.number(),
  activityType: v.union(
    v.literal("inspection_performed"),
    v.literal("pmi_review"),
    v.literal("faa_exam"),
    v.literal("other")
  ),
  notes: v.optional(v.string()),
})),
```

This is an important compliance record under 14 CFR 65.93. The IA renewal requires documented activities during the renewal period. The `activityType` enum covers the major types.

Issues:
1. `activityType: "other"` with free-text `notes` is too permissive. The FAA doesn't accept "other" as a renewal basis without specifics. Recommend adding `activityTypeDetail: v.optional(v.string())` for all types (not just "other") and making it required when `activityType == "other"`.
2. There's no audit trail for changes to this array. If entries are added or removed from the `iaRenewalActivities` array, the `updatedAt` field on `certificates` will reflect the change, but not *which* entries changed or why. For something that directly affects an IA's renewal eligibility, this is a compliance gap.

**Recommendation:** Extract `iaRenewalActivities` into a separate `iaRenewalActivity` table with full audit trail support. The cost is an additional table; the benefit is a defensible, append-only activity log per technician per certificate.

---

## 6. EASA Differences

The current schema is designed entirely around FAA regulatory structure. Several customers will operate aircraft registered in EASA jurisdictions (EASA CS-23, EASA Part-145, EASA Part-66). I'll document the structural deltas here for future reference.

### 6.1 Certificate Types — EASA Part-66

The `certificateType` enum:

```typescript
const certificateType = v.union(
  v.literal("A&P"),
  v.literal("airframe_only"),
  v.literal("powerplant_only"),
  v.literal("IA"),
  v.literal("repairman"),
  v.literal("repair_station"),
  v.literal("other")
);
```

EASA Part-66 licenses are structured differently: Category A (line maintenance certifying staff), Category B1 (mechanical certifying staff), Category B2 (avionics certifying staff), Category C (base maintenance certifying staff). There is no direct EASA equivalent of the FAA IA. The EASA equivalent of the RTS authority is the "certifying staff" designation, which is scoped per organization and per rating.

If we ever need EASA support, the `certificateType` enum and the `certificates` table will need significant restructuring. Flag this for the product roadmap.

### 6.2 Return-to-Service — EASA

Under EASA Part-145, the return-to-service is performed by "certifying staff" whose authorization scope is defined by the maintenance organization's Maintenance Organization Exposition (MOE). The equivalent of the Part 145 RSM is the MOE. The schema has `rsmRevision` on `organizations` — for EASA support, this would need to also accommodate `moeRevision` or be renamed to be regulation-neutral.

### 6.3 Record Retention — EASA

EASA Part-145 requires records to be retained for 3 years minimum (vs. FAA 2 years for most records). If we serve EASA customers, the retention logic in any future archiving feature must use the correct regulation-specific retention period for each organization.

### 6.4 AD vs. Airworthiness Limitations

EASA issues Airworthiness Directives as well, but also issues what are called "Airworthiness Limitations" — mandatory intervals defined in the Aircraft Maintenance Manual that are not ADs per se, but carry the same legal force. The current `airworthinessDirectives` and `adCompliance` tables model FAA ADs. EASA Airworthiness Limitations would need either a separate table or an `adSource` field distinguishing FAA / EASA / Transport Canada origin.

Not blocking for Phase 1. Note for international expansion planning.

---

## 7. Additional Observations

### 7.1 `aircraft` Table — `operatingRegulation` and Record Requirements

```typescript
operatingRegulation: v.optional(v.union(
  v.literal("part_91"),
  v.literal("part_135"),
  v.literal("part_121"),
  v.literal("part_137"),
  v.literal("part_91_135_mixed")
)),
```

This is the right field. But it's optional. Per the regulatory requirements document (Section 10.5), the maintenance record requirements and inspection intervals differ significantly between operating regulations. If `operatingRegulation` is null, the system cannot correctly determine which inspection program applies to the aircraft.

**Recommendation:** For aircraft actively in maintenance at a Part 145 facility, `operatingRegulation` should be required. The schema marks it optional to handle cases where the regulation isn't known at data entry. Consider a `pending_determination` value in the enum rather than allowing null, so the unknown state is explicit rather than silent.

### 7.2 `parts` Table — `isOwnerSupplied` Flag Coverage

```typescript
isOwnerSupplied: v.boolean(),
```

The flag is present. Good. But there's no workflow enforcement visible in the schema — specifically, the constraint that owner-supplied parts without an `eightOneThirtyId` must not reach `condition: "serviceable"` or `location: "installed"` without going through a receiving inspection.

The schema allows `isOwnerSupplied: true` and `eightOneThirtyId: null` and `location: "installed"` simultaneously. That's a compliance violation — a part installed without airworthiness documentation is illegal under 14 CFR 145.201.

**Requirement:** The mutation that transitions a part to `location: "installed"` must verify either:
- `eightOneThirtyId` is set and the referenced record is not flagged as suspect, OR
- The part has undergone an explicit receiving inspection documented in the system

This is a mutation-layer invariant. Document it.

### 7.3 `eightOneThirtyRecords` — Missing `approvingCountry` Field

The schema has `approvingAuthority: v.string()`. But for parts from foreign repair stations, the approving authority and country are different data points. EASA Form 1 is the EASA equivalent of the 8130-3 — accepted in the US under bilateral agreements. A part released on a Form 1 has a different legal basis than one released on an 8130-3.

**Recommendation:** Add `approvingCountry: v.optional(v.string())` and `formType: v.union(v.literal("faa_8130_3"), v.literal("easa_form_1"), v.literal("tcca_form_24_0078"), v.literal("other"))` to `eightOneThirtyRecords`. This future-proofs the table for international parts traceability.

### 7.4 Squawks-to-Discrepancy Pipeline

The `workOrders` table has:

```typescript
squawks: v.optional(v.string()),
```

This is free-text. Per Rafael's open questions, the pre-discrepancy state (pilot report) should potentially be modeled separately. From a compliance standpoint, pilot-reported squawks that result in "no fault found" dispositions are regulatory records. FAA inspectors may ask why a specific squawk was dispositioned as no-fault-found — particularly on subsequent accidents.

The current model loses the squawk-to-discrepancy traceability: we know a pilot reported something (the squawks text), and we have discrepancies, but there's no structured link between a specific squawk text and the specific discrepancy that addressed it (or didn't).

This is a data model gap worth addressing before any significant customer data enters the system.

---

## 8. Blockers — Must Fix Before Feature Development

The following items must be resolved before any mutation functions are written or any feature development begins. A schema that allows invalid regulatory states to be persisted is worse than no schema — it creates a false sense of compliance.

---

**BLOCKER-REG-001: Correction records can be created without referencing what they correct.**

`correctionFieldName`, `correctionOriginalValue`, `correctionCorrectedValue`, `correctionReason`, and `corrects` are all `v.optional()` even when `recordType == "correction"`. A correction record without these fields is invalid under AC 43-9C. The `createCorrectionRecord` mutation must enforce all five fields as required. A schema-level note or comment must document this invariant. Until this is enforced, the correction mechanism is not compliant.

---

**BLOCKER-REG-002: Technician `ratingsExercised` missing from `technicianSignature`.**

The `technicianSignature` embedded type does not capture which rating (airframe, powerplant) the technician exercised when signing. This is required per 14 CFR 65.85 and 65.87 when work involves a specific rating. Add `ratingsExercised` to the signature type before any signing mutations are built.

---

**BLOCKER-REG-003: `adCompliance` allows orphaned records with no aircraft, engine, or part linkage.**

All three target fields (`aircraftId`, `engineId`, `partId`) are optional. The mutation must enforce that at least one is populated. Without this, AD compliance records can exist in the system linked to nothing — they will never appear in an aircraft's compliance review and create false compliance gaps.

---

**BLOCKER-REG-004: `organizations.directorOfMaintenance` and `qualityControlManager` are unverifiable string names.**

For Part 145 organizations, DOM and QCM are required accountable personnel with certificates. These fields must link to `technicians` records, not store free-text names. This is required before any Part 145 compliance workflow is implemented.

---

**BLOCKER-REG-005: `signatureAuthEventId` is not defined.**

The field exists on three tables but there is no specification of what it contains or how it is verified. Before any signing mutation is built, the team must define: (a) what system generates this ID, (b) what it references, (c) how it can be queried to confirm identity at a specific timestamp. Without this definition, electronic signatures do not meet the AC 43-9C authenticity standard.

---

**BLOCKER-REG-006: `aircraftTotalTimeAtClose` is optional on `workOrders`.**

A work order cannot close without this field being set. The close mutation must enforce it. Without it, the maintenance records produced at close will have incorrect or missing TT data — a compliance violation under 14 CFR 43.11(a)(2).

---

**BLOCKER-REG-007: Owner-supplied parts can be marked as installed without `eightOneThirtyId`.**

The schema allows `isOwnerSupplied: true` + `eightOneThirtyId: null` + `location: "installed"`. This is a violation of 14 CFR 145.201. The part installation mutation must block this state transition until documentation is provided.

---

**BLOCKER-REG-008: `adComplianceReviewed: true` with empty `adComplianceReferenceIds` is undetectable.**

An inspection record can certify AD compliance was reviewed while referencing zero AD compliance records. The inspection-close mutation must either require a non-empty `adComplianceReferenceIds` array when `adComplianceReviewed == true`, or require a documented reason (via a new `notes` field) for why no AD records are referenced. Add the `notes` field.

---

*Marcus Webb*  
*Regulatory & Compliance, Athelon*  
*Day 4, Phase 1*

*Cc: Devraj Anand, Rafael Mendoza, Cilla Oduya*  
*This document does not constitute legal advice. All regulatory citations are based on current CFR and FAA guidance as of this review date.*
