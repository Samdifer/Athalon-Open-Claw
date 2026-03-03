# WS11-B Unblock Plan (Follow-on Run)
Date (UTC): 2026-02-22T16:43:00Z
Decision: WS11-A is **NOT READY_FOR_RERUN**; WS11-B replay rerun is **blocked**.

## 1) Dependency blocker statement
WS11-B rerun cannot execute because WS11-A prerequisite state is not satisfied:
- `ws11-b-final-replay-run.md`: WS11-A final sealed run = **FAIL**, `state=UNSEALED`, `signatureValid=false`, `missingRequired=29`.
- `ws11-a-evidence-generation-exec.md`: final state = **NOT_READY**; G1..G8 = **FAIL**; `READY_FOR_RERUN cannot be asserted`.
- `ws11-r3-reconciliation.md`: recovery gate remains **BLOCKED** (`WS11-R3-BLOCKED-UPSTREAM-EVIDENCE-CHAIN`).

## 2) Exact dependency blockers (must all clear)
1. No materialized authoritative run tree under `simulation/athelon/phase-8-qualification/runs/<RUN_ID>/` (29/29 required artifacts absent).
2. Bundle chain missing/invalid:
   - `bundle/index.json` absent
   - `bundle/seal.json` absent/invalid
   - `bundle/state.txt` absent (must be literal `SEALED`)
   - `bundle/checksum-report.json` absent
3. Hash/signature admissibility not provable:
   - seal signature invalid/unavailable
   - bundleHash recompute impossible
   - required file hash sweep impossible
4. Required failpath/governance/replay receipts absent in same run:
   - AT-11..AT-14 failpath + SEV1 alert
   - replay execution/verdict/signoff artifacts
   - determinism/governance artifacts (AT-16..AT-18)
5. WS11-A gating metrics not met:
   - `missingRequired` must be `0` (currently 29)
   - G1..G8 must all PASS
   - WS11-A must publish explicit `READY_FOR_RERUN`

## 3) Owner-by-owner unblock actions
### Cilla Oduya
- Generate and publish same-run artifacts:
  - `A1/deployment-metadata.json`
  - `A2/gates-draft.json`, `A2/gates-final.json` (with Marcus co-sign requirement)
  - `A6/device-capture-portrait.json`, `A6/device-capture-landscape.json`, `A6/ia-hardstop-capture.json`
- Co-own `A1/init.json` with Devraj.

### Devraj Anand
- Generate and publish same-run core + integrity artifacts:
  - `A1/init.json` (with Cilla), `A1/checksum-table.json`
  - `A4/export-ingest-success.json`, `A4/export-ingest-failure.json`
  - `A5/realtime-run-1.json`, `A5/realtime-run-2.json`, `A5/convergence-assertion.json`
  - failpaths/alerts: `AT-11`, `AT-12`, `AT-13`, `AT-14`, `SEV1-AT13` (with Marcus where specified)
  - `bundle/checksum-report.json`
- Re-run and publish G1..G8 validation log with Jonas.

### Marcus Webb
- Co-sign required WS11-A artifacts:
  - `A2/gates-final.json`
  - `A3/integrity-receipt.json` (with Devraj)
  - failpath receipts requiring Marcus (`AT-11`, `AT-13`, `AT-14`)
- Produce replay artifacts in same run:
  - `replay/replay-runbook-execution.json`
  - `replay/replay-verdict.json`
  - `replay/replay-signoff-marcus-webb.json`
- Co-own `governance/access-log-export.json` with Platform Operator.

### Jonas Harker
- Generate sealing/index artifacts:
  - `bundle/index.json`
  - `bundle/seal.json`
  - `bundle/state.txt` with exact literal `SEALED`
- Generate governance/determinism artifacts:
  - `determinism/AT-16-runA-vs-runB.json`
  - `governance/retention-tags-audit.json`
- Co-run/publish G1..G8 validation with Devraj.

### Platform Operator
- Provide/sign `governance/access-log-export.json` with Marcus Webb in same authoritative run.

### QA Witness (Priscilla “Cilla” Oduya as witness role where required)
- Witness-sign artifacts requiring QA witness payloads (notably convergence/integrity attestations) so signature completeness gate can pass.

## 4) Earliest rerun checkpoint (WS11-B)
WS11-B rerun may start only at the first checkpoint where all below are true in one WS11-A run:
- `READY_FOR_RERUN` explicitly declared by WS11-A
- `missingRequired=0`
- `bundle/state.txt == SEALED`
- `bundle/seal.json` signature valid
- bundleHash/index/hash sweep all valid (`mismatchCount=0`)
- failpath/replay/governance artifacts present and signed in same run

Time estimate from reconciliation baseline:
- **Earliest plausible checkpoint: T+48h from 2026-02-22T16:04:00Z (≈ 2026-02-24T16:04:00Z), no slip.**
- Any slip in WS11-A seal completion shifts checkpoint by equal delay.

## 5) WS11-B execution gate decision for this follow-on run
- **RERUN NOT AUTHORIZED NOW**
- Condition to authorize: WS11-A dependency clears exactly as specified above.