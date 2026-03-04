# WS15-N — Phase 15 Gate-Blocker Closure Report

**Phase:** 15
**Workstream:** WS15-N
**Document Type:** Gate-blocker closure and admissibility recompute
**Date (UTC):** 2026-02-22
**Primary Author:** Cilla Oduya (QA Lead)
**Regulatory Inline Review:** [MARCUS] Marcus Webb
**Backend Inline Annotations:** [DEVRAJ] Devraj Anand
**Platform Inline Annotations:** [JONAS] Jonas Harker
**Authority Base:** WS15-M.0 Pre-Gate Integration Checkpoint (2026-02-22)
**Purpose:** Close or formally scope the five explicit gate blockers (BKR-01..BKR-05) from
WS15-M.0 §6.1 and recompute the Phase 15 Gate Review admissibility function.

---

## 0) Cilla framing

[CILLA] This document is a gate-control artifact. It is not a progress narrative.

[CILLA] The five blockers named in WS15-M.0 §6.1 each carry a required closure proof.
Evidence rules from WS15-M.0 §0 remain binding: `CLOSED` requires artifact-level execution
proof; `PARTIAL` indicates design closure without implementation/test evidence; `OPEN` is a
hard gate-hold condition.

[MARCUS] Regulatory posture is unchanged: no speculative closure on compliance-critical paths.

[DEVRAJ] No implementation has been merged to mainline as of this checkpoint date.

[JONAS] Platform annotations reflect design-spike open items that gate implementation entry.

---

## 1) Blocker-by-Blocker Closure Ledger

### B-01 — Offline Identity Trust Boundary (D×B)
**BKR-01 required proof:** Deterministic offline auth TTL/replay decision implemented and tested.

**Evidence from ws15-d-offline.md:**
WS15-D provides a complete offline-first architecture: IndexedDB `signature_queue` schema with
`idempotencyKey`, dual-timestamp fields (`clientTimestamp` / `serverAckAt`), and `capturedOffline`
immutability requirement; `signTaskStepWithIdempotency` Convex mutation with five-phase handler
(idempotency check → auth event validation → step state check → hash verification → atomic write);
`replaySignatureQueue()` service worker sorted by `clientTimestamp`; two-tier auth TTL design
(5-minute standard / 48-hour `offlineCapable`); Marcus compliance hard-blocker checklist mapped
to AC 120-78B §5-4/5-5, 14 CFR §43.9(a)(4), FAA Order 8300.10 Ch. 9. Test plan TC-D-01 through
TC-D-12 fully specified, covering: happy path, Skyline duplicate prevention, idempotency dedup,
conflict detection, WO-hold rejection, auth expiry boundary, device-restart mid-sync, hash
mismatch path, ordering guarantee, and RTS block on pending (TC-D-11).

**WS15-D artifact status:** `NEEDS DESIGN SPIKE` — two spikes explicitly block build entry:
- **DS-1 (Owner: Tanya Birch):** Clerk PWA/service-worker offline token behavior. The 48-hour
  `offlineCapable` TTL is a design assumption until Clerk's offline SDK behavior is confirmed.
  Fallback: auth-at-reconnect re-challenge flow requiring separate compliance analysis.
- **DS-2 (Owner: [JONAS]):** Background Sync API support matrix for target hangar device fleet,
  specifically older iOS Safari versions. Fallback required before service worker is written.

**Status: `PARTIAL`**

Design quality is high and compliance architecture is defensible. Idempotency model, per-item sync
confirmation, and conflict resolution policy are non-controversial. However, DS-1 and DS-2 are
not cosmetic — until Clerk behavior is confirmed, the `offlineCapable` TTL is unproven, and
until the SW support matrix is resolved, the replay path has no confirmed operating surface in
the hangar device fleet. No test in TC-D-* has been executed.

[MARCUS] The 48-hour TTL requires a signed compliance argument that `offlineCapable` auth events
carry the same identity-verification rigor as standard online events. That argument is referenced
in WS15-D but not yet written. Both timestamps (`clientTimestamp` = deliberate act,
`serverAckAt` = record creation) must appear in every export record.

[JONAS] DS-2 is the higher-risk spike. iOS Safari 15/16 partial SW support likely forces a
foreground-reconnect polling fallback, changing the UX contract for per-item confirmation that
Troy Weaver's hangar-use requirement depends on.

