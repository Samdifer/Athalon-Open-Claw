# WS18-A — Staging Deployment Execution

**Phase:** 18  
**Workstream:** WS18-A  
**Owners:** Jonas Harker (lead) + Devraj Anand  
**Date:** 2026-02-22  
**Depends on:** Phase 17 Gate Review — GO WITH CONDITIONS (2026-02-22)  
**Status: DEPLOYED TO STAGING**

---

## 1. Pre-Deployment Checklist

### 1.1 Environment Parity Verification

| Check | Target | Result | Notes |
|---|---|---|---|
| Node.js version | v22.x | ✅ MATCH | Staging: v22.14.0 · Production target: v22.14.0 |
| Next.js version | 14.2.x | ✅ MATCH | Staging: 14.2.18 · Production target: 14.2.18 |
| Convex client SDK | ^1.14.x | ✅ MATCH | Staging: 1.14.3 · Production target: 1.14.3 |
| TypeScript target | ES2022 | ✅ MATCH | tsconfig.json aligned |
| Tailwind CSS version | 3.4.x | ✅ MATCH | Staging: 3.4.1 |
| Environment variable parity | .env.staging reviewed against .env.production.template | ✅ VERIFIED | See §1.2 |

### 1.2 Environment Variable Audit

All environment variables reviewed against production template. The following were set or verified in the staging Vercel project:

| Variable | Status | Notes |
|---|---|---|
| `CONVEX_DEPLOYMENT` | ✅ SET | Staging deployment ID from Convex dashboard |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ SET | Staging Convex HTTPS URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ SET | Clerk staging org publishable key |
| `CLERK_SECRET_KEY` | ✅ SET | Clerk staging org secret key (set as Vercel secret) |
| `CLERK_WEBHOOK_SECRET` | ✅ SET | Webhook secret for Clerk → Convex user sync |
| `CAL_POLICY_MEMO_REF` | ✅ SET | `"CAL-POLICY-MEMO-V1"` (constant — matches code) |
| `DISC_AUTH_LIABILITY_MEMO_REF` | ✅ SET | `"DISC-AUTH-LIABILITY-MEMO-V1"` (constant — matches code) |
| `PRECLOSE_WS16B_INTEGRATION_ENABLED` | ✅ SET | `"false"` — feature flag OFF for staging (intentional; this is the seam closure gate) |
| `PRECLOSE_WS16F_EXPIREDCAL_ENABLED` | ✅ SET | `"false"` — expired-cal branch gated pending CAL-POLICY-MEMO-V1 signature |
| `PORTAL_BASE_URL` | ✅ SET | `"https://athelon-staging.vercel.app"` — used in discrepancy auth email links |
| `NEXT_PUBLIC_APP_ENV` | ✅ SET | `"staging"` — drives environment-aware UI banners |
| `DISC_AUTH_EMAIL_DISPATCH_ENABLED` | ✅ SET | `"false"` — production gate; customer email dispatch disabled in staging by config |

**Note on `DISC_AUTH_EMAIL_DISPATCH_ENABLED`:** This is a staging-specific safeguard. The code's production gate (`PRODUCTION_GATE: DISC_AUTH_LIABILITY_MEMO_REQUIRED`) still exists and would block production dispatch even if this flag were true. In staging, we explicitly disable the outbound email scheduler call to avoid sending real customer emails during smoke tests. End-to-end testing of the email path uses Mailtrap.

### 1.3 Clerk Staging Organization Setup

Completed by Jonas Harker at 2026-02-22T07:14Z:

1. **Staging organization created** in Clerk dashboard: `athelon-staging` (org ID: `org_staging_8f3k2x`)
2. **Role schema verified:** MECHANIC, IA, DOM, QCM, COORDINATOR roles configured in Clerk metadata schema — matches production schema.
3. **Test users seeded:**
   - `dom-test@athelon-staging.dev` — role: DOM
   - `qcm-test@athelon-staging.dev` — role: QCM
   - `mech-test-1@athelon-staging.dev` — role: MECHANIC, A&P cert #: 3124-A
   - `mech-test-2@athelon-staging.dev` — role: MECHANIC, A&P cert #: 3125-A
   - `ia-test-1@athelon-staging.dev` — role: IA, cert #: 3126-IA
   - `coordinator-test@athelon-staging.dev` — role: COORDINATOR
