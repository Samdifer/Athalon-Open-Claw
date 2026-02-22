# WS16-G — Qualification Alerts Build (FULL DEPTH)

**Phase:** 16
**Workstream:** WS16-G
**Owners:** Devraj Anand (Backend/Convex) + Renata Solís (UAT/QCM) + Marcus Webb (compliance)
**QA:** Cilla Oduya
**Depends on:** `phase-15-rd/ws15-j-qual-alerts.md` · WS16-B auth build
**Status: READY FOR BUILD**

---

## 1. Context and Carry-Forward Controls

This build closes the qualification-alert gap identified in Phase 15. Renata Solís (QCM) currently spends 90 minutes every Monday morning manually checking expiry spreadsheets against the active technician roster and task assignments. This build makes that process real-time, automated, and enforcement-grade.

The central compliance requirement is this: **a technician's qualification must be validated BEFORE any auth-event is consumed** during the sign-off path. This ordering is Renata's non-negotiable. If the auth event is consumed first and the qualification check runs second, an expired tech could have a valid signature on a maintenance record that the system later flags — meaning the bad signature is already in the audit chain. The ordering proof (Section 5) is the Phase 15 hard blocker.

**Phase 15 carry-forward controls (non-negotiable):**
1. Qualification precheck-before-auth consume — qualification check runs FIRST; auth event consumed only on PASS.
2. Fail-closed on expired qualifications — expired IA cannot be waived for IA-required RTS sign-off, period.
3. No pending-signature ambiguity bypass — unresolved qualification state blocks sign paths.
4. Hash-manifested audit evidence for alert lifecycle and ordering traces.

---

## 2. Data Model (from WS15-J — summarized for builder reference)

See `phase-15-rd/ws15-j-qual-alerts.md` Section 2 for full schema. Key tables used by this build:

- **`qualificationProfiles`** — canonical credential state per user; `apExpiryDate`, `iaExpiryDate`, `apStatus`, `iaStatus`
- **`qualificationRequirements`** — task type × action type × required qualification
- **`qualificationAssignments`** — immutable snapshot at assignment time (PASS/WARN/BLOCK result)
- **`qualificationAlertEvents`** — immutable alert emission log with dedupe key
- **`qualificationEscalations`** — routing and ack obligation per alert
- **`notifications`** — Athelon shared notification table; alerts write here for in-app delivery

**Critical index for `checkCertificationExpiry`:**
```typescript
// qualificationProfiles table must have:
.index("by_org_iaExpiry", ["orgId", "iaExpiryDate"])
.index("by_org_apExpiry", ["orgId", "apExpiryDate"])
.index("by_org_iaStatus", ["orgId", "iaStatus"])
.index("by_org_apStatus", ["orgId", "apStatus"])
```

---

## 3. Scheduled Function: `checkCertificationExpiry`

**Purpose:** Runs nightly. Queries all users with certificates, identifies those expiring within 30 days (warning) and 7 days (urgent), writes to `notifications` table, routes to QCM + individual mechanic.

**File:** `convex/crons.ts` + `convex/internal/qualificationAlerts.ts`

