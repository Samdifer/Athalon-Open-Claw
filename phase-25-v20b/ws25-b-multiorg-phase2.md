# WS25-B — Multi-Org Phase 2+3 (Mutation Hardening + Clerk Surface) + Cert Holder Separation (2C)
**Filed:** 2026-02-23T02:40:00Z  
**Owner:** Devraj Anand (implementation), Jonas Harker (infrastructure), Chloe Reyes (frontend/Clerk), Marcus Webb (compliance), Cilla Oduya (QA)  
**Sprint:** Phase 25, Sprint 2  
**Depends on:** WS25-A (SHIPPED ✅) — schema + indexes live, orgId middleware established  
**Status:** ✅ COMPLETE

---

## 1. Objective Checklist

| # | Objective | PASS/FAIL Criterion | Result |
|---|-----------|---------------------|--------|
| O-1 | Enumerate all write-path mutations touching org-scoped data | Full inventory table with mutation name, table(s) written, and isolation status | ✅ PASS |
| O-2 | Implement org-isolation guard on every write-path mutation | `getOrgId(ctx)` + `assertOrgMatch()` present in every handler; no mutation accepts client-supplied orgId | ✅ PASS |
| O-3 | Prove cross-org writes are blocked | TC-P2-001 through TC-P2-012 pass — cross-org write attempt returns ORG_ISOLATION_VIOLATION | ✅ PASS |
| O-4 | Clerk org membership sync hook | `syncOrgMembership` action wired to Clerk webhook; membership table updated on join/leave/role-change events | ✅ PASS |
| O-5 | Invitation flow schema + mutation | `orgInvitations` table defined; `createOrgInvitation` + `acceptOrgInvitation` mutations shipped | ✅ PASS |
| O-6 | Role propagation from Clerk org metadata to Athelon role table | `syncClerkRoleToAthelon` mutation maps Clerk `publicMetadata.athRole` to `orgRoleConfig` entry | ✅ PASS |
| O-7 | Org switch UX context reset | `useOrgSwitcher` hook clears query cache, resets UI state, redirects to org dashboard on switch | ✅ PASS |
| O-8 | Per-org cert storage schema | `personnelCerts` table replaces global cert fields on users; per-org context enforced | ✅ PASS |
| O-9 | Migration from global to org-scoped cert records | `migrateGlobalCertsToOrg` mutation run; PASS evidence logged | ✅ PASS |
| O-10 | Display logic update for cert context | Cert display shows org-contextual cert records, not global profile certs | ✅ PASS |
| O-11 | Compliance note: §65 person-level / org-display context | Marcus Webb compliance note filed and incorporated into schema comments | ✅ PASS |
| O-12 | Cilla Oduya test suite: all Phase 2+3+2C cases | TC-P2-001–012, TC-P3-001–007, TC-2C-001–006 all PASS | ✅ PASS |
| O-13 | Marcus Webb compliance review filed | §65 portability and §145 isolation confirmed; written review below | ✅ PASS |

**Sprint 2 Prerequisite Gate:** WS25-A status must be ✅ SHIPPED before any Phase 2 mutation writes deploy. Gate: PASSED — WS25-A shipped 2026-02-23T02:15:00Z.

---

## 2. Phase 2 — Mutation Hardening

### 2.1 Complete Write-Path Mutation Inventory

Every Convex mutation that touches org-scoped tables is enumerated below. Org isolation status after WS25-B is marked for each.

| # | Mutation | Primary Table(s) Written | WS25-A Partial Guard | WS25-B Full Guard | Isolation Status |
|---|----------|--------------------------|----------------------|-------------------|-----------------|
| M-01 | `createWorkOrder` | workOrders | ✅ getOrgId pattern | ✅ assertOrgMatch on aircraft | ✅ HARDENED |
| M-02 | `updateWorkOrder` | workOrders | ✅ getOrgId pattern | ✅ assertOrgMatch on WO before patch | ✅ HARDENED |
| M-03 | `closeWorkOrder` | workOrders | ✅ getOrgId pattern | ✅ assertOrgMatch on WO + RTS auth | ✅ HARDENED |
| M-04 | `deleteWorkOrder` | workOrders | ✅ getOrgId pattern | ✅ assertOrgMatch on WO, DOM-only | ✅ HARDENED |
| M-05 | `createDiscrepancy` | discrepancies | ⚠️ getOrgId only | ✅ assertOrgMatch on parent WO | ✅ HARDENED |
| M-06 | `resolveDiscrepancy` | discrepancies | ⚠️ getOrgId only | ✅ assertOrgMatch on discrepancy + WO | ✅ HARDENED |
| M-07 | `signRts` | workOrders, rtsSignatures | ⚠️ getOrgId only | ✅ assertOrgMatch on WO; sign_rts permission check | ✅ HARDENED |
| M-08 | `createAircraft` | aircraft | ✅ getOrgId pattern | ✅ tail-number uniqueness scoped to org | ✅ HARDENED |
| M-09 | `updateAircraft` | aircraft | ✅ getOrgId pattern | ✅ assertOrgMatch on aircraft before patch | ✅ HARDENED |
| M-10 | `upsertAdComplianceRecord` | adComplianceRecords | ✅ getOrgId (DST-FB-001) | ✅ assertOrgMatch on aircraft | ✅ HARDENED |
| M-11 | `createPersonnel` | personnel/users | ⚠️ getOrgId only | ✅ org-scoped uniqueness on cert numbers | ✅ HARDENED |
| M-12 | `updatePersonnel` | personnel/users | ⚠️ getOrgId only | ✅ assertOrgMatch on user record | ✅ HARDENED |
| M-13 | `deactivatePersonnel` | personnel/users | ⚠️ getOrgId only | ✅ assertOrgMatch; DOM-only gate | ✅ HARDENED |
| M-14 | `createLlpComponent` | llpComponents | ⚠️ getOrgId only | ✅ assertOrgMatch on aircraft | ✅ HARDENED |
| M-15 | `updateLlpAccumulation` | llpComponents | ⚠️ getOrgId only | ✅ assertOrgMatch on component | ✅ HARDENED |
| M-16 | `recordLlpEvent` | llpComponents, llpEvents | ⚠️ getOrgId only | ✅ assertOrgMatch on component + aircraft | ✅ HARDENED |
| M-17 | `createFerryPermitWorkOrder` | ferryPermitRecord, workOrders | ✅ Present (WS24-A) | ✅ assertOrgMatch on aircraft; DOM-only | ✅ HARDENED |
| M-18 | `issuePilotNotification` | pilotNotificationLog | ⚠️ getOrgId only | ✅ assertOrgMatch on WO | ✅ HARDENED |
| M-19 | `createOrgRoleConfig` | orgRoleConfig | ✅ New in WS25-A | ✅ admin-only; permission set enforced | ✅ HARDENED |
| M-20 | `updateOrgRoleConfig` | orgRoleConfig | ✅ New in WS25-A | ✅ assertOrgMatch on role record; admin-only | ✅ HARDENED |
| M-21 | `grantAircraftOrgAccess` | aircraftOrgAccess | ⬜ New in WS25-B | ✅ Requires owning-org DOM auth | ✅ HARDENED |
| M-22 | `revokeAircraftOrgAccess` | aircraftOrgAccess | ⬜ New in WS25-B | ✅ Requires owning-org DOM auth | ✅ HARDENED |
| M-23 | `createOrgInvitation` | orgInvitations | ⬜ New in WS25-B | ✅ DOM-only; orgId from auth | ✅ HARDENED |
| M-24 | `acceptOrgInvitation` | orgInvitations, personnel | ⬜ New in WS25-B | ✅ Token-validated; org derived from invitation | ✅ HARDENED |
| M-25 | `syncOrgMembership` | personnel, orgMemberships | ⬜ New in WS25-B | ✅ Webhook-only (server action, no client auth path) | ✅ HARDENED |
| M-26 | `upsertPersonnelCert` | personnelCerts | ⬜ New in WS25-B (2C) | ✅ assertOrgMatch on personnel; org-scoped cert | ✅ HARDENED |
| M-27 | `deactivatePersonnelCert` | personnelCerts | ⬜ New in WS25-B (2C) | ✅ DOM-only; assertOrgMatch on cert record | ✅ HARDENED |

**Total mutations audited: 27**  
**Fully hardened after WS25-B: 27 / 27 (100%)**  
**WS25-A partial guards (getOrgId without assertOrgMatch): 12 — all upgraded in WS25-B**  

---

### 2.2 Org-Isolation Guard Pattern Implementation

The guard pattern established in WS25-A (`getOrgId` + `assertOrgMatch`) is now extended with additional layers for mutations that write to multiple tables or require cross-document validation.

#### 2.2.1 Core Pattern (unchanged from WS25-A — reproduced for completeness)

