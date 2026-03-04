# WS11-B Independent Replay Office (R3)
Date: 2026-02-22 (UTC)  
Owner: Marcus Webb (Regulatory Replay Authority)  
Witness: Priscilla "Cilla" Oduya (QA Evidence Witness)

## 0) Scope, dependency status, and assumptions

### Inputs reviewed
- `simulation/athelon/phase-8-qualification/evidencepack-v1-qualification.md`
- `simulation/athelon/phase-9-closure/evidencepack-v1-unblock.md`
- `simulation/athelon/SIMULATION-STATE.md`
- `simulation/athelon/phase-11-recovery/ws11-a-evidence-factory-r3.md` **(not present at review time)**

### Dependency status
WS11-B depends on WS11-A delivering one sealed, hash-verifiable evidence bundle (A1..A6 + failpaths + governance + replay metadata + bundle index/seal/state).

### Assumptions (explicit, due to missing WS11-A R3 output)
A1. WS11-A R3 will publish a single authoritative run root under `phase-8-qualification/runs/<RUN_ID>/`.
A2. `bundle/index.json`, `bundle/seal.json`, and `bundle/state.txt` will exist and be internally consistent.
A3. AT-11..AT-14 fail-path receipts will be inside the same run index (no cross-run substitution).
A4. Witness signatures required for replay closure are available in machine-readable artifacts.
A5. Any evidence not in the sealed bundle is inadmissible for replay determination.

---

## 1) Independent blind replay protocol (sealed bundle only, no out-of-band data)

### 1.1 Non-negotiable admissibility rules
1. **Sealed-only rule:** only files listed in `bundle/index.json` are admissible.
2. **No out-of-band rule:** no live app, DB, API, developer narrative, screenshots, chat notes, or unstamped exports.
3. **Single-run rule:** all required AT evidence must resolve to one `runId`.
4. **Hash-first rule:** no content review begins until index and seal validation pass.
5. **Fail-closed rule:** any missing/invalid required artifact => immediate V3 candidate unless classified as allowed V2 clarifier.

### 1.2 Protocol steps (R3 replay runbook)
**R1 Intake lock**
- Open read-only copy of candidate bundle.
- Record `runId`, `bundleId`, intake timestamp.

**R2 Lifecycle state check**
- Verify `bundle/state.txt == SEALED`.
- Expected output: `PASS_SEALED_STATE`.

**R3 Seal authenticity check**
- Validate signature in `bundle/seal.json` against approved keyset.
- Expected output: `PASS_SEAL_SIGNATURE`.

**R4 Index hash recompute**
- Canonicalize and hash `bundle/index.json`; match `bundleHash` in seal.
- Expected output: `PASS_INDEX_HASH_MATCH`.

**R5 File hash sweep**
- Recompute SHA-256 for every indexed file.
- Expected output: `PASS_FILE_HASH_SWEEP` with `mismatchCount=0`.

**R6 Coverage gate (AT evidence completeness)**
- Confirm mandatory artifacts for AT-01..AT-18 exist in index.
- Expected output: `PASS_REQUIRED_ARTIFACT_COVERAGE`.

**R7 Content replay checks**
- Execute AT scenario replay checks from bundle files only.
- Expected output: per-scenario PASS/FAIL with evidence pointers.

**R8 Independence attestation**
- Both witnesses sign that no out-of-band inputs were used.
- Expected output: dual sign-off present.

**R9 Verdict assignment (V1/V2/V3)**
- Apply taxonomy in Section 4.
- Expected output: final class + closure recommendation.

---

## 2) Witness model (roles, independence criteria, sign-off format)

### 2.1 Roles
- **Replay Authority (primary):** Marcus Webb  
  Owns final V1/V2/V3 class and WS11-B closure call.
- **QA Evidence Witness (secondary):** Priscilla "Cilla" Oduya  
  Confirms artifact sufficiency and that evidence pointers are reproducible.
- **Observer (optional, non-voting):** Automation custodian (e.g., Jonas Harker)  
  May answer procedural questions but cannot supply additional evidence.

### 2.2 Independence criteria (must all pass)
- I-1: No live environment access (app/db/api) during replay.
- I-2: No developer-provided interpretation beyond what is in bundle receipts.
- I-3: No files outside `bundle/index.json` considered.
- I-4: Replay authority did not author the evidence artifacts under test.
- I-5: Timestamped replay log is immutable after verdict publication.

