# Phase 16 Final Gate Review — v1.1 Feature Build Sprint Authorization

**Date:** 2026-02-22  
**Gate Authority:** Phase Review Board + Marcus Webb (Compliance Final Authority)  
**Artifacts Reviewed:** 14 (WS16-A through WS16-N)  
**Prior Gate Reference:** `reviews/phase-16-gate-review.md` (conditional gate — GO WITH CONDITIONS, filed 2026-02-22)  
**Phase 15 Carry-Forward Controls:** CF-1 through CF-5 — final verification status below

---

## Gate Decision

> **VERDICT: GO WITH CONDITIONS**

All 14 Phase 16 build artifacts are present and have been evaluated for sprint-day readiness. The four thin artifacts identified in the prior conditional gate review (WS16-F, WS16-G, WS16-K, WS16-L) have completed full depth passes and are now rated sprint-ready by Rafael. Two compliance memos — CAL-POLICY-MEMO-V1 (WS16-F) and DISC-AUTH-LIABILITY-MEMO-V1 (WS16-L) — are drafted and identified for Marcus sign-off. They are not blockers to the sprint. They are blockers to specific production deployment gates within the sprint. The board authorizes sprint execution to begin Monday morning.

---

## Depth Pass Verification

The following workstreams were rated CONDITIONAL — DEPTH PASS REQUIRED in the prior gate review. The board confirms depth pass completion for each.

### WS16-F — Test Equipment Traceability Build

**Prior status:** THIN (~80 lines). No API contracts, no schema spec, no named test cases, no UAT script, cal-policy memo status unconfirmed.

**Post-depth pass:** The artifact now contains the complete `testEquipment` and `maintenanceRecordTestEquipmentLinks` table definitions with all fields, types, and indexes. Four primary mutations are fully specified to WS16-B/WS16-E depth: `registerTestEquipment`, `verifyCalibration`, `recordEquipmentUsage`, and `flagEquipmentExpired` (nightly cron). Twelve named test cases (TC-F-01 through TC-F-12) are written with input conditions, expected outputs, and regulatory basis. The Dale Purcell UAT script is scripted in 8 steps with explicit pass criteria. The Marcus compliance checklist names 5 hard blockers and 8 standard verification items.

**CAL-POLICY-MEMO-V1 status:** The memo is fully drafted in the artifact (Section 2). It establishes: what constitutes valid calibration evidence (5 cumulative requirements including NVLAP accreditation, NIST traceability, uploaded PDF, all fields populated); the expired-cal advisory-with-mandatory-documented-override policy and Marcus's rationale; override conditions (minimum 30-character explanation, IA or shop lead authorization, authorizer different from linking user); and the full override audit trail (maintenance record PDF, quarterly compliance report, frequency thresholds). **AWAITING MARCUS SIGNATURE.**

**Cilla confirms:** 12 named test cases exist. I can build and run them. TC-F-06 (snapshot immutability), TC-F-08 (quarantined absolute block), TC-F-03 (expired-cal block without override), and TC-F-10 (belt-and-suspenders signing gate) are the ones I will run with API bypass tests on Day 7.

**Rafael confirms:** Sprint-ready. Schema is complete. Mutations are specified to the level of throw codes and postconditions. A developer can write the `registerTestEquipment` mutation from the spec without ambiguity. The expired-cal branch instruction is clear: do not write it until Marcus signs. Everything else proceeds.

**Rosa Eaton confirms:** The avionics traceability requirement is met. The snapshot-at-use model (immutable cal state at time of linkage) is the correct approach. The quarantine absolute block is correct. The NVLAP accreditation prompt and the NIST traceability manual-attestation requirement (no auto-populate) are technically correct for FAA-regulated test equipment records.

**Post-depth status: READY FOR BUILD** (expired-cal branch gated on CAL-POLICY-MEMO-V1 signature)

---

### WS16-G — Qualification Alerts Build + Auth-Order Proof

**Prior status:** THIN (~65 lines). No API contracts, no data model spec, ordering proof not demonstrated, no named test cases, no UAT script.

