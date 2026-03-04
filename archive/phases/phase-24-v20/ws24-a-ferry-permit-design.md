# WS24-A — Ferry Permit AD Exception Design
**Filed:** 2026-02-23T01:29:00Z  
**Lead:** Marcus Webb (Compliance Architecture)  
**Contributing Review:** Rosa Eaton (Operational Accuracy)  
**Status:** ✅ DESIGN APPROVED — PRODUCTION PENDING  
**Gate:** `ferryWO` work order type enabled in schema; feature-flagged OFF in production pending Marcus's production sign-off

---

## Context

The `ferryWO` work order type has been disabled in Athelon since Phase 4. It was disabled by explicit flag — not because the concept is unsupported in the data model, but because the safety guardrails required to use it responsibly had not yet been designed.

A ferry permit allows an aircraft that is not in full compliance with all applicable airworthiness requirements to be flown — one time, one way — to a location where the necessary maintenance can be performed. The FAA authorizes ferry flights via Special Flight Permit (Form 8130-6), issued by the FSDO. The repair station's role is documentation, not authorization: they record the specific deviation, the FSDO authorization reference, the operating limitations, and the pilot-in-command's acknowledgment.

What makes this the most safety-critical design in the Athelon program is not its operational complexity — ferry permits are common in GA maintenance — but the falsification risk. Athelon's AD compliance module currently treats all open ADs as compliance blockers. If the `ferryWO` type were enabled without an AD exception path, a technician could close a ferry work order in a way that registers the AD as satisfied when the aircraft was, in fact, flown in deliberate, authorized deviation from it. That is a records falsification risk. This design document closes that risk.

---

## Regulatory Framework

### 14 CFR Part 21, Subpart H — Special Flight Permits

The governing authority for ferry flights is not Part 91 alone — it is 14 CFR §21.197 and §21.199, which govern the issuance of Special Flight Permits by the FAA.

**§21.197 — Special Flight Permits:**  
A Special Flight Permit may be issued for an aircraft that may not currently meet applicable airworthiness requirements but is capable of safe flight. Permitted purposes include: flying the aircraft to a base where repairs, alterations, or maintenance can be performed. The permit is issued by the FSDO or, when authorized, by a Designated Airworthiness Representative (DAR).

**§21.199 — Application for Special Flight Permits:**  
The applicant (operator, owner, or repair station acting on behalf of the owner) must provide: (1) the purpose of the flight; (2) the proposed itinerary; (3) the crew required to operate the aircraft and its equipment; (4) the ways the aircraft does not comply with applicable airworthiness requirements; (5) any restriction the applicant considers necessary for safe operation; and (6) any other information the FAA considers necessary for the purpose of prescribing operating limitations.

### FAA Order 8130.2 — Airworthiness Certification of Aircraft

Order 8130.2 governs the procedures for issuing FAA Form 8130-6 (Special Airworthiness Certificate, Special Flight Permit). Chapter 7 governs Special Flight Permits specifically. Key requirements:

- The issuing authority (FSDO) assigns a Special Flight Permit number, which serves as the authorization reference.
- Operating limitations are prescribed as part of the permit — these are mandatory, not advisory.
- The repair station does not issue the permit. The repair station prepares the application, documents the deviations, and receives the FSDO's authorization. Athelon is the record of the application and authorization — not the authorization itself.

### 14 CFR §43.9 — Content, Form, and Disposition of Maintenance Records

All maintenance performed must be documented under §43.9. A ferry work order that includes maintenance performed under the authorization of a Special Flight Permit must document: the description of the work performed, the date, the name of the person performing the work, their certificate type and number, and a return-to-service statement. Where the work order documents an authorized deviation rather than a completion of maintenance, the record must make clear that the deviation is authorized, not corrected.

### FAA Advisory Circular AC 21-12 — Special Flight Permits for Ferry Flights

This AC provides FSDO and operator guidance for ferry flight applications. Key emphasis: the repair station's role is to accurately characterize the airworthiness condition, not to minimize it. An application that understates the deviation is grounds for permit revocation and, potentially, certificate action against the repair station. Athelon's UI language must not create pressure to minimize deviation descriptions.

