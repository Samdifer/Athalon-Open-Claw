# Convex Deployment Plan — Athelon Alpha
**Author:** Jonas Harker, DevOps / Platform
**Date:** 2026-02-22
**Wave:** 1 — Infrastructure
**Status:** READY TO EXECUTE
**Ref:** phase-4-implementation/infra/environment-setup.md

> *This is the single source of truth for getting Athelon's backend live for the first time. Nothing below is optional. Every step feeds the next. — JH*

---

## Overview

Wave 1, Task 1 from the build sequence: **Deploy Convex (dev + staging)**. This is the prerequisite for everything else. The frontend can't wire real API calls until `_generated/api.ts` exists. Tests can't run full integration paths until the functions are deployed. This plan covers both the staging environment (what Gary and Linda's shop will use for alpha testing) and the developer flow for the rest of the team.

Two deployments:
1. **`athelon-dev-[yourname]`** — personal dev project (one per engineer; follows environment-setup.md §3)
2. **`athelon-staging`** — shared staging project; the alpha test environment for Gary and Linda's shop

---

## Part 1: Convex Project Creation and Configuration

### Step 1.1 — Create the Convex projects

**Staging project (Jonas does this once — not per-engineer):**

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Log in with the Athelon team account (credentials in 1Password → "Athelon Platform" vault → "Convex Team Account")
3. Click **New Project**
4. Name: `athelon-staging`
5. Team: `athelon` (not personal)
6. Click **Create Project**
7. Note the deployment URL: `https://athelon-staging.convex.cloud` (it will appear in the project dashboard header immediately)
8. Repeat for `athelon-prod` → name it `athelon-prod` → URL: `https://athelon-prod.convex.cloud`

**Developer personal project (each engineer does this for their own dev environment):**

```bash
cd /path/to/athelon  # repo root
npx convex dev --configure
# Prompts:
#   "Configure a new project": Yes
#   "Project name": athelon-dev-[yourname]   e.g. athelon-dev-jonas
# Creates .env.local with CONVEX_DEPLOYMENT=dev:athelon-dev-[yourname]
# .env.local is gitignored — never commit it
```

### Step 1.2 — Configure `convex.json`

Verify the repo's `convex.json` at the repo root exists and contains the correct configuration. It should look like:

```json
{
  "project": "athelon-dev-jonas",
  "team": "athelon",
  "prodUrl": "https://athelon-prod.convex.cloud"
}
```

> **Note:** `convex.json` tracks the developer's personal project. The `CONVEX_DEPLOY_KEY` in CI overrides the project target at deploy time — that's how CI hits `athelon-staging` and `athelon-prod` without requiring a per-engineer `convex.json` change.

### Step 1.3 — Create Deploy Keys (staging and prod)

These keys are used by CI. Do NOT use them locally — use `npx convex dev` (browser OAuth) instead.

**For `athelon-staging`:**
1. Convex Dashboard → select `athelon-staging` project
2. Settings → Deploy Keys → **Create Deploy Key**
3. Name: `github-actions-staging`
4. Copy the generated key (shown once)
5. Go to GitHub → repo → Settings → Secrets and variables → Actions → Secrets → **New repository secret**
6. Name: `CONVEX_STAGING_DEPLOY_KEY`
7. Value: paste the key

**For `athelon-prod`:**
1. Same steps, project: `athelon-prod`
2. Key name: `github-actions-prod`
3. GitHub secret name: `CONVEX_PROD_DEPLOY_KEY`

---

## Part 2: Environment Variable Setup

This section maps each required variable to where it must be set. Reference: `phase-4-implementation/infra/environment-setup.md §2`.

### 2.1 Convex Dashboard Variables (per project)

Navigate to: **Convex Dashboard → [project] → Settings → Environment Variables**

Do this for both `athelon-staging` and (when ready) `athelon-prod`.

#### `athelon-staging`

| Variable | Value Source | Notes |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk Dashboard → JWT Templates → "Convex" template → Issuer field | Must match the staging Clerk dev instance, e.g. `https://[staging-instance].clerk.accounts.dev`. **No trailing slash.** |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk Dashboard → Webhooks → staging endpoint → Signing Secret | Format: `whsec_...`. Same value goes in both Convex and Vercel for this endpoint. |
| `LOGTAIL_SOURCE_TOKEN` | Better Stack → Sources → "athelon-staging" source → Source Token | Create a new source if it doesn't exist. Name it `athelon-staging`. |
| `AWS_ROLE_ARN` | Jonas provisions separately — IAM role for OIDC-based S3 access | Format: `arn:aws:iam::ACCOUNT_ID:role/athelon-convex-export-staging`. Not required for alpha until audit export is wired. |
| `AWS_S3_BUCKET_PREFIX` | `athelon-retention` | Full bucket: `athelon-retention-staging` |

#### `athelon-prod`

Same variables but using production instances:

| Variable | Value |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://clerk.athelon.app` (after custom domain setup; `https://[prod-instance].clerk.accounts.dev` before then) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | From the prod Clerk instance webhook endpoint |
| `LOGTAIL_SOURCE_TOKEN` | From `athelon-prod` Better Stack source |
| `AWS_ROLE_ARN` | Production IAM role ARN |

### 2.2 Vercel Environment Variables

Set in: **Vercel Dashboard → athelon-web project → Settings → Environment Variables**

These are already documented in environment-setup.md §2.1. For Wave 1, the critical ones are:

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Preview | `https://athelon-staging.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_URL` | Production | `https://athelon-prod.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Preview | `pk_test_...` (staging Clerk instance) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | `pk_live_...` (production Clerk instance) |
| `CLERK_SECRET_KEY` | Preview | `sk_test_...` |
| `CLERK_SECRET_KEY` | Production | `sk_live_...` |
| `CLERK_WEBHOOK_SECRET` | Preview | `whsec_...` (same value as Convex `CLERK_WEBHOOK_SIGNING_SECRET`) |

> **Important:** `NEXT_PUBLIC_CONVEX_URL` must be set to the **staging** Convex project for all Vercel preview deployments (PR previews + `main` branch staging deploys). It is **not** the per-engineer Convex project URL. See environment-setup.md §4 for the full per-environment mapping.

### 2.3 GitHub Actions Secrets

Required for CI. Set at: **GitHub → repo → Settings → Secrets and variables → Actions → Secrets**

The following must exist before the first CI run (full list in environment-setup.md §2.3):

```
CONVEX_STAGING_DEPLOY_KEY    ← From step 1.3 above
CONVEX_PROD_DEPLOY_KEY       ← From step 1.3 above
TURBO_TOKEN                  ← From Vercel team settings → Tokens
SMOKE_TEST_USER_TOKEN        ← See §7 (alpha test setup)
SMOKE_TEST_ORG_ID            ← See §7 (alpha test setup)
SLACK_BOT_TOKEN              ← From Slack API app → OAuth & Permissions
SLACK_INCIDENTS_CHANNEL_ID   ← Right-click #incidents → Copy link → last path segment
SLACK_DEPLOYS_CHANNEL_ID     ← Right-click #deploys → Copy link → last path segment
```

---

## Part 3: Schema Deployment Command Sequence

These are the exact commands to run for the first deployment. Order matters.

### 3.1 Local dev deployment (first time, per engineer)

```bash
# Terminal 1: Start Convex dev watcher
# This deploys the schema AND watches for changes
npx convex dev

# Expected output (first run):
# ✔ Preparing Convex functions...
# ✔ Syncing schema...
#   - Created table: workOrders
#   - Created table: taskCards
#   - Created table: taskCardSteps
#   - Created table: maintenanceRecords
#   - [... all tables ...]
# ✔ Deploying functions...
#   - workOrders:createWorkOrder
#   - workOrders:listWorkOrders
#   - [... all functions ...]
# ✔ Successfully deployed!
# ✔ Generated _generated/api.ts
#
# Watching for changes... (keep this terminal open during development)

# Terminal 2: Next.js dev server
pnpm --filter web dev
# Open: http://localhost:3000
```

> **Critical:** `npx convex dev` generates `convex/_generated/api.ts`. Chloe's frontend wiring work is 100% blocked until this file exists. If she hasn't run this yet, `api.workOrders.*` will not exist and TypeScript will fail everywhere. See frontend-wiring-plan.md §2 for details.

### 3.2 Manual staging deployment (initial setup only)

The CI pipeline (github-actions-ci.yml `deploy-staging` job) handles staging deploys automatically on merge to `main`. But for the very first deployment — before any CI run has succeeded — Jonas does this manually:

```bash
# Ensure you have the staging deploy key in your environment
export CONVEX_DEPLOY_KEY=<value-from-convex-dashboard-athelon-staging>

# Deploy to staging (one-shot, no watcher)
npx convex deploy --yes

# Expected output:
# ✔ Deploying to athelon-staging
# ✔ Syncing schema...
# ✔ Deploying functions...
# ✔ Successfully deployed to https://athelon-staging.convex.cloud
```

After this first manual deploy succeeds, all future staging deploys go through CI.

### 3.3 Schema changes required before first alpha build

Per `mvp-scope.md §Schema Changes Required Before Alpha Build Starts`, the following schema additions must be applied before Devraj begins backend work. Devraj owns the implementation; Jonas deploys it.

**Change 1 — Add `"pending_inspection"` to `parts.location` enum:**
```typescript
// convex/schema.ts — parts table, location field
location: v.union(
  v.literal("pending_inspection"),  // ADD THIS LINE
  v.literal("inventory"),
  v.literal("installed"),
  v.literal("removed_pending_disposition"),
  v.literal("quarantine"),
  v.literal("scrapped"),
  v.literal("returned_to_vendor"),
),
```

**Change 2 — Add `"qcm_reviewed"` to `auditLog.eventType` enum:**
```typescript
// convex/schema.ts — auditLog table, eventType field
// Add v.literal("qcm_reviewed") to the union
```

**Change 3 — Add `customerFacingStatus` to `workOrders` (optional field):**
```typescript
// convex/schema.ts — workOrders table
customerFacingStatus: v.optional(v.union(
  v.literal("awaiting_arrival"),
  v.literal("received_inspection_pending"),
  v.literal("inspection_in_progress"),
  v.literal("discrepancy_authorization_required"),
  v.literal("awaiting_parts"),
  v.literal("work_in_progress"),
  v.literal("final_inspection_pending"),
  v.literal("ready_for_pickup"),
)),
```

Deployment command after schema changes:
```bash
# Validate schema changes compile before deploying
pnpm turbo typecheck

# Deploy schema changes to staging
CONVEX_DEPLOY_KEY=<staging-key> npx convex deploy --yes

# CI will post a schema diff comment on the PR — review it before merging
```

> **Breaking migration policy:** See github-actions-ci.yml `deploy-prod` job — field removals are blocked automatically by CI. These three changes are all **additive** (new field, new enum literal, optional field) so they will not trigger the breaking migration block.

---

## Part 4: Clerk JWT Template Configuration

Clerk's JWT template is what allows Convex to verify that a request is authenticated. Without this, `ctx.auth.getUserIdentity()` returns `null` in every Convex function.

### Step 4.1 — Create the JWT Template in Clerk

**For staging (Clerk dev instance):**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select the staging Clerk application (`athelon-staging-dev` or similar)
3. Navigate to **JWT Templates** → **New template**
4. Choose template type: **Convex**
5. Template name: `convex` (must be exactly this name — Convex's SDK looks for it by name)
6. Token lifetime: `60` seconds
7. Paste the following claims JSON exactly:

```json
{
  "aud": "convex",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.full_name}}",
  "org_id": "{{org.id}}",
  "org_role": "{{org.role}}",
  "org_slug": "{{org.slug}}",
  "athelon_role": "{{org.public_metadata.athelon_role}}",
  "station_codes": "{{org.public_metadata.station_codes}}"
}
```

8. Click **Save**
9. On the template detail page, copy the **Issuer** field value (e.g. `https://liberal-goose-42.clerk.accounts.dev`)
10. Set this value as `CLERK_JWT_ISSUER_DOMAIN` in the Convex Dashboard for `athelon-staging`

