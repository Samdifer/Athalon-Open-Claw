# Athelon Phase 5 Alpha — Pilot Test Report
**Classification:** Internal — QA, Regulatory, Field Assessment  
**Test Date:** Tuesday, February 24, 2026  
**Report Authors:** Cilla Oduya (QA Lead) · Marcus Webb (Regulatory) · Capt. Rosa Eaton (Ret., Field Assessment)  
**Distribution:** Rafael Mendoza (Tech Lead) · Jonas Harker (DevOps) · Devraj Anand (Backend) · Chloe Park (Frontend)  
**Status:** FINAL — Pilot Session Complete  
**Verdict:** NO-GO (see Section 8)

---

## Section 1: Test Environment

### 1.1 Personnel Present

| Person | Role | Capacity |
|---|---|---|
| Cilla Oduya | QA Lead, Athelon | Test executor, scribe, pass/fail authority |
| Marcus Webb | Regulatory Counsel | Compliance annotation, §43.9 / §43.11 / §65.91 interpretation |
| Capt. Rosa Eaton (Ret.) | Field Assessor | Field observation, usability-under-pressure assessment |
| Carla Ostrowski | Director of Maintenance (pilot shop) | DOM test scenario |
| Dale Renfrow | IA Holder (pilot shop) | IA sign-off test scenario |
| Renata Solís | Quality Control Manager (pilot shop) | QCM review test scenario |
| Jonas Harker | DevOps / Platform, Athelon | Deployment support, Convex Dashboard access |
| Devraj Anand | Backend Engineer, Athelon | Backend query support (observer role) |

Note: Devraj was physically present but did not touch the application during user scenarios. He was available for backend questions. Per QA protocol, the test record reflects what the system does, not what the engineers know about it.

### 1.2 Test Location and Setup

Central States Aviation Services, Columbus, OH (pilot repair station). Hangar break room, conference table, two projection monitors. Test was conducted from approximately 07:30 to 16:45 local time. The shop was open and operating — mechanics were on the floor — which is how Rosa wanted it. "If the software can't survive people walking in and out and someone's phone going off, I don't want to know about it in a quiet room."

**Test devices:**

- **Carla's workstation:** Dell Latitude 5550 laptop, Chrome 122 (current), 1920×1080. This is her actual machine — not a clean test device. Browser had six other tabs open. Intentional.
- **Dale's tablet:** Samsung Galaxy Tab S9, Chrome 122, 2560×1600. This is the device class that will be used on the floor.
- **Renata's workstation:** HP EliteBook 840, Chrome 122, 1920×1080.
- **QA machine (Cilla):** MacBook Pro M3, Safari 17.4, for cross-browser observation.
- **Secondary monitor:** Convex Dashboard (`athelon-prod` environment), Jonas only.

### 1.3 Deployment Details

**Convex deployment:** `athelon-prod` (production environment)  
**Deployment build:** main branch, commit `7c42fa9` — deployed February 23, 2026 at 23:41 UTC by Jonas Harker with GitHub Environment approval from Rafael Mendoza.  
**Frontend:** Vercel production, matching commit.  
**Convex schema version:** Phase 5 extension — confirmed via Dashboard on morning of test.

### 1.4 Test Aircraft

**Tail number:** N48117  
**Make/Model:** Beechcraft King Air B200  
**Serial Number:** BB-1124  
**Aircraft Total Time (system-recorded):** 4,218.0 hours  
**Aircraft Total Time (Hobbs meter, physical):** 4,218.3 hours

Note: The 0.3-hour discrepancy between the system's recorded total time and the physical Hobbs meter was noticed at 07:52 by Carla during the initial aircraft record review. This is discussed in Section 2 (GO-LIVE-04).

### 1.5 Test Technician Credentials

All credentials seeded in `athelon-prod` by Jonas on February 23.

| Name | Role in System | Cert Number | IA Number |
|---|---|---|---|
| Carla Ostrowski | DOM | 1178643 | IA-0082914 |
| Dale Renfrow | IA / A&P | 2871490 | IA-2011-04883 |
| Renata Solís | QCM / Supervisor | 2871049 | IA-2012-3817 |
| Troy Weaver (test A&P) | amt | 3145882 | — |

Troy Weaver is a Central States mechanic assigned to the ramp who agreed to participate in the task card signing scenarios. He was not briefed on the system in advance — Rosa specifically asked that he not be, to observe authentic first-contact behavior.

---

## Section 2: Go-Live Checklist Results

*Run by Jonas and Cilla, 07:30–09:15. Devraj present for technical questions. Results annotated where Marcus raised regulatory significance.*

---

### GO-LIVE-01 — Production Schema Version Current
**Result: PASS**

Convex Dashboard → `athelon-prod` → Deployment Info timestamp: `2026-02-23T23:41:12Z`. CI production deploy log: `2026-02-23T23:39:48Z`. Lag within acceptable window. All 11 tables present. No missing tables.

---

### GO-LIVE-02 — Phase 5 Schema Additions Present
**Result: PASS**

Tested via Convex Dashboard → Run Function. `parts.location` accepted `"pending_inspection"` without schema validator rejection. `auditLog.eventType` accepted `"qcm_reviewed"`. Both schema additions confirmed live.

---

### GO-LIVE-03 — Pilot Org Record Exists and Is Correct
**Result: PASS**

