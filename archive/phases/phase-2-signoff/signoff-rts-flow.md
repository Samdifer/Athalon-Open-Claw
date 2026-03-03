# Athelon — Sign-Off and Return-to-Service Flow
**Document Type:** Phase 2 Design Specification  
**Authors:** Marcus Webb (Regulatory/Compliance) · Chloe Park (Frontend Engineer)  
**Date:** 2026-02-22  
**Status:** DRAFT — Pending Devraj Anand (Backend) and Jonas Harker (Platform) review  
**Regulatory Basis:** 14 CFR §§ 43.9, 43.11, 65.83, 65.91–65.93, 145.201, 145.219; AC 43-9C  
**Schema Reference:** `convex-schema-v2.md` (FROZEN)

---

## Marcus's Prefatory Note

I've written the regulatory sections. Chloe's frontend notes appear inline as `> [CHLOE]` blocks. Reviewed together 2026-02-22.

Non-negotiable: **an aircraft does not return to service without a legally defensible chain of evidence.** Every precondition in Section 2 exists because the FAA can — and does — ask for it. If the mutation allows RTS without any one of those checks, we're facilitating fraudulent records. Not a product defect. A federal violation.

---

## Section 1: RTS Authorization Chain

### 1.1 Who May Authorize Return to Service

Authority to return an aircraft to service is strictly defined by regulation. The system must enforce this, not merely display it.

#### 1.1.1 Annual Inspection — IA Required (14 CFR 91.409(a), 65.91)

An aircraft that has undergone an annual inspection may only be returned to service by a holder of an **Inspection Authorization (IA)**.

**Conditions that must all be true:**

1. The signing technician holds an active IA (certificate table: `hasIaAuthorization == true`)
2. The IA has not expired as of the RTS date (`iaExpiryDate > returnToServiceDate`)
3. The IA was exercised within the preceding 24 months (65.83 recent experience — `lastExercisedDate` within 24 months of RTS date)
4. The work order type is `annual_inspection`
5. An `inspectionRecord` of type `annual` is linked to the work order and signed

No exceptions. A lapsed IA invalidates the annual inspection sign-off. The system must hard-block, not warn.

#### 1.1.2 100-Hour Inspection — A&P Permitted (14 CFR 91.409(b))

A 100-hour inspection may be signed off by an A&P mechanic. IA not required unless the aircraft is also due for its annual.

**Conditions:**

1. Signing technician holds an A&P certificate (both airframe and powerplant ratings) — or holds a rating relevant to the scope of the 100-hour
2. Recent experience valid (65.83 — 24 months)
3. Work order type is `100hr_inspection`
4. If the aircraft is also overdue for its annual, an IA must additionally sign the annual inspection record before RTS is permitted

#### 1.1.3 General Maintenance (Non-Inspection Work Orders) — A&P Permitted (14 CFR 43.9)

For work orders of type `routine`, `unscheduled`, `ad_compliance`, `major_repair`, `major_alteration`, or `field_approval`:

1. Signing technician holds an appropriate A&P rating for the work performed (airframe work → airframe rating; powerplant work → powerplant rating; both → both ratings)
2. Recent experience valid
3. If the work constitutes a major repair or major alteration, a Form 337 must be generated and filed — the system must flag this requirement and block RTS until a 337 reference is recorded
4. For `field_approval` type work orders, an FAA-issued field approval number must be recorded before RTS is permitted

#### 1.1.4 Part 145 Repair Station — Additional Layer (14 CFR 145.201)

If the organization holds a Part 145 certificate (`part145CertificateNumber` set on organizations table):

1. The signing technician must appear in the repair station's authorized personnel list (verified via `repairStationAuthorizations` on the certificates table)
2. The work performed must fall within the repair station's rated work scope (`part145Ratings` on the organizations table)
3. The repair station certificate number must appear on all maintenance records produced (`organizationCertificateNumber` — per schema INV and 14 CFR 43.9)

### 1.2 Authorization Chain Summary Table

| Work Order Type | Minimum Signer | IA Required? | Form 337? | 145 Scope Check? |
|---|---|---|---|---|
| `annual_inspection` | IA | **Yes** | No | If Part 145 org |
| `100hr_inspection` | A&P | No | No | If Part 145 org |
| `routine` | A&P (relevant rating) | No | No | If Part 145 org |
| `unscheduled` | A&P (relevant rating) | No | No | If Part 145 org |
| `ad_compliance` | A&P | No | No | If Part 145 org |
| `major_repair` | A&P + 337 reference | Recommended | **Yes** | If Part 145 org |
| `major_alteration` | A&P + 337 reference | Recommended | **Yes** | If Part 145 org |
| `field_approval` | A&P + FAA approval # | No | Typically | If Part 145 org |

