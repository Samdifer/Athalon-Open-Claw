# Phase 16 Gate Review — v1.1 Feature Build Execution

**Date:** 2026-02-22  
**Gate Authority:** Phase Review Board — Engineering (Rafael), QA (Cilla Oduya), Regulatory (Marcus Webb), Aviation SME (Rosa Eaton)  
**Closing Dispatch:** Miles Beaumont  
**Artifacts Reviewed:** 14 (WS16-A through WS16-N)  
**Phase 15 Carry-Forward Controls Verified:** 5 of 5 addressed (see §4)

---

## Gate Decision

> **VERDICT: GO WITH CONDITIONS**

Phase 16 build execution is authorized to proceed. The two critical-path unlocking workstreams (WS16-A offline spikes, WS16-B IA re-auth) are both demonstrably READY FOR BUILD at a depth that the board considers exceptional. The core regulatory build streams (WS16-C, WS16-D, WS16-E, WS16-I, WS16-J) are sprint-ready. Four workstreams — WS16-F, WS16-G, WS16-K, WS16-L — are present but materially thin: they are **not sprint-ready** in their current form and require named depth passes before a build team can begin work on those specific lanes. Conditions are enumerated in §7. The engineering team may begin Monday on the streams rated READY FOR BUILD; thin streams must be deepened in parallel, not held in place.

---

## §1 — Readiness Sweep: Per-Artifact Adjudication

Line counts are approximate based on content density. The 150-line threshold is applied conservatively — a 100-line artifact with complete API contracts, named-SME UAT, and automatable test matrix is treated differently from a 100-line artifact with only a scope bullet list.

| Workstream | Est. Lines | Impl Spec | Test Plan | Compliance | UAT Script | Depth | Gate Status |
|---|---|---|---|---|---|---|---|
| WS16-A Offline Spikes | ~520 | ✅ Full schema + pseudo-code + proofs | ✅ 26 TCs (DS-1 + DS-2), all graded by criticality | ✅ All 5 Marcus hard blocks cited | ✅ Cilla coverage outline with build-authorization gate | DEEP | **READY FOR BUILD** |
| WS16-B IA Re-Auth | ~80 | ✅ 4 API contracts with throw codes | ✅ 10-item Cilla test matrix | ✅ 5-item Marcus checklist | ✅ Dale Renfrow, 6-step, named pass condition | ADEQUATE | **READY FOR BUILD** |
| WS16-C PDF Export | ~510 | ✅ 9-section template fully specified, Gotenberg choice justified, sequencing plan | ✅ 8 CI regression tests + 6 full TCs including Carla day-one cold test (47 assertions) | ✅ 16-item Marcus checklist, all hard blockers named | ✅ Carla Ostrowski, fully scripted end-to-end | DEEP | **READY FOR BUILD** |
| WS16-D Form 337 | ~400 | ✅ Badge state machine, multi-step form (5 steps), RTS block UX, field validation rules | ✅ 5 TCs with automatable assertions; API bypass test included | ✅ 11-item Marcus checklist, 5 hard blockers named | ✅ Renata Vasquez, 5-step UAT incl. server-side bypass test | DEEP | **READY FOR BUILD** |
| WS16-E LLP Dashboard | ~100 | ✅ 5 mutation/query contracts with throw codes | ✅ 10-item test matrix | ✅ 5-item checklist present | ✅ Erik Holmberg + Nate Cordova, 7-step, named pass condition | ADEQUATE | **READY FOR BUILD** |
| WS16-F Test Equipment | ~80 | ⚠️ Scope bullet list; no concrete API contracts, no schema spec | ⚠️ Blocker/PASS criteria listed; no named test cases | ⚠️ Carry-forward list only; cal-policy memo status unconfirmed | ⚠️ Dale Purcell + Teresa Varga named but no UAT script written | THIN | **CONDITIONAL — DEPTH PASS REQUIRED** |
| WS16-G Qual Alerts | ~65 | ⚠️ Scope bullet list; no API contracts, no data model spec | ⚠️ Blocker/PASS criteria listed; no named test cases | ⚠️ Carry-forward list only; ordering proof not demonstrated | ⚠️ Renata Solís named; no UAT script written | THIN | **CONDITIONAL — DEPTH PASS REQUIRED** |
| WS16-H Pre-Close | ~150 | ✅ 2 API contracts with throw codes, UI behaviors specified | ✅ 10-item Cilla matrix | ✅ 4-item checklist present | ✅ Danny Osei, 7-step, named pass condition | ADEQUATE | **CONDITIONAL** (per self-declaration; WS16-B/C integrations pending) |
| WS16-I Task Board | ~125 | ✅ 4 API contracts with throw codes, event model specified | ✅ 10-item Cilla matrix | ✅ 3-item compliance checklist | ✅ Dale Purcell + Danny Osei, 6-step, named pass condition | ADEQUATE | **READY FOR BUILD** |
| WS16-J RSM Ack | ~520 | ✅ Full schema with TypeScript, 3 mutations fully implemented in spec, middleware spec | ✅ 6 TCs with full test code examples, additional Vitest unit tests listed | ✅ 4 hard blockers explicitly named (HB-1..HB-4) with owners; 6.1–6.4 Marcus compliance sections | ✅ Rachel Kwon, 8-step, detailed pass criteria | DEEP | **READY FOR BUILD** (with 4 pre-production blockers — see §7 Condition 5) |
| WS16-K Customer Portal | ~65 | ⚠️ Scope bullet list; no API contracts, no status projection schema | ⚠️ Blocker/PASS criteria listed; no named test cases | ⚠️ Carry-forward list only; wording governance not demonstrated | ⚠️ Danny Osei + Carla Ostrowski named; no UAT script | THIN | **CONDITIONAL — DEPTH PASS REQUIRED** |
| WS16-L Discrepancy Auth | ~60 | ⚠️ Scope bullet list; no state machine diagram/table, no API contracts | ⚠️ Blocker/PASS criteria listed; no named test cases | ⚠️ Carry-forward list only; Marcus liability sign-off not obtained | ⚠️ Danny Osei named; no UAT script | THIN | **CONDITIONAL — DEPTH PASS REQUIRED** |
| WS16-M Integrated Proof | ~65 | N/A — Template | N/A — Template | ✅ CF-1..CF-4 enumerated | N/A — Template | TEMPLATE | **GATE TEMPLATE FILED** ✅ |
| WS16-N Release Readiness | ~55 | N/A — Template | N/A — Template | ✅ Hard gate criteria enumerated | N/A — Template | TEMPLATE | **GATE TEMPLATE FILED** ✅ |