### 2.3 Sign-off format (required fields)
```json
{
  "ws": "WS11-B",
  "runId": "<RUN_ID>",
  "bundleId": "<BUNDLE_ID>",
  "replayWindowUtc": {"start": "<ISO8601Z>", "end": "<ISO8601Z>"},
  "independenceChecks": {
    "I-1": "PASS|FAIL",
    "I-2": "PASS|FAIL",
    "I-3": "PASS|FAIL",
    "I-4": "PASS|FAIL",
    "I-5": "PASS|FAIL"
  },
  "verdictClass": "V1|V2|V3",
  "summary": "<concise rationale>",
  "signedBy": [
    {"name": "Marcus Webb", "role": "Replay Authority", "signature": "<sig>", "signedAtUtc": "<ISO8601Z>"},
    {"name": "Priscilla Oduya", "role": "QA Witness", "signature": "<sig>", "signedAtUtc": "<ISO8601Z>"}
  ]
}
```

---

## 3) Replay test cases (critical AT scenarios) with expected outputs

> Minimum critical set below covers 8 scenarios (>=6 required).

| Case ID | AT Scenario | Replay input(s) from sealed bundle | Replay check | Expected output |
|---|---|---|---|---|
| RC-01 | AT-10 Seal creation/integrity | `bundle/index.json`, `bundle/seal.json`, `bundle/state.txt` | Recompute index hash; validate seal signature/state | `PASS_SEAL_CHAIN_VALID` |
| RC-02 | AT-11 Missing artifact hard-stop | `failpaths/AT-11-missing-artifact-hardstop.json` | Verify decision=`NO_GO`, reason references missing required artifact | `PASS_HARDSTOP_AT11` |
| RC-03 | AT-12 Schema missing-field CI hard-stop | `failpaths/AT-12-schema-missing-field-ci-fail.json` | Verify field-level error includes missing key and blocking status | `PASS_HARDSTOP_AT12` |
| RC-04 | AT-13 Tamper/hash mismatch + SEV-1 | `failpaths/AT-13-hash-mismatch-hardstop.json`, `alerts/SEV1-AT13.json` | Verify mismatch detected, pipeline blocked, alert emitted | `PASS_HARDSTOP_AT13_SEV1` |
| RC-05 | AT-14 Override rejection | `failpaths/AT-14-override-rejected.json` | Verify override request explicitly rejected/no bypass | `PASS_NO_OVERRIDE_BYPASS` |
| RC-06 | AT-15 Blind replay sufficiency | full bundle + replay receipts | Confirm all replay steps execute with no out-of-band dependency | `PASS_REPLAY_SELF_SUFFICIENT` |
| RC-07 | AT-16 Naming determinism | `determinism/AT-16-runA-vs-runB.json` | Verify deterministic naming rules across compared runs | `PASS_NAMING_DETERMINISM` |
| RC-08 | AT-17/AT-18 Governance evidence | `governance/retention-tags-audit.json`, `governance/access-log-export.json` | Verify retention metadata and read access logs present for same runId | `PASS_GOVERNANCE_TRACE` |

Failure behavior for any case:
- Missing input artifact in index => `FAIL_MISSING_ARTIFACT` (V3 trigger)
- Hash mismatch => `FAIL_HASH_CHAIN` (V3 trigger)
- Present but ambiguous non-material metadata => `FAIL_CLARIFICATION_REQUIRED` (V2 candidate)

---

## 4) Failure taxonomy (V1/V2/V3) and mapping of current defects

### 4.1 Taxonomy
- **V1 (Defensible):** complete sealed evidence chain; all required replay checks pass; no material ambiguity.
- **V2 (Defensible with clarifying note):** evidence chain intact; minor non-material ambiguity (format/labeling) that does not change control outcome.
- **V3 (Not defensible):** missing, unverifiable, cross-run, tampered, or out-of-band-dependent evidence blocks replay certainty.

### 4.2 Current defect mapping (from reviewed artifacts)
| Defect ID | Observed defect | Evidence source | Taxonomy impact | Current class contribution |
|---|---|---|---|---|
| D-01 | Final sealed WS11-A artifact set absent in repo path | `evidencepack-v1-qualification.md` (Sections 7/9/10) | Missing chain root | V3 |
| D-02 | `bundle/index.json`/`seal.json`/`state.txt` not verifiable for final run | `evidencepack-v1-qualification.md` §7.4 | Cannot authenticate bundle | V3 |
| D-03 | AT-11..AT-14 receipts cited as dry-run/planned, not sealed final-run evidence | `evidencepack-v1-qualification.md` §7.2/7.3 + Phase 9 dry-run table | Fail-path controls not admissible | V3 |
| D-04 | AT-15 replay currently recorded as controlled failure (insufficiency) | `evidencepack-v1-qualification.md` §10 | Replay cannot complete R1..R12 | V3 |
| D-05 | WS11-A R3 dependency artifact missing | filesystem ENOENT for `ws11-a-evidence-factory-r3.md` | Upstream closure state unresolved | V3 |

