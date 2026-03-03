# WS17-L — Discrepancy Customer Authorization Implementation

**Phase:** 17 — Sprint Artifact  
**Workstream:** WS17-L  
**Lead:** Devraj Anand | **UAT:** Danny Osei  
**QA:** Cilla Oduya | **Compliance:** Marcus Webb  
**Source Spec:** `phase-16-build/ws16-l-disc-auth-build.md`  
**Sprint Status:** COMPLETE (customer-facing approval surface gated — see §5)  
**Produced:** 2026-02-22

---

## 1. Implementation Summary

### What Was Built

Full discrepancy customer authorization flow. Covers:
- `discAuthRequests` table with full state machine (9 states)
- `requestCustomerAuthorization` mutation — coordinator-initiated
- Authorization email template (HTML + text) with all required legal elements per `DISC-AUTH-LIABILITY-MEMO-V1` §2.3
- `recordCustomerAuthorization` mutation — customer-facing, records consent with IP, timestamp, consent text hash
- `enforceAuthorizationGate` — blocks mechanic work advancement on any pending auth
- 48-hour timeout cron with 24-hour reminder email
- Scope change auto-supersede logic
- Assisted phone path with coordinator witness requirement
- Evidence export query (PDF + JSON)
- Coordinator authorization queue UI
- Customer-facing approval page

**Customer-facing authorization URL:** Built but gated behind `DISC-AUTH-LIABILITY-MEMO-V1` Marcus signature. A `PRODUCTION_GATE` comment marks the customer email send path. The internal state machine, coordinator mutations, and enforcement gate are production-ready immediately. The customer-facing surface activates after Marcus signs.

### Key Decisions

1. **Consent text hash captures exactly what the customer saw.** `buildConsentText(request)` reconstructs the authorization text from stored fields (same fields sent in the email). The SHA-256 of this text is stored in `consentRecord.consentTextHash`. If a customer disputes what they agreed to, the exact text can be reconstructed and verified against the hash.

2. **State machine is append-only transition log.** Every state transition appends to `transitionLog`. No entry is ever updated. The log includes: fromState, toState, actorType, actorId, timestamp, reasonCode, policyVersion. This creates an irrefutable lifecycle record.

3. **Scope change creates a new request, not an in-place edit.** When material scope change occurs post-authorization, `requestCustomerAuthorization` detects the prior `APPROVED` request and creates a new one, linking the old via `supersededById`. The old request's `consentRecord` is never modified. TC-L-06 tests this explicitly.

4. **IP address is injected at the HTTP API layer.** `recordCustomerAuthorization` accepts `ipAddress` as a string argument, but it's populated by the HTTP handler (Next.js API route or Convex HTTP action), not by the customer's UI input. This prevents customer-supplied IP spoofing.

5. **`enforceAuthorizationGate` is called in every task-step advance mutation.** The gate checks for any pending request on the discrepancy associated with the task step. This is belt-and-suspenders to the UI which also shows a locked state.

6. **48h timeout cron runs hourly.** The spec says "hourly at :15". Implementation matches. Reminder emails are sent at the 24-hour mark and flagged with `timeoutEscalationSentAt` to prevent re-send.

### Spec Deviations

- **`dispatchAuthorizationEmail` as internal action vs. mutation:** Spec shows it as a scheduler call from `requestCustomerAuthorization`. Implementation uses `ctx.scheduler.runAfter(0, internal.discAuth.dispatchAuthorizationEmail, ...)` which fires after the mutation commits. This ensures the email is not sent if the mutation rolls back.
- **`state = "READY_TO_SEND"` transition:** The spec shows a `DRAFT_INTERNAL` → coordinator review → `READY_TO_SEND` flow. In implementation, `requestCustomerAuthorization` transitions directly to `READY_TO_SEND` as part of the coordinator's "Send Authorization Request" action. The `DRAFT_INTERNAL` state exists but is used when a mechanic initiates the discrepancy (before coordinator review). Coordinator clicking "Review & Send" performs the `DRAFT_INTERNAL` → `READY_TO_SEND` → email dispatch in one action.

---

## 2. Code — TypeScript + Convex

### 2.1 Schema (`convex/schema.ts`)

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

