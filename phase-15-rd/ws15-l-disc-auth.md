# WS15-L — Discrepancy Customer Authorization Flow
**Workstream:** WS15-L
**Phase:** 15 — R&D + SME-driven feature development
**Primary author voice:** Devraj Anand (technical architecture)
**Inline SME notes:** [DANNY] Danny Osei (WO Coordinator)
**Inline compliance constraints:** [MARCUS] Marcus Webb (Regulatory/Compliance)
**Date:** 2026-02-22
**Status:** Determination for build-gating
---
## 1) SME Brief (Danny)
### 1.1 Operational reality
Danny’s operational pain is not missing data; it is unsynchronized data across tools.
He currently bridges whiteboard truth, WO system truth, and customer-call truth manually.
A discrepancy discovered on floor does not become customer authorization evidence automatically.
This creates a delay chain: mechanic reports -> coordinator interprets -> customer called -> note entered -> email chase.
[DANNY] “The work can be ready to move, but we are waiting on proof we have approval.”
[DANNY] “The customer is waiting on confidence, not internal jargon.”
### 1.2 Current failure modes from coordination view
- Free-text note entries for verbal approvals are non-uniform and hard to defend.
- Mechanic progress may continue before legal-grade consent is finalized.
- Customers cannot self-serve discrepancy decisions in a structured portal path.
- Pending approvals are buried in notes rather than surfaced as a system gate.
- AOG urgency increases pressure to bypass controls if workflow is too slow.
- “In progress” language conceals whether customer action is required.
### 1.3 Danny’s non-negotiable requirements
1. Every discrepancy requiring approval must create a formal customer action card.
2. Work dependent on approval must be held by system guardrails.
3. Customer response must be easy (approve/decline) but evidence-rich.
4. Coordinator queue must expose pending and aging approvals instantly.
5. Partial approvals in bundled requests must be supported without ambiguity.
6. AOG must escalate urgency, never erase consent controls.
### 1.4 Throughput and timing requirements
[DANNY] “If this takes hours, coordinators will bypass it in busy season.”
Operational target timing:
- Request generation from discrepancy publication: <= 60 sec
- Customer notification dispatch: <= 120 sec
- Captured decision to WO gate recompute: <= 30 sec median
- Pending-age escalation trigger: policy-based (e.g., 2h/6h/24h ladders)
### 1.5 Adoption criterion
Danny will trust this flow only if it reduces authorization chase loops.
He expects fewer status-only calls and fewer “did we get approval?” interruptions from techs.
He also expects to answer disputes with one retrieval path and objective timestamps.
---
## 2) Scope, objective, and boundaries
### 2.1 Objective
WS15-L defines the end-to-end discrepancy customer authorization control plane.
The control plane begins when a discrepancy is marked “authorization required.”
The control plane ends when disposition is terminal and legally evidence-backed.
### 2.2 In scope
- Discrepancy authorization request lifecycle
- Customer decision capture and identity assertion
- WO lock/unlock derivation from authorization outcomes
- DOM/QCM exception handling and override controls
- Audit event completeness and retention requirements
- Compliance-safe customer wording hooks
### 2.3 Out of scope
- Technical RTS sign-off itself (covered by broader sign-off flows)
- Final invoice payment processing
- Full aircraft ownership transfer policy
- General customer portal theming/UI polish
### 2.4 Design principles
1. Deterministic state machine (single active state per authorization request)
2. No silent transitions (all transitions produce audit evidence)
3. Policy-driven language and disclaimers (server enforced)
4. Consent is permission to proceed, never airworthiness determination
5. Exception path exists but is constrained, dual-authorized where required
[MARCUS] “Customer approval cannot be represented as technical release authority under Part 43 context.”
---
## 3) Customer authorization state machine for discrepancies
### 3.1 Entity model (authorization object)
Each discrepancy that requires approval maps to `discAuthRequest`.
A request may reference one discrepancy or a policy-approved bundle.
A request has one state from the canonical state list below.
### 3.2 Canonical states
- `DRAFT_INTERNAL`
- `READY_TO_SEND`
- `SENT_PENDING_CUSTOMER`
- `VIEWED_PENDING_CUSTOMER`
- `PARTIAL_RESPONSE_PENDING_RECONCILIATION`
- `APPROVED`
- `DECLINED`
- `EXPIRED_NO_RESPONSE`
- `WITHDRAWN_SUPERSEDED`
- `CANCELLED_ADMIN`
- `ERROR_DELIVERY`
### 3.3 Terminal states
Terminal states are:
- `APPROVED`
- `DECLINED`
- `EXPIRED_NO_RESPONSE`
- `WITHDRAWN_SUPERSEDED`
- `CANCELLED_ADMIN`
Terminal state means the original request no longer accepts customer input.
Supersede creates a new request; it never mutates decision history.
### 3.4 Transition rules (deterministic)
`DRAFT_INTERNAL -> READY_TO_SEND`
- Trigger: coordinator submits request draft
- Guards: discrepancy exists; requested action exists; customer-safe summary exists; liability class assigned
`READY_TO_SEND -> SENT_PENDING_CUSTOMER`
- Trigger: notification dispatch success
- Guards: channel resolved; template policy version approved
`SENT_PENDING_CUSTOMER -> VIEWED_PENDING_CUSTOMER`
- Trigger: customer opens secure link / authenticated session
- Guards: token/session valid and not revoked
`SENT_PENDING_CUSTOMER|VIEWED_PENDING_CUSTOMER -> APPROVED`
- Trigger: customer approves
- Guards: identity assertion met; consent text hash recorded; required acknowledgements complete
`SENT_PENDING_CUSTOMER|VIEWED_PENDING_CUSTOMER -> DECLINED`
- Trigger: customer declines
- Guards: decline reason category captured
`SENT_PENDING_CUSTOMER|VIEWED_PENDING_CUSTOMER -> EXPIRED_NO_RESPONSE`
- Trigger: deadline reached without decision
- Guards: no prior terminal decision
`SENT_PENDING_CUSTOMER|VIEWED_PENDING_CUSTOMER -> PARTIAL_RESPONSE_PENDING_RECONCILIATION`
- Trigger: bundle partly decided
- Guards: bundle mode allowed by policy
`ANY_NON_TERMINAL -> WITHDRAWN_SUPERSEDED`
- Trigger: scope change requiring new customer decision
- Guards: replacement request ID provided
`ANY_NON_TERMINAL -> CANCELLED_ADMIN`
- Trigger: duplicate/wrong-recipient/WO-cancel administrative stop
- Guards: cancellation reason code + actor role captured
`ANY_NON_TERMINAL -> ERROR_DELIVERY`
- Trigger: all dispatch retries fail
- Guards: retry policy exhausted and failure evidence logged
### 3.5 State invariants
1. `APPROVED` requires consent record with text hash and identity assertion metadata.
2. No WO unlock for required discrepancy while request is in non-terminal pending state.
3. Supersede never edits prior request payload; it links old->new chain.
4. Customer-visible status projection must reflect pending approval truth.
5. Every transition must include actor, timestamp, reason code, and policy version.
### 3.6 WO derived authorization state
WO-level derived state synthesizes all discrepancy auth requests:
- `WO_AUTH_CLEAR`
- `WO_AUTH_PENDING`
- `WO_AUTH_PARTIAL_BLOCK`
- `WO_AUTH_FULL_BLOCK`
- `WO_AUTH_EXCEPTION_REVIEW`
Derivation rules:
- Any required pending auth => at least `WO_AUTH_PENDING`
- Any required decline affecting safety route => `WO_AUTH_FULL_BLOCK`
- Mixed approved/undecided in bundle => `WO_AUTH_PARTIAL_BLOCK`
- Active approved exception => `WO_AUTH_EXCEPTION_REVIEW`
[DANNY] “Coordinator dashboard needs this as traffic-light priority, not buried metadata.”
### 3.7 AOG behavior in state machine
AOG is orthogonal urgency context.
AOG escalates notification and queue priority.
AOG does not auto-convert pending states to approved.
Emergency continuity requires explicit exception workflow (see Section 5).
[MARCUS] “Urgency may alter process speed, not legal meaning of consent.”
### 3.8 Timeouts and reminders
Recommended baseline policy:
- Reminder 1 at 2h pending
- Reminder 2 at 6h pending
- Coordinator escalation at 24h pending
- Auto-expiry at configurable horizon (e.g., 72h) unless AOG/DOM extension
Each reminder event is audit logged with channel and outcome.
---
## 4) Liability and consent capture model
### 4.1 Consent record schema (minimum)
Required fields per decision:
- `consentRecordId`
- `discAuthRequestId`
- `decision` (`approve|decline`)
- `decisionAtUtc`
- `decisionChannel` (`portal|email_link|assisted_phone`)
- `customerDeclaredName`
- `customerRelationship` (`owner|operator|authorized_agent|other`)
- `identityAssuranceLevel`
- `identityAssertionMethod`
- `consentTextVersion`
- `consentTextHash`
- `disclaimerVersion`
- `scopeSummaryHash`
- `costRangePresented`
- `costRangeAccepted`
- `sessionId` (if digital)
- `ipAddress` (if digital, policy-permitted)
- `userAgentDigest` (if digital)
- `witnessCoordinatorId` (required for assisted phone)
- `recordIntegrityHashVersion`
[MARCUS] “Store the exact text rendered to customer; never reconstruct post hoc.”
### 4.2 Liability classing for discrepancy approvals
Authorization request must carry `liabilityClass`:
- `LC1_ROUTINE_NON_SAFETY`
- `LC2_OPERATIONAL_SAFETY_RELEVANT`
- `LC3_REGULATED_CRITICAL`
Class controls required identity level, copy constraints, and exception strictness.
### 4.3 Identity assurance policy by class
- LC1: minimum `IAL1` (secure token link + channel possession)
- LC2: preferred `IAL2` (authenticated portal account + MFA), fallback `IAL1` by policy flag
- LC3: minimum `IAL2`; assisted path allowed only under controlled exception
### 4.4 Consent language requirements
Customer-facing authorization text must include:
1. high-level finding summary in customer-safe wording
2. action requested from customer
3. estimated impact/range caveat
4. consequence of no response or decline
5. explicit statement that technical release remains certificated personnel responsibility
Forbidden implications:
- “Customer approval certifies airworthiness”
- “This approval completes release authority”
- “No further technical checks required”
[MARCUS] “Any wording that collapses consent into release authority is prohibited.”
### 4.5 Assisted phone consent protocol
Assisted phone path is permitted but structured.
Required capture:
- start/end timestamps
- caller/callback identity check result
- verification questions script version
- coordinator witness identity
- recording reference where lawful and enabled
- immediate conversion to structured consent record
[DANNY] “Phone approvals happen in the real world; system should formalize, not pretend they don’t.”
### 4.6 Scope drift invalidation logic
If approved request scope materially changes, prior approval must be superseded.
Material change triggers include:
- cost delta > configured threshold
- added affected systems/components not in approved summary
- class change to higher liability level
- revised discrepancy disposition category
Action: auto-mark old request `WITHDRAWN_SUPERSEDED` and issue replacement.
### 4.7 Decline handling model
Decline requires category capture:
- `cost_not_approved`
- `defer_preference`
- `seeking_second_opinion`
- `timing_constraint`
- `other`
Free text note optional but category mandatory.
Decline effect on WO is policy-driven and may trigger full block.
### 4.8 Delegated authority handling
If responder is not owner, delegated authority evidence is required.
Evidence options:
- pre-registered authorized contact role
- explicit owner delegation on file
- coordinator-assisted documented authority confirmation
Missing delegation evidence => decision held in review state, not auto-accepted.
---
## 5) DOM/QCM override and exception handling policy
### 5.1 Policy intent
Overrides are rare, controlled, and reviewable.
Exception pathways exist to handle edge conditions without breaking legal traceability.
[DANNY] “We need a release valve, but not a loophole.”
### 5.2 Allowed exception classes
- `EXC_DELIVERY_RECOVERY`
- `EXC_IDENTITY_FALLBACK`
- `EXC_AOG_EMERGENCY_CONTINUITY`
- `EXC_BUNDLE_SPLIT_RECONCILIATION`
- `EXC_METADATA_CORRECTION_LOCKED`
### 5.3 Disallowed actions (absolute)
No exception may:
- invent consent where none was given
- rewrite terminal customer decision
- remove or suppress audit evidence
- alter rendered consent text of completed decision
- bypass LC3 required controls without dual-authorized emergency policy
[MARCUS] “Unlogged exception equals noncompliant behavior.”
### 5.4 Authority matrix
`EXC_DELIVERY_RECOVERY`
- Approver: coordinator supervisor or DOM delegate
`EXC_IDENTITY_FALLBACK`
- Approver: DOM + QCM dual approval
`EXC_AOG_EMERGENCY_CONTINUITY`
- Approver: DOM + compliance delegate (or designated proxy)
`EXC_BUNDLE_SPLIT_RECONCILIATION`
- Approver: coordinator lead; DOM notified
`EXC_METADATA_CORRECTION_LOCKED`
- Approver: QCM
### 5.5 Exception workflow states
- `EXC_DRAFT`
- `EXC_SUBMITTED`
- `EXC_APPROVED`
- `EXC_REJECTED`
- `EXC_EXECUTED`
- `EXC_EXPIRED`
Every executed exception references target request IDs and WO.
### 5.6 TTL, scope, and guardrails
Each approved exception must include:
- activation time
- expiration time
- explicit allowed actions
- explicit forbidden actions
Expired exceptions hard-fail if invoked.
Out-of-scope action attempts are blocked and audited.
### 5.7 Rationale and risk acknowledgement
Required narrative fields:
- operational trigger
- risk acknowledged
- mitigation steps
- follow-up owner
- expected closure date
This text supports shift handoff and compliance review.
### 5.8 Post-execution governance
All exceptions auto-enqueue for weekly compliance review.
Review outcomes:
- acceptable usage
- policy tuning recommendation
- targeted training action
- suspected misuse escalation
Override frequency dashboards are mandatory.
[MARCUS] “Growing override volume is a control-design smoke alarm.”
---
## 6) Audit trail and legal evidence retention requirements
### 6.1 Event completeness model
Every meaningful event emits append-only audit entry with:
- event ID
- event type
- target entity type/id
- work order ID
- actor type/id/role
- timestamp UTC
- before/after state
- reason code
- policy/template version
- metadata digest
- request/session context where applicable
### 6.2 Must-log events (minimum set)
1. discrepancy marked authorization-required
2. auth request draft created
3. draft validation pass/fail
4. request sent attempt + outcome
5. retry and delivery failure events
6. customer view/open event
7. customer approve/decline submission
8. consent record persistence success/fail
9. WO gate lock/unlock recomputation
10. supersede and cancellation transitions
11. expiry job transitions
12. exception requested/approved/executed/expired
13. legal evidence export request and retrieval
### 6.3 Immutability requirements
- No destructive updates on terminal decision records
- No delete operations on audit log entries
- Corrections represented by additive correction events
- Hash/version metadata retained for integrity verification
[MARCUS] “Inspector-grade traceability requires additive history, not rewritten history.”
### 6.4 Retention periods (baseline policy)
- Consent and decision artifacts: >= 7 years
- Authorization transition audit logs: >= 7 years
- Exception records: >= 7 years
- Delivery/view proofs and access telemetry: >= 3 years
- Export manifests and integrity proofs: >= 7 years
Legal hold supersedes retention expiry.
### 6.5 Retrieval and discoverability
Evidence must be queryable by:
- work order ID
- discrepancy ID
- customer identifier
- date/time range
- decision type
- exception class
- actor ID
Target retrieval SLA for legal/compliance requests: same business day.
### 6.6 Evidence export package requirements
Export bundle must include:
- discrepancy snapshot at request creation
- exact rendered customer text with template/version hash
- all decision and transition events
- identity assurance metadata
- exception artifacts if used
- integrity manifest (hashes + algorithm versions)
Formats: machine-readable JSON + human-readable PDF summary.
### 6.7 Privacy and minimization constraints
Store only data required for consent evidence and defensibility.
Operational screens should mask sensitive technical and personal fields.
IP/user-agent retention must follow approved policy and jurisdiction limits.
[MARCUS] “Data minimization and evidence sufficiency must be explicitly balanced, never accidental.”
---
## 7) Test plan skeleton with edge cases
### 7.1 Test domains
1. State machine correctness and determinism
2. Consent capture completeness
3. Identity assurance enforcement
4. WO lock/unlock behavior
5. Exception/override policy controls
6. Audit completeness and immutability
7. Customer wording policy validation
8. Failure handling and recovery
### 7.2 Functional baseline scenarios
- Create request from discrepancy
- Send request and verify delivery proof
- Customer approves and WO unlock recomputes
- Customer declines and WO block behavior enforced
- Request expires and escalation path triggers
- Request superseded due to scope drift
### 7.3 Edge-case matrix (skeleton)
`WS15L-T01` Duplicate send retry collision
- Expect idempotent behavior, one active pending request
`WS15L-T02` Revoked token attempts action
- Expect denial + attempted-access audit log
`WS15L-T03` Partial response in bundle
- Expect partial reconciliation state and accurate WO partial block
`WS15L-T04` Approval at expiry boundary second
- Expect deterministic server-time tie-break outcome
`WS15L-T05` Scope changes after approval
- Expect auto-supersede and replacement request creation
`WS15L-T06` Assisted phone approval without witness
- Expect reject consent write and policy error
`WS15L-T07` LC3 request under insufficient identity assurance
- Expect hard fail until required level met
`WS15L-T08` Exception attempts decline->approve rewrite
- Expect prohibited action block and compliance alert
`WS15L-T09` Dispatch provider outage and fallback success
- Expect error-delivery event chain + eventual sent state
`WS15L-T10` Audit sink transient outage during transition
- Expect atomic abort or durable queue, never silent event loss
`WS15L-T11` Concurrent customer/coordinator submissions
- Expect optimistic concurrency resolution and single terminal outcome
`WS15L-T12` AOG with pending LC3 authorization
- Expect urgency escalation but guardrail remains active
`WS15L-T13` Stale template version at customer submit
- Expect submission reject + forced refresh to current approved text
`WS15L-T14` Evidence export under legal hold
- Expect export allowed with hold metadata preserved
`WS15L-T15` Manual admin cancel after terminal decision
- Expect block; use additive correction flow only
### 7.4 Non-functional targets
- p95 discrepancy->request generation <= 60 sec
- p95 decision->WO gate recompute <= 30 sec
- p95 customer notification dispatch <= 120 sec
- Load test 500 concurrent pending requests without state drift
- Retry storm resilience under notification API failures
### 7.5 Compliance test assertions
- 100% required transitions audited
- 0 prohibited phrases in rendered customer text corpus
- Hash reproducibility verified across environments
- Evidence export package passes completeness checklist
- Failed attempts logged with reason code and actor context
[MARCUS] “Failed attempts are often more probative than successful ones.”
### 7.6 SME UAT slices
[DANNY] Required UAT patterns:
- after-hours phone approvals with follow-up proof
- owner vs operator authorization ambiguity
- AOG pressure decisions with uncertain parts ETA
- mixed approve/decline bundles on same WO
Success KPI: reduction in coordinator follow-up touches per discrepancy.
---
## 9) Governance and change control
Policy artifacts requiring formal approval:
- customer discrepancy summary templates
- consent and disclaimer copy sets
- liability classification rules
- identity assurance table
- exception class catalog and authority matrix
- retention schedule and export manifest schema
Required approvers:
1. Product owner
2. DOM delegate
3. Compliance owner
4. Optional legal counsel for high-risk copy changes
No production publish without:
- approval signatures complete
- regression evidence package attached
- policy version increment logged
[MARCUS] “Unapproved copy changes are a direct liability vector.”
---
## 10) WS15-L verdict
## **VERDICT: CONDITIONAL PASS**
WS15-L is structurally sound and aligned with both operational and compliance constraints.
The proposed state model is deterministic and auditable.
The consent model is evidence-forward and legally safer than current verbal-note workflows.
The exception policy is constrained enough to preserve control integrity.
### 10.1 Why conditional (not full pass)
Full PASS is blocked until implementation evidence confirms:
1. Server-side guard enforcement (no frontend-only control assumptions)
2. Consent text hashing/version-lock implementation
3. Identity-level enforcement by liability class
4. Immutable audit/event coverage for success and failure paths
5. Exception authority gates + TTL boundaries
6. End-to-end evidence export and retrieval in staging drills
### 10.2 Risk note
Primary risk is implementation drift from hard blocks to soft warnings under schedule pressure.
Secondary risk is incomplete assisted-phone proof normalization in high-volume periods.
Both risks are manageable with strict test and governance controls.
[MARCUS] “Conditional pass authorizes build progression, not policy relaxation.”
[DANNY] “Close these gates and this flow will cut authorization churn materially.”
### 10.3 Release recommendation
Proceed in two increments:
- Increment A: state engine, guards, audit, coordinator queue tooling
- Increment B: customer decision surfaces, notification hardening, export UX
Do not launch broad customer access until conditions are closed with test evidence.
---
## 11) Closing technical statement
WS15-L should be implemented as a compliance-aware control surface, not a convenience UI.
The critical distinction is preserved: customer consent permits scope progression; certificated maintenance release authority remains separate.
If deterministic transitions, immutable evidence, and policy-locked wording remain intact, WS15-L is defensible and high leverage.
If those are diluted, the system reintroduces the exact ambiguity this workstream is intended to remove.
