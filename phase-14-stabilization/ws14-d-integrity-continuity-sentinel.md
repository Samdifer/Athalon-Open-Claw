# WS14-D Integrity Continuity Sentinel

**Workstream:** WS14-D (Phase 14 Re-entry Stabilization)  
**Timestamp (UTC):** 2026-02-22T18:10:00Z  
**Objective:** Enforce deterministic continuity of policy→CI→artifact integrity across post-gate operations, with fail-closed detection and escalation.

---

## 1) Scope and authority baseline

This sentinel is anchored to:
- `simulation/athelon/phase-14-stabilization/ws14-a-canonical-evidence-registry.md` (canonical authority model, supersession, freeze/hash checkpoints)
- `simulation/athelon/phase-14-stabilization/ws14-b-reliability-drift-watch.md` (daily/weekly watch cadence + severity handling)
- `simulation/athelon/phase-14-stabilization/ws14-c-scale-margin-governance.md` (deterministic decision function, fail-closed HOLD/STOP posture)
- `simulation/athelon/phase-13-reentry-closure/ws13-d-integrity-rerun.md` (integrity dependency logic and closure requirements)
- `simulation/athelon/SIMULATION-STATE.md` (Phase 14 controls and exit criteria)

### 1.1 Sentinel mission
1. Continuously verify integrity continuity from governing policy to CI execution evidence to canonical artifacts.
2. Detect trace drift, hash drift, supersession drift, and freeze/signoff regressions.
3. Trigger deterministic escalation and automatic HOLD when invariants are violated.

---

## 2) Integrity continuity model (normative)

## 2.1 Continuity chain
`Policy Control ID -> CI Check ID -> Evidence Artifact -> Canonical Registry Record -> Freeze/Signoff`

A continuity assertion is valid only if all five links resolve and are hash-verifiable.

## 2.2 Required invariants

| Invariant ID | Requirement | Pass condition |
|---|---|---|
| IC-01 | Policy linkage completeness | Every active control has >=1 mapped CI check and >=1 mapped artifact |
| IC-02 | CI execution continuity | Latest required CI checks executed within cadence window and status PASS |
| IC-03 | Artifact hash continuity | Stored hash equals recomputed hash for all authoritative artifacts |
| IC-04 | Canonical authority uniqueness | Exactly one AUTHORITATIVE record per governed scope |
| IC-05 | Supersession integrity | All SUPERSEDED records point to `supersededByRecordId`; no orphan supersession |
| IC-06 | Freeze/signer completeness | GATE_CONVENE and weekly checkpoints have complete signer triad and freeze binding |
| IC-07 | Counter integrity continuity | Admissibility packet counters remain `missingRequired=0, mismatchCount=0, orphanRefCount=0` |
| IC-08 | Citation integrity | Authoritative records cite only authoritative or explicitly accepted superseded dependencies |

Any IC invariant failure is a sentinel event.

---

## 3) Sentinel checks (continuous cadence)

## 3.1 Daily checks (D-IC)
Run once per UTC day; all checks are mandatory.

1. **D-IC-01 Policy map reconciliation**  
   Recompute policy->CI->artifact matrix; compare against previous day snapshot.
2. **D-IC-02 Authoritative hash spot verification**  
   Re-hash all critical authoritative artifacts (minimum: WS13-A/B/C/D/E closure anchors + WS14-A/B/C artifacts).
3. **D-IC-03 Supersession graph validation**  
   Ensure no duplicate authoritative records and no broken supersession links.
4. **D-IC-04 Freeze/signoff freshness**  
   Verify latest checkpoint includes required signatures (Platform/QA/Regulatory).
5. **D-IC-05 Counter continuity check**  
   Re-validate zero-open packet counters for admissibility-governed contexts.
6. **D-IC-06 Citation admissibility scan**  
   Detect references to non-authoritative, missing, or hash-divergent dependencies.

Daily outputs:
- `integrity-sentinel/daily/YYYY-MM-DD-continuity.json`
- `integrity-sentinel/daily/YYYY-MM-DD-events.json`
- `integrity-sentinel/daily/YYYY-MM-DD-verdict.md`

## 3.2 Weekly checks (W-IC)
Run once per week UTC; full-depth integrity audit.

1. **W-IC-01 Full-chain recomputation** for all governed controls.
2. **W-IC-02 Full authoritative set re-hash** (not sample-based).
3. **W-IC-03 Freeze-history audit** across PRE-GATE / GATE_CONVENE / POST-GATE-DAILY / WEEKLY checkpoints.
4. **W-IC-04 Drift trend analysis** (7-day event recurrence, unresolved incidents, mean time to closure).
5. **W-IC-05 Exit-criteria support assertion** for Phase 14 integrity lane.

Weekly outputs:
- `integrity-sentinel/weekly/YYYY-Www-audit.json`
- `integrity-sentinel/weekly/YYYY-Www-trend.md`
- `integrity-sentinel/weekly/YYYY-Www-verdict.md`

---

## 4) Policy→CI→artifact trace continuity assertions

## 4.1 Assertion set

| Assertion ID | Deterministic assertion | Failure condition |
|---|---|---|
| TA-01 | Every policy control has at least one active CI check mapping | Unmapped control found |
| TA-02 | Every mapped CI check has a latest execution artifact with immutable digest | Missing artifact or digest |
| TA-03 | Every authoritative artifact is reachable from >=1 policy control via CI mapping | Orphan authoritative artifact |
| TA-04 | CI result status used for governance decisions is reproducible from stored artifacts | Result cannot be recomputed |
| TA-05 | Registry authority state is consistent with trace map (no authority mismatch) | Trace points to non-authoritative without explicit disposition |
| TA-06 | Freeze manifest entries exactly match authoritative artifact digest set at checkpoint time | Missing/extra/mismatched entry |