**Summary counts:** 7 READY FOR BUILD · 4 CONDITIONAL (DEPTH PASS REQUIRED) · 1 CONDITIONAL (self-declared, dependency-gated) · 2 GATE TEMPLATE FILED

---

## §2 — Critical Path Assessment

### WS16-A (Offline Trust-Boundary Spikes) — READY FOR BUILD ✅

**Rafael's judgment:** WS16-A is one of the most thoroughly specified spike artifacts the board has reviewed at any phase. DS-1 and DS-2 are both executed to the level of deterministic outcome tables, formal proofs (atomicity theorem, concurrent-replay theorem, IDB guard proof), pseudo-code with line-level annotation, and 5-failure-mode analysis. The implementation feasibility table is complete. Two bounded carry-forwards remain (Jonas Harker device support matrix; Tanya Birch Clerk PWA token check) — both are correctly scoped as research/verification items that do not block the IDB schema, Convex mutations, or UI build. The spec is sufficient to begin writing code on Monday.

**Cilla's judgment:** The test coverage outline in §6 is the correct level of specificity. Twenty-six named test cases, graded by criticality, with tool assignments and input/output specification. The build-authorization gate in §6.4 is concrete: test harness must exist before build begins. I will hold that line. The carry-forward to WS15-D tests (TC-D-01..TC-D-12) is appropriate — those are not superseded, they carry forward. DS-1 and DS-2 pass from a test-plan standpoint.

**Marcus's judgment:** All five Phase 15 hard blocks from WS15-D §Compliance are cited in this artifact. The deliberateness standard (FAA Order 8300.10 Ch. 9 §9-48) is addressed by the `clientTimestamp`-as-deliberate-act argument. The auth event atomicity proof (§5.3) satisfies the AC 120-78B §4 per-signature auth requirement. The `capturedOffline` immutability proof satisfies the tamper-evidence requirement. DS-1 is authorized. DS-2 is authorized with the one bounded Clerk token open item.

**WS16-A Critical Path Status: READY FOR BUILD — build begins immediately.**

---

### WS16-B (IA Re-Auth Build) — READY FOR BUILD ✅

