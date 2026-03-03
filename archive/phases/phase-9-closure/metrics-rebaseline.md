# Phase 9 Metrics Re-Baseline (Post-Phase 8)
**Date:** 2026-02-22  
**Purpose:** Decision-grade telemetry reset for Qualification Closure & Controlled Scale Activation.

## 1) Updated KPI Baselines

| KPI | Current (P8 close) | Phase 9 Target | Tolerance Band (operating) | Trigger if Outside Tolerance |
|---|---:|---:|---|---|
| Parity Success Rate (risk-weighted) | 96.4% (unweighted baseline) | >=97.5% | 96.8%–97.4% | <96.8% in any read = portfolio hold |
| Evidence Completeness | 97.2% | >=99.0% | 98.0%–98.9% | <98.0% blocks scale activation |
| Integrity Gate Health | 98.9% | >=99.2% | 98.5%–99.1% | <98.5% triggers exec escalation |
| Urgent Drill SLA (<=11 min) | 93.8% | >=96.0% | 94.5%–95.9% | <94.5% for 2 reads = remediation mode |
| Corrective-Action Aging (median days) | 10.8d | <=8.0d | 8.1d–10.0d | >10.0d = no state promotion |
| **New:** CAA P90 (days) | not instrumented | <=14d | 14.1d–18d | >18d = stale-action escalation |
| **New:** Evidence Replay Pass Rate | blocked (0 qualified runs) | 100% on sealed packs | 95%–99% | <100% blocks Amber->Green |

---

## 2) Blind-Spot Closure Plan (Instrumentation Additions)

1. **Risk-weighted parity telemetry**  
   - Add scenario tier weighting (Tier-1=3x, Tier-2=2x, Tier-3=1x).  
   - Publish both weighted and raw PSR; weighted PSR becomes gating metric.

2. **Evidence quality depth metric**  
   - Add sampled Evidence Quality Score (EQS): trace completeness, signature validity, replay sufficiency.  
   - Log rejection reasons by class (missing link, invalid signature, non-deterministic artifact).

3. **Integrity incident latency**  
   - Add gate incident MTTD/MTTR and time-to-containment for integrity regressions.  
   - Split by pre-release vs post-release detection point.

4. **Urgent drill confidence controls**  
   - Add denominator guardrail: minimum 4 urgent drills/14 days for SLA confidence.  
   - Publish SLA confidence band with drill count.

5. **Corrective-action long-tail visibility**  
   - Add aging histogram + P90 + counts >14d and >21d.  
   - Auto-tag owners for >14d corrective actions.

6. **EvidencePack hard-stop observability**  
   - Add explicit AT-11..AT-14 fail-path receipts dashboard panel.  
   - Add replay pass/fail event stream keyed to sealed bundle ID.

---

## 3) Two-Week Checkpoint Cadence & Owner Map

**Cadence:** 14-day loop with weekly exec readout + mid-week operating checkpoint.

- **Mon (Week 1):** Baseline read + risk review  
  - Owner: **Nadia Solis** (portfolio telemetry)
- **Wed (Week 1):** Amber KPI corrective checkpoint  
  - Owners: **Chloe Park** (PSR/UX), **Devraj Anand** (integrity/CI), **Cilla Oduya** (evidence execution)
- **Fri (Week 1):** Evidence/replay quality audit sample  
  - Owner: **Marcus Webb** (compliance replay)
- **Tue (Week 2):** Release-control + drill confidence review  
  - Owner: **Jonas Harker** (cadence controls), support **Cilla**
- **Thu (Week 2):** Gate-read pre-brief and state recommendation  
  - Owner: **Nadia Solis**, all stream owners sign-off

---

## 4) Portfolio State Logic (Amber -> Green)

Portfolio can move **Amber -> Green** only when all are true:

1. **No Red KPIs** and **max one Amber KPI** for **2 consecutive weekly reads**.  
2. **EvidencePack qualification closed:** AT-01..AT-18 = 18/18 PASS with sealed replay proof.  
3. **Replay Pass Rate = 100%** across all sampled sealed bundles in cycle.  
4. **Urgent Drill SLA >=95%** with minimum denominator met (>=4 drills/14 days).  
5. **CAA median <=10d and P90 <=18d**, with downward trend.

If any condition regresses, portfolio reverts to Amber immediately.

---

## 5) CEO Decision Thresholds for Controlled Scale Activation

**Scale Activation = ALLOW** only if:
- EvidencePack hard gate closed (18/18 + replay proven),
- Portfolio Green criteria met for 2 consecutive reads,
- Integrity Gate Health >=99.0% and no unresolved Sev-1 integrity incident,
- Urgent Drill SLA >=95% with confidence denominator satisfied.

**Scale Activation = HOLD (default now)** if any of the following:
- Evidence completeness <98.0%,
- Replay pass <100%,
- Any Red KPI,
- CAA median >10d or P90 >18d,
- Urgent drill denominator below confidence floor.

**Scale Activation = ROLLBACK TO STABILIZATION** if:
- Integrity Gate Health <98.5%,
- Any post-release parity mismatch incident,
- Two consecutive weeks with >=2 Amber KPIs.

---

## Bottom Line
Current posture remains **controlled closure (not broad scale)**. Telemetry is improving, but state promotion requires hard evidence/replay closure plus two consecutive Green-grade reads under the re-baselined metrics above.
