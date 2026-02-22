# WS15-H — Multi-Aircraft Technician Task Board

**Workstream:** WS15-H  
**Phase:** 15 R&D  
**Owners:** Chloe Park (Frontend), Finn Calloway (UX)  
**SMEs:** Dale Purcell (Avionics), Danny Osei (WO Coordinator)  
**Date:** 2026-02-22  
**Status:** READY FOR BUILD

---

## 1) SME Brief (Dale + Danny)

### 1.1 Problem statement
Dale and Danny work in different roles but report the same system failure: the official software is record-capable yet poor at real-time, multi-aircraft coordination.

Both run shadow systems because one-record-at-a-time UI does not match shop reality.
Dale keeps a whiteboard for parallel avionics progress.
Danny keeps a whiteboard + Word status sheet + extra calls/texts to discover current state.

Shared pain points:
- no true multi-aircraft board view,
- stale status propagation,
- weak distinction between technical vs customer-facing status language,
- hidden queue blockers (parts, authorization, bench test),
- AOG as label rather than priority behavior.

### 1.2 Dale Purcell brief (avionics)
Dale’s day is multi-threaded execution: 3–5 aircraft active, frequent batching of bench/test-set work, and constant transitions between “in work,” “awaiting test,” and “awaiting parts.”

Dale requires:
1. columns by tail number, simultaneously visible,
2. explicit bench-test lane,
3. drag/move speed with low friction,
4. blocker visibility before signoff,
5. status semantics that mirror actual floor conditions,
6. board support for bench note context.

Compliance-adjacent card needs from Dale:
- test equipment reference completeness,
- calibration warning visibility,
- TSO/STC/337 completeness indicator,
- signability state clarity before legal sign flow.

### 1.3 Danny Osei brief (WO coordinator)
Danny’s core function is truthful status communication under interruption pressure (20–30 calls/day at peak). He needs live, glanceable state, not buried detail hidden three clicks deep.

Danny requires:
1. one board for all active aircraft,
2. real-time updates without manual refresh,
3. internal vs customer status separation,
4. hard “authorization pending” hold visibility,
5. AOG system-priority behavior across views,
6. pre-close confidence signal before billing handoff.

### 1.4 Synthesis
Dale represents execution truth.
Danny represents communication truth.
WS15-H must keep both synchronized.

Success criteria from SME synthesis:
- canonical lane model,
- deterministic real-time conflict handling,
- tablet/glove ergonomics,
- visible safeguards for failure states,
- auditable linkage to underlying WO/task events.

### 1.5 Non-goals
WS15-H does **not** deliver full customer portal, full scheduling engine, or legal-signoff replacement.
WS15-H **does** deliver a shared operational board layer integrated with existing work-order and task systems.

### 1.6 Continuity from prior workstreams
- WS13-A: keyboard-open and glove-mode reliability defects cannot regress.
- WS13-C: controlled rollout, guardrails, amber/red discipline, and evidence packets are required.
- WS15-A: board transitions affecting legal-state progression must be auditable.

---

## 2) Board Data Model and Lanes

### 2.1 Data model posture
WS15-H board state is a projection over authoritative WO/task data.
No duplicate compliance truth is created.
Projection exists for speed, visibility, and cross-role coordination.

### 2.2 Core entities
- `TaskBoard`
- `TaskBoardLane`
- `TaskBoardCard`
- `TaskBoardCardAssignment`
- `TaskBoardEvent`
- `TaskBoardPresence`
- `TaskBoardConflict`

### 2.3 Entity specs
`TaskBoard` fields: `boardId`, `orgId`, `siteId`, `name`, `scope(active_shop|aog_focus|technician_personal)`, `createdAt`, `createdBy`, `version`.

`TaskBoardLane` fields: `laneId`, `boardId`, `laneCode`, `title`, `position`, `isWipLimited`, `wipLimit`, `isTerminal`, `customerVisibleStateMap?`.

`TaskBoardCard` fields: `cardId`, `boardId`, `workOrderId`, `taskCardId`, `tailNumber`, `aircraftMakeModel`, `title`, `currentLaneCode`, `priorityClass(normal|aog|critical_hold)`, `authState(clear|authorization_pending|authorization_declined)`, `signabilityState(signable|warning|blocked)`, `partsState(none_pending|awaiting_parts|partial_received)`, `benchTestState(not_required|pending|in_progress|complete)`, `updatedAt`, `updatedBy`, `eventSeq`.

`TaskBoardCardAssignment` fields: `assignmentId`, `cardId`, `userId`, `role`, `assignedAt`, `assignedBy`.