### 1.3 IA Expiry — March 31 Rule

All IAs expire **March 31 of the applicable year**, regardless of issue date. `iaExpiryDate` is always March 31 23:59:59 of the applicable year. The mutation compares this against `returnToServiceDate` using UTC epoch. If `returnToServiceDate > iaExpiryDate`: hard throw, no grace period, no override. An IA expired on March 31 may not sign on April 1.

---

## Section 2: `authorizeReturnToService` — Convex Mutation Specification

### 2.1 Mutation Signature

```typescript
// convex/mutations/returnToService.ts

export const authorizeReturnToService = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    signatureAuthEventId: v.id("signatureAuthEvents"),
    returnToServiceStatement: v.string(),
    aircraftHoursAtRts: v.number(),
    limitations: v.optional(v.string()),
  },
  handler: async (ctx, args) => { ... }
});
```

### 2.2 Preconditions — All Must Pass

The mutation executes these checks in order. Each failure throws with a typed error code. None are warnings. None are bypassable.

**PRECONDITION 1: Signature auth event valid**

```
- Load signatureAuthEvents by args.signatureAuthEventId
- Assert: event.consumed == false          → throw RTS_AUTH_EVENT_CONSUMED
- Assert: event.expiresAt > Date.now()     → throw RTS_AUTH_EVENT_EXPIRED
- Assert: event.intendedTable == "returnToService" → throw RTS_AUTH_EVENT_WRONG_TABLE
```

The event must be fresh and unconsumed. The 5-minute TTL is enforced here, not in the UI. Do not rely on the frontend to prevent expired events from being submitted.

**PRECONDITION 2: Work order state valid**

```
- Load workOrder by args.workOrderId
- Assert: workOrder.status == "pending_signoff"  → throw RTS_WRONG_WO_STATUS
- Assert: workOrder.aircraftTotalTimeAtClose is set → throw RTS_NO_CLOSE_TIME
- Assert: workOrder.returnToServiceId == null     → throw RTS_ALREADY_SIGNED
```

`pending_signoff` is the only permissible status. The work order must have transitioned to this status via the technician-facing close flow (all task cards complete, discrepancies dispositioned) before RTS can be authorized.

**PRECONDITION 3: Aircraft total time consistent**

```
- Assert: args.aircraftHoursAtRts == workOrder.aircraftTotalTimeAtClose
  → throw RTS_TIME_MISMATCH
- Load aircraft by workOrder.aircraftId
- Assert: workOrder.aircraftTotalTimeAtClose >= workOrder.aircraftTotalTimeAtOpen
  → throw RTS_TIME_DECREASED  (should have been caught at WO close, but verify here)
- Assert: args.aircraftHoursAtRts >= aircraft.totalTimeAirframeHours
  → throw RTS_TIME_BELOW_AIRCRAFT_RECORD
```

The RTS aircraft hours must match the work order's recorded close time exactly. This field is not a user entry on the RTS screen — it is sourced directly from `workOrder.aircraftTotalTimeAtClose`. The frontend pre-populates it; the backend verifies it matches. Any divergence is an integrity failure.

**PRECONDITION 4: All task cards complete**

```
- Query taskCards.by_work_order(workOrderId)
- For each card:
    Assert: card.status == "complete" OR card.status == "voided"
    → throw RTS_OPEN_TASK_CARDS { cardIds: [...] }
- If any card.status == "incomplete_na_steps":
    Assert: all linked taskCardSteps with status=="na" have naAuthorizedById set
    → throw RTS_UNREVIEWED_NA_STEPS { stepIds: [...] }
```

A task card in `incomplete_na_steps` is not blocking if all N/A steps have been reviewed and authorized. A card in `in_progress` or `not_started` is a hard block.

**PRECONDITION 5: All discrepancies dispositioned**

```
- Query discrepancies.by_work_order(workOrderId)
- For each discrepancy:
    Assert: discrepancy.status == "dispositioned"
    → throw RTS_OPEN_DISCREPANCIES { discrepancyIds: [...] }
- For each discrepancy where disposition == "corrected":
    Assert: discrepancy.correctiveMaintenanceRecordId is set
    → throw RTS_CORRECTIVE_RECORD_MISSING { discrepancyIds: [...] }
- For each discrepancy where disposition == "deferred_mel":
    Assert: melItemNumber, melCategory, melDeferralDate, melExpiryDate all set
    → throw RTS_MEL_FIELDS_INCOMPLETE { discrepancyIds: [...] }
    Assert: melExpiryDate > Date.now()
    → throw RTS_MEL_EXPIRED { discrepancyIds: [...] }
    - If aircraft.operatingRegulation includes Part 135/121:
        Assert: deferredListIssuedToOwner == true
        → throw RTS_MEL_DEFERRAL_LIST_NOT_ISSUED { discrepancyIds: [...] }
```

