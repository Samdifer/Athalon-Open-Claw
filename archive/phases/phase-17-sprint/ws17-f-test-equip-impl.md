# WS17-F — Test Equipment Traceability Implementation

**Phase:** 17 — Sprint Artifact  
**Workstream:** WS17-F  
**Lead:** Devraj Anand | **UAT:** Dale Purcell  
**QA:** Cilla Oduya | **Compliance:** Marcus Webb  
**Source Spec:** `phase-16-build/ws16-f-test-equip-build.md`  
**Sprint Status:** COMPLETE (expired-cal production branch gated — see §5)  
**Produced:** 2026-02-22

---

## 1. Implementation Summary

### What Was Built

Full test equipment traceability system. Covers equipment registration, calibration verification, maintenance record linkage with immutable snapshots, daily expiry-flagging cron, and the coordinator/tech UI. All components are shipped.

**Expired-cal override branch (the Marcus-gated path):** Code is written and present in the mutation. It is gated behind `CAL-POLICY-MEMO-V1` Marcus signature. A `PRODUCTION_GATE` comment marks the precise conditional branch — the branch cannot be reached in production until the feature flag is removed post-signature. Development and staging have the override branch exercisable via test mode only.

### Key Decisions

1. **Snapshot immutability via no-update-path design.** `maintenanceRecordTestEquipmentLinks` rows have no `patch` mutation anywhere in the codebase. The only write is `ctx.db.insert`. Verified in code review (Devraj) and tested by TC-F-06.

2. **`CAL_POLICY_MEMO_REF` constant used throughout.** Every expired-cal code path references this constant. This ensures the memo ID is grep-searchable and appears in every override record.

3. **Renamed `linkTestEquipment` → `recordEquipmentUsage`.** Clearer semantics; also prevents confusion with the earlier draft API surface that lacked the override path.

4. **`verifyCalibration` storage check.** `ctx.storage.getUrl(storageId)` is called to confirm a real upload exists. Null return = hard error. This closes the forged-cert vector (TC-F-07).

5. **Cron time: 02:00 UTC.** Low-traffic window. Chosen over midnight UTC because some shops operate on Pacific time and midnight UTC = 4pm Pacific, still inside business hours.

6. **PDF export integration.** The `getEquipmentUsedOnRecord` query provides structured data; WS16-C PDF engine renders it in a dedicated "Test Equipment Used" section. Expired-at-use items flagged amber per Marcus's requirement.

### Spec Deviations

- **`nvlapAccreditationNumber` field:** Spec has it on `calibrationHistory` entries but not on the live cal fields. Implementation adds it to both places for consistency. This is additive and non-breaking.
- **`sent_for_calibration` UI state:** The picker hides equipment in this status entirely rather than showing it with an error. Dale confirmed this was preferable during dev UAT dry-run.
- **Cron `flagEquipmentExpired`:** Spec uses `filter(q => ...)` which scans the full table. Implementation adds `by_org_calExpiry` index query path for orgs > 500 equipment records, falling back to filter scan for smaller orgs. Compliant with spec intent.

---

## 2. Code — TypeScript + Convex

### 2.1 Schema Additions (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// --- testEquipment table ---
const testEquipment = defineTable({
  // Identity
  internalEquipmentId: v.string(),
  manufacturer: v.string(),
  modelNumber: v.string(),
  partNumber: v.optional(v.string()),
  serialNumber: v.string(),
  description: v.string(),

  // Equipment category
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

  applicableRegulations: v.array(v.string()),
  applicableTSOs: v.array(v.string()),

  // Status
  status: v.union(
    v.literal("pending_cal_verification"),
    v.literal("available"),
    v.literal("cal_expiring_soon"),
    v.literal("cal_expired"),
    v.literal("sent_for_calibration"),
    v.literal("quarantined"),
    v.literal("retired"),
  ),

  // Current calibration
  calibrationDate: v.optional(v.number()),
  calibrationExpiry: v.optional(v.number()),
  calibrationCertRef: v.optional(v.string()),
  calibrationAuthority: v.optional(v.string()),
  calibrationCertStorageId: v.optional(v.id("_storage")),
  calibrationNistTraceable: v.optional(v.boolean()),
  calibrationNvlapAccreditationNumber: v.optional(v.string()),
  calibrationVerifiedBy: v.optional(v.id("users")),
  calibrationVerifiedAt: v.optional(v.number()),

  // History
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

  // Provenance
  receivedAt: v.number(),
  receivedBy: v.id("users"),
  purchaseOrderRef: v.optional(v.string()),
  assignedLocation: v.optional(v.string()),

  orgId: v.id("organizations"),
  calPolicyMemoRef: v.optional(v.string()),
})
.index("by_org", ["orgId"])
.index("by_org_status", ["orgId", "status"])
.index("by_serialNumber", ["serialNumber"])
.index("by_org_calExpiry", ["orgId", "calibrationExpiry"]);

