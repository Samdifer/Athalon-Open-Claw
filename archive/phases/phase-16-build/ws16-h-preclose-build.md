# WS16-H — Pre-Close Checklist Build

**Phase:** 16  
**Depends on:** `phase-15-rd/ws15-i-preclose.md`  
**Owners:** Devraj Anand, Chloe Park, Danny Osei (SME UAT), Marcus Webb (compliance review on rule severity)  
**Status:** **CONDITIONAL**

---

## 1) Implementation Spec

Build deterministic pre-close gate with immutable run artifacts and snapshot-locked submit.

### Build scope
- Rule registry + evaluator (`BLOCKING` vs `ADVISORY`).
- Snapshot token at checklist run; same token required on close.
- Canonical result hash persisted with audit events.
- WO pre-close UI (summary, findings, evidence drawer, fix links, rerun delta).
- Feature-flagged dependency hooks for WS16-B (IA re-auth pointers) and WS16-C/WS15-A export linkage.

**Why CONDITIONAL now:** WS15-I explicitly depends on final WS15-B/WS15-A contracts for full rule closure.

---

## 2) Concrete Mutation / Query / API Contracts

### Action: `evaluatePreCloseChecklist`
```ts
args: { workOrderId: Id<"workOrders">; strictMode?: boolean }
returns: {
  runId: Id<"preCloseRuns">;
  evaluatedAt: number;
  snapshotToken: string;
  ruleCatalogVersion: string;
  blockingFindings: Finding[];
  advisoryFindings: Finding[];
  verdict: "PASS"|"CONDITIONAL"|"FAIL";
  closeAllowed: boolean;
  resultHash: string;
}
throws: PRECLOSE_DATASET_UNAVAILABLE | PRECLOSE_ENGINE_TIMEOUT | PRECLOSE_RULE_EVAL_ERROR
```

### Mutation: `submitCloseWithPreCloseToken`
```ts
args: { workOrderId: Id<"workOrders">; runId: Id<"preCloseRuns">; snapshotToken: string }
throws: PRECLOSE_CLOSE_RUN_MISSING | PRECLOSE_CLOSE_RUN_STALE | PRECLOSE_SNAPSHOT_STALE | PRECLOSE_BLOCKERS_PRESENT | PRECLOSE_AUDIT_WRITE_FAILED
returns: { closed: true; closedAt: number; closeAuditEventId: Id<"auditLog"> }
```

### Query: `getPreCloseRunHistory`
```ts
args: { workOrderId: Id<"workOrders">; limit?: number }
returns: PreCloseRunSummary[]
```

---

## 3) UI Behaviors

- “Run Pre-Close Checklist” action on WO detail.
- Verdict banner: PASS / CONDITIONAL / FAIL.
- Blockers always listed first; close CTA disabled when blockers > 0.
- Evidence drawer shows rule logic, evidence pointers, remediation, regulatory reference.
- “Fix Now” deep links to exact remediation route.
- Rerun displays delta (resolved/remaining/new findings).
- Close attempt with stale snapshot shows explicit stale-state blocker.

---

## 4) UAT Script (Named SME: Danny Osei)

1. Open WO seeded with missing customer authorization.
2. Run checklist; verify blocker appears with direct remediation link.
3. Add authorization; rerun; verify blocker clears.
4. Seed IA-required case missing IA cert pointer; rerun; verify blocker appears.
5. Fix IA path; rerun; verify advisory-only state.
6. Close using fresh run token; verify success + audit linkage.
7. Attempt close with stale token; verify hard block.

**Pass condition:** Danny confirms reduced pre-close review time and clear blocker/advisory separation.

---

## 5) Cilla Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| H-01 | Clean WO | PASS, closeAllowed=true |
| H-02 | Missing required signature | FAIL blocker |
| H-03 | Missing IA cert (IA path) | FAIL blocker |
| H-04 | Unresolved discrepancy | FAIL blocker |
| H-05 | Advisories only | CONDITIONAL, closeAllowed=true |
| H-06 | Snapshot drift before submit | stale block |
| H-07 | Rule evaluation exception | fail-closed |
| H-08 | Audit write failure | close blocked |
| H-09 | Result hash recompute | exact match |
| H-10 | Rerun delta panel | accurate resolved/new counts |

---

## 6) Marcus Compliance Checklist (Applicable)

- [ ] Severity map validates §43.9 minimum-content blockers.
- [ ] IA re-auth dependency rules (E-03/E-04) align with WS16-B contract.
- [ ] Audit chain is immutable and explainable by runId/resultHash.
- [ ] No close path exists without fresh pre-close run evidence.

---

## 7) Build Exit + Status

**Build exit criteria:** core engine/UI shipped, Cilla matrix green, Danny UAT pass.  
**Conditional closure criteria:** WS16-B and WS16-C contract integrations complete and Marcus signs final severity/reg linkage.  
**Status:** **CONDITIONAL**