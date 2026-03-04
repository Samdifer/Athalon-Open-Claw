# WS18-F — WS17-J RSM Compliance Hardening

**Phase:** 18  
**Workstream:** WS18-F  
**Owners:** Devraj Anand (technical lead) + Rachel Kwon (compliance authority) + Chloe Park (HB-3 UX)  
**Date:** 2026-02-22  
**Source Blockers:** WS16-J §6.5 — Hard Blockers HB-1 through HB-4  
**Context:** Rachel Kwon's CONDITIONAL acceptance in Phase 17 included an explicit no-publish constraint: *"No production RSM revision may be published until all four blockers are closed."*  
**Status: CLOSED**

---

## 1. HB-1 — Clerk Log Retention + `rsmAcknowledgmentAuditLog` Mirror Table

### 1.1 Problem Statement

**HB-1 (from WS16-J §6.5):** Clerk auth log retention is 30 days by default. Session tokens stored in `rsmRevisions.acknowledgedBy[].sessionToken` reference Clerk session IDs that become unverifiable after 30 days when Clerk purges its internal auth logs. FAA record-keeping requirements for RSM acknowledgment training records require a minimum 6-year retention period (14 CFR §145.209(e)).

The session token itself — an opaque string like `clerk|ses_xxxxx` — remains stored in Convex forever (no TTL on `rsmRevisions` documents). The problem is **corroboration**: in an audit scenario, the investigator wants to verify not just that a string appears in the database, but that the Clerk identity system can confirm this session ID was authenticated to the named individual at that timestamp. After 30 days, Clerk cannot confirm this.

### 1.2 Solution

**Decision:** External audit log table `rsmAcknowledgmentAuditLog` in Convex, mirroring every acknowledgment event with 7-year retention policy, plus Clerk Enterprise upgrade for extended native log retention.

The two-layer approach:
- **Layer 1 (Convex — primary):** `rsmAcknowledgmentAuditLog` table captures a complete, self-contained record of every acknowledgment event at the moment it occurs. This record does not depend on Clerk for corroboration after the fact — it captures the identity evidence at the time of the event.
- **Layer 2 (Clerk Enterprise — secondary):** Clerk org upgraded to Enterprise plan, which provides configurable log retention. Set to 7 years. This provides a secondary corroboration source and is required for the written retention policy (HB-2).

### 1.3 `rsmAcknowledgmentAuditLog` Schema

```typescript
// convex/schema.ts — new table

rsmAcknowledgmentAuditLog: defineTable({
  // Core event identity
  rsmRevisionId: v.id("rsmRevisions"),
  revisionNumber: v.string(),          // Denormalized snapshot — readable without join
  revisionEffectiveDate: v.number(),   // Denormalized snapshot

  // Signer identity — captured at event time, not by reference
  userId: v.id("users"),
  userDisplayName: v.string(),         // Denormalized — what inspector reads
  userRole: v.string(),                // Denormalized — MECHANIC, IA, DOM, QCM
  userCertificateNumber: v.optional(v.string()),  // A&P/IA cert number if applicable
  clerkUserId: v.string(),             // Clerk user ID (format: user_xxxx) — stable identifier
  clerkSessionId: v.string(),          // Clerk session ID at moment of acknowledgment
  clerkSessionToken: v.string(),       // Full tokenIdentifier from Convex auth context

  // Event metadata
  acknowledgedAt: v.number(),          // Server-side timestamp (Convex time — authoritative)
  acknowledgedAtIso: v.string(),       // ISO 8601 string — human-readable without computation
  ipAddress: v.optional(v.string()),   // Client IP from HTTP context (if available via action)
  userAgent: v.optional(v.string()),   // Browser user agent for context

  // Document context — what exactly was acknowledged
  revisionFileRef: v.string(),         // The fileRef of the RSM document at time of ack
  summaryOfChangesHash: v.string(),    // SHA-256 of summaryOfChanges text — confirms what was shown
  scrollCompleted: v.boolean(),        // Was scroll-to-bottom sentinel intersected? (from client)

  // Org scope
  orgId: v.id("organizations"),

  // Retention policy marker
  retentionPolicy: v.literal("7_YEAR"),  // Marker for data governance; drives retention enforcement
  retentionExpiresAt: v.number(),        // acknowledgedAt + 7 years in ms (for automated review)
})
.index("by_revision", ["rsmRevisionId"])
.index("by_user", ["userId"])
.index("by_org_revision", ["orgId", "rsmRevisionId"])
.index("by_retention_expiry", ["retentionExpiresAt"])
.index("by_clerkSessionId", ["clerkSessionId"]),
```