**Post-depth pass:** The artifact now contains the `checkCertificationExpiry` scheduled action with full TypeScript (including per-org fan-out, dedupe key logic, severity tiers TH-90/TH-30/TH-07/TH-00, and routing table). The `validateTechnicianQualification` internal query and `applyQualificationGate` function are fully specified. The `initiateRTSSignOff` mutation is specified with explicit call-order enforcement: qualification check runs first (with comment banner "RUNS FIRST, ALWAYS"), audit event is written for the precheck before auth event is touched, auth event is consumed only on PASS or WARN, and the mutation throws before reaching `consumeSignatureAuthEvent` on BLOCK. Nine named test cases (TC-G-01 through TC-G-09) are written. Renata Solís's UAT script is scripted in 6 steps with named pass criteria. Marcus compliance checklist names hard blockers and standard verification items.

**QALERT-18 ordering proof:** Section 5 is the ordering proof. It specifies the 3-step call sequence, the problem statement (why consuming the auth event first creates an irreconcilable audit gap), and the test assertion: after a BLOCK result, the `signatureAuthEvent` record in the database must still show `status = pending` (not consumed). TC-G-05 is the implementation of this proof as an automated test. The test is writable from the spec.

**Cilla confirms:** TC-G-05 is exactly what I needed. Input state: expired tech, active auth token. Expected: mutation throws, auth event record status is still `pending` after the throw. Automatable via Convex test with pre/post state inspection. I will hold WS16-G PASS on TC-G-05 passing at the mutation level, not just the UI level.

**Rafael confirms:** Sprint-ready. The ordering proof is explicit and checkable. The data model is specified by reference to `qualificationProfiles`, `qualificationRequirements`, `qualificationAssignments`, and `qualificationAlertEvents` tables. The mutation logic is detailed enough to implement without design decisions being deferred to the developer.

**Marcus confirms:** The hard blocker I care most about is TC-G-05. An expired tech's auth event must not be consumed in a failed sign-off attempt. The mutation spec demonstrates this correctly. The `qualificationAssignments` snapshot includes `requirementVersion` and `evaluationReasons[]` — both required for audit admissibility. WS16-G is authorized for build.

**Post-depth status: READY FOR BUILD**

---

### WS16-K — Customer Portal Build

**Prior status:** THIN (~65 lines). No status projection mapping, no API contracts, no copy governance API spec, no named test cases, no UAT script.

**Post-depth pass:** The artifact now specifies the two-status-model architecture with full TypeScript schema additions: 23 `internalStatus` literals and 7 `customerFacingStatus` literals as independent fields on `workOrders`. The architectural rule (internal status never auto-mirrors to customer; coordinator is the deliberate bridge) is enforced in `setCustomerFacingStatus` mutation which gates "Ready for Pickup" on confirmed `RETURN_TO_SERVICE_SIGNED` internal status. The `portalTokens` table, `generateCustomerPortalToken` mutation, and `getPortalView` query are fully specified. The `buildCustomerPortalView` function explicitly excludes technician names, cert numbers, internalStatus, raw discrepancy text, QA findings detail, signature workflow state, and RTS details — the excluded field list is in the code. Eight named test cases (TC-K-01 through TC-K-08) are written. Danny Osei's UAT script is scripted in 7 steps. Carla Ostrowski's concern (explicit coordinator gate) is addressed in the architecture and the "Ready for Pickup" safety gate mutation.

**Wording governance:** AOG terminology isolation is fully specified: `isPriorityRecoveryActive: true` and `priorityMessage: "Aircraft Awaiting Critical Parts — our team is working to expedite"` — the word "AOG" is absent from every customer-facing field. TC-K-06 verifies this.

**No Marcus compliance review required** for this stream (non-regulatory feature per artifact self-designation, confirmed by Marcus).

**Cilla confirms:** TC-K-03 (status isolation) and TC-K-05 ("Ready for Pickup" safety gate) are the ones that will catch implementation errors. Both are automatable via direct mutation test. 8 test cases are writable from the spec.

**Rafael confirms:** Sprint-ready. The status projection model is complete. The `buildCustomerPortalView` function is specified to the level where a developer can implement it by translating the spec to code. The real-time push architecture (Convex reactive query, no polling) is correctly specified.

