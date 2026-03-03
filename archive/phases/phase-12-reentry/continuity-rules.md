# Phase 12 Continuity Rules (Anti-Idle)
**Applies to:** Phase 12 Re-entry orchestration  
**Effective:** 2026-02-22T17:08:00Z

## Core Rule
If **no active runs** exist and **phase lock is not LOCKED**, orchestrator must **immediately spawn the next eligible stream**.

## Trigger Conditions
1. `active_runs == 0`
2. `phase_status` is not terminal (not COMPLETE/LOCKED/ABORTED)
3. At least one stream has status in {QUEUED, READY, UNBLOCKED}

When all 3 are true, spawn within same orchestration cycle (no wait for user prompt).

## Eligibility Order
1. Parallel first-wave: WS12-A, WS12-B, WS12-C
2. Then WS12-D after WS12-B draft trace exists
3. Then WS12-E after WS12-A..WS12-D PASS

## Duplicate-Run Guard
- Do not spawn a label already ACTIVE.
- Do not respawn if artifact file changed within past 30 minutes unless marked `FORCE-UNBLOCK`.

## Stall Recovery
- If a stream has no artifact delta for >2 hours and not marked BLOCKED by owner, create an unblocker task section in that stream artifact (`UNBLOCKER-<timestamp>`) and execute immediately.

## Evidence Discipline
- Status changes must cite artifact path and checklist result.
- "Done" requires file presence + explicit pass/fail checklist in file body.

## Phase Lock Interaction
- LOCKED phase suspends auto-spawn logic.
- On unlock, continuity engine resumes and evaluates eligibility immediately.
