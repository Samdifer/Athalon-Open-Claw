# WS16-K — Customer Portal Build (FULL DEPTH)

**Phase:** 16
**Workstream:** WS16-K
**Owners:** Chloe Park (Frontend) + Finn Calloway (UX) + Danny Osei (UAT) + Carla Ostrowski (UAT/DOM)
**QA:** Cilla Oduya
**Depends on:** `phase-15-rd/ws15-g-customer-portal.md` · WS16-C PDF/export build · WS16-L discrepancy auth flow
**Status: READY FOR BUILD**
**Note: No Marcus compliance review required (non-regulatory feature)**

---

## 1. Context

Danny Osei (WO Coordinator) handles approximately 10 inbound "is my plane done?" calls per day. These calls are almost entirely status-seeking — the customer wants one piece of information that the coordinator already has but can't efficiently share. The portal eliminates this call loop.

Carla Ostrowski (DOM) has one overriding concern: internal technical status, certificate workflow details, and regulatory sign-off language must never appear in the customer view. Customer-facing language is a liability surface. She also requires that the coordinator explicitly set customer status — internal status must never auto-mirror to the customer view, because internal state labels contain technical and legal language that is not safe for customer consumption.

The resolution: **two independent status tracks**. The coordinator is the human bridge between them. The system never assumes they should be the same.

**Phase 15 carry-forward controls:**
1. Fail-closed on pending-signature ambiguity — portal cannot project "Ready for Pickup" while any sign-off is unresolved.
2. Internal auth/qualification controls are upstream truth — portal never contradicts them.
3. Hash-manifest verification for customer-visible state transitions.
4. No compliance wording drift — forbidden phrase validator enforced server-side.

---

## 2. Two-Status-Model Architecture

### 2.1 `internalStatus` — Technical, All States (Coordinator/Mechanic Facing)

The full canonical internal state machine. Never shown to customer.

```typescript
type InternalStatus =
  | "WO_CREATED"
  | "ARRIVAL_PENDING"
  | "AIRCRAFT_RECEIVED"
  | "INTAKE_IN_PROGRESS"
  | "INSPECTION_IN_PROGRESS"
  | "DISCREPANCY_RECORDED"
  | "AUTHORIZATION_PENDING"        // WS16-L gate active
  | "PARTS_WAITING"
  | "MAINTENANCE_IN_PROGRESS"
  | "REASSEMBLY_IN_PROGRESS"
  | "GROUND_RUN_PENDING"
  | "GROUND_RUN_IN_PROGRESS"
  | "QA_QCM_REVIEW_PENDING"
  | "QA_QCM_REVIEW_IN_PROGRESS"
  | "RETURN_TO_SERVICE_PENDING_IA"
  | "RETURN_TO_SERVICE_SIGNED"
  | "CUSTOMER_RELEASE_PENDING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "ON_HOLD_CUSTOMER_REQUEST"
  | "AOG_ACTIVE"                   // Orthogonal urgency flag
  | "AOG_RECOVERY_IN_PROGRESS"
  | "CANCELLED";
```

### 2.2 `customerFacingStatus` — 7 Human-Readable Stages (Customer Facing)

```typescript
type CustomerFacingStatus =
  | "Awaiting Arrival"
  | "Received / Inspection Pending"
  | "Inspection In Progress"
  | "Discrepancy Authorization Required"
  | "Awaiting Parts"
  | "Work In Progress"
  | "Ready for Pickup";
```

**Critical architecture rule:** `customerFacingStatus` is a **separate field** on the `workOrders` table. It is set ONLY by an explicit coordinator mutation (`setCustomerFacingStatus`). Internal status transitions NEVER auto-update `customerFacingStatus`. The coordinator is the deliberate bridge.

### 2.3 Convex Schema Addition