`TaskBoardEvent` fields: `eventId`, `boardId`, `cardId`, `eventType`, `fromLane`, `toLane`, `actorId`, `actorRole`, `ts`, `eventSeq`, `correlationId`, `source(ui|automation|system_rule)`.

`TaskBoardPresence` fields: `presenceId`, `boardId`, `userId`, `activeSince`, `lastHeartbeat`, `activeCardId`, `editingField`.

`TaskBoardConflict` fields: `conflictId`, `boardId`, `cardId`, `type`, `localEventSeq`, `serverEventSeq`, `detectedAt`, `resolvedAt`, `resolution`.

### 2.4 Canonical lane set
Default lane sequence:
1. `RECEIVED`
2. `INITIAL_INSPECTION`
3. `IN_PROGRESS`
4. `AWAITING_BENCH_TEST`
5. `AWAITING_PARTS`
6. `AUTHORIZATION_PENDING`
7. `READY_FOR_SIGNOFF`
8. `FINAL_INSPECTION`
9. `READY_FOR_PICKUP`

### 2.5 Lane semantics
`RECEIVED`: aircraft accepted, no active execution.

`INITIAL_INSPECTION`: findings in progress; customer-safe copy available.

`IN_PROGRESS`: active approved scope work.

`AWAITING_BENCH_TEST`: explicit test-set queue state (Dale-critical).

`AWAITING_PARTS`: material hold; ETA metadata required.

`AUTHORIZATION_PENDING`: discrepancy awaiting owner/operator decision; close path hard-held.

`READY_FOR_SIGNOFF`: execution complete, sign prerequisites pending.

`FINAL_INSPECTION`: final/QCM checks underway.

`READY_FOR_PICKUP`: operationally release-ready.

### 2.6 Priority overlays
Priority is orthogonal to lane.
`aog` overlay behavior: pin-to-top, elapsed timer always visible, propagation to all role views.
`critical_hold` overlay behavior: cert/auth blocker requiring explicit resolution.

### 2.7 Card face payload
Minimum visible card data: tail number, WO number, title, lane, assignees, blocker badges, mini-state chips (parts/auth/bench), last-event age, and AOG timer when active.

### 2.8 Card drawer payload
Timeline + discrepancy/authorization details + bench notes + signability checklist + customer-status preview + linked artifacts.

### 2.9 Integrity constraints
- one active lane/card,
- per-card monotonic `eventSeq`,
- every move emits event,
- policy engine validates all transitions server-side,
- no silent bypass of authorization hold,
- terminal transitions require prerequisites.

---

## 3) Real-Time Update Semantics and Conflict Handling

### 3.1 Sync architecture
Model: optimistic client + server-authoritative event stream.
Flow: client command (with expected `eventSeq`) -> server validate+append -> server broadcast canonical event -> clients reconcile.

### 3.2 Event envelope requirements
Each event includes `eventType`, `boardId`, `cardId`, `eventSeq`, `ts`, `actorId`, `source`, `schemaVersion`, and optional `reasonCode`.

### 3.3 Event types
Required: `CARD_MOVED`, `CARD_UPDATED`, `ASSIGNMENT_ADDED`, `ASSIGNMENT_REMOVED`, `AUTH_STATE_CHANGED`, `PARTS_STATE_CHANGED`, `BENCH_TEST_STATE_CHANGED`, `PRIORITY_CHANGED`, `CONFLICT_DETECTED`, `CONFLICT_RESOLVED`.

### 3.4 Ordering guarantees
Strict ordering per card.
Cross-card ordering is timestamp-coherent but not globally serialized.
Periodic snapshots include watermark sequence for rapid recovery.

### 3.5 Conflict scenarios
C1: two users move same card to different lanes.
C2: stale client submits old sequence.
C3: system hold insertion races a user move.
C4: target lane becomes invalid by policy at commit time.

### 3.6 Resolution policy
Server state is authoritative.
UX must remain explicit and recoverable.

Resolution rules:
- sequence mismatch -> reject + authoritative card state,
- policy violation -> reject + reason code,
- hold insertion preempts progression,
- first committed valid move wins true race.

Client rules:
- rollback optimistic state on reject,
- show conflict banner and reason,
- offer “apply server state” and “retry move”,
- never silently discard intent.

### 3.7 Offline/weak network semantics
Mobile intent queue supports short outages with bounded depth and TTL.
On reconnect: replay ordered intents, stop on first conflict, present resolution UI, continue replay only with user confirmation.

