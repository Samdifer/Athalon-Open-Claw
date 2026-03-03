# Athelon Phase 7 Hardening — UX Risk Burn-Down
Author: Chloe Park (Frontend) Inline notes: [FINN] UX, [NADIA] PM
Date: 2026-02-22 Status: Execution baseline for Phase 7
Scope: Convert Phase 6 conditional confidence into repeatable release confidence

## 0) Read-in confirmation and execution posture
I reviewed all required inputs before writing this plan. Inputs reviewed:
- `simulation/athelon/phase-6-alpha/frontend-completion.md` - `simulation/athelon/phase-6-alpha/validation-retest.md`
- `simulation/athelon/phase-5-mvp/pilot-test-report.md` - `simulation/athelon/reviews/phase-6-gate-review.md`
I am writing this in implementation voice. I am prioritizing legal defensibility and floor usability over cosmetic polish.
I am carrying forward only open or conditional UX risks. I am ranking risk by impact and recurrence probability.
I am attaching owner, fix set, acceptance checks, and stoplight control per item. [FINN] This should read like a burn-down operating document, not a retrospective.
[NADIA] This file is the Phase 7 UX execution source of truth.

## 1) Open conditional UX risks from Phase 6 (ranked by impact)
### 1.1 Ranking model
Impact axis A: legal defensibility exposure. Impact axis B: operational delay and avoidable retries.
Impact axis C: stale-state or ambiguity risk in multi-user workflows. Impact axis D: probability of recurrence in first 30 days.
Priority key: - P0 = immediate confidence/defensibility risk.
- P1 = medium-high floor friction with compliance signaling risk. - P2 = bounded friction or clarity issue.

### 1.2 Ranked risk list
#### R1 — Evidence packet incompleteness before GO calls
Priority: P0 Current stoplight: Amber
Owners: Chloe + Cilla + Jonas Observed in Phase 6:
- Functional closure passed. - Artifact attachments remained inconsistent.
- Gate review explicitly flagged evidence discipline as conditional. Why this matters:
- Correct behavior without proof still triggers launch hesitation. - QA/regulatory verification slows down and becomes person-dependent.
Failure mode: - GO decision is delayed or disputed due to missing receipts.

#### R2 — Build parity ambiguity between retest and release candidate
Priority: P0 Current stoplight: Amber
Owners: Jonas + Chloe Observed in Phase 6:
- Frontend report documented snapshot/runtime parity concerns. - Gate review required hash pinning controls.
Why this matters: - Conditional risks can silently reappear if wrong FE/BE pair ships.
- Retest confidence loses value without immutable release pairing. Failure mode:
- Regressions ship despite clean retest on another build pair.

#### R3 — Counter-sign duplicate error lacks immediate recovery context
Priority: P1 Current stoplight: Amber
Owners: Chloe + Devraj Observed in Phase 5/6:
- Duplicate block integrity is correct. - First error surface often lacks signer/time navigation context.
Why this matters: - Users repeat attempts.
- Supervisors get avoidable clarification pings. Failure mode:
- Floor trust drops because signing state appears opaque.

#### R4 — Inventory “available” semantics still risk invalid-attempt behavior
Priority: P1 Current stoplight: Amber
Owners: Devraj + Chloe Observed in Phase 5:
- Backend prevented non-compliant installs. - UI semantics could still invite users into blocked paths.
Why this matters: - Compliance signaling should prevent bad attempts upstream.
- Repeated blocked attempts create procedural noise. Failure mode:
- Users normalize “try then get blocked” workflow.

#### R5 — TT mismatch and related validation copy remain under-prescriptive
Priority: P2 Current stoplight: Amber
Owners: Chloe + Finn Observed in Phase 5/6:
- Correct guards are firing. - Message copy still too abstract in some paths.
Why this matters: - Users retry with same values.
- Throughput drops on WO open/close moments. Failure mode:
- Validation feels arbitrary instead of deterministic.

#### R6 — iPad/mobile proof artifacts for high-stakes flows are inconsistently attached
Priority: P1 Current stoplight: Amber
Owners: Chloe + Finn + Cilla Observed in Phase 6:
- Structural confidence exists. - Device capture receipts were not consistently bundled.
Why this matters: - Device readiness remains “believed,” not “demonstrated.”
Failure mode: - Real viewport regressions survive until pilot floor exposure.

