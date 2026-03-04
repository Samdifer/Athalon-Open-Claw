# WS16-L — Discrepancy Customer Authorization Flow Build (FULL DEPTH)

**Phase:** 16
**Workstream:** WS16-L
**Owners:** Devraj Anand (Backend/Convex) + Danny Osei (UAT) + Marcus Webb (liability sign-off)
**QA:** Cilla Oduya
**Depends on:** `phase-15-rd/ws15-l-disc-auth.md` · WS16-K portal build · WS16-B/WS16-G ordering controls
**Status: READY FOR BUILD (pending Marcus memo sign-off)**

---

## 1. Context

This build closes the "sticky note authorization" problem. Danny Osei (WO Coordinator) currently chases customer authorization for discovered discrepancies via email, phone, and handwritten notes. The authorization evidence is weak, inconsistently formatted, and takes days to collect. Mechanics wait. Work stalls.

The legal exposure is real: a shop that performs additional maintenance without documented customer authorization for the scope and cost is potentially liable for the entire repair cost and faces regulatory exposure if the aircraft owner later disputes the authorization. The current verbal-approval workflow has no audit trail and no legal standing.

This build creates a structured, evidence-forward consent capture flow that replaces the sticky-note workflow while preserving Marcus's requirement that customer consent is permission to proceed with maintenance scope — it is NOT a technical release authority or airworthiness determination.

**Phase 15 carry-forward controls:**
1. Fail-closed on pending authorization state — mechanic cannot proceed on a discrepancy while authorization is in `SENT_PENDING_CUSTOMER` or `VIEWED_PENDING_CUSTOMER` state.
2. No bypass under AOG urgency — AOG escalates notification speed and coordinator queue priority; it does NOT auto-convert pending states to approved or skip consent controls.
3. Hash-manifest verification — consent record text, version hash, and all transition events land in WS16-M manifest chain.
4. Qualification precheck-before-auth consume (inherited) — where authorization events trigger downstream sign paths.

---

## 2. Marcus Webb — Liability Pre-Spec (REQUIRES SIGNATURE)

> **ATHELON INTERNAL POLICY DOCUMENT**
> **Document ID:** DISC-AUTH-LIABILITY-MEMO-V1
> **Subject:** Shop Liability Exposure on Unauthorized Maintenance Scope — What Constitutes Sufficient Authorization and What the Email Click-to-Approve Constitutes Legally
> **Prepared for signature by:** Marcus Webb, Regulatory/Compliance
> **Date prepared:** 2026-02-22
> **Status:** AWAITING MARCUS SIGNATURE — required before customer-facing authorization flow goes to production

---

### 2.1 The Liability Conversation That Hadn't Happened

Athelon's current workflow for obtaining customer authorization on discovered discrepancies relies on coordinator phone calls, follow-up emails, and handwritten notes. When disputes arise, the shop's position is weak: "We called and the owner said yes" is not a legal defense. The owner can dispute it, and in the absence of documented evidence, the shop either eats the cost or faces a small claims action.

This memo establishes what documentation is required, what the proposed email click-to-approve mechanism constitutes legally, and what Marcus will sign off on for production deployment.

### 2.2 Shop Liability Without Documented Authorization

**When a shop performs maintenance beyond the original scope without documented customer authorization:**

1. **Civil liability for repair cost:** The shop may be unable to collect payment for the additional work. Aircraft owners have successfully contested repair invoices in small claims and civil court where the shop could not produce documented authorization for scope expansions.

2. **Regulatory exposure (Part 43 / Part 145):** Under 14 CFR §91.403(a), the aircraft owner/operator is responsible for maintaining the aircraft in airworthy condition. However, a repair station performing maintenance without owner direction or authorization is operating outside the scope of the work agreement. An FAA investigation could characterize unauthorized scope expansion as a recordkeeping or compliance issue.

3. **Part 91 Owner Authorization:** For maintenance that goes beyond the original work order scope, particularly work that affects the aircraft's airworthiness or involves significant cost, the owner's authorization is both a contractual and practical legal requirement. There is no regulatory text that explicitly requires documented written authorization for all scope expansions, but the absence of documentation creates an evidentiary void that favors the owner in any dispute.

4. **Insurance implications:** Some aviation insurance policies condition coverage on compliance with documented maintenance authorization procedures. An undocumented authorization for scope expansion may complicate insurance claims.

### 2.3 What Documentation Is Legally Sufficient

For authorization documentation to be legally sufficient under Athelon's policy, it must:

1. **Identify the specific discrepancy.** The authorization must reference the specific finding, not just "additional work." A generic "proceed with whatever is needed" is commercially common but legally weak.

2. **State the estimated cost range.** The customer must have been presented with a cost range or estimate and authorized in that context. "I didn't know it would cost this much" is the most common dispute basis.

3. **Identify the authorizing party.** The authorization must come from the aircraft owner, the registered operator (if different), or a documented authorized agent. Authorization from an unauthorized party (e.g., a pilot who is not the owner) has no standing.

4. **Include a timestamp.** The authorization must be datable — before the work was performed, not reconstructed after.

