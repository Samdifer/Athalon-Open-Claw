# WS19-A — P1 Production Deployment Execution

**Phase:** 19 — P1 Launch  
**Workstream:** WS19-A  
**Owners:** Jonas Harker (Deployment Lead) · Devraj Anand (Infrastructure) · Cilla Oduya (QA / Smoke Test)  
**Depends on:** WS18-G `PROD-AUTH-V1.1-FULL-GO` (2026-02-22)  
**Deployment Type:** Phase P1 — Base Deployment (Day 1, first real customer)  
**Document ID:** WS19-A-P1-DEPLOY-V1  
**Date:** 2026-02-23  
**Status: PRODUCTION DEPLOYED — P1 COMPLETE ✅**

---

## 0. Authorization Reference

This deployment is executed under **PROD-AUTH-V1.1-FULL-GO** (WS18-G, 2026-02-22), issued by unanimous vote of the production authorization board:

| Signatory | Role | Date |
|---|---|---|
| Nadia Solis | Product Manager | 2026-02-22 |
| Marcus Webb | Regulatory / Compliance | 2026-02-22 |
| Rosa Eaton | Aviation Compliance Advisor | 2026-02-22 |
| Cilla Oduya | QA Lead | 2026-02-22 |

**P1 activation owner:** Jonas Harker  
**First customer:** [SHOP-P1] — Part 145 Repair Station (identity withheld in simulation artifact)  
**This document covers:** Phase P1 deployment only. P2 through P6 activations are governed by their own phase-activation records.

---

## 1. Objective Checklist — Explicit PASS/FAIL Criteria

### 1.1 Pre-Deployment Gate

All items must be PASS before deployment command is issued. A single FAIL blocks deployment.

| ID | Criterion | PASS Condition | FAIL Condition |
|---|---|---|---|
| PRE-01 | Authorization document present | WS18-G on file, status `FULL GO` | WS18-G missing or not yet `FULL GO` |
| PRE-02 | Production environment variables match P1 spec | All vars in §2.2 set; values confirmed against template | Any required var unset, wrong value, or memo-gated var set to `true` prematurely |
| PRE-03 | Node.js runtime parity | Production Node v22.14.0 matches staging v22.14.0 | Version mismatch ≥ minor |
| PRE-04 | Convex schema clean push | `npx convex deploy` exits 0; 0 migration conflicts | Exit non-zero or schema conflict reported |
| PRE-05 | Clerk production org role schema matches staging | MECHANIC/IA/DOM/QCM/COORDINATOR roles present in production metadata schema | Any role absent or mis-typed |
| PRE-06 | MFA enforcement verified in production Clerk tenant | IA biometric-only re-auth rejected at test call | Biometric-only accepted by production Clerk |
| PRE-07 | Vercel build succeeds on production branch | Build exit 0; all routes present in output | Build fails, any route 404, or First Load JS regression > 20% |
| PRE-08 | Secrets in Vercel env stored as encrypted | All `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` stored as Vercel encrypted secrets | Any secret stored as plain text env var |
| PRE-09 | Cron jobs registered in Convex | `flagExpiredEquipment` and `checkAuthorizationTimeouts` active | Either cron absent from Convex dashboard |
| PRE-10 | No pending schema migrations | `npx convex run internal:schema:verify` returns 0 inconsistencies | Any orphaned documents, index mismatches, or deprecated tables |
| PRE-11 | Rollback procedure reviewed by Jonas | Jonas has confirmed rollback steps in §6 are executable | Not reviewed |
| PRE-12 | Memo-gated flags explicitly set `false` | `PRECLOSE_WS16F_EXPIREDCAL_ENABLED=false`, `DISC_AUTH_EMAIL_DISPATCH_ENABLED=false` confirmed in Vercel | Either flag set `true` at time of P1 deploy |

### 1.2 Deployment Gate

| ID | Criterion | PASS Condition | FAIL Condition |
|---|---|---|---|
| DEP-01 | Convex production deployment succeeds | 47 functions deployed; crons 2 active; schema 31 tables; indexes 89 | Function count mismatch, cron not scheduled, or schema inconsistency |
| DEP-02 | Vercel production build and promotion succeeds | Build exits 0; production URL resolves; no 5xx on `/` within 60s of promotion | Build fails or production URL returns 5xx |
| DEP-03 | Clerk webhook delivers to production endpoint | POST `user.created` to `/api/webhooks/clerk` returns 200 | 4xx/5xx from webhook endpoint within 120s of first user event |
| DEP-04 | First production Convex query resolves | `workOrders:list` query succeeds with valid session | Query returns error or hangs > 5s |
| DEP-05 | Environment variable audit post-deploy | Vercel environment tab matches §2.2 exactly | Any discrepancy |

### 1.3 Post-Deployment Gate (P1 Activation Complete)

Cilla must witness and confirm the entire critical receipt set before P1 is declared complete. All six must PASS.

| ID | Receipt | PASS Condition | FAIL Condition |
|---|---|---|---|
| POST-01 | WS17-B RA-22 | Offline→online auth replay succeeds exactly-once in production | Replay duplicate or failure |
| POST-02 | WS17-B RA-23 | Offline sign-off with expired auth TTL correctly rejected on sync | Expired token accepted |
| POST-03 | WS17-G TC-G-05 | Qualification check runs BEFORE auth token consumed in RTS initiation | Ordering violation detected |
| POST-04 | WS17-H TC-H-07 | Pre-close returns BLOCKING on any rule evaluation error; no close path | Fail-open path reachable |
| POST-05 | WS17-K TC-K-03/06 | Customer portal shows no internal status leak; no "AOG" in customer payload | Internal field or AOG string visible |
| POST-06 | WS17-L TC-L-06 | Discrepancy authorization scope-change supersede chain behaves correctly | Supersede chain broken or skips state |

**P1 activation declared COMPLETE only after all 12 POST-01..06 sub-checks (six receipts, two criteria each) PASS and Jonas, Cilla, and Devraj sign the deployment receipt in §7.**

---

## 2. Pre-Deployment Checklist

### 2.1 Environment Validation

Executed by Devraj Anand. Verified 2026-02-23 starting at 06:30Z.

| Check | Target | Result |
|---|---|---|
| Node.js version | v22.14.0 | ✅ PASS — production Vercel runtime confirmed v22.14.0 |
| Next.js version | 14.2.18 | ✅ PASS — `package.json` locked at 14.2.18 |
| Convex client SDK | 1.14.3 | ✅ PASS — `package-lock.json` hash verified against staging |
| TypeScript config | ES2022 target | ✅ PASS — `tsconfig.json` unchanged from staging |
| Tailwind CSS | 3.4.1 | ✅ PASS |
| Deployment branch | `release/v1.1-production` | ✅ PASS — SHA `a3f8c2d` pinned; matches Phase 17 freeze artifact |
| Convex project linked | `athelon-production` | ✅ PASS — `.env.production` `CONVEX_DEPLOYMENT` points to production org |
| Vercel project linked | `athelon-app` | ✅ PASS — production project connected; `main` branch set as production branch |
| TypeScript clean build | `npx tsc --noEmit` | ✅ PASS — 0 errors, 0 warnings |

