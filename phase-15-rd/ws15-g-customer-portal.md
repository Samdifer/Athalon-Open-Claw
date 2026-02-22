# WS15-G — Customer Portal + Coordinator Status Model
**Workstream:** WS15-G  
**Feature:** Customer Portal + Coordinator Status Model  
**Phase:** 15 — R&D + SME-Driven Feature Development  
**Product:** Athelon  
**Authors:** Chloe Park (Frontend), Finn Calloway (UX)  
**SME Partners:** Danny Osei (WO Coordinator), Carla Ostrowski (DOM)  
**Date Opened:** 2026-02-22  
**Status:** READY FOR CONDITIONAL BUILD
---
## 1) SME Brief (Danny + Carla)
### 1.1 Danny Osei (Work Order Coordinator) — Operational Reality
Danny runs the customer signal layer between shop floor and owners.
His core pain is not the absence of data.
His core pain is data trapped in internal language and stale timing.
Key operating constraints Danny highlighted:
- Current systems force him to maintain parallel truth sources:
  - Official WO system
  - Manual coordinator status sheet
  - Whiteboard floor state
- Customer calls are mostly status-seeking and avoidable.
- Internal status labels are too coarse for customer comprehension.
- Authorization events are weakly structured and follow-up heavy.
- AOG designation does not trigger system-wide urgency behavior.
- Pre-close review burden is manual and repetitive.
Danny’s requirement framing:
- Customer needs confidence, not raw technical logs.
- Coordinator needs real-time internal detail, customer-safe language output.
- Status must be meaningful at a glance and defensible when challenged.
- The portal should reduce low-value calls without reducing trust.
Non-negotiable outcomes from Danny:
1. Distinct internal and customer-visible status tracks.
2. Customer portal as read-only shared workspace per work order.
3. Explicit “authorization pending” gates.
4. AOG as a system state, not decorative tag.
5. Update freshness measured in minutes, not shifts.
### 1.2 Carla Ostrowski (DOM) — Regulatory and Liability Reality
Carla’s lens is FAA defensibility first, UX second.
She is not anti-portal.
She is anti-ambiguity in legal exposure.
Carla’s core constraints:
- Customer language cannot imply technical sign-off authority.
- Portal must not publish statements that can be construed as RTS.
- Timestamp semantics must remain action-true and audit-true.
- Exported/printed record remains the legal backbone.
- Internal signatures/certificate details are not customer display artifacts by default.
Carla’s legal-risk framing:
- “In progress” is safe if scoped.
- “Ready to fly” is unsafe unless release is complete and explicit.
- Predictive completion language must be tagged as estimate.
- Discrepancy disclosures require wording discipline.
- Deferred items must not be silently normalized in customer copy.
Carla’s non-negotiables for WS15-G:
1. Customer portal never substitutes maintenance record.
2. Customer text taxonomy must pass DOM + legal review.
3. RTS state is uniquely named and tightly permissioned.
4. Audit trail must include every customer-visible state transition.
5. Portal content versioning must preserve who changed what, when, and why.
### 1.3 Joint Synthesis (Danny + Carla)
What Danny and Carla agree on:
- Separate audiences require separate wording.
- Coordination quality improves when status freshness improves.
- Liability risk rises when wording outruns shop reality.
- Status model must be deterministic and explainable.
- Customer confidence increases when uncertainty is explicit, not hidden.
What they disagree on (resolved by this spec):
- Danny prefers broad transparency.
- Carla prefers tightly scoped disclosure.
- Resolution: policy-driven visibility tiers with strict wording catalog.
---
## 2) Internal vs Customer-Visible Status Model
### 2.1 Model Principles
1. One source of truth for state machine.
2. Two projections of that truth:
   - Internal operational projection.
   - Customer communication projection.