### 3.8 Presence and field locks
Presence is soft-awareness (who is active where).
No global movement lock.
Field-level ephemeral locks apply to long-form note editing only.

### 3.9 Audit linkage
Board events that affect operational-significant state must carry `correlationId` to WO/task domain events.
This preserves traceability for compliance and incident review.

### 3.10 SLOs and guardrails
Controlled profile targets:
- fanout p95 < 400ms,
- fanout p99 < 900ms,
- client reconcile median < 150ms.

Alert posture:
- amber: stale risk >2 minutes,
- red: stale risk >5 minutes or integrity mismatch.

### 3.11 Channel safeguards
- envelope schema versioning,
- unknown event tolerance + logging,
- snapshot checksums,
- jittered reconnect backoff,
- replay-window bounds.

---

## 4) Mobile / iPad Ergonomics for Hangar Use

### 4.1 Field assumptions
Primary target is iPad-class tablet used in hangar conditions (glare, gloves, movement, intermittent network, frequent keyboard transitions).

### 4.2 Touch and target standards
- minimum 52x52 touch targets for critical actions,
- enlarged lane drop zones,
- visible drag handle separated from open-details tap zone,
- stable bottom action strip honoring safe area insets.

### 4.3 Keyboard-open hard requirements
Derived from WS13-A reliability lessons:
- no CTA occlusion when keyboard is open,
- focused field remains visible,
- no focus-scroll jitter loops,
- submit/move actions always reachable.

### 4.4 Layout modes
Portrait: lane stack + quick-jump chips + simplified density.
Landscape: full Kanban + cross-lane drag + broad situational awareness.

### 4.5 Visual robustness
- high-contrast typography,
- text labels on all statuses,
- color as secondary cue only,
- legible AOG timer at distance,
- glare-tolerant tokens.

### 4.6 Glove-first quick actions
Long-press action sheet:
- move to next valid lane,
- set awaiting parts,
- set authorization pending,
- add bench note,
- raise blocker.

This gives non-drag paths for precision-limited input.

### 4.7 Cognitive load controls
- dense card face limited to high-signal fields,
- progressive disclosure in drawer,
- sticky user filters,
- stable ordering to avoid visual thrash during live updates.

### 4.8 Accessibility
- VoiceOver labels for badges and actions,
- dynamic type support up to 120% without clipping critical data,
- haptic success acknowledgement,
- distinct error feedback for rejected actions.

### 4.9 State persistence
- preserve board position on suspend/resume,
- local note draft persistence until confirmed,
- stale banner with last-sync age.

### 4.10 Device matrix minimum
- iPad 11" current + prior iPadOS,
- iPad Mini class,
- narrow keyboard-open variants,
- glove-mode simulation and live touch runs.

---

## 5) Failure Modes + Safeguards

### FM-01 Event lag yields stale board
Risk: incorrect coordinator/customer status communication.
Safeguards: stale-age banner, fallback snapshots, amber/red alerting, incident runbook.

### FM-02 Concurrent move overwrite ambiguity
Risk: operator trust breakdown.
Safeguards: strict sequence checks, deterministic rollback, explicit conflict UX, conflict logs.

### FM-03 Authorization hold bypass
Risk: unapproved discrepancy appears close-ready.
Safeguards: server policy gates, hard hold semantics, reason-coded rejection.

### FM-04 AOG not propagated everywhere
Risk: critical work loses priority.
Safeguards: shared priority service, cross-dashboard assertions, timer health checks.

### FM-05 Keyboard occlusion regression
Risk: mobile users cannot complete critical actions.
Safeguards: keyboard-safe action row, CI layout assertions, regression pack from prior defect class.

### FM-06 Invalid offline replay
Risk: stale queued intents corrupt board state.
Safeguards: stop-on-first-conflict replay, user-confirm continuation, TTL discard reporting.

### FM-07 Color-only semantics
Risk: blockers missed in glare or monochrome contexts.
Safeguards: text-first badges, icon redundancy, grayscale QA snapshots.

### FM-08 Audit discontinuity
Risk: non-defensible transition history.
Safeguards: required correlation IDs, reconciliation job, orphan-alert pipeline.

### FM-09 Lane semantic drift across sites
Risk: inconsistent operations and metrics.
Safeguards: canonical lane registry, label-only localization, governance gate for semantic change.

### FM-10 Board overload under volume
Risk: low signal/noise and missed priorities.
Safeguards: virtualization, WIP indicators, saved filters, AOG/focus modes.

---

## 6) Test Plan Skeleton (Cilla-ready)

### 6.1 Test charter
Prove WS15-H is correct, conflict-safe, mobile-reliable, role-fit (Dale/Danny), and audit-traceable under normal and failure conditions.

