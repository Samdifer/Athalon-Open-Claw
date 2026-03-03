# Athelon Phase 7 Hardening — Integrity Regression Lock
Author: Devraj Anand (Backend)
Adversarial QA inline: Priscilla "Cilla" Oduya
Date: 2026-02-22
Status: AUTHORITATIVE FOR PHASE 7 GATE

---

## 0) Purpose and enforcement posture
Phase 6 reached GO WITH CONDITIONS.
Phase 7 removes interpretation gaps around integrity.
This document defines binary controls for integrity-critical behaviors.
If integrity controls fail, release fails.
No soft waivers.
No "known issue" downgrade.
No verbal-only acceptance.
[Cilla] Good. If it can drift silently, it will.

## 1) Inputs reviewed and binding context
I reviewed, in full, before drafting:
- `simulation/athelon/phase-6-alpha/implementation-fixes.md`
- `simulation/athelon/phase-6-alpha/validation-retest.md`
- `simulation/athelon/phase-5-mvp/maintenance-record-impl.md`
- `simulation/athelon/reviews/phase-6-gate-review.md`
Binding conclusions carried into this lock:
- Canonical hash order previously drifted and must remain frozen.
- IA certificate separation is not optional for inspection integrity.
- signatureAuthEvent semantics require strict single-consume atomic behavior.
- Guard ordering is part of contractual behavior, not cosmetic behavior.
- Webhook liveness and row insertion are integrity path requirements.
- Evidence discipline is required to keep governance trustworthy.
[Cilla] "We already fixed it" is not an admissible control.

## 2) Non-negotiable invariants to lock
### 2.1 I-001 — Canonical hash order lock
Invariant ID: `I-001-CANONICAL-HASH-ORDER`
Rule set:
- Algorithm identifier remains `sha256-v1`.
- Canonical field count remains 14.
- Canonical field order remains fixed.
- Serialization delimiter remains `|`.
- Encoding remains UTF-8.
- Signed timestamp source remains server-side action time.
Canonical order for `sha256-v1`:
1. `workOrderId`
2. `workOrderNumber`
3. `orgId`
4. `aircraftRegistration`
5. `aircraftSerialNumber`
6. `aircraftTotalTimeAtSign`
7. `signingTechnicianId`
8. `signingLegalName`
9. `signingCertNumber`
10. `recordType`
11. `workPerformed`
12. `approvedDataReference`
13. `signatureAuthEventId`
14. `signedAt`
Required metadata on signed records:
- `hashAlgorithmVersion`
- `hashCanonicalOrderVersion`
Allowed `hashCanonicalOrderVersion` values:
- `v1-spec-order`
- `v1-alpha-bad-order` (legacy historical rows only)
Explicit prohibitions:
- Inserting `signingTechnicianRatingsExercised` into canonical hash payload.
- Reordering any canonical fields.
- Delimiter changes (`|` -> other).
- Locale-specific number/date conversion.
[Cilla] Deterministic wrong order is still wrong.

### 2.2 I-002 — IA identity separation lock
Invariant ID: `I-002-IA-SEPARATION`
Rule set:
- IA number path is distinct from A&P certificate path.
- Inspection sign flow requires non-empty IA value.
- IA value is visible pre-sign in IA-required paths.
- Signed inspection snapshots retain IA-specific value independently.
Data requirements:
- Technician row has `certNumber` and `iaCertNumber` independently.
- Inspection sign mutation reads IA from `iaCertNumber` path only.
- Inspection sign mutation rejects null/empty/whitespace IA.
Prohibitions:
- Fallback from missing IA to A&P cert.
- UI hidden IA field on inspection path.
- Silent coercion of whitespace IA value.
[Cilla] Any fallback is integrity failure, not usability issue.

### 2.3 I-003 — signatureAuthEvent consume semantics lock
Invariant ID: `I-003-AUTH-EVENT-CONSUME`
Rule set:
- One auth event authorizes one signature event.
- Event existence check is mandatory.
- Event unconsumed check is mandatory.
- Event TTL check is mandatory.
- Event identity match check is mandatory.
- Event intendedTable check is mandatory when field present.
- Event consume and record sign must be atomic.
- `consumedByRecordId` patch completion is mandatory.
Prohibitions:
- Non-atomic consume/patch sequences.
- Reusing consumed events.
- Ignoring expired event.
- Ignoring identity mismatch.
- Signing with wrong intended table.
[Cilla] Reuse success even once is P0 release stop.

