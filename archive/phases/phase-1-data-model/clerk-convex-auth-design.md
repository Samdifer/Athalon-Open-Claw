# Clerk ↔ Convex Auth Design
**Author:** Jonas Harker, DevOps / Platform
**Contributor:** Chloe Park, Frontend (inline notes marked `[CP]`)
**Date:** 2026-02-22
**Phase:** 1 — Foundation
**Status:** Draft — Pending Rafael sign-off

---

> *This document covers the complete auth contract between Clerk and Convex. Read it before writing a single Convex function that touches user context. The decisions here are not optional — if you freelance the auth model you will create a compliance finding. — JH*

---

## 1. Design Principles

Authentication lives in Clerk. Authorization lives in Convex. The boundary is strict.

Clerk is responsible for: verifying identity, issuing JWTs, managing sessions, handling MFA, and syncing org membership. Convex is responsible for: consuming those JWTs, enforcing role/permission checks on every query and mutation, and maintaining its own user record indexed to the Clerk identity.

The Next.js frontend sits in the middle: it reads session state from Clerk's React SDK, passes tokens to Convex via the Convex provider, and enforces route-level guards as a UX convenience (not a security control). Security happens in Convex. The frontend guards are for user experience.

> **[CP]** This distinction matters for how I structure route protection. The Next.js middleware will gate routes based on Clerk session state — but I treat that as "show the right page," not "prevent unauthorized access." The real gate is server-side in Convex. Any frontend-only auth gate is cosmetic.

---

## 2. Clerk Identity → Convex User Record

### 2.1 The Webhook Bridge

Clerk does not automatically create records in Convex. We maintain our own `users` table in Convex that mirrors the subset of Clerk user data we need for the application. The sync mechanism is a Clerk webhook → Convex HTTP action.

**Webhook events handled:**

| Clerk Event | Convex Action |
|---|---|
| `user.created` | Create `users` record with `clerkId`, `email`, `name`, `status: 'active'` |
| `user.updated` | Update `email`, `name`, `imageUrl` in `users` record |
| `user.deleted` | Set `users.status = 'deleted'`, archive their active sessions |
| `organizationMembership.created` | Add membership entry; assign default role for org |
| `organizationMembership.deleted` | Remove membership; revoke access to org data |
| `organizationMembership.updated` | Sync role changes from Clerk org metadata |
| `session.created` | Log session event (audit trail) |
| `session.ended` | Log session termination event |

**Convex HTTP action — webhook receiver:**

```
/convex/http.ts
/convex/webhooks/clerk.ts
```

```typescript
// convex/webhooks/clerk.ts
import { httpAction } from "../_generated/server";
import { Webhook } from "svix";
import { internal } from "../_generated/api";

export const clerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) throw new Error("Missing CLERK_WEBHOOK_SIGNING_SECRET");

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: WebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
      await ctx.runMutation(internal.users.syncFromClerk, {
        clerkId: event.data.id,
        email: event.data.email_addresses[0]?.email_address ?? "",
        firstName: event.data.first_name ?? "",
        lastName: event.data.last_name ?? "",
        imageUrl: event.data.image_url,
      });
      break;
    case "user.deleted":
      await ctx.runMutation(internal.users.markDeleted, {
        clerkId: event.data.id!,
      });
      break;
    // ... other cases
  }

  return new Response(null, { status: 200 });
});
```

### 2.2 Convex Users Table Schema

```typescript
// convex/schema.ts (users table definition)
users: defineTable({
  clerkId: v.string(),           // Clerk user ID — the canonical join key
  email: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  imageUrl: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("suspended"),
    v.literal("deleted")
  ),
  createdAt: v.number(),         // Unix ms
  lastSeenAt: v.optional(v.number()),
  // Global admin flag — separate from org roles. Only Athelon staff.
  isSystemAdmin: v.boolean(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_status", ["status"]),
```

The `clerkId` index is the primary lookup path. Every Convex function that needs to identify the current user goes through `ctx.auth.getUserIdentity()` → gets the Clerk subject (`sub` claim) → queries `users` by `clerkId`. This is the only safe lookup path. Never trust a user-supplied ID.

