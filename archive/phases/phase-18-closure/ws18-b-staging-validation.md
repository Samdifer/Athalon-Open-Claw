# WS18-B — Staging Validation + SME Acceptance

**Phase:** 18  
**Workstream:** WS18-B  
**Owners:** Cilla Oduya (QA lead) + Rosa Eaton (aviation validation) + Marcus Webb (compliance)  
**Date:** 2026-02-22  
**Depends on:** WS18-A — DEPLOYED TO STAGING (2026-02-22)  
**Environment:** `https://athelon-staging.vercel.app`  
**Status: STAGING VALIDATED**

---

## 1. Cilla Oduya — Full Test Matrix Validation

**Cilla Oduya, QA Lead**  
**Validation executed:** 2026-02-22, full-day session  
**Basis:** WS18-A smoke test evidence (ST-01..ST-10) + full Cilla test matrix per Phase 17 rubric

---

### 1.1 Validation Scope and Method

WS18-A confirmed that all ten smoke tests passed in the staging environment. My job in WS18-B is different: I'm running the full test matrix — not just the happy path, but the branches, the edge cases, the deliberate failure injections, the adversarial flows that a real shop would eventually stumble into. Jonas and Devraj built the smoke tests to confirm the deployment was clean. I'm running the tests to confirm the product is right.

I ran against the same staging environment (`athelon-staging.vercel.app`, Convex deployment `dep_staging_fc2918a3`) using the same six test user accounts seeded in WS18-A. Where I needed additional test fixtures, I used the staging seed harness to create them. All test results below reflect what I actually observed in the staging environment, not what I expected to observe.

---

### 1.2 Full Test Matrix Results

#### Group A — Work Order Lifecycle

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-A-01 | WO creation with all required fields | ✅ PASS | WO-2026-VAL-001 created in 1.8s; public ID format correct |
| VAL-A-02 | WO creation with missing aircraft N-number (should reject) | ✅ PASS | Server-side validation returns 400; no orphaned WO created |
| VAL-A-03 | Task card materialization on WO submit | ✅ PASS | 3 task cards — each independently assignable and visible to MECHANIC role |
| VAL-A-04 | Task card assignment to specific mechanic | ✅ PASS | Assignment recorded; mech-test-1 sees it in task queue immediately (Convex subscription) |
| VAL-A-05 | Task card completion by unassigned mechanic (should allow — any mechanic can complete) | ✅ PASS | mech-test-2 completed an unassigned task; behavior consistent with Phase 15 design decision |
| VAL-A-06 | WO status transitions in correct order | ✅ PASS | DRAFT → OPEN → IN_PROGRESS → RTS_SIGNED → CLOSED — no illegal transitions reachable from UI |
| VAL-A-07 | Attempt to reopen a CLOSED WO (should fail) | ✅ PASS | No UI path to reopen; direct API call to `updateWorkOrderStatus` with OPEN on closed WO rejected with ConvexError |
| VAL-A-08 | Multi-task WO with mixed completion states at RTS attempt | ✅ PASS | RTS blocked until all task cards in SIGNED state; UI shows "2 of 3 tasks complete — RTS unavailable" |

**Group A: 8/8 PASS**

---

#### Group B — IA Re-Auth Sign-Off Flow

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-B-01 | Mechanic sign-off: IA re-auth modal appears on task card sign-off | ✅ PASS | Modal fires correctly; 34s re-auth in WS18-A confirmed repeatable |
| VAL-B-02 | IA re-auth with biometric-only (single factor) — should reject | ✅ PASS | Rejected with "Biometric single-factor insufficient" error — OBJ-05 satisfied |
| VAL-B-03 | IA re-auth with PIN + biometric (two-factor) — should accept | ✅ PASS | Re-auth accepted; `signatureAuthEvents` record created with `authLevel: "full_reauth"` |
| VAL-B-04 | IA re-auth token: used once, then attempt to reuse same token for second sign-off | ✅ PASS | Second use rejected with single-use violation; new re-auth prompted |
| VAL-B-05 | IA re-auth session: confirm auth event is non-repudiable (session token present in audit record) | ✅ PASS | `signatureAuthEvents.sessionToken` present; `tokenIdentifier` from Convex auth context confirmed |
| VAL-B-06 | IA re-auth: `authCurrencyResult` field populated on auth event | ✅ PASS | `authCurrencyResult: "currency_verified"` on test IA account with current cert |
| VAL-B-07 | Full RTS sign-off by IA — more stringent re-auth than mechanic sign-off | ✅ PASS | `authLevel: "full_reauth"` on RTS event; IA cert validation against qualification precheck confirmed |
| VAL-B-08 | Qualification precheck fires BEFORE auth token consumed (TC-G-05 ordering proof — re-verified in staging) | ✅ PASS | Injected a disqualified IA test case — auth event shows `status: "pending"` post-throw; qualification check correctly ran first |
| VAL-B-09 | Sign-off confirmation modal: displays mechanic name, cert number, task description before commit | ✅ PASS | Modal shows full context; cancel path available; commit writes record |
| VAL-B-10 | `maintenanceRecords` entry written correctly after sign-off | ✅ PASS | Entry contains aircraft N-number, date, work performed, certifying mechanic cert number; §43.9(a) structure satisfied |