```typescript
// Add to workOrders table:
customerFacingStatus: v.optional(v.union(
  v.literal("Awaiting Arrival"),
  v.literal("Received / Inspection Pending"),
  v.literal("Inspection In Progress"),
  v.literal("Discrepancy Authorization Required"),
  v.literal("Awaiting Parts"),
  v.literal("Work In Progress"),
  v.literal("Ready for Pickup"),
)),
customerFacingStatusUpdatedAt: v.optional(v.number()),
customerFacingStatusUpdatedBy: v.optional(v.id("users")),
customerFacingStatusHistory: v.array(v.object({
  status: v.string(),
  setAt: v.number(),
  setBy: v.id("users"),
  note: v.optional(v.string()),
})),
isAogActive: v.optional(v.boolean()),   // Orthogonal urgency flag

// Portal token reference
portalTokenId: v.optional(v.id("portalTokens")),
```

```typescript
// New table: portalTokens
portalTokens: defineTable({
  workOrderId: v.id("workOrders"),
  token: v.string(),              // Cryptographically signed, URL-safe
  tokenHash: v.string(),          // SHA-256 of token for lookup without storing plaintext
  createdAt: v.number(),
  createdBy: v.id("users"),
  expiresAt: v.number(),          // Default: 30 days post-delivery
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.id("users")),
  revokeReason: v.optional(v.string()),
  lastAccessedAt: v.optional(v.number()),
  accessCount: v.number(),
  orgId: v.id("organizations"),
})
.index("by_tokenHash", ["tokenHash"])
.index("by_workOrder", ["workOrderId"])
.index("by_org", ["orgId"]),
```

### 2.4 Carla's Conflict Resolution — Coordinator Must Explicitly Set Customer Status

```typescript
// convex/mutations/portal.ts

export const setCustomerFacingStatus = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    customerFacingStatus: v.union(/* all 7 literals */),
    note: v.optional(v.string()),   // Coordinator's note explaining the update
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    await requireRole(ctx, caller.userId, ["coordinator", "dom", "supervisor"]);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new ConvexError("Work order not found");

    // Safety gate: cannot set "Ready for Pickup" unless internalStatus confirms RTS is signed
    if (args.customerFacingStatus === "Ready for Pickup") {
      const rtsCompleted = [
        "RETURN_TO_SERVICE_SIGNED",
        "CUSTOMER_RELEASE_PENDING",
        "READY_FOR_PICKUP",
      ].includes(wo.internalStatus);

      if (!rtsCompleted) {
        throw new ConvexError(
          'Cannot set customer status to "Ready for Pickup" — internal RTS sign-off not yet complete'
        );
      }
    }

    const now = Date.now();
    const previousStatus = wo.customerFacingStatus;

    await ctx.db.patch(args.workOrderId, {
      customerFacingStatus: args.customerFacingStatus,
      customerFacingStatusUpdatedAt: now,
      customerFacingStatusUpdatedBy: caller.userId,
      customerFacingStatusHistory: [
        ...(wo.customerFacingStatusHistory ?? []),
        {
          status: args.customerFacingStatus,
          setAt: now,
          setBy: caller.userId,
          note: args.note,
        },
      ],
    });

    // Emit audit event
    await emitAuditEvent(ctx, {
      eventType: "CUSTOMER_STATUS_UPDATED",
      entityId: args.workOrderId,
      actorId: caller.userId,
      metadata: {
        previousStatus,
        newStatus: args.customerFacingStatus,
        note: args.note,
      },
    });

    return { updated: true, newStatus: args.customerFacingStatus };
  },
});
```

**What this enforces:** A coordinator who updates internal status from `INSPECTION_IN_PROGRESS` to `DISCREPANCY_RECORDED` does NOT automatically change what the customer sees. The coordinator must separately call `setCustomerFacingStatus` with `"Discrepancy Authorization Required"` when they're ready to communicate that to the customer. These are independent decisions.

---

## 3. Tokenized Read-Only Access

### 3.1 `generateCustomerPortalToken(workOrderId)`

Creates a time-limited signed token. Token is URL-safe and cryptographically random.

