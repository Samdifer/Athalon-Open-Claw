# WS11-B Independent Replay Office — Rerun After Seal Consistency Fix

- Replay Office: WS11-B
- Replay mode: Blind replay, sealed-bundle-only
- Run under test: `WS11A-R3-FINAL-20260222T1602Z`
- Bundle root: `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/`
- Basis: in-repo sealed artifacts only
- Rerun timestamp (UTC): 2026-02-22T17:00:00Z

## Deterministic replay findings

- `bundle/state.txt`: `SEALED`
- `indexSha256(actual)`: `1b17b1b8c02418b95aff2fffb64b4bd8a0c01d71803141a46f21a8b9fbe624da`
- `seal.indexSha256`: `1b17b1b8c02418b95aff2fffb64b4bd8a0c01d71803141a46f21a8b9fbe624da` (match)
- Indexed file sweep (index domain): 26 indexed files, 0 missing, 0 mismatches
- `bundleHash` recompute: `079428185599d59470e97dfef5896ff191db91c94293d3321924c141dc52efbb`
- `seal.bundleHash`: `079428185599d59470e97dfef5896ff191db91c94293d3321924c141dc52efbb` (match)
- Seal signature verification: PASS (ed25519 verify with in-bundle `publicKeyPem` and canonical payload)
- Required AT coverage (AT-01..AT-18): complete
- `missingRequired`: **0**

## Required checks table (14/14)

| Check ID | Required check | Result | Evidence basis |
|---|---|---|---|
| C01 | Intake lock to single sealed run/bundle | PASS | Single run root and bundle set used: `WS11A-R3-FINAL-20260222T1602Z` |
| C02 | `bundle/state.txt == SEALED` | PASS | `bundle/state.txt` value is `SEALED` |
| C03 | `bundle/seal.json` signature validity check | PASS | ed25519 signature verifies against canonical payload using in-bundle public key |
| C04 | Index hash linkage check (`seal.indexSha256` vs actual index hash) | PASS | Both are `1b17b1b8...` |
| C05 | Indexed file hash sweep (`mismatchCount=0`) | PASS | `mismatchCount=0` across 26 indexed entries |
| C06 | Required artifact coverage complete (`missingRequired=0`) | PASS | AT-01..AT-18 represented; no missing required IDs |
| C07 | RC-01 / AT-10 seal-chain replay check | PASS | Recomputed bundleHash matches index/seal value |
| C08 | RC-02 / AT-11 missing-artifact hard-stop receipt replay | PASS | `failpaths/AT-11-missing-artifact-hardstop.json` indicates `decision=NO_GO`, `enforced=true` |
| C09 | RC-03 / AT-12 schema-fail hard-stop receipt replay | PASS | `failpaths/AT-12-schema-missing-field-ci-fail.json` indicates `decision=CI_FAIL` |
| C10 | RC-04 / AT-13 tamper+SEV1 receipt replay | PASS | AT-13 receipt + `alerts/SEV1-AT13.json` present and linked |
| C11 | RC-05 / AT-14 override-rejection receipt replay | PASS | `failpaths/AT-14-override-rejected.json` indicates enforced rejection |
| C12 | RC-06 / AT-15 replay self-sufficiency from bundle only | PASS | replay artifacts present and sealed-only replay executable |
| C13 | RC-07/RC-08 governance+determinism replay (AT-16..AT-18) | PASS | determinism/governance/access-log artifacts present and indexed |
| C14 | Final independence+witness attestation complete | PASS | Independent replay constraints maintained; attestations complete |

### Counter summary
- Required checks: **14**
- Passed: **14**
- Failed: **0**
- Blocked: **0**
- `missingRequired`: **0**

## Targeted prior failures (resolved)
- C03: **PASS** (was FAIL)
- C05: **PASS** (was FAIL)
- C07: **PASS** (was FAIL)

## Taxonomy classification
**V1 (Defensible from bundle)**

## Final binary verdict
# **CLEARED**

Rationale: all required checks passed (14/14), missingRequired is zero, signature/hash chain is reproducible and internally consistent from bundle contents only.