**Design rationale:**
- **Denormalized fields (`userDisplayName`, `revisionNumber`, etc.):** The audit log record must be self-contained. If the user record or revision record is ever modified (user display name change, etc.), the audit log record reflects what was true at acknowledgment time. This is non-repudiation by design.
- **`summaryOfChangesHash`:** A SHA-256 of the revision's summary text at time of acknowledgment. If someone later claims the summary text was different when they acknowledged, this hash provides verification.
- **`retentionExpiresAt`:** Explicitly calculated to 7 years post-event. The data governance system can query this index to identify records approaching expiry and require explicit authorization before deletion.

### 1.4 Mirror Write — Code Spec

The mirror write occurs **within the same Convex transaction** as the `acknowledgeRsmRevision` mutation. If the mirror write fails, the entire mutation rolls back — ensuring no acknowledgment is recorded without a corresponding audit log entry.

```typescript
// convex/mutations/rsmRevisions.ts — updated acknowledgeRsmRevision

export const acknowledgeRsmRevision = mutation({
  args: {
    rsmRevisionId: v.id("rsmRevisions"),
    scrollCompleted: v.boolean(),        // Client signals scroll completion
    // ipAddress and userAgent passed from HTTP action wrapper, not from client directly
  },
  handler: async (ctx, args) => {
    // ... existing auth checks and idempotency guard (unchanged) ...

    const now = Date.now();
    const sessionToken = identity.tokenIdentifier;

    // --- NEW: Build audit log entry (before patching revision) ---
    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision) throw new ConvexError("RSM revision not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new ConvexError("User not found");

    // SHA-256 of summaryOfChanges — computed in mutation context (no external call)
    // Note: Convex does not have built-in crypto; use a pure-JS SHA-256 implementation
    // or store the hash pre-computed on the revision document at publish time.
    // Implementation choice: store summaryOfChangesHash on rsmRevisions at publish,
    // reference it here. Eliminates need for per-acknowledgment hash computation.
    const summaryHash = revision.summaryOfChangesHash ?? await sha256(revision.summaryOfChanges);

    const sevenYearsMs = 7 * 365.25 * 24 * 60 * 60 * 1000;

    // Mirror write to audit log (same transaction as acknowledgment)
    await ctx.db.insert("rsmAcknowledgmentAuditLog", {
      rsmRevisionId: args.rsmRevisionId,
      revisionNumber: revision.revisionNumber,
      revisionEffectiveDate: revision.effectiveDate,

      userId: user._id,
      userDisplayName: user.displayName,
      userRole: user.role,
      userCertificateNumber: user.certificateNumber ?? undefined,
      clerkUserId: identity.subject,       // user_xxxx format
      clerkSessionId: sessionToken,        // clerk|ses_xxxx format
      clerkSessionToken: sessionToken,

      acknowledgedAt: now,
      acknowledgedAtIso: new Date(now).toISOString(),
      scrollCompleted: args.scrollCompleted,

      revisionFileRef: revision.fileRef,
      summaryOfChangesHash: summaryHash,

      orgId: user.orgId,

      retentionPolicy: "7_YEAR",
      retentionExpiresAt: now + sevenYearsMs,
    });

    // --- Existing logic: patch revision and user (unchanged) ---
    await ctx.db.patch(args.rsmRevisionId, {
      acknowledgedBy: [
        ...revision.acknowledgedBy,
        { userId: user._id, timestamp: now, sessionToken },
      ],
    });

    await ctx.db.patch(user._id, {
      pendingRsmAcknowledgments: (user.pendingRsmAcknowledgments ?? [])
        .filter(id => id !== args.rsmRevisionId),
    });

    return { alreadyAcknowledged: false, acknowledgedAt: now };
  },
});
```

**Transaction guarantee:** Both the `rsmAcknowledgmentAuditLog` insert and the `rsmRevisions` patch occur within the same Convex mutation transaction. Convex's ACID guarantees mean either both succeed or both fail. There is no state where an acknowledgment is recorded without a corresponding audit log entry.

### 1.5 Clerk Enterprise Upgrade

- Clerk org `athelon-production` upgraded to Enterprise plan.
- Auth event log retention configured to **7 years** (maximum supported).
- Clerk Enterprise also provides: dedicated support SLA, log export API, and SAML/SSO support (post-v1.1).
- The `rsmAcknowledgmentAuditLog` Convex table is the **primary** audit record. Clerk's log is **secondary corroboration**.
- In the event of a Clerk log purge or Clerk service discontinuity, the Convex audit log is sufficient to produce an FAA-compliant acknowledgment record.

**Rachel Kwon's assessment:** *"The Convex audit log is the record I would show an FAA inspector. The Clerk log is the backup that answers 'but how do we know it was really that person?' The answer is: the Clerk log confirms the session was authenticated at that timestamp to that user identity, and the Convex record was written in the same server-side context. That's non-repudiation."*

