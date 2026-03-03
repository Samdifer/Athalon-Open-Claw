# Athelon — Auth & Platform Wiring
**Document Type:** Phase 3 Implementation Specification  
**Authors:** Jonas Harker (DevOps/Platform) · Chloe Park (Frontend Engineer, inline as `> [CHLOE]`)  
**Date:** 2026-02-22  
**Status:** AUTHORITATIVE — Phase 3 implementation begins against this document  
**Resolves:** BP-09 (re-auth modal mechanism), OI-03 (Clerk→Convex→frontend push)  
**References:** `convex-schema-v2.md` · `signoff-rts-flow.md §5` · `frontend-architecture.md §4` · Phase 2 Gate Review (BP-09)

---

## Jonas's Prefatory Note

Phase 2 left one platform decision open: how does a Clerk re-authentication event get from the webhook handler into a `signatureAuthEvent` in Convex and surface to the waiting frontend modal. That was OI-03 / BP-09. It is now decided. This document is the decision.

Ground rules. **We do not trust the client.** Every auth assertion is verified server-side. The Clerk JWT is verified by Convex on every request. The webhook payload is verified by Svix HMAC before any processing occurs. The frontend does not tell the backend who the user is — the backend derives identity from the verified token. If any verification fails, we throw and log it. **The signing chain is an audit trail.** Every component produces a log entry or is itself the permanent record. A SOC-2 Type II auditor reconstructing a year of maintenance signatures must never need to rely on a single system's logs. **TTLs are enforced by the backend.** The 5-minute TTL on `signatureAuthEvents` is not a frontend timer. The client cannot extend, pause, or spoof it.

---

## Section 1: Clerk↔Convex Integration Architecture

### 1.1 Identity and Org Context Propagation

`ConvexProviderWithClerk` wraps the application and attaches the Clerk JWT to every Convex request. Convex verifies this JWT against the Clerk JWKS endpoint on every call — no caching, no client trust.

JWT claims available in all Convex functions via `ctx.auth.getUserIdentity()`:

| Claim | Source | Used For |
|---|---|---|
| `identity.subject` | Clerk user ID (`user_2abc…`) | Linking to `technicians.userId` |
| `identity.org_id` | Active Clerk org (`org_2xyz…`) | Data scoping — never passed as arg |
| `identity.athelon_role` | Custom JWT template claim | Role-based access enforcement |

**Org context rule:** Every Convex function that touches org-scoped data derives `orgId` from the JWT's `org_id` claim via `requireOrgContext()`. The frontend never passes `orgId` as a mutation argument. Client-supplied org IDs are rejected.

The `athelon_role` claim is populated by the **Clerk JWT Template** `athelon-convex`:

```json
{ "athelon_role": "{{org.membership.role}}", "org_id": "{{org.id}}", "org_slug": "{{org.slug}}" }
```

Token lifetime: **60 seconds**. Role changes propagate to all Convex requests within one minute — no sign-out required.

### 1.2 Webhook Registration

All Clerk lifecycle webhooks are delivered to `https://[vercel-deployment]/api/webhooks/clerk`. This route is public (no Clerk middleware) and protected instead by Svix HMAC verification. Every request is HMAC-verified before any processing begins. Verification failure returns HTTP 400 — Clerk does not retry 4xx.

**Subscribed events:**

| Event | Action |
|---|---|
| `user.created` | Look up or create linked technician record |
| `user.updated` | Update technician snapshot (name, email) |
| `organizationMembership.created` | Verify technician record exists for org |
| `organizationMembership.deleted` | Mark technician inactive; do not delete |
| **`session.reAuthenticated`** | **→ Create `signatureAuthEvent` (the critical path)** |

`session.created` and `session.ended` are not subscribed — volume is high, no Convex write is required. Those events are retained in Clerk's own logs, which satisfy SOC-2 session audit requirements.

Webhook payload verification before any routing:

```typescript
// app/api/webhooks/clerk/route.ts — abbreviated
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
try {
  evt = wh.verify(body, { "svix-id": ..., "svix-timestamp": ..., "svix-signature": ... });
} catch {
  return new Response("Invalid signature", { status: 400 }); // Log this — it is a security event
}
await routeWebhookToConvex(evt);
```

---

## Section 2: `signatureAuthEvent` Creation Flow

### 2.1 End-to-End Path