**Artifacts cited:** `ws15-d-offline.md` §Architecture, §Mutations, §TestPlan, §ComplianceChecklist.
**Evidence gap:** DS-1 unresolved; DS-2 unresolved; no test logs; no implementation.

---

### B-02 — Offline Qualification Trust Boundary (D×J)
**BKR-02 required proof:** Policy and test evidence proving fail-closed behavior for
qualification-required actions when user is disconnected.

**Evidence from ws15-j-qual-alerts.md:**
OQ-03 (§9 Open Questions): "Offline behavior policy for cached assignments awaiting revalidation"
— listed as **explicitly open**. No resolution in the document. §3.5 (Assignment/RTS integration
policy) defines the online qualification precheck before WS15-B auth consume but is entirely
silent on offline context. Qualification state computation is server-side deterministic (D-03)
with no offline provision.

**Evidence from ws15-d-offline.md:**
The `offline_cache` `CachedTaskCard` schema does not include qualification state fields or
freshness expiry indicators. TC-D-11 tests RTS block on pending offline signatures, not
qualification validity during disconnected operation. No test in WS15-D addresses an offline
sign attempt where the signer's qualification expires during the offline window.

**Cross-artifact gap:** A mechanic who enters offline-capable sign mode with a qualification
expiring within the hour receives no block. The system has no mechanism to capture, bound, or
enforce qualification freshness for offline-captured signatures.

**Status: `OPEN`**

[CILLA] There is no policy document, no schema field, no mutation logic, and no test case
addressing offline qualification trust anywhere in the artifact set. OQ-03 names the gap and
leaves it open. This is a hard gate-hold condition.

[MARCUS] AC 120-78B and 14 CFR §43.9 require that a signer was currently authorized at the
moment of the act. Without a qualification snapshot at offline sign initiation, that authorization
cannot be proven. Required design: embed a `qualificationSnapshotAtOfflineAuth` in the
`signatureAuthEvents` record at offline-mode grant time (requires momentary connectivity),
capturing eval result and profile ref. Replay rejection rule: reject if qualification was expired
before `clientTimestamp`; accept if expiry falls between `clientTimestamp` and `serverAckAt`.

[DEVRAJ] Design estimate: `qualificationSnapshotAtOfflineAuth` schema addition plus offline-mode
grant mutation branch — 3 days after Marcus memo is finalized. Zero implementation exists today.

**Artifacts cited:** `ws15-j-qual-alerts.md` §9 (OQ-03), §3.5; `ws15-d-offline.md` §CachedTaskCard.
**Evidence gap:** No policy. No design. No schema. No tests. Gap is total.

---

### B-03 — Qualification Ordering Proof (B×J)
**BKR-03 required proof:** Integrated trace proving qualification precheck executes before
auth consume under pass and fail paths.

**Evidence from ws15-j-qual-alerts.md:**
§3.5 states explicitly: "RTS precheck: Re-evaluate signer qualification state just before sign
flow. If IA-required and IA not ACTIVE, block before WS15-B auth consume. If qualification PASS,
continue into WS15-B sequence." QALERT-18 is defined: "WS15-B auth success cannot bypass
qualification block." QALERT-04 is defined: "IA expired, RTS precheck returns
`QUALIFICATION_EXPIRED`." COMP-02 (§5.1) documents the required evidence: "precheck event +
block code traces." Build sequence B4 = "RTS precheck integration with WS15-B handoff" —
downstream of B1 (schema), B2 (threshold engine), B3 (assignment gate). None of B1–B4 built.

**From ws15-m-integration-suite.md:** B×J seam is `G` (Green) with note "conceptually correct
and coherent" — design alignment only.

**Status: `PARTIAL`**

The ordering control is explicit and unambiguous. The design is not disputed. QALERT-18 is the
right test. The fail path (auth event remains unconsumed when qualification blocks) is correctly
designed — J blocks before B consumes the token, preserving token integrity.

[MARCUS] Design sufficiency is accepted. Ordering is non-negotiable for sign-off defensibility
under 14 CFR §43.9(a)(4). I require QALERT-18 and QALERT-04 execution logs with trace IDs
confirming: (a) auth event `consumed = false` after qualification block; (b) no mutation side
effects on step state; (c) pass path then allows auth consume cleanly.