**Group B: 10/10 PASS**

---

#### Group C — Return-to-Service (RTS) and Regulatory Enforcement

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-C-01 | RTS sign-off produces correct `maintenanceRecords` entry (§43.9 fields) | ✅ PASS | N-number, date, description, IA name, IA cert number all present; RTS-block distinguishable from task sign-off block |
| VAL-C-02 | Pre-close checklist available after RTS signed (not before) | ✅ PASS | Pre-close button greyed with "RTS required before pre-close" until RTS complete |
| VAL-C-03 | RTS blocked if any task card not in SIGNED state | ✅ PASS | UI gate confirmed; direct mutation call also rejects at server layer |
| VAL-C-04 | RTS sign-off only available to IA role (not MECHANIC, COORDINATOR) | ✅ PASS | MECHANIC account shows RTS button as disabled with role tooltip; COORDINATOR likewise; IA role sees active button |
| VAL-C-05 | RTS re-auth: IA must re-authenticate (not rely on active session only) | ✅ PASS | Separate re-auth modal from task sign-off; the two auth events are distinct in `signatureAuthEvents` |

**Group C: 5/5 PASS**

---

#### Group D — PDF Export and §43.9 Compliance

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-D-01 | PDF export: §43.9(a)(1) — N-number, date, description of work | ✅ PASS | All three elements present and correct in generated PDF |
| VAL-D-02 | PDF export: §43.9(a)(2) — approved data reference (where applicable) | ✅ PASS | Approved data field present in task card PDF section; altimeter test section shows cal cert reference |
| VAL-D-03 | PDF export: §43.9(a)(3) — certifying person's name and cert number | ✅ PASS | Both mechanic and IA cert blocks present on PDF; cert numbers formatted correctly |
| VAL-D-04 | PDF export: §43.9(a)(4) — date and certifying signature | ✅ PASS | RTS block shows IA signature date; individual task cards show task sign-off dates |
| VAL-D-05 | PDF SHA-256 hash computed and stored in `maintenanceRecords.pdfHash` | ✅ PASS | Hash present; re-export of same record state produces identical hash (deterministic) |
| VAL-D-06 | PDF export with test equipment section — cal cert data included | ✅ PASS | Cal cert number, lab name, cal date, NIST traceable status all appear in PDF equipment section |
| VAL-D-07 | PDF export: long description text (>500 chars) not truncated | ✅ PASS | Full-length description preserved; no truncation artifacts |
| VAL-D-08 | PDF export: attempt to export before RTS signed — should produce partial/draft export | ✅ PASS | Export available at any stage; draft watermark applied pre-RTS; full export after RTS |
| VAL-D-09 | Carla Ostrowski cold-test assertions: 47/47 re-verified in staging environment | ✅ PASS | CI-REG suite ran against staging PDF output; 47/47 assertions PASS |

**Group D: 9/9 PASS**

---

#### Group E — Audit Trail Completeness

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-E-01 | WO_CREATED event in audit log | ✅ PASS | Event present with actor, timestamp, entity ID |
| VAL-E-02 | TASK_CARD_CREATED event (one per task card) | ✅ PASS | 3 events for 3-task WO; each references correct task card ID |
| VAL-E-03 | TASK_SIGNED event with actor attribution | ✅ PASS | Actor = signing mechanic; timestamp matches `maintenanceRecords` write time |
| VAL-E-04 | RTS_SIGNED event with IA actor attribution | ✅ PASS | IA actor correctly attributed; timestamp monotonically after TASK_SIGNED events |
| VAL-E-05 | PDF_EXPORTED event with hash reference | ✅ PASS | Export event references pdfHash; export actor captured |
| VAL-E-06 | WO_CLOSED_WITH_PRECLOSE_TOKEN event | ✅ PASS | Event contains pre-close run ID and snapshot token reference |
| VAL-E-07 | Audit events stable across page refreshes (no Convex subscription duplicates) | ✅ PASS | Refreshed audit log page 5 times; event count stable; no phantom duplicates |
| VAL-E-08 | Audit log accessible to DOM and QCM roles; not accessible to MECHANIC role | ✅ PASS | MECHANIC role sees task-level history but not full WO audit log; role-gated query confirmed |
| VAL-E-09 | Adversarial: attempt to delete or modify audit event via direct API call | ✅ PASS | No delete/modify mutation exposed for audit log table; insert-only enforced at schema level |

**Group E: 9/9 PASS**

---

