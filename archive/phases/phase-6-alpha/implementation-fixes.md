# Athelon Phase 6 Alpha — Implementation Fixes
Owner: Devraj Anand (Backend)
Date: 2026-02-22
Target retest: Thursday (T-5)
Document type: Spec + execution log
---
## 0) Scope and operating rule
I read all required source files before writing this document.
I am binding this plan to the pilot-day findings and gate conditions.
Blocking items addressed in this file:
1. SHA-256 canonical field ordering mismatch.
2. Missing IA certificate number path (`iaCertNumber`).
3. RTS statement guard order mismatch.
4. `signatureAuthEvent` endpoint not wired live.
---
## 1) Inputs reviewed (mandatory)
Reviewed in full:
- `simulation/athelon/phase-5-mvp/pilot-test-report.md`
- `simulation/athelon/phase-5-mvp/maintenance-record-impl.md`
- `simulation/athelon/phase-5-mvp/frontend-wiring.md`
- `simulation/athelon/phase-3-schema/schema-v2.1.md`
- `simulation/athelon/reviews/phase-5-gate-review.md`
Also reviewed for canonical field reference and endpoint mechanics:
- `simulation/athelon/phase-5-mvp/convex-deployment.md` (§3.1 and Condition 3)
- `simulation/athelon/phase-4-infra/convex-deployment.md` (§3 route registration)
- `simulation/athelon/phase-3-auth/auth-platform-wiring.md` (§6.2 Convex HTTP route shape)
- `simulation/athelon/phase-3-qa/qa-smoke-tests.md` (Smoke-05 Step 2 expected code)
Source conclusions I am treating as canonical:
- OI-2026-02-24-001: field order mismatch exists.
- OI-2026-02-24-005: RTS guard order is wrong in implementation.
- Launch blocker: IA number must be distinct from A&P cert number.
- Gate Condition 3: endpoint must be live.
- Gate Condition 4: SHA-256 must be spec-aligned and independently verifiable.
---
## 2) Closure matrix
| Fix | Severity | Owner | Code change type | Retest evidence |
|---|---|---|---|---|
| Fix 1: SHA order | Moderate compliance risk | Devraj | deterministic canonical reorder + migration plan | independent recompute parity |
| Fix 2: iaCertNumber | Launch blocker | Devraj | additive schema + mutation read path + seed | IA UI shows separate A&P + IA numbers |
| Fix 3: RTS guard order | Moderate mutation defect | Devraj | one-line guard reorder | Cilla Smoke-05 Step 2 (RTS-06/07 sequence) |
| Fix 4: signatureAuthEvent endpoint | Launch blocker | Devraj + Jonas | HTTP action + route + webhook subscription | DEPLOY-CHECK-07 + Jonas E2E verify |
Binary closure policy:
- If code path is not explicit, item is not closed.
- If test path is not explicit, item is not closed.
- If route is not live in target env, item is not closed.
- If data seed is missing for pilot persona, item is not closed.
---
## 3) Fix 1 — SHA-256 canonical field ordering
### 3.1 Defect statement
The hash algorithm is SHA-256.
The defect is field order drift, not algorithm drift.
Spec source (`phase-5-mvp/convex-deployment.md §3.1`) defines fixed order.
Implementation used a different order at position 9/10.
Observed mismatch from pilot day:
- Spec position 9: `signingCertNumber`
- Implementation position 9: `signingTechnicianRatingsExercised`
- Spec position 10: `recordType`
- Implementation offset chain shifted because of position 9 swap
Internal sign/verify parity still passed.
Independent external verification against published order is unsafe until fixed.
### 3.2 Correct canonical field order (14 fields, fixed)
The canonical order is fixed and versioned under `sha256-v1`.
1. `workOrderId`
2. `workOrderNumber`
3. `orgId`
4. `aircraftRegistration`
5. `aircraftSerialNumber`
6. `aircraftTotalTimeAtSign`
7. `signingTechnicianId`
8. `signingLegalName`
9. `signingCertNumber`
10. `recordType`
11. `workPerformed`
12. `approvedDataReference`
13. `signatureAuthEventId`
14. `signedAt`
Serialization contract:
- Pipe-delimited (`|`)
- UTF-8 encoding
- Server-side timestamp at signing (`signedAt`)
- No client-provided timestamp
### 3.3 Current incorrect implementation order
Current implementation order that caused drift:
1. `workOrderId`
2. `workOrderNumber`
3. `orgId`
4. `aircraftRegistration`
5. `aircraftSerialNumber`
6. `aircraftTotalTimeAtSign`
7. `signingTechnicianId`
8. `signingLegalName`
9. `signingTechnicianRatingsExercised`  ← incorrect insertion
10. `signingCertNumber`
11. `recordType`
12. `workPerformed`
13. `approvedDataReference`
14. `signatureAuthEventId`
15. `signedAt`
Defect summary:
- Wrong order
- Wrong cardinality relative to published 14-field contract
- External verifier using spec cannot match hash
### 3.4 Exact diff to apply
File: `convex/lib/canonicalMaintenanceRecordJson.ts`
```diff
-export function canonicalMaintenanceRecordJson(input: CanonicalInput): string {
-  const fields = [
-    input.workOrderId,
-    input.workOrderNumber,
-    input.orgId,
-    input.aircraftRegistration,
-    input.aircraftSerialNumber,
-    String(input.aircraftTotalTimeAtSign),
-    input.signingTechnicianId,
-    input.signingLegalName,
-    JSON.stringify(input.signingTechnicianRatingsExercised),
-    input.signingCertNumber,
-    input.recordType,
-    input.workPerformed ?? "",
-    input.approvedDataReference ?? "",
-    input.signatureAuthEventId,
-    String(input.signedAt),
-  ];
-  return fields.join("|");
-}
+export function canonicalMaintenanceRecordJson(input: CanonicalInput): string {
+  const fields = [
+    input.workOrderId,
+    input.workOrderNumber,
+    input.orgId,
+    input.aircraftRegistration,
+    input.aircraftSerialNumber,
+    String(input.aircraftTotalTimeAtSign),
+    input.signingTechnicianId,
+    input.signingLegalName,
+    input.signingCertNumber,
+    input.recordType,
+    input.workPerformed ?? "",
+    input.approvedDataReference ?? "",
+    input.signatureAuthEventId,
+    String(input.signedAt),
+  ];
+  return fields.join("|");
+}
```
Additional guard:
- freeze this order in a unit test fixture
- fail CI on order drift
### 3.5 Migration strategy for alpha-day affected records
Scope:
- only records created during alpha window pre-fix
- expected volume low
Data strategy:
- No destructive overwrite
- Preserve old hash value for chain-of-custody
- Add migration metadata per record
Planned additive fields:
- `hashAlgorithmVersion` (existing pattern): keep as `sha256-v1`
- `hashCanonicalOrderVersion`: `v1-alpha-bad-order` or `v1-spec-order`
- `legacySignatureHash` (optional): original pre-fix digest
- `rehashAt` timestamp
- `rehashReason`: fixed literal `CANONICAL_ORDER_ALIGNMENT`
Migration steps:
1. Identify records where `hashCanonicalOrderVersion` is null and `createdAt` in alpha window.
2. Reconstruct canonical string using corrected 14-field order.
3. Compute `newHash = sha256(correctCanonicalString)`.
4. Patch record atomically:
   - `legacySignatureHash = signatureHash`
   - `signatureHash = newHash`
   - `hashCanonicalOrderVersion = "v1-spec-order"`
   - `rehashAt = now`
   - `rehashReason = "CANONICAL_ORDER_ALIGNMENT"`
