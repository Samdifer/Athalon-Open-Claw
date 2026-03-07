# Team B Backend Tech Debt: Deferred Risky Refactors

This pass focused on high-impact hardening with API compatibility preserved. The items below were deferred because they are high-churn or migration-heavy.

## Deferred Items

1. Full auth/RBAC helper consolidation across all Convex modules
- Risk: large touch surface across many legacy files with local `requireAuth` + org checks.
- Why deferred: likely to introduce behavior drift without dedicated regression coverage.

2. Centralized audit writer migration for all `auditLog` inserts
- Risk: dozens of mutation paths currently write audit rows directly with inconsistent payload shape.
- Why deferred: converting all call sites atomically is safer with a dedicated cleanup sprint and audit fixture tests.

3. Role-policy model expansion beyond role strings (permission matrix / policy table)
- Risk: requires schema changes, policy migration, and frontend capability mapping updates.
- Why deferred: not compatible with a low-risk hardening window.

4. Strong uniqueness and lifecycle constraints around technician identity
- Risk: adding strict uniqueness (for example org+user uniqueness at schema level) may conflict with existing data.
- Why deferred: requires data cleanup/backfill tooling and rollout sequencing.

5. Last-admin invariant optimization with dedicated indexed role counters
- Risk: would require new data model or background-maintained counters.
- Why deferred: current runtime guard is correct but not yet O(1) for very large orgs.