```typescript
export const generateCustomerPortalToken = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    expiresInDays: v.optional(v.number()),  // Default: 30 days post-delivery
  },
  handler: async (ctx, args) => {
    const caller = await requireAuthenticatedUser(ctx);
    await requireRole(ctx, caller.userId, ["coordinator", "dom"]);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new ConvexError("Work order not found");

    // Generate cryptographically random token
    const rawToken = generateSecureToken(32);  // 32 bytes = 256-bit entropy, base64url encoded
    const tokenHash = await sha256(rawToken);

    const now = Date.now();
    const defaultExpiry = getDeliveryDate(wo) + (30 * 24 * 60 * 60 * 1000);
    const expiresAt = args.expiresInDays
      ? now + (args.expiresInDays * 24 * 60 * 60 * 1000)
      : defaultExpiry;

    const tokenId = await ctx.db.insert("portalTokens", {
      workOrderId: args.workOrderId,
      token: rawToken,         // Returned to coordinator for sharing; not stored after this
      tokenHash,               // Stored for lookup; rawToken can be cleared after return
      createdAt: now,
      createdBy: caller.userId,
      expiresAt,
      accessCount: 0,
      orgId: wo.orgId,
    });

    await ctx.db.patch(args.workOrderId, { portalTokenId: tokenId });

    await emitAuditEvent(ctx, {
      eventType: "PORTAL_TOKEN_GENERATED",
      entityId: tokenId,
      actorId: caller.userId,
      metadata: { workOrderId: args.workOrderId, expiresAt },
    });

    // Return the raw token — this is the only time it's accessible
    // Coordinator copies the link: https://portal.athelon.app/wo/{rawToken}
    return {
      tokenId,
      portalUrl: `https://portal.athelon.app/wo/${rawToken}`,
      expiresAt,
    };
  },
});
```

### 3.2 `getPortalView(token)` — Returns Only Customer-Facing Fields

```typescript
export const getPortalView = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<CustomerPortalView | { error: string }> => {
    // 1. Look up token by hash
    const tokenHash = await sha256(args.token);
    const portalToken = await ctx.db
      .query("portalTokens")
      .withIndex("by_tokenHash", q => q.eq("tokenHash", tokenHash))
      .first();

    if (!portalToken) {
      return { error: "Invalid portal link. Please contact your coordinator for an updated link." };
    }

    // 2. Check expiry
    if (portalToken.expiresAt < Date.now()) {
      return { error: "This portal link has expired. Please contact your coordinator for an updated link." };
    }

    // 3. Check revocation
    if (portalToken.revokedAt) {
      return { error: "This portal link has been deactivated. Please contact your coordinator." };
    }

    // 4. Load work order
    const wo = await ctx.db.get(portalToken.workOrderId);
    if (!wo) return { error: "Work order not found." };

    // 5. Update access metadata (fire-and-forget style via internal mutation)
    // Note: This is a query, so we schedule the update
    await ctx.scheduler.runAfter(0, internal.portal.recordTokenAccess, {
      tokenId: portalToken._id,
    });

    // 6. Return ONLY customer-facing fields — no internal technical data
    return buildCustomerPortalView(wo, portalToken);
  },
});