5. Write audit log event:
   - `eventType = "record_rehashed"`
   - include old and new hash prefix
   - include operator and run id
Verification step:
- run independent verifier script against exported record set
- assert 100% parity under spec order
Rollback rule:
- if verification fails for any record, stop migration run
- revert from `legacySignatureHash`
- log incident
### 3.6 Execution log — Fix 1
- [x] Defect reproduced from pilot notes and spec text.
- [x] Canonical 14-field list pinned to deployment spec.
- [x] Diff drafted and locked.
- [x] Migration plan documented for pre-fix records.
- [x] Post-fix verifier requirement documented.
---
## 4) Fix 2 — `iaCertNumber` schema field and signing path
### 4.1 Defect statement
Pilot blocker from Dale Renfrow:
A&P cert number and IA authorization number are distinct.
Current path did not guarantee separate IA field availability in all sign flows.
Requirement:
- Separate IA number in data model
- Separate IA number in mutation read path
- Separate IA number visible before sign
### 4.2 Schema decision
Chosen approach: additive optional field on `technicians` table.
Rationale:
- Minimal migration complexity
- Fastest path to Thursday retest
- Fits current query path (`technicians.by_user`)
Field addition:
- `iaCertNumber: v.optional(v.string())`
Alternative (not selected now):
- dedicated `certificates` table with IA rows
- valid long-term model
- not required to close this retest blocker
### 4.3 Migration for existing technician records
Migration is additive and non-breaking.
For every technician:
- if role/authorization is IA-capable and IA number known, set `iaCertNumber`
- if not IA-capable, leave null
- do not backfill with A&P number
- do not infer values
Migration script behavior:
1. Query all technicians in pilot org.
2. For IA users, map from onboarding records.
3. Patch only `iaCertNumber` and `updatedAt`.
4. Write audit event `technician_cert_updated`.
Data quality rules:
- reject whitespace-only value
- reject values equal to A&P cert value in same record unless explicitly confirmed (hard warning)
### 4.4 Mutation update — `signMaintenanceRecord`
Required change:
`signMaintenanceRecord` must read IA cert number separately from technician profile.
Pseudo-logic:
```ts
const tech = await ctx.db.get(callerTechnicianId);
if (!tech) throw new ConvexError({ code: "MR_TECHNICIAN_NOT_FOUND" });
const isInspection = record.recordType === "inspection_43_11";
if (isInspection) {
  if (!tech.iaCertNumber || !tech.iaCertNumber.trim()) {
    throw new ConvexError({ code: "MR_IA_CERT_NUMBER_REQUIRED" });
  }
}
const snapshotIa = isInspection ? tech.iaCertNumber.trim() : undefined;
```
Record snapshot additions on sign:
- `signingTechnicianCertNumber` (A&P)
- `signingTechnicianIaCertNumber` (IA, for inspection records)
Contract:
- inspection signature without IA number: rejected
- routine maintenance signature: IA number optional/not required
### 4.5 Seed entry for Pat DeLuca
Pilot seed requirement:
```json
{
  "legalName": "Pat DeLuca",
  "certNumber": "[A&P-from-seed]",
  "iaCertNumber": "IA-2011-04883",
  "status": "active"
}
```
Note:
- IA string value here follows pilot-document pattern.
- If production pilot uses a different IA number for Pat, update seed script before run.
- The blocker is field separation, not specific serial format.
### 4.6 UI/flow impact that must be observed on retest
Before PIN entry for IA-required flows:
- Show A&P certificate number
- Show IA authorization number
- Hard gate if IA number missing
No soft warning.
No bypass button.
No hidden fallback to A&P field.
### 4.7 Execution log — Fix 2
- [x] Additive schema strategy selected and justified.
- [x] Migration steps defined for current technicians.
- [x] Mutation read path updated in spec.
- [x] Pat DeLuca IA seed entry specified.
- [x] Hard-gate behavior documented for IA sign flows.
---
## 5) Fix 3 — RTS guard order correction
### 5.1 Defect statement
Current implementation checks `NO_CITATION` before `TOO_SHORT`.
Spec requires opposite order.
User sees wrong error first.
Correct order per spec and smoke suite:
1. `RTS_STATEMENT_TOO_SHORT`
2. `RTS_STATEMENT_NO_CITATION`
3. `RTS_STATEMENT_NO_DETERMINATION`
### 5.2 One-line code reorder
File:
`convex/mutations/returnToService/authorizeReturnToService.ts`
Current (wrong):
```ts
if (!hasCitation(statement)) throw NO_CITATION;
if (statement.length < 75) throw TOO_SHORT;
```
Correct (required):
```ts
if (statement.length < 75) throw TOO_SHORT;
if (!hasCitation(statement)) throw NO_CITATION;
```
Third guard remains after these two:
```ts
if (!hasDetermination(statement)) throw NO_DETERMINATION;
```
### 5.3 Cilla verification target
Primary verification case:
- `Smoke-05 Step 2` in `qa-smoke-tests.md`
- expected: 60-char statement with missing citation returns `RTS_STATEMENT_TOO_SHORT`
Companion assertion:
- `Smoke-05 Step 3` then validates citation failure for length-qualified text
Historical naming from mutation matrix:
- `RTS-06` (too short first)
- `RTS-07` (no citation second)
This is the retest proof pair.
### 5.4 Execution log — Fix 3
- [x] Wrong guard order identified and tied to spec lines.
- [x] One-line reorder specified with exact target file.
- [x] Cilla test case IDs mapped for Thursday validation.
---
## 6) Fix 4 — `signatureAuthEvent` HTTP endpoint wiring
### 6.1 Defect statement
Spec had endpoint design.
Alpha day lacked live wiring in environment path.
Without endpoint, signing chain is dead.
### 6.2 Exact Convex HTTP action signature
File:
`convex/webhooks/sessionReAuthenticated.ts`
Required signature:
```ts
import { httpAction } from "./_generated/server";
export const sessionReAuthenticated = httpAction(async (ctx, request) => {
  // parse payload
  // validate expected Clerk event type
  // map user -> technician
  // insert signatureAuthEvents row
  // return JSON response
});
```
Behavior contract:
- method: POST only
- invalid payload: 422
- missing technician binding: 403/422 (as specified)
- successful insert: 200 with created event id
### 6.3 Route registration in `convex/http.ts`
Route must be present exactly as follows:
```ts
import { httpRouter } from "convex/server";
import { sessionReAuthenticated } from "./webhooks/sessionReAuthenticated";
const http = httpRouter();
http.route({
  path: "/webhooks/clerk/session-reauthenticated",
  method: "POST",
  handler: sessionReAuthenticated,
});
export default http;
```
No alias path.
No duplicate path.
No fallback route.
### 6.4 Clerk webhook event subscription
In Clerk endpoint config, subscribe to:
- `session.reAuthenticated` (mandatory)
- `user.created`
- `user.updated`
- `organizationMembership.created`
- `organizationMembership.deleted`
Do not subscribe for this flow:
- `session.created`
- `session.ended`
Reason:
- high volume
- not required for signature auth event insertion
### 6.5 Jonas verification step (binary)
Jonas validates with the production URL:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://athelon-prod.convex.cloud/webhooks/clerk/session-reauthenticated \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```
Pass condition 1:
- HTTP 400 or 422 (route exists, payload invalid)
Pass condition 2 (end-to-end):
- trigger real re-auth for seeded technician
- row appears in `signatureAuthEvents` within 10 seconds
- row fields:
  - `consumed: false`
  - `technicianId` matches caller
  - `expiresAt = authenticatedAt + 300000`
