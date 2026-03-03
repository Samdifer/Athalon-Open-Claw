# Athelon Phase 7 Hardening — Evidence Pack Automation
Author: Priscilla "Cilla" Oduya (QA Lead)
Inline reviewer: Marcus Webb (Regulatory)
Date: 2026-02-22
Status: DRAFT FOR IMPLEMENTATION LOCK
Decision class: Release-control hardening
## 0) Purpose and posture
This document defines the mandatory evidence automation system for Phase 7.
This is not optional process guidance.
This is release-gate control logic.
If evidence is incomplete, release does not proceed.
If evidence is unverifiable, release does not proceed.
If evidence cannot stand alone for inspection replay, release does not proceed.
[Marcus] Evidence must support an inspector without app access or developer narration.
This plan closes Phase 6 governance gaps by converting launch conditions into enforceable evidence automation.
---
## 1) Inputs reviewed before writing this spec
I read Phase 6 gate review.
I read validation and retest final report.
I read PDF export implementation and acceptance criteria.
I read deployment execution runbook and hard-stop gate model.
I aligned this document to those records and owners.
I preserved the same hard-stop tone used by Jonas.
I preserved the same defensibility standards used by Marcus.
I preserved the same operational realism from Rosa observations.
---
## 2) Scope for Phase 7 Evidence Pack Automation
In scope:
Mandatory six-artifact bundle definition.
Automated collection trigger points.
Immutable naming and checksum discipline.
Retention and retrieval requirements.
CFR/AC compliance claim mapping.
CI and release gate hard-stop behavior on missing artifacts.
Inspector replay workflow from bundle only.
QA acceptance tests and regulatory sign-off criteria.
Out of scope:
Rewriting business workflow logic.
Replacing existing audit event schema.
Offline client sync architecture.
Customer-facing portal packaging.
---
## 3) Normative language
MUST means mandatory for GO eligibility.
MUST NOT means prohibited and release-blocking if violated.
SHOULD means strongly expected and tracked as quality debt if missed.
MAY means optional and non-blocking.
All MUST statements below are gate-enforced.
[Marcus] Treat MUST as legal-risk controls, not engineering preference.
---
## 4) Mandatory six-artifact evidence bundle definition
### 4.1 Bundle identity
Each release candidate session produces exactly one evidence bundle.
Bundle scope is one frontend commit plus one backend deployment hash.
Bundle is immutable after seal.
Bundle must contain six artifacts.
Five artifacts is an automatic fail.
Seven artifacts with undefined extras is allowed only if the six mandatory are present and valid.
### 4.2 Artifact A1 — Release Manifest
Artifact code: A1.
Name: Release Manifest.
Purpose: Bind evidence to specific deployed code and environment state.
MUST include:
Frontend commit hash.
Backend deploy hash or deployment identifier.
Build timestamp UTC.
Environment target.
Operator identity.
Gate run window start and end timestamps.
Convex deployment timestamp.
Vercel deployment timestamp.
Schema version identifier.
Webhook endpoint revision marker.
MUST include hash of each other artifact once generated.
MUST be regenerated at seal stage to include final checksum table.
[Marcus] A1 is chain-of-custody root.
### 4.3 Artifact A2 — Gate Execution Transcript
Artifact code: A2.
Name: Gate Execution Transcript.
Purpose: Prove each go/no-go gate was actually executed and passed.
MUST include Gates 01 through 10 outcomes.
MUST include per-gate timestamp.
MUST include pass/fail status.
MUST include operator notes on anomalies.
MUST include command outputs or structured probe receipts for:
Route non-404 check.
Re-auth event creation timing.
Hash parity recompute result.
Export retest result.
Realtime convergence result.
Audit write visibility.
Org isolation denial proof.
Incident readiness reachability proof.
MUST include final GO/NO-GO decision record.
MUST include gate controller signature identity.
### 4.4 Artifact A3 — Integrity Verification Receipt
Artifact code: A3.
Name: Integrity Verification Receipt.
Purpose: Independent proof that canonical hash process is reproducible.
MUST include signed record ID used for verification.
MUST include canonical field order version used.
MUST include field-order list exactly as verified.
MUST include stored hash value.
MUST include independent recompute hash value.
MUST include equality result.
MUST include tool/version used for recompute.
MUST include verifier identity and timestamp.
MUST include legacy-hash migration reference when record predates fix.
[Marcus] Independent recompute proof is central to defensibility claim.
### 4.5 Artifact A4 — Export Evidence Packet
Artifact code: A4.
Name: Export Evidence Packet.
Purpose: Prove GO-LIVE-11 closure remains true in current build.
MUST include successful export sample file.
MUST include forced-failure export state capture.
MUST include `record_exported` audit event reference for success run.
MUST include exported document checksum.
MUST include screen capture proving export control discoverability.
MUST include proof that printed/exported packet contains required identity/signature/hash blocks.
MUST include section-order verification against 9-field export sequence.
MUST include grayscale readability check statement.
### 4.6 Artifact A5 — Realtime and Audit Convergence Receipt
Artifact code: A5.
Name: Realtime and Audit Convergence Receipt.
Purpose: Prove operational consistency without manual refresh dependency.
MUST include two-session QCM convergence evidence.
MUST include Session A action timestamp.
MUST include Session B visible update timestamp.
MUST include measured convergence latency.
MUST include assertion: no manual refresh used.
MUST include `qcm_reviewed` audit event linkage.
MUST include one repeated run to prevent one-off false pass.
SHOULD include p95 latency over three runs.
### 4.7 Artifact A6 — Device and Role Evidence Capture Set
Artifact code: A6.
Name: Device and Role Evidence Capture Set.
Purpose: Prove critical regulated views are visible in realistic operator contexts.
MUST include tablet-class pre-sign summary capture.
MUST include portrait and landscape orientations.
MUST include IA-required flow capture with distinct A&P and IA fields.
MUST include missing-IA hard-stop capture.
MUST include role-scoped export visibility capture.
MUST include actor identities used in captures.
MUST include timestamp overlays or metadata references.
[Marcus] A6 addresses practical audit challenge where inspector asks how signer saw authority context.
### 4.8 Bundle minimality rule
Only six artifact types are mandatory.
Any artifact type rename must update this spec and CI policy in same PR.
Bundle version increments when mandatory fields change.
Initial bundle schema version: `evidencePack.v1`.
---
## 5) Automated generation flow
### 5.1 Trigger points
Trigger T1: CI build for release branch candidate.
Trigger T2: Backend deploy completion to target environment.
Trigger T3: Manual gate-run initiation by release operator.
Trigger T4: Gate run completion.
Trigger T5: GO decision attempt.
Trigger T6: Release tag creation.
The system must generate or update artifacts at each trigger.
No single final-step batch job is allowed as sole mechanism.
[Marcus] Staged generation lowers tampering and omission risk.
### 5.2 Trigger-to-artifact matrix
At T1, initialize A1 skeleton with commit/build metadata.
At T2, append deployment and schema metadata to A1.
At T3, create A2 draft container and session IDs.
At T3, create A3 placeholder requiring recompute execution.
At T3, create A4/A5/A6 task manifests for capture automation.
At T4, finalize A2 with gate outcomes.
At T4, finalize A3 with recompute receipts.
At T4, ingest export evidence to A4.
At T4, ingest realtime evidence to A5.
At T4, ingest device/role captures to A6.
At T5, compute checksums for A2-A6 and write into A1.
At T5, seal bundle index and sign manifest hash.
At T6, archive sealed bundle to release evidence store.
### 5.3 Naming convention
All artifacts MUST use deterministic naming.
Pattern:
`athelon_<env>_<releaseId>_<artifactCode>_<yyyymmddThhmmssZ>_<sha8>.<ext>`
Example:
`athelon_prod_rls-2026.02.27_A3_20260227T054523Z_a1b2c3d4.json`
ReleaseId must be stable across all six artifacts.
Timestamp must be UTC.
`sha8` is first eight chars of file content SHA-256.
MUST NOT use spaces in filenames.
MUST NOT use local timezone tags.
### 5.4 Checksum requirements
Algorithm: SHA-256.
Each artifact includes its own full hash in sidecar metadata.
A1 includes hash table for A2-A6.
Bundle index includes hash for A1.
Seal hash is hash of ordered concatenation:
A1 hash, A2 hash, A3 hash, A4 hash, A5 hash, A6 hash.
Ordered concatenation uses artifact code order.
MUST fail if any hash mismatch appears during seal.
MUST store checksum report as machine-readable JSON.
### 5.5 Retention requirements
Minimum retention for production release bundles: 7 years.
Minimum retention for staging rehearsal bundles: 365 days.
CI pre-release failed bundle attempts: 90 days.
Retention clock starts at release decision timestamp.
Deletion before retention expiry is prohibited except legal hold conflict resolution.
Any deletion exception requires regulatory approval record.
[Marcus] Seven-year retention aligns to conservative audit exposure posture.
### 5.6 Storage requirements
Primary store: immutable object storage bucket with versioning enabled.
Secondary store: replicated evidence archive in separate account/project.
MUST enable write-once policy on sealed bundle objects.
MUST separate upload role from read role.
MUST log all read access to sealed bundles.
MUST include audit trail for any replication failure and retry.
### 5.7 Seal and publish flow
Step 1: Verify six artifacts present.
Step 2: Verify required fields in each artifact schema.
Step 3: Compute and compare all hashes.
Step 4: Produce bundle index JSON.
Step 5: Generate seal hash.
Step 6: Write seal record to release ledger.
Step 7: Mark bundle status `SEALED`.
Step 8: Allow GO decision only after `SEALED` true.
If any step fails, status is `INCOMPLETE` and GO remains blocked.
### 5.8 Tamper-evidence controls
Any post-seal mutation attempt must generate alert.
Any mismatch between stored hash and fetched file hash must generate alert.
Alerts must page release owner and QA owner.
Alert severity for bundle tamper mismatch is SEV-1.
[Marcus] Post-seal mutation is a credibility event, not a routine bug.
---
## 6) Compliance mapping: artifact-to-claim support matrix
### 6.1 Mapping method
Each compliance claim in this section maps to at least one artifact.
Claims include CFR and advisory interpretation commitments used in Athelon launch claims.
This is evidence sufficiency mapping, not legal advice text.
[Marcus] Mapping expresses defendable support, not statutory substitution.
### 6.2 Core claims and mapped artifacts
Claim C1: Record package is inspectable without live app context.
Primary support: A4.
Secondary support: A1.
Rationale: A4 carries standalone export; A1 binds version/context.
Claim C2: Signer identity and certificate authority are visible and distinct where required.
Primary support: A4 and A6.
Secondary support: A2.
Rationale: exported document plus captured sign flow states.
Claim C3: Integrity/tamper evidence is independently reproducible.
Primary support: A3.
Secondary support: A4.
Rationale: recompute receipt plus visible hash in exported record.
Claim C4: Correction model is additive and reviewable.
Primary support: A4.
Secondary support: A2.
Rationale: correction chain in export and gate transcript confirmation.
Claim C5: Audit chronology exists for critical actions.
Primary support: A2 and A5.
Secondary support: A4.
Rationale: gate probes plus qcm_reviewed and record_exported linkages.
Claim C6: Operational process is controlled by explicit release gates.
Primary support: A2.
Secondary support: A1.
Rationale: gate outcomes plus manifest linkage to build/deploy state.
Claim C7: Role and device contexts do not hide regulated pre-sign information.
Primary support: A6.
Secondary support: A2.
Rationale: tablet and orientation captures with role-based checks.
### 6.3 CFR/AC aligned statement table
CFR/AC statement S1: Maintenance record content completeness expectation under 14 CFR §43.9 narrative.
Support artifacts: A4, A6.
Evidence elements: work performed full text, signer identity/cert, timestamps, RTS/ad blocks.
CFR/AC statement S2: Repair station operational accountability context under Part 145 documentation norms.
Support artifacts: A1, A2, A4.
Evidence elements: org identity, release manifest, controlled gate execution, export package identity blocks.
CFR/AC statement S3: Data integrity and traceability expectation under electronic records interpretation.
Support artifacts: A3, A2, A1.
Evidence elements: canonical recompute parity, gate proof, hash-sealed bundle chain.
CFR/AC statement S4: Corrective amendments remain traceable and non-destructive.
Support artifacts: A4.
Evidence elements: correction chain visibility and preserved originals in packet.
CFR/AC statement S5: Quality control/review actions are observable in chronology.
Support artifacts: A5, A4, A2.
Evidence elements: qcm event convergence and audit references.
[Marcus] Keep language as "supports claim"; do not overstate as "proves regulatory compliance in all contexts."
### 6.4 Sufficiency rule
Each claim used in release announcement must map to at least one sealed artifact.
Any unmapped claim in external release communication is prohibited.
QA must check claim map before stakeholder distribution.
---
## 7) Missing-artifact hard stops in CI and release gate
### 7.1 Policy
Artifact completeness is binary.
All six artifacts required.
All six must pass schema validation.
All six must pass checksum validation.
If any condition fails, pipeline status is failed.
No warning-only mode in production branch.
### 7.2 CI hard-stop checks
CI Check H1: Artifact directory exists.
CI Check H2: Exactly one file per mandatory artifact code for releaseId.
CI Check H3: Required schema keys present per artifact.
CI Check H4: Hash value matches file content.
CI Check H5: A1 hash table references existing A2-A6 files.
CI Check H6: Seal hash recompute equals recorded seal hash.
CI Check H7: Timestamps are UTC and monotonic.
CI Check H8: Gate transcript includes all 10 gates.
CI Check H9: Export packet includes success and failure evidence.
CI Check H10: Device capture set includes tablet portrait + landscape.
Any H-check fail returns non-zero and blocks merge/release.
### 7.3 Release gate hard-stop checks
RG1: Bundle status must be `SEALED`.
RG2: Seal timestamp must be before GO decision timestamp.
RG3: Manifest build hashes must equal deployed hashes.
RG4: A3 parity result must be `MATCH`.
RG5: A4 must reference `record_exported` audit event.
RG6: A5 convergence must indicate `no_refresh=true`.
RG7: A6 must include IA-missing hard-stop capture.
RG8: No artifact may be older than configured freshness window.
RG9: No artifact may be marked provisional.
RG10: QA approver and Regulatory approver signatures must be present.
Any RG fail = automatic NO-GO.
[Marcus] Do not allow override flags for RG failures.
### 7.4 Explicit no-override control
System must reject manual `--force-go` style bypass for artifact failures.
Only way to proceed is fix evidence and rerun gates.
Emergency release path must still require six artifacts.
If emergency path cannot satisfy evidence rules, release is prohibited.
### 7.5 Failure messaging requirements
Failure messages must name missing artifact code.
Failure messages must include exact missing fields when schema fails.
Failure messages must include expected and observed hash when mismatch occurs.
Failure messages must include remediation owner hints.
Failure messages must include link to this policy document.
### 7.6 Owner assignment on failure
A1/A2 failures default owner: Jonas.
A3 failures default owner: Devraj with QA witness.
A4 failures default owners: Devraj and Chloe.
A5 failures default owner: Chloe with Devraj support.
A6 failures default owner: Chloe with QA capture operator.
Final release unblock authority remains QA + Regulatory concurrence.
---
## 8) Inspector replay workflow from bundle alone
### 8.1 Objective
Allow Marcus or any designated inspector to replay release defensibility from bundle only.
No live app login required.
No database query required.
No developer walkthrough required.
### 8.2 Replay prerequisites
Have sealed bundle archive downloaded.
Have checksum utility available.
Have PDF/JSON viewer.
Have replay checklist document `inspector-replay-v1`.
### 8.3 Replay step sequence
Step R1: Open A1 manifest.
Confirm releaseId, env, build hashes, timestamps.
Step R2: Verify hashes for A2-A6 against A1 table.
Step R3: Recompute seal hash and compare to recorded value.
Step R4: Open A2 and review 10 gate outcomes.
Step R5: Confirm GO decision occurred after all gate passes.
Step R6: Open A3 and verify canonical recompute parity details.
Step R7: Open A4 export sample and inspect required nine-section ordering.
Step R8: Check signer cert fields and IA separation in export.
Step R9: Confirm correction chain visibility or explicit none-recorded line.
Step R10: Confirm `record_exported` linkage noted.
Step R11: Open A5 and confirm QCM convergence and audit linkage.
Step R12: Open A6 captures and verify tablet and role context evidence.
Step R13: Record replay verdict.
### 8.4 Replay verdict classes
Verdict V1: Defensible from bundle.
Verdict V2: Defensible with clarifying note.
Verdict V3: Not defensible from bundle.
V3 is release-quality failure for future sessions and must open CAPA ticket.
### 8.5 No-live-dependency rule
Replay checklist must not reference app routes.
Replay checklist must not require Convex dashboard access.
Replay checklist must not require Vercel logs.
If any replay step requires live system, bundle is insufficient.
[Marcus] Bundle sufficiency is the point; live lookup dependency defeats control objective.
### 8.6 Replay timing SLA
Regulatory replay on demand must complete in 30 minutes or less.
If replay exceeds 30 minutes due to bundle structure, open usability defect.
If replay cannot complete due to missing content, classify as control failure.
---
## 9) Cilla acceptance tests for Evidence Pack Automation
### 9.1 Test strategy
I test artifact automation as product behavior, not document existence.
I test happy path and failure path.
I test determinism across repeated runs.
I test gate enforcement under intentional omissions.
### 9.2 Acceptance test set
Test AT-01: Bundle initializes at T1 with valid A1 skeleton.
Expected: A1 exists with release metadata fields populated.
Test AT-02: Deployment metadata appends at T2.
Expected: A1 includes backend/frontend deployment identifiers and timestamps.
Test AT-03: Gate transcript creation at T3.
Expected: A2 draft created with session IDs and gate slots.
Test AT-04: Gate completion finalizes A2 at T4.
Expected: A2 includes 10 gate outcomes and final decision marker.
Test AT-05: Integrity receipt finalized at T4.
Expected: A3 includes stored and recompute hash with MATCH result.
Test AT-06: Export packet ingestion.
Expected: A4 contains success sample, failure capture, and audit reference.
Test AT-07: Realtime receipt ingestion.
Expected: A5 includes two-run convergence proof and no-refresh assertion.
Test AT-08: Device capture ingestion.
Expected: A6 includes tablet portrait/landscape and IA hard-stop capture.
Test AT-09: Checksum table generation.
Expected: A1 hash table lists A2-A6 and all hashes verify.
Test AT-10: Seal creation.
Expected: bundle index and seal hash generated; status set `SEALED`.
Test AT-11: Missing artifact hard-stop.
Method: remove A5 before seal attempt.
Expected: seal fails; GO blocked; explicit error names A5.
Test AT-12: Schema missing field hard-stop.
Method: delete required key in A3.
Expected: CI fail with field-level error detail.
Test AT-13: Hash mismatch hard-stop.
Method: alter A4 post-hash.
Expected: hash check fail and SEV-1 alert.
Test AT-14: No-override enforcement.
Method: attempt force release flag on RG fail.
Expected: system rejects override and keeps NO-GO.
Test AT-15: Replay sufficiency test.
Method: independent reviewer executes replay from sealed bundle only.
Expected: completes without app access.
Test AT-16: Naming determinism.
Method: run same release pipeline twice with new releaseId.
Expected: each artifact follows naming pattern and unique timestamps.
Test AT-17: Retention tagging.
Expected: objects tagged with policy class and expiry metadata.
Test AT-18: Access logging.
Expected: bundle read events logged with actor and timestamp.
### 9.3 Pass/fail criteria
All AT tests tagged MUST must pass for production activation.
Any AT fail blocks rollout of evidence automation policy.
Staging may proceed with known non-MUST defects only if documented.
Production policy cannot enter warning mode.
### 9.4 Evidence for acceptance run
QA must store acceptance run outputs as `evidencePack.v1-qualification` bundle.
Qualification bundle must itself have six artifacts plus test report appendix.
[Marcus] Qualification of evidence system should itself be evidence-backed.
---
## 10) Marcus sign-off criteria
### 10.1 Regulatory approval gates
M1: Artifact mapping to claims is complete and not overstated.
M2: Replay can be performed from bundle alone within SLA.
M3: Hash chain and seal controls resist silent mutation.
M4: Export packet visibly carries identity, authority, and integrity fields.
M5: Missing-artifact conditions produce hard stops, not warnings.
M6: Retention policy and access logs are active.
All six M-criteria required for sign-off.
### 10.2 Sign-off checklist
Check 1: Review A1 schema and hash table correctness.
Check 2: Review A3 for independent verification sufficiency.
Check 3: Review A4 for inspector-order readability and nine-section order.
Check 4: Review A6 for IA and device context captures.
Check 5: Execute one blind replay from bundle only.
Check 6: Simulate one missing-artifact scenario and verify NO-GO.
Check 7: Confirm policy text in release runbook references this hard-stop model.
### 10.3 Regulatory sign-off statement template
"I reviewed Evidence Pack Automation against Phase 7 control objectives.
The six-artifact bundle is complete, sealed, and replay-sufficient.
Claim mappings are supportable from sealed evidence.
Missing-artifact conditions correctly enforce NO-GO.
I approve release gate operation under evidencePack.v1."
Signer: Marcus Webb.
Timestamp UTC.
### 10.4 Withdrawal conditions
Marcus sign-off is withdrawn if:
Replay requires live app access.
Seal/hash mismatch appears unresolved.
A1 does not bind to deployed hashes.
A4 lacks required legally material fields.
Hard-stop behavior is bypassed in any tested path.
---
## 11) Operational runbook addendum
At 05:15 UTC, operator confirms evidence orchestration is healthy.
At 05:30 UTC, gate run begins and A2 receives entries.
Before 06:00 UTC decision, operator must confirm `SEALED` status.
If not sealed by decision time, decision defaults to NO-GO.
No verbal override accepted.
No stakeholder pressure exception accepted.
[Marcus] If control is bypassable under pressure, it is not a control.
---
## 12) Definition of done for Phase 7 Evidence Pack Automation
Done requires:
All MUST controls implemented.
All QA acceptance tests pass.
Marcus sign-off completed.
Release runbook updated and used in one rehearsal.
At least one production-bound release executed with sealed bundle.
Inspector replay dry run successful from sealed bundle.
If any item not met, Phase 7 evidence objective remains open.
---
## 15) Final QA statement
Phase 6 proved core behavior can pass under pressure.
Phase 7 must prove release discipline is repeatable and auditable.
This evidence automation spec is the mechanism.
No complete, replayable bundle means no release.
Signed:
Priscilla "Cilla" Oduya
QA Lead
[Marcus] Concur on control direction, contingent on hard-stop enforcement exactly as specified.