function buildCustomerPortalView(wo: WorkOrder, token: PortalToken): CustomerPortalView {
  return {
    portalTokenId: token._id,
    workOrderPublicId: wo.publicId,
    aircraft: {
      tailNumberDisplay: wo.aircraftTailNumber,     // N-number is safe to show
      makeModel: wo.aircraftMakeModel ?? undefined,  // Optional, coordinator-controlled
    },
    status: {
      customerState: wo.customerFacingStatus ?? "Awaiting Arrival",
      statusUpdatedAt: wo.customerFacingStatusUpdatedAt
        ? new Date(wo.customerFacingStatusUpdatedAt).toISOString()
        : new Date(wo.createdAt).toISOString(),
      staleAfterSec: 300,
      // AOG customer communication: show "Aircraft Awaiting Critical Parts" — NOT "AOG"
      isPriorityRecoveryActive: wo.isAogActive ?? false,
      priorityMessage: wo.isAogActive
        ? "Aircraft Awaiting Critical Parts — our team is working to expedite"
        : undefined,
    },
    blockers: {
      requiresCustomerApproval:
        wo.customerFacingStatus === "Discrepancy Authorization Required",
      // Pending approval cards come from WS16-L discrepancyAuthRequests
      pendingApprovals: wo.pendingCustomerApprovals?.map(a => ({
        approvalId: a.publicId,
        summary: a.customerSafeSummary,     // Coordinator-written, NOT raw discrepancy text
        amountRange: a.estimatedCostRange,
        requestedAt: new Date(a.requestedAt).toISOString(),
        actionUrl: a.approvalActionUrl,
      })) ?? [],
      awaitingParts: wo.customerFacingStatus === "Awaiting Parts"
        ? (wo.awaitingPartsCustomerView ?? [])
        : [],
    },
    schedule: {
      estimatedReadyDate: wo.estimatedReadyDate
        ? new Date(wo.estimatedReadyDate).toISOString().split("T")[0]
        : undefined,
      pickupWindow: wo.pickupWindow ?? undefined,
      disclaimer: "Estimated completion date; subject to inspection findings and parts availability.",
    },
    communication: {
      coordinatorDisplayName: wo.coordinatorDisplayName,
      coordinatorContactMethod: "phone",
      latestUpdateSummary: wo.customerFacingStatusHistory?.slice(-1)[0]?.note ?? undefined,
    },
    auditMeta: {
      projectionVersion: "1.0",
      policyVersion: CURRENT_PORTAL_POLICY_VERSION,
      generatedAt: new Date().toISOString(),
    },
    // EXPLICITLY EXCLUDED — never in portal view:
    // internalStatus, technician names, cert numbers, raw discrepancy text,
    // task-step logs, QA findings, AD references, pricing internals,
    // signature workflow state, RTS details, auth challenge state
  };
}
```

---

## 4. Real-Time Updates via Convex Reactive Query

**Architecture:** `getPortalView` is a Convex query (not an action). Convex queries are reactive by default — the client subscribes and receives push updates when any data the query reads changes.

```typescript
// Frontend: customer portal page
// Using Convex React client

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function CustomerPortalPage({ token }: { token: string }) {
  // This subscription auto-updates the moment the coordinator calls setCustomerFacingStatus
  // No polling, no refresh button, no webhook setup required
  const portalView = useQuery(api.portal.getPortalView, { token });

  if (!portalView) return <LoadingState />;
  if ("error" in portalView) return <ErrorState message={portalView.error} />;

  return <PortalViewComponent view={portalView} />;
}
```

**What triggers a real-time update to the customer's screen:**
- Coordinator calls `setCustomerFacingStatus` → `customerFacingStatus` field changes → Convex reactivity pushes update to all subscribed portal clients for that WO immediately
- Coordinator adds a note to the status update → `customerFacingStatusHistory` changes → `latestUpdateSummary` updates in portal view
- `isAogActive` flag changes → AOG priority message appears/disappears on portal

**What does NOT trigger a customer update (by design):**
- Internal status transitions (`internalStatus` field changes)
- Technician assignments, task card updates, QA review transitions
- Signature events, cert workflows

This is the correct behavior. Carla's requirement: the coordinator controls the customer narrative, not the internal workflow engine.

---

## 5. AOG Customer Communication

**Internal state:** `AOG_ACTIVE` flag on work order — shows full internal urgency banner to coordinators and mechanics.

**Customer portal translation:**
```typescript
// In buildCustomerPortalView:
isPriorityRecoveryActive: wo.isAogActive ?? false,
priorityMessage: wo.isAogActive
  ? "Aircraft Awaiting Critical Parts — our team is working to expedite"
  : undefined,
