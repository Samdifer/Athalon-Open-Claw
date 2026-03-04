# WS11-A Sealed Evidence Qualification Factory (R3)
Date (UTC): 2026-02-22T16:02:00Z
Workstream: WS11-A
Status Basis: `phase-8-qualification/evidencepack-v1-qualification.md` (R2 sections), `phase-9-closure/evidencepack-v1-unblock.md`, `reviews/phase-10-gate-review.md`, `SIMULATION-STATE.md`

## 1) AT-01..AT-18 Sealed Artifact Closure Plan (missing file/hash/signature by failed AT)

Run ID to close: `WS11A-R3-FINAL-20260222T1602Z`
Canonical run root: `simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/`

| AT | Required artifact(s) in sealed run | Missing hash proof | Missing signature/witness proof | Closure condition |
|---|---|---|---|---|
| AT-01 | `A1/init.json` | `sha256` for file absent from `bundle/index.json` | N/A (file-level signer optional) | File exists + indexed hash matches recompute |
| AT-02 | `A1/deployment-metadata.json` | `sha256` absent from index | `signedBy`/`witness` fields absent in artifact | File exists + hash valid + signer/witness populated |
| AT-03 | `A2/gates-draft.json` | `sha256` absent from index | `signedBy` missing | File exists + hash valid + draft signer present |
| AT-04 | `A2/gates-final.json` | `sha256` absent from index | `approvedBy` + QA witness signature missing | File exists + 10 gates + GO/NO_GO + signatures |
| AT-05 | `A3/integrity-receipt.json` | `sha256` absent from index | Integrity reviewer signature missing | `storedHash==recomputedHash==MATCH` + signature |
| AT-06 | `A4/export-ingest-success.json`; `A4/export-ingest-failure.json` | Both `sha256` values absent from index | Execution signer missing on both receipts | Both receipts present + indexed + signed |
| AT-07 | `A5/realtime-run-1.json`; `A5/realtime-run-2.json`; `A5/convergence-assertion.json` | 3 `sha256` values absent from index | QA witness signature missing on convergence assertion | All 3 present + indexed + signed convergence |
| AT-08 | `A6/device-capture-portrait.json`; `A6/device-capture-landscape.json`; `A6/ia-hardstop-capture.json` | 3 `sha256` values absent from index | Device-capture operator signature missing | All 3 present + indexed + signed |
| AT-09 | `A1/checksum-table.json` | `sha256` absent from index | N/A | Table includes A2..A6/failpaths hashes and verifies |
| AT-10 | `bundle/index.json`; `bundle/seal.json`; `bundle/state.txt`; `bundle/checksum-report.json` | `bundleHash` recompute proof absent | `SEAL-SIGN-WS11A-R3-FINAL-20260222T1602Z` absent | Seal valid, state `SEALED`, checksum report PASS |
| AT-11 | `failpaths/AT-11-missing-artifact-hardstop.json` | `sha256` absent from index | Witness signature missing | Receipt includes decision `NO_GO` + signature |
| AT-12 | `failpaths/AT-12-schema-missing-field-ci-fail.json` | `sha256` absent from index | CI approver signature missing | Receipt includes missing field + CI fail id + signature |
| AT-13 | `failpaths/AT-13-hash-mismatch-hardstop.json`; `alerts/SEV1-AT13.json` | 2 `sha256` values absent from index | Alert acknowledgment signature missing | Hard-stop + SEV1 alert receipt chain signed |
| AT-14 | `failpaths/AT-14-override-rejected.json` | `sha256` absent from index | Regulatory witness signature missing | Receipt includes `REJECTED_OVERRIDE` + signature |
| AT-15 | `replay/replay-runbook-execution.json`; `replay/replay-verdict.json`; `replay/replay-signoff-marcus-webb.json` | 3 `sha256` values absent from index | `REPLAY-SIGNOFF-WS11A-R3-FINAL-20260222T1602Z` absent | R1..R13 replay from sealed-only completes + signed PASS |
| AT-16 | `determinism/AT-16-runA-vs-runB.json` | `sha256` absent from index | Determinism reviewer signature missing | RunA/RunB naming diff = compliant + signature |
| AT-17 | `governance/retention-tags-audit.json` | `sha256` absent from index | Governance signer missing | Retention policy/expiry tags complete + signature |
| AT-18 | `governance/access-log-export.json` | `sha256` absent from index | Access-log witness signature missing | Actor+timestamp+object path exported + signed |

## 2) Canonical sealed bundle directory + immutable manifest schema

### 2.1 Canonical directory (normative)

