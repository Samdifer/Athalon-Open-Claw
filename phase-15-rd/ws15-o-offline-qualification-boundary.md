# WS15-O — Offline Qualification Trust Boundary Closure Artifact (B-02)
**Phase:** 15
**Workstream:** WS15-O
**Document Type:** Gate-blocker closure artifact (compliance control)
**Date (UTC):** 2026-02-22
**Primary Authors:** [DEVRAJ] Devraj Anand (Backend), [MARCUS] Marcus Webb (Regulatory), [RENATA] Renata Solís (QCM SME)
**Authority Chain:** `ws15-m-pre-gate-checkpoint.md` -> `ws15-n-gate-blocker-closure.md` -> `ws15-m.1-addendum.md` -> this artifact
**Target Blocker:** B-02 (Offline qualification trust boundary)

---

## 0) Control framing
[CILLA-CONTROL] This is a compliance control artifact, not a narrative progress memo.
[CILLA-CONTROL] Closure status must be evidence-bound.
[CILLA-CONTROL] `CLOSED` is prohibited unless execution receipts exist and are verifiable.
[CILLA-CONTROL] Where receipts are absent, status must be `PARTIAL` or `OPEN`.
[MARCUS] Offline qualification is an authorization-at-time-of-act problem.
[MARCUS] Any ambiguous offline policy is a hard defensibility gap under regulated sign-off.
[RENATA] QCM requires deterministic, fail-closed behavior for disconnected conditions.

---

## 1) Source set and admissible references

### 1.1 Primary sources consumed
- `simulation/athelon/phase-15-rd/ws15-m.1-addendum.md`
- `simulation/athelon/phase-15-rd/ws15-j-qual-alerts.md`
- `simulation/athelon/phase-15-rd/ws15-d-offline.md`
- `simulation/athelon/phase-15-rd/ws15-m-pre-gate-checkpoint.md`
- `simulation/athelon/phase-15-rd/ws15-n-gate-blocker-closure.md`

### 1.2 Scope rule for this artifact
Only B-02 closure scope is evaluated.
B-01/B-03/B-04/B-05 are cited only when they impose direct dependencies on B-02 evidence.

### 1.3 Evidence classification rule used here
- `CLOSED` = policy + design + implementation + executed test receipts + immutable evidence pointers.
- `PARTIAL` = policy and/or design present, but implementation and/or receipts incomplete.
- `OPEN` = missing policy and/or missing design enforcement and/or missing receipts.

---

## 2) B-02 closure scope and acceptance criteria

### 2.1 B-02 statement (exact)
**B-02:** Offline qualification trust boundary unresolved (D×J).

### 2.2 Problem statement
When a signer performs an offline-capable action, the system must prove qualification validity at the moment of act (`clientTimestamp`), not only at replay (`serverAckAt`).
Without a qualification snapshot bound to the offline auth grant, the system cannot prove authorization-at-time-of-act.

### 2.3 In-scope operations
- Offline-capable signature initiation and queueing.
- Offline replay of queued signatures.
- Qualification-required assignment/sign-off actions impacted by disconnected state.
- Fail-closed behavior when qualification cannot be trusted.

### 2.4 Out-of-scope operations
- Generic identity re-auth control internals beyond qualification linkage.
- Non-qualification operational alerts.
- UI-only copy changes that do not alter enforcement.

### 2.5 B-02 acceptance criteria (AC-B02-*)
**AC-B02-01**
A signed offline qualification policy artifact exists and is versioned.
**AC-B02-02**
Authoritative source precedence for qualification state is defined and enforced.
**AC-B02-03**
Offline-capable auth grant requires an online qualification precheck at grant time.
**AC-B02-04**
`qualificationSnapshotAtOfflineAuth` data is bound to auth event and immutable after write.
**AC-B02-05**
Replay reject logic deterministically denies events where qualification was expired before `clientTimestamp`.
**AC-B02-06**
Replay deny is deterministic when qualification state is stale, unknown, disputed, or unverifiable.
**AC-B02-07**
Allow path is deterministic only when snapshot state is PASS and freshness rules hold.
**AC-B02-08**
Audit export includes both qualification snapshot evidence and replay decision reason code.
**AC-B02-09**
Negative and boundary tests are executed with immutable receipts.
**AC-B02-10**
QCM governance requires acknowledgement and escalation for offline qualification denials with unresolved override attempts.