### 2.3 Identity Resolution Pattern (Used Everywhere)

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User record not found — webhook may not have processed yet");
  }
  if (user.status !== "active") {
    throw new Error("Account suspended or deleted");
  }

  return user;
}
```

This function is called at the top of every protected Convex query and mutation. Non-negotiable.

---

## 3. Role and Permission Model

### 3.1 MRO Roles — Canonical Definitions

Aviation MRO operations have a well-defined authority hierarchy. These are not invented — they map to 14 CFR Part 145 job functions.

| Role Slug | Display Name | FAA Analog | Authority Level |
|---|---|---|---|
| `dom` | Director of Maintenance | DOM (14 CFR 145.153) | 5 — Highest |
| `supervisor` | Maintenance Supervisor | Supervisor | 4 |
| `inspector` | Quality Control Inspector | QC Inspector (145.155) | 3 |
| `amt` | Aviation Maintenance Technician | AMT (A&P certificate holder) | 2 |
| `viewer` | Read-Only Viewer | — | 1 — Lowest |

**Additional internal role (not customer-facing):**

| Role Slug | Display Name | Notes |
|---|---|---|
| `system_admin` | Athelon System Admin | Athelon staff only. Bypasses org boundaries for support. `isSystemAdmin` flag in users table, not in org roles. |

> **[CP]** I need these role slugs to be stable string literals I can use in TypeScript discriminated unions for UI gating. If these ever change, I need a heads up — they're baked into the component props types and the route guard map. Don't rename them without a migration plan.

### 3.2 Role Storage — Where It Lives

Roles are stored in **two places** that must stay in sync:

1. **Clerk `publicMetadata` on the organization membership:** This makes the role available in the JWT without an extra round-trip. Clerk's organization membership has a `role` field and a `publicMetadata` field on the membership object.

2. **Convex `orgMemberships` table:** The authoritative server-side record. Convex always reads from here, not from JWT claims alone. JWT claims are used for routing; Convex verifies against its own table.

```typescript
// convex/schema.ts (orgMemberships table)
orgMemberships: defineTable({
  userId: v.id("users"),
  orgId: v.id("orgs"),
  clerkOrgId: v.string(),       // Clerk organization ID
  role: v.union(
    v.literal("dom"),
    v.literal("supervisor"),
    v.literal("inspector"),
    v.literal("amt"),
    v.literal("viewer")
  ),
  grantedAt: v.number(),
  grantedBy: v.optional(v.id("users")),
  isActive: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_user_and_org", ["userId", "orgId"]),
```

### 3.3 Permission Matrix

What each role can do. These gates are enforced in Convex mutations — not in the UI.

| Permission | Viewer | AMT | Inspector | Supervisor | DOM |
|---|---|---|---|---|---|
| View work orders (own org) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create work order | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit open work order | ❌ | ✅ (own) | ✅ | ✅ | ✅ |
| Sign task card (certifying) | ❌ | ✅ (cert. items) | ✅ | ✅ | ✅ |
| Approve return to service | ❌ | ❌ | ✅ | ❌ | ✅ |
| Request parts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Issue parts | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage org users | ❌ | ❌ | ❌ | ❌ | ✅ |
| View compliance reports | ❌ | ❌ | ✅ | ✅ | ✅ |
| Archive records | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export org data | ❌ | ❌ | ❌ | ❌ | ✅ |

### 3.4 Permission Helper (Convex)

```typescript
// convex/lib/permissions.ts
import { Doc } from "../_generated/dataModel";

export type MroRole = "dom" | "supervisor" | "inspector" | "amt" | "viewer";

const ROLE_LEVEL: Record<MroRole, number> = {
  viewer: 1,
  amt: 2,
  inspector: 3,
  supervisor: 4,
  dom: 5,
};

export function hasMinimumRole(
  membership: Doc<"orgMemberships">,
  minimum: MroRole
): boolean {
  return ROLE_LEVEL[membership.role] >= ROLE_LEVEL[minimum];
}

export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"orgs">,
  minimumRole: MroRole
): Promise<Doc<"orgMemberships">> {
  const membership = await ctx.db
    .query("orgMemberships")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("orgId", orgId)
    )
    .unique();

  if (!membership || !membership.isActive) {
    throw new Error("Not a member of this organization");
  }
  if (!hasMinimumRole(membership, minimumRole)) {
    throw new Error(`Insufficient role. Required: ${minimumRole}, actual: ${membership.role}`);
  }

  return membership;
}
```

Usage in a Convex mutation:

```typescript
// convex/workOrders.ts
export const createWorkOrder = mutation({
  args: {
    orgId: v.id("orgs"),
    aircraftId: v.id("aircraft"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOrgMembership(ctx, user._id, args.orgId, "amt");
    // ... create work order
  },
});
```

> **[CP]** For the frontend role gates, I'm building a `useOrgRole()` hook that reads from the Clerk session's org membership. That gives me the role synchronously without a Convex query on every render. I'll use it for showing/hiding UI elements. It does NOT replace the server-side check — just reduces the number of "forbidden" flashes users see.

---

## 4. JWT Claims → Convex Auth Context

### 4.1 How Clerk JWTs Work in Convex

Convex accepts Clerk-issued JWTs via the `ConvexProviderWithClerk` component. The Clerk SDK automatically refreshes tokens and passes them to Convex. On the Convex side, `ctx.auth.getUserIdentity()` decodes the JWT and returns the identity object.

**Required Convex JWT template configuration in Clerk dashboard:**

Navigate to: Clerk Dashboard → JWT Templates → New Template → Convex

```json
{
  "aud": "convex",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.full_name}}",
  "org_id": "{{org.id}}",
  "org_role": "{{org.role}}",
  "org_slug": "{{org.slug}}",
  "org_metadata": "{{org.public_metadata}}"
}
```

**Custom claims we add to the JWT template:**

```json
{
  "athelon_role": "{{org.public_metadata.athelon_role}}",
  "station_codes": "{{org.public_metadata.station_codes}}"
}
```

The `athelon_role` claim is the MRO role slug for the active org. This gets baked into the JWT so Convex can do a quick sanity check before hitting the database, but the database membership record is always the authoritative source.

### 4.2 Convex Auth Configuration

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

Environment variable: `CLERK_JWT_ISSUER_DOMAIN` = `https://<your-clerk-instance>.clerk.accounts.dev`