---

## The Five Conditions: What Athelon Enforces Before Issuing a Ferry WO

Marcus's design requirement: `createFerryWorkOrder` is a hard-fail mutation. All five conditions must be satisfied before the work order is created. There is no override, no DOM bypass, no "I'll fill this in later." The mutation either succeeds with all five conditions met, or it throws a typed error with the specific condition that failed.

### Condition 1: Specific Deviation from Airworthiness

**Requirement:** The deviation field must identify the specific airworthiness finding — not a general characterization.

**Acceptable:** "Left main gear actuator seal failed; gear-up indication unreliable. AD 2019-18-14 compliance status: DEFERRED_FERRY_PERMIT. Aircraft cannot be maintained in AD-compliant configuration at this location."

**Not acceptable:** "Aircraft unairworthy." "Various maintenance items." "Needs work." "Engine issues."

**Enforcement:** The mutation validates that the `deviationDescription` field: (a) contains a minimum of 50 characters, (b) references at least one specific AD number or airworthiness finding with part or system identification, and (c) does not match a list of prohibited generic terms ("general," "various," "multiple," "unairworthy," "needs repair" as standalone descriptions). The validation is content-based, not length-based — a long generic description still fails.

**Schema field:** `deviationDescription: v.string()` — validated server-side before insert.

---

### Condition 2: FSDO Notification Documented with Reference Number

**Requirement:** The FSDO reference number from the Special Flight Permit authorization must be present before the ferry WO is created.

**Design note:** This is the most operationally nuanced condition. The FSDO issues the permit; the shop receives the authorization number. Athelon does not contact the FSDO — it records that the shop has received the authorization and its reference number. There is no "pending FSDO approval" state in Athelon. The FSDO reference number must exist before the WO is created.

**Enforcement:** The `fsdoRef` field must: (a) be non-empty, (b) match the pattern of a valid SFP reference number (validated against FSDO numbering convention: FSDO number + year + sequence, e.g., `LGB-2026-0047`), (c) not be a placeholder string (the mutation checks against a list of known placeholder patterns). If the FSDO reference does not yet exist — if the shop is applying but has not yet received authorization — the ferry WO cannot be created. This is intentional. A ferry work order in Athelon is a record of an authorized ferry flight. It is not a planning document for a requested one.

**Schema field:** `fsdoRef: v.string()` — validated against FSDO reference pattern.

---

### Condition 3: Limitations Enumerated

**Requirement:** The operating limitations prescribed by the FSDO as conditions of the Special Flight Permit must be individually enumerated. A limitations field that says "see FSDO letter" is not compliant.

**Required limitation sub-fields (all mandatory):**
- `altitudeLimitFt: v.number()` — maximum altitude in feet MSL
- `route: v.string()` — departure airport → destination airport (ICAO codes); intermediate stops if any
- `durationLimitHours: v.number()` — maximum flight time authorized
- `crewRequirements: v.string()` — any PIC minimums, second-in-command requirements, or restriction to qualified crew
- `additionalLimitations: v.optional(v.array(v.string()))` — any FSDO-prescribed limitations beyond the above four

**Enforcement:** All four required sub-fields must be non-null and non-empty. `altitudeLimitFt` and `durationLimitHours` must be positive numbers. `route` must contain at least one `→` separator (departure and destination). `crewRequirements` must contain at least 20 characters — the mutation rejects strings like "qualified crew" or "normal crew" as insufficiently specific.

---

### Condition 4: No Open Maintenance Actions Except the Specific Deviation

**Requirement:** At the time the ferry WO is created, the aircraft must have no open maintenance actions other than the specific deviation described in Condition 1. A ferry permit does not authorize an aircraft to fly with unrelated unresolved maintenance items.

**Enforcement:** The mutation queries the `workOrders` table for the aircraft. If any work order for this aircraft is in status `open`, `in_progress`, or `pending_rts` — other than the ferry WO being created — the mutation fails with error `OPEN_MAINTENANCE_ACTIONS_EXIST`. The DOM is shown the list of conflicting open WOs. They must close, complete, or void them before the ferry WO can be created.

