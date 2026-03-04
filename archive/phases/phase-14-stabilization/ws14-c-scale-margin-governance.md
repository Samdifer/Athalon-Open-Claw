# WS14-C Scale Margin Governance

**Workstream:** WS14-C (Phase 14 Stabilization)  
**Timestamp (UTC):** 2026-02-22T18:55:00Z  
**Objective:** Preserve WS13-C certified controlled-scale margins with deterministic KPI boundaries, auditable breach handling, and evidence-first operating discipline through Phase 14 stabilization.

---

## 1) Objective Checklist (Explicit PASS/FAIL Criteria)

| ID | Objective | PASS Criteria (deterministic) | FAIL Criteria | Status |
|---|---|---|---|---|
| WS14C-01 | Canonical baseline freeze | All governance thresholds and guardbands anchor to WS13-C certified baseline values and cited evidence refs | Any threshold is uncited, ad hoc, or conflicts with WS13-C baseline | PASS |
| WS14C-02 | Deterministic control bands | KPI green/amber/red conditions are numerically defined with no narrative-only interpretation | Undefined ranges, implicit judgment, or role-dependent thresholds | PASS |
| WS14C-03 | Error-budget governance | Weekly budget policy defines watch/hold/stop bands and release decision rules | Budget can exceed band without mandatory decision state change | PASS |
| WS14C-04 | Escalation determinism | Amber/red conditions map to fixed severity, owners, response SLAs, and escalation path | Breaches handled informally or missing owner/SLA mapping | PASS |
| WS14C-05 | Monitoring cadence operability | Daily/shift/weekly review cadence defines exact inputs, formulas, and signoff outputs | Missing cadence, missing computations, or unsigned records | PASS |
| WS14C-06 | Breach + rollback playbooks | Red/critical conditions include mandatory containment, rollback/mitigation sequence, and closure criteria | No fail-closed behavior, no rollback criteria, or no requalification path | PASS |
| WS14C-07 | Evidence discipline | Every decision (GO/HOLD/STOP) requires linked evidence pointers + hashes/signatures per WS14-A governance model | Decision made without complete evidence set or citation integrity | PASS |
| WS14C-08 | Readiness judgment | Final status block issues explicit readiness verdict with evidence links and conditions | No explicit readiness call or uncited conclusion | PASS |

---

## 2) Canonical Baseline Set (From WS13-C Certification)

### 2.1 Source Authority
Primary baseline source:  
- `simulation/athelon/phase-13-reentry-closure/ws13-c-scale-certification.md`

Supporting operational closure context:  
- `simulation/athelon/phase-13-reentry-closure/ws13-c-ops-closure.md`

Phase 14 governance alignment references:  
- `simulation/athelon/phase-14-stabilization/ws14-a-canonical-evidence-registry.md`  
- `simulation/athelon/phase-14-stabilization/ws14-b-reliability-drift-watch.md`

### 2.2 Certified Baseline Metrics and Limits

| Baseline ID | Metric | WS13-C Baseline Anchor | Certified Current (S13-06) | Controlled-Scale Boundary Context |
|---|---|---:|---:|---|
| BL-01 | wPSR | 97.8% (R2 anchor) | 98.2% | Guardrail GR-01 green threshold >=97.0% |
| BL-02 | UDS | 95.8% (n=29, 95% CI [93.0, 98.1]) | 96.4% (n=34, CI [94.1, 98.4]) | Guardrail GR-02 requires >=95.0% and n>=20 |
| BL-03 | CAA median | 9.2d | 8.7d | Green <=10d |
| BL-04 | CAA P90 | 12.6d | 11.9d | Watch if >14d |
| BL-05 | CAA stale >14d | 0 | 0 | Must remain 0 for clean green |
| BL-06 | CAA stale >21d | 0 | 0 | Hard escalation if >0 |
| BL-07 | Weekly error budget burn | 41% (41/100 points) | 46% (46/100 points) | Soft watch >60%, hard stop >80% |
| BL-08 | Budget depletion projection | 7.0d headroom | 6.4d headroom | Must remain >5d headroom |
| BL-09 | Integrity lock coverage | 100% across S13-01..S13-06 | 100% | Required for all governance windows |
| BL-10 | Controlled profile envelope | CS-P13-L2 | CS-P13-L2 | No uncontrolled profile expansion allowed |

