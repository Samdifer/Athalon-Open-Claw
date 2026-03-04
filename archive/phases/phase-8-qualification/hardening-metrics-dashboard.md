# Phase 8 Qualification — Hardening Metrics Dashboard

**Audience:** CEO + Exec Staff  
**Cadence:** Weekly  
**Purpose:** Fast go/no-go signal on Phase 8 hardening readiness.

## 1) KPI Definitions (Decision-Critical)

1. **Parity Success Rate (PSR)**  
   Share of production-critical scenarios that pass in qualification environment with no severity-1/2 variance from baseline.  
   **Formula:** `passed parity scenarios / total critical parity scenarios`.

2. **Evidence Completeness (EC)**  
   Percent of required audit artifacts delivered and accepted for each control/test run (logs, signatures, approvals, trace links).  
   **Formula:** `accepted required artifacts / total required artifacts`.

3. **Integrity Gate Health (IGH)**  
   Pass rate of integrity gates (build provenance, checksum/signature validation, tamper checks, policy enforcement).  
   **Formula:** `passed integrity gate executions / total integrity gate executions`.

4. **Urgent Drill SLA (UDS)**  
   Percent of urgent hardening drills resolved within SLA window (containment + verified remediation).  
   **Formula:** `urgent drills resolved within SLA / total urgent drills`.

5. **Corrective-Action Aging (CAA)**  
   Median age (days) of open corrective actions tied to hardening findings. Lower is better.  
   **Formula:** `median(open corrective action age in days)`.

---

## 2) Weekly Performance (Mock — Last 4 Weeks)

| KPI | Wk-1 | Wk-2 | Wk-3 | Wk-4 (Current) | Trend | Current Status |
|---|---:|---:|---:|---:|---|---|
| Parity Success Rate | 91.8% | 93.6% | 95.1% | **96.4%** | ↑ improving | **Amber** |
| Evidence Completeness | 88.9% | 92.4% | 95.8% | **97.2%** | ↑ improving | **Green** |
| Integrity Gate Health | 96.1% | 97.0% | 98.2% | **98.9%** | ↑ improving | **Green** |
| Urgent Drill SLA | 84.0% | 87.5% | 91.3% | **93.8%** | ↑ improving | **Amber** |
| Corrective-Action Aging (days) | 17.2 | 15.4 | 12.6 | **10.8** | ↓ improving | **Amber** |

**Executive readout (this week):** Overall trajectory is positive with no red KPI, but three amber metrics indicate residual execution risk before full Phase 8 sign-off.

---

## 3) Thresholds & Alert Logic

| KPI | Green | Amber | Red |
|---|---|---|---|
| Parity Success Rate | `>= 97.0%` | `94.0%–96.9%` | `< 94.0%` |
| Evidence Completeness | `>= 97.0%` | `93.0%–96.9%` | `< 93.0%` |
| Integrity Gate Health | `>= 98.5%` | `96.0%–98.4%` | `< 96.0%` |
| Urgent Drill SLA | `>= 95.0%` | `90.0%–94.9%` | `< 90.0%` |
| Corrective-Action Aging | `<= 10 days` | `>10 to 14 days` | `>14 days` |

**Portfolio alert rule:**  
- **Green portfolio:** no red, max one amber  
- **Amber portfolio:** two or more amber and no red  
- **Red portfolio:** any red KPI

**Current portfolio state:** **Amber** (3 amber, 0 red).

---

## 4) Recommended Exec Actions by Alert State

### If **Green**
- Authorize planned Phase 8 progression milestones.
- Keep weekly cadence; no additional governance overhead.
- Maintain spot-check audits (10% sample) to guard regression.

### If **Amber** (current)
- Require **48-hour corrective plans** for each amber KPI owner.
- Shift 10–15% sprint capacity to amber-remediation backlog.
- Add mid-week checkpoint with COO/CTO until amber count <=1.
- Freeze non-critical change requests that increase parity or evidence load.

### If **Red**
- Trigger hardening stabilization mode (temporary progression hold).
- Daily executive standup until red KPI exits red for 2 consecutive reads.
- Reallocate senior engineering + incident response capacity immediately.
- Escalate vendor/dependency blockers within 24 hours.

---

## 5) KPI Owner Focus (This Week)

- **PSR (Amber, 96.4%)**: Close top 3 recurring scenario mismatches; target +0.8pp next week.  
- **UDS (Amber, 93.8%)**: Tighten on-call handoff and pre-approved containment playbooks; target +1.2pp.  
- **CAA (Amber, 10.8d)**: Enforce age cap burn-down on >14-day tickets; target median <=10d.

---

## 6) Blind Spots & Instrumentation Gaps

1. **Parity weighting gap**  
   Current PSR is mostly unweighted; critical-path failures can be masked by high-volume low-impact passes.  
   **Fix:** introduce risk-weighted PSR (tier-1 scenarios weighted 3x).

2. **Evidence quality vs quantity gap**  
   EC measures completeness, not artifact quality or retraceability depth.  
   **Fix:** add evidence quality score (sampling rubric with rejection reasons).

3. **Gate failure latency gap**  
   IGH shows pass rate but not mean time to detect/triage gate regressions.  
   **Fix:** add MTTD/MTTR for integrity gate incidents.

4. **SLA denominator volatility**  
   UDS can appear strong with low drill volume, hiding process fragility.  
   **Fix:** publish drill count + confidence band; enforce minimum drill volume.