**PRE-01 Environment Validation: ALL PASS**

---

### 2.2 Environment Variables — Production Configuration

The following variables are set in Vercel for the production environment. Encrypted secrets are stored via Vercel secret manager; plaintext values are non-sensitive config constants.

| Variable | Value (or description) | Type | Status |
|---|---|---|---|
| `CONVEX_DEPLOYMENT` | Production deployment ID (Convex dashboard) | Encrypted Secret | ✅ SET |
| `NEXT_PUBLIC_CONVEX_URL` | `https://[prod-deployment].convex.cloud` | Config | ✅ SET |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key | Config | ✅ SET |
| `CLERK_SECRET_KEY` | Production Clerk secret key | Encrypted Secret | ✅ SET |
| `CLERK_WEBHOOK_SECRET` | Webhook HMAC secret (Clerk → Convex sync) | Encrypted Secret | ✅ SET |
| `CAL_POLICY_MEMO_REF` | `"CAL-POLICY-MEMO-V1"` | Config constant | ✅ SET — matches signed memo ID |
| `DISC_AUTH_LIABILITY_MEMO_REF` | `"DISC-AUTH-LIABILITY-MEMO-V1"` | Config constant | ✅ SET — matches signed memo ID |
| `PRECLOSE_WS16B_INTEGRATION_ENABLED` | `"true"` | Feature flag | ✅ SET — WS18-E closure authorized this; R03 active |
| `PRECLOSE_WS16F_EXPIREDCAL_ENABLED` | `"false"` | Feature flag | ✅ SET — memo-gated; P5 activation only |
| `DISC_AUTH_EMAIL_DISPATCH_ENABLED` | `"false"` | Feature flag | ✅ SET — memo-gated; P5 activation only |
| `PORTAL_BASE_URL` | `"https://athelon.app"` | Config | ✅ SET |
| `NEXT_PUBLIC_APP_ENV` | `"production"` | Config | ✅ SET |
| `AUDIT_LOG_RETENTION_YEARS` | `"7"` | Config | ✅ SET — HB-1 resolution; `rsmAcknowledgmentAuditLog` TTL |
| `EMERGENCY_BYPASS_EXPIRY_HOURS` | `"168"` | Config | ✅ SET — HB-4 bypass expiry (7 days max per WS18-F) |
| `PRECLOSE_SNAPSHOT_WINDOW_MINUTES` | `"240"` | Config | ✅ SET — 4-hour window (watch item per Rosa WS18-B) |
| `DISC_AUTH_TIMEOUT_HOURS` | `"48"` | Config | ✅ SET — 48h customer authorization timeout |
| `NEXT_PUBLIC_SENTRY_DSN` | Production Sentry DSN | Config | ✅ SET |
| `SENTRY_AUTH_TOKEN` | Sentry upload token (source maps) | Encrypted Secret | ✅ SET |
| `PAGERDUTY_INTEGRATION_KEY` | PagerDuty routing key (Sev-1 alerts) | Encrypted Secret | ✅ SET |

**PRE-02 through PRE-08 checks: ALL PASS**  
**Marcus Webb confirmation (PRE-02 memo constants):** `CAL_POLICY_MEMO_REF` and `DISC_AUTH_LIABILITY_MEMO_REF` match signed document IDs. Marcus Webb sign-off on record: 2026-02-23 07:00Z.

---

### 2.3 Database Migration Plan

Athelon v1.1 uses Convex (serverless document database). Schema changes are managed through `convex/schema.ts` — Convex applies schema changes atomically on deploy with no downtime migration steps required for document-compatible schema updates.

**Schema state entering P1 production:**

- 31 tables total (up from 24 in v1.0 baseline):
  - New tables added in v1.1: `signatureAuthEvents`, `rsmRevisions`, `rsmAcknowledgmentAuditLog`, `llpComponentRecords`, `llpCycleHistory`, `preCloseSnapshots`, `customerAuthorizationRequests`
  - Existing tables extended: `workOrders` (added `preCloseSnapshotToken`, `rtsSignedAt`), `maintenanceRecords` (added `authEventId`, `certNumber`), `testEquipmentRecords` (added `calPolicyMemoRef`, `overrideReason`)
- 89 indexes active (up from 61 in v1.0)
- No destructive migrations (no dropped columns; existing fields retained for backwards read compatibility)
- No data backfill required for P1 (shop is new — no legacy data)

**Migration execution plan:**

1. `npx convex deploy` applies schema atomically (no manual migration steps)
2. All new tables start empty (correct for a new customer with no legacy data)
3. All new indexes apply on first document write (no pre-population needed)
4. `internal:schema:verify` run post-deploy to confirm zero inconsistencies

**Note:** If P1 shop had legacy data requiring import, a separate data migration runbook would be required. For this deployment (new shop, greenfield data), no legacy import is needed.

---

### 2.4 Convex Deployment Steps

```bash
# Step 1: Verify production environment is targeted
$ cat .env.production | grep CONVEX_DEPLOYMENT
# → CONVEX_DEPLOYMENT=dep_prod_9a1e4f7c  (production deployment ID)

# Step 2: TypeScript clean check
$ npx tsc --noEmit
# → 0 errors, 0 warnings ✅

# Step 3: Deploy Convex functions to production
$ npx convex deploy --prod
# Expected output:
# ✔ Convex functions ready! (31.2s)
# Deployed: 47 functions (22 mutations, 18 queries, 7 actions, 1 scheduled batch)
# Crons: 2 active (flagExpiredEquipment @02:00 UTC, checkAuthorizationTimeouts @:15)
# Schema: 31 tables validated
# Indexes: 89 indexes active
# ✔ Production deployment complete.

# Step 4: Post-deploy schema verification
$ npx convex run internal:schema:verify --prod
# Expected output:
# ✔ Schema valid. 31 tables, 89 indexes. No inconsistencies.
# ✔ All cron functions registered.
# ✔ No orphaned documents or index mismatches.

# Step 5: Verify cron schedules in Convex dashboard
# flagExpiredEquipment — daily at 02:00 UTC → CONFIRMED
# checkAuthorizationTimeouts — hourly at :15 → CONFIRMED
```

**Convex deployment owner:** Devraj Anand  
**Verification witness:** Jonas Harker

---

### 2.5 Clerk Auth Configuration — Production

Completed by Jonas Harker prior to Vercel deployment.

