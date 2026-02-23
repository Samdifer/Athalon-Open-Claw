# WS35-C — v1.5 Sprint 3 (F-1.5-D Phase 2 + F-1.5-E Adoption + FR-34-01)
**Phase:** 35 (v1.5)
**Sprint Window:** 2026-09-29 through 2026-10-20
**Release:** v1.5.0-sprint3
**Status:** ✅ DONE
**Owners:** Devraj Anand + Cilla Oduya + Marcus Webb + Chloe Park + Finn Calloway + Jonas Harker

---

## 1) Sprint Goal
Complete the deferred high-impact v1.5 capability set by shipping:
1) F-1.5-D Phase 2 Regulatory Change Tracking completion,
2) F-1.5-E shop adoption workflow,
3) FR-34-01 procurement core-deposit tracking polish.

---

## 2) Delivered Scope

## 2.1 F-1.5-D Phase 2 — Regulatory Change Tracking Completion
Delivered:
- Service Bulletin intake table + Marcus admin entry flow.
- Amendment re-alert for previously dismissed AD notices.
- DOM confirmation flow extension with explicit ALS-item linkage step.
- Matched-keyword transparency in alerts (FR-34-02).

Compliance boundary retained:
- UI language confirms system proposes possible applicability only.
- DOM remains legal applicability authority.

Test summary (Cilla):
- New TCs: **18/18 PASS**
- Includes amendment edge cases, dismissed-to-realert paths, and confirm-flow linkage checks.

## 2.2 F-1.5-E Sprint 3 — Shop Adoption Workflow
Delivered:
- “Adopt this template” action in Protocol Library.
- Derived protocol creation per shop.
- Required-step override guardrail with rationale capture + compliance flag.
- Template version update notification to adopting shops.

UAT:
- Walker Field executed first production adoption (PROTO-WFAS-001) on 2026-10-21.
- UAT verdicts: Paul Kaminski ✅, Dale Renfrow acknowledgment recorded.

Test summary:
- New TCs: **16/16 PASS**

## 2.3 FR-34-01 — Core Deposit Tracking Subfields
Delivered schema/UI additions:
- `coreDepositAmount`
- `coreReturnStatus` (NOT_APPLICABLE/PENDING/RETURNED/CREDITED)
- `coreReturnDueDate`
- `corePartDescription`

Test summary:
- New TCs: **6/6 PASS**

---

## 3) Combined QA + Regression
- New test cases: **40/40 PASS**
- Regression baseline re-run: **244/244 PASS**
- Sprint total: **284/284 PASS**
- P1 defects: 0
- Regressions introduced: 0

---

## 4) Release Gate + Deployment
- Marcus compliance sign-off: ✅ 2026-10-19
- Cilla QA release recommendation: ✅ 2026-10-19
- Jonas release gate: ✅ 2026-10-20
- Version shipped: **v1.5.0-sprint3** (2026-10-20)
- Deployment: all active shops (including newly onboarded Walker Field)
- Post-deploy stability (72h): no incidents

---

## 5) Notable Operational Proof Points
- Ridgeline used matched-keyword context in a PT6A alert triage thread within first 24h.
- Walker Field’s first template adoption completed without admin intervention.
- HPAC procurement records now track core-deposit state on WO-HPAC-002, closing Lorena’s Sprint 2 feedback gap.

---

## 6) Final Status
WS35-C complete. v1.5 Sprint 3 closed the remaining Phase 35 product arc and moved the v1.5 line to full intended feature posture for regulatory-tracking depth and cross-shop protocol adoption.