```
User authenticates in ReAuthModal
  → Clerk fires session.reAuthenticated webhook → /api/webhooks/clerk
  → Next.js handler: HMAC verified, payload forwarded to Convex HTTP action
  → Convex HTTP action: technician looked up, signatureAuthEvent inserted (TTL 5 min)
  → Frontend useQuery subscription receives new event → eventId returned to modal
  → Signing mutation: event checked (unconsumed + not expired) → atomically consumed → legal record created
```

Each step is irreplaceable. Any failure leaves no partial state — either the event exists and is valid, or it does not exist. There is no intermediate state for the signing mutation to reason about.

### 2.2 Convex HTTP Action — `webhooks/sessionReAuthenticated`

**Approved `authMethod` mapping from Clerk `factor_one_verification.strategy`:**

| Clerk Strategy | `authMethod` |
|---|---|
| `password` | `"password"` |
| `phone_code` | `"mfa_sms"` |
| `totp` | `"mfa_totp"` |
| Biometric (platform authenticator) | `"biometric"` |
| Custom PIN flow | `"pin"` |
| Any other (e.g., `web3_metamask_signature`) | **Reject — HTTP 422, audit log written** |

Action execution sequence:

1. Map `factor_one_verification.strategy` → `authMethod`. If unmapped → 422 + audit log. No event created.
2. Look up `technicians` by `userId`. If not found → 422 + audit log. If `technician.status !== "active"` → 403 + audit log.
3. Fetch active certificate for `technicianId` (for `authenticatedCertNumber` snapshot).
4. Check `by_clerk_event` index for existing event with same `clerkEventId`. If found and unconsumed → return existing `signatureAuthEventId` (idempotency). If found and consumed → 409.
5. Insert `signatureAuthEvent`:

| Field | Value |
|---|---|
| `clerkEventId` | Webhook event ID — idempotency key |
| `clerkSessionId` | `payload.data.id` |
| `userId` | `payload.data.user_id` |
| `technicianId` | Resolved from userId |
| `authenticatedLegalName` | `technician.legalName` (snapshot) |
| `authenticatedCertNumber` | Active certificate number (snapshot) |
| `authMethod` | Mapped per table above |
| `ipAddress` / `userAgent` | From `payload.data.request_data` — optional |
| `authenticatedAt` | `Date.now()` — server time, not client-reported |
| `expiresAt` | `authenticatedAt + 300_000` (5 minutes) |
| `consumed` | `false` |

6. Write `auditLog` entry: `eventType="record_created"`, `tableName="signatureAuthEvents"`, with `userId`, `technicianId`, `authMethod`, IP, UA.
7. Return `{ signatureAuthEventId }` with HTTP 200.

**Error handling / Clerk retry:** On Convex internal error (step 3–6 throws), HTTP action returns 500. Clerk retries with exponential backoff (up to 3 attempts, ~30 minutes). The frontend re-auth poll times out after 10 seconds; the user sees `<ReAuthTimeoutError>` and may retry. No partial state is left because Convex transactions are atomic — a failed insert produces no document.

---

## Section 3: Auth Helper Functions

All protected Convex queries and mutations call these helpers as their first statement. This is not a convention — it is enforced in code review. A mutation without `requireUser()` does not merge.

### 3.1 `requireUser(ctx)`

```typescript
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "AUTH_REQUIRED" });
  return identity;
}
```

Checks: Clerk JWT is present and cryptographically valid (Convex verifies against JWKS). JWT is not expired.  
Throws: `AUTH_REQUIRED` → frontend shows `<SignInRedirect />`.  
Does NOT check: org membership, role, technician record existence.

### 3.2 `requireOrgContext(ctx)`

```typescript
export async function requireOrgContext(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await requireUser(ctx);
  const orgId = (identity as any).org_id as string | undefined;
  if (!orgId) throw new ConvexError({ code: "NO_ORG_CONTEXT" });
  return orgId;
}
```

Checks: `org_id` claim is present in JWT (Clerk sets this when user has an active org).  
Throws: `NO_ORG_CONTEXT` → frontend shows `<OrgSwitcherPrompt />`.  
Implies `requireUser()` — calling `requireOrgContext()` alone is sufficient.

No database lookup. The org ID from the JWT is the authoritative org context. Querying `organizations` on every request is wasteful and unnecessary — foreign key relationships handle integrity.

### 3.3 `requireOrgMembership(ctx, minRole)`