#### R7 — Export failure-state copy parity is not fully hardened
Priority: P1 Current stoplight: Amber
Owners: Chloe + Finn + Devraj Observed in Phase 6:
- Export path functionally closed. - Failure wording/recovery cues not fully standardized across entry points.
Why this matters: - Users may assume success when artifact did not generate.
Failure mode: - False confidence in record portability.

#### R8 — QCM convergence fix is closed but not yet permanently guarded
Priority: P1 Current stoplight: Green/Watch
Owners: Chloe + Cilla Observed in Phase 6:
- Retest passed with two-session convergence. - Needs permanent gate automation to avoid relapse.
Why this matters: - High-visibility queue behavior is trust-sensitive.
Failure mode: - Stale pending list reappears during future refactors.

[FINN] Correct priority ordering: R1 and R2 are the trust spine. [NADIA] Keep this rank order stable through Week 2 unless incident data forces change.

## 2) Concrete fixes and acceptance checks for each risk
### 2.1 R1 fixes — Evidence packet completeness
Fix R1-A: Create mandatory evidence index template for every release. Fix R1-B: Require six launch-critical artifacts before GO declaration.
Fix R1-C: Hash-stamp every artifact filename with FE+BE short hashes. Fix R1-D: Add owner sign-off boxes in checklist (QA, FE, Release).
Fix R1-E: Block GO when any required artifact is missing. Required artifacts list:
1) Export success capture. 2) Export forced-failure capture.
3) QCM two-session convergence capture. 4) Hash parity receipt.
5) iPad portrait high-stakes capture. 6) iPad landscape high-stakes capture.
Acceptance checks: - AC-R1-01: 6/6 artifacts present in release packet folder.
- AC-R1-02: Every artifact includes FE/BE hash in filename. - AC-R1-03: QA verifies packet completeness in <3 minutes.
- AC-R1-04: Missing artifact auto-block tested and working. Stoplight to Green condition:
- Two consecutive releases with first-pass 6/6 completion.

### 2.2 R2 fixes — Build parity enforcement
Fix R2-A: Publish immutable release manifest with FE hash + BE hash + deploy timestamps. Fix R2-B: Require retest report to reference exact same hash pair.
Fix R2-C: Add pre-go parity check output to gate record. Fix R2-D: Add launch-path stub grep-clean receipt.
Fix R2-E: Add explicit NO-GO trigger on hash mismatch. Acceptance checks:
- AC-R2-01: Manifest exists and is linked from gate notes. - AC-R2-02: QA report hash pair equals release manifest pair.
- AC-R2-03: Parity command output attached in evidence folder. - AC-R2-04: Mismatch simulation correctly flips status to NO-GO.
Stoplight to Green condition: - Three releases with zero parity exceptions.

### 2.3 R3 fixes — Duplicate counter-sign recovery context
Fix R3-A: Extend error payload with existing signer name and timestamp. Fix R3-B: Include cert number when available.
Fix R3-C: Add one-click navigation to existing sign-off detail. Fix R3-D: Standardize recovery helper line (“Open existing sign-off”).
Acceptance checks: - AC-R3-01: First error render includes signer + time context.
- AC-R3-02: User reaches existing sign-off in one action. - AC-R3-03: Tablet and desktop both pass this flow.
- AC-R3-04: Rosa replay shows no confusion pause >10 seconds. Stoplight to Green condition:
- Scripted replay completes without facilitator intervention.

### 2.4 R4 fixes — Inventory semantic hardening
Fix R4-A: Exclude `quarantine` and `pending_inspection` from default available query. Fix R4-B: Add manager-only toggle for viewing non-issuable stock.
Fix R4-C: Add explicit non-installable state copy in toggle view. Fix R4-D: Keep install action disabled for non-issuable rows.
Acceptance checks: - AC-R4-01: Default available search returns zero non-issuable rows.
- AC-R4-02: Toggle reveals non-issuable rows with clear labels. - AC-R4-03: Install controls are disabled with rationale text.
- AC-R4-04: QA script shows zero avoidable invalid-attempt clicks. Stoplight to Green condition:
- Two release cycles without inventory-semantics regressions.