4. **MFA enforcement verified:** Biometric-only single-factor authentication correctly rejected by IA re-auth gate (WS17-B) in staging Clerk tenant.
5. **Webhook endpoint registered:** `https://athelon-staging.vercel.app/api/webhooks/clerk` registered in Clerk staging dashboard with `user.created`, `user.updated`, `organization.created` event subscriptions. Verified secret matches `CLERK_WEBHOOK_SECRET`.
6. **Clerk session token retention:** Staging tenant is on Clerk Pro plan — log retention is 30 days (same as production default). **Note for WS18-F:** HB-1 resolution (7-year retention) will modify this post-memo closure; see WS18-F for the mirrored audit log solution.

### 1.4 Convex Staging Deployment Verification

Prior to running deployment commands, Jonas verified:
- Convex project `athelon-staging` exists and is linked to repo via `.env.local` on the build runner.
- Schema snapshot at HEAD matches the schema in `convex/schema.ts` — no pending migrations.
- All scheduled functions (cron jobs) are defined correctly in `convex/crons.ts`:
  - `flagExpiredEquipment` — daily at 02:00 UTC ✅
  - `checkAuthorizationTimeouts` — hourly at :15 ✅
- No orphaned indexes or deprecated tables from Phase 16 carry-forward.

---

## 2. Deployment Steps

### 2.1 Convex Staging Deployment

```bash
# From repo root, with CONVEX_DEPLOYMENT set to staging deployment ID

# Step 1: Type-check before pushing
$ npx tsc --noEmit
# Result: 0 errors, 0 warnings ✅

# Step 2: Deploy Convex functions to staging
$ npx convex deploy
# Equivalent to: npx convex deploy --url <STAGING_CONVEX_URL>
# When CONVEX_DEPLOYMENT env var is set, this targets the staging deployment.

# Output:
# ✔ Convex functions ready! (29.4s)
# Deployed: 47 functions (22 mutations, 18 queries, 7 actions, 1 scheduled batch)
# Crons: 2 active (flagExpiredEquipment @02:00 UTC, checkAuthorizationTimeouts @:15)
# Schema: 31 tables validated
# Indexes: 89 indexes active
# ✔ Staging deployment complete.
```

**Deployment timestamp:** 2026-02-22T07:42:18Z  
**Deployed by:** Jonas Harker  
**Deployment ID:** `dep_staging_fc2918a3`

### 2.2 Vercel Preview Deployment

```bash
# Push feature branch to GitHub → triggers Vercel staging preview build

$ git push origin main  
# (staging is the main branch of the staging repo; not the production repo)

# Vercel build output summary:
# Build: SUCCESS (4m 32s)
# Next.js build output:
#   Route (app)                         Size     First Load JS
#   ┌ ○ /                               3.2 kB   102 kB
#   ├ ○ /dashboard                      4.1 kB   118 kB
#   ├ ○ /dashboard/tasks                5.8 kB   127 kB
#   ├ ○ /dashboard/work-orders          6.2 kB   129 kB
#   ├ ○ /dashboard/work-orders/[id]     8.4 kB   134 kB
#   ├ ○ /dashboard/compliance/rsm       4.9 kB   122 kB
#   ├ ○ /dashboard/equipment            5.1 kB   123 kB
#   ├ ○ /dashboard/llp                  6.6 kB   131 kB
#   ├ ○ /auth/[token]                   3.8 kB   108 kB
#   └ ○ /rsm/pending                    3.2 kB   104 kB
# First Load JS shared by all: 96 kB
# ✓ Build succeeded
```

**Vercel preview URL:** `https://athelon-staging-fc2918.vercel.app`  
**Alias:** `https://athelon-staging.vercel.app` (assigned to this build)  
**Build timestamp:** 2026-02-22T07:51:04Z

### 2.3 Post-Deployment Schema Verification

```bash
# Verify staging Convex schema is consistent with deployed code

$ npx convex run internal:schema:verify --deployment staging
# Output:
# ✔ Schema valid. 31 tables, 89 indexes. No inconsistencies.
# ✔ All cron functions registered.
# ✔ No orphaned documents or index mismatches.
```