**Rafael's judgment:** WS16-B is compact (~80 lines) but the board regards it as adequate for its scope. The four API contracts have concrete argument types and throw codes. The build module list names specific files. The IA currency pre-gate (`validateIaCurrencyBeforeModal`) and the atomic consume-and-sign mutation (`consumeIaAuthAndSignRts`) are the two load-bearing pieces, and both are specified to the level of argument/return shape. The biometric-only rejection at the server layer (not just UI) is explicit and correctly positioned.

**Cilla's judgment:** The 10-item test matrix covers all the paths I need: happy path, duplicate event consumption, wrong table, biometric attempt, expiry, concurrent dual-submit, timeout, and committed record view. The "concurrent dual submit" case (B-08) is the one I most want to see pass. I can build these tests from what's here. Adequate.

**Marcus's judgment:** The compliance checklist includes AC 120-78B §4 and §5, the 14 CFR §43.9(a)(4) and §43.11 field separation requirement, and the biometric-only server rejection. The signed RTS immutability requirement is stated. This is sufficient for build authorization. I will do a compliance walk-through of the deployed code before the stream is marked PASS.

**Rosa Eaton's judgment:** The Dale Renfrow UAT script addresses what I need to see from an aviation operations standpoint: the IA sees the full certification summary before the PIN field is active, the 5-second dwell timer is enforced, and the committed record view shows the IA number separately from the A&P number. The "interrupted network after PIN submit" branch produces a deterministic outcome with no duplicate signing path. That is the scenario that causes problems in the field. It's handled here.

**WS16-B Critical Path Status: READY FOR BUILD — WS16-F and WS16-G are unblocked by WS16-B once implementation is complete and ordering proof is demonstrated.**

---

## §3 — Compliance Verification: Phase 15 Carry-Forward Controls

The following five controls were established as Phase 16 authorization constraints in the Phase 15 gate review. The board verifies each:

**CF-1 — Fail-closed on pending-signature/offline ambiguity**

→ Addressed in WS16-A §2.3 (RTS gate proof §5.6), WS16-B (RTS_ALREADY_SIGNED throw code, no duplicate signing path), WS16-F (explicitly carried forward as release blocker), WS16-G (carry-forward stated), WS16-K (carry-forward stated), WS16-L (carry-forward stated). Primary implementation in WS16-A. The `initiateReturnToService` mutation proof (§5.6) demonstrates that a pending offline signature = unsigned step in DB = RTS blocked. This is mathematically tight. **VERIFIED.**

**CF-2 — Qualification precheck-before-auth-consume ordering**

→ WS16-B carries this as a design property (IA currency validation runs before modal opens, before any auth event is created). WS16-G is the primary closure lane for this control and explicitly lists "precheck-before-auth consume" as a carry-forward requirement and a release blocker. The ordering proof (QALERT-18 equivalent) is listed in WS16-G's release blockers section as a blocking item. **VERIFIED as addressed at design level; execution proof (QALERT-18) required as a WS16-G exit criterion before that stream can be marked PASS.** Condition 3 below names this.

**CF-3 — Signed calibration policy memo and deterministic override audit**

→ WS16-F explicitly carries this as a blocking item: "Signed cal-policy memo (`ws15-f-cal-policy-memo-v1.md`) for expired-cal branch finalization" is listed as a hard dependency, and "Marcus memo unsigned or ambiguous on expired-cal policy" is the first release blocker. The memo is referenced as a required artifact. **VERIFIED as addressed at the blocking-dependency level. The memo must be signed by Marcus before WS16-F build can begin.** Condition 2 below names this.

**CF-4 — Hash-manifest + retrieval verification for integrated export packet**

→ WS16-A (§2.3 DS1-C6, hash integrity chain; §5 schema proofs), WS16-C (SHA-256 of record JSON + PDF artifact stored and printed in full on document face; CI-REG-03 enforces this on every deploy), WS16-J (session token capture server-side), WS16-K (carry-forward stated), WS16-L (carry-forward stated), WS16-M (CF-4 is a mandatory verification item in the integrated proof packet). **VERIFIED. The control is well-institutionalized across streams.**

**CF-5 — QA + Regulatory concurrence mandatory before any control downgrade**