5. **Be non-repudiable.** The documentation must be resistant to "I never approved that" claims. A phone note in a coordinator's personal notebook is not non-repudiable. An email reply with the original request quoted is better. A system-logged, IP-timestamped approval via a secure link is best.

### 2.4 What the Email Click-to-Approve Constitutes Legally

The proposed authorization flow presents the customer with a secure, personalized link. Clicking "Approve" records: timestamp, IP address, email identity (the address the link was sent to), and the exact text of the authorization request that was presented.

**Marcus's legal characterization:**

> "An email click-to-approve mechanism, when properly implemented, constitutes a valid electronic signature under 15 U.S.C. §7001 et seq. (the E-SIGN Act) and corresponding state UETA provisions, provided: (a) the customer has an opportunity to review the authorization text before approving, (b) the authorization text clearly states what is being approved and the cost range, (c) the click is logged with sufficient identity evidence (email address delivery + IP timestamp), and (d) the customer had the option to decline or request clarification. This mechanism is legally superior to a verbal phone authorization and functionally equivalent to an email reply stating 'I approve.'"

**What it is NOT:**
- Not a guarantee of payment (a separate collections action may still be required for non-payment disputes)
- Not a technical release authority or airworthiness determination (per Carla's and Marcus's shared position from WS15-G and WS15-L)
- Not a substitute for owner authorization for work affecting airworthiness beyond the scope approved — i.e., if new findings materially change scope post-authorization, re-authorization is required

**Marcus's production gate:**

> "I will sign off on deployment of this authorization flow when: (1) the authorization request template includes the required elements listed in §2.3; (2) the consent record schema captures IP, timestamp, email identity, and the exact rendered text of the authorization request; (3) the system re-requires authorization on material scope changes (cost delta > configured threshold or new safety-relevant findings); and (4) the assisted-phone path is implemented as a structured documented path, not a free-text note."

### 2.5 Signature Block

```
Marcus Webb — Regulatory/Compliance
Document ID: DISC-AUTH-LIABILITY-MEMO-V1
Signature: ______________________________
Date: ______________________________

Witnessed by (DOM Delegate): ______________________________
Date: ______________________________
```

*This document must be signed before the customer-facing authorization link is deployed to production. The internal discrepancy → coordinator → pending state machine may proceed to build without this signature, but the customer-facing approval surface requires it.*

*Reference this document ID in code constant: `DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1"`*

---

## 3. Full Authorization Flow

### 3.1 State Machine Overview

```
Mechanic documents discrepancy
         │
         ▼
DRAFT_INTERNAL ──── Coordinator reviews ────►  READY_TO_SEND
         │                                            │
         │                                   System sends email
         │                                            │
         │                                            ▼
         │                                 SENT_PENDING_CUSTOMER ──── 48h timer starts
         │                                            │
         │                                   Customer opens link
         │                                            ▼
         │                                 VIEWED_PENDING_CUSTOMER
         │                                      │           │
         │                                   Approve      Decline
         │                                      │           │
         │                                      ▼           ▼
         │                                  APPROVED    DECLINED
         │                                      │
         │                              WO returns to in_progress
         │
         │ (48h no response)
         ▼
EXPIRED_NO_RESPONSE ──── Escalation alert to coordinator
```

**State definitions:**
- `DRAFT_INTERNAL` — mechanic has documented; coordinator has not yet reviewed/sent
- `READY_TO_SEND` — coordinator reviewed and approved for sending; queued for dispatch
- `SENT_PENDING_CUSTOMER` — notification dispatched; awaiting customer action
- `VIEWED_PENDING_CUSTOMER` — customer opened the link
- `APPROVED` — customer approved; `customerAuthorizationEvent` logged
- `DECLINED` — customer declined; coordinator must handle
- `EXPIRED_NO_RESPONSE` — 48-hour timeout reached; escalation triggered
- `WITHDRAWN_SUPERSEDED` — scope changed; old request invalidated; new request linked
- `CANCELLED_ADMIN` — administrative cancel (wrong recipient, WO cancelled, etc.)

### 3.2 Mechanic Cannot Proceed Until Authorized

```typescript
// In any mutation that advances work on a discrepancy-dependent task:
// (task card step sign-off, maintenance record sign, etc.)

async function enforceAuthorizationGate(
  ctx: MutationCtx,
  workOrderId: Id<"workOrders">,
  discrepancyId: Id<"discrepancies">
): Promise<void> {
  const authRequests = await ctx.db
    .query("discAuthRequests")
    .withIndex("by_discrepancy", q => q.eq("discrepancyId", discrepancyId))
    .filter(q => q.eq(q.field("workOrderId"), workOrderId))
    .collect();

  const pendingRequests = authRequests.filter(r =>
    ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER", "READY_TO_SEND"].includes(r.state)
  );

  if (pendingRequests.length > 0) {
    throw new ConvexError(
      "Cannot proceed: customer authorization is pending for a discovered discrepancy. " +
      "Work may not continue until the customer approves or the request is resolved."
    );
  }

  const requiredApprovals = authRequests.filter(r => r.requiresApprovalBeforeWork);
  const hasApproval = requiredApprovals.some(r => r.state === "APPROVED");

  if (requiredApprovals.length > 0 && !hasApproval) {
    throw new ConvexError(
      "Cannot proceed: this discrepancy requires customer authorization before work can continue. " +
      "No approved authorization on record."
    );
  }
}
```