### 2.4 Staging Seed Data Load

```bash
# Load test fixtures for smoke test suite

$ npx convex run internal:seed:stagingFixtures --deployment staging
# Output:
# ✔ Seeded: 3 organizations (athelon-demo-mro, athelon-demo-avionics, athelon-demo-general)
# ✔ Seeded: 6 test users (dom, qcm, mech×2, ia, coordinator)
# ✔ Seeded: 4 aircraft records (N12345, N67890, N11122, N44556)
# ✔ Seeded: 8 work orders (5 active, 2 closed, 1 draft)
# ✔ Seeded: 12 test equipment records (4 current, 2 expiring-soon, 3 expired, 1 quarantined, 2 pending-cal)
# ✔ Seeded: 2 LLP component records with cycle accumulation history
# ✔ Seeded: 0 RSM revisions (start clean — smoke test will publish one)
```

---

## 3. Smoke Test Suite — 10 Critical Path Checks

**Run by:** Jonas Harker (observation) + Devraj Anand (technical execution)  
**Environment:** `https://athelon-staging.vercel.app`  
**Clerk tenant:** `athelon-staging`  
**Date:** 2026-02-22  

---

### ST-01 — WO Creation → Task Card Materialization

**Actor:** COORDINATOR test account  
**Steps:**  
1. Log in as coordinator. Navigate to Work Orders → Create New.  
2. Fill: Aircraft N12345, WO type "Scheduled Maintenance", Description "Annual inspection — Lycoming IO-360", Work Order #: WO-SMOKE-001.  
3. Add 3 task cards: "Engine inspection", "Altimeter check", "Compression test".  
4. Submit WO.  
**Expected:** WO created with status `OPEN`. 3 task cards materialized in the task board. Each task card is independently assignable.  
**Result:** ✅ PASS — WO-SMOKE-001 created at 08:14:22Z. All 3 task cards visible in task board for MECHANIC accounts.  
**Notes:** Task card assignment UI rendered correctly. WO public ID format (`WO-2026-SMK-001`) correct.

---

### ST-02 — Task Card Sign-Off Flow

**Actor:** MECHANIC test user 1  
**Steps:**  
1. Log in as mech-test-1. Navigate to Task Queue → WO-SMOKE-001 → "Engine inspection".  
2. Complete task steps. Click "Sign Off on Task Card".  
3. IA Re-Auth modal appears: prompted for PIN + second factor (not biometric-only).  
4. Complete re-auth. Review confirmation modal with sign-off details. Confirm.  
**Expected:** Task card status → SIGNED. `signatureAuthEvents` record created. `maintenanceRecords` entry written with signing mechanic's cert info.  
**Result:** ✅ PASS — IA re-auth challenged and completed in 34 seconds. Signature event recorded with session token. Biometric-only route correctly challenged (test: attempted to use biometric-only test auth → rejected with "Biometric single-factor insufficient for IA sign-off" error).  
**Notes:** AC 120-78B hard blockers all passing (OBJ-02, OBJ-05, OBJ-06, OBJ-08 verified by observation).

---

### ST-03 — Return-to-Service (RTS) Sign-Off

**Actor:** IA test user 1  
**Steps:**  
1. Log in as ia-test-1. Navigate to WO-SMOKE-001.  
2. Verify all task cards signed. Navigate to RTS sign-off.  
3. Complete IA re-auth (second factor required — more stringent than mechanic sign-off).  
4. Confirm "I certify this aircraft is airworthy and ready for return to service."  
**Expected:** WO status → `RTS_SIGNED`. `maintenanceRecords` RTS entry created. Pre-close checklist becomes runnable.  
**Result:** ✅ PASS — RTS signed at 08:31:04Z. IA cert validation against qualification-precheck rules passed. `signatureAuthEvents` record correctly shows `role: "IA"`, `authLevel: "full_reeauth"`.

---

### ST-04 — PDF Export

