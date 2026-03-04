# Athelon — Phase 5 Convex Deployment Setup
**Document Type:** Alpha Pilot Deployment Runbook
**Author:** Jonas Harker (DevOps/Platform)
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Execute against this document for alpha onboarding
**Resolves:** Phase 4 Gate Conditions 1–4
**References:** `phase-4-infra/convex-deployment.md` · `phase-5-mvp/mvp-scope.md` · `phase-5-mvp/requirements-synthesis.md` · `phase-3-auth/auth-platform-wiring.md` · `reviews/phase-4-gate-review.md`

---

## Prefatory Note

The Phase 4 gate review returned GO WITH CONDITIONS. Four conditions were enumerated. None of them are design problems — they are execution steps that were not yet run when the gate closed. This document is the execution record for those steps plus the full procedure for bringing the alpha pilot shop online.

Real aircraft. Real certificate numbers. Real maintenance records that a principal maintenance inspector could examine the morning after go-live. The Phase 4 runbook established environment separation and rollback procedures. Read that first. This document builds on it.

One principle governs everything below: **the first real RTS record created in `athelon-prod` must be cryptographically clean and legally defensible.** The FAA does not distinguish between alpha records and production records.

---

## Section 1: Phase 4 Gate Condition Resolution

Four conditions were specified before the first real maintenance record may be created. Status and remaining work for each.

### Condition 1 — Convex Deployment Live (Dev + Staging)

**Gate text:** *"Nothing works without this. Timeline: 1 day."*

**Status: NOT YET EXECUTED. Blocked on no design work — execution only.**

Execute per Phase 4 runbook §2. Schema push includes the four Phase 5 additions defined in `mvp-scope.md`: add `"pending_inspection"` to `parts.location`, add `"qcm_reviewed"` to `auditLog.eventType`, add optional `customerFacingStatus` to `workOrders`, enforce `workPerformed.length >= 50` in the maintenance record mutation. These land in the same push as the initial deployment — no separate migration step.

**Resolution gate:** DEPLOY-CHECK-01 through DEPLOY-CHECK-10 from the Phase 4 runbook all pass against the dev deployment. Specifically: all 11 tables present, JWT round-trip produces valid claims, org boundary isolation holds.

**Remaining work:** 1 day of execution. Zero design decisions outstanding.

---

### Condition 2 — All `api` Stubs Replaced with Real Convex Imports

**Gate text:** *"Mechanical find-and-replace once deployment exists. Timeline: 2 hours after deployment."*

**Status: BLOCKED ON CONDITION 1. No design work required.**

Once `npx convex dev --once` completes, `convex/_generated/api.ts` is populated. Replace every `const api = {} as any` with `import { api } from "@/convex/_generated/api"`. Run `npx tsc --noEmit`. Zero TypeScript errors is the only pass criterion — errors surface mutation argument mismatches that must be fixed before alpha. Do not suppress errors. Fix them.

**Remaining work:** 2 hours of mechanical work after Condition 1 is resolved.

---

### Condition 3 — `signatureAuthEvent` Endpoint Live

**Gate text:** *"Without it, no step can be signed, no discrepancy can be dispositioned, no RTS can be authorized. Timeline: 1 day after deployment."*

**Status: BLOCKED ON CONDITION 1. Execute per Phase 4 runbook §3.**

`convex/http.ts` must register the route. Verify post-push:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://athelon-prod.convex.cloud/webhooks/clerk/session-reauthenticated \
  -H "Content-Type: application/json" -d '{"type":"test"}'
