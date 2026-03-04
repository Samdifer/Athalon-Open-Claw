# WS15-J — IA/Mechanic Qualification Alerts
**Workstream:** WS15-J
**Phase:** 15 — R&D + SME-Driven Development
**Authors:** Devraj Anand, Marcus Webb
**SME:** Renata Solís (QCM)
**Date:** 2026-02-22
**Status:** Decision Draft
---
## 0) Scope and Intent
This workstream defines a qualification-alert system that prevents assignment and sign-off by unqualified or expired personnel.
It complements WS15-B (identity re-auth) by adding qualification-validity enforcement.
It incorporates evidence discipline from WS13-D and quality-operational constraints from Renata/Linda interview artifacts.
Objectives:
1. Encode qualification state as first-class, auditable data.
2. Emit thresholded alerts before expiry and at lapse events.
3. Escalate alerts by role with SLA-based acknowledgements.
4. Block assignment/RTS actions when policy requires hard stop.
5. Control false positives while preserving compliance safety.
6. Produce regulator-ready audit trace for every alert lifecycle.
Non-goals:
- Replacing WS15-B identity challenge logic.
- Defining FAA legal memo text (owned by Marcus memo lane).
- Solving all training-provider integrations in this document.
---
## 1) SME Brief — Renata Solís
### 1.1 QCM operating position
Renata’s anchor principle: quality systems preserve truthful signatures.
A signature can be identity-valid but still qualification-invalid; both controls are required.
Qualification expiry must be surfaced proactively, not in weekly static reports.
Assignment-time checks are mandatory; after-the-fact review is too late.
### 1.2 Directly translated SME requirements
R-SME-01: Validate qualification before assignment confirmation.
R-SME-02: Alert QCM ahead of expiry windows with severity progression.
R-SME-03: Hard-block lapsed qualifications for required tasks/sign-offs.
R-SME-04: Encode QCM independence; DOM cannot unilaterally bypass quality gates.
R-SME-05: Maintain complete alert audit trail: emitted, seen, acknowledged, resolved.
R-SME-06: Reduce dependence on shadow spreadsheets for expiry tracking.
R-SME-07: Preserve IA/A&P field separation throughout storage and display.
R-SME-08: Tie each override/suppression to named rationale and time-bounded validity.
### 1.3 Risk framing from SME perspective
Band A — Administrative drift:
- Profile incomplete, stale, or source confidence weak.
Band B — Near-term operational risk:
- Qualification valid now but approaching expiry threshold.
Band C — Active compliance breach:
- Qualification expired/unverifiable while user remains in required action path.
System behavior must map each band to explicit alert severity and authorization outcome.
### 1.4 Why WS15-J is distinct from WS15-B
WS15-B answers: “Was the signer truly re-authenticated per signature?”
WS15-J answers: “Was the signer/assignee currently qualified for this action?”
Both are required for defensible return-to-service and assignment controls.
---
## 2) Qualification/Expiry Data Model
### 2.1 Design principles
D-01: Event-sourced where compliance-relevant state changes occur.
D-02: Amendment-not-overwrite for corrections.
D-03: Server-side deterministic threshold computation.
D-04: Requirement-version snapshot at assignment and pre-sign checks.
D-05: IA and A&P are distinct entities in schema and UI.
D-06: Every critical decision references immutable evidence rows.
### 2.2 Core entities
- `qualificationProfiles`
- `qualificationRequirements`
- `qualificationAssignments`
- `qualificationAlertEvents`
- `qualificationEscalations`
- `qualificationAcknowledgements`
- `qualificationResolutionEvents`
- `qualificationAmendments`
### 2.3 `qualificationProfiles`
Purpose: canonical credential/qualification state per user and time range.
Fields:
- `userId`
- `orgId`
- `certNumber` (A&P)
- `iaCertNumber` (optional, distinct)
- `apStatus` (ACTIVE|EXPIRED|SUSPENDED)
- `iaStatus` (ACTIVE|EXPIRED|MISSING|SUSPENDED)
- `apExpiryDate` (optional ISO date)
- `iaExpiryDate` (optional ISO date)
- `sourceAuthority` (FAA registry/provider/manual attested)
- `sourceRecordRef` (optional)
- `sourceConfidence` (HIGH|MEDIUM|LOW)
- `profileState` (VERIFIED|PENDING|IN_DISPUTE)
- `lastSourceCheckAt`
- `effectiveFrom`
- `effectiveTo` (optional)
- `createdAt`
- `createdBy`
Indexes:
- `by_user`
- `by_org`
- `by_org_profileState`
- `by_org_iaStatus`
- `by_org_apStatus`
Constraints:
- IA/A&P fields cannot be merged.
- Profile transitions create event entries.
- Direct delete prohibited.
### 2.4 `qualificationRequirements`
Purpose: defines which qualifications are required by task/action class.
Fields:
- `requirementCode`
- `orgId`
- `taskType`
- `actionType` (ASSIGNMENT|INSPECTION|RTS_SIGNOFF)
- `aircraftFamily`
- `requiresIA`
- `requiresAP`
- `requiresTypeTraining`
- `trainingCode` (optional)
- `recencyDays` (optional)
- `warningWindowDays`
- `criticalWindowDays`
- `hardBlockOnExpiry`
- `allowConditionalWaiver`
- `active`
- `version`
- `publishedAt`
- `publishedBy`
### 2.5 `qualificationAssignments`
Purpose: immutable snapshot of qualification evaluation at assignment moment.
Fields:
- `assignmentId`
- `workOrderId`
- `taskCardId`
- `assignedUserId`
- `assignedByUserId`
- `requirementCode`
- `requirementVersion`
- `qualificationProfileRef`
- `evaluatedAt`
- `evaluationResult` (PASS|WARN|BLOCK)
- `evaluationReasons[]`
- `daysRemaining` (optional)
- `blocked`
### 2.6 `qualificationAlertEvents`
Purpose: immutable alert emissions with dedupe and threshold references.
Fields:
- `alertId`
- `orgId`
- `userId`
- `qualificationType` (IA|AP|TRAINING|RECENCY)
- `severity` (INFO|WARNING|HIGH|CRITICAL)
- `thresholdCode`
- `stateAtEmit` (ACTIVE|EXPIRING|EXPIRED|UNVERIFIED|IN_DISPUTE)
- `daysRemaining` (optional)
- `effectiveExpiryDate` (optional)
- `triggerContext` (SCHEDULED_SCAN|ASSIGNMENT_CHECK|RTS_PRECHECK|MANUAL_REVIEW)
- `relatedWorkOrderId` (optional)
- `relatedTaskCardId` (optional)
- `dedupeKey`
- `eventHash`
- `emittedAt`
### 2.7 `qualificationEscalations`
Purpose: records escalation routing and acknowledgement obligations.
Fields:
- `escalationId`
- `alertId`
- `stepNumber`
- `targetRole` (MECHANIC|IA|LEAD|QCM|DOM|ACCOUNTABLE_MANAGER)
- `targetUserId` (optional)
- `channel` (IN_APP|EMAIL|SMS|WEBHOOK)
- `deliveryStatus` (SENT|FAILED|ACK_PENDING|ACKED)
- `ackRequired`
- `ackSlaHours` (optional)
- `sentAt`
- `ackAt` (optional)
- `ackBy` (optional)
### 2.8 `qualificationAcknowledgements`
Purpose: human accountability ledger.
Fields:
- `alertId`
- `ackByUserId`
- `ackRoleSnapshot`
- `ackType` (VIEWED|ACKNOWLEDGED|CHALLENGED)
- `ackNote` (optional)
- `ackAt`
### 2.9 `qualificationResolutionEvents`
Purpose: closure and reopen semantics.
Fields:
- `alertId`
- `resolutionType` (RENEWED|CORRECTED_RECORD|WAIVER_GRANTED|FALSE_POSITIVE_SUPPRESSED|SUPERSEDED)
- `resolutionEvidenceRef`
- `resolvedBy`
- `resolvedAt`
- `effectiveUntil` (optional)
- `reopenIfUnverified`
### 2.10 `qualificationAmendments`
Purpose: correction path for profile data without destructive edits.
Fields:
- `amendmentId`
- `profileRef`
- `fieldName`
- `previousValue`
- `newValue`
- `reasonCode`
- `reasonText`
- `amendedBy`
- `amendedAt`
### 2.11 Derived views
`qualificationStateView(userId)` outputs:
- `overallState`
- `highestSeverity`
- `nextExpiry`
- `blockingReasons[]`
- `openAlertCount`
- `lastVerifiedAt`
`orgQualificationRiskView(orgId)` outputs:
- counts by severity
- expiring within 14/30/60/90 days
- unresolved criticals by role lane
---
## 3) Alerting Thresholds and Escalation Policy
### 3.1 Standard threshold ladder
Threshold bands (default policy):
- TH-90 (INFO)
- TH-60 (WARNING)
- TH-30 (HIGH)
- TH-14 (CRITICAL)
- TH-07 (CRITICAL_ESCALATED)
- TH-00 (EXPIRED_BLOCK)
- TH+ (SUSTAINED_BREACH)
### 3.2 Threshold action map
TH-90:
- Emit INFO to user.
- Add digest entry.
- No action block.
TH-60:
- Notify user + QCM.
- Dashboard tile for QCM.
- No hard block unless requirement marks early block.
TH-30:
- Notify user + QCM + lead.
- Assignment returns WARN with explicit days remaining.
- Planner view shows risk banner.
TH-14:
- Notify user + QCM + DOM.
- Assignment BLOCK for tasks requiring that qualification.
- Existing assignments flagged for reassignment.
TH-07:
- Escalate unresolved criticals to Accountable Manager.
- Daily unresolved reminders.
TH-00:
- Hard block assignment and required sign-off paths.
- RTS precheck failure: `QUALIFICATION_EXPIRED`.
TH+:
- Open compliance incident if expired actor remains on active required path.
- Mandatory QCM incident note.
### 3.3 Role-based escalation path
Escalation order:
1. Individual (mechanic/IA).
2. Team lead.
3. QCM mandatory acknowledgement.
4. DOM operational impact visibility.
5. Accountable Manager on SLA breach/unresolved critical.
### 3.4 Acknowledgement SLAs
- WARNING: QCM ack <= 24h
- HIGH: QCM ack <= 8h
- CRITICAL: QCM ack <= 2h
- EXPIRED_BLOCK: QCM + DOM ack <= 1h
Breach behavior:
- Auto-escalate next role.
- Emit `ALERT_ACK_SLA_BREACH`.
### 3.5 Assignment/RTS integration policy
Assignment mutation:
- Evaluate requirement + profile state server-side.
- PASS -> permit.
- WARN -> permit with explicit risk state.
- BLOCK -> reject mutation with reasons.
RTS precheck:
- Re-evaluate signer qualification state just before sign flow.
- If IA-required and IA not ACTIVE, block before WS15-B auth consume.
- If qualification PASS, continue into WS15-B sequence.
### 3.6 Override and waiver policy
Non-negotiable:
- Expired IA cannot be waived for IA-required RTS sign-off.
Conditional waiver (for policy-allowed non-IA training edges only):
- Requires QCM + DOM dual attestation.
- Requires reason and evidence reference.
- Time-bounded validity.
- Auto-expire and reopen on expiry.
- Fully auditable and visible in compliance dashboard.
### 3.7 Notification channel policy
By severity:
- INFO -> in-app digest.
- WARNING -> in-app + scheduled email.
- HIGH -> in-app + direct email.
- CRITICAL -> in-app + direct email + optional SMS/webhook.
Fatigue controls:
- Dedupe by key per 24h window unless severity changes.
- Severity changes always emit new event.
- Suppressed alert never suppresses higher severity successor.
---
## 4) False-Positive Control Strategy
### 4.1 Target
Maintain high true-positive capture for compliance-critical alerts while keeping operator noise manageable.
### 4.2 Primary false-positive patterns
FP-A: External source lag after renewal.
FP-B: Date-boundary miscalculation (timezone/local cutoff).
FP-C: Duplicate credential rows from migration.
FP-D: Manual data entry typo.
FP-E: Cross-source disagreement.
FP-F: Delayed training-provider sync.
### 4.3 Technical controls
CTRL-01: Source confidence tagging (HIGH/MEDIUM/LOW).
CTRL-02: Profile states include `IN_DISPUTE` and `UNVERIFIED` semantics.
CTRL-03: Date evaluation cutoff at org-local end-of-day for date-only expiries (unless stricter rule defined).
CTRL-04: Dedupe key strategy to prevent alert storms.
CTRL-05: Amendment-only correction path preserving prior values.
CTRL-06: Bounded suppression with expiry and rationale.
CTRL-07: Re-verification queue for low-confidence criticals.
CTRL-08: Automatic reopen if resolution evidence invalidates.
### 4.4 Human controls
H-01: Daily QCM critical-alert review.
H-02: Weekly source discrepancy reconciliation.
H-03: Monthly false-positive audit.
H-04: Quarterly threshold tuning with compliance oversight.
### 4.5 Suppression governance
Suppression rules:
- Requires reason code + narrative.
- Max suppression window 7 days per grant.
- CRITICAL suppression requires QCM role.
- Repeat suppressions on same key trigger compliance review flag.
### 4.6 Quality metrics
Track:
- False-positive rate by severity.
- Mean acknowledge time by role.
- Mean resolution time.
- Suppression-to-resolution ratio.
- Reopen rate.
- Unresolved critical aging.
Target baseline:
- CRITICAL false-positive rate <5%.
- QCM CRITICAL ack SLA attainment >95%.
---
## 5) Compliance Mapping and Audit Trace
### 5.1 Mapping summary
COMP-01:
- Control need: IA/A&P separation.
- WS15-J implementation: distinct profile/event fields + schema guard.
- Evidence: schema tests + mutation rejection logs.
COMP-02:
- Control need: qualified actor prerequisite for critical sign-offs.
- WS15-J implementation: RTS precheck qualification gate before auth consume.
- Evidence: precheck event + block code traces.
COMP-03:
- Control need: assignment qualification proof.
- WS15-J implementation: immutable `qualificationAssignments` snapshots.
- Evidence: snapshot rows with requirement version and reasons.
COMP-04:
- Control need: independent quality oversight.
- WS15-J implementation: QCM mandatory acknowledgement + co-authorization policies.
- Evidence: escalation and waiver event records.
COMP-05:
- Control need: no opaque edits on compliance data.
- WS15-J implementation: amendment ledger.
- Evidence: amendment history with previous/new values.
COMP-06:
- Control need: inspector-ready traceability.
- WS15-J implementation: alert-to-resolution export bundle.
- Evidence: generated bundle + hash manifest.
### 5.2 Audit trace chain requirements
For each HIGH/CRITICAL alert, trace must show:
1. Source snapshot and confidence.
2. Threshold crossing event.
3. Escalation recipients and delivery status.
4. Acknowledgements and SLA compliance.
5. Any action block/unblock events.
6. Resolution type and evidence.
7. Reopen/suppression history if present.
### 5.3 Required audit exports
Proposed artifact set:
- `QALERT-INDEX.json`
- `QALERT-EVENTS.ndjson`
- `QALERT-ESCALATIONS.ndjson`
- `QALERT-ACKS.ndjson`
- `QALERT-RESOLUTIONS.ndjson`
- `QALERT-METRICS.json`
- `QALERT-HASH-MANIFEST.json`
### 5.4 Retention and integrity
Retention:
- Keep alert records aligned to maintenance/compliance retention lifecycle.
- At least 24 months hot-searchable, longer-term archive retrievable.
Integrity:
- Hash each alert event at emit.
- No destructive update/delete.
- Daily chain verification job.
---
## 6) Test Plan Skeleton
### 6.1 Test suites
Suite A: Threshold computation.
Suite B: Assignment gating.
Suite C: RTS precheck integration.
Suite D: Escalation + SLA.
Suite E: False-positive/suppression behavior.
Suite F: Audit export completeness.
Suite G: Authorization and override controls.
### 6.2 Functional test IDs
QALERT-01: IA valid >90 days, INFO only.
QALERT-02: IA enters 60-day window, WARNING to user+QCM.
QALERT-03: IA 14-day window, CRITICAL and assignment BLOCK on IA-required tasks.
QALERT-04: IA expired, RTS precheck returns `QUALIFICATION_EXPIRED`.
QALERT-05: Severity escalation emits new event despite dedupe.
QALERT-06: Duplicate scheduled scans do not emit duplicate same-severity alerts.
QALERT-07: QCM ack SLA breach escalates appropriately.
QALERT-08: DOM-only override attempt rejected.
QALERT-09: Dual attestation waiver accepted only for eligible requirement class.
QALERT-10: Waiver auto-expiry reopens block state.
QALERT-11: Source disagreement sets `IN_DISPUTE` and emits review alert.
QALERT-12: Amendment preserves previous expiry value.
QALERT-13: Suppression without reason rejected.
QALERT-14: Suppression expiry causes alert re-emit if condition persists.
QALERT-15: Assignment snapshot includes requirement version and reason array.
QALERT-16: Audit bundle reconstructs full lifecycle for sampled critical alert.
QALERT-17: Timezone boundary behavior matches policy.
QALERT-18: WS15-B auth success cannot bypass qualification block.
QALERT-19: Qualification renewal closes relevant alerts and clears blocks.
QALERT-20: Invalid resolution evidence triggers reopen.
### 6.3 Negative/security tests
NEG-01: Attempt merged IA/A&P write path.
NEG-02: Attempt delete on alert event row.
NEG-03: Unauthorized ack role.
NEG-04: Unauthorized suppression.
NEG-05: Tampered hash manifest detection.
NEG-06: Missing requirement version in assignment snapshot.
### 6.4 Load/reliability tests
LOAD-01: Daily scan across 10k profiles within SLA.
LOAD-02: Assignment check latency under dispatch peak.
LOAD-03: Escalation retry behavior under channel outage.
LOAD-04: Chain-verification batch performance and alerting.
### 6.5 Release acceptance gate
Must pass before production enforcement:
- All BLOCK-path tests (QALERT-03/04/08/18) pass.
- Audit bundle completeness 100% for critical sample set.
- No unresolved schema integrity defects.
- False-positive CRITICAL rate at/under target band.
---
## 7) Implementation Notes
### 7.1 Dependency alignment
- WS15-B outcome must finalize re-auth linkage and event references.
- Marcus compliance memo must ratify qualification alert language and audit expectations.
- Source integration choices (registry/provider/manual workflow) must finalize confidence policy.
### 7.2 Build sequence
B1: Schema + migration scaffolding.
B2: Threshold engine and dedupe logic.
B3: Assignment gate integration.
B4: RTS precheck integration with WS15-B handoff.
B5: Escalation + ack workflows.
B6: Suppression/amendment flows.
B7: Audit exports + hash manifest.
B8: Test execution and pilot validation.
### 7.3 Rollout proposal
Phase A (observe-only): alerts active, hard blocks off except expired IA at RTS.
Phase B (targeted enforcement): blocks for CRITICAL requirement classes.
Phase C (full enforcement): all configured hard-block requirements active.
---
## 8) Risks and Mitigations
RISK-01: Source lag causes temporary false criticals.
Mitigation: confidence model + dispute path + rapid reverify queue.
RISK-02: Alert fatigue reduces operator response.
Mitigation: dedupe, severity routing, SLA escalations.
RISK-03: Throughput pressure drives override misuse.
Mitigation: strict dual-approval + immutable logs + compliance flags.
RISK-04: Legacy migration quality defects.
Mitigation: migration validation report + UNVERIFIED defaults.
RISK-05: Inconsistent org policy tuning.
Mitigation: versioned requirement sets and compliance-controlled publish flow.
---
## 9) Open Questions
OQ-01: Jurisdiction-specific authoritative source precedence.
OQ-02: Any legally sanctioned grace windows by qualification class.
OQ-03: Offline behavior policy for cached assignments awaiting revalidation.
---
## 10) WS15-J Verdict
### 10.1 Decision rubric
PASS: Complete, enforceable design with traceable compliance mapping and test readiness.
CONDITIONAL: Design complete, but external dependencies unresolved.
FAIL: Missing enforceability, missing traceability, or unsafe override model.
### 10.2 Current decision
**WS15-J VERDICT: CONDITIONAL**
Rationale:
- Core model, thresholds, escalation policy, false-positive controls, and audit trace are defined.
- Remaining dependencies must close before production-level PASS:
  - WS15-B final implementation/memo outcomes.
  - Compliance crosswalk finalization.
  - End-to-end validation in pilot simulation with QCM workflow.
### 10.3 Conditions for PASS
C1: Confirm WS15-B event linkage and RTS gate ordering in implementation.
C2: Publish Marcus compliance memo crosswalk for qualification alerts.
C3: Execute QALERT functional, negative, and load suites with pass evidence.
C4: Produce one complete critical-alert audit bundle with hash verification.
C5: Validate operational usability with Renata (QCM) in staged environment.
---
## 11) Closing
WS15-J provides the qualification-governance control plane needed to complement per-signature identity assurance.
It directly reflects Renata Solís’s QCM requirements: proactive, enforceable, auditable, and independent of production pressure.
With dependencies closed, WS15-J is implementation-ready without structural redesign.
