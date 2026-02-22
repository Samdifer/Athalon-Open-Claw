# WS11 Seal Consistency Fix (WS11A-R3-FINAL-20260222T1602Z)

Date (UTC): 2026-02-22
Owner: Phase 11 Seal-Integrity Remediation
Scope: Deterministic repair of C03/C05/C07 failures in sealed bundle replay.

## 1) Root cause diagnosis

### Observed failure set
- C03 FAIL: seal signature not reproducible from bundle contents alone.
- C05 FAIL: index hash sweep mismatches for:
  - `bundle/checksum-report.json`
  - `bundle/seal.json`
- C07 FAIL: recomputed `bundleHash` != `seal.bundleHash`.

### Precise cause
Primary defect was a **self-referential sealing closure**:
1. `bundle/index.json` included hash entries for `bundle/seal.json` and `bundle/checksum-report.json`.
2. `bundle/seal.json` simultaneously carried values derived from `bundle/index.json` (`indexSha256`, `bundleHash`).
3. `bundle/checksum-report.json` was generated after index/seal mutation, changing bytes post-indexing.

This created a deterministic paradox (cyclic dependency):
- Updating index changes seal target values.
- Updating seal changes seal file hash.
- Updating checksum report changes checksum file hash.
- Index hash list therefore drifts unless closure artifacts are excluded from the indexed hash domain.

Secondary defect:
- C03 failed because cryptographic verification material was incomplete for sealed-only replay (no in-bundle public key + canonical payload definition sufficient for independent verification).

## 2) Corrected canonical hash/signing algorithm

## 2.1 Canonical index domain
Define **indexed hash domain** as all artifact files except closure artifacts:
- Excluded: `bundle/index.json`, `bundle/seal.json`, `bundle/checksum-report.json`
- Included: all other run artifacts (A1..A6, failpaths, replay, governance, determinism, alerts, `bundle/state.txt`)

## 2.2 Canonical bundle hash function
Compute `bundleHash` from indexed set only:
1. Sort indexed entries by `path` (bytewise ascending).
2. Build canonical material as newline-joined records:
   - `path:sha256`
   - trailing newline required.
3. `bundleHash = sha256(canonical_material)`.

Applied value:
- `bundleHash = 079428185599d59470e97dfef5896ff191db91c94293d3321924c141dc52efbb`

## 2.3 Canonical signature payload
Seal signature payload (JSON canonicalized with sorted keys, no insignificant whitespace):
- `bundleHash`
- `indexSha256`
- `runId`
- `sealedAtUtc`
- `sealedBy`
- `witness`

Signature algorithm: `ed25519`.
Seal now contains:
- `publicKeyPem`
- `signature` (base64)
- `payload`
- `payloadSha256`
- payload canonicalization declaration

This makes C03 independently reproducible from sealed bundle contents.

## 3) Exact artifact rewrite order (deterministic)

1. Recompute hashes for non-closure artifacts and rewrite `bundle/index.json` with excluded closure set.
2. Compute `indexSha256` from rewritten index.
3. Build canonical signature payload and sign it.
4. Write final `bundle/seal.json` with payload, signature, and public key.
5. Write informational `bundle/checksum-report.json` using final on-disk bytes.
6. Verify:
   - index sweep mismatch count = 0 (over indexed domain)
   - `seal.indexSha256 == sha256(bundle/index.json)`
   - recomputed `bundleHash == index.bundleHash == seal.bundleHash`
   - seal signature verifies with included public key.

## 4) Controls to prevent recurrence

1. **Domain separation control**: enforce closure-artifact exclusion in index generator.
2. **Single canonicalization control**: one canonical JSON mode (`sort_keys`, compact for payload hash).
3. **Deterministic ordering control**: path-sorted index entries only.
4. **Pre-release invariant gate** (hard fail):
   - C03 signature verify (bundle-only)
   - C05 mismatchCount==0
   - C07 bundleHash parity (index/seal/recompute)
5. **No mutable-after-seal control**: prohibit modifications to indexed artifacts after index write.
6. **Audit trace control**: record hash scope string (`bundleHashScope`) in index.

## 5) Artifacts corrected in-place
- `phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/index.json`
- `phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/seal.json`
- `phase-8-qualification/runs/WS11A-R3-FINAL-20260222T1602Z/bundle/checksum-report.json`

Outcome: deterministic seal consistency restored without self-reference paradox.
