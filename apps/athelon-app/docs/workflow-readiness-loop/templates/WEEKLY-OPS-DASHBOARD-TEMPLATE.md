# Weekly Training Ops Dashboard Template

Date Created: 2026-03-02  
Template Version: v1  
Applies To: Modular Training + Feature Testing Program

## 1) Weekly Header

Week of: `YYYY-MM-DD`  
Program Owner: `<name>`  
Environment: `<local | dev | staging>`  
Primary Scope This Week: `<module packs in scope>`

## 2) Goal Check (Program-Level)

1. Train users on real workflows with minimal assist.
2. Detect workflow breaks, logic inconsistencies, and missing features early.
3. Close feedback loops from finding -> ticket -> fix -> regression test.

Weekly status: `Green | Yellow | Red`  
Reason (1-3 lines): `<why this status>`

## 3) KPI Scorecard (Weekly)

| KPI | Target | Actual | Trend vs Last Week | Status |
|---|---:|---:|---:|---|
| Session task completion rate | >= 90% |  |  |  |
| Median time-on-task delta vs baseline | <= +15% |  |  |  |
| Trainer assists per run | <= 2 |  |  |  |
| S0 findings opened | 0 |  |  |  |
| S1 findings opened | <= 2 per module |  |  |  |
| S0/S1 closure SLA met | 100% |  |  |  |
| Findings converted to tickets | 100% |  |  |  |
| Repeatable findings converted to E2E | >= 80% |  |  |  |

## 4) Module Pack Status Board

| Module Pack | Runs Planned | Runs Completed | Gate (R/Y/G) | Top Risk | Owner | Next Action |
|---|---:|---:|---|---|---|---|
| Work Order Creation (`WO-CREATE-v1`) |  |  |  |  |  |  |
| Work Orders Detail/Task-Step |  |  |  |  |  |  |
| Billing Time + Approval + Invoice Handoff |  |  |  |  |  |  |

## 5) Role Coverage Check

| Role | Required This Week | Completed | Coverage Gaps |
|---|---:|---:|---|
| technician |  |  |  |
| lead_technician |  |  |  |
| shop_manager |  |  |  |
| billing_manager |  |  |  |
| qcm_inspector |  |  |  |
| parts_clerk |  |  |  |
| admin |  |  |  |
| read_only (negative RBAC) |  |  |  |

## 6) Findings Summary

### By Type

| Type | Count |
|---|---:|
| WF (workflow friction) |  |
| LI (logic inconsistency) |  |
| MF (missing feature) |  |
| DX (data/state defect) |  |
| RBAC (permission mismatch) |  |
| OBS (observability gap) |  |

### By Severity

| Severity | Open | Closed This Week | Aging Risk |
|---|---:|---:|---|
| S0 |  |  |  |
| S1 |  |  |  |
| S2 |  |  |  |
| S3 |  |  |  |

## 7) Top 10 Issues (Ranked)

| Rank | ID | Type | Severity | Module | Short Description | Owner | ETA |
|---:|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |

## 8) Automation Backstop Report

Preflight suites run:
- `npx playwright test e2e/smoke-all-routes.spec.ts --project=chromium-authenticated` -> `<pass/fail + notes>`
- Module-specific suites -> `<list>`

New regression tests added this week:
1. `<spec or test case>`
2. `<spec or test case>`

Gaps not yet automated:
1. `<gap>`
2. `<gap>`

## 9) Decisions and Learnings

1. Decision: `<what was decided>`
- Why: `<reason>`
- Tradeoff: `<cost/benefit>`

2. Learning: `<user behavior or system insight>`
- Impact: `<what changes next week>`

## 10) Next Week Commitments

1. `<commitment #1>`
2. `<commitment #2>`
3. `<commitment #3>`

## 11) Handoff Notes (For Next Codex Instance)

Current bottleneck: `<most limiting issue>`  
Highest leverage fix: `<what to do first>`  
Do not repeat: `<known dead-end or invalid assumption>`  
First command to run next week: `<exact command>`