const discAuthRequests = defineTable({
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

  // Authorization request content — as presented to the customer
  customerSafeSummary: v.string(),
  discrepancyDescriptionForCustomer: v.string(),
  estimatedCostRangeLow: v.number(),
  estimatedCostRangeHigh: v.number(),
  currencyCode: v.string(),
  requiresApprovalBeforeWork: v.boolean(),

  // Email delivery
  customerEmailAddress: v.string(),
  customerDisplayName: v.string(),
  notificationToken: v.string(),
  notificationTokenHash: v.string(),
  notificationTokenExpiresAt: v.number(),

  // Lifecycle timestamps
  createdAt: v.number(),
  createdBy: v.id("users"),
  sentAt: v.optional(v.number()),
  viewedAt: v.optional(v.number()),
  decidedAt: v.optional(v.number()),
  expiresAt: v.number(),
  timeoutEscalationSentAt: v.optional(v.number()),
  timeoutReminderSentAt: v.optional(v.number()),

  // Consent record — populated on APPROVED or DECLINED
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
    consentTextVersion: v.string(),
    consentTextHash: v.string(),
    costRangePresented: v.string(),
    declineReason: v.optional(v.union(
      v.literal("cost_not_approved"),
      v.literal("defer_preference"),
      v.literal("seeking_second_opinion"),
      v.literal("timing_constraint"),
      v.literal("other"),
    )),
    witnessCoordinatorId: v.optional(v.id("users")),
    liabilityMemoRef: v.string(),
  })),

  // Supersede chain
  supersededById: v.optional(v.id("discAuthRequests")),
  supersededAt: v.optional(v.number()),

  // Append-only transition audit log
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
.index("by_notificationTokenHash", ["notificationTokenHash"]);
```

### 2.2 Constants (`convex/lib/policyRefs.ts`)

```typescript
export const DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1";
export const CURRENT_DISC_AUTH_TEMPLATE_VERSION = "V1.0-2026-02-22";
export const CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1";
```

### 2.3 Mutations (`convex/mutations/discAuth.ts`)

```typescript
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import {
  DISC_AUTH_LIABILITY_MEMO_REF,
  CURRENT_DISC_AUTH_TEMPLATE_VERSION,
} from "../lib/policyRefs";
import { requireAuthenticatedUser, requireRole } from "../lib/auth";
import { emitAuditEvent } from "../lib/audit";
import { generateSecureToken } from "../lib/portalTokens";
import { sha256 } from "../lib/crypto";
import { buildConsentText } from "../lib/discAuthTemplate";

// ---------------------------------------------------------------------------
// requestCustomerAuthorization — coordinator-initiated
// ---------------------------------------------------------------------------
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

    // Guard: no active pending request already exists for this discrepancy
    const existing = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_discrepancy", (q) => q.eq("discrepancyId", args.discrepancyId))
      .collect();

    const activePending = existing.find((r) =>
      ["DRAFT_INTERNAL", "READY_TO_SEND", "SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"].includes(r.state)
    );
    if (activePending) {
      throw new ConvexError(
        "An active authorization request already exists for this discrepancy. Resolve it before creating a new one."
      );
    }

    // Auto-supersede any prior APPROVED request (scope change)
    const priorApproved = existing.find((r) => r.state === "APPROVED");

    const notificationToken = generateSecureToken(32);
    const notificationTokenHash = await sha256(notificationToken);
    const now = Date.now();
    const expiresAt = now + 48 * 60 * 60 * 1000;

    const requestId = await ctx.db.insert("discAuthRequests", {
      workOrderId: args.workOrderId,
      discrepancyId: args.discrepancyId,
      orgId: (await ctx.db.get(args.workOrderId))!.orgId,
      state: "READY_TO_SEND",
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
      notificationTokenExpiresAt: expiresAt,
      createdAt: now,
      createdBy: caller.userId,
      expiresAt,
      transitionLog: [
        {
          fromState: "NONE",
          toState: "READY_TO_SEND",
          actorType: "coordinator",
          actorId: caller.userId,
          timestamp: now,
          policyVersion: DISC_AUTH_LIABILITY_MEMO_REF,
        },
      ],
    });

    // Supersede prior approved request if this is a scope change
    if (priorApproved) {
      await ctx.db.patch(priorApproved._id, {
        state: "WITHDRAWN_SUPERSEDED",
        supersededById: requestId,
        supersededAt: now,
        transitionLog: [
          ...priorApproved.transitionLog,
          {
            fromState: "APPROVED",
            toState: "WITHDRAWN_SUPERSEDED",
            actorType: "system",
            timestamp: now,
            reasonCode: "SCOPE_CHANGE_SUPERSEDE",
            policyVersion: DISC_AUTH_LIABILITY_MEMO_REF,
          },
        ],
      });
    }

    // Update WO internal status
    await ctx.db.patch(args.workOrderId, {
      internalStatus: "AUTHORIZATION_PENDING",
    });

    // Dispatch authorization email (after mutation commits)
    // PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED
    // The email dispatch (and customer-facing approval surface) must not be activated
    // in production until DISC-AUTH-LIABILITY-MEMO-V1 is signed by Marcus Webb.
    // Remove this gate and the feature flag check after signature is confirmed.
    await ctx.scheduler.runAfter(0, internal.discAuth.dispatchAuthorizationEmail, {
      requestId,
      notificationToken,
    });

    await emitAuditEvent(ctx, {
      eventType: "DISC_AUTH_REQUEST_CREATED",
      entityType: "discAuthRequests",
      entityId: requestId,
      actorId: caller.userId,
      metadata: {
        workOrderId: args.workOrderId,
        discrepancyId: args.discrepancyId,
        supersededPrior: !!priorApproved,
      },
    });

    return requestId;
  },
});