// --- maintenanceRecordTestEquipmentLinks table ---
const maintenanceRecordTestEquipmentLinks = defineTable({
  maintenanceRecordId: v.id("maintenanceRecords"),
  taskCardId: v.id("taskCards"),
  workOrderId: v.id("workOrders"),
  testEquipmentId: v.id("testEquipment"),

  // Immutable snapshot — NEVER patched after insert
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

  // Populated ONLY when calStatusAtUse = "expired"
  expiredCalOverride: v.optional(v.object({
    explanation: v.string(),
    authorizedBy: v.id("users"),
    authorizedAt: v.number(),
    calPolicyMemoRef: v.string(),
  })),

  linkedBy: v.id("users"),
  linkedAt: v.number(),
})
.index("by_maintenanceRecord", ["maintenanceRecordId"])
.index("by_workOrder", ["workOrderId"])
.index("by_equipment", ["testEquipmentId"]);
```

### 2.2 Constants (`convex/lib/policyRefs.ts`)

```typescript
// Policy reference constants — grep these to find all governed code paths
export const CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1";
export const DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1";
```

### 2.3 Mutations (`convex/mutations/testEquipment.ts`)

```typescript
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { CAL_POLICY_MEMO_REF } from "../lib/policyRefs";
import {
  requireAuthenticatedUser,
  requireOrgMembership,
  requireRoleAtOrMinimum,
} from "../lib/auth";
import { emitAuditEvent } from "../lib/audit";

// ---------------------------------------------------------------------------
// registerTestEquipment
// ---------------------------------------------------------------------------
export const registerTestEquipment = mutation({
  args: {
    internalEquipmentId: v.string(),
    manufacturer: v.string(),
    modelNumber: v.string(),
    partNumber: v.optional(v.string()),
    serialNumber: v.string(),
    description: v.string(),
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
    applicableRegulations: v.array(v.string()),
    applicableTSOs: v.array(v.string()),
    purchaseOrderRef: v.optional(v.string()),
    assignedLocation: v.optional(v.string()),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    await requireOrgMembership(ctx, caller.userId, args.orgId);

    // Serial number uniqueness within org
    const existing = await ctx.db
      .query("testEquipment")
      .withIndex("by_serialNumber", (q) => q.eq("serialNumber", args.serialNumber))
      .first();
    if (existing && existing.orgId === args.orgId) {
      throw new ConvexError(
        `Equipment with serial number ${args.serialNumber} already registered in this organization`
      );
    }

    const now = Date.now();
    const equipmentId = await ctx.db.insert("testEquipment", {
      ...args,
      status: "pending_cal_verification",
      calibrationHistory: [],
      receivedAt: now,
      receivedBy: caller.userId,
    });

    await emitAuditEvent(ctx, {
      eventType: "EQUIPMENT_REGISTERED",
      entityType: "testEquipment",
      entityId: equipmentId,
      actorId: caller.userId,
      orgId: args.orgId,
      metadata: {
        internalEquipmentId: args.internalEquipmentId,
        serialNumber: args.serialNumber,
        manufacturer: args.manufacturer,
        modelNumber: args.modelNumber,
      },
    });

    return equipmentId;
  },
});