`organizations` table: one row. `clerkOrgId` verified against Clerk Dashboard. `part145CertNumber` matches Central States' physical Part 145 certificate (confirmed by Carla: "that's the right number"). `name` matches the shop's legal name as it appears on the certificate.

---

### GO-LIVE-04 — Aircraft Seeded with Normalized N-Number and Non-Null Total Time
**Result: CONDITIONAL PASS — Observation logged**

**N-number:** Stored as `N48117` — uppercase, N-prefix, no hyphens. Normalization confirmed. `totalAirframeTime`: 4218.0. Non-null, non-zero.

**Observation (Carla, 07:52):** The Hobbs meter on N48117 reads 4,218.3 hours this morning. The system was seeded with 4,218.0 from the logbook entry. Carla noted this is not a system failure — the seeding was done from paper records, and the paper records were from the last logbook entry, not this morning's meter. However, this means the first work order opened on N48117 will show an `aircraftTotalTimeAtOpen` of 4,218.0 in the system even if the IA enters 4,218.3 from the Hobbs. That discrepancy creates an `MR_AIRCRAFT_TIME_MISMATCH` condition on the first maintenance record.

**Marcus annotation:** This is a data hygiene issue at seeding, not a system defect. The `aircraftTotalTimeAtOpen` guard is working correctly. The seeding procedure in `convex-deployment.md §2.3` should specify: record total time from the Hobbs meter on the day of onboarding, not from the most recent logbook entry. Logbook entries trail the Hobbs. Recommend updating the seeding runbook.

**Resolution for today's test:** Jonas updated the aircraft total time to 4,218.3 via Convex Dashboard before proceeding. This was the correct resolution, and Jonas documented the change in the incident log per the operational note in `convex-deployment.md §Operational Notes`.

---

### GO-LIVE-05 — DOM Technician Linked to Clerk Account with Valid Certificate
**Result: PASS — with note on IA cert number field**

Carla's technician record: `status: "active"`, `userId` matching her Clerk account, certificate entry with `certNumber: "1178643"`, ratings `["airframe", "powerplant"]`. Second certificate entry: `type: "IA"`, `iaCertNumber: "IA-0082914"`, `expiryDate`: March 31, 2027. The `iaCertNumber` field is present as a separate field — Open Item 1 from `maintenance-record-impl.md` is resolved.

Dale's record: confirmed. `iaCertNumber: "IA-2011-04883"`, `expiryDate`: March 31, 2027. Both numbers correctly distinct from the A&P certificate number.

**Note:** Devraj confirmed the `iaCertNumber` schema extension landed in this deploy. The hard gate in `<IaCertIdentityBlock>` is now functional for both Carla and Dale's test scenarios.

---

### GO-LIVE-06 — JWT Claims Carry Correct Org and Role
**Result: PASS**

Carla logged in, browser console JWT decode: `org_id` matched pilot org's Clerk ID. `athelon_role: "dom"`. Dale: `athelon_role: "ia"`. Renata: `athelon_role: "supervisor"`. Troy Weaver: `athelon_role: "amt"`. All four role assignments verified before proceeding.

---

### GO-LIVE-07 — `signatureAuthEvent` HTTP Route Registered
**Result: PASS**

```
curl -s -o /dev/null -w "%{http_code}" -X POST https://athelon-prod.convex.cloud/webhooks/clerk/session-reauthenticated -H "Content-Type: application/json" -d '{"type":"test"}'
422
```

HTTP 422 returned. Route registered. Payload invalid as expected.

---

### GO-LIVE-08 — signatureAuthEvent Creation End-to-End
**Result: PASS**

Carla triggered re-auth. Jonas monitored `signatureAuthEvents` table in Dashboard. Row appeared within 6 seconds: `consumed: false`, `technicianId` matching Carla's record, `authMethod: "pin"`, `expiresAt = authenticatedAt + 300000`. All required fields present.

---

### GO-LIVE-09 — SHA-256 Hash Path Verified (No Placeholder)
**Result: CONDITIONAL PASS — Field ordering discrepancy flagged**

A test maintenance record was created in the dev environment and signed via the flow. Inspected `signatureHash` on the created document: 64-character lowercase hex digest. No `RTS-HASH-V0-*` pattern. The `/^[0-9a-f]{64}$/` assertion passes.

**Observation (Devraj, unprompted, 08:54):** While reviewing the canonical field set during the test, Devraj identified a field ordering discrepancy between the specification in `convex-deployment.md §3.1` (which lists `signingCertNumber` at position 9) and the actual `canonicalMaintenanceRecordJson` implementation (which places `signingTechnicianRatingsExercised` at position 9 and `signingCertNumber` at position 10). The hash output is deterministic and self-consistent — it matches on re-verification because the same implementation runs both the signing and the verification. However, the implementation does not match the documented canonical field ordering.

**Marcus annotation:** The practical risk here is minimal right now, because both the sign and verify paths use the same `canonicalMaintenanceRecordJson` function. The hash verifies correctly in production. The risk materializes if: (a) an external system attempts to independently verify a hash using the documented field order, or (b) the canonical field set is documented for regulatory review and the documentation doesn't match the implementation. Either scenario makes the hash non-independently-verifiable, which undermines the compliance case in `compliance-validation.md §2 Item 6`. This must be reconciled — either fix the implementation to match the spec, or update the spec to match the implementation — before claiming the hash is independently verifiable. Logged as OI-2026-02-24-001.

