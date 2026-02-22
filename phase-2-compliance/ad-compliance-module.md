# Athelon — Airworthiness Directive Compliance Module
**Document Type:** Phase 2 Functional Specification  
**Authors:** Marcus Webb (Regulatory/Compliance) + Devraj Anand (Backend, Convex)  
**Date:** 2026-02-22  
**Status:** DRAFT — for team review before mutation implementation begins  
**Prerequisite:** Schema v2 sign-off complete (2026-02-22). All 16 Phase 1 blockers resolved.  
**References:** `convex-schema-v2.md`, `regulatory-requirements.md`, `schema-review-marcus.md`

---

## Prefatory Note — Marcus

ADs are not optional. 14 CFR § 39.3 says it plainly: "No person may operate a product to which an airworthiness directive applies except in accordance with the requirements of that airworthiness directive." Every aircraft we touch in this system is subject to this. Every engine. Every propeller. Every appliance if an AD applies to it.

What that means for Athelon: AD compliance is not a feature. It is the floor. If this module is wrong, aircraft with open ADs get signed off. Someone dies. The shop loses its certificate. The company ends.

I'm going to be precise in this document. If something I write seems pedantic, it is intentionally pedantic. Read the citations.

---

## 1. AD Data Model

### 1.1 Sources of AD Data

We have two ingestion paths. Neither is optional — both must be supported from day one.

**Path A — FAA AD Feed (Automated)**

The FAA publishes ADs through the Document Retrieval Service (DRS) and the AD database accessible via the FAA's eFlight Standards APIs. The raw feed is XML. Key data points available: AD number, effective date, docket number, applicability text (free text), compliance method text (free text), recurring intervals (when structured enough to parse), supersession references.

The problem: FAA AD applicability text is written for humans, not machines. "All Cessna Model 172S airplanes, certificated in any category" is parseable. "All airplanes with Lycoming IO-360-L2A engines, serial numbers 12345 through 67890, except those modified per STC SA12345CE" is not reliably machine-parseable without human review.

*Devraj — Implementation note:* Ingest the FAA feed nightly via a scheduled Convex action. Parse what's parseable into `applicabilityStructured`. Flag records where the parser confidence is below threshold as `requiresHumanApplicabilityReview: true`. Do not attempt to auto-apply ADs to aircraft without human confirmation of applicability. The applicability determination is a regulated act (see §1.3).

**Path B — Manual Entry**

For ADs the feed misses, for amended ADs where the system hasn't caught up, and for ADs on older aircraft where the FAA's database is sparse. Manual entry must produce the same structured data model as the automated feed.

Manual entry requires: AD number (validated against YYYY-NM-NN format), title, effective date, applicability text, compliance type, intervals (if recurring), supersession links (if applicable). The `addedByUserId` field on `airworthinessDirectives` captures who entered it. Audit trail via `auditLog` with event type `record_created`.

Manual ADs receive the same compliance tracking as feed-ingested ADs. No difference in treatment once in the table.

### 1.2 Storage — `airworthinessDirectives` Table

The schema v2 `airworthinessDirectives` table is the global AD reference table. Not org-scoped — this is intentional. ADs are FAA issuances that apply to aircraft everywhere, not to a particular shop's customers. All organizations read from this shared table.

Key structural points:

- `adNumber` is the primary human-readable key (format: YYYY-NM-NN, e.g., 2024-15-07). Index `by_ad_number` supports lookup.
- `adType` enum: `one_time` / `recurring` / `terminating_action`. Terminating action ADs modify or end recurring requirements of a prior AD — the system must recognize these and handle supersession correctly (see §4).
- `complianceType` captures what the interval is measured in: calendar, hours, cycles, or combinations. This is not inferrable from the text — it must be explicitly set.
- `applicabilityStructured` is the machine-parsed version of `applicabilityText`. Structured fields: `makes`, `models`, `serialRangeStart`, `serialRangeEnd`, `partNumbers`. These drive the automated applicability check in §2.1, subject to human confirmation.

### 1.3 Linking ADs to Aircraft, Engines, Props, and Appliances by TCDS

This is the hardest part. An AD applies to a *type certificated product* — specifically, to the products listed in its applicability. The Type Certificate Data Sheet (TCDS) is the authoritative document defining what variants of an aircraft or engine fall under a given TC.