**Carla Ostrowski:** The dual-track model is what I asked for. Customer status is never auto-updated by internal transitions. The coordinator tab on the WO detail view shows both tracks simultaneously — that's the design I need. Authorized.

**Post-depth status: READY FOR BUILD**

---

### WS16-L — Discrepancy Customer Authorization Flow Build

**Prior status:** THIN (~60 lines). No state machine, no consent record schema, no API contracts, Marcus liability sign-off not sought.

**Post-depth pass:** The artifact now specifies the complete state machine with 9 named states (DRAFT_INTERNAL, READY_TO_SEND, SENT_PENDING_CUSTOMER, VIEWED_PENDING_CUSTOMER, APPROVED, DECLINED, EXPIRED_NO_RESPONSE, WITHDRAWN_SUPERSEDED, CANCELLED_ADMIN) and all transition guards. The `discAuthRequests` table schema is complete with all fields, types, and 4 indexes. The `requestCustomerAuthorization`, `recordCustomerAuthorization`, and `getAuthorizationStatus` mutations are fully specified with throw codes. The authorization email template is written with all required elements (specific discrepancy description, cost range, authorizing party identification, consequence of decline, explicit non-airworthiness disclaimer). The 48-hour timeout cron and 24-hour reminder are specified. Eight named test cases (TC-L-01 through TC-L-08) are written. Danny Osei's UAT script is scripted in 7 steps including the dispute defense scenario and the timeout path. **DISC-AUTH-LIABILITY-MEMO-V1 is fully drafted in the artifact (Section 2). AWAITING MARCUS SIGNATURE.**

**DISC-AUTH-LIABILITY-MEMO-V1 status:** The memo establishes: the legal exposure when shops perform work without documented authorization; what documentation is legally sufficient (5 requirements: specific discrepancy, cost range, authorizing party identity, timestamp, non-repudiation); legal characterization of the email click-to-approve mechanism (E-SIGN Act / UETA compliant, superior to verbal authorization); and Marcus's four production gate conditions (required template elements, consent record schema, re-authorization on material scope change, structured assisted-phone path). **AWAITING MARCUS SIGNATURE.**

**Cilla confirms:** TC-L-01 (mechanic block during pending auth) and TC-L-07 (full audit trail hash verification) are the critical ones. TC-L-06 (scope change supersede, not in-place edit) confirms the immutability of prior consent records. All 8 are writable from the spec.

**Rafael confirms:** Sprint-ready for all internal components. The state machine is explicitly documented. The `enforceAuthorizationGate` function is specified and can be integrated into task-step mutations. The consent record capture (IP address, session ID, consent text hash) is architecturally sound — IP is passed from the HTTP API handler, not the client.

**Marcus's pre-signature position:** The memo I drafted for this stream (Section 2) reflects what I needed to say about this liability surface before spec was written. The email template includes the non-airworthiness disclaimer I required ("Authorizing this repair does not constitute a technical release or airworthiness determination"). The scope change re-authorization trigger is in the schema design (supersede, not in-place edit). I will sign the memo before the customer-facing approval URL is deployed. The coordinator-side build (discrepancy queue, request creation, 48-hour timeout, internal state machine) can proceed before my signature.

**Rosa Eaton confirms:** The authorization flow is aviation-accurate. Customer declining does not produce an airworthiness determination from the system. The system correctly records it as an unaddressed discrepancy with the declined status in the maintenance record, leaving the airworthiness assessment to certificated personnel. The email template explicitly states this. Good.

**Post-depth status: READY FOR BUILD** (customer-facing approval surface gated on DISC-AUTH-LIABILITY-MEMO-V1 signature)

---

## Final Per-Stream Readiness Table