→ WS16-N hard gate section explicitly requires "no open Marcus compliance red items" and "no open Cilla critical severity defects" as hard gate prerequisites for the GO verdict. WS16-M requires Marcus compliance attestation section and Cilla QA admissibility statement before the integrated proof packet is accepted. No downgrade path exists in any of the reviewed artifacts. **VERIFIED.**

---

## §4 — SME UAT Coverage

### Concrete, Named-SME UAT Scripts ✅
The following workstreams have fully scripted UAT with named SMEs, step-by-step instructions, and documented pass conditions:

| Workstream | SME(s) | Script Quality |
|---|---|---|
| WS16-B (IA Re-Auth) | Dale Renfrow | 6-step script, pass condition: "deliberate and defensible" + signed sheet |
| WS16-C (PDF Export) | Carla Ostrowski + Marcus Webb | Fully scripted day-one cold test, 47 assertions, Marcus in the room |
| WS16-D (Form 337) | Renata Vasquez | 5-step + bypass test, server-level enforcement verified, 9-criteria verdiction checklist |
| WS16-E (LLP Dashboard) | Erik Holmberg + Nate Cordova | 7-step, spreadsheet parity pass criterion named |
| WS16-H (Pre-Close) | Danny Osei | 7-step, pass condition: reduced review time + clear blocker/advisory separation |
| WS16-I (Task Board) | Dale Purcell + Danny Osei | 6-step, concurrent conflict + AOG tested, named pass condition |
| WS16-J (RSM Ack) | Rachel Kwon | 8-step UAT with per-step verification checkpoints, 8 explicit pass/fail fields |

### Generic or Missing UAT Scripts ⚠️
The following workstreams have named SMEs in headers but no written UAT scripts:

| Workstream | SME(s) Named | Gap |
|---|---|---|
| WS16-A (Offline Spikes) | No external field SME | This is an engineering spike, not a user-flow stream — acceptable. Cilla's internal coverage outline is the appropriate substitute. Troy Weaver should validate the sync UX before WS16-N. |
| WS16-F (Test Equipment) | Dale Purcell + Teresa Varga | Mentioned in build scope section; no script, no steps, no pass conditions beyond a bullet list |
| WS16-G (Qual Alerts) | Renata Solís | Named in header only; no UAT script exists |
| WS16-K (Customer Portal) | Danny Osei + Carla Ostrowski | Named only; no UAT script; these are the two SMEs who will have the most to say about wording governance and portal UX — their absence from the script is a gap |
| WS16-L (Discrepancy Auth) | Danny Osei | Named only; no UAT script; this is a liability-critical stream |

**Rosa Eaton's note:** WS16-F and WS16-L in particular concern me from a field accuracy standpoint. Avionics test equipment traceability has operational failure modes that Dale Purcell has seen in the hangar. And WS16-L is the flow where a customer authorizes work on a discrepancy — that interaction has real liability weight. Neither of these streams should proceed to build without a structured UAT conversation with their named SMEs. The names are in the headers; the conversations haven't been had. That needs to change before build.

---

## §5 — Build Sequencing Validation

The dependency chain is coherent. The board finds no circular dependencies. Analysis:

**Wave 1 — Immediate start (no upstream requirements outstanding):**
- WS16-A (offline spikes) — proceeds with Jonas device matrix as bounded carry-forward
- WS16-B (IA re-auth) — proceeds immediately
- WS16-C (PDF export) — proceeds immediately
- WS16-D (Form 337) — proceeds immediately
- WS16-E (LLP dashboard) — proceeds immediately
- WS16-I (task board) — proceeds immediately
- WS16-J (RSM ack) — Phase 1 build proceeds immediately; HB-1..HB-4 must close before production publish

**Wave 2 — Unlocked by WS16-B:**
- WS16-F (test equipment) — can begin depth pass and build once WS16-B ordering proof is demonstrated AND cal-policy memo is signed. Until then: depth-pass work proceeds in parallel.
- WS16-G (qual alerts) — same dependency pattern as WS16-F

**Wave 3 — Unlocked by WS16-C:**
- WS16-K (customer portal) — depth pass work begins immediately; build blocks on WS16-C complete

**Wave 4 — Unlocked by WS16-K:**
- WS16-L (discrepancy auth) — depth pass work begins immediately; build blocks on WS16-K

**Wave 5 — Unlocked by WS16-B + WS16-C integrations complete:**
- WS16-H (pre-close) — already marked CONDITIONAL; integration hooks for B and C unblock its final closure