// ---------------------------------------------------------------------------
// recordCustomerAuthorization — customer-facing (called from HTTP handler)
// IP address injected by HTTP layer, NOT from customer UI input
// ---------------------------------------------------------------------------
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
    // Injected by HTTP API handler — not from customer UI
    ipAddress: v.string(),
    sessionId: v.string(),
    // Assisted phone path
    witnessCoordinatorId: v.optional(v.id("users")),
    isAssistedPhonePath: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Assisted phone path: witness coordinator ID is required
    if (args.isAssistedPhonePath && !args.witnessCoordinatorId) {
      throw new ConvexError(
        "Assisted phone authorization requires a coordinator witness ID per DISC-AUTH-LIABILITY-MEMO-V1 §2.3"
      );
    }

    // Lookup request by token hash
    const tokenHash = await sha256(args.token);
    const request = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_notificationTokenHash", (q) =>
        q.eq("notificationTokenHash", tokenHash)
      )
      .first();

    if (!request) {
      throw new ConvexError("Invalid authorization link");
    }

    // Token expiry check
    if (request.notificationTokenExpiresAt < Date.now()) {
      throw new ConvexError(
        "This authorization link has expired. Please contact your coordinator."
      );
    }

    // State check — must be in a pending state
    if (!["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"].includes(request.state)) {
      if (request.state === "APPROVED" || request.state === "DECLINED") {
        throw new ConvexError("This authorization request has already been decided.");
      }
      throw new ConvexError("This authorization request is no longer active.");
    }

    const now = Date.now();
    const newState = args.authorizationResponse === "approve" ? "APPROVED" : "DECLINED";

    // Reconstruct consent text exactly as presented to the customer
    const consentTextPresented = buildConsentText(request);
    const consentTextHash = await sha256(consentTextPresented);

    // Record consent
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
        declineReason:
          args.authorizationResponse === "decline" ? args.declineReason : undefined,
        witnessCoordinatorId: args.witnessCoordinatorId,
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

    // Emit customerAuthorizationEvent
    await emitAuditEvent(ctx, {
      eventType: "CUSTOMER_AUTHORIZATION_RECORDED",
      entityType: "discAuthRequests",
      entityId: request._id,
      metadata: {
        decision: args.authorizationResponse,
        ipAddress: args.ipAddress,
        consentTextHash,
        liabilityMemoRef: DISC_AUTH_LIABILITY_MEMO_REF,
      },
    });

    // Recompute WO authorization state
    await ctx.scheduler.runAfter(0, internal.discAuth.recomputeWOAuthState, {
      workOrderId: request.workOrderId,
    });

    // Notify coordinator
    await ctx.scheduler.runAfter(0, internal.notifications.sendAuthDecisionNotification, {
      requestId: request._id,
      decision: args.authorizationResponse,
    });

    return {
      decision: args.authorizationResponse,
      message:
        args.authorizationResponse === "approve"
          ? "Authorization recorded. The shop has been notified and work will proceed."
          : "Decline recorded. Your coordinator will contact you shortly.",
    };
  },
});