```

**Rules:**
- Customer NEVER sees the word "AOG" (industry shorthand that may cause customer distress without context)
- Customer NEVER sees the technical root cause of the AOG designation
- The coordinator may add a coordinator-authored note in `customerFacingStatusHistory` when setting the status — this note appears as `latestUpdateSummary`
- The coordinator controls all customer-facing narrative about what "priority recovery" means for this specific aircraft

**Example coordinator flow during AOG:**
1. Internal: WO transitions to `AOG_ACTIVE` (mechanic or dispatch sets this)
2. Coordinator: sets `customerFacingStatus = "Awaiting Parts"` with note "Sourcing a part; we have your aircraft prioritized and will update as soon as ETA is confirmed."
3. Customer portal shows: "Awaiting Parts" + priority badge "Aircraft Awaiting Critical Parts" + coordinator note
4. Customer does NOT see: "AOG", "grounded", part number, root cause, vendor name

---

## 6. Danny Osei — UAT Script (The "Is My Plane Done?" Call Scenario)

**Background:** Danny currently handles ~10 status calls per day. Most are variations of "just checking in, any update on N12345?" The portal is meant to make these calls unnecessary. Danny's UAT validates the full coordinator-to-customer portal flow.

---

**Step 1 — Generate portal link for new work order**
- Danny opens WO for N12345 (pitot-static check, ETA 3 days)
- Navigates to: Work Order → Customer Portal → "Generate Portal Link"
- System generates link: `https://portal.athelon.app/wo/[token]`
- Danny copies and texts the link to the aircraft owner
- ✅ *Confirm: token created, link generated, expiry set to 30 days post-delivery*

**Step 2 — Customer checks portal (before Danny sets any status)**
- Owner opens the link
- Sees: "Awaiting Arrival" (default) — "Your aircraft hasn't arrived at the shop yet"
- No technical data visible; just the WO public ID and tail number
- ✅ *Confirm: customerFacingStatus defaults to "Awaiting Arrival"*

**Step 3 — Aircraft arrives; Danny updates customer status**
- Aircraft arrives; internal status → `AIRCRAFT_RECEIVED`
- Danny navigates to Customer Portal tab on the WO
- Clicks: "Update Customer Status" → selects "Received / Inspection Pending"
- Adds note: "Your aircraft has arrived and is in our receiving queue."
- Submits → portal updates in real-time
- Owner's already-open portal tab updates within seconds (no refresh needed)
- ✅ *Confirm: Convex reactive query pushes update; no refresh required on customer side*

**Step 4 — Discrepancy found; Danny sets authorization status**
- Mechanic finds additional work needed; internal status → `DISCREPANCY_RECORDED`
- Danny reviews; sends authorization request via WS16-L flow
- Danny updates customer status: "Discrepancy Authorization Required"
- Portal shows: "Discrepancy Authorization Required" + approval card with customer-safe summary
- Owner clicks "Approve" link in portal → WS16-L records authorization
- ✅ *Confirm: portal shows authorization card; internal discrepancy raw text NOT visible*

**Step 5 — AOG scenario (critical parts unavailable)**
- Parts for the repair are on backorder; coordinator sets `isAogActive = true` internally
- Danny updates customer status: "Awaiting Parts" with note "We're expediting a part — your aircraft is our top priority."
- Customer portal shows: "Awaiting Parts" + "Aircraft Awaiting Critical Parts" priority badge + Danny's note
- ✅ *Confirm: "AOG" word never appears in portal; priority badge shows; coordinator narrative controls the message*

**Step 6 — Work complete; Danny sets Ready for Pickup**
- RTS signed by IA internally; internal status → `RETURN_TO_SERVICE_SIGNED`
- Danny attempts to set customer status "Ready for Pickup" BEFORE RTS is signed → system blocks it
- ✅ *Confirm: system prevents "Ready for Pickup" if RTS not signed*
- After RTS signed: Danny sets "Ready for Pickup"
- Customer portal updates in real-time; owner receives push notification
- ✅ *Confirm: portal shows "Ready for Pickup" only after RTS complete*

**Step 7 — 10 calls reduced**
- Danny logs: zero inbound status calls during this WO lifecycle
- Owner self-served all status checks via portal
- ✅ *Danny UAT sign-off*