**Wave 6 — Requires WS16-A..WS16-L PASS:**
- WS16-M (integrated packet proof)
- WS16-N (release readiness) — requires WS16-M PASS first

**No circular dependencies identified.** The sequencing is well-ordered and matches the Phase 16 critical path documented in SIMULATION-STATE.md.

---

## §6 — Thin Artifact Remediation Plan

### WS16-F — Test Equipment Traceability Build

**Current state:** ~80 lines. Presents as a planning memo rather than a sprint-ready build spec. Carry-forward controls are listed, build scope is bullet-listed, dependencies are named, blockers are enumerated, PASS criteria are listed. This is the skeleton of a good artifact, not the artifact itself.

**What it needs before a sprint team can build from it:**

1. **API contract specifications.** At minimum: `linkTestEquipment` mutation (args, return, throws), `receiveTestEquipment` mutation (state transitions: `pending_cal_verification → available|quarantined`), `getEquipmentCalStatus` query, `updateCalibrationRecord` mutation. Argument types, throw codes, and return shapes — to the level of WS16-B or WS16-E.

2. **Schema additions.** The `testEquipment` table and `maintenanceRecordTestEquipmentLinks` table must be specified — field names, types, indexes. Without schema, there is nothing to migrate.

3. **Named test cases.** The current artifact says "Cilla critical tests (TC-F-02/03/05/08 and API bypass negatives)" must pass, but those test cases are not written down. A build team cannot write code against test IDs that don't exist. At minimum, the test cases for expired-cal behavior, quarantine enforcement, and auth-ordering must be written with input/expected-output format.

4. **Cal-policy memo.** The signed `ws15-f-cal-policy-memo-v1.md` must exist and be cited by content (not just by filename) in the build spec. The expired-cal branch implementation is directly dependent on what that memo says. Until the memo is signed, the branch behavior is undefined.

5. **UAT script.** Dale Purcell's UAT must be scripted with specific steps: receiving a calibrated instrument, linking it to a maintenance record, running a work order where the calibration expires mid-project, and triggering the deterministic expired-cal branch. Teresa Varga's receiving-workflow steps must be written separately.

**Responsible for depth pass:** Devraj Anand (spec) + Marcus Webb (cal-policy memo signoff) + Cilla Oduya (test case authoring).

---

### WS16-G — Qualification Alerts Build + Auth-Order Proof

**Current state:** ~65 lines. Even thinner than WS16-F. The build scope references "WS15-J data model entities" without specifying what those entities are in the Phase 16 build context. The carry-forward controls are listed but undemonstrated. The ordering proof — the most technically critical item in this stream — is listed as a release blocker without any specification of what the proof will look like.

**What it needs before a sprint team can build from it:**

1. **Qualification data model spec.** The `qualificationRecords`, `qualificationAlerts`, and `qualificationEscalations` tables (or whatever the WS15-J terminology is) need field specifications and indexes. This is foundational — nothing else can be built without it.

2. **Threshold engine API contracts.** `evaluateQualificationStatus(userId, roleContext)`, `emitQualificationAlert(userId, alertType)`, `getQualificationGateResult(userId, workOrderId)` — these are the queries/mutations the build team will write. They need argument types and return shapes.

3. **The QALERT-18 ordering proof spec.** This is the artifact's most important deliverable. What test scenario demonstrates that `precheck(userId, roleContext)` occurs before `consumeAuthEvent(signatureAuthEventId)`? What does QALERT-18 look like as a test? Who runs it? What is the pass condition? This must be written before build — the ordering proof is not something you can add as an afterthought.

4. **Named test cases.** The threshold alert cases, escalation lanes, and assignment-time precheck gates need specific TC-G-XX entries with input conditions and expected assertions.

5. **UAT script.** Renata Solís must be briefed and her UAT scripted: what qualification states she will simulate, how she will verify the alert triage UI, how she will confirm the false-positive controls, and what constitutes her sign-off.

**Responsible for depth pass:** Devraj Anand (spec + ordering proof) + Marcus Webb (qualification interpretation compliance) + Cilla Oduya (test cases including QALERT-18).

---

### WS16-K — Customer Portal Build

**Current state:** ~65 lines. This is a complex multi-surface feature (dual-track status projection, approved copy bank, forbidden phrase validator, portal event freshness, AOG priority rules, audit stream). The artifact has the right structural skeleton but is missing all of the detail that makes a sprint spec actionable.

