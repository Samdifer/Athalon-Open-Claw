# WS15-I — Pre-Close Automated Checklist
Workstream: WS15-I
Phase: 15
Owners: Devraj Anand (Backend), Chloe Park (Frontend), Danny Osei (SME)
Date: 2026-02-22
Status: Design package complete

## 0. Purpose
WS15-I defines a deterministic pre-close checklist gate before a work order can move to billing/close.
The design uses evidence-first, fail-closed behavior aligned with WS15-A (export integrity), WS15-B (IA re-auth), and WS13-D (policy->gate->artifact discipline).
This document provides SME brief, rules engine, severity model, UI/UX flow, audit explainability, and test skeleton with acceptance criteria.

## 1) SME Brief (Danny Osei)
Danny operates as work order coordinator and de facto pre-close reviewer.
He currently performs manual validation across multiple sources under heavy call volume and context switching.
The manual flow works but is too slow and too brittle for consistent close quality.

### 1.1 What Danny validates today
- Required task cards complete.
- Required signatures present.
- Discrepancies resolved/dispositioned.
- Customer authorizations captured for add-on work.
- Parts traceability fields present where required.
- RTS evidence complete where applicable.

### 1.2 Operational pain points
- Validation requires multiple screen hops and ad-hoc note cross-checking.
- Same defects recur because checks are human-memory dependent.
- Missing authorization or cert metadata is often discovered late.
- Close quality depends on who performed review and how rushed they were.

### 1.3 SME requirement in one line
“Automate my pre-close review and tell me exactly what blocks close versus what is advisory.”

### 1.4 SME-to-product translation
Danny’s needs translate to these constraints:
- Single action to evaluate all close-critical checks.
- Deterministic results with explicit remediation guidance.
- Hard blocks for legal/safety/attestation defects.
- Advisory warnings for non-blocking quality concerns.
- Durable evidence trail for each run.

### 1.5 Why this is phase-critical
Without WS15-I, teams can still complete work, but close quality is inconsistent and auditability is reactive.
WS15-I turns manual review into a repeatable, explainable gate.

## 2) Checklist Rules Engine and Data Dependencies

### 2.1 Engine name and contract
Action: `evaluatePreCloseChecklist`
Inputs: `workOrderId`, optional `strictMode=true`, caller auth context.
Output: `runId`, `evaluatedAt`, `snapshotToken`, `ruleResults[]`, `blockingFindings[]`, `advisoryFindings[]`, `summary`, `verdict`, `closeAllowed`.

### 2.2 Determinism guarantees
Determinism is required for audit trust.
Given the same snapshot token and rule catalog version, outputs must be byte-stable (including ordering) and hashable.
Any non-deterministic branch is a defect.

### 2.3 Snapshot model
1) Capture snapshot envelope (row versions + timestamp boundary).
2) Resolve all dependencies against that envelope.
3) Evaluate rules.
4) Return snapshotToken with results.
5) Require same token at close submit.

If submit sees drift, return `PRECLOSE_SNAPSHOT_STALE` and block close.

### 2.4 Required data dependencies
Minimum datasets:
- work order header/state
- task cards and step statuses
- signature events and signer identity/cert fields
- discrepancies and dispositions
- customer authorization events
- parts install/remove + traceability references
- maintenance record content fields
- RTS events and IA-specific references
- audit log timeline
- org policy profile

### 2.5 Rule object schema
Each rule includes:
- `ruleId`
- `name`
- `severity` (BLOCKING|ADVISORY)
- `category`
- `predicate`
- `evidenceCollector`
- `messageTemplate`
- `resolutionTemplate`
- `regulatoryReference[]` (required for compliance-critical rules)

### 2.6 Category model
A: Task execution integrity
B: Discrepancy and authorization integrity
C: Parts and traceability integrity
D: Maintenance record completeness
E: RTS/IA integrity
F: Audit/chain-of-custody integrity