### 2.5 R5 fixes — Validation copy clarity
Fix R5-A: TT mismatch copy shows submitted and recorded values. Fix R5-B: Add direct corrective action text.
Fix R5-C: Apply same pattern to close-hours mismatch and related guards. Fix R5-D: Align wording style across create/open/close contexts.
Acceptance checks: - AC-R5-01: INV-18 copy includes submitted and recorded values.
- AC-R5-02: User resolves mismatch in one retry during script. - AC-R5-03: No repeated identical invalid retries in replay data.
Stoplight to Green condition: - Two full smoke runs with zero clarity-related retry loops.

### 2.6 R6 fixes — iPad/mobile confidence evidence
Fix R6-A: Define deterministic capture script for portrait/landscape/mobile. Fix R6-B: Capture not just static view but action-state transitions.
Fix R6-C: Require capture index entry for each high-stakes flow. Fix R6-D: Mark capture bundle as mandatory in release checklist.
Acceptance checks: - AC-R6-01: Five PreSignatureSummary sections evidenced across capture sequence.
- AC-R6-02: Sticky footer visible and tappable in both orientations. - AC-R6-03: IA hard-stop capture present on tablet class viewport.
- AC-R6-04: Auth-expired and retry state capture present. - AC-R6-05: QCM modal controls remain accessible on mobile width.
Stoplight to Green condition: - Two consecutive releases with complete device evidence bundle.

### 2.7 R7 fixes — Export failure copy parity
Fix R7-A: Standardize failure copy token set for all export entry points. Fix R7-B: Include explicit “No file was downloaded” sentence.
Fix R7-C: Add retry CTA and trace-ID exposure. Fix R7-D: Validate no success toast in forced-failure path.
Acceptance checks: - AC-R7-01: Wording parity verified across WO and record-detail export.
- AC-R7-02: Forced failure shows retry and trace-ID consistently. - AC-R7-03: Backend recovery + retry succeeds from same context.
- AC-R7-04: QA confirms no false success notification. Stoplight to Green condition:
- One full regression cycle with parity confirmed in both entry points.

### 2.8 R8 fixes — QCM convergence guard institutionalization
Fix R8-A: Add permanent two-session convergence smoke case. Fix R8-B: Add <=2s latency assertion in baseline environment.
Fix R8-C: Verify audit event coupling in same test path. Acceptance checks:
- AC-R8-01: Session B pending list updates without refresh. - AC-R8-02: Session B reviewed list receives item <=2s.
- AC-R8-03: `qcm_reviewed` event appears with matching actor/time window. Stoplight to Green condition:
- Included in smoke gate and passing continuously for one sprint.

[FINN] Good: every risk has measurable checks. [NADIA] Keep thresholds fixed this phase; no moving acceptance criteria.

## 3) Role-specific critical journeys with friction removal plan
### 3.1 DOM critical journey (Carla)
Journey steps: 1) Open Work Order.
2) Verify record identity and sign-off details. 3) Trigger export from primary entry point.
4) Confirm export success or recover from failure. 5) Verify `record_exported` audit entry.
Primary friction to remove: - Export failure ambiguity and parity across entry points.
Planned interventions: - Apply R7 standardized copy.
- Keep explicit artifact-state language (“No file downloaded”). - Ensure audit event visibility after export attempt.
DOM acceptance checks: - DOM-AC-01: Export works from WO header path.
- DOM-AC-02: Forced failure state gives clear next action. - DOM-AC-03: Audit trail reflects export action with actor/time.
- DOM-AC-04: Same behavior from record-detail export path. [FINN] DOM flow needs certainty language, not marketing language.

### 3.2 IA critical journey (Dale/Pat)
Journey steps: 1) Open IA-required sign surface.
2) Review IA identity block. 3) Re-authenticate and sign.
4) Handle duplicate or expired-auth conditions cleanly. 5) Confirm signed record snapshot fields.
Primary friction to remove: - Duplicate recovery context.
- Predictable auth-expired recovery on tablet. Planned interventions:
- Deliver R3 payload/UI enrichment. - Harden auth-expired copy and re-entry affordance.
- Preserve strict null-IA hard-stop behavior. IA acceptance checks:
- IA-AC-01: Missing IA blocks before PIN entry. - IA-AC-02: Duplicate block includes signer + cert + timestamp.
- IA-AC-03: Auth-expired recovery returns user to same sign context. - IA-AC-04: Record snapshot preserves IA as separate field.
[NADIA] IA path is release-critical; copy changes require QA sign-off.