### 2.6 Acceptance threshold for `CLOSED`
All AC-B02-01 through AC-B02-10 must be `PASS` with receipts.
Any missing receipt on AC-B02-09 blocks `CLOSED`.

---

## 3) Offline qualification policy baseline

### 3.1 Policy identity
**Policy ID:** OQP-15-B02-v1.0-draft
**State:** Draft control baseline, not yet ratified as signed memo artifact.

### 3.2 Policy objective
Preserve authorization integrity for qualification-required actions captured offline and replayed later.

### 3.3 Authoritative source hierarchy (trust source order)
**SRC-01 (highest):** Server-validated qualification profile state at offline auth grant instant.
**SRC-02:** Requirement version and rule set active at grant instant.
**SRC-03:** Source confidence and profile state fields (`VERIFIED`, `IN_DISPUTE`, `UNVERIFIED`, `PENDING`).
**SRC-04:** Client cache indicators are advisory only and cannot independently authorize offline qualification.
[MARCUS] Local cache alone is never authoritative for qualification grants.

### 3.4 Trust boundary definition
Boundary begins at offline-capable auth grant mutation.
Boundary ends at replay adjudication for each queued event.
Within boundary, each event carries immutable qualification evidence captured at grant.

### 3.5 Fail-closed principle
If qualification truth cannot be established with authoritative evidence, deny.
If freshness cannot be proven, deny.
If snapshot mismatch exists, deny.
If profile is disputed/unverified/pending, deny for qualification-required actions.

### 3.6 Stale-state controls
**STL-01**
Every snapshot must carry `snapshotEvaluatedAt` and `maxOfflineValidityMs`.
**STL-02**
If `clientTimestamp - snapshotEvaluatedAt > maxOfflineValidityMs`, replay must deny.
**STL-03**
If requirement version changed in a breaking way before replay, replay must re-adjudicate under policy and deny unless grandfather rule explicitly exists.
**STL-04**
If profile transitioned to `IN_DISPUTE` with `effectiveFrom <= clientTimestamp`, deny.
**STL-05**
If source confidence drops below required threshold before client act and evidence indicates retroactive invalidation, deny and raise integrity event.

---

## 4) Data model and enforcement rules (offline qualification checks)

### 4.1 Required schema additions
#### 4.1.1 `signatureAuthEvents` additions
- `offlineCapable: boolean`
- `offlineTTLExpiresAt: number`
- `qualificationSnapshotAtOfflineAuth: object`
- `qualificationSnapshotHash: string`
- `qualificationPolicyVersion: string`
- `qualificationDecisionAtGrant: "PASS" | "WARN" | "BLOCK"`
- `qualificationDecisionReasonsAtGrant: string[]`
- `qualificationRequirementCode: string`
- `qualificationRequirementVersion: string`
- `qualificationProfileRef: string`
- `qualificationProfileStateAtGrant: "VERIFIED" | "PENDING" | "IN_DISPUTE" | "UNVERIFIED"`
- `qualificationSourceConfidenceAtGrant: "HIGH" | "MEDIUM" | "LOW"`
- `snapshotEvaluatedAt: number`
- `maxOfflineValidityMs: number`
#### 4.1.2 `signature_queue` mirrored evidence fields (client storage)
- `qualificationSnapshotHash`
- `qualificationPolicyVersion`
- `qualificationDecisionAtGrant`
- `qualificationRequirementVersion`
- `snapshotEvaluatedAt`
[DEVRAJ] Client queue mirrors only hash and control fields; server event remains authoritative source.

### 4.2 New decision codes
- `OQ_ALLOW_QUAL_PASS`
- `OQ_DENY_NO_SNAPSHOT`
- `OQ_DENY_SNAPSHOT_HASH_MISMATCH`
- `OQ_DENY_EXPIRED_BEFORE_CLIENT_ACT`
- `OQ_DENY_PROFILE_DISPUTED`
- `OQ_DENY_PROFILE_UNVERIFIED`
- `OQ_DENY_STALE_SNAPSHOT`
- `OQ_DENY_REQUIREMENT_VERSION_BREAK`
- `OQ_DENY_SOURCE_CONFIDENCE_LOW`
- `OQ_DENY_UNKNOWN_STATE`

