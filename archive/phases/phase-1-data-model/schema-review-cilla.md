# Athelon Schema Review — QA Assessment
**Document Type:** Quality Assurance Review  
**Reviewer:** Cilla Oduya, QA Lead  
**Date:** Phase 1, Day 4  
**Review Subject:** `convex-schema.md` (Devraj Anand, primary author)  
**Reference Documents:** `data-model-architecture.md`, `technical-requirements-001-platform-stack.md`  
**Status:** DRAFT — Pending team discussion

---

## Reviewer's Note

I'm going through this as a QA engineer who also has to build tests for it. That framing matters: a schema that looks reasonable can be a testing nightmare if the optionality is wrong, if enums are incomplete, or if invariants live only in developer notes rather than enforced constraints.

Devraj's schema is cleaner than most first drafts I've seen. The separation of concerns is mostly right. The immutability intent is documented. The indexing is thoughtful.

But "thoughtful" and "testable" are different things. Several of the compliance invariants described in Marcus's requirements document and Rafael's architecture document exist only as prose notes — not as schema constraints, not as enforced mutation logic, and therefore not as anything I can write a reliable test against.

I'm going to be specific about what I found and what it means for testability. I'll use table and field names directly.

---

## 1. Testability Gaps

### 1.1 Invariants Documented in Comments, Not Enforced in Code

The schema file contains developer notes like:

> *"NOTE: NO updatedAt field — this record is immutable after creation"* (on `maintenanceRecords`)

And:

> *"IMMUTABLE — no UPDATE operations permitted"* (on `maintenanceRecords` header comment)

Comments are not tests. Comments are not constraints. Comments are not even documentation once the code is separated from the file that contains them.

I cannot write a test that asserts "no update operation was called on maintenanceRecords" based on a TypeScript comment. I can write a test that calls a non-existent `updateMaintenanceRecord` mutation and asserts it throws — but only if that mutation explicitly does not exist and the codebase convention is established.

**Testability requirement:** Every invariant currently expressed as a comment must become either:
1. A schema-enforced constraint (where Convex supports it), OR
2. A documented mutation-layer check with a corresponding test case in the test matrix

A list of invariants-from-comments in this schema:
- `maintenanceRecords`: No UPDATE permitted
- `inspectionRecords`: No UPDATE permitted (noted via absence of `updatedAt`)
- `returnToService`: No UPDATE permitted
- `auditLog`: Never deleted
- `aircraftRegistrationHistory`: Append-only
- `adCompliance.complianceHistory`: Append-only array

None of these are currently testable from the schema alone.

### 1.2 Business Rules in Architecture Doc That Have No Schema Anchor

Rafael's architecture document lists business rules under each entity. Several of these have no corresponding schema support, making them impossible to test at the data layer:

**From Entity 4 (WorkOrder):**
> "A work order may not transition to CLOSED with any open discrepancies that are not formally dispositioned"

There is no `openDiscrepancyCount` field, no computed field, and no index that makes this checkable without querying the entire `discrepancies` table filtered by `workOrderId` and `status == "open"`. For testing, I need a mutation that enforces this and a clear test that:
- Creates a work order
- Creates an open discrepancy linked to it
- Attempts to close the work order
- Asserts the close is rejected

This test is writable — but only if the close mutation explicitly enforces this rule. If it doesn't, the test will pass vacuously. Who owns ensuring that mutation enforces this rule? It needs to be in Devraj's mutations spec before I can write the test.

**From Entity 2 (Engine):**
> "If status is `installed`, `current_aircraft_id` must be set"

The schema has:
```typescript
currentAircraftId: v.optional(v.id("aircraft")),
status: v.union(v.literal("installed"), ...)
```

Both fields exist. Neither enforces the constraint against the other. An `engine` can have `status: "installed"` and `currentAircraftId: undefined` — and the schema will accept it. A test for this would be:

```
assert: createEngine({ status: "installed", currentAircraftId: undefined }) throws
```

Right now that test would fail — the mutation would succeed. This is a data integrity bug waiting to be introduced.

**From Entity 3 (Certificate):**
> "A technician may not sign a maintenance record using a certificate that was expired or non-current on the date of signing"

There is no query path to validate this from the schema alone. The validation requires:
1. Looking up `certificates` by `technicianId` and `certificateType`
2. Checking `iaExpiryDate` vs. `signatureTimestamp`
3. Checking `lastExercisedDate` vs. `signatureTimestamp - 24 months`