---

### GO-LIVE-10 — Org Isolation: Zero Test Data in Production
**Result: PASS**

All data tables in `athelon-prod` contain only records seeded in §2.2–2.3. Zero rows with N12345 or other synthetic N-numbers. Zero rows with `orgId` values not matching the pilot org. Clean.

---

### GO-LIVE-11 — Export Path Functional
**Result: FAIL**

Created a test work order (WO-2026-A001), immediately voided it with reason "Created for export path test — GO-LIVE-11". Attempted to trigger PDF export.

**The export button does not exist.**

The `getWorkOrderExportPayload` query is implemented and returns correct data (confirmed by Jonas via Dashboard → Run Function). The PDF rendering action is not implemented. The "Export Record" action referenced in `convex-deployment.md §5.2` is not present in the work order header. There is no export path reachable from the UI.

**Chloe was not present today but had documented this gap explicitly in `frontend-wiring.md §6.2 Launch Blockers, Item 1`:** "PDF export action... does not exist. Per maintenance-record-impl.md §4 and dom-profile.md: 'She will run the export test on day one.' This is not a day-2 feature."

The checklist says all 12 items pass before the login link is sent. We sent the login link. This item does not pass.

**FAIL. Hard stop per the go-live checklist contract. No additional qualification required — the item is unambiguous.**

---

### GO-LIVE-12 — Audit Log Writes Verified on Test Mutations
**Result: PASS**

The voided work order from GO-LIVE-11: `auditLog` table queried via Dashboard. Two entries present: `work_order_created` (correct `userId`, `tableName: "workOrders"`, timestamp within 1 second of mutation) and `work_order_voided` (correct `voidReason` in notes, timestamp within 1 second). Both entries have correct `userId` matching Jonas's technician record used for the seeding step.

---

### Go-Live Checklist Summary

| Item | Result | Note |
|---|---|---|
| GO-LIVE-01 | PASS | |
| GO-LIVE-02 | PASS | |
| GO-LIVE-03 | PASS | |
| GO-LIVE-04 | CONDITIONAL PASS | Seeding procedure gap — logbook vs. Hobbs |
| GO-LIVE-05 | PASS | iaCertNumber field present (OI-1 resolved) |
| GO-LIVE-06 | PASS | |
| GO-LIVE-07 | PASS | |
| GO-LIVE-08 | PASS | |
| GO-LIVE-09 | CONDITIONAL PASS | Hash canonical field order spec/impl mismatch — OI-2026-02-24-001 |
| GO-LIVE-10 | PASS | |
| GO-LIVE-11 | **FAIL** | PDF export not built — launch blocker |
| GO-LIVE-12 | PASS | |

**10 PASS / 1 CONDITIONAL PASS / 1 FAIL.** The go-live checklist does not pass.

---

## Section 3: Smoke Test Results

*Executed by Cilla against `athelon-prod` deployment with pilot shop personnel observing. Rosa observed all five paths. Marcus observed Smoke-05. Session ran 09:30–13:10.*

---

### Smoke-01: Sign-In + Org Switch
**Result: PASS**

Auth round-trip clean. JWT claim propagation verified. Cross-org mutation rejected with correct `WO_ORG_MISMATCH` error code. Unauthenticated request rejected. No data from pilot org visible or mutable from an alternate session.

**Rosa's observation:** "The login experience is clean. Troy sat down and logged in without being told how. That matters on a shop floor."

---

### Smoke-02: Create and Open Work Order
**Result: PASS**

WO creation flow: `WO-2026-001` created for N48117. Duplicate WO number correctly rejected (`INV-14`). TT regression correctly rejected when `aircraftTotalTimeAtOpen` below aircraft last-known TT (`INV-18`). WO opened successfully with correct time at open. Audit log entries verified: `record_created` + `status_changed (draft → open)`.

**One unexpected behavior noted (Cilla):** When the TT regression error fires (`INV-18`), the error message shown to the user reads: "Aircraft total time value is inconsistent. Please verify and retry." This does not cite the specific guard, does not state what values were submitted vs. what was recorded, and does not link to the aircraft record to verify. Compare with the error payload specified in `convex-deployment.md`: the mutation returns `{ submitted: X, recorded: Y }`. The data is there. The frontend isn't surfacing it. Logged as OI-2026-02-24-002.

**Rosa's observation:** "Troy saw that error and immediately looked at me and said 'what does that mean?' He didn't know what total time he'd entered or what the system expected. When a mechanic can't parse an error message, they're going to try the same number again. That loop costs floor time."

---

### Smoke-03: Add Task Card + Sign Steps (Including Dual Sign-Off)
**Result: CONDITIONAL PASS**

Steps 1–11 executed against WO-2026-001 with Troy Weaver on the tablet. PASS notes:

- Duplicate task card data source rejected at step 1.
- Rating validation correctly rejected `"powerplant"` rating on an airframe-only step (step 3 analog).
- Interruption creation and closure worked correctly.
- `closeWorkOrder` with an open interruption correctly threw `WO_CLOSE_OPEN_INTERRUPTIONS`. Error payload contained the interruption ID. **Count in payload was 1 — correct.**