### 2.4 I-004 — Guard order precedence lock
Invariant ID: `I-004-GUARD-ORDER-FIXITY`
Rule set for RTS statement checks:
1) `RTS_STATEMENT_TOO_SHORT`
2) `RTS_STATEMENT_NO_CITATION`
3) `RTS_STATEMENT_NO_DETERMINATION`
Rationale:
- Remediation quality depends on deterministic first-failure semantics.
- QA contracts reference precedence as functional behavior.
- Drift causes operator misdirection under pressure.
[Cilla] Wrong first error = wrong fix = wasted line time.

### 2.5 I-005 — Webhook liveness + insertion lock
Invariant ID: `I-005-WEBHOOK-LIVENESS`
Rule set:
- `POST /webhooks/clerk/session-reauthenticated` route must exist.
- Invalid payload returns validation error (400/422), never 404.
- Real re-auth creates `signatureAuthEvents` row within SLA.
Required defaults on inserted row:
- `consumed: false`
- `expiresAt = authenticatedAt + 300000`
- `technicianId` resolved correctly
Prohibitions:
- 404 responses in target environment.
- 200 on malformed payload.
- Missing created row on real re-auth.
[Cilla] Route alive and behavior dead still fails this invariant.

## 3) CI assertions and contract tests (fail hard)
### 3.1 Pipeline policy
Integrity suite mode:
- required
- blocking
- fail-fast
No flaky quarantine for integrity cases.
No retry-to-green masking for integrity cases.
Pipeline stages:
1. Unit contract locks.
2. Mutation integration contracts.
3. Environment route/liveness probes.
4. Migration dry-run and rollback rehearsal checks.
[Cilla] If a test is deterministic, retries are concealment.

### 3.2 Assertion inventory
A-001 `INT_CANONICAL_LENGTH_DRIFT`
- Canonical list length must equal 14 exactly.
A-002 `INT_CANONICAL_ORDER_DRIFT`
- Canonical field names and positions must match fixture exactly.
A-003 `INT_CANONICAL_SERIALIZATION_DRIFT`
- Delimiter/encoding contract must match fixture behavior.
A-004 `INT_HASH_PARITY_FAIL`
- Independent recompute must equal stored hash on signed fixtures.
A-005 `MR_IA_CERT_NUMBER_REQUIRED`
- Inspection sign without IA must reject hard.
A-006 `INT_IA_AP_CONFLATION`
- IA path must never read A&P fallback value.
A-007 `INT_IA_SNAPSHOT_MISSING`
- Signed inspection snapshot must persist IA value.
A-008 `AUTH_EVENT_ALREADY_CONSUMED`
- Consumed event must reject second consume/sign attempt.
A-009 `AUTH_EVENT_EXPIRED`
- Expired event must reject sign attempt.
A-010 `AUTH_EVENT_IDENTITY_MISMATCH`
- Event identity mismatch must reject sign attempt.
A-011 `INT_AUTH_CONSUME_NONATOMIC`
- Simulated failure after consume must not leave partial consumed state.
A-012 `INT_AUTH_CONSUME_LINK_MISSING`
- Successful sign must include `consumedByRecordId` back-link.
A-013 `INT_GUARD_ORDER_DRIFT`
- RTS precedence must remain short->citation->determination.
A-014 `INT_WEBHOOK_ROUTE_DEAD`
- Invalid-payload probe must never return 404.
A-015 `INT_WEBHOOK_VALIDATION_WEAK`
- Malformed payload must not return 200.
A-016 `INT_WEBHOOK_INSERT_TIMEOUT`
- Real re-auth insertion must occur <=10s.
A-017 `INT_WEBHOOK_DEFAULTS_DRIFT`
- Inserted event defaults must match consume=false + TTL semantics.

### 3.3 Contract fixture governance
Contract source files:
- `contracts/integrity/canonical-order.fixture.json`
- `contracts/integrity/auth-event.fixture.json`
- `contracts/integrity/error-precedence.fixture.json`
- `contracts/integrity/webhook-defaults.fixture.json`
Change controls:
- Fixture changes require explicit integrity change approval footer.
Required commit footer keys:
- `Integrity-Contract-Change: APPROVED`
- `Approved-By-Backend: <name>`
- `Approved-By-QA: <name>`
- `Ticket: ATH-P7-INT-###`
Pipeline rule:
- Fixture changed without footer => fail with `INT_CONTRACT_CHANGE_UNAUTHORIZED`.
[Cilla] "Updated fixture to make test pass" without approval is policy breach.