### 3.3 QCM critical journey (Renata/Linda)
Journey steps: 1) Open pending QCM queue.
2) Start review modal. 3) Acknowledge checklist and add notes.
4) Submit review. 5) Confirm queue convergence and audit event.
Primary friction to remove: - Regression risk in live convergence behavior.
- Small-viewport modal usability constraints. Planned interventions:
- Institutionalize R8 gate test. - Verify modal controls with mobile keyboard active.
- Preserve visible note counter and acknowledgment clarity. QCM acceptance checks:
- QCM-AC-01: Pending item exits without manual refresh. - QCM-AC-02: Reviewed panel updates <=2 seconds.
- QCM-AC-03: Modal controls remain accessible on narrow viewport. - QCM-AC-04: Audit event exists with correct actor/timestamp.
[FINN] QCM trust is state freshness; no refresh rituals allowed.

### 3.4 Lead A&P critical journey (Troy)
Journey steps: 1) Enter work and time values.
2) Resolve validation blocks quickly. 3) Complete sign-related actions.
4) Handoff to IA/QCM without ambiguity. Primary friction to remove:
- Under-prescriptive TT mismatch and guard copy. Planned interventions:
- Execute R5 data-rich copy changes. - Add immediate corrective cues in all relevant guards.
- Ensure value-level visibility where payload supports it. Lead A&P acceptance checks:
- AP-AC-01: TT mismatch shows submitted vs recorded values. - AP-AC-02: User corrects issue in single retry path.
- AP-AC-03: No repeated invalid retry loops in replay. [NADIA] Throughput depends on this path; prioritize by Week 2.

## 4) iPad/mobile confidence checks for high-stakes flows
### 4.1 Device matrix
Required devices/viewports: - iPad portrait.
- iPad landscape. - Mobile narrow viewport (Android-class width).
Test assumptions: - Keyboard-open states included.
- Touch-only interaction basis. - No desktop-only hover dependencies.

### 4.2 High-stakes flow checklist
Flow M1: PreSignatureSummary full review state. Flow M2: IA null-identity hard-stop state.
Flow M3: Auth-expired recovery state. Flow M4: QCM review modal completion state.
Flow M5: Export success and forced-failure states.

### 4.3 Flow-specific mobile acceptance checks
M1 checks: - M1-AC-01: All five section headers reachable in sequence.
- M1-AC-02: Sticky footer visible during long content scroll. - M1-AC-03: Primary action targets meet tap-size and are not clipped.
M2 checks: - M2-AC-01: Hard-stop message fully visible without horizontal scroll.
- M2-AC-02: No hidden continuation control exists. - M2-AC-03: Remediation CTA remains tappable with keyboard present.
M3 checks: - M3-AC-01: Expiry message states cause and next step.
- M3-AC-02: Re-auth path returns to intended signature context. - M3-AC-03: No data loss in pre-sign input sections.
M4 checks: - M4-AC-01: Acknowledgment checkbox visible and usable.
- M4-AC-02: Notes field and counter remain visible with keyboard open. - M4-AC-03: Submit button not obstructed in narrow viewport.
M5 checks: - M5-AC-01: WO-header export action visible and tappable.
- M5-AC-02: Record-detail export action parity confirmed. - M5-AC-03: Forced failure copy and retry controls are visible.

### 4.4 Required capture outputs
Capture naming baseline: - `CAP-M1-PORTRAIT-FE{hash}-BE{hash}.png`
- `CAP-M1-LANDSCAPE-FE{hash}-BE{hash}.png` - `CAP-M2-NULL-IA-FE{hash}-BE{hash}.png`
- `CAP-M3-AUTH-EXPIRED-FE{hash}-BE{hash}.png` - `CAP-M4-QCM-MODAL-FE{hash}-BE{hash}.png`
- `CAP-M5-EXPORT-FAIL-FE{hash}-BE{hash}.png` Bundle rules:
- Every capture linked in evidence index. - Missing capture = release packet incomplete.
- Incomplete packet = automatic Amber minimum, possible Red. [FINN] If a critical action is blocked by keyboard overlap, treat as fail.
[NADIA] No waivers for missing mobile captures under schedule pressure.