3. Customer projection is lossy by design.
4. Lossy projection cannot hide legally material constraints.
5. Every projection change is auditable.
### 2.2 Internal Status Canonical Set (Operational)
Internal statuses are precise, role-facing, and action-driving.
- `WO_CREATED`
- `ARRIVAL_PENDING`
- `AIRCRAFT_RECEIVED`
- `INTAKE_IN_PROGRESS`
- `INSPECTION_IN_PROGRESS`
- `DISCREPANCY_RECORDED`
- `AUTHORIZATION_PENDING`
- `PARTS_WAITING`
- `MAINTENANCE_IN_PROGRESS`
- `REASSEMBLY_IN_PROGRESS`
- `GROUND_RUN_PENDING`
- `GROUND_RUN_IN_PROGRESS`
- `QA_QCM_REVIEW_PENDING`
- `QA_QCM_REVIEW_IN_PROGRESS`
- `RETURN_TO_SERVICE_PENDING_IA`
- `RETURN_TO_SERVICE_SIGNED`
- `CUSTOMER_RELEASE_PENDING`
- `READY_FOR_PICKUP`
- `PICKED_UP`
- `ON_HOLD_CUSTOMER_REQUEST`
- `AOG_ACTIVE`
- `AOG_RECOVERY_IN_PROGRESS`
- `CANCELLED`
Notes:
- `AOG_ACTIVE` is orthogonal flag + priority mode, not replacement terminal state.
- Internal workflow can include sub-state metadata (task completion %, blockers).
### 2.3 Customer-Visible Status Canonical Set
Customer statuses are plain-language and bounded.
- `Scheduled`
- `Aircraft Received`
- `Initial Inspection In Progress`
- `Additional Findings Require Approval`
- `Awaiting Parts`
- `Maintenance In Progress`
- `Final Checks In Progress`
- `Ready for Pickup`
- `Delivered`
- `On Hold`
### 2.4 Projection Mapping (Internal -> Customer)
| Internal State | Customer State | Notes |
|---|---|---|
| WO_CREATED, ARRIVAL_PENDING | Scheduled | No shop action started |
| AIRCRAFT_RECEIVED, INTAKE_IN_PROGRESS | Aircraft Received | Intake and induction |
| INSPECTION_IN_PROGRESS | Initial Inspection In Progress | Technical detail hidden |
| DISCREPANCY_RECORDED, AUTHORIZATION_PENDING | Additional Findings Require Approval | Wording reviewed by legal |
| PARTS_WAITING | Awaiting Parts | Optional ETA shown as estimate |
| MAINTENANCE_IN_PROGRESS, REASSEMBLY_IN_PROGRESS, AOG_RECOVERY_IN_PROGRESS | Maintenance In Progress | Can include progress bar |
| GROUND_RUN_PENDING, GROUND_RUN_IN_PROGRESS, QA_QCM_REVIEW_PENDING, QA_QCM_REVIEW_IN_PROGRESS, RETURN_TO_SERVICE_PENDING_IA | Final Checks In Progress | Never implies release |
| RETURN_TO_SERVICE_SIGNED, CUSTOMER_RELEASE_PENDING, READY_FOR_PICKUP | Ready for Pickup | Only after RTS signed |
| PICKED_UP | Delivered | Terminal |
| ON_HOLD_CUSTOMER_REQUEST, CANCELLED | On Hold | Reason category optional |
### 2.5 Forbidden Customer Language
The following phrases are disallowed in customer projection unless explicit legal exception:
- “Airworthy”
- “Certified complete”
- “FAA approved”
- “Ready to fly”
- “Signed off” (unless shown as “Final release complete” under approved template)
- “No safety issues”
### 2.6 AOG Display Rules
For internal users:
- Persistent high-priority banner.
- Elapsed AOG timer.
- Queue elevation on all role dashboards.
For customers:
- Optional badge: `Priority Recovery Active`.
- No technical root-cause text unless approved disclosure exists.
### 2.7 Status SLA/Latency Targets
- Internal projection freshness: <= 30 seconds median.
- Customer projection freshness: <= 90 seconds median.
- Worst-case stale threshold before banner: 5 minutes.
- Banner text: “Status may be delayed; team is updating records.”
---
## 3) Liability / Wording Constraints + Approval Workflow
### 3.1 Liability Risk Taxonomy
Risk class for every customer-facing copy unit:
- `L0 Informational` — schedule, receipt, pickup window.
- `L1 Progress` — in-progress statements.
- `L2 Conditional` — pending authorization, awaiting parts ETA.
- `L3 Regulated-adjacent` — final checks, release-adjacent language.
- `L4 Prohibited` — legal/airworthiness assertions outside approved release context.
### 3.2 Wording Constraints by Risk Class
`L0`:
- Free within template constraints.
- Coordinator editable.
`L1`:
- Controlled templates.
- Coordinator may choose from approved phrase variants.
`L2`:
- Must include uncertainty marker where forecast exists.
- Authorization requests must include explicit action requirement.
`L3`:
- Read-only template generated by system.
- No manual edits by coordinator.
- Triggered by specific workflow transitions only.
`L4`:
- Blocked by validator.
- Logged as rejected copy attempt.
### 3.3 Required Disclaimers
When showing ETA:
- “Estimated completion date; subject to inspection findings and parts availability.”
When authorization pending:
- “Work cannot continue on this item until your approval is recorded.”
When final checks in progress:
- “Final quality and release checks are still in process.”
When ready for pickup:
- “Release complete; pickup coordination in progress.”
### 3.4 Approval Workflow (Copy + Status Policy)
Policy artifacts requiring approval:
- Status label set.
- Mapping table.
- Template copy bank.
- Disclaimer strings.
- Disclosure boundaries by event type.
Approvers:
1. Product (owner of UX consistency).
2. DOM representative (owner of operational/legal sanity).
3. Compliance reviewer (owner of evidentiary defensibility).
4. Optional external counsel for high-risk wording updates.
Workflow states:
- Draft
- Review Requested
- Revisions Required
- Approved
- Published
- Deprecated
Publishing gates:
- All required approvers signed.
- Test snapshot generated for all status states.
- Regression checks pass.
### 3.5 Emergency Copy Override
Allowed only for incident communication.
Requirements:
- Two-person approval (DOM + compliance or delegate).
- Auto-expire in 24h unless renewed.
- Diff and rationale logged.
- Affected customers list captured.
---
## 4) Portal Data Contract + Update Cadence
### 4.1 Customer Portal Data Contract (v1)
```ts
interface CustomerPortalWorkOrder {
  portalTokenId: string;
  workOrderPublicId: string;
  aircraft: {
    tailNumberMasked?: string;
    tailNumberDisplay: string;
    makeModel?: string;
  };
  status: {
    customerState:
      | "Scheduled"
      | "Aircraft Received"
      | "Initial Inspection In Progress"
      | "Additional Findings Require Approval"
      | "Awaiting Parts"
      | "Maintenance In Progress"
      | "Final Checks In Progress"
      | "Ready for Pickup"
      | "Delivered"
      | "On Hold";
    statusUpdatedAt: string; // ISO8601 UTC
    staleAfterSec: number;
    isPriorityRecoveryActive: boolean;
  };
  progress: {
    percent?: number; // optional, policy controlled
    completedMilestones: string[];
    currentMilestone?: string;
    nextMilestone?: string;
  };
  blockers: {
    requiresCustomerApproval: boolean;
    pendingApprovals: Array<{
      approvalId: string;
      summary: string;
      amountRange?: string;
      requestedAt: string;
      actionUrl?: string;
    }>;
    awaitingParts: Array<{
      partCategory: string;
      etaDate?: string;
      etaConfidence?: "low" | "medium" | "high";
    }>;
  };
  schedule: {
    estimatedReadyDate?: string;
    pickupWindow?: string;
    disclaimer: string;
  };
  communication: {
    coordinatorDisplayName: string;
    coordinatorContactMethod: "portal_message" | "phone" | "email";
    latestUpdateSummary?: string;
  };
  auditMeta: {
    projectionVersion: string;
    policyVersion: string;
    generatedAt: string;
  };
}
```
### 4.2 Excluded Fields (Explicit)
Never in v1 customer payload by default:
- Technician names and certificate numbers.
- Internal discrepancy raw text.
- Task-step technical logs.
- Non-customer pricing internals.
- QA findings detail.
- AD references unless disclosure policy allows.
### 4.3 Update Triggers
Customer projection recalculates on:
- Internal status transition.
- Authorization event create/resolve.
- Parts ETA change.
- RTS event.
- Pickup scheduling event.
- Portal policy version change.
### 4.4 Cadence Strategy
- Event-driven push first.
- Poll fallback every 60s when push unavailable.
- Hard refresh endpoint available for coordinator troubleshooting.
Cadence guarantees:
- P95 projection compute time: < 2s.
- P95 customer-visible update propagation: < 90s.
### 4.5 Retention and Token Lifetime
Portal token rules:
- Default validity: from WO creation until 30 days post-delivery.
- Revocable immediately by coordinator/DOM.
- Rotation on suspected leakage.
Audit retention:
- Portal state snapshots retained 24 months.
- Access logs retained 24 months minimum.
---
## 5) Failure Handling + Disclosure Policy
### 5.1 Failure Classes
- `F1 Data Delay` — event ingestion lag.
- `F2 Projection Error` — mapping/render failure.
- `F3 Upstream Missing Data` — required internal field absent.
- `F4 Auth/Token Fault` — invalid/expired portal link.
- `F5 Service Outage` — portal unavailable.
- `F6 Wording Policy Violation` — attempted unapproved copy.
### 5.2 Customer-Facing Failure Behavior
F1/F2/F3:
- Show last known good state.
- Display freshness timestamp.
- Display neutral banner:
  - “We’re updating this status; your coordinator has the latest details.”