**Finding at step 13 (Cilla predicted, materialized):** `counterSignStep` duplicate call was tested. First call succeeded. Second call (same step, same `counterSignType`, fresh auth event) threw `TC_COUNTER_SIGN_ALREADY_EXISTS` — guard fired correctly. The mutation is using a DB query, not an in-memory check: confirmed by reviewing the Dashboard function log, which shows two database reads before the error is thrown.

However: the error shown to the user on the UI is "Counter-signature already exists for this step." No timestamp. No name of the original counter-signer. No link to view the existing counter-signature. Carla, who was observing step 12 and 13, asked: "If I saw that error, how would I know who already signed it and when?" She's right — the error is correct but the user has no recovery path. Logged as OI-2026-02-24-003.

**Rosa's observation:** "On a busy shop floor, a mechanic is going to try to sign something someone else already signed. That error message needs to tell them immediately who beat them to it. 'Already exists' doesn't do it."

---

### Smoke-04: Parts Receive + Install
**Result: CONDITIONAL PASS**

LLP quantity override correctly rejected unconditionally (step 3). Parts with `no_documentation` correctly routed to quarantine. Shelf-life expired part correctly blocked at install (step 7). Traceability chain query returned `chainComplete: true` for a well-documented part.

**Finding:** Parts in `quarantine` status appeared in the "Available Parts" filter in the install flow. The badge labeled the part as "QUARANTINE — Not Issuable," which is correct, but the part should not be visible in the available filter at all. A mechanic who knows the system will understand the badge. A mechanic who doesn't may interpret "available" as meaning the part can be used, and proceed to have the server-side block explain why it can't. The quarantine filter at the query level should exclude quarantined parts from the "available inventory" view. This is not just UX — surfacing quarantined parts in an issuance search creates compliance risk. Logged as OI-2026-02-24-004.

**Marcus annotation:** `installPart` correctly throws at the mutation level when a quarantine-status part is submitted. The data layer is protected. But the UI path that leads to a failed installation attempt using a quarantined part is a compliance signal — it means the technician was looking at a quarantined part and believed they could use it until the backend stopped them. That's the failure mode `parts.location === "pending_inspection"` was designed to prevent. Investigate whether "quarantine" and "pending_inspection" should both be excluded from available inventory searches by default.

---

### Smoke-05: RTS Sign-Off Flow (All Nine Preconditions)
**Result: CONDITIONAL PASS — one precondition error code mismatch**

Most precondition failure paths executed correctly. AD overdue correctly blocked. IA expiry hard gate confirmed. Auth event failures (consumed, expired, identity mismatch) all threw correct error codes.

**Finding (Cilla predicted, partially materialized):** The three-assertion RTS statement validation returned the wrong error code in one scenario. Test setup: 48-character statement, no "14 CFR" citation, no "airworthy" determination word. Expected: `RTS_STATEMENT_TOO_SHORT` (character count checked first per guard ordering). Received: `RTS_STATEMENT_NO_CITATION`. The `NO_CITATION` check is running before the `TOO_SHORT` check in the mutation. The guard order is wrong. The correct guard order is explicit in `qa-smoke-tests.md §Smoke-05 Step 2`: `RTS_STATEMENT_TOO_SHORT` is the first assertion, because you check minimum length before content. Logged as OI-2026-02-24-005.

**Marcus annotation:** Wrong error codes map to wrong user messages. A mechanic who gets "no citation" when the real problem is "too short" is going to add "14 CFR Part 43" to a 52-character statement and submit it again, thinking they've addressed the issue. They haven't. The guard order violation causes the wrong fix to be attempted. This is a mutation defect with a UX consequence. Fix the guard order — short first, citation second, determination third — matching the spec.

INV-25 (Form 337 whitespace bypass) passed correctly: `setForm337Reference("   ")` threw as expected. Trim-then-length check confirmed.

Success path (step 10 analog): RTS record created. SHA-256 hash present (64-char hex). `iaCertificateNumber` snapshotted in record (`IA-2011-04883` — distinct from A&P number). `lastExercisedDate` updated on Dale's technician record. WO → `closed`. Aircraft → `airworthy`. Audit trail present.

---

### Smoke Test Summary

| Path | Result | Primary Finding |
|---|---|---|
| Smoke-01 | PASS | |
| Smoke-02 | PASS | Error message for INV-18 not surfacing submitted vs. recorded values |
| Smoke-03 | CONDITIONAL PASS | `TC_COUNTER_SIGN_ALREADY_EXISTS` error missing original signer info |
| Smoke-04 | CONDITIONAL PASS | Quarantine parts visible in available inventory filter |
| Smoke-05 | CONDITIONAL PASS | RTS guard order wrong — NO_CITATION before TOO_SHORT |

---

## Section 4: Carla's Export Test

*10:45 — Carla at her workstation, Chrome, production deployment. Rosa and Marcus observing. Cilla scribing.*

Carla logged in without help. She navigated to Work Orders, opened WO-2026-001 (the one created during Smoke-02/03), and went directly to the Records tab. One signed maintenance record was present from the Smoke-03 scenario — a test maintenance entry Troy had created and signed on the landing gear inspection.

She expanded the record. Read it. Took about forty-five seconds. The signed record displayed: aircraft tail number, make, model, serial, work performed, approved data reference (structured object — document type AMM, chapter 32-30-00, Rev 9), completion date, aircraft total time, signing technician name, A&P certificate number, SHA-256 hash badge ("✓ INTEGRITY VERIFIED"), signature timestamp.