## 5) Copy and error-message hardening for regulatory clarity
### 5.1 Copy standards
Standard S1: State exact failure condition. Standard S2: Provide deterministic corrective action.
Standard S3: Never imply durable success if mutation/artifact failed. Standard S4: Preserve legal phrasing where compliance-relevant.
Standard S5: Keep tone procedural and calm.

### 5.2 Priority copy set
Copy item C1 — TT mismatch (`INV-18`). Current issue: too generic for fast recovery.
Target copy: “Aircraft total time mismatch. Submitted: {submitted}. Recorded at open: {recorded}. Update value to continue.”
Acceptance: - Includes both numbers.
- Includes immediate corrective direction.

Copy item C2 — Duplicate counter-sign. Current issue: missing actor/timestamp context.
Target copy: “Counter-sign already completed by {name} ({cert}) at {timestamp}. Open existing sign-off.”
Acceptance: - Includes signer identity and time.
- Includes navigation action.

Copy item C3 — Export failure. Current issue: inconsistent wording and implied success risk.
Target copy: “Export failed. No file was downloaded. Retry now or contact support with Trace ID {id}.”
Acceptance: - Explicit no-file statement.
- Retry guidance present. - Trace reference present.

Copy item C4 — Auth expired. Current issue: interruption can appear arbitrary.
Target copy: “Authentication expired before signature completion. Re-authenticate to continue this signature.”
Acceptance: - Cause and next step clear.
- No ambiguity about signature scope.

Copy item C5 — Null IA hard-stop. Current issue: must remain unambiguous at all times.
Target copy: “Inspection Authorization number is not on file. IA-required signatures are blocked until this record is updated.”
Acceptance: - Block condition explicit.
- Remediation requirement explicit.

Copy item C6 — Non-issuable inventory label. Current issue: “available” context confusion.
Target copy: “Non-issuable inventory (quarantine/pending inspection). Not available for installation.”
Acceptance: - Removes installability ambiguity.

### 5.3 Review and lock process
Step 1: Draft by frontend with UX edits. Step 2: Regulatory review for legal-sensitive wording.
Step 3: QA screenshot verification. Step 4: PM copy lock.
Step 5: No post-lock edits without QA+PM approval. [FINN] Message tone should reduce panic, not intensify it.
[NADIA] Copy lock is now a release gate input.

## 6) Burn-down schedule with owners and stoplight status
### 6.1 Phase 7 timeline
Week 1 objective: - Close governance and evidence-control risks (R1, R2, R8).
Week 2 objective: - Close journey friction and copy/device hardening (R3, R4, R5, R6, R7).
Week 3 objective: - Run full rehearsal and packet audit with no hand-holding.

### 6.2 Work packages
WP1: Evidence checklist + index scaffolding. Owner: Chloe.
Support: Cilla, Jonas. Start: W1D1.
Target finish: W1D3. Mapped risks: R1.
Status: Amber. Exit signal: 6/6 artifact dry run complete.

WP2: Build parity manifest and NO-GO mismatch guard. Owner: Jonas.
Support: Chloe. Start: W1D1.
Target finish: W1D2. Mapped risks: R2.
Status: Amber. Exit signal: FE/BE hashes pinned and verified in gate record.

WP3: Counter-sign duplicate context enrichment. Owner: Chloe.
Support: Devraj, Finn. Start: W1D2.
Target finish: W2D1. Mapped risks: R3.
Status: Amber. Exit signal: duplicate recovery flow passes desktop+tablet replay.

WP4: Inventory default filter semantics correction. Owner: Devraj.
Support: Chloe, Finn. Start: W1D3.
Target finish: W2D2. Mapped risks: R4.
Status: Amber. Exit signal: non-issuable excluded from default available query.

WP5: TT and validation copy hardening. Owner: Chloe.
Support: Finn. Start: W2D1.
Target finish: W2D2. Mapped risks: R5.
Status: Amber. Exit signal: value-level copy verified in smoke replay.

WP6: iPad/mobile capture script and receipt discipline. Owner: Chloe.
Support: Finn, Cilla. Start: W1D2.
Target finish: W2D1. Mapped risks: R6.
Status: Amber. Exit signal: full device capture bundle attached and indexed.