This is DEPLOY-CHECK-07 closure.
### 6.6 Execution log — Fix 4
- [x] HTTP action signature pinned.
- [x] route registration pinned.
- [x] Clerk subscription list pinned.
- [x] Jonas verification script and expected outputs pinned.
---
## 7) Consolidated implementation checklist (Devraj execution order)
### 7.1 Sequence
1. Patch canonical field builder and lock unit test order.
2. Add `iaCertNumber` optional field to technicians schema.
3. Update `signMaintenanceRecord` to read IA number independently and enforce gate for inspection records.
4. Apply one-line RTS guard reorder.
5. Wire `sessionReAuthenticated` HTTP action and `convex/http.ts` route.
6. Verify Clerk subscriptions in target environment.
7. Run migration for pre-fix alpha hashes.
8. Seed Pat DeLuca IA number.
9. Execute smoke verification set with Cilla and Jonas.
### 7.2 Required tests before calling done
Must pass:
- Independent hash recompute parity under fixed 14-field order.
- IA sign flow displays separate A&P + IA values.
- IA-required flow hard-fails when IA number absent.
- Smoke-05 Step 2 returns `RTS_STATEMENT_TOO_SHORT`.
- Smoke-05 Step 3 returns `RTS_STATEMENT_NO_CITATION`.
- Endpoint responds 422 on synthetic payload (route alive).
- Re-auth creates real `signatureAuthEvent` row in prod.
No partial pass criteria.
---
## 8) Risks and controls
### 8.1 Fix 1 risks
Risk:
- changing canonical order invalidates hashes computed under old order
Control:
- migration metadata with `legacySignatureHash`
- explicit rehash audit event
- independent verifier
### 8.2 Fix 2 risks
Risk:
- accidental conflation of IA and A&P fields during migration
Control:
- no inference from A&P value
- hard gate on inspection sign path
- seeded known-good IA values for pilot users
### 8.3 Fix 3 risks
Risk:
- regression if guard block refactored without test enforcement
Control:
- lock test sequence on Step 2/3 expected errors
- maintain one-guard-per-assertion order contract
### 8.4 Fix 4 risks
Risk:
- webhook route exists but Clerk not subscribed correctly
Control:
- explicit subscription checklist
- direct curl route check
- real re-auth row insertion check
---
## 9) Thursday retest readiness gates
All four must be true:
Gate A:
- Canonical order fixed in code
- migration run for alpha-window records
- independent parity script clean
Gate B:
- `iaCertNumber` present for IA users
- Pat DeLuca seeded
- IA sign block enforced when missing
Gate C:
- RTS guard order corrected
- Cilla Step 2/Step 3 sequence passes exactly
Gate D:
- endpoint live
- Clerk webhook subscribed correctly
- Jonas confirms DEPLOY-CHECK-07 pass
If any gate fails, retest is not ready.
---
## 10) Devraj’s Thursday readiness statement (binary, no softening)
I sign only what is true.
1. **SHA-256 canonical ordering**
   - DONE means fixed 14-field spec order is in production code and migrated records are tagged and verified.
   - If migration is not complete and verified, this item is NOT DONE.