#### Group F — LLP Life Tracking

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-F-01 | Cycle data entry: flight cycles, engine cycles, starts recorded | ✅ PASS | Entry written to LLP component record; append-only confirmed (prior entries not modifiable) |
| VAL-F-02 | Life used % recomputed on each cycle log entry | ✅ PASS | Computation: (total cycles accumulated / life limit) × 100; shown to 1 decimal |
| VAL-F-03 | Amber indicator at 80% life used | ✅ PASS | Component at 89.3% (staged for testing) shows amber indicator in dashboard |
| VAL-F-04 | Red indicator at 95% life used | ✅ PASS | Test component at 96.1% shows red indicator with "Life Limit Approaching — Action Required" label |
| VAL-F-05 | Component at 100% life blocks associated WO from RTS (safety gate) | ✅ PASS | RTS button blocked with "LLP component 'HP Turbine Disk' at life limit — replacement required" |
| VAL-F-06 | LLP cycle history is append-only; no modification of prior entries | ✅ PASS | Attempted to modify prior cycle entry via direct API call — rejected; only insert mutation exposed |
| VAL-F-07 | LLP dashboard shows aircraft-level aggregate view across all tracked components | ✅ PASS | N44556 dashboard shows 2 components; disk at 89.3%, blade set at 43.7%; separate life indicators |
| VAL-F-08 | Erik Holmberg and Nate Cordova's UAT assertions re-verified in staging | ✅ PASS | Both SME test scripts re-run against staging LLP dashboard; all assertions pass |

**Group F: 8/8 PASS**

---

#### Group G — RSM Acknowledgment Gate

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-G-01 | Unacknowledged RSM: full-screen modal blocks task queue on navigation | ✅ PASS | Modal fires immediately; task queue content not visible behind modal |
| VAL-G-02 | Escape key does not dismiss RSM modal | ✅ PASS | Tested; no dismiss on Escape |
| VAL-G-03 | Backdrop click does not dismiss RSM modal | ✅ PASS | Tested; no dismiss on backdrop click |
| VAL-G-04 | URL bar navigation to task queue subpage while modal is active | ✅ PASS | Middleware redirect to `/rsm/pending` fires; user cannot navigate around modal |
| VAL-G-05 | Scroll-to-bottom gate: acknowledge button disabled until bottom reached | ✅ PASS | `btn-disabled` class present until scroll sentinel intersected; button activates on intersection |
| VAL-G-06 | Acknowledgment recorded in Convex with session token | ✅ PASS | `rsmRevisions.acknowledgedBy` array updated; session token present |
| VAL-G-07 | `rsmAcknowledgmentAuditLog` mirror write on acknowledgment (HB-1 — WS18-F requirement) | ✅ PASS | Mirror record written in same transaction; contains `userDisplayName`, `userRole`, `clerkSessionId`, `summaryOfChangesHash`, `retentionPolicy: "7_YEAR"` |
| VAL-G-08 | Already-acknowledged user: no modal on subsequent task queue visits | ✅ PASS | mech-test-1 (acknowledged) sees task queue immediately; no modal re-fire |
| VAL-G-09 | RSM quick-access panel visible in task queue sidebar for acknowledged user | ✅ PASS | Panel present with revision number, effective date, "✓ Acknowledged" badge, "📖 Open RSM ↗" link |
| VAL-G-10 | DOM emergency bypass issued for unacknowledged user; QCM notified | ✅ PASS | Bypass issued by dom-test for mech-test-2; QCM in-app notification received within 5 seconds; bypass window 8 hours; mech-test-2 can access task queue; full ack still required |

**Group G: 10/10 PASS**

---

#### Group H — Customer Portal and Discrepancy Authorization Flow

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-H-01 | Coordinator creates discrepancy authorization request | ✅ PASS | Request created; discAuthRequests record written; WO status → AUTHORIZATION_PENDING |
| VAL-H-02 | Email dispatched to Mailtrap in staging | ✅ PASS | Email received in Mailtrap ~38s; email body includes discrepancy description, cost range, coordinator contact, and the "call your coordinator" line from the DISC-AUTH memo |
| VAL-H-03 | Authorization link opens correctly — customer portal page loads from token | ✅ PASS | `/auth/[token]` page loads with discrepancy details, cost range, Approve/Decline buttons |
| VAL-H-04 | Customer approval records consent with IP, timestamp, declared name, relationship | ✅ PASS | `consentRecord` fields populated; `liabilityMemoRef: "DISC-AUTH-LIABILITY-MEMO-V1"` present |
| VAL-H-05 | Consent text hash verified against template version | ✅ PASS | `consentTextHash` matches SHA-256 of rendered template at time of request creation |
| VAL-H-06 | WO internal status recomputes to WO_AUTH_CLEAR after customer approval | ✅ PASS | Status recomputed within ~18 seconds of customer click |
| VAL-H-07 | Mechanic blocked from advancing dependent task step while authorization PENDING | ✅ PASS | `enforceAuthorizationGate` in task-step mutation rejects advancement; error message clear |
| VAL-H-08 | Mechanic can advance after authorization APPROVED | ✅ PASS | Task step advancement succeeds post-approval; no stale gate |
| VAL-H-09 | Customer "decline" path records decision and notifies coordinator | ✅ PASS | Decline recorded with `decision: "decline"`; coordinator in-app notification received |
| VAL-H-10 | Customer portal: "AOG" string not present in portal-visible payload | ✅ PASS | `buildCustomerPortalView` confirmed — "AOG" absent from response; internal status not exposed |
| VAL-H-11 | Assisted-phone path: coordinator records phone authorization with witness ID | ✅ PASS | `actorType: "coordinator"`, `witnessCoordinatorId` populated; email link voided; request → APPROVED |
| VAL-H-12 | Scope-change supersede: re-authorization required on material cost change | ✅ PASS | Increased cost by >threshold → prior consent record superseded; re-authorization required; TC-L-06 behavior confirmed |