| Stream | Feature | Prior Status | Post-Depth Status | Sprint Ready? |
|---|---|---|---|---|
| WS16-A | Offline Trust-Boundary Spikes (DS-1/DS-2) | READY FOR BUILD (DEEP) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-B | IA Re-Auth Build + AC 120-78B Proof | READY FOR BUILD (ADEQUATE) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-C | PDF Export Build + §43.9 CI Regression | READY FOR BUILD (DEEP) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-D | Form 337 UI Build | READY FOR BUILD (DEEP) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-E | LLP Dashboard Build | READY FOR BUILD (ADEQUATE) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-F | Test Equipment Traceability Build | CONDITIONAL — DEPTH PASS REQUIRED | READY FOR BUILD (full depth pass complete) | ✅ YES — All except expired-cal branch (awaits Marcus sig) |
| WS16-G | Qualification Alerts Build + Auth-Order Proof | CONDITIONAL — DEPTH PASS REQUIRED | READY FOR BUILD (ordering proof demonstrated in spec) | ✅ YES — Depends on WS16-B ordering proof in production |
| WS16-H | Pre-Close Checklist Build | CONDITIONAL (self-declared, WS16-B/C integrations pending) | Unchanged — CONDITIONAL | ✅ YES — Core engine builds now; B/C integration hooks are feature-flagged |
| WS16-I | Multi-Aircraft Task Board Build | READY FOR BUILD (ADEQUATE) | Unchanged — READY FOR BUILD | ✅ YES — Start immediately |
| WS16-J | RSM Read-and-Acknowledge Workflow Build | READY FOR BUILD (DEEP) | Unchanged — READY FOR BUILD (HB-1..HB-4 pre-production) | ✅ YES — Phase 1 build proceeds; HBs close before first production publish |
| WS16-K | Customer Portal Build | CONDITIONAL — DEPTH PASS REQUIRED | READY FOR BUILD (full depth pass complete) | ✅ YES — Depends on WS16-C complete for portal token delivery |
| WS16-L | Discrepancy Authorization Flow Build | CONDITIONAL — DEPTH PASS REQUIRED | READY FOR BUILD (full depth pass complete; memo drafted) | ✅ YES — Internal state machine builds now; customer-facing surface awaits Marcus sig |
| WS16-M | Integrated Packet Proof + Seam Verification | GATE TEMPLATE FILED | Gate template ready — proceeds after A..L pass | ⏳ Awaits upstream PASS |
| WS16-N | Phase 16 Regression Suite + Release Readiness | FINAL RUBRIC FILED | Final rubric ready — proceeds after WS16-M PASS | ⏳ Awaits WS16-M PASS |

**Summary:** 12 streams authorized for immediate sprint build. 2 streams (WS16-M, WS16-N) proceed per their dependency chain. All streams are sprint-ready; 2 have production-gated features pending Marcus signature.

---

## Marcus Webb Compliance Sign-Off Record

Two items require Marcus Webb's physical signature before production deployment of specific features. Both memos are drafted. Sprint build is not blocked. Production deployment of the referenced features is blocked until signature is obtained and confirmed.

---

### 1. CAL-POLICY-MEMO-V1 (WS16-F — Test Equipment Traceability)

**Document location:** WS16-F artifact, Section 2  
**Document subject:** Test Equipment Calibration Evidence Policy — Valid Evidence, Override Conditions, and Audit Requirements  
**What it covers:**
- Definition of valid calibration evidence (5 cumulative requirements: current certificate, NVLAP/ISO 17025 accredited lab, manually attested NIST traceability, uploaded certificate PDF, all required fields populated)
- Policy ruling on expired calibration: advisory with mandatory documented override (not hard block at mutation level), with Marcus's rationale that hard-blocking creates pressure to use undisclosed equipment rather than documenting the exception transparently
- Override conditions: minimum 30-character explanation addressing why the equipment was used and what interim validity evidence exists; authorized by IA or shop lead; authorizer must be a different user from the linking technician
- Override audit trail: maintenance record PDF flagged amber, quarterly QA compliance report, override frequency dashboard (>2/technician/quarter triggers QA review; >5/shop/month triggers Marcus/compliance review)
- Reserved right to upgrade to hard block after reviewing v1.1 usage patterns
- Regulatory basis: 14 CFR §43.9(a)(2), Part 43 Appendix E, §91.411/§91.413, Part 145.109(a), AC 43-9C §6

