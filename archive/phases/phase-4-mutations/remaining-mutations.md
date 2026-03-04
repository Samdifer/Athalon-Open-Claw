# Athelon — Phase 4 Remaining Mutations: Full Implementation Spec
**Document Type:** Phase 4 Implementation Specification — 11 Unimplemented Critical Mutations
**Author:** Devraj Anand (Backend, Convex)
**Regulatory Review:** Marcus Webb (compliance-validation.md RQ-01 through RQ-06)
**QA Contract:** Cilla Oduya — test case references in each mutation section
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 4 implementation begins against this document
**Schema Basis:** convex-schema-v2.md (FROZEN) + schema-v2.1.md (SE-01 taskCardStepCounterSignatures,
  SE-02 taskCardInterruptions, SE-03 taskCardStepAssignments, form337Reference on workOrders,
  signature fields on taskCards per B-P3-07)
**Resolves:** B-P3-02 (authorizeReturnToService), B-P3-05 (AD compliance), B-P3-07 (signTaskCard schema),
  UM-01 (reviewNAStep), UM-02 (counterSignStep), UM-05 (hold lifecycle), UM-06 (inspection lifecycle)
**Preconditions:** mutation-implementation.md accepted. Phase 3 gate review GO WITH CONDITIONS accepted.
  RQ-01 through RQ-06 formal determinations received (compliance-validation.md §1).

---

## Devraj's Preamble

This document specifies the 11 mutations that remain unimplemented after Phase 3. Every one of these
blocks something the system cannot do without it: `authorizeReturnToService` blocks every work order
close, the AD compliance suite blocks annual and 100-hour inspection close, the WO lifecycle mutations
leave the state machine with dead-end states, and the task card mutations leave annual inspections with
unresolvable N/A flows and no dual sign-off path.

Four implementation rules govern everything in this document and are not negotiable:

**Rule 1 — Auth wrapper is first, always.** Every protected mutation calls `requireOrgMembership(ctx, minRole)`
before any other statement. `orgId` and `callerUserId` are derived from the JWT. The client never passes
`organizationId` or `callerUserId` as mutation arguments. This is enforced in code review. A mutation
without the auth wrapper does not merge (per mutation-implementation.md §2).

**Rule 2 — Guards are ordered and the order is not negotiable.** Auth checks run first. Document existence
checks run second. State transition validity runs third. Business logic guards run last. Do not reorder.
Reordering wastes DB reads on requests that will fail authentication.

**Rule 3 — Six-check signatureAuthEvent consumption (mutation-implementation.md §5) applies to every
signing mutation without exception.** This sequence is referenced by name in each mutation below.
Do not inline a partial version.

**Rule 4 — Audit log writes are transactional, not afterthoughts.** The `auditLog` insert is part of
the behavioral contract and happens within the same Convex transaction as the primary write. If the
audit write fails, the mutation fails. There is no partial state.

**Marcus's Phase 3 exit blockers that directly shape this document:**
- Section 5.4 of compliance-validation.md: `createAdCompliance` unspecified; vacuous-truth pass on
  annual close if zero AD records exist. Critical. Phase 3 exit blocker.
- Section 2, Item 3 of compliance-validation.md: `recordAdCompliance` PRECONDITION 4 must assert
  `maintenanceRecord.approvedDataReference` contains the AD number. Missing from Phase 2 spec.
- RQ-06 (compliance-validation.md §1): RTS statement floor raised to 75 chars, three separate
  assertions, three separate error codes. Changes PRECONDITION 9 of `authorizeReturnToService`.

Where Marcus's RQ determinations changed a guard condition from what Phase 2 specified, this document
flags it with the label **[MARCUS RQ-XX CHANGE]**.

---

## Priority 1 — Return to Service

### Mutation 1: `authorizeReturnToService` — B-P3-02

**File:** `convex/mutations/returnToService/authorizeReturnToService.ts`
**AUTH:** `requireOrgMembership(ctx, "inspector")`
**Rationale:** Only IA-qualified inspectors may close an annual inspection RTS. For 100-hour and
general maintenance WOs, the `inspector` role minimum still gates the RTS function; the mutation
internally validates the certificate level against the WO type.

**Args:**
```typescript
{
  workOrderId: v.id("workOrders"),
  signatureAuthEventId: v.id("signatureAuthEvents"),
  returnToServiceStatement: v.string(),
  aircraftHoursAtRts: v.number(),
  limitations: v.optional(v.string()),
}
```

**Guard Sequence (ordered — 9 preconditions from signoff-rts-flow.md §2.2):**

