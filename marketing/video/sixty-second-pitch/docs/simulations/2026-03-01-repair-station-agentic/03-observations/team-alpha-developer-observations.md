# Team Alpha Developer Observations

## Scope

Line operations, work-order execution, signoff, and release workflow.

## Findings

| ID | Observation | Likely Root Cause | Risk | Recommendation | Class |
| --- | --- | --- | --- | --- | --- |
| ALPHA-01 | AOG prioritization is not prominent in squawk/work-order views. | Insufficient priority-specific filtering and saved views. | Dispatch-critical items can be delayed behind routine tasks. | Add AOG-first quick filters and pinned queue presets. | fix-now |
| ALPHA-02 | Shift handoff notes exist but lack concise summary rendering. | Notes model is append-only without digest generation. | Critical context lost during shift change. | Add shift digest card with unresolved actions and owner. | missing-feature |
| ALPHA-03 | Dual-signoff visibility still requires scanning multiple sections. | Signature status data is distributed across UI regions. | Inspector may miss incomplete signoff chain. | Add explicit tech/inspector signoff matrix and blocker badge. | fix-now |
| ALPHA-04 | Release readiness depends on multi-panel interpretation. | Close-readiness evidence is fragmented in UI. | Unsafe or delayed release decisions under pressure. | Add single release readiness gate card with reason codes. | fix-now |
| ALPHA-05 | Location context can be ambiguous during urgent updates. | Global location state not always foregrounded. | Updates may hit wrong station context. | Add persistent location lock banner on editing pages. | fix-now |

## Anticipated Failure Modes

- Partial signatures may be interpreted as complete authorization during high workload.
- Handoff notes may accumulate without ownership, leading to unresolved latent defects.