```typescript
// convex/internal/qualificationAlerts.ts

export const checkCertificationExpiry = internalAction({
  handler: async (ctx): Promise<{ processed: number; warnings: number; urgents: number; expired: number }> => {
    const now = Date.now();
    const thirtyDays = now + (30 * 24 * 60 * 60 * 1000);
    const sevenDays  = now + (7  * 24 * 60 * 60 * 1000);

    // Gather all orgs
    const orgs = await ctx.runQuery(internal.orgs.listActiveOrgs, {});
    let totalWarnings = 0, totalUrgents = 0, totalExpired = 0, totalProcessed = 0;

    for (const org of orgs) {
      // 1. Query profiles with IA cert expiring within 30 days
      const iaExpiringProfiles = await ctx.runQuery(
        internal.qualificationAlerts.getProfilesExpiringByIa,
        { orgId: org._id, cutoffDate: thirtyDays }
      );

      // 2. Query profiles with A&P cert expiring within 30 days
      const apExpiringProfiles = await ctx.runQuery(
        internal.qualificationAlerts.getProfilesExpiringByAp,
        { orgId: org._id, cutoffDate: thirtyDays }
      );

      // Find QCM for this org (escalation target)
      const qcm = await ctx.runQuery(internal.users.getOrgQCM, { orgId: org._id });

      for (const profile of [...iaExpiringProfiles, ...apExpiringProfiles]) {
        totalProcessed++;
        const iaCert = profile.iaExpiryDate;
        const apCert = profile.apExpiryDate;

        // Determine severity for IA
        if (iaCert) {
          const daysRemaining = Math.floor((iaCert - now) / (1000 * 60 * 60 * 24));
          const severity = iaCert < now ? "CRITICAL" : daysRemaining <= 7 ? "CRITICAL_ESCALATED" : "HIGH";
          const channel = iaCert < now ? "expired" : daysRemaining <= 7 ? "urgent" : "warning";

          if (iaCert < now) totalExpired++;
          else if (daysRemaining <= 7) totalUrgents++;
          else totalWarnings++;

          // Dedupe key prevents duplicate same-severity alerts within 24h
          const dedupeKey = `IA-EXPIRY-${profile.userId}-${Math.floor(now / 86400000)}`;

          await ctx.runMutation(internal.qualificationAlerts.emitQualificationAlert, {
            orgId: org._id,
            userId: profile.userId,
            qualificationType: "IA",
            severity,
            thresholdCode: channel === "expired" ? "TH-00" : channel === "urgent" ? "TH-07" : "TH-30",
            stateAtEmit: iaCert < now ? "EXPIRED" : "EXPIRING",
            daysRemaining: iaCert < now ? 0 : daysRemaining,
            effectiveExpiryDate: iaCert,
            triggerContext: "SCHEDULED_SCAN",
            dedupeKey,
          });

          // Route to individual mechanic
          await ctx.runMutation(internal.notifications.send, {
            recipientId: profile.userId,
            type: "QUAL_EXPIRY_ALERT",
            severity,
            title: `IA Certificate ${iaCert < now ? "Expired" : `Expires in ${daysRemaining} days`}`,
            body: `Your IA certificate ${iaCert < now ? "expired on" : "expires on"} ${new Date(iaCert).toLocaleDateString()}.${iaCert < now ? " You are blocked from IA-required sign-offs." : " Renew immediately to avoid assignment restrictions."}`,
            orgId: org._id,
          });

          // Route to QCM (always gets these notifications)
          if (qcm) {
            await ctx.runMutation(internal.notifications.send, {
              recipientId: qcm.userId,
              type: "QUAL_EXPIRY_ALERT_QCM",
              severity,
              title: `[QCM Alert] Technician IA cert ${iaCert < now ? "expired" : "expiring"}`,
              body: `${profile.displayName} IA certificate: ${iaCert < now ? "EXPIRED" : `expires in ${daysRemaining} days`} (${new Date(iaCert).toLocaleDateString()}).`,
              orgId: org._id,
              relatedUserId: profile.userId,
            });
          }
        }

        // Repeat equivalent block for A&P cert (apCert)
        // [Same structure as IA block above with qualificationType = "AP"]
      }
    }

    return { processed: totalProcessed, warnings: totalWarnings, urgents: totalUrgents, expired: totalExpired };
  },
});
```

**Cron registration:**
```typescript
// convex/crons.ts
crons.daily(
  "check-certification-expiry",
  { hourUTC: 1, minuteUTC: 30 },   // 1:30 AM UTC — low-traffic window
  internal.qualificationAlerts.checkCertificationExpiry
);
```

**Alert routing summary:**
| Threshold | Days Remaining | Severity | Routes To |
|---|---|---|---|
| TH-90 | 90 days | INFO | Mechanic only |
| TH-30 | 30 days | HIGH | Mechanic + QCM |
| TH-07 | 7 days | CRITICAL_ESCALATED | Mechanic + QCM + DOM |
| TH-00 | 0 (expired) | CRITICAL | Mechanic + QCM + DOM + Accountable Manager |

---

## 4. Assignment-Time Validation Hook: `validateTechnicianQualification`

**Purpose:** Called at `createTaskCard` and `assignTechnicianToCard`. Blocks assignment if cert is expired or will expire before the estimated WO close date.

**File:** `convex/internal/qualificationValidation.ts`

