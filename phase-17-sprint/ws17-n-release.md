# WS17-N — v1.1 Release Readiness Package (Phase 17 Wave 3)

**Phase:** 17 — v1.1 Sprint Execution  
**Workstream:** WS17-N  
**Owners:** Cilla Oduya (QA lead), Nadia Solis (release coordination), Rosa Eaton (aviation validation), Marcus Webb (compliance authority)  
**Date:** 2026-02-22

---

## 1) Executive Release Posture

**Current Recommendation:** **CONDITIONAL GO** for release candidate staging and controlled rollout preparation.  
**Production GO** remains **blocked on explicit policy gates** and conditional-stream closure.

Blocking policy gates:
- `CAL-POLICY-MEMO-V1`
- `DISC-AUTH-LIABILITY-MEMO-V1`

Additional conditional dependencies:
- WS17-H pre-close integration severity/sign-off closure
- WS17-J RSM hard blockers HB-1..HB-4 closure

---

## 2) GO / NO-GO Rubric

| Gate | Criterion | Evidence Source | Decision Rule | Current |
|---|---|---|---|---|
| G1 | Core implementation streams complete | WS17-A..L artifacts | All critical streams implemented with objective checklists | PASS |
| G2 | Integration seams validated | WS17-M | No unresolved critical fail-open seam | CONDITIONAL PASS |
| G3 | QA regression and scenario receipts | WS17-B/C/G/H/K/L test receipts | No unresolved Cilla FAIL on release-critical path | PASS (with conditions) |
| G4 | Aviation operational correctness | Rosa validation sections | Rosa signs operational acceptability | CONDITIONAL ACCEPT |
| G5 | Compliance memos executed | Marcus memo signatures | Both memos signed before production activation of gated branches | **NO-GO until signed** |
| G6 | Pre-close close-control correctness | WS17-H | Feature-flagged dependencies resolved and promoted | CONDITIONAL |
| G7 | RSM acknowledgment enforcement hardening | WS17-J HB-1..HB-4 | Hard blockers resolved or formally risk-accepted | CONDITIONAL |

### Rubric Outcome
- **Staging / release-candidate packaging:** GO
- **Production deployment (full feature activation):** **NO-GO until G5 + G6 + G7 close**

---

## 3) Risk Register

| Risk ID | Description | Likelihood | Impact | Mitigation | Owner | Residual |
|---|---|---|---|---|---|---|
| R-01 | Expired-calibration override used in production without policy authorization | M | H | Keep branch gated by `CAL-POLICY-MEMO-V1`; fail-closed in prod | Marcus + Devraj | Low once memo signed |
| R-02 | Customer discrepancy approval surface enabled without final liability memo | M | H | Gate activation on `DISC-AUTH-LIABILITY-MEMO-V1`; keep internal state machine only | Marcus + Devraj | Low once memo signed |
| R-03 | Pre-close severity linkage mismatch causes inconsistent close behavior | M | H | Resolve WS17-H WS16-B seam + Marcus severity sign-off; rerun integrated seam tests | Devraj + Marcus + Cilla | Medium until closure |
| R-04 | RSM hard blockers weaken enforceability/audit posture | M | M/H | Execute HB-1..HB-4 remediation plan and verify with Cilla | Devraj + Chloe + Marcus | Medium until closure |
| R-05 | Cross-feature ordering regressions in RTS/auth flows | L | H | Preserve TC-G-05 ordering proof in regression gate and lock mutation order contract | Devraj + Cilla | Low |
| R-06 | Customer-facing status leakage from internal ops context | L | M | Preserve strict payload typing and TC-K-06 exclusion checks | Chloe + QA | Low |

---

## 4) Production Rollout Plan

1. **Release Candidate Freeze**
   - Freeze WS17 artifact set and hash reference points for WS17-M/WS17-N.
   - Confirm all CONDITIONAL items are tracked as explicit go-live gates.

2. **Staging Activation (all non-gated features)**
   - Enable standard flows: offline/auth/export/portal core/discrepancy internal state machine.
   - Keep memo-gated branches disabled in production config.

3. **Verification Suite Execution**
   - Re-run critical receipt set:
     - WS17-B RA-22/RA-23
    - WS17-G TC-G-05
     - WS17-H TC-H-07
     - WS17-K TC-K-03/06
     - WS17-L TC-L-06
   - Require Cilla sign-off after run.

4. **Gate Closure Review**
   - Marcus signs `CAL-POLICY-MEMO-V1` and `DISC-AUTH-LIABILITY-MEMO-V1`.
   - WS17-H and WS17-J conditional closures reviewed in a single gate packet.

5. **Phased Production Deployment**
   - Phase P1: deploy with gated branches disabled.
   - Phase P2: activate WS17-F gated branch after `CAL-POLICY-MEMO-V1` signature.
   - Phase P3: activate WS17-L customer-facing approval surface after `DISC-AUTH-LIABILITY-MEMO-V1` signature.

6. **Post-Deploy Monitoring (72h)**
   - Monitor auth failures, discrepancy authorization timeouts, and pre-close gate denials.
   - Escalate any fail-open indicator as Sev-1 rollback trigger.

---

## 5) Rollback Plan

**Rollback Triggers (any one):**
1. Evidence of fail-open behavior on auth/discrepancy/pre-close gates.
2. Ordering regression (qualification consumed after auth event, contrary to TC-G-05 contract).
3. Incorrect customer-visible status leakage or AOG leakage.
4. Audit trail write failure on release-critical mutations.

**Rollback Actions:**
1. Disable newly activated feature flags first (fast containment).
2. Revoke active customer portal tokens and discrepancy approval URLs if customer-surface integrity is impacted.
3. Revert to prior known-good release artifact.
4. Run focused seam verification subset before reattempting deployment.
5. File incident record with audit linkage to affected work orders.

---

## 6) Explicit Marcus Memo Gate (Hard Compliance Block)

Production activation of governed surfaces is prohibited until both references are signed:

- **`CAL-POLICY-MEMO-V1`** — required to enable expired-calibration override production branch in WS17-F.
- **`DISC-AUTH-LIABILITY-MEMO-V1`** — required to enable customer-facing discrepancy authorization surface in WS17-L.

**Gate Rule:** If either memo is unsigned, release remains **NO-GO for full production activation**.

---

## 7) Cilla QA Sign-Off (Release)

**Reviewer:** Cilla Oduya  
**Assessment:** Release candidate is technically coherent with strong fail-closed controls and receipt-backed ordering proof. Conditional items are explicit and trackable.  
**Decision:** **SIGN-OFF: CONDITIONAL** (memo gates + WS17-H/WS17-J closure required before full production GO).

---

## 8) Rosa Aviation Validation (Release)

**Reviewer:** Rosa Eaton  
**Assessment:** Operationally acceptable for controlled rollout, assuming hard memo gates remain enforced and no fail-open exception paths are introduced.  
**Decision:** **AVIATION VALIDATION: CONDITIONAL ACCEPT** pending final compliance gate execution.

---

**status: CONDITIONAL**