An overdue MEL is a hard block. A deferred MEL item that has been correctly filed is not.

**PRECONDITION 6: Signing technician authorized**

```
- Load signatureAuthEvent → technicianId
- Load technician
- Assert: technician.status == "active"           → throw RTS_TECH_INACTIVE
- Load certificates for technicianId
- Determine required authorization from workOrder.workOrderType (per Section 1.1)
- For annual_inspection:
    Assert: cert.hasIaAuthorization == true        → throw RTS_IA_REQUIRED
    Assert: cert.iaExpiryDate > returnToServiceDate → throw RTS_IA_EXPIRED
    Assert: cert.lastExercisedDate within 24 months → throw RTS_RECENT_EXP_LAPSED
- For all types:
    Assert: relevant rating present (airframe/powerplant per work scope)
    → throw RTS_RATING_INSUFFICIENT
- If Part 145 organization:
    Assert: technician appears in repairStationAuthorizations for this org
    → throw RTS_NOT_AUTHORIZED_FOR_ORG
    Assert: work scope within organization's part145Ratings
    → throw RTS_SCOPE_OUTSIDE_STATION_RATING
```

**PRECONDITION 7: AD compliance reviewed (annual and 100-hour inspections only)**

```
- If workOrder.workOrderType in ["annual_inspection", "100hr_inspection"]:
    Load inspectionRecord linked to this workOrder
    Assert: inspectionRecord exists                → throw RTS_NO_INSPECTION_RECORD
    Assert: inspectionRecord.adComplianceReviewed == true → throw RTS_AD_REVIEW_NOT_DOCUMENTED
    - Load all adCompliance records for this aircraft where applicable == true
    - For each:
        Assert: complianceStatus != "not_complied"
        Assert: if recurring AD: nextDueDate > returnToServiceDate OR nextDueHours > aircraftHoursAtRts
        → throw RTS_AD_OVERDUE { adIds: [...] }
```

**PRECONDITION 8: Required signatures present on maintenance records**

```
- Query maintenanceRecords.by_work_order(workOrderId)
- Assert: at least one maintenanceRecord exists    → throw RTS_NO_MAINTENANCE_RECORDS
- For each maintenanceRecord:
    Assert: signatureHash is set and non-empty     → throw RTS_UNSIGNED_RECORD { recordIds: [...] }
    Assert: signatureAuthEventId references a consumed event → throw RTS_RECORD_SIG_INVALID
```

**PRECONDITION 9: Return to service statement provided**

```
- Assert: args.returnToServiceStatement is non-empty string
    → throw RTS_STATEMENT_EMPTY
- Assert: args.returnToServiceStatement.length >= 50
    → throw RTS_STATEMENT_TOO_SHORT  (minimum meaningful legal statement)
```

The RTS statement is a legal certification. A one-word entry is not legally defensible. The 50-character floor is a heuristic; the text must include the regulatory citation. Frontend should provide a compliant template and enforce minimum meaningful content.

### 2.3 Execution — After All Preconditions Pass

```typescript
// 1. Atomically consume the signature auth event
await ctx.db.patch(args.signatureAuthEventId, {
  consumed: true,
  consumedAt: Date.now(),
  consumedByTable: "returnToService",
  consumedByRecordId: null,  // will patch after creation
});

// 2. Create the returnToService record
const rtsId = await ctx.db.insert("returnToService", {
  workOrderId: args.workOrderId,
  aircraftId: workOrder.aircraftId,
  organizationId: workOrder.organizationId,
  inspectionRecordId: inspectionRecord?._id ?? undefined,
  signedByIaTechnicianId: technician._id,
  iaCertificateNumber: signingCert.certificateNumber,
  iaRepairStationCert: organization.part145CertificateNumber ?? undefined,
  iaAuthorizedWorkScope: repairStationAuth?.authorizedWorkScope ?? undefined,
  iaCurrentOnRtsDate: iaCurrent,           // boolean computed in precondition 6
  returnToServiceDate: Date.now(),
  returnToServiceStatement: args.returnToServiceStatement,
  aircraftHoursAtRts: args.aircraftHoursAtRts,
  limitations: args.limitations,
  signatureHash: computeRtsHash(allFields),
  signatureTimestamp: Date.now(),
  signatureAuthEventId: args.signatureAuthEventId,
  createdAt: Date.now(),
});

// 3. Patch consumed event with recordId
await ctx.db.patch(args.signatureAuthEventId, {
  consumedByRecordId: rtsId,
});

// 4. Update work order
await ctx.db.patch(args.workOrderId, {
  status: "closed",
  returnToServiceId: rtsId,
  returnedToService: true,
  closedAt: Date.now(),
  closedByUserId: identity.subject,
  closedByTechnicianId: technician._id,
  aircraftTotalTimeAtClose: args.aircraftHoursAtRts,
  updatedAt: Date.now(),
});

// 5. Update aircraft time
await ctx.db.patch(workOrder.aircraftId, {
  totalTimeAirframeHours: args.aircraftHoursAtRts,
  totalTimeAirframeAsOfDate: Date.now(),
  status: "airworthy",
  updatedAt: Date.now(),
});

// 6. Write audit log entries (see Section 6)
await writeRtsAuditLog(ctx, { ... });
```

