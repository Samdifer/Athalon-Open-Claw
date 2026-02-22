# Athelon — Convex Deployment Specification
**Document Type:** Phase 4 Infra Runbook & CI/CD Specification
**Author:** Jonas Harker (DevOps/Platform)
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 4 infra work executes against this document
**Resolves:** B-P3-01 (no Convex deployment exists), B-P3-06 (signatureAuthEvent endpoint not registered)
**References:** `auth-platform-wiring.md` · `phase-3-gate-review.md` · `ORCHESTRATOR-LOG.md §Phase 4`

---

## Prefatory Note

This document exists because B-P3-01 is the gating dependency for every other Phase 4 workstream. Devraj cannot run tests against a deployment that doesn't exist. Chloe cannot connect pages to a backend that isn't up. Cilla's 43 test cases are hypothetical until there is a live Convex endpoint to run them against. Everything downstream is blocked until the following steps are complete.

Consequentially: **I run these steps before 09:00 on Phase 4 Day 1. Anyone else who needs to do this follows this document exactly.** Deviation requires a documented reason. This is a regulated environment — "I eyeballed it" is not a change record.

Two things are true at once: Convex makes this faster than any alternative we considered, and that speed advantage disappears immediately if environment separation is sloppy. Three environments, three Clerk applications, three sets of secrets. This document enforces that discipline.

---

## Section 1: Deployment Environment Matrix

Three Convex deployments. They are not interchangeable. They do not share secrets. They do not share Clerk applications.

### 1.1 Environment Definitions

| Environment | Convex Deployment Name | Purpose | Data |
|---|---|---|---|
| **dev** | `athelon-dev` | Local development, Cilla's integration tests, Jonas's infra work | Synthetic only. No real technician or aircraft data. Populated by seed scripts and test fixtures. Destroyed and re-created freely. |
| **staging** | `athelon-staging` | Pre-production validation, Marcus's simulated FAA inspection, Rosa's field scenarios, Tanya's mobile verification | Realistic synthetic data. Mirrors production schema exactly. Reset before each validation cycle. Never real customer data. |
| **production** | `athelon-prod` | Alpha pilot — one friendly Part 145 GA shop | Real technician records, real aircraft, real maintenance history. SOC-2 data retention applies. Only Jonas and Rafael have deploy authority. |

### 1.2 Vercel Environment Mapping

| Vercel Environment | Convex Deployment | Clerk Application | Who Accesses It |
|---|---|---|---|
| Preview (PR deployments) | `athelon-dev` | `athelon-dev` (Clerk test mode) | Engineers reviewing PRs, Finn's design review |
| Staging (manual promote) | `athelon-staging` | `athelon-staging` (Clerk test mode) | Marcus, Rosa, Tanya — validation only |
| Production | `athelon-prod` | `athelon-prod` (Clerk production) | Alpha pilot customer, Jonas, Rafael |

**Non-negotiable:** Preview deployments use `athelon-dev` Clerk credentials — test mode, sandboxed. No preview deployment has ever touched production Clerk keys. If a PR contains a `.env` change that routes to production credentials, it does not merge. CI will check for this.

### 1.3 Access Matrix

| Person | dev | staging | prod |
|---|---|---|---|
| Jonas Harker | Admin | Admin | Admin |
| Rafael Mendoza | Read | Read | Admin |
| Devraj Anand | Admin | Read | No access |
| Cilla Oduya | Read | Read | No access |
| Chloe Park | Read | Read | No access |
| Marcus Webb | No access | Read | No access |
| Rosa Eaton | No access | Read (UI only) | No access |
| Capt. Eaton's designated shop | No access | No access | Write (scoped to their org) |

Access is managed via Convex dashboard team membership. Production access requests go through Jonas. There is no self-serve prod access.

---

## Section 2: B-P3-01 Resolution — First Convex Deployment

**Context:** No `npx convex deploy` has been run. The Convex project has been initialized (a `convex.json` exists from the prototype CRM) but the schema and all mutations are in TypeScript source only. Nothing is deployed.

