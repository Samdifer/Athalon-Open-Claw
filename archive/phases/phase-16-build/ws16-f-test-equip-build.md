# WS16-F — Test Equipment Traceability Build (FULL DEPTH)

**Phase:** 16
**Workstream:** WS16-F
**Owners:** Devraj Anand (Backend/Convex) + Dale Purcell (UAT) + Marcus Webb (policy/compliance)
**QA:** Cilla Oduya
**Depends on:** `phase-15-rd/ws15-f-test-equipment.md` · WS16-B auth-ordering build · WS16-C PDF export
**Status: READY FOR BUILD**

---

## 1. Context and Carry-Forward Controls

This build closes the test equipment traceability gap identified in Phase 15. No current MRO system used at Athelon customer shops has structured fields for calibration traceability — they rely on free-text notes fields that are search-invisible and audit-invisible. Dale Purcell (avionics tech, Henderson NV) identified this as a compliance exposure: FAA inspectors asking for cal records on equipment used for specific tail numbers receive a paragraph in a notes field, which is not a record.

**Phase 15 carry-forward controls (non-negotiable):**
1. Fail-closed on pending-signature ambiguity — no equipment-linked sign path may bypass unresolved pending states.
2. Qualification precheck-before-auth consume — any override authorization must validate qualification before consuming auth events (inherits WS16-B/WS16-G ordering rule).
3. Calibration policy memo control — expired-cal handling must implement the signed Marcus memo path exactly (no ad-hoc behavior).
4. Hash-manifest verification — all equipment linkage/export evidence must land in verifiable manifest chain.

**The Marcus memo (Section 2) is the hard blocker for this build.** `linkTestEquipment` expired-cal branch cannot be written until Marcus signs. All other components proceed in parallel.

---

## 2. Marcus Webb — Calibration Policy Memo (REQUIRES SIGNATURE)

> **ATHELON INTERNAL POLICY DOCUMENT**
> **Document ID:** CAL-POLICY-MEMO-V1
> **Subject:** Test Equipment Calibration Evidence Policy — Valid Evidence, Override Conditions, and Audit Requirements
> **Prepared for signature by:** Marcus Webb, Regulatory/Compliance
> **Date prepared:** 2026-02-22
> **Status:** AWAITING MARCUS SIGNATURE — Hard blocker for WS16-F build

---

### 2.1 Scope

This memo establishes Athelon's policy on what constitutes valid calibration evidence for test equipment used in FAA-regulated maintenance records, the conditions under which expired-calibration override is permitted, and how such overrides are audited. This policy governs the behavior of the `linkTestEquipment` mutation and any system path that associates test equipment with a maintenance record entry.

### 2.2 Regulatory Basis

The following regulations and advisory circulars form the basis of this policy:

- **14 CFR §43.9(a)(2):** Maintenance records must identify the approved data used. For regulated test procedures (altimeter, static, transponder per Part 43 Appendix E), the calibration certificate data for test equipment used is part of the approved data chain and must be identifiable from the record.
- **14 CFR Part 43, Appendix E:** Specifies equipment requirements for altimeter, static, and transponder tests. Equipment used must be appropriately calibrated.
- **14 CFR §91.411 / §91.413:** IFR equipment test currency requirements. Test equipment calibration is a component of the test's validity.
- **Part 145.109(a):** Repair stations must maintain equipment in a condition to perform approved maintenance. This implies calibration currency for test equipment.
- **AC 43-9C §6:** Maintenance record content should allow identification of test equipment used.

### 2.3 What Constitutes Valid Calibration Evidence

For calibration evidence to be considered valid in the Athelon system, ALL of the following must be true at time of equipment use:

1. **Calibration certificate is current.** The calibration due date (calDueDate) is on or after the date the maintenance work is performed.
2. **Certificate is from an accredited lab.** The calibrating laboratory holds NVLAP accreditation or equivalent ISO/IEC 17025 accreditation for the relevant measurement discipline. NVLAP accreditation number must be recorded where available.
3. **NIST traceability is attested.** The technician receiving or re-verifying the equipment has attested (not merely defaulted) that NIST traceability is documented on the certificate.
4. **Certificate is on file.** The calibration certificate PDF has been uploaded to `_storage` and linked to the equipment record. A certificate number without an uploaded document is insufficient.
5. **All required fields are populated.** Cal cert number, cal date, cal due date, cal lab name, NIST traceable boolean, and cal cert storage ID must all be non-null.

A free-text note referencing calibration does not satisfy these requirements.

