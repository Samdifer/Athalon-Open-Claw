# WS14-A Canonical Evidence Registry Hardening

**Workstream:** WS14-A (Phase 14 Re-entry Stabilization)  
**Timestamp (UTC):** 2026-02-22T18:32:00Z  
**Authority Basis:** Phase 13 gate condition set + WS13-B PASS-grade remediated trace map + WS13-E final rerun admissibility

---

## 1) Evidence basis (authoritative inputs)

This WS14-A control artifact is grounded only in the currently adjudicable records below.

| Evidence ID | Artifact | Key facts used in WS14-A policy |
|---|---|---|
| E-01 | `simulation/athelon/reviews/phase-13-reentry-gate-review.md` | Gate decision = **GO WITH CONDITIONS**; explicit requirement for superseded vs authoritative markers and freeze/hash re-verification at gate convene |
| E-02 | `simulation/athelon/phase-13-reentry-closure/ws13-b-trace-map-passgrade.md` | PASS-grade trace map, `completeness_score=1.00`, `brokenLinksOpen=0`, counters aligned to zero-open packet (`missingRequired=0`, `mismatchCount=0`, `orphanRefCount=0`) |
| E-03 | `simulation/athelon/phase-13-reentry/ws13-e-admissibility-final-rerun.md` | Final rerun decision = **PASS (Admissible)** with A/B/C/D prerequisites all MET; supersession rule for remediated artifacts explicitly stated |
| E-04 | `simulation/athelon/SIMULATION-STATE.md` | Phase 14 mission and derived controls: canonical index discipline + freeze/hash verification at checkpoints |
| E-05 | `simulation/athelon/ORCHESTRATOR-LOG.md` | Phase 14 scope confirms WS14-A as source-of-truth normalization stream |

### 1.1 Canonical file hash anchors (from E-02)

- `ws13-a-reliability-closure.md` sha256 `66165bb3d08e35319e6901b59d71374df99f9063ca7254bc65e61d8c911b187d`
- `ws13-b-evidence-finalization.md` sha256 `f4a21bb2d7fffec32daa4b2fe38c6a57468337ad05385c1a72d3d12d758f8f29`
- `ws13-c-scale-certification.md` sha256 `a86514f119c33cf35ed17a4aa2e112b99450132aa9107a99de28b424da534c7a`
- `ws13-d-integrity-recert-completion.md` sha256 `eabc2ae771ff56188a133cb361fa5d69b140fa197f4a1ac10221b3ec6338f0b6`
- `ws13-e-gate-preflight-audit.md` sha256 `5bb551de1eb06f9aa4588b9dbb76508fd86c2f84ab21e31f51be78fbbbc4f8cb`
- `ws13-e-admissibility-final.md` sha256 `d273093a53a9e1833614e61e9bae264ee4286202295ce1164e52dbb427045ed4`

These anchors define the baseline freeze set for Phase 14 registry governance.

---

## 2) Canonical registry schema (normative)

## 2.1 Record schema

```yaml
CanonicalRegistryRecord:
  recordId: string                       # unique immutable id
  scope:
    phase: string                        # e.g., PHASE-13, PHASE-14
    stream: string                       # WS13-A..WS13-E / WS14-*
    controlIds: string[]                 # e.g., C-13-01..C-13-05
  artifact:
    path: string                         # repo-relative path
    sha256: string                       # required
    generatedAtUtc: string               # ISO-8601
  authority:
    status: enum                         # AUTHORITATIVE | SUPERSEDED | CANDIDATE | REJECTED
    decisionId: string                   # adjudication id
    decisionAtUtc: string
    decidedByRole: enum                  # GATE_AUTHORITY | QA | REGULATORY | PLATFORM
    rationaleCode: string[]              # controlled vocabulary
  supersession:
    supersedesRecordId: string|null
    supersededByRecordId: string|null
    reasonCode: enum|null                # STALE_STATE | REMEDIATED_BLOCKER | HASH_DRIFT | COUNTER_RECOMPUTE | CITATION_DRIFT
  packetCounters:
    missingRequired: integer
    mismatchCount: integer
    orphanRefCount: integer
  freezeBinding:
    freezeId: string|null
    freezeCheckpoint: enum|null          # PRE-GATE | GATE_CONVENE | POST-GATE-DAILY | WEEKLY_HEALTH
    signerSet:
      platform: string|null
      regulatory: string|null
      qa: string|null
    signerSetComplete: boolean
  lineage:
    sourceEvidenceIds: string[]          # references Section 1 table IDs
    priorRecordIds: string[]
    notes: string|null
```

## 2.2 Schema invariants (must-pass)

1. Exactly one `AUTHORITATIVE` record exists per `(phase, stream, controlIds-set)` at decision time.  
2. Any `SUPERSEDED` record must have `supersededByRecordId` populated.  
3. `sha256` is mandatory for every adjudicable record.  
4. Gate-read record sets must show `packetCounters = {0,0,0}` for admissibility contexts inherited from WS13-B/WS13-E.  
5. `signerSetComplete=true` is mandatory for `GATE_CONVENE` checkpoint records.

---

## 3) Superseded vs authoritative marker policy

Based on E-01/E-03, supersession is governance-critical and non-optional.

### 3.1 Marker semantics

- **AUTHORITATIVE**: current decision-bearing record for a scope. Eligible for gate decision input.
- **SUPERSEDED**: historically retained but excluded from active decision math.
- **CANDIDATE**: drafted/validated record not yet authority-promoted.
- **REJECTED**: invalidated record never admitted to canonical packet.