5. **Aging distribution blind spot**  
   Median CAA can hide long-tail stale actions.  
   **Fix:** add P90 aging and count of actions >14 and >21 days.

---

## 7) CEO Decision Summary

- **Not blocked**, but **not yet clean green** for frictionless Phase 8 qualification exit.
- Primary near-term risk is **execution consistency** (parity edge cases, urgent response speed, closure discipline).
- With focused amber remediation, realistic target is **portfolio green within 1–2 weeks**.

---

## 8) Phase 11 Closure Update — WS11-E Green-State Operations Program

**Update owner:** Jonas Harker (Platform)  
**Inline reviewers:** [NADIA] Nadia Solis (Product), [MARCUS] Marcus Webb (Regulatory)  
**Date:** 2026-02-22  
**Scope:** Closure evidence for Phase 10 carry-forward condition **C-11-05**.

### 8.1 Updated instrumentation (weighted PSR + UDS/CAA confidence)

We deployed the Phase 11 instrumentation upgrades as specified, with machine-readable outputs published in the weekly telemetry package and release evidence index.

1. **Weighted Parity Success Rate (wPSR)**
   - Replaced unweighted headline PSR with risk-tier weighting.
   - Weight model in production readout:
     - Tier-1 critical flows: **3.0x**
     - Tier-2 material flows: **1.5x**
     - Tier-3 standard flows: **1.0x**
   - Formula: `wPSR = Σ(pass_i * weight_i) / Σ(weight_i)`
   - [NADIA] This prevents “volume masking,” where many low-impact passes hide a few high-impact failures.
   - [MARCUS] Weight table and tier definitions are now versioned and sealed per read; no silent reclassification between weeks.

2. **UDS confidence instrumentation**
   - UDS now publishes the confidence band and denominator together with headline rate.
   - Format: `UDS rate (n=<drill_count>, 95% CI [lower, upper])`.
   - Minimum denominator gate enforced: `n >= 20` drills per controlled-scale read; below minimum is auto-amber regardless of point estimate.
   - [NADIA] Product interpretation is now stability-aware, not just point-score aware.
   - [MARCUS] Confidence method and sample size are recorded to preserve comparability under audit replay.

3. **CAA tail-risk instrumentation**
   - CAA now includes median, P90, and open-action long-tail counts (`>14d`, `>21d`).
   - Median alone is no longer sufficient for green determination.
   - [NADIA] This surfaces backlog “tail drag” that previously hid behind acceptable medians.
   - [MARCUS] Tail metrics are required for defensible claims of closure discipline.

### 8.2 Controlled-scale reads (two consecutive) and portfolio state

Both reads were executed under controlled-scale load profile with full integrity lock in force and no policy bypass.

| Read | Date (UTC) | wPSR | EC | IGH | UDS (n, 95% CI) | CAA Median / P90 | Tail Counts (>14d / >21d) | Amber Count | Red Count | Portfolio |
|---|---|---:|---:|---:|---|---|---|---:|---:|---|
| R1 | 2026-02-15 | 97.3% | 97.6% | 99.0% | 95.2% (n=26, [92.0, 97.8]) | 9.8d / 13.4d | 1 / 0 | 1 | 0 | Green-qualified (<=1 amber) |
| R2 | 2026-02-22 | 97.8% | 98.1% | 99.1% | 95.8% (n=29, [93.0, 98.1]) | 9.2d / 12.6d | 0 / 0 | 0 | 0 | Green |

Operational read: second consecutive compliant read is complete, with no red KPI observed in either window.

### 8.3 Amber-to-green transition criteria and current standing

**Phase 10 exit criteria for C-11-05:**
- Portfolio = Green **or** <=1 Amber for 2 consecutive weekly controlled-scale reads.
- Weighted PSR + UDS confidence + CAA tail controls enabled and published.
- No red KPI during observation window.

**Current standing:** **Criteria met.**
- Two consecutive compliant reads achieved (R1 and R2).
- Instrumentation upgrades active and evidenced.
- Zero red KPI across the observation window.

[NADIA] From product risk posture: we moved from “improving but fragile” to “predictable under controlled scale,” which is the required readiness signal for progression.

[MARCUS] Compliance caveat: this closure is valid for controlled-scale profile only; broader-scale claims must continue to cite profile boundaries until next scale-step evidence is sealed.

### 8.4 Operational guardrails if portfolio returns/stays amber

Even with current green standing, amber guardrails remain pre-armed and auto-activated on breach:

1. **48-hour owner plans** for each amber KPI with dated closure target.
2. **Capacity shift (10–15%)** to hardening backlog until amber count <=1.
3. **Mid-week COO/CTO checkpoint** while amber persists.
4. **Change-load freeze** on non-critical work that increases parity/evidence burden.
5. **UDS denominator floor enforcement** (`n < 20` => amber lock regardless of point estimate).
6. **CAA tail breaker:** any `>21d` corrective action re-opens weekly executive escalation.

[MARCUS] These are operating controls, not optional recommendations; any manual bypass must be recorded as explicit risk acceptance.

### 8.5 WS11-E completion verdict

## **WS11-E Verdict: PASS**

C-11-05 is closed based on instrumented evidence and two consecutive controlled-scale compliant reads. Recommend marking WS11-E complete and carrying forward only routine monitoring controls into next gate package.