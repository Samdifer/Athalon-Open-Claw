# Athelon Phase 6 Alpha — Validation & Retest Report
Author: Priscilla "Cilla" Oduya (QA Lead)
Inline contributors: Marcus Webb (Regulatory), Capt. Rosa Eaton (Ret.)
Date: Thursday retest
Status: FINAL
Decision type: Launch readiness
---
## 0) Read-in confirmation and test posture
I read all required files before writing this report.
I used Phase 5 pilot findings as the defect baseline.
I used Phase 6 deployment gates as closure criteria.
I did not score any blocker as closed without direct retest evidence.
I treated this session as the Thursday decision run, not a demo.
I logged PASS/FAIL/CONDITIONAL strictly.
[Marcus] Confirmed: this document is defensibility-first, not presentation-first.
[Rosa] Confirmed: this reflects field pressure conditions, not quiet-room assumptions.
---
## 1) Retest setup
### 1.1 Scope
Primary scope:
Retest closure of 4 launch blockers from alpha day.
Rerun 5 smoke paths for regression.
Run Marcus simulated inspection for FAA-defensibility call.
Run Rosa field assessment for usability under real pace.
Issue final QA launch verdict.
Out of scope:
Offline mode.
Customer portal.
Deferred v1.1 feature set.
Long-horizon LLP analytics UI.
### 1.2 Environments and deployment baseline
Backend target:
Convex launch candidate environment used in Jonas gate checklist.
Frontend target:
Vercel launch candidate aligned with backend deployment window.
Schema baseline checks:
Required tables present.
`parts.location` includes `pending_inspection`.
`auditLog.eventType` includes `qcm_reviewed`.
Auth/route baseline checks:
JWT org and role claims valid for seeded users.
`/webhooks/clerk/session-reauthenticated` reachable (non-404).
Real re-auth produces `signatureAuthEvent` row in expected window.
Integrity baseline checks:
Signing path returns SHA-256 64-char lowercase hash.
Canonical order verification available for independent recompute.
### 1.3 Seeded personas used in retest
Org:
Hutchins Airframe Service, LLC.
Part 145 cert: H4SR901Y.
Users:
Gary Hutchins (DOM).
Linda Paredes (QCM/supervisor).
Troy Weaver (Lead A&P).
Pat DeLuca (IA).
Certificate expectations:
A&P numbers present on active technicians.
IA number stored separately where applicable.
Pat IA number seeded as distinct value.
No IA fallback to A&P permitted in IA-required sign paths.
### 1.4 Aircraft and equipment seeds
Aircraft:
N1234A.
Cessna 172S.
Serial 172S11345.
Total time seeded from current onboarding reading.
Status airworthy at start.
Equipment:
TW-2847 torque wrench.
Calibration last date populated.
Calibration due date populated.
Calibration current-at-use expected true during retest.
### 1.5 Device matrix and session topology
Session A desktop:
Primary actor for submit actions.
Chrome stable.
Session B desktop:
Observer for realtime convergence checks.
Chrome stable.
Tablet-class device:
Used for shop-floor sign flow checks.
Focus on pre-sign summary and attestation path.
QA observer station:
Used for payload/error verification and cross-checking.
### 1.6 What changed since alpha day
1) PDF export path implemented and reachable from UI.
2) IA cert path hardened with separate `iaCertNumber` handling.
3) SHA canonical order reconciled to documented fixed order.
4) RTS statement guard order corrected.
5) QCM dashboard pending/reviewed transition now live-updating.
6) Webhook and signature auth event creation explicitly gated.
7) Launch gate routine codified as hard stop on red conditions.
8) Pilot seeding made deterministic and documented.
9) Incident communication/runbook language formalized.
10) Evidence discipline improved, but with minor packaging caveats.
### 1.7 Evidence caveat noted up front
Retest conclusions are based on deployed behavior.
Local repository snapshot still shows historical artifacts in some implementation trees.
This is an evidence-packaging and parity tracking concern.
It is not a blocker if tested build hash is frozen and referenced.
[Marcus] Production behavior governs legal defensibility; branch archaeology does not.
[Rosa] Build drift between test and launch is the practical risk to watch.
---
## 2) Closure verification of the 4 launch blockers
### 2.1 Closure scoreboard
Blocker 1: PDF export missing path (GO-LIVE-11) — PASS.
Blocker 2: IA certificate separation (`iaCertNumber`) — PASS.
Blocker 3: SHA canonical order mismatch — PASS.
Blocker 4: QCM dashboard stale until refresh — PASS.
Hard blocker failures remaining at end of retest: 0.
### 2.2 Blocker 1 — PDF export
Status: PASS.
Retest flow:
Created controlled test work order.
Created/selected signed maintenance record.
Triggered export from work-order-level action.
Triggered export from record-detail action.
Downloaded export artifact.
Opened artifact outside app context.
Validated required identity and cert fields.
Validated timestamp and hash visibility.
Validated correction-chain rendering behavior.
Validated QCM state rendering behavior.
Validated `record_exported` audit log write.
Evidence notes:
Export action now discoverable without workaround.
Document contains repair station identity block.
Document contains aircraft identity block.
Document contains work-order identity block.
Document contains full work-performed text.
Document contains signer legal identity and cert values.
Document contains full 64-char hash.
Document contains audit timeline section.
Export metadata stamp present.
Audit log entry `record_exported` present with actor/time.
Negative-path note:
When forced failure path was triggered, UI provided explicit failure message.
No false success toast observed.
User context remained stable.
Residual caveat:
Artifact screenshots were not fully bundled in this file set.
Functionality passed; packaging should still be tightened.
[Marcus] This closes the exact legal failure from pilot day.
[Rosa] This answers Carla’s "screens turn off" objection directly.
### 2.3 Blocker 2 — IA cert number separation
Status: PASS.
Retest flow:
Entered IA-required sign flow with Pat persona.
Checked pre-sign identity block.
Verified A&P value and IA value are distinct.
Ran negative test with missing IA value in IA-required flow.
Ran positive test with IA value present.
Checked signed-record snapshots for IA field retention.
Evidence notes:
A&P and IA values displayed separately.
Missing IA blocked continuation before PIN stage.
No bypass path observed.
No fallback mapping from A&P to IA observed.
Inspection record snapshot includes IA-specific field.
Regression against alpha:
No conflated cert identity behavior observed.
Residual caveat:
Admin data quality still matters.
System now enforces missing-IA hard stop in IA-required signatures.
[Marcus] This materially strengthens signer-authority defensibility.
[Rosa] Field users notice this instantly; this pass matters more than UI polish.
### 2.4 Blocker 3 — SHA canonical order
Status: PASS.
Retest flow:
Signed controlled record.
Independent recompute performed with documented 14-field order.
Compared recompute output to stored hash.
Reviewed position-sensitive ordering against docs.
Confirmed no extra inserted field in canonical sequence.
Evidence notes:
Stored hash format valid.
Independent recompute matched stored hash.
Doc/impl order alignment confirmed in retest evidence.
No need for internal function guesswork to verify.
Regression against alpha:
Alpha issue was spec/implementation drift.
Retest shows aligned order and reproducible verification.
Residual caveat:
Keep legacy migration metadata queryable for historical chain-of-custody narratives.
[Marcus] Independent verification claim is now supportable.
[Rosa] Not floor-visible, but critical for trust when records are challenged.
### 2.5 Blocker 4 — QCM dashboard live update
Status: PASS.
Retest flow:
Opened two concurrent QCM sessions.
Session A submitted QCM review.
Session B observed pending/reviewed lists without manual refresh.
Repeated with second item to rule out one-off behavior.
Evidence notes:
Pending list removed reviewed item without refresh.
Reviewed list received item in near realtime.
`qcm_reviewed` audit event written correctly.
Convergence met gate expectation.
Regression against alpha:
Alpha required refresh.
Retest did not require refresh.
Residual caveat:
Keep two-session convergence check in permanent release smoke.
[Marcus] Operational consistency supports compliance process reliability.
[Rosa] This removes a real floor coordination pain point.
---
## 3) Five smoke paths rerun
### 3.1 Smoke rerun scoreboard
Smoke-01 Sign-In + Org Switch — PASS.
Smoke-02 Create/Open Work Order — PASS.
Smoke-03 Task Card + Dual Sign-Off — CONDITIONAL PASS.
Smoke-04 Parts Receive + Install — CONDITIONAL PASS.
Smoke-05 RTS Sign-Off Preconditions — PASS.
Overall rerun posture:
No smoke FAIL.
Two conditionals are non-blocking but actionable.
### 3.2 Smoke-01 details
Result: PASS.
Observations:
JWT role/org claims resolved correctly for seeded users.
Cross-org mutation attempts rejected.
Unauthenticated path rejected.
No stale context after org switch.
No auth-loop regressions observed.
Regression check references:
Aligned with prior Smoke-01 expectations.
No new defects introduced by Phase 6 changes.
[Marcus] Access boundary remains clean.
[Rosa] Login path remained practical for first-contact users.
### 3.3 Smoke-02 details
Result: PASS.
Observations:
WO create succeeded with valid inputs.
Duplicate WO number correctly rejected.
TT regression guard blocked invalid open value.
Valid open transition succeeded.
Audit writes present for create/open events.
Regression check references:
INV-18 monotonic TT enforcement still intact.
No regression in state transition guards.
Minor note:
One user-facing TT mismatch message still less explicit than ideal.
Payload supports better guidance; UI wording still can improve.
Not blocker.
[Rosa] Message clarity still affects speed under pressure.
[Marcus] Correctness is intact; recovery guidance can be strengthened.
### 3.4 Smoke-03 details
Result: CONDITIONAL PASS.
Observations:
Task card creation stable.
IA-required step enforcement stable.
Interruption open/close behavior stable.
Close blocked while interruption open.
Counter-sign duplicate prevented.
Card reached terminal signed path.
Auth events consumed once as expected.
Regression check references:
No duplicate counter-sign insertion regression.
No IA gate bypass regression.
Conditional reason:
Duplicate counter-sign UI recovery context remains thin in one surface.
Error correctness is good.
Immediate operator guidance (who signed/when) is still uneven.
Risk call:
Low integrity risk.
Low-moderate usability friction risk.
[Rosa] In shift conditions, context-rich duplicate messages reduce wasted cycles.
[Marcus] Integrity preserved; UX follow-up is still justified.
### 3.5 Smoke-04 details
Result: CONDITIONAL PASS.
Observations:
Quantity cap enforcement passed.
LLP override remained hard-blocked.
No-documentation part routed to quarantine/pending path.
Shelf-life-expired part blocked from install.
Traceability chain reported complete on compliant path.
Regression check references:
Backend protections stayed intact.
No mutation-level compliance bypass observed.
Conditional reason:
Certain inventory filter contexts can still display non-issuable states in ways that invite failed attempts.
Backend blocks issue correctly.
UI semantics should be tightened to reduce operator confusion.
Risk call:
Low direct integrity risk.
Moderate workflow friction/compliance-signaling risk.
[Marcus] Backend is doing the right thing; UI defaults should still bias conservative issuance behavior.
[Rosa] If users see it under "available," they'll click it.
### 3.6 Smoke-05 details
Result: PASS.
Observations:
AD overdue precondition blocked.
Too-short RTS statement check now fires first.
No-citation check now fires second when length passes.
No-determination check remains separate third guard.
Form 337 missing/whitespace guards enforced.
Expired IA blocked.
Consumed auth blocked.
Expired auth blocked.
Success path created RTS record and hash.
Close-hours mismatch guard blocked mismatch.
Matching close-hours path succeeded.
Regression check references:
Prior guard-order defect resolved.
No regression in auth-event checks.
Evidence notes:
Hash recompute aligned with stored value.
Audit close event present.
[Marcus] This is now aligned with spec and legal interpretation.
[Rosa] This flow feels strict in the right way.
---
## 4) Marcus simulated inspection
### 4.1 Method
Marcus ran a paper-first/record-first simulation.
He requested export artifacts and record package before interactive UI review.
He checked identity, authority, timeline, integrity, correction visibility, and audit continuity.
He avoided relying on developer explanations for interpretation.
### 4.2 Findings: FAA-defensible status
Finding A:
Records are now portable outside the app via export path.
This resolves the previous legal insufficiency.
Finding B:
§43.9 material fields are present in export package.
Work performed, approved data references, signer identity, and timestamps are readable.
Finding C:
IA identity is separated and represented where required.
Finding D:
Tamper-evidence is visible and reproducible with independent recompute.
Finding E:
Correction model remains additive and preserves original entries.
Finding F:
Audit chronology is coherent and intelligible in printed/exported context.
### 4.3 Remaining caveats (non-blocking)
Caveat 1:
Evidence packet assembly should be stricter (attach captures with build hash tags).
Caveat 2:
Some UX messages can better expose remediation values/context.
Caveat 3:
Legacy pre-fix hash migration metadata should remain easy to retrieve for historical explanation.
### 4.4 Marcus conclusion
Conclusion:
For Thursday scope, records are now FAA-defensible.
No remaining hard regulatory blocker identified.
[Marcus] Prior NO-GO basis (export absence + order mismatch concern) is now resolved.
---
## 5) Rosa field assessment
### 5.1 Method
Rosa evaluated under interruption-prone workflow assumptions.
She focused on speed to comprehension, recovery from common mistakes, and trust signals.
She weighted practical usability over cosmetic completeness.
### 5.2 What works now under pressure
1) Signing flow still feels deliberate and commitment-based.
2) IA identity block is understandable and confidence-building.
3) QCM dashboard now converges live without refresh rituals.
4) Export availability removes major operational anxiety.
5) Tablet sign path remains workable for floor usage.
### 5.3 Remaining friction
1) A few error messages are accurate but not immediately prescriptive.
2) Inventory filtering semantics can still provoke avoidable attempts.
3) Proof artifacts should be packaged consistently, not assumed.
### 5.4 Rosa conclusion
Conclusion:
System is usable under shop-floor pressure for Thursday session.
Remaining issues are operational polish, not launch blockers.
[Rosa] I support launch with conditions and fast follow-through on the two usability items.
---
## 6) Cilla final verdict
### 6.1 Decision
QA verdict: GO WITH CONDITIONS.
Why:
All 4 prior launch blockers retested PASS.
No smoke path failed.
Regulatory inspection simulation supports defensibility.
Field assessment supports practical usage.
Open items are non-blocking and clearly scoped.
### 6.2 Hard blocker check
PDF export missing path — closed.
IA cert separation missing — closed.
SHA canonical order mismatch unresolved — closed.
QCM realtime stale-state unresolved — closed.
Hard blocker count at decision time: 0.
### 6.3 Conditions attached to GO
Condition 1:
Freeze launch build hash and reference it in session notes.
No untracked deploy drift before session.
Condition 2:
Attach minimum evidence pack before go-live window:
Export success capture.
Export failure-state capture.
QCM two-session convergence capture.
Hash recompute parity receipt.
Tablet pre-sign section visibility capture.
Condition 3:
Open immediate post-launch tickets for:
Counter-sign duplicate recovery context.
Inventory non-issuable filter semantics.
TT mismatch message specificity.
Condition 4:
Maintain 06:00 gate policy.
Any red gate flips decision to NO-GO automatically.
### 6.4 Carry-forward items (non-blocking)
Carry A:
Error-message remediation context enrichment.
Carry B:
Inventory filter conservative default behavior.
Carry C:
Evidence packet automation/discipline.
Carry D:
Canonical-order verifier regression check retained permanently.
### 6.5 Sign-off language
This is not a perfection claim.
This is a controlled launch-readiness claim with explicit safeguards.
If conditions are ignored, this verdict does not stand.
Signed:
Cilla Oduya, QA Lead.
[Marcus] Concur: GO WITH CONDITIONS.
[Rosa] Concur: GO WITH CONDITIONS.
---
## 7) Timestamped retest trace (condensed)
05:15 UTC — operator online and dashboards active.
05:20 UTC — environment pulse and schema checks complete.
05:30 UTC — gates 01–04 run.
05:40 UTC — hash parity gate run.
05:45 UTC — export gate run.
05:50 UTC — realtime convergence gate run.
05:55 UTC — audit/org isolation/readiness gates run.
06:00 UTC — provisional GO conditions drafted.
06:10 UTC — blocker closure retests completed.
06:35 UTC — Smoke-01 rerun PASS.
06:55 UTC — Smoke-02 rerun PASS.
07:25 UTC — Smoke-03 rerun CONDITIONAL PASS.
07:55 UTC — Smoke-04 rerun CONDITIONAL PASS.
08:25 UTC — Smoke-05 rerun PASS.
08:50 UTC — Marcus simulated inspection complete.
09:20 UTC — Rosa field assessment complete.
09:45 UTC — final QA verdict locked.
---
## 8) Launch risk register (post-verdict)
R1: Build drift risk.
Impact: high.
Mitigation: hash lock + no unreviewed deploy.
Owner: Jonas.
R2: Message clarity friction.
Impact: medium.
Mitigation: quick reference + post-launch copy fixes.
Owner: Chloe.
R3: Inventory filter semantics confusion.
Impact: medium.
Mitigation: supervisor briefing + priority UI patch.
Owner: Devraj/Chloe.
R4: Evidence packet incompleteness.
Impact: medium.
Mitigation: checklist-driven capture bundle.
Owner: Cilla/Jonas.
R5: Incident comms inconsistency.
Impact: medium.
Mitigation: runbook script use at 0/10/resolution intervals.
Owner: Jonas.
---
## 9) Final summary for Thursday decision
Retest setup was production-like with seeded pilot personas.
All four launch blockers from alpha day closed as PASS.
Five smoke paths reran with 3 PASS and 2 CONDITIONAL PASS.
Marcus now assesses records as FAA-defensible for Thursday scope.
Rosa now assesses workflow as practical under floor pressure.
Cilla issues GO WITH CONDITIONS, with zero hard blockers and explicit guardrails.
This is a disciplined go-forward call.
Not launch-by-hope.
Not launch-without-evidence.
Launch-with-controls.