### 3.3 Convex Schema: `discAuthRequests` Table

```typescript
discAuthRequests: defineTable({
  workOrderId: v.id("workOrders"),
  discrepancyId: v.id("discrepancies"),
  orgId: v.id("organizations"),

  state: v.union(
    v.literal("DRAFT_INTERNAL"),
    v.literal("READY_TO_SEND"),
    v.literal("SENT_PENDING_CUSTOMER"),
    v.literal("VIEWED_PENDING_CUSTOMER"),
    v.literal("APPROVED"),
    v.literal("DECLINED"),
    v.literal("EXPIRED_NO_RESPONSE"),
    v.literal("WITHDRAWN_SUPERSEDED"),
    v.literal("CANCELLED_ADMIN"),
  ),

  // Authorization request content (exactly as presented to customer)
  customerSafeSummary: v.string(),          // Coordinator-written, NOT raw discrepancy text
  discrepancyDescriptionForCustomer: v.string(),
  estimatedCostRangeLow: v.number(),
  estimatedCostRangeHigh: v.number(),
  currencyCode: v.string(),                 // Default: "USD"
  requiresApprovalBeforeWork: v.boolean(),

  // Email delivery
  customerEmailAddress: v.string(),
  customerDisplayName: v.string(),
  notificationToken: v.string(),            // One-time token for approval link
  notificationTokenHash: v.string(),
  notificationTokenExpiresAt: v.number(),

  // Lifecycle timestamps
  createdAt: v.number(),
  createdBy: v.id("users"),
  sentAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),
  decidedAt: v.optional(v.number()),

  // 48-hour timeout
  expiresAt: v.number(),                    // createdAt + 48h by default
  timeoutEscalationSentAt: v.optional(v.number()),

  // Consent record (populated on APPROVED)
  consentRecord: v.optional(v.object({
    decision: v.union(v.literal("approve"), v.literal("decline")),
    decisionAtUtc: v.number(),
    customerDeclaredName: v.string(),
    customerRelationship: v.union(
      v.literal("owner"),
      v.literal("operator"),
      v.literal("authorized_agent"),
    ),
    ipAddress: v.string(),
    sessionId: v.string(),
    // Exact text presented to customer at time of decision (hash-verified)
    consentTextVersion: v.string(),
    consentTextHash: v.string(),
    costRangePresented: v.string(),         // "USD 450 - 620"
    declineReason: v.optional(v.union(
      v.literal("cost_not_approved"),
      v.literal("defer_preference"),
      v.literal("seeking_second_opinion"),
      v.literal("timing_constraint"),
      v.literal("other"),
    )),
    witnessCoordinatorId: v.optional(v.id("users")),  // Assisted phone path
    liabilityMemoRef: v.string(),           // "DISC-AUTH-LIABILITY-MEMO-V1"
  })),

  // Supersede chain
  supersededById: v.optional(v.id("discAuthRequests")),
  supersededAt: v.optional(v.number()),

  // Transition audit log (append-only)
  transitionLog: v.array(v.object({
    fromState: v.string(),
    toState: v.string(),
    actorType: v.union(v.literal("system"), v.literal("coordinator"), v.literal("customer")),
    actorId: v.optional(v.id("users")),
    timestamp: v.number(),
    reasonCode: v.optional(v.string()),
    note: v.optional(v.string()),
    policyVersion: v.string(),
  })),
})
.index("by_workOrder", ["workOrderId"])
.index("by_discrepancy", ["discrepancyId"])
.index("by_org_state", ["orgId", "state"])
.index("by_notificationTokenHash", ["notificationTokenHash"]),
```

---

## 4. Mutation Specifications

### 4.1 `requestCustomerAuthorization(discrepancyId)`

Called when coordinator reviews a discrepancy and initiates the authorization request.