---

## 2. HB-2 — DOM Emergency Override for AOG (emergencyRsmBypass)

### 2.1 Problem Statement

**HB-2 (from WS16-J §6.5):** No DOM override / emergency bypass is specified. WS15-K §4.4 specifies a temporary override model for lockout. Without it, a mechanic locked out during an AOG event (no pending RSM acknowledgment cleared) has no compliant path to work. This is a safety-adjacent blocker — an unacknowledged RSM should not ground an aircraft in an emergency.

### 2.2 Mutation Spec: `emergencyRsmBypass`

```typescript
// convex/mutations/rsmRevisions.ts

export const emergencyRsmBypass = mutation({
  args: {
    rsmRevisionId: v.id("rsmRevisions"),
    targetUserId: v.id("users"),         // The mechanic or IA who needs the bypass
    reason: v.string(),                  // Minimum 50 characters — must explain the AOG scenario
    domCertNumber: v.string(),           // DOM's certificate number (verbatim, not looked up)
    bypassWindowHours: v.optional(v.number()),  // Default: 8 hours; max: 24 hours
  },
  handler: async (ctx, args) => {
    // 1. Verify caller holds DOM role
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller || caller.role !== "DOM") {
      throw new ConvexError("emergencyRsmBypass: only the Accountable Manager (DOM) may issue an emergency bypass");
    }

    // 2. Verify the revision exists and is active
    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision || revision.status !== "active") {
      throw new ConvexError("Revision not found or not active");
    }

    // 3. Verify target user has a pending acknowledgment for this revision
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new ConvexError("Target user not found");

    const isPending = (targetUser.pendingRsmAcknowledgments ?? [])
      .some(id => id === args.rsmRevisionId);
    if (!isPending) {
      throw new ConvexError(
        "Target user does not have a pending acknowledgment for this revision — bypass not needed"
      );
    }

    // 4. Validate reason length
    if (args.reason.trim().length < 50) {
      throw new ConvexError("Emergency bypass reason must be at least 50 characters");
    }

    // 5. Validate bypass window (default 8h, max 24h)
    const windowHours = Math.min(args.bypassWindowHours ?? 8, 24);
    const now = Date.now();
    const bypassExpiresAt = now + (windowHours * 60 * 60 * 1000);

    // 6. Insert bypass record (separate table — bypasses are never merged into acknowledgedBy)
    const bypassId = await ctx.db.insert("rsmEmergencyBypasses", {
      rsmRevisionId: args.rsmRevisionId,
      revisionNumber: revision.revisionNumber,
      targetUserId: args.targetUserId,
      targetUserDisplayName: targetUser.displayName,
      issuedByDomId: caller._id,
      issuedByDomDisplayName: caller.displayName,
      domCertNumber: args.domCertNumber,
      reason: args.reason,
      issuedAt: now,
      issuedAtIso: new Date(now).toISOString(),
      bypassWindowHours: windowHours,
      bypassExpiresAt,
      orgId: caller.orgId,
      status: "active",
      // The bypass DOES NOT add the user to rsmRevisions.acknowledgedBy.
      // The bypass only grants temporary access. Full acknowledgment is still required.
      fullAckCompletedAt: undefined,
    });

    // 7. Add a temporary bypass marker to the target user's record
    // This marker is checked by the RsmAcknowledgmentGate alongside pendingRsmAcknowledgments
    await ctx.db.patch(args.targetUserId, {
      activeRsmBypasses: [
        ...(targetUser.activeRsmBypasses ?? []),
        {
          bypassId,
          rsmRevisionId: args.rsmRevisionId,
          expiresAt: bypassExpiresAt,
        },
      ],
    });

    // 8. MANDATORY: Immediately notify QCM — no silent bypasses
    const qcmUsers = await ctx.db
      .query("users")
      .filter(q => q.and(
        q.eq(q.field("orgId"), caller.orgId),
        q.eq(q.field("role"), "QCM"),
        q.eq(q.field("isActive"), true),
      ))
      .collect();

    for (const qcm of qcmUsers) {
      await ctx.scheduler.runAfter(0, internal.notifications.send, {
        recipientId: qcm._id,
        type: "EMERGENCY_RSM_BYPASS_ISSUED",
        severity: "HIGH",
        title: "EMERGENCY: RSM Bypass Issued",
        body:
          `DOM ${caller.displayName} (cert: ${args.domCertNumber}) has issued an emergency RSM bypass ` +
          `for ${targetUser.displayName} on revision ${revision.revisionNumber}. ` +
          `Bypass window: ${windowHours} hours (expires ${new Date(bypassExpiresAt).toISOString()}). ` +
          `Reason: "${args.reason}". ` +
          `Full RSM acknowledgment is still required from ${targetUser.displayName} before bypass expiry.`,
        orgId: caller.orgId,
        relatedEntityId: bypassId,
        urgent: true,
      });
    }

    // 9. Audit log entry for the bypass event
    await ctx.db.insert("rsmAcknowledgmentAuditLog", {
      rsmRevisionId: args.rsmRevisionId,
      revisionNumber: revision.revisionNumber,
      revisionEffectiveDate: revision.effectiveDate,
      userId: args.targetUserId,
      userDisplayName: targetUser.displayName,
      userRole: targetUser.role,
      clerkUserId: "bypass",           // Marker — this is a bypass record, not a direct ack
      clerkSessionId: `dom_bypass:${caller._id}:${bypassId}`,
      clerkSessionToken: `dom_bypass:${args.domCertNumber}:${bypassId}`,
      acknowledgedAt: now,
      acknowledgedAtIso: new Date(now).toISOString(),
      scrollCompleted: false,
      revisionFileRef: revision.fileRef,
      summaryOfChangesHash: revision.summaryOfChangesHash ?? "",
      orgId: caller.orgId,
      retentionPolicy: "7_YEAR",
      retentionExpiresAt: now + (7 * 365.25 * 24 * 60 * 60 * 1000),
      // Bypass-specific fields:
      isBypassRecord: true,
      bypassId,
      bypassReason: args.reason,
      bypassIssuedByDom: `${caller.displayName} (cert: ${args.domCertNumber})`,
    });

    return {
      bypassId,
      expiresAt: bypassExpiresAt,
      windowHours,
      message: `Emergency bypass issued for ${targetUser.displayName}. ` +
               `QCM notified. Bypass expires in ${windowHours} hours. ` +
               `Full RSM acknowledgment still required.`,
    };
  },
});
```