**What it needs before a sprint team can build from it:**

1. **Status projection mapping.** A table or schema showing: for each internal canonical status, what is the customer-safe projected status? What are the allowed state transitions for the customer-facing view? This is the core design work for this stream and it is entirely absent.

2. **Copy governance API.** The "forbidden phrase validator" is mentioned as a server-boundary control. What does this look like? A Convex mutation wrapper? A validation function? What phrases are in the taxonomy? Who owns the taxonomy? Without this, there is no way to implement the control.

3. **Freshness indicator spec.** What is the stale threshold? What triggers the stale banner? Is this computed server-side or client-side? This must be specified.

4. **API contracts.** `getCustomerPortalView(workOrderId, customerId)` — what does it return? `requestDiscrepancyReview(discrepancyId, customerId)` — what does it throw? At minimum the primary read queries and write mutations need argument/return shapes.

5. **Named test cases.** The wording governance test (does any projection path produce a status that implies airworthiness outside approved states?), the freshness test, the audit logging test.

6. **UAT script.** Carla Ostrowski and Danny Osei will have different concerns — Carla on the regulatory wording, Danny on the coordinator-facing view. Both need scripted UATs. "Carla sees a portal event and checks whether the wording implies RTS" is a 10-minute test that must be written down.

**Responsible for depth pass:** Chloe Park (UX) + Finn Calloway (UX) + Devraj Anand (API) + Danny Osei (UAT script co-author) + Marcus Webb (wording taxonomy).

---

### WS16-L — Discrepancy Customer Authorization Flow Build

**Current state:** ~60 lines. WS16-L is explicitly flagged as liability-critical in its own header — and yet it is the thinnest regulatory-touching artifact in the set. The consent record schema is referenced but not specified. The state machine is referenced but not documented. Marcus's liability sign-off is listed as a PASS criterion but has not been sought. This is a material mismatch between the artifact's self-assessed criticality and its actual depth.

**What it needs before a sprint team can build from it:**

1. **State machine specification.** The artifact mentions `DRAFT_INTERNAL -> ... -> terminal states` but provides no transition table, no labeled states, no guard conditions. A sprint team cannot implement a state machine from an ellipsis. Draw the states. Name the transitions. Specify the guards.

2. **Consent record schema.** What fields does a consent record have? Specifically: what constitutes the `consentText` (how is it generated? versioned? hashed?), what is the `identityAssurance` field and what values does it take, and what is the `textVersionHash`? These are mentioned as release blockers but the schema is not written.

3. **Supersede/invalidation chain spec.** The artifact says "supersede modifies prior request record in-place (history loss)" is a release blocker, implying supersession must NOT modify in-place. But how does supersession work? What is the correct model? This must be specified.

4. **API contracts.** `submitDiscrepancyAuthorizationRequest`, `recordCustomerConsent`, `checkWoAuthorizationGateState` — at minimum. With throw codes for the fail-closed paths.

5. **Marcus's liability sign-off conversation.** Before the build spec is written, Marcus must be in the room. The consent text, the phone-call capture path, and the AOG urgency non-bypass requirement all need his explicit input, not a post-hoc review. His sign-off listed as a PASS criterion with no evidence he has been consulted is a process gap.

6. **UAT script.** Danny Osei runs the coordinator queue. What does he actually do in UAT? Script the phone-call authorization capture path, the aging/escalation test, and the scenario where a customer changes their mind after initial approval.

**Responsible for depth pass:** Devraj Anand (spec + state machine) + Marcus Webb (liability consultation — pre-spec, not post-spec) + Danny Osei (UAT script) + Chloe Park (portal integration surfaces).

---

## §7 — Conditions

**Condition 1 — WS16-F Depth Pass Before Build Sprint (Owner: Devraj Anand + Marcus Webb)**

WS16-F must be deepened to include: API contracts for all primary mutations, schema table definitions, named test cases (minimum TC-F-01..TC-F-10 with the expired-cal branch and API-bypass tests), UAT scripts for Dale Purcell and Teresa Varga. The depth pass produces a revised artifact that Rafael can rate READY FOR BUILD. No WS16-F code may be merged to main until this condition is resolved.

**Resolution criteria:** Revised WS16-F artifact rated READY FOR BUILD by Rafael; signed cal-policy memo (Condition 2) attached to the artifact.

---