```typescript
export const requestCustomerAuthorization = mutation({
  args: {
    discrepancyId: v.id("discrepancies"),
    workOrderId: v.id("workOrders"),
    customerSafeSummary: v.string(),
    discrepancyDescriptionForCustomer: v.string(),
    estimatedCostRangeLow: v.number(),
    estimatedCostRangeHigh: v.number(),
    customerEmailAddress: v.string(),
    customerDisplayName: v.string(),
    requiresApprovalBeforeWork: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    await requireRole(ctx, caller.userId, ["coordinator", "dom"]);

    // Validate: no active pending request already exists for this discrepancy
    const existing = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_discrepancy", q => q.eq("discrepancyId", args.discrepancyId))
      .filter(q =>
        ["DRAFT_INTERNAL", "READY_TO_SEND", "SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"]
          .includes(q.field("state") as string)
      )
      .first();
    if (existing) {
      throw new ConvexError("An active authorization request already exists for this discrepancy");
    }

    // Generate one-time approval token
    const notificationToken = generateSecureToken(32);
    const notificationTokenHash = await sha256(notificationToken);
    const now = Date.now();
    const expiresAt = now + (48 * 60 * 60 * 1000);  // 48 hours
    const notificationTokenExpiresAt = expiresAt;

    const requestId = await ctx.db.insert("discAuthRequests", {
      workOrderId: args.workOrderId,
      discrepancyId: args.discrepancyId,
      orgId: (await ctx.db.get(args.workOrderId))!.orgId,
      state: "DRAFT_INTERNAL",
      customerSafeSummary: args.customerSafeSummary,
      discrepancyDescriptionForCustomer: args.discrepancyDescriptionForCustomer,
      estimatedCostRangeLow: args.estimatedCostRangeLow,
      estimatedCostRangeHigh: args.estimatedCostRangeHigh,
      currencyCode: "USD",
      requiresApprovalBeforeWork: args.requiresApprovalBeforeWork ?? true,
      customerEmailAddress: args.customerEmailAddress,
      customerDisplayName: args.customerDisplayName,
      notificationToken,
      notificationTokenHash,
      notificationTokenExpiresAt,
      createdAt: now,
      createdBy: caller.userId,
      expiresAt,
      transitionLog: [{
        fromState: "NONE",
        toState: "DRAFT_INTERNAL",
        actorType: "coordinator",
        actorId: caller.userId,
        timestamp: now,
        policyVersion: DISC_AUTH_LIABILITY_MEMO_REF,
      }],
    });

    // Transition to READY_TO_SEND and dispatch email
    await ctx.scheduler.runAfter(0, internal.discAuth.dispatchAuthorizationEmail, {
      requestId,
      notificationToken,
    });

    // Update WO internal status to AUTHORIZATION_PENDING
    await ctx.db.patch(args.workOrderId, { internalStatus: "AUTHORIZATION_PENDING" });

    await emitAuditEvent(ctx, {
      eventType: "DISC_AUTH_REQUEST_CREATED",
      entityId: requestId,
      workOrderId: args.workOrderId,
    });

    return requestId;
  },
});
```

### 4.2 Authorization Request Email Template

**Subject:** `[Action Required] Authorization Needed for Aircraft N12345 — Work Order WO-2024-0419`

**Body:**
```
Dear [CustomerDisplayName],

Work on your aircraft (N12345) at [ShopName] has revealed an additional finding
that requires your authorization before we can proceed.

WHAT WE FOUND:
[discrepancyDescriptionForCustomer]

WHAT THIS MEANS:
[customerSafeSummary]

ESTIMATED COST:
USD [estimatedCostRangeLow] – [estimatedCostRangeHigh]

This estimate may vary based on final parts and labor. We will contact you
if there are material changes before proceeding.

WHAT HAPPENS IF YOU APPROVE:
Our technicians will proceed with the repair as described above. You will be
responsible for costs within the estimated range (plus applicable taxes).

WHAT HAPPENS IF YOU DECLINE:
We will not perform this additional repair. Your aircraft will be reassembled
without addressing this finding. We will note in your maintenance records that
this finding was declined. Depending on the nature of the finding, this may
affect the aircraft's airworthiness status — our coordinator will discuss this
with you.

WHAT HAPPENS IF YOU DON'T RESPOND:
If we don't hear from you within 48 hours (by [expiresAtReadable]), our
coordinator will contact you directly. Work on the related items remains on hold.

PLEASE INDICATE YOUR DECISION:

  [APPROVE THIS REPAIR]    [DECLINE THIS REPAIR]

  https://portal.athelon.app/auth/[token]?decision=approve
  https://portal.athelon.app/auth/[token]?decision=decline

This authorization link is personal to you and expires on [expiresAtReadable].
Do not forward this link to others.

Authorizing this repair does not constitute a technical release or airworthiness
determination. Certificated personnel at [ShopName] retain all responsibilities
for technical release and return-to-service.

Questions? Contact your coordinator:
[CoordinatorDisplayName] — [ShopPhone]

Work Order: [WO-PUBLICID]
Repair Station Certificate: [PartsCert]
```

### 4.3 `recordCustomerAuthorization(token, authorizationResponse)`

Called when the customer clicks the approve or decline link.

