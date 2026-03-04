# Athelon — Maintenance Record Mutation Implementation Spec
**Document Type:** Phase 5 Alpha — Backend Implementation Specification
**Author:** Devraj Anand (Backend Engineer, Convex)
**Regulatory Review:** Marcus Webb — citations inline throughout
**Compliance Advisors:** Carla Ostrowski (DOM), Dale Renfrow (IA)
**QA Contract:** Cilla Oduya — test case references at each mutation
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 5 alpha implementation begins against this document
**Schema Basis:** convex-schema-v2.md (FROZEN) + Phase 5 schema extension (Section 0 below)
**Depends On:** mutation-implementation.md §5 (six-check consumption), compliance-validation.md
  RQ-01 through RQ-06, requirements-synthesis.md embedded interview findings

---

## Devraj's Preamble

The maintenance record is the anchor document of the entire Athelon system. Every other mutation I
have written — `closeWorkOrder`, `authorizeReturnToService`, the AD compliance chain, dual sign-off
on task card steps — produces its legal weight by pointing back to a maintenance record or depending
on one existing. This is the record Carla Ostrowski exports at 6 AM the morning after a midnight
sign-off to verify it was captured correctly. This is what Dale Renfrow's certificate number appears
on. This is what an FAA inspector pulls when they walk in unannounced.

I am not treating this as a CRUD operation.

Four implementation rules govern this document and are non-negotiable. They are the same four rules
from remaining-mutations.md, stated here because a Phase 5 engineer who hasn't read that document
will read this one.

**Rule 1 — Auth wrapper is first, always.** `requireOrgMembership(ctx, minRole)` is the first
statement in every mutation. `orgId` and `callerUserId` are derived from the JWT. The client never
passes `organizationId` or `callerUserId` as mutation arguments.

**Rule 2 — Guards are ordered and the order is not negotiable.** Auth → document existence →
state transition validity → business logic. Do not reorder. Reordering wastes database reads on
requests that will fail auth.

**Rule 3 — The six-check signatureAuthEvent consumption sequence from mutation-implementation.md §5
applies to `signMaintenanceRecord` and `createCorrectionRecord` without exception.** Referenced by
name. Do not inline a partial version.

**Rule 4 — Audit log writes are transactional.** The `auditLog` insert is part of the behavioral
contract. It occurs within the same Convex mutation transaction as the primary write. If the audit
write fails, the mutation fails. There is no partial state.

One additional rule specific to this document:

**Rule 5 — Immutability is enforced at the mutation layer, not at the schema layer.** Convex does
not support schema-level write constraints on existing records. "Immutable" means: the
`signMaintenanceRecord` mutation checks `record.status === "draft"` before proceeding, and there
is no `updateMaintenanceRecord` mutation. The absence of an update mutation is itself a contract.
Do not create one. Cilla's test matrix includes a check that no such mutation path exists.

---

## Section 0: Required Schema Extension

The existing `maintenanceRecords` schema in convex-schema-v2.md defines `signatureHash: v.string()`
and `signatureAuthEventId: v.id("signatureAuthEvents")` as required (non-optional) fields. This is
structurally incompatible with a two-phase create-then-sign design. Phase 5 requires the following
additive extension to `maintenanceRecords` before these mutations are implemented.

**Changes to `maintenanceRecords` table (additive — existing documents are unaffected):**

```typescript
// Add status field to distinguish draft from signed records.
// "draft" = content entered, not yet signed; "signed" = immutable.
// Existing documents without this field should be treated as "signed" in
// all mutation guards (they were created under the old single-step schema).
status: v.union(v.literal("draft"), v.literal("signed")),

// Make all signature-specific fields optional at schema level.
// They are required-under-conditions at the mutation layer:
//   signMaintenanceRecord enforces all five are set before insert.
//   createMaintenanceRecord leaves all five absent (undefined).
signatureHash: v.optional(v.string()),
signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
signatureTimestamp: v.optional(v.number()),
signingTechnicianId: v.optional(v.id("technicians")),
signingTechnicianLegalName: v.optional(v.string()),
signingTechnicianCertNumber: v.optional(v.string()),
signingTechnicianCertType: v.optional(certificateType),
signingTechnicianRatingsExercised: v.optional(ratingsExercised),

// hashAlgorithmVersion — required per compliance-validation.md §4.3 condition 1.
// Documents from the old schema that lack this field can only be verified by
// assuming sha256-v1 (documented in the verification function's fallback logic).
hashAlgorithmVersion: v.optional(v.string()),  // "sha256-v1" on all Phase 5 records
```

**New index:**
```
.index("by_status", ["organizationId", "status"])
```
Purpose: DOM dashboard query for unsigned draft records. Carla needs to see unsigned records that
are awaiting her IA sign-off, surfaced separately from the signed record list.

**Note:** `returnedToService`, `returnToServiceStatement`, `technicians`, `discrepanciesFound`,
`discrepanciesCorrected`, `discrepancyListProvided`, `completionDate`, `workPerformed`,
`approvedDataReference`, `partsReplaced`, `aircraftTotalTimeHours`, and all denormalized aircraft
fields remain unchanged from schema-v2 — not optional, populated at `createMaintenanceRecord` time.

---

## Section 1: `createMaintenanceRecord`

**File:** `convex/mutations/maintenanceRecords/createMaintenanceRecord.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`
**Rationale:** Any A&P on the org can create a draft record. IA-level auth is not required at the
creation phase — it is required at signing. A technician who performs work should be able to document
it without waiting for sign-off authorization. Carla's requirement is that the record be signed before
RTS, not before creation.
**Phase in SignOffFlow:** This is the "submit" action of the record entry form — before the PIN step.
The client calls this after the mechanic has reviewed the content summary and before they enter
credentials.

**Args:**
```typescript
{
  workOrderId: v.id("workOrders"),
  recordType: v.union(
    v.literal("maintenance_43_9"),
    v.literal("inspection_43_11")
  ),
  // "correction" is NOT a valid recordType here. Use createCorrectionRecord.

  workPerformed: v.string(),
  approvedDataReference: v.string(),
  partsReplaced: v.array(embeddedPartRecord),
  completionDate: v.number(),         // Unix ms — date work was COMPLETED, not today
  aircraftTotalTimeHours: v.number(), // Must match WO's aircraftTotalTimeAtClose
  returnedToService: v.boolean(),
  returnToServiceStatement: v.optional(v.string()),
  discrepanciesFound: v.array(v.id("discrepancies")),
  discrepanciesCorrected: v.array(v.id("discrepancies")),
  discrepancyListProvided: v.optional(v.boolean()),
}
```

**Guard Sequence (ordered — 8 guards):**