**Exception handling:** If an open WO is directly related to the deviation (e.g., an AD assessment WO that documented the finding leading to the ferry permit), it can be linked to the ferry WO as a `sourcingWorkOrder` reference, which exempts it from the blocking check. This linkage is explicit and auditable.

---

### Condition 5: Pilot-in-Command Acknowledgment of the Known Defect

**Requirement:** The pilot in command who will conduct the ferry flight must acknowledge, by name and signature (or typed affirmation in the system), that they have been informed of the specific airworthiness deviation and the operating limitations, and that they accept the risk.

**This is not a checkbox.** The acknowledgment in Athelon requires:
- The PIC's full legal name
- Their certificate number (ATP or Commercial — ferry permits require at minimum Commercial privileges)
- The specific text they are acknowledging (auto-populated from Condition 1 deviation description + Condition 3 limitations)
- A typed affirmation: "I, [name], have read the above deviation description and operating limitations, and I acknowledge that this aircraft is not in full compliance with all airworthiness requirements for this flight. I accept the operating limitations as prescribed."
- The date and time of acknowledgment

The PIC acknowledgment is stored separately in the `ferryPermitRecord` table and cannot be modified after creation. It is included in the ferry WO PDF export as a dedicated page, distinct from the work order body.

---

## Schema Additions

### Table: `ferryPermitRecord`

```typescript
// Convex schema definition
ferryPermitRecord: defineTable({
  // Linking
  workOrderId: v.id("workOrders"),         // required — links to the ferry WO
  aircraftId: v.id("aircraft"),            // denormalized for query performance
  orgId: v.id("organizations"),

  // Condition 1: Specific deviation
  deviationDescription: v.string(),         // validated ≥50 chars, specific finding required
  adReferences: v.array(v.string()),        // extracted AD numbers in deviation
  adExceptionState: v.literal("DEFERRED_FERRY_PERMIT"), // immutable once set

  // Condition 2: FSDO authorization
  fsdoRef: v.string(),                     // FSDO reference number, validated format
  fsdoOffice: v.string(),                  // FSDO office name (e.g., "Los Angeles FSDO")
  fsdoAuthorizationDate: v.string(),       // ISO date of FSDO authorization

  // Condition 3: Limitations
  altitudeLimitFt: v.number(),
  route: v.string(),                       // e.g., "KVNY → KBFL" 
  durationLimitHours: v.number(),
  crewRequirements: v.string(),
  additionalLimitations: v.optional(v.array(v.string())),

  // Condition 4: No open actions (captured at time of WO creation)
  openActionsAuditTimestamp: v.string(),   // ISO timestamp of the no-open-actions check
  openActionsAuditResult: v.literal("CLEAR"),
  sourcingWorkOrderId: v.optional(v.id("workOrders")), // linked sourcing WO if applicable

  // Condition 5: PIC acknowledgment
  picFullName: v.string(),
  picCertificateNumber: v.string(),
  picAcknowledgmentText: v.string(),       // full text they acknowledged (snapshot, not reference)
  picAcknowledgmentTimestamp: v.string(),  // ISO timestamp — immutable after creation

  // Audit metadata
  createdBy: v.id("users"),
  createdAt: v.string(),
  domReviewedBy: v.optional(v.id("users")),
  domReviewedAt: v.optional(v.string()),

  // Status
  status: v.union(
    v.literal("ACTIVE"),                  // ferry authorized, flight not yet completed
    v.literal("COMPLETED"),               // arrival maintenance WO linked and complete
    v.literal("VOIDED"),                  // permit voided before flight
    v.literal("EXPIRED"),                 // duration limit passed without completion WO
  ),

  // Post-ferry arrival maintenance linkage
  arrivalWorkOrderId: v.optional(v.id("workOrders")), // WO for the repair at destination
})
  .index("by_workOrder", ["workOrderId"])
  .index("by_aircraft", ["aircraftId"])
  .index("by_org", ["orgId"])
  .index("by_status", ["status"]),
```

### Work Order Type Addition