> **Repeat for production** when the prod Clerk instance is created. The issuer domain will be `https://clerk.athelon.app` after custom domain setup, or `https://[prod-instance].clerk.accounts.dev` initially.

### Step 4.2 — Configure Clerk Webhook Endpoint

The webhook syncs user and org creation events from Clerk to Convex (creates `users` records automatically).

**Staging webhook:**
1. Clerk Dashboard → Webhooks → **Add Endpoint**
2. URL: `https://athelon-staging.convex.site/webhooks/clerk`
   - This is the Convex HTTP action URL. Find it: Convex Dashboard → `athelon-staging` → Settings → "HTTP Actions URL"
3. Subscribe to these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organizationMembership.created`
   - `organizationMembership.deleted`
   - `organizationMembership.updated`
   - `session.created`
   - `session.ended`
4. After creation, click the endpoint → copy **Signing Secret** (format: `whsec_...`)
5. Set this value as:
   - `CLERK_WEBHOOK_SIGNING_SECRET` in **Convex Dashboard → athelon-staging → Settings → Environment Variables**
   - `CLERK_WEBHOOK_SECRET` in **Vercel → athelon-web → Settings → Environment Variables → Preview scope**

### Step 4.3 — Verify JWT Flow

After template creation and env var setup, verify the chain works:

```bash
# 1. Open the staging app: https://staging.athelon.app
# 2. Sign in with a test Clerk account
# 3. In browser devtools, check Application > Local Storage
#    Look for: clerk-db-jwt-* keys — these should be present if Clerk is issuing tokens