### 4.3 Enforcement gate sequence (must be deterministic)
**ENF-B02-01**
At offline-capable grant request, run live qualification precheck using WS15-J requirement engine.
**ENF-B02-02**
If precheck is BLOCK, deny grant; no offline-capable auth event created.
**ENF-B02-03**
If precheck PASS/WARN per policy allowances, create auth event with immutable snapshot payload.
**ENF-B02-04**
At replay, fetch authoritative auth event and verify snapshot hash consistency.
**ENF-B02-05**
Evaluate deny rules in fixed order (see section 5 table).
**ENF-B02-06**
On deny, mark queue item `rejected` with exact `OQ_DENY_*` code and audit event.
**ENF-B02-07**
On allow, continue existing signature mutation path and preserve dual timestamps.

### 4.4 Immutability constraints
`qualificationSnapshotAtOfflineAuth` cannot be edited after insertion.
`qualificationDecisionAtGrant` cannot be recalculated retroactively for same auth event.
Any correction must create a separate amendment event and does not change original snapshot.

### 4.5 Policy enforcement pseudocode (normative order)
```text
function evaluateOfflineQualification(event, replayContext):
  if !event.qualificationSnapshotAtOfflineAuth -> DENY OQ_DENY_NO_SNAPSHOT
  if hash(event.snapshot) != event.qualificationSnapshotHash -> DENY OQ_DENY_SNAPSHOT_HASH_MISMATCH
  if event.qualificationProfileStateAtGrant in [IN_DISPUTE, UNVERIFIED, PENDING] -> DENY state code
  if event.qualificationDecisionAtGrant == BLOCK -> DENY OQ_DENY_UNKNOWN_STATE
  if replayContext.clientTimestamp - event.snapshotEvaluatedAt > event.maxOfflineValidityMs -> DENY OQ_DENY_STALE_SNAPSHOT
  if qualificationExpiredBefore(event, replayContext.clientTimestamp) -> DENY OQ_DENY_EXPIRED_BEFORE_CLIENT_ACT
  if requirementVersionBreakingChanged(event, replayContext) -> DENY OQ_DENY_REQUIREMENT_VERSION_BREAK
  if sourceConfidenceInvalid(event, replayContext) -> DENY OQ_DENY_SOURCE_CONFIDENCE_LOW
  return ALLOW OQ_ALLOW_QUAL_PASS
```

---

## 5) Deterministic deny/allow decision table (with edge cases)

### 5.1 Decision priority
Deny-first, fixed-order.
First matching deny rule terminates evaluation.

### 5.2 Table
| Rule Order | Condition | Decision | Code | Notes |
|---|---|---|---|---|
| 1 | No snapshot payload on auth event | DENY | OQ_DENY_NO_SNAPSHOT | Hard fail-closed |
| 2 | Snapshot hash mismatch | DENY | OQ_DENY_SNAPSHOT_HASH_MISMATCH | Possible tamper/corruption |
| 3 | Profile state `IN_DISPUTE` at grant | DENY | OQ_DENY_PROFILE_DISPUTED | Compliance hold |
| 4 | Profile state `UNVERIFIED` or `PENDING` at grant | DENY | OQ_DENY_PROFILE_UNVERIFIED | Not authorization-grade |
| 5 | Decision at grant is BLOCK | DENY | OQ_DENY_UNKNOWN_STATE | Guard against malformed branch |
| 6 | Snapshot stale by TTL window | DENY | OQ_DENY_STALE_SNAPSHOT | Stale-state control |
| 7 | Qualification expired before `clientTimestamp` | DENY | OQ_DENY_EXPIRED_BEFORE_CLIENT_ACT | Core B-02 rule |
| 8 | Requirement version changed with breaking effect | DENY | OQ_DENY_REQUIREMENT_VERSION_BREAK | Prevent outdated standards |
| 9 | Source confidence invalid by policy | DENY | OQ_DENY_SOURCE_CONFIDENCE_LOW | Quality evidence floor |
| 10 | None of deny conditions met | ALLOW | OQ_ALLOW_QUAL_PASS | Proceed to sign mutation |