```typescript
const { orgId, identity } = await requireOrgMembership(ctx, "inspector");
const callerUserId = identity.subject;

// G1 — PRECONDITION 1: Auth event (first 4 of Section 5 six-check)
// Full consumption deferred until after all other guards pass (guard 9 consumes atomically).
const authEvent = await ctx.db.get(args.signatureAuthEventId);
if (!authEvent) throw new ConvexError({ code: "AUTH_EVENT_NOT_FOUND" });
if (authEvent.consumed) throw new ConvexError({ code: "RTS_AUTH_EVENT_CONSUMED",
  consumedAt: authEvent.consumedAt, consumedByRecordId: authEvent.consumedByRecordId });
if (authEvent.expiresAt < now) throw new ConvexError({ code: "RTS_AUTH_EVENT_EXPIRED",
  expiredAtIso: new Date(authEvent.expiresAt).toISOString() });
// intendedTable check — auth event must have been created for this surface
if (authEvent.intendedTable && authEvent.intendedTable !== "returnToService")
  throw new ConvexError({ code: "RTS_AUTH_EVENT_WRONG_TABLE",
    intendedTable: authEvent.intendedTable });

// G2 — PRECONDITION 2: Work order state
const wo = await ctx.db.get(args.workOrderId);
if (!wo) throw new ConvexError({ code: "WO_NOT_FOUND" });
if (wo.organizationId !== orgId) throw new ConvexError({ code: "WO_ORG_MISMATCH" });
if (wo.status !== "pending_signoff") throw new ConvexError({ code: "RTS_WRONG_WO_STATUS",
  current: wo.status, required: "pending_signoff" });
if (!wo.aircraftTotalTimeAtClose) throw new ConvexError({ code: "RTS_NO_CLOSE_TIME" });
if (wo.returnToServiceId != null) throw new ConvexError({ code: "RTS_ALREADY_SIGNED",
  existingRtsId: wo.returnToServiceId });

// G3 — PRECONDITION 3: Aircraft total time consistency
if (args.aircraftHoursAtRts !== wo.aircraftTotalTimeAtClose)
  throw new ConvexError({ code: "RTS_TIME_MISMATCH",
    submitted: args.aircraftHoursAtRts, recorded: wo.aircraftTotalTimeAtClose });
const aircraft = await ctx.db.get(wo.aircraftId);
if (!aircraft) throw new ConvexError({ code: "AIRCRAFT_NOT_FOUND" });
if (wo.aircraftTotalTimeAtClose < wo.aircraftTotalTimeAtOpen)
  throw new ConvexError({ code: "RTS_TIME_DECREASED" }); // INV-06/INV-18 belt-and-suspenders
if (args.aircraftHoursAtRts < aircraft.totalTimeAirframeHours)
  throw new ConvexError({ code: "RTS_TIME_BELOW_AIRCRAFT_RECORD",
    submitted: args.aircraftHoursAtRts, onFile: aircraft.totalTimeAirframeHours });

// G4 — PRECONDITION 4: All task cards terminal
const taskCards = await ctx.db.query("taskCards")
  .withIndex("by_work_order", q => q.eq("workOrderId", args.workOrderId)).collect();
const blockerCards = taskCards.filter(c =>
  c.status !== "complete" && c.status !== "voided");
if (blockerCards.length > 0)
  throw new ConvexError({ code: "RTS_OPEN_TASK_CARDS",
    cardIds: blockerCards.map(c => c._id) });
// Unreviewed N/A steps — incomplete_na_steps treated as non-terminal for RTS
const unreviewedNa = taskCards.filter(c => c.status === "incomplete_na_steps");
if (unreviewedNa.length > 0)
  throw new ConvexError({ code: "RTS_UNREVIEWED_NA_STEPS",
    cardIds: unreviewedNa.map(c => c._id) });

// G5 — PRECONDITION 5: All discrepancies dispositioned
const discrepancies = await ctx.db.query("discrepancies")
  .withIndex("by_work_order", q => q.eq("workOrderId", args.workOrderId)).collect();
const openDiscs = discrepancies.filter(d =>
  d.status !== "dispositioned" && d.status !== "voided");
if (openDiscs.length > 0)
  throw new ConvexError({ code: "RTS_OPEN_DISCREPANCIES",
    discrepancyIds: openDiscs.map(d => d._id) });
const melDiscs = discrepancies.filter(d => d.disposition === "deferred_mel");
for (const d of melDiscs) {
  if (!d.melItemNumber || !d.melCategory || !d.melExpiryDate)
    throw new ConvexError({ code: "RTS_MEL_FIELDS_INCOMPLETE", discrepancyId: d._id });
  if (d.melExpiryDate <= now)
    throw new ConvexError({ code: "RTS_MEL_EXPIRED", discrepancyId: d._id,
      expiredAt: d.melExpiryDate });
}

// G6 — PRECONDITION 6: Signing technician authorized
// Identity check for auth event (CHECK 4 of Section 5)
if (authEvent.technicianId !== args.callerTechnicianId)
  throw new ConvexError({ code: "AUTH_EVENT_IDENTITY_MISMATCH",
    issuedTo: authEvent.technicianId });
const tech = await ctx.db.get(authEvent.technicianId);
if (!tech || tech.status !== "active")
  throw new ConvexError({ code: "RTS_TECH_INACTIVE" });
const cert = await ctx.db.query("certificates")
  .withIndex("by_technician", q => q.eq("technicianId", tech._id))
  .filter(q => q.eq(q.field("active"), true)).first();
if (!cert) throw new ConvexError({ code: "RTS_NO_ACTIVE_CERT" });

// Annual inspection: IA required (signoff-rts-flow.md §1.1.1)
if (wo.workOrderType === "annual_inspection") {
  if (!cert.hasIaAuthorization)
    throw new ConvexError({ code: "RTS_IA_REQUIRED",
      message: "Annual inspection RTS requires IA. Technician holds A&P only." });
  if (!cert.iaExpiryDate || cert.iaExpiryDate < now)
    throw new ConvexError({ code: "RTS_IA_EXPIRED",
      expiredAt: cert.iaExpiryDate,
      message: "IA expired. March 31 rule — no grace period past expiry date." });
  const twentyFourMonthsAgo = now - (24 * 30 * 24 * 60 * 60 * 1000);
  if (!cert.lastExercisedDate || cert.lastExercisedDate < twentyFourMonthsAgo)
    throw new ConvexError({ code: "RTS_RECENT_EXP_LAPSED",
      message: "14 CFR 65.83: IA must have exercised privileges within preceding 24 months." });
}
// Major repair / major alteration: Form 337 reference required (B-P3-02, OI-02)
// [MARCUS RQ CHANGE — form337Reference field added to workOrders in schema-v2.1]
if (wo.workOrderType === "major_repair" || wo.workOrderType === "major_alteration") {
  if (!wo.form337Reference?.trim())
    throw new ConvexError({ code: "RTS_FORM_337_REQUIRED",
      message: "Major repair/alteration requires a Form 337 reference. " +
               "Record the FAA Form 337 number or field approval reference " +
               "on the work order before authorizing RTS. " +
               "Per 14 CFR 43.9 and Appendix B, major repair/alteration records " +
               "must include a Form 337." });
}
// Part 145 scope check
const org = await ctx.db.get(orgId);
if (org?.part145CertificateNumber) {
  const rsAuth = cert.repairStationAuthorizations?.find(a => a.organizationId === orgId);
  if (!rsAuth)
    throw new ConvexError({ code: "RTS_NOT_AUTHORIZED_FOR_ORG",
      message: "Technician not on Part 145 authorized personnel list for this org." });
}

// G7 — PRECONDITION 7: AD compliance reviewed (annual and 100-hour only)
if (wo.workOrderType === "annual_inspection" || wo.workOrderType === "100hr_inspection") {
  // Marcus Phase 3 exit blocker (compliance-validation.md §5.4): vacuous-truth prevention.
  // If zero adCompliance records exist for this aircraft, the aircraft has not been reviewed.
  // A clean bill of health requires a positive assertion, not the absence of findings.
  const adRecords = await ctx.db.query("adCompliance")
    .withIndex("by_aircraft", q => q.eq("aircraftId", wo.aircraftId))
    .filter(q => q.eq(q.field("applicable"), true)).collect();
  if (adRecords.length === 0)
    throw new ConvexError({ code: "RTS_ZERO_AD_RECORDS",
      message: "No AD compliance records exist for this aircraft. " +
               "Per compliance-validation.md §5.4, zero records is an anomaly " +
               "— even a new Cessna 172 has ADs. " +
               "Create at least one adCompliance record (complied, N/A, or pending) " +
               "before authorizing RTS on an annual or 100-hour inspection." });
  const overdueAds = adRecords.filter(r => {
    if (r.complianceStatus === "not_complied") return true;
    if (r.complianceStatus !== "complied_recurring") return false;
    const calendarOverdue = r.nextDueDate && now > r.nextDueDate;
    const hoursOverdue = r.nextDueHours && aircraft.totalTimeAirframeHours > r.nextDueHours;
    return calendarOverdue || hoursOverdue;
  });
  if (overdueAds.length > 0)
    throw new ConvexError({ code: "RTS_AD_OVERDUE",
      adIds: overdueAds.map(r => r._id),
      message: `${overdueAds.length} AD(s) are overdue or not complied. ` +
               "Record compliance before authorizing RTS." });
  const pendingDetermination = adRecords.filter(r =>
    r.complianceStatus === "pending_determination");
  if (pendingDetermination.length > 0)
    throw new ConvexError({ code: "RTS_AD_PENDING_DETERMINATION",
      adIds: pendingDetermination.map(r => r._id),
      message: "AD compliance records in pending_determination status past their " +
               "effective date block RTS. Determine applicability for each." });
}

// G8 — PRECONDITION 8: Required maintenance record signatures
const mrecs = await ctx.db.query("maintenanceRecords")
  .withIndex("by_work_order", q => q.eq("workOrderId", args.workOrderId)).collect();
if (mrecs.length === 0)
  throw new ConvexError({ code: "RTS_NO_MAINTENANCE_RECORDS" });
const unsignedRecs = mrecs.filter(r => !r.signatureHash?.trim());
if (unsignedRecs.length > 0)
  throw new ConvexError({ code: "RTS_UNSIGNED_RECORD",
    recordIds: unsignedRecs.map(r => r._id) });

// G9 — PRECONDITION 9: RTS statement content
// [MARCUS RQ-06 CHANGE] Phase 2 spec had a 50-char floor. Marcus raised this to 75 and
// added keyword checks. Three separate assertions with three error codes.
// compliance-validation.md §1 (RQ-06): "Three separate assertions, three separate error codes.
// Do not collapse them — the frontend error handler must tell the technician exactly what is missing."
const stmt = args.returnToServiceStatement.trim();
if (stmt.length < 75)
  throw new ConvexError({ code: "RTS_STATEMENT_TOO_SHORT",
    length: stmt.length, required: 75 });
const hasCitation = /14 cfr/i.test(stmt) || /part 43/i.test(stmt);
if (!hasCitation)
  throw new ConvexError({ code: "RTS_STATEMENT_NO_CITATION",
    message: "Statement must contain '14 CFR' or 'Part 43'." });
const hasDetermination = /return/i.test(stmt) || /airworthy/i.test(stmt);
if (!hasDetermination)
  throw new ConvexError({ code: "RTS_STATEMENT_NO_DETERMINATION",
    message: "Statement must contain 'return' or 'airworthy'." });
```

**Execution Sequence (after all 9 guards pass):**