### 2.4 Expired Calibration — Policy Decision

**Policy ruling (Marcus Webb, pending signature):**

Expired calibration on test equipment used in a maintenance record is **advisory with mandatory documented override** for v1.1. This is NOT a hard block at the mutation level. Rationale:

> "A hard block at the mutation level would prevent mechanics from documenting work in real-world scenarios where equipment is in a calibration renewal gap — submitted to the lab, awaiting return, with interim lab confirmation available. A hard block creates pressure to use different equipment without disclosure rather than documenting the expired status transparently. The regulatory requirement is documentation and traceability, not physical impossibility. The system should make the exception as friction-laden and auditable as possible, not impossible."

**Expired-cal override is permitted ONLY when all of the following are true:**

1. The explanation text provided is at minimum 30 characters and addresses: (a) why the equipment was used despite expired cal, and (b) what evidence of interim validity exists (e.g., "Submitted to CalLab Inc. 3 days ago; lab confirmation email ref LAB-2024-0312 attached").
2. The override is authorized by an IA or shop lead (not the technician performing the work).
3. The override authorizer is a different user ID from the user linking the equipment.
4. The override is logged with full timestamp, authorizer ID, and explanation text in the `expiredCalOverride` block.

**v2.0 note:** Marcus reserves the right to upgrade expired-cal to a hard block after reviewing v1.1 usage patterns. The override frequency dashboard (Section 8) must be reviewed quarterly.

### 2.5 How Overrides Are Audited

Every expired-cal override appears in:
1. The `maintenanceRecordTestEquipmentLinks` record with full `expiredCalOverride` block (non-deletable).
2. The maintenance record PDF export under a flagged amber "Cal expired at use — override documented" section.
3. The quarterly cal policy compliance report surfaced to the shop's QA/compliance role.
4. The WS16-M hash-manifest chain for the work order.

Override frequency exceeding 2 per technician per quarter triggers a QA review flag. Override frequency exceeding 5 per shop per month triggers a Marcus/compliance review.

### 2.6 Future Hard-Block Trigger Conditions

Marcus will recommend upgrade to hard block if any of the following occur:
- An FAA investigation references an Athelon-documented maintenance record with expired-cal equipment.
- Quarterly override report shows systematic misuse (pattern of approver = closest colleague, boilerplate explanations).
- Any shop receives a Notice of Investigation touching calibration traceability.

---

**SIGNATURE BLOCK:**

```
Marcus Webb — Regulatory/Compliance
Document ID: CAL-POLICY-MEMO-V1
Signature: ______________________________
Date: ______________________________

Witnessed by (Compliance Reviewer): ______________________________
Date: ______________________________
```

*This document must be signed and scanned before the `linkTestEquipment` expired-cal branch is merged to main. Reference this document ID in the code constant: `CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1"`.*

---

## 3. Convex Schema Additions

### 3.1 `testEquipment` table

```typescript
// convex/schema.ts — add to defineSchema

testEquipment: defineTable({
  // Identity
  internalEquipmentId: v.string(),          // Shop-assigned ID (e.g., "TE-0042")
  manufacturer: v.string(),
  modelNumber: v.string(),
  partNumber: v.optional(v.string()),        // P/N (manufacturer part number)
  serialNumber: v.string(),                  // S/N
  description: v.string(),                   // Human-readable: "Pitot-Static Test Set"

  // Equipment category — drives regulatory requirement mapping
  equipmentCategory: v.union(
    v.literal("pitot_static"),
    v.literal("transponder"),
    v.literal("altimeter"),
    v.literal("radio_test"),
    v.literal("electrical_test"),
    v.literal("torque"),
    v.literal("other_calibrated"),
    v.literal("shop_tool_uncalibrated"),
  ),

  // Regulatory references
  applicableRegulations: v.array(v.string()),  // e.g., ["14 CFR Part 43 Appendix E"]
  applicableTSOs: v.array(v.string()),          // e.g., ["TSO-C106"]

  // Lifecycle status
  status: v.union(
    v.literal("pending_cal_verification"),
    v.literal("available"),
    v.literal("cal_expiring_soon"),
    v.literal("cal_expired"),
    v.literal("sent_for_calibration"),
    v.literal("quarantined"),
    v.literal("retired"),
  ),

  // Current calibration record
  calibrationDate: v.optional(v.number()),           // epoch ms — most recent cal date
  calibrationExpiry: v.optional(v.number()),         // epoch ms — cal due date
  calibrationCertRef: v.optional(v.string()),        // Cal cert number (e.g., "NVLAP-2024-00312")
  calibrationAuthority: v.optional(v.string()),      // Cal lab name + NVLAP accreditation number
  calibrationCertStorageId: v.optional(v.id("_storage")),
  calibrationNistTraceable: v.optional(v.boolean()),
  calibrationVerifiedBy: v.optional(v.id("users")),
  calibrationVerifiedAt: v.optional(v.number()),

  // Calibration history — immutable append-only
  calibrationHistory: v.array(v.object({
    calCertNumber: v.string(),
    calDate: v.number(),
    calDueDate: v.number(),
    calLab: v.string(),
    nvlapAccreditationNumber: v.optional(v.string()),
    nistTraceable: v.boolean(),
    calCertStorageId: v.id("_storage"),
    replacedAt: v.number(),
    replacedBy: v.id("users"),
  })),

  // Receiving provenance
  receivedAt: v.number(),
  receivedBy: v.id("users"),
  purchaseOrderRef: v.optional(v.string()),
  assignedLocation: v.optional(v.string()),

  // Organizational scope
  orgId: v.id("organizations"),

  // Policy reference — links to signed Marcus memo
  calPolicyMemoRef: v.optional(v.string()),  // "CAL-POLICY-MEMO-V1"
})
.index("by_org", ["orgId"])
.index("by_org_status", ["orgId", "status"])
.index("by_serialNumber", ["serialNumber"])
.index("by_org_calExpiry", ["orgId", "calibrationExpiry"]),
```