**Organization setup:**
- Production Clerk organization: `athelon-prod-[SHOP-P1]` (org ID generated on creation)
- Organization type: Single-tenant (one Clerk org per repair station)
- Plan: Clerk Enterprise (required for 7-year log retention — HB-1 resolution per WS18-F)

**Role schema (must match staging exactly):**

| Role | Metadata Key | Permissions |
|---|---|---|
| MECHANIC | `role: "MECHANIC"` | Task card assignment/completion, sign-off (with re-auth) |
| IA | `role: "IA"` | All MECHANIC permissions + RTS sign-off (mandatory re-auth, full cert check) |
| DOM | `role: "DOM"` | All IA permissions + RSM management, emergency bypass |
| QCM | `role: "QCM"` | Read/audit access, receive emergency bypass notifications |
| COORDINATOR | `role: "COORDINATOR"` | Discrepancy auth management, work order coordination |

**MFA enforcement configuration:**
- IA role: MFA required; biometric-only single-factor explicitly rejected (`allowBiometricOnly: false`)
- DOM role: MFA required
- All other roles: MFA encouraged (soft prompt; not enforced at sign-in)
- Re-authentication flow: Clerk `verifyWithPassword` or `verifyWithTOTP` (not biometric-only) per OBJ-05

**Webhook configuration:**
- Endpoint: `https://athelon.app/api/webhooks/clerk`
- Events subscribed: `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organization.membership.created`
- Secret: `CLERK_WEBHOOK_SECRET` (Vercel encrypted secret)
- Retry policy: Clerk default (3 retries, exponential backoff)

**User provisioning (P1 shop staff — pre-seeded by Jonas before go-live):**
- All user accounts created by DOM or Jonas via Clerk dashboard
- Cert numbers and roles set in Clerk user metadata at account creation
- No self-registration allowed (Clerk organization signup disabled; invite-only)

**PRE-05, PRE-06 checks: ALL PASS**

---

### 2.6 Vercel / Hosting Configuration

**Production deployment setup:**
- Project: `athelon-app` in Vercel team `athelon`
- Framework: Next.js 14 (App Router)
- Production branch: `release/v1.1-production` (SHA `a3f8c2d`)
- Build command: `npm run build` (standard Next.js build)
- Output directory: `.next`
- Node.js runtime: v22.x (configured in Vercel project settings)
- Region: `iad1` (US East — closest to P1 shop location)

**Custom domain:**
- Primary: `athelon.app`
- DNS: Vercel nameservers; A/CNAME records verified prior to deploy
- TLS: Vercel auto-provisioned Let's Encrypt certificate; HTTPS enforced; HSTS header active

**Build output verification (expected, matching staging with production env):**
```
Route (app)                         Size     First Load JS
┌ ○ /                               3.2 kB   102 kB
├ ○ /dashboard                      4.1 kB   118 kB
├ ○ /dashboard/tasks                5.8 kB   127 kB
├ ○ /dashboard/work-orders          6.2 kB   129 kB
├ ○ /dashboard/work-orders/[id]     8.4 kB   134 kB
├ ○ /dashboard/compliance/rsm       4.9 kB   122 kB
├ ○ /dashboard/equipment            5.1 kB   123 kB
├ ○ /dashboard/llp                  6.6 kB   131 kB
├ ○ /auth/[token]                   3.8 kB   108 kB
└ ○ /rsm/pending                    3.2 kB   104 kB
First Load JS shared by all: 96 kB
```

**Sentry source map upload:** Configured via `SENTRY_AUTH_TOKEN`; source maps uploaded on every production build for stack trace de-obfuscation.

**PRE-07 check: PASS** (verified against build output in step DEP log §3.3)

---

### 2.7 Secrets Management

All production secrets follow Vercel encrypted environment variable storage. No secrets are:
- Committed to source control
- Present in build logs
- Visible in client-side JavaScript bundles
- Logged by Sentry (PII/secret scrubbing configured)

**Secret inventory:**

| Secret Name | Storage | Rotation Policy | Owner |
|---|---|---|---|
| `CLERK_SECRET_KEY` | Vercel encrypted | On staff departure or quarterly | Jonas Harker |
| `CLERK_WEBHOOK_SECRET` | Vercel encrypted | On webhook endpoint change | Jonas Harker |
| `SENTRY_AUTH_TOKEN` | Vercel encrypted | Annually | Devraj Anand |
| `PAGERDUTY_INTEGRATION_KEY` | Vercel encrypted | On PagerDuty service change | Devraj Anand |
| `CONVEX_DEPLOYMENT` (prod) | Vercel encrypted | On Convex project rotation | Devraj Anand |

**PRE-08: ALL SECRETS ENCRYPTED IN VERCEL — PASS**

---

## 3. Deployment Execution Log (Simulated)

All timestamps UTC. Jonas Harker, Devraj Anand on deployment calls. Cilla Oduya on standby for post-deploy receipts.

---

### 3.1 Pre-Deployment Checklist Execution

| Time (UTC) | Step | Actor | Result |
|---|---|---|---|
| 2026-02-23 07:00Z | Marcus Webb confirms memo constants match signed document IDs (PRE-02) | Marcus Webb | ✅ PASS |
| 2026-02-23 07:05Z | Jonas reviews rollback procedure (§6) and confirms executable (PRE-11) | Jonas Harker | ✅ PASS |
| 2026-02-23 07:10Z | Devraj runs `npx tsc --noEmit` on `release/v1.1-production` SHA `a3f8c2d` | Devraj Anand | ✅ PASS — 0 errors |
| 2026-02-23 07:14Z | Jonas confirms Node.js v22.14.0 in Vercel production project settings | Jonas Harker | ✅ PASS |
| 2026-02-23 07:16Z | Jonas audits all environment variables against §2.2 template in Vercel dashboard | Jonas Harker | ✅ PASS — all 19 vars confirmed |
| 2026-02-23 07:18Z | Jonas confirms `PRECLOSE_WS16F_EXPIREDCAL_ENABLED=false` (PRE-12a) | Jonas Harker | ✅ PASS |
| 2026-02-23 07:18Z | Jonas confirms `DISC_AUTH_EMAIL_DISPATCH_ENABLED=false` (PRE-12b) | Jonas Harker | ✅ PASS |
| 2026-02-23 07:20Z | Devraj verifies Clerk production org role schema: 5 roles present and typed correctly | Devraj Anand | ✅ PASS — PRE-05 |
| 2026-02-23 07:22Z | Jonas calls Clerk IA re-auth test path; biometric-only correctly rejected in production tenant | Jonas Harker | ✅ PASS — PRE-06 |
| 2026-02-23 07:25Z | Devraj confirms Vercel secrets are all stored as encrypted (not plaintext) (PRE-08) | Devraj Anand | ✅ PASS |
| 2026-02-23 07:27Z | Jonas verbal GO/NO-GO confirmation with Devraj before deploying | Jonas Harker | ✅ GO |