```typescript
export const recordCustomerAuthorization = mutation({
  args: {
    token: v.string(),
    authorizationResponse: v.union(v.literal("approve"), v.literal("decline")),
    customerDeclaredName: v.string(),
    customerRelationship: v.union(
      v.literal("owner"),
      v.literal("operator"),
      v.literal("authorized_agent"),
    ),
    declineReason: v.optional(v.union(
      v.literal("cost_not_approved"),
      v.literal("defer_preference"),
      v.literal("seeking_second_opinion"),
      v.literal("timing_constraint"),
      v.literal("other"),
    )),
    // These come from the HTTP request context, not from the customer UI
    ipAddress: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up request by token hash
    const tokenHash = await sha256(args.token);
    const request = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_notificationTokenHash", q => q.eq("notificationTokenHash", tokenHash))
      .first();

    if (!request) {
      throw new ConvexError("Invalid authorization link");
    }

    // 2. Check token expiry
    if (request.notificationTokenExpiresAt < Date.now()) {
      throw new ConvexError("This authorization link has expired. Please contact your coordinator.");
    }

    // 3. Check request state — must be in a pending state
    if (!["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"].includes(request.state)) {
      throw new ConvexError(
        request.state === "APPROVED" || request.state === "DECLINED"
          ? "This authorization request has already been decided."
          : "This authorization request is no longer active."
      );
    }

    const now = Date.now();
    const newState = args.authorizationResponse === "approve" ? "APPROVED" : "DECLINED";

    // 4. Build consent text that was presented to the customer (reconstructed from stored fields)
    const consentTextPresented = buildConsentText(request);
    const consentTextHash = await sha256(consentTextPresented);

    // 5. Record consent
    await ctx.db.patch(request._id, {
      state: newState,
      decidedAt: now,
      consentRecord: {
        decision: args.authorizationResponse,
        decisionAtUtc: now,
        customerDeclaredName: args.customerDeclaredName,
        customerRelationship: args.customerRelationship,
        ipAddress: args.ipAddress,
        sessionId: args.sessionId,
        consentTextVersion: CURRENT_DISC_AUTH_TEMPLATE_VERSION,
        consentTextHash,
        costRangePresented: `USD ${request.estimatedCostRangeLow} – ${request.estimatedCostRangeHigh}`,
        declineReason: args.authorizationResponse === "decline" ? args.declineReason : undefined,
        liabilityMemoRef: DISC_AUTH_LIABILITY_MEMO_REF,
      },
      transitionLog: [
        ...request.transitionLog,
        {
          fromState: request.state,
          toState: newState,
          actorType: "customer",
          timestamp: now,
          reasonCode: args.authorizationResponse,
          policyVersion: CURRENT_DISC_AUTH_TEMPLATE_VERSION,
        },
      ],
    });

    // 6. Emit `customerAuthorizationEvent`
    await emitAuditEvent(ctx, {
      eventType: "CUSTOMER_AUTHORIZATION_RECORDED",
      entityId: request._id,
      workOrderId: request.workOrderId,
      metadata: {
        decision: args.authorizationResponse,
        ipAddress: args.ipAddress,
        consentTextHash,
      },
    });

    // 7. Recompute WO authorization state
    await ctx.scheduler.runAfter(0, internal.discAuth.recomputeWOAuthState, {
      workOrderId: request.workOrderId,
    });

    // 8. Notify coordinator of decision
    await ctx.scheduler.runAfter(0, internal.notifications.sendAuthDecisionNotification, {
      requestId: request._id,
      decision: args.authorizationResponse,
    });

    return {
      decision: args.authorizationResponse,
      message: args.authorizationResponse === "approve"
        ? "Authorization recorded. The shop has been notified and work will proceed."
        : "Decline recorded. Your coordinator will contact you shortly.",
    };
  },
});
```

### 4.4 `getAuthorizationStatus(workOrderId)`

```typescript
export const getAuthorizationStatus = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);

    const requests = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_workOrder", q => q.eq("workOrderId", args.workOrderId))
      .order("desc")
      .collect();

    const pendingCount = requests.filter(r =>
      ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER", "READY_TO_SEND"].includes(r.state)
    ).length;

    const oldestPending = requests
      .filter(r => ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"].includes(r.state))
      .sort((a, b) => a.sentAt! - b.sentAt!)[0];

    return {
      workOrderId: args.workOrderId,
      derivedAuthState: deriveWOAuthState(requests),  // WO_AUTH_CLEAR / WO_AUTH_PENDING / etc.
      pendingRequestCount: pendingCount,
      oldestPendingAgeHours: oldestPending
        ? Math.floor((Date.now() - (oldestPending.sentAt ?? oldestPending.createdAt)) / 3600000)
        : null,
      requests: requests.map(r => ({
        requestId: r._id,
        state: r.state,
        customerSafeSummary: r.customerSafeSummary,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
        decidedAt: r.decidedAt,
        expiresAt: r.expiresAt,
        decision: r.consentRecord?.decision ?? null,
      })),
    };
  },
});
```

---

## 5. Timeout Handling — 48-Hour Escalation

