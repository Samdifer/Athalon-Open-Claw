# WS15-K — RSM Read-and-Acknowledge Workflow
Phase: 15
Workstream: WS15-K
Owners: Devraj Anand (backend), Chloe Park (UX/workflow), Rachel Kwon (SME)
Date: 2026-02-22
Status: Draft for implementation and compliance review

---
## 0) Inputs and source context
- Reviewed: `simulation/athelon/phase-5-repair-station/techpubs/profile-rachel-kwon.md`
- Reviewed: `simulation/athelon/phase-5-repair-station/techpubs/interview-rachel-kwon.md`
- Checked for: `simulation/athelon/phase-15-rd/ws15-j-qual-alerts.md`
- Result: WS15-J not present at time of WS15-K authoring
- Implication: alert policy here is provisional until WS15-J exists

---
## 1) SME brief (Rachel)
### 1.1 Role and authority context
- Rachel is Tech Publications and Training Manager in a Part 145 shop.
- She owns RSM revision custody and distribution operations.
- She owns training record completeness for mechanics and inspectors.
- Her baseline is traceability to named users and exact revisions.
### 1.2 Current pain points
- RSM revisions are distributed by email PDF attachment.
- Acknowledgment is collected by ad-hoc email replies.
- Completion hovers near 60 percent without manual chase.
- Remaining acknowledgments are manually chased by Rachel.
- No enforced read/ack step tied to user identity exists today.
- No lockout policy is tied to non-acknowledgment today.
- No normalized audit evidence model exists for inspector retrieval.
### 1.3 SME acceptance standard
- Every issued revision must be attributable to releaser and timestamp.
- Every required recipient must have explicit per-revision state.
- Acknowledgment must bind to exact revision hash and policy version.
- Evidence must be retrievable without email archaeology.
- Escalation must be timed, role-based, and deterministic.
- Lockout policy must be reversible only by compliance authority rules.
### 1.4 Constraints to preserve
- Do not force full reread for minor editorial deltas unless policy requires it.
- Support section-scoped acknowledgments for targeted changes.
- Preserve immutable historical evidence even after supersession.
- Keep workflow fast for mechanics on shift.

---
## 2) RSM distribution and ack state machine
### 2.1 Objectives
- Model release, delivery, open, submit, verify, escalation, lockout, and closure.
- Remove ambiguous states that create audit disputes.
- Ensure every transition has actor and timestamp.
### 2.2 Core entities
- `rsmRevision`
- `rsmDistributionBatch`
- `rsmAckRecipientState`
- `rsmAckEventLog`
- `rsmEscalationEvent`
- `rsmLockoutStatus`
### 2.3 Revision lifecycle
State `draft`
- Revision content prepared but unreleased.
- Exit: authorized approval gates pass.
State `approved_for_release`
- Authorized and queued for distribution.
- Exit: distribution batch executed.
State `released`
- Recipient obligations active.
- Exit: all required obligations resolved -> `closed`.
- Exit: newer release issued while open -> `superseded_open`.
State `superseded_open`
- Historical revision with unresolved obligations preserved.
- Exit: all residual obligations resolved -> `superseded_closed`.
State `closed`
- Current revision obligations complete.
State `superseded_closed`
- Historical revision complete and immutable.
### 2.4 Recipient lifecycle
State `not_distributed`
- Recipient not yet targeted for this revision.
State `distributed_unopened`
- Delivery complete; recipient has not opened package.
State `opened_pending_ack`
- Package opened; no acknowledgment submitted yet.
State `ack_submitted`
- User submitted acknowledgment; verification pending.
State `ack_verified`
- Identity/hash/policy checks passed; obligation complete.
State `overdue_level_1`
- First threshold breached; direct and lead reminders.
State `overdue_level_2`
- Second threshold breached; management escalation.
State `lockout_pending`
- Final warning before lockout activation.
State `locked_out`
- Restricted from controlled actions until compliance/override.
State `exempted`
- Authorized exemption with reason code.
State `invalidated`
- Prior acknowledgment invalidated via controlled correction flow.
### 2.5 Allowed transitions
- `not_distributed` -> `distributed_unopened`
- `distributed_unopened` -> `opened_pending_ack`
- `opened_pending_ack` -> `ack_submitted`
- `ack_submitted` -> `ack_verified`
- `distributed_unopened` -> `overdue_level_1`
- `opened_pending_ack` -> `overdue_level_1`
- `overdue_level_1` -> `overdue_level_2`
- `overdue_level_2` -> `lockout_pending`
- `lockout_pending` -> `locked_out`
- `overdue_level_1` -> `ack_submitted`
- `overdue_level_2` -> `ack_submitted`
- `locked_out` -> `ack_submitted`
- `ack_verified` -> `invalidated` (authorized correction only)
- Any open state -> `exempted` (authorized exemption only)
### 2.6 Guardrails
- No direct `distributed_unopened` -> `ack_verified`.
- `ack_verified` requires hash + policy snapshot.
- `locked_out` clear path requires verified ack or authorized temporary override.
- Exemption always reason-coded and approver-attributed.
- Corrections append events; never destructive overwrite.
### 2.7 Distribution mechanics
- Distribution batch freezes target population at release time.
- Sources: active mechanics, inspectors, role groups, ad-hoc recipients.
- One obligation row per recipient per revision.
- Channels: in-app mandatory + optional email/SMS/push.
- Channel receipts and failures logged as events.