**Group H: 12/12 PASS**

---

#### Group I — Pre-Close Checklist and WO Close

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-I-01 | Pre-close checklist runs on RTS-complete WO | ✅ PASS | Checklist executes in 1.1s; verdict returned |
| VAL-I-02 | BLOCKING findings prevent close | ✅ PASS | Injected BLOCKING finding via test fixture; close path blocked; "Close Work Order" button disabled |
| VAL-I-03 | ADVISORY findings do not prevent close (strictMode = false) | ✅ PASS | CONDITIONAL verdict with advisory findings allows close; coordinator notified of advisory items |
| VAL-I-04 | R03 (IA certification check) active with `PRECLOSE_WS16B_INTEGRATION_ENABLED = true` | ✅ PASS | Flag is true per WS18-E; R03 evaluated against WS16-B actual contract (`authCurrencyResult` field) |
| VAL-I-05 | R03: BLOCKING on `currency_lapsed` auth event | ✅ PASS | Injected test IA auth event with `authCurrencyResult: "currency_lapsed"`; checklist returned BLOCKING FAIL; close blocked |
| VAL-I-06 | R03: ADVISORY on missing IA auth event (no confirmed violation) | ✅ PASS | No IA auth event in test WO; R03 returned ADVISORY — "no IA re-auth event found"; close allowed (CONDITIONAL) |
| VAL-I-07 | TC-H-07 fail-closed: rule evaluation error → BLOCKING FAIL | ✅ PASS | Injected malformed WO ID via test hook; RULE_EVAL_ERROR finding; verdict FAIL; close blocked |
| VAL-I-08 | Snapshot token consumed on WO close (cannot reuse stale token) | ✅ PASS | Attempt to close with same token after WO already closed → PRECLOSE_SNAPSHOT_STALE error |
| VAL-I-09 | Closed WO is read-only in UI | ✅ PASS | No edit actions available on closed WO; direct mutation calls reject with WO_CLOSED error |
| VAL-I-10 | Pre-close audit event written with run ID and snapshot token reference | ✅ PASS | `WO_CLOSED_WITH_PRECLOSE_TOKEN` event present; run ID and snapshot token referenced in event payload |

**Group I: 10/10 PASS**

---

#### Group J — Test Equipment Traceability

| Test ID | Description | Result | Notes |
|---|---|---|---|
| VAL-J-01 | Equipment registration: all required fields enforced | ✅ PASS | Missing `calCertStorageId` (cert PDF not uploaded) → mutation rejects; cert number alone insufficient |
| VAL-J-02 | Current-cal equipment links to maintenance record without override | ✅ PASS | Normal linkage path works; no override prompt |
| VAL-J-03 | Expired-cal equipment: override required with minimum 30-char explanation | ✅ PASS | `expiredCalOverride` branch reached; 29-char explanation rejected; 30-char accepted with authorizer |
| VAL-J-04 | Override: self-authorization blocked (authorizer ≠ linking user) | ✅ PASS | Attempt by mech-test-1 to authorize own override → ConvexError "self-authorization prohibited" |
| VAL-J-05 | Override: only IA or DOM role may authorize | ✅ PASS | Coordinator and mechanic roles rejected as authorizers; IA and DOM accepted |
| VAL-J-06 | Override documented in audit log and PDF export | ✅ PASS | Override block appears in `maintenanceRecordTestEquipmentLinks`; amber "Cal expired at use — override documented" section in PDF |
| VAL-J-07 | `flagExpiredEquipment` cron correctly flags only genuinely expired equipment | ✅ PASS | 3 expired test fixtures correctly flagged; 4 current-cal fixtures not flagged; timezone offset bug (WS16-F fix) confirmed correct |
| VAL-J-08 | Quarantined equipment cannot be linked to maintenance record | ✅ PASS | Quarantined equipment linkage rejected with "equipment in quarantine" error |

**Group J: 8/8 PASS**

---

### 1.3 Test Matrix Summary

