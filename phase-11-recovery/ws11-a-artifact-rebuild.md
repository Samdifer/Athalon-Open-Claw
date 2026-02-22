# WS11-A Artifact Rebuild Plan (Emergency)
Date (UTC): 2026-02-22
Workstream: WS11-A
Failed run in scope: `WS11A-R3-FINAL-20260222T1602Z`
Canonical run root:
`simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/`
Authors:
- Devraj Anand (Backend)
- Jonas Harker (Platform)
Document type: Rebuild plan only (no PASS claims)

---

## 0) Failure baseline
[Devraj] Final closure record states:
- `state=UNSEALED`
- `signatureValid=false`
- `missingRequired=29`
[Jonas] No cross-run substitution permitted. No dry-run substitution permitted.

---

## 1) Missing artifact inventory (exactly 29, grouped by subsystem)

### A1
1) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A1/init.json`
2) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A1/deployment-metadata.json`
3) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A1/checksum-table.json`
Impact:
- Blocks AT-01
- Blocks AT-02
- Blocks AT-09
- Contributes to AT-10

### A2
4) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A2/gates-draft.json`
5) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A2/gates-final.json`
Impact:
- Blocks AT-03
- Blocks AT-04

### A3
6) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A3/integrity-receipt.json`
Impact:
- Blocks AT-05

### A4
7) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A4/export-ingest-success.json`
8) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A4/export-ingest-failure.json`
Impact:
- Blocks AT-06

### A5
9) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A5/realtime-run-1.json`
10) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A5/realtime-run-2.json`
11) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A5/convergence-assertion.json`
Impact:
- Blocks AT-07

### A6
12) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A6/device-capture-portrait.json`
13) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A6/device-capture-landscape.json`
14) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/A6/ia-hardstop-capture.json`
Impact:
- Blocks AT-08

### failpaths + alerts
15) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/failpaths/AT-11-missing-artifact-hardstop.json`
16) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/failpaths/AT-12-schema-missing-field-ci-fail.json`
17) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/failpaths/AT-13-hash-mismatch-hardstop.json`
18) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/failpaths/AT-14-override-rejected.json`
19) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/alerts/SEV1-AT13.json`
Impact:
- Blocks AT-11
- Blocks AT-12
- Blocks AT-13
- Blocks AT-14

### replay
20) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/replay/replay-runbook-execution.json`
21) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/replay/replay-verdict.json`
22) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/replay/replay-signoff-marcus-webb.json`
Impact:
- Blocks AT-15

### determinism
23) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/determinism/AT-16-runA-vs-runB.json`
Impact:
- Blocks AT-16

### governance
24) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/governance/retention-tags-audit.json`
25) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/governance/access-log-export.json`
Impact:
- Blocks AT-17
- Blocks AT-18

### bundle
26) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/index.json`
27) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/seal.json`
28) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/state.txt`
29) `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/checksum-report.json`
Impact:
- Blocks AT-10
- Cascades to AT-15 replay admissibility

---

## 2) Rebuild sequence (order, actions, owners)
[Devraj] Hash/seal ordering is strict.
[Jonas] Any out-of-order mutation after indexing requires re-index + re-seal.

### Phase P0 — environment setup
Step P0-1
- Owner: Jonas
- Action: create canonical root and folders
- Command/action:
  - `mkdir -p simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/{A1,A2,A3,A4,A5,A6,failpaths,alerts,replay,determinism,governance,bundle}`
Step P0-2
- Owner: Devraj
- Action: initialize local rebuild ledger (`bundle/rebuild-ledger.json`, operational only)
Step P0-3
- Owner: Jonas
- Action: enforce UTC timestamps and runId invariants in all generated JSON

### Phase P1 — generate base artifacts A1..A6
Step P1-1
- Owner: Cilla (+ Devraj support)
- Artifact: `A1/init.json`
- Action: write run envelope metadata
Step P1-2
- Owner: Cilla
- Artifact: `A1/deployment-metadata.json`
- Action: write deployment metadata + witness fields
Step P1-3
- Owner: Cilla
- Artifact: `A2/gates-draft.json`
- Action: write draft gate transcript
Step P1-4
- Owner: Cilla + Marcus witness
- Artifact: `A2/gates-final.json`
- Action: finalize 10 gates and decision record
Step P1-5
- Owner: Marcus + Devraj
- Artifact: `A3/integrity-receipt.json`
- Action: store/recompute hash parity receipt
Step P1-6
- Owner: Devraj
- Artifact: `A4/export-ingest-success.json`
- Action: write success ingestion record
Step P1-7
- Owner: Devraj
- Artifact: `A4/export-ingest-failure.json`
- Action: write forced-failure ingestion record
Step P1-8
- Owner: Devraj
- Artifact: `A5/realtime-run-1.json`
- Action: capture run-1 receipt
Step P1-9
- Owner: Devraj
- Artifact: `A5/realtime-run-2.json`
- Action: capture run-2 receipt
Step P1-10
- Owner: Devraj + QA witness
- Artifact: `A5/convergence-assertion.json`
- Action: emit convergence assertion from run1/run2
Step P1-11
- Owner: Cilla
- Artifact: `A6/device-capture-portrait.json`
- Action: emit portrait capture receipt
Step P1-12
- Owner: Cilla
- Artifact: `A6/device-capture-landscape.json`
- Action: emit landscape capture receipt
Step P1-13
- Owner: Cilla
- Artifact: `A6/ia-hardstop-capture.json`
- Action: emit IA hard-stop capture receipt