```typescript
// Step 1 — Consume signatureAuthEvent (CHECK 5 of Section 5 six-check)
// CHECK 5 and the primary write (CHECK 6) are in the same transaction.
await ctx.db.patch(args.signatureAuthEventId, {
  consumed: true, consumedAt: now,
  consumedByTable: "returnToService", consumedByRecordId: null, // patched in Step 3
});

// Step 2 — Compute SHA-256 signature hash over canonical RTS fields
// Field ordering is deterministic and version-tracked (compliance-validation.md §2 Item 6).
// Hash input includes: workOrderId, aircraftId, organizationId, signedByIaTechnicianId,
// iaCertificateNumber, returnToServiceDate, returnToServiceStatement, aircraftHoursAtRts,
// limitations, iaCurrentOnRtsDate. Excludes signatureHash itself and createdAt.
// hashAlgorithmVersion written to record — required per compliance-validation.md §4.3 condition 1.
const hashPayload = canonicalRtsJson({ ...rtsFields });
const signatureHash = await computeSha256(hashPayload);

// Step 3 — Insert returnToService record (immutable — no updatedAt field)
const rtsId = await ctx.db.insert("returnToService", {
  workOrderId: args.workOrderId,
  aircraftId: wo.aircraftId,
  organizationId: orgId,
  signedByIaTechnicianId: tech._id,
  iaCertificateNumber: cert.certificateNumber,           // snapshot
  iaRepairStationCert: org?.part145CertificateNumber,   // snapshot if Part 145
  iaCurrentOnRtsDate: wo.workOrderType === "annual_inspection", // computed in G6
  returnToServiceDate: now,
  returnToServiceStatement: stmt,
  aircraftHoursAtRts: args.aircraftHoursAtRts,
  limitations: args.limitations,
  signatureHash,
  hashAlgorithmVersion: "sha256-v1",
  signatureTimestamp: now,
  signatureAuthEventId: args.signatureAuthEventId,
  createdAt: now,
});

// Step 4 — Patch consumed event with record ID (CHECK 6 complete)
await ctx.db.patch(args.signatureAuthEventId, { consumedByRecordId: rtsId });

// Step 5 — Update work order
await ctx.db.patch(args.workOrderId, {
  status: "closed", returnToServiceId: rtsId, returnedToService: true,
  closedAt: now, closedByUserId: callerUserId, closedByTechnicianId: tech._id,
  updatedAt: now,
});

// Step 6 — Update aircraft total time and status
await ctx.db.patch(wo.aircraftId, {
  totalTimeAirframeHours: args.aircraftHoursAtRts,
  totalTimeAirframeAsOfDate: now,
  status: "airworthy",
  // compliance-validation.md §2 Item 7: lastExercisedDate must update at ALL signature events
  updatedAt: now,
});
// Also update technician's lastExercisedDate (per compliance-validation.md §2 Item 7)
await ctx.db.patch(tech._id, { lastExercisedDate: now, updatedAt: now });

// Step 7 — Audit log (Section 6.5 of signoff-rts-flow.md — five required entries)
await ctx.db.insert("auditLog", { organizationId: orgId, eventType: "record_signed",
  tableName: "returnToService", recordId: rtsId, userId: callerUserId,
  technicianId: tech._id, timestamp: now,
  notes: `RTS authorized. Cert: ${cert.certificateNumber}. ` +
         `IA current: ${wo.workOrderType === "annual_inspection"}. ` +
         `Aircraft TT: ${args.aircraftHoursAtRts}. Hash: ${signatureHash.substring(0,16)}…` });
await ctx.db.insert("auditLog", { organizationId: orgId, eventType: "status_changed",
  tableName: "workOrders", recordId: args.workOrderId, userId: callerUserId,
  technicianId: tech._id, timestamp: now,
  fieldName: "status", oldValue: JSON.stringify("pending_signoff"),
  newValue: JSON.stringify("closed"), notes: `returnToServiceId: ${rtsId}` });
await ctx.db.insert("auditLog", { organizationId: orgId, eventType: "status_changed",
  tableName: "aircraft", recordId: wo.aircraftId, userId: callerUserId,
  technicianId: tech._id, timestamp: now,
  fieldName: "status", newValue: JSON.stringify("airworthy"), notes: `workOrderId: ${args.workOrderId}` });
```

**Failed-attempt logging** (signoff-rts-flow.md §6.6): When the mutation throws on any precondition, the
catch block in the calling layer must still write an `access_denied` audit entry. The mutation itself does
not catch — it throws and the upstream handler logs. Marcus's note: "A pattern of failed RTS attempts
on a single work order is an anomaly an inspector may investigate."

**Invariant enforcement notes:**
- INV: `returnToService` has no `updatedAt` field and no update mutation. Immutable after creation.
- INV-05: six-check consumption is atomic with primary write (Steps 1–4 in same transaction).
- INV (compliance-validation.md §4.3): No `deleteSignatureAuthEvent` mutation may ever exist.
- `hashAlgorithmVersion` is required; field ordering for hash computation must be documented
  and deterministic (compliance-validation.md §2 Item 6, §4.3).

**Cilla's expected test cases:**
- RTS-01: All 9 preconditions pass → success, WO closed, aircraft airworthy
- RTS-02: Consumed auth event → `RTS_AUTH_EVENT_CONSUMED`
- RTS-03: Annual WO, signer lacks IA → `RTS_IA_REQUIRED`
- RTS-04: Annual WO, IA expired April 1 → `RTS_IA_EXPIRED` (March 31 hard cutoff)
- RTS-05: Annual WO, zero AD records → `RTS_ZERO_AD_RECORDS` (Marcus vacuous-truth blocker)
- RTS-06: Statement 60 chars, valid keywords → `RTS_STATEMENT_TOO_SHORT` **[RQ-06]**
- RTS-07: Statement 80 chars, no citation → `RTS_STATEMENT_NO_CITATION` **[RQ-06]**
- RTS-08: Statement 80 chars with "14 CFR Part 43", no "return"/"airworthy" → `RTS_STATEMENT_NO_DETERMINATION` **[RQ-06]**
- RTS-09: Major repair WO, form337Reference null → `RTS_FORM_337_REQUIRED` **[B-P3-02]**
- RTS-10: Overdue recurring AD → `RTS_AD_OVERDUE`
- RTS-11: TT submitted ≠ WO close TT → `RTS_TIME_MISMATCH`
- RTS-12: Re-run same mutation after success → `RTS_ALREADY_SIGNED` (idempotency guard)

---

## Priority 2 — AD Compliance Module

### Mutation 2: `createAdCompliance` — B-P3-05

**File:** `convex/mutations/adCompliance/createAdCompliance.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`
**Context:** This is the entry point to the entire compliance chain. Every other AD mutation and the
`checkAdDueForAircraft` query presupposes a record exists. Marcus's Phase 3 exit blocker
(compliance-validation.md §5.4): zero records → vacuous-truth pass on annual close. This mutation
prevents that failure mode by requiring creation before any annual can close.

**Guard Sequence (ordered):**
```typescript
// G1: AUTH
const { orgId, identity } = await requireOrgMembership(ctx, "amt");
// G2: Fetch AD record
const ad = await ctx.db.query("airworthinessDirectives")
  .withIndex("by_ad_number", q => q.eq("adNumber", args.adNumber)).first();
if (!ad) throw new ConvexError({ code: "AD_NOT_FOUND", adNumber: args.adNumber });
// G3: Fetch aircraft
const aircraft = await ctx.db.get(args.aircraftId);
if (!aircraft || aircraft.organizationId !== orgId)
  throw new ConvexError({ code: "AIRCRAFT_NOT_FOUND_OR_ORG_MISMATCH" });
// G4: Duplicate prevention — one adCompliance record per AD per aircraft
const existing = await ctx.db.query("adCompliance")
  .withIndex("by_aircraft", q => q.eq("aircraftId", args.aircraftId))
  .filter(q => q.eq(q.field("adId"), ad._id)).first();
if (existing) throw new ConvexError({ code: "AD_COMPLIANCE_RECORD_EXISTS",
  existingId: existing._id,
  message: "An adCompliance record for this AD and aircraft already exists. " +
           "Use recordAdCompliance to update compliance status." });
// G5: [MARCUS RQ CHANGE — vacuous-truth prevention]
// approvedDataReference on the linked AD must cite the AD number. This is enforced
// at creation time so that every record starts with a valid citation.
// compliance-validation.md §5.4 and Rosa's note: "even a brand-new Cessna 172 has ADs."
// The field on the adCompliance record being created does NOT need the citation at creation
// (citation is on the maintenance record, captured in recordAdCompliance).
// What is enforced at creation: if caller provides an approvedDataReference, it must
// cite the AD number to prevent vacuous-truth entries.
if (args.initialApprovedDataReference) {
  if (!args.initialApprovedDataReference.includes(args.adNumber))
    throw new ConvexError({ code: "AD_COMPLIANCE_RECORD_NO_AD_CITATION",
      adNumber: args.adNumber,
      message: `approvedDataReference must cite the AD number "${args.adNumber}". ` +
               "A maintenance record that does not reference the governing AD is not " +
               "proof of compliance (compliance-validation.md §2 Item 3)." });
}
// G6: Caller technician active
const tech = await ctx.db.get(args.callerTechnicianId);
if (!tech || tech.status !== "active" || tech.organizationId !== orgId)
  throw new ConvexError({ code: "TECHNICIAN_NOT_ACTIVE_IN_ORG" });
```