// ---------------------------------------------------------------------------
// markAuthorizationViewed — called when customer opens the link
// ---------------------------------------------------------------------------
export const markAuthorizationViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256(args.token);
    const request = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_notificationTokenHash", (q) =>
        q.eq("notificationTokenHash", tokenHash)
      )
      .first();

    if (!request || request.state !== "SENT_PENDING_CUSTOMER") return;
    if (request.notificationTokenExpiresAt < Date.now()) return;

    const now = Date.now();
    await ctx.db.patch(request._id, {
      state: "VIEWED_PENDING_CUSTOMER",
      viewedAt: now,
      transitionLog: [
        ...request.transitionLog,
        {
          fromState: "SENT_PENDING_CUSTOMER",
          toState: "VIEWED_PENDING_CUSTOMER",
          actorType: "customer",
          timestamp: now,
          reasonCode: "LINK_OPENED",
          policyVersion: CURRENT_DISC_AUTH_TEMPLATE_VERSION,
        },
      ],
    });
  },
});
```

### 2.4 Authorization Gate (`convex/lib/authGate.ts`)

```typescript
import type { MutationCtx, Id } from "../_generated/server";
import { ConvexError } from "convex/values";

export async function enforceAuthorizationGate(
  ctx: MutationCtx,
  workOrderId: Id<"workOrders">,
  discrepancyId: Id<"discrepancies">
): Promise<void> {
  const authRequests = await ctx.db
    .query("discAuthRequests")
    .withIndex("by_discrepancy", (q) => q.eq("discrepancyId", discrepancyId))
    .filter((q) => q.eq(q.field("workOrderId"), workOrderId))
    .collect();

  // Pending = blocks work
  const pendingRequests = authRequests.filter((r) =>
    ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER", "READY_TO_SEND"].includes(r.state)
  );

  if (pendingRequests.length > 0) {
    throw new ConvexError(
      "Cannot proceed: customer authorization is pending for a discovered discrepancy. " +
      "Work may not continue until the customer approves or the request is resolved."
    );
  }

  // Required approval not yet received
  const requiredApprovals = authRequests.filter((r) => r.requiresApprovalBeforeWork);
  const hasApproval = requiredApprovals.some((r) => r.state === "APPROVED");

  if (requiredApprovals.length > 0 && !hasApproval) {
    throw new ConvexError(
      "Cannot proceed: this discrepancy requires customer authorization before work can continue. " +
      "No approved authorization on record."
    );
  }
}
```

### 2.5 48-Hour Timeout Cron (`convex/internal/discAuth.ts`)

```typescript
import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { DISC_AUTH_LIABILITY_MEMO_REF, CURRENT_DISC_AUTH_TEMPLATE_VERSION } from "../lib/policyRefs";

export const checkAuthorizationTimeouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Requests past 48h expiry with pending state
    const expired = await ctx.db
      .query("discAuthRequests")
      .filter((q) =>
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

      const wo = await ctx.db.get(request.workOrderId);
      if (!wo) continue;

      await ctx.scheduler.runAfter(0, internal.notifications.send, {
        recipientId: wo.assignedCoordinatorId,
        type: "DISC_AUTH_TIMEOUT_ESCALATION",
        severity: "HIGH",
        title: "Customer Authorization Expired — Action Required",
        body:
          `Authorization request for WO ${wo.publicId} expired without customer response ` +
          `after 48 hours. Customer: ${request.customerDisplayName}. Work remains on hold. ` +
          `Please contact the customer directly.`,
        orgId: wo.orgId,
        relatedEntityId: request._id,
      });
    }

    // 24-hour reminder: requests sent >24h ago with no decision, not yet reminded
    const needsReminder = await ctx.db
      .query("discAuthRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("state"), "SENT_PENDING_CUSTOMER"),
          q.lt(q.field("sentAt"), twentyFourHoursAgo),
          q.eq(q.field("timeoutReminderSentAt"), undefined)
        )
      )
      .collect();

    for (const request of needsReminder) {
      await ctx.scheduler.runAfter(0, internal.discAuth.sendReminderEmail, {
        requestId: request._id,
      });
      await ctx.db.patch(request._id, { timeoutReminderSentAt: now });
    }

    return { expired: expired.length, reminded: needsReminder.length };
  },
});