### 5.3 Edge case register (mandatory handling)
**EDGE-01**
Qualification expires exactly at `clientTimestamp`.
Resolution: treat as expired (deny) unless policy explicitly uses strict greater-than semantics. Default is inclusive deny.
**EDGE-02**
Qualification valid at `clientTimestamp`, expires before `serverAckAt`.
Resolution: allow (authorization evaluated at moment of act), record note `post-act expiry` in audit trail.
**EDGE-03**
Client clock skew causes `clientTimestamp` earlier than snapshot by anomalous delta.
Resolution: deny with `OQ_DENY_UNKNOWN_STATE` until skew tolerance policy explicitly defined; capture telemetry.
**EDGE-04**
Requirement version updates after act but before replay.
Resolution: if non-breaking and backward-compatible, allow with policy marker; if breaking, deny with `OQ_DENY_REQUIREMENT_VERSION_BREAK`.
**EDGE-05**
Profile enters dispute retroactively effective before act.
Resolution: deny with `OQ_DENY_PROFILE_DISPUTED` and escalate QCM incident.
**EDGE-06**
Snapshot exists but corresponding profile reference missing due to archival lag.
Resolution: deny fail-closed with `OQ_DENY_UNKNOWN_STATE`; queue reconciliation task.
**EDGE-07**
Offline-capable grant created without connectivity race condition resulting in partial snapshot.
Resolution: deny `OQ_DENY_NO_SNAPSHOT`; mark implementation defect; no fallback allow.
**EDGE-08**
Dual-signature task where secondary signer valid and primary invalid offline.
Resolution: invalid signer event denied independently; no implicit substitution.
**EDGE-09**
Suppression/waiver attempted for IA-expired RTS path.
Resolution: deny; waivers not permitted for IA-expired RTS sign-off per WS15-J policy.
**EDGE-10**
Replay retries same event after deny.
Resolution: deterministic same deny code; idempotent denial record references original decision.

---

## 6) Evidence requirements and test receipts

### 6.1 Required implementation evidence IDs
- `EV-B02-SCH-001` — schema migration for `signatureAuthEvents` snapshot fields.
- `EV-B02-SVC-001` — offline-capable grant mutation with live qualification precheck.
- `EV-B02-SVC-002` — replay adjudicator deny/allow engine with fixed ordering.
- `EV-B02-AUD-001` — audit event emission with `OQ_*` decision codes.
- `EV-B02-EXP-001` — export inclusion of snapshot decision evidence.

### 6.2 Required test suite IDs
- `OQ-TC-01` no snapshot deny.
- `OQ-TC-02` hash mismatch deny.
- `OQ-TC-03` disputed profile deny.
- `OQ-TC-04` unverified profile deny.
- `OQ-TC-05` stale snapshot deny.
- `OQ-TC-06` expired-before-client-act deny.
- `OQ-TC-07` valid-at-act allow even if expired-before-ack.
- `OQ-TC-08` requirement version breaking change deny.
- `OQ-TC-09` replay idempotent deny consistency.
- `OQ-TC-10` QCM escalation emitted on deny classes requiring review.
- `OQ-TC-11` integration with QALERT-04/18 ordering invariants.
- `OQ-TC-12` audit export completeness includes decision code and snapshot hash.

### 6.3 Receipt format requirements
Each receipt must include:
- Receipt ID.
- Test ID.
- Build SHA.
- Environment ID.
- Start/end timestamps.
- Pass/fail assertion text.
- Trace/event IDs.
- Artifact pointer path.

### 6.4 Concrete receipt ledger (current state)
| Receipt ID | Maps to | State | Evidence path |
|---|---|---|---|
| RCPT-B02-001 | OQ-TC-01 | MISSING | none attached |
| RCPT-B02-002 | OQ-TC-02 | MISSING | none attached |
| RCPT-B02-003 | OQ-TC-03 | MISSING | none attached |
| RCPT-B02-004 | OQ-TC-04 | MISSING | none attached |
| RCPT-B02-005 | OQ-TC-05 | MISSING | none attached |
| RCPT-B02-006 | OQ-TC-06 | MISSING | none attached |
| RCPT-B02-007 | OQ-TC-07 | MISSING | none attached |
| RCPT-B02-008 | OQ-TC-08 | MISSING | none attached |
| RCPT-B02-009 | OQ-TC-09 | MISSING | none attached |
| RCPT-B02-010 | OQ-TC-10 | MISSING | none attached |
| RCPT-B02-011 | OQ-TC-11 | MISSING | none attached |
| RCPT-B02-012 | OQ-TC-12 | MISSING | none attached |

### 6.5 Receipt completeness summary
Required receipts: 12.
Present receipts: 0.
Missing receipts: 12.
[CILLA-CONTROL] With 0/12 receipts, B-02 cannot be `CLOSED`.

---

## 7) Compliance crosswalk for B-02 controls