# PASS: 400 or 422 (route exists, payload invalid)
# FAIL: 404 — http.ts not deployed
```

Production Clerk webhook endpoint: subscribe to exactly `session.reAuthenticated`, `user.created`, `user.updated`, `organizationMembership.created`, `organizationMembership.deleted`. No other events. Copy the Svix signing secret into `CLERK_WEBHOOK_SECRET` in Vercel → Production environment.

**Resolution gate:** DEPLOY-CHECK-07 from the Phase 4 runbook. A seeded test technician triggers re-auth; a `signatureAuthEvent` row appears in `athelon-prod` within 10 seconds with `consumed: false`, correct `technicianId`, valid `authMethod`, and `expiresAt = authenticatedAt + 300_000`.

**Remaining work:** 1 day of execution. Zero design decisions outstanding.

---

### Condition 4 — SHA-256 Hash Replaces `RTS-HASH-V0-*` Placeholder

**Gate text:** *"Not legally defensible as a cryptographic signature. An FAA inspector would question it. Timeline: 1 day."*

**Status: REQUIRES IMPLEMENTATION. See Section 3.**

The placeholder `RTS-HASH-V0-*` pattern must not appear in any record produced by the production signing path. Section 3 specifies the implementation in full. The gate closes when SHA-256 replaces the placeholder in all three signing mutations and a CI smoke test confirms the output is a 64-character hex digest.

**Remaining work:** 1 day of implementation. See Section 3.

---

## Section 2: Alpha Pilot Deployment Procedure

### 2.1 Production Schema Push

All four Phase 5 schema additions must be in the schema pushed to `athelon-prod`. The production deploy runs through the CI `main` branch workflow and requires Jonas or Rafael approval in the GitHub Environment gate. That approval is the SOC-2 change record. After the push, verify in Convex Dashboard → `athelon-prod` → Data tab: all 11 tables present, no missing tables, `parts.location` accepts `"pending_inspection"`, `auditLog.eventType` accepts `"qcm_reviewed"`.

### 2.2 Clerk Org Setup for the Pilot Repair Station

In Clerk Dashboard → `athelon-prod` → Organizations → Create Organization. Use the shop's exact legal name as it appears on their Part 145 certificate. Record the Clerk organization ID (`org_2xxx…`).

Create the Athelon org record via Convex Dashboard → Run Function → `organizations:createOrganization`:

```json
{
  "clerkOrgId": "org_2xxx...",
  "name": "[Legal Name — exact match to Part 145 cert]",
  "part145CertNumber": "[NXXX-YYYY format]",
  "address": "[full address]",
  "phone": "[main]"
}
```

Set the DOM's Clerk organization membership role to `dom` before they take any action in the app. The `athelon_role` JWT claim maps from this membership role. If the DOM attempts any action with a lower role, every protected mutation will reject with `INSUFFICIENT_ROLE`.

### 2.3 Initial Data Seeding

Do not use automated seed scripts in production. Every record created in `athelon-prod` is subject to SOC-2 data retention. Seed via Convex Dashboard → Run Function using exact real data provided by the shop.

**Aircraft record** — minimum required fields:

```json
{
  "orgId": "[org document _id]",
  "registration": "N[normalized: uppercase, no hyphens/spaces]",
  "make": "[make]", "model": "[model]",
  "serialNumber": "[actual airframe S/N]",
  "engineType": "piston",
  "totalAirframeTime": [actual hours — not zero, not null],
  "status": "airworthy"
}
```

N-number normalization is enforced at the mutation level but confirm the stored value before creating any work orders. For turbine aircraft: `cycleCounter` is required before any LLP installation. Get the current cycle count from the shop before seeding. A null cycle counter on a turbine aircraft is a blocker for any LLP work.

**Technician record** — minimum for the DOM:

```json
{
  "orgId": "[org document _id]",
  "userId": "[Clerk user_2xxx... matching the DOM's account]",
  "legalName": "[exactly as on certificate]",
  "status": "active",
  "certificates": [
    {
      "type": "A&P",
      "certNumber": "[FAA mechanic cert — 7–8 digit number, e.g. 1178643]",
      "ratings": ["airframe", "powerplant"],
      "expiryDate": null
    }
  ]
}
```

If the DOM holds an IA, add a second certificate entry with `"type": "IA"`, a distinct `certNumber` (the IA authorization number — format varies by FSDO), and `expiryDate` set to the applicable March 31 expiry. The A&P and IA numbers are separate fields. They are not the same number and must not be stored as the same field. Two products have already been rejected by our pilot interviewees for conflating them.

### 2.4 End-to-End Connectivity Verification

Run before sending any login link.

**Auth round-trip:** DOM logs in on production, opens browser console:

```javascript
const claims = JSON.parse(atob(
  (await window.Clerk.session.getToken({ template: "athelon-convex" })).split('.')[1]
));
// PASS: claims.org_id matches the pilot org's Clerk ID, claims.athelon_role === "dom"
```

**Protected query:** Navigate to Work Orders in the app. An empty list is correct. An error state or infinite spinner means auth is broken — check `NEXT_PUBLIC_CONVEX_URL` and `ConvexProviderWithClerk` wrapper.

**signatureAuthEvent creation:** DOM triggers re-auth. Within 10 seconds a row appears in the `signatureAuthEvents` table with `consumed: false` and the correct `technicianId`. If it does not appear: check Clerk webhook delivery log → Vercel function logs → Convex action logs, in that order.

**Org isolation:** `athelon-prod` data tables contain only the seed records created in §2.2–2.3. Zero rows from dev or staging. If synthetic test data (N12345, etc.) is visible in production, stop. Environment isolation has broken down.

---

## Section 3: SHA-256 Hash Implementation

The placeholder `RTS-HASH-V0-*` is replaced with a Convex Node.js action (`"use node"` directive — required for `crypto` module) that computes SHA-256 over a canonical serialization of the record at signing time.

### 3.1 Canonical Field Set and Order

Fields are joined with a pipe delimiter (`|`), UTF-8 encoded, and hashed with SHA-256. The output is a 64-character lowercase hexadecimal string. The field order is fixed and must not vary between versions — changing the order changes the hash.

| Position | Field | Source |
|---|---|---|
| 1 | `workOrderId` | `workOrder._id` |
| 2 | `workOrderNumber` | `workOrder.workOrderNumber` |
| 3 | `orgId` | from `requireOrgContext()` |
| 4 | `aircraftRegistration` | `aircraft.registration` (normalized, snapshotted) |
| 5 | `aircraftSerialNumber` | `aircraft.serialNumber` |
| 6 | `aircraftTotalTimeAtSign` | `String(args.aircraftTotalTimeAtClose)` |
| 7 | `signingTechnicianId` | `technician._id` |
| 8 | `signingLegalName` | `authEvent.authenticatedLegalName` (snapshot from event) |
| 9 | `signingCertNumber` | `authEvent.authenticatedCertNumber` (snapshot from event) |
| 10 | `recordType` | literal: `"rts"` / `"maintenance_record"` / `"task_step"` |
| 11 | `workPerformed` | full text, no truncation; empty string `""` for RTS and step sign-offs |
| 12 | `approvedDataReference` | full structured value serialized to string; `""` if absent |
| 13 | `signatureAuthEventId` | `authEvent._id` — binds hash to the specific authentication event |
| 14 | `signedAt` | `String(Date.now())` — server time at mutation execution, not client-reported |

**Why each field is included:** `workOrderId`+`workOrderNumber` binds to the specific job. `orgId` prevents a record from one org being replayed in another. `aircraftRegistration`+`serialNumber` bind to the specific aircraft — any retroactive aircraft record edit is detectable. `totalTimeAtSign` captures airframe time at signing — retroactive time edits are detectable. The technician identity fields snapshot the signer's name and cert number as they existed at signing time; if the cert record is later amended, the hash reflects who signed. `recordType` prevents cross-type hash reuse. `workPerformed`+`approvedDataReference` are the substance of the legal record. `signatureAuthEventId` cryptographically ties the hash to the authentication event. `signedAt` is server-generated.

**What is not included:** `_id` (not yet known at hash computation time), `_creationTime` (same reason), `consumed` status of the auth event (changes after the hash is computed).

### 3.2 Implementation

```typescript
// convex/lib/signatureHash.ts
"use node";
import { createHash } from "crypto";