**Execution Sequence:**
```typescript
// Initial complianceStatus is always pending_determination (ad-compliance-module.md §2.1).
// Applicability is not asserted at creation — that is the technician's regulated determination.
const adComplianceId = await ctx.db.insert("adCompliance", {
  adId: ad._id, adNumber: args.adNumber, aircraftId: args.aircraftId,
  organizationId: orgId,
  applicable: null,                         // not yet determined
  complianceStatus: "pending_determination",
  complianceHistory: [],
  maintenanceRecordIds: [],
  applicabilityDeterminedById: null,
  applicabilityDeterminationDate: null,
  applicabilityDeterminationNotes: args.initialNote ?? null,
  createdAt: now, updatedAt: now,
});
await ctx.db.insert("auditLog", { organizationId: orgId, eventType: "record_created",
  tableName: "adCompliance", recordId: adComplianceId, userId: identity.subject,
  technicianId: args.callerTechnicianId, timestamp: now,
  notes: `AD compliance record created for AD ${args.adNumber} on aircraft ${args.aircraftId}. ` +
         `Status: pending_determination.` });
return adComplianceId;
```

**Invariant enforcement notes:**
- The initial status is always `pending_determination`. Never auto-confirm applicability.
- A record in `pending_determination` is surfaced at the same dashboard priority as `not_complied`
  (compliance-validation.md §5.4 / ad-compliance-module.md §2.2).

**Cilla's expected test cases:**
- AD-CREATE-01: Duplicate AD on same aircraft → `AD_COMPLIANCE_RECORD_EXISTS`
- AD-CREATE-02: approvedDataReference provided but omits AD number → `AD_COMPLIANCE_RECORD_NO_AD_CITATION`
- AD-CREATE-03: Unknown AD number → `AD_NOT_FOUND`
- AD-CREATE-04: Success → status is `pending_determination`, auditLog entry present

---

### Mutation 3: `recordAdCompliance` — B-P3-05

**File:** `convex/mutations/adCompliance/recordAdCompliance.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`

**Guard Sequence (ordered — includes Marcus's citation check from compliance-validation.md §2 Item 3):**
```typescript
// G1: AUTH
// G2: Fetch adCompliance record; org isolation
// G3: Assert applicable == true and status NOT "not_applicable"
//     → throw AD_COMPLIANCE_NOT_APPLICABLE
// G4: [MARCUS RQ CHANGE — compliance-validation.md §2 Item 3, Rosa's note]
//     "A maintenance record that does not cite the AD is not proof of AD compliance."
//     Fetch maintenanceRecord by args.maintenanceRecordId.
//     Assert maintenanceRecord.approvedDataReference includes adCompliance.adNumber.
//     → throw AD_COMPLIANCE_RECORD_NO_AD_CITATION { adNumber, maintenanceRecordId }
//     This is a Phase 3 exit blocker per Marcus. It was missing from Phase 2 spec.
// G5: No backdating — complianceDate >= last entry in complianceHistory (if any)
//     → throw AD_COMPLIANCE_BACKDATING_PROHIBITED
// G6: aircraftHoursAtCompliance >= last compliance hours (if any)
//     → throw AD_COMPLIANCE_HOURS_REGRESSION
// G7: [RQ-02] If AD complianceType includes "cycles": aircraft.totalTimeAirframeAsOfDate
//     must have cycles on record → throw AD_COMPLIANCE_CYCLES_REQUIRED
// G8: Section 5 six-check consumption (mutation-implementation.md §5)
```

**Execution Sequence:**
```typescript
// 1. Consume signatureAuthEvent (Section 5, atomic with primary write)
// 2. Append to complianceHistory[]: { complianceDate, aircraftHoursAtCompliance,
//    aircraftCyclesAtCompliance, technicianId, maintenanceRecordId,
//    complianceMethodUsed, notes }
// 3. Update denormalized fields: lastComplianceDate, lastComplianceHours, lastComplianceCycles
// 4. Recompute nextDue* fields from ad.recurringInterval* fields (ad-compliance-module.md §2.3)
//    Calendar: nextDueDate = lastComplianceDate + (recurringIntervalDays × 86400000)
//    Hours:    nextDueHours = lastComplianceHours + recurringIntervalHours
//    For one_time AD: clear all nextDue* fields
// 5. Set complianceStatus: "complied_one_time" | "complied_recurring" per ad.adType
// 6. Append maintenanceRecordId to maintenanceRecordIds[]
// 7. Update tech.lastExercisedDate (compliance-validation.md §2 Item 7 — all signature events)
// 8. Audit log: eventType "ad_compliance_updated", all required fields
```

**Cilla's expected test cases:**
- AD-COMP-01: maintenanceRecord.approvedDataReference omits AD number → `AD_COMPLIANCE_RECORD_NO_AD_CITATION` **[MARCUS]**
- AD-COMP-02: Backdating attempt → `AD_COMPLIANCE_BACKDATING_PROHIBITED`
- AD-COMP-03: AD not applicable → `AD_COMPLIANCE_NOT_APPLICABLE`
- AD-COMP-04: Cycles AD, aircraft has no cycle counter → `AD_COMPLIANCE_CYCLES_REQUIRED` **[RQ-02]**
- AD-COMP-05: Recurring AD → nextDueDate and nextDueHours computed correctly

---

### Mutation 4: `markAdNotApplicable` — B-P3-05

**File:** `convex/mutations/adCompliance/markAdNotApplicable.ts`
**AUTH:** `requireOrgMembership(ctx, "inspector")`
**[MARCUS RQ CHANGE]** Phase 2 spec did not specify authorization level for N/A marking.
Marcus in compliance-validation.md §3.2 notes: "for complex applicability determinations,
IA authorization is strongly recommended." The gate review blocker B-P3-05 requires enforcement.
For categories where the AD involves structural integrity or propulsion systems
(ad.complianceType includes "structural" or "propulsion"), require `inspector` minimum.
For administrative or equipment ADs, `amt` is sufficient. The mutation checks `ad.category` to
branch the minimum role. Since the auth wrapper gates at `inspector` as the safe default, a future
optimization can relax this per ad.category by upgrading the auth check to two-phase.

**Guard Sequence:**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "inspector")
// G2: Fetch adCompliance; org isolation
// G3: Status must be "pending_determination" or "not_complied"
//     → throw AD_MARK_NA_HAS_COMPLIANCE_HISTORY if complianceHistory.length > 0
//       "Cannot mark N/A a record with compliance history — falsification scenario."
// G4: notApplicableReason must be non-empty AND length >= 20 chars
//     → throw AD_MARK_NA_REASON_TOO_SHORT { length, required: 20 }
//       (per ad-compliance-module.md §3.2 — minimum content enforcement)
// G5: Caller technician active with valid certificate
// G6: Section 5 six-check consumption
```

**Execution Sequence:**
```typescript
// Consume signatureAuthEvent → set applicable: false, complianceStatus: "not_applicable",
// applicabilityDeterminationNotes, applicabilityDeterminedById, applicabilityDeterminationDate.
// N/A record is permanent — NOT deleted. Retained with aircraft per 14 CFR 91.417(a)(2)(v).
// Audit log: eventType "ad_compliance_updated", newValue includes { status, reason }.
```

**Cilla's expected test cases:**
- AD-NA-01: Record has compliance history → `AD_MARK_NA_HAS_COMPLIANCE_HISTORY`
- AD-NA-02: notApplicableReason is "N/A" (2 chars) → `AD_MARK_NA_REASON_TOO_SHORT`
- AD-NA-03: Success → record retained, status "not_applicable", auditLog entry

---

### Mutation 5: `supersedAd` — B-P3-05

**File:** `convex/mutations/adCompliance/supersedAd.ts`
**AUTH:** `requireOrgMembership(ctx, "dom")`
**Rationale:** Supersession updates affect every aircraft linked to the old AD. This is a fleet-wide
regulatory change requiring DOM-level authority (ad-compliance-module.md §4.2).

**Guard Sequence:**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "dom")
// G2: Fetch old AD by args.oldAdId
// G3: Fetch new AD by args.newAdId; assert it exists and its effectiveDate >= old AD effectiveDate
// G4: Assert old AD not already superseded — throw AD_ALREADY_SUPERSEDED
// G5: Caller technician active
```