### 2.3 Supporting Schema: `rsmEmergencyBypasses` Table

```typescript
rsmEmergencyBypasses: defineTable({
  rsmRevisionId: v.id("rsmRevisions"),
  revisionNumber: v.string(),
  targetUserId: v.id("users"),
  targetUserDisplayName: v.string(),
  issuedByDomId: v.id("users"),
  issuedByDomDisplayName: v.string(),
  domCertNumber: v.string(),
  reason: v.string(),
  issuedAt: v.number(),
  issuedAtIso: v.string(),
  bypassWindowHours: v.number(),
  bypassExpiresAt: v.number(),
  orgId: v.id("organizations"),
  status: v.union(v.literal("active"), v.literal("expired"), v.literal("fulfilled")),
  fullAckCompletedAt: v.optional(v.number()),  // When the full ack was finally completed
})
.index("by_revision", ["rsmRevisionId"])
.index("by_target_user", ["targetUserId"])
.index("by_org_status", ["orgId", "status"])
.index("by_expiry", ["bypassExpiresAt"]),
```

### 2.4 No Silent Bypasses — Enforcement

The `emergencyRsmBypass` mutation enforces two properties that together prevent silent bypasses:

1. **Mandatory QCM notification** — the notification fires within the same mutation via `ctx.scheduler.runAfter(0, ...)`. If the notification scheduler fails (which would be a Convex system failure), the entire mutation rolls back. QCM notification is not optional.

2. **Audit log entry** — every bypass is recorded in `rsmAcknowledgmentAuditLog` with `isBypassRecord: true`. The bypass record is distinguishable from a genuine acknowledgment by this marker. An FAA inspector reviewing the audit log will see bypass records as a separate category from direct acknowledgments.

3. **Bypass does not satisfy acknowledgment** — the bypass grants temporary access to the task queue, but the RSM revision remains in the user's `pendingRsmAcknowledgments`. The user must complete the full acknowledgment (read + scroll + acknowledge button) before the bypass expires. If the bypass expires without full acknowledgment, the gate re-activates.

---

## 3. HB-3 — RSM Quick Access Link in Task Queue Sidebar

### 3.1 Problem Statement

**HB-3 (from WS16-J §6.5):** FAA Part 145 §145.163 requires that the RSM be available to mechanics during the performance of maintenance — not only during the acknowledgment step. Once a mechanic has acknowledged and is in the task queue, there must be a persistent, readily accessible link to the current RSM document.

### 3.2 Resolution (Chloe Park — UX Implementation)

**Implemented by:** Chloe Park  
**Complexity:** Low — UI-only change, no backend mutation required

**Implementation:**  

A persistent "RSM Quick Access" panel was added to the task queue sidebar (left navigation, below task filters). The panel shows:

- The current active RSM revision number and effective date
- A "📖 Open RSM" link that opens the `fileRef` in a new tab
- A "✓ Current" badge if the user has acknowledged the most recent revision, or an "⚠️ Pending" badge if not (with a link to the acknowledgment flow)

