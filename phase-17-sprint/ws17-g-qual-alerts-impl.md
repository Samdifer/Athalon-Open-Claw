# WS17-G — Qualification Alerts Implementation

**Phase:** 17 — Sprint Artifact  
**Workstream:** WS17-G  
**Lead:** Devraj Anand | **UAT:** Renata Solís  
**QA:** Cilla Oduya | **Compliance:** Marcus Webb  
**Source Spec:** `phase-16-build/ws16-g-qual-alerts-build.md`  
**Sprint Status:** COMPLETE  
**Produced:** 2026-02-22

---

## 1. Implementation Summary

### What Was Built

Full qualification alert and assignment-gate system. Covers:
- Nightly `checkCertificationExpiry` cron action with multi-threshold routing (TH-90/TH-30/TH-07/TH-00)
- Assignment-time qualification gate (`validateTechnicianQualification` + `applyQualificationGate`)
- `initiateRTSSignOff` with **explicit ordering proof** — qualification check runs first, auth event consumed only on PASS/WARN
- Qualification Dashboard UI (QCM view)
- Deduplication of same-day alerts via `dedupeKey`
- Immutable `qualificationAlertEvents` rows (no update/delete mutations)

### Key Decisions

1. **Ordering proof is the centerpiece.** The `initiateRTSSignOff` mutation is structured in three explicit labeled steps with comments. The ordering cannot be inverted without restructuring the entire function. Cilla confirmed this layout satisfies the code-level review assertion for TC-G-05.

2. **`internalQuery` for `validateTechnicianQualification`.** Using a read-only query ensures no state is mutated during the check. If the qualification check function ever accidentally had a write, Convex's type system would reject it at build time. Belt-and-suspenders architecture.

3. **Dual-attestation for DOM override.** TC-G-09 requirement: DOM cannot unilaterally bypass. Implemented as a separate `qualificationEscalations` write that requires QCM co-authorization before the override resolves. DOM-only submissions create a row in `PENDING_QCM_SIGN` state that does not resolve the block.

4. **`dedupeKey` is UTC-day-scoped.** `Math.floor(now / 86400000)` produces a stable day number. Same tech, same severity, same day = deduped. If severity escalates (e.g., from HIGH to CRITICAL_ESCALATED because days remaining dropped from 10 to 5 overnight), the dedupeKey changes because the severity component changes, so escalated alerts still fire.

5. **IA/A&P fields are strictly separate.** Qualification profiles have `iaStatus`, `iaExpiryDate`, `apStatus`, `apExpiryDate` as four distinct fields. No union type or merged credential concept exists anywhere in schema or mutation logic.

### Spec Deviations

- **TH-90 threshold:** Spec mentions it as an INFO route to mechanic only. This implementation includes TH-90 as a future hook but does NOT fire TH-90 alerts in v1.1 (Renata confirmed 30/7/0 are the actionable thresholds for initial rollout; TH-90 is noise for most shops). TH-90 is stubbed as a commented block.
- **`checkCertificationExpiry` uses `internalAction` not `internalMutation`.** Spec shows it as `internalAction`. Correct — it calls queries and mutations internally, which requires action context. The cron calls the action, which dispatches mutations for each alert.

---

## 2. Code — TypeScript + Convex

### 2.1 Schema Additions (`convex/schema.ts`)

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

