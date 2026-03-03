# Athelon Alpha Staging Go-Live Runbook
**Owners:** Jonas Harker (Platform), Cilla Oduya (QA)  
**Session:** Gary Hutchins (DOM) + Linda Paredes (QCM) alpha pilot  
**Environment:** `athelon-staging` / `https://staging.athelon.app`  
**Use this runbook in real time.**

---

## 1) Day-of Execution Sequence

## T-24h (Freeze + Infrastructure Certainty)
**Owner:** Jonas (with Cilla witness)

1. **Code/infra freeze on staging for pilot scope**
   - Freeze branch merges except pilot-critical fixes.
   - Confirm latest staging deploy SHA in GitHub Actions.
2. **Convex deploy + schema verification**
   - Confirm staging has schema v3 and Wave 2 mutations (`createMaintenanceRecord`, `getPreSignatureSummary`, `createQcmReview`, `getWorkOrderCloseReadinessV2`, `receiveTestEquipment`).
3. **Auth chain validation**
   - Clerk JWT template (`convex`) active, issuer matches staging Convex env var.
   - Clerk webhook delivering to staging Convex HTTP actions endpoint.
4. **Seed data dry-run and lock**
   - Verify all pilot users and assets exist (Gary, Linda, Troy proxy, Pat proxy, N1234A, TW-2847).
5. **Backup evidence baseline**
   - Capture screenshots/exports of baseline tables before session (workOrders, taskCards, maintenanceRecords, inspectionRecords, qcmReviews, returnToService, auditLog).

**Exit criteria (all green):** env check commands pass, seed checklist complete, blockers list at 0.

---

## T-2h (Operational Readiness)
**Owner:** Cilla lead, Jonas support

1. **Credentials and role confirmation**
   - Gary account maps to DOM org role.
   - Linda account maps to QCM org role.
   - Troy/Pat proxy credentials tested.
2. **Session flow rehearsal (10 min max)**
   - Walk through sign-in → WO list → open pilot WO path.
3. **Close-readiness dependencies check**
   - Ensure no stale open WOs on N1234A.