**Execution Sequence:**
```typescript
// 1. Patch old airworthinessDirective: supersededByAdId = newAdId
// 2. Patch new airworthinessDirective: supersedesAdId = oldAdId
// 3. For all adCompliance records linked to oldAdId (query by_ad(oldAdId)):
//    a. Patch: complianceStatus = "superseded"
//    b. Insert new adCompliance record for newAdId, same aircraftId/engineId/partId:
//       complianceStatus = "pending_determination"
//       applicabilityDeterminationNotes = "Supersedes AD [oldAdNumber]. Prior compliance
//         on [lastComplianceDate] at [lastComplianceHours] TT. Review new AD applicability."
//    c. Audit log entry per affected aircraft
// 4. Master audit log: supersession event, count of affected compliance records
```

**Invariant enforcement notes:**
- The "pending_determination" state for all aircraft affected by a supersession ensures that
  the AD overdue check in `authorizeReturnToService` PRECONDITION 7 will surface these for
  human review. A `superseded` old record + no new compliance record = dashboard urgency item.
- Compliance carry-forward (ad-compliance-module.md §4.3) requires a technician call to
  `recordAdCompliance` on the new AD — the system never auto-carries forward.

**Cilla's expected test cases:**
- AD-SUPER-01: Old AD already superseded → `AD_ALREADY_SUPERSEDED`
- AD-SUPER-02: Success on fleet of 5 aircraft → 5 new pending_determination records, 5 old superseded
- AD-SUPER-03: `authorizeReturnToService` on annual after supersession → `RTS_AD_PENDING_DETERMINATION`

---

### Query 6: `checkAdDueForAircraft` — B-P3-05

**File:** `convex/queries/adCompliance/checkAdDueForAircraft.ts`
**AUTH:** `requireOrgMembership(ctx, "viewer")`
**This is a query — no writes.**
**Rosa's note (compliance-validation.md §3.2):** "The key word is 'live.' If the system used a cached
field, the check reads the wrong number." Authoritative overdue determination uses live aircraft hours
from the aircraft record, not cached nextDueHours. The cached fields are for display and sorting only.

**Guard and Query Logic:**
```typescript
// G1: AUTH
// G2: Fetch aircraft; org isolation
// G3: Fetch all adCompliance.by_aircraft where applicable == true
//     AND complianceStatus NOT IN ["not_applicable", "superseded"]
// G4: Fetch installed engines; for each, fetch adCompliance.by_engine
// G5: Fetch installed parts (life-limited); for each, fetch adCompliance.by_part
// G6: For each adCompliance record, compute live overdue status:
//     Calendar: asOfDate > record.nextDueDate  (asOfDate defaults to Date.now())
//     Hours: aircraft.totalTimeAirframeHours > record.nextDueHours  ← LIVE, not cached
//     Cycles: aircraft.totalTimeAirframeCycles > record.nextDueCycles (if applicable)
//     isOverdue = any one condition true (calendar-OR-hours per ad-compliance-module.md §2.3)
//
// isDueSoon thresholds (org-configurable per ad-compliance-module.md §3.3):
//     calendar: 30 days; hours: 10 hours
//
// [MARCUS RQ CHANGE — compliance-validation.md §3.3]
// Add percentWindowConsumed for not_complied ADs within initial compliance window.
// Rosa: "Surface on pre-flight summary for not_complied ADs with >75% window consumed."
// percentWindowConsumed = hoursConsumed / initialComplianceHours (or daysConsumed / initialComplianceDays)
```

**Return type:**
```typescript
{
  adComplianceId, adId, adNumber, adTitle, complianceStatus,
  isOverdue: boolean,
  isDueSoon: boolean,
  nextDueDate?: number, nextDueHours?: number, nextDueCycles?: number,
  hoursRemaining?: number,    // nextDueHours - currentTT; negative means overdue
  daysRemaining?: number,
  percentWindowConsumed?: number,  // only for not_complied within initial window
  appliesTo: "aircraft" | "engine" | "part",
  appliesToId: string,
}[]
// Sorted: overdue first, then due-soon, then all others by furthest-out next-due
```

**Cilla's expected test cases:**
- AD-CHECK-01: Calendar overdue (date past) → isOverdue true
- AD-CHECK-02: Hours overdue (TT > nextDueHours) → isOverdue true **[Rosa's live-hours requirement]**
- AD-CHECK-03: Calendar fine, hours overdue → isOverdue true (OR logic)
- AD-CHECK-04: Not complied, within initial window → isOverdue false, percentWindowConsumed computed
- AD-CHECK-05: AD in "superseded" status → excluded from results

---

## Priority 3 — Work Order Lifecycle

### Mutations 7a & 7b: `placeWorkOrderOnHold` / `releaseWorkOrderHold` — UM-05

The canonical full implementation of `placeWorkOrderOnHold` is specified in mutation-implementation.md §2.2.
That specification is authoritative and complete. This section adds precision on fields not explicitly
listed there, and specifies `releaseWorkOrderHold` in full.

**`placeWorkOrderOnHold`** — `convex/mutations/workOrders/placeWorkOrderOnHold.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")`
**Guard sequence, error codes, audit format:** per mutation-implementation.md §2.2 exactly.
**Fields written:** `status → "on_hold"`, `onHoldReason`, `onHoldType`, `onHoldAt`, `onHoldByTechnicianId`, `updatedAt`.

**`releaseWorkOrderHold`** — `convex/mutations/workOrders/releaseWorkOrderHold.ts`
**AUTH:** `requireOrgMembership(ctx, "supervisor")`
**Rationale:** Releasing a hold re-authorizes work to continue. Supervisor minimum required
(per mutation-implementation.md §3.1).

**Guard Sequence:**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "supervisor")
// G2: Fetch WO → WO_NOT_FOUND
// G3: Org isolation → WO_ORG_MISMATCH
// G4: wo.status === "on_hold" → WO_NOT_ON_HOLD
// G5: If holdType === "engineering_review": releaseNotes non-empty
//     → WO_HOLD_RELEASE_NOTES_REQUIRED
// G6: Caller technician active in org → TECHNICIAN_NOT_ACTIVE_IN_ORG
```

**Execution Sequence:**
```typescript
// Patch: status → "in_progress", onHoldReleasedAt → now,
//        onHoldReleasedByTechnicianId → callerTechnicianId,
//        onHoldReason → null, onHoldType → null  (cleared on release)
// Audit log: eventType "status_changed", old "on_hold", new "in_progress",
//            notes include releaseNotes if provided
```

**Invariant:** `onHoldReason` and `onHoldType` cleared on release. Stale hold metadata must not
persist into `in_progress` state. **Cilla tests:** UM05-01 (hold from in_progress), UM05-02 (hold
from draft → `WO_INVALID_STATE_FOR_HOLD`), UM05-03 (release requires supervisor role),
UM05-04 (engineering_review release, empty notes → `WO_HOLD_RELEASE_NOTES_REQUIRED`).

---

### Mutations 8a & 8b: `submitForInspection` / `flagOpenDiscrepancies` — UM-06

Both mutations are fully specified in mutation-implementation.md §3.2. This section affirms those
specifications and adds Cilla's test references.

**`submitForInspection`** — `convex/mutations/workOrders/submitForInspection.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")` | transition: `in_progress → pending_inspection`
**Guards (in order):** WO exists → org isolation → status `in_progress` → all task cards terminal
(complete/voided/incomplete_na_steps) → no open interruptions (BP-01 pre-check,
`taskCardInterruptions.by_work_order` where `resumedAt == null`) → caller technician active.
**Cilla tests:** UM06-01 (happy path), UM06-02 (task card still in_progress → `WO_TASK_CARDS_INCOMPLETE`),
UM06-03 (open interruption blocks submission → `WO_OPEN_INTERRUPTIONS_BLOCK` **[BP-01 pre-check]**).