### 2.3 Baseline Confidence and Denominator Controls
1. UDS denominator floor: `n >= 20`; if `n < 20`, status auto-amber and cannot claim green qualification.
2. CI method for UDS is frozen to WS13-C method; method drift invalidates comparability.
3. KPI formulas and weighting profile are version-locked (WS13-C policy continuity).
4. Baseline comparisons use deterministic delta formulas:
   - Rate delta: `Δrate = current - baseline` (percentage points).
   - Aging delta: `Δdays = currentDays - baselineDays`.
5. Controlled-scale traffic normalization remains pinned to `CS-P13-L2`.

---

## 3) Scale Margin Governance Framework

### 3.1 Guardbands (Margin Preservation Bands)

Guardbands are stricter than WS13-C hard guardrails to protect certified margin.

| KPI | Certified Baseline | Green (Operate) | Amber (Constrain) | Red (Contain/Hold) |
|---|---:|---:|---:|---:|
| wPSR | 98.2% | >=97.8% | <97.8% and >=97.0% | <97.0% |
| UDS | 96.4% | >=95.8% and n>=20 | <95.8% and >=95.0% (or n<20) | <95.0% with n>=20 |
| UDS CI lower bound | 94.1% | >=93.5% | <93.5% and >=93.0% | <93.0% |
| CAA median | 8.7d | <=9.2d | >9.2d and <=10.0d | >10.0d |
| CAA P90 | 11.9d | <=12.6d | >12.6d and <=14.0d | >14.0d |
| CAA stale >14d | 0 | 0 | 1 item for <24h | >=1 item >=24h |
| CAA stale >21d | 0 | 0 | N/A | >0 (immediate red) |
| Weekly budget burn | 46% | <=55% | >55% and <=60% | >60% (HOLD), >80% (STOP) |
| Budget headroom | 6.4d | >6.0d | >5.0d and <=6.0d | <=5.0d |

### 3.2 SLO and Error-Budget Policy

**SLO set (controlled-scale lane):**
- SLO-1 Reliability: wPSR >=97.0% (hard), target >=97.8%.
- SLO-2 Urgent drill: UDS >=95.0% hard floor, target >=95.8% with n>=20.
- SLO-3 Corrective aging: median <=10d; stale >21d = 0 hard invariant.
- SLO-4 Budget discipline: weekly burn <=60% for GO, <=80% absolute hard limit.

**Error-budget decision rules (deterministic):**
1. `burn <=55%` and no red KPI -> GO-OPERATE.
2. `55% < burn <=60%` -> GO-WATCH + planned burn reduction actions mandatory.
3. `60% < burn <=80%` -> HOLD-SCALE-INCREASE (no new stress cadence; only mitigation traffic).
4. `burn >80%` -> STOP-ADVANCEMENT and initiate recovery protocol.
5. Any red KPI overrides budget state and forces at least HOLD.

### 3.3 Amber/Red Conditions and Escalation Mapping

| Condition Class | Trigger | Severity | Response SLA | Required Escalation |
|---|---|---|---|---|
| AMB-KPI | Any KPI enters amber band once | SEV3 | 4h | Platform + QA |
| AMB-REPEAT | Same amber condition on 2 consecutive windows | SEV2 | 1h | Platform + QA + Regulatory |
| RED-KPI | Any KPI enters red band | SEV1 | 15m | Platform + QA + Regulatory + Gate Authority |
| RED-INTEGRITY | Missing hash/signature/evidence completeness <100% at T+24h | SEV1 | 15m | Same as SEV1 + freeze decision channel |
| RED-TAIL | CAA stale >21d >0 | SEV1 | 15m | Immediate leadership escalation |
| RED-BUDGET | burn >80% | SEV1 | 15m | Gate Authority + release scope freeze |

**Escalation ownership map:**
- Platform owner: guardrail detection, containment execution.
- QA owner: validation of breach classification + rerun proof.
- Regulatory owner: evidence admissibility and decision record integrity.
- Gate Authority: GO/HOLD/STOP adjudication for SEV1 and unresolved SEV2.

---

## 4) Monitoring Cadence and Decision Protocol