---

## Section 3: RTS Document Generation Model

### 3.1 What Constitutes a Legal Maintenance Release

The `returnToService` record is the system's representation of the regulatory document. It is immutable once created. The following fields collectively constitute the legal maintenance release.

#### Required Fields — Cannot Be Null

| Field | Source | Regulatory Basis |
|---|---|---|
| `aircraftId` + denormalized aircraft data | Snapshot from aircraft record | 43.11(a)(1) |
| `aircraftRegistration` | Snapshotted from aircraft at signing | 43.11(a)(1) |
| `aircraftMake`, `model`, `serialNumber` | Snapshotted | 43.11(a)(1) |
| `aircraftHoursAtRts` | From `workOrder.aircraftTotalTimeAtClose` | 43.11(a)(2) |
| `returnToServiceDate` | Server timestamp at mutation execution | 43.11(a)(4) |
| `returnToServiceStatement` | Technician-authored, template-assisted | 43.9(a), 43.11(a)(6) |
| `signedByIaTechnicianId` | From signatureAuthEvent.technicianId | 43.11(a)(5) |
| `iaCertificateNumber` | Snapshotted from certificate record at signing | 43.11(a)(5), 65.91 |
| `iaCurrentOnRtsDate` | Computed boolean, immutable after signing | 65.92, 65.93 |
| `signatureHash` | Computed over all RTS fields before insert | AC 43-9C (integrity) |
| `signatureAuthEventId` | Provided by caller, must be unconsumed | AC 43-9C (authenticity) |
| `workOrderId` | Arg | Record linkage |
| `organizationId` | From work order | 145.219 |

#### Conditionally Required Fields

| Field | When Required |
|---|---|
| `iaRepairStationCert` | When org has `part145CertificateNumber` |
| `iaAuthorizedWorkScope` | When signing under repair station authorization |
| `inspectionRecordId` | When work order type is annual or 100-hour |
| `limitations` | When MEL deferrals are present or limitations apply |

### 3.2 The RTS Statement — Legal Language

The `returnToServiceStatement` is the regulatory certification language required by 43.9 and 43.11. Frontend provides a pre-populated template (per work order type, see Section 5.4); technician reviews and confirms.

**Annual (43.11 template):** `I certify that this aircraft has been inspected in accordance with an annual inspection and was determined to be in airworthy condition. [Date] [Aircraft ID] [TT] [IA cert #] — Return to service per 14 CFR § 43.11.`

**General maintenance (43.9 template):** `I certify that the work specified was performed in accordance with 14 CFR Part 43 and the aircraft is approved for return to service. [Date] [Aircraft ID] [Cert # / type] — Return to service per 14 CFR § 43.9.`

The technician may append to these templates. They may not delete the regulatory citation line.

### 3.3 Hash Computation

`signatureHash` is computed over the canonical JSON serialization of all required RTS fields (excluding `signatureHash` itself and `createdAt`). The hash is SHA-256. The computation happens in the mutation before insert. The input fields are deterministically ordered.

The hash serves to detect any post-insert alteration. Because `returnToService` records are immutable in the schema (no `updatedAt`, no update mutation), any database-level tampering would change the document hash without changing the stored hash. FAA inspectors or auditors may re-compute and compare.

---

## Section 4: IA vs. A&P Sign-Off Distinctions

### 4.1 The Core Distinction

An A&P mechanic signs their own work. An IA approves the aircraft as a whole for return to service after inspection.

These are not synonymous. Marcus's exact words: *"An A&P who signs a 43.9 maintenance record is saying 'I performed this work and it meets the standard.' An IA who signs a 43.11 inspection record is saying 'I have inspected this entire aircraft and found it airworthy.' Those are different legal statements with different liability implications."*

### 4.2 IA Sign-Off — When Required