**Carla, reading the cert number field:** "That's the right number. That's his cert." No elaboration. She was confirming. She kept reading.

She toggled the FAA Inspector View. The full audit trail expanded: two timestamps — `record_created` at 10:23:41, `record_signed` at 10:27:58. "There's my two-data-point check," she said, unprompted, to nobody in particular. The hash verification block showed: stored hash, recomputed hash, `IDENTICAL` in green. She read both full hex strings. "I don't know what I'd do with that if they differed," she said to Marcus. Marcus said: "Flag it and stop." "Right."

She looked at the correction chain field. No corrections. The original record showed no `correctedByRecordId`. "What does it look like when there's a correction?" she asked. Devraj pulled up a sample record from the dev environment on the secondary monitor showing a correction chain display: original record struck-through in header, correction record linked below with connecting arrow. Carla looked at it for several seconds. "The original's still there. I can read it." She nodded once. Not enthusiasm. Assessment.

Then she looked for the export button.

She scrolled up. Scrolled down. Checked the work order header. The Records tab. The record detail page. She opened the overflow menu in the top-right corner of the work order. She did this methodically, without apparent frustration, for about ninety seconds.

Then she turned to Cilla.

**Carla:** "There's no export."

Cilla confirmed: the PDF export is not implemented. It's documented as a launch blocker.

Carla was quiet for a moment. Not visibly angry. She was doing something internal that looked like recalibrating.

**Carla:** "I told you I was going to run this test on day one. It was in the notes I sent over two weeks ago. I'm not upset — I've seen worse — but I want to be clear that this is the test. This is the thing I said mattered most. The record inside the system looks right. I can see everything I need to see. If I could print that or export it as a PDF, I'd have something I could hand to an inspector. Right now I have a screen. Screens turn off."

She paused.

**Carla:** "Fix the export and show me what it looks like. Until then I can't evaluate whether this produces defensible records. The data is there. I just can't get to it in a form that survives the software."

She did not ask for the rest of the demo to be cancelled. She stayed for the full day. She is a professional.

---

## Section 5: Dale's Sign-Off Test

*11:30 — Dale at the Samsung tablet, on the floor next to a King Air main gear strut (Troy's actual work area, Rosa's request). Cilla and Marcus observing from six feet away. Troy had pre-signed the mechanic step to set up Dale's counter-sign.*

Dale navigated to WO-2026-001, opened the Landing Gear task card. Step 4 was the IA-required step Troy had completed. Dale tapped "IA Counter-Sign."

The screen presented the IA review panel first: Troy's sign-off details (timestamp, cert number, rating exercised `["airframe"]`), the referenced AMM document (`32-30-00, Rev 9`), and the findings Troy had entered. Dale read it. He did not rush. He scrolled through the findings section.

**Dale:** "This is the panel I asked for. I can see what he signed before I sign."

He scrolled down to the `<IaCertIdentityBlock>`:

```
YOUR INSPECTION AUTHORIZATION
Name:             Dale Renfrow
A&P Certificate:  #2871490    (Airframe & Powerplant)
IA Authorization: #IA-2011-04883
IA Current Through: March 2027
This is the information that will appear in the signed record.
Review it. Then authenticate.
```

He stopped on the IA Authorization line. Read it. Read it again.

**Dale:** "Two numbers. That's what I asked for. Two separate numbers." He said this flatly, like a person confirming a gear position indicator — functional, not celebratory.

He scrolled to the ratings confirmation — "IA" pre-selected — and the certification statement. The full 14 CFR §43.11 regulatory citation was displayed in plain text, with his name and IA number populated in the statement fields. He read the whole thing. Then the PIN entry modal appeared.

He entered his PIN. Two seconds. The record appeared.

**Dale:** "I see the signed record. I see my IA number on it. I see the timestamp." He pointed to the timestamp. "That's the time right now, not the time I logged in this morning." He verified: the `signatureTimestamp` showed 11:34:22 — the time of the PIN entry, not 07:30 when he'd logged in at the start of the day.

He checked the SHA-256 badge. Read the hash prefix tooltip. "What does this mean for me practically?" Marcus answered: "If this record is altered after signing, that value changes. It becomes a mismatch." Dale: "So you can detect it." Marcus: "Yes." Dale: "Good."

**On the per-signature auth requirement:**

**Dale:** "The session token doesn't carry over. I authenticated for this signature specifically, on this record, right now. That's what I asked for. If this system were letting me sign everything I touched because I entered a PIN this morning, I'd walk out." He did not say this loudly. He said it the way he'd say it in a deposition.

**One concern Dale raised (logged as OI-2026-02-24-006):** The PIN entry timeout is 300 seconds — 5 minutes. Dale's position: "Five minutes is too long. On an annual inspection, I might verify the mechanic's sign-off, look at a paper reference, step to another station, and come back. Five minutes and my auth event is still valid. That's not per-signature. That's per-task-cluster." He asked whether the timeout is configurable. It is not, currently — it's a fixed 5-minute TTL in `signatureAuthEvent`. Dale: "Consider shortening it. Three minutes, maybe two-and-a-half. The whole point is that the pause is non-trivial. Five minutes isn't a pause, it's a window."

Marcus flagged this for the team: the 5-minute TTL is technically compliant with AC 120-78B (no specific time limit mandated). However, Dale's concern is legitimate from a "per-signature means per-signature" standpoint. Logged for design review.