```typescript
const { orgId, identity } = await requireOrgMembership(ctx, "amt");
const now = Date.now();
const callerUserId = identity.subject;

// G1 — EXISTENCE AND ORG ISOLATION
const wo = await ctx.db.get(args.workOrderId);
if (!wo) throw new ConvexError({ code: "WO_NOT_FOUND" });
if (wo.organizationId !== orgId)
  throw new ConvexError({ code: "WO_ORG_MISMATCH" });

// G2 — WORK ORDER STATE GUARD
// Records may only be created against open or in-progress work orders.
// Creating a record against a closed WO would circumvent the immutable close record.
// Carla's invariant: the paperwork closes with the job.
const allowedWoStatuses = ["open", "in_progress", "pending_inspection", "pending_signoff"];
if (!allowedWoStatuses.includes(wo.status))
  throw new ConvexError({ code: "MR_WO_WRONG_STATUS",
    current: wo.status, allowed: allowedWoStatuses,
    message: "Maintenance records cannot be added to a closed, voided, or cancelled work order." });

// G3 — MINIMUM CONTENT ENFORCEMENT (CONTENT GUARDS — see Section 6 for full treatment)
// G3a: workPerformed minimum character floor (AC 43-9C content requirement).
// 50 chars is the floor. The real standard is structured content — see Section 6.
// A 50-char check catches intentional evasion (entering "done" or a series of spaces).
// It does not catch a 55-char entry that says nothing. See Section 6 for why we enforce
// beyond character count and what Marcus's full content standard requires.
if (!args.workPerformed || args.workPerformed.trim().length < 50)
  throw new ConvexError({ code: "MR_WORK_PERFORMED_TOO_SHORT",
    length: args.workPerformed?.trim().length ?? 0, required: 50,
    message: "Work performed description must be at least 50 characters. " +
             "Per AC 43-9C, the entry must describe: what was done, " +
             "what reference was used, and the date. A brief entry does " +
             "not satisfy 14 CFR §43.9(a)(1)." });

// G3b: approvedDataReference must be non-empty and non-whitespace.
// Per 14 CFR §43.9(a)(1): work must be performed "in accordance with" an approved standard.
// An empty reference field is a complete regulatory failure — not a soft warning.
// Rachel Kwon's requirement from requirements-synthesis.md: "per AMM" is not a reference.
if (!args.approvedDataReference || !args.approvedDataReference.trim())
  throw new ConvexError({ code: "MR_APPROVED_DATA_REF_EMPTY",
    message: "approvedDataReference must not be empty. " +
             "Per 14 CFR §43.9(a)(1), maintenance must be performed in accordance with " +
             "applicable manufacturer or FAA-approved data. Cite the specific document, " +
             "chapter, section, and revision. 'Per AMM' is not a reference — " +
             "it is an abbreviation for 'I don't remember' (requirements-synthesis.md §Part 1)." });

// G3c: If recordType is "inspection_43_11", enforce the structured inspection entry
// requirement under 14 CFR §43.11(a). The work performed field must describe the
// type of inspection, not just the maintenance action.
if (args.recordType === "inspection_43_11" && args.workPerformed.trim().length < 100)
  throw new ConvexError({ code: "MR_INSPECTION_ENTRY_TOO_SHORT",
    message: "Inspection records under 14 CFR §43.11 require a more complete entry " +
             "than a routine maintenance record. 100-character minimum for inspection_43_11." });

// G4 — AIRCRAFT TOTAL TIME CONSISTENCY
// The aircraftTotalTimeHours in the record must match the WO's aircraftTotalTimeAtClose.
// This invariant is documented in schema-v2 and is safety-critical — a maintenance record
// with wrong aircraft time creates a false basis for any subsequent TT-based compliance check.
// Source: aircraftTotalTimeAtClose on the work order, not independent user input.
if (wo.aircraftTotalTimeAtClose == null)
  throw new ConvexError({ code: "MR_WO_NO_CLOSE_TIME",
    message: "Work order has no aircraftTotalTimeAtClose recorded. " +
             "Set aircraft total time on the work order before creating a maintenance record." });
if (args.aircraftTotalTimeHours !== wo.aircraftTotalTimeAtClose)
  throw new ConvexError({ code: "MR_AIRCRAFT_TIME_MISMATCH",
    submitted: args.aircraftTotalTimeHours, recorded: wo.aircraftTotalTimeAtClose,
    message: "aircraftTotalTimeHours must equal the work order's aircraftTotalTimeAtClose. " +
             "Source this value from the work order; do not accept independent user input." });

// G5 — RETURN TO SERVICE STATEMENT GUARD
// If returnedToService == true, returnToServiceStatement must be set.
// Per schema-v2 invariant (Cilla 4.3). This is also Marcus's §43.9 completeness check.
if (args.returnedToService && (!args.returnToServiceStatement?.trim()))
  throw new ConvexError({ code: "MR_RTS_STATEMENT_REQUIRED",
    message: "returnToServiceStatement is required when returnedToService is true. " +
             "Per 14 CFR §43.9(a)(1), the record must identify the nature of the work." });

// G6 — DISCREPANCY CROSS-REFERENCE VALIDATION
// Any discrepancy IDs in discrepanciesCorrected must belong to this work order.
// This guard prevents a mechanic from closing a discrepancy on the wrong aircraft.
for (const discId of [...args.discrepanciesCorrected, ...args.discrepanciesFound]) {
  const disc = await ctx.db.get(discId);
  if (!disc) throw new ConvexError({ code: "MR_DISCREPANCY_NOT_FOUND", discrepancyId: discId });
  if (disc.workOrderId !== args.workOrderId)
    throw new ConvexError({ code: "MR_DISCREPANCY_WRONG_WO",
      discrepancyId: discId, discWoId: disc.workOrderId, recordWoId: args.workOrderId });
}

// G7 — CALLER TECHNICIAN MUST EXIST AND BE ACTIVE
// Fetch the caller's technician record for denormalization into the record.
// The technician's name is captured here as a snapshot — changes after the fact
// do not alter the record (Carla's snapshot requirement, dom-profile.md).
const tech = await ctx.db.query("technicians")
  .withIndex("by_user", q => q.eq("userId", callerUserId)).first();
if (!tech || tech.status !== "active" || tech.organizationId !== orgId)
  throw new ConvexError({ code: "MR_TECHNICIAN_NOT_ACTIVE",
    message: "Caller must have an active technician record in this organization." });

// G8 — ORGANIZATION CERTIFICATE NUMBER (Marcus 4.2 — 14 CFR 43.9 Part 145 requirement)
// If the organization has a part145CertificateNumber, the record must capture it.
// This is a schema-v2 invariant: non-null for Part 145 organizations.
const org = await ctx.db.get(orgId);
if (!org) throw new ConvexError({ code: "ORG_NOT_FOUND" });
const orgCertNumber = org.part145CertificateNumber ?? null;
if (org.part145CertificateNumber && !orgCertNumber)
  throw new ConvexError({ code: "MR_ORG_CERT_NUMBER_MISSING",
    message: "Part 145 organization must have a certificate number on file." });
```

**Execution Sequence (after all 8 guards pass):**

```typescript
// Step 1 — Fetch aircraft for denormalized snapshot fields.
// These fields are written at creation time and never updated. Per compliance-validation.md §4.1:
// aircraft identification is denormalized into the record, not referenced by FK alone.
// If the aircraft record is later amended (tail number change, etc.), this record
// still reflects the aircraft as it was identified at the time of work.
const aircraft = await ctx.db.get(wo.aircraftId);
if (!aircraft) throw new ConvexError({ code: "MR_AIRCRAFT_NOT_FOUND" });

// Step 2 — Compute next sequence number for this aircraft.
// Sequence number is per-aircraft, not per-work-order (logbook entry numbering).
// Query for the highest existing sequenceNumber on this aircraft's records.
// This is a serial number against aircraft.aircraftId, used for the
// logbook reference that an inspector cross-references against the paper logbook.
const lastRecord = await ctx.db.query("maintenanceRecords")
  .withIndex("by_aircraft_sequence", q => q.eq("aircraftId", wo.aircraftId))
  .order("desc").first();
const sequenceNumber = (lastRecord?.sequenceNumber ?? 0) + 1;

// Step 3 — Insert draft record.
// status: "draft" — this record is mutable until signMaintenanceRecord is called.
// All signature fields are absent (undefined) — they are written atomically in signMaintenanceRecord.
const recordId = await ctx.db.insert("maintenanceRecords", {
  status: "draft",
  recordType: args.recordType,
  aircraftId: wo.aircraftId,
  aircraftMake: aircraft.make,
  aircraftModel: aircraft.model,
  aircraftSerialNumber: aircraft.serialNumber,
  aircraftRegistration: aircraft.registration,       // N-number snapshot
  aircraftTotalTimeHours: args.aircraftTotalTimeHours,
  workOrderId: args.workOrderId,
  organizationId: orgId,
  organizationCertificateNumber: orgCertNumber,
  sequenceNumber,
  workPerformed: args.workPerformed.trim(),
  approvedDataReference: args.approvedDataReference.trim(),
  partsReplaced: args.partsReplaced,
  completionDate: args.completionDate,
  technicians: [],                // Populated at sign time; see signMaintenanceRecord
  returnedToService: args.returnedToService,
  returnToServiceStatement: args.returnToServiceStatement?.trim() ?? null,
  discrepanciesFound: args.discrepanciesFound,
  discrepanciesCorrected: args.discrepanciesCorrected,
  discrepancyListProvided: args.discrepancyListProvided ?? null,
  createdAt: now,
  // No signatureHash, signatureAuthEventId, signatureTimestamp — not signed yet.
  // No updatedAt — this field does not exist on maintenanceRecords per schema-v2.
  //   Note: "draft" records are an exception to the immutability of the pre-5 schema
  //   schema model. Only signMaintenanceRecord may write to a draft record.
  //   See Rule 5 in the preamble.
});

// Step 4 — Audit log write.
// eventType "record_created" per auditLog schema. Records the creation event independently
// from the signing event. These are two distinct timestamps: Dale's requirement from
// ia-profile.md ("two independent data points"). An inspector can see when the record
// was entered and when it was signed.
await ctx.db.insert("auditLog", {
  organizationId: orgId,
  eventType: "record_created",
  tableName: "maintenanceRecords",
  recordId,
  userId: callerUserId,
  technicianId: tech._id,
  timestamp: now,
  notes: `Maintenance record created. WO: ${args.workOrderId}. ` +
         `Type: ${args.recordType}. Aircraft: ${aircraft.registration}. ` +
         `Seq: ${sequenceNumber}. Status: draft. Not yet signed.`,
});

return { recordId, sequenceNumber };
```

**Error Code Registry — `createMaintenanceRecord`:**