| Group | Description | Total | Pass | Fail |
|---|---|---|---|---|
| A | Work Order Lifecycle | 8 | 8 | 0 |
| B | IA Re-Auth Sign-Off Flow | 10 | 10 | 0 |
| C | RTS and Regulatory Enforcement | 5 | 5 | 0 |
| D | PDF Export and §43.9 Compliance | 9 | 9 | 0 |
| E | Audit Trail Completeness | 9 | 9 | 0 |
| F | LLP Life Tracking | 8 | 8 | 0 |
| G | RSM Acknowledgment Gate | 10 | 10 | 0 |
| H | Customer Portal and Discrepancy Auth | 12 | 12 | 0 |
| I | Pre-Close Checklist and WO Close | 10 | 10 | 0 |
| J | Test Equipment Traceability | 8 | 8 | 0 |
| **TOTAL** | | **89** | **89** | **0** |

**Overall: 89/89 PASSING**

---

### 1.4 Cilla's Validation Statement

I've run the full matrix. There are no failures.

What I want to say, because I think it matters for the record: running 89 tests against a staged application and getting zero failures is not unusual if the tests are soft. These tests are not soft. VAL-B-04 attempts token reuse. VAL-A-07 tries to reopen a closed WO through the API. VAL-E-09 tries to delete an audit event. VAL-J-04 tries to self-authorize a calibration override. VAL-H-12 tries to change scope and avoid re-authorization. These are the tests that find real bugs in real systems.

They all passed.

The two things I'm particularly satisfied with in staging: the RSM acknowledgment audit log (VAL-G-07) is writing the denormalized, self-contained record that Rachel Kwon asked for — I verified the fields myself, and they're right. And the R03 pre-close rule (VAL-I-05) is now doing what it's supposed to do: blocking close when we have positive evidence of a lapsed IA cert at sign-off time, not blocking close because a field didn't exist.

Jonas and Devraj built a clean staging environment. I did not find the edge they missed. That is the result I wanted.

**Overall staging verdict: STAGING VALIDATED**  
**Cilla Oduya — QA Lead Sign-Off: CONFIRMED**  
**Date: 2026-02-22**

---

## 2. Rosa Eaton — Aviation Operational Review

**Captain Rosa Eaton (Ret.), Aviation Compliance Advisor**  
**28 years: USAF airlift + Part 121 / Part 135 flight operations + 11 years Part 145 inspection authority**  
**Review scope:** Athelon v1.1 staging — DOM/IA operational perspective  
**Date:** 2026-02-22

---

### 2.1 How I Ran This Review

I want to be clear about what I'm doing and what I'm not doing. I'm not a software tester. Cilla tests software. What I am is someone who has spent the better part of three decades watching what happens when paperwork systems fail — when the IA who signed the RTS can't be found, when the calibration cert referenced in a logbook entry is a fax of a fax that nobody can verify, when a shop tries to explain to an FAA investigator that yes, the mechanic really did check the cylinder, they just didn't write it down that way.

I came into this review with one question: does Athelon v1.1 build the kind of maintenance record that I would trust my name — my IA certificate number — to?

I ran through the staging environment as an IA, as a DOM, and as a QCM. I did not read the test scripts. I navigated the way a real IA would on day one: without a tutorial, following the UI, trusting that the application would tell me what I needed to do.

Here is what I found.

---

### 2.2 The IA Sign-Off Flow — Does It Feel Like a Real Signing Ceremony?

Yes. And I want to explain why this matters, because the question of "does it feel right" is not soft UX feedback — it is a regulatory design question.

When an IA signs a maintenance record, the regulation does not specify a form factor. It specifies an intent: the IA, as a person, with their certificate and their reputation, is attesting that this work was done correctly and this aircraft is airworthy. A checkbox does not carry that weight. A click in the wrong context doesn't either.

The Athelon IA re-auth modal does carry that weight. Here is why:

1. **The re-auth is not frictionless.** It requires a deliberate second authentication — PIN plus a second factor. You cannot sign an RTS by being logged in. You have to re-authenticate in the moment. That friction is correct. Dale Renfrow pushed for it, and he was right. An IA who is annoyed that they had to enter their PIN again is an IA who just understood that this signature means something.

2. **The confirmation modal gives you a moment to read what you're signing.** Before the signature commits, the system presents: the aircraft N-number, the date, the description of work, the task cards being certified, and your name and certificate number as the certifying person. You can read it. You can cancel it. This is not a rubber stamp — it is a deliberate act with a preview and an escape path.

3. **The RTS sign-off is more stringent than the task card sign-off.** When I sat in the IA account and signed an RTS, the system prompted me for a higher authentication level than the mechanic who signed the task cards. That is correct. The RTS is the regulatory act. The task card sign-offs are the evidence that supports it. The IA should feel the weight of the RTS more than the mechanic feels the weight of the task card, because the regulatory exposure is different.

4. **The `maintenanceRecords` entry the system generates looks right.** I downloaded the PDF. I read it as an FAA inspector would read it. The information is in the right places — N-number, date, work narrative, cert number, RTS statement. It reads like a logbook entry, not like a database export. That is a design choice someone made deliberately, and they made the right call.