The linkage chain is:
```
airworthinessDirective.applicabilityStructured (makes + models + serial ranges)
  → aircraft.make + aircraft.model + aircraft.serialNumber
  → aircraft.typeCertificateNumber (links to TCDS)
  → adCompliance record (aircraft-scoped, created on applicability confirmation)
```

For engines: `engines.make + engines.model + engines.serialNumber` → AD applicability → `adCompliance.engineId`.  
For parts/appliances: `parts.partNumber` → AD applicability → `adCompliance.partId`.

The `adCompliance` table is the aircraft-scoped (or engine-scoped, or part-scoped) record of whether a given AD applies and what the compliance status is. Creating an `adCompliance` record is not automatic — it requires human confirmation of applicability (INV per REG-003, enforced in `createAdCompliance` mutation).

*Devraj — Implementation note:* When a new AD is ingested, the system should auto-generate *candidate* applicability matches by querying the `aircraft` table against `applicabilityStructured.makes` and `.models`. Surface these candidates to the shop for human review. Do not create `adCompliance` records until a technician confirms applicability. The `applicabilityDeterminedById` and `applicabilityDeterminationDate` fields on `adCompliance` capture this confirmation. Without these, the compliance record is not defensible — see §5.

---

## 2. Compliance Tracking Logic

### 2.1 Applicability Determination

Applicability is binary for a given aircraft/engine/part: the AD applies, or it doesn't. The `adCompliance.applicable` boolean captures this. The determination is made by a certificated technician and documented.

States before determination: `complianceStatus: "pending_determination"`. This is the initial state of any `adCompliance` record. A `pending_determination` record is an open question — it must not be treated as "not applicable" in the compliance dashboard.

The applicability determination process:
1. System presents candidate ADs against the aircraft's TCDS data.
2. Technician reviews the AD's applicability text against the specific aircraft configuration (serial number, mod status, installed equipment).
3. Technician sets `applicable: true` or `applicable: false`, populates `applicabilityDeterminationNotes`, and the mutation captures their `technicianId` and timestamp.
4. If `applicable: false`, `complianceStatus` transitions to `not_applicable`. Record is closed. Retained permanently.
5. If `applicable: true`, `complianceStatus` transitions to `not_complied` (if the AD has not been complied with) or triggers a compliance record entry if prior compliance exists.

### 2.2 Compliance Status Definitions

These are not UI labels. They are regulatory states. Use them precisely.

| Status | Meaning | Who/What Changes It |
|---|---|---|
| `pending_determination` | Applicability not yet determined | Created by `createAdCompliance` |
| `not_applicable` | Determined not applicable; documented | `markAdNotApplicable` mutation |
| `not_complied` | Applicable; no compliance on record | Transitions from `pending_determination` on applicability confirm |
| `complied_one_time` | One-time AD; compliance recorded | `recordAdCompliance` mutation |
| `complied_recurring` | Recurring AD; most recent compliance recorded; next due computed | `recordAdCompliance` mutation |
| `superseded` | The governing AD has been superseded by a newer AD | `handleAdSupersession` mutation (see §4) |

The system must surface `not_complied` and `complied_recurring` (where next due is approaching or past) as actionable items. These two statuses drive the compliance dashboard.

### 2.3 Recurring AD Interval Computation

For recurring ADs, `nextDueDate`, `nextDueHours`, and `nextDueCycles` are computed at the time of compliance entry and cached on the `adCompliance` record. The computation is deterministic given the last compliance data and the AD's interval fields.

**Calendar-based:**
```
nextDueDate = lastComplianceDate + (recurringIntervalDays × 86400000)
```

**Hours-based:**
```
nextDueHours = lastComplianceHours + recurringIntervalHours
```

**Cycles-based:**
```
nextDueCycles = lastComplianceCycles + recurringIntervalCycles
```

**Combination (e.g., `calendar_or_hours` — whichever comes first):**  
Compute both next due values. The aircraft becomes non-compliant when the *first* limit is reached. The dashboard must display both limits and flag the one that will trigger first.

**Overdue determination:**  
An AD is overdue when:
- Calendar: current date > `nextDueDate`, OR
- Hours: aircraft's `totalTimeAirframeHours` > `nextDueHours`, OR
- Cycles: aircraft's accumulated cycles > `nextDueCycles`