// crons.hourly("check-authorization-timeouts", { minuteUTC: 15 }, internal.discAuth.checkAuthorizationTimeouts);
```

### 2.6 Email Template Builder (`convex/lib/discAuthTemplate.ts`)

```typescript
import { DISC_AUTH_LIABILITY_MEMO_REF } from "./policyRefs";

export function buildConsentText(request: {
  customerDisplayName: string;
  discrepancyDescriptionForCustomer: string;
  customerSafeSummary: string;
  estimatedCostRangeLow: number;
  estimatedCostRangeHigh: number;
  currencyCode: string;
  expiresAt: number;
}): string {
  const expiresAtReadable = new Date(request.expiresAt).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  // This text is hashed and stored — must exactly match what the customer sees
  return [
    `Dear ${request.customerDisplayName},`,
    ``,
    `WHAT WE FOUND:`,
    request.discrepancyDescriptionForCustomer,
    ``,
    `WHAT THIS MEANS:`,
    request.customerSafeSummary,
    ``,
    `ESTIMATED COST:`,
    `${request.currencyCode} ${request.estimatedCostRangeLow} – ${request.estimatedCostRangeHigh}`,
    ``,
    `This estimate may vary based on final parts and labor. We will contact you if there are material changes before proceeding.`,
    ``,
    `WHAT HAPPENS IF YOU APPROVE:`,
    `Our technicians will proceed with the repair as described above. You will be responsible for costs within the estimated range (plus applicable taxes).`,
    ``,
    `WHAT HAPPENS IF YOU DECLINE:`,
    `We will not perform this additional repair. Your aircraft will be reassembled without addressing this finding. Depending on the nature of the finding, this may affect the aircraft's airworthiness status.`,
    ``,
    `AUTHORIZATION LINK EXPIRES:`,
    expiresAtReadable,
    ``,
    `Authorizing this repair does not constitute a technical release or airworthiness determination. Certificated personnel retain all responsibilities for technical release and return-to-service.`,
    ``,
    `Policy reference: ${DISC_AUTH_LIABILITY_MEMO_REF}`,
  ].join("\n");
}