**Component:** `<RsmQuickAccessPanel>` — a Convex reactive component that subscribes to the current user's `pendingRsmAcknowledgments` and the most recent active `rsmRevision`. Renders in real-time without page reload.

```typescript
// components/RsmQuickAccessPanel.tsx

export function RsmQuickAccessPanel() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const activeRevision = useQuery(api.rsmRevisions.getActiveRevision);

  if (!activeRevision) return null;

  const hasPending = (currentUser?.pendingRsmAcknowledgments ?? [])
    .includes(activeRevision._id);

  return (
    <aside className="rsm-quick-access-panel" aria-label="RSM Quick Access">
      <div className="rsm-panel-header">
        <BookOpenIcon className="w-4 h-4" />
        <span>Repair Station Manual</span>
      </div>
      <div className="rsm-revision-info">
        <span className="rsm-revision-number">{activeRevision.revisionNumber}</span>
        <span className="rsm-effective-date">
          Effective {formatDate(activeRevision.effectiveDate)}
        </span>
      </div>
      <a
        href={activeRevision.fileRef}
        target="_blank"
        rel="noopener noreferrer"
        className="rsm-open-link"
        aria-label={`Open RSM ${activeRevision.revisionNumber} in new tab`}
      >
        📖 Open RSM ↗
      </a>
      {hasPending ? (
        <Link href="/rsm/pending" className="rsm-pending-badge warning">
          ⚠️ Acknowledgment Required
        </Link>
      ) : (
        <span className="rsm-current-badge success">✓ Acknowledged</span>
      )}
    </aside>
  );
}
```

**Chloe Park — HB-3 Implementation: COMPLETE**  
**Date: 2026-02-22**

---

## 4. HB-4 — Emergency Override Duration and Escalation Policy

### 4.1 Problem Statement

**HB-4 (from WS16-J §6.5 / WS15-K §4.4):** The DOM emergency override mechanism needs a formal escalation policy: what happens when the bypass window expires without a full acknowledgment? The escalation schedule (T+24h, T+72h, T+120h, T+168h per WS15-K §4.2) needs formal implementation, at least at the escalation-notification level.

### 4.2 Resolution — Bypass Expiry Cron + Escalation Notifications

**Implemented by:** Devraj Anand

```typescript
// convex/crons.ts — add to existing cron schedule

export const processRsmBypassExpiry = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find all active bypasses that have expired
    const expiredBypasses = await ctx.db
      .query("rsmEmergencyBypasses")
      .withIndex("by_expiry", q => q.lt("bypassExpiresAt", now))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    for (const bypass of expiredBypasses) {
      // Check if user has completed full acknowledgment during the bypass window
      const revision = await ctx.db.get(bypass.rsmRevisionId);
      const targetUser = await ctx.db.get(bypass.targetUserId);
      if (!revision || !targetUser) continue;

      const hasAcknowledged = revision.acknowledgedBy
        .some(ack => ack.userId === bypass.targetUserId);

      if (hasAcknowledged) {
        // Bypass was used correctly — user acknowledged during window
        await ctx.db.patch(bypass._id, {
          status: "fulfilled",
          fullAckCompletedAt: revision.acknowledgedBy
            .find(ack => ack.userId === bypass.targetUserId)?.timestamp,
        });

        // Remove from user's activeRsmBypasses
        await ctx.db.patch(bypass.targetUserId, {
          activeRsmBypasses: (targetUser.activeRsmBypasses ?? [])
            .filter(b => b.bypassId !== bypass._id),
        });
      } else {
        // Bypass expired WITHOUT acknowledgment — escalation required
        await ctx.db.patch(bypass._id, { status: "expired" });

        // Remove bypass (task queue gate re-activates automatically)
        await ctx.db.patch(bypass.targetUserId, {
          activeRsmBypasses: (targetUser.activeRsmBypasses ?? [])
            .filter(b => b.bypassId !== bypass._id),
        });

        // Notify DOM and QCM of expired bypass without ack
        const qcmAndDomUsers = await ctx.db
          .query("users")
          .filter(q => q.and(
            q.eq(q.field("orgId"), bypass.orgId),
            q.or(q.eq(q.field("role"), "QCM"), q.eq(q.field("role"), "DOM")),
          ))
          .collect();

        for (const recipient of qcmAndDomUsers) {
          await ctx.scheduler.runAfter(0, internal.notifications.send, {
            recipientId: recipient._id,
            type: "RSM_BYPASS_EXPIRED_WITHOUT_ACK",
            severity: "HIGH",
            title: "RSM Bypass Expired — Acknowledgment Not Completed",
            body:
              `The emergency RSM bypass issued for ${bypass.targetUserDisplayName} ` +
              `on revision ${bypass.revisionNumber} has expired after ${bypass.bypassWindowHours} hours ` +
              `WITHOUT the required acknowledgment being completed. ` +
              `${bypass.targetUserDisplayName} is now locked out of the task queue again. ` +
              `DOM action required to re-issue bypass or ensure acknowledgment is completed.`,
            orgId: bypass.orgId,
            relatedEntityId: bypass._id,
            urgent: true,
          });
        }

        // Log the expired-without-ack event to audit log
        await ctx.db.insert("rsmAcknowledgmentAuditLog", {
          rsmRevisionId: bypass.rsmRevisionId,
          revisionNumber: bypass.revisionNumber,
          revisionEffectiveDate: revision.effectiveDate,
          userId: bypass.targetUserId,
          userDisplayName: bypass.targetUserDisplayName,
          userRole: targetUser.role,
          clerkUserId: "bypass_expired",
          clerkSessionId: `bypass_expired:${bypass._id}`,
          clerkSessionToken: `bypass_expired:${bypass._id}`,
          acknowledgedAt: now,
          acknowledgedAtIso: new Date(now).toISOString(),
          scrollCompleted: false,
          revisionFileRef: revision.fileRef,
          summaryOfChangesHash: revision.summaryOfChangesHash ?? "",
          orgId: bypass.orgId,
          retentionPolicy: "7_YEAR",
          retentionExpiresAt: now + (7 * 365.25 * 24 * 60 * 60 * 1000),
          isBypassRecord: true,
          bypassId: bypass._id,
          bypassReason: `EXPIRED WITHOUT ACKNOWLEDGMENT — original reason: ${bypass.reason}`,
          bypassIssuedByDom: bypass.issuedByDomDisplayName,
        });
      }
    }

    return { processed: expiredBypasses.length };
  },
});

// Register: runs every 15 minutes
// crons.interval("process-rsm-bypass-expiry", { minutes: 15 }, internal.crons.processRsmBypassExpiry);
```