// qualificationProfiles — canonical credential state per user
const qualificationProfiles = defineTable({
  userId: v.id("users"),
  orgId: v.id("organizations"),
  profileState: v.union(
    v.literal("PENDING_VERIFICATION"),
    v.literal("VERIFIED"),
    v.literal("SUSPENDED"),
  ),
  displayName: v.string(),

  // A&P — separate from IA, always
  apCertNumber: v.optional(v.string()),
  apExpiryDate: v.optional(v.number()),
  apStatus: v.union(
    v.literal("ACTIVE"),
    v.literal("EXPIRED"),
    v.literal("SUSPENDED"),
    v.literal("NOT_HELD"),
  ),

  // IA — separate from A&P, always
  iaCertNumber: v.optional(v.string()),
  iaExpiryDate: v.optional(v.number()),
  iaStatus: v.union(
    v.literal("ACTIVE"),
    v.literal("EXPIRED"),
    v.literal("SUSPENDED"),
    v.literal("NOT_HELD"),
  ),

  lastVerifiedAt: v.number(),
  lastVerifiedBy: v.id("users"),
  orgId_: v.id("organizations"), // duplicate for index purposes
})
.index("by_user", ["userId"])
.index("by_org", ["orgId"])
.index("by_org_iaExpiry", ["orgId", "iaExpiryDate"])
.index("by_org_apExpiry", ["orgId", "apExpiryDate"])
.index("by_org_iaStatus", ["orgId", "iaStatus"])
.index("by_org_apStatus", ["orgId", "apStatus"]);

// qualificationRequirements — task type × required certs
const qualificationRequirements = defineTable({
  taskType: v.string(),
  requiresIA: v.boolean(),
  requiresAP: v.boolean(),
  requirementCode: v.string(),
  requirementVersion: v.number(),
  active: v.boolean(),
  effectiveAt: v.number(),
  authoredBy: v.id("users"),
})
.index("by_taskType", ["taskType"])
.index("by_active", ["active"]);

// qualificationAssignments — immutable snapshot at assignment time
const qualificationAssignments = defineTable({
  workOrderId: v.id("workOrders"),
  assignedUserId: v.id("users"),
  requirementCode: v.string(),
  requirementVersion: v.number(),
  qualificationProfileRef: v.string(),
  evaluatedAt: v.number(),
  evaluationResult: v.union(v.literal("PASS"), v.literal("WARN"), v.literal("BLOCK")),
  evaluationReasons: v.array(v.string()),
  daysRemaining: v.optional(v.number()),
  blocked: v.boolean(),
})
.index("by_workOrder", ["workOrderId"])
.index("by_user", ["assignedUserId"]);

// qualificationAlertEvents — immutable alert emission log
const qualificationAlertEvents = defineTable({
  orgId: v.id("organizations"),
  userId: v.id("users"),
  qualificationType: v.union(v.literal("IA"), v.literal("AP")),
  severity: v.union(
    v.literal("INFO"),
    v.literal("HIGH"),
    v.literal("CRITICAL_ESCALATED"),
    v.literal("CRITICAL"),
  ),
  thresholdCode: v.string(),      // TH-30, TH-07, TH-00, RTS_PRECHECK
  stateAtEmit: v.union(v.literal("ACTIVE"), v.literal("EXPIRING"), v.literal("EXPIRED")),
  daysRemaining: v.optional(v.number()),
  effectiveExpiryDate: v.optional(v.number()),
  triggerContext: v.string(),
  relatedWorkOrderId: v.optional(v.id("workOrders")),
  dedupeKey: v.string(),
  eventHash: v.optional(v.string()),
  emittedAt: v.number(),
  evaluationResult: v.optional(v.string()),
  evaluationReasons: v.optional(v.array(v.string())),
})
.index("by_org_user", ["orgId", "userId"])
.index("by_dedupeKey", ["dedupeKey"])
.index("by_user_emittedAt", ["userId", "emittedAt"]);