Run the following procedure **in order**. Do not skip steps. Each step has a verification that must pass before proceeding.

### 2.1 Prerequisites

Confirm these are true before touching any Convex CLI:

```bash
# Confirm Convex CLI is installed globally
npx convex --version
# Expected: convex/1.x.x or higher

# Confirm you're in the repo root
ls convex/schema.ts
# Expected: file exists (Phase 3 schema is the source)

# Confirm Node version
node --version
# Expected: v18.x or v20.x — Convex does not support v22 at time of writing; use nvm if needed
```

### 2.2 The 6 Environment Variables

These must exist in each environment before any Convex deployment is usable by the application. I am listing them once. If you are setting up a new environment, you need all six.

| Variable Name | Where It Lives | What It Is |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel Environment Variables | Clerk browser SDK key. Starts with `pk_test_` (dev/staging) or `pk_live_` (prod). |
| `CLERK_SECRET_KEY` | Vercel Environment Variables | Clerk server-side SDK key. Starts with `sk_test_` (dev/staging) or `sk_live_` (prod). Never in source. |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel Environment Variables | The Convex deployment HTTPS/WebSocket URL. Found in Convex Dashboard → Deployment Settings. Format: `https://[name].convex.cloud`. |
| `CLERK_WEBHOOK_SECRET` | Vercel Environment Variables | Svix signing secret. Copied from Clerk Dashboard → Webhooks → [endpoint] → Signing Secret. Rotated immediately if compromised. |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex Dashboard (Environment Variables) | Your Clerk instance FQDN. Format: `https://[slug].clerk.accounts.dev` (test) or `https://[custom-domain]` (prod). This is set **in Convex**, not Vercel. |
| `CONVEX_DEPLOY_KEY` | GitHub Actions Secrets | Deploy key for CI. Generated via `npx convex deploy --print-deploy-key`. Used in CI only — never a runtime variable, never in Vercel. |

**Separation note:** `CLERK_JWT_ISSUER_DOMAIN` belongs in Convex's environment because Convex uses it internally for JWKS verification. Vercel doesn't need it. Do not put it in Vercel. Do not put Convex internal variables in Vercel. Each platform owns its own secrets.

### 2.3 Step-by-Step Dev Deployment Procedure

**Step 1 — Authenticate Convex CLI to the dev project:**

```bash
npx convex dev --once
# Convex will prompt for login if not already authenticated.
# Select or create the 'athelon-dev' project.
# This writes .env.local with NEXT_PUBLIC_CONVEX_URL automatically.
# Verify: cat .env.local | grep CONVEX_URL
```

**Step 2 — Push schema to dev:**

```bash
npx convex dev --once
# On first run this pushes schema.ts and all convex/ functions.
# Watch for TypeScript errors in the output — fix before proceeding.
# Expected terminal output (last line): "✓ Convex functions ready"
```

**Step 3 — Verify schema in Convex Dashboard:**

Navigate to `https://dashboard.convex.dev` → `athelon-dev` → **Data** tab.

Confirm the following tables exist with zero rows (empty, not absent):
- `organizations`, `technicians`, `aircraft`, `workOrders`, `taskCards`, `taskCardSteps`
- `returnToService`, `signatureAuthEvents`, `adCompliance`, `parts`, `auditLog`

If any table is missing: the schema push silently failed on that table. Check for TypeScript compile errors in `convex/schema.ts`. Fix and re-run Step 2.

**Step 4 — Register Clerk JWT template in Convex Dashboard:**

In Convex Dashboard → `athelon-dev` → **Settings** → **Authentication** → Add provider:

```json
{
  "providers": [
    {
      "domain": "https://[your-dev-clerk-slug].clerk.accounts.dev",
      "applicationID": "convex"
    }
  ]
}
```