---

## Section 6: Renata's QCM Review Test

*14:00 — Renata at her HP EliteBook. WO-2026-001 was closed (Troy had completed all task cards by this point, following RTS authorization by Dale). Cilla scribing. Rosa observing.*

Renata opened the QCM dashboard from the left-hand navigation. The dashboard showed WO-2026-001 in the "Awaiting QCM Review" panel with a `24h since close` amber badge (the WO had been closed at approximately 13:45, so the badge was technically showing under 1 hour, but the amber state was present because the threshold triggers based on being closed-and-unreviewed rather than time-elapsed — a minor implementation point Renata noted).

She confirmed that the **"Mark Reviewed" button was not present when she logged in as Troy's user in a test of the permission model** (Cilla's cross-test). Troy's `amt` role does not see the action button. Only the supervisor+ roles do. "Good," said Renata. "The permission model is correct."

She clicked "Mark Reviewed" from her supervisor account. The `<QcmReviewModal>` appeared: WO number, aircraft, close timestamp, elapsed time since close. The acknowledgement checkbox read: "I have reviewed the maintenance records, task card sign-offs, discrepancy dispositions, and parts traceability for this work order." She read it word by word.

**Renata:** "That's the right list. That's actually the list I check." She checked the box.

The notes field was present with a 500-character counter visible in the top right. She tested the counter by typing a 498-character note, confirming no silent truncation. The counter turned amber at 480, red at 495. "That's what I asked for. Character limit is visible before I hit it."

She submitted. The WO header transitioned in real time to: "✓ QCM REVIEWED — Renata Solís — 2026-02-24T14:07:31Z". Audit trail entry `qcm_reviewed` confirmed in audit trail view.

**What she tested independently:** Renata attempted to initiate QCM review from a tab where she had Carla's (DOM) session open. She confirmed that Carla, as DOM, also sees the "Mark Reviewed" button (DOM role ≥ supervisor). "That's fine," Renata said. "Carla can do QCM reviews too. The point is that Carla can't override my refusal to review." Cilla confirmed: there is no mutation path that allows a completed WO to bypass the QCM review queue. The review is always an additive action, never a blocker on WO closure itself.

**Renata's concern about the dashboard aging indicator (logged as OI-2026-02-24-007):** After completing the review, Renata refreshed the dashboard. The WO moved from "Awaiting Review" to the "Recently Reviewed" section correctly. However, she navigated away and returned to the dashboard: the transition back was not live — it showed WO-2026-001 as still pending until she manually refreshed. The Convex live subscription on `qcm/dashboard/page.tsx` appears to not be updating the pending-review list in real time. This is a regression against the live subscription requirement in `frontend-wiring.md §4.3`.

**Renata:** "If I mark a record reviewed and walk away, and then someone else opens the dashboard, do they see the old state? For how long? I need the answer to be 'no' and 'never.'" Currently the answer is "yes" and "until they refresh." Logged.

**Overall reaction:** Renata was more positive than either Carla or Dale at this point in the day. "The independence is architecturally correct. The DOM can't void my review or prevent me from reviewing. The permission model is what I asked for." She was measured. "The dashboard freshness issue is operational. It's not a compliance gap — my review is committed in the database the moment I submit it. But if other people on my team are looking at the dashboard, they should see the current state. Fix it."

---

## Section 7: Open Items Discovered During Pilot

*Logged by Cilla during the session. Items that were previously documented as launch blockers are noted as such. New findings are marked NEW.*

---

### OI-2026-02-24-001 — SHA-256 Canonical Field Order: Spec/Implementation Mismatch
**Severity:** Moderate | **Type:** Compliance documentation gap | **Status:** Open  
**Context:** Section 2, GO-LIVE-09.  
`convex-deployment.md §3.1` documents field position 9 as `signingCertNumber`. The actual `canonicalMaintenanceRecordJson` implementation places `signingTechnicianRatingsExercised` at position 9. The hash is internally consistent but not independently verifiable from the documented spec. Marcus flagged this as undermining the independent verification claim.  
**Owner:** Devraj. **Required action:** Reconcile spec and implementation. Document the resolution.

---

### OI-2026-02-24-002 — INV-18 Error Message Not Surfacing Submitted vs. Recorded TT Values [NEW]
**Severity:** Low-Moderate | **Type:** UX / user recovery | **Status:** Open  
**Context:** Section 3, Smoke-02.  
The mutation returns `{ submitted: X, recorded: Y }` in the error payload. The frontend displays generic "Aircraft total time value is inconsistent." Troy's reaction confirmed the ambiguity creates floor confusion. The frontend must surface the specific values.  
**Owner:** Chloe. **Required action:** Update error display in `openWorkOrder` error handler to show submitted and recorded values from the ConvexError payload.

---

### OI-2026-02-24-003 — `TC_COUNTER_SIGN_ALREADY_EXISTS` Error Missing Original Signer Information [NEW]
**Severity:** Low-Moderate | **Type:** UX / user recovery | **Status:** Open  
**Context:** Section 3, Smoke-03.  
Duplicate counter-sign correctly blocked. Error message: "Counter-signature already exists for this step." No name, no timestamp, no link. On a multi-inspector annual, a second IA doesn't know who already signed or when. The error should include: signer name, cert number, timestamp of existing counter-signature.  
**Owner:** Chloe. **Required action:** Enrich error display with existing counter-signature data. Backend error payload should include `existingSignerCertNumber` and `existingSignerTimestamp` if available.