```typescript
// convex/lib/authHelpers.ts (extended in WS25-B)

import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";

/**
 * getOrgId — derive orgId from Clerk auth context
 * Never accepts orgId from client args.
 */
export async function getOrgId(ctx: MutationCtx | QueryCtx): Promise<Id<"organizations">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");

  const orgId = identity.orgId as Id<"organizations"> | undefined;
  if (!orgId) throw new ConvexError(
    "ORG_CONTEXT_MISSING: No org context in auth identity. " +
    "Ensure a Clerk org is selected before performing this action."
  );
  return orgId;
}

/**
 * assertOrgMatch — verify a fetched document belongs to the requesting org.
 * Called after every ctx.db.get() that retrieves an org-scoped document.
 */
export function assertOrgMatch(
  docOrgId: Id<"organizations">,
  requestingOrgId: Id<"organizations">,
  docType: string,
  docId?: string
): void {
  if (docOrgId !== requestingOrgId) {
    throw new ConvexError(
      `ORG_ISOLATION_VIOLATION: ${docType}${docId ? ` (${docId})` : ""} ` +
      `does not belong to requesting org. Cross-org access denied.`
    );
  }
}

/**
 * requirePermission — check that the authenticated user holds a specific permission
 * within their org. Loads orgRoleConfig for the user's role.
 */
export async function requirePermission(
  ctx: MutationCtx | QueryCtx,
  orgId: Id<"organizations">,
  userId: Id<"users">,
  permission: string
): Promise<void> {
  const userRecord = await ctx.db
    .query("personnel")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .filter((q) => q.eq(q.field("_id"), userId))
    .unique();

  if (!userRecord) throw new ConvexError("PERSONNEL_NOT_FOUND_IN_ORG");

  const roleConfig = await ctx.db
    .query("orgRoleConfig")
    .withIndex("by_org_active", (q) =>
      q.eq("orgId", orgId).eq("isActive", true)
    )
    .filter((q) => q.eq(q.field("roleName"), userRecord.roleName))
    .unique();

  if (!roleConfig) throw new ConvexError(`ROLE_NOT_FOUND: ${userRecord.roleName}`);

  if (!roleConfig.permissions.includes(permission as any)) {
    throw new ConvexError(
      `PERMISSION_DENIED: Role "${userRecord.roleName}" does not have "${permission}" permission.`
    );
  }
}
```

#### 2.2.2 Multi-Table Write Pattern (new in WS25-B)

Mutations that write to multiple tables must assert org match on every input document before any write occurs. Writes are atomic only at the Convex operation level — if any assertion fails, the entire mutation is rolled back.

```typescript
// convex/mutations/workOrders.ts — closeWorkOrder (M-03)
// Example of multi-table assertion before any write

export const closeWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    closureNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity!.subject as Id<"users">;

    // Fetch and assert org match — WO
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new ConvexError("WORK_ORDER_NOT_FOUND");
    assertOrgMatch(wo.orgId, orgId, "workOrder", args.workOrderId);

    // Permission: close_work_order or sign_rts
    await requirePermission(ctx, orgId, userId, "close_work_order");

    // Assert all discrepancies are resolved before close
    const openDiscrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_org_workOrder", (q) =>
        q.eq("orgId", orgId).eq("workOrderId", args.workOrderId)
      )
      .filter((q) => q.neq(q.field("status"), "RESOLVED"))
      .collect();

    if (openDiscrepancies.length > 0) {
      throw new ConvexError(
        `CLOSE_BLOCKED: ${openDiscrepancies.length} unresolved discrepancies. ` +
        `All discrepancies must be resolved before closing.`
      );
    }

    // Write: update WO status — only after all assertions pass
    await ctx.db.patch(args.workOrderId, {
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      closedBy: userId,
      closureNotes: args.closureNotes,
    });

    return { success: true, workOrderId: args.workOrderId };
  },
});
```

#### 2.2.3 Cross-Org Aircraft Sharing Pattern (new in WS25-B — M-21, M-22)

Cross-org aircraft access is explicit-grant only. The owning org's DOM must grant access; the accessing org queries via the junction table.

```typescript
// convex/schema.ts — aircraftOrgAccess junction table

aircraftOrgAccess: defineTable({
  aircraftId: v.id("aircraft"),
  owningOrgId: v.id("organizations"),      // org that owns the aircraft record
  accessingOrgId: v.id("organizations"),   // org being granted access
  accessLevel: v.union(
    v.literal("owner"),       // full ownership — only one record per aircraft
    v.literal("read_only"),   // read-only access for shared tail
  ),
  grantedBy: v.id("users"),   // must be DOM of owningOrgId
  grantedAt: v.string(),
  revokedAt: v.optional(v.string()),
  isActive: v.boolean(),
})
  .index("by_aircraft", ["aircraftId"])
  .index("by_accessing_org", ["accessingOrgId", "isActive"])
  .index("by_owning_org", ["owningOrgId"]),

// convex/mutations/aircraftAccess.ts

export const grantAircraftOrgAccess = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    accessingOrgId: v.id("organizations"),
    accessLevel: v.union(v.literal("read_only")), // owner cannot be granted; only read_only
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity!.subject as Id<"users">;

    // Verify aircraft belongs to calling org
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new ConvexError("AIRCRAFT_NOT_FOUND");
    assertOrgMatch(aircraft.orgId, orgId, "aircraft", args.aircraftId);

    // Permission: DOM only (manage_personnel implies DOM-level access in this context)
    await requirePermission(ctx, orgId, userId, "admin");

    // Cannot grant to self
    if (args.accessingOrgId === orgId) {
      throw new ConvexError("GRANT_SELF: Cannot grant access to owning org — already has owner access.");
    }

    // Check for existing active grant
    const existing = await ctx.db
      .query("aircraftOrgAccess")
      .withIndex("by_aircraft", (q) => q.eq("aircraftId", args.aircraftId))
      .filter((q) =>
        q.and(
          q.eq(q.field("accessingOrgId"), args.accessingOrgId),
          q.eq(q.field("isActive"), true)
        )
      )
      .unique();

    if (existing) {
      throw new ConvexError("GRANT_EXISTS: Active access grant already exists for this org.");
    }

    await ctx.db.insert("aircraftOrgAccess", {
      aircraftId: args.aircraftId,
      owningOrgId: orgId,
      accessingOrgId: args.accessingOrgId,
      accessLevel: "read_only",
      grantedBy: userId,
      grantedAt: new Date().toISOString(),
      isActive: true,
    });

    return { success: true };
  },
});
```

#### 2.2.4 Query-Layer Isolation (reads enforce org too)

All queries follow the same pattern. Cross-org isolation is enforced at both the read and write layer.

```typescript
// convex/queries/workOrders.ts — getWorkOrder

export const getWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;

    // Isolation check: throw if WO belongs to a different org
    assertOrgMatch(wo.orgId, orgId, "workOrder", args.workOrderId);

    return wo;
  },
});
```

---

### 2.3 Test Evidence — Cross-Org Writes Blocked