Any one condition is sufficient to render the aircraft non-compliant. The dashboard must evaluate all applicable dimensions, not just the one the shop is watching.

*Devraj — Implementation note:* The `checkAdDueForAircraft` query (see §3.3) computes live overdue status at query time using current aircraft time. The cached `nextDue*` fields on `adCompliance` are for display and sorting — not the authoritative overdue determination. Authoritative determination requires comparing `nextDueHours` against the aircraft's current `totalTimeAirframeHours`, which changes with every work order close. Don't rely on cached fields for RTS blocking logic.

### 2.4 Initial Compliance Window

Some ADs permit an initial grace period: "Comply within 100 flight hours or 12 calendar months after effective date, whichever occurs first." The `initialComplianceHours` and `initialComplianceDays` fields capture these. A `not_complied` AD within its initial compliance window is not yet overdue — the system must distinguish "not yet complied, within window" from "overdue."

The `checkAdDueForAircraft` query handles this: if `lastComplianceDate` is null (never complied), compute overdue against the initial compliance window relative to `effectiveDate + initialComplianceDays` and `effectiveDate aircraft hours + initialComplianceHours`.

---

## 3. Convex Mutation Specifications

### 3.1 `recordAdCompliance`

**Purpose:** Record that a specific AD has been complied with on a specific aircraft/engine/part. This is a regulated act. It changes the aircraft's airworthiness status.

**Authorization:** Requires an active, unconsumed `signatureAuthEvent` (`intendedTable: "adCompliance"`). The signing technician must hold a valid A&P or IA certificate with appropriate rating for the work performed. If the AD compliance required return-to-service, the signing technician must hold IA authority.

**Inputs:**
```typescript
{
  adComplianceId: Id<"adCompliance">,
  signatureAuthEventId: Id<"signatureAuthEvents">,
  complianceDate: number,               // Unix ms — date work was completed
  aircraftHoursAtCompliance: number,    // Aircraft TT at time of compliance
  aircraftCyclesAtCompliance?: number,  // If cycles are tracked
  maintenanceRecordId: Id<"maintenanceRecords">,  // The 43.9 record proving compliance
  complianceMethodUsed: string,         // Which paragraph(s) of the AD were followed
  notes?: string,
}
```

**Pre-conditions (mutation must verify, in order):**

1. `signatureAuthEvent` exists, `consumed == false`, `expiresAt > Date.now()`. If any fail: throw. Do not proceed.
2. Set `consumed = true`, `consumedAt = Date.now()`, `consumedByTable = "adCompliance"`, `consumedByRecordId = adComplianceId`. Atomic with step 3.
3. `adCompliance` record exists and `applicable == true`. If `applicable == false` or `complianceStatus == "not_applicable"`: throw. Cannot record compliance for an inapplicable AD.
4. `maintenanceRecordId` references a real, signed `maintenanceRecords` document linked to the same aircraft/engine. If the maintenance record is unsigned or is for a different aircraft: throw.
5. `complianceDate` ≥ last compliance entry in `complianceHistory` (if any). No backdating.
6. `aircraftHoursAtCompliance` ≥ last compliance hours (if any). Hours must increase.

**Mutations performed (all in one Convex transaction):**

1. Consume the `signatureAuthEvent` (step 2 above).
2. Append to `adCompliance.complianceHistory`:
   ```typescript
   {
     complianceDate,
     aircraftHoursAtCompliance,
     aircraftCyclesAtCompliance,
     technicianId: authEvent.technicianId,
     maintenanceRecordId,
     complianceMethodUsed,
     notes,
   }
   ```
3. Update denormalized snapshot fields: `lastComplianceDate`, `lastComplianceHours`, `lastComplianceCycles`.
4. Recompute and cache `nextDueDate`, `nextDueHours`, `nextDueCycles` from the AD's interval fields. For one-time ADs, clear all next-due fields.
5. Set `complianceStatus` to `complied_one_time` or `complied_recurring` based on `adType`.
6. Append `maintenanceRecordId` to `adCompliance.maintenanceRecordIds`.
7. Write `auditLog` event: `eventType: "ad_compliance_updated"`, `tableName: "adCompliance"`, `recordId: adComplianceId`, `technicianId`, `organizationId`. Required fields; throw if `organizationId` is not set.