### 3.2 Linkage to `maintenanceRecords` table

```typescript
// Add to existing maintenanceRecords table definition:
testEquipmentUsed: v.optional(v.array(v.id("testEquipment"))),
// Note: this is the live reference array. The audit-grade snapshot lives in
// maintenanceRecordTestEquipmentLinks. Both must be populated on linkage.
```

### 3.3 `maintenanceRecordTestEquipmentLinks` table

```typescript
maintenanceRecordTestEquipmentLinks: defineTable({
  maintenanceRecordId: v.id("maintenanceRecords"),
  taskCardId: v.id("taskCards"),
  workOrderId: v.id("workOrders"),
  testEquipmentId: v.id("testEquipment"),

  // Immutable snapshot of cal state AT TIME OF USE — never updated after creation
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

  // Expired cal override block — populated only when calStatusAtUse = "expired"
  expiredCalOverride: v.optional(v.object({
    explanation: v.string(),
    authorizedBy: v.id("users"),
    authorizedAt: v.number(),
    calPolicyMemoRef: v.string(),  // Must equal current signed memo ref
  })),

  linkedBy: v.id("users"),
  linkedAt: v.number(),
})
.index("by_maintenanceRecord", ["maintenanceRecordId"])
.index("by_workOrder", ["workOrderId"])
.index("by_equipment", ["testEquipmentId"]),
```

---

## 4. Mutation Specifications

### 4.1 `registerTestEquipment`

**File:** `convex/mutations/testEquipment.ts`

```typescript
export const registerTestEquipment = mutation({
  args: {
    internalEquipmentId: v.string(),
    manufacturer: v.string(),
    modelNumber: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.string(),
    description: v.string(),
    equipmentCategory: v.union(/* all category literals */),
    applicableRegulations: v.array(v.string()),
    applicableTSOs: v.array(v.string()),
    purchaseOrderRef: v.optional(v.string()),
    assignedLocation: v.optional(v.string()),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // 1. Verify caller is authenticated and has org membership
    const caller = await requireAuthenticatedUser(ctx);
    await requireOrgMembership(ctx, caller.userId, args.orgId);

    // 2. Check serial number uniqueness within org
    const existing = await ctx.db
      .query("testEquipment")
      .withIndex("by_serialNumber", q => q.eq("serialNumber", args.serialNumber))
      .first();
    if (existing && existing.orgId === args.orgId) {
      throw new ConvexError(`Equipment with serial number ${args.serialNumber} already registered`);
    }

    // 3. Create equipment record in pending_cal_verification state
    const equipmentId = await ctx.db.insert("testEquipment", {
      ...args,
      status: "pending_cal_verification",
      calibrationHistory: [],
      receivedAt: Date.now(),
      receivedBy: caller.userId,
    });

    // 4. Emit audit event
    await emitAuditEvent(ctx, {
      eventType: "EQUIPMENT_REGISTERED",
      entityType: "testEquipment",
      entityId: equipmentId,
      actorId: caller.userId,
      orgId: args.orgId,
      metadata: { internalEquipmentId: args.internalEquipmentId, serialNumber: args.serialNumber },
    });

    return equipmentId;
  },
});
```

