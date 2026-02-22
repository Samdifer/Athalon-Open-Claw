# Athelon Phase 6 Alpha Launch — Deployment Execution Record
Author: Jonas Harker (DevOps/Platform)
Date: 2026-02-27
Context: Thursday retest with Carla, Dale, and Renata in 5 days.
Type: Execution log + updated runbook.
## 0) Ground rule
This is not design documentation.
This is what I execute, verify, and sign.
If any gate is red, we do not launch.
No exceptions.
## 1) Alpha day post-mortem actions
### 1.1 GO-LIVE-11 PDF export failure
What failed:
- Export payload query existed.
- UI export path and/or PDF action was not functionally present in launch flow.
- Carla ran the exact export test and found no acceptable path.
Impact:
- No inspector-ready file from the system.
- No defensible system-of-record claim.
Ownership split:
- Jonas: deployment correctness, gate enforcement, retest evidence.
- Devraj: backend PDF action integrity and error codes.
- Chloe: export UI trigger, role visibility, and user feedback states.
What I (Jonas) fix directly:
- Verify export action deployment in target Convex environment.
- Verify export control visibility for authorized roles in deployed UI.
- Execute create/void/export flow in production-like environment.
- Open downloaded PDF and verify mandatory identifying and signature fields.
- Block launch immediately on GO-LIVE-11 failure.
What I hand to Devraj:
- Implement/finalize deterministic PDF generation action.
- Ensure complete required field set and section order.
- Provide explicit error codes for export failures.
What I hand to Chloe:
- Ensure export action is discoverable and wired.
- Ensure loading/success/error states are unambiguous.
Done means:
- Export button exists where expected.
- PDF downloads and opens.
- PDF contains correct org, aircraft, signer, timestamps, and record data.
- GO-LIVE-11 passes with no workaround.
### 1.2 SHA-256 canonical field ordering mismatch
What failed:
- Hash output format valid (64-char lowercase hex).
- Canonical order in docs did not fully match implementation order.
Impact:
- Internal verify can pass while external independent verify confidence drops.
Ownership split:
- Jonas: launch block + proof capture.
- Devraj: canonical source reconciliation and test lock.
What I (Jonas) fix directly:
- Require spec/impl alignment before Thursday go decision.
- Run independent recompute against documented order.
- Store proof in deployment record.
What I hand to Devraj:
- Reconcile field order one time and freeze it.
- Add positional order tests.
- Version canonical format and document it.
Done means:
- Documented order equals runtime order.
- Independent recompute matches stored hash.
- Marcus can verify without code archaeology.
### 1.3 Live subscription bug (QCM dashboard stale)
What failed:
- QCM review committed in DB.
- Dashboard did not consistently update without refresh.
Impact:
- Operational confusion and trust loss.
- Risk of duplicate reviewer actions.
Ownership split:
- Jonas: make realtime convergence a hard gate.
- Chloe: subscription/state update fix.
- Devraj: query/index determinism if needed.
What I (Jonas) fix directly:
- Add two-session realtime test to Thursday checklist.
- Measure commit-to-UI convergence.
- Fail launch if manual refresh required.
Done means:
- Session A submit updates Session B near-real-time.
- No refresh required.
### 1.4 Accountability statement
I own launch control.
I do not own every feature implementation.
I own refusing launch when controls fail.
## 2) Deployment Day 1 execution log
Execution date: 2026-02-27
Executor: Jonas Harker
Target sequence: dev first, then staging/prod after checks.
### 2.1 Preflight commands
```bash
pwd
node --version
npx convex --version
git rev-parse --short HEAD
```
Success:
- Correct workspace, runtime, and CLI.
- Commit hash recorded.
Fail action:
- Stop and correct local toolchain first.
### 2.2 Convex deploy to dev
```bash
npx convex dev --once
npx convex deploy
```
Success:
- No compile/schema errors.
- Functions register.
- Deployment timestamp updates.
Fail action:
- Capture logs.
- Fix schema/TS issue.
- Re-deploy before next step.
### 2.3 Schema verification
Dashboard checks:
- Required tables present.
- `parts.location` includes `pending_inspection`.
- `auditLog.eventType` includes `qcm_reviewed`.
- Deployment info timestamp current.
Optional:
```bash
npx convex env --deployment athelon-dev
```
Pass = all checks true.
Fail = correct schema and redeploy.
### 2.4 Clerk webhook registration
Required events only:
- session.reAuthenticated
- user.created
- user.updated
- organizationMembership.created
- organizationMembership.deleted
Secret requirement:
- `CLERK_WEBHOOK_SECRET` in Vercel matches endpoint signing secret.
Pass:
- Endpoint active, events exact, secret aligned.
Fail:
- Correct settings, send test event, verify delivery.
### 2.5 signatureAuthEvent route verification
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST https://athelon-dev.convex.cloud/webhooks/clerk/session-reauthenticated -H "Content-Type: application/json" -d '{"type":"test"}'
```
Pass:
- 400 or 422.
Fail:
- 404.
Fail action:
- Fix `convex/http.ts` registration and redeploy.
### 2.6 Connectivity sequence
JWT round-trip:
```javascript
const token = await window.Clerk.session.getToken({ template: "athelon-convex" });
const claims = JSON.parse(atob(token.split('.')[1]));
console.log(claims.org_id, claims.athelon_role);
```
Pass: token exists, org/role claims correct.
Fail: verify Clerk template and provider wiring.
Protected query:
Pass: Work Orders resolves (empty is fine), no auth loop.
Fail: verify provider wrapper and Convex URL.
Re-auth event:
Pass: row appears <=10s with expected fields.
Fail: debug in order Clerk -> Vercel -> Convex.
Signing mutation smoke:
Pass: mutation succeeds, audit row written, hash valid format.
Fail: pause and triage logs.
### 2.7 Day 1 status
Completed:
- Deploy.
- Schema verify.
- Webhook register.
- HTTP route verify.
- Connectivity chain.
Policy:
- Any red item blocks Thursday launch.
## 3) Pilot org seeding (exact field values)
Purpose: deterministic pilot seed for rehearsal and gate checks.
### 3.1 Organization
```json
{"clerkOrgId":"org_athelon_alpha_gary_001","name":"Hutchins Airframe Service, LLC","part145CertNumber":"H4SR901Y","address":"2140 Aviation Way, Tulsa, OK 74115","phone":"+1-918-555-0147"}
```
### 3.2 Gary Hutchins (DOM)
```json
{"user":{"firstName":"Gary","lastName":"Hutchins","email":"gary.hutchins@hutchinsairframe.com"},"technician":{"legalName":"Gary A. Hutchins","role":"dom","status":"active","certificates":[{"type":"A&P","certNumber":"1178643","ratings":["airframe","powerplant"],"expiryDate":null},{"type":"IA","certNumber":"IA-0082914","ratings":["inspection_authorization"],"expiryDate":"2027-03-31"}]}}
```
### 3.3 Linda Paredes (QCM)
```json
{"user":{"firstName":"Linda","lastName":"Paredes","email":"linda.paredes@hutchinsairframe.com"},"technician":{"legalName":"Linda M. Paredes","role":"supervisor","isQcm":true,"status":"active","certificates":[{"type":"A&P","certNumber":"2871049","ratings":["airframe","powerplant"],"expiryDate":null}]}}
```
### 3.4 Troy Weaver (Lead A&P)
```json
{"user":{"firstName":"Troy","lastName":"Weaver","email":"troy.weaver@hutchinsairframe.com"},"technician":{"legalName":"Troy D. Weaver","role":"amt","title":"Lead A&P","status":"active","certificates":[{"type":"A&P","certNumber":"3145882","ratings":["airframe","powerplant"],"expiryDate":null}]}}
```
### 3.5 Pat DeLuca (IA)
```json
{"user":{"firstName":"Pat","lastName":"DeLuca","email":"pat.deluca@hutchinsairframe.com"},"technician":{"legalName":"Patricia L. DeLuca","role":"ia","status":"active","certificates":[{"type":"A&P","certNumber":"2871490","ratings":["airframe","powerplant"],"expiryDate":null},{"type":"IA","certNumber":"IA-2011-04883","ratings":["inspection_authorization"],"expiryDate":"2027-03-31"}]}}
```
### 3.6 Aircraft N1234A (Cessna 172)
```json
{"orgId":"[resolved org _id]","registration":"N1234A","make":"Cessna","model":"172S","serialNumber":"172S11345","engineType":"piston","totalAirframeTime":2347.4,"status":"airworthy"}
```
Seed note:
- Total time uses current onboarding reading, not stale logbook lag value.
### 3.7 Equipment TW-2847 (torque wrench)
```json
{"orgId":"[resolved org _id]","equipmentCode":"TW-2847","name":"Snap-on 3/8in Drive Click Torque Wrench","category":"torque_wrench","manufacturer":"Snap-on","model":"QD2R100","serialNumber":"SN-QD2R100-778421","status":"available","lastCalibrationDate":"2026-01-12","calibrationDueDate":"2027-01-12","location":"Tool Crib A","notes":"Primary torque wrench for C172 service tasks"}
```
Verification note:
- Tool must resolve calibration-current at time of use.
### 3.8 Seed verification steps
1) Login for Gary, Linda, Troy, Pat succeeds.
2) JWT role claims match assigned roles.
3) Clerk user IDs map to technician records correctly.
4) N1234A selectable in work order flow.
5) TW-2847 selectable and calibration-current.
If any fail: correct, rerun, document correction.
## 4) Thursday 06:00 go/no-go gate
Operator: Jonas
Decision output: GO or NO-GO.
Gate 01 — Deployment freshness.
How: verify Convex and Vercel production timestamps.
Pass: both current/approved.
Fail: freeze launch and restore known-good state.
Gate 02 — Schema integrity.
How: verify required tables and validator values.
Pass: all required schema present.
Fail: no launch until redeploy and recheck.
Gate 03 — Auth claims.
How: decode JWT for Carla, Dale, Renata accounts.
Pass: correct org and role claims.
Fail: fix Clerk membership/template wiring.
Gate 04 — signatureAuthEvent path.
How: curl route probe + real re-auth event creation.
Pass: non-404 route and row appears <=10s.
Fail: stop and debug Clerk/Vercel/Convex chain.
Gate 05 — Hash consistency.
How: controlled sign + independent recompute from documented canonical order.
Pass: recomputed hash equals stored hash.
Fail: NO-GO and immediate escalation.
Gate 06 — GO-LIVE-11 export retest.
How: create/void test WO and export PDF from UI.
Pass: PDF downloads/opens and required content is correct.
Fail: immediate NO-GO.
Gate 07 — Realtime QCM convergence.
How: two-session observer test; no refresh allowed.
Pass: observer state updates near-real-time.
Fail: NO-GO for retest session.
Gate 08 — Audit log writes.
How: verify expected audit entries for create/void/sign actions.
Pass: entries exist with correct actor/timestamps.
Fail: P0 stop.
Gate 09 — Org isolation.
How: cross-org query test.
Pass: denied/not found.
Fail: security stop.
Gate 10 — Incident readiness.
How: verify on-call reachability and incident template readiness.
Pass: response chain reachable in <5 minutes.
Fail: delay session until readiness restored.
06:00 decision rule:
- All green -> GO, notify start.
- Any red -> NO-GO, publish reason and ETA.
## 5) Incident response playbook
### 5.1 Severity model
SEV-1: auth/signing integrity risk or trust boundary concern.
SEV-2: core workflow blocked; integrity not currently at risk.
SEV-3: UX degradation with safe workaround.
### 5.2 If auth event creation fails
Symptoms:
- Re-auth done.
- No signatureAuthEvent row.
- Signing blocked.
Immediate steps:
1) Pause signing flow.
2) Check Clerk delivery logs.
3) Check Vercel webhook logs.
4) Check Convex action logs.
Escalation calls:
- Devraj first.
- Chloe if client auth flow suspected.
- Marcus if defensibility impact possible.
Required log fields:
- timestamp, user, org, webhook status code, handler response, corrective action.
Continue/stop:
- Restored <=15m with validated integrity -> continue.
- Integrity unclear or unresolved >30m -> stop signing workflows.
### 5.3 If mutation throws unexpectedly
Symptoms:
- Unhandled exception in critical mutation path.
Immediate steps:
1) Capture exact error and context.
2) Distinguish expected precondition from unexpected throw.
3) Reproduce once in controlled path.
Escalation calls:
- Devraj immediately.
- Marcus if legal statement/signature logic involved.
- Rafael if rollback decision required.
Required log fields:
- mutation name, actor role, args context, log trace reference, partial-write assessment.
Continue/stop:
- Expected precondition -> continue with user correction.
- Unexpected throw in signing flow -> pause flow.
- Any integrity uncertainty -> stop affected path.
### 5.4 If dashboard goes blank/stale
Symptoms:
- Blank view, stale queue, or no live updates.
Immediate steps:
1) Verify backend truth in Convex Dashboard.
2) Verify browser network responses.
3) Run one controlled refresh.
4) Compare alternate device/session.
Escalation calls:
- Chloe first.
- Devraj if query payload mismatch suspected.
Required log fields:
- browser/version/device, route/component, backend truth timestamp, repro steps.
Continue/stop:
- Single-client issue with reliable fallback station -> continue.
- Multi-user stale compliance view -> pause/stop.
### 5.5 Room communication script
At incident start:
- “We have a technical issue in [component]; pausing [workflow] now.”
At 10-minute update:
- “Known issue: [summary]. Checking: [path]. Next update in 10 minutes.”
At resolution:
- “Resolved at [time], validated by [check], resuming at [step].”
At stop decision:
- “Stopping signing workflow to protect record integrity. Retest timing follows.”
### 5.6 Minimum post-incident record
Must be completed before closure:
- Incident ID and time window.
- Trigger event and affected scope.
- Severity level.
- User-visible impact.
- Root cause or current hypothesis.
- Mitigation performed.
- Follow-up owner and due date.
Rule: if it is not written, it is not closed.
## 6) Thursday operator timeline
05:15 online, dashboards up.
05:20 environment pulse check.
05:30 run gates 01-04.
05:40 run gate 05.
05:45 run gate 06.
05:50 run gate 07.
05:55 run gates 08-10.
06:00 declare GO/NO-GO.
06:02 send stakeholder message.
## 7) Owner matrix
Jonas:
- Deploy execution.
- Gate enforcement.
- Incident command.
- Final go/no-go decision.
Devraj:
- Export backend correctness.
- Hash canonical reconciliation.
- Mutation guard/order fixes.
Chloe:
- Export UI path.
- Live subscription fixes.
- Error messaging clarity.
Marcus:
- Regulatory review of export and independent hash verification claim.
Cilla:
- QA retest evidence and pass/fail closure.
## 8) Final statement (Jonas)
Phase 5 showed strong architecture and weak launch discipline.
Phase 6 is execution discipline.
Thursday is binary.
All gates green: GO.
Any gate red: NO-GO.
No improvisation.
No launch-by-hope.
No repeat of alpha-day mistakes.
Signed,
Jonas Harker
DevOps/Platform
Athelon