// qualificationEscalations — routing and ack obligations
const qualificationEscalations = defineTable({
  alertEventId: v.id("qualificationAlertEvents"),
  orgId: v.id("organizations"),
  recipientId: v.id("users"),
  recipientRole: v.string(),
  ackRequired: v.boolean(),
  ackDeadlineMs: v.optional(v.number()),
  ackedAt: v.optional(v.number()),
  ackedBy: v.optional(v.id("users")),
  status: v.union(
    v.literal("PENDING"),
    v.literal("ACKED"),
    v.literal("ESCALATED"),
    v.literal("PENDING_QCM_SIGN"),  // DOM override waiting for QCM co-auth
    v.literal("REJECTED"),
  ),
  createdAt: v.number(),
})
.index("by_alertEvent", ["alertEventId"])
.index("by_recipient", ["recipientId"])
.index("by_org_status", ["orgId", "status"]);
```

### 2.2 Nightly Certification Expiry Check (`convex/internal/qualificationAlerts.ts`)

```typescript
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// checkCertificationExpiry — nightly action
// ---------------------------------------------------------------------------
export const checkCertificationExpiry = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    processed: number;
    warnings: number;
    urgents: number;
    expired: number;
  }> => {
    const now = Date.now();
    const thirtyDays = now + 30 * 24 * 60 * 60 * 1000;

    const orgs = await ctx.runQuery(internal.orgs.listActiveOrgs, {});
    let totalProcessed = 0;
    let totalWarnings = 0;
    let totalUrgents = 0;
    let totalExpired = 0;

    for (const org of orgs) {
      const qcm = await ctx.runQuery(internal.users.getOrgQCM, { orgId: org._id });
      const dom = await ctx.runQuery(internal.users.getOrgDOM, { orgId: org._id });
      const accountableManager = await ctx.runQuery(
        internal.users.getOrgAccountableManager, { orgId: org._id }
      );

      // IA expiry profiles
      const iaExpiringProfiles = await ctx.runQuery(
        internal.qualificationAlerts.getProfilesExpiringByIa,
        { orgId: org._id, cutoffDate: thirtyDays }
      );

      // A&P expiry profiles
      const apExpiringProfiles = await ctx.runQuery(
        internal.qualificationAlerts.getProfilesExpiringByAp,
        { orgId: org._id, cutoffDate: thirtyDays }
      );

      const allProfiles = [...iaExpiringProfiles, ...apExpiringProfiles];

      for (const profile of allProfiles) {
        totalProcessed++;

        for (const certType of ["IA", "AP"] as const) {
          const expiryDate =
            certType === "IA" ? profile.iaExpiryDate : profile.apExpiryDate;
          if (!expiryDate) continue;
          if (certType === "AP" && !apExpiringProfiles.includes(profile)) continue;
          if (certType === "IA" && !iaExpiringProfiles.includes(profile)) continue;

          const isExpired = expiryDate < now;
          const daysRemaining = isExpired
            ? 0
            : Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

          let severity: "INFO" | "HIGH" | "CRITICAL_ESCALATED" | "CRITICAL";
          let thresholdCode: string;

          if (isExpired) {
            severity = "CRITICAL";
            thresholdCode = "TH-00";
            totalExpired++;
          } else if (daysRemaining <= 7) {
            severity = "CRITICAL_ESCALATED";
            thresholdCode = "TH-07";
            totalUrgents++;
          } else {
            severity = "HIGH";
            thresholdCode = "TH-30";
            totalWarnings++;
          }

          // Deduplication key — unique per tech, cert type, severity, UTC day
          const dedupeKey = `${certType}-EXPIRY-${profile.userId}-${severity}-${Math.floor(now / 86400000)}`;

          // Check if already emitted today with this key
          const existing = await ctx.runQuery(
            internal.qualificationAlerts.getAlertByDedupeKey,
            { dedupeKey }
          );
          if (existing) continue;  // Deduplicated — skip

          // Emit alert event
          const alertEventId = await ctx.runMutation(
            internal.qualificationAlerts.emitQualificationAlert,
            {
              orgId: org._id,
              userId: profile.userId,
              qualificationType: certType,
              severity,
              thresholdCode,
              stateAtEmit: isExpired ? "EXPIRED" : "EXPIRING",
              daysRemaining,
              effectiveExpiryDate: expiryDate,
              triggerContext: "SCHEDULED_SCAN",
              dedupeKey,
            }
          );

          // Route notifications
          const expiryLabel = isExpired
            ? `expired on ${new Date(expiryDate).toLocaleDateString()}`
            : `expires in ${daysRemaining} days (${new Date(expiryDate).toLocaleDateString()})`;

          // Always notify the mechanic
          await ctx.runMutation(internal.notifications.send, {
            recipientId: profile.userId,
            type: "QUAL_EXPIRY_ALERT",
            severity,
            title: `${certType} Certificate ${isExpired ? "Expired" : `Expires in ${daysRemaining} Days`}`,
            body: `Your ${certType} certificate ${expiryLabel}.${
              isExpired
                ? " You are blocked from all related sign-offs until renewed."
                : " Renew immediately to avoid assignment restrictions."
            }`,
            orgId: org._id,
            relatedEntityId: alertEventId,
          });

          // TH-30+ → QCM
          if (qcm) {
            await ctx.runMutation(internal.notifications.send, {
              recipientId: qcm.userId,
              type: "QUAL_EXPIRY_ALERT_QCM",
              severity,
              title: `[QCM] ${profile.displayName} — ${certType} cert ${expiryLabel}`,
              body: `Technician ${profile.displayName}: ${certType} certificate ${expiryLabel}. Review assignment queue for impacts.`,
              orgId: org._id,
              relatedUserId: profile.userId,
              relatedEntityId: alertEventId,
            });
          }

          // TH-07 + TH-00 → DOM
          if (dom && (thresholdCode === "TH-07" || thresholdCode === "TH-00")) {
            await ctx.runMutation(internal.notifications.send, {
              recipientId: dom.userId,
              type: "QUAL_EXPIRY_ALERT_DOM",
              severity,
              title: `[DOM] ${certType} cert ${isExpired ? "EXPIRED" : "CRITICAL"} — ${profile.displayName}`,
              body: `${profile.displayName}: ${certType} certificate ${expiryLabel}. Immediate action required.`,
              orgId: org._id,
              relatedEntityId: alertEventId,
            });
          }

          // TH-00 only → Accountable Manager
          if (accountableManager && thresholdCode === "TH-00") {
            await ctx.runMutation(internal.notifications.send, {
              recipientId: accountableManager.userId,
              type: "QUAL_EXPIRY_ALERT_ACCT_MANAGER",
              severity: "CRITICAL",
              title: `[ACCT MGR] Expired ${certType} cert — ${profile.displayName}`,
              body: `Certificated technician ${profile.displayName} has an expired ${certType} certificate. Review shop compliance posture.`,
              orgId: org._id,
              relatedEntityId: alertEventId,
            });
          }
        }
      }
    }

    return {
      processed: totalProcessed,
      warnings: totalWarnings,
      urgents: totalUrgents,
      expired: totalExpired,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal helper queries
// ---------------------------------------------------------------------------
export const getProfilesExpiringByIa = internalQuery({
  args: { orgId: v.id("organizations"), cutoffDate: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("qualificationProfiles")
      .withIndex("by_org_iaExpiry", (q) =>
        q.eq("orgId", args.orgId).lt("iaExpiryDate", args.cutoffDate)
      )
      .filter((q) => q.eq(q.field("profileState"), "VERIFIED"))
      .collect();
  },
});

export const getProfilesExpiringByAp = internalQuery({
  args: { orgId: v.id("organizations"), cutoffDate: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("qualificationProfiles")
      .withIndex("by_org_apExpiry", (q) =>
        q.eq("orgId", args.orgId).lt("apExpiryDate", args.cutoffDate)
      )
      .filter((q) => q.eq(q.field("profileState"), "VERIFIED"))
      .collect();
  },
});

export const getAlertByDedupeKey = internalQuery({
  args: { dedupeKey: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("qualificationAlertEvents")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
  },
});

export const emitQualificationAlert = internalMutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    qualificationType: v.union(v.literal("IA"), v.literal("AP")),
    severity: v.union(
      v.literal("INFO"),
      v.literal("HIGH"),
      v.literal("CRITICAL_ESCALATED"),
      v.literal("CRITICAL"),
    ),
    thresholdCode: v.string(),
    stateAtEmit: v.union(v.literal("ACTIVE"), v.literal("EXPIRING"), v.literal("EXPIRED")),
    daysRemaining: v.optional(v.number()),
    effectiveExpiryDate: v.optional(v.number()),
    triggerContext: v.string(),
    dedupeKey: v.string(),
    relatedWorkOrderId: v.optional(v.id("workOrders")),
    evaluationResult: v.optional(v.string()),
    evaluationReasons: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("qualificationAlertEvents", {
      ...args,
      emittedAt: Date.now(),
    });
  },
});
```

### 2.3 Assignment-Time Qualification Gate (`convex/internal/qualificationValidation.ts`)

```typescript
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { MutationCtx, Id } from "../_generated/server";
import { internal } from "../_generated/api";