## 4.2 Deterministic assertion function
For each governed scope `s`:
1. Materialize control set `C_s`.
2. Resolve CI mapping set `M_s`.
3. Resolve artifact set `A_s` from CI outputs.
4. Resolve authoritative registry set `R_s`.
5. Assert TA-01..TA-06.
6. Emit binary result `PASS|FAIL` with machine-readable reason codes.

No partial-pass interpretation is allowed.

---

## 5) Detection rules (trace drift + hash/freeze regressions)

## 5.1 Event classes and rules

| Rule ID | Event | Detection logic | Severity | Auto action |
|---|---|---|---|---|
| DR-01 | Trace drift | `hash(trace_map_today) != hash(trace_map_last_green)` without approved change record | SEV2 | Open incident + constrain affected scope |
| DR-02 | Control mapping loss | Any previously mapped control has zero CI mappings | SEV1 | AUTO-HOLD |
| DR-03 | CI artifact gap | CI run exists but required evidence artifact/digest missing >1h | SEV2 | HOLD if unresolved >24h |
| DR-04 | Authoritative hash mismatch | recomputed hash != registry hash for authoritative artifact | SEV1 | AUTO-HOLD |
| DR-05 | Freeze manifest mismatch | checkpoint manifest differs from authoritative set at same checkpoint | SEV1 | AUTO-HOLD |
| DR-06 | Missing signer triad | required signer set incomplete at GATE_CONVENE/weekly | SEV1 | AUTO-HOLD |
| DR-07 | Supersession orphan | SUPERSEDED record missing backlink (`supersededBy`) | SEV2 | Constrain + remediate |
| DR-08 | Duplicate authoritative | >1 authoritative record per scope | SEV1 | AUTO-HOLD |
| DR-09 | Counter regression | any of `missingRequired/mismatchCount/orphanRefCount` > 0 in governed packet | SEV1 | AUTO-HOLD |
| DR-10 | Citation inadmissibility | authoritative record cites missing/rejected/unresolved dependency | SEV2 | HOLD if unresolved >24h |

## 5.2 Freeze/hash regression definitions
- **Hash regression:** authoritative artifact hash mismatch at any checkpoint.
- **Freeze regression:** required freeze checkpoint missing, incomplete, or non-equivalent to authoritative set.
- Either regression is release-blocking by default.

---

## 6) Escalation protocol and automatic HOLD triggers

## 6.1 Severity/SLA matrix

| Severity | Trigger classes | Notify SLA | Decision authority |
|---|---|---|---|
| SEV3 | early warning drift with no invariant break | 4h | Platform + QA |
| SEV2 | continuity degradation not yet gate-breaking | 1h | Platform + QA + Regulatory |
| SEV1 | invariant break, hash/freeze/counter/authority failure | 15m | Platform + QA + Regulatory + Gate Authority |

## 6.2 Automatic HOLD triggers (non-overridable until adjudication)

HOLD is triggered immediately when any occurs:
1. DR-02 Control mapping loss
2. DR-04 Authoritative hash mismatch
3. DR-05 Freeze manifest mismatch
4. DR-06 Missing signer triad at required checkpoint
5. DR-08 Duplicate authoritative record per scope
6. DR-09 Counter regression above zero-open state
7. Any unresolved SEV1 beyond SLA

HOLD release requires:
- root cause recorded,
- corrective action completed,
- two consecutive clean reruns of affected sentinel checks,
- tri-signoff (Platform + QA + Regulatory),
- Gate Authority approval for any prior SEV1.

## 6.3 Escalation runbook (deterministic order)
1. Detect event and classify by rule ID.
2. Freeze decision posture if AUTO-HOLD rule fired.
3. Open incident `INC-WS14D-<date>-<seq>`.
4. Snapshot pre-change evidence bundle (trace map, registry slice, hashes, freeze manifest).
5. Apply containment/remediation.
6. Re-run impacted checks twice.
7. Close or maintain HOLD based on binary outcomes.

---

## 7) Sentinel decision function

For each daily/weekly execution window:
1. If any AUTO-HOLD trigger is true -> `VERDICT = HOLD-CRITICAL`.
2. Else if any SEV2 unresolved within SLA -> `VERDICT = HOLD-DEGRADED`.
3. Else if any SEV3 open -> `VERDICT = WATCH`.
4. Else -> `VERDICT = PASS-STABLE`.

No manual override allowed unless full exception record with Gate Authority signoff is attached and hash-bound into registry.

---

## 8) Readiness verdict for WS14-D

**WS14-D artifact verdict:** **PASS (READY)**

### Basis
- Defines deterministic daily/weekly integrity continuity checks.
- Implements explicit policy->CI->artifact continuity assertions.
- Encodes concrete detection rules for trace drift and hash/freeze regressions.
- Establishes fail-closed escalation with automatic HOLD triggers.
- Aligns with Phase 14 derived controls and exit criteria in `SIMULATION-STATE.md`.

### Operational condition
Program-level clean-go remains conditional on sustained execution evidence (including consecutive weekly green reads and zero unresolved integrity incidents), but WS14-D control design is complete and operable.