F4:
- Deny view.
- Show re-contact instructions.
F5:
- Static outage page with coordinator contact.
- No speculative status text.
F6:
- No customer impact.
- Internal rejection + escalation.
### 5.3 Internal Escalation Matrix
- F1 > 5 min: alert coordinator + support channel.
- F2 immediate: page product-oncall + compliance watch.
- F3 immediate: coordinator task to resolve missing required field.
- F5 > 10 min: incident protocol + customer comm template.
### 5.4 Disclosure Policy for Sensitive Findings
Default:
- Findings are abstracted to approval summaries.
Allowed:
- High-level category and required customer action.
Not allowed without explicit policy override:
- Detailed defect narratives.
- Safety causality interpretations.
- Statements assigning fault.
### 5.5 “No Silent Failure” Rule
Every failed projection attempt must produce:
- Internal audit event.
- Error classification.
- Responsible service identifier.
- Recovery status.
---
## 6) Test Plan Skeleton
### 6.1 Test Domains
1. Status mapping correctness.
2. Wording policy enforcement.
3. Update freshness and staleness signaling.
4. Failure-mode behavior.
5. Access control + token lifecycle.
6. Audit completeness.
7. Coordinator workflow usability.
8. Customer comprehension outcomes.
### 6.2 Core Test Matrix (Skeleton)
| ID | Domain | Scenario | Expected |
|---|---|---|---|
| WS15G-T01 | Mapping | Every internal state maps deterministically | Exactly one customer state emitted |
| WS15G-T02 | Mapping | AOG flag active during maintenance | Customer state preserved, priority badge shown |
| WS15G-T03 | Wording | Forbidden phrase attempt by coordinator | Block + logged rejection |
| WS15G-T04 | Wording | ETA shown | Required estimate disclaimer present |
| WS15G-T05 | Freshness | Event arrives | Customer view updates within SLA |
| WS15G-T06 | Freshness | Push unavailable | Poll fallback updates correctly |
| WS15G-T07 | Failure | Projection compute error | Last known good + status delay banner |
| WS15G-T08 | Failure | Portal outage | Outage page + contact path |
| WS15G-T09 | Security | Expired token access | Access denied, no data leak |
| WS15G-T10 | Security | Revoked token reuse | Access denied immediately |
| WS15G-T11 | Audit | Status transition | Audit row includes actor, before/after, time |
| WS15G-T12 | Audit | Policy version change | Snapshot indicates new policy version |
| WS15G-T13 | UX | Customer sees “Final Checks” | Comprehension: not interpreted as pickup-ready |
| WS15G-T14 | UX | Approval request pending | Customer can identify required next action |
| WS15G-T15 | Coordinator | Bulk update day with 20 WOs | No stale status drift beyond threshold |
### 6.3 Acceptance Criteria Skeleton
- 100% deterministic mapping coverage.
- 0 occurrences of prohibited customer wording in generated payloads.
- P95 update propagation <= 90 seconds under nominal load.
- All failure classes produce policy-compliant customer fallback.
- Audit trail present for 100% customer-visible transitions.
- Customer comprehension study: >= 85% accurate interpretation of 5 key states.
### 6.4 Evidence Artifacts Required
- Mapping conformance report.
- Copy-policy validator logs.
- Freshness SLA dashboard captures.
- Failure injection runbook results.
- Access-control penetration summary.
- Usability comprehension session recordings.
---
## 7) WS15-G Verdict
## **VERDICT: CONDITIONAL PASS**
WS15-G is structurally ready.
The two-model status architecture is correct.
SME alignment is strong.
However, build should proceed under explicit closure conditions.
### 7.1 Conditions to Lift Before Full PASS
1. Copy policy catalog must be fully approved (Product + DOM + Compliance).
2. Customer wording validator must be implemented and enforced server-side.
3. Freshness telemetry and stale-banner behavior must pass failure drills.
4. Access-token revocation and rotation flows must be validated in staging.
5. Customer comprehension test must confirm final-checks language is not misread as release complete.
### 7.2 Rationale for Conditional (Not Full) PASS
- Status model is complete.
- Data contract is sufficient.
- Liability controls are defined but not yet proven in test evidence.
- Failure disclosure policy is strong but requires execution validation.
### 7.3 Build Recommendation
Proceed with implementation in two increments:
- Increment 1: mapping engine + policy validator + internal coordinator console.
- Increment 2: customer portal exposure + telemetry + legal-copy freeze.
Do not release external portal link generation until Conditions 1–5 are met.
---
## Appendix A — Coordinator vs Customer Display Example
Internal:
- State: `RETURN_TO_SERVICE_PENDING_IA`
- Blockers: IA sign-off outstanding
- Next action owner: IA
Customer:
- State: `Final Checks In Progress`
- Message: “Final quality and release checks are still in process.”
- No mention of certificate workflow detail.
## Appendix B — Governance Ownership
- Product Owner: status UX consistency
- DOM Delegate: wording safety and operational truth
- Compliance Owner: liability and evidentiary controls
- Engineering Owner: mapping determinism + telemetry + audit guarantees
## Appendix C — Open Questions
1. Should customer see tail number masking option for privacy-sensitive operators?
2. Should portal support multilingual copy in v1 or freeze to English approved corpus?
3. Should customer action approvals require MFA by default for high-value deltas?
4. Should “On Hold” expose reason categories or remain generic to avoid misinterpretation?
---
## Final Note
This workstream explicitly separates truth from phrasing.
That is the correct design choice for aviation maintenance customer communication.
If implemented with server-side policy enforcement and complete auditability, WS15-G will materially reduce coordinator load while preserving DOM-grade legal defensibility.