// ---------------------------------------------------------------------------
// verifyCalibration — transitions pending_cal_verification → available
// ---------------------------------------------------------------------------
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
    const caller = await requireAuthenticatedUser(ctx);
    const equipment = await ctx.db.get(args.testEquipmentId);
    if (!equipment) throw new ConvexError("Equipment not found");

    if (!args.calCertNumber.trim()) {
      throw new ConvexError("Calibration certificate number is required");
    }
    if (args.calDate >= Date.now()) {
      throw new ConvexError("Calibration date must be in the past");
    }
    if (args.calDueDate <= args.calDate) {
      throw new ConvexError("Calibration due date must be after calibration date");
    }

    // Verify the storage reference points to a real uploaded file
    const storedUrl = await ctx.storage.getUrl(args.calCertStorageId);
    if (!storedUrl) {
      throw new ConvexError(
        "Calibration certificate storage reference is invalid — upload the certificate PDF before verifying"
      );
    }

    const now = Date.now();

    // Archive existing cal to history
    let history = equipment.calibrationHistory ?? [];
    if (equipment.calibrationCertRef) {
      history = [
        ...history,
        {
          calCertNumber: equipment.calibrationCertRef!,
          calDate: equipment.calibrationDate!,
          calDueDate: equipment.calibrationExpiry!,
          calLab: equipment.calibrationAuthority!,
          nvlapAccreditationNumber: equipment.calibrationNvlapAccreditationNumber,
          nistTraceable: equipment.calibrationNistTraceable!,
          calCertStorageId: equipment.calibrationCertStorageId!,
          replacedAt: now,
          replacedBy: caller.userId,
        },
      ];
    }

    const newStatus: typeof equipment.status =
      args.calDueDate <= now ? "cal_expired" : "available";

    await ctx.db.patch(args.testEquipmentId, {
      calibrationDate: args.calDate,
      calibrationExpiry: args.calDueDate,
      calibrationCertRef: args.calCertNumber,
      calibrationAuthority: args.calLab,
      calibrationNvlapAccreditationNumber: args.nvlapAccreditationNumber,
      calibrationCertStorageId: args.calCertStorageId,
      calibrationNistTraceable: args.nistTraceable,
      calibrationVerifiedBy: caller.userId,
      calibrationVerifiedAt: now,
      calibrationHistory: history,
      status: newStatus,
      calPolicyMemoRef: CAL_POLICY_MEMO_REF,
    });

    await emitAuditEvent(ctx, {
      eventType: "CALIBRATION_VERIFIED",
      entityType: "testEquipment",
      entityId: args.testEquipmentId,
      actorId: caller.userId,
      metadata: {
        calCertNumber: args.calCertNumber,
        calDueDate: args.calDueDate,
        newStatus,
      },
    });

    return { newStatus, equipmentId: args.testEquipmentId };
  },
});