**Production gate condition:** The `recordEquipmentUsage` mutation's expired-cal branch — the code path that accepts `expiredCalOverride` as an argument and creates a link record with `calStatusAtUse = "expired"` — must not be merged to main until Marcus Webb's signed copy of CAL-POLICY-MEMO-V1 is on file. All other WS16-F code (equipment registration, calibration verification, non-expired linkage, daily cron, PDF export section) may proceed to build and merge without the signature.

**Code constant reference:** `CAL_POLICY_MEMO_REF = "CAL-POLICY-MEMO-V1"` appears in `recordEquipmentUsage` and `verifyCalibration` mutations; must match the signed document ID.

---

### 2. DISC-AUTH-LIABILITY-MEMO-V1 (WS16-L — Discrepancy Customer Authorization Flow)

**Document location:** WS16-L artifact, Section 2  
**Document subject:** Shop Liability Exposure on Unauthorized Maintenance Scope — What Constitutes Sufficient Authorization and What the Email Click-to-Approve Constitutes Legally  
**What it covers:**
- Shop liability exposure analysis: civil liability for repair cost, regulatory exposure under Part 43/Part 145, Part 91 owner authorization requirements, and insurance implications when additional maintenance scope is not documented
- Legally sufficient documentation requirements: specific discrepancy identified (not generic "additional work"), estimated cost range presented and authorized in context, authorizing party identified (owner/operator/documented agent), timestamp proving authorization preceded work, non-repudiable documentation
- Legal characterization of email click-to-approve: constitutes a valid electronic signature under 15 U.S.C. §7001 (E-SIGN Act) and state UETA provisions, provided customer had opportunity to review the authorization text, the text clearly states what is being approved and the cost range, the click is logged with sufficient identity evidence (email address delivery plus IP timestamp), and the customer had option to decline or request clarification. Characterized as legally superior to verbal phone authorization and functionally equivalent to an email reply stating "I approve."
- What the authorization is NOT: not a guarantee of payment, not a technical release authority, not a substitute for re-authorization when new findings materially change scope
- Marcus's four production gate conditions: authorization request template includes all required elements; consent record schema captures IP, timestamp, email identity, and exact rendered text hash; system re-requires authorization on material scope changes (cost delta > configured threshold or new safety-relevant findings); assisted-phone path is structured and documented (not free-text)

**Production gate condition:** The customer-facing authorization surface — the tokenized URL (`https://portal.athelon.app/auth/[token]`) and the `recordCustomerAuthorization` mutation that records click-to-approve decisions — must not be deployed to production until Marcus Webb's signed copy of DISC-AUTH-LIABILITY-MEMO-V1 is on file. The internal components — `requestCustomerAuthorization` mutation, coordinator review queue, `discAuthRequests` state machine, 48-hour timeout cron, `getAuthorizationStatus` query — may proceed to build and staging deployment without the signature.

**Code constant reference:** `DISC_AUTH_LIABILITY_MEMO_REF = "DISC-AUTH-LIABILITY-MEMO-V1"` appears in `recordCustomerAuthorization` and the `transitionLog` policyVersion field; must match the signed document ID.

---

**Note:** Both memos are drafted at production-quality depth in their respective build artifacts. The content reflects Marcus's compliance judgments as documented. Signature is a formal attestation step, not a content development step. Marcus's target: both memos signed by end of Phase 16 Week 1, in time for the Wave 2 build streams that implement the gated branches.

---

## Sprint Wave Execution Plan

### Wave 1 — Start Monday Morning (No Upstream Dependencies Outstanding)