### 2.7 Initial rule catalog (v1)
A-01 Required task cards complete.
A-02 Required steps signed.
A-03 Signature timestamps present for required signatures.
A-04 Corrections preserve original->corrected chain.
B-01 No unresolved discrepancy at close point.
B-02 Required owner/customer authorization exists.
B-03 Authorization has actor identity + timestamp.
B-04 Verbal authorization without required follow-up handling.
C-01 Required P/N exists.
C-02 Required S/N exists.
C-03 Traceability doc/ref exists where required.
C-04 Parts ledger reconciles for the WO.
D-01 Work-performed content exists.
D-02 Approved-data reference complete (structured fields).
D-03 Completion date exists.
D-04 Required signer cert number exists.
D-05 IA cert number exists where IA path used.
E-01 RTS exists when work type requires RTS.
E-02 RTS links to valid signature-auth consume event.
E-03 IA sign path links to successful re-auth evidence.
E-04 Re-auth evidence is within allowed freshness window.
F-01 Minimum lifecycle audit chain exists.
F-02 No unresolved integrity exception flags.
F-03 Pre-close run persisted with canonical result hash.

### 2.8 Evaluation order
- Stage 1: Existence/identity preconditions.
- Stage 2: Execution completeness.
- Stage 3: Compliance-content checks.
- Stage 4: Traceability/audit checks.
Engine should continue after failures to provide full remediation view unless a core dataset is unavailable.

### 2.9 Fail-closed conditions
Immediate FAIL and close block when:
- required dataset unavailable,
- snapshot token invalid,
- rule evaluation throws,
- severity invalid,
- run persistence/audit write fails,
- timeout occurs.
No silent downgrade to advisory.

### 2.10 Performance SLOs
p50 <= 900ms, p95 <= 2500ms, hard timeout 7000ms.
On timeout, verdict FAIL with code `PRECLOSE_ENGINE_TIMEOUT`.

## 3) Blocking vs Advisory Checks

### 3.1 Severity semantics
BLOCKING = close denied until fix + rerun.
ADVISORY = close allowed, warning recorded.

### 3.2 Blocking list (initial)
BC-01 Required task card incomplete.
BC-02 Required signature missing.
BC-03 Required cert field missing.
BC-04 IA cert missing where IA-required.
BC-05 Unresolved discrepancy.
BC-06 Mandatory authorization missing.
BC-07 Required parts traceability field missing.
BC-08 RTS required but absent.
BC-09 IA re-auth proof missing/expired.
BC-10 Snapshot stale at submit.
BC-11 Audit write failed for checklist/close decision.
BC-12 Engine error/timeout.

### 3.3 Advisory list (initial)
AC-01 QCM review not yet recorded.
AC-02 Narrative near readability risk threshold.
AC-03 Optional metadata incomplete.
AC-04 Non-mandatory written follow-up pending after verbal auth.
AC-05 Export not yet generated for this WO.
AC-06 Minor operational annotation missing.

### 3.4 Severity assignment policy
Assign BLOCKING if defect could violate regulatory minimum content, invalidate attestation chain, or materially compromise release/billing validity.
Assign ADVISORY for process quality and communication improvements that are not close-legal prerequisites.

### 3.5 Policy overrides
Organization policy may elevate specific advisory rules to blocking.
Each finding records `severitySource = SYSTEM_DEFAULT | ORG_POLICY_OVERRIDE`.

### 3.6 Finding payload contract
Every finding must emit:
- `findingId`
- `ruleId`
- `severity`
- `title`
- `reason`
- `evidencePointers[]`
- `ownerRole`
- `fixAction`
- `targetRoute`
- `regReference[]` when applicable

## 4) UI/UX Flow for Pre-Close Review (Chloe Park)

### 4.1 Entry paths
Manual path: WO detail -> Run Pre-Close Checklist.
Guard path: Move to Billing / Close triggers auto-run if no fresh run exists.

### 4.2 Core screens
1) Summary/Verdict header
2) Findings list
3) Evidence drawer
4) Close panel (stateful CTA)

### 4.3 Header fields
WO #, tail #, runId, snapshot timestamp, catalog version, verdict badge, freshness status.

### 4.4 Verdict rendering
PASS: green badge, close CTA enabled.
CONDITIONAL: amber badge, close CTA enabled, advisory strip visible.
FAIL: red badge, close CTA disabled, blocker count prominent.

### 4.5 Findings UX behavior
Sort blockers first, advisories second.
Each row: severity chip, concise title, reason preview, View Evidence, Fix Now, optional Assign.

### 4.6 Evidence drawer contents
- rule definition
- predicate outcome summary
- linked records and IDs
- actor/timestamp context
- regulatory note (if exists)
- suggested remediation