**Danny UAT Sign-Off Criteria:**
- [ ] Portal link generated and shared in < 30 seconds
- [ ] Real-time status push works (customer sees update without refresh)
- [ ] "Ready for Pickup" blocked until RTS internal status confirmed
- [ ] Discrepancy authorization card visible in portal; raw discrepancy text NOT visible
- [ ] AOG shows priority badge, not "AOG" terminology
- [ ] Token expiry works (expired link shows error message, no data)
- [ ] Portal tab on coordinator WO view is intuitive; status update takes < 60 seconds

---

## 7. Cilla Oduya — Test Plan (Minimum 6 Cases)

| TC | Title | Input | Expected | Source/Basis |
|---|---|---|---|---|
| TC-K-01 | Token expiry — access denied | `getPortalView` with a token whose `expiresAt` is in the past | Returns `{ error: "This portal link has expired..." }`; NO work order data returned; NO internal fields accessible; access attempt logged in audit | WS15-G §4.5; TC-K security |
| TC-K-02 | Revoked token — immediate denial | Token revoked by coordinator at T=0; customer accesses portal at T+5 minutes | Returns `{ error: "deactivated" }`; revocation is immediate (not delayed); access log shows revoked-token access attempt | WS15-G §4.5 |
| TC-K-03 | Status isolation — internal status change does NOT update customer view | Internal status transitions from `INSPECTION_IN_PROGRESS` → `DISCREPANCY_RECORDED`; no coordinator action | `customerFacingStatus` remains unchanged on work order; customer portal still shows previous customer status; no automatic customer-facing update | Carla Ostrowski non-negotiable |
| TC-K-04 | Real-time update confirmation | Coordinator calls `setCustomerFacingStatus` → "Work In Progress"; a subscribed portal client is open | Convex reactive query delivers update to portal client within 5 seconds; no refresh needed; `statusUpdatedAt` timestamp updates; previous status still in `customerFacingStatusHistory` | WS15-G §4.4; Danny UAT requirement |
| TC-K-05 | "Ready for Pickup" safety gate | Coordinator calls `setCustomerFacingStatus("Ready for Pickup")` when `internalStatus = "MAINTENANCE_IN_PROGRESS"` | Mutation throws: "Cannot set customer status to Ready for Pickup — internal RTS sign-off not yet complete"; no status change written; audit event logs rejected attempt | Carla Ostrowski; WS15-G §2.3 |
| TC-K-06 | AOG terminology isolation | `isAogActive = true` on work order; customer checks portal | Portal shows `isPriorityRecoveryActive: true` and `priorityMessage: "Aircraft Awaiting Critical Parts..."`; the word "AOG" does NOT appear anywhere in customer-facing payload; internal status details not visible | WS15-G §2.6 |
| TC-K-07 | Portal view field exclusion verification | Work order has technician names, cert numbers, internal discrepancy text, QA findings detail, internalStatus | `getPortalView` response does NOT contain any of: technicianName, certNumber, internalStatus, rawDiscrepancyText, qaFindingsDetail, signatureEventId | WS15-G §4.2 — Excluded fields |
| TC-K-08 | Customer status history audit trail | Coordinator sets customer status 3 times over 2 days | `customerFacingStatusHistory` array contains all 3 entries with actor ID, timestamp, and note; no entry is overwritten; audit event `CUSTOMER_STATUS_UPDATED` emitted for each; entries immutable | WS15-G §1.2 Carla audit requirement |

---

## 8. Coordinator Workflow — Customer Portal Tab on WO

The WO detail view gains a "Customer Portal" tab. This is Danny's primary interface.