This must be set in the Convex dashboard (not in Vercel — this is a Convex-side config).

### 4.3 Identity Object Shape

After `ctx.auth.getUserIdentity()`, the returned object has:

```typescript
interface UserIdentity {
  tokenIdentifier: string;  // Clerk user ID, prefixed: "https://...clerk...|user_xxxx"
  subject: string;          // Clerk user ID: "user_xxxx" — use this as clerkId
  issuer: string;
  email?: string;
  name?: string;
  // Custom claims from JWT template:
  org_id?: string;          // Active Clerk org ID
  org_role?: string;        // Clerk org role ("org:admin", "org:member", etc.)
  athelon_role?: string;    // Our MRO role slug
  station_codes?: string[]; // Station/base codes the user can access
}
```

**Important:** `org_id` is the Clerk org ID of whichever org was active when the token was issued. If the user switches orgs, a new token is issued. Convex functions use this to scope data access to the correct org without requiring the frontend to pass an `orgId` argument on every call.

### 4.4 Org-Scoped Function Pattern

```typescript
// convex/lib/auth.ts (extended)
export async function requireOrgContext(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const clerkOrgId = identity.org_id;
  if (!clerkOrgId) throw new Error("No active organization context");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user || user.status !== "active") throw new Error("Invalid user");

  const org = await ctx.db
    .query("orgs")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique();

  if (!org) throw new Error("Organization not found");

  const membership = await ctx.db
    .query("orgMemberships")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", user._id).eq("orgId", org._id)
    )
    .unique();

  if (!membership || !membership.isActive) {
    throw new Error("Not an active member of this organization");
  }

  return { user, org, membership };
}
```

Every query/mutation that touches org-scoped data calls `requireOrgContext()`. This eliminates the entire class of "wrong org" data leakage bugs.

---

## 5. Multi-Org Support (Multiple Stations / Bases)

### 5.1 The Problem