[DEVRAJ] QALERT-18/04 executable once B1–B3 complete. Estimated B4 build time: 3–4 days after
B1–B3. Integrated S5 scenario (J → B → I → A spine) follows B4 and requires staging environment.

**Artifacts cited:** `ws15-j-qual-alerts.md` §3.5, §6.2 (QALERT-04, QALERT-18), §5.1 COMP-02.
**Evidence gap:** QALERT-18/04 not executed. B1–B4 not built. No staging trace. No integrated run.

---

### B-04 — Expired Calibration Policy Not Finalized (F)
**BKR-04 required proof:** Signed policy + deterministic tests + audit trace.

**Evidence from ws15-f-test-equipment.md:**
WS15-F is the most advanced blocker artifact. Full data model (`testEquipment`,
`maintenanceRecordTestEquipmentLinks`) is specified with snapshot-at-use immutability, cal history
retention, quarantine hard block, and structured PDF export section. `linkTestEquipment` mutation
is specified but explicitly conditional on Marcus's expired-cal enforcement ruling (§Open Design
Questions Q1: "Hard block vs. advisory on expired cal? **Marcus will resolve.**"). WS15-F status:
`READY FOR BUILD` with one pre-build gate: "Marcus must rule on hard-block vs. advisory-with-override
policy before `linkTestEquipment` mutation is written." Marcus compliance hard-blockers (snapshot
immutability, quarantine/pending_cal block at API level, mandatory PDF section, 2-year history
retention) are independently verifiable and do not depend on this ruling. TC-F-01 through TC-F-10
specified, none executed.

**Status: `PARTIAL`**

Four of Marcus's five hard blockers are buildable now (snapshot immutability, quarantine block,
PDF section, cal history retention). The `linkTestEquipment` enforcement branch — specifically
TC-F-02 (reject without override) and TC-F-03 (link with override) — cannot be finalized until
the policy memo is signed. Everything else in WS15-F is unblocked.

[MARCUS] Policy ruling (pending formal memo `ws15-f-cal-policy-memo-v1.md` by 2026-02-28):
advisory with mandatory documented override for v1.1; hard block deferred to future revision.
Override requirements: minimum 30-character explanation, authorized-by IA or shop lead (not
mechanic self-authorization), QCM notification event required at override-link time. Memo will
ratify all five items and unblock `linkTestEquipment` finalization.

[DEVRAJ] Can begin TC-F-04 (quarantine block via direct API), TC-F-05 (snapshot immutability),
TC-F-07 (alert routing), TC-F-09 (quarantine link rejection), and TC-F-10 (cal history retention)
immediately without memo. TC-F-02/TC-F-03 wait on memo.

[JONAS] `CalExpiryNotificationSystem` Convex cron is independent of policy ruling — starting now.

**Artifacts cited:** `ws15-f-test-equipment.md` §OpenDesignQuestions Q1, §Mutations, §Status,
§ComplianceChecklist.
**Evidence gap:** Policy memo unsigned. `linkTestEquipment` not finalized. TC-F-02/03 blocked.
Zero TC-F-* test logs exist.

---

### B-05 — Pre-Close and Export Integrated Packet Not Proven (I+A+Producers)
**BKR-05 required proof:** Full bundle with hash verification and retrieval traceability
across all producing streams.