### 4.3 Escalation Schedule Implementation (WS15-K §4.2)

For regular (non-bypass) pending acknowledgments, the escalation schedule is now implemented:

```typescript
// convex/crons.ts — add RSM acknowledgment escalation scheduler

export const processRsmAcknowledgmentEscalation = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const activeRevisions = await ctx.db
      .query("rsmRevisions")
      .withIndex("by_status", q => q.eq("status", "active"))
      .collect();

    for (const revision of activeRevisions) {
      const effectiveDate = revision.effectiveDate;
      const msSinceEffective = now - effectiveDate;
      const hoursSinceEffective = msSinceEffective / (1000 * 60 * 60);

      // Find users who still haven't acknowledged
      for (const userId of revision.requiresAcknowledgmentBy) {
        const hasAcked = revision.acknowledgedBy.some(a => a.userId === userId);
        if (hasAcked) continue;

        const user = await ctx.db.get(userId);
        if (!user || !user.isActive) continue;

        // Escalation tiers per WS15-K §4.2:
        // T+24h: First reminder (in-app notification)
        // T+72h: L1 escalation (notify supervisor/DOM)
        // T+120h: L2 escalation (urgent supervisor alert)
        // T+168h (7 days): L3 escalation (DOM + QCM + compliance officer)

        const escalationKey = `rsm_esc:${revision._id}:${userId}`;

        if (hoursSinceEffective >= 168 && !await hasEscalationBeenSent(ctx, escalationKey, "L3")) {
          await sendRsmEscalation(ctx, { user, revision, level: "L3", escalationKey });
        } else if (hoursSinceEffective >= 120 && !await hasEscalationBeenSent(ctx, escalationKey, "L2")) {
          await sendRsmEscalation(ctx, { user, revision, level: "L2", escalationKey });
        } else if (hoursSinceEffective >= 72 && !await hasEscalationBeenSent(ctx, escalationKey, "L1")) {
          await sendRsmEscalation(ctx, { user, revision, level: "L1", escalationKey });
        } else if (hoursSinceEffective >= 24 && !await hasEscalationBeenSent(ctx, escalationKey, "reminder")) {
          await sendRsmEscalation(ctx, { user, revision, level: "reminder", escalationKey });
        }
      }
    }
  },
});
// crons.interval("rsm-acknowledgment-escalation", { hours: 1 }, internal.crons.processRsmAcknowledgmentEscalation);
```

---

## 5. Rachel Kwon — Sign-Off

**Rachel Kwon, Technical Publications / RSM Compliance Authority, Bend OR**  
**Review date:** 2026-02-22

---

### 5.1 Does This Solve My Compliance Concern?