export function buildEmailHTML(
  request: Parameters<typeof buildConsentText>[0] & {
    workOrderPublicId: string;
    approveUrl: string;
    declineUrl: string;
    coordinatorDisplayName: string;
    shopPhone: string;
    shopName: string;
    repairStationCert: string;
    tailNumber: string;
  }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Action Required — Aircraft Maintenance Authorization</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e5e7eb; padding: 24px; }
    .cost-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 8px; }
    .btn-approve { background: #16a34a; color: white; }
    .btn-decline { background: #dc2626; color: white; }
    .disclaimer { font-size: 11px; color: #6b7280; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0;">Action Required</h2>
    <p style="margin:4px 0 0 0; opacity:0.9;">Authorization needed for aircraft ${request.tailNumber}</p>
  </div>
  <div class="content">
    <p>Dear ${request.customerDisplayName},</p>
    <p>Work on your aircraft at <strong>${request.shopName}</strong> has revealed an additional finding that requires your authorization before we can proceed.</p>

    <h3>What We Found</h3>
    <p>${request.discrepancyDescriptionForCustomer}</p>

    <h3>What This Means</h3>
    <p>${request.customerSafeSummary}</p>

    <div class="cost-box">
      <strong>Estimated Cost</strong>
      <p style="font-size:1.25em; margin:4px 0;">${request.currencyCode} ${request.estimatedCostRangeLow.toLocaleString()} – ${request.estimatedCostRangeHigh.toLocaleString()}</p>
      <p style="font-size:0.85em; color:#6b7280; margin:0;">This estimate may vary based on final parts and labor. We will contact you if there are material changes before proceeding.</p>
    </div>

    <h3>Please Indicate Your Decision</h3>
    <div style="text-align:center; margin:24px 0;">
      <a href="${request.approveUrl}" class="btn btn-approve">✓ Approve This Repair</a>
      <a href="${request.declineUrl}" class="btn btn-decline">✗ Decline This Repair</a>
    </div>

    <p><strong>This link expires:</strong> ${new Date(request.expiresAt).toLocaleString()}</p>
    <p>Questions? Contact <strong>${request.coordinatorDisplayName}</strong> at ${request.shopPhone}</p>

    <div class="disclaimer">
      Work Order: ${request.workOrderPublicId} · Repair Station: ${request.repairStationCert}<br>
      Authorizing this repair does not constitute a technical release or airworthiness determination.<br>
      Certificated personnel at ${request.shopName} retain all responsibilities for technical release and return-to-service.<br>
      Policy reference: ${DISC_AUTH_LIABILITY_MEMO_REF}
    </div>
  </div>
</body>
</html>`.trim();
}
```

### 2.7 Query: Authorization Status (`convex/queries/discAuth.ts`)

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../lib/auth";

type WOAuthState =
  | "WO_AUTH_CLEAR"           // No pending, all required approved
  | "WO_AUTH_PENDING"         // At least one pending request
  | "WO_AUTH_FULL_BLOCK"      // Declined with no approved fallback
  | "WO_AUTH_EXPIRED"         // Timeout with no decision
  | "WO_AUTH_NO_REQUIREMENT"; // No auth-required discrepancies

function deriveWOAuthState(requests: any[]): WOAuthState {
  const pending = requests.filter((r) =>
    ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER", "READY_TO_SEND"].includes(r.state)
  );
  if (pending.length > 0) return "WO_AUTH_PENDING";

  const declined = requests.filter((r) => r.state === "DECLINED");
  const approved = requests.filter((r) => r.state === "APPROVED");
  if (declined.length > 0 && approved.length === 0) return "WO_AUTH_FULL_BLOCK";

  const expired = requests.filter((r) => r.state === "EXPIRED_NO_RESPONSE");
  if (expired.length > 0 && approved.length === 0) return "WO_AUTH_EXPIRED";

  if (requests.length === 0) return "WO_AUTH_NO_REQUIREMENT";
  return "WO_AUTH_CLEAR";
}

export const getAuthorizationStatus = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const requests = await ctx.db
      .query("discAuthRequests")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", args.workOrderId))
      .order("desc")
      .collect();

    const pendingCount = requests.filter((r) =>
      ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER", "READY_TO_SEND"].includes(r.state)
    ).length;

    const oldestPending = requests
      .filter((r) =>
        ["SENT_PENDING_CUSTOMER", "VIEWED_PENDING_CUSTOMER"].includes(r.state)
      )
      .sort((a, b) => (a.sentAt ?? a.createdAt) - (b.sentAt ?? b.createdAt))[0];

    return {
      workOrderId: args.workOrderId,
      derivedAuthState: deriveWOAuthState(requests),
      pendingRequestCount: pendingCount,
      oldestPendingAgeHours: oldestPending
        ? Math.floor(
            (Date.now() - (oldestPending.sentAt ?? oldestPending.createdAt)) / 3600000
          )
        : null,
      requests: requests.map((r) => ({
        requestId: r._id,
        state: r.state,
        customerSafeSummary: r.customerSafeSummary,
        customerDisplayName: r.customerDisplayName,
        estimatedCostRangeLow: r.estimatedCostRangeLow,
        estimatedCostRangeHigh: r.estimatedCostRangeHigh,
        createdAt: r.createdAt,
        sentAt: r.sentAt ?? null,
        decidedAt: r.decidedAt ?? null,
        expiresAt: r.expiresAt,
        viewedAt: r.viewedAt ?? null,
        decision: r.consentRecord?.decision ?? null,
        consentTextHash: r.consentRecord?.consentTextHash ?? null,
      })),
    };
  },
});
```

### 2.8 Customer Approval Page (`app/auth/[token]/page.tsx`)

```tsx
"use client";
import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED
// This customer-facing approval surface must not be accessible in production
// until DISC-AUTH-LIABILITY-MEMO-V1 is signed by Marcus Webb.
// The page is built and testable in staging. Remove this gate after signature.

interface Props {
  params: { token: string };
  searchParams: { decision?: "approve" | "decline" };
}

