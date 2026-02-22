# Phase 7 Hardening: Export & Audit Operational Readiness
Author: Marcus Webb (Regulatory)
Inline notes: Carla Ostrowski (DOM), Jonas Harker (Platform)
Date: 2026-02-22
Status: Operational standard for inspector-on-demand response
Decision class: Mandatory readiness control
---
## 0) Purpose and operating posture
This document defines how Athelon produces audit-ready export packets on demand.
It is not a feature overview.
It is a compliance runbook.
If the runbook cannot be executed under pressure, readiness is false.
If packet content is incomplete on paper, readiness is false.
If evidence chain is unclear, readiness is false.
Phase 6 closed the existence gap (export now available).
Phase 7 closes the reliability and defensibility gap (export always inspection-ready).
Operational trigger:
- Inspector request is received.
- DOM requests packet immediately.
- Packet must be produced without engineering intervention.
Service targets:
- Class A single-record packet: <= 10 minutes from intake to DOM-ready handoff.
- Class B multi-record work-order packet: <= 20 minutes.
[Carla] “Screens turn off” remains the field test.
[Carla] Packet must stand without app access.
[Jonas] Time targets assume healthy Convex and print route availability.
---
## 1) Definitions and control terms
Audit-ready export packet:
A portable package containing ordered §43.9-relevant data, signature identity, certificate references, integrity hash visibility, correction-chain visibility, QCM state, and a complete audit timeline sufficient for inspector review without live database access.
Packet classes:
- Class A: single maintenance record packet.
- Class B: work-order packet including associated records.
- Class C: exception packet for failed export (failure evidence + escalation trail).
Readiness states:
- Ready: all controls green.
- Conditional: functionally available, evidence discipline degraded.
- Not Ready: packet cannot be produced defensibly.
Hard-fail condition (any one triggers Not Ready):
- Missing cert identity in required signature block.
- Truncated legally material text.
- Hash hidden, shortened, or omitted.
- Correction history overwritten or absent where correction exists.
- Audit trail incomplete or non-chronological.
---
## 2) Roles and accountable ownership
DOM (Carla model):
- Requests and reviews packet.
- Owns operational pass/fail before inspector handoff.
- Triggers immediate escalation when packet is non-defensible.
Regulatory authority (Marcus role):
- Defines compliance pass/fail bars.
- Approves readiness criteria and drill standards.
- Owns defensibility language for audit posture.
Platform owner (Jonas role):
- Owns environment health and build parity.
- Owns release manifest integrity and evidence retention controls.
- Owns incident bridge startup for export failure conditions.
QA lead:
- Runs drills and challenge scenarios.
- Maintains evidence checklist and verifier discipline.
- Confirms regression controls remain live.
Engineering (Backend + Frontend):
- Maintains canonical export action, ordered serializer, print route, mandatory audit writes, and verification utilities.
RACI summary:
- Responsible: Platform, Engineering, QA.
- Accountable: Regulatory authority.
- Consulted: DOM.
- Informed: Operations leadership.
[Carla] DOM is final gate before inspector-facing handoff.
[Jonas] Platform must present release manifest proof within 60 seconds on demand.
---
## 3) Operational runbook: producing packets on demand
### 3.1 Intake and request logging
Step 1: Receive request source and classify urgency.
- Allowed requesters: Inspector, DOM, authorized legal hold request.
- Required log fields: requester identity, timestamp UTC, requested tail number, work order, record IDs, and request scope.
Step 2: Open Export Response Log entry.
- Generate token format: `EXR-YYYYMMDD-###`.
- Start SLA clock at token creation.
Step 3: Classify request type.
- Standard: single packet, no immediate lobby pressure.
- Broad: multi-record packet for same WO or tail range.
- Urgent: inspector physically waiting (default if onsite).
[Carla] If inspector is in lobby, classify as Urgent without debate.
### 3.2 Preflight controls (mandatory before generation)
Step 4: Confirm build parity and environment control.
- Verify frontend commit hash equals approved release manifest.
- Verify backend deployment hash equals approved release manifest.
- If mismatch: stop generation, escalate Platform immediately.
Step 5: Confirm authorization context.
- Exporter must be authorized org member.
- Exporter identity must be captured in `record_exported` event.
Step 6: Confirm data scope validity.
- Record(s) must exist.
- Record org must match caller org.
- If mismatch: fail closed, produce Class C exception packet.
Step 7: Confirm service health.
- Export action path reachable.
- Audit log write path reachable.
- Evidence store reachable.
- If any fail: invoke Section 8 escalation.
[Jonas] Preflight should be script-backed and output a one-screen PASS/FAIL summary.
### 3.3 Packet generation sequence
Step 8: Invoke canonical export action only.
- Use Phase 6 contract path (`exportMaintenanceRecord`).
- Request format: `both` for inspector scenarios.
- JSON remains canonical payload.
- PDF remains handling-friendly artifact.
Step 9: Capture generation metadata.
- exportVersion
- generatedAt (epoch + ISO)
- exporter identity
- record ID(s)
- work order ID
Step 10: Confirm mandatory `record_exported` audit event exists.
- No event means no handoff.
- No exception pathway allowed.
Step 11: Assemble packet bundle.
- Include PDF.
- Include canonical JSON.
- Include appendix sheet (core IDs + hash values + export audit event ID).
- Include fidelity verifier receipt.
Step 12: Apply immutable naming convention.
- Bundle: `ATHELON_AUDIT_PACKET_<TAIL>_<WO>_<UTCSTAMP>_v<exportVersion>.zip`
- Internal files use fixed names for downstream automation.
Step 13: Compute bundle checksum.
- Store checksum in evidence ledger.
- Include checksum in Export Response Log.
Step 14: Route packet to DOM review queue.
- Use approved secure internal channel only.
- No public messaging channels.
[Carla] DOM review is not optional paperwork; it is the legal gate.
### 3.4 DOM review and release decision
Step 15: Run first-page scan (<= 90 seconds).
- Who did work.
- Under what Part 145 authority.
- Aircraft and WO identity.
- Timestamp context.
Step 16: Run integrity and correction scan.
- Full hash visible and labeled.
- Verification status visible and intelligible.
- Correction chain visible or explicit none line.
- QCM status explicit (reviewed or not recorded).
Step 17: Declare pass/fail.
- Pass: authorize inspector handoff.
- Fail: trigger Section 8 escalation procedure.
Step 18: Log handoff event.
- Recipient identity.
- Time of handoff.
- Packet checksum.
- DOM declaration statement.
[Carla] If I cannot defend packet content in two minutes, it is not ready.
### 3.5 Completion and archive
Step 19: Archive full event artifacts in evidence store.
- Tag by EXR token, tail, WO, record IDs, and UTC date.
Step 20: Close Export Response Log entry.
- Record SLA outcome.
- Record defects, caveats, and follow-up ticket IDs.
Step 21: For urgent events, issue 15-minute post-response debrief.
- What worked.
- What delayed.
- What failed.
- Named owner for next corrective action.
---
## 4) Human factors: DOM expectations and failure intolerance
### 4.1 Field reality assumptions
DOM does not evaluate animation quality in audit moments.
DOM evaluates legal survivability.
DOM assumes interruption and pressure.
DOM assumes first impression may determine inspection posture.
### 4.2 First-impression design rules
Rule 1: Page one must answer identity and scope immediately.
- Who performed the work.
- Under which repair station authority.
- On which aircraft/work order.
Rule 2: No hunting behavior in packet.
- Inspector should not need app navigation.
- Inspector should not decode opaque IDs to understand facts.
Rule 3: No expandable-content dependency.
- Legally material content must be visible on paper.
Rule 4: No color-only semantics.
- Grayscale output must preserve meaning.
[Carla] If copier output breaks meaning, output is operationally defective.
### 4.3 Failure intolerance points (non-negotiable)
Immediate fail conditions:
- Missing A&P/IA cert value where required.
- Signature timestamp tied to session start rather than action time.
- Hash shown as partial token only.
- Correction exists in source but absent in export.
- Work performed text clipped or unreadable across page boundaries.
- QCM state silently absent.
- Timeline events missing actor or time ordering.
No conditional pass permitted for the above defects.
### 4.4 Stress behavior and control design
Operators under pressure skip optional checks.
Therefore, compliance-critical checks must be mandatory and explicit.
Soft warnings for release-critical defects are unacceptable.
Hidden warnings are equivalent to no warning.
[Carla] Yellow warning patterns caused prior real-world failures.
[Jonas] Hard-stop preflight and verifier gates should enforce this automatically.
### 4.5 Language standards for cognition under pressure
Required explicit labels:
- A&P Certificate Number
- IA Certificate Number
- Signature Timestamp (UTC)
- SHA-256 Hash (Full)
- No corrections recorded
- QCM review not recorded at export time
Avoid ambiguous labels:
- Credential
- Ref ID
- Signed at
- Integrity token
---
## 5) Export fidelity checks (mandatory before handoff)
All checks run immediately after packet generation.
Checks are machine-assisted and human-affirmed.
No packet handoff before complete pass.
### 5.1 Group A: completeness and no truncation
A1: Verify `workPerformed` char-length parity (source vs export).
A2: Verify approved data references are fully rendered (including revision markers).
A3: Verify parts trace fields appear where applicable (P/N, S/N, trace/8130).
A4: Verify multi-page overflow preserves full text (no hidden clipping).
A5: Verify null-required fields are rendered explicitly (no silent omissions).
[Jonas] Char-count parity should be automated in verifier utility output.
### 5.2 Group B: certificate correctness
B1: Signer legal name present.
B2: A&P cert present where A&P authority used.
B3: IA cert present where IA-required path executed.
B4: IA value must not fallback to A&P value.
B5: Certificate values must match source snapshot at sign time.
B6: Signature timestamp must be action-time, not auth-session time and not export time.
[Carla] Certificate identity is legal personhood in audit records.
### 5.3 Group C: hash visibility and integrity
C1: Full SHA-256 value (64 chars) visible in packet.
C2: Verification status shown in plain language (`IDENTICAL` or `MISMATCH`).
C3: Independent recompute parity check executed.
C4: Canonical input-order fixture version recorded in receipt.
C5: Hash evidence must exist on paper, not app-only.
[Jonas] Recompute output should be attachable as plain text and machine-readable JSON.
### 5.4 Group D: correction chain visibility
D1: Original entry remains visible when correction exists.
D2: Corrected-by linkage visible.
D3: Changed fields and before/after values visible.
D4: Correction reason visible.
D5: Corrector identity and cert values visible.
D6: Correction timestamp visible.
D7: If none, explicit “No corrections recorded” line present.
[Carla] Additive correction chain is mandatory. Overwrite behavior is disqualifying.
### 5.5 Group E: audit timeline coherence
E1: Timeline sorted chronologically.
E2: Each event shows actor identity.
E3: Required events present where applicable:
- signature auth
- sign completion
- qcm_reviewed
- record_exported
E4: Event timestamps coherent with signature blocks.
E5: Appendix IDs correlate to timeline events.
### 5.6 Fidelity receipt standard
Each packet must include `fidelity-receipt.txt` with:
- EXR token
- packet filename
- verifier version
- pass/fail per group A-E
- explicit failure reasons if any
- reviewer initials
- UTC timestamp
No fidelity receipt means no readiness claim.
---
## 6) Audit-drill cadence and evidence retention
### 6.1 Drill objectives
- Prove repeatable response under pressure.
- Prove packet quality and evidentiary completeness.
- Prove escalation correctness on failure.
- Prove retention discipline over time.
### 6.2 Cadence requirements
Weekly micro-drill:
- One Class A packet from random closed WO.
- SLA target <= 10 minutes.
Biweekly scenario drill:
- Class B packet with correction chain presence.
- Include DOM review simulation.
- SLA target <= 20 minutes.
Monthly inspector-lobby drill:
- Urgent classification.
- Live timer and full cross-functional response.
- Targets: packet to DOM <= 8 minutes; DOM decision <= 3 minutes.
Quarterly adversarial drill:
- Inject controlled failure class (hash mismatch, audit write delay, missing cert, or truncation).
- Team must fail closed and escalate correctly.
[Jonas] Timer source must be centralized and immutable in logs.
### 6.3 Drill scoring model
Scored dimensions:
- Timeliness
- Packet completeness
- Fidelity verification rigor
- Handoff quality
- Escalation discipline
- Evidence packaging completeness
Score bands:
- Green: all critical controls pass.
- Amber: only non-critical defect; corrective action logged.
- Red: any hard-fail defect.
Governance rules:
- Two consecutive Amber in same dimension triggers remediation plan.
- Any Red forces readiness downgrade (Conditional or Not Ready) pending closure.
### 6.4 Evidence retention requirements
Retention classes:
- Operational drill evidence.
- Real inspector-response evidence.
- Failure-incident evidence.
Minimum retention periods:
- Drill evidence: 24 months.
- Inspector-response packets: 60 months.
- Compliance-impacting failures: 84 months.
Required stored artifacts per event:
- Packet ZIP
- Fidelity receipt
- Export Response Log
- Release manifest snapshot (frontend/backend hashes)
- DOM declaration
- Escalation transcript if failure occurred
Immutability requirements:
- Evidence store is append-only for retained artifacts.
- Metadata corrections create new entries (no overwrite).
Access control requirements:
- Read: DOM, Regulatory, Platform lead, designated QA.
- Write: approved service accounts and authorized operators.
- Delete during retention term: prohibited.
[Carla] “Regenerate later” is not acceptable evidence strategy.
### 6.5 Drill auditability controls
Every drill must write a drill-audit record including:
- Scenario seed and selected IDs.
- Pass/fail outcome and rationale.
- Corrective actions and owners.
- Closure confirmation of prior related actions.
No informal “we tested it” statements allowed in readiness reporting.
---
## 7) Escalation procedure when packet fails validation
### 7.1 Failure classes
F1: Content fidelity failure (truncation, missing cert, absent correction visibility).
F2: Integrity failure (hash mismatch, canonical order drift).
F3: Audit continuity failure (missing `record_exported`, timeline gaps).
F4: Platform failure (export route down, render failure, storage outage).
### 7.2 Immediate response (first 5 minutes)
Action 1: Fail closed; do not handoff defective packet.
Action 2: Notify DOM and Platform lead with failure class + scope.
Action 3: Open incident ticket severity:
- SEV-1 if active inspector wait.
- SEV-2 otherwise.
Action 4: Preserve failed artifacts as Class C exception packet.
Action 5: Start incident bridge for SEV-1 (Platform, Backend, Frontend, QA, Regulatory, DOM).
[Jonas] SEV-1 bridge start target is <= 3 minutes after declaration.
### 7.3 Decision tree while inspector is waiting
Path A: If prior validated packet exists for same scope, DOM may provide with explicit disclosure note.
Path B: If no defensible alternate exists, DOM issues controlled delay statement.
Path C: If integrity-impacting defect present, declare records under review and escalate to compliance counsel path.
[Carla] Never bluff with an incomplete packet.
### 7.4 Technical remediation sequence
Remediation 1: Identify failing layer (source data, serializer, render, audit write, verifier).
Remediation 2: Reproduce deterministically on controlled test record.
Remediation 3: Patch and run targeted regression set:
- no truncation
- cert correctness
- hash parity
- correction visibility
- mandatory audit write
Remediation 4: Deploy with updated manifest and recorded hashes.
Remediation 5: Regenerate packet and rerun full fidelity checks; require DOM re-approval.
### 7.5 Communication protocol
At declaration (0 min): state issue, impacted scope, next update time.
Update cadence:
- Every 10 minutes for SEV-1.
- Every 30 minutes for SEV-2.
Resolution message must include:
- root cause
- affected controls
- fix implemented
- verification evidence
- residual risk
No “resolved” status without verifier receipt and DOM signoff.
### 7.6 Post-incident closure requirements
Within 24 hours: incident summary.
Within 72 hours: corrective action plan with owners + dates.
Within 7 days: confirmatory drill reproducing same failure class.
Repeat of same class within 30 days triggers readiness downgrade.
---
## 8) Readiness sign-off criteria for “inspector in lobby”
All criteria below are mandatory unless explicitly marked advisory.
Failure of any mandatory criterion is No-Go.
### 8.1 Preconditions
C1: Current release manifest available and valid.
C2: Export runbook primary and backup owners on shift.
C3: Most recent weekly drill status is Green.
C4: No open Red corrective actions tied to export fidelity.
C5: Evidence store reachable and writable.
### 8.2 Execution controls
C6: EXR token created at intake.
C7: Packet generated via canonical action path only (no manual stitching).
C8: Mandatory `record_exported` event confirmed.
C9: Fidelity groups A-E all pass.
C10: DOM review complete with explicit pass declaration.
C11: Packet checksum logged in response log.
C12: Handoff event logged with recipient and UTC timestamp.
### 8.3 Quality bars
Q1: No truncation in legally material text.
Q2: Certificate identity complete and correct.
Q3: Full hash visible with recompute parity confirmed.
Q4: Correction chain visible or explicitly absent.
Q5: Audit timeline complete and coherent.
Q6: First page inspector-order readable.
Any Q-bar failure = No-Go.
### 8.4 Timing bars for urgent response
T1: Preflight <= 2 minutes.
T2: Generation + verification <= 6 minutes.
T3: DOM final review <= 3 minutes.
Total urgent target <= 11 minutes from intake to handoff authorization.
Timing interpretation:
- Timing miss without quality defect: Amber.
- Timing miss with quality defect: Red.
### 8.5 Sign-off statement template
Required language:
“Export packet reviewed under Phase 7 operational readiness standard. All mandatory fidelity checks passed. Certificate identity, integrity evidence, correction visibility, and audit chronology are complete on the face of the packet. Authorized for inspector handoff.”
Required signatories:
- DOM
- Platform lead (or approved delegate)
- QA witness (drill scenarios)
[Carla] Soft wording generally means unresolved defects.
---
## 9) Tooling and automation controls
Required utilities:
- U1 Preflight checker (manifest parity, service reachability, auth context).
- U2 Fidelity verifier (groups A-E with machine-readable output).
- U3 Packet assembler (naming, checksum, archive write, ledger update).
- U4 Timer logger (immutable SLA stamps).
Automation boundaries:
- Automation may collect, verify, and package.
- Automation may not waive critical checks.
- Human DOM review remains mandatory.
CI/CD guardrails:
- Block deploy if canonical order fixture changes without regulatory approval note.
- Block deploy if long-text export tests detect truncation.
- Block deploy if IA/A&P separation tests fail.
- Block deploy if `record_exported` write tests fail.
[Jonas] Controls must be enforced in release pipeline, not optional scripts.
---
## 10) Reporting and governance
Weekly readiness report must include:
- Drill count and outcomes.
- Average and P95 response times.
- Failure classes observed.
- Open corrective actions by age.
- Evidence retention exceptions (target: zero).
Monthly governance review must include:
- Amber/Red trendline.
- Root-cause concentration by control family.
- Release parity exceptions.
- DOM regulatory observations.
- Decision: maintain, tighten, or downgrade readiness state.
Any downgrade to Not Ready requires same-day executive notification.
---
## 11) Phase 7 exit criteria
Exit only when all are true:
- E1: Eight consecutive weekly drills Green.
- E2: Two monthly inspector-lobby drills Green with <= 11 minute total.
- E3: Zero unresolved Red corrective actions.
- E4: Evidence retention audit shows 100% artifact completeness for prior 60 days.
- E5: DOM attests packet quality is inspection-defensible without engineering help.
- E6: Regulatory review confirms no open hard-fail exposure in sections 4 and 5.
If any criterion regresses, exit status is revoked pending re-qualification.
---
## 12) Non-compliance consequences
If runbook steps are bypassed, readiness claim is invalid.
If packet is handed off without fidelity receipt, event is logged as process breach.
If cert identity/hash defects recur without closure, governance escalates to controlled release freeze.
[Carla] Compliance debt compounds faster than feature debt.
---
## 13) Final regulatory position
Phase 6 proved export capability exists.
Phase 7 must prove export capability is operationally reliable, human-safe under pressure, and evidentially defensible.
The standard is not “can generate PDF.”
The standard is “can defend the record in front of an inspector, immediately, on paper.”
This runbook is binding operational policy for export and audit readiness.
It is not advisory.
Signed:
Marcus Webb, Regulatory
Carla Ostrowski, DOM (operational concurrence)
Jonas Harker, Platform (execution concurrence)