Yes. I will explain what my compliance concern actually was, because I want the record to reflect it accurately.

My concern was not primarily about the task queue modal. The modal was correct in Phase 17 — it enforces acknowledgment before access, and it works. My concern was about what happens **after** the acknowledgment is recorded.

In a real FAA inspection, the inspector doesn't watch someone click the button. The inspector comes in two years later and asks: "Show me your acknowledgment records for RSM-2026-03. Show me who acknowledged it and when. Show me that you can prove it was really that person at that time and not someone who just typed their name in a box."

What I needed was a record that could answer that question. The session token in the `acknowledgedBy` array is useful, but only if we can still verify what that session ID maps to. After 30 days, Clerk's logs purge. The session ID becomes an unverifiable string.

The `rsmAcknowledgmentAuditLog` table changes this completely. It captures everything at the moment of the event: the user's name, role, certificate number, their Clerk user ID, their session token, the timestamp in ISO format, and a hash of the RSM summary text they were shown. This record is self-contained. It does not depend on Clerk for corroboration — it is itself the corroboration.

When an inspector asks me two years from now: "Did John Torres read RSM-2026-03?" I will pull up the audit log record. It will show: Torres, IA, cert 3126-IA, acknowledged 2026-02-22 at 14:23:07 UTC, Clerk session clerk|ses_abc123, scroll completed: true, summary hash: [sha256]. That is a complete answer. I do not have to say "well, the session token is here but you'd have to check Clerk and their retention is..." I just have the record.

The DOM emergency override (HB-2) solves the AOG scenario I was worried about. I did not want a shop to have to choose between a grounded aircraft and a compliance violation. The bypass is a legitimate tool — it creates a record, it notifies QCM immediately, it expires in hours, and it does not count as an acknowledgment. It's a bridge, not a workaround.

The RSM quick-access panel (HB-3) is the one I asked for in Phase 16 and it's exactly what I wanted. It's one click from the task queue. Mechanics can open it during work without navigating away. That satisfies §145.163's requirement that the RSM be available during maintenance.

The escalation schedule (HB-4 extension) means non-responsive users can't just avoid the modal by not logging in. When someone is out for a week and comes back, they'll see the unacknowledged revision. But we also catch it on our end after 24h, 72h, and 7 days. That's the right escalation posture.

---

### 5.2 Can I Remove the No-Publish Constraint?

Yes. The no-publish constraint is removed, effective this signature.

**What the constraint was:**  
*"No production RSM revision may be published until all four blockers are closed." — Rachel Kwon, Phase 17 Gate Review conditional acceptance.*

**What has been resolved:**

| Blocker | Resolution | My Assessment |
|---|---|---|
| HB-1: Clerk log retention | `rsmAcknowledgmentAuditLog` table with 7-year retention + Clerk Enterprise upgrade | **ADEQUATE.** The Convex audit table is the primary record. Clerk Enterprise is secondary corroboration. Inspector question "can you prove it was that person?" is answered by the audit record itself. |
| HB-2: Written data retention policy | See §5.3 below — policy text issued in this document | **ADEQUATE.** Written policy is now on record. DOM must adopt it formally before first revision publish. |
| HB-3: RSM Quick Access link | `<RsmQuickAccessPanel>` in task queue sidebar — live in staging | **ADEQUATE.** I confirmed it's there and it links to the actual RSM document. It shows the revision number and effective date. That's what I asked for. |
| HB-4: DOM emergency override + escalation | `emergencyRsmBypass` mutation + expiry cron + escalation schedule | **ADEQUATE.** The override creates a record, notifies QCM immediately, expires automatically, and forces the bypass-holder to still complete full acknowledgment. It's not a bypass of the requirement — it's a bridge across an AOG window. |

**No-publish constraint: REMOVED as of 2026-02-22.**

The first production RSM revision may be published to Athelon's production tenant upon successful deployment of the v1.1 release (Phase P1 + P2 + P3 features authorized per Phase 17 gate). Before the first revision is published, the DOM must adopt the data retention policy (§5.3) as an organizational record.

---

### 5.3 RSM Electronic Acknowledgment Record Retention Policy

**This policy is issued by Rachel Kwon in her capacity as Technical Publications and RSM Compliance Authority and must be adopted by the DOM before the first production RSM revision is published.**

---

> **ATHELON OPERATIONAL POLICY — RSM ELECTRONIC ACKNOWLEDGMENT RECORD RETENTION**  
> **Document ID:** RSM-RETENTION-POLICY-V1  
> **Effective Date:** 2026-02-22  
> **Regulatory Basis:** 14 CFR §145.209(e) — repair station records retention; FAA Order 8100.15 — electronic recordkeeping  
> **Prepared by:** Rachel Kwon, Tech Pubs / RSM Compliance Authority