---
## 3) Versioning, supersession, and evidence model
### 3.1 Revision identity fields
- `revisionCode` (ex: RSM-12.4)
- `semanticClass` (major/minor/editorial)
- `effectiveAt` timestamp
- `documentHash` (SHA-256 of canonical package)
- `affectedSections[]`
- `policyProfileId`
### 3.2 Supersession rules
- Major revision supersedes all overlapping open obligations.
- Minor revision supersedes prior minor for same section scope.
- Editorial revision may be non-ack-required by policy.
- Supersession reclassifies; it does not delete history.
- Section overlap controls whether prior section-level ack remains valid.
### 3.3 Acknowledgment granularity
- Full-document mode.
- Section-scoped mode.
- Hybrid mode: full baseline + section deltas.
- Granularity mode stored with each obligation and evidence row.
### 3.4 Evidence primitives
- `ackId` immutable identifier.
- `userId` and role snapshot at ack time.
- `revisionId` + `documentHash` snapshot.
- `ackMethod` (confirm/signature/sso_attest).
- `ackSubmittedAt` and `ackVerifiedAt`.
- `clientMetadata` (device/app context).
- `policyVersion` for validation traceability.
- `readCoverage` for section completion markers.
### 3.5 Evidence quality tiers
- Tier 1: click only (minimum).
- Tier 2: click + section completion markers.
- Tier 3: tier 2 + challenge attestation for high criticality.
- Tier chosen by policy profile + semantic class.
### 3.6 Immutability and correction
- Verified evidence is append-only.
- Corrections produce linked correction events.
- Correction reasons: identity mismatch, exemption error, policy mapping error.
- Major revision corrections require dual authorization.
### 3.7 Schema sketch
```ts
type RsmRevision = {
  id: string;
  revisionCode: string;
  semanticClass: "major"|"minor"|"editorial";
  effectiveAt: number;
  documentHash: string;
  affectedSections: string[];
  supersedesRevisionIds: string[];
  policyProfileId: string;
};
type RsmAckRecipientState = {
  id: string;
  revisionId: string;
  userId: string;
  state: string;
  dueAt: number;
  escalatedLevel: 0|1|2|3;
  lockoutAt?: number;
};
type RsmAckEvidence = {
  ackId: string;
  revisionId: string;
  userId: string;
  documentHash: string;
  policyVersion: string;
  submittedAt: number;
  verifiedAt: number;
  method: "confirm"|"signature"|"sso_attest";
  readCoverage?: { sectionId: string; completedAt: number }[];
};
```
### 3.8 Retention
- Keep evidence for policy retention minimum (recommended 6 years).
- Keep hash manifests so exported bundles can be re-verified later.

---
## 4) Non-ack escalation and lockout policy
### 4.1 Policy goals
- Drive completion without constant admin chase.
- Enforce fairly and predictably with explicit timestamps.
- Preserve continuity with controlled temporary overrides.
### 4.2 Baseline SLA profile (proposed)
- T0: release and obligation creation.
- T+24h: reminder 1 to recipient.
- T+72h: level 1 escalation to recipient + lead.
- T+120h: level 2 escalation to recipient + lead + DOM.
- T+168h: lockout pending notice with countdown.
- T+192h: lockout active for controlled actions.
### 4.3 Controlled actions under lockout
- Block final maintenance sign-off submission.
- Block release-to-service critical execution step.
- Allow viewing instructions and completing acknowledgment.
- Allow emergency mode only with temporary override.
### 4.4 Override model
- Issuers: DOM or delegated compliance manager.
- Duration: short fixed window (example 8h).
- Mandatory reason code + justification text.
- Auto-expire and re-apply lockout if still non-compliant.
- Include all overrides in recurring exception report.
### 4.5 Escalation notification matrix
- Level 1: recipient + lead.
- Level 2: recipient + lead + DOM/QA.
- Lockout pending: explicit activation timestamp.
- Lockout active: high-visibility persistent banner.
### 4.6 Edge conditions
- Leave status can pause clock if workforce status feed exists.
- New hires receive obligation on first active shift after release.
- Terminated users close via `exempted` reason `employment_ended`.
- Role changes do not erase already applicable open obligations.