An MRO operator may run multiple repair stations under one parent company — for example, Station Alpha at ATL and Station Bravo at ORD. Each station has its own FAA repair station certificate (RS cert number) and its own maintenance records. Users (especially DOMs) may need access to multiple stations.

### 5.2 Mapping

```
Athelon "Org" (Convex) ← maps 1:1 to → Clerk Organization
Athelon "Station" (sub-entity)           may exist within an org OR may be its own org
```

**Phase 1 decision:** Each repair station is its own Clerk organization. A DOM who oversees two stations is a member of two Clerk organizations. A user who belongs to multiple orgs uses Clerk's org switching to change context.

This is the simplest model that keeps Clerk's JWT org context clean. An org = a station. No multi-org JWT complexity in Phase 1.

```typescript
// convex/schema.ts (orgs table)
orgs: defineTable({
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.string(),
  // FAA-specific fields
  repairStationCertNumber: v.optional(v.string()),  // e.g. "ZSW7R036B"
  stationCode: v.string(),                          // Internal code, e.g. "ATL-01"
  icaoCode: v.optional(v.string()),                 // Airport ICAO if applicable
  ratings: v.array(v.string()),                     // e.g. ["Class I Airframe", "Class I Powerplant"]
  // Subscription / billing
  subscriptionTier: v.union(
    v.literal("trial"),
    v.literal("standard"),
    v.literal("enterprise")
  ),
  subscriptionStatus: v.union(
    v.literal("active"),
    v.literal("past_due"),
    v.literal("canceled")
  ),
  // Audit
  createdAt: v.number(),
  isActive: v.boolean(),
})
  .index("by_clerk_org_id", ["clerkOrgId"])
  .index("by_station_code", ["stationCode"]),
```

### 5.3 Org Switching (Frontend)

> **[CP]** Clerk has a built-in org switcher. I'm wrapping it in a custom `<StationSwitcher />` component that shows the station name and ICAO code alongside the Clerk org name — because "ATL-01" is more meaningful to a mechanic than the internal org display name. When a user switches orgs, Clerk issues a new JWT with the new org context. The Convex provider picks this up automatically — no manual token refresh needed. The whole app re-renders with the new org scope.

```typescript
// app/components/StationSwitcher.tsx
"use client";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function StationSwitcher() {
  const { organization } = useOrganization();
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  // Pull station metadata from Convex for display
  const stationMeta = useQuery(api.orgs.getActiveStationMeta);

  return (
    <div className="station-switcher">
      <span className="station-label">
        {stationMeta?.stationCode} — {stationMeta?.name}
      </span>
      {/* Org list for switching */}
      {userMemberships.data?.map((mem) => (
        <button
          key={mem.organization.id}
          onClick={() => setActive({ organization: mem.organization.id })}
        >
          {mem.organization.name}
        </button>
      ))}
    </div>
  );
}
```

### 5.4 Data Isolation Guarantee

Every Convex query that touches operational data (work orders, aircraft, task cards, parts) includes an org filter. This is enforced by the `requireOrgContext()` pattern — the org ID is derived from the JWT, not from user input. A user cannot access another org's data by crafting a different org ID in their request.

**No cross-org data leakage by design:** Queries are always `withIndex("by_org", (q) => q.eq("orgId", org._id))`. There is no "all orgs" query path for non-system-admin users.

---

## 6. Session Management and Token Expiry Strategy

### 6.1 Session Duration

| Role | Session Duration | MFA Re-auth Trigger |
|---|---|---|
| `viewer` | 24 hours | On new device only |
| `amt` | 8 hours | After expiry |
| `inspector` | 8 hours | After expiry + before signing |
| `supervisor` | 8 hours | After expiry |
| `dom` | 4 hours | After expiry (Phase 2: enforce) |

8 hours = one standard maintenance shift. This is intentional. A logged-in mechanic who leaves their terminal at the end of a shift should not be session-active when the next shift starts.

Clerk session duration is configured per Clerk instance (not per org in Phase 1). Phase 1 default: 8 hours. DOM 4-hour policy enforced in Phase 2 when MFA becomes mandatory.

### 6.2 JWT Expiry — Convex Behavior

Convex's `ConvexProviderWithClerk` automatically refreshes JWTs before expiry using Clerk's `getToken()`. The refresh happens in the background. From the user's perspective, sessions feel continuous until Clerk's session itself expires.