# 4. In Convex Dashboard → athelon-staging → Logs (real-time)
#    Trigger any query (e.g. load the work orders page)
#    Look for log output from the function
#    If auth is working, you'll see successful function calls
#    If NOT working, you'll see: "getUserIdentity() returns null" — see troubleshooting §6.1
```

### Step 4.4 — Set Organization Metadata for Test Users

For the alpha test accounts (Gary, Linda — see §7), the Clerk org metadata must include the `athelon_role` and `station_codes` fields that the JWT template embeds:

1. Clerk Dashboard → Organizations → find the alpha test org ("Gary and Linda's Shop")
2. Click the organization → **Metadata** tab → **Public metadata** (not Private)
3. Set:
```json
{
  "athelon_role": "dom",
  "station_codes": ["KRHV"]
}
```
4. For individual users in the org, the role is set at the **organization membership** level, not the user level:
   - Clerk Dashboard → Users → select user → Memberships → select org membership → Edit metadata
   - Set `athelon_role` to the appropriate value per user: `"dom"` for Gary, `"qcm"` for Linda

---

## Part 5: Verification Checklist

Run these 8 checks in order after initial staging deployment. All 8 must be green before declaring Wave 1 Task 1 complete.

---

### ✅ Check 1 — Convex Functions Deployed

**How to check:**
- Convex Dashboard → `athelon-staging` → **Functions** tab
- Count the top-level function namespaces: `workOrders`, `taskCards`, `maintenanceRecords`, `discrepancies`, `adCompliance`, `parts`, `signatureAuthEvents`, `returnToService`, `auditLog`, `users`
- All namespaces must be present

**What success looks like:**
```
Functions (10 namespaces, ~60 functions):
  workOrders       ← createWorkOrder, openWorkOrder, closeWorkOrder, ...
  taskCards        ← createTaskCard, completeStep, signTaskCard, ...
  [etc.]