**Postconditions:**
- Equipment exists with `status = "pending_cal_verification"`
- No cal fields populated
- Audit event `EQUIPMENT_REGISTERED` emitted
- Equipment is NOT linkable to any maintenance record until `verifyCalibration` is called

---

### 4.2 `verifyCalibration` (transitions pending → available)

```typescript
export const verifyCalibration = mutation({
  args: {
    testEquipmentId: v.id("testEquipment"),
    calCertNumber: v.string(),
    calDate: v.number(),
    calDueDate: v.number(),
    calLab: v.string(),
    nvlapAccreditationNumber: v.optional(v.string()),
    nistTraceable: v.boolean(),
    calCertStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const equipment = await ctx.db.get(args.testEquipmentId);
    if (!equipment) throw new ConvexError("Equipment not found");

    // Guard: cal cert number non-empty
    if (!args.calCertNumber.trim()) throw new ConvexError("Cal cert number required");

    // Guard: calDate must be in the past
    if (args.calDate >= Date.now()) throw new ConvexError("Cal date must be in the past");

    // Guard: storage ref valid
    const stored = await ctx.storage.getUrl(args.calCertStorageId);
    if (!stored) throw new ConvexError("Cal cert storage reference invalid");

    // Move old cal to history if exists
    let history = equipment.calibrationHistory ?? [];
    if (equipment.calibrationCertRef) {
      history = [...history, {
        calCertNumber: equipment.calibrationCertRef,
        calDate: equipment.calibrationDate!,
        calDueDate: equipment.calibrationExpiry!,
        calLab: equipment.calibrationAuthority!,
        nistTraceable: equipment.calibrationNistTraceable!,
        calCertStorageId: equipment.calibrationCertStorageId!,
        replacedAt: Date.now(),
        replacedBy: (await requireAuthenticatedUser(ctx)).userId,
      }];
    }

    const now = Date.now();
    const newStatus = args.calDueDate <= now ? "cal_expired" : "available";

    await ctx.db.patch(args.testEquipmentId, {
      calibrationDate: args.calDate,
      calibrationExpiry: args.calDueDate,
      calibrationCertRef: args.calCertNumber,
      calibrationAuthority: args.calLab + (args.nvlapAccreditationNumber ? ` (NVLAP: ${args.nvlapAccreditationNumber})` : ""),
      calibrationCertStorageId: args.calCertStorageId,
      calibrationNistTraceable: args.nistTraceable,
      calibrationVerifiedBy: (await requireAuthenticatedUser(ctx)).userId,
      calibrationVerifiedAt: now,
      calibrationHistory: history,
      status: newStatus,
      calPolicyMemoRef: CAL_POLICY_MEMO_REF,
    });

    await emitAuditEvent(ctx, { eventType: "CALIBRATION_VERIFIED", entityId: args.testEquipmentId });
    return newStatus;
  },
});
```

---

### 4.3 `recordEquipmentUsage` (links equipment to maintenance record)

This is the renamed/scoped version of `linkTestEquipment`. Enforces the Marcus memo policy.