```typescript
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

export const validateTechnicianQualification = internalQuery({
  args: {
    technicianId: v.id("users"),
    taskType: v.string(),
    workOrderId: v.id("workOrders"),
    estimatedCloseDate: v.optional(v.number()),  // epoch ms
  },
  handler: async (ctx, args): Promise<QualificationCheckResult> => {
    const now = Date.now();

    // 1. Fetch profile for technician
    const profile = await ctx.db
      .query("qualificationProfiles")
      .withIndex("by_user", q => q.eq("userId", args.technicianId))
      .filter(q => q.eq(q.field("profileState"), "VERIFIED"))
      .order("desc")
      .first();

    if (!profile) {
      return {
        result: "BLOCK",
        reasons: ["No verified qualification profile found for this technician"],
        snapshot: buildEmptySnapshot(args.taskType),
      };
    }

    // 2. Fetch requirement for this task type
    const requirement = await ctx.db
      .query("qualificationRequirements")
      .withIndex("by_taskType", q => q.eq("taskType", args.taskType))
      .filter(q => q.eq(q.field("active"), true))
      .first();

    if (!requirement) {
      // No specific requirement = PASS with info note
      return {
        result: "PASS",
        reasons: ["No active qualification requirement for task type — assignment permitted"],
        snapshot: buildProfileSnapshot(profile, requirement, args.taskType),
      };
    }

    const reasons: string[] = [];
    let result: "PASS" | "WARN" | "BLOCK" = "PASS";

    // 3. Check IA requirement
    if (requirement.requiresIA) {
      if (profile.iaStatus === "EXPIRED" || profile.iaStatus === "SUSPENDED") {
        result = "BLOCK";
        reasons.push(`IA certificate is ${profile.iaStatus} — cannot assign to IA-required task`);
      } else if (profile.iaExpiryDate) {
        const daysUntilExpiry = Math.floor((profile.iaExpiryDate - now) / (1000 * 60 * 60 * 24));

        // Check if cert will expire before WO close
        if (args.estimatedCloseDate && profile.iaExpiryDate < args.estimatedCloseDate) {
          result = result === "BLOCK" ? "BLOCK" : "WARN";
          reasons.push(
            `IA certificate expires ${daysUntilExpiry} days from now — before estimated WO close date. Assignment permitted with warning; monitor closely.`
          );
        } else if (daysUntilExpiry <= 14) {
          result = result === "BLOCK" ? "BLOCK" : "WARN";
          reasons.push(`IA certificate expires in ${daysUntilExpiry} days — renewal required soon`);
        }
      }
    }

    // 4. Check A&P requirement
    if (requirement.requiresAP) {
      if (profile.apStatus === "EXPIRED" || profile.apStatus === "SUSPENDED") {
        result = "BLOCK";
        reasons.push(`A&P certificate is ${profile.apStatus} — cannot assign`);
      }
    }

    // 5. Build immutable snapshot for qualificationAssignments record
    const snapshot = buildProfileSnapshot(profile, requirement, args.taskType);

    if (reasons.length === 0) {
      reasons.push("Qualification check PASS — all requirements met");
    }

    return {
      result,
      reasons,
      daysRemaining: profile.iaExpiryDate
        ? Math.floor((profile.iaExpiryDate - now) / (1000 * 60 * 60 * 24))
        : undefined,
      willExpireBeforeWOClose:
        args.estimatedCloseDate && profile.iaExpiryDate
          ? profile.iaExpiryDate < args.estimatedCloseDate
          : false,
      snapshot,
    };
  },
});

// Called from createTaskCard and assignTechnicianToCard mutations:
export const applyQualificationGate = async (
  ctx: MutationCtx,
  technicianId: Id<"users">,
  taskType: string,
  workOrderId: Id<"workOrders">,
  estimatedCloseDate?: number
): Promise<void> => {
  const check = await ctx.runQuery(internal.qualificationValidation.validateTechnicianQualification, {
    technicianId, taskType, workOrderId, estimatedCloseDate,
  });

  // Record immutable snapshot regardless of result
  await ctx.db.insert("qualificationAssignments", {
    workOrderId,
    assignedUserId: technicianId,
    requirementCode: check.snapshot.requirementCode,
    requirementVersion: check.snapshot.requirementVersion ?? 0,
    qualificationProfileRef: check.snapshot.profileRef,
    evaluatedAt: Date.now(),
    evaluationResult: check.result,
    evaluationReasons: check.reasons,
    daysRemaining: check.daysRemaining,
    blocked: check.result === "BLOCK",
  });

  if (check.result === "BLOCK") {
    throw new ConvexError(
      `Qualification check failed: ${check.reasons.join("; ")}`
    );
  }
  // WARN: assignment proceeds but warning is logged and returned to UI
};
```