| Stream | Feature | Primary Owners | Day 1 Action |
|---|---|---|---|
| WS16-A | Offline Trust-Boundary Spikes (DS-1/DS-2) | Tanya Birch + Devraj Anand + Jonas Harker | Begin IDB schema migration and DS-1 sync-on-reconnect spike. Jonas: Browser Sync API device matrix by Week 1. Tanya: Clerk PWA token check by Week 1. |
| WS16-B | IA Re-Auth Build | Jonas Harker + Marcus Webb | Build `validateIaCurrencyBeforeModal` and `consumeIaAuthAndSignRts` mutations. Dale Renfrow UAT scheduled for Sprint Day 6. |
| WS16-C | PDF Export Build | Devraj Anand + Jonas Harker | Begin Gotenberg integration and §43.9 9-section PDF template. CI regression test harness setup. Carla Ostrowski cold test scheduled. |
| WS16-D | Form 337 UI Build | Chloe Park + Finn Calloway + Devraj Anand | Schema migration (Day 1), `setRepairClassification` and `attachForm337` mutations (Days 1-2), `Form337Banner` component (Days 2-3). Renata Vasquez UAT Day 8. |
| WS16-E | LLP Dashboard Build | Devraj Anand + Nadia Solis + Chloe Park | `componentLifecycleEvents` and `llpStatus` schema migration. `setLLPOpeningBalance` and `addComponentLifecycleEvent` mutations. Erik Holmberg + Nate Cordova UAT scheduled. |
| WS16-I | Multi-Aircraft Task Board Build | Chloe Park + Finn Calloway + Devraj Anand | `TaskBoard`, `TaskBoardLane`, `TaskBoardCard`, `TaskBoardEvent` schema. `moveTaskBoardCard` mutation with seq enforcement. Dale Purcell + Danny Osei UAT scheduled. |
| WS16-J (Phase 1) | RSM Acknowledgment Workflow | Devraj Anand + Chloe Park | `rsmRevisions` table, `publishRsmRevision`, `acknowledgeRsmRevision`, `<RsmAcknowledgmentGate>` component, Next.js middleware. HB-1..HB-4 resolution plan starts Day 1. Rachel Kwon UAT in staging. |

---

### Wave 2 — After WS16-B Ordering Proof Demonstrated (Estimated: Sprint Week 2)

| Stream | Feature | Primary Owners | Dependency |
|---|---|---|---|
| WS16-F | Test Equipment Traceability | Devraj Anand + Dale Purcell | WS16-B auth-ordering proof in production code; CAL-POLICY-MEMO-V1 signed. Build non-expired-cal components immediately; expired-cal branch awaits Marcus sig. |
| WS16-G | Qualification Alerts | Devraj Anand + Renata Solís | WS16-B `consumeSignatureAuthEvent` infrastructure available. `initiateRTSSignOff` ordering proof integration. TC-G-05 is the critical test. |

**Wave 2b — After WS16-C Complete:**

| Stream | Feature | Primary Owners | Dependency |
|---|---|---|---|
| WS16-K | Customer Portal | Chloe Park + Finn Calloway + Devraj Anand | WS16-C complete (PDF token delivery). Two-status schema migration. `generateCustomerPortalToken` and `getPortalView`. Danny Osei + Carla Ostrowski UAT. |
| WS16-H | Pre-Close Checklist | Devraj Anand + Chloe Park + Danny Osei | Core engine (`evaluatePreCloseChecklist` action, `submitCloseWithPreCloseToken` mutation) builds now. WS16-B and WS16-C integration hooks activate when those streams are complete. Danny Osei UAT. |

**Wave 2c — After WS16-K Complete:**

| Stream | Feature | Primary Owners | Dependency |
|---|---|---|---|
| WS16-L | Discrepancy Authorization Flow | Devraj Anand + Danny Osei | WS16-K portal (approval cards in portal view). Internal state machine builds immediately. Customer-facing approval URL awaits DISC-AUTH-LIABILITY-MEMO-V1 signature. Danny Osei UAT. |

---

### Wave 3 — Integration and Release (After All A..L Pass)

| Stream | Feature | Primary Owners | Dependency |
|---|---|---|---|
| WS16-M | Integrated Packet Proof + Seam Verification | Cilla Oduya + Jonas Harker + Marcus Webb | WS16-A..WS16-L all PASS with sign-offs. 8-seam matrix executed. CF-1..CF-4 verified with admissible evidence. |
| WS16-N | Phase 16 Regression Suite + Release Readiness | Cilla Oduya + Nadia Solis + Rosa Eaton | WS16-M PASS. Rosa Eaton operational validation. Weighted rubric score ≥ 90/100. All hard gates YES. |