2. **IA certificate number separation**
   - DONE means IA number is stored separately, read separately, required for inspection sign-off, and Pat’s seed is present.
   - If any IA-required flow can proceed without IA number, this item is NOT DONE.
3. **RTS guard order**
   - DONE means TOO_SHORT fires before NO_CITATION and Cilla’s Smoke-05 Step 2 confirms it.
   - If Step 2 returns NO_CITATION, this item is NOT DONE.
4. **signatureAuthEvent endpoint wiring**
   - DONE means Convex route is live, Clerk sends re-auth events, and Jonas observes event rows in target env.
   - If webhook reaches Vercel but no Convex row is created, this item is NOT DONE.
My rule for Thursday:
- All four DONE or I report not ready.
- Three of four is not ready.
- “Almost done” is not ready.
---
## 11) Implementation handoff notes for Rafael, Jonas, Cilla
For Rafael:
- review migration field naming before patch deploy
- approve canonical-order test fixture as hard gate in CI
For Jonas:
- own environment-level route and webhook verification
- attach DEPLOY-CHECK-07 evidence to release thread
For Cilla:
- run Smoke-05 Step 2 then Step 3 in sequence
- run IA missing-number negative test before positive sign test
- run independent hash recompute script against migrated sample
---
## 12) Final status summary
Fix 1 (SHA order): Spec complete, code patch defined, migration defined.
Fix 2 (`iaCertNumber`): Spec complete, schema/mutation/seed defined.
Fix 3 (RTS guard order): Spec complete, one-line patch and test IDs defined.
Fix 4 (endpoint wiring): Spec complete, action/route/subscription/verification defined.