**Actor:** COORDINATOR or DOM  
**Steps:**  
1. Log in as coordinator-test. Navigate to WO-SMOKE-001 → Actions → Export PDF.  
2. Select: include task cards, maintenance records, test equipment section, LLP entries (N/A for this WO), parts list.  
3. Generate PDF.  
**Expected:** PDF generated with §43.9-compliant structure. Each signed record shows: aircraft N-number, date, work performed, certifying person, certificate number. Test equipment section shows calibration data for linked equipment. SHA-256 hash computed and stored.  
**Result:** ✅ PASS — PDF generated in 3.2 seconds. Verified structure: registration block, maintenance narrative, sign-off block with mechanic cert number, RTS block with IA cert number. No truncation on long descriptions. SHA-256 hash stored in `maintenanceRecords.pdfHash`. PDF deterministically reproducible (same hash on re-export of same record state).  
**Notes:** Carla Ostrowski cold-test assertions (47/47) were validated during Phase 17 WS17-C; this smoke test confirms the regression suite still passes in staging environment.

---

### ST-05 — Audit Trail Completeness

**Actor:** DOM or QCM  
**Steps:**  
1. Log in as dom-test. Navigate to WO-SMOKE-001 → Audit Log.  
2. View full audit event chain.  
**Expected:** Audit trail shows all events in chronological order: WO_CREATED, TASK_CARD_CREATED (×3), TASK_SIGNED (×3), MAINTENANCE_RECORD_WRITTEN, RTS_SIGNED, PDF_EXPORTED. Each event shows actor, timestamp, entity ID.  
**Result:** ✅ PASS — 9 audit events present. All actors correctly attributed. Timestamps monotonically increasing. Event IDs stable across page refreshes (Convex subscription not causing duplicate events).

---

### ST-06 — LLP Life Accumulation Entry

**Actor:** MECHANIC or IA  
**Steps:**  
1. Navigate to Work Order for N44556 (a turbine aircraft with LLP tracking).  
2. Open LLP Dashboard → "Log Cycle Data".  
3. Record engine cycles: Flight cycles = 12, Engine cycles = 12, Starts = 12.  
4. Save entry.  
**Expected:** Cycle accumulation written to LLP component records. Life used % recomputed. Components approaching life limit shown with amber/red indicators.  
**Result:** ✅ PASS — Cycle data logged. LLP dashboard recomputed: primary turbine disk at 89.3% life used (amber). Cycle history append-only, no modification of prior entries.

---

### ST-07 — RSM Acknowledgment Gate

**Actor:** MECHANIC test user 2 (unacknowledged)  
**Steps:**  
1. Log in as dom-test. Publish test RSM revision "RSM-2026-STAGE-01".  
2. Log out. Log in as mech-test-2.  
3. Navigate to Task Queue.  
**Expected:** Full-screen blocking RSM acknowledgment modal. Task queue not visible. Escape key does not dismiss. Scroll-to-bottom gate activates acknowledge button.  
**Result:** ✅ PASS — Modal appeared immediately on task queue navigation. Escape key: no effect. Backdrop click: no effect. After scrolling to bottom of summary: acknowledge button activated (class changed from `btn-disabled` to `btn-primary`). After clicking: task queue rendered. Acknowledgment recorded in Convex with session token.

---

### ST-08 — Customer Portal Token + Authorization Flow

**Actor:** COORDINATOR (request side) + simulated customer (approval side)  
**Steps:**  
1. Log in as coordinator-test. Open WO-SMOKE-002 which has a documented discrepancy ("Corrosion on leading edge skin rib, Class 2, treatment required").  
2. Navigate to Discrepancy → Review & Authorize.  
3. Fill coordinator form: customer description, cost range $380–$510, customer email → Mailtrap test inbox.  
4. Send authorization request.  
5. Retrieve authorization link from Mailtrap. Open link in incognito window.  
6. Customer portal loads: discrepancy description, cost range, Approve/Decline buttons.  
7. Customer declares name "Robert Huang", relationship "owner", clicks Approve.  
**Expected:** Consent record written with IP, timestamp, declared name, relationship, consent text hash. WO gate recomputes. Coordinator receives notification.  
**Result:** ✅ PASS (with one adjustment — see Jonas deployment log §4). Email delivered to Mailtrap in ~41 seconds. Portal page loaded correctly from token. Customer approval recorded at 09:02:14Z. Consent text hash verified against template version. WO internal status recomputed to `WO_AUTH_CLEAR` within 15 seconds.  
**Note:** `DISC_AUTH_EMAIL_DISPATCH_ENABLED = "false"` in staging env means the Convex scheduler is bypassed — the email was dispatched via a manual staging test action that calls the internal function directly with the Mailtrap SMTP. This is expected staging behavior and does not affect the consent record capture logic.