| Condition | IA Required? | Regulatory Basis |
|---|---|---|
| Annual inspection | **Always** | 14 CFR 91.409(a), 65.91 |
| 100-hour inspection | No (A&P sufficient) | 14 CFR 91.409(b) |
| Progressive inspection | Depends on program (usually IA) | 14 CFR 91.409(d) |
| Major repair or alteration | No (A&P), but Form 337 required | 14 CFR 43.9, Part 43 App B |
| AD compliance (one-time) | No (A&P) | 14 CFR 39 |
| AD compliance (recurring, inspects structural integrity) | IA typically required if inspection-type compliance | Context-specific |
| Condition inspection (Experimental) | No (A&P or builder) | 14 CFR 91.409(c) |

### 4.3 IA Sign-Off — What the System Verifies

In addition to the A&P checks, an IA sign-off triggers these additional verifications in the mutation:

1. `certificate.hasIaAuthorization == true`
2. `certificate.iaExpiryDate > returnToServiceDate` (March 31 rule — hard block if lapsed)
3. `certificate.lastExercisedDate` within preceding 24 months (65.83 recent experience)
4. `iaCurrentOnRtsDate` is computed to `true` — written permanently to the `returnToService` record
5. IA's `iaRenewalActivities` are not validated by the system (self-reported), but the expiry date is the hard control

### 4.4 A&P Sign-Off — Rating Verification

Airframe work → airframe rating required. Powerplant work → powerplant rating required. `ratingsExercised` on `technicianSignature` captures which rating was exercised at signing. Mutation verifies `ratings[]` on the signing certificate includes the relevant rating(s). Work scope derived from task card `taskType` and `workOrder.workOrderType`. Mixed-scope work orders require either a dual-rated A&P or separate signatories per scope.

### 4.5 Dual-Sign Work Orders

Mixed-scope work orders (airframe + powerplant) support multiple signatories: one A&P per scope, plus IA for the 43.11 record if inspection type. `maintenanceRecords.technicians[]` captures all; `returnToService.signedByIaTechnicianId` captures only the final RTS authority.

---

## Section 5: Frontend Sign-Off Flow

> **[CHLOE]** *This section is mine. I've laid out the sign-off screen as a step-by-step interaction model. Component references are to our internal UX library (`@athelon/ui`). I'll be building this against our existing component patterns — nothing here requires new primitives except the re-auth modal, which Jonas and I need to spec together.*

### 5.1 Entry Points to Sign-Off Screen

The sign-off screen is reached from two places:

1. **Work Order Detail Page** → "Begin Sign-Off" action button (visible only when WO status is `pending_signoff`)
2. **Technician Dashboard** → "Pending Sign-Offs" list card → click row

> **[CHLOE]** "Begin Sign-Off" uses `<ActionButton variant="primary" size="lg">`, gated by Clerk permission `org:signoff:authorize`. Hidden (not just disabled) for users without it. Direct URL access by unauthorized users → `<ForbiddenState>` with explanation.

### 5.2 Sign-Off Screen — Step-by-Step Interaction Model

The sign-off screen is a **linear, gated wizard** using `<WizardLayout steps={steps}>` from `@athelon/ui`. Steps cannot be skipped. Progress is tracked in component state; no partial-save to the database until the final submission.

---

#### Step 1: Pre-Flight Summary (Read-Only)

**Purpose:** Give the IA or A&P a consolidated view of everything they are certifying.

**Content displayed:**

- Aircraft identification card: `<AircraftSummaryCard>` — N-number, make/model, serial, total time at close
- Work order summary: type, opened date, opened-by, description
- Task card status grid: `<TaskCardStatusGrid workOrderId={...}>` — one row per task card showing status badge. All must be `complete` or `voided` (backend enforced; frontend displays the current state and blocks "Continue" if any are incomplete)
- Discrepancy summary panel: `<DiscrepancySummaryPanel>` — grouped by disposition type. MEL deferrals shown in amber with expiry dates
- AD compliance review status: green check if `inspectionRecord.adComplianceReviewed == true` and all applicable ADs are current; red block with list otherwise
- Maintenance records list: `<MaintenanceRecordList workOrderId={...}>` — each record with signature status indicator

> **[CHLOE]** If any blocking condition is present, the step footer shows `<BlockingConditionAlert>` listing each blocker as a clickable link. "Continue" is replaced with "Resolve Blockers" navigating to the first blocker. Fail fast in the UI — the IA should not reach the signature step only to be rejected by the backend.

---

#### Step 2: Review Discrepancy List (Conditional)

**Shown only when:** at least one discrepancy is deferred (MEL or grounded)

**Purpose:** Confirm that the owner/lessee has been notified per 14 CFR 43.11(b).

**Content:**

