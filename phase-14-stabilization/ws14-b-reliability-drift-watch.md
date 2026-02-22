# WS14-B Post-Gate Reliability Drift Watch
**Workstream:** WS14-B Post-Gate Reliability Drift Watch  
**Phase:** 14 Re-entry Stabilization  
**Date (UTC):** 2026-02-22  
**Owner:** WS14-B  
**Status:** READY TO OPERATE

---

## 1) Purpose and scope
This plan operationalizes Phase 13 gate condition #4 (daily post-gate watch) using WS13-A as immutable baseline, with explicit drift thresholds, alerting, triage, and role dashboards.

Watch scope:
- Role-critical flows: **DOM, IA, QCM, Lead A&P**
- Cross-cutting high-risk surfaces: **glove-mode**, **QCM keyboard-open**, **IA timeout boundary**
- Evidence governance requirement: **100% receipt + hash traceability for watch outputs**

---

## 2) WS13-A baseline metrics (authoritative)
Source: `simulation/athelon/phase-13-reentry-closure/ws13-a-reliability-closure.md`

### 2.1 Global baseline
- Planned/executed: **45/45 (100%)**
- PASS: **43**
- FAIL: **1** (fixed + verified)
- FLAKE: **1** (classified + rerun PASS)
- Effective reliability: **44/45 = 97.8%**
- Open blocker defects: **0**
- Open flakes: **0**

### 2.2 Role baseline
- **DOM:** 12 runs, 12 PASS, **100%**
- **IA:** 11 runs, 10 PASS, 1 FLAKE, **100% product reliability**
- **QCM:** 11 runs, 10 PASS, 1 FAIL (fixed), **100% post-fix subset**
- **Lead A&P:** 11 runs, 11 PASS, **100%**

### 2.3 Glove/high-risk baseline
- Glove-mode raw: **23/24 = 95.8%**
- Glove-mode post-fix subset: **100%**
- Regression anchor to guard: `RCP-WS13A-D1-QCM-007` (BUG-WS13A-QCM-014)
- Verification anchors: `RCP-WS13A-D2-QCM-001`, `RCP-WS13A-D3-QCM-006`, `RCP-WS13A-D3-INT-015`

### 2.4 Baseline evidence pointers
- Manifest: `artifact://athelon/ws13-a/index/manifest-v1.json#sha256=2e936a6f8c6bffcb7f91fe1b3cc7e950f80dd3f8b6cc56a4b3df95d2b2da7d64`
- Receipt register: `artifact://athelon/ws13-a/index/receipt-register.csv#sha256=4b7e7e0cbddc9906e8de36452657a8fd95d6f03d3f79670f3c7ec8d34fce02f3`
- Role bundles: DOM/IA/QCM/LAP bundles from WS13-A section 10.3

---

## 3) Drift watch plan (7-day and 14-day)

## 3.1 Day 1–7: Daily stabilization watch (mandatory)
Cadence: once per UTC day (D+1..D+7), with same-day sign-off.

Daily required checks:
1. Execute/collect role-critical replay subset (DOM/IA/QCM/A&P).
2. Execute glove critical subset including QCM keyboard-open.
3. Re-run IA timeout-boundary scenario.
4. Compute drift metrics vs WS13-A baseline.
5. Publish day log + receipts + hashes + verdict.

Daily output artifacts:
- `watch/daily/YYYY-MM-DD-metrics.json`
- `watch/daily/YYYY-MM-DD-verdict.md`
- `watch/daily/YYYY-MM-DD-signoff.yaml` (Platform + QA + Regulatory)

## 3.2 Day 8–14: Sustained confidence watch (extended)
Cadence: every 48h plus one weekly deep replay.

Day 8–14 requirements:
- D+8, D+10, D+12, D+14: metric recompute + role dashboards update.
- One deep replay block (>= 12 runs) across all roles and glove surfaces.
- Verify no regression on known anchors (QCM keyboard-open, IA timeout boundary).
- Produce Week-2 trend summary with confidence band and unresolved risk count.

Week-2 output artifacts:
- `watch/week2/rolling-trend.md`
- `watch/week2/deep-replay-matrix.json`
- `watch/week2/readiness-recheck.md`

---

## 4) Drift thresholds and alerting rules

## 4.1 Metric thresholds
| Metric | Baseline | Warn (SEV3) | Action (SEV2) | Critical (SEV1) |
|---|---:|---:|---:|---:|
| Effective reliability (rolling) | 97.8% | <97.8% and >=97.0% | <97.0% and >=95.0% | <95.0% |
| Glove pass rate | 95.8% | <95.8% and >=95.0% | <95.0% and >=92.0% | <92.0% |
| Role reliability (any role) | 100% | <99.0% | <97.0% | <95.0% |
| Post-fix QCM path | 100% | 1 isolated fail (resolved same day) | fail repeats on next check | fail unresolved >24h |
| IA timeout boundary stability | stable | p95 latency +10% vs D1–D3 ref | p95 +20% or 1 user-impact event | p95 +35% or repeated impact |
| Open blocking bugs | 0 | 1 open <24h | 1 open >=24h | >=2 open |
| Evidence completeness | 100% | <100% same day | <100% after 24h | missing at checkpoint/gate |