```typescript
type MroRole = "viewer" | "amt" | "inspector" | "supervisor" | "dom";
const ROLE_LEVEL: Record<MroRole, number> = { viewer: 1, amt: 2, inspector: 3, supervisor: 4, dom: 5 };

export async function requireOrgMembership(ctx: QueryCtx | MutationCtx, minRole: MroRole) {
  const identity = await requireUser(ctx);
  const orgId = await requireOrgContext(ctx);
  const role = ((identity as any).athelon_role as MroRole) ?? "viewer";

  if (ROLE_LEVEL[role] < ROLE_LEVEL[minRole]) {
    throw new ConvexError({ code: "INSUFFICIENT_ROLE", required: minRole, current: role });
  }
  return { orgId, role, identity };
}
```

Checks: JWT present, org context present, `athelon_role` claim meets or exceeds `minRole`.  
Throws: `INSUFFICIENT_ROLE` with both `required` and `current` role in payload → frontend `<ForbiddenState>`.

Usage in signing mutations:

```typescript
// authorizeReturnToService — requires inspector or higher
const { orgId } = await requireOrgMembership(ctx, "inspector");
// orgId is now safe to use for all data scoping
```

The 60-second JWT TTL means role changes take effect within one minute without requiring sign-out. Correct tradeoff for a regulated environment.

---

## Section 4: Re-Auth Modal → Convex Push Mechanism (BP-09 Resolution)

### 4.1 Decision

> **Mechanism: Clerk webhook push to Convex + Convex reactive subscription on the frontend.**

BP-09 is resolved. The two options evaluated were:

| Option | Description | Decision |
|---|---|---|
| **A — Webhook push + reactive subscription** | Clerk fires `session.reAuthenticated` → Convex HTTP action inserts event → frontend Convex subscription receives push | **CHOSEN** |
| **B — Frontend-initiated Convex action** | Frontend calls Convex action that orchestrates Clerk re-auth and awaits result | Rejected |

Option B is architecturally inverted. Convex actions should not orchestrate Clerk UI flows. Clerk owns re-auth. The webhook is the notification boundary. Convex receives the notification and creates the record. Each system does what it does.

Option A is not a polling architecture. `useQuery` in Convex is a WebSocket-backed reactive subscription. When the `signatureAuthEvent` document is inserted, Convex invalidates the subscription and pushes the update to the subscribing client in ~100ms. The frontend-side 10-second timer is a **timeout guard for failure modes only** — not a poll interval.

### 4.2 `useSignatureAuthEvent` Hook Specification

```typescript
// lib/hooks/useSignatureAuthEvent.ts

const TIMEOUT_MS = 10_000;   // 10s — surface ReAuthTimeoutError
const MAX_AGE_MS = 30_000;   // Ignore events older than 30s (prevents stale event surfacing)

export type AuthEventState =
  | { status: "waiting" }
  | { status: "ready"; eventId: Id<"signatureAuthEvents"> }
  | { status: "timeout" }

export function useSignatureAuthEvent(enabled: boolean): AuthEventState {
  const mountTime = useRef(Date.now());
  const [state, setState] = useState<AuthEventState>({ status: "waiting" });

  const event = useQuery(
    api.signatureAuthEvents.getPendingForCurrentUser,
    enabled ? { minCreatedAt: mountTime.current - MAX_AGE_MS } : "skip"
  );

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setState({ status: "timeout" }), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (event && state.status === "waiting") setState({ status: "ready", eventId: event._id });
  }, [event, state.status]);

  return state;
}
```

> **[CHLOE]** `enabled` goes `true` the moment the user submits their PIN / password in `<ReAuthModal>`. Before that, the query is skipped — we must not surface a stale event from a previous re-auth session. `minCreatedAt` (30s lookback) prevents a consumed-then-retried scenario from surfacing an old event. The 10-second timeout covers webhook non-delivery and Convex HTTP action errors — in the happy path, the event arrives in 200–500ms total. On timeout, show `<ReAuthTimeoutError>` with a "Try Again" button that remounts the hook with a fresh `mountTime`. On retry, if the webhook was eventually delivered, the subscriber finds the event immediately.

> **[CHLOE]** UX state sequence inside `<ReAuthModal>`:
> 1. User enters credentials → Submit → button shows `<Spinner label="Verifying..." />`
> 2. Clerk processes re-auth (< 1s typical) → webhook fires → Convex inserts event → subscription pushes
> 3. Hook transitions to `status: "ready"` → modal shows brief `<SuccessState label="Identity confirmed" />` (500ms)
> 4. Modal closes → parent wizard Step 5 receives `eventId` → advances to Step 6 (Final Confirmation)
> On timeout: `<ReAuthTimeoutError>` replaces spinner. "Try Again" remounts hook cleanly.

### 4.3 Convex Query — `getPendingForCurrentUser`

