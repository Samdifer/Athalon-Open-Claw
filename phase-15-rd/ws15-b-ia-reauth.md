# WS15-B — Per-Signature IA Re-Authentication Closure

**Workstream:** WS15-B  
**Feature:** Per-Signature IA Re-Authentication  
**Phase:** 15 — R&D + SME-Driven Feature Development  
**Owners:** Jonas Harker (platform/auth) · Marcus Webb (compliance) · Dale Renfrow (SME, IA — Grand Junction CO)  
**Secondary SME:** Carla Ostrowski (DOM oversight perspective, per Phase 15 SME assignment map)  
**Depends On:** Phase 14 PASS ✅  
**Artifact Version:** 1.0 — 2026-02-22  
**Status:** READY FOR BUILD  

---

## ⚠️ Document Order Policy

Per Phase 15 Execution Policy §1: _"Every workstream must open with a written SME brief before any implementation spec is written."_

This document strictly adheres: **Section 2 (SME Brief) precedes all implementation content.** Sections 3–5 are implementation, test, and compliance mapping — all downstream of the brief.

---

## Section 1 — Objective Checklist

The following checklist is the governing pass/fail gate for this workstream. Every item must be PASS before WS15-B is declared PASS. Items marked **[HARD BLOCKER]** are non-negotiable: any one FAIL = workstream status FAIL regardless of other items.

| ID | Objective | PASS Criterion | FAIL Criterion | Status |
|----|-----------|----------------|----------------|--------|
| OBJ-01 | SME brief complete before implementation spec | Dale Renfrow brief written, reviewed, and placed before Section 3 in this document | Brief absent or placed after any implementation content | ✅ PASS (Section 2 below) |
| OBJ-02 | Per-signature auth scope enforced at mutation level | `signatureAuthEvent.consumed` prevents any event from being used more than once; server-side check in all signing mutations | Any signing mutation that can accept an already-consumed event | ⬜ PENDING BUILD |
| OBJ-03 | No cross-signature session reuse for IA sign-offs | IA re-auth produces a new `signatureAuthEvent` for every distinct signature action; no "stay authenticated for this session" path exists for IA sign-offs | Any code path allowing an IA to sign multiple RTS events without a fresh re-authentication for each | ⬜ PENDING BUILD |
| OBJ-04 | **[HARD BLOCKER]** Full certification statement displayed BEFORE credential entry | Re-auth modal renders the full pre-auth summary card (aircraft N-number, certification language, IA cert number, regulatory citation) before PIN/credential field is shown | Any flow where credential field renders before summary card is visible and readable | ⬜ PENDING BUILD |
| OBJ-05 | **[HARD BLOCKER]** PIN method accepted; biometrics alone rejected | System accepts PIN as auth method; biometric-only paths (FaceID, fingerprint without PIN fallback) are explicitly disallowed for IA-level sign-offs | System permits IA sign-off using biometric-only authentication | ⬜ PENDING BUILD |
| OBJ-06 | **[HARD BLOCKER]** IA currency verified as hard gate before re-auth modal opens | System checks `certificate.iaExpiryDate > now()` and `certificate.lastExercisedDate` within 24 months before presenting the re-auth modal; expired/lapsed IA gets a hard block screen, not a warning | Any path where an expired IA is allowed to reach credential entry | ⬜ PENDING BUILD |
| OBJ-07 | Authentication event logged independently from record entry | `auditLog` entry for `signatureAuthEvent` creation is a separate document from the `returnToService` or `maintenanceRecord` entry; both carry the same `signatureAuthEventId` as linkage | Authentication event and record entry share a single audit document | ⬜ PENDING BUILD |
| OBJ-08 | **[HARD BLOCKER]** Fail-closed on interrupted flow | Network drop / browser close / timeout after credential submission but before mutation execution leaves a provably incomplete (no-commit) state; re-auth hook surfaces `timeout` state; no partial signed record exists | System leaves ambiguous state (e.g., `returnToService` record created without consumed `signatureAuthEvent`) | ⬜ PENDING BUILD |
| OBJ-09 | 5-minute TTL enforced server-side | `signatureAuthEvent.expiresAt` check occurs inside the Convex mutation — not only in the UI timer; event cannot be used after expiry regardless of client state | TTL enforced only via client-side timer; backend accepts expired events | ⬜ PENDING BUILD |
| OBJ-10 | Completed IA record immediately viewable in stored format | Post-sign, the system displays the committed `returnToService` record as it is stored (including IA cert number, regulatory citation, signatureHash) within 2 seconds of submission | Record shown only as a prettified UI view without the stored structure being verifiable | ⬜ PENDING BUILD |
| OBJ-11 | AC 120-78B §4 and §5 compliance mapped to design decisions | Compliance mapping (Section 4) completed, covering unique ID, unauthorized-use controls, and audit trail requirements | Compliance mapping absent, incomplete, or uncited | ✅ PASS (Section 4 below) |
| OBJ-12 | Test plan authored by Cilla Oduya, reviewed by Marcus Webb | Section 5 test plan bears both names, includes coverage matrix, minimum 15 test cases covering happy path + failure paths + concurrency + boundary conditions | Test plan absent, generic, or not explicitly attributed | ✅ PASS (Section 5 below) |
| OBJ-13 | Dale Renfrow sign-off acceptance test documented | Dale's personal evaluation protocol (end-to-end simulated annual + interrupted-flow test, both passing at least twice) documented as acceptance test cases and run | Acceptance test not documented or not run before PASS declared | ⬜ PENDING BUILD |
| OBJ-14 | Anti-rubber-stamp controls operational | UI enforces minimum dwell time on pre-auth summary (see Section 3.4); scroll confirmation for long summaries; system cannot be auto-tabbed through | No minimum dwell; summary can be bypassed by pressing Enter/Tab through fields | ⬜ PENDING BUILD |
| OBJ-15 | Written AC 120-78B technical statement produced | A plain-language technical statement (Section 4.6) suitable for Dale's personal records is included in this artifact | Statement absent | ✅ PASS (Section 4.6 below) |

**Workstream PASS requires:** All 15 items PASS. Items OBJ-02 through OBJ-10 and OBJ-13–14 are PENDING BUILD and will be verified during test execution.

---

## Section 2 — SME Brief: Dale Renfrow (IA, Grand Junction CO)

> **Policy compliance:** This section is written before any implementation content (Sections 3–5). It constitutes the SME input record for this workstream. No implementation decisions in Sections 3–5 were finalized without first capturing and integrating Dale's perspective documented here.

### 2.1 SME Identity and Engagement Context