**`flagOpenDiscrepancies`** — `convex/mutations/workOrders/flagOpenDiscrepancies.ts`
**AUTH:** `requireOrgMembership(ctx, "amt")` | transition: `in_progress → open_discrepancies`
**Guards (in order):** WO exists → org isolation → status `in_progress` → at least one open/under-
evaluation discrepancy exists → caller technician active.
Error codes: per mutation-implementation.md §3.2 exactly.
**Cilla tests:** UM06-04 (no open discrepancies → `WO_NO_OPEN_DISCREPANCIES`), UM06-05 (happy path).

---

## Priority 4 — Task Card Execution

### Mutation 9: `reviewNAStep` — UM-01

**File:** `convex/mutations/taskCards/reviewNAStep.ts`
**AUTH:** `requireOrgMembership(ctx, "inspector")`
**Rationale:** Per 14 CFR 65.91, only an IA may make the determination that N/A is appropriate on
an inspection step that required IA sign-off (task-card-execution.md §1.1 and §4 in Phase 2 spec).
This is not a supervisory decision. It is an IA regulatory decision.

**Guard Sequence (ordered):**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "inspector") → orgId, callerUserId
// G2: Fetch step → TC_STEP_NOT_FOUND
// G3: Org isolation → TC_STEP_ORG_MISMATCH
// G4: step.taskCardId === args.taskCardId → TC_STEP_CARD_MISMATCH
// G5: step.status === "na" → TC_STEP_NOT_NA
//     "reviewNAStep can only be called on steps in 'na' status. Current: [status]."
// G6: step.signOffRequiresIa === true → TC_STEP_IA_REVIEW_NOT_REQUIRED
//     "This step does not require IA review. signOffRequiresIa is false."
// G7: taskCard.status === "incomplete_na_steps" → TC_CARD_NOT_AWAITING_REVIEW
// G8: IA currency check — fetch certificates.by_type for (callerTechnicianId, "IA")
//     where active == true AND hasIaAuthorization == true AND iaExpiryDate >= now
//     → throw IA_CERT_NOT_CURRENT
//     (March 31 rule: iaExpiryDate is always March 31 23:59:59 UTC of the applicable year.
//      Yesterday is too late — no grace period. Per auth-platform-wiring.md §3.3.)
// G9: reviewNotes non-empty → TC_REVIEW_NOTES_REQUIRED
//     "IA's N/A review determination is a regulatory decision and must be documented."
// G10: [RQ-05] Validate ratingsExercised against cert.ratings[]
//      → throw SIGN_RATING_NOT_HELD { selected, held }
// G11: Section 5 six-check signatureAuthEvent consumption
```

**Execution Sequence — Branch A (`reviewDecision === "concur_na"`):**
```typescript
// Patch step: naReviewedByIaId → callerTechnicianId, naReviewedAt → now,
//             naReviewDecision → "concur_na", naReviewNotes → reviewNotes,
//             signatureAuthEventId → consumed event ID, updatedAt → now
// Recount all taskCardSteps for this card.
// If no steps remain in "na" status with ia review still pending:
//   Patch taskCard: status → "complete", completedAt → now, updatedAt → now
// Audit log: eventType "record_signed", tableName "taskCardSteps",
//   notes "IA concurred N/A appropriate. Step [N]. IA cert [certNumber]. [reviewNotes]"
// Update tech.lastExercisedDate (compliance-validation.md §2 Item 7)
```

**Execution Sequence — Branch B (`reviewDecision === "reject_na"`):**
```typescript
// Patch step: status → "pending"
//   IMPORTANT: naReason, naAuthorizedById, naAuthorizedAt RETAINED in document.
//   naReviewDecision → "reject_na", naReviewNotes → reviewNotes, naReviewedByIaId → callerTechnicianId
//   naReviewedAt → now, updatedAt → now
//   (Prior N/A signing data is preserved as the permanent chain-of-custody record.
//    The step reverts to pending but the history of who authorized the N/A and why
//    it was rejected is immutable in the document.)
// Patch taskCard: status → "in_progress", updatedAt → now
// Audit log: eventType "status_changed", tableName "taskCardSteps",
//   notes "IA rejected N/A. Step [N] reverted to pending. Cert [certNumber]. [reviewNotes]"
```

**Invariant enforcement notes:**
- INV-05: auth event consumed atomically with G11 before any execution step.
- "Prior N/A signing data is not cleared on reject" — chain of custody is preserved.
  The IA's rejection adds to the record; it does not erase the original N/A determination.

**Cilla's expected test cases:**
- UM01-01: Step status != "na" → `TC_STEP_NOT_NA`
- UM01-02: Caller IA expired yesterday → `IA_CERT_NOT_CURRENT` **[March 31 rule]**
- UM01-03: reviewNotes empty → `TC_REVIEW_NOTES_REQUIRED`
- UM01-04: Concur on last pending IA review → card transitions to "complete"
- UM01-05: Reject → step reverts to "pending", prior N/A data preserved in document
- UM01-06: Rating selected not held → `SIGN_RATING_NOT_HELD` **[RQ-05]**

---

### Mutation 10: `counterSignStep` — UM-02

**File:** `convex/mutations/taskCards/counterSignStep.ts`
**AUTH:** `requireOrgMembership(ctx, "inspector")`
**Context:** Writes to `taskCardStepCounterSignatures` (SE-01 table from schema-v2.1.md).
This mutation requires SE-01 to exist in the schema — it is a Phase 4 schema dependency.
Per task-card-execution.md §3.1, the counter-signature is a distinct regulatory act from the
primary step sign-off (different person, different authority, different certificate).

**Guard Sequence (ordered):**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "inspector")
// G2: Fetch step → TC_STEP_NOT_FOUND
// G3: Org isolation → TC_STEP_ORG_MISMATCH
// G4: step.taskCardId === args.taskCardId → TC_STEP_CARD_MISMATCH
// G5: step.status === "completed" → TC_STEP_NOT_SIGNED_BY_PRIMARY
//     "counterSignStep requires the step to be in 'completed' status (primary AMT signed).
//      Call completeStep first."
// G6: step.signOffRequiresIa === true OR step.requiresDualSignOff === true
//     → TC_COUNTER_SIGN_NOT_REQUIRED
// G7: No existing counter-signature for this step
//     Query taskCardStepCounterSignatures.by_step where stepId == args.stepId
//     → TC_COUNTER_SIGN_ALREADY_EXISTS
//     "Each step may only receive one counter-signature."
// G8: If counterSignType === "ia_inspection": IA currency check (same as reviewNAStep G8)
//     → IA_CERT_NOT_CURRENT
// G9: [RQ-05] Validate ratingsExercised against cert.ratings[]
//     → SIGN_RATING_NOT_HELD { selected, held }
// G10: [INV-21 — same-person guard]
//      If callerTechnicianId === step.signedByTechnicianId:
//        Only valid if counterSignType === "ia_inspection" AND caller holds IA.
//        A same-person dual_amt counter-sign is not valid — an A&P cannot be their own
//        second A&P for dual sign-off. (task-card-execution.md §5.2 and §6 Marcus annotation)
//      → throw TC_COUNTER_SIGN_SELF_DUAL_AMT
//        "A technician cannot be their own second A&P for dual sign-off. " +
//        "Two-person sign-off requires a distinct second certificate holder. " +
//        "An IA may counter-sign their own primary A&P work (two-hat scenario), " +
//        "but only under counterSignType 'ia_inspection'."
// G11: scopeStatement non-empty → TC_SCOPE_STATEMENT_REQUIRED
// G12: Section 5 six-check signatureAuthEvent consumption
```

**Execution Sequence:**
```typescript
// 1. Fetch caller's active certificate for snapshot fields
// 2. Insert taskCardStepCounterSignatures:
//    stepId, taskCardId, workOrderId (from step doc), organizationId
//    counterSignType → args.counterSignType
//    counterSignedByTechnicianId → callerTechnicianId
//    counterSignedLegalName → cert.legalName           ← SNAPSHOT at signing time
//    counterSignedCertNumber → cert.certificateNumber   ← SNAPSHOT at signing time
//    counterSignedAt → now
//    counterSignRatingsExercised → args.ratingsExercised
//    counterSignatureAuthEventId → consumed event ID
//    counterSignatureHash: sha256(canonicalCounterSignJson(...))
//    scopeStatement → args.scopeStatement.trim()
//    createdAt → now
// 3. Patch step: updatedAt → now
//    (Step status remains "completed" — counter-signature is additive, not a status change)
// 4. Update tech.lastExercisedDate
// 5. Audit log: eventType "record_signed", tableName "taskCardStepCounterSignatures",
//    recordId → new counter-signature ID,
//    notes "Counter-signature on step [N]. Type: [counterSignType]. " +
//          "Cert: [certNumber]. Ratings: [ratingsExercised]. Scope: [first 100 chars]."
```