```typescript
// workOrders table: workOrderType field additions
workOrderType: v.union(
  v.literal("annual"),
  v.literal("100hour"),
  v.literal("progressive"),
  v.literal("unscheduled"),
  v.literal("ad_compliance"),
  v.literal("major_repair"),
  v.literal("parts_receiving"),
  v.literal("ferryWO"),   // RE-ENABLED in schema — feature-flagged OFF in production
)
```

### AD Compliance Module: `DEFERRED_FERRY_PERMIT` State

```typescript
// adComplianceRecords table: complianceStatus field additions
complianceStatus: v.union(
  v.literal("COMPLIANT"),
  v.literal("NON_COMPLIANT"),
  v.literal("DEFERRED_FERRY_PERMIT"),  // new — linked to ferryPermitRecord
  v.literal("NOT_APPLICABLE"),
  v.literal("PENDING_ASSESSMENT"),
)
```

When an AD's compliance status is set to `DEFERRED_FERRY_PERMIT`, it is automatically linked to the corresponding `ferryPermitRecord`. The state is not available as a manual selection — it can only be set by the `createFerryWorkOrder` mutation. It cannot be set to `COMPLIANT` by any path other than the arrival maintenance WO completion flow.

**Critical automatic reversion:** If the ferry WO is closed or voided without a linked arrival maintenance WO in `COMPLETED` status, the AD compliance status reverts from `DEFERRED_FERRY_PERMIT` to `NON_COMPLIANT` automatically. This reversion is logged in the audit trail and cannot be suppressed. There is no path from `DEFERRED_FERRY_PERMIT` to `COMPLIANT` that bypasses the arrival WO.

---

## Mutation Specification

### `createFerryWorkOrder`