```typescript
// convex/crons.ts — runs hourly
export const checkAuthorizationTimeouts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find all requests past expiry with pending state
    const expired = await ctx.db
      .query("discAuthRequests")
      .filter(q =>
        q.and(
          q.lt(q.field("expiresAt"), now),
          q.or(
            q.eq(q.field("state"), "SENT_PENDING_CUSTOMER"),
            q.eq(q.field("state"), "VIEWED_PENDING_CUSTOMER"),
          )
        )
      )
      .collect();

    for (const request of expired) {
      await ctx.db.patch(request._id, {
        state: "EXPIRED_NO_RESPONSE",
        transitionLog: [
          ...request.transitionLog,
          {
            fromState: request.state,
            toState: "EXPIRED_NO_RESPONSE",
            actorType: "system",
            timestamp: now,
            reasonCode: "TIMEOUT_48H",
            policyVersion: DISC_AUTH_LIABILITY_MEMO_REF,
          },
        ],
      });

      await emitAuditEvent(ctx, {
        eventType: "DISC_AUTH_EXPIRED_NO_RESPONSE",
        entityId: request._id,
        workOrderId: request.workOrderId,
      });

      // Escalation alert to coordinator
      const wo = await ctx.db.get(request.workOrderId);
      await ctx.scheduler.runAfter(0, internal.notifications.send, {
        recipientId: wo!.assignedCoordinatorId,
        type: "DISC_AUTH_TIMEOUT_ESCALATION",
        severity: "HIGH",
        title: "Customer Authorization Expired — Action Required",
        body: `Authorization request for WO ${wo!.publicId} expired without customer response after 48 hours. Customer: ${request.customerDisplayName}. Work remains on hold. Please contact the customer directly.`,
        orgId: wo!.orgId,
        relatedEntityId: request._id,
      });
    }

    // Also: send reminder at 24h (half of 48h window)
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const needsReminder = await ctx.db
      .query("discAuthRequests")
      .filter(q =>
        q.and(
          q.lt(q.field("sentAt"), twentyFourHoursAgo),
          q.eq(q.field("state"), "SENT_PENDING_CUSTOMER"),
          q.eq(q.field("timeoutEscalationSentAt"), undefined)
        )
      )
      .collect();

    for (const request of needsReminder) {
      // Send reminder email to customer
      await ctx.scheduler.runAfter(0, internal.discAuth.sendReminderEmail, { requestId: request._id });
      await ctx.db.patch(request._id, { timeoutEscalationSentAt: now });
    }

    return { expired: expired.length, reminded: needsReminder.length };
  },
});

// crons.hourly("check-authorization-timeouts", { minuteUTC: 15 }, internal.crons.checkAuthorizationTimeouts);
```

---

## 6. Danny Osei — UAT Script (The Sticky-Note Replacement)

**Background:** Danny's specific scenario. A mechanic calls Danny from the floor: "Found corrosion on the firewall, needs treatment before we button it up — about $450-600 in parts and labor." Danny takes a note on a sticky note, sends an email, waits. Sometimes the owner replies in 20 minutes. Sometimes it takes 3 days. In the meantime, the mechanic is waiting on Danny, who is chasing the owner, who forgot about the email. The WO sits in limbo.

---

**Step 1 — Mechanic documents the discrepancy**
- Mechanic navigates to WO → Task Card → "Add Discrepancy"
- Enters technical description: "Observed corrosion on firewall F.S. 45, Class 2 per AC 43.13-1B table 3-3. Treatment required prior to closure."
- Marks: "Requires Customer Authorization" → Yes
- Saves → discrepancy appears in coordinator queue with amber "Awaiting Review" badge
- ✅ *Confirm: mechanic's work does NOT stop the moment the discrepancy is created — only stops when request is sent*

**Step 2 — Coordinator reviews and sends authorization request**
- Danny opens the discrepancy queue
- Sees the firewall corrosion entry; clicks "Review & Authorize"
- Coordinator review screen shows:
  - Raw technical description (internal view)
  - "Customer description" field — Danny writes: "We found surface corrosion on a structural area of the firewall. This needs to be treated before we can close up the aircraft."
  - "Customer summary" — "Treatment of corrosion in the engine compartment structural area"
  - Cost range: $450 low, $620 high
  - Customer email pre-populated from WO customer record
- Danny hits "Send Authorization Request" → email dispatched within 2 minutes
- WO internal status → `AUTHORIZATION_PENDING`
- ✅ *Confirm: email sent with WO number, N-number, description, cost range, approve/decline links*

**Step 3 — Mechanic tries to proceed (blocked)**
- Mechanic attempts to advance the task card step that depends on this discrepancy
- System shows: "Authorization pending — work may not proceed until customer decision is recorded"
- ✅ *Confirm: enforcement gate active; mechanic can work on unrelated task cards but not this one*

**Step 4 — Customer receives email and approves**
- Owner gets email: subject "Action Required — Authorization Needed for N12345"
- Clicks "APPROVE THIS REPAIR" link
- Portal asks: "Confirm your name" + "Your relationship to this aircraft" (owner/operator/agent)
- Customer enters name, selects "Owner", clicks "Confirm Authorization"
- System records: timestamp, IP, email identity, consent text hash
- `customerAuthorizationEvent` logged with all required fields
- Customer sees: "Authorization recorded. The shop has been notified and work will proceed."
- ✅ *Confirm: entire customer interaction < 2 minutes*

**Step 5 — WO unlocks; coordinator notified**
- Danny's coordinator dashboard shows: "Authorization Received — N12345 — Firewall Corrosion" (green)
- WO internal status recomputed → `MAINTENANCE_IN_PROGRESS`
- Mechanic can now proceed with the firewall treatment
- ✅ *Confirm: WO gate unlocked within 30 seconds of customer click*