| Code | Condition |
|---|---|
| `WO_NOT_FOUND` | Work order not found |
| `WO_ORG_MISMATCH` | Work order belongs to a different org |
| `MR_WO_WRONG_STATUS` | WO is closed/voided/cancelled |
| `MR_WORK_PERFORMED_TOO_SHORT` | `workPerformed.trim().length < 50` |
| `MR_APPROVED_DATA_REF_EMPTY` | `approvedDataReference` empty or whitespace |
| `MR_INSPECTION_ENTRY_TOO_SHORT` | `inspection_43_11` record, `workPerformed < 100` chars |
| `MR_WO_NO_CLOSE_TIME` | `aircraftTotalTimeAtClose` not set on WO |
| `MR_AIRCRAFT_TIME_MISMATCH` | Submitted TT ≠ WO's `aircraftTotalTimeAtClose` |
| `MR_RTS_STATEMENT_REQUIRED` | `returnedToService: true` but no statement |
| `MR_DISCREPANCY_NOT_FOUND` | Discrepancy ID not found |
| `MR_DISCREPANCY_WRONG_WO` | Discrepancy belongs to a different work order |
| `MR_TECHNICIAN_NOT_ACTIVE` | Caller has no active technician record |
| `MR_ORG_CERT_NUMBER_MISSING` | Part 145 org missing certificate number |
| `MR_AIRCRAFT_NOT_FOUND` | Aircraft record not found |

**Cilla's expected test cases:**
- MR-CREATE-01: `workPerformed.trim().length === 49` → `MR_WORK_PERFORMED_TOO_SHORT`
- MR-CREATE-02: `workPerformed.trim().length === 50` → succeeds (floor, not standard)
- MR-CREATE-03: `approvedDataReference` is "   " (whitespace) → `MR_APPROVED_DATA_REF_EMPTY`
- MR-CREATE-04: `aircraftTotalTimeHours` off by 0.1 from WO close time → `MR_AIRCRAFT_TIME_MISMATCH`
- MR-CREATE-05: `returnedToService: true`, no statement → `MR_RTS_STATEMENT_REQUIRED`
- MR-CREATE-06: `discrepanciesCorrected` includes discrepancy on a different WO → `MR_DISCREPANCY_WRONG_WO`
- MR-CREATE-07: WO in "closed" status → `MR_WO_WRONG_STATUS`
- MR-CREATE-08: `inspection_43_11` type with 55-char workPerformed → `MR_INSPECTION_ENTRY_TOO_SHORT`
- MR-CREATE-09: Success → status "draft", no signatureHash in returned record
- MR-CREATE-10: sequenceNumber increments correctly across multiple records on same aircraft

---

## Section 2: `signMaintenanceRecord`