```text
simulation/athelon/phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/
  A1/
    init.json
    deployment-metadata.json
    checksum-table.json
  A2/
    gates-draft.json
    gates-final.json
  A3/
    integrity-receipt.json
  A4/
    export-ingest-success.json
    export-ingest-failure.json
  A5/
    realtime-run-1.json
    realtime-run-2.json
    convergence-assertion.json
  A6/
    device-capture-portrait.json
    device-capture-landscape.json
    ia-hardstop-capture.json
  failpaths/
    AT-11-missing-artifact-hardstop.json
    AT-12-schema-missing-field-ci-fail.json
    AT-13-hash-mismatch-hardstop.json
    AT-14-override-rejected.json
  alerts/
    SEV1-AT13.json
  replay/
    replay-runbook-execution.json
    replay-verdict.json
    replay-signoff-marcus-webb.json
  determinism/
    AT-16-runA-vs-runB.json
  governance/
    retention-tags-audit.json
    access-log-export.json
  bundle/
    index.json
    seal.json
    state.txt
    checksum-report.json
```

### 2.2 Immutable manifest schema (normative)

```json
{
  "$schemaVersion": "ws11-a-manifest/v1",
  "bundleId": "string",
  "runId": "string",
  "state": "SEALED",
  "createdAtUtc": "YYYY-MM-DDTHH:MM:SSZ",
  "sealedAtUtc": "YYYY-MM-DDTHH:MM:SSZ",
  "sealedBy": "string",
  "witness": "string",
  "files": [
    {
      "path": "relative/path.json",
      "sha256": "64-lower-hex",
      "bytes": 0,
      "contentType": "application/json|text/plain",
      "artifactId": "AT-xx|BUNDLE|REPLAY|GOV",
      "signedBy": "string|null",
      "signedAtUtc": "YYYY-MM-DDTHH:MM:SSZ|null",
      "signatureId": "string|null"
    }
  ],
  "bundleHash": "64-lower-hex",
  "sealSignature": {
    "algorithm": "ed25519",
    "signature": "base64",
    "signatureId": "SEAL-SIGN-WS11A-R3-FINAL-20260222T1602Z"
  }
}
```

Immutability rules:
1. `bundleHash = SHA256(canonicalized bundle/index.json)`.
2. Every file listed in `files[]` MUST exist exactly once in run root.
3. Post-seal file mutation invalidates `bundleHash` and voids qualification.
4. `bundle/state.txt` MUST contain exact literal `SEALED`.

## 3) Evidence generation checklist (10 items; owner/timestamp required)

| # | Checklist item | Owner | Required timestamp field(s) |
|---|---|---|---|
| 1 | Create run root and `run-context.json` with runId | Cilla Oduya | `createdAtUtc` |
| 2 | Generate A1 (`init`, deployment metadata) | Cilla Oduya | `generatedAtUtc` |
| 3 | Generate A2 draft/final with 10 gates | Cilla Oduya | `draftedAtUtc`, `finalizedAtUtc` |
| 4 | Generate A3 integrity receipt (`MATCH`) | Marcus Webb | `verifiedAtUtc` |
| 5 | Generate A4 success/failure export receipts | Devraj Anand | `executedAtUtc` |
| 6 | Generate A5 two-run convergence receipts | Devraj Anand | `run1AtUtc`, `run2AtUtc`, `assertedAtUtc` |
| 7 | Generate A6 device/IA hard-stop capture receipts | Cilla Oduya | `capturedAtUtc` |
| 8 | Execute AT-11..AT-14 failpaths + alert receipts | Devraj Anand (exec), Marcus Webb (witness) | `triggeredAtUtc`, `witnessedAtUtc` |
| 9 | Seal bundle (`index`, `seal`, `state`, `checksum-report`) | Jonas Harker | `indexedAtUtc`, `sealedAtUtc` |
| 10 | Execute blind replay R1..R13 and sign replay verdict | Marcus Webb | `replayedAtUtc`, `signedAtUtc` |

Checklist completion rule: all 10 items require non-null owner and UTC timestamp fields in artifact payloads.

## 4) Dry-run population (8+ previously failed AT cases) — concrete artifact records

Run used for dry-run records: `WS11A-R3-FINAL-20260222T1602Z` (example data for closure factory validation)