**PRE-DEPLOYMENT GATE: 12/12 PASS. Deployment authorized to proceed.**

---

### 3.2 Convex Production Deployment

| Time (UTC) | Command / Action | Actor | Output / Result |
|---|---|---|---|
| 2026-02-23 07:30Z | `npx convex deploy --prod` issued | Devraj Anand | Running… |
| 2026-02-23 07:31Z | Convex functions building | Auto | Functions compiling (31.2s elapsed) |
| 2026-02-23 08:01Z | `npx convex deploy --prod` completes | Auto | ✅ PASS — 47 functions deployed; 2 crons active; 31 tables; 89 indexes |
| 2026-02-23 08:03Z | `npx convex run internal:schema:verify --prod` | Devraj Anand | ✅ PASS — 0 inconsistencies |
| 2026-02-23 08:04Z | Convex dashboard cron verification: `flagExpiredEquipment` @02:00 UTC | Jonas Harker | ✅ CONFIRMED |
| 2026-02-23 08:04Z | Convex dashboard cron verification: `checkAuthorizationTimeouts` @:15 | Jonas Harker | ✅ CONFIRMED |

**DEP-01: PASS**

---

### 3.3 Vercel Production Build and Promotion

| Time (UTC) | Action | Actor | Result |
|---|---|---|---|
| 2026-02-23 08:06Z | Push `release/v1.1-production` SHA `a3f8c2d` to GitHub production remote | Jonas Harker | Push confirmed |
| 2026-02-23 08:06Z | Vercel production build triggered automatically | Vercel CI | Building… |
| 2026-02-23 08:10Z | Vercel build completes | Vercel CI | ✅ SUCCESS (4m 28s) — all routes present; First Load JS 96 kB (no regression) |
| 2026-02-23 08:11Z | Sentry source map upload confirmed | Auto | ✅ 47 source maps uploaded |
| 2026-02-23 08:11Z | Vercel promotes build to production domain `athelon.app` | Auto | Promoted |
| 2026-02-23 08:12Z | Jonas verifies `https://athelon.app` resolves and returns 200 | Jonas Harker | ✅ PASS — HTTP 200 in 0.4s |
| 2026-02-23 08:13Z | Jonas checks `/dashboard` with DOM test session — no 5xx within 60s | Jonas Harker | ✅ PASS |

**DEP-02: PASS**

---

### 3.4 Clerk Webhook Verification

| Time (UTC) | Action | Actor | Result |
|---|---|---|---|
| 2026-02-23 08:14Z | Jonas creates first real user in Clerk production org (DOM for P1 shop) | Jonas Harker | User created; `user.created` event fired |
| 2026-02-23 08:14Z | Webhook delivery: `POST https://athelon.app/api/webhooks/clerk` | Clerk | ✅ HTTP 200 in 0.8s; `userId` synced to Convex `users` table |
| 2026-02-23 08:15Z | Jonas verifies user record visible in Convex dashboard `users` table | Jonas Harker | ✅ CONFIRMED |

**DEP-03: PASS**

---

### 3.5 First Production Convex Query

| Time (UTC) | Action | Actor | Result |
|---|---|---|---|
| 2026-02-23 08:16Z | Jonas calls `workOrders:list` with DOM session token | Jonas Harker | ✅ Returns empty list [] in 0.6s — no error |

**DEP-04: PASS**

---

### 3.6 Post-Deploy Environment Audit

| Time (UTC) | Action | Actor | Result |
|---|---|---|---|
| 2026-02-23 08:17Z | Devraj audits Vercel environment tab against §2.2 spec | Devraj Anand | ✅ PASS — all 19 vars present; values confirmed |

**DEP-05: PASS**

**DEPLOYMENT GATE: 5/5 PASS. Production deployment confirmed clean.**

---

### 3.7 Cilla Critical Receipt Set — Production Validation

Cilla Oduya joins at 08:20Z. Runs critical receipt set against `https://athelon.app` production environment with provisioned P1 shop test accounts.

| Time (UTC) | Receipt | Test Description | Result | Notes |
|---|---|---|---|---|
| 2026-02-23 08:22Z | POST-01 / RA-22 | Offline sign-off: queue offline, reconnect, verify exactly-once sync in production Convex | ✅ PASS | Idempotency key honored; duplicate blocked |
| 2026-02-23 08:28Z | POST-02 / RA-23 | Offline sign-off with deliberately expired auth TTL (5min+1s); attempt sync — must reject | ✅ PASS | Expired token rejected; new auth required |
| 2026-02-23 08:35Z | POST-03 / TC-G-05 | RTS initiation with disqualified IA — qualification check runs first; auth NOT consumed | ✅ PASS | `signatureAuthEvents` status remains `pending`; ordering preserved in production |
| 2026-02-23 08:42Z | POST-04 / TC-H-07 | Inject rule eval error into pre-close; verify BLOCKING verdict returned; no close path | ✅ PASS | `RULE_EVAL_ERROR` => BLOCKING; close button disabled |
| 2026-02-23 08:49Z | POST-05 / TC-K-03 | Customer portal: internal status NOT auto-coupled to customer status | ✅ PASS | `customerFacingStatus` independent of `internalStatus` |
| 2026-02-23 08:49Z | POST-05 / TC-K-06 | Customer portal payload: "AOG" string absent from all customer-visible fields | ✅ PASS | Payload inspection shows no AOG leakage |
| 2026-02-23 08:57Z | POST-06 / TC-L-06 | Discrepancy auth scope-change: supersede chain behaves correctly; old token invalidated | ✅ PASS | Old authorization marked `SUPERSEDED`; new chain initiated |
| 2026-02-23 09:02Z | Cilla holistic review | Cilla reviews production audit trail; no unexpected entries or auth events from test run | ✅ PASS | Test records cleanly separated from production records |

**POST-DEPLOYMENT GATE: 6/6 receipts PASS (8/8 sub-checks PASS)**

**Cilla sign-off on critical receipt set: PASSED — 2026-02-23 09:05Z**

---

## 4. Feature Flag Configuration

### 4.1 P1 Feature Flag State

The following table defines the exact feature flag and environment variable state at P1 activation. This is the authoritative configuration for Phase P1 (Day 1).