WP7: Export failure-state copy parity. Owner: Chloe.
Support: Finn, Devraj. Start: W2D1.
Target finish: W2D2. Mapped risks: R7.
Status: Amber. Exit signal: forced-failure parity pass on both entry points.

WP8: QCM two-session convergence gate lock. Owner: Chloe.
Support: Cilla. Start: W1D2.
Target finish: W1D4. Mapped risks: R8.
Status: Green/Watch. Exit signal: case added to permanent smoke set with latency assertion.

WP9: Final rehearsal + release packet audit. Owner: Nadia.
Support: Chloe, Jonas, Cilla. Start: W3D1.
Target finish: W3D2. Mapped risks: All.
Status: Red->Amber baseline. Exit signal: packet passes independent review without missing artifacts.

### 6.3 Milestone gates
G1 (end Week 1): - WP1, WP2, WP8 complete.
- Required outcome: zero Red in governance stream. G2 (end Week 2):
- WP3 through WP7 complete. - Required outcome: at least five risks moved to Green.
G3 (Week 3 rehearsal): - WP9 complete.
- Required outcome: zero Red overall and R1/R2 both Green. [NADIA] If R1 or R2 is not Green at G3, launch is held.
[FINN] Agree; those are the confidence backbone.

### 6.4 Stoplight management rules
Green criteria: - All mapped acceptance checks pass.
- Evidence attached. - No critical dependency unresolved.
Amber criteria: - Work in progress or partial proof attached.
- No hard release blocker yet. Red criteria:
- Acceptance check failed on critical path. - Missing mandatory artifact.
- FE/BE parity mismatch. - Mobile critical action inaccessible.
Escalation rules: - Red on any P0 risk = immediate PM/release review.
- Red persists >24h = scope tradeoff meeting required. - Two Amber cycles with no movement = owner reset and task split.

### 6.5 Initial risk stoplight snapshot
R1 Evidence packet completeness: Amber. R2 Build parity discipline: Amber.
R3 Counter-sign recovery context: Amber. R4 Inventory semantics: Amber.
R5 TT and validation copy clarity: Amber. R6 iPad/mobile evidence receipts: Amber.
R7 Export failure copy parity: Amber. R8 QCM convergence guard: Green/Watch.

## 7) Execution sequence and ownership notes
Execution order: 1) Lock R1/R2/R8 first.
2) Deliver R3/R4/R5 next. 3) Close R6/R7 with captures and parity checks.
4) Run WP9 rehearsal and packet audit. Reason for this order:
- Prevents “fixed but unprovable” repeats. - Reduces retest noise before final sign-off cycles.
- Maximizes confidence gain per engineering day. Owner alignment:
- Chloe: frontend behaviors, capture discipline, copy implementation. - Devraj: backend payload/filter support.
- Jonas: release manifest and parity enforcement. - Cilla: acceptance verification and evidence completeness checks.
- Finn: UX clarity and friction-readout validation. - Nadia: schedule, stoplight governance, escalation decisions.
[FINN] Prioritizing proof with code is the correct correction from Phase 6. [NADIA] Keep this sequence unless production incident reprioritization is approved.

## 8) Definition of done (Phase 7 UX risk burn-down)
Phase 7 is complete when all conditions below are met. DoD-01: All P0 risks are Green.
DoD-02: At least six of eight total risks are Green with no Red. DoD-03: R1 and R2 remain Green for two consecutive release cycles.
DoD-04: DOM, IA, QCM, and Lead A&P journeys pass replay without facilitator help. DoD-05: Mobile/iPad evidence bundle is complete and hash-stamped.
DoD-06: Critical copy set is locked and screenshot-verified. DoD-07: QCM two-session convergence remains in permanent smoke gate.
DoD-08: Final packet audit passes independent review in Week 3 rehearsal. Non-goals for this phase:
- New workflow expansions outside launch-critical paths. - Offline mode work.
- Customer portal features. Final implementation statement:
Phase 6 proved functional closure is achievable. Phase 7 closes the confidence gap with deterministic proof.
We are not shipping on memory. We are shipping on measured behavior plus attached evidence.
— Chloe [FINN] Endorsed.
[NADIA] Approved for execution.