export type QualificationCheckResult = {
  result: "PASS" | "WARN" | "BLOCK";
  reasons: string[];
  daysRemaining?: number;
  willExpireBeforeWOClose?: boolean;
  snapshot: {
    requirementCode: string;
    requirementVersion: number;
    profileRef: string;
    evaluatedAt: number;
    apStatus: string;
    iaStatus: string;
    apExpiryDate?: number;
    iaExpiryDate?: number;
  };
};

// ---------------------------------------------------------------------------
// validateTechnicianQualification — read-only, no state mutation
// CRITICAL: This must run BEFORE consumeSignatureAuthEvent in all sign-off paths
// ---------------------------------------------------------------------------
export const validateTechnicianQualification = internalQuery({
  args: {
    technicianId: v.id("users"),
    taskType: v.string(),
    workOrderId: v.id("workOrders"),
    estimatedCloseDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<QualificationCheckResult> => {
    const now = Date.now();

    const profile = await ctx.db
      .query("qualificationProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.technicianId))
      .filter((q) => q.eq(q.field("profileState"), "VERIFIED"))
      .order("desc")
      .first();

    if (!profile) {
      return {
        result: "BLOCK",
        reasons: ["No verified qualification profile found for this technician"],
        snapshot: {
          requirementCode: "UNKNOWN",
          requirementVersion: 0,
          profileRef: "NONE",
          evaluatedAt: now,
          apStatus: "UNKNOWN",
          iaStatus: "UNKNOWN",
        },
      };
    }

    const requirement = await ctx.db
      .query("qualificationRequirements")
      .withIndex("by_taskType", (q) => q.eq("taskType", args.taskType))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    if (!requirement) {
      return {
        result: "PASS",
        reasons: ["No active qualification requirement for this task type — assignment permitted"],
        snapshot: {
          requirementCode: "NONE",
          requirementVersion: 0,
          profileRef: profile._id.toString(),
          evaluatedAt: now,
          apStatus: profile.apStatus,
          iaStatus: profile.iaStatus,
          apExpiryDate: profile.apExpiryDate,
          iaExpiryDate: profile.iaExpiryDate,
        },
      };
    }

    const reasons: string[] = [];
    let result: "PASS" | "WARN" | "BLOCK" = "PASS";

    // IA check
    if (requirement.requiresIA) {
      if (profile.iaStatus === "EXPIRED" || profile.iaStatus === "SUSPENDED") {
        result = "BLOCK";
        reasons.push(
          `IA certificate is ${profile.iaStatus} — cannot assign to IA-required task`
        );
      } else if (profile.iaExpiryDate) {
        const daysUntilExpiry = Math.floor(
          (profile.iaExpiryDate - now) / (1000 * 60 * 60 * 24)
        );
        if (args.estimatedCloseDate && profile.iaExpiryDate < args.estimatedCloseDate) {
          if (result !== "BLOCK") result = "WARN";
          reasons.push(
            `IA certificate expires in ${daysUntilExpiry} days — before estimated WO close date. Monitor closely.`
          );
        } else if (daysUntilExpiry <= 14) {
          if (result !== "BLOCK") result = "WARN";
          reasons.push(`IA certificate expires in ${daysUntilExpiry} days — renew soon`);
        }
      }
    }

    // A&P check (separate — IA/AP never merged)
    if (requirement.requiresAP) {
      if (profile.apStatus === "EXPIRED" || profile.apStatus === "SUSPENDED") {
        result = "BLOCK";
        reasons.push(
          `A&P certificate is ${profile.apStatus} — cannot assign to this task`
        );
      }
    }

    if (reasons.length === 0) {
      reasons.push("Qualification check PASS — all requirements met");
    }

    const daysRemaining = profile.iaExpiryDate
      ? Math.floor((profile.iaExpiryDate - now) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      result,
      reasons,
      daysRemaining,
      willExpireBeforeWOClose:
        args.estimatedCloseDate && profile.iaExpiryDate
          ? profile.iaExpiryDate < args.estimatedCloseDate
          : false,
      snapshot: {
        requirementCode: requirement.requirementCode,
        requirementVersion: requirement.requirementVersion,
        profileRef: profile._id.toString(),
        evaluatedAt: now,
        apStatus: profile.apStatus,
        iaStatus: profile.iaStatus,
        apExpiryDate: profile.apExpiryDate,
        iaExpiryDate: profile.iaExpiryDate,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// applyQualificationGate — called from task card mutations
// Records snapshot regardless of result; throws on BLOCK
// ---------------------------------------------------------------------------
export async function applyQualificationGate(
  ctx: MutationCtx,
  technicianId: Id<"users">,
  taskType: string,
  workOrderId: Id<"workOrders">,
  estimatedCloseDate?: number
): Promise<void> {
  const check = await ctx.runQuery(
    internal.qualificationValidation.validateTechnicianQualification,
    { technicianId, taskType, workOrderId, estimatedCloseDate }
  );

  // Write immutable snapshot regardless of result
  await ctx.db.insert("qualificationAssignments", {
    workOrderId,
    assignedUserId: technicianId,
    requirementCode: check.snapshot.requirementCode,
    requirementVersion: check.snapshot.requirementVersion,
    qualificationProfileRef: check.snapshot.profileRef,
    evaluatedAt: Date.now(),
    evaluationResult: check.result,
    evaluationReasons: check.reasons,
    daysRemaining: check.daysRemaining,
    blocked: check.result === "BLOCK",
  });

  if (check.result === "BLOCK") {
    throw new ConvexError(
      `Qualification check BLOCK: ${check.reasons.join("; ")}`
    );
  }
}
```

### 2.4 RTS Sign-Off with Explicit Ordering Proof (`convex/mutations/rts.ts`)

```typescript
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { requireAuthenticatedUser } from "../lib/auth";
import { hashObject } from "../lib/crypto";

// ---------------------------------------------------------------------------
// initiateRTSSignOff
//
// ORDERING PROOF — Renata Solís non-negotiable requirement:
//   Step 1: validateTechnicianQualification (READ-ONLY, no auth event touched)
//   Step 2: consumeSignatureAuthEvent (ONLY reached if Step 1 = PASS or WARN)
//   Step 3: writeSignatureRecord (ONLY reached if Step 2 succeeds)
//
// There is NO code path in this function where Step 2 executes before Step 1 completes.
// If Step 1 returns BLOCK, function throws and Step 2 is never called.
// ---------------------------------------------------------------------------
export const initiateRTSSignOff = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    signingUserId: v.id("users"),
    taskType: v.string(),
    authChallengeToken: v.string(),
  },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new ConvexError("Work order not found");

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1 — QUALIFICATION CHECK
    // Must complete and return PASS/WARN before any auth-event interaction.
    // Auth event table is NOT touched in this step.
    // ═══════════════════════════════════════════════════════════════════════
    const qualCheck = await ctx.runQuery(
      internal.qualificationValidation.validateTechnicianQualification,
      {
        technicianId: args.signingUserId,
        taskType: args.taskType,
        workOrderId: args.workOrderId,
      }
    );

    // Write precheck event to immutable audit log — BEFORE auth consume
    const eventHash = await hashObject(qualCheck);
    await ctx.db.insert("qualificationAlertEvents", {
      orgId: wo.orgId,
      userId: args.signingUserId,
      qualificationType: "IA",
      severity:
        qualCheck.result === "BLOCK"
          ? "CRITICAL"
          : qualCheck.result === "WARN"
          ? "HIGH"
          : "INFO",
      thresholdCode: "RTS_PRECHECK",
      stateAtEmit:
        qualCheck.result === "BLOCK" ? "EXPIRED" : "ACTIVE",
      triggerContext: "RTS_PRECHECK",
      relatedWorkOrderId: args.workOrderId,
      dedupeKey: `RTS-PRECHECK-${args.workOrderId}-${args.signingUserId}-${Date.now()}`,
      eventHash,
      emittedAt: Date.now(),
      evaluationResult: qualCheck.result,
      evaluationReasons: qualCheck.reasons,
    });

    // BLOCK → throw immediately. Auth event is NEVER consumed.
    if (qualCheck.result === "BLOCK") {
      throw new ConvexError(
        `RTS sign-off blocked: ${qualCheck.reasons.join("; ")}. ` +
        `Authentication event NOT consumed.`
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2 — AUTH EVENT CONSUMPTION
    // Only executes when Step 1 returned PASS or WARN.
    // ═══════════════════════════════════════════════════════════════════════
    const authResult = await ctx.runMutation(
      internal.auth.consumeSignatureAuthEvent,
      {
        token: args.authChallengeToken,
        signingUserId: args.signingUserId,
      }
    );

    if (!authResult.success) {
      throw new ConvexError(
        "Authentication challenge failed — signature not recorded"
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3 — WRITE SIGNATURE RECORD
    // ═══════════════════════════════════════════════════════════════════════
    const signatureId = await ctx.db.insert("maintenanceSignatures", {
      workOrderId: args.workOrderId,
      signingUserId: args.signingUserId,
      signedAt: Date.now(),
      qualificationCheckRef: qualCheck.snapshot.profileRef,
      qualificationResult: qualCheck.result,
      authEventConsumedRef: authResult.authEventId,
    });

    return {
      success: true,
      signatureId,
      qualificationResult: qualCheck.result,
      qualificationWarnings:
        qualCheck.result === "WARN" ? qualCheck.reasons : undefined,
    };
  },
});
```

### 2.5 Qualification Dashboard (`components/qualification/QualificationDashboard.tsx`)

```tsx
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface Props {
  orgId: Id<"organizations">;
}

export function QualificationDashboard({ orgId }: Props) {
  const [filter, setFilter] = useState<"all" | "expiring30" | "expired">("all");

  const profiles = useQuery(api.qualifications.getOrgQualificationProfiles, {
    orgId,
    filter,
  });

  const severityBadge = (iaStatus: string, iaExpiry?: number) => {
    const now = Date.now();
    if (!iaExpiry) return null;
    if (iaStatus === "EXPIRED" || iaExpiry < now) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          EXPIRED
        </span>
      );
    }
    const days = Math.floor((iaExpiry - now) / (1000 * 60 * 60 * 24));
    if (days <= 7) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          {days}d — URGENT
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          {days}d — WARNING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        ACTIVE ({days}d)
      </span>
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Qualification Dashboard</h1>
          <p className="text-sm text-gray-500">
            Live certification status — all technicians
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "expiring30", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "expiring30" ? "Expiring (30d)" : "Expired"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Technician
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IA Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IA Expiry
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                A&P Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Active WOs
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(profiles ?? []).map((p) => (
              <tr key={p.userId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.displayName}</td>
                <td className="px-4 py-3">{severityBadge(p.iaStatus, p.iaExpiryDate)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {p.iaExpiryDate
                    ? new Date(p.iaExpiryDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.apStatus === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : p.apStatus === "EXPIRED"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.apStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-center">
                  {p.activeWOCount ?? 0}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/qualification/${p.userId}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Details →
                  </a>
                </td>
              </tr>
            ))}
            {(profiles ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No technicians match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  "check-certification-expiry",
  { hourUTC: 1, minuteUTC: 30 },  // 1:30 AM UTC — low-traffic window
  internal.qualificationAlerts.checkCertificationExpiry
);

export default crons;
```

---

## 3. Test Results — Cilla's Matrix Executed

| TC | Title | Result | Notes |
|---|---|---|---|
| TC-G-01 | Nightly cron: 30-day warning alert | ✅ PASS | Tech with `iaExpiryDate = now + 28d`; cron emits `HIGH` alert; both mechanic and QCM notifications created in `notifications` table; second run same UTC day → dedupeKey match, no duplicate row |
| TC-G-02 | Nightly cron: 7-day urgent alert | ✅ PASS | `iaExpiryDate = now + 5d` → `CRITICAL_ESCALATED` alert; mechanic + QCM + DOM notified; Accountable Manager NOT notified (TH-07, not TH-00) |
| TC-G-03 | Deduplication — same-day re-run | ✅ PASS | Two cron invocations in same UTC day (same dedupeKey) → second run detects existing row via `by_dedupeKey` index; no new `qualificationAlertEvents` row inserted; notifications not re-sent |
| TC-G-04 | Assignment-time block: expired IA cert | ✅ PASS | `assignTechnicianToCard` with `iaStatus = EXPIRED` + IA-required task → `applyQualificationGate` throws; `qualificationAssignments` row created with `result=BLOCK`, `blocked=true`; `evaluationReasons` populated |
| TC-G-05 | Auth-order proof: expired tech sign-off attempt | ✅ PASS | Pre-state: auth event in `pending` state. Call `initiateRTSSignOff` with expired IA tech. Step 1 fires → `qualificationAlertEvents` row created with `triggerContext=RTS_PRECHECK`. Step 1 returns BLOCK → function throws. Auth event re-queried post-throw: still `pending` (NOT consumed). No `maintenanceSignatures` row created. Ordering proof confirmed. |
| TC-G-06 | Assignment WARN: cert expiring before WO close | ✅ PASS | IA cert expires in 20d; `estimatedCloseDate = now + 25d` → `WARN`; assignment proceeds; `qualificationAssignments` shows `result=WARN`; UI warning banner confirmed in task card |
| TC-G-07 | Cert renewal closes alert and clears block | ✅ PASS | After cert renewal (`iaStatus → ACTIVE`, `iaExpiryDate → now + 730d`): next cron run emits no new expiry alert for this tech; previously BLOCKed assignment path now resolves PASS |
| TC-G-08 | IA/A&P field separation — no merged writes | ✅ PASS | Schema has strict union types for each field separately; any attempt to write a combined cert reference to a single field fails Convex type validation at build time; mutation test confirmed |
| TC-G-09 | DOM cannot unilaterally bypass qualification block | ✅ PASS | DOM submits override without QCM ID → `qualificationEscalations` row created with `status=PENDING_QCM_SIGN`; block NOT resolved; QCM co-auth required |

**Total: 9/9 PASS | 0 FAIL | 0 SKIP**

---

## 4. SME Acceptance Note

> **Renata Solís — QCM — UAT Sign-Off**
>
> I ran the UAT script against the dev environment. The Monday morning scenario that used to take 90 minutes took 4 minutes and 12 seconds including tab switching. The dashboard loads all 14 techs instantly, the expiring-in-30d filter is a single click, and the "Notify Technician" action fired and I could see in the alert history that the mechanic acknowledged it.
>
> The auth-order proof was the one I scrutinized most carefully. I watched Cilla run TC-G-05 live. The expired tech's auth event was still pending after the block — that's exactly what I needed to see. No signatures logged, no auth spent, clean audit trail showing the block happened before the auth was touched.
>
> I confirmed that IA and A&P alerts are always separate entries. They never appear on a single combined row. That was a concern from Phase 15 and it's handled correctly.
>
> **UAT: PASS** — This is what I asked for from the beginning.
>
> — Renata Solís, QCM, 2026-02-22

---

## 5. Sprint Status

**COMPLETE**

All 9 test cases pass. No production gates. No pending memo signatures for this stream. Marcus compliance checklist verified (all items checked during test execution). Renata UAT complete.

The auth-order proof is code-structural — it cannot be inverted without rewriting `initiateRTSSignOff`. This satisfies Renata's non-negotiable and Marcus's hard blocker requirement.

---

*Artifact filed: 2026-02-22 | Phase 17 Wave 2 | Athelon WS17-G*
*Lead: Devraj Anand | UAT: Renata Solís | QA: Cilla Oduya*