**Invariant enforcement notes:**
- INV-05: the counter-signature's auth event is distinct from the primary step's auth event.
  Two different auth events must be consumed for a dual-signed step. Neither is reusable.
- Snapshot principle: `counterSignedLegalName` and `counterSignedCertNumber` are written at
  signing time. Certificate revocation after signing does not alter the historical record.
- INV-21 (same-person guard at G10): prevents the structural weakening of dual sign-off
  by the same person presenting as both signer and counter-signer under AMT roles.
  An IA who also holds A&P may counter-sign their own work — that is legally permissible
  (task-card-execution.md §5.2 Marcus annotation) — but only under `ia_inspection` type.

**Cilla's expected test cases:**
- UM02-01: Step status "pending" (not yet signed by AMT) → `TC_STEP_NOT_SIGNED_BY_PRIMARY`
- UM02-02: Second counter-sign attempt on same step → `TC_COUNTER_SIGN_ALREADY_EXISTS` **[DB query, not in-memory]**
- UM02-03: Caller is primary signer, counterSignType "dual_amt" → `TC_COUNTER_SIGN_SELF_DUAL_AMT` **[INV-21]**
- UM02-04: Caller is primary signer, counterSignType "ia_inspection", holds IA → success
- UM02-05: IA expired → `IA_CERT_NOT_CURRENT`
- UM02-06: Rating selected not held → `SIGN_RATING_NOT_HELD` **[RQ-05]**
- UM02-07: Success → `taskCardStepCounterSignatures` record exists, step.status still "completed"
- UM02-08: `signTaskCard` on card with IA-required step, no counter-signature present, signer lacks IA → throw

---

### Mutation 11: `signTaskCard` Fix — B-P3-07

**File:** `convex/mutations/taskCards/signTaskCard.ts`
**Context:** Phase 3 implementation used the `taskCards.notes` field as a workaround for missing
schema signature fields. B-P3-07 requires replacing this workaround with proper schema fields
from schema-v2.1.md. The card-level sign-off must be queryable, not just auditable.

**Schema fields added (schema-v2.1.md, targeted extension per B-P3-07):**
```typescript
// New fields on taskCards table (schema-v2.1):
cardSignedByTechnicianId: v.optional(v.id("technicians")),
cardSignedAt: v.optional(v.number()),
cardSignedCertNumber: v.optional(v.string()),        // snapshot
cardSignedHasIaOnDate: v.optional(v.boolean()),
cardSignatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
cardSignatureHash: v.optional(v.string()),
cardRatingsExercised: v.optional(v.array(/* rating union */)),
cardReturnToServiceStatement: v.optional(v.string()),
```

**AUTH:** `requireOrgMembership(ctx, "inspector")`
**Rationale:** Same as for counter-sign — card-level sign-off requires inspector minimum because
the mutation validates IA requirements for IA-required steps.

**Guard Sequence (ordered):**
```typescript
// G1: AUTH — requireOrgMembership(ctx, "inspector")
// G2: Fetch taskCard; org isolation
// G3: taskCard.status === "complete" → TC_CARD_NOT_READY_FOR_SIGN
//     "signTaskCard requires status 'complete'. Current: [status].
//      All steps must be resolved including incomplete_na_steps IA reviews."
// G4: Direct step count verification — query taskCardSteps.by_task_card for pending steps.
//     Do NOT rely on denormalized completedStepCount (may have drifted).
//     → TC_CARD_HAS_PENDING_STEPS { pendingStepNumbers: number[] }
// G5: Dual sign-off requirements satisfied for IA-required steps
//     For each step with signOffRequiresIa == true and status == "completed":
//       Check taskCardStepCounterSignatures.by_step — record must exist, OR
//       Signing technician holds current IA (which allows them to serve as both
//       AMT-verifier and IA simultaneously per 14 CFR 65.91 two-hat rule)
//     → TC_DUAL_SIGNOFF_UNSATISFIED { unsatisfiedStepNumbers: number[] }
// G6: [RQ-05] Validate ratingsExercised against cert.ratings[]
//     → SIGN_RATING_NOT_HELD
// G7: cardReturnToServiceStatement validation — [MARCUS RQ-06]
//     Same three assertions as authorizeReturnToService PRECONDITION 9:
//     length >= 75 → TC_CARD_STATEMENT_TOO_SHORT
//     must contain "14 CFR" or "Part 43" → TC_CARD_STATEMENT_NO_CITATION
//     must contain "return" or "airworthy" → TC_CARD_STATEMENT_NO_DETERMINATION
//     (The card-level sign-off is a maintenance record entry under 14 CFR 43.9.)
// G8: Section 5 six-check signatureAuthEvent consumption
```

**Execution Sequence:**
```typescript
// 1. Consume signatureAuthEvent (Section 5)
// 2. Fetch cert for snapshot fields
// 3. Compute cardSignatureHash = sha256(canonicalCardSignJson({
//      taskCardId, taskCardNumber, workOrderId, aircraftId, organizationId,
//      cardSignedByTechnicianId, cardSignedAt, cardSignedCertNumber,
//      cardSignedHasIaOnDate, cardRatingsExercised, cardReturnToServiceStatement
//    }))
// 4. Patch taskCard with proper schema fields (replacing Phase 3 notes workaround):
//    cardSignedByTechnicianId → callerTechnicianId
//    cardSignedAt → now
//    cardSignedCertNumber → cert.certificateNumber   ← snapshot
//    cardSignedHasIaOnDate → (callerHoldsCurrentIa ? true : false)
//    cardSignatureAuthEventId → consumed event ID
//    cardSignatureHash → computed hash
//    cardRatingsExercised → args.ratingsExercised
//    cardReturnToServiceStatement → args.cardReturnToServiceStatement.trim()
//    completedAt → now (if not already set)
//    updatedAt → now
// 5. Update tech.lastExercisedDate
// 6. Audit log: eventType "record_signed", tableName "taskCards",
//    notes "Task card [taskCardNumber] signed. Cert: [certNumber]. " +
//          "Ratings: [ratingsExercised]. Hash: [hash first 16 chars]…"
```

**Invariant enforcement notes:**
- The Phase 3 workaround (notes field) is explicitly removed. If any existing test stubs
  check for the notes-field signature format, they must be updated (Cilla + Devraj coordination).
- `cardSignatureHash` provides the same tamper-detection guarantee as `returnToService.signatureHash`.
  `hashAlgorithmVersion` field must also be written to the taskCards record.
- The card-level sign-off produces a queryable record: `taskCards.cardSignedByTechnicianId` is
  now a proper indexed field usable for "show me all cards signed by this technician" queries.

**Cilla's expected test cases:**
- B307-01: One pending step present → `TC_CARD_HAS_PENDING_STEPS`
- B307-02: IA-required step, no counter-sig, signer lacks IA → `TC_DUAL_SIGNOFF_UNSATISFIED`
- B307-03: Statement 60 chars → `TC_CARD_STATEMENT_TOO_SHORT` **[RQ-06]**
- B307-04: Success → `cardSignedByTechnicianId` set, `notes` field NOT used for signature
- B307-05: `cardSignatureHash` can be recomputed and verified → hash integrity check passes

---

## Cross-Cutting Implementation Notes

### Signature Auth Event Consumption: All 11 Mutations

The Section 5 six-check consumption sequence from mutation-implementation.md applies to all signing
mutations in this document. The mutations that consume an auth event are:
`authorizeReturnToService`, `recordAdCompliance`, `markAdNotApplicable`, `reviewNAStep`,
`counterSignStep`, `signTaskCard`. The remaining mutations (`createAdCompliance`, `supersedAd`,
`placeWorkOrderOnHold`, `releaseWorkOrderHold`, `submitForInspection`, `flagOpenDiscrepancies`)
do not consume auth events.

### `lastExercisedDate` Scope Expansion — compliance-validation.md §2 Item 7