```typescript
export const getPendingForCurrentUser = query({
  args: { minCreatedAt: v.number() },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const event = await ctx.db
      .query("signatureAuthEvents")
      .withIndex("by_user_timestamp", (q) =>
        q.eq("userId", identity.subject).gte("authenticatedAt", args.minCreatedAt))
      .filter((q) => q.eq(q.field("consumed"), false))
      .order("desc")
      .first();

    if (event && event.expiresAt > Date.now()) return event;
    return null;
  },
});
```

This query is a live Convex reactive subscription. When the HTTP action inserts a `signatureAuthEvent` for this user, Convex invalidates the subscription and delivers the update to the frontend without any client-initiated poll.

---

## Section 5: Auth Test Suite

The following 12 scenarios must pass before Jonas signs Phase 3 auth. These are integration tests against a dedicated Convex test deployment with Clerk test-mode credentials.

**AUTH-01 — Valid re-auth → event inserted**  
`Given` active technician, valid A&P cert, strategy=`password`. `When` `session.reAuthenticated` webhook fires. `Then` `signatureAuthEvent` created: `consumed=false`, `expiresAt = authenticatedAt + 300_000`, `authMethod="password"`, `technicianId` and `authenticatedLegalName` correct. `auditLog` entry: `eventType="record_created"`, `tableName="signatureAuthEvents"`.

**AUTH-02 — Inactive technician → rejected**  
`Given` user whose linked technician has `status="inactive"`. `When` webhook fires. `Then` HTTP 403, no event inserted, audit log `eventType="access_denied"`.

**AUTH-03 — Unapproved auth strategy → rejected**  
`Given` any active technician. `When` webhook fires with `strategy="web3_metamask_signature"`. `Then` HTTP 422, no event inserted, `access_denied` audit log.

**AUTH-04 — Duplicate webhook delivery (idempotency)**  
`Given` same `clerkEventId` already processed (event exists, `consumed=false`). `When` same payload delivered again. `Then` HTTP 200 returns existing `signatureAuthEventId`. No second event created. `expiresAt` unchanged.

**AUTH-05 — `requireUser` rejects unauthenticated requests**  
`Given` no Clerk JWT (or expired JWT). `When` any protected query/mutation called. `Then` `ConvexError { code: "AUTH_REQUIRED" }`. No data returned or written.

**AUTH-06 — `requireOrgContext` rejects absent org**  
`Given` authenticated user with no `org_id` in JWT. `When` any org-scoped function called. `Then` `ConvexError { code: "NO_ORG_CONTEXT" }`. Frontend shows `<OrgSwitcherPrompt>`.

**AUTH-07 — `requireOrgMembership` rejects insufficient role**  
`Given` user with `athelon_role="amt"`. `When` `authorizeReturnToService` called (requires `inspector`). `Then` `ConvexError { code: "INSUFFICIENT_ROLE", required: "inspector", current: "amt" }`. No event consumed. No record created.

**AUTH-08 — Expired event → signing mutation rejects**  
`Given` `signatureAuthEvent` with `expiresAt = Date.now() - 1000`. `When` signing mutation called with this event ID. `Then` throws `RTS_AUTH_EVENT_EXPIRED`. Event NOT consumed (`consumed` remains `false`). Audit log: `access_denied` with event ID.

**AUTH-09 — Already-consumed event → signing mutation rejects**  
`Given` `signatureAuthEvent` with `consumed=true`. `When` any signing mutation called with this event ID. `Then` throws with code `RTS_AUTH_EVENT_CONSUMED`. No second legal record created. Audit log: `access_denied`.

**AUTH-10 — Org boundary — no cross-org data leakage**  
`Given` Org-A and Org-B. User is member of Org-A; JWT has `org_id = org_A_id`. `When` user calls any query targeting a known Org-B record ID. `Then` query returns `null` or `NOT_FOUND` (data-scoped by JWT `orgId`, not by arg). Org-B data never returned.

**AUTH-11 — Valid end-to-end sign-off — event created, consumed, record immutable**  
`Given` active IA technician, work order in `pending_signoff`, all nine preconditions satisfied. `When` full re-auth flow runs and `authorizeReturnToService` executes. `Then` `signatureAuthEvent.consumed=true`, `consumedAt` set, `consumedByTable="returnToService"`, `consumedByRecordId` = new `returnToService._id`. Work order `status="closed"`. Aircraft `status="airworthy"`. Audit log entries present for: event created, event consumed, record signed, WO status changed, aircraft status changed. `returnToService` document has no `updatedAt` field.