```

**What failure looks like:** Missing namespaces or a deployment error in the dashboard timeline.

---

### ✅ Check 2 — Schema Applied Correctly

**How to check:**
- Convex Dashboard → `athelon-staging` → **Data** tab
- All expected tables must appear (even if empty): `workOrders`, `taskCards`, `taskCardSteps`, `maintenanceRecords`, `discrepancies`, `parts`, `eightOneThirtyRecords`, `signatureAuthEvents`, `auditLog`, `users`, `aircraft`, `engines`, `returnToService`, `adCompliance`, `partInstallationHistory`

**Schema change verification:**
- Verify `parts` table schema includes `"pending_inspection"` as a location option (visible in the table schema view)
- Verify `auditLog` table schema includes `"qcm_reviewed"` event type

**What failure looks like:** Missing tables, or TypeScript compile errors when running `pnpm turbo typecheck` after schema deployment.

---

### ✅ Check 3 — JWT Auth Chain Working

**How to check:**
1. Open [https://staging.athelon.app](https://staging.athelon.app) in a browser
2. Sign in with a test Clerk account that belongs to a Clerk org with `athelon_role` set
3. The app should redirect to `/dashboard` without a redirect loop
4. In the browser Console tab, there should be **no** authentication errors (no "401", no "getUserIdentity returned null")
5. In Convex Dashboard → `athelon-staging` → Logs (real-time): observe a function call succeed (from the initial data load)

**What failure looks like:** Redirect loop on sign-in, blank dashboard with no data, or Convex logs showing `getUserIdentity() returns null`.

---

### ✅ Check 4 — Clerk Webhook Firing

**How to check:**
1. Create a new user in the staging Clerk app (sign up with a fresh email)
2. Add that user to the test organization in Clerk
3. Wait 5-10 seconds
4. Go to Convex Dashboard → `athelon-staging` → Data → `users` table
5. The newly created user should appear as a record

**What failure looks like:** User signs up but no record appears in `users` table. Check Clerk Dashboard → Webhooks → Logs → look for failed delivery attempts. Most common cause: wrong `CLERK_WEBHOOK_SIGNING_SECRET` in Convex env vars.

---

### ✅ Check 5 — `_generated/api.ts` Generated Correctly

**How to check:**
```bash
# After running npx convex dev (or npx convex deploy) locally:
ls convex/_generated/api.ts  # Must exist
cat convex/_generated/api.ts | grep "workOrders"  # Must contain api.workOrders.*
cat convex/_generated/api.ts | grep "taskCards"   # Must contain api.taskCards.*
```

**What success looks like:** The file exists and contains entries like:
```typescript
workOrders: {
  createWorkOrder: FunctionReference<"mutation", ...>,
  listWorkOrders: FunctionReference<"query", ...>,
  // ...
}
```

**What failure looks like:** File missing (run `npx convex dev --once` to regenerate), or file exists but is empty/malformed (usually means schema.ts has a syntax error).

---

### ✅ Check 6 — Smoke Test Run Against Staging

**How to check:**
```bash
SMOKE_TEST_BASE_URL=https://staging.athelon.app \
SMOKE_TEST_USER_TOKEN=<staging-test-token> \
SMOKE_TEST_ORG_ID=<staging-test-org-id> \
pnpm run test:smoke
```

All 5 smoke test paths must pass:
1. Sign-in flow (Clerk session creation)
2. Create work order (mutation with auth + org context)
3. Sign task card step (`completeStep` with `signatureAuthEvent`)
4. View dashboard (`listWorkOrders` query, org-scoped)
5. Org context switch (JWT refresh, Convex re-auth)

**What failure looks like:** Any of the 5 paths returning non-200, unexpected redirect, or Convex error. Check the smoke test output for specific step failure.

---

### ✅ Check 7 — CI Pipeline Green on First PR

**How to check:**
1. Push a test branch with a trivial change (add a comment to any file)
2. Open a PR targeting `main`
3. All CI jobs must pass: `lint`, `typecheck`, `test`, `security`, `convex-schema-diff`, `deploy-preview`
4. The PR comment from `deploy-preview` job must show "✅ Deployed" for Convex

**What failure looks like:** `test` job failing on `convex-test` step — most likely cause is `_generated/api.ts` stale or not committed. Run `npx convex dev --once` before pushing.

> **Note:** `convex/_generated/api.ts` should be committed to git. Some teams gitignore it; we do not. It's generated from the schema and is stable between runs on the same schema. Committing it means CI doesn't need a running Convex connection to typecheck.

---

### ✅ Check 8 — Staging Deploy Notification in Slack

**How to check:**
1. Merge a PR to `main`
2. The `deploy-staging` CI job runs automatically
3. Within ~5 minutes, a message should appear in `#deploys` Slack channel:
   ```
   ✅ Staging deploy complete
   Commit: [sha]
   Author: [actor]
   Preview: https://staging.athelon.app
   ```