**What this mutation does NOT do:** It does not close a work order. It does not issue a return-to-service. Those are separate mutations with separate authorization events. AD compliance recording and RTS are distinct regulated acts.

### 3.2 `markAdNotApplicable`

**Purpose:** Record a formal determination that a specific AD does not apply to a specific aircraft/engine/part, with documented reasoning. This is also a regulated act — a shop that incorrectly marks an applicable AD as N/A has falsified a compliance record.

**Authorization level:** Requires a certificated A&P or IA — not a shop manager, not an admin user. The `signatureAuthEvent` must link to a technician with an active certificate. For complex applicability determinations (e.g., AD applies to most but not all aircraft in a type series due to mod status), IA authorization is strongly recommended. The mutation does not *require* IA, but the mutation writes the technician's authorization level to the record, and an auditor will scrutinize any N/A determination made by an A&P without IA on a borderline case.

**Inputs:**
```typescript
{
  adComplianceId: Id<"adCompliance">,
  signatureAuthEventId: Id<"signatureAuthEvents">,
  notApplicableReason: string,           // Required. Must be specific — no "N/A" by itself.
  supportingDocumentationReference?: string,  // e.g., "TCDS A-768, Note 3" or STC number
}
```

**Pre-conditions:**

1. `signatureAuthEvent` consumed-check (same as §3.1 step 1–2).
2. `adCompliance.complianceStatus` must be `pending_determination` or `not_complied`. Cannot mark N/A a record that already has compliance history — that is a compliance falsification scenario. Throw if history exists.
3. `notApplicableReason` must be non-empty and must exceed 20 characters. A field that says "not applicable" with no explanation will be rejected by this mutation. The mutation enforces minimum content, not quality — but minimum content is better than nothing.

**Mutations performed:**

1. Consume `signatureAuthEvent`.
2. Set `adCompliance.applicable = false`.
3. Set `complianceStatus = "not_applicable"`.
4. Set `applicabilityDeterminationNotes = notApplicableReason`.
5. Set `applicabilityDeterminedById = authEvent.technicianId`.
6. Set `applicabilityDeterminationDate = Date.now()`.
7. Write `auditLog` event: `eventType: "ad_compliance_updated"`, include `newValue: JSON.stringify({ status: "not_applicable", reason: notApplicableReason })`.

**What this mutation does NOT do:** It does not delete the `adCompliance` record. N/A determinations are permanent records retained with the aircraft. The record exists; its status is `not_applicable`. Per 14 CFR 91.417(a)(2)(v), AD compliance records — including N/A determinations — are retained indefinitely with the aircraft.

### 3.3 `checkAdDueForAircraft` (Query)

**Purpose:** Compute live compliance status for all ADs linked to a specific aircraft (including its installed engines and components). Returns actionable compliance items for the dashboard and for RTS blocking logic.

**This is a query, not a mutation. No writes.**

**Inputs:**
```typescript
{
  aircraftId: Id<"aircraft">,
  organizationId: Id<"organizations">,
  asOfDate?: number,     // Defaults to Date.now() — useful for scheduled departure checks
}
```

**Query logic (in order):**

1. Fetch `aircraft` record for current `totalTimeAirframeHours` and `totalTimeAirframeAsOfDate`. This is the authoritative hours figure.
2. Fetch all `adCompliance` records `by_aircraft(aircraftId)` with `applicable == true` and `complianceStatus NOT IN ["not_applicable", "superseded"]`.
3. Fetch installed engines: `engines.by_aircraft(aircraftId)`. For each engine, fetch `adCompliance` records `by_engine(engineId)`.
4. Fetch installed parts: `parts.by_aircraft(aircraftId)`. For each life-limited or AD-relevant part, fetch `adCompliance` records `by_part(partId)`.
5. For each `adCompliance` record, compute status:

```typescript
type AdComplianceItem = {
  adComplianceId: Id<"adCompliance">,
  adId: Id<"airworthinessDirectives">,
  adNumber: string,
  adTitle: string,
  complianceStatus: string,
  isOverdue: boolean,
  isDueSoon: boolean,           // within 10 hours or 30 days
  nextDueDate?: number,
  nextDueHours?: number,
  nextDueCycles?: number,
  hoursRemaining?: number,      // nextDueHours - currentTT (negative if overdue)
  daysRemaining?: number,
  appliesTo: "aircraft" | "engine" | "part",
  appliesToId: string,
}
```

