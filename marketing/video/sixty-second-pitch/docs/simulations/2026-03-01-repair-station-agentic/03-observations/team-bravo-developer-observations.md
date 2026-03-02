# Team Bravo Developer Observations

## Scope

Scheduling board, capacity planning, command center, and location scoping.

## Findings

| ID | Observation | Likely Root Cause | Risk | Recommendation | Class |
| --- | --- | --- | --- | --- | --- |
| BRAVO-01 | Drag-drop assignment confirmation is too subtle in dense boards. | Minimal visual and auditory confirmation after drop event. | Misplaced work and hidden schedule drift. | Add explicit drop toast + lane highlight persistence. | fix-now |
| BRAVO-02 | Panel workspace state is fragile after route/view changes. | UI state not preserved as reusable layout profile. | Rework overhead in every planning session. | Persist analytics/roster tray workspace presets per user. | missing-feature |
| BRAVO-03 | Location confidence requires manual verification. | Partition cues are present but not assertive. | Cross-station planning contamination risk. | Add location scope watermark and assignment scope guard. | fix-now |
| BRAVO-04 | Configuration and financial assumptions save in separate mental paths. | Command center tabs are siloed without scenario bundling. | Inconsistent what-if planning decisions. | Add "planning scenario" bundles with apply/revert. | missing-feature |
| BRAVO-05 | Archive/restore behavior is useful but lacks audit-context summary. | Graveyard list lacks impact metadata. | Recoveries can reintroduce stale priorities. | Show archive reason, actor, and prior lane context. | fix-now |

## Anticipated Failure Modes

- Rapid location switching during drag operations may apply updates to stale UI state.
- Saved assumptions may conflict with role expectations without ownership controls.