### 7.1 Control-to-artifact mapping
| Control ID | Requirement | Current evidence | Status |
|---|---|---|---|
| B02-COMP-01 | Authorization at moment of act provable | Policy intent in WS15-N annotations | PARTIAL |
| B02-COMP-02 | Qualification precheck before auth consume | WS15-J §3.5 ordering rule | PARTIAL |
| B02-COMP-03 | Offline snapshot bound to auth grant | Proposed in this artifact only | OPEN |
| B02-COMP-04 | Fail-closed stale-state behavior | Proposed in this artifact only | OPEN |
| B02-COMP-05 | Deterministic deny reason traceability | OQ decision code model proposed | OPEN |
| B02-COMP-06 | Test execution evidence | No receipts in source set | OPEN |

### 7.2 Regulatory posture
[MARCUS] B-02 is currently non-defensible for closure because authoritative snapshot and replay deny enforcement are not implemented or tested.
[RENATA] QCM cannot approve operational use of offline qualification-required actions without deny determinism and audit receipts.

---

## 8) Dependency interaction notes

### 8.1 B-01 dependency
B-02 policy depends on B-01 offline auth event model because snapshot is attached to offline-capable auth grant.
If DS-1/DS-2 fail and auth grant model changes, B-02 implementation must be revalidated.

### 8.2 B-03 dependency
B-03 ordering proof (qualification before auth consume) must remain true for both online and offline-capable grant branches.
OQ-TC-11 explicitly verifies this cross-stream invariant.

### 8.3 B-05 dependency
B-05 packet integrity requires inclusion of B-02 decision traces and denial/allow evidence.
No B-05 packet can be admissible while B-02 receipts are missing.

---

## 9) Implementation minimum to move B-02 from OPEN to PARTIAL

### 9.1 Mandatory deliverables
1. `ws15-o-policy-memo-v1.md` signed by Marcus with Renata concurrence.
2. Schema migration implementing section 4.1 fields.
3. Grant mutation branch enforcing ENF-B02-01..03.
4. Replay adjudicator implementing ENF-B02-04..07 and decision table order.
5. Audit emission with `OQ_*` codes.

### 9.2 Verification minimum
At minimum, receipts RCPT-B02-001, RCPT-B02-006, RCPT-B02-007, RCPT-B02-011, RCPT-B02-012 must pass to consider `PARTIAL+` and schedule closure attempt.
Without these five, B-02 remains `OPEN`.

---

## 10) Final B-02 closure verdict

### 10.1 Verdict determination logic
- Policy artifact signed? **No**.
- Snapshot schema implemented? **No evidence**.
- Replay deny/allow engine implemented? **No evidence**.
- Test receipts present? **No (0/12)**.

### 10.2 Verdict
# `B-02 VERDICT: OPEN`
[CILLA-CONTROL] `CLOSED` is prohibited by evidence rule.
[MARCUS] `PARTIAL` is also not supportable here because baseline policy artifact for offline qualification remains unsigned and no implementation evidence exists.
[RENATA] QCM concurrence: keep OPEN.

---

## 11) Gate impact note (Phase 15 admissibility)
B-02 remains a P1 blocker.
Per WS15-M hard-threshold function, any P1 blocker in OPEN state prevents gate admissibility.
Therefore:
# `B-02 continues to block Phase 15 gate admissibility.`
Gate recommendation impact contribution: `HOLD` remains mandatory.

---

## 12) Closure checklist snapshot
| Item | Required | Current | Result |
|---|---|---|---|
| Signed offline qualification policy | Yes | No | FAIL |
| Authoritative source hierarchy codified | Yes | Draft only | FAIL |
| Snapshot-at-grant schema deployed | Yes | No evidence | FAIL |
| Replay deny/allow deterministic ordering | Yes | Draft only | FAIL |
| Edge-case handling tests executed | Yes | No receipts | FAIL |
| Audit export with decision codes | Yes | No evidence | FAIL |
| QCM governance integration | Yes | Draft only | FAIL |
Overall closure checklist result: **0/7 PASS**.

---

## 13) Sign-off block
**Backend:** [DEVRAJ] Anand — concurs B-02 OPEN; implementation not yet evidenced.
**Regulatory:** [MARCUS] Webb — concurs B-02 OPEN; no closure claim defensible without receipts.
**QCM SME:** [RENATA] Solís — concurs B-02 OPEN; fail-closed and auditable enforcement not yet demonstrated.
**Artifact output:** `OPEN`.
**Gate effect:** B-02 remains a decisive blocker for Phase 15 gate spawn.