---

## Phase 15 Carry-Forward Controls — Final Verification

All five Phase 15 carry-forward controls are verified as addressed across the full 14-artifact set, including the depth-pass artifacts.

**CF-1 — Fail-closed on pending-signature/offline ambiguity**

Addressed in: WS16-A (§5.6 RTS gate proof — pending offline signature = unsigned step in DB = RTS blocked; mathematical proof present), WS16-B (RTS_ALREADY_SIGNED throw code; no duplicate signing path), WS16-F (equipment in `pending_cal_verification`, `quarantined`, `sent_for_calibration` status returns hard-block error with no override path), WS16-G (BLOCK result from qualification check returns error before auth event is touched; auth event status remains `pending`), WS16-K (`setCustomerFacingStatus("Ready for Pickup")` throws if internal RTS not confirmed), WS16-L (`enforceAuthorizationGate` throws if any pending auth request exists; mechanic cannot advance dependent task steps). **VERIFIED — fail-closed principle is architecturally enforced across all streams that handle pending state.**

**CF-2 — Qualification precheck-before-auth-consume ordering**

Addressed in: WS16-B (IA currency validation runs in `validateIaCurrencyBeforeModal` before any auth event is created), WS16-G (Section 5 ordering proof: `validateTechnicianQualification` is Step 1; precheck audit event is logged as Step 1a; `consumeSignatureAuthEvent` is Step 2 — only reached on PASS/WARN; code includes comment banner "RUNS FIRST, ALWAYS"; TC-G-05 is the automatable proof test). WS16-M (CF-2 mandatory seam verification: B×G seam must demonstrate ordering trace proof). **VERIFIED WITH ADMISSIBLE PROOF — WS16-G Section 5 is the QALERT-18 equivalent; the proof is written and testable.**

**CF-3 — Signed calibration policy memo and deterministic override audit**

Addressed in: WS16-F (CAL-POLICY-MEMO-V1 is fully drafted in Section 2 with complete policy content; the expired-cal behavior is deterministic — advisory not hard block, specific override conditions, specific audit trail); the expired-cal branch is production-gated on Marcus signature; the override frequency dashboard is specified with numeric thresholds (>2/tech/quarter, >5/shop/month). **VERIFIED at design level. Production gate enforced. Marcus signs before expired-cal branch merges.**

**CF-4 — Hash-manifest verification and reproducible integrity recompute**

Addressed in: WS16-A (hash integrity chain in sync protocol; DS1-C6 hash verification; IDB integrity proofs in §5), WS16-C (SHA-256 of full record JSON + PDF stored on document face; CI-REG-03 enforces on every deploy), WS16-D (Form 337 data included in SHA-256 hash input for signed task card record; verified in MWC-D-05), WS16-F (TC-F-06 confirms snapshot immutability — cal fields in link records never updated after creation), WS16-J (session token captured server-side in Convex mutation; client cannot supply or forge it), WS16-K (customerFacingStatusHistory is append-only; audit event `CUSTOMER_STATUS_UPDATED` emitted on each transition), WS16-L (consentRecord.consentTextHash is SHA-256 of the exact text rendered to the customer; TC-L-07 verifies hash against reconstructed consent text), WS16-M (CF-4 is mandatory verification item in the integrated proof packet). **VERIFIED — hash-manifest discipline is well-institutionalized across all record-producing streams.**

**CF-5 — QA and Regulatory concurrence mandatory before any control downgrade**

Addressed in: WS16-N hard gate section ("no open Marcus compliance red items" and "no open Cilla critical severity defects" are hard gates that override the numeric score); WS16-M (requires Marcus compliance attestation section and Cilla QA admissibility statement before the integrated packet is accepted); no artifact in the Phase 16 set contains a downgrade, bypass, or exception pathway to any of the four preceding controls that does not require both Marcus and Cilla sign-off. **VERIFIED — control downgrade is architecturally blocked across the artifact set.**

---

## Final Ruling

**VERDICT: GO WITH CONDITIONS**