- List of deferred discrepancies: `<DeferredDiscrepancyTable>`
- For each deferred item: description, MEL category, expiry date, deferral date
- Checkbox group: "I have provided the owner/lessee with a written copy of this discrepancy list" — required, cannot continue without checking
- Recipient field: name of owner/lessee who received the list
- Timestamp field: auto-filled with now(), displayed as "Issued at [time]"

> **[CHLOE]** Uses `<RequiredAcknowledgement label="...">` — visually distinct control (outlined, heavier than standard checkbox) used throughout the app for regulatory acknowledgements. On check, writes to local state; backend verifies `deferredListIssuedToOwner == true` in precondition check.

---

#### Step 3: Aircraft Times Confirmation

**Purpose:** Confirm the aircraft total time at close. This value will appear on all legal documents.

**Content:**

- `<AircraftTimesConfirmationCard>`:
  - Aircraft total time at work order open: read-only field
  - Aircraft total time at close (entered by user during WO close flow): read-only, pre-filled
  - Engine times: read-only, pre-filled from work order
- Single acknowledgement: "I confirm these times are accurate and consistent with the aircraft logbooks"
- If times appear inconsistent (close < open), the field is shown in red and the acknowledgement is replaced with a hard block (this should have been caught at WO close, but we surface it here defensively)

> **[CHLOE]** Times are displayed in `<TimeDisplay>` component which formats hours to 1 decimal place with a unit label (e.g., "4,823.4 hrs TT"). We do not allow editing on this screen — aircraft times were entered during the WO close flow. If they are wrong, the technician must go back and amend the WO close. We provide a "Fix This" link that navigates back to WO detail with a `?editMode=times` param.

---

#### Step 4: Return-to-Service Statement

**Purpose:** Compose and confirm the legal RTS statement.

**Content:**

- `<RtsStatementEditor>`:
  - Pre-populated template (per Section 3.2) based on work order type
  - Rich text editor with character count
  - Regulatory citation line is read-only (rendered as static text below the editable area)
  - Minimum character warning at < 100 chars; block at < 50 chars
- Limitations field (optional): `<TextArea label="Operating Limitations (if any)">` — pre-filled with any MEL category limitations

> **[CHLOE]** The template injection happens on mount, keyed to `workOrder.workOrderType`. We store the template strings in a constants file, not fetched from the DB. The citation line ("Return to service per 14 CFR § 43.9" or "43.11") is injected as a read-only paragraph below the textarea so the user can see it but not delete it. We visually distinguish it with a gray background and a "Required — do not remove" label.

---

#### Step 5: Identity Re-Authentication (Sign)

**Purpose:** Generate the `signatureAuthEvent` that constitutes the legal signature.

**Content:**

- `<ReAuthModal>`:
  - Header: "Confirm Your Identity to Sign"
  - Explanation text: "Your certificate credentials and authentication will be permanently recorded with this maintenance release."
  - Certificate number display (from their technician profile, read-only): `<CertificateDisplay>`
  - IA status and expiry display (if IA signing): shown in green if current, red banner if expired
  - Auth method selector: PIN (default), Face ID (if device supports it), password
  - Auth input field: masked PIN entry or password field
  - Submit button: "Sign and Return to Service"

> **[CHLOE]** On successful re-auth, Clerk fires a webhook → Jonas's handler creates the `signatureAuthEvent` in Convex. Frontend polls via `useQuery(api.signatureAuthEvents.getPendingForUser, { userId })` (max 10s, 500ms interval). On event ID receipt, proceed to Step 6. On timeout, show `<ReAuthTimeoutError>`. No optimistic submit — the event must exist in DB before the mutation is called; mutation rejects it otherwise.

---

#### Step 6: Final Confirmation and Submission

**Purpose:** One-screen summary of everything being certified. Last chance to review before the record is immutable.

**Content:**

- `<RtsPreviewCard>` — read-only preview of the complete RTS document as it will appear:
  - Aircraft identification block
  - Times block
  - RTS statement
  - Limitations (if any)
  - Signing technician name, certificate number, IA number (if applicable)
  - Date and timestamp
- Final acknowledgement: `<RequiredAcknowledgement label="I understand this record is permanent and cannot be altered after submission." />`
- Submit button: `<ActionButton variant="danger-confirm" label="Issue Return to Service" />`

> **[CHLOE]** "danger-confirm" variant: red-background, requires 2s hover before clickable (prevents accidental single-clicks). On click: fires `authorizeReturnToService` with all collected args. On success: navigate to WO detail (status: closed, green RTS banner), toast "Aircraft returned to service. Record ID: [id]". On failure: parse error code → `<MutationErrorAlert errorCode={...}>` with resolution link.

---

### 5.3 Sign-Off Screen — Technician Task Card Step Sign-Off (Inline, Pre-RTS)

