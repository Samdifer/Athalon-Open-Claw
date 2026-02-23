# WS20-A — P5 Feature Activation
**Phase:** 20 — Scale  
**Status:** ACTIVE (2 of 3 features live; Customer Portal CONDITIONAL — see below)  
**Owner:** Devraj Anand (implementation) + Marcus Webb (compliance co-sign) + Cilla Oduya (smoke tests)  
**Gate:** P4 stable ≥72h — CONFIRMED 2026-02-22T23:00Z  
**Prerequisite memos:** CAL-POLICY-MEMO-V1 ✅ signed / DISC-AUTH-LIABILITY-MEMO-V1 ✅ signed

---

## Overview

Three features have been gated behind signed compliance memos since Phase 17. With both memos countersigned and P4 holding stable through 72 hours of production operation, the gate is clear. Devraj executes the PRODUCTION_GATE flag removal for each feature in sequence, re-verifies against staging, Marcus co-signs the activation record, and Cilla runs three smoke tests per feature post-flip. Order of activation: (1) Test Equipment Traceability, (2) Discrepancy Customer Authorization, (3) Customer Portal.

---

## Feature 1 — Test Equipment Traceability
**Memo gate:** CAL-POLICY-MEMO-V1  
**Signed by:** Marcus Webb (compliance lead) + Dale Purcell (avionics SME review)  
**Code:** `PRODUCTION_GATE=TEST_EQUIP_TRACEABILITY` — Convex environment flag  