export function computeSignatureHash(fields: string[]): string {
  return createHash("sha256").update(fields.join("|"), "utf8").digest("hex");
}
```

Called at the end of every signing mutation, immediately before `ctx.db.insert()`. The hash is computed, the document is inserted with `signatureHash` populated, and the `signatureAuthEvent` is consumed — all within the same Convex transaction. No partial state.

Add this assertion before any insert:

```typescript
if (!signatureHash.match(/^[0-9a-f]{64}$/)) {
  throw new ConvexError({
    code: "INVALID_HASH_IMPLEMENTATION",
    message: "Signature hash is not a valid SHA-256 hex digest. Placeholder code is running in production.",
  });
}
```

This is not defensive programming. It is a hard stop.

### 3.3 Verification Procedure

Hash verification is on-demand, not continuous. During Marcus's simulated inspection and any subsequent FAA review: reconstruct the canonical field list from the stored record values (same field order, same pipe delimiter), compute SHA-256, compare to stored `signatureHash`. Match = record is unaltered. Mismatch = record was modified after signing. Mismatch is a regulatory defect and a security event. Ship a Convex action `verifyRecordIntegrity(recordId, recordType)` for Marcus to use during the Phase 5 inspection walkthrough.

---

## Section 4: Alpha Monitoring

During alpha I watch four metrics. Not a dashboard — four specific signals that map to specific problems.

### 4.1 Convex Function Error Rates

**Source:** Convex Dashboard → `athelon-prod` → Functions → per-function error rate.

**Alert threshold:** Any unhandled exception in `completeStep`, `authorizeReturnToService`, or `createMaintenanceRecord`. These mutations should throw named application errors on precondition failure or succeed. An unhandled exception is a code defect, not a user error.

**Response:** Check the failing execution in Dashboard → Functions → Logs. Identify: (a) code defect → fix and deploy, (b) schema validator mismatch from recent push → roll back per Phase 4 runbook §6.1, (c) data integrity issue → examine specific records, write post-mortem.

### 4.2 Auth Webhook Delivery Failures

**Source:** Clerk Dashboard → `athelon-prod` → Webhooks → Delivery log.

**Alert threshold:** Any `session.reAuthenticated` delivery with a non-200 status, or any delivery that retried more than once.

These events create the `signatureAuthEvents` that authorize signing. A failed delivery means a mechanic re-authenticated and cannot sign. They experience this as "the system isn't working." Expected alpha volume: fewer than 20 `session.reAuthenticated` events per day. Any day with more than 100 warrants investigation.

**Response:** Check Vercel function logs for the timestamp. Most failures are either HMAC verification failures (`CLERK_WEBHOOK_SECRET` mismatch) or Convex HTTP action 5xx. Clerk retries with backoff — check whether pending retries will self-resolve before making changes.

### 4.3 Mutation Rejection Rate on Signing Mutations

**The metric:** Ratio of named application errors (precondition failures: `RTS_AUTH_EVENT_EXPIRED`, `STEP_ALREADY_SIGNED`, `INSUFFICIENT_ROLE`, etc.) to successful calls, measured over 24-hour windows.

**Why this matters:** A high rejection rate is not a backend problem. It is a UX problem. If `RTS_AUTH_EVENT_EXPIRED` fires repeatedly, the 5-minute TTL is triggering before mechanics complete the signing flow — the flow is too slow or has too many interruptions. If `INSUFFICIENT_ROLE` is frequent, role assignment is wrong. The backend is doing exactly what it's supposed to do.

**Alert threshold:** More than 20% of signing mutation calls returning a precondition error over any 24-hour window. At that rate, mechanics are routinely confused or hitting timing issues that will kill floor adoption.

**Response:** Identify the top error code by volume. Map it to the UX path. Fix the UX. The backend is not the problem.

### 4.4 Audit Log Write Failures

**The rule:** Zero. Not "near zero." Zero.

Audit log writes are transactional — they occur in the same Convex transaction as the main record write. If the audit write fails, the main record is not created. A maintenance record without an audit log entry cannot exist in the system by construction.

**What I watch:** After every signing operation during the first week of alpha, I spot-check the `auditLog` table for the corresponding entry: correct `eventType`, `userId`, `tableName`, and timestamp within 2 seconds of the mutation. After week one, CI smoke test DEPLOY-CHECK-10 covers this automatically.

**If an audit log entry is missing:** P0 incident. Stop new signing operations. The mutation's audit write is not in the transaction — which means the main record was somehow created without an audit entry, which is architecturally impossible in Convex unless someone bypassed the mutation. Investigate, notify Rafael, write the incident record before closing.

---

## Section 5: Data Export for FAA Compliance

Marcus's requirement from Phase 5 requirements synthesis (Requirement #3, raised by 5 of 11 interviewees including Carla, Renata Solís, Dale Renfrow): any authorized user must be able to export a complete work order record — WO + task cards + maintenance records + RTS — as either a human-readable PDF or structured JSON. The export must be self-contained. An FAA inspector must be able to read and understand the record without database access.

This is not a convenience feature. Carla runs this test on day one of any product evaluation. She has walked out of two vendor demos when it failed. The export path runs in CI against a seeded test record before any external user touches `athelon-prod`.

### 5.1 Data Assembly

A Convex query assembles the complete export payload. Any authorized user (`viewer` role or higher) can trigger it:

```typescript
export const getWorkOrderExportPayload = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, { workOrderId }) => {
    const { orgId } = await requireOrgMembership(ctx, "viewer");
    const wo = await ctx.db.get(workOrderId);
    if (!wo || wo.orgId !== orgId) throw new ConvexError({ code: "NOT_FOUND" });

    const [taskCards, maintenanceRecords, rts, discrepancies, auditEvents] = await Promise.all([
      ctx.db.query("taskCards").withIndex("by_workOrder", q => q.eq("workOrderId", wo._id)).collect(),
      ctx.db.query("maintenanceRecords").withIndex("by_workOrder", q => q.eq("workOrderId", wo._id)).collect(),
      ctx.db.query("returnToService").withIndex("by_workOrder", q => q.eq("workOrderId", wo._id)).first(),
      ctx.db.query("discrepancies").withIndex("by_workOrder", q => q.eq("workOrderId", wo._id)).collect(),
      ctx.db.query("auditLog").withIndex("by_record", q => q.eq("relatedRecordId", wo._id)).collect(),
    ]);

    const taskCardDetails = await Promise.all(taskCards.map(async tc => ({
      ...tc,
      steps: await ctx.db.query("taskCardSteps")
        .withIndex("by_taskCard", q => q.eq("taskCardId", tc._id)).collect(),
    })));

    return {
      exportVersion: "1.0", exportedAt: Date.now(),
      workOrder: wo, aircraft: await ctx.db.get(wo.aircraftId),
      organization: await ctx.db.get(wo.orgId),
      taskCards: taskCardDetails, maintenanceRecords,
      returnToService: rts ?? null, discrepancies, auditLog: auditEvents,
    };
  },
});
```

Every export is logged in `auditLog` with `eventType: "record_exported"`, `exportFormat`, `exportedBy`, and timestamp. This is the chain of custody for the record.

### 5.2 Export Formats

**Structured JSON:** The raw query payload serialized to JSON. Available immediately. Used for long-term archival in S3 Object Lock (Phase 5.1), programmatic SHA-256 verification, and any future FAA surveillance system integration. Not a public endpoint — requires valid Clerk JWT in Authorization header.

**Human-Readable PDF:** Generated by a Convex Node.js action using `@react-pdf/renderer`. PDF library selection rationale: `@react-pdf/renderer` allows component-based layout that mirrors the UI, simplifying template maintenance. PDF template is reviewed by Marcus before any alpha user sees it.

**Required fields in PDF, in this order:**
1. Repair station name, Part 145 certificate number, address
2. Aircraft: N-number, make, model, serial number
3. Work order number, type, dates opened/closed, aircraft TT at open and close
4. Each task card: name, numbered steps, completion status, timestamp, signing technician legal name and certificate number
5. Each maintenance record: work performed (full text — no truncation regardless of length), approved data reference (all structured fields), parts replaced with P/N/S/N/8130-3 reference, signing technician name and certificate number, SHA-256 hash, signature timestamp
6. Each discrepancy: number, description, disposition, corrective action, authorization reference
7. Return to service: full regulatory statement text, IA name, IA certificate number, IA authorization number, signature timestamp, SHA-256 hash
8. AD compliance summary: each AD, compliance date, next due, reference
9. Full audit log: every state change and sign-off attempt with timestamps and actor identities

The PDF export is available for any work order at any status. An open work order exports a partial record. A closed work order exports the complete package. The "Export Record" action in the work order header is visible to all roles with at least `viewer` access — not gated on close status.

---

## Section 6: Go-Live Checklist

Twelve items. Every one passes before the login link is sent. All 12, not 11.

---

**GO-LIVE-01 — Production schema version current**

Convex Dashboard → `athelon-prod` → Settings → Deployment Info timestamp matches the last CI production deploy (within 24 hours).

**PASS:** Timestamp matches expected CI run. **FAIL:** Stale schema — re-run the production deploy job.

---

**GO-LIVE-02 — Phase 5 schema additions present**

In `parts` table validator: `"pending_inspection"` is an accepted `location` value. In `auditLog` validator: `"qcm_reviewed"` is an accepted `eventType` value.

**PASS:** Both values accepted. **FAIL:** Phase 5 schema not in the production push — deploy the correct schema.

---

**GO-LIVE-03 — Pilot org record exists and is correct**

`organizations` table contains exactly one row. `clerkOrgId`, `part145CertNumber`, and `name` match the shop's legal Part 145 certificate.

**PASS:** One org record, fields correct. **FAIL:** Missing or wrong data — re-run §2.2 seed procedure.

---

**GO-LIVE-04 — Aircraft seeded with normalized N-number and non-null total time**

`aircraft` table: `registration` is uppercase with N-prefix, no hyphens or spaces. `totalAirframeTime` is a non-null, non-zero number. For turbine aircraft: `cycleCounter` is non-null.

**PASS:** Aircraft record present with canonical registration and valid total time. **FAIL:** Any null or malformed field — do not proceed, every work order is invalid without this.

---

**GO-LIVE-05 — DOM technician linked to Clerk account with valid certificate**

`technicians` table: DOM record has `status: "active"`, `userId` matching the DOM's Clerk account ID, at least one `certificates` entry with a 7–8 digit `certNumber`. IA holders: second certificate entry with `type: "IA"` and a non-null `expiryDate`.

**PASS:** Active technician with valid certificate data. **FAIL:** Missing, inactive, or no certificate — the DOM cannot sign anything.

---

**GO-LIVE-06 — JWT claims carry correct org and role**

DOM logs in, browser console: `JSON.parse(atob(token.split('.')[1]))` where `token = await window.Clerk.session.getToken({ template: "athelon-convex" })`. Claims must include `org_id` equal to the pilot org's Clerk ID, and `athelon_role` equal to `"dom"`.

**PASS:** Both claims present and correct. **FAIL:** JWT template misconfiguration or Clerk membership role assignment error — no mutations will execute correctly.

---

**GO-LIVE-07 — `signatureAuthEvent` HTTP route registered**

`curl -s -o /dev/null -w "%{http_code}" -X POST https://athelon-prod.convex.cloud/webhooks/clerk/session-reauthenticated -H "Content-Type: application/json" -d '{"type":"test"}'`