Before the RTS sign-off wizard, individual task card steps are signed inline on the Task Card Detail page. This is a separate, lighter interaction:

1. Technician checks off a step: `<StepCheckbox>` — click transitions step to `completed` state optimistically in UI
2. On check: `<StepSignOffModal>` slides in — shows step description, requires technician to confirm their rating applies ("This work falls under my [Airframe / Powerplant] rating")
3. Re-auth trigger: if step has `signOffRequiresIa == true`, re-auth modal shown; otherwise, a lighter "confirm with PIN" flow
4. On confirm: calls `signTaskCardStep` mutation — creates the step sign-off with `signatureAuthEventId`
5. On success: step row shows green checkmark, signed-by name, timestamp, certificate number

> **[CHLOE]** N/A marking uses a different control: `<StepNAButton>` with a required reason field. N/A'd steps show in a gray state with the N/A reason and the authorizing technician's name.

---

## Section 6: Audit Log Entries Required at Each Sign-Off Step

### 6.1 Governing Rule

Every write event in the sign-off chain produces an `auditLog` entry. These entries are append-only, immutable, and must include `organizationId` (required for all sign-off event types per schema INV and Marcus 1.1.1).

The audit log write helper (`writeAuditEvent`) is called in the same Convex transaction as the primary mutation. It does not execute after the mutation — it executes within it. If the audit write fails, the entire mutation fails.

### 6.2 Task Card Step Sign-Off

| Event | `eventType` | `tableName` | Fields Logged |
|---|---|---|---|
| Step signed (completed) | `technician_signed` | `taskCardSteps` | `technicianId`, `certificateNumber`, `ratingsExercised`, `signatureAuthEventId`, `stepNumber` in `notes` |
| Step marked N/A | `record_updated` | `taskCardSteps` | `fieldName: "status"`, `oldValue: "pending"`, `newValue: "na"`, `notes: naReason` |
| N/A reviewed by IA | `record_updated` | `taskCardSteps` | `fieldName: "naAuthorizedById"`, `newValue: technicianId` |
| Task card completed | `status_changed` | `taskCards` | `oldValue: "in_progress"`, `newValue: "complete"` |

### 6.3 Discrepancy Disposition

| Event | `eventType` | `tableName` | Fields Logged |
|---|---|---|---|
| Discrepancy dispositioned (corrected) | `record_updated` | `discrepancies` | `fieldName: "disposition"`, `newValue: "corrected"`, `notes: correctiveAction` |
| MEL deferral recorded | `record_updated` | `discrepancies` | `fieldName: "disposition"`, `newValue: "deferred_mel"`, `notes: melItemNumber + melCategory + melExpiryDate` |
| Deferred list issued to owner | `record_updated` | `discrepancies` | `fieldName: "deferredListIssuedToOwner"`, `newValue: "true"`, `notes: recipient name` |

### 6.4 Maintenance Record and Inspection Record Signing

| Event | `eventType` | `tableName` | Fields Logged |
|---|---|---|---|
| Maintenance record created and signed | `record_signed` | `maintenanceRecords` | `technicianId`, `certificateNumber`, `signatureHash`, `signatureAuthEventId`, `returnedToService` in `notes` |
| Inspection record signed (IA) | `record_signed` | `inspectionRecords` | `technicianId: iaTechnicianId`, `certificateNumber: iaCertificateNumber`, `iaCurrentOnInspectionDate` in `notes` |
| Correction record created | `correction_created` | `maintenanceRecords` | `fieldName: correctionFieldName`, `oldValue`, `newValue`, `notes: correctionReason`, references original `recordId` |

### 6.5 RTS Authorization

| Event | `eventType` | `tableName` | Fields Logged |
|---|---|---|---|
| Signature auth event created (re-auth) | `record_created` | `signatureAuthEvents` | `technicianId`, `authMethod`, `ipAddress`, `userAgent`, `expiresAt` |
| Signature auth event consumed | `record_updated` | `signatureAuthEvents` | `fieldName: "consumed"`, `newValue: "true"`, `consumedByTable`, `consumedByRecordId` |
| `returnToService` record created | `record_signed` | `returnToService` | `technicianId: signedByIaTechnicianId`, `certificateNumber: iaCertificateNumber`, `iaCurrentOnRtsDate`, `aircraftHoursAtRts`, `signatureHash` |
| Work order status → closed | `status_changed` | `workOrders` | `oldValue: "pending_signoff"`, `newValue: "closed"`, `notes: returnToServiceId` |
| Aircraft status → airworthy | `status_changed` | `aircraft` | `fieldName: "status"`, `oldValue: prior status`, `newValue: "airworthy"`, `notes: workOrderId` |
| Aircraft total time updated | `record_updated` | `aircraft` | `fieldName: "totalTimeAirframeHours"`, `oldValue: prior TT`, `newValue: aircraftHoursAtRts` |