The `domain` value must exactly match the `CLERK_JWT_ISSUER_DOMAIN` you'll set in step 5. The `applicationID` must be `convex` — this is the audience value in the Clerk JWT template `athelon-convex`. Copy-paste from Clerk Dashboard → JWT Templates → `athelon-convex` → Audience to confirm they match.

**Step 5 — Set Convex environment variable:**

In Convex Dashboard → `athelon-dev` → **Settings** → **Environment Variables**:

```
CLERK_JWT_ISSUER_DOMAIN = https://[your-dev-clerk-slug].clerk.accounts.dev
```

This variable is consumed by Convex's JWKS verification internally. It does not appear in `process.env` in your Next.js app.

**Step 6 — Set Vercel environment variables for preview:**

In Vercel → `athelon` project → **Settings** → **Environment Variables** → **Preview** environment:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_[...]
CLERK_SECRET_KEY                  = sk_test_[...]
NEXT_PUBLIC_CONVEX_URL            = https://athelon-dev.convex.cloud
CLERK_WEBHOOK_SECRET              = whsec_[from Clerk dashboard]
```

Preview environment only. Do not set these at the root "All environments" scope — that risks bleeding into production.

**Step 7 — Verify JWT round-trip:**

```bash
# Start dev server locally
npm run dev

# Open browser, sign in with a Clerk test account in the athelon-dev application
# Open browser console, run:
await window.Clerk.session.getToken({ template: "athelon-convex" })
# Expected: JWT string starting with "eyJ"
# If null or error: JWT template name mismatch or Clerk domain misconfigured in Convex dashboard
```

**Step 8 — Smoke test a protected query:**

In the browser console (still on localhost):

```javascript
// In Next.js app with ConvexProviderWithClerk wired, open browser console
// Run a Convex query that calls requireUser()
// Expected: data returned (or empty array), NOT ConvexError AUTH_REQUIRED
```

If `AUTH_REQUIRED` is thrown: the JWT is not reaching Convex. Verify `ConvexProviderWithClerk` is wrapping the app in `app/layout.tsx`.

Schema is now live in dev. B-P3-01 is resolved for the dev environment. Repeat Steps 1–8 for staging, then for production (with production Clerk credentials). Do not run `npx convex dev --once` against production — use `npx convex deploy` with `CONVEX_DEPLOY_KEY` for staging and production.

---

## Section 3: B-P3-06 Resolution — `signatureAuthEvent` HTTP Endpoint

**Context:** The `signatureAuthEvent` creation flow requires a Convex HTTP action accessible at a public route. As of Phase 3, the route registration in `convex/http.ts` is specified in `auth-platform-wiring.md §6.2` but not wired to Clerk's webhook endpoint. The `TaskCardStep` component stubs `createSignatureAuthEvent` because the endpoint does not exist in any deployment. This section closes that gap.

### 3.1 Route Registration in `convex/http.ts`

The file must contain exactly this — no more routes, no commented-out experiments:

```typescript
// convex/http.ts
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

**Why this route is in Convex at all:** The Next.js handler at `/api/webhooks/clerk` performs Svix HMAC verification, then forwards the pre-verified payload to this Convex HTTP action. The Convex action is not the public entry point — it receives only traffic that has already passed HMAC verification. The Next.js route is the trust boundary. The Convex action assumes the payload is legitimate.

After editing `convex/http.ts`, push:

```bash
# Dev environment
npx convex dev --once

# Staging / Production (from CI or with deploy key)
CONVEX_DEPLOY_KEY=[key] npx convex deploy
```

**Verify route registration:**

```bash
# Convex exposes HTTP actions at [CONVEX_URL]/[path]
curl -X POST https://athelon-dev.convex.cloud/webhooks/clerk/session-reauthenticated \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: HTTP 400 or HTTP 422 (because the payload is invalid, but the route exists)
# HTTP 404 = route not registered. Re-check convex/http.ts and re-deploy.
```

### 3.2 Svix Webhook Endpoint Registration in Clerk Dashboard

The Convex HTTP action URL is **not** registered with Clerk. The Next.js route is. One Clerk webhook endpoint per environment.