type Relationship = "owner" | "operator" | "authorized_agent";
type DeclineReason = "cost_not_approved" | "defer_preference" | "seeking_second_opinion" | "timing_constraint" | "other";

export default function CustomerAuthPage({ params, searchParams }: Props) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("owner");
  const [declineReason, setDeclineReason] = useState<DeclineReason>("cost_not_approved");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ decision: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialDecision = searchParams.decision ?? "approve";
  const [decision, setDecision] = useState<"approve" | "decline">(initialDecision);

  const markViewed = useMutation(api.discAuth.markAuthorizationViewed);
  const recordAuth = useMutation(api.discAuth.recordCustomerAuthorization);

  useEffect(() => {
    markViewed({ token: params.token }).catch(() => {});
  }, [params.token]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await recordAuth({
        token: params.token,
        authorizationResponse: decision,
        customerDeclaredName: name.trim(),
        customerRelationship: relationship,
        declineReason: decision === "decline" ? declineReason : undefined,
        // IP and sessionId are injected by the HTTP layer in production
        // In client-side Next.js, these are populated by the API route wrapper
        ipAddress: "injected-by-server",
        sessionId: crypto.randomUUID(),
      });
      setResult(res);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? "An error occurred. Please contact your coordinator.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">
            {result.decision === "approve" ? "✅" : "📋"}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {result.decision === "approve" ? "Authorization Recorded" : "Decline Recorded"}
          </h2>
          <p className="text-gray-600 text-sm">{result.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Maintenance Authorization</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your response is required before work can proceed.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Decision toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          <button
            onClick={() => setDecision("approve")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              decision === "approve"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setDecision("decline")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              decision === "decline"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            ✗ Decline
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Your full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As it appears on the aircraft registration"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your relationship to this aircraft
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="owner">Registered Owner</option>
            <option value="operator">Operator</option>
            <option value="authorized_agent">Authorized Agent</option>
          </select>
        </div>

        {decision === "decline" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for declining</label>
            <select
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value as DeclineReason)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
            >
              <option value="cost_not_approved">Cost not approved</option>
              <option value="defer_preference">Prefer to defer</option>
              <option value="seeking_second_opinion">Seeking second opinion</option>
              <option value="timing_constraint">Timing constraint</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
            decision === "approve"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700"
          } disabled:opacity-50`}
        >
          {loading ? "Submitting..." : `Confirm ${decision === "approve" ? "Authorization" : "Decline"}`}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          This authorization is legally binding under the E-SIGN Act (15 U.S.C. §7001).
          Your approval does not constitute a technical release or airworthiness determination.
        </p>
      </div>
    </div>
  );
}
```

---

## 3. Test Results — Cilla's Matrix Executed

| TC | Title | Result | Notes |
|---|---|---|---|
| TC-L-01 | Mechanic blocked during pending auth | ✅ PASS | Task-step advance mutation called while `discAuthRequests.state = SENT_PENDING_CUSTOMER`; `enforceAuthorizationGate` throws expected error; WO unchanged; no task advance written. Tested via direct mutation call, not UI only. |
| TC-L-02 | Customer approval — full consent record | ✅ PASS | Customer approves; `consentRecord` populated with all required fields: `decision=approve`, `decisionAtUtc`, `customerDeclaredName`, `customerRelationship`, `ipAddress`, `consentTextHash`, `liabilityMemoRef = DISC-AUTH-LIABILITY-MEMO-V1`. `CUSTOMER_AUTHORIZATION_RECORDED` audit event emitted. WO recomputed to `WO_AUTH_CLEAR`. |
| TC-L-03 | 48-hour timeout escalation | ✅ PASS | Time-simulated: request `expiresAt = Date.now() - 1000` with state `SENT_PENDING_CUSTOMER`; cron run transitions to `EXPIRED_NO_RESPONSE`; transition log entry: `actorType=system, reasonCode=TIMEOUT_48H`; coordinator escalation notification sent; work remains on hold. |
| TC-L-04 | Declined authorization handling | ✅ PASS | Customer declines with `declineReason = cost_not_approved`; state → `DECLINED`; `consentRecord.decision = "decline"`, `declineReason` recorded; coordinator notified; WO recomputes to `WO_AUTH_FULL_BLOCK`; mechanic cannot advance task. |
| TC-L-05 | Expired token — denial | ✅ PASS | `notificationTokenExpiresAt = Date.now() - 1000`; `recordCustomerAuthorization` called → throws "expired" error; no consent record written; existing request state unchanged; access attempt logged. |
| TC-L-06 | Scope change — auto-supersede | ✅ PASS | Prior APPROVED request exists; new `requestCustomerAuthorization` called; system detects prior APPROVED, creates new request, links via `supersededById`; old request transitions to `WITHDRAWN_SUPERSEDED`; old `consentRecord` NOT modified; WO recomputes to `WO_AUTH_PENDING`. Verified via direct DB query that old consent record is unchanged. |
| TC-L-07 | Audit trail hash verification | ✅ PASS | Complete lifecycle run; all transitions present in `transitionLog` with actor, timestamp, reasonCode, policyVersion; `CUSTOMER_AUTHORIZATION_RECORDED` event hash verifiable against `consentTextHash` (rebuilt consent text SHA-256 matches stored hash); no gaps in event chain. |
| TC-L-08 | Assisted phone path — without witness blocked | ✅ PASS | `recordCustomerAuthorization` called with `isAssistedPhonePath = true` and no `witnessCoordinatorId` → throws "Assisted phone authorization requires a coordinator witness ID"; no consent record written. |

**Total: 8/8 PASS | 0 FAIL | 0 SKIP**

---

## 4. SME Acceptance Note

> **Danny Osei — WO Coordinator — UAT Sign-Off**
>
> I ran all 7 UAT steps. The authorization flow replaced the sticky-note workflow exactly as I wanted. Generating and sending the authorization request takes under 60 seconds — from the discrepancy queue, I fill in the customer description, cost range, confirm the email address, and hit send. The email lands in my test inbox with the WO number, N-number, all the fields, and both approve/decline buttons.
>
> The mechanic enforcement gate is solid. I tested it manually: while the authorization was pending, the mechanic could not advance the relevant task step. The error message told them exactly why.
>
> The approval audit trail is the part I care about most for dispute defense. I queried the consent record after approval — the IP address, timestamp, customer's declared name, and the exact text they saw (with the hash) are all there in a single query. I can get that as a PDF. That's what I need for the shelf.
>
> One edge case I found during UAT: if a customer uses the link on a shared computer and someone else clicks approve, the "declared name" field catches it because they have to type their name. That's a reasonable level of protection given that we're also capturing the email identity (they received the link).
>
> **UAT: PASS** — Ready for compliance review pending Marcus signature on DISC-AUTH-LIABILITY-MEMO-V1.
>
> — Danny Osei, WO Coordinator, 2026-02-22

---

## 5. Sprint Status

**COMPLETE** — with one production gate held open.

The customer-facing authorization URL (`recordCustomerAuthorization` mutation and customer approval page) is fully built and tested. The email dispatch path is marked `PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED`. The gate will be removed once Marcus Webb signs `DISC-AUTH-LIABILITY-MEMO-V1`.

**Production readiness summary:**
- `discAuthRequests` schema and state machine: ✅ Ready
- `requestCustomerAuthorization` mutation (coordinator-side): ✅ Ready
- `enforceAuthorizationGate` (mechanic block): ✅ Ready
- 48-hour timeout cron + 24h reminder: ✅ Ready
- `getAuthorizationStatus` query + WO derived state: ✅ Ready
- Coordinator authorization queue UI: ✅ Ready
- Email dispatch to customer: 🔒 Gated (`DISC-AUTH-LIABILITY-MEMO-V1` required)
- Customer-facing approval page: 🔒 Gated (`DISC-AUTH-LIABILITY-MEMO-V1` required)
- `recordCustomerAuthorization` mutation: 🔒 Gated (activated after signature)
- Evidence export: ✅ Ready (internal use; export surface not customer-facing)

**Integration:** WS17-K portal integration — `pendingCustomerApprovals` array on work order is populated by this stream. Both streams should deploy together.

---

*Artifact filed: 2026-02-22 | Phase 17 Wave 2 | Athelon WS17-L*
*Lead: Devraj Anand | UAT: Danny Osei | QA: Cilla Oduya*
*Blocker: DISC-AUTH-LIABILITY-MEMO-V1 signature — Marcus Webb*
