# WS14 Execution Evidence — Weekly Health Reads (Qualifying Pair)

**Artifact:** WS14-E Execution Plane Evidence 03/05  
**Decision Scope:** REQ-08 closure (two consecutive qualifying weekly reads)

Qualification rule: both weeks must pass reliability + scale + integrity thresholds with no unresolved critical exception.

---

## 1) Weekly Read #1

- **Read ID:** `WHR-WS14-2026-W09`
- **Window:** 2026-02-23..2026-03-01
- **Issued:** 2026-03-01T23:40:00Z

### Metrics and threshold outcomes

| Lane | Metric | Threshold | Observed | Pass/Fail |
|---|---|---|---:|---|
| Reliability | Effective reliability (rolling-7) | >=97.8% target, >=97.0% hard | 97.93% | PASS |
| Reliability | Glove pass rate | >=95.0% | 95.93% | PASS |
| Reliability | Worst role reliability | >=99.0% watch target, >=97.0% hard | 99.14% | PASS |
| Scale | wPSR | >=97.8% green | 98.0% | PASS |
| Scale | UDS (n>=20) | >=95.8% green | 96.1% (n=27) | PASS |
| Scale | CAA median | <=9.2d green | 8.9d | PASS |
| Scale | CAA P90 | <=12.6d green | 12.3d | PASS |
| Scale | Weekly budget burn | <=55% green, <=60% GO-WATCH | 54% | PASS |
| Integrity | Hash mismatch count | 0 | 0 | PASS |
| Integrity | Freeze/signer triad completeness | 100% | 100% | PASS |
| Integrity | Counter regression (`missingRequired/mismatch/orphan`) | all 0 | 0/0/0 | PASS |

Week verdict: **QUALIFIED-PASS**

Signatures:
- Platform: `sig:w09-plt-0b6761dd6dfc9d66`
- QA: `sig:w09-qa-c16e89d3b6d47943`
- Regulatory: `sig:w09-reg-4cd07b47934c54d1`

---

## 2) Weekly Read #2

- **Read ID:** `WHR-WS14-2026-W10`
- **Window:** 2026-03-02..2026-03-08
- **Issued:** 2026-03-08T23:45:00Z

### Metrics and threshold outcomes

| Lane | Metric | Threshold | Observed | Pass/Fail |
|---|---|---|---:|---|
| Reliability | Effective reliability (rolling-7) | >=97.8% target, >=97.0% hard | 98.05% | PASS |
| Reliability | Glove pass rate | >=95.0% | 96.08% | PASS |
| Reliability | Worst role reliability | >=99.0% watch target, >=97.0% hard | 99.22% | PASS |
| Scale | wPSR | >=97.8% green | 98.1% | PASS |
| Scale | UDS (n>=20) | >=95.8% green | 96.3% (n=29) | PASS |
| Scale | CAA median | <=9.2d green | 8.8d | PASS |
| Scale | CAA P90 | <=12.6d green | 12.1d | PASS |
| Scale | Weekly budget burn | <=55% green, <=60% GO-WATCH | 53% | PASS |
| Integrity | Hash mismatch count | 0 | 0 | PASS |
| Integrity | Freeze/signer triad completeness | 100% | 100% | PASS |
| Integrity | Counter regression (`missingRequired/mismatch/orphan`) | all 0 | 0/0/0 | PASS |

Week verdict: **QUALIFIED-PASS**

Signatures:
- Platform: `sig:w10-plt-2703621942ce1c9a`
- QA: `sig:w10-qa-fca72888690e84f0`
- Regulatory: `sig:w10-reg-f0677a6f2c3f0286`

---

## 3) Consecutive qualification assertion

| Requirement | Status |
|---|---|
| Two consecutive weekly reads present | YES (W09, W10) |
| Both reads meet reliability thresholds | YES |
| Both reads meet scale thresholds | YES |
| Both reads meet integrity thresholds | YES |
| Any unresolved critical exception | NO |

REQ-08 closure verdict: **CLOSED (PASS)**.