```typescript
export const recordEquipmentUsage = mutation({
  args: {
    maintenanceRecordId: v.id("maintenanceRecords"),
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    testEquipmentId: v.id("testEquipment"),
    expiredCalOverride: v.optional(v.object({
      explanation: v.string(),
      authorizedBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    const equipment = await ctx.db.get(args.testEquipmentId);
    if (!equipment) throw new ConvexError("Equipment not found");

    // HARD BLOCK: quarantined or retired equipment — no override path
    if (equipment.status === "quarantined" || equipment.status === "retired") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is ${equipment.status} — cannot be used in any maintenance record`
      );
    }

    // HARD BLOCK: pending_cal_verification — no cal data to snapshot
    if (equipment.status === "pending_cal_verification") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is pending calibration verification — cannot use until cal is verified`
      );
    }

    // HARD BLOCK: sent_for_calibration — out of shop
    if (equipment.status === "sent_for_calibration") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is sent for calibration — unavailable`
      );
    }

    // ADVISORY BLOCK on expired cal — requires documented override per CAL-POLICY-MEMO-V1
    if (equipment.status === "cal_expired") {
      if (!args.expiredCalOverride) {
        throw new ConvexError(
          `Equipment ${equipment.internalEquipmentId} calibration expired — override documentation required per CAL-POLICY-MEMO-V1`
        );
      }
      if (args.expiredCalOverride.explanation.trim().length < 30) {
        throw new ConvexError("Expired-cal override explanation must be at least 30 characters");
      }
      if (args.expiredCalOverride.authorizedBy === caller.userId) {
        throw new ConvexError("Expired-cal override authorizer must be different from the linking user");
      }
      // Verify authorizer is IA or shop lead
      await requireRoleAtOrMinimum(ctx, args.expiredCalOverride.authorizedBy, "shop_lead");
    }

    // Determine cal status at use
    const now = Date.now();
    const calExpiry = equipment.calibrationExpiry ?? 0;
    const daysUntilExpiry = (calExpiry - now) / (1000 * 60 * 60 * 24);
    const calStatusAtUse =
      calExpiry < now ? "expired" :
      daysUntilExpiry <= 30 ? "expiring_soon" :
      "current";

    // Create immutable link record
    const linkId = await ctx.db.insert("maintenanceRecordTestEquipmentLinks", {
      maintenanceRecordId: args.maintenanceRecordId,
      taskCardId: args.taskCardId,
      workOrderId: args.workOrderId,
      testEquipmentId: args.testEquipmentId,
      calStatusAtUse,
      calCertNumberAtUse: equipment.calibrationCertRef ?? "",
      calDateAtUse: equipment.calibrationDate ?? 0,
      calDueDateAtUse: equipment.calibrationExpiry ?? 0,
      calLabAtUse: equipment.calibrationAuthority ?? "",
      nistTraceableAtUse: equipment.calibrationNistTraceable ?? false,
      expiredCalOverride: args.expiredCalOverride
        ? { ...args.expiredCalOverride, authorizedAt: now, calPolicyMemoRef: CAL_POLICY_MEMO_REF }
        : undefined,
      linkedBy: caller.userId,
      linkedAt: now,
    });

    // Update live testEquipmentUsed array on maintenance record
    const record = await ctx.db.get(args.maintenanceRecordId);
    await ctx.db.patch(args.maintenanceRecordId, {
      testEquipmentUsed: [...(record?.testEquipmentUsed ?? []), args.testEquipmentId],
    });

    await emitAuditEvent(ctx, { eventType: "EQUIPMENT_LINKED_TO_RECORD", entityId: linkId, workOrderId: args.workOrderId });
    return linkId;
  },
});
```

**ENFORCEMENT — Block maintenance record signing if expired cal:**

```typescript
// In signMaintenanceRecord mutation (existing), add precheck:
export const signMaintenanceRecord = mutation({
  // ... existing args ...
  handler: async (ctx, args) => {
    // NEW: Check all linked test equipment for expired cal
    const links = await ctx.db
      .query("maintenanceRecordTestEquipmentLinks")
      .withIndex("by_maintenanceRecord", q => q.eq("maintenanceRecordId", args.maintenanceRecordId))
      .collect();

    for (const link of links) {
      if (link.calStatusAtUse === "expired" && !link.expiredCalOverride) {
        // Should not be reachable (recordEquipmentUsage enforces), but belt-and-suspenders
        throw new ConvexError(
          "Cannot sign: linked test equipment has expired calibration without documented override"
        );
      }
    }
    // ... existing sign logic continues
  },
});
```

---

### 4.4 `flagEquipmentExpired`

**Scheduled action — runs daily via Convex cron:**

```typescript
// convex/crons.ts
export const flagExpiredEquipment = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find all equipment where cal is past due and status is not already expired
    const toExpire = await ctx.db
      .query("testEquipment")
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.lt(q.field("calibrationExpiry"), now)
        )
      )
      .collect();

    for (const equipment of toExpire) {
      await ctx.db.patch(equipment._id, { status: "cal_expired" });
      await emitAuditEvent(ctx, {
        eventType: "EQUIPMENT_CAL_EXPIRED",
        entityId: equipment._id,
        metadata: { calExpiry: equipment.calibrationExpiry },
      });
      // Emit alert to cal coordinator
      await ctx.scheduler.runAfter(0, internal.notifications.sendCalExpiryAlert, {
        equipmentId: equipment._id,
        orgId: equipment.orgId,
        severity: "expired",
      });
    }

    // Also: transition cal_expiring_soon candidates (within 30 days)
    const thirtyDays = now + (30 * 24 * 60 * 60 * 1000);
    const toWarn = await ctx.db
      .query("testEquipment")
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.lt(q.field("calibrationExpiry"), thirtyDays),
          q.gt(q.field("calibrationExpiry"), now)
        )
      )
      .collect();

    for (const equipment of toWarn) {
      await ctx.db.patch(equipment._id, { status: "cal_expiring_soon" });
      const daysRemaining = Math.floor((equipment.calibrationExpiry! - now) / (1000 * 60 * 60 * 24));
      const severity = daysRemaining <= 7 ? "urgent" : "warning";
      await ctx.scheduler.runAfter(0, internal.notifications.sendCalExpiryAlert, {
        equipmentId: equipment._id,
        orgId: equipment.orgId,
        severity,
        daysRemaining,
      });
    }

    return { expired: toExpire.length, warned: toWarn.length };
  },
});