**When the Clerk session expires:**
- Clerk redirects to sign-in
- Convex queries that require auth return `null` from `getUserIdentity()`
- The Next.js middleware catches the unauthenticated state and redirects

### 6.3 Token Refresh Configuration

```typescript
// app/providers.tsx
"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      // Emit JWT with Convex template on every token refresh
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/onboarding"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

> **[CP]** The `afterSignInUrl` and `afterSignUpUrl` will need to route through an onboarding check — if the user has no org membership yet, they should hit `/onboarding` not `/dashboard`. I'll add a middleware redirect that checks for active org membership before allowing `/dashboard` access.

### 6.4 Pre-Action Re-Authentication (High-Stakes Operations)

Certain actions in MRO require a deliberate "I confirm this is me" step beyond just being logged in. Specifically: signing a task card, approving return to service, and exporting data.

**Implementation:** Before these actions, the frontend triggers Clerk's re-auth flow (`clerk.authenticateWithRedirect` or a step-up modal). On completion, a fresh short-lived token (15 minutes) is issued and passed to Convex. Convex checks `identity.tokenIssuedAt` and rejects if older than 15 minutes for these specific mutations.

```typescript
// convex/taskCards.ts
export const signTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    signatureType: v.union(v.literal("certifying"), v.literal("inspection")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // For signing actions, token must be fresh (< 15 minutes old)
    const tokenAge = Date.now() - (identity.tokenIssuedAt ?? 0) * 1000;
    if (tokenAge > 15 * 60 * 1000) {
      throw new Error("TOKEN_STALE: Re-authentication required for this action");
    }

    const { user, org, membership } = await requireOrgContext(ctx);
    await requireOrgMembership(ctx, user._id, org._id, "amt");

    // ... sign the task card, write audit record
  },
});
```

> **[CP]** When Convex returns `TOKEN_STALE`, the frontend catches this specific error code and triggers the re-auth modal rather than showing a generic error. I'll add an error boundary that intercepts Convex errors with known codes. This makes the re-auth feel intentional, not broken.

### 6.5 Clerk Middleware (Next.js Edge)

```typescript
// middleware.ts (project root)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

The webhook endpoint (`/api/webhooks/clerk`) is explicitly public — Clerk pushes to it and cannot authenticate as a user.

---

## 7. Environment Variables Reference

### Frontend (Vercel)

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key for browser SDK | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk server-side key (never exposed to browser) | `sk_live_...` |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | `https://...convex.cloud` |
| `CLERK_WEBHOOK_SECRET` | Signing secret for validating Clerk webhooks | `whsec_...` |

### Convex (set in Convex dashboard)

| Variable | Purpose |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk instance domain for JWT verification |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Validate incoming webhook payloads |

**Naming conventions:**
- `NEXT_PUBLIC_` prefix: browser-safe, exposed to client bundle
- No prefix: server-only, never in browser bundle
- All uppercase, underscore-separated
- Product prefix: `CLERK_`, `CONVEX_` — no ambiguous naked names like `SECRET_KEY`

---

## 8. Audit Trail

Every mutation that modifies a record with compliance implications writes an audit event. This is not optional.

```typescript
// convex/schema.ts (auditLog table)
auditLog: defineTable({
  userId: v.id("users"),
  orgId: v.id("orgs"),
  action: v.string(),             // e.g. "task_card.signed", "work_order.created"
  entityType: v.string(),         // e.g. "taskCard", "workOrder"
  entityId: v.string(),           // Convex document ID as string
  metadata: v.optional(v.any()), // Snapshot of relevant data at time of action
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
  retentionPolicy: v.literal("permanent"), // Audit logs never deleted
})
  .index("by_org_and_time", ["orgId", "createdAt"])
  .index("by_entity", ["entityType", "entityId"])
  .index("by_user", ["userId"]),
```

Clerk's own auth event log (login, logout, MFA) is separate and available in the Clerk dashboard. In Phase 2 we forward it via webhook to our own audit log for unified reporting.

---

*Questions: #platform-infra on Slack. If it's not in this document, it hasn't been decided yet — ask before implementing.*