4. **Comms protocol setup**
   - Incident bridge channel live (#incidents or agreed bridge).
   - One scribe (Cilla) and one executor (Jonas) assigned.
5. **Evidence capture workstation ready**
   - Timestamp source synced (UTC).
   - Screen capture enabled for observer station.

**Exit criteria:** all users can sign in; pilot org clean; incident and evidence paths ready.

---

## T-30m (Pre-Flight Checks)
**Owner:** Jonas executes, Cilla signs off

1. Run **Top-10 smoke tests** (Section 4 below).
2. Verify Pre-Signature Summary renders and includes:
   - N1234A, WO number, cert number, warnings area.
3. Confirm TW-2847 calibration shows current at use in test reference path.
4. Confirm audit log write visibility for staging org.
5. Declare **Go / No-Go** in written note with UTC timestamp.

**Exit criteria:** 10/10 smokes pass; no hard blocker active.

---

## Session Start (Live Alpha)
**Facilitator:** Nadia (if present) / Jonas
**Observer:** Cilla

1. Start with Gary login and independent navigation.
2. Execute 11-step scenario in practical order:
   - 1,2,3,4a,4b,5,6,7,8,10,11,9
   - (QCM review remains post-close)
3. Cilla records timings, user friction, and all pass/fail checkpoints.
4. If any hard blocker triggers, invoke Incident Protocol immediately (Section 5).

---

## Session End (+0 to +30m)

1. **Immediate outcomes review** (Gary + Linda verbal feedback capture).
2. **Data integrity sweep**
   - Confirm WO final state, aircraft state, RTS + QCM records present.
3. **Evidence package assembly** (Section 6 checklist).
4. **Preliminary verdict**
   - Pass / Conditional Pass / Fail with exact blocker IDs.
5. **Send handoff packet** to Gary/Linda stakeholders + internal team.

---

## 2) Environment Verification Commands (with Expected Output)

Run from repo root: `/home/sam_sandifer1/.openclaw/workspace/simulation/athelon`

```bash
# 1) Validate TypeScript + schema compatibility
pnpm turbo typecheck
```
**Expected:** `Tasks: ... successful`, no TS or schema errors.

```bash
# 2) Confirm Convex deployment target is staging (manual verification path)
echo $CONVEX_DEPLOY_KEY | wc -c
```
**Expected:** non-trivial length (`>20` chars), not empty.

```bash
# 3) Deploy latest functions/schema to staging
CONVEX_DEPLOY_KEY=<staging-key> npx convex deploy --yes
```
**Expected contains:**
- `Deploying to athelon-staging`
- `Syncing schema...`
- `Deploying functions...`
- `Successfully deployed`

```bash
# 4) Confirm generated API has required namespaces
grep -E "workOrders|taskCards|returnToService|qcmReviews" convex/_generated/api.ts
```
**Expected:** lines for those namespaces exist.

```bash
# 5) Run smoke suite against staging
SMOKE_TEST_BASE_URL=https://staging.athelon.app \
SMOKE_TEST_USER_TOKEN=<token> \
SMOKE_TEST_ORG_ID=<org_id> \
pnpm run test:smoke
```
**Expected:** all smoke specs pass, exit code 0.

```bash
# 6) (Optional if script exists) seed/validate alpha data in staging
CONVEX_DEPLOY_KEY=<staging-key> npx convex run seed:alpha
```
**Expected:** success output with seeded/validated entities including users + aircraft/equipment.

```bash
# 7) Quick CI status check for last merge
# (run via gh CLI only if configured)
gh run list --limit 5
```
**Expected:** recent `deploy-staging` is `completed` + `success`.

---

## 3) Seed Data Checklist (Must Be True Before Gary Logs In)

## People / Roles
- [ ] Gary Hutchins user exists; mapped technician active.
- [ ] Gary role effectively DOM for pilot org.
- [ ] Linda Paredes user exists; mapped technician active.
- [ ] Linda is organization `qualityControlManagerId`.
- [ ] Troy proxy user exists; technician active (A&P no IA).
- [ ] Pat proxy user exists; technician active with current IA.

## Aircraft / Work Context
- [ ] Aircraft `N1234A` exists, visible to pilot org.
- [ ] Aircraft status starts `in_maintenance` pre-session.
- [ ] No conflicting open duplicate WO for N1234A before step 1.

## Test Equipment
- [ ] Test equipment serial `TW-2847` exists in `testEquipment`.
- [ ] Calibration cert fields populated.
- [ ] Calibration status `current` at session time.

## Scenario Baseline Data
- [ ] Pilot org has DOM/QCM assignments locked.
- [ ] If using pre-seeded WO: exactly one designated pilot WO and known WO number.
- [ ] No stale signed artifacts that would confuse walkthrough.

---

## 4) Top-10 Smoke Tests (Run Right Before Gary Logs In)

1. **Auth sign-in succeeds** for Gary account and lands on dashboard.
2. **Create work order** for N1234A works without validation dead-end.
3. **Open work order** accepts aircraft TT and status transitions correctly.
4. **Create task card** with 5 steps works; step 5 IA-required flag retained.
5. **Step sign-off (non-IA)** succeeds for Troy with PIN flow.
6. **IA-required step** rejects non-IA and succeeds for Pat proxy.
7. **Create maintenance record** enforces `workPerformed >= 50` and accepts structured approved data.
8. **Pre-signature summary** query renders complete data (N-number, cert, warnings, proceed gating).
9. **Close readiness v2** returns expected checks and no false negatives for green path.
10. **Authorize RTS + QCM review path** works in sequence (RTS closes WO; Linda can create QCM review).

If any fail, session is **No-Go** until triaged.

---

## 5) Incident Protocol (8 Hard Blockers)

If any blocker is hit, stop the scenario at that step.

## Hard Blockers
1. **HB-01 Signature hash placeholder/invalid pattern** appears on signed records.
2. **HB-02 IA currency invariant failure** on IA-required sign (expired/false current acceptance).
3. **HB-03 Close readiness false block** after all required workflow steps complete.
4. **HB-04 RTS succeeds but aircraft does not transition to `airworthy`.**
5. **HB-05 QCM review allowed before WO is closed** (INV-24 breach).
6. **HB-06 Session drop causes unrecoverable partial signing state** or record corruption.
7. **HB-07 Signature auth event invariant breach** (reused/expired/mismatched event accepted).
8. **HB-08 Structured approved data/control breach** (system permits free-text-only maintenance record in final close path).

## Response Steps (for any HB)
1. **Call STOP** (facilitator halts user actions).
2. **Capture evidence immediately**
   - Screenshot/UI state
   - Convex logs snippet
   - record IDs, user, UTC timestamp
3. **Classify severity**
   - Regulatory integrity, data integrity, auth integrity, or UX-only.
4. **Decide path in 5 minutes**
   - Recover in-session (safe hotfix or controlled workaround), OR
   - Abort session and reschedule.
5. **Communicate clearly to Gary/Linda**
   - One-sentence factual statement; no speculation.
6. **Open incident entry** with owner + ETA.
7. **Block go-live decision** until corrective evidence is verified.

---

## 6) Post-Session Evidence Package (FAA-Style Auditability)

Collect and store in immutable session folder:

## A. Session Metadata
- [ ] Session date/time (UTC start/end)
- [ ] Participant roster and roles
- [ ] Environment/version identifiers (commit SHA, deployment URL)

## B. Record Artifacts
- [ ] Work order record export (before/after status)
- [ ] Task card + step signature records
- [ ] Maintenance record(s) including approved data reference and signature hash
- [ ] Inspection record (if executed)
- [ ] Return-to-service record
- [ ] QCM review record

## C. Authentication & Signature Evidence
- [ ] Signature auth event IDs consumed per signed action
- [ ] Evidence of one-time consumption and timestamp alignment
- [ ] PIN/sign flow timing notes (where measured)

## D. Audit Trail Evidence
- [ ] Audit log extract scoped to pilot WO
- [ ] Presence of key events: `record_signed`, `technician_signed`, `status_changed`, `qcm_reviewed`
- [ ] Chain completeness check (no missing expected event boundaries)

## E. Compliance Assertions
- [ ] IA-required actions signed by current IA
- [ ] Aircraft time monotonic checks hold
- [ ] Close readiness criteria satisfied at close time
- [ ] No blocker unresolved at session close

## F. Human Findings
- [ ] Gary feedback (verbatim)
- [ ] Linda feedback (verbatim)
- [ ] Cilla QA findings (observed friction + defects)
- [ ] Marcus compliance notes and disposition

## G. Final Decision
- [ ] Pass / Conditional Pass / Fail
- [ ] Required fixes list with owners and due dates
- [ ] Approval signatures (Jonas, Cilla, Marcus)

---

## 7) Go/No-Go Declaration Template

```text
Alpha Session Go/No-Go — Athelon Staging
Timestamp (UTC): __________
Environment: athelon-staging / commit __________
Smoke Tests: ____ / 10 passed
Hard Blockers Active: [none] / [list IDs]
Decision: GO / NO-GO
Declared by: __________
Witness: __________
```