// Register in cron schedule:
// crons.daily("flag-expired-equipment", { hourUTC: 2, minuteUTC: 0 }, internal.crons.flagExpiredEquipment);
```

---

## 5. Query Specifications

### 5.1 `getEquipmentForOrg`
```typescript
// Returns equipment list with status filter support
// Args: { orgId, statusFilter?: status[], categoryFilter?: category[], calExpiryWithinDays?: number }
// Returns: equipment records with computed daysUntilExpiry
```

### 5.2 `getEquipmentUsedOnRecord`
```typescript
// Returns all link records for a maintenance record
// Includes snapshot cal data (not live — snapshot is audit truth)
// Used for PDF export, FAA inspector response, audit bundles
// Args: { maintenanceRecordId }
// Returns: link records with equipment identity fields from snapshot
```

---

## 6. Dale Purcell — UAT Script (Demo-Ready)

**Scenario:** Dale's avionics shop in Henderson, NV has just onboarded Athelon. They have 6 pieces of test equipment. Two are current, one is expiring in 12 days, one is expired (submitted to lab, awaiting return), one is pending cal verification, one is quarantined. Dale runs through the complete workflow before signing off on a pitot-static maintenance entry for N12345.

---

**Step 1 — Register equipment (one-time setup)**
- Navigate to: Equipment > Register New
- Enter: Manufacturer "Barfield", Model "DPS450", P/N "45-PH-A4", S/N "SN-20192244", Category "Pitot-Static", Applicable TSO: "TSO-C106", Applicable Reg: "14 CFR Part 43 Appendix E"
- Click Register → equipment appears in list with status badge "Pending Cal Verification" (amber)
- ✅ *Confirm: equipment is NOT selectable from the TestEquipmentPicker on any task card*

**Step 2 — Verify calibration (transition to Available)**
- Click equipment → "Verify Calibration"
- Enter: Cal Cert Number "CAL-NV-2024-00891", Cal Date: 2024-01-15, Cal Due Date: 2025-01-15, Cal Lab: "Nevada Calibration Inc.", NVLAP: "200901-0", NIST Traceable: Yes
- Upload cal cert PDF
- Submit → status changes to "Available" (green)
- ✅ *Confirm: equipment is now selectable from picker*

**Step 3 — Link equipment to a maintenance record**
- Open Work Order for N12345, pitot-static check task card
- Scroll to "Test Equipment Used" panel → click "Add Equipment"
- Search "Barfield" → select DPS450 SN-20192244 → status shows "Current" (green)
- Click Add → equipment appears in panel with cal details (cert number, cal date, due date, lab, NIST: Y)
- ✅ *Confirm: `maintenanceRecordTestEquipmentLinks` record created with calStatusAtUse = "current"*

**Step 4 — Attempt to link expired equipment**
- Add second equipment: a transponder ramp tester, S/N "SN-RAMP-0042", cal expired 45 days ago
- Search in picker → equipment shown with red "Cal Expired" badge
- Attempt to add without override → system shows error: "Equipment calibration expired 45 days ago — override documentation required per CAL-POLICY-MEMO-V1"
- ✅ *Confirm: error message, no link created*

**Step 5 — Expired cal with documented override**
- Click "Add with Override" on the expired ramp tester
- Override form appears: explanation textarea (min 30 chars), "Authorized by" dropdown (IA/shop lead only)
- Enter: "Equipment submitted to CalLab Inc. 5 days ago. Lab confirmation email LAB-2024-0559 on file. Return expected this week."
- Authorized by: Shop IA (different user from Dale)
- Submit → equipment added with amber "Cal expired at use — override documented" badge
- ✅ *Confirm: link created with expiredCalOverride populated*

**Step 6 — Attempt to sign maintenance record**
- Both pieces of equipment linked; second has override
- Click "Sign Record" → proceeds normally (expired with documented override passes signing gate)
- ✅ *Confirm: signature succeeds; record now includes structured test equipment section*

**Step 7 — PDF Export**
- Export WO as PDF
- Review "Test Equipment Used" section: shows both pieces, first green (current cal), second amber (expired at use / override documented with explanation)
- ✅ *Confirm: cert number, cal date, due date, lab, NIST field all present for each*

**Step 8 — Cal expiry alert**
- Next day: daily cron runs, transitions expiring-in-12-days equipment to "cal_expiring_soon"
- Cal coordinator receives in-app alert: "Equipment DPS-ALTIMETER-01 calibration expires in 12 days — action required"
- ✅ *Confirm: 30-day amber notification, 7-day urgent notification*

**Dale UAT Sign-Off Criteria:**
- [ ] All structured fields populated in maintenance record export
- [ ] Expired-cal block and override documented correctly
- [ ] Alert system triggered at 30 and 7 days
- [ ] FAA inspector query scenario: can retrieve complete cal record for all equipment used on N12345 in one click

---

## 7. Cilla Oduya — Test Plan (Minimum 6 Cases)

| TC | Title | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| TC-F-01 | Register equipment transitions to pending_cal_verification | `registerTestEquipment` with valid args | Equipment created, status = pending_cal_verification; NOT selectable in picker; audit event EQUIPMENT_REGISTERED emitted | Part 145.109(a) |
| TC-F-02 | Cannot link pending_cal_verification equipment | Attempt `recordEquipmentUsage` with equipment in pending_cal_verification status | Mutation throws: "pending calibration verification — cannot use until verified"; no link record created; maintenance record unchanged | Part 145.109(a) |
| TC-F-03 | Expired cal block without override | Equipment with calExpiry = 45 days ago; attempt `recordEquipmentUsage` with no expiredCalOverride | Mutation throws: "calibration expired — override documentation required per CAL-POLICY-MEMO-V1"; no link created | CAL-POLICY-MEMO-V1; §43.9(a)(2) |
| TC-F-04 | Expired cal override — explanation too short | expiredCalOverride.explanation = "too short" (< 30 chars) | Mutation throws: "Expired-cal override explanation must be at least 30 characters" | CAL-POLICY-MEMO-V1 |
| TC-F-05 | Expired cal override — self-authorization blocked | authorizedBy = same userId as the calling user | Mutation throws: "Expired-cal override authorizer must be different from the linking user" | CAL-POLICY-MEMO-V1 §2.4 |
| TC-F-06 | Cal snapshot immutability — cal renewed after link | Link equipment at T=0 (calDueDate = Jun 2024). Renew cal at T+7 days (calDueDate = Jun 2025). Query link record at T+14. | `calDueDateAtUse` in link record still shows Jun 2024 (original snapshot); live equipment record shows Jun 2025; no mutation modifies existing link's snapshot fields | AC 120-78B non-repudiation |
| TC-F-07 | Forged cert detection pattern — storage ref check | `verifyCalibration` with a calCertStorageId that does not reference a valid uploaded file | Mutation throws: "Cal cert storage reference invalid"; no cal verification written | Part 145.109(a) |
| TC-F-08 | Quarantined equipment — absolute block | Equipment in quarantined status; attempt `recordEquipmentUsage` | Mutation throws: "quarantined — cannot be used in any maintenance record"; no override path available | Teresa Varga requirement |
| TC-F-09 | flagEquipmentExpired daily cron | Equipment with calibrationExpiry = yesterday; status = available before cron | After cron runs: status = cal_expired; EQUIPMENT_CAL_EXPIRED audit event emitted; cal coordinator receives alert | Part 145.109(a) |
| TC-F-10 | Block signing — expired cal without override (belt-and-suspenders) | Manually insert a link record with calStatusAtUse = "expired" and no expiredCalOverride (bypassing mutation layer via direct DB write in test) | `signMaintenanceRecord` throws: "Cannot sign: linked test equipment has expired calibration without documented override" | CAL-POLICY-MEMO-V1 |
| TC-F-11 | PDF export — structured test equipment section | WO with 2 task cards, each with different linked equipment | PDF includes "Test Equipment Used" section per task card; each entry has: equipment ID, make/model, S/N, cert number, cal date, due date, lab, NIST (Y/N); expired-at-use items flagged amber | AC 43-9C §6; §43.9(a)(2) |
| TC-F-12 | Usage linkage verification — getEquipmentUsedOnRecord | WO with 3 equipment links across 2 maintenance records | Query returns all 3 links, grouped by record; snapshot fields match recorded values at time of link | Audit trail integrity |

---

## 8. Marcus Webb — Compliance Checklist

### Applicable Standards
- **14 CFR §43.9(a)(2)** — Maintenance record approved data references
- **14 CFR Part 43, Appendix E** — Altimeter, static, transponder test equipment requirements
- **14 CFR §91.411 / §91.413** — IFR equipment test currency
- **Part 145.109(a)** — Repair station equipment condition requirements
- **Part 145.217** — Records retention (min 2 years; this build uses 7-year floor)
- **AC 43-9C §6** — Maintenance record content (test equipment identifiable from record)
- **AC 43.13-1B Chapter 11** — Calibrated test equipment in airframe maintenance context
- **TSO-C106** — Air data test sets calibration requirements
- **ANSI/NCSL Z540-1 / ISO/IEC 17025** — Cal lab accreditation standards (NVLAP)

### Marcus Pre-Release Checklist

**HARD BLOCKERS — any one = NO-GO:**
- [ ] `CAL-POLICY-MEMO-V1` signed by Marcus Webb before expired-cal branch merged
- [ ] `maintenanceRecordTestEquipmentLinks` snapshot fields (`calCertNumberAtUse`, `calDateAtUse`, `calDueDateAtUse`, `calLabAtUse`, `nistTraceableAtUse`) are immutable after creation — no mutation updates them; TC-F-06 passes via direct mutation test
- [ ] Equipment in `pending_cal_verification` or `quarantined` status cannot be linked under any code path including direct API call — TC-F-02 and TC-F-08 pass via API bypass test
- [ ] PDF export includes structured "Test Equipment Used" section — TC-F-11 passes
- [ ] Cal cert PDF upload required before equipment transitions to available — TC-F-07 passes

**Standard Verification Items:**
- [ ] `equipmentCategory` → applicable TSO/FAR mapping verified correct for all 8 categories
- [ ] `calibrationNistTraceable` boolean is manually attested, never auto-populated or defaulted to true
- [ ] `calLabAccreditationNumber` (NVLAP) is prominently prompted; skipping without acknowledgment requires explicit click
- [ ] `sent_for_calibration` status blocks equipment use (same as `cal_expired`)
- [ ] Override frequency dashboard in place; quarterly review scheduled
- [ ] FSDO response scenario tested: FAA inspector can retrieve complete, structured cal evidence for all equipment used on specific N-number
- [ ] Records retention: `calibrationHistory` entries and cal cert PDFs in `_storage` not deleted within 7-year policy window

---

## 9. Release Blockers Summary

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | CAL-POLICY-MEMO-V1 signed | Marcus Webb | ⬜ PENDING SIGNATURE |
| 2 | WS16-B auth-ordering build complete | WS16-B team | Dependency |
| 3 | TC-F-02/F-03/F-06/F-07/F-08 pass (mutation + API bypass) | Cilla | ⬜ Not run |
| 4 | PDF export test equipment section implemented (TC-F-11) | Devraj | ⬜ Not built |
| 5 | Dale Purcell UAT sign-off | Dale | ⬜ Not run |

---

## 10. Execution Checklist

- [ ] `testEquipment` and `maintenanceRecordTestEquipmentLinks` schema migrations written and reviewed
- [ ] `registerTestEquipment` mutation written and unit-tested
- [ ] `verifyCalibration` mutation written and unit-tested
- [ ] `recordEquipmentUsage` mutation written with all hard blocks and override path — **do not write expired-cal branch until CAL-POLICY-MEMO-V1 signed**
- [ ] `flagEquipmentExpired` cron written and tested in dev with simulated time
- [ ] `signMaintenanceRecord` updated with belt-and-suspenders signing gate
- [ ] `getEquipmentUsedOnRecord` query written
- [ ] `TestEquipmentPanel` UI component built (list view on task card)
- [ ] `TestEquipmentPicker` UI component built (modal with cal status badges)
- [ ] `TestEquipmentDashboard` shop management view built
- [ ] PDF export "Test Equipment Used" section integrated with WS16-C
- [ ] Cal expiry notification system wired to notification table
- [ ] All 12 test cases passing (TC-F-01 through TC-F-12)
- [ ] Marcus compliance checklist complete and signed
- [ ] Dale Purcell UAT sign-off attached
- [ ] WS16-M hash manifest updated with equipment linkage events

---

*Filed: 2026-02-22 | Phase 16 depth pass | Athelon WS16-F*
*Source: phase-15-rd/ws15-f-test-equipment.md*
*Memo pending: CAL-POLICY-MEMO-V1 — Marcus Webb*