### 6.2 Suite A — Data and policy
A-01 entity constraints/references.
A-02 lane registry integrity.
A-03 invalid transition rejects and reason codes.
A-04 AOG pin/timer persistence.
A-05 authorization hold hard enforcement.

### 6.3 Suite B — Real-time and conflict
B-01 baseline move fanout latency.
B-02 same-card dual-user race.
B-03 stale sequence conflict.
B-04 hold insertion race.
B-05 reconnect replay + snapshot reconciliation.

### 6.4 Suite C — Mobile reliability
C-01 glove critical action success.
C-02 keyboard-open CTA visibility.
C-03 portrait lane-stack usability.
C-04 landscape drag reliability.
C-05 stale banner behavior under packet loss.

### 6.5 Suite D — SME scenario runs
D-01 Dale bench-test handoff day.
D-02 Dale multi-aircraft batch transition day.
D-03 Danny call-response accuracy drill.
D-04 Danny authorization hold/release flow.
D-05 AOG escalation propagation across role dashboards.

### 6.6 Suite E — Failure injection
E-01 broker lag.
E-02 packet drop/reorder.
E-03 duplicate replay handling.
E-04 partial outage fallback path.
E-05 audit-correlation failure response.

### 6.7 Suite F — Accessibility/visual safety
F-01 grayscale comprehension.
F-02 VoiceOver labels/actions.
F-03 dynamic text clipping checks.
F-04 contrast compliance.
F-05 haptic/audio feedback consistency.

### 6.8 Thresholds (initial)
- deterministic conflict outcome: 100%,
- glove critical action success: >=98%,
- fanout p95 <400ms,
- AOG propagation <=2s across views,
- zero unresolved audit-correlation defects.

### 6.9 Required evidence artifacts
- run matrix by day/window,
- immutable receipt IDs,
- fail->fix->verify bundles,
- mobile captures (portrait/landscape/keyboard-open),
- conflict/replay logs,
- residual risk register with owners.

### 6.10 Exit criteria
Gate-ready when all critical tests PASS, no unresolved SEV1/SEV2, residual risks are explicit/accepted, and evidence packet is admissible.

---

## 7) Frontend + UX Implementation Direction

### 7.1 Chloe (frontend)
- server-authoritative real-time stream with optimistic adapters,
- board projection query optimized for dense read throughput,
- virtualized rendering for high-card lanes,
- centralized rejection/conflict state machine,
- reusable status badge/timer components (text-first).

### 7.2 Finn (UX)
- strict hierarchy: tail + lane + blockers first,
- operation modes: board + focus list,
- explicit language split for internal/customer semantics,
- remove decorative statuses with no action value,
- validate wording with coordinator scripts.

### 7.3 Dependencies
- work order/task domain APIs,
- discrepancy authorization service,
- AOG priority source,
- event/audit correlation service.

### 7.4 Rollout
1) pilot at avionics-heavy site, 2) 3–5 day shadow mode, 3) limited interactive cohort, 4) daily defect triage with SMEs, 5) expansion only after thresholds are met.

---

## 8) WS15-H Verdict

## **VERDICT: CONDITIONAL**

Why CONDITIONAL:
- SME demand is clear and aligned,
- model + lanes + conflict policy are build-ready,
- mobile ergonomics and safeguards are explicitly specified,
- but PASS requires empirical proof in pilot conditions.

Conditions to move to PASS:
1. Cilla critical suites (especially B/C/D/E) pass.
2. Latency and concurrency thresholds hold in controlled profile.
3. No bypass path for authorization/AOG policy rules.
4. Audit-correlation remains intact under failure injection.
5. Keyboard-open reliability proven across tablet matrix.

Triggers for FAIL:
- unresolved audit continuity defects,
- non-deterministic conflict resolution,
- critical mobile action reliability below threshold,
- lane semantics drifting from SME-approved model.

---

## 9) Immediate next actions
1. Freeze schema + event contract.
2. Build lane policy engine and reason-code rejects.
3. Implement board shell, card renderer, drawer.
4. Wire stream sync + conflict UI.
5. Execute Cilla test skeleton.
6. Run Dale + Danny scenario signback.

---

## 10) Final statement
WS15-H fills a structural gap between recorded work and visible work.
Dale and Danny independently identified the same problem from different sides of the operation.
This spec converts those field constraints into a testable, implementable board system.
If the listed conditions are met with admissible evidence, WS15-H should promote from CONDITIONAL to PASS for controlled multi-aircraft operations.