## 4.2 Alerting and response SLA
- **SEV3 (Watch):** notify channel in 4h, add mitigation note in daily log.
- **SEV2 (Action):** notify within 1h, open incident, assign owners + ETA.
- **SEV1 (Critical):** notify within 15m, freeze impacted path/release surface, escalate to Gate Authority.

Deterministic daily verdict:
1. Any SEV1 => `FAIL-CRITICAL`
2. Else any SEV2 => `FAIL-DEGRADED`
3. Else any SEV3 => `PASS-WATCH`
4. Else => `PASS-STABLE`

---

## 5) Root-cause triage protocol for regressions

## 5.1 Trigger
Open triage when any threshold enters SEV2/SEV1 or a previously fixed path fails.

## 5.2 Triage flow (must follow order)
1. **Contain:** isolate impacted flow/surface and prevent expansion.
2. **Classify:** Product defect / Infra transient / Test-env artifact / Evidence gap.
3. **Reproduce:** deterministic rerun under same conditions (device, input, layout, auth state).
4. **Correlate:** compare with WS13-A anchor receipts + current telemetry.
5. **Mitigate:** apply fix or infra correction.
6. **Verify:** minimum two passing reruns + one integrated path rerun.
7. **Close:** only when metrics return above threshold for two consecutive checks.

## 5.3 Required incident record
```yaml
incidentId: INC-WS14B-<date>-<seq>
severity: SEV3|SEV2|SEV1
triggerMetric: <metric>
impactedRole: DOM|IA|QCM|A&P|Integrated
classification: PRODUCT|INFRA|TEST_ENV|EVIDENCE
baseline: <value>
observed: <value>
containment: <action>
fixOrMitigation: <action>
verificationRuns: [<receipt-id>, <receipt-id>, <receipt-id>]
status: OPEN|MONITORING|CLOSED
owners:
  platform: <name>
  qa: <name>
  regulatory: <name>
```

---

## 6) Role-specific watch dashboards

## 6.1 DOM dashboard
Track:
- DOM pass rate (daily, rolling-7, rolling-14)
- Route persistence and transition integrity failures
- Interruption recovery success (tab suspend/resume)

Targets:
- Daily >=99%, rolling-7 >=99.5%, rolling-14 >=99.0%

## 6.2 IA dashboard
Track:
- IA pass rate
- Re-auth recovery success
- Timeout-boundary p95 latency drift
- Auth cancel/invalid cert handling pass

Targets:
- Product pass >=99%
- Timeout-boundary p95 drift <= +10% from WS13-A ref

## 6.3 QCM dashboard
Track:
- QCM pass rate
- Keyboard-open submit visibility/actuation pass
- Debounce/single-flight submit integrity
- Required-note enforcement success

Targets:
- Overall >=99%
- Keyboard-open path = 100% (no unresolved recurrence)

## 6.4 Lead A&P dashboard
Track:
- Sign/counter-sign chain completion rate
- Duplicate sign recovery success
- Role handoff integrity
- Chain audit trace integrity

Targets:
- >=99.5% daily, 100% on chain integrity checks

## 6.5 Cross-role executive strip
- Effective reliability
- Glove pass rate
- Open incidents by severity
- Evidence completeness
- Current gate posture tag: STABLE / WATCH / DEGRADED / HOLD

---

## 7) Operational governance and sign-off
Required daily sign-off (D+1..D+7):
- Platform (execution + metrics)
- QA (reproducibility + defect state)
- Regulatory (auditability + citations)

Required sign-off for Week-2 close (D+14):
- Platform lead
- QA lead
- Regulatory lead
- Gate Authority acknowledgement (if any SEV2/SEV1 occurred)

---

## 8) Current readiness verdict
**Verdict:** **READY (GO-WATCH)**  
**Basis:** WS13-A baseline is strong and complete (97.8% effective, fixed failure verified, no open blockers/flakes), and this WS14-B plan provides measurable thresholds, deterministic alerting, role dashboards, and triage closure criteria.

**Readiness conditions (must hold):**
1. Daily D+1..D+7 outputs produced with 100% evidence completeness.
2. Any SEV2/SEV1 regression follows fail-closed escalation.
3. Week-2 (D+8..D+14) trend review completed and archived.

If conditions are met, WS14-B supports transition from "GO WITH CONDITIONS" toward sustained clean-go confidence.