All three data points are in the schema. But the check is only enforced if the signing mutation performs it. I need a signing mutation spec that explicitly lists these pre-condition checks, and I need test cases for:
- Signing with an expired IA → rejected
- Signing with a lapsed recent-experience record → rejected
- Signing with a certificate that was valid on the signing date but has since expired → accepted (historical validation)

The third case is the hard one. The schema captures `lastExercisedDate` but doesn't capture whether the recent-experience check passed at signing time. That means retroactive validation of historical records is impossible — I can't verify that a 2023 record was signed by a currently-authorized technician without knowing what `lastExercisedDate` was in 2023.

**This is a significant testability and compliance gap.** More on this in Section 4.

### 1.3 Embedded Arrays Are Untestable as Isolated Units

The `steps` array embedded inside `taskCards`:

```typescript
steps: v.array(v.object({
  stepNumber: v.number(),
  description: v.string(),
  requiresSpecialTool: v.boolean(),
  ...
  signedByTechnicianId: v.optional(v.id("technicians")),
  ...
})),
```

Each step sign-off is a write to the parent `taskCards` document. That means:

1. There's no independent document for a step sign-off event
2. There's no index on step-level data
3. There's no audit trail for a specific step — the `auditLog` would record a `record_updated` event on the `taskCards` document, but would capture the entire updated document, not the specific step that changed

Test consequence: If I want to verify that "step 3 of task card TC-047 was signed by technician AB123456 at 14:32 UTC," I have to:
- Query the `taskCards` document
- Dig into `steps[2]`
- Extract `signedByTechnicianId` and `signedAt`
- Check them against expected values

This is doable in a unit test. But if the `auditLog` event for that signing only shows "taskCard updated" without identifying which step changed, then the audit trail for regulatory purposes is inadequate.

Devraj's own notes flag the concurrency issue. I'm flagging the testability and audit granularity issue. Both point to the same fix: `taskCardSteps` should be its own table.

---

## 2. Missing Validation Constraints

### 2.1 String Fields with No Format Validation

Several fields have regulatory-specified formats that the schema accepts as unconstrained strings:

**`certificates.certificateNumber`:**
```typescript
certificateNumber: v.string(),
```
FAA A&P certificate numbers follow the format 2-letter prefix + 6 digits (e.g., `AB123456`). IA authorizations are tied to the base mechanic certificate. Repair station certificates follow a different format entirely. Currently any string is accepted. A typo in a certificate number — `AB12345` instead of `AB123456` — will pass schema validation and may only be caught (if at all) when an FAA inspector cross-references the number.

**Minimum constraint needed:** Non-empty string. Preferred: regex validation at the mutation layer for known formats. Add a note in the mutation spec.

**`workOrders.workOrderNumber`:**
```typescript
workOrderNumber: v.string(),
```
The schema says this is "Human-readable, org-unique" but there's no uniqueness enforcement in the index definition:
```typescript
.index("by_number", ["organizationId", "workOrderNumber"])
```
The index exists, which enables duplicate checking, but the schema and mutations must enforce uniqueness. A second work order created with the same number in the same organization will currently succeed. Duplicate work order numbers in a regulated environment create chain-of-custody confusion. This must be enforced in the mutation.

**`aircraft.serialNumber`:**
```typescript
serialNumber: v.string(),
```
The index enforces uniqueness within `{make, model, serialNumber}`:
```typescript
.index("by_serial", ["make", "model", "serialNumber"])
```
Good. But there's no validation that `serialNumber` is not empty, not whitespace-only, and not a placeholder like `"UNKNOWN"`. These are not hypothetical — shops entering data manually will use placeholders. Normalize and validate at the mutation layer.

**`maintenanceRecords.aircraftRegistration`:**
```typescript
aircraftRegistration: v.string(),
```
This is the N-number captured at signing time. N-numbers follow the format `N` + 1-5 alphanumeric characters. No format validation exists. An empty string here would pass schema validation and produce a compliance-failing maintenance record.

### 2.2 Number Fields with No Range Constraints

Convex `v.number()` is a float64. It accepts negative numbers, NaN, Infinity, and zero. Several fields in this schema should never be negative or zero:

- `aircraft.totalTimeAirframeHours` — must be ≥ 0
- `engines.totalTimeHours` — must be ≥ 0
- `engines.timeSinceNewHours` — must be ≥ 0
- `parts.hoursAccumulatedBeforeInstall` — must be ≥ 0
- `adCompliance.complianceHistory[].aircraftHoursAtCompliance` — must be ≥ 0
- `workOrders.aircraftTotalTimeAtOpen` — must be ≥ 0
- `discrepancies.foundAtAircraftHours` — must be ≥ 0
- `eightOneThirtyRecords.quantity` — must be ≥ 1 (you can't install zero parts)

None of these have range constraints in the schema. The mutation layer must validate them. Without this, I cannot write a meaningful test that says "inserting a negative aircraft total time is rejected" — currently it would not be rejected.

### 2.3 Boolean Fields Where False Means Something Specific

**`parts.isLifeLimited`:**
```typescript
isLifeLimited: v.boolean(),
lifeLimitHours: v.optional(v.number()),
lifeLimitCycles: v.optional(v.number()),
```

If `isLifeLimited == true`, at least one of `lifeLimitHours` or `lifeLimitCycles` must be set. If both are null, the system has a life-limited part with no defined life limit — which is an undetectable compliance gap. The remaining-life computation will produce undefined results.

Currently a document `{ isLifeLimited: true, lifeLimitHours: undefined, lifeLimitCycles: undefined }` is valid per the schema. It should not be.

**`parts.hasShelfLifeLimit`:**
```typescript
hasShelfLifeLimit: v.boolean(),
shelfLifeLimitDate: v.optional(v.number()),
```

Same pattern. If `hasShelfLifeLimit == true`, `shelfLifeLimitDate` must be set. Currently it doesn't have to be.

**`certificates.hasIaAuthorization`:**
```typescript
hasIaAuthorization: v.boolean(),
iaExpiryDate: v.optional(v.number()),
```

If `hasIaAuthorization == true`, `iaExpiryDate` must be present. An IA with no expiry date is a data model error — all IAs expire on March 31. Without the date, the IA currency check will fail silently or return incorrect results.

**Test pattern for all three:** Write parameterized tests that create documents with the boolean `true` and the dependent field null, and assert rejection. Currently all three would be accepted. That's three failing compliance tests I'd have to mark as "known defect" on day one.

---

## 3. Data Integrity Edge Cases

### 3.1 Concurrent Work Orders on the Same Aircraft

The architecture document says:

> "An aircraft may have multiple simultaneous open work orders, but the system should warn and require explicit override"

The schema has no field to capture this override. If two open work orders exist for the same aircraft — which can happen legitimately (e.g., an avionics shop doing panel work while an airframe shop does a 100-hour) — there's no way to distinguish "this is a known dual-shop situation" from "someone accidentally created a duplicate work order."

Without a field like `multipleWorkOrdersAcknowledged: v.optional(v.boolean())` or a `linkedWorkOrderIds` array, I can't write a test that validates the warning was displayed and the user made an explicit choice. The state after the override looks identical to the state before it.

**Recommendation:** Add `concurrentWorkOrderOverrideAcknowledged: v.optional(v.boolean())` and `concurrentWorkOrderReason: v.optional(v.string())` to `workOrders`. Test that creating a second open work order for the same aircraft requires these fields.

### 3.2 MEL Expiry Date Computation vs. Storage

The `discrepancies` table stores:

```typescript
melExpiryDate: v.optional(v.number()),
```

This is computed from `melCategory` and the deferral date. MEL categories have defined intervals:
- A: 10 calendar days
- B: 3 calendar days
- C: 120 calendar days
- D: No specified limit

The `melExpiryDate` is stored as a computed value. That's a denormalization that can go wrong if the computation changes or if the value is set manually. There's no `melDeferralDate` field to serve as the source of truth for the computation. If I want to audit that `melExpiryDate` is correct, I need the date the deferral was created — which I'd have to infer from `dispositionedAt`. But `dispositionedAt` is when the discrepancy was dispositioned, not necessarily when the MEL deferral clock starts.

**Recommendation:** Add `melDeferralDate: v.optional(v.number())` — the date the MEL deferral was formally logged and the clock started. This gives me a testable source truth: `assert melExpiryDate == melDeferralDate + category_days_in_ms`.

### 3.3 Aircraft Time Snapshot Consistency

`maintenanceRecords` stores:

```typescript
aircraftTotalTimeHours: v.number(),
```

`inspectionRecords` stores:

```typescript
totalTimeAirframeHours: v.number(),
```

`workOrders` stores:

```typescript
aircraftTotalTimeAtOpen: v.number(),
aircraftTotalTimeAtClose: v.optional(v.number()),
```

`adCompliance.complianceHistory[]` stores:

```typescript
aircraftHoursAtCompliance: v.number(),
```

`discrepancies` stores:

```typescript
foundAtAircraftHours: v.number(),
```

All of these are supposed to represent points on the same monotonically increasing timeline of aircraft total time. There is no enforced consistency between them. I can create a maintenance record showing `aircraftTotalTimeHours: 1000` for an aircraft whose work order shows `aircraftTotalTimeAtClose: 1200`. The maintenance record hours would be wrong, but the schema accepts it.

**Testability requirement:** The mutation that creates a maintenance record must validate that `aircraftTotalTimeHours` matches `workOrders.aircraftTotalTimeAtClose` for the linked work order. These values should be the same — the maintenance record sources its aircraft time from the work order close, not from independent user entry.

If they can diverge, we have two conflicting logbook entries about the same aircraft at the same moment. That's a compliance finding.

### 3.4 `adCompliance.complianceHistory` Array Ordering

```typescript
complianceHistory: v.array(v.object({
  complianceDate: v.number(),
  aircraftHoursAtCompliance: v.number(),
  ...
})),
```

This array is described as "append-only." But arrays in Convex documents are just arrays — there's nothing in the schema that enforces ordering or prevents removing elements. If the mutation that adds a compliance event also happens to sort the array differently (or if a bug causes the array to be written with missing entries), there's no way to detect that from the schema.

Additionally: nothing prevents a compliance history entry from being backdated. I could add a compliance event with `complianceDate` set to two years ago even if the last entry was one month ago. This should require either a mutation-layer check (new entry date ≥ last entry date) or an external audit that flags non-monotonic compliance histories.

**Test case:** Add a compliance entry with a date earlier than the most recent entry. Assert rejection.

### 3.5 `parts` Double-Installation State

The `parts` table tracks current installation:

```typescript
currentAircraftId: v.optional(v.id("aircraft")),
currentEngineId: v.optional(v.id("engines")),
location: v.union(
  v.literal("installed"),
  ...
),
```

A serialized part should be installed on exactly one aircraft or engine at a time. The schema has no constraint that prevents:
- `location: "installed"` + `currentAircraftId: null` + `currentEngineId: null`
- `location: "inventory"` + `currentAircraftId: [some id]`
- `currentAircraftId` and `currentEngineId` both set simultaneously (ambiguous installation)

All three are invalid states that the schema currently accepts. The mutation layer must prevent these. Write tests for each invalid transition:

```
assert: installPart({ location: "installed", currentAircraftId: undefined }) throws
assert: removePart({ location: "inventory", currentAircraftId: [id] }) throws  
assert: installPart({ currentAircraftId: [id], currentEngineId: [id] }) throws
```

None of these would currently be caught by the schema.

---

## 4. Nullable Fields That Should Be Required

I'm defining "should be required" as: the field is optional in the schema, but the system cannot function correctly without it in the context where it's used, and leaving it null creates either a compliance gap or an untestable state.

### 4.1 `technicians.userId` — Optional, But Key for Auth Chain

```typescript
userId: v.optional(v.string()),  // Clerk user ID (nullable)
```

This is documented as intentionally nullable: "tech may not have system account." Understood. But a technician without a `userId` cannot be verified as actively authenticated when they sign a maintenance record. The `signatureAuthEventId` on maintenance records is a Clerk authentication event — if the technician has no Clerk account, what populates that field?

If `userId` is null and the technician signs a record, the audit chain breaks. The signed maintenance record will have a `signatureAuthEventId` that belongs to... someone. Not necessarily the technician.

**Requirement:** Either `userId` must be set before a technician can perform any signing action, or there must be an explicit "proxy signing" mechanism with full audit documentation. The current schema allows a signature without a linked identity. That's not testable as a security control.

### 4.2 `workOrders.closedAt` and `closedByUserId` — Both Optional

```typescript
closedAt: v.optional(v.number()),
closedByUserId: v.optional(v.string()),
```

A work order with `status: "closed"` and no `closedAt` is internally inconsistent. The closed status implies a closure event; the absence of `closedAt` means I can't tell when it happened. This is not just a UX issue — it affects the 2-year retention clock for work orders under 14 CFR 145.219.

**Test case I cannot currently write:** "When a work order transitions to closed, assert that `closedAt` is set." Currently, a work order can be `status: "closed"` with `closedAt: undefined` and the schema accepts it. The mutation must set `closedAt` at the transition point, and the test must verify it.

Same for `closedByUserId`.

### 4.3 `maintenanceRecords.returnToServiceStatement` — Optional When It Shouldn't Be

```typescript
returnedToService: v.boolean(),
returnToServiceStatement: v.optional(v.string()),
```

Per the regulatory requirements (Section 8, Required Fields, item 7): the return to service statement is required in the maintenance record. It's listed as required, not conditional. But in the schema, it's `v.optional()`.

If `returnedToService == true`, `returnToServiceStatement` must be present. If `returnedToService == false` (aircraft not returned), the statement is replaced by a discrepancy list. In neither case is the statement meaningfully optional.

**Fix:** Either make `returnToServiceStatement` required (non-optional), or enforce at the mutation layer that it's populated in all cases. Test both branches:
- Aircraft returned to service → statement must be present
- Aircraft not returned → statement can describe the reason for non-return, but the discrepancy list is also required

### 4.4 `discrepancies.correctiveAction` — Optional When Disposition is Corrected

```typescript
disposition: v.optional(discrepancyDisposition),
correctiveAction: v.optional(v.string()),
correctiveMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),
```

When `disposition == "corrected"`, both `correctiveAction` and `correctiveMaintenanceRecordId` should be required. A corrected discrepancy with no description of what was done and no link to the maintenance record proving it was done is a phantom correction.

This is the kind of data state that passes all schema validation, appears compliant in the UI, and fails the FAA inspection when an inspector asks "show me the maintenance record for this correction" and the system has nothing to show.

**Test:** Create a discrepancy, set `disposition: "corrected"`, leave `correctiveMaintenanceRecordId` null. Assert this is rejected by the disposition mutation. Currently it would not be.

### 4.5 `adCompliance.applicabilityDeterminedById` — Optional When Applicable is True

```typescript
applicable: v.boolean(),
applicabilityDeterminationNotes: v.optional(v.string()),
applicabilityDeterminedById: v.optional(v.id("technicians")),
applicabilityDeterminationDate: v.optional(v.number()),
```

If `applicable == true`, someone must have made that determination. That person must be on record. `applicabilityDeterminedById` and `applicabilityDeterminationDate` being optional means we can have a compliance record that says "yes, this AD applies to this aircraft" without any attribution for that determination. An FAA inspector will ask who made the call. We need to be able to answer.

**Requirement:** When `applicable` is set to `true` or `false`, `applicabilityDeterminedById` and `applicabilityDeterminationDate` must be populated. The mutation must enforce this.

---

## 5. Enum Coverage for Status Fields

### 5.1 `workOrderStatus` — Missing States

The work order lifecycle enum:

```typescript
const workOrderStatus = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("pending_inspection"),
  v.literal("pending_signoff"),
  v.literal("open_discrepancies"),
  v.literal("closed"),
  v.literal("cancelled")
);
```

The architecture document's lifecycle diagram shows a distinct `open_discrepancies` path back to `pending_signoff`. That's covered. But there's no state for:

**`voided`** — A work order that was created in error and must be removed from active tracking without being treated as completed or cancelled. "Cancelled" implies the customer cancelled; "voided" implies an administrative error. These are different audit events.

**`on_hold`** — A work order paused pending parts availability or customer authorization. The `in_progress` → `on_hold` transition is common in MRO shops (waiting for a part to arrive from a supplier). Without this state, all work orders appear `in_progress` even when nothing is actively happening on them, which skews shop productivity metrics and AOG prioritization.

This is not a compliance blocker, but it's a data quality issue that will create test noise: a test asserting "all `in_progress` work orders have had activity in the last 48 hours" will produce false positives for work orders waiting on parts.

### 5.2 `aircraftStatus` — `unknown` Status Is Untestable

```typescript
const aircraftStatus = v.union(
  v.literal("airworthy"),
  v.literal("out_of_service"),
  v.literal("in_maintenance"),
  v.literal("destroyed"),
  v.literal("sold"),
  v.literal("unknown")
);
```

`unknown` is a valid state value, which means tests for behavior conditional on aircraft status must handle it. What does the system do when an aircraft is `unknown`? Can a work order be opened against an `unknown`-status aircraft? Can it be returned to service?

The expected behavior is probably "yes, work orders can be opened; an unknown-status aircraft is likely just one we don't have full records for." But if that's not documented, I'll write tests that don't match the actual mutation behavior.

**Recommendation:** Document the permitted work order types for each aircraft status value. This becomes the test matrix input.

### 5.3 `taskCards.status` — Missing `incomplete_na_steps`

The architecture document (Entity 6) lists `status: incomplete_na_steps` as a valid state:

> `status: enum — not_started, in_progress, complete, incomplete_na_steps`

But the schema has:

```typescript
status: v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("complete"),
  v.literal("voided")
),
```

The schema drops `incomplete_na_steps` and adds `voided` instead. These are different semantic choices. `incomplete_na_steps` is a useful intermediate state — the task card is done but has steps marked N/A that require review before completion is confirmed. `voided` is a different concept entirely (task card cancelled).

The schema and architecture document disagree here. Both cannot be right. The discrepancy means:
1. Either the test matrix based on the architecture doc will test for a state that doesn't exist in the schema
2. Or the test matrix based on the schema will miss the `incomplete_na_steps` workflow entirely

**This must be resolved before any task card mutation is written.**

### 5.4 `discrepancyDisposition` — No `no_fault_found_pilot_report` Distinction

```typescript
const discrepancyDisposition = v.union(
  v.literal("corrected"),
  v.literal("deferred_mel"),
  v.literal("deferred_grounded"),
  v.literal("no_fault_found"),
  v.literal("pending")
);
```

`no_fault_found` covers the case where a discrepancy was investigated and found to be nothing. But there's a regulatory distinction between:
- `no_fault_found` after mechanic investigation
- `no_fault_found` after a pilot report that couldn't be reproduced

The regulatory requirements document (Section 10.1) notes that pilot-reported squawks and discrepancies are separate concepts. A pilot squawk that gets dispositioned as `no_fault_found` should carry that provenance. A mechanic-found discrepancy that turns out to be nothing is a different paper trail.

This is currently unrepresentable without using `foundDuring: "pilot_report"` as the distinguishing field — but the combination `foundDuring: "pilot_report"` + `disposition: "no_fault_found"` isn't validated or tested as a workflow.

Consider adding `no_fault_found_could_not_reproduce` as a distinct disposition for pilot reports. The regulatory implication is different: repeated "could not reproduce" dispositions for the same reported symptom is a pattern worth flagging.

---

## 6. Index Strategy — Query Performance Analysis

### 6.1 Missing Indexes for Foreseeable High-Volume Queries

**`maintenanceRecords` — no index on `completionDate` at the organization level.**

The existing index is:

```typescript
.index("by_completion_date", ["aircraftId", "completionDate"])
```

This supports per-aircraft history sorted by date. But a common shop query is "all maintenance records completed in the last 30 days for this organization" — for billing reconciliation, for FAA inspection prep, for production reporting. The current index requires knowing the aircraft IDs first, which means either a table scan or a pre-query to get all aircraft for the organization.

**Add:** `.index("by_org_completion_date", ["organizationId", "completionDate"])`

**`taskCards` — no index on `assignedToTechnicianId` across organizations.**

```typescript
.index("by_assigned", ["assignedToTechnicianId", "status"])
```

This exists and is good for a technician's personal worklist. But there's no way to query "all task cards in organization X assigned to technician Y with status in_progress" without a separate filtering step, because the index starts with `assignedToTechnicianId` and doesn't include `organizationId`.

This matters because technicians can be shared across organizations (or the same technician ID could work at multiple facilities). An org-scoped assignee index would be:

`.index("by_org_assigned", ["organizationId", "assignedToTechnicianId", "status"])`

**`discrepancies` — no index on `melExpiryDate` that includes `organizationId`.**

```typescript
.index("by_mel_expiry", ["melExpiryDate"])
```

This index covers MEL expiry alerting globally. But for a multi-tenant system, the practical alerting query is "all MEL items expiring in the next 7 days for organization X." The current index returns results across all organizations and requires client-side filtering by organization. That's a confidentiality issue at scale — the query hits the index, returns records for all organizations, and the application filters to the right org. That's not how multi-tenant queries should work.

**Add:** `.index("by_org_mel_expiry", ["organizationId", "melExpiryDate"])`

**`adCompliance` — `by_next_due_date` is global, same issue.**

```typescript
.index("by_next_due_date", ["nextDueDate"])
```

Same problem as `by_mel_expiry`. AD overdue alerting at the organization level requires org context in the index.

**Add:** `.index("by_org_next_due_date", ["organizationId", "nextDueDate"])`

### 6.2 Index Covering Immutable Records for FAA Inspection Queries

An FAA inspection may request: "All maintenance records for aircraft [serial] from [date range]."

The existing index covers this:

```typescript
.index("by_completion_date", ["aircraftId", "completionDate"])
```

Good. This supports the primary aircraft-history query pattern. The `by_aircraft_sequence` index:

```typescript
.index("by_aircraft_sequence", ["aircraftId", "sequenceNumber"])
```

also supports logbook-ordered retrieval. Both are correct.

However, `inspectionRecords` has a different index:

```typescript
.index("by_type_date", ["aircraftId", "inspectionType", "inspectionDate"])
```

There's no equivalent `by_aircraft_date` index on `inspectionRecords` that allows querying all inspection records for an aircraft in date order regardless of type. If an inspector wants to see all inspections for aircraft X in chronological order, the current index requires knowing the inspection type first.

**Add to `inspectionRecords`:** `.index("by_aircraft_date", ["aircraftId", "inspectionDate"])`

### 6.3 The `auditLog` Index Gap

```typescript
.index("by_record", ["tableName", "recordId"])
.index("by_organization", ["organizationId", "timestamp"])
.index("by_user", ["userId", "timestamp"])
.index("by_event_type", ["eventType", "timestamp"])
.index("by_timestamp", ["timestamp"])
```

There's no compound index for "all events of a specific type for a specific organization in a date range." The most common compliance audit query is: "Show me all `record_signed` events for organization X in the past 90 days." The current indexes require:

- Using `by_event_type` → filters to all `record_signed` across all orgs → filter by org in application
- Or using `by_organization` → filters to all events for org → filter by event type in application

Neither is efficient at scale. A maintenance organization with 500 sign events per month generates 6,000 audit events per year. Cross-filtering in application code is manageable at that scale, but it doesn't scale to enterprise shops.

**Add:** `.index("by_org_event_type", ["organizationId", "eventType", "timestamp"])`

### 6.4 `certificates` — IA Expiry Index Semantics

```typescript
.index("by_ia_expiry", ["hasIaAuthorization", "iaExpiryDate"])
```

This index allows querying all certificates where `hasIaAuthorization == true` ordered by `iaExpiryDate`. This is the right structure for IA renewal alerting. 

But notice: the index starts with `hasIaAuthorization` which is a boolean (only two values). In Convex's index implementation, low-cardinality leading fields mean the index may not be as selective as we'd want. All A&P-without-IA certificates have `hasIaAuthorization: false` and will appear in the same "bucket." The effective query should be:

```
{ hasIaAuthorization: true, iaExpiryDate < [alert threshold] }
```

This will work with the current index structure, but verify with Devraj that Convex's range query behavior on the second field functions as expected when the first field is a boolean constant. This is an implementation detail, not a schema issue — but it's worth validating before the IA renewal alerting feature is built, or we'll have a silent performance regression at scale.

---

## 7. Additional QA Observations

### 7.1 `customers.aircraftIds` — Array on the Wrong Side

```typescript
customers: defineTable({
  aircraftIds: v.array(v.id("aircraft")),
  ...
})
```

`customers` holds an array of `aircraftIds`. This is a document-embedded array relationship. The problem: adding a new aircraft to a customer requires updating the customer document (appending to `aircraftIds`). If two aircraft are simultaneously associated with the same customer — say, during a fleet handover — you have a write conflict on the same customer document.

Additionally, querying "which customer owns this aircraft?" requires either reading the aircraft's `operatingOrganizationId` (which links to `organizations`, not `customers`) or scanning all customers for the aircraft ID in their `aircraftIds` array. Neither is indexed.

**Recommendation:** Invert the relationship. Add `customerId: v.optional(v.id("customers"))` to the `aircraft` table and remove `aircraftIds` from `customers`. Then index aircraft by customer:

```typescript
.index("by_customer", ["customerId"])
```

This is a structural data model issue that will cause fan-out write conflicts and unindexed lookups in production.

### 7.2 No Table for Squawk Records

The `workOrders` table has:

```typescript
squawks: v.optional(v.string()),
```

Pilot squawks as a free-text field. This isn't testable as a workflow. I can't write a test that says "squawk S was addressed by discrepancy D" because there's no structured squawk entity. The entire squawk-to-discrepancy traceability chain is missing. Before any feature work on the intake workflow, this needs to be modeled as a table.

### 7.3 `eightOneThirtyRecords` — `isSuspect` Flag Without Workflow

```typescript
isSuspect: v.boolean(),
suspectReason: v.optional(v.string()),
```

The suspect flag exists. But there's no status field tracking what happens after something is flagged as suspect. Options that matter:
- Under investigation
- Reported to FAA (per Order 8120.11)
- Cleared — reinstated as serviceable
- Quarantined permanently

Without this, `isSuspect: true` is a terminal state. Once flagged, I can't write a test for "suspected unapproved part was investigated and cleared" because the schema has no field for that outcome.

**Add:** `suspectStatus: v.optional(v.union(v.literal("under_investigation"), v.literal("reported_to_faa"), v.literal("cleared"), v.literal("confirmed_unapproved")))` to `eightOneThirtyRecords`.

---

## 8. Blockers — Must Fix Before Feature Development

These items block any feature development because they represent either untestable invariants, schema-level contradictions, or compliance-critical data integrity gaps. Writing mutations against these before they're resolved will produce mutations with unverifiable behavior.

---

**BLOCKER-QA-001: `taskCards.status` enum disagrees with architecture document.**

Schema has `voided`. Architecture document has `incomplete_na_steps`. Both cannot be correct. Until this is resolved, the task card workflow cannot be tested end-to-end and no task card mutations should be written.

Resolution needed: Rafael and Devraj align on the enum values. Update either the schema or the architecture document. Don't let this live as an undocumented disagreement between two source-of-truth documents.

---

**BLOCKER-QA-002: Embedded `steps` array in `taskCards` has inadequate audit granularity.**

The audit log will record "taskCard updated" when a step is signed. It will not record *which step* was signed, *by whom*, and *at what time* — without extracting that from the entire updated document's diff. This is insufficient for compliance-level audit trails and insufficient for testing individual step sign-off events.

Resolution needed: Extract `taskCardSteps` into its own table before any signing mutation is written. Devraj already identified this issue in his notes. This is the time to fix it.

---

**BLOCKER-QA-003: Three boolean+conditional-required field pairs are not enforced.**

- `isLifeLimited: true` + both `lifeLimitHours` and `lifeLimitCycles` null → accepted by schema
- `hasShelfLifeLimit: true` + `shelfLifeLimitDate` null → accepted by schema
- `hasIaAuthorization: true` + `iaExpiryDate` null → accepted by schema

All three allow invalid states that will cause silent failures in life-limit tracking, shelf-life alerting, and IA currency checking. Document and enforce these in mutations before any related feature is built.

---

**BLOCKER-QA-004: No enforced uniqueness on `workOrders.workOrderNumber` within an organization.**

The index exists. The enforcement does not. Duplicate work order numbers in a regulated environment are a chain-of-custody failure. The mutation must perform a uniqueness check before insert, and the test must verify the check fires.

---

**BLOCKER-QA-005: `customers.aircraftIds` inverted relationship will cause write conflicts and unindexed lookups.**

Move `customerId` to the `aircraft` table and add an index. The current structure will produce fan-out write conflicts under normal shop load (multiple aircraft arriving from the same customer simultaneously). Fix before the customer management feature is built.

---

**BLOCKER-QA-006: `corrective_action` and `correctiveMaintenanceRecordId` not enforced when `disposition == "corrected"`.**

A discrepancy can be dispositioned as "corrected" with no corrective action description and no link to the maintenance record proving it was corrected. This is a silent compliance failure. The disposition mutation must enforce both fields before closing any discrepancy as corrected. Test case must verify rejection without both fields.

---

**BLOCKER-QA-007: `signatureAuthEventId` has no defined specification.**

The field exists in three tables. What it contains is undefined in the schema document and not specified in any referenced technical requirement. Until there is a documented spec for what this field holds and how it is verified, no signing mutation can be written, no signing test can be validated for correctness, and no electronic signature produced by this system is verifiable under AC 43-9C. This is both a QA blocker and Marcus's BLOCKER-REG-005.

---

**BLOCKER-QA-008: `melDeferralDate` is missing, making MEL expiry computation untestable.**

`melExpiryDate` is stored but its source (the deferral date) is not. This makes it impossible to write a test asserting the computed expiry is correct. Add `melDeferralDate` to `discrepancies` before any MEL workflow is implemented.

---

*Cilla Oduya*  
*QA Lead, Athelon*  
*Day 4, Phase 1*

*Cc: Devraj Anand, Rafael Mendoza, Marcus Webb*  
*Test cases referenced in this document will be added to the formal test matrix pending resolution of the blockers above.*