### 6.6 Failure Audit Entries

When `authorizeReturnToService` throws a precondition error, the failed attempt is logged:

| Event | `eventType` | `tableName` | Fields Logged |
|---|---|---|---|
| RTS precondition failed | `access_denied` | `returnToService` | `userId`, `technicianId`, `notes: errorCode + workOrderId` |

Not optional. A pattern of failed RTS attempts on a single work order is a data anomaly an FAA inspector may reasonably investigate. Log every attempt, every failure.

---

## Section 7: Error Codes Reference

All errors thrown by `authorizeReturnToService` are typed as `ConvexError<{ code: string }>`. The frontend maps each code to a human-readable message and a resolution link.

**Auth / State errors:** `RTS_AUTH_EVENT_CONSUMED` · `RTS_AUTH_EVENT_EXPIRED` · `RTS_AUTH_EVENT_WRONG_TABLE` · `RTS_WRONG_WO_STATUS` · `RTS_NO_CLOSE_TIME` · `RTS_ALREADY_SIGNED`

**Time consistency errors:** `RTS_TIME_MISMATCH` (submitted hours ≠ WO close hours) · `RTS_TIME_DECREASED` (close < open — flag as potential falsification) · `RTS_TIME_BELOW_AIRCRAFT_RECORD`

**Completion errors:** `RTS_OPEN_TASK_CARDS` (include `cardIds[]`) · `RTS_UNREVIEWED_NA_STEPS` (include `stepIds[]`) · `RTS_OPEN_DISCREPANCIES` (include `discrepancyIds[]`) · `RTS_CORRECTIVE_RECORD_MISSING` · `RTS_MEL_FIELDS_INCOMPLETE` · `RTS_MEL_EXPIRED` (aircraft grounded; this is not a soft warning) · `RTS_MEL_DEFERRAL_LIST_NOT_ISSUED`

**Authorization errors:** `RTS_TECH_INACTIVE` · `RTS_IA_REQUIRED` · `RTS_IA_EXPIRED` (hard block; no grace period past March 31) · `RTS_RECENT_EXP_LAPSED` (65.83, 24-month rule) · `RTS_RATING_INSUFFICIENT` · `RTS_NOT_AUTHORIZED_FOR_ORG` · `RTS_SCOPE_OUTSIDE_STATION_RATING`

**Record errors:** `RTS_AD_REVIEW_NOT_DOCUMENTED` · `RTS_AD_OVERDUE` (include `adIds[]`) · `RTS_NO_MAINTENANCE_RECORDS` · `RTS_UNSIGNED_RECORD` (include `recordIds[]`) · `RTS_STATEMENT_EMPTY` · `RTS_STATEMENT_TOO_SHORT`

---

## Section 8: Open Items Before Implementation

These items require resolution before Devraj begins mutation implementation.

| # | Item | Owner | Status |
|---|---|---|---|
| OI-01 | Ratings-exercised inference logic — who determines airframe vs powerplant scope from task card type? Is this the technician's choice at signing, or system-inferred from task card `taskType`? | Marcus + Devraj | Open |
| OI-02 | Form 337 reference field — the schema does not currently have a 337 reference on `workOrders` or `maintenanceRecords`. Must add before major repair/alteration sign-off can be blocked on it. | Devraj | Needs schema change request |
| OI-03 | Re-auth modal Clerk integration — Jonas must provide the frontend the `signatureAuthEvent` ID after webhook receipt. Currently no mechanism for Clerk webhook → Convex → frontend push. Jonas proposes Convex `useQuery` poll; acceptable short-term. | Jonas + Chloe | In progress |
| OI-04 | RTS statement minimum content validation — 50-char floor is a heuristic. Does Marcus want a keyword check (e.g., must contain "14 CFR")? | Marcus | Pending Marcus decision |
| OI-05 | Multi-inspector dual sign-off flow — what is the UX for a work order requiring both an airframe and powerplant signatory before the IA can sign the annual? Wizard sequence unclear. | Chloe | Needs UX design session |
| OI-06 | Aircraft record portability on customer change — the `authorizeReturnToService` mutation updates aircraft status to airworthy. If the aircraft's `customerId` changes between WO open and RTS, does the RTS record belong to the old or new customer context? | Marcus + Rafael | Open — policy decision |

---

*Marcus Webb — Regulatory*  
*Chloe Park — Frontend*  
*2026-02-22*  
*Document for Athelon Phase 2 internal review. Not for distribution.*