**Verdict on the IA sign-off flow:** This is not a checkbox. This is a deliberate, authenticated, documented signing ceremony. I am satisfied.

---

### 2.3 The LLP Dashboard — Does It Match How a Turbine Shop Tracks Component Life?

Broadly yes, with one operational observation that I'm flagging as a watch item (not a blocker).

Erik Holmberg and Nate Cordova shaped this feature, and it shows. The core mechanics are right:

- **Life is expressed as a percentage, not just as raw cycles.** In a turbine shop, the meaningful number is "how far through this component's life are we" — not "how many cycles is it at." The dashboard leads with percentage and uses color coding (green/amber/red) that maps to how shops actually manage this risk. The raw cycle number is visible when you drill down, which is correct — you want the percentage for scanning, the raw number for logbook reference.

- **The cycle entry is append-only.** I tested this by trying to navigate back into an old entry to edit it. No path exists. Prior cycle data is immutable. That is the correct design — you would never retroactively change a cycle count in a paper logbook, and the digital equivalent should behave the same way.

- **The 100% life limit gate blocks RTS.** This is the safety-critical enforcement that matters most. When I staged a component at 100% life and attempted to sign the RTS, the system blocked me with a clear message. In a real shop, this would be the moment where someone says "we can't release this aircraft without the disk replacement." The system says the same thing. That's right.

**The operational observation I'm flagging:** In a real turbine shop, cycle data for a given maintenance event is often entered after the fact — sometimes days after the flight, when the coordinator closes out the work order and reconciles the logbook. The current system requires cycle data to be entered before RTS. I understand why the design is that way (cycle data affects the RTS decision), but I would want to watch in production whether this creates pressure for shops to enter estimated or preliminary cycle counts just to unblock the RTS, and then correct them later. If that behavior emerges — estimated cycles at RTS, corrected cycles after — it creates a version-control problem. This is not a design flaw in v1.1, but it is worth having Nate Cordova and Erik watch the first production usage patterns.

**Verdict on LLP dashboard:** Matches how a turbine shop tracks component life. The safety gate at 100% is the right design choice. Watch the post-RTS cycle correction pattern in production.

---

### 2.4 The RTS Enforcement — Does It Match Part 43?

Yes, with appropriate fidelity to the regulatory intent.

Part 43 requires that maintenance records describe the work performed, identify the approved data used, and be signed by the authorized person performing the certification. The RTS-specific requirement is that an IA certify that the aircraft has been returned to airworthy condition.

Athelon's RTS flow enforces the following:

- **All task cards must be in SIGNED state before RTS is available.** This ensures the IA is certifying a complete body of documented work, not signing off on a partially-complete WO.
- **The IA must re-authenticate at the moment of RTS.** This satisfies the intent of the "signature" requirement — it is a deliberate act by an identified, authenticated person, not a standing session approval.
- **The `maintenanceRecords` RTS entry contains the regulatory minimum content.** The PDF export includes everything §43.9(a) requires for a return-to-service certification.
- **The qualification precheck confirms the IA's certificate is current before the auth token is consumed.** This is the belt-and-suspenders I asked for: the system checks currency before the signature is accepted, so a lapsed IA cannot sign an RTS and have it go through undetected.

There is one gap I accepted in the Phase 17 gate review and that gap is now closed by WS18-E: R03 in the pre-close checklist now correctly checks whether the signing IA was current at the time of sign-off. Previously, R03 was feature-flagged and this check wasn't running. It's running now. I tested it in staging (I triggered a lapsed-cert scenario and confirmed the pre-close engine returned a BLOCKING finding). The system caught it.

**Verdict on RTS enforcement:** Part 43 compliant as implemented. The R03 fix from WS18-E completes the belt-and-suspenders picture.

---

### 2.5 Rosa's Verdict — Would She Recommend Athelon v1.1 to a Real Part 145 Shop?

Yes. Without qualification.

The shops I would recommend this to are the ones I have seen struggle with what Athelon v1.1 directly addresses: records that exist but can't be produced on demand, sign-offs that happened but can't be proven, calibration certs that were supposedly current but nobody can say for which piece of equipment. Every one of those problems creates the same moment — the inspector is in the shop, asking for the evidence, and the shop is looking at its paper piles and its phone memories and its sticky notes and knowing that what it has is not what the inspector needs.

Athelon v1.1 changes that. The sign-off is documented with a session-authenticated record. The cal cert is uploaded to file storage, not referenced by a scribbled number. The RTS is cryptographically linked to the task card sign-offs. The audit trail is a single query away.

I have two things I'm asking Nadia and the team to watch in the first production deployment, and they're both watch items, not blockers:

1. **The 4-hour pre-close snapshot window.** Jonas flagged this, and I agree with him. For complex WOs where the coordinator runs pre-close and then gets interrupted, 4 hours might feel tight in the middle of an AOG event. Watch for feedback on this from the first shop.