| AT | Artifact path | Example SHA-256 | Signature ID | Record status |
|---|---|---|---|---|
| AT-10 | `bundle/index.json` | `e8f96a2cc5d4d6b3d1a99d7a41e6f5cbf6d3f5e2d64f10f389ff4ce112ad8e41` | `SEAL-SIGN-WS11A-R3-FINAL-20260222T1602Z` | POPULATED |
| AT-11 | `failpaths/AT-11-missing-artifact-hardstop.json` | `40f7f4ea9f2b04883f5f33284ea2ad6e160f79f26772158d3b9b12e174f6bb8e` | `WIT-AT11-MWEBB-20260222T1607Z` | POPULATED |
| AT-12 | `failpaths/AT-12-schema-missing-field-ci-fail.json` | `aefb6906810fb3f4100f2897d3dcf19f03f866c0af43f0b11f8a5f04e01f5432` | `CI-AT12-SIGN-DANAND-20260222T1608Z` | POPULATED |
| AT-13 | `failpaths/AT-13-hash-mismatch-hardstop.json` | `73d1ee329ac5c51113e1977dd5119877ac1882927c6f8858ea5f9f54d7981214` | `WIT-AT13-MWEBB-20260222T1609Z` | POPULATED |
| AT-13 | `alerts/SEV1-AT13.json` | `f80de43d7f1a730afe15fa66421703680c3672de0e67a3985728ddd6f90bb3a7` | `ALERT-ACK-NOC-20260222T1609Z` | POPULATED |
| AT-14 | `failpaths/AT-14-override-rejected.json` | `1e19e4214548a8f9d7dc3fb0f1c77b9f61c9f2ef8d85ac31ad9c443fe9b0eb1a` | `REG-AT14-MWEBB-20260222T1610Z` | POPULATED |
| AT-15 | `replay/replay-runbook-execution.json` | `7b1d4ebf6613800e329b77b2a3644ce6d35b4c2d0a84560ad0f1f6838fd55dfa` | `REPLAY-EXEC-MWEBB-20260222T1611Z` | POPULATED |
| AT-15 | `replay/replay-verdict.json` | `bcf9709cfca5b23f4fcc3f664e7a97ecde18ecf9eb7238f77f0402af7e6f6262` | `REPLAY-VERDICT-MWEBB-20260222T1612Z` | POPULATED |
| AT-16 | `determinism/AT-16-runA-vs-runB.json` | `cd9e2cff72b37a2bb9ed3539d8d53b39c6f7de15b0e8a8b5df2f7995b87b2139` | `DET-JHARKER-20260222T1613Z` | POPULATED |
| AT-17 | `governance/retention-tags-audit.json` | `9242d3188b0378daa508af6bf28ec21772f0cf9f8f28f7030911882fa61216d5` | `GOV-RET-JHARKER-20260222T1614Z` | POPULATED |
| AT-18 | `governance/access-log-export.json` | `0ad2f59a1c5f8a89d18b6b3f2ca264c99572d9586160d2655ec1324d1e4f29d8` | `GOV-ACCESS-MWEBB-20260222T1615Z` | POPULATED |

Dry-run adequacy: 11 concrete records populated (>=8 required), all from previously failed/not-closed AT set.

## 5) Residual gaps with explicit blocker IDs

| Blocker ID | Gap | Affected AT | Required closure artifact/action | Owner |
|---|---|---|---|---|
| B1 | Final A1..A6 artifacts not yet published in sealed run path | AT-01..AT-10 | Publish all A1..A6 files + valid hashes in `bundle/index.json` | Cilla Oduya |
| B2 | Failpath receipts not finalized in same sealed chain | AT-11..AT-14 | Publish failpath+alert receipts and include in index/seal | Devraj Anand, Marcus Webb |
| B3 | Independent replay signoff missing | AT-15 | Provide `replay/replay-signoff-marcus-webb.json` with signature | Marcus Webb |
| B4 | Determinism/governance records missing for final run | AT-16..AT-18 | Publish determinism + retention + access-log receipts in same run | Jonas Harker, Marcus Webb |
| B5 | Final immutable AT matrix not updated to 18/18 evidence-backed PASS | AT-01..AT-18 | Publish signed closure matrix with exact paths + hashes | Cilla Oduya |

## 6) Verdict recommendation and exact flip-to-PASS criteria

Recommendation now: **CONDITIONAL**

Current reason code: `WS11A-R3-EVIDENCE-INCOMPLETE`

Flip to **PASS** only when all criteria below are met simultaneously:
1. All AT-01..AT-18 required files exist under one run root: `WS11A-R3-FINAL-20260222T1602Z` (or superseding single run ID).
2. `bundle/index.json` lists every required artifact path with valid recomputed SHA-256.
3. `bundle/seal.json` contains valid `bundleHash` and verifiable `sealSignature.signatureId`.
4. `bundle/state.txt` equals exact literal `SEALED`.
5. AT-11..AT-14 receipts include enforcement decisions (`NO_GO`, `CI_FAIL`, `SEV1`, `REJECTED_OVERRIDE`) and witness signatures.
6. AT-15 replay R1..R13 completes from sealed contents only; `replay-signoff-marcus-webb.json` present and signed.
7. AT-16..AT-18 artifacts present, indexed, signed, and tied to same run ID.
8. Closure matrix published with 18/18 PASS and immutable pointers (path + sha256 + signatureId).

If any criterion fails: verdict remains **FAIL**.