### 3.2 Promotion/demotion rules

A record is promoted to AUTHORITATIVE only if all are true:
1. Hash present and validated against file payload.
2. Required counters for scope are within threshold (`0/0/0` for Phase 13 re-entry packet contexts).
3. No unresolved contradiction ticket exists for same scope.
4. Decision logged with `decisionId` and role attribution.

A record is demoted to SUPERSEDED when any are true:
1. A newer remediated record closes its blocker(s) (E-03 supersession precedent).
2. Hash/citation drift is proven.
3. Counter recompute invalidates old decision state.

### 3.3 Explicit precedence order

When conflicting records exist in same scope:
1. Newer hash-verified adjudicated record with explicit remediation closure
2. Older hash-verified adjudicated record
3. Unhashed or non-adjudicated narrative record

---

## 4) Freeze/hash re-verification policy by gate checkpoint

Derived directly from Phase 13 condition carry-forward (E-01/E-04).

| Checkpoint | Required actions | PASS condition | FAIL/HOLD condition |
|---|---|---|---|
| PRE-GATE | Build freeze manifest from current AUTHORITATIVE records; hash all entries | Manifest complete and all hashes present | Missing artifact/hash in manifest |
| GATE_CONVENE | Recompute all manifest hashes; verify signer triad (Platform/Regulatory/QA); rerun counter snapshot | Recomputed hashes match frozen set; signer triad complete; counters within threshold | Any mismatch, missing signer, or counter breach => **AUTO-HOLD** |
| POST-GATE-DAILY (7 days) | Daily spot re-hash of critical records (A/B/C/D/E set) + contradiction scan | No drift detected; no open contradiction tickets | Drift or open P1 contradiction => HOLD + incident |
| WEEKLY_HEALTH | Full packet re-hash + supersession audit + threshold report | No unresolved supersession ambiguity, thresholds met | Any threshold breach or unresolved supersession => FAIL weekly read |

### 4.1 Mandatory freeze set at GATE_CONVENE (minimum)

The six canonical Phase 13 closure anchors listed in Section 1.1 are mandatory entries. Any substitution requires a supersession decision record before convene.

---

## 5) Contradiction resolution protocol

### 5.1 Trigger classes

- Status contradiction (e.g., PASS vs FAIL for same stream/scope)
- Hash contradiction (stored hash != computed hash)
- Counter contradiction (`missingRequired`, `mismatchCount`, `orphanRefCount` divergence)
- Citation contradiction (authoritative record references non-authoritative dependency)

### 5.2 Deterministic process

1. Open `CR-*` contradiction ticket with scope and affected `recordId`s.
2. Lock scope from further authority transitions except contradiction workflow.
3. Recompute objective facts (hashes, counters, dependency pointer set).
4. Apply precedence order (Section 3.3).
5. Produce single adjudication: one AUTHORITATIVE winner, all others SUPERSEDED/REJECTED.
6. Re-run freeze check for impacted scope.
7. Close ticket only with role-attributed decision and evidence links.

### 5.3 SLA and severity

- **P1 (gate-blocking contradiction):** resolve within 4 hours, else gate stays HOLD.
- **P2 (non-gate contradiction):** resolve within 24 hours.
- **P3 (documentation-only drift):** resolve within 72 hours.

---

## 6) Weekly registry health checks and thresholds

Weekly read is PASS only if all six checks pass.

| Check ID | Metric | Threshold |
|---|---|---|
| WH-01 | Authoritative uniqueness violations | **0** |
| WH-02 | Open supersession links (`SUPERSEDED` without `supersededBy`) | **0** |
| WH-03 | Hash drift count in weekly full re-hash | **0** |
| WH-04 | Open P1/P2 contradiction tickets older than SLA | **0** |
| WH-05 | Counter integrity for gate packet contexts (`missingRequired`, `mismatchCount`, `orphanRefCount`) | **all = 0** |
| WH-06 | Freeze checkpoint completion rate (PRE-GATE, GATE_CONVENE, DAILY, WEEKLY) | **100%** |

### 6.1 Weekly outcome scale

- **GREEN (PASS):** all WH-01..WH-06 pass.  
- **AMBER (CONDITIONAL):** exactly one non-hash non-counter check degraded but remediated within 24h.  
- **RED (FAIL):** any hash drift, counter non-zero, or unresolved P1 contradiction.

Phase 14 exit criterion requires **two consecutive GREEN weekly reads** (E-04).

---

## 7) PASS/FAIL readiness statement

### 7.1 WS14-A readiness verdict

**PASS (WS14-A control artifact readiness):** this document establishes a deterministic canonical registry schema, marker policy, checkpointed freeze/hash re-verification rules, contradiction protocol, and quantified weekly health thresholds consistent with Phase 13 gate conditions.

### 7.2 Residual condition (not a WS14-A failure)

Operational readiness for full clean-go remains dependent on sustained execution evidence across Phase 14 streams (WS14-B/WS14-C/WS14-D/WS14-E), especially two consecutive GREEN weekly health reads and zero freeze/hash verification failures.

### 7.3 Binary declaration

- **WS14-A artifact status:** **PASS**  
- **Program clean-go status (Phase 14 global):** **CONDITIONAL / NOT YET FINAL** until Phase 14 exit criteria are satisfied.