The sprint team is authorized to begin execution Monday morning. The depth pass conditions from the prior conditional gate are resolved. The two compliance memos are drafted and in the hands of their signatories. The sprint does not wait for signatures; it runs in parallel.

**What the engineering team does Monday morning, Sprint Day 1:**

- Devraj, Tanya, Jonas: WS16-A spike infrastructure — IDB schema migration, DS-1 sync protocol skeleton, Jonas opens Browser Sync API device support research
- Jonas, Marcus: WS16-B — `validateIaCurrencyBeforeModal` query and `consumeIaAuthAndSignRts` mutation. Dale Renfrow scheduled for Sprint Day 6 UAT
- Devraj, Jonas: WS16-C — Gotenberg integration, PDF section scaffold, CI-REG-01 harness
- Chloe, Finn, Devraj: WS16-D — schema migration first, then `Form337Banner` component skeleton
- Devraj, Nadia: WS16-E — LLP schema migration and `setLLPOpeningBalance` mutation
- Chloe, Finn, Devraj: WS16-I — task board schema, `moveTaskBoardCard` mutation with seq enforcement
- Devraj, Chloe: WS16-J Phase 1 — `rsmRevisions` table, `publishRsmRevision` mutation, `<RsmAcknowledgmentGate>` component scaffold
- Marcus: CAL-POLICY-MEMO-V1 review and signature target — end of Week 1
- Marcus: DISC-AUTH-LIABILITY-MEMO-V1 review and signature target — end of Week 1
- Cilla: test stubs for all TC series; begin TC-D-01..D-05, TC-E-01..E-06, TC-I-01..I-05 as parallel build output
- Tanya Birch: Clerk PWA token refresh check — Week 1 deliverable per prior gate Condition 7
- Jonas Harker: Browser Sync API device support matrix — Week 1 deliverable per prior gate Condition 6

**Standing production gate conditions (not sprint blockers):**

1. CAL-POLICY-MEMO-V1 signed by Marcus before WS16-F expired-cal branch merges to main
2. DISC-AUTH-LIABILITY-MEMO-V1 signed by Marcus before WS16-L customer-facing approval URL deploys to production
3. WS16-J HB-1 (Clerk log retention), HB-2 (data retention policy), HB-3 (RSM quick access link), HB-4 (DOM emergency override) — all four resolved before the first RSM revision is published to the production tenant

---

## Miles Beaumont — Dispatch Closing Note

The first conditional gate said the right things honestly: the skeleton was right, the depth was missing, go fix it. The depth passes delivered. WS16-F went from an 80-line planning memo to a full calibration traceability system with twelve test cases, a complete schema, and a drafted policy memo that Marcus can actually sign. WS16-G now has a formal ordering proof — the hardest technical requirement in the feature set, the one that guarantees an expired mechanic's authentication token cannot be consumed in a failed signing attempt — written down in executable form before a single line of implementation code is written. WS16-K has a customer portal architecture where the coordinator's deliberate act of setting customer status is a feature, not a bug: two independent status tracks, Carla's conflict resolution, Convex reactivity delivering the update to the customer's screen the moment the coordinator clicks save. WS16-L has the state machine, the consent schema, the email template, the hash, and Marcus's legal characterization of what a customer clicking "Approve" in their inbox actually means. The people who built this phase are Dale Purcell in Henderson saying a calibration field in a notes column is not a record; Danny Osei in Manassas chasing authorization on sticky notes; Renata Vasquez in Corpus Christi watching amber badges turn blue. Phase 16 is the engineering response to what those people said. The sprint starts Monday. Build it.

---

*Filed: 2026-02-22 | Phase 16 Final Gate Review | Athelon v1.1 Sprint Authorization*

*Signed by the Phase Review Board:*  
*Cilla Oduya — QA Lead (test plan adequacy final authority)*  
*Marcus Webb — Regulatory/Compliance (compliance final authority; memo sign-off pending)*  
*Rafael — Engineering Lead (implementation spec precision final authority)*  
*Rosa Eaton — Aviation SME (aviation accuracy final authority)*  
*Miles Beaumont — Gate Record (closing dispatch)*