### 4.7 Remediation deep links
Missing signature -> step sign-off target.
Missing cert metadata -> user/admin cert profile target.
Missing authorization -> discrepancy authorization target.
Missing parts fields -> parts line editor target.
After fix, user reruns checklist and sees delta summary.

### 4.8 Delta summary behavior
Show prior vs current counts:
- blockers resolved
- blockers remaining
- advisories new/cleared
This supports quick coordinator handoff and DOM review.

### 4.9 Collaboration affordances (recommended)
- assign finding owner
- add concise comments
- mark “in progress” to reduce duplicate edits

### 4.10 Accessibility requirements
No color-only semantics; icon+text severity labels; keyboard navigation; readable contrast; focus order preserved in drawer and action buttons.

### 4.11 Error and empty states
Engine run failure: explicit error code + retry + copy diagnostics.
No findings: explicit “all required checks passed” state + close CTA.

### 4.12 UX copy principle
Use operational language.
Example good: “Missing IA authorization number for RTS signer.”
Example bad: “Rule E-03 null relation failure.”

## 5) Audit Log Strategy and Explainability

### 5.1 Event taxonomy
- `preclose_check_started`
- `preclose_check_completed`
- `preclose_rule_failed`
- `preclose_rule_warned`
- `preclose_close_blocked`
- `preclose_close_allowed`
Future optional: `preclose_override_attempted`.

### 5.2 Completion event schema
`preclose_check_completed` stores:
runId, workOrderId, snapshotToken, ruleCatalogVersion, blockerCount, advisoryCount, verdict, resultHash, evaluatedBy, evaluatedAt.

### 5.3 Per-rule event schema
Each failed/warned rule event stores:
runId, ruleId, severity, reason, evidencePointers, resolutionHint.

### 5.4 Atomic close-link requirement
Close decision must reference a fresh runId.
If run is stale or missing, close denied.
If close-decision audit write fails, close denied.

### 5.5 Explainability tiers
Tier 1 Operator: plain-language reason.
Tier 2 Supervisor/QA: exact rule, fields, and linked records.
Tier 3 Compliance: hash-anchored run artifact plus event pointers.

### 5.6 Canonical hashing
Checklist result is canonicalized and SHA-256 hashed.
Hash persisted as `resultHash`.
Used to prove integrity of findings shown at decision time.

### 5.7 WS15-A linkage
When export is generated, system may attach latest pre-close run pointer/hash for stronger chain-of-custody narrative.
This should be version-gated by WS15-A artifact model finalization.

### 5.8 WS15-B linkage
IA-related rules must include re-auth evidence pointers (or explicit missing state), linking RTS->signature-auth->re-auth artifacts.

### 5.9 Retention and indexing
Retention aligned to maintenance record horizon.
Index by workOrderId, runId, verdict, evaluatedAt, blockerCount.

### 5.10 Immutability rule
Completed pre-close runs are immutable.
Corrections are represented by subsequent runs, never edit-in-place.

## 6) Test Plan Skeleton and Acceptance Criteria

### 6.1 Test layers
L1 Unit rule tests.
L2 Integration tests for joins/snapshot.
L3 UI/E2E behavior tests.
L4 Audit/hash/compliance trace tests.

### 6.2 Skeleton scenarios
T-ENG-01 Happy path dataset => PASS.
T-ENG-02 Missing required signature => FAIL BC-02.
T-ENG-03 Missing IA cert on IA-required case => FAIL BC-04.
T-ENG-04 Unresolved discrepancy => FAIL BC-05.
T-ENG-05 Advisories only => CONDITIONAL.
T-ENG-06 Rule evaluation exception => FAIL fail-closed.

T-SNP-01 Drift after run before submit => stale snapshot block.
T-SNP-02 Concurrent runs same WO => unique runIds, deterministic per snapshot.
T-SNP-03 Post-remediation rerun => blocker reduction reflected.

T-AUD-01 Completion event exists for successful run.
T-AUD-02 Per-rule events exist for findings.
T-AUD-03 Audit write failure blocks close.
T-AUD-04 Stored resultHash recomputes cleanly.

T-UI-01 FAIL disables close CTA.
T-UI-02 CONDITIONAL enables close CTA + advisory panel.
T-UI-03 Evidence drawer shows linked records and rationale.
T-UI-04 Fix Now deep links route correctly.
T-UI-05 Accessibility baseline passes.

