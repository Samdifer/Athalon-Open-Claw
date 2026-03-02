# Codex Context: Training Program Rationale and Continuity Notes

Date: 2026-03-02  
Owner: Product/Ops + Codex sessions  
Purpose: Preserve the reasoning behind training/testing plan decisions so future Codex instances can continue with intent fidelity.

## 1) Business Intent Behind This Work

Primary business outcome:
- Reduce workflow failure in production by using training sessions as structured product diagnostics.

Secondary outcomes:
- Shorten onboarding time for new users.
- Catch logic inconsistencies before they impact billing/compliance.
- Build a durable loop from user friction -> prioritized fixes -> regression coverage.

## 2) Why This Plan Exists (Decision Context)

Context observed in app and docs:
1. App has many modules/routes with role-dependent access, so ad hoc training misses coverage.
2. High-risk flows exist across modules (especially work orders, time tracking, billing handoffs).
3. E2E coverage exists but not all discovered user friction is automatically fed into test expansion.

Decision:
- Use modular pack-based training with role matrix, scorecards, and automation backstop.

Why:
- It balances real-user learning with deterministic test repeatability.

## 3) Guiding Principles for Future Codex Instances

1. Do not treat training docs as static documentation.
- Every run should generate findings, evidence, and prioritized follow-up actions.

2. Preserve role realism.
- A workflow validated only as admin is not production-safe.

3. Preserve cross-module integrity.
- Do not mark a module green if downstream handoffs fail.

4. Convert recurring findings into automated tests quickly.
- Repeated manual rediscovery is process debt.

5. Keep gates objective.
- Use measurable thresholds (completion rate, assists, severity closure).

## 4) Non-Negotiable Invariants

These invariants were elevated because they drive revenue/compliance risk:

1. Single active timer per technician.
2. Context lineage integrity (`work_order -> task -> step`).
3. Approval-gated labor inclusion for billing.
4. Billed-entry lock semantics and auditability.
5. Role boundary enforcement for mutation actions.

If future plans remove or relax these, require explicit risk signoff in writing.

## 5) Known Assumptions and How to Validate Them

1. Assumption: Work order creation requires aircraft + description, while WO number is auto-generated.
- Validate each cycle against `/work-orders/new` behavior and creation mutation.

2. Assumption: Existing Playwright suites are sufficient baseline for preflight smoke.
- Validate weekly by reviewing suite pass rate and escaped production defects.

3. Assumption: Two role runs + one negative RBAC run per module is minimum acceptable.
- Validate by tracking escaped role-related defects.

## 6) Common Failure Modes (Avoid These)

1. Scope drift:
- Expanding one module pack into a full-system audit in a single week.

2. Ticket lag:
- Logging findings but not assigning owner + target date same day.

3. False green:
- Marking module complete without post-fix re-run.

4. Evidence gaps:
- Findings without reproducible steps or artifact links.

5. Automation debt:
- Same issue discovered in 2+ sessions without an E2E guard addition.

## 7) Required Artifacts Per Cycle

1. Weekly dashboard populated from real run data.
2. Updated module pack docs for modules touched that week.
3. Findings list with severity and ticket linkage.
4. Regression additions list (new/updated test coverage).

## 8) How to Continue This Program Safely

When a new Codex instance takes over:

1. Read in this order:
- `docs/workflow-readiness-loop/README.md`
- `docs/workflow-readiness-loop/PROCESS-CHARTER.md`
- `docs/workflow-readiness-loop/modules/work-order-creation/PACK-WO-CREATE-v1.md`
- `docs/workflow-readiness-loop/templates/WEEKLY-OPS-DASHBOARD-TEMPLATE.md`
- This file

2. Start each week by copying the dashboard template into a dated weekly report.

3. Execute preflight automation before live sessions.

4. Run planned module sessions and update findings in-session.

5. End week only after gate review and next-week commitments are written.

## 9) Change Log for This Context File

1. 2026-03-02:
- Created to preserve rationale, assumptions, invariants, and handoff guidance for future Codex sessions.