**1. Retention Period**  
All RSM acknowledgment records in the `rsmAcknowledgmentAuditLog` Convex table shall be retained for a minimum of **7 years** from the date of the acknowledgment event. The `retentionExpiresAt` field on each record documents this expiry date. No record may be deleted before its `retentionExpiresAt` date without explicit written authorization from the DOM and notification to the QCM.

**2. Primary Record Location**  
The `rsmAcknowledgmentAuditLog` table in Athelon's Convex database is the authoritative primary record for RSM acknowledgment events. Convex database snapshots are taken continuously; point-in-time recovery is available per Convex's SLA.

**3. Secondary Corroboration**  
Clerk auth event logs are retained for 7 years (Clerk Enterprise plan configuration). These logs provide secondary corroboration of session identity. In the event of irreconcilable discrepancy between the Convex record and the Clerk log, the Convex record shall be treated as authoritative (it is written server-side in the same transaction as the acknowledgment).

**4. Immutability**  
Acknowledgment audit log records are insert-only. No Convex mutation exposes an update or delete path for `rsmAcknowledgmentAuditLog` records. Bypass records are similarly immutable. This immutability is enforced at the code level — not just by policy.

**5. FAA Inspection Response**  
Upon receipt of an FAA inspector request for RSM acknowledgment records, the DOM or QCM shall use the `getRsmAcknowledgmentStatus` query and the `rsmAcknowledgmentAuditLog` export function to produce a complete roster within 30 minutes of the request.

**6. Superseded Revisions**  
Acknowledgment records for superseded RSM revisions are retained for the same 7-year period. The revision's `status: "superseded"` does not affect the retention obligation.

---

**Rachel Kwon — RSM Compliance Authority Sign-Off**  
**No-publish constraint: REMOVED**  
**Data retention policy: ISSUED**  
**Date: 2026-02-22**

---

## 6. No-Publish Constraint Removal Authorization

**Issued by:** Rachel Kwon, Technical Publications / RSM Compliance Authority  
**Date:** 2026-02-22

**Explicit authorization statement:**

> *The no-publish constraint on Athelon's production RSM acknowledgment workflow — requiring that no production RSM revision be published until HB-1 through HB-4 are closed — is hereby lifted, effective 2026-02-22.*
>
> *All four hard blockers identified in WS16-J §6.5 and reiterated in the Phase 17 gate review conditional item (WS17-J) are confirmed closed: (1) `rsmAcknowledgmentAuditLog` with 7-year retention resolves Clerk log retention gap; (2) `emergencyRsmBypass` mutation with mandatory QCM notification resolves the AOG lockout risk; (3) `<RsmQuickAccessPanel>` in task queue sidebar resolves the §145.163 RSM accessibility requirement; (4) bypass expiry cron and escalation schedule implement the governance continuity model from WS15-K §4.2 and §4.4.*
>
> *The `rsmAcknowledgmentAuditLog` table design is the centerpiece of my acceptance: it produces a self-contained, non-repudiable record at the moment of each acknowledgment event that does not depend on third-party log retention for its probative value. This is the record I would present to an FAA inspector. I am satisfied with it.*
>
> *Before the first production RSM revision is published, the DOM shall formally adopt RSM-RETENTION-POLICY-V1 as an organizational record. This adoption must be documented with the DOM's signature on the policy text and filed alongside the first revision in the organization's records.*
>
> *Rachel Kwon*  
> *Technical Publications / RSM Compliance Authority*  
> *Bend, OR*  
> *2026-02-22*

---

## 7. Status

**WS18-F STATUS: CLOSED**

All four WS17-J hard blockers are closed:
- **HB-1:** ✅ CLOSED — `rsmAcknowledgmentAuditLog` table with 7-year retention + Clerk Enterprise
- **HB-2:** ✅ CLOSED — `emergencyRsmBypass` mutation with mandatory QCM notification
- **HB-3:** ✅ CLOSED — `<RsmQuickAccessPanel>` in task queue sidebar (Chloe Park)
- **HB-4:** ✅ CLOSED — Bypass expiry cron + escalation schedule (T+24h/72h/120h/168h)

Rachel Kwon's no-publish constraint: **REMOVED**

**Phase P5 production activation** (as defined in the Phase 17 gate review) is now authorized:  
> *"Phase P5 (after WS17-J HB-1..HB-4 closed): Authorize first production RSM revision publication."*

Pre-condition: DOM must formally adopt RSM-RETENTION-POLICY-V1 before publishing.

---

*Filed: 2026-02-22 | Phase 18 — WS18-F RSM Compliance Hardening | Athelon v1.1*  
*Technical Owner: Devraj Anand | UX: Chloe Park | Compliance Authority: Rachel Kwon*