| Feature | Flag / Env Var | P1 State | Controlled By | Notes |
|---|---|---|---|---|
| Work order engine | (always on — core code) | ✅ ACTIVE | N/A | WO creation, lifecycle, task cards |
| Task card assignment + completion | (always on) | ✅ ACTIVE | N/A | All mechanic/IA workflows |
| IA re-authentication sign-off | (always on) | ✅ ACTIVE | N/A | Per-signature re-auth enforced |
| RTS sign-off (IA role) | (always on) | ✅ ACTIVE | N/A | Full re-auth + cert check |
| Audit trail | (always on) | ✅ ACTIVE | N/A | All WO lifecycle events |
| AD compliance tracking | (always on) | ✅ ACTIVE | N/A | Linked to work orders |
| Parts traceability (8130-3) | (always on) | ✅ ACTIVE | N/A | Receiving, quarantine workflow |
| Multi-aircraft task board | (always on) | ✅ ACTIVE | N/A | Chloe+Finn; Dale Purcell UAT confirmed |
| Pre-close WS16-B integration (R03) | `PRECLOSE_WS16B_INTEGRATION_ENABLED` | ✅ `true` | Devraj | WS18-E closure authorized |
| LLP dashboard | (code present; P2 activation) | 🔒 INACTIVE | Devraj + Nadia | P2: after P1 stable ≥72h |
| PDF export + Form 337 | (code present; P3 activation) | 🔒 INACTIVE | Devraj | P3: after P2 stable ≥48h |
| Pre-close checklist (full) | (code present; P3 activation) | 🔒 INACTIVE | Devraj | P3: after P2 stable ≥48h |
| RSM ack workflow + DOM bypass | (code present; P4 activation) | 🔒 INACTIVE | Jonas + Rachel Kwon | P4: after P3 stable ≥48h + DOM policy adoption |
| Qual alerts (production) | (code present; P4 activation) | 🔒 INACTIVE | Jonas | P4: same gate as RSM |
| Expired-cal override (test equip) | `PRECLOSE_WS16F_EXPIREDCAL_ENABLED` | 🔒 `false` | Devraj + Marcus | P5 only; requires staging re-verification |
| Discrepancy email dispatch | `DISC_AUTH_EMAIL_DISPATCH_ENABLED` | 🔒 `false` | Devraj + Marcus | P5 only; requires staging re-verification |
| Customer portal (full surface) | (code present; P5 activation) | 🔒 INACTIVE | Devraj | P5 gate |
| Offline mode | (code present; P6 activation) | 🔒 INACTIVE | Tanya Birch + Jonas | P6: after device matrix validation |

---

### 4.2 P1-Specific Feature Scope (First Shop)

The P1 shop receives the base deployment feature set. This is the complete aviation-grade maintenance record system without the phased additions. Specifically:

**Active in P1 for [SHOP-P1]:**
- Full work order lifecycle (DRAFT → OPEN → IN_PROGRESS → RTS_SIGNED → CLOSED)
- Task card materialization, assignment, per-mechanic sign-off with IA re-auth
- RTS sign-off: IA role, mandatory full re-authentication, cert validation
- All work order audit trail entries (who signed, when, with what auth, what cert number)
- AD compliance tracking (airworthiness directive linking to work orders)
- Parts traceability: 8130-3 cert linking, receiving workflow, quarantine handling
- Multi-aircraft task board (all aircraft for the shop visible to authorized users)
- Pre-close checklist: R01–R09 including R03 (IA cert currency — per WS18-E)
- Phone authorization path for verbal customer authorization (COORDINATOR role; mandatory structured path per DISC-AUTH-LIABILITY-MEMO-V1)

**Not yet active for P1 shop (will activate in P2–P6):**
- LLP component life tracking (P2)
- PDF export and Form 337 UI (P3)
- RSM acknowledgment workflow (P4; requires DOM policy adoption first)
- Expired-cal override path (P5; requires Devraj staging re-verification)
- Customer-facing discrepancy auth email/portal (P5)
- Offline mode (P6; requires device matrix validation)

---

### 4.3 Controlled Rollout Plan for P2–P6

Per WS18-G §2 rollout plan. Each phase requires explicit activation by the named owner:

| Phase | Activation Trigger | Owner | Kill Switch |
|---|---|---|---|
| P2 | P1 stable ≥72h (no rollback triggers; no Sev-1 events) | Devraj + Nadia | Disable LLP feature flags in Vercel; no data loss |
| P3 | P2 stable ≥48h | Devraj | Disable PDF/pre-close flags; prior PDFs remain valid |
| P4 | P3 stable ≥48h + DOM formally adopts RSM-RETENTION-POLICY-V1 | Jonas + Rachel Kwon | Disable RSM workflow flag; RSM reads remain; ack new prompts gated |
| P5 | P4 stable ≥72h + Devraj completes staging re-verification (WS18-G §2 P5) | Devraj + Marcus | Set both memo-gated flags `false`; pending auth requests suspended |
| P6 | P5 stable + Tanya completes device matrix validation (all 4 device profiles) | Tanya Birch + Jonas | Disable offline mode flag; all pending IDB queues drained |

---

### 4.4 Kill Switches

Each kill switch is an environment variable change in Vercel — takes effect on next Vercel deployment (< 2 minutes). No code deployment required.

| Kill Switch Target | Env Var Change | Time-to-Effect | Data Impact |
|---|---|---|---|
| Expired-cal override path | `PRECLOSE_WS16F_EXPIREDCAL_ENABLED=false` | < 2 min | In-flight cal override requests suspended; no data deleted |
| Customer email dispatch | `DISC_AUTH_EMAIL_DISPATCH_ENABLED=false` | < 2 min | No new emails sent; existing auth tokens remain valid (read-only) |
| Offline mode | Disable offline flag via Vercel | < 2 min | IDB queued mutations remain; will sync on re-enable or explicit drain |
| Full rollback (all phases) | Revert to prior Vercel deployment SHA | < 3 min | See §6 rollback procedure |

---

## 5. Post-Deployment Monitoring Setup

### 5.1 Convex Dashboard Checks (Immediate Post-Deploy — First 4 Hours)

Devraj Anand on watch. Jonas Harker on call.

| Check | Target | Threshold | Frequency (first 4h) | Tool |
|---|---|---|---|---|
| Mutation error rate | < 0.5% errors / 5-min window | Alert at 1%; page at 2% | Every 5 min | Convex dashboard → Functions → Error rate |
| Query p99 latency | < 500ms | Alert at 750ms; page at 1200ms | Every 5 min | Convex dashboard → Functions → Latency |
| Mutation p99 latency | < 800ms | Alert at 1200ms; page at 2000ms | Every 5 min | Convex dashboard → Functions → Latency |
| Webhook delivery failures | 0 | Alert on any failure | On event | Clerk dashboard → Webhooks → Delivery log |
| Vercel edge error rate | < 0.1% 5xx / 5-min window | Alert at 0.5%; page at 1% | Every 5 min | Vercel Analytics → Functions |
| Cron execution health | Both crons executing on schedule | Alert if cron misses > 1 cycle | Every cycle | Convex dashboard → Crons |

---

### 5.2 Sentry Error Monitoring Configuration