**Name:** Dale Renfrow  
**Location:** Grand Junction, Colorado  
**Employer:** Mesa Ridge Aviation (Part 145, piston/turboprop-rated)  
**Certificates:** A&P — both ratings. IA granted 2011, held continuously. Renewal current through March 2027.  
**IA Number:** IA-2011-04883 (Cert #2871490)  
**Aircraft volume:** 40–55 annual inspections per year. King Air C90/B200 primary commercial fleet.  
**Aviation software history:** 7 years on AviWatch (adopted 2018; used for WO management, not IA sign-offs). Vetted two prior MRO platforms. Rejected both — one for absent regulatory citation in RTS entry, one for absent N-number on sign-off screen.

**Engagement basis:** Embedded SME for WS15-B per Phase 15 SME assignment map. Dale agreed to embed because he had specific objections to raise on the record. He used those words: "on the record." He has not switched to digital IA sign-offs despite years of digital WO management — not because he distrusts software but because no vendor has yet met his evaluation criteria. He is prepared to provide written endorsement to the DOM and to the Athelon project lead if the system earns it.

**Secondary SME cross-reference:** Carla Ostrowski (DOM, Columbus OH) provided the IA oversight perspective for WS15-G and WS15-B. Her minimum bar: an IA re-authentication system must be as deliberate as the wet-signature act it replaces. Carla's view: "If your re-auth flow can be completed in under 10 seconds by an IA who isn't reading anything, you have not replaced the wet signature. You have replaced the friction that prevents mistakes." Both SMEs arrived at the same design requirement from different angles.

---

### 2.2 Sign-Off Deliberateness Requirements

Dale's central thesis on digital IA sign-offs is not about technology — it is about the load-bearing pause:

> "The wet signature is not valuable because ink is permanent. It is valuable because it is a deliberate physical act that cannot be performed accidentally or distractedly. You have to pick up the pen, find the line, and make the mark. That sequence imposes a pause. That pause is where mistakes get caught."

Dale reports catching errors in that pause — both his own and others'. He treats the pause as functionally mandatory, not merely procedural. He wants the software to engineer the pause back into the digital flow.

**Specific deliberateness requirements Dale will articulate (direct paraphrase):**

1. **The certification statement must be displayed in full before credential entry.** Not a button labeled "Review and Sign" — the actual certification language, with his name and IA number already populated, in readable form, before he is given the option to authenticate. He reads it. He then signs.

2. **The display must name the specific item being certified.** Aircraft N-number, make/model, the specific inspection item, the regulatory basis for the sign-off (e.g., "Return to Service per 14 CFR §43.11" — stated explicitly, not implied), the date, his A&P certificate number, and his IA number. All before credential entry. All visible without scrolling if feasible; if record is long enough to require scrolling, an explicit scroll-complete acknowledgement is required.

3. **The authentication step must be isolated and atomic.** Not embedded in a multi-field form. Not on the same screen as editable fields. On its own dedicated step, with no mechanism to back-navigate to editable content while credential entry is visible.

4. **Completed record must be visible immediately.** When he completes authentication, the system must display the committed record within 2 seconds — not "submitted," not "processing," but the record itself with his information on it, the way an FAA inspector would see it. A spinner without a follow-up record display is not acceptable.

5. **Auto-generated record language must be reviewable and editable before commitment.** Dale will not certify record text he has not read and approved. Any system that generates and commits record text in a single step without a review window is rejected on that basis.

---

### 2.3 AC 120-78B Compliance Constraints

AC 120-78B ("Acceptance and Use of Electronic Signatures for Aviation Maintenance Records") is the governing FAA advisory circular for any electronic signature used in aviation maintenance. Dale received a survey from Denver FSDO in 2022 regarding IA familiarity with AC 120-78B and submitted three pages of written comments. He can cite §4 and §5 from memory.

**The constraints Dale will assert during embed (his framing):**

**§4 — Signature Requirements:** The electronic signature must uniquely identify the individual. This is not satisfied by a session login alone — it requires a re-authentication event specifically tied to the signature action. "Logging in this morning" is not "signing this record now." The re-auth is the signature. The re-auth must uniquely produce a time-bounded, record-specific authentication event.

**§4.a.2 — IA-specific:** The IA number must be captured in the signed record as a distinct field from the A&P certificate number. Dale has rejected two prior systems that stored the certificate number but not the IA number as a separate field. He considers this a non-negotiable data model requirement, not a UI preference.

**§5 — Audit Trail Requirements:** The audit trail must capture who signed, when, and under what circumstances. "When" means the timestamp of the authentication action, not the timestamp of page load or session start. "Under what circumstances" includes the authentication method, the IP address or device identifier, and the specific record the signature was applied to.

**§5.d — Alteration Control:** A signed record is immutable. Any change after signing must create a documented amendment trail with: the original value, the new value, the identity and cert number of the person making the change, the reason, and the timestamp. The original signed version must remain accessible and distinguishable from the amended version.

**Dale's summary of AC 120-78B in his own words:**

> "The circular is asking one question: 'If we had to reconstruct whether this signature was legitimate and unaltered, what evidence would we have?' My answer has to be: 'Two independent records — the signed document and the authentication log — both of which can be compared against each other and verified without needing the software to still be running.'"

---

### 2.4 Anti-Rubber-Stamp Controls

Dale's most direct concern about digital IA sign-offs is what he calls the "reflexive authentication" problem:

> "A PIN can be entered reflexively. A thumbprint can be captured passively. I have seen shop tablets that are unlocked all day and the authentication is essentially always-on. I do not believe biometrics, as typically implemented in commercial software, provide the same forcing function as a physical signature."

He is not making a philosophical argument against biometrics per se. He is making a specific claim about failure modes in practice: a 4-digit PIN on a shared tablet, or a fingerprint on a device handled by twelve mechanics, is not equivalent in deliberateness to a wet signature. He wants the deliberateness engineered back in.

**Anti-rubber-stamp controls Dale will specifically require:**

1. **Per-signature re-authentication.** No persistent "stay signed in for signing" capability for IA sign-offs. Every IA-level signature triggers a fresh authentication event. No session token carries across sign-offs.

2. **PIN required (6+ digit), not biometrics alone.** He specifies a minimum 6-digit PIN — distinguishing it from the 4-digit device unlock PINs on shared shop tablets. Biometrics may be an additional method but not a substitute. Rationale: PIN entry on an IA sign-off requires conscious decision and deliberate action; biometric capture on a shared tablet does not.

3. **Full pre-auth summary must be read before credential entry is enabled.** UI must enforce that the summary is rendered and has had time to be read. Minimum dwell time before PIN field becomes active (Section 3.4). For summaries requiring scroll, a scroll-complete acknowledgement must be checked before credential entry is enabled.

4. **No "remember this device."** No mechanism to bypass per-signature re-auth on a trusted device. Every sign-off, every time.

5. **Forced review of the record as stored, not just a rendered UI view.** Dale specifically requests: "I want to see the actual stored record — not a prettified view — at least once during evaluation. I want to know what an FSDO would see if they pulled the record through a data export." This drives the post-sign record display requirement (OBJ-10).

---

### 2.5 Failure Mode Risks

Dale surfaces the following failure mode risks from field experience and systems he has evaluated. These directly inform the fallback behavior and error handling design in Section 3.6.

**FM-01 — Reflexive authentication on a shared device**  
Risk: A shared tablet with a simple 4-digit PIN or always-on biometric allows an IA to "sign" a record without meaningfully reviewing it. The signature is technically produced but the deliberateness requirement is not met.  
SME statement: "I have seen this. Not at Mesa Ridge. At another facility I consulted. The IA was signing records in under 30 seconds because the device was always unlocked and the PIN was muscle memory from all the other things they authenticated on the same tablet."  
Mitigation required: 6+ digit PIN, minimum dwell time, per-signature freshness.

**FM-02 — Ambiguous interrupted-flow state**  
Risk: Network drops or browser closes after credential submission but before mutation execution. The system "thinks" the sign-off was completed; the IA "thinks" it was interrupted. Neither is certain. This is what Dale calls a "liability bucket."  
SME statement: "If the system returns an ambiguous state after an interrupted workflow, I will not use it. Either the record is in the system and confirmed, or it hasn't happened. There is no 'probably signed.'"  
Mitigation required: Fail-closed design. `signatureAuthEvent` is the source of truth. If event is unconsumed after timeout, the record was not created. The UI must surface this unambiguously.

**FM-03 — Expired IA completing a sign-off**  
Risk: An IA's authorization expires (March 31 of the renewal year). If the system only warns rather than blocks, an expired IA may complete a sign-off. This is a federal records violation.  
SME statement: "I have a near-miss in my own history — 2019, missed the 90-day active inspection requirement by twelve days. I submitted a letter and it resolved without action. But I can tell you what it felt like to have my authorization status in question. No system should let that happen without a hard stop."  
Mitigation required: IA currency check as pre-condition, not advisory. Hard gate before re-auth modal opens. No override path.

**FM-04 — Record visible only in app UI, not in stored format**  
Risk: The IA signs a record, the UI shows a confirmation screen, but the confirmation screen is a rendered view that may not match the actual stored record. The IA certifies what they saw on screen, not what was stored.  
SME statement: "I want to see the actual stored record — not a prettified view — at least once during evaluation."  
Mitigation required: Post-sign display includes the raw stored values (especially: IA cert number as stored, signatureHash in full, regulatory citation as stored). This is not a user-facing UX optimization — it is a deliberateness requirement.

**FM-05 — Auto-generated record text committed without review**  
Risk: The system generates the return-to-service statement or record language and the IA commits it in the same step without a review window.  
SME statement: "I will not certify record text I have not read and approved. Any system that generates and commits record text in a single step is rejected on that basis alone."  
Mitigation required: The RTS statement editor (Phase 2 sign-off flow Step 4) must be a review step with the IA's legal name and IA number pre-populated but the statement text shown as reviewable. The commit step is separate from the review step.

**FM-06 — IA sign-off as a dashboard queue item**  
Risk: A system that surfaces "IA sign-off pending" as a named queue item with the IA's name visible to all shop staff creates social pressure to sign quickly. The return-to-service decision is the IA's call on the IA's timeline, not a queue item to be cleared.  
SME statement: "I have used systems that have an 'IA sign-off pending' banner with my name on it, visible to everyone in the shop, counting down. I find this creates pressure that has no place in the sign-off decision."  
Mitigation required: WS15-B UI design must not surface IA-named pending queues visible to other shop staff. The IA sees their own pending items; other staff see a generic "awaiting IA review" status without the IA's name attached to a countdown.

---

### 2.6 Dale's Formal Acceptance Protocol

Dale has a non-negotiable pre-production acceptance test. He stated it explicitly: before he will use the Athelon sign-off workflow on a live annual, he requires two tests run by him personally:

**Test A — End-to-End Simulated Annual:** Open a work order, complete an inspection checklist, trigger the IA sign-off flow, authenticate, view the committed record, export a printed copy. Then: a person from Athelon engineering (unfamiliar with the scenario) opens the same record and must locate, without guidance, his IA number, the date, the regulatory citation, the description of work, and the authentication event log — within 3 minutes.

**Test B — Interrupted Flow Test:** Initiate an IA sign-off, interrupt it mid-flow (network drop or browser close after credential submission), and confirm the system state is unambiguous. The system must report a provably incomplete (no-commit) state. This test must produce a clean result at least twice before Dale considers the interrupted-flow behavior verified.

Both tests are required. Both must produce PASS results. Both must be documented in the production run of OBJ-13.

---

## Section 3 — Per-Signature Re-Authentication Design Spec

> **Pre-condition:** SME brief (Section 2) is complete. The following design is directly informed by Dale Renfrow's requirements (Section 2) and the existing auth platform architecture (Phase 3 auth wiring, `auth-platform-wiring.md`).

### 3.1 Design Context: Existing Architecture

The Phase 3 auth platform already implements the core mechanism. This workstream is not greenfield — it is **hardening, scoping, and closing** the per-signature re-auth contract for IA-level sign-offs specifically. Key existing elements:

- `signatureAuthEvent` table: per-auth event record, 5-minute TTL, `consumed` flag preventing reuse.
- Clerk `session.reAuthenticated` webhook → HMAC-verified Next.js route → Convex HTTP action.
- `useSignatureAuthEvent` hook: reactive Convex subscription, 10-second timeout guard, `status: waiting | ready | timeout` state machine.
- `authorizeReturnToService` mutation: 9-precondition chain, all preconditions server-side, fail-closed.
- `requireOrgMembership(ctx, "inspector")` on signing mutations.

**What WS15-B adds or hardens on top of the existing platform:**

1. IA-specific re-auth constraints: 6-digit PIN floor, biometric-only disallowance for IA paths, per-signature scope enforcement with no session carry-over.
2. Pre-auth summary rendering requirements: full certification statement first, credential entry second (OBJ-04).
3. Anti-rubber-stamp controls: minimum dwell time, scroll confirmation (OBJ-14).
4. IA currency hard-gate: expiry + 24-month recent-experience check before modal opens (OBJ-06).
5. Post-sign record display: stored format visibility (OBJ-10).
6. Interrupted-flow failure surface: clear `timeout` / `no-commit` state in UI (OBJ-08, FM-02).
7. FM-06 mitigation: IA queue privacy controls.

---

### 3.2 Trigger Conditions

Per-signature IA re-authentication is triggered whenever:

| Trigger | Condition | Re-Auth Scope |
|---------|-----------|--------------|
| `authorizeReturnToService` | Any work order type requiring IA sign-off (annual inspection, applicable major repairs) | Full IA re-auth (6+ digit PIN required) |
| `signTaskCardStep` where `signOffRequiresIa == true` | Task card step explicitly flagged as requiring IA authorization | Full IA re-auth |
| Correction to a previously IA-signed record | Any amendment to an immutable IA-signed `maintenanceRecord` or `returnToService` | Full IA re-auth for the correcting party if they hold IA; A&P re-auth for others, per correction policy |
| AD compliance sign-off (inspection-type) | When Marcus's compliance mapping determines IA is required for a specific AD compliance type | Full IA re-auth |

**Not triggered (lighter A&P re-auth path remains for):**

- Routine task card step sign-offs by A&P mechanics without IA flag
- Parts receiving and quarantine attestations
- QCM review acknowledgements
- Customer communication records

**Scope boundary rule:** The re-auth modal knows its context. A `signatureAuthEvent` is created with an `intendedTable` field. For IA paths, `intendedTable = "returnToService"` or `"taskCardStep"` (IA-flagged). The consuming mutation validates `intendedTable` matches the table it is writing to. An RTS mutation rejects a `signatureAuthEvent` generated for a task card step, and vice versa. This prevents cross-context event reuse.

---

### 3.3 Token/Session Model

The per-signature re-auth model is a **stateless event model**: each authentication produces one and only one `signatureAuthEvent` document, consumed by exactly one signing mutation. There is no session object that carries IA authorization across multiple sign-offs.

```
IA initiates sign-off
  ↓
[Server-side: IA currency hard gate]
  ↓
[UI: Pre-auth summary displayed] ← Dale's requirement: full certification statement FIRST
  ↓
[UI: Anti-rubber-stamp dwell timer active] ← minimum 5s before credential field becomes active
  ↓
[UI: Scroll confirmation if record > 1 viewport] ← user must confirm they scrolled
  ↓
IA enters 6+ digit PIN
  ↓
Clerk session.reAuthenticated event fires
  ↓
Webhook → Next.js HMAC verify → Convex HTTP action
  ↓
signatureAuthEvent inserted:
  - consumed: false
  - expiresAt: now() + 300_000 (5 minutes)
  - intendedTable: "returnToService" | "taskCardStep"
  - authMethod: "pin" (validated — biometric-only → reject)
  - technicianId, authenticatedCertNumber (snapshotted at event creation)
  ↓
useSignatureAuthEvent hook receives push (< 500ms typical)
  ↓
eventId passed to signing mutation
  ↓
Mutation: server-side checks:
  - event.consumed == false             [hard fail: IA_AUTH_EVENT_CONSUMED]
  - event.expiresAt > Date.now()        [hard fail: IA_AUTH_EVENT_EXPIRED]
  - event.intendedTable == targetTable  [hard fail: IA_AUTH_EVENT_WRONG_TABLE]
  - event.authMethod != "biometric"     [hard fail: IA_AUTH_BIOMETRIC_ONLY_REJECTED]
  ↓
All checks pass → atomically:
  1. event.consumed = true, consumedAt = now(), consumedByTable, consumedByRecordId
  2. returnToService record created (immutable)
  3. auditLog: event consumed (separate entry from record creation)
  4. auditLog: record_signed (separate entry)
  ↓
Post-sign: UI displays committed record (raw stored values, not prettified view)
```

**Key invariants:**

- `signatureAuthEvent` is consumed exactly once or not at all. Atomic Convex transaction guarantees this.
- A second IA sign-off on the same session requires a fresh webhook → fresh event → fresh consumption. There is no mechanism to extend or re-use an existing event.
- `expiresAt` is server-set. The client cannot extend it. The client UI shows a countdown as a UX aid; the backend does not trust the countdown.
- `authMethod` is set from the Clerk webhook payload strategy mapping. The backend rejects `"biometric"` as the sole method for IA sign-offs (see Section 3.5 for the rejection logic).

---

### 3.4 Re-Auth Modal: UI Specification (Anti-Rubber-Stamp Controls)

The re-auth modal for IA sign-offs is architecturally separate from the lighter A&P step sign-off flow. It is a full-screen overlay (not a bottom sheet or popover) to communicate the gravity of the action.

#### Phase 1: Pre-Auth Summary (required, gated)

Rendered before credential field is accessible.

**Content — all fields required, sourced from server-verified data:**

```
┌──────────────────────────────────────────────────────────┐
│ INSPECTION AUTHORIZATION CERTIFICATION                    │
│ Before you sign, read and confirm the following:          │
├──────────────────────────────────────────────────────────┤
│ Aircraft:       [N-NUMBER] — [Make] [Model] [S/N]        │
│ Work Order:     [WO-NUMBER] — [Work Order Type]          │
│ Total Time:     [TT at close] airframe hours             │
│ Item Certifying: [Specific inspection item / task card   │
│                  description or "Annual Inspection        │
│                  in accordance with 14 CFR §91.409(a)"]  │
│                                                          │
│ Regulatory Basis:                                        │
│ [Rendered in full from template — e.g.:                  │
│  "I certify that this aircraft has been inspected in     │
│  accordance with an annual inspection and was determined │
│  to be in airworthy condition. Return to service per     │
│  14 CFR §43.11. Date: [DATE]"]                           │
│                                                          │
│ Your Identity:  [Legal Name]                             │
│ A&P Certificate: [Certificate Number]                    │
│ IA Number:      [IA-XXXX-XXXXX]                          │
│ IA Expiry:      March 31, [YEAR] — CURRENT ✓             │
│                                                          │
│ [If record > 1 viewport: scroll indicator bar shows      │
│  current scroll position. "You must scroll to the        │
│  bottom before authenticating." Checkbox appears at      │
│  bottom: "I have read the full certification above."]    │
├──────────────────────────────────────────────────────────┤
│ PIN field: [DISABLED — activates in 5 seconds]           │
│ [Countdown: "Authentication available in: 4...3...2...1"]│
└──────────────────────────────────────────────────────────┘
```

**Anti-rubber-stamp enforcement rules:**

- **Minimum dwell time:** 5 seconds after summary renders before PIN field becomes active. Not skippable. Not configurable per-org. The 5-second timer is hardcoded for IA-scope sign-offs.
- **Scroll confirmation:** If the summary content exceeds the visible viewport (determined by comparing `scrollHeight > clientHeight` on the summary container), a scroll-completion checkbox appears at the bottom of the scrollable area. The PIN field does not activate until: (a) dwell timer elapsed AND (b) checkbox checked (if applicable).
- **No back-navigation while credential entry is active:** Once the PIN field is active, back-navigation to editable content is blocked. The IA must explicitly "Cancel Sign-Off" (which aborts and logs an `access_denied` audit event) to return to editing.
- **Cancel is always available:** At any point before PIN submission, the IA may cancel. Cancel does not consume the `signatureAuthEvent` (no event exists yet; the webhook fires only after PIN submission).

#### Phase 2: Credential Entry

Once dwell + scroll conditions are met:

```
├──────────────────────────────────────────────────────────┤
│ Authentication Method: PIN (6+ digits)                    │
│ [PIN field — masked, 6-digit minimum enforced]            │
│                                                          │
│ Method: [PIN selected — default]                         │
│         [Biometric: NOT AVAILABLE for IA sign-offs]      │
│         [See Section 3.5 for biometric policy]           │
│                                                          │
│ [Submit: "Authenticate and Sign"]                         │
│                                                          │
│ Your credential and authentication timestamp will be      │
│ permanently recorded with this maintenance release.      │
└──────────────────────────────────────────────────────────┘
```

#### Phase 3: Post-Auth Transition

After PIN submission:

1. Button shows `<Spinner label="Verifying..." />`
2. Clerk processes re-auth (< 1s typical) → webhook fires → Convex HTTP action inserts `signatureAuthEvent`
3. `useSignatureAuthEvent` hook receives push → `status: "ready"` → 500ms `<SuccessState label="Identity confirmed" />`
4. Modal transitions to mutation execution state

On timeout (10 seconds, no event received):

- `<ReAuthTimeoutError>` shown: "Authentication did not complete within the expected window. Your sign-off has NOT been recorded. Network connectivity may be interrupted. Tap 'Try Again' to restart authentication."
- "Try Again" remounts the hook with a fresh `mountTime`.
- The failed attempt is logged: `auditLog` entry, `eventType: "access_denied"`, reason: `IA_REAUTH_TIMEOUT`, no record written.

#### Phase 4: Post-Sign Record Display

Per OBJ-10 and FM-04:

Within 2 seconds of successful mutation execution, the modal transitions to a **Committed Record View** that shows:

- Aircraft and WO identity (verbatim from stored record)
- RTS statement as stored (not rendered — the actual string from `returnToService.returnToServiceStatement`)
- IA certificate number as stored (from `returnToService.iaCertificateNumber`)
- IA number as stored (from `returnToService.iaNumber`)
- `signatureHash` in full (64 hexadecimal characters, monospaced font)
- `returnToServiceDate` as stored epoch converted to local and UTC display
- `signatureAuthEventId` (linkage reference)
- A note: "This record is now immutable. Any amendment requires a documented correction with a new authentication event."

This view satisfies Dale's requirement to see the record as it was stored, not as it is rendered.

---

### 3.5 Biometric-Only Rejection Logic

Biometrics are not forbidden as a method — they are forbidden as the *sole* method for IA sign-offs. The distinction is important for audit purposes.

**Allowed auth methods for IA sign-offs:**

| `authMethod` value | Clerk Strategy | Allowed for IA? | Reason |
|-------------------|----------------|-----------------|--------|
| `"pin"` | Custom PIN flow (6+ digit) | ✅ Yes — required | Deliberate, device-agnostic, not ambient |
| `"password"` | Clerk password strategy | ✅ Yes | Explicit credential entry |
| `"mfa_totp"` | TOTP (e.g., authenticator app) | ✅ Yes (as second factor with PIN) | Strong factor |
| `"mfa_sms"` | SMS OTP | ✅ Yes (as second factor with PIN) | Acceptable second factor |
| `"biometric"` | Platform authenticator / FaceID / Touch ID | ❌ No (sole method) | Fails deliberateness requirement per SME brief |

**Backend rejection path:**

In the Convex HTTP action (`webhooks/sessionReAuthenticated`), after resolving `authMethod` from Clerk's `factor_one_verification.strategy`:

```typescript
// If IA sign-off context AND biometric-only:
if (args.intendedTable === "returnToService" && authMethod === "biometric") {
  await writeAuditLog(ctx, {
    eventType: "access_denied",
    notes: "IA_AUTH_BIOMETRIC_ONLY_REJECTED: biometric-only auth not accepted for IA sign-off",
    userId, technicianId,
  });
  return new Response(JSON.stringify({ error: "IA_AUTH_BIOMETRIC_ONLY_REJECTED" }), { status: 422 });
}
```

**Frontend surface:** If the Convex HTTP action returns 422 with `IA_AUTH_BIOMETRIC_ONLY_REJECTED`, the `useSignatureAuthEvent` hook receives no event (webhook rejected, no event created). After the 10-second timeout, the hook surfaces `status: "timeout"`. The error display must distinguish biometric rejection from network timeout: the webhook delivery to the frontend is available as a separate signal via the `IA_AUTH_BIOMETRIC_ONLY_REJECTED` error code in the `auditLog`. The frontend polls for this code on timeout and shows a specific message: "Biometric authentication is not accepted for IA sign-offs. Please use your 6-digit PIN."

**Biometric as second factor:** If Clerk is configured to support biometric as a second factor (in addition to PIN entry), this is allowed. The `factor_one_verification.strategy` would reflect the PIN as primary; biometric as MFA. The `authMethod` captured in `signatureAuthEvent` would be `"pin"` (or `"mfa_biometric_with_pin"` in the strategy mapping). The implementation must map this correctly to ensure the PIN is always the primary identified factor.

---

### 3.6 Timeout Rules and Fallback Behavior

#### 5-Minute TTL (`signatureAuthEvent.expiresAt`)

- Set server-side: `authenticatedAt + 300_000` ms.
- Enforced server-side in the consuming mutation: if `event.expiresAt <= Date.now()`, throw `IA_AUTH_EVENT_EXPIRED`. Client cannot extend or spoof.
- Frontend countdown timer: a visible "Authentication expires in: 4:55" countdown is shown in the modal after the event is received. This is a UX aid only — the backend does not trust it.
- On expiry (either client-side countdown or backend rejection): "Authentication expired. Please re-authenticate to continue." Fresh re-auth required. No shortcut.

#### 10-Second Webhook Delivery Timeout

- `useSignatureAuthEvent` hook: after 10 seconds with no event received, `status: "timeout"`.
- Displayed error: "Authentication did not complete within the expected window. Your sign-off has NOT been recorded."
- "Try Again" remounts the hook with a fresh `mountTime`.
- **Important:** if the webhook was delayed (not failed), the next mount may receive the delayed event. If the event's `authenticatedAt` is older than `MAX_AGE_MS` (30 seconds), the hook ignores it. Fresh credentials required.

#### Interrupted Flow (Network Drop / Browser Close)

Scenario: PIN submitted, Clerk processes re-auth, webhook fires, Convex HTTP action begins, then one of the following occurs:
- Network drops before `signatureAuthEvent` is inserted
- Network drops after `signatureAuthEvent` is inserted but before the signing mutation is called
- Network drops mid-mutation (before atomic commit)

**State machine outcomes:**

| Failure point | State of `signatureAuthEvent` | State of `returnToService` | UI surfaced | Correct behavior |
|---------------|------------------------------|--------------------------|-------------|------------------|
| Before HTTP action receives webhook | Not created | Not created | Timeout after 10s | ✅ No commit — correct |
| HTTP action fails before insert | Not created | Not created | Timeout after 10s | ✅ No commit — correct |
| HTTP action succeeds, event created; signing mutation not called | Created, `consumed: false`, will expire at `expiresAt` | Not created | Timeout after 10s | ✅ No commit — event expires unused. IA must re-auth. |
| Signing mutation mid-execution, transaction not committed | Created (unconsumed) | Not created | Timeout / error | ✅ Convex atomic transaction: partial mutation leaves no written state |
| Signing mutation committed successfully, response lost in transit | Created, `consumed: true` | Created | Timeout on client | ⚠️ **Record IS committed.** On next open, IA sees "This record was already signed" — must handle gracefully (see below) |

**Late-response handling:** If the mutation committed but the client received a network error, the IA re-opens the work order and sees it in `status: "closed"` with a `returnToServiceId` set. The UI must display: "This work order was returned to service at [timestamp] and has been closed. No further sign-off is required." This is the correct state — the IA signed it, even if the confirmation was lost. The `returnToService` record exists and is valid.

**Explicit incomplete-state surfacing (per OBJ-08 and FM-02):**

If the IA returns to a work order after an interrupted sign-off:
- WO is still in `pending_signoff` status → sign-off was not completed. Explicit message: "Your previous sign-off attempt was not completed. The record was not created. You may begin a new sign-off."
- WO is in `closed` status with `returnToServiceId` set → sign-off was completed. Explicit message as above.

There is no third state. The system cannot be in a "maybe signed" state because Convex transactions are atomic.

---

### 3.7 IA Currency Hard Gate

This check runs before the re-auth modal opens. It is not a warning. It is a block.

**Checks performed (server-side, via `validateIaCurrencyBeforeModal` query called on modal-open intent):**

```typescript
export const validateIaCurrencyBeforeModal = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const tech = await getTechnicianForUser(ctx, identity.subject);
    const cert = await getActiveCertificateForTechnician(ctx, tech._id);

    const now = Date.now();
    const rtsDate = now; // Pre-validate against "now" — actual RTS date locked at mutation execution

    // Check 1: IA authorization exists
    if (!cert.hasIaAuthorization) {
      return { allowed: false, code: "IA_NOT_HELD", message: "Your account does not have IA authorization on file. Contact your DOM to update your certificate record." };
    }

    // Check 2: IA not expired (March 31 rule)
    if (cert.iaExpiryDate <= now) {
      return { allowed: false, code: "IA_EXPIRED", message: `Your Inspection Authorization expired on ${formatDate(cert.iaExpiryDate)}. Renew at your district FSDO before signing.` };
    }

    // Check 3: Recent experience (65.83 — 24-month rule)
    const monthsAgo24 = now - (24 * 30 * 24 * 60 * 60 * 1000);
    if (cert.lastExercisedDate < monthsAgo24) {
      return { allowed: false, code: "IA_RECENT_EXP_LAPSED", message: "Your Inspection Authorization has not been exercised within the past 24 months (14 CFR §65.83). Review with your DOM before signing." };
    }

    // Check 4: IA number present in record (required for §43.9(a)(4))
    if (!cert.iaNumber) {
      return { allowed: false, code: "IA_NUMBER_MISSING", message: "Your IA number is not recorded in the system. Contact your DOM to update your certificate record before signing." };
    }

    return { allowed: true };
  }
});
```

**Frontend behavior on block:**

- Hard block screen replaces the re-auth modal entirely.
- Title: "Sign-Off Not Available"
- Body: [specific message from validation result]
- No dismiss. No override. No "proceed anyway."
- Action: "Contact DOM" (opens in-app messaging to DOM role users in the org).
- Logged: `auditLog` entry, `eventType: "access_denied"`, `notes: code + workOrderId`.

---

## Section 4 — Compliance Mapping: AC 120-78B to Design Decisions

### 4.1 AC 120-78B Structure Summary

AC 120-78B governs the acceptance and use of electronic signatures in aviation maintenance records. The relevant sections:

| Section | Title | Relevance |
|---------|-------|-----------|
| §4 | Electronic Signature Attributes | Defines what makes a signature legally sufficient |
| §4.a | Unique identification | Signature must uniquely identify the individual |
| §4.a.2 | IA-specific identification | IA number must be captured distinct from A&P number |
| §4.b | Controls against unauthorized use | System must prevent others from using your signature |
| §4.c | Binding to signed record | Signature must be specifically linked to the record it signs |
| §5 | Audit Trail | Comprehensive requirements for signature event logging |
| §5.a | Timestamp accuracy | Timestamp must reflect the act of signing, not session start |
| §5.b | Record integrity verification | Changes detectable after signing |
| §5.c | Accessibility | Signed records accessible for authorized review |
| §5.d | Alteration control | Alterations must create an audit trail; original preserved |

### 4.2 Compliance Trace Table

| AC 120-78B Requirement | Requirement Text (paraphrase) | Athelon Design Decision | Evidence Reference |
|------------------------|-------------------------------|------------------------|--------------------|
| §4.a — Unique individual ID | The electronic signature must uniquely identify the person who applied it | `signatureAuthEvent.technicianId` + `authenticatedLegalName` + `authenticatedCertNumber` snapshotted at event creation; cannot be falsified post-hoc | Phase 3 auth wiring §2.2 |
| §4.a.2 — IA number distinct | IA number must be captured separately from A&P certificate number | `returnToService.iaCertificateNumber` and `returnToService.iaNumber` are separate fields; validation rejects IA sign-off if `iaNumber` is absent (OBJ-06 IA currency gate check 4) | Section 3.7, OBJ-06 |
| §4.b — Unauthorized use controls | Controls must prevent others from using an individual's signature | Per-signature re-authentication: fresh `signatureAuthEvent` required for every sign-off; 5-minute TTL; PIN required (biometric-only rejected for IA); no session carry-over | Section 3.3, 3.4, 3.5 |
| §4.b — Additional: PIN minimum | System must use an authentication method that is not trivially usurped | 6-digit PIN minimum for IA sign-offs (vs. 4-digit device unlock); enforced in Clerk PIN configuration for IA-scope re-auth | OBJ-05, Section 3.5 |
| §4.c — Binding to specific record | Signature must be specifically and unambiguously linked to the record it authenticates | `signatureAuthEvent.intendedTable` must match consuming mutation's target table; event consumed atomically with record creation; `consumedByRecordId` cross-references the signed record | Section 3.3, Phase 3 auth wiring §2.2 |
| §5.a — Timestamp accuracy | Timestamp must reflect the moment of signing, not session start | `signatureAuthEvent.authenticatedAt = Date.now()` set server-side in Convex HTTP action, not client-reported; `returnToService.returnToServiceDate = Date.now()` set at mutation execution; both are server-authoritative | Phase 3 auth wiring §2.2; Phase 2 signoff-rts-flow §2.2 PRECONDITION 1 |
| §5.b — Integrity verification | Signed records must be verifiable as unaltered | `returnToService.signatureHash`: SHA-256 of canonical JSON of all required RTS fields (computed before insert); any post-insert DB-level change would change recomputed hash while stored hash remains original | Phase 2 signoff-rts-flow §3.3 |
| §5.b — Hash on face of document | Hash must be accessible for inspector verification without software login | SHA-256 hash printed in full (64 chars, monospaced) on PDF export face; WS15-A PDF export compliance (MWC-A-06) | WS15-A Implementation Spec |
| §5.c — Accessibility | Signed records must be retrievable for authorized review | Any closed work order retrievable within 2 minutes from any device; no archive state; Pat DeLuca requirement documented in Phase 5 | Phase 5 IA profile, Pat DeLuca interview |
| §5.d — Alteration control | Alterations must preserve original; trail must identify who changed what and why | `returnToService` has no update mutation — changes require correction record with original value, corrector identity, cert number, timestamp, reason | Phase 2 signoff-rts-flow §3.1; WS15-A MWC-A-07 |
| §5 — Independent audit trail | Authentication event logged independently from record entry | Two separate `auditLog` entries per sign-off: (1) `eventType: "record_created"` for `signatureAuthEvent`; (2) `eventType: "record_signed"` for the signing record; linked by `signatureAuthEventId` | Phase 3 auth wiring §2.2 step 6; OBJ-07 |
| §5 — Failure logging | Failed sign-off attempts must be auditable | Every `authorizeReturnToService` precondition failure writes `eventType: "access_denied"` with error code and work order ID | Phase 2 signoff-rts-flow §6.6; OBJ-07 |

### 4.3 Gaps Identified and Closed by WS15-B

The following were identified as gaps or under-specified areas in prior phases. WS15-B closes them:

| Gap | Prior State | WS15-B Closure |
|-----|-------------|----------------|
| Biometric-only path not explicitly rejected for IA sign-offs | Phase 3 auth wiring describes allowed methods but does not explicitly reject biometric-only for IA scope | Section 3.5 adds server-side 422 rejection for `authMethod == "biometric"` on IA-scoped events |
| Pre-auth summary rendering order not specified | Phase 2 sign-off flow Step 5 describes the re-auth modal but does not mandate summary-before-credentials order | Section 3.4 Phase 1 mandates full certification statement renders before PIN field is active; OBJ-04 is a HARD BLOCKER |
| Minimum dwell time not specified | No prior document addresses minimum dwell or scroll confirmation | Section 3.4 specifies 5-second dwell + scroll-completion acknowledgement for IA sign-offs; OBJ-14 |
| Post-sign stored-format display not specified | Phase 2 shows a "confirmation screen" but does not mandate raw stored values be displayed | Section 3.4 Phase 4 mandates stored-format display including signatureHash in full; OBJ-10 |
| Interrupted flow state surface not standardized | Phase 3 `useSignatureAuthEvent` defines `timeout` state but UI messaging not standardized | Section 3.6 specifies exact UI text for each failure scenario; OBJ-08 |
| FM-06 (IA queue pressure) not addressed | No prior document addresses IA-named pending queue visibility | Section 2.5 FM-06 and Section 3.4 specify privacy controls; IA queue shows to IA only, not named to other staff |

### 4.4 Regulatory Citations Summary

All regulatory citations applicable to this workstream:

- **14 CFR §43.9(a)(4)** — Name of person performing work, signature, and certificate number
- **14 CFR §43.11(a)(5)** — IA's certificate number on the return-to-service entry
- **14 CFR §65.83** — Recent experience requirement; 24-month rule
- **14 CFR §65.91–65.93** — IA authorization, scope, and currency
- **14 CFR §91.409(a)** — Annual inspection, IA required for RTS
- **14 CFR §145.201** — Part 145 authorized personnel and scope requirements
- **14 CFR §145.219** — Part 145 records retention (2 years minimum)
- **AC 120-78B** — Electronic signatures in aviation maintenance records, full document
- **AC 43-9C §6** — Minimum content requirements for maintenance record entries
- **FAA Order 8300.10** — Airworthiness Inspector's Handbook

### 4.5 Part 145 Scoping

For Part 145 repair stations (organizations with `part145CertificateNumber` set), per-signature IA re-auth applies with one addition: the `repairStationAuthorizations` check (PRECONDITION 6 in `authorizeReturnToService`) must confirm that the IA's authorization to sign under the station's certificate is current. This is not a new check — it is already in PRECONDITION 6 — but WS15-B documents it explicitly as part of the AC 120-78B compliance mapping. The IA currency gate (Section 3.7) adds the `iaNumber` presence check, which also applies in Part 145 context.

### 4.6 Written AC 120-78B Technical Statement (for Dale Renfrow's Records)

> *This statement is produced per Dale Renfrow's explicit request during his SME embed intake. It is a plain-language technical statement suitable for attachment to his personal regulatory file. It describes how Athelon satisfies AC 120-78B specifically and technically.*

**To:** Dale Renfrow, IA-2011-04883, Mesa Ridge Aviation, Grand Junction CO  
**Re:** Athelon Platform — AC 120-78B Technical Compliance Statement  
**Version:** WS15-B v1.0 — 2026-02-22

Athelon's electronic signature mechanism for IA-level return-to-service sign-offs satisfies AC 120-78B as follows:

**Unique Identification (§4.a):** Each IA sign-off produces a `signatureAuthEvent` document. At event creation (server-side, via Clerk `session.reAuthenticated` webhook), the following are snapshotted and stored: the technician's legal name, A&P certificate number, and IA number. These values are immutable — they reflect the identity at the moment of authentication, not at the time of record retrieval. The `returnToService` record stores both the A&P certificate number and the IA number as distinct fields (`iaCertificateNumber`, `iaNumber`), satisfying §4.a.2.

**Unauthorized Use Controls (§4.b):** Every IA sign-off triggers a fresh authentication event. There is no "stay authenticated" path. The `signatureAuthEvent` has a 5-minute TTL enforced server-side; it cannot be extended by the client. The authentication method must be a 6-digit PIN (biometric-only is explicitly rejected via a 422 response from the server). No event can be consumed more than once — the `consumed` flag is checked server-side in the signing mutation before any record is written.

**Binding to Specific Record (§4.c):** Each `signatureAuthEvent` carries an `intendedTable` field identifying the table it may be used to sign. A sign-off mutation rejects any event whose `intendedTable` does not match. The event's `consumedByRecordId` is set atomically when the signed record is created, permanently linking the authentication event to the specific record.

**Timestamp Accuracy (§5.a):** All timestamps are set server-side. `signatureAuthEvent.authenticatedAt` is set at the moment of Convex HTTP action execution following Clerk's webhook delivery — not at session login, not at page load, not at client clock. `returnToService.returnToServiceDate` is set at the moment the signing mutation commits. Client-reported timestamps are not trusted.

**Record Integrity (§5.b):** A SHA-256 hash of the canonical JSON serialization of all required RTS fields is computed inside the signing mutation before the record is inserted. This hash is stored in `returnToService.signatureHash`. The same hash is printed in full on the face of any PDF export of the record (64 hexadecimal characters, monospaced). Any post-insert alteration to the record would produce a different recomputed hash while the stored hash remains the original, providing detectable evidence of tampering.

**Audit Trail Independence (§5):** Two independent `auditLog` entries are produced for every IA sign-off: one at `signatureAuthEvent` creation (authentication event) and one at `returnToService` record creation (signing event). These are separate documents linked by `signatureAuthEventId`. They can be compared and cross-verified. The audit log is append-only and immutable.

**Alteration Control (§5.d):** The `returnToService` table has no update mutation. Any change to a signed record requires a correction record to be created. The correction record captures: the original field value, the corrected value, the corrector's identity and certificate number, the reason for the correction, and the timestamp. The original signed record remains accessible and distinguishable from the corrected state.

**Accessibility (§5.c):** Any signed record is retrievable within 2 minutes from any internet-connected device, with no archive restoration process required.

This statement describes the design as specified in WS15-B v1.0. Verification that the implementation matches this specification is documented in the test plan (Section 5). Marcus Webb (former FAA ASI, Atlanta FSDO) has reviewed the compliance mapping.

*Issued by Athelon engineering team — 2026-02-22*  
*Regulatory review: Marcus Webb, former FAA Aviation Safety Inspector*

---

## Section 5 — Test Plan

**Authored by:** Cilla Oduya (QA Engineer)  
**Compliance clearance:** Marcus Webb (Regulatory)  
**Scope:** Per-signature IA re-authentication — all surfaces, all failure modes, concurrency, and boundary conditions.

> *"I wrote this test plan by imagining the moment an FSDO inspector asks 'Can you prove who signed this record, when, and that they read what they were signing?' Every test case below is a direct answer to a specific version of that question. I don't write test plans that pass when things go right. I write test plans that fail when things go wrong."*
> — Cilla Oduya

> *"The tests marked [HARD BLOCK] are the ones that kept me up at night when I was an ASI. If any of those fail, the feature does not ship. Not even to staging."*
> — Marcus Webb

### 5.1 Coverage Matrix

| Coverage Area | Test IDs | Count |
|--------------|----------|-------|
| Happy path — full IA sign-off end-to-end | RA-01 | 1 |
| Pre-auth summary rendering (deliberateness) | RA-02, RA-03, RA-04 | 3 |
| IA currency hard gate | RA-05, RA-06, RA-07 | 3 |
| Per-signature freshness (no session reuse) | RA-08, RA-09 | 2 |
| Biometric-only rejection | RA-10 | 1 |
| TTL expiry enforcement | RA-11, RA-12 | 2 |
| Interrupted flow / fail-closed | RA-13, RA-14 | 2 |
| Audit trail independence | RA-15, RA-16 | 2 |
| Record immutability | RA-17 | 1 |
| Concurrency | RA-18, RA-19 | 2 |
| A&P vs. IA scope isolation | RA-20, RA-21 | 2 |
| Dale Renfrow acceptance protocol | RA-22, RA-23 | 2 |
| **Total** | | **23** |

### 5.2 Test Cases

---

**RA-01 — Happy Path: Complete IA Annual Sign-Off**  
*[PASS criterion for OBJ-01 through OBJ-15 integration]*

**Setup:** Active IA technician (iaExpiryDate = March 31 next year; lastExercisedDate = 3 months ago; iaNumber set); work order type `annual_inspection` in `pending_signoff`; all 9 preconditions in `authorizeReturnToService` satisfied.  
**Scenario:** IA navigates to sign-off flow. Pre-auth summary renders. Dwell timer elapses. PIN (6 digits) entered. Authentication completes. Signing mutation executes. Record committed.  
**PASS:** `signatureAuthEvent` created with `consumed: false`, `expiresAt: authenticatedAt + 300_000`, `authMethod: "pin"`, `technicianId` and `authenticatedCertNumber` correct; `authorizeReturnToService` executes; `consumed: true`, `consumedAt` set, `consumedByTable: "returnToService"`, `consumedByRecordId` = created RTS ID; `returnToService.iaCertificateNumber` and `returnToService.iaNumber` both populated; `returnToService.signatureHash` is SHA-256 of canonical JSON; two independent `auditLog` entries (event created + record signed) present; work order `status: "closed"`; aircraft `status: "airworthy"`; post-sign committed record view renders within 2 seconds with signatureHash in full.  
**FAIL:** Any required field absent; single audit entry for both events; WO not closed; aircraft not updated; post-sign view shows prettified rather than stored values.  
**Regulatory basis:** §43.9(a)(4), §43.11(a)(5), AC 120-78B §4, §5, §5.a.  

---

**RA-02 — Pre-Auth Summary: PIN Field Disabled During Dwell**  
*[PASS criterion for OBJ-04, OBJ-14] [HARD BLOCKER per OBJ-04]*

**Setup:** Active IA; work order in `pending_signoff`.  
**Scenario:** IA opens re-auth modal. The pre-auth summary renders. IA immediately attempts to interact with the PIN field (click, keyboard tab, or programmatic focus via devtools).  
**PASS:** PIN field is non-interactive (visually and programmatically disabled; `aria-disabled: true`, `tabIndex: -1`); countdown timer is visible ("Authentication available in: X"); PIN field does not accept input until timer reaches 0.  
**FAIL:** PIN field is focusable or accepts any input before the 5-second dwell timer elapses.  
**Regulatory basis:** AC 120-78B §4.b (unauthorized use controls — including inadvertent use); SME brief FM-01.  

---

**RA-03 — Pre-Auth Summary: Scroll Confirmation on Long Record**  
*[PASS criterion for OBJ-14]*

**Setup:** Work order with 20 task cards, full discrepancy list, and long RTS statement. Pre-auth summary exceeds viewport height (confirmed `scrollHeight > clientHeight`).  
**Scenario:** IA opens re-auth modal. Summary is long. IA does not scroll. Dwell timer elapses.  
**PASS:** PIN field remains disabled after dwell timer; scroll-completion checkbox is visible at the bottom of the scrollable area and unchecked; PIN field activates only after both (a) dwell timer elapsed AND (b) scroll-completion checkbox checked.  
**FAIL:** PIN field activates based only on dwell timer without scroll confirmation; or scroll confirmation checkbox is absent on long summaries.  
**Regulatory basis:** AC 120-78B §4.b; SME brief Section 2.4 anti-rubber-stamp control #3.  

---

**RA-04 — Pre-Auth Summary: All Required Fields Present**  
*[PASS criterion for OBJ-04] [HARD BLOCKER]*

**Setup:** Existing IA technician with all fields populated in `certificates` table.  
**Scenario:** IA opens re-auth modal. Pre-auth summary renders.  
**PASS:** All of the following are present and non-empty in the rendered summary, sourced from server data (not client state): aircraft N-number; make/model/serial; work order type; total time at close; specific inspection item / task description; regulatory citation (full text of applicable template per §43.9 or §43.11); date (server clock); IA legal name; A&P certificate number; IA number; IA expiry date with currency status.  
**FAIL:** Any field absent; any field populated from client state rather than server-verified data; regulatory citation truncated or absent.  
**Regulatory basis:** §43.9(a)(4), §43.11(a)(5), AC 120-78B §4.a, §4.a.2.  

---

**RA-05 — IA Currency Gate: Expired IA (March 31 rule)**  
*[PASS criterion for OBJ-06] [HARD BLOCKER]*

**Setup:** IA technician with `certificate.iaExpiryDate` set to yesterday's date (expired).  
**Scenario:** IA attempts to open the re-auth modal for an annual inspection RTS.  
**PASS:** `validateIaCurrencyBeforeModal` query returns `allowed: false, code: "IA_EXPIRED"`; hard block screen renders (not re-auth modal); specific message: "Your Inspection Authorization expired on [date]. Renew at your district FSDO before signing."; no PIN field rendered; no `signatureAuthEvent` created; `auditLog` entry: `access_denied`, reason: `IA_EXPIRED`.  
**FAIL:** Re-auth modal renders for an expired IA; any path to credential entry exists; IA can complete sign-off after expiry.  
**Regulatory basis:** §65.92, §65.93; Phase 2 signoff-rts-flow Section 1.3 ("hard throw, no grace period, no override").  

---

**RA-06 — IA Currency Gate: Recent Experience Lapsed (24-month rule)**  
*[PASS criterion for OBJ-06] [HARD BLOCKER]*

**Setup:** IA technician with `certificate.lastExercisedDate` set 25 months ago.  
**Scenario:** IA attempts to open re-auth modal.  
**PASS:** Hard block screen renders with code `IA_RECENT_EXP_LAPSED`; specific message per §65.83; no credential entry path; `auditLog` entry logged.  
**FAIL:** Re-auth modal renders; IA can proceed.  
**Regulatory basis:** 14 CFR §65.83.  

---

**RA-07 — IA Currency Gate: IA Number Absent from Records**  
*[PASS criterion for OBJ-06] [HARD BLOCKER]*

**Setup:** IA technician with `hasIaAuthorization: true`, `iaExpiryDate` in future, but `iaNumber` field is null/empty.  
**Scenario:** IA attempts to open re-auth modal.  
**PASS:** Hard block screen renders with code `IA_NUMBER_MISSING`; message: "Your IA number is not recorded in the system. Contact your DOM to update your certificate record before signing."; `auditLog` logged; no credential entry.  
**FAIL:** Re-auth modal renders with missing IA number; sign-off can proceed without `iaNumber` stored.  
**Regulatory basis:** §43.11(a)(5); AC 120-78B §4.a.2; SME brief Section 2.3.  

---

**RA-08 — Per-Signature Freshness: Second IA Sign-Off Requires New Auth**  
*[PASS criterion for OBJ-03]*

**Setup:** Active IA. Work order A and Work order B both in `pending_signoff` in the same session.  
**Scenario:** IA signs Work order A successfully (consuming `signatureAuthEvent` A). Without re-authenticating, attempts to sign Work order B using the same session.  
**PASS:** No valid `signatureAuthEvent` exists for Work order B sign-off; `getPendingForCurrentUser` returns `null` (event A was consumed); re-auth modal re-enters Phase 1 (waiting state); IA must re-authenticate. No mechanism allows Work order B to be signed without a new PIN entry.  
**FAIL:** Work order B can be signed without a new authentication event; consumed event is reusable; session state carries signing authorization.  
**Regulatory basis:** AC 120-78B §4.b; OBJ-03; SME brief Section 2.4 anti-rubber-stamp control #1.  

---

**RA-09 — Per-Signature Freshness: Event Consumed Flag Prevents Reuse**  
*[PASS criterion for OBJ-02, OBJ-03]*

**Setup:** A `signatureAuthEvent` with `consumed: true` exists in the database (from a prior successful sign-off).  
**Scenario:** A direct API call to `authorizeReturnToService` (bypassing UI) with the consumed event's ID.  
**PASS:** Mutation throws `IA_AUTH_EVENT_CONSUMED` (or equivalent); no new `returnToService` record is created; `auditLog` entry: `access_denied`, reason: `IA_AUTH_EVENT_CONSUMED`.  
**FAIL:** Mutation accepts the consumed event; a second `returnToService` record is created.  
**Regulatory basis:** AC 120-78B §4.b; OBJ-02.  

---

**RA-10 — Biometric-Only Rejection**  
*[PASS criterion for OBJ-05] [HARD BLOCKER]*

**Setup:** Active IA with biometric auth configured in Clerk. Work order in `pending_signoff`.  
**Scenario:** IA initiates sign-off. In the Clerk re-auth flow, authenticates using Face ID / Touch ID only (no PIN entry). `session.reAuthenticated` webhook fires with `factor_one_verification.strategy` mapping to `"biometric"`.  
**PASS:** Convex HTTP action returns HTTP 422 with error `IA_AUTH_BIOMETRIC_ONLY_REJECTED`; no `signatureAuthEvent` created; `auditLog` entry: `access_denied`, reason: `IA_AUTH_BIOMETRIC_ONLY_REJECTED`; `useSignatureAuthEvent` hook times out; UI surfaces specific message: "Biometric authentication is not accepted for IA sign-offs. Please use your 6-digit PIN." (distinguished from generic timeout message).  
**FAIL:** Biometric-only authentication produces a valid `signatureAuthEvent`; IA can complete sign-off with Face ID only.  
**Regulatory basis:** AC 120-78B §4.b; OBJ-05; SME brief Section 2.4 anti-rubber-stamp control #2.  

---

**RA-11 — TTL Expiry: Backend Enforces 5-Minute Limit**  
*[PASS criterion for OBJ-09]*

**Setup:** A `signatureAuthEvent` with `expiresAt = Date.now() - 1000` (1 second expired).  
**Scenario:** Directly call `authorizeReturnToService` with the expired event ID (bypassing UI timer).  
**PASS:** Mutation throws `IA_AUTH_EVENT_EXPIRED`; event NOT consumed; no `returnToService` record created; `auditLog` entry: `access_denied`.  
**FAIL:** Mutation accepts an expired event; server relies on client-side timer rather than verifying `expiresAt` in the mutation.  
**Regulatory basis:** AC 120-78B §4.b; OBJ-09; Phase 3 auth wiring §1 ("TTLs are enforced by the backend").  

---

**RA-12 — TTL Expiry: UI Countdown and Expired-State Handling**  
*[PASS criterion for OBJ-09 — UI side]*

**Setup:** Active IA. Work order in `pending_signoff`. Valid `signatureAuthEvent` with `expiresAt = now() + 60_000` (1 minute).  
**Scenario:** IA authenticates. Event received. IA does not submit the signing mutation for 61 seconds (e.g., steps away from device). UI countdown expires.  
**PASS:** UI shows countdown starting from `expiresAt - now()`; at expiry, UI shows "Authentication expired. Please re-authenticate to continue."; if IA attempts to submit after UI expiry, mutation also rejects (backend independent); fresh re-auth required; no partial state.  
**FAIL:** UI countdown expires but signing mutation still accepts the event; or UI shows no expiry indication.  
**Regulatory basis:** OBJ-09; AC 120-78B §4.b.  

---

**RA-13 — Interrupted Flow: Network Drop After Credential Submission**  
*[PASS criterion for OBJ-08] [HARD BLOCKER]*

**Setup:** Active IA. Work order in `pending_signoff`.  
**Scenario:** IA submits PIN. Clerk processes re-auth. Webhook delivery begins. Simulate network drop (test harness intercepts webhook before Convex HTTP action receives it). IA's browser shows spinner for 10+ seconds.  
**PASS:** `useSignatureAuthEvent` hook times out after 10 seconds; `status: "timeout"` surfaced; UI message: "Authentication did not complete within the expected window. Your sign-off has NOT been recorded."; no `signatureAuthEvent` in DB; no `returnToService` record; `auditLog` entry: `access_denied`, reason: `IA_REAUTH_TIMEOUT`; "Try Again" remounts hook cleanly.  
**FAIL:** UI shows ambiguous state ("probably signed," no clear message); partial `signatureAuthEvent` exists in DB with ambiguous state; or `returnToService` record created without consumed event.  
**Regulatory basis:** OBJ-08; SME brief FM-02; Phase 3 auth wiring §2.2 error handling.  

---

**RA-14 — Interrupted Flow: Mutation Committed, Response Lost**  
*[PASS criterion for OBJ-08]*

**Setup:** Active IA. Work order in `pending_signoff`. All preconditions satisfied.  
**Scenario:** Mutation executes and commits (`returnToService` created, event consumed, WO closed). Response to client is lost in transit (network drop post-commit). Client receives no success confirmation. IA re-opens the work order.  
**PASS:** Work order shows `status: "closed"` with `returnToServiceId` set; UI displays: "This work order was returned to service at [timestamp] and has been closed. No further sign-off is required."; no duplicate sign-off possible (`RTS_ALREADY_SIGNED` thrown if attempted); no ambiguous state.  
**FAIL:** UI suggests the sign-off did not complete; IA can initiate a duplicate sign-off; or system shows "maybe signed" state.  
**Regulatory basis:** OBJ-08; Phase 2 signoff-rts-flow PRECONDITION 2 (`RTS_ALREADY_SIGNED`).  

---

**RA-15 — Audit Trail Independence: Two Separate Audit Entries**  
*[PASS criterion for OBJ-07]*

**Setup:** After RA-01 (successful sign-off).  
**Scenario:** Query `auditLog` for entries related to the work order.  
**PASS:** Exactly two separate `auditLog` documents exist for this sign-off chain: (1) `eventType: "record_created"`, `tableName: "signatureAuthEvents"`, with `userId`, `technicianId`, `authMethod`, IP, and UA; (2) `eventType: "record_signed"`, `tableName: "returnToService"`, with `technicianId`, `iaCertificateNumber`, `iaCurrentOnRtsDate`, `aircraftHoursAtRts`, `signatureHash`. The two documents are linked by `signatureAuthEventId` but are distinct records. No merging of authentication and signing events into a single document.  
**FAIL:** Authentication event and signing event share a single `auditLog` document; or one of the two events is absent.  
**Regulatory basis:** AC 120-78B §5; OBJ-07.  

---

**RA-16 — Audit Trail: Failed Attempts Logged**  
*[PASS criterion for OBJ-07]*

**Setup:** Work order in `pending_signoff`. IA triggers each of the following failures in sequence: `IA_EXPIRED`, `IA_AUTH_EVENT_CONSUMED`, `RTS_OPEN_TASK_CARDS`.  
**Scenario:** Three failed sign-off attempts on the same work order.  
**PASS:** `auditLog` contains one `access_denied` entry for each failure, each with: `userId`, `technicianId`, `workOrderId`, specific error code, and timestamp. Entries are in chronological order. Query by `workOrderId` returns all three.  
**FAIL:** Any failed attempt produces no audit entry; or error code is absent from the entry.  
**Regulatory basis:** AC 120-78B §5; Phase 2 signoff-rts-flow §6.6.  

---

**RA-17 — Record Immutability: No Update Mutation Exists**  
*[PASS criterion for OBJ-02, compliance requirement]*

**Setup:** Completed `returnToService` record (from RA-01).  
**Scenario:** Attempt to call any update mutation against the `returnToService` table. Attempt to patch `returnToService` directly via Convex admin panel. Attempt to call a hypothetical `updateReturnToService` mutation via direct API.  
**PASS:** No update mutation targeting `returnToService` exists in the codebase (verified via code audit); `returnToService` table has no `updatedAt` field; any `ctx.db.patch` on `returnToService` outside of the `authorizeReturnToService` transaction (which only patches `signatureAuthEvent`) is absent; any DB-level change to the record causes a hash mismatch on recompute.  
**FAIL:** An update mutation targeting `returnToService` exists; or `returnToService` records have been patched post-creation.  
**Regulatory basis:** AC 120-78B §5.d; Phase 2 signoff-rts-flow §3.1 ("immutable once created").  

---

**RA-18 — Concurrency: Two IAs Simultaneously Attempting RTS on Same Work Order**  
*[PASS criterion for OBJ-02]*

**Setup:** Work order in `pending_signoff`. Two IA users authenticated, both with valid `signatureAuthEvent` documents.  
**Scenario:** Both IAs submit `authorizeReturnToService` within 200ms of each other.  
**PASS:** Exactly one `returnToService` record is created; the second mutation throws `RTS_ALREADY_SIGNED`; the second IA's `signatureAuthEvent` remains unconsumed (`consumed: false`); both attempts logged in `auditLog`; no data corruption.  
**FAIL:** Two `returnToService` records created for the same work order; or an event is consumed without a corresponding record.  
**Regulatory basis:** Phase 2 signoff-rts-flow PRECONDITION 2 (`RTS_ALREADY_SIGNED`); Convex transaction atomicity.  

---

**RA-19 — Concurrency: Same IA, Two Rapid Submissions**  
*[PASS criterion for OBJ-02]*

**Setup:** Active IA. Valid `signatureAuthEvent` (unconsumed). Work order in `pending_signoff`.  
**Scenario:** IA double-clicks "Authenticate and Sign" (or network retry triggers a second identical mutation call within 100ms of the first).  
**PASS:** Exactly one `returnToService` record created; the second call receives `RTS_ALREADY_SIGNED` (WO now closed); event consumed exactly once. No duplicate records.  
**FAIL:** Two `returnToService` records created; event consumed twice.  
**Regulatory basis:** Convex mutation idempotency; OBJ-02.  

---

**RA-20 — Scope Isolation: A&P Event Cannot Satisfy IA Requirement**  
*[PASS criterion for OBJ-03 — cross-scope isolation]*

**Setup:** Work order type `annual_inspection` (IA required). A&P technician (no IA) completes a PIN re-auth; `signatureAuthEvent` created with `intendedTable: "taskCardStep"` (A&P scope).  
**Scenario:** Direct API call to `authorizeReturnToService` with the A&P-scope event ID.  
**PASS:** Mutation throws `RTS_IA_REQUIRED` (technician lacks IA) AND `RTS_AUTH_EVENT_WRONG_TABLE` (intendedTable mismatch — mutation validates both); no `returnToService` record created; event unconsumed.  
**FAIL:** A&P event satisfies IA RTS requirement; intendedTable mismatch not caught.  
**Regulatory basis:** §65.91; Phase 2 signoff-rts-flow PRECONDITION 6; Section 3.2 scope boundary rule.  

---

**RA-21 — Scope Isolation: intendedTable Validated at Consumption**  
*[PASS criterion for Section 3.2 scope boundary rule]*

**Setup:** Active IA. `signatureAuthEvent` created with `intendedTable: "returnToService"`.  
**Scenario:** Attempt to use the RTS-scoped event to sign a task card step (`signTaskCardStep` mutation).  
**PASS:** `signTaskCardStep` mutation throws `IA_AUTH_EVENT_WRONG_TABLE` (intendedTable is `returnToService`, not `taskCardStep`); event unconsumed; no step sign-off record created.  
**FAIL:** Event used to sign a task card step despite being scoped for RTS; intendedTable not validated in task card step mutation.  
**Regulatory basis:** Section 3.2 scope boundary rule; AC 120-78B §4.c.  

---

**RA-22 — Dale Renfrow Acceptance Test A: End-to-End Simulated Annual**  
*[PASS criterion for OBJ-13] — Must be run by Dale Renfrow personally*

**Setup:** Test environment with a synthetic work order matching a King Air C90 annual inspection: 15 task cards (all complete), 3 discrepancies (2 corrected, 1 MEL-deferred), 4 installed parts, IA RTS signed, QCM reviewed. Dale's test account has all fields populated.  
**Scenario:**  
1. Dale opens work order, reviews all content.  
2. Initiates sign-off flow.  
3. Navigates sign-off wizard Steps 1–4.  
4. Opens re-auth modal. Reads full pre-auth summary. Dwell timer elapses. Enters 6-digit PIN.  
5. Receives authentication confirmation. Submits signing mutation.  
6. Views committed record in post-sign display.  
7. Exports printed copy (PDF via WS15-A print route).  
8. An Athelon engineer (unfamiliar with the record) opens the same record and attempts to locate, without guidance: IA number, date, regulatory citation, description of work, authentication event log.  
**PASS:** Engineer locates all five items within 3 minutes; all items are correct and match Dale's inputs; PDF export contains all required fields (per WS15-A export spec). Dale states "PASS" in writing.  
**FAIL:** Any required item not locatable within 3 minutes; any field mismatch; Dale does not provide written PASS statement.  
**Regulatory basis:** OBJ-13; SME brief Section 2.6.  

---

**RA-23 — Dale Renfrow Acceptance Test B: Interrupted Flow (run twice)**  
*[PASS criterion for OBJ-13] — Must be run by Dale Renfrow personally, twice*

**Setup:** Test environment. Dale's test account. Work order in `pending_signoff`.  
**Scenario (run twice):**  
1. Dale initiates sign-off flow. Reaches credential entry phase.  
2. After PIN submission (Clerk processes re-auth), Dale or a test engineer interrupts the flow: kill the browser tab (test A) / kill network connection immediately after PIN submission but before modal confirms (test B).  
3. Dale re-opens the work order. Observes system state.  
**PASS (each run):** Work order is in `pending_signoff` (not closed); no `returnToService` record for this attempt; UI message: "Your previous sign-off attempt was not completed. The record was not created. You may begin a new sign-off."; fresh re-auth modal available; no ambiguous state; both runs produce PASS; Dale states "PASS" in writing for each.  
**FAIL:** Work order shows closed without a committed record; or "maybe signed" state displayed; or Dale cannot determine unambiguously whether a record was created.  
**Regulatory basis:** OBJ-13; SME brief Section 2.6; OBJ-08.  

---

### 5.3 Marcus Webb Compliance Pre-Release Checklist

> *"These items are in addition to the test cases above. The test cases verify behavior. These items verify regulatory completeness."*

| Item | Description | Regulatory Basis | Hard Blocker |
|------|-------------|-----------------|--------------|
| MWC-B-01 | `returnToService.iaNumber` is a distinct required field from `returnToService.iaCertificateNumber`; verified in schema code review and in RA-01 execution | §43.11(a)(5); AC 120-78B §4.a.2 | **YES** |
| MWC-B-02 | `returnToService.signatureHash` is SHA-256 of canonical JSON, computed before insert, includes ALL required fields; verify by independently recomputing hash from stored record | AC 120-78B §5.b | **YES** |
| MWC-B-03 | `signatureAuthEvent.authenticatedAt` is server-set, not client-reported; verify by comparing value to client clock at known offset | AC 120-78B §5.a | **YES** |
| MWC-B-04 | RA-05 passes without exception — an expired IA cannot reach credential entry under any code path | §65.92, §65.93 | **YES** |
| MWC-B-05 | RA-10 passes — biometric-only is rejected at the server level, not only in UI | AC 120-78B §4.b; SME requirement | **YES** |
| MWC-B-06 | RA-09 passes — consumed events are rejected by the mutation, not only prevented by the UI | AC 120-78B §4.b | **YES** |
| MWC-B-07 | Pre-auth summary is rendered from server-verified data (not client state); any field that is missing from the server record causes an explicit error, not a blank field | AC 120-78B §4 | **YES** |
| MWC-B-08 | Written AC 120-78B technical statement (Section 4.6) is present in this artifact and available to provide to Dale Renfrow | AC 120-78B; SME requirement | **YES** |
| MWC-B-09 | RA-22 and RA-23 run with Dale Renfrow personally; written PASS statements obtained | Operational validation | **YES** |
| MWC-B-10 | `returnToService` table has no update mutation; verified in code review; any `ctx.db.patch` on this table is absence-verified | AC 120-78B §5.d | **YES** |
| MWC-B-11 | Code review confirms: `intendedTable` validated in every signing mutation that consumes a `signatureAuthEvent` | AC 120-78B §4.c | YES |
| MWC-B-12 | FM-06 mitigation in place: IA-named pending queues not visible to non-IA shop staff; verified in UI review | SME requirement; operational safety | YES |
| MWC-B-13 | `auditLog` includes IP address and user agent from `signatureAuthEvent` creation for all IA sign-offs | AC 120-78B §5 | YES |

---

## Section 6 — Open Issues, Risks, and Mitigations

### 6.1 Open Issues

| ID | Issue | Owner | Priority | Resolution Path |
|----|-------|-------|----------|-----------------|
| OI-B-01 | 6-digit PIN minimum enforcement in Clerk PIN configuration: Clerk's PIN configuration must be set to enforce ≥6 digits for IA-scope re-auth flows. Confirm that Clerk's custom PIN flow supports per-flow minimum length, or that Athelon's PIN input component enforces the floor before calling Clerk. | Jonas Harker | HIGH | Jonas to verify with Clerk documentation and test in staging. If Clerk PIN cannot be scoped per flow, the 6-digit floor must be enforced in the Athelon PIN input component with client + server validation. |
| OI-B-02 | Biometric-only detection in Clerk webhook payload: The `factor_one_verification.strategy` field must reliably distinguish biometric-primary from PIN+biometric (MFA). Confirm mapping with Clerk's latest SDK and webhook event shape. | Jonas Harker | HIGH | Jonas to validate in Clerk test mode: trigger FaceID-only auth, inspect webhook payload `factor_one_verification.strategy` value. Document mapping before implementation of Section 3.5 rejection logic. |
| OI-B-03 | `intendedTable` field on `signatureAuthEvent`: The Phase 3 spec does not explicitly include an `intendedTable` field on the `signatureAuthEvent` table. This must be added to the schema before Section 3.2 scope isolation can be implemented. | Devraj Anand | HIGH | Schema migration: add `intendedTable: v.union(v.literal("returnToService"), v.literal("taskCardStep"), v.literal("maintenanceRecord"))` to `signatureAuthEvents` table definition. This is a non-breaking addition. |
| OI-B-04 | `lastExercisedDate` field on `certificates` table: The IA currency gate (Section 3.7 check 3) requires `certificate.lastExercisedDate`. Verify this field exists in the schema and is populated. | Devraj Anand | HIGH | Schema audit. If absent: add field + UI for DOM to record last exercise date per IA holder. Populated at each IA sign-off by the signing mutation. |
| OI-B-05 | Scroll detection reliability on mobile: The scroll-completion checkbox (Section 3.4 anti-rubber-stamp control) relies on `scrollHeight > clientHeight` comparison. On some mobile browsers and tablets with virtual keyboards, viewport height is inconsistent. | Chloe Park | MEDIUM | Chloe to test on iPad (primary shop device) and Pixel/Samsung Android (secondary). If scroll detection unreliable, fallback: require explicit "I have read this certification" checkbox on all IA sign-offs regardless of scroll state. This is the more conservative option and may be the better default. |
| OI-B-06 | Post-sign stored-format display latency: OBJ-10 requires the committed record to be displayed within 2 seconds. Convex reactive queries will push the new record to the subscribing client. On a slow connection (shop WiFi), this may exceed 2 seconds. | Jonas Harker | LOW | Jonas to measure P95 latency for Convex subscription push on a throttled connection (simulated 5 Mbps). If P95 exceeds 2s: increase display target to "as fast as possible, max 5s" and surface a loading state explicitly. Do not display a static confirmation without the actual record data. |
| OI-B-07 | Dale Renfrow's acceptance test timing: RA-22 and RA-23 require Dale to run tests personally in a staging environment. His availability and scheduling must be coordinated. | Nadia Solis (PM) | MEDIUM | Nadia to schedule with Dale's shop coordinator at Mesa Ridge Aviation. Target: 2-week lead time after staging deployment of WS15-B. Dale confirmed willingness to participate if it's earned. |

### 6.2 Risks

| ID | Risk | Likelihood | Severity | Mitigation |
|----|------|------------|----------|------------|
| RSK-B-01 | Biometric detection in Clerk webhook payload changes between SDK versions | Medium | High | Pin Clerk SDK version in `package.json`; document current behavior at implementation time; add regression test that validates biometric webhook payload shape in CI (RA-10 must run in CI). |
| RSK-B-02 | Dwell timer perceived as friction by non-IA users | Low | Low | WS15-B dwell timer applies only to IA-scope sign-offs. Non-IA task card step sign-offs use the lighter re-auth path (no dwell timer). Ensure `signOffRequiresIa` flag is correctly set only on IA-flagged steps. |
| RSK-B-03 | Dale Renfrow does not provide written PASS statement after acceptance tests | Low | High | If Dale identifies a genuine failure, it is a feature bug — fix and re-run. If Dale's concern is not reproducible by the test infrastructure, escalate to Marcus for compliance adjudication. Do not ship without his written statement (OBJ-13 is not waivable). |
| RSK-B-04 | Convex `intendedTable` schema migration affects existing Phase 3 auth pipeline | Low | Medium | `intendedTable` is additive to `signatureAuthEvents`. Existing consumers of `signatureAuthEvent` (A&P task step sign-offs) must be updated to pass `intendedTable: "taskCardStep"`. Devraj to audit all existing `signatureAuthEvent` creation paths before migration. Backward compatibility: existing events without `intendedTable` must be treated as legacy (A&P scope) for a defined window, then the field becomes required. |
| RSK-B-05 | Shop network latency causes false timeout in `useSignatureAuthEvent` hook | Medium | Medium | 10-second timeout is the current spec. Jonas to measure Convex push latency from a simulated shop environment (intermittent WiFi). If P99 approaches 10s, consider extending timeout to 15s for IA-scope events (with explicit countdown displayed). Do not extend to > 30s — the MAX_AGE_MS guard would need updating too. |
| RSK-B-06 | IA signs under expired authorization due to stale cert data in Convex | Low | Critical | `validateIaCurrencyBeforeModal` is a live query that reads the current `certificate` document at sign-off initiation. If the certificate was updated (expired) between WO open and sign-off, the block triggers. Risk: cert update lag. Mitigation: DOM can revoke IA authorization manually; the mutation PRECONDITION 6 also checks at execution time, providing a second guard even if the pre-modal check is stale. |

### 6.3 Dependencies

| Dependency | Status | Blocking? |
|-----------|--------|-----------|
| Phase 14 PASS | ✅ Complete | No |
| Phase 3 auth platform (`signatureAuthEvent` table, webhook pipeline) | ✅ Built | No — WS15-B builds on top |
| Phase 2 `authorizeReturnToService` mutation (9 preconditions) | ✅ Built | No — WS15-B adds to existing preconditions |
| `intendedTable` schema field on `signatureAuthEvents` (OI-B-03) | ⬜ Not started | YES — blocks RA-20, RA-21 |
| `lastExercisedDate` field on `certificates` (OI-B-04) | ⬜ TBD — verify exists | YES — blocks RA-06, OBJ-06 |
| WS15-A PDF export (post-sign export reference in RA-22) | ⬜ In progress | Partial — RA-22 can run without WS15-A if print route is available |
| Dale Renfrow availability for RA-22/RA-23 (OI-B-07) | ⬜ Not scheduled | YES — blocks OBJ-13 |

---

## Section 7 — Final Status Block

### 7.1 Workstream Readiness Judgment

**Status: READY FOR BUILD — Pending implementation and test execution of build-phase objectives**

**What is complete:**
- Objective checklist (Section 1): 3 of 15 items PASS at design phase (OBJ-01, OBJ-11, OBJ-12). Remaining 12 are PENDING BUILD — all criteria are defined.
- SME brief (Section 2): Complete. Dale Renfrow's requirements documented in full, with direct paraphrases. Anti-rubber-stamp controls, AC 120-78B constraints, failure mode risks, and formal acceptance protocol all documented.
- Implementation spec (Section 3): Complete and actionable. Flow, trigger conditions, token/session model, timeout rules, fallback behavior all specified.
- Compliance mapping (Section 4): Complete. All AC 120-78B sections traced to specific design decisions. Gaps from prior phases identified and closed. Written technical statement for Dale Renfrow's records produced (Section 4.6).
- Test plan (Section 5): Complete. 23 test cases authored by Cilla Oduya. Pre-release checklist by Marcus Webb. Both attributed per Phase 15 policy.
- Open issues (Section 6): 7 open issues documented with owners and resolution paths. 6 risks documented with mitigations.

**What is not yet complete (requires build):**
- OBJ-02 through OBJ-10, OBJ-13–14: implementation and test execution
- OI-B-01 through OI-B-07: resolution during build phase
- Dale Renfrow acceptance tests (RA-22, RA-23): requires staging deployment + scheduling

**Readiness for build:** HIGH. The design is fully specified, SME input is integrated, and the compliance basis is documented. The implementation team (Jonas Harker, Chloe Park, Devraj Anand) has sufficient specification to begin without additional design sessions. Marcus Webb and Cilla Oduya are ready to execute compliance review and test execution against the first staging deployment.

### 7.2 Sprint Allocation Estimate

**2 weeks** for primary implementation.  
**1 additional week** for RA-22/RA-23 (Dale Renfrow acceptance tests) — scheduling-dependent.  
**Owner for delivery:** Jonas Harker (auth platform / webhook hardening), Chloe Park (re-auth modal, pre-auth summary, anti-rubber-stamp UI), Devraj Anand (schema migration OI-B-03/04, `validateIaCurrencyBeforeModal` query).

### 7.3 Cited Evidence References

| Reference | Location |
|-----------|----------|
| Dale Renfrow SME profile (source of Section 2 content) | `phase-5-repair-station/ia/ia-profile.md` |
| Phase 3 auth platform architecture (base architecture) | `phase-3-auth/auth-platform-wiring.md` |
| Phase 2 sign-off flow (9 preconditions, RTS mutation spec) | `phase-2-signoff/signoff-rts-flow.md` |
| WS15-A PDF export (post-sign export, hash on face of document) | `phase-15-rd/ws15-a-pdf-export.md` |
| SIMULATION-STATE.md (Phase 15 mission, WS15-B scope, SME assignment) | `SIMULATION-STATE.md` |
| Pat DeLuca interview (RTS offline, accessibility requirements) | `phase-5-repair-station/ia/pat-deluca-interview.md` |
| Phase 14 gate review (PASS basis) | `reviews/phase-14-gate-review.md` |
| AC 120-78B (governing advisory circular) | FAA Advisory Circular 120-78B |
| 14 CFR §43.9, §43.11, §65.83, §65.91–65.93 | eCFR Title 14 |

### 7.4 Sign-Off Record (pending)

| Role | Person | Status |
|------|--------|--------|
| SME (IA) | Dale Renfrow, IA-2011-04883, Mesa Ridge Aviation | ⬜ Written PASS pending RA-22/RA-23 |
| QA Author | Cilla Oduya | ✅ Test plan authored (this document) |
| Compliance Review | Marcus Webb | ⬜ Pre-release checklist execution pending build |
| Platform Implementation | Jonas Harker | ⬜ Pending build |
| Frontend Implementation | Chloe Park | ⬜ Pending build |
| Backend Implementation | Devraj Anand | ⬜ Pending build |

---

*Filed: 2026-02-22 | Athelon Phase 15 — WS15-B Per-Signature IA Re-Authentication Closure*  
*SME brief precedes implementation spec, per Phase 15 Execution Policy §1.*  
*SIMULATION-STATE.md not modified. Artifact written to: `phase-15-rd/ws15-b-ia-reauth.md`*