Marcus in the simulated inspection found that `lastExercisedDate` updates were specified only at RTS
time. All six signing mutations above must also update `technician.lastExercisedDate → now` as part
of their execution sequence. This is non-optional. An FAA inspector asking "when did this IA last
exercise their certificate" must find the most recent signature event, not just the most recent RTS.

### RQ-05: Rating Validation — All Signing Mutations

Per compliance-validation.md §1 (RQ-05 formal determination): "Technician declares. System validates.
System does NOT infer." The guard pattern from mutation-implementation.md §6 (RQ-05 section) applies
to every mutation that captures `ratingsExercised`:
```typescript
for (const rating of args.ratingsExercised) {
  if (rating === "none") continue;
  if (!cert.ratings.includes(rating))
    throw new ConvexError({ code: "SIGN_RATING_NOT_HELD",
      selected: rating, held: cert.ratings });
}
```
This guard was not in the Phase 2 spec for most mutations. It is now required on:
`reviewNAStep`, `counterSignStep`, `signTaskCard`. It is already specified for `completeStep`
per mutation-implementation.md §6.

---

## Error Code Master Registry (Phase 4)

| Code | Mutation | Condition |
|---|---|---|
| `RTS_AUTH_EVENT_CONSUMED` | authorizeRTS | Auth event already used |
| `RTS_AUTH_EVENT_EXPIRED` | authorizeRTS | Event TTL elapsed |
| `RTS_AUTH_EVENT_WRONG_TABLE` | authorizeRTS | intendedTable mismatch |
| `RTS_WRONG_WO_STATUS` | authorizeRTS | WO not in pending_signoff |
| `RTS_ALREADY_SIGNED` | authorizeRTS | returnToServiceId already set |
| `RTS_TIME_MISMATCH` | authorizeRTS | Submitted hours ≠ WO close hours |
| `RTS_TIME_DECREASED` | authorizeRTS | Close TT < open TT (INV-06/INV-18) |
| `RTS_TIME_BELOW_AIRCRAFT_RECORD` | authorizeRTS | Hours below aircraft on-file TT |
| `RTS_OPEN_TASK_CARDS` | authorizeRTS | Non-terminal task card(s) exist |
| `RTS_UNREVIEWED_NA_STEPS` | authorizeRTS | incomplete_na_steps cards |
| `RTS_OPEN_DISCREPANCIES` | authorizeRTS | Non-dispositioned discrepancy |
| `RTS_MEL_EXPIRED` | authorizeRTS | MEL deferral expiry past |
| `RTS_IA_REQUIRED` | authorizeRTS | Annual WO, signer lacks IA |
| `RTS_IA_EXPIRED` | authorizeRTS | IA past March 31 cutoff |
| `RTS_RECENT_EXP_LAPSED` | authorizeRTS | 65.83 24-month rule |
| `RTS_FORM_337_REQUIRED` | authorizeRTS | Major repair/alteration, no 337 ref |
| `RTS_NOT_AUTHORIZED_FOR_ORG` | authorizeRTS | Not on Part 145 authorized list |
| `RTS_ZERO_AD_RECORDS` | authorizeRTS | Annual/100hr, zero AD records **[MARCUS]** |
| `RTS_AD_OVERDUE` | authorizeRTS | Overdue AD(s) exist |
| `RTS_AD_PENDING_DETERMINATION` | authorizeRTS | Unresolved pending_determination AD |
| `RTS_NO_MAINTENANCE_RECORDS` | authorizeRTS | No signed maintenance records |
| `RTS_STATEMENT_TOO_SHORT` | authorizeRTS | < 75 chars **[RQ-06]** |
| `RTS_STATEMENT_NO_CITATION` | authorizeRTS | Missing 14 CFR / Part 43 **[RQ-06]** |
| `RTS_STATEMENT_NO_DETERMINATION` | authorizeRTS | Missing return/airworthy **[RQ-06]** |
| `AD_COMPLIANCE_RECORD_EXISTS` | createAdCompliance | Duplicate record |
| `AD_COMPLIANCE_RECORD_NO_AD_CITATION` | createAdCompliance, recordAdCompliance | approvedDataReference omits AD # **[MARCUS]** |
| `AD_COMPLIANCE_NOT_APPLICABLE` | recordAdCompliance | Record is not applicable |
| `AD_COMPLIANCE_BACKDATING_PROHIBITED` | recordAdCompliance | complianceDate regression |
| `AD_COMPLIANCE_CYCLES_REQUIRED` | recordAdCompliance | Cycles AD, no cycle counter **[RQ-02]** |
| `AD_MARK_NA_HAS_COMPLIANCE_HISTORY` | markAdNotApplicable | Prior compliance exists |
| `AD_MARK_NA_REASON_TOO_SHORT` | markAdNotApplicable | < 20 chars |
| `AD_ALREADY_SUPERSEDED` | supersedAd | Old AD already has supersededByAdId |
| `SIGN_RATING_NOT_HELD` | all signing mutations | Rating selected not on cert **[RQ-05]** |
| `IA_CERT_NOT_CURRENT` | reviewNAStep, counterSignStep | IA expired or absent |
| `TC_STEP_NOT_NA` | reviewNAStep | Step status != "na" |
| `TC_STEP_IA_REVIEW_NOT_REQUIRED` | reviewNAStep | signOffRequiresIa == false |
| `TC_CARD_NOT_AWAITING_REVIEW` | reviewNAStep | Card != incomplete_na_steps |
| `TC_REVIEW_NOTES_REQUIRED` | reviewNAStep | Empty reviewNotes |
| `TC_STEP_NOT_SIGNED_BY_PRIMARY` | counterSignStep | Step != completed |
| `TC_COUNTER_SIGN_NOT_REQUIRED` | counterSignStep | No dual sign-off required |
| `TC_COUNTER_SIGN_ALREADY_EXISTS` | counterSignStep | Duplicate counter-sign |
| `TC_COUNTER_SIGN_SELF_DUAL_AMT` | counterSignStep | Same-person dual AMT **[INV-21]** |
| `TC_SCOPE_STATEMENT_REQUIRED` | counterSignStep | Empty scopeStatement |
| `TC_CARD_NOT_READY_FOR_SIGN` | signTaskCard | Card != complete |
| `TC_CARD_HAS_PENDING_STEPS` | signTaskCard | Pending steps remain |
| `TC_DUAL_SIGNOFF_UNSATISFIED` | signTaskCard | IA-required step lacks counter-sig |
| `TC_CARD_STATEMENT_TOO_SHORT` | signTaskCard | < 75 chars **[RQ-06]** |
| `TC_CARD_STATEMENT_NO_CITATION` | signTaskCard | Missing 14 CFR / Part 43 **[RQ-06]** |
| `TC_CARD_STATEMENT_NO_DETERMINATION` | signTaskCard | Missing return/airworthy **[RQ-06]** |
| `WO_INVALID_STATE_FOR_HOLD` | placeWOOnHold | WO != in_progress |
| `WO_HOLD_REASON_REQUIRED` | placeWOOnHold | Empty holdReason |
| `WO_NOT_ON_HOLD` | releaseWOHold | WO != on_hold |
| `WO_HOLD_RELEASE_NOTES_REQUIRED` | releaseWOHold | engineering_review, empty notes |
| `WO_TASK_CARDS_INCOMPLETE` | submitForInspection | Non-terminal task card(s) |
| `WO_OPEN_INTERRUPTIONS_BLOCK` | submitForInspection | Open interruptions **[BP-01]** |
| `WO_NO_OPEN_DISCREPANCIES` | flagOpenDiscrepancies | No open discrepancies |

---

*Devraj Anand — Backend, Convex*
*Regulatory determinations: Marcus Webb (compliance-validation.md §1, RQ-01 through RQ-06)*
*Simulated inspection findings: Capt. Rosa Eaton, Ret. (compliance-validation.md §2)*
*QA contract: Cilla Oduya (test case references per mutation above)*
*Schema basis: convex-schema-v2.md (FROZEN) + schema-v2.1.md (SE-01, SE-02, SE-03, B-P3-07 fields)*
*Resolves: B-P3-02, B-P3-05, B-P3-07, UM-01, UM-02, UM-05, UM-06*
*All guard sequences, error codes, and invariant enforcements in this document are binding on
implementation. Deviations require written sign-off from Rafael Mendoza (Tech Lead) and Cilla
Oduya (QA Lead). Per mutation-implementation.md Devraj Preamble Rule 1: a mutation without its
auth wrapper does not merge. No exceptions.*