**File:** `convex/mutations/maintenanceRecords/signMaintenanceRecord.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`
**Rationale:** Any A&P may sign a routine maintenance record. IA-level auth is separately enforced
for `inspection_43_11` records (G3 below). This mirrors the real regulatory structure: an A&P signs
routine maintenance; an IA signs inspection records. Dale Renfrow's requirement from ia-profile.md
is that the IA sign-off be distinct and deliberate — and it is: a different auth level is required.
**Per-signature enforcement (Dale's requirement):** This mutation consumes a signatureAuthEvent.
One auth event per signing event. No session carries across signatures. The auth event is created
by the client's call to the signature auth endpoint immediately before this mutation is called —
not during the session open.

**Args:**
```typescript
{
  recordId: v.id("maintenanceRecords"),
  signatureAuthEventId: v.id("signatureAuthEvents"),
  ratingsExercised: v.array(v.union(
    v.literal("airframe"), v.literal("powerplant"),
    v.literal("ia"), v.literal("none")
  )),
  techniciansWhoPerformedWork: v.optional(v.array(v.id("technicians"))),
  // Multi-technician entries: if multiple A&Ps performed work, their IDs are listed here.
  // The signing technician is the one making the 43.9 entry — they sign for all listed work.
  // Their IDs are resolved to technicianSignature objects at signing time. This supports
  // the multi-inspector scenario from compliance-validation.md §5.5.
}
```

**Guard Sequence (ordered — consumes signatureAuthEvent atomically):**

```typescript
const { orgId, identity } = await requireOrgMembership(ctx, "amt");
const now = Date.now();
const callerUserId = identity.subject;

// G1 — IMMUTABILITY GUARD (Rule 5 from preamble)
// This is the gate that prevents any subsequent write to a signed record.
// "Immutable" in Convex is not a schema constraint. It is this check.
// If record.status === "signed", this mutation throws unconditionally.
// There is no override path. Corrections require createCorrectionRecord.
const record = await ctx.db.get(args.recordId);
if (!record) throw new ConvexError({ code: "MR_NOT_FOUND" });
if (record.organizationId !== orgId)
  throw new ConvexError({ code: "MR_ORG_MISMATCH" });
if (record.status === "signed")
  throw new ConvexError({ code: "MR_ALREADY_SIGNED",
    signedAt: record.signatureTimestamp,
    signedBy: record.signingTechnicianCertNumber,
    message: "This maintenance record has already been signed and is immutable. " +
             "Errors in a signed record must be corrected by creating a new record " +
             "with recordType 'correction' using createCorrectionRecord." });

// G2 — IA CERTIFICATE CURRENCY CHECK FOR INSPECTION RECORDS
// Dale Renfrow's requirement from ia-profile.md: IA currency must be a hard gate,
// not a soft warning, before the sign-off workflow opens.
// Per 14 CFR §65.91: only an IA may make the annual/periodic inspection determination.
// Per compliance-validation.md §2 Item 7 and remaining-mutations.md: March 31 hard cutoff.
if (record.recordType === "inspection_43_11") {
  // Require inspector-level caller for inspection records.
  // Note: requireOrgMembership was called with "amt" for general access.
  // The IA-specific check is here, not in the auth wrapper, because
  // a non-IA can view and draft the record — only the IA signs it.
  const cert = await ctx.db.query("certificates")
    .withIndex("by_technician", q => q.eq("technicianId", callerTechId))
    .filter(q => q.eq(q.field("active"), true)).first();
  if (!cert?.hasIaAuthorization)
    throw new ConvexError({ code: "MR_IA_REQUIRED_FOR_INSPECTION",
      message: "inspection_43_11 records require an IA signature per 14 CFR §43.11. " +
               "Caller does not hold an Inspection Authorization." });
  if (!cert.iaExpiryDate || cert.iaExpiryDate < now)
    throw new ConvexError({ code: "MR_IA_EXPIRED",
      expiredAt: cert.iaExpiryDate,
      message: "IA authorization has expired. March 31 rule applies — " +
               "no grace period past the expiry date. " +
               "Dale Renfrow's requirement: this is a hard gate." });
}

// G3 — RATINGS EXERCISED VALIDATION [RQ-05]
// Technician declares. System validates. Per compliance-validation.md §1 (RQ-05).
// "none" is permitted for administrative or clerical records.
const callerTechId = await resolveTechnicianId(ctx, callerUserId, orgId);
const cert = await getActiveCert(ctx, callerTechId);
if (!cert) throw new ConvexError({ code: "MR_NO_ACTIVE_CERT" });
for (const rating of args.ratingsExercised) {
  if (rating === "none" || rating === "ia") continue;
  if (!cert.ratings.includes(rating))
    throw new ConvexError({ code: "SIGN_RATING_NOT_HELD",
      selected: rating, held: cert.ratings });
}
// IA rating requires IA authorization (not just cert.ratings containing "ia")
if (args.ratingsExercised.includes("ia") && !cert.hasIaAuthorization)
  throw new ConvexError({ code: "SIGN_RATING_NOT_HELD",
    selected: "ia", held: cert.ratings,
    message: "IA rating exercised but caller does not hold an IA." });

// G4 — SIX-CHECK signatureAuthEvent CONSUMPTION (mutation-implementation.md §5)
// Checks 1-4 are evaluated here. Checks 5-6 (consume + patch with recordId) are in
// the execution sequence, atomically with the primary write.
// CHECK 1 — EXISTS
const authEvent = await ctx.db.get(args.signatureAuthEventId);
if (!authEvent) throw new ConvexError({ code: "AUTH_EVENT_NOT_FOUND" });
// CHECK 2 — UNCONSUMED
if (authEvent.consumed)
  throw new ConvexError({ code: "AUTH_EVENT_ALREADY_CONSUMED",
    consumedAt: authEvent.consumedAt, consumedByTable: authEvent.consumedByTable,
    consumedByRecordId: authEvent.consumedByRecordId });
// CHECK 3 — NOT EXPIRED
// Per compliance-validation.md §3.4: "TTL check is mandatory backend enforcement.
// Frontend timer is informational only."
if (authEvent.expiresAt < now)
  throw new ConvexError({ code: "AUTH_EVENT_EXPIRED",
    expiredAt: authEvent.expiresAt,
    message: "Re-authentication event has expired. " +
             "Authenticate again to obtain a new signatureAuthEvent." });
// CHECK 4 — IDENTITY MATCH (per-signature, not per-session — Dale's requirement)
// The authEvent was created for a specific technician. That technician must be the caller.
if (authEvent.technicianId !== callerTechId)
  throw new ConvexError({ code: "AUTH_EVENT_IDENTITY_MISMATCH",
    issuedTo: authEvent.technicianId, calledBy: callerTechId,
    message: "signatureAuthEvent was issued to a different technician. " +
             "Each signature requires its own authentication event." });
// intendedTable check
if (authEvent.intendedTable && authEvent.intendedTable !== "maintenanceRecords")
  throw new ConvexError({ code: "AUTH_EVENT_WRONG_TABLE",
    intendedTable: authEvent.intendedTable });
```

**Execution Sequence (after all guards pass — atomically within one Convex mutation):**

```typescript
// Step 1 — CHECK 5: Consume signatureAuthEvent.
// This and the primary record write (Step 3) are in the same transaction.
// An event that is consumed with no corresponding record write is a failed mutation —
// Convex rolls back the entire transaction. No orphaned consumed events.
await ctx.db.patch(args.signatureAuthEventId, {
  consumed: true,
  consumedAt: now,
  consumedByTable: "maintenanceRecords",
  consumedByRecordId: null,  // Patched in Step 4 after recordId is known
});

// Step 2 — Compute SHA-256 signatureHash over canonical field set.
// Field ordering is deterministic and version-tracked (hashAlgorithmVersion "sha256-v1").
// The canonical set includes all content fields present at signing time.
// It EXCLUDES: createdAt (set before signing), status, signatureHash itself.
// Dale's requirement from ia-profile.md: the stored record must be verifiable.
// An inspector triggers the verify function, which re-computes this hash over the
// same canonical fields and compares to the stored value. This is how Record Integrity
// is demonstrated (compliance-validation.md §2 Item 6: build the user-facing verify endpoint).
const hashPayload = canonicalMaintenanceRecordJson({
  recordType: record.recordType,
  aircraftId: record.aircraftId,
  aircraftRegistration: record.aircraftRegistration,
  aircraftSerialNumber: record.aircraftSerialNumber,
  aircraftTotalTimeHours: record.aircraftTotalTimeHours,
  workOrderId: record.workOrderId,
  organizationId: record.organizationId,
  organizationCertificateNumber: record.organizationCertificateNumber,
  sequenceNumber: record.sequenceNumber,
  workPerformed: record.workPerformed,
  approvedDataReference: record.approvedDataReference,
  partsReplaced: record.partsReplaced,
  completionDate: record.completionDate,
  returnedToService: record.returnedToService,
  returnToServiceStatement: record.returnToServiceStatement,
  discrepanciesFound: record.discrepanciesFound,
  discrepanciesCorrected: record.discrepanciesCorrected,
  // Signing identity — snapshot at this moment
  signingTechnicianId: callerTechId,
  signingTechnicianCertNumber: cert.certificateNumber,
  signingTechnicianCertType: cert.certType,
  signingTechnicianRatingsExercised: args.ratingsExercised,
  signatureTimestamp: now,
});
const signatureHash = await computeSha256(hashPayload);

// Step 3 — Patch record with signature fields and lock status.
// These five fields are the atomic signing event. They are written together or not at all.
// After this patch, record.status === "signed" and the immutability guard (G1) will block
// any further writes via this mutation or any other.
await ctx.db.patch(args.recordId, {
  status: "signed",
  signingTechnicianId: callerTechId,
  signingTechnicianLegalName: cert.legalName,       // SNAPSHOT at signing
  signingTechnicianCertNumber: cert.certificateNumber, // SNAPSHOT — Carla's requirement #1
  signingTechnicianCertType: cert.certType,
  signingTechnicianRatingsExercised: args.ratingsExercised,
  signatureTimestamp: now,                           // Action time, not session time — Carla's requirement #2
  signatureHash,
  signatureAuthEventId: args.signatureAuthEventId,
  hashAlgorithmVersion: "sha256-v1",
  // Technicians array: includes both the signer and any additional technicians who performed work
  technicians: [
    { technicianId: callerTechId, legalName: cert.legalName,
      certNumber: cert.certificateNumber, certType: cert.certType,
      ratingsExercised: args.ratingsExercised, signatureTimestamp: now },
    ...(await resolveAdditionalTechnicians(ctx, args.techniciansWhoPerformedWork ?? [], orgId)),
  ],
});

// Step 4 — CHECK 6: Patch consumed event with record ID (six-check complete).
await ctx.db.patch(args.signatureAuthEventId, { consumedByRecordId: args.recordId });

// Step 5 — Update technician's lastExercisedDate.
// Per compliance-validation.md §2 Item 7: lastExercisedDate must update at ALL signature events,
// not just RTS. An FAA inspector asking "when did this IA last exercise their certificate" must
// find the most recent signature event across all maintenance records.
await ctx.db.patch(callerTechId, { lastExercisedDate: now, updatedAt: now });

// Step 6 — Audit log: signing event.
// This is a DISTINCT audit entry from the creation event (Step 4 in createMaintenanceRecord).
// These are Dale Renfrow's "two independent data points" from ia-profile.md:
// when the record was entered, and when it was signed. Two timestamps. Two log entries.
await ctx.db.insert("auditLog", {
  organizationId: orgId,
  eventType: "record_signed",
  tableName: "maintenanceRecords",
  recordId: args.recordId,
  userId: callerUserId,
  technicianId: callerTechId,
  timestamp: now,
  notes: `Maintenance record signed. Cert: ${cert.certificateNumber}. ` +
         `Type: ${record.recordType}. Aircraft: ${record.aircraftRegistration}. ` +
         `Ratings: ${args.ratingsExercised.join(",")}. ` +
         `Hash: ${signatureHash.substring(0, 16)}… (sha256-v1). ` +
         `Auth event: ${args.signatureAuthEventId}.`,
});
```

**What "Immutable" Means in Convex — Precise Statement:**

Convex has no schema-level write constraint on existing records. The immutability guarantee for
signed maintenance records is enforced entirely at the mutation layer:

1. `signMaintenanceRecord` G1 guard: any record with `status === "signed"` throws
   `MR_ALREADY_SIGNED` unconditionally. No mutation path can sign an already-signed record.

2. There is no `updateMaintenanceRecord` mutation. Its absence is documented and tested.
   Cilla's test matrix includes an assertion that no such mutation exists or can be reached
   through the public API. The absence of an update path is not an oversight — it is the spec.

3. Corrections require `createCorrectionRecord`, which creates a NEW document. The original
   signed record is never modified. Its `status` remains "signed". Its content fields are frozen.

4. The `auditLog` table is append-only (no `updateAuditLog` or `deleteAuditLog` mutation per
   compliance-validation.md §4.3). The signing event in the audit log is permanent.

5. Jonas must confirm: Convex database access controls prevent direct table manipulation outside
   the application layer (compliance-validation.md §4.3 condition 2).

**Error Code Registry — `signMaintenanceRecord`:**

| Code | Condition |
|---|---|
| `MR_NOT_FOUND` | Record not found |
| `MR_ORG_MISMATCH` | Record belongs to different org |
| `MR_ALREADY_SIGNED` | `status === "signed"` — immutability guard |
| `MR_IA_REQUIRED_FOR_INSPECTION` | `inspection_43_11`, caller lacks IA |
| `MR_IA_EXPIRED` | IA past expiry (March 31 rule) |
| `MR_NO_ACTIVE_CERT` | Caller has no active certificate record |
| `SIGN_RATING_NOT_HELD` | Rating exercised not held by caller **[RQ-05]** |
| `AUTH_EVENT_NOT_FOUND` | signatureAuthEventId not found |
| `AUTH_EVENT_ALREADY_CONSUMED` | Event previously consumed |
| `AUTH_EVENT_EXPIRED` | Event TTL elapsed |
| `AUTH_EVENT_IDENTITY_MISMATCH` | Event issued to different technician |
| `AUTH_EVENT_WRONG_TABLE` | Event's `intendedTable` is not `maintenanceRecords` |

**Cilla's expected test cases:**
- MR-SIGN-01: `status === "signed"` → `MR_ALREADY_SIGNED` (immutability gate)
- MR-SIGN-02: `inspection_43_11`, caller A&P only → `MR_IA_REQUIRED_FOR_INSPECTION`
- MR-SIGN-03: `inspection_43_11`, caller IA expired yesterday → `MR_IA_EXPIRED` **[March 31]**
- MR-SIGN-04: Consumed auth event → `AUTH_EVENT_ALREADY_CONSUMED`
- MR-SIGN-05: Expired auth event (expiresAt = now - 1ms) → `AUTH_EVENT_EXPIRED`
- MR-SIGN-06: Auth event issued to tech A, called by tech B → `AUTH_EVENT_IDENTITY_MISMATCH`
- MR-SIGN-07: Rating "airframe" exercised, caller holds powerplant only → `SIGN_RATING_NOT_HELD`
- MR-SIGN-08: Success → `status: "signed"`, `signatureHash` present, `signatureTimestamp` set,
  `signingTechnicianCertNumber` in stored record, `lastExercisedDate` updated on tech
- MR-SIGN-09: Re-run same mutation after success → `MR_ALREADY_SIGNED` (idempotency)
- MR-SIGN-10: Compute signatureHash independently and compare to stored value → hashes match
- MR-SIGN-11: Two separate technicians: each calls signMaintenanceRecord on separate draft records
  with their own auth events → both succeed independently (per-signature, not per-session)
- MR-SIGN-12: Attempt any field modification after status "signed" (via hypothetical update)
  → assert no mutation path exists (absence-of-mutation test)

---

## Section 3: `createCorrectionRecord`

**File:** `convex/mutations/maintenanceRecords/createCorrectionRecord.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`
**Regulatory Basis:** 14 CFR §43.9; AC 43-9C Section 6 — corrections by new entry.
**INV-01 (schema-v2):** Correction records link to the original. The original is marked as corrected.
Both records are permanent. The original is not deleted or overwritten.

**What a correction is:** An error was made in a signed maintenance record. The signed record cannot
be edited (immutability). The correction is a new document with `recordType: "correction"` that
states what the original said, what it should say, and why it was wrong. The original record is
patched to indicate it has been corrected (setting `correctedByRecordId` — see schema extension below)
but its content is not changed. An inspector sees both records in sequence.

**Required schema addition for corrections:**
```typescript
// Field to add to maintenanceRecords (additive):
correctedByRecordId: v.optional(v.id("maintenanceRecords")),
// Set on the original record when a correction is created.
// Null = no correction. Non-null = has been superseded by the referenced correction record.
// This field is the only permitted write to a signed record — and it is not a write
// to content fields. The content of the original record is frozen.
```

**Args:**
```typescript
{
  originalRecordId: v.id("maintenanceRecords"),
  signatureAuthEventId: v.id("signatureAuthEvents"),
  correctionFieldName: v.string(),       // What field was wrong (e.g., "approvedDataReference")
  correctionOriginalValue: v.string(),   // Verbatim value from original record
  correctionCorrectedValue: v.string(),  // The correct value
  correctionReason: v.string(),          // Why the correction is necessary — minimum 20 chars
  // Content fields that ARE fresh in the correction record (not copied from original):
  workPerformed: v.string(),             // The complete corrected work description
  approvedDataReference: v.string(),     // The corrected reference
  partsReplaced: v.array(embeddedPartRecord),
  ratingsExercised: v.array(v.union(
    v.literal("airframe"), v.literal("powerplant"),
    v.literal("ia"), v.literal("none")
  )),
}
```

**Fields COPIED from original record into the correction record:**
The following fields are copied verbatim. The corrector does not re-enter them:
`aircraftId`, `aircraftMake`, `aircraftModel`, `aircraftSerialNumber`, `aircraftRegistration`,
`aircraftTotalTimeHours`, `workOrderId`, `organizationId`, `organizationCertificateNumber`,
`completionDate`, `returnedToService`, `returnToServiceStatement`,
`discrepanciesFound`, `discrepanciesCorrected`, `discrepancyListProvided`.

**Fields FRESHLY ENTERED by the corrector (not copied):**
`workPerformed`, `approvedDataReference`, `partsReplaced` — the corrected versions.
`correctionFieldName`, `correctionOriginalValue`, `correctionCorrectedValue`, `correctionReason`
— the amendment chain documentation required by INV-01 and AC 43-9C.
All signature fields — the correction is signed by the corrector, who takes responsibility
for the corrected entry. The corrector's certificate number appears on the correction record.

**Guard Sequence (ordered — includes six-check consumption):**

```typescript
// G1 — AUTH
const { orgId, identity } = await requireOrgMembership(ctx, "amt");
const callerTechId = await resolveTechnicianId(ctx, identity.subject, orgId);
const cert = await getActiveCert(ctx, callerTechId);
if (!cert) throw new ConvexError({ code: "MR_NO_ACTIVE_CERT" });

// G2 — ORIGINAL RECORD EXISTS AND IS IN THIS ORG
const original = await ctx.db.get(args.originalRecordId);
if (!original) throw new ConvexError({ code: "MR_ORIGINAL_NOT_FOUND" });
if (original.organizationId !== orgId)
  throw new ConvexError({ code: "MR_ORG_MISMATCH" });

// G3 — ORIGINAL RECORD MUST BE SIGNED (corrections only correct signed records)
// You cannot correct a draft. If you made a mistake in a draft, use the existing
// update path during the draft phase. If it's signed, it gets a correction record.
if (original.status !== "signed")
  throw new ConvexError({ code: "MR_ORIGINAL_NOT_SIGNED",
    status: original.status,
    message: "createCorrectionRecord can only be called on signed records. " +
             "A draft record can be corrected before signing." });

// G4 — ORIGINAL RECORD NOT ALREADY CORRECTED
// A correction record creates a chain. Once a record has been corrected,
// further corrections address the correction record, not the original.
// This prevents a multi-correction chain that is ambiguous about what the "current" record is.
if (original.correctedByRecordId)
  throw new ConvexError({ code: "MR_ALREADY_CORRECTED",
    correctedBy: original.correctedByRecordId,
    message: "This record has already been corrected. If a further correction is needed, " +
             "create a correction to the existing correction record." });

// G5 — CORRECTION REASON MINIMUM CONTENT (AC 43-9C — corrections must explain themselves)
if (!args.correctionReason || args.correctionReason.trim().length < 20)
  throw new ConvexError({ code: "MR_CORRECTION_REASON_TOO_SHORT",
    length: args.correctionReason?.trim().length ?? 0, required: 20,
    message: "correctionReason must explain why the original entry was incorrect. " +
             "20-character minimum. 'Error' is not a reason." });

// G6 — CORRECTION FIELD NAME MATCHES WHAT WE STORE (INV-01 completeness check)
// All five correction fields must be set. An INV-01 violation is a schema-level
// constraint that we enforce here rather than trusting the caller to populate them.
if (!args.correctionFieldName?.trim() || !args.correctionOriginalValue?.trim() ||
    !args.correctionCorrectedValue?.trim())
  throw new ConvexError({ code: "MR_CORRECTION_FIELDS_INCOMPLETE",
    message: "correctionFieldName, correctionOriginalValue, and correctionCorrectedValue " +
             "must all be non-empty. INV-01: a correction record without these fields " +
             "is invalid under AC 43-9C." });

// G7 — CONTENT GUARDS (same as createMaintenanceRecord G3a, G3b)
if (!args.workPerformed || args.workPerformed.trim().length < 50)
  throw new ConvexError({ code: "MR_WORK_PERFORMED_TOO_SHORT" });
if (!args.approvedDataReference || !args.approvedDataReference.trim())
  throw new ConvexError({ code: "MR_APPROVED_DATA_REF_EMPTY" });

// G8 — RATINGS EXERCISED VALIDATION [RQ-05]
for (const rating of args.ratingsExercised) {
  if (rating === "none" || rating === "ia") continue;
  if (!cert.ratings.includes(rating))
    throw new ConvexError({ code: "SIGN_RATING_NOT_HELD", selected: rating, held: cert.ratings });
}

// G9 — SIX-CHECK signatureAuthEvent CONSUMPTION (mutation-implementation.md §5)
// Full six-check, same as signMaintenanceRecord. A correction is a signed act.
// The corrector authenticates per-signature, not per-session (Dale's requirement).
// [Checks 1-4 here; Checks 5-6 in execution sequence]
```

**Execution Sequence:**

```typescript
const now = Date.now();

// Step 1 — CHECK 5: Consume signatureAuthEvent.
await ctx.db.patch(args.signatureAuthEventId, {
  consumed: true, consumedAt: now,
  consumedByTable: "maintenanceRecords", consumedByRecordId: null,
});

// Step 2 — Compute sequence number (amendment sequence, not new logbook entry).
// The correction record gets the NEXT sequence number in the aircraft's logbook.
// It is a new record in the logbook, not a replacement of the original entry.
const lastRecord = await ctx.db.query("maintenanceRecords")
  .withIndex("by_aircraft_sequence", q => q.eq("aircraftId", original.aircraftId))
  .order("desc").first();
const sequenceNumber = (lastRecord?.sequenceNumber ?? 0) + 1;

// Step 3 — Compute signatureHash for the correction record.
const correctionHashPayload = canonicalMaintenanceRecordJson({
  recordType: "correction",
  ...copiedFieldsFrom(original),
  workPerformed: args.workPerformed.trim(),
  approvedDataReference: args.approvedDataReference.trim(),
  partsReplaced: args.partsReplaced,
  corrects: args.originalRecordId,
  correctionFieldName: args.correctionFieldName.trim(),
  correctionOriginalValue: args.correctionOriginalValue.trim(),
  correctionCorrectedValue: args.correctionCorrectedValue.trim(),
  correctionReason: args.correctionReason.trim(),
  signingTechnicianId: callerTechId,
  signingTechnicianCertNumber: cert.certificateNumber,
  signatureTimestamp: now,
  sequenceNumber,
});
const signatureHash = await computeSha256(correctionHashPayload);

// Step 4 — Insert correction record (status "signed" immediately — corrections are not drafted).
const correctionId = await ctx.db.insert("maintenanceRecords", {
  status: "signed",
  recordType: "correction",
  // COPIED from original:
  aircraftId: original.aircraftId,
  aircraftMake: original.aircraftMake,
  aircraftModel: original.aircraftModel,
  aircraftSerialNumber: original.aircraftSerialNumber,
  aircraftRegistration: original.aircraftRegistration,
  aircraftTotalTimeHours: original.aircraftTotalTimeHours,
  workOrderId: original.workOrderId,
  organizationId: orgId,
  organizationCertificateNumber: original.organizationCertificateNumber,
  completionDate: original.completionDate,
  returnedToService: original.returnedToService,
  returnToServiceStatement: original.returnToServiceStatement,
  discrepanciesFound: original.discrepanciesFound,
  discrepanciesCorrected: original.discrepanciesCorrected,
  discrepancyListProvided: original.discrepancyListProvided,
  // FRESH — entered by corrector:
  sequenceNumber,
  workPerformed: args.workPerformed.trim(),
  approvedDataReference: args.approvedDataReference.trim(),
  partsReplaced: args.partsReplaced,
  corrects: args.originalRecordId,
  correctionFieldName: args.correctionFieldName.trim(),
  correctionOriginalValue: args.correctionOriginalValue.trim(),
  correctionCorrectedValue: args.correctionCorrectedValue.trim(),
  correctionReason: args.correctionReason.trim(),
  // Signature — corrector's identity, not original signer's:
  technicians: [{ technicianId: callerTechId, legalName: cert.legalName,
    certNumber: cert.certificateNumber, certType: cert.certType,
    ratingsExercised: args.ratingsExercised, signatureTimestamp: now }],
  signingTechnicianId: callerTechId,
  signingTechnicianLegalName: cert.legalName,
  signingTechnicianCertNumber: cert.certificateNumber,
  signingTechnicianCertType: cert.certType,
  signingTechnicianRatingsExercised: args.ratingsExercised,
  signatureTimestamp: now,
  signatureHash,
  signatureAuthEventId: args.signatureAuthEventId,
  hashAlgorithmVersion: "sha256-v1",
  createdAt: now,
});

// Step 5 — CHECK 6: Patch auth event with correction record ID.
await ctx.db.patch(args.signatureAuthEventId, { consumedByRecordId: correctionId });

// Step 6 — Mark original record as corrected.
// This is the ONLY permitted write to a signed record's non-content field.
// The original's content is frozen. Only correctedByRecordId is set.
await ctx.db.patch(args.originalRecordId, { correctedByRecordId: correctionId });

// Step 7 — Update technician's lastExercisedDate.
await ctx.db.patch(callerTechId, { lastExercisedDate: now, updatedAt: now });

// Step 8 — Audit log: TWO entries for the amendment chain.
// Entry A: correction record created.
// Entry B: original record marked as corrected.
// An inspector following the amendment chain sees both events and can reconstruct the history.
await ctx.db.insert("auditLog", {
  organizationId: orgId, eventType: "record_signed",
  tableName: "maintenanceRecords", recordId: correctionId,
  userId: identity.subject, technicianId: callerTechId, timestamp: now,
  notes: `Correction record created. Corrects: ${args.originalRecordId}. ` +
         `Field: ${args.correctionFieldName}. ` +
         `Original: "${args.correctionOriginalValue.substring(0, 50)}". ` +
         `Corrected: "${args.correctionCorrectedValue.substring(0, 50)}". ` +
         `Reason: ${args.correctionReason}. Cert: ${cert.certificateNumber}.`,
});
await ctx.db.insert("auditLog", {
  organizationId: orgId, eventType: "status_changed",
  tableName: "maintenanceRecords", recordId: args.originalRecordId,
  userId: identity.subject, technicianId: callerTechId, timestamp: now,
  fieldName: "correctedByRecordId", oldValue: JSON.stringify(null),
  newValue: JSON.stringify(correctionId),
  notes: `Original record marked as corrected by ${correctionId}.`,
});

return { correctionId, originalRecordId: args.originalRecordId, sequenceNumber };
```

**Cilla's expected test cases:**
- MR-CORR-01: Original record status "draft" → `MR_ORIGINAL_NOT_SIGNED`
- MR-CORR-02: Original already has `correctedByRecordId` set → `MR_ALREADY_CORRECTED`
- MR-CORR-03: `correctionReason.trim().length === 19` → `MR_CORRECTION_REASON_TOO_SHORT`
- MR-CORR-04: `correctionFieldName` empty → `MR_CORRECTION_FIELDS_INCOMPLETE`
- MR-CORR-05: Success → correction record has `recordType: "correction"`, `corrects` set,
  original record has `correctedByRecordId` set, both in same transaction
- MR-CORR-06: Original record content (workPerformed) unchanged after correction
- MR-CORR-07: Correction record has corrector's cert number, not original signer's

---

## Section 4: `getMaintenanceRecordAuditTrail`

**File:** `convex/queries/maintenanceRecords/getMaintenanceRecordAuditTrail.ts`
**AUTH:** `requireOrgMembership(ctx, "viewer")`
**Type:** Query — no writes.
**Use case:** This is what Carla Ostrowski exports the morning after a midnight sign-off to verify
the record was captured correctly (dom-profile.md). This is what an FAA inspector reads during
a Part 145 surveillance inspection (compliance-validation.md §2, Item 1). This is what Dale Renfrow
wants to see — the actual stored record, not a UI proxy (ia-profile.md: "the actual data schema
for a completed IA maintenance entry... not a demo, not a screenshot").

**Return Type:**

```typescript
{
  record: MaintenanceRecordDocument,       // Full document as stored in Convex
  hashVerification: {
    storedHash: string,
    recomputedHash: string,                // Computed live from current field values
    hashesMatch: boolean,                  // False = record was modified after signing
    hashAlgorithmVersion: string,
    verifiedAt: number,                    // Timestamp of verification
  },
  certSnapshot: {
    // Signing technician's certificate state AT SIGNING TIME.
    // This is the snapshot stored in the record, not the current cert state.
    // Dale's requirement: the record must reflect what was true when signed.
    technicianId: string,
    legalName: string,
    certNumber: string,
    certType: string,
    ratingsExercised: string[],
    signatureTimestamp: number,
    // Current cert state (for inspector cross-reference — not the operative record):
    certCurrentlyActive: boolean,
    certCurrentExpiry: number | null,
    iaCurrentlyHeld: boolean,
  },
  auditTrail: AuditLogDocument[],          // All auditLog entries for this record, sorted by timestamp
  correctionChain: {
    // If this record was corrected, the correction record(s) in sequence.
    // If this is a correction record, the original it corrects.
    original: MaintenanceRecordDocument | null,
    corrections: MaintenanceRecordDocument[],
  },
  workOrderSummary: {
    workOrderNumber: string,
    workOrderType: string,
    status: string,
    openedAt: number,
    closedAt: number | null,
    aircraftRegistration: string,
  },
}
```

**Guard and Query Logic:**

```typescript
const { orgId } = await requireOrgMembership(ctx, "viewer");

// G1 — FETCH RECORD AND ORG ISOLATION
const record = await ctx.db.get(args.recordId);
if (!record) throw new ConvexError({ code: "MR_NOT_FOUND" });
if (record.organizationId !== orgId)
  throw new ConvexError({ code: "MR_ORG_MISMATCH" });

// FETCH AUDIT TRAIL
// All auditLog entries where tableName === "maintenanceRecords" AND recordId === args.recordId.
// Per compliance-validation.md §4.6: audit log coverage must include record_created,
// record_signed, and any status_changed events (including correctedByRecordId updates).
const auditEntries = await ctx.db.query("auditLog")
  .withIndex("by_record", q =>
    q.eq("tableName", "maintenanceRecords").eq("recordId", args.recordId))
  .order("asc")
  .collect();

// FETCH CORRECTION CHAIN
const correctionChain = await buildCorrectionChain(ctx, record);

// CERT SNAPSHOT AT SIGNING TIME
// The cert snapshot is stored in the record itself (legalName, certNumber, certType).
// The "current" cert state is fetched live for the cross-reference column.
const currentCert = record.signingTechnicianId
  ? await ctx.db.query("certificates")
      .withIndex("by_technician", q => q.eq("technicianId", record.signingTechnicianId))
      .filter(q => q.eq(q.field("active"), true)).first()
  : null;

// LIVE HASH VERIFICATION
// Per compliance-validation.md §2 Item 6: build the user-facing verify endpoint.
// An FAA inspector triggers this and gets an immediate yes/no on record integrity.
// This is not theater — it is the audit tool that turns "the hash is stored" into
// "the hash can be independently verified." Rosa Eaton's requirement.
let hashVerification = null;
if (record.status === "signed" && record.signatureHash) {
  const recomputedHash = await computeSha256(canonicalMaintenanceRecordJson(record));
  hashVerification = {
    storedHash: record.signatureHash,
    recomputedHash,
    hashesMatch: record.signatureHash === recomputedHash,
    hashAlgorithmVersion: record.hashAlgorithmVersion ?? "sha256-v1 (assumed)",
    verifiedAt: Date.now(),
  };
}

// WORK ORDER SUMMARY
const wo = await ctx.db.get(record.workOrderId);

return {
  record,
  hashVerification,
  certSnapshot: {
    technicianId: record.signingTechnicianId,
    legalName: record.signingTechnicianLegalName,
    certNumber: record.signingTechnicianCertNumber,
    certType: record.signingTechnicianCertType,
    ratingsExercised: record.signingTechnicianRatingsExercised,
    signatureTimestamp: record.signatureTimestamp,
    certCurrentlyActive: currentCert?.active ?? false,
    certCurrentExpiry: currentCert?.expiryDate ?? null,
    iaCurrentlyHeld: currentCert?.hasIaAuthorization ?? false,
  },
  auditTrail: auditEntries,
  correctionChain,
  workOrderSummary: wo ? {
    workOrderNumber: wo.workOrderNumber,
    workOrderType: wo.workOrderType,
    status: wo.status,
    openedAt: wo.createdAt,
    closedAt: wo.closedAt ?? null,
    aircraftRegistration: record.aircraftRegistration,
  } : null,
};
```

**What this query is for:** Carla runs it at 6 AM. She sees two timestamps in the audit trail:
`record_created` (when the mechanic entered the data) and `record_signed` (when the signature was
applied). These are distinct because they are distinct regulatory acts. Dale's requirement from
ia-profile.md is that authentication events be independently logged from record entries — these are
the two rows he's looking for. The hash verification result tells her immediately whether the
record has been modified since signing.

---

## Section 5: Carla's Four-Point Digital Signature Standard, Applied

Carla's standard is from dom-profile.md §"Digital Signatures: Her Actual Standard". Each of her
four requirements is assessed against the Phase 5 mutation implementation.

---

### Requirement 1: "The signature must be uniquely linked to the signer's certificate number, not their employee record, not their user account, not their email address."

**How the implementation satisfies it:**

`signMaintenanceRecord` Step 3 writes `signingTechnicianCertNumber: cert.certificateNumber`
as a snapshot at signing time. This field is:
- A non-optional field in the correction-aware schema
- Written from the `certificates` table record, which is sourced from the A&P cert on file
- Distinct from `callerUserId` (the Clerk user ID) — the mapping is `userId → technicianId → cert.certificateNumber`
- Permanently stored in the record document and included in the SHA-256 hash payload

The `getMaintenanceRecordAuditTrail` query returns `certSnapshot.certNumber` — this is the
snapshot value at signing time. An FAA inspector does not need database access; they see the
certificate number in the exported PDF (pending export implementation).

Carla's quote from dom-profile.md: "A username is not a certificate number." The implementation
never stores a username as the signing identity. The cert number is the signing identity.

**Gap:** The IA number (`iaCertNumber`) is specified in requirements-synthesis.md as a separate
required field, distinct from the A&P cert number. Dale Renfrow has rejected two vendor products
for conflating them. The current `certificates` schema stores `hasIaAuthorization: boolean` and
`iaExpiryDate`, but does not have a separate `iaCertNumber` field. For inspection records
(`inspection_43_11`), `signingTechnicianCertNumber` captures the A&P number. The IA authorization
number is not separately stored or surfaced. **This is a gap that must be resolved before Dale
signs off on the IA sign-off flow.** Required: add `iaCertNumber: v.optional(v.string())` to the
`certificates` table; capture it in the `signingTechnicianIaCertNumber` field on signed inspection
records.

---

### Requirement 2: "The signature must be timestamped to the action, not to the session."

**How the implementation satisfies it:**

`signMaintenanceRecord` Step 3 writes `signatureTimestamp: now`, where `now = Date.now()` is
computed within the Convex mutation execution — not passed in by the client. The client cannot
supply a fabricated timestamp. The `signatureTimestamp` is included in the SHA-256 hash payload,
so any attempt to alter it post-signing would produce a different hash.

The `auditLog` entry in Step 6 also writes `timestamp: now` — the same wall-clock moment.

**Distinction from session time:** Convex mutations execute at call time. There is no session
concept at the mutation layer. The timestamp recorded is the timestamp of the mutation execution,
not the timestamp of session open. Troy Weaver's concern from requirements-synthesis.md ("sign-off
confirmation should be immediate") is satisfied because the mutation writes immediately and the
response includes the committed record.

**Fully satisfies Carla's requirement.**

---

### Requirement 3: "The signature must be irreversible without a trail."

**How the implementation satisfies it:**

Three mechanisms:

1. The `signMaintenanceRecord` mutation's G1 guard makes the signed state permanent: once
   `status === "signed"`, no mutation can change content fields. The guard is unconditional.

2. `createCorrectionRecord` — the only permitted modification path — creates a NEW document.
   The original's content is frozen. The only field written to the original is
   `correctedByRecordId` (Section 3 Step 6). This is consistent with AC 43-9C Section 6: the
   corrected entry is not deleted; it is marked and superseded.

3. The `auditLog` records both the signing event and, if corrected, the correction event. The
   audit log is append-only (no `updateAuditLog` or `deleteAuditLog` mutation per
   compliance-validation.md §4.3). An inspector can see the full timeline.

The `getMaintenanceRecordAuditTrail` query surfaces the original signed record and any correction
records together in the `correctionChain` field. "Original record must remain visible — struck
through, flagged, whatever — not deleted" (dom-profile.md). The original document exists in the
database permanently. The UI layer is responsible for presenting `correctedByRecordId !== null`
records with appropriate visual treatment (Chloe's implementation).

**Fully satisfies Carla's requirement.**

---

### Requirement 4: "The signature must be legible at the record level without the software."

**How the implementation satisfies it (partially):**

The data is all there. `signingTechnicianCertNumber`, `signingTechnicianLegalName`, `signatureTimestamp`,
`aircraftRegistration`, `workPerformed`, `approvedDataReference`, `signatureHash` — every required
field per 14 CFR §43.9 is stored in the `maintenanceRecords` document. The `getMaintenanceRecordAuditTrail`
query assembles it into a structured export package.

**What is missing:** The PDF export. Carla's test from dom-profile.md: "She will create a test work
order, sign a step, close the work order, generate the maintenance release, and then export the full
record to PDF. She will look at it the way an inspector looks at it." The `getMaintenanceRecordAuditTrail`
query returns the data. An export action is not yet implemented. Per requirements-synthesis.md Part 2
#3 (Complexity: Complex): this requires a PDF generation library, a §43.9-compliant template reviewed
by Marcus, and a CI regression test. This is a Phase 5 build task, not a mutation concern — but
**Requirement 4 is not fully satisfied until the PDF export exists**. The mutation data is correct;
the rendering layer must deliver on Carla's promise.

Per mvp-scope.md §"Must Be in Alpha to Be Taken Seriously" item 8: "Exported records pass Carla's
day-one PDF test." This is a launch blocker. The export is a dependency of alpha readiness.

---

## Section 6: Minimum Content Enforcement

### 6.1 The Problem with Character Count

The 50-character floor on `workPerformed` (mvp-scope.md §Schema Changes Required item 4, Linda
Paredes quote) is enforced at G3a of `createMaintenanceRecord`. This catches intentional evasion.
It does not catch a technically compliant entry that says nothing.

A 55-character entry reading `"Installed new left main gear tire per shop standard"` passes the
50-char check. It fails the AC 43-9C standard. The entry lacks: what approved data was used
(AMM section and revision), what specific work was done to what specification, and whether the
part number/serial number of the installed tire was documented.

Marcus Webb's position from compliance-validation.md §1 (RQ-06) and the compliance chain: content
floors exist to catch the worst case; the real standard is substantive entries. The same reasoning
that produced three-assertion RTS statement validation (not just character count) applies here.

### 6.2 What AC 43-9C Requires — Marcus's Standard

Per 14 CFR §43.9(a)(1) and AC 43-9C Section 6, a compliant maintenance entry must contain:

**Required element 1 — Description of work performed.**
Not what was found. What was DONE. "Inspected and found serviceable" is not a description of work.
"Inspected left main gear strut per King Air B200 AMM Chapter 32-30-00, Revision 9, paragraphs
(a)-(d); strut extension measured at 2.8 inches, within limits per AMM Table 32-30-01" is.

**Required element 2 — Approved data reference.**
The specific document, chapter, section, and revision. Not "per manufacturer's instructions."
Per Rachel Kwon (requirements-synthesis.md Part 1): "'per AMM' is not a reference. It's an
abbreviation for 'I don't remember.'" The `approvedDataReference` field must contain at minimum:
document type + document identifier + revision identifier + section/chapter.

**Required element 3 — Date of completion.**
The `completionDate` field captures this as a Unix timestamp. The constraint: `completionDate`
must be ≤ `now` at record creation. A future completion date is not permitted (enforced at G3 via
`if (args.completionDate > now) throw MR_COMPLETION_DATE_IN_FUTURE`).

**Required element 4 — Aircraft total time.**
Captured in `aircraftTotalTimeHours` and cross-validated against the work order (G4).

### 6.3 Why Pure Character Count Is Insufficient — The Structural Solution

Character count is a floor applied because, as Linda Paredes said: "If the software allows someone
to create a legally insufficient maintenance record without friction, they will." The floor creates
friction for the worst-case input. It does not create quality for the borderline-quality input.

**What Devraj and Marcus agree the enforcement strategy should be for Phase 5:**

**Hybrid enforcement — guard + structured fields:**

1. **Character floor (guard):** 50 chars on `workPerformed`. This is non-negotiable for alpha.
   It stays.

2. **approvedDataReference as structured object (Phase 5 alpha):** The current free-text
   `approvedDataReference` field must be promoted to a required structured type before alpha:
   ```typescript
   {
     documentType: "AMM" | "SRM" | "IPC" | "CMM" | "AD" | "SB" | "TSO" | "MM" | "other",
     documentId: string,      // e.g., "Beechcraft B200 AMM"
     revision: string,        // e.g., "Rev 9"
     chapter: string,         // e.g., "32-30-00"
     section: v.optional(v.string()),  // Optional for document types without section numbering
   }
   ```
   The guard at G3b changes to: validate each required subfield is non-empty and non-whitespace.
   `documentType: "other"` is permitted but triggers a warning in the UI. A free-text reference
   with no structured fields is the pattern Rachel Kwon's shops are using to evade documentation
   standards; structuring the field makes that pattern impossible.
   **This requires a schema migration.** Rafael and Devraj must align on the migration approach
   for existing freeform `approvedDataReference` data before this change ships.

3. **Keyword-presence check on workPerformed (advisory, not throwing):** A secondary check after
   the character floor looks for the presence of at least one of: a part number pattern
   (`/P\/N\s?[\w-]+/i`), a procedure reference (`/paragraph|section|step|figure/i`), or a
   measurement value (`/\d+\.\d+|\d+ (inch|psi|ft-lb|torque|nm)/i`). This check does NOT throw.
   It writes a `warn`-level audit log entry when none of these signals are present. The DOM
   sees warnings in the QCM dashboard. A record that passes character count but has no structured
   content signal is flagged for QCM review — it is not blocked. Blocking would make the system
   too rigid for legitimate edge cases (e.g., administrative records, logbook transfers).

4. **For inspection records (`inspection_43_11`):** 100-character minimum (G3c). And: the
   `approvedDataReference.documentType` must be "AMM", "SRM", or equivalent structured type
   (not "other"). Per 14 CFR §43.11, inspection records require explicit citation of the data
   used in the inspection.

### 6.4 The 50-Character Floor Is Not the Standard

The 50-character floor is what we enforce at code. The standard is what Marcus describes above.
The floor catches intentional evasion. The structured `approvedDataReference` object catches
accidental non-compliance. The keyword-presence check gives the QCM visibility into records
that are probably insufficient but not structurally wrong.

Linda Paredes's (QCM) requirement from mvp-scope.md: "If the software allows someone to create
a legally insufficient maintenance record without friction, they will." The structured
`approvedDataReference` field creates friction against the "per AMM" entry pattern at the UI
level — there is no freeform escape hatch for the reference field. The character floor creates
friction against one-word entries. Neither is sufficient alone. Together, they approximate what
the regulation requires without imposing a regulatory interpretation the FAA has not made.

---

## Error Code Summary — All Maintenance Record Mutations

| Code | Mutation | Condition |
|---|---|---|
| `WO_NOT_FOUND` | createMR | Work order not found |
| `WO_ORG_MISMATCH` | createMR | Work order in different org |
| `MR_WO_WRONG_STATUS` | createMR | WO closed/voided/cancelled |
| `MR_WORK_PERFORMED_TOO_SHORT` | createMR, createCorr | < 50 chars |
| `MR_APPROVED_DATA_REF_EMPTY` | createMR, createCorr | Empty/whitespace reference |
| `MR_INSPECTION_ENTRY_TOO_SHORT` | createMR | inspection_43_11 < 100 chars |
| `MR_WO_NO_CLOSE_TIME` | createMR | WO lacks aircraftTotalTimeAtClose |
| `MR_AIRCRAFT_TIME_MISMATCH` | createMR | TT diverges from WO close TT |
| `MR_RTS_STATEMENT_REQUIRED` | createMR | returnedToService true, no statement |
| `MR_DISCREPANCY_NOT_FOUND` | createMR | Discrepancy ID not found |
| `MR_DISCREPANCY_WRONG_WO` | createMR | Discrepancy on different WO |
| `MR_TECHNICIAN_NOT_ACTIVE` | createMR | No active tech record for caller |
| `MR_ORG_CERT_NUMBER_MISSING` | createMR | Part 145 org, no cert number |
| `MR_NOT_FOUND` | signMR, createCorr | Record not found |
| `MR_ORG_MISMATCH` | signMR, createCorr | Record in different org |
| `MR_ALREADY_SIGNED` | signMR | Immutability guard — status signed |
| `MR_IA_REQUIRED_FOR_INSPECTION` | signMR | inspection_43_11, caller lacks IA |
| `MR_IA_EXPIRED` | signMR | IA past March 31 cutoff |
| `MR_NO_ACTIVE_CERT` | signMR, createCorr | No active cert for caller |
| `SIGN_RATING_NOT_HELD` | signMR, createCorr | Rating exercised not held **[RQ-05]** |
| `AUTH_EVENT_NOT_FOUND` | signMR, createCorr | Auth event not found |
| `AUTH_EVENT_ALREADY_CONSUMED` | signMR, createCorr | Event previously consumed |
| `AUTH_EVENT_EXPIRED` | signMR, createCorr | Event TTL elapsed |
| `AUTH_EVENT_IDENTITY_MISMATCH` | signMR, createCorr | Event issued to different tech |
| `AUTH_EVENT_WRONG_TABLE` | signMR, createCorr | intendedTable mismatch |
| `MR_ORIGINAL_NOT_FOUND` | createCorr | Original record not found |
| `MR_ORIGINAL_NOT_SIGNED` | createCorr | Original is a draft |
| `MR_ALREADY_CORRECTED` | createCorr | Original has correctedByRecordId set |
| `MR_CORRECTION_REASON_TOO_SHORT` | createCorr | correctionReason < 20 chars |
| `MR_CORRECTION_FIELDS_INCOMPLETE` | createCorr | INV-01: missing correction fields |
| `MR_COMPLETION_DATE_IN_FUTURE` | createMR | completionDate > now |

---

## Open Items Before Phase 5 Alpha

1. **IA certificate number as separate field:** `certificates.iaCertNumber` must be added to the
   schema and captured as `signingTechnicianIaCertNumber` on signed `inspection_43_11` records.
   Dale Renfrow has rejected two products for conflating A&P cert number with IA number.
   This is a launch blocker for the IA sign-off flow.

2. **`approvedDataReference` schema migration:** The promotion from free-text to structured object
   requires a migration plan for existing data. Rafael and Devraj to align on approach.
   Required before alpha ships (requirements-synthesis.md §Part 5 "Must Be in Alpha" item 7).

3. **PDF export action:** `getMaintenanceRecordAuditTrail` returns the data; the export rendering
   is a separate Convex action. Required before Carla's day-one test. Marcus must review the §43.9
   field layout before implementation.

4. **Hash verify UI endpoint:** Per compliance-validation.md §4.3, a user-facing "Verify Record
   Integrity" function must exist. The `getMaintenanceRecordAuditTrail` query includes hash
   verification in its return value. Chloe's responsibility: surface `hashesMatch` prominently in
   the UI, with a timestamp and an "FAA Inspector View" mode.

5. **`MR_COMPLETION_DATE_IN_FUTURE` guard:** Not listed in the guard sequence above for brevity
   but must be added to `createMaintenanceRecord` G3. A future completion date is not permitted.

---

*Devraj Anand — Backend, Convex*
*Regulatory citations: Marcus Webb — 14 CFR §43.9, §43.11, §65.91; AC 43-9C*
*IA signing requirements: Dale Renfrow (ia-profile.md) — per-signature auth, March 31 IA rule*
*DOM signing standard: Carla Ostrowski (dom-profile.md) — four-point digital signature standard*
*Content enforcement: Linda Paredes QCM + Rachel Kwon via requirements-synthesis.md §Part 1*
*QA contract: Cilla Oduya — all test cases above are binding on phase sign-off*
*Schema basis: convex-schema-v2.md + Phase 5 extension (Section 0 of this document)*
*This document supersedes any prior specification of `createMaintenanceRecord` or `signMaintenanceRecord`.*
*All guard sequences, error codes, and immutability guarantees are binding on implementation.*
*Deviations require written sign-off from Rafael Mendoza (Tech Lead) and Cilla Oduya (QA Lead).*