### Devraj's Re-Verification Steps (Staging)
1. **Flag removal in staging config** — Devraj updates `convex/env/staging.ts`: removes `PRODUCTION_GATE` entry for `TEST_EQUIP_TRACEABILITY`. Deploys to staging with `npx convex deploy --env staging`.
2. **Calibration record write test** — Creates a test work order against N8432Q (Skyline's Cessna 182), attaches a torque wrench with cal ID `TW-004`, verifies cal expiry `2026-08-14` renders in the task-card tool list with amber warning (within 90-day advisory window). ✅
3. **Expired equipment hard-block test** — Sets cal expiry to `2026-02-01` (past) in staging data, attempts to associate tool. Confirms system rejects with: *"Tool TW-004 calibration expired 2026-02-01 — cannot attach to open task card."* ✅
4. **PDF export verification** — Generates a completed WO PDF in staging, confirms calibration section renders: tool ID, cal standard, next-due date, technician who attached tool, timestamp. ✅
5. **Audit trail query** — Runs `getCalibrationAuditTrail(workOrderId)` in staging Convex dashboard, confirms event log entries for attach/detach with user, timestamp, and tool state. ✅

**Staging re-verify verdict: PASS**

### Marcus Co-Sign
Marcus reviews Devraj's staging output. Confirms cal-policy memo provisions are all represented in the live behavior:
- No expired tool can be attached (hard block, not advisory)
- 90-day advisory window matches memo language exactly
- Audit trail immutable once WO closes (tested: edit attempt post-close returns 403)
- PDF export section matches §43.13 tool-traceability intent

**Marcus co-sign recorded:** 2026-02-23T00:05Z — *"CAL-POLICY-MEMO-V1 provisions confirmed implemented. Production flip authorized."*

### Production Activation
Devraj updates `convex/env/production.ts`: removes `TEST_EQUIP_TRACEABILITY` from the `PRODUCTION_GATE` block. Deploy command:
```
npx convex deploy --env production --message "WS20-A: Remove TEST_EQUIP_TRACEABILITY production gate — CAL-POLICY-MEMO-V1 signed"
```
Deploy timestamp: **2026-02-23T00:11Z**  
Zero-downtime: feature flag removal — no schema migration required.

### Cilla's Post-Activation Smoke Tests (Production)
**ST-CAL-1 — Live tool attach (Skyline N8432Q WO-2026-0041):**  
Cilla opens the active work order Carla's shop has in progress. Navigates to task card TC-004 (avionics leak check). Selects torque wrench TW-002 from the cal-tracked pool. Tool attaches, timestamp fires, cal status shows green (expires 2026-11-03). **PASS ✅**

**ST-CAL-2 — Coordinator view of attached tools:**  
Cilla logs in as coordinator (Danny Osei's role). Opens WO-2026-0041. Confirms new "Test Equipment" section visible in coordinator sidebar, showing all tools attached across all task cards with cal status color coding. **PASS ✅**

**ST-CAL-3 — Post-close PDF with cal section:**  
Cilla generates a PDF for a just-closed WO (WO-2026-0039). Confirms calibration section present: two tools listed, both with cal ID, standard, expiry, and attaching technician. Section heading "Test Equipment Traceability" rendered correctly. **PASS ✅**

**Issues:** None.  
**Feature 1 Status: ACTIVE ✅**

---

## Feature 2 — Discrepancy Customer Authorization Flow
**Memo gate:** DISC-AUTH-LIABILITY-MEMO-V1  
**Signed by:** Marcus Webb (liability review) + Danny Osei (coordinator SME review)  
**Code:** `PRODUCTION_GATE=DISC_CUSTOMER_AUTH` — Convex environment flag  

### Devraj's Re-Verification Steps (Staging)
1. **Flag removal in staging config** — Removes `DISC_CUSTOMER_AUTH` entry from staging env, deploys.
2. **Authorization request creation** — Opens a staged discrepancy on WO-STG-0112 (corrosion found during annual). Coordinator initiates "Request Customer Authorization" — staging confirms: notification email rendered (not sent in staging), customer token generated with 72-hour window, discrepancy detail attached. ✅
3. **Customer portal authorization path** — Follows tokenized link as mock customer. Renders discrepancy description, estimated cost, compliance context note. Three options: Authorize / Authorize with conditions / Decline. Selects "Authorize" — WO updates to `discrepancy_authorized`, tech can now proceed. ✅
4. **Decline path** — Re-runs with "Decline" selection. WO moves to `discrepancy_declined`, coordinator gets in-app notification, RTS path blocked until re-authorization. Confirms no tech can sign off task card associated with declined discrepancy. ✅
5. **Liability memo language** — Confirms authorization confirmation screen renders the exact liability acknowledgment text from DISC-AUTH-LIABILITY-MEMO-V1 §3.2 verbatim. Marcus had flagged this as a hard requirement — confirmed match. ✅

**Staging re-verify verdict: PASS**

### Marcus Co-Sign
Marcus reviews output. Key concern had been that the liability language couldn't be abbreviated or paraphrased — it had to render in full. Confirmed. Secondary concern: customer token expiry must hard-lock, not warn. Confirmed: expired token attempt returns 401 with "Authorization window expired — contact your service coordinator."

**Marcus co-sign recorded:** 2026-02-23T00:18Z — *"DISC-AUTH-LIABILITY-MEMO-V1 provisions confirmed. Liability language verbatim match confirmed. Production flip authorized."*

### Production Activation
```
npx convex deploy --env production --message "WS20-A: Remove DISC_CUSTOMER_AUTH production gate — DISC-AUTH-LIABILITY-MEMO-V1 signed"
```
Deploy timestamp: **2026-02-23T00:24Z**

### Cilla's Post-Activation Smoke Tests (Production)
**ST-DISC-1 — End-to-end authorization request:**  
Cilla works with Carla's coordinator to create a test discrepancy on a parked aircraft (not in active work). Coordinator initiates authorization request. Cilla receives tokenized link. Renders correctly in both desktop and mobile (iPhone 14 Safari). Authorization flow completes, WO status updates within 3 seconds. **PASS ✅**

**ST-DISC-2 — Declined discrepancy blocks RTS:**  
Cilla declines the test authorization. Confirms that the affected task card cannot be signed as complete — system presents hard block: *"Discrepancy DISC-0041 is declined — task card cannot close until customer re-authorizes or work order is adjusted."* Cilla attempts to bypass via direct API call (her test harness). 403 returned. **PASS ✅**

**ST-DISC-3 — Coordinator notification on decline:**  
Confirms coordinator dashboard shows red indicator on WO with declined discrepancy. In-app notification fired. Email notification (configured for Carla's shop) queued correctly. **PASS ✅**

**Issues:** None.  
**Feature 2 Status: ACTIVE ✅**

---

## Feature 3 — Customer Portal
**Gate:** Tokenized access model — no separate memo; gated on WS16-C (PDF export) and portal build (WS17-K) being DONE.  
**Model:** Coordinator-driven status model — coordinator controls what customers can see. Customer can never initiate; they receive, read, and respond only.  
**Code:** `PRODUCTION_GATE=CUSTOMER_PORTAL` — Convex environment flag  

### Devraj's Re-Verification Steps (Staging)
1. **Flag removal + portal route activation** — Removes `CUSTOMER_PORTAL` flag. Verifies `/portal/:token` route becomes live in staging router.
2. **Token generation flow** — Coordinator generates customer portal invite for N8432Q owner (mock: "James Aldrich"). Token created, 30-day expiry, scoped to that aircraft's work orders only.
3. **Customer view** — Portal shows: active work orders for N8432Q, status for each, any pending authorizations. No technician names. No cost breakdown (coordinator chose to hide). Coordinator had full control over visibility toggles — confirmed.
4. **Aircraft isolation** — Token for N8432Q cannot access any other aircraft in Carla's fleet. Tested with direct URL manipulation. 403. ✅
5. **Session behavior** — Portal session does not share authentication state with any staff user. Separate session namespace confirmed.

**Staging re-verify verdict: PASS — with one flag**

> **Devraj note (staging):** During token generation, if a coordinator sets portal invite expiry to "never," the UI accepts it but the backend validator catches it and silently defaults to 90 days. The validator behavior is correct per spec, but the UI should surface feedback that the "never" option isn't honored — it shows a success message without clarifying the default was applied.

### Marcus Co-Sign
Marcus notes the silent default behavior Devraj flagged. His assessment: this is a UX deficiency, not a compliance issue. The 90-day backend enforcement is the safer behavior. He marks the UI feedback gap as FR-007 for the P5 backlog.

**Marcus co-sign recorded:** 2026-02-23T00:29Z — *"Portal access model compliant. Token isolation verified. Production flip authorized. FR-007 filed for UI feedback on expiry default."*

### Production Activation
```
npx convex deploy --env production --message "WS20-A: Remove CUSTOMER_PORTAL production gate — activation authorized"
```
Deploy timestamp: **2026-02-23T00:33Z**

### Cilla's Post-Activation Smoke Tests (Production)
**ST-PORTAL-1 — First live portal invite (Carla's shop):**  
Carla's coordinator generates an invite for aircraft owner James Aldrich (N8432Q). Cilla receives the tokenized link. Portal loads. Active WO-2026-0041 visible. Status: "In Progress — Annual Inspection." No technician-level detail visible to Cilla (correct). **PASS ✅**

**ST-PORTAL-2 — Discrepancy authorization via portal:**  
With the discrepancy auth feature now live, Cilla tests the combined path: discrepancy appears in portal view as "Pending Your Authorization." Cilla clicks through — authorization flow renders inside the portal (not a redirect to external page). Authorizes. WO status updates. **PASS ✅**

**ST-PORTAL-3 — Mobile rendering:**  
Cilla opens portal link on iPhone 14 (Troy Weaver's device profile). Portal renders correctly in mobile Safari. Work order cards readable. Authorization flow completes. No layout breaks. **PASS ✅**

**Issues:** FR-007 filed (UI expiry feedback — non-blocking). No production-blocking issues.  
**Feature 3 Status: ACTIVE (CONDITIONAL — FR-007 backlogged) ✅**

---

## P5 Activation Summary

| Feature | Memo / Gate | Marcus Co-Sign | Production Flip | Smoke Tests | Status |
|---|---|---|---|---|---|
| Test Equipment Traceability | CAL-POLICY-MEMO-V1 | ✅ 00:05Z | ✅ 00:11Z | 3/3 PASS | **ACTIVE** |
| Discrepancy Customer Auth | DISC-AUTH-LIABILITY-MEMO-V1 | ✅ 00:18Z | ✅ 00:24Z | 3/3 PASS | **ACTIVE** |
| Customer Portal | Architecture gate | ✅ 00:29Z | ✅ 00:33Z | 3/3 PASS | **ACTIVE (FR-007)** |

**All three features are live in production as of 2026-02-23T00:33Z.**  
P5 activation complete. No rollback triggers. P4 remains stable.

---

*WS20-A closed by Devraj Anand + Marcus Webb + Cilla Oduya — 2026-02-23*