---
## 5) Compliance/audit retrieval view
### 5.1 Retrieval requirements
- Query by revision/date/user/role/location.
- Show open overdue obligations and escalation level.
- Show lockout history and override usage.
- Export evidence bundle with integrity metadata.
### 5.2 Dashboard panels
- Active revision summary.
- Completion funnel by state.
- Overdue aging buckets.
- Exemption ledger with reasons.
- Override ledger with issuer and duration.
- Superseded-open residual obligations.
### 5.3 Evidence bundle composition
- Export manifest with metadata.
- Revision snapshot metadata.
- Recipient roster snapshot.
- Ack evidence rows.
- Escalation/lockout events.
- Exemption/override events.
- Hash file for integrity verification.
### 5.4 Canonical audit questions answered
- Who was required to acknowledge?
- When were they notified?
- Did they acknowledge exact revision/hash in force?
- If not, what escalation occurred and when?
- Were lockouts/overrides policy-conformant?
- Is evidence tamper-evident and reproducible?

---
## 6) Test plan skeleton
### 6.1 Functional
TC-K-01 release to audience
- Create and release revision.
- Expect obligations materialized for all recipients.
TC-K-02 open no submit
- Recipient opens package only.
- Expect state `opened_pending_ack`.
TC-K-03 submit valid
- Submit ack for matching hash.
- Expect `ack_verified`.
TC-K-04 submit stale hash
- Submit against changed hash.
- Expect rejection and open state retained.
TC-K-05 overdue progression
- Simulate clock crossing thresholds.
- Expect L1 then L2 transitions and notifications.
TC-K-06 lockout activation
- Leave unacked through final threshold.
- Expect controlled action blocks only.
TC-K-07 post-lockout compliance
- Submit ack while locked out.
- Expect lockout clear after verification.
TC-K-08 temporary override expiry
- Issue override and let expire without ack.
- Expect lockout reapply.
TC-K-09 exemption
- Apply authorized exemption.
- Expect closure with reason-coded event.
TC-K-10 supersession
- Release new major revision with open prior obligations.
- Expect prior revision `superseded_open` and preserved evidence.
### 6.2 Integrity/security
TC-K-11 immutable evidence
- Attempt direct update of verified evidence row.
- Expect rejection and security log.
TC-K-12 forged event
- Attempt ack without authenticated context.
- Expect rejection and incident log.
TC-K-13 export integrity
- Recompute bundle hashes.
- Expect manifest match.
### 6.3 UX/operations
TC-K-14 mobile completion
- Complete flow on mobile-compatible UI.
- Expect successful verification.
TC-K-15 supervisor queue action
- Lead triggers manual reminder from overdue queue.
- Expect action logged with actor.
TC-K-16 audit export
- Run one-click revision bundle export.
- Expect complete artifacts under SLA.
### 6.4 Performance
TC-K-17 bulk release
- Release to 500 recipients.
- Expect complete materialization and no drops.
TC-K-18 scheduler load
- Run overdue scheduler under heavy data volume.
- Expect idempotent transitions.
TC-K-19 historical analytics
- Query dashboard with multi-year data.
- Expect acceptable response and pagination.
### 6.5 Compliance acceptance checks
- Evidence binds user + revision + hash + policy version.
- Escalation timeline equals selected policy profile.
- Lockout never blocks acknowledgment action itself.
- Exemptions/overrides are reason-coded and approval-scoped.
- Supersession preserves traceability.

---
## 7) WS15-K verdict
**Verdict: CONDITIONAL PASS**
Rationale:
- Core workflow design aligns with Rachel Kwon SME requirements.
- Distribution+ack state machine, evidence model, escalation, lockout, and audit retrieval are specified.
- Test skeleton is sufficient to start implementation and QA planning.
- Conditional element: WS15-J qual-alerts artifact was not found, so alert mapping remains provisional.
Exit criteria to elevate to PASS:
- Reconcile alert severity/channel policy once WS15-J exists or is confirmed unnecessary.
- Obtain compliance authority confirmation on lockout/override operating rules.
- Execute TC-K-01..TC-K-19 and attach evidence bundle.
Prepared by: Devraj Anand and Chloe Park with SME authority input from Rachel Kwon.
Document intent: implementation-ready R&D specification for WS15-K.