---

### OI-2026-02-24-004 — Quarantined Parts Visible in Available Inventory Filter [NEW]
**Severity:** Moderate | **Type:** Compliance / parts issuance risk | **Status:** Open  
**Context:** Section 3, Smoke-04.  
Parts in `quarantine` status appear in the "Available Parts" search in the installation flow. QUARANTINE badge is displayed, but the part should not be visible in an available inventory search. The mutation correctly blocks installation, but the UI path that leads to a failed attempt on a quarantined part represents a compliance signal and user confusion risk. Same likely applies to `pending_inspection` parts.  
**Owner:** Devraj (query filter) + Chloe (UI filter). **Required action:** Exclude `quarantine` and `pending_inspection` from the default available inventory search. Add a separate "Show Quarantined / Pending Inspection" toggle for shop managers.

---

### OI-2026-02-24-005 — RTS Statement Guard Order Wrong: `NO_CITATION` Before `TOO_SHORT` [NEW — predicted by Cilla]
**Severity:** Moderate | **Type:** Mutation defect with UX consequence | **Status:** Open  
**Context:** Section 3, Smoke-05.  
Guard sequence should be: `TOO_SHORT` → `NO_CITATION` → `NO_DETERMINATION`. Actual sequence: `NO_CITATION` check fires first on short statements. User receives citation error when the actual problem is length. Results in mechanics adding regulatory language to a statement that still fails because it's too short. Logged as a mutation defect.  
**Owner:** Devraj. **Required action:** Reorder the three RTS statement guards to match the spec in `qa-smoke-tests.md §Smoke-05` and `compliance-validation.md`.

---

### OI-2026-02-24-006 — signatureAuthEvent TTL: 5-Minute Window Potentially Too Long for Per-Signature Intent [NEW]
**Severity:** Low | **Type:** Compliance design concern | **Status:** Under review  
**Context:** Section 5, Dale's sign-off test.  
Dale's concern: 5-minute TTL allows an auth event to span multiple work activities before being consumed. Technically compliant with AC 120-78B. Philosophically in tension with the per-signature authentication intent. Not a blocking issue; flagged for design discussion.  
**Owner:** Rafael + Marcus (design review). **Suggested action:** Evaluate reducing TTL to 150–180 seconds. If reduced, update the `AUTH_EVENT_EXPIRED` error message and the client-side countdown to reflect the shorter window without creating additional user friction.

---

### OI-2026-02-24-007 — QCM Dashboard Live Subscription Not Updating After QCM Review Completion [NEW]
**Severity:** Low-Moderate | **Type:** Frontend regression | **Status:** Open  
**Context:** Section 6, Renata's QCM test.  
After a QCM review is completed, the Convex live subscription on `qcm/dashboard/page.tsx` does not update the pending-review list in real time. Dashboard shows stale state until manual refresh. The committed record in the database is correct. The subscription gap creates a UI inconsistency that could cause a second reviewer to attempt a duplicate review.  
**Owner:** Chloe. **Required action:** Verify live subscription wiring on `listClosedPendingQcmReview` query. Should update without refresh per `frontend-wiring.md §4.3`.

---