**Step 6 — Audit trail retrieval (Danny's dispute defense scenario)**
- Three months later, owner calls disputing the invoice
- Danny navigates to WO → Discrepancy Auth → History
- Shows: authorization request created (timestamp), sent to email address X, opened at (timestamp), approved by [CustomerName] from IP [x.x.x.x] at (timestamp), consent text shown at time of approval
- Danny can generate PDF evidence package with one click
- ✅ *Confirm: full audit trail retrievable, structured, non-repudiable*

**Step 7 — Timeout scenario**
- Different WO: customer never responds to authorization request
- 24 hours: reminder email sent automatically
- 48 hours: request transitions to `EXPIRED_NO_RESPONSE`; Danny receives escalation alert
- Danny calls the customer directly, gets verbal approval, completes assisted-phone path
- ✅ *Confirm: timeout alert delivered; assisted phone path available*

**Danny UAT Sign-Off Criteria:**
- [ ] Authorization request generated and email sent within 60 seconds of coordinator action
- [ ] Mechanic blocked from advancing dependent task steps while authorization pending
- [ ] Customer approval recorded within 30 seconds to WO gate recompute
- [ ] 48-hour timeout: escalation alert delivered to coordinator
- [ ] Full audit trail retrievable in single query; includes IP, timestamp, consent hash
- [ ] No free-text sticky notes required at any step

---

## 7. Cilla Oduya — Test Plan (Minimum 6 Cases)

| TC | Title | Input | Expected | Regulatory/Source |
|---|---|---|---|---|
| TC-L-01 | Mechanic blocked during pending auth | `recordEquipmentUsage` or task-step advance mutation called while auth request is in `SENT_PENDING_CUSTOMER` state | Mutation throws: "customer authorization is pending — work may not proceed"; WO remains on hold; no task advance written | WS15-L §3.5 invariant 2 |
| TC-L-02 | Customer approval — full consent record | Customer clicks approve; provides name, relationship, IP logged by server | `discAuthRequests` record transitions to APPROVED; `consentRecord` populated with: decision=approve, decisionAtUtc, customerDeclaredName, customerRelationship, ipAddress, consentTextHash, liabilityMemoRef; `CUSTOMER_AUTHORIZATION_RECORDED` audit event emitted; WO gate recomputes to `WO_AUTH_CLEAR` | DISC-AUTH-LIABILITY-MEMO-V1 §2.3 |
| TC-L-03 | 48-hour timeout escalation | Auth request sent at T=0; no customer action; advance system clock to T=48h | Request transitions to `EXPIRED_NO_RESPONSE`; transition log entry created with actorType=system, reasonCode=TIMEOUT_48H; escalation notification sent to coordinator; work remains on hold | WS15-L §3.8 |
| TC-L-04 | Declined authorization handling | Customer clicks "Decline"; selects decline reason "cost_not_approved" | State → DECLINED; `consentRecord.decision = "decline"`, `declineReason = "cost_not_approved"` recorded; coordinator notified; WO state recomputes to `WO_AUTH_FULL_BLOCK` (pending coordinator action on declined item); mechanic cannot proceed on dependent task | WS15-L §4.7 |
| TC-L-05 | Expired token — denial | Customer clicks approval link after `notificationTokenExpiresAt` has passed | Returns error: "This authorization link has expired. Please contact your coordinator."; NO consent record written; existing request state unchanged; access attempt logged in audit | WS15-L §3.2 |
| TC-L-06 | Scope change — auto-supersede | Auth request APPROVED at cost range $450-$620; scope changes (new finding adds $800); `requestCustomerAuthorization` called again for same discrepancy | System detects prior APPROVED request; creates new request; links old → new via `supersededById`; old request transitions to `WITHDRAWN_SUPERSEDED`; WO gate recomputes to `WO_AUTH_PENDING` (new approval required); NO mutation on old request's consentRecord | WS15-L §4.6 |
| TC-L-07 | Audit trail verification — full lifecycle | Complete flow: draft → sent → viewed → approved; run evidence export query | All transitions present in `transitionLog` with actor, timestamp, reasonCode, policyVersion; `CUSTOMER_AUTHORIZATION_RECORDED` audit event hash verifiable against stored consentTextHash; export package includes rendered consent text snapshot; no gaps in event chain | WS15-L §6.2 |
| TC-L-08 | Assisted phone path — without witness blocked | `recordCustomerAuthorization` called with `decisionChannel = "assisted_phone"` and no `witnessCoordinatorId` | Mutation throws: "Assisted phone authorization requires a coordinator witness ID"; no consent record written | WS15-L §4.5 |

---

## 8. Marcus Webb — Compliance Checklist

### Applicable Regulations
- **14 CFR §91.403(a)** — Owner/operator responsibility for airworthiness; shop authorization documentation
- **15 U.S.C. §7001 (E-SIGN Act)** — Electronic signatures and records; click-to-approve constitutes valid electronic authorization
- **14 CFR Part 43 §43.9** — Maintenance records must reflect work performed; authorization documentation supports scope legitimacy
- **14 CFR Part 145 §145.213** — Work orders; repair station must obtain owner's authorization for work beyond original scope
- **UCC Article 2 / State Contract Law** — Authorization documentation supports enforceability of payment obligation

### Marcus Pre-Release Checklist

**HARD BLOCKERS — any one = NO-GO:**
- [ ] `DISC-AUTH-LIABILITY-MEMO-V1` signed by Marcus Webb before customer-facing approval surface deployed to production
- [ ] `consentRecord.consentTextHash` is verifiable against stored template version — the exact text presented to the customer must be reconstructable for any completed authorization; TC-L-07 passes with hash verification
- [ ] Auth requests in `SENT_PENDING_CUSTOMER` or `VIEWED_PENDING_CUSTOMER` state block work advancement — TC-L-01 passes via direct mutation test (not just UI test)
- [ ] Scope change triggers supersede (not in-place edit of prior approval) — TC-L-06 passes; prior APPROVED record's consentRecord is never modified
- [ ] `transitionLog` is append-only — no mutation updates or deletes existing log entries

**Standard Verification Items:**
- [ ] Authorization email template includes all required elements per §2.3: specific discrepancy description, estimated cost range, authorizing party identification prompt, consequence of decline stated
- [ ] "Customer approval = airworthiness determination" language is explicitly ABSENT from all templates; disclaimer states "technical release remains certificated personnel responsibility"
- [ ] Timeout policy (48h) and reminder policy (24h) operational and tested
- [ ] Assisted phone path structured and implemented per WS15-L §4.5 requirements
- [ ] Evidence export package produces PDF summary + machine-readable JSON for legal discovery requests
- [ ] Consent records retention: 7-year floor per §6.4 of WS15-L policy confirmed in data retention config
- [ ] Material scope change threshold (cost delta > configured amount or new safety-relevant finding) triggers re-authorization; threshold documented and configurable by org admin

---

## 9. Build Sequence

| Step | Component | Owner | Depends On |
|---|---|---|---|
| B1 | Schema: `discAuthRequests` table + indexes | Devraj | — |
| B2 | `requestCustomerAuthorization` mutation + internal dispatch | Devraj | B1 |
| B3 | Authorization email template (HTML + text) + dispatch infrastructure | Devraj | B2 |
| B4 | Customer-facing approval page (React, `recordCustomerAuthorization` call) | Chloe Park | B1 |
| B5 | `recordCustomerAuthorization` mutation with consent record capture | Devraj | B1 |
| B6 | `getAuthorizationStatus` query + WO derived auth state computation | Devraj | B1 |
| B7 | `enforceAuthorizationGate` integration into task-step mutations | Devraj | B5-B6 |
| B8 | 48-hour timeout cron + reminder email | Devraj | B2-B3 |
| B9 | Coordinator authorization queue view + pending-age indicators | Chloe Park | B6 |
| B10 | Assisted phone path UI + `witnessCoordinatorId` enforcement | Devraj + Chloe | B5 |
| B11 | Evidence export package (PDF + JSON) | Devraj | B5-B6 |
| B12 | Cilla test cases TC-L-01 through TC-L-08 | Cilla | B1-B11 |
| B13 | Danny Osei UAT sign-off | Danny | B3-B9 |
| B14 | Marcus Webb liability memo signature + compliance clearance | Marcus | B11 |

---

## 10. Release Blockers Summary

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | `DISC-AUTH-LIABILITY-MEMO-V1` signed by Marcus | Marcus Webb | ⬜ PENDING SIGNATURE |
| 2 | WS16-K portal build complete (approval cards in portal view) | WS16-K team | Dependency |
| 3 | TC-L-01 mechanic block enforcement via direct mutation test | Cilla | ⬜ Not run |
| 4 | TC-L-07 audit trail hash verification | Cilla | ⬜ Not run |
| 5 | TC-L-06 scope change supersede (not in-place edit) | Cilla | ⬜ Not run |
| 6 | Danny Osei UAT sign-off | Danny | ⬜ Not run |

---

## 11. Execution Checklist

- [ ] `discAuthRequests` schema migration written and reviewed
- [ ] `requestCustomerAuthorization` mutation written and unit-tested
- [ ] Authorization email template approved by Marcus (pre-signature, template review can start immediately)
- [ ] Customer-facing approval page built and accessible via token URL
- [ ] `recordCustomerAuthorization` mutation written with full consent record capture
- [ ] IP address capture integrated at HTTP layer (not at mutation layer — passed in from API handler)
- [ ] `enforceAuthorizationGate` integrated into all applicable task-step mutations
- [ ] 48-hour timeout cron written and tested with time simulation
- [ ] 24-hour reminder email implemented
- [ ] Assisted phone path implemented with coordinator witness requirement
- [ ] Evidence export package produces PDF + JSON
- [ ] All 8 TC-L test cases passing
- [ ] Marcus memo signed and compliance checklist complete
- [ ] Danny UAT sign-off attached
- [ ] WS16-M hash manifest includes consent record hashes and transition event chain

---

*Filed: 2026-02-22 | Phase 16 depth pass | Athelon WS16-L*
*Source: phase-15-rd/ws15-l-disc-auth.md*
*Memo pending: DISC-AUTH-LIABILITY-MEMO-V1 — Marcus Webb*
*Production deployment of customer-facing surface gated on memo signature*