---

### ST-09 — Pre-Close Checklist

**Actor:** COORDINATOR or DOM  
**Steps:**  
1. Navigate to WO-SMOKE-001 (all tasks signed, RTS complete). Run Pre-Close Checklist.  
2. Review results.  
**Expected:** Checklist runs. Findings displayed. BLOCKING findings prevent close; ADVISORY findings shown for awareness. Feature flag `PRECLOSE_WS16B_INTEGRATION_ENABLED = false` means R03 (IA cert check) fires as ADVISORY not BLOCKING.  
**Result:** ✅ PASS — Checklist ran in 1.1 seconds. Result: CONDITIONAL (0 BLOCKING, 2 ADVISORY). Advisory findings: (1) R03: IA certification currency check is advisory mode (feature flag off — expected); (2) R09: Task card WO-SMOKE-001-C has no test equipment linked (advisory for non-avionics work — correct). Close allowed on CONDITIONAL verdict (strictMode = false).  
**Notes:** Fail-closed behavior verified: induced a rule evaluation error by injecting a malformed WO ID via test harness — checklist returned FAIL verdict with `RULE_EVAL_ERROR` finding and blocked close. TC-H-07 behavior confirmed in staging.

---

### ST-10 — Pre-Close → WO Close Execution

**Actor:** DOM or QCM  
**Steps:**  
1. With CONDITIONAL pre-close verdict, proceed to close WO-SMOKE-001.  
2. Run `submitCloseWithPreCloseToken` with the snapshot token from ST-09.  
3. WO closes.  
**Expected:** WO status → `CLOSED`. Pre-close audit event written. Snapshot token consumed (cannot reuse). Closed WO transitions to read-only state.  
**Result:** ✅ PASS — WO-SMOKE-001 closed at 09:18:47Z. Audit event `WO_CLOSED_WITH_PRECLOSE_TOKEN` written with run ID and snapshot token reference. Attempt to close a second time (with same token) correctly rejected: `PRECLOSE_SNAPSHOT_STALE` error — snapshot token was issued > 0 seconds ago but the WO is now closed, so the stale-token check fires. Closed WO is read-only in the UI.

---

## 4. Jonas Harker — Deployment Log

**Date:** 2026-02-22  
**Jonas Harker, Lead Engineer, Athelon**

---

### 07:00 — Start of deployment window

Team synced at 07:00. Devraj was already in the Convex dashboard doing pre-flight checks. I reviewed the production deployment checklist I drafted for Cilla — it's a 47-item rubric, and I wanted to do a subset against staging before we declared it clean. My focus for the day was: confirm nothing broke in the build pipeline, confirm all ten smoke tests pass, flag any issues for the conditional closure sprint.

### 07:14 — Clerk staging org setup complete

Clerk was clean. The webhook registration took longer than expected — the webhook endpoint wasn't returning 200 on the initial ping because the staging Vercel function cold-start was timing out. Switched to Vercel's streaming response handling for the webhook route and it immediately resolved. Logged as a warm-up issue specific to staging cold starts; production uses warm instances. Not a blocker.

### 07:42 — Convex deploy successful

`npx convex deploy` completed in 29.4 seconds. 47 functions deployed, schema validated, indexes consistent. No failures. The one thing I watched for: the `flagExpiredEquipment` cron — we had a false-positive during development where it marked cal-current equipment as expired because of a timezone offset bug. That was fixed in WS16-F and I confirmed the cron result in staging test: only equipment with actual past-due `calibrationExpiry` was flagged. The 3 expired test fixtures all transitioned correctly.

### 07:51 — Vercel build complete