T-DEP-01 Missing IA re-auth pointer where required => blocker.
T-DEP-02 Pre-close context retrievable for export-link feature.
T-DEP-03 Missing required parts traceability => blocker.

### 6.3 Acceptance criteria
ACPT-01 All blocker-rule unit tests pass.
ACPT-02 No false PASS in seeded-defect suites.
ACPT-03 p95 runtime <= 2500ms in staging-like data.
ACPT-04 Close blocked whenever blockers > 0.
ACPT-05 Each run has immutable hash-backed audit event.
ACPT-06 Remediation route coverage >= 95% for blocker types.
ACPT-07 Danny UAT demonstrates >= 50% review-time reduction.
ACPT-08 Marcus signs off explainability adequacy.
ACPT-09 Cilla signs off negative paths and concurrency coverage.

### 6.4 UAT skeleton (Danny)
Step 1: Open WO seeded with missing authorization => expected blocker appears.
Step 2: Add authorization => blocker clears on rerun.
Step 3: Remove IA cert in IA-required case => IA blocker appears.
Step 4: Restore IA path + valid re-auth pointer => IA blocker clears.
Step 5: Leave advisories only => close allowed, verdict CONDITIONAL.
Step 6: Trigger export path (if enabled) => pre-close linkage visible.

### 6.5 Non-functional acceptance
- observability dashboard for latency/error rate,
- rule catalog version docs,
- feature-flag rollback plan for enforcement rollout.

## 7) Delivery Plan by Owner

### 7.1 Devraj Anand (Backend)
Deliverables:
- typed rule registry and evaluator
- snapshot tokening and submit precondition
- audit schemas/events + hash utility
- run history query endpoints
Risks:
- expensive joins, stale submit bypass, version drift
Mitigations:
- batched reads, strict close precondition, catalog version pinning

### 7.2 Chloe Park (Frontend)
Deliverables:
- pre-close summary/findings/evidence UI
- verdict-driven CTA state management
- remediation deep-link flow
- rerun/delta UX
Risks:
- severity ambiguity, stale-run confusion, context loss
Mitigations:
- explicit labels, stale banners + rerun CTA, return context preservation

### 7.3 Danny Osei (SME)
Deliverables:
- validate blocker wording and remediation realism
- validate severity boundaries for coordinator workflow
- execute UAT timing benchmark
Guardrail:
- if core remediation path needs more than ~3 clicks to action owner, iterate UX

## 8) Rollout Strategy
Phase 1: Observe-only checklist (no hard block), collect precision feedback.
Phase 2: Partial hard-block activation for highest-risk rules.
Phase 3: Full blocker enforcement with policy overrides as approved.
Success targets: >=60% drop in post-billing defects, >=50% median review-time reduction.

## 9) Open Questions
OQ-01 Final authorization source-of-truth table/contract.
OQ-02 QCM default severity baseline.
OQ-03 Packed vs per-rule audit event storage trade-off.
OQ-04 Final WS15-B re-auth field contract and freshness policy.
OQ-05 WS15-A export appendix scope in v1.
Owners: Devraj/Jonas (data/auth), Chloe (UX), Marcus (compliance severity), Danny (operational fit).

## 10) WS15-I Verdict (PASS / CONDITIONAL / FAIL)

### 10.1 Decision rubric
PASS if design + dependency contracts are fully resolved and integrated tests pass.
CONDITIONAL if WS15-I design is complete but hard adjacent contracts are pending.
FAIL if deterministic rules/severity/audit explainability is not defined.

### 10.2 Current assessment
Design completeness: PASS.
Integration readiness: CONDITIONAL.
Pending dependencies:
- WS15-B final re-auth implementation contract.
- WS15-A final export artifact path decisions.

### 10.3 Final verdict
**WS15-I VERDICT: CONDITIONAL**
Rationale: core design is build-ready, but cross-stream contracts needed for full compliance lock at release.
Build should proceed now on engine/UI/audit scaffolding; IA-dependent and export-link enhancements should be feature-flagged pending WS15-B/WS15-A finalization.

## 11) Immediate Next Actions
1. Devraj: implement evaluator scaffold, snapshot guard, audit hash writes.
2. Chloe: implement pre-close review UI and deep-link remediation flow.
3. Danny: review top blocker copy and usability.
4. Marcus: sign off compliance-critical severity mapping.
5. Jonas: publish IA re-auth contract required by rules E-03/E-04.
6. Team: run seeded-defect E2E demo in staging.