**AUTH-12 — Re-auth timeout → no partial state**  
`Given` frontend hook mounted (`enabled=true`). `When` 10 seconds elapse with no event delivered. `Then` hook returns `status="timeout"`. No `signatureAuthEvent` exists in DB. User clicks "Try Again" → hook remounts with fresh `mountTime` → if webhook was eventually delivered, event surfaced immediately.

---

## Section 6: Deployment Configuration

### 6.1 Vercel Environment Variables

| Variable | Environment | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All | Clerk browser SDK |
| `CLERK_SECRET_KEY` | All | Clerk server-side SDK |
| `NEXT_PUBLIC_CONVEX_URL` | All | Convex WebSocket/HTTPS endpoint |
| `CLERK_WEBHOOK_SECRET` | All | Svix HMAC verification in `/api/webhooks/clerk` |
| `CONVEX_DEPLOY_KEY` | CI/CD only | `npx convex deploy` — not a runtime variable |

No other secrets belong in Vercel. Convex internal credentials are managed within the Convex dashboard and never cross into Vercel's environment.

For preview deployments: configure a separate Clerk application (test mode) with its own key set. Do not point preview deployments at production Clerk credentials. Do not put production Clerk credentials in preview environment variables.

### 6.2 Convex Deployment Setup

**Authentication configuration** (Convex Dashboard → Settings → Authentication):

```json
{
  "providers": [
    {
      "domain": "https://[clerk-instance].clerk.accounts.dev",
      "applicationID": "convex"
    }
  ]
}
```

The `domain` must match `CLERK_JWT_ISSUER_DOMAIN`. The `applicationID` must match the Clerk JWT template audience. This wires Convex's JWKS verification.

**Convex HTTP routes** (`convex/http.ts`):

```typescript
import { httpRouter } from "convex/server";
import { sessionReAuthenticated } from "./webhooks/sessionReAuthenticated";

const http = httpRouter();
http.route({
  path: "/webhooks/clerk/session-reauthenticated",
  method: "POST",
  handler: sessionReAuthenticated,
});
export default http;
```

The Convex HTTP action URL (`https://[convex-url]/webhooks/clerk/session-reauthenticated`) is **not** the URL registered with Clerk. The Next.js route (`/api/webhooks/clerk`) is the public entry point; it verifies HMAC then forwards to Convex. The Convex HTTP action receives only pre-verified traffic. This preserves the HMAC layer as the single external trust boundary.

### 6.3 Clerk Webhook Endpoint Registration

Register one endpoint per Clerk application (separate for production, staging):

```
Endpoint URL:  https://[deployment].vercel.app/api/webhooks/clerk

Subscribe to:
  ✓ session.reAuthenticated        ← Must not be omitted
  ✓ user.created
  ✓ user.updated
  ✓ organizationMembership.created
  ✓ organizationMembership.deleted
  ✗ session.created / session.ended  (not subscribed — high volume, no Convex write needed)
```

Copy the signing secret from Clerk into `CLERK_WEBHOOK_SECRET` in Vercel. Rotate immediately if compromised — the secret is the entire trust boundary for inbound webhooks.

### 6.4 Clerk JWT Template Setup

In Clerk Dashboard → JWT Templates → New:

```
Name:          athelon-convex
Lifetime:      60 seconds
Claims:        { "athelon_role": "{{org.membership.role}}", "org_id": "{{org.id}}", "org_slug": "{{org.slug}}" }
```

The template name `athelon-convex` must match `ConvexProviderWithClerk` configuration. The 60-second lifetime is intentional: role changes (e.g., DOM demoting an inspector) propagate to all Convex operations within one minute without sign-out.

---

## Sign-Off

**Jonas Harker:** BP-09 is resolved. Mechanism is webhook push + reactive subscription. The auth helpers (`requireUser`, `requireOrgContext`, `requireOrgMembership`) are final — no change without this document updated and reasons documented. AUTH-01 through AUTH-12 are the acceptance gate. I sign when all twelve pass against the test deployment.

**Chloe Park:** `useSignatureAuthEvent` is as specified. `<ReAuthModal>` loading states are per Section 4.2. The 10-second timeout covers all failure modes visible to the user. No optimistic behavior for any auth or signing path. The record must exist in Convex before the modal closes.

---

*Jonas Harker — Platform/DevOps*  
*Chloe Park — Frontend Engineering*  
*2026-02-22*  
*Athelon Phase 3 — Auth & Platform Wiring. Authoritative. Resolve conflicts against this document.*