### 3.4 CI failure payload contract
Every integrity CI failure emits structured payload:
- `invariantId`
- `assertionId`
- `testId`
- `expected`
- `actual`
- `commitHash`
- `artifactPath`
- `detectedAtUtc`
No truncated payloads accepted for release decisions.

## 4) Regression matrix (named test IDs + expected error codes)
### 4.1 Matrix rule
Each matrix row has a single primary expected code.
If multiple failures are possible, precedence is explicitly declared.
[Cilla] "Any 4xx" is invalid test specification.

### 4.2 Canonical hash matrix
| Test ID | Scenario | Expected result | Expected error code |
|---|---|---|---|
| INT-HASH-001 | Canonical payload length = 13 | Fail hard | INT_CANONICAL_LENGTH_DRIFT |
| INT-HASH-002 | Canonical payload length = 15 | Fail hard | INT_CANONICAL_LENGTH_DRIFT |
| INT-HASH-003 | `signingCertNumber` moved from pos 9 | Fail hard | INT_CANONICAL_ORDER_DRIFT |
| INT-HASH-004 | `recordType` moved from pos 10 | Fail hard | INT_CANONICAL_ORDER_DRIFT |
| INT-HASH-005 | Insert ratings field into payload | Fail hard | INT_CANONICAL_ORDER_DRIFT |
| INT-HASH-006 | Delimiter changed from `|` to `,` | Fail hard | INT_CANONICAL_SERIALIZATION_DRIFT |
| INT-HASH-007 | Recompute mismatch fixture A | Fail hard | INT_HASH_PARITY_FAIL |
| INT-HASH-008 | Recompute mismatch migrated legacy fixture | Fail hard | INT_HASH_PARITY_FAIL |

### 4.3 IA separation matrix
| Test ID | Scenario | Expected result | Expected error code |
|---|---|---|---|
| INT-IA-001 | Inspection sign with null IA | Reject | MR_IA_CERT_NUMBER_REQUIRED |
| INT-IA-002 | Inspection sign with whitespace IA | Reject | MR_IA_CERT_NUMBER_REQUIRED |
| INT-IA-003 | Inspection path reads A&P when IA null | Fail hard | INT_IA_AP_CONFLATION |
| INT-IA-004 | Routine maintenance sign with IA null | Allow | NONE |
| INT-IA-005 | Pre-sign summary missing IA panel on inspection | Fail hard | INT_IA_UI_VISIBILITY_FAIL |
| INT-IA-006 | Inspection snapshot missing IA field | Fail hard | INT_IA_SNAPSHOT_MISSING |
| INT-IA-007 | Seeded IA equals A&P without explicit waiver | Fail hard | INT_IA_AP_CONFLATION |

### 4.4 signatureAuthEvent matrix
| Test ID | Scenario | Expected result | Expected error code |
|---|---|---|---|
| INT-AUTH-001 | Event id absent | Reject | AUTH_EVENT_NOT_FOUND |
| INT-AUTH-002 | Event consumed=true | Reject | AUTH_EVENT_ALREADY_CONSUMED |
| INT-AUTH-003 | Event expired by 1ms | Reject | AUTH_EVENT_EXPIRED |
| INT-AUTH-004 | Event issued to different technician | Reject | AUTH_EVENT_IDENTITY_MISMATCH |
| INT-AUTH-005 | intendedTable mismatch | Reject | AUTH_EVENT_WRONG_TABLE |
| INT-AUTH-006 | Simulated failure after consume patch | Fail hard + rollback | INT_AUTH_CONSUME_NONATOMIC |
| INT-AUTH-007 | Concurrent double-submit same event | Exactly one success | AUTH_EVENT_ALREADY_CONSUMED |
| INT-AUTH-008 | Success path lacks consumedByRecordId link | Fail hard | INT_AUTH_CONSUME_LINK_MISSING |

### 4.5 Guard order matrix
| Test ID | Scenario | Expected result | Expected error code |
|---|---|---|---|
| INT-RTS-001 | Too short + no citation | First error too short | RTS_STATEMENT_TOO_SHORT |
| INT-RTS-002 | Length ok + no citation | Reject citation | RTS_STATEMENT_NO_CITATION |
| INT-RTS-003 | Length+citation ok + no determination | Reject determination | RTS_STATEMENT_NO_DETERMINATION |
| INT-RTS-004 | Engine returns citation before too-short | Fail hard | INT_GUARD_ORDER_DRIFT |