2. **The LLP cycle correction pattern** I described in §2.3. The question isn't whether the system is wrong — it's whether shop behavior will develop a workaround that undermines the integrity of the cycle log. If it does, we can address it in v1.1.1.

Other than those two watch items: v1.1 is ready. Put it in front of a real Part 145 shop.

**Rosa Eaton — Aviation Operational Review: COMPLETE**  
**Recommendation: YES — deploy to production**  
**Date: 2026-02-22**

---

## 3. Marcus Webb — Staging Compliance Check

**Marcus Webb, Regulatory/Compliance Authority**  
**Compliance review executed:** 2026-02-22  
**Scope:** Cryptographic integrity, §43.9 PDF adequacy, AC 120-78B IA re-auth compliance, RSM acknowledgment legal defensibility

---

### 3.1 Are the Signatures Cryptographically Sound?

Yes, within the meaning that applies to a maintenance record management system.

I want to be precise about what "cryptographically sound" means in this context, because the term is sometimes used to promise more than a system delivers. The relevant standard for aviation maintenance record signatures is AC 120-78B, which governs the non-repudiation and identity-certainty requirements for electronic signatures in maintenance records. It does not require public-key cryptography or blockchain-level hash chaining — it requires that the signer's identity be verifiable, that the signature be attributable to a specific person at a specific time, and that the record not be alterable without detection.

Athelon's signature chain satisfies these requirements as follows:

**Identity verifiability:** Every signature event in `signatureAuthEvents` contains a Clerk session token (`tokenIdentifier`), the Clerk user ID, and the Convex user ID. The Clerk session token was issued by Clerk's authentication system to a specific user who completed the required re-authentication at the moment of signing. The identity chain is: session token → Clerk auth event → authenticated user identity. This chain is verifiable via the Clerk Enterprise log (7-year retention per WS18-F) and corroborated by the Convex `signatureAuthEvents` record (written in the same server-side context).

**Temporal attribution:** Every signature event has a server-side timestamp from Convex's internal clock. The timestamp is not client-provided; it is generated by the Convex mutation runtime at the moment of the mutation execution. Client-provided timestamps are not used for authoritative record-keeping purposes.

**Non-alteration detection:** The `signatureAuthEvents` table is insert-only at the mutation layer. No update or delete mutation is exposed for this table. The PDF export hash (`maintenanceRecords.pdfHash`) is a SHA-256 of the full PDF content at time of export, deterministically reproducible. If the PDF is regenerated from the same record state, the hash is identical. If any underlying record has been altered, the hash will differ. This provides the "alteration detection" property that AC 120-78B requires.

**Overall cryptographic assessment:** The signatures are as sound as AC 120-78B requires, and the implementation correctly applies the standard. I confirmed each of these properties in the staging environment.

---

### 3.2 Does the PDF Export Pass §43.9?

Yes. I ran through §43.9(a) element by element.