### 4.1 Cadence
1. **Per-window check (every controlled-scale run window):** compute KPI set, band status, incident triggers.
2. **Daily governance review (UTC):** consolidate window results; compute day verdict.
3. **Twice-weekly trend board:** evaluate 3-window and 7-day trend for drift and margin erosion.
4. **Weekly certification continuity review:** finalize GO/HOLD/STOP posture against error budget + unresolved incidents.

### 4.2 Deterministic Decision Function

For each decision window `w`:
1. If any integrity control fails (hash/signature/citation completeness) -> `STATUS=HOLD-INTEGRITY`.
2. Else if any red condition true -> `STATUS=HOLD-RED`.
3. Else if any repeated amber or budget in 60-80% band -> `STATUS=HOLD-CONSTRAINED`.
4. Else if any amber true -> `STATUS=GO-WATCH`.
5. Else -> `STATUS=GO-STABLE`.

No manual override permitted unless tri-signoff (Platform + QA + Regulatory) + Gate Authority approval + rationale code logged.

### 4.3 Required Decision Record Fields
Each governance decision entry must include:
- `decisionId`, `windowId`, `timestampUtc`
- KPI values + computed deltas vs BL-01..BL-10
- band classification per KPI
- resulting decision state (`GO-STABLE`, `GO-WATCH`, `HOLD-CONSTRAINED`, `HOLD-RED`, `HOLD-INTEGRITY`, `STOP`)
- owner signatures (Platform/QA/Regulatory; Gate Authority if HOLD/STOP)
- evidence pointers (artifact path + digest/reference ID)

---

## 5) Breach Response and Rollback/Mitigation Playbooks

### 5.1 Breach Response Levels

- **Level A (Amber, first occurrence):** rapid correction, no freeze.
- **Level B (Amber repeat / degraded):** constrained operation, mitigation ticket required.
- **Level C (Red/Critical):** fail-closed hold, containment + rollback/mitigation mandatory.

### 5.2 Standard Red Breach Playbook (Fail-Closed)

1. Detect and classify breach (rule ID + KPI + threshold).
2. Open incident `INC-WS14C-<date>-<seq>` within SLA.
3. Freeze scale expansion/stress scheduling immediately.
4. Capture immutable evidence snapshot before changes:
   - KPI extract,
   - guardrail ledger,
   - run manifest,
   - integrity lock state,
   - config/schema digests.
5. Execute containment action.
6. Choose path:
   - **Rollback path:** revert to last known-good config/deploy baseline.
   - **Mitigation path:** patch forward if rollback not valid.
7. Run deterministic verification:
   - minimum two consecutive compliant reruns on impacted path,
   - one integrated controlled-scale window pass.
8. Close incident only when all closure criteria satisfied.

### 5.3 Rollback Path (Preferred if Safe)

**Trigger:** regression tied to recent config/deploy delta and rollback point exists.

Steps:
1. Identify rollback target (`last_green_release_id`).
2. Validate rollback package hash/signature integrity.
3. Execute rollback within change class policy.
4. Re-run impacted KPI slice and full guardrail check.
5. Record before/after KPI deltas and decision.

**Exit criteria:**
- Breached KPI returns to non-red band for 2 consecutive checks.
- No new integrity/citation failure.
- Incident owner tri-signoff obtained.

### 5.4 Mitigation Path (Patch-Forward)

**Trigger:** rollback unavailable/inappropriate; controlled fix required.

Steps:
1. Root-cause classification (`PRODUCT|INFRA|RUNBOOK|EVIDENCE_GAP`).
2. Implement targeted mitigation with change ticket linkage.
3. Execute constrained reruns (impacted path first, then integrated run).
4. Validate no regression in adjacent KPIs.
5. Promote to controlled operation only after deterministic closure checks pass.

### 5.5 Mandatory Evidence Capture for Any Breach

- Incident record YAML/JSON + timestamps.
- Pre-change and post-change KPI snapshots.
- Guardrail event timeline with severity transitions.
- Config/schema checksum comparison.
- Rerun receipts and signoffs.
- Final closure statement with rationale code.

If any mandatory evidence item missing at T+24h -> auto-escalate to `RED-INTEGRITY`.

---

## 6) Example Governance Logs and GO/HOLD Interpretation Guidance

### 6.1 Example Log A (GO-STABLE)