**What failure looks like:** No Slack message, or message in `#incidents` instead. Check GitHub Actions → the run for the merged commit → `deploy-staging` job → Slack notification step for errors. Most common cause: `SLACK_BOT_TOKEN` or `SLACK_DEPLOYS_CHANNEL_ID` not set in GitHub Actions secrets.

---

## Part 6: Staging Environment Setup for Alpha Testing

This section covers setting up `athelon-staging` specifically for Gary (DOM) and Linda (QCM) at the alpha shop.

### 6.1 — Alpha Test Organization

1. In the **staging Clerk application**, create a new organization:
   - Name: `Reid Aviation Services` (Gary's shop name — use the real name once confirmed)
   - Slug: `reid-aviation`
2. Set organization public metadata:
```json
{
  "athelon_role": "dom",
  "station_codes": ["KRHV"]
}
```

### 6.2 — Alpha User Accounts

Create the following Clerk user accounts in the staging Clerk instance:

| User | Email | `athelon_role` | Notes |
|---|---|---|---|
| Gary Hutchins | gary@[shop-domain].com | `"dom"` | DOM — can close WOs, view close readiness, create work orders |
| Linda Paredes | linda@[shop-domain].com | `"qcm"` | QCM — can perform QCM review action |
| Troy Weaver (proxy) | troy-test@athelon.app | `"amt"` | A&P Mechanic proxy for initial testing |
| Pat Deluca (proxy) | pat-test@athelon.app | `"inspector"` | IA holder proxy for initial testing |

> Use real emails for Gary and Linda (they'll receive Clerk sign-in emails). Use team alias emails for Troy and Pat proxies — those are Athelon team accounts for controlled testing.

Add all four users to the `Reid Aviation Services` organization in Clerk.

### 6.3 — Seed Data for Alpha Test

Before Gary and Linda's first session, populate the staging database with realistic baseline data. This prevents them from starting with a completely empty system, which is disorienting.

Run the seed script (to be created by Devraj in Wave 2):
```bash
# After Wave 2 seed script is available:
CONVEX_DEPLOY_KEY=<staging-key> npx convex run seed:alpha
```

Baseline seed data should include:
- 2–3 aircraft records for common GA aircraft at KRHV (e.g. Cessna 172, Piper Cherokee)
- 1 open work order for N12345 (the alpha scenario aircraft)
- 1 set of task cards against that work order (matching the Definition-of-Done scenario in mvp-scope.md)
- Sample AD compliance records for those aircraft
- No pre-signed records (Gary and Linda will do the actual signing)

### 6.4 — Access URLs for Alpha Testers

| Resource | URL |
|---|---|
| Alpha staging app | https://staging.athelon.app |
| Clerk sign-in | https://staging.athelon.app/sign-in |
| Support contact | jonas@athelon.app (for env issues) |

Send Gary and Linda a welcome email (from Gary's contact at Athelon) with:
1. Sign-in URL
2. Their pre-created email (so they don't try to create a new account)
3. A note that this is the shared staging environment — data from team testing may be visible

### 6.5 — Staging Data Hygiene

Staging is a shared environment (per architecture decision in environment-setup.md §4 — "Phase 1 simplification"). Data written by PR previews may be visible to Gary and Linda.

During the alpha test period:
- Engineers should avoid writing obviously fake or test-polluted data directly to `athelon-staging` production tables
- Use the Convex Dashboard data browser to delete obvious test noise if it appears
- Do NOT give Gary or Linda delete access — if they see bad data, Jonas or Rafael will clean it via the dashboard

A future Wave creates per-PR Convex project isolation (using Convex branches feature). That's out of scope for Wave 1.

---

## Summary

| Task | Status | Owner |
|---|---|---|
| Create `athelon-staging` and `athelon-prod` Convex projects | TODO | Jonas |
| Create and store deploy keys in GitHub Actions secrets | TODO | Jonas |
| Set all Convex Dashboard env vars (staging) | TODO | Jonas |
| Set all Vercel env vars (preview + prod scopes) | TODO | Jonas |
| Create Clerk JWT template (`convex`) in staging | TODO | Jonas |
| Configure Clerk webhook → Convex HTTP endpoint (staging) | TODO | Jonas |
| Run first manual deploy to staging | TODO | Jonas |
| Execute all 8 verification checks | TODO | Jonas |
| Create alpha test org + user accounts in staging Clerk | TODO | Jonas |
| Notify Gary and Linda with access details | TODO | Rafael |

**Estimated time for Jonas: 4–6 hours (mostly waiting on dashboards and copy-pasting credentials)**

---

*Jonas Harker — 2026-02-22*
*Questions: #platform-infra. Do not try to shortcut the webhook setup. The webhook is why user records exist in Convex. Without it, every mutation that calls `requireOrgContext` will return UNAUTHENTICATED for a correctly signed-in user.*