**Integration in `createTaskCard`:**
```typescript
export const createTaskCard = mutation({
  // ... existing args ...
  handler: async (ctx, args) => {
    // Qual check BEFORE any other mutation logic
    if (args.assignedTechnicianId) {
      await applyQualificationGate(ctx, args.assignedTechnicianId, args.taskType, args.workOrderId, args.estimatedCloseDate);
    }
    // ... rest of task card creation
  },
});
```

**Integration in `assignTechnicianToCard`:**
```typescript
export const assignTechnicianToCard = mutation({
  // ... existing args ...
  handler: async (ctx, args) => {
    // Qual check BEFORE assignment write
    await applyQualificationGate(ctx, args.technicianId, args.taskType, args.workOrderId, args.estimatedCloseDate);
    // ... rest of assignment logic
  },
});
```

---

## 5. Auth-Order Proof — Qualification Precheck BEFORE `signatureAuthEvent` Consumption

**This is Renata Solís's hard requirement. The proof that this ordering is enforced must be explicit and documented. Bypassing it by consuming the auth event first is not permitted under any code path.**

### 5.1 The Ordering Problem

In the WS16-B auth flow, a `signatureAuthEvent` is a one-time-use token that proves the signer re-authenticated (biometric, PIN, or other challenge). Consuming this event is irreversible — once consumed, it's gone. If the qualification check runs AFTER consumption:

1. Expired tech challenges → auth event consumed → qual check fails → **but the auth event is already spent and logged as consumed**
2. This creates a misleading audit trail: consumed auth event suggests a signature was in progress for an unqualified technician.
3. Worse: if there's a bug in the qual check, the auth event is gone and the unqualified signature may proceed.

### 5.2 Required Call Order

```
RTS or sign-off trigger
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 1: validateTechnicianQualification │  ← RUNS FIRST
│  (read-only query, no state mutation)    │
│                                          │
│  Result: PASS / WARN / BLOCK             │
└─────────────────────────────────────────┘
         │
         │ If BLOCK → throw error, STOP. Auth event NOT touched.
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: consumeSignatureAuthEvent       │  ← ONLY RUNS IF qual check = PASS/WARN
│  (WS16-B mutation — irreversible)        │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: writeSignatureRecord            │
│  (creates maintenance record signature)  │
└─────────────────────────────────────────┘
```

### 5.3 Implementation in `initiateRTSSignOff` mutation

```typescript
export const initiateRTSSignOff = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    signingUserId: v.id("users"),
    taskType: v.string(),
    authChallengeToken: v.string(),   // WS16-B token
  },
  handler: async (ctx, args) => {
    // ═══════════════════════════════════════════════════
    // STEP 1 — QUALIFICATION CHECK (runs FIRST, ALWAYS)
    // Must complete before ANY auth-event interaction
    // ═══════════════════════════════════════════════════
    const qualCheck = await ctx.runQuery(
      internal.qualificationValidation.validateTechnicianQualification,
      {
        technicianId: args.signingUserId,
        taskType: args.taskType,
        workOrderId: args.workOrderId,
      }
    );

    // Write precheck event to audit log — BEFORE auth consume
    await ctx.db.insert("qualificationAlertEvents", {
      orgId: (await ctx.db.get(args.workOrderId))!.orgId,
      userId: args.signingUserId,
      qualificationType: "IA",  // or derived from taskType
      severity: qualCheck.result === "BLOCK" ? "CRITICAL" : qualCheck.result === "WARN" ? "HIGH" : "INFO",
      thresholdCode: "RTS_PRECHECK",
      stateAtEmit: qualCheck.result === "BLOCK" ? "EXPIRED" : "ACTIVE",
      triggerContext: "RTS_PRECHECK",
      relatedWorkOrderId: args.workOrderId,
      dedupeKey: `RTS-PRECHECK-${args.workOrderId}-${args.signingUserId}-${Date.now()}`,
      eventHash: await hashObject(qualCheck),
      emittedAt: Date.now(),
      evaluationResult: qualCheck.result,
      evaluationReasons: qualCheck.reasons,
    });

    // If BLOCK: throw error NOW. Auth event is NEVER touched.
    if (qualCheck.result === "BLOCK") {
      throw new ConvexError(
        `RTS sign-off blocked: ${qualCheck.reasons.join("; ")}. Authentication event NOT consumed.`
      );
    }

    // ═══════════════════════════════════════════════════
    // STEP 2 — AUTH EVENT CONSUMPTION (only reaches here on PASS/WARN)
    // ═══════════════════════════════════════════════════
    const authResult = await ctx.runMutation(
      internal.auth.consumeSignatureAuthEvent,
      { token: args.authChallengeToken, signingUserId: args.signingUserId }
    );

    if (!authResult.success) {
      throw new ConvexError("Authentication challenge failed — signature not recorded");
    }

    // ═══════════════════════════════════════════════════
    // STEP 3 — WRITE SIGNATURE RECORD
    // ═══════════════════════════════════════════════════
    await ctx.db.insert("maintenanceSignatures", {
      workOrderId: args.workOrderId,
      signingUserId: args.signingUserId,
      signedAt: Date.now(),
      qualificationCheckRef: qualCheck.snapshot.profileRef,
      qualificationResult: qualCheck.result,
      authEventConsumedRef: authResult.authEventId,
    });

    return { success: true, qualificationResult: qualCheck.result };
  },
});
```