**Dev environment:**

In Clerk Dashboard → `athelon-dev` application → **Webhooks** → Add Endpoint:

```
URL:     https://[your-pr-preview-url].vercel.app/api/webhooks/clerk
         (or ngrok URL for local dev — use ngrok when testing locally)

Events (subscribe to exactly these, no others):
  ✓ session.reAuthenticated
  ✓ user.created
  ✓ user.updated
  ✓ organizationMembership.created
  ✓ organizationMembership.deleted
  ✗ session.created          ← Do not subscribe. High volume. No Convex write needed.
  ✗ session.ended            ← Do not subscribe. Same reason.
```

Copy the **Signing Secret** from this endpoint. Set it as `CLERK_WEBHOOK_SECRET` in Vercel → Preview environment.

**Staging and production:** Repeat with their respective Clerk applications and Vercel environments. Each environment has its own signing secret. They are different strings.

### 3.3 Next.js Webhook Handler — Forward to Convex

Confirm `/app/api/webhooks/clerk/route.ts` forwards `session.reAuthenticated` events to the Convex HTTP action. The abbreviated structure from `auth-platform-wiring.md §1.2`:

```typescript
// Verify HMAC first — always, before routing
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
evt = wh.verify(body, headers);   // throws on failure → return 400

// Route to Convex
if (evt.type === "session.reAuthenticated") {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  await fetch(
    `${convexUrl}/webhooks/clerk/session-reauthenticated`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(evt) }
  );
}
```

### 3.4 Endpoint Health Verification

Run this after every deploy that touches `convex/http.ts` or the webhook handler:

**Step 1 — Trigger a test webhook delivery from Clerk Dashboard:**

In Clerk Dashboard → Webhooks → [endpoint] → **Send Test Event** → `session.reAuthenticated`.

Clerk sends a synthetic payload. Check:
1. **Clerk delivery log:** Status should be `200` within 3 seconds.
2. **Convex Dashboard → Logs:** Look for a function run for `webhooks/sessionReAuthenticated`. It will show HTTP 422 (technician not found for synthetic user ID) — that is expected and correct. HTTP 404 means the route isn't registered. HTTP 500 means the action threw unexpectedly.
3. **Vercel Function Logs:** The Next.js handler should log `"Webhook received: session.reAuthenticated"` and `"Forwarded to Convex: 422"` (or 200 for a real user).

**Step 2 — End-to-end with a real test account:**

