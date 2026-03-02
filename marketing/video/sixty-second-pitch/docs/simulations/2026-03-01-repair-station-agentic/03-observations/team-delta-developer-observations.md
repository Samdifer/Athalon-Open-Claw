# Team Delta Developer Observations

## Scope

Quote authoring, quote conversion, invoicing, payment controls, and customer-facing status.

## Findings

| ID | Observation | Likely Root Cause | Risk | Recommendation | Class |
| --- | --- | --- | --- | --- | --- |
| DELTA-01 | Labor kit lookup depends on precise naming memory. | Search relevance is text-match heavy with limited intent ranking. | Slower estimating and reuse failure. | Add semantic/ATA-aware ranking and recent-kit suggestions. | missing-feature |
| DELTA-02 | Manual line composition repeats common bundles often. | No reusable ad-hoc bundle memory for frequent combinations. | Time loss and inconsistency in quote structure. | Add "save as reusable bundle" in draft composer. | missing-feature |
| DELTA-03 | Payment workflow improved but lacks high-value dual-approval. | Posting authority model is flat at interaction level. | Financial control exposure on large receipts. | Add approval threshold and second approver flow. | missing-feature |
| DELTA-04 | Internal status updates may reach portal with perceived delay. | Synchronization semantics not explicit to user. | Customer trust erosion and support escalations. | Add portal freshness timestamp and sync-state indicator. | fix-now |
| DELTA-05 | Quote to invoice continuity is visible but pricing/tax explainability is weak. | Totals are shown without decision trace. | Disputes require manual reconstruction of logic. | Add line-level pricing/tax trace panel. | fix-now |

## Anticipated Failure Modes

- Converted quote may inherit stale pricing settings after rule changes mid-day.
- Portal users may challenge invoice state when internal events race with display refresh.