### 4.6 Webhook matrix
| Test ID | Scenario | Expected result | Expected error code |
|---|---|---|---|
| INT-WEBHOOK-001 | Probe receives 404 | Fail hard | INT_WEBHOOK_ROUTE_DEAD |
| INT-WEBHOOK-002 | Malformed payload returns 200 | Fail hard | INT_WEBHOOK_VALIDATION_WEAK |
| INT-WEBHOOK-003 | Real re-auth insert >10s | Fail hard | INT_WEBHOOK_INSERT_TIMEOUT |
| INT-WEBHOOK-004 | New event defaults consumed=true | Fail hard | INT_WEBHOOK_DEFAULTS_DRIFT |
| INT-WEBHOOK-005 | New event TTL not equal +300000ms | Fail hard | INT_WEBHOOK_DEFAULTS_DRIFT |

## 5) Data migration safety checks and rollback guards
### 5.1 Migration scope constraints
Included scopes:
- Legacy records tagged `v1-alpha-bad-order`.
- Technician rows missing IA where IA capability expected.
- Auth events with missing back-link anomalies.
Strict prohibition:
- No mutation of signed content fields during migration.
- No migration-side reinterpretation of business fields.
[Cilla] If migration edits `workPerformed`, stop immediately.

### 5.2 Pre-migration gates
M-001 Backup verified:
- Full snapshot exists and restore tested.
M-002 Dry-run inventory:
- Candidate row counts by category produced.
M-003 Deterministic run ID:
- Dry-run emits run-id + checksum.
M-004 Simulated parity:
- 100% of candidate records can be recomputed in dry-run.
M-005 Script pinning:
- Migration script hash pinned in release manifest.
M-006 Approval:
- Backend + QA explicit migration execution approval logged.

### 5.3 Execution safeguards
S-001 Batch size max = 100 records.
S-002 Per-batch parity verify before commit.
S-003 First parity mismatch auto-stop.
S-004 Idempotency token required per record.
S-005 Immutable migration ledger event per record.
Required migration metadata writes:
- `legacySignatureHash`
- `hashCanonicalOrderVersion`
- `rehashAt`
- `rehashReason`
- `migrationRunId`
Required ledger fields:
- run-id
- record-id
- old-hash-prefix
- new-hash-prefix
- operator
- timestamp
[Cilla] No metadata trail means no acceptance, even if parity appears green.

### 5.4 Rollback triggers
Trigger R-001: any `INT_HASH_PARITY_FAIL` during execution.
Trigger R-002: unexpected null in mandatory signing snapshot field.
Trigger R-003: row count drift between pre and post batch snapshots.
Trigger R-004: duplicate idempotency token detected.
Trigger R-005: any unauthorized field change detected by diff audit.

### 5.5 Rollback actions
On trigger:
1. Halt migration worker.
2. Mark release state `BLOCKED`.
3. Revert active batch from `legacySignatureHash` and prior metadata snapshot.
4. Emit incident event `migration_integrity_rollback`.
5. Archive failing diff artifacts.
6. Require new approval cycle before retry.
Prohibitions:
- No partial-batch acceptance.
- No manual DB edits outside migration tool path.
- No "continue on warnings" mode.

### 5.6 Post-migration validation
Required complete checks:
- Full parity pass on migrated population.
- Legacy-tag counts reduced to expected target.
- 30-record minimum QA random sample review.
- Export-level spot-check using Marcus inspector packet format.
- Migration ledger completeness check (100% row coverage).
[Cilla] If sample finds one defect, expand to full-record review.

## 6) Release-blocking policy for integrity failures
### 6.1 Severity classification
S0 (absolute block):
- Canonical order drift.
- Hash parity failure.
- Auth consume non-atomic behavior.
- IA/A&P conflation.
S1 (release block):
- Guard order drift.
- Webhook route dead.
- Webhook defaults drift.
- Missing integrity evidence bundle.
All S0/S1 => production promotion blocked.
No local override authority.

### 6.2 Release state machine
States:
- `READY`
- `CONDITIONAL`
- `BLOCKED`
- `RECOVERY`
Transitions:
- S0/S1 failure => `BLOCKED`.
- Verified rollback complete => `RECOVERY`.
- Two consecutive clean integrity suite runs => `CONDITIONAL`.
- Devraj + Cilla sign-off complete => `READY`.

### 6.3 Hard-stop rules
HS-001: `integrity-contract-lock` job red => no prod deploy.
HS-002: missing webhook probe evidence => no prod deploy.
HS-003: missing IA negative test evidence => no prod deploy.
HS-004: missing consumed-event replay failure evidence => no prod deploy.
HS-005: missing rollback rehearsal receipt (<=14 days) => no prod deploy.
HS-006: any unresolved integrity incident => no prod deploy.