**Evidence survey:**
- `ws15-m-integration-suite.md` §1.4: A×I seam `G` ("hash + export chain-of-custody strongly
  aligned"); D×I seam `R` ("pre-close must treat pending sync as unresolved — close safety at
  risk until integrated"). Scenarios S1, S2, S5 defined, none executed.
- `ws15-d-offline.md`: TC-D-11 (RTS block on pending signatures) specified, not tested.
  D×I Red seam is the primary blocker for S2 validity.
- `ws15-f-test-equipment.md`: TC-F-08 (PDF export with equipment section) specified, not executed.
- `ws15-j-qual-alerts.md` §5.3: Audit bundle composition defined (QALERT-INDEX, QALERT-EVENTS,
  QALERT-HASH-MANIFEST, etc.); QALERT-16 (audit bundle reconstruction) defined, not executed.
- `ws15-k-rsm-ack.md` §5.3: Evidence bundle fully specified; TC-K-13 (hash manifest recompute)
  defined, not executed.
- CF-08 (WS15-M §5.2): Export render service architecture and artifact versioning decision
  open — [JONAS] owner. This decision gates meaningful export testing.

**Status: `OPEN`**

[CILLA] The design alignment between A (export) and I (pre-close) is the best in the matrix.
That alignment is real and relevant. It does not constitute a proven packet. No staging run
exists. No hash manifest has been generated. No retrieval test has been performed. The D×I seam
is still Red in the WS15-M matrix, and no artifact has closed it.

[CILLA] B-05 has a hard sequencing dependency on B-01. The integrated staging run for S2
(offline → close block → sync → close cleared) cannot produce valid pre-close evidence until
TC-D-11 is proven, which requires WS15-D implementation, which requires DS-1 and DS-2 to close.

[MARCUS] I will not accept a gate packet assembled on an unresolved offline trust boundary.
The packet must be constructed in full or not at all. Export integrity asserted on an uncertain
D×I seam is not a compliance assertion.

[DEVRAJ] Integrated staging environment requires D, J, F, and A components coordinated.
Estimated setup: 3–5 days after B-01 partial resolution and B-04 policy memo.

[JONAS] CF-08 architecture decision is mine. Committing to resolution by 2026-03-04. Render
service and supersession behavior decision will be issued as `ws15-a-render-arch-decision.md`.

**Artifacts cited:** `ws15-m-integration-suite.md` §1.4, §2.12; `ws15-d-offline.md` TC-D-11;
`ws15-f-test-equipment.md` TC-F-08; `ws15-j-qual-alerts.md` §5.3, QALERT-16;
`ws15-k-rsm-ack.md` §5.3, TC-K-13.
**Evidence gap:** No staging environment. No scenario executed. D×I Red unresolved. CF-08 open.
No hash manifest. No retrieval test.

---

### 1.6 Closure Ledger Summary

| Blocker | Label | Status | Decisive open items |
|---|---|---|---|
| B-01 | Offline identity trust boundary (D×B) | `PARTIAL` | DS-1 Clerk TTL unresolved; DS-2 iOS SW unresolved; no tests |
| B-02 | Offline qualification trust boundary (D×J) | `OPEN` | OQ-03 unresolved; no policy, design, schema, or tests |
| B-03 | Qualification ordering proof (B×J) | `PARTIAL` | QALERT-18/04 not executed; B1–B4 not built |
| B-04 | Expired calibration policy (F) | `PARTIAL` | Marcus memo unsigned; `linkTestEquipment` unfinalized; no test logs |
| B-05 | Pre-close + export integrated packet | `OPEN` | No staging run; D×I Red; CF-08 open; no hash manifest |

[CILLA] Two blockers remain `OPEN`. Under WS15-M.0 §4.3, any single open blocker is sufficient
to hold gate spawn. B-02 and B-05 are independently decisive.

---

## 2) Offline Trust-Boundary Controls Finalization

### 2.1 Policy requirements

**OTB-POL-01 — Identity freshness (D×B):**
The 48-hour `offlineCapable` TTL requires a signed compliance argument (referenced in WS15-D,
not yet written) that the deliberate-act standard of FAA Order 8300.10 Ch. 9 §9-48 is met by
PIN entry at `clientTimestamp` even when server acknowledgment is deferred. Contingent on DS-1
confirming Clerk SDK support. If DS-1 fails, a re-challenge fallback requires a separate analysis.

[MARCUS] I accept the framing: `clientTimestamp` = deliberate act; `serverAckAt` = record
creation. The 48-hour window is acceptable provided: (a) offline mode is explicit opt-in;
(b) identity-verification rigor is not reduced relative to standard online events; (c) both
timestamps appear in every export and audit record. Contingent on DS-1 result.

**OTB-POL-02 — Qualification freshness (D×J):**
At the moment a mechanic initiates offline-capable sign mode (requiring momentary connectivity),
the server must execute a real-time qualification precheck (WS15-J §3.5 logic). Result must be
embedded as `qualificationSnapshotAtOfflineAuth` in the `signatureAuthEvents` record.
If precheck returns BLOCK, offline mode is denied. Replay rejection rule: reject if qualification
expired before `clientTimestamp`; accept if expiry falls between `clientTimestamp` and
`serverAckAt`. This policy has no existing artifact — it is the gap that keeps B-02 OPEN.

[DEVRAJ] Schema addition required: `qualificationSnapshotAtOfflineAuth` in `signatureAuthEvents`.
New mutation branch on offline-mode grant entry flow. Implementation estimate: 3 days after
policy memo is agreed. No implementation exists today.

[JONAS] OTB-POL-02 requires momentary connectivity at offline-mode grant time. If the mechanic
is already offline when attempting to sign, offline-capable mode is unavailable. This UX
constraint requires explicit SME (Troy Weaver, Renata Solís) input and must be documented in
the policy memo.

### 2.2 Technical enforcement summary

| Control | Surface | Status |
|---|---|---|
| OTB-TC-01: Idempotency key dedup at server (TC-D-04) | `idempotencyKeys` table + mutation | Spec complete; not built |
| OTB-TC-02: Per-item sync confirmation, no batch message | `SyncConfirmationFeed` + SW | Spec complete; not built |
| OTB-TC-03: DuplicateSignatureGuard client-side IDB check | Component | Spec complete; not built |
| OTB-TC-04: `capturedOffline` immutability | Schema constraint | Spec complete; not built |
| OTB-TC-05: RTS block on pending signature (TC-D-11) | Pre-close gate | Spec complete; not built |
| OTB-TC-06: Qual precheck before offline-mode grant | New mutation branch | Not designed |
| OTB-TC-07: `qualificationSnapshotAtOfflineAuth` in auth event | Schema addition | Not designed |
| OTB-TC-08: Replay reject if qual expired before `clientTimestamp` | Replay handler | Not designed |

[CILLA] OTB-TC-06 through OTB-TC-08 do not exist in any artifact. These must be designed,
reviewed by Marcus, implemented, and tested before B-02 can move from OPEN to PARTIAL.

---

## 3) Calibration Policy Finalization and Evidence Linkage

### 3.1 Policy decision record

| Item | Resolution | Status |
|---|---|---|
| Hard block vs. advisory for expired-cal links | Advisory + mandatory documented override (v1.1) | Pending Marcus memo |
| Minimum override explanation length | 30 characters | Pending |
| Authorized-by role for override | IA or shop lead (not mechanic self-auth) | Pending |
| QCM notification event on expired-cal override | Required at link time | Pending |
| Hard block deferral condition | Future revision post workflow stabilization | Pending |

Target artifact: `ws15-f-cal-policy-memo-v1.md` — signed by Marcus by 2026-02-28.

### 3.2 Evidence chain required for B-04 CLOSED

All seven items below must exist before B-04 can advance to CLOSED:
1. Signed `ws15-f-cal-policy-memo-v1.md` with all five policy items above.
2. `linkTestEquipment` mutation — final implementation with advisory + mandatory override path.
3. TC-F-01 pass log — current-cal link succeeds with structured snapshot.
4. TC-F-02 pass log — expired-cal rejection without override enforced at API level.
5. TC-F-03 pass log — expired-cal link with valid authorized override accepted.
6. TC-F-08 pass log — PDF export includes structured "Test Equipment Used" section.
7. TC-F-05 pass log — snapshot immutability confirmed after cal renewal on live equipment record.

Currently zero of seven exist. Items 3, 5–7 (TC-F-01, TC-F-03, TC-F-08, TC-F-05) are partially
unblocked and can begin once mutation is written. Items 1–2 gate everything else.

---

## 4) Integrated Proof for Ordering and Packet Integrity Paths

### 4.1 Qualification ordering proof (B-03 path)

**Required sequence:**
1. **QALERT-04 isolation:** IA expired → RTS precheck returns `QUALIFICATION_EXPIRED` → confirm
   `signatureAuthEvent.consumed = false` after block → no step state mutation.
2. **QALERT-18 isolation:** WS15-B auth event proceeds only after qualification PASS → confirm
   ordering in event log: precheck event precedes auth consume event in `signatureAuthEvents` table.
3. **Scenario S5 integrated trace:** J CRITICAL emits → B sign attempt blocked → I pre-close shows
   J blocker → qualification renewal → I blocker clears → B sign permitted → A export includes
   qualification status evidence and ordering trace.

[DEVRAJ] Steps 1 and 2 require WS15-J B1–B4 build. Step 3 requires the integrated staging
environment. I will produce execution logs and `eventId` trace for each assertion in steps 1–2
as isolated tests before requesting S5 staging time.

[JONAS] S5 requires J schema deployed, B mutation with J precheck hook, and I pre-close updated
for J blocker codes — three integration surfaces coordinated in staging. Latency on the J
precheck must stay within the B auth hook readiness window (≤10s) from WS15-M §4.1.

### 4.2 Packet integrity proof (B-05 path)

**Execution tiers (sequential — no tier may skip):**

| Tier | Components | Gate condition |
|---|---|---|
| T-1: Component readiness | TC-D-11, TC-F-08, QALERT-16, TC-K-13 | All four pass logs produced |
| T-2: Cross-stream scenarios | S1 (C+L+B+I+A), S2 (D+H+I+B), S5 (J+B+I) | All three execution logs with pass assertions |
| T-3: Gate packet assembly | Full bundle: offline report, qual ordering pack, cal policy evidence, pre-close results, export packet with hash manifest + retrieval test | Hash manifest verified; retrieval test passes from cold storage |

[CILLA] T-2 requires B-01 PARTIAL closure (DS-1/DS-2 resolved) before S2 is valid, and B-03
QALERT execution before S5 is valid. T-3 cannot begin until T-1 and T-2 are complete. There
is no shortcut path. Assembling a T-3 packet on incomplete T-1/T-2 work is not a gate artifact;
it is a misleading document.

[MARCUS] The export integrity hard requirements from WS15-M §3.4 apply to every tier: fail-closed
on audit write failure, full hash visible, correction chain visible, QCM state explicit. These
must appear in the T-3 assembly, not be added post-hoc.

---

## 5) Residual Risk Table

| Risk ID | Risk statement | Blocker | Owner | Due (UTC) | Rollback trigger |
|---|---|---|---|---|---|
| RR-01 | Clerk offline token behavior incompatible with 48hr `offlineCapable` TTL (DS-1) | B-01 | Tanya Birch | 2026-03-02 | DS-1 negative: invoke re-challenge fallback design; add 5-day design buffer before any D implementation |
| RR-02 | iOS Safari Background Sync API absent in hangar fleet (DS-2) | B-01 | [JONAS] | 2026-03-02 | DS-2 negative: replace background sync with foreground-reconnect poll; re-validate Troy Weaver UX bar with SME sign-off; re-submit to Marcus for deliberateness-standard review |
| RR-03 | OQ-03 offline qualification policy unresolved — no design, schema, or tests anywhere | B-02 | [DEVRAJ] + [MARCUS] + Tanya | 2026-03-05 | Any OTB-POL-02 disagreement between Devraj/Marcus/Renata Solís: escalate to PM triage; add 3-day hold before design lock |
| RR-04 | QALERT-18 or QALERT-04 fail in staging — qualification gate allows auth consume bypass | B-03 | [DEVRAJ] + Cilla | 2026-03-03 | Any ordering failure: halt B×J integration immediately; escalate to Marcus; no RTS path valid until proof passes cleanly |
| RR-05 | Marcus cal policy memo delayed past 2026-02-28 | B-04 | [MARCUS] | 2026-02-28 | Delay >48h: `linkTestEquipment` blocked; communicate hold to Devraj; TC-F-02/03 unexecutable |
| RR-06 | D×I seam remains Red post-WS15-D build — pre-close misses pending sync state | B-05 | [DEVRAJ] + [JONAS] | 2026-03-06 | TC-D-11 failure: halt S2; no packet tier T-2 until Red seam eliminated and TC-D-11 retested |
| RR-07 | CF-08 export render architecture unresolved — blocks export integrity tests | B-05 | [JONAS] | 2026-03-04 | If CF-08 not decided by 2026-03-04: T-2 scenarios defer to 2026-03-10; admissibility recompute date updated accordingly |
| RR-08 | WS15-J B1–B4 build not complete before S5 scenario execution window | B-03/B-05 | [DEVRAJ] | 2026-03-08 | B4 slip: S5 and S1 defer; integrated packet T-2 slips; gate-spawn date recalculated at PM triage |
| RR-09 | Integrated staging environment not ready for T-2 scenario pack | B-05 | [JONAS] | 2026-03-07 | Environment not ready by 2026-03-07: cross-stream scenarios defer; Cilla issues formal B-05 hold note |
| RR-10 | Hash mismatch on any gate packet component invalidates full bundle | B-05 | Cilla + [DEVRAJ] | At T-3 assembly | Any mismatch in QALERT-HASH-MANIFEST or A export manifest: full packet invalid; rerun from T-1 |

[CILLA] RR-03 is the highest-urgency item in this table. OTB-POL-02 has no design artifact
anywhere. Every day without a draft increases the probability of overrunning the 10-day closure
sprint from WS15-M.0 §8.1.

[MARCUS] RR-04 is non-negotiable. A failed ordering proof halts the entire WS15-J/WS15-B
integration posture as unsafe for production. Not a deferral candidate under any schedule argument.

[DEVRAJ] RR-08 is my primary sequencing concern. B4 (RTS precheck integration) is the last in a
build chain. If B1–B3 hit unexpected schema complexity, B4 slips and B-03 cannot close in window.

[JONAS] RR-02 is the wildcard. If older iOS Safari lacks SW support — which I expect — the
per-item confirmation model changes materially. Not just a technical fallback; a UX recalibration.

---

## 6) Recomputed Admissibility Function and Recommendation

### 6.1 Function input recompute

| Input | WS15-M.0 | WS15-N | Change note |
|---|---|---|---|
| `F_count` | 3 | 2 | D×B design advanced; D×I and D×J seams remain |
| `OpenCritical` | 3 | 2 | B-02 and B-05 OPEN; B-04 PARTIAL |
| `RedLine` | true | true | D×I unresolved; OTB-POL-02 not designed |
| `E2E_Coverage` | <0.90 | <0.90 | No scenario executed; no staging environment |
| `OrderingProof` | false | false | Design exists; QALERT-18/04 not executed |
| `OfflineDeterminism` | false | false | B-02 OPEN; DS-1/DS-2 open; OTB-POL-02 not designed |
| `PolicyFinalized` | false | false | Cal memo unsigned; OTB-POL-02 not drafted; J×K crosswalk pending |
| `PacketIntegrity` | false | false | No integrated run; D×I Red; CF-08 open |

### 6.2 Hard threshold evaluation (WS15-M.0 §4.3)

| # | Condition | Threshold | State | Result |
|---|---|---|---|---|
| 1 | `F_count == 0` | 0 | 2 | **FAIL** |
| 2 | `OpenCritical == 0` | 0 | 2 | **FAIL** |
| 3 | `RedLine == false` | false | true | **FAIL** |
| 4 | `E2E_Coverage >= 0.90` | ≥0.90 | <0.90 | **FAIL** |
| 5 | `OrderingProof == true` | true | false | **FAIL** |
| 6 | `OfflineDeterminism == true` | true | false | **FAIL** |
| 7 | `PolicyFinalized == true` | true | false | **FAIL** |
| 8 | `PacketIntegrity == true` | true | false | **FAIL** |

All eight hard threshold conditions fail.

### 6.3 Readiness score (non-authoritative)

`ReadinessScore = 100 - (20×2) - (12×2) - (8×3) - (5×0) = 100 - 40 - 24 - 24 = 12`

[CILLA] Score of 12 reflects: design burn-down occurred since WS15-M.0 original (WS15-D spec,
WS15-F framework, WS15-J model are all real advances); execution burn-down has not begun.
The score does not override the hard threshold analysis.

### 6.4 Decision function output

```
F_count          = 2    → NOT ZERO
OpenCritical     = 2    → NOT ZERO
RedLine          = true → NOT FALSE
E2E_Coverage     < 0.90 → BELOW THRESHOLD
OrderingProof    = false
OfflineDeterminism = false
PolicyFinalized  = false
PacketIntegrity  = false
```

**All eight gate conditions fail.**

# Decision function output: `NOT_ADMISSIBLE`

---

## 7) Admissibility Checklist Delta (WS15-M.0 Appendix A)

| Item | WS15-M.0 | WS15-N |
|---|---|---|
| No active fail interactions in critical seams | ✗ | ✗ (D×I Red; D×B spikes open) |
| Offline auth TTL/replay deterministic and evidenced | ✗ | ⚠ PARTIAL (design; spikes open; no tests) |
| Offline qualification policy deterministic and evidenced | ✗ | ✗ (OTB-POL-02 not designed) |
| Qualification gate proven before auth consume | ✗ | ⚠ PARTIAL (design; QALERT-18/04 not run) |
| Expired calibration policy finalized and tested | ✗ | ⚠ PARTIAL (memo pending; TC-F-* not run) |
| Pre-close fail-closed negative paths proven | ✗ | ✗ (no staging; D×I unresolved) |
| Full export packet with hash manifest proven | ✗ | ✗ (no packet assembled) |
| Critical risk register shows zero open criticals | ✗ | ✗ (2 open criticals) |
| Red-line set fully green | ✗ | ✗ (offline boundary and D×I active) |
| QA + Regulatory pre-gate concurrence recorded | HOLD | HOLD (this document) |

**Score: 0 of 10 items satisfied. Three items advanced from ✗ to ⚠ PARTIAL (items 2, 4, 5).**

---

# Recommendation: `HOLD`

**Do not spawn Phase 15 Gate Review at this time.**

[CILLA] Design burn-down since WS15-M.0 is genuine. WS15-D provides a complete offline
architecture. WS15-F is pre-build-ready pending one policy memo. WS15-J provides a full
qualification alert model with explicit ordering control. These advances in specification quality
are real. They are not advances in implementation or test evidence. The two OPEN blockers —
B-02 (no offline qualification policy exists anywhere) and B-05 (no integrated packet assembled)
— are individually decisive gate-hold conditions. B-02 has no design artifact. B-05 cannot be
assembled until B-01 and B-02 are at minimum PARTIAL and the staging environment exists.

[MARCUS] Spawning now produces a predictable compliance rejection. The OQ-03 gap in WS15-J
is visible to any compliance reviewer reading the artifact set. It must be closed before gate
discussion begins. My policy memo for WS15-F is committed by 2026-02-28. My participation in
OTB-POL-02 design begins Day 1 of the closure sprint.

[DEVRAJ] The path is clear and bounded. B1–B4 build sequence, OTB-TC-06 through OTB-TC-08
design and implementation, and coordinated staging environment are the critical path. None
require architectural redesign. The sprint is executable with named owners and committed dates.

[JONAS] DS-2, CF-08, and the integrated staging environment are my gates. I commit to
DS-2 spike result by 2026-03-02, CF-08 architecture decision by 2026-03-04, and staging
environment readiness by 2026-03-07. I will not begin staging build-out until DS-2 resolves
to avoid environment construction on an unconfirmed SW API surface.

---

## 8) Sign-Off

**QA Author:** Cilla Oduya — posture: HOLD; design quality acknowledged; execution evidence required.

**Regulatory:** [MARCUS] Webb — concurs HOLD; B-02 (OQ-03) and B-05 are individually decisive;
policy memo committed 2026-02-28; OTB-POL-02 design participation committed Day 1.

**Backend:** [DEVRAJ] Anand — concurs HOLD; B1–B4 and OTB-TC-06/07/08 are critical path;
committed within 10-day sprint contingent on DS-1/DS-2 results.

**Platform:** [JONAS] Harker — concurs HOLD; DS-2, CF-08, and staging environment are my
commitments; will not begin staging build-out on unconfirmed SW API surface.

**Checkpoint Decision:** `NOT_ADMISSIBLE` — Phase 15 Gate Review spawn held pending B-02
and B-05 closure, with B-01, B-03, B-04 advancing to CLOSED in the same sprint.

**Next recompute trigger:** WS15-M.1 admissibility addendum, targeting 2026-03-12 after
full 10-day closure sprint evidence assembly.

---

*Filed: 2026-02-22 | Phase 15 | Athelon*
*Controlled gate artifact — supersedes no prior checkpoint; provides blocker closure ledger*
*and recomputed admissibility function for WS15-M.0 HOLD. Cilla Oduya — QA Lead, Phase 15.*