**Condition 2 — Cal-Policy Memo Signed Before WS16-F Build Can Begin (Owner: Marcus Webb)**

`ws15-f-cal-policy-memo-v1.md` must be signed by Marcus Webb and its content reflected in the WS16-F build spec's expired-cal branch implementation. An unsigned or ambiguous memo means the expired-cal branch behavior is undefined. No implementation of `linkTestEquipment`'s expired-cal path may begin until this memo exists.

**Resolution criteria:** Signed memo file exists at the referenced path; WS16-F build spec §2 or equivalent cites the memo by content and version; Marcus confirms the memo accurately reflects his intended policy.

---

**Condition 3 — WS16-G Depth Pass + QALERT-18 Ordering Proof Written (Owner: Devraj Anand + Marcus Webb)**

WS16-G must be deepened to include: qualification data model spec, threshold engine API contracts, a written specification for the QALERT-18 ordering proof (what the test does, what it proves, what the pass condition is), named test cases, and Renata Solís's UAT script. The QALERT-18 proof is the primary closure artifact for CF-2 in this stream — it must be written before code.

**Resolution criteria:** Revised WS16-G artifact rated READY FOR BUILD by Rafael; QALERT-18 test spec is written and Cilla has confirmed she can build the test from it; Renata Solís's UAT script is scripted and reviewed by Rosa Eaton.

---

**Condition 4 — WS16-K and WS16-L Depth Passes Before Build (Owner: Chloe Park + Devraj Anand + Marcus Webb)**

WS16-K and WS16-L are both thin. Both are liability-adjacent (WS16-L explicitly liability-critical). Both must complete depth passes that produce: status projection mapping (WS16-K), state machine specification (WS16-L), consent record schema (WS16-L), API contracts for both, named test cases for both, and UAT scripts for both. Marcus must be consulted on WS16-L before the spec is written, not after.

**Resolution criteria:** Revised WS16-K and WS16-L artifacts each rated READY FOR BUILD by Rafael; Marcus has signed the WS16-L liability pre-review memo; UAT scripts reviewed by Rosa Eaton.

---

**Condition 5 — WS16-J Hard Blockers HB-1..HB-4 Resolved Before Production Publish (Owner: Devraj Anand + Rachel Kwon + Chloe Park)**

WS16-J may proceed to Phase 1 build. However, four hard blockers must be resolved before any RSM revision is published to the production tenant:

- **HB-1:** Clerk auth log retention export (30-day default → 6-year regulatory minimum)
- **HB-2:** Written data retention policy document adopted by the certificate holder
- **HB-3:** RSM Quick Access link added to task queue sidebar (§145.163 requires RSM accessible during maintenance)
- **HB-4:** DOM emergency override mutation (safety-adjacent — AOG scenarios require a compliant bypass path that does not yet exist)

**Resolution criteria:** All four HBs have implementation evidence and Marcus sign-off before the first production RSM revision is published. Rachel Kwon's UAT in staging must run after HB-3 and HB-4 are implemented.

---

**Condition 6 — Jonas Harker Browser Sync API Device Matrix (Owner: Jonas Harker)**

Per WS16-A §7 Open Item OI-1, Jonas must deliver the Browser Sync API device support matrix within Phase 16 Week 1. This matrix determines the final form of the iOS Safari fallback implementation in the service worker. Build can proceed on all other offline components in parallel, but the service worker cannot be finalized until the matrix exists.

**Resolution criteria:** Matrix delivered by Phase 16 Week 1; service worker fallback implementation matches the matrix requirements; TC-DS1-11 (iOS Safari fallback sync test) passes.

---

**Condition 7 — Tanya Birch Clerk PWA Token Refresh Check (Owner: Tanya Birch)**

Per WS16-A §7 Open Item OI-2, Tanya must confirm whether Clerk's PWA SDK supports silent token refresh in a service worker context or requires active re-authentication. The outcome affects the reconnection UX only — the conflict resolution protocol is unaffected in either case.

**Resolution criteria:** Check completed within Phase 16 Week 1; reconnection UX flow specced based on finding; flow reviewed by Cilla before implementation begins.

---

## §8 — Final Ruling

**VERDICT: GO WITH CONDITIONS**