```typescript
export const createFerryWorkOrder = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    deviationDescription: v.string(),
    fsdoRef: v.string(),
    fsdoOffice: v.string(),
    fsdoAuthorizationDate: v.string(),
    limitations: v.object({
      altitudeLimitFt: v.number(),
      route: v.string(),
      durationLimitHours: v.number(),
      crewRequirements: v.string(),
      additionalLimitations: v.optional(v.array(v.string())),
    }),
    pilotAcknowledgment: v.object({
      picFullName: v.string(),
      picCertificateNumber: v.string(),
    }),
    sourcingWorkOrderId: v.optional(v.id("workOrders")),
  },
  handler: async (ctx, args) => {
    // Feature flag check — hard fail if ferryWO is not enabled in production
    const ferryEnabled = await ctx.db
      .query("featureFlags")
      .filter(q => q.eq(q.field("flag"), "ferryWO_enabled"))
      .first();
    if (!ferryEnabled?.enabled) {
      throw new ConvexError({
        code: "FEATURE_DISABLED",
        message: "Ferry work orders are not enabled in this environment. Contact support.",
      });
    }

    // CONDITION 1: Validate deviation description specificity
    validateDeviationDescription(args.deviationDescription);
    // Throws: DEVIATION_TOO_GENERIC | DEVIATION_TOO_SHORT | DEVIATION_NO_SPECIFIC_FINDING

    // CONDITION 2: Validate FSDO reference
    validateFsdoRef(args.fsdoRef);
    // Throws: FSDO_REF_INVALID_FORMAT | FSDO_REF_PLACEHOLDER_DETECTED

    // CONDITION 3: Validate limitations completeness
    validateLimitations(args.limitations);
    // Throws: ALTITUDE_LIMIT_MISSING | ROUTE_INVALID | DURATION_LIMIT_MISSING
    //         | CREW_REQUIREMENTS_INSUFFICIENT

    // CONDITION 4: Check for open maintenance actions
    const openWorkOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_aircraft", q => q.eq(q.field("aircraftId"), args.aircraftId))
      .filter(q =>
        q.and(
          q.neq(q.field("status"), "completed"),
          q.neq(q.field("status"), "closed"),
          q.neq(q.field("status"), "voided"),
          q.neq(q.field("workOrderId"), args.sourcingWorkOrderId ?? null),
        )
      )
      .collect();
    if (openWorkOrders.length > 0) {
      throw new ConvexError({
        code: "OPEN_MAINTENANCE_ACTIONS_EXIST",
        message: `Aircraft has ${openWorkOrders.length} open maintenance action(s) that must be resolved before a ferry WO can be created.`,
        openWorkOrders: openWorkOrders.map(wo => ({
          id: wo._id,
          number: wo.workOrderNumber,
          status: wo.status,
          description: wo.description,
        })),
      });
    }

    // CONDITION 5: Build and validate PIC acknowledgment text
    const acknowledgmentText = buildPicAcknowledgmentText(
      args.pilotAcknowledgment.picFullName,
      args.deviationDescription,
      args.limitations,
    );
    validatePicAcknowledgment(args.pilotAcknowledgment);
    // Throws: PIC_NAME_MISSING | PIC_CERT_NUMBER_MISSING

    // All conditions passed. Create the ferry WO and permit record atomically.
    const now = new Date().toISOString();
    const identity = await ctx.auth.getUserIdentity();

    // Create work order
    const workOrderId = await ctx.db.insert("workOrders", {
      aircraftId: args.aircraftId,
      workOrderType: "ferryWO",
      status: "open",
      // ... standard work order fields
      createdAt: now,
      createdBy: identity.subject,
    });

    // Set AD compliance state to DEFERRED_FERRY_PERMIT for referenced ADs
    const adRefs = extractAdReferences(args.deviationDescription);
    for (const adRef of adRefs) {
      await setAdComplianceState(ctx, args.aircraftId, adRef, "DEFERRED_FERRY_PERMIT", workOrderId);
    }

    // Create ferry permit record
    const ferryPermitId = await ctx.db.insert("ferryPermitRecord", {
      workOrderId,
      aircraftId: args.aircraftId,
      orgId: identity.orgId,
      deviationDescription: args.deviationDescription,
      adReferences: adRefs,
      adExceptionState: "DEFERRED_FERRY_PERMIT",
      fsdoRef: args.fsdoRef,
      fsdoOffice: args.fsdoOffice,
      fsdoAuthorizationDate: args.fsdoAuthorizationDate,
      altitudeLimitFt: args.limitations.altitudeLimitFt,
      route: args.limitations.route,
      durationLimitHours: args.limitations.durationLimitHours,
      crewRequirements: args.limitations.crewRequirements,
      additionalLimitations: args.limitations.additionalLimitations,
      openActionsAuditTimestamp: now,
      openActionsAuditResult: "CLEAR",
      sourcingWorkOrderId: args.sourcingWorkOrderId,
      picFullName: args.pilotAcknowledgment.picFullName,
      picCertificateNumber: args.pilotAcknowledgment.picCertificateNumber,
      picAcknowledgmentText: acknowledgmentText,
      picAcknowledgmentTimestamp: now,
      createdBy: identity.subject,
      createdAt: now,
      status: "ACTIVE",
    });

    return { workOrderId, ferryPermitId };
  },
});
```

---

## Feature Flag: `ferryWO` in Production

The `ferryWO` work order type is **enabled in schema**. It is **feature-flagged OFF in production**.

The feature flag `ferryWO_enabled` exists in the `featureFlags` table. It is set to `false` in the production environment. It is `true` in the development and staging environments for testing.

To enable `ferryWO` in production, Marcus Webb must issue a production sign-off — separate from and subsequent to this design approval. The production sign-off requires:

1. End-to-end testing of the `createFerryWorkOrder` mutation in staging with all five failure paths exercised
2. PDF export of a test ferry WO validated for regulatory content by Marcus
3. Rosa Eaton operational review of the UI flow (including the PIC acknowledgment screen)
4. Legal review of the UI disclaimer language (Athelon records the authorization; it does not issue the permit)
5. Marcus's signed production authorization memo

**No DOM, no admin, and no Athelon team member can enable `ferryWO_enabled` in production without Marcus's production sign-off.**

---

## Rosa Eaton's Design Review

Rosa reviewed this design on 2026-02-21. She has seen what happens when ferry permits are misused. Her non-negotiables, stated without modification:

**1. The UI must never imply that Athelon is issuing the ferry permit.**  
"I've seen shops confuse recording authorization with having authorization. The FSDO issues the permit. The shop applies for it. Athelon records it. If the UI ever shows something like 'Ferry Permit Issued' as a work order status, you'll have shops flying on the assumption that Athelon's record is the authorization. The status language must be 'FSDO Authorization Recorded,' never 'Permit Issued' or 'Ferry Authorized.'"

**2. The PIC acknowledgment must be a standalone screen, not a checkbox.**  
"A checkbox doesn't make a pilot think. The pilot needs to read the deviation. They need to read the limitations. The acknowledgment screen should show the deviation description and each limitation, and require a typed affirmation that names the pilot. Not a checkbox. Not a toggle. A typed sentence with their name in it."

**3. The AD reversion must be automatic and unbypassable.**  
"If the ferry flight never happens, or if the arrival maintenance is never completed, that AD cannot stay in a deferred state indefinitely. When the ferry WO is closed without a linked arrival WO, the AD goes back to non-compliant. Automatically. No DOM override. No admin bypass. If you build a bypass into this, I will find it and I will remove it."

**4. The duration limit must be enforced at the work order level, not just recorded.**  
"If the permit authorizes 4.2 flight hours and 4.3 hours pass without a completed arrival maintenance WO, the ferry permit record should flag as expired and alert the DOM. Not 'notify' — alert. Something that requires acknowledgment. A ferry permit that has expired and whose aircraft status is unknown is the most dangerous situation this system will ever see."

**5. The deviation description cannot be edited after the work order is created.**  
"Once the ferry WO is created, the deviation description is locked. You cannot go back and change what you said the aircraft's condition was after the flight. If you got it wrong, you void the WO, document why it was voided, and create a new one with the correct description. The deviation description is part of the FSDO application. It is not a draft."

Rosa's non-negotiables are implemented in the mutation as described above. Item 4 (duration expiry alert) is implemented as a scheduled function that runs daily and flags `ferryPermitRecord` entries in `ACTIVE` status whose `fsdoAuthorizationDate` plus `durationLimitHours` have elapsed without a linked `arrivalWorkOrderId` in `COMPLETED` status.

---

## Marcus Webb — Formal Design Approval Statement

*Recorded 2026-02-23*

> This document represents the design I believe is necessary before the `ferryWO` work order type can be enabled in any production environment. I am approving this design — the schema, the mutation specification, the five conditions, Rosa's non-negotiables, and the feature-flag gate.
>
> I am not approving this for production use. That approval requires a separate step that has not yet occurred: end-to-end staging validation, legal review of the UI disclaimer language, and my personal review of the first production-candidate WO PDF. Those steps are not optional and they are not delegatable.
>
> What I am approving today is the architecture. The problem has been thought through correctly. The risks have been identified correctly. The guardrails are sufficient for the design. Build can proceed in staging and development environments.
>
> The `ferryWO` type should not touch a production aircraft record until I have signed the production memo.
>
> — Marcus Webb, Compliance Architecture  
> *Design Approval — Not Production Sign-off*

---

## Status

**DESIGN APPROVED — PRODUCTION PENDING**

| Item | State |
|---|---|
| Regulatory framework documented | ✅ |
| Five conditions specified and validated | ✅ |
| `ferryPermitRecord` schema defined | ✅ |
| `createFerryWorkOrder` mutation spec complete | ✅ |
| AD exception state (`DEFERRED_FERRY_PERMIT`) designed | ✅ |
| AD automatic reversion on WO close designed | ✅ |
| Duration expiry alert designed | ✅ |
| Feature flag gate in place | ✅ |
| Rosa Eaton design review complete | ✅ |
| Marcus design approval issued | ✅ |
| Staging end-to-end testing | ⬜ Pending |
| Legal review of UI disclaimer language | ⬜ Pending |
| Marcus production sign-off memo | ⬜ Pending |
| `ferryWO_enabled` flag set to `true` in production | 🔒 Blocked — awaiting Marcus production sign-off |