### 6.4 Integrity incident comms policy
T+0:
- Announce `INTEGRITY_BLOCK` in release channel.
T+10:
- Post invariant IDs + failing test IDs + artifact links.
Resolution:
- Post root cause, rollback evidence, fixed run IDs, and restored state.
Forbidden language:
- "Looks okay now"
- "Couldn’t reproduce"
- "Probably fixed"
Required language:
- "Invariant restored with artifacts: ..."

## 7) Devraj/Cilla sign-off protocol before production promotion
### 7.1 Mandatory sign-off artifacts
P-001 CI URL showing green `integrity-contract-lock`.
P-002 Canonical fixture checksum artifact.
P-003 Full hash parity report artifact.
P-004 IA separation validation report artifact.
P-005 Auth consume atomicity/race report artifact.
P-006 Webhook liveness + insertion report artifact.
P-007 Migration manifest (if migration included in release).
P-008 Rollback rehearsal receipt (<=14 days old).
[Cilla] "Will upload after deploy" invalidates sign-off.

### 7.2 Devraj backend attestation
Template statement:
I attest that canonical hash contract remains `v1-spec-order`,
serialization contract is unchanged,
IA separation enforcement is active for inspection sign flows,
auth-event consume semantics are atomic and single-use,
and migration (if present) completed without unresolved integrity exceptions.
Required fields:
- Name
- UTC timestamp
- Backend commit hash
- CI run IDs

### 7.3 Cilla QA adversarial attestation
Template statement:
I attest that the regression matrix executed with no unresolved S0/S1 findings,
expected error-code precedence matched actual behavior,
integrity evidence artifacts are complete and independently readable,
and no integrity waivers were requested or granted.
Required fields:
- Name
- UTC timestamp
- QA run IDs
- Evidence bundle ID

### 7.4 Joint promotion handshake
Promotion requirements:
- Devraj attestation present.
- Cilla attestation present.
- Artifacts P-001..P-008 attached.
Failure mode:
- Missing either attestation => `BLOCKED`.
- Attestation conflict => `BLOCKED`.
Escalation chain:
1. Backend owner
2. QA lead
3. Gate authority
No bypass path.

### 7.5 Ten-minute pre-prod lock call checklist
Read aloud checklist:
- current failing integrity tests count (must be zero)
- canonical checksum value
- webhook probe result
- IA missing-value negative test result
- consumed-event replay rejection result
- rollback rehearsal date
Call output:
- single go/no-go line with artifact IDs and UTC timestamp

## 8) Implementation plan for Phase 7 hardening
### 8.1 Backend implementation items
B-001 Add canonical fixture loader with strict array equality check.
B-002 Add runtime invariant wrappers with invariant IDs in error payload.
B-003 Add hash recompute verifier utility for CI + post-migration.
B-004 Add auth consume race harness for concurrent sign simulation.
B-005 Add migration manifest writer + immutable ledger logging.
B-006 Add webhook insert default validator.

### 8.2 QA implementation items
Q-001 Encode full regression matrix as executable suite.
Q-002 Add explicit precedence assertions for RTS guard order.
Q-003 Add IA visibility UI contract checks for inspection path.
Q-004 Add evidence bundle validator script with completeness checks.
Q-005 Add red/green report formatter tied to invariant IDs.

### 8.3 DevOps implementation items
D-001 Require integrity suite as blocking status check.
D-002 Retain integrity artifacts for 90 days minimum.
D-003 Enforce no prod deploy on missing P-001..P-008 artifacts.
D-004 Add env probe stage for webhook liveness in release pipeline.
D-005 Publish release manifest with backend/frontend commit hashes.

## 9) Exit criteria for Phase 7 integrity lock
Phase 7 closes only when all are true:
E-001 Invariants I-001 through I-005 are enforced in code and CI.
E-002 Regression matrix is green in two consecutive pipeline runs.
E-003 Migration safety + rollback rehearsal artifacts are valid.
E-004 Blocking policy is active and demonstrated in at least one dry-run.
E-005 Devraj/Cilla sign-off protocol completed on a production promotion event.
If any exit criterion is not met, Phase 7 remains open.

## 10) Final enforcement statement
Integrity is a contract, not a confidence signal.
This lock converts prior defect classes into binary controls.
When controls fail, release must fail.
That outcome is intentional and correct.
[Cilla] Ship standards, not optimism.

---