### Phase P2 — fail-path and alert receipts
Step P2-1
- Owner: Devraj + Marcus witness
- Artifact: `failpaths/AT-11-missing-artifact-hardstop.json`
- Action: document missing-artifact hard-stop; decision=`NO_GO`
Step P2-2
- Owner: Devraj
- Artifact: `failpaths/AT-12-schema-missing-field-ci-fail.json`
- Action: document missing schema field + CI failure ID
Step P2-3
- Owner: Devraj + Marcus witness
- Artifact: `failpaths/AT-13-hash-mismatch-hardstop.json`
- Action: document tamper simulation and hard-stop
Step P2-4
- Owner: Devraj (+ NOC ack)
- Artifact: `alerts/SEV1-AT13.json`
- Action: document SEV1 alert emission and acknowledgment
Step P2-5
- Owner: Devraj + Marcus witness
- Artifact: `failpaths/AT-14-override-rejected.json`
- Action: document override rejection; decision=`REJECTED_OVERRIDE`

### Phase P3 — determinism and governance
Step P3-1
- Owner: Jonas
- Artifact: `determinism/AT-16-runA-vs-runB.json`
- Action: emit determinism comparison receipt
Step P3-2
- Owner: Jonas
- Artifact: `governance/retention-tags-audit.json`
- Action: emit retention-tag audit receipt
Step P3-3
- Owner: Marcus + platform operator
- Artifact: `governance/access-log-export.json`
- Action: emit actor/timestamp/object-path access export

### Phase P4 — checksum and bundle seal chain
Step P4-1
- Owner: Devraj
- Artifact: `A1/checksum-table.json`
- Action: compute SHA-256 table covering required artifacts
Step P4-2
- Owner: Jonas
- Artifact: `bundle/index.json`
- Action: emit canonical file index + sha256 per path
Step P4-3
- Owner: Devraj
- Artifact: `bundle/checksum-report.json`
- Action: recompute and compare against index
Step P4-4
- Owner: Jonas
- Artifact: `bundle/seal.json`
- Action: compute bundleHash; attach `SEAL-SIGN-WS11A-R3-FINAL-20260222T1602Z`
Step P4-5
- Owner: Jonas
- Artifact: `bundle/state.txt`
- Action: write exact literal `SEALED`

### Phase P5 — replay closure
Step P5-1
- Owner: Marcus
- Artifact: `replay/replay-runbook-execution.json`
- Action: log R1..R13 replay from sealed contents only
Step P5-2
- Owner: Marcus
- Artifact: `replay/replay-verdict.json`
- Action: publish replay verdict class and rationale
Step P5-3
- Owner: Marcus
- Artifact: `replay/replay-signoff-marcus-webb.json`
- Action: publish replay signoff linked to same runId

---

## 3) Seal prerequisites checklist + validation gates

### 3.1 Prerequisites before any seal attempt
- [ ] All 29 required files exist at exact paths
- [ ] No JSON syntax errors
- [ ] Required schema fields populated (timestamps, signer IDs)
- [ ] All timestamps UTC (`...Z`)
- [ ] A1 checksum table present and complete
- [ ] Fail-path decisions include `NO_GO`, `CI_FAIL`, `SEV1`, `REJECTED_OVERRIDE`
- [ ] No cross-run URI/path references
- [ ] Replay artifacts not generated from live dependencies

### 3.2 Validation gates
Gate G1 (presence)
- Check: 29/29 required files present
- Fail result: NO_GO
Gate G2 (path immutability)
- Check: all required files under exact run root
- Fail result: NO_GO
Gate G3 (hash completeness)
- Check: each required path has SHA-256 in `bundle/index.json`
- Fail result: NO_GO
Gate G4 (checksum consistency)
- Check: recompute matches index for every required file
- Fail result: NO_GO
Gate G5 (signature completeness)
- Check: required signer/witness/signatureId fields exist
- Fail result: NO_GO
Gate G6 (seal validity)
- Check: `bundleHash` recompute equals sealed value
- Fail result: NO_GO
Gate G7 (seal state)
- Check: `bundle/state.txt` equals exact `SEALED`
- Fail result: NO_GO
Gate G8 (replay admissibility)
- Check: replay artifacts are same-run and sealed-pack-only
- Fail result: NO_GO