**PASS:** HTTP 400 or 422. **FAIL:** HTTP 404 — `convex/http.ts` not deployed.

---

**GO-LIVE-08 — signatureAuthEvent creation end-to-end**

DOM triggers re-auth. Within 10 seconds: a row appears in `signatureAuthEvents` with `consumed: false`, correct `technicianId`, valid `authMethod`, `expiresAt = authenticatedAt + 300_000`.

**PASS:** Row present with all required fields. **FAIL:** No row — debug webhook delivery chain before proceeding.

---

**GO-LIVE-09 — SHA-256 hash path verified (no placeholder)**

Create a test maintenance record via the signing flow in dev environment. Inspect `signatureHash` on the created document.

**PASS:** `signatureHash` matches `/^[0-9a-f]{64}$/` — 64-character lowercase hex digest. **FAIL:** Matches `/^RTS-HASH-V0-/` or is null — placeholder code is still running. Do not proceed to production. No real RTS records may be created until this passes.

---

**GO-LIVE-10 — Org isolation: zero test data in production**

All data tables in `athelon-prod` contain only the seed records created in §2.2–2.3. Specifically: zero rows with synthetic N-numbers (N12345, N99999, etc.), zero rows with `orgId` values not matching the pilot org.

**PASS:** Production database contains only intentionally seeded records. **FAIL:** Test data present — environment isolation has broken down. Investigate before any customer data is created.