**Rafael's implementation verdict:** The core build streams are at a depth that a sprint team can execute from. WS16-A is genuinely exceptional — the schema proofs, the concurrent-replay theorem, and the deterministic outcome matrices represent the kind of spec work that prevents implementation bugs before code is written. WS16-C and WS16-D are equally strong. WS16-J is comprehensive. The four thin streams (WS16-F, WS16-G, WS16-K, WS16-L) are not sprint-ready, and I am not going to pretend otherwise because they have the right section headers. The gap between a 60-line scope memo and a build spec is real. Those four streams need depth passes. That work starts Monday alongside the build on the ready streams.

**Cilla's QA verdict:** The test plans I can work from: WS16-A (26 named TCs), WS16-B (10-item matrix), WS16-C (8 CI tests + 6 TCs, 47 assertions for Carla cold test), WS16-D (5 TCs with API bypass), WS16-E (10-item matrix), WS16-H (10-item matrix), WS16-I (10-item matrix), WS16-J (6 TCs + unit test suite). The test plans I cannot work from: WS16-F, WS16-G, WS16-K, WS16-L — no named cases, nothing to build tests against. My gate is simple: I will not sign off a stream that doesn't have test cases I wrote before implementation started. That's not a retrospective rule — it's what was agreed in Phase 16 Execution Policy item 2. The thin streams need their test cases written during the depth pass.

**Marcus's compliance verdict:** All five Phase 15 carry-forward controls are addressed at the design level. The WS16-A spike resolution closes the most critical compliance concern from Phase 15 — the pending-signature/offline ambiguity — with mathematical precision. The WS16-B IA re-auth build correctly positions the biometric-only rejection at the server, not the UI. WS16-C gives Carla's test and my in-room review as the compliance attestation mechanism, which I accept. WS16-J hard blockers HB-1 and HB-2 are my top priority before production: the Clerk log retention gap is not a UI problem, it is a records-retention compliance failure waiting to happen. That gets fixed before the first revision goes live. WS16-L has not had a liability conversation with me. That happens before the state machine is written, not after.

**Rosa Eaton's aviation verdict:** The streams that touch the maintenance record — WS16-A, WS16-B, WS16-C, WS16-D, WS16-E — are at a level of aviation accuracy that satisfies me. The Form 337 major repair gate (WS16-D) correctly handles the Part 43 Appendix B classification requirement. The LLP dashboard (WS16-E) correctly blocks at-limit installs and preserves life across aircraft transfers. The offline signature protocol (WS16-A) correctly preserves `clientTimestamp` as the deliberate signing moment per FAA Order 8300.10. My concern is WS16-F and WS16-L. Test equipment calibration traceability is not a nice-to-have in avionics work — using an out-of-cal altimeter on a transponder certification is a regulatory violation, and the system must make that impossible, not just auditable after the fact. And WS16-L involves customer consent on discrepancy work — I have seen consent disputes in the field result in liability events. Dale Purcell and Danny Osei are the right people to script those UATs. Get them in a room. Write the scripts.

---

*Closing dispatch — Miles Beaumont:*

Phase 16 opens in good standing. The offline trust-boundary question that held Phase 15 in conditional status has been answered with rigorous precision — the spike team delivered a body of work that this board is comfortable authorizing for build without reservation. The IA re-auth, PDF export, Form 337, and RSM acknowledgment streams are each at a level of specification depth that makes implementation tractable and testable. The thin streams are not a failure of the phase — they are an honest reflection of where the design work got to in the sprint. The board's job is to name that gap accurately, which we have done, and to name who closes it and by when, which we have also done. Monday morning: Tanya and Jonas close their open items on the offline service worker. Devraj begins the depth passes on WS16-F, WS16-G, WS16-K, and WS16-L in parallel with build on the ready streams. Marcus signs the cal-policy memo and schedules the WS16-L liability pre-spec conversation. Cilla writes test stubs for the streams that have TCs, and works with Devraj on the TCs for the streams that don't yet. Rafael reviews depth pass artifacts as they arrive — target: all four thin streams rated READY FOR BUILD by end of Phase 16 Week 2. The critical path is moving. The conditions are bounded. The team knows what to do.

*Gate record filed: 2026-02-22*

---

*Signed by the Phase Review Board:*  
*Cilla Oduya — QA Lead (test plan adequacy)*  
*Marcus Webb — Regulatory Lead (compliance)*  
*Rafael — Engineering Lead (implementation spec precision)*  
*Rosa Eaton — Aviation SME (operational accuracy)*  
*Miles Beaumont — Gate Record (closing dispatch)*