**Overdue determination (authoritative — not from cached fields):**
- Calendar overdue: `asOfDate > adCompliance.nextDueDate`
- Hours overdue: `aircraft.totalTimeAirframeHours > adCompliance.nextDueHours`
- Combination: either condition triggers overdue

6. Fetch the `airworthinessDirectives` record for each AD to get `adNumber`, `adTitle`, `complianceType`. This is needed for display and for determining which overdue dimensions apply.

7. Return all items sorted: overdue first, then due-soon, then complied with furthest-out next-due last.

*Devraj — Implementation note:* This query will be called frequently — every time the dashboard loads, and at RTS blocking check time. Index coverage is critical. The `by_aircraft`, `by_engine`, `by_part` indexes on `adCompliance` are all present in v2. The `by_aircraft` index on the `engines` table and `by_aircraft` on `parts` are also present. This query should not require any table scans. If it does, add the missing index before shipping.

**Due-soon threshold:** 10 hours or 30 calendar days, whichever is applicable. This is a configurable system parameter, not a hardcoded constant. Store it in an org-level settings document so shops can adjust their own alerting window.

---

## 4. Supersession Chain Handling

### 4.1 What Supersession Means

When the FAA issues a new AD that supersedes an older one, the older AD is no longer the governing compliance requirement. The new AD takes precedence. But the compliance history under the old AD doesn't evaporate — it's a permanent record and may be relevant to determining whether prior compliance carries forward under the new AD (some new ADs explicitly credit prior compliance with the old AD; most don't, and require fresh compliance).

The `airworthinessDirectives` table models supersession via:
```typescript
supersededByAdId?: Id<"airworthinessDirectives">  // on the OLD AD
supersedesAdId?: Id<"airworthinessDirectives">    // on the NEW AD
```

This creates a linked chain. When ingesting a new AD that supersedes an older one, both records must be updated.

### 4.2 System Response to Supersession

When a new AD that supersedes an older one is ingested (either via feed or manual entry), the `handleAdSupersession` mutation must:

1. Set `supersededByAdId` on the old `airworthinessDirectives` record pointing to the new AD.
2. Set `supersedesAdId` on the new `airworthinessDirectives` record pointing to the old AD.
3. For every `adCompliance` record linked to the old AD (query `by_ad(oldAdId)`):
   - Set `complianceStatus = "superseded"` on the old compliance record.
   - Create a new `adCompliance` record for the new AD, linked to the same `aircraftId`/`engineId`/`partId`, with `complianceStatus = "pending_determination"`.
   - Set `applicabilityDeterminationNotes` on the new record to: *"Supersedes AD [oldAdNumber]. Prior compliance on [lastComplianceDate] at [lastComplianceHours] TT. Review new AD applicability and determine whether prior compliance satisfies new AD requirements."*

4. Write `auditLog` events for each affected `adCompliance` record.

**What does `complianceStatus = "superseded"` mean on the old compliance record?**

It means: the governing AD has changed. This compliance record is history — it documents compliance with a requirement that no longer exists in that form. The aircraft's compliance obligation is now under the new AD. The old record is retained permanently and is readable, but it no longer drives the compliance dashboard.

An aircraft with a `superseded` compliance record and no corresponding new-AD compliance record is not automatically non-compliant — it has a `pending_determination` record on the new AD. But it is not confirmed compliant either. The dashboard should surface `pending_determination` items prominently.

### 4.3 Prior Compliance Carry-Forward

Some ADs state that prior compliance with the superseded AD satisfies the new AD's initial compliance requirement. This is stated in the new AD's text. The system cannot auto-determine this — it requires human review.

If a technician determines that prior compliance carries forward:
- They call `recordAdCompliance` on the new AD's `adCompliance` record, referencing the same maintenance record that documented compliance with the old AD.
- `complianceMethodUsed` must state: "Prior compliance with AD [old number] determined to satisfy new AD paragraph [X] per new AD paragraph [Y]."
- This is documented; it's auditable; it's the correct path.

The system must not automatically carry forward compliance. Doing so would be a regulatory determination made by software. That determination must be made by a certificated technician.

---

## 5. Marcus's Regulatory Risk Notes — What the FAA Actually Cares About

I'm writing this section in plain language because Devraj and the rest of the team need to understand what an FAA inspector actually does when they show up for a Part 145 surveillance inspection. These notes inform specific schema and mutation design decisions.

**What the inspector will ask for:**

"Show me all open ADs for [aircraft N12345] as of today." If the system cannot produce a complete, authoritative list in under two minutes, that is a finding. Not a suggestion. A finding.

"Show me the maintenance record proving AD 2022-14-08 was complied with on [aircraft]." If `adCompliance.maintenanceRecordIds` is empty or the linked record doesn't contain the AD number in `approvedDataReference`, that is a finding.

"This AD is marked N/A. Who made that determination and when?" If `applicabilityDeterminedById` is null or `applicabilityDeterminationDate` is missing, that is a finding.

**Design decisions that reduce audit risk, and why:**

*The `complianceHistory` append-only array:* The FAA expects to see a chronological compliance trail. A single "last complied" snapshot is inadequate for recurring ADs — the inspector may want to verify that recurring compliance has been performed at the correct intervals. The history array gives them that. The INV against backdating entries (complianceDate must be ≥ last entry) prevents retroactive compliance fabrication.

*The `applicabilityDeterminedById` + `applicabilityDeterminationDate` requirement:* An N/A determination is a claim. If the inspector disputes it — and they will for any borderline case — you need to show who made the determination and on what date, so you can pull their certificate record and demonstrate they were authorized to make that determination on that date. A bare `applicable: false` with no attribution is worthless.

*Linking `adCompliance` to `maintenanceRecordIds`:* AD compliance without a maintenance record is a claim without evidence. Under AC 43-9C and 91.417, the compliance record must reference the maintenance entry that proves the work was done. `maintenanceRecordIds` on `adCompliance`, and `adComplianceReferenceIds` on `inspectionRecords`, create the cross-reference chain an inspector expects to follow.

*The `signatureAuthEvent` on compliance records:* The inspector may question whether the person who recorded compliance was authorized to do so. The `signatureAuthEvent` provides: who authenticated, by what method, at what timestamp, with what certificate number confirmed. This is the difference between "we think this was signed correctly" and "here is independent cryptographic evidence."

*`pending_determination` is not the same as `not_applicable`:* A shop that leaves ADs in `pending_determination` for months is running a compliance risk. The dashboard must surface pending items at the same priority as `not_complied`. An inspector who finds 15 ADs in `pending_determination` on a fleet aircraft will treat that as 15 potential open findings.

*Recurring AD overdue is determined against actual aircraft time, not cached fields:* This was stated in §2.3 and I'm repeating it here because it's a failure mode I've seen in other systems. A shop closes a work order. The aircraft accumulates another 50 hours at another facility. The system's cached `nextDueHours` was computed at the last compliance, but the aircraft's current hours are past that threshold. If the RTS blocking logic uses cached fields instead of live aircraft time, the aircraft returns to service with an overdue AD. The `checkAdDueForAircraft` query must fetch live aircraft hours. No exceptions.

---

## 6. Integration with Work Orders and RTS Authorization

### 6.1 AD Compliance Work Orders

The `workOrders.workOrderType` enum includes `"ad_compliance"`. When a work order is opened specifically to comply with an AD, this type should be used. It gates the following:

- The work order must be linked to one or more `adCompliance` records (via the task cards produced).
- Task cards for AD compliance work must have `taskType: "ad_compliance"` and `approvedDataSource` referencing the AD number (e.g., "FAA AD 2024-15-07, Paragraph (f)").
- When the work order closes, the `closeWorkOrder` mutation must call `recordAdCompliance` for each linked AD compliance record, or verify it has already been called during the work order's active period.

### 6.2 Task Card to AD Compliance Linkage

The `taskCardSteps` table supports `discrepancyIds` for defects found during steps. The same pattern applies to AD compliance tasks: each step in an AD compliance task card maps to a specific paragraph of the AD.

For traceability, the task card's `approvedDataSource` field (required per 14 CFR 43.9(a)(1)) must reference the AD. The step's `description` must reference the specific paragraph being addressed. When the step is signed off, the step's `signatureAuthEventId` and `signedByTechnicianId` provide the person-level traceability.

The `adCompliance.maintenanceRecordId` referenced in `recordAdCompliance` should be the maintenance record produced when the work order closes — not the task card. The task card is the work in progress; the maintenance record is the legal log entry.

### 6.3 RTS Blocking Logic

An aircraft **must not** receive a return-to-service signature if any of the following is true:

1. Any `adCompliance` record linked to the aircraft (or its installed engines/components) has `complianceStatus == "not_complied"` and is past its initial compliance window.
2. Any `adCompliance` record has `complianceStatus == "complied_recurring"` and is currently overdue (per live hours or calendar check).
3. Any `adCompliance` record has `complianceStatus == "pending_determination"` and the AD's effective date is past.

The `closeWorkOrder` mutation must call `checkAdDueForAircraft` as a pre-condition. If any overdue or blocking AD items are returned, the mutation must throw with a specific error message listing the AD numbers. The RTS cannot proceed.

*Devraj — Implementation note:* This is not a warning. It is a hard throw. The UI should surface the blocking ADs clearly so the technician can act on them, but the mutation does not proceed. There is no override path for a genuinely overdue AD. If the inspector ever asks "did your system allow an aircraft with an overdue AD to be returned to service," the answer must be no. Make that architecturally impossible, not just strongly discouraged.

**The only exception:** An aircraft being ferried to a maintenance facility under a ferry permit (`workOrderType: "ferry_permit"`) may operate with an open AD if the ferry permit specifically addresses it (FAA Form 8130-7 / special flight permit). The `closeWorkOrder` mutation for ferry permit work orders must check for the ferry permit record and its specific AD exemptions before applying the hard block. Ferry permits are out of scope for Phase 2 but must be designed for from the start.

### 6.4 Annual Inspection AD Review

When an annual inspection is closed via the `closeInspection` mutation, the AD compliance review is captured in `inspectionRecords.adComplianceReviewed` and `adComplianceReferenceIds`. Per the schema v2 INVARIANT (REG-008):

- If `adComplianceReviewed == true` and `adComplianceReferenceIds` is empty, `inspectionRecords.notes` must document why (e.g., "No ADs applicable to Cessna 172S S/N 17282847 as of annual inspection date 2026-01-15 — verified against FAA DRS").
- The `closeInspection` mutation enforces this. No exceptions.
- The `adComplianceReferenceIds` array should reference every `adCompliance` record that was reviewed as part of the inspection — both complied ADs and confirmed N/A ADs. An inspector will want to see that the IA reviewed the complete picture, not just the ones that required action.

*Devraj — Implementation note:* The `inspectionRecords.adComplianceReferenceIds` array is populated by the IA at inspection close time. Build a UI component that fetches `checkAdDueForAircraft` and presents the full AD compliance list for the aircraft, allowing the IA to confirm each one was reviewed and check the ones to include in `adComplianceReferenceIds`. Do not make the IA manually type AD compliance IDs. Surface them from the query.

---

## Outstanding Items for Phase 2 Review

1. **Ferry permit AD exception path:** Design required before `workOrderType: "ferry_permit"` is implemented. Cannot bolt this on later without schema changes.

2. **FAA DRS feed integration spec:** The feed ingest action needs a defined retry strategy, conflict resolution (what happens when a feed update modifies an AD that already has compliance records?), and a human review queue for parser-confidence-failure records.

3. **Cycle tracking:** Several tables reference `cycles` fields but Athelon currently has no mechanism to track aircraft cycle accumulation separately from hours. For aircraft where ADs are cycles-based (most common in turbine and Part 121 operations), this is a gap. Phase 2 backlog, but the schema already supports it — the mutation layer just needs to populate cycle fields on work order close.

4. **`createAdCompliance` mutation spec:** Covered functionally in §1.3, but the full mutation spec (inputs, pre-conditions, audit trail) needs its own document analogous to this one. That mutation is the entry point for the entire compliance chain.

---

*Marcus Webb, Regulatory & Compliance*  
*Devraj Anand, Backend (Convex)*  
*2026-02-22 — Phase 2 Compliance Module Specification*

*All regulatory citations are based on 14 CFR as of this document date. FAA guidance documents referenced: AC 43-9C, AC 39-7D. This document does not constitute legal advice.*