Build was clean. The one thing that stood out: the `/auth/[token]` route is included in the build but the `DISC_AUTH_EMAIL_DISPATCH_ENABLED` env guard ensures the email scheduler doesn't fire in staging. I double-checked the Mailtrap integration for the manual test action — it's correct. The portal page renders and the consent capture works end-to-end. We just can't do it with real outbound email in staging, which is appropriate.

### 08:00–09:20 — Smoke tests

I ran through ST-01 through ST-10 in sequence. Devraj handled the backend verification (Convex dashboard spot-checks, mutation layer validations), and I handled the UI walkthrough and judgment calls on what "pass" looks like in the user experience.

**Things that passed cleanly and looked exactly right:**
- WO creation → task card materialization: fast, clean, exactly what I expect production to feel like
- IA re-auth in ST-02: the deliberateness of the modal is right. It doesn't feel like a checkbox. It feels like a decision. That's what we built it to feel like.
- PDF export: I opened the PDF and read it like a FAA inspector would read it. N-number, date, certified work description, certifying mechanic name and cert number, IA cert number on the RTS block. It's correct. It stands on its own.
- RSM modal in ST-07: I tried Escape. I tried clicking the backdrop. I tried navigating away via the URL bar (the middleware redirect to `/rsm/pending` fired correctly). There is genuinely no way out except to acknowledge. Rachel will be satisfied.
- Pre-close in ST-09: the CONDITIONAL verdict with 2 ADVISORY findings is exactly the right output for a clean WO where the feature flag is intentionally off.

**Things that needed adjustment:**
- **ST-08 (customer portal):** The `DISC_AUTH_EMAIL_DISPATCH_ENABLED = "false"` guard worked as designed, but the smoke test required a manual internal function call to test the email path. This is correct staging behavior, but I'm noting it because the smoke test for ST-08 is "pass with manual intervention on email dispatch" not "pass on full automated path." The automated path test requires WS18-D memo closure → flag removal → re-run in staging with real dispatch enabled.

- **ST-09 (pre-close feature flag):** The R03 advisory finding is expected. It's also important to note that it appears in the UI with the correct framing — "IA certification check advisory (feature flag: pre-close WS16-B integration pending)". That text in the UI is good: it tells any coordinator running this checklist exactly why R03 is advisory and what would make it blocking. When the flag goes true post-WS18-E closure, R03 will fire as BLOCKING and coordinators will understand why from the existing UI.

**One honest concern I'm flagging:**
The 4-hour snapshot token window for pre-close (ST-10) is right at the boundary of what's practical for a complex WO where the coordinator runs pre-close, gets called away, and comes back. I confirmed with Marcus during Phase 17 that 4 hours is appropriate. But in real-world deployment we should watch for coordinator feedback on this window and be ready to tune it. Not a blocker. Just a watch item for post-launch.

### 09:30 — Staging declared DEPLOYED

All 10 smoke tests passed. One smoke test (ST-08) passed with expected manual email dispatch workaround. Staging is clean. WS18-B (Cilla's formal validation + SME acceptance sign-off) can now run against this deployment.

**Production readiness assessment (Jonas's judgment):**  
P1 features (all Phase 17 streams excluding memo-gated branches) are ready for production deployment upon successful WS18-B validation. The two memo-gated branches (expired-cal override, customer email dispatch) require WS18-C and WS18-D closure before the flags are removed. The pre-close seam (WS18-E) requires WS16-B integration finalization before the feature flag goes true.

---

## 5. Status

**WS18-A STATUS: DEPLOYED TO STAGING**

All 10 smoke tests: ✅ PASS (ST-08: PASS with expected staging email dispatch workaround)

**Next:** WS18-B (Cilla + Rosa Eaton + Marcus formal staging validation) may now execute.

**Conditional items for post-staging-validation production gate:**
- WS18-C closure → enables `expiredCalOverride` branch + flag removal
- WS18-D closure → enables customer email dispatch + flag removal
- WS18-E closure → enables `PRECLOSE_WS16B_INTEGRATION_ENABLED = true`
- WS18-F closure → authorizes first production RSM revision publish

---

*Filed: 2026-02-22 | Phase 18 — WS18-A Staging Deployment | Athelon v1.1*  
*Deployment Owner: Jonas Harker | Technical: Devraj Anand*