## 12) Definition of Done
WS15-I is done when:
- evaluator deterministically processes v1 catalog,
- close mutation enforces blocker outcomes,
- UI provides explainable findings + remediation routes,
- audit events are immutable and hash-backed,
- QA matrix passes including negative and concurrency cases,
- Danny confirms measurable operational gain,
- Marcus approves compliance linkage.
On completion and dependency closure, status can promote from CONDITIONAL to PASS.

## Appendix A — Rule Table (Compact)
A-01 BLOCKING Task cards complete; A-02 BLOCKING required signatures; A-03 BLOCKING signature timestamps; A-04 BLOCKING correction chain visibility.
B-01 BLOCKING unresolved discrepancies; B-02 BLOCKING missing required authorization; B-03 BLOCKING missing authorization actor/time; B-04 ADVISORY/POLICY verbal-follow-up gap.
C-01 BLOCKING required P/N; C-02 BLOCKING required S/N; C-03 BLOCKING required traceability ref; C-04 BLOCKING parts reconciliation mismatch.
D-01 BLOCKING workPerformed missing; D-02 BLOCKING approved data incomplete; D-03 BLOCKING completion date missing; D-04 BLOCKING required cert missing; D-05 BLOCKING IA cert missing where required.
E-01 BLOCKING RTS required but absent; E-02 BLOCKING RTS-signature linkage missing; E-03 BLOCKING IA re-auth evidence missing; E-04 BLOCKING re-auth stale.
F-01 BLOCKING lifecycle audit chain missing; F-02 BLOCKING unresolved integrity exception; F-03 BLOCKING run hash persistence failure.

## Appendix B — Error Codes (Initial)
PRECLOSE_SNAPSHOT_STALE
PRECLOSE_ENGINE_TIMEOUT
PRECLOSE_DATASET_UNAVAILABLE
PRECLOSE_RULE_EVAL_ERROR
PRECLOSE_SEVERITY_INVALID
PRECLOSE_AUDIT_WRITE_FAILED
PRECLOSE_CLOSE_RUN_MISSING
PRECLOSE_CLOSE_RUN_STALE
PRECLOSE_IA_REAUTH_MISSING
PRECLOSE_IA_REAUTH_EXPIRED
PRECLOSE_REQUIRED_CERT_MISSING
PRECLOSE_REQUIRED_AUTH_MISSING
PRECLOSE_PARTS_TRACEABILITY_MISSING
PRECLOSE_RTS_REQUIRED_MISSING

## Appendix D — Compliance Mapping (High-Level)
§43.9(a)(1): work performed completeness (D-01).
§43.9(a)(2): approved data reference completeness (D-02).
§43.9(a)(3): completion/signature timing integrity (A-03, E-02).
§43.9(a)(4): certificate number presence and separation (D-04, D-05).
AC 120-78B: per-signature authentication and audit trail linkage (E-03, E-04, F-series).
Part 145 operational quality controls: discrepancy/authorization/traceability and auditable close gate (B/C/F series).

## Appendix E — Minimal Data Contract for Result Object
`{ runId, workOrderId, evaluatedAt, snapshotToken, ruleCatalogVersion, summary:{blockers,advisories,totalRules}, verdict, closeAllowed, blockingFindings:[...], advisoryFindings:[...], resultHash }`
All arrays order-stable by `severity desc`, `category`, `ruleId`, `findingId`.
All timestamps UTC epoch ms.
All IDs canonical strings.

## Appendix F — Build Sequence Recommendation
Sprint step 1: backend evaluator + rule catalog + audit schema.
Sprint step 2: frontend summary/findings/evidence/remediation loop.
Sprint step 3: close-gate enforcement behind feature flag.
Sprint step 4: dependency integration (WS15-B re-auth, WS15-A linkage).
Sprint step 5: seeded-defect QA + SME UAT + compliance review.

## Appendix G — Exit Criteria for CONDITIONAL -> PASS
- WS15-B re-auth contract finalized and integrated for E-03/E-04.
- WS15-A export artifact strategy finalized and linked behavior validated.
- Full integrated tests pass including dependency scenarios.
- Marcus compliance sign-off and Danny UAT sign-off recorded.