### 5.4 Ordering Proof — What Cilla Tests (TC-G-05)

The auth-order proof test verifies:
1. When qual check = BLOCK: auth event table is queried AFTER the mutation throws; verify auth event is still in `pending` state (not consumed).
2. When qual check = PASS: auth event is consumed AFTER the `qualificationAlertEvents` row is inserted.
3. There is NO code path in `initiateRTSSignOff` where `consumeSignatureAuthEvent` is called before `validateTechnicianQualification` completes.

This is a code-level review assertion (part of Cilla's sign-off) plus a mutation-level test with an expired technician — see TC-G-05.

---

## 6. Renata Solís — UAT Script

**Scenario:** Renata's Monday morning audit — her current 90-minute manual process replaced by a single dashboard view. She also validates that an attempted sign-off by an expired technician is blocked.

---

**Current state (before build):**
Renata opens two spreadsheets, cross-references 14 technicians' cert expiry dates against the active WO assignment list, flags 3 who are within 30 days, sends 3 emails, waits for replies, makes a note in a binder. This takes 90 minutes and depends on the spreadsheet being up to date.

---

**Step 1 — Monday morning: open Qualification Dashboard**
- Navigate to Quality > Qualification Dashboard (QCM view)
- Dashboard shows: all technicians in org, current qual status, days until next expiry, alert badges
- Filter: "Expiring within 30 days" → shows 2 techs (IA and A&P)
- ✅ *Confirm: no spreadsheet needed; data pulls live from qualificationProfiles*

**Step 2 — Review individual tech with 12-day IA expiry**
- Click tech name → profile detail view
- Shows: IA cert number, expiry date, current assignment count, active WOs they're assigned to
- Alert banner: "IA certificate expires in 12 days. This technician is currently assigned to 2 active WOs with IA-required tasks."
- "Notify Technician" button → triggers notification to mechanic
- ✅ *Confirm: QCM action takes 30 seconds instead of email chain*

**Step 3 — Review notification history**
- Click "Alert History" tab on dashboard
- Shows: automated nightly alerts sent for this tech at TH-30, TH-14 thresholds; delivery status (sent, opened)
- Renata can see technician acknowledged the TH-30 alert 2 days ago
- ✅ *Confirm: full acknowledgement audit trail visible to QCM*

**Step 4 — Attempt to assign expired technician to new task card**
- Expired tech (IA cert expired 3 days ago) is displayed in roster with red "EXPIRED" badge
- Supervisor attempts to assign this tech to a new IA-required task card
- System shows: "Assignment blocked: IA certificate expired 3 days ago — cannot assign to IA-required task"
- ✅ *Confirm: assignment rejected, qualificationAssignments record created with result=BLOCK*

**Step 5 — Attempt expired tech sign-off (auth-order proof)**
- Expired tech somehow has an open task they're assigned to
- They go to sign the maintenance record → system asks for auth challenge
- They complete the biometric/PIN challenge
- BEFORE auth event is consumed: qual check runs → result = BLOCK
- Sign-off page shows: "Sign-off blocked: IA certificate expired. Your authentication was not consumed — retry after renewing your certificate."
- ✅ *Confirm: auth event still in pending state; NOT consumed; sign attempt rejected before auth spend*

**Step 6 — Renata's 90-minute audit is now 4 minutes**
- Total time for Steps 1-3: < 5 minutes
- Renata marks UAT complete

**Renata UAT Sign-Off Criteria:**
- [ ] Qualification dashboard shows all techs with expiry dates and current status
- [ ] "Expiring within 30 days" filter works
- [ ] Assignment block prevents expired tech from being assigned to IA-required task
- [ ] Auth-order: expired tech's auth event NOT consumed when sign-off is blocked
- [ ] Notification history shows automated alert sends and ack status
- [ ] QCM can see all active assignment blocks without manual cross-reference

---

## 7. Cilla Oduya — Test Plan (Minimum 7 Cases)

| TC | Title | Input | Expected | Regulatory/Source |
|---|---|---|---|---|
| TC-G-01 | Nightly cron: 30-day warning alert | Tech with iaExpiryDate = 28 days from now; run `checkCertificationExpiry` | HIGH severity alert emitted to `qualificationAlertEvents`; notification sent to mechanic AND QCM; `notifications` table shows both entries; dedupeKey prevents duplicate on re-run same day | WS15-J TH-30 |
| TC-G-02 | Nightly cron: 7-day urgent alert | Tech with iaExpiryDate = 5 days from now | CRITICAL_ESCALATED alert; notification sent to mechanic + QCM + DOM; NOT sent to Accountable Manager (threshold is TH-07, not TH-00) | WS15-J TH-07 |
| TC-G-03 | Nightly cron: dedupe prevents duplicate same-day alerts | Run `checkCertificationExpiry` twice in same UTC day for same tech | Second run: dedupeKey match detected; no new `qualificationAlertEvents` row created; notifications not re-sent | WS15-J QALERT-06 |
| TC-G-04 | Assignment-time block: expired IA cert | `assignTechnicianToCard` with tech whose iaStatus = EXPIRED; task requires IA | Mutation throws: "IA certificate is EXPIRED — cannot assign to IA-required task"; no assignment written; `qualificationAssignments` row created with result=BLOCK and blocked=true | WS15-J R-SME-01; Part 65 |
| TC-G-05 | Auth-order proof: expired tech, sign-off attempt | Tech with expired IA; attempts `initiateRTSSignOff`; auth challenge token provided | (1) `validateTechnicianQualification` runs first → result=BLOCK → `qualificationAlertEvents` row inserted with triggerContext=RTS_PRECHECK; (2) `consumeSignatureAuthEvent` is NOT called; (3) auth event record in DB still shows status=pending; (4) mutation throws error; (5) NO `maintenanceSignatures` row created | Renata Solís non-negotiable; WS15-J QALERT-18 |
| TC-G-06 | Assignment-time WARN: cert expiring before WO close date | Tech's IA cert expires in 20 days; estimatedCloseDate = 25 days from now | Mutation proceeds (WARN, not BLOCK); assignment written; `qualificationAssignments` row shows result=WARN with reason "IA certificate expires before estimated WO close date"; UI shows warning banner on task card | WS15-J R-SME-02 |
| TC-G-07 | Cert renewal closes alert and clears block | Tech renews IA cert (iaStatus → ACTIVE, iaExpiryDate updated to +2 years); open alert exists for this tech | Alert system: existing HIGH alert's resolution event written (type=RENEWED); new `checkCertificationExpiry` run does NOT emit new expiry alert; previously blocked assignment path now shows PASS | WS15-J QALERT-19 |
| TC-G-08 | IA/A&P field separation — no merged writes | Attempt to write a combined IA+AP expiry into a single cert number field | Schema guard rejects; mutation throws; `qualificationProfiles` does not accept merged credential rows | WS15-J D-05; NEG-01 |
| TC-G-09 | DOM cannot unilaterally bypass qualification block | DOM role user attempts to override qual block on IA-required sign-off without QCM co-authorization | Override request created as EXC_IDENTITY_FALLBACK; requires DOM + QCM dual approval; DOM-only submission rejected; `qualificationEscalations` record shows rejected status | WS15-J R-SME-04; QALERT-08 |

---

## 8. Marcus Webb — Compliance Checklist

### Applicable Regulations
- **14 CFR Part 65, Subpart D** — Mechanics; A&P certificate requirements and limitations
- **14 CFR Part 65, Subpart E** — Repairmen; IA certificate requirements
- **14 CFR Part 145 §145.151** — Personnel requirements for certificated repair stations
- **14 CFR Part 145 §145.155** — Supervisory personnel requirements; qualified persons must perform and supervise maintenance
- **14 CFR §65.81** — General privileges and limitations for A&P mechanics
- **14 CFR §65.93** — IA privileges and limitations; authority to approve for return to service

### Marcus Pre-Release Checklist

**HARD BLOCKERS — any one = NO-GO:**
- [ ] Auth-order proof: Cilla's TC-G-05 must pass — expired tech's auth event must NOT be consumed when qualification check returns BLOCK; verified by direct mutation test with auth event pre/post state inspection
- [ ] IA/A&P certificate fields are stored, evaluated, and displayed as distinct entities in schema and UI; no code path merges them into a single credential record; TC-G-08 passes
- [ ] Expired IA cannot be waived for IA-required RTS sign-off under any code path; WS15-J §3.6 "Non-negotiable" honored
- [ ] `qualificationAssignments` snapshot includes `requirementVersion` and `evaluationReasons[]` — missing version = incomplete audit record; TC-G-04 passes with snapshot inspection

**Standard Verification Items:**
- [ ] Alert routing verified: TH-30 → mechanic + QCM; TH-07 → + DOM; TH-00 → + Accountable Manager; routes do not exceed per-threshold spec
- [ ] QCM ack SLA enforcement: CRITICAL unacked after 2h triggers DOM notification; EXPIRED_BLOCK unacked after 1h triggers Accountable Manager
- [ ] Override frequency dashboard operational; QCM can see suppression/override history per technician
- [ ] `qualificationAlertEvents` rows are immutable — no delete or destructive update mutations exist
- [ ] Waiver path (for allowed non-IA training edges) requires QCM + DOM dual attestation and time-bound validity; single-actor waiver rejected
- [ ] Qualification alert audit export bundle generates correctly: QALERT-INDEX.json, QALERT-EVENTS.ndjson, QALERT-HASH-MANIFEST.json
- [ ] 24-month hot-searchable alert retention confirmed in data retention policy config

---

## 9. Build Sequence

| Step | Component | Owner | Depends On |
|---|---|---|---|
| B1 | Schema migrations: `qualificationProfiles`, `qualificationRequirements`, `qualificationAssignments`, `qualificationAlertEvents`, notifications additions | Devraj | — |
| B2 | `validateTechnicianQualification` query and `applyQualificationGate` function | Devraj | B1 |
| B3 | `createTaskCard` + `assignTechnicianToCard` integration with qual gate | Devraj | B2 |
| B4 | `initiateRTSSignOff` with explicit ordering (qual first, then auth consume) | Devraj | B2 + WS16-B |
| B5 | `checkCertificationExpiry` nightly action + cron registration | Devraj | B1 |
| B6 | Notification routing (mechanic + QCM + DOM paths) | Devraj | B5 |
| B7 | Qualification Dashboard UI (QCM view) | Frontend | B1-B6 |
| B8 | Test execution (TC-G-01 through TC-G-09) | Cilla | B1-B7 |
| B9 | Marcus compliance clearance | Marcus | B8 |
| B10 | Renata UAT sign-off | Renata | B7-B8 |

---

## 10. Release Blockers Summary

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | WS16-B auth-event infrastructure complete | WS16-B team | Dependency |
| 2 | TC-G-05 auth-order proof passes (direct mutation test) | Cilla | ⬜ Not run |
| 3 | TC-G-04 assignment block passes via API bypass | Cilla | ⬜ Not run |
| 4 | Marcus compliance clearance | Marcus | ⬜ Not started |
| 5 | Renata Solís UAT sign-off | Renata | ⬜ Not run |

---

*Filed: 2026-02-22 | Phase 16 depth pass | Athelon WS16-G*
*Source: phase-15-rd/ws15-j-qual-alerts.md*
*Auth-order proof: non-bypassable per Renata Solís requirement*