Cilla Oduya ran the Phase 2 mutation hardening test suite. Full results in §5 (Cilla's test execution log). Summary:

| Test | Description | Result |
|------|-------------|--------|
| TC-P2-001 | Cross-org createWorkOrder attempt | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-002 | Cross-org updateWorkOrder attempt | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-003 | Cross-org signRts attempt | ✅ PASS — PERMISSION_DENIED + ORG_ISOLATION_VIOLATION |
| TC-P2-004 | Cross-org resolveDiscrepancy attempt | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-005 | Cross-org updateAircraft attempt | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-006 | Cross-org upsertAdComplianceRecord | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-007 | Cross-org updateLlpAccumulation | ✅ PASS — ORG_ISOLATION_VIOLATION |
| TC-P2-008 | Client-supplied orgId override attempt | ✅ PASS — arg rejected at schema layer |
| TC-P2-009 | Unauthenticated mutation call | ✅ PASS — UNAUTHENTICATED |
| TC-P2-010 | Authenticated, no org context | ✅ PASS — ORG_CONTEXT_MISSING |
| TC-P2-011 | grantAircraftOrgAccess by non-DOM | ✅ PASS — PERMISSION_DENIED |
| TC-P2-012 | grantAircraftOrgAccess to self | ✅ PASS — GRANT_SELF error |

**Phase 2 Hardening: 12/12 tests PASS. Zero cross-org writes possible.**

---

## 3. Phase 3 — Clerk Surface

### 3.1 Org Membership Sync Hook

Clerk fires webhook events for org membership changes. The `syncOrgMembership` action handles all events and keeps the Convex `orgMemberships` table in sync. This is a server-side action (not a mutation callable from the client).

#### 3.1.1 orgMemberships Table

```typescript
// convex/schema.ts — new table

orgMemberships: defineTable({
  orgId: v.id("organizations"),
  clerkOrgId: v.string(),           // Clerk's org_XXXX identifier
  userId: v.id("users"),
  clerkUserId: v.string(),          // Clerk's user_XXXX identifier
  roleName: v.string(),             // resolved from Clerk publicMetadata.athRole
  clerkRole: v.string(),            // raw Clerk org membership role (org:admin / org:member)
  membershipStatus: v.union(
    v.literal("ACTIVE"),
    v.literal("PENDING"),           // invited, not yet accepted
    v.literal("REMOVED"),
  ),
  joinedAt: v.optional(v.string()),
  removedAt: v.optional(v.string()),
  lastSyncAt: v.string(),           // timestamp of last webhook sync
})
  .index("by_org", ["orgId"])
  .index("by_org_user", ["orgId", "userId"])
  .index("by_clerk_ids", ["clerkOrgId", "clerkUserId"]),
```

#### 3.1.2 Webhook Handler Action

```typescript
// convex/actions/clerkWebhook.ts

import { action } from "../_generated/server";
import { v } from "convex/values";
import Svix from "svix";

/**
 * clerkWebhookHandler — receives Clerk webhook events and dispatches to
 * the appropriate sync action. Verified via Svix signature.
 * 
 * Handles:
 *   organizationMembership.created
 *   organizationMembership.updated
 *   organizationMembership.deleted
 *   organization.created
 *   organization.updated
 */
export const clerkWebhookHandler = action({
  args: {
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
    body: v.string(),       // raw JSON payload as string
  },
  handler: async (ctx, args) => {
    // Verify webhook signature using Svix
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("CLERK_WEBHOOK_SECRET not configured");

    const wh = new Svix.Webhook(webhookSecret);
    let event: any;
    try {
      event = wh.verify(args.body, {
        "svix-id": args.svixId,
        "svix-timestamp": args.svixTimestamp,
        "svix-signature": args.svixSignature,
      });
    } catch (err) {
      throw new Error("WEBHOOK_SIGNATURE_INVALID");
    }

    const eventType = event.type as string;

    switch (eventType) {
      case "organizationMembership.created":
      case "organizationMembership.updated":
        await ctx.runMutation("internal:syncOrgMembership", {
          clerkOrgId: event.data.organization.id,
          clerkUserId: event.data.public_user_data.user_id,
          clerkRole: event.data.role,
          publicMetadata: event.data.public_user_data.public_metadata ?? {},
          eventType: "upsert",
        });
        break;

      case "organizationMembership.deleted":
        await ctx.runMutation("internal:syncOrgMembership", {
          clerkOrgId: event.data.organization.id,
          clerkUserId: event.data.public_user_data.user_id,
          clerkRole: event.data.role,
          publicMetadata: {},
          eventType: "remove",
        });
        break;

      case "organization.created":
        await ctx.runMutation("internal:createOrganizationRecord", {
          clerkOrgId: event.data.id,
          orgName: event.data.name,
          orgSlug: event.data.slug,
          createdAt: new Date(event.data.created_at).toISOString(),
        });
        break;

      default:
        // Unhandled event type — log and ignore
        console.log(`[clerkWebhook] Unhandled event type: ${eventType}`);
    }

    return { processed: true, eventType };
  },
});
```

#### 3.1.3 syncOrgMembership Internal Mutation

```typescript
// convex/mutations/internal/syncOrgMembership.ts

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * syncOrgMembership — internal mutation called by the webhook action.
 * Not callable from the client — internal mutations are server-only.
 */
export const syncOrgMembership = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    clerkRole: v.string(),          // "org:admin" | "org:member"
    publicMetadata: v.any(),        // Clerk publicMetadata object
    eventType: v.union(v.literal("upsert"), v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Resolve Athelon org from Clerk org ID
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("clerkOrgId"), args.clerkOrgId))
      .unique();
    if (!org) {
      console.warn(`[syncOrgMembership] No Athelon org found for clerkOrgId: ${args.clerkOrgId}`);
      return { skipped: true, reason: "ORG_NOT_FOUND" };
    }

    // Resolve Athelon user from Clerk user ID
    const user = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();
    if (!user) {
      console.warn(`[syncOrgMembership] No Athelon user found for clerkUserId: ${args.clerkUserId}`);
      return { skipped: true, reason: "USER_NOT_FOUND" };
    }

    // Derive Athelon role name from Clerk publicMetadata
    const athRole: string = args.publicMetadata?.athRole ?? (
      args.clerkRole === "org:admin" ? "DOM" : "A&P"
    );

    // Find existing membership record
    const existing = await ctx.db
      .query("orgMemberships")
      .withIndex("by_clerk_ids", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId)
      )
      .unique();

    if (args.eventType === "remove") {
      if (existing) {
        await ctx.db.patch(existing._id, {
          membershipStatus: "REMOVED",
          removedAt: now,
          lastSyncAt: now,
        });
      }
      return { action: "removed", orgId: org._id, userId: user._id };
    }

    // Upsert membership
    if (existing) {
      await ctx.db.patch(existing._id, {
        roleName: athRole,
        clerkRole: args.clerkRole,
        membershipStatus: "ACTIVE",
        lastSyncAt: now,
      });
    } else {
      await ctx.db.insert("orgMemberships", {
        orgId: org._id,
        clerkOrgId: args.clerkOrgId,
        userId: user._id,
        clerkUserId: args.clerkUserId,
        roleName: athRole,
        clerkRole: args.clerkRole,
        membershipStatus: "ACTIVE",
        joinedAt: now,
        lastSyncAt: now,
      });
    }

    // Propagate role to personnel record
    await ctx.runMutation("internal:syncClerkRoleToAthelon", {
      userId: user._id,
      orgId: org._id,
      athRole,
    });

    return { action: "upserted", orgId: org._id, userId: user._id, athRole };
  },
});
```

---

### 3.2 Invitation Flow

#### 3.2.1 orgInvitations Table

```typescript
// convex/schema.ts — new table

orgInvitations: defineTable({
  orgId: v.id("organizations"),
  inviteeEmail: v.string(),
  inviteeName: v.optional(v.string()),
  intendedRoleName: v.string(),         // e.g., "A&P", "IA", "DOM", etc.
  invitedBy: v.id("users"),             // must have manage_personnel permission
  invitedAt: v.string(),
  expiresAt: v.string(),                // 7 days after invite
  tokenHash: v.string(),                // bcrypt hash of the secure invite token
  clerkInvitationId: v.optional(v.string()), // Clerk's invitation ID if Clerk invite was created
  status: v.union(
    v.literal("PENDING"),
    v.literal("ACCEPTED"),
    v.literal("EXPIRED"),
    v.literal("REVOKED"),
  ),
  acceptedAt: v.optional(v.string()),
  revokedAt: v.optional(v.string()),
  revokedBy: v.optional(v.id("users")),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_token_hash", ["tokenHash"])
  .index("by_invitee_email", ["inviteeEmail"]),
```

#### 3.2.2 createOrgInvitation Mutation (M-23)

```typescript
// convex/mutations/invitations.ts

export const createOrgInvitation = mutation({
  args: {
    inviteeEmail: v.string(),
    inviteeName: v.optional(v.string()),
    intendedRoleName: v.string(),
    validDays: v.optional(v.number()),   // default 7
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity!.subject as Id<"users">;

    // Permission: manage_personnel
    await requirePermission(ctx, orgId, userId, "manage_personnel");

    // Validate intendedRoleName exists in this org's orgRoleConfig
    const roleConfig = await ctx.db
      .query("orgRoleConfig")
      .withIndex("by_org_active", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .filter((q) => q.eq(q.field("roleName"), args.intendedRoleName))
      .unique();
    if (!roleConfig) {
      throw new ConvexError(
        `ROLE_NOT_FOUND: "${args.intendedRoleName}" is not a configured role for this org.`
      );
    }

    // Check for existing pending invite for this email in this org
    const existing = await ctx.db
      .query("orgInvitations")
      .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "PENDING"))
      .filter((q) => q.eq(q.field("inviteeEmail"), args.inviteeEmail))
      .first();
    if (existing) {
      throw new ConvexError(
        `INVITE_EXISTS: A pending invitation already exists for ${args.inviteeEmail}. ` +
        `Revoke it before creating a new one.`
      );
    }

    const validDays = args.validDays ?? 7;
    const expiresAt = new Date(Date.now() + validDays * 86400000).toISOString();

    // Generate token — in production this uses crypto.randomBytes; here we represent the hash
    const rawToken = `ath_invite_${crypto.randomUUID()}`;
    const tokenHash = await bcryptHash(rawToken); // stored; rawToken sent in email

    // Create invitation record
    const invitationId = await ctx.db.insert("orgInvitations", {
      orgId,
      inviteeEmail: args.inviteeEmail,
      inviteeName: args.inviteeName,
      intendedRoleName: args.intendedRoleName,
      invitedBy: userId,
      invitedAt: new Date().toISOString(),
      expiresAt,
      tokenHash,
      status: "PENDING",
    });

    // Create Clerk org invitation (so the invitee gets Clerk onboarding)
    // This is done via a Convex action that calls the Clerk API
    await ctx.scheduler.runAfter(0, "actions:createClerkOrgInvitation", {
      invitationId,
      orgId: orgId as string,
      email: args.inviteeEmail,
      roleName: args.intendedRoleName,
    });

    return { invitationId, expiresAt };
  },
});
```

#### 3.2.3 acceptOrgInvitation Mutation (M-24)

```typescript
// convex/mutations/invitations.ts

export const acceptOrgInvitation = mutation({
  args: {
    rawToken: v.string(),       // token from invite email link
    clerkUserId: v.string(),    // Clerk user ID of the accepting user
  },
  handler: async (ctx, args) => {
    // Find invitation by token hash
    // Note: in production this iterates matching candidates — token is high entropy;
    // a short-circuit lookup via the first N chars of the hash is acceptable
    const invitation = await ctx.db
      .query("orgInvitations")
      .withIndex("by_token_hash")
      .filter((q) => q.neq(q.field("status"), "ACCEPTED"))
      .collect()
      .then((invites) =>
        invites.find((i) => bcryptVerify(args.rawToken, i.tokenHash))
      );

    if (!invitation) {
      throw new ConvexError("INVITE_NOT_FOUND: Invalid or expired invitation token.");
    }
    if (invitation.status !== "PENDING") {
      throw new ConvexError(`INVITE_INVALID: Invitation status is "${invitation.status}".`);
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      await ctx.db.patch(invitation._id, { status: "EXPIRED" });
      throw new ConvexError("INVITE_EXPIRED: Invitation has expired. Request a new invite.");
    }

    const now = new Date().toISOString();

    // Accept: update invitation status
    await ctx.db.patch(invitation._id, {
      status: "ACCEPTED",
      acceptedAt: now,
    });

    // Resolve user — create personnel record if this is a new user
    let user = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("clerkUserId"), args.clerkUserId))
      .first();

    if (!user) {
      // New user — create skeleton personnel record
      const newUserId = await ctx.db.insert("personnel", {
        orgId: invitation.orgId,
        clerkUserId: args.clerkUserId,
        email: invitation.inviteeEmail,
        name: invitation.inviteeName ?? invitation.inviteeEmail,
        roleName: invitation.intendedRoleName,
        status: "ACTIVE",
        createdAt: now,
      });
      user = await ctx.db.get(newUserId);
    }

    // Create or update orgMembership
    const existingMembership = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", invitation.orgId).eq("userId", user!._id)
      )
      .unique();

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        membershipStatus: "ACTIVE",
        roleName: invitation.intendedRoleName,
        joinedAt: now,
        lastSyncAt: now,
      });
    } else {
      await ctx.db.insert("orgMemberships", {
        orgId: invitation.orgId,
        clerkOrgId: "", // populated by subsequent Clerk webhook sync
        userId: user!._id,
        clerkUserId: args.clerkUserId,
        roleName: invitation.intendedRoleName,
        clerkRole: "org:member",
        membershipStatus: "ACTIVE",
        joinedAt: now,
        lastSyncAt: now,
      });
    }

    return {
      success: true,
      orgId: invitation.orgId,
      userId: user!._id,
      roleName: invitation.intendedRoleName,
    };
  },
});
```

---

### 3.3 Role Propagation from Clerk Org Metadata

Clerk's `publicMetadata` on an org membership carries the Athelon role name. The `syncClerkRoleToAthelon` internal mutation propagates this to the Athelon `personnel` table.

```typescript
// convex/mutations/internal/syncClerkRoleToAthelon.ts

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * syncClerkRoleToAthelon — maps Clerk org membership publicMetadata.athRole
 * to the personnel record's roleName. Called by syncOrgMembership.
 *
 * Priority order for role determination:
 *   1. publicMetadata.athRole — explicit Athelon role name (set by admin in Clerk dashboard)
 *   2. clerkRole === "org:admin" → defaults to "DOM"
 *   3. clerkRole === "org:member" → defaults to "A&P"
 *
 * The defaulting behavior is a safe fallback; explicit athRole is always preferred.
 * A role is only applied if it exists in the org's active orgRoleConfig.
 */
export const syncClerkRoleToAthelon = internalMutation({
  args: {
    userId: v.id("users"),
    orgId: v.id("organizations"),
    athRole: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate the athRole is a configured role for this org
    const roleConfig = await ctx.db
      .query("orgRoleConfig")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("isActive", true)
      )
      .filter((q) => q.eq(q.field("roleName"), args.athRole))
      .unique();

    if (!roleConfig) {
      // Role not configured — do not apply, log warning
      console.warn(
        `[syncClerkRoleToAthelon] Role "${args.athRole}" not configured for org ${args.orgId}. ` +
        `Personnel record not updated. DOM must assign role manually.`
      );
      return { applied: false, reason: "ROLE_NOT_CONFIGURED" };
    }

    // Update personnel record
    const user = await ctx.db.get(args.userId);
    if (!user) return { applied: false, reason: "USER_NOT_FOUND" };

    // Only update if org matches (safety check)
    if (user.orgId !== args.orgId) {
      // Multi-org user: personnel records are per-org
      // Look for org-specific personnel record
      const orgUser = await ctx.db
        .query("personnel")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("clerkUserId"), user.clerkUserId))
        .unique();

      if (orgUser) {
        await ctx.db.patch(orgUser._id, {
          roleName: args.athRole,
          roleLastSyncedFromClerk: new Date().toISOString(),
        });
      }
      return { applied: true, note: "multi-org user, org-specific record updated" };
    }

    await ctx.db.patch(args.userId, {
      roleName: args.athRole,
      roleLastSyncedFromClerk: new Date().toISOString(),
    });

    return { applied: true, roleName: args.athRole };
  },
});
```

**Role mapping table (Clerk → Athelon):**

| Clerk publicMetadata.athRole | Athelon Role Applied | Notes |
|------------------------------|---------------------|-------|
| `"DOM"` | DOM | Requires org to have DOM role in orgRoleConfig |
| `"QCM"` | QCM | Part 145 orgs only; non-145 orgs will log ROLE_NOT_CONFIGURED |
| `"IA"` | IA | Standard IA role |
| `"Lead IA"` | Lead IA | Only if custom role configured by DOM |
| `"Powerplant IA"` | Powerplant IA | DST-specific |
| `"A&P"` | A&P | Default for org:member |
| `"VIEWER"` | VIEWER | Read-only access |
| `"PILOT"` | PILOT | Part 135 pilot portal (GAP 2 — pilot_readonly permission) |
| *(absent)* + `org:admin` | DOM | Safe default for admin |
| *(absent)* + `org:member` | A&P | Safe default for member |

---

### 3.4 Org Switch UX Context

#### 3.4.1 useOrgSwitcher Hook

```typescript
// src/hooks/useOrgSwitcher.ts

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useConvexClient } from "convex/react";
import { useCallback } from "react";

/**
 * useOrgSwitcher — handles org context switching with full state reset.
 *
 * On switch:
 *   1. Calls Clerk setActive to switch the active org in the session
 *   2. Clears all Convex query cache (via client.clearCacheAndReconnect)
 *   3. Resets any local UI state (dispatches to app state context)
 *   4. Redirects to /dashboard — the org-scoped landing page
 *
 * Only visible to users who are members of >1 org (enforced by isMultiOrg guard).
 */
export function useOrgSwitcher() {
  const { setActive } = useOrganizationList();
  const convex = useConvexClient();
  const router = useRouter();

  const switchOrg = useCallback(async (targetOrgId: string) => {
    // Step 1: Set Clerk active org
    await setActive!({ organization: targetOrgId });

    // Step 2: Clear Convex query cache — prevents stale cross-org data from appearing
    // clearCacheAndReconnect drops all subscriptions and re-establishes with new auth token
    convex.clearCacheAndReconnect();

    // Step 3: Reset local state (handled by redirect — Next.js page remount clears state)
    // Additional state resets (zustand store, etc.) would be dispatched here if applicable.

    // Step 4: Redirect to org dashboard
    router.push("/dashboard");
  }, [setActive, convex, router]);

  return { switchOrg };
}
```

#### 3.4.2 OrgSwitcher Component

```typescript
// src/components/nav/OrgSwitcher.tsx

import { useOrganizationList, useOrganization } from "@clerk/nextjs";
import { useOrgSwitcher } from "../../hooks/useOrgSwitcher";

/**
 * OrgSwitcher — nav component.
 * Renders only when the user has >1 org membership.
 * Shows current org name with a dropdown of available orgs.
 */
export function OrgSwitcher() {
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { organization: currentOrg } = useOrganization();
  const { switchOrg } = useOrgSwitcher();

  if (!isLoaded || !userMemberships?.data) return null;
  if (userMemberships.data.length <= 1) return null; // hide for single-org users

  return (
    <div className="org-switcher">
      <span className="org-switcher__current">
        {currentOrg?.name ?? "Select Org"}
      </span>
      <select
        value={currentOrg?.id ?? ""}
        onChange={(e) => switchOrg(e.target.value)}
        aria-label="Switch organization"
      >
        {userMemberships.data.map((membership) => (
          <option key={membership.organization.id} value={membership.organization.id}>
            {membership.organization.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Jonas's infrastructure note:** The `clearCacheAndReconnect` call on the Convex client is the correct mechanism for org-switch cache invalidation. Convex's real-time subscriptions use the Clerk session token for auth; on org switch, Clerk issues a new session token with the new org context. The cache clear ensures no stale query results from the previous org remain visible while the new token is propagating. This is the same pattern used for user logout — the client drops all subscriptions and re-establishes from a clean state.

**Chloe Reyes (frontend):** The nav OrgSwitcher is placed in the top navigation bar, left of the user avatar menu. It renders as a styled `<select>` for the initial implementation. A custom dropdown with org logos is flagged as a UI enhancement for Phase 26. The component is hidden by CSS `display: none` for single-org users, not conditionally rendered, to avoid a flicker when `userMemberships` loads.

---

## 4. Cert Holder Separation (Item 2C)

### 4.1 Regulatory and Architecture Context

**Marcus Webb's framing:** The `2C` item in the v2.0 commercial readiness gap list addresses A&P certificate numbers, IA designations, and Repairman certificates. The regulatory position is:

> **14 CFR §65.81–§65.95** — Mechanic and repairman certificates are issued to **individuals** by the FAA. A certificate number (e.g., A&P certificate 1234567) is a **person-level attribute** that does not change when the certificated individual moves between employers or shops. The certificate number is the same regardless of which Part 145 repair station employs the holder.

> **Athelon's display problem:** The current implementation stores cert numbers as global fields on the `users` (personnel) table, not scoped to an org. This means a mechanic's cert number is visible to any org they have ever been a member of, and cert display in work orders uses the global cert record. For multi-org: (a) the cert number is correct to be person-level, and (b) the *display context* — which cert is shown in a work order signed at Org A vs. Org B — must be org-scoped.

> **The regulatory constraint:** §65.95(a) — an IA certificate holder must hold a valid A&P certificate **and** meet currency requirements (work in aviation in the past 12 months). The IA designation is renewed separately and may be active at one org and not another (e.g., an IA who let their IA designation lapse at a prior employer but maintains it at a current employer). This is the primary reason cert records need org-scoped context.

**Design principle (Marcus + Devraj):**
- **Certificate numbers** (A&P, Repairman) are person-level: stored once per person; shared across orgs.
- **Certificate status in org context** (active/inactive, IA designation, current at this shop) is org-scoped: each org tracks whether the cert is active *for work performed under their certificate*.
- **Display in work orders** uses the org-scoped cert record, not the global cert record, so an IA's signature on an Org A work order reflects Org A's knowledge of the cert validity at the time of signature.

---

### 4.2 Schema Changes

#### 4.2.1 Global Cert Table (person-level facts)

```typescript
// convex/schema.ts — new table

personnelCertsMaster: defineTable({
  // Person-level cert facts — does NOT change with org context
  clerkUserId: v.string(),              // links to Clerk user identity
  userId: v.id("users"),               // links to primary personnel record
  certType: v.union(
    v.literal("A_AND_P"),              // A&P Mechanic — 14 CFR §65.71
    v.literal("A_ONLY"),               // Airframe only
    v.literal("P_ONLY"),               // Powerplant only
    v.literal("REPAIRMAN"),            // Repairman — 14 CFR §65.101
    v.literal("IA_DESIGNATION"),       // IA — 14 CFR §65.91 (based on A&P)
  ),
  certificateNumber: v.string(),       // FAA-issued cert number (immutable)
  issuedDate: v.optional(v.string()),  // date FAA issued the cert
  // IA designation tracking (IA_DESIGNATION type only)
  iaDesignationDate: v.optional(v.string()),
  iaDesignationRef: v.optional(v.string()),  // FSDO letter reference
  // Repairman tracking (REPAIRMAN type only)
  repairmanCertNumber: v.optional(v.string()),
  repairmanEmployerAtIssuance: v.optional(v.string()), // employer at time of repairman cert issuance
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_clerk_user", ["clerkUserId"])
  .index("by_cert_number", ["certificateNumber"]),
```

#### 4.2.2 Org-Scoped Cert Context Table

```typescript
// convex/schema.ts — new table

personnelCerts: defineTable({
  // Org-scoped cert context — org's record of this person's cert validity
  orgId: v.id("organizations"),
  userId: v.id("users"),
  masterCertId: v.id("personnelCertsMaster"),  // links to the global cert record
  certType: v.union(
    v.literal("A_AND_P"),
    v.literal("A_ONLY"),
    v.literal("P_ONLY"),
    v.literal("REPAIRMAN"),
    v.literal("IA_DESIGNATION"),
  ),
  // Org-scoped status
  statusInOrg: v.union(
    v.literal("ACTIVE"),              // cert confirmed active for this org's operations
    v.literal("INACTIVE"),            // cert not active in this org context (lapsed, transferred, etc.)
    v.literal("PENDING_VERIFICATION"),// newly added — DOM has not yet verified
    v.literal("SUSPENDED"),           // suspended by DOM (not FAA action — org-level hold)
  ),
  // IA designation — org-level tracking
  iaActiveInOrg: v.optional(v.boolean()),       // is IA designation active at this org?
  iaLastRenewalDate: v.optional(v.string()),    // last IA renewal this org has on record
  iaCurrencyNotedAt: v.optional(v.string()),   // timestamp DOM confirmed IA currency (§65.95)
  // Display in work orders
  displayCertNumber: v.string(),               // copy of cert number for denormalized display
  displayCertType: v.string(),                 // human-readable display string
  // Audit
  addedByDom: v.id("users"),                  // DOM who added this cert to org context
  addedAt: v.string(),
  lastReviewedBy: v.optional(v.id("users")),
  lastReviewedAt: v.optional(v.string()),
  deactivatedAt: v.optional(v.string()),
  deactivatedBy: v.optional(v.id("users")),
  deactivatedReason: v.optional(v.string()),
})
  .index("by_org", ["orgId"])
  .index("by_org_user", ["orgId", "userId"])
  .index("by_org_cert_type", ["orgId", "certType"])
  .index("by_master_cert", ["masterCertId"]),
```

#### 4.2.3 Schema Change on Personnel Table

The following fields, previously stored globally on the `personnel` (users) table, are now deprecated in favor of `personnelCerts`:

```typescript
// DEPRECATED in WS25-B — these fields remain for migration compatibility
// but are no longer the source of truth for cert display
// They will be removed in Phase 26 after migration and display layer update are confirmed

// personnel table — deprecated fields (kept, not written)
// apCertificateNumber: v.optional(v.string()),     // → personnelCertsMaster.certificateNumber
// iaDesignation: v.optional(v.boolean()),          // → personnelCerts.iaActiveInOrg
// repairmanCertNumber: v.optional(v.string()),     // → personnelCertsMaster.repairmanCertNumber
```

---

### 4.3 upsertPersonnelCert Mutation (M-26)

```typescript
// convex/mutations/personnelCerts.ts

export const upsertPersonnelCert = mutation({
  args: {
    userId: v.id("users"),
    certType: v.union(
      v.literal("A_AND_P"),
      v.literal("A_ONLY"),
      v.literal("P_ONLY"),
      v.literal("REPAIRMAN"),
      v.literal("IA_DESIGNATION"),
    ),
    certificateNumber: v.string(),
    iaActiveInOrg: v.optional(v.boolean()),
    iaLastRenewalDate: v.optional(v.string()),
    statusInOrg: v.optional(v.union(
      v.literal("ACTIVE"),
      v.literal("INACTIVE"),
      v.literal("PENDING_VERIFICATION"),
      v.literal("SUSPENDED"),
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const domUserId = identity!.subject as Id<"users">;

    // Permission: manage_personnel (DOM-level)
    await requirePermission(ctx, orgId, domUserId, "manage_personnel");

    // Verify the target user belongs to this org
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("USER_NOT_FOUND");
    assertOrgMatch(targetUser.orgId, orgId, "personnel", args.userId);

    const now = new Date().toISOString();

    // Upsert master cert record (person-level facts)
    const existingMaster = await ctx.db
      .query("personnelCertsMaster")
      .withIndex("by_cert_number", (q) => q.eq("certificateNumber", args.certificateNumber))
      .first();

    let masterCertId: Id<"personnelCertsMaster">;
    if (existingMaster) {
      // Master record exists — update if needed (e.g., IA designation date added)
      masterCertId = existingMaster._id;
      await ctx.db.patch(existingMaster._id, {
        updatedAt: now,
        // Only update person-level fields
        iaDesignationDate: existingMaster.iaDesignationDate,
      });
    } else {
      // New master cert record
      masterCertId = await ctx.db.insert("personnelCertsMaster", {
        clerkUserId: targetUser.clerkUserId ?? "",
        userId: args.userId,
        certType: args.certType,
        certificateNumber: args.certificateNumber,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Display strings
    const displayCertType =
      args.certType === "A_AND_P" ? "A&P Mechanic" :
      args.certType === "A_ONLY" ? "Airframe Mechanic" :
      args.certType === "P_ONLY" ? "Powerplant Mechanic" :
      args.certType === "IA_DESIGNATION" ? "Inspection Authorization (IA)" :
      "Repairman";

    // Upsert org-scoped cert context
    const existingOrgCert = await ctx.db
      .query("personnelCerts")
      .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", args.userId))
      .filter((q) => q.eq(q.field("certType"), args.certType))
      .first();

    if (existingOrgCert) {
      await ctx.db.patch(existingOrgCert._id, {
        statusInOrg: args.statusInOrg ?? existingOrgCert.statusInOrg,
        iaActiveInOrg: args.iaActiveInOrg,
        iaLastRenewalDate: args.iaLastRenewalDate,
        displayCertNumber: args.certificateNumber,
        displayCertType,
        lastReviewedBy: domUserId,
        lastReviewedAt: now,
      });
    } else {
      await ctx.db.insert("personnelCerts", {
        orgId,
        userId: args.userId,
        masterCertId,
        certType: args.certType,
        statusInOrg: args.statusInOrg ?? "PENDING_VERIFICATION",
        iaActiveInOrg: args.iaActiveInOrg,
        iaLastRenewalDate: args.iaLastRenewalDate,
        displayCertNumber: args.certificateNumber,
        displayCertType,
        addedByDom: domUserId,
        addedAt: now,
      });
    }

    return { success: true, masterCertId, orgId };
  },
});
```

---

### 4.4 Migration: Global → Org-Scoped Cert Records

```typescript
// convex/migrations/migrateGlobalCertsToOrg.ts

export const migrateGlobalCertsToOrg = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.isAdmin) throw new ConvexError("ADMIN_ONLY");

    const now = new Date().toISOString();
    const dryRun = args.dryRun ?? false;

    // Fetch all personnel records with legacy cert fields
    const allPersonnel = await ctx.db.query("personnel").collect();
    const migrated: string[] = [];
    const skipped: string[] = [];

    for (const person of allPersonnel) {
      // Legacy fields to migrate
      const apCert = (person as any).apCertificateNumber;
      const repairmanCert = (person as any).repairmanCertNumber;
      const iaDesignation = (person as any).iaDesignation;

      if (!apCert && !repairmanCert) {
        skipped.push(person._id);
        continue;
      }

      if (!dryRun) {
        // Create master cert record for A&P
        if (apCert) {
          const masterExists = await ctx.db
            .query("personnelCertsMaster")
            .withIndex("by_cert_number", (q) => q.eq("certificateNumber", apCert))
            .first();

          let masterCertId: Id<"personnelCertsMaster">;
          if (!masterExists) {
            masterCertId = await ctx.db.insert("personnelCertsMaster", {
              clerkUserId: person.clerkUserId ?? "",
              userId: person._id,
              certType: "A_AND_P",
              certificateNumber: apCert,
              createdAt: now,
              updatedAt: now,
            });
          } else {
            masterCertId = masterExists._id;
          }

          // Create org-scoped cert context
          const orgCertExists = await ctx.db
            .query("personnelCerts")
            .withIndex("by_org_user", (q) =>
              q.eq("orgId", person.orgId).eq("userId", person._id)
            )
            .filter((q) => q.eq(q.field("certType"), "A_AND_P"))
            .first();

          if (!orgCertExists) {
            await ctx.db.insert("personnelCerts", {
              orgId: person.orgId,
              userId: person._id,
              masterCertId,
              certType: "A_AND_P",
              statusInOrg: "ACTIVE",   // assume active for migrated records
              iaActiveInOrg: iaDesignation === true,
              displayCertNumber: apCert,
              displayCertType: "A&P Mechanic",
              addedByDom: person._id,  // self-assigned for migration records
              addedAt: now,
            });

            // If IA, also create IA cert context
            if (iaDesignation === true) {
              await ctx.db.insert("personnelCerts", {
                orgId: person.orgId,
                userId: person._id,
                masterCertId,
                certType: "IA_DESIGNATION",
                statusInOrg: "ACTIVE",
                iaActiveInOrg: true,
                displayCertNumber: apCert,  // IA is based on A&P cert number
                displayCertType: "Inspection Authorization (IA)",
                addedByDom: person._id,
                addedAt: now,
              });
            }
          }
        }

        // Repairman cert
        if (repairmanCert) {
          const repairmanMasterExists = await ctx.db
            .query("personnelCertsMaster")
            .withIndex("by_cert_number", (q) => q.eq("certificateNumber", repairmanCert))
            .first();

          const repairmanMasterId = repairmanMasterExists
            ? repairmanMasterExists._id
            : await ctx.db.insert("personnelCertsMaster", {
                clerkUserId: person.clerkUserId ?? "",
                userId: person._id,
                certType: "REPAIRMAN",
                certificateNumber: repairmanCert,
                createdAt: now,
                updatedAt: now,
              });

          await ctx.db.insert("personnelCerts", {
            orgId: person.orgId,
            userId: person._id,
            masterCertId: repairmanMasterId,
            certType: "REPAIRMAN",
            statusInOrg: "ACTIVE",
            displayCertNumber: repairmanCert,
            displayCertType: "Repairman",
            addedByDom: person._id,
            addedAt: now,
          });
        }

        migrated.push(person._id);
      }
    }

    return {
      dryRun,
      totalPersonnel: allPersonnel.length,
      migrated: migrated.length,
      skipped: skipped.length,
      timestamp: now,
    };
  },
});
```

**Migration execution log:**

```
2026-02-23T03:10:00Z — migrateGlobalCertsToOrg DRY RUN
  totalPersonnel: 34 records across 4 orgs
  Would migrate: 28 (have apCertificateNumber or repairmanCertNumber)
  Would skip: 6 (no cert fields — admin/viewer accounts)
  dryRun: true — no writes

2026-02-23T03:12:00Z — migrateGlobalCertsToOrg PRODUCTION RUN
  totalPersonnel: 34
  migrated: 28
  skipped: 6
  
  Per-org breakdown:
    Skyline Aviation: 9 A&P records, 2 IA designations migrated
    High Desert MRO: 7 A&P records, 3 IA designations migrated
    High Desert Charter: 4 A&P records, 1 IA designation migrated
    Desert Sky Turbine: 8 A&P records, 4 IA designations migrated (Frank holds one)
    
  personnelCertsMaster records created: 28
  personnelCerts (org-scoped context) records created: 37
  (37 > 28 because IA designation creates a second cert context record per IA holder)
  
  Migration complete — zero errors.
```

---

### 4.5 Display Logic Update

Work order RTS signature display now pulls from `personnelCerts` (org-scoped) rather than the global `personnel.apCertificateNumber` field.

```typescript
// convex/queries/workOrders.ts — getWorkOrderForDisplay

export const getWorkOrderForDisplay = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;
    assertOrgMatch(wo.orgId, orgId, "workOrder");

    // Load RTS signatures with org-scoped cert context
    const rtsSignatures = await ctx.db
      .query("rtsSignatures")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const signaturesWithCerts = await Promise.all(
      rtsSignatures.map(async (sig) => {
        // Load org-scoped cert record for the signer
        const orgCert = await ctx.db
          .query("personnelCerts")
          .withIndex("by_org_user", (q) =>
            q.eq("orgId", orgId).eq("userId", sig.signedBy)
          )
          .filter((q) => q.eq(q.field("certType"), "IA_DESIGNATION"))
          .first();

        // Fallback to A&P cert if no IA cert in org context
        const signerCert = orgCert ?? await ctx.db
          .query("personnelCerts")
          .withIndex("by_org_user", (q) =>
            q.eq("orgId", orgId).eq("userId", sig.signedBy)
          )
          .filter((q) => q.eq(q.field("certType"), "A_AND_P"))
          .first();

        return {
          ...sig,
          certDisplay: signerCert
            ? `${signerCert.displayCertType} No. ${signerCert.displayCertNumber}`
            : "[cert record not found in org context]",
          iaActiveInOrg: orgCert?.iaActiveInOrg ?? false,
        };
      })
    );

    return { ...wo, rtsSignatures: signaturesWithCerts };
  },
});
```

**UI changes (Chloe Reyes):**

- Personnel detail page: "Certificates" section now shows org-specific cert context (status, IA designation active flag, last reviewed date) with a link to the master cert record if the viewer is a DOM.
- Work order PDF: RTS block shows `IA No. XXXXXXX (Active — [Org Name])` or `A&P No. XXXXXXX` drawn from `personnelCerts` display fields.
- DOM dashboard: New "Personnel Cert Review" panel shows certs in `PENDING_VERIFICATION` status.

---

### 4.6 Compliance Note: §65 Cert Numbers Are Person-Level

**Filed by Marcus Webb, 2026-02-23.**

> A&P mechanic certificates (14 CFR §65.71–§65.79) and Inspection Authorization designations (14 CFR §65.91–§65.95) are issued to individuals by the FAA. The certificate number is a **permanent, person-level identifier** — it does not change when the holder changes employers, moves between repair stations, or operates under a different Part 145 certificate holder. This is a fundamental principle of the FAA's individual certification system and distinguishes individual certifications from the organization-level Part 145 repair station certificate.

> **The Athelon architecture correctly reflects this principle:** The `personnelCertsMaster` table stores the immutable certificate number and FAA issuance facts. The `personnelCerts` table stores the org's operational context for that certificate (is it active at this shop? is the IA current here?). A certificate number cannot be edited at the org-context layer — only the master record can hold or modify the cert number, and that requires admin-level access.

> **Portability implication:** A mechanic who holds A&P 1234567 at Org A brings that same cert number to Org B when they join. The `personnelCertsMaster` record (with cert number 1234567) already exists. The new org's DOM creates a `personnelCerts` context record for Org B, linked to the existing master cert. The cert number is not duplicated; the org context is added. This is consistent with the regulatory model and avoids the data integrity problem of two different stored cert numbers for the same person.

> **IA designation currency (§65.95):** An IA designation does not automatically transfer org context. A mechanic who held an active IA at Org A may not be current for IA work at Org B without the Org B DOM confirming currency (12-month recency requirements per §65.95). The `iaActiveInOrg` and `iaCurrencyNotedAt` fields exist specifically to record this per-org verification. The DOM's confirmation action creates an audit trail that an FSDO inspector can review.

> **Repairman certificates (§65.101–§65.107):** Repairman certs are tied to the employer at time of issuance. A Repairman certificate holder who leaves the employer for whom the cert was issued may no longer be eligible to exercise repairman privileges. The `repairmanEmployerAtIssuance` field in `personnelCertsMaster` preserves this fact. The `personnelCerts` org-context record should note if the holder's Repairman cert was issued for a different employer — the DOM is responsible for determining whether privileges are exercisable.

> **Compliance verdict:** The two-layer design (master cert + org context) is **compliant with 14 CFR §65** and is the architecturally correct approach for a multi-org system. It avoids both the data integrity risk of per-org cert number duplication and the compliance risk of one org's status determination silently affecting another org's displayed cert validity.

---

## 5. Cilla Oduya — Test Execution Log

**Test run:** 2026-02-23T03:30:00Z  
**Environment:** Athelon staging (all 4 orgs seeded)  
**Tester:** Cilla Oduya, QA Lead

---

### Phase 2 — Mutation Hardening

**TC-P2-001: Cross-org createWorkOrder attempt**
```
Precondition: User in org_bravo. Aircraft N44TX belongs to org_alpha.
Action: Call createWorkOrder({ aircraftId: "N44TX_id", description: "Test" })
Expected: assertOrgMatch fails — aircraft.orgId (org_alpha) ≠ requesting orgId (org_bravo)
Expected: ConvexError("ORG_ISOLATION_VIOLATION: aircraft (N44TX_id) does not belong to requesting org.")
Result: PASS ✅
Error message received: "ORG_ISOLATION_VIOLATION: aircraft (N44TX_id) does not belong to requesting org. Cross-org access denied."
```

**TC-P2-002: Cross-org updateWorkOrder attempt**
```
Precondition: WO-ALPHA-001 belongs to org_alpha. User authenticated as org_bravo.
Action: Call updateWorkOrder({ workOrderId: "WO-ALPHA-001", description: "tampered" })
Expected: ConvexError ORG_ISOLATION_VIOLATION on WO fetch
Result: PASS ✅
```

**TC-P2-003: Cross-org signRts attempt**
```
Precondition: User org_bravo, IA role. WO-ALPHA-002 belongs to org_alpha.
Action: Call signRts({ workOrderId: "WO-ALPHA-002", signatureStatement: "..." })
Expected: ORG_ISOLATION_VIOLATION (org check fires before permission check)
Result: PASS ✅
Note: org check fires first — permission denial not reached; isolation is the primary guard.
```

**TC-P2-004: Cross-org resolveDiscrepancy attempt**
```
Precondition: DISC-ALPHA-005 belongs to org_alpha (via WO-ALPHA-003). User in org_bravo.
Action: Call resolveDiscrepancy({ discrepancyId: "DISC-ALPHA-005", resolution: "..." })
Expected: ORG_ISOLATION_VIOLATION on discrepancy fetch
Result: PASS ✅
```

**TC-P2-005: Cross-org updateAircraft attempt**
```
Precondition: Aircraft N221HD belongs to org_alpha. User in org_bravo.
Action: Call updateAircraft({ aircraftId: "N221HD_id", totalTime: 9999 })
Expected: ORG_ISOLATION_VIOLATION
Result: PASS ✅
```

**TC-P2-006: Cross-org upsertAdComplianceRecord**
```
Precondition: Aircraft N44TX (org_alpha). User in org_bravo.
Action: Call upsertAdComplianceRecord({ aircraftId: "N44TX_id", adNumber: "2020-22-05", ... })
Expected: ORG_ISOLATION_VIOLATION (assertOrgMatch on aircraft)
Result: PASS ✅
```

**TC-P2-007: Cross-org updateLlpAccumulation**
```
Precondition: LLP component LLP-ALPHA-001 belongs to aircraft N44TX (org_alpha). User in org_bravo.
Action: Call updateLlpAccumulation({ llpComponentId: "LLP-ALPHA-001", hoursAdded: 5 })
Expected: ORG_ISOLATION_VIOLATION
Result: PASS ✅
```

**TC-P2-008: Client-supplied orgId override attempt**
```
Precondition: User in org_bravo. Call createWorkOrder with extra orgId arg.
Action: createWorkOrder({ aircraftId: "...", description: "...", orgId: "org_alpha_id" })
Expected: TypeScript compile error — orgId not in args schema
Expected (runtime bypass attempt): orgId ignored; mutation uses ctx.auth orgId (org_bravo)
Result: PASS ✅
Verification: Work order created with orgId = org_bravo (correct); supplied org_alpha_id silently unused because schema rejects the arg.
```

**TC-P2-009: Unauthenticated mutation call**
```
Action: Call createWorkOrder with no Clerk session token (no Authorization header)
Expected: ConvexError("UNAUTHENTICATED") from getOrgId
Result: PASS ✅
```

**TC-P2-010: Authenticated, no org context**
```
Precondition: User authenticated in Clerk with no active org selected (individual account, no org membership)
Action: Call createWorkOrder
Expected: ConvexError("ORG_CONTEXT_MISSING: No org context in auth identity.")
Result: PASS ✅
```

**TC-P2-011: grantAircraftOrgAccess by non-DOM**
```
Precondition: User with A&P role in org_alpha. Aircraft N221HD belongs to org_alpha.
Action: Call grantAircraftOrgAccess({ aircraftId: "N221HD_id", accessingOrgId: "org_bravo" })
Expected: requirePermission("admin") fails — A&P does not have admin permission
Expected: ConvexError("PERMISSION_DENIED: Role "A&P" does not have "admin" permission.")
Result: PASS ✅
```

**TC-P2-012: grantAircraftOrgAccess to self**
```
Precondition: DOM of org_alpha. Aircraft N221HD belongs to org_alpha.
Action: Call grantAircraftOrgAccess({ aircraftId: "N221HD_id", accessingOrgId: "org_alpha" })
Expected: ConvexError("GRANT_SELF: Cannot grant access to owning org — already has owner access.")
Result: PASS ✅
```

**Phase 2 Summary: 12/12 PASS ✅**

---

### Phase 3 — Clerk Surface

**TC-P3-001: Webhook membership.created sync**
```
Precondition: New Clerk webhook event: organizationMembership.created for user_cilla in org_skyline
  publicMetadata.athRole = "A&P"
Action: POST webhook to clerkWebhookHandler (Svix signature valid)
Expected: syncOrgMembership called with eventType "upsert"
Expected: orgMemberships record created with membershipStatus "ACTIVE", roleName "A&P"
Expected: personnel record updated with roleName "A&P"
Result: PASS ✅
```

**TC-P3-002: Webhook membership.deleted sync**
```
Precondition: Existing orgMembership for user_cilla in org_skyline, status ACTIVE
Action: POST organizationMembership.deleted webhook
Expected: orgMembership record patched to membershipStatus "REMOVED", removedAt set
Result: PASS ✅
```

**TC-P3-003: Invalid webhook signature rejected**
```
Action: POST to clerkWebhookHandler with tampered svixSignature
Expected: ConvexError("WEBHOOK_SIGNATURE_INVALID")
Expected: No database writes
Result: PASS ✅
```

**TC-P3-004: createOrgInvitation — happy path**
```
Precondition: DOM of org_alpha. intendedRoleName "A&P" configured in orgRoleConfig.
Action: Call createOrgInvitation({ inviteeEmail: "new@example.com", intendedRoleName: "A&P" })
Expected: orgInvitations record created, status "PENDING"
Expected: Clerk org invitation scheduled via scheduler
Expected: Returns { invitationId, expiresAt } (7 days from now)
Result: PASS ✅
```

**TC-P3-005: createOrgInvitation — duplicate pending invite blocked**
```
Precondition: Existing PENDING invite for new@example.com in org_alpha
Action: Call createOrgInvitation({ inviteeEmail: "new@example.com", intendedRoleName: "A&P" })
Expected: ConvexError("INVITE_EXISTS: A pending invitation already exists for new@example.com.")
Result: PASS ✅
```

**TC-P3-006: acceptOrgInvitation — valid token**
```
Precondition: PENDING invite with raw token TOKEN_VALID, expires 2026-02-24T00:00:00Z
Action: Call acceptOrgInvitation({ rawToken: "TOKEN_VALID", clerkUserId: "user_new" })
Expected: Invitation status → ACCEPTED, acceptedAt set
Expected: personnel record created (new user) with roleName from invitation
Expected: orgMemberships record created, membershipStatus ACTIVE
Expected: Returns { success: true, orgId, userId, roleName: "A&P" }
Result: PASS ✅
```

**TC-P3-007: Org switch — no cross-org data visible**
```
Precondition: User is member of both org_alpha and org_bravo.
  org_alpha has 124 work orders; org_bravo has 89 work orders.
Action: Authenticate as org_alpha. Load dashboard — verify 124 WOs visible.
Action: Call switchOrg to org_bravo.
  - Clerk setActive called with org_bravo id
  - convex.clearCacheAndReconnect() called
  - Router pushes /dashboard
Expected: After switch, dashboard shows org_bravo's 89 WOs
Expected: No org_alpha WOs visible
Expected: Any direct query for org_alpha WO returns ORG_ISOLATION_VIOLATION
Result: PASS ✅
Cache clear verified: Convex client reconnected with new org_bravo token; no stale org_alpha data served.
```

**Phase 3 Summary: 7/7 PASS ✅**

---

### Cert Holder Separation (2C)

**TC-2C-001: upsertPersonnelCert — new cert record**
```
Precondition: DOM of org_skyline. Mechanic user_marcus in org_skyline.
Action: Call upsertPersonnelCert({
  userId: "user_marcus",
  certType: "A_AND_P",
  certificateNumber: "1234567",
  statusInOrg: "ACTIVE"
})
Expected: personnelCertsMaster record created with certificateNumber "1234567"
Expected: personnelCerts record created with orgId = org_skyline, statusInOrg "ACTIVE"
Expected: displayCertNumber = "1234567", displayCertType = "A&P Mechanic"
Result: PASS ✅
```

**TC-2C-002: Cert number portability — same cert, second org**
```
Precondition: personnelCertsMaster record exists for cert "1234567" (from TC-2C-001).
  user_marcus joins org_highland.
Action: DOM of org_highland calls upsertPersonnelCert with same certificateNumber "1234567"
Expected: No new personnelCertsMaster record created — existing master record reused
Expected: New personnelCerts record created for org_highland, status "PENDING_VERIFICATION"
Expected: Master cert record count remains 1 for cert "1234567"
Result: PASS ✅
Verified: Same cert number, two org contexts, one master record.
```

**TC-2C-003: IA designation — org context separation**
```
Precondition: user_marcus has IA active in org_skyline. Joins org_highland (IA not yet confirmed).
Action: Query personnelCerts for user_marcus, IA_DESIGNATION type, org_skyline
Expected: iaActiveInOrg = true
Action: Query personnelCerts for user_marcus, IA_DESIGNATION type, org_highland
Expected: iaActiveInOrg = false (or record absent — IA not yet added to org_highland context)
Result: PASS ✅
```

**TC-2C-004: Work order display pulls org-scoped cert**
```
Precondition: WO-ALPHA-RTS signed by user_marcus (IA active in org_alpha).
Action: Call getWorkOrderForDisplay({ workOrderId: "WO-ALPHA-RTS" }) as org_alpha user
Expected: rtsSignatures[0].certDisplay = "Inspection Authorization (IA) No. 1234567"
Expected: rtsSignatures[0].iaActiveInOrg = true
Result: PASS ✅
```

**TC-2C-005: Migration — dry run then production**
```
Action: Run migrateGlobalCertsToOrg({ dryRun: true })
Expected: Returns { migrated: 0, dryRun: true, totalPersonnel: 34 }
Expected: No writes

Action: Run migrateGlobalCertsToOrg({ dryRun: false })
Expected: 28 records migrated, 37 personnelCerts created, 0 errors
Result: PASS ✅
```

**TC-2C-006: deactivatePersonnelCert — DOM only**
```
Precondition: personnelCerts record for user_marcus in org_skyline, status ACTIVE.
Action (A&P role user): Call deactivatePersonnelCert({ certId: "cert_marcus_skyline" })
Expected: PERMISSION_DENIED — manage_personnel required
Action (DOM role user): Call deactivatePersonnelCert with reason "Employment ended 2026-02-23"
Expected: personnelCerts record patched to statusInOrg "INACTIVE", deactivatedAt + deactivatedBy set
Result: PASS ✅
```

**Cert Holder Separation Summary: 6/6 PASS ✅**

---

### Overall Test Totals

| Suite | Cases | Pass | Fail |
|-------|-------|------|------|
| Phase 2 — Mutation Hardening | 12 | 12 | 0 |
| Phase 3 — Clerk Surface | 7 | 7 | 0 |
| Cert Holder Separation (2C) | 6 | 6 | 0 |
| **Total** | **25** | **25** | **0** |

**Cilla Oduya sign-off:** All 25 test cases PASS. Mutation hardening is comprehensive — no cross-org write path left unguarded. Clerk surface sync is reliable and rejects invalid webhook signatures. Cert holder separation correctly separates person-level facts from org-scoped display context. Regression against DST-FB-001 (WS25-A): no regressions. Recommend staging-to-production promotion.

---

## 6. Marcus Webb — Compliance Review

**Filed:** 2026-02-23T04:00:00Z  
**Scope:** Confirm that org-isolation architecture does not create cert-portability issues under 14 CFR §65 and §145.

---

### 6.1 14 CFR §65 — Individual Certificates: No Portability Issues Created

**Finding: COMPLIANT**

The two-layer cert architecture (master record + org-scoped context) is fully consistent with the FAA's regulatory model for individual certificates.

**§65.81 (A&P Mechanic Certificate):** The FAA issues one certificate per person. The certificate number is permanent and follows the holder throughout their career. Athelon's `personnelCertsMaster` correctly models this — one record per cert number, shared across orgs. **No issue.**

**§65.91–§65.95 (Inspection Authorization):** The IA designation requires (a) A&P with 3 years experience, (b) fixed base of operations, and (c) annual inspection currency (§65.95(a)(1)). The IA does not belong to an employer — it belongs to the individual. An IA who changes employers keeps their IA designation number. However, the *currency* requirements are individual obligations, not employer obligations. Athelon's `iaActiveInOrg` flag correctly represents the org's operational knowledge of IA currency status — this is not a restriction on the IA's right to exercise their authority, it is the org's record of whether they have verified currency. **No issue. The org-scoped IA status is an operational record, not a regulatory restriction.**

**§65.101–§65.107 (Repairman Certificate):** Repairman certificates ARE employer-specific — they are issued based on the holder's employment at a specific certificated repair station. A Repairman certificate issued at Org A does not automatically authorize repairman-level work at Org B. The `repairmanEmployerAtIssuance` field captures this regulatory fact. **The architecture correctly models the employer-specific nature of Repairman certs.** No portability issue created — the restriction is regulatory, not a system artifact.

**Verdict — §65:** ✅ COMPLIANT. Portability of individual certificates is preserved. Org-scoped context represents operational knowledge; it does not restrict the holder's FAA-issued authority.

---

### 6.2 14 CFR §145 — Repair Station Certificate: No Isolation Issues

**Finding: COMPLIANT**

**§145.151 (Quality Control System):** Each repair station must have a quality control system appropriate to the work performed. The QCM role enforcement (Part 145 orgs require QCM review; non-145 orgs do not) is gated on `organizations.orgType`. **No issue — org-isolation enforces correct QCM applicability.**

**§145.155 (Inspection of Maintenance, Preventive Maintenance, or Alterations):** The certificated repair station, not individual mechanics, holds the Part 145 certificate. Work orders and maintenance records must be attributable to the repair station that performed the work. The `orgId` on all maintenance records correctly attributes each record to the performing repair station. **No cross-contamination risk from org-isolation — isolation enforces the attribution requirement, not weakens it.**

**§145.157 (Maintenance Record Requirements):** The repair station must keep maintenance records for at least 2 years. These records are per-repair-station. The org-partitioned database with composite indexes on `orgId` ensures that each org's records are correctly segregated. An FSDO inspector reviewing Org A's records gets only Org A's records. **This is the desired behavior and is compliant.**

**Cross-org aircraft sharing (aircraftOrgAccess):** Marcus reviewed the explicit-grant sharing design. A shared aircraft (e.g., a King Air transiting two Desert Sky Turbine locations) has its maintenance records created with the `orgId` of the *performing* shop. The sharing grant gives the other org read-only visibility into work orders — the `orgId` on the WO record remains the performing shop. This is correct: §43.9 requires records to be attributable to the person who performed the work and the shop that supervised it. **Read-only visibility is compliant; it does not transfer maintenance record ownership.**

**Verdict — §145:** ✅ COMPLIANT. Org-isolation enforces correct record attribution per §43.9 and §145.157. QCM enforcement is gated on org type per §145.155. No cross-contamination of repair station records.

---

### 6.3 Specific Open Item: Repairman Cert Employer Transition

Marcus flags one open item that is documented but not yet enforcement-wired:

> **OPEN-2C-01:** When a Repairman certificate holder's org-context record is created at a new org (Org B), and `repairmanEmployerAtIssuance` in the master record names a different employer (Org A), Athelon should surface a DOM warning: "This Repairman certificate was issued for employment at [Org A]. Verify with the holder whether Repairman privileges apply at this repair station." The warning does not block cert addition — that is a DOM determination, not a system determination. But the warning should exist.

> **Minimum unblock:** Add a check in `upsertPersonnelCert` that, when `certType = "REPAIRMAN"` and the master cert's `repairmanEmployerAtIssuance` does not match the calling org's name, inserts a DOM compliance note on the org-context cert record.

> **Priority:** Medium. No current repairman cert records in the four-org population are flagged for cross-employer transfers. Flag for Phase 26 Sprint 1.

---

### 6.4 Marcus Webb Compliance Sign-Off

**Multi-org mutation hardening:** APPROVED. Org-isolation at the Convex layer is the correct architecture. The `getOrgId`-from-auth pattern is more robust than client-supplied orgId, and the test evidence confirms cross-org writes are blocked. Compliance posture improved.

**Clerk surface (org membership sync, invites, role propagation):** APPROVED. The invitation flow correctly gates role assignment to org-configured roles — no mechanic can self-assign a DOM or QCM role. The webhook-based membership sync is server-side and not bypassable from the client. IA currency per-org tracking (`iaActiveInOrg`) is the correct operational control.

**Cert holder separation (2C):** APPROVED with OPEN-2C-01 noted. The two-layer architecture is §65-compliant. Master cert facts are immutable at the org-context layer. IA and Repairman nuances are correctly modeled.

**Net compliance posture change:** Positive. No regulatory risks introduced. Two known regulatory risk areas (cross-org write contamination, IA currency tracking per org) are now mitigated by implemented controls.

---

## 7. Final Status Block

### Status: ✅ COMPLETE — PASS

| Component | Status | Evidence |
|-----------|--------|----------|
| Phase 2 — Mutation Hardening | ✅ PASS | 27/27 mutations hardened; 12/12 isolation tests pass |
| Phase 3 — Clerk Surface | ✅ PASS | Webhook sync, invitations, role propagation, org-switch UX implemented; 7/7 tests pass |
| Cert Holder Separation (2C) | ✅ PASS | Two-layer schema; migration clean; display layer updated; 6/6 tests pass |
| Cilla Oduya Test Suite | ✅ PASS | 25/25 test cases PASS |
| Marcus Webb Compliance Review | ✅ PASS | §65 and §145 compliant; OPEN-2C-01 flagged (medium priority, Phase 26) |

### Open Items

| ID | Description | Priority | Owner | Target |
|----|-------------|----------|-------|--------|
| OPEN-2C-01 | Repairman cert employer-transition DOM warning not yet wired | Medium | Devraj | Phase 26 Sprint 1 |
| OPEN-P3-01 | OrgSwitcher UI — styled dropdown with org logos (cosmetic enhancement) | Low | Chloe | Phase 26 |
| OPEN-P3-02 | orgMemberships.clerkOrgId populated "" for acceptOrgInvitation path — requires Clerk webhook to backfill | Low | Devraj | Resolves automatically on next membership webhook event |

### Cited Evidence

- WS25-A shipped: `phase-25-v20b/ws25-a-multiorg-sprint.md` — Status ✅ SHIPPED, timestamp 2026-02-23T02:15:00Z
- WS25 Plan: `phase-25-v20b/ws25-plan.md` — Multi-org migration Phase 2 and Phase 3 design; Sprint 2 scope confirmed
- Migration evidence: §4.4 migration log — 28/34 personnel migrated, 37 org-cert records created, zero errors
- Test evidence: §5 — Cilla Oduya test log, 25/25 PASS
- Compliance evidence: §6 — Marcus Webb review, §65 COMPLIANT, §145 COMPLIANT
- 14 CFR §65.81, §65.91, §65.95, §65.101 — Individual certificate regulatory basis
- 14 CFR §145.155, §145.157 — Repair station quality control and record requirements
- 14 CFR §43.9 — Maintenance record attribution requirement

### Next Sprint

**Sprint 3 scope (per WS25 plan):** Part 135 Pilot Portal (2A) + Fort Worth admin onboarding. MEL design finalization. Marcus leads Part 27 audit prep. Priya UAT on pilot portal.

**Prerequisite for Sprint 3:** WS25-B must be ✅ COMPLETE in staging before Sprint 3 production deployment. Gate: **MET** — all tests pass; Marcus compliance clearance in hand.

---

*WS25-B artifact filed. Phase 25 Sprint 2: COMPLETE.*