With a test technician seeded in the dev deployment:
1. Sign into the app with that technician's Clerk test account.
2. Trigger a re-authentication event (sign-out and back in, or use Clerk's step-up re-auth flow if wired).
3. Observe: `signatureAuthEvents` table in Convex Dashboard gains a new row for that `userId`.
4. Confirm: `consumed=false`, `expiresAt = authenticatedAt + 300000`, `authMethod` is a valid value from the approved mapping.

If the row doesn't appear within 10 seconds of re-auth: check Clerk delivery logs for the webhook, then Vercel function logs, then Convex action logs. The failure will be in one of those three places.

B-P3-06 is resolved when Step 2 produces a `signatureAuthEvent` row in the dev deployment.

---

## Section 4: CI/CD Pipeline

### 4.1 Environment Variable Sourcing — Reference

Before the workflow: know where each variable comes from. This is the source of truth.

| Variable | Source | Used In |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | GitHub Actions Secret | CI deploy steps — never a runtime variable |
| `CLERK_SECRET_KEY` | GitHub Actions Secret (prod) / Vercel Env (preview, staging) | Vercel runtime |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel Environment Variable | Vercel runtime (build + runtime) |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel Environment Variable | Vercel runtime (build + runtime) |
| `CLERK_WEBHOOK_SECRET` | Vercel Environment Variable | Vercel runtime (webhook handler) |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex Dashboard (per deployment) | Convex internal — not a GitHub or Vercel variable |
| `VERCEL_TOKEN` | GitHub Actions Secret | `vercel` CLI in CI for deploy commands |
| `VERCEL_ORG_ID` | GitHub Actions Secret | `vercel` CLI project scoping |
| `VERCEL_PROJECT_ID` | GitHub Actions Secret | `vercel` CLI project scoping |

### 4.2 GitHub Actions — PR Workflow

Triggers on: `push` to any branch with an open PR. Does **not** push to production Convex.

```yaml
# .github/workflows/pr.yml
name: PR — Typecheck, Schema Push, Preview Deploy

on:
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
        # Fails the PR if any TypeScript error exists anywhere in the project.
        # This catches schema validator mismatches before they reach Convex.

  convex-schema-push:
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx convex deploy --cmd "echo skipping build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_DEV }}
        # Pushes schema and functions to athelon-dev.
        # Uses the DEV deploy key — never the production key on a PR.
        # If schema push fails (type error, index conflict), the PR is blocked.

  vercel-preview:
    runs-on: ubuntu-latest
    needs: convex-schema-push
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} pull --yes --environment=preview
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} build
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} deploy --prebuilt
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        # Deploys to a unique preview URL. Vercel injects preview environment variables
        # (athelon-dev Clerk keys, athelon-dev Convex URL) automatically.
```

### 4.3 GitHub Actions — Main Branch Workflow

Triggers on: `push` to `main` (i.e., merged PR). This is the production path.

```yaml
# .github/workflows/main.yml
name: Main — Production Deploy

on:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
        # Same check as PR. Belt and suspenders — main should never fail here
        # because the PR blocked it, but we check anyway.

  convex-production-push:
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx convex deploy --cmd "echo skipping build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_PROD }}
        # Pushes schema and functions to athelon-prod.
        # CONVEX_DEPLOY_KEY_PROD is the production deploy key — scoped in GitHub
        # to Environments with required reviewers. Jonas and Rafael are the required reviewers.
        # This step will not run without at least one approval.

  vercel-production-deploy:
    runs-on: ubuntu-latest
    needs: convex-production-push
    environment: production       # GitHub environment — requires Jonas or Rafael approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} pull --yes --environment=production
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} build --prod
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} deploy --prebuilt --prod
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Production deploy gate:** The `environment: production` directive on `vercel-production-deploy` and the required reviewers configured on the GitHub Environment mean that every production deploy requires explicit human approval. This is not optional. It is the access control record for SOC-2.

---

## Section 5: Deployment Verification Checklist

Run this checklist after every schema push and every Vercel deploy. All 10 items must pass. A partial pass is a failed deploy until the failing items are resolved.

This checklist applies to dev and staging on every relevant PR. It applies to production on every merge to main.

---

**DEPLOY-CHECK-01 — Schema version**

In Convex Dashboard → [deployment] → **Settings** → **Deployment Info**: confirm the deployment timestamp matches the pipeline run time (within ±5 minutes). If the timestamp is stale, the schema push silently failed — re-run the deploy job.

```bash
# Also verifiable via CLI:
npx convex env --deployment [deployment-name]
# Output should include a recent deployment timestamp
```

**PASS:** Deployment timestamp matches the pipeline run.
**FAIL:** Schema is stale. The running application is on a previous schema version. Do not proceed.

---

**DEPLOY-CHECK-02 — All expected tables present**

In Convex Dashboard → Data tab: confirm all 11 tables are present:
`organizations`, `technicians`, `aircraft`, `workOrders`, `taskCards`, `taskCardSteps`, `returnToService`, `signatureAuthEvents`, `adCompliance`, `parts`, `auditLog`.

**PASS:** All 11 tables listed.
**FAIL:** One or more missing. The push encountered a schema error. Check Convex deploy logs for validator failures.

---

**DEPLOY-CHECK-03 — Auth token round-trip**

Sign in to the deployed application with a test account. Open browser DevTools → Application → Session Storage. Find the Convex client's cached auth token (or trigger a Convex query and observe the Authorization header in Network tab).

```javascript
// Browser console on the deployed app:
const token = await window.Clerk.session.getToken({ template: "athelon-convex" });
console.log("token length:", token?.length, "starts with:", token?.substring(0, 10));
// PASS: token length > 200, starts with "eyJ"
// FAIL: null or error — JWT template misconfigured or Convex auth provider not set
```

**PASS:** JWT returned, decodes to claims with `org_id` and `athelon_role`.
**FAIL:** Auth is broken. No Convex function will serve protected data.

---

**DEPLOY-CHECK-04 — Protected query returns data (not auth error)**

```javascript
// Browser console — requires a query callable via dev tools or a test fixture page
// This should be a simple query protected by requireUser()
// Expected: [] (empty array) or data — NOT ConvexError { code: "AUTH_REQUIRED" }
```

**PASS:** Query returns without throwing `AUTH_REQUIRED`.
**FAIL:** JWT is not reaching Convex. Verify `ConvexProviderWithClerk` wraps the component tree and `NEXT_PUBLIC_CONVEX_URL` is set correctly for this environment.

---

**DEPLOY-CHECK-05 — HTTP routes registered**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://[convex-url]/webhooks/clerk/session-reauthenticated \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
# PASS: 400 or 422 (route exists, payload invalid — expected)
# FAIL: 404 (route not registered — convex/http.ts not deployed correctly)
```

**PASS:** HTTP response code is not 404.
**FAIL:** HTTP router not deployed. Re-check `convex/http.ts` exports and re-deploy.

---

**DEPLOY-CHECK-06 — Webhook delivery test**

In Clerk Dashboard → [environment application] → Webhooks → [endpoint] → **Send Test Event** → `user.created`.

**PASS:** Delivery log shows `200`. Vercel function logs show webhook received and processed.
**FAIL:** Non-200. Check `CLERK_WEBHOOK_SECRET` is set correctly in Vercel for this environment. HMAC verification is failing.

---

**DEPLOY-CHECK-07 — `signatureAuthEvent` creation end-to-end**

With a seeded test technician in the target environment, trigger a re-authentication event. Observe `signatureAuthEvents` table in Convex Dashboard.

**PASS:** New row appears within 10 seconds with `consumed=false`, correct `technicianId`, valid `authMethod`, `expiresAt = authenticatedAt + 300000`.
**FAIL:** No row appears. Debug in order: Clerk delivery log → Vercel function log → Convex action log. The failure is in one of those three.

---

**DEPLOY-CHECK-08 — Org boundary isolation**

Using two Clerk test accounts in different orgs (both seeded):
1. Sign in as Org-A user.
2. Attempt to query a resource known to belong to Org-B (use its `_id` directly in a query).

**PASS:** Query returns `null` or throws `NOT_FOUND`. No Org-B data visible to Org-A user.
**FAIL:** Org-B data returned. `requireOrgContext()` is not being called in that query. Block the deploy.

---

**DEPLOY-CHECK-09 — Query latency baseline**

```bash
# Run from local or CI — measures Convex query cold latency
time curl -s -X POST https://[convex-url]/api/query \
  -H "Content-Type: application/json" \
  -d '{"path": "workOrders:list", "args": {}}'
# PASS: response time < 500ms for an authenticated query (< 200ms warm)
# WARN: 500ms–1000ms — acceptable but investigate index usage
# FAIL: > 1000ms — likely a missing index. Check query plan in Convex Dashboard → Functions
```

**PASS:** Authenticated list query completes in under 500ms.
**FAIL:** Latency unacceptable. Check for table scans (missing indexes). Convex Dashboard → Functions → [query] → Execution tab shows index usage.

---

**DEPLOY-CHECK-10 — Audit log write on protected mutation**

Execute a mutation that writes an `auditLog` entry (e.g., create a test work order and then void it, which triggers the void guard audit write):

**PASS:** `auditLog` table in Convex Dashboard gains a row with the correct `eventType`, `userId`, `tableName`, and timestamp within 2 seconds of the mutation.
**FAIL:** No audit log row. The mutation's transactional audit write failed silently, or the audit write isn't in the transaction. This is a regulatory defect — do not accept a deployment where mutations execute without producing audit records.

---

## Section 6: Rollback Procedures

Rollbacks are rare. They should also be fast and clean. These procedures define exactly what to do and who has authority to authorize each.

### 6.1 Rollback — Bad Schema Push (Convex)

**Who authorizes:** Jonas Harker. If Jonas is unreachable: Rafael Mendoza.
**When to invoke:** A schema push deployed a breaking change — field removed that is still queried, index dropped that is still used, validator changed incompatibly with existing data.
**Time to execute:** 5–15 minutes.

**Procedure:**

1. **Identify the last known-good commit** that produced a working schema:
   ```bash
   git log --oneline convex/schema.ts
   # Find the commit hash before the bad push
   ```

2. **Revert the schema file to the good commit:**
   ```bash
   git checkout [good-commit-hash] -- convex/schema.ts
   git checkout [good-commit-hash] -- convex/          # Revert all convex/ if mutations changed too
   ```

3. **Push the reverted schema immediately:**
   ```bash
   # Dev/staging:
   npx convex dev --once
   # Production (with production deploy key):
   CONVEX_DEPLOY_KEY=[prod-key] npx convex deploy
   ```

4. **Verify schema reverted:** Run DEPLOY-CHECK-01 and DEPLOY-CHECK-02.

5. **Document the incident:** Write a post-mortem entry in `simulation/athelon/incidents/` before doing anything else. Include: what changed, what broke, what was rolled back, and what the migration path forward requires.

**Convex data note:** Convex schema pushes do not delete data. Rolling back the schema does not remove rows added during the bad schema's window. If new fields were written that the old schema doesn't know about, they will be invisible but not deleted. This is safe for rollback purposes — forward, a migration step may be needed to clean up orphaned fields.

**Convex does not support schema migrations in the traditional sense.** There is no `migrate down` command. The rollback procedure above (revert the TypeScript, re-push) is the mechanism. For additive changes (new field, new table), rollback is trivial. For destructive changes (removed field, changed type), rollback recovers the schema but data written in the bad window may need a one-time cleanup script via a Convex internal mutation.

---

### 6.2 Rollback — Bad Vercel Deploy

**Who authorizes:** Jonas Harker. If Jonas is unreachable: Rafael Mendoza.
**When to invoke:** A Vercel production deploy introduced a runtime error visible to users, or broke a critical path (auth, routing, webhook handler).
**Time to execute:** 2 minutes.

**Procedure:**

1. **Navigate to Vercel Dashboard** → `athelon` project → **Deployments**.

2. **Find the last known-good deployment** (the one before the current production deployment). It will be labeled with its git commit and deploy timestamp.

3. **Click "Promote to Production"** on the good deployment.

   Vercel instantly re-routes production traffic to the previous deployment. There is no rebuild. No CI run. Traffic cutover is near-instantaneous.

4. **Verify:** Run DEPLOY-CHECK-03, DEPLOY-CHECK-04, and DEPLOY-CHECK-06. The previous deployment's Convex URL and Clerk keys are the same — only the Next.js application code changed.

5. **Create a GitHub issue** documenting the rollback. The bad commit must be investigated before it is re-merged.

**Important:** A Vercel rollback does not roll back the Convex schema. If the bad Vercel deploy was accompanied by a bad schema push, both rollbacks must run. The Convex schema rollback (§6.1) must run first, because the Vercel rollback restores application code that may depend on the previous schema shape.

---

### 6.3 Rollback — Bad Clerk Webhook Reconfiguration

**Who authorizes:** Jonas Harker. If Jonas is unreachable: Rafael Mendoza.
**When to invoke:** A webhook endpoint URL was changed, event subscriptions were modified incorrectly, or the signing secret was rotated and the new value was not deployed to Vercel before the old value expired.
**Time to execute:** 5 minutes.

**Procedure:**

1. **Identify what changed:**
   - URL changed: simply re-enter the correct URL in Clerk Dashboard → Webhooks → [endpoint] → Edit.
   - Event subscriptions changed: uncheck incorrect events, re-check the required five (`session.reAuthenticated`, `user.created`, `user.updated`, `organizationMembership.created`, `organizationMembership.deleted`).
   - Signing secret rotated prematurely: Clerk allows you to see the current secret and any pending rotation. If the old secret is still valid, update `CLERK_WEBHOOK_SECRET` in Vercel to the new secret immediately. If the old secret is no longer valid and the new one was not deployed: update Vercel now. Every webhook that arrived between the rotation and this fix was rejected with HTTP 400. Review Clerk's delivery retry log — any failed deliveries from the bad window may need to be manually replayed by Clerk support (Clerk retries with backoff; check if any are still pending before declaring them lost).

2. **Verify recovery:**
   - Run DEPLOY-CHECK-06 (test webhook delivery).
   - Run DEPLOY-CHECK-07 (signatureAuthEvent creation) if `session.reAuthenticated` was affected.

3. **Audit log review:**
   In Convex Dashboard → `auditLog` table, check for `eventType="access_denied"` entries during the bad window. Any webhook that hit the Next.js handler and was rejected (HMAC failure) produces a security log entry. Review for anomalies — a signing secret misconfiguration and a legitimate HMAC tampering attempt look the same in the logs. If the volume of rejections is anomalous, treat it as a security event and involve Rafael.

4. **Document:** Same as above — incident file before closing the response.

---

## Operational Notes

**Convex deploy keys are not passwords.** They are bearer tokens with full deploy authority. They live in GitHub Actions Secrets scoped to Environments with required reviewers. They do not appear in `console.log`. They do not appear in error messages. They do not appear in build logs. If a deploy key is logged anywhere, rotate it immediately via `npx convex auth remove` and `npx convex deploy --print-deploy-key`.

**The `CLERK_WEBHOOK_SECRET` is the entire trust boundary for inbound webhooks.** If it is compromised, an attacker can craft arbitrary `session.reAuthenticated` payloads and insert `signatureAuthEvents` for any user. Rotate it immediately if compromised. Change the Vercel environment variable and the Clerk endpoint signing secret in the same deployment window — there is a brief gap where the new secret is in Clerk but not yet in Vercel. Do this during off-hours.

**Never use `npx convex dev` against the production deployment.** `npx convex dev` is a hot-reload development server. It connects to whichever deployment the `CONVEX_DEPLOY_KEY` or `~/.convex/config.json` points to. Before running `npx convex dev`, confirm:
```bash
cat .env.local | grep CONVEX_URL
# Should show athelon-dev.convex.cloud, not athelon-prod.convex.cloud
```

**Schema changes in production require a migration plan, reviewed before merge.** Additive changes (new optional field, new table) are safe. Non-additive changes (removing a required field, changing a validator) require: (a) a two-phase deploy (old schema still valid in new code, then new schema when no old code is running), or (b) a maintenance window with rollback plan documented. Rafael and Jonas review any non-additive schema PR before it merges.

---

## Sign-Off

**Jonas Harker:** This document is the Phase 4 infra execution contract. B-P3-01 is resolved when Section 2 completes against the dev environment and DEPLOY-CHECK-01 through DEPLOY-CHECK-10 all pass. B-P3-06 is resolved when DEPLOY-CHECK-07 produces a real `signatureAuthEvent` row. I sign both blockers closed when both conditions are true. Everything else in Phase 4 — Devraj's mutations, Chloe's pages, Cilla's test runs — can proceed in parallel once the dev deployment is up.

Production deploy authority requires Jonas or Rafael approval, captured in the GitHub Environment approval log. That log is the change record for SOC-2.

---

*Jonas Harker — DevOps/Platform*
*2026-02-22*
*Athelon Phase 4 — Infra Runbook. Authoritative. Deviation requires a documented reason.*