```yaml
decisionId: GOV-WS14C-20260223-01
windowId: W14C-20260223-AM
timestampUtc: 2026-02-23T12:05:00Z
kpis:
  wPSR: 98.1
  UDS: 96.0
  UDS_n: 26
  UDS_ci_lower: 94.0
  CAA_median_days: 8.8
  CAA_p90_days: 12.0
  stale_gt14: 0
  stale_gt21: 0
  budget_burn_weekly: 52
  budget_headroom_days: 6.1
status: GO-STABLE
reason: all KPIs within green guardbands
evidence:
  - simulation/athelon/phase-13-reentry-closure/ws13-c-scale-certification.md#section-7
  - E-S13-06-KPI
  - watch-day-D+1-metrics.json
signoff: Platform+QA+Regulatory
```

Interpretation: Continue controlled-scale operation without constraint changes.

### 6.2 Example Log B (GO-WATCH / Amber)

```yaml
decisionId: GOV-WS14C-20260224-02
windowId: W14C-20260224-PM
timestampUtc: 2026-02-24T22:10:00Z
kpis:
  wPSR: 97.6
  UDS: 95.5
  UDS_n: 24
  UDS_ci_lower: 93.3
  CAA_median_days: 9.3
  CAA_p90_days: 12.9
  stale_gt14: 0
  stale_gt21: 0
  budget_burn_weekly: 58
  budget_headroom_days: 5.8
status: GO-WATCH
severity: SEV3
actions:
  - optimize paging route check before next window
  - increase review cadence for UDS CI trend
```

Interpretation: Still operable, but margin erosion detected; corrective action and close monitoring required.

### 6.3 Example Log C (HOLD-RED)

```yaml
decisionId: GOV-WS14C-20260226-03
windowId: W14C-20260226-AM
timestampUtc: 2026-02-26T10:40:00Z
kpis:
  wPSR: 96.8
  UDS: 94.7
  UDS_n: 28
  UDS_ci_lower: 92.8
  CAA_median_days: 9.9
  CAA_p90_days: 14.3
  stale_gt14: 1
  stale_gt21: 0
  budget_burn_weekly: 63
  budget_headroom_days: 4.9
status: HOLD-RED
severity: SEV1
incidentId: INC-WS14C-20260226-01
actions:
  - freeze stress windows
  - execute routing rollback to last green release
  - run two verification windows before reconsidering GO
signoff: Platform+QA+Regulatory+GateAuthority
```

Interpretation: Deterministic hold; no progression until closure criteria are met and evidence is complete.

### 6.4 GO/HOLD/STOP Rules of Thumb (Deterministic)
- **GO-STABLE:** all green, integrity complete, budget <=55%.
- **GO-WATCH:** only amber conditions, no repeats, no integrity failures.
- **HOLD-CONSTRAINED:** repeated amber or budget 60-80%.
- **HOLD-RED:** any red KPI/integrity failure.
- **STOP:** budget >80% or unresolved SEV1 beyond SLA window.

---

## 7) Final Status Block (Readiness Judgment + Evidence Links)

**WS14-C Deliverable Status:** **COMPLETE (Scale Margin Governance Spec Ready)**  
**Readiness Judgment:** **READY FOR CONTROLLED-SCALE STABILIZATION OPERATIONS**  
**Judgment Type:** **GO-FOR-GOVERNED-OPERATION (CONDITIONAL ON FAIL-CLOSED ENFORCEMENT)**

### 7.1 Evidence Links Cited
- WS13-C certification baseline and guardrails:  
  `simulation/athelon/phase-13-reentry-closure/ws13-c-scale-certification.md`
- WS13-C operational closure evidence:  
  `simulation/athelon/phase-13-reentry-closure/ws13-c-ops-closure.md`
- WS14-A canonical/hash governance model:  
  `simulation/athelon/phase-14-stabilization/ws14-a-canonical-evidence-registry.md`
- WS14-B drift-watch control alignment:  
  `simulation/athelon/phase-14-stabilization/ws14-b-reliability-drift-watch.md`

### 7.2 Hard Conditions to Maintain Readiness
1. Enforce deterministic guardbands and decision function with no informal overrides.
2. Keep evidence completeness at 100% for every decision record.
3. Treat integrity/citation failures as release-blocking (fail-closed HOLD).
4. Maintain controlled-scale profile boundary `CS-P13-L2` unless recertified.

---

## 8) Blocker Declaration
No blocker prevented completion of WS14-C artifact.