**Project:** `athelon-production`  
**Error rate targets:**

| Severity | Threshold | Response |
|---|---|---|
| Sev-1 (production outage / fail-open) | Any single event matching rollback trigger criteria | Immediate page to Jonas + Devraj via PagerDuty; rollback evaluation within 15 min |
| Sev-2 (elevated error rate) | > 2% error rate sustained > 10 min | Page to on-call; investigate; rollback decision within 30 min |
| Sev-3 (degraded performance) | p99 latency > 1.5× threshold for > 15 min | Notify Jonas + Devraj; no page; resolve within 2h |
| Sev-4 (informational) | Individual user-facing errors | Logged; reviewed in next business day standup |

**Critical alerts (Sev-1 auto-triggers — always page):**
- Any log entry matching `FAIL_OPEN` sentinel string
- Any error from `enforceAuthorizationGate` mutation (auth gate failure is always Sev-1)
- Any `RULE_EVAL_ERROR` that does NOT produce a BLOCKING verdict (pre-close should fail closed; if it doesn't, Sev-1)
- Any `AOG` string appearing in a response to a `customerFacing*` query
- Any `signatureAuthEvents` record written with `consumed: true` before qualification check result is present

**PagerDuty routing:**
- Sev-1: Immediate — Jonas Harker (primary), Devraj Anand (secondary), Nadia Solis (escalation at T+15min if unacknowledged)
- Sev-2: 5-minute delay — on-call rotation (Jonas / Devraj alternating weekly)

---

### 5.3 Latency Targets

| Operation | p50 target | p99 target | Hard limit (alert) |
|---|---|---|---|
| `workOrders:list` query | 120ms | 400ms | 750ms |
| `taskCards:getByWorkOrder` query | 80ms | 350ms | 600ms |
| `signTaskCard` mutation (incl. re-auth verify) | 300ms | 800ms | 1500ms |
| `initiateRTSSignOff` mutation | 400ms | 1000ms | 2000ms |
| `runPreCloseChecklist` action | 500ms | 1200ms | 2500ms |
| `preCloseChecklistResults:get` query | 100ms | 400ms | 750ms |
| Customer portal token lookup | 150ms | 500ms | 900ms |

---

### 5.4 Post-P1 72-Hour Watch (Per WS17-N §4 Requirement)

For the first 72 hours post-P1 activation, Devraj monitors the following daily:

1. **Auth failures:** Count of `signatureAuthEvents` with `status: "rejected"` or `status: "expired"` — normal churn expected; escalate if > 5% of total auth events
2. **Pre-close gate denials:** Count of BLOCKING verdicts from `runPreCloseChecklist` — review each one; confirm all are expected (rule correctly fired) vs. unexpected (potential rule regression)
3. **Fail-open indicators:** Zero tolerance — any event from the Sentry Sev-1 sentinel list triggers immediate rollback evaluation
4. **WO completion rate:** Confirm at least one WO proceeds through full lifecycle (DRAFT → CLOSED) within the first 72 hours without rollback trigger
5. **Audit trail completeness:** Spot-check 3 random completed task cards daily; verify `signatureAuthEvents` and `maintenanceRecords` both have entries matching the sign-off

**72h watch period ends:** 2026-02-26 09:05Z (72h after Cilla's P1 completion sign-off at 09:05Z)  
**P2 earliest activation:** 2026-02-26 09:05Z (P1 stable ≥72h gate)

---

### 5.5 Alerting Configuration Summary

| Alert | Channel | Recipients | Condition |
|---|---|---|---|
| Sev-1: Fail-open / auth violation | PagerDuty → SMS + call | Jonas, Devraj, Nadia (escalation) | Any Sev-1 sentinel event |
| Sev-2: Error rate elevated | PagerDuty → SMS | On-call rotation | > 2% error rate > 10 min |
| Sev-3: Latency degraded | Slack #athelon-ops | Jonas, Devraj | p99 > 1.5× target > 15 min |
| Sev-4: User error | Sentry → Slack #athelon-errors | Devraj | Any unhandled user-facing error |
| Cron miss | Convex alert → Slack #athelon-ops | Devraj | Either cron misses scheduled execution |
| Webhook delivery failure | Clerk → Slack #athelon-ops | Jonas | Any Clerk webhook delivery non-200 |

---

## 6. Rollback Procedure

### 6.1 Rollback Trigger Conditions

**Mandatory immediate rollback (no debate):**

| Trigger ID | Condition | Evidence |
|---|---|---|
| RB-01 | Any fail-open behavior detected on auth/discrepancy/pre-close gates | Sentry alert or manual observation of a gate that did not block when it should |
| RB-02 | Qualification check executed AFTER auth token consumed (TC-G-05 ordering violation) | `signatureAuthEvents` shows `consumed: true` before qualification result field populated |
| RB-03 | "AOG" string present in customer portal payload | TC-K-06 violation detected in production |
| RB-04 | Audit trail write failure on any release-critical mutation (`signTaskCard`, `initiateRTSSignOff`, `runPreCloseChecklist`) | Convex mutation completes but no corresponding `maintenanceRecords` or `signatureAuthEvents` entry |
| RB-05 | Deterministic re-export hash mismatch (PDF export only — applies from P3 onward) | SHA-256 of re-exported record ≠ original export hash |
| RB-06 | Client-side auth token visible in any server response | Sentry report or manual discovery |

**Conditional rollback (Jonas + Devraj judgment call):**

| Trigger ID | Condition | Judgment Criteria |
|---|---|---|
| RB-07 | Error rate sustained above Sev-2 threshold for > 30 min without root cause identified | If root cause not identified and error rate not declining, rollback |
| RB-08 | p99 mutation latency > 2× target for > 30 min (user-impacting) | If shop reports inability to complete sign-offs, rollback |
| RB-09 | Clerk webhook delivery failures causing user sync lag > 15 min | If new staff cannot authenticate and the shop is blocked, rollback |

---

### 6.2 Rollback Execution — Step-by-Step

**Decision authority:** Jonas Harker (deployment lead). If Jonas is unreachable, Devraj Anand has full rollback authority.

**Target rollback state:** Prior Vercel deployment (v1.0 baseline or the last known-good production deployment). Convex schema rollback is handled separately if data state is affected.

#### Step 1: Immediate Containment (< 5 minutes from rollback decision)

```bash
# 1a. Disable newly activated feature flags (fast containment — no deployment required)
# In Vercel dashboard → Environment Variables:
#   PRECLOSE_WS16B_INTEGRATION_ENABLED = false
# Trigger: redeploy (or set immediately via Vercel env override)
# Effect: R03 pre-close rule deactivated without code rollback

# 1b. If customer portal or discrepancy auth is involved (not active in P1 — included for completeness):
# Revoke all active customer auth tokens via Convex admin mutation:
$ npx convex run internal:admin:revokeAllCustomerAuthTokens --prod
# Disables all /auth/[token] URLs immediately
```

#### Step 2: Vercel Deployment Rollback (< 3 minutes after Step 1)

```bash
# Via Vercel dashboard → Deployments → select prior known-good build → Promote to Production
# OR via CLI:
$ vercel rollback --prod
# Vercel will prompt for the deployment SHA to roll back to:
# Select: last known-good production SHA (tracked in this document as pre-deploy baseline)
```

**Pre-P1 baseline SHA:** `[BASELINE_SHA]` — this is the SHA of the last production build before this deployment, captured by Devraj at step PRE-01 execution.

**NOTE for this P1 deployment:** Since this is the first production deployment (no prior production code exists), a rollback means reverting to a maintenance page or taking the site offline. Jonas and Devraj have agreed on a maintenance page artifact as the pre-P1 production baseline.

#### Step 3: Convex State Assessment (concurrent with Step 2)

```bash
# Assess whether any data state needs correction.
# For P1 rollback, assess:
# - Were any maintenanceRecords written during the failed deployment?
# - Were any signatureAuthEvents written during the failed deployment?
# - Were any workOrders transitioned during the failed deployment?

# If yes: Do NOT delete records. Flag them as suspect and notify Marcus Webb.
# Convex records are append-only; data is preserved for audit even on rollback.

$ npx convex run internal:admin:flagSuspectRecordsPostRollback \
  --prod \
  --since "2026-02-23T07:30:00Z"
# This marks all WO-related records written during the deployment window with
# suspect: true for human review. Does not delete.
```

#### Step 4: Incident Record (within 30 minutes of rollback completion)

- File incident record in Athelon incident tracker with:
  - Rollback trigger ID (from §6.1)
  - Exact time of trigger detection
  - Time of rollback decision
  - Time of rollback completion
  - Affected work orders (if any)
  - `maintenanceRecords` and `signatureAuthEvents` that were created during the failed deployment window (list by `_id`)
  - Root cause hypothesis
- Notify Nadia Solis, Marcus Webb, and Rosa Eaton within 30 minutes of rollback

#### Step 5: Focused Re-Verification Before Re-Deployment Attempt

Before any re-deployment attempt:

1. Root cause must be identified and documented
2. Fix must be code-reviewed by Jonas and Devraj
3. Fix must be validated in staging environment
4. Cilla must re-run the affected receipt from the POST-01..06 set
5. Jonas must issue a new deployment authorization record referencing this incident

---

### 6.3 Post-Rollback Validation

After rollback completes:

| Check | Pass Condition |
|---|---|
| Production URL responds | `https://athelon.app` returns expected state (maintenance page or prior version) |
| No new auth events being written | Convex `signatureAuthEvents` count is not increasing |
| Sentry error rate at baseline | Error rate drops to < 0.1% within 5 minutes of rollback |
| Affected records flagged | All records written during failed deployment are flagged `suspect: true` |
| Marcus notified | Marcus Webb notified if any `maintenanceRecords` were written during failed deployment (§43.9 record integrity concern) |

---

## 7. Deployment Receipt

### 7.1 Jonas Harker — Deployment Lead Sign-Off

**Role:** Deployment Lead, Athelon v1.1 P1  
**Sign-off scope:** Complete P1 deployment execution from pre-deployment checklist through post-deployment gate.

**Statement:**

I confirm that:

1. The pre-deployment checklist (PRE-01 through PRE-12) was completed in full on 2026-02-23. All 12 items PASS.
2. The production environment variables match the P1 specification in §2.2. Both memo-gated flags are confirmed `false`. `PRECLOSE_WS16B_INTEGRATION_ENABLED` is confirmed `true` per WS18-E authorization.
3. The Convex production deployment completed with 47 functions, 2 crons, 31 tables, and 89 indexes — matching the staging deployment. Zero schema inconsistencies.
4. The Vercel production build completed successfully. The production URL resolved with HTTP 200 within 60 seconds of promotion.
5. Clerk production organization configuration is correct: 5 roles, MFA enforcement on IA/DOM, biometric-only single-factor correctly rejected, webhook delivering to production endpoint.
6. The rollback procedure in §6 was reviewed and confirmed executable before deployment was authorized.
7. Marcus Webb confirmed memo constant values match signed document IDs at 07:00Z on 2026-02-23.
8. Cilla Oduya's critical receipt set (POST-01 through POST-06) passed in the production environment at 09:05Z on 2026-02-23. I witnessed the completion.

P1 production deployment for Athelon v1.1 is complete and operational.

```
Jonas Harker — Deployment Lead, Athelon
P1 Deployment: CONFIRMED COMPLETE
Timestamp: 2026-02-23T09:10Z
```

---

### 7.2 Cilla Oduya — Smoke Test Results and QA Sign-Off

**Role:** QA Lead, Athelon  
**Sign-off scope:** Critical receipt set execution in production environment; post-deploy gate assessment.

**Smoke test summary:**

I ran the six critical receipts (RA-22, RA-23, TC-G-05, TC-H-07, TC-K-03/06, TC-L-06) in the production environment starting at 08:20Z on 2026-02-23. Eight sub-checks total.

**Results: 8/8 PASS.**

No deviations from staging behavior. The fail-closed controls that matter most — TC-H-07 (pre-close BLOCKING on rule eval error), TC-G-05 (qualification before auth consumption), TC-K-06 (no AOG leakage) — all pass in production identically to their staging behavior.

One observation: the production Convex deployment is fractionally faster than staging on `runPreCloseChecklist` (p50: 420ms production vs. 470ms staging). This is within normal variance for Convex edge deployment and is a positive result.

No production records were left in an inconsistent state after testing. The test work order and task card created during validation were cleanly closed and are distinguishable from real customer records.

P1 production deployment QA gate: **PASS.**

```
Cilla Oduya — QA Lead, Athelon
Critical Receipt Set: 8/8 PASS
Production QA Gate: PASS
Timestamp: 2026-02-23T09:05Z
```

---

### 7.3 Devraj Anand — Infrastructure Confirmation

**Role:** Infrastructure / Convex Owner, Athelon  
**Sign-off scope:** Convex deployment, schema verification, environment configuration, secrets management, monitoring setup.

**Statement:**

I confirm:

1. **Convex production deployment:** `dep_prod_9a1e4f7c` deployed on 2026-02-23 at 08:01Z. 47 functions, 2 crons, 31 tables, 89 indexes. Schema verification: 0 inconsistencies.
2. **Cron jobs:** `flagExpiredEquipment` (daily 02:00 UTC) and `checkAuthorizationTimeouts` (hourly :15) confirmed active in Convex dashboard.
3. **Environment variables:** All 19 production variables set per §2.2. Both memo-gated flags confirmed `false`. No secret stored as plaintext.
4. **Sentry integration:** Production DSN active; source maps uploaded (47 maps). Sev-1 sentinel alerts configured per §5.2.
5. **PagerDuty:** Routing configured for Sev-1 and Sev-2 escalation per §5.5. Jonas Harker as primary, Devraj Anand as secondary.
6. **Pre-P1 baseline:** Prior production SHA documented for rollback reference (maintenance page state). Rollback procedure confirmed executable per §6.
7. **Post-deploy schema:** Zero orphaned documents, zero index mismatches. All new tables start empty (correct for new customer, no legacy data).

Production infrastructure for Athelon v1.1 P1: **CONFIRMED OPERATIONAL.**

```
Devraj Anand — Infrastructure Lead, Athelon
Infrastructure Confirmation: OPERATIONAL
Timestamp: 2026-02-23T09:08Z
```

---

## 8. Final Status Block

### 8.1 PASS/FAIL Judgment

| Gate | Result | Evidence |
|---|---|---|
| Pre-deployment gate (PRE-01..12) | ✅ **PASS** | §3.1 execution log — 12/12 PASS |
| Deployment gate (DEP-01..05) | ✅ **PASS** | §3.2–3.6 execution log — 5/5 PASS |
| Post-deployment gate (POST-01..06) | ✅ **PASS** | §3.7 Cilla receipt set — 8/8 sub-checks PASS |
| Feature flag configuration | ✅ **PASS** | §4.1 — P1 spec applied; memo-gated flags confirmed `false` |
| Monitoring setup | ✅ **PASS** | §5 — Sentry, PagerDuty, Convex dashboard, 72h watch configured |
| Rollback procedure ready | ✅ **PASS** | §6 — reviewed by Jonas; rollback executable in < 5 min |
| Deployment receipt | ✅ **PASS** | §7 — Jonas, Cilla, Devraj all signed |

**Overall P1 Deployment Status: ✅ PASS — PRODUCTION OPERATIONAL**

---

### 8.2 Open Items

The following items are not blockers for P1 but are tracked for resolution in subsequent phases:

| ID | Item | Owner | Target Phase | Notes |
|---|---|---|---|---|
| OI-01 | 4-hour pre-close snapshot window — watch item (Rosa WS18-B) | Jonas + P1 shop DOM | P3 activation | If shop finds window too tight for complex WOs, `PRECLOSE_SNAPSHOT_WINDOW_MINUTES` is tunable via Vercel env |
| OI-02 | DOM must formally adopt RSM-RETENTION-POLICY-V1 before P4 activation | P1 shop DOM | P4 gate | Rachel Kwon will coordinate; no action required from Athelon until DOM signals readiness |
| OI-03 | Devraj staging re-verification for both memo-gated features (WS18-G §2 P5 prerequisite) | Devraj Anand | P5 gate | Not urgent; must be completed before P5 activation attempt |
| OI-04 | Device matrix validation for offline mode (4 device profiles — iPad Pro M2, iPad 10th gen, Windows/Chrome 120, iPhone 14/Safari) | Tanya Birch | P6 gate | Tanya to schedule with P1 shop within 2 weeks |
| OI-05 | First RSM revision: DOM + Rachel Kwon content collaboration (post P4 activation) | Rachel Kwon + P1 shop DOM | Post-P4 | Template provided by Athelon; content is DOM's responsibility |
| OI-06 | LLP cycle data entry timing confirmation with P1 shop | Nadia Solis | P2 activation | Rosa flagged possible mismatch between system assumption and shop workflow for post-maintenance cycle entry timing |

---

### 8.3 Cited Evidence Links

| Reference | Location | Relevant Section |
|---|---|---|
| PROD-AUTH-V1.1-FULL-GO | `phase-18-closure/ws18-g-prod-authorization.md` §4 | Full GO authorization statement |
| P1 environment config | `phase-18-closure/ws18-g-prod-authorization.md` §2 (Phase P1 block) | P1 env vars spec |
| Staging deployment baseline | `phase-18-closure/ws18-a-staging-deployment.md` | Deployment procedure reference |
| Staging validation (89/89) | `phase-18-closure/ws18-b-staging-validation.md` | Cilla full test matrix |
| Pre-close seam closure (R03) | `phase-18-closure/ws18-e-preclose-seam-closure.md` | PRECLOSE_WS16B_INTEGRATION_ENABLED authorization |
| RSM hardening (HB-1..4) | `phase-18-closure/ws18-f-rsm-hardening.md` | 7-year log retention, DOM bypass |
| CAL memo closure | `phase-18-closure/ws18-c-cal-memo-closure.md` | Expired-cal gate conditions |
| DISC memo closure | `phase-18-closure/ws18-d-disc-memo-closure.md` | Phone auth path (mandatory), email dispatch gate |
| IA re-auth implementation | `phase-17-sprint/ws17-b-ia-reauth-impl.md` | OBJ-01..08, RA-22/23 |
| Qualification ordering proof | `phase-17-sprint/ws17-g-qual-alerts-impl.md` | TC-G-05 |
| Pre-close implementation | `phase-17-sprint/ws17-h-preclose-impl.md` | TC-H-07, fail-closed behavior |
| Customer portal isolation | `phase-17-sprint/ws17-k-portal-impl.md` | TC-K-03, TC-K-06 |
| Discrepancy auth implementation | `phase-17-sprint/ws17-l-disc-auth-impl.md` | TC-L-06, 9-state machine |
| Integrated seam verification | `phase-17-sprint/ws17-m-integrated.md` | S-01..S-08 seam receipts |
| Release readiness package | `phase-17-sprint/ws17-n-release.md` | Rollback triggers, 72h monitoring requirement |

---

## 9. Next Phase Triggers

**P2 gate opens:** 2026-02-26 09:05Z (72h from P1 completion)  
**P2 activation owner:** Devraj Anand + Nadia Solis  
**P2 activation prerequisite:** No rollback triggers fired; no open Sev-1 or Sev-2 incidents; Devraj confirms LLP feature set clean from Convex dashboard  

**P3 gate opens:** P2 stable ≥48h after P2 activation  
**P4 gate opens:** P3 stable ≥48h + DOM formal policy adoption documented  
**P5 gate opens:** P4 stable ≥72h + Devraj staging re-verification complete  
**P6 gate opens:** P5 stable + Tanya device matrix validation complete (est. Day 18–21 from P1)

---

*Filed: 2026-02-23 | Phase 19 — WS19-A P1 Production Deployment | Athelon v1.1*  
*Deployment Lead: Jonas Harker | Infrastructure: Devraj Anand | QA: Cilla Oduya*  
*Authorization: PROD-AUTH-V1.1-FULL-GO (WS18-G, 2026-02-22)*