**Tab layout:**
```
┌─────────────────────────────────────────────────────────┐
│ CUSTOMER PORTAL                                         │
│                                                         │
│ Portal Link:  [https://portal.athelon.app/wo/...]  📋   │
│ Status: Active  |  Expires: March 24, 2026              │
│                                                         │
│ CUSTOMER STATUS (what the customer sees):               │
│ ┌──────────────────────────────────────────┐            │
│ │  📦 Awaiting Parts          [Change →]   │            │
│ │  Set 2 hours ago by: Danny O.            │            │
│ │  Note: "Expediting a part; ETA unknown"  │            │
│ └──────────────────────────────────────────┘            │
│                                                         │
│ INTERNAL STATUS (not shown to customer):                │
│   AOG_ACTIVE / PARTS_WAITING                            │
│                                                         │
│ Status History:                                         │
│   Mar 10 09:14 — Received / Inspection Pending (Danny)  │
│   Mar 11 14:32 — Inspection In Progress (Danny)         │
│   Mar 12 10:05 — Discrepancy Authorization Required     │
│   Mar 13 16:22 — Awaiting Parts (Danny)          ← now  │
│                                                         │
│ [Revoke Portal Link]  [Regenerate Link]                 │
└─────────────────────────────────────────────────────────┘
```

**The coordinator sees both tracks simultaneously.** The deliberate friction of manually setting the customer status is a feature, not a bug — it forces the coordinator to make a conscious communication decision rather than automatically exposing internal technical transitions to the customer.

---

## 9. Build Sequence

| Step | Component | Owner | Depends On |
|---|---|---|---|
| B1 | Schema: `customerFacingStatus` fields on `workOrders`, `portalTokens` table | Devraj | — |
| B2 | `generateCustomerPortalToken` mutation | Devraj | B1 |
| B3 | `setCustomerFacingStatus` mutation with safety gate | Devraj | B1 |
| B4 | `getPortalView` query (reactive, customer-facing fields only) | Devraj | B1-B3 |
| B5 | Customer portal page (React, `useQuery` subscription) | Chloe Park | B4 |
| B6 | Coordinator "Customer Portal" tab on WO detail | Chloe Park | B2-B3 |
| B7 | AOG `isPriorityRecoveryActive` propagation | Devraj | B4 |
| B8 | Token revocation and rotation flows | Devraj | B2 |
| B9 | Forbidden field exclusion verification (server-side) | Devraj | B4 |
| B10 | Audit event stream for customer status transitions | Devraj | B3 |
| B11 | Integration with WS16-L pending approval cards in portal view | Devraj | WS16-L |
| B12 | Cilla test cases TC-K-01 through TC-K-08 | Cilla | B1-B11 |
| B13 | Danny Osei UAT + Carla Ostrowski UAT | Danny / Carla | B5-B6 |

---

## 10. Release Blockers Summary

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | WS16-L discrepancy auth flow complete (pending approval cards) | WS16-L team | Dependency |
| 2 | TC-K-03 status isolation via direct mutation test | Cilla | ⬜ Not run |
| 3 | TC-K-01 / TC-K-02 token expiry/revocation via direct API test | Cilla | ⬜ Not run |
| 4 | Danny Osei UAT sign-off | Danny | ⬜ Not run |
| 5 | Carla Ostrowski UAT sign-off | Carla | ⬜ Not run |

---

## 11. Execution Checklist

- [ ] `customerFacingStatus` and related fields added to `workOrders` schema
- [ ] `portalTokens` table created with indexes
- [ ] `generateCustomerPortalToken` mutation written and tested
- [ ] `setCustomerFacingStatus` mutation written with "Ready for Pickup" safety gate
- [ ] `getPortalView` query written — excluded field list verified against WS15-G §4.2
- [ ] Customer portal page built with `useQuery` reactive subscription
- [ ] Coordinator "Customer Portal" tab on WO detail built
- [ ] AOG communication tested — "AOG" not in any customer-facing field
- [ ] Token revocation immediate and tested
- [ ] All 8 TC-K test cases passing
- [ ] Danny Osei UAT sign-off attached
- [ ] Carla Ostrowski UAT sign-off attached
- [ ] WS16-M hash manifest includes customer status transition events

---

*Filed: 2026-02-22 | Phase 16 depth pass | Athelon WS16-K*
*Source: phase-15-rd/ws15-g-customer-portal.md*
*No Marcus compliance review required (non-regulatory feature)*