---

## 4) AT-01..AT-18 blockers mapped to missing artifacts
AT-01:
- `.../A1/init.json`
AT-02:
- `.../A1/deployment-metadata.json`
AT-03:
- `.../A2/gates-draft.json`
AT-04:
- `.../A2/gates-final.json`
AT-05:
- `.../A3/integrity-receipt.json`
AT-06:
- `.../A4/export-ingest-success.json`
- `.../A4/export-ingest-failure.json`
AT-07:
- `.../A5/realtime-run-1.json`
- `.../A5/realtime-run-2.json`
- `.../A5/convergence-assertion.json`
AT-08:
- `.../A6/device-capture-portrait.json`
- `.../A6/device-capture-landscape.json`
- `.../A6/ia-hardstop-capture.json`
AT-09:
- `.../A1/checksum-table.json`
AT-10:
- `.../bundle/index.json`
- `.../bundle/seal.json`
- `.../bundle/state.txt`
- `.../bundle/checksum-report.json`
AT-11:
- `.../failpaths/AT-11-missing-artifact-hardstop.json`
AT-12:
- `.../failpaths/AT-12-schema-missing-field-ci-fail.json`
AT-13:
- `.../failpaths/AT-13-hash-mismatch-hardstop.json`
- `.../alerts/SEV1-AT13.json`
AT-14:
- `.../failpaths/AT-14-override-rejected.json`
AT-15:
- `.../replay/replay-runbook-execution.json`
- `.../replay/replay-verdict.json`
- `.../replay/replay-signoff-marcus-webb.json`
AT-16:
- `.../determinism/AT-16-runA-vs-runB.json`
AT-17:
- `.../governance/retention-tags-audit.json`
AT-18:
- `.../governance/access-log-export.json`
Expansion for `...`:
`simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z`

---

## 5) Earliest credible re-run window + go/no-go checklist

### 5.1 Earliest credible window
[Devraj] Based on documented owner ETAs in qualification/review materials:
- Earliest rebuild start: 2026-02-24T18:00:00Z
- Earliest seal-ready checkpoint: 2026-02-24T22:00:00Z
- Earliest replay signoff window: 2026-02-25T12:00:00Z
[Jonas] This is conditional and slips immediately on any missing signer/witness or failed gate.

### 5.2 Go checklist
- [ ] 29/29 required artifacts present
- [ ] `missingRequired=0`
- [ ] `bundle/index.json` complete and hash-valid
- [ ] `bundle/seal.json` signature valid
- [ ] `bundle/state.txt` is exactly `SEALED`
- [ ] AT-11..AT-14 receipts present and signed
- [ ] AT-15 replay artifacts present and signed
- [ ] Determinism + governance artifacts present and signed
- [ ] Chain-of-custody entries complete (seal + replay)

### 5.3 No-go triggers
- [ ] Any required artifact missing or malformed
- [ ] Any checksum mismatch
- [ ] Missing/invalid seal signature
- [ ] Missing replay signoff artifact
- [ ] Cross-run reference detected
- [ ] Non-UTC/null required timestamps

---

## 6) Current repo-state blockers (cannot be ignored)
[Devraj] With current repo contents:
1) Target run root is not materially populated with required final artifacts.
2) Seal artifacts are absent (`index`, `seal`, `state`, checksum report).
3) Final same-run fail-path receipts are absent.
4) Replay signoff artifact is absent.
[Jonas] Therefore current state cannot satisfy pre-seal gates; immediate rerun declaration is not defensible.

---

## 7) Rebuild verdict
**Rebuild verdict: `NOT_READY`**
Reason:
- Mandatory artifacts and same-run seal chain are not present in current repository state.
- Required AT-11..AT-14 and AT-15 closure objects are absent.
Flip criteria to `READY_FOR_RERUN`:
1) 29 required artifacts exist at exact paths for `WS11A-R3-FINAL-20260222T1602Z`.
2) Hash/index/seal/state chain validates with no mismatch.
3) Fail-path + alert receipts are same-run, signed, and indexed.
4) Replay artifacts are same-run, signed, and sealed-pack-only derived.
5) Determinism + governance receipts are present and signed in same run.

---

## 8) Ownership matrix
- Cilla Oduya: A1/A2/A6 artifacts, final AT closure matrix inputs
- Devraj Anand: A4/A5 + failpaths + checksum-table/report
- Jonas Harker: deterministic indexing, seal generation, state control
- Marcus Webb: integrity witness, failpath witness, replay signoff
[Jonas] No owner substitution without explicit audit annotation.

---

## 9) Document close
This file is an emergency rebuild plan only.
No PASS call is made.
No GO call is made.
Current status remains `NOT_READY`.