### OI-PREEXISTING — PDF Export Not Built (Launch Blocker — Previously Documented)
**Severity:** Critical | **Type:** Launch blocker | **Status:** Open — no change from previous status  
**Context:** Section 2 (GO-LIVE-11), Section 4 (Carla's export test).  
Documented in `frontend-wiring.md §6.2`, `maintenance-record-impl.md §Section 4 Requirement 4`, and `convex-deployment.md §5.2`. The `getWorkOrderExportPayload` query is implemented and returns correct data. The PDF rendering action does not exist. This is not a new finding from this pilot session — it was already a documented launch blocker. The pilot session confirms that it is, in fact, blocking.  
**Owner:** Devraj + Chloe (2-day estimate per `frontend-wiring.md §6.1`). Marcus must review the §43.9 field layout before implementation. **DO NOT send login link to additional users until this is resolved.**

---

## Section 8: Pilot Test Verdict

### 8.1 Cilla Oduya — QA Lead

**Verdict: NO-GO**

The go-live checklist contract states: "Twelve items. Every one passes before the login link is sent. All 12, not 11." GO-LIVE-11 failed. The go-live checklist does not pass. That is the verdict.

There is meaningful signal in today's session that the system is maturing in the right direction. The auth architecture is correct. The per-signature auth event flow worked as designed. The IA cert number display is resolved. The immutability model is correctly implemented — we verified this against the signed record during Carla's test. The audit trail contains the two-timestamp separation Dale asked for. The QCM permission model is correctly gated. Fourteen of the 15 exit criteria from the Phase 3 sign-off are verified as implemented. This is not a failing system.

But the following items must be resolved before I will revise this verdict:

1. **GO-LIVE-11 / OI-PREEXISTING:** PDF export must be built, Marcus must review the §43.9 template, and GO-LIVE-11 must pass on re-test.
2. **OI-2026-02-24-004:** Quarantined parts must be removed from the available inventory filter before any parts-involving work order goes live.
3. **OI-2026-02-24-005:** RTS guard order corrected.
4. **OI-2026-02-24-007:** QCM dashboard live subscription confirmed working.

Items OI-2026-02-24-001, 002, 003, and 006 are important but do not individually constitute a go/no-go issue in my assessment. They are required before the system carries full pilot shop load but could be resolved in a subsequent release within the alpha period.

Requested re-test window: February 27–28. If the export is built, reviewed, and GO-LIVE-11 passes, I will schedule a two-hour targeted re-verification. I do not require a full day-long re-test if the identified items are closed.

---

### 8.2 Marcus Webb — Regulatory Counsel

**Verdict: CONDITIONAL NO-GO — Legally insufficient without export path**

This is not a borderline call. The regulatory test for a maintenance record system is simple: can an FAA inspector, holding a subpoena or a voluntary records request, receive a document that satisfies 14 CFR §43.9 on its face, without database access, without software access, without interpretation? If the answer is no, the system is not ready to serve as the system of record.

Today's answer is no.

The underlying data structure is, in my assessment, legally sufficient. The fields captured in `maintenanceRecords` satisfy §43.9(a)(1) through (4). The IA number is now correctly stored as a separate field from the A&P certificate number, which addresses the primary failure mode I've seen in comparable systems. The SHA-256 hash provides tamper evidence. The two-timestamp separation in the audit trail (creation vs. signing) is exactly what I'd want to point to in a records review. The RTS precondition validation is genuinely rigorous — the nine-precondition enforcement is not theater. The system knows what it's certifying.

None of that matters if the records can only be read inside the application.

On OI-2026-02-24-001 (canonical field order mismatch): this requires a written resolution before I can characterize the SHA-256 implementation as independently verifiable. The hash verifies internally. Independent external verification is what the spec promises and what an inspector would require if they challenged a record's integrity. Reconcile the spec and the implementation before claiming independent verifiability.

On OI-2026-02-24-005 (RTS guard order): a mutation that returns the wrong error code for a valid precondition failure is a mutation that has not been correctly tested against its spec. The guard logic itself is present — all three assertions are there — but the ordering is wrong. This is a fixable defect, not a design failure. Fix it.

I will say this clearly: apart from the export gap and the two open items above, this is the most legally coherent MRO record-keeping architecture I have reviewed at this stage of development. The team clearly read the regulatory material. I will be pleased to say that in writing once the export path is functional and tested.

---

### 8.3 Capt. Rosa Eaton (Ret.) — Field Assessment

**Verdict: NO-GO — but come back Thursday**

I've sat through a lot of first-day evaluations. I've seen systems that failed the first test and never recovered, and I've seen systems that failed the first test and came back the next week with the problem fixed and ran clean from there. The difference is usually whether the team understood why it failed.

This team understands why it failed. Chloe documented the export as a launch blocker two weeks ago. The team shipped the alpha without resolving a documented launch blocker. That's a process problem, not a knowledge problem. They knew. Something got deprioritized. It shouldn't have.

What I saw today that mattered:

Troy Weaver — a working mechanic who had never touched this software before — logged in, created a maintenance record, signed it, and got a confirmation that he could read and understand. That's hard. Most systems either make the sign-off so easy that it doesn't feel like a commitment, or so complicated that mechanics work around it. This one felt right. He read the certification statement before he entered his PIN. I watched him. He actually read it.

Dale's reaction to seeing his IA number on the screen was the reaction of someone who's been burned before by software that got it wrong. He checked that number the way you check a fuel cap — not paranoia, habit. The fact that it was there, correctly, in the right place, as a separate field from the cert number — that earned something with Dale today that no feature demo would have earned.

Carla's reaction to the missing export was fair and proportional. She didn't blow up the room. She told the team exactly what she needs and why, and she stayed for the rest of the day. She's a professional. But she was clear: until she can export a record and hold it in her hands, she cannot tell her FSDO this system is her system of record. That's not a product preference. That's a defensibility requirement she can't waive.

Fix the export. The bones are right. I've seen worse systems that were already in production at Part 145 shops. I'd be comfortable telling a shop to use this if the export worked and the data was this clean. Get me back in the room Thursday.

---

### 8.4 Alignment Assessment

All three evaluators have issued NO-GO verdicts. There is no disagreement on the verdict.

There is a difference in emphasis: Marcus is most concerned with the legal sufficiency gap created by the missing export and the SHA-256 documentation issue. Cilla is most concerned with the systematic process failure of shipping against a documented launch blocker, and with the four open items that require resolution. Rosa is the most optimistic about the system's field readiness and the most focused on floor-level usability as the thing that determines whether a system actually gets used.

All three agree: the system demonstrates genuine technical and regulatory sophistication. All three agree: it cannot serve as a system of record without a functioning, Marcus-reviewed export path. All three agree: the path to re-certification is short and clearly defined.

**Requested re-test date: February 27, 2026.**

---

*Cilla Oduya — QA Lead, Athelon | 2026-02-24 | Session closed: 17:02 local*  
*Marcus Webb — Regulatory Counsel | annotations inline*  
*Capt. Rosa Eaton (Ret.) — Field Assessment | 2026-02-24*

*All open items logged above are binding on the re-test scope. Items not resolved by re-test date will be carried forward into the next pilot session.*

*This report is the official Phase 5 Alpha Day One test record. It supersedes any informal notes from the session.*