---

**GO-LIVE-11 — Export path functional**

Create a test work order, immediately void it with a documented reason, trigger PDF export. The PDF must open without error and display the correct aircraft N-number, organization name, and technician legal name.

**PASS:** PDF downloads, opens, and contains correct identifying information. **FAIL:** Export fails, is blank, or shows incorrect data. Carla Ostrowski's day-one test is exactly this. Do not send the login link until this passes.

---

**GO-LIVE-12 — Audit log writes verified on test mutations**

The voided work order from GO-LIVE-11: confirm `auditLog` table contains both `work_order_created` and `work_order_voided` entries with correct `eventType`, `userId`, `tableName`, and timestamps within 2 seconds of the mutations.

**PASS:** Two audit log entries present with all required fields. **FAIL:** Missing entries — the transactional audit write is broken. This is a regulatory defect. Do not onboard the shop.

---

## Operational Notes for Alpha Period

**Every production change goes through the CI pipeline and GitHub Environment approval gate during alpha.** No `npx convex deploy` from local machines against `athelon-prod`. The approval gate is the SOC-2 change record. No exceptions.

**Every incident is documented in `simulation/athelon/incidents/` before the incident is closed.** Format: what happened, what data was affected, resolution action, recurrence prevention. A SOC-2 auditor will ask for this log.

**The alpha shop does not have Convex Dashboard access.** They interact through the application. Diagnosis of data issues is Jonas's responsibility via the Dashboard. The shop is not told about the internal data model.

**Weekly Convex export to S3 with Object Lock configured.** Convex's cloud backup is the primary; the S3 export is the secondary. Maintenance records are not deleted.

---

## Sign-Off

This document is the Phase 5 deployment contract. The four Phase 4 gate conditions are resolved by Sections 1 and 3. The alpha shop goes online when all 12 items in Section 6 pass. Not 11. All 12.

The pilot shop's mechanics are signing real maintenance records on day one. Their certificate numbers are in the database. Their signatures are legally binding. The system must be able to defend every record it produces from the first moment it produces them — not after we've had time to iterate.

---

*Jonas Harker — DevOps/Platform*
*2026-02-22*
*Athelon Phase 5 — Alpha Pilot Deployment Runbook. Authoritative.*
*Deviation requires a documented reason in the incident log before the deviation occurs.*