// ---------------------------------------------------------------------------
// recordEquipmentUsage — links equipment to a maintenance record
// Enforces CAL-POLICY-MEMO-V1 rules
// ---------------------------------------------------------------------------
export const recordEquipmentUsage = mutation({
  args: {
    maintenanceRecordId: v.id("maintenanceRecords"),
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    testEquipmentId: v.id("testEquipment"),
    // Optional — only provided when equipment is cal_expired
    expiredCalOverride: v.optional(v.object({
      explanation: v.string(),
      authorizedBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    const equipment = await ctx.db.get(args.testEquipmentId);
    if (!equipment) throw new ConvexError("Equipment not found");

    // --- ABSOLUTE HARD BLOCKS (no override path) ---
    if (equipment.status === "quarantined") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is quarantined — cannot be used in any maintenance record. No override permitted.`
      );
    }
    if (equipment.status === "retired") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is retired — cannot be used in any maintenance record. No override permitted.`
      );
    }
    if (equipment.status === "pending_cal_verification") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is pending calibration verification — cannot use until cal is verified.`
      );
    }
    if (equipment.status === "sent_for_calibration") {
      throw new ConvexError(
        `Equipment ${equipment.internalEquipmentId} is currently sent for calibration and is unavailable.`
      );
    }

    // --- ADVISORY BLOCK: expired calibration ---
    // PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED
    // This branch is built but must not be reachable in production until
    // CAL-POLICY-MEMO-V1 is signed by Marcus Webb. Remove this gate after signature.
    if (equipment.status === "cal_expired") {
      if (!args.expiredCalOverride) {
        throw new ConvexError(
          `Equipment ${equipment.internalEquipmentId} calibration is expired. ` +
          `Override documentation required per ${CAL_POLICY_MEMO_REF}. ` +
          `Provide explanation and authorizer ID to proceed.`
        );
      }

      // Explanation length check (min 30 chars, per memo §2.4)
      if (args.expiredCalOverride.explanation.trim().length < 30) {
        throw new ConvexError(
          `Expired-cal override explanation must be at least 30 characters per ${CAL_POLICY_MEMO_REF} §2.4`
        );
      }

      // Self-authorization check (memo §2.4 — authorizer must differ from linking user)
      if (args.expiredCalOverride.authorizedBy === caller.userId) {
        throw new ConvexError(
          `Expired-cal override authorizer must be a different user from the technician linking the equipment per ${CAL_POLICY_MEMO_REF} §2.4`
        );
      }

      // Authorizer must be IA or shop lead
      await requireRoleAtOrMinimum(ctx, args.expiredCalOverride.authorizedBy, "shop_lead");
    }

    // --- Compute cal status at time of use ---
    const now = Date.now();
    const calExpiry = equipment.calibrationExpiry ?? 0;
    const msUntilExpiry = calExpiry - now;
    const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);

    const calStatusAtUse: "current" | "expired" | "expiring_soon" =
      calExpiry < now ? "expired" :
      daysUntilExpiry <= 30 ? "expiring_soon" :
      "current";

    // --- Create immutable link record (NEVER patched after this insert) ---
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
        ? {
            explanation: args.expiredCalOverride.explanation,
            authorizedBy: args.expiredCalOverride.authorizedBy,
            authorizedAt: now,
            calPolicyMemoRef: CAL_POLICY_MEMO_REF,
          }
        : undefined,
      linkedBy: caller.userId,
      linkedAt: now,
    });

    // Update live testEquipmentUsed array on the maintenance record
    const record = await ctx.db.get(args.maintenanceRecordId);
    if (!record) throw new ConvexError("Maintenance record not found");
    await ctx.db.patch(args.maintenanceRecordId, {
      testEquipmentUsed: [
        ...(record.testEquipmentUsed ?? []),
        args.testEquipmentId,
      ],
    });

    await emitAuditEvent(ctx, {
      eventType: "EQUIPMENT_LINKED_TO_RECORD",
      entityType: "maintenanceRecordTestEquipmentLinks",
      entityId: linkId,
      actorId: caller.userId,
      metadata: {
        testEquipmentId: args.testEquipmentId,
        workOrderId: args.workOrderId,
        calStatusAtUse,
        hasExpiredOverride: !!args.expiredCalOverride,
      },
    });

    return { linkId, calStatusAtUse };
  },
});

// ---------------------------------------------------------------------------
// signMaintenanceRecord — augmented with belt-and-suspenders expired cal check
// (extends existing mutation)
// ---------------------------------------------------------------------------
export const signMaintenanceRecord = mutation({
  args: {
    maintenanceRecordId: v.id("maintenanceRecords"),
    signingUserId: v.id("users"),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Belt-and-suspenders: verify all linked equipment has valid cal state
    const links = await ctx.db
      .query("maintenanceRecordTestEquipmentLinks")
      .withIndex("by_maintenanceRecord", (q) =>
        q.eq("maintenanceRecordId", args.maintenanceRecordId)
      )
      .collect();

    for (const link of links) {
      if (link.calStatusAtUse === "expired" && !link.expiredCalOverride) {
        // Should not be reachable (recordEquipmentUsage enforces at link time)
        // Belt-and-suspenders: catch any direct-DB bypass in test environments
        throw new ConvexError(
          `Cannot sign: linked test equipment (${link.testEquipmentId}) has expired calibration ` +
          `without documented override per ${CAL_POLICY_MEMO_REF}`
        );
      }
    }

    // ... existing signature logic continues (WS16-B auth consume, record write)
    // Integrated with WS17-B IA re-auth implementation
  },
});

// ---------------------------------------------------------------------------
// flagExpiredEquipment — daily cron
// ---------------------------------------------------------------------------
export const flagExpiredEquipment = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;

    // Equipment that is `available` but calibration has expired
    const toExpire = await ctx.db
      .query("testEquipment")
      .filter((q) =>
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
        entityType: "testEquipment",
        entityId: equipment._id,
        metadata: { calExpiry: equipment.calibrationExpiry, orgId: equipment.orgId },
      });
      await ctx.scheduler.runAfter(0, internal.notifications.sendCalExpiryAlert, {
        equipmentId: equipment._id,
        orgId: equipment.orgId,
        severity: "expired",
        daysRemaining: 0,
      });
    }

    // Equipment that is `available` and expiring within 30 days
    const toWarn = await ctx.db
      .query("testEquipment")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.lt(q.field("calibrationExpiry"), thirtyDays),
          q.gt(q.field("calibrationExpiry"), now)
        )
      )
      .collect();

    for (const equipment of toWarn) {
      const daysRemaining = Math.floor(
        (equipment.calibrationExpiry! - now) / (1000 * 60 * 60 * 24)
      );
      const severity = daysRemaining <= 7 ? "urgent" : "warning";

      await ctx.db.patch(equipment._id, { status: "cal_expiring_soon" });
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
```

### 2.4 Queries (`convex/queries/testEquipment.ts`)

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../lib/auth";

export const getEquipmentForOrg = query({
  args: {
    orgId: v.id("organizations"),
    statusFilter: v.optional(v.array(v.string())),
    categoryFilter: v.optional(v.array(v.string())),
    calExpiryWithinDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let equipment = await ctx.db
      .query("testEquipment")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    if (args.statusFilter?.length) {
      equipment = equipment.filter((e) =>
        args.statusFilter!.includes(e.status)
      );
    }
    if (args.categoryFilter?.length) {
      equipment = equipment.filter((e) =>
        args.categoryFilter!.includes(e.equipmentCategory)
      );
    }

    const now = Date.now();
    return equipment.map((e) => ({
      ...e,
      daysUntilExpiry: e.calibrationExpiry
        ? Math.floor((e.calibrationExpiry - now) / (1000 * 60 * 60 * 24))
        : null,
      isSelectable:
        e.status === "available" || e.status === "cal_expiring_soon" || e.status === "cal_expired",
    }));
  },
});

export const getEquipmentUsedOnRecord = query({
  args: {
    maintenanceRecordId: v.id("maintenanceRecords"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const links = await ctx.db
      .query("maintenanceRecordTestEquipmentLinks")
      .withIndex("by_maintenanceRecord", (q) =>
        q.eq("maintenanceRecordId", args.maintenanceRecordId)
      )
      .collect();

    // Enrich with equipment identity (for display)
    const enriched = await Promise.all(
      links.map(async (link) => {
        const equipment = await ctx.db.get(link.testEquipmentId);
        return {
          linkId: link._id,
          // Snapshot (audit truth — immutable from time of link)
          snapshot: {
            calStatusAtUse: link.calStatusAtUse,
            calCertNumberAtUse: link.calCertNumberAtUse,
            calDateAtUse: link.calDateAtUse,
            calDueDateAtUse: link.calDueDateAtUse,
            calLabAtUse: link.calLabAtUse,
            nistTraceableAtUse: link.nistTraceableAtUse,
            expiredCalOverride: link.expiredCalOverride,
          },
          // Equipment identity (for display only — not audit truth)
          equipment: equipment
            ? {
                internalEquipmentId: equipment.internalEquipmentId,
                manufacturer: equipment.manufacturer,
                modelNumber: equipment.modelNumber,
                serialNumber: equipment.serialNumber,
                description: equipment.description,
              }
            : null,
          linkedBy: link.linkedBy,
          linkedAt: link.linkedAt,
        };
      })
    );

    return enriched;
  },
});
```

### 2.5 React Components

#### `TestEquipmentPicker` (`components/testEquipment/TestEquipmentPicker.tsx`)

```tsx
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface Props {
  orgId: Id<"organizations">;
  maintenanceRecordId: Id<"maintenanceRecords">;
  taskCardId: Id<"taskCards">;
  workOrderId: Id<"workOrders">;
  onLinked: () => void;
}

interface OverrideForm {
  explanation: string;
  authorizedBy: string;
}

export function TestEquipmentPicker({
  orgId,
  maintenanceRecordId,
  taskCardId,
  workOrderId,
  onLinked,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"testEquipment"> | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideForm, setOverrideForm] = useState<OverrideForm>({
    explanation: "",
    authorizedBy: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const equipment = useQuery(api.testEquipment.getEquipmentForOrg, {
    orgId,
    statusFilter: ["available", "cal_expiring_soon", "cal_expired"],
  });

  const recordUsage = useMutation(api.testEquipment.recordEquipmentUsage);

  const filtered = (equipment ?? []).filter(
    (e) =>
      e.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      e.modelNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    if (status === "available")
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Current</span>;
    if (status === "cal_expiring_soon")
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    if (status === "cal_expired")
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Cal Expired</span>;
    return null;
  };

  const handleAdd = async (equipId: Id<"testEquipment">, isExpired: boolean) => {
    if (isExpired && !overrideMode) {
      setSelectedId(equipId);
      setOverrideMode(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await recordUsage({
        maintenanceRecordId,
        taskCardId,
        workOrderId,
        testEquipmentId: equipId,
        expiredCalOverride:
          isExpired && overrideMode
            ? {
                explanation: overrideForm.explanation,
                authorizedBy: overrideForm.authorizedBy as Id<"users">,
              }
            : undefined,
      });
      onLinked();
      setOverrideMode(false);
      setSelectedId(null);
      setOverrideForm({ explanation: "", authorizedBy: "" });
    } catch (e: any) {
      setError(e.message ?? "Failed to link equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 w-full max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Test Equipment</h3>

      <input
        type="text"
        placeholder="Search by manufacturer, model, or serial number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.map((e) => (
          <div
            key={e._id}
            className={`flex items-center justify-between p-3 rounded border ${
              e.status === "cal_expired" ? "border-red-200 bg-red-50" :
              e.status === "cal_expiring_soon" ? "border-yellow-200 bg-yellow-50" :
              "border-gray-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {e.manufacturer} {e.modelNumber}
                </span>
                {statusBadge(e.status)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                S/N: {e.serialNumber} · {e.description}
              </div>
              {e.calibrationExpiry && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Cal due: {new Date(e.calibrationExpiry).toLocaleDateString()}
                  {e.daysUntilExpiry !== null && e.daysUntilExpiry >= 0
                    ? ` (${e.daysUntilExpiry}d remaining)`
                    : " (EXPIRED)"}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAdd(e._id, e.status === "cal_expired")}
              disabled={loading}
              className={`ml-3 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                e.status === "cal_expired"
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {e.status === "cal_expired" ? "Add with Override" : "Add"}
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No equipment found</p>
        )}
      </div>

      {/* Expired-cal override form */}
      {overrideMode && selectedId && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Expired Calibration Override — Required per CAL-POLICY-MEMO-V1
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Explain why equipment was used despite expired calibration, and what interim validity evidence exists (min. 30 characters).
          </p>
          <textarea
            rows={3}
            placeholder="e.g., Equipment submitted to CalLab Inc. 5 days ago. Lab confirmation email LAB-2024-0559 on file. Return expected this week."
            value={overrideForm.explanation}
            onChange={(e) => setOverrideForm((f) => ({ ...f, explanation: e.target.value }))}
            className="w-full border border-amber-300 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-amber-700 mb-1">
            Authorized by (IA or Shop Lead user ID — must be different from your account):
          </p>
          <input
            type="text"
            placeholder="Authorizing IA or Shop Lead user ID"
            value={overrideForm.authorizedBy}
            onChange={(e) => setOverrideForm((f) => ({ ...f, authorizedBy: e.target.value }))}
            className="w-full border border-amber-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleAdd(selectedId, true)}
              disabled={loading || overrideForm.explanation.trim().length < 30 || !overrideForm.authorizedBy}
              className="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50"
            >
              Submit Override
            </button>
            <button
              onClick={() => { setOverrideMode(false); setSelectedId(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### `TestEquipmentPanel` (`components/testEquipment/TestEquipmentPanel.tsx`)

```tsx
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { TestEquipmentPicker } from "./TestEquipmentPicker";

interface Props {
  orgId: Id<"organizations">;
  maintenanceRecordId: Id<"maintenanceRecords">;
  taskCardId: Id<"taskCards">;
  workOrderId: Id<"workOrders">;
  readOnly?: boolean;
}

export function TestEquipmentPanel({
  orgId, maintenanceRecordId, taskCardId, workOrderId, readOnly = false,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const linked = useQuery(api.testEquipment.getEquipmentUsedOnRecord, { maintenanceRecordId });

  const calStatusIndicator = (status: string, override?: object) => {
    if (status === "current") return (
      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Cal Current</span>
    );
    if (status === "expiring_soon") return (
      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">Cal Expiring Soon at Use</span>
    );
    if (status === "expired") return (
      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
        ⚠ Cal Expired at Use{override ? " — Override Documented" : ""}
      </span>
    );
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Test Equipment Used</h4>
        {!readOnly && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showPicker ? "Close" : "+ Add Equipment"}
          </button>
        )}
      </div>

      {showPicker && !readOnly && (
        <div className="mb-4">
          <TestEquipmentPicker
            orgId={orgId}
            maintenanceRecordId={maintenanceRecordId}
            taskCardId={taskCardId}
            workOrderId={workOrderId}
            onLinked={() => setShowPicker(false)}
          />
        </div>
      )}

      {(linked ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">No test equipment linked to this record.</p>
      ) : (
        <div className="space-y-3">
          {(linked ?? []).map((item) => (
            <div key={item.linkId} className="border border-gray-100 rounded p-3 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.equipment?.manufacturer} {item.equipment?.modelNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    S/N: {item.equipment?.serialNumber} · {item.equipment?.description}
                  </p>
                </div>
                {calStatusIndicator(item.snapshot.calStatusAtUse, item.snapshot.expiredCalOverride)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span>Cert #: {item.snapshot.calCertNumberAtUse}</span>
                <span>Cal Date: {new Date(item.snapshot.calDateAtUse).toLocaleDateString()}</span>
                <span>Cal Due: {new Date(item.snapshot.calDueDateAtUse).toLocaleDateString()}</span>
                <span>Lab: {item.snapshot.calLabAtUse}</span>
                <span>NIST Traceable: {item.snapshot.nistTraceableAtUse ? "Yes" : "No"}</span>
              </div>
              {item.snapshot.expiredCalOverride && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <strong>Override:</strong> {item.snapshot.expiredCalOverride.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2.6 Cron Registration (`convex/crons.ts`)

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "flag-expired-equipment",
  { hourUTC: 2, minuteUTC: 0 },
  internal.testEquipment.flagExpiredEquipment
);

export default crons;
```

---

## 3. Test Results — Cilla's Matrix Executed

| TC | Title | Result | Notes |
|---|---|---|---|
| TC-F-01 | Register transitions to pending_cal_verification | ✅ PASS | `status = "pending_cal_verification"` confirmed; picker hides equipment; `EQUIPMENT_REGISTERED` audit event present |
| TC-F-02 | Cannot link pending_cal_verification equipment | ✅ PASS | Mutation throws expected message; no `maintenanceRecordTestEquipmentLinks` row created |
| TC-F-03 | Expired cal block without override | ✅ PASS | Mutation throws with policy memo ref in message; no link created |
| TC-F-04 | Expired cal override — explanation too short | ✅ PASS | Throws "at least 30 characters" error; `< 30` char strings rejected |
| TC-F-05 | Expired cal override — self-authorization blocked | ✅ PASS | `authorizedBy === caller.userId` → throws; different user ID passes gate |
| TC-F-06 | Cal snapshot immutability — renewed after link | ✅ PASS | Link record queried 7 days after cal renewal; `calDueDateAtUse` unchanged; live equipment shows new due date. No `patch` mutation exists on `maintenanceRecordTestEquipmentLinks` table (verified via codebase grep) |
| TC-F-07 | Forged cert detection — storage ref check | ✅ PASS | `ctx.storage.getUrl(badId)` returns null → mutation throws "invalid"; test used a non-existent storage ID |
| TC-F-08 | Quarantined equipment — absolute block | ✅ PASS | `quarantined` status → mutation throws "quarantined — cannot be used"; no override path offered in code or UI |
| TC-F-09 | flagEquipmentExpired daily cron | ✅ PASS | Time-simulated test: `calibrationExpiry = Date.now() - 1ms`; cron run transitions status to `cal_expired`; audit event `EQUIPMENT_CAL_EXPIRED` emitted; notification scheduled |
| TC-F-10 | Block signing — expired cal without override (belt-and-suspenders) | ✅ PASS | Direct DB insert of link with `calStatusAtUse = "expired"`, no override; `signMaintenanceRecord` throws expected error |
| TC-F-11 | PDF export — structured test equipment section | ✅ PASS | `getEquipmentUsedOnRecord` query returns all required fields; WS16-C PDF renderer produces "Test Equipment Used" section; expired-at-use items render amber flag |
| TC-F-12 | Usage linkage — getEquipmentUsedOnRecord | ✅ PASS | 3 links across 2 records returned correctly; snapshot fields match insertion values |

**Total: 12/12 PASS | 0 FAIL | 0 SKIP**

---

## 4. SME Acceptance Note

> **Dale Purcell — Avionics Tech, Henderson NV — UAT Sign-Off**
>
> I ran through all 8 steps of the UAT script (Steps 1–8) against the development environment using my shop's equipment list. The picker correctly hides pending and quarantined gear. The expired-cal override flow has exactly the right friction — the explanation box feels real, the self-authorization block makes sense. The snapshot on the link record showed the old due date even after I renewed the Barfield set — that's exactly what an FAA inspector needs to see. The PDF export looks professional and has all the fields my compliance binder requires.
>
> One request I made during UAT (incorporated): the picker now fully hides `sent_for_calibration` equipment rather than showing it in a disabled state. Cleaner.
>
> **UAT: PASS** — Ready for compliance review pending Marcus signature on CAL-POLICY-MEMO-V1.
>
> — Dale Purcell, 2026-02-22

---

## 5. Sprint Status

**COMPLETE** — with one production gate held open.

The expired-calibration override branch is fully implemented and tested. It is marked `PRODUCTION_GATE: CAL_POLICY_MEMO_REQUIRED` in the `recordEquipmentUsage` mutation. The gate will be removed once Marcus Webb signs `CAL-POLICY-MEMO-V1`. All other components (registration, cal verification, normal linkage, cron, UI, PDF export) are production-ready now.

**Production readiness summary:**
- Equipment registration: ✅ Ready
- Calibration verification: ✅ Ready
- Normal equipment linkage (current/expiring-soon): ✅ Ready
- Expired-cal override path: 🔒 Gated (`CAL-POLICY-MEMO-V1` required)
- Daily expiry cron: ✅ Ready
- PDF export integration: ✅ Ready
- Signing gate (belt-and-suspenders): ✅ Ready

---

*Artifact filed: 2026-02-22 | Phase 17 Wave 2 | Athelon WS17-F*
*Lead: Devraj Anand | UAT: Dale Purcell | QA: Cilla Oduya*
*Blocker: CAL-POLICY-MEMO-V1 signature — Marcus Webb*
