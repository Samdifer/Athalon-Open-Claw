# WS11-B Independent Replay Office — Final Rerun After WS11-A Seal

- Replay Office: WS11-B Independent Replay Office  
- Replay mode: **Blind replay, sealed-bundle-only**  
- Run under test: `WS11A-R3-FINAL-20260222T1602Z`  
- Bundle root: `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/`  
- Inputs admitted:
  - `bundle/index.json`
  - `bundle/seal.json`
  - `bundle/state.txt`
  - Indexed artifacts only (no out-of-band evidence)

## Deterministic replay findings

- `bundle/state.txt`: `SEALED` (present)
- `indexSha256(actual)`: `9f17edf1f7d1e79cd70b9e87a48a93932dbc9a9b14bbff8d3c19e9c3a9a099ea`
- `seal.indexSha256`: `9f17edf1f7d1e79cd70b9e87a48a93932dbc9a9b14bbff8d3c19e9c3a9a099ea` (matches)
- File sweep over index entries: 28 indexed files, 0 missing files, **2 hash mismatches**:
  1. `bundle/checksum-report.json` (indexed `6817face...` vs actual `bf2dcfe0...`)
  2. `bundle/seal.json` (indexed `5d48c072...` vs actual `a2f75479...`)
- `bundleHash` recompute from indexed file set: `4b2437d9bf7b2c46f8a17b2ff948461d7e628b47697dc47f1906581324c525f3`
- `seal.bundleHash`: `244ff23fce41bc7626f5421dffbfa54c9111a9dc2c2f61fb2c11b891c632f04a` (**mismatch**)
- Required AT coverage (AT-01..AT-18): complete
- **missingRequired: 0**

## Required checks table (14/14)

| Check ID | Required check | Result | Evidence basis |
|---|---|---|---|
| C01 | Intake lock to single sealed run/bundle | PASS | Single run root and bundle set used: `WS11A-R3-FINAL-20260222T1602Z` |
| C02 | `bundle/state.txt == SEALED` | PASS | `bundle/state.txt` value is `SEALED` |
| C03 | `bundle/seal.json` signature validity check | FAIL | Signature object present, but cryptographic validation is not reproducible from sealed bundle alone (no in-bundle key material/proof chain) |
| C04 | Index hash linkage check (`seal.indexSha256` vs actual index hash) | PASS | Both are `9f17edf1...` |
| C05 | Indexed file hash sweep (`mismatchCount=0`) | FAIL | `mismatchCount=2` (`bundle/checksum-report.json`, `bundle/seal.json`) |
| C06 | Required artifact coverage complete (`missingRequired=0`) | PASS | AT-01..AT-18 all represented in index |
| C07 | RC-01 / AT-10 seal-chain replay check | FAIL | Recomputed `bundleHash` (`4b2437d9...`) != sealed `bundleHash` (`244ff23f...`) |
| C08 | RC-02 / AT-11 missing-artifact hard-stop receipt replay | PASS | `failpaths/AT-11-missing-artifact-hardstop.json` shows `decision=NO_GO`, `enforced=true` |
| C09 | RC-03 / AT-12 schema-fail hard-stop receipt replay | PASS | `failpaths/AT-12-schema-missing-field-ci-fail.json` shows `decision=CI_FAIL`, `missingField=required.signatureId` |
| C10 | RC-04 / AT-13 tamper+SEV1 receipt replay | PASS | `AT-13` hard-stop receipt + `alerts/SEV1-AT13.json` acknowledged |
| C11 | RC-05 / AT-14 override-rejection receipt replay | PASS | `failpaths/AT-14-override-rejected.json` shows `decision=REJECTED_OVERRIDE`, `enforced=true` |
| C12 | RC-06 / AT-15 replay self-sufficiency from bundle only | PASS | `replay/replay-runbook-execution.json` shows `source=SEALED_ONLY`, `status=PASS` |
| C13 | RC-07/RC-08 governance+determinism replay (AT-16..AT-18) | PASS | `determinism/AT-16-runA-vs-runB.json` COMPLIANT; AT-17 PASS; AT-18 access export present |
| C14 | Final independence+witness attestation complete | PASS | Independence checks completed; witness signatures recorded below |

### Counter summary
- Required checks: **14**
- Passed: **11**
- Failed: **3**
- Blocked: **0**
- **missingRequired: 0**

## Witness independence checks + signatures

Independence checks:
- I-1 No live environment access during replay: **PASS**
- I-2 No developer narrative substitution: **PASS**
- I-3 No out-of-index/out-of-band evidence used: **PASS**
- I-4 Replay authority independent of artifact authoring: **PASS**
- I-5 Replay log published as decision artifact: **PASS**

Signatures:
- **/s/ Marcus Webb** — Replay Authority (WS11-B)
- **/s/ Priscilla Oduya** — QA Evidence Witness

## Taxonomy classification

**V3 (Not defensible)**

Reason: integrity chain is not defensible due to hash-chain failures in required checks C05 and C07, plus non-reproducible cryptographic signature validation under sealed-only admissibility (C03).

## Final binary verdict

# **HOLD**

Exact rationale:
1. Required checks are not 14/14 (11/14 passed).  
2. File hash sweep failed (`mismatchCount=2`).  
3. Seal-chain replay failed (`bundleHash` recompute mismatch).  
4. Per rule, **any required check failure => HOLD**.