**§43.9(a)(1) — Description of work performed:** The PDF maintenance narrative section contains the full work description entered by the certifying person. I verified that long descriptions are not truncated (VAL-D-07 in Cilla's matrix confirms this).

**§43.9(a)(2) — Reference to approved data used:** The PDF includes an approved data reference field at the task card level. For regulated test procedures (altimeter, static, transponder per Part 43 Appendix E), the test equipment section includes the calibration certificate number and lab reference — this is the "approved data" reference that §43.9(a)(2) requires to be identifiable from the record.

**§43.9(a)(3) — Name of the person performing the work:** Both the mechanic's name and the IA's name appear in the PDF. Certificate numbers appear in the appropriate blocks. The RTS block shows the IA's name, certificate number, and the explicit return-to-service statement.

**§43.9(a)(4) — Signature and date:** The PDF shows the signing date for each sign-off event. The "signature" in the electronic context is the authenticated sign-off event, which is referenced in the PDF by the audit event ID and timestamp. This is an accepted form of electronic signature under AC 120-78B.

**Additional verification:** Carla Ostrowski's cold-test of 47 assertions (WS17-C, re-verified in staging as VAL-D-09) provides independent confirmation that the PDF passes the §43.9 structure. Carla reviewed the PDF as someone who has never seen the Athelon codebase and assessed it against the regulation — she passed all 47 assertions. That verification was done in Phase 17 and I did not find anything in WS18-B that reverses it.

**PDF compliance assessment:** PASSES §43.9.

---

### 3.3 Does the IA Re-Auth Satisfy AC 120-78B?

Yes. I'm satisfied with this conclusion, and I want to record the basis clearly.

AC 120-78B establishes five objectives for electronic signature systems used in maintenance records. I reviewed these against the staging implementation:

**OBJ-01 (Record identity):** Each signature record includes the signer's identity — Clerk user ID, Convex user ID, display name, certificate number. ✅

**OBJ-02 (Re-authentication at signature moment):** The system requires a fresh re-authentication — separate from the active session — at the moment of each signature. Biometric-only single-factor authentication is rejected. ✅ (Confirmed in staging: VAL-B-02)

**OBJ-03 (Non-repudiation):** The signature event is non-alterable after creation (insert-only mutation layer). The session token links the event to the Clerk auth event log. ✅

**OBJ-04 (Uniqueness — no shared credentials):** Credentials are per-user in Clerk. The re-auth challenge is bound to the authenticated user's session. ✅

**OBJ-05 (Biometric-only exclusion for IA signing):** The staging implementation correctly rejects biometric-only single-factor authentication for IA sign-off events. This was the hardest property to implement correctly and the most important one. ✅ (Confirmed in staging: VAL-B-02)

**Additional hard blockers from WS17-B (all confirmed in staging):**
- OBJ-06 (Single-use auth token): ✅ VAL-B-04
- OBJ-07 (Server-side timestamp): ✅ Convex mutation runtime timestamp
- OBJ-08 (Session-bound, not replayable): ✅ Confirmed in staging

**AC 120-78B assessment:** SATISFIED.

---

### 3.4 Does the RSM Acknowledgment Create Legally Defensible Evidence?

Yes. This was the hardest of the four questions to answer, and I want to explain why I'm giving an unqualified yes.

The question for RSM acknowledgment is different from the question for IA signatures. For IA signatures, there is a clear regulatory standard (AC 120-78B) against which to assess adequacy. For RSM acknowledgments, the question is: if an FAA investigator asks "did this mechanic read this revision of your RSM, and when, and can you prove it was really them?", can you answer?

Before WS18-F, the answer was: yes, mostly, for 30 days, subject to Clerk log availability. That is not a legally defensible answer.

After WS18-F, the answer is: yes, provably, for 7 years, from the Convex audit log record alone. The `rsmAcknowledgmentAuditLog` record is a self-contained, denormalized, immutable record of who acknowledged what at what time. It contains the user's display name, role, certificate number, Clerk user ID, Clerk session ID, a SHA-256 hash of the exact RSM summary text that was presented, and a boolean confirming that the scroll-to-bottom gate was completed before the acknowledge button became active.

The SHA-256 of the summary text is the element I consider most valuable in a contentious scenario. If a mechanic claims they were shown a different version of the RSM than the one that contained the safety-critical change, the hash answers that claim. The hash on their acknowledgment record is either the hash of the current revision summary or it isn't. If it matches, the argument is over.

The insert-only schema (no delete or update mutation exposed for `rsmAcknowledgmentAuditLog`) provides the non-alteration property. The 7-year retention policy issued by Rachel Kwon (RSM-RETENTION-POLICY-V1) provides the retention obligation. The DOM must formally adopt that policy before the first revision is published.

I reviewed the `rsmAcknowledgmentAuditLog` entries generated during my VAL-G-07 test. They contain every field I would want. I also reviewed the DOM emergency bypass record (VAL-G-10) — it correctly records `isBypassRecord: true` and the bypass reason, so the audit trail distinguishes between a genuine acknowledgment and an AOG bypass. An inspector reviewing the log will see the difference.

**RSM acknowledgment defensibility assessment:** LEGALLY DEFENSIBLE. The `rsmAcknowledgmentAuditLog` table design is the right solution to this problem.

---

### 3.5 Marcus's Compliance Summary

All four compliance questions have affirmative answers:

| Compliance Property | Standard | Assessment |
|---|---|---|
| Cryptographic signature integrity | AC 120-78B non-repudiation requirements | SOUND |
| PDF export §43.9 compliance | 14 CFR §43.9(a)(1)-(4) | PASSES |
| IA re-auth adequacy | AC 120-78B OBJ-01 through OBJ-08 | SATISFIED |
| RSM acknowledgment legal defensibility | 14 CFR §145.209(e), RSM-RETENTION-POLICY-V1 | DEFENSIBLE |

I would present this compliance assessment in front of an FAA inspector without qualification. The system produces records that satisfy the regulatory requirements for which they are designed.

**Marcus Webb — Compliance Staging Check: COMPLETE**  
**Date: 2026-02-22**

---

## 4. Status

**WS18-B STATUS: STAGING VALIDATED**

| Validator | Result | Date |
|---|---|---|
| Cilla Oduya — Test Matrix | 89/89 PASS | 2026-02-22 |
| Rosa Eaton — Aviation Operational Review | RECOMMEND — deploy to production | 2026-02-22 |
| Marcus Webb — Compliance Check | All four compliance properties CONFIRMED | 2026-02-22 |

**Staging validation is complete. WS18-G (full production authorization) may now execute.**

---

*Filed: 2026-02-22 | Phase 18 — WS18-B Staging Validation + SME Acceptance | Athelon v1.1*  
*QA: Cilla Oduya | Aviation: Rosa Eaton | Compliance: Marcus Webb*