Current WS11-B posture remains **V3** until D-01..D-05 are cleared.

---

## 5) Re-run results template (ready for immediate execution)

## 5.1 Header
- Replay Run ID: `WS11B-R3-<UTCSTAMP>`
- Candidate Bundle ID: `<BUNDLE_ID>`
- Candidate Run ID: `<RUN_ID>`
- Replay Start UTC: `<ISO8601Z>`
- Replay End UTC: `<ISO8601Z>`

## 5.2 Preflight checklist
- [ ] `bundle/state.txt` exists and equals `SEALED`
- [ ] `bundle/index.json` exists
- [ ] `bundle/seal.json` exists and signature validates
- [ ] Mandatory AT artifacts AT-01..AT-18 resolvable in index
- [ ] Witnesses assigned and conflict-of-interest check complete
- [ ] Network-disabled / no-live-dependency mode confirmed

## 5.3 Execution log table
| Step | Status (PASS/FAIL/BLOCKED) | Evidence pointer | Notes |
|---|---|---|---|
| R1 Intake lock |  |  |  |
| R2 Sealed state |  |  |  |
| R3 Seal signature |  |  |  |
| R4 Index hash recompute |  |  |  |
| R5 File hash sweep |  |  |  |
| R6 Artifact coverage |  |  |  |
| RC-01 AT-10 |  |  |  |
| RC-02 AT-11 |  |  |  |
| RC-03 AT-12 |  |  |  |
| RC-04 AT-13 |  |  |  |
| RC-05 AT-14 |  |  |  |
| RC-06 AT-15 |  |  |  |
| RC-07 AT-16 |  |  |  |
| RC-08 AT-17/18 |  |  |  |
| R8 Independence attestation |  |  |  |
| R9 Final class assignment |  |  |  |

## 5.4 Summary counters
- Required checks: `14`  
- Passed: `<n>`  
- Failed: `<n>`  
- Blocked: `<n>`  
- Missing artifacts: `<n>`

## 5.5 Final sign-off block
- Replay class: `V1 | V2 | V3`
- Closure recommendation: `CLEAR WS11-B | HOLD WS11-B`
- Replay Authority signature: __________________
- QA Witness signature: __________________
- Signed UTC: __________________

---

## 6) Verdict recommendation and exact pass threshold to clear WS11-B

## Recommendation (R3): **HOLD / NOT CLEARED** (current state)
Reason: reviewed evidence still indicates V3 (not defensible) pending sealed artifact sufficiency from WS11-A.

## Exact pass threshold for WS11-B clearance
WS11-B is cleared **only if all conditions below are true in one replay run**:
1. `bundle/state.txt == SEALED` and seal signature validates.
2. `bundleHash` recompute matches seal value.
3. 100% hash match for indexed files (`mismatchCount = 0`).
4. 100% required artifact coverage for AT-01..AT-18 (`missingRequired = 0`).
5. All 8 critical replay cases (RC-01..RC-08) = PASS.
6. Independence checks I-1..I-5 all PASS.
7. Final replay class assigned as **V1** (or **V2 only if** clarifying notes are explicitly non-material and do not affect any control decision).

### Quantified decision rule
- **Clear WS11-B:** `(Passed checks / Required checks) = 14/14` AND `verdictClass ∈ {V1, V2(non-material only)}` AND `missingRequired = 0`.
- **Do not clear WS11-B:** any FAILED/BLOCKED required check, any material ambiguity, any out-of-band dependency, or any V3 condition.

---

## 7) Immediate next actions
1. Wait for publication of `ws11-a-evidence-factory-r3.md` and corresponding sealed run artifacts.
2. Execute this R3 replay runbook immediately on first eligible sealed bundle.
3. Publish signed replay artifact at `phase-11-recovery/ws11-b-replay-office-r3-execution-<RUN_ID>.md`.
4. Update `SIMULATION-STATE.md` WS11-B status only after threshold in Section 6 is met.
