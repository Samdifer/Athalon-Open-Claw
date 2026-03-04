# Athelon — Environment Variable Reference & Developer Setup Guide
**Author:** Jonas Harker, DevOps / Platform
**Date:** 2026-02-22
**Phase:** 4 — Alpha Sprint

> *Read this before you write a single line of code. Environment misconfiguration is the number one cause of "it works on my machine" bugs in this stack. Do it right once. — JH*

---

## Table of Contents

1. [Architecture Overview (env vars by service)](#1-architecture-overview)
2. [Complete Variable Reference](#2-complete-variable-reference)
3. [New Developer Setup (step-by-step)](#3-new-developer-setup)
4. [Per-Environment Configuration](#4-per-environment-configuration)
5. [Secrets Rotation Procedure](#5-secrets-rotation-procedure)
6. [Troubleshooting Common Failures](#6-troubleshooting-common-failures)

---

## 1. Architecture Overview

Athelon has three distinct configuration surfaces. Each service reads from its own source. Variables are **never shared across services unless documented explicitly**.

```
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (Next.js / apps/web)                                    │
│  Source: Vercel Project Environment Variables                   │
│  Scopes: Production, Preview, Development                       │
│                                                                 │
│  NEXT_PUBLIC_* vars → bundled into client JavaScript (public)  │
│  Other vars        → server-only (Route Handlers, Server       │
│                       Components, middleware)                   │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         │ JWT (via Clerk)              │ Convex URL
         ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│  CLERK               │    │  CONVEX (convex/ directory)      │
│  Source: Clerk       │    │  Source: Convex Dashboard        │
│  Dashboard           │    │  "Environment Variables" section │
│  (no code config)    │    │                                  │
│                      │    │  CLERK_JWT_ISSUER_DOMAIN         │
│  JWT Templates       │    │  CLERK_WEBHOOK_SIGNING_SECRET    │
│  Webhook endpoints   │    │  AWS_ROLE_ARN                    │
│  Org metadata        │    │  LOGTAIL_SOURCE_TOKEN            │
└──────────────────────┘    └──────────────────────────────────┘
```

**Key rule:** Never put `CONVEX_DEPLOY_KEY` in Vercel environment variables and never put `CLERK_SECRET_KEY` in the Convex dashboard. Each secret belongs to exactly one surface.

---

## 2. Complete Variable Reference

### 2.1 Vercel / Next.js Variables

These are set in the **Vercel project dashboard** (Settings → Environment Variables). They are also replicated in `.env.local` for local development (never committed to git).

---

#### Clerk — Authentication

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All | ✅ Yes | Clerk publishable key. Browser-safe. Prefix `pk_live_` for production, `pk_test_` for dev/staging. |
| `CLERK_SECRET_KEY` | All | ✅ Yes | Clerk secret key. **Never expose to browser.** Server-only. Prefix `sk_live_` for production, `sk_test_` for dev/staging. |
| `CLERK_WEBHOOK_SECRET` | All | ✅ Yes | Svix webhook signing secret for `/api/webhooks/clerk`. Found in Clerk Dashboard → Webhooks → endpoint detail. Prefix `whsec_`. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | All | Optional | Override default sign-in path. Default: `/sign-in`. Set to `/sign-in` explicitly if using a custom domain. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | All | Optional | Override default sign-up path. Default: `/sign-up`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | All | Optional | Redirect after successful sign-in. Default: `/dashboard`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | All | Optional | Redirect after successful sign-up. Default: `/onboarding`. |

**Where to get Clerk keys:**
- Clerk Dashboard → Your application → API Keys section
- Publishable key: shown on the dashboard home
- Secret key: click "Show secret key"
- Webhook secret: Dashboard → Webhooks → select endpoint → "Signing Secret"

---

#### Convex — Backend Connection

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | All | ✅ Yes | Convex deployment URL. Format: `https://[project-name].convex.cloud`. Browser-safe. Found in Convex Dashboard → your project → "Deployment URL". |
| `CONVEX_DEPLOY_KEY` | CI only | ✅ Yes (CI) | Convex deploy key for `npx convex deploy`. **Never put in the app.** Only in GitHub Actions secrets. Found in Convex Dashboard → Settings → Deploy Keys. |

**Per-environment Convex URLs:**
```
Development:  https://athelon-dev-[yourname].convex.cloud
Staging:      https://athelon-staging.convex.cloud
Production:   https://athelon-prod.convex.cloud
```

---

#### Sentry — Error Tracking

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | All | ✅ Yes | Sentry Data Source Name. Browser-safe (contains no secrets — DSN is public by design). Found in Sentry → Project → Settings → Client Keys (DSN). Format: `https://[key]@[org].ingest.sentry.io/[project-id]`. |
| `SENTRY_AUTH_TOKEN` | CI only | ✅ Yes (CI) | Sentry auth token for source map upload during build. **Never in app.** Only in GitHub Actions secrets. Found in Sentry → Settings → Auth Tokens. |
| `SENTRY_ORG` | CI only | ✅ Yes (CI) | Your Sentry organization slug. Found in Sentry URL: `sentry.io/organizations/[slug]/`. Value: `athelon`. |
| `SENTRY_PROJECT` | CI only | ✅ Yes (CI) | Your Sentry project slug. Value: `athelon-web`. |

**Note on `NEXT_PUBLIC_SENTRY_DSN`:** Despite containing credentials in the URL, the Sentry DSN is intentionally public. It only allows sending events TO Sentry (write-only). It cannot be used to read your Sentry data. Including it in browser bundles is correct and expected.

---

#### Feature Flags

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_FF_MOBILE_ENABLED` | All | No | Enables mobile-optimized layout. `true`/`false`. Default: `false` during alpha. |
| `NEXT_PUBLIC_FF_AD_COMPLIANCE_ENABLED` | All | No | Enables AD compliance module UI. `true`/`false`. Default: `false` until Phase 4 complete. |
| `NEXT_PUBLIC_FF_PARTS_MANAGEMENT_ENABLED` | All | No | Enables parts management pages. `true`/`false`. Default: `false` during alpha. |

**How to use feature flags in code:**
```typescript
// Read as boolean (env vars are always strings)
const isMobileEnabled = process.env.NEXT_PUBLIC_FF_MOBILE_ENABLED === "true";
```

---

#### Build / Deployment Metadata (Vercel-injected, do not set manually)

These are automatically injected by Vercel at build time. They are listed here for reference — Sentry and logging use them.

| Variable | Source | Description |
|---|---|---|
| `VERCEL_ENV` | Vercel (auto) | `"production"`, `"preview"`, or `"development"` |
| `VERCEL_GIT_COMMIT_SHA` | Vercel (auto) | Full SHA of the commit being deployed |
| `VERCEL_GIT_COMMIT_REF` | Vercel (auto) | Branch name or tag |
| `VERCEL_URL` | Vercel (auto) | Deployment URL (unique per deploy, not the alias) |

---

### 2.2 Convex Dashboard Variables

These are set in the **Convex Dashboard** (your project → Settings → Environment Variables). They are NOT Vercel variables. They are NOT `.env.local` variables. They live entirely in Convex's runtime environment.

**Path:** Convex Dashboard → select project (`athelon-dev-[name]`, `athelon-staging`, or `athelon-prod`) → Settings → Environment Variables

---

#### Clerk — JWT Verification

| Variable | Required | Description |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | ✅ Yes | Clerk issuer domain for JWT validation. Convex fetches JWKS from `{domain}/.well-known/jwks.json`. Found in: Clerk Dashboard → JWT Templates → select "Convex" template → "Issuer" field. Format (dev): `https://[instance].clerk.accounts.dev`. Format (prod): `https://clerk.athelon.app` (after custom domain setup). **One value per Convex project.** Dev projects use dev Clerk instance. Prod project uses prod Clerk instance. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | ✅ Yes | Svix signing secret for validating incoming Clerk webhook payloads in Convex HTTP actions. Same value as `CLERK_WEBHOOK_SECRET` in Vercel — they refer to the same Clerk webhook endpoint's signing secret. Format: `whsec_...`. |

---

#### AWS — S3 Audit Export (Convex Scheduled Action)

| Variable | Required | Description |
|---|---|---|
| `AWS_ROLE_ARN` | Required for export | ARN of the IAM role Convex assumes via OIDC for S3 writes. Format: `arn:aws:iam::123456789012:role/athelon-convex-export`. Created by Jonas — do not create manually. |
| `AWS_S3_BUCKET_PREFIX` | Required for export | S3 bucket name prefix for audit log exports. Value: `athelon-retention`. Full bucket names: `athelon-retention-dev`, `athelon-retention-staging`, `athelon-retention-prod`. |

**Note:** There are no static AWS credentials (no `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`). Convex uses OIDC-based assume-role, which is scoped, rotatable, and does not require long-lived credentials. Jonas configures this once per Convex project. Do not add static AWS keys — if you feel tempted, talk to Jonas first.

---

#### Logtail — Structured Log Aggregation

| Variable | Required | Description |
|---|---|---|
| `LOGTAIL_SOURCE_TOKEN` | ✅ Yes | Better Stack Logtail source token. Each Convex project has its own source (dev, staging, prod). Found in: Better Stack → Sources → select source → "Source Token". Format: opaque string. |

---

#### Observability — Sentry from Convex

| Variable | Required | Description |
|---|---|---|
| `SENTRY_DSN` | Optional | Sentry DSN for Convex-side error forwarding. If set, the `withSentry()` wrapper in `convex/lib/sentry.ts` sends errors to Sentry. If unset, errors are logged to Logtail only. In Phase 1 alpha, Logtail is sufficient — add this in Phase 2. |

---

### 2.3 GitHub Actions Secrets

Set at: GitHub repository → Settings → Secrets and variables → Actions → Secrets

| Secret | Used By | Description |
|---|---|---|
| `TURBO_TOKEN` | All CI jobs | Turborepo remote cache token. From Vercel → Team Settings → Tokens. Reduces CI time by 40-60% on cache hits. |
| `CODECOV_TOKEN` | `test` job | Codecov upload token. From codecov.io → Repository settings. |
| `SEMGREP_APP_TOKEN` | `security` job | Semgrep Cloud Platform token. From semgrep.dev → Settings → Tokens. |
| `CONVEX_STAGING_DEPLOY_KEY` | `deploy-preview`, `deploy-staging` | Convex deploy key scoped to `athelon-staging`. From Convex Dashboard → athelon-staging → Settings → Deploy Keys → Create. |
| `CONVEX_PROD_DEPLOY_KEY` | `deploy-prod` | Convex deploy key scoped to `athelon-prod`. From Convex Dashboard → athelon-prod → Settings → Deploy Keys → Create. |
| `VERCEL_TOKEN` | `deploy-prod` | Vercel CLI token for production promotion step. From Vercel → Account Settings → Tokens. |
| `VERCEL_ORG_ID` | `deploy-prod` | Vercel team/org ID. Found in Vercel → Team Settings → General → "Team ID". Format: `team_...`. |
| `VERCEL_PROJECT_ID` | `deploy-prod` | Vercel project ID. Found in Vercel → Project Settings → General → "Project ID". Format: `prj_...`. |
| `SMOKE_TEST_USER_TOKEN` | `deploy-staging` | Clerk session token for staging smoke test account. See §3.6. |
| `SMOKE_TEST_ORG_ID` | `deploy-staging` | Convex org `_id` for the staging smoke test org. |
| `PROD_SMOKE_TEST_USER_TOKEN` | `deploy-prod` | Clerk session token for production smoke test account. Separate from staging. |
| `PROD_SMOKE_TEST_ORG_ID` | `deploy-prod` | Convex org `_id` for production smoke test org. |
| `SLACK_BOT_TOKEN` | `deploy-staging`, `deploy-prod` | Slack bot OAuth token with `chat:write` scope. From Slack API → your app → OAuth & Permissions. |
| `SLACK_INCIDENTS_CHANNEL_ID` | `deploy-staging`, `deploy-prod` | Slack channel ID for `#incidents`. (Right-click channel → Copy link → ID is the last path segment.) |
| `SLACK_DEPLOYS_CHANNEL_ID` | `deploy-staging`, `deploy-prod` | Slack channel ID for `#deploys`. |

### 2.4 GitHub Actions Variables (non-secret)

Set at: GitHub repository → Settings → Secrets and variables → Actions → Variables

| Variable | Used By | Value |
|---|---|---|
| `TURBO_TEAM` | All CI jobs | Vercel team slug (not ID). The slug is the subdomain part of your Vercel URL: `vercel.com/[team-slug]`. Value: `athelon`. |

---

## 3. New Developer Setup

Follow these steps in order. Do not skip steps or reorder them. Each step depends on the previous.

### Step 1 — Prerequisites

Install required tools:

```bash
# Node.js 20 (LTS) — use nvm or fnm for version management
nvm install 20
nvm use 20
node --version  # Should output v20.x.x

# pnpm 9 (package manager)
corepack enable
corepack prepare pnpm@9 --activate
pnpm --version  # Should output 9.x.x

# Convex CLI
pnpm add -g convex
npx convex --version  # Should output 1.x.x

# Vercel CLI (optional — only needed if you're doing deployment work)
pnpm add -g vercel
vercel --version
```

### Step 2 — Clone and install

```bash
git clone git@github.com:athelon/athelon.git
cd athelon
pnpm install          # Installs all workspaces (apps/web, packages/types, convex)
pnpm turbo typecheck  # Sanity check — should pass with no errors
```

### Step 3 — Clerk account and application

1. Go to [clerk.com](https://clerk.com) and create an account (or sign in if you already have one)
2. Create a new Clerk application named `athelon-dev-[yourname]` (e.g., `athelon-dev-jonas`)
3. In the application settings:
   - **Instance type:** Development
   - **Authentication:** Email + password, Google OAuth (enable both)
   - **Organizations:** Enable "Organizations" feature
4. Note your keys from API Keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

### Step 4 — Convex project provisioning

```bash
# Create your personal dev Convex project
# This will prompt you to log in to Convex (creates account if needed)
cd athelon  # repo root
npx convex dev --configure

# When prompted:
#   "Configure a new project": Yes
#   "Project name": athelon-dev-[yourname]  (e.g., athelon-dev-jonas)

# This creates:
#   - A Convex project at convex.dev under your account
#   - A .env.local file in the repo root with CONVEX_DEPLOYMENT set
# Note: .env.local is gitignored — it won't be committed

# Verify:
cat .env.local  # Should contain CONVEX_DEPLOYMENT=dev:athelon-dev-[yourname]
```

### Step 5 — Set Convex environment variables

In the [Convex Dashboard](https://dashboard.convex.dev), navigate to your project (`athelon-dev-[yourname]`) → Settings → Environment Variables.

Add these variables:

```
CLERK_JWT_ISSUER_DOMAIN        = https://[your-clerk-dev-instance].clerk.accounts.dev
CLERK_WEBHOOK_SIGNING_SECRET   = whsec_[from Clerk webhook setup — see Step 6]
LOGTAIL_SOURCE_TOKEN           = [skip for local dev — set when you need log aggregation]
```

**Finding your Clerk issuer domain:**
- Clerk Dashboard → JWT Templates → Click "New Template" → Choose "Convex"
- The template creation page shows the "Issuer" field — copy it exactly
- It should look like: `https://liberal-goose-42.clerk.accounts.dev`

**Configure the JWT template while you're there:**
- Template name: `convex`
- Token lifetime: `60` seconds
- Claims (paste this exactly):
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
- Save the template.

### Step 6 — Configure Clerk webhook

For local development, you need to receive Clerk webhooks locally so that user/org creation events sync to your dev Convex project.

**Option A: ngrok (recommended for local dev)**

```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start a tunnel to your local Next.js dev server
ngrok http 3000

# Note the HTTPS URL: https://[random-id].ngrok-free.app
```

In Clerk Dashboard → Webhooks → Add Endpoint:
```
URL: https://[your-ngrok-url].ngrok-free.app/api/webhooks/clerk
Events to subscribe:
  ✅ user.created
  ✅ user.updated
  ✅ user.deleted
  ✅ organizationMembership.created
  ✅ organizationMembership.deleted
  ✅ organizationMembership.updated
  ✅ session.created
  ✅ session.ended
```

After creating the endpoint, click on it and find the "Signing Secret" — this is your `CLERK_WEBHOOK_SIGNING_SECRET` / `CLERK_WEBHOOK_SECRET`.

**Option B: Convex HTTP endpoint directly**

Since Clerk can also send webhooks directly to your Convex HTTP action URL, you can skip ngrok and route webhooks to Convex:

```
URL: https://[your-convex-project].convex.site/webhooks/clerk
```

Find your Convex site URL in: Convex Dashboard → your project → Settings → "HTTP Actions URL".

This is cleaner for local dev and doesn't require ngrok to be running.

### Step 7 — Create `.env.local`

The `npx convex dev --configure` step (Step 4) creates a `.env.local` with the Convex deployment config. You need to add the remaining variables:

```bash
# apps/web/.env.local  (this is where Next.js reads it)
# Copy from .env.local.example and fill in your values:
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```bash
# ─── Convex ──────────────────────────────────────────────────────────────────
# Your personal dev Convex URL — found in Convex Dashboard → your project
NEXT_PUBLIC_CONVEX_URL=https://athelon-dev-[yourname].convex.cloud

# ─── Clerk ───────────────────────────────────────────────────────────────────
# From Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# From Clerk Dashboard → Webhooks → your endpoint → Signing Secret
CLERK_WEBHOOK_SECRET=whsec_...

# Post-auth redirect URLs (adjust if you prefer different routes)
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ─── Sentry ──────────────────────────────────────────────────────────────────
# From Sentry → your project → Settings → Client Keys (DSN)
# For local dev, this is optional — errors will just not appear in Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# ─── Feature Flags ───────────────────────────────────────────────────────────
# Enable modules as they're built
NEXT_PUBLIC_FF_MOBILE_ENABLED=false
NEXT_PUBLIC_FF_AD_COMPLIANCE_ENABLED=false
NEXT_PUBLIC_FF_PARTS_MANAGEMENT_ENABLED=false
```

**Security notes:**
- `.env.local` is in `.gitignore` — it will never be committed
- Never add this file to git, even temporarily
- Never send these values via Slack or email — use 1Password or Bitwarden to share between teammates if needed (ask Jonas)
- `NEXT_PUBLIC_*` variables are embedded in the browser bundle — they are not secret and should not contain sensitive values

### Step 8 — Deploy schema and functions to your dev Convex project

```bash
# From repo root, deploy your Convex functions to the dev project
npx convex deploy

# This:
#   1. Validates schema.ts and all function files
#   2. Uploads and deploys functions to athelon-dev-[yourname]
#   3. Applies schema to the Convex database

# Expected output:
#   ✔ Preparing Convex functions
#   ✔ Syncing schema
#   ✔ Deploying functions
#   ✔ Successfully deployed!

# Verify in Convex Dashboard: Functions tab should show all mutations/queries
```

### Step 9 — Start the development server

```bash
# Terminal 1: Convex dev mode (watches for changes, hot-reloads functions)
npx convex dev

# Terminal 2: Next.js dev server
pnpm --filter web dev

# Open: http://localhost:3000
# Sign up with your Clerk test account.
# After sign-up, create a test organization in Clerk dashboard and add yourself.
```

### Step 10 — Verify the full auth chain

1. Open http://localhost:3000
2. Click "Sign In" → create a test account
3. In the Clerk Dashboard, navigate to Organizations → Create Organization
   - Name: "Test Station Alpha"
   - Set org metadata: `{ "athelon_role": "amt" }`
4. Add your user to the organization
5. Return to the app — you should be redirected to `/dashboard`
6. In the Convex Dashboard, check the Data tab — you should see a record in the `users` table

If the webhook is working correctly, the `users` record was created automatically when you signed up. If it's missing, the webhook didn't fire — check Step 6.

---

## 4. Per-Environment Configuration

### Development (local, `feat/*` branches)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (Clerk dev instance) |
| `CLERK_SECRET_KEY` | `sk_test_...` (Clerk dev instance) |
| `NEXT_PUBLIC_CONVEX_URL` | `https://athelon-dev-[yourname].convex.cloud` |
| `CONVEX_DEPLOY_KEY` | Not set — use `npx convex dev` which authenticates via browser |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN (or unset to skip error tracking locally) |

Convex environment variables (in Convex Dashboard → `athelon-dev-[yourname]`):

| Variable | Value |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://[instance].clerk.accounts.dev` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_...` (your dev webhook endpoint secret) |
| `LOGTAIL_SOURCE_TOKEN` | (optional for local dev) |

---

### Staging (`athelon-staging`, maps to `main` branch)

Managed by Jonas. Set in:
- Vercel: Project → Settings → Environment Variables → Preview scope
- Convex Dashboard: `athelon-staging` project → Settings → Environment Variables

| Variable | Location | Value |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel Preview | `pk_test_...` (shared staging Clerk dev instance) |
| `CLERK_SECRET_KEY` | Vercel Preview | `sk_test_...` |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel Preview | `https://athelon-staging.convex.cloud` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | `https://[staging-instance].clerk.accounts.dev` |
| `LOGTAIL_SOURCE_TOKEN` | Convex | staging source token |

---

### Production (`athelon-prod`, deployed via manual `deploy-prod` workflow)

Managed exclusively by Jonas. No developer should touch these without approval.

| Variable | Location | Value |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel Production | `pk_live_...` (Clerk production instance) |
| `CLERK_SECRET_KEY` | Vercel Production | `sk_live_...` |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel Production | `https://athelon-prod.convex.cloud` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | `https://clerk.athelon.app` (custom domain after Phase 2) |
| `LOGTAIL_SOURCE_TOKEN` | Convex | production source token (separate source from staging) |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel Production | production project DSN |
| `AWS_ROLE_ARN` | Convex | prod IAM role ARN |

---

## 5. Secrets Rotation Procedure

When a secret needs to be rotated (compromised, expired, or scheduled rotation):

### Clerk keys

1. Clerk Dashboard → API Keys → Roll secret key
2. Update `CLERK_SECRET_KEY` in Vercel (all affected scopes)
3. Trigger a Vercel redeploy (changing an env var does NOT automatically redeploy)
4. Verify auth still works: sign in at the affected environment, confirm Convex queries return data
5. Document the rotation in the infrastructure changelog with timestamp and reason

### Convex deploy keys

1. Convex Dashboard → project → Settings → Deploy Keys → Revoke old key → Create new key
2. Update `CONVEX_STAGING_DEPLOY_KEY` or `CONVEX_PROD_DEPLOY_KEY` in GitHub Actions secrets
3. Trigger a CI run to verify the new key works
4. Document in infrastructure changelog

### Clerk webhook secrets

Rotating a webhook secret requires updating it in both Vercel AND Convex (they are the same value, two places):
1. Clerk Dashboard → Webhooks → endpoint → Roll signing secret
2. Update `CLERK_WEBHOOK_SECRET` in Vercel
3. Update `CLERK_WEBHOOK_SIGNING_SECRET` in Convex Dashboard
4. Send a test webhook event from Clerk to verify the signature validates
5. Document in infrastructure changelog

---

## 6. Troubleshooting Common Failures

### "getUserIdentity() returns null" in Convex functions

**Cause:** JWT is not reaching Convex, or `CLERK_JWT_ISSUER_DOMAIN` is wrong.

**Check:**
1. Is `CLERK_JWT_ISSUER_DOMAIN` set in the Convex dashboard for the correct project?
2. Does the value match the "Issuer" field in the Clerk JWT Template exactly (including scheme, no trailing slash)?
3. Is the JWT Template named exactly `convex` in Clerk? The template name must match.
4. Are you using `ConvexProviderWithClerk` in your app providers? Without it, no token is passed.
5. In the browser, check localStorage for `clerk-db-jwt-...` keys — if empty, Clerk isn't issuing tokens.

### "Missing CLERK_WEBHOOK_SIGNING_SECRET" error in Convex logs

**Cause:** The Convex environment variable isn't set.

**Fix:** Convex Dashboard → your project → Settings → Environment Variables → Add `CLERK_WEBHOOK_SIGNING_SECRET`.

### "Invalid signature" from webhook endpoint

**Cause:** The webhook signing secret in Convex doesn't match the secret Clerk is using.

**Fix:**
1. Clerk Dashboard → Webhooks → your endpoint → copy the "Signing Secret" exactly
2. Update `CLERK_WEBHOOK_SIGNING_SECRET` in Convex (not in Vercel — these are different env surfaces)
3. Re-send the failed webhook from Clerk's Webhook Attempt log

### "NEXT_PUBLIC_CONVEX_URL is not defined"

**Cause:** Missing env var in `.env.local` or in Vercel.

**Fix:** Ensure `apps/web/.env.local` contains `NEXT_PUBLIC_CONVEX_URL`. Note: the variable must be in `apps/web/.env.local`, NOT in the repo root `.env.local` (Next.js reads from the app directory).

### `pnpm turbo typecheck` fails after pulling

**Cause:** `_generated/api.ts` is stale. Convex regenerates this file when you run `npx convex dev`.

**Fix:**
```bash
npx convex dev --once  # Generate the API types without starting the dev server
pnpm turbo typecheck   # Re-run — should now pass
```

### Vercel preview deployments showing stale Convex data

**Cause:** Preview deployments share the `athelon-staging` Convex project. Data written by one PR is visible to all preview deployments.

**This is expected behavior** (Phase 1 decision per architecture doc §2.2). Not a bug. If you need isolated test data, create and destroy it in the Convex Dashboard's data browser.

### CI failing on "high severity vulnerabilities" in `pnpm audit`

**Cause:** A dependency has a high/critical CVE.

**Fix:**
1. Run `pnpm audit` locally to identify the package
2. Check if there's an updated version: `pnpm update [package-name]`
3. If the vulnerable package is a transitive dependency, add an override in root `package.json`:
   ```json
   {
     "pnpm": {
       "overrides": {
         "vulnerable-package": ">=fixed-version"
       }
     }
   }
   ```
4. If the vulnerability has no fix yet, add it to the `.audit-ignorelist` and document the CVE, risk assessment, and expected fix date in the infrastructure changelog. Get Jonas's approval before ignoring a high or critical CVE.

---

*Last updated: Jonas Harker, 2026-02-22*
*Questions: #platform-infra on Slack. Don't guess — ask.*
